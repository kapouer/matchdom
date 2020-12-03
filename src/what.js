import { clearAttr } from './utils.js';

export default class What {
	constructor(data, node, attr, scope) {
		this.mode = 'br';
		this.data = data;
		this.scope = Object.assign({ path: [] }, scope);
		if (attr === true) {
			this.tag = true;
			attr = false;
		}
		if (attr) {
			this.initialAttr = attr;
			this.attr = attr;
			this.parent = node;
		} else {
			this.node = node;
			this.parent = node.parentNode;
		}
	}
	get() {
		if (this.node) return this.node.nodeValue;
		else return this.parent.getAttribute(this.attr);
	}

	set(hits) {
		const node = this.node;
		const parent = this.parent;
		if (!parent && !this.mode) this.mode = "text";
		const mode = this.mode;

		const doc = node ? node.ownerDocument : null;
		const list = [];

		if (hits != null && hits !== true && hits !== false) {
			if (!Array.isArray(hits)) hits = [hits];
			hits.forEach(function (hit) {
				if (hit == null) return;
				let isVal = false;
				if (hit.val != null) {
					hit = hit.val;
					isVal = true;
				}
				hit = hit.childNodes || hit;
				if (mode == "html" && hit.item) {
					for (let i = 0; i < hit.length; i++) list.push(hit.item(i));
				} else if (typeof hit == "object") {
					list.push(hit);
				} else {
					hit = hit.toString();
					if (mode == "br" && doc) {
						const lines = isVal ? hit.split('\n') : [hit];
						for (let i = 0; i < lines.length; i++) {
							if (i > 0) list.push(doc.createElement('br'));
							list.push(lines[i]);
						}
					} else {
						list.push(hit);
					}
				}
			});
		} else {
			list.push(hits);
		}

		if (this.tag) {
			if (!doc) return;
			let str = list.join('');
			let tag = doc.createElement('body');
			// customize built-in elements compatibility
			const is = node.getAttribute('is');
			if (is) str += ' is="' + is + '"';
			tag.innerHTML = '<' + str + '></' + str + '>';
			tag = tag.firstChild;
			this.replacement = [tag, node];
			return;
		}

		if (node) {
			if (mode == "text") {
				node.nodeValue = list.length == 1 ? list[0] : list.join('');
			} else if (!parent) {
				// do nothing
			} else {
				let mutates = false;
				list.forEach(function (item, i) {
					if (item == null) return;
					if (!item.nodeType) {
						if (item === "") return;
						if (i == list.length - 1) {
							mutates = true;
							node.nodeValue = item;
							return;
						} else {
							item = doc.createTextNode(item);
						}
					}
					parent.insertBefore(item, node);
				});
				if (!mutates) node.nodeValue = "";
			}
		}
		if (this.initialAttr && this.attr != this.initialAttr) {
			clearAttr(this.parent, this.initialAttr);
		}

		if (this.attr) {
			let str = list.join('').trim();
			this.initialAttr = this.attr;
			if (hits === false || hits == null || (this.attr == "class" && str === "")) {
				clearAttr(this.parent, this.attr);
			} else {
				if (hits === true) {
					if (this.attr.startsWith('data-') == false) str = "";
				} else if (this.attr == "class" && typeof str == "string") {
					str = str.replace(/[\n\t\s]+/g, ' ').trim();
				}
				this.parent.setAttribute(this.attr, str);
			}
		}
	}
}
