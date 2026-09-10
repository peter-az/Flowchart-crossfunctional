import {z} from "zod";

const SourceRefSchema=z.object({page:z.string().optional(),excerpt:z.string().optional()});

const LaneSchema=z.object({id:z.string(),name:z.string(),icon:z.string().optional()});

const FlowNodeSchema=z.object({
  id:z.string(),x:z.number(),y:z.number(),
  data:z.object({
    label:z.string(),laneId:z.string(),kind:z.enum(["start","process","decision","exception","end"]),
    width:z.number().optional(),height:z.number().optional(),
    source:SourceRefSchema.optional()
  })
});

const FlowEdgeSchema=z.object({
  id:z.string(),source:z.string(),target:z.string(),
  label:z.string().optional(),exception:z.boolean().optional()
});

const PanelSchema=z.object({
  id:z.string(),title:z.string(),accent:z.enum(["blue","teal"]),
  lanes:z.array(LaneSchema),
  nodes:z.array(FlowNodeSchema),
  edges:z.array(FlowEdgeSchema),
  canvasWidth:z.number().optional(),
  canvasHeight:z.number().optional()
});

const DepartmentSchema=z.object({
  id:z.string(),name:z.string(),subtitle:z.string(),sourcePages:z.string().optional(),footerNote:z.string().optional(),
  panels:z.array(PanelSchema)
});

const ThemeSchema=z.object({
  name:z.enum(["reference","mckinsey","minimal"]).optional(),
  pageSize:z.enum(["A3","A4","16:9"]).optional(),
  fontFamily:z.string().optional(),
  mainBlue:z.string().optional(),
  teal:z.string().optional(),
  processFill:z.string().optional(),
  decisionFill:z.string().optional(),
  exceptionFill:z.string().optional(),
  startEndFill:z.string().optional()
});

export const ProjectSchema=z.object({
  title:z.string(), subtitle:z.string(), sourceFileName:z.string().optional(),
  departments:z.array(DepartmentSchema),
  theme:ThemeSchema.optional()
});
