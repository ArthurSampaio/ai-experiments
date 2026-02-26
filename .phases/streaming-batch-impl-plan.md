---
wave: 1
depends_on: []
files_modified:
  - backend/main.py
autonomous: true
---

# Plan: Backend Streaming Endpoint (`/tts/stream`)

## Objective
Implement streaming audio endpoint that returns audio in chunks as it's generated using FastAPI StreamingResponse.

## Tasks

### Task 1.1: Add Streaming Request/Response Models
<task>
<type>auto</type>
<description>Add TTSStreamRequest model and update types.ts for frontend</description>
<verification>Models defined in main.py match the API contract from the prompt</verification>
<done_criteria>
- [ ] TTSStreamRequest model with text, speaker, language, speed, pitch, instruct fields
- [ ] Text max_length=5000 validation
- [ ] Speaker, language, speed, pitch validations match existing /tts endpoint
- [ ] Types added to frontend/src/types.ts
</done_criteria>
</task>

### Task 1.2: Implement Streaming Audio Generator
<task>
<type>auto</type>
<description>Create async generator that yields 8KB WAV chunks</description>
<verification>Verify the generator yields chunks correctly</verification>
<done_criteria>
- [ ] Async generator yields 8KB chunks
- [ ] WAV header (44 bytes) included at start
- [ ] Uses `await asyncio.sleep(0)` between chunks
- [ ] Handles client disconnection gracefully
</done_criteria>
</task>

### Task 1.3: Create `/tts/stream` Endpoint
<task>
<type>auto</type>
<description>Implement the streaming endpoint with proper headers</description>
<verification>Test endpoint with curl -I to check headers</verification>
<done_criteria>
- [ ] Returns HTTP 200 OK
- [ ] Content-Type: audio/wav header
- [ ] Transfer-Encoding: chunked header
- [ ] Validates speaker/language exist
- [ ] Returns 400 for invalid inputs with proper error messages
</done_criteria>
</task>

### Task 1.4: Test Streaming Endpoint
<task>
<type>checkpoint:human-verify</type>
<description>Verify streaming endpoint works with curl and soundfile</description>
<verification>Run validation commands from prompt</verification>
<done_criteria>
- [ ] `curl -X POST http://localhost:8000/tts/stream` returns 200
- [ ] Response has Transfer-Encoding: chunked
- [ ] Response has Content-Type: audio/wav
- [ ] WAV file is valid and playable (verify with soundfile)
- [ ] Latency < 5s for 100 char text
</done_criteria>
</task>

## Verification Criteria
- [ ] `/tts/stream` returns 200 OK
- [ ] Transfer-Encoding: chunked header present
- [ ] Content-Type: audio/wav
- [ ] Audio is valid WAV format (can decode with soundfile)
- [ ] Latency < 5s for short text

## Must Haves (Goal-Backward)
- [ ] Streaming endpoint functional and returns valid audio
- [ ] Error handling for invalid speaker/language
- [ ] Client disconnect handled gracefully

---

---
wave: 2
depends_on: [1]
files_modified:
  - backend/main.py
autonomous: true
---

# Plan: Backend Batch Processing Endpoint (`/tts/batch`)

## Objective
Implement batch processing endpoint that handles multiple TTS requests with concurrency limits and partial failure handling.

## Tasks

### Task 2.1: Add Batch Request/Response Models
<task>
<type>auto</type>
<description>Add BatchTTSRequest, BatchTTSResult, and BatchTTSResponse models</description>
<verification>Models match API contract from prompt</verification>
<done_criteria>
- [ ] BatchTTSRequest with requests list (max 10 items)
- [ ] BatchTTSResult with success, audio (base64), error, sample_rate
- [ ] BatchTTSResponse with results, completed_count, failed_count
- [ ] Validation: max 10 items enforced
</done_criteria>
</task>

### Task 2.2: Implement Batch Processing with Semaphore
<task>
<type>auto</type>
<description>Create batch processing logic with asyncio.Semaphore(2) for concurrency</description>
<verification>Verify concurrent processing works</verification>
<done_criteria>
- [ ] asyncio.Semaphore(2) limits concurrent GPU operations
- [ ] 120s timeout per item
- [ ] Partial failures handled (1 fail / 2 success returns mixed results)
- [ ] GPU OOM returns error without crashing
</done_criteria>
</task>

### Task 2.3: Create `/tts/batch` Endpoint
<task>
<type>auto</type>
<description>Implement the batch endpoint</description>
<verification>Test with valid and invalid inputs</verification>
<done_criteria>
- [ ] Returns HTTP 200 OK
- [ ] Returns 400 for batch size > 10
- [ ] Handles mixed valid/invalid requests
- [ ] Returns proper error structure for failed items
</done_criteria>
</task>

### Task 2.4: Test Batch Endpoint
<task>
<type>checkpoint:human-verify</type>
<description>Verify batch endpoint with various test cases</verification>
<verification>Run test scenarios</verification>
<done_criteria>
- [ ] 2 items returns 200 with 2 results
- [ ] 11 items returns 400 error
- [ ] 1 invalid + 1 valid returns mixed results
- [ ] Batch 3x faster than 3 sequential requests
</done_criteria>
</task>

## Verification Criteria
- [ ] `/tts/batch` returns 200 OK
- [ ] Max batch size (10) enforced
- [ ] Partial failure handling works
- [ ] Concurrent limit (2) works without OOM
- [ ] Response time improvement vs sequential

## Must Haves (Goal-Backward)
- [ ] Batch endpoint functional with proper error handling
- [ ] Concurrency limits prevent GPU OOM
- [ ] Partial failures don't break entire batch

---

---
wave: 3
depends_on: [1]
files_modified:
  - frontend/src/api.ts
  - frontend/src/types.ts
autonomous: true
---

# Plan: Frontend API Client Updates

## Objective
Add streaming and batch API functions to frontend.

## Tasks

### Task 3.1: Add Stream/Batch Types
<task>
<type>auto</type>
<description>Add TypeScript types for streaming and batch requests/responses</description>
<verification>Types match backend models</verification>
<done_criteria>
- [ ] TTSStreamRequest type added
- [ ] BatchTTSRequest type added
- [ ] BatchTTSResult type added
- [ ] BatchTTSResponse type added
</done_criteria>
</task>

### Task 3.2: Add streamTTS API Function
<task>
<type>auto</type>
<description>Add streamTTS function using fetch with ReadableStream</description>
<verification>Function can handle streaming response</verification>
<done_criteria>
- [ ] Uses fetch() not axios (better streaming support)
- [ ] Returns ReadableStream<Uint8Array>
- [ ] Handles errors properly
- [ ] Type-safe request/response
</done_criteria>
</task>

### Task 3.3: Add batchTTS API Function
<task>
<type>auto</type>
<description>Add batchTTS function for batch processing</description>
<verification>Function works with batch endpoint</verification>
<done_criteria>
- [ ] Accepts array of TTS requests
- [ ] Returns BatchTTSResponse
- [ ] Handles errors gracefully
- [ ] Type-safe
</done_criteria>
</task>

## Verification Criteria
- [ ] New API functions added to api.ts
- [ ] Types added to types.ts
- [ ] Functions are type-safe
- [ ] Functions handle errors properly

## Must Haves (Goal-Backward)
- [ ] Frontend can call streaming endpoint
- [ ] Frontend can call batch endpoint

---

---
wave: 4
depends_on: [3]
files_modified:
  - frontend/src/hooks/useStreamingAudio.ts (new)
autonomous: true
---

# Plan: Web Audio API Hook for Streaming

## Objective
Create a React hook that uses Web Audio API to play streamed audio chunks progressively.

## Tasks

### Task 4.1: Create useStreamingAudio Hook
<task>
<type>auto</type>
<description>Implement Web Audio API hook for streaming playback</description>
<verification>Hook handles streaming audio correctly</verification>
<done_criteria>
- [ ] Uses AudioContext for playback
- [ ] Buffers chunks and plays sequentially
- [ ] Monitors buffer state for loading indicator
- [ ] Handles errors gracefully
- [ ] Cleanup on unmount
</done_criteria>
</task>

### Task 4.2: Implement Chunk Buffering Logic
<task>
<type>auto</type>
<description>Buffer incoming chunks and decode for playback</description>
<verification>Audio plays smoothly without gaps</verification>
<done_criteria>
- [ ] Accumulates WAV chunks
- [ ] Decodes WAV data properly
- [ ] Plays audio as chunks become available
- [ ] No audio glitches or gaps
</done_criteria>
</task>

### Task 4.3: Add Loading/Error States
<task>
<type>auto</type>
<description>Expose loading and error states from hook</description>
<verification>States update correctly</verification>
<done_criteria>
- [ ] isLoading state during streaming
- [ ] isPlaying state during playback
- [ ] error state for failures
- [ ] Returns start/stop functions
</done_criteria>
</task>

## Verification Criteria
- [ ] Hook created at frontend/src/hooks/useStreamingAudio.ts
- [ ] Audio plays progressively
- [ ] Loading state is exposed
- [ ] Error handling works

## Must Haves (Goal-Backward)
- [ ] Streaming audio plays in frontend
- [ ] User can see loading state
- [ ] Errors displayed to user

---

---
wave: 5
depends_on: [4]
files_modified:
  - frontend/src/App.tsx
autonomous: true
---

# Plan: Frontend Streaming UI

## Objective
Add streaming button and UI controls to frontend for audio streaming.

## Tasks

### Task 5.1: Add Stream Button and Indicator
<task>
<type>auto</type>
<description>Add streaming button to input panel with loading indicator</description>
<verification>UI elements visible and functional</verification>
<done_criteria>
- [ ] Stream button added (class: stream-btn)
- [ ] Streaming indicator (class: streaming-indicator)
- [ ] Button disabled when no text
- [ ] Loading state visible during stream
</done_criteria>
</task>

### Task 5.2: Integrate useStreamingAudio Hook
<task>
<type>auto</type>
<description>Connect App.tsx to useStreamingAudio hook</description>
<verification>Streaming works end-to-end</verification>
<done_criteria>
- [ ] Stream button triggers streaming fetch
- [ ] Audio plays progressively
- [ ] Loading indicator shows during stream
- [ ] Error message on failure
</done_criteria>
</task>

### Task 5.3: Test Streaming UI
<task>
<type>checkpoint:human-verify</type>
<description>Verify streaming UI works in browser</verification>
<verification>Playwright test or manual verification</verification>
<done_criteria>
- [ ] Click stream button triggers network request
- [ ] Audio plays within 5s
- [ ] Loading indicator visible
- [ ] Error shows on failure
</done_criteria>
</task>

## Verification Criteria
- [ ] Streaming button triggers fetch
- [ ] Audio plays progressively (first sound < 5s)
- [ ] Loading indicator shows during stream
- [ ] Error message on failure

## Must Haves (Goal-Backward)
- [ ] User can stream audio from frontend
- [ ] Progressive playback works
- [ ] Visual feedback during streaming

---

---
wave: 6
depends_on: [3]
files_modified:
  - frontend/src/App.tsx
autonomous: true
---

# Plan: Frontend Batch UI

## Objective
Add batch processing UI to frontend for processing multiple TTS requests.

## Tasks

### Task 6.1: Add Batch Mode Toggle
<task>
<type>auto</type>
<description>Add toggle to switch between single/batch mode</description>
<verification>Toggle switches UI modes</verification>
<done_criteria>
- [ ] Batch toggle button (class: batch-toggle)
- [ ] Single mode shows one text input
- [ ] Batch mode shows multiple inputs (up to 10)
- [ ] Toggle is accessible and visible
</done_criteria>
</task>

### Task 6.2: Implement Batch Input List
<task>
<type>auto</type>
<description>Render multiple text inputs for batch mode</description>
<verification>Can add/remove batch inputs</verification>
<done_criteria>
- [ ] Multiple inputs (class: batch-input-0, batch-input-1, etc.)
- [ ] Add/remove input buttons
- [ ] Max 10 inputs enforced
- [ ] Each input has own settings (speaker, language, etc.)
</done_criteria>
</task>

### Task 6.3: Add Batch Submit and Results Display
<task>
<type>auto</type>
<description>Add batch submit button and results display</description>
<verification>Batch submission and results work</verification>
<done_criteria>
- [ ] Batch submit button (class: batch-submit)
- [ ] Results displayed (class: batch-result)
- [ ] Errors displayed (class: batch-error)
- [ ] Loading state during processing
</done_criteria>
</task>

### Task 6.4: Test Batch UI
<task>
<type>checkpoint:human-verify</type>
<description>Verify batch UI works</verification>
<verification>Playwright test or manual verification</verification>
<done_criteria>
- [ ] Can add 3 text inputs
- [ ] Submit returns 3 results
- [ ] No errors shown
- [ ] Batch mode toggles correctly
</done_criteria>
</task>

## Verification Criteria
- [ ] Batch toggle switches modes
- [ ] Can add up to 10 inputs
- [ ] Submit processes batch correctly
- [ ] Results display properly

## Must Haves (Goal-Backward)
- [ ] User can submit batch requests
- [ ] Results displayed for each item
- [ ] Errors handled and shown

---

---
wave: 7
depends_on: [1, 2, 5, 6]
files_modified:
  - frontend/e2e/streaming.spec.ts (new)
  - frontend/e2e/batch.spec.ts (new)
  - frontend/e2e/tts.spec.ts (update)
autonomous: true
---

# Plan: Playwright E2E Tests

## Objective
Create Playwright tests to verify streaming and batch functionality end-to-end.

## Tasks

### Task 7.1: Create Streaming E2E Test
<task>
<type>auto</type>
<description>Create streaming.spec.ts with full streaming flow test</description>
<verification>Test passes with running backend/frontend</verification>
<done_criteria>
- [ ] Test navigates to app
- [ ] Test enters text and clicks stream
- [ ] Test verifies streaming indicator visible
- [ ] Test verifies audio plays (audioMonitor fixture)
- [ ] Test verifies completion
</done_criteria>
</task>

### Task 7.2: Create Batch E2E Test
<task>
<type>auto</type>
<description>Create batch.spec.ts with full batch flow test</description>
<verification>Test passes with running backend/frontend</verification>
<done_criteria>
- [ ] Test opens batch mode
- [ ] Test adds 3 text inputs
- [ ] Test submits batch
- [ ] Test verifies 3 results appear
- [ ] Test verifies no errors
</done_criteria>
</task>

### Task 7.3: Add API Tests to Existing Suite
<task>
<type>auto</type>
<description>Add streaming and batch API tests to tts.spec.ts</description>
<verification>API tests pass</verification>
<done_criteria>
- [ ] Test /tts/stream returns 200 with audio/wav
- [ ] Test /tts/batch processes requests
- [ ] Tests use request.post() format
</done_criteria>
</task>

### Task 7.4: Run All Tests
<task>
<type>checkpoint:human-verify</type>
<description>Run all Playwright tests to verify implementation</verification>
<verification>All tests pass</verification>
<done_criteria>
- [ ] streaming.spec.ts passes
- [ ] batch.spec.ts passes
- [ ] tts.spec.ts passes (no regressions)
- [ ] npx playwright test exits with code 0
</done_criteria>
</task>

## Verification Criteria
- [ ] E2E streaming test passes
- [ ] E2E batch test passes
- [ ] No regressions on existing /tts tests
- [ ] All tests can run with npx playwright test

## Must Haves (Goal-Backward)
- [ ] Streaming E2E works
- [ ] Batch E2E works
- [ ] No existing test regressions

---

---
wave: 8
depends_on: [1, 2, 5, 6, 7]
files_modified:
  - backend/main.py
  - frontend/src/App.tsx
autonomous: true
---

# Plan: Final Verification & Cleanup

## Objective
Verify all success criteria pass and handle any remaining issues.

## Tasks

### Task 8.1: Run Backend Streaming Tests
<task>
<type>auto