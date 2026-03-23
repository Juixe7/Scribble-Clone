# SKRIBBL-CLONE: COMPLETE TECHNICAL & LOGICAL BLUEPRINT
### A Ground-Up Engineering Specification for an AI to Implement

---

## TABLE OF CONTENTS
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Data Models & Schemas](#2-data-models--schemas)
3. [Room System: Public & Private](#3-room-system-public--private)
4. [User Lifecycle & Session Management](#4-user-lifecycle--session-management)
5. [Concurrency & Locking Model](#5-concurrency--locking-model)
6. [Game State Machine](#6-game-state-machine)
7. [Round Resource Management](#7-round-resource-management)
8. [Word Selection System](#8-word-selection-system)
9. [Drawing Engine & Canvas Sync](#9-drawing-engine--canvas-sync)
10. [Guessing & Chat System](#10-guessing--chat-system)
11. [Scoring Engine](#11-scoring-engine)
12. [Spectator & Reconnection Logic](#12-spectator--reconnection-logic)
13. [Real-Time Communication Layer](#13-real-time-communication-layer)
14. [Kick, Ban & Moderation](#14-kick-ban--moderation)
15. [Edge Cases & Failure Handling](#15-edge-cases--failure-handling)
16. [API Endpoints Reference](#16-api-endpoints-reference)
17. [Socket Events Reference](#17-socket-events-reference)
18. [Complete Event Flow Walkthroughs](#18-complete-event-flow-walkthroughs)

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### Stack Choice
- **Backend**: Node.js + Express + Socket.IO (or Bun + Hono + ws)
- **State Store**: Redis (for room/session state, locks, pub-sub across horizontal scale)
- **Database**: PostgreSQL (persistent: user accounts, leaderboards, history)
- **Frontend**: React + HTML5 Canvas
- **Transport**: WebSocket (Socket.IO with fallback to long-polling)

### Deployment Units
```
[Client Browser]
      |
      | WSS / HTTPS
      ▼
[Load Balancer / Nginx]
      |
      |── [HTTP API Server]  →  [PostgreSQL]
      |
      └── [Socket.IO Server] →  [Redis Pub/Sub + Redis State]
                                      ↕
                              [Socket.IO Server 2] (horizontal scale)
```

### Horizontal Scaling Rule
- Every room's state lives in Redis, keyed by `room:{roomId}`.
- Every socket server subscribes to `room:{roomId}:events` Redis channel.
- Any server can handle any client — the room state is not on any one server's memory.
- Use `socket.io-redis` adapter to broadcast to all nodes.
- **IMPORTANT**: In-memory state is NEVER the source of truth. Redis is.

---

## 2. DATA MODELS & SCHEMAS

### 2.1 Room Object (Redis Hash: `room:{roomId}`)

```json
{
  "roomId": "abc123",
  "type": "public | private",
  "inviteCode": "XK9PLM",           // only for private rooms
  "ownerId": "user_001",            // socket id OR persistent user id
  "settings": {
    "maxPlayers": 8,                // 2–20
    "rounds": 3,                    // 1–10
    "drawTime": 80,                 // seconds per turn (10–180)
    "language": "en",
    "customWords": [],              // optional custom word list
    "customWordsOnly": false,       // if true, only use custom words
    "hintCount": 2,                 // how many letters to reveal as hints
    "wordChoiceCount": 3            // how many words drawer picks from
  },
  "state": "waiting | choosingWord | drawing | roundEnd | gameEnd",
  "phase": "lobby | in-game",
  "players": ["user_001", "user_002"],  // ordered list, index = turn order
  "currentDrawerIndex": 0,
  "currentRound": 1,
  "currentWord": "elephant",        // only stored server-side, never sent to guessers
  "wordChoices": ["cat","dog","elephant"],  // ephemeral, cleared after selection
  "roundStartTime": 1700000000000,  // Unix ms, for timer sync
  "drawTimeRemaining": 80,
  "hintRevealedAt": [20, 40],      // seconds elapsed when each hint fires
  "hintsRevealed": 0,
  "guessedPlayerIds": [],           // players who already guessed correctly this turn
  "scores": {
    "user_001": 0,
    "user_002": 0
  },
  "drawHistory": [],                // compressed canvas commands for latecomers
  "bannedUserIds": [],
  "createdAt": 1700000000000,
  "lastActivityAt": 1700000000000
}
```

### 2.2 Player Session Object (Redis Hash: `session:{socketId}`)

```json
{
  "socketId": "sock_abc",
  "userId": "user_001",             // persistent account id OR guest UUID
  "displayName": "Picasso",
  "avatarColor": "#FF5733",
  "roomId": "abc123",
  "role": "player | spectator",
  "isGuest": true,
  "connectedAt": 1700000000000,
  "lastSeenAt": 1700000000000,
  "reconnectToken": "tok_xyz"       // allows reconnect claim
}
```

### 2.3 Turn Lock Object (Redis Key: `lock:room:{roomId}:turn`)

```json
{
  "drawerId": "user_001",
  "lockedAt": 1700000000000,
  "expiresAt": 1700000080000,       // lockedAt + drawTime ms
  "lockId": "lk_unique_uuid"        // used for compare-and-swap release
}
```

### 2.4 Word Pool (PostgreSQL table: `words`)

```sql
CREATE TABLE words (
  id SERIAL PRIMARY KEY,
  word TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  difficulty VARCHAR(10) DEFAULT 'medium',  -- easy / medium / hard
  category VARCHAR(50),
  times_used INT DEFAULT 0,
  times_guessed INT DEFAULT 0
);
```

### 2.5 Persistent User (PostgreSQL table: `users`)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(32) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  avatar_url TEXT,
  total_score BIGINT DEFAULT 0,
  games_played INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. ROOM SYSTEM: PUBLIC & PRIVATE

### 3.1 Public Room Logic

**Creation:**
1. Client emits `createRoom` with no invite code.
2. Server generates a unique `roomId` (nanoid 8 chars, collision-checked against Redis).
3. Room is stored in Redis with `type: "public"`.
4. Room is added to the public room index: Redis Sorted Set `publicRooms` scored by player count (so matchmaking picks rooms with players first).
5. Creator's session is created and linked.

**Joining a Public Room (Matchmaking):**
1. Client emits `joinPublic`.
2. Server queries `publicRooms` sorted set for rooms in `waiting` state with `playerCount < maxPlayers`.
3. Pick the room with the HIGHEST player count (fill rooms before spreading).
4. If no such room exists → auto-create a new public room and join it.
5. Perform join sequence (see §3.3).

**Public Room Index Maintenance:**
- On every player join → `ZADD publicRooms {newCount} {roomId}`.
- On every player leave → update score or `ZREM` if empty.
- On game start → `ZREM publicRooms {roomId}` (no longer joinable mid-game, unless spectator is allowed).
- On game end → re-add if room still has players and is reset to lobby.

### 3.2 Private Room Logic

**Creation:**
1. Client emits `createRoom { type: "private", settings: {...} }`.
2. Server generates `roomId` + a human-readable 6-char alphanumeric `inviteCode` (collision-checked).
3. Room stored in Redis with `type: "private"`, `inviteCode` stored.
4. Room is NOT added to `publicRooms` index.
5. Creator receives `{ roomId, inviteCode }`.

**Joining via Invite Code:**
1. Client emits `joinPrivate { inviteCode: "XK9PLM" }`.
2. Server looks up Redis key `inviteCode:{XK9PLM}` → resolves to `roomId`.
3. If not found → emit error `INVALID_CODE`.
4. If found → perform standard join sequence.
5. Invite codes never expire as long as the room exists.

**Invite Code Index:**
- Redis Key: `inviteCode:{code}` → `roomId` (STRING).
- Set when room is created.
- Deleted when room is destroyed.

### 3.3 Standard Join Sequence (applies to both public and private)

```
Client → joinRoom
    ↓
1. Load room from Redis
    ↓
2. Gate checks (in order):
   a. Room exists?                     → NO: error ROOM_NOT_FOUND
   b. User is banned?                  → YES: error USER_BANNED
   c. Game in progress (phase=in-game)?
      - If spectators allowed          → join as spectator
      - If not                         → error GAME_IN_PROGRESS
   d. Room full (players >= maxPlayers)?→ join as spectator OR error ROOM_FULL
   e. User already in room?            → handle reconnect (see §12)
    ↓
3. ATOMIC player add (Redis MULTI/EXEC or Lua script):
   - RPUSH room:{roomId}:players {userId}
   - HSET room:{roomId} scores.{userId} 0
   - INCR room:{roomId}:playerCount
    ↓
4. Create session:{socketId} in Redis
    ↓
5. socket.join(roomId)  [Socket.IO room]
    ↓
6. Emit to NEW CLIENT: roomState (full snapshot)
    ↓
7. Broadcast to ROOM (excluding new client): playerJoined { player }
    ↓
8. Update publicRooms index score
```

### 3.4 Room Settings Change

- Only the room **owner** can change settings.
- Settings can only be changed while `phase === "lobby"`.
- On change: emit `settingsUpdated { settings }` to all players.
- If owner leaves, ownership transfers to the next player in the list (index 0 after removal).

### 3.5 Room Destruction

A room is destroyed when:
1. All players disconnect and Redis TTL expires.
2. Owner explicitly closes the room.
3. Inactivity timeout (30 minutes of no events).

On destroy:
- Delete `room:{roomId}` hash.
- Delete `inviteCode:{code}` key.
- Delete `lock:room:{roomId}:turn` key.
- Delete all ephemeral keys under `room:{roomId}:*`.
- Remove from `publicRooms` sorted set.

---

## 4. USER LIFECYCLE & SESSION MANAGEMENT

### 4.1 Guest Users

- On first connection, server assigns a `guestId` (UUID v4), stored in a short-lived Redis key.
- Client persists `guestId` in localStorage.
- On reconnect, client sends `guestId` in socket handshake auth.
- Guests can play without accounts but their scores are not persisted globally.

### 4.2 Authenticated Users

- JWT token in socket handshake `auth` header.
- Server verifies JWT → extracts `userId`.
- Session is created with `isGuest: false`.

### 4.3 Connection Handshake

```
Client connects via WebSocket
    ↓
socket.handshake.auth = {
  token: "jwt_or_null",
  guestId: "uuid_or_null",
  reconnectToken: "tok_or_null"
}
    ↓
Server middleware:
  1. If token valid → authenticate as user
  2. Else if reconnectToken valid → reconnect to existing session (see §12)
  3. Else if guestId valid → restore guest identity
  4. Else → create new guest session
    ↓
Session created in Redis with 24h TTL
    ↓
Client receives: { sessionId, reconnectToken, identity }
```

### 4.4 Player Count Tracking

- **Source of truth**: Redis key `room:{roomId}:playerCount` (integer).
- Maintained atomically via Lua scripts on every join/leave.
- Never derived by counting array length on the fly — always use the dedicated counter.
- Separately track `spectatorCount` in the same manner.

### 4.5 Disconnect Handling

```
socket.on('disconnect')
    ↓
1. Read session:{socketId} from Redis
2. Identify roomId from session
3. Mark player as "disconnected" (not removed immediately):
   - HSET room:{roomId} player:{userId}:status "disconnected"
   - Set expiry: Redis key expires:{roomId}:{userId} with TTL = 30s
4. Broadcast to room: playerDisconnected { userId, gracePeriod: 30 }
5. Start server-side countdown (via Redis keyspace notification or delayed job)
    ↓
If player reconnects within 30s → see §12 (Reconnection)
If 30s elapses without reconnect:
    ↓
6. ATOMIC removal (Lua script):
   - LREM room:{roomId}:players {userId}
   - HDEL room:{roomId} scores.{userId}
   - DECR room:{roomId}:playerCount
7. Broadcast: playerLeft { userId }
8. Trigger role-handoff checks:
   - Was this the drawer? → end turn early (see §7.5)
   - Was this the owner?  → transfer ownership (see §3.4)
   - Were they the last player? → destroy room
9. If game was running with <2 players remaining → end game
```

---

## 5. CONCURRENCY & LOCKING MODEL

This is the most critical section. Multiple socket events can arrive simultaneously. Without locks, race conditions will corrupt game state.

### 5.1 Turn Lock (Distributed Mutex)

**Purpose**: Only ONE drawer can be active at a time. No event (timer, guess, skip) should be able to start a new turn while another is being set up.

**Implementation using Redis SET NX (compare-and-swap):**

```lua
-- Acquire turn lock (Lua script for atomicity)
local lockKey = "lock:room:" .. roomId .. ":turn"
local existing = redis.call("GET", lockKey)
if existing then
  return {false, existing}  -- lock already held
end
local lockId = ARGV[1]  -- unique UUID passed by server
local expiry = ARGV[2]  -- drawTime in seconds
redis.call("SET", lockKey, lockId, "EX", expiry)
return {true, lockId}
```

**Lock Lifecycle:**
1. **Acquire**: When a turn starts (drawer selected, word chosen, drawing begins).
2. **Held by**: The current `lockId` stored in Redis.
3. **Release conditions** (all use compare-and-swap to ensure only the holder releases):
   - Timer expires (server-side TTL fires, or server timer calls release).
   - All non-drawer players guess correctly.
   - Drawer disconnects.
   - Owner skips the turn.
4. **Release script**:
```lua
local lockKey = "lock:room:" .. roomId .. ":turn"
local current = redis.call("GET", lockKey)
if current == ARGV[1] then  -- ARGV[1] = our lockId
  redis.call("DEL", lockKey)
  return true
end
return false  -- someone else holds or already expired
```

### 5.2 Room State Lock (Optimistic Concurrency)

For room-level state mutations (not just turn), use a version counter:

- `room:{roomId}:version` → integer, incremented on every state change.
- Before writing, read current version.
- Write with: `SET room:{roomId}:version {v+1} XX` (only set if exists).
- If another process incremented first → retry or discard (last-write wins is acceptable for non-critical fields like chat; NOT for score or turn state).

### 5.3 Player List Atomicity

Player join/leave operations MUST be atomic to prevent:
- Double-joining (two join events race, player added twice).
- Count desync (playerCount says 5 but list has 4).

```lua
-- Atomic join (Lua script)
local listKey = "room:" .. roomId .. ":players"
local countKey = "room:" .. roomId .. ":playerCount"
local userId = ARGV[1]
local maxPlayers = tonumber(ARGV[2])

local count = tonumber(redis.call("GET", countKey)) or 0
if count >= maxPlayers then
  return {false, "ROOM_FULL"}
end

-- Check not already in list
local list = redis.call("LRANGE", listKey, 0, -1)
for _, v in ipairs(list) do
  if v == userId then
    return {false, "ALREADY_IN_ROOM"}
  end
end

redis.call("RPUSH", listKey, userId)
redis.call("INCR", countKey)
return {true, redis.call("GET", countKey)}
```

### 5.4 Score Write Atomicity

Scores are written atomically via:
```
HINCRBY room:{roomId}:scores {userId} {points}
```
`HINCRBY` is atomic in Redis — no race condition possible.

### 5.5 Timer Synchronization

**Problem**: Network jitter means different clients see the timer at different values.

**Solution**:
- Server is the ONLY timer authority.
- Server stores `roundStartTime` (Unix ms) in Redis when the turn begins.
- Clients receive `roundStartTime` and compute remaining time as:  
  `remaining = drawTime - Math.floor((Date.now() - roundStartTime) / 1000)`
- Server fires timer events at specific elapsed marks (hint reveals, game end).
- Server uses `setInterval` to check elapsed time, but the source of truth for when the turn ends is `roundStartTime + drawTime * 1000`.
- On reconnect, client gets `roundStartTime` from room state and syncs immediately.

### 5.6 Concurrent Guess Handling

Multiple players can send a correct guess at nearly the same moment.

**Lock-free but ordered approach**:
1. When a guess arrives, server does:
```lua
-- Atomic: check if player already guessed, add if not
local key = "room:" .. roomId .. ":guessed"
local added = redis.call("SADD", key, userId)
-- SADD returns 1 if added (first time), 0 if already in set
return added
```
2. If `SADD` returns 0 → player already guessed → ignore.
3. If `SADD` returns 1 → first correct guess → award score based on elapsed time.
4. The order of correct guessers is preserved via a Redis List `room:{roomId}:guessOrder`.

---

## 6. GAME STATE MACHINE

The game must always be in exactly ONE of these states. Transitions are the only operations that change state.

```
           ┌─────────────────────────────────────────┐
           │                  LOBBY                  │
           │  (waiting for players, settings config) │
           └───────────────┬─────────────────────────┘
                           │ owner clicks Start (≥2 players)
                           ▼
           ┌─────────────────────────────────────────┐
           │             ROUND_SETUP                 │
           │  (select next drawer, assign word pool) │
           └───────────────┬─────────────────────────┘
                           │ immediately
                           ▼
           ┌─────────────────────────────────────────┐
           │           WORD_SELECTION                │
           │  (drawer gets 3 words, 15s to pick)    │
           └───────────────┬─────────────────────────┘
                           │ word chosen OR 15s timeout (auto-pick)
                           ▼
           ┌─────────────────────────────────────────┐
           │              DRAWING                    │
           │  (drawer draws, others guess, timer)   │
           └───┬───────────────────────────┬─────────┘
               │ all guessed               │ timer expires
               │ OR drawer disconnects     │ OR everyone left
               ▼                           ▼
           ┌─────────────────────────────────────────┐
           │             TURN_END                    │
           │  (reveal word, show scores, 5s pause)  │
           └───────────────┬─────────────────────────┘
                           │ more players to draw this round?
                    YES ───┘        NO ───────────────────┐
                    │                                     ▼
                    │                     ┌───────────────────────────┐
                    │                     │       ROUND_END           │
                    │                     │  (round summary, 5s pause)│
                    │                     └──────────────┬────────────┘
                    │                                    │ more rounds?
                    │                             YES ───┘   NO ───────┐
                    │                             │                    ▼
                    └─────────────────────────────┘         ┌──────────────────┐
                    (go to next ROUND_SETUP)                 │    GAME_END      │
                                                             │ (leaderboard,   │
                                                             │  play again?)   │
                                                             └────────┬─────────┘
                                                                      │
                                                             ┌────────▼─────────┐
                                                             │      LOBBY        │
                                                             │  (room reset)    │
                                                             └──────────────────┘
```

### State Transition Rules

| From State | Trigger | To State | Who Can Trigger |
|---|---|---|---|
| LOBBY | startGame | ROUND_SETUP | owner only |
| ROUND_SETUP | (auto) | WORD_SELECTION | server only |
| WORD_SELECTION | wordChosen | DRAWING | current drawer |
| WORD_SELECTION | 15s timeout | DRAWING | server (auto-picks) |
| DRAWING | allGuessed | TURN_END | server (auto) |
| DRAWING | timerExpired | TURN_END | server (auto) |
| DRAWING | drawerLeft | TURN_END | server (auto) |
| TURN_END | (5s elapsed) | ROUND_SETUP or ROUND_END | server (auto) |
| ROUND_END | (5s elapsed) | ROUND_SETUP or GAME_END | server (auto) |
| GAME_END | playAgain | LOBBY | owner |

**Rule**: Only the server executes state transitions. Clients request actions (startGame, chooseWord). Server validates and transitions.

---

## 7. ROUND RESOURCE MANAGEMENT

### 7.1 Drawer Turn Order

- Turn order follows the `players` array in Redis, using `currentDrawerIndex`.
- Index advances by 1 after each turn. Wraps only if needed (but since each player draws once per round, it doesn't wrap mid-round).
- Turn order is set at round start, not game start — so if someone joins mid-game, they may enter the turn order next round.

### 7.2 Per-Turn Resources (what gets created & locked per turn)

When `DRAWING` state begins:

| Resource | Redis Key | Locked To | Released When |
|---|---|---|---|
| Turn Lock | `lock:room:{roomId}:turn` | current lockId | Turn ends |
| Current Word | `room:{roomId}` HSET field | drawer only | Turn ends (then cleared) |
| Canvas State | `room:{roomId}:canvas` | drawer only (write) | Turn ends |
| Guessed Set | `room:{roomId}:guessed` | — | Cleared at turn start |
| Guess Order List | `room:{roomId}:guessOrder` | — | Cleared at turn start |
| Hint Reveal Schedule | internal server timer | — | Cleared at turn end |

### 7.3 Resources Locked Per Round

When `ROUND_SETUP` begins:

| Resource | Description |
|---|---|
| Word Pool for this round | Fetched fresh from DB, stored in `room:{roomId}:wordPool` |
| Turn Order Snapshot | `room:{roomId}:roundTurnOrder` (snapshot of player list at round start) |
| Round Score Delta | `room:{roomId}:roundScores` hash, zeroed at round start |

**Why snapshot the turn order?** Players may join/leave during a round. The turn order for a round is fixed at round start. New joiners draw starting next round.

### 7.4 Canvas State Locking (Write Lock)

Only the current drawer can emit draw events. Server enforces this:

```javascript
socket.on('drawEvent', (data) => {
  const session = await getSession(socket.id);
  const room = await getRoom(session.roomId);
  
  // Hard check: is this socket the current drawer?
  if (room.players[room.currentDrawerIndex] !== session.userId) {
    return; // silently drop — never trust the client
  }
  
  // Is game in DRAWING state?
  if (room.state !== 'drawing') {
    return; // silently drop
  }
  
  // Passed all checks → forward to room
  broadcastToRoom(session.roomId, 'drawEvent', data, socket.id);
  appendToCanvasHistory(session.roomId, data);
});
```

### 7.5 Early Turn End (Drawer Leaves)

```
drawer disconnects
    ↓
1. Server detects via socket.on('disconnect')
2. Check: is this player the current drawer AND state === 'drawing'?
    ↓
3. YES:
   a. Release turn lock (compare-and-swap with stored lockId)
   b. Reveal the word to all players
   c. Award 0 points to drawer (they didn't complete)
   d. Transition to TURN_END state
   e. Broadcast: turnEnd { word, reason: 'drawerLeft', scores }
   f. Schedule next turn setup after 5s pause
```

### 7.6 All Players Guessed → Early Turn End

```javascript
async function onCorrectGuess(roomId, userId) {
  const room = await getRoom(roomId);
  const totalGuessers = room.players.length - 1; // exclude drawer
  const guessedCount = await redis.scard(`room:${roomId}:guessed`);
  
  if (guessedCount >= totalGuessers) {
    // Everyone guessed → end turn early
    await endTurn(roomId, 'allGuessed');
  }
}
```

### 7.7 Turn End Cleanup

```
endTurn(roomId, reason)
    ↓
1. Cancel any pending timer jobs for this turn
2. Release turn lock
3. Clear canvas: DEL room:{roomId}:canvas
4. Read guessOrder → compute final scores
5. Award drawer bonus (if any guessers guessed correctly)
6. HINCRBY global scores for each player
7. DEL room:{roomId}:guessed
8. DEL room:{roomId}:guessOrder
9. HSET room state → 'turnEnd'
10. Broadcast: turnEnd { word, scores, guessOrder, reason }
11. Wait 5 seconds (server timer)
12. Proceed to next turn or round end
```

---

## 8. WORD SELECTION SYSTEM

### 8.1 Word Pool Generation (per round)

```
At ROUND_SETUP:
    ↓
1. Determine word sources:
   - If customWordsOnly=true AND customWords.length >= needed → use only custom
   - If customWords.length > 0 → blend: 50% custom, 50% DB words
   - Else → 100% DB words

2. Calculate needed: numPlayers * wordChoiceCount words
   (e.g., 5 players * 3 choices = 15 words minimum in pool)

3. Fetch from DB: SELECT * FROM words WHERE language=? ORDER BY RANDOM() LIMIT ?
   - Avoid recently used words: exclude words used in last N turns
   - Track in Redis Set: room:{roomId}:usedWords

4. Store pool in Redis List: room:{roomId}:wordPool
   RPUSH room:{roomId}:wordPool word1 word2 ... wordN

5. This pool persists through the entire round. Each drawer pops 3 words at their turn.
```

### 8.2 Word Assignment to Drawer

```
At WORD_SELECTION state for drawerX:
    ↓
1. ATOMIC pop 3 words from pool:
   -- Lua script
   local words = {}
   for i=1,3 do
     local w = redis.call("LPOP", "room:" .. roomId .. ":wordPool")
     if not w then break end
     table.insert(words, w)
   end
   return words

2. Store choices in room: HSET room:{roomId} wordChoices [w1,w2,w3]

3. Send ONLY to drawer socket: wordChoices { words: [w1,w2,w3], timeToChoose: 15 }

4. Send to non-drawers: wordSelecting { drawerName, timeToChoose: 15 }
   (they see a spinner / "Player X is choosing a word...")

5. Start 15-second server timer.
```

### 8.3 Auto-Pick on Timeout

```
If drawer does not emit chooseWord within 15 seconds:
    ↓
1. Server picks words[0] (first word in choices) automatically
2. Continue as if drawer chose it
3. Drawer gets a visual notification: "Word was auto-selected: [word]"
4. This counts as a normal turn (drawer can still draw, earn points)
```

### 8.4 Word Storage During Turn

```
After word is chosen:
    ↓
1. HSET room:{roomId} currentWord "elephant"
2. ADD to usedWords set: SADD room:{roomId}:usedWords "elephant"
3. CLEAR wordChoices: HSET room:{roomId} wordChoices null
4. The word is NEVER broadcast to clients directly.
5. Build hint template: "_________" (underscores, same length, preserve spaces)
   Store: room:{roomId}:hintTemplate = "_ _ _ _ _ _ _ _ _"
6. Broadcast to all players: drawingStarted {
     drawer: "Picasso",
     wordLength: 8,              // number of letters (NOT the word)
     wordHint: "_ _ _ _ _ _ _ _", // underscores
     drawTime: 80,
     roundStartTime: Date.now()
   }
```

### 8.5 Hint Reveal Mechanic

```
Hint schedule: reveal at [1/3 of time, 2/3 of time]
e.g., for 80s: reveal at 27s and 53s elapsed

Server timer fires at these marks:
    ↓
1. Pick a random UNREVEALED letter position (not a space)
2. Replace underscore in hintTemplate at that position with actual letter
3. Broadcast to GUESSERS only (NOT drawer — drawer already knows):
   hintRevealed { hint: "_ l _ _ _ _ _ _" }
4. Increment room.hintsRevealed counter
```

---

## 9. DRAWING ENGINE & CANVAS SYNC

### 9.1 Draw Event Types

Every draw action from the client must include a `type` field:

```typescript
type DrawEvent =
  | { type: 'stroke', points: [x,y][], color: string, size: number, tool: 'pen'|'eraser' }
  | { type: 'fill', x: number, y: number, color: string }
  | { type: 'clear' }
  | { type: 'undo' }
  | { type: 'shape', shape: 'rect'|'circle'|'line', x1:number, y1:number, x2:number, y2:number, color:string, size:number }
```

### 9.2 Canvas State Persistence (for Latecomers)

All draw events during a turn are appended to:
`RPUSH room:{roomId}:canvas {serialized_event_json}`

When a player joins mid-turn:
1. Server sends `canvasReplay { events: [...all events so far] }`.
2. Client replays them in order on a fresh canvas.
3. This ensures the latecomer sees the current drawing state.

**Optimization**: Compact the canvas history every 50 events by taking a PNG snapshot (server-side canvas via `canvas` npm package) and replacing the history with a single `snapshot` event. This limits replay payload size.

### 9.3 Throttling Draw Events

- Client should throttle `stroke` events to max 60/second (16ms interval).
- Server imposes a rate limit: max 100 draw events/second per socket.
- Excess events are dropped server-side.
- Server broadcasts draw events to room immediately (no batching) for low latency feel.

### 9.4 Canvas Bounds Validation

Server validates all draw events:
- `x`, `y` coordinates must be in [0, 1] range (normalized) → no absolute pixel values on the wire.
- `color` must be a valid hex color from the allowed palette.
- `size` must be in allowed range [1, 40].
- Invalid events are dropped silently.

### 9.5 Canvas Clear Authorization

Only the drawer can clear the canvas:
- Drawer emits `clearCanvas`.
- Server validates drawer identity (same as §7.4).
- Server appends `{ type: 'clear' }` to canvas history.
- Server broadcasts `clearCanvas` to all room clients.
- Canvas history is compacted (all prior events purged, just the clear event remains).

### 9.6 Undo

- Drawer emits `undo`.
- Server pops last event from canvas history (RPOP).
- Server broadcasts `undo` to all room clients.
- All clients replay canvas from scratch (or use a local undo stack).

---

## 10. GUESSING & CHAT SYSTEM

### 10.1 Message Types

```typescript
type ChatMessage =
  | { type: 'chat', text: string, userId: string, username: string }
  | { type: 'correctGuess', userId: string, username: string }  // no word revealed yet
  | { type: 'closeGuess', text: string }  // "You're close!"
  | { type: 'systemMessage', text: string }
  | { type: 'wordReveal', word: string }  // only on turn end
```

### 10.2 Guess Processing Flow

```
Player emits: guess { text: "elephant" }
    ↓
1. Sanitize input: trim, lowercase, strip special chars
2. Check state: is game in 'drawing' state? NO → treat as regular chat
3. Check: has this player already guessed correctly?
   SISMEMBER room:{roomId}:guessed {userId}
   YES → drop silently (don't show their chat to others either — no meta clues)
4. Check: is this player the drawer? YES → drop (drawer can't guess their own word)
5. Retrieve currentWord from Redis (server only)
6. Compare: normalize(guess) === normalize(currentWord)?
    ↓
  NO:
    a. Check Levenshtein distance: if distance <= 1 → "close guess"
       Emit to guesser ONLY: closeGuess { text: "You're close!" }
    b. Else: broadcast as regular chat to all who haven't guessed yet
       (Players who have guessed see a separate "already guessed" chat)
    ↓
  YES:
    a. SADD room:{roomId}:guessed {userId} → returns 1 (new) or 0 (dup)
    b. If dup (0) → already guessed, drop
    c. RPUSH room:{roomId}:guessOrder {userId}
    d. Record guess time: HSET room:{roomId}:guessTime {userId} {elapsed_ms}
    e. Compute score (see §11)
    f. HINCRBY room:{roomId}:roundScores {userId} {points}
    g. Broadcast to ALL: correctGuess { username, position: N } (word NOT revealed)
    h. Guesser socket joins "guessed" sub-room → can now see guessed-players chat
    i. Check if all guessed → endTurn if so (see §7.6)
```

### 10.3 Chat Separation Post-Guess

After guessing correctly, a player should be able to chat freely without spoiling the word for remaining guessers. This is handled by:

- Server maintains two logical "chat channels" per turn:
  1. `activeGuessers` channel (players who haven't guessed yet).
  2. `guessedPlayers` channel (players who already guessed).
- Messages from guessed players go only to other guessed players + drawer.
- This prevents spoiling via phrasing ("OMG that elephant is so hard to draw!").

### 10.4 Profanity & Word Filtering

- Maintain a server-side blocklist (Redis Set: `blocklist:{language}`).
- Before broadcasting any chat message: check against blocklist.
- If match: replace matching word with `***`.
- The word itself (currentWord) is also protected: if anyone types it in chat, mask it in the broadcast → replaces exact match with `[CENSORED]` in the broadcast, but still runs guess logic.

### 10.5 Chat Rate Limiting

- Max 5 chat messages per 3 seconds per user.
- Implemented via Redis: `INCR chat:ratelimit:{userId}` with 3s TTL.
- Excess messages dropped, client warned.

---

## 11. SCORING ENGINE

### 11.1 Guesser Score Formula

```
Base = 500
TimeBonus = Math.floor(500 * (timeRemaining / totalDrawTime))
PositionBonus = Math.floor(50 * (1 / guessPosition))  // guessPosition = 1 for first, 2 for second, etc.

GuesserScore = Base + TimeBonus + PositionBonus

Cap: max 1000 points per turn
```

### 11.2 Drawer Score Formula

```
DrawerScore is computed AFTER the turn ends based on how many guessed:

noGuessedRatio = correctGuessers / totalGuessers  // 0.0 to 1.0

DrawerScore = Math.floor(noGuessedRatio * 500)
// 0 if no one guessed, 500 if everyone guessed
// Bonus: +100 if ALL players guessed (perfect round)
if (correctGuessers === totalGuessers) DrawerScore += 100
```

### 11.3 Score Timing

- Guesser scores are computed and stored IMMEDIATELY when guess is confirmed (so position is accurate).
- Drawer score is computed ONLY at turn end.
- All score updates are applied to Redis atomically: `HINCRBY room:{roomId}:scores {userId} {delta}`.
- A score update event is broadcast to all clients on each correct guess: `scoreUpdate { userId, delta, total }`.

### 11.4 No-one-guessed Scenario

- If turn ends with 0 correct guesses:
  - Guesser scores: 0 delta.
  - Drawer score: 0 delta.
  - Word is revealed to all.
  - Special broadcast: `turnEnd { word, reason: 'timeOut', noOneGuessed: true }`.

### 11.5 Leaderboard State

- At turn end, broadcast full sorted scores: `leaderboard { scores: [{userId, name, score, delta}] }`.
- Sorted by score descending. Ties broken by name alphabetically.

---

## 12. SPECTATOR & RECONNECTION LOGIC

### 12.1 Spectator Mode

A user enters spectator mode when:
- Game is in progress AND `allowSpectators` is true (room setting).
- Room is full but spectators allowed.

Spectator rules:
- Receives: full room state, canvas events, chat, scoreboard, hints.
- Does NOT receive: currentWord (ever).
- Cannot: draw, guess, vote to kick.
- Can: send chat messages (labeled `[spectator]`).
- Does NOT affect: player count, turn order, scoring.
- Stored separately: `SADD room:{roomId}:spectators {userId}`.

### 12.2 Reconnection Flow

```
Player was connected, disconnected, tries to reconnect within grace period (30s):
    ↓
Client sends: reconnect { reconnectToken: "tok_xyz", roomId: "abc123" }
    ↓
1. Validate token: GET reconnect:{token} → expect { userId, roomId, socketId }
2. Check: is player still in room's player list? (grace period not expired?)
3. Check: new connection is from same IP? (optional security check)
    ↓
4. YES → Restore session:
   a. Create new session:{newSocketId} (reuse userId)
   b. Delete old session:{oldSocketId}
   c. DEL reconnect:{token} (one-time use)
   d. Update player status: HSET room:{roomId} player:{userId}:status "connected"
   e. socket.join(roomId)
   f. Cancel the 30s expiry timer for this player
   g. Emit to reconnecting client: reconnected { roomState: fullSnapshot }
      - fullSnapshot includes: current canvas events, scores, state, timer sync
   h. Broadcast to room: playerReconnected { userId }
    ↓
5. If reconnecting player WAS the drawer:
   - They are still the drawer, game continues
   - Send them the currentWord again (they lost it when socket dropped)
   - Send canvas history replay (the canvas state didn't reset during their absence)
```

### 12.3 Reconnect Token Lifecycle

- Generated at session creation.
- Stored: `SET reconnect:{token} {session_json} EX 60` (60s TTL, covers grace period + buffer).
- One-time use: deleted immediately on successful reconnect.
- New token issued after reconnect (for future disconnections).

---

## 13. REAL-TIME COMMUNICATION LAYER

### 13.1 Socket.IO Rooms

Every Socket.IO room corresponds directly to a game room:
- `socket.join(roomId)` on player join.
- `socket.leave(roomId)` on player leave.
- `io.to(roomId).emit(...)` for room broadcasts.
- `socket.emit(...)` for private messages (word choices, correct guess notifications, etc.).

### 13.2 Namespaces

Use a single namespace `/game`. No need for multiple namespaces unless adding other features (admin panel uses `/admin` namespace with auth middleware).

### 13.3 Event Emission Patterns

| Pattern | Code | Use Case |
|---|---|---|
| Broadcast to room (all including sender) | `io.to(roomId).emit(...)` | Canvas events, state changes |
| Broadcast to room (excluding sender) | `socket.to(roomId).emit(...)` | Echoing your own draw back |
| Private to one client | `socket.emit(...)` | Word choices, close-guess hint |
| Private to one client (by socketId) | `io.to(socketId).emit(...)` | From server-initiated events |

### 13.4 Message Size Limits

- Socket.IO max message size: 1MB (default). Keep well under this.
- Canvas replay on join: if > 100KB, send as paginated chunks: `canvasChunk { chunk: [...], index: 0, total: 3 }`.
- Chat messages: max 200 chars per message, enforced server-side.

### 13.5 Ping / Heartbeat

- Socket.IO handles this with its own ping/pong (default 25s interval, 20s timeout).
- Set: `pingInterval: 10000, pingTimeout: 5000` for faster disconnect detection in game context.
- On ping timeout → treat as disconnect (see §4.5).

### 13.6 Acknowledgements (ACKs)

For critical events, use Socket.IO acknowledgements to confirm delivery:

```javascript
// Client emits with ACK callback
socket.emit('chooseWord', { word: 'elephant' }, (ack) => {
  if (ack.error) console.error(ack.error);
  else console.log('Word chosen:', ack.word);
});

// Server
socket.on('chooseWord', async ({ word }, callback) => {
  const result = await processWordChoice(socket.id, word);
  callback(result); // { success: true, word } OR { error: 'INVALID_WORD' }
});
```

Use ACKs for: `chooseWord`, `startGame`, `kick`, `leaveRoom`. Not needed for draw events (fire-and-forget for performance).

---

## 14. KICK, BAN & MODERATION

### 14.1 Kick Vote System

Any player can initiate a kick vote:

```
Player A emits: initiateKick { targetUserId: "user_003" }
    ↓
1. Check: is A in the room? Is target in the room?
2. Check: is A trying to kick themselves? → reject
3. Check: is A trying to kick the owner? → reject (unless A IS owner; see §14.2)
4. Check: is a kick vote already in progress for this target? → reject
5. Create kick vote:
   Redis Hash: kickvote:{roomId}:{targetUserId}
   { initiatorId, votes: [userId_A], against: [], startedAt, TTL: 60s }
6. Broadcast: kickVoteStarted { target: { id, name }, initiator: { id, name }, expiresIn: 60 }
7. All players vote: voteKick { targetUserId, vote: true|false }
8. On each vote: add to votes or against list
9. Check threshold: votes.length > (players.length / 2)?
   YES → execute kick
   NO (against exceeds possible votes) → kick fails
10. On TTL expiry → kick fails
```

### 14.2 Owner Kick (Direct)

Room owner can directly kick any player without a vote:
```
Owner emits: kickPlayer { targetUserId }
    ↓
1. Validate owner identity.
2. Execute kick immediately.
```

### 14.3 Kick Execution

```
executeKick(roomId, targetUserId):
    ↓
1. Add to banned list: RPUSH room:{roomId}:banned {targetUserId}
   (ban is room-scoped, not global)
2. Remove from player list (atomic Lua script)
3. Find socket of banned user: lookup by userId → socketId
4. Emit to banned socket: kicked { reason: 'vote' | 'owner' }
5. socket.leave(roomId)
6. Disconnect socket (optional: socket.disconnect())
7. Broadcast to room: playerKicked { userId, username }
8. Trigger turn-end checks (was kicked player the drawer?)
```

### 14.4 Rejoin After Kick

- On any join attempt: check if userId is in `room:{roomId}:banned`.
- If yes → emit error `USER_BANNED`.
- Ban persists for the lifetime of the room.

---

## 15. EDGE CASES & FAILURE HANDLING

### 15.1 Only 1 Player Remains

```
At any point if playerCount drops to 1:
    ↓
- If game was in progress → pause game, broadcast: gamePaused { reason: 'notEnoughPlayers' }
- Set a resume timer: 60 seconds for another player to join
- If no one joins in 60s → destroy room
- If someone joins → resume game from current state
```

### 15.2 All Players Leave During Word Selection

```
drawer disconnects during WORD_SELECTION:
    ↓
- Skip to next player in turn order
- If no more players → see §15.1
```

### 15.3 Server Crash / Redis Persistence

- Redis should have AOF (append-only file) persistence enabled.
- On server restart, room state is recovered from Redis.
- Active socket connections are lost, but clients will attempt reconnect (Socket.IO auto-reconnect).
- On reconnect: grace period logic applies (§12.2).
- Turn timers must be reconstructed: `elapsed = Date.now() - roundStartTime`. Server re-creates the timer with the remaining time.

### 15.4 Duplicate Join Attempts

- Covered by Lua atomic join script (§5.3) — `ALREADY_IN_ROOM` error returned.
- Client ignores `ALREADY_IN_ROOM` silently (may happen on fast double-click).

### 15.5 Word Pool Exhaustion

- If word pool runs out mid-round (shouldn't happen if sized correctly, but defensive):
- Fetch more words from DB on-demand: `SELECT ... ORDER BY RANDOM() LIMIT 10`.
- If customWordsOnly and pool is empty → fall back to DB words for that turn, log a warning.

### 15.6 Timer Drift

- Server timer drift over long game durations (10+ rounds, slow players).
- Always recompute remaining time from `roundStartTime`, never from a decrementing counter.
- Heartbeat sync: every 10 seconds, broadcast `timerSync { roundStartTime, drawTime }` to all clients.

### 15.7 Stale Lock

- If server holding turn lock crashes mid-turn, the lock has a TTL (drawTime seconds).
- After TTL, lock automatically expires.
- Next server operation (triggered by reconnecting players or cleanup job) will detect no active turn and advance state.

### 15.8 Owner Leaves During Game

```
Owner leaves:
    ↓
1. Transfer ownership to players[0] (or next in list excluding disconnected)
2. Broadcast: ownerTransferred { newOwnerId, newOwnerName }
3. New owner gets owner-level controls (settings, kick, end game)
4. Game continues uninterrupted
```

### 15.9 Invalid Draw Events From Non-Drawer

- Server silently drops events where sender is not the current drawer.
- Never emit an error to the sender (don't teach clients about server-side validation responses).

### 15.10 Room Code Collision

- On room creation, generate code → check `EXISTS inviteCode:{code}` → if exists, regenerate.
- Max 10 retries; if all collide (shouldn't happen with 6-char alphanumeric = 36^6 = 2.1 billion combinations), use 8-char code.

---

## 16. API ENDPOINTS REFERENCE

All HTTP endpoints use `/api/v1/` prefix. WebSocket is separate.

### Auth
```
POST   /api/v1/auth/register     { username, email, password }
POST   /api/v1/auth/login        { email, password } → { token }
POST   /api/v1/auth/guest        {} → { guestId, token }
POST   /api/v1/auth/refresh      { refreshToken } → { token }
```

### Rooms (HTTP pre-flight)
```
POST   /api/v1/rooms             { type, settings } → { roomId, inviteCode? }
GET    /api/v1/rooms/:roomId     → { roomState (non-sensitive) }
GET    /api/v1/rooms/public      → { rooms: [{ roomId, playerCount, maxPlayers, state }] }
GET    /api/v1/rooms/code/:code  → { roomId } (resolve invite code)
DELETE /api/v1/rooms/:roomId     (owner only, auth required)
```

### Players
```
GET    /api/v1/users/:userId     → { profile, stats }
GET    /api/v1/leaderboard       → { topPlayers }
```

---

## 17. SOCKET EVENTS REFERENCE

### Client → Server (Emit)

| Event | Payload | Description |
|---|---|---|
| `createRoom` | `{ type, settings }` | Create a new room |
| `joinRoom` | `{ roomId?, inviteCode? }` | Join specific or public room |
| `leaveRoom` | `{}` | Leave current room |
| `startGame` | `{}` | Owner starts game |
| `chooseWord` | `{ word }` | Drawer picks a word |
| `drawEvent` | `{ type, ...params }` | Canvas draw action |
| `clearCanvas` | `{}` | Clear the canvas |
| `undo` | `{}` | Undo last stroke |
| `guess` | `{ text }` | Send a guess/chat |
| `voteKick` | `{ targetUserId, vote }` | Vote in kick poll |
| `initiateKick` | `{ targetUserId }` | Start kick vote |
| `kickPlayer` | `{ targetUserId }` | Owner direct kick |
| `updateSettings` | `{ settings }` | Owner updates settings |
| `reconnect` | `{ reconnectToken, roomId }` | Reconnect after drop |
| `spectate` | `{ roomId }` | Join as spectator |

### Server → Client (Emit)

| Event | Payload | Description |
|---|---|---|
| `roomState` | `{ full room snapshot }` | Sent on join/reconnect |
| `playerJoined` | `{ player }` | Someone new joined |
| `playerLeft` | `{ userId }` | Player left permanently |
| `playerDisconnected` | `{ userId, gracePeriod }` | Player dropped, waiting |
| `playerReconnected` | `{ userId }` | Player came back |
| `settingsUpdated` | `{ settings }` | Room settings changed |
| `gameStarted` | `{ players, rounds, firstDrawer }` | Game begins |
| `roundStarted` | `{ round, totalRounds }` | New round begins |
| `wordSelecting` | `{ drawerName, timeToChoose }` | Drawer picking word |
| `wordChoices` | `{ words, timeToChoose }` | **Drawer only** |
| `drawingStarted` | `{ drawer, wordLength, wordHint, drawTime, roundStartTime }` | Turn begins |
| `drawEvent` | `{ type, ...params }` | Canvas update |
| `canvasReplay` | `{ events: [] }` | Full canvas history |
| `clearCanvas` | `{}` | Canvas cleared |
| `undo` | `{}` | Undo last action |
| `guess` | `{ userId, username, text, type }` | Chat/guess message |
| `correctGuess` | `{ userId, username, position }` | Someone guessed right |
| `closeGuess` | `{}` | **Guesser only**: "You're close!" |
| `hintRevealed` | `{ hint }` | Letter hint revealed |
| `timerSync` | `{ roundStartTime, drawTime }` | Timer correction |
| `scoreUpdate` | `{ userId, delta, total }` | Score changed |
| `leaderboard` | `{ scores: [] }` | Full sorted scores |
| `turnEnd` | `{ word, reason, scores }` | Turn over |
| `roundEnd` | `{ round, scores }` | Round over |
| `gameEnd` | `{ winner, finalScores }` | Game over |
| `kickVoteStarted` | `{ target, initiator, expiresIn }` | Kick vote begun |
| `kickVoteUpdate` | `{ votes, against, total }` | Vote progress |
| `kicked` | `{ reason }` | **Kicked player only** |
| `playerKicked` | `{ userId, username }` | Someone was kicked |
| `ownerTransferred` | `{ newOwnerId, newOwnerName }` | New room owner |
| `error` | `{ code, message }` | Error response |
| `reconnected` | `{ roomState }` | Reconnect successful |

### Error Codes

| Code | Meaning |
|---|---|
| `ROOM_NOT_FOUND` | Room doesn't exist |
| `ROOM_FULL` | Max players reached |
| `GAME_IN_PROGRESS` | Can't join mid-game (no spectators) |
| `USER_BANNED` | Kicked from this room |
| `INVALID_CODE` | Invite code not found |
| `ALREADY_IN_ROOM` | Duplicate join attempt |
| `NOT_OWNER` | Non-owner tried owner action |
| `NOT_DRAWER` | Non-drawer tried drawer action |
| `INVALID_STATE` | Action invalid in current state |
| `INVALID_WORD` | Chosen word not in offered choices |
| `RATE_LIMITED` | Too many messages |

---

## 18. COMPLETE EVENT FLOW WALKTHROUGHS

### 18.1 Full Game: Happy Path (3 Players, 2 Rounds)

```
SETUP:
  Alice creates private room, gets inviteCode "XK9PLM"
  Bob joins via inviteCode
  Carol joins via inviteCode
  Alice (owner) clicks Start

SEQUENCE:
  Alice → startGame
  Server validates: ≥2 players, state=lobby ✓
  Server transitions: LOBBY → ROUND_SETUP (Round 1)
  Server fetches word pool (9 words: 3 players × 3 choices)
  Server determines turn order: [Alice, Bob, Carol]
  Server broadcasts: roundStarted { round: 1, totalRounds: 2 }

  --- Turn 1: Alice draws ---
  Server sets currentDrawerIndex = 0 (Alice)
  Server pops 3 words from pool → [cat, dog, house]
  Server stores wordChoices, transitions → WORD_SELECTION
  Server → Alice: wordChoices { words: ['cat','dog','house'], timeToChoose: 15 }
  Server → Bob, Carol: wordSelecting { drawerName: 'Alice', timeToChoose: 15 }
  Alice → Server: chooseWord { word: 'dog' }
  Server validates: 'dog' is in wordChoices ✓
  Server stores currentWord = 'dog'
  Server acquires turn lock (lockId: "lk_001", TTL: 80s)
  Server → ALL: drawingStarted { drawer: 'Alice', wordLength: 3, wordHint: '_ _ _', drawTime: 80, roundStartTime: T }
  Server transitions → DRAWING

  [Alice draws, Bob and Carol chat/guess]

  Bob → Server: guess { text: "cat" }
  Server: wrong → LREM distance check → far → broadcast as chat to active guessers

  [40s elapsed]
  Server fires hint: reveal one letter → '_ o _'
  Server → Bob, Carol: hintRevealed { hint: '_ o _' }

  Bob → Server: guess { text: "dog" }
  Server: CORRECT! SADD guessed → returns 1
  Server records: guessTime[Bob] = 40000ms
  Server RPUSH guessOrder: [Bob]
  Bob score = 500 + floor(500 * (40/80)) + floor(50 * 1) = 500 + 250 + 50 = 800
  Server HINCRBY scores Bob 800
  Server → ALL: correctGuess { username: 'Bob', position: 1 }
  Server → ALL: scoreUpdate { userId: Bob, delta: 800, total: 800 }
  Bob socket joins "guessed" group

  Carol → Server: guess { text: "dog" }
  Server: CORRECT! SADD guessed → returns 1
  Server records: guessTime[Carol] = 45000ms
  Carol score = 500 + floor(500 * (35/80)) + floor(50 * 0.5) = 500 + 218 + 25 = 743
  Server → ALL: correctGuess { username: 'Carol', position: 2 }

  All non-drawers guessed! (Bob + Carol = 2 = players - 1)
  Server calls endTurn(roomId, 'allGuessed')
  Drawer (Alice) score = floor((2/2) * 500) + 100 = 600
  Server → ALL: turnEnd { word: 'dog', reason: 'allGuessed', scores: { Alice: 600, Bob: 800, Carol: 743 } }
  Server → ALL: leaderboard { scores: [Bob:800, Carol:743, Alice:600] }
  Server releases turn lock
  Server clears canvas, guessed set, guessOrder, hint schedule
  Wait 5 seconds...

  --- Turn 2: Bob draws (similar flow) ---
  --- Turn 3: Carol draws (similar flow) ---

  End of Round 1 → ROUND_END
  Server → ALL: roundEnd { round: 1, scores: {...} }
  Wait 5 seconds...

  --- Round 2 begins → same flow ---

  After Carol's turn in Round 2:
  Server transitions → GAME_END
  Server → ALL: gameEnd { winner: { userId, name, score }, finalScores: [...] }
  Scores persisted to PostgreSQL for authenticated users
  Server resets room to LOBBY
  Alice (owner) can click "Play Again" → game restarts
```

### 18.2 Reconnection Mid-Draw

```
Alice is drawing (Turn 1)
Alice's connection drops (t=30s)
    ↓
Server detects disconnect
Server marks Alice: status = 'disconnected'
Server sets expiry: expires:roomId:Alice TTL=30s
Server → Bob, Carol: playerDisconnected { userId: Alice, gracePeriod: 30 }
Game continues (Bob and Carol can still see canvas, but no new drawing)

At t=15s (within grace): Alice reconnects
Client sends: reconnect { reconnectToken: 'tok_xyz', roomId: 'abc123' }
Server validates token ✓
Server: cancel expiry timer for Alice
Server: restore session, socket.join(roomId)
Server → Alice: reconnected {
  roomState: { state: 'drawing', drawer: Alice, ... },
  currentWord: 'dog',  // sent because Alice is the drawer
  canvasReplay: [...all draw events so far]
}
Server → Bob, Carol: playerReconnected { userId: Alice }
Alice sees the canvas she was drawing, continues drawing
```

---

## APPENDIX: KEY INVARIANTS TO ALWAYS MAINTAIN

These are the non-negotiable rules that, if broken, cause bugs:

1. **The server is the sole timer authority.** Never trust client-reported time.
2. **Current word NEVER leaves the server** except to the drawer after they choose it.
3. **All state mutations go through Redis Lua scripts** for atomicity.
4. **Turn lock must be acquired BEFORE broadcasting drawingStarted** and released BEFORE broadcasting turnEnd.
5. **playerCount in Redis must always equal LLEN of players list.** Maintain via Lua scripts.
6. **Scores are only written via HINCRBY** (atomic). Never read-modify-write pattern.
7. **Canvas history accumulates per-turn.** It is fully cleared at turn end. NEVER carry canvas across turns.
8. **Word choices are single-use.** Once popped from wordPool, they cannot be given to another drawer.
9. **Kick bans are room-scoped and permanent** for the room's lifetime.
10. **State transitions only happen server-side.** Clients request, server decides.
11. **A player in the `guessed` set can never have their guess processed again** (SADD idempotency).
12. **New players entering mid-round join the NEXT round's turn order,** not the current one.
13. **Spectators are completely excluded from all game logic:** no word visibility, no scoring, no turn order.
14. **On any join/leave with <2 players remaining**, the game pauses rather than crashes.
15. **Every server-side timer is anchored to an absolute start timestamp**, not a decrementing counter.
```
