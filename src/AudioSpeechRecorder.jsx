import React, { useState, useEffect, useRef } from 'react';

/**
 * AudioSpeechRecorder provides:
 * 1. Real-time microphone audio recording using MediaRecorder API.
 * 2. Live Audio Waveform / Frequency visualizer using Web Audio API.
 * 3. Real-time Speech-to-Text transcription using Web Speech API (with language selection).
 * 4. Automatic server-side Whisper AI transcription fallback for browsers without Web Speech API.
 * 5. Recorded audio playback player with re-record and download capabilities.
 */
export default function AudioSpeechRecorder({
  onTranscript,
  onRecordingComplete,
  onAutoTranslate,
  autoTranslateOnStop = false,
  compact = false
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [interimText, setInterimText] = useState('');
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [micError, setMicError] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeNotice, setTranscribeNotice] = useState('');
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackVolume, setPlaybackVolume] = useState(1);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const speechRecognizerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const playbackRef = useRef(null);

  const hasSpeech = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasMediaRecorder = typeof window !== 'undefined' && Boolean(navigator.mediaDevices && window.MediaRecorder);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupStreams();
    };
  }, []);

  const cleanupStreams = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (speechRecognizerRef.current) {
      try { speechRecognizerRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
  };

  const autoTranscribeBlob = async (blob) => {
    if (!blob) return;
    setTranscribing(true);
    setTranscribeNotice('⏳ Transcribing audio with Whisper AI...');
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      const token = localStorage.getItem('isl_token');
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') + '/api/translation/transcribe', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setTranscribeNotice('✓ Transcribed: "' + data.text + '"');
        if (onTranscript) onTranscript(data.text);
      } else {
        setTranscribeNotice(data.message || data.error || 'Type your sentence directly in the box below to translate.');
      }
    } catch (e) {
      setTranscribeNotice('Type your sentence directly in the box below to translate.');
    } finally {
      setTranscribing(false);
    }
  };

  // Start live canvas visualizer
  const startVisualizer = (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!isRecording && audioCtx.state === 'closed') return;
        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 1.8;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
          const hue = 168 + (i / bufferLength) * 45; // Teal to mint gradient
          ctx.fillStyle = `hsl(${hue}, 80%, 45%)`;
          ctx.beginPath();
          ctx.roundRect(x, canvas.height - Math.max(barHeight, 4), barWidth - 2, Math.max(barHeight, 4), 3);
          ctx.fill();
          x += barWidth;
        }
      };
      draw();
    } catch (e) {
      console.warn('Audio visualizer could not start:', e);
    }
  };

  const startRecording = async () => {
    setMicError('');
    setAudioUrl(null);
    setAudioBlob(null);
    setInterimText('');
    setTranscribeNotice('');
    setDuration(0);
    audioChunksRef.current = [];

    if (!hasMediaRecorder) {
      setMicError('Your browser does not support audio recording. Please use Chrome, Edge, or Firefox.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        if (onRecordingComplete) onRecordingComplete(blob, url);
        autoTranscribeBlob(blob);
        if (autoTranslateOnStop && onAutoTranslate) {
          onAutoTranslate();
        }
      };

      recorder.start(250); // Collect slice every 250ms
      setIsRecording(true);
      setIsPaused(false);

      // Start duration counter
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Start audio visualizer
      startVisualizer(stream);

      // Start Speech Recognition simultaneously if available
      if (hasSpeech) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognizer = new SpeechRec();
        recognizer.continuous = true;
        recognizer.interimResults = true;
        recognizer.lang = selectedLang;

        recognizer.onresult = (event) => {
          let finalTranscript = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              currentInterim += transcript;
            }
          }

          setInterimText(currentInterim);
          if (finalTranscript && onTranscript) {
            onTranscript(finalTranscript.trim());
          }
        };

        recognizer.onerror = (event) => {
          console.warn('Speech recognition notice:', event.error);
        };

        recognizer.onend = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try { recognizer.start(); } catch (e) {}
          }
        };

        try {
          recognizer.start();
          speechRecognizerRef.current = recognizer;
        } catch (e) {
          console.warn('Could not launch SpeechRecognizer:', e);
        }
      }
    } catch (err) {
      console.error('Microphone access denied or failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Microphone permission was denied. Please allow microphone access in your browser address bar.');
      } else {
        setMicError('Could not start microphone: ' + err.message);
      }
      cleanupStreams();
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setInterimText('');

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (speechRecognizerRef.current) {
      try { speechRecognizerRef.current.stop(); } catch (e) {}
      speechRecognizerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const togglePlayback = async () => {
    if (!playbackRef.current) return;
    if (isPlaybackActive) {
      playbackRef.current.pause();
      return;
    }
    try {
      await playbackRef.current.play();
    } catch (error) {
      setMicError('Audio playback could not start. Please try again.');
    }
  };

  const seekPlayback = (value) => {
    const nextPosition = Number(value);
    setPlaybackPosition(nextPosition);
    if (playbackRef.current) playbackRef.current.currentTime = nextPosition;
  };

  const changeVolume = (value) => {
    const nextVolume = Number(value);
    setPlaybackVolume(nextVolume);
    if (playbackRef.current) playbackRef.current.volume = nextVolume;
  };

  // Compact mode (for standard Translate page)
  if (compact) {
    return (
      <div className="compact-audio-ctrl">
        {!isRecording ? (
          <button
            type="button"
            className="compact-mic-btn"
            onClick={startRecording}
            title="Start Voice Recording & Speech Recognition"
          >
            <span className="mic-icon">🎙️</span>
            <span>Dictate with voice</span>
          </button>
        ) : (
          <div className="compact-active-recording">
            <span className="rec-pulse-dot" />
            <span className="rec-time">{formatTime(duration)}</span>
            <canvas ref={canvasRef} width="80" height="24" className="compact-canvas" />
            <button type="button" className="compact-stop-btn" onClick={stopRecording}>
              ■ Stop
            </button>
          </div>
        )}
        {micError && <p className="compact-err">{micError}</p>}
      </div>
    );
  }

  // Full Voice Studio mode (for /speech page)
  return (
    <div className="audio-studio-card">
      <div className="studio-top">
        <div className="studio-title-wrap">
          <span className="studio-badge">VOICE & SPEECH STUDIO</span>
          <h3>Audio Recording & Live Speech Recognition</h3>
        </div>
        <div className="studio-lang-wrap">
          <label htmlFor="speech-lang">Accent / Language:</label>
          <select
            id="speech-lang"
            value={selectedLang}
            disabled={isRecording}
            onChange={(e) => setSelectedLang(e.target.value)}
          >
            <option value="en-IN">English (India - en-IN)</option>
            <option value="en-US">English (US - en-US)</option>
            <option value="en-GB">English (UK - en-GB)</option>
          </select>
        </div>
      </div>

      {micError && (
        <div className="studio-alert-error" role="alert">
          <strong>Microphone Error:</strong> {micError}
        </div>
      )}

      {/* Recording Stage Visualizer */}
      <div className={`recording-viewport ${isRecording ? 'is-active' : ''}`}>
        <canvas ref={canvasRef} width="360" height="70" className="waveform-canvas" />

        <div className="recording-status-overlay">
          {isRecording ? (
            <div className="status-badge-live">
              <span className="pulsing-record-light" />
              <span className="timer-text">{formatTime(duration)}</span>
              <span className="status-subtext">
                {isPaused ? 'PAUSED' : 'RECORDING & TRANSCRIBING...'}
              </span>
            </div>
          ) : audioUrl ? (
            <div className="status-badge-ready">
              <span>✅ Audio recording ready ({formatTime(duration)})</span>
            </div>
          ) : (
            <div className="status-badge-idle">
              <span>🎙️ Click "Start Recording" to speak your sentence</span>
            </div>
          )}
        </div>

        {/* Real-time Interim Transcription Bubble */}
        {isRecording && interimText && (
          <div className="live-interim-bubble">
            <span className="bubble-label">Live Hearing:</span>
            <span className="bubble-text">“{interimText}”</span>
          </div>
        )}
      </div>

      {/* Control Buttons Bar */}
      <div className="recording-controls-bar">
        {!isRecording ? (
          <button
            type="button"
            className="btn-studio-record"
            onClick={startRecording}
          >
            <span className="rec-btn-icon">🎙️</span>
            <span>{audioUrl ? 'Record Again' : 'Start Recording & Dictating'}</span>
          </button>
        ) : (
          <div className="active-control-cluster">
            <button
              type="button"
              className="btn-studio-pause"
              onClick={togglePause}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              type="button"
              className="btn-studio-stop"
              onClick={stopRecording}
            >
              ⏹ Stop Recording
            </button>
          </div>
        )}


      </div>

      {/* Audio Playback Player when recorded */}
      {audioUrl && !isRecording && (
        <div className="recorded-playback-panel">
          <div className="playback-info">
            <strong>Recorded Voice Clip</strong>
            <small>Review your recorded audio before translating into ISL:</small>
          </div>
          <audio
            ref={playbackRef}
            src={audioUrl}
            onPlay={() => setIsPlaybackActive(true)}
            onPause={() => setIsPlaybackActive(false)}
            onEnded={() => {
              setIsPlaybackActive(false);
              setPlaybackPosition(0);
            }}
            onTimeUpdate={(event) => setPlaybackPosition(event.currentTarget.currentTime)}
          />
          <div className="custom-audio-player" aria-label="Recorded audio playback controls">
            <button type="button" className="audio-play-button" onClick={togglePlayback}>
              {isPlaybackActive ? '⏸ Pause' : '▶ Play'}
            </button>
            <span className="audio-time">{formatTime(playbackPosition)}</span>
            <input
              className="audio-progress"
              type="range"
              min="0"
              max={Math.max(duration, 1)}
              step="0.1"
              value={Math.min(playbackPosition, Math.max(duration, 1))}
              onChange={(event) => seekPlayback(event.target.value)}
              aria-label="Audio progress"
            />
            <span className="audio-time">{formatTime(duration)}</span>
            <span className="audio-volume-icon" aria-hidden="true">🔊</span>
            <input
              className="audio-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={playbackVolume}
              onChange={(event) => changeVolume(event.target.value)}
              aria-label="Audio volume"
            />
          </div>
          <div className="playback-actions">
            <button
              type="button"
              className="btn-ai-transcribe"
              onClick={() => autoTranscribeBlob(audioBlob)}
              disabled={transcribing}
              title="Transcribe recorded audio file using AI Whisper"
            >
              {transcribing ? '⏳ Transcribing...' : '⚡ Transcribe with AI'}
            </button>
          </div>
        </div>
      )}

      {transcribeNotice && (
        <p className="transcribe-notice-pill">{transcribeNotice}</p>
      )}


    </div>
  );
}
