import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { BpmnModel, ModelVersion, Process, ProcessCategory, ProcessGroup, ProcessRoleAssignment, User } from "@prisma/client";
import type { CreateProcessModelInput, CreateProcessModelResponse, ProcessDetailResponse, ProcessRepositoryResponse } from "@prozessschmiede/types";
import { IdentityService } from "../identity/identity.service";
import { PrismaService } from "../shared/prisma.service";

type ProcessWithRelations = Process & {
  category: ProcessCategory;
  group: ProcessGroup;
  roleAssignments: Array<ProcessRoleAssignment & { user: User }>;
  models: Array<
    BpmnModel & {
      checkoutLocks: Array<{ lockedByUser: User }>;
      versions: ModelVersion[];
    }
  >;
};

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

@Injectable()
export class ProcessCatalogService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdentityService) private readonly identityService: IdentityService
  ) {}

  async findAll(): Promise<ProcessRepositoryResponse> {
    const items = await this.prisma.process.findMany({
      include: {
        category: true,
        group: true,
        roleAssignments: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return {
      total: items.length,
      items: items.map((process) => ({
        id: process.id,
        businessId: process.businessId,
        name: process.name,
        description: process.description,
        categoryName: process.category.name,
        groupName: process.group.name,
        status: process.status,
        ownerName:
          process.roleAssignments.find((assignment) => assignment.roleCode === "process_owner")?.user.displayName ?? "n/a",
        updatedAt: process.updatedAt.toISOString()
      }))
    };
  }

  async findById(id: string): Promise<ProcessDetailResponse> {
    const process = await this.prisma.process.findUnique({
      where: { id },
      include: {
        category: true,
        group: true,
        roleAssignments: {
          include: {
            user: true
          }
        },
        models: {
          include: {
            checkoutLocks: {
              where: {
                status: "active"
              },
              include: {
                lockedByUser: true
              },
              orderBy: {
                acquiredAt: "desc"
              },
              take: 1
            },
            versions: {
              orderBy: [
                { versionMajor: "desc" },
                { versionMinor: "desc" },
                { versionPatch: "desc" }
              ]
            }
          }
        }
      }
    });

    if (!process) {
      throw new NotFoundException(`Process ${id} was not found`);
    }

    const latestVersions = process.models.flatMap((model) => model.versions);
    const modelVersionIds = latestVersions.map((version) => version.id);

    const laneMappings = modelVersionIds.length
      ? await this.prisma.laneMapping.findMany({
          where: {
            modelVersionId: {
              in: modelVersionIds
            }
          },
          orderBy: [{ laneNameSnapshot: "asc" }]
        })
      : [];

    return {
      process: this.toProcessSummary(process),
      models: process.models.map((model) => ({
        id: model.id,
        parentType: "process" as const,
        parentId: process.id,
        name: model.name,
        ...(model.checkoutLocks[0]?.lockedByUser.displayName
          ? { activeLockOwner: model.checkoutLocks[0].lockedByUser.displayName }
          : {}),
        ...(model.publishedVersionId ? { publishedVersionId: model.publishedVersionId } : {})
      })),
      laneMappings: laneMappings.map((lane) => ({
        id: lane.id,
        bpmnElementId: lane.bpmnElementId,
        laneNameSnapshot: lane.laneNameSnapshot,
        ...(lane.organizationId ? { organizationId: lane.organizationId } : {}),
        ...(lane.roleCode ? { roleCode: lane.roleCode } : {}),
        ...(lane.applicationId ? { applicationId: lane.applicationId } : {}),
        mappingSource: lane.mappingSource as "manual" | "imported" | "synchronized"
      })),
      versionTimeline: latestVersions
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
        .map((version) => ({
          id: version.id,
          modelId: version.modelId,
          versionLabel: version.versionLabel,
          status: version.status,
          changeNote: version.changeNote,
          updatedAt: version.updatedAt.toISOString(),
          updatedBy: "n/a"
        }))
    };
  }

  async createModel(processId: string, input: CreateProcessModelInput): Promise<CreateProcessModelResponse> {
    const process = await this.prisma.process.findUnique({
      where: { id: processId }
    });

    if (!process) {
      throw new NotFoundException(`Process ${processId} was not found`);
    }

    const user = await this.resolveCurrentUser();

    return this.prisma.$transaction(async (tx) => {
      const model = await tx.bpmnModel.create({
        data: {
          processId,
          name: input.name.trim(),
          modelType: "bpmn"
        }
      });

      const version = await tx.modelVersion.create({
        data: {
          modelId: model.id,
          versionMajor: 1,
          versionMinor: 0,
          versionPatch: 0,
          versionLabel: "1.0.0",
          status: "draft",
          changeNote: "Initiale Modellversion",
          updatedById: user.id
        }
      });

      await tx.diagramAsset.create({
        data: {
          modelVersionId: version.id,
          assetType: "bpmn_xml",
          storageKey: defaultBpmnXml
        }
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: user.id,
          actorDisplayName: user.displayName,
          eventType: "model.created",
          aggregateType: "model",
          aggregateId: model.id,
          summary: `Model ${model.name} created for process ${process.businessId}`
        }
      });

      return {
        processId,
        modelId: model.id,
        modelName: model.name,
        versionId: version.id,
        workspaceHref: `/processes/${processId}/models/${model.id}`
      };
    });
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

  private toProcessSummary(process: ProcessWithRelations) {
    return {
      id: process.id,
      businessId: process.businessId,
      name: process.name,
      description: process.description,
      categoryName: process.category.name,
      groupName: process.group.name,
      status: process.status,
      ownerName:
        process.roleAssignments.find((assignment) => assignment.roleCode === "process_owner")?.user.displayName ?? "n/a",
      updatedAt: process.updatedAt.toISOString()
    };
  }
}
