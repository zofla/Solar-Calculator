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
  const subCategoryMap = {};
  const appliancesBySubCategory = {};

  rows.slice(1).forEach(row => {
    const subCategory = row[0] || '';
    if (subCategory && row[1]) {
      subCategoryMap[subCategory] = row[1]; // Description
    }
    if (subCategory && row[2]) {
      if (!appliancesBySubCategory[subCategory]) {
        appliancesBySubCategory[subCategory] = [];
      }
      appliancesBySubCategory[subCategory].push({
        name: row[2] || '',
        power: parseFloat(row[3]) || 0,
        hours: parseFloat(row[4]) || 0,
      });
    }
  });

  const subCategories = Object.keys(appliancesBySubCategory).map(sc => ({
    name: sc,
    description: subCategoryMap[sc] || '',
    appliances: appliancesBySubCategory[sc],
  }));

  return { subCategories };
}

async function fetchAppliances(spreadsheetId) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Appliances!A1:C',
  });

  const rows = res.data.values || [];
  const appliances = rows.slice(1).map(row => ({
    name: row[0] || '',
    power: parseFloat(row[1]) || 0,
    hours: parseFloat(row[2]) || 0,
  }));

  return { appliances };
}

module.exports = { fetchLoadProfiles, fetchAppliances };