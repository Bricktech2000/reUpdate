import _fs from 'fs';
const fs = _fs.promises;
import mime from 'mime-types';
import path from 'path';


var reUpdate = {
  log: () => console.log('reUpdate-server!'),
  utils: {},
  consts: {},
  //https://expressjs.com/en/guide/writing-middleware.html
  express: function(basePath, clientPath){
    this.clientPath = clientPath;
    this.basePath = basePath;
    return async function(req, res, next){
      var path2 = req.path;
      if(path2 == '/') path2 += '/../';
      console.log('Requesting: ' + path2);

      var params = {
        req: req,
        res: res,
        path: path.dirname(path2),
      }
      try{
        params = { ...params, ...JSON.parse(req.query.params || '{}'), }
      }catch(e){
        console.warn('Warning:    malformed JSON: ', req.query.params);
      }
      //https://stackoverflow.com/questions/14166898/node-js-with-express-how-to-remove-the-query-string-from-the-url
      var incl = await internal.include('/client/', decodeURIComponent(path2), params);

      res.setHeader(
        'Content-Type', incl.fileInfo.mimeType + '; ' + 
        'charset=' + incl.fileInfo.encoding
      );
      res.end(await internal.yield(incl, params));
    }
  },
}
reUpdate.utils.sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

var internal = {
  regexes: {
    server: /<<<([^]*?)>>>/g,
    client: /<<([^]*?)>>/g,
  },
  mimeTypes: {
    'text/html': code => `<code class="reUpdate" style="display: none;">${code}</code>`,
    'text/css': code => `ClientTypeError: running client-side code inside css file`,
  },
  parse: async function(text = '', params = {}){
    //return text + '//reUpdate added this comment';
    var vars = {};
    async function exec(code){
      try{
        var ret = '';
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/GeneratorFunction
        var GeneratorFunction = Object.getPrototypeOf(async function*(){}).constructor;
        var gen = new GeneratorFunction(
          'include', 'utils', 'vars', 'consts', 'params', code //this.src
        ).bind(
          reUpdate, internal.include.bind(null, params.path),
          reUpdate.utils, vars, reUpdate.consts, params
        )();
        for await(var html of gen)
          ret += await internal.yield(html, params);
        return ret;
      }catch(e){
        return 'Server' + e;
      }
    }
    return (await replacePromise(text, internal.regexes.server, async (a, code) => await exec(code)))
      .replace(internal.regexes.client, (a, code) => params.func(code) )
  },
  yield: async function(html, params){
    var html2 = html !== undefined ? html : '';
    var text = html2.text || html;
    var params2 = {
      ...(html2.params || {}),
      req: params.req,
      res: params.res,
      path: html2.path || params.path,
      func: html2.func || params.func,
    };
    if(html2.fileInfo && internal.mimeTypes[html2.fileInfo.mimeType])
      return await internal.parse(text, params2);
    else return text;
  },
  include: async function(filePath1, filePath2, params){
    try{
      //https://stackoverflow.com/questions/17192150/node-js-get-folder-path-from-a-file
      var relPath = await internal.addIndexHTML(path.join(filePath1, filePath2));
      //https://nodejs.org/api/fs.html
      var exists, fileHandle;
      try{ fileHandle = await fs.open(path.join(reUpdate.basePath, relPath), 'r'); exists = true; }
      catch(e){ exists = false; }
      finally { if(fileHandle !== undefined) await fileHandle.close(); }
      
      if(relPath.endsWith('index.html') && !exists) relPath = 'index.html';
      var fullPath = path.join(reUpdate.basePath, relPath);
      console.log('Including: ' + relPath);
      
      var f = internal.fileInfo(fullPath);
      var text = await fs.readFile(f.fullPath, {encoding: f.encoding});
      return {text: text, path: path.dirname(relPath), params: params, fileInfo: f, func: internal.mimeTypes[f.mimeType]};
    }catch(e){
      return {text: 'Server ' + e, path: '/', params: params, fileInfo: {}, func: function(){return 'Server ' + e}};
    }
  },
  fileInfo(filePath){
    return {
      fullPath: filePath,
      mimeType: mime.lookup(filePath),
      encoding: mime.charset(mime.lookup(filePath)),
    };
  },
  async addIndexHTML(filePath){
    var fullPath = path.join(reUpdate.basePath, filePath);
    if((await fs.lstat(fullPath)).isDirectory()) filePath = path.join(filePath, 'index.html');
    return filePath;
  }
}
//https://stackoverflow.com/questions/33631041/javascript-async-await-in-replace
//cannot use this because all asyncFn's get executed at once in the beginning
//execution order will be wrong, causing all sorts of problems
async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}
//https://dev.to/ycmjason/stringprototypereplace-asynchronously-28k9
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
async function replacePromise(str, regex, func){
  var regex2 = new RegExp(regex); //otherwise, lastIndex gets corrupted... the worst bug EVER
  var ret = '';
  var match;
  var i = 0;
  while((match = regex2.exec(str)) !== null) {
    ret += str.slice(i, match.index);
    var val = await func(...match);
    ret += val;
    i = regex2.lastIndex;
  }
  ret += str.slice(i);
  return ret;
};

export { reUpdate };