import type {Project} from "./types";

const KEY="flowchart-studio-autosave-v1";

export interface AutosaveEnvelope { savedAt:string; project:Project; }

export function loadAutosave():AutosaveEnvelope|null{
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw) return null;
    return JSON.parse(raw) as AutosaveEnvelope;
  }catch{ return null; }
}

export function saveAutosave(project:Project){
  try{
    const envelope:AutosaveEnvelope={savedAt:new Date().toISOString(),project};
    localStorage.setItem(KEY,JSON.stringify(envelope));
  }catch{ /* storage unavailable or full — autosave is best-effort */ }
}

export function clearAutosave(){
  try{ localStorage.removeItem(KEY); }catch{ /* ignore */ }
}
