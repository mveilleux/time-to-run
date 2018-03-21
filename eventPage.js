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


// Setup alarm
chrome.alarms.create("checkRun", {delayInMinutes: 1, periodInMinutes: 15} );
chrome.alarms.onAlarm.addListener(function(alarm) {

  _gaq.push(["_trackEvent", "active", "ping"]);

  var options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(locationSuccess, error, options);
});

// Setup Listener from default_popup
chrome.runtime.onMessage.addListener( function(request,sender,sendResponse)
{
  console.log("got request");
  console.log(request);
    if( request.greeting === "NoDataOnLoad" )
    {
        var options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(locationSuccess, error, options);

        sendResponse( {message: "started"} );
    }
});




function locationSuccess(position) {

  var lat = position.coords.latitude;
  var lon = position.coords.longitude;
  var apikey = '098f9450e999345595390214cbf2ad3d';
  var url = "http://api.openweathermap.org/data/2.5/weather?units=imperial&lat=" + lat + "&lon=" + lon + "&APPID=" + apikey;

  $.getJSON(url, function(r){

    // ML Version
    $.ajax({
      type: "GET",
      url: "train-data.csv",
      dataType: "text",
      success: function(response) {
        data = $.csv.toArrays(response);
        x = [];
        y = [];
        for (i = 0; i < data.length; ++i) {
          tmp = data[i].splice(0,2);
          x.push([parseFloat(tmp[0]), parseFloat(tmp[1])]);
          y.push([parseFloat(data[i].splice(-1,1)[0])]);
        }

        mlr = new ML.MultivariateLinearRegression(x, y);
        rating_prediction = (mlr.predict([r.main.temp, r.wind.speed])[0]).clamp(0,10);

        console.log(rating_prediction);

        set_new_rating(rating_prediction,
                       {'temp': r.main.temp,
                        'wind': r.wind.speed,
                        'rating': rating,
                        'position': position,
                        'desc': r.weather[0].description}
                      );
      }
    });

    // Temp - r.main.temp
    // Wind - r.wind.speed
    // Weather Description - r.weather[0].description
    rating = 10;

    // Temp
    x = r.main.temp;
    console.log("Temp: " + r.main.temp + " degrees F");
    switch (true) {
      case (x >= 80):
        rating -= 5;
        break;
      case (x > 55 && x < 80):
        rating = rating;
        break;
      case (x > 40 && x <= 55):
        rating -= 3;
        break;
      case (x <= 40):
        rating -= 5;
        break;
    }

    // Wind
    x = r.wind.speed;
    console.log("Wind: " + r.wind.speed + " mph");
    switch (true) {
      case (x >= 25):
        rating -= 4;
        break;
      case (x > 15 && x < 25):
        rating -= 2;
        break;
      case (x > 5 && x <= 15):
        rating -= 1;
        break;
      case (x <= 5):
        rating = rating;
        break;
    }

    // Check description eventually!
    // Documented here: http://openweathermap.org/weather-conditions
    // drizzle, rain, mist
    console.log("Description is " + r.weather[0].description);
    console.log("Description ID is " + r.weather[0].id);

    // Rating
    /* set_new_rating(rating, {'temp': r.main.temp,
                            'wind': r.wind.speed,
                            'rating': rating,
                            'position': position,
                            'desc': r.weather[0].description}
                          ); */

  });
}

function set_new_rating(rating, data) {
  console.log("Rating is " + rating);

  switch (true) {
    case (x >= 7):
      chrome.browserAction.setIcon({path: "images/run_green_32.png"}); // Turn icon green
      break;
    case (x > 4 && x < 7):
      chrome.browserAction.setIcon({path: "images/run_black_32.png"}); // Turn icon black
      break;
    case (x <= 4):
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
