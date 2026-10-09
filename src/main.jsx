import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './styles.css';
import AvatarSigner from './AvatarSigner';
import AudioSpeechRecorder from './AudioSpeechRecorder';
import { API_URL } from './api';

const API = API_URL;
const Auth = createContext();
const useAuth = () => useContext(Auth);

async function request(path, options = {}, token) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('isl_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    request('/api/auth/me', {}, token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('isl_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const value = {
    user,
    token,
    loading,
    async login(email, password) {
      const r = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem('isl_token', r.accessToken);
      setLoading(true);
      try {
        const loggedInUser = await request('/api/auth/me', {}, r.accessToken);
        setUser(loggedInUser);
        setToken(r.accessToken);
      } catch (error) {
        localStorage.removeItem('isl_token');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    async register(payload) {
      await request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    },
    logout() {
      localStorage.removeItem('isl_token');
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  return <Auth.Provider value={value}>{children}</Auth.Provider>;
}

function Header() {
  const { user, logout } = useAuth();
  return (
    <header>
      <Link className="brand" to="/">
        Talk <span>in Sign</span>
      </Link>
      <nav>
        {user ? (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/translate">Translate</NavLink>
            <NavLink to="/speech">Speech</NavLink>
            <NavLink to="/history">History</NavLink>
            <NavLink to="/profile">Profile</NavLink>
            <button className="link" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link className="button small" to="/register">
              Get started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading your workspace…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

function Landing() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">ACCESSIBLE COMMUNICATION</p>
        <h1>
          Translate words into <em>ISL-ready</em> sign sequences.
        </h1>
        <p>
          Convert text and speech into structured Indian Sign Language glosses, with human ISL videos and real-time 3D avatar animations.
        </p>
        <div className="actions">
          <Link className="button" to="/register">
            Start translating
          </Link>
          <a className="secondary" href="#how">
            How it works
          </a>
        </div>
      </section>
      <section id="how" className="features">
        <article>
          <b>01</b>
          <h2>Text or voice</h2>
          <p>Type a phrase or use your browser’s speech recognition.</p>
        </article>
        <article>
          <b>02</b>
          <h2>Hybrid ISL playback</h2>
          <p>Plays real human videos for recorded signs and seamless 3D avatar animations for missing words.</p>
        </article>
        <article>
          <b>03</b>
          <h2>Clear studio stage</h2>
          <p>Interactive CWASA / incluITe-inspired stage with step controls and active word highlights.</p>
        </article>
      </section>
    </main>
  );
}

function AuthPage({ register = false }) {
  const { login, register: signUp } = useAuth();
  const go = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      if (register) {
        await signUp({ name: f.get('name'), email: f.get('email'), password: f.get('password') });
        await login(f.get('email'), f.get('password'));
      } else {
        await login(f.get('email'), f.get('password'));
      }
      go('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth">
      <form onSubmit={submit}>
        <p className="eyebrow">{register ? 'JOIN TALK IN SIGN' : 'WELCOME BACK'}</p>
        <h1>{register ? 'Create your account' : 'Sign in'}</h1>
        {error && <p className="error" role="alert">{error}</p>}
        {register && (
          <label>
            Name
            <input name="name" required maxLength="100" />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              minLength="8"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(current => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              👁
            </button>
          </span>
        </label>
        <button className="button">{register ? 'Create account' : 'Sign in'}</button>
        <p>
          {register ? 'Already registered? ' : 'New here? '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </form>
    </main>
  );
}

// CWASA & incluITe inspired Virtual Sign Stage
function VirtualSignStage({ signs, activeIndex, setActiveIndex }) {
  const playable = signs || [];
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const videoRef = useRef(null);

  const current = activeIndex;
  const active = current >= 0 && current < playable.length ? playable[current] : null;

  const handleNext = () => {
    if (current + 1 < playable.length) {
      setActiveIndex(current + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      setActiveIndex(current - 1);
    }
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
    } else {
      if (current < 0 || current >= playable.length) {
        setActiveIndex(0);
      }
      setIsPlaying(true);
      if (videoRef.current) videoRef.current.play();
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setActiveIndex(-1);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const videoCount = playable.filter(s => Boolean(s.videoUrl)).length;
  const avatarCount = playable.length - videoCount;

  return (
    <section className="virtual-stage-card">
      <div className="stage-header">
        <div className="stage-title-wrap">
          <span className="stage-pill">VIRTUAL SIGN STAGE</span>
          <h3>ISL Sequence Playback</h3>
        </div>
        <div className="stage-stats">
          <span className="stat-badge video" title="Real human ISL videos recorded in dataset">
            🎥 {videoCount} Human Videos
          </span>
          <span className="stat-badge avatar" title="3D WebGL Avatar rendering for unrecorded words">
            👤 {avatarCount} 3D Avatar Signs
          </span>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="stage-viewport">
        {active ? (
          active.videoUrl ? (
            <div className="stage-media-wrap">
              <span className="source-pill video-pill">🎥 Licensed ISL Video</span>
              <video
                key={active.videoUrl}
                ref={videoRef}
                className="stage-video-element"
                autoPlay
                controls={false}
                playbackRate={speed}
                onEnded={isPlaying ? handleNext : undefined}
                src={active.videoUrl}
              >
                Sign video for {active.displayName}
              </video>
            </div>
          ) : (
            <div className="stage-media-wrap avatar-wrap">
              <AvatarSigner
                key={`${active.displayName}-${current}`}
                word={active.displayName}
                speed={speed}
                isPaused={!isPlaying}
                onComplete={isPlaying ? handleNext : undefined}
              />
            </div>
          )
        ) : (
          <div className="stage-standby">
            <div className="standby-orb">✨</div>
            <h4>Ready to render {playable.length} ISL signs</h4>
            <p>Watch human videos for recorded signs and interactive 3D avatar animations for missing words.</p>
            <button
              className="button stage-play-btn"
              onClick={() => {
                setActiveIndex(0);
                setIsPlaying(true);
              }}
            >
              ▶ Play Complete Sentence
            </button>
          </div>
        )}
      </div>

      {/* Active Word Banner (incluITe inspired) */}
      {active && (
        <div className="active-word-banner">
          <div className="active-word-left">
            <span className="active-word-label">CURRENT SIGN</span>
            <span className="active-word-name">{active.displayName}</span>
          </div>
          <div className="active-word-right">
            <span className={`format-pill ${active.videoUrl ? 'is-video' : 'is-avatar'}`}>
              {active.videoUrl ? '🎥 Real Human ISL Video' : '👤 3D Avatar Signing'}
            </span>
            <span className="step-counter">
              Sign {current + 1} of {playable.length}
            </span>
          </div>
        </div>
      )}

      {/* Transport Controls Bar */}
      <div className="stage-controls-bar">
        <div className="transport-buttons">
          <button
            className="control-btn"
            title="Previous sign"
            disabled={current <= 0}
            onClick={handlePrev}
          >
            ⏮ Prev
          </button>
          <button
            className={`control-btn play-btn ${isPlaying ? 'playing' : ''}`}
            title={isPlaying ? 'Pause' : 'Play'}
            onClick={handlePlayToggle}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            className="control-btn"
            title="Next sign"
            disabled={current >= playable.length - 1}
            onClick={handleNext}
          >
            ⏭ Next
          </button>
          <button className="control-btn stop-btn" title="Stop / Reset" onClick={handleStop}>
            ⏹ Stop
          </button>
        </div>

        {/* Playback Speed Controls */}
        <div className="speed-selector">
          <span className="speed-label">Speed:</span>
          {[0.75, 1.0, 1.25].map(s => (
            <button
              key={s}
              className={`speed-pill ${speed === s ? 'active' : ''}`}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Sequence Timeline Strip */}
      <div className="stage-timeline">
        <span className="timeline-title">SENTENCE TIMELINE &middot; CLICK TO SCRUB:</span>
        <div className="timeline-tokens">
          {playable.map((s, idx) => {
            const isCur = idx === current;
            const isVid = Boolean(s.videoUrl);
            return (
              <button
                key={idx}
                className={`timeline-chip ${isCur ? 'active' : ''} ${isVid ? 'is-video' : 'is-avatar'}`}
                onClick={() => {
                  setActiveIndex(idx);
                  setIsPlaying(true);
                }}
              >
                <span className="chip-index">{idx + 1}</span>
                <span className="chip-name">{s.displayName}</span>
                <span className="chip-icon">{isVid ? '🎥' : '👤'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Viewer({ result }) {
  const [activeIndex, setActiveIndex] = useState(-1);

  if (!result) {
    return (
      <section className="viewer empty">
        <h2>Your sign sequence will appear here</h2>
        <p>Type or dictate a sentence to preview the full hybrid ISL sequence on the Virtual Stage.</p>
      </section>
    );
  }

  const signs = result.signs || [];

  return (
    <section className="viewer">
      <p className="eyebrow">ISL SIGN SEQUENCE</p>
      {result.aiAssisted ? (
        <p className="ai-status">
          <strong>AI Simplification Active:</strong> Normalized conversational filler words into concise ISL concepts.
        </p>
      ) : null}

      {/* Hero Virtual Sign Stage */}
      <VirtualSignStage
        signs={signs}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
      />

      {/* Sign Cards Gallery */}
      <div className="gallery-header">
        <h4>Sign Cards ({signs.length} Total)</h4>
        <small>Click any card to load it onto the Virtual Stage</small>
      </div>

      <div className="signs">
        {signs.map((s, i) => {
          const isSelected = i === activeIndex;
          const isVideo = Boolean(s.videoUrl);
          return (
            <article
              className={`sign ${isSelected ? 'selected' : ''}`}
              key={i}
              onClick={() => setActiveIndex(i)}
            >
              <div className="sign-card-top">
                <span className="sign-num">{String(i + 1).padStart(2, '0')}</span>
                <span className={`sign-type-badge ${isVideo ? 'video' : 'avatar'}`}>
                  {isVideo ? '🎥 Human Video' : '👤 3D Avatar'}
                </span>
              </div>

              {isVideo ? (
                <video className="sign-image" preload="metadata" src={s.videoUrl} muted>
                  Preview for {s.displayName}
                </video>
              ) : (
                <div className="avatar-preview-box">
                  <span className="avatar-preview-icon">👤</span>
                  <span className="avatar-preview-text">3D ISL Sign</span>
                </div>
              )}

              <div className="sign-card-bottom">
                <strong>{s.displayName}</strong>
                <small>{isVideo ? 'Licensed BridgeConn video' : 'Real-time 3D WebGL animation'}</small>
              </div>
            </article>
          );
        })}
      </div>

      <p className="attribution">
        Sign videos: BridgeConn, Sign Dictionary ISL dataset, CC BY-SA 4.0 &middot; 3D Avatar: WebGL ISL Sign Engine.
      </p>
    </section>
  );
}

const SAMPLE_PROMPTS = [
  "Could you please help me find drinking water?",
  "Hello, how are you?",
  "Please help me find home",
  "Thank you friend"
];

function Translator({ speech = false }) {
  const { token } = useAuth();
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [simplify, setSimplify] = useState(true);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleTranscript = (transcriptChunk) => {
    setText(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${transcriptChunk}` : transcriptChunk;
    });
  };

  async function translate(customText) {
    const query = typeof customText === 'string' ? customText : text;
    if (!query.trim()) return setError('Enter, dictate, or record text before translating.');
    const count = query.trim().split(/\s+/).length;
    if (count > 100) return setError('Please enter no more than 100 words at a time.');
    setError('');
    setWorking(true);
    try {
      const res = await request(
        '/api/translation/text',
        {
          method: 'POST',
          body: JSON.stringify({
            text: query,
            inputType: speech ? 'SPEECH' : 'TEXT',
            simplifyText: simplify
          })
        },
        token
      );
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className={`workspace ${result ? '' : 'workspace-solo'}`}>
      <section className="translator">
        <p className="eyebrow">{speech ? 'SPEECH & AUDIO STUDIO' : 'TEXT TO ISL'}</p>
        <h1>{speech ? 'Record, speak, and translate.' : 'Write it. See the sequence.'}</h1>

        {speech && (
          <AudioSpeechRecorder
            onTranscript={handleTranscript}
            onAutoTranslate={() => translate()}
          />
        )}

        <div className="input-label-row">
          <label htmlFor="source">
            {speech ? 'Voice Transcription / Review' : 'Enter text'}
          </label>
        </div>

        <textarea
          id="source"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={speech ? 'Your spoken words will appear here automatically...' : 'Could you please help me find drinking water?'}
        />
        <p className={'word-count ' + (words > 100 ? 'over-limit' : '')}>{words}/100 words</p>

        {/* Quick Sample Prompts */}
        <div className="sample-prompts">
          <span className="sample-label">Quick samples:</span>
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="sample-pill"
              onClick={() => {
                setText(prompt);
                translate(prompt);
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Options Row */}
        <div className="options-row">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={simplify}
              onChange={e => setSimplify(e.target.checked)}
            />
            <span>Simplify text with AI</span>
          </label>
          <small className="toggle-hint">
            {simplify
              ? 'Converts colloquial sentences into essential ISL concepts.'
              : 'Direct Mode: Translates each word in exact order without skipping words (unrecorded words use 3D avatar).'}
          </small>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="actions">
          <button
            className="button"
            disabled={working || words > 100}
            onClick={() => translate()}
          >
            {working ? 'Translating…' : 'Translate to ISL'}
          </button>
          <button
            className="secondary"
            onClick={() => {
              setText('');
              setResult(null);
              setError('');
            }}
          >
            Clear
          </button>
        </div>
      </section>

      {result && <Viewer result={result} />}
    </main>
  );
}

function Dashboard() {
  const { user, token } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    request('/api/translation/history?size=3', {}, token)
      .then(r => setItems(r.content || []))
      .catch(() => {});
  }, [token]);

  return (
    <main className="dashboard">
      <p className="eyebrow">YOUR WORKSPACE</p>
      <h1>Welcome back, {user.name}.</h1>
      <div className="features quick">
        <Link to="/translate">
          <b>Text translator</b>
          <span>Turn written phrases into ISL glosses →</span>
        </Link>
        <Link to="/speech">
          <b>Speech translator</b>
          <span>Use your microphone →</span>
        </Link>
        <Link to="/history">
          <b>Translation history</b>
          <span>Review saved translations →</span>
        </Link>
      </div>
      <section className="recent">
        <h2>Recent translations</h2>
        {items.length ? (
          items.map(x => (
            <p key={x.id}>
              <b>{x.inputText}</b>
              <span>{x.signSequence.join(' → ') || 'No known signs'}</span>
            </p>
          ))
        ) : (
          <p>No translations yet. Start with a short phrase such as “Hello, how are you?”</p>
        )}
      </section>
    </main>
  );
}

function History() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await request('/api/translation/history', {}, token);
      setItems(r.content || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  async function remove(id) {
    if (!window.confirm('Delete this translation from your history?')) return;
    setDeleting(id);
    setError('');
    try {
      await request('/api/translation/history/' + id, { method: 'DELETE' }, token);
      setItems(current => current.filter(item => item.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="dashboard">
      <p className="eyebrow">YOUR ACTIVITY</p>
      <h1>Translation history</h1>
      <section className="recent" aria-busy={loading}>
        <div className="history-heading">
          <h2>Saved translations</h2>
          <button className="link" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {loading ? (
          <p>Loading your translations…</p>
        ) : items.length ? (
          items.map(x => (
            <div className="history" key={x.id}>
              <p>
                <b>{x.inputText}</b>
                <span>
                  {x.inputType} &middot; {x.signSequence.join(' → ') || 'No known signs'} &middot;{' '}
                  {new Date(x.createdAt).toLocaleString()}
                </span>
              </p>
              <button
                className="link danger"
                disabled={deleting === x.id}
                onClick={() => remove(x.id)}
              >
                {deleting === x.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          ))
        ) : (
          <p>Your saved translations will be shown here.</p>
        )}
      </section>
    </main>
  );
}

function Profile() {
  const { user } = useAuth();
  return (
    <main className="dashboard">
      <p className="eyebrow">ACCOUNT</p>
      <h1>Your profile</h1>
      <section className="recent">
        <p>
          <b>Name</b>
          <span>{user.name}</span>
        </p>
        <p>
          <b>Email</b>
          <span>{user.email}</span>
        </p>
        <p>
          <b>Security</b>
          <span>Your password is stored as a BCrypt hash and never returned by this application.</span>
        </p>
      </section>
    </main>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/translate" element={<Protected><Translator /></Protected>} />
          <Route path="/speech" element={<Protected><Translator speech /></Protected>} />
          <Route path="/history" element={<Protected><History /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="*" element={<main className="center"><h1>Page not found</h1><Link to="/">Return home</Link></main>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
