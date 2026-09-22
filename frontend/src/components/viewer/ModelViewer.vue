<template>
  <SceneCanvas class="model-viewer" @ready="containerRef = $event">
    <div class="viewer-title">
      <span>360° 模型查看</span>
      <strong>{{ artifact.name }}</strong>
    </div>
    <AnnotationRenderer :annotations="annotations" @select="$emit('annotation-select', $event)" />
    <CameraControls @view="setView" />
  </SceneCanvas>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import * as THREE from 'three';
import SceneCanvas from '@/components/common/SceneCanvas.vue';
import AnnotationRenderer from '@/components/viewer/AnnotationRenderer.vue';
import CameraControls from '@/components/viewer/CameraControls.vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import type { Annotation, Artifact } from '@/types';
import { loadArtifactObject } from '@/utils/model-loader';
import { disposeObject3D } from '@/utils/renderer';

const props = withDefaults(
  defineProps<{
    artifact: Artifact;
    annotations?: Annotation[];
    autoRotate?: boolean;
  }>(),
  {
    annotations: () => [],
    autoRotate: true
  }
);

defineEmits<{
  'annotation-select': [id: string];
}>();

const containerRef = ref<HTMLElement | null>(null);
const three = useThreeScene(containerRef, { cameraPosition: [3.8, 2.6, 5.2] });
let currentObject: THREE.Object3D | null = null;
let loadToken = 0;
let stopFrame: (() => void) | undefined;

watch(
  () => [three.ready.value, props.artifact.id] as const,
  async ([ready]) => {
    if (!ready || !three.scene.value) return;
    const token = ++loadToken;
    if (currentObject) {
      three.scene.value.remove(currentObject);
      disposeObject3D(currentObject);
      currentObject = null;
    }

    const object = await loadArtifactObject(props.artifact);
    if (token !== loadToken || !three.scene.value) {
      disposeObject3D(object);
      return;
    }

    object.position.y = 0;
    currentObject = object;
    three.scene.value.add(object);
    three.setCameraView([3.8, 2.6, 5.2], [0, 0, 0]);
  },
  { immediate: true }
);

watch(
  () => three.ready.value,
  (ready) => {
    if (!ready || stopFrame) return;
    stopFrame = three.addFrameCallback((delta) => {
      if (props.autoRotate && currentObject) {
        currentObject.rotation.y += delta * 0.00022;
      }
    });
  },
  { immediate: true }
);

function setView(mode: 'front' | 'side' | 'top' | 'reset') {
  const views = {
    front: [0, 1.6, 5.6] as THREE.Vector3Tuple,
    side: [5.4, 1.7, 0] as THREE.Vector3Tuple,
    top: [0.1, 6.2, 0.1] as THREE.Vector3Tuple,
    reset: [3.8, 2.6, 5.2] as THREE.Vector3Tuple
  };
  three.setCameraView(views[mode], [0, 0, 0]);
}

onBeforeUnmount(() => {
  stopFrame?.();
});
</script>

<style scoped>
.model-viewer {
  min-height: 620px;
}

.viewer-title {
  position: absolute;
  top: 16px;
  left: 16px;
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  color: var(--museum-ink);
  background: rgba(251, 245, 232, 0.88);
  border: 1px solid rgba(23, 63, 53, 0.14);
  border-radius: 8px;
}

.viewer-title span {
  color: var(--museum-brass);
  font-size: 12px;
  font-weight: 800;
}

.viewer-title strong {
  font-family: var(--font-display);
  font-size: 18px;
}
</style>
