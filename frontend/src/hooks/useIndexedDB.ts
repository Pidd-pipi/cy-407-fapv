import { ref, shallowRef } from 'vue';
import {
  deleteRecord,
  getAllRecords,
  getRecord,
  putRecord,
  type EntityStoreName
} from '@/utils/storage';

export function useIndexedDB<T extends { id: string }>(storeName: EntityStoreName) {
  const records = shallowRef<T[]>([]);
  const loading = ref(false);

  const load = async () => {
    loading.value = true;
    try {
      records.value = await getAllRecords<T>(storeName);
    } finally {
      loading.value = false;
    }
  };

  const get = (id: string) => getRecord<T>(storeName, id);

  const save = async (record: T) => {
    await putRecord(storeName, record);
    const index = records.value.findIndex((item) => item.id === record.id);
    if (index >= 0) {
      records.value = records.value.map((item) => (item.id === record.id ? record : item));
    } else {
      records.value = [...records.value, record];
    }
  };

  const remove = async (id: string) => {
    await deleteRecord(storeName, id);
    records.value = records.value.filter((record) => record.id !== id);
  };

  return { records, loading, load, get, save, remove };
}
