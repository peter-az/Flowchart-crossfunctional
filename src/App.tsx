import {useEffect, useMemo, useRef, useState} from "react";
import {defaultProject} from "./defaultProject";
import type {Department, PageSize, Panel, Project, ThemeName} from "./types";
import {extractDocx, buildClaudePrompt} from "./docx";
import {ProjectSchema} from "./schema";
import {exportEditablePptx, exportImagePptx} from "./pptx";
import {exportDepartmentPng, exportDepartmentSvg, capturePngDataUrl, buildPdfFromImages} from "./exportImage";
import {useHistory} from "./history";
import {loadAutosave, saveAutosave, clearAutosave} from "./storage";
import {validateProject, type ValidationIssue} from "./validate";
import {resolveTheme, THEME_LABELS} from "./themes";
import PanelCanvas from "./flow/PanelCanvas";
import LegendBar from "./flow/LegendBar";
import SlideView from "./export/SlideView";
import {useMediaQuery, MOBILE_QUERY} from "./useMediaQuery";
import ShapePalette from "./flow/ShapePalette";
import {resolveShapeStyle} from "./flow/shapeStyle";
import type {NodeStyle} from "./types";
import "./styles.css";

let uid=1;
const nextId=(prefix:string)=>`${prefix}${Date.now().toString(36)}${(uid++).toString(36)}`;

function summarizeProject(p:Project){
  let nodes=0, edges=0, panels=0;
  for(const d of p.departments) for(const pn of d.panels){ panels++; nodes+=pn.nodes.length; edges+=pn.edges.length; }
  return {departments:p.departments.length, panels, nodes, edges};
}

function parseProjectJson(text:string):{ok:true; project:Project} | {ok:false; error:string}{
  try{
    const parsed=ProjectSchema.parse(JSON.parse(text));
    return {ok:true, project:parsed as Project};
  }catch(e){
    return {ok:false, error:e instanceof Error?e.message:String(e)};
  }
}

function loadInitialProject():{project:Project; restored:boolean}{
  const auto=loadAutosave();
  if(auto) return {project:auto.project, restored:true};
  return {project:JSON.parse(JSON.stringify(defaultProject)), restored:false};
}

export default function App(){
  const initial=useMemo(loadInitialProject,[]);
  const {present:project, set:setProject, undo, redo, canUndo, canRedo}=useHistory<Project>(initial.project);
  const [restoredBanner,setRestoredBanner]=useState(initial.restored);

  const [selectedDept,setSelectedDept]=useState(0);
  const [selectedNode,setSelectedNode]=useState<{panelId:string; nodeId:string}|null>(null);
  const [sourceText,setSourceText]=useState("");
  const [jsonText,setJsonText]=useState("");
  const [docxJsonText,setDocxJsonText]=useState("");
  const [exporting,setExporting]=useState<string|null>(null);
  const [poppedPanelId,setPoppedPanelId]=useState<string|null>(null);
  /** which department the offscreen export slide currently renders (defaults to the selected one) */
  const [exportDeptIdx,setExportDeptIdx]=useState<number|null>(null);

  const isMobile=useMediaQuery(MOBILE_QUERY);
  const [mobileTab,setMobileTab]=useState<"tools"|"chart"|"props">("chart");
  const [dark,setDark]=useState(()=>{
    try{ return localStorage.getItem("flowchart-studio-theme")==="dark"; }catch{ return false; }
  });

  useEffect(()=>{
    document.documentElement.dataset.appTheme=dark?"dark":"light";
    try{ localStorage.setItem("flowchart-studio-theme",dark?"dark":"light"); }catch{ /* ignore */ }
  },[dark]);

  const deptCanvasRef=useRef<HTMLDivElement|null>(null);
  const exportStageRef=useRef<HTMLDivElement|null>(null);

  const dept=project.departments[Math.min(selectedDept,project.departments.length-1)];
  const theme=resolveTheme(project.theme);
  const prompt=useMemo(()=>sourceText?buildClaudePrompt(sourceText):"",[sourceText]);
  const issues=useMemo(()=>validateProject(project),[project]);
  const docxPreview=useMemo(()=>docxJsonText.trim()?parseProjectJson(docxJsonText):null,[docxJsonText]);

  // autosave (debounced)
  useEffect(()=>{
    const t=setTimeout(()=>saveAutosave(project),800);
    return ()=>clearTimeout(t);
  },[project]);

  // undo/redo keyboard shortcuts
  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      const mod=e.ctrlKey||e.metaKey;
      if(!mod) return;
      if(e.key.toLowerCase()==="z" && !e.shiftKey){ e.preventDefault(); undo(); }
      else if((e.key.toLowerCase()==="z" && e.shiftKey) || e.key.toLowerCase()==="y"){ e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[undo,redo]);

  // Esc closes the popped-out panel canvas
  useEffect(()=>{
    if(!poppedPanelId) return;
    function onKey(e:KeyboardEvent){ if(e.key==="Escape") setPoppedPanelId(null); }
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[poppedPanelId]);

  async function upload(f:File){
    const text=await extractDocx(f);
    setSourceText(text);
    setProject(p=>({...p,sourceFileName:f.name}));
  }

  function importJson(){
    const result=parseProjectJson(jsonText);
    if(!result.ok){ alert("JSON غير صالح أو لا يطابق الـ schema:\n"+result.error); return; }
    setProject(result.project); setSelectedDept(0); setSelectedNode(null);
  }

  function insertDocxJson(){
    if(!docxPreview || !docxPreview.ok) return;
    setProject(docxPreview.project); setSelectedDept(0); setSelectedNode(null);
    setDocxJsonText("");
  }

  function exportJson(){
    const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`${project.title||"project"}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function updateProjectField<K extends keyof Project>(key:K, value:Project[K]){
    setProject(p=>({...p,[key]:value}));
  }

  function updateDept(deptId:string, next:Partial<Department>){
    setProject(p=>({...p,departments:p.departments.map(d=>d.id===deptId?{...d,...next}:d)}));
  }

  function updatePanel(deptId:string, panelId:string, nextPanel:Panel){
    setProject(p=>({...p,departments:p.departments.map(d=>d.id!==deptId?d:{
      ...d, panels:d.panels.map(pn=>pn.id===panelId?nextPanel:pn)
    })}));
  }

  function addDepartment(){
    const id=nextId("dept");
    const nd:Department={id,name:"إدارة جديدة",subtitle:"Cross-Functional Flowchart",panels:[]};
    setProject(p=>({...p,departments:[...p.departments,nd]}));
    setSelectedDept(project.departments.length);
  }

  function duplicateDepartment(deptId:string){
    const d=project.departments.find(x=>x.id===deptId); if(!d) return;
    const clone:Department=JSON.parse(JSON.stringify(d));
    clone.id=nextId("dept"); clone.name=d.name+" (نسخة)";
    clone.panels.forEach(pn=>{
      pn.id=nextId("panel");
      pn.nodes.forEach(n=>n.id=nextId("n"));
      pn.edges.forEach(e=>e.id=nextId("e"));
    });
    setProject(p=>({...p,departments:[...p.departments,clone]}));
  }

  function deleteDepartment(deptId:string){
    if(project.departments.length<=1) return;
    if(!confirm("حذف هذه الإدارة نهائيًا؟")) return;
    setProject(p=>({...p,departments:p.departments.filter(d=>d.id!==deptId)}));
    setSelectedDept(0);
  }

  function addPanel(){
    const id=nextId("panel");
    const newPanel:Panel={id,title:"لوحة جديدة",accent:"blue",
      lanes:[{id:nextId("lane"),name:"مسار 1"}],nodes:[],edges:[]};
    updateDept(dept.id,{panels:[...dept.panels,newPanel]});
  }

  function duplicatePanel(panelId:string){
    const src=dept.panels.find(p=>p.id===panelId); if(!src) return;
    const clone:Panel=JSON.parse(JSON.stringify(src));
    const idMap=new Map<string,string>();
    clone.id=nextId("panel"); clone.title=src.title+" (نسخة)";
    clone.nodes.forEach(n=>{ const nid=nextId("n"); idMap.set(n.id,nid); n.id=nid; });
    clone.edges.forEach(e=>{ e.id=nextId("e"); e.source=idMap.get(e.source)||e.source; e.target=idMap.get(e.target)||e.target; });
    updateDept(dept.id,{panels:[...dept.panels, clone]});
  }

  function deletePanel(panelId:string){
    if(dept.panels.length<=1) return;
    if(!confirm("حذف هذه اللوحة نهائيًا؟")) return;
    updateDept(dept.id,{panels:dept.panels.filter(p=>p.id!==panelId)});
  }

  function findSelectedNode(){
    if(!selectedNode) return null;
    for(const panel of dept.panels){
      if(panel.id!==selectedNode.panelId) continue;
      const node=panel.nodes.find(n=>n.id===selectedNode.nodeId);
      if(node) return {panel,node};
    }
    return null;
  }

  function updateSelectedNodeData(patch:Partial<{label:string; laneId:string; source:{page?:string; excerpt?:string}}>){
    const found=findSelectedNode(); if(!found) return;
    const {panel,node}=found;
    updatePanel(dept.id,panel.id,{...panel, nodes:panel.nodes.map(n=>n.id===node.id?{...n,data:{...n.data,...patch}}:n)});
  }

  /** Merges formatting overrides onto the selected shape; `null` clears them back to the kind default. */
  function updateSelectedNodeStyle(patch:Partial<NodeStyle>|null){
    const found=findSelectedNode(); if(!found) return;
    const {panel,node}=found;
    updatePanel(dept.id,panel.id,{...panel, nodes:panel.nodes.map(n=>n.id!==node.id?n:{
      ...n, data:{...n.data, style: patch===null ? undefined : {...n.data.style, ...patch}}
    })});
  }

  function goToIssue(issue:ValidationIssue){
    const di=project.departments.findIndex(d=>d.id===issue.deptId);
    if(di>=0) setSelectedDept(di);
    if(issue.panelId && issue.nodeId) setSelectedNode({panelId:issue.panelId,nodeId:issue.nodeId});
    if(isMobile) setMobileTab("chart");
  }

  async function runExport(kind:string, fn:()=>Promise<void>){
    setExporting(kind);
    try{ await fn(); } catch(e){ alert("فشل التصدير: "+(e instanceof Error?e.message:String(e))); }
    finally{ setExporting(null); }
  }

  const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

  /**
   * The slide itself, not the offscreen wrapper: html-to-image clones the target's own
   * computed styles, so capturing the wrapper (which is parked far off-canvas) yields a blank image.
   */
  function slideEl(){
    const el=exportStageRef.current?.querySelector(".xslide");
    if(!el) throw new Error("export slide not mounted");
    return el as HTMLElement;
  }

  /** Renders the clean export slide for one department offscreen, then captures it. */
  async function captureSlide(deptIndex:number){
    setExportDeptIdx(deptIndex);
    await nextFrame();
    return capturePngDataUrl(slideEl());
  }

  async function captureAllDepartmentImages(){
    const images:{name:string; dataUrl:string}[]=[];
    for(let i=0;i<project.departments.length;i++){
      images.push({name:project.departments[i].name, dataUrl:await captureSlide(i)});
    }
    setExportDeptIdx(null);
    return images;
  }

  async function exportAllPdf(){
    const images=await captureAllDepartmentImages();
    await buildPdfFromImages(images.map(i=>i.dataUrl), `flowchart-all-departments.pdf`, theme.pageSize as PageSize);
  }

  async function exportImagePptxCurrent(){
    const dataUrl=await captureSlide(selectedDept);
    setExportDeptIdx(null);
    await exportImagePptx(project, [{name:dept.name, dataUrl}], dept.name);
  }

  async function exportImagePptxAll(){
    const images=await captureAllDepartmentImages();
    await exportImagePptx(project, images, "all-departments");
  }

  const selected=findSelectedNode();

  return <div className="layout" dir="ltr" data-mtab={isMobile?mobileTab:undefined}>
    <aside className="left" dir="rtl">
      <h2>Claude Code Flowchart Studio</h2>

      {restoredBanner && <div className="banner">
        تمت استعادة آخر نسخة محفوظة تلقائيًا محليًا.
        <button onClick={()=>{clearAutosave(); setRestoredBanner(false);}}>تجاهل</button>
      </div>}

      <div className="toolbar-row">
        <button disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">↶ تراجع</button>
        <button disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Shift+Z)">↷ إعادة</button>
        <button onClick={()=>setDark(d=>!d)} title="تبديل الوضع الليلي" className="icon-btn">{dark?"☀":"☾"}</button>
      </div>

      <h3>الأشكال</h3>
      <p className="muted hint">اسحب أي شكل إلى المخطط لإضافته، أو انقر بزر الفأرة الأيمن على المخطط.</p>
      <ShapePalette fills={{process:theme.processFill,decision:theme.decisionFill,exception:theme.exceptionFill,startEnd:theme.startEndFill}}/>

      <h3>الإدارات</h3>
      <div className="dept-list">
        {project.departments.map((d,i)=>
          <div key={d.id} className="dept-row">
            <button className={i===selectedDept?"active":""} onClick={()=>{setSelectedDept(i); setSelectedNode(null);}}>{d.name}</button>
            <button title="Duplicate department" onClick={()=>duplicateDepartment(d.id)}>⧉</button>
            {project.departments.length>1 && <button title="Delete department" onClick={()=>deleteDepartment(d.id)}>✕</button>}
          </div>
        )}
      </div>
      <button onClick={addDepartment}>+ إدارة جديدة</button>

      <h3>المظهر</h3>
      <label>القالب
        <select value={project.theme?.name||"reference"} onChange={e=>updateProjectField("theme",{...project.theme,name:e.target.value as ThemeName})}>
          {Object.entries(THEME_LABELS).map(([k,label])=><option key={k} value={k}>{label}</option>)}
        </select>
      </label>
      <label>مقاس الصفحة
        <select value={theme.pageSize} onChange={e=>updateProjectField("theme",{...project.theme,pageSize:e.target.value as PageSize})}>
          <option value="16:9">16:9</option>
          <option value="A3">A3 Landscape</option>
          <option value="A4">A4 Landscape</option>
        </select>
      </label>

      <h3>تصدير</h3>
      <div className="export-grid">
        <button disabled={!!exporting} onClick={()=>runExport("pptx-current",()=>exportEditablePptx(project,"current",dept.id))}>PPTX (هذه الإدارة)</button>
        <button disabled={!!exporting} onClick={()=>runExport("pptx-all",()=>exportEditablePptx(project,"all"))}>PPTX (كل الإدارات)</button>
        <button disabled={!!exporting} onClick={()=>runExport("png",async()=>{
          setExportDeptIdx(selectedDept); await nextFrame();
          await exportDepartmentPng(slideEl(),`${dept.name}.png`);
          setExportDeptIdx(null);
        })}>PNG (هذه الإدارة)</button>
        <button disabled={!!exporting} onClick={()=>runExport("svg",async()=>{
          setExportDeptIdx(selectedDept); await nextFrame();
          await exportDepartmentSvg(slideEl(),`${dept.name}.svg`);
          setExportDeptIdx(null);
        })}>SVG (هذه الإدارة)</button>
        <button disabled={!!exporting} onClick={()=>runExport("pdf-current",async()=>{
          const img=await captureSlide(selectedDept);
          setExportDeptIdx(null);
          await buildPdfFromImages([img],`${dept.name}.pdf`,theme.pageSize as PageSize);
        })}>PDF (هذه الإدارة)</button>
        <button disabled={!!exporting} onClick={()=>runExport("pdf-all",exportAllPdf)}>PDF (كل الإدارات)</button>
      </div>
      <p className="muted export-note">PPTX بالصور: يعالج المخطط كصورة ثم يضعه داخل الشريحة (غير قابل للتعديل داخل PowerPoint) — استخدمه فقط إذا كنت تريد الشكل المرئي بالضبط.</p>
      <div className="export-grid">
        <button disabled={!!exporting} onClick={()=>runExport("pptx-img-current",exportImagePptxCurrent)}>PPTX بالصور (هذه الإدارة)</button>
        <button disabled={!!exporting} onClick={()=>runExport("pptx-img-all",exportImagePptxAll)}>PPTX بالصور (كل الإدارات)</button>
      </div>
      {exporting && <p className="muted">جارٍ التصدير…</p>}

      <details open={!!docxJsonText}>
        <summary>استخراج من DOCX</summary>
        <input type="file" accept=".docx" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0])}/>
        <label>النص المستخرج (يمكن اختيار/تقليم القسم الخاص بإدارة معينة)</label>
        <textarea rows={8} value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="سيظهر نص DOCX هنا بعد الرفع…"/>
        <textarea rows={10} readOnly value={prompt} placeholder="Claude prompt سيظهر هنا"/>
        <button onClick={()=>navigator.clipboard.writeText(prompt)} disabled={!prompt}>نسخ الـ Prompt</button>

        <label>الصق ناتج Claude (JSON) هنا للإدراج المباشر</label>
        <textarea rows={10} value={docxJsonText} onChange={e=>setDocxJsonText(e.target.value)} placeholder='الصق JSON المطابق لِـ Project schema…'/>
        {docxPreview && !docxPreview.ok && <p className="json-error">⚠ {docxPreview.error}</p>}
        {docxPreview && docxPreview.ok && (()=>{
          const before=summarizeProject(project), after=summarizeProject(docxPreview.project);
          return <div className="json-diff-preview">
            <p>سيستبدل هذا المشروع الحالي بالكامل:</p>
            <ul>
              <li>الإدارات: {before.departments} → {after.departments}</li>
              <li>اللوحات: {before.panels} → {after.panels}</li>
              <li>العقد: {before.nodes} → {after.nodes}</li>
              <li>الروابط: {before.edges} → {after.edges}</li>
            </ul>
          </div>;
        })()}
        <button className="primary" onClick={insertDocxJson} disabled={!docxPreview || !docxPreview.ok}>إدراج البيانات الآن</button>
      </details>

      <details>
        <summary>JSON استيراد / تصدير</summary>
        <textarea rows={10} value={jsonText} onChange={e=>setJsonText(e.target.value)} placeholder="ألصق JSON هنا"/>
        <button onClick={importJson}>تحميل JSON</button>
        <button onClick={exportJson}>تنزيل JSON الحالي</button>
      </details>
    </aside>

    <main dir="rtl">
      <div className="dept-canvas-capture" ref={deptCanvasRef} style={{"--main-blue":theme.mainBlue,"--teal":theme.teal,fontFamily:theme.fontFamily} as React.CSSProperties}>
        <div className="slide-masthead" dir="ltr">
          <span className="masthead-label">CROSS-FUNCTIONAL FLOWCHART</span>
          <div className="masthead-title-block">
            <input className="masthead-title" value={project.title} onChange={e=>updateProjectField("title",e.target.value)} dir="rtl"/>
            <input className="masthead-subtitle" value={project.subtitle} onChange={e=>updateProjectField("subtitle",e.target.value)} dir="rtl"/>
          </div>
        </div>
        <hr className="masthead-rule"/>

        <div className="page-title">
          <input className="title-input" value={dept.name} onChange={e=>updateDept(dept.id,{name:e.target.value})}/>
          <input className="subtitle-input" value={dept.subtitle} onChange={e=>updateDept(dept.id,{subtitle:e.target.value})}/>
        </div>

        <div className="panels-grid">
          {dept.panels.map(panel=>
            panel.id===poppedPanelId
              ? <div className="panel-block popped-placeholder" key={panel.id}>
                  <div className={`panel-head ${panel.accent}`} style={{background:panel.accent==="teal"?theme.teal:theme.mainBlue}}>
                    <span>{panel.title}</span>
                  </div>
                  <button className="restore-btn" onClick={()=>setPoppedPanelId(null)}>↙ موسّعة حاليًا — اضغط للعودة</button>
                </div>
              : <PanelCanvas
                  key={panel.id}
                  panel={panel}
                  accentColor={panel.accent==="teal"?theme.teal:theme.mainBlue}
                  fills={{process:theme.processFill,decision:theme.decisionFill,exception:theme.exceptionFill,startEnd:theme.startEndFill}}
                  flaggedNodeIds={new Set(issues.filter(i=>i.panelId===panel.id && i.nodeId).map(i=>i.nodeId!))}
                  onChange={next=>updatePanel(dept.id,panel.id,next)}
                  onSelectNode={nodeId=>setSelectedNode(nodeId?{panelId:panel.id,nodeId}:null)}
                  onDuplicatePanel={()=>duplicatePanel(panel.id)}
                  onDeletePanel={()=>deletePanel(panel.id)}
                  canDeletePanel={dept.panels.length>1}
                  onTogglePopout={()=>setPoppedPanelId(panel.id)}
                />
          )}
        </div>
        <LegendBar fills={{process:theme.processFill,decision:theme.decisionFill,exception:theme.exceptionFill,startEnd:theme.startEndFill}}/>

        <div className="slide-footer" dir="ltr">
          <span className="footer-source">Source: {dept.sourcePages?`pages ${dept.sourcePages}`:(project.sourceFileName||"—")}</span>
          <input className="footer-note" dir="rtl" value={dept.footerNote||""} placeholder="ملاحظة أسفل الصفحة (اختياري)…" onChange={e=>updateDept(dept.id,{footerNote:e.target.value})}/>
          <span className="footer-page">{selectedDept+1}</span>
        </div>
      </div>
      <button className="add-panel" onClick={addPanel}>+ لوحة جديدة</button>
    </main>

    <div className="export-stage" ref={exportStageRef} aria-hidden="true">
      <SlideView
        project={project}
        dept={project.departments[exportDeptIdx??selectedDept]||dept}
        pageIndex={(exportDeptIdx??selectedDept)+1}
      />
    </div>

    {poppedPanelId && (()=>{
      const panel=dept.panels.find(p=>p.id===poppedPanelId);
      if(!panel) return null;
      return <div className="popout-backdrop" onClick={()=>setPoppedPanelId(null)}>
        <div className="popout-modal" dir="rtl" onClick={e=>e.stopPropagation()}>
          <button className="popout-close" onClick={()=>setPoppedPanelId(null)} title="إغلاق (Esc)">✕</button>
          <PanelCanvas
            panel={panel}
            accentColor={panel.accent==="teal"?theme.teal:theme.mainBlue}
            fills={{process:theme.processFill,decision:theme.decisionFill,exception:theme.exceptionFill,startEnd:theme.startEndFill}}
            flaggedNodeIds={new Set(issues.filter(i=>i.panelId===panel.id && i.nodeId).map(i=>i.nodeId!))}
            onChange={next=>updatePanel(dept.id,panel.id,next)}
            onSelectNode={nodeId=>setSelectedNode(nodeId?{panelId:panel.id,nodeId}:null)}
            onDuplicatePanel={()=>duplicatePanel(panel.id)}
            onDeletePanel={()=>deletePanel(panel.id)}
            canDeletePanel={dept.panels.length>1}
            expanded
          />
        </div>
      </div>;
    })()}

    <aside className="right" dir="rtl">
      <h3>خصائص العنصر المحدد</h3>
      {selected ? <div className="props-form">
        <label>النص
          <textarea rows={3} value={selected.node.data.label} onChange={e=>updateSelectedNodeData({label:e.target.value})}/>
        </label>
        <label>المسار (Lane)
          <select value={selected.node.data.laneId} onChange={e=>updateSelectedNodeData({laneId:e.target.value})}>
            {selected.panel.lanes.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <h4>التنسيق</h4>
        {(()=>{
          const s=resolveShapeStyle(selected.node.data.kind,
            {process:theme.processFill,decision:theme.decisionFill,exception:theme.exceptionFill,startEnd:theme.startEndFill},
            selected.node.data.style);
          return <div className="format-grid">
            <label className="fmt">التعبئة
              <input type="color" value={s.fill} onChange={e=>updateSelectedNodeStyle({fill:e.target.value})}/>
            </label>
            <label className="fmt">الإطار
              <input type="color" value={s.stroke} onChange={e=>updateSelectedNodeStyle({stroke:e.target.value})}/>
            </label>
            <label className="fmt">لون النص
              <input type="color" value={s.textColor} onChange={e=>updateSelectedNodeStyle({textColor:e.target.value})}/>
            </label>
            <label className="fmt">سُمك الإطار
              <input type="range" min={1} max={6} step={1} value={s.strokeWidth}
                onChange={e=>updateSelectedNodeStyle({strokeWidth:Number(e.target.value)})}/>
            </label>
            <label className="fmt">حجم الخط
              <input type="range" min={9} max={22} step={1} value={s.fontSize}
                onChange={e=>updateSelectedNodeStyle({fontSize:Number(e.target.value)})}/>
            </label>
            <label className="fmt">استدارة الزوايا
              <input type="range" min={0} max={40} step={2} value={Math.min(40,s.radius)}
                onChange={e=>updateSelectedNodeStyle({radius:Number(e.target.value)})}/>
            </label>
            <label className="fmt fmt-check">
              <input type="checkbox" checked={s.bold} onChange={e=>updateSelectedNodeStyle({bold:e.target.checked})}/>
              نص عريض
            </label>
            <button onClick={()=>updateSelectedNodeStyle(null)}>إعادة التنسيق الافتراضي</button>
          </div>;
        })()}

        <h4>الاستشهاد بالمصدر</h4>
        <label>رقم الصفحة
          <input value={selected.node.data.source?.page||""} onChange={e=>updateSelectedNodeData({source:{...selected.node.data.source,page:e.target.value}})}/>
        </label>
        <label>الاقتباس / المقتطف
          <textarea rows={3} value={selected.node.data.source?.excerpt||""} onChange={e=>updateSelectedNodeData({source:{...selected.node.data.source,excerpt:e.target.value}})}/>
        </label>
      </div> : <p className="muted">اضغط على أي عنصر في المخطط لتحرير خصائصه.</p>}

      <h3>لوحة التحقق ({issues.length})</h3>
      <div className="validation-list">
        {issues.length===0 && <p className="muted">لا توجد مشكلات ✓</p>}
        {issues.map(issue=>
          <button key={issue.id} className={`issue issue-${issue.kind}`} onClick={()=>goToIssue(issue)}>
            <span className="issue-kind">{issue.kind}</span>
            <span>{issue.message}</span>
          </button>
        )}
      </div>
    </aside>

    {isMobile && <nav className="mtabs" dir="rtl">
      <button className={mobileTab==="tools"?"active":""} onClick={()=>setMobileTab("tools")}>
        <span className="mtab-ico">☰</span>أدوات
      </button>
      <button className={mobileTab==="chart"?"active":""} onClick={()=>setMobileTab("chart")}>
        <span className="mtab-ico">▦</span>المخطط
      </button>
      <button className={mobileTab==="props"?"active":""} onClick={()=>setMobileTab("props")}>
        <span className="mtab-ico">☑</span>خصائص{issues.length>0 && <em className="mtab-badge">{issues.length}</em>}
      </button>
    </nav>}
  </div>;
}
