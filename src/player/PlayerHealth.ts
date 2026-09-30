import { DamageInfo, IDamageable } from "../combat/Damage";

export interface PlayerHealthOptions {
  maxHealth?: number;
}

/**
 * Manages player hitpoints, damage mitigation, healing, death state, and lifecycle events.
 * Fully decoupled from camera movement and player controller.
 */
export class PlayerHealth implements IDamageable {
  public readonly id: string = "player";
  private readonly _maxHealth: number;
  private _currentHealth: number;
  private _isDead: boolean = false;

  /**
   * Callback fired when player receives damage.
   */
  public onDamage?: (info: DamageInfo, currentHealth: number, maxHealth: number) => void;

  /**
   * Callback fired when player health drops to zero.
   */
  public onDeath?: () => void;

  /**
   * Callback fired when player receives healing.
   */
  public onHeal?: (amount: number, currentHealth: number, maxHealth: number) => void;

  /**
   * Callback fired when player health is reset.
   */
  public onReset?: () => void;

  constructor(options: PlayerHealthOptions = {}) {
    this._maxHealth = options.maxHealth ?? 100;
    this._currentHealth = this._maxHealth;
  }

  public get currentHealth(): number {
    return this._currentHealth;
  }

  public get maxHealth(): number {
    return this._maxHealth;
  }

  public get isDead(): boolean {
    return this._isDead;
  }

  public get isDestroyed(): boolean {
    return this._isDead;
  }

  /**
   * Applies damage to the player, clamped between 0 and maxHealth.
   */
  public receiveDamage(damage: DamageInfo | number, source?: string): void {
    if (this._isDead) {
      return;
    }

    const info: DamageInfo = typeof damage === "number" ? { amount: damage, source } : damage;
    if (info.amount <= 0) {
      return;
    }

    this._currentHealth = Math.max(0, this._currentHealth - info.amount);
    this.onDamage?.(info, this._currentHealth, this._maxHealth);

    if (this._currentHealth === 0) {
      this._isDead = true;
      this.onDeath?.();
    }
  }

  /**
   * Restores player health up to the maximum hitpoint threshold.
   */
  public heal(amount: number): void {
    if (this._isDead || amount <= 0) {
      return;
    }

    this._currentHealth = Math.min(this._maxHealth, this._currentHealth + amount);
    this.onHeal?.(amount, this._currentHealth, this._maxHealth);
  }

  /**
   * Resets hitpoints back to maximum and clears the death flag.
   */
  public reset(): void {
    this._currentHealth = this._maxHealth;
    this._isDead = false;
    this.onReset?.();
  }
}
