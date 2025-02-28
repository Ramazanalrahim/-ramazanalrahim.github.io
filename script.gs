// دریافت IP از درخواست یا از طریق سرویس
function getIPAddress() {
  try {
    const response = UrlFetchApp.fetch('https://api.ipify.org?format=json');
    const data = JSON.parse(response.getContentText());
    return data.ip;
  } catch (e) {
    Logger.log('Error fetching IP: ' + e.message);
    return "N/A";
  }
}

// تابع بررسی صحت IP
function isValidIP(ip) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
}

// دریافت داده جغرافیایی با استفاده از چند سرویس
function getGeoData(ip) {
  const services = [
    'https://api.ipify.org?format=json', // IPIFY
    'http://ip-api.com/json/' + ip + '?fields=country,regionName,city,isp,lat,lon', // IP-API
    'https://ipinfo.io/' + ip + '/json' // IPINFO
  ];

  let geoData = { status: "fail", message: "Unable to fetch geolocation" };

  try {
    const responses = services.map(url => {
      try {
        const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true, headers: {'User-Agent': 'Mozilla/5.0'}});
        if (response.getResponseCode() === 200) {
          return JSON.parse(response.getContentText());
        }
      } catch (e) {
        Logger.log(`Error fetching from ${url}: ${e}`);
      }
    });

    // اولویت‌بندی نتایج
    for (const data of responses) {
      if (data && data.country) {
        geoData = {
          country: data.country || "N/A",
          region: data.regionName || "N/A",
          city: data.city || "N/A",
          isp: data.isp || "N/A",
          lat: data.lat || "N/A",
          lon: data.lon || "N/A",
          status: "success"
        };
        break; // خروج از حلقه بعد از دریافت اولین داده معتبر
      }
    }

  } catch (e) {
    Logger.log("Error fetching geo data: " + e.message);
  }

  return geoData;
}

// ذخیره‌سازی داده‌های ثبت‌شده در شیت
function logAccess(ip, geoData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("GeoDataLogs") || ss.insertSheet("GeoDataLogs");

  // هدرهای جدید برای ثبت اطلاعات
  if (logSheet.getLastRow() === 0) {
    const headers = ['TIMESTAMP', 'IP', 'COUNTRY', 'REGION', 'CITY', 'ISP', 'LATITUDE', 'LONGITUDE', 'STATUS', 'ERROR'];
    logSheet.appendRow(headers);
  }

  // ثبت داده‌ها در شیت
  logSheet.appendRow([
    new Date(),
    ip,
    geoData.country,
    geoData.region,
    geoData.city,
    geoData.isp,
    geoData.lat,
    geoData.lon,
    geoData.status,
    geoData.message || "N/A"
  ]);
}

// تابع اصلی برای دریافت و ثبت IPها
function doPost(e) {
  const ip = e.parameter.ip || getIPAddress();

  if (!isValidIP(ip)) {
    return ContentService.createTextOutput('Invalid IP');
  }

  const geoData = getGeoData(ip);

  if (geoData.status === "fail") {
    logAccess(ip, geoData); // ثبت خطا در شیت
    return ContentService.createTextOutput('Failed to get geolocation');
  }

  logAccess(ip, geoData); // ثبت موفقیت‌آمیز اطلاعات
  return ContentService.createTextOutput('Success');
}
