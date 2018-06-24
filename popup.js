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
_gaq.push(['_trackPageview']);

var ICON_PATH = "images/weather-icons/svg/";
var DEFAULT_ICON = "wi-day-sunny-overcast.svg";
// Map of descriptions to weather icons based on
// https://openweathermap.org/weather-conditions#Icon-list
var ICONS = {
  "clear sky": "wi-day-sunny.svg",
  "few clouds": "wi-day-sunny-overcast.svg",
  "scattered clouds": "wi-day-sunny-overcast.svg",
  "broken clouds": "wi-day-sunny-overcast.svg",
  "shower rain": "wi-showers.svg",
  "rain": "wi-rain.svg",
  "moderate rain": "wi-rain.svg",
  "thunderstorm": "wi-thunderstorm.svg",
  "snow": "wi-snow.svg",
  "mist": "wi-fog.svg",
};

var currentValues;
var g;

function getDashboardData(requestData = true) {
  chrome.storage.local.get(['lastvalues'], function(data) {
    currentValues = data;
    console.log(data);
    // This improves the user experience on initial load
    if ($.isEmptyObject(data)) {
      if (requestData) {
        chrome.runtime.sendMessage({greeting: "NoDataOnLoad"}, function (response) {
          console.log(response.message);
        });
      }
      setTimeout(function(){
        //location.reload();
        getDashboardData(false);
      }, 500);
      return;
    } else {
      // Update values onto dashboard
      updateDashboard(
        data.lastvalues.rating,
        data.lastvalues.temp.toFixed(0),
        data.lastvalues.wind.toFixed(0),
        data.lastvalues.desc);
    }
  });
}

function updateDashboard(rating, temp, wind, description) {

  var weatherEl = $("#weather");
  weatherEl.attr("src", getIcon(description));

  $("#desc").html(description);
  $("#temp").html(temp + "<span class='small'>&#8457;</span>");
  $("#wind").html(wind + "<span class='small'>mph</span>");

  g = new JustGage({
    id: "gauge",
    value: rating,
    min: 0,
    max: 10,
    shadowOpacity: 0,
    label: "Run Rating",
    labelFontColor: "#4d4d4d",
    valueFontColor: "#4d4d4d",
    valueFontFamily: "Roboto",
    hideMinMax: true,
    levelColors: ["#c12b09", "#edd51e", "#1daa5a"]
  });
}

// Get the correct weather icon based on the description
// returned from the weather api. If we don't have an
// icon for a description, return the DEFAULT_ICON
function getIcon(description) {
  if(ICONS.hasOwnProperty(description)) {
    return ICON_PATH + ICONS[description];
  }
  return ICON_PATH + DEFAULT_ICON;
}

function changeRating(val) {
  chrome.storage.local.get(['userSetRatings'], function(data) {
    data = data.userSetRatings;

    if (data == null) {
      data = {};
    }
    if (data[currentValues.lastvalues.temp.toFixed(0)] == null) {
      data[currentValues.lastvalues.temp.toFixed(0)] = {};
    }
    updatedRating = (Math.round(currentValues.lastvalues.rating) + val).toString();
    data[currentValues.lastvalues.temp.toFixed(0)][currentValues.lastvalues.wind.toFixed(0)] = updatedRating;

    // Save it using the Chrome extension storage API.
    chrome.storage.local.set({'userSetRatings': data}, function() {
      console.log(data);
      g.refresh(updatedRating);
      currentValues.lastvalues.rating = updatedRating;
      chrome.storage.local.set({'lastvalues': currentValues.lastvalues});
    });
  });
}

window.onload = function() {

  $("#left-adj").click(function(){
    _gaq.push(["_trackEvent", "active", "changeRating", "Down"]);
    changeRating(-1);
  });

  $("#right-adj").click(function(){
    _gaq.push(["_trackEvent", "active", "changeRating", "Up"]);
    changeRating(1);
  });

  $("#show-credits").click(function(){
    $("#summary").hide();
    $("#credits").show();
  });

  $("#back").click(function(){
    $("#summary").show();
    $("#credits").hide();
  });

  $( "#showcredits" ).click(function() {
    if ($( "#showcredits" ).text() == 'Show credits') {
      $(".footer-credits").css('display', 'block');
      $( "#showcredits" ).text('Hide credits');
    } else {
      $(".footer-credits").css('display', 'none');
      $( "#showcredits" ).text('Show credits');
    }
  });

  getDashboardData();

}
