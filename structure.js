'use strict';

const makeStructureCtx = imports => {

	const {arrayCtx, codesCtx, Node} = imports;
	const {TYPE, WORD, STATE} = codesCtx;

	const uncoverParent = (editorHead, stack) => {
		if (codesCtx.isActiveSep(editorHead)) {
			if (codesCtx.isActiveSep(stack[stack.length-1])) {
				return stack.pop();
			}

			return null;
		}

		if (codesCtx.isActiveRightBracket(editorHead)) {
			for (let i = stack.length-1; i >= 0; i--) {
				if (codesCtx.isMatching(stack[i], editorHead)) {
					while (stack.length - 1 >= i) {
						stack.pop();
					}
					break;
				}
			}
		}

		return null;
	};

	// shouldn't have to read entire document when chaning jo'au
	// but since stack there is [] it can't find anything on the same level
	class Structure {
		constructor(links, viewerNode) {
			this.links = links;
			this.data = new Map();

			const root = links.getRootNode();
			const viewerHead = viewerNode.querySelector('link-head');
			this.data.set(root, {
				viewerHead,
				parent: null,
				leftSibling: null,
				stack: [],
				version: Symbol()
			});
		}

		updateDataEntry(editorHead, entryData) {
			let entry = this.data.get(editorHead);
			if (!entry) {
				entry = {
					viewerHead: null,
					parent: null,
					leftSibling: null,
					version: Symbol()
				};
				this.data.set(editorHead, entry);
			}
			return Object.assign(entry, entryData);
		}

		getParent(editorHead) {
			const entry = this.data.get(editorHead);
			if (entry && entry.parent) {
				return entry.parent;
			}
			return null;
		}

		getStack(editorHead) {
			const entry = this.data.get(editorHead);
			if (entry && entry.stack) {
				return entry.stack;
			}
			return null;
		}

		// returns reference not copy
		getSubnodes(editorHead) {
			const entry = this.data.get(editorHead);
			if (entry && entry.subnodes) {
				return entry.subnodes;
			}
			return null;
		}

		// stores stack after uncover
		// returns hasChangedSentContained in found order
		updateHierarchy(removedActiveHeads, startActiveHead) {

			const stack = [...this.getStack(startActiveHead)];

			if (!codesCtx.isActiveRightBracket(startActiveHead)) { // completing stack
				stack.push(startActiveHead);
			}

			const mutatedActiveHeads = new Set();
			const needsTransfer = new Set();

			// adding parents of removed sent contained nodes
			for (let editorHead of removedActiveHeads) {
				if (codesCtx.isSentContained(editorHead)) {
					const parent = this.getParent(editorHead);
					if (parent !== null) {
						mutatedActiveHeads.add(parent);
					}
				}
			}

			for (let [editorHead, ] of this.links.iterateSkipFirst(startActiveHead)) {

				const leftSibling = uncoverParent(editorHead, stack); // stack is mutated

				this.updateDataEntry(editorHead, {leftSibling});

				const newParent = stack[stack.length-1];
				const oldParent = this.getParent(editorHead);

				if (oldParent !== newParent) {
					this.updateDataEntry(editorHead, {parent: newParent});

					if (codesCtx.isActiveSentContained(editorHead)) {
						if (oldParent !== null) {
							mutatedActiveHeads.add(oldParent);
						}

						mutatedActiveHeads.add(newParent);
					} else if (codesCtx.isActiveHead(editorHead)) {
						needsTransfer.add(editorHead);
					} else {
						throw new Error("got inactive node");
					}
				}

				const oldStack = this.getStack(editorHead);

				if (oldStack !== null && arrayCtx.isEqualShallow(stack, oldStack)) {
					return [mutatedActiveHeads, needsTransfer];
				}

				this.updateDataEntry(editorHead, { // stack is saved before completion
					stack: [...stack]
				});

				if (!codesCtx.isActiveRightBracket(editorHead)) { // completing stack
					stack.push(editorHead);
				}
			}

			return [mutatedActiveHeads, needsTransfer];
		}

		getNewActiveHeads(startActiveHead) {
			const newActiveHeads = new Set();
			for (let [editorHead, _] of this.links.iterateSkipFirst(startActiveHead)) {	
				if (this.isNew(editorHead)) {
					newActiveHeads.add(editorHead);
				} else {
					break;
				}
			}

			return newActiveHeads;
		}

		makeEngagedActiveHeads(mutatedActiveHeads, removedActiveHeads, startActiveHead, newActiveHeads) {

			const newNoRightBrackets = [...newActiveHeads].filter(x => !codesCtx.isActiveRightBracket(x));
			const union = new Set([...mutatedActiveHeads, ...newNoRightBrackets]);

			for (let editorHead of removedActiveHeads) {
				union.delete(editorHead);
			}

			if (codesCtx.isActiveRightBracket(startActiveHead)) {
				union.add(this.getParent(startActiveHead));
			} else {
				union.add(startActiveHead);
			}

			const engagedActiveHeads = Array.from(union);

			return engagedActiveHeads.sort((a, b) => {
				try {
					if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) {
						return -1;
					} else {
						return 1;
					}
				} catch(e) { // root node is not an element so it will throw
					if (codesCtx.isRoot(b) && a) {
						return 1; // root should always come first
					} else if (codesCtx.isRoot(a) && b) {
						return -1; // root should always come first
					} else { // real error occurred
						throw e;
					}
				}
			});
		}

		findUpdateTerminal(engagedActiveHeads) {

			const topLevel = this.getStack(engagedActiveHeads[0]).length;

			const topHeads = engagedActiveHeads.filter(x => {
				const stack = this.getStack(x);
				return stack.length === topLevel;
			}); // eh use for loop for perf

			const lastTop = topHeads.slice(-1)[0];

			const lastTopStack = this.getStack(lastTop);

			// until level of scope returns to same as lastTopDecrufted
			for (let [editorHead, ] of this.links.iterateSkipFirst(lastTop, null)) {
				const stack = this.getStack(editorHead);
				if (lastTopStack.length === stack.length) {
					return editorHead;
				}
			}

			return null;
		}

		isNew(editorHead) {
			const entry = this.data.get(editorHead);
			if (!entry) debugger;
			return entry.viewerHead === null;
		}

		isRequiringChangedSubnodes(engagedActiveHeads, editorHead) {
			if (editorHead === null) {
				return false;
			}

			if (engagedActiveHeads.indexOf(editorHead) > -1) {
				return true;
			}

			return this.isNew(editorHead) && !codesCtx.isActiveRightBracket(editorHead);
		}

		// would like to replace .subnodes with a procedure
		// but it's inefficient to do it individually
		// better to do from firstParsed to UT
		makeSubnodes(engagedActiveHeads, firstEngagedActiveHead, updateTerminal) {
			const newSubnodes = new Map();

			for (let [editorHead, tail] of this.links.iterate(firstEngagedActiveHead, updateTerminal)) {

				if (this.isRequiringChangedSubnodes(engagedActiveHeads, editorHead)) {
					newSubnodes.set(editorHead, tail);
				}

				if (codesCtx.isActiveSentContained(editorHead)) {

					const entry = this.data.get(editorHead);

					if (this.isRequiringChangedSubnodes(engagedActiveHeads, entry.parent)) {
						const parentSubnodes = newSubnodes.get(entry.parent);

						if (!parentSubnodes) {
							debugger;
						}

						parentSubnodes.push(editorHead);

						if (codesCtx.isActiveRightBracket(editorHead)) {
							for (let node of tail) {
								parentSubnodes.push(node);
							}
						}
					}
				}
			}

			return newSubnodes;
		}

		updateSubnodes(newSubnodes) {
			for (let [editorHead, subnodes] of newSubnodes) {
				this.updateDataEntry(editorHead, {
					version: Symbol(),
					subnodes
				});
			}
		}

		// only needed for step interface to cancel timeouts at earlier keyframes
		refreshNodeVersionOfParents(editorHeads) {
			for (let editorHead of editorHeads) {
				console.assert(codesCtx.isHead(editorHead));
				const entry = this.data.get(editorHead);
				if (!entry) {
					console.log("no entry for", editorHead);
					continue;
				}
				console.assert(entry.parent);
				this.updateDataEntry(entry.parent, {version: Symbol()});
			}
		}

		makeHeadHTML(editorHead) {
			console.assert(codesCtx.isActiveHead(editorHead), editorHead + " is not active link");
			return "<link-head>" + editorHead.textContent + "</link-head>";
		}

		makeSentTailInnerHTML(tail) {
			const tailStr = tail.map(x =>
				x.tagName == "BR" ?
				"<br>" :
				x.textContent
			).join('');
			return "<port>" + tailStr + "</port>";
		}

		makeTailHTML(editorHead, tail) {
			console.assert(codesCtx.isActiveHead(editorHead), editorHead + " is not active link");
			console.assert(!codesCtx.isRoot(editorHead)); // should only have to run makeSentTailInnerHTML

			let html = this.makeSentTailInnerHTML(tail);

			if (!codesCtx.isActiveRightBracket(editorHead)) {
				html = "<sent>" + html + "</sent>";

				if (codesCtx.isActiveLeftBracket(editorHead)) {
					html = "<text>" + html + "</text>";
				}
			}

			return html;
		}

		getNodeVersion(editorHead) {
			const entry = this.data.get(editorHead);
			if (entry) {
				return entry.version;
			}
			return null;
		}

		getFirstContainedSent(editorHead) {
			const entry = this.data.get(editorHead);
			let el = entry.viewerHead.nextSibling;
			if (el.tagName != "SENT") {
				el = el.querySelector('sent');
			}
			return el;
		}

		getSentContainedParentNode(editorHead) {
			const entry = this.data.get(editorHead);
			if (entry.parent) {
				return this.getFirstContainedSent(entry.parent);
			}
			console.assert(codesCtx.isRoot(editorHead));
			return null;
		}

		getSentLevelPrevNode(editorHead) {
			const entry = this.data.get(editorHead);

			if (entry.leftSibling) {
				const {viewerHead} = this.data.get(entry.leftSibling);
				const {nextSibling} = viewerHead;
				return nextSibling;
			}

			// it is the link directly following its parent
			return this.getFirstContainedSent(entry.parent);
		}

		// only creates the first gap
		createHead(editorHead, tail) {

			const entry = this.data.get(editorHead);

			if (codesCtx.isActiveSentContained(editorHead)) {
				const el = this.getSentContainedParentNode(editorHead);
				const html = this.makeHeadHTML(editorHead) + this.makeTailHTML(editorHead, tail);
				el.insertAdjacentHTML("beforeend", html);
				entry.viewerHead = el.lastChild.previousSibling;
			} else {
				const el = this.getSentLevelPrevNode(editorHead);
				const html = this.makeHeadHTML(editorHead) + this.makeTailHTML(editorHead, tail);
				el.insertAdjacentHTML("afterend", html);
				entry.viewerHead = el.nextSibling;
			}
		}

		decruftHead(editorHead, tail) {
			const sent = this.getFirstContainedSent(editorHead);
			const clone = sent.cloneNode(false); // create shallow copy (w/o children)
			clone.innerHTML = this.makeSentTailInnerHTML(tail);
			sent.parentNode.replaceChild(clone, sent);
		}

		appendHead(editorHead, tail) {
			const entry = this.data.get(editorHead);
			const el = this.getSentContainedParentNode(editorHead);

			if (codesCtx.isActiveLeftBracket(editorHead)) {
				const tailNode = entry.viewerHead.nextSibling;
				el.appendChild(entry.viewerHead);
				el.appendChild(tailNode);
			} else { // right bracket
				console.assert(codesCtx.isActiveRightBracket(editorHead));
				el.appendChild(entry.viewerHead);

				// has to remake temp node since last parse
				const html = this.makeTailHTML(editorHead, tail);
				el.insertAdjacentHTML("beforeend", html);
			}
		}

		transferHead(editorHead) {
			const entry = this.data.get(editorHead);
			const el = this.getSentLevelPrevNode(editorHead);

			el.insertAdjacentElement("afterend", entry.viewerHead.nextSibling);
			el.insertAdjacentElement("afterend", entry.viewerHead);
		}

		// engagedActiveHeads includes sAH, hasChangedSentContained, but not new
		// hasChangedSentContained will already contained some new if needed
		updateDOM(engagedActiveHeads, firstEngagedActiveHead, updateTerminal) {

			for (let [editorHead, tail] of this.links.iterate(firstEngagedActiveHead, updateTerminal)) {

				const entry = this.data.get(editorHead);
				const isNew = entry.viewerHead == null;

				// engagedActiveHeads shouldn't contain new nodes
				// actually there needs to be some overlap right since if a newly inserted node
				// is the parent of another newly inserted node
				// the parent needs to be in engagedActiveHeads so that the child knows to append itself
				// issue is that decrufting now is really about just rebuilding it when its parent changed
				if (isNew) {
					this.createHead(editorHead, tail);
				} else {
					if (engagedActiveHeads.indexOf(editorHead) > -1) { // could keep unsorted set for this
						this.decruftHead(editorHead, tail);
					}

					if (codesCtx.isActiveSentContained(editorHead)) {
						if (engagedActiveHeads.indexOf(entry.parent) > -1) {
							this.appendHead(editorHead, tail);
						}
					} else {
						// just assume that it has been moved (can be optimized)
						this.transferHead(editorHead);
					}
				}
			}
		}

		performTransfers(needsTransfer) {
			for (let editorHead of needsTransfer) {
				this.transferHead(editorHead);
			}
		}

		getViewerHeads(editorHead) {
			const viewerHeads = [];
			for (let node of this.data.get(editorHead).subnodes) {
				if (codesCtx.isActiveSentContained(node)) {
					const entry = this.data.get(node);
					viewerHeads.push(entry.viewerHead);
				}
			}
			return viewerHeads;
		}

		getInnerDocuments(editorHead) {
			const entry = this.data.get(editorHead);
			const {subnodes} = entry;
			const innerDocuments = [];
			for (let node of subnodes) {
				if (codesCtx.isActiveLeftBracket(node)) {
					const entry = this.data.get(node);
					if (!entry) debugger;
					const {nextSibling} = entry.viewerHead;
					innerDocuments.push(nextSibling);
				}
			}
			return innerDocuments;
		}

		clearRemoveActiveHeads(removedActiveHeads) {
			for (let editorHead of removedActiveHeads) {
				const entry = this.data.get(editorHead);

				if (!entry) {
					continue;
				}

				this.data.delete(editorHead);

				if (entry.viewerHead) {
					if (!codesCtx.isRightBracket(editorHead)) {
						entry.viewerHead.nextSibling.remove();
					}

					entry.viewerHead.remove();
				}
			}
		}
	}

	return {
		Structure
	};
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = StructureCtx;
}
