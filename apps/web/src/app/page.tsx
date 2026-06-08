import { Header } from '@/components/shared/Header';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { LLCSummary } from '@/components/dashboard/LLCSummary';

export default function DashboardPage() {
  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Corpus Christi STR Portfolio — All three LLCs at a glance"
      />

      <div className="p-8 space-y-6">
        {/* Stats Row */}
        <StatsCards />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <QuickActions />
            <RecentActivity />
          </div>

          {/* Right Column (1/3) */}
          <div className="space-y-6">
            <LLCSummary />
            <AlertsPanel />
          </div>
        </div>

        {/* Getting Started Banner */}
        <div className="card p-6 bg-gradient-to-r from-ocean-50 to-ocean-100 border-ocean-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-ocean-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ocean-900">Getting Started</h3>
              <p className="text-sm text-ocean-700 mt-1">
                Your platform is ready. Here&apos;s what to do next:
              </p>
              <ol className="mt-3 space-y-2 text-sm text-ocean-800">
                <li className="flex items-start gap-2">
                  <span className="badge badge-info">1</span>
                  <span>Set up your database: <code className="bg-ocean-200 px-1.5 py-0.5 rounded text-xs">npm run db:push</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="badge badge-info">2</span>
                  <span>Seed your first property data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="badge badge-info">3</span>
                  <span>Start the pricing engine: <code className="bg-ocean-200 px-1.5 py-0.5 rounded text-xs">cd apps/api && uvicorn src.main:app --reload</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="badge badge-info">4</span>
                  <span>Connect Airbnb/VRBO calendar feeds</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
