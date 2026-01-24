"use client";

import { useEffect, useState } from "react";
import type {
  Appliance,
  SubCategory,
  CalculationResult,
  FinancialRow,
} from "@/lib/types";
import FinancialModelTable from "@/components/FinancialModelTable";

export default function HomePage() {
  const [category, setCategory] = useState<"Residential" | "Commercial">(
    "Residential"
  );
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [applianceLibrary, setApplianceLibrary] = useState<Appliance[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] =
    useState<SubCategory | null>(null);
  const [batteryType, setBatteryType] = useState<"Lithium" | "Lead-Acid">(
    "Lithium"
  );
  const [calculation, setCalculation] = useState<CalculationResult | null>(
    null
  );
  const [financialRows, setFinancialRows] = useState<FinancialRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingAppliances, setLoadingAppliances] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingProfiles(true);
        const resProfiles = await fetch(
          `/api/load-profiles?category=${encodeURIComponent(category)}`
        );
        const dataProfiles = await resProfiles.json();
        const subs: SubCategory[] = dataProfiles.subCategories || [];
        setSubCategories(subs);
        setSelectedSubCategory(subs[0] || null);
        setError(null);
      } catch (err) {
        console.error("Error fetching profiles:", err);
        setError("Failed to load load profiles");
      } finally {
        setLoadingProfiles(false);
      }

      try {
        setLoadingAppliances(true);
        const resAppliances = await fetch("/api/appliances");
        const dataAppliances = await resAppliances.json();
        const list: Appliance[] = Array.isArray(dataAppliances)
          ? dataAppliances
          : dataAppliances.appliances || [];
        setApplianceLibrary(list);
      } catch (err) {
        console.error("Error fetching appliances:", err);
        setError("Failed to load appliances");
      } finally {
        setLoadingAppliances(false);
      }
    };

    fetchData();
  }, [category]);

  const handleApplianceChange = (
    index: number,
    field: keyof Appliance,
    value: string | number
  ) => {
    if (!selectedSubCategory) return;
    const clonedAppliances = [...selectedSubCategory.appliances];

    if (field === "name") {
      const selected = applianceLibrary.find((a) => a.name === value) || {
        name: value as string,
        power: 0,
        hours: 0,
        quantity: 1,
      };
      clonedAppliances[index] = {
        name: selected.name,
        power: selected.power,
        hours: selected.hours,
        quantity: selected.quantity || 1,
      };
    } else {
      clonedAppliances[index] = {
        ...clonedAppliances[index],
        [field]: typeof value === "string" ? Number(value) : value,
      };
    }

    setSelectedSubCategory({
      ...selectedSubCategory,
      appliances: clonedAppliances,
    });
  };

  const addAppliance = () => {
    if (!selectedSubCategory) return;
    setSelectedSubCategory({
      ...selectedSubCategory,
      appliances: [
        ...selectedSubCategory.appliances,
        { name: "", power: 0, hours: 0, quantity: 1 },
      ],
    });
  };

  const resetProfile = () => {
    if (!subCategories.length) return;
    setSelectedSubCategory(subCategories[0]);
    setCalculation(null);
    setFinancialRows([]);
  };

  const calculateSystem = async () => {
    if (!selectedSubCategory) return;
    try {
      const payload = {
        appliances: selectedSubCategory.appliances.filter((a) => a.name),
        batteryType,
      };
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: CalculationResult = await res.json();
      setCalculation(data);
      setError(null);

      // Also compute financial model using totalSystemCost as initial investment
      const resFin = await fetch("/api/financial-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          init_inv: data.totalSystemCost,
        }),
      });
      const finData: FinancialRow[] = await resFin.json();
      setFinancialRows(finData);
    } catch (err) {
      console.error("Calculation error:", err);
      setError("Calculation failed");
    }
  };

  const isLoading = loadingProfiles || loadingAppliances;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-2xl">
          <h1 className="text-2xl md:text-3xl font-semibold text-center bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            Calc Index · Solar Calculator
          </h1>
          <p className="text-sm text-slate-400 text-center mb-6">
            Something went wrong while loading your data.
          </p>
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <div className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/40">
              CI
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                Calc Index
              </div>
              <div className="text-[11px] text-slate-400">
                Solar Sizing & Financial Model
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <span className="hidden sm:inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] text-slate-300 border border-slate-700">
                Loading data…
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
              v1 · Web
            </span>
          </div>
        </nav>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.13),_transparent_60%),_radial-gradient(circle_at_bottom,_rgba(56,189,248,0.12),_transparent_55%)]" />
        <header className="relative max-w-6xl mx-auto px-4 pt-4 pb-6 md:pt-8 md:pb-7">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
                Design smarter solar systems in minutes.
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-300 max-w-xl">
                Choose a load profile, tune appliances, and instantly see the
                batteries, panels, and inverter capacity required—plus a simple
                financial model for diesel vs solar.
              </p>
            </div>
            <div className="text-xs text-slate-400 md:text-right">
              <p className="font-medium text-slate-200">
                Category:{" "}
                <span className="text-emerald-300">{category}</span>
              </p>
              <p>
                {selectedSubCategory?.name
                  ? `Profile: ${selectedSubCategory.name}`
                  : "No profile selected yet"}
              </p>
            </div>
          </div>
        </header>
      </div>

      {/* Main content */}
      <main className="relative z-10 flex-1">
        <div className="max-w-6xl mx-auto px-4 pb-16 space-y-6">
          {/* Controls + snapshot */}
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* Controls card */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl shadow-emerald-500/5 p-4 md:p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Category */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Installation Category
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as "Residential" | "Commercial")
                      }
                      className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 pr-9 text-sm text-slate-100 shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-transparent"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 text-xs">
                      ▼
                    </span>
                  </div>
                </div>

                {/* Battery type */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Battery Type
                  </label>
                  <div className="relative">
                    <select
                      value={batteryType}
                      onChange={(e) =>
                        setBatteryType(e.target.value as "Lithium" | "Lead-Acid")
                      }
                      className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 pr-9 text-sm text-slate-100 shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-transparent"
                    >
                      <option value="Lithium">Lithium</option>
                      <option value="Lead-Acid">Lead-Acid</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 text-xs">
                      ▼
                    </span>
                  </div>
                </div>
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 mt-2">
                  Load Profile / Sub-Category
                </label>
                <div className="relative">
                  <select
                    value={selectedSubCategory?.name || ""}
                    onChange={(e) =>
                      setSelectedSubCategory(
                        subCategories.find((sc) => sc.name === e.target.value) ||
                          null
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 pr-9 text-sm text-slate-100 shadow-inner shadow-black/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-transparent"
                  >
                    <option value="">Select Sub-Category</option>
                    {subCategories.map((sc) => (
                      <option key={sc.name} value={sc.name}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 text-xs">
                    ▼
                  </span>
                </div>
                {selectedSubCategory && (
                  <p className="mt-2 text-xs text-slate-400">
                    {selectedSubCategory.description ||
                      "Review and adjust the appliances below to match your actual load."}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={resetProfile}
                  disabled={!selectedSubCategory}
                  className="text-xs inline-flex items-center rounded-full border border-slate-700 px-3 py-1.5 text-slate-200 hover:bg-slate-800/70 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Reset profile
                </button>
                <span className="text-[11px] text-slate-500">
                  Tip: Use one browser tab per scenario (e.g. 3-bed flat vs
                  office) to compare results.
                </span>
              </div>
            </div>

            {/* Snapshot */}
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 md:p-5 shadow-xl shadow-cyan-500/5">
                <h3 className="text-sm font-medium text-slate-100 mb-2">
                  Snapshot
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2">
                    <p className="text-slate-400">Category</p>
                    <p className="mt-1 font-semibold text-slate-50">
                      {category}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2">
                    <p className="text-slate-400">Battery</p>
                    <p className="mt-1 font-semibold text-slate-50">
                      {batteryType}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2">
                    <p className="text-slate-400">Sub-Category</p>
                    <p className="mt-1 font-semibold text-slate-50 truncate">
                      {selectedSubCategory?.name || "Not selected"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2">
                    <p className="text-slate-400">Appliances</p>
                    <p className="mt-1 font-semibold text-slate-50">
                      {selectedSubCategory?.appliances?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              {calculation && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/40 p-4 text-xs md:text-sm">
                  <p className="text-emerald-300 font-medium mb-1">
                    Last calculation
                  </p>
                  <p className="text-emerald-100">
                    Total load:{" "}
                    <span className="font-semibold">
                      {calculation.totalPower} W
                    </span>{" "}
                    · Energy:{" "}
                    <span className="font-semibold">
                      {calculation.totalEnergy} Wh/day
                    </span>
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Editor + results */}
          <section className="grid gap-6 2xl:grid-cols-[minmax(0,2.3fr)_minmax(0,1.7fr)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
            {/* Appliance editor */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl shadow-emerald-500/5 p-4 md:p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-slate-50">
                    Load & Appliance Editor
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Choose appliances from the library or edit power, hours, and
                    quantities manually.
                  </p>
                </div>
                <button
                  onClick={addAppliance}
                  disabled={!selectedSubCategory}
                  className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  + Add appliance
                </button>
              </div>

              {!selectedSubCategory ? (
                <div className="text-sm text-slate-400 border border-dashed border-slate-700 rounded-xl p-4 text-center">
                  Select a sub-category above to view and edit its appliances.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs md:text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-800/80">
                        <th className="text-left px-3 py-2 rounded-tl-xl border-b border-slate-700">
                          Appliance
                        </th>
                        <th className="text-left px-3 py-2 border-b border-slate-700">
                          Power (W)
                        </th>
                        <th className="text-left px-3 py-2 border-b border-slate-700">
                          Hours/Day
                        </th>
                        <th className="text-left px-3 py-2 rounded-tr-xl border-b border-slate-700">
                          Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubCategory.appliances.map((appliance, index) => (
                        <tr
                          key={index}
                          className="odd:bg-slate-900/60 even:bg-slate-900/30"
                        >
                          <td className="px-3 py-2 align-middle">
                            <select
                              value={appliance.name}
                              onChange={(e) =>
                                handleApplianceChange(
                                  index,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs md:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                            >
                              <option value="">Select Appliance</option>
                              {Array.isArray(applianceLibrary) &&
                              applianceLibrary.length > 0 ? (
                                applianceLibrary.map((a) => (
                                  <option key={a.name} value={a.name}>
                                    {a.name}
                                  </option>
                                ))
                              ) : (
                                <option value="" disabled>
                                  No appliances available
                                </option>
                              )}
                            </select>
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <input
                              type="number"
                              value={appliance.power}
                              onChange={(e) =>
                                handleApplianceChange(
                                  index,
                                  "power",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs md:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                              min={0}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <input
                              type="number"
                              value={appliance.hours}
                              onChange={(e) =>
                                handleApplianceChange(
                                  index,
                                  "hours",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs md:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                              min={0}
                              step={0.1}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <input
                              type="number"
                              value={appliance.quantity}
                              onChange={(e) =>
                                handleApplianceChange(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-xs md:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/70"
                              min={1}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={calculateSystem}
                  disabled={!selectedSubCategory}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Calculate System
                </button>
              </div>
            </div>

            {/* Right column: results + financials */}
            <div className="space-y-4">
              {/* System sizing results */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 md:p-5 shadow-2xl shadow-cyan-500/5">
                <h3 className="text-sm md:text-base font-semibold text-slate-50 mb-3">
                  System Sizing Overview
                </h3>
                {!calculation ? (
                  <p className="text-xs md:text-sm text-slate-400">
                    Run a calculation to see recommended battery size, solar
                    panels, and inverter capacity.
                  </p>
                ) : (
                  <div className="space-y-3 text-xs md:text-sm">
                    <p>
                      <span className="text-slate-400">Total Power:</span>{" "}
                      <span className="font-semibold text-slate-50">
                        {calculation.totalPower} W
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Total Energy:</span>{" "}
                      <span className="font-semibold text-slate-50">
                        {calculation.totalEnergy} Wh/day
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Battery:</span>{" "}
                      <span className="font-semibold text-slate-50">
                        {calculation.battery.total} ×{" "}
                        {calculation.battery.type}
                      </span>{" "}
                      <span className="text-slate-400">
                        (₦
                        {calculation.battery.cost.toLocaleString("en-NG")})
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Panels:</span>{" "}
                      <span className="font-semibold text-slate-50">
                        {calculation.panels.total} ×{" "}
                        {calculation.panels.rating}W
                      </span>{" "}
                      <span className="text-slate-400">
                        (₦
                        {calculation.panels.cost.toLocaleString("en-NG")})
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Inverters:</span>{" "}
                      <span className="font-semibold text-slate-50">
                        {calculation.inverters.total} ×{" "}
                        {calculation.inverters.rating}kW
                      </span>{" "}
                      <span className="text-slate-400">
                        (₦
                        {calculation.inverters.cost.toLocaleString("en-NG")})
                      </span>
                    </p>
                    <p className="pt-1 border-t border-slate-800 mt-1">
                      <span className="text-slate-400">
                        Total System Cost:
                      </span>{" "}
                      <span className="font-semibold text-emerald-400">
                        ₦
                        {calculation.totalSystemCost.toLocaleString("en-NG")}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              
            </div>
          </section>

          <section className="grid gap-6 2xl:grid-cols-[minmax(0,2.3fr)_minmax(0,1.7fr)] lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
            {/* Financial model */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 md:p-5 shadow-xl">
              <h3 className="text-sm md:text-base font-semibold text-slate-50 mb-3">
                Financial Model (25 years)
              </h3>
              <FinancialModelTable calculation={calculation} />
            </div>
          </section>
          
        </div>

        {/* Mobile sticky summary */}
        {calculation && (
          <div className="fixed bottom-0 inset-x-0 md:hidden z-30">
            <div className="mx-3 mb-3 rounded-2xl bg-slate-900/95 border border-slate-800 px-4 py-3 shadow-2xl shadow-emerald-500/20 backdrop-blur">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <div className="text-[11px] text-slate-400">
                    Total system
                  </div>
                  <div className="font-semibold text-emerald-300">
                    ₦
                    {calculation.totalSystemCost.toLocaleString("en-NG")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Load</div>
                  <div className="font-semibold text-slate-100">
                    {calculation.totalPower} W ·{" "}
                    {(calculation.totalEnergy / 1000).toFixed(1)} kWh/day
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
