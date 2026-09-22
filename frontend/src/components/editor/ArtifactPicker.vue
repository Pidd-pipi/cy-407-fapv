<template>
  <section class="artifact-picker">
    <header>
      <h3>展品顺序</h3>
      <small>勾选展品后可用上下按钮调整展线。</small>
    </header>
    <div class="picker-list">
      <div v-for="artifact in orderedArtifacts" :key="artifact.id" class="picker-row">
        <n-checkbox :checked="selectedSet.has(artifact.id)" @update:checked="toggle(artifact.id, $event)">
          {{ artifact.name }}
        </n-checkbox>
        <span>{{ craftCategoryLabels[artifact.category] }}</span>
        <div class="row-actions">
          <n-button size="tiny" quaternary :disabled="!selectedSet.has(artifact.id)" @click="move(artifact.id, -1)">
            上移
          </n-button>
          <n-button size="tiny" quaternary :disabled="!selectedSet.has(artifact.id)" @click="move(artifact.id, 1)">
            下移
          </n-button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Artifact } from '@/types';
import { craftCategoryLabels } from '@/types';

const props = defineProps<{
  artifacts: Artifact[];
  modelValue: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [ids: string[]];
}>();

const selectedSet = computed(() => new Set(props.modelValue));
const orderedArtifacts = computed(() => {
  const byId = new Map(props.artifacts.map((artifact) => [artifact.id, artifact]));
  const selected = props.modelValue.map((id) => byId.get(id)).filter((artifact): artifact is Artifact => Boolean(artifact));
  const rest = props.artifacts.filter((artifact) => !selectedSet.value.has(artifact.id));
  return [...selected, ...rest];
});

function toggle(id: string, checked: boolean) {
  const next = checked ? [...props.modelValue, id] : props.modelValue.filter((artifactId) => artifactId !== id);
  emit('update:modelValue', Array.from(new Set(next)));
}

function move(id: string, direction: -1 | 1) {
  const index = props.modelValue.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= props.modelValue.length) return;
  const next = [...props.modelValue];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  emit('update:modelValue', next);
}
</script>

<style scoped>
.artifact-picker {
  display: grid;
  gap: 12px;
}

header h3,
header small {
  margin: 0;
}

header small {
  color: rgba(31, 46, 41, 0.62);
}

.picker-list {
  display: grid;
  gap: 8px;
}

.picker-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 10px;
  background: rgba(250, 246, 236, 0.74);
  border: 1px solid rgba(23, 63, 53, 0.12);
  border-radius: 6px;
}

.picker-row span {
  color: var(--museum-brass);
  font-size: 12px;
  font-weight: 800;
}

.row-actions {
  display: flex;
  gap: 4px;
}

@media (max-width: 680px) {
  .picker-row {
    grid-template-columns: 1fr;
  }
}
</style>
