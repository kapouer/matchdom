class TextNode {
	nodeValue
	constructor(str = "", doc) {
		this.nodeValue = str;
		this.nodeType = -1;
		this.ownerDocument = doc;
	}
	toString() {
		return this.nodeValue;
	}
	cloneNode() {
		return new TextNode(this.nodeValue, this.ownerDocument);
	}
}

class TextNodeIterator {
	root
	index = 0
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

class TextFragment {
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
		const pos = this.childNodes.indexOf(bef);
		this.childNodes.splice(pos, 0, this.adopt(node));
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
		const frag = new TextFragment(null, this.ownerDocument);
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

export default class TextDocument {
	static from(str) {
		const doc = new TextDocument();
		const frag = new TextFragment(str, doc);
		return frag;
	}
	createDocumentFragment() {
		return new TextFragment(null, this);
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