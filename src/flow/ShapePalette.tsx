import type {NodeKind} from "../types";
import {KIND_LABEL, KIND_STROKE, kindFill, type ThemeFills} from "./shapeStyle";

export const PALETTE_MIME="application/x-flowchart-shape";

const KINDS:NodeKind[]=["start","process","decision","exception","end"];

const shapeClass:Record<NodeKind,string>={
  start:"pill", end:"pill", process:"rect", decision:"diamond", exception:"rect"
};

/** Visio-style stencil: drag a shape onto the canvas to place it where you drop it. */
export default function ShapePalette({fills}:{fills:ThemeFills}){
  return <div className="stencil">
    {KINDS.map(kind=>
      <div
        key={kind}
        className="stencil-item"
        draggable
        onDragStart={e=>{
          e.dataTransfer.setData(PALETTE_MIME,kind);
          e.dataTransfer.effectAllowed="copy";
        }}
        title={`اسحب لإضافة: ${KIND_LABEL[kind]}`}
      >
        <span className={`stencil-swatch ${shapeClass[kind]}`}
          style={{background:kindFill(kind,fills), borderColor:KIND_STROKE[kind]}}/>
        <span className="stencil-label">{KIND_LABEL[kind]}</span>
      </div>
    )}
  </div>;
}
