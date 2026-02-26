# Changelog - AI Experiments

## 2026-02-26 (continued)

### Audio Playlist / History Feature
- Added audio history/playlist below the audio widget (Spotify/Apple Music style)
- IndexedDB storage with 30-item limit and FIFO overflow
- Each entry includes: text preview (40 chars), language, voice, timestamp, duration
- Click any playlist item to play that audio
- Auto-play new audio when generated + added to playlist
- playlist item (tr Delete button on eachash icon)
- Persists across page reloads

#### Implementation Details
- Added `idb` library for IndexedDB operations
- New files:
  - `src/audioHistoryDB.ts` - IndexedDB service
  - `src/hooks/useAudioHistory.ts` - React hook for history management
  - `src/components/AudioPlaylist.tsx` - Playlist UI component
  - `src/components/AudioPlaylist.css` - Playlist styles
- Updated files:
  - `src/types.ts` - Added AudioHistoryItem type
  - `src/App.tsx` - Integrated playlist
  - `src/App.css` - Added playlist spacing
  - `package.json` - Added idb dependency
- Added `e2e/playlist.spec.ts` - Playwright tests

#### Test Coverage
- Empty playlist display
- Adding audio to playlist
- Multiple audios in order
- Metadata display
- Play from playlist
- Delete from playlist
- Currently playing highlight
- Persistence across reloads

### Audio Streaming & Batch Processing Implementation
- Implemented multi-agent workflow (prompt-builder → researcher → planner → builder → verifier)
- Original prompt scored 3/10, improved v2 scored 8.5/10 with RALPH success criteria

#### Backend Streaming & Batch Endpoints (Done)
- POST /tts/stream - Streaming TTS with chunked audio response
- POST /tts/batch - Batch processing with Semaphore(2) concurrency limit
- Both support speed and pitch adjustments

#### Frontend Streaming & Batch UI (Done)
- useStreamingAudio hook using Web Audio API for progressive playback
- Streaming UI panel with real-time playback
- Batch processing UI with request queue and progress

#### E2E Tests (Playwright)
- Added streaming.spec.ts, batch.spec.ts, tts.spec.ts
- Fixed: Downgraded Playwright to 1.57.0 (1.58.0 has ESM bug)
- Backend verified working: /health, /v1/speakers, /v1/languages, /tts, /tts/stream, /tts/batch
- Added Python test script (test_backend.py) for quick verification

### Verification Results
- ✅ Backend health: healthy, model_loaded: true, device: mps
- ✅ 9 speakers, 10 languages available
- ✅ /tts endpoint generates audio (499KB)
- ✅ /tts/stream endpoint streams audio (chunked)
- ✅ /tts/batch endpoint processes multiple requests

### Bug Fixes (2026-02-26)
- Fixed App.tsx JSX structure (streaming/batch UI additions broke the markup)
- Fixed useStreamingAudio.ts TypeScript errors (reader.read() type issues)
- Restored App.tsx to working version from commit a4b4435
- Frontend now builds and runs successfully

---

## 2026-02-26

### Qwen TTS Web Interface Project Started
- Explored existing `run_tts.py` CLI for Qwen3-TTS
- Researched web interface options: FastAPI+React vs Gradio
- Found reference: `groxaxo/Qwen3-TTS-Openai-Fastapi` (OpenAI-compatible API + web UI)
- Decided stack: FastAPI backend + custom React/TypeScript frontend (user's main tech)
- Features planned: Voice selection, Language picker, Voice settings (speed, pitch)
- Run mode: Local only

#### Backend Implementation (Done)
- FastAPI server at `backend/main.py` with endpoints:
  - POST /tts - Extended TTS with speaker, language, speed, pitch
  - POST /v1/audio/speech - OpenAI-compatible endpoint
  - GET /v1/speakers - List available speakers
  - GET /v1/languages - List supported languages
  - GET /health - Health check
- Speakers: Ryan, Vivian, Serena, Dylan, Eric, Aiden, Uncle_Fu, Ono_Anna, Sohee
- Languages: English, Chinese, Japanese, Korean, German, French, Russian, Portuguese, Spanish, Italian

#### Frontend Implementation (Done)
- Created `frontend/` with Vite + React + TypeScript
- Dependencies: axios, allotment (split-pane)
- Split-pane layout (Google Translate style):
  - Left panel: Text input + language picker + voice selector + speed/pitch sliders
  - Right panel: Audio player + download button
- Integrates with backend at http://localhost:8000
- Loading states and error handling
- Run: `cd frontend && bun dev`

---

## 2026-02-?? (Earlier)

### Initial Setup
- Created `run_tts.py` - Python CLI for Qwen3-TTS
- Model: `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`
- Supports speakers: Vivian, Serena, Uncle_Fu, Dylan, Eric, Ryan, Aiden, Ono_Anna, Sohee
- Supports languages: Chinese, English, Japanese, Korean, German, French, Russian, Portuguese, Spanish, Italian
- Device: Auto-detect (MPS for M1 Ultra Mac)
