import { Mail, Phone, MessageSquare, MapPin, Tag, Calendar, Users } from 'lucide-react';

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  source_page: string;
  listing_slug: string;
  status: 'new' | 'contacted' | 'qualified' | 'closed' | 'archived';
}

const STATUS_STYLES: Record<Lead['status'], string> = {
  new:       'bg-sky-950/60 text-sky-300 border-sky-800/50',
  contacted: 'bg-amber-950/60 text-amber-300 border-amber-800/50',
  qualified: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
  closed:    'bg-neutral-800/60 text-neutral-400 border-neutral-700/50',
  archived:  'bg-neutral-900/60 text-neutral-600 border-neutral-800/50',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: Lead['status'] }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_STYLES[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Desktop Table ────────────────────────────────────────────
function LeadTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800">
            {['Date', 'Name', 'Contact', 'Message', 'Source', 'Status'].map(col => (
              <th
                key={col}
                className="text-left text-[11px] font-medium text-neutral-500 uppercase tracking-wider px-4 py-3 first:pl-6 last:pr-6"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {leads.map(lead => (
            <tr key={lead.id} className="hover:bg-neutral-800/30 transition-colors">
              <td className="px-4 py-4 pl-6 align-top">
                <span className="text-xs text-neutral-500 whitespace-nowrap">{formatDate(lead.created_at)}</span>
              </td>
              <td className="px-4 py-4 align-top">
                <span className="font-medium text-neutral-200 whitespace-nowrap">{lead.name || '—'}</span>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="space-y-1">
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      <Mail size={12} className="shrink-0" />
                      {lead.email}
                    </a>
                  )}
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      <Phone size={12} className="shrink-0" />
                      {lead.phone}
                    </a>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 align-top max-w-xs">
                <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">{lead.message || '—'}</p>
              </td>
              <td className="px-4 py-4 align-top">
                <div className="space-y-1">
                  {lead.source_page && (
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <MapPin size={11} className="shrink-0" />
                      {lead.source_page}
                    </span>
                  )}
                  {lead.listing_slug && (
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <Tag size={11} className="shrink-0" />
                      {lead.listing_slug}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 pr-6 align-top">
                <StatusBadge status={lead.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile Cards ─────────────────────────────────────────────
function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-200 text-sm">{lead.name || '—'}</p>
          <p className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
            <Calendar size={11} />
            {formatDate(lead.created_at)}
          </p>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      {/* Contact */}
      <div className="space-y-1.5">
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <Mail size={12} className="shrink-0 text-neutral-600" />
            {lead.email}
          </a>
        )}
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <Phone size={12} className="shrink-0 text-neutral-600" />
            {lead.phone}
          </a>
        )}
      </div>

      {/* Message */}
      {lead.message && (
        <div className="flex gap-2">
          <MessageSquare size={12} className="shrink-0 text-neutral-600 mt-0.5" />
          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-4">{lead.message}</p>
        </div>
      )}

      {/* Source */}
      {(lead.source_page || lead.listing_slug) && (
        <div className="pt-1 border-t border-neutral-800 flex flex-wrap gap-x-4 gap-y-1">
          {lead.source_page && (
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-600">
              <MapPin size={11} />
              {lead.source_page}
            </span>
          )}
          {lead.listing_slug && (
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-600">
              <Tag size={11} />
              {lead.listing_slug}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Exported Component ───────────────────────────────────────
interface LeadListProps {
  leads: Lead[];
}

export default function LeadList({ leads }: LeadListProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
          <Users size={20} className="text-neutral-500" />
        </div>
        <p className="text-neutral-500 text-sm">No leads yet.</p>
        <p className="text-neutral-700 text-xs mt-1">Submissions will appear here.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <LeadTable leads={leads} />
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3 p-4">
        {leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
      </div>
    </>
  );
}
