var debug = false;

// Enable Google analytics
var _gaq = _gaq || [];
!function() {
  var a = document.createElement("script");
  a.type = "text/javascript",
  a.src = "https://ssl.google-analytics.com/ga.js";
  var b = document.getElementsByTagName("script")[0];
  b.parentNode.insertBefore(a, b)
}(),
_gaq.push(["_setAccount", "UA-87086305-1"])

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
    _gaq.push(["_trackEvent", "active", "installed"]);
    getLocation();
  }
});

// Setup alarm
chrome.alarms.create("checkRun", {delayInMinutes: 1, periodInMinutes: 15} );

// Alarm start
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (debug) console.log("Got alarm: " + alarm.name);

  if (alarm.name = "checkRun") {
    _gaq.push(["_trackEvent", "active", "updatedRating"]);
    getLocation();
  }

});

// Message start
chrome.runtime.onMessage.addListener( function(request,sender,sendResponse)
{
  if (debug) console.log("Got Message: " + request.greeting);

  if( request.greeting === "NoDataOnLoad" )
  {
    if (debug) console.log("Message was: No data on load");
    _gaq.push(["_trackEvent", "active", "firstLoad"]);
    getLocation();
    sendResponse( {message: "started"} );
  }
});

function getLocation() {
  if (debug) console.log("Started getLocation()");
  var options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  // First, get the location, then get the weather
  navigator.geolocation.getCurrentPosition(getWeather, error, options);
}

function getWeather(position) {

  if (debug) console.log("Started getWeather()");
  var lat = position.coords.latitude;
  var lon = position.coords.longitude;
  var apikey = '098f9450e999345595390214cbf2ad3d';
  var url = "http://api.openweathermap.org/data/2.5/weather?units=imperial&lat=" + lat + "&lon=" + lon + "&APPID=" + apikey;

  $.getJSON(url, function(weather){

    getUserMLData(weather);

    // Temp
    x = weather.main.temp;
    // Wind
    x = weather.wind.speed;
    if (debug) console.log("Wind: " + weather.wind.speed + " mph");
    // Weather Description
    // Check description eventually!
    // Documented here: http://openweathermap.org/weather-conditions
    // drizzle, rain, mist
    if (debug) console.log("Description is " + weather.weather[0].description);
    if (debug) console.log("Description ID is " + weather.weather[0].id);

  });
}

function getUserMLData(weather) {
  if (debug) console.log("Started getUserMLData()");

  chrome.storage.local.get(['userSetRatings'], function(mlData) {
    mlData = mlData.userSetRatings;

    if (mlData == null) {
      mlData = {};
    }

    getStandardMLData(mlData, weather);
  });

}

function getStandardMLData(mlUserData, weather) {
  if (debug) console.log("Started getStandardMLData()");

  // ML Version
  $.ajax({
    type: "GET",
    url: "train-data.csv",
    dataType: "text",
    success: function(mlStandardData) {
      // Convert standard data from file from CSV to array
      mlStandardData = $.csv.toArrays(mlStandardData);

      // Iterate through standard data, adding each one to the user data array
      for (var i = 0; i < mlStandardData.length; i++) {
        if (mlUserData[mlStandardData[i][0]] == null) {
          mlUserData[mlStandardData[i][0]] = {};
          mlUserData[mlStandardData[i][0]][mlStandardData[i][1]] = mlStandardData[i][2];
        } else {
          if (mlUserData[mlStandardData[i][0]][mlStandardData[i][1]] == null) {
            mlUserData[mlStandardData[i][0]][mlStandardData[i][1]] = mlStandardData[i][2];
          } else {
            console.log("Already set!");
          }
        }
      }

      // Check for a direct mapping
      directRating = null;
      if (typeof(mlUserData[weather.main.temp.toFixed(0)]) != 'undefined') {
        if (typeof(mlUserData[weather.main.temp.toFixed(0)][weather.wind.speed.toFixed(0)]) != 'undefined') {
          directRating = mlUserData[weather.main.temp.toFixed(0)][weather.wind.speed.toFixed(0)];
        }
      }

      // Convert combined array back to array of arrays
      var combinedData = [];
      for (var temp in mlUserData) {
        for (var wind in mlUserData[temp]) {
          //console.log([temp, wind, mlUserData[temp][wind]]);
          combinedData.push([temp, wind, mlUserData[temp][wind]]);
        }
      }

      //if (debug) console.log(combinedData);

      predictRating(combinedData, weather, directRating);
    }
  });

}

function predictRating (mlData, weather, directRating) {
  if (debug) console.log('Starting prediction rating');
  if (debug) console.log(weather);
  if (debug) console.log(mlData);

  x = [];
  y = [];
  for (i = 0; i < mlData.length; ++i) {
    // CSV has 3 columns (temp, wind speed, rating)
    x.push([parseFloat(mlData[i][0]), parseFloat(mlData[i][1])]);
    y.push([parseFloat(mlData[i][2])]);
  }

  mlr = new ML.MultivariateLinearRegression(x, y);
  rating_prediction = (mlr.predict([weather.main.temp, weather.wind.speed])[0]).clamp(0,10);

  if (directRating != null) {
    rating_prediction = directRating;
  }

  if (debug) console.log(rating_prediction);

  set_new_rating(rating_prediction,
                 {'temp': weather.main.temp,
                  'wind': weather.wind.speed,
                  'rating': rating_prediction,
                  'position': weather.coord,
                  'desc': weather.weather[0].description}
                );
}

function set_new_rating(rating, data) {
  console.log("Rating is " + rating);

  switch (true) {
    case (rating >= 7):
      chrome.browserAction.setIcon({path: "images/run_green_32.png"}); // Turn icon green
      break;
    case (rating > 4 && rating < 7):
      chrome.browserAction.setIcon({path: "images/run_black_32.png"}); // Turn icon black
      break;
    case (rating <= 4):
      chrome.browserAction.setIcon({path: "images/run_red_32.png"}); // Turn icon red
      break;
  }

  // Save it using the Chrome extension storage API.
  chrome.storage.local.set({'lastvalues': data}, function() {
    console.log('Settings saved');
  });
}

// General Functions
function error(err) {
  console.warn('ERROR(' + err.code + '): ' + err.message);
};

Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
};
