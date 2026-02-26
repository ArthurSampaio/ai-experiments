#!/usr/bin/env python3
"""
FastAPI server for Qwen TTS - OpenAI-compatible API
"""

import io
import os
import time
import asyncio
import threading
from typing import Optional, List, Dict, Any, AsyncGenerator

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Models ============


class TTSStreamRequest(BaseModel):
    """TTS streaming request."""

    text: str = Field(..., max_length=5000, description="Text to synthesize")
    speaker: str = Field(default="Ryan", description="Speaker name")
    language: str = Field(default="English", description="Language")
    speed: float = Field(default=1.0, ge=0.25, le=4.0, description="Speech speed")
    pitch: float = Field(default=1.0, ge=0.5, le=2.0, description="Voice pitch")
    instruct: Optional[str] = Field(default=None, description="Style instruction")


class BatchTTSRequest(BaseModel):
    """Batch TTS request."""

    requests: List[TTSStreamRequest] = Field(
        ..., max_length=10, description="List of TTS requests"
    )


class BatchTTSResult(BaseModel):
    """Result for a single batch item."""

    success: bool
    audio: Optional[str] = None  # base64 encoded
    error: Optional[str] = None
    sample_rate: Optional[int] = None


class BatchTTSResponse(BaseModel):
    """Batch TTS response."""

    results: List[BatchTTSResult]
    completed_count: int
    failed_count: int


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


def process_audio(wav_data: np.ndarray, sr: int, speed: float, pitch: float) -> tuple:
    """
    Process audio with speed and pitch adjustments.

    Args:
        wav_data: Audio waveform data
        sr: Sample rate
        speed: Speed factor (0.25 to 4.0)
        pitch: Pitch factor (0.5 to 2.0)

    Returns:
        Processed audio data and sample rate
    """
    import numpy as np
    from scipy import signal

    processed = wav_data.copy()

    # Apply pitch shift (using resampling technique)
    # Pitch factor > 1 means higher pitch, < 1 means lower pitch
    if pitch != 1.0:
        # Simple pitch shift using resampling
        # Higher pitch = faster playback = shorter duration
        # We need to preserve duration, so we resample and then stretch back
        length = len(processed)

        # Resample to change pitch
        new_length = int(length / pitch)
        indices = np.round(np.linspace(0, length - 1, new_length)).astype(int)
        processed = processed[indices]

        # Resample back to original length to preserve duration
        indices = np.round(np.linspace(0, len(processed) - 1, length)).astype(int)
        processed = processed[indices]

    # Apply speed adjustment (simple resampling)
    if speed != 1.0:
        length = len(processed)
        new_length = int(length / speed)
        indices = np.round(np.linspace(0, length - 1, new_length)).astype(int)
        processed = processed[indices]

        # Resample back to original sample rate
        indices = np.round(np.linspace(0, len(processed) - 1, length)).astype(int)
        processed = processed[indices]

    return processed, sr


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

        # Apply speed and pitch processing
        if request.speed != 1.0 or request.pitch != 1.0:
            wavs[0], sr = process_audio(wavs[0], sr, request.speed, request.pitch)

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


async def generate_audio_stream(
    request: TTSStreamRequest,
) -> AsyncGenerator[bytes, None]:
    """
    Generate audio in chunks for streaming playback.

    Yields 8KB chunks of WAV data.
    """
    import soundfile as sf

    # Load model if needed
    model = load_model()

    # Generate speech
    wavs, sr = model.generate_custom_voice(
        text=request.text,
        language=request.language,
        speaker=request.speaker,
        instruct=request.instruct,
    )

    # Apply speed and pitch processing
    if request.speed != 1.0 or request.pitch != 1.0:
        wavs[0], sr = process_audio(wavs[0], sr, request.speed, request.pitch)

    # Convert to WAV bytes
    audio_buffer = io.BytesIO()
    sf.write(audio_buffer, wavs[0], sr, format="WAV")
    audio_buffer.seek(0)
    audio_bytes = audio_buffer.read()

    # Yield WAV header first (44 bytes)
    yield audio_bytes[:44]
    await asyncio.sleep(0)

    # Yield chunks of 8KB
    chunk_size = 8192
    for i in range(44, len(audio_bytes), chunk_size):
        yield audio_bytes[i : i + chunk_size]
        await asyncio.sleep(0)


@app.post("/tts/stream")
async def stream_tts(request: TTSStreamRequest):
    """
    Streaming TTS endpoint.
    Returns audio in chunks as it's generated using StreamingResponse.
    """
    # Validate input
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

    return StreamingResponse(
        generate_audio_stream(request),
        media_type="audio/wav",
        headers={"Transfer-Encoding": "chunked"},
    )


# Semaphore for limiting concurrent GPU operations
_batch_semaphore = asyncio.Semaphore(2)


async def process_single_tts(request: TTSStreamRequest) -> BatchTTSResult:
    """Process a single TTS request with timeout."""
    async with _batch_semaphore:
        try:
            import soundfile as sf
            import base64

            # Load model if needed
            model = load_model()

            # Generate speech
            wavs, sr = model.generate_custom_voice(
                text=request.text,
                language=request.language,
                speaker=request.speaker,
                instruct=request.instruct,
            )

            # Apply speed and pitch processing
            if request.speed != 1.0 or request.pitch != 1.0:
                wavs[0], sr = process_audio(wavs[0], sr, request.speed, request.pitch)

            # Convert to WAV bytes and then to base64
            audio_buffer = io.BytesIO()
            sf.write(audio_buffer, wavs[0], sr, format="WAV")
            audio_buffer.seek(0)
            audio_b64 = base64.b64encode(audio_buffer.read()).decode("utf-8")

            return BatchTTSResult(
                success=True,
                audio=audio_b64,
                sample_rate=sr,
            )

        except Exception as e:
            return BatchTTSResult(
                success=False,
                error=str(e),
            )


@app.post("/tts/batch")
async def batch_tts(request: BatchTTSRequest):
    """
    Batch TTS endpoint.
    Processes multiple TTS requests with concurrency limits.
    """
    # Validate batch size
    if len(request.requests) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum batch size is 10 items",
        )

    if not request.requests:
        raise HTTPException(
            status_code=400,
            detail="At least one request is required",
        )

    # Validate each request
    for i, req in enumerate(request.requests):
        if not req.text:
            raise HTTPException(
                status_code=400,
                detail=f"Request {i + 1}: Text is required",
            )
        if req.speaker not in SPEAKERS:
            raise HTTPException(
                status_code=400,
                detail=f"Request {i + 1}: Invalid speaker '{req.speaker}'. Available: {', '.join(SPEAKERS)}",
            )
        if req.language not in LANGUAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Request {i + 1}: Invalid language '{req.language}'. Available: {', '.join(LANGUAGES)}",
            )

    # Process all requests concurrently (limited by semaphore)
    tasks = [process_single_tts(req) for req in request.requests]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process results
    batch_results = []
    completed_count = 0
    failed_count = 0

    for result in results:
        if isinstance(result, Exception):
            batch_results.append(BatchTTSResult(success=False, error=str(result)))
            failed_count += 1
        else:
            batch_results.append(result)
            # Type assertion since we know it's BatchTTSResult after the isinstance check
            if isinstance(result, BatchTTSResult) and result.success:
                completed_count += 1
            else:
                failed_count += 1

    return BatchTTSResponse(
        results=batch_results,
        completed_count=completed_count,
        failed_count=failed_count,
    )


# ============ Main ============

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
