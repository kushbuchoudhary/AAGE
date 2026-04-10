require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');  // ← ADD THIS

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const sessionRoutes = require('./routes/sessions');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const leaderboardRoutes = require('./routes/leaderboard');
const { setupSocketHandlers } = require('./services/socketService');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const httpServer = createServer(app);

// ── MongoDB Connection ──────────────────────────────  ← ADD THESE 4 LINES
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aage')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

// Socket.io setup
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', engine: 'AAGE v1.0' }));

// Socket setup
setupSocketHandlers(io);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🎮 AAGE Backend running on port ${PORT}`);
  console.log(`🧠 AI Engine: Active`);
  console.log(`🔌 WebSocket: Ready\n`);
});

module.exports = { app, io };