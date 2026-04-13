import { Inject, Injectable } from "@nestjs/common";
import type { ReferenceOptionsResponse, SearchResponse } from "@prozessschmiede/types";
import { PrismaService } from "../shared/prisma.service";

@Injectable()
export class SearchService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async search(query: string): Promise<SearchResponse> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return {
        query,
        strategy: "postgres-ilike",
        results: []
      };
    }

    const [processes, subprocesses, models, applications, organizations] = await Promise.all([
      this.prisma.process.findMany({
        where: {
          OR: [
            { businessId: { contains: normalizedQuery, mode: "insensitive" } },
            { name: { contains: normalizedQuery, mode: "insensitive" } },
            { description: { contains: normalizedQuery, mode: "insensitive" } }
          ]
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 8
      }),
      this.prisma.subprocess.findMany({
        where: {
          OR: [
            { businessId: { contains: normalizedQuery, mode: "insensitive" } },
            { name: { contains: normalizedQuery, mode: "insensitive" } },
            { description: { contains: normalizedQuery, mode: "insensitive" } }
          ]
        },
        include: {
          process: true
        },
        orderBy: [{ sortOrder: "asc" }],
        take: 8
      }),
      this.prisma.bpmnModel.findMany({
        where: {
          OR: [{ name: { contains: normalizedQuery, mode: "insensitive" } }]
        },
        include: {
          process: true,
          subprocess: {
            include: {
              process: true
            }
          }
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 8
      }),
      this.prisma.application.findMany({
        where: {
          OR: [
            { code: { contains: normalizedQuery, mode: "insensitive" } },
            { name: { contains: normalizedQuery, mode: "insensitive" } }
          ]
        },
        orderBy: [{ code: "asc" }],
        take: 8
      }),
      this.prisma.organization.findMany({
        where: {
          OR: [
            { code: { contains: normalizedQuery, mode: "insensitive" } },
            { name: { contains: normalizedQuery, mode: "insensitive" } }
          ]
        },
        orderBy: [{ code: "asc" }],
        take: 8
      })
    ]);

    return {
      query,
      strategy: "postgres-ilike",
      results: [
        ...processes.map((item) => ({
          id: item.id,
          type: "process" as const,
          title: `${item.businessId} ${item.name}`,
          subtitle: item.description,
          href: `/processes/${item.id}`
        })),
        ...subprocesses.map((item) => ({
          id: item.id,
          type: "subprocess" as const,
          title: `${item.businessId} ${item.name}`,
          subtitle: `Teilprozess in ${item.process.businessId} ${item.process.name}`,
          href: `/processes/${item.processId}`
        })),
        ...models.map((item) => ({
          id: item.id,
          type: "model" as const,
          title: item.name,
          subtitle:
            item.process
              ? `Modell zu ${item.process.businessId} ${item.process.name}`
              : item.subprocess
                ? `Modell zu ${item.subprocess.businessId} ${item.subprocess.name}`
                : "BPMN-Modell",
          href: `/processes/${item.processId ?? item.subprocess?.processId ?? ""}/models/${item.id}`
        })),
        ...applications.map((item) => ({
          id: item.id,
          type: "application" as const,
          title: `${item.code} ${item.name}`,
          subtitle: item.description ?? "Anwendung",
          href: "/admin"
        })),
        ...organizations.map((item) => ({
          id: item.id,
          type: "organization" as const,
          title: `${item.code} ${item.name}`,
          subtitle: item.shortName ?? "Organisation",
          href: "/admin"
        }))
      ]
    };
  }

  async searchOrganizations(query: string, limit: number): Promise<ReferenceOptionsResponse> {
    const where = query
      ? {
          OR: [
            {
              code: {
                contains: query,
                mode: "insensitive" as const
              }
            },
            {
              name: {
                contains: query,
                mode: "insensitive" as const
              }
            }
          ]
        }
      : undefined;

    const items = await this.prisma.organization.findMany({
      ...(where ? { where } : {}),
      take: Math.min(Math.max(limit, 1), 100),
      orderBy: [{ code: "asc" }]
    });

    return {
      total: items.length,
      items: items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name
      }))
    };
  }

  async searchApplications(query: string, limit: number): Promise<ReferenceOptionsResponse> {
    const where = query
      ? {
          OR: [
            {
              code: {
                contains: query,
                mode: "insensitive" as const
              }
            },
            {
              name: {
                contains: query,
                mode: "insensitive" as const
              }
            }
          ]
        }
      : undefined;

    const items = await this.prisma.application.findMany({
      ...(where ? { where } : {}),
      take: Math.min(Math.max(limit, 1), 100),
      orderBy: [{ code: "asc" }]
    });

    return {
      total: items.length,
      items: items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name
      }))
    };
  }

  async searchUsers(query: string, limit: number): Promise<ReferenceOptionsResponse> {
    const where = query
      ? {
          OR: [
            {
              displayName: {
                contains: query,
                mode: "insensitive" as const
              }
            },
            {
              email: {
                contains: query,
                mode: "insensitive" as const
              }
            },
            {
              employeeId: {
                contains: query,
                mode: "insensitive" as const
              }
            }
          ]
        }
      : undefined;

    const items = await this.prisma.user.findMany({
      ...(where ? { where } : {}),
      take: Math.min(Math.max(limit, 1), 100),
      orderBy: [{ displayName: "asc" }]
    });

    return {
      total: items.length,
      items: items.map((item) => ({
        id: item.id,
        code: item.employeeId || item.email,
        name: item.displayName
      }))
    };
  }
}
