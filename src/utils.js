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
		return key + '=' + obj.query[key];
	}).join('&');
	return (obj.pathname || '') + (str && '?' + str || '');
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

export function clearAttr(node, attr) {
	if (node[attr] != null) node.setAttribute(attr, '');
	node.removeAttribute(attr);
}
