import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [category, setCategory] = useState('Residential');
  const [subCategories, setSubCategories] = useState([]);
  const [appliances, setAppliances] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [batteryType, setBatteryType] = useState('Lithium');
  const [calculation, setCalculation] = useState(null);

  useEffect(() => {
    // Fetch load profiles
    axios
      .get(`http://localhost:5000/api/load-profiles?category=${category}`)
      .then((response) => {
        setSubCategories(response.data.subCategories);
        setSelectedSubCategory(response.data.subCategories[0] || null);
      })
      .catch((error) => console.error('Error fetching profiles:', error));

    // Fetch appliances for dropdown
    axios
      .get('http://localhost:5000/api/appliances')
      .then((response) => setAppliances(response.data.appliances))
      .catch((error) => console.error('Error fetching appliances:', error));
  }, [category]);

  const handleApplianceChange = (index, newApplianceName) => {
    const selectedAppliance = appliances.find((a) => a.name === newApplianceName);
    const updatedAppliances = [...selectedSubCategory.appliances];
    updatedAppliances[index] = {
      name: newApplianceName,
      power: selectedAppliance ? selectedAppliance.power : 0,
      hours: selectedAppliance ? selectedAppliance.hours : 0,
    };
    setSelectedSubCategory({ ...selectedSubCategory, appliances: updatedAppliances });
  };

  const addAppliance = () => {
    setSelectedSubCategory({
      ...selectedSubCategory,
      appliances: [...selectedSubCategory.appliances, { name: '', power: 0, hours: 0 }],
    });
  };

  const calculateSystem = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/calculate', {
        appliances: selectedSubCategory.appliances.filter((a) => a.name), // Exclude empty rows
        batteryType,
      });
      setCalculation(response.data);
    } catch (error) {
      console.error('Calculation error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-center text-blue-900 mb-6">
        Alfred's Solar Calculator v1
      </h1>
      <div className="max-w-4xl mx-auto">
        {/* Category and Battery Type Selection */}
        <div className="flex gap-4 mb-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 p-2 border rounded"
          >
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
            {/* Add more categories if needed */}
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
            <p className="text-gray-600 mb-4">{selectedSubCategory.description}</p>
            <table className="w-full border-collapse mb-4">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border p-2">Appliance</th>
                  <th className="border p-2">Power (W)</th>
                  <th className="border p-2">Hours/Day</th>
                </tr>
              </thead>
              <tbody>
                {selectedSubCategory.appliances.map((appliance, index) => (
                  <tr key={index}>
                    <td className="border p-2">
                      <select
                        value={appliance.name}
                        onChange={(e) => handleApplianceChange(index, e.target.value)}
                        className="w-full p-1 border rounded"
                      >
                        <option value="">Select Appliance</option>
                        {appliances.map((a, i) => (
                          <option key={i} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border p-2">{appliance.power}</td>
                    <td className="border p-2">{appliance.hours}</td>
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
          <div className="mt-6 bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-2">Calculation Results</h3>
            <p>Total Power: {calculation.totalPower} W</p>
            <p>Total Energy: {calculation.totalEnergy} Wh/day</p>
            <p>
              Battery: {calculation.battery.total} x {calculation.battery.type} (Cost: ₦
              {calculation.battery.cost.toLocaleString()})
            </p>
            <p>
              Panels: {calculation.panels.total} x {calculation.panels.rating}W (Cost: ₦
              {calculation.panels.cost.toLocaleString()})
            </p>
            <p>
              Inverters: {calculation.inverters.total} x {calculation.inverters.rating}kW (Cost: ₦
              {calculation.inverters.cost.toLocaleString()})
            </p>
            <p>Total System Cost: ₦{calculation.totalSystemCost.toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;