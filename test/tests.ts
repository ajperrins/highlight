/// <reference path="../typings/mocha/mocha.d.ts"/>
/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/chai/chai.d.ts"/>
/// <reference path="../src/highlighter.ts"/>

let assert = chai.assert;
let html = `<html>
              <body><p>Lorem ipsum dolor sit amet</p>
              <p>The quick brown fox jumps over the lazy dog.</p><span> Black Swan Event</span>
              <Script> function foo(){ return 'dolor'; }</script>
              </body/>
            </html>`;

let highlighter: Highlighter;
const openHighlightTag = '<span class="qp-highlight">';
const closeHighlightTag = '</span>';

beforeEach(() => {
  highlighter = new Highlighter(html);
});

describe('Html tests', function () {
  it('should wrap `fox` in a span', function () {
    var result = highlighter.highlight('fox');
    assert.isTrue(result.indexOf('<span class="qp-highlight">fox</span>') > 0);
  });

  it('should match text across tags and correctly nest spans', () => {
    let result = highlighter.highlight('dog. Black');
    assert.isTrue(result.indexOf('<span class="qp-highlight">dog.</span></p><span><span class="qp-highlight"> Black</span>') > 0);
  })

  it('should not wrap script with tags when text in the script matches the search term', () => {
    const result = highlighter.highlight('dolor');

    assert.isTrue(result.indexOf("function foo(){ return 'dolor'; }") > 0)
    assert.isTrue(result.indexOf(`${openHighlightTag}dolor${closeHighlightTag}`) > 0)
  });

  it('should remove whitespace and newlines from element content, to mimic layout rules', () => {
    assert.equal(Highlighter.removeWhitespaceFromTextContentPerLayoutRules(`test\ntest`), 'test test', 'newline should be replaced with single space');
    assert.equal(Highlighter.removeWhitespaceFromTextContentPerLayoutRules(`test\n   test`), 'test test', 'newline followed by whitespace should be replaced with single space');
    assert.equal(Highlighter.removeWhitespaceFromTextContentPerLayoutRules(`   test\n   test`), ' test test', 'whitespace followed by newline and whitespace should be replaced with single space');
  })
});
