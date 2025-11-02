# Repository Pattern Implementation

## Overview
Implemented the repository pattern to encapsulate all database interactions, improving code readability, maintainability, and testability.

## Structure

```
server/src/repositories/
├── index.ts                    # Barrel export
├── UserRepository.ts           # User data access
├── MatchRepository.ts          # Match data access
└── LeaderboardRepository.ts    # Leaderboard queries
```

## Repositories

### UserRepository
Handles all user-related database operations:
- `findById(userId)` - Get user by ID
- `findByUsername(username)` - Get user by username
- `findByEmail(email)` - Get user by email
- `findByUsernameOrEmail(usernameOrEmail)` - Get user by either
- `usernameExists(username)` - Check if username taken
- `emailExists(email)` - Check if email taken
- `usernameOrEmailExists(username, email)` - Check both
- `create(params)` - Create new user
- `updateLastLogin(userId)` - Update last login timestamp
- `getStats(userId)` - Get user stats with calculated win rate and KDR
- `search(query, limit)` - Search users by username pattern

### MatchRepository
Handles all match-related database operations:
- `create(params)` - Create new match
- `findById(matchId)` - Get match by ID
- `endMatch(matchId)` - End match and calculate duration
- `getUserMatchHistory(userId, limit, offset)` - Get user's match history
- `insertResult(result)` - Insert match result for a player
- `getMatchResults(matchId)` - Get all results for a match

### LeaderboardRepository
Handles all leaderboard queries:
- `getTopByWins(limit, offset)` - Top players by wins
- `getTopByMMR(limit, offset)` - Top players by MMR
- `getPlayerMMRRank(userId)` - Get player's MMR rank
- `getPlayerWinsRank(userId)` - Get player's wins rank
- `getPlayerRanks(userId)` - Get both ranks (parallel execution)

## Benefits

1. **Readability**: Route handlers are now focused on business logic, not SQL
2. **Maintainability**: Database queries are centralized and reusable
3. **Testability**: Easy to mock repositories for unit testing
4. **Type Safety**: TypeScript interfaces for all data models
5. **DRY**: No duplicate queries across routes
6. **Consistency**: Standardized field naming (camelCase in code, snake_case in DB)

## Example Before/After

### Before
```typescript
const result = await query(
  `SELECT user_id, username, email, mmr FROM users WHERE user_id = $1`,
  [userId]
);
const user = result.rows[0];
```

### After
```typescript
const user = await userRepository.findById(userId);
```

## Usage

Import repositories in routes:
```typescript
import { userRepository, matchRepository, leaderboardRepository } from '../repositories';
```

All repositories are singleton instances exported from the barrel file.
