function doPost(e) {
  // Ensure data is sent
  e = e || {};
  e.parameter = e.parameter || {};

  const ip = e.parameter.ip || getIPAddress(); // Get IP from parameter or from service

  if (!isValidIP(ip)) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "Invalid IP" })
    );
  }

  // Get geolocation data using APIs
  const geoData = getGeoData(ip);

  if (geoData.status === "fail") {
    logAccess(ip, geoData); // Log error in the sheet
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "Failed to get geolocation" })
    );
  }

  // Process IP information to identify class and ISP
  const ipInfo = processIP(ip);

  // Log successful information
  logAccess(ip, geoData, ipInfo);

  return ContentService.createTextOutput(
    JSON.stringify({
      status: geoData.status,
      data: geoData
    })
  );
}

// Validate IP address
function isValidIP(ip) {
  return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
}

// Get IP address from service
function getIPAddress() {
  try {
    const response = UrlFetchApp.fetch("https://api.ipify.org?format=json");
    const data = JSON.parse(response.getContentText());
    return data.ip;
  } catch (error) {
    Logger.log("Error fetching IP:", error);
    return "N/A"; // If unable to get IP
  }
}

// Get geolocation data from multiple services
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
      url: `https://ipinfo.io/${ip}/json?token=867bef2dba6c40`, // Use your token
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

  let validResponses = [];
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
          validResponses.push(parsed);
        }
      }
    } catch (e) {
      Logger.log(`[${service.name}] Error: ${e}`);
    }
  }

  if (validResponses.length > 0) {
    // If we have multiple valid responses, return the most frequent result
    const aggregatedData = aggregateGeoData(validResponses);
    return {
      status: "success",
      ...aggregatedData
    };
  }

  return {
    status: "fail",
    message: "All services failed"
  };
}

// Aggregate geolocation data from multiple services
function aggregateGeoData(responses) {
  const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const country = responses[0].country;
  const region = responses[0].region;
  const city = responses[0].city;
  const isp = responses[0].isp;
  const lat = average(responses.map(r => parseFloat(r.lat)));
  const lon = average(responses.map(r => parseFloat(r.lon)));

  return {
    country,
    region,
    city,
    isp,
    lat,
    lon
  };
}

// Log data in the sheet
function logAccess(ip, geoData, ipInfo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");

  // New headers for logging information
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

  // Log data in the sheet
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

// Process IP information to identify class and ISP
function processIP(ip) {
  // Extract IP parts
  const ipParts = ip.split(".");

  // Identify private IP
  const isPrivate = (ipParts[0] === "10" || (ipParts[0] === "172" && parseInt(ipParts[1]) >= 16 && parseInt(ipParts[1]) <= 31) || (ipParts[0] === "192" && ipParts[1] === "168"));

  // Identify IP class
  const ipClass = ipParts[0] === "10" ? "Class A" : (ipParts[0] === "172" ? "Class B" : (ipParts[0] === "192" && ipParts[1] === "168" ? "Class C" : "Public"));

  // Convert IP to numeric value
  const ipAsNumber = ipParts.reduce((acc, part, index) => acc + parseInt(part) * Math.pow(256, 3 - index), 0);

  // Identify ISP (example)
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
