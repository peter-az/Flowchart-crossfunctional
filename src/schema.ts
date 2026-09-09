import {z} from "zod";
export const ProjectSchema=z.object({
  title:z.string(), subtitle:z.string(), sourceFileName:z.string().optional(),
  departments:z.array(z.object({
    id:z.string(), name:z.string(), subtitle:z.string(), sourcePages:z.string().optional(),
    panels:z.array(z.object({
      id:z.string(), title:z.string(), accent:z.enum(["blue","teal"]),
      lanes:z.array(z.object({id:z.string(),name:z.string(),icon:z.string().optional()})),
      nodes:z.array(z.object({
        id:z.string(),x:z.number(),y:z.number(),
        data:z.object({
          label:z.string(),laneId:z.string(),kind:z.enum(["start","process","decision","exception","end"]),
          width:z.number().optional(),height:z.number().optional(),
          source:z.object({page:z.string().optional(),excerpt:z.string().optional()}).optional()
        })
      })),
      edges:z.array(z.object({
        id:z.string(),source:z.string(),target:z.string(),
        label:z.string().optional(),exception:z.boolean().optional()
      }))
    }))
  })),
  theme:z.any().optional()
});