function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById("1nzZV0Q9FycpQHac7VV46IGIo2huFoqXp_WKHFmWqVqE");  // Google Sheets ID
    var logSheet = ss.getSheetByName("LOGS");
    var geoSheet = ss.getSheetByName("GeoData");

    if (!logSheet || !geoSheet) {
      throw new Error("❌ One of the sheets was not found.");
    }

    // Retrieve parameters from URL
    var ip = e.parameter.ip || "Unknown";
    var userAgent = e.parameter.ua || "Unknown";
    var timestamp = new Date();
    var date = timestamp.toISOString().split("T")[0]; // Date: YYYY-MM-DD
    var time = timestamp.toTimeString().split(" ")[0]; // Time: HH:MM:SS

    // Log data to LOGS sheet
    logSheet.appendRow([date, time, ip, userAgent]);
    SpreadsheetApp.flush(); // Ensure changes are committed

    Logger.log("📌 IP logged: " + ip);

    // Retrieve GeoData
    var geoData = getIPLocation(ip);
    var mapLink = "https://www.google.com/maps/search/?api=1&query=" + geoData.lat + "," + geoData.lon;

    // Log GeoData to GeoData sheet
    geoSheet.appendRow([ip, geoData.country, geoData.region, geoData.city, geoData.isp, geoData.lat, geoData.lon, mapLink]);
    SpreadsheetApp.flush(); // Ensure changes are committed

    // Success response
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "✅ IP successfully logged",
      data: { ip, userAgent, geoData }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Error response
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
