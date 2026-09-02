# Presence

**AI should work beside you, not wait for prompts.**

Presence is an agent-native responsive design workspace where a human edits Mobile while an agent works on Tablet against the same structured Aurora project state.

## Core product behavior

- Structured semantic project model, not raw arbitrary HTML
- Human and agent share one authoritative Zustand-backed domain state
- Semantic WebMCP tools registered through `document.modelContext.registerTool()` when available
- Every agent mutation requires `expectedRevision`
- Stale operations return `STALE_STATE` and never overwrite newer work
- Agent changes are provisional proposals until human review/acceptance
- Scoped surface ownership and deterministic constraints
- Real activity history, undo/redo, local persistence, and deterministic demo reset

## Run

```bash
npm install
npm run dev
```

Open `/?demo=1` for the canonical Aurora demo state.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

## Demo flow

1. Select and edit the Mobile hero.
2. Click **Work together** in the Presence panel.
3. Continue changing Mobile while the agent adapts Tablet.
4. A human mutation after the agent has observed an earlier revision produces a genuine stale-state rejection; the agent re-reads and retries.
5. Review the Tablet proposal and explicitly accept or discard it.

The UI keeps WebMCP infrastructure secondary: the visible product moment is a human cursor on Mobile and an agent cursor on Tablet working toward one shared goal.
