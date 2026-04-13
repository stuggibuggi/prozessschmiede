import { IsOptional, IsString } from "class-validator";

export class ReviewDecisionDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
