# Match Lifecycle & Matchmaking Implementation

## Overview
This document describes the match lifecycle and matchmaking systems that complete the Tank Royale 2 migration from Node.js to Go.

## Match Lifecycle (`internal/game/match/`)

### Match Structure
- **Match ID**: UUID for each match
- **Players**: Map of UserID -> MatchPlayer with connection tracking
- **Game State**: Integrated with GameLoop for 30 TPS simulation
- **Phase Management**: Waiting → Playing → Ending → Finished
- **Database**: PostgreSQL connection for results persistence

### Match Phases
1. **Waiting**: Lobby state, accepting players
2. **Playing**: Active gameplay with running game loop
3. **Ending**: Match concluded, showing results (5 second delay)
4. **Finished**: Results persisted, cleanup complete

### Match Flow
1. **Creation**: `NewMatch()` initializes match with database connection
2. **Player Addition**: `AddPlayer()` validates and adds players (8-16 range)
3. **Map Generation**: Procedural map with obstacles and crates
4. **Player Spawning**: Circular spawn pattern around map center
5. **Game Loop Start**: 30 TPS tick system begins
6. **Monitoring**: Background goroutine checks win conditions every second
7. **Match End**: Triggered by last player standing or 15-minute timeout
8. **Results Persistence**: Save to `matches` and `match_results` tables
9. **Cleanup**: 10-second delay before memory cleanup

### Database Persistence
**Matches Table**:
- `match_id` (UUID)
- `map_name` ("procedural")
- `player_count` (8-16)
- `start_time`, `end_time`, `duration` (seconds)

**Match Results Table**:
- `match_id`, `user_id`
- `placement` (1-16 ranking)
- `kills`, `damage_dealt`, `survival_time`
- `mmr_change` (calculated based on placement)

### MMR Calculation
- **1st place**: +25 + (player_count - 2) [more players = more MMR]
- **Top 25%**: +15
- **Top 50%**: +5
- **Bottom 50%**: -10
- **Floor**: MMR cannot go below 0

### Stats Updates
After each match, updates user stats:
- `total_wins` / `total_losses` (placement-based)
- `total_kills` (from match results)
- `total_deaths` (1 if died, 0 if won)
- `mmr` (by MMR change)

## Matchmaking System (`internal/game/matchmaking/`)

### Architecture
- **Redis Queue**: Sorted set with MMR as score for range queries
- **Processing**: Background goroutine every 2 seconds
- **Active Matches**: In-memory map with automatic cleanup
- **Match Creation**: 8-16 players with similar MMR

### Queue Management
**Join Queue**:
```json
{
  "userId": "uuid",
  "username": "player1",
  "mmr": 1000,
  "joinedAt": "2024-01-15T10:30:00Z"
}
```
- Stored in Redis sorted set: `matchmaking:queue`
- Score = user's MMR (enables range queries)
- 5-minute timeout expiration

**Leave Queue**:
- Scans queue for user's entry
- Removes from sorted set
- Called on explicit leave or disconnect

### Matchmaking Algorithm
1. **Queue Retrieval**: Get all entries sorted by MMR (Redis sorted set)
2. **Group Finding**: Iterate through players as "anchor"
3. **MMR Range Calculation**: Based on wait time
   - Initial: ±100 MMR
   - Expansion: +50 MMR per 10 seconds
   - Maximum: ±500 MMR
4. **Group Assembly**: Find 8-16 players within MMR range of anchor
5. **Match Creation**: First valid group creates a match
6. **Queue Cleanup**: Remove matched players

### MMR Matching Formula
```
mmrRange = InitialMMRRange + (waitTime/10s * MMRRangeExpansion)
mmrRange = min(mmrRange, MaxMMRRange)

InitialMMRRange = 100
MMRRangeExpansion = 50
MaxMMRRange = 500
```

**Examples**:
- 0 seconds wait: ±100 MMR
- 20 seconds wait: ±200 MMR
- 60 seconds wait: ±400 MMR  
- 90+ seconds wait: ±500 MMR (max)

### Match Creation Flow
1. **Match Initialization**: Create Match with UUID and DB connection
2. **Player Addition**: Add all matched players to Match
3. **Match Start**: Generate map, spawn players, start game loop
4. **Store Reference**: Add to active matches map
5. **Cleanup Goroutine**: Monitor match until finished, then remove from memory

### API Routes
All routes require authentication middleware.

**POST `/api/matchmaking/join`**
- Adds authenticated user to queue
- Returns: `{"message": "Joined matchmaking queue", "status": "searching"}`
- Error: 500 if database or Redis fails

**POST `/api/matchmaking/leave`**
- Removes authenticated user from queue
- Returns: `{"message": "Left matchmaking queue"}`
- Error: 500 if Redis operation fails

**GET `/api/matchmaking/status`**
- Returns queue and match statistics
- Response: `{"queueSize": 12, "activeMatches": 3}`
- Public endpoint for monitoring

### Service Lifecycle
**Start**:
- Initializes background processing goroutine
- Polls queue every 2 seconds
- Attempts match creation on each tick

**Stop**:
- Cancels context to stop processing
- Waits for goroutine cleanup (WaitGroup)
- Called on API server shutdown

### Integration with API Server
```go
// Initialize matchmaking
matchmakingService := matchmaking.NewMatchmakingService(pgDB, redisDB)
matchmakingService.Start()
defer matchmakingService.Stop()

// Register routes
matchmaking.RegisterRoutes(r, matchmakingService)
```

## Game Constants
All defined in `internal/game/constants.go`:
- `MinPlayers = 8`: Minimum players to start match
- `MaxPlayers = 16`: Maximum players per match
- `MapWidth = 4000`: Map dimensions
- `MapHeight = 4000`
- `ObstacleDensity = 0.35`: Map generation parameter

## Dependencies
- **PostgreSQL**: Match and result persistence
- **Redis**: Matchmaking queue and session management
- **Game Engine**: 30 TPS game loop integration
- **Map Generator**: Procedural map with connectivity validation
- **Combat System**: Projectile and collision detection
- **Safe Zone**: Shrinking play area mechanics

## Error Handling
- Database errors: Logged but don't crash match
- Player disconnects: Marked in MatchPlayer, removed from game loop
- Match timeout: 15-minute limit enforced
- Queue timeout: 5-minute Redis expiration
- Match cleanup: Automatic after 10-second finished delay

## Metrics & Monitoring
- Match creation count
- Active match count
- Queue size tracking
- Match duration statistics
- Player participation rates
- MMR distribution changes

## Future Enhancements
1. **Ranked/Casual Modes**: Separate queues with different MMR rules
2. **Party System**: Pre-made groups joining together
3. **Map Selection**: Vote or rotation system
4. **Reconnection**: Allow players to rejoin disconnected matches
5. **Spectator Mode**: Watch ongoing matches
6. **Replay System**: Save and replay match telemetry
7. **Cassandra Integration**: Log detailed game events for analytics

## Testing
**Manual Testing**:
```bash
# Join queue (requires auth token)
curl -X POST http://localhost:8080/api/matchmaking/join \
  -H "Authorization: Bearer <token>"

# Check status
curl http://localhost:8080/api/matchmaking/status

# Leave queue
curl -X POST http://localhost:8080/api/matchmaking/leave \
  -H "Authorization: Bearer <token>"
```

**Load Testing**:
- Create 16+ test users with varying MMR
- Join queue simultaneously
- Verify match creation
- Check database for persisted results

## Migration Complete
With match lifecycle and matchmaking implemented, the Node.js server is fully replaced:
- ✅ Authentication (JWT + bcrypt)
- ✅ REST API (user management, stats)
- ✅ WebSocket infrastructure (connection management)
- ✅ Game logic (entities, combat, physics)
- ✅ Match lifecycle (phases, spawning, persistence)
- ✅ Matchmaking (queue, MMR matching, match creation)

The `/server/` directory (Node.js/TypeScript) can now be removed.
