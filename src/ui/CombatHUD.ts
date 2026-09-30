import { IWeaponAmmoState } from "../weapons/IWeapon";

/**
 * Manages the combat HUD overlay displaying magazine count,
 * reserve ammo, and reload / out-of-ammo feedback.
 */
export class CombatHUD {
  private readonly _currentElem: HTMLElement | null;
  private readonly _reserveElem: HTMLElement | null;
  private readonly _statusElem: HTMLElement | null;

  private _lastCurrent: number = -1;
  private _lastReserve: number = -1;
  private _lastReloading: boolean = false;
  private _lastOutOfAmmo: boolean = false;

  constructor() {
    this._currentElem = document.getElementById("hud-ammo-current");
    this._reserveElem = document.getElementById("hud-ammo-reserve");
    this._statusElem = document.getElementById("hud-status-text");
  }

  /**
   * Synchronizes HUD display elements with the current weapon ammunition state.
   */
  public update(state: IWeaponAmmoState): void {
    // Only update elements when values have actually changed to minimize DOM work
    if (
      this._lastCurrent === state.currentAmmo &&
      this._lastReserve === state.reserveAmmo &&
      this._lastReloading === state.isReloading &&
      this._lastOutOfAmmo === state.isOutOfAmmo
    ) {
      return;
    }

    this._lastCurrent = state.currentAmmo;
    this._lastReserve = state.reserveAmmo;
    this._lastReloading = state.isReloading;
    this._lastOutOfAmmo = state.isOutOfAmmo;

    if (this._currentElem) {
      this._currentElem.textContent = state.currentAmmo.toString();
      if (state.currentAmmo <= 3 && !state.isReloading) {
        this._currentElem.classList.add("low-ammo");
      } else {
        this._currentElem.classList.remove("low-ammo");
      }
    }

    if (this._reserveElem) {
      this._reserveElem.textContent = state.reserveAmmo.toString();
    }

    if (this._statusElem) {
      if (state.isReloading) {
        this._statusElem.textContent = "RELOADING";
        this._statusElem.className = "status-reloading";
      } else if (state.isOutOfAmmo) {
        this._statusElem.textContent = "OUT OF AMMO";
        this._statusElem.className = "status-empty";
      } else {
        this._statusElem.textContent = "";
        this._statusElem.className = "";
      }
    }
  }

  public dispose(): void {
    if (this._statusElem) {
      this._statusElem.textContent = "";
    }
  }
}
