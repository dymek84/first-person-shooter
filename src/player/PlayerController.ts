import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";

export interface PlayerControllerOptions {
  spawnPosition?: Vector3;
  movementSpeed?: number;
  mouseSensitivity?: number;
}

/**
 * Handles the first-person camera, WASD controls, mouse-look,
 * player collision ellipsoid, gravity, and pointer-lock state.
 */
export class PlayerController {
  private readonly _camera: UniversalCamera;
  private readonly _canvas: HTMLCanvasElement;
  private readonly _scene: Scene;
  private _isPointerLocked: boolean = false;

  private readonly _onCanvasClick: () => void;
  private readonly _onPointerLockChange: () => void;

  constructor(scene: Scene, canvas: HTMLCanvasElement, options: PlayerControllerOptions = {}) {
    this._scene = scene;
    this._canvas = canvas;

    const spawn = options.spawnPosition ?? new Vector3(0, 1.8, -5);
    this._camera = new UniversalCamera("firstPersonCamera", spawn, this._scene);

    // Initial orientation: look forward along +Z
    this._camera.setTarget(new Vector3(spawn.x, spawn.y, spawn.z + 10));

    // Attach camera controls to canvas
    this._camera.attachControl(this._canvas, true);

    // Configure WASD + Arrow Keys
    this._camera.keysUp = [87, 38];     // W, Up Arrow
    this._camera.keysDown = [83, 40];   // S, Down Arrow
    this._camera.keysLeft = [65, 37];   // A, Left Arrow
    this._camera.keysRight = [68, 39];  // D, Right Arrow

    // Responsiveness & Speed
    this._camera.speed = options.movementSpeed ?? 0.35;
    this._camera.angularSensibility = options.mouseSensitivity ?? 2000;
    this._camera.inertia = 0.1; // Low inertia for crisp FPS movement

    // First-person collision ellipsoid and gravity
    this._camera.checkCollisions = true;
    this._camera.applyGravity = true;
    // Bounding ellipsoid representing player volume (width: 0.8m, height: 1.8m)
    this._camera.ellipsoid = new Vector3(0.4, 0.9, 0.4);

    // Setup pointer lock callbacks
    this._onCanvasClick = () => {
      if (!this._isPointerLocked) {
        this._canvas.requestPointerLock();
      }
    };

    this._onPointerLockChange = () => {
      this._isPointerLocked = document.pointerLockElement === this._canvas;
    };

    this._setupPointerLock();
  }

  private _setupPointerLock(): void {
    this._canvas.addEventListener("click", this._onCanvasClick);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
  }

  public get camera(): UniversalCamera {
    return this._camera;
  }

  public get isPointerLocked(): boolean {
    return this._isPointerLocked;
  }

  public dispose(): void {
    this._canvas.removeEventListener("click", this._onCanvasClick);
    document.removeEventListener("pointerlockchange", this._onPointerLockChange);
    this._camera.dispose();
  }
}
