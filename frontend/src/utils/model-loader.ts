import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Artifact } from '@/types';

const loader = new GLTFLoader();

export async function loadArtifactObject(artifact: Artifact): Promise<THREE.Object3D> {
  if (artifact.modelUrl) {
    try {
      const gltf = await loader.loadAsync(artifact.modelUrl);
      normalizeObject(gltf.scene);
      gltf.scene.userData.artifactId = artifact.id;
      return gltf.scene;
    } catch (error) {
      console.warn(`模型加载失败，使用展板替代：${artifact.name}`, error);
    }
  }

  return createArtifactFallback(artifact);
}

export function createArtifactFallback(artifact: Artifact): THREE.Group {
  const group = new THREE.Group();
  group.name = artifact.name;
  group.userData.artifactId = artifact.id;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.05, 0.22, 40),
    new THREE.MeshStandardMaterial({ color: '#c9b37b', roughness: 0.72, metalness: 0.16 })
  );
  base.position.y = -0.95;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 1.6, 0.16),
    new THREE.MeshStandardMaterial({
      color: '#f2ead8',
      roughness: 0.86,
      metalness: 0.02
    })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.75, 0.08),
    new THREE.MeshStandardMaterial({ color: '#173f35', roughness: 0.6, metalness: 0.08 })
  );
  frame.position.z = -0.08;
  group.add(frame);

  const imageUrl = artifact.images[0];
  if (imageUrl) {
    new THREE.TextureLoader().load(imageUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const imagePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.18, 1.38),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      imagePlane.position.z = 0.091;
      group.add(imagePlane);
    });
  }

  return group;
}

export function createGalleryHall(themeColor = '#173f35'): THREE.Group {
  const hall = new THREE.Group();
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#dfd2b8', roughness: 0.92 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#f6efe2', roughness: 0.88 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: themeColor, roughness: 0.64 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.1;
  floor.receiveShadow = true;
  hall.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 0.18), wallMaterial);
  backWall.position.set(0, 1.3, -7.2);
  backWall.receiveShadow = true;
  hall.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5, 14), wallMaterial);
  leftWall.position.set(-8.2, 1.3, -0.2);
  hall.add(leftWall);

  const rightWall = leftWall.clone();
  rightWall.position.x = 8.2;
  hall.add(rightWall);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(18, 0.16, 0.22), accentMaterial);
  stripe.position.set(0, 2.92, -7.04);
  hall.add(stripe);

  return hall;
}

export function normalizeObject(object: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z, 0.1);
  object.scale.multiplyScalar(2 / maxAxis);

  const centeredBox = new THREE.Box3().setFromObject(object);
  const center = centeredBox.getCenter(new THREE.Vector3());
  object.position.sub(center);
  object.position.y += 0.1;
}
