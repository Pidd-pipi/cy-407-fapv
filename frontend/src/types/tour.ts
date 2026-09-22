import type { Vector3Tuple } from './annotation';

export interface TourNode {
  id: string;
  artifactId: string;
  cameraPosition: Vector3Tuple;
  targetPosition: Vector3Tuple;
  transitionMs: number;
  narration: string;
}

export interface Tour {
  id: string;
  exhibitionId: string;
  name: string;
  nodes: TourNode[];
  createdAt: string;
  updatedAt: string;
}

export type TourDraft = Omit<Tour, 'id' | 'createdAt' | 'updatedAt'>;
