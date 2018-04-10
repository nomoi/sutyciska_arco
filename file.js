"use strict";

const makeFileCtx = function(imports) {

	const {codesCtx, parserNameSet, dictionaryNameSet} = imports;

	class File {
		constructor(structure) {
			this.structure = structure;
			this.doctype = {
				parserName: null,
				dictionaryName: null
			};
		}

		handleDoctypeChange(node) {
			const {parserName, dictionaryName} = this.structure.links.getDoctype();
			const hasValueChanged = (parserName != this.doctype.parserName) || (dictionaryName != this.doctype.dictionaryName);
			const areBothRecognized = parserNameSet.has(parserName) && dictionaryNameSet.has(dictionaryName);
			this.structure.links.setDoctypeValidity(areBothRecognized);
			if (hasValueChanged && areBothRecognized) {
				this.doctype.dictionaryName = dictionaryName;
				this.doctype.parserName = parserName;
				return true;
			}
			return false;
		}

		updateDoctype(needsDecrufted) {
			const needsParsed = new Set();
			for (let node of needsDecrufted) {
				if (codesCtx.isRoot(node)) {
					if (this.handleDoctypeChange(node)) {
						for (let [editorHead, _] of this.structure.links.iterate(node, null)) {
							if (codesCtx.isGrammarCheckable(editorHead)) {
								needsParsed.add(editorHead);
							}
						}
						break;
					}
				} else {
					if (this.doctype.parserName != null && this.doctype.dictionaryName != null) {
						needsParsed.add(node);
					}
				}
			}
			return needsParsed;
		}
	}

	return {
		File
	};
};
