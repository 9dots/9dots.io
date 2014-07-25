$(window).scroll(
    {
      previousTop: 0
    }, 
    function () {
    	if(! _.isEmpty($('.search-filter-bar'))){
      var scroll = $(window).scrollTop() || 1;
      var searchTop = $('.search-container').offset().top;
      if(scroll > searchTop)
      	$('.search-filter-bar').addClass('fixed');
      if(scroll < searchTop)
      	$('.search-filter-bar').removeClass('fixed');
      // $('.jump-to-lesson').css('opacity',opacity);
    }
});