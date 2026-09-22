<template>
  <section class="file-uploader">
    <div>
      <h3>{{ title }}</h3>
      <p>{{ hint }}</p>
    </div>
    <div class="upload-actions">
      <n-button secondary @click="imageInput?.click()">选择图片</n-button>
      <n-button secondary @click="modelInput?.click()">选择 GLB/GLTF</n-button>
      <n-button type="primary" :disabled="!hasFiles" @click="emitFiles">保存文件</n-button>
    </div>
    <div v-if="imageFiles.length || modelFile" class="file-list">
      <n-tag v-for="file in imageFiles" :key="file.name" size="small" type="success">
        {{ file.name }}
      </n-tag>
      <n-tag v-if="modelFile" size="small" type="warning">{{ modelFile.name }}</n-tag>
    </div>
    <input ref="imageInput" type="file" accept="image/*" multiple hidden @change="onImages" />
    <input ref="modelInput" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" hidden @change="onModel" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

withDefaults(
  defineProps<{
    title?: string;
    hint?: string;
  }>(),
  {
    title: '本地文件',
    hint: '图片和 3D 模型只写入浏览器 IndexedDB，不上传服务器。'
  }
);

const emit = defineEmits<{
  upload: [payload: { images: File[]; model?: File }];
}>();

const imageInput = ref<HTMLInputElement | null>(null);
const modelInput = ref<HTMLInputElement | null>(null);
const imageFiles = ref<File[]>([]);
const modelFile = ref<File | undefined>();
const hasFiles = computed(() => imageFiles.value.length > 0 || Boolean(modelFile.value));

function onImages(event: Event) {
  const input = event.target as HTMLInputElement;
  imageFiles.value = Array.from(input.files ?? []);
}

function onModel(event: Event) {
  const input = event.target as HTMLInputElement;
  modelFile.value = input.files?.[0];
}

function emitFiles() {
  emit('upload', { images: imageFiles.value, model: modelFile.value });
  imageFiles.value = [];
  modelFile.value = undefined;
  if (imageInput.value) imageInput.value.value = '';
  if (modelInput.value) modelInput.value.value = '';
}
</script>

<style scoped>
.file-uploader {
  display: grid;
  gap: 14px;
  padding: 16px;
  background: color-mix(in oklch, var(--museum-paper), #173f35 5%);
  border: 1px dashed rgba(23, 63, 53, 0.34);
  border-radius: 8px;
}

h3,
p {
  margin: 0;
}

h3 {
  font-size: 16px;
}

p {
  color: rgba(31, 46, 41, 0.64);
  font-size: 13px;
}

.upload-actions,
.file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
