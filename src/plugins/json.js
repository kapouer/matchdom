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
	#parent;
	#path = [];
	#index = 0;
	constructor(root) {
		this.#parent = this.root = root;
		this.#index = 0;
	}
	nextNode() {
		const p = this.#parent;
		if (!p) return;
		const len = p.childNodes?.length ?? 0;
		const i = this.#index;
		if (i >= len) {
			// go up one step
			if (this.#path.length == 0) return; // done
			const [index, parent] = this.#path.pop();
			this.#parent = parent;
			this.#index = index;
			return this.nextNode();
		} else {
			const n = p.childNodes[i];
			if (n.nodeType == 1) {
				this.#path.push([0, n]);
				this.#index = 0;
				this.#parent = n;
			} else {
				this.#index = i + 1;
			}
			return n;
		}
	}
}

class Node {
	constructor(doc) {
		this.ownerDocument = doc;
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
			node = this.ownerDocument.importFragment(node);
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
			node = this.ownerDocument.importFragment(node);
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
	cloneNode(deep) {
		const frag = new Fragment(this.ownerDocument);
		if (deep) for (const node of this.childNodes) {
			frag.appendChild(node.cloneNode(true));
		}
		return frag;
	}
	adopt(node) {
		const parent = node.parentNode;
		if (parent && parent != this) parent.removeChild(node);
		node.parentNode = this;
		return node;
	}
	toJSON() {
		if (this.childNodes.length == 1 && this.childNodes[0].nodeType == 3) {
			return this.childNodes[0].nodeValue;
		} else return Object.fromEntries(this.childNodes.map(n => {
			return [n.nodeName, n.toJSON()];
		}));
	}
}

class Element extends Node {
	nodeType = 1;
	childNodes = [];
	constructor(name, doc) {
		super(doc);
		this.nodeName = name;
	}
}

class TextNode extends Node {
	nodeType = 3;
	constructor(value, doc) {
		super(doc);
		this.nodeValue = value;
	}
	cloneNode() {
		return new TextNode(this.nodeValue, this.ownerDocument);
	}
	toJSON() {
		return this.nodeValue;
	}
}

class Fragment extends Node {
	nodeType = 11;
	childNodes = [];
}

class JsonDocument {
	static from(obj) {
		const doc = new JsonDocument();
		return doc.importFragment(obj);
	}
	createDocumentFragment() {
		return new Fragment(null, this);
	}
	createNodeIterator(root) {
		return new NodeIterator(root);
	}
	createElement(name) {
		return new Element(name, this);
	}
	createTextNode(value) {
		return new TextNode(value, this);
	}
	importNode(node) {
		node.ownerDocument = this;
		return node;
	}
	importFragment(obj) {
		const f = new Fragment(this);
		if (obj == null) {
			// pass
		} else if (["number", "boolean", "string"].includes(typeof obj)) {
			f.childNodes = [new TextNode(obj, this)];
		} else if (Array.isArray(obj)) {
			f.childNodes = obj.map(item => this.importFragment(item));
		} else {
			f.childNodes = Object.entries(obj).map(([k, v]) => {
				const n = new Element(k, this);
				n.appendChild(v);
				return n;
			});
		}
		return f;
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
