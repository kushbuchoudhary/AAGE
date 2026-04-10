/**
 * AAGE In-Memory Database
 * Zero config — no MongoDB needed. Data lives in RAM during server session.
 * Swap this file for MongoDB models when you're ready for production.
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ── Stores ────────────────────────────────────────────────────────────────────
const users    = new Map(); // id → user object
const sessions = new Map(); // sessionId → session object
const byEmail  = new Map(); // email → id
const byUser   = new Map(); // username → id

// ── Seed default accounts ─────────────────────────────────────────────────────
async function seedDefaults() {
  if (byEmail.has('admin@aage.com')) return;

  const accounts = [
    { username: 'admin',    email: 'admin@aage.com',   password: 'Admin@1234',  role: 'admin'   },
    { username: 'student1', email: 'student@aage.com', password: 'Student@123', role: 'student' },
    { username: 'demo',     email: 'demo@aage.com',    password: 'demo1234',    role: 'student' },
  ];

  for (const acc of accounts) {
    const id   = uuidv4();
    const hash = await bcrypt.hash(acc.password, 10);
    const user = {
      _id: id, id,
      username: acc.username,
      email:    acc.email,
      password: hash,
      role:     acc.role,
      stats: { totalGamesPlayed: 0, totalScore: 0, avgAccuracy: 0, bestStreak: 0 },
      skillProfile: {
        logical_reasoning: 0, pattern_recognition: 0, numerical_ability: 0,
        verbal_ability: 0, working_memory: 0, analytical_thinking: 0
      },
      createdAt: new Date()
    };
    users.set(id, user);
    byEmail.set(acc.email, id);
    byUser.set(acc.username, id);
  }
  console.log('✅ Default accounts seeded (admin / student1 / demo)');
}

// ── User helpers ──────────────────────────────────────────────────────────────
const UserDB = {
  async create({ username, email, password, role = 'student' }) {
    if (byEmail.has(email))    throw Object.assign(new Error('Email already exists'), { status: 409 });
    if (byUser.has(username))  throw Object.assign(new Error('Username taken'),       { status: 409 });
    const id   = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    const user = {
      _id: id, id, username, email, password: hash, role,
      stats: { totalGamesPlayed: 0, totalScore: 0, avgAccuracy: 0, bestStreak: 0 },
      skillProfile: {
        logical_reasoning: 0, pattern_recognition: 0, numerical_ability: 0,
        verbal_ability: 0, working_memory: 0, analytical_thinking: 0
      },
      createdAt: new Date()
    };
    users.set(id, user);
    byEmail.set(email, id);
    byUser.set(username, id);
    return user;
  },

  findByEmail(email) {
    const id = byEmail.get(email);
    return id ? users.get(id) : null;
  },

  findById(id) {
    return users.get(id) || null;
  },

  findAll() {
    return Array.from(users.values());
  },

  async comparePassword(user, candidate) {
    return bcrypt.compare(candidate, user.password);
  },

  toSafe(user) {
    const { password, ...safe } = user;
    return safe;
  },

  updateStats(id, { scoreAdded = 0, accuracyAdded = 0 }) {
    const user = users.get(id);
    if (!user) return;
    user.stats.totalGamesPlayed += 1;
    user.stats.totalScore       += scoreAdded;
    // Rolling average accuracy
    const n = user.stats.totalGamesPlayed;
    user.stats.avgAccuracy = Math.round(
      ((user.stats.avgAccuracy * (n - 1)) + accuracyAdded) / n
    );
    users.set(id, user);
  }
};

// ── Session helpers ───────────────────────────────────────────────────────────
const SessionDB = {
  create({ sessionId, userId, gameType, difficulty = 3, withBot = false }) {
    const session = {
      sessionId, userId, gameType,
      state: 'active',
      difficulty: { start: difficulty, end: difficulty, peak: difficulty },
      score: 0, correctAnswers: 0, totalAnswers: 0, accuracy: 0,
      duration: 0, responses: [], withBot, botScore: 0,
      skillsTagged: [], createdAt: new Date()
    };
    sessions.set(sessionId, session);
    return session;
  },

  find(sessionId) {
    return sessions.get(sessionId) || null;
  },

  addResponse(sessionId, { questionId, questionText, userAnswer, correctAnswer, isCorrect, responseTime, difficulty }) {
    const s = sessions.get(sessionId);
    if (!s) return null;
    s.totalAnswers++;
    if (isCorrect) s.correctAnswers++;
    s.responses.push({ questionId, questionText, userAnswer, correctAnswer, isCorrect, responseTime, difficulty, timestamp: new Date() });
    sessions.set(sessionId, s);
    return s;
  },

  addScore(sessionId, points) {
    const s = sessions.get(sessionId);
    if (!s) return null;
    s.score += points;
    sessions.set(sessionId, s);
    return s;
  },

  updateDifficulty(sessionId, newDiff) {
    const s = sessions.get(sessionId);
    if (!s) return null;
    s.difficulty.end  = newDiff;
    s.difficulty.peak = Math.max(s.difficulty.peak, newDiff);
    sessions.set(sessionId, s);
    return s;
  },

  complete(sessionId, duration = 0) {
    const s = sessions.get(sessionId);
    if (!s) return null;
    s.state    = 'completed';
    s.duration = duration;
    s.accuracy = s.totalAnswers > 0
      ? Math.round((s.correctAnswers / s.totalAnswers) * 100) : 0;
    sessions.set(sessionId, s);
    return s;
  },

  getByUser(userId) {
    return Array.from(sessions.values())
      .filter(s => s.userId === userId && s.state === 'completed')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map(s => { const { responses, ...rest } = s; return rest; });
  },

  getAll() {
    return Array.from(sessions.values()).filter(s => s.state === 'completed');
  }
};

module.exports = { UserDB, SessionDB, seedDefaults };
