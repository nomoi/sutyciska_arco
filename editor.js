"use strict";

const makeEditorCtx = imports => {

	const {arrayCtx, morphCtx, codesCtx, lexingCtx} = imports;

	const makeSelectionArray = () => {
		let sel = window.getSelection();
		return [sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset];
	};

	const setBaseAndExtent = (leftNode, leftOffset, rightNode=leftNode, rightOffset=leftOffset) => {
		const leftPoint = leftNode.tagName == "SPAN" ? [leftNode.firstChild, leftOffset] : [leftNode, 0];
		const rightPoint = rightNode.tagName == "SPAN" ? [rightNode.firstChild, rightOffset] : [rightNode, 0];
		window.getSelection().setBaseAndExtent(...leftPoint, ...rightPoint);
	};

	// returns selection point normalized in the form of [span, charOffset]
	// For textnodes, if the offset is equal to the textContent length, then use next element
	// NOTE: browsers are inconsistent about Ctrl-A and manually selecting everything
	const normalizePoint = (node, offset) => {
		if (node.nodeType == Node.TEXT_NODE) {
			if (offset == node.textContent.length) {
				return [node.parentElement.nextSibling, 0];
			}
			console.assert(offset < node.textContent.length);
			return [node.parentElement, offset];
		}

		if (node.tagName == "BR") {
			return [node, 0];
		}

		// document is `node`

		if (offset >= node.children.length) { // firefox bug
			return [node.lastChild, 0];
		}

		return [node.children[offset], 0];
	};
	
	const getNormalizedSelection = () => {

		const [anchorNode, anchorOffset, focusNode, focusOffset] = makeSelectionArray();
		const anchor = normalizePoint(anchorNode, anchorOffset);
		const focus = normalizePoint(focusNode, focusOffset);

		const isNodeFollowing = anchor[0].compareDocumentPosition(focus[0]) & Node.DOCUMENT_POSITION_FOLLOWING;
		const isOffsetFollowing = anchor[1] < focus[1];
		const isSame = anchor[0] == focus[0];

		if (isNodeFollowing || (isSame && isOffsetFollowing)) {
			return [anchor, focus];
		}

		return [focus, anchor];
	};

	const formFirstRegion = (centerStr, leftNode) => {

		if (!leftNode.previousSibling || leftNode.previousSibling.tagName == "BR") {
			return ['', leftNode];
		}

		if (centerStr[0] == '\n') {
			return ['', leftNode];
		}

		// true for ''
		const isInnerBorderNonspace = morphCtx.RE.IS.NONSPACE.test(centerStr.charAt(0));
		const isOuterBorderNonspace = morphCtx.RE.IS.NONSPACE.test(leftNode.previousSibling.textContent.slice(-1));

		if (!isOuterBorderNonspace || !isInnerBorderNonspace) {
			return ['', leftNode];
		}

		// isOuterBorderNonpace && isInnerBorderNonpace

		const isPrevWord = node => morphCtx.RE.ALL.NONSPACE.test(node.previousSibling.textContent);
		let currentNode = leftNode;
		let preStr = '';

		while (currentNode.previousSibling && isPrevWord(currentNode)) {
			currentNode = currentNode.previousSibling;
			preStr = codesCtx.getString(currentNode) + preStr;
		}

		return [preStr, currentNode];
	};

	// returns preStr, baseNode
	const formLastRegion = (centerStr, rightNode) => {

		// unsure about this
		if (rightNode.tagName == "BR") {
			return ['', rightNode];
		}

		if (centerStr.slice(-1) == '\n') {
			return ['', rightNode];
		}

		const isInnerBorderNonspace = morphCtx.RE.IS.NONSPACE.test(centerStr.slice(-1));
		const isOuterBorderNonspace = morphCtx.RE.IS.NONSPACE.test(rightNode.nextSibling.textContent.charAt(0));

		if (!isOuterBorderNonspace || !isInnerBorderNonspace) {
			return ['', rightNode.nextSibling];
		}

		const isNextWord = node => morphCtx.RE.ALL.NONSPACE.test(node.nextSibling.textContent);
		let currentNode = rightNode;
		let postStr = '';

		while (currentNode.nextSibling && isNextWord(currentNode)) {
			currentNode = currentNode.nextSibling;
			postStr += codesCtx.getString(currentNode);
		}

		currentNode = currentNode.nextSibling;

		return [postStr, currentNode];
	};

	const indexOf = node => {

		let children = node.parentElement.children;

		let lower = -1;
		let middle;
		let upper = children.length;

		while (lower + 1 != upper) {
			middle = (lower + upper) >> 1;

			if (!(node.compareDocumentPosition(children[middle]) & Node.DOCUMENT_POSITION_PRECEDING)) {
				upper = middle;
			} else {
				lower = middle;
			}
		}
		return node == children[upper] ? upper : -1;
	};

	// TODO: make a generalized selectionBetween or selectUntil
	const makeRemovedStrings = (firstNode, baseNode) => {
		const removedStrings = [];

		let current = firstNode;

		while (current != baseNode) {
			removedStrings.push(codesCtx.getString(current));
			current = current.nextSibling;
		}

		return removedStrings;
	};

	class Editor {

		constructor(runner) {
			this.runner = runner;

			this.historyEntries = new Array(100);
			this.historyIndex = 0;

			this.previousSelectionArray = makeSelectionArray();
		}

		updateSelection(selectionArray) {
			let sel = window.getSelection();
			sel.setBaseAndExtent(...selectionArray);
			this.previousSelectionArray = makeSelectionArray();
		}

		// @public
		// called AFTER change is made
		// TODO: if identical to previous do not change: see if this stops the needing to triple ctrl-z after pasting problem
		// should also obviate need for wasDefaultPrevented in input... print whether a mutation request is redundant
		mutateHistory(index, removedStrings, addedStrings) {

			let previousSelectionArray = this.previousSelectionArray;
			let nextSelectionArray = makeSelectionArray();

			if (arrayCtx.isEqualShallow(previousSelectionArray, nextSelectionArray) && removedStrings.length == 0 && addedStrings.length == 0) {
				console.log("skipped empty history mutate");
				return;
			}

			this.historyEntries[this.historyIndex] = {
				previousSelectionArray,
				nextSelectionArray,
				index,
				removedStrings,
				addedStrings,
				selector: {
					undo: () => {
						this.updateSelection(previousSelectionArray);
					},
					redo: () => {
						this.updateSelection(nextSelectionArray);
					}
				}
			}

			if (this.historyIndex + 1 == this.historyEntries.length) {
				this.historyEntries.shift();
			} else {
				this.historyIndex++;

				for (let i = this.historyIndex; i < this.historyEntries.length; i++) {
					delete this.historyEntries[i];
				}
			}

			this.previousSelectionArray = makeSelectionArray();
		}

		// @public
		undo() {
			if (this.historyIndex == 0) {
				return;
			}

			let entry = this.historyEntries[--this.historyIndex];
			let {index, removedStrings, addedStrings} = entry;

			this.runner.begin(index, addedStrings.length, removedStrings);

			entry.selector.undo();
		}

		// @public
		redo() {
			if (this.historyIndex + 1 == this.historyEntries.length) {
				return;
			}

			if (!this.historyEntries[this.historyIndex]) { // ???
				return;
			}

			let entry = this.historyEntries[this.historyIndex++];

			let {index, removedStrings, addedStrings} = entry;

			this.runner.begin(index, removedStrings.length, addedStrings);

			entry.selector.redo();
		}

		growSelectionLeft() {

			let [[leftNode, leftOffset], [rightNode, rightOffset]] = getNormalizedSelection();

			leftOffset--;

			if (leftOffset == -1) {
				if (leftNode.previousSibling) {
					leftNode = leftNode.previousSibling;
					leftOffset = leftNode.textContent.length-1;
				} else {
					leftOffset = 0;
				}
			}

			setBaseAndExtent(leftNode, leftOffset, rightNode, rightOffset);
		}

		growSelectionRight() {

			let [[leftNode, leftOffset], [rightNode, rightOffset]] = getNormalizedSelection();

			rightOffset++;

			if (rightOffset > rightNode.textContent.length) {
				if (rightNode.nextSibling) {
					rightNode = rightNode.nextSibling;
					rightOffset = 0;
				} else {
					rightOffset = rightNode.textContent.length-1;
				}
			}

			setBaseAndExtent(leftNode, leftOffset, rightNode, rightOffset);
		}

		// note: currently using debugger in Firefox will break everything by treating reconstructed textnodes as firstChildren
		replaceSelected(str) {

			console.assert(typeof str == "string", "str is invalid");

			const [[leftNode, leftOffset], [rightNode, rightOffset]] = getNormalizedSelection();
			const preCenterStr = leftNode.textContent.slice(0, leftOffset);
			const postCenterStr = rightNode.textContent.slice(rightOffset);
			const centerStr = preCenterStr + str + postCenterStr;

			// not sure if this makes sense when leftNode == rightNode and offset is 0
			const [preStr, firstNode] = formFirstRegion(centerStr, leftNode);
			const [postStr, baseNode] = formLastRegion(centerStr, rightNode);

			console.log([preStr, preCenterStr, str, postCenterStr, postStr], [firstNode, baseNode]);

			const addedStrings = lexingCtx.tokenize(preStr + centerStr + postStr);
			const removedStrings = makeRemovedStrings(firstNode, baseNode);

			const index = indexOf(firstNode);

			this.runner.begin(index, removedStrings.length, addedStrings);

			let scanningNode = baseNode;
			let charOffsetFromEnd = postCenterStr.length + postStr.length;

			while (charOffsetFromEnd > 0) {
				scanningNode = scanningNode.previousSibling;
				charOffsetFromEnd -= codesCtx.getString(scanningNode).length;
			}

			setBaseAndExtent(scanningNode, -charOffsetFromEnd);

			const [[newLeftNode, ], ] = getNormalizedSelection();

			if (newLeftNode.tagName === "BR" && newLeftNode.nextSibling === null) { // it's the final <BR>, so scroll to bottom
				const editorContainer = this.runner.editorNode.parentElement;
				editorContainer.scrollTop = editorContainer.scrollHeight;
			} else {
				const dummy = document.createElement('span'); // need to create dummy in case newLeftNode is a <BR>
				dummy.innerHTML = "&nbsp;";
				newLeftNode.parentElement.insertBefore(dummy, newLeftNode);
				dummy.scrollIntoView({behavior: "instant", block: "nearest", inline: "nearest"});
				dummy.remove();
			}

			this.mutateHistory(index, removedStrings, addedStrings);
		}
	}

	return {
		Editor
	};
};
