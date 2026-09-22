<template>
  <div class="camera-controls" aria-label="相机视角控制">
    <n-tooltip trigger="hover">
      <template #trigger>
        <n-button circle secondary @click="$emit('view', 'front')">正</n-button>
      </template>
      正面视角
    </n-tooltip>
    <n-tooltip trigger="hover">
      <template #trigger>
        <n-button circle secondary @click="$emit('view', 'side')">侧</n-button>
      </template>
      侧面视角
    </n-tooltip>
    <n-tooltip trigger="hover">
      <template #trigger>
        <n-button circle secondary @click="$emit('view', 'top')">俯</n-button>
      </template>
      俯视角
    </n-tooltip>
    <n-tooltip trigger="hover">
      <template #trigger>
        <n-button circle type="primary" @click="$emit('view', 'reset')">归</n-button>
      </template>
      重置视角
    </n-tooltip>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  view: [mode: 'front' | 'side' | 'top' | 'reset'];
}>();
</script>

<style scoped>
.camera-controls {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  gap: 8px;
  pointer-events: auto;
}
</style>
