function doGet(e) {
  try {
    // وارد کردن ID شیت شما
    var ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");
    var logSheet = ss.getSheetByName("LOGS");
    var geoSheet = ss.getSheetByName("GeoData");

    if (!logSheet || !geoSheet) {
      throw new Error("❌ One of the sheets was not found.");
    }

    // Apply formatting to sheets (executed only once)
    formatSheets(logSheet, geoSheet);

    // دریافت پارامترهای ورودی از URL
    var ip = e.parameter.ip || "Unknown";
    var userAgent = e.parameter.ua || "Unknown";
    var timestamp = new Date();
    var date = timestamp.toISOString().split("T")[0]; // تاریخ: YYYY-MM-DD
    var time = timestamp.toTimeString().split(" ")[0]; // زمان: HH:MM:SS

    // ثبت داده‌ها در شیت LOGS
    logSheet.appendRow([date, time, ip, userAgent]);
    SpreadsheetApp.flush(); // Ensure changes are committed

    Logger.log("📌 IP logged: " + ip);

    // پاسخ موفقیت‌آمیز
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "✅ IP successfully logged",
      data: { ip, userAgent }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // در صورت بروز خطا
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// فرمت‌دهی به شیت‌ها (فونت، تراز، ویرگول کردن هدرها)
function formatSheets(logSheet, geoSheet) {
  var headersLogs = ["Date", "Time", "IP", "User-Agent"];
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
