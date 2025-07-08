"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasAPIClient = void 0;
const axios_1 = __importDefault(require("axios"));
const index_1 = __importDefault(require("./config/index"));
const logger_1 = __importDefault(require("./utils/logger"));
class CanvasAPIClient {
    constructor(accessToken, baseUrl) {
        this.accessToken = accessToken;
        this.baseUrl = baseUrl || index_1.default.canvas.baseUrl;
        this.client = axios_1.default.create({
            baseURL: `${this.baseUrl}/api/${index_1.default.canvas.apiVersion}`,
            timeout: index_1.default.canvas.timeout,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': `${index_1.default.mcp.serverName}/${index_1.default.mcp.serverVersion}`,
            },
        });
        this.setupInterceptors();
    }
    setupInterceptors() {
        this.client.interceptors.request.use((config) => {
            logger_1.default.debug(`Canvas API Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            logger_1.default.error('Canvas API Request Error:', error);
            return Promise.reject(error);
        });
        this.client.interceptors.response.use((response) => {
            logger_1.default.debug(`Canvas API Response: ${response.status} ${response.config.url}`);
            return response;
        }, async (error) => {
            const originalRequest = error.config;
            if (error.response?.status === 401 && !originalRequest._retry) {
                logger_1.default.warn('Canvas API 401 Unauthorized - Token may be expired');
                originalRequest._retry = true;
            }
            if (error.response?.status === 429) {
                logger_1.default.warn('Canvas API Rate Limited - Implementing backoff');
                const retryAfter = error.response.headers['retry-after'] || index_1.default.canvas.retryDelay / 1000;
                await this.delay(retryAfter * 1000);
                return this.client.request(originalRequest);
            }
            logger_1.default.error('Canvas API Response Error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url,
                data: error.response?.data,
            });
            return Promise.reject(this.transformError(error));
        });
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    transformError(error) {
        if (error.response?.data) {
            return error.response.data;
        }
        return {
            message: error.message || 'Unknown Canvas API error',
            error_code: error.code || 'UNKNOWN_ERROR',
        };
    }
    parsePaginationLinks(linkHeader) {
        if (!linkHeader)
            return undefined;
        const links = {};
        const linkRegex = /<([^>]+)>;\s*rel="([^"]+)"/g;
        let match;
        while ((match = linkRegex.exec(linkHeader)) !== null) {
            const [, url, rel] = match;
            if (url && rel) {
                links[rel] = url;
            }
        }
        return Object.keys(links).length > 0 ? links : undefined;
    }
    async makeRequest(method, endpoint, data, params) {
        try {
            const config = {
                method,
                url: endpoint,
                params,
            };
            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                config.data = data;
            }
            const response = await this.client.request(config);
            return {
                data: response.data,
                status: response.status,
                headers: response.headers,
                links: this.parsePaginationLinks(response.headers.link) || undefined,
            };
        }
        catch (error) {
            logger_1.default.error(`Canvas API ${method} ${endpoint} failed:`, error);
            throw error;
        }
    }
    async getCurrentUser() {
        return this.makeRequest('GET', '/users/self');
    }
    async getUser(userId) {
        return this.makeRequest('GET', `/users/${userId}`);
    }
    async getUserCourses(userId = 0, params) {
        const endpoint = userId === 0 ? '/courses' : `/users/${userId}/courses`;
        return this.makeRequest('GET', endpoint, undefined, params);
    }
    async getCourse(courseId, include) {
        const params = include ? { include } : undefined;
        return this.makeRequest('GET', `/courses/${courseId}`, undefined, params);
    }
    async getCourses(params) {
        return this.makeRequest('GET', '/courses', undefined, params);
    }
    async createCourse(accountId, courseData) {
        return this.makeRequest('POST', `/accounts/${accountId}/courses`, {
            course: courseData,
        });
    }
    async updateCourse(courseId, courseData) {
        return this.makeRequest('PUT', `/courses/${courseId}`, {
            course: courseData,
        });
    }
    async getAssignments(courseId, params) {
        return this.makeRequest('GET', `/courses/${courseId}/assignments`, undefined, params);
    }
    async getAssignment(courseId, assignmentId, include) {
        const params = include ? { include } : undefined;
        return this.makeRequest('GET', `/courses/${courseId}/assignments/${assignmentId}`, undefined, params);
    }
    async createAssignment(courseId, assignmentData) {
        return this.makeRequest('POST', `/courses/${courseId}/assignments`, {
            assignment: assignmentData,
        });
    }
    async updateAssignment(courseId, assignmentId, assignmentData) {
        return this.makeRequest('PUT', `/courses/${courseId}/assignments/${assignmentId}`, {
            assignment: assignmentData,
        });
    }
    async deleteAssignment(courseId, assignmentId) {
        return this.makeRequest('DELETE', `/courses/${courseId}/assignments/${assignmentId}`);
    }
    async getSubmissions(courseId, assignmentId, params) {
        return this.makeRequest('GET', `/courses/${courseId}/assignments/${assignmentId}/submissions`, undefined, params);
    }
    async getSubmission(courseId, assignmentId, userId, include) {
        const params = include ? { include } : undefined;
        return this.makeRequest('GET', `/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`, undefined, params);
    }
    async gradeSubmission(courseId, assignmentId, userId, gradeData) {
        return this.makeRequest('PUT', `/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`, {
            submission: gradeData,
        });
    }
    async getEnrollments(courseId, params) {
        return this.makeRequest('GET', `/courses/${courseId}/enrollments`, undefined, params);
    }
    async enrollUser(courseId, enrollmentData) {
        return this.makeRequest('POST', `/courses/${courseId}/enrollments`, {
            enrollment: enrollmentData,
        });
    }
    async updateEnrollment(courseId, enrollmentId, enrollmentData) {
        return this.makeRequest('PUT', `/courses/${courseId}/enrollments/${enrollmentId}`, {
            enrollment: enrollmentData,
        });
    }
    async deleteEnrollment(courseId, enrollmentId, task = 'conclude') {
        return this.makeRequest('DELETE', `/courses/${courseId}/enrollments/${enrollmentId}`, undefined, { task });
    }
    async getFiles(courseId, params) {
        return this.makeRequest('GET', `/courses/${courseId}/files`, undefined, params);
    }
    async getFile(fileId, include) {
        const params = include ? { include } : undefined;
        return this.makeRequest('GET', `/files/${fileId}`, undefined, params);
    }
    async validateToken() {
        try {
            await this.getCurrentUser();
            return true;
        }
        catch (error) {
            logger_1.default.error('Token validation failed:', error);
            return false;
        }
    }
    async getTokenInfo() {
        try {
            const response = await this.getCurrentUser();
            return {
                token: this.accessToken,
                userId: response.data.id,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get token info:', error);
            return null;
        }
    }
}
exports.CanvasAPIClient = CanvasAPIClient;
exports.default = CanvasAPIClient;
//# sourceMappingURL=canvasClient.js.map