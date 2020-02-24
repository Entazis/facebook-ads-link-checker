var options = {
  checkAdUrls: true,
  checkKeywordUrls: true,
  checkSitelinkUrls: true,
  checkPausedAds: false,
  checkPausedKeywords: false,
  checkPausedSitelinks: false,
  validCodes: [200],
  emailEachRun: false,
  emailNonErrors: false,
  emailOnCompletion: true,
  saveAllUrls: false,
  exceptionUrls: [''],
  failureStrings: ['out of stock', 'sold out', 'elfogyott'],
  failureHtmls: ['<div class="uk-width-1-1 uk-text-center">Product out of stock</div>'],
  frequency: 0,
  useSimpleFailureStrings: true,
  useSimpleFailureHtmls: true,
  useExceptionUrls: true,
  useCustomValidation: false,
};

function isValidResponse(url, response, options, entityDetails) {
  // The HTTP status code, e.g. 200, 404
  // var responseCode = response.getResponseCode();

  // The HTTP response body, e.g. HTML for web pages:
  // var responseText = response.getContentText();

  // The failure strings from the configuration spreadsheet, as an array:
  // var failureStrings = options.failureStrings;

  // The type of the entity associated with the URL, e.g. Ad, Keyword, Sitelink.
  // var entityType = entityDetails.entityType;

  // The campaign name
  // var campaignName = entityDetails.campaign;

  // The ad group name, if applicable
  // var adGroupName = entityDetails.adGroup;

  // The ad text, if applicable
  // var adText = entityDetails.ad;

  // The keyword text, if applicable
  // var keywordText = entityDetails.keyword;

  // The sitelink link text, if applicable
  // var sitelinkText = entityDetails.sitelink;

  // Placeholder implementation treats all URLs as valid
  return true;
}

function main() {
  var urlsToCheck = getUrlsFromSheetAndColumn('landing pages with status code', 4);
  checkUrls(urlsToCheck, options);

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

function checkUrls(urls, options) {
  for (var i = 0; i < urls.length; i++) {
    var responseCode = requestUrl(urls[i], options, {});
  }
}

var CONFIG = {
  THROTTLE: 0,
  TIMEOUT_BUFFER: 120
};

var QUOTA_CONFIG = {
  INIT_SLEEP_TIME: 250,
  BACKOFF_FACTOR: 2,
  MAX_TRIES: 5
};

var EXCEPTIONS = {
  QPS: 'Reached UrlFetchApp QPS limit',
  LIMIT: 'Reached UrlFetchApp daily quota',
  TIMEOUT: 'Approached script execution time limit'
};

function requestUrl(url, options, entityDetails) {
  var responseCode;
  var sleepTime = QUOTA_CONFIG.INIT_SLEEP_TIME;
  var numTries = 0;

  while (numTries < QUOTA_CONFIG.MAX_TRIES && !responseCode) {
    try {
      var response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
      responseCode = response.getResponseCode();

      if (options.validCodes.indexOf(responseCode) !== -1) {
        if (options.useSimpleFailureHtmls &&
          bodyContainsFailureHtmls(response, options.failureHtmls)) {
          responseCode = 'Failure HTML detected';
        }
        else if (options.useSimpleFailureStrings &&
          bodyContainsFailureStrings(response, options.failureStrings)) {
          responseCode = 'Failure string detected';
        } else if (options.useCustomValidation && !isValidResponse(url,
          response, options, entityDetails)) {
          responseCode = "Custom validation failed";
        }
      }

      if (CONFIG.THROTTLE > 0) {
        Utilities.sleep(CONFIG.THROTTLE);
      }
    } catch(e) {
      if (e.message.indexOf('Service invoked too many times in a short time:')
        !== -1) {
        Utilities.sleep(sleepTime);
        sleepTime *= QUOTA_CONFIG.BACKOFF_FACTOR;
      } else if (e.message.indexOf('Service invoked too many times:') !== -1) {
        throw EXCEPTIONS.LIMIT;
      } else {
        return e.message;
      }
    }

    numTries++;
  }

  if (!responseCode) {
    throw EXCEPTIONS.QPS;
  } else {
    return responseCode;
  }
}

function bodyContainsFailureStrings(response, failureStrings) {
  var contentText = response.getContentText().toLowerCase() || '';
  return failureStrings.some(function(failureString) {
    return contentText.indexOf(failureString.toLowerCase()) !== -1;
  });
}

function bodyContainsFailureHtmls(response, failureHtmls) {
  return bodyContainsFailureStrings(response, failureHtmls);
}