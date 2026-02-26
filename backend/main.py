#!/usr/bin/env python3
"""
FastAPI server for Qwen TTS - OpenAI-compatible API
"""

import io
import os
import time
import threading
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# Global model instance and lock
_model = None
_model_lock = threading.Lock()
_model_loaded = False


def get_device() -> str:
    """Determine the best available device."""
    import torch

    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"


def load_model() -> Any:
    """Load the Qwen TTS model (singleton pattern)."""
    global _model, _model_loaded

    if _model_loaded and _model is not None:
        return _model

    with _model_lock:
        if _model_loaded and _model is not None:
            return _model

        print("Loading Qwen TTS model...")
        start = time.time()

        try:
            import torch
            from qwen_tts import Qwen3TTSModel

            device = get_device()
            print(f"Using device: {device}")

            _model = Qwen3TTSModel.from_pretrained(
                "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
                device_map=device,
                dtype=torch.float16,
            )
            _model_loaded = True
            print(f"Model loaded in {time.time() - start:.2f}s")

        except Exception as e:
            print(f"Error loading model: {e}")
            print("Trying with CPU fallback...")

            import torch
            from qwen_tts import Qwen3TTSModel

            _model = Qwen3TTSModel.from_pretrained(
                "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
                device_map="cpu",
                dtype=torch.float32,
            )
            _model_loaded = True
            print(f"Model loaded (CPU) in {time.time() - start:.2f}s")

        return _model


# Speakers and languages from the model
SPEAKERS = [
    "Ryan",
    "Vivian",
    "Serena",
    "Dylan",
    "Eric",
    "Aiden",
    "Uncle_Fu",
    "Ono_Anna",
    "Sohee",
]

LANGUAGES = [
    "English",
    "Chinese",
    "Japanese",
    "Korean",
    "German",
    "French",
    "Russian",
    "Portuguese",
    "Spanish",
    "Italian",
]


# ============ FastAPI App ============

app = FastAPI(
    title="Qwen TTS API",
    description="OpenAI-compatible Text-to-Speech API using Qwen3-TTS",
    version="1.0.0",
)


# ============ Models ============


class SpeechRequest(BaseModel):
    """OpenAI-compatible /v1/audio/speech request."""

    model: str = Field(default="qwen-tts", description="Model identifier")
    input: str = Field(..., description="Text to synthesize")
    voice: str = Field(default="alloy", description="Voice (speaker) to use")
    response_format: str = Field(default="wav", description="Audio format")
    speed: float = Field(default=1.0, ge=0.25, le=4.0, description="Speech speed")
    pitch: float = Field(default=1.0, ge=0.5, le=2.0, description="Voice pitch")


class TTSRequest(BaseModel):
    """Extended TTS request with more options."""

    text: str = Field(..., description="Text to synthesize")
    speaker: str = Field(default="Ryan", description="Speaker name")
    language: str = Field(default="English", description="Language")
    speed: float = Field(default=1.0, ge=0.25, le=4.0, description="Speech speed")
    pitch: float = Field(default=1.0, ge=0.5, le=2.0, description="Voice pitch")
    instruct: Optional[str] = Field(default=None, description="Style instruction")


class VoiceItem(BaseModel):
    """Voice item for listing."""

    id: str
    name: str
    description: str


# ============ Helper Functions ============


def map_voice_to_speaker(voice: str) -> str:
    """Map OpenAI voice names to Qwen speakers."""
    # OpenAI voice names: alloy, echo, fable, onyx, nova, shimmer
    voice_map = {
        "alloy": "Ryan",
        "echo": "Vivian",
        "fable": "Serena",
        "onyx": "Dylan",
        "nova": "Eric",
        "shimmer": "Aiden",
    }
    return voice_map.get(voice.lower(), "Ryan")


# ============ Endpoints ============


@app.get("/")
async def root():
    """Root endpoint."""
    return {"name": "Qwen TTS API", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "model_loaded": _model_loaded, "device": get_device()}


@app.get("/v1/models")
async def list_models():
    """List available models."""
    return {
        "object": "list",
        "data": [
            {
                "id": "qwen-tts",
                "object": "model",
                "created": 1700000000,
                "owned_by": "qwen",
            }
        ],
    }


@app.get("/v1/voices")
async def list_voices():
    """List available voices (speakers)."""
    voices = [
        {"id": "alloy", "name": "Alloy", "description": "Versatile male voice"},
        {"id": "echo", "name": "Echo", "description": "Warm female voice"},
        {"id": "fable", "name": "Fable", "description": "Expressive female voice"},
        {"id": "onyx", "name": "Onyx", "description": "Deep male voice"},
        {"id": "nova", "name": "Nova", "description": "Energetic female voice"},
        {"id": "shimmer", "name": "Shimmer", "description": "Soft female voice"},
        {"id": "ryan", "name": "Ryan", "description": "Qwen default male voice"},
        {"id": "vivian", "name": "Vivian", "description": "Qwen female voice"},
        {"id": "serena", "name": "Serena", "description": "Qwen female voice"},
        {"id": "dylan", "name": "Dylan", "description": "Qwen male voice"},
        {"id": "eric", "name": "Eric", "description": "Qwen male voice"},
        {"id": "aiden", "name": "Aiden", "description": "Qwen male voice"},
        {
            "id": "uncle_fu",
            "name": "Uncle Fu",
            "description": "Qwen male voice (Chinese)",
        },
        {"id": "ono_anna", "name": "Ono Anna", "description": "Qwen female voice"},
        {"id": "sohee", "name": "Sohee", "description": "Qwen female voice (Korean)"},
    ]
    return {"voices": voices}


@app.get("/v1/speakers")
async def list_speakers():
    """List available speakers (Qwen-specific)."""
    return {"speakers": SPEAKERS}


@app.get("/v1/languages")
async def list_languages():
    """List supported languages."""
    return {"languages": LANGUAGES}


@app.post("/v1/audio/speech")
async def create_speech(request: SpeechRequest):
    """
    OpenAI-compatible /v1/audio/speech endpoint.
    Generates speech audio from text.
    """
    # Validate input
    if not request.input:
        raise HTTPException(status_code=400, detail="Input text is required")

    if len(request.input) > 5000:
        raise HTTPException(
            status_code=400, detail="Input text exceeds maximum length (5000)"
        )

    # Map voice to speaker
    speaker = map_voice_to_speaker(request.voice)

    # Use default language based on speaker
    language = "English"

    # Load model if needed
    model = load_model()

    try:
        import soundfile as sf

        # Generate speech
        wavs, sr = model.generate_custom_voice(
            text=request.input,
            language=language,
            speaker=speaker,
            instruct=None,
        )

        # Convert to bytes
        audio_buffer = io.BytesIO()
        sf.write(audio_buffer, wavs[0], sr, format="WAV")
        audio_buffer.seek(0)

        return Response(
            content=audio_buffer.read(),
            media_type="audio/wav",
            headers={"Content-Disposition": f"attachment; filename=speech.wav"},
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate speech: {str(e)}"
        )


@app.post("/tts")
async def create_tts(request: TTSRequest):
    """
    Extended TTS endpoint with full control options.
    """
    if not request.text:
        raise HTTPException(status_code=400, detail="Text is required")

    if request.speaker not in SPEAKERS:
        raise HTTPException(
            status_code=400, detail=f"Invalid speaker. Available: {', '.join(SPEAKERS)}"
        )

    if request.language not in LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid language. Available: {', '.join(LANGUAGES)}",
        )

    # Load model if needed
    model = load_model()

    try:
        import soundfile as sf

        # Generate speech
        wavs, sr = model.generate_custom_voice(
            text=request.text,
            language=request.language,
            speaker=request.speaker,
            instruct=request.instruct,
        )

        # Convert to bytes
        audio_buffer = io.BytesIO()
        sf.write(audio_buffer, wavs[0], sr, format="WAV")
        audio_buffer.seek(0)

        return Response(
            content=audio_buffer.read(),
            media_type="audio/wav",
            headers={"Content-Disposition": f"attachment; filename=tts.wav"},
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate speech: {str(e)}"
        )


# ============ Main ============

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
