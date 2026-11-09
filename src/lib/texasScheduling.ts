// Dallas office scheduling is authoritative; timestamps are stored as UTC instants.
// Never interpret office appointments in a staff device's local time zone.
const zone='America/Chicago';
const officeFormatter=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'});
const fields=(date:Date)=>Object.fromEntries(officeFormatter.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
export const texasToday=()=>{const p=fields(new Date());return p.year+'-'+p.month+'-'+p.day;};
export const texasDateTime=(date:Date|string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(date));
export const viewerDateTime=(date:Date|string)=>new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(date));
export function texasWallTimeToUtc(day:string,time:string):Date{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^\d{2}:\d{2}$/.test(time))throw Error('Select a valid Texas date and time.');
 const [y,m,d]=day.split('-').map(Number),[hh,mm]=time.split(':').map(Number);
 if(y<2020||y>2100||hh>23||mm>59)throw Error('Invalid date or time.');
 const target=Date.UTC(y,m-1,d,hh,mm);
 const valid=new Date(Date.UTC(y,m-1,d));
 if(valid.getUTCFullYear()!==y||valid.getUTCMonth()!==m-1||valid.getUTCDate()!==d)throw Error('Invalid date.');
 let utc=target+6*3600000;
 for(let n=0;n<4;n++){
  const p=fields(new Date(utc));
  const shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);
  utc+=target-shown;
 }
 const result=new Date(utc),p=fields(result);
 if(p.year!==day.slice(0,4)||p.month!==day.slice(5,7)||p.day!==day.slice(8,10)||p.hour!==time.slice(0,2)||p.minute!==time.slice(3,5))throw Error('This time does not exist in Dallas.');
 return result;
}
export function validateTexasOfficeSlot(day:string,time:string){
 const instant=texasWallTimeToUtc(day,time);
 const weekday=fields(instant).weekday;
 const minutes=Number(time.slice(0,2))*60+Number(time.slice(3,5));
 if(weekday==='Sat'||weekday==='Sun'||minutes<9*60||minutes>17*60)throw Error('Select Monday through Friday, 9 AM to 5 PM Dallas time.');
 if(instant.getTime()<=Date.now())throw Error('Choose a future time.');
 return instant;
}
export function nextTexasSlot(hour:10|14=10){
 const now=new Date();
 for(let offset=0;offset<370;offset++){
  const p=fields(new Date(now.getTime()+offset*86400000));
  if(p.weekday==='Sat'||p.weekday==='Sun')continue;
  const date=p.year+'-'+p.month+'-'+p.day,time=(hour===10?'10:00':'14:00');
  const utc=texasWallTimeToUtc(date,time);
  if(utc.getTime()>now.getTime()+5*60000)return {date,time};
 }
 throw Error('Unable to calculate next Texas office day.');
}
