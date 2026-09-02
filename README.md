# Presence

**Presence lets your browser agent enter live software as a scoped, visible collaborator.**

Presence explores a new WebMCP primitive: **agent admission**. Instead of shipping a proprietary copilot inside the app, Presence allows an external browser agent to discover the live workspace, request a narrow role, become a visible participant only after human approval, work against the same authoritative application state, and lose access immediately when the human revokes it.

The first host application is Responsive Studio. The demo project, Aurora Landing Page, has three live surfaces:

- Desktop — **REFERENCE**, read-only
- Tablet — **UNASSIGNED** until an admitted browser agent receives proposal scope
- Mobile — **YOU**, directly editable by the human

## Defining flow

1. The browser agent calls `inspect_presence` and Presence records that real discovery event.
2. The agent calls `request_admission` for the **Responsive collaborator** role with Tablet proposal scope.
3. The request becomes real pending domain state. The agent still has zero mutation rights.
4. The human sees the exact role, requested scope, allowed actions, blocked actions, and reason, then chooses whether to admit it.
5. Approval creates the agent participant and Tablet assignment. The workspace changes from **UNASSIGNED** to **YOUR AGENT** and the agent cursor becomes visible.
6. Human UI and WebMCP tools operate on the same Zustand-backed domain state.
7. Agent work remains provisional. Every proposal mutation requires an active admission, granted capability, assigned surface, current `expectedRevision`, and valid domain constraints.
8. If the human changes canonical state first, stale agent work returns `STALE_STATE` and does not mutate the project. The agent can inspect fresh state and retry.
9. The human reviews agent changes, rejects individual operations, resolves semantic conflicts without last-write-wins, and explicitly accepts what becomes canonical.
10. Pause blocks further agent work with `ADMISSION_PAUSED`. Revoke removes participant and assignment immediately; later mutations return `ADMISSION_REVOKED`, while existing proposals remain reviewable.

## WebMCP surface

Presence registers semantic tools with `document.modelContext.registerTool()` when the browser exposes WebMCP:

`inspect_presence` · `inspect_available_roles` · `request_admission` · `inspect_admission` · `inspect_project` · `inspect_breakpoint` · `inspect_component` · `inspect_constraints` · `inspect_recent_changes` · `compare_breakpoints` · `propose_layout_change` · `propose_component_change` · `propose_responsive_rule` · `submit_proposal` · `explain_proposal` · `release_role`

Tool handlers read fresh store state at execution time. There is no DOM scraping source of truth and no separate agent-side application model.

## Permission boundary

A consequential agent operation must pass, in order:

`admission → capability → resource scope → assignment → revision → constraint`

Relevant failures are structured domain errors such as `ADMISSION_REQUIRED`, `ADMISSION_PENDING`, `ADMISSION_PAUSED`, `ADMISSION_REVOKED`, `CAPABILITY_NOT_GRANTED`, `SURFACE_NOT_ASSIGNED`, `STALE_STATE`, and `CONSTRAINT_VIOLATION`.

The app does not claim cryptographic agent identity. “Your agent” is application-level session identity supplied by the current browser interaction.

## Development fallback

If WebMCP is unavailable, Presence exposes a clearly labeled **DEVELOPMENT FALLBACK**. It simulates the browser-agent request and Tablet tool calls only to make local development reproducible. The fallback invokes the same admission and mutation APIs and has no privileged bypass. It is hidden when real WebMCP is connected.

## Run

```bash
npm install
npm run dev
```

Open `/?demo=1` for a deterministic clean Aurora state.

## Verify

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The Vitest suite covers admission, scoped permissions, stale-state safety, provisional proposals, conflict resolution, revocation, undo, and reset behavior. The Playwright flagship journey exercises the visible request → admit → collaborate → stale/recover → review → accept → revoke path using the development fallback while preserving the same domain boundary.

## Architecture

- `src/domain` — structured Aurora state, admission lifecycle, assignments, mutation engine, constraints, proposals, revision history, conflict detection
- `src/webmcp` — current browser tool registration and semantic schemas
- `src/components` — three-surface workspace, admission/presence panel, operation-bound cursors, review/conflict UI, inspector, technical runtime inspector
- `src/tests` — adversarial domain and integration coverage
- `e2e` — deterministic flagship browser journey

## Product invariant

**discover → request admission → grant role → collaborate → review → revoke**

The responsive design studio is the first proof of the primitive, not the primitive itself.
