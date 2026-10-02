# Platform admin module

Everything for the **platform operator console** (`/admin`) lives here, separate from the workspace CRM (`/app`).

```
src/platform/
  auth/token.ts       edge-safe JWT for the console: cookie `crm_admin`, type "admin", its own signing key, 8h life
  auth/session.ts     getAdmin / requirePlatformAdmin (API, 404) / requirePlatformAdminPage (redirect)
  models/             PlatformAdmin (console accounts), AdminLog (platform audit trail)
  services/           overview · workspaces · users · payments · admins · audit
  components/         console UI (rail, tables, workspace control panel, login form)
src/app/admin/        routes: /admin/login and the (console) route group
src/app/api/admin/    console API (all guarded by requirePlatformAdmin)
```

## Rules

1. **One-way dependency.** Platform code may import workspace modules (it manages workspaces, users, leads).
   Workspace code must never import `@/platform/*`. Enforced by `npm run check:boundaries`.
   The only exception is `src/proxy.ts`, which routes both areas.
2. **Separate identities.** Platform admins are `PlatformAdmin` records, not workspace `User`s. They sign in at
   `/admin/login`. A workspace session can't open `/admin`, and an admin session can't open `/app`.
3. **Shared plumbing only.** Both sides share infrastructure: `lib/db`, `lib/http`, `lib/client` and `components/ui`.
4. **Everything is audited.** Every console action calls `audit()`. Actions that change a workspace also write to
   that workspace's own activity log (as "System"), so customers can see what support changed.
5. **Support sessions.** "Sign in as" issues a normal workspace session marked with `imp = adminId`. The app
   shows the support banner, and ending it only clears the workspace cookie.

Create the first admin with: `npm run create-admin -- you@company.com "Your Name"`
