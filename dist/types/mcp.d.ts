export interface MCPMessage {
    jsonrpc: '2.0';
    id?: string | number;
    method?: string;
    params?: Record<string, any>;
    result?: any;
    error?: MCPError;
}
export interface MCPError {
    code: number;
    message: string;
    data?: any;
}
export interface MCPRequest extends MCPMessage {
    method: string;
    params?: Record<string, any>;
}
export interface MCPResponse extends MCPMessage {
    id: string | number;
    result?: any;
    error?: MCPError;
}
export interface MCPNotification extends MCPMessage {
    method: string;
    params?: Record<string, any>;
}
export interface MCPServerInfo {
    name: string;
    version: string;
    protocolVersion: string;
    capabilities: MCPServerCapabilities;
}
export interface MCPServerCapabilities {
    tools?: MCPToolsCapability;
    resources?: MCPResourcesCapability;
    prompts?: MCPPromptsCapability;
    logging?: MCPLoggingCapability;
}
export interface MCPToolsCapability {
    listChanged?: boolean;
}
export interface MCPResourcesCapability {
    subscribe?: boolean;
    listChanged?: boolean;
}
export interface MCPPromptsCapability {
    listChanged?: boolean;
}
export interface MCPLoggingCapability {
}
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: MCPToolInputSchema;
}
export interface MCPToolInputSchema {
    type: 'object';
    properties: Record<string, MCPSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
}
export interface MCPSchemaProperty {
    type: string;
    description?: string;
    enum?: any[];
    items?: MCPSchemaProperty;
    properties?: Record<string, MCPSchemaProperty>;
    required?: string[];
    default?: any;
    examples?: any[];
}
export interface MCPToolCall {
    name: string;
    arguments: Record<string, any>;
}
export interface MCPToolResult {
    content: MCPContent[];
    isError?: boolean;
}
export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}
export interface MCPResourceContents {
    uri: string;
    mimeType?: string;
    content: MCPContent[];
}
export interface MCPPrompt {
    name: string;
    description?: string;
    arguments?: MCPPromptArgument[];
}
export interface MCPPromptArgument {
    name: string;
    description?: string;
    required?: boolean;
}
export interface MCPPromptMessage {
    role: 'user' | 'assistant' | 'system';
    content: MCPContent[];
}
export type MCPContent = MCPTextContent | MCPImageContent | MCPResourceContent;
export interface MCPTextContent {
    type: 'text';
    text: string;
}
export interface MCPImageContent {
    type: 'image';
    data: string;
    mimeType: string;
}
export interface MCPResourceContent {
    type: 'resource';
    resource: {
        uri: string;
        text?: string;
        blob?: string;
    };
}
export interface MCPClientInfo {
    name: string;
    version: string;
}
export interface MCPInitializeParams {
    protocolVersion: string;
    capabilities: MCPClientCapabilities;
    clientInfo: MCPClientInfo;
}
export interface MCPClientCapabilities {
    roots?: MCPRootsCapability;
    sampling?: MCPSamplingCapability;
}
export interface MCPRootsCapability {
    listChanged?: boolean;
}
export interface MCPSamplingCapability {
}
export interface MCPInitializeResult {
    protocolVersion: string;
    capabilities: MCPServerCapabilities;
    serverInfo: MCPServerInfo;
}
export declare enum MCPMethod {
    INITIALIZE = "initialize",
    INITIALIZED = "initialized",
    PING = "ping",
    TOOLS_LIST = "tools/list",
    TOOLS_CALL = "tools/call",
    RESOURCES_LIST = "resources/list",
    RESOURCES_READ = "resources/read",
    RESOURCES_SUBSCRIBE = "resources/subscribe",
    RESOURCES_UNSUBSCRIBE = "resources/unsubscribe",
    PROMPTS_LIST = "prompts/list",
    PROMPTS_GET = "prompts/get",
    LOGGING_SET_LEVEL = "logging/setLevel",
    NOTIFICATIONS_CANCELLED = "notifications/cancelled",
    NOTIFICATIONS_PROGRESS = "notifications/progress",
    NOTIFICATIONS_MESSAGE = "notifications/message",
    NOTIFICATIONS_RESOURCES_LIST_CHANGED = "notifications/resources/list_changed",
    NOTIFICATIONS_RESOURCES_UPDATED = "notifications/resources/updated",
    NOTIFICATIONS_TOOLS_LIST_CHANGED = "notifications/tools/list_changed",
    NOTIFICATIONS_PROMPTS_LIST_CHANGED = "notifications/prompts/list_changed"
}
export declare enum MCPErrorCode {
    PARSE_ERROR = -32700,
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,
    INVALID_TOOL = -32000,
    INVALID_RESOURCE = -32001,
    INVALID_PROMPT = -32002,
    RESOURCE_NOT_FOUND = -32003,
    TOOL_EXECUTION_ERROR = -32004,
    AUTHENTICATION_ERROR = -32005,
    AUTHORIZATION_ERROR = -32006,
    RATE_LIMITED = -32007,
    TIMEOUT = -32008
}
export interface SSEConnection {
    id: string;
    response: any;
    clientInfo?: MCPClientInfo;
    capabilities?: MCPClientCapabilities;
    authenticated: boolean;
    lastActivity: Date;
}
export interface SSEMessage {
    id?: string;
    event?: string;
    data: string;
    retry?: number;
}
//# sourceMappingURL=mcp.d.ts.map