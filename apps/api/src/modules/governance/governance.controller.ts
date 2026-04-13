import { Body, Controller, Get, Inject, Param, Put } from "@nestjs/common";
import { GovernanceService } from "./governance.service";
import { ReviewDecisionDto } from "./dto/review-decision.dto";

@Controller("governance")
export class GovernanceController {
  constructor(@Inject(GovernanceService) private readonly governanceService: GovernanceService) {}

  @Get("reviews")
  getReviewQueue() {
    return this.governanceService.getQueue();
  }

  @Get("my-reviews")
  getMyReviewQueue() {
    return this.governanceService.getMyQueue();
  }

  @Get("reviews/:id")
  getReviewDetail(@Param("id") id: string) {
    return this.governanceService.getReviewDetail(id);
  }

  @Get("policies")
  getPolicies() {
    return this.governanceService.getPolicies();
  }

  @Put("reviews/:id/approve")
  approve(@Param("id") id: string, @Body() body: ReviewDecisionDto) {
    return this.governanceService.approveReview(id, body.comment);
  }

  @Put("reviews/:id/return")
  returnForRevision(@Param("id") id: string, @Body() body: ReviewDecisionDto) {
    return this.governanceService.returnReview(id, body.comment);
  }
}
