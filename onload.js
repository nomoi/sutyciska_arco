window.onload = function() {

	const parserNameSet = new Set([
		"camxes",
		"cambetas",
		"camcmebri",
		"camcekitau",
		"zantufa"
	]);

	const dictionaryNameSet = new Set([
		"jbovlaste",
		"jbocekitau"
	]);

	/* Composing isomorphic contexts */
	const arrayCtx = makeArrayCtx();
	const morphCtx = makeMorphCtx();
	const codesCtx = makeCodesCtx({morphCtx});
	const lexingCtx = makeLexingCtx({morphCtx});

	const processingCtx = makeProcessingCtx({morphCtx, codesCtx, document});

	const workerWrapperCtx = makeWorkerWrapperCtx();
	const {WorkerGroup} = makeWorkerGroupCtx();

	const {Links} = makeLinksCtx({codesCtx});
	const {Structure} = makeStructureCtx({arrayCtx, codesCtx, Node});
	const {File} = makeFileCtx({codesCtx, parserNameSet, dictionaryNameSet});
	const {Dispatcher} = makeDispatcherCtx({codesCtx});
	const {Runner} = makeRunnerCtx();
	const {Validator} = makeValidatorCtx({codesCtx, processingCtx});

	/* Composing client contexts */
	const {Editor} = makeEditorCtx({arrayCtx, morphCtx, codesCtx, lexingCtx});
	const menuCtx = makeMenuCtx();
	const keyboardCtx = makeKeyboardCtx({morphCtx, processingCtx});
	const spellcheckCtx = makeSpellcheckCtx();
	const definitionCtx = makeDefinitionCtx({lexingCtx, codesCtx});

	const editorContainer = document.querySelector("#editor-container");
	const editorNode = editorContainer.firstElementChild;
	editorNode.innerHTML = "<br>";

	const viewerContainer = document.querySelector("#viewer-container");
	const viewerNode = viewerContainer.firstElementChild;
	viewerNode.innerHTML = "<link-head></link-head><text><sent><port>\n</port></sent></text>";

	const parserGroup = new WorkerGroup(workerWrapperCtx.parser, parserNameSet);
	const dictionaryGroup = new WorkerGroup(workerWrapperCtx.dictionary, dictionaryNameSet);
	const validator = new Validator(parserGroup, dictionaryGroup);

	/* Building instances */
	const links = new Links(editorNode);
	const structure = new Structure(links, viewerNode);
	const file = new File(structure);

	const dispatcher = new Dispatcher(links, structure, file, validator);
	const runner = new Runner(editorNode, dispatcher);

	const modeButton = document.querySelector("#steps-mode");
	const nextButton = document.querySelector("#steps-next");
	const indicatorNode = document.querySelector("#steps-indicator");
	const outputNode = document.querySelector("#steps-output");

	window.editor = new Editor(runner);

	menuCtx.setup(modeButton, nextButton, indicatorNode, outputNode, runner);
	keyboardCtx.setup(editorNode, editor);

	const spellcheckNode = editorContainer.querySelector("#spellcheck-node");

	spellcheckCtx.setup(editorContainer, spellcheckNode, editor, file, dictionaryGroup);

	const definitionRoot = viewerContainer.querySelector("#definition-root");

	definitionCtx.setup(viewerContainer, definitionRoot, file, dictionaryGroup);

	editorNode.focus();
	const jipci = `jo'au camxes jbovlaste\n\n.i ni'o puzuvuku zasti fa lo cmalu je xunre jipcyfe'i goi ko'a .:i ri xabju co kansa lo xarju .e lo datka .e lo mlatu vu'o goi ko'e .:i ko'a jo'u ko'e cu xabju lo melbi je cmalu zdani noi le cmalu je xunre jipci cu nelci lonu jisygau gi'e nicygau vau ke'a .:i le cmalu je xunre jipci cu nandu gunka lo jibri be ko'a ca piro lo djedi .:i le drata noroi sidju .:i geku'i ko'e cusku losedu'u ko'e zu'edji gi ko'e lazni dukse sai .:i le xarju cu nelci lonu xajycmo bu'u lo cimde'u bu'u lo bartu .:ijebo le datka ta'e limna lo lalxu ca piro lo djedi .:ijebo le mlatu cu pukfri lonu vreta bu'u lo solgu'i ca lonu latpukcmo

ni'o ca lo djedi le cmalu je xunre jipci pu gunka bu'u lo purdi co'u lonu ko'a zvafa'i lo gurni be lo zumri

.:i "lu ma ba sombo le vi gurni be lo zumri li'u" -sei ko'a retsku

.:i "lu mi na go'i li'u" -sei le xarju cu xajycmo to'o le ri cimde'u cmatu'a be bu'u le purdi

.:i "lu mi na go'i li'u" -sei le datka cu datkycmo to'o le lalxu

.:i "lu mi na go'i li'u" -sei le mlatu cu latpukcmo to'o le ri stuzi be bu'u le solgu'i

.:iseva'obo le cmalu je xunre jipci cu co'a sisku lo mapti spisa be lo terdi gi'e sraku ri sepi'o lo ko'a jamfu gi'e sombo le gurni be lo zumri

ni'o ca'o lo crisa le gurni be lo zumri pu banro .:i pamai gy banro lo rajycla je crino stani gi'ebabo co'a rutma'u bu'u lo solgu'i mo'u lonu skari lo selpa'imle solji .:i le cmalu je xunre jipci cu sanji lodu'u le zumri cu bredi lonu se crepu

.:i "lu ma ba sidju mi lonu crepu le zumri li'u' -sei le cmalu je xunre jipci cu retsku

.:i "lu mi na go'i li'u" -sei le xarju cu xajycmo to'o le ri cimde'u cmatu'a be bu'u le purdi

.:i "lu mi na go'i li'u" -sei le datka cu datkycmo to'o le ri lalxu

.:i "lu mi na go'i li'u" -sei le mlatu cu latpukcmo to'o le ri stuzi be bu'u le solgu'i

.:i "lu je'e .i'acu'i .:i mi ba crepu co nonkansa li'u" -sei le cmalu je xunre jipci cu cusku .:i ko'a racyju'i crepu le stani gi'e vimcu ro le gurni be lo zumri lo rutcalku

ni'o "lu ma ba bevri le zumri lo zalmlo tezu'e lonu zalvi fi lo grupu'o li'u" -sei le cmalu je xunre jipci pu retsku

.:i "lu mi na go'i li'u" -sei le xarju cu xajycmo to'o le ri cilmodertu cmatu'a be bu'u le purdi

.:i "lu mi na go'i li'u" -sei le datka cu datkycmo to'o le ri lalxu

.:i "lu mi na go'i li'u" -sei le mlatu cu latpukcmo to'o le ri stuzi be bu'u le solgu'i

.:iseva'obo le cmalu je xunre jipci cu nonkansa bevri le zumri le zalmlo gi'e retsku fi lo mlosazri fe losedu'u xukau ri ba xendo co banzu lonu zalvi le zumri lo grupu'o

ni'o bazaku le mlosazri pu benji lo dakli be lo grupu'o le zdani be le cmalu je xunre jipci ku jo'u le xarju ku jo'u le datka ku jo'u le mlatu

.:i "lu ma ba sidju mi lonu bixygau le grupu'o lo nanba li'u" -sei le cmalu je xunre jipci cu retsku

.:i "lu mi na go'i li'u" -sei le xarju cu xajycmo to'o le ri cimde'u cmatu'a be bu'u le purdi

.:i "lu mi na go'i li'u" -sei le datka cu datkycmo to'o le ri lalxu

.:i "lu mi na go'i li'u" -sei le mlatu cu latpukcmo to'o le ri stuzi be bu'u le solgu'i

.:i "lu je'e .i'acu'i -sei le cmalu je xunre jipci cu cusku- .:i mi ba nonkansa jukpa le nanba li'u" .:i ko'a klama lo ri cnici jupku'a .:i ko'a jicla le grupu'o ja'e lo grupesxu .:i ko'a da'erjicla le grupesxu gi'e setca ri lo toknu tezu'e lonu se sudglajukpa

ni'o baziku pu te panci fi lo selpa'imle fe lo glare je vifne nanba .:i le panci cu se tisna ro lo kojna be le zdani gi'e varselbe'i le bartu purdi .:i le xarju cu nerkla le jupku'a le ri cimde'u cmatu'a be bu'u le purdi .:ijebo le datka cu nerkla fi le lalxu .:ije le mlatu cu cliva le ri stuzi be bu'u le solgu'i .:i ca lonu le cmalu je xunre jipci cu kargau fo le toknu vrogai kei le grupesxu ba'o vartinsa gi'e binxo lo mlerai je kukrai bo simlu nabysu'a verai lo se viska be ko'a .e ko'e

ni'o "lu ma ba citka le vi nanba li'u" -sei le cmalu je xunre jipci cu retsku

.:i "lu mi go'i li'u" -sei le xarju cu xajycmo

.:i "lu mi go'i li'u" -sei le datka cu datkycmo

.:i "lu mi go'i li'u" -sei le mlatu cu latpukcmo

.:i "lu .i'enaisai do ba na go'i -sei le cmalu je xunre jipci cu cusku- .:i mi pu sombo le tsiju .:ijebo mi pu crepu le zumri .:ijebo mi pu bevri ri le zlamlo tezu'e lonu zalvi fi lo grupu'o .:ijebo mi pu jukpa le nanba .:ijebo mi pu nonkansa gasnu la'e ro de'u .:i mi bazi nonkansa sai citka le nabysu'a

ni'o le xarju ku jo'u le datka ku jo'u le mlatu pu sanli gi'e zgana lonu le cmalu je xunre jipci cu nonkansa sai citka le nabysu'a .:i ri kukte .:ijebo ko'a pukfri mo'u lo romoi sai nabysle `;

	const normal = "jo'au camxes jbovlaste\n\n.i lo'u li'u";

	editor.replaceSelected(processingCtx.preprocess(""), 0);
	editorContainer.scrollTop = 0;
};
