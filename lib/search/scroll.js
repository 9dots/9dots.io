$(window).scroll(
    {
      previousTop: 0,
      searchTop: 80
    }, 
    function() {
    	if(! _.isEmpty($('.search-filter-bar'))){
      var scroll = $(window).scrollTop() || 1;
      console.log(scroll, this.searchTop);
      if(scroll > 80){
      	$('.search-filter-bar').addClass('fixed');
        $('.pages-container').css('margin-top','60px');
      }
      if(scroll < 80){
      	$('.search-filter-bar').removeClass('fixed');
        $('.pages-container').css('margin-top','0');
      }
    }
});