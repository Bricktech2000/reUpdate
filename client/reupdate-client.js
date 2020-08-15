var reUpdate = {
  log: () => console.log('reUpdate-client!'),
  this: {},
}
var internal = {
  load: function(e){
    var parent = e.targetElement;
    var elems = parent.querySelectorAll('code.reUpdate');
    
    for(var elem of elems)
      //https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentHTML
      elem.insertAdjacentHTML('beforebegin', new Function(elem.innerHTML).bind(reUpdate.this)() || '');
  },
}

export {
  reUpdate,
}

window.addEventListener('load', (e) => internal.load(
  {
    targetElement: document.documentElement,
  }
));
