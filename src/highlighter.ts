/**
 * Highlights text on a web page
 */
class Highlighter {
  constructor(private _html: string) {
    this.split();
  }

  /**
   * Elements in the array represent either text which is visible on the page, or an 
   * HTML tag (either opening or closing)
   */
  public textAndTags: string[] = [];
  private static _tagRegex: RegExp = new RegExp('<[^>]*>', 'igm');

  /**
   * Inserts span elements with a class that is used to highlight text on the webpage
   */
  public highlight(str: string): string {
    let iterator = new HtmlTextIterator(this);
    let nxt: string;

    while ((nxt = iterator.next()) !== null) {
      if (nxt.toLowerCase() === str[0].toLowerCase()) {
        var restOfString = iterator.peekText(str.length - 1);

        var insertions = 0;
        if (restOfString.toLowerCase() === str.substring(1).toLowerCase()) {

          if (iterator.peeker.currentIndex === iterator.currentIndex) {
            this.insertMarkup(iterator.currentIndex,
              iterator.currentStringIndex - 1,
              iterator.peeker.currentStringIndex - 1);

            insertions++;
          } else {

            this.insertMarkup(iterator.peeker.currentIndex, 0, iterator.peeker.currentStringIndex - 1);
            insertions++;

            // Surround each text-piece post match-start with the span 
            // in reverse order, until we get to current
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

  private insertMarkup(pieceIndex: number, stringIndexStart: number, stringIndexEnd: number) {
    var piece = this.textAndTags[pieceIndex];
    var left = piece.substring(0, stringIndexStart);
    var middle = piece.substring(stringIndexStart, stringIndexEnd);
    var right = piece.substring(stringIndexEnd, piece.length);

    this.textAndTags.splice(pieceIndex, 1, left, '<span class="qp-highlight">', middle, '</span>', right);
  }


  isText(index: number) {
    return this.textAndTags[index].length == 0 || this.textAndTags[index][0] !== '<';
  }

  isTag(index: number) {
    return !this.isText(index);
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
   * Populates the `pieces` array with strings that represent either HTML tags or visible text
   */
  private split() {
    let left = 0;
    let match: RegExpExecArray;

    while ((match = Highlighter._tagRegex.exec(this._html)) != null) {
      let leftOfMatch = this._html.substring(left, match.index);

      if (leftOfMatch) {
        this.textAndTags.push(leftOfMatch);
      }
      var tag = match[0];
      this.textAndTags.push(tag);
      left = Highlighter._tagRegex.lastIndex;
    }

    let tail = this._html.substring(left, this._html.length);
    if (tail) {
      this.textAndTags.push(tail);
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
    while (this.currentIndex < this.entryText.textAndTags.length && this.entryText.isTag(this.currentIndex)) {
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
