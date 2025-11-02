import { Request, Response, NextFunction } from 'express';
import { register, collectDefaultMetrics, Histogram, Counter, Gauge } from 'prom-client';

// Collect default metrics (CPU, memory, etc.) every 10 seconds
collectDefaultMetrics({ prefix: 'tank_royale_' });

// HTTP request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'tank_royale_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// HTTP request counter
export const httpRequestCounter = new Counter({
  name: 'tank_royale_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Active connections gauge
export const activeConnections = new Gauge({
  name: 'tank_royale_active_connections',
  help: 'Number of active connections',
  labelNames: ['type'], // 'http' or 'websocket'
});

// WebSocket connections
export const websocketConnections = new Gauge({
  name: 'tank_royale_websocket_connections',
  help: 'Number of active WebSocket connections',
});

// Matchmaking queue size
export const matchmakingQueueSize = new Gauge({
  name: 'tank_royale_matchmaking_queue_size',
  help: 'Number of players in matchmaking queue',
});

// Active matches
export const activeMatches = new Gauge({
  name: 'tank_royale_active_matches',
  help: 'Number of currently active matches',
});

// Match creation counter
export const matchesCreated = new Counter({
  name: 'tank_royale_matches_created_total',
  help: 'Total number of matches created',
});

// Authentication attempts
export const authAttempts = new Counter({
  name: 'tank_royale_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result'], // 'success' or 'failure'
});

/**
 * Middleware to collect HTTP request metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Normalize route to avoid high cardinality
  const route = req.route?.path || req.path || 'unknown';
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();
    
    httpRequestDuration
      .labels(req.method, route, statusCode)
      .observe(duration);
    
    httpRequestCounter
      .labels(req.method, route, statusCode)
      .inc();
  });
  
  next();
};

/**
 * Metrics endpoint handler
 */
export const metricsHandler = async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

// Export the registry for custom metrics
export { register };
