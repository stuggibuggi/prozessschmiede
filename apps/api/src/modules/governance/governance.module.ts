import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module";
import { GovernanceController } from "./governance.controller";
import { GovernanceService } from "./governance.service";

@Module({
  imports: [IdentityModule],
  controllers: [GovernanceController],
  providers: [GovernanceService]
})
export class GovernanceModule {}
