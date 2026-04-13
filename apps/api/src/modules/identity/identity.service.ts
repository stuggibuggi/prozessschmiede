import { apiAppConfig } from "@prozessschmiede/config";

export interface IdentityProfile {
  provider: "entra-id" | "mock";
  subject: string;
  email: string;
  displayName: string;
  groups: string[];
}

export class IdentityService {
  getProfile(): IdentityProfile {
    if (apiAppConfig.authMode === "mock") {
      return {
        provider: "mock",
        subject: apiAppConfig.mockUserSubject,
        email: apiAppConfig.mockUserEmail,
        displayName: apiAppConfig.mockUserDisplayName,
        groups: apiAppConfig.mockUserGroups
      };
    }

    return {
      provider: "entra-id",
      subject: "entra-user-1",
      email: "elena.hoffmann@example.com",
      displayName: "Elena Hoffmann",
      groups: ["BPMN_MODELERS", "BPMN_REVIEWERS"]
    };
  }

  getAuthorizationMatrix() {
    const profile = this.getProfile();
    const hasReviewer = profile.groups.includes("BPMN_REVIEWERS");

    return {
      authMode: apiAppConfig.authMode,
      roles: hasReviewer ? ["modeler", "reviewer"] : ["modeler"],
      permissions: hasReviewer
        ? ["process.read", "process.write", "model.edit", "model.submit_review"]
        : ["process.read", "process.write", "model.edit"]
    };
  }
}
