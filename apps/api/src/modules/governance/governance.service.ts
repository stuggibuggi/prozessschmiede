import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../shared/prisma.service";
import { IdentityService } from "../identity/identity.service";

@Injectable()
export class GovernanceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdentityService) private readonly identityService: IdentityService
  ) {}

  async getQueue() {
    const now = new Date();
    const requests = await this.prisma.approvalRequest.findMany({
      orderBy: {
        requestedAt: "desc"
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
          }
        }
      }
    });

    const assigneeUserIds = new Set<string>();
    for (const request of requests) {
      const activeStep = request.approvalSteps.find((step) => step.status === "in_review" || step.status === "pending");
      if (!activeStep) {
        continue;
      }
      const assignedUserId = this.getAssignedUserId(activeStep.stepType, activeStep.reviewerRoleCode, activeStep.approverRoleCode);
      if (assignedUserId) {
        assigneeUserIds.add(assignedUserId);
      }
    }
    const assigneeUsers = assigneeUserIds.size
      ? await this.prisma.user.findMany({
          where: {
            id: {
              in: [...assigneeUserIds]
            }
          }
        })
      : [];
    const assigneeNameById = new Map(assigneeUsers.map((item) => [item.id, item.displayName]));

    return requests.map((request) => ({
      ...(() => {
        const activeStep = request.approvalSteps.find((step) => step.status === "in_review" || step.status === "pending");
        const assignedUserId = activeStep
          ? this.getAssignedUserId(activeStep.stepType, activeStep.reviewerRoleCode, activeStep.approverRoleCode)
          : undefined;
        return {
          currentStep: activeStep?.stepType ?? "approval",
          ...(activeStep?.dueAt ? { currentStepDueAt: activeStep.dueAt.toISOString() } : {}),
          ...(activeStep?.dueAt ? { isOverdue: activeStep.dueAt.getTime() < now.getTime() } : {}),
          ...(assignedUserId ? { currentAssigneeUserId: assignedUserId } : {}),
          ...(assignedUserId && assigneeNameById.get(assignedUserId)
            ? { currentAssigneeDisplayName: assigneeNameById.get(assignedUserId) }
            : {})
        };
      })(),
      id: request.id,
      modelVersionId: request.modelVersionId,
      modelName: request.modelVersion.model.name,
      status: request.status,
      requestedAt: request.requestedAt.toISOString(),
      requestedBy: request.requestedBy.displayName,
      requestedById: request.requestedById
    }));
  }

  async getMyQueue() {
    const profile = this.identityService.getProfile();
    const user = await this.resolveCurrentUser();
    const canReview = profile.groups.includes("BPMN_REVIEWERS");
    const canApprove = profile.groups.includes("BPMN_APPROVERS");
    const requests = await this.prisma.approvalRequest.findMany({
      where: {
        status: {
          in: ["pending", "in_review"]
        }
      },
      orderBy: {
        requestedAt: "desc"
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

    const now = new Date();
    const assigneeUserIds = new Set<string>();
    for (const request of requests) {
      const activeStep = request.approvalSteps.find((step) => step.status === "in_review" || step.status === "pending");
      if (!activeStep) {
        continue;
      }
      const assignedUserId = this.getAssignedUserId(activeStep.stepType, activeStep.reviewerRoleCode, activeStep.approverRoleCode);
      if (assignedUserId) {
        assigneeUserIds.add(assignedUserId);
      }
    }
    const assigneeUsers = assigneeUserIds.size
      ? await this.prisma.user.findMany({
          where: {
            id: {
              in: [...assigneeUserIds]
            }
          }
        })
      : [];
    const assigneeNameById = new Map(assigneeUsers.map((item) => [item.id, item.displayName]));

    return requests
      .map((request) => {
        const activeStep = request.approvalSteps.find((step) => step.status === "in_review" || step.status === "pending");
        if (!activeStep) {
          return null;
        }

        const reviewerDecisionActorIds = request.approvalSteps
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
          user.id,
          request.requestedById,
          reviewerDecisionActorIds,
          canReview,
          canApprove
        );

        if (!isEligibleForStep) {
          return null;
        }

        return {
          id: request.id,
          modelVersionId: request.modelVersionId,
          modelName: request.modelVersion.model.name,
          status: request.status,
          requestedAt: request.requestedAt.toISOString(),
          requestedBy: request.requestedBy.displayName,
          requestedById: request.requestedById,
          currentStep: activeStep.stepType,
          ...(activeStep.dueAt ? { currentStepDueAt: activeStep.dueAt.toISOString() } : {}),
          ...(activeStep.dueAt ? { isOverdue: activeStep.dueAt.getTime() < now.getTime() } : {}),
          ...(() => {
            const assignedUserId = this.getAssignedUserId(activeStep.stepType, activeStep.reviewerRoleCode, activeStep.approverRoleCode);
            return assignedUserId
              ? {
                  currentAssigneeUserId: assignedUserId,
                  ...(assigneeNameById.get(assignedUserId) ? { currentAssigneeDisplayName: assigneeNameById.get(assignedUserId) } : {})
                }
              : {};
          })()
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  async getReviewDetail(reviewId: string) {
    const review = await this.prisma.approvalRequest.findUnique({
      where: { id: reviewId },
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
              include: {
                actorUser: true
              },
              orderBy: {
                decidedAt: "desc"
              }
            }
          }
        }
      }
    });

    if (!review) {
      throw new NotFoundException("Review request was not found");
    }

    return {
      id: review.id,
      status: review.status,
      requestedAt: review.requestedAt.toISOString(),
      ...(review.completedAt ? { completedAt: review.completedAt.toISOString() } : {}),
      requestedBy: {
        id: review.requestedBy.id,
        displayName: review.requestedBy.displayName,
        email: review.requestedBy.email
      },
      modelVersion: {
        id: review.modelVersion.id,
        versionLabel: review.modelVersion.versionLabel,
        status: review.modelVersion.status,
        model: {
          id: review.modelVersion.model.id,
          name: review.modelVersion.model.name
        }
      },
      steps: review.approvalSteps.map((step) => ({
        id: step.id,
        sequence: step.sequence,
        stepType: step.stepType,
        status: step.status,
        ...(step.reviewerRoleCode ? { reviewerRoleCode: step.reviewerRoleCode } : {}),
        ...(step.approverRoleCode ? { approverRoleCode: step.approverRoleCode } : {}),
        decisions: step.decisions.map((decision) => ({
          id: decision.id,
          decision: decision.decision,
          ...(decision.comment ? { comment: decision.comment } : {}),
          decidedAt: decision.decidedAt.toISOString(),
          actor: {
            id: decision.actorUser.id,
            displayName: decision.actorUser.displayName,
            email: decision.actorUser.email
          }
        }))
      }))
    };
  }

  getPolicies() {
    return {
      fourEyesPrinciple: true,
      reviewerMustDifferFromApprover: true,
      publishedVersionImmutable: true
    };
  }

  async approveReview(reviewId: string, comment?: string) {
    const user = await this.resolveCurrentUser();
    const profile = this.identityService.getProfile();
    const review = await this.prisma.approvalRequest.findUnique({
      where: { id: reviewId },
      include: {
        requestedBy: true,
        approvalSteps: {
          include: {
            decisions: true
          },
          orderBy: {
            sequence: "asc"
          }
        },
        modelVersion: {
          include: {
            model: true
          }
        }
      }
    });

    if (!review) {
      throw new NotFoundException("Review request was not found");
    }

    if (review.requestedById === user.id) {
      throw new ForbiddenException("Reviewer and approver must differ");
    }

    if (!(review.status === "pending" || review.status === "in_review")) {
      throw new BadRequestException("Review request is not open");
    }

    const activeStep = review.approvalSteps.find((step) => step.status === "in_review" || step.status === "pending");
    if (!activeStep) {
      throw new BadRequestException("Review request has no active approval step");
    }

    const reviewerDecisionActorIds = review.approvalSteps
      .filter((step) => step.stepType === "review")
      .flatMap((step) => step.decisions)
      .filter((decision) => decision.decision === "approved")
      .map((decision) => decision.actorUserId);

    const canReview = profile.groups.includes("BPMN_REVIEWERS");
    const canApprove = profile.groups.includes("BPMN_APPROVERS");
    if (
      !this.canUserActOnStep(
        {
          stepType: activeStep.stepType,
          reviewerRoleCode: activeStep.reviewerRoleCode,
          approverRoleCode: activeStep.approverRoleCode
        },
        user.id,
        review.requestedById,
        reviewerDecisionActorIds,
        canReview,
        canApprove
      )
    ) {
      throw new ForbiddenException("Current user is not assigned or permitted for this review step");
    }

    return this.prisma.$transaction(async (tx) => {
      if (activeStep.status === "pending") {
        await tx.approvalStep.update({
          where: { id: activeStep.id },
          data: {
            status: "in_review"
          }
        });
      }

      if (activeStep.stepType === "approval") {
        const reviewStep = review.approvalSteps.find((step) => step.stepType === "review");
        const reviewerDecision = reviewStep?.decisions.find((decision) => decision.decision === "approved");
        if (reviewerDecision && reviewerDecision.actorUserId === user.id) {
          throw new ForbiddenException("Reviewer and approver must differ");
        }
      }

      await tx.approvalDecision.create({
        data: {
          approvalStepId: activeStep.id,
          actorUserId: user.id,
          decision: "approved",
          comment: comment ?? null
        }
      });

      await tx.approvalStep.update({
        where: { id: activeStep.id },
        data: {
          status: "approved"
        }
      });

      const nextStep = review.approvalSteps.find((step) => step.sequence > activeStep.sequence);

      if (nextStep) {
        await tx.approvalStep.update({
          where: { id: nextStep.id },
          data: {
            status: "in_review"
          }
        });
      } else {
        await tx.approvalRequest.update({
          where: { id: reviewId },
          data: {
            status: "approved",
            completedAt: new Date()
          }
        });

        await tx.modelVersion.update({
          where: { id: review.modelVersionId },
          data: {
            status: "approved"
          }
        });
      }

      const auditEvent = await tx.auditEvent.create({
        data: {
          actorUserId: user.id,
          actorDisplayName: user.displayName,
          eventType: nextStep ? "review.step_approved" : "review.approved",
          aggregateType: "approval_request",
          aggregateId: reviewId,
          summary: nextStep
            ? `Step ${activeStep.stepType} for model ${review.modelVersion.model.name} approved`
            : `Review for model ${review.modelVersion.model.name} approved`,
          payload: {
            create: {
              beforeJson: {
                reviewStatus: review.status,
                modelVersionStatus: review.modelVersion.status,
                stepType: activeStep.stepType
              },
              afterJson: {
                reviewStatus: nextStep ? "in_review" : "approved",
                modelVersionStatus: nextStep ? "in_review" : "approved",
                completedStep: activeStep.stepType,
                ...(nextStep ? { nextStep: nextStep.stepType } : {})
              },
              diffJson: {
                comment: comment ?? null
              }
            }
          }
        }
      });

      return {
        reviewId,
        status: nextStep ? "in_review" : "approved",
        auditEventId: auditEvent.id
      };
    });
  }

  async returnReview(reviewId: string, comment?: string) {
    const user = await this.resolveCurrentUser();
    const profile = this.identityService.getProfile();
    const normalizedComment = comment?.trim() ?? "";

    if (!normalizedComment) {
      throw new BadRequestException("A comment is required when returning a review");
    }

    const review = await this.prisma.approvalRequest.findUnique({
      where: { id: reviewId },
      include: {
        requestedBy: true,
        approvalSteps: {
          orderBy: {
            sequence: "asc"
          },
          include: {
            decisions: true
          }
        },
        modelVersion: {
          include: {
            model: true
          }
        }
      }
    });

    if (!review) {
      throw new NotFoundException("Review request was not found");
    }

    if (review.requestedById === user.id) {
      throw new ForbiddenException("Reviewer and approver must differ");
    }

    if (!(review.status === "pending" || review.status === "in_review")) {
      throw new BadRequestException("Review request is not open");
    }

    const activeStep = review.approvalSteps.find((step) => step.status === "in_review" || step.status === "pending");
    if (!activeStep) {
      throw new BadRequestException("Review request has no active approval step");
    }

    const reviewerDecisionActorIds = review.approvalSteps
      .filter((step) => step.stepType === "review")
      .flatMap((step) => step.decisions)
      .filter((decision) => decision.decision === "approved")
      .map((decision) => decision.actorUserId);

    const canReview = profile.groups.includes("BPMN_REVIEWERS");
    const canApprove = profile.groups.includes("BPMN_APPROVERS");
    if (
      !this.canUserActOnStep(
        {
          stepType: activeStep.stepType,
          reviewerRoleCode: activeStep.reviewerRoleCode,
          approverRoleCode: activeStep.approverRoleCode
        },
        user.id,
        review.requestedById,
        reviewerDecisionActorIds,
        canReview,
        canApprove
      )
    ) {
      throw new ForbiddenException("Current user is not assigned or permitted for this review step");
    }

    return this.prisma.$transaction(async (tx) => {
      if (activeStep.status === "pending") {
        await tx.approvalStep.update({
          where: { id: activeStep.id },
          data: {
            status: "in_review"
          }
        });
      }

      await tx.approvalDecision.create({
        data: {
          approvalStepId: activeStep.id,
          actorUserId: user.id,
          decision: "returned",
          comment: normalizedComment
        }
      });

      await tx.approvalStep.update({
        where: { id: activeStep.id },
        data: {
          status: "returned"
        }
      });

      await tx.approvalRequest.update({
        where: { id: reviewId },
        data: {
          status: "returned",
          completedAt: new Date()
        }
      });

      await tx.modelVersion.update({
        where: { id: review.modelVersionId },
        data: {
          status: "draft",
          changeNote: normalizedComment
        }
      });

      const auditEvent = await tx.auditEvent.create({
        data: {
          actorUserId: user.id,
          actorDisplayName: user.displayName,
          eventType: "review.returned",
          aggregateType: "approval_request",
          aggregateId: reviewId,
          summary: `Review for model ${review.modelVersion.model.name} returned for revision`,
          payload: {
            create: {
              beforeJson: {
                reviewStatus: review.status,
                modelVersionStatus: review.modelVersion.status
              },
              afterJson: {
                reviewStatus: "returned",
                modelVersionStatus: "draft"
              },
              diffJson: {
                comment: normalizedComment
              }
            }
          }
        }
      });

      return {
        reviewId,
        status: "returned",
        auditEventId: auditEvent.id
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
      // Local mock fallback: keeps /my-reviews usable without full IdP synchronization.
      (process.env.AUTH_MODE === "mock"
        ? await this.prisma.user.findFirst({
            orderBy: {
              createdAt: "asc"
            }
          })
        : null);

    if (!user) {
      throw new NotFoundException("Current user could not be resolved");
    }

    return user;
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
