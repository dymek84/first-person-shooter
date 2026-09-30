import { Scene } from "@babylonjs/core/scene";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Collisions/collisionCoordinator";
import { Environment } from "./Environment";
import { PlayerController } from "../player/PlayerController";
import { InputManager } from "../input/InputManager";
import { HitscanWeapon } from "../weapons/HitscanWeapon";
import { Target } from "../entities/Target";
import { BasicEnemy } from "../entities/BasicEnemy";
import { CombatHUD } from "../ui/CombatHUD";
import { WeaponViewModel } from "../weapons/WeaponViewModel";
import { PlayerHealth } from "../player/PlayerHealth";

export type GameState = "PLAYING" | "PLAYER_DEAD";

/**
 * Manages the scene lifecycle, global scene physics/collisions,
 * and coordinates player health, enemy AI, weapons, targets, HUD, and game state.
 */
export class SceneManager {
  private readonly _scene: Scene;
  private readonly _environment: Environment;
  private readonly _playerController: PlayerController;
  private readonly _playerHealth: PlayerHealth;
  private readonly _inputManager: InputManager;
  private readonly _weapon: HitscanWeapon;
  private readonly _targets: Target[];
  private readonly _enemy: BasicEnemy;
  private readonly _combatHUD: CombatHUD;
  private readonly _viewModel: WeaponViewModel;

  private _gameState: GameState = "PLAYING";

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this._scene = new Scene(engine);

    // Global physics and collision settings
    this._scene.collisionsEnabled = true;
    // Standard gravity vector applied per frame (adjusted for 60fps)
    this._scene.gravity = new Vector3(0, -9.81 / 60, 0);

    // Centralized input management
    this._inputManager = new InputManager(canvas);

    // Instantiate environment and player controller
    this._environment = new Environment(this._scene);
    this._playerController = new PlayerController(this._scene, canvas);

    // Player health management (100 HP max)
    this._playerHealth = new PlayerHealth({ maxHealth: 100 });

    // Target dummies for practice shooting
    this._targets = [
      new Target(this._scene, { id: "Target-A", position: new Vector3(-3, 0, 4), maxHealth: 100 }),
      new Target(this._scene, { id: "Target-B", position: new Vector3(0, 0, 7), maxHealth: 100 }),
      new Target(this._scene, { id: "Target-C", position: new Vector3(3, 0, 5), maxHealth: 100 })
    ];

    // Single BasicEnemy combat entity placed at (0, 0, 8), 13m from player spawn (0, 1.8, -5)
    this._enemy = new BasicEnemy(this._scene, {
      id: "Enemy-Alpha",
      spawnPosition: new Vector3(0, 0, 8),
      maxHealth: 100,
      detectionRadius: 12,
      attackRange: 2.0,
      attackCooldownMs: 1000,
      attackDamage: 10,
      moveSpeed: 2.4
    });

    // Enemy attack delivers damage to player
    this._enemy.onAttackPlayer = (damage: number) => {
      if (this._gameState === "PLAYING") {
        this._playerHealth.receiveDamage({ amount: damage, source: this._enemy.id });
      }
    };

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

    // Procedural weapon viewmodel attached to camera
    this._viewModel = new WeaponViewModel(this._scene, this._playerController.camera);

    // Connect weapon firing and dry-fire events to viewmodel animations
    this._weapon.onFire = () => {
      this._viewModel.triggerRecoil();
    };

    this._weapon.onDryFire = () => {
      this._viewModel.triggerDryFire();
    };

    // Combat HUD overlay displaying ammunition, health, and death state
    this._combatHUD = new CombatHUD();
    this._combatHUD.updateHealth(this._playerHealth.currentHealth, this._playerHealth.maxHealth);

    // Player health reactions
    this._playerHealth.onDamage = (_info, currentHealth, maxHealth) => {
      this._combatHUD.flashDamage();
      this._combatHUD.updateHealth(currentHealth, maxHealth);
    };

    this._playerHealth.onDeath = () => {
      this._handlePlayerDeath();
    };

    // Connect reload & restart actions to R key
    this._inputManager.onReload = () => {
      if (this._gameState === "PLAYER_DEAD") {
        this.restart();
      } else {
        this._weapon.reload();
      }
    };

    // Connect death screen restart button
    this._combatHUD.onRestartClicked = () => {
      this.restart();
    };
  }

  private _handlePlayerDeath(): void {
    this._gameState = "PLAYER_DEAD";
    this._weapon.isEnabled = false;
    this._combatHUD.showDeathScreen(true);
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  /**
   * Performs a clean in-memory restart without reloading the page.
   */
  public restart(): void {
    if (this._gameState !== "PLAYER_DEAD") {
      return;
    }

    this._gameState = "PLAYING";

    // Reset player health and HUD
    this._playerHealth.reset();
    this._combatHUD.updateHealth(this._playerHealth.currentHealth, this._playerHealth.maxHealth);
    this._combatHUD.showDeathScreen(false);

    // Reset camera position and orientation
    this._playerController.reset();

    // Reset combat entities
    this._enemy.reset();
    this._targets.forEach((target) => target.reset());

    // Reset weapon and viewmodel
    this._weapon.reset();
    this._viewModel.reset();

    // Re-engage pointer lock
    this._inputManager.requestPointerLock();
  }

  public get scene(): Scene {
    return this._scene;
  }

  public get gameState(): GameState {
    return this._gameState;
  }

  public get environment(): Environment {
    return this._environment;
  }

  public get playerController(): PlayerController {
    return this._playerController;
  }

  public get playerHealth(): PlayerHealth {
    return this._playerHealth;
  }

  public get inputManager(): InputManager {
    return this._inputManager;
  }

  public get weapon(): HitscanWeapon {
    return this._weapon;
  }

  public get enemy(): BasicEnemy {
    return this._enemy;
  }

  public get targets(): readonly Target[] {
    return this._targets;
  }

  public get combatHUD(): CombatHUD {
    return this._combatHUD;
  }

  public get viewModel(): WeaponViewModel {
    return this._viewModel;
  }

  public render(): void {
    const dt = this._scene.getEngine().getDeltaTime() / 1000;

    if (this._gameState === "PLAYING") {
      // Check continuous firing input while pointer lock is active
      if (this._inputManager.isLeftMouseDown) {
        this._weapon.tryFire();
      }

      // Update enemy AI logic and movement
      this._enemy.update(dt, this._playerController.camera.position, this._playerHealth.isDead);
    }

    // Update viewmodel animations (recoil recovery and reload dipping)
    this._viewModel.setReloading(this._weapon.ammoState.isReloading);
    this._viewModel.update(dt);

    // Synchronize HUD with weapon and health state
    this._combatHUD.update(this._weapon.ammoState);
    this._combatHUD.updateHealth(this._playerHealth.currentHealth, this._playerHealth.maxHealth);

    this._scene.render();
  }

  public dispose(): void {
    this._targets.forEach((target) => target.dispose());
    this._enemy.dispose();
    this._viewModel.dispose();
    this._weapon.dispose();
    this._combatHUD.dispose();
    this._inputManager.dispose();
    this._playerController.dispose();
    this._scene.dispose();
  }
}
