# Claude Code Project Contract

You are building **Claude Code Flowchart Studio** — a browser-based, Visio-style
diagramming tool specialised for **cross-functional (swimlane) process charts**,
with first-class Arabic/RTL support and presentation-quality export.

## Goal
Give users a modern diagramming editor that feels like Visio — drag shapes from a
stencil, format them freely, snap and align them — while staying purpose-built for
organizational procedures: swimlanes with role icons, main vs. exception flows,
source citations, and export to **native editable PowerPoint** or a
pixel-accurate rendered slide.

Turning Arabic procedure DOCX files into these charts remains a supported entry
point, not the only one: diagrams can equally be drawn from scratch.

## Source rules (when working from a source document)
When a chart is derived from a Word procedure, that document is authoritative.
Never invent:
- steps
- actors
- approvals
- systems
- timings
- corrective actions
- decisions

If unclear, flag ambiguity instead of guessing. Freehand diagrams authored
directly by the user carry no such restriction.

Every node supports:
- source.page
- source.excerpt

## Editor capabilities
Diagramming:
1. Stencil palette — drag a shape onto the canvas to place it
2. Drag, resize and snap-to-grid
3. Snap to lane (a shape belongs to the lane it is dropped in)
4. Per-shape formatting: fill, stroke, stroke width, font size, text color, corner radius, bold
5. Visual edge creation with editable labels
6. Main vs. exception edge toggle
7. Multi-select, align center, equal widths/heights, distribute vertically
8. Copy / paste / duplicate, arrow-key nudge (Shift = coarse)
9. Right-click context menus on shapes and on empty canvas
10. Zoom controls, minimap, grid
11. Undo/redo, autosave to localStorage
12. Popout/expanded canvas for focused editing

Structure:
13. Add/delete/reorder lanes, assign a lane icon
14. Add/delete shapes; duplicate department/panel
15. Source citation editor
16. JSON import/export, with a diff summary before applying an import
17. Validation panel: orphan node, broken edge, duplicate ID, missing lane,
    missing citation, overflow risk, node outside panel

## DOCX extraction workflow
Must work without an API key:
1. Extract DOCX via Mammoth
2. User chooses a department/range
3. Generate Claude prompt
4. User pastes JSON
5. Validate with Zod
6. Show diff before apply

Optional:
- direct Anthropic API integration using a user-provided key

## Export requirements
Two distinct modes, both must keep working:

**Native editable PPTX (PptxGenJS)** — default. Uses native editable text boxes,
process shapes, decision diamonds, swimlanes, role labels, connectors and
fills/strokes, and honors per-shape formatting overrides. Never flatten this mode
to an image.

**Rendered slide** — an explicit, separate choice. A dedicated presentation-only
renderer (`src/export/SlideView.tsx`) draws the department as a clean landscape
slide and is rasterized for PNG / SVG / PDF / image-PPTX. Never capture the live
editor DOM for export: editing chrome must never appear in a deliverable.

Export targets:
- current department PPTX / all departments PPTX
- current PNG, SVG, PDF
- all departments PDF
- image-based PPTX (current / all)

## Visual style
The editor UI is themed with CSS custom properties and supports light and dark
mode. The exported slide is always rendered light, independent of the editor theme.

Chart default theme = Reference Corporate:
- white background
- navy + teal panel headers
- blue process boxes
- yellow decisions
- green start/end
- red exceptions
- lane label column on the right, with role icons
- legend and footer on the slide
- RTL Arabic
- consistent spacing, clean consulting/business look

Additional themes: McKinsey-like, Minimal Banking.
Page sizes: 16:9, A3 landscape, A4 landscape.

## Responsiveness
Desktop is a three-pane layout. Below 860px the app collapses to a single column
switched by a bottom tab bar (Tools / Chart / Properties), and the canvas takes
one-finger pan on touch devices. Export output must be identical regardless of
the device it was triggered from.

## Completion checklist
Before finishing:
- run `npm run build`
- fix TypeScript errors
- validate JSON import/export
- verify RTL text
- verify the editable PPTX opens and objects are still editable
- verify a rendered export contains no editor chrome
- ensure nothing overflows slide bounds
