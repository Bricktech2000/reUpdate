var reUpdate = {
  log: () => console.log('reUpdate-client!'),
  this: {},
}
var internal = {
  load: async function(e){
    var parent = e.targetElement;
    var elems = parent.querySelectorAll('code.reUpdate');
    
    for(var elem of elems){
      (async function(elem){
        console.log(elem);
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/GeneratorFunction
        var GeneratorFunction = Object.getPrototypeOf(async function*(){}).constructor;
        var gen = new GeneratorFunction(internal.rawHTML(elem)).bind(reUpdate.this)() || '';
        for await(var r of gen)
          elem.insertAdjacentHTML('beforebegin', r);
      })(elem);
      //https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
    }
  },
  rawHTML: function(elem){
    return elem.innerHTML
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  }
}

export {
  reUpdate,
}

window.addEventListener('load', (e) => internal.load(
  {
    targetElement: document.documentElement,
  }
));
