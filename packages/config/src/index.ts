export interface WebAppConfig {
  appName: string;
  apiBaseUrl: string;
}

export interface ApiAppConfig {
  port: number;
  databaseUrl: string;
  authMode: "mock" | "oidc";
  oidcIssuerUrl: string;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcRedirectUri: string;
  mockUserEmail: string;
  mockUserDisplayName: string;
  mockUserSubject: string;
  mockUserGroups: string[];
}

export const webAppConfig: WebAppConfig = {
  appName: "Prozessschmiede",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1"
};

export const apiAppConfig: ApiAppConfig = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/prozessschmiede",
  authMode: process.env.AUTH_MODE === "oidc" ? "oidc" : "mock",
  oidcIssuerUrl: process.env.OIDC_ISSUER_URL ?? "https://login.microsoftonline.com/common/v2.0",
  oidcClientId: process.env.OIDC_CLIENT_ID ?? "replace-me",
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET ?? "replace-me",
  oidcRedirectUri: process.env.OIDC_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback/entra",
  mockUserEmail: process.env.MOCK_USER_EMAIL ?? "elena.hoffmann@example.com",
  mockUserDisplayName: process.env.MOCK_USER_DISPLAY_NAME ?? "Elena Hoffmann",
  mockUserSubject: process.env.MOCK_USER_SUBJECT ?? "mock-user-1",
  mockUserGroups: (process.env.MOCK_USER_GROUPS ?? "BPMN_MODELERS,BPMN_REVIEWERS")
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean)
};
