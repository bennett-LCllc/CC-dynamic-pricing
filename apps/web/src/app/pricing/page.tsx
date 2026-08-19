'use client';

import { Header } from '@/components/shared/Header';
import { calculateRate, getForecast } from '@/lib/api';
import { DollarSign, Info, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface RateResult {
  base_rate: number;
  seasonal_multiplier: number;
  dow_multiplier: number;
  event_multiplier: number;
  occupancy_multiplier: number;
  calculated_rate: number;
  floor: number;
  ceiling: number;
  final_rate: number;
}

interface ForecastItem {
  date: string;
  rate: number;
  is_booked: boolean;
  factors: {
    base_rate: number;
    seasonal: number;
    dow: number;
    event: number;
    occupancy: number;
    floor: number;
    ceiling: number;
  };
}

interface ForecastSummary {
  total_days: number;
  booked_days: number;
  available_days: number;
  avg_rate: number;
  min_rate: number;
  max_rate: number;
  projected_revenue: number;
}

export default function PricingPage() {
  const [baseRate, setBaseRate] = useState(175);
  const [propertyType, setPropertyType] = useState('STANDARD');
  const [bedrooms, setBedrooms] = useState(3);
  const [occupancyRate, setOccupancyRate] = useState(0.5);
  const [forecastDays, setForecastDays] = useState(30);

  const [singleRate, setSingleRate] = useState<RateResult | null>(null);
  const [singleDate, setSingleDate] = useState('');
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [forecastSummary, setForecastSummary] = useState<ForecastSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCalculate = async () => {
    if (!singleDate) {
      setError('Please select a date');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await calculateRate({
        base_rate: baseRate,
        target_date: singleDate,
        property_type: propertyType,
        bedrooms,
        upcoming_occupancy_rate: occupancyRate,
      });
      setSingleRate(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate rate');
    } finally {
      setLoading(false);
    }
  };

  const handleForecast = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getForecast({
        base_rate: baseRate,
        property_type: propertyType,
        bedrooms,
        days: forecastDays,
      });
      setForecast(result.forecast);
      setForecastSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Pricing Engine"
        subtitle="Dynamic nightly rate calculator for Corpus Christi STR properties"
      />

      <div className="p-8 space-y-6">
        {/* Configuration Card */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Property Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Base Rate ($)
              </label>
              <input
                type="number"
                value={baseRate}
                onChange={(e) => setBaseRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring"
              >
                <option value="BEACHFRONT">Beachfront</option>
                <option value="WATERFRONT">Waterfront</option>
                <option value="STANDARD">Standard</option>
                <option value="BUDGET">Budget</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Bedrooms
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Occupancy Rate (14-day)
              </label>
              <select
                value={occupancyRate}
                onChange={(e) => setOccupancyRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring"
              >
                <option value={0.1}>Very Low (10%)</option>
                <option value={0.3}>Low (30%)</option>
                <option value={0.5}>Normal (50%)</option>
                <option value={0.8}>High (80%)</option>
                <option value={0.95}>Near Full (95%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Forecast Days
              </label>
              <select
                value={forecastDays}
                onChange={(e) => setForecastDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Single Rate Calculator */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-ocean-500" />
              Single Night Calculator
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Calculating...' : 'Calculate Rate'}
              </button>

              {singleRate && (
                <div className="mt-4 p-4 bg-ocean-50 rounded-lg">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">Recommended Rate</p>
                    <p className="text-4xl font-bold text-ocean-600">${singleRate.final_rate}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Floor: ${singleRate.floor} • Ceiling: ${singleRate.ceiling}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Rate</span>
                      <span className="font-medium">${singleRate.base_rate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seasonal</span>
                      <span className="font-medium">×{singleRate.seasonal_multiplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Day of Week</span>
                      <span className="font-medium">×{singleRate.dow_multiplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Event</span>
                      <span className="font-medium">×{singleRate.event_multiplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Occupancy</span>
                      <span className="font-medium">×{singleRate.occupancy_multiplier}</span>
                    </div>
                    <div className="border-t border-ocean-200 pt-2 flex justify-between font-semibold">
                      <span>Calculated</span>
                      <span>${singleRate.calculated_rate}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Forecast */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-palm-500" />
              Rate Forecast
            </h3>
            <button
              onClick={handleForecast}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-palm-500 text-white rounded-lg font-medium hover:bg-palm-600 transition-colors disabled:opacity-50 mb-4"
            >
              {loading ? 'Generating...' : `Generate ${forecastDays}-Day Forecast`}
            </button>

            {forecastSummary && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Avg Rate</p>
                    <p className="text-lg font-bold">${forecastSummary.avg_rate}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Projected Revenue</p>
                    <p className="text-lg font-bold">
                      ${forecastSummary.projected_revenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Min / Max</p>
                    <p className="text-lg font-bold">
                      ${forecastSummary.min_rate} / ${forecastSummary.max_rate}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Available / Booked</p>
                    <p className="text-lg font-bold">
                      {forecastSummary.available_days} / {forecastSummary.booked_days}
                    </p>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Rate</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.map((item) => (
                        <tr key={item.date} className="border-b border-border/50">
                          <td className="py-2">{item.date}</td>
                          <td className="py-2 text-right font-medium">
                            {item.is_booked ? '—' : `$${item.rate}`}
                          </td>
                          <td className="py-2 text-right">
                            {item.is_booked ? (
                              <span className="badge badge-info">Booked</span>
                            ) : (
                              <span className="badge badge-success">Available</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-ocean-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">How the Pricing Engine Works</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>
                  • <strong>Seasonal:</strong> Corpus Christi peak season (Jun–Aug) commands 25–30%
                  premium. Winter months (Jan–Feb) are discounted 20–25%.
                </li>
                <li>
                  • <strong>Day of Week:</strong> Friday/Saturday nights command 20–25% premium.
                  Monday/Tuesday are discounted 15–20%.
                </li>
                <li>
                  • <strong>Events:</strong> Spring Break (March), Memorial Day, July 4th, and
                  Buccaneer Days trigger event multipliers up to 40%.
                </li>
                <li>
                  • <strong>Occupancy:</strong> When your next 14 days are 90%+ booked, rates surge
                  30%. Below 30%, rates drop 20% to fill gaps.
                </li>
                <li>
                  • <strong>Floors/Ceilings:</strong> Based on property type and bedroom count.
                  Beachfront 1BR floors at $150/night.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
