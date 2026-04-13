import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ApprovalStatus,
  CommentListResponse,
  LockStatus,
  ModelActionResponse,
  ModelDetailResponse,
  ModelDraftUpdateInput,
  ModelDraftUpdateResponse,
  ModelVersionCompareResponse,
  ModelVersionSummary,
  ModelVersionStatus
} from "@prozessschmiede/types";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { IdentityService } from "../identity/identity.service";
import { PrismaService } from "../shared/prisma.service";

const defaultBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_Prozessschmiede"
  targetNamespace="http://prozessschmiede.local/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

@Injectable()
export class ProcessModelingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdentityService) private readonly identityService: IdentityService
  ) {}

  async getModel(modelId: string): Promise<ModelDetailResponse> {
    const model = await this.getModelAggregate(modelId);
    return this.toModelDetail(model);
  }

  async getVersions(modelId: string): Promise<ModelVersionSummary[]> {
    const versions = await this.prisma.modelVersion.findMany({
      where: {
        modelId
      },
      include: {
        updatedBy: true
      },
      orderBy: [
        { versionMajor: "desc" },
        { versionMinor: "desc" },
        { versionPatch: "desc" }
      ]
    });

    return versions.map((version) => ({
      id: version.id,
      modelId: version.modelId,
      versionLabel: version.versionLabel,
      status: version.status as ModelVersionStatus,
      changeNote: version.changeNote,
      updatedAt: version.updatedAt.toISOString(),
      updatedBy: version.updatedBy.displayName
    }));
  }

  async compareVersions(modelId: string, leftVersionId?: string, rightVersionId?: string): Promise<ModelVersionCompareResponse> {
    const versions = await this.prisma.modelVersion.findMany({
      where: {
        modelId
      },
      include: {
        updatedBy: true,
        diagramAssets: {
          where: {
            assetType: "bpmn_xml"
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        },
        laneMappings: true
      },
      orderBy: [{ versionMajor: "desc" }, { versionMinor: "desc" }, { versionPatch: "desc" }]
    });

    if (versions.length === 0) {
      throw new NotFoundException(`Model ${modelId} was not found`);
    }

    const rightVersion = rightVersionId ? versions.find((version) => version.id === rightVersionId) : versions[0];
    if (!rightVersion) {
      throw new NotFoundException(`Right version ${rightVersionId} was not found`);
    }

    const leftVersion =
      leftVersionId
        ? versions.find((version) => version.id === leftVersionId)
        : versions.find((version) => version.id !== rightVersion.id) ?? rightVersion;

    if (!leftVersion) {
      throw new NotFoundException(`Left version ${leftVersionId} was not found`);
    }

    const leftXml = leftVersion.diagramAssets[0]?.storageKey ?? "";
    const rightXml = rightVersion.diagramAssets[0]?.storageKey ?? "";

    const leftElements = this.extractBpmnElements(leftXml);
    const rightElements = this.extractBpmnElements(rightXml);
    const leftFlows = this.extractFlowElements(leftXml);
    const rightFlows = this.extractFlowElements(rightXml);

    const leftElementIds = new Set(leftElements.keys());
    const rightElementIds = new Set(rightElements.keys());

    const addedElementIds = [...rightElementIds].filter((id) => !leftElementIds.has(id)).sort();
    const removedElementIds = [...leftElementIds].filter((id) => !rightElementIds.has(id)).sort();
    const changedElements = [...leftElementIds]
      .filter((id) => rightElementIds.has(id))
      .map((id) => {
        const left = leftElements.get(id);
        const right = rightElements.get(id);
        if (!left || !right) {
          return null;
        }

        const leftComparable = `${left.type}|${left.name ?? ""}`;
        const rightComparable = `${right.type}|${right.name ?? ""}`;
        if (leftComparable === rightComparable) {
          return null;
        }

        return {
          id,
          left: {
            type: left.type,
            ...(left.name ? { name: left.name } : {})
          },
          right: {
            type: right.type,
            ...(right.name ? { name: right.name } : {})
          }
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => left.id.localeCompare(right.id));

    const flowChanges = [...new Set([...leftFlows.keys(), ...rightFlows.keys()])]
      .map((flowId) => {
        const leftFlow = leftFlows.get(flowId);
        const rightFlow = rightFlows.get(flowId);

        if (!leftFlow && rightFlow) {
          return {
            id: flowId,
            changeType: "added" as const,
            right: {
              type: rightFlow.type,
              ...(rightFlow.name ? { name: rightFlow.name } : {}),
              ...(rightFlow.sourceRef ? { sourceRef: rightFlow.sourceRef } : {}),
              ...(rightFlow.targetRef ? { targetRef: rightFlow.targetRef } : {})
            }
          };
        }

        if (leftFlow && !rightFlow) {
          return {
            id: flowId,
            changeType: "removed" as const,
            left: {
              type: leftFlow.type,
              ...(leftFlow.name ? { name: leftFlow.name } : {}),
              ...(leftFlow.sourceRef ? { sourceRef: leftFlow.sourceRef } : {}),
              ...(leftFlow.targetRef ? { targetRef: leftFlow.targetRef } : {})
            }
          };
        }

        if (!leftFlow || !rightFlow) {
          return null;
        }

        const leftComparable = [leftFlow.type, leftFlow.name ?? "", leftFlow.sourceRef ?? "", leftFlow.targetRef ?? ""].join("|");
        const rightComparable = [rightFlow.type, rightFlow.name ?? "", rightFlow.sourceRef ?? "", rightFlow.targetRef ?? ""].join("|");
        if (leftComparable === rightComparable) {
          return null;
        }

        return {
          id: flowId,
          changeType: "updated" as const,
          left: {
            type: leftFlow.type,
            ...(leftFlow.name ? { name: leftFlow.name } : {}),
            ...(leftFlow.sourceRef ? { sourceRef: leftFlow.sourceRef } : {}),
            ...(leftFlow.targetRef ? { targetRef: leftFlow.targetRef } : {})
          },
          right: {
            type: rightFlow.type,
            ...(rightFlow.name ? { name: rightFlow.name } : {}),
            ...(rightFlow.sourceRef ? { sourceRef: rightFlow.sourceRef } : {}),
            ...(rightFlow.targetRef ? { targetRef: rightFlow.targetRef } : {})
          }
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => left.id.localeCompare(right.id));

    const addedFlowCount = flowChanges.filter((change) => change.changeType === "added").length;
    const removedFlowCount = flowChanges.filter((change) => change.changeType === "removed").length;
    const updatedFlowCount = flowChanges.filter((change) => change.changeType === "updated").length;

    const leftLaneMap = new Map(leftVersion.laneMappings.map((lane) => [lane.bpmnElementId, lane]));
    const rightLaneMap = new Map(rightVersion.laneMappings.map((lane) => [lane.bpmnElementId, lane]));
    const laneKeys = new Set([...leftLaneMap.keys(), ...rightLaneMap.keys()]);

    const laneMappingChanges = [...laneKeys]
      .map((laneKey) => {
        const leftLane = leftLaneMap.get(laneKey);
        const rightLane = rightLaneMap.get(laneKey);

        if (!leftLane && rightLane) {
          return {
            bpmnElementId: laneKey,
            changeType: "added" as const,
            right: {
              laneNameSnapshot: rightLane.laneNameSnapshot,
              ...(rightLane.organizationId ? { organizationId: rightLane.organizationId } : {}),
              ...(rightLane.roleCode ? { roleCode: rightLane.roleCode } : {}),
              ...(rightLane.applicationId ? { applicationId: rightLane.applicationId } : {})
            }
          };
        }

        if (leftLane && !rightLane) {
          return {
            bpmnElementId: laneKey,
            changeType: "removed" as const,
            left: {
              laneNameSnapshot: leftLane.laneNameSnapshot,
              ...(leftLane.organizationId ? { organizationId: leftLane.organizationId } : {}),
              ...(leftLane.roleCode ? { roleCode: leftLane.roleCode } : {}),
              ...(leftLane.applicationId ? { applicationId: leftLane.applicationId } : {})
            }
          };
        }

        if (!leftLane || !rightLane) {
          return null;
        }

        const leftComparable = [
          leftLane.laneNameSnapshot,
          leftLane.organizationId ?? "",
          leftLane.roleCode ?? "",
          leftLane.applicationId ?? ""
        ].join("|");
        const rightComparable = [
          rightLane.laneNameSnapshot,
          rightLane.organizationId ?? "",
          rightLane.roleCode ?? "",
          rightLane.applicationId ?? ""
        ].join("|");

        if (leftComparable === rightComparable) {
          return null;
        }

        return {
          bpmnElementId: laneKey,
          changeType: "updated" as const,
          left: {
            laneNameSnapshot: leftLane.laneNameSnapshot,
            ...(leftLane.organizationId ? { organizationId: leftLane.organizationId } : {}),
            ...(leftLane.roleCode ? { roleCode: leftLane.roleCode } : {}),
            ...(leftLane.applicationId ? { applicationId: leftLane.applicationId } : {})
          },
          right: {
            laneNameSnapshot: rightLane.laneNameSnapshot,
            ...(rightLane.organizationId ? { organizationId: rightLane.organizationId } : {}),
            ...(rightLane.roleCode ? { roleCode: rightLane.roleCode } : {}),
            ...(rightLane.applicationId ? { applicationId: rightLane.applicationId } : {})
          }
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => left.bpmnElementId.localeCompare(right.bpmnElementId));

    const riskSignals: ModelVersionCompareResponse["riskSignals"] = [];

    const criticalTypes = new Set(["startEvent", "endEvent", "exclusiveGateway", "parallelGateway", "inclusiveGateway", "eventBasedGateway", "callActivity", "subProcess"]);
    for (const removedId of removedElementIds) {
      const removed = leftElements.get(removedId);
      if (removed && criticalTypes.has(removed.type)) {
        riskSignals.push({
          severity: "high",
          code: "critical_element_removed",
          message: `Kritisches Element entfernt: ${removed.type}${removed.name ? ` (${removed.name})` : ""}`,
          entityId: removedId
        });
      }
    }

    for (const changed of changedElements) {
      if (changed.left.type !== changed.right.type) {
        riskSignals.push({
          severity: "medium",
          code: "element_type_changed",
          message: `Element-Typ geaendert von ${changed.left.type} zu ${changed.right.type}`,
          entityId: changed.id
        });
      }
    }

    for (const flow of flowChanges) {
      if (flow.changeType === "removed") {
        riskSignals.push({
          severity: "medium",
          code: "flow_removed",
          message: `Flow entfernt${flow.left?.name ? ` (${flow.left.name})` : ""}`,
          entityId: flow.id
        });
        continue;
      }

      if (flow.changeType === "updated" && flow.left && flow.right && (flow.left.sourceRef !== flow.right.sourceRef || flow.left.targetRef !== flow.right.targetRef)) {
        riskSignals.push({
          severity: "medium",
          code: "flow_rerouted",
          message: "Flow-Verknuepfung (source/target) wurde geaendert",
          entityId: flow.id
        });
      }
    }

    const laneRoleRelevantChanges = laneMappingChanges.filter((change) => {
      if (change.changeType !== "updated" || !change.left || !change.right) {
        return false;
      }
      return change.left.organizationId !== change.right.organizationId || change.left.roleCode !== change.right.roleCode || change.left.applicationId !== change.right.applicationId;
    });

    if (laneRoleRelevantChanges.length > 0) {
      riskSignals.push({
        severity: "low",
        code: "lane_responsibility_changed",
        message: `Verantwortlichkeits-Zuordnungen geaendert in ${laneRoleRelevantChanges.length} Lane(s)`
      });
    }

    const riskHighCount = riskSignals.filter((signal) => signal.severity === "high").length;
    const riskMediumCount = riskSignals.filter((signal) => signal.severity === "medium").length;
    const riskLowCount = riskSignals.filter((signal) => signal.severity === "low").length;

    return {
      modelId,
      leftVersion: {
        id: leftVersion.id,
        versionLabel: leftVersion.versionLabel,
        status: leftVersion.status as ModelVersionStatus,
        updatedAt: leftVersion.updatedAt.toISOString(),
        updatedBy: leftVersion.updatedBy.displayName
      },
      rightVersion: {
        id: rightVersion.id,
        versionLabel: rightVersion.versionLabel,
        status: rightVersion.status as ModelVersionStatus,
        updatedAt: rightVersion.updatedAt.toISOString(),
        updatedBy: rightVersion.updatedBy.displayName
      },
      summary: {
        addedElementCount: addedElementIds.length,
        removedElementCount: removedElementIds.length,
        changedElementCount: changedElements.length,
        changedLaneMappingCount: laneMappingChanges.length,
        addedFlowCount,
        removedFlowCount,
        updatedFlowCount,
        riskHighCount,
        riskMediumCount,
        riskLowCount
      },
      elementChanges: {
        addedElementIds,
        removedElementIds,
        changedElements
      },
      flowChanges,
      riskSignals,
      laneMappingChanges
    };
  }

  async getLaneMappings(modelId: string) {
    const latestVersion = await this.prisma.modelVersion.findFirst({
      where: {
        modelId
      },
      orderBy: [
        { versionMajor: "desc" },
        { versionMinor: "desc" },
        { versionPatch: "desc" }
      ]
    });

    if (!latestVersion) {
      return [];
    }

    return this.prisma.laneMapping.findMany({
      where: {
        modelVersionId: latestVersion.id
      },
      orderBy: [{ laneNameSnapshot: "asc" }]
    });
  }

  async getComments(modelId: string): Promise<CommentListResponse> {
    const latestVersion = await this.prisma.modelVersion.findFirst({
      where: {
        modelId
      },
      orderBy: [{ versionMajor: "desc" }, { versionMinor: "desc" }, { versionPatch: "desc" }]
    });

    if (!latestVersion) {
      return {
        total: 0,
        items: []
      };
    }

    const comments = await this.prisma.comment.findMany({
      where: {
        modelVersionId: latestVersion.id
      },
      include: {
        author: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return {
      total: comments.length,
      items: comments.map((comment) => ({
        id: comment.id,
        modelVersionId: comment.modelVersionId,
        authorDisplayName: comment.author.displayName,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        ...(comment.bpmnElementId ? { bpmnElementId: comment.bpmnElementId } : {})
      }))
    };
  }

  async updateDraft(modelId: string, input: ModelDraftUpdateInput): Promise<ModelDraftUpdateResponse> {
    const user = await this.resolveCurrentUser();
    const model = await this.getModelAggregate(modelId);
    const activeLock = model.checkoutLocks[0];

    if (activeLock && activeLock.lockedByUserId !== user.id) {
      throw new ForbiddenException(`Model is currently checked out by ${activeLock.lockedByUser.displayName}`);
    }

    const currentVersion = model.versions[0]!;

    const result = await this.prisma.$transaction(async (tx) => {
      const workingVersion =
        currentVersion.status === "draft"
          ? currentVersion
          : await tx.modelVersion.create({
              data: {
                modelId: model.id,
                baseVersionId: currentVersion.id,
                versionMajor: currentVersion.versionMajor,
                versionMinor: currentVersion.versionMinor,
                versionPatch: currentVersion.versionPatch + 1,
                versionLabel: `${currentVersion.versionMajor}.${currentVersion.versionMinor}.${currentVersion.versionPatch + 1}`,
                status: "draft",
                changeNote: input.changeNote,
                updatedById: user.id
              }
            });

      if (currentVersion.status !== "draft") {
        const inheritedXml = currentVersion.diagramAssets[0]?.storageKey ?? defaultBpmnXml;
        await tx.diagramAsset.create({
          data: {
            modelVersionId: workingVersion.id,
            assetType: "bpmn_xml",
            storageKey: inheritedXml
          }
        });

        if (currentVersion.laneMappings.length > 0) {
          await tx.laneMapping.createMany({
            data: currentVersion.laneMappings.map((lane: (typeof currentVersion.laneMappings)[number]) => ({
              modelVersionId: workingVersion.id,
              bpmnElementId: lane.bpmnElementId,
              laneNameSnapshot: lane.laneNameSnapshot,
              organizationId: lane.organizationId,
              roleCode: lane.roleCode,
              applicationId: lane.applicationId,
              mappingSource: lane.mappingSource,
              validFrom: new Date()
            }))
          });
        }
      }

      await tx.modelVersion.update({
        where: { id: workingVersion.id },
        data: {
          changeNote: input.changeNote,
          updatedById: user.id,
          status: "draft"
        }
      });

      const existingXmlAsset = await tx.diagramAsset.findFirst({
        where: {
          modelVersionId: workingVersion.id,
          assetType: "bpmn_xml"
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      if (existingXmlAsset) {
        await tx.diagramAsset.update({
          where: { id: existingXmlAsset.id },
          data: {
            storageKey: input.xml
          }
        });
      } else {
        await tx.diagramAsset.create({
          data: {
            modelVersionId: workingVersion.id,
            assetType: "bpmn_xml",
            storageKey: input.xml || defaultBpmnXml
          }
        });
      }

      await tx.laneMapping.deleteMany({
        where: {
          modelVersionId: workingVersion.id
        }
      });

      if (input.lanes.length > 0) {
        await tx.laneMapping.createMany({
          data: input.lanes.map((lane) => ({
            modelVersionId: workingVersion.id,
            bpmnElementId: lane.bpmnElementId,
            laneNameSnapshot: lane.laneNameSnapshot,
            organizationId: lane.organizationId || null,
            roleCode: lane.roleCode || null,
            applicationId: lane.applicationId || null,
            mappingSource: lane.mappingSource,
            validFrom: new Date()
          }))
        });
      }

      const auditEvent = await tx.auditEvent.create({
        data: {
          actorUserId: user.id,
          actorDisplayName: user.displayName,
          eventType: "model.draft_saved",
          aggregateType: "model_version",
          aggregateId: workingVersion.id,
          summary: `Draft for model ${model.name} saved`
        }
      });

      const refreshedVersion = await tx.modelVersion.findUniqueOrThrow({
        where: { id: workingVersion.id },
        include: {
          diagramAssets: {
            where: {
              assetType: "bpmn_xml"
            },
            orderBy: {
              createdAt: "desc"
            },
            take: 1
          }
        }
      });

      return {
        model: {
          id: model.id,
          name: model.name,
          latestVersion: this.toModelVersionPayload(refreshedVersion.id, refreshedVersion.versionLabel, refreshedVersion.status, refreshedVersion.changeNote, refreshedVersion.diagramAssets[0]?.storageKey ?? defaultBpmnXml)
        },
        savedVersionId: refreshedVersion.id,
        auditEventId: auditEvent.id
      };
    });

    return result;
  }

  async checkout(modelId: string, comment?: string): Promise<ModelActionResponse> {
    const user = await this.resolveCurrentUser();
    const model = await this.getModelAggregate(modelId);
    const activeLock = model.checkoutLocks[0];

    if (activeLock && activeLock.lockedByUserId !== user.id) {
      throw new ForbiddenException(`Model is already checked out by ${activeLock.lockedByUser.displayName}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (!activeLock) {
        await tx.checkoutLock.create({
          data: {
            modelId,
            lockedByUserId: user.id,
            status: "active",
            reason: comment ?? null
          }
        });
      }

      const auditEvent = await tx.auditEvent.create({
        data: {
          actorUserId: user.id,
          actorDisplayName: user.displayName,
          eventType: "model.checked_out",
          aggregateType: "model",
          aggregateId: modelId,
          summary: `Model ${model.name} checked out`
        }
      });

      const refreshedModel = await this.loadModelAggregateTx(tx, modelId);
      return {
        model: this.toModelDetail(refreshedModel),
        auditEventId: auditEvent.id,
        message: activeLock ? "Model war bereits von dir ausgecheckt." : "Model erfolgreich ausgecheckt."
      };
    });

    return result;
  }

  async checkin(modelId: string, comment?: string): Promise<ModelActionResponse> {
    const user = await this.resolveCurrentUser();
    const model = await this.getModelAggregate(modelId);
    const activeLock = model.checkoutLocks[0];

    if (!activeLock) {
      throw new BadRequestException("Model is not checked out");
    }

    if (activeLock.lockedByUserId !== user.id) {
      throw new ForbiddenException(`Model is checked out by ${activeLock.lockedByUser.displayName}`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.checkoutLock.update({
        where: { id: activeLock.id },
        data: {
          status: "released",
          releasedAt: new Date(),
          reason: comment ?? activeLock.reason
        }
      });

      const auditEvent = await tx.auditEvent.create({
        data: {
          actorUserId: user.id,
          actorDisplayName: user.displayName,
          eventType: "model.checked_in",
          aggregateType: "model",
          aggregateId: modelId,
          summary: `Model ${model.name} checked in`
        }
      });

      return {
        model: this.toModelDetail(await this.loadModelAggregateTx(tx, modelId)),
        auditEventId: auditEvent.id,
        message: "Model erfolgreich eingecheckt."
      };
    });
  }

  async submitReview(modelId: string, comment?: string, reviewerUserId?: string, approverUserId?: string): Promise<ModelActionResponse> {
    const user = await this.resolveCurrentUser();
    const model = await this.getModelAggregate(modelId);
    const activeVersion = model.versions[0]!;
    const activeLock = model.checkoutLocks[0];

    if (activeVersion.status !== "draft") {
      throw new BadRequestException("Only draft versions can be submitted for review");
    }

    if (!activeLock || activeLock.lockedByUserId !== user.id) {
      throw new ForbiddenException("Model must be checked out by the current user before review submission");
    }

    if (activeVersion.approvalRequests.some((request: (typeof activeVersion.approvalRequests)[number]) => request.status === "pending" || request.status === "in_review")) {
      throw new BadRequestException("An active review already exists for this model version");
    }

    let normalizedReviewerUserId = reviewerUserId?.trim() || undefined;
    let normalizedApproverUserId = approverUserId?.trim() || undefined;

    if (!normalizedReviewerUserId || !normalizedApproverUserId) {
      const laneOrganizationIds = new Set(
        activeVersion.laneMappings
          .map((lane: (typeof activeVersion.laneMappings)[number]) => lane.organizationId)
          .filter((value: string | null | undefined): value is string => Boolean(value))
      );
      const laneRoleCodes = new Set(
        activeVersion.laneMappings
          .map((lane: (typeof activeVersion.laneMappings)[number]) => lane.roleCode?.trim())
          .filter((value: string | undefined): value is string => Boolean(value))
      );

      const routingRules = await (this.prisma as unknown as { approvalRoutingRule: any }).approvalRoutingRule.findMany({
        where: {
          isActive: true,
          OR: [{ processId: model.processId }, { processId: null }]
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
      });

      const scoredRules = routingRules
        .map((rule: any) => {
          if (rule.organizationId && !laneOrganizationIds.has(rule.organizationId)) {
            return null;
          }
          if (rule.roleCode && !laneRoleCodes.has(rule.roleCode)) {
            return null;
          }

          const processScore = rule.processId && model.processId && rule.processId === model.processId ? 1000 : 0;
          const organizationScore = rule.organizationId ? 200 : 0;
          const roleScore = rule.roleCode ? 100 : 0;
          const score = processScore + organizationScore + roleScore + rule.priority;

          return {
            rule,
            score
          };
        })
        .filter((item: { rule: any; score: number } | null): item is { rule: any; score: number } => Boolean(item))
        .sort((left: { score: number }, right: { score: number }) => right.score - left.score);

      const bestRule = scoredRules[0]?.rule;

      if (bestRule) {
        normalizedReviewerUserId = normalizedReviewerUserId ?? bestRule.reviewerUserId;
        normalizedApproverUserId = normalizedApproverUserId ?? bestRule.approverUserId;
      }
    }

    if (normalizedReviewerUserId === user.id || normalizedApproverUserId === user.id) {
      throw new BadRequestException("Requester cannot be assigned as reviewer or approver");
    }

    if (normalizedReviewerUserId && normalizedApproverUserId && normalizedReviewerUserId === normalizedApproverUserId) {
      throw new BadRequestException("Reviewer and approver must differ");
    }

    if (normalizedReviewerUserId || normalizedApproverUserId) {
      const candidates = [normalizedReviewerUserId, normalizedApproverUserId].filter(Boolean) as string[];
      const assignedUsers = await this.prisma.user.findMany({
        where: {
          id: {
            in: candidates
          }
        }
      });

      if (assignedUsers.length !== new Set(candidates).size) {
        throw new BadRequestException("Assigned reviewer or approver could not be found");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.modelVersion.update({
        where: { id: activeVersion.id },
        data: {
          status: "in_review",
          changeNote: comment ?? activeVersion.changeNote
        }
      });

      const request = await tx.approvalRequest.create({
        data: {
          modelVersionId: activeVersion.id,
          requestedById: user.id,
          status: "in_review",
          approvalSteps: {
            create: [
              {
                sequence: 1,
                stepType: "review",
                status: "in_review",
                reviewerRoleCode: normalizedReviewerUserId ? `user:${normalizedReviewerUserId}` : "reviewer",
                dueAt: addDays(now, 2)
              },
              {
                sequence: 2,
                stepType: "approval",
                status: "pending",
                approverRoleCode: normalizedApproverUserId ? `user:${normalizedApproverUserId}` : "approver",
                dueAt: addDays(now, 4)
              }
            ]
          }
        }
      });

      const auditEvent = await tx.auditEvent.create({
        data: {
          actorUserId: user.id,
          actorDisplayName: user.displayName,
          eventType: "model.review_submitted",
          aggregateType: "approval_request",
          aggregateId: request.id,
          summary: `Review for model ${model.name} submitted`
        }
      });

      return {
        model: this.toModelDetail(await this.loadModelAggregateTx(tx, modelId)),
        auditEventId: auditEvent.id,
        message: "Review wurde eingereicht."
      };
    });
  }

  async publish(modelId: string, comment?: string): Promise<ModelActionResponse> {
    const user = await this.resolveCurrentUser();
    const model = await this.getModelAggregate(modelId);
    const latestVersion = model.versions[0]!;

    if (latestVersion.status !== "approved") {
      throw new BadRequestException("Only approved versions can be published");
    }

    return this.prisma.$transaction(async (tx) => {
      if (model.publishedVersionId && model.publishedVersionId !== latestVersion.id) {
        await tx.modelVersion.update({
          where: { id: model.publishedVersionId },
          data: {
            status: "archived"
          }
        });
      }

      await tx.modelVersion.update({
        where: { id: latestVersion.id },
        data: {
          status: "published",
          publishedAt: new Date(),
          changeNote: comment ?? latestVersion.changeNote
        }
      });

      await tx.bpmnModel.update({
        where: { id: modelId },
        data: {
          publishedVersionId: latestVersion.id
        }
      });

      const auditEvent = await tx.auditEvent.create({
        data: {
          actorUserId: user.id,
          actorDisplayName: user.displayName,
          eventType: "model.published",
          aggregateType: "model_version",
          aggregateId: latestVersion.id,
          summary: `Model ${model.name} published`
        }
      });

      return {
        model: this.toModelDetail(await this.loadModelAggregateTx(tx, modelId)),
        auditEventId: auditEvent.id,
        message: "Version wurde veroeffentlicht."
      };
    });
  }

  async createComment(modelId: string, input: CreateCommentDto): Promise<CommentListResponse> {
    const user = await this.resolveCurrentUser();
    const latestVersion = await this.prisma.modelVersion.findFirst({
      where: {
        modelId
      },
      orderBy: [{ versionMajor: "desc" }, { versionMinor: "desc" }, { versionPatch: "desc" }]
    });

    if (!latestVersion) {
      throw new NotFoundException(`Model ${modelId} was not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.comment.create({
        data: {
          modelVersionId: latestVersion.id,
          authorId: user.id,
          content: input.content,
          ...(input.bpmnElementId ? { bpmnElementId: input.bpmnElementId } : {})
        }
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: user.id,
          actorDisplayName: user.displayName,
          eventType: "model.comment_added",
          aggregateType: "model_version",
          aggregateId: latestVersion.id,
          summary: `Comment added to model version ${latestVersion.versionLabel}`
        }
      });
    });

    return this.getComments(modelId);
  }

  private async resolveCurrentUser() {
    const profile = this.identityService.getProfile();
    const identitySelectors = [];

    if (profile.email) {
      identitySelectors.push({ email: profile.email.toLowerCase() });
    }

    if (profile.subject) {
      identitySelectors.push({ externalSubject: profile.subject });
    }

    const user =
      (identitySelectors.length
        ? await this.prisma.user.findFirst({
            where: {
              OR: identitySelectors
            }
          })
        : null) ??
      (await this.prisma.user.findFirst({
        orderBy: {
          createdAt: "asc"
        }
      }));

    if (!user) {
      throw new NotFoundException("Current user could not be resolved");
    }

    return user;
  }

  private async getModelAggregate(modelId: string) {
    const model = await this.loadModelAggregateTx(this.prisma, modelId);
    if (!model || model.versions.length === 0) {
      throw new NotFoundException(`Model ${modelId} was not found`);
    }
    return model;
  }

  private async loadModelAggregateTx(tx: any, modelId: string) {
    return tx.bpmnModel.findUnique({
      where: { id: modelId },
      include: {
        checkoutLocks: {
          where: { status: "active" },
          include: { lockedByUser: true },
          orderBy: { acquiredAt: "desc" },
          take: 1
        },
        versions: {
          include: {
            approvalRequests: {
              include: {
                requestedBy: true,
                approvalSteps: true
              },
              orderBy: {
                requestedAt: "desc"
              }
            },
            diagramAssets: {
              where: {
                assetType: "bpmn_xml"
              },
              orderBy: {
                createdAt: "desc"
              },
              take: 1
            },
            laneMappings: true
          },
          orderBy: [{ versionMajor: "desc" }, { versionMinor: "desc" }, { versionPatch: "desc" }]
        }
      }
    });
  }

  private extractBpmnElements(xml: string) {
    if (!xml) {
      return new Map<string, { type: string; name?: string }>();
    }

    const regex =
      /<bpmn:(startEvent|endEvent|task|userTask|serviceTask|scriptTask|manualTask|businessRuleTask|exclusiveGateway|parallelGateway|inclusiveGateway|eventBasedGateway|subProcess|callActivity|sequenceFlow|messageFlow|lane|participant)\b([^>]*)>/g;
    const elements = new Map<string, { type: string; name?: string }>();

    let match: RegExpExecArray | null = regex.exec(xml);
    while (match) {
      const type = match[1] ?? "unknown";
      const attrs = match[2] ?? "";
      const idMatch = /\bid="([^"]+)"/.exec(attrs);
      const nameMatch = /\bname="([^"]*)"/.exec(attrs);
      const id = idMatch?.[1];
      if (id) {
        elements.set(id, {
          type,
          ...(nameMatch?.[1] ? { name: nameMatch[1] } : {})
        });
      }
      match = regex.exec(xml);
    }

    return elements;
  }

  private extractFlowElements(xml: string) {
    if (!xml) {
      return new Map<string, { type: string; name?: string; sourceRef?: string; targetRef?: string }>();
    }

    const regex = /<bpmn:(sequenceFlow|messageFlow)\b([^>]*)\/?>/g;
    const flows = new Map<string, { type: string; name?: string; sourceRef?: string; targetRef?: string }>();

    let match: RegExpExecArray | null = regex.exec(xml);
    while (match) {
      const type = match[1] ?? "unknown";
      const attrs = match[2] ?? "";
      const idMatch = /\bid="([^"]+)"/.exec(attrs);
      const nameMatch = /\bname="([^"]*)"/.exec(attrs);
      const sourceRefMatch = /\bsourceRef="([^"]+)"/.exec(attrs);
      const targetRefMatch = /\btargetRef="([^"]+)"/.exec(attrs);
      const id = idMatch?.[1];

      if (id) {
        flows.set(id, {
          type,
          ...(nameMatch?.[1] ? { name: nameMatch[1] } : {}),
          ...(sourceRefMatch?.[1] ? { sourceRef: sourceRefMatch[1] } : {}),
          ...(targetRefMatch?.[1] ? { targetRef: targetRefMatch[1] } : {})
        });
      }

      match = regex.exec(xml);
    }

    return flows;
  }

  private toModelDetail(model: Awaited<ReturnType<ProcessModelingService["loadModelAggregateTx"]>>): ModelDetailResponse {
    if (!model || model.versions.length === 0) {
      throw new NotFoundException("Model aggregate is incomplete");
    }

    const latestVersion = model.versions[0]!;
    const activeLock = model.checkoutLocks[0];
    const latestApprovalRequest = latestVersion.approvalRequests[0];

    return {
      id: model.id,
      name: model.name,
      latestVersion: this.toModelVersionPayload(
        latestVersion.id,
        latestVersion.versionLabel,
        latestVersion.status,
        latestVersion.changeNote,
        latestVersion.diagramAssets[0]?.storageKey ?? ""
      ),
      ...(activeLock
        ? {
            activeLock: {
              id: activeLock.id,
              status: activeLock.status as LockStatus,
              lockedById: activeLock.lockedByUserId,
              lockedBy: activeLock.lockedByUser.displayName,
              ...(activeLock.reason ? { reason: activeLock.reason } : {}),
              acquiredAt: activeLock.acquiredAt.toISOString()
            }
          }
        : {}),
      ...(latestApprovalRequest
        ? {
            activeReview: {
              id: latestApprovalRequest.id,
              status: latestApprovalRequest.status as ApprovalStatus,
              requestedAt: latestApprovalRequest.requestedAt.toISOString(),
              requestedBy: latestApprovalRequest.requestedBy.displayName,
              requestedById: latestApprovalRequest.requestedById
            }
          }
        : {}),
      ...(model.publishedVersionId ? { publishedVersionId: model.publishedVersionId } : {})
    };
  }

  private toModelVersionPayload(id: string, versionLabel: string, status: string, changeNote: string, xml: string): ModelDetailResponse["latestVersion"] {
    return {
      id,
      versionLabel,
      status: status as ModelVersionStatus,
      changeNote,
      xml
    };
  }
}
