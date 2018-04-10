"use strict";

// lainchan moves the editor from middle to side and vice versa so only one element is needed

// where are the menu divs located?
// this needs editingNode for the onscroll
// dict menus would go in body or in this case in the viewer-container
// can spell menu also go there?
// there will be no viewer-container in zantcan, it becomes the body
// still feels appropriate for spell menu to go in a editor container
// the Menu will use the parent of whatever...

// menu div doesn't need to be positioned absolutely relatively to the editingNode
// since it closes on scroll and after x seconds
// it's not inside it since it can't be edited
// can dictionary be opened within editor? probably
// unless the sidebar/topbar dictionary widget is serving that purpose
// double clicking on a word in the editor causes it to be looked up in the widget dictionary, from which the recursive chaining can emerge
const makeSpellcheckCtx = imports => {

	const setup = (editorContainer, spellcheckNode, editor, file, dictionaryGroup) => {

		function hideSpellcheckNode() {
			spellcheckNode.classList.remove("active");
		}

		const getCursorCoords = event => {
			if (typeof event.pageX != "undefined") {
				return [event.pageX, event.pageY];
			}

			return [
				event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
				event.clientY + document.body.scrollTop + document.documentElement.scrollTop
			];
		}

		const selectNode = node => {
			const sel = window.getSelection();
			sel.removeAllRanges();
			const range = new Range();
			range.selectNode(node);
			sel.addRange(range);
		};

		const showSpellcheckMenu = (event, results) => {
			const {target} = event;
			spellcheckNode.classList.add("active");
			const ul = document.createElement("ul");
			for (let result of results) {
				const li = document.createElement("li");
				li.textContent = result;
				li.onclick = function() {
					selectNode(target);
					editor.replaceSelected(this.textContent);
					hideSpellcheckNode();
				};
				ul.appendChild(li);
			}
			spellcheckNode.innerHTML = '';
			spellcheckNode.appendChild(ul);

			const [x, y] = getCursorCoords(event);
			spellcheckNode.scrollTop = 0;

			if (window.innerWidth - x < spellcheckNode.offsetWidth) {
				spellcheckNode.style.left = window.innerWidth - spellcheckNode.offsetWidth + "px";
			} else {
				spellcheckNode.style.left = x + "px";
			}

			if (window.innerHeight - y < spellcheckNode.offsetHeight) {
				spellcheckNode.style.top = window.innerHeight - spellcheckNode.offsetHeight + "px";
			} else {
				spellcheckNode.style.top = y + "px";
			}
		}

		editorContainer.addEventListener("contextmenu", function(event) {

			const {target} = event;

			if (target.dataset.spellingError) {
				event.preventDefault();
				const {dictionaryName} = file.doctype;
				const {textContent} = target;

				dictionaryGroup.request(dictionaryName, "nearest", textContent, 10).then(results => {
					showSpellcheckMenu(event, results);
				});
			}
		});

		editorContainer.addEventListener("scroll", hideSpellcheckNode);
		editorContainer.addEventListener("click", function(event) {
			if (!spellcheckNode.contains(event.target)) {
				hideSpellcheckNode();
			}
		});
	};

	return {
		setup
	};
};
