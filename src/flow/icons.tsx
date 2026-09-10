export type IconKey="person"|"gear"|"search"|"doctor"|"computer"|"database"|"group"|"clipboard";

export const ICON_LABELS:Record<IconKey,string>={
  person:"شخص / مقدم طلب", gear:"إدارة / Maker", search:"مراجعة / Check",
  doctor:"مختص طبي", computer:"نظام", database:"قاعدة بيانات",
  group:"مجموعة / قسم", clipboard:"إدارة حالات"
};

/** Flat monochrome line icons (currentColor), 24x24 viewBox, matching the reference lane-icon style. */
const PATHS:Record<IconKey,JSX.Element>={
  person:<>
    <circle cx="12" cy="7.5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </>,
  gear:<>
    <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6M18.1 18.1l-1.6-1.6M7.5 7.5 5.9 5.9"/>
  </>,
  search:<>
    <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M18.5 18.5 15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </>,
  doctor:<>
    <path d="M8 3.5v4a4 4 0 0 0 8 0v-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M8 6H6.5A1.5 1.5 0 0 0 5 7.5V11a5 5 0 0 0 5 5v0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M16 6h1.5A1.5 1.5 0 0 1 19 7.5v1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="19.5" cy="10.5" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="10" cy="19" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
  </>,
  computer:<>
    <rect x="3.5" y="5" width="17" height="11" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M8.5 20h7M12 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </>,
  database:<>
    <ellipse cx="12" cy="6" rx="7" ry="2.6" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" fill="none" stroke="currentColor" strokeWidth="1.8"/>
  </>,
  group:<>
    <circle cx="8.3" cy="8" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.7"/>
    <circle cx="16.2" cy="8" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M3 19c.4-3 2.6-5 5.3-5s4.9 2 5.3 5M10.4 19c.4-3 2.6-5 5.3-5s4.9 2 5.3 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </>,
  clipboard:<>
    <rect x="5.5" y="4.5" width="13" height="16" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    <rect x="9" y="3" width="6" height="3" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </>
};

export function LaneIcon({icon,size=20,className}:{icon?:string; size?:number; className?:string}){
  const key=icon as IconKey;
  if(!key || !PATHS[key]) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">{PATHS[key]}</svg>;
}
