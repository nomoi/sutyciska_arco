"use strict";

const makeCodesCtx = imports => {

	const {morphCtx} = imports;

	// NIhO/NOhI is both a magic word and a head
	// The type is merely the value stored in the below table
	// The "identation level" is calculated by counting the number of NIhO/NOhI which follow it
	// These trailing cmavo are given STATE.PARAGRAPH_SEP_TAIL

	const TYPE = {
		__PRIMITIVE:	0,
		UNK: 		1,
		CMEVLA: 	2,
		SPACE:		3,
		Y: 		5,
		__MAGIC:	10,
		LA:		11,
		ZO:		12,
		BU:		13,
		SI:		14,
		ZAhE:		15,
		ZOI:		16,
		LAhO:		17,
		ZEI:		18,
		LOhU:		19,
		LEhU:		20,
		JOhAU:		21,
		__HEAD:		100,
		I:		101,
		LU:		102,
		LIhU:		103,
		TO:		104,
		TOhI:		105,
		TOI:		106,
		TUhE:		107,
		TUhU:		108,
		ROOT:		109,
		__PARAGRAPH_SEP:110,
		NIhO:		111,
		NOhI:		112
	};

	const WORD = {
		"la":		TYPE.LA,
		"lu":		TYPE.LU,
		"lihu":		TYPE.LIhU,
		"li'u":		TYPE.LIhU,
		"to":		TYPE.TO,
		"tohi":		TYPE.TOhI,
		"to'i":		TYPE.TOhI,
		"toi":		TYPE.TOI,
		"zahe":		TYPE.ZAhE,
		"za'e":		TYPE.ZAhE,
		"zoi":		TYPE.ZOI,
		"la'o":		TYPE.LAhO,
		"laho":		TYPE.LAhO,
		"lohu":		TYPE.LOhU,
		"lo'u":		TYPE.LOhU,
		"lehu":		TYPE.LEhU,
		"le'u":		TYPE.LEhU,
		"jo'au":	TYPE.JOhAU,
		"johau":	TYPE.JOhAU,
		"zo":		TYPE.ZO,
		"bu":		TYPE.BU,
		"si":		TYPE.SI,
		"zei":		TYPE.ZEI,
		"niho":		TYPE.NIhO,
		"ni'o":		TYPE.NIhO,
		"nohi":		TYPE.NOhI,
		"no'i":		TYPE.NOhI,
		"i":		TYPE.I,
		"tu'e":		TYPE.TUhE,
		"tu'u":		TYPE.TUhU,
		"":		TYPE.ROOT
	};

	const BRACKET_LEFT = [
		TYPE.LU,
		TYPE.TO,
		TYPE.TOhI,
		TYPE.TUhE
	];

	const BRACKET_RIGHT = [
		TYPE.LIhU,
		TYPE.TOI,
		TYPE.TUhU
	];

	const SENT_CONTAINED = [
		TYPE.ROOT, // performance reasons
		TYPE.LU,
		TYPE.LIhU,
		TYPE.TO,
		TYPE.TOI,
		TYPE.TOhI,
		TYPE.TUhE,
		TYPE.TUhU
	];

	const MATCHING = {
		[TYPE.LU]: [TYPE.LIhU],
		[TYPE.LIhU]: [TYPE.LU],
		[TYPE.TO]: [TYPE.TOI],
		[TYPE.TOhI]: [TYPE.TOI],
		[TYPE.TOI]: [TYPE.TO, TYPE.TOhI],
		[TYPE.LOhU]: [TYPE.LEhU],
		[TYPE.LEhU]: [TYPE.LOhU],
		[TYPE.TUhE]: [TYPE.TUhU],
		[TYPE.TUhU]: [TYPE.TUhE]
	};

	const NONACTIVE_STATES = {
		PREFORMATTED_QUOTE: "state-preformatted-quote",
		CMENE: "state-cmene",
		MORPH_QUOTE: "state-morph-quote", // also used for letterals
		ERASED: "state-erased",
		PARSER_NAME: "state-parser-name",
		DICTIONARY_NAME: "state-dictionary-name",
		RECOGNIZED_NAME: "state-recognized-name",
		DELIMITER: "state-delimiter",
		LETTERAL: "state-letteral",
		ZEI_COMPOUND: "state-zei-compound"
	};

	const NEUTRAL_STATES = {
		NONCE: "state-nonce"
	};

	const STATE = Object.assign({}, NONACTIVE_STATES, NEUTRAL_STATES);

	const hasAnyClass = (node, classes) =>
		classes.filter(c => node.classList.contains(c)).length > 0;

	const stringToHTML = str => str == '\n' ?
		"<br>" :
		"<span>" + str + "</span>";

	const getType = node => {
		const {textContent} = node;
		if (morphCtx.RE.ALL.SPACE.test(textContent) || node.tagName == "BR") {
			return TYPE.SPACE;
		}

		if (morphCtx.isC(textContent.slice(-1))) {
			return TYPE.CMEVLA;
		}

		const wordCode = WORD[textContent];
		if (wordCode) {
			return wordCode;
		}

		return TYPE.UNK;
	};

	const isMatching = (a, b) => {
		const matchingTypes = MATCHING[getType(a)];
		if (matchingTypes) {
			return matchingTypes.indexOf(getType(b)) > -1;
		}
		return false;
	};

	const getString = node => {
		if (node.tagName == "BR") {
			return '\n';
		}
		return node.textContent;
	};

	const isMagic = node =>
		getType(node) > TYPE.__MAGIC && getType(node) < TYPE.__HEAD;

	const isHead = node =>
		getType(node) > TYPE.__HEAD;

	const isRoot = node => node.textContent == '';

	const isActiveSep = node => {// I or NIhO/NOhI
		const type = getType(node);
		return isActive(node) && (
			type == TYPE.I || type > TYPE.__PARAGRAPH_SEP
		);
	}

	const isForwardFacingMagic = node =>
		isMagic(node) &&
			getType(node) != TYPE.SI &&
			getType(node) != TYPE.BU;

	const isSpace = node =>
		getType(node) == TYPE.SPACE;

	const isActive = node =>
		!hasAnyClass(node, Object.values(NONACTIVE_STATES))

	const isNeutral = node =>
		!hasAnyClass(node, Object.values(STATE));

	const isStable = node =>
		!isSpace(node) && !isMagic(node) && isNeutral(node);

	const isActiveHead = node =>
		isHead(node) && isActive(node);

	const isSentContained = node =>
		SENT_CONTAINED.indexOf(getType(node)) > -1;
	
	const isActiveSentContained = node =>
		isActive(node) && isSentContained(node);

	const isActiveLeftBracket = node =>
		isActive(node) && BRACKET_LEFT.indexOf(getType(node)) > -1;

	const isRightBracket = node =>
		BRACKET_RIGHT.indexOf(getType(node)) > -1;

	const isActiveRightBracket = node =>
		isActive(node) && isRightBracket(node);

	const isGrammarCheckable = node =>
		isActiveHead(node) && !isActiveRightBracket(node) && !isRoot(node);

	const isSpelling = node =>
		getType(node) != TYPE.SPACE && getType(node) != TYPE.CMEVLA && !hasAnyClass(node, Object.values(STATE));

	const isNonspelling = node =>
		!isSpelling(node);

	const clearState = node => {
		const wasStable = isStable(node);
		node.classList.remove(...Object.values(STATE));
		return wasStable;
	}

	const isClickable = node => {
		return node.tagName == "WORD" || node.tagName == "LINK-HEAD";
	}

	// TODO: remove unused
	return {
		getType,
		isMatching,
		getString,
		isHead,
		isRoot,
		isMagic,
		isForwardFacingMagic,
		isSpace,
		isActive,
		isStable,
		isNeutral,
		isActiveHead,
		isSentContained,
		isActiveSentContained,
		isActiveLeftBracket,
		isRightBracket,
		isActiveRightBracket,
		isGrammarCheckable,
		isActiveSep,
		isSpelling,
		isNonspelling,
		clearState,
		isClickable,
		stringToHTML,
		STATE,
		TYPE,
		WORD
	};
};
