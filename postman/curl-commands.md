# Tank Royale 2 - cURL Commands

## Base URL
```bash
BASE_URL="http://localhost:3000"
```

---

## 1. Health Check

```bash
curl -X GET $BASE_URL/health
```

---

## 2. Register User

```bash
curl -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@example.com",
    "password": "Password123"
  }'
```

**Save the token from response:**
```bash
TOKEN="paste_token_here"
```

---

## 3. Login

```bash
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "player1",
    "password": "Password123"
  }'
```

---

## 4. Get Current User Profile (Protected)

```bash
curl -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Test Protected Route

```bash
curl -X GET $BASE_URL/api/protected \
  -H "Authorization: Bearer $TOKEN"
```

---

## Full Test Flow (Copy & Paste)

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== 1. Health Check ==="
curl -s $BASE_URL/health | jq
echo -e "\n"

echo "=== 2. Register User ==="
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testplayer",
    "email": "test@example.com",
    "password": "Password123"
  }')

echo $REGISTER_RESPONSE | jq
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"
echo -e "\n"

echo "=== 3. Get User Profile ==="
curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
echo -e "\n"

echo "=== 4. Test Protected Route ==="
curl -s -X GET $BASE_URL/api/protected \
  -H "Authorization: Bearer $TOKEN" | jq
echo -e "\n"

echo "=== 5. Login (existing user) ==="
curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "testplayer",
    "password": "Password123"
  }' | jq
```

Save as `test-api.sh`, make executable with `chmod +x test-api.sh`, then run `./test-api.sh`

---

## Test Different Scenarios

### Invalid Password (too short)
```bash
curl -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player2",
    "email": "player2@example.com",
    "password": "short"
  }'
```

### Invalid Username (special characters)
```bash
curl -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player-with-dash",
    "email": "player3@example.com",
    "password": "Password123"
  }'
```

### Duplicate Username
```bash
curl -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "different@example.com",
    "password": "Password123"
  }'
```

### Wrong Password (login)
```bash
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "player1",
    "password": "WrongPassword"
  }'
```

### No Token (protected route)
```bash
curl -X GET $BASE_URL/api/auth/me
```

### Invalid Token
```bash
curl -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer invalid_token_here"
```
