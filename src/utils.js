export function parseUrl(str) {
	const obj = {};
	const parts = (str || '').split('?');
	obj.pathname = parts[0];
	if (parts.length > 1) {
		obj.query = {};
		parts[1].split('&').forEach(function (pair) {
			pair = pair.split('=');
			obj.query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
		});
	}
	return obj;
}

export function serializeUrl(obj) {
	const str = obj.query && Object.keys(obj.query).map(function (key) {
		return encodeURIComponent(key) + '=' + encodeURIComponent(obj.query[key]);
	}).join('&');
	return (obj.pathname || '') + (str && '?' + str || '');
}

let doc;
export function HTML(str) {
	if (!doc) doc = document.cloneNode();
	const tpl = doc.createElement('template');
	tpl.innerHTML = str.trim();
	const frag = tpl.content;
	return frag.childNodes.length == 1 ? frag.childNodes[0] : frag;
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

export function findData(data, path) {
	if (!data) return {};
	path = path.slice();
	const keys = [];
	let inkeys = false;
	let head;
	while (path.length && inkeys == false) {
		if (typeof data == "object" && data.length) {
			break;
		}
		head = path.shift();
		if (head.endsWith('+')) {
			if (data[head]) {
				// eslint-disable-next-line no-console
				console.warn("repeat filter ignores", head, "because the key exists");
			} else {
				head = head.slice(0, -1);
				inkeys = true;
			}
		}
		data = data[head];
		if (data == null) break;
		keys.push(head);
	}
	return {
		head: head,
		path: path,
		keys: keys,
		inkeys: inkeys,
		data: data
	};
}

