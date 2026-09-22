import { defineStore } from 'pinia';
import {
  annotationRepository,
  artifactRepository,
  removalSnapshotRepository
} from '@/api/storage';
import type { Annotation, Artifact, ArtifactRemovalSnapshot, ExhibitionRemovalRef, TourRemovalRef } from '@/types';
import { createId } from '@/utils/storage';
import { hydrateMedia, useArtifactStore } from './artifact';
import { useAnnotationStore } from './annotation';
import { useExhibitionStore } from './exhibition';
import { useTourStore } from './tour';

export type RemoveArtifactResult = 'snapshot' | 'plain' | 'missing';
export type RestoreRemovalResult = 'restored' | 'empty' | 'busy' | 'duplicate' | 'error';

/** 展厅业务数据都是可 JSON 化的纯对象，用 JSON 克隆剥离响应式代理后再持久化 */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const useRemovalStore = defineStore('removal', {
  state: () => ({
    lastSnapshot: null as ArtifactRemovalSnapshot | null,
    restoring: false,
    loaded: false
  }),
  actions: {
    async load() {
      const records = await removalSnapshotRepository.list();
      this.lastSnapshot =
        records.sort((a, b) => b.removedAt.localeCompare(a.removedAt))[0] ?? null;
      this.loaded = true;
    },
    /**
     * 移出展品：有关联引用时先保存持久化快照再移除；无关联引用时按普通移出处理。
     */
    async removeArtifact(id: string): Promise<RemoveArtifactResult> {
      const artifactStore = useArtifactStore();
      const annotationStore = useAnnotationStore();
      const exhibitionStore = useExhibitionStore();
      const tourStore = useTourStore();

      const artifact = artifactStore.getById(id);
      if (!artifact) return 'missing';

      const annotations = annotationStore.byArtifactId(id);
      const exhibitionRefs: ExhibitionRemovalRef[] = exhibitionStore.exhibitions
        .map((exhibition) => ({
          exhibitionId: exhibition.id,
          indexes: exhibition.artifactIds.flatMap((artifactId, index) => (artifactId === id ? [index] : []))
        }))
        .filter((ref) => ref.indexes.length > 0);
      const tourRefs: TourRemovalRef[] = tourStore.tours
        .map((tour) => ({
          tourId: tour.id,
          nodes: tour.nodes.flatMap((node, index) => (node.artifactId === id ? [{ node, index }] : []))
        }))
        .filter((ref) => ref.nodes.length > 0);

      const hasReferences = annotations.length > 0 || exhibitionRefs.length > 0 || tourRefs.length > 0;
      if (!hasReferences) {
        await artifactStore.deleteArtifact(id);
        return 'plain';
      }

      const snapshot: ArtifactRemovalSnapshot = deepClone({
        id: createId('removal'),
        artifact,
        artifactIndex: artifactStore.artifacts.findIndex((item) => item.id === id),
        annotations,
        exhibitionRefs,
        tourRefs,
        removedAt: new Date().toISOString()
      });

      // 只保留最近一次可撤销的移出快照
      await removalSnapshotRepository.clear();
      await removalSnapshotRepository.save(snapshot);

      for (const ref of snapshot.exhibitionRefs) {
        const exhibition = exhibitionStore.getById(ref.exhibitionId);
        if (!exhibition) continue;
        await exhibitionStore.updateExhibition(exhibition.id, {
          artifactIds: exhibition.artifactIds.filter((artifactId) => artifactId !== id)
        });
      }
      for (const annotation of snapshot.annotations) {
        await annotationStore.deleteAnnotation(annotation.id);
      }
      for (const ref of snapshot.tourRefs) {
        const tour = tourStore.getById(ref.tourId);
        if (!tour) continue;
        await tourStore.updateTour(tour.id, {
          nodes: tour.nodes.filter((node) => node.artifactId !== id)
        });
      }

      // 保留已上传文件，撤销移出时才能完整还原媒体
      await artifactStore.deleteArtifact(id, { preserveFiles: true });
      this.lastSnapshot = snapshot;
      return 'snapshot';
    },
    /**
     * 撤销最近一次移出：连同展品、关联标注、展览引用顺序和导览节点一起还原。
     * 还原失败或重复操作时返回对应状态，不覆盖当前数据。
     */
    async restoreLastRemoval(): Promise<RestoreRemovalResult> {
      if (this.restoring) return 'busy';
      const snapshot = this.lastSnapshot;
      if (!snapshot) return 'empty';

      const artifactStore = useArtifactStore();
      const annotationStore = useAnnotationStore();
      const exhibitionStore = useExhibitionStore();
      const tourStore = useTourStore();

      if (artifactStore.getById(snapshot.artifact.id)) return 'duplicate';

      this.restoring = true;
      try {
        const artifact: Artifact = await hydrateMedia(deepClone(snapshot.artifact));
        const artifacts = [...artifactStore.artifacts];
        const artifactIndex = Math.min(Math.max(snapshot.artifactIndex, 0), artifacts.length);
        artifacts.splice(artifactIndex, 0, artifact);
        artifactStore.artifacts = artifacts;
        await artifactRepository.save(artifact);

        for (const annotation of snapshot.annotations) {
          if (annotationStore.annotations.some((item) => item.id === annotation.id)) continue;
          const restored: Annotation = deepClone(annotation);
          annotationStore.annotations.push(restored);
          await annotationRepository.save(restored);
        }

        for (const ref of snapshot.exhibitionRefs) {
          const exhibition = exhibitionStore.getById(ref.exhibitionId);
          if (!exhibition || exhibition.artifactIds.includes(snapshot.artifact.id)) continue;
          const artifactIds = [...exhibition.artifactIds];
          for (const index of [...ref.indexes].sort((a, b) => a - b)) {
            artifactIds.splice(Math.min(index, artifactIds.length), 0, snapshot.artifact.id);
          }
          await exhibitionStore.updateExhibition(exhibition.id, { artifactIds });
        }

        for (const ref of snapshot.tourRefs) {
          const tour = tourStore.getById(ref.tourId);
          if (!tour) continue;
          const nodes = [...tour.nodes];
          let changed = false;
          for (const { node, index } of [...ref.nodes].sort((a, b) => a.index - b.index)) {
            if (nodes.some((item) => item.id === node.id)) continue;
            nodes.splice(Math.min(index, nodes.length), 0, deepClone(node));
            changed = true;
          }
          if (changed) {
            await tourStore.updateTour(tour.id, { nodes });
          }
        }

        await removalSnapshotRepository.remove(snapshot.id);
        this.lastSnapshot = null;
        return 'restored';
      } catch (error) {
        console.error('还原移出快照失败', error);
        return 'error';
      } finally {
        this.restoring = false;
      }
    }
  }
});
