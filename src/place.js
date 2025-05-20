export default class Place {
	static TEXT = 0;
	static NODE = 1;
	static CONT = 2;
	static ATTR = 3;
	static TAG = 4;

	constructor(hits, root, node, name) {
		this.index = 0;
		this.hits = hits;
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

	clone(hits) {
		const place = Object.assign(
			new Place(),
			this
		);
		place.hits = (hits ?? this.hits).slice();
		return place;
	}

	get doc() {
		return this.root.ownerDocument;
	}

	reduceHit() {
		this.hits.splice(0, this.index);
		this.hits.splice(1);
		this.index = 0;
	}

	restrict(to, sel) {
		if (sel) {
			const range = parseRange(sel);
			let node = this.node;
			let cur;
			while ((cur = checkSibling(node, range))) {
				node = cur;
			}
			this.node = node;
		}
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
		const { ancestor, node } = this;
		if (!ancestor) return;
		let parent = node;
		let target;
		if (ancestor == "-") {
			if (from == Place.ATTR || from == Place.TAG) {
				target = from;
			} else {
				target = Place.CONT;
			}
		} else if (ancestor == "/") {
			while (parent.parentNode?.attributes) {
				parent = parent.parentNode;
			}
		} else if (/^\*+$/.test(ancestor)) {
			let ups = ancestor.length - 1;
			while (ups-- > 0) {
				parent = parent.parentNode;
			}
		} else {
			parent = parent.closest(ancestor);
		}
		if (!parent) {
			console.warn("ancestor not found:", ancestor);
			parent = node;
		}
		if (!target) {
			if (parent.parentNode) target = Place.NODE;
			else target = Place.CONT;
		}
		this.target = target;
		this.node = parent;
	}

	extract() {
		const { doc, target } = this;
		let { node } = this;
		const frag = doc.createDocumentFragment();
		const cursor = doc.createTextNode("");
		const bef = parseRange(this.before);
		const aft = parseRange(this.after);
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
			bef.pos = -Infinity;
			aft.pos = Infinity;
		}
		node.parentNode.replaceChild(cursor, node);
		if (this.root == node) {
			this.root = cursor.parentNode;
		}
		let cur;
		while ((cur = checkSibling(cursor, bef))) {
			frag.insertBefore(cur, null);
		}
		frag.appendChild(node);
		while ((cur = checkSibling(cursor, aft))) {
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

	write(from) {
		let allNulls = true;
		let allTrue = true;
		let allBools = true;
		let hits = this.hits.filter(val => {
			if (val !== null) allNulls = false;
			if (val === true); // do nothing
			else if (val === false) allTrue = false;
			else allBools = false;
			return val !== undefined;
		});
		// [a][b] returns null if a and b are null
		// likewise for booleans
		if (hits.length > 0) {
			if (allNulls) hits = [null];
			else if (allBools) hits = [allTrue];
		}

		const { node, attr, doc, target } = this;
		if (target == Place.CONT && !this.text) {
			node.textContent = "";
			this.text = this.doc.createTextNode("");
			node.appendChild(this.text);
		}

		const another = attr != from.attr || node != from.node;
		if (from.attr && another) from.node.removeAttribute(from.attr);

		const bef = parseRange(this.before);
		const aft = parseRange(this.after);

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
			const val = { another };
			hits = hits.map(hit => {
				if (hit?.nodeType) {
					return Array.from(hit.nodeType == 11 ? hit.childNodes : [hit])
						.map(node => {
							if (node.nodeType == 1) {
								return node.outerHTML;
							} else if (node.nodeType == 3) {
								return node.nodeValue;
							}
						}).join('');
				} else {
					return hit;
				}
			});
			if (allNulls) {
				val.str = null;
				val.trm = '';
			} else if (allBools) {
				val.str = allTrue;
				val.trm = '';
			} else {
				val.str = hits.join('');
				val.trm = val.str.replace(/\s+/g, ' ').trim();
			}

			let cur = node;
			bef.sel ||= '*';
			aft.sel ||= '*';
			while ((cur = checkSibling(cur, bef))) {
				writeAttr(cur, attr, val);
			}
			writeAttr(node, attr, val);
			cur = node;
			while ((cur = checkSibling(cur, aft))) {
				writeAttr(cur, attr, val);
			}
			this.before = 0;
			this.after = 0;
		} else { // TEXT, CONT, NODE
			const cursor = target == Place.NODE ? node : this.text;
			const parent = cursor.parentNode;

			let cur;
			while ((cur = checkSibling(cursor, bef))) {
				parent.removeChild(cur);
			}
			while ((cur = checkSibling(cursor, aft))) {
				parent.removeChild(cur);
			}
			this.before = 0;
			this.after = 0;
			let mutates = false;

			for (let i = 0; i < hits.length; i++) {
				let item = hits[i];
				if (cursor.nodeType != 3 && item == null) continue;
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
			if (parent) {
				if (!mutates) {
					parent.removeChild(cursor);
				}
				if (this.root == cursor) {
					this.root = parent.childNodes.length == 1 ? parent.firstChild : parent;
				}
			}
		}
		return hits;
	}
}

function writeAttr(node, attr, { another, str, trm }) {
	const attrList = node[attr + 'List'];
	const prop = {
		readonly: 'readOnly',
		selected: 'defaultSelected',
		checked: 'defaultChecked'
	}[attr] ?? attr;

	if (typeof node[prop] == "boolean") {
		if (str === true) node.setAttribute(attr, "");
		else if (!str) node.removeAttribute(attr);
		else node.setAttribute(attr, str);
	} else if (attrList) {
		if (another) for (const name of trm.split(' ')) {
			if (name.length) attrList.add(name);
		} else {
			node.setAttribute(attr, trm);
		}
		if (attrList.length == 0) node.removeAttribute(attr);
	} else if (str != null) {
		node.setAttribute(attr, str);
	} else {
		node.removeAttribute(attr);
	}
}

function checkSibling(cursor, range) {
	if (!range.pos) return;
	const node = range.dir ? cursor.nextSibling : cursor.previousSibling;
	if (!node) return;
	if (range.sel) {
		if (node.nodeType != 1) return checkSibling(node, range);
		if (!node.matches(range.sel)) return;
	} else if (node.nodeType == 3 && /^\s*$/.test(node.nodeValue)) {
		return node;
	}
	range.pos--;
	return node;
}

function parseRange(v) {
	if (!v) {
		return { pos: 0 };
	} else if (v == "*") {
		return { dir: true, pos: Infinity };
	} else {
		const m = v.match(/^([+-]?)(\d*)(.*)$/);
		const dir = m[1] == "-" ? false : true;
		let i;
		if (m[2] == "") {
			if (m[3].startsWith('*')) {
				i = Infinity;
				m[3] = m[3].substring(1);
			} else {
				i = 1;
			}
		} else {
			i = parseInt(m[2]);
			if (Number.isNaN(i)) i = 0;
		}
		return {
			dir,
			pos: i,
			sel: m[3]
		};
	}
}
