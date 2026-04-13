import { webAppConfig } from "@prozessschmiede/config";
import type {
  ApprovalQueueItem,
  ApprovalReviewDetail,
  ReviewRoutingRuleSummary,
  AuditResponse,
  CommentListResponse,
  CreateProcessModelInput,
  CreateProcessModelResponse,
  DashboardResponse,
  LaneMapping,
  ModelActionResponse,
  ModelDetailResponse,
  ModelDraftUpdateInput,
  ModelDraftUpdateResponse,
  ModelVersionSummary,
  ModelVersionCompareResponse,
  ProcessDetailResponse,
  ProcessRepositoryResponse,
  ReferenceOptionsResponse,
  GovernancePolicies,
  SearchResponse
} from "@prozessschmiede/types";

async function fetchJson<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${webAppConfig.apiBaseUrl}${pathname}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errorBody = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(errorBody.message)) {
        detail = errorBody.message.join(", ");
      } else if (typeof errorBody.message === "string") {
        detail = errorBody.message;
      }
    } catch {
      detail = "";
    }

    throw new Error(
      detail
        ? `API request failed for ${pathname} with ${response.status}: ${detail}`
        : `API request failed for ${pathname} with ${response.status}`
    );
  }

  return (await response.json()) as T;
}

export function getDashboard() {
  return fetchJson<DashboardResponse>("/dashboard");
}

export function getAuthProfile() {
  return fetchJson<{
    provider: "entra-id" | "mock";
    subject: string;
    email: string;
    displayName: string;
    groups: string[];
  }>("/auth/profile");
}

export function getProcesses() {
  return fetchJson<ProcessRepositoryResponse>("/processes");
}

export function getProcessDetail(processId: string) {
  return fetchJson<ProcessDetailResponse>(`/processes/${processId}`);
}

export function createProcessModel(processId: string, payload: CreateProcessModelInput) {
  return fetchJson<CreateProcessModelResponse>(`/processes/${processId}/models`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getModel(modelId: string) {
  return fetchJson<ModelDetailResponse>(`/models/${modelId}`);
}

export function compareModelVersions(modelId: string, params?: { leftVersionId?: string; rightVersionId?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.leftVersionId) {
    searchParams.set("leftVersionId", params.leftVersionId);
  }
  if (params?.rightVersionId) {
    searchParams.set("rightVersionId", params.rightVersionId);
  }
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  return fetchJson<ModelVersionCompareResponse>(`/models/${modelId}/versions/compare${suffix}`);
}

export function getModelVersions(modelId: string) {
  return fetchJson<ModelVersionSummary[]>(`/models/${modelId}/versions`);
}

export function getModelLanes(modelId: string) {
  return fetchJson<LaneMapping[]>(`/models/${modelId}/lanes`);
}

export function getReviews() {
  return fetchJson<ApprovalQueueItem[]>("/governance/reviews");
}

export function getMyReviews() {
  return fetchJson<ApprovalQueueItem[]>("/governance/my-reviews");
}

export function getReviewRoutingRules() {
  return fetchJson<ReviewRoutingRuleSummary[]>("/admin/review-routing-rules");
}

export function createReviewRoutingRule(payload: {
  name: string;
  isActive?: boolean;
  priority?: number;
  processId?: string;
  organizationId?: string;
  roleCode?: string;
  reviewerUserId: string;
  approverUserId: string;
}) {
  return fetchJson<ReviewRoutingRuleSummary[]>("/admin/review-routing-rules", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateReviewRoutingRule(
  ruleId: string,
  payload: {
    name: string;
    isActive?: boolean;
    priority?: number;
    processId?: string;
    organizationId?: string;
    roleCode?: string;
    reviewerUserId: string;
    approverUserId: string;
  }
) {
  return fetchJson<ReviewRoutingRuleSummary[]>(`/admin/review-routing-rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function previewReviewRoutingForModel(modelId: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("modelId", modelId);
  return fetchJson<{
    modelId: string;
    modelName: string;
    latestVersionId: string;
    laneContext: {
      organizationIds: string[];
      roleCodes: string[];
    };
    selectedRuleId?: string;
    selectedRuleName?: string;
    reviewerDisplayName?: string;
    approverDisplayName?: string;
    evaluatedRules: Array<{
      id: string;
      name: string;
      score: number;
      priority: number;
      reviewerDisplayName: string;
      approverDisplayName: string;
      processName?: string;
      organizationName?: string;
      roleCode?: string;
    }>;
  }>(`/admin/review-routing-rules/preview?${searchParams.toString()}`);
}

export function getAdminModelOptions(query = "", limit = 50) {
  const searchParams = new URLSearchParams();
  if (query) {
    searchParams.set("q", query);
  }
  searchParams.set("limit", String(limit));
  return fetchJson<ReferenceOptionsResponse>(`/admin/model-options?${searchParams.toString()}`);
}

export function getReviewDetail(reviewId: string) {
  return fetchJson<ApprovalReviewDetail>(`/governance/reviews/${reviewId}`);
}

export function getGovernancePolicies() {
  return fetchJson<GovernancePolicies>("/governance/policies");
}

export function getAuditEvents() {
  return fetchJson<AuditResponse>("/audit-events");
}

export function searchRepository(query: string) {
  const searchParams = new URLSearchParams();
  if (query) {
    searchParams.set("q", query);
  }
  return fetchJson<SearchResponse>(`/search?${searchParams.toString()}`);
}

export function getOrganizationOptions(query = "", limit = 50) {
  const searchParams = new URLSearchParams();
  if (query) {
    searchParams.set("q", query);
  }
  searchParams.set("limit", String(limit));
  return fetchJson<ReferenceOptionsResponse>(`/search/organizations?${searchParams.toString()}`);
}

export function getApplicationOptions(query = "", limit = 50) {
  const searchParams = new URLSearchParams();
  if (query) {
    searchParams.set("q", query);
  }
  searchParams.set("limit", String(limit));
  return fetchJson<ReferenceOptionsResponse>(`/search/applications?${searchParams.toString()}`);
}

export function getUserOptions(query = "", limit = 50) {
  const searchParams = new URLSearchParams();
  if (query) {
    searchParams.set("q", query);
  }
  searchParams.set("limit", String(limit));
  return fetchJson<ReferenceOptionsResponse>(`/search/users?${searchParams.toString()}`);
}

export function updateModelDraft(modelId: string, payload: ModelDraftUpdateInput) {
  return fetchJson<ModelDraftUpdateResponse>(`/models/${modelId}/draft`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function getModelComments(modelId: string) {
  return fetchJson<CommentListResponse>(`/models/${modelId}/comments`);
}

export function createModelComment(modelId: string, payload: { content: string; bpmnElementId?: string }) {
  return fetchJson<CommentListResponse>(`/models/${modelId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function sendModelAction(modelId: string, pathname: string, comment?: string) {
  return fetchJson<ModelActionResponse>(`/models/${modelId}/${pathname}`, {
    method: "PUT",
    body: JSON.stringify(comment ? { comment } : {})
  });
}

export function checkoutModel(modelId: string, comment?: string) {
  return sendModelAction(modelId, "checkout", comment);
}

export function checkinModel(modelId: string, comment?: string) {
  return sendModelAction(modelId, "checkin", comment);
}

export function submitModelReview(
  modelId: string,
  payload?: {
    comment?: string;
    reviewerUserId?: string;
    approverUserId?: string;
  }
) {
  return fetchJson<ModelActionResponse>(`/models/${modelId}/submit-review`, {
    method: "PUT",
    body: JSON.stringify({
      ...(payload?.comment ? { comment: payload.comment } : {}),
      ...(payload?.reviewerUserId ? { reviewerUserId: payload.reviewerUserId } : {}),
      ...(payload?.approverUserId ? { approverUserId: payload.approverUserId } : {})
    })
  });
}

export function publishModel(modelId: string, comment?: string) {
  return sendModelAction(modelId, "publish", comment);
}

function sendReviewDecision(reviewId: string, decision: "approve" | "return", comment?: string) {
  return fetchJson<{ reviewId: string; status: string; auditEventId: string }>(`/governance/reviews/${reviewId}/${decision}`, {
    method: "PUT",
    body: JSON.stringify(comment ? { comment } : {})
  });
}

export function approveReview(reviewId: string, comment?: string) {
  return sendReviewDecision(reviewId, "approve", comment);
}

export function returnReview(reviewId: string, comment?: string) {
  return sendReviewDecision(reviewId, "return", comment);
}
