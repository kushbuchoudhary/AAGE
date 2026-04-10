const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── User Model ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['student', 'admin'], default: 'student' },
  profile: {
    displayName: String,
    avatar: { type: String, default: '' },
    aptitudeMode: { type: Boolean, default: false },
    targetExam: { type: String, default: '' }
  },
  stats: {
    totalGamesPlayed: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    avgAccuracy: { type: Number, default: 0 }
  },
  skillProfile: {
    logical_reasoning:       { type: Number, default: 0 },
    pattern_recognition:     { type: Number, default: 0 },
    numerical_ability:       { type: Number, default: 0 },
    verbal_ability:          { type: Number, default: 0 },
    working_memory:          { type: Number, default: 0 },
    analytical_thinking:     { type: Number, default: 0 }
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// ─── Game Session Model ────────────────────────────────────────────────────────
const sessionSchema = new mongoose.Schema({
  sessionId:      { type: String, required: true, unique: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameType:       { type: String, enum: ['quiz', 'puzzle', 'logic', 'pattern', 'memory'], required: true },
  state:          { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  difficulty: {
    start:  { type: Number, default: 3 },
    end:    { type: Number, default: 3 },
    peak:   { type: Number, default: 3 }
  },
  score:          { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  totalAnswers:   { type: Number, default: 0 },
  accuracy:       { type: Number, default: 0 },
  duration:       { type: Number, default: 0 }, // seconds
  responses: [{
    questionId:   String,
    questionText: String,
    userAnswer:   String,
    correctAnswer:String,
    isCorrect:    Boolean,
    responseTime: Number,
    difficulty:   Number,
    timestamp:    { type: Date, default: Date.now }
  }],
  skillsTagged: [String],
  withBot:      { type: Boolean, default: false },
  botScore:     { type: Number, default: 0 }
}, { timestamps: true });

// ─── Game Plugin/Config Model ──────────────────────────────────────────────────
const gameConfigSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  type:        { type: String, enum: ['quiz', 'puzzle', 'logic', 'pattern', 'memory'], required: true },
  description: String,
  icon:        { type: String, default: '🎮' },
  color:       { type: String, default: '#6366f1' },
  rules: {
    timePerQuestion: { type: Number, default: 20 },
    questionsPerLevel:{ type: Number, default: 5 },
    maxLevels:        { type: Number, default: 10 },
    passingScore:     { type: Number, default: 60 }
  },
  difficulty: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 10 },
    default: { type: Number, default: 3 }
  },
  skillTags:   [String],
  isPublished: { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const User       = mongoose.model('User', userSchema);
const GameSession = mongoose.model('GameSession', sessionSchema);
const GameConfig  = mongoose.model('GameConfig', gameConfigSchema);

module.exports = { User, GameSession, GameConfig };
