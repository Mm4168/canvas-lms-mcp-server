/**
 * Canvas LMS API Type Definitions
 */

// Authentication
export interface CanvasAccessToken {
  token: string;
  userId?: number;
  scopes?: string[];
  expiresAt?: Date;
}

export interface CanvasOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// API Response Wrapper
export interface CanvasAPIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  links: CanvasPaginationLinks | undefined;
}

export interface CanvasPaginationLinks {
  current?: string;
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
}

// User Types
export interface CanvasUser {
  id: number;
  name: string;
  sortable_name: string;
  short_name: string;
  sis_user_id?: string;
  sis_import_id?: number;
  integration_id?: string;
  login_id?: string;
  avatar_url?: string;
  enrollments?: CanvasEnrollment[];
  email?: string;
  locale?: string;
  effective_locale?: string;
  last_login?: string;
  time_zone?: string;
  bio?: string;
}

// Course Types
export interface CanvasCourse {
  id: number;
  name: string;
  account_id: number;
  uuid: string;
  start_at?: string;
  grading_standard_id?: number;
  is_public: boolean;
  created_at: string;
  course_code: string;
  default_view: string;
  root_account_id: number;
  enrollment_term_id: number;
  license?: string;
  grade_passback_setting?: string;
  end_at?: string;
  public_syllabus: boolean;
  public_syllabus_to_auth: boolean;
  storage_quota_mb: number;
  is_public_to_auth_users: boolean;
  homeroom_course: boolean;
  course_color?: string;
  friendly_name?: string;
  apply_assignment_group_weights: boolean;
  calendar?: CanvasCalendar;
  time_zone: string;
  blueprint: boolean;
  blueprint_restrictions?: CanvasBlueprintRestrictions;
  blueprint_restrictions_by_object_type?: Record<string, CanvasBlueprintRestrictions>;
  template: boolean;
  enrollments?: CanvasEnrollment[];
  hide_final_grades: boolean;
  workflow_state: string;
  restrict_enrollments_to_course_dates: boolean;
}

export interface CanvasBlueprintRestrictions {
  content: boolean;
  points: boolean;
  due_dates: boolean;
  availability_dates: boolean;
}

export interface CanvasCalendar {
  ics: string;
}

// Enrollment Types
export interface CanvasEnrollment {
  id: number;
  user_id: number;
  course_id: number;
  type: CanvasEnrollmentType;
  created_at: string;
  updated_at: string;
  associated_user_id?: number;
  start_at?: string;
  end_at?: string;
  course_section_id: number;
  root_account_id: number;
  limit_privileges_to_course_section: boolean;
  enrollment_state: CanvasEnrollmentState;
  role: string;
  role_id: number;
  last_activity_at?: string;
  last_attended_at?: string;
  total_activity_time: number;
  sis_account_id?: string;
  sis_course_id?: string;
  sis_section_id?: string;
  sis_user_id?: string;
  html_url: string;
  grades?: CanvasGrades;
  user?: CanvasUser;
  override_grade?: string;
  override_score?: number;
  unposted_current_grade?: string;
  unposted_final_grade?: string;
  unposted_current_score?: number;
  unposted_final_score?: number;
  has_grading_periods?: boolean;
  totals_for_all_grading_periods_option?: boolean;
  current_grading_period_title?: string;
  current_grading_period_id?: number;
  current_period_override_grade?: string;
  current_period_override_score?: number;
  current_period_unposted_current_score?: number;
  current_period_unposted_final_score?: number;
  current_period_unposted_current_grade?: string;
  current_period_unposted_final_grade?: string;
}

export type CanvasEnrollmentType = 
  | 'StudentEnrollment'
  | 'TeacherEnrollment'
  | 'TaEnrollment'
  | 'DesignerEnrollment'
  | 'ObserverEnrollment';

export type CanvasEnrollmentState = 
  | 'active'
  | 'invited'
  | 'creation_pending'
  | 'deleted'
  | 'rejected'
  | 'completed'
  | 'inactive';

export interface CanvasGrades {
  html_url: string;
  current_grade?: string;
  final_grade?: string;
  current_score?: number;
  final_score?: number;
  unposted_current_grade?: string;
  unposted_final_grade?: string;
  unposted_current_score?: number;
  unposted_final_score?: number;
}

// Assignment Types
export interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  due_at?: string;
  lock_at?: string;
  unlock_at?: string;
  has_overrides: boolean;
  all_dates?: CanvasAssignmentDate[];
  course_id: number;
  html_url: string;
  submissions_download_url?: string;
  assignment_group_id: number;
  due_date_required: boolean;
  allowed_extensions?: string[];
  max_name_length: number;
  turnitin_enabled: boolean;
  vericite_enabled: boolean;
  turnitin_settings?: Record<string, any>;
  grade_group_students_individually: boolean;
  external_tool_tag_attributes?: Record<string, any>;
  peer_reviews: boolean;
  automatic_peer_reviews: boolean;
  peer_review_count: number;
  peer_reviews_assign_at?: string;
  intra_group_peer_reviews: boolean;
  group_category_id?: number;
  needs_grading_count: number;
  needs_grading_count_by_section?: CanvasNeedsGradingCount[];
  position: number;
  post_to_sis: boolean;
  integration_id?: string;
  integration_data?: Record<string, any>;
  points_possible?: number;
  submission_types: CanvasSubmissionType[];
  has_submitted_submissions: boolean;
  grading_type: CanvasGradingType;
  grading_standard_id?: number;
  published: boolean;
  unpublishable: boolean;
  only_visible_to_overrides: boolean;
  locked_for_user: boolean;
  lock_info?: CanvasLockInfo;
  lock_explanation?: string;
  quiz_id?: number;
  anonymous_submissions: boolean;
  discussion_topic?: CanvasDiscussionTopic;
  freeze_on_copy: boolean;
  frozen: boolean;
  frozen_attributes?: string[];
  submission?: CanvasSubmission;
  use_rubric_for_grading: boolean;
  rubric_settings?: CanvasRubricSettings;
  rubric?: CanvasRubric[];
  assignment_visibility?: number[];
  overrides?: CanvasAssignmentOverride[];
  omit_from_final_grade: boolean;
  moderated_grading: boolean;
  grader_count?: number;
  final_grader_id?: number;
  grader_comments_visible_to_graders: boolean;
  graders_anonymous_to_graders: boolean;
  grader_names_visible_to_final_grader: boolean;
  anonymous_grading: boolean;
  allowed_attempts: number;
  post_manually: boolean;
  score_statistics?: CanvasScoreStatistics;
  can_submit: boolean;
  ab_guid?: string[];
}

export interface CanvasAssignmentDate {
  id?: number;
  base: boolean;
  title: string;
  due_at?: string;
  unlock_at?: string;
  lock_at?: string;
}

export interface CanvasNeedsGradingCount {
  section_id: string;
  needs_grading_count: number;
}

export type CanvasSubmissionType = 
  | 'discussion_topic'
  | 'online_quiz'
  | 'on_paper'
  | 'none'
  | 'external_tool'
  | 'online_text_entry'
  | 'online_url'
  | 'online_upload'
  | 'media_recording'
  | 'student_annotation';

export type CanvasGradingType = 
  | 'pass_fail'
  | 'percent'
  | 'letter_grade'
  | 'gpa_scale'
  | 'points'
  | 'not_graded';

export interface CanvasLockInfo {
  asset_string: string;
  unlock_at?: string;
  lock_at?: string;
  context_module?: Record<string, any>;
  manually_locked: boolean;
}

export interface CanvasDiscussionTopic {
  id: number;
  title: string;
  message?: string;
  html_url: string;
  posted_at: string;
  last_reply_at?: string;
  require_initial_post: boolean;
  user_can_see_posts: boolean;
  discussion_subentry_count: number;
  read_state: string;
  unread_count: number;
  subscribed: boolean;
  subscription_hold?: string;
  assignment_id?: number;
  delayed_post_at?: string;
  published: boolean;
  lock_at?: string;
  locked: boolean;
  pinned: boolean;
  locked_for_user: boolean;
  lock_info?: CanvasLockInfo;
  lock_explanation?: string;
  user_name: string;
  topic_children?: number[];
  group_topic_children?: CanvasGroupTopicChildren[];
  root_topic_id?: number;
  podcast_url?: string;
  discussion_type: string;
  group_category_id?: number;
  attachments?: CanvasFile[];
  permissions?: Record<string, boolean>;
  allow_rating: boolean;
  only_graders_can_rate: boolean;
  sort_by_rating: boolean;
}

export interface CanvasGroupTopicChildren {
  id: number;
  group_id: number;
}

// Submission Types
export interface CanvasSubmission {
  assignment_id: number;
  assignment?: CanvasAssignment;
  course?: CanvasCourse;
  attempt: number;
  body?: string;
  grade?: string;
  grade_matches_current_submission: boolean;
  html_url: string;
  preview_url: string;
  score?: number;
  submission_comments?: CanvasSubmissionComment[];
  submission_type?: CanvasSubmissionType;
  submitted_at?: string;
  url?: string;
  user_id: number;
  grader_id?: number;
  graded_at?: string;
  user?: CanvasUser;
  late: boolean;
  assignment_visible: boolean;
  excused?: boolean;
  missing: boolean;
  late_policy_status?: string;
  points_deducted?: number;
  seconds_late: number;
  workflow_state: string;
  extra_attempts?: number;
  anonymous_id?: string;
  posted_at?: string;
  read_status?: string;
  redo_request: boolean;
}

export interface CanvasSubmissionComment {
  id: number;
  author_id: number;
  author_name: string;
  author?: CanvasUser;
  comment: string;
  created_at: string;
  edited_at?: string;
  media_comment?: CanvasMediaComment;
  attachments?: CanvasFile[];
}

export interface CanvasMediaComment {
  content_type: string;
  display_name?: string;
  media_id: string;
  media_type: string;
  url: string;
}

// File Types
export interface CanvasFile {
  id: number;
  uuid: string;
  folder_id: number;
  display_name: string;
  filename: string;
  content_type: string;
  url: string;
  size: number;
  created_at: string;
  updated_at: string;
  unlock_at?: string;
  locked: boolean;
  hidden: boolean;
  lock_at?: string;
  hidden_for_user: boolean;
  thumbnail_url?: string;
  modified_at: string;
  mime_class: string;
  media_entry_id?: string;
  locked_for_user: boolean;
  lock_info?: CanvasLockInfo;
  lock_explanation?: string;
  preview_url?: string;
}

// Rubric Types
export interface CanvasRubric {
  id: number;
  title: string;
  context_id: number;
  context_type: string;
  points_possible: number;
  reusable: boolean;
  read_only: boolean;
  free_form_criterion_comments: boolean;
  hide_score_total: boolean;
  data: CanvasRubricCriterion[];
  assessments?: CanvasRubricAssessment[];
  associations?: CanvasRubricAssociation[];
}

export interface CanvasRubricCriterion {
  id: string;
  description: string;
  long_description?: string;
  points: number;
  criterion_use_range: boolean;
  ratings: CanvasRubricRating[];
}

export interface CanvasRubricRating {
  id: string;
  description: string;
  long_description?: string;
  points: number;
}

export interface CanvasRubricAssessment {
  id: number;
  rubric_id: number;
  rubric_association_id: number;
  score: number;
  data: CanvasRubricAssessmentData[];
  comments?: string;
  assessor_id: number;
}

export interface CanvasRubricAssessmentData {
  criterion_id: string;
  points: number;
  comments?: string;
  rating_id?: string;
}

export interface CanvasRubricAssociation {
  id: number;
  rubric_id: number;
  association_id: number;
  association_type: string;
  use_for_grading: boolean;
  created_at: string;
  updated_at: string;
  title: string;
  description?: string;
  summary_data?: string;
  purpose: string;
  url?: string;
  context_id: number;
  context_type: string;
  hide_score_total?: boolean;
  hide_points?: boolean;
  hide_outcome_results?: boolean;
}

export interface CanvasRubricSettings {
  id: number;
  title: string;
  points_possible: number;
  free_form_criterion_comments?: boolean;
  hide_score_total?: boolean;
  hide_points?: boolean;
}

export interface CanvasAssignmentOverride {
  id: number;
  assignment_id: number;
  student_ids?: number[];
  group_id?: number;
  course_section_id?: number;
  title: string;
  due_at?: string;
  unlock_at?: string;
  lock_at?: string;
}

export interface CanvasScoreStatistics {
  min: number;
  max: number;
  mean: number;
}

// Error Types
export interface CanvasError {
  message: string;
  error_code?: string;
  errors?: CanvasFieldError[];
}

export interface CanvasFieldError {
  field: string;
  code: string;
  message: string;
}

// API Client Configuration
export interface CanvasClientConfig {
  baseUrl: string;
  apiVersion: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

