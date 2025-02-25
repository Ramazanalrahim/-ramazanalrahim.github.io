function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");
    var logSheet = ss.getSheetByName("LOGS");
    var geoSheet = ss.getSheetByName("GeoData");

    // بررسی موجودیت شیت‌ها
    if (!logSheet || !geoSheet) {
      throw new Error("❌ One of the sheets was not found.");
    }

    // دریافت پارامترهای ورودی از URL
    var ip = e.parameter.ip || "Unknown";
    var userAgent = e.parameter.ua || "Unknown";
    var timestamp = new Date();
    var date = timestamp.toISOString().split("T")[0]; // تاریخ: YYYY-MM-DD
    var time = timestamp.toTimeString().split(" ")[0]; // زمان: HH:MM:SS

    // ثبت داده‌ها در شیت LOGS
    logSheet.appendRow([date, time, ip, userAgent]);
    SpreadsheetApp.flush(); // اطمینان از ثبت تغییرات

    Logger.log("📌 IP logged: " + ip);

    // دریافت اطلاعات جغرافیایی IP
    var geoData = getIPLocation(ip);
    var mapLink = "https://www.google.com/maps/search/?api=1&query=" + geoData.lat + "," + geoData.lon;

    // ثبت اطلاعات جغرافیایی در شیت GeoData
    geoSheet.appendRow([ip, geoData.country, geoData.region, geoData.city, geoData.isp, geoData.lat, geoData.lon, mapLink]);
    SpreadsheetApp.flush(); // اطمینان از ثبت تغییرات

    // پاسخ موفقیت‌آمیز
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "✅ IP successfully logged",
      data: { ip, userAgent, geoData }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // در صورت بروز خطا
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// دریافت اطلاعات جغرافیایی از IP
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
