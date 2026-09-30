import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Collisions/collisionCoordinator";
import { Environment } from "./Environment";
import { PlayerController } from "../player/PlayerController";
import { InputManager } from "../input/InputManager";
import { HitscanWeapon } from "../weapons/HitscanWeapon";
import { Target } from "../entities/Target";

/**
 * Manages the scene lifecycle, global scene physics/collisions,
 * and initializes the environment, player, input, targets, and weapon.
 */
export class SceneManager {
  private readonly _scene: Scene;
  private readonly _environment: Environment;
  private readonly _playerController: PlayerController;
  private readonly _inputManager: InputManager;
  private readonly _weapon: HitscanWeapon;
  private readonly _targets: Target[];

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this._scene = new Scene(engine);

    // Global physics and collision settings
    this._scene.collisionsEnabled = true;
    // Standard gravity vector applied per frame (adjusted for 60fps)
    this._scene.gravity = new Vector3(0, -9.81 / 60, 0);

    // Centralized input management
    this._inputManager = new InputManager(canvas);

    // Instantiate scene components
    this._environment = new Environment(this._scene);
    this._playerController = new PlayerController(this._scene, canvas);

    // Three visible target dummies placed in the test room
    this._targets = [
      new Target(this._scene, { id: "Target-A", position: new Vector3(-3, 0, 4), maxHealth: 100 }),
      new Target(this._scene, { id: "Target-B", position: new Vector3(0, 0, 7), maxHealth: 100 }),
      new Target(this._scene, { id: "Target-C", position: new Vector3(3, 0, 5), maxHealth: 100 })
    ];

    // Hitscan weapon casting forward ray from camera center
    this._weapon = new HitscanWeapon(this._scene, this._playerController.camera, this._inputManager, {
      name: "Standard Carbine",
      damage: 25,
      fireRate: 4,
      range: 100
    });
  }

  public get scene(): Scene {
    return this._scene;
  }

  public get environment(): Environment {
    return this._environment;
  }

  public get playerController(): PlayerController {
    return this._playerController;
  }

  public get inputManager(): InputManager {
    return this._inputManager;
  }

  public get weapon(): HitscanWeapon {
    return this._weapon;
  }

  public get targets(): readonly Target[] {
    return this._targets;
  }

  public render(): void {
    // Check continuous firing input while pointer lock is active
    if (this._inputManager.isLeftMouseDown) {
      this._weapon.tryFire();
    }

    this._scene.render();
  }

  public dispose(): void {
    this._targets.forEach((target) => target.dispose());
    this._inputManager.dispose();
    this._playerController.dispose();
    this._scene.dispose();
  }
}
