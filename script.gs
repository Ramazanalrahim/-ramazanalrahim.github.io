function doGet(e) {
  try {
    // حل مشکل e undefined
    e = e || {};
    e.parameter = e.parameter || {};

    var ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");
    var logSheet = ss.getSheetByName("LOGS");
    var geoSheet = ss.getSheetByName("GeoData");

    if (!logSheet) throw new Error("❌ Sheet 'LOGS' not found!");
    if (!geoSheet) throw new Error("❌ Sheet 'GeoData' not found!");

    var ip = e.parameter.ip || "N/A";
    var userAgent = e.parameter.ua || "N/A";

    if (ip === "N/A") throw new Error("⛔ IP parameter missing!");

    var timestamp = new Date();
    logSheet.appendRow([timestamp.toISOString().split('T')[0], timestamp.toTimeString().split(' ')[0], ip, userAgent]);
    SpreadsheetApp.flush();

    // بررسی تغییر IP هر دو ساعت یکبار
    checkAndSendEmail(ip);

    // دریافت اطلاعات جغرافیایی
    var geoData = getIPLocation(ip);
    if (geoData.status === "fail") throw new Error("🌍 Geolocation failed for IP: " + ip);

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

function getIPLocation(ip) {
  const API_URL = `https://ipapi.co/${ip}/json/`; // استفاده از API جایگزین
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

function checkAndSendEmail(ip) {
  const previousIP = PropertiesService.getScriptProperties().getProperty('lastIP');

  // اگر IP جدید با IP قبلی متفاوت بود، ایمیل ارسال کنید
  if (ip !== previousIP) {
    sendEmailNotification(ip); // ارسال ایمیل
    // ذخیره IP جدید در Properties
    PropertiesService.getScriptProperties().setProperty('lastIP', ip);
  }
}

function sendEmailNotification(ip) {
  const emailAddress = "Sami.Aksoy1983@gmail.com"; // آدرس ایمیل شما
  const subject = "New IP Address Detected!";
  const body = `The IP address has changed to: ${ip}`;

  MailApp.sendEmail(emailAddress, subject, body);
}
