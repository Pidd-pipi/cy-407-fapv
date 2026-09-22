<template>
  <section v-if="tour" class="tour-page">
    <div class="page-head">
      <div>
        <h1>导览编辑</h1>
        <p>按展品组织自动播放路线，为每个节点设置相机位置、目标点、过渡动画和讲解文字。</p>
      </div>
      <div class="tour-actions">
        <n-input v-model:value="tourName" placeholder="导览名称" />
        <n-button type="primary" @click="saveTourName">保存名称</n-button>
        <n-button secondary @click="addNode">添加节点</n-button>
      </div>
    </div>

    <div class="tour-grid">
      <section class="panel-surface timeline-panel">
        <div class="tour-meta">
          <strong>{{ exhibition?.title ?? '未绑定展览' }}</strong>
          <span>{{ tour.nodes.length }} 个导览节点</span>
        </div>
        <TourTimeline
          :nodes="tour.nodes"
          :artifacts="artifactStore.artifacts"
          :selected-node-id="selectedNodeId"
          @select="selectedNodeId = $event"
          @reorder="tourStore.reorderNodes(tour.id, $event)"
          @remove="removeNode"
        />
      </section>

      <CameraSetter :node="selectedNode" :artifacts="artifactStore.artifacts" @update="updateNode" />
    </div>
  </section>
  <n-result v-else status="404" title="导览不存在" description="请先在展览管理中保留至少一个展览和导览。" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import CameraSetter from '@/components/editor/CameraSetter.vue';
import TourTimeline from '@/components/editor/TourTimeline.vue';
import { useArtifactStore } from '@/stores/artifact';
import { useExhibitionStore } from '@/stores/exhibition';
import { useTourStore } from '@/stores/tour';
import type { Tour, TourNode } from '@/types';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const artifactStore = useArtifactStore();
const exhibitionStore = useExhibitionStore();
const tourStore = useTourStore();

const selectedNodeId = ref('');
const tourName = ref('');

const tour = computed<Tour | undefined>(() => {
  const id = String(route.params.id ?? '');
  return tourStore.getById(id) ?? tourStore.tours[0];
});

const exhibition = computed(() => (tour.value ? exhibitionStore.getById(tour.value.exhibitionId) : undefined));
const selectedNode = computed(() => tour.value?.nodes.find((node) => node.id === selectedNodeId.value));

watch(
  tour,
  (value) => {
    if (!value) return;
    tourName.value = value.name;
    selectedNodeId.value = value.nodes[0]?.id ?? '';
    if (route.params.id !== value.id) {
      void router.replace(`/manage/tours/${value.id}`);
    }
  },
  { immediate: true }
);

async function saveTourName() {
  if (!tour.value || !tourName.value.trim()) return;
  await tourStore.updateTour(tour.value.id, { name: tourName.value });
  message.success('导览名称已保存');
}

async function addNode() {
  if (!tour.value || !artifactStore.artifacts[0]) return;
  await tourStore.addNode(tour.value.id, {
    artifactId: artifactStore.artifacts[0].id,
    cameraPosition: { x: 3.4, y: 2.2, z: 5 },
    targetPosition: { x: 0, y: 0, z: 0 },
    transitionMs: 2200,
    narration: '补充这一站的工艺讲解。'
  });
  const updated = tourStore.getById(tour.value.id);
  selectedNodeId.value = updated?.nodes[updated.nodes.length - 1]?.id ?? '';
  message.success('节点已添加');
}

async function updateNode(patch: Omit<TourNode, 'id'>) {
  if (!tour.value || !selectedNodeId.value) return;
  await tourStore.updateNode(tour.value.id, selectedNodeId.value, patch);
  message.success('节点已保存');
}

async function removeNode(nodeId: string) {
  if (!tour.value) return;
  await tourStore.removeNode(tour.value.id, nodeId);
  selectedNodeId.value = tour.value.nodes.find((node) => node.id !== nodeId)?.id ?? '';
  message.success('节点已删除');
}
</script>

<style scoped>
.tour-page {
  display: grid;
  gap: 18px;
}

.tour-actions {
  display: grid;
  grid-template-columns: minmax(180px, 280px) auto auto;
  gap: 10px;
}

.tour-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.46fr);
  gap: 18px;
  align-items: start;
}

.timeline-panel {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.tour-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.tour-meta strong {
  font-family: var(--font-display);
  font-size: 26px;
}

.tour-meta span {
  color: rgba(31, 46, 41, 0.62);
}

@media (max-width: 980px) {
  .tour-grid,
  .tour-actions {
    grid-template-columns: 1fr;
  }
}
</style>
