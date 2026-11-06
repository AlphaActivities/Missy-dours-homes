import {BellRing} from 'lucide-react';
import CrmActivityCenter from '../../components/dashboard/CrmActivityCenter';

export default function NotificationsPage(){
 return <main className="mx-auto max-w-5xl px-4 py-7 text-[#ecdbc2] md:px-8 md:py-9">
  <div className="mb-6 flex items-center gap-3">
   <BellRing className="shrink-0 text-[#d7b878]" size={25}/>
   <div><h1 className="font-serif text-2xl">Notifications</h1><p className="mt-1 text-sm text-[#bdb0a0]">Stay informed about new inquiries, conversations, and follow-ups.</p></div>
  </div>
  <CrmActivityCenter/>
 </main>;
}
