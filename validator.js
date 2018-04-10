"use strict";

const makeValidatorCtx = imports => {

	const {codesCtx, processingCtx} = imports;

	class Validator {
		constructor(parserGroup, dictionaryGroup) {
			this.parserGroup = parserGroup;
			this.dictionaryGroup = dictionaryGroup;
		}

		//things file is is needed for:
		//getting doctype
		//getting node version (via structure)
		//getting first contained sent (via structure)
		//getting preserved documents

		async checkGrammar(file, editorHead, targetVersion, subnodes) {

			if (file.structure.getNodeVersion(editorHead) != targetVersion) {
				console.log("cancelled during initialization");
				return null;
			}

			const {parserName} = file.doctype;
			const tokens = subnodes.map(x => codesCtx.getString(x));
			const result = await this.parserGroup.request(parserName, tokens);

			if (file.structure.getNodeVersion(editorHead) != targetVersion) {
				console.log("cancelled during PARSE");
				return null;
			}

			const sent = file.structure.getFirstContainedSent(editorHead);

			if (result.hasError) {
				console.log("ERROR", result);
				processingCtx.setEditorError(subnodes, result);
				if (!sent) debugger;
				sent.dataset.parserError = true;
				return null;
			} else {
				delete sent.dataset.lexingError;
				delete sent.dataset.parserError;

				const testSent = document.createElement("sent");
				testSent.innerHTML = result.xml;

				const innerDocuments = file.structure.getInnerDocuments(editorHead);
				const viewerHeads = file.structure.getViewerHeads(editorHead);

				sent.innerHTML = result.xml;

				processingCtx.replaceLinkHeads(sent, subnodes, viewerHeads);
				processingCtx.copySpellingErrors(sent, subnodes);
				processingCtx.reinsertInnerDocuments(sent, subnodes, innerDocuments);

				return sent;
			}
		}

		checkSpelling(dictionaryName, subnodes) {
			return subnodes.filter(codesCtx.isSpelling).map(node => {
				return this.dictionaryGroup.request(dictionaryName, "lookup", node.textContent).then(result => {
					if (!result) {
						node.dataset.spellingError = true;
					} else {
						delete node.dataset.spellingError;
					}
				});
			});
		}

		// server may benefit from queueing Files in order to split up multiple simultaneous checks
		check(file, needsParsed) {
			for (let editorHead of needsParsed) {
				const subnodes = file.structure.getSubnodes(editorHead);
				processingCtx.clearEditorError(subnodes);

				const targetVersion = file.structure.getNodeVersion(editorHead);
				window.setTimeout(() => {

					const currentVersion = file.structure.getNodeVersion(editorHead);

					if (currentVersion !== targetVersion) {
						console.log("cancelled during timeout");
						return;
					}

					const {dictionaryName} = file.doctype;

					this.checkSpelling(dictionaryName, subnodes);
					this.checkGrammar(file, editorHead, targetVersion, subnodes).then(sent => {
						if (sent) {
							processingCtx.evaluateText(sent);
							processingCtx.evaluatePredicates(sent);
						}
					});
				}, 1000);
			}
		}
	}

	return {
		Validator
	};
};
