import type { CraftCategory } from './enums';

export interface Artifact {
  id: string;
  name: string;
  description: string;
  author: string;
  category: CraftCategory;
  dimensions: string;
  year: number;
  material: string;
  images: string[];
  modelUrl?: string;
  imageFileIds: string[];
  modelFileId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ArtifactDraft = Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>;
