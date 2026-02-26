// Audio Playlist Component - Music-style playlist for TTS history

import { useState } from 'react';
import type { AudioHistoryItem } from '../types';
import './AudioPlaylist.css';

interface AudioPlaylistProps {
  history: AudioHistoryItem[];
  currentPlayingId?: string;
  isLoading: boolean;
  onPlay: (item: AudioHistoryItem) => void;
  onDelete: (id: string) => void;
}

function formatDuration(seconds?: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now';
  // Less than 1 hour
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  // Less than 24 hours
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  // Less than 7 days
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  // Otherwise show date
  return date.toLocaleDateString();
}

export function AudioPlaylist({
  history,
  currentPlayingId,
  isLoading,
  onPlay,
  onDelete,
}: AudioPlaylistProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="audio-playlist">
        <div className="playlist-header">
          <h3>Playlist</h3>
        </div>
        <div className="playlist-loading">
          <div className="spinner-small"></div>
          <span>Loading history...</span>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="audio-playlist">
        <div className="playlist-header">
          <h3>Playlist</h3>
          <span className="playlist-count">0 items</span>
        </div>
        <div className="playlist-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span>No audio generated yet</span>
          <p>Generated audios will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audio-playlist">
      <div className="playlist-header">
        <h3>Playlist</h3>
        <span className="playlist-count">{history.length} item{history.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="playlist-tracks">
        {history.map((item, index) => {
          const isPlaying = currentPlayingId === item.id;
          const isHovered = hoveredId === item.id;
          
          return (
            <div
              key={item.id}
              className={`playlist-track ${isPlaying ? 'playing' : ''} ${isHovered ? 'hovered' : ''}`}
              onClick={() => onPlay(item)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Track Number / Play Icon */}
              <div className="track-number">
                {isPlaying ? (
                  <div className="playing-indicator">
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                  </div>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Track Info */}
              <div className="track-info">
                <div className="track-title">{item.textPreview}</div>
                <div className="track-meta">
                  <span className="track-speaker">{item.speaker}</span>
                  <span className="track-separator">•</span>
                  <span className="track-language">{item.language}</span>
                </div>
              </div>

              {/* Duration & Timestamp */}
              <div className="track-right">
                <span className="track-duration">{formatDuration(item.duration)}</span>
                <span className="track-timestamp">{formatTimestamp(item.timestamp)}</span>
              </div>

              {/* Delete Button */}
              <button
                className="track-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                title="Delete from history"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
