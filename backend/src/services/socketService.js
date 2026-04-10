/**
 * AAGE Real-Time Socket Service
 * Handles live game events, leaderboard broadcasts, bot competition, and session sync.
 */
const engineCore = require('./gameEngineCore');
const adaptiveAI = require('./adaptiveAI');
const { v4: uuidv4 } = require('uuid');

// In-memory leaderboard (replace with Redis in production)
const liveLeaderboard = new Map();
const botSessions = new Map();

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── Join session room ──────────────────────────────────────────────
    socket.on('session:join', ({ sessionId, userId, username }) => {
      socket.join(`session:${sessionId}`);
      socket.data = { sessionId, userId, username };

      // Init leaderboard entry
      liveLeaderboard.set(userId, { userId, username, score: 0, rank: 0 });
      broadcastLeaderboard(io);

      socket.emit('session:joined', { sessionId, message: 'Joined session successfully' });
    });

    // ── Start game ─────────────────────────────────────────────────────
    socket.on('game:start', ({ sessionId, gameType, difficulty, withBot }) => {
      try {
        adaptiveAI.initProfile(sessionId, difficulty || 3);
        const question = adaptiveAI.generateQuestion(gameType, difficulty || 3);

        socket.emit('game:started', {
          sessionId, question,
          difficulty: adaptiveAI.getDifficultyInfo(difficulty || 3)
        });

        // Start AI bot if requested
        if (withBot) {
          startBotSession(io, socket, sessionId, gameType, difficulty || 5);
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Submit answer ──────────────────────────────────────────────────
    socket.on('game:answer', ({ sessionId, gameType, questionId, answer, correctAnswer, responseTime }) => {
      const isCorrect = answer === correctAnswer;

      // Adapt difficulty
      const newDifficulty = adaptiveAI.adaptDifficulty(sessionId, isCorrect, responseTime);
      const diffInfo = adaptiveAI.getDifficultyInfo(newDifficulty);

      // Calculate score
      const baseScore = isCorrect ? 100 : 0;
      const timeBonus = isCorrect ? Math.max(0, Math.floor((diffInfo.timeLimit * 1000 - responseTime) / 100)) : 0;
      const totalPoints = baseScore + timeBonus;

      // Update leaderboard
      const userId = socket.data?.userId;
      if (userId && liveLeaderboard.has(userId)) {
        const entry = liveLeaderboard.get(userId);
        entry.score += totalPoints;
        liveLeaderboard.set(userId, entry);
        broadcastLeaderboard(io);
      }

      // Generate next question
      const nextQuestion = adaptiveAI.generateQuestion(gameType, newDifficulty);

      socket.emit('game:answer:result', {
        isCorrect, points: totalPoints, timeBonus,
        newDifficulty, difficultyLabel: diffInfo.label,
        nextQuestion, explanation: isCorrect
          ? `Correct! +${baseScore} pts${timeBonus ? ` + ${timeBonus} time bonus` : ''}`
          : `Incorrect. The answer was: ${correctAnswer}`
      });

      // Simulate bot answer
      const botSession = botSessions.get(`bot:${sessionId}`);
      if (botSession) {
        setTimeout(() => {
          const botResult = adaptiveAI.getBotAnswer({ answer: correctAnswer, options: [] }, botSession.difficulty);
          const botPoints = botResult.isCorrect ? 100 + Math.floor(Math.random() * 20) : 0;
          botSession.score += botPoints;
          io.to(`session:${sessionId}`).emit('bot:answer', {
            botScore: botSession.score, botCorrect: botResult.isCorrect, botPoints
          });
        }, botSession.thinkTime || 2000);
      }
    });

    // ── Pause / Resume ─────────────────────────────────────────────────
    socket.on('game:pause', ({ sessionId }) => {
      socket.emit('game:paused', { sessionId });
    });

    socket.on('game:resume', ({ sessionId, gameType }) => {
      const difficulty = adaptiveAI.getCurrentDifficulty(sessionId);
      const question = adaptiveAI.generateQuestion(gameType, difficulty);
      socket.emit('game:resumed', { question, difficulty });
    });

    // ── End game ───────────────────────────────────────────────────────
    socket.on('game:end', ({ sessionId }) => {
      const difficulty = adaptiveAI.getCurrentDifficulty(sessionId);
      socket.emit('game:ended', {
        sessionId, finalDifficulty: difficulty,
        message: 'Session complete! Check analytics for your performance.'
      });
      botSessions.delete(`bot:${sessionId}`);
    });

    // ── Leaderboard request ────────────────────────────────────────────
    socket.on('leaderboard:get', () => {
      socket.emit('leaderboard:update', getRankedLeaderboard());
    });

    // ── Disconnect ─────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
}

// ─── Bot Session Manager ───────────────────────────────────────────────────
function startBotSession(io, socket, sessionId, gameType, playerDifficulty) {
  const botDifficulty = Math.max(1, playerDifficulty - 1 + Math.floor(Math.random() * 3));
  botSessions.set(`bot:${sessionId}`, { difficulty: botDifficulty, score: 0, thinkTime: 2000 });

  socket.emit('bot:joined', {
    botName: 'AI Opponent',
    botLevel: botDifficulty,
    message: `AI opponent joined at difficulty ${botDifficulty}`
  });

  // Add bot to leaderboard
  liveLeaderboard.set(`bot:${sessionId}`, { userId: `bot:${sessionId}`, username: 'AI Opponent', score: 0 });
  broadcastLeaderboard(io);
}

// ─── Leaderboard Helpers ───────────────────────────────────────────────────
function getRankedLeaderboard() {
  return Array.from(liveLeaderboard.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

function broadcastLeaderboard(io) {
  io.emit('leaderboard:update', getRankedLeaderboard());
}

module.exports = { setupSocketHandlers };
