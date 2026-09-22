import { defineStore } from 'pinia';
import { tourRepository } from '@/api/storage';
import type { Tour, TourDraft, TourNode } from '@/types';
import { createId } from '@/utils/storage';
import { useArtifactStore } from './artifact';
import { useExhibitionStore } from './exhibition';

function createSeedTour(exhibitionId: string, artifactIds: string[]): Tour {
  const now = new Date().toISOString();
  const nodes: TourNode[] = artifactIds.slice(0, 3).map((artifactId, index) => ({
    id: createId('tour-node'),
    artifactId,
    cameraPosition: { x: 4 - index * 1.5, y: 2.4, z: 5 - index },
    targetPosition: { x: 0, y: 0.2, z: 0 },
    transitionMs: 2600,
    narration: ['从器型观察手工成型痕迹。', '靠近纹样，比较线材与针法。', '改变角度查看材料反光。'][index] ?? ''
  }));

  return {
    id: 'tour-default-route',
    exhibitionId,
    name: '材料与手势导览',
    nodes,
    createdAt: now,
    updatedAt: now
  };
}

export const useTourStore = defineStore('tour', {
  state: () => ({
    tours: [] as Tour[],
    loaded: false
  }),
  getters: {
    getById: (state) => (id: string) => state.tours.find((tour) => tour.id === id),
    byExhibitionId: (state) => (exhibitionId: string) => state.tours.filter((tour) => tour.exhibitionId === exhibitionId)
  },
  actions: {
    async load() {
      const records = await tourRepository.list();
      if (records.length === 0) {
        const exhibitionStore = useExhibitionStore();
        const artifactStore = useArtifactStore();
        const exhibition = exhibitionStore.exhibitions[0];
        if (exhibition) {
          const seed = createSeedTour(exhibition.id, artifactStore.artifacts.map((artifact) => artifact.id));
          await tourRepository.save(seed);
          this.tours = [seed];
        }
      } else {
        this.tours = records;
      }
      this.loaded = true;
    },
    async createTour(draft: TourDraft) {
      const now = new Date().toISOString();
      const tour: Tour = {
        ...draft,
        id: createId('tour'),
        createdAt: now,
        updatedAt: now
      };
      this.tours.unshift(tour);
      await tourRepository.save(tour);
      return tour;
    },
    async updateTour(id: string, patch: Partial<TourDraft>) {
      const current = this.getById(id);
      if (!current) return;
      const updated: Tour = { ...current, ...patch, updatedAt: new Date().toISOString() };
      this.tours = this.tours.map((tour) => (tour.id === id ? updated : tour));
      await tourRepository.save(updated);
    },
    async deleteTour(id: string) {
      this.tours = this.tours.filter((tour) => tour.id !== id);
      await tourRepository.remove(id);
    },
    async addNode(tourId: string, node: Omit<TourNode, 'id'>) {
      const current = this.getById(tourId);
      if (!current) return;
      await this.updateTour(tourId, {
        nodes: [...current.nodes, { ...node, id: createId('tour-node') }]
      });
    },
    async updateNode(tourId: string, nodeId: string, patch: Partial<Omit<TourNode, 'id'>>) {
      const current = this.getById(tourId);
      if (!current) return;
      await this.updateTour(tourId, {
        nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node))
      });
    },
    async reorderNodes(tourId: string, nodes: TourNode[]) {
      await this.updateTour(tourId, { nodes });
    },
    async removeNode(tourId: string, nodeId: string) {
      const current = this.getById(tourId);
      if (!current) return;
      await this.updateTour(tourId, { nodes: current.nodes.filter((node) => node.id !== nodeId) });
    }
  }
});
