import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module";
import { ProcessCatalogController } from "./process-catalog.controller";
import { ProcessCatalogService } from "./process-catalog.service";

@Module({
  imports: [IdentityModule],
  controllers: [ProcessCatalogController],
  providers: [ProcessCatalogService],
  exports: [ProcessCatalogService]
})
export class ProcessCatalogModule {}
