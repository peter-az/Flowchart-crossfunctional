import {useMemo,useState} from "react";
import {defaultProject} from "./defaultProject";
import type {Project} from "./types";
import {extractDocx,buildClaudePrompt} from "./docx";
import {ProjectSchema} from "./schema";
import {exportEditablePptx} from "./pptx";
import "./styles.css";

export default function App(){
  const [project,setProject]=useState<Project>(JSON.parse(JSON.stringify(defaultProject)));
  const [selected,setSelected]=useState(0);
  const [source,setSource]=useState("");
  const [jsonText,setJsonText]=useState("");

  const dept=project.departments[selected];
  const prompt=useMemo(()=>source?buildClaudePrompt(source):"",[source]);

  async function upload(f:File){setSource(await extractDocx(f));setProject(p=>({...p,sourceFileName:f.name}))}
  function importJson(){
    try{
      const parsed=ProjectSchema.parse(JSON.parse(jsonText));
      setProject(parsed as Project); setSelected(0);
    }catch(e){alert("JSON غير صالح أو لا يطابق الـ schema");}
  }
  function updateDeptName(v:string){
    const ds=[...project.departments]; ds[selected]={...dept,name:v}; setProject({...project,departments:ds});
  }

  return <div className="layout">
    <aside className="left">
      <h2>Claude Code Flowchart Studio</h2>
      <input type="file" accept=".docx" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0])}/>
      <div className="dept-list">
        {project.departments.map((d,i)=><button key={d.id} className={i===selected?"active":""} onClick={()=>setSelected(i)}>{d.name}</button>)}
      </div>
      <button className="primary" onClick={()=>exportEditablePptx(project)}>تصدير PowerPoint قابل للتعديل</button>
      <details><summary>Claude extraction prompt</summary><textarea rows={14} readOnly value={prompt}/><button onClick={()=>navigator.clipboard.writeText(prompt)}>نسخ الـ Prompt</button></details>
      <details><summary>استيراد JSON</summary><textarea rows={12} value={jsonText} onChange={e=>setJsonText(e.target.value)}/><button onClick={importJson}>تحميل JSON</button></details>
    </aside>
    <main>
      <div className="page-title"><h1>{dept.name}</h1><p>{dept.subtitle}</p></div>
      <div className="mock-canvas">
        {dept.panels.map(panel=><section className="panel" key={panel.id}>
          <div className={`panel-head ${panel.accent}`}>{panel.title}</div>
          <div className="panel-body">
            <div className="flow-col">
              {panel.nodes.map(n=><div key={n.id} className={`node ${n.data.kind}`}>{n.data.label.split("\n").map((t,i)=><div key={i}>{t}</div>)}</div>)}
            </div>
            <div className="lanes">
              {panel.lanes.map(l=><div key={l.id}>{l.name}</div>)}
            </div>
          </div>
        </section>)}
      </div>
    </main>
    <aside className="right">
      <h3>خصائص</h3>
      <label>اسم الإدارة<input value={dept.name} onChange={e=>updateDeptName(e.target.value)}/></label>
      <p>هذا Starter. استخدم CLAUDE.md لإكمال drag/drop، resize، connectors، validation وundo/redo.</p>
    </aside>
  </div>
}