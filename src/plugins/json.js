function findSibling(node, dir) {
	const parent = node.parentNode;
	if (!parent) return null;
	const list = parent.childNodes;
	const pos = list.indexOf(node);
	if (pos < 0) return null;
	else return list[pos + dir];
}

class NodeIterator {
	root;
	#node;
	constructor(root) {
		this.root = root;
	}
	nextNode() {
		let cur = this.#node;
		let next;
		if (!cur) {
			next = this.root;
		} else {
			next = cur.nodeType != 3 && cur.firstChild || cur.nextSibling;
			if (!next) {
				while ((cur = cur.parentNode)) {
					if (cur == this.root) break;
					next = cur.nextSibling;
					if (next) break;
				}
			}
		}
		this.#node = next;
		return next;
	}
	get referenceNode() {
		return this.#node;
	}
}

class Node {
	get ownerDocument() {
		return JsonDocument.doc;
	}
	get nextSibling() {
		return findSibling(this, +1);
	}
	get previousSibling() {
		return findSibling(this, -1);
	}
	replaceChild(node, old) {
		this.insertBefore(node, old);
		this.removeChild(old);
		return node;
	}
	appendChild(node) {
		if (!(node instanceof Node)) {
			node = JsonDocument.doc.importObject(node);
		}
		if (node.nodeType == 11) for (const child of node.childNodes) {
			this.appendChild(child);
		} else {
			this.childNodes.push(this.adopt(node));
		}
		return node;
	}
	insertBefore(node, bef) {
		if (!(node instanceof Node)) {
			node = JsonDocument.doc.importObject(node);
		}
		if (node.nodeType == 11) for (const child of node.childNodes) {
			this.insertBefore(child, bef);
		} else {
			const list = this.childNodes;
			const pos = list.indexOf(bef);
			list.splice(pos < 0 ? list.length : pos, 0, this.adopt(node));
		}
		return node;
	}
	removeChild(node) {
		const pos = this.childNodes.indexOf(node);
		if (pos >= 0) {
			this.childNodes.splice(pos, 1);
			node.parentNode = null;
		}
		return node;
	}
	get firstChild() {
		return this.childNodes[0];
	}
	adopt(node) {
		const parent = node.parentNode;
		if (parent && parent != this) parent.removeChild(node);
		node.parentNode = this;
		return node;
	}
	toJSON() {
		if (this.tagName == "object") {
			const obj = {};
			for (const n of this.childNodes) {
				if (n.nodeType == 3) {
					if (n.nodeValue === "") continue; // cursor
					else throw new Error("Cannot have text node in object children");
				} else if (n.attributes.length == 1) {
					obj[n.attributes[0].value] = n.toJSON();
				} else {
					throw new Error("Cannot have unnamed node in object children");
				}
			}
			return obj;
		} else if (this.nodeType == 11 || this.tagName == "array") {
			const arr = [];
			for (const n of this.childNodes) arr.push(n.toJSON());
			return arr;
		} else if (this.tagName == "key") {
			if (this.childNodes.length == 0) {
				return undefined;
			} else if (this.childNodes.length == 1) {
				return this.childNodes[0].toJSON();
			}
			const arr = [];
			let allStrings = true;
			for (const n of this.childNodes) {
				if (n.nodeType != 3) allStrings = false;
				arr.push(n.toJSON());
			}
			if (allStrings) return arr.join('');
			else return arr;
		}
	}
}

class Element extends Node {
	nodeType = 1;
	childNodes = [];
	attributes = [];
	constructor(name) {
		super();
		this.tagName = name;
	}
	cloneNode(deep) {
		const node = new Element(this.tagName);
		for (const { name, value } of this.attributes) {
			node.attributes.push({ name, value });
		}
		if (deep) for (const child of this.childNodes) {
			node.appendChild(child.cloneNode(true));
		}
		return node;
	}
}

class TextNode extends Node {
	nodeType = 3;
	constructor(value) {
		super();
		this.nodeValue = value;
	}
	cloneNode() {
		return new TextNode(this.nodeValue);
	}
	toJSON() {
		return this.nodeValue;
	}
}

class Fragment extends Node {
	nodeType = 11;
	childNodes = [];
	cloneNode(deep) {
		const frag = new Fragment();
		if (deep) for (const node of this.childNodes) {
			frag.appendChild(node.cloneNode(true));
		}
		return frag;
	}
}

class JsonDocument {
	static doc;
	static from(obj) {
		this.doc ??= new JsonDocument();
		obj = this.doc.importObject(obj);
		const f = new Fragment();
		f.appendChild(obj);
		return obj;
	}
	createDocumentFragment() {
		return new Fragment();
	}
	createNodeIterator(root) {
		return new NodeIterator(root);
	}
	createElement(name) {
		return new Element(name);
	}
	createTextNode(value) {
		return new TextNode(value);
	}
	importNode(node) {
		return node;
	}
	importObject(obj) {
		if (obj == null) {
			// equivalent of empty
			return new TextNode(null);
		} else if (["number", "boolean", "string"].includes(typeof obj)) {
			return new TextNode(obj);
		} else if (Array.isArray(obj)) {
			const el = new Element("array");
			for (const item of obj) el.appendChild(item);
			return el;
		} else {
			const el = new Element("object");
			for (const [k, v] of Object.entries(obj)) {
				const n = new Element("key");
				n.attributes[0] = { name: 'key', value: k };
				n.appendChild(v);
				el.appendChild(n);
			}
			return el;
		}
	}
}

export const formats = {
	as: {
		json(ctx, val) {
			try {
				return JSON.stringify(val);
			} catch (ex) {
				return null;
			}
		},
		obj(ctx, obj) {
			if (!obj) return obj;
			if (typeof obj == "string") {
				try {
					return JSON.parse(obj);
				} catch (ex) {
					return null;
				}
			} else {
				return obj;
			}
		}
	}
};

export const types = {
	obj(ctx, obj) {
		if (typeof obj == "object") {
			return JsonDocument.from(obj);
		} else {
			return null;
		}
	}
};
