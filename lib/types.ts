export type Appliance = {
  name: string;
  power: number;
  hours: number;
  quantity: number;
};

export type SubCategory = {
  name: string;
  description?: string;
  appliances: Appliance[];
};

export type LoadProfilesResponse = {
  subCategories: SubCategory[];
  appliances?: Appliance[];
};

export type AppliancesResponse = {
  appliances: Appliance[];
};

export type CalculationResult = {
  totalPower: number;
  totalEnergy: number;
  battery: {
    total: number;
    cost: number;
    type: string;
    nominalVoltage?: number;
    capacity?: number;
  };
  panels: {
    total: number;
    cost: number;
    rating: number;
  };
  inverters: {
    total: number;
    cost: number;
    rating: number;
  };
  totalSystemCost: number;
};

export type FinancialRow = {
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
