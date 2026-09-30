import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

/**
 * Creates temporary visual hit markers at raycast contact points.
 * Automatically cleans up effect meshes after a short duration.
 */
export class ImpactEffect {
  private static _effectCount = 0;

  /**
   * Spawns a temporary visual impact marker at the specified hit position.
   *
   * @param scene The Babylon.js scene.
   * @param position World coordinates of the hit point.
   * @param durationMs Lifetime of the impact marker in milliseconds (default: 200ms).
   */
  public static create(scene: Scene, position: Vector3, durationMs: number = 200): void {
    const id = ++ImpactEffect._effectCount;
    const marker = MeshBuilder.CreateSphere(`impactMarker_${id}`, { diameter: 0.18, segments: 6 }, scene);
    marker.position = position.clone();
    marker.isPickable = false;
    marker.checkCollisions = false;

    const mat = new StandardMaterial(`impactMat_${id}`, scene);
    mat.diffuseColor = new Color3(1.0, 0.85, 0.2);
    mat.emissiveColor = new Color3(1.0, 0.85, 0.2);
    mat.specularColor = new Color3(0, 0, 0);
    marker.material = mat;

    setTimeout(() => {
      if (!marker.isDisposed()) {
        marker.dispose();
      }
    }, durationMs);
  }
}
