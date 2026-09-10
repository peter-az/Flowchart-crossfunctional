import pptxgen from "pptxgenjs";
import type {Department, Project} from "./types";
import {PAGE_SIZES, resolveTheme} from "./themes";
import {loadImage} from "./exportImage";
import {LABEL_COL_RATIO} from "./flow/layout";
import {resolveShapeStyle} from "./flow/shapeStyle";

function hex(c:string){ return c.replace("#",""); }

async function buildPptx(project:Project, departments:Department[]){
  const theme=resolveTheme(project.theme);
  const layout=PAGE_SIZES[theme.pageSize];

  const pptx=new pptxgen();
  pptx.defineLayout({name:layout.name, width:layout.width, height:layout.height});
  pptx.layout=layout.name;
  pptx.rtlMode=true;

  const C={
    blue:hex(theme.mainBlue), teal:hex(theme.teal),
    process:hex(theme.processFill), decision:hex(theme.decisionFill),
    exception:hex(theme.exceptionFill), start:hex(theme.startEndFill)
  };
  const W=layout.width, H=layout.height;

  for(const dept of departments){
    const slide=pptx.addSlide();
    slide.background={color:"FFFFFF"};

    slide.addText("CROSS-FUNCTIONAL FLOWCHART",{x:.4,y:.18,w:3.5,h:.25,fontFace:theme.fontFamily,fontSize:10,bold:true,color:"5F7190",align:"left"});
    slide.addText(project.title,{x:W-4.8,y:.14,w:4.4,h:.35,fontFace:theme.fontFamily,fontSize:20,bold:true,color:"0B2A58",align:"right",rtlMode:true});
    slide.addText(project.subtitle,{x:W-5.6,y:.5,w:5.2,h:.22,fontFace:theme.fontFamily,fontSize:9,color:"7C8AA0",align:"right",rtlMode:true});
    slide.addShape(pptx.ShapeType.line,{x:.4,y:.82,w:W-.8,h:0,line:{color:"CDD7E3",width:.7}});
    slide.addText(dept.name,{x:W/2-3.2,y:.9,w:6.4,h:.4,fontFace:theme.fontFamily,fontSize:22,bold:true,color:"0B2A58",align:"center",rtlMode:true});

    const count=Math.max(1,dept.panels.length),gap=.18,totalW=W-.8,pw=(totalW-gap*(count-1))/count,px=.4,py=1.45,ph=H-2.35;
    dept.panels.forEach((panel,pi)=>{
      const x=px+pi*(pw+gap), header=panel.accent==="teal"?C.teal:C.blue;
      const canvasW=panel.canvasWidth||680, canvasH=panel.canvasHeight||Math.max(1,panel.lanes.length)*130;
      const flowW=canvasW*(1-LABEL_COL_RATIO);

      slide.addShape(pptx.ShapeType.roundRect,{x,y:py,w:pw,h:ph,fill:{color:"FFFFFF",transparency:100},line:{color:"C4D0DE",width:1}});
      slide.addShape(pptx.ShapeType.rect,{x,y:py,w:pw,h:.34,fill:{color:header},line:{color:header}});
      slide.addText(panel.title,{x,y:py+.02,w:pw,h:.28,fontFace:theme.fontFamily,fontSize:14,bold:true,color:"FFFFFF",align:"center",rtlMode:true});

      const laneW=pw*LABEL_COL_RATIO,bodyY=py+.34,bodyH=ph-.34,laneH=bodyH/Math.max(1,panel.lanes.length),cw=pw-laneW;
      panel.lanes.forEach((lane,i)=>{
        const ly=bodyY+i*laneH;
        slide.addShape(pptx.ShapeType.rect,{x:x+pw-laneW,y:ly,w:laneW,h:laneH,fill:{color:i%2?"F8FAFC":"F3F6F9"},line:{color:"D9E2EC",width:.5}});
        slide.addText(lane.name,{x:x+pw-laneW+.03,y:ly+.02,w:laneW-.06,h:laneH-.04,fontFace:theme.fontFamily,fontSize:8.5,bold:true,color:"124B91",align:"center",valign:"middle",rtlMode:true,margin:.02});
      });

      panel.edges.forEach(e=>{
        const a=panel.nodes.find(n=>n.id===e.source),b=panel.nodes.find(n=>n.id===e.target); if(!a||!b)return;
        const ax=x+(a.x/flowW)*cw, ay=bodyY+(a.y/canvasH)*bodyH, bx=x+(b.x/flowW)*cw, by=bodyY+(b.y/canvasH)*bodyH;
        slide.addShape(pptx.ShapeType.line,{x:ax,y:ay,w:bx-ax,h:by-ay,
          line:{color:e.exception?"EF2B2D":"111827",width:1,dashType:e.exception?"dash":"solid",endArrowType:"triangle"}});
        if(e.label){
          slide.addText(e.label,{x:Math.min(ax,bx),y:Math.min(ay,by)-.14,w:Math.max(.4,Math.abs(bx-ax)),h:.16,
            fontFace:theme.fontFamily,fontSize:7.5,bold:true,color:e.exception?"C81E1E":"334155",align:"center",rtlMode:true});
        }
      });

      panel.nodes.forEach(n=>{
        const kind=n.data.kind;
        const s=resolveShapeStyle(kind,{process:theme.processFill,decision:theme.decisionFill,exception:theme.exceptionFill,startEnd:theme.startEndFill},n.data.style);
        const st=kind==="decision"?pptx.ShapeType.diamond:pptx.ShapeType.roundRect;
        const nw=(n.data.width||190)/flowW*cw, nh=(n.data.height||64)/canvasH*bodyH;
        const nx=x+(n.x/flowW)*cw-nw/2, ny=bodyY+(n.y/canvasH)*bodyH-nh/2;
        slide.addShape(st,{x:nx,y:ny,w:nw,h:nh,fill:{color:hex(s.fill)},line:{color:hex(s.stroke),width:s.strokeWidth*.55}});
        slide.addText(n.data.label,{x:nx+.03,y:ny+.02,w:nw-.06,h:nh-.04,fontFace:theme.fontFamily,
          fontSize:s.fontSize*.7,bold:s.bold,color:hex(s.textColor),align:"center",valign:"middle",rtlMode:true,margin:.02});
      });
    });

    // Legend row, matching the on-screen legend bar
    const legendY=H-.78, legendH=.34;
    slide.addShape(pptx.ShapeType.roundRect,{x:.4,y:legendY,w:W-.8,h:legendH,fill:{color:"FFFFFF",transparency:100},line:{color:"CBD5E1",width:.7,dashType:"dash"}});
    const legendItems:{shape:"pill"|"rect"|"diamond"|"arrow"; fill?:string; line:string; label:string; dashed?:boolean}[]=[
      {shape:"pill", fill:C.start, line:"159447", label:"بداية / نهاية"},
      {shape:"rect", fill:C.process, line:"2867D4", label:"عملية"},
      {shape:"diamond", fill:C.decision, line:"E3A10C", label:"قرار"},
      {shape:"rect", fill:C.exception, line:"EF2B2D", label:"رفض / إعادة عمل"},
      {shape:"arrow", line:"111827", label:"تدفق رئيسي"},
      {shape:"arrow", line:"EF2B2D", label:"تدفق إعادة عمل / استثناء", dashed:true}
    ];
    const legendItemW=(W-.8)/legendItems.length;
    legendItems.forEach((item,i)=>{
      const slotX=.4+i*legendItemW;
      const swatchW=item.shape==="diamond"?.16:(item.shape==="arrow"?.34:.28);
      const swatchX=slotX+legendItemW-swatchW-.06, swatchY=legendY+legendH/2-.07;
      if(item.shape==="arrow"){
        slide.addShape(pptx.ShapeType.line,{x:swatchX,y:swatchY+.07,w:swatchW,h:0,
          line:{color:item.line,width:1.3,dashType:item.dashed?"dash":"solid",endArrowType:"triangle"}});
      }else{
        slide.addShape(item.shape==="diamond"?pptx.ShapeType.diamond:pptx.ShapeType.roundRect,
          {x:swatchX,y:swatchY,w:swatchW,h:.14,fill:{color:item.fill||"FFFFFF"},line:{color:item.line,width:1.2}});
      }
      slide.addText(item.label,{x:slotX,y:legendY,w:legendItemW-swatchW-.14,h:legendH,
        fontFace:theme.fontFamily,fontSize:7,bold:true,color:"334155",align:"right",valign:"middle",rtlMode:true});
    });

    // Footer: source citation, optional note, page number
    const footerY=H-.32;
    slide.addText(`Source: ${dept.sourcePages?`pages ${dept.sourcePages}`:(project.sourceFileName||"—")}`,
      {x:.4,y:footerY,w:4,h:.2,fontFace:theme.fontFamily,fontSize:7,color:"94A3B8",align:"left"});
    if(dept.footerNote){
      slide.addText(dept.footerNote,{x:4.4,y:footerY,w:W-9.2,h:.2,fontFace:theme.fontFamily,fontSize:7,color:"94A3B8",align:"center",rtlMode:true});
    }
    slide.addText(String(departments.indexOf(dept)+1),{x:W-.7,y:footerY,w:.3,h:.2,fontFace:theme.fontFamily,fontSize:7,bold:true,color:"64748B",align:"right"});
  }
  return pptx;
}

export async function exportEditablePptx(project:Project, scope:"current"|"all"="all", currentDeptId?:string){
  const departments=scope==="current" && currentDeptId
    ? project.departments.filter(d=>d.id===currentDeptId)
    : project.departments;
  const pptx=await buildPptx(project,departments);
  const suffix=scope==="current" ? (departments[0]?.name||"department") : "all-departments";
  await pptx.writeFile({fileName:`flowchart-${suffix}.pptx`});
}

/**
 * Alternate export mode, only used when explicitly chosen: each department is first
 * rasterized to a PNG (same capture used for the PNG/PDF export) and that image is
 * embedded full-slide, instead of drawing native PptxGenJS shapes. This preserves
 * exact on-screen appearance (including icons/visuals CSS can render that native
 * PPTX shapes can't easily reproduce) at the cost of the slide no longer being
 * editable — the CLAUDE.md contract requires native editable PPTX by default and
 * only allows this flattened form when the user explicitly asks for it.
 */
export async function exportImagePptx(project:Project, images:{name:string; dataUrl:string}[], fileNameSuffix:string){
  const theme=resolveTheme(project.theme);
  const layout=PAGE_SIZES[theme.pageSize];

  const pptx=new pptxgen();
  pptx.defineLayout({name:layout.name, width:layout.width, height:layout.height});
  pptx.layout=layout.name;
  pptx.rtlMode=true;

  for(const {dataUrl} of images){
    const img=await loadImage(dataUrl);
    const slide=pptx.addSlide();
    slide.background={color:"FFFFFF"};
    const scale=Math.min(layout.width/img.width, layout.height/img.height);
    const w=img.width*scale, h=img.height*scale;
    slide.addImage({data:dataUrl, x:(layout.width-w)/2, y:(layout.height-h)/2, w, h});
  }

  await pptx.writeFile({fileName:`flowchart-image-${fileNameSuffix}.pptx`});
}
