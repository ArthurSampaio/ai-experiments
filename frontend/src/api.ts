import axios from 'axios';
import type { SpeakersResponse, LanguagesResponse, HealthStatus, TTSRequest, TTSStreamRequest, BatchTTSRequest, BatchTTSResponse } from './types';

const API_BASE = 'http://localhost:8000';

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const response = await axios.get<HealthStatus>(`${API_BASE}/health`);
    return response.data;
  },

  async getSpeakers(): Promise<SpeakersResponse> {
    const response = await axios.get<SpeakersResponse>(`${API_BASE}/v1/speakers`);
    return response.data;
  },

  async getLanguages(): Promise<LanguagesResponse> {
    const response = await axios.get<LanguagesResponse>(`${API_BASE}/v1/languages`);
    return response.data;
  },

  async generateSpeech(request: TTSRequest): Promise<Blob> {
    const response = await axios.post(`${API_BASE}/tts`, request, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Streaming TTS - returns a ReadableStream for progressive audio playback
  async streamTTS(request: TTSStreamRequest): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${API_BASE}/tts/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Streaming failed: ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return response.body;
  },

  // Batch TTS - processes multiple requests
  async batchTTS(request: BatchTTSRequest): Promise<BatchTTSResponse> {
    const response = await axios.post<BatchTTSResponse>(`${API_BASE}/tts/batch`, request);
    return response.data;
  },
};
