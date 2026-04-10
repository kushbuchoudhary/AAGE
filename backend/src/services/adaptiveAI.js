/**
 * AAGE Adaptive AI Service
 * Fixed: unique question generation per difficulty, varied question pools,
 *        correct timeLimit returned with every question.
 */

const { v4: uuidv4 } = require('uuid');

// ─── Difficulty Bands ─────────────────────────────────────────────────────────
const DIFFICULTY_BANDS = {
  1:  { label: 'Beginner',     timeLimit: 30, penaltyMultiplier: 0.5 },
  2:  { label: 'Easy',         timeLimit: 25, penaltyMultiplier: 0.6 },
  3:  { label: 'Easy-Medium',  timeLimit: 22, penaltyMultiplier: 0.7 },
  4:  { label: 'Medium',       timeLimit: 20, penaltyMultiplier: 0.8 },
  5:  { label: 'Medium',       timeLimit: 18, penaltyMultiplier: 0.9 },
  6:  { label: 'Medium-Hard',  timeLimit: 15, penaltyMultiplier: 1.0 },
  7:  { label: 'Hard',         timeLimit: 12, penaltyMultiplier: 1.1 },
  8:  { label: 'Hard',         timeLimit: 10, penaltyMultiplier: 1.2 },
  9:  { label: 'Expert',       timeLimit: 8,  penaltyMultiplier: 1.3 },
  10: { label: 'Master',       timeLimit: 6,  penaltyMultiplier: 1.5 }
};

// ─── Skill Map ────────────────────────────────────────────────────────────────
const SKILL_MAP = {
  quiz:    ['verbal_ability', 'general_knowledge', 'reading_comprehension'],
  puzzle:  ['logical_reasoning', 'spatial_thinking', 'problem_solving'],
  logic:   ['analytical_thinking', 'deductive_reasoning', 'pattern_recognition'],
  pattern: ['visual_reasoning', 'sequence_analysis', 'abstract_thinking'],
  memory:  ['working_memory', 'attention_to_detail', 'recall_speed']
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueWrongOptions(correct, count, spread) {
  const wrong = new Set();
  let attempts = 0;
  while (wrong.size < count && attempts < 100) {
    attempts++;
    const offset = Math.floor(Math.random() * spread * 4) - spread * 2;
    const candidate = correct + offset;
    if (candidate !== correct && candidate > 0) wrong.add(candidate);
  }
  // fill if not enough
  let fill = correct + 1;
  while (wrong.size < count) { if (fill !== correct) wrong.add(fill); fill++; }
  return [...wrong].slice(0, count);
}

// ─── Question Generators ──────────────────────────────────────────────────────

// ARITHMETIC — scales operand size, operation type, and number of steps with difficulty
function makeArithmetic(difficulty) {
  const ops = difficulty <= 2 ? ['+', '-']
    : difficulty <= 5 ? ['+', '-', '*']
    : ['+', '-', '*', '/'];

  const op = ops[Math.floor(Math.random() * ops.length)];
  const base = difficulty * 8 + Math.floor(Math.random() * difficulty * 5);
  let a, b, answer, text;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * base) + difficulty;
      b = Math.floor(Math.random() * base) + difficulty;
      answer = a + b;
      text = `${a} + ${b} = ?`;
      break;
    case '-':
      a = Math.floor(Math.random() * base) + difficulty * 2;
      b = Math.floor(Math.random() * (a - 1)) + 1;
      answer = a - b;
      text = `${a} − ${b} = ?`;
      break;
    case '*': {
      const maxFactor = difficulty <= 5 ? 12 : 25;
      a = Math.floor(Math.random() * maxFactor) + 2;
      b = Math.floor(Math.random() * maxFactor) + 2;
      // higher difficulties: add a third step
      if (difficulty >= 7) {
        const c = Math.floor(Math.random() * 5) + 2;
        answer = a * b + c;
        text = `${a} × ${b} + ${c} = ?`;
      } else {
        answer = a * b;
        text = `${a} × ${b} = ?`;
      }
      break;
    }
    case '/': {
      b = Math.floor(Math.random() * (difficulty + 3)) + 2;
      answer = Math.floor(Math.random() * (difficulty + 5)) + 1;
      a = answer * b;
      text = `${a} ÷ ${b} = ?`;
      break;
    }
  }

  const spread = Math.max(3, difficulty * 2);
  const wrong = uniqueWrongOptions(answer, 3, spread);
  return {
    type: 'arithmetic',
    text,
    answer: String(answer),
    options: shuffle([String(answer), ...wrong.map(String)]),
    difficulty,
    skillTags: ['numerical_ability', 'arithmetic']
  };
}

// SEQUENCE — different series rules per difficulty band
function makeSequence(difficulty) {
  // Each entry: [visible terms, rule description, generator fn → { seq, answer }]
  const rules = [
    // d1-2
    { minD: 1, maxD: 2, gen: () => { const s = Math.floor(Math.random()*5)+1, d=Math.floor(Math.random()*5)+2; const seq=[s,s+d,s+2*d,s+3*d,s+4*d]; return { seq: seq.slice(0,4), answer: seq[4], hint:'AP' }; }},
    { minD: 1, maxD: 2, gen: () => { const s = Math.floor(Math.random()*10)+2; const seq=[s,s*2,s*3,s*4,s*5]; return { seq: seq.slice(0,4), answer: seq[4], hint:'×n' }; }},
    // d3-4
    { minD: 3, maxD: 4, gen: () => { const s=Math.floor(Math.random()*3)+2, r=Math.floor(Math.random()*2)+2; const seq=[s,s*r,s*r**2,s*r**3,s*r**4]; return { seq: seq.slice(0,4), answer: seq[4], hint:'GP' }; }},
    { minD: 3, maxD: 4, gen: () => { const seq=[1,1,2,3,5,8,13,21]; const start=Math.floor(Math.random()*3); return { seq: seq.slice(start,start+4), answer: seq[start+4], hint:'Fibonacci' }; }},
    // d5-6
    { minD: 5, maxD: 6, gen: () => { const s=Math.floor(Math.random()*3)+1; const seq=[s,s**2,s**3,s**4,s**5]; return { seq: seq.slice(0,4), answer: seq[4], hint:'powers' }; }},
    { minD: 5, maxD: 6, gen: () => { const d1=Math.floor(Math.random()*3)+2, d2=Math.floor(Math.random()*3)+2; const s=Math.floor(Math.random()*5)+1; const seq=[s,s+d1,s+d1+d2,s+d1+d2+(d1+d2),s+d1+d2+(d1+d2)+(d1+d2+1)]; return { seq: seq.slice(0,4), answer: seq[4], hint:'double diff' }; }},
    // d7-8
    { minD: 7, maxD: 8, gen: () => { const a=Math.floor(Math.random()*5)+2,b=Math.floor(Math.random()*5)+2; const seq=[a,b,a+b,a+2*b,2*a+3*b,3*a+5*b]; return { seq: seq.slice(0,5), answer: seq[5], hint:'mixed' }; }},
    { minD: 7, maxD: 8, gen: () => { const n=Math.floor(Math.random()*4)+3; const seq=Array.from({length:6},(_,i)=>(n+i)**2-(n+i)); return { seq: seq.slice(0,5), answer: seq[5], hint:'n²-n' }; }},
    // d9-10
    { minD: 9, maxD: 10, gen: () => { const p=[2,3,5,7,11,13,17,19,23,29,31]; const s=Math.floor(Math.random()*5); return { seq: p.slice(s,s+4), answer: p[s+4], hint:'primes' }; }},
    { minD: 9, maxD: 10, gen: () => { const s=Math.floor(Math.random()*3)+2; const seq=Array.from({length:6},(_,i)=>s**(i+1)+(i+1)); return { seq: seq.slice(0,5), answer: seq[5], hint:'exp+n' }; }},
  ];

  const matching = rules.filter(r => difficulty >= r.minD && difficulty <= r.maxD);
  const rule = matching[Math.floor(Math.random() * matching.length)] || rules[0];
  const { seq, answer } = rule.gen();

  const spread = Math.max(5, answer * 0.3);
  const wrong = uniqueWrongOptions(answer, 3, Math.ceil(spread));

  return {
    type: 'sequence',
    text: `Find the next number: ${seq.join(', ')}, ?`,
    answer: String(answer),
    options: shuffle([String(answer), ...wrong.map(String)]),
    difficulty,
    skillTags: ['pattern_recognition', 'analytical_thinking']
  };
}

// PATTERN — bigger pool, rotated based on difficulty
function makePattern(difficulty) {
  const pools = {
    easy: [
      { q: 'AZ, BY, CX, D?',     a: 'W',   opts: ['W','V','X','Y'] },
      { q: '1A, 2B, 3C, 4?',     a: 'D',   opts: ['D','E','C','F'] },
      { q: 'Z, X, V, T, ?',      a: 'R',   opts: ['R','S','Q','P'] },
      { q: 'AB, CD, EF, ?',       a: 'GH',  opts: ['GH','HI','FG','GI'] },
      { q: 'AC, CE, EG, ?',       a: 'GI',  opts: ['GI','HJ','FH','IK'] },
      { q: 'A1, B2, C3, ?',       a: 'D4',  opts: ['D4','E5','C4','D3'] },
      { q: 'ZA, YB, XC, ?',       a: 'WD',  opts: ['WD','VE','XD','WE'] },
    ],
    medium: [
      { q: '2, 3, 5, 7, 11, ?',   a: '13',  opts: ['13','12','14','15'] },
      { q: '1, 4, 9, 16, 25, ?',  a: '36',  opts: ['36','35','49','32'] },
      { q: 'ACE, BDF, CEG, ?',    a: 'DFH', opts: ['DFH','EGI','CFH','DEG'] },
      { q: 'CMM, DNN, EOO, ?',    a: 'FPP', opts: ['FPP','GPP','FQQ','EPP'] },
      { q: 'ABA, BCB, CDC, ?',    a: 'DED', opts: ['DED','EDE','CEC','DEF'] },
      { q: '2Z, 4Y, 6X, ?',       a: '8W',  opts: ['8W','8V','7W','9W'] },
      { q: 'A2Z, B4Y, C6X, ?',    a: 'D8W', opts: ['D8W','E8W','D9W','C8W'] },
    ],
    hard: [
      { q: 'DCBA, HGFE, LKJI, ?', a: 'PONM', opts: ['PONM','OPNM','PNOM','NOPQ'] },
      { q: 'J2Z, K4Y, L6X, ?',    a: 'M8W',  opts: ['M8W','N8W','M9W','L8W'] },
      { q: '1, 6, 15, 28, 45, ?', a: '66',   opts: ['66','64','68','70'] },
      { q: 'A1B2C3, B2C3D4, C3D4E5, ?', a: 'D4E5F6', opts: ['D4E5F6','E4F5G6','D3E4F5','C4D5E6'] },
      { q: 'QAR, RAS, SAT, TAU, ?', a: 'UAV', opts: ['UAV','VAW','UAW','TAV'] },
    ]
  };

  const pool = difficulty <= 3 ? pools.easy
    : difficulty <= 7 ? pools.medium
    : pools.hard;

  const item = pool[Math.floor(Math.random() * pool.length)];

  return {
    type: 'pattern',
    text: `Complete the pattern: ${item.q}`,
    answer: item.a,
    options: shuffle(item.opts),
    difficulty,
    skillTags: ['visual_reasoning', 'sequence_analysis']
  };
}

// REASONING — scaled by difficulty band
function makeReasoning(difficulty) {
  const allQ = [
    { d:1, text:'Which is the odd one out: Apple, Mango, Potato, Banana?', answer:'Potato', options:['Apple','Mango','Potato','Banana'] },
    { d:1, text:'Dog is to Kennel as Bird is to?', answer:'Nest', options:['Nest','Cage','Den','Burrow'] },
    { d:2, text:'All cats are animals. All animals have hearts. Therefore all cats have?', answer:'Hearts', options:['Hearts','Tails','Claws','Fur'] },
    { d:2, text:'Book is to Library as Painting is to?', answer:'Museum', options:['Museum','Artist','Canvas','Gallery'] },
    { d:3, text:'If P > Q and Q > R, then:', answer:'P > R', options:['P > R','R > P','P = R','Cannot determine'] },
    { d:3, text:'All roses are flowers. Some flowers fade quickly. Which MUST be true?', answer:'Some roses are flowers', options:['All flowers are roses','Some roses are flowers','All roses fade quickly','No roses fade'] },
    { d:4, text:'A man walks 5 km North, turns right 3 km, then right again 5 km. How far from start?', answer:'3 km', options:['3 km','5 km','8 km','13 km'] },
    { d:4, text:'If in a code, FIRE = 6, WIND = 8, then RAIN = ?', answer:'7', options:['7','6','8','9'] },
    { d:5, text:'Today is Wednesday. What day will it be 100 days from now?', answer:'Friday', options:['Friday','Thursday','Saturday','Sunday'] },
    { d:5, text:'A clock shows 3:15. What is the angle between the hands?', answer:'7.5°', options:['7.5°','0°','15°','22.5°'] },
    { d:6, text:'If SCHOOL is coded as FPERVN, then TEACHER starts with?', answer:'G', options:['G','H','F','I'] },
    { d:6, text:'In a row of 20, A is 7th from left. B is 5 places to A\'s right. B\'s position from right?', answer:'9th', options:['9th','8th','10th','11th'] },
    { d:7, text:'Pointing to a woman, a man says "Her mother\'s only son is my father." What relation is the woman to the man?', answer:'Aunt', options:['Aunt','Sister','Mother','Grandmother'] },
    { d:7, text:'A train 200m long passes a 300m bridge in 25 seconds. Speed in km/h?', answer:'72', options:['72','36','54','90'] },
    { d:8, text:'If 6 cats kill 6 rats in 6 minutes, how many cats kill 100 rats in 100 minutes?', answer:'6', options:['6','100','60','10'] },
    { d:8, text:'A is 2 ranks ahead of B who is 5 ranks behind C. If C is 10th, A\'s rank?', answer:'7th', options:['7th','8th','6th','9th'] },
    { d:9, text:'Two pipes fill a tank in 6h and 4h. Drain empties in 12h. All open: time to fill?', answer:'4h', options:['4h','3h','6h','5h'] },
    { d:9, text:'A, B, C can do a job in 6, 8, 12 days. All work together for 2 days, then A leaves. How many more days?', answer:'2', options:['2','3','1','4'] },
    { d:10, text:'A rectangular box 10×8×6 cm. Longest diagonal?', answer:'√200 cm', options:['√200 cm','√164 cm','14 cm','√100 cm'] },
    { d:10, text:'In how many ways can 5 different books be arranged on a shelf if 2 specific books must always be together?', answer:'48', options:['48','120','24','96'] },
  ];

  const matching = allQ.filter(q => Math.abs(q.d - difficulty) <= 1);
  const pool = matching.length >= 2 ? matching : allQ.filter(q => q.d <= difficulty + 1);
  const q = pool[Math.floor(Math.random() * pool.length)];

  return {
    type: 'reasoning',
    text: q.text,
    answer: q.answer,
    options: shuffle(q.options),
    difficulty,
    skillTags: ['logical_reasoning', 'deductive_reasoning']
  };
}

// MEMORY — length scales with difficulty, countdown time decreases
function makeMemory(difficulty) {
  const len = Math.min(3 + Math.floor(difficulty * 1.2), 14);
  const digits = Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
  const memorizeTime = Math.max(1500, 6000 - difficulty * 450);

  const wrong = [
    // reversed
    digits.split('').reverse().join(''),
    // shift first digit to end
    digits.slice(1) + digits[0],
    // change one random digit
    digits.split('').map((d, i) => i === Math.floor(Math.random() * len) ? String((+d + 1 + Math.floor(Math.random()*3)) % 10) : d).join('')
  ];

  // ensure all wrong options are unique and differ from correct
  const uniqueWrong = [...new Set(wrong)].filter(w => w !== digits).slice(0, 3);
  while (uniqueWrong.length < 3) uniqueWrong.push(String(parseInt(digits) + uniqueWrong.length + 1).padStart(len, '0').slice(0, len));

  return {
    type: 'memory',
    text: `Memorize this sequence: ${digits}`,
    answer: digits,
    options: shuffle([digits, ...uniqueWrong]),
    difficulty,
    memorizeTime,
    skillTags: ['working_memory', 'recall_speed']
  };
}

// ─── Adaptive AI Service ──────────────────────────────────────────────────────
class AdaptiveAIService {
  constructor() {
    this.sessionProfiles = new Map();
  }

  initProfile(sessionId, startDifficulty = 3) {
    this.sessionProfiles.set(sessionId, {
      difficulty: Math.min(10, Math.max(1, startDifficulty)),
      recentResults: [],
      avgResponseTime: [],
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      questionsAsked: new Set() // prevent repeats within a session
    });
  }

  adaptDifficulty(sessionId, isCorrect, responseTimeMs) {
    const profile = this.sessionProfiles.get(sessionId);
    if (!profile) return 5;

    profile.recentResults.push(isCorrect);
    profile.avgResponseTime.push(responseTimeMs);
    if (profile.recentResults.length > 5) profile.recentResults.shift();
    if (profile.avgResponseTime.length > 5) profile.avgResponseTime.shift();

    if (isCorrect) { profile.consecutiveCorrect++; profile.consecutiveWrong = 0; }
    else           { profile.consecutiveWrong++;   profile.consecutiveCorrect = 0; }

    const recentAcc = profile.recentResults.filter(Boolean).length / profile.recentResults.length;
    const avgTime   = profile.avgResponseTime.reduce((a, b) => a + b, 0) / profile.avgResponseTime.length;
    const band      = DIFFICULTY_BANDS[profile.difficulty] || DIFFICULTY_BANDS[5];
    const expectedMs = band.timeLimit * 1000;

    if (profile.consecutiveCorrect >= 3 || (recentAcc >= 0.8 && avgTime < expectedMs * 0.55)) {
      profile.difficulty = Math.min(10, profile.difficulty + 1);
      profile.consecutiveCorrect = 0;
    } else if (profile.consecutiveWrong >= 3 || (recentAcc < 0.4 && profile.recentResults.length >= 3)) {
      profile.difficulty = Math.max(1, profile.difficulty - 1);
      profile.consecutiveWrong = 0;
    }

    return profile.difficulty;
  }

  getCurrentDifficulty(sessionId) {
    return this.sessionProfiles.get(sessionId)?.difficulty || 5;
  }

  getDifficultyInfo(difficulty) {
    const d = Math.min(10, Math.max(1, difficulty));
    return { ...DIFFICULTY_BANDS[d], level: d };
  }

  // ── Question Generation (with timeLimit included) ──────────────────────────
  generateQuestion(gameType, difficulty) {
    const d = Math.min(10, Math.max(1, difficulty));
    const band = DIFFICULTY_BANDS[d];

    const generators = {
      quiz:    makeReasoning,
      puzzle:  makeArithmetic,
      logic:   makeSequence,
      pattern: makePattern,
      memory:  makeMemory
    };

    const gen = generators[gameType] || makeArithmetic;
    const q = gen(d);

    return {
      ...q,
      id: uuidv4(),
      difficulty: d,
      timeLimit: band.timeLimit,     // ← always included so frontend can use it
      difficultyLabel: band.label,
      generatedAt: new Date()
    };
  }

  generateLevel(gameType, levelNumber) {
    const difficulty = Math.min(1 + Math.floor(levelNumber / 2), 10);
    const count = 5 + levelNumber;
    return {
      levelNumber, difficulty,
      questionCount: count,
      questions: Array.from({ length: count }, () => this.generateQuestion(gameType, difficulty)),
      targetScore: count * 100 * difficulty,
      timeBonus: DIFFICULTY_BANDS[difficulty].timeLimit
    };
  }

  // ── AI Bot ─────────────────────────────────────────────────────────────────
  getBotAnswer(question, botDifficulty) {
    const correctnessProbability = 0.3 + (botDifficulty / 10) * 0.6;
    const isCorrect = Math.random() < correctnessProbability;
    const band = DIFFICULTY_BANDS[botDifficulty] || DIFFICULTY_BANDS[5];
    const thinkTime = (band.timeLimit * 0.4 + Math.random() * band.timeLimit * 0.4) * 1000;
    return {
      answer: isCorrect ? question.answer : (question.options || []).find(o => o !== question.answer),
      isCorrect,
      thinkTime
    };
  }

  // ── Skill Mapping ──────────────────────────────────────────────────────────
  getSkillsForGameType(gameType) {
    return SKILL_MAP[gameType] || [];
  }

  mapPerformanceToSkills(sessionData) {
    const { pluginType, accuracy, avgResponseTime } = sessionData;
    const skills = SKILL_MAP[pluginType] || [];
    return skills.map(skill => ({
      skill, gameType: pluginType, proficiency: accuracy, speed: avgResponseTime,
      status: accuracy >= 70 ? 'strong' : accuracy >= 50 ? 'developing' : 'needs_work'
    }));
  }
}

module.exports = new AdaptiveAIService();
