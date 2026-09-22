import type { Annotation, Artifact, Exhibition, Tour } from '@/types';
import {
  deleteRecord,
  getAllRecords,
  getRecord,
  putManyRecords,
  putRecord,
  type EntityStoreName
} from '@/utils/storage';

function createRepository<T extends { id: string }>(storeName: EntityStoreName) {
  return {
    list: () => getAllRecords<T>(storeName),
    get: (id: string) => getRecord<T>(storeName, id),
    save: (record: T) => putRecord(storeName, record),
    saveMany: (records: T[]) => putManyRecords(storeName, records),
    remove: (id: string) => deleteRecord(storeName, id)
  };
}

export const artifactRepository = createRepository<Artifact>('artifacts');
export const exhibitionRepository = createRepository<Exhibition>('exhibitions');
export const annotationRepository = createRepository<Annotation>('annotations');
export const tourRepository = createRepository<Tour>('tours');
