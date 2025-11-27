from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from typing import List, Dict, Optional
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

class FinancialModelInput(BaseModel):
    init_inv: Optional[float] = None
    tariff_sav: Optional[float] = None
    petrol_sav: Optional[float] = None

def calculate_financial_model(assumptions: Dict) -> List[Dict]:
    Tariff_rise = assumptions.get("Tariff_rise", 0.01)
    Petrol_rise = assumptions.get("Petrol_rise", 0.02)
    Panel_deg = assumptions.get("Panel_deg", 0.004)
    Tariff_Sav = assumptions.get("Tariff_Sav", 250000)
    Petrol_Sav = assumptions.get("Petrol_Sav", 25000 * 52)
    Init_inv = assumptions.get("Init_inv", 10000000)
    Extra_Inv_Yr1 = assumptions.get("Extra_Inv_Yr1", 200000)
    Incr_factor = assumptions.get("Incr_factor", 1.1)

    years = list(range(26))
    REP = [0.0] * 26
    RPP = [0.0] * 26
    PO = [0.0] * 26
    AST = [0.0] * 26
    ASP = [0.0] * 26
    TAS = [0.0] * 26
    CSR = [0.0] * 26
    EI = [0.0] * 26
    CC = [0.0] * 26
    ROI = [0.0] * 26
    CS_less_CC = [0.0] * 26

    REP[0] = 1.00
    RPP[0] = 1.00
    PO[0] = 1.00
    AST[0] = REP[0] * PO[0] * Tariff_Sav
    ASP[0] = RPP[0] * PO[0] * Petrol_Sav
    TAS[0] = AST[0] + ASP[0]
    CSR[0] = TAS[0]
    EI[0] = Extra_Inv_Yr1
    CC[0] = Init_inv + EI[0]
    ROI[0] = 100 * ((CSR[0] / CC[0]) - 1) if CC[0] != 0 else 0
    CS_less_CC[0] = CSR[0] - CC[0]

    for yr in range(1, 26):
        REP[yr] = REP[yr - 1] * (1 + Tariff_rise)
        RPP[yr] = RPP[yr - 1] * (1 + Petrol_rise)
        PO[yr] = PO[yr - 1] - Panel_deg
        AST[yr] = REP[yr] * PO[yr] * Tariff_Sav
        ASP[yr] = RPP[yr] * PO[yr] * Petrol_Sav
        TAS[yr] = AST[yr] + ASP[yr]
        CSR[yr] = CSR[yr - 1] + TAS[yr]
        EI[yr] = Extra_Inv_Yr1 * (Incr_factor ** yr)
        CC[yr] = CC[yr - 1] + EI[yr]
        ROI[yr] = 100 * ((CSR[yr] / CC[yr]) - 1) if CC[yr] != 0 else 0
        CS_less_CC[yr] = CSR[yr] - CC[yr]

    df = pd.DataFrame({
        "yr": years,
        "rep": REP,
        "rpp": RPP,
        "po": PO,
        "ast": AST,
        "asp": ASP,
        "tas": TAS,
        "csr": CSR,
        "ei": EI,
        "cc": CC,
        "roi": ROI,
        "cs_less_cc": CS_less_CC,
    })

    df["rep"] = df["rep"].round(2)
    df["rpp"] = df["rpp"].round(2)
    df["po"] = (df["po"] * 100).round(1)
    df["ast"] = df["ast"].round(0).astype(int)
    df["asp"] = df["asp"].round(0).astype(int)
    df["tas"] = df["tas"].round(0).astype(int)
    df["csr"] = df["csr"].round(0).astype(int)
    df["ei"] = df["ei"].round(0).astype(int)
    df["cc"] = df["cc"].round(0).astype(int)
    df["roi"] = df["roi"].round(2)
    df["cs_less_cc"] = df["cs_less_cc"].round(0).astype(int)

    result = df.to_dict("records")
    print("Financial Model Result:", result)
    return result

@app.get("/api/financial-model")
async def get_financial_model():
    assumptions = {
        "Tariff_rise": 0.01,
        "Petrol_rise": 0.02,
        "Panel_deg": 0.004,
        "Tariff_Sav": 250000,
        "Petrol_Sav": 25000 * 52,
        "Init_inv": 10000000,
        "Extra_Inv_Yr1": 200000,
        "Incr_factor": 1.1,
    }
    result = calculate_financial_model(assumptions)
    print("GET /api/financial-model Response:", result)
    return result

@app.post("/api/financial-model")
async def post_financial_model(input: FinancialModelInput):
    assumptions = {
        "Tariff_rise": 0.01,
        "Petrol_rise": 0.02,
        "Panel_deg": 0.004,
        "Extra_Inv_Yr1": 200000,
        "Incr_factor": 1.1,
    }
    if input.init_inv is not None:
        assumptions["Init_inv"] = input.init_inv
    if input.tariff_sav is not None:
        assumptions["Tariff_Sav"] = input.tariff_sav
    if input.petrol_sav is not None:
        assumptions["Petrol_Sav"] = input.petrol_sav
    result = calculate_financial_model(assumptions)
    print("POST /api/financial-model Response:", result)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    