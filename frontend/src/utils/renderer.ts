import * as THREE from 'three';

let renderer: THREE.WebGLRenderer | null = null;
let currentContainer: HTMLElement | null = null;

export function acquireRenderer(container: HTMLElement): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  if (currentContainer !== container) {
    renderer.domElement.remove();
    container.appendChild(renderer.domElement);
    currentContainer = container;
  }

  return renderer;
}

export function resizeRendererToContainer(
  activeRenderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  container: HTMLElement
): void {
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  activeRenderer.setSize(width, height, false);
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = mesh.material;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    materials.forEach((entry) => {
      for (const value of Object.values(entry)) {
        if (value instanceof THREE.Texture) {
          value.dispose();
        }
      }
      entry.dispose();
    });
  });
}

export function releaseRenderer(container: HTMLElement): void {
  if (renderer?.domElement.parentElement === container) {
    renderer.domElement.remove();
  }
  if (currentContainer === container) {
    currentContainer = null;
  }
}

export function disposeRenderer(): void {
  if (!renderer) return;
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
  renderer = null;
  currentContainer = null;
}
