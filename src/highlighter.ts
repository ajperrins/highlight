/**
 * Highlights text on a web page
 */
class Highlighter {
  constructor(private _html: string, className?: string) {
    this.split();
    if (className) this.class = className;
  }

  /**
   * Elements in the array represent either text which is visible on the page, or an HTML tag (either opening or closing)
   */
  public textAndTags: string[] = [];
  public class = 'qp-highlight';
  private static _tagRegex: RegExp = new RegExp('<[^>]*>', 'igm');

  /**
   * Given the string of HTML provided to the constructor, this function surrounds text that matches `str` with span 
   * elements having a class of "this.class"
   */
  public highlight(term: string): string {
    let iterator = new HtmlTextIterator(this);
    let nxt: string;
    term = term.toLowerCase();

    while ((nxt = iterator.next()) !== null) {
      if (nxt.toLowerCase() === term[0].toLowerCase()) {
        var restOfStringLower = iterator.peekText(term.length - 1).toLowerCase();

        if (restOfStringLower === term.substring(1)) {
          var insertions = 0;
          // If the end of the 'str' match is in the same text node, the span markup insertion is simple
          if (iterator.peeker.currentIndex === iterator.currentIndex) {
            this.insertMarkup(iterator.currentIndex,
              iterator.currentStringIndex - 1,
              iterator.peeker.currentStringIndex - 1);

            insertions++;
          } else {
            // If the end of the 'str' match spans across DOM nodes, we have to properly next our span tags across nodes
            this.insertMarkup(iterator.peeker.currentIndex, 0, iterator.peeker.currentStringIndex - 1);
            insertions++;

            // Surround each text node in `textAndTags` which comes after the match-start with <span> 
            // elements having the `this.class` class. Do this in reverse order, until we reach the current 
            // index in `textAndTags`
            for (var i = iterator.peeker.currentIndex - 1; i > iterator.currentIndex; i--) {
              if (this.isText(i)) {
                this.insertMarkup(i, 0, this.textAndTags[i].length);
                insertions++;
              }
            }

            this.insertMarkup(iterator.currentIndex,
              iterator.currentStringIndex - 1,
              this.textAndTags[iterator.currentIndex].length);
            insertions++;

          }
          // The insertmarkup() fn adds 4 pieces each invocation
          iterator.currentIndex = iterator.currentIndex + (4 * insertions);
          iterator.currentStringIndex = 0;
        }
      }
    }
    return this.textAndTags.join('');
  }

  public reset() {
    this.textAndTags.length = 0;
    this.split();
  }

  private insertMarkup(pieceIndex: number, stringIndexStart: number, stringIndexEnd: number) {
    var piece = this.textAndTags[pieceIndex];
    var left = piece.substring(0, stringIndexStart);
    var middle = piece.substring(stringIndexStart, stringIndexEnd);
    var right = piece.substring(stringIndexEnd, piece.length);

    this.textAndTags.splice(pieceIndex, 1, left, `<span class="${this.class}">`, middle, '</span>', right);
  }


  isText(index: number) {
    return this.textAndTags[index].length == 0 || this.textAndTags[index][0] !== '<';
  }

  isTag(index: number) {
    return !this.isText(index);
  }

  /**
   * Gets a boolean value indicating whether the text element at the specified index has, as its parent (direct ancestor), a tag with the given tag name.
   * This is used to preventing modifying script tag contents  
   */
  isTagContentFor(tagName: string, index: number) {
    const node = this.textAndTags[index];
    const prev = this.textAndTags[index - 1];
    return prev && this.isTag(index - 1) && prev.substring(1, 7).toLowerCase() === tagName;
  }

  /**
   * Returns the text (without markup tags)
   */
  private text(): string {
    var result = '';
    for (let i = 0; i < this.textAndTags.length; i++) {
      if (this.isText(i)) {
        result += this.textAndTags[i];
      }
    }
    return result;
  }

  /**
   * When attempting to find a string match in the DOM, we have to remove newline and whitespace that are omitted by
   * layout engines; this mimcs innerText, as opposed to textContent (see https://kellegous.com/j/2013/02/27/innertext-vs-textcontent/)
   */
  public static removeWhitespaceFromTextContentPerLayoutRules(content: string): string {
    var lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let firstNonWhitespaceIndex = 0;
      while (line[firstNonWhitespaceIndex] === ' ') firstNonWhitespaceIndex++;
      if (firstNonWhitespaceIndex) {
        if (i === 0 && firstNonWhitespaceIndex >= 1) {
          lines[0] = ' ' + line.substring(firstNonWhitespaceIndex);
        }
        else lines[i] = line.substring(firstNonWhitespaceIndex);
      }
    }
    return lines.join(' ');
  }

  /**
   * Populates the `pieces` array with strings that represent either HTML tags or visible text
   */
  private split() {
    let left = 0;
    let match: RegExpExecArray;

    while ((match = Highlighter._tagRegex.exec(this._html)) != null) {
      let leftOfMatch = this._html.substring(left, match.index);

      if (leftOfMatch) {
        this.textAndTags.push(Highlighter.removeWhitespaceFromTextContentPerLayoutRules(leftOfMatch));
      }
      var tag = match[0];
      this.textAndTags.push(tag);
      left = Highlighter._tagRegex.lastIndex;
    }

    let tail = this._html.substring(left, this._html.length);
    if (tail) {
      this.textAndTags.push(Highlighter.removeWhitespaceFromTextContentPerLayoutRules(tail));
    }
  }
}


/**
 * Provides `next` and `peek` functions; the next function returns the next text
 * character (skipping HTML tags) and the peek function returns the next 'n' text 
 * characters without advancing the character iterator 
 */
class HtmlTextIterator {
  constructor(private entryText: Highlighter) {
  }

  /**
   * The current index in the textAndTags array
   */
  currentIndex = 0;

  /**
   * The current string index for textAndTags[currentIndex]
   */
  currentStringIndex = 0;


  peeker: HtmlTextIterator;

  reset() {
    this.currentIndex = this.currentStringIndex = 0;
  }

  /**
   * Returns the next text (non-tag) character, or null once we've reached the end of the HTML 
   */
  next(): string {

    while (this.currentIndex < this.entryText.textAndTags.length && (this.entryText.isTag(this.currentIndex) || this.entryText.isTagContentFor('script', this.currentIndex))) {
      // Skips elements that represent tags or script blocks 
      this.currentIndex++;
    }

    if (this.currentIndex === this.entryText.textAndTags.length) return null;

    var nextCharacter = this.entryText.textAndTags[this.currentIndex][this.currentStringIndex];
    if (nextCharacter) {
      this.currentStringIndex++;
      return nextCharacter;
    } else {
      this.currentIndex++;
      this.currentStringIndex = 0;
      return this.next();
    }
  }


  /** 
   * Peeks ahead 'howMany' characters, returning the string from the current position to that point,
   * skipping tags
   */
  public peekText(howMany: number): string {

    this.peeker = new HtmlTextIterator(this.entryText);
    this.peeker.currentIndex = this.currentIndex;
    this.peeker.currentStringIndex = this.currentStringIndex;

    var result = '';
    var nxt = '';
    while ((nxt = this.peeker.next()) !== null && result.length < howMany) {
      result += nxt;
    }

    return result;
  }
}
