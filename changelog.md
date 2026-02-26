# Changelog - AI Experiments

## 2026-02-26

### Qwen TTS Web Interface Project Started
- Explored existing `run_tts.py` CLI for Qwen3-TTS
- Researched web interface options: FastAPI+React vs Gradio
- Found reference: `groxaxo/Qwen3-TTS-Openai-Fastapi` (OpenAI-compatible API + web UI)
- Decided stack: FastAPI backend + custom React/TypeScript frontend (user's main tech)
- Features planned: Voice selection, Language picker, Voice settings (speed, pitch)
- Run mode: Local only

---

## 2026-02-?? (Earlier)

### Initial Setup
- Created `run_tts.py` - Python CLI for Qwen3-TTS
- Model: `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`
- Supports speakers: Vivian, Serena, Uncle_Fu, Dylan, Eric, Ryan, Aiden, Ono_Anna, Sohee
- Supports languages: Chinese, English, Japanese, Korean, German, French, Russian, Portuguese, Spanish, Italian
- Device: Auto-detect (MPS for M1 Ultra Mac)
