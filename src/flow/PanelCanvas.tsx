import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, MarkerType, useReactFlow,
  type Connection, type Edge, type Node, type OnConnect, type NodeMouseHandler, type OnNodeDrag
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {FlowNode, NodeKind, Panel} from "../types";
import FlowNodeView from "./FlowNodeView";
import LaneRowView from "./LaneRowView";
import FlowEdgeView from "./FlowEdgeView";
import ContextMenu, {type ContextMenuState} from "./ContextMenu";
import {PALETTE_MIME} from "./ShapePalette";
import {canvasSize, flowWidth, laneIndexForY, laneRowY, NODE_H, NODE_W} from "./layout";
import {ICON_LABELS, type IconKey} from "./icons";
import {KIND_LABEL, resolveShapeStyle} from "./shapeStyle";
import {useMediaQuery, TOUCH_QUERY} from "../useMediaQuery";

const nodeTypes={flowNode:FlowNodeView, laneRow:LaneRowView};
const edgeTypes={flowEdge:FlowEdgeView};

const GRID=10;
const DEFAULT_LABEL:Record<NodeKind,string>={
  start:"بداية", process:"خطوة جديدة", decision:"سؤال؟", exception:"استثناء", end:"نهاية"
};

/** Shapes copied with Ctrl+C, shared across panels so you can paste between them. */
let clipboard:FlowNode[]=[];
/** Which panel keyboard shortcuts apply to — set by interacting with a panel. */
let activePanelId:string|null=null;

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
  // On touch there is no middle/right button, so the desktop pan bindings would leave the
  // canvas unpannable and drag-selection would hijack every swipe.
  const touch=useMediaQuery(TOUCH_QUERY);
  const wrapRef=useRef<HTMLDivElement|null>(null);
  const [menu,setMenu]=useState<ContextMenuState|null>(null);
  const {screenToFlowPosition}=useReactFlow();
  /* Selection lives in state, not a ref: the controlled `nodes` array is rebuilt on every edit,
     so it has to carry `selected` through or styling a shape would immediately deselect it. */
  const [selectedIds,setSelectedIds]=useState<string[]>([]);

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
      return {
        id:n.id, type:"flowNode", position:{x:n.x-w/2,y:n.y-h/2}, width:w, height:h, zIndex:10,
        selected:selectedIds.includes(n.id),
        data:{
          label:n.data.label, kind:n.data.kind, laneId:n.data.laneId, source:n.data.source,
          shape:resolveShapeStyle(n.data.kind,fills,n.data.style),
          selectedForValidation:flaggedNodeIds.has(n.id),
          onLabelChange:(label:string)=>updateNodeLabel(n.id,label),
          onResizeEnd:(w2:number,h2:number)=>updateNodeResize(n.id,w2,h2)
        }
      };
    });
    return [...laneNodes,...flowNodes];
  },[panel,fills,flaggedNodeIds,width,flowW,selectedIds,updateNodeLabel,updateNodeResize]);

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

  /** Places a shape at a point in canvas coordinates, snapping it into whichever lane it lands in. */
  const placeShape=useCallback((kind:NodeKind, at?:{x:number;y:number})=>{
    const x=at?at.x:flowW/2;
    const rawY=at?at.y:laneRowY(panel,0).center;
    const laneIdx=laneIndexForY(panel,rawY);
    const id=nextId("n");
    onChange({...panel, nodes:[...panel.nodes,{
      id,
      x:Math.round(Math.min(flowW-NODE_W/2,Math.max(NODE_W/2,x))),
      y:Math.round(laneRowY(panel,laneIdx).center),
      data:{label:DEFAULT_LABEL[kind], laneId:panel.lanes[laneIdx]?.id||panel.lanes[0]?.id||"", kind}
    }]});
  },[panel,onChange,flowW]);

  function addNode(kind:NodeKind){ placeShape(kind); }

  /** Drop target for the stencil palette. */
  const onDrop=useCallback((e:React.DragEvent)=>{
    const kind=e.dataTransfer.getData(PALETTE_MIME) as NodeKind;
    if(!kind) return;
    e.preventDefault();
    const p=screenToFlowPosition({x:e.clientX,y:e.clientY});
    placeShape(kind,p);
  },[screenToFlowPosition,placeShape]);

  const onDragOver=useCallback((e:React.DragEvent)=>{
    if(e.dataTransfer.types.includes(PALETTE_MIME)){ e.preventDefault(); e.dataTransfer.dropEffect="copy"; }
  },[]);

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

  function currentSelectedNodeIds(){ return selectedIds; }

  const copySelection=useCallback((ids?:string[])=>{
    const sel=ids??currentSelectedNodeIds();
    if(!sel.length) return;
    clipboard=JSON.parse(JSON.stringify(panel.nodes.filter(n=>sel.includes(n.id))));
  },[panel.nodes]);

  /** Pastes the clipboard offset slightly, re-snapped to whichever lane each copy lands in. */
  const paste=useCallback((at?:{x:number;y:number})=>{
    if(!clipboard.length) return;
    const originX=Math.min(...clipboard.map(n=>n.x));
    const originY=Math.min(...clipboard.map(n=>n.y));
    const copies=clipboard.map(n=>{
      const x=at ? at.x+(n.x-originX) : n.x+24;
      const rawY=at ? at.y+(n.y-originY) : n.y+24;
      const laneIdx=laneIndexForY(panel,rawY);
      return {
        ...n, id:nextId("n"),
        x:Math.round(Math.min(flowW-NODE_W/2,Math.max(NODE_W/2,x))),
        y:Math.round(laneRowY(panel,laneIdx).center),
        data:{...n.data, laneId:panel.lanes[laneIdx]?.id||n.data.laneId}
      };
    });
    onChange({...panel, nodes:[...panel.nodes,...copies]});
  },[panel,onChange,flowW]);

  const duplicateSelection=useCallback(()=>{
    const sel=currentSelectedNodeIds();
    if(!sel.length) return;
    copySelection(sel);
    paste();
  },[copySelection,paste]);

  const nudge=useCallback((dx:number,dy:number)=>{
    const sel=currentSelectedNodeIds();
    if(!sel.length) return;
    onChange({...panel, nodes:panel.nodes.map(n=>{
      if(!sel.includes(n.id)) return n;
      const y=n.y+dy;
      const laneIdx=laneIndexForY(panel,y);
      return {
        ...n,
        x:Math.round(Math.min(flowW-NODE_W/2,Math.max(NODE_W/2,n.x+dx))),
        y:dy?Math.round(laneRowY(panel,laneIdx).center):n.y,
        data:dy?{...n.data,laneId:panel.lanes[laneIdx]?.id||n.data.laneId}:n.data
      };
    })});
  },[panel,onChange,flowW]);

  const deleteIds=useCallback((ids:string[])=>{
    if(!ids.length) return;
    onChange({
      ...panel,
      nodes:panel.nodes.filter(n=>!ids.includes(n.id)),
      edges:panel.edges.filter(e=>!ids.includes(e.source)&&!ids.includes(e.target))
    });
    onSelectNode(null);
  },[panel,onChange,onSelectNode]);

  // Diagramming-tool keyboard muscle memory, scoped to the panel last interacted with
  // (hover would be unreliable on desktop and simply absent on touch).
  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      if(activePanelId!==panel.id) return;
      const target=e.target as HTMLElement|null;
      if(target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const mod=e.ctrlKey||e.metaKey;
      if(mod && e.key.toLowerCase()==="c"){ copySelection(); }
      else if(mod && e.key.toLowerCase()==="v"){ e.preventDefault(); paste(); }
      else if(mod && e.key.toLowerCase()==="d"){ e.preventDefault(); duplicateSelection(); }
      else if(!mod && e.key.startsWith("Arrow")){
        const step=e.shiftKey?GRID*4:GRID;
        const map:Record<string,[number,number]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};
        const d=map[e.key];
        if(d){ e.preventDefault(); nudge(d[0],d[1]); }
      }
    }
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[panel.id,copySelection,paste,duplicateSelection,nudge]);

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

    <div className="rf-canvas" ref={wrapRef} style={expanded?undefined:{height:Math.min(720,height+40)}}
      onDrop={onDrop} onDragOver={onDragOver} onPointerDownCapture={()=>{activePanelId=panel.id;}}>
      <ContextMenu state={menu} onClose={()=>setMenu(null)}/>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={(e,node)=>{
          if(node.type!=="flowNode") return;
          e.preventDefault();
          const sel=currentSelectedNodeIds();
          const ids=sel.includes(node.id)?sel:[node.id];
          setMenu({x:e.clientX,y:e.clientY,items:[
            {label:"نسخ",onClick:()=>copySelection(ids)},
            {label:"تكرار",onClick:()=>{copySelection(ids); paste();}},
            {label:"لصق",onClick:()=>paste(),disabled:clipboard.length===0},
            {label:"حذف",onClick:()=>deleteIds(ids),danger:true}
          ]});
        }}
        onPaneContextMenu={e=>{
          e.preventDefault();
          const ev=e as unknown as MouseEvent;
          const at=screenToFlowPosition({x:ev.clientX,y:ev.clientY});
          setMenu({x:ev.clientX,y:ev.clientY,items:[
            {label:"لصق هنا",onClick:()=>paste(at),disabled:clipboard.length===0},
            ...(["process","decision","start","end","exception"] as NodeKind[]).map(k=>(
              {label:`إضافة: ${KIND_LABEL[k]}`,onClick:()=>placeShape(k,at)}
            ))
          ]});
        }}
        onNodesChange={(changes)=>{
          /* `nodes` is controlled, so React Flow's own selection is whatever we pass back:
             select changes have to be folded into our state or nothing ever appears selected. */
          const selects=changes.filter(c=>c.type==="select") as {id:string; selected:boolean}[];
          if(selects.length){
            const next=new Set(selectedIds);
            for(const c of selects){ if(c.selected) next.add(c.id); else next.delete(c.id); }
            const ids=Array.from(next).sort();
            if(ids.join(",")!==selectedIds.join(",")) setSelectedIds(ids);
            activePanelId=panel.id;
          }
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
        selectionOnDrag={!touch}
        zoomOnDoubleClick={false}
        panOnDrag={touch?true:[1,2]}
        fitView
        fitViewOptions={{padding:0.06}}
        minZoom={0.2}
        maxZoom={2}
        snapToGrid
        snapGrid={[GRID,GRID]}
        proOptions={{hideAttribution:true}}
        translateExtent={[[-40,-40],[width+40,height+40]]}
      >
        <Background gap={GRID*2} size={1} color="var(--grid-dot)"/>
        <Controls showInteractive={false} position="bottom-left"/>
        {!touch && <MiniMap pannable zoomable position="bottom-right"
          nodeColor={n=>n.type==="flowNode"?((n.data as {shape?:{fill?:string}}).shape?.fill||"#cbd5e1"):"#eef2f6"}
          maskColor="rgba(15,23,42,.06)"/>}
      </ReactFlow>
    </div>
  </section>;
}
