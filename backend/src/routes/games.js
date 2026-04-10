const router = require('express').Router();
const { GameConfig } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');
const adaptiveAI = require('../services/adaptiveAI');

// Default game plugins (seeded)
const DEFAULT_GAMES = [
  { id: 'quiz-001',    name: 'Aptitude Quiz',       type: 'quiz',    icon: '🧠', color: '#6366f1', description: 'Test verbal and analytical aptitude', skillTags: ['verbal_ability','analytical_thinking'] },
  { id: 'puzzle-001',  name: 'Math Puzzle',          type: 'puzzle',  icon: '🔢', color: '#f59e0b', description: 'Solve arithmetic and algebraic puzzles', skillTags: ['numerical_ability','arithmetic'] },
  { id: 'logic-001',   name: 'Logic Sequences',      type: 'logic',   icon: '🔗', color: '#10b981', description: 'Find the next number or letter in sequences', skillTags: ['logical_reasoning','pattern_recognition'] },
  { id: 'pattern-001', name: 'Pattern Recognition',  type: 'pattern', icon: '🔷', color: '#ec4899', description: 'Identify and complete visual/alphabetic patterns', skillTags: ['visual_reasoning','sequence_analysis'] },
  { id: 'memory-001',  name: 'Memory Challenge',     type: 'memory',  icon: '💡', color: '#8b5cf6', description: 'Memorize and recall number sequences', skillTags: ['working_memory','recall_speed'] }
];

// List all games
router.get('/', auth, (req, res) => {
  res.json({ games: DEFAULT_GAMES });
});

// Get single game config
router.get('/:id', auth, (req, res) => {
  const game = DEFAULT_GAMES.find(g => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

// Generate a question for a game type
router.post('/:id/question', auth, (req, res) => {
  const game = DEFAULT_GAMES.find(g => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  const { difficulty = 3 } = req.body;
  const question = adaptiveAI.generateQuestion(game.type, Math.min(10, Math.max(1, difficulty)));
  res.json({ question, difficultyInfo: adaptiveAI.getDifficultyInfo(difficulty) });
});

// Generate a full level
router.post('/:id/level', auth, (req, res) => {
  const game = DEFAULT_GAMES.find(g => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  const { levelNumber = 1 } = req.body;
  const level = adaptiveAI.generateLevel(game.type, levelNumber);
  res.json(level);
});

// Admin: create custom game
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const game = await GameConfig.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
