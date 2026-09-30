import { IWeaponAmmoState } from "../weapons/IWeapon";

/**
 * Manages the combat HUD overlay displaying ammunition, reload feedback,
 * player health, damage flash effects, and death / restart screens.
 */
export class CombatHUD {
  // Ammo Elements
  private readonly _currentElem: HTMLElement | null;
  private readonly _reserveElem: HTMLElement | null;
  private readonly _statusElem: HTMLElement | null;

  // Health Elements
  private readonly _healthCurrentElem: HTMLElement | null;
  private readonly _healthMaxElem: HTMLElement | null;

  // Damage & Death Elements
  private readonly _damageOverlayElem: HTMLElement | null;
  private readonly _deathScreenElem: HTMLElement | null;
  private readonly _restartBtnElem: HTMLElement | null;

  private _lastCurrent: number = -1;
  private _lastReserve: number = -1;
  private _lastReloading: boolean = false;
  private _lastOutOfAmmo: boolean = false;

  private _lastHealthCurrent: number = -1;
  private _lastHealthMax: number = -1;

  private _damageFlashTimerId: ReturnType<typeof setTimeout> | null = null;
  private readonly _onRestartClickBound: () => void;

  /**
   * Callback invoked when user clicks the death screen restart button.
   */
  public onRestartClicked?: () => void;

  constructor() {
    this._currentElem = document.getElementById("hud-ammo-current");
    this._reserveElem = document.getElementById("hud-ammo-reserve");
    this._statusElem = document.getElementById("hud-status-text");

    this._healthCurrentElem = document.getElementById("hud-health-current");
    this._healthMaxElem = document.getElementById("hud-health-max");

    this._damageOverlayElem = document.getElementById("damage-overlay");
    this._deathScreenElem = document.getElementById("death-screen");
    this._restartBtnElem = document.getElementById("btn-restart");

    this._onRestartClickBound = () => {
      this.onRestartClicked?.();
    };

    if (this._restartBtnElem) {
      this._restartBtnElem.addEventListener("click", this._onRestartClickBound);
    }
  }

  /**
   * Synchronizes HUD display elements with the current weapon ammunition state.
   */
  public update(state: IWeaponAmmoState): void {
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

  /**
   * Synchronizes player hitpoints with the HUD.
   */
  public updateHealth(current: number, max: number): void {
    if (this._lastHealthCurrent === current && this._lastHealthMax === max) {
      return;
    }

    this._lastHealthCurrent = current;
    this._lastHealthMax = max;

    if (this._healthCurrentElem) {
      this._healthCurrentElem.textContent = Math.round(current).toString();
      if (current <= 25) {
        this._healthCurrentElem.classList.add("low-health");
      } else {
        this._healthCurrentElem.classList.remove("low-health");
      }
    }

    if (this._healthMaxElem) {
      this._healthMaxElem.textContent = Math.round(max).toString();
    }
  }

  /**
   * Triggers a brief red vignette flash indicating player damage.
   */
  public flashDamage(): void {
    if (!this._damageOverlayElem) {
      return;
    }

    if (this._damageFlashTimerId !== null) {
      clearTimeout(this._damageFlashTimerId);
      this._damageFlashTimerId = null;
    }

    this._damageOverlayElem.classList.add("flash");

    this._damageFlashTimerId = setTimeout(() => {
      this._damageOverlayElem?.classList.remove("flash");
      this._damageFlashTimerId = null;
    }, 120);
  }

  /**
   * Toggles the "YOU DIED" death screen overlay.
   */
  public showDeathScreen(show: boolean): void {
    if (!this._deathScreenElem) {
      return;
    }

    if (show) {
      this._deathScreenElem.classList.add("active");
    } else {
      this._deathScreenElem.classList.remove("active");
    }
  }

  public dispose(): void {
    if (this._restartBtnElem) {
      this._restartBtnElem.removeEventListener("click", this._onRestartClickBound);
    }
    if (this._damageFlashTimerId !== null) {
      clearTimeout(this._damageFlashTimerId);
      this._damageFlashTimerId = null;
    }
    if (this._statusElem) {
      this._statusElem.textContent = "";
    }
  }
}
