var reUpdate = {
  log: () => console.log('reUpdate-server!'),
  //https://expressjs.com/en/guide/writing-middleware.html
  express: function(req, res, next){
    console.log('Requesting: ', req.url);
    next();
  }
}

module.exports = reUpdate;