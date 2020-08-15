const path = require('path');
const http = require('http');
const express = require('express');
var app = express();

const clientPath = path.join(__dirname, 'client');
const serverPath = path.join(__dirname, 'server');
//https://stackoverflow.com/questions/58384179/syntaxerror-cannot-use-import-statement-outside-a-module
const reUpdate = require('./reUpdate-server');
reUpdate.log();






app.use(reUpdate.express(clientPath));
//https://evanhahn.com/express-dot-static-deep-dive/
app.use(express.static(clientPath, {
  index: 'index.html'
}));
//https://expressjs.com/en/guide/error-handling.html
//https://stackoverflow.com/questions/29481729/chaining-express-js-4s-res-status401-to-a-redirect
//app.use(function (req, res, next) {
//  res.status(404).sendFile(clientPath + '/404.html');//redirect(404, '/emilien.ml/#404');
//});


var httpServer = http.createServer(app);
httpServer.listen(8080, function(){
    var host = 'localhost';
    var port = httpServer.address().port;
    console.log('listening on http://' + host + ':' + port + '/');
});












