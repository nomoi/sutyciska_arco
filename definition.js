"use strict";

const makeDefinitionCtx = imports => {

	const {lexingCtx, codesCtx} = imports;

	function setup(viewerContainer, definitionRoot, file, dictionaryGroup) {

		const rootChildren = definitionRoot.querySelector(".definition-children");
		const viewerNode = viewerContainer.querySelector("#viewer-node");

		function makePanel(definition, notes=null) {
			const panel = document.createElement("div");
			const content = document.createElement("div");
			const children = document.createElement("div");
			const arrow = document.createElement("div");

			panel.classList.add("definition-panel");
			content.classList.add("definition-content");
			children.classList.add("definition-children");
			arrow.classList.add("definition-arrow");

			content.insertAdjacentHTML("afterbegin", definition);

			if (notes) {
				const hr = document.createElement("hr");
				content.appendChild(hr);
				content.insertAdjacentHTML("beforeend", notes);
			}

			panel.appendChild(content);
			panel.appendChild(children);
			panel.appendChild(arrow);

			const viewerWidth = viewerContainer.clientWidth;
			const noise = Math.random() * viewerWidth / 10;

			panel.style.width = Math.floor(viewerWidth / 4 + noise) + "px";

			panel.addEventListener("click", function(event) {

				const content = this.querySelector(".definition-content");

				if (event.target === this || event.target === content) {
					const children = this.querySelector(".definition-children");
					if (children.children.length === 0) {
						panel.remove();
					} else {
						children.innerHTML = "";
					}
					return;
				}
			});

			return panel;
		}

		function setArrowOfPanel(panel, target, direction) {

			const arrow = panel.querySelector(".definition-arrow");

			// TODO: use CSS to set border sizes and deltas
			if (direction == 2 || direction == 3) {
				arrow.style.right = target.offsetWidth / 2 + 2 + "px";
			} else {
				arrow.style.left = target.offsetWidth / 2 + 2 + "px";
			}

			if (direction == 0 || direction == 3) {
				arrow.style.top = panel.offsetHeight - 3 + "px";
				arrow.classList.add("up");
			} else {
				arrow.style.top = -7 + "px";
				arrow.classList.add("down");
			}
		}

		// when a single char word is highlighted, the arrow tends to fall off the edge
		// so this puts padding on either side

		const getLeftwardPos = (target, panel) =>
			target.offsetLeft + target.offsetWidth - panel.offsetWidth + 10; // 10 is padding

		const getRightwardPos = (target) =>
			target.offsetLeft - 10; // 10 is padding

		const getTopwardPos = (target, panel) =>
			target.offsetTop - panel.offsetHeight;

		const getDownwardPos = (target) =>
			target.offsetTop + target.offsetHeight + 1; // WARNING: 1 is a quick fix

		function restart(target, data) {

			const getLeftFreeLength = () => 
				target.offsetLeft;

			const getRightFreeLength = () => 
				viewerContainer.clientWidth - target.offsetLeft + target.offsetWidth;

			const getTopFreeLength = () => 
				target.offsetTop - viewerContainer.scrollTop;

			const getBottomFreeLength = () => 
				(viewerContainer.scrollTop + viewerContainer.offsetHeight) - (target.offsetTop + target.offsetHeight);

			function determineDirection(panel) {
				if (getLeftFreeLength(target) > getRightFreeLength(target)) {
					panel.style.left = getLeftwardPos(target, panel) + "px";
					if (getTopFreeLength(target) > getBottomFreeLength(target)) {
						panel.style.top = getTopwardPos(target, panel) + "px";
						return 3;
					}
					panel.style.top = getDownwardPos(target) + "px";
					return 2;
				} else {
					panel.style.left = getRightwardPos(target) + "px";
					if (getTopFreeLength(target) > getBottomFreeLength(target)) {
						panel.style.top = getTopwardPos(target, panel) + "px";
						return 0;
					}
					panel.style.top = getDownwardPos(target) + "px";
					return 1;
				}
			}

			const panel = makePanel(data.definition, data.notes);

			rootChildren.innerHTML = "";
			rootChildren.appendChild(panel);

			const direction = determineDirection(panel);

			setArrowOfPanel(panel, target, direction);
		}

		function append(target, parent, data) {

			const isIntersecting = (a, b) => !(
					a.right <= b.left ||
					a.left >= b.right ||
					a.top >= b.bottom ||
					a.bottom <= b.top);

			const isContaining = (a, b) =>
				a.left <= b.left &&
				a.right >= b.right &&
				a.top <= b.top &&
				a.bottom >= b.bottom;

			const panels = new Set(document.querySelectorAll(".definition-content")); // more precise to use just content

			function putPanel(panel, i) {

				switch(i) {
					case 0:
						panel.style.left = getRightwardPos(target) + "px";
						panel.style.top = getTopwardPos(target, panel) + "px";
						break;
					case 1:
						panel.style.left = getRightwardPos(target) + "px";
						panel.style.top = getDownwardPos(target) + "px";
						break;
					case 2:
						panel.style.left = getLeftwardPos(target, panel) + "px";
						panel.style.top = getDownwardPos(target) + "px";
						break;
					case 3:
						panel.style.left = getLeftwardPos(target, panel) + "px";
						panel.style.top = getTopwardPos(target, panel) + "px";
						break;
				}
			}

			function getAreaOfIntersection(a, b) {
				const left = Math.max(a.left, b.left);
				const top = Math.max(a.top, b.top);
				const bottom = Math.min(a.bottom, b.bottom);
				const right = Math.min(a.right, b.right);

				const dx = (right - left);
				const dy = (bottom - top);
				const cost = dx * dy;

				if (dx <= 0 || dy <= 0 || cost <= 0) {
					debugger;
				}

				return cost;
			}

			function calculateCost(panels, newPanel) {
				const {left, top} = viewerContainer.getBoundingClientRect();
				const viewerContainerRect = { // using getClientRects doesn't exclude scrollbar
					left,
					top,
					right: left + viewerContainer.clientWidth,
					bottom: top + viewerContainer.clientHeight
				}

				if (!isContaining(viewerContainerRect, newPanel.getBoundingClientRect())) {
					return Number.MAX_SAFE_INTEGER;
				}

				const newPanelRect = newPanel.getBoundingClientRect();

				let cost = 0;

				for (let panel of panels) {
					const panelRect = panel.getBoundingClientRect();
					if (isIntersecting(newPanelRect, panelRect)) {
						cost += getAreaOfIntersection(newPanelRect, panelRect);
					}
				}

				return cost;
			}

			const newPanel = makePanel(data.definition, data.notes);
			const parentChildren = parent.querySelector(".definition-children");

			parentChildren.appendChild(newPanel);

			let direction = 0;
			let minCost = Number.MAX_SAFE_INTEGER;

			for (let i = 0; i < 4; i++) {
				putPanel(newPanel, i);

				const cost = calculateCost(panels, newPanel);

				if (cost < minCost) {
					direction = i;
					minCost = cost;
				}
			}

			putPanel(newPanel, direction);
			setArrowOfPanel(newPanel, target, direction);
		}

		viewerContainer.addEventListener("click", function(event) {
			const {target} = event;

			if (codesCtx.isClickable(target) && !target.classList.contains("spelling-error")) {
				dictionaryGroup.request(file.doctype.dictionaryName, "lookup", target.textContent).then(data => {

					if (target.offsetParent.classList.contains("definition-panel")) {
						append(target, target.offsetParent, data);
					} else {
						restart(target, data);
					}
				});
			} else if (viewerNode.contains(target)) {
				rootChildren.innerHTML = "";
			}
		});
	}

	return {
		setup
	};
};
