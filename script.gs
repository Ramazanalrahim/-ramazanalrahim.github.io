function doGet(e) {
  try {
    e = e || {};
    e.parameter = e.parameter || {};

    var ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");
    var logSheet = ss.getSheetByName("LOGS");
    var geoSheet = ss.getSheetByName("GeoData");

    if (!logSheet) throw new Error("❌ Sheet 'LOGS' not found!");
    if (!geoSheet) throw new Error("❌ Sheet 'GeoData' not found!");

    var ip = e.parameter.ip || getIPFromService();
    var userAgent = e.parameter.ua || "N/A";

    if (ip === "N/A") throw new Error("⛔ IP parameter missing!");

    // ثبت لاگ
    var timestamp = new Date();
    logSheet.appendRow([timestamp.toISOString().split('T')[0], timestamp.toTimeString().split(' ')[0], ip, userAgent]);
    SpreadsheetApp.flush();

    // دریافت اطلاعات جغرافیایی از سیستم‌های مختلف
    var geoData = getGeoData(ip);

    // اگر اطلاعات جغرافیایی موجود باشد، ذخیره کنید
    if (geoData.status === "success") {
      geoSheet.appendRow([
        geoData.api1.country, geoData.api2.country, geoData.api3.country, geoData.api4.country, geoData.api5.country,
        geoData.api1.region, geoData.api2.region, geoData.api3.region, geoData.api4.region, geoData.api5.region,
        geoData.api1.city, geoData.api2.city, geoData.api3.city, geoData.api4.city, geoData.api5.city,
        geoData.api1.isp, geoData.api2.isp, geoData.api3.isp, geoData.api4.isp, geoData.api5.isp,
        geoData.api1.lat, geoData.api2.lat, geoData.api3.lat, geoData.api4.lat, geoData.api5.lat,
        geoData.api1.lon, geoData.api2.lon, geoData.api3.lon, geoData.api4.lon, geoData.api5.lon,
        `=HYPERLINK("https://maps.google.com?q=${geoData.api1.lat},${geoData.api1.lon}", "View Map")`,
        `=HYPERLINK("https://maps.google.com?q=${geoData.api2.lat},${geoData.api2.lon}", "View Map")`,
        `=HYPERLINK("https://maps.google.com?q=${geoData.api3.lat},${geoData.api3.lon}", "View Map")`
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
  const googleGeocodingKey = "AIzaSyBVveeYlKbI8V-Zrf51UuhOnELI5riQrvM"; // Google Geocoding API Key جدید
  const ipApiKey = "9c0fd1067012fb9b4838e142658dce2e"; // IPAPI Key
  const ipInfoKey = "your-ipinfo-key"; // IPINFO Key
  const ipifyKey = "your-ipify-key"; // IPIFY Key

  const services = [
    `https://maps.googleapis.com/maps/api/geocode/json?address=${ip}&key=${googleGeocodingKey}`, // Google Geocoding API
    `https://api.ipapi.com/${ip}?access_key=${ipApiKey}`, // IPAPI
    `https://ipinfo.io/${ip}/json?token=${ipInfoKey}`, // IPINFO
    `https://api.ipify.org?format=json`, // IPIFY
  ];

  try {
    const responses = services.map(url => {
      try {
        return UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      } catch (error) {
        Logger.log(`Error fetching data from ${url}: ${error.message}`);
        return null;
      }
    }).filter(response => response !== null);

    const results = responses.map(response => {
      try {
        return JSON.parse(response.getContentText());
      } catch (error) {
        Logger.log(`Error parsing JSON from response: ${error.message}`);
        return null;
      }
    }).filter(result => result !== null);

    const geoData = {
      city: results[0]?.city || "N/A",
      region: results[0]?.region || "N/A",
      isp: results[0]?.org || "N/A",
      lat: results[0]?.latitude || 0,
      lon: results[0]?.longitude || 0
    };

    // اگر Google Geocoding نتایج را نداد، به سیستم جایگزین برویم
    if (!geoData.city || geoData.city === "N/A") {
      const geoDataFromAI = getGeoDataFromAI(ip);
      return geoDataFromAI;
    }

    return {
      status: "success",
      geo: geoData
    };

  } catch (error) {
    Logger.log("Geolocation Error: " + error.message);
    return { status: "fail", message: error.message };
  }
}

function getGeoDataFromAI(ip) {
  const openaiApiKey = "your-openai-api-key"; // OpenAI Key
  const prompt = `Predict the country from the following IP data:
    IP: ${ip}`;

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + openaiApiKey
    },
    payload: JSON.stringify({
      model: 'text-davinci-003',  // یا مدل‌های جدیدتر
      prompt: prompt,
      max_tokens: 60
    })
  });

  const result = JSON.parse(response.getContentText());
  const countryPrediction = result.choices[0].text.trim();

  return {
    status: "success",
    geo: {
      city: "Unknown",
      region: "Unknown",
      isp: "Unknown",
      lat: 0,
      lon: 0,
      predictedCountry: countryPrediction
    }
  };
}

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
