var internal = {
  watch: {},
  codeBlocks: [],
  parse: async function(html, params = {}){
    var parent = html;
    if(!(html instanceof HTMLElement)){
      parent = document.createElement('template');
      parent.innerHTML = html;
      parent = parent.content;
    }
    var elems = parent.querySelectorAll('code.reUpdate');
    var codeBlocks = [];
    
    //console.log(parent, params, elems);
    var vars = {};
    for(var elem of elems)
      codeBlocks.push(new htmlCodeBlock(elem, params, vars));
    for(var codeBlock of codeBlocks)
      internal.codeBlocks.push(codeBlock);
    
    return new Promise(resolve => resolve({codeBlocks: codeBlocks, parent: parent}));
  },
  rawHTML: function(elem){
    return elem.innerHTML
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  },
}
class CodeBlock{
  constructor(src, params, vars){
    this.src = src;
    this.params = params;
    this.events = [];
    this.vars = vars;
  }
  destructor(){
    internal.codeBlocks.filter((item) => item !== this);
  }
  async exec(){
    this.elem.classList.remove('reUpdate');
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/GeneratorFunction
    var GeneratorFunction = Object.getPrototypeOf(async function*(){}).constructor;
    var obj = {};
    this.events = [];
    var proxy = new Proxy(obj, {
      get: function(target, key){
        this.events.push(key);
        return internal.watch[key];
      }.bind(this),
      set: function(target, key, value){
        reUpdate.watch[key] = value;
        return true;
      }
    });
    var gen = GeneratorFunction(
      'include', 'utils', 'vars', 'consts', 'watch', 'params', this.src
    ).bind(
      reUpdate, this.include,
      reUpdate.utils, this.vars, reUpdate.consts, proxy, this.params
    )() || '';
    for await(var html of gen){
      var html2 = html !== undefined ? html : '';
      var text = html2.text || html2;
      var params2 = {
        //path: html2.path || params.path,
        ...(html2.params || {})
      };
      await this.yield(text, params2);
    }
  }
  async yield(html){
    throw new ReferenceError("Extended CodeBlock yield not defined.");
  }
  reexec(){
    throw new ReferenceError("Extended CodeBlock reexec not defined.");
  }
  async include(){
    throw new ReferenceError("Extended CodeBlock include not defined.");
  }
}
class htmlCodeBlock extends CodeBlock{
  constructor(elem, params, vars){
    var src = internal.rawHTML(elem);
    super(src, params, vars);
    this.elem = elem;
  }
  async yield(html, params){
    var {codeBlocks, parent} = await internal.parse(html, params);
    var elem;
    while(elem = parent.childNodes[0]){
      if(!this.topElem) this.topElem = elem;
      if(this.elem.parentNode) this.elem.parentNode.insertBefore(elem, this.elem);
      else break;
    }
    for(var codeBlock of codeBlocks) codeBlock.exec();
    //https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
    //this.elem.insertAdjacentHTML('beforebegin', parent);
    //(!this.topElem) this.topElem = this.elem.previousSibling;
  }
  reexec(){
    if(this.topElem){
      while(true){
        var elem = this.elem.previousSibling;
        if(elem) elem.parentNode.removeChild(elem); //elem.outerHTML = '';
        if(elem == this.topElem || !elem) break;
      }
      this.topElem = null;
    }
    this.exec();
  }
  async include(filename, params = {}){
    try{
      var json = JSON.stringify(params);
      if(json.length > 10000) json = '{}';
      var res = await fetch(filename + '?params=' + encodeURIComponent(json));
      var text = await res.text();
      return {text: text, params: params};
    }catch(e){
      console.log(e);
    }
  }
}

var reUpdate = {
  log: () => console.log('reUpdate-client!'),
  utils: {},
  vars: {},
  consts: {},
  //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
  watch: new Proxy(internal.watch, {
    get: function(target, key){
      return internal.watch[key];
    },
    set: function(target, key, value){
      if(internal.watch[key] == value) return true;
      internal.watch[key] = value;
      var internalCodeBlocks = [...internal.codeBlocks];
      for(var codeBlock of internalCodeBlocks)
        for(var item of codeBlock.events)
          if(item == key)
            codeBlock.reexec()
      return true;
    }
  }),
  internal: internal,
}

reUpdate.utils.sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));


export {
  reUpdate,
}

window.addEventListener('load', async (e) => {
  var {codeBlocks, parent} = await internal.parse(document.documentElement);
  for(var codeBlock of codeBlocks) codeBlock.exec();
  //for(var codeBlock of internal.codeBlocks) await codeBlock.exec();
});
