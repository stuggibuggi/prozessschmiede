import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { DashboardResponse } from "@prozessschmiede/types";
import { IdentityService } from "../identity/identity.service";
import { PrismaService } from "../shared/prisma.service";

@Injectable()
export class DashboardService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdentityService) private readonly identityService: IdentityService
  ) {}

  async getDashboard(): Promise<DashboardResponse> {
    const profile = this.identityService.getProfile();
    const identitySelectors: Prisma.UserWhereInput[] = [];

    if (profile.email) {
      identitySelectors.push({ email: profile.email.toLowerCase() });
    }

    if (profile.subject) {
      identitySelectors.push({ externalSubject: profile.subject });
    }

    const currentUser =
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
    const canReview = profile.groups.includes("BPMN_REVIEWERS");
    const canApprove = profile.groups.includes("BPMN_APPROVERS");

    const myProcesses = await this.prisma.process.findMany({
      take: 6,
      orderBy: {
        updatedAt: "desc"
      },
      include: {
        category: true,
        group: true,
        roleAssignments: {
          include: {
            user: true
          }
        }
      }
    });

    const openReviewCandidates = await this.prisma.approvalRequest.findMany({
      orderBy: {
        requestedAt: "desc"
      },
      where: {
        status: {
          in: ["pending", "in_review"]
        }
      },
      include: {
        requestedBy: true,
        modelVersion: {
          include: {
            model: true
          }
        },
        approvalSteps: {
          orderBy: {
            sequence: "asc"
          },
          include: {
            decisions: {
              orderBy: {
                decidedAt: "desc"
              }
            }
          }
        }
      }
    });

    const myOpenReviews = openReviewCandidates
      .map((review) => {
        const activeStep = review.approvalSteps.find((step) => step.status === "in_review" || step.status === "pending");
        if (!activeStep || !currentUser) {
          return null;
        }

        const reviewerDecisionActorIds = review.approvalSteps
          .filter((step) => step.stepType === "review")
          .flatMap((step) => step.decisions)
          .filter((decision) => decision.decision === "approved")
          .map((decision) => decision.actorUserId);

        const isEligibleForStep = this.canUserActOnStep(
          {
            stepType: activeStep.stepType,
            reviewerRoleCode: activeStep.reviewerRoleCode,
            approverRoleCode: activeStep.approverRoleCode
          },
          currentUser.id,
          review.requestedById,
          reviewerDecisionActorIds,
          canReview,
          canApprove
        );

        if (!isEligibleForStep) {
          return null;
        }

        const assignedUserId = this.getAssignedUserId(activeStep.stepType, activeStep.reviewerRoleCode, activeStep.approverRoleCode);

        return {
          id: review.id,
          modelVersionId: review.modelVersionId,
          modelName: review.modelVersion.model.name,
          status: review.status,
          requestedAt: review.requestedAt.toISOString(),
          requestedBy: review.requestedBy.displayName,
          requestedById: review.requestedById,
          currentStep: activeStep.stepType,
          ...(activeStep.dueAt ? { currentStepDueAt: activeStep.dueAt.toISOString() } : {}),
          ...(assignedUserId ? { currentAssigneeUserId: assignedUserId } : {})
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 6);

    const recentlyChangedModels = await this.prisma.modelVersion.findMany({
      take: 8,
      orderBy: {
        updatedAt: "desc"
      },
      include: {
        updatedBy: true
      }
    });

    return {
      currentUser: {
        id: currentUser?.id ?? "unknown",
        displayName: currentUser?.displayName ?? profile.displayName,
        email: currentUser?.email ?? profile.email,
        locale: currentUser?.locale ?? "de-DE"
      },
      myProcesses: myProcesses.map((process) => ({
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
      })),
      myOpenReviews: myOpenReviews.map((review) => ({
        id: review.id,
        modelVersionId: review.modelVersionId,
        modelName: review.modelName,
        status: review.status,
        requestedAt: review.requestedAt,
        requestedBy: review.requestedBy,
        ...(review.requestedById ? { requestedById: review.requestedById } : {}),
        ...(review.currentStep ? { currentStep: review.currentStep } : {}),
        ...(review.currentStepDueAt ? { currentStepDueAt: review.currentStepDueAt } : {})
      })),
      recentlyChangedModels: recentlyChangedModels.map((version) => ({
        id: version.id,
        modelId: version.modelId,
        versionLabel: version.versionLabel,
        status: version.status,
        changeNote: version.changeNote,
        updatedAt: version.updatedAt.toISOString(),
        updatedBy: version.updatedBy.displayName
      }))
    };
  }

  private getAssignedUserId(stepType: string, reviewerRoleCode?: string | null, approverRoleCode?: string | null) {
    const code = stepType === "review" ? reviewerRoleCode : approverRoleCode;
    if (!code || !code.startsWith("user:")) {
      return undefined;
    }
    return code.slice("user:".length) || undefined;
  }

  private canUserActOnStep(
    step: { stepType: string; reviewerRoleCode?: string | null; approverRoleCode?: string | null },
    userId: string,
    requestedById: string,
    reviewerDecisionActorIds: string[],
    canReview: boolean,
    canApprove: boolean
  ) {
    if (requestedById === userId) {
      return false;
    }

    const assignedUserId = this.getAssignedUserId(step.stepType, step.reviewerRoleCode, step.approverRoleCode);
    if (assignedUserId) {
      if (assignedUserId !== userId) {
        return false;
      }
      if (step.stepType === "approval" && reviewerDecisionActorIds.includes(userId)) {
        return false;
      }
      return true;
    }

    if (step.stepType === "review") {
      return canReview;
    }

    if (step.stepType === "approval") {
      return canApprove && !reviewerDecisionActorIds.includes(userId);
    }

    return false;
  }
}
