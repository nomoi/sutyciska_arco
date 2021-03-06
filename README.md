SutyCiska
=========

A text editor for the [Lojban](https://en.wikipedia.org/wiki/Lojban) language.

* [Live Demo](https://nomoi.github.io/sutyciska_arco/)
* [Video Demonstration](https://vimeo.com/263987528)

Features
--------
* Support for multiple Lojban parsers and dialects.
* Automatic spelling and grammar check (handles all "magic words").
* Live HTML output with recursive dictionary look-up.
* Handles deep structural nesting (see [CLL.19](https://lojban.github.io/cll/19/1/)) that would crash an ordinary PEG parser.
* Updates only the smallest changed region for fast performance.

Running locally
---------------
Open `index.html` in your browser. Serving from localhost is necessary in chrome and chromium.
