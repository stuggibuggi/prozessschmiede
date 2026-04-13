export type ProcessStatus = "draft" | "active" | "inactive" | "archived";
export type ModelVersionStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "rejected"
  | "archived";
export type ApprovalStatus =
  | "pending"
  | "in_review"
  | "returned"
  | "approved"
  | "rejected"
  | "cancelled";
export type LockStatus = "active" | "released" | "expired" | "overridden";

export interface UserSummary {
  id: string;
  displayName: string;
  email: string;
  locale: string;
}

export interface Organization {
  id: string;
  code: string;
  name: string;
}

export interface Application {
  id: string;
  code: string;
  name: string;
}

export interface ReferenceOption {
  id: string;
  code: string;
  name: string;
}

export interface ProcessSummary {
  id: string;
  businessId: string;
  name: string;
  description: string;
  categoryName: string;
  groupName: string;
  status: ProcessStatus;
  ownerName: string;
  updatedAt: string;
}

export interface SubprocessSummary {
  id: string;
  processId: string;
  name: string;
  status: ProcessStatus;
}

export interface LaneMapping {
  id: string;
  bpmnElementId: string;
  laneNameSnapshot: string;
  organizationId?: string;
  roleCode?: string;
  applicationId?: string;
  mappingSource: "manual" | "imported" | "synchronized";
}

export interface ModelVersionSummary {
  id: string;
  modelId: string;
  versionLabel: string;
  status: ModelVersionStatus;
  changeNote: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ModelVersionCompareSnapshot {
  id: string;
  versionLabel: string;
  status: ModelVersionStatus;
  updatedAt: string;
  updatedBy: string;
}

export interface ModelVersionLaneMappingDiff {
  bpmnElementId: string;
  changeType: "added" | "removed" | "updated";
  left?: {
    laneNameSnapshot: string;
    organizationId?: string;
    roleCode?: string;
    applicationId?: string;
  };
  right?: {
    laneNameSnapshot: string;
    organizationId?: string;
    roleCode?: string;
    applicationId?: string;
  };
}

export interface ModelVersionCompareResponse {
  modelId: string;
  leftVersion: ModelVersionCompareSnapshot;
  rightVersion: ModelVersionCompareSnapshot;
  summary: {
    addedElementCount: number;
    removedElementCount: number;
    changedElementCount: number;
    changedLaneMappingCount: number;
    addedFlowCount: number;
    removedFlowCount: number;
    updatedFlowCount: number;
    riskHighCount: number;
    riskMediumCount: number;
    riskLowCount: number;
  };
  elementChanges: {
    addedElementIds: string[];
    removedElementIds: string[];
    changedElements: Array<{
      id: string;
      left: {
        type: string;
        name?: string;
      };
      right: {
        type: string;
        name?: string;
      };
    }>;
  };
  flowChanges: Array<{
    id: string;
    changeType: "added" | "removed" | "updated";
    left?: {
      type: string;
      name?: string;
      sourceRef?: string;
      targetRef?: string;
    };
    right?: {
      type: string;
      name?: string;
      sourceRef?: string;
      targetRef?: string;
    };
  }>;
  riskSignals: Array<{
    severity: "low" | "medium" | "high";
    code: string;
    message: string;
    entityId?: string;
  }>;
  laneMappingChanges: ModelVersionLaneMappingDiff[];
}

export interface BpmnModelSummary {
  id: string;
  parentType: "process" | "subprocess";
  parentId: string;
  name: string;
  activeLockOwner?: string;
  publishedVersionId?: string;
}

export interface ApprovalQueueItem {
  id: string;
  modelVersionId: string;
  modelName: string;
  status: ApprovalStatus;
  requestedAt: string;
  requestedBy: string;
  requestedById?: string;
  currentStep?: string;
  currentStepDueAt?: string;
  isOverdue?: boolean;
  currentAssigneeUserId?: string;
  currentAssigneeDisplayName?: string;
}

export interface GovernancePolicies {
  fourEyesPrinciple: boolean;
  reviewerMustDifferFromApprover: boolean;
  publishedVersionImmutable: boolean;
}

export interface ApprovalDecisionSummary {
  id: string;
  decision: ApprovalStatus;
  comment?: string;
  decidedAt: string;
  actor: {
    id: string;
    displayName: string;
    email: string;
  };
}

export interface ApprovalStepDetail {
  id: string;
  sequence: number;
  stepType: string;
  status: ApprovalStatus;
  reviewerRoleCode?: string;
  approverRoleCode?: string;
  decisions: ApprovalDecisionSummary[];
}

export interface ApprovalReviewDetail {
  id: string;
  status: ApprovalStatus;
  requestedAt: string;
  completedAt?: string;
  requestedBy: {
    id: string;
    displayName: string;
    email: string;
  };
  modelVersion: {
    id: string;
    versionLabel: string;
    status: ModelVersionStatus;
    model: {
      id: string;
      name: string;
    };
  };
  steps: ApprovalStepDetail[];
}

export interface ReviewRoutingRuleSummary {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  processId?: string;
  processName?: string;
  organizationId?: string;
  organizationName?: string;
  roleCode?: string;
  reviewerUserId: string;
  reviewerDisplayName: string;
  approverUserId: string;
  approverDisplayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEventSummary {
  id: string;
  occurredAt: string;
  actorDisplayName: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  summary: string;
}

export interface CommentSummary {
  id: string;
  modelVersionId: string;
  authorDisplayName: string;
  content: string;
  createdAt: string;
  bpmnElementId?: string;
}

export interface SearchResultItem {
  id: string;
  type: "process" | "subprocess" | "model" | "application" | "organization";
  title: string;
  subtitle: string;
  href: string;
}

export interface BpmnElementSelection {
  id: string;
  type: string;
  name?: string;
}

export interface ModelDetailResponse {
  id: string;
  name: string;
  latestVersion: {
    id: string;
    versionLabel: string;
    status: ModelVersionStatus;
    changeNote: string;
    xml: string;
  };
  activeLock?: {
    id: string;
    status: LockStatus;
    lockedById?: string;
    lockedBy: string;
    reason?: string;
    acquiredAt: string;
  };
  activeReview?: {
    id: string;
    status: ApprovalStatus;
    requestedAt: string;
    requestedBy: string;
    requestedById?: string;
  };
  publishedVersionId?: string;
}

export interface ModelDraftUpdateInput {
  changeNote: string;
  xml: string;
  lanes: Array<{
    id?: string;
    bpmnElementId: string;
    laneNameSnapshot: string;
    organizationId?: string;
    roleCode?: string;
    applicationId?: string;
    mappingSource: "manual" | "imported" | "synchronized";
  }>;
}

export interface ModelActionResponse {
  model: ModelDetailResponse;
  auditEventId: string;
  message: string;
}

export interface CreateProcessModelInput {
  name: string;
}

export interface CreateProcessModelResponse {
  processId: string;
  modelId: string;
  modelName: string;
  versionId: string;
  workspaceHref: string;
}
