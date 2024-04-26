$('#reset').click(function(){
    var urlWithoutQueryString = window.location.href.split('?')[0];
      window.location.href = urlWithoutQueryString;
   })