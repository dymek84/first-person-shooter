import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
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