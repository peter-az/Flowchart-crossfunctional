import type {NodeProps} from "@xyflow/react";
import {LaneIcon} from "./icons";

export interface LaneRowData{ variant:"band"|"label"; name?:string; index:number; icon?:string; [key:string]:unknown; }

export default function LaneRowView({data}:NodeProps & {data:LaneRowData}){
  if(data.variant==="band"){
    return <div className={`lane-row lane-band ${data.index%2?"odd":"even"}`}/>;
  }
  return <div className={`lane-row lane-label-cell ${data.index%2?"odd":"even"}`}>
    <LaneIcon icon={data.icon} className="lane-row-icon"/>
    <span className="lane-row-label">{data.name}</span>
  </div>;
}
