import { Type } from "class-transformer";
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";

class LaneMappingDraftDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  bpmnElementId!: string;

  @IsString()
  laneNameSnapshot!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  roleCode?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsString()
  @IsIn(["manual", "imported", "synchronized"])
  mappingSource!: "manual" | "imported" | "synchronized";
}

export class UpdateModelDraftDto {
  @IsString()
  changeNote!: string;

  @IsString()
  xml!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LaneMappingDraftDto)
  lanes!: LaneMappingDraftDto[];
}
