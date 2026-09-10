export interface LegendFills{ process:string; decision:string; exception:string; startEnd:string; }

function ArrowSvg({color,dashed}:{color:string; dashed?:boolean}){
  return <svg width="34" height="14" viewBox="0 0 34 14" aria-hidden="true">
    <line x1="32" y1="7" x2="9" y2="7" stroke={color} strokeWidth="2" strokeDasharray={dashed?"5 3":undefined}/>
    <polygon points="9,1.5 1,7 9,12.5" fill={color}/>
  </svg>;
}

export default function LegendBar({fills}:{fills:LegendFills}){
  return <div className="legend-bar">
    <div className="legend-item"><span className="legend-shape pill" style={{background:fills.startEnd,borderColor:"#159447"}}/><span>بداية / نهاية</span></div>
    <div className="legend-item"><span className="legend-shape rect" style={{background:fills.process,borderColor:"#2867D4"}}/><span>عملية</span></div>
    <div className="legend-item"><span className="legend-shape diamond" style={{background:fills.decision,borderColor:"#E3A10C"}}/><span>قرار</span></div>
    <div className="legend-item"><span className="legend-shape rect" style={{background:fills.exception,borderColor:"#EF2B2D"}}/><span>رفض / إعادة عمل</span></div>
    <div className="legend-item"><ArrowSvg color="#111827"/><span>تدفق رئيسي</span></div>
    <div className="legend-item"><ArrowSvg color="#EF2B2D" dashed/><span>تدفق إعادة عمل / استثناء</span></div>
  </div>;
}
