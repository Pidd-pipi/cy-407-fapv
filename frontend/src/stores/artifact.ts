import { defineStore } from 'pinia';
import { artifactRepository } from '@/api/storage';
import type { Artifact, ArtifactDraft } from '@/types';
import { CraftCategory } from '@/types';
import { createBlobUrl, createId, deleteBlobFile, saveBlobFile } from '@/utils/storage';

function craftImage(label: string, background: string, accent: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100">
      <rect width="900" height="1100" fill="${background}"/>
      <circle cx="710" cy="220" r="170" fill="${accent}" opacity=".32"/>
      <path d="M112 840 C240 680 300 760 420 590 S665 365 790 468" fill="none" stroke="${accent}" stroke-width="42" stroke-linecap="round" opacity=".78"/>
      <rect x="128" y="152" width="250" height="620" rx="12" fill="#f7eddd" opacity=".72"/>
      <text x="120" y="960" font-family="serif" font-size="72" fill="#173f35">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const seedArtifacts: Artifact[] = [
  {
    id: 'artifact-ceramic-jar',
    name: '青釉刻花罐',
    description: '以手拉坯成型，罐身刻出缠枝纹，釉面在高温下形成温润青灰层次。',
    author: '陈清远',
    category: CraftCategory.Pottery,
    dimensions: '高 38cm × 直径 24cm',
    year: 2021,
    material: '瓷土、草木灰釉',
    images: [craftImage('青釉刻花罐', '#e9dfcc', '#4f776d')],
    imageFileIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'artifact-embroidered-panel',
    name: '百鸟纹绣片',
    description: '使用平针、打籽针与盘金绣叠加表现羽毛层次，适合作为局部细节讲解样本。',
    author: '罗敏华',
    category: CraftCategory.Embroidery,
    dimensions: '62cm × 48cm',
    year: 2019,
    material: '真丝、桑蚕丝线、金线',
    images: [craftImage('百鸟纹绣片', '#f3e5d3', '#bb4d3e')],
    imageFileIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'artifact-lacquer-box',
    name: '黑漆螺钿盒',
    description: '以多层髹漆打磨形成深色镜面，再嵌入贝片表现水纹和山形。',
    author: '周景行',
    category: CraftCategory.Lacquer,
    dimensions: '32cm × 18cm × 12cm',
    year: 2023,
    material: '木胎、天然大漆、螺钿',
    images: [craftImage('黑漆螺钿盒', '#dfd8c5', '#173f35')],
    imageFileIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'artifact-woven-basket',
    name: '竹编提梁篮',
    description: '以篾片经纬交错成型，提梁采用双层绕编，兼顾承重和装饰节奏。',
    author: '钱鸣川',
    category: CraftCategory.Weaving,
    dimensions: '高 46cm × 宽 34cm',
    year: 2020,
    material: '慈竹、棕绳',
    images: [craftImage('竹编提梁篮', '#ece0c8', '#9d7b36')],
    imageFileIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function hydrateMedia(artifact: Artifact): Promise<Artifact> {
  const fileImages = await Promise.all(artifact.imageFileIds.map((fileId) => createBlobUrl(fileId)));
  const modelUrl = artifact.modelFileId ? await createBlobUrl(artifact.modelFileId) : artifact.modelUrl;
  const persistedImages = fileImages.filter((url): url is string => Boolean(url));

  return {
    ...artifact,
    images: persistedImages.length > 0 ? persistedImages : artifact.images,
    modelUrl
  };
}

export const useArtifactStore = defineStore('artifact', {
  state: () => ({
    artifacts: [] as Artifact[],
    loaded: false
  }),
  getters: {
    getById: (state) => (id: string) => state.artifacts.find((artifact) => artifact.id === id),
    byCategory: (state) => (category: CraftCategory) =>
      state.artifacts.filter((artifact) => artifact.category === category)
  },
  actions: {
    async load() {
      const records = await artifactRepository.list();
      if (records.length === 0) {
        await artifactRepository.saveMany(seedArtifacts);
        this.artifacts = seedArtifacts;
      } else {
        this.artifacts = await Promise.all(records.map(hydrateMedia));
      }
      this.loaded = true;
    },
    async addArtifact(draft: ArtifactDraft) {
      const now = new Date().toISOString();
      const artifact: Artifact = {
        ...draft,
        id: createId('artifact'),
        createdAt: now,
        updatedAt: now
      };
      this.artifacts.unshift(artifact);
      await artifactRepository.save(artifact);
      return artifact;
    },
    async updateArtifact(id: string, patch: Partial<ArtifactDraft>) {
      const current = this.getById(id);
      if (!current) return;
      const updated: Artifact = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString()
      };
      this.artifacts = this.artifacts.map((artifact) => (artifact.id === id ? updated : artifact));
      await artifactRepository.save(updated);
    },
    async deleteArtifact(id: string) {
      const current = this.getById(id);
      if (!current) return;
      await Promise.all([...current.imageFileIds, current.modelFileId].filter(Boolean).map((fileId) => deleteBlobFile(fileId as string)));
      this.artifacts = this.artifacts.filter((artifact) => artifact.id !== id);
      await artifactRepository.remove(id);
    },
    async attachFiles(artifactId: string, imageFiles: File[], modelFile?: File) {
      const current = this.getById(artifactId);
      if (!current) return;

      const storedImages = await Promise.all(imageFiles.map((file) => saveBlobFile(file)));
      const storedModel = modelFile ? await saveBlobFile(modelFile) : undefined;
      const imageUrls = await Promise.all(storedImages.map((file) => createBlobUrl(file.id)));
      const modelUrl = storedModel ? await createBlobUrl(storedModel.id) : current.modelUrl;

      await this.updateArtifact(artifactId, {
        images: imageUrls.filter((url): url is string => Boolean(url)),
        imageFileIds: storedImages.map((file) => file.id),
        modelFileId: storedModel?.id ?? current.modelFileId,
        modelUrl
      });
    },
    createEmptyDraft(): ArtifactDraft {
      return {
        name: '',
        description: '',
        author: '',
        category: CraftCategory.Pottery,
        dimensions: '',
        year: new Date().getFullYear(),
        material: '',
        images: [],
        imageFileIds: []
      };
    }
  }
});
