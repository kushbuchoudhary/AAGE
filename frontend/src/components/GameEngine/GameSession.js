import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

const GAME_META = {
  'quiz-001':    { name: 'Aptitude Quiz',       type: 'quiz',    icon: '🧠', color: '#6366f1' },
  'puzzle-001':  { name: 'Math Puzzle',          type: 'puzzle',  icon: '🔢', color: '#f59e0b' },
  'logic-001':   { name: 'Logic Sequences',      type: 'logic',   icon: '🔗', color: '#10b981' },
  'pattern-001': { name: 'Pattern Recognition',  type: 'pattern', icon: '🔷', color: '#ec4899' },
  'memory-001':  { name: 'Memory Challenge',     type: 'memory',  icon: '💡', color: '#8b5cf6' },
};

// Maps difficulty level → timer seconds (matches backend DIFFICULTY_BANDS)
const DIFF_TIME = { 1:30, 2:25, 3:22, 4:20, 5:18, 6:15, 7:12, 8:10, 9:8, 10:6 };

const TOTAL_QUESTIONS = 10;

export default function GameSession() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { emit, on } = useSocket();
  const game = GAME_META[gameId];

  // Setup
  const [phase, setPhase]       = useState('setup');
  const [difficulty, setDifficulty] = useState(3);
  const [withBot, setWithBot]   = useState(false);

  // Game state
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion]   = useState(null);
  const [qIndex, setQIndex]       = useState(0);
  const [score, setScore]         = useState(0);
  const [correct, setCorrect]     = useState(0);
  const [selected, setSelected]   = useState(null);
  const [answered, setAnswered]   = useState(false);
  const [feedback, setFeedback]   = useState(null);
  const [currentDiff, setCurrentDiff] = useState(3);
  const [diffLabel, setDiffLabel]     = useState('Easy-Medium');
  const [timeLeft, setTimeLeft]   = useState(22);
  const [timeLimit, setTimeLimit] = useState(22);
  const [botScore, setBotScore]   = useState(0);
  const [memCountdown, setMemCountdown] = useState(0);

  const startTime    = useRef(null);
  const timerRef     = useRef(null);
  const sessionStart = useRef(null);

  useEffect(() => { if (!game) navigate('/games'); }, [game, navigate]);

  // Socket: bot answers
  useEffect(() => {
    const u1 = on('bot:answer', ({ botScore: bs }) => setBotScore(bs));
    return () => { u1 && u1(); };
  }, [on]);

  // ── Start game ──────────────────────────────────────────────────────────────
  const startGame = async () => {
    try {
      const { data } = await API.post('/sessions', { gameType: game.type, difficulty, withBot });
      setSessionId(data.sessionId);
      setCurrentDiff(difficulty);
      setDiffLabel(getDiffLabel(difficulty));
      sessionStart.current = Date.now();

      emit('session:join', { sessionId: data.sessionId, userId: user.id || user._id, username: user.username });
      emit('game:start', { sessionId: data.sessionId, gameType: game.type, difficulty, withBot });

      const q = await fetchQuestion(difficulty);
      loadQuestion(q);
      setQIndex(1);
    } catch (err) { console.error('startGame error:', err); }
  };

  const fetchQuestion = async (diff) => {
    const { data } = await API.post(`/games/${gameId}/question`, { difficulty: diff });
    return data.question;
  };

  // ── Load a question (sets timer from question.timeLimit) ────────────────────
  const loadQuestion = (q) => {
    setQuestion(q);
    setSelected(null);
    setAnswered(false);
    setFeedback(null);

    // Use timeLimit from the question itself (backend sends correct value)
    const tl = q.timeLimit || DIFF_TIME[q.difficulty] || 20;
    setTimeLimit(tl);
    setTimeLeft(tl);

    if (q.type === 'memory') {
      setPhase('memorize');
      startMemorize(q);
    } else {
      setPhase('playing');
    }
  };

  // ── Countdown timer — restarts whenever timeLimit or phase changes ──────────
  useEffect(() => {
    if (phase !== 'playing' || answered) return;

    clearInterval(timerRef.current);
    startTime.current = Date.now();
    setTimeLeft(timeLimit);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);

  }, [timeLimit, phase]);

  const handleTimeout = useCallback(() => {
    setAnswered(true);
    clearInterval(timerRef.current);
    setFeedback('wrong');
    setTimeout(() => advanceToNext(currentDiff, null), 1300);
  
  }, [currentDiff]);

  // ── Memorize phase ──────────────────────────────────────────────────────────
  const startMemorize = (q) => {
    const ms = q.memorizeTime || 3000;
    let cnt = Math.ceil(ms / 1000);
    setMemCountdown(cnt);
    const iv = setInterval(() => {
      cnt--;
      setMemCountdown(cnt);
      if (cnt <= 0) { clearInterval(iv); setPhase('playing'); }
    }, 1000);
  };

  // ── Submit answer ───────────────────────────────────────────────────────────
  const handleAnswer = async (opt) => {
    if (answered || !question) return;
    clearInterval(timerRef.current);

    const responseTime = Date.now() - (startTime.current || Date.now());
    const isCorrect    = opt === question.answer;

    setSelected(opt);
    setAnswered(true);
    setFeedback(isCorrect ? 'correct' : 'wrong');

    try {
      const { data } = await API.post(`/sessions/${sessionId}/answer`, {
        questionId: question.id,
        questionText: question.text,
        userAnswer: opt,
        correctAnswer: question.answer,
        responseTime,
        gameType: game.type
      });

      const pts = data.points || 0;
      if (isCorrect) { setScore(s => s + pts); setCorrect(c => c + 1); }
      setCurrentDiff(data.newDifficulty);
      setDiffLabel(data.difficultyLabel);

      emit('game:answer', {
        sessionId, gameType: game.type,
        questionId: question.id,
        answer: opt,
        correctAnswer: question.answer,
        responseTime
      });

      // Use next question from server response if available (already has correct timeLimit)
      setTimeout(() => advanceToNext(data.newDifficulty, data.nextQuestion), 1300);

    } catch {
      setTimeout(() => advanceToNext(currentDiff, null), 1300);
    }
  };

  // ── Load next question ──────────────────────────────────────────────────────
  const advanceToNext = async (diff, preloaded) => {
    if (qIndex >= TOTAL_QUESTIONS) { endGame(); return; }

    setFeedback(null);
    setQIndex(i => i + 1);

    const q = preloaded || await fetchQuestion(diff || currentDiff);
    loadQuestion(q);
  };

  // ── End game ────────────────────────────────────────────────────────────────
  const endGame = async () => {
    const duration = Math.round((Date.now() - sessionStart.current) / 1000);
    await API.post(`/sessions/${sessionId}/complete`, { duration }).catch(() => {});
    emit('game:end', { sessionId });
    setPhase('result');
  };

  const getDiffLabel = (d) => {
    const labels = {1:'Beginner',2:'Easy',3:'Easy-Medium',4:'Medium',5:'Medium',6:'Medium-Hard',7:'Hard',8:'Hard',9:'Expert',10:'Master'};
    return labels[d] || 'Medium';
  };

  if (!game) return null;

  // ── SETUP ───────────────────────────────────────────────────────────────────
  if (phase === 'setup') return (
    <div className="game-session">
      <div className="page-header">
        <h1>{game.icon} {game.name}</h1>
        <p>Configure your session before starting</p>
      </div>
      <div className="card" style={{ maxWidth: 500 }}>
        <div className="form-group">
          <label className="form-label">Starting Difficulty (1–10)</label>
          <input type="range" min="1" max="10" value={difficulty}
            onChange={e => setDifficulty(+e.target.value)} style={{ width: '100%' }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color:'var(--text-muted)', marginTop:4 }}>
            <span>Beginner (30s/Q)</span>
            <span style={{ fontWeight:700, color: game.color }}>Level {difficulty} · {DIFF_TIME[difficulty]}s per question</span>
            <span>Master (6s/Q)</span>
          </div>
        </div>
        <div className="form-group" style={{ display:'flex', alignItems:'center', gap:12 }}>
          <input type="checkbox" id="bot" checked={withBot} onChange={e => setWithBot(e.target.checked)} style={{ width:16, height:16 }} />
          <label htmlFor="bot" style={{ cursor:'pointer' }}>
            <strong>🤖 Challenge AI Bot</strong>
            <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>Compete against an AI opponent in real-time</div>
          </label>
        </div>
        <div style={{ background:'var(--bg-input)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:'0.83rem', color:'var(--text-secondary)' }}>
          ⚡ Difficulty auto-adjusts after every answer. Get 3 in a row right → level up. Get 3 wrong → level down.
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => navigate('/games')} className="btn btn-outline">Back</button>
          <button onClick={startGame} className="btn btn-primary" style={{ flex:1 }}>Start Game →</button>
        </div>
      </div>
    </div>
  );

  // ── MEMORIZE ────────────────────────────────────────────────────────────────
  if (phase === 'memorize') return (
    <div className="game-session">
      <div className="question-card" style={{ textAlign:'center' }}>
        <div style={{ fontSize:'0.9rem', color:'var(--text-secondary)', marginBottom:16 }}>🧠 Memorize this sequence!</div>
        <div style={{ fontSize:'2.8rem', fontWeight:800, letterSpacing:'0.35em', color: game.color, margin:'20px 0' }}>
          {question?.answer}
        </div>
        <div style={{ fontSize:'1rem', color:'var(--text-muted)' }}>Hiding in {memCountdown}s…</div>
        <div className="progress-bar" style={{ maxWidth:300, margin:'16px auto 0' }}>
          <div className="progress-fill" style={{ width:`${(memCountdown/(question?.memorizeTime/1000||3))*100}%`, background: game.color, transition:'width 1s linear' }} />
        </div>
      </div>
    </div>
  );

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (phase === 'result') return (
    <div className="game-session">
      <div className="card result-card">
        <div style={{ fontSize:'3rem', marginBottom:12 }}>🏆</div>
        <div className="result-score">{score.toLocaleString()}</div>
        <div className="result-label">Final Score</div>
        <div className="result-stats">
          <div className="result-stat"><div className="val" style={{ color:'#10b981' }}>{correct}/{TOTAL_QUESTIONS}</div><div className="lbl">Correct</div></div>
          <div className="result-stat"><div className="val" style={{ color:'#6366f1' }}>{Math.round((correct/TOTAL_QUESTIONS)*100)}%</div><div className="lbl">Accuracy</div></div>
          <div className="result-stat"><div className="val" style={{ color:'#f59e0b' }}>{currentDiff}</div><div className="lbl">Final Level</div></div>
          <div className="result-stat"><div className="val" style={{ color:'#8b5cf6' }}>{diffLabel}</div><div className="lbl">Difficulty</div></div>
          {withBot && <div className="result-stat"><div className="val" style={{ color:'#ef4444' }}>{botScore}</div><div className="lbl">Bot Score</div></div>}
        </div>
        <div style={{ marginTop:8, padding:'12px 20px', background: score > botScore || !withBot ? '#d1fae5' : '#fee2e2', borderRadius:10, fontWeight:600 }}>
          {withBot ? (score > botScore ? '🎉 You beat the AI Bot!' : '🤖 The AI Bot wins this round!') : '✅ Session complete! Great job!'}
        </div>
        <div style={{ display:'flex', gap:12, marginTop:24, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={() => navigate('/analytics')} className="btn btn-secondary">View Analytics</button>
          <button onClick={() => navigate('/games')}     className="btn btn-outline">Back to Games</button>
          <button onClick={() => { setPhase('setup'); setScore(0); setCorrect(0); setQIndex(0); setBotScore(0); setCurrentDiff(difficulty); }} className="btn btn-primary">Play Again</button>
        </div>
      </div>
    </div>
  );

  // ── PLAYING ─────────────────────────────────────────────────────────────────
  const timerPct   = timeLimit > 0 ? (timeLeft / timeLimit) * 100 : 0;
  const timerColor = timerPct > 60 ? '#10b981' : timerPct > 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className="game-session">

      {/* Feedback overlay */}
      {feedback && (
        <div className="feedback-overlay">
          <div className={`feedback-badge ${feedback}`}>
            {feedback === 'correct' ? '✅ Correct!' : '❌ Wrong!'}
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="game-hud">
        <div className="hud-item"><div className="hud-value">{qIndex}/{TOTAL_QUESTIONS}</div><div className="hud-label">Question</div></div>
        <div className="hud-sep"/>
        <div className="hud-item"><div className="hud-value" style={{ color:'#10b981' }}>{score}</div><div className="hud-label">Score</div></div>
        <div className="hud-sep"/>
        <div className="hud-item"><div className="hud-value">{Math.round((correct/Math.max(qIndex-1,1))*100)}%</div><div className="hud-label">Accuracy</div></div>
        <div className="hud-sep"/>
        <div className="hud-item">
          <span className="difficulty-pill" style={{ background: game.color+'20', color: game.color }}>
            Lv.{currentDiff} · {diffLabel}
          </span>
        </div>
        <div className="hud-sep"/>
        <div className="hud-item"><div className="hud-value" style={{ color: timerColor }}>{timeLeft}s</div><div className="hud-label">Time</div></div>
        {withBot && (<><div className="hud-sep"/><div className="hud-item"><div className="hud-value" style={{ color:'#ef4444' }}>{botScore}</div><div className="hud-label">Bot</div></div></>)}
      </div>

      {/* Timer bar */}
      <div className="timer-bar" style={{ marginBottom:20 }}>
        <div className="timer-fill" style={{ width:`${timerPct}%`, background: timerColor, transition:'width 1s linear' }}/>
      </div>

      {/* Question card */}
      {question && (
        <div className="question-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <span style={{ fontSize:'0.8rem', color:'var(--text-secondary)', fontWeight:600 }}>{game.icon} {game.name}</span>
            <div style={{ display:'flex', gap:8 }}>
              <span className="badge badge-primary">{question.type}</span>
              <span className="badge badge-warning">⏱ {timeLimit}s</span>
            </div>
          </div>

          <div className="question-text">{question.text}</div>

          <div className="options-grid">
            {question.options?.map((opt, i) => {
              let cls = 'option-btn';
              if (answered) {
                if (opt === question.answer)             cls += ' correct';
                else if (opt === selected)               cls += ' wrong';
              } else if (selected === opt) {
                cls += ' selected';
              }
              return (
                <button key={i} className={cls} onClick={() => handleAnswer(opt)} disabled={answered}>
                  <span style={{ fontWeight:700, marginRight:8, color:'var(--primary)' }}>{String.fromCharCode(65+i)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && (
            <div style={{ marginTop:14, padding:'10px 14px', borderRadius:8, background: selected===question.answer?'#d1fae5':'#fee2e2', fontSize:'0.88rem', fontWeight:500, color: selected===question.answer?'#065f46':'#991b1b' }}>
              {selected === question.answer
                ? `✅ Correct! Next question is Level ${currentDiff} (${DIFF_TIME[currentDiff]}s)`
                : `❌ Answer was: ${question.answer} — Level adjusted to ${currentDiff}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
