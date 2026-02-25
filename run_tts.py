#!/usr/bin/env python3
"""
Qwen3 TTS Runner
Usage: python run_tts.py --text "Hello world" --output hello.wav [--speaker Ryan] [--language English]
"""

import argparse
import os
import sys
import time

def get_device():
    """Determine the best available device."""
    import torch
    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"

def main():
    parser = argparse.ArgumentParser(description="Qwen3 TTS - Text to Speech")
    parser.add_argument("--text", type=str, required=True, help="Text to synthesize")
    parser.add_argument("--output", type=str, default="output.wav", help="Output audio file")
    parser.add_argument("--speaker", type=str, default="Ryan", help="Speaker name")
    parser.add_argument("--language", type=str, default="English", help="Language")
    parser.add_argument("--instruct", type=str, default="", help="Style instruction")
    parser.add_argument("--list-speakers", action="store_true", help="List available speakers")
    
    args = parser.parse_args()
    
    device = get_device()
    print(f"Using device: {device}")
    
    # Import here to show clear error if not installed
    try:
        import torch
        import soundfile as sf
        from qwen_tts import Qwen3TTSModel
    except ImportError as e:
        print(f"Error: Missing dependency - {e}")
        print("Please install: pip install -r requirements.txt")
        sys.exit(1)
    
    print("Loading model...")
    start_load = time.time()
    
    try:
        model = Qwen3TTSModel.from_pretrained(
            "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
            device_map=device,
            dtype=torch.float16,
        )
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Trying with CPU fallback...")
        model = Qwen3TTSModel.from_pretrained(
            "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
            device_map="cpu",
            dtype=torch.float32,
        )
    
    load_time = time.time() - start_load
    print(f"Model loaded in {load_time:.2f}s")
    
    if args.list_speakers:
        print("\nAvailable speakers:")
        for speaker in model.get_supported_speakers():
            print(f"  - {speaker}")
        print("\nAvailable languages:")
        for lang in model.get_supported_languages():
            print(f"  - {lang}")
        return
    
    print(f"Generating speech for: '{args.text}'")
    print(f"Speaker: {args.speaker}, Language: {args.language}")
    
    start_gen = time.time()
    
    try:
        wavs, sr = model.generate_custom_voice(
            text=args.text,
            language=args.language,
            speaker=args.speaker,
            instruct=args.instruct if args.instruct else None,
        )
    except Exception as e:
        print(f"Error generating speech: {e}")
        sys.exit(1)
    
    gen_time = time.time() - start_gen
    print(f"Generated in {gen_time:.2f}s ({(len(wavs[0]) / sr):.2f} seconds)")
    
    # Ensure output directory exists
    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    sf.write(args.output, wavs[0], sr)
    print(f"Saved to: {args.output}")
    
    print(f"\nTotal time: {load_time + gen_time:.2f}s")

if __name__ == "__main__":
    main()
