import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpsertReviewRoutingRuleDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsString()
  processId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  roleCode?: string;

  @IsString()
  reviewerUserId!: string;

  @IsString()
  approverUserId!: string;
}
