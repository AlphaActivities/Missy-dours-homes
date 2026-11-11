// Some older callback records contain an internal recovery marker rather
// than a message written by the visitor. Preserve the stored audit value and
// translate it only when displaying it to Missy's team.
const recoveredCallbackMarker='Recovered consented concierge callback';
export const isRecoveredCallbackMessage=(message:string|null|undefined)=>
  message?.trim()===recoveredCallbackMarker;
export const displayLeadMessage=(message:string|null|undefined)=>
  isRecoveredCallbackMessage(message)
    ?'Previous website chat callback request, linked to this customer.'
    :(message??'');
