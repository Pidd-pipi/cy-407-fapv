<template>
  <section class="scene-shell">
    <div ref="containerEl" class="scene-canvas" />
    <div class="scene-overlay">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const emit = defineEmits<{
  ready: [element: HTMLElement];
}>();

const containerEl = ref<HTMLElement | null>(null);

onMounted(() => {
  if (containerEl.value) {
    emit('ready', containerEl.value);
  }
});
</script>

<style scoped>
.scene-shell {
  position: relative;
  min-height: 520px;
  overflow: hidden;
  background:
    linear-gradient(145deg, color-mix(in oklch, var(--museum-cream), #173f35 6%), transparent),
    var(--museum-paper);
  border: 1px solid rgba(23, 63, 53, 0.18);
  border-radius: 8px;
}

.scene-canvas {
  position: absolute;
  inset: 0;
}

.scene-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
}

.scene-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scene-overlay :deep(*) {
  pointer-events: auto;
}

@media (max-width: 760px) {
  .scene-shell {
    min-height: 420px;
  }
}
</style>
