/// <reference path="../typings/mocha/mocha.d.ts"/>
/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/chai/chai.d.ts"/>
/// <reference path="../src/highlighter.ts"/>

//import chai = require("chai");
let assert = chai.assert;
//import { Highlighter } from "../src/highlighter"

let html = `<html>
              <body><p>Lorem ipsum dolor sit amet</p>
              <p>The quick brown fox jumps over the lazy dog.</p><span> Black Swan Event</span>
              </body/>
            </html>`;

let highlight: Highlighter;

beforeEach(() => { highlight = new Highlighter(html); });

describe('Html tests', function () {
  it('should wrap `fox` in a span', function () {
    var result = highlight.highlight('fox');
    assert.isTrue(result.indexOf('<span class="qp-highlight">fox</span>') > 0);
  });

  it('should match text across tags and correctly nest spans', () => {
    let result = highlight.highlight('dog. Black');
    assert.isTrue(result.indexOf('<span class="qp-highlight">dog.</span></p><span><span class="qp-highlight"> Black</span>') > 0);
  })
});
