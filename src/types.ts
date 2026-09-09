export type NodeKind = "start"|"process"|"decision"|"exception"|"end";
export interface SourceRef { page?: string; excerpt?: string; }
export interface Lane { id:string; name:string; icon?:string; }
export interface FlowNode {
  id:string; x:number; y:number;
  data:{ label:string; laneId:string; kind:NodeKind; width?:number; height?:number; source?:SourceRef; }
}
export interface FlowEdge { id:string; source:string; target:string; label?:string; exception?:boolean; }
export interface Panel { id:string; title:string; accent:"blue"|"teal"; lanes:Lane[]; nodes:FlowNode[]; edges:FlowEdge[]; }
export interface Department { id:string; name:string; subtitle:string; sourcePages?:string; panels:Panel[]; }
export interface Project {
  title:string; subtitle:string; sourceFileName?:string; departments:Department[];
  theme?:{
    pageSize?:"A3"|"A4"|"16:9"; fontFamily?:string; mainBlue?:string; teal?:string;
    processFill?:string; decisionFill?:string; exceptionFill?:string; startEndFill?:string;
  };
}