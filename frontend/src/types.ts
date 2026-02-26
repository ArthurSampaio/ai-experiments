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

// Streaming request type
export interface TTSStreamRequest {
  text: string;
  speaker: string;
  language: string;
  speed: number;
  pitch: number;
  instruct?: string;
}

// Batch request types
export interface BatchTTSRequest {
  requests: TTSStreamRequest[];
}

export interface BatchTTSResult {
  success: boolean;
  audio?: string;
  error?: string;
  sample_rate?: number;
}

export interface BatchTTSResponse {
  results: BatchTTSResult[];
  completed_count: number;
  failed_count: number;
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

// Audio History types
export interface AudioHistoryItem {
  id: string;
  text: string;
  textPreview: string; // First 30-50 chars
  speaker: string;
  language: string;
  speed: number;
  pitch: number;
  timestamp: number;
  duration?: number;
  audioBlob?: Blob;
}
