class TextNode {
	#str
	constructor(str = "", doc) {
		this.#str = str;
		this.nodeType = -1;
		this.ownerDocument = doc;
	}
	get nodeValue() {
		return this.#str;
	}
	set nodeValue(str) {
		this.#str = str;
	}
	toString() {
		return this.#str;
	}
	cloneNode() {
		return new TextNode(this.#str, this.ownerDocument);
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

class TextNodeIterator {
	#root
	#index = 0
	constructor(root) {
		this.#root = root;
	}
	nextNode() {
		return this.#root.childNodes[this.#index++];
	}
}

class TextFragment {
	constructor(str, doc) {
		this.childNodes = [];
		this.ownerDocument = doc;
		if (str != null) this.appendChild(this.ownerDocument.createTextNode(str));
	}
	appendChild(node) {
		this.childNodes.push(this.adopt(node));
	}
	insertBefore(node, bef) {
		const pos = this.childNodes.indexOf(bef);
		this.childNodes.splice(pos, 0, this.adopt(node));
	}
	removeChild(node) {
		const pos = this.childNodes.indexOf(node);
		if (pos >= 0) {
			this.childNodes.splice(pos, 1);
			node.parentNode = null;
		}
	}
	get firstChild() {
		return this.childNodes[0];
	}
	cloneNode(deep) {
		const frag = new TextFragment(null, this.ownerDocument);
		if (deep) this.childNodes.forEach((node) => frag.appendChild(node.cloneNode(true)));
		return frag;
	}
	adopt(node) {
		const parent = node.parentNode;
		if (parent) parent.childNodes.splice(parent.childNodes.indexOf(node), 1);
		node.parentNode = this;
		return node;
	}
}
