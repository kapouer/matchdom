export default class Place {
	static TEXT = 0;
	static NODE = 1;
	static CONT = 2;
	static ATTR = 3;
	static TAG = 4;
	index = 0;

	constructor(root, node, name) {
		this.root = root;
		if (node && node.nodeType == 3) {
			this.target = Place.TEXT;
			this.text = node;
			this.node = node.parentNode;
		} else {
			this.target = Place.NODE;
			this.node = node;
		}
		if (name === true) {
			this.target = Place.TAG;
		} else if (name != null) {
			this.attr = name;
			this.target = Place.ATTR;
		}
	}

	clone() {
		return Object.assign(new Place(), this);
	}

	get doc() {
		return this.root.ownerDocument;
	}

	reduceHit() {
		this.hits.splice(0, this.index);
		this.hits.splice(1);
		this.index = 0;
	}

	restrict(to) {
		if (!to) {
			this.target = null;
		} else if (to == "*") {
			this.target = Place.NODE;
			delete this.attr;
		} else if (to == "-") {
			this.target = Place.CONT;
			delete this.attr;
		} else if (/\w+/.test(to)) {
			this.target = Place.ATTR;
			this.attr = to;
		} else {
			console.warn(`Invalid 'to:${to}'`);
		}
	}

	extend(from) {
		const { ancestor } = this;
		if (!ancestor) return;
		let parent = this.node;
		if (ancestor == "-") {
			if (from == Place.ATTR || from == Place.TAG) {
				this.target = from;
			} else {
				this.target = Place.CONT;
			}
		} else if (ancestor) {
			if (/^\*+$/.test(ancestor)) {
				let ups = ancestor.length - 1;
				while (ups-- > 0) {
					parent = parent.parentNode;
				}
			} else {
				parent = parent.closest(ancestor);
			}
			if (parent.parentNode) this.target = Place.NODE;
			else this.target = Place.CONT;
			this.node = parent;
		}
	}

	checkSibling(cursor, asc) {
		const node = asc ? cursor.nextSibling : cursor.previousSibling;
		if (!node) return false;
		const sel = asc ? this.after : this.before;
		if (typeof sel == "string") {
			if (node.nodeType == 1 && !node.matches(sel)) {
				return false;
			} else {
				return node;
			}
		} else if (!sel) {
			return false;
		}
		if (node.nodeType == 3 && /^\s*$/.test(node.nodeValue)) return node;
		if (asc) this.after--;
		else this.before--;
		return node;
	}

	removeSiblings() {
		const cursor = this.target == Place.TEXT ? this.text : this.node;
		const parent = cursor.parentNode;
		let cur;
		while ((cur = this.checkSibling(cursor, false))) {
			parent.removeChild(cur);
		}
		while ((cur = this.checkSibling(cursor, true))) {
			parent.removeChild(cur);
		}
		this.before = 0;
		this.after = 0;
	}

	extract() {
		const { doc, target } = this;
		let { node } = this;
		const frag = doc.createDocumentFragment();
		const cursor = doc.createTextNode("");
		if (target == Place.TEXT) {
			const hit = this.hits[this.index];
			const prev = this.hits.splice(0, this.index).join("");
			if (prev) {
				this.node.insertBefore(doc.createTextNode(prev), this.text);
			}
			this.text.nodeValue = "";
			const next = this.hits.splice(1).join("");
			if (next) {
				this.node.insertBefore(doc.createTextNode(next), this.text.nextSibling);
			}
			this.hits.push("");
			this.index = 0;
			this.node.insertBefore(cursor, this.text.nextSibling);
			frag.appendChild(doc.createTextNode(hit));
			return [frag, cursor];
		} else if (target == Place.CONT) {
			node = this.text;
			this.before = Infinity;
			this.after = Infinity;
		}
		node.parentNode.replaceChild(cursor, node);
		if (this.root == node) {
			this.root = cursor.parentNode;
		}
		let cur;
		while ((cur = this.checkSibling(cursor, false))) {
			frag.insertBefore(cur, null);
		}
		frag.appendChild(node);
		while ((cur = this.checkSibling(cursor, true))) {
			frag.appendChild(cur);
		}

		this.before = 0;
		this.after = 0;
		return [frag, cursor];
	}

	read() {
		const { node, target } = this;
		if (target == Place.TAG) {
			return node.tagName;
		} else if (target == Place.ATTR) {
			return node.getAttribute(this.attr);
		} else if (target == Place.TEXT || target == Place.CONT) {
			return this.text.nodeValue;
		} else {
			console.warn("Cannot read", this);
		}
	}

	write(hits, from = this) {
		const { node, attr, doc, target } = this;
		if (target == Place.CONT && !this.text) {
			node.textContent = "";
			this.text = this.doc.createTextNode("");
			node.appendChild(this.text);
		}

		const otherAtt = attr != from.attr || node != from.node;
		if (from.attr && otherAtt) clearAttr(from.node, from.attr);

		if (target == Place.TAG) {
			const is = node.getAttribute('is');
			this.replacement = [
				doc.importNode(doc.createElement(hits.join(''), is ? { is } : null), true),
				node
			];
		} else if (target == Place.ATTR) {
			if (from.target == Place.TEXT) {
				from.text.nodeValue = from.hits.join('');
			}
			const str = hits.join('');
			const tstr = str.trim();
			const attrList = node[attr + 'List'];
			if (hits.length == 1 && !hits[0] || tstr.length == 0) {
				clearAttr(node, attr);
			} else if (typeof node[attr] == "boolean") {
				node.setAttribute(attr, "");
			} else if (otherAtt && attrList) {
				for (const name of tstr.replace(/\s+/g, ' ').trim().split(' ')) {
					attrList.add(name);
				}
			} else {
				node.setAttribute(attr, attrList ? tstr : str);
			}
		} else { // TEXT, CONT, NODE
			let mutates = false;
			this.removeSiblings();
			const cursor = target == Place.NODE ? node : this.text;
			const parent = cursor.parentNode;
			for (let i = 0; i < hits.length; i++) {
				let item = hits[i];
				if (cursor.nodeType > 0 && item == null) continue;
				if (!item || !item.nodeType) {
					if (i == hits.length - 1 && cursor.nodeType == 3) {
						// reuse current text node for the last hit
						cursor.nodeValue = item;
						item = cursor;
						mutates = true;
					} else {
						item = doc.createTextNode(item == null ? "" : item);
					}
				} // else item can be a node or fragment
				if (parent && item != cursor) {
					parent.insertBefore(doc.importNode(item, true), cursor);
				}
			}
			if (!mutates && parent) {
				parent.removeChild(cursor);
				if (this.root == cursor) {
					this.root = parent.childNodes.length == 1 ? parent.firstChild : parent;
				}
			}
		}
	}
}

function clearAttr(node, attr) {
	if (node[attr] != null) node.setAttribute(attr, '');
	node.removeAttribute(attr);
}
