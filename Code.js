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
  numErrors: 'results!C1',
  resultHeaders: 'results!B3:K3'
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
  var urlChecks = checkUrls(urlsToCheck, options);
  outputResults(urlChecks, options);
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
  var urlChecks = [];
  var checkedUrls = [];

  for (var i = 0; i < urls.length; i++) {
    if (!urls[i]) {
      return;
    }

    var urlsToCheck = expandUrlModifiers(urls[i]);

    for (var j = 0; j < urlsToCheck.length; j++) {
      var expandedUrl = urlsToCheck[j];
      if (checkedUrls[expandedUrl]) {
        continue;
      }

      var entityDetails = {
        entityType: 'type',
        campaign: 'campaign',
        adGroup: 'ad group',
        ad: 'ad',
        keyword: 'keyword',
        sitelink: 'sitelink'
      };

      var responseCode = requestUrl(expandedUrl, options, entityDetails);

      urlChecks.push({
        customerId: 'customer id',
        timestamp: new Date(),
        url: expandedUrl,
        responseCode: (options.exceptionUrls.indexOf(expandedUrl) !== -1) ? 'EXCEPTION' : responseCode,
        entityType: entityDetails.entityType,
        campaign: entityDetails.campaign,
        adGroup: entityDetails.adGroup,
        ad: entityDetails.ad,
        keyword: entityDetails.keyword,
        sitelink: entityDetails.sitelink
      });

      checkedUrls[expandedUrl] = true;
    }
  }

  return urlChecks;
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

function expandUrlModifiers(url) {
  var ifRegex = /({(if\w+):([^}]+)})/gi;
  var modifiers = {};
  var matches;

  while (matches = ifRegex.exec(url)) {
    modifiers[matches[2].toLowerCase()] = {
      substitute: matches[0],
      replacement: matches[3]
    };
  }
  if (Object.keys(modifiers).length) {
    if (modifiers.ifmobile || modifiers.ifnotmobile) {
      var mobileCombinations =
        pairedUrlModifierReplace(modifiers, 'ifmobile', 'ifnotmobile', url);
    } else {
      var mobileCombinations = [url];
    }

    var combinations = {};
    mobileCombinations.forEach(function(url) {
      if (modifiers.ifsearch || modifiers.ifcontent) {
        pairedUrlModifierReplace(modifiers, 'ifsearch', 'ifcontent', url)
          .forEach(function(modifiedUrl) {
            combinations[modifiedUrl] = true;
          });
      } else {
        combinations[url] = true;
      }
    });
    var modifiedUrls = Object.keys(combinations);
  } else {
    var modifiedUrls = [url];
  }

  return modifiedUrls.map(function(url) {
    return url.replace(/{[0-9a-zA-Z\_\+\:]+}/g, '');
  });
}

function pairedUrlModifierReplace(modifiers, modifier1, modifier2, url) {
  return [
    urlModifierReplace(modifiers, modifier1, modifier2, url),
    urlModifierReplace(modifiers, modifier2, modifier1, url)
  ];
}

function urlModifierReplace(mods, mod1, mod2, url) {
  var modUrl = mods[mod1] ?
    url.replace(mods[mod1].substitute, mods[mod1].replacement) :
    url;
  return mods[mod2] ? modUrl.replace(mods[mod2].substitute, '') : modUrl;
}

function outputResults(urlChecks, options) {
  var spreadsheet = SpreadsheetApp.getActive();

  var numErrors = countErrors(urlChecks, options);
  Logger.log('Found ' + numErrors + ' this execution.');

  saveUrlsToSpreadsheet(spreadsheet, urlChecks, options);
}

function saveUrlsToSpreadsheet(spreadsheet, urlChecks, options) {
  var outputValues = [];
  for (var i = 0; i < urlChecks.length; i++) {
    var urlCheck = urlChecks[i];

    if (options.saveAllUrls ||
      options.validCodes.indexOf(urlCheck.responseCode) === -1) {
      outputValues.push([
        urlCheck.customerId,
        new Date(urlCheck.timestamp),
        urlCheck.url,
        urlCheck.responseCode,
        urlCheck.entityType,
        urlCheck.campaign,
        urlCheck.adGroup,
        urlCheck.ad,
        urlCheck.keyword,
        urlCheck.sitelink
      ]);
    }
  }

  if (outputValues.length > 0) {
    var headers = spreadsheet.getRangeByName(options.resultHeaders);
    var lastRow = headers.getSheet().getDataRange().getLastRow();
    var outputRange = headers.offset(lastRow - headers.getRow() + 1,
      0, outputValues.length);
    outputRange.setValues(outputValues);
  }
}

function countErrors(urlChecks, options) {
  var numErrors = 0;

  for (var i = 0; i < urlChecks.length; i++) {
    if (options.validCodes.indexOf(urlChecks[i].responseCode) === -1) {
      numErrors++;
    }
  }

  return numErrors;
}