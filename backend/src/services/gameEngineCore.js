/**
 * AAGE Game Engine Core
 * Manages plugin loading, game lifecycle, state machine, and event bus.
 */
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

class GameEngineCore extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();       // Registered game plugins
    this.activeSessions = new Map(); // Active game sessions
    this.gameTypes = ['quiz', 'puzzle', 'logic', 'pattern', 'memory'];
  }

  // ─── Plugin Registry ─────────────────────────────────────────────────
  registerPlugin(plugin) {
    if (!plugin.id || !plugin.type || !this.gameTypes.includes(plugin.type)) {
      throw new Error(`Invalid plugin: must have id and type in [${this.gameTypes.join(', ')}]`);
    }
    this.plugins.set(plugin.id, plugin);
    this.emit('plugin:registered', plugin.id);
    return this;
  }

  getPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);
    return plugin;
  }

  listPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id, type: p.type, name: p.name, description: p.description
    }));
  }

  // ─── Session Management ───────────────────────────────────────────────
  createSession(userId, pluginId, options = {}) {
    const plugin = this.getPlugin(pluginId);
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      pluginId,
      state: 'idle',         // idle | active | paused | completed
      difficulty: options.difficulty || 1,
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      startTime: null,
      endTime: null,
      questions: [],
      responses: [],
      skillsTagged: plugin.skillTags || [],
      createdAt: new Date()
    };
    this.activeSessions.set(sessionId, session);
    this.emit('session:created', sessionId);
    return session;
  }

  startSession(sessionId) {
    const session = this._getSession(sessionId);
    session.state = 'active';
    session.startTime = new Date();
    this.emit('session:started', sessionId);
    return session;
  }

  pauseSession(sessionId) {
    const session = this._getSession(sessionId);
    session.state = 'paused';
    this.emit('session:paused', sessionId);
    return session;
  }

  endSession(sessionId) {
    const session = this._getSession(sessionId);
    session.state = 'completed';
    session.endTime = new Date();
    session.duration = (session.endTime - session.startTime) / 1000;
    session.accuracy = session.totalAnswers > 0
      ? Math.round((session.correctAnswers / session.totalAnswers) * 100)
      : 0;
    this.emit('session:ended', sessionId, session);
    this.activeSessions.delete(sessionId);
    return session;
  }

  recordResponse(sessionId, { questionId, answer, isCorrect, responseTime }) {
    const session = this._getSession(sessionId);
    session.totalAnswers++;
    if (isCorrect) session.correctAnswers++;
    session.responses.push({ questionId, answer, isCorrect, responseTime, timestamp: new Date() });
    this.emit('session:response', sessionId, { isCorrect, responseTime });
    return session;
  }

  _getSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    return session;
  }

  getSession(sessionId) {
    return this._getSession(sessionId);
  }
}

// Singleton export
const engineCore = new GameEngineCore();
module.exports = engineCore;
