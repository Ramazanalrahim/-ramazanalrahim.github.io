function doPost(e) {
  try {
    const ip = e.parameter.ip;
    if (!ip || !isValidIP(ip)) {
      throw new Error('Invalid IP');
    }

    const geoData = getGeoData(ip);
    saveToSheet(geoData);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      geo: geoData
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error:', error);
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// اعتبارسنجی IP
function isValidIP(ip) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
}

// دریافت اطلاعات جغرافیایی
function getGeoData(ip) {
  const url = `http://ip-api.com/json/${ip}?fields=country,regionName,city,isp,lat,lon`;
  const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
  const data = JSON.parse(response.getContentText());

  if (data.status === "fail") {
    throw new Error('Geo data not found for IP: ' + ip);
  }

  return {
    country: data.country,
    region: data.regionName,
    city: data.city,
    isp: data.isp,
    lat: data.lat,
    lon: data.lon
  };
}

// ذخیره داده‌ها به شیت
function saveToSheet(geoData) {
  const ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");
  const sheet = ss.getSheetByName("LocationLogs");

  const timestamp = new Date();
  sheet.appendRow([
    timestamp.toISOString().split('T')[0], 
    timestamp.toTimeString().split(' ')[0],
    geoData.country, 
    geoData.region,
    geoData.city,
    geoData.isp,
    geoData.lat,
    geoData.lon,
    `=HYPERLINK("https://maps.google.com?q=${geoData.lat},${geoData.lon}", "View Location")`
  ]);
}

// تابع شبیه‌سازی درخواست و دریافت IP از سرویس
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
