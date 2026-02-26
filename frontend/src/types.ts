// Type definitions for the TTS API

export interface Speaker {
  id: string;
  name: string;
  description?: string;
}

export interface Language {
  id: string;
  name: string;
}

export interface TTSRequest {
  text: string;
  speaker: string;
  language: string;
  speed: number;
  pitch: number;
}

export interface HealthStatus {
  status: string;
  model_loaded: boolean;
  device: string;
}

export interface SpeakersResponse {
  speakers: string[];
}

export interface LanguagesResponse {
  languages: string[];
}
