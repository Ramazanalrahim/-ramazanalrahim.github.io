function doGet(e) {
  try {
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

    // بررسی تغییر IP و ارسال ایمیل
    checkAndSendEmail(ip);

    // دریافت اطلاعات جغرافیایی از چند API
    var geoData = getGeoData(ip); // تغییر برای استفاده از API جدید

    // اگر اطلاعات جغرافیایی موجود باشد، ذخیره کنید
    if (geoData.status === "success") {
      geoSheet.appendRow([
        geoData.country, geoData.region, geoData.city,
        geoData.isp, geoData.lat, geoData.lon,
        `=HYPERLINK("https://maps.google.com?q=${geoData.lat},${geoData.lon}", "View Map")`
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
  const apiKey = 'c879f74248msh2c9ca9f0953c684p145cbajsnb940bc0fedae';  // کلید API شما
  const apiUrl = `https://ipapi3.p.rapidapi.com/api.ipapi.com/api?ip=${ip}&key=${apiKey}`;

  try {
    const response = UrlFetchApp.fetch(apiUrl, {
      method: 'get',
      headers: {
        'x-rapidapi-host': 'ipapi3.p.rapidapi.com',
        'x-rapidapi-key': apiKey
      }
    });
    
    const data = JSON.parse(response.getContentText());
    return {
      status: "success",
      country: data.country_name || 'N/A',
      region: data.region || 'N/A',
      city: data.city || 'N/A',
      isp: data.org || 'N/A',
      lat: data.latitude || 0,
      lon: data.longitude || 0
    };
  } catch (error) {
    Logger.log("Error fetching geo data: " + error.message);
    return { status: "fail", message: error.message };
  }
}

function checkAndSendEmail(ip) {
  const previousIP = PropertiesService.getScriptProperties().getProperty('lastIP');

  if (ip !== previousIP) {
    sendEmailNotification(ip);
    PropertiesService.getScriptProperties().setProperty('lastIP', ip);
  }
}

function sendEmailNotification(ip) {
  const emailAddress = "Sami.Aksoy1983@gmail.com"; 
  const subject = "New IP Address Detected!";
  const body = `The IP address has changed to: ${ip}`;

  MailApp.sendEmail(emailAddress, subject, body);
}
