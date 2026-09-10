import {useCallback, useMemo, useRef} from "react";
import {
  ReactFlow, ReactFlowProvider, Background, MarkerType,
  type Connection, type Edge, type Node, type OnConnect, type NodeMouseHandler, type OnNodeDrag
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {NodeKind, Panel} from "../types";
import FlowNodeView from "./FlowNodeView";
import LaneRowView from "./LaneRowView";
import FlowEdgeView from "./FlowEdgeView";
import {canvasSize, flowWidth, laneIndexForY, laneRowY, NODE_H, NODE_W} from "./layout";
import {ICON_LABELS, type IconKey} from "./icons";

const nodeTypes={flowNode:FlowNodeView, laneRow:LaneRowView};
const edgeTypes={flowEdge:FlowEdgeView};

const KIND_STYLE:Record<NodeKind,{strokeKey:"process"|"decision"|"exception"|"startEnd"; stroke:string}>={
  start:{strokeKey:"startEnd",stroke:"#159447"}, end:{strokeKey:"startEnd",stroke:"#159447"},
  process:{strokeKey:"process",stroke:"#2867D4"}, decision:{strokeKey:"decision",stroke:"#E3A10C"},
  exception:{strokeKey:"exception",stroke:"#EF2B2D"}
};

function fillFor(kind:NodeKind, fills:{process:string;decision:string;exception:string;startEnd:string}){
  return kind==="decision"?fills.decision : kind==="exception"?fills.exception
    : (kind==="start"||kind==="end")?fills.startEnd : fills.process;
}

let uid=1;
function nextId(prefix:string){ return `${prefix}${Date.now().toString(36)}${(uid++).toString(36)}`; }

export interface PanelCanvasProps{
  panel:Panel;
  accentColor:string;
  fills:{process:string;decision:string;exception:string;startEnd:string};
  flaggedNodeIds:Set<string>;
  onChange:(next:Panel)=>void;
  onSelectNode:(nodeId:string|null)=>void;
  onDuplicatePanel:()=>void;
  onDeletePanel:()=>void;
  canDeletePanel:boolean;
  /** true when rendered inside the popout modal (fills the modal body height instead of a fixed card height) */
  expanded?:boolean;
  /** omitted (no button shown) when this instance is itself inside the popout modal */
  onTogglePopout?:()=>void;
}

export default function PanelCanvas(props:PanelCanvasProps){
  return <ReactFlowProvider><PanelCanvasInner {...props}/></ReactFlowProvider>;
}

function PanelCanvasInner({panel,accentColor,fills,flaggedNodeIds,onChange,onSelectNode,onDuplicatePanel,onDeletePanel,canDeletePanel,expanded,onTogglePopout}:PanelCanvasProps){
  const {width,height}=canvasSize(panel);
  const flowW=flowWidth(panel);
  const selectedKindRef=useRef<NodeKind>("process");

  const updateNodeLabel=useCallback((nodeId:string,label:string)=>{
    onChange({...panel, nodes:panel.nodes.map(n=>n.id===nodeId?{...n,data:{...n.data,label}}:n)});
  },[panel,onChange]);

  const updateNodeResize=useCallback((nodeId:string,w:number,h:number)=>{
    onChange({...panel, nodes:panel.nodes.map(n=>n.id===nodeId?{...n,data:{...n.data,width:Math.round(w),height:Math.round(h)}}:n)});
  },[panel,onChange]);

  const updateEdgeLabel=useCallback((edgeId:string,label:string)=>{
    onChange({...panel, edges:panel.edges.map(e=>e.id===edgeId?{...e,label}:e)});
  },[panel,onChange]);

  const toggleEdgeException=useCallback((edgeId:string)=>{
    onChange({...panel, edges:panel.edges.map(e=>e.id===edgeId?{...e,exception:!e.exception}:e)});
  },[panel,onChange]);

  const rfNodes:Node[]=useMemo(()=>{
    const labelColW=width-flowW;
    const laneNodes:Node[]=panel.lanes.flatMap((l,i)=>{
      const row=laneRowY(panel,i);
      const band:Node={
        id:`laneband:${l.id}`, type:"laneRow", position:{x:0,y:row.top},
        data:{variant:"band",index:i}, draggable:false, selectable:false, connectable:false, focusable:false,
        width:flowW, height:row.height, style:{width:flowW,height:row.height,pointerEvents:"none"}, zIndex:0
      };
      const label:Node={
        id:`lanelabel:${l.id}`, type:"laneRow", position:{x:flowW,y:row.top},
        data:{variant:"label",name:l.name,icon:l.icon,index:i}, draggable:false, selectable:false, connectable:false, focusable:false,
        width:labelColW, height:row.height, style:{width:labelColW,height:row.height,pointerEvents:"none"}, zIndex:0
      };
      return [band,label];
    });
    const flowNodes:Node[]=panel.nodes.map(n=>{
      const w=n.data.width||NODE_W, h=n.data.height||NODE_H;
      const style=KIND_STYLE[n.data.kind];
      return {
        id:n.id, type:"flowNode", position:{x:n.x-w/2,y:n.y-h/2}, width:w, height:h, zIndex:10,
        data:{
          label:n.data.label, kind:n.data.kind, laneId:n.data.laneId, source:n.data.source,
          fill:fillFor(n.data.kind,fills), stroke:style.stroke,
          selectedForValidation:flaggedNodeIds.has(n.id),
          onLabelChange:(label:string)=>updateNodeLabel(n.id,label),
          onResizeEnd:(w2:number,h2:number)=>updateNodeResize(n.id,w2,h2)
        }
      };
    });
    return [...laneNodes,...flowNodes];
  },[panel,fills,flaggedNodeIds,width,flowW,updateNodeLabel,updateNodeResize]);

  const rfEdges:Edge[]=useMemo(()=>panel.edges.map(e=>({
    id:e.id, source:e.source, target:e.target, type:"flowEdge", zIndex:5,
    markerEnd:{type:MarkerType.ArrowClosed, color:e.exception?"#EF2B2D":"#111827"},
    data:{
      label:e.label, exception:e.exception,
      onLabelChange:(label:string)=>updateEdgeLabel(e.id,label),
      onToggleException:()=>toggleEdgeException(e.id)
    }
  })),[panel.edges,updateEdgeLabel,toggleEdgeException]);

  const onConnect:OnConnect=useCallback((c:Connection)=>{
    if(!c.source||!c.target||c.source===c.target) return;
    const id=nextId("e");
    onChange({...panel, edges:[...panel.edges,{id,source:c.source,target:c.target}]});
  },[panel,onChange]);

  const onNodeDragStop:OnNodeDrag=useCallback((_evt,node)=>{
    if(node.type!=="flowNode") return;
    const w=node.width||NODE_W, h=node.height||NODE_H;
    const centerX=node.position.x+w/2, centerY=node.position.y+h/2;
    const laneIdx=laneIndexForY(panel,centerY);
    const snapCenterY=laneRowY(panel,laneIdx).center;
    const clampedX=Math.min(flowW-w/2,Math.max(w/2,centerX));
    onChange({...panel, nodes:panel.nodes.map(n=>n.id===node.id
      ? {...n, x:Math.round(clampedX), y:Math.round(snapCenterY), data:{...n.data, laneId:panel.lanes[laneIdx]?.id||n.data.laneId}}
      : n)});
  },[panel,onChange,flowW]);

  const onNodeClick:NodeMouseHandler=useCallback((_evt,node)=>{
    if(node.type==="flowNode") onSelectNode(node.id);
  },[onSelectNode]);

  const onPaneClick=useCallback(()=>onSelectNode(null),[onSelectNode]);

  function addNode(kind:NodeKind){
    const laneId=panel.lanes[0]?.id||"";
    const id=nextId("n");
    const defaultLabel:Record<NodeKind,string>={start:"بداية",process:"خطوة جديدة",decision:"سؤال؟",exception:"استثناء",end:"نهاية"};
    onChange({...panel, nodes:[...panel.nodes,{id,x:flowW/2,y:laneRowY(panel,0).center,data:{label:defaultLabel[kind],laneId,kind}}]});
  }

  function deleteSelected(){
    const selIds=new Set(currentSelectedNodeIds());
    if(selIds.size===0) return;
    onChange({
      ...panel,
      nodes:panel.nodes.filter(n=>!selIds.has(n.id)),
      edges:panel.edges.filter(e=>!selIds.has(e.source)&&!selIds.has(e.target))
    });
    onSelectNode(null);
  }

  // selection tracking without extra re-renders: read straight from rfNodes via DOM class is unreliable,
  // so we keep a lightweight ref updated by ReactFlow's onSelectionChange.
  const selectedIdsRef=useRef<Set<string>>(new Set());
  function currentSelectedNodeIds(){ return Array.from(selectedIdsRef.current); }

  function alignCenter(){
    const ids=currentSelectedNodeIds(); if(ids.length<2) return;
    const targets=panel.nodes.filter(n=>ids.includes(n.id));
    const avgX=Math.round(targets.reduce((s,n)=>s+n.x,0)/targets.length);
    onChange({...panel, nodes:panel.nodes.map(n=>ids.includes(n.id)?{...n,x:avgX}:n)});
  }

  function equalSize(dim:"width"|"height"){
    const ids=currentSelectedNodeIds(); if(ids.length<2) return;
    const targets=panel.nodes.filter(n=>ids.includes(n.id));
    const ref=(dim==="width"?targets[0].data.width:targets[0].data.height)||(dim==="width"?NODE_W:NODE_H);
    onChange({...panel, nodes:panel.nodes.map(n=>ids.includes(n.id)?{...n,data:{...n.data,[dim]:ref}}:n)});
  }

  function distributeVertically(){
    const ids=currentSelectedNodeIds(); if(ids.length<3) return;
    const targets=panel.nodes.filter(n=>ids.includes(n.id)).sort((a,b)=>a.y-b.y);
    const first=targets[0].y, last=targets[targets.length-1].y;
    const step=(last-first)/(targets.length-1);
    const newY=new Map(targets.map((n,i)=>[n.id,Math.round(first+i*step)]));
    onChange({...panel, nodes:panel.nodes.map(n=>newY.has(n.id)?{...n,y:newY.get(n.id)!}:n)});
  }

  function addLane(){
    const id=nextId("lane");
    onChange({...panel, lanes:[...panel.lanes,{id,name:"مسار جديد"}]});
  }
  function renameLane(laneId:string,name:string){
    onChange({...panel, lanes:panel.lanes.map(l=>l.id===laneId?{...l,name}:l)});
  }
  function setLaneIcon(laneId:string,icon:string){
    onChange({...panel, lanes:panel.lanes.map(l=>l.id===laneId?{...l,icon:icon||undefined}:l)});
  }
  function deleteLane(laneId:string){
    if(panel.lanes.length<=1) return;
    onChange({...panel, lanes:panel.lanes.filter(l=>l.id!==laneId)});
  }
  function moveLane(laneId:string,dir:-1|1){
    const idx=panel.lanes.findIndex(l=>l.id===laneId);
    const swapIdx=idx+dir;
    if(idx<0||swapIdx<0||swapIdx>=panel.lanes.length) return;
    const lanes=[...panel.lanes];
    [lanes[idx],lanes[swapIdx]]=[lanes[swapIdx],lanes[idx]];
    onChange({...panel,lanes});
  }

  return <section className={`panel-block ${expanded?"expanded":""}`}>
    <div className={`panel-head ${panel.accent}`} style={{background:accentColor}}>
      <span>{panel.title}</span>
      <div className="panel-head-actions">
        {onTogglePopout && <button onClick={onTogglePopout} title="Expand / popout">⤢</button>}
        {!expanded && <button onClick={onDuplicatePanel} title="Duplicate panel">⧉</button>}
        {!expanded && canDeletePanel && <button onClick={onDeletePanel} title="Delete panel">✕</button>}
      </div>
    </div>

    <div className="panel-toolbar">
      <select onChange={e=>selectedKindRef.current=e.target.value as NodeKind} defaultValue="process">
        <option value="start">Start</option>
        <option value="process">Process</option>
        <option value="decision">Decision</option>
        <option value="exception">Exception</option>
        <option value="end">End</option>
      </select>
      <button onClick={()=>addNode(selectedKindRef.current)}>+ Node</button>
      <button onClick={deleteSelected}>Delete selected</button>
      <span className="sep"/>
      <button onClick={alignCenter}>Align center</button>
      <button onClick={()=>equalSize("width")}>Equal widths</button>
      <button onClick={()=>equalSize("height")}>Equal heights</button>
      <button onClick={distributeVertically}>Distribute vertically</button>
    </div>

    <div className="lane-toolbar">
      {panel.lanes.map((l,i)=>
        <div className="lane-chip" key={l.id}>
          <select value={l.icon||""} onChange={e=>setLaneIcon(l.id,e.target.value)} title="Lane icon" className="lane-icon-select">
            <option value="">—</option>
            {(Object.keys(ICON_LABELS) as IconKey[]).map(k=><option key={k} value={k}>{ICON_LABELS[k]}</option>)}
          </select>
          <input value={l.name} onChange={e=>renameLane(l.id,e.target.value)}/>
          <button disabled={i===0} onClick={()=>moveLane(l.id,-1)} title="Move up">↑</button>
          <button disabled={i===panel.lanes.length-1} onClick={()=>moveLane(l.id,1)} title="Move down">↓</button>
          <button disabled={panel.lanes.length<=1} onClick={()=>deleteLane(l.id)} title="Delete lane">✕</button>
        </div>
      )}
      <button onClick={addLane}>+ Lane</button>
    </div>

    <div className="rf-canvas" style={expanded?undefined:{height:Math.min(720,height+40)}}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onSelectionChange={({nodes})=>{ selectedIdsRef.current=new Set(nodes.filter(n=>n.type==="flowNode").map(n=>n.id)); }}
        onNodesChange={(changes)=>{
          const removals=changes.filter(c=>c.type==="remove").map(c=>(c as {id:string}).id);
          if(removals.length){
            onChange({...panel, nodes:panel.nodes.filter(n=>!removals.includes(n.id)),
              edges:panel.edges.filter(e=>!removals.includes(e.source)&&!removals.includes(e.target))});
          }
        }}
        onEdgesChange={(changes)=>{
          const removals=changes.filter(c=>c.type==="remove").map(c=>(c as {id:string}).id);
          if(removals.length) onChange({...panel, edges:panel.edges.filter(e=>!removals.includes(e.id))});
        }}
        deleteKeyCode={["Backspace","Delete"]}
        selectionOnDrag
        zoomOnDoubleClick={false}
        panOnDrag={[1,2]}
        fitView
        fitViewOptions={{padding:0.06}}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{hideAttribution:true}}
        translateExtent={[[-40,-40],[width+40,height+40]]}
      >
        <Background gap={20} size={1} color="#e2e8f0"/>
      </ReactFlow>
    </div>
  </section>;
}
