// converts a file outputed by format.py

"use strict";

const path = require("path");
const makeMorphCtx = require("../morph.js");
const makeLexingCtx = require("../lexing.js");

const morphCtx = makeMorphCtx();
const lexingCtx = makeLexingCtx({morphCtx});

const filename = process.argv[2];

console.assert(typeof filename === "string");

const data = require(path.join(__dirname, filename));

const converted = {};

for (let word in data) {
	const datam = data[word];
	const {definition} = datam;

	datam.definition = convert(definition);

	const {notes} = datam;
	if (notes && notes.length > 2) {
		datam.notes = convert(notes);
	} else {
		delete datam.notes;
	}
}

function convertSubscript(x) {
	let e = x.split("_");

	if (!(e[0] && e[1])) {
		e = x.split(/(?=\d)/);
	}

	if (e[0] && e[1]) {
		return '<span class="sub-' + e[1] + '">' + e[0] + '<sub>' + e[1] + '</sub></span>';
	}

	return x;
}

// "definition": "$p_1$ boi pixra lo si'o remna kei  $p_3$ boi $p_4=c_2$ noi se canlu",
function convertVariable(x) {

	const subscripts = x.split("=");

	for (let i = 0; i < subscripts.length; i++) {
		subscripts[i] = convertSubscript(subscripts[i]);
	}

	return subscripts.join("=");
}

function convert(string) {
	const result = lexingCtx.tokenize(string).filter(x => /\w/.test(x)).map(x => {
		const variable = x.match(/\$([^$]+)\$/);
		const bracketed = x.match(/{([^}]+)}/); // used in some glosses

		if (variable) {
			if (bracketed) { // something cizra; abort
				return " <i>" + variable[1] + "</i>";
			}

			// &nbsp; is used to prevent variables from being orphaned on the next line
			return "&nbsp;<i>" + convertVariable(variable[1]) + "</i>";
		}

		let classes = [];

		if (bracketed) {
			x = bracketed[1];
			classes.push("gloss-bracket");
		}

		if (!data[x]) {
			classes.push("spelling-error");
		}

		return " <word class='" + classes.join(" ") + "'>" + x + "</word>";
	}).join("");

	// trim leading space
	return result.slice(result.match(/^ |&nbsp;/)[0].length);
}

console.log(JSON.stringify(data, null, 4));
