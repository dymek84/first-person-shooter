import { EngineManager } from "./core/EngineManager";
import { SceneManager } from "./scene/SceneManager";

/**
 * Application entry point. Initializes engine and scene,
 * and starts the main render loop.
 */
function bootstrap(): void {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement | null;

  if (!canvas) {
    throw new Error("Unable to find canvas element with ID 'renderCanvas'.");
  }

  const engineManager = new EngineManager(canvas);
  const sceneManager = new SceneManager(engineManager.engine, canvas);

  engineManager.startRenderLoop(() => {
    sceneManager.render();
  });

  window.addEventListener("beforeunload", () => {
    sceneManager.dispose();
    engineManager.dispose();
  });
}

// Start application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
