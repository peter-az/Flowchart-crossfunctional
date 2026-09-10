import type {Department, FlowNode, NodeKind, Panel, Project} from "../types";
import {PAGE_SIZES, resolveTheme} from "../themes";
import {canvasSize, flowWidth, LABEL_COL_RATIO} from "../flow/layout";
import {LaneIcon} from "../flow/icons";

const STROKE:Record<NodeKind,string>={
  start:"#159447", end:"#159447", process:"#2867D4", decision:"#E3A10C", exception:"#EF2B2D"
};

const SLIDE_W=1600;
const PAD=44, MASTHEAD_H=58, TITLE_H=74, PANEL_HEAD_H=38, LEGEND_H=52, FOOTER_H=26, PANEL_GAP=18;

interface Box{ cx:number; cy:number; w:number; h:number; }

function fillFor(kind:NodeKind, t:ReturnType<typeof resolveTheme>){
  return kind==="decision"?t.decisionFill : kind==="exception"?t.exceptionFill
    : (kind==="start"||kind==="end")?t.startEndFill : t.processFill;
}

/** Elbow path from source node to target node, routing around to the left when the edge runs backwards. */
function elbowPath(a:Box, b:Box, exception:boolean){
  const forward=b.cy>a.cy+1;
  if(forward){
    const sy=a.cy+a.h/2, ty=b.cy-b.h/2;
    if(Math.abs(a.cx-b.cx)<2) return {d:`M ${a.cx} ${sy} L ${b.cx} ${ty}`, lx:(a.cx+b.cx)/2, ly:(sy+ty)/2};
    const midY=(sy+ty)/2;
    return {d:`M ${a.cx} ${sy} L ${a.cx} ${midY} L ${b.cx} ${midY} L ${b.cx} ${ty}`, lx:(a.cx+b.cx)/2, ly:midY};
  }
  // backward / lateral: exit the left edge, travel vertically, re-enter the target's left edge
  const outX=Math.max(10, Math.min(a.cx-a.w/2, b.cx-b.w/2)-46);
  const sx=a.cx-a.w/2, tx=b.cx-b.w/2;
  return {
    d:`M ${sx} ${a.cy} L ${outX} ${a.cy} L ${outX} ${b.cy} L ${tx} ${b.cy}`,
    lx:outX, ly:(a.cy+b.cy)/2, dashHint:exception
  };
}

function PanelView({panel, theme, accent, bodyH, width}:{
  panel:Panel; theme:ReturnType<typeof resolveTheme>; accent:string; bodyH:number; width:number;
}){
  const lanes=panel.lanes.length||1;
  const rowH=bodyH/lanes;
  const labelW=width*LABEL_COL_RATIO;
  const flowPx=width-labelW;
  const logical=canvasSize(panel);
  const scaleX=flowPx/flowWidth(panel);
  const scaleY=bodyH/logical.height;

  const boxes=new Map<string,Box>();
  for(const n of panel.nodes){
    boxes.set(n.id,{
      cx:n.x*scaleX, cy:n.y*scaleY,
      w:(n.data.width||190)*scaleX, h:(n.data.height||64)*scaleY
    });
  }

  return <div className="xslide-panel" style={{width}}>
    <div className="xslide-panel-head" style={{background:accent, height:PANEL_HEAD_H}}>{panel.title}</div>
    <div className="xslide-panel-body" style={{height:bodyH}}>
      {panel.lanes.map((lane,i)=>
        <div key={lane.id} className="xslide-lane-row" style={{top:i*rowH, height:rowH}}>
          {/* absolute halves: the row must not re-order under RTL, since nodes are placed from the physical left */}
          <div className="xslide-lane-flow" style={{left:0, width:flowPx}}/>
          <div className="xslide-lane-label" style={{left:flowPx, width:labelW}}>
            <LaneIcon icon={lane.icon} size={22}/>
            <span>{lane.name}</span>
          </div>
        </div>
      )}

      <svg className="xslide-edges" width={flowPx} height={bodyH} viewBox={`0 0 ${flowPx} ${bodyH}`}>
        <defs>
          <marker id="xs-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#111827"/>
          </marker>
          <marker id="xs-arrow-x" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#EF2B2D"/>
          </marker>
        </defs>
        {panel.edges.map(e=>{
          const a=boxes.get(e.source), b=boxes.get(e.target);
          if(!a||!b) return null;
          const {d}=elbowPath(a,b,!!e.exception);
          return <path key={e.id} d={d} fill="none"
            stroke={e.exception?"#EF2B2D":"#111827"} strokeWidth={1.8}
            strokeDasharray={e.exception?"7 4":undefined}
            markerEnd={`url(#${e.exception?"xs-arrow-x":"xs-arrow"})`}/>;
        })}
      </svg>

      {panel.edges.filter(e=>e.label).map(e=>{
        const a=boxes.get(e.source), b=boxes.get(e.target);
        if(!a||!b) return null;
        const {lx,ly}=elbowPath(a,b,!!e.exception);
        return <span key={e.id} className={`xslide-edge-label ${e.exception?"x":""}`} style={{left:lx, top:ly}}>{e.label}</span>;
      })}

      {panel.nodes.map((n:FlowNode)=>{
        const box=boxes.get(n.id)!;
        const kind=n.data.kind;
        const shape=kind==="decision"?"diamond":(kind==="start"||kind==="end")?"pill":"rect";
        return <div key={n.id} className={`xslide-node ${shape}`}
          style={{
            left:box.cx-box.w/2, top:box.cy-box.h/2, width:box.w, height:box.h,
            background:fillFor(kind,theme), borderColor:STROKE[kind]
          }}>
          <span>{n.data.label.split("\n").map((l,i)=><span key={i} className="xslide-node-line">{l}</span>)}</span>
        </div>;
      })}
    </div>
  </div>;
}

export default function SlideView({project, dept, pageIndex}:{project:Project; dept:Department; pageIndex:number}){
  const theme=resolveTheme(project.theme);
  const page=PAGE_SIZES[theme.pageSize];
  const slideH=Math.round(SLIDE_W*(page.height/page.width));

  const panelsAreaH=slideH-PAD*2-MASTHEAD_H-TITLE_H-LEGEND_H-FOOTER_H-24;
  const bodyH=panelsAreaH-PANEL_HEAD_H;
  const count=Math.max(1,dept.panels.length);
  const panelW=(SLIDE_W-PAD*2-PANEL_GAP*(count-1))/count;

  return <div className="xslide" dir="rtl"
    style={{width:SLIDE_W, height:slideH, padding:PAD, fontFamily:theme.fontFamily}}>

    <div className="xslide-masthead" dir="ltr" style={{height:MASTHEAD_H}}>
      <span className="xslide-masthead-label">CROSS-FUNCTIONAL FLOWCHART</span>
      <div className="xslide-masthead-title">
        <div className="xslide-t1" dir="rtl">{project.title}</div>
        <div className="xslide-t2" dir="rtl">{project.subtitle}</div>
      </div>
    </div>
    <div className="xslide-rule"/>

    <div className="xslide-title" style={{height:TITLE_H}}>
      <div className="xslide-dept">{dept.name}</div>
      <div className="xslide-dept-sub">{dept.subtitle}</div>
    </div>

    <div className="xslide-panels" style={{gap:PANEL_GAP, height:panelsAreaH}}>
      {dept.panels.map(panel=>
        <PanelView key={panel.id} panel={panel} theme={theme} bodyH={bodyH} width={panelW}
          accent={panel.accent==="teal"?theme.teal:theme.mainBlue}/>
      )}
    </div>

    <div className="xslide-legend" style={{height:LEGEND_H}}>
      <span className="xslide-lg"><i className="sw pill" style={{background:theme.startEndFill,borderColor:"#159447"}}/>بداية / نهاية</span>
      <span className="xslide-lg"><i className="sw rect" style={{background:theme.processFill,borderColor:"#2867D4"}}/>عملية</span>
      <span className="xslide-lg"><i className="sw dia" style={{background:theme.decisionFill,borderColor:"#E3A10C"}}/>قرار</span>
      <span className="xslide-lg"><i className="sw rect" style={{background:theme.exceptionFill,borderColor:"#EF2B2D"}}/>رفض / إعادة عمل</span>
      <span className="xslide-lg"><svg width="38" height="12" viewBox="0 0 38 12"><line x1="36" y1="6" x2="10" y2="6" stroke="#111827" strokeWidth="2"/><polygon points="10,1 2,6 10,11" fill="#111827"/></svg>تدفق رئيسي</span>
      <span className="xslide-lg"><svg width="38" height="12" viewBox="0 0 38 12"><line x1="36" y1="6" x2="10" y2="6" stroke="#EF2B2D" strokeWidth="2" strokeDasharray="5 3"/><polygon points="10,1 2,6 10,11" fill="#EF2B2D"/></svg>تدفق إعادة عمل / استثناء</span>
    </div>

    <div className="xslide-footer" dir="ltr" style={{height:FOOTER_H}}>
      <span>Source: {dept.sourcePages?`pages ${dept.sourcePages}`:(project.sourceFileName||"—")}</span>
      <span className="xslide-note" dir="rtl">{dept.footerNote||""}</span>
      <span className="xslide-page">{pageIndex}</span>
    </div>
  </div>;
}
