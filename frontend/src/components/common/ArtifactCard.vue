<template>
  <article class="artifact-card" :class="{ active, compact }" @click="$emit('open', artifact.id)">
    <div class="artifact-image">
      <img v-if="artifact.images[0]" :src="artifact.images[0]" :alt="artifact.name" />
      <div v-else class="artifact-empty">{{ artifact.name.slice(0, 1) }}</div>
    </div>
    <div class="artifact-body">
      <div class="artifact-kicker">{{ craftCategoryLabels[artifact.category] }} · {{ artifact.year }}</div>
      <h3>{{ artifact.name }}</h3>
      <p>{{ artifact.author }} / {{ artifact.material }}</p>
    </div>
    <div v-if="selectable || removable" class="artifact-actions" @click.stop>
      <n-button v-if="selectable" size="small" secondary @click="$emit('select', artifact.id)">
        选入
      </n-button>
      <n-button v-if="removable" size="small" quaternary type="error" @click="$emit('delete', artifact.id)">
        删除
      </n-button>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Artifact } from '@/types';
import { craftCategoryLabels } from '@/types';

withDefaults(
  defineProps<{
    artifact: Artifact;
    active?: boolean;
    compact?: boolean;
    selectable?: boolean;
    removable?: boolean;
  }>(),
  {
    active: false,
    compact: false,
    selectable: false,
    removable: false
  }
);

defineEmits<{
  open: [id: string];
  select: [id: string];
  delete: [id: string];
}>();
</script>

<style scoped>
.artifact-card {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
  min-width: 0;
  padding: 10px;
  color: var(--museum-ink);
  background: rgba(250, 246, 236, 0.78);
  border: 1px solid rgba(23, 63, 53, 0.14);
  border-radius: 8px;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.artifact-card:hover,
.artifact-card.active {
  transform: translateY(-2px);
  border-color: rgba(157, 123, 54, 0.7);
  background: #fbf5e8;
}

.artifact-card.compact {
  grid-template-columns: 72px minmax(0, 1fr);
  padding: 8px;
}

.artifact-image {
  overflow: hidden;
  aspect-ratio: 1;
  background: #d9c9a9;
  border-radius: 6px;
}

.artifact-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.artifact-empty {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #173f35;
  font-family: var(--font-display);
  font-size: 36px;
}

.artifact-body {
  min-width: 0;
}

.artifact-kicker {
  color: var(--museum-brass);
  font-size: 12px;
  font-weight: 700;
}

h3 {
  margin: 4px 0 6px;
  overflow: hidden;
  color: var(--museum-ink);
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: rgba(31, 46, 41, 0.7);
  font-size: 13px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.artifact-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
