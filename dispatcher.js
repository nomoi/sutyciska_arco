"use strict";

const makeDispatcherCtx = imports => {

	const {codesCtx} = imports;

	// the step interface is prone to cause problems right now
	// since when a timeout is queued on an editorHead,
	// but that editorHead's chilren are modified in the next moment
	// it doesn't have a way to cancel the previous timeout or request a node version change

	const stepFunctions = [
		// technically this is the result of lexing
		function lexingStep(args) { // startIndex ___ endIndex
			const {index, n, strings} = args;
			console.log("LEXING STEP", args);
			const deletedActiveHeads = this.links.mutateNodes(index, n, strings);

			// only needed for step interface
			this.structure.refreshNodeVersionOfParents(deletedActiveHeads);

			const {children} = this.links.editorNode;
			const startNode = this.links.getPreviousStableNode(children[index]);
			const endNode = children[index + strings.length];

			return [
				[startNode, endNode],
				{deletedActiveHeads, startNode, endNode}
			];
		},

		function magicWordsStep(args) {
			const {deletedActiveHeads, startNode, endNode} = args;
			console.log("MAGIC WORDS STEP", args);
			const result = this.links.updateMagicWords(startNode, endNode);
			const [disabledActiveHeads, startStableNode, endStableNode] = result;
			const removedActiveHeads = deletedActiveHeads.concat(disabledActiveHeads);

			// only needed for step interface
			this.structure.refreshNodeVersionOfParents(disabledActiveHeads);

			return [
				[startStableNode, endStableNode],
				{removedActiveHeads, startStableNode}
			];
		},

		function graphUpdateStep(args) {
			const {removedActiveHeads, startStableNode} = args;
			console.log("GRAPH UPDATE STEP", args);
			const startActiveHead = this.links.getLastActiveHead(startStableNode);

			const [mutatedActiveHeads, needsTransfer] = this.structure.updateHierarchy(removedActiveHeads, startActiveHead);

			const newActiveHeads = this.structure.getNewActiveHeads(startActiveHead);

			// NO RB
			const engagedActiveHeads = this.structure.makeEngagedActiveHeads(mutatedActiveHeads, removedActiveHeads, startActiveHead, newActiveHeads);

			this.structure.clearRemoveActiveHeads(removedActiveHeads);

			const updateTerminal = this.structure.findUpdateTerminal(engagedActiveHeads);

			return [
				[startActiveHead, updateTerminal],
				{engagedActiveHeads, updateTerminal, needsTransfer}
			];
		},

		function viewerUpdateStep(args) {
			console.log("VIEWER UPDATE STEP", args);
			const {engagedActiveHeads, updateTerminal, needsTransfer} = args;

			const firstEngagedActiveHead = engagedActiveHeads[0];
			const subnodes = this.structure.makeSubnodes(engagedActiveHeads, firstEngagedActiveHead, updateTerminal);
			this.structure.updateSubnodes(subnodes);

			this.structure.updateDOM(engagedActiveHeads, firstEngagedActiveHead, updateTerminal);
			this.structure.performTransfers(needsTransfer);

			return [
				engagedActiveHeads,
				{engagedActiveHeads}
			];
		},

		function parsingStep(args) {
			console.log("PARSING STEP", args);
			const {engagedActiveHeads} = args;

			const needsParsed = this.file.updateDoctype(engagedActiveHeads);

			this.validator.check(this.file, needsParsed);

			return [
				needsParsed,
				{needsParsed}
			];
		}
	];

	class Dispatcher {

		constructor(links, structure, file, validator) {
			this.links = links;
			this.structure = structure;
			this.file = file;
			this.validator = validator;

			this.stepFunctions = [this.lexingStep, this.magicWordsStep, this.hierarchyStep, this.viewerStep, this.doctypeStep];
		}

		isIndexEnd(index) {
			return index === this.stepFunctions.length;
		}

		run(index, args) {
			return stepFunctions[index].call(this, args);
		}
	}

	return {
		Dispatcher
	};
}	
