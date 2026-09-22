import type { Annotation, Artifact, TourNode } from '@/types';

/** 导览节点快照：连同其所属导览和在节点序列中的位置一起保存 */
export interface TourNodeSnapshot extends TourNode {
  tourId: string;
  index: number;
}

/** 展览引用快照：仅保存包含该展品的引用及其在展品序列中的位置 */
export interface ExhibitionRefSnapshot {
  exhibitionId: string;
  index: number;
}

/**
 * 一次可撤销移出的持久化快照。
 * 仅保留最近一次，展品的图片 / 模型文件保留在 files 存储中，直到快照被撤销或丢弃。
 */
export interface ArtifactRemovalSnapshot {
  id: 'latest-artifact-removal';
  artifactId: string;
  artifact: Artifact;
  artifactIndex: number;
  annotations: Annotation[];
  exhibitions: ExhibitionRefSnapshot[];
  tourNodes: TourNodeSnapshot[];
  fileIds: string[];
  removedAt: string;
}

export interface CommitRemovalResult {
  mode: 'snapshot' | 'plain';
  snapshot: ArtifactRemovalSnapshot | null;
  deletedFileIds: string[];
}

export interface RestoreRemovalSummary {
  artifactId: string;
  annotationCount: number;
  restoredExhibitionIds: string[];
  restoredTourIds: string[];
  missingExhibitionIds: string[];
  missingTourIds: string[];
}
