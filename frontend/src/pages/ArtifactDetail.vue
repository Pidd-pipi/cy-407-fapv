<template>
  <section v-if="artifact" class="detail-page">
    <div class="page-head">
      <div>
        <h1>{{ artifact.name }}</h1>
        <p>独立模型查看器支持 360° 旋转、缩放和标注定位，适合讲解工艺细节。</p>
      </div>
      <RouterLink class="back-link" to="/">返回展厅</RouterLink>
    </div>

    <div class="detail-grid">
      <ModelViewer :artifact="artifact" :annotations="annotations" @annotation-select="selectedAnnotationId = $event" />
      <div class="detail-side">
        <InfoPanel :artifact="artifact" :annotations="annotations" @annotation-click="selectedAnnotationId = $event" />
        <section class="panel-surface annotation-editor">
          <header>
            <h3>添加 3D 标注</h3>
            <small>坐标以模型中心为原点</small>
          </header>
          <div class="axis-grid">
            <n-input-number v-model:value="draft.position.x" size="small" :step="0.1" placeholder="X" />
            <n-input-number v-model:value="draft.position.y" size="small" :step="0.1" placeholder="Y" />
            <n-input-number v-model:value="draft.position.z" size="small" :step="0.1" placeholder="Z" />
          </div>
          <n-input v-model:value="draft.title" placeholder="标注标题" />
          <n-input v-model:value="draft.content" type="textarea" placeholder="讲解内容" :autosize="{ minRows: 3, maxRows: 5 }" />
          <n-select v-model:value="draft.iconType" :options="iconOptions" />
          <n-button type="primary" @click="addAnnotation">保存标注</n-button>
          <n-alert v-if="selectedAnnotation" type="info" :bordered="false">
            当前选中：{{ selectedAnnotation.title }}
            <template #action>
              <n-button quaternary type="error" size="small" @click="annotationStore.deleteAnnotation(selectedAnnotation.id)">
                删除
              </n-button>
            </template>
          </n-alert>
        </section>
      </div>
    </div>
  </section>
  <n-result v-else status="404" title="展品不存在" description="请在展品库中选择已有展品。" />
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';
import InfoPanel from '@/components/common/InfoPanel.vue';
import ModelViewer from '@/components/viewer/ModelViewer.vue';
import { useAnnotationStore } from '@/stores/annotation';
import { useArtifactStore } from '@/stores/artifact';
import type { AnnotationDraft, AnnotationIcon } from '@/types';

const route = useRoute();
const message = useMessage();
const artifactStore = useArtifactStore();
const annotationStore = useAnnotationStore();
const selectedAnnotationId = ref('');

const artifact = computed(() => artifactStore.getById(String(route.params.id ?? '')));
const annotations = computed(() => (artifact.value ? annotationStore.byArtifactId(artifact.value.id) : []));
const selectedAnnotation = computed(() => annotations.value.find((annotation) => annotation.id === selectedAnnotationId.value));

const draft = reactive<AnnotationDraft>({
  artifactId: '',
  position: { x: 0.1, y: 0.2, z: 0.35 },
  title: '',
  content: '',
  iconType: 'detail'
});

const iconOptions: { label: string; value: AnnotationIcon }[] = [
  { label: '细节', value: 'detail' },
  { label: '材质', value: 'material' },
  { label: '历史', value: 'history' },
  { label: '工艺', value: 'technique' }
];

async function addAnnotation() {
  if (!artifact.value || !draft.title.trim()) {
    message.warning('请填写标注标题');
    return;
  }
  await annotationStore.addAnnotation({
    artifactId: artifact.value.id,
    position: { ...draft.position },
    title: draft.title,
    content: draft.content,
    iconType: draft.iconType
  });
  draft.title = '';
  draft.content = '';
  message.success('标注已保存到 IndexedDB');
}
</script>

<style scoped>
.detail-page {
  display: grid;
  gap: 20px;
}

.back-link {
  padding: 10px 14px;
  color: #fbf5e8;
  text-decoration: none;
  background: var(--museum-green);
  border-radius: 6px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.55fr);
  gap: 18px;
  align-items: start;
}

.detail-side {
  display: grid;
  gap: 14px;
}

.annotation-editor {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.annotation-editor header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.annotation-editor h3,
.annotation-editor small {
  margin: 0;
}

.annotation-editor small {
  color: rgba(31, 46, 41, 0.6);
}

.axis-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 1080px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
