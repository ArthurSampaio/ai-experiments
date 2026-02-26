# Changelog - AI Experiments

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
