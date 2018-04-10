"use strict";

const dictionaries = new Map();

const distance = (a, b) => {

	if (a.length == 0) {
		return b.length;
	}

	if (b.length == 0) {
		return a.length;
	}

	const matrix = [];

	// increment along the first column of each row
	let i;
	for (i = 0; i <= b.length; i++){
		matrix[i] = [i];
	}

	// increment each column in the first row
	let j;
	for (j = 0; j <= a.length; j++){
		matrix[0][j] = j;
	}

	// fill in the rest of the matrix
	for (i = 1; i <= b.length; i++){
		for (j = 1; j <= a.length; j++){
			if (b.charAt(i-1) == a.charAt(j-1)){
				matrix[i][j] = matrix[i-1][j-1];
			} else {
				matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
					Math.min(matrix[i][j-1] + 1, // insertion
						matrix[i-1][j] + 1)); // deletion
			}
		}
	}

	return matrix[b.length][a.length];
}

self.onmessage = async event => {
	const [dictionaryName, requestType, str, numToReturn] = event.data;

	if (!dictionaries.has(dictionaryName)) {
		const data = await fetch("/dictionaries/" + dictionaryName + ".json");
		const dictionary = await data.json();
		dictionaries.set(dictionaryName, dictionary);
	}

	const dictionary = dictionaries.get(dictionaryName);

	if (requestType == "lookup") {
		postMessage(dictionary[str] || null);
	} else if (requestType == "nearest") {
		const pairs = [];
		for (let word in dictionary) {
			pairs.push([distance(str, word), word]);
		}
		const sorted = pairs.sort((a, b) => a[0] - b[0]);
		const rtn = sorted.slice(0, numToReturn).map(pair => pair[1]);
		postMessage(rtn);
	}
};
