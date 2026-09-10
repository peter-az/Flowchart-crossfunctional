import {useState} from "react";
import {Handle, NodeResizer, Position, type NodeProps} from "@xyflow/react";
import type {NodeKind, SourceRef} from "../types";
import type {ResolvedShapeStyle} from "./shapeStyle";

export interface FlowNodeData{
  label:string; kind:NodeKind; laneId:string; source?:SourceRef;
  shape:ResolvedShapeStyle; selectedForValidation?:boolean;
  onLabelChange:(label:string)=>void;
  onResizeEnd:(width:number,height:number)=>void;
  [key:string]: unknown;
}

const shapeClass:Record<NodeKind,string>={
  start:"shape-pill", end:"shape-pill", process:"shape-rect", decision:"shape-diamond", exception:"shape-rect exception"
};

export default function FlowNodeView({data,selected}:NodeProps & {data:FlowNodeData}){
  const [editing,setEditing]=useState(false);
  const [text,setText]=useState(data.label);
  const s=data.shape;

  function commit(){
    setEditing(false);
    if(text!==data.label) data.onLabelChange(text);
  }

  return <div
    className={`rf-node ${shapeClass[data.kind]} ${data.selectedForValidation?"flagged":""}`}
    style={{
      background:s.fill, borderColor:s.stroke, borderWidth:s.strokeWidth,
      borderRadius:s.radius, color:s.textColor, fontSize:s.fontSize,
      fontWeight:s.bold?700:500
    }}
    onDoubleClick={e=>{e.stopPropagation(); setText(data.label); setEditing(true);}}
  >
    <NodeResizer isVisible={selected} minWidth={80} minHeight={40} handleStyle={{width:8,height:8}}
      onResizeEnd={(_e,params)=>data.onResizeEnd(params.width,params.height)}/>
    <Handle type="target" position={Position.Top} className="rf-handle"/>
    {editing
      ? <textarea
          className="node-edit"
          autoFocus
          value={text}
          onChange={e=>setText(e.target.value)}
          onBlur={commit}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();commit();} if(e.key==="Escape"){setText(data.label);setEditing(false);} }}
        />
      : <div className="node-label">{data.label.split("\n").map((l,i)=><div key={i}>{l}</div>)}</div>
    }
    <Handle type="source" position={Position.Bottom} className="rf-handle"/>
  </div>;
}
