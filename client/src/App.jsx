import { useState, useEffect } from 'react';
import axios from 'axios';
import FinancialModelTable from './FinancialModelTable';

function App() {
  const [category, setCategory] = useState('Residential');
  const [subCategories, setSubCategories] = useState([]);
  const [appliances, setAppliances] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [batteryType, setBatteryType] = useState('Lithium');
  const [calculation, setCalculation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch load profiles
    axios
      .get(`http://localhost:5000/api/load-profiles?category=${category}`)
      .then((response) => {
        setSubCategories(response.data.subCategories || []);
        setSelectedSubCategory(response.data.subCategories[0] || null);
        setError(null);
      })
      .catch((error) => {
        console.error('Error fetching profiles:', error);
        setError('Failed to load load profiles');
      });

    // Fetch appliances for dropdown
    axios
      .get('http://localhost:5000/api/appliances')
      .then((response) => {
        const data = Array.isArray(response.data) ? response.data : response.data.appliances || [];
        setAppliances(data);
        setError(null);
      })
      .catch((error) => {
        console.error('Error fetching appliances:', error);
        setError('Failed to load appliances');
      });
  }, [category]);

  const handleApplianceChange = (index, field, value) => {
    const updatedAppliances = [...selectedSubCategory.appliances];
    if (field === 'name') {
      const selectedAppliance = appliances.find((a) => a.name === value) || { power: 0, hours: 0, quantity: 1 };
      updatedAppliances[index] = {
        name: value,
        power: selectedAppliance.power,
        hours: selectedAppliance.hours,
        quantity: selectedAppliance.quantity || 1,
      };
    } else {
      updatedAppliances[index] = { ...updatedAppliances[index], [field]: value };
    }
    setSelectedSubCategory({ ...selectedSubCategory, appliances: updatedAppliances });
  };

  const addAppliance = () => {
    setSelectedSubCategory({
      ...selectedSubCategory,
      appliances: [...selectedSubCategory.appliances, { name: '', power: 0, hours: 0, quantity: 1 }],
    });
  };

  const calculateSystem = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/calculate', {
        appliances: selectedSubCategory.appliances.filter((a) => a.name),
        batteryType,
      });
      setCalculation(response.data);
      setError(null);
    } catch (error) {
      console.error('Calculation error:', error);
      setError('Calculation failed');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <h1 className="text-3xl font-bold text-center text-blue-900 mb-6">
          Alfred's Solar Calculator v1
        </h1>
        <div className="max-w-4xl mx-auto text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-center text-blue-900 mb-6">
        Calc Index Solar Calculator v1
      </h1>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Category and Battery Type Selection */}
        <div className="flex gap-4 mb-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 p-2 border rounded"
          >
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
          </select>
          <select
            value={batteryType}
            onChange={(e) => setBatteryType(e.target.value)}
            className="flex-1 p-2 border rounded"
          >
            <option value="Lithium">Lithium</option>
            <option value="Lead-Acid">Lead-Acid</option>
          </select>
        </div>

        {/* Sub-Category Selection */}
        <select
          value={selectedSubCategory?.name || ''}
          onChange={(e) =>
            setSelectedSubCategory(subCategories.find((sc) => sc.name === e.target.value) || null)
          }
          className="w-full p-2 mb-4 border rounded"
        >
          <option value="">Select Sub-Category</option>
          {subCategories.map((sc, index) => (
            <option key={index} value={sc.name}>
              {sc.name}
            </option>
          ))}
        </select>

        {/* Appliances Table */}
        {selectedSubCategory && (
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">{selectedSubCategory.name}</h3>
            <p className="text-gray-600 mb-4">{selectedSubCategory.description || 'Select appliances below'}</p>
            <table className="w-full border-collapse mb-4">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border p-2">Appliance</th>
                  <th className="border p-2">Power (W)</th>
                  <th className="border p-2">Hours/Day</th>
                  <th className="border p-2">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {selectedSubCategory.appliances.map((appliance, index) => (
                  <tr key={index}>
                    <td className="border p-2">
                      <select
                        value={appliance.name}
                        onChange={(e) => handleApplianceChange(index, 'name', e.target.value)}
                        className="w-full p-1 border rounded"
                      >
                        <option value="">Select Appliance</option>
                        {Array.isArray(appliances) && appliances.length > 0 ? (
                          appliances.map((a, i) => (
                            <option key={i} value={a.name}>
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
                    <td className="border p-2">
                      <input
                        type="number"
                        value={appliance.power}
                        onChange={(e) => handleApplianceChange(index, 'power', Number(e.target.value))}
                        className="w-full p-1 border rounded"
                        min="0"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        value={appliance.hours}
                        onChange={(e) => handleApplianceChange(index, 'hours', Number(e.target.value))}
                        className="w-full p-1 border rounded"
                        min="0"
                        step="0.1"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        value={appliance.quantity}
                        onChange={(e) => handleApplianceChange(index, 'quantity', Number(e.target.value))}
                        className="w-full p-1 border rounded"
                        min="1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2">
              <button
                onClick={addAppliance}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Appliance
              </button>
              <button
                onClick={calculateSystem}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Calculate System
              </button>
            </div>
          </div>
        )}

        {/* Calculation Results */}
        {calculation && (
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">Calculation Results</h3>
            <p>Total Power: {calculation.totalPower} W</p>
            <p>Total Energy: {calculation.totalEnergy} Wh/day</p>
            <p>
              Battery: {calculation.battery.total} x {calculation.battery.type} (Cost: ₦
              {calculation.battery.cost.toLocaleString('en-NG')})
            </p>
            <p>
              Panels: {calculation.panels.total} x {calculation.panels.rating}W (Cost: ₦
              {calculation.panels.cost.toLocaleString('en-NG')})
            </p>
            <p>
              Inverters: {calculation.inverters.total} x {calculation.inverters.rating}kW (Cost: ₦
              {calculation.inverters.cost.toLocaleString('en-NG')})
            </p>
            <p>Total System Cost: ₦{calculation.totalSystemCost.toLocaleString('en-NG')}</p>
          </div>
        )}

        {/* Financial Model Table */}
        <FinancialModelTable calculation={calculation} />
      </div>
    </div>
  );
}

export default App;