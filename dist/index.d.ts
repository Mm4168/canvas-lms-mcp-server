export interface AppConfig {
    server: {
        port: number;
        host: string;
        nodeEnv: string;
        trustProxy: boolean;
    };
    canvas: {
        baseUrl: string;
        apiVersion: string;
        timeout: number;
        retryAttempts: number;
        retryDelay: number;
    };
    auth: {
        jwtSecret: string;
        jwtExpiresIn: string;
        bcryptRounds: number;
    };
    redis: {
        url: string;
        password: string | undefined;
        db: number;
        keyPrefix: string;
        ttl: {
            default: number;
            user: number;
            course: number;
            assignment: number;
        };
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        skipSuccessfulRequests: boolean;
        skipFailedRequests: boolean;
    };
    logging: {
        level: string;
        format: string;
        enableConsole: boolean;
        enableFile: boolean;
        filename: string | undefined;
    };
    cors: {
        origin: string | string[] | boolean;
        credentials: boolean;
        methods: string[];
        allowedHeaders: string[];
    };
    mcp: {
        serverName: string;
        serverVersion: string;
        protocolVersion: string;
        maxConnections: number;
        connectionTimeout: number;
        heartbeatInterval: number;
    };
    security: {
        helmetEnabled: boolean;
        contentSecurityPolicy: boolean;
        hsts: boolean;
        noSniff: boolean;
        xssFilter: boolean;
        referrerPolicy: string;
    };
    health: {
        checkInterval: number;
        timeout: number;
    };
}
declare const config: AppConfig;
export default config;
//# sourceMappingURL=index.d.ts.map