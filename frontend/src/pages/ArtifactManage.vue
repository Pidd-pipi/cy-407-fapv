<template>
  <section class="artifact-manage">
    <div class="page-head">
      <div>
        <h1>展品库</h1>
        <p>维护展品资料并上传本地图片或 GLB/GLTF 模型文件，文件会以 Blob 形式保存在 IndexedDB。</p>
      </div>
      <div class="library-actions">
        <n-radio-group v-model:value="viewMode" size="small">
          <n-radio-button value="grid">网格</n-radio-button>
          <n-radio-button value="list">列表</n-radio-button>
        </n-radio-group>
        <n-button type="primary" @click="startCreate">新增展品</n-button>
      </div>
    </div>

    <div v-if="removalStore.latestSnapshot" class="undo-banner" role="status">
      <div class="undo-info">
        <strong>最近一次移出：{{ removalStore.latestSnapshot.artifact.name }}</strong>
        <span>{{ removalSummary }} · {{ removedAtText }}</span>
        <span class="undo-hint">展品资料及关联关系已保存，可连同原有顺序一起还原。</span>
      </div>
      <div class="undo-actions">
        <n-button type="primary" size="small" :loading="restoring" @click="undoRemoval">撤销移出</n-button>
        <n-button quaternary size="small" :disabled="restoring" @click="confirmDiscard">不再保留</n-button>
      </div>
    </div>

    <div class="library-grid">
      <section class="artifact-list" :class="viewMode">
        <ArtifactCard
          v-for="artifact in artifactStore.artifacts"
          :key="artifact.id"
          :artifact="artifact"
          :active="artifact.id === selectedId"
          :compact="viewMode === 'list'"
          removable
          @open="selectArtifact"
          @delete="deleteArtifact"
        />
      </section>

      <section class="panel-surface artifact-editor">
        <header>
          <h2>{{ isCreating ? '新增展品' : '编辑展品' }}</h2>
          <n-button v-if="selectedId" secondary @click="router.push(`/artifacts/${selectedId}`)">查看详情</n-button>
        </header>
        <n-form label-placement="top" :show-feedback="false" class="form-stack">
          <n-form-item label="名称">
            <n-input v-model:value="draft.name" placeholder="展品名称" />
          </n-form-item>
          <n-form-item label="描述">
            <n-input v-model:value="draft.description" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" />
          </n-form-item>
          <div class="field-grid">
            <n-form-item label="传承人">
              <n-input v-model:value="draft.author" />
            </n-form-item>
            <n-form-item label="工艺类别">
              <n-select v-model:value="draft.category" :options="categoryOptions" />
            </n-form-item>
          </div>
          <div class="field-grid">
            <n-form-item label="材质">
              <n-input v-model:value="draft.material" />
            </n-form-item>
            <n-form-item label="尺寸">
              <n-input v-model:value="draft.dimensions" />
            </n-form-item>
          </div>
          <n-form-item label="创作年份">
            <n-input-number v-model:value="draft.year" :min="1" />
          </n-form-item>
          <FileUploader @upload="uploadFiles" />
          <div v-if="draft.images.length" class="image-preview">
            <img v-for="image in draft.images" :key="image" :src="image" alt="展品图片预览" />
          </div>
          <div class="form-actions">
            <n-button type="primary" @click="saveArtifact">{{ isCreating ? '创建' : '保存' }}</n-button>
            <n-button v-if="selectedId" quaternary type="error" @click="deleteArtifact(selectedId)">删除展品</n-button>
          </div>
        </n-form>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDialog, useMessage } from 'naive-ui';
import ArtifactCard from '@/components/common/ArtifactCard.vue';
import FileUploader from '@/components/common/FileUploader.vue';
import { useArtifactStore } from '@/stores/artifact';
import { useRemovalStore } from '@/stores/removal';
import { RemovalConflictError } from '@/api/artifact-removal';
import type { ArtifactDraft } from '@/types';
import { CraftCategory, craftCategoryLabels } from '@/types';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const artifactStore = useArtifactStore();
const removalStore = useRemovalStore();
const viewMode = ref<'grid' | 'list'>('grid');
const selectedId = ref(artifactStore.artifacts[0]?.id ?? '');
const isCreating = ref(false);
const restoring = ref(false);
const draft = reactive<ArtifactDraft>(artifactStore.createEmptyDraft());

const removedAtText = computed(() => {
  const removedAt = removalStore.latestSnapshot?.removedAt;
  if (!removedAt) return '';
  return new Date(removedAt).toLocaleString('zh-CN', { hour12: false });
});

const removalSummary = computed(() => {
  const snapshot = removalStore.latestSnapshot;
  if (!snapshot) return '';
  const parts: string[] = [`${snapshot.annotations.length} 条标注`];
  parts.push(`${snapshot.exhibitions.length} 处展览引用`);
  const tourCount = new Set(snapshot.tourNodes.map((node) => node.tourId)).size;
  parts.push(`${tourCount} 条导览`);
  return `已保存 ${parts.join('、')}`;
});

const selectedArtifact = computed(() => artifactStore.getById(selectedId.value));
const categoryOptions = Object.values(CraftCategory).map((value) => ({
  label: craftCategoryLabels[value],
  value
}));

watch(
  selectedArtifact,
  (artifact) => {
    if (!artifact || isCreating.value) return;
    Object.assign(draft, {
      name: artifact.name,
      description: artifact.description,
      author: artifact.author,
      category: artifact.category,
      dimensions: artifact.dimensions,
      year: artifact.year,
      material: artifact.material,
      images: [...artifact.images],
      modelUrl: artifact.modelUrl,
      imageFileIds: [...artifact.imageFileIds],
      modelFileId: artifact.modelFileId
    });
  },
  { immediate: true }
);

function startCreate() {
  isCreating.value = true;
  selectedId.value = '';
  Object.assign(draft, artifactStore.createEmptyDraft());
}

function selectArtifact(id: string) {
  isCreating.value = false;
  selectedId.value = id;
}

async function saveArtifact(): Promise<string | undefined> {
  if (!draft.name.trim()) {
    message.warning('请填写展品名称');
    return undefined;
  }

  if (isCreating.value) {
    const created = await artifactStore.addArtifact({ ...draft, images: [...draft.images], imageFileIds: [...draft.imageFileIds] });
    selectedId.value = created.id;
    isCreating.value = false;
    message.success('展品已创建');
    return created.id;
  }

  if (selectedId.value) {
    await artifactStore.updateArtifact(selectedId.value, {
      ...draft,
      images: [...draft.images],
      imageFileIds: [...draft.imageFileIds]
    });
    message.success('展品已保存');
    return selectedId.value;
  }

  return undefined;
}

async function uploadFiles(payload: { images: File[]; model?: File }) {
  let targetId = selectedId.value;
  if (!targetId) {
    targetId = (await saveArtifact()) ?? '';
  }
  if (!targetId) return;
  await artifactStore.attachFiles(targetId, payload.images, payload.model);
  const updated = artifactStore.getById(targetId);
  if (updated) {
    Object.assign(draft, {
      images: [...updated.images],
      modelUrl: updated.modelUrl,
      imageFileIds: [...updated.imageFileIds],
      modelFileId: updated.modelFileId
    });
  }
  message.success('文件已写入 IndexedDB');
}

async function deleteArtifact(id: string) {
  try {
    const outcome = await removalStore.removeArtifact(id);
    if (selectedId.value === id) {
      selectedId.value = artifactStore.artifacts[0]?.id ?? '';
      isCreating.value = !selectedId.value;
      Object.assign(draft, selectedArtifact.value ?? artifactStore.createEmptyDraft());
    }
    if (outcome.mode === 'snapshot') {
      message.info('展品已移出，关联资料已保存，可在顶部撤销移出');
    } else {
      message.success('展品已删除');
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '移出失败，请重试');
  }
}

async function undoRemoval() {
  restoring.value = true;
  try {
    const summary = await removalStore.restoreLatest();
    selectedId.value = summary.artifactId;
    isCreating.value = false;
    if (selectedArtifact.value) {
      Object.assign(draft, {
        name: selectedArtifact.value.name,
        description: selectedArtifact.value.description,
        author: selectedArtifact.value.author,
        category: selectedArtifact.value.category,
        dimensions: selectedArtifact.value.dimensions,
        year: selectedArtifact.value.year,
        material: selectedArtifact.value.material,
        images: [...selectedArtifact.value.images],
        modelUrl: selectedArtifact.value.modelUrl,
        imageFileIds: [...selectedArtifact.value.imageFileIds],
        modelFileId: selectedArtifact.value.modelFileId
      });
    }
    const skippedCount = summary.missingExhibitionIds.length + summary.missingTourIds.length;
    message.success(
      skippedCount === 0
        ? '已撤销移出，展品连同原有标注、展览顺序和导览节点一起还原'
        : '已撤销移出；部分展览或导览已不存在，仅还原了仍存在的关联'
    );
  } catch (error) {
    message.error(error instanceof Error ? error.message : '还原失败，当前数据未被修改');
  } finally {
    restoring.value = false;
  }
}

function confirmDiscard() {
  const snapshot = removalStore.latestSnapshot;
  if (!snapshot) return;
  dialog.warning({
    title: '不再保留该移出记录？',
    content: `将永久删除「${snapshot.artifact.name}」的快照及其图片、模型文件，且无法再撤销。`,
    positiveText: '永久丢弃',
    negativeText: '取消',
    onPositiveClick: async () => {
      await removalStore.discardSnapshot();
      message.success('移出记录已丢弃');
    }
  });
}
</script>

<style scoped>
.artifact-manage {
  display: grid;
  gap: 18px;
}

.undo-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: rgba(157, 123, 54, 0.12);
  border: 1px solid rgba(157, 123, 54, 0.55);
  border-radius: 8px;
}

.undo-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  align-items: baseline;
  color: var(--museum-ink);
  font-size: 13px;
}

.undo-info strong {
  font-family: var(--font-display);
  font-size: 15px;
}

.undo-hint {
  flex-basis: 100%;
  color: rgba(31, 46, 41, 0.68);
}

.undo-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.library-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.library-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.58fr);
  gap: 18px;
  align-items: start;
}

.artifact-list {
  display: grid;
  gap: 14px;
}

.artifact-list.grid {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.artifact-list.list {
  grid-template-columns: 1fr;
}

.artifact-editor {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.artifact-editor header,
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.artifact-editor h2 {
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

.image-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
}

.image-preview img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
}

@media (max-width: 1120px) {
  .library-grid,
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
