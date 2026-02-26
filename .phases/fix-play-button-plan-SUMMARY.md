# Play Button Audio Playback Fix - Implementation Plan

## Problem Statement
Current behavior: TTS website downloads .wav file to user's device
Desired behavior: Play audio from media widget in the UI

## Root Cause Analysis

### Backend Issue
- **File**: `backend/main.py`
- **Line 431**: `headers={"Content-Disposition": f"attachment; filename=tts.wav"}`
- **Problem**: This header forces browser to download instead of play

### Frontend Status
- **Already correct**: Frontend creates blob URL and plays audio
- **File**: `frontend/src/App.tsx` (lines 73, 79, 234)
- No changes needed to frontend logic

## Work Waves

### Wave 1: Backend Fix
**File**: `.phases/fix-play-button-wave1-backend.md`

| Task | Description | Files Modified |
|------|-------------|----------------|
| 1.1 | Remove Content-Disposition header from /tts | backend/main.py |
| 1.2 | Verify endpoint returns audio/wav | backend/main.py |

**Dependencies**: None (first wave)

### Wave 2: Playwright Test
**File**: `.phases/fix-play-button-wave2-test.md`

| Task | Description | Files Modified |
|------|-------------|----------------|
| 2.1 | Update tts.spec.ts with audio playback test | frontend/e2e/tts.spec.ts |
| 2.2 | Handle audio generation timing | frontend/e2e/tts.spec.ts |

**Dependencies**: Wave 1 (backend fix must be applied first)

## Success Criteria

### Backend
- [ ] /tts endpoint returns audio without Content-Disposition: attachment
- [ ] Content-Type: audio/wav is still set

### Frontend
- [ ] Audio player widget visible after generation
- [ ] Audio plays from widget (not downloaded)

### Tests
- [ ] Playwright test inputs text
- [ ] Playwright test generates audio  
- [ ] Playwright test verifies audio plays from media widget

## Technical Notes

### Why This Fix Works
1. **Content-Disposition: attachment** tells browser "save this file to disk"
2. Removing it allows browser to handle response as streamable content
3. Frontend already has correct blob URL creation and audio playback code

### Alternative Solutions Considered
1. **Use /tts/stream endpoint**: Already works for streaming but different API
2. **Conditional header**: Could check Accept header for audio/* - but simpler to just remove

## Implementation Order
1. Apply Wave 1 (backend fix)
2. Run existing tests to verify no regression
3. Apply Wave 2 (new test)
4. Run full test suite
