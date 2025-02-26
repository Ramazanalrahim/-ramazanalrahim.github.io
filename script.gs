function doGet(e) {
  try {
    // حل مشکل undefined بودن e
    e = e || {};
    e.parameter = e.parameter || {};

    // وارد کردن ID شیت
    var ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");
    var logSheet = ss.getSheetByName("LOGS");
    var geoSheet = ss.getSheetByName("GeoData");

    if (!logSheet) throw new Error("❌ Sheet 'LOGS' not found!");
    if (!geoSheet) throw new Error("❌ Sheet 'GeoData' not found!");

    // دریافت پارامترهای IP و User-Agent
    var ip = e.parameter.ip || "Unknown-IP";
    var userAgent = e.parameter.ua || "Unknown-UA";

    if (ip === "Unknown-IP") throw new Error("⛔ IP parameter missing!");

    // ثبت داده‌ها در شیت LOGS
    var timestamp = new Date();
    logSheet.appendRow([timestamp.toISOString().split('T')[0], timestamp.toTimeString().split(' ')[0], ip, userAgent]);
    SpreadsheetApp.flush();

    // دریافت اطلاعات جغرافیایی
    var geoData = getIPLocation(ip);
    if (geoData.status === "fail") throw new Error("🌍 Geolocation failed for IP: " + ip);

    // ثبت داده‌های جغرافیایی در GeoData
    geoSheet.appendRow([
      ip,
      geoData.country || "N/A",
      geoData.regionName || "N/A",
      geoData.city || "N/A",
      geoData.isp || "N/A",
      geoData.lat || 0,
      geoData.lon || 0,
      `=HYPERLINK("https://maps.google.com?q=${geoData.lat},${geoData.lon}", "View Map")`
    ]);
    SpreadsheetApp.flush();

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

// تابع دریافت موقعیت جغرافیایی با استفاده از API معتبر
function getIPLocation(ip) {
  const API_URL = `https://ipapi.co/${ip}/json/`; // استفاده از HTTPS و API معتبر
  try {
    const response = UrlFetchApp.fetch(API_URL, { muteHttpExceptions: true });
    const data = JSON.parse(response.getContentText());
    if (data.error) throw new Error(data.reason || "API Error");
    return {
      country: data.country_name || "N/A",
      regionName: data.region || "N/A",
      city: data.city || "N/A",
      isp: data.org || "N/A",
      lat: data.latitude || 0,
      lon: data.longitude || 0,
      status: "success"
    };
  } catch (error) {
    Logger.log("Geolocation Error: " + error.message);
    return { status: "fail", message: error.message };
  }
}
