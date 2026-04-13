import { Module } from "@nestjs/common";
import { AppConfigModule } from "./shared/app-config.module";
import { HealthModule } from "./health/health.module";
import { IdentityModule } from "./identity/identity.module";
import { ProcessCatalogModule } from "./process-catalog/process-catalog.module";
import { ProcessModelingModule } from "./process-modeling/process-modeling.module";
import { GovernanceModule } from "./governance/governance.module";
import { AuditModule } from "./audit/audit.module";
import { SearchModule } from "./search/search.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    AppConfigModule,
    HealthModule,
    IdentityModule,
    DashboardModule,
    AdminModule,
    ProcessCatalogModule,
    ProcessModelingModule,
    GovernanceModule,
    AuditModule,
    SearchModule
  ]
})
export class AppModule {}
