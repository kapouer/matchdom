export function parseUrl(str = '') {
	const obj = {};
	const [pn, qu] = str.toString().split('?');
	if (pn !== "") obj.pathname = pn;
	if (qu != null && qu !== "") {
		obj.query = {};
		qu.split('&').forEach(function (pair) {
			pair = pair.split('=');
			obj.query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
		});
	}
	return obj;
}

export function serializeUrl(obj = {}) {
	const str = obj.query && Object.keys(obj.query).map(function (key) {
		return encodeURIComponent(key) + '=' + encodeURIComponent(obj.query[key]);
	}).join('&');
	return (obj.pathname || '') + (str && '?' + str || '');
}

let doc;
export function HTML(str) {
	if (str.startsWith('<html') && str.endsWith('</html>')) {
		if (!parser) parser = new DOMParser();
		return parser.parseFromString(str, "text/html");
	} else {
		if (!doc) doc = document.cloneNode();
		const tpl = doc.createElement('template');
		tpl.innerHTML = str.trim();
		const frag = tpl.content;
		return frag.childNodes.length == 1 ? frag.childNodes[0] : frag;
	}
}

let parser;
export function XML(str) {
	if (!parser) parser = new DOMParser();
	const doc = parser.parseFromString(`<root>${str.trim()}</root>`, "text/xml");
	const root = doc.documentElement;
	if (root.childNodes.length == 1) return root.childNodes[0];
	const frag = doc.createDocumentFragment();
	while (root.firstChild) frag.appendChild(root.firstChild);
	return frag;
}
