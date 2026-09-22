import { defineStore } from 'pinia';
import { exhibitionRepository } from '@/api/storage';
import { ExhibitionStatus, type Exhibition, type ExhibitionDraft } from '@/types';
import { createId } from '@/utils/storage';
import { useArtifactStore } from './artifact';

function createSeedExhibition(artifactIds: string[]): Exhibition {
  const now = new Date().toISOString();
  return {
    id: 'exhibition-heritage-hall',
    title: '手作纹理常设展',
    intro: '围绕陶、绣、漆、竹四类工艺组织展陈，强调材料、手势和纹样的对照关系。',
    curator: '云上工艺馆',
    artifactIds,
    themeColor: '#173f35',
    backgroundMusicUrl: '',
    status: ExhibitionStatus.Published,
    createdAt: now,
    updatedAt: now
  };
}

export const useExhibitionStore = defineStore('exhibition', {
  state: () => ({
    exhibitions: [] as Exhibition[],
    loaded: false
  }),
  getters: {
    getById: (state) => (id: string) => state.exhibitions.find((exhibition) => exhibition.id === id),
    published: (state) => state.exhibitions.filter((exhibition) => exhibition.status === ExhibitionStatus.Published)
  },
  actions: {
    async load() {
      const records = await exhibitionRepository.list();
      if (records.length === 0) {
        const artifactStore = useArtifactStore();
        const seed = createSeedExhibition(artifactStore.artifacts.map((artifact) => artifact.id));
        await exhibitionRepository.save(seed);
        this.exhibitions = [seed];
      } else {
        this.exhibitions = records;
      }
      this.loaded = true;
    },
    async createExhibition(draft: ExhibitionDraft) {
      const now = new Date().toISOString();
      const exhibition: Exhibition = {
        ...draft,
        id: createId('exhibition'),
        createdAt: now,
        updatedAt: now
      };
      this.exhibitions.unshift(exhibition);
      await exhibitionRepository.save(exhibition);
      return exhibition;
    },
    async updateExhibition(id: string, patch: Partial<ExhibitionDraft>) {
      const current = this.getById(id);
      if (!current) return;
      const updated: Exhibition = { ...current, ...patch, updatedAt: new Date().toISOString() };
      this.exhibitions = this.exhibitions.map((exhibition) => (exhibition.id === id ? updated : exhibition));
      await exhibitionRepository.save(updated);
    },
    async deleteExhibition(id: string) {
      this.exhibitions = this.exhibitions.filter((exhibition) => exhibition.id !== id);
      await exhibitionRepository.remove(id);
    },
    async reorderArtifacts(id: string, artifactIds: string[]) {
      await this.updateExhibition(id, { artifactIds });
    },
    async publishExhibition(id: string) {
      await this.updateExhibition(id, { status: ExhibitionStatus.Published });
    },
    async unpublishExhibition(id: string) {
      await this.updateExhibition(id, { status: ExhibitionStatus.Draft });
    }
  }
});
