import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Culling/ray";
import { Target } from "../entities/Target";
import { ImpactEffect } from "../effects/ImpactEffect";
import { InputManager } from "../input/InputManager";

export interface WeaponConfig {
  name: string;
  damage: number;
  fireRate: number; // Shots per second (e.g. 4 => cooldown of 250ms)
  range: number;    // Maximum effective range in meters
}

export interface ShotResult {
  fired: boolean;
  hit: boolean;
  target?: Target;
  hitPoint?: Vector3;
  damageDealt?: number;
  targetDestroyed?: boolean;
}

/**
 * Base hitscan weapon casting instantaneous raycasts from the camera center.
 * Handles fire-rate throttling, target damage, and impact effects.
 */
export class HitscanWeapon {
  private readonly _scene: Scene;
  private readonly _camera: Camera;
  private readonly _inputManager: InputManager;
  private readonly _config: WeaponConfig;

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
      name: config.name ?? "Test Rifle",
      damage: config.damage ?? 25,
      fireRate: config.fireRate ?? 4,
      range: config.range ?? 100
    };
  }

  public get config(): WeaponConfig {
    return this._config;
  }

  public get debugEnabled(): boolean {
    return this._debugEnabled;
  }

  public setDebug(enabled: boolean): void {
    this._debugEnabled = enabled;
  }

  /**
   * Returns whether the weapon has cooled down and is ready to fire.
   */
  public canFire(): boolean {
    const cooldownMs = 1000 / this._config.fireRate;
    return performance.now() - this._lastFireTime >= cooldownMs;
  }

  /**
   * Attempts to fire the weapon. Returns ShotResult if fired, or null if gated by cooldown or pointer lock.
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
   * Executes a forward raycast and resolves hit registration.
   */
  public fire(): ShotResult {
    const ray = this._camera.getForwardRay(this._config.range);

    const pickInfo = this._scene.pickWithRay(ray, (mesh) => {
      return mesh.isPickable && mesh.isEnabled();
    });

    if (pickInfo && pickInfo.hit && pickInfo.pickedMesh && pickInfo.pickedPoint) {
      const target = Target.fromMesh(pickInfo.pickedMesh);

      if (target && !target.isDestroyed) {
        target.receiveDamage(this._config.damage);
        ImpactEffect.create(this._scene, pickInfo.pickedPoint);

        if (this._debugEnabled) {
          console.log(
            `[COMBAT-DEBUG] [Shot Fired] ${this._config.name} -> HIT Target "${target.id}" | Damage: ${this._config.damage} | Remaining HP: ${target.currentHealth}/${target.maxHealth} | Distance: ${pickInfo.distance.toFixed(2)}m`
          );
          if (target.isDestroyed) {
            console.log(`[COMBAT-DEBUG] [Target Destroyed] Target "${target.id}" was destroyed!`);
          }
        }

        return {
          fired: true,
          hit: true,
          target,
          hitPoint: pickInfo.pickedPoint,
          damageDealt: this._config.damage,
          targetDestroyed: target.isDestroyed
        };
      }

      // Hit an environment surface or obstacle (miss regarding targets)
      if (this._debugEnabled) {
        console.log(
          `[COMBAT-DEBUG] [Shot Fired] ${this._config.name} -> MISS (Hit environment "${pickInfo.pickedMesh.name}" at ${pickInfo.distance.toFixed(2)}m)`
        );
      }

      return {
        fired: true,
        hit: false
      };
    }

    // Completely clear shot (nothing in range)
    if (this._debugEnabled) {
      console.log(
        `[COMBAT-DEBUG] [Shot Fired] ${this._config.name} -> MISS (No obstacle in range of ${this._config.range}m)`
      );
    }

    return {
      fired: true,
      hit: false
    };
  }
}
