---
wave: 1
depends_on: []
files_modified:
  - frontend/src/audioHistoryDB.ts
  - frontend/src/hooks/useAudioHistory.ts
autonomous: true
---

# Plan: Fix Critical Audio Playlist Storage Issues

## Objective
Fix critical bugs that prevent audio replay after page refresh and cause memory leaks. The audioBlob is currently being deleted before storage, making history replay impossible. Also fix missing error handling for IndexedDB operations.

## Tasks

### Task 1: Fix audioHistoryDB.ts - Store Blobs and Add Error Handling
<task>
<type>auto</type>
<description>Update audioHistoryDB.ts to properly store audio blobs, add try/catch with QuotaExceededError handling, and add storage quota monitoring</description>
<verification>
- Read audioHistoryDB.ts and verify all IndexedDB operations have try/catch
- Verify storage quota estimation function exists
- Verify QuotaExceededError handling removes old entries and retries
</verification>
<done_criteria>
- [ ] All DB operations wrapped in try/catch
- [ ] QuotaExceededError handling with automatic cleanup and retry
- [ ] Storage quota monitoring function added (using navigator.storage.estimate)
- [ ] Console warnings when storage is running low (>80% usage)
</done_criteria>
</task>

### Task 2: Fix useAudioHistory.ts - Remove audioBlob Deletion and Add Memory Leak Prevention
<task>
<type>auto</type>
<description>Fix useAudioHistory.ts to properly store audio blobs (remove the line that deletes them) and add URL.revokeObjectURL cleanup to prevent memory leaks</description>
<verification>
- Read useAudioHistory.ts and verify audioBlob is NOT deleted before storing
- Verify URL.revokeObjectURL is called when URLs are no longer needed
- Verify error handling exists for DB operations
</verification>
<done_criteria>
- [ ] Removed line that deletes audioBlob before storing (line 48: delete itemToStore.audioBlob)
- [ ] Added useEffect cleanup to revoke object URLs when component unmounts
- [ ] Added cleanup for old URLs before creating new ones in getAudioUrl
- [ ] Added try/catch for addToHistory, removeFromHistory, clearHistory
</done_criteria>
</task>

## Verification Criteria
- [ ] Audio blob is stored in IndexedDB (verify in browser DevTools > IndexedDB)
- [ ] Audio replays correctly after page reload (manual test)
- [ ] No memory leaks from URL.createObjectURL (verify in Chrome DevTools > Memory)
- [ ] App handles quota exceeded gracefully (test by filling storage)

## Must Haves (Goal-Backward)
- [ ] Users can replay any audio from history after page refresh
- [ ] No memory leaks during extended playlist use
- [ ] App doesn't crash in private browsing mode (IndexedDB may have limited quota)
- [ ] Old entries auto-deleted when storage quota exceeded
