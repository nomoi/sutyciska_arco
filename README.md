la sutyciska
============

lojbo ve ciska bo proga i ti jarco po'o versiio i loza'i jorne la'o gy localhost gy cu sarcu fi tau la guglkrom je la kromiiym

SutyCiska
=========

A Lojban text editor.

* [Live Demo](https://nomoi.github.io/sutyciska_arco/)
* [Video Demonstration](https://vimeo.com/263987528)

Features
--------
* Support for multiple Lojban parsers and dialects
* Automatic spelling and grammar check (handles all "magic words")
* Live HTML output with recursive dictionary look-up
* Handles deep structural nesting (see [CLL.19](https://lojban.github.io/cll/19/1/)) that would crash an ordinary PEG parser
* Updates only the smallest changed region for fast performance

Running locally
---------------
Due to web worker restrictions, connecting to localhost is necessary when running in google chrome or chromium.
