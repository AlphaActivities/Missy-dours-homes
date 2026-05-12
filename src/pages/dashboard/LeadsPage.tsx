import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import LeadList, { Lead } from '../../components/dashboard/LeadList';
import LoadingSpinner from '../../components/dashboard/ui/LoadingSpinner';
import SectionHeader from '../../components/dashboard/ui/SectionHeader';
import { RefreshCw, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const PAGE_SIZE = 25;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);

    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error: fetchError, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (fetchError) {
      setError('Unable to load leads. Please try again.');
      setLoading(false);
      return;
    }

    setLeads((data as Lead[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads(page);
  }, [page, fetchLeads]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const subtitle = loading
    ? undefined
    : total === 0
    ? 'No submissions yet'
    : `${total} total submission${total !== 1 ? 's' : ''}`;

  return (
    <div
      className="p-6 sm:p-8 lg:p-10 max-w-screen-xl mx-auto animate-ds-fade-up"
      style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
    >
      <SectionHeader
        title="Leads"
        subtitle={subtitle}
        action={
          <button
            onClick={() => fetchLeads(page)}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all duration-150 disabled:opacity-40"
            style={{
              color: 'var(--ds-text-secondary)',
              background: 'var(--ds-bg-raised)',
              boxShadow: 'var(--ds-shadow-card)',
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.color = 'var(--ds-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Main table card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--ds-bg-raised)',
          boxShadow: 'var(--ds-shadow-card)',
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <LoadingSpinner size="md" />
            <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
              Loading leads…
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              <AlertCircle size={18} style={{ color: '#f87171' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#f87171' }}>
              {error}
            </p>
            <button
              onClick={() => fetchLeads(page)}
              className="text-xs px-4 py-2 rounded-xl transition-all duration-150"
              style={{
                color: 'var(--ds-text-secondary)',
                background: 'var(--ds-bg-overlay)',
                boxShadow: 'var(--ds-shadow-card)',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
            >
              Try again
            </button>
          </div>
        ) : (
          <LeadList leads={leads} onLeadsChange={setLeads} />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                color: 'var(--ds-text-secondary)',
                background: 'var(--ds-bg-raised)',
                boxShadow: 'var(--ds-shadow-card)',
              }}
              onMouseEnter={e => !(page === 0) && (e.currentTarget.style.color = 'var(--ds-text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
            >
              <ChevronLeft size={13} />
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl font-medium transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                color: 'var(--ds-text-secondary)',
                background: 'var(--ds-bg-raised)',
                boxShadow: 'var(--ds-shadow-card)',
              }}
              onMouseEnter={e => !(page >= totalPages - 1) && (e.currentTarget.style.color = 'var(--ds-text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
            >
              Next
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
