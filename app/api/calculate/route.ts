import { NextRequest, NextResponse } from "next/server";
import type { Appliance, CalculationResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const appliances = (body.appliances || []) as Appliance[];
    const batteryType = (body.batteryType || "Lithium") as "Lithium" | "Lead-Acid";

    const totalPower = appliances.reduce(
      (sum, app) => sum + (app.power || 0) * (app.quantity || 0),
      0
    );
    const totalEnergy = appliances.reduce(
      (sum, app) =>
        sum + (app.power || 0) * (app.hours || 0) * (app.quantity || 0),
      0
    );

    const inverterEfficiency = 0.9;
    const energyAdjusted = totalEnergy / inverterEfficiency;

    let battery: CalculationResult["battery"];

    if (batteryType === "Lead-Acid") {
      const dod = 0.6;
      const nominalVoltage = totalEnergy > 8000 ? 48 : 24;
      const energyAdjustedDod = energyAdjusted / dod;
      const batteryAh = energyAdjustedDod / nominalVoltage;
      const batteriesInSeries = nominalVoltage / 12;
      const batteryRows = Math.ceil(batteryAh / 220);
      const totalBatteries = batteriesInSeries * batteryRows;
      const batteryCost = 350000 * totalBatteries;

      battery = {
        total: totalBatteries,
        cost: batteryCost,
        type: "Lead-Acid",
        nominalVoltage,
      };
    } else {
      const dod = 0.8;
      const energyAdjustedDod = energyAdjusted / dod;
      const capacities = [5.12, 7.2, 10.49, 12.5, 14.33, 16.07, 20, 25].map(
        (c) => c * 1000
      );
      let capacityRequired =
        capacities.find((c) => c >= energyAdjustedDod) ||
        capacities[capacities.length - 1];
      const prices: Record<number, number> = {
        5120: 1113000,
        7200: 1539071,
        10490: 2213000,
        12500: 2394109,
        14330: 2559000,
        16070: 2923000,
        20000: 3300000,
        25000: 3700000,
      };
      const totalBatteries = Math.ceil(energyAdjustedDod / capacityRequired);
      const batteryCost =
        (prices[capacityRequired] || 0) * totalBatteries;

      battery = {
        total: totalBatteries,
        cost: batteryCost,
        type: "Lithium",
        capacity: capacityRequired / 1000,
      };
    }

    const performanceRatio = 0.65;
    const peakSunshineHours = 5;
    const energyAdjustedPerformance = energyAdjusted / performanceRatio;
    const wattageToCharge = energyAdjustedPerformance / peakSunshineHours;
    const totalWattage = wattageToCharge + totalPower;
    const panelRating = totalWattage > 10000 ? 850 : 550;
    const panelPrices: Record<number, number> = {
      850: 190000,
      550: 115000,
    };
    const totalPanels = Math.ceil(totalWattage / panelRating);
    const panelCost = (panelPrices[panelRating] || 0) * totalPanels;

    const panels: CalculationResult["panels"] = {
      total: totalPanels,
      cost: panelCost,
      rating: panelRating,
    };

    const safetyFactor = 0.8;
    const loadAdjusted = totalPower / safetyFactor;
    const inverterCapacities = [
      1, 1.5, 2.5, 3, 3.3, 5, 6, 7.5, 8, 10, 12, 15, 20,
    ].map((c) => c * 1000);
    let inverterRating =
      inverterCapacities.find((c) => c >= loadAdjusted) ||
      inverterCapacities[inverterCapacities.length - 1];

    const inverterPrices: Record<number, number> = {
      1000: 180000,
      1500: 310000,
      2500: 359333,
      3000: 384000,
      3300: 436000,
      5000: 534000,
      6000: 589000,
      7500: 736000,
      8000: 785000,
      10000: 1014000,
      12000: 1243000,
      15000: 1450000,
      20000: 2000000,
    };
    const totalInverters = Math.ceil(loadAdjusted / inverterRating);
    const inverterCost =
      (inverterPrices[inverterRating] || 0) * totalInverters;

    const inverters: CalculationResult["inverters"] = {
      total: totalInverters,
      cost: inverterCost,
      rating: inverterRating / 1000,
    };

    const totalSystemCost = battery.cost + panels.cost + inverters.cost;

    const result: CalculationResult = {
      totalPower,
      totalEnergy,
      battery,
      panels,
      inverters,
      totalSystemCost,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/calculate:", error);
    return NextResponse.json(
      { error: "Calculation failed" },
      { status: 500 }
    );
  }
}
