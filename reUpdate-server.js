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
        text = await internal.parse(req, res, text, internal.mimeTypes[mimeType]);
        res.end(text);
      }else{
        next();
      }
    }
  },
}
var internal = {
  regexes: {
    server: /<<<([^]*?)>>>/g,
    client: /<<([^]*?)>>/g,
  },
  mimeTypes: {
    'text/html': code => `<code class="reUpdate" style="display: none;">${code}</code>`,
  },
  parse: async function(req, res, text, func){
    //return text + '//reUpdate added this comment';
    async function evalFunc(code){
      try{
        var ret = '';
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/GeneratorFunction
        var GeneratorFunction = Object.getPrototypeOf(async function*(){}).constructor;
        var gen = new GeneratorFunction('req', 'res', code).bind(reUpdate.this, req, res)();
        for await(var r of gen) ret += r;
        return ret;
      }catch(e){
        return 'Server' + e;
      }
    }
    return (await replaceAsync(text, internal.regexes.server, async (a, code) => await evalFunc(code)))
      .replace(internal.regexes.client, (a, code) => func(code) )
  },
}
//https://stackoverflow.com/questions/33631041/javascript-async-await-in-replace
async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
      const promise = asyncFn(match, ...args);
      promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

module.exports = reUpdate;