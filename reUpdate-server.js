const fs = require('fs').promises;
const mime = require('mime-types');
const path = require('path');


var reUpdate = {
  log: () => console.log('reUpdate-server!'),
  //https://expressjs.com/en/guide/writing-middleware.html
  this: {},
  express: function(basePath, clientPath){
    this.clientPath = clientPath;
    this.basePath = basePath;
    return async function(req, res, next){
      if(req.url == '/') req.url += '../index.html';
      var f = internal.fileInfo(path.join(reUpdate.basePath, reUpdate.clientPath, req.url));
      console.log('Requesting: ' + req.url + ', Mime Type: ' + f.mimeType);

      if(internal.mimeTypes[f.mimeType]){
        res.setHeader(
          'Content-Type', f.mimeType + '; ' + 
          'charset=' + f.encoding
        );
        //https://nodejs.org/dist/latest-v10.x/docs/api/fs.html#fs_filehandle_readfile_options
        var text = await fs.readFile(f.fullPath, {encoding: f.encoding});
        text = await internal.parse(text, {req: req, res: res, path: '/'}, internal.mimeTypes[f.mimeType]);
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
  parse: async function(text = '', params = {}, func){
    //return text + '//reUpdate added this comment';
    async function exec(code){
      try{
        var ret = '';
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/GeneratorFunction
        var GeneratorFunction = Object.getPrototypeOf(async function*(){}).constructor;
        var gen = new GeneratorFunction('include', 'params', code).bind(
          reUpdate.this,
          internal.include.bind(null, params.path), //.bind(this, {req: params.req, res: params.res}),
          params
        )();
        for await(var html of gen){
          var isArray = Array.isArray(await html);
          var html2 = isArray ? await html[0] : await html;
          var text = html2 !== undefined ? (html2.text || html2) : html2;
          var params2 = {
            req: params.req,
            res: params.res,
            path: text !== undefined ? (html2.path || params.path) : params.path,
            ...(isArray ? html[1] : {})
          };
          //this.yield(html2, params2);
          ret += await internal.parse(text, params2, func);
        }
        return ret;
      }catch(e){
        return 'Server' + e;
      }
    }
    return (await replaceAsync(text, internal.regexes.server, async (a, code) => await exec(code)))
      .replace(internal.regexes.client, (a, code) => func(code) )
  },
  include: async function(filePath1, filePath2){
    //https://stackoverflow.com/questions/17192150/node-js-get-folder-path-from-a-file
    var filePath = path.join(filePath1, path.dirname(filePath2));
    var fileName = path.basename(filePath2);
    var fullPath = path.join(reUpdate.basePath, filePath, fileName);

    if((await fs.lstat(fullPath)).isDirectory()){
      filePath = path.join(filePath, fileName);
      fileName = 'index.html';
      fullPath = path.join(reUpdate.basePath, filePath, fileName);
    }
    
    var f = internal.fileInfo(fullPath);
    var text = await fs.readFile(f.fullPath, {encoding: f.encoding});
    return {text: text, path: path.dirname(path.join(filePath, fileName))}; //, {..._params, ...params});
  },
  fileInfo(filePath){
    return {
      fullPath: filePath,
      mimeType: mime.lookup(filePath),
      encoding: mime.charset(mime.lookup(filePath)),
    };
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