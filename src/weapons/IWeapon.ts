import { Target } from "../entities/Target";
import { IDamageable } from "../combat/Damage";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface WeaponConfig {
  name: string;
  damage: number;
  fireRate: number;         // Shots per second (e.g. 4 => cooldown of 250ms)
  range: number;            // Maximum effective range in meters
  magazineSize: number;     // Number of rounds per magazine (e.g. 12)
  reserveAmmo: number;      // Starting reserve ammunition (e.g. 60)
  reloadDurationMs: number; // Duration of reload cycle in milliseconds (e.g. 1500)
}

export interface IWeaponAmmoState {
  readonly currentAmmo: number;
  readonly magazineSize: number;
  readonly reserveAmmo: number;
  readonly isReloading: boolean;
  readonly isOutOfAmmo: boolean;
}

export interface ShotResult {
  fired: boolean;
  hit: boolean;
  target?: Target;
  damageable?: IDamageable;
  hitPoint?: Vector3;
  damageDealt?: number;
  targetDestroyed?: boolean;
}

export interface IWeapon {
  readonly config: WeaponConfig;
  readonly ammoState: IWeaponAmmoState;
  isEnabled: boolean;
  onFire?: (result: ShotResult) => void;
  onDryFire?: () => void;
  tryFire(): ShotResult | null;
  fire(): ShotResult;
  reload(): boolean;
  reset(): void;
  canFire(): boolean;
  dispose(): void;
}
