# Fix Audio Playlist Storage Issues - PLAN SUMMARY

## Issues Addressed

### Critical Issue 1: Audio Blobs NOT Being Stored
**Location**: `frontend/src/hooks/useAudioHistory.ts` (line 48)
**Problem**: 
```typescript
const itemToStore = { ...newItem };
delete itemToStore.audioBlob;  // ❌ Audio is removed before storing!
```
**Impact**: Users CANNOT replay history items after page refresh
**Fix**: Remove the delete line, store the full audioBlob in IndexedDB

### Critical Issue 2: Memory Leak Risk
**Location**: `frontend/src/hooks/useAudioHistory.ts` (lines 71-74)
**Problem**:
```typescript
const getAudioUrl = useCallback((item: AudioHistoryItem): string | null => {
  if (!item.audioBlob) return null;
  return URL.createObjectURL(item.audioBlob);  // Never revoked!
}, []);
```
**Impact**: Memory grows unbounded during extended playlist use
**Fix**: Add URL.revokeObjectURL cleanup in useEffect and before creating new URLs

### Issue 3: No Error Handling
**Location**: `frontend/src/audioHistoryDB.ts`
**Problem**: All IndexedDB operations lack try/catch
**Impact**: App crashes on quota exceeded or in private browsing
**Fix**: Add try/catch with QuotaExceededError handling and retry logic

---

## Implementation Plan

### Wave 1: Core Fixes
**Files Modified**:
- `frontend/src/audioHistoryDB.ts`
- `frontend/src/hooks/useAudioHistory.ts`

**Tasks**:
1. Fix audioHistoryDB.ts - Store Blobs and Add Error Handling
   - Add try/catch to all DB operations
   - Add QuotaExceededError handling with cleanup and retry
   - Add storage quota monitoring
   
2. Fix useAudioHistory.ts - Remove audioBlob Deletion and Add Memory Leak Prevention
   - Remove line that deletes audioBlob before storing
   - Add useEffect cleanup to revoke object URLs
   - Add error handling for DB operations

### Wave 2: Test Verification  
**Files Modified**:
- `frontend/e2e/playlist.spec.ts`

**Tasks**:
1. Update existing persistence test to verify audio replay after reload
2. Add new dedicated test: "should replay audio after page reload"

---

## Test Criteria

### Must Pass (Goal-Backward):
- [ ] Generate audio → reload page → can still play from playlist (CRITICAL)
- [ ] No memory leaks during extended use
- [ ] Graceful handling when storage quota exceeded

---

## Dependencies

- Wave 1 (Core Fixes) → Wave 2 (Test Verification)
- Wave 2 depends on Wave 1 completing so the test can verify the fix works
