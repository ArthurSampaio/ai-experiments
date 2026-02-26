---
wave: 1
depends_on: []
files_modified:
  - backend/main.py
autonomous: true
---

# Plan: Fix Backend Content-Disposition Header

## Objective
Remove the Content-Disposition: attachment header from the /tts endpoint to allow browsers to play audio inline instead of downloading.

## Tasks

### Task 1: Remove Content-Disposition from /tts endpoint
<task>
<type>auto</type>
<description>Modify backend/main.py to remove Content-Disposition: attachment header from /tts endpoint, allowing browsers to play audio inline</description>
<verification>Check that /tts endpoint response headers no longer contain Content-Disposition: attachment</verification>
<done_criteria>
- [ ] backend/main.py line 431 modified
- [ ] /tts endpoint returns audio without download header
</done_criteria>
</task>

### Task 2: Verify backend endpoint still returns audio/wav content-type
<task>
<type>auto</type>
<description>Confirm the /tts endpoint still returns correct audio/wav content-type for browser playback</description>
<verification>Check Content-Type header is audio/wav</verification>
<done_criteria>
- [ ] /tts endpoint returns Content-Type: audio/wav
- [ ] No Content-Disposition header present
</done_criteria>
</task>

## Verification Criteria
- [ ] Backend /tts endpoint returns audio without Content-Disposition: attachment header
- [ ] Browser will receive audio as streamable content

## Must Haves (Goal-Backward)
- [ ] Frontend can play audio from /tts endpoint response
- [ ] No file download triggered by backend headers
- [ ] Existing functionality preserved (same audio output)
