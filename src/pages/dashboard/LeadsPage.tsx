import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import LeadList, { Lead } from '../../components/dashboard/LeadList';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

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
      setError('Failed to load leads. Please try again.');
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

  return (
    <div className="p-6 lg:p-8 max-w-screen-xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">Leads</h1>
          {!loading && (
            <p className="text-sm text-neutral-500 mt-0.5">
              {total === 0 ? 'No submissions yet' : `${total} total submission${total !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchLeads(page)}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-neutral-700 border-t-neutral-300 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={() => fetchLeads(page)}
              className="mt-4 text-xs text-neutral-500 hover:text-neutral-300 border border-neutral-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          <LeadList leads={leads} />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-neutral-600">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} />
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
