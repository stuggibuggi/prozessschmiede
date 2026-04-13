import { Module } from "@nestjs/common";
import { ProcessModelingController } from "./process-modeling.controller";
import { ProcessModelingService } from "./process-modeling.service";
import { IdentityModule } from "../identity/identity.module";

@Module({
  imports: [IdentityModule],
  controllers: [ProcessModelingController],
  providers: [ProcessModelingService]
})
export class ProcessModelingModule {}
