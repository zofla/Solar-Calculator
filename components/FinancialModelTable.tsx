'use client';

import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import * as XLSX from 'xlsx';

// Register Chart.js components once
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type FinancialRow = {
  yr: number;
  rep: number;
  rpp: number;
  po: number;
  ast: number;
  asp: number;
  tas: number;
  csr: number;
  ei: number;
  cc: number;
  roi: number;
  cs_less_cc: number;
};

type CalculationResult = {
  totalSystemCost: number;
  // other fields exist, but we only need cost here
};

interface Props {
  calculation: CalculationResult | null;
}

const FinancialModelTable: React.FC<Props> = ({ calculation }) => {
  const [rows, setRows] = useState<FinancialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthlySpend, setMonthlySpend] = useState('');
  const [weeklyPetrol, setWeeklyPetrol] = useState('');
  const [totalSavings, setTotalSavings] = useState<number | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleCalculate = async () => {
    try {
      setLoading(true);
      setError(null);

      const monthlySpendNum = Number(monthlySpend);
      const weeklyPetrolNum = Number(weeklyPetrol);

      if (
        isNaN(monthlySpendNum) ||
        isNaN(weeklyPetrolNum) ||
        monthlySpendNum < 0 ||
        weeklyPetrolNum < 0
      ) {
        throw new Error(
          'Please enter valid positive numbers for monthly spend and weekly petrol consumption.'
        );
      }

      const tariffSav = monthlySpendNum * 5;
      const petrolSav = weeklyPetrolNum * 52;
      const totalSavYr1 = tariffSav + petrolSav;
      setTotalSavings(totalSavYr1);

      const totalSystemCost = calculation?.totalSystemCost;
      if (!totalSystemCost) {
        throw new Error('Total system cost not available from calculator.');
      }

      const res = await fetch('/api/financial-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          init_inv: totalSystemCost,
          tariff_sav: tariffSav,
          petrol_sav: petrolSav,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Financial model API error: ${txt}`);
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid financial model data: Response is not an array.');
      }

      const normalized: FinancialRow[] = data.map((row: any) => ({
        yr: Number(row.yr ?? row.Yr ?? row.year ?? 0),
        rep: Number(row.rep ?? row.REP ?? 0),
        rpp: Number(row.rpp ?? row.RPP ?? 0),
        po: Number(row.po ?? row.PO ?? 0),
        ast: Number(row.ast ?? row.AST ?? 0),
        asp: Number(row.asp ?? row.ASP ?? 0),
        tas: Number(row.tas ?? row.TAS ?? 0),
        csr: Number(row.csr ?? row.CSR ?? 0),
        ei: Number(row.ei ?? row.EI ?? 0),
        cc: Number(row.cc ?? row.CC ?? 0),
        roi: Number(row.roi ?? row.ROI ?? 0),
        cs_less_cc: Number(
          row.cs_less_cc ?? row.CS_less_CC ?? row.CS_Less_CC ?? row.csLessCc ?? 0
        ),
      }));

      setRows(normalized);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load financial model data.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Export helpers ----

  const handleExportCSV = () => {
    if (!rows.length) return;

    const headers = [
      'Year',
      'Relative Electricity Price',
      'Relative Petrol/Diesel Price',
      'Panel Output (%)',
      'Annual Savings on Tariff',
      'Annual Savings on Petrol/Diesel',
      'Total Annual Power Savings',
      'Cumulative Savings Realised',
      'Extra Investment',
      'Cumulative Cost',
      'Return on Investment (%)',
      'Cumulative Savings less Cost',
    ];

    const csvRows = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.yr,
          r.rep,
          r.rpp,
          r.po,
          r.ast,
          r.asp,
          r.tas,
          r.csr,
          r.ei,
          r.cc,
          r.roi,
          r.cs_less_cc,
        ]
          .map((v) => `"${v}"`)
          .join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solar-financial-model.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!rows.length) return;

    const sheetData = [
      [
        'Year',
        'Relative Electricity Price',
        'Relative Petrol/Diesel Price',
        'Panel Output (%)',
        'Annual Savings on Tariff',
        'Annual Savings on Petrol/Diesel',
        'Total Annual Power Savings',
        'Cumulative Savings Realised',
        'Extra Investment',
        'Cumulative Cost',
        'Return on Investment (%)',
        'Cumulative Savings less Cost',
      ],
      ...rows.map((r) => [
        r.yr,
        r.rep,
        r.rpp,
        r.po,
        r.ast,
        r.asp,
        r.tas,
        r.csr,
        r.ei,
        r.cc,
        r.roi,
        r.cs_less_cc,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Financial Model');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solar-financial-model.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!rows.length || !calculation) return;

    try {
      setDownloadingPdf(true);
      const res = await fetch('/api/financial-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows,
          calculation,
          monthlySpend: Number(monthlySpend) || 0,
          weeklyPetrol: Number(weeklyPetrol) || 0,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`PDF generation failed: ${txt}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'solar-financial-report.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF report. Check console for details.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ---- Metrics & charts ----

  const year25Data = rows.find((row) => row.yr === 25) || ({} as FinancialRow);
  const totalPowerSavings =
    year25Data.csr != null && year25Data.csr > 0
      ? Math.round(year25Data.csr / 1_000_000) + 'M'
      : '0';
  const totalSystemCostMillions =
    year25Data.cc != null && year25Data.cc > 0
      ? Math.round(year25Data.cc / 1_000_000) + 'M'
      : '0';
  const roiPct = year25Data.roi != null ? Math.round(year25Data.roi) + '%' : '0%';

  const breakEvenYear =
    rows.find((row) => row.cs_less_cc >= 0)?.yr ?? (rows.length ? rows[rows.length - 1].yr : 25);
  const breakEvenPercent = Math.min(Math.max(breakEvenYear / 25, 0), 1);

  const chartData = {
    labels: rows.map((row) => row.yr),
    datasets: [
      {
        label: 'Cumulative Savings Realised (₦)',
        data: rows.map((row) => row.csr),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: false,
        tension: 0.2,
      },
      {
        label: 'Cumulative Cost (₦)',
        data: rows.map((row) => row.cc),
        borderColor: 'rgba(248, 113, 113, 1)',
        backgroundColor: 'rgba(248, 113, 113, 0.2)',
        fill: false,
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e5e7eb',
        },
      },
      title: {
        display: true,
        text: 'Cumulative Savings vs. Cumulative Cost Over Time',
        color: '#e5e7eb',
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) =>
            `₦${Number(ctx.parsed.y || 0).toLocaleString('en-NG')}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af' },
        title: {
          display: true,
          text: 'Year',
          color: '#9ca3af',
        },
      },
      y: {
        ticks: {
          color: '#9ca3af',
          callback: (value: any) => '₦' + Number(value).toLocaleString('en-NG'),
        },
        title: {
          display: true,
          text: 'Amount (₦)',
          color: '#9ca3af',
        },
      },
    },
  };

  return (
    <section className="space-y-6">
      {/* Input panel */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 md:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm md:text-base font-semibold text-slate-50">
              Solar Financial Model
            </h3>
            <p className="text-xs md:text-sm text-slate-400">
              Estimate long-term returns and payback period based on your current electricity
              and petrol spend.
            </p>
          </div>
          {rows.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={handleExportCSV}
                className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-slate-200 hover:border-emerald-500/60 hover:text-emerald-300 transition"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-slate-200 hover:border-sky-500/60 hover:text-sky-300 transition"
              >
                Export Excel
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-slate-200 hover:border-rose-500/60 hover:text-rose-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {downloadingPdf ? 'Generating PDF…' : 'Download PDF Report'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Monthly Electricity Spend (₦)
            </label>
            <input
              type="number"
              value={monthlySpend}
              onChange={(e) => setMonthlySpend(e.target.value)}
              placeholder="e.g. 100000"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Weekly Petrol/Diesel Spend (₦)
            </label>
            <input
              type="number"
              value={weeklyPetrol}
              onChange={(e) => setWeeklyPetrol(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
            />
          </div>
          <button
            onClick={handleCalculate}
            disabled={loading || !calculation}
            className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 shadow shadow-sky-500/30 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Calculating…' : 'Calculate Financial Model'}
          </button>
        </div>

        {totalSavings !== null && (
          <p className="mt-3 text-xs md:text-sm text-emerald-300">
            Total potential power savings in year 1:{' '}
            <span className="font-semibold">
              ₦{totalSavings.toLocaleString('en-NG')}
            </span>
          </p>
        )}

        {error && (
          <p className="mt-3 text-xs md:text-sm text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* Results */}
      {rows.length > 0 && !loading && !error && (
        <>
          {/* Cards + gauge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/40 px-4 py-3">
              <p className="text-xs text-emerald-200 mb-1">
                Total Power Savings (25 yrs)
              </p>
              <p className="text-xl font-semibold text-emerald-300">
                ₦{totalPowerSavings}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/40 px-4 py-3">
              <p className="text-xs text-rose-200 mb-1">
                Total System Cost
              </p>
              <p className="text-xl font-semibold text-rose-300">
                ₦{totalSystemCostMillions}
              </p>
            </div>
            <div className="rounded-2xl bg-sky-500/10 border border-sky-500/40 px-4 py-3">
              <p className="text-xs text-sky-200 mb-1">
                ROI (Year 25)
              </p>
              <p className="text-xl font-semibold text-sky-300">
                {roiPct}
              </p>
            </div>
            {/* Simple custom gauge */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 flex items-center justify-center">
              <div className="w-full text-center">
                <p className="text-xs text-slate-400 mb-1">
                  Years to Break Even
                </p>
                <div className="mx-auto w-32 h-16 relative">
                  <svg
                    viewBox="0 0 100 50"
                    className="w-full h-full"
                  >
                    {/* Background arc */}
                    <path
                      d="M 5 50 A 45 45 0 0 1 95 50"
                      fill="none"
                      stroke="#1f2937"
                      strokeWidth={8}
                      strokeLinecap="round"
                    />
                    {/* Active arc */}
                    <path
                      d="M 5 50 A 45 45 0 0 1 95 50"
                      fill="none"
                      stroke="url(#gaugeGradient)"
                      strokeWidth={8}
                      strokeLinecap="round"
                      strokeDasharray="141.3"
                      strokeDashoffset={141.3 * (1 - breakEvenPercent)}
                    />
                    <defs>
                      <linearGradient
                        id="gaugeGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <p className="mt-1 text-sm font-semibold text-slate-100">
                    {breakEvenYear} years
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Line chart */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 md:p-5 shadow-xl">
            <div className="h-64 md:h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 md:p-5 shadow-xl">
            <h4 className="text-sm md:text-base font-semibold text-slate-50 mb-3">
              Detailed Financial Projection (25 years)
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px] md:text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-800/80">
                    {[
                      'Year',
                      'Rel. Elec. Price',
                      'Rel. Petrol Price',
                      'Panel Output (%)',
                      'Sav. Tariff',
                      'Sav. Petrol',
                      'Total Annual Sav.',
                      'Cum. Sav. Realised',
                      'Extra Invest.',
                      'Cum. Cost',
                      'ROI (%)',
                      'Cum. Sav. - Cost',
                    ].map((header, idx) => (
                      <th
                        key={idx}
                        className={`px-3 py-2 text-left font-semibold text-slate-200 border-b border-slate-700 ${
                          idx === 0 ? 'rounded-tl-xl' : ''
                        } ${idx === 11 ? 'rounded-tr-xl' : ''}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.yr}
                      className="odd:bg-slate-900/40 even:bg-slate-900/20"
                    >
                      <td className="px-3 py-1.5 text-slate-100 border-b border-slate-800">
                        {row.yr}
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        {row.rep.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        {row.rpp.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        {row.po.toFixed(1)}
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        ₦{row.ast.toLocaleString('en-NG')}
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        ₦{row.asp.toLocaleString('en-NG')}
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        ₦{row.tas.toLocaleString('en-NG')}
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        ₦{row.csr.toLocaleString('en-NG')}
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        ₦{row.ei.toLocaleString('en-NG')}
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        ₦{row.cc.toLocaleString('en-NG')}
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        {row.roi.toFixed(2)}%
                      </td>
                      <td className="px-3 py-1.5 text-slate-300 border-b border-slate-800">
                        ₦{row.cs_less_cc.toLocaleString('en-NG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default FinancialModelTable;