/**
 * Highlights text on a web page
 */
var Highlighter = (function () {
    function Highlighter(_html) {
        this._html = _html;
        /**
         * Elements in the array represent either text which is visible on the page, or an
         * HTML tag (either opening or closing)
         */
        this.textAndTags = [];
        this.split();
    }
    /**
     * Inserts span elements with a class that is used to highlight text on the webpage
     */
    Highlighter.prototype.highlight = function (str) {
        var iterator = new HtmlTextIterator(this);
        var nxt;
        while ((nxt = iterator.next()) !== null) {
            if (nxt.toLowerCase() === str[0].toLowerCase()) {
                var restOfString = iterator.peekText(str.length - 1);
                var insertions = 0;
                if (restOfString.toLowerCase() === str.substring(1).toLowerCase()) {
                    if (iterator.peeker.currentIndex === iterator.currentIndex) {
                        this.insertMarkup(iterator.currentIndex, iterator.currentStringIndex - 1, iterator.peeker.currentStringIndex - 1);
                        insertions++;
                    }
                    else {
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
                        this.insertMarkup(iterator.currentIndex, iterator.currentStringIndex - 1, this.textAndTags[iterator.currentIndex].length);
                        insertions++;
                    }
                    // The insertmarkup() fn adds 4 pieces each invocation
                    iterator.currentIndex = iterator.currentIndex + (4 * insertions);
                    iterator.currentStringIndex = 0;
                }
            }
        }
        return this.textAndTags.join('');
    };
    Highlighter.prototype.insertMarkup = function (pieceIndex, stringIndexStart, stringIndexEnd) {
        var piece = this.textAndTags[pieceIndex];
        var left = piece.substring(0, stringIndexStart);
        var middle = piece.substring(stringIndexStart, stringIndexEnd);
        var right = piece.substring(stringIndexEnd, piece.length);
        this.textAndTags.splice(pieceIndex, 1, left, '<span class="qp-highlight">', middle, '</span>', right);
    };
    Highlighter.prototype.isText = function (index) {
        return this.textAndTags[index].length == 0 || this.textAndTags[index][0] !== '<';
    };
    Highlighter.prototype.isTag = function (index) {
        return !this.isText(index);
    };
    /**
     * Returns the text (without markup tags)
     */
    Highlighter.prototype.text = function () {
        var result = '';
        for (var i = 0; i < this.textAndTags.length; i++) {
            if (this.isText(i)) {
                result += this.textAndTags[i];
            }
        }
        return result;
    };
    /**
     * Populates the `pieces` array with strings that represent either HTML tags or visible text
     */
    Highlighter.prototype.split = function () {
        var left = 0;
        var match;
        while ((match = Highlighter._tagRegex.exec(this._html)) != null) {
            var leftOfMatch = this._html.substring(left, match.index);
            if (leftOfMatch) {
                this.textAndTags.push(leftOfMatch);
            }
            var tag = match[0];
            this.textAndTags.push(tag);
            left = Highlighter._tagRegex.lastIndex;
        }
        var tail = this._html.substring(left, this._html.length);
        if (tail) {
            this.textAndTags.push(tail);
        }
    };
    Highlighter._tagRegex = new RegExp('<[^>]*>', 'igm');
    return Highlighter;
}());
/**
 * Provides `next` and `peek` functions; the next function returns the next text
 * character (skipping HTML tags) and the peek function returns the next 'n' text
 * characters without advancing the character iterator
 */
var HtmlTextIterator = (function () {
    function HtmlTextIterator(entryText) {
        this.entryText = entryText;
        /**
         * The current index in the textAndTags array
         */
        this.currentIndex = 0;
        /**
         * The current string index for textAndTags[currentIndex]
         */
        this.currentStringIndex = 0;
    }
    HtmlTextIterator.prototype.reset = function () {
        this.currentIndex = this.currentStringIndex = 0;
    };
    /**
     * Returns the next text (non-tag) character, or null once we've reached the end of the HTML
     */
    HtmlTextIterator.prototype.next = function () {
        while (this.currentIndex < this.entryText.textAndTags.length && this.entryText.isTag(this.currentIndex)) {
            this.currentIndex++;
        }
        if (this.currentIndex === this.entryText.textAndTags.length)
            return null;
        var nextCharacter = this.entryText.textAndTags[this.currentIndex][this.currentStringIndex];
        if (nextCharacter) {
            this.currentStringIndex++;
            return nextCharacter;
        }
        else {
            this.currentIndex++;
            this.currentStringIndex = 0;
            return this.next();
        }
    };
    /**
     * Peeks ahead 'howMany' characters, returning the string from the current position to that point,
     * skipping tags
     */
    HtmlTextIterator.prototype.peekText = function (howMany) {
        this.peeker = new HtmlTextIterator(this.entryText);
        this.peeker.currentIndex = this.currentIndex;
        this.peeker.currentStringIndex = this.currentStringIndex;
        var result = '';
        var nxt = '';
        while ((nxt = this.peeker.next()) !== null && result.length < howMany) {
            result += nxt;
        }
        return result;
    };
    return HtmlTextIterator;
}());
