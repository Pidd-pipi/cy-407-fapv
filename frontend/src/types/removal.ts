import type { Annotation } from './annotation';
import type { Artifact } from './artifact';
import type { TourNode } from './tour';

export interface ExhibitionRemovalRef {
  exhibitionId: string;
  /** 展品在展览 artifactIds 中出现过的下标（升序） */
  indexes: number[];
}

export interface TourRemovalRef {
  tourId: string;
  /** 被移除的导览节点及其在原 nodes 中的下标（升序） */
  nodes: { node: TourNode; index: number }[];
}

export interface ArtifactRemovalSnapshot {
  id: string;
  artifact: Artifact;
  /** 展品在展品库列表中的原下标 */
  artifactIndex: number;
  annotations: Annotation[];
  exhibitionRefs: ExhibitionRemovalRef[];
  tourRefs: TourRemovalRef[];
  removedAt: string;
}
