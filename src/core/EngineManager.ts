import { Engine } from "@babylonjs/core/Engines/engine";

/**
 * Manages the lifecycle of the Babylon.js Engine instance,
 * including window resize listeners and the main render loop.
 */
export class EngineManager {
  private readonly _engine: Engine;
  private readonly _canvas: HTMLCanvasElement;
  private readonly _resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._engine = new Engine(this._canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true
    });

    this._resizeHandler = () => {
      this._engine.resize();
    };

    window.addEventListener("resize", this._resizeHandler);
  }

  public get engine(): Engine {
    return this._engine;
  }

  public get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  public startRenderLoop(renderFn: () => void): void {
    this._engine.runRenderLoop(renderFn);
  }

  public stopRenderLoop(): void {
    this._engine.stopRenderLoop();
  }

  public dispose(): void {
    window.removeEventListener("resize", this._resizeHandler);
    this._engine.dispose();
  }
}
