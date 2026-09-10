export type NodeKind = "start"|"process"|"decision"|"exception"|"end";
export interface SourceRef { page?: string; excerpt?: string; }
export interface Lane { id:string; name:string; icon?:string; }
export interface FlowNode {
  id:string; x:number; y:number;
  data:{ label:string; laneId:string; kind:NodeKind; width?:number; height?:number; source?:SourceRef; }
}
export interface FlowEdge { id:string; source:string; target:string; label?:string; exception?:boolean; }
export interface Panel {
  id:string; title:string; accent:"blue"|"teal"; lanes:Lane[]; nodes:FlowNode[]; edges:FlowEdge[];
  /** logical canvas size used both for on-screen layout and PPTX coordinate scaling */
  canvasWidth?:number; canvasHeight?:number;
}
export interface Department { id:string; name:string; subtitle:string; sourcePages?:string; footerNote?:string; panels:Panel[]; }
export type ThemeName = "reference"|"mckinsey"|"minimal";
export type PageSize = "A3"|"A4"|"16:9";
export interface Theme {
  name?:ThemeName; pageSize?:PageSize; fontFamily?:string; mainBlue?:string; teal?:string;
  processFill?:string; decisionFill?:string; exceptionFill?:string; startEndFill?:string;
}
export interface Project {
  title:string; subtitle:string; sourceFileName?:string; departments:Department[];
  theme?:Theme;
}
