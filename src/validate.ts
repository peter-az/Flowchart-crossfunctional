import type {Project} from "./types";
import {canvasSize, NODE_H, NODE_W} from "./flow/layout";

export type IssueKind=
  |"orphan-node"|"broken-edge"|"duplicate-id"|"missing-lane"
  |"missing-citation"|"overflow-risk"|"node-outside-panel";

export interface ValidationIssue{
  id:string; kind:IssueKind; message:string;
  deptId:string; panelId?:string; nodeId?:string; edgeId?:string;
}

export function validateProject(project:Project):ValidationIssue[]{
  const issues:ValidationIssue[]=[];
  const seenIds=new Map<string,string[]>(); // id -> locations

  const track=(id:string, where:string)=>{
    if(!seenIds.has(id)) seenIds.set(id,[]);
    seenIds.get(id)!.push(where);
  };

  for(const dept of project.departments){
    track(dept.id,`department ${dept.name}`);
    for(const panel of dept.panels){
      track(panel.id,`panel ${panel.title} (${dept.name})`);
      const {width,height}=canvasSize(panel);
      const laneIds=new Set(panel.lanes.map(l=>l.id));
      for(const lane of panel.lanes) track(lane.id,`lane ${lane.name} (${panel.title})`);

      const incident=new Map<string,number>();
      for(const n of panel.nodes) incident.set(n.id,0);

      for(const e of panel.edges){
        track(e.id,`edge ${e.id} (${panel.title})`);
        const srcOk=panel.nodes.some(n=>n.id===e.source);
        const tgtOk=panel.nodes.some(n=>n.id===e.target);
        if(!srcOk||!tgtOk){
          issues.push({id:`broken-edge:${e.id}`,kind:"broken-edge",
            message:`Edge "${e.id}" references a missing node (${!srcOk?e.source:e.target}).`,
            deptId:dept.id,panelId:panel.id,edgeId:e.id});
        }else{
          incident.set(e.source,(incident.get(e.source)||0)+1);
          incident.set(e.target,(incident.get(e.target)||0)+1);
        }
      }

      for(const n of panel.nodes){
        track(n.id,`node ${n.id} (${panel.title})`);

        if(!laneIds.has(n.data.laneId)){
          issues.push({id:`missing-lane:${n.id}`,kind:"missing-lane",
            message:`Node "${n.data.label.split("\n")[0]}" references a lane that no longer exists.`,
            deptId:dept.id,panelId:panel.id,nodeId:n.id});
        }

        if(!n.data.source?.page && !n.data.source?.excerpt){
          issues.push({id:`missing-citation:${n.id}`,kind:"missing-citation",
            message:`Node "${n.data.label.split("\n")[0]}" has no source page/excerpt citation.`,
            deptId:dept.id,panelId:panel.id,nodeId:n.id});
        }

        if(panel.nodes.length>1 && n.data.kind!=="start" && n.data.kind!=="end" && (incident.get(n.id)||0)===0){
          issues.push({id:`orphan-node:${n.id}`,kind:"orphan-node",
            message:`Node "${n.data.label.split("\n")[0]}" has no connected edges.`,
            deptId:dept.id,panelId:panel.id,nodeId:n.id});
        }

        const w=n.data.width||NODE_W, h=n.data.height||NODE_H;
        const left=n.x-w/2, right=n.x+w/2, top=n.y-h/2, bottom=n.y+h/2;
        const fullyOutside = right<0||left>width||bottom<0||top>height;
        const clipping = !fullyOutside && (left<0||right>width||top<0||bottom>height);
        if(fullyOutside){
          issues.push({id:`node-outside-panel:${n.id}`,kind:"node-outside-panel",
            message:`Node "${n.data.label.split("\n")[0]}" is positioned outside its panel.`,
            deptId:dept.id,panelId:panel.id,nodeId:n.id});
        }else if(clipping){
          issues.push({id:`overflow-risk:${n.id}`,kind:"overflow-risk",
            message:`Node "${n.data.label.split("\n")[0]}" extends past the panel edge and may be clipped on export.`,
            deptId:dept.id,panelId:panel.id,nodeId:n.id});
        }
      }
    }
  }

  for(const [id,locations] of seenIds){
    if(locations.length>1){
      issues.push({id:`duplicate-id:${id}`,kind:"duplicate-id",
        message:`ID "${id}" is used more than once: ${locations.join(", ")}.`,
        deptId:"" });
    }
  }

  return issues;
}
