// Custom hook for managing audio history

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AudioHistoryItem } from '../types';
import { audioHistoryDB, generateId, createTextPreview } from '../audioHistoryDB';

interface UseAudioHistoryReturn {
  history: AudioHistoryItem[];
  isLoading: boolean;
  addToHistory: (item: Omit<AudioHistoryItem, 'id' | 'textPreview' | 'timestamp'>) => Promise<AudioHistoryItem>;
  removeFromHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getAudioUrl: (item: AudioHistoryItem) => string | null;
}

export function useAudioHistory(): UseAudioHistoryReturn {
  const [history, setHistory] = useState<AudioHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track created URLs for cleanup
  const createdUrlsRef = useRef<Set<string>>(new Set());

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const items = await audioHistoryDB.getAll();
        setHistory(items);
      } catch (error) {
        console.error('Failed to load audio history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
    
    // Cleanup created URLs on unmount
    return () => {
      createdUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      createdUrlsRef.current.clear();
    };
  }, []);

  // Add new entry to history
  const addToHistory = useCallback(async (
    item: Omit<AudioHistoryItem, 'id' | 'textPreview' | 'timestamp'>
  ): Promise<AudioHistoryItem> => {
    const newItem: AudioHistoryItem = {
      ...item,
      id: generateId(),
      textPreview: createTextPreview(item.text),
      timestamp: Date.now(),
    };

    // Store in IndexedDB (including the audio blob)
    try {
      await audioHistoryDB.add(newItem);
    } catch (error) {
      console.error('Failed to save audio to history:', error);
      throw error;
    }
    
    // Update state with new item at the beginning
    setHistory(prev => [newItem, ...prev]);

    return newItem;
  }, []);

  // Remove entry from history
  const removeFromHistory = useCallback(async (id: string) => {
    try {
      await audioHistoryDB.delete(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to remove audio from history:', error);
      throw error;
    }
  }, []);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      await audioHistoryDB.clear();
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear audio history:', error);
      throw error;
    }
  }, []);

  // Get audio URL from history item
  const getAudioUrl = useCallback((item: AudioHistoryItem): string | null => {
    if (!item.audioBlob) return null;
    
    // Revoke any existing URL for this item before creating new one
    if (item.id && createdUrlsRef.current.has(item.id)) {
      const existingUrl = Array.from(createdUrlsRef.current).find(url => url.includes(item.id));
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl);
        createdUrlsRef.current.delete(existingUrl);
      }
    }
    
    const url = URL.createObjectURL(item.audioBlob);
    createdUrlsRef.current.add(url);
    return url;
  }, []);

  return {
    history,
    isLoading,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getAudioUrl,
  };
}
