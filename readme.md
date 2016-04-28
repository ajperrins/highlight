### Highlight

Given a string representing HTML, Highlighter wraps text matching a string with `<span/>` elements that have a class of "`qp-highlight`" which you can style.

Usage example:
```
var body = document.body.innerHTML;
document.body.innerHTML = new Highlighter(body).highlight('text to search for');
```
