"use strict";

/**
 * Lojban morphology predicates.
 * Note about CBM: cmevla and brivla are defined here as mutually exclusive.
 */
const makeMorphCtx = () => {

	const RE = {
		ALL: {
			SPACE:		/^[.\s]+$/,
			NONSPACE:	/^[^.\s]+$/
		},
		HAS: {
			SPACE:		/[.\s]/,
			FORBIDDEN_PAIR:	/cx|kx|xc|xk|mz|[cjsz]{2}/
		},
		IS: {
			SPACE:		/^[.\s]$/,
			NONSPACE:	/^[^.\s]$/,
			VOWEL:		/^[aeiou]$/, // V
			CONSONANT:	/^[bcdfgjklmnprstvxzwq]$/, // C (qw included because of foreign quoting)
			VOICED:		/^[bdgvrzjn]$/,
			UNVOICED:	/^[ptkflscmx]$/,
			VALID_VOICING_PAIR:	/^([lmnrbdgvjz]{2}|[lmnrptkfcsx]{2})$/, // valid voicing pairs
			TWO_DIPHTHONG:		/^(ai|ei|oi|au|ia|ie|ii|io|iu|ua|ue|ui|uo|uu)$/, // VV
			RAFSI_TWO_DIPHTHONG:	/^(ai|ei|oi|au)$/, // restrictions for when VV occurs in rafsi 
			THREE_DIPHTHONG:	/^[aeiou]['h][aeiou]$/,
			VALID_INITIAL_CONSONANT_PAIR: new RegExp(
				'^(bl|br|cf|ck|cl|cm|cn|cp|cr|ct|dj|dr|dz|fl|fr|gl|gr|' +
				'jb|jd|jg|jm|jv|kl|kr|ml|mr|pl|pr|sf|sk|sl|sm|sn|sp|' +
				'sr|st|tc|tr|ts|vl|vr|xl|xr|zb|zd|zg|zm|zv)$') // CC; CxC defined by function instead
		},
		START: {
			CONSONANTS: /^[bcdfgjklmnprstvxz]*/,
		},
		END: {
			VOWELS: /[aeiou]*$/,
		},
		GLOBAL: { // used with .exec to iterate over strings
			// recognizes contiguous cmavo (and letterals) without spaces between
			// currently a heuristic since a sequence of contiguous cmavo can only START with one ybu/y'y max
			CMAVO: /([bcdfgjklmnprstvxz]?[aeiou]{1,2}(['h][aeiou]{1,2})*)|([bcdfgjklmnprstvxz]y)|ybu|y['h]y/g,
			WORD_BOUNDARIES: /([.\s](?=[^.\s]))|([^.\s](?=[.\s]))/g,
		}
	};

	const isV = s => RE.IS.VOWEL.test(s);
	const isC = s => RE.IS.CONSONANT.test(s);
	const isCC = s => RE.IS.VALID_INITIAL_CONSONANT_PAIR.test(s);
	const isVV = s => RE.IS.TWO_DIPHTHONG.test(s) || RE.IS.THREE_DIPHTHONG.test(s);

	const isCxC = s => 
		s.length == 2 &&
		s[0] != s[1] && isC(s[0]) && isC(s[1]) &&
		RE.IS.VALID_VOICING_PAIR.test(s[0] + s[1]) && !RE.HAS.FORBIDDEN_PAIR.test(s[0] + s[1]); 

	const isCxCC = s =>
		s.length == 3 &&
		isCxC(s[0] + s[1]) &&
		isCC(s[1] + s[2]);

	const isRafsiCVV = s => 
		isC(s[0]) &&
		(RE.IS.RAFSI_TWO_DIPHTHONG.test(s.slice(1)) || // not VV
		RE.IS.THREE_DIPHTHONG.test(s.slice(1)));

	const isRafsiCVC = s => 
		s.length == 3 &&
		isC(s[0]) && isV(s[1]) && isC(s[2]);

	const isRafsiCCV = s =>
		s.length == 3 &&
		isCC(s[0] + s[1]) && isV(s[2]);

	const isRafsiCCxC = s => 
		s.length == 3 &&
		isCC(s[0] + s[1]) && isCxC(s[1] + s[2]);

	const isRafsiCCVC = s => 
		s.length == 4 &&
		isCC(s[0] + s[1]) && isV(s[2]) && isC(s[3]);

	const isRafsiCVCxC = s => 
		s.length == 4 &&
		isC(s[0]) && isV(s[1]) && isCxC(s[2] + s[3]);

	const isRafsiCCVCV = s =>
		s.length == 5 &&
		isRafsiCCVC(s.slice(0, 4)) && isV(s.charAt(4));

	const isRafsiCVCxCV = s =>
		s.length == 5 &&
		isRafsiCVCxC(s.slice(0, 4)) && isV(s.charAt(4));

	const isGismu = s =>
		isRafsiCCVCV(s) || isRafsiCVCxCV(s);

	const isCharAlpha = c => isV(c) || isC(c) || c == "'" || c == 'h' || c == 'y';
	const isCharPrintable = c => isCharAlpha(c.toLowerCase()) || RE.IS.SPACE.test(c);
	const isCharVoiced = c => RE.IS.VOICED.test(c);
	const isCharUnvoiced = c => RE.IS.UNVOICED.test(c);

	/** checks string for valid consonant pair within first five characters */
	const hasIntroConsonantPair = s => {

		const chars = s.split('').filter(c => isV(c) || isC(c)).slice(0, 6);

		for (let i = 0; i < chars.length - 1; i++) {
			if (isCxC(chars[i] + chars[i+1])) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Determines whether given string is a valid lujvo.
	 * Allows extra 'r' and 'n' hyphens after first rafsi,
	 * so long as 'n' is only used where 'r' is invalid. 
	 */
	const isLujvo = (() => {

		const getCVVLength = s => {

			if (isRafsiCVV(s.slice(0, 3))) {
				return 3;
			}

			if (isRafsiCVV(s.slice(0, 4))) {
				return 4;
			}

			return -1;
		}

		// can probably be turned into a REGEX (esp. if CxC checking is done elsewhere)
		const recurse = s => {

			if (s.length == 0) {
				return true;
			}

			const len = getCVVLength(s);

			if (len > -1) {
				if ((s[len] == 'r' && s[len+1] != 'r') || (s[len] == 'n' && s[len+1] == 'r')) {
					if (recurse(s.slice(len+1))) {
						return true;
					}
				}

				return recurse(s.slice(len));
			}

			if (isRafsiCVC(s.slice(0, 3)) || isRafsiCCV(s.slice(0, 3))) {
				return recurse(s.slice(3));
			}

			return false;
		}

		const recurseFinal = s => {

			if (isRafsiCCV(s.slice(-3)) || isRafsiCVV(s.slice(-3))) {
				if (recurse(s.slice(0, -3))) {
					return true;
				}
			}

			if (isRafsiCVV(s.slice(-4))) {
				if (recurse(s.slice(0, -4))) {
					return true;
				}
			}

			if (isGismu(s.slice(-5))) {
				if (recurse(s.slice(0, -5))) {
					return true;
				}
			}

			return false;
		};

		const recurseMedial = s => {

			if (isRafsiCVC(s.slice(-3))) {
				if (recurse(s.slice(0, -3))) {
					return true;
				}
			}

			if (isRafsiCVCxC(s.slice(-4)) || isRafsiCCVC(s.slice(-4))) {
				if (recurse(s.slice(0, -4))) {
					return true;
				}
			}

			if (isZihevlaRafsi(s)) {
				return true;
			}

			return false;
		};

		const splitStep = s => {

			// zihevla rafsi and 4rafsi end in 'y'
			const yparts = s.split('y');
			const last = yparts.pop();

			if (!recurseFinal(last)) {
				// allows it be zi'evla if it isn't alone
				if (!isZihevlaForm(last)) {
					return false;
				}

				if (yparts.length === 0) {
					return false;
				}

				for (let part of yparts) {
					if (!isRafsi(part)) {
						return false;
					}
				}

				return true;
			}

			for (let part of yparts) {
				if (!recurseMedial(part)) {
					return false;
				}
			}

			return true;
		};

		return s => {

			if (s.length < 6) {
				return false;
			}

			if (isC(s.slice(-1))) {
				return false;
			}

			// r/n hyphen can appear iff:
			// 1. it is directly after the first rafsi
			// 2. the rafsi is CVV

			const len = getCVVLength(s);

			// needs a hyphen letter: 'r' or 'n'
			if (len > -1) {

				// eg: {ceibla}, regular case
				if (isRafsiCCV(s.substr(len))) {
					return true;
				}

				// eg: {soirsai}, necessary initial hyphen
				if ((s[len] == 'r' && s[len+1] != 'r') || (s[len] == 'n' && s[len+1] == 'r')) {
					if (splitStep(s.slice(len+1))) {
						return true;
					}

					// eg: {ku'arkydicka'u}, zi'evla lujvo w/ initial hyphen
					const yparts = s.split('y');
					const first = yparts.shift();

					if (yparts.length > 0 && isZihevlaRafsi(first)) {
						if (splitStep(yparts.join('y'))) {
							return true;
						}
					}
				}

				return false;
			}

			return splitStep(s);
		}
	})();

	const isZihevlaRafsi = s => {

		if (isV(s.slice(-1))) {
			return false;
		}

		if (s.indexOf('y') > -1) {
			return false;
		}

		if (!hasIntroConsonantPair(s)) {
			return false;
		}

		const initialConsonants = s.match(RE.START.CONSONANTS).toString();

		if (initialConsonants.length > 3) {
			return false;
		}

		if (initialConsonants.length == 3 && !isCxCC(initialConsonants)) {
			return false;
		}

		if (initialConsonants.length == 2 && !isCC(initialConsonants)) {
			return false;
		}
		
		return true;
	};

	const isRafsi = s => 
		isRafsiCVV(s) ||
		isRafsiCVC(s) ||
		isRafsiCCV(s) ||
		isRafsiCCxC(s) ||
		isRafsiCCVC(s) ||
		isRafsiCVCxC(s) ||
		isRafsiCCVCV(s) ||
		isRafsiCVCxCV(s) ||
		isZihevlaRafsi(s);

	// does not consider slinkuhi or being other class
	const isZihevlaForm = s => {

		const trailingVowels = s.match(RE.END.VOWELS).toString();

		if (trailingVowels.length == 0) {
			return false;
		}

		return isZihevlaRafsi(s.slice(0, -trailingVowels.length));
	};

	/**
	 * Determines whether a string will form a word if CV is prepended to it
	 * e.g. {cricfoi}.
	 * Such strings cannot be words since conjoined cmavo are ambiguous
	 * e.g. {cicricfoi}.
	 */
	const isSlinkuhi = s => {
		if (isV(s.charAt(0))) {
			return false;
		}
		return isLujvo('zo' + s) || isGismu('zo' + s);
	}

	/** Determines whether a string is morphologically fuhivla. */
	const isZihevla = s => {
		return isZihevlaForm(s) && !isSlinkuhi(s) && !isLujvo(s) && !isGismu(s);
	}

	/** Determines whether a string is a valid brivla */
	const isBrivla = s => {

		if (isGismu(s)) {
			return true;
		}

		if (isLujvo(s)) {
			return true;
		}
		
		if (isZihevlaForm(s) && !isSlinkuhi(s)) {
			return true;
		}

		return false;
	};

	// TODO: implement
	const isCmevla = s => {
		throw "not implemented";
	};

	/**
	 * Used to wrap exported functions with general checks for brivla and cmevla morphology.
	 * For performance, interal calls to functions do not run these checks.
	 * @private
	 * @param {Function} fn - Predicate to be wrapped (first argument will be used for checks)
	 * @return {Function}
	 */
	function wrapCheck(fn) {

		return (...args) => {

			const s = args[0];

			if (RE.HAS.SPACE.test(s)) {
				return false;
			}

			for (let i = 0; i < s.length - 1; i++) {
				if (isC(s[i]) && isC(s[i+1]) && !isCxC(s[i] + s[i+1])) {
					return false;
				}
			}

			return fn(...args);
		}
	}

	return {
		RE,
		isC,
		isV,
		isCxC,
		isRafsiCVV,
		isRafsiCVC,
		isRafsiCCV,
		isRafsiCCxC,
		isRafsiCCVC,
		isRafsiCVCxC,
		isRafsiCVCxCV,
		isRafsiCCVCV,
		isCharAlpha,
		isCharPrintable,
		isGismu,
		isLujvo: wrapCheck(isLujvo),
		isZihevla: wrapCheck(isZihevla),
		isBrivla: wrapCheck(isBrivla),
		isCmevla: wrapCheck(isCmevla),
		isSlinkuhi
	};
};

if (typeof module !== "undefined" && module.exports) {
	module.exports = makeMorphCtx;
}
