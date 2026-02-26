---
wave: 2
depends_on:
  - fix-play-button-wave1-backend
files_modified:
  - frontend/e2e/tts.spec.ts
autonomous: false
---

# Plan: Add Playwright Test for Audio Playback Verification

## Objective
Add or update Playwright test to verify audio plays from the media widget in the UI (not downloaded).

## Context
- Backend fix in Wave 1 removes Content-Disposition: attachment
- Frontend already has correct audio playback code
- Need test that verifies actual playback from UI element

## Tasks

### Task 1: Update existing tts.spec.ts with audio playback test
<task>
<type>auto</type>
<description>Update tts.spec.ts to verify audio plays from the media widget by checking audio element state</description>
<verification>Run Playwright test and verify it passes</verification>
<done_criteria>
- [ ] Test inputs text into the text field
- [ ] Test generates audio (may take 10-20 seconds)
- [ ] Test verifies audio element is visible
- [ ] Test verifies audio is not downloading (no download attribute)
</done_criteria>
</task>

### Task 2: Verify test handles audio generation timing
<task>
<type>auto</type>
<description>Ensure the test waits appropriately for audio generation (10-20 seconds) and handles model loading</description>
<verification>Test runs successfully without timeout</verification>
<done_criteria>
- [ ] Test waits for generation to complete
- [ ] No false failures due to timing
</done_criteria>
</task>

## Verification Criteria
- [ ] Playwright test inputs text into text field
- [ ] Playwright test generates audio
- [ ] Playwright test verifies audio plays from media widget in UI
- [ ] Test passes successfully

## Must Haves (Goal-Backward)
- [ ] Text input field receives text
- [ ] Generate button triggers audio generation
- [ ] Audio player widget displays in UI
- [ ] Audio plays from widget (not downloaded to file)
