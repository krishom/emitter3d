import * as THREE from 'three';

import { History } from './aux/history';
import { Particles } from './particles';
import { Prisms } from './prisms';
import { Grid } from './grid';
import { Camera } from './camera';
import { BirthdayText } from './text';

export type Dot = {
  seed: number;
  lifeTime: number;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  opacity: number;
  hue: number;
};

function allocateDot(): Dot {
  return {
    seed: 0,
    lifeTime: 0,
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    hue: 0,
    opacity: 0,
  };
}

export class Scene extends THREE.Scene {
  readonly history: History<Dot>;
  readonly prisms: Prisms;
  readonly particles: Particles;
  readonly grid: Grid;
  readonly birthdayText: BirthdayText;
  private envMap: THREE.CubeTexture;

  readonly prismOptions = {
    saturation: 0.5,
    lightness: 0.5,
    snapshotOffset: 0,
    hueOffset: 0,
    hueTransition: 0,
    trailLength: 1,
    trailStep: 1,
    trailAttenuation: (x: number) => 1 - x,
  };

  readonly particleOptions = {
    saturation: 0.5,
    lightness: 0.5,
    sizeTransition: (x: number) => 1 - x,
    snapshotOffset: 10,
    hueOffset: 0,
    hueTransition: 0,
    trailLength: 1,
    trailAttenuation: (x: number) => 1 - x,
    trailDiffusionScale: 0,
    trailDiffusionTransition: (x: number) => 1 - x,
    trailDiffusionShakiness: 0,
  };

  stateNeedsUpdate = false;

  constructor(camera: Camera) {
    super();
    this.fog = new THREE.FogExp2(0x000000, 0.003);
    this.history = new History(allocateDot, 300);
    console.log('scene constructor');

    this.birthdayText = new BirthdayText((mesh) => {
      this.add(mesh);
    });

    // Load environment map for reflections
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    this.envMap = cubeTextureLoader.load([
      'threejs.org/examples/textures/cube/Park3Med/px.jpg',
      'threejs.org/examples/textures/cube/Park3Med/nx.jpg',
      'threejs.org/examples/textures/cube/Park3Med/py.jpg',
      'threejs.org/examples/textures/cube/Park3Med/ny.jpg',
      'threejs.org/examples/textures/cube/Park3Med/pz.jpg',
      'threejs.org/examples/textures/cube/Park3Med/nz.jpg',
    ]);
    this.environment = this.envMap;

    // Add colorful point lights
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
    const lightPositions = [
      new THREE.Vector3(20, 20, 20),
      new THREE.Vector3(-20, 20, -20),
      new THREE.Vector3(20, -20, -20),
      new THREE.Vector3(-20, -20, 20),
      new THREE.Vector3(0, 30, 0)
    ];

    colors.forEach((color, index) => {
      const light = new THREE.PointLight(color, 2, 50);
      light.position.copy(lightPositions[index]);
      this.add(light);
    });

    // Add text-specific lights
    const textLightPositions = [
      new THREE.Vector3(0, 25, 0),    // Above text
      new THREE.Vector3(15, 15, -15), // Front right
      new THREE.Vector3(-15, 15, -15), // Front left
      new THREE.Vector3(15, -15, -15), // Bottom right
      new THREE.Vector3(-15, -15, -15), // Bottom left
      new THREE.Vector3(0, 0, -25)    // Direct front
    ];

    textLightPositions.forEach((position, index) => {
      const light = new THREE.PointLight(0xffffff, 3, 30);
      light.position.copy(position);
      this.add(light);
    });

    // Add spotlight for dramatic effect
    const spotlight = new THREE.SpotLight(0xffffff, 5, 50, Math.PI / 4, 0.5);
    spotlight.position.set(0, 30, 0);
    spotlight.target.position.set(0, 15, -20);
    this.add(spotlight);
    this.add(spotlight.target);

    // Add ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.add(ambientLight);

    this.particles = new Particles(80000);
    this.add(this.particles);

    this.prisms = new Prisms(80000);
    this.add(this.prisms);

    this.grid = new Grid();
    // this.add(this.grid);

    this.particles.mat.setCameraClip(camera.near, camera.far);
  }

  update(): void {
    if (this.stateNeedsUpdate) {
      this.stateNeedsUpdate = false;
      this.updateState();
    }
    this.birthdayText.update(Date.now());
  }

  updateState(): void {
    const rotation = new THREE.Quaternion();
    const hsla = new THREE.Vector4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();

    if (this.prisms.visible) {
      const {
        trailLength,
        trailStep,
        trailAttenuation,
        snapshotOffset,
        hueOffset,
        hueTransition,
        saturation,
        lightness,
      } = this.prismOptions;

      const prisms = this.prisms.beginUpdateState();
      for (let i = 0; i < trailLength; i += Math.floor(trailStep)) {
        const t = i / (trailLength - 0.9);
        const l = trailAttenuation(t);
        for (const dot of this.history.snapshot(i + snapshotOffset)) {
          if (dot.opacity == 0) continue;
          rotation
            .copy(dot.rotation)
            .multiply(q.setFromEuler(e.set(0, 0, Math.PI * 0.02 * dot.lifeTime)));
          const hue = (dot.hue + hueOffset + (hueTransition * i) / trailLength) / 360;
          hsla.set(hue, saturation, lightness * l, dot.opacity);
          prisms.put(dot.position, rotation, hsla);
        }
      }
      prisms.complete();
    }

    if (this.particles.visible) {
      const {
        saturation,
        lightness,
        sizeTransition,
        snapshotOffset,
        hueOffset,
        hueTransition,
        trailLength,
        trailAttenuation,
        trailDiffusionScale,
        trailDiffusionTransition,
        trailDiffusionShakiness,
      } = this.particleOptions;

      const particles = this.particles.beginUpdateState();
      for (let i = 0; i < trailLength; i++) {
        const t = i / (trailLength - 0.9);
        const l = trailAttenuation(t);
        const f = (1 - trailDiffusionTransition(t)) * trailDiffusionScale;
        const s = sizeTransition(t);
        for (const dot of this.history.snapshot(i + snapshotOffset)) {
          if (dot.opacity == 0) continue;
          const hue = (dot.hue + hueOffset + (hueTransition * i) / trailLength) / 360;
          hsla.set(hue, saturation, lightness * l, dot.opacity);
          particles.put(
            dot.position,
            hsla,
            f,
            dot.lifeTime * trailDiffusionShakiness + dot.seed * 100,
            s
          );
        }
      }
      particles.complete();
    }
  }

  setSize(width: number, height: number): void {
    this.particles.mat.setSize(width, height);
  }

  setYOffset(offset: number): void {
    this.grid.position.set(0, offset, 0);
  }
}
