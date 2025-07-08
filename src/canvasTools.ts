import { MCPTool, MCPToolResult, MCPPrompt, MCPMessage, MCPErrorCode, MCPTextContent, MCPPromptMessage } from './types/mcp';
import { CanvasAPIClient } from './canvasClient';
import logger from './utils/logger';

export class CanvasToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
  private prompts: Map<string, MCPPrompt> = new Map();

  constructor() {
    this.initializeTools();
    this.initializePrompts();
  }

  private initializeTools(): void {
    // Course Management Tools
    this.registerTool({
      name: 'get_courses',
      description: 'Get a list of courses for the authenticated user',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          enrollment_type: {
            type: 'string',
            description: 'Filter by enrollment type (student, teacher, ta, observer, designer)',
            enum: ['student', 'teacher', 'ta', 'observer', 'designer']
          },
          enrollment_state: {
            type: 'string',
            description: 'Filter by enrollment state (active, invited, completed)',
            enum: ['active', 'invited', 'completed']
          },
          include: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional information to include (enrollments, syllabus_body, term, course_progress, storage_quota_used)'
          }
        },
        required: ['access_token']
      }
    });

    this.registerTool({
      name: 'get_course',
      description: 'Get detailed information about a specific course',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course to retrieve'
          },
          include: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional information to include'
          }
        },
        required: ['access_token', 'course_id']
      }
    });

    this.registerTool({
      name: 'create_course',
      description: 'Create a new course in Canvas',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          account_id: {
            type: 'number',
            description: 'The account ID where the course will be created'
          },
          name: {
            type: 'string',
            description: 'The name of the course'
          },
          course_code: {
            type: 'string',
            description: 'The course code/identifier'
          },
          start_at: {
            type: 'string',
            description: 'Course start date (ISO 8601 format)'
          },
          end_at: {
            type: 'string',
            description: 'Course end date (ISO 8601 format)'
          },
          is_public: {
            type: 'boolean',
            description: 'Whether the course is public'
          },
          public_syllabus: {
            type: 'boolean',
            description: 'Whether the syllabus is public'
          }
        },
        required: ['access_token', 'account_id', 'name', 'course_code']
      }
    });

    this.registerTool({
      name: 'update_course',
      description: 'Update an existing course',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course to update'
          },
          name: {
            type: 'string',
            description: 'The name of the course'
          },
          course_code: {
            type: 'string',
            description: 'The course code/identifier'
          },
          start_at: {
            type: 'string',
            description: 'Course start date (ISO 8601 format)'
          },
          end_at: {
            type: 'string',
            description: 'Course end date (ISO 8601 format)'
          },
          is_public: {
            type: 'boolean',
            description: 'Whether the course is public'
          },
          public_syllabus: {
            type: 'boolean',
            description: 'Whether the syllabus is public'
          }
        },
        required: ['access_token', 'course_id']
      }
    });

    // Assignment Management Tools
    this.registerTool({
      name: 'get_assignments',
      description: 'Get assignments for a course',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course'
          },
          include: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional information to include (submission, assignment_visibility, overrides, observed_users, can_edit, score_statistics)'
          },
          search_term: {
            type: 'string',
            description: 'Search term to filter assignments'
          },
          bucket: {
            type: 'string',
            description: 'Filter assignments by bucket (past, overdue, undated, ungraded, unsubmitted, upcoming, future)',
            enum: ['past', 'overdue', 'undated', 'ungraded', 'unsubmitted', 'upcoming', 'future']
          }
        },
        required: ['access_token', 'course_id']
      }
    });

    this.registerTool({
      name: 'get_assignment',
      description: 'Get detailed information about a specific assignment',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course'
          },
          assignment_id: {
            type: 'number',
            description: 'The ID of the assignment'
          },
          include: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional information to include'
          }
        },
        required: ['access_token', 'course_id', 'assignment_id']
      }
    });

    this.registerTool({
      name: 'create_assignment',
      description: 'Create a new assignment in a course',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course'
          },
          name: {
            type: 'string',
            description: 'The name of the assignment'
          },
          description: {
            type: 'string',
            description: 'The assignment description/instructions'
          },
          points_possible: {
            type: 'number',
            description: 'The maximum points for the assignment'
          },
          due_at: {
            type: 'string',
            description: 'Due date (ISO 8601 format)'
          },
          unlock_at: {
            type: 'string',
            description: 'Date when assignment becomes available (ISO 8601 format)'
          },
          lock_at: {
            type: 'string',
            description: 'Date when assignment is locked (ISO 8601 format)'
          },
          submission_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Allowed submission types (online_text_entry, online_url, online_upload, media_recording, on_paper, external_tool)'
          },
          grading_type: {
            type: 'string',
            description: 'Grading type (pass_fail, percent, letter_grade, gpa_scale, points, not_graded)',
            enum: ['pass_fail', 'percent', 'letter_grade', 'gpa_scale', 'points', 'not_graded']
          },
          published: {
            type: 'boolean',
            description: 'Whether the assignment is published'
          }
        },
        required: ['access_token', 'course_id', 'name']
      }
    });

    this.registerTool({
      name: 'update_assignment',
      description: 'Update an existing assignment',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course'
          },
          assignment_id: {
            type: 'number',
            description: 'The ID of the assignment to update'
          },
          name: {
            type: 'string',
            description: 'The name of the assignment'
          },
          description: {
            type: 'string',
            description: 'The assignment description/instructions'
          },
          points_possible: {
            type: 'number',
            description: 'The maximum points for the assignment'
          },
          due_at: {
            type: 'string',
            description: 'Due date (ISO 8601 format)'
          },
          published: {
            type: 'boolean',
            description: 'Whether the assignment is published'
          }
        },
        required: ['access_token', 'course_id', 'assignment_id']
      }
    });

    // User Management Tools
    this.registerTool({
      name: 'get_current_user',
      description: 'Get information about the current authenticated user',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          }
        },
        required: ['access_token']
      }
    });

    this.registerTool({
      name: 'get_user',
      description: 'Get information about a specific user',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          user_id: {
            type: 'number',
            description: 'The ID of the user to retrieve'
          }
        },
        required: ['access_token', 'user_id']
      }
    });

    // Enrollment Management Tools
    this.registerTool({
      name: 'get_enrollments',
      description: 'Get enrollments for a course',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course'
          },
          type: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by enrollment type'
          },
          state: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by enrollment state'
          },
          include: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional information to include (avatar_url, group_ids, locked, observed_users, can_be_removed, uuid, current_points)'
          }
        },
        required: ['access_token', 'course_id']
      }
    });

    this.registerTool({
      name: 'enroll_user',
      description: 'Enroll a user in a course',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course'
          },
          user_id: {
            type: 'number',
            description: 'The ID of the user to enroll'
          },
          type: {
            type: 'string',
            description: 'The enrollment type (StudentEnrollment, TeacherEnrollment, TaEnrollment, ObserverEnrollment, DesignerEnrollment)',
            enum: ['StudentEnrollment', 'TeacherEnrollment', 'TaEnrollment', 'ObserverEnrollment', 'DesignerEnrollment']
          },
          enrollment_state: {
            type: 'string',
            description: 'The enrollment state (active, invited)',
            enum: ['active', 'invited']
          },
          notify: {
            type: 'boolean',
            description: 'Whether to send a notification to the user'
          }
        },
        required: ['access_token', 'course_id', 'user_id', 'type']
      }
    });

    // Submission and Grading Tools
    this.registerTool({
      name: 'get_submissions',
      description: 'Get submissions for an assignment',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course'
          },
          assignment_id: {
            type: 'number',
            description: 'The ID of the assignment'
          },
          include: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional information to include (submission_history, submission_comments, rubric_assessment, assignment, visibility, course, user)'
          },
          workflow_state: {
            type: 'string',
            description: 'Filter by submission workflow state',
            enum: ['submitted', 'unsubmitted', 'graded', 'pending_review']
          }
        },
        required: ['access_token', 'course_id', 'assignment_id']
      }
    });

    this.registerTool({
      name: 'get_submission',
      description: 'Get a specific submission',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course'
          },
          assignment_id: {
            type: 'number',
            description: 'The ID of the assignment'
          },
          user_id: {
            type: 'number',
            description: 'The ID of the user'
          },
          include: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional information to include'
          }
        },
        required: ['access_token', 'course_id', 'assignment_id', 'user_id']
      }
    });

    this.registerTool({
      name: 'grade_submission',
      description: 'Grade a student submission',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course'
          },
          assignment_id: {
            type: 'number',
            description: 'The ID of the assignment'
          },
          user_id: {
            type: 'number',
            description: 'The ID of the user'
          },
          posted_grade: {
            type: 'string',
            description: 'The grade to assign (points, percentage, letter grade, etc.)'
          },
          excuse: {
            type: 'boolean',
            description: 'Whether to excuse the submission'
          },
          comment: {
            type: 'string',
            description: 'Comment to add to the submission'
          }
        },
        required: ['access_token', 'course_id', 'assignment_id', 'user_id']
      }
    });

    // File Management Tools
    this.registerTool({
      name: 'get_files',
      description: 'Get files for a course',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          course_id: {
            type: 'number',
            description: 'The ID of the course'
          },
          search_term: {
            type: 'string',
            description: 'Search term to filter files'
          },
          content_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by content types'
          },
          sort: {
            type: 'string',
            description: 'Sort order (name, size, created_at, updated_at, content_type)',
            enum: ['name', 'size', 'created_at', 'updated_at', 'content_type']
          }
        },
        required: ['access_token', 'course_id']
      }
    });

    this.registerTool({
      name: 'get_file',
      description: 'Get information about a specific file',
      inputSchema: {
        type: 'object',
        properties: {
          access_token: {
            type: 'string',
            description: 'Canvas access token for authentication'
          },
          file_id: {
            type: 'number',
            description: 'The ID of the file'
          }
        },
        required: ['access_token', 'file_id']
      }
    });
  }

  private initializePrompts(): void {
    this.registerPrompt({
      name: 'course_overview',
      description: 'Generate a comprehensive overview of a Canvas course',
      arguments: [
        {
          name: 'course_id',
          description: 'The ID of the course to analyze',
          required: true
        },
        {
          name: 'include_assignments',
          description: 'Whether to include assignment information',
          required: false
        },
        {
          name: 'include_enrollments',
          description: 'Whether to include enrollment information',
          required: false
        }
      ]
    });

    this.registerPrompt({
      name: 'assignment_analysis',
      description: 'Analyze assignment performance and provide insights',
      arguments: [
        {
          name: 'course_id',
          description: 'The ID of the course',
          required: true
        },
        {
          name: 'assignment_id',
          description: 'The ID of the assignment to analyze',
          required: true
        }
      ]
    });

    this.registerPrompt({
      name: 'student_progress',
      description: 'Generate a student progress report',
      arguments: [
        {
          name: 'course_id',
          description: 'The ID of the course',
          required: true
        },
        {
          name: 'user_id',
          description: 'The ID of the student',
          required: true
        }
      ]
    });
  }

  private registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    logger.debug(`Registered tool: ${tool.name}`);
  }

  private registerPrompt(prompt: MCPPrompt): void {
    this.prompts.set(prompt.name, prompt);
    logger.debug(`Registered prompt: ${prompt.name}`);
  }

  public async getAvailableTools(): Promise<MCPTool[]> {
    return Array.from(this.tools.values());
  }

  public async getAvailablePrompts(): Promise<MCPPrompt[]> {
    return Array.from(this.prompts.values());
  }

  public async executeTool(toolName: string, args: Record<string, any>, canvasClient: CanvasAPIClient): Promise<MCPToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    try {
      let result: any;
      
      switch (toolName) {
        case 'get_courses':
          result = await canvasClient.getCourses({
            enrollment_type: args.enrollment_type,
            enrollment_state: args.enrollment_state,
            include: args.include
          });
          break;

        case 'get_course':
          result = await canvasClient.getCourse(args.course_id, args.include);
          break;

        case 'create_course':
          result = await canvasClient.createCourse(args.account_id, {
            name: args.name,
            course_code: args.course_code,
            start_at: args.start_at,
            end_at: args.end_at,
            is_public: args.is_public,
            public_syllabus: args.public_syllabus
          });
          break;

        case 'update_course':
          result = await canvasClient.updateCourse(args.course_id, {
            name: args.name,
            course_code: args.course_code,
            start_at: args.start_at,
            end_at: args.end_at,
            is_public: args.is_public,
            public_syllabus: args.public_syllabus
          });
          break;

        case 'get_assignments':
          result = await canvasClient.getAssignments(args.course_id, {
            include: args.include,
            search_term: args.search_term,
            bucket: args.bucket
          });
          break;

        case 'get_assignment':
          result = await canvasClient.getAssignment(args.course_id, args.assignment_id, args.include);
          break;

        case 'create_assignment':
          result = await canvasClient.createAssignment(args.course_id, {
            name: args.name,
            description: args.description,
            points_possible: args.points_possible,
            due_at: args.due_at,
            unlock_at: args.unlock_at,
            lock_at: args.lock_at,
            submission_types: args.submission_types,
            grading_type: args.grading_type,
            published: args.published
          });
          break;

        case 'update_assignment':
          result = await canvasClient.updateAssignment(args.course_id, args.assignment_id, {
            name: args.name,
            description: args.description,
            points_possible: args.points_possible,
            due_at: args.due_at,
            published: args.published
          });
          break;

        case 'get_current_user':
          result = await canvasClient.getCurrentUser();
          break;

        case 'get_user':
          result = await canvasClient.getUser(args.user_id);
          break;

        case 'get_enrollments':
          result = await canvasClient.getEnrollments(args.course_id, {
            type: args.type,
            state: args.state,
            include: args.include
          });
          break;

        case 'enroll_user':
          result = await canvasClient.enrollUser(args.course_id, {
            user_id: args.user_id,
            type: args.type,
            enrollment_state: args.enrollment_state,
            notify: args.notify
          });
          break;

        case 'get_submissions':
          result = await canvasClient.getSubmissions(args.course_id, args.assignment_id, {
            include: args.include,
            workflow_state: args.workflow_state
          });
          break;

        case 'get_submission':
          result = await canvasClient.getSubmission(args.course_id, args.assignment_id, args.user_id, args.include);
          break;

        case 'grade_submission':
          const gradeData: any = {
            posted_grade: args.posted_grade,
            excuse: args.excuse,
          };
          if (args.comment) {
            gradeData.comment = { text_comment: args.comment };
          }
          result = await canvasClient.gradeSubmission(args.course_id, args.assignment_id, args.user_id, gradeData);
          break;

        case 'get_files':
          result = await canvasClient.getFiles(args.course_id, {
            search_term: args.search_term,
            content_types: args.content_types,
            sort: args.sort
          });
          break;

        case 'get_file':
          result = await canvasClient.getFile(args.file_id);
          break;

        default:
          throw new Error(`Tool execution not implemented: ${toolName}`);
      }

      const content: MCPTextContent = {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      };

      return {
        content: [content],
        isError: false
      };

    } catch (error) {
      logger.error(`Error executing tool ${toolName}:`, error);
      
      const errorContent: MCPTextContent = {
        type: 'text',
        text: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

      return {
        content: [errorContent],
        isError: true
      };
    }
  }

  public async getPrompt(promptName: string, args: Record<string, any>): Promise<MCPPromptMessage[]> {
    const prompt = this.prompts.get(promptName);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptName}`);
    }

    // Generate prompt messages based on the prompt type
    switch (promptName) {
      case 'course_overview':
        return [
          {
            role: 'system',
            content: [{
              type: 'text',
              text: 'You are a Canvas LMS assistant. Generate a comprehensive course overview based on the provided course data.'
            }]
          },
          {
            role: 'user',
            content: [{
              type: 'text',
              text: `Please provide a comprehensive overview of course ID ${args.course_id}. ${args.include_assignments ? 'Include assignment information.' : ''} ${args.include_enrollments ? 'Include enrollment statistics.' : ''}`
            }]
          }
        ];

      case 'assignment_analysis':
        return [
          {
            role: 'system',
            content: [{
              type: 'text',
              text: 'You are a Canvas LMS assistant. Analyze assignment performance and provide educational insights.'
            }]
          },
          {
            role: 'user',
            content: [{
              type: 'text',
              text: `Please analyze the performance of assignment ID ${args.assignment_id} in course ID ${args.course_id}. Provide insights on student performance, grade distribution, and suggestions for improvement.`
            }]
          }
        ];

      case 'student_progress':
        return [
          {
            role: 'system',
            content: [{
              type: 'text',
              text: 'You are a Canvas LMS assistant. Generate student progress reports with actionable insights.'
            }]
          },
          {
            role: 'user',
            content: [{
              type: 'text',
              text: `Please generate a progress report for student ID ${args.user_id} in course ID ${args.course_id}. Include assignment completion, grade trends, and recommendations.`
            }]
          }
        ];

      default:
        throw new Error(`Prompt generation not implemented: ${promptName}`);
    }
  }
}

export default CanvasToolRegistry;

