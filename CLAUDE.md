# Claude Code Project Contract

You are building **Claude Code Flowchart Studio**.

## Goal
Turn Arabic organizational procedures in DOCX files into cross-functional flowcharts with maximum user control, then export **native editable PowerPoint**.

## Source rules
The Word document is authoritative. Never invent:
- steps
- actors
- approvals
- systems
- timings
- corrective actions
- decisions

If unclear, flag ambiguity instead of guessing.

Every node should support:
- source.page
- source.excerpt

## Required editor features
Implement:
1. Drag & drop nodes
2. Resize nodes
3. Snap to lane
4. Add/delete/reorder lanes
5. Add/delete nodes
6. Visual edge creation
7. Main vs exception edge toggle
8. Editable edge labels
9. Multi-select
10. Align center
11. Equal widths / equal heights
12. Distribute vertically
13. Undo/redo
14. Autosave to localStorage
15. JSON import/export
16. Duplicate department/panel
17. Source citation editor
18. Validation panel:
   - orphan node
   - broken edge
   - duplicate ID
   - missing lane
   - missing citation
   - overflow risk
   - node outside panel

## Claude extraction workflow
Must work without API key:
1. Extract DOCX via Mammoth
2. User chooses a department/range
3. Generate Claude prompt
4. User pastes JSON
5. Validate with Zod
6. Show diff before apply

Optional:
- direct Anthropic API integration using user-provided key

## PowerPoint requirements
Use PptxGenJS.
PowerPoint must use native editable:
- text boxes
- process shapes
- decision diamonds
- swimlanes
- role labels
- connectors
- fills/strokes

Never flatten the editable PPTX to a screenshot unless user explicitly chooses image export.

## Visual style
Default theme = Reference Corporate:
- white background
- navy + teal headers
- blue process boxes
- yellow decisions
- green start/end
- red exceptions
- lane labels at right
- RTL Arabic
- consistent spacing
- clean consulting/business look

Add themes:
- Reference Corporate
- McKinsey-like
- Minimal Banking

Add page sizes:
- 16:9
- A3 landscape
- A4 landscape

## Export
- current department PPTX
- all departments PPTX
- current PNG
- SVG
- current PDF
- all departments PDF

## Completion checklist
Before finishing:
- run npm run build
- fix TypeScript errors
- validate JSON import/export
- verify RTL text
- verify editable PPTX opens
- verify objects are still editable
- ensure nothing overflows slide bounds