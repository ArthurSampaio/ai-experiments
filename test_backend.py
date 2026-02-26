#!/usr/bin/env python3
"""Simple API tests for Qwen TTS backend."""

import requests
import sys

BASE_URL = "http://localhost:8000"


def test_health():
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    print("✓ Health check passed")


def test_speakers():
    r = requests.get(f"{BASE_URL}/v1/speakers")
    assert r.status_code == 200
    data = r.json()
    assert "speakers" in data
    assert "Ryan" in data["speakers"]
    print(f"✓ Speakers: {len(data['speakers'])} available")


def test_languages():
    r = requests.get(f"{BASE_URL}/v1/languages")
    assert r.status_code == 200
    data = r.json()
    assert "languages" in data
    assert "English" in data["languages"]
    print(f"✓ Languages: {len(data['languages'])} available")


def test_tts():
    r = requests.post(
        f"{BASE_URL}/tts",
        json={"text": "Hello", "speaker": "Ryan", "language": "English"},
    )
    assert r.status_code == 200
    assert "audio/wav" in r.headers.get("content-type", "")
    print(f"✓ TTS endpoint works (audio size: {len(r.content)} bytes)")


def test_stream():
    r = requests.post(
        f"{BASE_URL}/tts/stream",
        json={"text": "Hello", "speaker": "Ryan", "language": "English"},
        stream=True,
    )
    assert r.status_code == 200
    print("✓ Streaming endpoint works")


def test_batch():
    r = requests.post(
        f"{BASE_URL}/tts/batch",
        json={
            "requests": [
                {"text": "One", "speaker": "Ryan", "language": "English"},
                {"text": "Two", "speaker": "Vivian", "language": "English"},
            ]
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert len(data["results"]) == 2
    print(f"✓ Batch endpoint works ({data['completed_count']} completed)")


if __name__ == "__main__":
    print("Testing Qwen TTS Backend...\n")
    try:
        test_health()
        test_speakers()
        test_languages()
        test_tts()
        test_stream()
        test_batch()
        print("\n✅ All tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
