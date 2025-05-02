const { google } = require('googleapis');

async function fetchLoadProfiles(spreadsheetId, range) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = res.data.values || [];
  const appliances = rows.slice(1).map(row => ({
    name: row[2] || '',
    power: parseFloat(row[3]) || 0,
    hours: parseFloat(row[4]) || 0,
    subCategory: row[0] || '',
  }));

  const subCategoryMap = {};
  rows.slice(1).forEach(row => {
    if (row[0] && row[1]) {
      subCategoryMap[row[0]] = row[1];
    }
  });

  const subCategories = [...new Set(appliances.map(app => app.subCategory))]
    .filter(sc => sc)
    .map(sc => ({
      name: sc,
      description: subCategoryMap[sc] || '',
    }));

  return { appliances, subCategories };
}

module.exports = { fetchLoadProfiles };