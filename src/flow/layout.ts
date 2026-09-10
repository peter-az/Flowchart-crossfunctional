import type {Panel} from "../types";

export const PANEL_W=680;
export const ROW_H=130;
export const NODE_W=190;
export const NODE_H=64;
/** Fraction of the canvas width reserved for the right-hand lane icon/label column (matches the PPTX export's laneW ratio). */
export const LABEL_COL_RATIO=0.25;

export function canvasSize(panel:Panel){
  return {
    width: panel.canvasWidth || PANEL_W,
    height: panel.canvasHeight || Math.max(1,panel.lanes.length)*ROW_H
  };
}

/** Width of the flow/node area, excluding the lane label column on the right. */
export function flowWidth(panel:Panel){
  return canvasSize(panel).width*(1-LABEL_COL_RATIO);
}

export function labelColWidth(panel:Panel){
  return canvasSize(panel).width*LABEL_COL_RATIO;
}

export function laneRowY(panel:Panel, laneIndex:number){
  const {height}=canvasSize(panel);
  const rowH=height/Math.max(1,panel.lanes.length);
  return {top: laneIndex*rowH, height: rowH, center: laneIndex*rowH+rowH/2};
}

export function laneIndexForY(panel:Panel, y:number){
  const {height}=canvasSize(panel);
  const rowH=height/Math.max(1,panel.lanes.length);
  const idx=Math.round((y-rowH/2)/rowH);
  return Math.min(panel.lanes.length-1, Math.max(0, idx));
}
