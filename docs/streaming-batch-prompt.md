# Prompt: Implementing Audio Streaming & Batch Processing for Qwen TTS

## Context
You are working on a FastAPI backend for Qwen TTS (text-to-speech). Currently, the `/tts` endpoint waits for the entire audio to be generated before returning it. This causes slow response times, especially for long text inputs.

Your task is to implement:
1. **Streaming audio chunks** - Send audio to the client as it's being generated, not all at once
2. **Batch processing** - Allow multiple TTS requests to be processed together for efficiency

---

## Part 1: Streaming Audio Chunks

### Why Stream?
- User gets faster feedback (audio starts playing sooner)
- Reduces memory usage (don't hold entire audio in memory)
- Better UX - feels more responsive

### How It Works
Instead of:
```
1. Receive full text
2. Generate ALL audio (wait 10-30 seconds)
3. Return entire WAV file
```

Do this:
```
1. Receive text
2. Start generating audio
3. Every N samples/chunks, yield to client
4. Client plays chunks as they arrive
```

### Implementation Approach

**Option A: Server-Sent Events (SSE)**
```python
from fastapi.responses import StreamingResponse
import asyncio

@app.post("/tts/stream")
async def stream_tts(request: TTSRequest):
    async def generate():
        model = load_model()
        wavs, sr = model.generate_custom_voice(...)
        
        # Stream in chunks
        chunk_size = 4096  # samples
        for i in range(0, len(wavs[0]), chunk_size):
            chunk = wavs[0][i:i+chunk_size]
            yield chunk.tobytes()
            await asyncio.sleep(0)  # Yield control
    
    return StreamingResponse(generate(), media_type="audio/wav")
```

**Option B: WebSocket**
```python
from fastapi import WebSocket

@app.websocket("/ws/tts")
async def websocket_tts(websocket: WebSocket):
    await websocket.accept()
    # Send chunks over websocket
```

### Challenges to Solve
- How to handle chunk boundaries (WAV headers)?
- What's the optimal chunk size?
- How to handle errors mid-stream?
- How to sync audio playback on frontend?

---

## Part 2: Batch Processing

### Why Batch?
- GPU is underutilized with single requests
- Can process multiple texts in parallel
- Better throughput for high-volume usage

### How It Works

**Current (Sequential):**
```
Request 1 → [Generate] → Response 1
Request 2 → [Generate] → Response 2
Request 3 → [Generate] → Response 3
Total: 30 seconds
```

**Batched:**
```
[Request 1, Request 2, Request 3] → [Batch Generate] → [Response 1, Response 2, Response 3]
Total: 12 seconds (parallelized)
```

### Implementation Approach

```python
from pydantic import BaseModel
from typing import List

class BatchTTSRequest(BaseModel):
    requests: List[TTSRequest]

class BatchTTSResponse(BaseModel):
    results: List[dict]  # Each with audio data or error

@app.post("/tts/batch")
async def batch_tts(batch: BatchTTSRequest):
    model = load_model()
    
    # Process all in parallel using asyncio.gather
    tasks = [
        generate_single(req) for req in batch.requests
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return {"results": results}
```

### Challenges to Solve
- How to handle different text lengths?
- What if one request fails?
- Maximum batch size limit?
- Queue system for overload protection?

---

## Your Task

1. Research and implement audio streaming using SSE or WebSocket
2. Add a `/tts/batch` endpoint for processing multiple requests
3. Update the frontend to handle streaming audio
4. Write tests for both features

## Files to Modify
- `backend/main.py` - Add streaming and batch endpoints
- `frontend/src/api.ts` - Update API calls for streaming
- `frontend/src/App.tsx` - Handle streaming audio playback

## References
- FastAPI StreamingResponse: https://fastapi.tiangolo.com/advanced/custom-response/
- Qwen TTS generation returns `(wavs, sr)` where `wavs` is a list of numpy arrays
- Use `soundfile` to write chunks to BytesIO

---

## Questions to Answer
1. Which streaming method (SSE vs WebSocket) is better for our use case?
2. How should the frontend handle incomplete chunks?
3. Should batch processing run in parallel or queue-based?
