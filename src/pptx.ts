import pptxgen from "pptxgenjs";
import type {Project} from "./types";

export async function exportEditablePptx(project:Project){
  const pptx=new pptxgen();
  pptx.layout="LAYOUT_WIDE";
  pptx.lang="ar-EG";
  pptx.rtlMode=true;

  const C={blue:"15479C",teal:"078A97",process:"EAF2FB",decision:"FFF3CD",exception:"FDECEA",start:"E7F6EA"};

  for(const dept of project.departments){
    const slide=pptx.addSlide();
    slide.background={color:"FFFFFF"};

    slide.addText("CROSS-FUNCTIONAL FLOWCHART",{x:.55,y:.22,w:3.5,h:.25,fontFace:"Arial",fontSize:10,bold:true,color:"5F7190",align:"left"});
    slide.addText(project.title,{x:8.1,y:.18,w:4.7,h:.35,fontFace:"Arial",fontSize:22,bold:true,color:"0B2A58",align:"right",rtlMode:true});
    slide.addText(project.subtitle,{x:7.2,y:.55,w:5.6,h:.22,fontFace:"Arial",fontSize:9,color:"7C8AA0",align:"right",rtlMode:true});
    slide.addShape(pptx.ShapeType.line,{x:.5,y:.9,w:12.3,h:0,line:{color:"CDD7E3",width:.7}});
    slide.addText(dept.name,{x:3.4,y:1.0,w:6.5,h:.4,fontFace:"Arial",fontSize:24,bold:true,color:"0B2A58",align:"center",rtlMode:true});

    const count=Math.max(1,dept.panels.length),gap=.18,totalW=12.1,pw=(totalW-gap*(count-1))/count,px=.62,py=1.55,ph=5.5;
    dept.panels.forEach((panel,pi)=>{
      const x=px+pi*(pw+gap), header=panel.accent==="teal"?C.teal:C.blue;
      slide.addShape(pptx.ShapeType.roundRect,{x,y:py,w:pw,h:ph,fill:{color:"FFFFFF",transparency:100},line:{color:"C4D0DE",width:1}});
      slide.addShape(pptx.ShapeType.rect,{x,y:py,w:pw,h:.34,fill:{color:header},line:{color:header}});
      slide.addText(panel.title,{x,y:py+.02,w:pw,h:.28,fontFace:"Arial",fontSize:14,bold:true,color:"FFFFFF",align:"center",rtlMode:true});

      const laneW=pw*.25,bodyY=py+.34,bodyH=ph-.34,laneH=bodyH/Math.max(1,panel.lanes.length),cw=pw-laneW;
      panel.lanes.forEach((lane,i)=>{
        const ly=bodyY+i*laneH;
        slide.addShape(pptx.ShapeType.rect,{x:x+pw-laneW,y:ly,w:laneW,h:laneH,fill:{color:i%2?"F8FAFC":"F3F6F9"},line:{color:"D9E2EC",width:.5}});
        slide.addText(lane.name,{x:x+pw-laneW+.03,y:ly+.02,w:laneW-.06,h:laneH-.04,fontFace:"Arial",fontSize:8.5,bold:true,color:"124B91",align:"center",valign:"mid",rtlMode:true,margin:.02});
      });

      panel.edges.forEach(e=>{
        const a=panel.nodes.find(n=>n.id===e.source),b=panel.nodes.find(n=>n.id===e.target); if(!a||!b)return;
        const ax=x+(a.x/640)*cw, ay=bodyY+(a.y/720)*bodyH, bx=x+(b.x/640)*cw, by=bodyY+(b.y/720)*bodyH;
        slide.addShape(pptx.ShapeType.line,{x:ax,y:ay,w:bx-ax,h:by-ay,line:{color:e.exception?"EF2B2D":"111827",width:1,dash:e.exception?"dash":"solid",endArrowType:"triangle"}});
      });

      panel.nodes.forEach(n=>{
        const kind=n.data.kind;
        const fill=kind==="decision"?C.decision:kind==="exception"?C.exception:(kind==="start"||kind==="end")?C.start:C.process;
        const line=kind==="decision"?"E3A10C":kind==="exception"?"EF2B2D":(kind==="start"||kind==="end")?"159447":"2867D4";
        const st=kind==="decision"?pptx.ShapeType.diamond:pptx.ShapeType.roundRect;
        const nw=(n.data.width||190)/640*cw, nh=(n.data.height||56)/720*bodyH;
        const nx=x+(n.x/640)*cw-nw/2, ny=bodyY+(n.y/720)*bodyH-nh/2;
        slide.addShape(st,{x:nx,y:ny,w:nw,h:nh,fill:{color:fill},line:{color:line,width:1.1}});
        slide.addText(n.data.label,{x:nx+.03,y:ny+.02,w:nw-.06,h:nh-.04,fontFace:"Arial",fontSize:8.5,bold:true,color:"17365D",align:"center",valign:"mid",rtlMode:true,margin:.02});
      });
    });
  }
  await pptx.writeFile({fileName:"editable-cross-functional-flowcharts.pptx"});
}