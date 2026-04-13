import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { ProcessCatalogService } from "./process-catalog.service";
import { CreateProcessModelDto } from "./dto/create-process-model.dto";

@Controller("processes")
export class ProcessCatalogController {
  constructor(@Inject(ProcessCatalogService) private readonly processCatalogService: ProcessCatalogService) {}

  @Get()
  findAll() {
    return this.processCatalogService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.processCatalogService.findById(id);
  }

  @Post(":id/models")
  createModel(@Param("id") id: string, @Body() body: CreateProcessModelDto) {
    return this.processCatalogService.createModel(id, body);
  }
}
