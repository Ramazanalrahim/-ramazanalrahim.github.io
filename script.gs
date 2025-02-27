function doGet(e) {
  try {
    e = e || {};
    e.parameter = e.parameter || {};

    var ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");
    var logSheet = ss.getSheetByName("LOGS");
    var geoSheet = ss.getSheetByName("GeoData");

    if (!logSheet) throw new Error("❌ Sheet 'LOGS' not found!");
    if (!geoSheet) throw new Error("❌ Sheet 'GeoData' not found!");

    var ip = e.parameter.ip || getIPFromService();
    var userAgent = e.parameter.ua || "N/A";

    if (ip === "N/A") throw new Error("⛔ IP parameter missing!");

    // ثبت لاگ
    var timestamp = new Date();
    logSheet.appendRow([timestamp.toISOString().split('T')[0], timestamp.toTimeString().split(' ')[0], ip, userAgent]);
    SpreadsheetApp.flush();

    // دریافت اطلاعات جغرافیایی از 5 API مختلف
    var geoData = getGeoData(ip);

    // اگر اطلاعات جغرافیایی موجود باشد، ذخیره کنید
    if (geoData.status === "success") {
      geoSheet.appendRow([
        geoData.api1.country, geoData.api2.country, geoData.api3.country, geoData.api4.country, geoData.api5.country,
        geoData.api1.region, geoData.api2.region, geoData.api3.region, geoData.api4.region, geoData.api5.region,
        geoData.api1.city, geoData.api2.city, geoData.api3.city, geoData.api4.city, geoData.api5.city,
        geoData.api1.isp, geoData.api2.isp, geoData.api3.isp, geoData.api4.isp, geoData.api5.isp,
        geoData.api1.lat, geoData.api2.lat, geoData.api3.lat, geoData.api4.lat, geoData.api5.lat,
        geoData.api1.lon, geoData.api2.lon, geoData.api3.lon, geoData.api4.lon, geoData.api5.lon,
        `=HYPERLINK("https://maps.google.com?q=${geoData.api1.lat},${geoData.api1.lon}", "View Map")`,
        `=HYPERLINK("https://maps.google.com?q=${geoData.api2.lat},${geoData.api2.lon}", "View Map")`,
        `=HYPERLINK("https://maps.google.com?q=${geoData.api3.lat},${geoData.api3.lon}", "View Map")`
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
    `https://api.ipapi.com/${ip}?access_key=b6092de35990df8c36db1f56b93ec5f5`, // IPAPI
    `https://geoip-db.com/json/${ip}?apiKey=c879f74248msh2c9ca9f0953c684p145cbajsnb940bc0feda`, // GeoIP DB
    `https://ipinfo.io/${ip}/json`, // IPINFO
    `https://api.ipstack.com/${ip}?access_key=3708af0384260309ed91fdff341deaae`, // IPSTACK
    `https://api.ipify.org?format=json` // IPify (برای گرفتن IP)
  ];

  try {
    const responses = services.map(url => UrlFetchApp.fetch(url, { muteHttpExceptions: true }));
    const results = responses.map(response => JSON.parse(response.getContentText()));

    return {
      status: "success",
      api1: {
        country: results[0].country_name || "N/A",
        region: results[0].region || "N/A",
        city: results[0].city || "N/A",
        isp: results[0].isp || "N/A",
        lat: results[0].latitude || 0,
        lon: results[0].longitude || 0
      },
      api2: {
        country: results[1].country_name || "N/A",
        region: results[1].state || "N/A",
        city: results[1].city || "N/A",
        isp: results[1].org || "N/A",
        lat: results[1].latitude || 0,
        lon: results[1].longitude || 0
      },
      api3: {
        country: results[2].country || "N/A",
        region: results[2].region || "N/A",
        city: results[2].city || "N/A",
        isp: results[2].org || "N/A",
        lat: results[2].loc.split(',')[0] || 0,
        lon: results[2].loc.split(',')[1] || 0
      },
      api4: {
        country: results[3].country_name || "N/A",
        region: results[3].region_name || "N/A",
        city: results[3].city || "N/A",
        isp: "N/A",
        lat: results[3].latitude || 0,
        lon: results[3].longitude || 0
      },
      api5: {
        country: results[4].country || "N/A",
        region: "N/A",
        city: "N/A",
        isp: "N/A",
        lat: "N/A",
        lon: "N/A"
      }
    };
  } catch (error) {
    Logger.log("Geolocation Error: " + error.message);
    return { status: "fail", message: error.message };
  }
}
