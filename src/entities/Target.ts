import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

export interface TargetOptions {
  id: string;
  position: Vector3;
  maxHealth?: number;
}

/**
 * Represents an interactive target entity with hitpoints,
 * hit reaction flash, and destruction state.
 */
export class Target {
  private readonly _id: string;
  private readonly _maxHealth: number;
  private _currentHealth: number;
  private _isDestroyed: boolean = false;

  private readonly _scene: Scene;
  private readonly _rootMesh: Mesh;
  private readonly _targetMaterial: StandardMaterial;
  private readonly _baseMaterialColor: Color3 = new Color3(0.9, 0.3, 0.15); // Vibrant orange/crimson
  private _flashTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(scene: Scene, options: TargetOptions) {
    this._scene = scene;
    this._id = options.id;
    this._maxHealth = options.maxHealth ?? 100;
    this._currentHealth = this._maxHealth;

    // Create material with default state
    this._targetMaterial = new StandardMaterial(`targetMat_${this._id}`, this._scene);
    this._targetMaterial.diffuseColor = this._baseMaterialColor.clone();
    this._targetMaterial.specularColor = new Color3(0.2, 0.2, 0.2);
    this._targetMaterial.emissiveColor = new Color3(0, 0, 0);

    // Build visual target dummy
    this._rootMesh = this._createMesh(options.position);
  }

  private _createMesh(position: Vector3): Mesh {
    // Root container mesh
    const root = MeshBuilder.CreateBox(`targetRoot_${this._id}`, { size: 0.1 }, this._scene);
    root.position = position.clone();
    root.isVisible = false;
    root.isPickable = false;

    // Pedestal stand
    const standMat = new StandardMaterial(`standMat_${this._id}`, this._scene);
    standMat.diffuseColor = new Color3(0.2, 0.22, 0.26);

    const stand = MeshBuilder.CreateCylinder(`targetStand_${this._id}`, { diameter: 0.8, height: 0.2 }, this._scene);
    stand.position = new Vector3(0, 0.1, 0);
    stand.material = standMat;
    stand.checkCollisions = true;
    stand.parent = root;

    // Center post
    const post = MeshBuilder.CreateCylinder(`targetPost_${this._id}`, { diameter: 0.15, height: 1.0 }, this._scene);
    post.position = new Vector3(0, 0.7, 0);
    post.material = standMat;
    post.parent = root;

    // Target Torso / Bullseye Board
    const body = MeshBuilder.CreateBox(
      `targetBody_${this._id}`,
      { width: 0.9, height: 1.1, depth: 0.2 },
      this._scene
    );
    body.position = new Vector3(0, 1.6, 0);
    body.material = this._targetMaterial;
    body.checkCollisions = true;
    body.isPickable = true;
    body.parent = root;

    // Bullseye center accent
    const centerAccent = MeshBuilder.CreateCylinder(
      `targetAccent_${this._id}`,
      { diameter: 0.45, height: 0.22 },
      this._scene
    );
    centerAccent.rotation.x = Math.PI / 2;
    centerAccent.position = new Vector3(0, 1.6, 0);
    const accentMat = new StandardMaterial(`targetAccentMat_${this._id}`, this._scene);
    accentMat.diffuseColor = new Color3(1.0, 1.0, 1.0);
    centerAccent.material = accentMat;
    centerAccent.isPickable = true;
    centerAccent.parent = root;

    // Tag all pickable elements with reference to this Target instance
    const metadata = { targetInstance: this };
    body.metadata = metadata;
    centerAccent.metadata = metadata;
    stand.metadata = metadata;
    post.metadata = metadata;

    return root;
  }

  /**
   * Applies damage to the target, triggering hit feedback or destruction.
   */
  public receiveDamage(amount: number): void {
    if (this._isDestroyed) {
      return;
    }

    this._currentHealth = Math.max(0, this._currentHealth - amount);
    this._triggerHitFlash();

    if (this._currentHealth <= 0) {
      this._destroy();
    }
  }

  private _triggerHitFlash(): void {
    if (this._flashTimeoutId !== null) {
      clearTimeout(this._flashTimeoutId);
      this._flashTimeoutId = null;
    }

    // Flash white-red emissive highlight
    this._targetMaterial.emissiveColor = new Color3(1.0, 0.2, 0.2);

    this._flashTimeoutId = setTimeout(() => {
      if (!this._isDestroyed) {
        this._targetMaterial.emissiveColor = new Color3(0, 0, 0);
      }
      this._flashTimeoutId = null;
    }, 120);
  }

  private _destroy(): void {
    this._isDestroyed = true;

    if (this._flashTimeoutId !== null) {
      clearTimeout(this._flashTimeoutId);
      this._flashTimeoutId = null;
    }

    // Disable rendering and collisions
    this._rootMesh.setEnabled(false);
    this._rootMesh.getChildMeshes().forEach((child) => {
      child.checkCollisions = false;
      child.isPickable = false;
    });
  }

  public get id(): string {
    return this._id;
  }

  public get maxHealth(): number {
    return this._maxHealth;
  }

  public get currentHealth(): number {
    return this._currentHealth;
  }

  public get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  public get rootMesh(): Mesh {
    return this._rootMesh;
  }

  /**
   * Identifies whether a picked mesh belongs to a Target instance.
   */
  public static fromMesh(mesh: AbstractMesh | null | undefined): Target | null {
    if (!mesh) {
      return null;
    }

    if (mesh.metadata && mesh.metadata.targetInstance instanceof Target) {
      return mesh.metadata.targetInstance;
    }

    if (mesh.parent && mesh.parent.metadata && mesh.parent.metadata.targetInstance instanceof Target) {
      return mesh.parent.metadata.targetInstance;
    }

    return null;
  }

  public dispose(): void {
    if (this._flashTimeoutId !== null) {
      clearTimeout(this._flashTimeoutId);
      this._flashTimeoutId = null;
    }
    this._rootMesh.dispose(false, true);
  }
}
