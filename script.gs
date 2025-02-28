function doGet(e) {
  try {
    e = e || {};
    e.parameter = e.parameter || {};

    var ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");
    var logSheet = ss.getSheetByName("LOGS");
    var geoSheet = ss.getSheetByName("GeoData");

    if (!logSheet) throw new Error("❌ Sheet 'LOGS' not found!");
    if (!geoSheet) throw new Error("❌ Sheet 'GeoData' not found!");

    var ip = e.parameter.ip || getIPFromService(); // استفاده از سرویس برای دریافت IP
    var userAgent = e.parameter.ua || "N/A";

    if (ip === "N/A") throw new Error("⛔ IP parameter missing!");

    // ثبت لاگ
    var timestamp = new Date();
    logSheet.appendRow([timestamp.toISOString().split('T')[0], timestamp.toTimeString().split(' ')[0], ip, userAgent]);
    SpreadsheetApp.flush();

    // دریافت اطلاعات جغرافیایی از IP
    var geoData = getGeoData(ip);

    // اگر اطلاعات جغرافیایی موجود باشد، ذخیره کنید
    if (geoData.status === "success") {
      geoSheet.appendRow([
        geoData.country,
        geoData.region,
        geoData.city,
        geoData.isp,
        geoData.lat,
        geoData.lon,
        `=HYPERLINK("https://maps.google.com?q=${geoData.lat},${geoData.lon}", "View Map")`,
        new Date()
      ]);
      SpreadsheetApp.flush();
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "✅ Data logged successfully",
      ip: ip,
      geo: geoData
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error: " + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getGeoData(ip) {
  const services = [
    `http://ip-api.com/json/${ip}?fields=66846719`, // استفاده از IP-API
    `https://api.ipify.org?format=json`  // سرویس رایگان IPIFY
  ];

  try {
    const responses = services.map(url => {
      try {
        return UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      } catch (error) {
        Logger.log(`Error fetching data from ${url}: ${error.message}`);
        return null;
      }
    }).filter(response => response !== null);

    const results = responses.map(response => {
      try {
        return JSON.parse(response.getContentText());
      } catch (error) {
        Logger.log(`Error parsing JSON from response: ${error.message}`);
        return null;
      }
    }).filter(result => result !== null);

    const geoData = {
      country: results[0]?.country || "N/A",
      region: results[0]?.regionName || "N/A",
      city: results[0]?.city || "N/A",
      isp: results[0]?.isp || "N/A",
      lat: results[0]?.lat || 0,
      lon: results[0]?.lon || 0
    };

    return {
      status: "success",
      geo: geoData
    };

  } catch (error) {
    Logger.log("Geolocation Error: " + error.message);
    return { status: "fail", message: error.message };
  }
}

function getIPFromService() {
  try {
    var ipifyResponse = UrlFetchApp.fetch('https://api.ipify.org?format=json');
    var ipData = JSON.parse(ipifyResponse.getContentText());
    return ipData.ip;
  } catch (error) {
    Logger.log('Error fetching IP: ' + error.message);
    return "N/A";
  }
}

function updateLocationData() {
  // Open the spreadsheet and get the "LOGS" sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("LOGS");
  
  // Get the range of IPs in the "LOGS" sheet (assuming IPs are in column D, starting from row 2)
  var ipRange = logSheet.getRange("D2:D" + logSheet.getLastRow());
  var ipValues = ipRange.getValues();
  
  // Loop through each IP to fetch data
  for (var i = 0; i < ipValues.length; i++) {
    var ip = ipValues[i][0];
    
    if (ip) {
      // Fetch data from the IP-API
      var geoData = getGeoData(ip);
      
      if (geoData) {
        // Update the respective columns in the "LOGS" sheet (assuming columns E, F, G, H, I, J for Country, Region, City, ISP, Latitude, Longitude)
        logSheet.getRange(i + 2, 5).setValue(geoData.country);    // Country (Column E)
        logSheet.getRange(i + 2, 6).setValue(geoData.region);     // Region (Column F)
        logSheet.getRange(i + 2, 7).setValue(geoData.city);       // City (Column G)
        logSheet.getRange(i + 2, 8).setValue(geoData.isp);        // ISP (Column H)
        logSheet.getRange(i + 2, 9).setValue(geoData.lat);        // Latitude (Column I)
        logSheet.getRange(i + 2, 10).setValue(geoData.lon);       // Longitude (Column J)
        
        // Create a clickable link for the location (Column K)
        var locationUrl = "https://maps.google.com?q=" + geoData.lat + "," + geoData.lon;
        logSheet.getRange(i + 2, 11).setValue('=HYPERLINK("' + locationUrl + '", "View Location")');  // Location (Column K)
      } else {
        Logger.log("Geo data not found for IP: " + ip);
        logSheet.getRange(i + 2, 5, 1, 6).setValue("Data not found");  // Update with error message if data not found
      }
    }
  }
}
