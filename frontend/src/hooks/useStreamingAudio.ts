import { useState, useRef, useCallback, useEffect } from 'react';

interface UseStreamingAudioOptions {
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

interface UseStreamingAudioReturn {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  startStream: (stream: ReadableStream<Uint8Array>) => void;
  stopStream: () => void;
}

/**
 * Hook for playing streaming audio using Web Audio API.
 * Buffers incoming chunks and plays them sequentially.
 */
export function useStreamingAudio(options?: UseStreamingAudioOptions): UseStreamingAudioReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const streamReaderRef = useRef<ReadableStreamReader<Uint8Array> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const playNextBuffer = useCallback(() => {
    if (!audioContextRef.current || bufferQueueRef.current.length === 0 || !isPlayingRef.current) {
      setIsPlaying(false);
      return;
    }

    const buffer = bufferQueueRef.current.shift();
    if (!buffer) return;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);

    source.onended = () => {
      playNextBuffer();
    };

    sourceNodeRef.current = source;
    source.start();
  }, []);

  const stopStream = useCallback(() => {
    isPlayingRef.current = false;
    
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
      sourceNodeRef.current = null;
    }

    if (streamReaderRef.current) {
      streamReaderRef.current.cancel();
      streamReaderRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    bufferQueueRef.current = [];
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopStream]);

  const processWavData = useCallback(async (reader: ReadableStreamReader<Uint8Array>) => {
    try {
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (value) {
          chunks.push(value);
        }
        
        // Yield to event loop to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Combine all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const wavData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        wavData.set(chunk, offset);
        offset += chunk.length;
      }

      // Decode WAV data
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(wavData.buffer);
      bufferQueueRef.current.push(audioBuffer);

      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        playNextBuffer();
      }

      setIsLoading(false);
      options?.onComplete?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      setIsLoading(false);
      options?.onError?.(error);
    }
  }, [playNextBuffer, options]);

  const startStream = useCallback((stream: ReadableStream<Uint8Array>) => {
    // Stop any existing stream
    stopStream();

    setIsLoading(true);
    setError(null);
    
    abortControllerRef.current = new AbortController();
    streamReaderRef.current = stream.getReader();

    // Start processing the stream
    processWavData(streamReaderRef.current);
  }, [processWavData, stopStream]);

  return {
    isLoading,
    isPlaying,
    error,
    startStream,
    stopStream,
  };
}
