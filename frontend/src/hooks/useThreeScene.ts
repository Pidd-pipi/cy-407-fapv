import { nextTick, onBeforeUnmount, shallowRef, watch, type Ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  acquireRenderer,
  disposeObject3D,
  disposeRenderer,
  releaseRenderer,
  resizeRendererToContainer
} from '@/utils/renderer';

export interface UseThreeSceneOptions {
  cameraPosition?: THREE.Vector3Tuple;
  clearColor?: string;
}

export function useThreeScene(containerRef: Ref<HTMLElement | null>, options: UseThreeSceneOptions = {}) {
  const scene = shallowRef<THREE.Scene | null>(null);
  const camera = shallowRef<THREE.PerspectiveCamera | null>(null);
  const renderer = shallowRef<THREE.WebGLRenderer | null>(null);
  const controls = shallowRef<OrbitControls | null>(null);
  const ready = shallowRef(false);

  let frameId = 0;
  let resizeObserver: ResizeObserver | null = null;
  const callbacks = new Set<(deltaMs: number) => void>();
  let lastTime = 0;

  const render = () => {
    if (!scene.value || !camera.value || !renderer.value) return;
    renderer.value.render(scene.value, camera.value);
  };

  const loop = (time: number) => {
    const delta = lastTime ? time - lastTime : 16;
    lastTime = time;
    callbacks.forEach((callback) => callback(delta));
    controls.value?.update();
    render();
    frameId = requestAnimationFrame(loop);
  };

  const setup = async () => {
    await nextTick();
    const container = containerRef.value;
    if (!container || ready.value) return;

    const activeRenderer = acquireRenderer(container);
    const activeScene = new THREE.Scene();
    activeScene.background = new THREE.Color(options.clearColor ?? '#efe5d1');
    activeScene.fog = new THREE.Fog('#efe5d1', 12, 28);

    const activeCamera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    activeCamera.position.fromArray(options.cameraPosition ?? [4, 3.2, 6]);

    const activeControls = new OrbitControls(activeCamera, activeRenderer.domElement);
    activeControls.enableDamping = true;
    activeControls.dampingFactor = 0.08;
    activeControls.minDistance = 2.2;
    activeControls.maxDistance = 16;
    activeControls.maxPolarAngle = Math.PI * 0.49;

    activeScene.add(new THREE.HemisphereLight('#fff4dd', '#31524a', 1.8));
    const keyLight = new THREE.DirectionalLight('#fff0cc', 2.2);
    keyLight.position.set(4, 7, 3);
    keyLight.castShadow = true;
    activeScene.add(keyLight);

    resizeRendererToContainer(activeRenderer, activeCamera, container);
    resizeObserver = new ResizeObserver(() => resizeRendererToContainer(activeRenderer, activeCamera, container));
    resizeObserver.observe(container);

    scene.value = activeScene;
    camera.value = activeCamera;
    renderer.value = activeRenderer;
    controls.value = activeControls;
    ready.value = true;
    frameId = requestAnimationFrame(loop);
  };

  const setCameraView = (position: THREE.Vector3Tuple, target: THREE.Vector3Tuple = [0, 0, 0]) => {
    if (!camera.value || !controls.value) return;
    camera.value.position.fromArray(position);
    controls.value.target.fromArray(target);
    controls.value.update();
    render();
  };

  const addFrameCallback = (callback: (deltaMs: number) => void) => {
    callbacks.add(callback);
    return () => callbacks.delete(callback);
  };

  const dispose = () => {
    cancelAnimationFrame(frameId);
    resizeObserver?.disconnect();
    controls.value?.dispose();
    if (scene.value) {
      disposeObject3D(scene.value);
      scene.value.clear();
    }
    if (containerRef.value) {
      releaseRenderer(containerRef.value);
    }
    disposeRenderer();
    scene.value = null;
    camera.value = null;
    renderer.value = null;
    controls.value = null;
    ready.value = false;
  };

  watch(containerRef, setup, { flush: 'post' });
  void setup();
  onBeforeUnmount(dispose);

  return {
    scene,
    camera,
    renderer,
    controls,
    ready,
    render,
    setCameraView,
    addFrameCallback,
    dispose
  };
}
