# AAGE — Adaptive AI Game Engine for Aptitude Training

A modular, AI-powered educational game engine for aptitude training, placement prep, and cognitive skill development.

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB v6+ (local or Atlas)

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# Edit MONGODB_URI in backend/.env
```

### 3. Seed database
```bash
node backend/src/seed.js
# Admin: admin@aage.com / Admin@1234
# Student: student@aage.com / Student@123
```

### 4. Start dev servers
```bash
npm run dev
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

## Docker Deployment
```bash
docker-compose up --build
```

## Game Types
| ID | Name | Type | Skills |
|----|------|------|--------|
| quiz-001 | Aptitude Quiz | quiz | Verbal, Analytical |
| puzzle-001 | Math Puzzle | puzzle | Numerical, Arithmetic |
| logic-001 | Logic Sequences | logic | Logical Reasoning |
| pattern-001 | Pattern Recognition | pattern | Visual Reasoning |
| memory-001 | Memory Challenge | memory | Working Memory |

## AI Adaptive Difficulty
The engine tracks the last 5 answers and adjusts difficulty (1-10):
- 3 consecutive correct or 80%+ accuracy with fast responses → increase difficulty
- 3 consecutive wrong or below 40% accuracy → decrease difficulty

## Tech Stack
- Frontend: React 18, React Router v6, Recharts, Socket.io-client
- Backend: Node.js, Express, Socket.io, MongoDB/Mongoose
- Auth: JWT + bcryptjs
- Deployment: Docker + Nginx

## Project Structure
```
aage/
  frontend/src/
    hooks/          useAuth, useSocket
    components/
      UI/           Layout, LoginPage
      GameEngine/   GameSession (core play loop)
      Games/        GameLobby
      Dashboard/    Dashboard, Analytics, Leaderboard
      Admin/        AdminPanel
  backend/src/
    services/       gameEngineCore, adaptiveAI, socketService
    routes/         auth, games, sessions, analytics, leaderboard, admin
    models/         User, GameSession, GameConfig
    middleware/     auth, errorHandler
    seed.js
```

## API Endpoints
- POST /api/auth/register|login
- GET  /api/games
- POST /api/games/:id/question  (adaptive question generation)
- POST /api/sessions            (create session)
- POST /api/sessions/:id/answer (submit + get next question)
- GET  /api/analytics/overview|skills
- GET  /api/leaderboard
- GET  /api/admin/stats|users   (admin only)

## WebSocket Events
- game:start → game:started + question
- game:answer → game:answer:result + next question + difficulty update
- leaderboard:update (broadcast on every score change)
- bot:answer (AI opponent response)

MIT License
