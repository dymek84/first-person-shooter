/**
 * Information describing a damage event.
 */
export interface DamageInfo {
  amount: number;
  source?: string;
}

/**
 * Common contract for all damageable combat entities.
 * Shared between targets, enemies, and destructible entities to prevent incompatible health systems.
 */
export interface IDamageable {
  readonly isDestroyed: boolean;
  readonly id?: string;
  readonly currentHealth?: number;
  readonly maxHealth?: number;
  receiveDamage(amount: number): void;
}
