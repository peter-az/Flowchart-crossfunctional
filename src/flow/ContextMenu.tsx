import {useEffect} from "react";

export interface MenuItem{ label:string; onClick:()=>void; disabled?:boolean; danger?:boolean; }

export interface ContextMenuState{ x:number; y:number; items:MenuItem[]; }

export default function ContextMenu({state,onClose}:{state:ContextMenuState|null; onClose:()=>void}){
  useEffect(()=>{
    if(!state) return;
    const close=()=>onClose();
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") onClose(); };
    window.addEventListener("click",close);
    window.addEventListener("keydown",onKey);
    return ()=>{ window.removeEventListener("click",close); window.removeEventListener("keydown",onKey); };
  },[state,onClose]);

  if(!state) return null;
  return <div className="ctx-menu" style={{left:state.x, top:state.y}} onClick={e=>e.stopPropagation()}>
    {state.items.map((item,i)=>
      <button key={i} className={item.danger?"danger":""} disabled={item.disabled}
        onClick={()=>{ item.onClick(); onClose(); }}>{item.label}</button>
    )}
  </div>;
}
