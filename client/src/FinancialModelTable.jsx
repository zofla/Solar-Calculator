import { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Container, Typography, Box, TextField, Button, Card, CardContent, Grid } from '@mui/material';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import GaugeChart from 'react-gauge-chart';
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const FinancialModelTable = ({ calculation }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [monthlySpend, setMonthlySpend] = useState('');
  const [weeklyPetrol, setWeeklyPetrol] = useState('');
  const [totalSavings, setTotalSavings] = useState(null);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      // Validate user inputs
      const monthlySpendNum = Number(monthlySpend);
      const weeklyPetrolNum = Number(weeklyPetrol);
      if (isNaN(monthlySpendNum) || isNaN(weeklyPetrolNum) || monthlySpendNum < 0 || weeklyPetrolNum < 0) {
        throw new Error('Please enter valid positive numbers for monthly spend and weekly petrol consumption');
      }

      // Calculate savings
      const tariffSav = monthlySpendNum * 5;
      const petrolSav = weeklyPetrolNum * 52;
      const totalSavYr1 = tariffSav + petrolSav;
      setTotalSavings(totalSavYr1);

      // Use totalSystemCost from calculation prop
      const totalSystemCost = calculation?.totalSystemCost;
      if (!totalSystemCost) {
        throw new Error('Total system cost not available from calculator');
      }

      // Call FastAPI with calculated values
      const config = {
        method: 'post',
        url: 'http://localhost:8000/api/financial-model',
        data: {
          init_inv: totalSystemCost,
          tariff_sav: tariffSav,
          petrol_sav: petrolSav,
        },
      };

      console.log('FastAPI Request Config:', config);
      const response = await axios(config);
      console.log('Financial Model API Response:', JSON.stringify(response.data, null, 2));

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid financial model data: Response is not an array');
      }

      // Normalize data
      const normalizedRows = response.data.map((row, index) => {
        if (index < 2 || index === 25) {
          console.log(`Raw Row ${index}:`, JSON.stringify(row, null, 2));
        }
        const getField = (field, altFields = []) => {
          for (const key of [field, ...altFields]) {
            if (row[key] !== undefined) {
              const value = Number(row[key]);
              return isNaN(value) ? 0 : value;
            }
          }
          return 0;
        };
        return {
          yr: getField('yr', ['Yr', 'year', 'Year']),
          rep: getField('rep', ['REP', 'Rep']),
          rpp: getField('rpp', ['RPP', 'Rpp']),
          po: getField('po', ['PO', 'Po']),
          ast: getField('ast', ['AST', 'Ast']),
          asp: getField('asp', ['ASP', 'Asp']),
          tas: getField('tas', ['TAS', 'Tas']),
          csr: getField('csr', ['CSR', 'Csr']),
          ei: getField('ei', ['EI', 'Ei']),
          cc: getField('cc', ['CC', 'Cc']),
          roi: getField('roi', ['ROI', 'Roi']),
          cs_less_cc: getField('cs_less_cc', ['CS_less_CC', 'CS_Less_CC', 'csLessCc']),
        };
      });

      setRows(normalizedRows);
      console.log('Normalized Rows:', JSON.stringify(normalizedRows.slice(0, 2).concat(normalizedRows.filter(row => row.yr === 25)), null, 2));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error.response?.data || error.message);
      setError(`Failed to load data: ${error.response?.data?.detail || error.message}`);
      setLoading(false);
    }
  };

  // Extract metrics for cards
  const year25Data = rows.find(row => row.yr === 25) || {};
  const totalPowerSavings = Math.round((year25Data.csr || 0) / 1000000) + 'M';
  const totalSystemCost = Math.round((year25Data.cc || 0) / 1000000) + 'M';
  const roi = Math.round(year25Data.roi || 0) + '%';

  // Calculate break-even year
  const breakEvenYear = rows.find(row => row.cs_less_cc >= 0)?.yr ?? 25;

  // Chart data for line chart
  const chartData = {
    labels: rows.map(row => row.yr),
    datasets: [
      {
        label: 'Cumulative Savings Realized (₦)',
        data: rows.map(row => row.csr),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Cumulative Cost (₦)',
        data: rows.map(row => row.cc),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: false,
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Cumulative Savings vs. Cumulative Cost Over Time',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Year',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Amount (₦)',
        },
        beginAtZero: false,
        ticks: {
          callback: function (value) {
            return '₦' + value.toLocaleString('en-NG');
          },
        },
      },
    },
  };

  const columns = [
    { field: 'yr', headerName: 'Year', width: 80, type: 'number' },
    { field: 'rep', headerName: 'Relative Electricity Price', width: 150, type: 'number' },
    { field: 'rpp', headerName: 'Relative Petrol/Diesel Price', width: 150, type: 'number' },
    { field: 'po', headerName: 'Panel Output (%)', width: 130, type: 'number' },
    { field: 'ast', headerName: 'Annual Savings on Tariff', width: 180, type: 'number' },
    { field: 'asp', headerName: 'Annual Savings on Petrol/Diesel', width: 180, type: 'number' },
    { field: 'tas', headerName: 'Total Annual Power Savings', width: 200, type: 'number' },
    { field: 'csr', headerName: 'Cumulative Savings Realised', width: 200, type: 'number' },
    { field: 'ei', headerName: 'Extra Investment', width: 150, type: 'number' },
    { field: 'cc', headerName: 'Cumulative Cost', width: 150, type: 'number' },
    { field: 'roi', headerName: 'Return on Investment (%)', width: 150, type: 'number' },
    { field: 'cs_less_cc', headerName: 'Cumulative Savings less Cost', width: 250, type: 'number' },
  ];

  return (
    <Container maxWidth={false} sx={{ my: 4 }}>
      <Typography variant="h4" gutterBottom>Solar Financial Model</Typography>
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Monthly Electricity Spend (₦)"
          type="number"
          value={monthlySpend}
          onChange={(e) => setMonthlySpend(e.target.value)}
          sx={{ mr: 2, width: 200 }}
        />
        <TextField
          label="Weekly Petrol Consumption (₦)"
          type="number"
          value={weeklyPetrol}
          onChange={(e) => setWeeklyPetrol(e.target.value)}
          sx={{ mr: 2, width: 200 }}
        />
        <Button variant="contained" onClick={handleCalculate} disabled={loading || !calculation}>
          Calculate Financial Model
        </Button>
      </Box>
      {totalSavings !== null && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          Total Potential Power Savings (Year 1): ₦{totalSavings.toLocaleString('en-NG')}
        </Typography>
      )}
      {loading && <Typography>Loading financial model...</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      {!loading && !error && rows.length > 0 && (
        <>
          {/* Cards and Gauge in a Single Row */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={3}>
              <Card sx={{ backgroundColor: '#e0f7fa' }}>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    Total Power Savings
                  </Typography>
                  <Typography variant="h5">
                    ₦{totalPowerSavings}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card sx={{ backgroundColor: '#ffebee' }}>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    Total System Cost
                  </Typography>
                  <Typography variant="h5">
                    ₦{totalSystemCost}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Card sx={{ backgroundColor: '#e8f5e9' }}>
                <CardContent>
                  <Typography variant="h6" color="textSecondary">
                    ROI
                  </Typography>
                  <Typography variant="h5">
                    {roi}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center', width: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Years to Break Even
                </Typography>
                <GaugeChart
                  id="break-even-gauge"
                  nrOfLevels={25}
                  percent={breakEvenYear / 25}
                  arcPadding={0.02}
                  textColor="#000000"
                  needleColor="#4682b4"
                  colors={['#00FF00', '#FFFF00', '#FF0000']} // Green to red
                  formatTextValue={() => `${breakEvenYear} Years`}
                  style={{ width: '200px', margin: 'auto' }}
                />
              </Box>
            </Grid>
          </Grid>

          {/* Line Chart */}
          <Box sx={{ height: 400, width: '100%', mb: 4 }}>
            <Line data={chartData} options={chartOptions} />
          </Box>

          {/* DataGrid */}
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row.yr}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              pageSizeOptions={[10, 25]}
              disableRowSelectionOnClick
              autoHeight
              sx={{
                '& .MuiDataGrid-cell': { fontSize: '0.875rem' },
                '& .MuiDataGrid-columnHeader': { fontWeight: 'bold' },
              }}
            />
          </Box>
        </>
      )}
    </Container>
  );
};

export default FinancialModelTable;