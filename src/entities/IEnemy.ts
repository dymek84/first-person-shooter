import { IDamageable } from "../combat/Damage";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type EnemyState = "IDLE" | "CHASE" | "ATTACK" | "DEAD";

/**
 * Common contract for enemy entities with state machine and render-loop update.
 */
export interface IEnemy extends IDamageable {
  readonly state: EnemyState;
  readonly position: Vector3;
  update(dt: number, playerPosition: Vector3, isPlayerDead: boolean): void;
  reset(): void;
  dispose(): void;
}
