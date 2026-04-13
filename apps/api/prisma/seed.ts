import fs from "node:fs";
import path from "node:path";
import { PrismaClient, ProcessStatus } from "@prisma/client";
import XLSX from "xlsx";

const prisma = new PrismaClient();
const originalDataDir = path.resolve(__dirname, "../../../Originaldaten");

type Row = Record<string, string>;

function readTable(fileName: string): Row[] {
  const filePath = path.join(originalDataDir, fileName);
  const workbook = XLSX.readFile(filePath, { raw: false, cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json<Row>(workbook.Sheets[sheetName], {
    defval: "",
    raw: false
  }).map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [String(key).trim(), normalize(value)]))
  );
}

function normalize(value: unknown): string {
  return String(value ?? "").replace(/\u0000/g, "").trim();
}

function mergeRows(existing: Row | undefined, incoming: Row): Row {
  if (!existing) return { ...incoming };
  const merged: Row = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (!merged[key] && value) merged[key] = value;
  }
  return merged;
}

function slugify(value: string, prefix: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .toUpperCase();
  return slug ? `${prefix}_${slug}`.slice(0, 80) : `${prefix}_UNKNOWN`;
}

function mapProcessStatus(lifecycle: string): ProcessStatus {
  const value = lifecycle.toLowerCase();
  if (value.includes("produktion")) return "active";
  if (value.includes("stillgelegt")) return "inactive";
  if (value.includes("archiv")) return "archived";
  return "draft";
}

function toBooleanFlag(value: string): boolean | null {
  const normalized = value.toLowerCase();
  if (!normalized) return null;
  if (["ja", "j", "true", "x", "1"].includes(normalized)) return true;
  if (["nein", "n", "false", "0"].includes(normalized)) return false;
  return null;
}

function buildFallbackEmail(employeeId: string, name: string): string {
  const base = employeeId || name || "unknown";
  return `${slugify(base, "USER").toLowerCase()}@import.local`;
}

async function main() {
  if (!fs.existsSync(originalDataDir)) {
    throw new Error(`Originaldaten folder not found: ${originalDataDir}`);
  }

  const processBaseRows = readTable("IVB_PROZESS_BASIS.xlsx");
  const subprocessRows = readTable("IVB_TEILPROZESS_PROZESS.xlsx");
  const processIctoRows = readTable("IVB_PROZESS_ICTO.xlsx");
  const processIctoEuRows = readTable("IVB_PROZESS_ICTO_EU.xlsx");
  const processUsingEuRows = readTable("IVB_PROZESS_NUTZENDES_EU.xlsx");
  const processFunctionRows = readTable("IVB_PROZESS_FUNKTION.xlsx");
  const processEssentialFunctionRows = readTable("IVB_PROZESS_WFUNKTION.xlsx");
  const functionRows = readTable("IVB_FUNKTION.xlsx");
  const ictoRows = readTable("WW_STDRPT_ICTO_V1.XLSX");
  const ictoRoleRows = readTable("WW_STDRPT_ROLES_ICTO_V2.XLSX");
  const employeeRows = readTable("SAPHCM_LISTE_MITARBEITER.csv");
  const employeeOrgRows = readTable("SAPHCM_LISTE_MITARBEITER_ORGAS.csv");
  const organizationRows = readTable("SAPHCM_LISTE_ORGAS.csv");

  await prisma.auditEventPayload.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.approvalDecision.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.checkoutLock.deleteMany();
  await prisma.laneMapping.deleteMany();
  await prisma.diagramAsset.deleteMany();
  await prisma.modelVersion.deleteMany();
  await prisma.bpmnModel.deleteMany();
  await prisma.applicationRoleAssignment.deleteMany();
  await prisma.processApplicationAssignment.deleteMany();
  await prisma.processFunctionAssignment.deleteMany();
  await prisma.businessFunction.deleteMany();
  await prisma.processRoleAssignment.deleteMany();
  await prisma.subprocess.deleteMany();
  await prisma.process.deleteMany();
  await prisma.userOrganizationAssignment.deleteMany();
  await prisma.userRoleAssignment.deleteMany();
  await prisma.groupRoleAssignment.deleteMany();
  await prisma.permissionOnRole.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.group.deleteMany();
  await prisma.application.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.processCategory.deleteMany();
  await prisma.processGroup.deleteMany();
  await prisma.user.deleteMany();

  const processRowsById = new Map<string, Row>();
  for (const row of processBaseRows) {
    const businessId = row.PRO_NUMMER;
    if (!businessId) continue;
    processRowsById.set(businessId, mergeRows(processRowsById.get(businessId), row));
  }

  const subprocessRowsById = new Map<string, Row>();
  for (const row of subprocessRows) {
    const businessId = row.TPRO_NUMMER;
    if (!businessId) continue;
    subprocessRowsById.set(businessId, mergeRows(subprocessRowsById.get(businessId), row));
  }

  const categoryNames = [...new Set([...processRowsById.values()].map((row) => row.PRO_KATEGORIE).filter(Boolean))];
  const groupNames = [...new Set([...processRowsById.values()].map((row) => row.PRO_GRUPPE).filter(Boolean))];

  await prisma.processCategory.createMany({
    data: categoryNames.map((name) => ({
      code: slugify(name, "CAT"),
      name
    })),
    skipDuplicates: true
  });
  await prisma.processCategory.create({
    data: {
      code: "CAT_UNSPECIFIED",
      name: "Nicht zugeordnet"
    }
  }).catch(() => undefined);

  await prisma.processGroup.createMany({
    data: groupNames.map((name) => ({
      code: slugify(name, "GRP"),
      name
    })),
    skipDuplicates: true
  });
  await prisma.processGroup.create({
    data: {
      code: "GRP_UNSPECIFIED",
      name: "Nicht zugeordnet"
    }
  }).catch(() => undefined);

  const categoryMap = new Map((await prisma.processCategory.findMany()).map((item) => [item.name, item.id]));
  const groupMap = new Map((await prisma.processGroup.findMany()).map((item) => [item.name, item.id]));
  const defaultCategoryId = categoryMap.get("Nicht zugeordnet")!;
  const defaultGroupId = groupMap.get("Nicht zugeordnet")!;

  await prisma.organization.createMany({
    data: organizationRows.map((row) => ({
      code: row.OE_ID,
      shortName: row.OE_Kurz || null,
      name: row.OE_Lang || row.OE_Kurz || row.OE_ID,
      type: row.OE_TYP || null,
      parentOrganizationId: null
    })),
    skipDuplicates: true
  });

  const organizationByCode = new Map((await prisma.organization.findMany()).map((item) => [item.code, item]));

  const userCandidates = new Map<string, { employeeId?: string; email: string; displayName: string }>();
  const upsertCandidate = (candidate: { employeeId?: string; email?: string; displayName?: string }) => {
    const displayName = normalize(candidate.displayName);
    const employeeId = normalize(candidate.employeeId);
    const email = normalize(candidate.email) || buildFallbackEmail(employeeId, displayName);
    const key = employeeId || email.toLowerCase();
    if (!key) return;
    const existing = userCandidates.get(key);
    userCandidates.set(key, {
      employeeId: employeeId || existing?.employeeId,
      email,
      displayName: displayName || existing?.displayName || email
    });
  };

  for (const row of employeeRows) {
    upsertCandidate({
      employeeId: row.Person_ID,
      email: row["Person Email"],
      displayName: row.Person_Name
    });
  }

  for (const row of processRowsById.values()) {
    upsertCandidate({
      email: row.PRO_PROZESSVERANTWORTUNG_PERSON_EMAIL,
      displayName: row.PRO_PROZESSVERANTWORTUNG_PERSON_NAME
    });
    upsertCandidate({
      email: row.PRO_PROZESSEIGENTUEMER_PERSON_EMAIL,
      displayName: row.PRO_PROZESSEIGENTUEMER_PERSON_NAME
    });
  }

  for (const row of ictoRoleRows) {
    upsertCandidate({
      employeeId: row.SAPID,
      email: row.EMAIL,
      displayName: row.ROLLENINHABER
    });
  }

  await prisma.user.createMany({
    data: [...userCandidates.values()].map((candidate) => ({
      employeeId: candidate.employeeId || null,
      email: candidate.email.toLowerCase(),
      displayName: candidate.displayName || candidate.email
    })),
    skipDuplicates: true
  });

  const users = await prisma.user.findMany();
  const userByEmployeeId = new Map(users.filter((item) => item.employeeId).map((item) => [item.employeeId!, item]));
  const userByEmail = new Map(users.map((item) => [item.email.toLowerCase(), item]));

  for (const row of organizationRows) {
    const organization = organizationByCode.get(row.OE_ID);
    if (!organization) continue;
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        parentOrganizationId: row["ObjektID Übergeordnete OE"] ? organizationByCode.get(row["ObjektID Übergeordnete OE"])?.id ?? null : null,
        leaderUserId: row.OE_Leiter ? userByEmployeeId.get(row.OE_Leiter)?.id ?? null : null
      }
    });
  }

  const userPrimaryOrganization = new Map<string, string>();
  for (const row of employeeOrgRows) {
    const user = userByEmployeeId.get(row.Person_ID);
    const organization = organizationByCode.get(row.OE_ID);
    if (!user || !organization) continue;
    if (!userPrimaryOrganization.has(user.id)) {
      userPrimaryOrganization.set(user.id, organization.id);
    }
    await prisma.userOrganizationAssignment.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        functionName: row.Funktion || null,
        functionLevel: row.Funktion_Ebene || null
      }
    });
  }

  for (const [userId, organizationId] of userPrimaryOrganization) {
    await prisma.user.update({
      where: { id: userId },
      data: { primaryOrganizationId: organizationId }
    });
  }

  await prisma.businessFunction.createMany({
    data: functionRows.map((row) => ({
      code: row.FUNKTIONNUMMER,
      name: row.LANGBEZEICHNUNG_FUNKTION,
      category: row.KATEGORIE || null,
      isEssential: toBooleanFlag(row.WESENTLICHE_FUNKTION) ?? false
    })),
    skipDuplicates: true
  });

  const businessFunctionByCode = new Map((await prisma.businessFunction.findMany()).map((item) => [item.code, item]));
  const businessFunctionByName = new Map((await prisma.businessFunction.findMany()).map((item) => [item.name, item]));

  await prisma.application.createMany({
    data: ictoRows.map((row) => ({
      code: row.ICTOID,
      name: row.NAME || row.ICTOID,
      description: row.BESCHREIBUNG || null,
      status: row.ICTO_STATUS || null,
      ownerName: row.EIGENTUEMER_NAME || null,
      ownerEmployeeId: row.EIGENTUEMER_SAPID || null
    })),
    skipDuplicates: true
  });

  const applications = await prisma.application.findMany();
  const applicationByCode = new Map(applications.map((item) => [item.code, item]));

  for (const row of processRowsById.values()) {
    if (!row.PRO_NUMMER || !row.PRO_NAME) continue;
    await prisma.process.create({
      data: {
        businessId: row.PRO_NUMMER,
        name: row.PRO_NAME,
        description: row.PRO_BESCHREIBUNG || row.PRO_NAME,
        status: mapProcessStatus(row.PRO_LEBENSZYKLUS),
        lifecycleStatus: row.PRO_LEBENSZYKLUS || null,
        sourceLink: row.PRO_LINK || null,
        categoryId: categoryMap.get(row.PRO_KATEGORIE) ?? defaultCategoryId,
        groupId: groupMap.get(row.PRO_GRUPPE) ?? defaultGroupId,
        owningOrganizationId: organizationByCode.get(row.PRO_PROZESSEIGENTUEMER_ORGA_ID || row.PRO_PROZESSVERANTWORTUNG_ORGA_ID)?.id ?? null
      }
    });
  }

  const processes = await prisma.process.findMany();
  const processByBusinessId = new Map(processes.map((item) => [item.businessId, item]));

  for (const row of processRowsById.values()) {
    const process = processByBusinessId.get(row.PRO_NUMMER);
    if (!process) continue;
    const roleMappings = [
      {
        roleCode: "process_responsible",
        email: row.PRO_PROZESSVERANTWORTUNG_PERSON_EMAIL,
        name: row.PRO_PROZESSVERANTWORTUNG_PERSON_NAME
      },
      {
        roleCode: "process_owner",
        email: row.PRO_PROZESSEIGENTUEMER_PERSON_EMAIL,
        name: row.PRO_PROZESSEIGENTUEMER_PERSON_NAME
      }
    ];

    for (const role of roleMappings) {
      const user =
        (role.email ? userByEmail.get(role.email.toLowerCase()) : undefined) ??
        [...users].find((item) => item.displayName === role.name);
      if (!user) continue;
      await prisma.processRoleAssignment.create({
        data: {
          processId: process.id,
          userId: user.id,
          roleCode: role.roleCode
        }
      });
    }
  }

  for (const row of subprocessRowsById.values()) {
    const parentProcess = processByBusinessId.get(row.TRPO_PRO_NUMMER);
    if (!parentProcess) continue;
    await prisma.subprocess.create({
      data: {
        businessId: row.TPRO_NUMMER,
        processId: parentProcess.id,
        name: row.TPRO_NAME || row.TPRO_NUMMER,
        description: row.TPRO_BESCHREIBUNG || row.TPRO_NAME || row.TPRO_NUMMER,
        status: parentProcess.status,
        sourceLink: row.TPRO_LINK || null
      }
    });
  }

  for (const row of processFunctionRows) {
    const process = processByBusinessId.get(row.PRO_NUMMER);
    const func = businessFunctionByCode.get(row.FKT_NUMMER);
    if (!process || !func) continue;
    await prisma.processFunctionAssignment.upsert({
      where: {
        processId_businessFunctionId: {
          processId: process.id,
          businessFunctionId: func.id
        }
      },
      update: {
        functionNameSnapshot: row.FUNKTION || func.name,
        isCriticalFunction: toBooleanFlag(row.KENNZ_KRITISCHE_FUNKTION)
      },
      create: {
        processId: process.id,
        businessFunctionId: func.id,
        functionNameSnapshot: row.FUNKTION || func.name,
        isCriticalFunction: toBooleanFlag(row.KENNZ_KRITISCHE_FUNKTION)
      }
    });
  }

  for (const row of processEssentialFunctionRows) {
    const process = processByBusinessId.get(row.PRO_NUMMER);
    if (!process || !row.WESENTLICHE_FUNKTION) continue;
    let func = businessFunctionByName.get(row.WESENTLICHE_FUNKTION);
    if (!func) {
      func = await prisma.businessFunction.create({
        data: {
          code: slugify(row.WESENTLICHE_FUNKTION, "WFKT"),
          name: row.WESENTLICHE_FUNKTION,
          isEssential: true
        }
      });
      businessFunctionByName.set(func.name, func);
    }

    await prisma.processFunctionAssignment.upsert({
      where: {
        processId_businessFunctionId: {
          processId: process.id,
          businessFunctionId: func.id
        }
      },
      update: {
        functionNameSnapshot: row.WESENTLICHE_FUNKTION,
        isEssentialFunction: true,
        isCriticalFunction: true
      },
      create: {
        processId: process.id,
        businessFunctionId: func.id,
        functionNameSnapshot: row.WESENTLICHE_FUNKTION,
        isEssentialFunction: true,
        isCriticalFunction: true
      }
    });
  }

  for (const row of processIctoRows) {
    const process = processByBusinessId.get(row.PRO_NUMMER);
    const app = applicationByCode.get(row.ICTO_ID);
    if (!process) continue;
    await prisma.processApplicationAssignment.create({
      data: {
        processId: process.id,
        applicationId: app?.id ?? null,
        assignmentType: "direct_icto"
      }
    });
  }

  for (const row of processIctoEuRows) {
    const process = processByBusinessId.get(row.PRO_NUMMER);
    const app = applicationByCode.get(row.ICTO_ID);
    if (!process) continue;
    await prisma.processApplicationAssignment.create({
      data: {
        processId: process.id,
        applicationId: app?.id ?? null,
        euId: row.EU_ID || null,
        euName: row.EU_NAME || null,
        assignmentType: "icto_eu"
      }
    });
  }

  for (const row of processUsingEuRows) {
    const process = processByBusinessId.get(row.PRO_NUMMER);
    if (!process) continue;
    await prisma.processApplicationAssignment.create({
      data: {
        processId: process.id,
        applicationId: null,
        euId: row.EU_ID || null,
        euName: row.EU_NAME || null,
        assignmentType: "using_eu"
      }
    });
  }

  for (const row of ictoRoleRows) {
    const app = applicationByCode.get(row.ICTOID);
    if (!app) continue;
    const user =
      (row.EMAIL ? userByEmail.get(row.EMAIL.toLowerCase()) : undefined) ??
      (row.SAPID ? userByEmployeeId.get(row.SAPID) : undefined);

    await prisma.applicationRoleAssignment.create({
      data: {
        applicationId: app.id,
        roleName: row.ROLLE || "Unbekannte Rolle",
        technicalRoleName: row.ROLLE_TECHNISCH || null,
        holderName: row.ROLLENINHABER || null,
        userId: user?.id ?? null,
        organizationCode: row.ORGAID || null,
        employeeId: row.SAPID || null,
        email: row.EMAIL || null,
        roleType: row.ROLLENTYP || null
      }
    });
  }

  await prisma.auditEvent.create({
    data: {
      actorDisplayName: "system-import",
      eventType: "InitialProductionImport",
      aggregateType: "Originaldaten",
      aggregateId: "seed",
      summary: `Imported ${processRowsById.size} Prozesse, ${subprocessRowsById.size} Teilprozesse, ${applications.length} ICTO-Anwendungen, ${users.length} Personen und ${organizationRows.length} Organisationen.`
    }
  });

  console.log(
    JSON.stringify(
      {
        imported: {
          processes: processRowsById.size,
          subprocesses: subprocessRowsById.size,
          applications: applications.length,
          businessFunctions: await prisma.businessFunction.count(),
          users: users.length,
          organizations: organizationRows.length
        }
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
