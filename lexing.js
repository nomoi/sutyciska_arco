"use strict";

const makeLexingCtx = imports => {

	const {morphCtx} = imports;
	const {CMAVO} = morphCtx.RE.GLOBAL;

	function processCmavoAndBrivla(region) {

		// TODO: replace with ZOI content interleaving step to handle URLs
		if (region.startsWith("org") || region.startsWith("com") || region.startsWith("net")) {
			return [region];
		}

		const cmavo = [];

		let match;
		let prevLastIndex = 0;

		CMAVO.lastIndex = 0;
		while (match = CMAVO.exec(region)) {
			if (prevLastIndex != match.index) {
				break;
			}
			cmavo.push(region.slice(match.index, CMAVO.lastIndex));
			prevLastIndex = CMAVO.lastIndex;
		}

		if (prevLastIndex < region.length) {
			cmavo.push(region.slice(prevLastIndex));
		}

		const copy = [...cmavo];

		while (!morphCtx.isBrivla(copy[copy.length-1]) && copy.length > 1) {
			copy[copy.length-2] += copy.pop();
		}

		if (morphCtx.isBrivla(copy[copy.length-1])) {
			return copy;
		}

		// otherwise, since there is no brivla, return all the cmavo

		return cmavo;
	}

	function regionize(str) {
		
		const WB = morphCtx.RE.GLOBAL.WORD_BOUNDARIES;
		const regions = [];

		let match;
		let prevIndex = 0;

		WB.lastIndex = 0;
		while (match = WB.exec(str)) {
			const region = str.slice(prevIndex, match.index+1);
			regions.push(region);
			prevIndex = match.index+1;
		}

		regions.push(str.slice(prevIndex));

		return regions;
	}

	function tokenize(str) {

		if (str.length == 0) {
			return [];
		}

		const regions = regionize(str);

		// estimating length to avoid fragmentation
		let tokenIndex = 0;
		let tokens = new Array(regions.length * 4);

		for (let i = 0; i < regions.length; i++) {
			if (morphCtx.RE.HAS.SPACE.test(regions[i])) { // separating \n into tokens
				const chunks = regions[i].split(/(\s|\.)/).filter(x => x.length > 0);
				for (let chunk of chunks) {
					tokens[tokenIndex++] = chunk;
				}
			} else if (morphCtx.isC(regions[i].slice(-1))) {
				tokens[tokenIndex++] = regions[i];
			} else {
				for (let token of processCmavoAndBrivla(regions[i])) {
					tokens[tokenIndex++] = token;
				}
			}
		}

		tokens.length = tokenIndex;

		return tokens;
	}

	return {
		tokenize
	};
};

if (typeof module !== "undefined" && module.exports) {
	module.exports = makeLexingCtx;
}
