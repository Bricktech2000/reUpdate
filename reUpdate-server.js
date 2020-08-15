const fs = require('fs').promises;
const mime = require('mime-types');


var reUpdate = {
  log: () => console.log('reUpdate-server!'),
  //https://expressjs.com/en/guide/writing-middleware.html
  this: {},
  express: function(clientPath){
    return async function(req, res, next){
      if(req.url[req.url.length - 1] == '/')
        req.url += 'index.html';
      var fullPath = clientPath + req.url;
      var mimeType = mime.lookup(fullPath);
      var encoding = mime.charset(mimeType);
      console.log('Requesting: ' + req.url + ', Mime Type: ' + mimeType);

      if(internal.mimeTypes[mimeType]){
        res.setHeader(
          'Content-Type', mimeType + '; ' + 
          'charset=' + encoding
        );
        //https://nodejs.org/dist/latest-v10.x/docs/api/fs.html#fs_filehandle_readfile_options
        var text = await fs.readFile(fullPath, {encoding: encoding});
        text = internal.parse(req, res, text, internal.mimeTypes[mimeType]);
        res.end(text);
      }else{
        next();
      }
    }
  },
}
var internal = {
  regexes: {
    server: /<<<(.*?)>>>/g,
    client: /<<(.*?)>>/g,
  },
  mimeTypes: {
    'text/html': code => `<code class="reUpdate" style="display: none;">${code}</code>`,
  },
  parse: function(req, res, text, func){
    //return text + '//reUpdate added this comment';
    return text
      .replace(internal.regexes.server, function(a, code){
        try{
          return new Function('req', 'res', code).bind(reUpdate.this, req, res)() || ''
        }catch(e){
          return 'Server' + e;
        }
      })
      .replace(internal.regexes.client, (a, code) => func(code) )
  },
}

module.exports = reUpdate;