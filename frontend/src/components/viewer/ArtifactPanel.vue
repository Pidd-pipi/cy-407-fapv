<template>
  <transition name="panel">
    <div v-if="artifact" class="artifact-panel">
      <button type="button" class="panel-close" @click="$emit('close')">×</button>
      <InfoPanel :artifact="artifact" :annotations="annotations" />
      <RouterLink class="detail-link" :to="`/artifacts/${artifact.id}`">打开 360° 详情</RouterLink>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import InfoPanel from '@/components/common/InfoPanel.vue';
import type { Annotation, Artifact } from '@/types';

defineProps<{
  artifact?: Artifact;
  annotations: Annotation[];
}>();

defineEmits<{
  close: [];
}>();
</script>

<style scoped>
.artifact-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: min(390px, calc(100% - 40px));
  pointer-events: auto;
}

.panel-close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  width: 30px;
  height: 30px;
  color: var(--museum-ink);
  background: #efe5d1;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
}

.detail-link {
  display: block;
  margin-top: 8px;
  padding: 12px 14px;
  color: #fbf5e8;
  text-align: center;
  text-decoration: none;
  background: var(--museum-green);
  border-radius: 6px;
}

.panel-enter-active,
.panel-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

@media (max-width: 760px) {
  .artifact-panel {
    top: auto;
    right: 12px;
    bottom: 12px;
    width: calc(100% - 24px);
  }
}
</style>
