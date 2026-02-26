import { useState, useEffect, useRef } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { api } from './api';
import './App.css';

function App() {
  // State for inputs
  const [text, setText] = useState('');
  const [speaker, setSpeaker] = useState('Ryan');
  const [language, setLanguage] = useState('English');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  
  // State for options (loaded from API)
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  
  // State for audio
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{ status: string; model_loaded: boolean } | null>(null);
  
  // Audio player ref
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load options on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [speakersRes, languagesRes, healthRes] = await Promise.all([
          api.getSpeakers(),
          api.getLanguages(),
          api.getHealth(),
        ]);
        setSpeakers(speakersRes.speakers);
        setLanguages(languagesRes.languages);
        setHealth(healthRes);
      } catch (err) {
        console.error('Failed to load options:', err);
        setError('Failed to connect to backend. Make sure the server is running at http://localhost:8000');
      }
    };
    loadOptions();
  }, []);

  // Generate speech
  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter some text to synthesize');
      return;
    }

    setIsGenerating(true);
    setError(null);

    // Clean up previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const blob = await api.generateSpeech({
        text: text.trim(),
        speaker,
        language,
        speed,
        pitch,
      });
      
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      // Auto-play the generated audio
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (err) {
      console.error('Failed to generate speech:', err);
      setError('Failed to generate speech. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download audio
  const handleDownload = () => {
    if (!audioUrl || !audioRef.current) return;
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'tts-output.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle keyboard shortcut (Ctrl/Cmd + Enter to generate)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Qwen TTS</h1>
        {health && (
          <div className="health-status">
            <span className={`status-dot ${health.model_loaded ? 'loaded' : 'loading'}`}></span>
            <span className="status-text">
              {health.model_loaded ? 'Model loaded' : 'Loading model...'}
            </span>
          </div>
        )}
      </header>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="main-content">
        <Allotment>
          {/* Left Panel - Input */}
          <Allotment.Pane minSize={300}>
            <div className="panel input-panel">
              <div className="controls">
                {/* Language Selector */}
                <div className="control-group">
                  <label htmlFor="language">Language</label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                {/* Voice Selector */}
                <div className="control-group">
                  <label htmlFor="speaker">Voice</label>
                  <select
                    id="speaker"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                  >
                    {speakers.map((spk) => (
                      <option key={spk} value={spk}>{spk}</option>
                    ))}
                  </select>
                </div>

                {/* Speed Slider */}
                <div className="control-group">
                  <label htmlFor="speed">
                    Speed: {speed.toFixed(2)}x
                  </label>
                  <input
                    type="range"
                    id="speed"
                    min="0.25"
                    max="4"
                    step="0.05"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  />
                </div>

                {/* Pitch Slider */}
                <div className="control-group">
                  <label htmlFor="pitch">
                    Pitch: {pitch.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    id="pitch"
                    min="0.5"
                    max="2"
                    step="0.05"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              {/* Text Input */}
              <div className="text-input-container">
                <textarea
                  className="text-input"
                  placeholder="Enter text to synthesize..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Generate Button */}
              <button
                className="generate-btn"
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner"></span>
                    Generating...
                  </>
                ) : (
                  'Generate Speech'
                )}
              </button>
            </div>
          </Allotment.Pane>

          {/* Right Panel - Output */}
          <Allotment.Pane minSize={300}>
            <div className="panel output-panel">
              <div className="output-header">
                <h2>Output</h2>
              </div>
              
              <div className="audio-container">
                {audioUrl ? (
                  <>
                    <audio ref={audioRef} controls />
                    <button
                      className="download-btn"
                      onClick={handleDownload}
                      title="Download audio"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </button>
                  </>
                ) : (
                  <div className="placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    <p>Generated audio will appear here</p>
                  </div>
                )}
              </div>

              {/* Settings Summary */}
              <div className="settings-summary">
                <h3>Current Settings</h3>
                <div className="settings-grid">
                  <div className="setting-item">
                    <span className="setting-label">Voice:</span>
                    <span className="setting-value">{speaker}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Language:</span>
                    <span className="setting-value">{language}</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Speed:</span>
                    <span className="setting-value">{speed.toFixed(2)}x</span>
                  </div>
                  <div className="setting-item">
                    <span className="setting-label">Pitch:</span>
                    <span className="setting-value">{pitch.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>

      <footer className="footer">
        <span>Ctrl/Cmd + Enter to generate</span>
      </footer>
    </div>
  );
}

export default App;
