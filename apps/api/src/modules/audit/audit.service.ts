import { Inject, Injectable } from "@nestjs/common";
import type { AuditResponse } from "@prozessschmiede/types";
import { PrismaService } from "../shared/prisma.service";

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listEvents(): Promise<AuditResponse> {
    const items = await this.prisma.auditEvent.findMany({
      orderBy: {
        occurredAt: "desc"
      },
      take: 250
    });

    return {
      total: items.length,
      items: items.map((item) => ({
        id: item.id,
        occurredAt: item.occurredAt.toISOString(),
        actorDisplayName: item.actorDisplayName,
        eventType: item.eventType,
        aggregateType: item.aggregateType,
        aggregateId: item.aggregateId,
        summary: item.summary
      }))
    };
  }
}
