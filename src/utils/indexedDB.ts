/**
 * IndexedDB utilities for offline sample persistence
 */

const DB_NAME = 'StudioSamplesDB';
const DB_VERSION = 1;
const STORE_NAME = 'samples';

interface SampleData {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  timestamp: number;
  isFavorite: boolean;
  effects: string[];
  mimeType?: string;
}

let dbInstance: IDBDatabase | null = null;

export const initIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
    };
  });
};

export const saveSampleToIndexedDB = async (sample: SampleData): Promise<void> => {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(sample);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving sample to IndexedDB:', error);
    throw error;
  }
};

export const getSamplesFromIndexedDB = async (): Promise<SampleData[]> => {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise<SampleData[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting samples from IndexedDB:', error);
    return [];
  }
};

export const deleteSampleFromIndexedDB = async (sampleId: string): Promise<void> => {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(sampleId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting sample from IndexedDB:', error);
    throw error;
  }
};

export const clearIndexedDB = async (): Promise<void> => {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
    throw error;
  }
};

export const getIndexedDBSize = async (): Promise<number> => {
  try {
    const samples = await getSamplesFromIndexedDB();
    let totalSize = 0;
    
    for (const sample of samples) {
      if (sample.blob) {
        totalSize += sample.blob.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Error calculating IndexedDB size:', error);
    return 0;
  }
};

