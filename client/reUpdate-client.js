var internal = {
  this: {},
  codeBlocks: [],
  parse: async function(html, params = {}){
    var parent = html;
    if(!(html instanceof HTMLElement)){
      parent = document.createElement('template');
      parent.innerHTML = html;
      parent = parent.content;
    }
    var elems = parent.querySelectorAll('code.reUpdate');
    
    console.log(parent, params, elems);
    for(var elem of elems)
      internal.codeBlocks.push(new htmlCodeBlock(elem, params));
    
    return parent;
  },
  rawHTML: function(elem){
    return elem.innerHTML
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  },
}
class CodeBlock{
  constructor(src, params){
    this.src = src;
    this.params = params;
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
    var gen = GeneratorFunction('include', 'params', this.src).bind(proxy, this.include, this.params)() || '';
    for await(var html of gen) this.yield(html);
  }
  yield(html){
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
  constructor(elem, params){
    var src = internal.rawHTML(elem);
    super(src, params);
    this.elem = elem;
    this.elem.classList.remove('reUpdate');
  }
  yield(html){
    if(html instanceof DocumentFragment || html instanceof HTMLElement){
      for(var elem of html.childNodes){
        if(!this.topElem) this.topElem = elem;
        this.elem.parentNode.insertBefore(elem, this.elem);
      }
      console.log('topElem', this.topElem);
    }else{
      //https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
      this.elem.insertAdjacentHTML('beforebegin', html);
      if(!this.topElem) this.topElem = this.elem.previousSibling;
    }

    /*requestAnimationFrame( function(){
      internal.onload({targetElement: this.elem.parentNode});
      console.log({targetElement: this.elem.parentNode});
    }.bind(this) );*/
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
  async include(filename, params){
    var res = await fetch(filename);
    var text = await res.text();
    return internal.parse(text, params);
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

window.addEventListener('load', (e) =>
  internal.parse(document.documentElement)
);
