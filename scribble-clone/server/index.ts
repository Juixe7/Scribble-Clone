import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// ==========================================
// DATA MODELS (Blueprint §2)
// ==========================================

interface Player {
  id: string;  // socket id
  name: string;
  score: number;
  hasGuessed: boolean;
  isConnected: boolean;
  avatarColor: string;
  guessTime?: number;   // ms elapsed when guessed
  guessPosition?: number;
}

interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  language: string;
  customWords: string[];
  customWordsOnly: boolean;
  hintCount: number;
  wordChoiceCount: number;
}

// Game states from Blueprint §6
type GameState = 'waiting' | 'choosingWord' | 'drawing' | 'turnEnd' | 'roundEnd' | 'gameEnd';
type RoomPhase = 'lobby' | 'in-game';

interface Room {
  id: string;
  type: 'public' | 'private';
  inviteCode: string | null;
  ownerId: string;
  settings: RoomSettings;
  state: GameState;
  phase: RoomPhase;
  players: Record<string, Player>;
  currentDrawerId: string | null;
  currentDrawerIndex: number;
  currentRound: number;
  currentWord: string | null;
  wordChoices: string[];
  roundStartTime: number | null;    // Unix ms when drawing started
  hintsRevealed: number;
  hintTemplate: string;             // e.g. "_ _ _ _ _"
  guessedPlayerIds: string[];
  guessOrder: string[];
  drawnThisRound: string[];         // player IDs who already drew this round
  roundTurnOrder: string[];         // snapshot of player order at round start
  usedWords: string[];              // words used this game
  bannedUserIds: string[];
  scores: Record<string, number>;
  scoreTimestamps: Record<string, number>;
  kickVotes: Record<string, { voters: string[], lastFailedAt: number }>;

  // Timers
  gracePeriodTimeouts: Record<string, NodeJS.Timeout>;
  selectionTimeout: NodeJS.Timeout | null;
  drawingTimeout: NodeJS.Timeout | null;
  hintTimeouts: NodeJS.Timeout[];
  turnEndTimeout: NodeJS.Timeout | null;

  // Canvas
  strokeHistory: any[];

  // Public room auto-start
  startingSoonTimeout: NodeJS.Timeout | null;
  startingSoonEndTime: number | null;
}

// ==========================================
// IN-MEMORY STATE
// ==========================================
const rooms: Record<string, Room> = {};
const inviteCodes: Record<string, string> = {}; // inviteCode -> roomId

// ==========================================
// CONSTANTS
// ==========================================
const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];

const WORDS = [
  'apple', 'banana', 'car', 'house', 'sun', 'tree', 'dog', 'cat', 'bird', 'fish',
  'computer', 'phone', 'guitar', 'piano', 'sunglasses', 'mountain', 'ocean', 'bridge', 'clock', 'book',
  'train', 'airplane', 'giraffe', 'elephant', 'castle', 'pyramid', 'rocket', 'moon', 'astronaut', 'spider',
  'butterfly', 'snowflake', 'umbrella', 'bicycle', 'rainbow', 'volcano', 'dinosaur', 'hamburger', 'pizza', 'diamond',
  'crown', 'sword', 'shield', 'wizard', 'dragon', 'mermaid', 'robot', 'ninja', 'pirate', 'ghost',
  'camera', 'telescope', 'microscope', 'hourglass', 'compass', 'anchor', 'lighthouse', 'windmill', 'cactus', 'mushroom',
  'penguin', 'kangaroo', 'octopus', 'seahorse', 'flamingo', 'parrot', 'dolphin', 'whale', 'turtle', 'lobster',
  'skateboard', 'surfboard', 'parachute', 'helicopter', 'submarine', 'spaceship', 'ferris wheel', 'roller coaster',
  'waterfall', 'igloo', 'tent', 'campfire', 'treasure', 'map', 'key', 'lock', 'candle', 'lantern',
  'snowman', 'scarecrow', 'kite', 'balloon', 'fireworks', 'drum', 'trumpet', 'violin', 'harp', 'microphone'
];

const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  language: 'en',
  customWords: [],
  customWordsOnly: false,
  hintCount: 2,
  wordChoiceCount: 3,
};

const WORD_SELECTION_TIME = 15; // seconds
const TURN_END_PAUSE = 5000;   // ms
const ROUND_END_PAUSE = 5000;  // ms
const GRACE_PERIOD = 15000;    // ms (shorter for dev)
const PUBLIC_START_DELAY = 10000; // ms

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateUniqueRoomId(): string {
  let id = generateRoomCode();
  while (rooms[id]) { id = generateRoomCode(); }
  return id;
}

function generateUniqueInviteCode(): string {
  let code = generateRoomCode();
  let retries = 0;
  while (inviteCodes[code] && retries < 10) {
    code = generateRoomCode();
    retries++;
  }
  return code;
}

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]!;
}

function getRandomWords(count: number, exclude: string[] = [], customWords: string[] = [], customOnly: boolean = false): string[] {
  let pool: string[];
  if (customOnly && customWords.length >= count) {
    pool = customWords;
  } else if (customWords.length > 0) {
    // Blend 50/50
    const half = Math.ceil(count / 2);
    const custom = [...customWords].sort(() => 0.5 - Math.random()).slice(0, half);
    const standard = WORDS.filter(w => !exclude.includes(w)).sort(() => 0.5 - Math.random()).slice(0, count - custom.length);
    pool = [...custom, ...standard];
  } else {
    pool = WORDS.filter(w => !exclude.includes(w));
  }

  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Levenshtein distance for close-guess detection (§10.2)
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }
  return matrix[a.length]![b.length]!;
}

// Build hint template from word: "elephant" → "_ _ _ _ _ _ _ _"
function buildHintTemplate(word: string): string {
  return word.split('').map(ch => ch === ' ' ? '  ' : '_').join(' ');
}

// Reveal a random letter in the hint template
function revealHintLetter(word: string, currentHint: string): string {
  const hintChars = currentHint.split(' ');
  const wordChars = word.split('');
  const unrevealed: number[] = [];

  for (let i = 0; i < wordChars.length; i++) {
    if (wordChars[i] !== ' ' && hintChars[i] === '_') {
      unrevealed.push(i);
    }
  }

  if (unrevealed.length === 0) return currentHint;

  const revealIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)]!;
  hintChars[revealIdx] = wordChars[revealIdx]!;

  return hintChars.join(' ');
}

// ==========================================
// SCORING ENGINE (Blueprint §11)
// ==========================================

function calculateGuesserScore(timeRemaining: number, totalTime: number, guessPosition: number): number {
  const base = 500;
  const timeBonus = Math.floor(500 * (timeRemaining / totalTime));
  const positionBonus = Math.floor(50 * (1 / guessPosition));
  return Math.min(1000, base + timeBonus + positionBonus);
}

function calculateDrawerScore(correctGuessers: number, totalGuessers: number): number {
  if (totalGuessers === 0) return 0;
  const ratio = correctGuessers / totalGuessers;
  let score = Math.floor(ratio * 500);
  if (correctGuessers === totalGuessers && totalGuessers > 0) score += 100;
  return score;
}

// ==========================================
// ROOM PAYLOAD (safe for clients) — Blueprint §7.4 security
// ==========================================

function getClientRoomState(room: Room, forSocketId: string) {
  const { gracePeriodTimeouts, selectionTimeout, drawingTimeout, hintTimeouts,
    turnEndTimeout, startingSoonTimeout, strokeHistory, ...safe } = room;

  const isDrawer = room.currentDrawerId === forSocketId;

  return {
    ...safe,
    currentWord: isDrawer ? room.currentWord : null,
    wordChoices: isDrawer && room.state === 'choosingWord' ? room.wordChoices : [],
    wordHint: room.hintTemplate,
    wordLength: room.currentWord ? room.currentWord.length : 0,
  };
}

// Broadcast room state to each player individually (masks targetWord)
function broadcastRoomState(room: Room) {
  const socketsInRoom = io.sockets.adapter.rooms.get(room.id);
  if (!socketsInRoom) return;
  for (const socketId of socketsInRoom) {
    io.to(socketId).emit('ROOM_UPDATE', getClientRoomState(room, socketId));
  }
}

// ==========================================
// GAME FLOW FUNCTIONS (Blueprint §6, §7, §8)
// ==========================================

function startGame(room: Room) {
  room.phase = 'in-game';
  room.currentRound = 1;
  room.drawnThisRound = [];
  room.usedWords = [];

  // Reset scores
  Object.values(room.players).forEach(p => {
    p.score = 0;
    p.hasGuessed = false;
  });
  room.scores = {};
  for (const pid of Object.keys(room.players)) {
    room.scores[pid] = 0;
  }

  // Snapshot turn order
  const connected = Object.values(room.players).filter(p => p.isConnected);
  room.roundTurnOrder = connected.map(p => p.id);
  room.currentDrawerIndex = 0;

  io.to(room.id).emit('GAME_STARTED', {
    players: Object.values(room.players).map(p => ({ id: p.id, name: p.name })),
    rounds: room.settings.rounds,
    firstDrawer: room.roundTurnOrder[0],
  });

  startNextTurn(room);
}

function startNextTurn(room: Room) {
  // Clear any pending timers
  clearRoomTimers(room);

  const connected = Object.values(room.players).filter(p => p.isConnected);
  if (connected.length < 2) {
    endGame(room);
    return;
  }

  // Find next eligible drawer
  const eligible = room.roundTurnOrder.filter(
    pid => !room.drawnThisRound.includes(pid) && room.players[pid]?.isConnected
  );

  if (eligible.length === 0) {
    // All players drew this round → round end
    handleRoundEnd(room);
    return;
  }

  const drawerId = eligible[0];
  room.currentDrawerId = drawerId;
  room.state = 'choosingWord';
  room.currentWord = null;
  room.wordChoices = [];
  room.guessedPlayerIds = [];
  room.guessOrder = [];
  room.hintsRevealed = 0;
  room.hintTemplate = '';
  room.roundStartTime = null;
  room.strokeHistory = [];

  // Reset guess state
  Object.values(room.players).forEach(p => { p.hasGuessed = false; p.guessTime = undefined; p.guessPosition = undefined; });

  // Check word pool recycle threshold
  const unplayedCount = WORDS.length - room.usedWords.length;
  // If remaining words are less than required for a full round
  if (unplayedCount < Object.keys(room.players).length * room.settings.wordChoiceCount) {
    room.usedWords = []; // flush
    console.log(`[WORD POOL] Recycled words for room ${room.id} due to low supply`);
  }

  // Get word choices for drawer
  const choices = getRandomWords(
    room.settings.wordChoiceCount,
    room.usedWords,
    room.settings.customWords,
    room.settings.customWordsOnly,
  );
  room.wordChoices = choices;

  // Clear canvas for new turn
  io.to(room.id).emit('CLEAR_CANVAS');

  // Send word choices ONLY to drawer
  io.to(drawerId).emit('WORD_CHOICES', { words: choices, timeToChoose: WORD_SELECTION_TIME });

  // Send "choosing" state to everyone else
  const drawerName = room.players[drawerId]?.name || 'Unknown';
  const allButDrawer = Object.keys(room.players).filter(pid => pid !== drawerId);
  for (const pid of allButDrawer) {
    io.to(pid).emit('WORD_SELECTING', { drawerName, timeToChoose: WORD_SELECTION_TIME });
  }

  broadcastRoomState(room);

  // 15s auto-pick timeout (§8.3)
  room.selectionTimeout = setTimeout(() => {
    const activeRoom = rooms[room.id];
    if (activeRoom && activeRoom.state === 'choosingWord') {
      const autoWord = activeRoom.wordChoices[0];
      if (autoWord) {
        startDrawingPhase(activeRoom, autoWord);
        io.to(activeRoom.currentDrawerId!).emit('CHAT_MESSAGE', {
          id: Date.now().toString(),
          sender: 'System',
          text: `Word was auto-selected: ${autoWord}`,
          type: 'system',
        });
      }
    }
  }, WORD_SELECTION_TIME * 1000);
}

function startDrawingPhase(room: Room, word: string) {
  if (room.selectionTimeout) { clearTimeout(room.selectionTimeout); room.selectionTimeout = null; }

  room.currentWord = word;
  room.state = 'drawing';
  room.usedWords.push(word);
  room.drawnThisRound.push(room.currentDrawerId!);
  room.wordChoices = [];
  room.roundStartTime = Date.now();
  room.hintTemplate = buildHintTemplate(word);
  room.hintsRevealed = 0;

  Object.values(room.players).forEach(p => { p.hasGuessed = false; });

  // Broadcast drawing started to all
  const drawerName = room.players[room.currentDrawerId!]?.name || 'Unknown';
  io.to(room.id).emit('DRAWING_STARTED', {
    drawer: drawerName,
    drawerId: room.currentDrawerId,
    wordLength: word.length,
    wordHint: room.hintTemplate,
    drawTime: room.settings.drawTime,
    roundStartTime: room.roundStartTime,
  });

  // Send actual word only to drawer
  io.to(room.currentDrawerId!).emit('CURRENT_WORD', { word });

  broadcastRoomState(room);

  // Set up drawing timer (§5.5)
  const drawTimeMs = room.settings.drawTime * 1000;
  room.drawingTimeout = setTimeout(() => {
    const activeRoom = rooms[room.id];
    if (activeRoom && activeRoom.state === 'drawing') {
      endTurn(activeRoom, 'timerExpired');
    }
  }, drawTimeMs);

  // Set up hint reveals (§8.5): at 1/3 and 2/3 of draw time
  const hintCount = room.settings.hintCount;
  room.hintTimeouts = [];
  for (let i = 1; i <= hintCount; i++) {
    const revealAt = Math.floor((i / (hintCount + 1)) * room.settings.drawTime) * 1000;
    const timeout = setTimeout(() => {
      const activeRoom = rooms[room.id];
      if (activeRoom && activeRoom.state === 'drawing' && activeRoom.currentWord) {
        activeRoom.hintTemplate = revealHintLetter(activeRoom.currentWord, activeRoom.hintTemplate);
        activeRoom.hintsRevealed++;

        // Send hint to non-drawers only
        const nonDrawers = Object.keys(activeRoom.players).filter(pid => pid !== activeRoom.currentDrawerId);
        for (const pid of nonDrawers) {
          io.to(pid).emit('HINT_REVEALED', { hint: activeRoom.hintTemplate });
        }
      }
    }, revealAt);
    room.hintTimeouts.push(timeout);
  }
}

function endTurn(room: Room, reason: 'allGuessed' | 'timerExpired' | 'drawerLeft') {
  if (room.state !== 'drawing') return;

  clearRoomTimers(room);

  room.state = 'turnEnd';

  // Calculate drawer score (§11.2)
  const totalGuessers = Object.values(room.players).filter(
    p => p.id !== room.currentDrawerId && p.isConnected
  ).length;
  const correctGuessers = room.guessedPlayerIds.length;
  const drawerScore = calculateDrawerScore(correctGuessers, totalGuessers);

  if (room.currentDrawerId && room.players[room.currentDrawerId]) {
    room.players[room.currentDrawerId].score += drawerScore;
    room.scores[room.currentDrawerId] = room.players[room.currentDrawerId].score;
  }

  // Build turn score summary
  const turnScores: Record<string, { delta: number; total: number }> = {};
  for (const p of Object.values(room.players)) {
    turnScores[p.id] = { delta: 0, total: p.score };
  }
  if (room.currentDrawerId) {
    turnScores[room.currentDrawerId] = { delta: drawerScore, total: room.players[room.currentDrawerId]?.score || 0 };
  }
  for (const pid of room.guessedPlayerIds) {
    const player = room.players[pid];
    if (player && player.guessTime !== undefined && player.guessPosition !== undefined) {
      const timeRemaining = Math.max(0, room.settings.drawTime - (player.guessTime / 1000));
      const delta = calculateGuesserScore(timeRemaining, room.settings.drawTime, player.guessPosition);
      turnScores[pid] = { delta, total: player.score };
    }
  }

  const sortedScores = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map(p => ({ userId: p.id, name: p.name, score: p.score, delta: turnScores[p.id]?.delta || 0 }));

  // Broadcast turn end
  io.to(room.id).emit('TURN_END', {
    word: room.currentWord,
    reason,
    scores: sortedScores,
    guessOrder: room.guessOrder,
    drawerScore,
    noOneGuessed: correctGuessers === 0,
  });

  io.to(room.id).emit('CHAT_MESSAGE', {
    id: Date.now().toString(),
    sender: 'System',
    text: `The word was: ${room.currentWord}`,
    type: 'system',
  });

  broadcastRoomState(room);

  // After 5s pause, proceed to next turn or round end
  room.turnEndTimeout = setTimeout(() => {
    const activeRoom = rooms[room.id];
    if (!activeRoom) return;

    activeRoom.currentDrawerId = null;
    activeRoom.currentWord = null;
    activeRoom.roundStartTime = null;
    activeRoom.hintTemplate = '';

    startNextTurn(activeRoom);
  }, TURN_END_PAUSE);
}

function handleRoundEnd(room: Room) {
  room.state = 'roundEnd';

  const sortedScores = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map(p => ({ userId: p.id, name: p.name, score: p.score }));

  io.to(room.id).emit('ROUND_END', {
    round: room.currentRound,
    totalRounds: room.settings.rounds,
    scores: sortedScores,
  });

  broadcastRoomState(room);

  room.turnEndTimeout = setTimeout(() => {
    const activeRoom = rooms[room.id];
    if (!activeRoom) return;

    activeRoom.currentRound++;
    if (activeRoom.currentRound > activeRoom.settings.rounds) {
      endGame(activeRoom);
    } else {
      // New round: snapshot turn order, reset drawn list
      const connected = Object.values(activeRoom.players).filter(p => p.isConnected);
      activeRoom.roundTurnOrder = connected.map(p => p.id);
      activeRoom.drawnThisRound = [];
      activeRoom.currentDrawerIndex = 0;

      io.to(activeRoom.id).emit('ROUND_STARTED', {
        round: activeRoom.currentRound,
        totalRounds: activeRoom.settings.rounds,
      });

      startNextTurn(activeRoom);
    }
  }, ROUND_END_PAUSE);
}

function endGame(room: Room) {
  clearRoomTimers(room);

  room.state = 'gameEnd';

  const sortedScores = Object.values(room.players)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tiebreaker: Earliest score timestamp wins
      return (room.scoreTimestamps[a.id] || 0) - (room.scoreTimestamps[b.id] || 0);
    })
    .map(p => ({ userId: p.id, name: p.name, score: p.score }));

  const winner = sortedScores[0] || null;

  io.to(room.id).emit('GAME_END', {
    winner,
    finalScores: sortedScores,
  });

  broadcastRoomState(room);

  // Auto-reset to lobby after 10s
  room.turnEndTimeout = setTimeout(() => {
    const activeRoom = rooms[room.id];
    if (!activeRoom) return;
    resetToLobby(activeRoom);
  }, 10000);
}

function resetToLobby(room: Room) {
  clearRoomTimers(room);

  room.state = 'waiting';
  room.phase = 'lobby';
  room.currentDrawerId = null;
  room.currentWord = null;
  room.wordChoices = [];
  room.roundStartTime = null;
  room.hintTemplate = '';
  room.hintsRevealed = 0;
  room.guessedPlayerIds = [];
  room.guessOrder = [];
  room.drawnThisRound = [];
  room.roundTurnOrder = [];
  room.usedWords = [];
  room.currentRound = 0;
  room.currentDrawerIndex = 0;
  room.strokeHistory = [];

  Object.values(room.players).forEach(p => {
    p.score = 0;
    p.hasGuessed = false;
    p.guessTime = undefined;
    p.guessPosition = undefined;
  });
  room.scores = {};
  for (const pid of Object.keys(room.players)) {
    room.scores[pid] = 0;
  }

  broadcastRoomState(room);

  if (room.type === 'public') {
    checkPublicRoomStart(room);
  }
}

function clearRoomTimers(room: Room) {
  if (room.selectionTimeout) { clearTimeout(room.selectionTimeout); room.selectionTimeout = null; }
  if (room.drawingTimeout) { clearTimeout(room.drawingTimeout); room.drawingTimeout = null; }
  if (room.turnEndTimeout) { clearTimeout(room.turnEndTimeout); room.turnEndTimeout = null; }
  if (room.startingSoonTimeout) { clearTimeout(room.startingSoonTimeout); room.startingSoonTimeout = null; }
  if (room.hintTimeouts) { room.hintTimeouts.forEach(t => clearTimeout(t)); room.hintTimeouts = []; }
}

function checkPublicRoomStart(room: Room) {
  if (room.type !== 'public' || room.state !== 'waiting') return;
  const connected = Object.values(room.players).filter(p => p.isConnected);
  if (connected.length >= 2 && !room.startingSoonTimeout) {
    room.startingSoonEndTime = Date.now() + 60000;
    broadcastRoomState(room);

    io.to(room.id).emit('AUTO_START_SCHEDULED', { startsIn: 60 });
    // Also emit legacy event for compatibility if any client still uses it
    io.to(room.id).emit('STARTING_SOON', { startTime: room.startingSoonEndTime });

    room.startingSoonTimeout = setTimeout(() => {
      const activeRoom = rooms[room.id];
      if (activeRoom && activeRoom.state === 'waiting') {
        activeRoom.startingSoonTimeout = null;
        activeRoom.startingSoonEndTime = null;
        const stillConnected = Object.values(activeRoom.players).filter(p => p.isConnected);
        if (stillConnected.length >= 2) {
          startGame(activeRoom);
        }
      }
    }, 60000);
  } else if (connected.length < 2 && room.startingSoonTimeout) {
    clearTimeout(room.startingSoonTimeout);
    room.startingSoonTimeout = null;
    room.startingSoonEndTime = null;
    broadcastRoomState(room);
    io.to(room.id).emit('AUTO_START_CANCELLED');
  }
}

// Kick a player
function kickPlayer(room: Room, playerId: string) {
  const player = room.players[playerId];
  if (!player) return;

  io.to(playerId).emit('KICKED', { reason: 'owner' });
  const targetSocket = io.sockets.sockets.get(playerId);
  if (targetSocket) targetSocket.leave(room.id);

  room.bannedUserIds.push(playerId);
  delete room.players[playerId];
  delete room.scores[playerId];

  if (room.ownerId === playerId) {
    const nextHost = Object.values(room.players).find(p => p.isConnected);
    if (nextHost) {
      room.ownerId = nextHost.id;
      io.to(room.id).emit('OWNER_TRANSFERRED', { newOwnerId: nextHost.id, newOwnerName: nextHost.name });
    }
  }

  // If kicked player was drawing, end turn
  if (room.currentDrawerId === playerId && room.state === 'drawing') {
    endTurn(room, 'drawerLeft');
  }

  broadcastRoomState(room);
  io.to(room.id).emit('CHAT_MESSAGE', {
    id: Date.now().toString(),
    sender: 'System',
    text: `${player.name} was kicked.`,
    type: 'system',
  });
}

// ==========================================
// SOCKET CONNECTION HANDLER
// ==========================================

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);

  // === CREATE ROOM ===
  socket.on('CREATE_ROOM', (payload: any, callback: (res: any) => void) => {
    let { playerName, isPublic = false, settings = {} } = typeof payload === 'string'
      ? { playerName: payload, isPublic: false, settings: {} }
      : payload;

    playerName = playerName || 'Player';

    const roomId = generateUniqueRoomId();
    const inviteCode = !isPublic ? generateUniqueInviteCode() : null;

    if (inviteCode) inviteCodes[inviteCode] = roomId;

    const playerCount = Object.keys(rooms).reduce((sum, rid) => {
      const r = rooms[rid];
      return sum + (r ? Object.keys(r.players).length : 0);
    }, 0);

    rooms[roomId] = {
      id: roomId,
      type: isPublic ? 'public' : 'private',
      inviteCode,
      ownerId: isPublic ? null as any : socket.id, // req 2

      settings: { ...DEFAULT_SETTINGS, ...settings },
      state: 'waiting',
      phase: 'lobby',
      players: {
        [socket.id]: {
          id: socket.id,
          name: playerName || 'Player',
          score: 0,
          hasGuessed: false,
          isConnected: true,
          avatarColor: getAvatarColor(playerCount),
        }
      },
      currentDrawerId: null,
      currentDrawerIndex: 0,
      currentRound: 0,
      currentWord: null,
      wordChoices: [],
      roundStartTime: null,
      hintsRevealed: 0,
      hintTemplate: '',
      guessedPlayerIds: [],
      guessOrder: [],
      drawnThisRound: [],
      roundTurnOrder: [],
      usedWords: [],
      bannedUserIds: [],
      scores: { [socket.id]: 0 },
      scoreTimestamps: { [socket.id]: Date.now() },
      kickVotes: {},
      gracePeriodTimeouts: {},
      selectionTimeout: null,
      drawingTimeout: null,
      hintTimeouts: [],
      turnEndTimeout: null,
      strokeHistory: [],
      startingSoonTimeout: null,
      startingSoonEndTime: null,
    };

    socket.join(roomId);
    console.log(`[CREATE] ${socket.id} created room ${roomId} (${isPublic ? 'public' : 'private'})`);

    const room = rooms[roomId]!;
    broadcastRoomState(room);
    callback({ success: true, roomId, inviteCode, room: getClientRoomState(room, socket.id) });
  });

  // === JOIN PUBLIC ROOM ===
  socket.on('JOIN_PUBLIC_ROOM', (playerName: string, callback: (res: any) => void) => {
    // Find available public room (most full first) — include in-game rooms
    const availableRooms = Object.values(rooms).filter(r => 
      r.type === 'public' && 
      r.state !== 'gameEnd' &&
      Object.keys(r.players).length < r.settings.maxPlayers
    );
    
    availableRooms.sort((a, b) => Object.keys(b.players).length - Object.keys(a.players).length);
    let availableRoom = availableRooms[0] || null;

    if (availableRoom) {
      joinRoom(socket, availableRoom, playerName);
      if (callback) callback({ success: true, roomId: availableRoom.id, room: getClientRoomState(availableRoom, socket.id) });
      checkPublicRoomStart(availableRoom);
    } else {
      // Auto-create new public room
      socket.emit('CREATE_ROOM', { playerName, isPublic: true }, callback);
      // Trigger the CREATE_ROOM handler we defined above
      // Actually let me just inline it here for reliability
      const roomId = generateUniqueRoomId();
      const playerCount = Object.keys(rooms).length;
      rooms[roomId] = {
        id: roomId,
        type: 'public',
        inviteCode: null,
        ownerId: null as any,
        settings: { ...DEFAULT_SETTINGS },
        state: 'waiting',
        phase: 'lobby',
        players: {
          [socket.id]: {
            id: socket.id, name: playerName || 'Player', score: 0,
            hasGuessed: false, isConnected: true, avatarColor: getAvatarColor(playerCount),
          }
        },
        currentDrawerId: null, currentDrawerIndex: 0, currentRound: 0,
        currentWord: null, wordChoices: [], roundStartTime: null,
        hintsRevealed: 0, hintTemplate: '', guessedPlayerIds: [], guessOrder: [],
        drawnThisRound: [], roundTurnOrder: [], usedWords: [], bannedUserIds: [],
        scores: { [socket.id]: 0 }, scoreTimestamps: { [socket.id]: Date.now() }, kickVotes: {},
        gracePeriodTimeouts: {}, selectionTimeout: null, drawingTimeout: null,
        hintTimeouts: [], turnEndTimeout: null, strokeHistory: [],
        startingSoonTimeout: null, startingSoonEndTime: null,
      };
      socket.join(roomId);
      const room = rooms[roomId]!;
      broadcastRoomState(room);
      if (callback) callback({ success: true, roomId, room: getClientRoomState(room, socket.id) });
    }
  });

  // === JOIN ROOM (by code) ===
  socket.on('JOIN_ROOM', ({ roomId, playerName }, callback: (res: any) => void) => {
    // Try invite code first, then room ID
    let room: Room | undefined;
    const resolvedRoomId = inviteCodes[roomId?.toUpperCase()] || roomId?.toUpperCase();
    room = rooms[resolvedRoomId];

    if (!room) {
      if (callback) callback({ success: false, message: 'Room not found' });
      return;
    }
    if (room.bannedUserIds.includes(socket.id)) {
      if (callback) callback({ success: false, message: 'You are banned from this room' });
      return;
    }
    if (Object.keys(room.players).length >= room.settings.maxPlayers) {
      if (callback) callback({ success: false, message: 'Room is full' });
      return;
    }
    // Mid-game join is now allowed for both public and private rooms

    joinRoom(socket, room, playerName);
    if (callback) callback({ success: true, roomId: room.id, inviteCode: room.inviteCode, room: getClientRoomState(room, socket.id) });

    if (room.type === 'public') {
      checkPublicRoomStart(room);
    }
  });

  function joinRoom(sock: Socket, room: Room, playerName: string) {
    playerName = playerName || 'Player';
    // Deduplicate name
    let finalName = playerName;
    let counter = 2;
    const existingNames = Object.values(room.players).map(p => p.name.toLowerCase());
    while (existingNames.includes(finalName.toLowerCase())) {
      finalName = `${playerName} #${counter}`;
      counter++;
    }

    const playerCount = Object.keys(room.players).length;
    const isMidGame = room.phase === 'in-game';
    room.players[sock.id] = {
      id: sock.id,
      name: finalName,
      score: 0,
      hasGuessed: isMidGame, // mid-game joiners wait for next turn
      isConnected: true,
      avatarColor: getAvatarColor(playerCount),
    };
    room.scores[sock.id] = 0;
    room.scoreTimestamps[sock.id] = Date.now();
    sock.join(room.id);
    console.log(`[JOIN] ${sock.id} joined room ${room.id}${isMidGame ? ' (mid-game)' : ''}`);

    // Send existing canvas strokes to mid-game joiner
    if (isMidGame && room.strokeHistory.length > 0) {
      for (const stroke of room.strokeHistory) {
        sock.emit('DRAW_STROKES_BATCH', stroke);
      }
    }

    broadcastRoomState(room);
    sock.to(room.id).emit('PLAYER_JOINED', {
      player: { id: sock.id, name: finalName, avatarColor: room.players[sock.id]?.avatarColor },
    });
    io.to(room.id).emit('CHAT_MESSAGE', {
      id: Date.now().toString(),
      sender: 'System',
      text: `${finalName} joined the room.`,
      type: 'system',
    });
  }

  // === START GAME ===
  socket.on('START_GAME', (roomId: string) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.type === 'public') return; // Public rooms auto-start
    if (room.ownerId !== socket.id) return;
    if (room.state !== 'waiting') return;

    const connected = Object.values(room.players).filter(p => p.isConnected);
    if (connected.length < 2) return;

    startGame(room);
  });

  // === SELECT WORD ===
  socket.on('SELECT_WORD', ({ roomId, word }: { roomId: string; word: string }) => {
    const room = rooms[roomId];
    if (!room || room.currentDrawerId !== socket.id) return;
    if (room.state !== 'choosingWord') return;
    if (!room.wordChoices.includes(word)) return;

    startDrawingPhase(room, word);
  });

  // === UPDATE SETTINGS ===
  socket.on('UPDATE_SETTINGS', (roomId: string, newSettings: Partial<RoomSettings>) => {
    const room = rooms[roomId];
    if (!room || room.ownerId !== socket.id) return;
    if (room.phase !== 'lobby') return;

    room.settings = { ...room.settings, ...newSettings };
    broadcastRoomState(room);
    io.to(roomId).emit('SETTINGS_UPDATED', { settings: room.settings });
  });

  // === GUESS / CHAT (Blueprint §10) ===
  socket.on('GUESS_WORD', ({ roomId, text }: { roomId: string; text: string }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players[socket.id];
    if (!player) return;

    // During drawing phase, process as guess
    if (room.state === 'drawing' && socket.id !== room.currentDrawerId && room.currentWord) {
      const normalized = text.trim().toLowerCase();
      const target = room.currentWord.toLowerCase();

      // Drawer can't guess
      if (socket.id === room.currentDrawerId) return;

      // Already guessed?
      if (player.hasGuessed) {
        // Guessed players can chat among themselves
        // Broadcast only to other guessed players + drawer
        const guessedAndDrawer = [...room.guessedPlayerIds, room.currentDrawerId!];
        for (const pid of guessedAndDrawer) {
          io.to(pid).emit('CHAT_MESSAGE', {
            id: Date.now().toString() + Math.random(),
            sender: player.name,
            text,
            type: 'guessed-chat',
          });
        }
        return;
      }

      // Check for correct guess
      if (normalized === target) {
        player.hasGuessed = true;
        room.guessedPlayerIds.push(socket.id);
        room.guessOrder.push(socket.id);

        const elapsed = Date.now() - (room.roundStartTime || Date.now());
        const guessPosition = room.guessOrder.length;
        player.guessTime = elapsed;
        player.guessPosition = guessPosition;

        // Calculate and award guesser score immediately (§11.3)
        const timeRemaining = Math.max(0, room.settings.drawTime - (elapsed / 1000));
        const points = calculateGuesserScore(timeRemaining, room.settings.drawTime, guessPosition);
        player.score += points;
        room.scores[socket.id] = player.score;
        room.scoreTimestamps[socket.id] = Date.now(); // Tiebreaker

        // Drawer bonus per guess
        if (room.currentDrawerId) {
          const drawer = room.players[room.currentDrawerId];
          if (drawer) {
            drawer.score += 50;
            room.scores[room.currentDrawerId] = drawer.score;
            room.scoreTimestamps[room.currentDrawerId] = Date.now(); // Tiebreaker
          }
        }

        io.to(roomId).emit('CORRECT_GUESS', {
          userId: socket.id,
          username: player.name,
          position: guessPosition,
        });

        io.to(roomId).emit('SCORE_UPDATE', {
          userId: socket.id,
          delta: points,
          total: player.score,
        });

        io.to(roomId).emit('CHAT_MESSAGE', {
          id: Date.now().toString(),
          sender: 'System',
          text: `${player.name} guessed the word!`,
          type: 'correct',
        });

        broadcastRoomState(room);

        // Check if all guessed (§7.6)
        const totalGuessers = Object.values(room.players).filter(
          p => p.id !== room.currentDrawerId && p.isConnected
        ).length;
        if (room.guessedPlayerIds.length >= totalGuessers) {
          // Minimum turn duration of 15s (Req 10)
          if (elapsed < 15000) {
            setTimeout(() => {
              const activeRoom = rooms[room.id];
              if (activeRoom && activeRoom.state === 'drawing') {
                endTurn(activeRoom, 'allGuessed');
              }
            }, 15000 - elapsed);
          } else {
            endTurn(room, 'allGuessed');
          }
        }
        return;
      }

      // Check close guess (§10.2) — Levenshtein distance ≤ 1
      if (levenshtein(normalized, target) <= 1) {
        socket.emit('CLOSE_GUESS', { text: "So close!" });
        // Still broadcast as regular chat but mask the word
        return;
      }
    }

    // Regular chat broadcast
    io.to(roomId).emit('CHAT_MESSAGE', {
      id: Date.now().toString() + Math.random(),
      sender: player.name,
      text,
      type: 'chat',
    });
  });

  // === DRAW EVENTS (§7.4 — drawer enforcement) ===
  socket.on('DRAW_STROKES_BATCH', ({ roomId, batch }: { roomId: string; batch: any }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Enforce: only drawer can draw during drawing state
    if (room.state === 'drawing' && room.currentDrawerId !== socket.id) {
      return; // silently drop (§15.9)
    }

    if (room.state === 'drawing') {
      room.strokeHistory.push(batch);
    }
    socket.to(roomId).emit('DRAW_STROKES_BATCH', batch);
  });

  // === CLEAR CANVAS ===
  socket.on('CLEAR_CANVAS', (roomId: string) => {
    const room = rooms[roomId];
    if (!room) return;

    // Only drawer can clear during drawing
    if (room.state === 'drawing' && room.currentDrawerId !== socket.id) return;

    room.strokeHistory = [];
    io.to(roomId).emit('CLEAR_CANVAS');
  });

  // === KICK PLAYER ===
  socket.on('KICK_PLAYER', (roomId: string, targetId: string) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.ownerId !== socket.id) return;
    kickPlayer(room, targetId);
  });

  // === VOTE KICK (public rooms) ===
  socket.on('VOTE_KICK', (roomId: string, targetId: string) => {
    const room = rooms[roomId];
    if (!room || room.type !== 'public') return;
    if (!room.players[socket.id] || !room.players[targetId]) return;

    if (!room.kickVotes[targetId]) {
      room.kickVotes[targetId] = { voters: [], lastFailedAt: 0 };
    }

    const voteData = room.kickVotes[targetId]!;
    // 60s cooldown Check
    if (Date.now() - voteData.lastFailedAt < 60000) {
      socket.emit('CHAT_MESSAGE', {
        id: Date.now().toString(), sender: 'System', type: 'system',
        text: `Cannot initiate kick vote for ${room.players[targetId]?.name || 'Unknown'} for another ${Math.ceil((60000 - (Date.now() - voteData.lastFailedAt)) / 1000)}s.`,
      });
      return;
    }

    if (!voteData.voters.includes(socket.id)) {
      voteData.voters.push(socket.id);
      
      const eligiblePlayers = Object.values(room.players).filter(p => p.isConnected).length;
      const threshold = Math.floor(eligiblePlayers / 2) + 1;

      io.to(roomId).emit('CHAT_MESSAGE', {
        id: Date.now().toString(), sender: 'System', type: 'system',
        text: `${room.players[socket.id]?.name} voted to kick ${room.players[targetId]?.name} (${voteData.voters.length}/${threshold}).`,
      });

      if (voteData.voters.length >= threshold) {
        // Kick executes
        kickPlayer(room, targetId);
        // Reset vote
        delete room.kickVotes[targetId];
      } else {
        // Log failure timestamp if not reaching threshold within a timeframe? 
        // For simplicity, failing to reach threshold right away doesn't trigger cooldown immediately.
        // We'll reset the vote and trigger cooldown if someone explicitly votes AGAINST, but there is no against vote right now.
        // The instructions say "The same target cannot be re-nominated for 60 seconds after a failed vote."
        // We will consider a vote "failed" if a kick command is sent but it was already rejected before, 
        // Or if the vote expires. Implementing simple active reset after 60s of first vote if not passed.
        if (voteData.voters.length === 1) {
          setTimeout(() => {
            const activeRoom = rooms[roomId];
            if (activeRoom && activeRoom.kickVotes[targetId]) {
              const activeVote = activeRoom.kickVotes[targetId]!;
              if (activeVote.voters.length < (Object.values(activeRoom.players).filter(p => p.isConnected).length / 2 + 1)) {
                 activeVote.lastFailedAt = Date.now();
                 activeVote.voters = [];
                 io.to(roomId).emit('CHAT_MESSAGE', {
                    id: Date.now().toString(), sender: 'System', type: 'system',
                    text: `Kick vote for ${activeRoom.players[targetId]?.name} expired.`,
                 });
              }
            }
          }, 60000);
        }
      }
    }
  });

  // === TRANSFER OWNER ===
  socket.on('TRANSFER_OWNER', (roomId: string, targetId: string) => {
    const room = rooms[roomId];
    if (!room || room.type !== 'private') return;
    if (room.ownerId !== socket.id) return;
    if (!room.players[targetId]) return;

    room.ownerId = targetId;
    io.to(roomId).emit('OWNER_TRANSFERRED', { newOwnerId: targetId, newOwnerName: room.players[targetId]?.name || 'Unknown' });
    broadcastRoomState(room);
  });

  // === PLAY AGAIN ===
  socket.on('PLAY_AGAIN', (roomId: string) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.ownerId !== socket.id && room.type === 'private') return;

    resetToLobby(room);
  });

  // === LEAVE ROOM (voluntary) ===
  socket.on('LEAVE_ROOM', (roomId: string) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;

    const playerName = player.name;
    socket.leave(roomId);

    // If drawer is leaving during drawing, end turn
    if (room.currentDrawerId === socket.id && (room.state === 'drawing' || room.state === 'choosingWord')) {
      if (room.state === 'choosingWord') {
        room.usedWords = room.usedWords.filter(w => !room.wordChoices.includes(w));
      }
      endTurn(room, 'drawerLeft');
    }

    delete room.players[socket.id];
    delete room.scores[socket.id];

    const remainingConnected = Object.values(room.players).filter(p => p.isConnected);

    // Destroy room if empty
    if (Object.keys(room.players).length === 0) {
      if (room.inviteCode) delete inviteCodes[room.inviteCode];
      clearRoomTimers(room);
      delete rooms[roomId];
      return;
    }

    // Transfer ownership if leaving player was owner
    if (room.ownerId === socket.id) {
      const nextHost = remainingConnected[0];
      if (nextHost) {
        room.ownerId = nextHost.id;
        io.to(roomId).emit('OWNER_TRANSFERRED', { newOwnerId: nextHost.id, newOwnerName: nextHost.name });
      }
    }

    // Cancel auto-start if not enough players
    if (room.startingSoonTimeout && remainingConnected.length < 2) {
      clearTimeout(room.startingSoonTimeout);
      room.startingSoonTimeout = null;
      room.startingSoonEndTime = null;
      io.to(roomId).emit('AUTO_START_CANCELLED');
    }

    // End game if < 2 during gameplay
    if (room.phase === 'in-game' && remainingConnected.length < 2) {
      endGame(room);
    }

    io.to(roomId).emit('PLAYER_LEFT', { userId: socket.id });
    io.to(roomId).emit('CHAT_MESSAGE', {
      id: Date.now().toString(),
      sender: 'System',
      text: `${playerName} left the room.`,
      type: 'system',
    });
    broadcastRoomState(room);
  });

  // === DISCONNECT HANDLING (§4.5) ===
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (!room) continue;

      const player = room.players[socket.id];
      if (!player) continue;

      console.log(`[DISCONNECT] ${socket.id} from room ${roomId}`);
      player.isConnected = false;

      broadcastRoomState(room);
      io.to(roomId).emit('PLAYER_DISCONNECTED', { userId: socket.id, gracePeriod: GRACE_PERIOD / 1000 });

      // Return unplayed word choices (req 9)
      if (room.state === 'choosingWord' && room.currentDrawerId === socket.id) {
        room.usedWords = room.usedWords.filter(w => !room.wordChoices.includes(w));
        // We will skip turn at grace period expiry, or we could skip immediately?
        // Instructions: "Then skip to the next drawer." doing it immediately.
        endTurn(room, 'drawerLeft');
      }

      // Req 12: Single-player private room immediate destruction
      if (room.type === 'private' && Object.values(room.players).filter(p => p.isConnected && p.id !== socket.id).length === 0) {
        if (room.inviteCode) delete inviteCodes[room.inviteCode];
        clearRoomTimers(room);
        delete rooms[roomId];
        return;
      }

      // Grace period
      room.gracePeriodTimeouts[socket.id] = setTimeout(() => {
        const activeRoom = rooms[roomId];
        if (!activeRoom) return;

        const disconnectedPlayer = activeRoom.players[socket.id];
        if (disconnectedPlayer && !disconnectedPlayer.isConnected) {
          console.log(`[GRACE_EXPIRED] ${socket.id} from room ${roomId}`);
          delete activeRoom.players[socket.id];
          delete activeRoom.scores[socket.id];

          const remainingConnected = Object.values(activeRoom.players).filter(p => p.isConnected);

          if (Object.keys(activeRoom.players).length === 0) {
            // Destroy room
            if (activeRoom.inviteCode) delete inviteCodes[activeRoom.inviteCode];
            clearRoomTimers(activeRoom);
            delete rooms[roomId];
            return;
          }

          // Transfer ownership
          if (activeRoom.ownerId === socket.id) {
            const nextHost = remainingConnected[0];
            if (nextHost) {
              activeRoom.ownerId = nextHost.id;
              io.to(roomId).emit('OWNER_TRANSFERRED', { newOwnerId: nextHost.id, newOwnerName: nextHost.name });
            }
          }

          // If was drawing, end turn
          if (activeRoom.currentDrawerId === socket.id && activeRoom.state === 'drawing') {
            endTurn(activeRoom, 'drawerLeft');
          }

          // Cancel starting if not enough players
          if (activeRoom.startingSoonTimeout && remainingConnected.length < 2) {
            clearTimeout(activeRoom.startingSoonTimeout);
            activeRoom.startingSoonTimeout = null;
            activeRoom.startingSoonEndTime = null;
          }

          // End game if < 2 players during gameplay
          if (activeRoom.phase === 'in-game' && remainingConnected.length < 2) {
            endGame(activeRoom);
          }

          io.to(roomId).emit('PLAYER_LEFT', { userId: socket.id });
          broadcastRoomState(activeRoom);
        }
      }, GRACE_PERIOD);


    }
  });
});

// ==========================================
// HTTP API
// ==========================================
app.get('/api/rooms/public', (req, res) => {
  const publicRooms = Object.values(rooms)
    .filter(r => r.type === 'public' && r.state === 'waiting')
    .map(r => ({
      roomId: r.id,
      playerCount: Object.keys(r.players).length,
      maxPlayers: r.settings.maxPlayers,
      state: r.state,
    }));
  res.json({ rooms: publicRooms });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
