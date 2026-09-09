import {useState} from "react";
import {BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps} from "@xyflow/react";

export interface FlowEdgeData{
  label?:string; exception?:boolean;
  onLabelChange:(label:string)=>void;
  onToggleException:()=>void;
  [key:string]: unknown;
}

export default function FlowEdgeView({id,sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,data,selected,markerEnd}:EdgeProps & {data:FlowEdgeData}){
  const [editing,setEditing]=useState(false);
  const [text,setText]=useState(data?.label||"");
  const [path,labelX,labelY]=getSmoothStepPath({sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,borderRadius:8});
  const exception=!!data?.exception;

  function commit(){ setEditing(false); if(text!==(data?.label||"")) data.onLabelChange(text); }

  return <>
    <BaseEdge id={id} path={path} markerEnd={markerEnd}
      style={{stroke:exception?"#EF2B2D":"#111827", strokeWidth:selected?2.5:1.6, strokeDasharray:exception?"6 4":undefined}}/>
    <EdgeLabelRenderer>
      <div className="edge-label-wrap" style={{transform:`translate(-50%,-50%) translate(${labelX}px,${labelY}px)`}}>
        {editing
          ? <input autoFocus value={text} onChange={e=>setText(e.target.value)}
              onBlur={commit}
              onKeyDown={e=>{ if(e.key==="Enter"){commit();} if(e.key==="Escape"){setText(data?.label||"");setEditing(false);} }}/>
          : <div className={`edge-label ${exception?"exception":""}`} onDoubleClick={e=>{e.stopPropagation();setText(data?.label||"");setEditing(true);}}>
              {data?.label || <span className="placeholder">+ label</span>}
            </div>
        }
        <button type="button" className={`edge-toggle ${exception?"exception":""}`}
          title={exception?"Exception edge — click to make main":"Main edge — click to make exception"}
          onClick={data.onToggleException}>{exception?"⚠":"✓"}</button>
      </div>
    </EdgeLabelRenderer>
  </>;
}
