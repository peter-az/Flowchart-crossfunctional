import {toPng, toSvg} from "html-to-image";
import {jsPDF} from "jspdf";
import {PAGE_SIZES} from "./themes";
import type {PageSize} from "./types";

function download(dataUrl:string, fileName:string){
  const a=document.createElement("a");
  a.href=dataUrl; a.download=fileName;
  document.body.appendChild(a); a.click(); a.remove();
}

export async function exportDepartmentPng(el:HTMLElement, fileName:string){
  const dataUrl=await toPng(el,{backgroundColor:"#ffffff",pixelRatio:2});
  download(dataUrl,fileName);
}

export async function exportDepartmentSvg(el:HTMLElement, fileName:string){
  const dataUrl=await toSvg(el,{backgroundColor:"#ffffff"});
  download(dataUrl,fileName);
}

export async function capturePngDataUrl(el:HTMLElement){
  return toPng(el,{backgroundColor:"#ffffff",pixelRatio:2});
}

export function loadImage(src:string):Promise<HTMLImageElement>{
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=src;
  });
}

/** Builds (and downloads) a multi-page landscape PDF, one page per PNG data URL. */
export async function buildPdfFromImages(dataUrls:string[], fileName:string, pageSize:PageSize){
  const {width,height}=PAGE_SIZES[pageSize];
  const pdf=new jsPDF({orientation:"landscape",unit:"in",format:[width,height]});
  for(let i=0;i<dataUrls.length;i++){
    if(i>0) pdf.addPage([width,height],"landscape");
    const img=await loadImage(dataUrls[i]);
    const scale=Math.min(width/img.width,height/img.height);
    const w=img.width*scale, h=img.height*scale;
    pdf.addImage(dataUrls[i],"PNG",(width-w)/2,(height-h)/2,w,h,undefined,"FAST");
  }
  pdf.save(fileName);
}
