// ─── Sessions Route ──────────────────────────────────────────────────────────
const router = require('express').Router();
const { GameSession, User } = require('../models');
const { auth } = require('../middleware/auth');
const adaptiveAI = require('../services/adaptiveAI');
const { v4: uuidv4 } = require('uuid');

// Create session
router.post('/', auth, async (req, res) => {
  try {
    const { gameType, difficulty = 3, withBot = false } = req.body;
    const sessionId = uuidv4();
    adaptiveAI.initProfile(sessionId, difficulty);
    const session = await GameSession.create({
      sessionId, userId: req.user.id, gameType,
      difficulty: { start: difficulty, end: difficulty, peak: difficulty },
      withBot
    });
    res.status(201).json({ session, sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit answer + get next question
router.post('/:sessionId/answer', auth, async (req, res) => {
  try {
    const { questionId, questionText, userAnswer, correctAnswer, responseTime, gameType } = req.body;
    const isCorrect = userAnswer === correctAnswer;
    const newDifficulty = adaptiveAI.adaptDifficulty(req.params.sessionId, isCorrect, responseTime);
    const diffInfo = adaptiveAI.getDifficultyInfo(newDifficulty);

    const baseScore = isCorrect ? 100 : 0;
    const timeBonus = isCorrect ? Math.max(0, Math.floor((diffInfo.timeLimit * 1000 - responseTime) / 100)) : 0;
    const points = baseScore + timeBonus;

    await GameSession.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      {
        $inc: { score: points, totalAnswers: 1, correctAnswers: isCorrect ? 1 : 0 },
        $push: { responses: { questionId, questionText, userAnswer, correctAnswer, isCorrect, responseTime, difficulty: newDifficulty } },
        $set: { 'difficulty.end': newDifficulty, 'difficulty.peak': Math.max(newDifficulty, 0) }
      }
    );

    const nextQuestion = adaptiveAI.generateQuestion(gameType, newDifficulty);
    res.json({ isCorrect, points, timeBonus, newDifficulty, difficultyLabel: diffInfo.label, nextQuestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete session
router.post('/:sessionId/complete', auth, async (req, res) => {
  try {
    const session = await GameSession.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { state: 'completed', $set: { duration: req.body.duration || 0 } },
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const accuracy = session.totalAnswers > 0
      ? Math.round((session.correctAnswers / session.totalAnswers) * 100) : 0;
    await GameSession.findOneAndUpdate({ sessionId: req.params.sessionId }, { accuracy });

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.totalGamesPlayed': 1, 'stats.totalScore': session.score }
    });

    const skills = adaptiveAI.mapPerformanceToSkills({ pluginType: session.gameType, accuracy, avgResponseTime: 3000 });
    res.json({ session: { ...session.toObject(), accuracy }, skills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get session history
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await GameSession.find({ userId: req.user.id, state: 'completed' })
      .sort({ createdAt: -1 }).limit(20).select('-responses');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
