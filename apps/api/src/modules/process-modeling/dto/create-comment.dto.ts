import { IsOptional, IsString } from "class-validator";

export class CreateCommentDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  bpmnElementId?: string;
}
