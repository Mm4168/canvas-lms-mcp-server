import express from 'express';
import cors from 'cors';
import config from './index';
import logger from './utils/logger';
import MCPHandler from './mcpHandler';

const app = express();
const port = process.env.PORT || '8080';

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins in development, configure specific origins for production
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Last-Event-ID'],
  exposedHeaders: ['Content-Type'],
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Basic middleware
app.use(express.json());

// Health endpoint
app.get('/health', (_, res) => {
  res.status(200).send('OK');
});

// MCP SSE endpoint
const mcpHandler = new MCPHandler();

// Establish a Server-Sent Events stream
app.get('/mcp', (req, res) => {
  // Allow client to specify their own connection ID or generate one
  const connectionId = (req.query.id as string) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  mcpHandler.addConnection(connectionId, res);
});

// Receive messages
app.post('/mcp', express.text({ type: '*/*' }), async (req, res) => {
  const connectionId = req.query.id as string;
  if (!connectionId) {
    res.status(400).send('Missing id');
    return;
  }
  
  try {
    await mcpHandler.handleMessage(connectionId, req.body as string);
    res.sendStatus(200);
  } catch (error) {
    logger.error('Error handling MCP message:', error);
    res.sendStatus(500);
  }
});

// Start server
const server = app.listen(Number(port), '0.0.0.0', () => {
  logger.info(`Canvas-MCP server listening on 0.0.0.0:${port}`);
  logger.info(`Health check available at http://0.0.0.0:${port}/health`);
});

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
