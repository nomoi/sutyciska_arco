"use strict";

const makeProcessingCtx = imports => {

	const {morphCtx, codesCtx, document} = imports;

	// TODO: move this to morph or make new ctx
	const preprocess = (() => {

		const normalize = s => s
			.replace(/’/gm, "'")
			.replace(/·/gm, ".")
			.replace(/[�áàâä]/g, "A")
			.replace(/[éèêë]/g, "E")
			.replace(/[�íìîïĭị]/g, "I")
			.replace(/[�óòôö]/g, "O")
			.replace(/[úùûüŭụw]/g, "U")
			.replace(/[ýỳŷÿ]/g, "Y");

		return s => {

			console.assert(typeof s.valueOf() === 'string', "wrong input type");

			let rtn = '';

			for (let c of s) {
				if (morphCtx.isCharPrintable(c.toLowerCase()) || c == ":" || c == "/" || /\d/.test(c)) {
					rtn += c;
				}
			}

			return rtn;
		};
	})();

	function convertInteger(x) {
		const NUMERALS = MAPPING.TRANSLITERATION.NUMERALS;
		return x.toString(10).map(c => NUMERALS[c]).join('');
	}

	function convertDate(string) {
		let date = new Date(string);
		return [date.getFullYear(), (date.getMonth() + 1), date.getDate()].map(convertInteger).join(" pi'e ");
	}

	function encodeTitle(string) {
		return encodeURIComponent(string.replace(/ /g, '-').replace(/'/g, 'h'));
	}

	function decodeTitle(string) {
		return decodeURIComponent(string).replace(/h/g, "'").replace(/-/g, ' ');
	}

	// spelling errors are handled separately to avoid flickering
	function clearEditorError(subnodes) {
		if (!subnodes) debugger;
		for (let i = 0; i < subnodes.length; i++) {
			const node = subnodes[i];
			delete node.dataset.errorPoint;
			delete node.dataset.parserError;
			node.removeAttribute("title"); // for err msg
		}
	}

	function setEditorError(subnodes, result) {
		let offsetCount = 1;
		let isErrorPointFound = false;

		for (let i = 0; i < subnodes.length; i++) {
			const node = subnodes[i];
			node.dataset.parserError = true;
			node.title = result.errorMessage;
			offsetCount += codesCtx.getString(node).length;
			if (offsetCount >= result.errorOffset && !isErrorPointFound) {
				for (let j = i; j >= 0; j--) { // find last non-br node
					if (subnodes[j].tagName != "BR") {
						subnodes[j].dataset.errorPoint = true;
						isErrorPointFound = true;
						break;
					}
				}
			}
		}
	}

	function makeIterator(sent, tagNames) {
		return document.createNodeIterator(sent, NodeFilter.SHOW_ELEMENT, {
			acceptNode(node) {
				if (tagNames.indexOf(node.tagName) > -1) {
					return NodeFilter.FILTER_ACCEPT;
				}

				return NodeFilter.FILTER_REJECT;
			}
		});
	}

	function replaceLinkHeads(sent, subnodes, viewerHeads) {
		const iterator = makeIterator(sent, ["WORD", "SPACES", "LINK-HEAD-TEMP"]);

		let index = 0;
		let child;
		while (child = iterator.nextNode()) {
			if (codesCtx.isActiveHead(subnodes[index++])) {
				const parent = child.parentNode;
				parent.replaceChild(viewerHeads.shift(), child);
			}
		}
	}

	function copySpellingErrors(sent, subnodes, viewerHeads) {
		const iterator = makeIterator(sent, ["WORD", "SPACES", "LINK-HEAD"]);

		let index = 0;
		let child;
		while (child = iterator.nextNode()) {
			if (subnodes[index++].dataset.spellingError) {
				child.classList.add("spelling-error");
			}
		}
	}

	function reinsertInnerDocuments(sent, subnodes, innerDocuments) {
		const iterator = makeIterator(sent, ["WORD", "SPACES", "LINK-HEAD"]);

		let index = 0;
		let child;

		const baseNodes = [];

		while (child = iterator.nextNode()) {
			if (codesCtx.isActiveLeftBracket(subnodes[index++])) {
				baseNodes.push(child);
			}
		}

		let documentIndex = 0;

		for (let child of baseNodes) {
			const parent = child.parentNode;
			const innerDocument = innerDocuments[documentIndex++];
			parent.insertBefore(innerDocument, child.nextSibling);
		}
	}

	function evaluateText(sent) {
		const iterator = makeIterator(sent, ["WORD", "SPACES", "LINK-HEAD", "SI_CLAUSE", "ANY_WORD", "BU_CLAUSE"]);

		let child;
		while (child = iterator.nextNode()) {
			if (["si_clause", "any_word", "bu_clause"].indexOf(child.tagName.toLowerCase()) > -1) {
				child.classList.add("erased");
			}

			if (child.dataset.type == "BAhE") {
				child.parentNode.classList.add("emphasized");
			} else if (child.innerHTML == '\n') {
				const br = document.createElement("br");
				child.parentNode.replaceChild(br, child);
			}
		}
	}

	function displayPredications(sent, predication) {
		console.log(sent, predication);

		const {selbri, terms} = predication;
		if (selbri == "pixra" && terms[0] == "dei" && terms[1] !== undefined) {
			const img = document.createElement("img");
			img.src = terms[1];
			sent.innerHTML = "";
			img.style.width = "50%";

			if (predication.invert) {
				img.style.filter = "invert(100%)";
			}

			sent.appendChild(img);
		}
	}

	function extractOrdinal(term) {
		const tags = ["fa", "fe", "fi", "fo", "fu"];
		if (term.firstChild.dataset.type == "FA") {
			return tags.indexOf(term.firstChild.textContent);
		}
		return null;
	}

	function assignTermToPredication(value, ordinal, predication) {
		if (ordinal !== null) {
			predication.terms[ordinal] = value;
		} else {
			for (let i = 0; i < predication.terms.length; i++) {
				if (predication.terms[i] === undefined) {
					predication.terms[i] = value;
					return;
				}
			}
		}
	}

	function evaluatePredicates(sent) {

		const predication = {
			selbri: null,
			invert: false,
			terms: new Array(5)
		}

		const terms = [...sent.children].filter(x => x.tagName == "TERM");
		const selbri = sent.querySelector("selbri");

		if (!selbri) {
			return;
		}

		// basic procedure:
		// first iterate over terms and assign them to their slot via their FA tag
		// when one without a tag is found assign it to the earliest unoccupied slot
		// then iterate over contents of selbri and switch slots based on SE occurences

		for (let term of terms) {
			const ordinal = extractOrdinal(term);
			const sumti = term.querySelector("sumti");

			if (!sumti) {
				continue;
			}

			if (sumti.textContent == "dei") {
				assignTermToPredication("dei", ordinal, predication);
				continue;
			}

			if (sumti.firstChild.textContent == "la'e") {
				const subsumti = sumti.querySelector("sumti");
				if (subsumti && subsumti.firstChild.tagName == "ZOI_CLAUSE") {
					const zoiClauseEls = [...subsumti.firstChild.children].slice(3, -1);
					const text = zoiClauseEls.map(x => x.textContent).join("").trim();
					assignTermToPredication(text, ordinal, predication);
					continue;
				}
			}

			assignTermToPredication(sumti.textContent, ordinal, predication);
		}

		let lastBrivla;
		for (let child of selbri.children) {
			if (morphCtx.isBrivla(child.textContent)) {
				lastBrivla = child;
			}
		}

		if (!lastBrivla) {
			return;
		}

		predication.selbri = lastBrivla.textContent;

		let NAhE = [];
		let SE = [];
		for (let child of selbri.children) {
			if (child.dataset.type == "NAhE") {
				NAhE.push(child.textContent);
			} else if (child.dataset.type == "SE") {
				SE.push(child.textContent);
			} else if (morphCtx.isBrivla(child.textContent) && child !== lastBrivla) {
				NAhE = []; // only record modifiers directly before the last brivla
				SE = [];
			}
		}

		for (let x of NAhE) {
			if (x == "to'e") {
				predication.invert = !predication.invert;
			}
		}

		let x;
		while (x = SE.pop()) {
			const ordinal = [Symbol(), "se", "te", "ve", "xe"].indexOf(x);

			const {terms} = predication;
			[terms[0], terms[ordinal]] = [terms[ordinal], terms[0]];
		}

		displayPredications(sent, predication);
	}

	return {
		preprocess,
		clearEditorError,
		setEditorError,
		replaceLinkHeads,
		copySpellingErrors,
		reinsertInnerDocuments,
		evaluateText,
		evaluatePredicates
	};
};
