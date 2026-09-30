import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import "@babylonjs/core/Culling/ray";
import { Target } from "../entities/Target";
import { ImpactEffect } from "../effects/ImpactEffect";
import { InputManager } from "../input/InputManager";
import { IWeapon, IWeaponAmmoState, WeaponConfig, ShotResult } from "./IWeapon";

export type { WeaponConfig, IWeaponAmmoState, ShotResult };

/**
 * Base hitscan weapon casting instantaneous raycasts from the camera center.
 * Handles ammunition consumption, magazine reloading, fire-rate throttling,
 * target damage, and impact effects.
 */
export class HitscanWeapon implements IWeapon {
  private readonly _scene: Scene;
  private readonly _camera: Camera;
  private readonly _inputManager: InputManager;
  private readonly _config: WeaponConfig;

  private _currentAmmo: number;
  private _reserveAmmo: number;
  private _isReloading: boolean = false;
  private _reloadTimerId: ReturnType<typeof setTimeout> | null = null;

  private _lastFireTime: number = 0;
  private _debugEnabled: boolean = true;

  constructor(
    scene: Scene,
    camera: Camera,
    inputManager: InputManager,
    config: Partial<WeaponConfig> = {}
  ) {
    this._scene = scene;
    this._camera = camera;
    this._inputManager = inputManager;

    this._config = {
      name: config.name ?? "Standard Carbine",
      damage: config.damage ?? 25,
      fireRate: config.fireRate ?? 4,
      range: config.range ?? 100,
      magazineSize: config.magazineSize ?? 12,
      reserveAmmo: config.reserveAmmo ?? 60,
      reloadDurationMs: config.reloadDurationMs ?? 1500
    };

    this._currentAmmo = this._config.magazineSize;
    this._reserveAmmo = this._config.reserveAmmo;
  }

  public get config(): WeaponConfig {
    return this._config;
  }

  public get ammoState(): IWeaponAmmoState {
    return {
      currentAmmo: this._currentAmmo,
      magazineSize: this._config.magazineSize,
      reserveAmmo: this._reserveAmmo,
      isReloading: this._isReloading,
      isOutOfAmmo: this._currentAmmo === 0 && this._reserveAmmo === 0
    };
  }

  public get debugEnabled(): boolean {
    return this._debugEnabled;
  }

  public setDebug(enabled: boolean): void {
    this._debugEnabled = enabled;
  }

  /**
   * Returns whether the weapon has cooled down, is not reloading, and has available ammo.
   */
  public canFire(): boolean {
    if (this._isReloading) {
      return false;
    }

    if (this._currentAmmo <= 0) {
      return false;
    }

    const cooldownMs = 1000 / this._config.fireRate;
    return performance.now() - this._lastFireTime >= cooldownMs;
  }

  /**
   * Initiates a reload cycle transferring reserve ammo into the magazine.
   * Prevents multiple concurrent reloads, reloading when full, or reloading with empty reserves.
   */
  public reload(): boolean {
    if (this._isReloading) {
      return false;
    }

    if (this._currentAmmo >= this._config.magazineSize) {
      return false; // Magazine already full
    }

    if (this._reserveAmmo <= 0) {
      return false; // No reserves to reload from
    }

    this._isReloading = true;

    if (this._debugEnabled) {
      console.log(`[WEAPON] Reloading ${this._config.name}... (${this._config.reloadDurationMs}ms)`);
    }

    this._reloadTimerId = setTimeout(() => {
      const needed = this._config.magazineSize - this._currentAmmo;
      const transferred = Math.min(needed, this._reserveAmmo);

      this._currentAmmo += transferred;
      this._reserveAmmo -= transferred;
      this._isReloading = false;
      this._reloadTimerId = null;

      if (this._debugEnabled) {
        console.log(
          `[WEAPON] Reload complete: ${this._currentAmmo}/${this._config.magazineSize} rounds | Reserve: ${this._reserveAmmo}`
        );
      }
    }, this._config.reloadDurationMs);

    return true;
  }

  /**
   * Attempts to fire the weapon. Returns ShotResult if fired, or null if gated by cooldown, empty magazine, reloading, or pointer lock.
   */
  public tryFire(): ShotResult | null {
    if (!this._inputManager.isPointerLocked) {
      return null;
    }

    if (!this.canFire()) {
      return null;
    }

    this._lastFireTime = performance.now();
    return this.fire();
  }

  /**
   * Consumes one round, executes a forward raycast, and resolves hit registration.
   */
  public fire(): ShotResult {
    // Consume 1 magazine round
    this._currentAmmo--;

    // Cast forward raycast
    const ray = this._camera.getForwardRay(this._config.range);
    const pickInfo = this._scene.pickWithRay(ray, (mesh) => {
      return mesh.isPickable && mesh.isEnabled();
    });

    let result: ShotResult;

    if (pickInfo && pickInfo.hit && pickInfo.pickedMesh && pickInfo.pickedPoint) {
      const target = Target.fromMesh(pickInfo.pickedMesh);

      if (target && !target.isDestroyed) {
        target.receiveDamage(this._config.damage);
        ImpactEffect.create(this._scene, pickInfo.pickedPoint);

        if (this._debugEnabled) {
          console.log(
            `[COMBAT-DEBUG] [Shot Fired] ${this._config.name} -> HIT Target "${target.id}" | Damage: ${this._config.damage} | Target HP: ${target.currentHealth}/${target.maxHealth} | Mag: ${this._currentAmmo}/${this._config.magazineSize}`
          );
          if (target.isDestroyed) {
            console.log(`[COMBAT-DEBUG] [Target Destroyed] Target "${target.id}" was destroyed!`);
          }
        }

        result = {
          fired: true,
          hit: true,
          target,
          hitPoint: pickInfo.pickedPoint,
          damageDealt: this._config.damage,
          targetDestroyed: target.isDestroyed
        };
      } else {
        if (this._debugEnabled) {
          console.log(
            `[COMBAT-DEBUG] [Shot Fired] ${this._config.name} -> MISS (Hit "${pickInfo.pickedMesh.name}" at ${pickInfo.distance.toFixed(2)}m) | Mag: ${this._currentAmmo}/${this._config.magazineSize}`
          );
        }
        result = { fired: true, hit: false };
      }
    } else {
      if (this._debugEnabled) {
        console.log(
          `[COMBAT-DEBUG] [Shot Fired] ${this._config.name} -> MISS (No obstacle in range) | Mag: ${this._currentAmmo}/${this._config.magazineSize}`
        );
      }
      result = { fired: true, hit: false };
    }

    // Automatically trigger reload when magazine empties if reserves remain
    if (this._currentAmmo === 0 && this._reserveAmmo > 0) {
      this.reload();
    }

    return result;
  }

  public dispose(): void {
    if (this._reloadTimerId !== null) {
      clearTimeout(this._reloadTimerId);
      this._reloadTimerId = null;
    }
    this._isReloading = false;
  }
}
