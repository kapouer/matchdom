class TextNode {
	nodeType = 3;
	nodeValue;
	constructor(str = "", doc) {
		this.nodeValue = str;
		this.ownerDocument = doc;
	}
	get nextSibling() {
		return findSibling(this, +1);
	}
	get previousSibling() {
		return findSibling(this, -1);
	}
	toString() {
		return this.nodeValue;
	}
	cloneNode() {
		return new TextNode(this.nodeValue, this.ownerDocument);
	}
}

function findSibling(node, dir) {
	const parent = node.parentNode;
	if (!parent) return null;
	const list = parent.childNodes;
	const pos = list.indexOf(node);
	if (pos < 0) return null;
	else return list[pos + dir];
}

class TextNodeIterator {
	root;
	index = 0;
	constructor(root) {
		this.root = root;
	}
	nextNode() {
		if (!this.root.childNodes) {
			if (this.index++ == 0) return this.root;
		} else {
			return this.root.childNodes[this.index++];
		}
	}
}

class Fragment {
	nodeType = 11;
	constructor(str, doc) {
		this.childNodes = [];
		this.ownerDocument = doc;
		if (str != null) this.appendChild(this.ownerDocument.createTextNode(str));
	}
	replaceChild(node, old) {
		this.insertBefore(node, old);
		this.removeChild(old);
		return node;
	}
	appendChild(node) {
		this.childNodes.push(this.adopt(node));
		return node;
	}
	insertBefore(node, bef) {
		if (node instanceof Fragment) {
			for (const child of Array.from(node.childNodes)) {
				this.insertBefore(child, bef);
			}
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
		const frag = new Fragment(null, this.ownerDocument);
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
}

class TextDocument {
	static from(str) {
		const doc = new TextDocument();
		const frag = new Fragment(str, doc);
		return frag;
	}
	createDocumentFragment() {
		return new Fragment(null, this);
	}
	createNodeIterator(root) {
		return new TextNodeIterator(root);
	}
	createTextNode(str) {
		return new TextNode(str, this);
	}
	importNode(node) {
		return node;
	}
}

export const types = {
	text(ctx, val) {
		if (val && typeof val == "string") return TextDocument.from(val);
		else return val;
	}
};
