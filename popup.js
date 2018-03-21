// Google Analytics Tracking
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-87086305-1']);
_gaq.push(['_trackPageview']);
(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

window.onload = function() {

  $( "#tabs" ).tabs();

  chrome.storage.local.get(['lastvalues'], function(data) {
    //tmp = JSON.stringify(data);
    if ($.isEmptyObject(data)) {
      chrome.runtime.sendMessage({greeting: "NoDataOnLoad"}, function (response) {
        console.log(response.message);
      });

      setTimeout(function(){
        location.reload();
      }, 10000);

      return;
    }

    $("#desc").html(data.lastvalues.desc);
    $("#temp").html(data.lastvalues.temp + "&nbsp;&#8457;");
    $("#wind").html(data.lastvalues.wind + "&nbsp;mph");

    var g = new JustGage({
      id: "gauge",
      value: data.lastvalues.rating,
      min: 0,
      max: 10,
      title: "Run Rating!",
      titleFontColor: "black",
      hideMinMax: true,
      levelColors: ["#c12b09", "#edd51e", "#1daa5a"]
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
  });

}
