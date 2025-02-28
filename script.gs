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

    // دریافت اطلاعات جغرافیایی از 5 API مختلف
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
  const openaiApiKey = "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";
  const geminiKey = "AIzaSyBVveeYlKbI8V-Zrf51UuhOnELI5riQrvM"; // Google Geocoding API Key جدید

  const services = [
    `https://api.ipapi.com/${ip}?access_key=${openaiApiKey}`, // IPAPI
    `https://maps.googleapis.com/maps/api/geocode/json?address=${ip}&key=${geminiKey}`, // Google Geocoding API
    `https://ipinfo.io/${ip}/json`, // IPINFO
    `https://api.ipify.org?format=json` // IPify (برای گرفتن IP)
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

    // اگر OpenAI خطا داد، به سراغ Geocoding API برویم
    if (!geoData.city || geoData.city === "N/A") {
      const geoDataFromGoogle = getGeoDataFromGoogle(ip);
      return geoDataFromGoogle;
    }

    // ارسال داده‌ها به OpenAI برای پیش‌بینی کشور
    const countryPrediction = predictCountryFromGeoData(geoData);

    return {
      status: "success",
      predictedCountry: countryPrediction,
      geo: geoData
    };

  } catch (error) {
    Logger.log("Geolocation Error: " + error.message);
    return { status: "fail", message: error.message };
  }
}

function predictCountryFromGeoData(geoData) {
  const openaiApiKey = "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";

  const data = {
    "city": geoData.city || "N/A",
    "region": geoData.region || "N/A",
    "isp": geoData.isp || "N/A",
    "lat": geoData.lat || 0,
    "lon": geoData.lon || 0
  };

  const prompt = `
    Given the following geographic data, predict the country:
    City: ${data.city}
    Region: ${data.region}
    ISP: ${data.isp}
    Latitude: ${data.lat}
    Longitude: ${data.lon}
    Please respond with the most likely country.
  `;

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + openaiApiKey
    },
    payload: JSON.stringify({
      model: 'gpt-3.5-turbo',  // استفاده از مدل gpt-3.5-turbo
      prompt: prompt,
      max_tokens: 60
    })
  });

  const result = JSON.parse(response.getContentText());
  const countryPrediction = result.choices[0].text.trim();

  return countryPrediction;
}

function getGeoDataFromGoogle(ip) {
  const geminiKey = "AIzaSyBVveeYlKbI8V-Zrf51UuhOnELI5riQrvM"; // Google API Key جدید
  
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${ip}&key=${geminiKey}`;

  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(response.getContentText());

    // بررسی وضعیت پاسخ از Google API
    if (data.status === "OK") {
      const geoData = {
        city: data.results[0]?.address_components[0]?.long_name || "N/A",
        region: data.results[0]?.address_components[1]?.long_name || "N/A",
        isp: "N/A",
        lat: data.results[0]?.geometry.location.lat || 0,
        lon: data.results[0]?.geometry.location.lng || 0
      };

      return {
        status: "success",
        geo: geoData
      };
    } else {
      Logger.log("Google Geocoding API error: " + data.status); // نمایش خطای API در صورت لزوم
      throw new Error("Failed to fetch geolocation data from Google.");
    }
  } catch (error) {
    Logger.log("Google Geolocation Error: " + error.message); // لاگ خطا
    return { status: "fail", message: error.message };
  }
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
