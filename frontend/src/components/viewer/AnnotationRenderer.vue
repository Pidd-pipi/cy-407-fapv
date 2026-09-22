<template>
  <div class="annotation-layer">
    <button
      v-for="annotation in annotations"
      :key="annotation.id"
      type="button"
      class="annotation-pin"
      :class="annotation.iconType"
      :style="pinStyle(annotation)"
      @click="$emit('select', annotation.id)"
    >
      <span>{{ iconMap[annotation.iconType] }}</span>
      <strong>{{ annotation.title }}</strong>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Annotation } from '@/types';

defineProps<{
  annotations: Annotation[];
}>();

defineEmits<{
  select: [id: string];
}>();

const iconMap = {
  detail: '细',
  material: '材',
  history: '史',
  technique: '工'
};

function pinStyle(annotation: Annotation) {
  return {
    left: `${50 + annotation.position.x * 28}%`,
    top: `${50 - annotation.position.y * 30}%`
  };
}
</script>

<style scoped>
.annotation-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.annotation-pin {
  position: absolute;
  display: inline-flex;
  align-items: center;
  max-width: min(240px, 42vw);
  gap: 8px;
  padding: 6px 9px 6px 6px;
  color: #173f35;
  background: rgba(251, 245, 232, 0.92);
  border: 1px solid rgba(157, 123, 54, 0.42);
  border-radius: 999px;
  box-shadow: 0 14px 28px rgba(31, 46, 41, 0.14);
  cursor: pointer;
  pointer-events: auto;
  transform: translate(-50%, -50%);
}

.annotation-pin span {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  color: #fbf5e8;
  background: #bb4d3e;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 800;
}

.annotation-pin.material span {
  background: #9d7b36;
}

.annotation-pin.history span {
  background: #3f5f96;
}

.annotation-pin.technique span {
  background: #173f35;
}

.annotation-pin strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
