// IndexedDB Service for Audio History Storage

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AudioHistoryItem } from './types';

const DB_NAME = 'qwen-tts-history';
const DB_VERSION = 1;
const STORE_NAME = 'audio-history';
const MAX_ENTRIES = 30;

interface TTSSchema extends DBSchema {
  'audio-history': {
    key: string;
    value: AudioHistoryItem;
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<TTSSchema>> | null = null;

async function getDB(): Promise<IDBPDatabase<TTSSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<TTSSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export const audioHistoryDB = {
  async getAll(): Promise<AudioHistoryItem[]> {
    try {
      const db = await getDB();
      const allItems = await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
      return allItems.reverse();
    } catch (error) {
      console.error('Failed to get all audio history:', error);
      return [];
    }
  },

  async add(item: AudioHistoryItem): Promise<void> {
    try {
      const db = await getDB();
      
      const count = await db.count(STORE_NAME);
      if (count >= MAX_ENTRIES) {
        const allItems = await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
        const toRemove = allItems.slice(0, count - MAX_ENTRIES + 1);
        for (const oldItem of toRemove) {
          await db.delete(STORE_NAME, oldItem.id);
        }
      }
      
      await db.put(STORE_NAME, item);
    } catch (error) {
      if ((error as DOMException).name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, clearing old entries...');
        await this.clear();
        throw new Error('Storage quota exceeded. History cleared.');
      }
      console.error('Failed to add audio to history:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, id);
    } catch (error) {
      console.error('Failed to delete audio from history:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear(STORE_NAME);
    } catch (error) {
      console.error('Failed to clear audio history:', error);
      throw error;
    }
  },

  async get(id: string): Promise<AudioHistoryItem | undefined> {
    try {
      const db = await getDB();
      return db.get(STORE_NAME, id);
    } catch (error) {
      console.error('Failed to get audio from history:', error);
      return undefined;
    }
  },
};

// Helper to generate unique ID
export function generateId(): string {
  return `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to create text preview
export function createTextPreview(text: string, maxLength: number = 40): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength - 3) + '...';
}

// Storage quota monitoring
export async function getStorageEstimate(): Promise<{ usage: number; quota: number; percentUsed: number }> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
      return { usage, quota, percentUsed };
    }
    return { usage: 0, quota: 0, percentUsed: 0 };
  } catch {
    return { usage: 0, quota: 0, percentUsed: 0 };
  }
}

export async function checkStorageQuota(): Promise<boolean> {
  const { percentUsed } = await getStorageEstimate();
  if (percentUsed > 80) {
    console.warn(`Storage usage is at ${percentUsed.toFixed(1)}%. Consider clearing old entries.`);
    return false;
  }
  return true;
}
