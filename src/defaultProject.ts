import type {Project} from "./types";
export const defaultProject:Project={
  title:"الخريطة التشغيلية الشاملة",
  subtitle:"العمليات الرئيسية، نقاط القرار، مسارات الاستيفاء، والجهات المشاركة",
  theme:{pageSize:"16:9",fontFamily:"Arial",mainBlue:"#15479C",teal:"#078A97",processFill:"#EAF2FB",decisionFill:"#FFF3CD",exceptionFill:"#FDECEA",startEndFill:"#E7F6EA"},
  departments:[{
    id:"cash-reimbursement",name:"إدارة الاسترداد النقدي",subtitle:"Cross-Functional Flowchart",sourcePages:"4-10",
    panels:[{
      id:"contributions",title:"1. المساهمات",accent:"blue",
      lanes:[
        {id:"emp",name:"الموظف / مقدم الطلب"},
        {id:"maker",name:"إدارة الاسترداد النقدي - Maker"},
        {id:"reviewer",name:"إدارة الاسترداد النقدي - Reviewer"},
        {id:"payroll",name:"قطاع الأجور والمزايا"}
      ],
      nodes:[
        {id:"n1",x:300,y:60,data:{label:"بداية\nتقديم الطلب",laneId:"emp",kind:"start"}},
        {id:"n2",x:300,y:170,data:{label:"مراجعة إدارية",laneId:"maker",kind:"process"}},
        {id:"n3",x:300,y:290,data:{label:"هل الطلب مستوفٍ؟",laneId:"maker",kind:"decision"}},
        {id:"n4",x:300,y:410,data:{label:"مراجعة فنية",laneId:"reviewer",kind:"process"}},
        {id:"n5",x:300,y:540,data:{label:"مراجعة صحة المبالغ",laneId:"payroll",kind:"process"}},
        {id:"n6",x:300,y:670,data:{label:"نهاية\nإشعار الموظف + حفظ الأصول",laneId:"payroll",kind:"end"}}
      ],
      edges:[
        {id:"e1",source:"n1",target:"n2"},
        {id:"e2",source:"n2",target:"n3"},
        {id:"e3",source:"n3",target:"n4",label:"نعم"},
        {id:"e4",source:"n4",target:"n5"},
        {id:"e5",source:"n5",target:"n6"}
      ]
    }]
  }]
};