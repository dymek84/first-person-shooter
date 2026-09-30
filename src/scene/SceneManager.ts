import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Collisions/collisionCoordinator";
import { Environment } from "./Environment";
import { PlayerController } from "../player/PlayerController";
import { InputManager } from "../input/InputManager";
import { HitscanWeapon } from "../weapons/HitscanWeapon";
import { Target } from "../entities/Target";
import { CombatHUD } from "../ui/CombatHUD";

/**
 * Manages the scene lifecycle, global scene physics/collisions,
 * and initializes the environment, player, input, targets, weapon, and combat HUD.
 */
export class SceneManager {
  private readonly _scene: Scene;
  private readonly _environment: Environment;
  private readonly _playerController: PlayerController;
  private readonly _inputManager: InputManager;
  private readonly _weapon: HitscanWeapon;
  private readonly _targets: Target[];
  private readonly _combatHUD: CombatHUD;

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

    // Hitscan weapon casting forward ray from camera center with 12-round mag & 60-round reserve
    this._weapon = new HitscanWeapon(this._scene, this._playerController.camera, this._inputManager, {
      name: "Standard Carbine",
      damage: 25,
      fireRate: 4,
      range: 100,
      magazineSize: 12,
      reserveAmmo: 60,
      reloadDurationMs: 1500
    });

    // Combat HUD overlay displaying ammunition and reload state
    this._combatHUD = new CombatHUD();

    // Hook reload input to weapon
    this._inputManager.onReload = () => {
      this._weapon.reload();
    };
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

  public get combatHUD(): CombatHUD {
    return this._combatHUD;
  }

  public render(): void {
    // Check continuous firing input while pointer lock is active
    if (this._inputManager.isLeftMouseDown) {
      this._weapon.tryFire();
    }

    // Synchronize HUD with weapon state
    this._combatHUD.update(this._weapon.ammoState);

    this._scene.render();
  }

  public dispose(): void {
    this._targets.forEach((target) => target.dispose());
    this._weapon.dispose();
    this._combatHUD.dispose();
    this._inputManager.dispose();
    this._playerController.dispose();
    this._scene.dispose();
  }
}
