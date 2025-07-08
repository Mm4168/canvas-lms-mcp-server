import { EventEmitter } from 'events';
import { SSEConnection } from './types/mcp';
export declare class MCPHandler extends EventEmitter {
    private connections;
    private toolRegistry;
    private heartbeatInterval;
    constructor();
    private startHeartbeat;
    private cleanupStaleConnections;
    private sendHeartbeat;
    addConnection(connectionId: string, response: any): void;
    removeConnection(connectionId: string): void;
    private sendMessage;
    private sendResponse;
    private sendError;
    handleMessage(connectionId: string, messageData: string): Promise<void>;
    private isValidMCPMessage;
    private handleRequest;
    private handleInitialize;
    private handleInitialized;
    private handlePing;
    private handleToolsList;
    private handleToolsCall;
    private handleResourcesList;
    private handleResourcesRead;
    private handlePromptsList;
    private handlePromptsGet;
    getConnectionCount(): number;
    getConnections(): SSEConnection[];
    shutdown(): void;
}
export default MCPHandler;
//# sourceMappingURL=mcpHandler.d.ts.map