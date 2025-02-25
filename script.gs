function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");
    var logSheet = ss.getSheetByName("LOGS");
    var geoSheet = ss.getSheetByName("GeoData");

    if (!logSheet || !geoSheet) {
      throw new Error("❌ One of the sheets was not found.");
    }

    // Apply formatting to sheets (executed only once)
    formatSheets(logSheet, geoSheet);

    // Get input parameters
    var ip = e.parameter.ip || "Unknown";
    var userAgent = e.parameter.ua || "Unknown";
    var timestamp = new Date();
    var date = timestamp.toISOString().split("T")[0]; // YYYY-MM-DD
    var time = timestamp.toTimeString().split(" ")[0]; // HH:MM:SS

    // Extract device and browser details
    var deviceInfo = detectDevice(userAgent);
    
    // Log IP in LOGS sheet
    logSheet.appendRow([date, time, ip, deviceInfo.device, deviceInfo.browser, deviceInfo.os]);

    Logger.log("📌 IP logged: " + ip);

    // Retrieve and store GeoData
    var geoData = getIPLocation(ip);
    var mapLink = "https://www.google.com/maps/search/?api=1&query=" + geoData.lat + "," + geoData.lon;
    geoSheet.appendRow([ip, geoData.country, geoData.region, geoData.city, geoData.isp, geoData.lat, geoData.lon, mapLink]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "✅ IP successfully logged",
      data: { ip, userAgent, deviceInfo, geoData }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Format sheets (Font, Alignment, Bold Headers)
function formatSheets(logSheet, geoSheet) {
  var headersLogs = ["Date", "Time", "IP", "Device", "Browser", "Operating System"];
  var headersGeo = ["IP", "Country", "Region", "City", "ISP", "Latitude", "Longitude", "Google Maps Link"];

  if (logSheet.getLastRow() === 0) {
    logSheet.appendRow(headersLogs);
  }

  if (geoSheet.getLastRow() === 0) {
    geoSheet.appendRow(headersGeo);
  }

  var logHeaderRange = logSheet.getRange(1, 1, 1, headersLogs.length);
  var geoHeaderRange = geoSheet.getRange(1, 1, 1, headersGeo.length);
  var logDataRange = logSheet.getRange(2, 1, logSheet.getLastRow(), headersLogs.length);
  var geoDataRange = geoSheet.getRange(2, 1, geoSheet.getLastRow(), headersGeo.length);

  logHeaderRange.setFontWeight("bold");
  geoHeaderRange.setFontWeight("bold");
  logHeaderRange.setFontSize(12);
  geoHeaderRange.setFontSize(12);
  logDataRange.setFontSize(11);
  geoDataRange.setFontSize(11);
  logSheet.getRange("A:Z").setFontFamily("Times New Roman");
  geoSheet.getRange("A:Z").setFontFamily("Times New Roman");

  logHeaderRange.setHorizontalAlignment("center");
  geoHeaderRange.setHorizontalAlignment("center");
  logDataRange.setHorizontalAlignment("center");
  geoDataRange.setHorizontalAlignment("center");

  Logger.log("✅ Sheet formatting applied.");
}

// Detect device and browser
function detectDevice(userAgent) {
  var device = "PC/Laptop";
  if (/Mobi|Android/i.test(userAgent)) {
    device = "Mobile";
  }

  var browser = "Unknown";
  if (userAgent.indexOf("Chrome") > -1) browser = "Chrome";
  else if (userAgent.indexOf("Firefox") > -1) browser = "Firefox";
  else if (userAgent.indexOf("Safari") > -1) browser = "Safari";
  else if (userAgent.indexOf("Edge") > -1) browser = "Edge";

  var os = "Unknown";
  if (userAgent.indexOf("Windows") > -1) os = "Windows";
  else if (userAgent.indexOf("Mac") > -1) os = "MacOS";
  else if (userAgent.indexOf("Linux") > -1) os = "Linux";
  else if (userAgent.indexOf("Android") > -1) os = "Android";
  else if (userAgent.indexOf("iOS") > -1) os = "iOS";

  return { device, browser, os };
}

// Retrieve GeoData from IP
function getIPLocation(ip) {
  try {
    var response = UrlFetchApp.fetch("http://ip-api.com/json/" + ip + "?fields=status,country,regionName,city,isp,lat,lon");
    var json = JSON.parse(response.getContentText());

    if (json.status === "fail") {
      Logger.log("❌ Failed to retrieve location data for: " + ip);
      return { country: "Error", region: "Error", city: "Error", isp: "Error", lat: "0", lon: "0" };
    }

    return {
      country: json.country || "Unknown",
      region: json.regionName || "Unknown",
      city: json.city || "Unknown",
      isp: json.isp || "Unknown",
      lat: json.lat || "0",
      lon: json.lon || "0"
    };

  } catch (error) {
    Logger.log("⚠️ API Error: " + error.toString());
    return { country: "Error", region: "Error", city: "Error", isp: "Error", lat: "0", lon: "0" };
  }
}
