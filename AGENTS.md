# AGENTS.md - Project Agents Configuration

## Scientific Memory Agent

This project uses a "scientific memory" pattern to maintain context across agent runs.

### Memory Agent Configuration

**Agent Type**: `gsd-codebase-mapper` (or general explore agent)

**Purpose**: Read the last entries of `changelog.md` to understand current project state before executing tasks.

**How to use**:
```
Before running any agent task, execute:
  Read the last 20 lines of changelog.md to understand current project status
```

**Memory File**: `changelog.md` (in project root)

**Reading Function**:
```bash
# Read last 20 lines of changelog
tail -n 20 changelog.md
```

---

## Project Stack

- **Backend**: FastAPI (Python) - for Qwen TTS API
- **Frontend**: React/TypeScript - for Google Translate-style UI
- **Model**: Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice
- **Target**: Local-only deployment

---

## Current Status (from changelog)

- Project: Qwen TTS Web Interface
- Phase: Research & Planning
- Next: Build FastAPI backend with OpenAI-compatible endpoints
