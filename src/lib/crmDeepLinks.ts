// Only local, authorized dashboard destinations are accepted. Never use an
// arbitrary URL supplied in a notification or login redirect.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function safeCrmDestination(value:unknown):string|null {
 if(typeof value!=='string'||value.length>180)return null;
 if(value==='/dashboard/concierge-qa')return value;
 if(value==='/dashboard/notifications')return value;
 if(value==='/dashboard/conversations')return value;
 const match=/^\/dashboard\/(conversations|leads)\?(conversation|lead)=([^&#]+)$/.exec(value);
 if(!match)return null;
 if(match[1]==='conversations'&&match[2]!=='conversation')return null;
 if(match[1]==='leads'&&match[2]!=='lead')return null;
 return uuid.test(match[3])?value:null;
}
