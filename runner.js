"use strict";

const makeRunnerCtx = imports => {

	function getNextMode(mode) {
		if (mode == "zmiku") {
			return "macnu";
		} else if (mode == "macnu") {
			return "sutra";
		}
		return "zmiku";
	}

	function clearHighlight() {
		const lastHighlighted = document.querySelectorAll(".steps-hl");
		for (let node of lastHighlighted) {
			const names = [...node.classList];
			for (let name of names) {
				if (name.startsWith("steps-hl")) {
					node.classList.remove(name);
				}
			}
		}
	}

	function applyHighlight(index, highlightedNodes) {
		if (index <= 2) {
			const endNode = highlightedNodes.slice(-1)[0];
			console.assert(endNode !== undefined);
			let currentNode = highlightedNodes[0];
			while (currentNode !== endNode) {
				currentNode = currentNode.nextSibling;
				if (currentNode !== null && highlightedNodes.indexOf(currentNode) < 0) {
					currentNode.classList.add("steps-hl", "steps-hl-between-" + index);
				}
			}
			for (let node of highlightedNodes) {
				if (node !== null) {
					node.classList.add("steps-hl", "steps-hl-" + index);
				}
			}
		} else {
			for (let node of highlightedNodes) {
				if (node !== null) {
					node.classList.add("steps-hl", "steps-hl-" + index);
				}
			}
		}
	}

	class Runner {

		constructor(editorNode, dispatcher) {
			this.editorNode = editorNode;
			this.dispatcher = dispatcher;

			this.isStepping = false;
			this.index = 0;
			this.mode = "zmiku";
			this.nextStepArgs = null;
			this.displayData = {};

			this.timeout = null;
			this.hooks = [];
		}

		runHooks() {
			for (let hook of this.hooks) {
				hook(this.isStepping, this.index, this.mode);
			}
		}

		next() {
			if (!this.isStepping) {
				return false;
			}

			if (this.dispatcher.isIndexEnd(this.index)) {
				this.isStepping = false;
				this.editorNode.dataset.currentStepIndex = "finished";
				this.runHooks();

				return false;
			}

			const [highlightedNodes, nextStepArgs] = this.dispatcher.run(this.index, this.nextStepArgs);

			this.displayStepIndex(this.index);
			this.runHooks();

			applyHighlight(this.index, highlightedNodes);

			this.nextStepArgs = nextStepArgs;
			this.index++;

			return true;
		}

		finish() {
			window.clearTimeout(this.timeout);
			while (this.next()) {}
			this.index = 0;
			this.isStepping = false;
		}

		reset() {
			this.finish();
			clearHighlight();
		}

		switchMode() {
			this.reset();
			this.mode = getNextMode(this.mode);
			this.runHooks();
		}

		displayStepIndex(index) {
			this.editorNode.dataset.currentStepIndex = index;
		}

		begin(index, n, strings) {
			const definitionRoot = document.querySelector("#definition-root");
			definitionRoot.firstElementChild.innerHTML = "";
			const spellcheckNode = document.querySelector("#spellcheck-node");
			spellcheckNode.classList.remove("active");

			this.reset();
			this.isStepping = true;
			this.nextStepArgs = {index, n, strings};

			if (this.mode == "zmiku") {
				while (this.next()) {}
			} else if (this.mode == "sutra") {
				this.next(); // so that there is no initial pause
				this.timeout = window.setInterval(() => {
					if (!this.next()) {
						window.clearTimeout(this.timeout);
					}
				}, 500);
			} else {
				this.next();
			}
		}

		addHook(fn) {
			this.hooks.push(fn);
		}
	}

	return {
		Runner
	};
};
