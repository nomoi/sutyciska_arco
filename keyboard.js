"use strict";

const makeKeyboardCtx = imports => {

	const {morphCtx, processingCtx} = imports;

	const setup = (editorNode, editor) => {

		let hToggle = false;
		let showStepsToggle = true;

		editorNode.addEventListener("paste", event => {
			event.preventDefault();
			const rawContent = event.clipboardData.getData("text/plain");
			const content = processingCtx.preprocess(rawContent);
			const delay = 0;
			editor.replaceSelected(content, delay);
		});

		editorNode.addEventListener("cut", event => {
			event.preventDefault();
			document.execCommand('copy');
			const delay = 0;
			editor.replaceSelected('', delay);
		});

		editorNode.addEventListener("keydown", (() => {

			function isKeyModified(event) {
				return event.ctrlKey || event.metaKey || event.altKey;
			}

			function processModKey(event) {
				if (event.ctrlKey) {
					if (event.key == 'h') {
						hToggle = !hToggle;
						return true;
					}

					if (event.key == 's') {
						showStepsToggle = !showStepsToggle;
						const stepsContainer = document.querySelector("#steps-container");
						stepsContainer.style.display = showStepsToggle ?
							"block" :
							"none";
						return true;
					}

					if (event.key == 'z') {
						editor.undo();
						return true;
					}

					if (event.key == 'y') {
						editor.redo();
						return true;
					}

					if (event.key == "i") { // stop CE from making italics
						return true;
					}

					if (event.key == "b") { // stop CE from making bold
						return true;
					}
				}

				return false;
			}

			function processActionKey(event) {
				const sel = window.getSelection();
				switch(event.key) {

					case 'Backspace':

						if (sel.isCollapsed) {
							editor.growSelectionLeft();
						}

						editor.replaceSelected('');
						return true;

					case 'Delete':

						if (sel.isCollapsed) {
							editor.growSelectionRight();
						}

						editor.replaceSelected('');
						return true;

					case 'Enter':
						editor.replaceSelected('\n');
						return true;

					case 'Tab':
						editor.replaceSelected('\t');
						return true;
				}

				return false;
			}

			// returns true if a command was issued to editing
			// this means that event.preventDefault should be called
			function processCommand(event) {
				const sel = window.getSelection();

				if (isKeyModified(event)) {
					return processModKey(event);
				}

				if (processActionKey(event)) {
					return true;
				}

				// maybe an onchange event for the editornode would be a better way of detecting this
				if (morphCtx.isCharPrintable(event.key)) {
					let {key} = event;

					if (key == "h" && !hToggle) {
						key = "'";
					}

					editor.replaceSelected(key);
					return true;
				}

				return false; // allow by default
			}

			return event => {
				if (processCommand(event)) {
					event.preventDefault();
				}
			};
		})());

		// NOTE: can also preventDefault onclick when isStepping

		editorNode.addEventListener("keyup", event => {
			editor.mutateHistory(0, [], []);
		});

		// the need to triple ctrl-z to remove after pasting is probably because of the clicks at the start
		editorNode.addEventListener("mouseup", event => {
			editor.mutateHistory(0, [], []);
		});
	};

	return {
		setup
	};
};
