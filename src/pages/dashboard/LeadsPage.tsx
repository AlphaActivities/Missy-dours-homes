import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import LeadList, { Lead } from '../../components/dashboard/LeadList';
import LeadDrawer from '../../components/dashboard/ui/LeadDrawer';
import LeadSkeleton from '../../components/dashboard/ui/LeadSkeleton';
import SectionHeader from '../../components/dashboard/ui/SectionHeader';
import { LeadStatus } from '../../components/dashboard/ui/StatusBadge';
import { RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Search, X } from 'lucide-react';

const PAGE_SIZE = 25;

type FilterValue = 'all' | LeadStatus;

const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'new',       label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'closed',    label: 'Closed' },
  { value: 'archived',  label: 'Archived' },
];

const VALID_FILTERS = new Set<FilterValue>(['all', 'new', 'contacted', 'qualified', 'closed', 'archived']);

export default function LeadsPage() {
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<FilterValue>(() => {
    const param = searchParams.get('filter') as FilterValue | null;
    return param && VALID_FILTERS.has(param) ? param : 'all';
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Debounced search ──────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(0);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  // ── Fetch ─────────────────────────────────────────────────
  const fetchLeads = useCallback(async (
    currentPage: number,
    currentFilter: FilterValue,
    currentSearch: string,
  ) => {
    setLoading(true);
    setError(null);

    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (currentFilter !== 'all') {
      query = query.eq('status', currentFilter);
    }

    if (currentSearch) {
      query = query.or(
        `name.ilike.%${currentSearch}%,email.ilike.%${currentSearch}%,phone.ilike.%${currentSearch}%`
      );
    }

    const { data, error: fetchError, count } = await query;

    if (fetchError) {
      setError('Unable to load leads. Please try again.');
      setLoading(false);
      return;
    }

    setLeads((data as Lead[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, []);

  // Re-fetch when page, filter, or debounced search changes
  useEffect(() => {
    fetchLeads(page, filter, searchQuery);
  }, [page, filter, searchQuery, fetchLeads]);

  // When filter changes, reset to page 0
  const handleFilterChange = (next: FilterValue) => {
    setFilter(next);
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    searchRef.current?.focus();
  };

  // Refresh preserves current filter/search/page
  const handleRefresh = () => fetchLeads(page, filter, searchQuery);

  // ── Drawer ────────────────────────────────────────────────
  const handleOpenDrawer = useCallback((lead: Lead) => {
    setDrawerLead(lead);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerLead(null);
  }, []);

  // When status/notes update via drawer, sync into local leads array
  const handleLeadsChange = useCallback((updated: Lead[]) => {
    setLeads(updated);
    // Also update drawer if it's showing the same lead
    setDrawerLead(prev => {
      if (!prev) return null;
      return updated.find(l => l.id === prev.id) ?? prev;
    });
  }, []);

  const handleDrawerStatusChange = useCallback(async (id: string, next: LeadStatus) => {
    // Delegate to LeadList via the shared Supabase path — but since drawer is
    // outside LeadList, we call Supabase directly here and update both states.
    const { error } = await supabase
      .from('leads')
      .update({ status: next })
      .eq('id', id);

    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: next } : l));
      setDrawerLead(prev => prev?.id === id ? { ...prev, status: next } : prev);
    }
    // Toast is fired inside LeadList for list updates; drawer has its own feedback path
  }, []);

  const handleDrawerSaveNotes = useCallback(async (id: string, notes: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ notes })
      .eq('id', id);

    if (error) throw error;

    setLeads(prev => prev.map(l => l.id === id ? { ...l, notes } : l));
    setDrawerLead(prev => prev?.id === id ? { ...prev, notes } : prev);
  }, []);

  // ── Derived ───────────────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const isFiltered = filter !== 'all' || searchQuery !== '';

  const subtitle = loading
    ? undefined
    : total === 0
    ? isFiltered ? 'No matching leads' : 'No submissions yet'
    : `${total} ${isFiltered ? 'matching ' : ''}submission${total !== 1 ? 's' : ''}`;

  return (
    <>
      <div
        className="px-4 py-6 sm:px-6 sm:py-8 lg:px-6 lg:py-8 animate-ds-fade-up"
        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
      >
        {/* ── Page header ──────────────────────────────────── */}
        <SectionHeader
          title="Leads"
          subtitle={subtitle}
          action={
            <div className="flex items-center gap-2">
              {/* Search input */}
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--ds-text-tertiary)' }}
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search name, email, phone…"
                  className="h-9 pl-8 pr-8 rounded-xl text-xs outline-none transition-all duration-200 w-48 sm:w-64"
                  style={{
                    background: 'var(--ds-bg-raised)',
                    color: 'var(--ds-text-primary)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
                  }}
                  onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1.5px var(--ds-gold)')}
                  onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.07)')}
                />
                {searchInput && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors duration-150"
                    style={{ color: 'var(--ds-text-tertiary)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all duration-150 disabled:opacity-40 h-9"
                style={{
                  color: 'var(--ds-text-secondary)',
                  background: 'var(--ds-bg-raised)',
                  boxShadow: 'var(--ds-shadow-card)',
                }}
                onMouseEnter={e => !loading && (e.currentTarget.style.color = 'var(--ds-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          }
        />

        {/* ── Filter tabs ───────────────────────────────────── */}
        <div
          className="flex items-center gap-1 mb-4 overflow-x-auto py-1 -my-1 px-1 -mx-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {FILTER_TABS.map(tab => {
            const isActive = filter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleFilterChange(tab.value)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                style={{
                  background: isActive ? 'var(--ds-gold-muted)' : 'transparent',
                  color: isActive ? 'var(--ds-gold-light)' : 'var(--ds-text-secondary)',
                  boxShadow: isActive ? '0 0 0 1px rgba(196,164,106,0.3)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.color = 'var(--ds-text-primary)';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.color = 'var(--ds-text-secondary)';
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Main content card ─────────────────────────────── */}
        <div
          className="rounded-2xl flex flex-col"
          style={{
            background: 'var(--ds-bg-raised)',
            boxShadow: 'var(--ds-shadow-card)',
            minHeight: '520px',
          }}
        >
          {loading ? (
            <>
              <LeadSkeleton variant="table" rows={8} />
              <LeadSkeleton variant="card" cards={3} />
            </>
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
                onClick={handleRefresh}
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
            <LeadList
              leads={leads}
              onLeadsChange={handleLeadsChange}
              onOpenDrawer={handleOpenDrawer}
              isFiltered={isFiltered}
              onClearSearch={handleClearSearch}
            />
          )}
        </div>

        {/* ── Pagination ────────────────────────────────────── */}
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

      {/* ── Lead drawer (rendered outside the padded page div) ── */}
      <LeadDrawer
        lead={drawerLead}
        onClose={handleCloseDrawer}
        onStatusChange={handleDrawerStatusChange}
        onSaveNotes={handleDrawerSaveNotes}
      />
    </>
  );
}
