<template>
  <section class="manage-page">
    <div class="page-head">
      <div>
        <h1>展览管理</h1>
        <p>创建展览、调整展品顺序、设置主题色并发布到 3D 展厅。</p>
      </div>
      <n-button type="primary" @click="startCreate">新建展览</n-button>
    </div>

    <div class="manage-grid">
      <section class="exhibition-list">
        <ExhibitionCard
          v-for="item in exhibitionStore.exhibitions"
          :key="item.id"
          :exhibition="item"
          :artifact-count="item.artifactIds.length"
          @open="router.push(`/exhibitions/${$event}`)"
          @edit="selectExhibition"
        />
      </section>

      <section class="panel-surface editor-panel">
        <header>
          <h2>{{ isCreating ? '创建展览' : '编辑展览' }}</h2>
          <n-button v-if="selectedId" quaternary type="error" @click="deleteSelected">删除</n-button>
        </header>
        <n-form label-placement="top" :show-feedback="false" class="form-stack">
          <n-form-item label="标题">
            <n-input v-model:value="draft.title" placeholder="展览标题" />
          </n-form-item>
          <n-form-item label="简介">
            <n-input v-model:value="draft.intro" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" />
          </n-form-item>
          <div class="field-grid">
            <n-form-item label="策展人">
              <n-input v-model:value="draft.curator" />
            </n-form-item>
            <n-form-item label="状态">
              <n-select v-model:value="draft.status" :options="statusOptions" />
            </n-form-item>
          </div>
          <div class="field-grid">
            <n-form-item label="展厅主题色">
              <n-color-picker v-model:value="draft.themeColor" :show-alpha="false" />
            </n-form-item>
            <n-form-item label="背景音乐 URL">
              <n-input v-model:value="draft.backgroundMusicUrl" placeholder="可选" />
            </n-form-item>
          </div>
          <ArtifactPicker v-model="draft.artifactIds" :artifacts="artifactStore.artifacts" />
          <section class="picked-artifacts">
            <h3>已选展品预览</h3>
            <ArtifactCard
              v-for="artifact in pickedArtifacts"
              :key="artifact.id"
              :artifact="artifact"
              compact
              @open="router.push(`/artifacts/${$event}`)"
            />
          </section>
          <div class="form-actions">
            <n-button type="primary" @click="saveExhibition">{{ isCreating ? '创建' : '保存' }}</n-button>
            <n-button v-if="selectedId" secondary @click="publishSelected">发布</n-button>
          </div>
        </n-form>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import ArtifactPicker from '@/components/editor/ArtifactPicker.vue';
import ArtifactCard from '@/components/common/ArtifactCard.vue';
import ExhibitionCard from '@/components/common/ExhibitionCard.vue';
import { useArtifactStore } from '@/stores/artifact';
import { useExhibitionStore } from '@/stores/exhibition';
import type { Artifact, ExhibitionDraft } from '@/types';
import { ExhibitionStatus, exhibitionStatusLabels } from '@/types';

const router = useRouter();
const message = useMessage();
const artifactStore = useArtifactStore();
const exhibitionStore = useExhibitionStore();

const selectedId = ref(exhibitionStore.exhibitions[0]?.id ?? '');
const isCreating = ref(false);
const draft = reactive<ExhibitionDraft>(emptyDraft());

const selected = computed(() => exhibitionStore.getById(selectedId.value));
const pickedArtifacts = computed<Artifact[]>(() =>
  draft.artifactIds.map((id) => artifactStore.getById(id)).filter((artifact): artifact is Artifact => Boolean(artifact))
);
const statusOptions = Object.values(ExhibitionStatus).map((value) => ({ label: exhibitionStatusLabels[value], value }));

watch(
  selected,
  (value) => {
    if (!value || isCreating.value) return;
    Object.assign(draft, {
      title: value.title,
      intro: value.intro,
      curator: value.curator,
      artifactIds: [...value.artifactIds],
      themeColor: value.themeColor,
      backgroundMusicUrl: value.backgroundMusicUrl ?? '',
      status: value.status
    });
  },
  { immediate: true }
);

function emptyDraft(): ExhibitionDraft {
  return {
    title: '',
    intro: '',
    curator: '',
    artifactIds: artifactStore.artifacts.map((artifact) => artifact.id),
    themeColor: '#173f35',
    backgroundMusicUrl: '',
    status: ExhibitionStatus.Draft
  };
}

function startCreate() {
  isCreating.value = true;
  selectedId.value = '';
  Object.assign(draft, emptyDraft());
}

function selectExhibition(id: string) {
  isCreating.value = false;
  selectedId.value = id;
}

async function saveExhibition() {
  if (!draft.title.trim()) {
    message.warning('请填写展览标题');
    return;
  }
  if (isCreating.value) {
    const created = await exhibitionStore.createExhibition({ ...draft, artifactIds: [...draft.artifactIds] });
    selectedId.value = created.id;
    isCreating.value = false;
    message.success('展览已创建');
    return;
  }
  if (selectedId.value) {
    await exhibitionStore.updateExhibition(selectedId.value, { ...draft, artifactIds: [...draft.artifactIds] });
    message.success('展览已保存');
  }
}

async function publishSelected() {
  if (!selectedId.value) return;
  await exhibitionStore.publishExhibition(selectedId.value);
  message.success('展览已发布');
}

async function deleteSelected() {
  if (!selectedId.value) return;
  await exhibitionStore.deleteExhibition(selectedId.value);
  selectedId.value = exhibitionStore.exhibitions[0]?.id ?? '';
  isCreating.value = !selectedId.value;
  Object.assign(draft, selected.value ?? emptyDraft());
  message.success('展览已删除');
}
</script>

<style scoped>
.manage-page {
  display: grid;
  gap: 18px;
}

.manage-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(420px, 1.1fr);
  gap: 18px;
  align-items: start;
}

.exhibition-list {
  display: grid;
  gap: 14px;
}

.editor-panel {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.editor-panel header,
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.picked-artifacts {
  display: grid;
  gap: 10px;
}

.picked-artifacts h3 {
  margin: 0;
  font-size: 15px;
}

.editor-panel h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 30px;
}

.form-stack {
  display: grid;
  gap: 10px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1080px) {
  .manage-grid,
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
