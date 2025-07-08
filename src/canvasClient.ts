import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import config from './config';
import logger from './logger';
import {
  CanvasAPIResponse,
  CanvasCourse,
  CanvasUser,
  CanvasAssignment,
  CanvasSubmission,
  CanvasFile,
  CanvasEnrollment,
  CanvasPaginationLinks
} from './canvas';

export class CanvasAPIClient {
  private client: AxiosInstance;
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken: string, baseUrl?: string) {
    this.accessToken = accessToken;
    this.baseUrl = baseUrl || config.canvas.baseUrl;
    
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/${config.canvas.apiVersion}`,
      timeout: config.canvas.timeout,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': `${config.mcp.serverName}/${config.mcp.serverVersion}`,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Canvas API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Canvas API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Canvas API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          logger.warn('Canvas API 401 Unauthorized - Token may be expired');
          originalRequest._retry = true;
          // Could implement token refresh logic here if using OAuth2
        }

        if (error.response?.status === 429) {
          logger.warn('Canvas API Rate Limited - Implementing backoff');
          const retryAfter = error.response.headers['retry-after'] || config.canvas.retryDelay / 1000;
          await this.delay(retryAfter * 1000);
          return this.client.request(originalRequest);
        }

        logger.error('Canvas API Response Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          data: error.response?.data,
        });

        return Promise.reject(this.transformError(error));
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private transformError(error: any): CanvasError {
    if (error.response?.data) {
      return error.response.data;
    }
    
    return {
      message: error.message || 'Unknown Canvas API error',
      error_code: error.code || 'UNKNOWN_ERROR',
    };
  }

  private parsePaginationLinks(linkHeader?: string): CanvasPaginationLinks | undefined {
    if (!linkHeader) return undefined;

    const links: CanvasPaginationLinks = {};
    const linkRegex = /<([^>]+)>;\s*rel="([^"]+)"/g;
    let match;

    while ((match = linkRegex.exec(linkHeader)) !== null) {
      const [, url, rel] = match;
      if (url && rel) {
        links[rel as keyof CanvasPaginationLinks] = url;
      }
    }

    return Object.keys(links).length > 0 ? links : undefined;
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<CanvasAPIResponse<T>> {
    try {
      const config: AxiosRequestConfig = {
        method,
        url: endpoint,
        params,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }

      const response: AxiosResponse<T> = await this.client.request(config);

      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
        links: this.parsePaginationLinks(response.headers.link) || undefined,
      };
    } catch (error) {
      logger.error(`Canvas API ${method} ${endpoint} failed:`, error);
      throw error;
    }
  }

  // User Methods
  async getCurrentUser(): Promise<CanvasAPIResponse<CanvasUser>> {
    return this.makeRequest<CanvasUser>('GET', '/users/self');
  }

  async getUser(userId: number): Promise<CanvasAPIResponse<CanvasUser>> {
    return this.makeRequest<CanvasUser>('GET', `/users/${userId}`);
  }

  async getUserCourses(userId: number = 0, params?: {
    enrollment_type?: string;
    enrollment_role?: string;
    enrollment_role_id?: number;
    enrollment_state?: string;
    exclude?: string[];
    include?: string[];
    state?: string[];
  }): Promise<CanvasAPIResponse<CanvasCourse[]>> {
    const endpoint = userId === 0 ? '/courses' : `/users/${userId}/courses`;
    return this.makeRequest<CanvasCourse[]>('GET', endpoint, undefined, params);
  }

  // Course Methods
  async getCourse(courseId: number, include?: string[]): Promise<CanvasAPIResponse<CanvasCourse>> {
    const params = include ? { include } : undefined;
    return this.makeRequest<CanvasCourse>('GET', `/courses/${courseId}`, undefined, params);
  }

  async getCourses(params?: {
    enrollment_type?: string;
    enrollment_role?: string;
    enrollment_state?: string;
    exclude?: string[];
    include?: string[];
    state?: string[];
    per_page?: number;
    page?: number;
  }): Promise<CanvasAPIResponse<CanvasCourse[]>> {
    return this.makeRequest<CanvasCourse[]>('GET', '/courses', undefined, params);
  }

  async createCourse(accountId: number, courseData: {
    name: string;
    course_code: string;
    start_at?: string;
    end_at?: string;
    license?: string;
    is_public?: boolean;
    is_public_to_auth_users?: boolean;
    public_syllabus?: boolean;
    public_syllabus_to_auth?: boolean;
    public_description?: string;
    allow_student_wiki_edits?: boolean;
    allow_wiki_comments?: boolean;
    allow_student_forum_attachments?: boolean;
    open_enrollment?: boolean;
    self_enrollment?: boolean;
    restrict_enrollments_to_course_dates?: boolean;
    term_id?: number;
    sis_course_id?: string;
    integration_id?: string;
    hide_final_grades?: boolean;
    apply_assignment_group_weights?: boolean;
    time_zone?: string;
  }): Promise<CanvasAPIResponse<CanvasCourse>> {
    return this.makeRequest<CanvasCourse>('POST', `/accounts/${accountId}/courses`, {
      course: courseData,
    });
  }

  async updateCourse(courseId: number, courseData: Partial<{
    name: string;
    course_code: string;
    start_at: string;
    end_at: string;
    license: string;
    is_public: boolean;
    is_public_to_auth_users: boolean;
    public_syllabus: boolean;
    public_syllabus_to_auth: boolean;
    public_description: string;
    allow_student_wiki_edits: boolean;
    allow_wiki_comments: boolean;
    allow_student_forum_attachments: boolean;
    open_enrollment: boolean;
    self_enrollment: boolean;
    restrict_enrollments_to_course_dates: boolean;
    hide_final_grades: boolean;
    apply_assignment_group_weights: boolean;
    time_zone: string;
    default_view: string;
    syllabus_body: string;
    grading_standard_id: number;
    course_format: string;
  }>): Promise<CanvasAPIResponse<CanvasCourse>> {
    return this.makeRequest<CanvasCourse>('PUT', `/courses/${courseId}`, {
      course: courseData,
    });
  }

  // Assignment Methods
  async getAssignments(courseId: number, params?: {
    include?: string[];
    search_term?: string;
    override_assignment_dates?: boolean;
    needs_grading_count_by_section?: boolean;
    bucket?: string;
    assignment_ids?: number[];
    order_by?: string;
    post_to_sis?: boolean;
    new_quizzes?: boolean;
    per_page?: number;
    page?: number;
  }): Promise<CanvasAPIResponse<CanvasAssignment[]>> {
    return this.makeRequest<CanvasAssignment[]>('GET', `/courses/${courseId}/assignments`, undefined, params);
  }

  async getAssignment(courseId: number, assignmentId: number, include?: string[]): Promise<CanvasAPIResponse<CanvasAssignment>> {
    const params = include ? { include } : undefined;
    return this.makeRequest<CanvasAssignment>('GET', `/courses/${courseId}/assignments/${assignmentId}`, undefined, params);
  }

  async createAssignment(courseId: number, assignmentData: {
    name: string;
    position?: number;
    submission_types?: string[];
    allowed_extensions?: string[];
    turnitin_enabled?: boolean;
    vericite_enabled?: boolean;
    turnitin_settings?: Record<string, any>;
    integration_data?: Record<string, any>;
    integration_id?: string;
    peer_reviews?: boolean;
    automatic_peer_reviews?: boolean;
    notify_of_update?: boolean;
    group_category_id?: number;
    grade_group_students_individually?: boolean;
    external_tool_tag_attributes?: Record<string, any>;
    points_possible?: number;
    grading_type?: string;
    due_at?: string;
    lock_at?: string;
    unlock_at?: string;
    description?: string;
    assignment_group_id?: number;
    assignment_overrides?: any[];
    only_visible_to_overrides?: boolean;
    published?: boolean;
    grading_standard_id?: number;
    omit_from_final_grade?: boolean;
    quiz_lti?: boolean;
    moderated_grading?: boolean;
    grader_count?: number;
    final_grader_id?: number;
    grader_comments_visible_to_graders?: boolean;
    graders_anonymous_to_graders?: boolean;
    grader_names_visible_to_final_grader?: boolean;
    anonymous_grading?: boolean;
    allowed_attempts?: number;
    annotatable_attachment_id?: number;
  }): Promise<CanvasAPIResponse<CanvasAssignment>> {
    return this.makeRequest<CanvasAssignment>('POST', `/courses/${courseId}/assignments`, {
      assignment: assignmentData,
    });
  }

  async updateAssignment(courseId: number, assignmentId: number, assignmentData: Partial<{
    name: string;
    position: number;
    submission_types: string[];
    allowed_extensions: string[];
    turnitin_enabled: boolean;
    vericite_enabled: boolean;
    turnitin_settings: Record<string, any>;
    integration_data: Record<string, any>;
    integration_id: string;
    peer_reviews: boolean;
    automatic_peer_reviews: boolean;
    notify_of_update: boolean;
    group_category_id: number;
    grade_group_students_individually: boolean;
    external_tool_tag_attributes: Record<string, any>;
    points_possible: number;
    grading_type: string;
    due_at: string;
    lock_at: string;
    unlock_at: string;
    description: string;
    assignment_group_id: number;
    assignment_overrides: any[];
    only_visible_to_overrides: boolean;
    published: boolean;
    grading_standard_id: number;
    omit_from_final_grade: boolean;
    quiz_lti: boolean;
    moderated_grading: boolean;
    grader_count: number;
    final_grader_id: number;
    grader_comments_visible_to_graders: boolean;
    graders_anonymous_to_graders: boolean;
    grader_names_visible_to_final_grader: boolean;
    anonymous_grading: boolean;
    allowed_attempts: number;
  }>): Promise<CanvasAPIResponse<CanvasAssignment>> {
    return this.makeRequest<CanvasAssignment>('PUT', `/courses/${courseId}/assignments/${assignmentId}`, {
      assignment: assignmentData,
    });
  }

  async deleteAssignment(courseId: number, assignmentId: number): Promise<CanvasAPIResponse<CanvasAssignment>> {
    return this.makeRequest<CanvasAssignment>('DELETE', `/courses/${courseId}/assignments/${assignmentId}`);
  }

  // Submission Methods
  async getSubmissions(courseId: number, assignmentId: number, params?: {
    include?: string[];
    grouped?: boolean;
    post_to_sis?: boolean;
    submitted_since?: string;
    graded_since?: string;
    grading_period_id?: number;
    workflow_state?: string;
    enrollment_state?: string;
    state_based_on_date?: boolean;
    order?: string;
    order_direction?: string;
    anonymous_id?: string;
    per_page?: number;
    page?: number;
  }): Promise<CanvasAPIResponse<CanvasSubmission[]>> {
    return this.makeRequest<CanvasSubmission[]>('GET', `/courses/${courseId}/assignments/${assignmentId}/submissions`, undefined, params);
  }

  async getSubmission(courseId: number, assignmentId: number, userId: number, include?: string[]): Promise<CanvasAPIResponse<CanvasSubmission>> {
    const params = include ? { include } : undefined;
    return this.makeRequest<CanvasSubmission>('GET', `/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`, undefined, params);
  }

  async gradeSubmission(courseId: number, assignmentId: number, userId: number, gradeData: {
    posted_grade?: string;
    excuse?: boolean;
    rubric_assessment?: Record<string, any>;
    comment?: {
      text_comment?: string;
      group_comment?: boolean;
      media_comment_id?: string;
      media_comment_type?: string;
      file_ids?: number[];
    };
  }): Promise<CanvasAPIResponse<CanvasSubmission>> {
    return this.makeRequest<CanvasSubmission>('PUT', `/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`, {
      submission: gradeData,
    });
  }

  // Enrollment Methods
  async getEnrollments(courseId: number, params?: {
    type?: string[];
    role?: string[];
    state?: string[];
    include?: string[];
    user_id?: number;
    grading_period_id?: number;
    enrollment_term_id?: number;
    sis_account_id?: string[];
    sis_course_id?: string[];
    sis_section_id?: string[];
    sis_user_id?: string[];
    created_for_sis_id?: boolean;
    per_page?: number;
    page?: number;
  }): Promise<CanvasAPIResponse<CanvasEnrollment[]>> {
    return this.makeRequest<CanvasEnrollment[]>('GET', `/courses/${courseId}/enrollments`, undefined, params);
  }

  async enrollUser(courseId: number, enrollmentData: {
    user_id?: number;
    type: string;
    role?: string;
    role_id?: number;
    enrollment_state?: string;
    course_section_id?: number;
    limit_privileges_to_course_section?: boolean;
    notify?: boolean;
    self_enrollment_code?: string;
    self_enrolled?: boolean;
    associated_user_id?: number;
  }): Promise<CanvasAPIResponse<CanvasEnrollment>> {
    return this.makeRequest<CanvasEnrollment>('POST', `/courses/${courseId}/enrollments`, {
      enrollment: enrollmentData,
    });
  }

  async updateEnrollment(courseId: number, enrollmentId: number, enrollmentData: {
    enrollment_state?: string;
    course_section_id?: number;
    limit_privileges_to_course_section?: boolean;
    associated_user_id?: number;
  }): Promise<CanvasAPIResponse<CanvasEnrollment>> {
    return this.makeRequest<CanvasEnrollment>('PUT', `/courses/${courseId}/enrollments/${enrollmentId}`, {
      enrollment: enrollmentData,
    });
  }

  async deleteEnrollment(courseId: number, enrollmentId: number, task: 'conclude' | 'delete' | 'inactivate' | 'deactivate' = 'conclude'): Promise<CanvasAPIResponse<CanvasEnrollment>> {
    return this.makeRequest<CanvasEnrollment>('DELETE', `/courses/${courseId}/enrollments/${enrollmentId}`, undefined, { task });
  }

  // File Methods
  async getFiles(courseId: number, params?: {
    content_types?: string[];
    exclude_content_types?: string[];
    search_term?: string;
    include?: string[];
    only?: string[];
    sort?: string;
    order?: string;
    per_page?: number;
    page?: number;
  }): Promise<CanvasAPIResponse<CanvasFile[]>> {
    return this.makeRequest<CanvasFile[]>('GET', `/courses/${courseId}/files`, undefined, params);
  }

  async getFile(fileId: number, include?: string[]): Promise<CanvasAPIResponse<CanvasFile>> {
    const params = include ? { include } : undefined;
    return this.makeRequest<CanvasFile>('GET', `/files/${fileId}`, undefined, params);
  }

  // Utility Methods
  async validateToken(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      logger.error('Token validation failed:', error);
      return false;
    }
  }

  async getTokenInfo(): Promise<CanvasAccessToken | null> {
    try {
      const response = await this.getCurrentUser();
      return {
        token: this.accessToken,
        userId: response.data.id,
        // Note: Canvas doesn't provide scope/expiry info via API
        // This would need to be tracked separately if using OAuth2
      };
    } catch (error) {
      logger.error('Failed to get token info:', error);
      return null;
    }
  }
}

export default CanvasAPIClient;

