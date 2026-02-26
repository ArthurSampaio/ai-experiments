# Research: Audio Playlist with IndexedDB in React

## Executive Summary

The current implementation has a **critical architectural issue**: audio Blobs are NOT being persisted to IndexedDB despite the feature's purpose being audio history. The code explicitly deletes the audioBlob before storage (line 47-48 in useAudioHistory.ts). Additionally, there are memory leak risks from unrevoked object URLs. The IndexedDB pattern using the `idb` library is sound, but error handling and quota management need improvement.

## Pitfalls to Avoid

### 1. **NOT Storing Audio Blobs in IndexedDB** (CRITICAL)
The current implementation removes audioBlob before storing:
```typescript
// In useAudioHistory.ts line 47-48
const itemToStore = { ...newItem };
delete itemToStore.audioBlob;  // THIS REMOVES THE AUDIO!
await audioHistoryDB.add(itemToStore);
```
**Impact**: Playlist items cannot be replayed after page refresh because the audio data is not persisted.

### 2. **Memory Leaks from Unrevoked Object URLs**
The `getAudioUrl` function creates object URLs without cleanup:
```typescript
// In useAudioHistory.ts line 71-74
const getAudioUrl = useCallback((item: AudioHistoryItem): string | null => {
  if (!item.audioBlob) return null;
  return URL.createObjectURL(item.audioBlob);  // Never revoked!
}, []);
```
**Impact**: Memory grows over time as users play more tracks. Each URL holds blob data in memory until page refresh.

### 3. **No IndexedDB Error Handling**
The database operations have no try/catch for QuotaExceededError or other IndexedDB failures:
```typescript
// In audioHistoryDB.ts - all methods lack error handling
async add(item: AudioHistoryItem): Promise<void> {
  const db = await getDB();
  // No try/catch - will throw on quota error
  await db.put(STORE_NAME, item);
}
```
**Impact**: App crashes when storage quota is exceeded or in private browsing mode.

### 4. **Missing useEffect Cleanup for Audio Element**
App.tsx creates audio elements and event listeners without cleanup on unmount:
```typescript
// In App.tsx line 96-101
const audio = new Audio(url);
audio.addEventListener('loadedmetadata', () => {
  // No cleanup
});
```
**Impact**: Potential memory leaks and orphaned event listeners when component remounts.

## Anti-Patterns

### 1. **Storing Metadata Only, Not Binary Data**
Separating metadata from audio data means the audio is lost on refresh. This defeats the purpose of a "history" feature.

**Better approach**: Store the complete AudioHistoryItem including audioBlob in IndexedDB.

### 2. **Creating Object URLs Without Lifecycle Management**
Creating URLs inline in render or callbacks without tracking and revoking them.

**Better approach**: Use a useRef to track created URLs and revoke them in useEffect cleanup.

### 3. **No Quota Management Strategy**
Only limiting by entry count (MAX_ENTRIES=30) doesn't account for varying audio file sizes.

**Better approach**: Implement storage quota monitoring using `navigator.storage.estimate()` and handle QuotaExceededError gracefully.

## Best Practices

### 1. **Store Audio Blobs in IndexedDB**
IndexedDB is designed for binary data. Storing audio Blobs directly is the correct approach:
```typescript
async add(item: AudioHistoryItem): Promise<void> {
  const db = await getDB();
  // Store the complete item including audioBlob
  await db.put(STORE_NAME, item);
}
```

### 2. **Implement Proper Object URL Lifecycle**
```typescript
// Track created URLs for cleanup
const createdUrlsRef = useRef<Set<string>>(new Set());

const getAudioUrl = useCallback((item: AudioHistoryItem): string | null => {
  if (!item.audioBlob) return null;
  const url = URL.createObjectURL(item.audioBlob);
  createdUrlsRef.current.add(url);
  return url;
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => {
    createdUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
  };
}, []);
```

### 3. **Add IndexedDB Error Handling with Quota Management**
```typescript
async add(item: AudioHistoryItem): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, item);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Remove oldest entries and retry
      await this.evictOldEntries(1);
      await db.put(STORE_NAME, item);
    } else {
      throw error;
    }
  }
}

// Monitor storage usage
async checkStorageQuota(): Promise<{used: number; quota: number}> {
  const estimate = await navigator.storage.estimate();
  return { used: estimate.usage || 0, quota: estimate.quota || 0 };
}
```

### 4. **Use the idb Library for Promisified IndexedDB**
The current use of the `idb` library is correct. It provides a clean Promise-based API over the callback-based IndexedDB API.

### 5. **Limit Entry Count Based on Storage**
```typescript
const MAX_STORAGE_MB = 50; // Target max storage

async add(item: AudioHistoryItem): Promise<void> {
  const { used, quota } = await this.checkStorageQuota();
  const usedMB = (used || 0) / (1024 * 1024);
  
  if (usedMB > MAX_STORAGE_MB) {
    await this.evictOldEntries(5); // Remove 5 oldest
  }
  // ... rest of add logic
}
```

## Technical Considerations

### IndexedDB Storage Limits
| Browser | Approximate Limit |
|---------|------------------|
| Chrome/Chromium | ~80% of free disk space (often 60GB+) |
| Firefox | ~2GB desktop, ~5MB initial on mobile |
| Safari (iOS) | ~1GB per origin |
| Edge | Similar to Chrome |

### Storage Estimation API
```typescript
const estimate = await navigator.storage.estimate();
console.log(`Used: ${estimate.usage} bytes`);
console.log(`Quota: ${estimate.quota} bytes`);
```

### Private Browsing Mode
- Safari and some browsers block IndexedDB in private/incognito mode
- Always have fallback in-memory state
- Show appropriate UI message when storage unavailable

### Blob Lifecycle
- Blobs stored in IndexedDB persist across sessions
- Object URLs created from stored Blobs work like any other Blob URL
- Always revoke object URLs when no longer needed to prevent memory leaks

## Recommendations for Planner

### Priority 1 (Critical)
1. **Fix audioBlob storage**: Remove the `delete itemToStore.audioBlob` line and store the complete item
2. **Add object URL cleanup**: Implement proper URL.revokeObjectURL lifecycle management
3. **Add IndexedDB error handling**: Wrap operations in try/catch, handle QuotaExceededError

### Priority 2 (Important)
4. **Add storage quota monitoring**: Implement `navigator.storage.estimate()` usage
5. **Add delete confirmation**: Implement a confirmation dialog before deleting items
6. **Add play/pause controls in playlist**: Show pause icon when track is playing, allow toggling

### Priority 3 (Nice to Have)
7. **Add "Clear All" button**: With confirmation dialog
8. **Add storage usage indicator**: Show users how much space is used
9. **Implement retry logic**: For transient IndexedDB errors

### Code Changes Required
1. `useAudioHistory.ts`: 
   - Remove audioBlob deletion (line 47-48)
   - Add URL cleanup logic with useRef
   
2. `audioHistoryDB.ts`:
   - Add try/catch with QuotaExceededError handling
   - Add storage estimation helper
   
3. `AudioPlaylist.tsx`:
   - Add delete confirmation dialog
   - Consider adding play/pause toggle state

4. `App.tsx`:
   - Add cleanup for audio element event listeners
