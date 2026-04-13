import { Controller, Get, Inject } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Controller("audit-events")
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get()
  list() {
    return this.auditService.listEvents();
  }
}
