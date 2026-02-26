---
wave: 2
depends_on: ["fix-audio-playlist-storage-wave1"]
files_modified:
  - frontend/e2e/playlist.spec.ts
autonomous: true
---

# Plan: Add Playwright Test for Audio Replay After Reload

## Objective
Add a specific Playwright test that verifies audio can actually be replayed after page reload, not just that the playlist item persists. This is the critical user-facing bug that needs verification.

## Tasks

### Task 1: Update playlist.spec.ts - Add Replay After Reload Test
<task>
<type>auto</type>
<description>Update the existing "should persist playlist across page reloads" test to verify audio replay works, and add a new dedicated test for replay verification</description>
<verification>
- Read playlist.spec.ts and verify new test exists
- Verify test clicks playlist item after reload and audio plays
</verification>
<done_criteria>
- [ ] Existing persistence test updated to verify audio replay works after reload
- [ ] New test added: "should replay audio after page reload"
- [ ] Test verifies clicking playlist item after reload triggers audio playback
- [ ] Tests pass when run with `npx playwright test e2e/playlist.spec.ts`
</done_criteria>
</task>

## Verification Criteria
- [ ] New test fails before the fix (confirming it catches the bug)
- [ ] New test passes after the fix (confirming audio replays)
- [ ] All existing tests still pass

## Must Haves (Goal-Backward)
- [ ] Automated test confirms users can replay audio from history after page reload
- [ ] Test catches the audioBlob deletion bug (will fail before fix)
