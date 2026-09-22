import type { ExhibitionStatus } from './enums';

export interface Exhibition {
  id: string;
  title: string;
  intro: string;
  curator: string;
  artifactIds: string[];
  themeColor: string;
  backgroundMusicUrl?: string;
  status: ExhibitionStatus;
  createdAt: string;
  updatedAt: string;
}

export type ExhibitionDraft = Omit<Exhibition, 'id' | 'createdAt' | 'updatedAt'>;
