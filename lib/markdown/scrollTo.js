$(window).scroll(
    {
      previousTop: 0
    }, 
    function () {
      var scroll = $(window).scrollTop() || 1;
      var opacity = 50/scroll;
      opacity = opacity < .05 ? 0 : opacity;
      $('.jump-to-lesson').css('opacity',opacity);
});
