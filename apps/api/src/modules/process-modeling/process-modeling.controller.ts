import { Body, Controller, Get, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { ProcessModelingService } from "./process-modeling.service";
import { ModelActionDto } from "./dto/model-action.dto";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateModelDraftDto } from "./dto/update-model-draft.dto";

@Controller("models")
export class ProcessModelingController {
  constructor(@Inject(ProcessModelingService) private readonly processModelingService: ProcessModelingService) {}

  @Get(":id")
  getModel(@Param("id") id: string) {
    return this.processModelingService.getModel(id);
  }

  @Get(":id/versions")
  getVersions(@Param("id") id: string) {
    return this.processModelingService.getVersions(id);
  }

  @Get(":id/versions/compare")
  compareVersions(@Param("id") id: string, @Query("leftVersionId") leftVersionId?: string, @Query("rightVersionId") rightVersionId?: string) {
    return this.processModelingService.compareVersions(id, leftVersionId, rightVersionId);
  }

  @Get(":id/lanes")
  getLanes(@Param("id") id: string) {
    return this.processModelingService.getLaneMappings(id);
  }

  @Get(":id/comments")
  getComments(@Param("id") id: string) {
    return this.processModelingService.getComments(id);
  }

  @Put(":id/draft")
  updateDraft(@Param("id") id: string, @Body() body: UpdateModelDraftDto) {
    return this.processModelingService.updateDraft(id, body);
  }

  @Put(":id/checkout")
  checkout(@Param("id") id: string, @Body() body: ModelActionDto) {
    return this.processModelingService.checkout(id, body.comment);
  }

  @Put(":id/checkin")
  checkin(@Param("id") id: string, @Body() body: ModelActionDto) {
    return this.processModelingService.checkin(id, body.comment);
  }

  @Put(":id/submit-review")
  submitReview(@Param("id") id: string, @Body() body: ModelActionDto) {
    return this.processModelingService.submitReview(id, body.comment, body.reviewerUserId, body.approverUserId);
  }

  @Put(":id/publish")
  publish(@Param("id") id: string, @Body() body: ModelActionDto) {
    return this.processModelingService.publish(id, body.comment);
  }

  @Post(":id/comments")
  createComment(@Param("id") id: string, @Body() body: CreateCommentDto) {
    return this.processModelingService.createComment(id, body);
  }
}
