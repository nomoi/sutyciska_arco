"use strict";

const makeLinksCtx = imports => {
	const {codesCtx} = imports;
	const {TYPE, STATE} = codesCtx;

	const getNextNonspace = (currentNode) => {
		do {
			currentNode = currentNode.nextSibling;
		} while (currentNode && codesCtx.isSpace(currentNode))
		return currentNode;
	};

	const getNextNonspaceWhileClearingState = (currentNode) => {
		do {
			currentNode = currentNode.nextSibling;
			if (currentNode && codesCtx.isSpace(currentNode)) {
				codesCtx.clearState(currentNode);
			}
		} while (currentNode && codesCtx.isSpace(currentNode))
		return currentNode;
	};

	const updateStack = (() => {
		// predicates for **incomplete** stages of magic words
		const isZO = (comp) => {
			return codesCtx.getType(comp[0]) == TYPE.ZO && comp.length == 1;
		};

		// uses order of checks to ensure it is not actually ZO etc
		const isLA = comp => codesCtx.getType(comp[0]) == TYPE.LA;
		const isLAhO = comp => codesCtx.getType(comp[0]) == TYPE.LAhO;
		const isZOI = comp => codesCtx.getType(comp[0]) == TYPE.ZOI;
		const isLOhU = comp => codesCtx.getType(comp[0]) == TYPE.LOhU;
		const isJOhAU = comp => codesCtx.getType(comp[0]) == TYPE.JOhAU;
		const isROOT = comp => codesCtx.getType(comp[0]) == TYPE.ROOT;
		const isZEI = comp => codesCtx.getType(comp[comp.length-1]) == TYPE.ZEI;

		const handleSingleNext = (comp, node, ...classes) => {
			node.classList.add(...classes);
			comp.push(node);
			return true;
		};

		// will consume entire document if unclosed
		const handleDelimitedQuote = (comp, node, ...classes) => {
			const leftDelimNode = comp[1];
			comp.push(node);

			// start delimiter
			if (!leftDelimNode) {
				node.classList.add(STATE.DELIMITER);
				return false;
			}

			// contained word
			if (node.textContent != leftDelimNode.textContent) {
				node.classList.add(...classes); // still needs to apply classes incrementally
				return false;
			}

			// end delimiter
			let currentNode = leftDelimNode.nextSibling;
			while (currentNode != node) { // should work since lastChild is never node
				currentNode.classList.add(...classes);
				currentNode = currentNode.nextSibling;
			}

			node.classList.add(STATE.DELIMITER);
			return true;
		};

		const handleROOT = (stack, node) => {
			stack.push([node]);
			return !codesCtx.isForwardFacingMagic(node);
		};

		const handleCompleteComp = (stack, comp, node) => {
			if (codesCtx.getType(node) == TYPE.SI) {
				comp.push(node);
				stack.pop().forEach(x => x.classList.add(STATE.ERASED));
				return true; // it's the compound before `comp` (if there is one) that is assumed complete
			}

			if (codesCtx.getType(node) == TYPE.BU) {
				comp.forEach(x => x.classList.add(STATE.LETTERAL));
				comp.push(node);
				return true;
			}

			if (codesCtx.getType(node) == TYPE.ZEI) {
				comp.push(node);
				comp.forEach(x => x.classList.add(STATE.ZEI_COMPOUND));
				return false;
			}

			stack.push([node]); // start new compound

			return !codesCtx.isMagic(node); // non-magic will already be known as complete
		};

		const handleIncompleteComp = (comp, node) => {
			if (isZEI(comp)) {
				return handleSingleNext(comp, node, STATE.ZEI_COMPOUND);
			}

			if (isLA(comp)) {
				return handleSingleNext(comp, node, STATE.CMENE);
			}

			if (isZO(comp)) {
				return handleSingleNext(comp, node, STATE.MORPH_QUOTE);
			}

			if (isLOhU(comp)) {
				comp.push(node);
				if (codesCtx.getType(node) == TYPE.LEhU) {
					return true;
				}
				node.classList.add(STATE.MORPH_QUOTE);
				return false;
			}

			if (isJOhAU(comp)) {
				const parserNameNode = getNextNonspace(comp[0]);
				comp.push(node);
				if (parserNameNode != node) {
					node.classList.add(STATE.DICTIONARY_NAME);
					return true;
				}
				node.classList.add(STATE.PARSER_NAME);
				return false;
			}

			if (isLAhO(comp)) {
				return handleDelimitedQuote(comp, node, STATE.CMENE);
			}

			if (isZOI(comp)) {
				return handleDelimitedQuote(comp, node, STATE.PREFORMATTED_QUOTE);
			}

			console.assert(false, "did not match anything");
		};

		return (stack, node, wasComplete) => {
			console.assert(codesCtx.isNeutral(node));
			console.assert(stack.length > 0);
			const comp = stack[stack.length-1];

			if (comp.length == 0) { // [[]] stackBasisNode
				console.assert(stack.length == 1);
				comp.push(node);
				return true;
			}

			if (isROOT(comp)) {
				return handleROOT(stack, node);
			}

			if (wasComplete) {
				return handleCompleteComp(stack, comp, node);
			}

			return handleIncompleteComp(comp, node);
		};
	})();

	// assumes the #editor initially has correct state
	class Links {
		constructor(editorNode) {
			console.assert(typeof editorNode != "undefined");

			this.editorNode = editorNode;

			this.rootNode = { // virtual node
				textContent: '',
				nodeType: 1,
				classList: {
					add: () => undefined,
					contains: () => false,
					remove: () => false
				},
				get nextSibling() {
					return editorNode.firstChild;
				}
			};
		}

		getRootNode() {
			return this.rootNode;
		}

		// consider keepting direct reference to node
		getDoctype() {
			const parserNameNode = this.editorNode.querySelector('.'+STATE.PARSER_NAME);
			const dictionaryNameNode = this.editorNode.querySelector('.'+STATE.DICTIONARY_NAME);
			return {
				parserName: parserNameNode ? parserNameNode.textContent : '',
				dictionaryName: dictionaryNameNode ? dictionaryNameNode.textContent : ''
			};
		}

		setDoctypeValidity(bool) {
			const parserNameNode = this.editorNode.querySelector('.'+STATE.PARSER_NAME);
			const dictionaryNameNode = this.editorNode.querySelector('.'+STATE.DICTIONARY_NAME);
			if (parserNameNode) {
				parserNameNode.classList.toggle(STATE.RECOGNIZED_NAME, bool);
			}
			if (dictionaryNameNode) {
				dictionaryNameNode.classList.toggle(STATE.RECOGNIZED_NAME, bool);
			}
		}

		// seeks the first AH before at and before the specified node
		getLastActiveHead(currentNode) {
			console.assert(currentNode);

			while (currentNode && !codesCtx.isActiveHead(currentNode)) {
				currentNode = currentNode.previousSibling;
			}

			return currentNode ? currentNode : this.rootNode;
		}

		// does not include the affectedEnd
		*iterate(startHead, affectedEnd=null) {
			let currentNode = startHead;

			while (currentNode != affectedEnd) {

				const head = currentNode;
				const tail = [];

				console.assert(codesCtx.isActiveHead(head), "head was not index of active link");

				currentNode = currentNode.nextSibling;
				while (currentNode != null && !codesCtx.isActiveHead(currentNode)) {
					tail.push(currentNode);
					currentNode = currentNode.nextSibling;
				}

				yield [head, tail];
			}
		}

		iterateSkipFirst(startActiveHead) {
			if (!startActiveHead) debugger;
			const iterator = this.iterate(startActiveHead, null);
			iterator.next();
			return iterator;
		}

		// special behavior of backup up to root if in first link
		getPreviousStableNode(currentNode) {
			do {
				currentNode = currentNode.previousSibling;
			} while (currentNode != null && !codesCtx.isStable(currentNode))

			if (currentNode == null) {
				return this.rootNode;
			}

			return currentNode;
		}

		isBefore(endNode, currentNode) {
			if (currentNode == this.rootNode) {
				return false;
			}
			const bitmask = endNode.DOCUMENT_POSITION_FOLLOWING;
			const num = endNode.compareDocumentPosition(currentNode) & bitmask;
			return Boolean(num);
		}

		// returns deleted nodes
		mutateNodes(index, n, strings) {
			const {children} = this.editorNode;
			const deletedNodes = [];

			const html = strings.map(codesCtx.stringToHTML).join("");

			for (let i = 0; i < n; i++) { // last <br> will never be deleted
				console.log("deleting", children[index]);
				deletedNodes.push(children[index]);
				children[index].remove();
			}

			const endNode = children[index];

			endNode.insertAdjacentHTML("beforebegin", html);

			const deletedActiveHeads = deletedNodes.filter(codesCtx.isActiveHead);

			return deletedActiveHeads;
		}

		/**
		 * Mutate the stored compounds.
		 * On client: receives the editorNode references directly as 3rd parameter
		 * On server: Server receives strings, which it converts to HTMLSpans or some mock with classList capabilities
		 * Returns active heads that have gone offline/been removed.
		 * @return {Token[Set]} Removed AL.
		 */
		updateMagicWords(startNode, endNode) {
			console.assert(startNode && endNode);

			let stackBasisNode = startNode; // active nonspace and not magic type

			let stack = [[]];
			const activeHeads = [];
			let currentNode = stackBasisNode;
			let wasComplete = true;
			// console.log("stack basis", stackBasisNode);
			// once a node becomes comped, it cant be uncomped

			while (currentNode) {

				if (codesCtx.isActiveHead(currentNode)) {
					activeHeads.push(currentNode);
				}

				const wasStable = codesCtx.clearState(currentNode);

				wasComplete = updateStack(stack, currentNode, wasComplete);

				if (this.isBefore(endNode, currentNode)) {
					if (wasStable && codesCtx.isStable(currentNode)) {
						console.log("stopping early", currentNode, currentNode.textContent);
						break;
					}
				}

				if (stack.length == 0) {
					stackBasisNode = this.getPreviousStableNode(stackBasisNode);
					console.log("BACKING UP TO", stackBasisNode);
					stack = [[]];
					wasComplete = true; // always uses a stable node for stackBasis
					currentNode = stackBasisNode;
				} else {
					currentNode = getNextNonspaceWhileClearingState(currentNode);
				}
			}

			const disabledActiveHeads = activeHeads.filter(x => !codesCtx.isActiveHead(x));

			// NOTE: previously startHead was calculated using the first set value of stackBasisNode
			// rather than its current value
			// but this seemed pointless so i changed it

			const startStableNode = stackBasisNode;
			const endStableNode = currentNode;

			return [disabledActiveHeads, startStableNode, endStableNode];
		}
	}

	return {
		Links
	};
};
