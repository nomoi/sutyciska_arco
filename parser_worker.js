"use strict";

const CONTAINERS = ['selbri', 'sumti', 'term', 'free', 'tag', 'bu_clause', 'si_clause', 'ZOI_clause', 'any_word'];

const ZANTUFA_ELEMENTS = ['BRIVLA'];
const ILMENTUFA_ELEMENTS = ['zohoi_word'];
const ELEMENTS = ['gismu', 'lujvo', 'fuhivla', 'cmevla', 'zoi_word'].concat(ZANTUFA_ELEMENTS).concat(ILMENTUFA_ELEMENTS);

const HEAD = ['LU', 'LIhU', 'TO', 'TOI'];
const DELETE = ['spaces', 'initial_spaces'];

/* This function returns the string resulting from the recursive concatenation
 * of all the leaf elements of the parse tree argument (except node names). */
// "join_leaves" or "flatten_tree" might be better names.
function join_expr(n) {

	if (n.length < 1) {
		return "";
	}

	var s = "";
	var i = Array.isArray(n[0]) ? 0 : 1;

	while (i < n.length) {
		s += (typeof n[i] == "string") ? n[i] : join_expr(n[i]);
		i++;
	}

	return s;
}

function is_selmaho(v) {
	if (typeof v !== "string") {
		return false;
	}

	return (0 == v.search(/^[IUBCDFGJKLMNPRSTVXZ]?([AEIOUY]|(AI|EI|OI|AU))(h([AEIOUY]|(AI|EI|OI|AU)))*$/g));
}

// fi'e la .ilmen.
function process_parse_tree(parse_tree, value_substitution_map, name_substitution_map, node_action_for, must_prefix_leaf_labels) {

	if (parse_tree.length == 0) {
		return null;
	}

	var action = node_action_for(parse_tree);

	if (action == 'DEL') {
		return null;  // Deleting the current branch.
	}

	var has_name = typeof parse_tree[0] == "string";

	// Getting the value replacement for this node, if any.
	var substitution_value = (has_name) ? value_substitution_map[parse_tree[0]] : undefined;

	if (has_name) {
		if (action == 'TRIM') {
			/* If there's a value replacement for this node, we return it instead of the node's content. */
			if (typeof substitution_value !== 'undefined') {
				return substitution_value;
			}
			/* Otherwise the first step of a trim action is to remove the node name. */
			parse_tree.splice(0, 1);
			has_name = false;
		} else {
			/* No trimming, so let's see if the node name is in the renaming list. If so, let's rename it accordingly. */
			var v = name_substitution_map[parse_tree[0]];

			if (typeof v !== 'undefined') {
				parse_tree[0] = v;
			}

			/* If there's a value replacement for this node, it becomes the unique value for the node. */
			if (typeof substitution_value !== 'undefined') {
				return [parse_tree[0], substitution_value];
			}
		}
	}

	if (action == 'FLAT') {
		/* 
		 * Flattening action. All the terminal nodes of the branch are concatenated,
		 * and the concatenation result replaces the branch's content, alongside the node name if any.
		 * If the concatenation result is empty, the branch becomes empty.
		 */

		var r = join_expr(parse_tree);

		if (has_name && r != "") {
			if (must_prefix_leaf_labels) {
				return parse_tree[0] + ':' + r;
			} else {
				return [parse_tree[0], r];
			}
		} else if (has_name) {
			return parse_tree[0];
		} else {
			return r;
		}

	} else if (action == 'TRIMFLAT') {
		return join_expr(parse_tree);
	}

	/* Now we'll iterate over all the other elements of the current node. */

	var i = has_name ? 1 : 0;
	while (i < parse_tree.length) {
		if (Array.isArray(parse_tree[i])) {
			/* Recursion */
			parse_tree[i] = process_parse_tree(
					parse_tree[i],
					value_substitution_map,
					name_substitution_map,
					node_action_for,
					must_prefix_leaf_labels
					);
		}

		/* The recursion call on the current element might have set it to null as a request for deletion. */
		if (parse_tree[i] === null) {
			parse_tree.splice(i, 1);
		} else {
			i += 1;  // No deletion, so let's go to the next element.
		}
	}

	/* 
	 * Now we've finished iterating over the node elements. Let's proceed to the final steps.
	 * If 'must_prefix_leaf_labels' is set and the node has a name and contains at least one other element, we append ':' to its name.
	 * If the node is empty, we return null as a signal for deletion.
	 * If the node contains only one element and we want to trim the node, it gets replaced by its content. 
	 */

	if (i == 0) {
		return null;
	} else if (i == 1 && action != 'PASS') {
		return parse_tree[0];
	} else if (must_prefix_leaf_labels && i == 2 && has_name && typeof parse_tree[1] == "string") {
		if (!parse_tree[1].includes(":")) {
			return parse_tree[0] + ':' + parse_tree[1];
		} else {
			parse_tree[0] += ":";
		}
	}

	return parse_tree;
}

function node_action_for(tree) {

	const name = tree[0];
	const has_name = typeof name == "string";

	if (has_name) {
		if (CONTAINERS.indexOf(name) > -1) { // save these from being trimmed/flattened/deleted
			return "PASS";
		}

		if (tree.length == 1 || DELETE.indexOf(name) > -1) { // eliminates empty 'initial_spaces'
			return "DEL";
		}

		if (is_selmaho(name) || ELEMENTS.indexOf(name) > -1) {
			return "FLAT";
		}
	}

	return 'TRIM';
}

function simplify(tree) {
	console.assert(Array.isArray(tree) && tree[0] == "text");
	return process_parse_tree(tree, {}, {}, node_action_for, false) || ['text', ['initial_spaces', '']];
}

// used to remove the {i} which is prepended to all parsed sentences
function shiftFirstWord(tree) {

	while (typeof tree[1] != "string") {
		if (Array.isArray(tree[0])) {
			tree = tree[0];
		} else {
			tree = tree[1];
		}
	}

	return tree.splice(0, 2);
}

const build = tree => {

	if (tree.length == 0) {
		return tree;
	}

	if (Array.isArray(tree[0])) {
		return tree.map(build).reduce((a, b) => a.concat(b));
	}

	if (typeof tree[1] == 'string') {
		if (HEAD.indexOf(tree[0]) > -1) {
			return [
			{
				outerHTML: "<link-head-temp>"
			},
			{
				outerHTML: tree[1],
				hasTextContent: true
			},
			{
				outerHTML: "</link-head-temp>",
				isRightTag: true
			}
			];
		}

		return [
		{
			outerHTML: "<word data-type='" + tree[0] + "'>"
		},
		{
			outerHTML: tree[1],
			hasTextContent: true,
		},
		{
			outerHTML: "</word>",
			isRightTag: true
		}
		];
	}

	return [
	{
		outerHTML: "<" + tree[0] + ">"
	},
	...tree.slice(1).map(build).reduce((a, b) => a.concat(b)),
	{
		outerHTML: "</" + tree[0] + ">",
		isRightTag: true
	}
	];
};

const convert = tree => {
	simplify(tree);
	shiftFirstWord(tree);
	const linearXML = build(tree);
	return linearXML;
};

function isLexingEquivalent(converted, tokens) {
	const convertedWords = converted
		.filter(x => x.hasTextContent)
		.map(x => x.outerHTML);

	const tokensWords = tokens.filter(x => x.search(/\w/) > -1);

	if (convertedWords.length !== tokensWords.length) {
		console.log(converted);
		console.log(convertedWords, tokensWords);
		return false;
	}

	for (let i = 0; i < tokensWords.length; i++) {
		if (tokensWords[i] !== convertedWords[i]) {
			return false;
		}
	}

	return true;
}

const makeSpacesHTML = str => "<spaces>" + str + "</spaces>";

const interleave = (converted, tokens) => {

	let lastRightTag = {outerHTML: ''};
	const rtn = [lastRightTag];

	for (let item of converted) {
		rtn.push(item);
		if (item.isRightTag) {
			lastRightTag = item;
		} else if (item.hasTextContent) {
			while (tokens[0] != item.outerHTML) {
				lastRightTag.outerHTML += makeSpacesHTML(tokens.shift()); // will be WS
			}
			tokens.shift();
		}
	}

	while (tokens.length > 0) {
		lastRightTag.outerHTML += makeSpacesHTML(tokens.shift());
	}

	return rtn;
};

// easier to convert into XML as soon as possible?

self.onmessage = function(event) {
	const [parserName, tokens] = event.data;

	if (eval("typeof " + parserName) === "undefined") {
		importScripts("/parsers/" + parserName + ".js");
	}

	try {
		const unshiftedTokens = ["i"].concat(tokens); // will fix inputs like "babo klama"
		const rawOutput = eval(parserName + ".parse(unshiftedTokens.join(''))");
		const converted = convert(rawOutput);

		if (!isLexingEquivalent(converted, tokens)) {
			throw new Error("vlakorfa'i srera");
		}

		const interleaved = interleave(converted, tokens);
		postMessage({
			hasError: false,
			xml: interleaved.map(x => x.outerHTML).join('')
		});
	} catch(exception) {
		postMessage({
			hasError: true,
			errorMessage: exception.message,
			errorOffset: exception.offset
		});
	}
};
