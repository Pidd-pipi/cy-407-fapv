import * as THREE from 'three';
import type { TourNode } from '@/types';

export interface TourPlayerControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  isPlaying: () => boolean;
  currentNodeIndex: () => number;
}

export function createTourPlayer(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void },
  nodes: TourNode[],
  onNodeChange?: (node: TourNode, index: number) => void
): TourPlayerControls {
  let raf = 0;
  let playing = false;
  let startedAt = 0;
  let index = 0;
  const startPosition = new THREE.Vector3();
  const startTarget = new THREE.Vector3();

  const animate = (now: number) => {
    if (!playing || nodes.length === 0) return;
    const node = nodes[index];
    const duration = Math.max(node.transitionMs, 300);
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);

    camera.position.lerpVectors(
      startPosition,
      new THREE.Vector3(node.cameraPosition.x, node.cameraPosition.y, node.cameraPosition.z),
      eased
    );
    controls.target.lerpVectors(
      startTarget,
      new THREE.Vector3(node.targetPosition.x, node.targetPosition.y, node.targetPosition.z),
      eased
    );
    controls.update();

    if (progress >= 1) {
      index = (index + 1) % nodes.length;
      startedAt = now;
      startPosition.copy(camera.position);
      startTarget.copy(controls.target);
      onNodeChange?.(nodes[index], index);
    }

    raf = requestAnimationFrame(animate);
  };

  return {
    play() {
      if (playing || nodes.length === 0) return;
      playing = true;
      startedAt = performance.now();
      startPosition.copy(camera.position);
      startTarget.copy(controls.target);
      onNodeChange?.(nodes[index], index);
      raf = requestAnimationFrame(animate);
    },
    pause() {
      playing = false;
      cancelAnimationFrame(raf);
    },
    stop() {
      playing = false;
      cancelAnimationFrame(raf);
      index = 0;
    },
    isPlaying: () => playing,
    currentNodeIndex: () => index
  };
}
