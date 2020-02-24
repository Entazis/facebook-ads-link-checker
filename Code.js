function main() {
  var urlsToCheck = getUrlsFromSheetAndColumn('landing pages with status code', 4);

  return 0;
}

function getUrlsFromSheetAndColumn(sheetName, columnIndex) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  var values = sheet.getDataRange().getValues();
  var urls = [];

  for(var i=1; i < values.length; i++){
    urls.push(values[i][columnIndex]);
  }

  return urls.filter(function (url) {
    return url != '';
  });
}