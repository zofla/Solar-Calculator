import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Calculator = () => {
  const [category, setCategory] = useState('Residential');
  const [subCategory, setSubCategory] = useState('');
  const [subCategories, setSubCategories] = useState([]);
  const [appliances, setAppliances] = useState([]);
  const [allAppliances, setAllAppliances] = useState([]);
  const [batteryType, setBatteryType] = useState('Lead-Acid');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`http://localhost:5000/api/load-profiles?category=${category}`)
      .then(response => {
        const { appliances, subCategories } = response.data;
        setAllAppliances(appliances);
        setSubCategories(subCategories);
        setSubCategory(subCategories[0]?.name || '');
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching profiles:', error);
        setAllAppliances([]);
        setSubCategories([]);
        setAppliances([]);
        setSubCategory('');
        setLoading(false);
      });
  }, [category]);

  useEffect(() => {
    if (subCategory) {
      const filteredAppliances = allAppliances.filter(
        app => app.subCategory === subCategory
      );
      setAppliances(filteredAppliances);
    } else {
      setAppliances([]);
    }
  }, [subCategory, allAppliances]);

  const handleApplianceChange = (index, field, value) => {
    const updatedAppliances = [...appliances];
    updatedAppliances[index][field] = field === 'name' ? value : parseFloat(value) || 0;
    setAppliances(updatedAppliances);
  };

  const addAppliance = () => {
    setAppliances([...appliances, { name: '', power: 0, hours: 0, subCategory }]);
  };

  const removeAppliance = index => {
    setAppliances(appliances.filter((_, i) => i !== index));
  };

  const calculate = () => {
    setLoading(true);
    axios
      .post('http://localhost:5000/api/calculate', { appliances, batteryType })
      .then(response => {
        setResults(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error calculating:', error);
        setLoading(false);
      });
  };

  return (
    <div className="calculator">
      <div className="form-group">
        <label>
          Category:
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="Residential">Residential</option>
            <option value="Commercial">Commercial</option>
          </select>
        </label>
        <label>
          Sub-Category:
          <select
            value={subCategory}
            onChange={e => setSubCategory(e.target.value)}
            disabled={subCategories.length === 0}
          >
            {subCategories.length === 0 ? (
              <option value="">No Sub-Categories Available</option>
            ) : (
              subCategories.map(sc => (
                <option key={sc.name} value={sc.name} title={sc.description}>
                  {sc.name}
                </option>
              ))
            )}
          </select>
        </label>
        <label>
          Battery Type:
          <select value={batteryType} onChange={e => setBatteryType(e.target.value)}>
            <option value="Lead-Acid">Lead-Acid</option>
            <option value="Lithium">Lithium</option>
          </select>
        </label>
      </div>
      <h3>Appliances</h3>
      {loading && <p>Loading...</p>}
      {!loading && subCategory && (
        <table className="appliance-table">
          <thead>
            <tr>
              <th>Appliance</th>
              <th>Power (W)</th>
              <th>Hours/Day</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {appliances.map((appliance, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="text"
                    value={appliance.name}
                    onChange={e => handleApplianceChange(index, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={appliance.power}
                    onChange={e => handleApplianceChange(index, 'power', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={appliance.hours}
                    onChange={e => handleApplianceChange(index, 'hours', e.target.value)}
                  />
                </td>
                <td>
                  <button onClick={() => removeAppliance(index)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && subCategory && (
        <button onClick={addAppliance}>Add Appliance</button>
      )}
      <button onClick={calculate} disabled={loading || !subCategory}>
        {loading ? 'Calculating...' : 'Calculate'}
      </button>
      {results && (
        <div className="results">
          <h2>Results</h2>
          <p><strong>Total Power:</strong> {results.totalPower.toFixed(2)} W</p>
          <p><strong>Total Energy:</strong> {results.totalEnergy.toFixed(2)} Wh/day</p>
          <h3>Battery Sizing</h3>
          <p><strong>Type:</strong> {results.battery.type}</p>
          <p><strong>Total Batteries:</strong> {results.battery.total}</p>
          {results.battery.nominalVoltage && (
            <p><strong>Nominal Voltage:</strong> {results.battery.nominalVoltage} V</p>
          )}
          {results.battery.capacity && (
            <p><strong>Capacity per Battery:</strong> {results.battery.capacity} kWh</p>
          )}
          <p><strong>Cost:</strong> ${results.battery.cost.toLocaleString()}</p>
          <h3>Solar Panels</h3>
          <p><strong>Total Panels:</strong> {results.panels.total}</p>
          <p><strong>Panel Rating:</strong> {results.panels.rating} W</p>
          <p><strong>Cost:</strong> ${results.panels.cost.toLocaleString()}</p>
          <h3>Inverters</h3>
          <p><strong>Total Inverters:</strong> {results.inverters.total}</p>
          <p><strong>Inverter Rating:</strong> {results.inverters.rating} kW</p>
          <p><strong>Cost:</strong> ${results.inverters.cost.toLocaleString()}</p>
          <h3>Total System Cost</h3>
          <p><strong>${results.totalSystemCost.toLocaleString()}</strong></p>
        </div>
      )}
    </div>
  );
};

export default Calculator;