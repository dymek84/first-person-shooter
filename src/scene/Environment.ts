import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";

/**
 * Builds the test room environment including visible ground plane,
 * enclosed perimeter walls, ceiling, collision obstacles, and lighting.
 */
export class Environment {
  private readonly _scene: Scene;

  constructor(scene: Scene) {
    this._scene = scene;
    this._createLighting();
    this._createRoom();
  }

  private _createLighting(): void {
    // Hemispheric light providing soft ambient fill
    const ambientLight = new HemisphericLight(
      "ambientLight",
      new Vector3(0, 1, 0),
      this._scene
    );
    ambientLight.intensity = 0.55;
    ambientLight.diffuse = new Color3(0.85, 0.9, 0.95);
    ambientLight.groundColor = new Color3(0.15, 0.15, 0.2);

    // Warm ceiling point light to give depth and specular highlights
    const ceilingLight = new PointLight(
      "ceilingLight",
      new Vector3(0, 4.5, 0),
      this._scene
    );
    ceilingLight.intensity = 0.8;
    ceilingLight.diffuse = new Color3(1.0, 0.95, 0.85);
  }

  private _createRoom(): void {
    const roomWidth = 24;
    const roomDepth = 24;
    const roomHeight = 5;
    const wallThickness = 0.5;

    // --- Ground Plane ---
    const ground = MeshBuilder.CreateGround(
      "groundPlane",
      { width: roomWidth, height: roomDepth, subdivisions: 2 },
      this._scene
    );
    ground.checkCollisions = true;

    // Dynamic grid texture for clear spatial perception
    const gridTexture = new DynamicTexture("groundGrid", 512, this._scene, false);
    const ctx = gridTexture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = "#22252e";
    ctx.fillRect(0, 0, 512, 512);

    // Draw grid lines
    ctx.strokeStyle = "#383f4f";
    ctx.lineWidth = 4;
    const step = 64;
    for (let x = 0; x <= 512; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    gridTexture.update();
    gridTexture.uScale = 6;
    gridTexture.vScale = 6;

    const groundMaterial = new StandardMaterial("groundMaterial", this._scene);
    groundMaterial.diffuseTexture = gridTexture;
    groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    ground.material = groundMaterial;

    // --- Wall Material ---
    const wallMaterial = new StandardMaterial("wallMaterial", this._scene);
    wallMaterial.diffuseColor = new Color3(0.35, 0.38, 0.44);
    wallMaterial.specularColor = new Color3(0.05, 0.05, 0.05);

    // North Wall (+Z)
    const northWall = MeshBuilder.CreateBox(
      "northWall",
      { width: roomWidth, height: roomHeight, depth: wallThickness },
      this._scene
    );
    northWall.position = new Vector3(0, roomHeight / 2, roomDepth / 2);
    northWall.checkCollisions = true;
    northWall.material = wallMaterial;

    // South Wall (-Z)
    const southWall = MeshBuilder.CreateBox(
      "southWall",
      { width: roomWidth, height: roomHeight, depth: wallThickness },
      this._scene
    );
    southWall.position = new Vector3(0, roomHeight / 2, -roomDepth / 2);
    southWall.checkCollisions = true;
    southWall.material = wallMaterial;

    // East Wall (+X)
    const eastWall = MeshBuilder.CreateBox(
      "eastWall",
      { width: wallThickness, height: roomHeight, depth: roomDepth },
      this._scene
    );
    eastWall.position = new Vector3(roomWidth / 2, roomHeight / 2, 0);
    eastWall.checkCollisions = true;
    eastWall.material = wallMaterial;

    // West Wall (-X)
    const westWall = MeshBuilder.CreateBox(
      "westWall",
      { width: wallThickness, height: roomHeight, depth: roomDepth },
      this._scene
    );
    westWall.position = new Vector3(-roomWidth / 2, roomHeight / 2, 0);
    westWall.checkCollisions = true;
    westWall.material = wallMaterial;

    // --- Ceiling ---
    const ceiling = MeshBuilder.CreateBox(
      "ceiling",
      { width: roomWidth, height: wallThickness, depth: roomDepth },
      this._scene
    );
    ceiling.position = new Vector3(0, roomHeight, 0);
    ceiling.checkCollisions = true;

    const ceilingMaterial = new StandardMaterial("ceilingMaterial", this._scene);
    ceilingMaterial.diffuseColor = new Color3(0.18, 0.2, 0.24);
    ceiling.material = ceilingMaterial;

    // --- Test Obstacles (for collision verification) ---
    const obstacleMaterial = new StandardMaterial("obstacleMaterial", this._scene);
    obstacleMaterial.diffuseColor = new Color3(0.24, 0.45, 0.65);

    const pillar1 = MeshBuilder.CreateBox("pillar1", { width: 2, height: 3, depth: 2 }, this._scene);
    pillar1.position = new Vector3(4, 1.5, 3);
    pillar1.checkCollisions = true;
    pillar1.material = obstacleMaterial;

    const pillar2 = MeshBuilder.CreateBox("pillar2", { width: 2, height: 2, depth: 2 }, this._scene);
    pillar2.position = new Vector3(-4, 1.0, 3);
    pillar2.checkCollisions = true;
    pillar2.material = obstacleMaterial;
  }
}
