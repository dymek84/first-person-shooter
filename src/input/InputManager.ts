/**
 * Manages user keyboard, mouse button inputs, and pointer lock state.
 * Decouples input observation from camera movement and weapon logic.
 */
export class InputManager {
  private readonly _canvas: HTMLCanvasElement;
  private readonly _pressedKeys: Set<string> = new Set();
  private _isLeftMouseDown: boolean = false;
  private _isPointerLocked: boolean = false;

  private readonly _onKeyDown: (e: KeyboardEvent) => void;
  private readonly _onKeyUp: (e: KeyboardEvent) => void;
  private readonly _onPointerDown: (e: PointerEvent) => void;
  private readonly _onPointerUp: (e: PointerEvent) => void;
  private readonly _onPointerLockChange: () => void;
  private readonly _onCanvasClick: () => void;
  private readonly _onWindowBlur: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;

    this._onKeyDown = (e: KeyboardEvent) => {
      this._pressedKeys.add(e.code);
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      this._pressedKeys.delete(e.code);
    };

    this._onPointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        this._isLeftMouseDown = true;
      }
    };

    this._onPointerUp = (e: PointerEvent) => {
      if (e.button === 0) {
        this._isLeftMouseDown = false;
      }
    };

    this._onPointerLockChange = () => {
      this._isPointerLocked = document.pointerLockElement === this._canvas;
      if (!this._isPointerLocked) {
        this._isLeftMouseDown = false;
        this._pressedKeys.clear();
      }
    };

    this._onCanvasClick = () => {
      if (!this._isPointerLocked) {
        this.requestPointerLock();
      }
    };

    this._onWindowBlur = () => {
      this._isLeftMouseDown = false;
      this._pressedKeys.clear();
    };

    this._attachListeners();
  }

  private _attachListeners(): void {
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointerup", this._onPointerUp);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
    this._canvas.addEventListener("click", this._onCanvasClick);
    window.addEventListener("blur", this._onWindowBlur);
  }

  /**
   * Requests pointer lock on the associated canvas.
   */
  public requestPointerLock(): void {
    this._canvas.requestPointerLock();
  }

  /**
   * Returns whether a given key code (e.g. 'KeyW', 'Space') is currently held down.
   */
  public isKeyDown(code: string): boolean {
    return this._pressedKeys.has(code);
  }

  /**
   * Returns whether the primary (left) mouse button is currently held down.
   */
  public get isLeftMouseDown(): boolean {
    return this._isLeftMouseDown;
  }

  /**
   * Returns whether pointer lock is currently engaged on the viewport.
   */
  public get isPointerLocked(): boolean {
    return this._isPointerLocked;
  }

  /**
   * Disposes all registered event listeners.
   */
  public dispose(): void {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointerup", this._onPointerUp);
    document.removeEventListener("pointerlockchange", this._onPointerLockChange);
    this._canvas.removeEventListener("click", this._onCanvasClick);
    window.removeEventListener("blur", this._onWindowBlur);
    this._pressedKeys.clear();
    this._isLeftMouseDown = false;
  }
}
