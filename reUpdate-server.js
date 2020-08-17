const fs = require('fs').promises;
const mime = require('mime-types');
const path = require('path');


var reUpdate = {
  log: () => console.log('reUpdate-server!'),
  utils: {},
  vars: {},
  consts: {},
  //https://expressjs.com/en/guide/writing-middleware.html
  express: function(basePath, clientPath){
    this.clientPath = clientPath;
    this.basePath = basePath;
    return async function(req, res, next){
      //https://stackoverflow.com/questions/14166898/node-js-with-express-how-to-remove-the-query-string-from-the-url
      var path2 = req.path;
      if(path2 == '/') path2 += '/../';
      path2 = await internal.addIndexHTML(path.join(reUpdate.clientPath, path2));

      var f = internal.fileInfo(path.join(reUpdate.basePath, path2));
      console.log('Requesting: ' + path2 + ', Mime Type: ' + f.mimeType);

      if(internal.mimeTypes[f.mimeType]){
        res.setHeader(
          'Content-Type', f.mimeType + '; ' + 
          'charset=' + f.encoding
        );
        //https://nodejs.org/dist/latest-v10.x/docs/api/fs.html#fs_filehandle_readfile_options
        var text = await fs.readFile(f.fullPath, {encoding: f.encoding});
        var params2;
        try{
          params2 = {
            req: req,
            res: res,
            path: path.dirname(path2),
            ...JSON.parse(req.query.params || '{}'),
          }
        }catch(e){
          params2 = {
            req: req,
            res: res,
            path: path.dirname(path2),
          }
          console.warn('Warning:    malformed JSON: ', req.query.params);
        }
        text = await internal.parse(text, params2, internal.mimeTypes[f.mimeType]);
        res.end(text);
      }else{
        res.sendFile(f.fullPath);
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
        var gen = new GeneratorFunction(
          'include', 'utils', 'vars', 'consts', 'params', code //this.src
        ).bind(
          reUpdate, internal.include.bind(null, params.path),
          reUpdate.utils, reUpdate.vars, reUpdate.consts, params
        )();
        for await(var html of gen){
          var html2 = html !== undefined ? html : '';
          var text = await html2.text || html;
          var params2 = {
            req: params.req,
            res: params.res,
            path: html2.path || params.path,
            ...(html2.params || {})
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
  include: async function(filePath1, filePath2, params){
    //https://stackoverflow.com/questions/17192150/node-js-get-folder-path-from-a-file
    var relPath = await internal.addIndexHTML(path.join(filePath1, filePath2));
    var fullPath = path.join(reUpdate.basePath, relPath);
    
    var f = internal.fileInfo(fullPath);
    var text = await fs.readFile(f.fullPath, {encoding: f.encoding});
    return {text: text, path: path.dirname(relPath), params: params}; //, {..._params, ...params});
  },
  fileInfo(filePath){
    return {
      fullPath: filePath,
      mimeType: mime.lookup(filePath),
      encoding: mime.charset(mime.lookup(filePath)),
    };
  },
  async addIndexHTML(filePath){
    fullPath = path.join(reUpdate.basePath, filePath);
    if((await fs.lstat(fullPath)).isDirectory()) filePath = path.join(filePath, 'index.html');
    return filePath;
  }
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