import { Body, Controller, Get, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { UpsertReviewRoutingRuleDto } from "./dto/upsert-review-routing-rule.dto";

@Controller("admin")
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Get("review-routing-rules")
  getReviewRoutingRules() {
    return this.adminService.getReviewRoutingRules();
  }

  @Get("model-options")
  getModelOptions(@Query("q") query = "", @Query("limit") limit = "25") {
    return this.adminService.getModelOptions(query, Number(limit));
  }

  @Get("review-routing-rules/preview")
  previewReviewRouting(@Query("modelId") modelId = "") {
    return this.adminService.previewRoutingForModel(modelId);
  }

  @Post("review-routing-rules")
  createReviewRoutingRule(@Body() body: UpsertReviewRoutingRuleDto) {
    return this.adminService.createReviewRoutingRule(body);
  }

  @Put("review-routing-rules/:id")
  updateReviewRoutingRule(@Param("id") id: string, @Body() body: UpsertReviewRoutingRuleDto) {
    return this.adminService.updateReviewRoutingRule(id, body);
  }
}
