# Tank Royale 2 - API Testing Guide

## 🔐 Authentication Endpoints

Base URL: `http://localhost:3000`

---

### 1. Register a New User

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "player1",
  "email": "player1@example.com",
  "password": "Password123"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "player1",
    "email": "player1@example.com",
    "mmr": 1000,
    "createdAt": "2025-11-02T20:00:00.000Z"
  }
}
```

**curl command:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@example.com",
    "password": "Password123"
  }'
```

---

### 2. Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "usernameOrEmail": "player1",
  "password": "Password123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "player1",
    "email": "player1@example.com",
    "mmr": 1000,
    "totalWins": 0,
    "totalLosses": 0
  }
}
```

**curl command:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "player1",
    "password": "Password123"
  }'
```

---

### 3. Get Current User Profile (Protected)

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "player1",
  "email": "player1@example.com",
  "stats": {
    "mmr": 1000,
    "totalWins": 0,
    "totalLosses": 0,
    "totalKills": 0,
    "totalDeaths": 0,
    "winRate": "0.00"
  },
  "createdAt": "2025-11-02T20:00:00.000Z",
  "lastLogin": "2025-11-02T20:30:00.000Z"
}
```

**curl command:**
```bash
# Replace <TOKEN> with the token from login/register
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

---

### 4. Test Protected Route

**Endpoint:** `GET /api/protected`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "This is a protected route",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "player1"
}
```

---

## 🧪 Testing in VS Code with REST Client Extension

Install the "REST Client" extension, then create a file `test.http`:

```http
### Register User
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "username": "testplayer",
  "email": "test@example.com",
  "password": "TestPass123"
}

### Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "usernameOrEmail": "testplayer",
  "password": "TestPass123"
}

### Get Profile (replace TOKEN)
GET http://localhost:3000/api/auth/me
Authorization: Bearer YOUR_TOKEN_HERE

### Test Protected Route
GET http://localhost:3000/api/protected
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## ❌ Error Responses

### 400 Bad Request - Validation Errors
```json
{
  "error": "Invalid username. Must be 3-50 alphanumeric characters or underscores"
}
```

### 401 Unauthorized - Invalid Token
```json
{
  "error": "Invalid or expired token"
}
```

### 409 Conflict - User Already Exists
```json
{
  "error": "Username or email already exists"
}
```

---

## 🔒 Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

## 👤 Username Requirements

- 3-50 characters
- Alphanumeric and underscores only
- Case insensitive

## 📧 Email Requirements

- Valid email format
- Must be unique

---

## 🎯 Next Steps

After authentication works:
1. ✅ User registration
2. ✅ User login
3. ✅ JWT authentication
4. 🔄 User profile endpoints
5. 🔄 Match history
6. 🔄 Leaderboards
7. 🔄 Matchmaking queue

Try registering a user now! 🚀
