/** Original, synthesized CRM alert tones. No audio downloads or third-party assets. */
export const soundChoices=[
 {value:'signature',label:'Signature Chime',description:'The original two-note sound you already liked.'},
 {value:'crystal',label:'Crystal',description:'Clear, bright incoming inquiry.'},
 {value:'executive',label:'Executive',description:'A deeper, confident escalation cue.'},
 {value:'soft',label:'Soft Arrival',description:'Gentle staff activity confirmation.'},
 {value:'silent',label:'Silent',description:'No in-app tone for this category.'},
] as const;
export type CrmSound=typeof soundChoices[number]['value'];
export function isCrmSound(value:unknown):value is CrmSound{
 return typeof value==='string'&&soundChoices.some(choice=>choice.value===value);
}
let audio:AudioContext|null=null;
export async function unlockCrmAudio(){
 try{
  if(typeof window==='undefined')return;
  audio??=new AudioContext();
  await audio.resume();
 }catch{/* iOS controls audio permission. Never break the dashboard. */}
}
export function isCrmAudioRunning(){return audio?.state==='running';}
/** Play without delaying event handling. Only previews may call unlock first. */
export function playCrmSound(sound:CrmSound){
 if(sound==='silent'||!audio||audio.state!=='running')return;
 try{
  const now=audio.currentTime;
  const notes= sound==='signature'
   ?[{freq:740,start:0,duration:.25,level:.055,type:'sine' as OscillatorType},{freq:988,start:.12,duration:.25,level:.055,type:'sine' as OscillatorType}]
   :sound==='crystal'
   ?[{freq:1046.5,start:0,duration:.31,level:.045,type:'sine' as OscillatorType},{freq:1568,start:.11,duration:.4,level:.024,type:'sine' as OscillatorType}]
   :sound==='executive'
   ?[{freq:392,start:0,duration:.30,level:.07,type:'sine' as OscillatorType},{freq:523.25,start:.17,duration:.40,level:.052,type:'sine' as OscillatorType}]
   :[{freq:659.25,start:0,duration:.24,level:.027,type:'sine' as OscillatorType}];
  for(const note of notes){
   const osc=audio.createOscillator(),gain=audio.createGain();
   osc.type=note.type;osc.frequency.value=note.freq;
   const start=now+note.start;
   gain.gain.setValueAtTime(.0001,start);
   gain.gain.exponentialRampToValueAtTime(note.level,start+.015);
   gain.gain.exponentialRampToValueAtTime(.0001,start+note.duration);
   osc.connect(gain);gain.connect(audio.destination);
   osc.start(start);osc.stop(start+note.duration+.015);
  }
 }catch{/* Best-effort foreground audio. */}
}
export async function previewCrmSound(sound:CrmSound){
 await unlockCrmAudio();
 playCrmSound(sound);
}
