"use strict";

const makeWorkerWrapperCtx = imports => {

	const makePromise = (worker, args) => {
		return new window.Promise((resolve, reject) => {
			worker.onmessage = e => resolve(e.data);
			worker.onerror = e => reject(e.data);
			worker.postMessage(args);
		});
	}

	const parser = () => {
		const worker = new window.Worker("./parser_worker.js");

		return {
			query(parserName, tokens) {
				console.assert(typeof parserName === "string");
				console.assert(Array.isArray(tokens), "parser input is string");

				return makePromise(worker, [parserName, tokens]);
			}
		};
	};

	const dictionary = () => {
		const worker = new window.Worker("./dictionary_worker.js");

		return {
			query(dictionaryName, requestType, str, numToReturn) {
				console.assert(typeof dictionaryName === "string");
				console.assert(typeof requestType === "string");
				console.assert(typeof str === "string");

				if (requestType === "lookup") {
					console.assert(typeof numToReturn === "undefined");
				} else if (requestType == "nearest") {
					console.assert(typeof numToReturn === "number");
				} else {
					throw new Error("request type not recognized: " + requestType);
				}

				return makePromise(worker, [dictionaryName, requestType, str, numToReturn]);
			}
		};
	};

	return {
		parser,
		dictionary
	};
};
