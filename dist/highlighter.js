/**
 * Highlights text on a web page
 */
var Highlighter = (function () {
    function Highlighter(_html, className) {
        this._html = _html;
        /**
         * Elements in the array represent either text which is visible on the page, or an HTML tag (either opening or closing)
         */
        this.textAndTags = [];
        this.class = 'qp-highlight';
        this.split();
        if (className)
            this.class = className;
    }
    /**
     * Given the string of HTML provided to the constructor, this function surrounds text that matches `str` with span
     * elements having a class of "this.class"
     */
    Highlighter.prototype.highlight = function (term) {
        var iterator = new HtmlTextIterator(this);
        var nxt;
        term = term.toLowerCase();
        while ((nxt = iterator.next()) !== null) {
            if (nxt.toLowerCase() === term[0].toLowerCase()) {
                var restOfStringLower = iterator.peekText(term.length - 1).toLowerCase();
                if (restOfStringLower === term.substring(1)) {
                    var insertions = 0;
                    // If the end of the 'str' match is in the same text node, the span markup insertion is simple
                    if (iterator.peeker.currentIndex === iterator.currentIndex) {
                        this.insertMarkup(iterator.currentIndex, iterator.currentStringIndex - 1, iterator.peeker.currentStringIndex - 1);
                        insertions++;
                    }
                    else {
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
    Highlighter.prototype.reset = function () {
        this.textAndTags.length = 0;
        this.split();
    };
    Highlighter.prototype.insertMarkup = function (pieceIndex, stringIndexStart, stringIndexEnd) {
        var piece = this.textAndTags[pieceIndex];
        var left = piece.substring(0, stringIndexStart);
        var middle = piece.substring(stringIndexStart, stringIndexEnd);
        var right = piece.substring(stringIndexEnd, piece.length);
        this.textAndTags.splice(pieceIndex, 1, left, "<span class=\"" + this.class + "\">", middle, '</span>', right);
    };
    Highlighter.prototype.isText = function (index) {
        return this.textAndTags[index].length == 0 || this.textAndTags[index][0] !== '<';
    };
    Highlighter.prototype.isTag = function (index) {
        return !this.isText(index);
    };
    /**
     * Gets a boolean value indicating whether the text element at the specified index has, as its parent (direct ancestor), a tag with the given tag name.
     * This is used to preventing modifying script tag contents
     */
    Highlighter.prototype.isTagContentFor = function (tagName, index) {
        var node = this.textAndTags[index];
        var prev = this.textAndTags[index - 1];
        return prev && this.isTag(index - 1) && prev.substring(1, 7).toLowerCase() === tagName;
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
     * When attempting to find a string match in the DOM, we have to remove newline and whitespace that are omitted by
     * layout engines; this mimcs innerText, as opposed to textContent (see https://kellegous.com/j/2013/02/27/innertext-vs-textcontent/)
     */
    Highlighter.removeWhitespaceFromTextContentPerLayoutRules = function (content) {
        var lines = content.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var firstNonWhitespaceIndex = 0;
            while (line[firstNonWhitespaceIndex] === ' ')
                firstNonWhitespaceIndex++;
            if (firstNonWhitespaceIndex) {
                if (i === 0 && firstNonWhitespaceIndex >= 1) {
                    lines[0] = ' ' + line.substring(firstNonWhitespaceIndex);
                }
                else
                    lines[i] = line.substring(firstNonWhitespaceIndex);
            }
        }
        return lines.join(' ');
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
                this.textAndTags.push(Highlighter.removeWhitespaceFromTextContentPerLayoutRules(leftOfMatch));
            }
            var tag = match[0];
            this.textAndTags.push(tag);
            left = Highlighter._tagRegex.lastIndex;
        }
        var tail = this._html.substring(left, this._html.length);
        if (tail) {
            this.textAndTags.push(Highlighter.removeWhitespaceFromTextContentPerLayoutRules(tail));
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
        while (this.currentIndex < this.entryText.textAndTags.length && (this.entryText.isTag(this.currentIndex) || this.entryText.isTagContentFor('script', this.currentIndex))) {
            // Skips elements that represent tags or script blocks 
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
