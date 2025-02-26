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

    // ثبت لاگ
    var timestamp = new Date();
    logSheet.appendRow([timestamp.toISOString().split('T')[0], timestamp.toTimeString().split(' ')[0], ip, userAgent]);
    SpreadsheetApp.flush();

    // بررسی تغییر IP و ارسال ایمیل
    checkAndSendEmail(ip);

    // دریافت اطلاعات جغرافیایی از چند API
    var geoData = getMultipleIPLocations(ip);

    // اگر اطلاعات جغرافیایی موجود باشد، ذخیره کنید
    if (geoData.status === "success") {
      geoSheet.appendRow([ip, geoData.api1.country, geoData.api2.country, geoData.api3.country, 
                          geoData.api1.region, geoData.api2.region, geoData.api3.region, 
                          geoData.api1.city, geoData.api2.city, geoData.api3.city, 
                          geoData.api1.isp, geoData.api2.isp, geoData.api3.isp, 
                          geoData.api1.lat, geoData.api2.lat, geoData.api3.lat, 
                          geoData.api1.lon, geoData.api2.lon, geoData.api3.lon, 
                          `=HYPERLINK("https://maps.google.com?q=${geoData.api1.lat},${geoData.api1.lon}", "View Map")`,
                          `=HYPERLINK("https://maps.google.com?q=${geoData.api2.lat},${geoData.api2.lon}", "View Map")`,
                          `=HYPERLINK("https://maps.google.com?q=${geoData.api3.lat},${geoData.api3.lon}", "View Map")`]);
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

function getMultipleIPLocations(ip) {
  const apiUrls = [
    `https://ipapi.co/${ip}/json/`, // API 1
    `https://geolocation-db.com/json/${ip}&position=true`, // API 2
    `https://ipinfo.io/${ip}/json` // API 3
  ];

  try {
    // فراخوانی سه API به صورت همزمان
    const responses = apiUrls.map(url => UrlFetchApp.fetch(url, { muteHttpExceptions: true }));
    const results = responses.map(response => JSON.parse(response.getContentText()));

    // بررسی نتایج از هر API
    const api1 = results[0];
    const api2 = results[1];
    const api3 = results[2];

    // بازگرداندن داده‌ها از سه API
    return {
      status: "success",
      api1: {
        country: api1.country_name || "N/A",
        region: api1.region || "N/A",
        city: api1.city || "N/A",
        isp: api1.org || "N/A",
        lat: api1.latitude || 0,
        lon: api1.longitude || 0
      },
      api2: {
        country: api2.country_name || "N/A",
        region: api2.state || "N/A",
        city: api2.city || "N/A",
        isp: api2.org || "N/A",
        lat: api2.latitude || 0,
        lon: api2.longitude || 0
      },
      api3: {
        country: api3.country || "N/A",
        region: api3.region || "N/A",
        city: api3.city || "N/A",
        isp: api3.org || "N/A",
        lat: api3.loc.split(',')[0] || 0,
        lon: api3.loc.split(',')[1] || 0
      }
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

function createTimeTrigger() {
  // تنظیم تریگر برای اجرای تابع هر دو ساعت یکبار
  ScriptApp.newTrigger('logAccess')
      .timeBased()
      .everyHours(2)  // اجرا در هر دو ساعت
      .create();
}

function deleteTriggers() {
  // حذف تمامی تریگرهای موجود
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}
