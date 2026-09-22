import { defineStore } from 'pinia';
import {
  commitArtifactRemoval,
  discardLatestRemoval,
  getLatestRemoval,
  restoreLatestRemoval,
  RemovalConflictError
} from '@/api/artifact-removal';
import type { ArtifactRemovalSnapshot, RestoreRemovalSummary } from '@/types';
import { revokeBlobUrl } from '@/utils/storage';
import { useAnnotationStore } from './annotation';
import { useArtifactStore } from './artifact';
import { useExhibitionStore } from './exhibition';
import { useTourStore } from './tour';

export interface RemoveArtifactOutcome {
  mode: 'snapshot' | 'plain';
  snapshot: ArtifactRemovalSnapshot | null;
}

function revokeSnapshotUrls(snapshot: ArtifactRemovalSnapshot | null | undefined) {
  if (!snapshot) return;
  for (const fileId of snapshot.fileIds) {
    revokeBlobUrl(fileId);
  }
}

/**
 * 展品可撤销移出：持久化快照（展品资料、关联标注、展览引用顺序、导览节点）
 * 与各业务实体的内存状态同步都在这里编排，保证数据层事务先提交、再更新内存。
 */
export const useRemovalStore = defineStore('removal', {
  state: () => ({
    latestSnapshot: null as ArtifactRemovalSnapshot | null,
    loaded: false,
    busy: false
  }),
  actions: {
    async load() {
      this.latestSnapshot = await getLatestRemoval();
      this.loaded = true;
    },
    async removeArtifact(id: string): Promise<RemoveArtifactOutcome> {
      if (this.busy) {
        throw new RemovalConflictError('上一次移出操作尚未完成');
      }
      const artifactStore = useArtifactStore();
      const current = artifactStore.getById(id);
      if (!current) {
        throw new RemovalConflictError('该展品已被移出，无法重复操作');
      }
      const index = artifactStore.indexOfArtifact(id);

      this.busy = true;
      try {
        // 展品资料与文件 id 由事务从持久层读取，内存中的顺序单独由 index 保存
        const result = await commitArtifactRemoval(current, index);
        this.busy = false;

        // 事务提交成功后再同步内存状态
        artifactStore.detachArtifact(id);
        useAnnotationStore().detachByArtifact(id);
        useExhibitionStore().detachArtifact(id);
        useTourStore().detachArtifact(id);

        revokeSnapshotUrls(this.latestSnapshot);
        result.deletedFileIds.forEach((fileId) => revokeBlobUrl(fileId));
        this.latestSnapshot = result.snapshot;
        return { mode: result.mode, snapshot: result.snapshot };
      } catch (error) {
        this.busy = false;
        throw error;
      }
    },
    async restoreLatest(): Promise<RestoreRemovalSummary> {
      if (this.busy) {
        throw new RemovalConflictError('撤销操作正在进行中，请勿重复操作');
      }
      const snapshot = this.latestSnapshot ?? (await getLatestRemoval());
      if (!snapshot) {
        throw new RemovalConflictError('没有可撤销的移出记录');
      }

      this.busy = true;
      try {
        const result = await restoreLatestRemoval();
        this.busy = false;

        const artifactStore = useArtifactStore();
        await artifactStore.restoreArtifactRecord(result.snapshot.artifact, result.snapshot.artifactIndex);
        useAnnotationStore().restoreAnnotations(result.snapshot.annotations);
        useExhibitionStore().syncUpdated(result.updatedExhibitions);
        useTourStore().syncUpdated(result.updatedTours);

        this.latestSnapshot = null;
        return result.summary;
      } catch (error) {
        this.busy = false;
        throw error;
      }
    },
    async discardSnapshot() {
      const snapshot = this.latestSnapshot;
      await discardLatestRemoval();
      revokeSnapshotUrls(snapshot);
      this.latestSnapshot = null;
    }
  }
});
