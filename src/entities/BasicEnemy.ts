import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { IDamageable } from "../combat/Damage";
import { EnemyState, IEnemy } from "./IEnemy";

export interface BasicEnemyOptions {
  id?: string;
  spawnPosition: Vector3;
  maxHealth?: number;
  detectionRadius?: number;
  attackRange?: number;
  attackCooldownMs?: number;
  attackDamage?: number;
  moveSpeed?: number;
}

/**
 * Basic combat enemy with finite-state AI (IDLE, CHASE, ATTACK, DEAD),
 * primitive Babylon.js geometry, hit reactions, and attack cooldowns.
 */
export class BasicEnemy implements IEnemy, IDamageable {
  public readonly id: string;
  private readonly _maxHealth: number;
  private _currentHealth: number;
  private _isDead: boolean = false;
  private _state: EnemyState = "IDLE";

  private readonly _scene: Scene;
  private readonly _spawnPosition: Vector3;
  private readonly _detectionRadius: number;
  private readonly _attackRange: number;
  private readonly _attackCooldownMs: number;
  private readonly _attackDamage: number;
  private readonly _moveSpeed: number;

  private _lastAttackTime: number = 0;
  private _flashTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _attackAnimTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Visual Meshes and Materials
  private readonly _rootMesh: Mesh;
  private readonly _bodyMesh: Mesh;
  private readonly _headMesh: Mesh;
  private readonly _visorMesh: Mesh;

  private readonly _bodyMaterial: StandardMaterial;
  private readonly _accentMaterial: StandardMaterial;
  private readonly _visorMaterial: StandardMaterial;

  /**
   * Callback invoked when the enemy attacks the player.
   */
  public onAttackPlayer?: (damage: number) => void;

  /**
   * Callback invoked when the enemy dies.
   */
  public onDeath?: () => void;

  constructor(scene: Scene, options: BasicEnemyOptions) {
    this._scene = scene;
    this.id = options.id ?? "basic_enemy";
    this._spawnPosition = options.spawnPosition.clone();
    this._maxHealth = options.maxHealth ?? 100;
    this._currentHealth = this._maxHealth;
    this._detectionRadius = options.detectionRadius ?? 12;
    this._attackRange = options.attackRange ?? 2.0;
    this._attackCooldownMs = options.attackCooldownMs ?? 1000;
    this._attackDamage = options.attackDamage ?? 10;
    this._moveSpeed = options.moveSpeed ?? 2.4;

    // Materials
    this._bodyMaterial = new StandardMaterial(`enemyBodyMat_${this.id}`, this._scene);
    this._bodyMaterial.diffuseColor = new Color3(0.24, 0.16, 0.18); // Dark crimson-grey
    this._bodyMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
    this._bodyMaterial.emissiveColor = new Color3(0, 0, 0);

    this._accentMaterial = new StandardMaterial(`enemyAccentMat_${this.id}`, this._scene);
    this._accentMaterial.diffuseColor = new Color3(0.65, 0.18, 0.18); // Combat red
    this._accentMaterial.specularColor = new Color3(0.4, 0.4, 0.4);

    this._visorMaterial = new StandardMaterial(`enemyVisorMat_${this.id}`, this._scene);
    this._visorMaterial.diffuseColor = new Color3(0.1, 0, 0);
    this._visorMaterial.emissiveColor = new Color3(0.9, 0.05, 0.05); // Menacing red eye

    // Geometry Construction
    this._rootMesh = MeshBuilder.CreateBox(`enemyRoot_${this.id}`, { size: 0.1 }, this._scene);
    this._rootMesh.position = this._spawnPosition.clone();
    this._rootMesh.isVisible = false;
    this._rootMesh.isPickable = false;

    // Torso (chassis)
    this._bodyMesh = MeshBuilder.CreateBox(
      `enemyBody_${this.id}`,
      { width: 0.8, height: 1.1, depth: 0.6 },
      this._scene
    );
    this._bodyMesh.position = new Vector3(0, 0.85, 0);
    this._bodyMesh.material = this._bodyMaterial;
    this._bodyMesh.parent = this._rootMesh;

    // Head / Sensor unit
    this._headMesh = MeshBuilder.CreateBox(
      `enemyHead_${this.id}`,
      { width: 0.5, height: 0.4, depth: 0.45 },
      this._scene
    );
    this._headMesh.position = new Vector3(0, 1.55, 0);
    this._headMesh.material = this._accentMaterial;
    this._headMesh.parent = this._rootMesh;

    // Glowing Visor
    this._visorMesh = MeshBuilder.CreateBox(
      `enemyVisor_${this.id}`,
      { width: 0.38, height: 0.1, depth: 0.08 },
      this._scene
    );
    this._visorMesh.position = new Vector3(0, 1.55, 0.23);
    this._visorMesh.material = this._visorMaterial;
    this._visorMesh.parent = this._rootMesh;

    // Left and right weapon/armor pods
    const leftPod = MeshBuilder.CreateCylinder(
      `enemyPodL_${this.id}`,
      { diameter: 0.22, height: 0.8 },
      this._scene
    );
    leftPod.rotation.x = Math.PI / 2;
    leftPod.position = new Vector3(-0.52, 0.85, 0);
    leftPod.material = this._accentMaterial;
    leftPod.parent = this._rootMesh;

    const rightPod = MeshBuilder.CreateCylinder(
      `enemyPodR_${this.id}`,
      { diameter: 0.22, height: 0.8 },
      this._scene
    );
    rightPod.rotation.x = Math.PI / 2;
    rightPod.position = new Vector3(0.52, 0.85, 0);
    rightPod.material = this._accentMaterial;
    rightPod.parent = this._rootMesh;

    // Tag all pickable elements for hitscan raycasts
    const metadata = {
      damageable: this,
      enemyInstance: this
    };

    [this._bodyMesh, this._headMesh, this._visorMesh, leftPod, rightPod].forEach((m) => {
      m.metadata = metadata;
      m.checkCollisions = true;
      m.isPickable = true;
    });
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

  public get state(): EnemyState {
    return this._state;
  }

  public get position(): Vector3 {
    return this._rootMesh.position;
  }

  /**
   * Applies damage to the enemy, triggers hit flash, and checks for destruction.
   */
  public receiveDamage(amount: number): void {
    if (this._isDead) {
      return;
    }

    if (amount <= 0) {
      return;
    }

    this._currentHealth = Math.max(0, this._currentHealth - amount);
    this._triggerHitFlash();

    if (this._currentHealth <= 0) {
      this._die();
    }
  }

  private _triggerHitFlash(): void {
    if (this._flashTimeoutId !== null) {
      clearTimeout(this._flashTimeoutId);
      this._flashTimeoutId = null;
    }

    // Flash white-orange emissive highlight
    this._bodyMaterial.emissiveColor = new Color3(0.9, 0.35, 0.1);
    this._visorMaterial.emissiveColor = new Color3(1.0, 1.0, 1.0);

    this._flashTimeoutId = setTimeout(() => {
      if (!this._isDead) {
        this._bodyMaterial.emissiveColor = new Color3(0, 0, 0);
        this._visorMaterial.emissiveColor = new Color3(0.9, 0.05, 0.05);
      }
      this._flashTimeoutId = null;
    }, 120);
  }

  private _die(): void {
    this._isDead = true;
    this._state = "DEAD";

    if (this._flashTimeoutId !== null) {
      clearTimeout(this._flashTimeoutId);
      this._flashTimeoutId = null;
    }

    if (this._attackAnimTimeoutId !== null) {
      clearTimeout(this._attackAnimTimeoutId);
      this._attackAnimTimeoutId = null;
    }

    // Disable mesh rendering and collisions
    this._rootMesh.setEnabled(false);
    this._rootMesh.getChildMeshes().forEach((child) => {
      child.checkCollisions = false;
      child.isPickable = false;
    });

    this.onDeath?.();
  }

  private _triggerAttackVisual(): void {
    if (this._isDead) {
      return;
    }

    // Visual attack tell: flare eye and pulse forward
    this._visorMaterial.emissiveColor = new Color3(1.0, 0.9, 0.2);
    this._headMesh.position.z = 0.15;

    if (this._attackAnimTimeoutId !== null) {
      clearTimeout(this._attackAnimTimeoutId);
    }

    this._attackAnimTimeoutId = setTimeout(() => {
      if (!this._isDead) {
        this._visorMaterial.emissiveColor = new Color3(0.9, 0.05, 0.05);
        this._headMesh.position.z = 0;
      }
      this._attackAnimTimeoutId = null;
    }, 200);
  }

  /**
   * Updates state machine, movement, and attacks per render frame.
   */
  public update(dt: number, playerPosition: Vector3, isPlayerDead: boolean): void {
    if (this._isDead) {
      return;
    }

    // Stop chasing or attacking when the player is dead
    if (isPlayerDead) {
      this._state = "IDLE";
      return;
    }

    const enemyPos = this._rootMesh.position;
    const dx = playerPosition.x - enemyPos.x;
    const dz = playerPosition.z - enemyPos.z;
    const horizontalDistance = Math.hypot(dx, dz);

    // Check detection range
    if (horizontalDistance > this._detectionRadius) {
      this._state = "IDLE";
      return;
    }

    // Face the player
    this._rootMesh.rotation.y = Math.atan2(dx, dz);

    // In attack range
    if (horizontalDistance <= this._attackRange) {
      this._state = "ATTACK";

      const now = performance.now();
      if (now - this._lastAttackTime >= this._attackCooldownMs) {
        this._lastAttackTime = now;
        this._triggerAttackVisual();
        this.onAttackPlayer?.(this._attackDamage);
      }
      return;
    }

    // Chase player
    this._state = "CHASE";
    const maxMove = Math.min(this._moveSpeed * dt, horizontalDistance - this._attackRange);
    if (maxMove > 0 && horizontalDistance > 0.001) {
      enemyPos.x += (dx / horizontalDistance) * maxMove;
      enemyPos.z += (dz / horizontalDistance) * maxMove;
    }
  }

  /**
   * Resets the enemy back to original spawn position, max health, and idle state.
   */
  public reset(): void {
    if (this._flashTimeoutId !== null) {
      clearTimeout(this._flashTimeoutId);
      this._flashTimeoutId = null;
    }
    if (this._attackAnimTimeoutId !== null) {
      clearTimeout(this._attackAnimTimeoutId);
      this._attackAnimTimeoutId = null;
    }

    this._isDead = false;
    this._state = "IDLE";
    this._currentHealth = this._maxHealth;
    this._lastAttackTime = 0;

    this._rootMesh.position = this._spawnPosition.clone();
    this._rootMesh.rotation.set(0, 0, 0);
    this._headMesh.position.set(0, 1.55, 0);

    this._bodyMaterial.emissiveColor = new Color3(0, 0, 0);
    this._visorMaterial.emissiveColor = new Color3(0.9, 0.05, 0.05);

    this._rootMesh.setEnabled(true);
    this._rootMesh.getChildMeshes().forEach((child) => {
      child.checkCollisions = true;
      child.isPickable = true;
    });
  }

  /**
   * Identifies whether a picked mesh belongs to a BasicEnemy instance.
   */
  public static fromMesh(mesh: AbstractMesh | null | undefined): BasicEnemy | null {
    if (!mesh) {
      return null;
    }
    if (mesh.metadata?.enemyInstance instanceof BasicEnemy) {
      return mesh.metadata.enemyInstance;
    }
    if (mesh.parent && (mesh.parent as AbstractMesh).metadata?.enemyInstance instanceof BasicEnemy) {
      return (mesh.parent as AbstractMesh).metadata.enemyInstance;
    }
    return null;
  }

  public dispose(): void {
    if (this._flashTimeoutId !== null) {
      clearTimeout(this._flashTimeoutId);
      this._flashTimeoutId = null;
    }
    if (this._attackAnimTimeoutId !== null) {
      clearTimeout(this._attackAnimTimeoutId);
      this._attackAnimTimeoutId = null;
    }

    this._bodyMaterial.dispose();
    this._accentMaterial.dispose();
    this._visorMaterial.dispose();
    this._rootMesh.dispose(false, true);
  }
}
