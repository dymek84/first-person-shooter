import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

/**
 * Manages the first-person procedural weapon viewmodel attached to the camera.
 * Handles procedural geometry, recoil spring animation, muzzle flash, and dry-fire feedback.
 */
export class WeaponViewModel {
  private readonly _scene: Scene;
  private readonly _rootNode: TransformNode;
  private readonly _muzzleFlash: Mesh;
  private readonly _meshes: Mesh[] = [];
  private readonly _materials: StandardMaterial[] = [];

  // Rest pose relative to camera in lower-right viewport
  private readonly _restPosition: Vector3 = new Vector3(0.24, -0.22, 0.52);
  private readonly _restRotation: Vector3 = new Vector3(0.02, -0.04, 0.01);

  // Recoil offsets (spring animation)
  private readonly _recoilOffset: Vector3 = new Vector3(0, 0, 0);
  private readonly _recoilRotation: Vector3 = new Vector3(0, 0, 0);

  // Reload dip state
  private _isReloading: boolean = false;
  private _currentReloadDip: number = 0;

  // Tracked muzzle flash timer
  private _flashTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor(scene: Scene, camera: Camera) {
    this._scene = scene;

    // Root transform node parented to FPS camera
    this._rootNode = new TransformNode("weaponViewModelRoot", this._scene);
    this._rootNode.parent = camera;
    this._rootNode.position = this._restPosition.clone();
    this._rootNode.rotation = this._restRotation.clone();

    // Solid materials for procedural weapon
    const bodyMat = new StandardMaterial("vmBodyMat", this._scene);
    bodyMat.diffuseColor = new Color3(0.14, 0.15, 0.17);
    bodyMat.specularColor = new Color3(0.15, 0.15, 0.15);
    this._materials.push(bodyMat);

    const accentMat = new StandardMaterial("vmAccentMat", this._scene);
    accentMat.diffuseColor = new Color3(0.06, 0.07, 0.08);
    accentMat.specularColor = new Color3(0.08, 0.08, 0.08);
    this._materials.push(accentMat);

    const flashMat = new StandardMaterial("vmFlashMat", this._scene);
    flashMat.diffuseColor = new Color3(1.0, 0.85, 0.2);
    flashMat.emissiveColor = new Color3(1.0, 0.9, 0.3);
    flashMat.specularColor = new Color3(0, 0, 0);
    this._materials.push(flashMat);

    // Build procedural carbine parts
    // 1. Receiver
    const receiver = MeshBuilder.CreateBox("vm_receiver", { width: 0.05, height: 0.075, depth: 0.28 }, this._scene);
    receiver.position = new Vector3(0, 0, 0);
    receiver.material = bodyMat;
    this._registerPart(receiver);

    // 2. Upper rail
    const rail = MeshBuilder.CreateBox("vm_rail", { width: 0.024, height: 0.02, depth: 0.22 }, this._scene);
    rail.position = new Vector3(0, 0.045, 0.01);
    rail.material = accentMat;
    this._registerPart(rail);

    // 3. Front sight post
    const sight = MeshBuilder.CreateBox("vm_sight", { width: 0.008, height: 0.022, depth: 0.012 }, this._scene);
    sight.position = new Vector3(0, 0.045, 0.2);
    sight.material = accentMat;
    this._registerPart(sight);

    // 4. Barrel
    const barrel = MeshBuilder.CreateCylinder("vm_barrel", { diameter: 0.022, height: 0.26 }, this._scene);
    barrel.rotation.x = Math.PI / 2;
    barrel.position = new Vector3(0, 0.015, 0.26);
    barrel.material = accentMat;
    this._registerPart(barrel);

    // 5. Muzzle device
    const muzzle = MeshBuilder.CreateCylinder("vm_muzzle", { diameter: 0.028, height: 0.04 }, this._scene);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position = new Vector3(0, 0.015, 0.40);
    muzzle.material = accentMat;
    this._registerPart(muzzle);

    // 6. Handguard
    const handguard = MeshBuilder.CreateBox("vm_handguard", { width: 0.046, height: 0.06, depth: 0.16 }, this._scene);
    handguard.position = new Vector3(0, -0.005, 0.14);
    handguard.material = bodyMat;
    this._registerPart(handguard);

    // 7. Magazine
    const magazine = MeshBuilder.CreateBox("vm_magazine", { width: 0.036, height: 0.13, depth: 0.055 }, this._scene);
    magazine.rotation.x = -0.15;
    magazine.position = new Vector3(0, -0.09, 0.03);
    magazine.material = accentMat;
    this._registerPart(magazine);

    // 8. Grip
    const grip = MeshBuilder.CreateBox("vm_grip", { width: 0.036, height: 0.11, depth: 0.045 }, this._scene);
    grip.rotation.x = 0.28;
    grip.position = new Vector3(0, -0.08, -0.09);
    grip.material = accentMat;
    this._registerPart(grip);

    // 9. Stock
    const stock = MeshBuilder.CreateBox("vm_stock", { width: 0.04, height: 0.08, depth: 0.18 }, this._scene);
    stock.position = new Vector3(0, -0.015, -0.21);
    stock.material = bodyMat;
    this._registerPart(stock);

    // 10. Muzzle flash (hidden by default)
    this._muzzleFlash = MeshBuilder.CreateSphere("vm_flash", { diameter: 0.08, segments: 6 }, this._scene);
    this._muzzleFlash.scaling = new Vector3(1.0, 1.0, 1.8);
    this._muzzleFlash.position = new Vector3(0, 0.015, 0.44);
    this._muzzleFlash.material = flashMat;
    this._muzzleFlash.isVisible = false;
    this._registerPart(this._muzzleFlash);
  }

  private _registerPart(mesh: Mesh): void {
    mesh.parent = this._rootNode;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = { isViewModel: true };
    this._meshes.push(mesh);
  }

  /**
   * Applies recoil impulse (backward translation and upward muzzle pitch)
   * and activates the muzzle flash for ~65ms.
   */
  public triggerRecoil(): void {
    // Sharp recoil displacement
    this._recoilOffset.z = -0.055;
    this._recoilOffset.y = 0.012;
    this._recoilRotation.x = -0.075; // Pitch muzzle upward

    // Display muzzle flash with slight random roll
    this._muzzleFlash.rotation.z = Math.random() * Math.PI;
    this._muzzleFlash.isVisible = true;

    if (this._flashTimerId !== null) {
      clearTimeout(this._flashTimerId);
    }

    this._flashTimerId = setTimeout(() => {
      this._muzzleFlash.isVisible = false;
      this._flashTimerId = null;
    }, 65);
  }

  /**
   * Applies a subtle dry-fire click twitch without muzzle flash.
   */
  public triggerDryFire(): void {
    this._recoilOffset.z = -0.01;
    this._recoilRotation.x = -0.018;
  }

  /**
   * Sets reloading status to trigger a smooth weapon lowering animation during reloads.
   */
  public setReloading(isReloading: boolean): void {
    this._isReloading = isReloading;
  }

  /**
   * Updates weapon recoil recovery spring and reload lowering animation.
   *
   * @param deltaTimeSeconds Delta time in seconds since last frame.
   */
  public update(deltaTimeSeconds: number): void {
    // Snappy recovery spring
    const recoveryFactor = Math.min(1, 16 * deltaTimeSeconds);
    this._recoilOffset.z += (0 - this._recoilOffset.z) * recoveryFactor;
    this._recoilOffset.y += (0 - this._recoilOffset.y) * recoveryFactor;
    this._recoilRotation.x += (0 - this._recoilRotation.x) * recoveryFactor;

    // Smooth reload dip transition
    const targetReloadDip = this._isReloading ? -0.12 : 0;
    this._currentReloadDip += (targetReloadDip - this._currentReloadDip) * Math.min(1, 8 * deltaTimeSeconds);

    // Apply combined offsets to transform node
    this._rootNode.position.x = this._restPosition.x;
    this._rootNode.position.y = this._restPosition.y + this._recoilOffset.y + this._currentReloadDip;
    this._rootNode.position.z = this._restPosition.z + this._recoilOffset.z;

    this._rootNode.rotation.x = this._restRotation.x + this._recoilRotation.x;
    this._rootNode.rotation.y = this._restRotation.y;
    this._rootNode.rotation.z = this._restRotation.z;
  }

  /**
   * Resets viewmodel recoil offsets, reload dip, and muzzle flash to baseline pose.
   */
  public reset(): void {
    if (this._flashTimerId !== null) {
      clearTimeout(this._flashTimerId);
      this._flashTimerId = null;
    }
    this._recoilOffset.set(0, 0, 0);
    this._recoilRotation.set(0, 0, 0);
    this._isReloading = false;
    this._currentReloadDip = 0;
    this._muzzleFlash.isVisible = false;

    this._rootNode.position.copyFrom(this._restPosition);
    this._rootNode.rotation.copyFrom(this._restRotation);
  }

  public dispose(): void {
    if (this._flashTimerId !== null) {
      clearTimeout(this._flashTimerId);
      this._flashTimerId = null;
    }

    this._meshes.forEach((mesh) => mesh.dispose());
    this._materials.forEach((mat) => mat.dispose());
    this._rootNode.dispose();
  }
}
