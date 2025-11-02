# Redis Data Structures for Tank Royale

## 1. Leaderboards (Sorted Sets)

### Global Leaderboard by Wins
```
Key: leaderboard:wins
Type: Sorted Set (ZADD, ZREVRANGE)
Score: total_wins
Member: user_id

Commands:
- ZADD leaderboard:wins <wins> <user_id>
- ZREVRANGE leaderboard:wins 0 99 WITHSCORES  # Top 100
- ZREVRANK leaderboard:wins <user_id>  # Get user's rank
- ZSCORE leaderboard:wins <user_id>  # Get user's wins
```

### Global Leaderboard by MMR
```
Key: leaderboard:mmr
Type: Sorted Set
Score: mmr
Member: user_id

Commands:
- ZADD leaderboard:mmr <mmr> <user_id>
- ZREVRANGE leaderboard:mmr 0 99 WITHSCORES
- ZREVRANK leaderboard:mmr <user_id>
```

## 2. Active Lobbies

### Lobby List
```
Key: lobbies:active
Type: Set
Member: lobby_id

Commands:
- SADD lobbies:active <lobby_id>
- SREM lobbies:active <lobby_id>
- SMEMBERS lobbies:active
- SCARD lobbies:active  # Count
```

### Individual Lobby State
```
Key: lobby:<lobby_id>
Type: Hash
Fields:
  - status: "waiting" | "starting" | "playing" | "ending"
  - player_count: 16
  - created_at: timestamp
  - started_at: timestamp
  - player_ids: JSON array of player IDs

Commands:
- HSET lobby:<lobby_id> status "playing"
- HGET lobby:<lobby_id> player_count
- HGETALL lobby:<lobby_id>
- DEL lobby:<lobby_id>  # When game ends
```

## 3. Matchmaking Queue

### Queue by MMR Range
```
Key: queue:mmr:<mmr_range>
Type: List (FIFO)
Member: JSON {user_id, username, mmr, joined_at}

Example keys:
- queue:mmr:800-1000
- queue:mmr:1000-1200
- queue:mmr:1200-1400

Commands:
- LPUSH queue:mmr:1000-1200 '{"user_id":"...","mmr":1050}'
- RPOP queue:mmr:1000-1200  # Get next player
- LLEN queue:mmr:1000-1200  # Count waiting
- LRANGE queue:mmr:1000-1200 0 15  # Get 16 players
```

### Player in Queue (for quick lookup)
```
Key: player:queue:<user_id>
Type: String
Value: queue_key (e.g., "queue:mmr:1000-1200")
TTL: 60 seconds (auto-expire if no match found)

Commands:
- SET player:queue:<user_id> "queue:mmr:1000-1200" EX 60
- GET player:queue:<user_id>
- DEL player:queue:<user_id>  # When matched
```

## 4. Session Tokens (JWT)

### Active Sessions
```
Key: session:<user_id>
Type: String
Value: JWT token
TTL: 7 days

Commands:
- SET session:<user_id> <jwt_token> EX 604800
- GET session:<user_id>
- DEL session:<user_id>  # Logout
```

### Blacklisted Tokens (for logout)
```
Key: blacklist:token:<token_hash>
Type: String
Value: "1"
TTL: Same as token expiry

Commands:
- SET blacklist:token:<hash> "1" EX <ttl>
- EXISTS blacklist:token:<hash>
```

## 5. Player Online Status

### Online Players
```
Key: players:online
Type: Sorted Set
Score: last_seen_timestamp
Member: user_id

Commands:
- ZADD players:online <timestamp> <user_id>
- ZREMRANGEBYSCORE players:online 0 <5_minutes_ago>  # Remove inactive
- ZCARD players:online  # Count online
```

## 6. Rate Limiting

### Per-User Rate Limit
```
Key: ratelimit:<user_id>:<endpoint>
Type: String (counter)
Value: request_count
TTL: 60 seconds (sliding window)

Commands:
- INCR ratelimit:<user_id>:shoot
- EXPIRE ratelimit:<user_id>:shoot 60
- GET ratelimit:<user_id>:shoot
```

## 7. Cached User Data

### User Profile Cache
```
Key: user:cache:<user_id>
Type: Hash
Fields: username, mmr, total_wins, total_kills
TTL: 5 minutes

Commands:
- HMSET user:cache:<user_id> username "Player1" mmr 1050
- HGETALL user:cache:<user_id>
- EXPIRE user:cache:<user_id> 300
```

## 8. Match Results Cache

### Recent Matches
```
Key: matches:recent
Type: List (capped at 100)
Member: JSON {match_id, timestamp, winner, player_count}

Commands:
- LPUSH matches:recent '{"match_id":"...","winner":"..."}'
- LTRIM matches:recent 0 99  # Keep only 100
- LRANGE matches:recent 0 19  # Get 20 recent
```

## 9. Server Statistics

### Live Metrics
```
Key: metrics:server
Type: Hash
Fields:
  - active_lobbies: 10
  - total_players: 160
  - matches_today: 523
  - avg_latency: 45

Commands:
- HINCRBY metrics:server active_lobbies 1
- HSET metrics:server avg_latency 45
- HGETALL metrics:server
```

## Usage Notes:

1. **Leaderboards**: Update after each match, query frequently
2. **Lobbies**: Create on match start, delete on match end
3. **Queue**: Push when player queues, pop when creating lobby
4. **Sessions**: Set on login, check on each request
5. **Cache**: Set with TTL, invalidate on DB write

## Performance Tips:

- Use Redis Cluster for horizontal scaling
- Use Redis Sentinel for high availability
- Set appropriate TTLs to prevent memory bloat
- Use pipelining for bulk operations
- Monitor memory usage with INFO command
