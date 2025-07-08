"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    server: {
        port: parseInt(process.env.PORT || '3000', 10),
        host: process.env.HOST || '0.0.0.0',
        nodeEnv: process.env.NODE_ENV || 'development',
        trustProxy: process.env.TRUST_PROXY === 'true',
    },
    canvas: {
        baseUrl: process.env.CANVAS_BASE_URL || 'https://canvas.instructure.com',
        apiVersion: process.env.CANVAS_API_VERSION || 'v1',
        timeout: parseInt(process.env.CANVAS_TIMEOUT || '30000', 10),
        retryAttempts: parseInt(process.env.CANVAS_RETRY_ATTEMPTS || '3', 10),
        retryDelay: parseInt(process.env.CANVAS_RETRY_DELAY || '1000', 10),
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'canvas-mcp:',
        ttl: {
            default: parseInt(process.env.REDIS_TTL_DEFAULT || '3600', 10),
            user: parseInt(process.env.REDIS_TTL_USER || '1800', 10),
            course: parseInt(process.env.REDIS_TTL_COURSE || '7200', 10),
            assignment: parseInt(process.env.REDIS_TTL_ASSIGNMENT || '3600', 10),
        },
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
        enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
        enableFile: process.env.LOG_ENABLE_FILE === 'true',
        filename: process.env.LOG_FILENAME,
    },
    cors: {
        origin: process.env.CORS_ORIGIN === '*' ? true :
            process.env.CORS_ORIGIN?.split(',') || true,
        credentials: process.env.CORS_CREDENTIALS === 'true',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'Cache-Control',
            'Last-Event-ID',
        ],
    },
    mcp: {
        serverName: process.env.MCP_SERVER_NAME || 'Canvas LMS MCP Server',
        serverVersion: process.env.MCP_SERVER_VERSION || '1.0.0',
        protocolVersion: process.env.MCP_PROTOCOL_VERSION || '2025-06-18',
        maxConnections: parseInt(process.env.MCP_MAX_CONNECTIONS || '100', 10),
        connectionTimeout: parseInt(process.env.MCP_CONNECTION_TIMEOUT || '300000', 10),
        heartbeatInterval: parseInt(process.env.MCP_HEARTBEAT_INTERVAL || '30000', 10),
    },
    security: {
        helmetEnabled: process.env.HELMET_ENABLED !== 'false',
        contentSecurityPolicy: process.env.CSP_ENABLED !== 'false',
        hsts: process.env.HSTS_ENABLED !== 'false',
        noSniff: process.env.NO_SNIFF_ENABLED !== 'false',
        xssFilter: process.env.XSS_FILTER_ENABLED !== 'false',
        referrerPolicy: process.env.REFERRER_POLICY || 'same-origin',
    },
    health: {
        checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
        timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
    },
};
function validateConfig() {
    const requiredEnvVars = [
        'JWT_SECRET',
    ];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    if (config.server.port < 1 || config.server.port > 65535) {
        throw new Error('PORT must be between 1 and 65535');
    }
    if (config.auth.bcryptRounds < 4 || config.auth.bcryptRounds > 31) {
        throw new Error('BCRYPT_ROUNDS must be between 4 and 31');
    }
    if (!config.canvas.baseUrl.startsWith('http')) {
        throw new Error('CANVAS_BASE_URL must be a valid HTTP/HTTPS URL');
    }
}
if (process.env.NODE_ENV !== 'test') {
    validateConfig();
}
exports.default = config;
//# sourceMappingURL=index.js.map