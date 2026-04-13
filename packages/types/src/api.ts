import type {
  ApprovalQueueItem,
  AuditEventSummary,
  BpmnModelSummary,
  CommentSummary,
  CreateProcessModelInput,
  CreateProcessModelResponse,
  LaneMapping,
  ModelDetailResponse,
  ModelActionResponse,
  ModelDraftUpdateInput,
  ModelVersionSummary,
  ProcessSummary,
  ReferenceOption,
  SearchResultItem,
  UserSummary
} from "./domain";

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, string | number | boolean>;
}

export interface DashboardResponse {
  currentUser: UserSummary;
  myProcesses: ProcessSummary[];
  myOpenReviews: ApprovalQueueItem[];
  recentlyChangedModels: ModelVersionSummary[];
}

export interface ProcessRepositoryResponse {
  items: ProcessSummary[];
  total: number;
}

export interface ProcessDetailResponse {
  process: ProcessSummary;
  models: BpmnModelSummary[];
  laneMappings: LaneMapping[];
  versionTimeline: ModelVersionSummary[];
}

export interface AuditResponse {
  items: AuditEventSummary[];
  total: number;
}

export interface ReferenceOptionsResponse {
  items: ReferenceOption[];
  total: number;
}

export interface SearchResponse {
  query: string;
  strategy: string;
  results: SearchResultItem[];
}

export interface ModelDraftUpdateResponse {
  model: ModelDetailResponse;
  savedVersionId: string;
  auditEventId: string;
}

export interface CommentListResponse {
  items: CommentSummary[];
  total: number;
}

export type { CreateProcessModelInput, CreateProcessModelResponse, ModelActionResponse, ModelDetailResponse, ModelDraftUpdateInput };
