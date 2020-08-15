var internal = {
  this: {},
  codeBlocks: [],
  onload: async function(e){
    var parent = e.targetElement;
    var elems = parent.querySelectorAll('code.reUpdate');
    
    for(var elem of elems){
      internal.codeBlocks.push(new htmlCodeBlock(elem));
    }
  },
  rawHTML: function(elem){
    return elem.innerHTML
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  },
  include: async function(filename){
    var res = await fetch(filename);
    var text = await res.text();
    return text;
  },
}
class CodeBlock{
  constructor(src){
    this.src = src;
    this.events = [];
    this.exec();
  }
  destructor(){
    internal.codeBlocks.filter((item) => item !== this);
  }
  async exec(){
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/GeneratorFunction
    var GeneratorFunction = Object.getPrototypeOf(async function*(){}).constructor;
    var obj = {};
    this.events = [];
    var proxy = new Proxy(obj, {
      get: function(target, key){
        this.events.push(key);
        return internal.this[key];
      }.bind(this),
      set: function(target, key, value){
        reUpdate.this[key] = value;
        return true;
      }
    });
    var gen = GeneratorFunction('include', this.src).bind(proxy, internal.include)() || '';
    for await(var html of gen) this.yield(html);
  }
  yield(html){
    throw new ReferenceError("Extended CodeBlock yield not defined.");
  }
  reexec(){
    throw new ReferenceError("Extended CodeBlock reexec not defined.");
  }
}
class htmlCodeBlock extends CodeBlock{
  constructor(elem){
    var src = internal.rawHTML(elem);
    super(src);
    this.elem = elem;
  }
  yield(html){
    //https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
    this.elem.insertAdjacentHTML('beforebegin', html);
    //setTimeout(() => {
      if(!this.topElem) this.topElem = this.elem.previousSibling
    //});
  }
  reexec(){
    if(this.topElem){
      while(true){
        var elem = this.elem.previousSibling;
        elem.parentNode.removeChild(elem); //elem.outerHTML = '';
        if(elem == this.topElem) break;
      }
      this.topElem = null;
    }
    this.exec();
  }
}

var reUpdate = {
  log: () => console.log('reUpdate-client!'),
  //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
  this: new Proxy(internal.this, {
    get: function(target, key){
      return internal.this[key];
    },
    set: function(target, key, value){
      //console.log(internal.codeBlocks);
      internal.this[key] = value;
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

reUpdate.this.sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));


export {
  reUpdate,
}

window.addEventListener('load', (e) => internal.onload(
  {
    targetElement: document.documentElement,
  }
));
