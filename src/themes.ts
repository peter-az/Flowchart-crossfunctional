import type {PageSize, Theme, ThemeName} from "./types";

export const THEMES:Record<ThemeName,Required<Omit<Theme,"name"|"pageSize">>>={
  reference:{
    fontFamily:"Arial",
    mainBlue:"#15479C", teal:"#078A97",
    processFill:"#EAF2FB", decisionFill:"#FFF3CD", exceptionFill:"#FDECEA", startEndFill:"#E7F6EA"
  },
  mckinsey:{
    fontFamily:"Georgia",
    mainBlue:"#003A70", teal:"#00A9E0",
    processFill:"#E8ECF1", decisionFill:"#F5E3B3", exceptionFill:"#F3D5D5", startEndFill:"#D9E6DD"
  },
  minimal:{
    fontFamily:"Segoe UI",
    mainBlue:"#1F2937", teal:"#4B5563",
    processFill:"#F3F4F6", decisionFill:"#E5E7EB", exceptionFill:"#FEE2E2", startEndFill:"#D1FAE5"
  }
};

export const THEME_LABELS:Record<ThemeName,string>={
  reference:"Reference Corporate",
  mckinsey:"McKinsey-like",
  minimal:"Minimal Banking"
};

/** Inches, landscape */
export const PAGE_SIZES:Record<PageSize,{name:string; width:number; height:number}>={
  "16:9":{name:"LAYOUT_WIDE", width:13.33, height:7.5},
  "A3":{name:"A3_LANDSCAPE", width:16.54, height:11.69},
  "A4":{name:"A4_LANDSCAPE", width:11.69, height:8.27}
};

export function resolveTheme(theme?:Theme){
  const base=THEMES[theme?.name||"reference"];
  return {
    fontFamily:theme?.fontFamily||base.fontFamily,
    mainBlue:theme?.mainBlue||base.mainBlue,
    teal:theme?.teal||base.teal,
    processFill:theme?.processFill||base.processFill,
    decisionFill:theme?.decisionFill||base.decisionFill,
    exceptionFill:theme?.exceptionFill||base.exceptionFill,
    startEndFill:theme?.startEndFill||base.startEndFill,
    pageSize:theme?.pageSize||"16:9"
  };
}
