import type { IDBPTransaction } from 'idb';
import type {
  Annotation,
  Artifact,
  ArtifactRemovalSnapshot,
  CommitRemovalResult,
  Exhibition,
  RestoreRemovalSummary,
  Tour,
  TourNode,
  TourNodeSnapshot
} from '@/types';
import { getDatabase, type CraftGalleryDB, type StoredFile } from '@/utils/storage';

export const LATEST_SNAPSHOT_ID = 'latest-artifact-removal';

/** 还原前置校验失败：不能覆盖任何当前数据 */
export class RemovalConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RemovalConflictError';
  }
}

export interface RestoreRemovalResult {
  snapshot: ArtifactRemovalSnapshot;
  summary: RestoreRemovalSummary;
  updatedExhibitions: Exhibition[];
  updatedTours: Tour[];
}

const REMOVAL_STORE_NAMES = [
  'artifacts',
  'exhibitions',
  'annotations',
  'tours',
  'artifactRemovals',
  'files'
] as const;

type RemovalStoreName = (typeof REMOVAL_STORE_NAMES)[number];
type RemovalTransaction = IDBPTransaction<CraftGalleryDB, RemovalStoreName[], 'readwrite'>;

async function openTransaction(): Promise<RemovalTransaction> {
  const db = await getDatabase();
  return db.transaction(REMOVAL_STORE_NAMES, 'readwrite');
}

/** 校验失败后主动中止事务，并吸收随之产生的 AbortError rejection */
function abortQuietly(tx: RemovalTransaction): void {
  tx.done.catch(() => {
    // 中止导致的 rejection 已通过原始错误返回给调用方
  });
  try {
    tx.abort();
  } catch {
    // 事务可能已结束，忽略重复中止
  }
}

function toTourNode(snapshotNode: TourNodeSnapshot): TourNode {  return {
    id: snapshotNode.id,
    artifactId: snapshotNode.artifactId,
    cameraPosition: snapshotNode.cameraPosition,
    targetPosition: snapshotNode.targetPosition,
    transitionMs: snapshotNode.transitionMs,
    narration: snapshotNode.narration
  };
}

export async function getLatestRemoval(): Promise<ArtifactRemovalSnapshot | null> {
  const db = await getDatabase();
  const record = await db.get('artifactRemovals', LATEST_SNAPSHOT_ID);
  return (record as ArtifactRemovalSnapshot | undefined) ?? null;
}

/**
 * 移出展品。
 * - 没有任何关联标注 / 展览引用 / 导览节点时按普通移出处理：删除展品及其文件，不产生快照；
 * - 存在关联时在同一个事务内保存快照、移除展品及全部关联关系，仅保留最近一次快照；
 *   被替换的旧快照所独占的文件会在同一事务中清理。
 */
export async function commitArtifactRemoval(
  artifact: Artifact,
  artifactIndex: number
): Promise<CommitRemovalResult> {
  const tx = await openTransaction();
  try {
    const [artifactRecord, exhibitionRecords, annotationRecords, tourRecords, previousRecord] =
      await Promise.all([
        tx.objectStore('artifacts').get(artifact.id),
        tx.objectStore('exhibitions').getAll(),
        tx.objectStore('annotations').getAll(),
        tx.objectStore('tours').getAll(),
        tx.objectStore('artifactRemovals').get(LATEST_SNAPSHOT_ID)
      ]);

    if (!artifactRecord) {
      throw new RemovalConflictError('该展品已被移出，无法重复操作');
    }

    const storedArtifact = artifactRecord as unknown as Artifact;
    const linkedAnnotations = (annotationRecords as unknown as Annotation[]).filter(
      (item) => item.artifactId === artifact.id
    );
    const linkedExhibitions = (exhibitionRecords as unknown as Exhibition[]).filter((item) =>
      item.artifactIds.includes(artifact.id)
    );
    const linkedTourEntries = (tourRecords as unknown as Tour[])
      .map((tour) => ({ tour, nodes: tour.nodes.filter((node) => node.artifactId === artifact.id) }))
      .filter((entry) => entry.nodes.length > 0);

    const currentFileIds = [
      ...storedArtifact.imageFileIds,
      ...(storedArtifact.modelFileId ? [storedArtifact.modelFileId] : [])
    ];

    // 无任何关联引用：按普通移出处理，不显示撤销入口
    if (
      linkedAnnotations.length === 0 &&
      linkedExhibitions.length === 0 &&
      linkedTourEntries.length === 0
    ) {
      await Promise.all([
        tx.objectStore('artifacts').delete(artifact.id),
        ...currentFileIds.map((fileId) => tx.objectStore('files').delete(fileId))
      ]);
      await tx.done;
      return { mode: 'plain', snapshot: null, deletedFileIds: currentFileIds };
    }

    const previousSnapshot = previousRecord as unknown as ArtifactRemovalSnapshot | undefined;
    const staleFileIds = previousSnapshot
      ? [
          ...previousSnapshot.artifact.imageFileIds,
          ...(previousSnapshot.artifact.modelFileId
            ? [previousSnapshot.artifact.modelFileId]
            : [])
        ]
      : [];

    const snapshot: ArtifactRemovalSnapshot = {
      id: LATEST_SNAPSHOT_ID,
      artifactId: artifact.id,
      artifact: storedArtifact,
      artifactIndex,
      annotations: linkedAnnotations,
      exhibitions: linkedExhibitions.map((exhibition) => ({
        exhibitionId: exhibition.id,
        index: exhibition.artifactIds.indexOf(artifact.id)
      })),
      tourNodes: linkedTourEntries.flatMap(({ tour, nodes }) =>
        nodes.map((node) => ({
          ...node,
          tourId: tour.id,
          index: tour.nodes.findIndex((item) => item.id === node.id)
        }))
      ),
      fileIds: currentFileIds,
      removedAt: new Date().toISOString()
    };

    const linkedAnnotationIds = new Set(linkedAnnotations.map((item) => item.id));
    const linkedNodeIds = new Set(
      linkedTourEntries.flatMap(({ nodes }) => nodes.map((node) => node.id))
    );
    const prunedExhibitions = linkedExhibitions.map((exhibition) => ({
      ...exhibition,
      artifactIds: exhibition.artifactIds.filter((id) => id !== artifact.id)
    }));
    const prunedTours = linkedTourEntries.map(({ tour }) => ({
      ...tour,
      nodes: tour.nodes.filter((node) => !linkedNodeIds.has(node.id))
    }));

    await Promise.all([
      tx.objectStore('artifacts').delete(artifact.id),
      ...linkedAnnotations.map((item) => tx.objectStore('annotations').delete(item.id)),
      ...prunedExhibitions.map((item) =>
        tx.objectStore('exhibitions').put(item as unknown as { id: string; [key: string]: unknown })
      ),
      ...prunedTours.map((item) =>
        tx.objectStore('tours').put(item as unknown as { id: string; [key: string]: unknown })
      ),
      tx
        .objectStore('artifactRemovals')
        .put(snapshot as unknown as { id: string; [key: string]: unknown }),
      ...staleFileIds.map((fileId) => tx.objectStore('files').delete(fileId))
    ]);
    await tx.done;
    return { mode: 'snapshot', snapshot, deletedFileIds: staleFileIds };
  } catch (error) {
    abortQuietly(tx);
    throw error;
  }
}

/**
 * 撤销最近一次移出：先做全部冲突 / 完整性校验，再在一个事务内写回。
 * 任何前置条件不满足都会中止事务，当前数据不会被覆盖。
 */
export async function restoreLatestRemoval(): Promise<RestoreRemovalResult> {
  const db = await getDatabase();
  const snapshotRecord = await db.get('artifactRemovals', LATEST_SNAPSHOT_ID);
  if (!snapshotRecord) {
    throw new RemovalConflictError('没有可撤销的移出记录');
  }
  const snapshot = snapshotRecord as unknown as ArtifactRemovalSnapshot;

  const tx = await openTransaction();
  try {
    const [artifactRecords, exhibitionRecords, annotationRecords, tourRecords, fileRecords] =
      await Promise.all([
        tx.objectStore('artifacts').getAll(),
        tx.objectStore('exhibitions').getAll(),
        tx.objectStore('annotations').getAll(),
        tx.objectStore('tours').getAll(),
        tx.objectStore('files').getAll()
      ]);

    // 重复操作保护：展品已在库中则不允许还原覆盖
    if ((artifactRecords as unknown as Artifact[]).some((item) => item.id === snapshot.artifact.id)) {
      throw new RemovalConflictError('展品已在展品库中，还原已取消，当前数据未被修改');
    }
    for (const annotation of snapshot.annotations) {
      if ((annotationRecords as unknown as Annotation[]).some((item) => item.id === annotation.id)) {
        throw new RemovalConflictError('当前已存在相同标注，还原已取消，当前数据未被修改');
      }
    }

    const missingFiles = snapshot.fileIds.filter(
      (fileId) => !(fileRecords as unknown as StoredFile[]).some((file) => file.id === fileId)
    );
    if (missingFiles.length > 0) {
      throw new RemovalConflictError(
        '展品关联的图片或模型文件已丢失，无法完整还原，当前数据未被修改'
      );
    }

    const exhibitionsById = new Map(
      (exhibitionRecords as unknown as Exhibition[]).map((exhibition) => [exhibition.id, exhibition])
    );
    const toursById = new Map(
      (tourRecords as unknown as Tour[]).map((tour) => [tour.id, tour])
    );

    // 还原展览引用顺序：仅插入，不覆盖现有展览的其他改动
    const missingExhibitionIds: string[] = [];
    const updatedExhibitions: Exhibition[] = [];
    for (const ref of snapshot.exhibitions) {
      const current = exhibitionsById.get(ref.exhibitionId);
      if (!current) {
        missingExhibitionIds.push(ref.exhibitionId);
        continue;
      }
      if (current.artifactIds.includes(snapshot.artifact.id)) {
        throw new RemovalConflictError('当前展览已包含该展品，还原已取消，当前数据未被修改');
      }
      const nextIds = [...current.artifactIds];
      const insertAt = Math.min(Math.max(ref.index, 0), nextIds.length);
      nextIds.splice(insertAt, 0, snapshot.artifact.id);
      updatedExhibitions.push({
        ...current,
        artifactIds: nextIds,
        updatedAt: new Date().toISOString()
      });
    }

    // 还原导览节点：按原始顺序插回原位置，不覆盖导览的其他改动
    const missingTourIds: string[] = [];
    const updatedTours: Tour[] = [];
    const nodesByTour = new Map<string, TourNodeSnapshot[]>();
    for (const node of [...snapshot.tourNodes].sort((a, b) => a.index - b.index)) {
      const group = nodesByTour.get(node.tourId) ?? [];
      group.push(node);
      nodesByTour.set(node.tourId, group);
    }
    for (const [tourId, nodes] of nodesByTour) {
      const current = toursById.get(tourId);
      if (!current) {
        missingTourIds.push(tourId);
        continue;
      }
      if (nodes.some((node) => current.nodes.some((existing) => existing.id === node.id))) {
        throw new RemovalConflictError('当前导览已存在相同节点，还原已取消，当前数据未被修改');
      }
      const nextNodes = [...current.nodes];
      for (const node of nodes) {
        const insertAt = Math.min(Math.max(node.index, 0), nextNodes.length);
        nextNodes.splice(insertAt, 0, toTourNode(node));
      }
      updatedTours.push({ ...current, nodes: nextNodes, updatedAt: new Date().toISOString() });
    }

    await Promise.all([
      tx
        .objectStore('artifacts')
        .put(snapshot.artifact as unknown as { id: string; [key: string]: unknown }),
      ...snapshot.annotations.map((annotation) =>
        tx
          .objectStore('annotations')
          .put(annotation as unknown as { id: string; [key: string]: unknown })
      ),
      ...updatedExhibitions.map((exhibition) =>
        tx
          .objectStore('exhibitions')
          .put(exhibition as unknown as { id: string; [key: string]: unknown })
      ),
      ...updatedTours.map((tour) =>
        tx.objectStore('tours').put(tour as unknown as { id: string; [key: string]: unknown })
      ),
      tx.objectStore('artifactRemovals').delete(LATEST_SNAPSHOT_ID)
    ]);
    await tx.done;

    return {
      snapshot,
      updatedExhibitions,
      updatedTours,
      summary: {
        artifactId: snapshot.artifact.id,
        annotationCount: snapshot.annotations.length,
        restoredExhibitionIds: updatedExhibitions.map((exhibition) => exhibition.id),
        restoredTourIds: updatedTours.map((tour) => tour.id),
        missingExhibitionIds,
        missingTourIds
      }
    };
  } catch (error) {
    abortQuietly(tx);
    throw error;
  }
}

/** 放弃最近一次移出：永久删除快照及其保留的文件 */
export async function discardLatestRemoval(): Promise<ArtifactRemovalSnapshot | null> {
  const db = await getDatabase();
  const snapshotRecord = await db.get('artifactRemovals', LATEST_SNAPSHOT_ID);
  if (!snapshotRecord) return null;
  const snapshot = snapshotRecord as unknown as ArtifactRemovalSnapshot;

  const tx = db.transaction(['artifactRemovals', 'files'], 'readwrite');
  await Promise.all([
    tx.objectStore('artifactRemovals').delete(LATEST_SNAPSHOT_ID),
    ...snapshot.fileIds.map((fileId) => tx.objectStore('files').delete(fileId))
  ]);
  await tx.done;
  return snapshot;
}
