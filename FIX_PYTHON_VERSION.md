# Fix: Backend Python Version Issue

## Problem
The backend cannot start because it requires **Python 3.10+** but the system has Python 3.9. The qwen_tts library uses `str | None` syntax (PEP 604) which requires Python 3.10+.

Current error:
```
TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'
```

## Solution

### Step 1: Install Python 3.11 via Homebrew
```bash
brew install python@3.11
```

### Step 2: Create a virtual environment with Python 3.11
```bash
cd /Users/arthursampaio/Documents/dev/ai-experiments/backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 3: Fix transformers version compatibility
```bash
pip install --upgrade transformers
pip install sox
```

### Step 4: Run the backend
```bash
python main.py
```

### Step 5: Verify the fix
```bash
curl -v -X POST http://localhost:8000/tts -H "Content-Type: application/json" -d '{"text":"hi","speaker":"Ryan","language":"English","speed":1,"pitch":1}' 2>&1 | grep -E "^<"
```

Expected: No `content-disposition: attachment` header in response.

## What was already fixed
- The Content-Disposition header has already been removed from `/tts` and `/speech` endpoints in `backend/main.py` (commit 54e03ea)
- The Playwright test has been updated to verify audio plays from UI
- Once Python version is fixed and backend runs, audio will play from UI instead of downloading
