function main() {
  var urlsToCheck = readUrls();

  return 0;
}

function readUrls() {
  var columnIndex = 4;
  var sheet = SpreadsheetApp.getActive().getSheetByName('landing pages with status code');
  var values = sheet.getDataRange().getValues();
  var urls = [];

  for(var i=1; i < values.length; i++){
    urls.push(values[i][columnIndex]);
  }

  return urls.filter(function (url) {
    return url != '';
  });
}

/**
 * Validates the provided spreadsheet URL to make sure that it's set up
 * properly. Throws a descriptive error message if validation fails.
 *
 * @param {string} spreadsheetId The URL of the spreadsheet to open.
 * @return {Spreadsheet} The spreadsheet object itself, fetched from the URL.
 * @throws {Error} If the spreadsheet URL hasn't been set
 */
function validateAndGetSpreadsheet(spreadsheetId) {
  if (spreadsheetId === 'YOUR_SPREADSHEET_ID') {
    throw new Error('Please specify a valid Spreadsheet URL. You can find' +
      ' a link to a template in the associated guide for this script.');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}