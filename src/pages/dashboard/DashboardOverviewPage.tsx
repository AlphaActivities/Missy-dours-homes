import { useEffect, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, TrendingUp, Users, Zap } from 'lucide-react';
import StatusBadge, { LeadStatus } from '../../components/dashboard/ui/StatusBadge';
import { SkeletonRecentRow } from '../../components/dashboard/ui/LeadSkeleton';
import { timeAgo } from '../../utils/formatDate';

interface RecentLead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  status: LeadStatus;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

// ── Stat card skeleton ────────────────────────────────────────
function StatSkeleton() {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'var(--ds-bg-raised)', boxShadow: 'var(--ds-shadow-card)' }}
    >
      <div className="ds-skeleton h-3 w-24 mb-4 rounded" />
      <div className="ds-skeleton h-9 w-16 rounded" />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | null;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-6 transition-all duration-200"
      style={{
        background: accent ? 'var(--ds-gold-muted)' : 'var(--ds-bg-raised)',
        boxShadow: accent ? 'var(--ds-shadow-card), 0 0 0 1px rgba(196,164,106,0.2)' : 'var(--ds-shadow-card)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: accent ? 'var(--ds-gold)' : 'var(--ds-text-tertiary)' }}>
          {icon}
        </span>
        <p
          className="text-[11px] font-medium tracking-[0.14em] uppercase"
          style={{ color: accent ? 'var(--ds-gold-light)' : 'var(--ds-text-secondary)' }}
        >
          {label}
        </p>
      </div>
      <p
        className="text-4xl font-light tracking-tight"
        style={{ color: accent ? 'var(--ds-gold-light)' : 'var(--ds-text-primary)' }}
      >
        {value === null ? (
          <span className="ds-skeleton inline-block w-12 h-9 rounded align-middle" />
        ) : (
          value.toLocaleString()
        )}
      </p>
    </div>
  );
}

// ── Recent lead row ───────────────────────────────────────────
function RecentLeadRow({ lead }: { lead: RecentLead }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3 transition-colors duration-150"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: 'var(--ds-text-primary)' }}
        >
          {lead.name || '—'}
        </p>
        <p
          className="text-xs mt-0.5 truncate"
          style={{ color: 'var(--ds-text-tertiary)' }}
        >
          {lead.email}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <StatusBadge status={lead.status} />
        <span
          className="text-xs whitespace-nowrap"
          style={{ color: 'var(--ds-text-tertiary)' }}
        >
          {timeAgo(lead.created_at)}
        </span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [totalLeads, setTotalLeads] = useState<number | null>(null);
  const [newLeads, setNewLeads] = useState<number | null>(null);
  const [weekLeads, setWeekLeads] = useState<number | null>(null);
  const [recentLeads, setRecentLeads] = useState<RecentLead[] | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase
        .from('leads')
        .select('id, created_at, name, email, status')
        .order('created_at', { ascending: false })
        .limit(5),
    ]).then(([total, newCount, week, recent]) => {
      setTotalLeads(total.count ?? 0);
      setNewLeads(newCount.count ?? 0);
      setWeekLeads(week.count ?? 0);
      setRecentLeads((recent.data as RecentLead[]) ?? []);
      setStatsLoading(false);
    });
  }, []);

  const greeting = getGreeting();

  return (
    <div
      className="p-6 sm:p-8 lg:p-10 max-w-screen-xl mx-auto animate-ds-fade-up"
      style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
    >
      {/* ── Greeting ─────────────────────────────────────── */}
      <div className="mb-10">
        <h1
          className="text-3xl sm:text-4xl font-light tracking-tight"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: 'var(--ds-text-primary)',
          }}
        >
          {greeting}
        </h1>
        <p
          className="text-sm mt-2"
          style={{ color: 'var(--ds-text-secondary)' }}
        >
          {user?.email} · Your lead activity at a glance
        </p>
      </div>

      {/* ── Stat cards ───────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total leads"
            value={totalLeads}
            icon={<Users size={15} />}
          />
          <StatCard
            label="This week"
            value={weekLeads}
            icon={<TrendingUp size={15} />}
          />
          <StatCard
            label="New — uncontacted"
            value={newLeads}
            icon={<Zap size={15} />}
            accent={!!newLeads && newLeads > 0}
          />
        </div>
      )}

      {/* ── Recent leads ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'var(--ds-text-primary)' }}
          >
            Recent submissions
          </h2>
          <Link
            to="/dashboard/leads"
            className="flex items-center gap-1.5 text-xs font-medium transition-colors duration-150"
            style={{ color: 'var(--ds-gold-dim)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-gold-dim)')}
          >
            View all
            <ArrowRight size={13} />
          </Link>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--ds-bg-raised)', boxShadow: 'var(--ds-shadow-card)' }}
        >
          {recentLeads === null ? (
            <div className="px-5 py-2">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonRecentRow key={i} />)}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'var(--ds-bg-overlay)' }}
              >
                <Users size={20} style={{ color: 'var(--ds-text-tertiary)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--ds-text-secondary)' }}>
                No leads yet
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
                Submissions from your website will appear here.
              </p>
            </div>
          ) : (
            <div className="px-5">
              {recentLeads.map(lead => (
                <RecentLeadRow key={lead.id} lead={lead} />
              ))}
              <div className="py-3.5">
                <Link
                  to="/dashboard/leads"
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors duration-150"
                  style={{ color: 'var(--ds-text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
                >
                  See all leads
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
