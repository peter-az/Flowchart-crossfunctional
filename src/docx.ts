import mammoth from "mammoth";
export async function extractDocx(file:File){
  const arrayBuffer=await file.arrayBuffer();
  const r=await mammoth.extractRawText({arrayBuffer});
  return r.value;
}
export function buildClaudePrompt(text:string){
return `You are converting an Arabic organizational procedures document into an editable cross-functional flowchart project.

RULES
- The source is authoritative.
- Do not invent steps, roles, approvals, systems, durations, or decisions.
- Preserve Arabic wording whenever practical.
- Shorten only to fit a process box without changing meaning.
- Every node should include source.page and source.excerpt when available.
- Rework / rejection / incomplete-document returns must use exception edges.
- Return JSON only matching the Project schema in src/types.ts.

SOURCE:
${text}`;
}