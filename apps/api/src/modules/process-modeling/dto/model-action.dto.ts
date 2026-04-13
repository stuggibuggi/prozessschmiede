import { IsOptional, IsString } from "class-validator";

export class ModelActionDto {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  reviewerUserId?: string;

  @IsOptional()
  @IsString()
  approverUserId?: string;
}
