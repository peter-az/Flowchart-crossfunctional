import type {NodeProps} from "@xyflow/react";

export interface LaneRowData{ name:string; index:number; [key:string]:unknown; }

export default function LaneRowView({data}:NodeProps & {data:LaneRowData}){
  return <div className={`lane-row ${data.index%2?"odd":"even"}`}>
    <span className="lane-row-label">{data.name}</span>
  </div>;
}
