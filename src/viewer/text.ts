import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { Font } from 'three/examples/jsm/loaders/FontLoader';

export class BirthdayText {
  private textMesh: THREE.Mesh | null = null;
  private material: THREE.MeshPhysicalMaterial;
  private onTextReady: ((mesh: THREE.Mesh) => void) | null = null;

  constructor(onTextReady?: (mesh: THREE.Mesh) => void) {
    this.onTextReady = onTextReady || null;

    // Create a glossy glass material
    this.material = new THREE.MeshPhysicalMaterial({
      color: 0xffd700, // Gold color
      metalness: 1.0, // Increased from 0.9 for maximum metallic look
      roughness: 0.05, // Decreased from 0.1 for more shininess
      transmission: 0.0, // No transmission for solid gold look
      thickness: 0.5,
      envMapIntensity: 2.0, // Increased from 1.0 for stronger reflections
      clearcoat: 1.0, // Full clearcoat for extra shine
      clearcoatRoughness: 0.05, // Decreased from 0.1 for smoother clearcoat
      emissive: 0xffd700, // Gold emissive glow
      emissiveIntensity: 0.3, // Increased from 0.2 for stronger glow
      specularIntensity: 1.0, // Added for stronger specular highlights
      specularColor: 0xffffff, // White specular highlights
      reflectivity: 1.0 // Maximum reflectivity
    });

    // Create text geometry
    const loader = new FontLoader();
    const text = "Happy Birthday!";

    // Load the font and create text geometry
    // https://threejs.org/examples/fonts/helvetiker_regular.typeface.json
    loader.load('threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font: Font) => {
      const geometry = new TextGeometry(text, {
        font: font,
        size: 15,
        height: 3,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.05,
        bevelOffset: 0,
        bevelSegments: 5
      });

      geometry.center();

      this.textMesh = new THREE.Mesh(geometry, this.material);
      this.textMesh.position.set(0, 0, 0);
      this.textMesh.rotation.y = Math.PI / 2;

      // Notify that the text is ready
      if (this.onTextReady && this.textMesh) {
        this.onTextReady(this.textMesh);
      }
    });
  }

  update(time: number): void {
    if (this.textMesh) {
      this.textMesh.rotation.x = Math.sin(time * 0.0005) * 0.2;
    }
  }
}
