import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initPostgres, closePostgres } from './db/postgres';
import { initRedis, closeRedis } from './db/redis';
import authRoutes from './routes/auth';
import { authenticate } from './middleware/auth';

// Load environment variables
dotenv.config({ path: '../.env.local' });

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log response when finished
  const originalSend = res.send.bind(res);
  res.send = function(this: any, data: any) {
    const duration = Date.now() - start;
    const status = res.statusCode >= 500 ? '✗' : res.statusCode >= 400 ? '⚠' : '✓';
    console.log(`[${status}] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    return originalSend(data);
  };
  
  next();
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', async (req, res) => {
  const postgresHealth = await import('./db/postgres').then(m => m.healthCheck());
  const redisHealth = await import('./db/redis').then(m => m.healthCheck());
  
  const status = postgresHealth && redisHealth ? 'healthy' : 'unhealthy';
  const statusCode = status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      postgres: postgresHealth ? 'up' : 'down',
      redis: redisHealth ? 'up' : 'down',
    },
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Tank Royale 2 API',
    version: '1.0.0',
    status: 'running',
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Protected route example
app.get('/api/protected', authenticate, (req, res) => {
  res.json({
    message: 'This is a protected route',
    userId: (req as any).userId,
    username: (req as any).username,
  });
});

// Start server
async function startServer() {
  try {
    // Initialize databases
    console.log('🚀 Starting Tank Royale 2 API Server...');
    
    await initPostgres();
    await initRedis();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📡 SIGTERM signal received. Closing server...');
  await closePostgres();
  await closeRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📡 SIGINT signal received. Closing server...');
  await closePostgres();
  await closeRedis();
  process.exit(0);
});

// Start the server
startServer();
