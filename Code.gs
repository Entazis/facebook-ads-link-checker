function getStatusCode(url){
  if (!url) return false;

  var options = {
    'muteHttpExceptions': true,
    'followRedirects': false
  };
  var url_trimmed = url.trim();
  var response = UrlFetchApp.fetch(url_trimmed, options);
  return response.getResponseCode();
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

function main() {
  var urlsToCheck = readUrls();

  return 0;
}