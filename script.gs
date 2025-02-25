function doGet(e) {
  try {
    // وارد کردن ID شیت شما
    var ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");
    var logSheet = ss.getSheetByName("LOGS");
    var geoSheet = ss.getSheetByName("GeoData");

    // بررسی دقیق وجود شیت‌ها
    if (!logSheet) throw new Error("❌ Sheet 'LOGS' not found!");
    if (!geoSheet) throw new Error("❌ Sheet 'GeoData' not found!");

    // دریافت و اعتبارسنجی پارامترها
    var ip = e.parameter.ip || "N/A";
    var userAgent = e.parameter.ua || "N/A";
    if (ip === "N/A") throw new Error("⛔ IP parameter missing!");

    // ثبت لاگ
    var timestamp = new Date();
    logSheet.appendRow([
      timestamp.toISOString().split('T')[0],
      timestamp.toTimeString().split(' ')[0],
      ip,
      userAgent
    ]);
    SpreadsheetApp.flush(); // Ensure changes are committed

    // دریافت اطلاعات جغرافیایی
    var geoData = getIPLocation(ip);
    if (geoData.status === "fail") throw new Error("🌍 Geolocation failed for IP: " + ip);

    // ثبت در GeoData
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
    SpreadsheetApp.flush(); // Ensure changes are committed

    // پاسخ موفق
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "✅ Data logged successfully",
      ip: ip,
      geo: geoData
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error: " + error.message); // لاگ خطا
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// تابع بهبودیافته دریافت موقعیت
function getIPLocation(ip) {
  const API_URL = `https://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,lat,lon`;
  try {
    const response = UrlFetchApp.fetch(API_URL, { muteHttpExceptions: true });
    const data = JSON.parse(response.getContentText());
    if (data.status !== "success") {
      throw new Error(data.message || "API Error");
    }
    return data;
  } catch (error) {
    Logger.log("Geolocation Error: " + error.message);
    return { status: "fail", message: error.message };
  }
}
