const makeMenuCtx = imports => {

	function setup(modeButton, nextButton, indicatorNode, outputNode, runner) {

		const indicators = indicatorNode.children;

		// should receive all needed values as args
		function updateUI(isStepping, stepIndex, mode) {
			nextButton.disabled = !(mode == "macnu" && isStepping);
			modeButton.disabled = isStepping;
			modeButton.textContent = mode;

			for (let i = 0; i < indicators.length; i++) {
				indicators[i].disabled = (i >= stepIndex) && isStepping;
			}
		}

		modeButton.addEventListener("click", function(e) {
			runner.switchMode();
		});

		nextButton.addEventListener("click", function(e) {
			runner.next();
		});

		for (let i = 0; i < indicators.length; i++) {
			indicators[i].addEventListener("click", function(e) {
				runner.finish();
				runner.displayStepIndex(i);
			});
		}

		runner.addHook(updateUI);
		runner.runHooks();
	}

	return {
		setup
	};
};
