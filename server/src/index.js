const express = require('express');
const cors = require('cors');
const { fetchLoadProfiles } = require('./sheets');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/load-profiles', async (req, res) => {
  const { category } = req.query;
  const spreadsheetId = '1aXlwDBKyThgIeZF1U21CjpL0-mxzSXd58LH_mYCKCPI';
  const range = `${category}!A2:E100`;

  try {
    const { appliances, subCategories } = await fetchLoadProfiles(spreadsheetId, range);
    res.json({ appliances, subCategories });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch load profiles' });
  }
});

app.post('/api/calculate', (req, res) => {
  const { appliances, batteryType } = req.body;

  const totalPower = appliances.reduce((sum, app) => sum + (app.power || 0), 0);
  const totalEnergy = appliances.reduce((sum, app) => sum + (app.power || 0) * (app.hours || 0), 0);

  let battery = {};
  const inverterEfficiency = 0.9;
  const energyAdjusted = totalEnergy / inverterEfficiency;

  if (batteryType === 'Lead-Acid') {
    const dod = 0.6;
    const nominalVoltage = totalEnergy > 8000 ? 48 : 24;
    const energyAdjustedDod = energyAdjusted / dod;
    const batteryAh = energyAdjustedDod / nominalVoltage;
    const batteriesInSeries = nominalVoltage / 12;
    const batteryRows = Math.ceil(batteryAh / 220);
    const totalBatteries = batteriesInSeries * batteryRows;
    const batteryCost = 420000 * totalBatteries;

    battery = { total: totalBatteries, cost: batteryCost, type: 'Lead-Acid', nominalVoltage };
  } else {
    const dod = 0.8;
    const energyAdjustedDod = energyAdjusted / dod;
    const capacities = [5.12, 7.2, 10, 12.5, 15, 17.5, 20, 25].map(c => c * 1000);
    let capacityRequired = capacities.find(c => c >= energyAdjustedDod) || capacities[capacities.length - 1];
    const prices = {
      5120: 1438000, 7200: 2137000, 10000: 3420000, 12500: 3994000,
      15000: 4080000, 17500: 5335000, 20000: 5682000, 25000: 5682000
    };
    const totalBatteries = Math.ceil(energyAdjustedDod / capacityRequired);
    const batteryCost = prices[capacityRequired] * totalBatteries;

    battery = { total: totalBatteries, cost: batteryCost, type: 'Lithium', capacity: capacityRequired / 1000 };
  }

  const performanceRatio = 0.65;
  const peakSunshineHours = 5;
  const energyAdjustedPerformance = energyAdjusted / performanceRatio;
  const wattageToCharge = energyAdjustedPerformance / peakSunshineHours;
  const totalWattage = wattageToCharge + totalPower;
  const panelRating = totalWattage > 10000 ? 850 : 550;
  const panelPrices = { 850: 190000, 550: 115000 };
  const totalPanels = Math.ceil(totalWattage / panelRating);
  const panelCost = panelPrices[panelRating] * totalPanels;

  const panels = { total: totalPanels, cost: panelCost, rating: panelRating };

  const safetyFactor = 0.8;
  const loadAdjusted = totalPower / safetyFactor;
  const inverterCapacities = [1, 2.5, 3, 3.5, 5, 6, 7.5, 8, 10, 15, 20].map(c => c * 1000);
  let inverterRating = inverterCapacities.find(c => c >= loadAdjusted) || inverterCapacities[inverterCapacities.length - 1];
  const inverterPrices = {
    1000: 180000, 2500: 384000, 3000: 420000, 3500: 474000, 5000: 683000,
    6000: 750000, 7500: 783000, 8000: 900000, 10000: 1356000, 15000: 1450000, 20000: 3150000
  };
  const totalInverters = Math.ceil(loadAdjusted / inverterRating);
  const inverterCost = inverterPrices[inverterRating] * totalInverters;

  const inverters = { total: totalInverters, cost: inverterCost, rating: inverterRating / 1000 };

  const totalSystemCost = battery.cost + panels.cost + inverters.cost;

  res.json({
    totalPower,
    totalEnergy,
    battery,
    panels,
    inverters,
    totalSystemCost
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));