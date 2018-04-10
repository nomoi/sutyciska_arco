"use strict";

const makeWorkerGroupCtx = imports => {

	class WorkerGroup {
		constructor(wrap, recognizedNames) {
			this.worker = wrap(); // can use multiple worker instances if needed
			this.recognizedNames = new Set(recognizedNames);

			this.queue = [];
			this.isCycling = false;
		}

		isNameRecognized(name) {
			return this.recognizedNames.has(name);
		}

		cycle() {
			const item = this.queue.shift();

			if (!item) {
				this.isCycling = false;
				return;
			}

			const [args, resolve] = item;

			this.worker.query(...args).then(data => {
				resolve(data);
				this.cycle();
			});
		}

		request(name, ...args) {
			if (!this.isNameRecognized(name)) {
				throw new Error("unit name not recognized: " + name);
			}

			return new Promise(resolve => {
				this.queue.push([[name, ...args], resolve]);

				if (!this.isCycling) {
					this.isCycling = true;
					this.cycle();
				}
			});
		}
	}

	return {
		WorkerGroup
	};
};
