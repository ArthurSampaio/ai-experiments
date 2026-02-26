# Prompt: Implementing Audio Streaming & Batch Processing for Qwen TTS

## Context

You are working on a FastAPI backend for Qwen TTS (text-to-speech). Currently, the `/tts` endpoint waits for the entire audio to be generated before returning it. This causes slow response times, especially for long text inputs.

Your task is to implement:
1. **Streaming audio chunks** - Send audio to the client as it's being generated, not all at once
2. **Batch processing** - Allow multiple TTS requests to be processed together for efficiency

---

## Success Criteria (RALPH Method)

Define each criterion with PASS/FAIL conditions that can be automatically verified:

### Backend Streaming Endpoint
| Criterion | Pass Condition | Test Method |
|-----------|----------------|--------------|
| `/tts/stream` returns 200 OK | HTTP 200 response | `curl -X POST http://localhost:8000/tts/stream -d '{...}'` |
| Response uses chunked transfer | `Transfer-Encoding: chunked` header present | `curl -I -X POST http://localhost:8000/tts/stream -d '{...}'` |
| Response content-type is audio/wav | `audio/wav` in Content-Type | Check headers |
| Audio is playable WAV format | Can decode with `sf.read()` | Python soundfile test |
| Latency < 5s for 100 char text | First byte received < 5s | Time measurement |

### Backend Batch Endpoint
| Criterion | Pass Condition | Test Method |
|-----------|----------------|--------------|
| `/tts/batch` returns 200 OK | HTTP 200 response | API test |
| Max batch size enforced | 11 items returns 400 | Send 11 items |
| Partial failure handling | 1 fail / 2 success returns mixed | Send invalid + valid |
| Concurrent limit works | 3 requests complete without OOM | Stress test |
| Response time improvement | Batch 3x faster than 3 sequential | Time comparison |

### Frontend Streaming
| Criterion | Pass Condition | Test Method |
|-----------|----------------|--------------|
| Streaming button triggers fetch | Network request sent | Playwright network intercept |
| Audio plays progressively | First sound < 5s after click | Playwright audio monitor |
| Loading indicator shows | Visible during stream | Visual assertion |
| Error shows on failure | Error message displayed | Trigger invalid request |

### Integration Tests (Playwright)
| Criterion | Pass Condition | Test Method |
|-----------|----------------|--------------|
| E2E streaming works | Full flow: input → stream → play | `npx playwright test e2e/streaming.spec.ts` |
| E2E batch works | Full flow: 3 inputs → results | `npx playwright test e2e/batch.spec.ts` |
| No regressions | Existing `/tts` still works | Run existing tests |

---

## Technical Specifications

### API Contract

**Streaming Request:**
```python
class TTSStreamRequest(BaseModel):
    text: str = Field(..., max_length=5000)
    speaker: str = Field(default="Ryan")
    language: str = Field(default="English")
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    pitch: float = Field(default=1.0, ge=0.5, le=2.0)
    instruct: Optional[str] = None
```

**Streaming Response:**
- `Content-Type: audio/wav`
- `Transfer-Encoding: chunked`
- Body: WAV file streamed in 8KB chunks

**Batch Request:**
```python
class BatchTTSRequest(BaseModel):
    requests: List[TTSStreamRequest] = Field(..., max_length=10)
```

**Batch Response:**
```python
class BatchTTSResult(BaseModel):
    success: bool
    audio: Optional[str] = None  # base64 encoded
    error: Optional[str] = None
    sample_rate: Optional[int] = None

class BatchTTSResponse(BaseModel):
    results: List[BatchTTSResult]
    completed_count: int
    failed_count: int
```

### Implementation Details

**Streaming (FastAPI StreamingResponse):**
- Use `StreamingResponse` with async generator
- Yield 8KB chunks of WAV data
- Include WAV header (44 bytes) at start of stream
- Use `await asyncio.sleep(0)` to yield control between chunks

**Batch Processing:**
- Max 10 items per batch (enforced)
- Use `asyncio.Semaphore(2)` to limit concurrent GPU operations
- 120s timeout per item
- Return mixed results (success + failures)

**Frontend (React + Web Audio API):**
- Use `fetch()` with streaming
- Use `AudioContext` to play chunks
- Monitor buffer and show loading state
- Handle errors gracefully

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/main.py` | Add `/tts/stream` and `/tts/batch` endpoints |
| `frontend/src/api.ts` | Add `streamTTS()` and `batchTTS()` functions |
| `frontend/src/hooks/useStreamingAudio.ts` | New - Web Audio API hook |
| `frontend/src/App.tsx` | Add streaming and batch UI controls |
| `frontend/e2e/streaming.spec.ts` | New - Playwright streaming tests |
| `frontend/e2e/batch.spec.ts` | New - Playwright batch tests |

---

## Key Constraints

1. **Qwen TTS generates full audio in one call** - True streaming during generation is NOT possible. Stream the result after generation completes.
2. **Sample rate**: Use `sr` returned from model (typically 24000 Hz)
3. **Existing code**: The singleton model loading in `backend/main.py` is correct - do NOT change it
4. **Frontend**: Use existing UI patterns from `frontend/src/App.tsx`

---

## Testing Requirements

### Playwright Tests (Non-Negotiable)

Create `frontend/e2e/streaming.spec.ts`:
```typescript
test('should stream audio and play progressively', async ({ page }) => {
  // 1. Navigate to app
  await page.goto('http://localhost:5173');
  
  // 2. Wait for backend connection
  await page.waitForSelector('.speaker-select', { timeout: 10000 });
  
  // 3. Enter text
  await page.fill('.text-input', 'Hello world');
  
  // 4. Click stream button
  await page.click('.stream-btn');
  
  // 5. Verify streaming started (loading indicator)
  await expect(page.locator('.streaming-indicator')).toBeVisible();
  
  // 6. Verify audio plays within 10s (use audio monitor fixture)
  const audioMonitor = page.audioMonitor();
  await expect(audioMonitor.getPlayedSounds()).resolves.toBeTruthy();
  
  // 7. Verify completion
  await expect(page.locator('.streaming-indicator')).toBeHidden({ timeout: 30000 });
});
```

Create `frontend/e2e/batch.spec.ts`:
```typescript
test('should process batch requests', async ({ page }) => {
  // 1. Navigate to app
  await page.goto('http://localhost:5173');
  
  // 2. Open batch mode
  await page.click('.batch-toggle');
  
  // 3. Add 3 text inputs
  await page.fill('.batch-input-0', 'First text');
  await page.fill('.batch-input-1', 'Second text');
  await page.fill('.batch-input-2', 'Third text');
  
  // 4. Submit batch
  await page.click('.batch-submit');
  
  // 5. Verify all 3 results appear
  await expect(page.locator('.batch-result')).toHaveCount(3);
  
  // 6. Verify no errors
  await expect(page.locator('.batch-error')).toHaveCount(0);
});
```

### API Tests

Add to existing `frontend/e2e/tts.spec.ts`:
```typescript
test('should stream audio via API', async ({ request }) => {
  const response = await request.post('http://localhost:8000/tts/stream', {
    data: { text: 'Hello', speaker: 'Ryan', language: 'English' }
  });
  
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('audio/wav');
});

test('should handle batch request', async ({ request }) => {
  const response = await request.post('http://localhost:8000/tts/batch', {
    data: {
      requests: [
        { text: 'One', speaker: 'Ryan', language: 'English' },
        { text: 'Two', speaker: 'Vivian', language: 'English' }
      ]
    }
  });
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.results).toHaveLength(2);
  expect(data.completed_count).toBe(2);
});
```

---

## Error Handling Requirements

| Scenario | Expected Behavior |
|----------|-------------------|
| Model not loaded | Auto-load before generation |
| Invalid speaker | 400 with available speakers list |
| Invalid language | 400 with available languages list |
| Text too long (>5000) | 400 with max length message |
| Batch size > 10 | 400 with max batch size message |
| Client disconnects mid-stream | Generator stops gracefully |
| GPU OOM | Return error, don't crash |

---

## Validation Commands

Run these to verify implementation:

```bash
# Backend tests
curl -X POST http://localhost:8000/tts/stream \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello","speaker":"Ryan","language":"English"}' \
  -o test_stream.wav

# Verify WAV is valid
python3 -c "import soundfile as sf; data, sr = sf.read('test_stream.wav'); print(f'Valid WAV: {len(data)} samples at {sr}Hz')"

# Playwright tests
cd frontend && npx playwright test e2e/streaming.spec.ts e2e/batch.spec.ts
```

---

## Questions to Answer (For Research Phase)

1. Which streaming method (SSE vs WebSocket vs StreamingResponse) is best for our use case?
   - **Answer**: Use `StreamingResponse` - simplest for one-way audio streaming
   
2. How should frontend handle streaming audio chunks?
   - **Answer**: Use Web Audio API with AudioContext, buffer chunks, play sequentially

3. Should batch processing run in parallel or queue-based?
   - **Answer**: Use semaphore-limited parallel (max 2 concurrent) - balances throughput with GPU memory

---

## Definition of Done

All success criteria pass AND:
- [ ] Backend `/tts/stream` endpoint working
- [ ] Backend `/tts/batch` endpoint working  
- [ ] Frontend streaming UI and playback working
- [ ] Frontend batch UI working
- [ ] Playwright E2E tests passing
- [ ] No regressions on existing `/tts` endpoint
- [ ] Lint passes: `npm run lint` (frontend), `ruff check` (backend)
