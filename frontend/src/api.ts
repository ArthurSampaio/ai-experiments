import axios from 'axios';
import type { SpeakersResponse, LanguagesResponse, HealthStatus, TTSRequest } from './types';

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
};
