$(window).scroll(
    {
      previousTop: 0
    }, 
    function () {
      var curDirection = 'down';
      var currentTop = $(window).scrollTop();
      var header = $('#main-nav-header.transparent')

      curDirection = currentTop < this.previousTop ? 'up' : 'down';

      if ( currentTop == 0 )
        header.stop(true,true).removeClass('solid').fadeIn(100);
      else {
        if( this.prevDirection != curDirection ){
          if ( curDirection == 'down' )
            header.stop(true,true).animate({'top':'-80px'},300, 'swing', function(){
              $(this).addClass('solid');
            });
          else
            header.stop(true,true).animate({'top':'0px'},300, 'swing');
        }
      }


      this.prevDirection = curDirection;
      this.previousTop = currentTop;
});
