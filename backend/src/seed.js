/**
 * AAGE Database Seed Script
 * Run: node backend/src/seed.js
 * Creates default admin user + sample data.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { User, GameConfig } = require('./models');

const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@aage.com',
  password: 'Admin@1234',
  role: 'admin'
};

const DEFAULT_STUDENT = {
  username: 'student1',
  email: 'student@aage.com',
  password: 'Student@123',
  role: 'student'
};

const DEFAULT_GAMES = [
  { id: 'quiz-001',    name: 'Aptitude Quiz',       type: 'quiz',    icon: '🧠', color: '#6366f1', description: 'Verbal and analytical aptitude', skillTags: ['verbal_ability','analytical_thinking'], isPublished: true },
  { id: 'puzzle-001',  name: 'Math Puzzle',          type: 'puzzle',  icon: '🔢', color: '#f59e0b', description: 'Arithmetic and quantitative aptitude', skillTags: ['numerical_ability'], isPublished: true },
  { id: 'logic-001',   name: 'Logic Sequences',      type: 'logic',   icon: '🔗', color: '#10b981', description: 'Number and letter sequences', skillTags: ['logical_reasoning'], isPublished: true },
  { id: 'pattern-001', name: 'Pattern Recognition',  type: 'pattern', icon: '🔷', color: '#ec4899', description: 'Visual and alphabetic patterns', skillTags: ['visual_reasoning'], isPublished: true },
  { id: 'memory-001',  name: 'Memory Challenge',     type: 'memory',  icon: '💡', color: '#8b5cf6', description: 'Memorize and recall sequences', skillTags: ['working_memory'], isPublished: true },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aage');
  console.log('Connected to MongoDB');

  // Users
  for (const userData of [DEFAULT_ADMIN, DEFAULT_STUDENT]) {
    const exists = await User.findOne({ email: userData.email });
    if (!exists) {
      await User.create(userData);
      console.log(`Created user: ${userData.email}`);
    } else {
      console.log(`User exists: ${userData.email}`);
    }
  }

  // Games
  for (const gameData of DEFAULT_GAMES) {
    const exists = await GameConfig.findOne({ id: gameData.id });
    if (!exists) {
      await GameConfig.create(gameData);
      console.log(`Created game: ${gameData.name}`);
    }
  }

  console.log('\n✅ Seed complete!');
  console.log('Admin login:   admin@aage.com / Admin@1234');
  console.log('Student login: student@aage.com / Student@123');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
