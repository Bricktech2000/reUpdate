import http from 'http';
import path from 'path';
import express from 'express';
var app = express();

//https://stackoverflow.com/questions/8817423/node-dirname-not-defined
const basePath = path.resolve(); //__dirname
const clientPath = 'client';
//https://stackoverflow.com/questions/58384179/syntaxerror-cannot-use-import-statement-outside-a-module
import { reUpdate } from './reUpdate-server.js';
reUpdate.log();






app.use(reUpdate.express(basePath, clientPath));
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
