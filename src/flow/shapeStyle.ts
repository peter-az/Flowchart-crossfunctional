import type {NodeKind, NodeStyle} from "../types";

export interface ThemeFills{ process:string; decision:string; exception:string; startEnd:string; }

export const KIND_STROKE:Record<NodeKind,string>={
  start:"#159447", end:"#159447", process:"#2867D4", decision:"#E3A10C", exception:"#EF2B2D"
};

export const KIND_LABEL:Record<NodeKind,string>={
  start:"بداية", process:"عملية", decision:"قرار", exception:"استثناء", end:"نهاية"
};

export function kindFill(kind:NodeKind, fills:ThemeFills){
  return kind==="decision"?fills.decision
    : kind==="exception"?fills.exception
    : (kind==="start"||kind==="end")?fills.startEnd
    : fills.process;
}

/** Merges a shape's own overrides over the kind/theme defaults. */
export function resolveShapeStyle(kind:NodeKind, fills:ThemeFills, style?:NodeStyle){
  return {
    fill: style?.fill ?? kindFill(kind,fills),
    stroke: style?.stroke ?? KIND_STROKE[kind],
    strokeWidth: style?.strokeWidth ?? 2,
    fontSize: style?.fontSize ?? 12,
    textColor: style?.textColor ?? "#17365D",
    radius: style?.radius ?? ((kind==="start"||kind==="end") ? 999 : 10),
    bold: style?.bold ?? true
  };
}

export type ResolvedShapeStyle=ReturnType<typeof resolveShapeStyle>;
