# Claude Code Flowchart Studio

Starter project designed specifically for **Claude Code**.

## Workflow
Word DOCX → Claude structured JSON → visual editor → user QA → editable PowerPoint

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Use with Claude Code
Open this folder in Claude Code and say:

> Read CLAUDE.md and implement the remaining requirements in priority order. Start with drag/drop + resize + snap, then edge editing, then validation, then PowerPoint QA.

## Important
The source Word procedure is authoritative. Do not invent process content.

The PowerPoint export must remain native/editable.