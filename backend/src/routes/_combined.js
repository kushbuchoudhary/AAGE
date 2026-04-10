// ─── Analytics Routes ────────────────────────────────────────────────────────
const analyticsRouter = require('express').Router();
const { GameSession, User } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');

analyticsRouter.get('/overview', auth, async (req, res) => {
  try {
    const sessions = await GameSession.find({ userId: req.user.id, state: 'completed' });
    if (!sessions.length) return res.json({ message: 'No sessions yet', data: {} });

    const totalGames = sessions.length;
    const totalScore = sessions.reduce((s, g) => s + g.score, 0);
    const avgAccuracy = Math.round(sessions.reduce((s, g) => s + (g.accuracy || 0), 0) / totalGames);
    const avgDifficulty = Math.round(sessions.reduce((s, g) => s + (g.difficulty?.end || 3), 0) / totalGames * 10) / 10;

    const byType = {};
    for (const s of sessions) {
      if (!byType[s.gameType]) byType[s.gameType] = { count: 0, totalScore: 0, avgAccuracy: 0 };
      byType[s.gameType].count++;
      byType[s.gameType].totalScore += s.score;
      byType[s.gameType].avgAccuracy += s.accuracy || 0;
    }
    for (const type in byType) {
      byType[type].avgAccuracy = Math.round(byType[type].avgAccuracy / byType[type].count);
    }

    // Last 7 sessions for trend
    const trend = sessions.slice(-7).map(s => ({
      date: s.createdAt, score: s.score, accuracy: s.accuracy || 0,
      difficulty: s.difficulty?.end || 3, gameType: s.gameType
    }));

    // Weak areas (accuracy < 60%)
    const weakAreas = Object.entries(byType)
      .filter(([, v]) => v.avgAccuracy < 60)
      .map(([type, v]) => ({ type, ...v }));

    res.json({ totalGames, totalScore, avgAccuracy, avgDifficulty, byType, trend, weakAreas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

analyticsRouter.get('/skills', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('skillProfile');
    const sessions = await GameSession.find({ userId: req.user.id, state: 'completed' }).limit(50);

    const skillScores = {
      logical_reasoning: 0, pattern_recognition: 0, numerical_ability: 0,
      verbal_ability: 0, working_memory: 0, analytical_thinking: 0
    };
    const counts = { ...skillScores };

    for (const session of sessions) {
      const accuracy = session.accuracy || 0;
      if (['quiz'].includes(session.gameType)) { skillScores.verbal_ability += accuracy; counts.verbal_ability++; skillScores.analytical_thinking += accuracy; counts.analytical_thinking++; }
      if (['puzzle'].includes(session.gameType)) { skillScores.numerical_ability += accuracy; counts.numerical_ability++; }
      if (['logic', 'sequence'].includes(session.gameType)) { skillScores.logical_reasoning += accuracy; counts.logical_reasoning++; }
      if (['pattern'].includes(session.gameType)) { skillScores.pattern_recognition += accuracy; counts.pattern_recognition++; }
      if (['memory'].includes(session.gameType)) { skillScores.working_memory += accuracy; counts.working_memory++; }
    }

    const computed = Object.fromEntries(
      Object.entries(skillScores).map(([k, v]) => [k, counts[k] ? Math.round(v / counts[k]) : 0])
    );
    res.json(computed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Leaderboard Routes ──────────────────────────────────────────────────────
const lbRouter = require('express').Router();

lbRouter.get('/', auth, async (req, res) => {
  try {
    const topUsers = await User.find({})
      .sort({ 'stats.totalScore': -1 })
      .limit(10)
      .select('username stats.totalScore stats.totalGamesPlayed stats.avgAccuracy');

    const board = topUsers.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      totalScore: u.stats.totalScore,
      gamesPlayed: u.stats.totalGamesPlayed,
      avgAccuracy: u.stats.avgAccuracy
    }));
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────
const adminRouter = require('express').Router();

adminRouter.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'student' });
    const totalSessions = await GameSession.countDocuments({ state: 'completed' });
    const totalScore = await GameSession.aggregate([{ $group: { _id: null, total: { $sum: '$score' } } }]);
    const byType = await GameSession.aggregate([
      { $match: { state: 'completed' } },
      { $group: { _id: '$gameType', count: { $sum: 1 }, avgAccuracy: { $avg: '$accuracy' } } }
    ]);
    res.json({ totalUsers, totalSessions, totalScore: totalScore[0]?.total || 0, byType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 }).limit(50);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { analyticsRouter, lbRouter, adminRouter };
