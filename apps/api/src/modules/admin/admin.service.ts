import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../shared/prisma.service";
import { UpsertReviewRoutingRuleDto } from "./dto/upsert-review-routing-rule.dto";

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private get approvalRoutingRuleModel() {
    return (this.prisma as unknown as { approvalRoutingRule: any }).approvalRoutingRule;
  }

  async getReviewRoutingRules() {
    const rules = await this.approvalRoutingRuleModel.findMany({
      include: {
        process: true,
        organization: true,
        reviewerUser: true,
        approverUser: true
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
    });

    return rules.map((rule: any) => ({
      id: rule.id,
      name: rule.name,
      isActive: rule.isActive,
      priority: rule.priority,
      ...(rule.processId ? { processId: rule.processId } : {}),
      ...(rule.process ? { processName: `${rule.process.businessId} ${rule.process.name}` } : {}),
      ...(rule.organizationId ? { organizationId: rule.organizationId } : {}),
      ...(rule.organization ? { organizationName: `${rule.organization.code} ${rule.organization.name}` } : {}),
      ...(rule.roleCode ? { roleCode: rule.roleCode } : {}),
      reviewerUserId: rule.reviewerUserId,
      reviewerDisplayName: rule.reviewerUser.displayName,
      approverUserId: rule.approverUserId,
      approverDisplayName: rule.approverUser.displayName,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString()
    }));
  }

  async getModelOptions(query: string, limit: number) {
    const normalizedQuery = query.trim();
    const where: Prisma.BpmnModelWhereInput | undefined = normalizedQuery
      ? {
          OR: [
            {
              id: {
                contains: normalizedQuery,
                mode: "insensitive"
              }
            },
            {
              name: {
                contains: normalizedQuery,
                mode: "insensitive"
              }
            },
            {
              process: {
                is: {
                  OR: [
                    {
                      businessId: {
                        contains: normalizedQuery,
                        mode: "insensitive"
                      }
                    },
                    {
                      name: {
                        contains: normalizedQuery,
                        mode: "insensitive"
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      : undefined;

    const models = await this.prisma.bpmnModel.findMany({
      include: {
        process: true
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: Math.min(Math.max(limit, 1), 100),
      ...(where ? { where } : {})
    });

    return {
      total: models.length,
      items: models.map((model) => ({
        id: model.id,
        code: model.process ? model.process.businessId : "MODEL",
        name: model.process ? `${model.process.name} - ${model.name}` : model.name
      }))
    };
  }

  async previewRoutingForModel(modelId: string) {
    const model = await this.prisma.bpmnModel.findUnique({
      where: {
        id: modelId
      },
      include: {
        versions: {
          orderBy: [{ versionMajor: "desc" }, { versionMinor: "desc" }, { versionPatch: "desc" }],
          take: 1,
          include: {
            laneMappings: true
          }
        }
      }
    });

    if (!model || model.versions.length === 0) {
      throw new NotFoundException("Model was not found");
    }

    const latestVersion = model.versions[0]!;
    const laneOrganizationIds = new Set(
      latestVersion.laneMappings
        .map((lane) => lane.organizationId)
        .filter((value: string | null | undefined): value is string => Boolean(value))
    );
    const laneRoleCodes = new Set(
      latestVersion.laneMappings
        .map((lane) => lane.roleCode?.trim())
        .filter((value: string | undefined): value is string => Boolean(value))
    );

    const rules = await this.approvalRoutingRuleModel.findMany({
      where: {
        isActive: true,
        OR: [{ processId: model.processId }, { processId: null }]
      },
      include: {
        reviewerUser: true,
        approverUser: true,
        process: true,
        organization: true
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
    });

    const ranked = rules
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
          id: rule.id,
          name: rule.name,
          score,
          priority: rule.priority,
          reviewerDisplayName: rule.reviewerUser.displayName,
          approverDisplayName: rule.approverUser.displayName,
          ...(rule.process ? { processName: `${rule.process.businessId} ${rule.process.name}` } : {}),
          ...(rule.organization ? { organizationName: `${rule.organization.code} ${rule.organization.name}` } : {}),
          ...(rule.roleCode ? { roleCode: rule.roleCode } : {})
        };
      })
      .filter((item: { id: string; score: number } | null): item is { id: string; score: number } => Boolean(item))
      .sort((left: { score: number }, right: { score: number }) => right.score - left.score);

    const selected = ranked[0];

    return {
      modelId,
      modelName: model.name,
      latestVersionId: latestVersion.id,
      laneContext: {
        organizationIds: [...laneOrganizationIds],
        roleCodes: [...laneRoleCodes]
      },
      ...(selected ? { selectedRuleId: selected.id } : {}),
      ...(selected ? { selectedRuleName: selected.name } : {}),
      ...(selected ? { reviewerDisplayName: selected.reviewerDisplayName } : {}),
      ...(selected ? { approverDisplayName: selected.approverDisplayName } : {}),
      evaluatedRules: ranked.slice(0, 10)
    };
  }

  async createReviewRoutingRule(input: UpsertReviewRoutingRuleDto) {
    if (input.reviewerUserId === input.approverUserId) {
      throw new BadRequestException("Reviewer and approver must differ");
    }

    if (input.processId) {
      const process = await this.prisma.process.findUnique({
        where: {
          id: input.processId
        }
      });
      if (!process) {
        throw new NotFoundException("Process was not found");
      }
    }

    if (input.organizationId) {
      const organization = await this.prisma.organization.findUnique({
        where: {
          id: input.organizationId
        }
      });
      if (!organization) {
        throw new NotFoundException("Organization was not found");
      }
    }

    const [reviewer, approver] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: input.reviewerUserId } }),
      this.prisma.user.findUnique({ where: { id: input.approverUserId } })
    ]);

    if (!reviewer || !approver) {
      throw new NotFoundException("Reviewer or approver user was not found");
    }

    await this.approvalRoutingRuleModel.create({
      data: {
        name: input.name,
        isActive: input.isActive ?? true,
        priority: input.priority ?? 100,
        processId: input.processId ?? null,
        organizationId: input.organizationId ?? null,
        roleCode: input.roleCode?.trim() || null,
        reviewerUserId: input.reviewerUserId,
        approverUserId: input.approverUserId
      }
    });

    return this.getReviewRoutingRules();
  }

  async updateReviewRoutingRule(ruleId: string, input: UpsertReviewRoutingRuleDto) {
    const existing = await this.approvalRoutingRuleModel.findUnique({
      where: {
        id: ruleId
      }
    });

    if (!existing) {
      throw new NotFoundException("Routing rule was not found");
    }

    if (input.reviewerUserId === input.approverUserId) {
      throw new BadRequestException("Reviewer and approver must differ");
    }

    if (input.processId) {
      const process = await this.prisma.process.findUnique({
        where: {
          id: input.processId
        }
      });
      if (!process) {
        throw new NotFoundException("Process was not found");
      }
    }

    if (input.organizationId) {
      const organization = await this.prisma.organization.findUnique({
        where: {
          id: input.organizationId
        }
      });
      if (!organization) {
        throw new NotFoundException("Organization was not found");
      }
    }

    const [reviewer, approver] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: input.reviewerUserId } }),
      this.prisma.user.findUnique({ where: { id: input.approverUserId } })
    ]);

    if (!reviewer || !approver) {
      throw new NotFoundException("Reviewer or approver user was not found");
    }

    await this.approvalRoutingRuleModel.update({
      where: {
        id: ruleId
      },
      data: {
        name: input.name,
        isActive: input.isActive ?? true,
        priority: input.priority ?? 100,
        processId: input.processId ?? null,
        organizationId: input.organizationId ?? null,
        roleCode: input.roleCode?.trim() || null,
        reviewerUserId: input.reviewerUserId,
        approverUserId: input.approverUserId
      }
    });

    return this.getReviewRoutingRules();
  }
}
