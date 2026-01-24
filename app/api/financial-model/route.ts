import { NextRequest, NextResponse } from "next/server";
import type { FinancialRow } from "@/lib/types";

type Assumptions = {
  Tariff_rise?: number;
  Petrol_rise?: number;
  Panel_deg?: number;
  Tariff_Sav?: number;
  Petrol_Sav?: number;
  Init_inv?: number;
  Extra_Inv_Yr1?: number;
  Incr_factor?: number;
};

function calculateFinancialModel(assumptions: Assumptions): FinancialRow[] {
  const Tariff_rise = assumptions.Tariff_rise ?? 0.01;
  const Petrol_rise = assumptions.Petrol_rise ?? 0.02;
  const Panel_deg = assumptions.Panel_deg ?? 0.004;
  const Tariff_Sav = assumptions.Tariff_Sav ?? 250000;
  const Petrol_Sav = assumptions.Petrol_Sav ?? 25000 * 52;
  const Init_inv = assumptions.Init_inv ?? 10000000;
  const Extra_Inv_Yr1 = assumptions.Extra_Inv_Yr1 ?? 200000;
  const Incr_factor = assumptions.Incr_factor ?? 1.1;

  const years = Array.from({ length: 26 }, (_, i) => i);

  const REP = Array(26).fill(0);
  const RPP = Array(26).fill(0);
  const PO = Array(26).fill(0);
  const AST = Array(26).fill(0);
  const ASP = Array(26).fill(0);
  const TAS = Array(26).fill(0);
  const CSR = Array(26).fill(0);
  const EI = Array(26).fill(0);
  const CC = Array(26).fill(0);
  const ROI = Array(26).fill(0);
  const CS_less_CC = Array(26).fill(0);

  // Year 0
  REP[0] = 1.0;
  RPP[0] = 1.0;
  PO[0] = 1.0;
  AST[0] = REP[0] * PO[0] * Tariff_Sav;
  ASP[0] = RPP[0] * PO[0] * Petrol_Sav;
  TAS[0] = AST[0] + ASP[0];
  CSR[0] = TAS[0];
  EI[0] = Extra_Inv_Yr1;
  CC[0] = Init_inv + EI[0];
  ROI[0] = CC[0] !== 0 ? 100 * (CSR[0] / CC[0] - 1) : 0;
  CS_less_CC[0] = CSR[0] - CC[0];

  for (let yr = 1; yr < 26; yr++) {
    REP[yr] = REP[yr - 1] * (1 + Tariff_rise);
    RPP[yr] = RPP[yr - 1] * (1 + Petrol_rise);
    PO[yr] = PO[yr - 1] - Panel_deg;
    AST[yr] = REP[yr] * PO[yr] * Tariff_Sav;
    ASP[yr] = RPP[yr] * PO[yr] * Petrol_Sav;
    TAS[yr] = AST[yr] + ASP[yr];
    CSR[yr] = CSR[yr - 1] + TAS[yr];
    EI[yr] = Extra_Inv_Yr1 * Math.pow(Incr_factor, yr);
    CC[yr] = CC[yr - 1] + EI[yr];
    ROI[yr] = CC[yr] !== 0 ? 100 * (CSR[yr] / CC[yr] - 1) : 0;
    CS_less_CC[yr] = CSR[yr] - CC[yr];
  }

  const result: FinancialRow[] = years.map((yr) => ({
    yr,
    rep: Number(REP[yr].toFixed(2)),
    rpp: Number(RPP[yr].toFixed(2)),
    po: Number((PO[yr] * 100).toFixed(1)),
    ast: Math.round(AST[yr]),
    asp: Math.round(ASP[yr]),
    tas: Math.round(TAS[yr]),
    csr: Math.round(CSR[yr]),
    ei: Math.round(EI[yr]),
    cc: Math.round(CC[yr]),
    roi: Number(ROI[yr].toFixed(2)),
    cs_less_cc: Math.round(CS_less_CC[yr]),
  }));

  return result;
}

export async function GET() {
  try {
    const assumptions: Assumptions = {
      Tariff_rise: 0.01,
      Petrol_rise: 0.02,
      Panel_deg: 0.004,
      Tariff_Sav: 250000,
      Petrol_Sav: 25000 * 52,
      Init_inv: 10000000,
      Extra_Inv_Yr1: 200000,
      Incr_factor: 1.1,
    };

    const result = calculateFinancialModel(assumptions);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/financial-model error:", error);
    return NextResponse.json(
      { error: "Failed to calculate financial model" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const assumptions: Assumptions = {
      Tariff_rise: 0.01,
      Petrol_rise: 0.02,
      Panel_deg: 0.004,
      Extra_Inv_Yr1: 200000,
      Incr_factor: 1.1,
    };

    if (body.init_inv != null) assumptions.Init_inv = Number(body.init_inv);
    if (body.tariff_sav != null) assumptions.Tariff_Sav = Number(body.tariff_sav);
    if (body.petrol_sav != null) assumptions.Petrol_Sav = Number(body.petrol_sav);

    const result = calculateFinancialModel(assumptions);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/financial-model error:", error);
    return NextResponse.json(
      { error: "Failed to calculate financial model" },
      { status: 500 }
    );
  }
}
