import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, ArrowRight } from 'lucide-react';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [totalLeads, setTotalLeads] = useState<number | null>(null);
  const [newLeads, setNewLeads] = useState<number | null>(null);

  useEffect(() => {
    async function loadCounts() {
      const [{ count: total }, { count: newCount }] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      ]);
      setTotalLeads(total ?? 0);
      setNewLeads(newCount ?? 0);
    }
    loadCounts();
  }, []);

  const firstName = user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="p-6 lg:p-8 max-w-screen-xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-100 tracking-tight">
          Welcome back, {firstName}.
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Here's what's happening with your leads.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Total leads"
          value={totalLeads}
          icon={<Users size={18} className="text-neutral-400" />}
        />
        <StatCard
          label="New (uncontacted)"
          value={newLeads}
          icon={<span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 mt-0.5" />}
        />
      </div>

      {/* Quick link */}
      <Link
        to="/dashboard/leads"
        className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-100 border border-neutral-800 hover:border-neutral-700 px-4 py-2.5 rounded-xl transition-colors"
      >
        View all leads
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-3xl font-semibold text-neutral-100 tracking-tight">
        {value === null ? (
          <span className="text-neutral-700 text-lg">—</span>
        ) : (
          value.toLocaleString()
        )}
      </p>
    </div>
  );
}
