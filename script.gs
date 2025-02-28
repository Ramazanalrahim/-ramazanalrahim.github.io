function doPost(e) {
  // اطمینان از ارسال داده‌ها
  e = e || {};
  e.parameter = e.parameter || {};

  const ip = e.parameter.ip || getIPAddress(); // دریافت IP از پارامتر یا از سرویس

  if (!isValidIP(ip)) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "Invalid IP" })
    );
  }

  // گرفتن داده‌های جغرافیایی با استفاده از API‌ها
  const geoData = getGeoData(ip);

  if (geoData.status === "fail") {
    logAccess(ip, geoData); // ثبت خطا در شیت
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "Failed to get geolocation" })
    );
  }

  // پردازش اطلاعات IP برای شناسایی کلاس و ISP
  const ipInfo = processIP(ip);

  // ثبت موفقیت‌آمیز اطلاعات
  logAccess(ip, geoData, ipInfo);

  return ContentService.createTextOutput(
    JSON.stringify({
      status: geoData.status,
      data: geoData
    })
  );
}

// اعتبارسنجی صحت IP
function isValidIP(ip) {
  return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
}

// دریافت IP از سرویس
function getIPAddress() {
  try {
    const response = UrlFetchApp.fetch("https://api.ipify.org?format=json");
    const data = JSON.parse(response.getContentText());
    return data.ip;
  } catch (error) {
    Logger.log("Error fetching IP:", error);
    return "N/A"; // در صورتی که نتواستیم IP را دریافت کنیم
  }
}

// دریافت داده‌های جغرافیایی از چندین سرویس
function getGeoData(ip) {
  const SERVICES = [
    {
      name: "ip-api",
      url: `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,lat,lon`,
      parser: (data) => ({
        status: data.status === "success",
        country: data.country,
        region: data.regionName,
        city: data.city,
        isp: data.isp,
        lat: data.lat,
        lon: data.lon
      })
    },
    {
      name: "ipinfo",
      url: `https://ipinfo.io/${ip}/json?token=867bef2dba6c40`, // استفاده از توکن شما
      parser: (data) => ({
        status: !!data.country,
        country: data.country,
        region: data.region,
        city: data.city,
        isp: data.org,
        lat: data.loc?.split(",")[0],
        lon: data.loc?.split(",")[1]
      })
    }
  ];

  for (const service of SERVICES) {
    try {
      const response = UrlFetchApp.fetch(service.url, {
        muteHttpExceptions: true,
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 5000
      });

      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        const parsed = service.parser(data);
        if (parsed.status) {
          return {
            status: "success",
            ...parsed
          };
        }
      }
    } catch (e) {
      Logger.log(`[${service.name}] Error: ${e}`);
    }
  }

  return {
    status: "fail",
    message: "All services failed"
  };
}

// ذخیره‌سازی داده‌ها در شیت
function logAccess(ip, geoData, ipInfo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");

  // هدرهای جدید برای ثبت اطلاعات
  if (logSheet.getLastRow() === 0) {
    const headers = [
      "TIMESTAMP",
      "IP",
      "COUNTRY",
      "REGION",
      "CITY",
      "ISP",
      "LATITUDE",
      "LONGITUDE",
      "STATUS",
      "ERROR",
      "IP_CLASS",
      "ISP_DETAILS"
    ];
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
    geoData.message || "N/A",
    ipInfo.ipClass,
    ipInfo.isp
  ]);
}

// پردازش اطلاعات IP برای شناسایی کلاس و ISP
function processIP(ip) {
  // استخراج بخش‌های IP
  const ipParts = ip.split(".");

  // تشخیص IP خصوصی
  const isPrivate = (ipParts[0] === "10" || (ipParts[0] === "172" && parseInt(ipParts[1]) >= 16 && parseInt(ipParts[1]) <= 31) || (ipParts[0] === "192" && ipParts[1] === "168"));

  // شناسایی کلاس IP
  const ipClass = ipParts[0] === "10" ? "Class A" : (ipParts[0] === "172" ? "Class B" : (ipParts[0] === "192" && ipParts[1] === "168" ? "Class C" : "Public"));

  // محاسبه عددی IP
  const ipAsNumber = ipParts.reduce((acc, part, index) => acc + parseInt(part) * Math.pow(256, 3 - index), 0);

  // تشخیص ISP (مثال)
  let isp = "Unknown";
  if (ip.startsWith("5.")) isp = "مخابرات ایران";
  if (ip.startsWith("37.")) isp = "شبکه پژوهش";

  return {
    isPrivate,
    ipClass,
    ipAsNumber,
    isp
  };
}
