import './polyfills.js';
import * as Filters from './filters.js';
import Symbols from './symbols.js';
import Expression from './expr.js';
import What from './what.js';

export default class Matchdom {
	constructor({ filters, nodeFilter }) {
		this.nodeFilter = nodeFilter;
		this.filters = Object.assign({}, Filters, filters);
	}
	merge(parent, data, scope) {
		if (data == null) data = {};
		let wasText = false;
		let list;
		if (typeof parent == "string") {
			wasText = true;
			parent = {
				nodeValue: parent
			};
			list = [parent];
		} else {
			list = typeof parent.forEach == "function" ? parent : [parent];
		}

		list.forEach((root) => {
			const replacements = [];
			this.matchEachDom(root, (node, hits, attr) => {
				const what = new What(data, node, attr, scope);
				if (wasText) what.mode = "text";
				what.hits = hits;
				what.level = 0;
				this.mutateHits(what, hits);
				let allNulls = true;
				let allTrue = true;
				let allBools = true;
				hits = hits.filter(function (val) {
					if (val !== null) allNulls = false;
					if (val === true); // do nothing
					else if (val === false) allTrue = false;
					else allBools = false;
					return val !== undefined;
				});
				if (hits.length > 0) {
					let result;
					if (allNulls) result = null;
					else if (allBools) result = allTrue;
					else result = hits;
					what.set(result);
				}
				if (what.replacement) replacements.unshift(what.replacement);
				if (what.ancestor) {
					parent = what.ancestor;
					delete what.ancestor;
				}
			});
			replacements.forEach(function (pair) {
				const old = pair[1];
				const tag = pair[0];
				for (let att of old.attributes) {
					tag.setAttribute(att.name, att.value);
				}
				while (old.firstChild) tag.appendChild(old.firstChild);
				if (old.parentNode) {
					old.parentNode.replaceChild(tag, old);
				} else if (old == parent) {
					parent = tag;
				}
			});
		});
		return wasText ? parent.nodeValue : parent;
	}

	mutateHits(what, hits) {
		const scopePath = what.scope.path;
		const scopeIsKey = !!what.scope.iskey;
		what.level++;
		hits.forEach((hit, i) => {
			if (hit === null || typeof hit == "string") {
				return;
			}
			if (hit.length > 1 || typeof hit[0] != "string") {
				hit = this.mutateHits(what, hit).join('')
			} else {
				hit = hit[0];
			}
			what.index = i;
			what.expr = new Expression(hit, this.filters);
			let val;
			if (what.expr.check()) {
				const path = what.expr.path;
				let beg = 0;
				if (path[0] == what.scope.alias) {
					beg = 1;
					if (scopeIsKey) {
						delete what.scope.iskey;
						if (path.length >= 2) {
							if (path[1] == "key") {
								what.scope.iskey = true;
								beg = 2;
							} else if (path[1] == "val") {
								what.scope.iskey = false;
								beg = 2;
							}
						}
					}
					what.scope.path = scopePath.concat(path.slice(beg));
				} else {
					what.scope.path = path.slice(beg);
				}
				val = this.mutate(what);
			}
			if (val !== undefined) {
				if (what.level == 1 && typeof val == "string") hits[what.index] = { val: val };
				else hits[what.index] = val;
			} else {
				hits[what.index] = Symbols.open + hit + Symbols.close;
			}
		});
		what.scope.path = [];
		return hits;
	}

	mutate(what) {
		const expr = what.expr;
		let val = what.scope.data && expr.get(what.scope.data);
		if (val === undefined) val = expr.get(what.data);
		const prehooks = [];
		const posthooks = [];
		if (expr.prehook) prehooks.push(expr.prehook);
		if (expr.posthook) posthooks.push(expr.posthook);
		while (prehooks.length || expr.filter < expr.filters.length || posthooks.length) {
			let filter = prehooks.shift() || expr.filters[expr.filter++] || posthooks.shift();
			if (val !== null) what.val = val;
			let ret = filter.fn.apply(this, [val, what].concat(filter.params));
			if (ret !== undefined) val = ret;
			if (what.cancel) {
				expr.last = false;
				val = undefined;
			}
		}

		if (expr.last && val === undefined) val = null;
		return val;
	}

	matchEachDom(root, fn) {
		let val;
		if (root.documentElement) {
			root = root.documentElement;
		} else if (!root.ownerDocument) {
			val = root.nodeValue;
			if (val != null) fn(root, this.tokenize(root.nodeValue));
			return;
		}
		const what = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT;
		// old IE need all params
		const it = root.ownerDocument.createNodeIterator(root, what, null, false);
		const nf = this.nodeFilter;
		let node;
		while ((node = it.nextNode())) {
			if (!(nf ? nf(node, it) : true)) continue;
			if (node.nodeType == Node.ELEMENT_NODE) {
				this.matchAttributes(node).forEach(function (atthit) {
					fn(node, atthit.list, atthit.attr);
				});
				let hits = this.tokenize(node.tagName.toLowerCase());
				if (hits.length > 1 || hits.length == 1 && typeof hits[0] != "string") fn(node, hits, true);
			} else {
				val = node.nodeValue;
				if (val != null) {
					let hits = this.tokenize(node.nodeValue);
					if (hits.length > 1 || hits.length == 1 && typeof hits[0] != "string") {
						fn(node, hits);
					}
				}
			}
		}
	}

	matchAttributes(node) {
		const hits = [];
		for (let att of node.attributes) {
			if (!att.value) continue;
			let list = this.tokenize(att.value);
			if (!list.length) continue;
			hits.push({
				attr: att.name,
				list: list
			});
		}
		return hits;
	}

	tokenize(str) {
		const list = [];
		this._tokenize(list, str, 0, str.length);
		return list;
	}
	_tokenize(list, str, pos, len) {
		while (pos < len) {
			const openPos = str.indexOf(Symbols.open, pos);
			const closePos = str.indexOf(Symbols.close, pos);
			if (openPos >= pos && (openPos < closePos || closePos < pos)) {
				if (pos != openPos) list.push(str.substring(pos, openPos));
				const sub = [];
				pos = this._tokenize(sub, str, openPos + 1, len);
				if (sub.length > 0) list.push(sub);
			} else if (closePos >= pos && (closePos < openPos || openPos < pos)) {
				if (pos != closePos) list.push(str.substring(pos, closePos));
				return closePos + 1;
			} else {
				list.push(str.substring(pos));
				pos = len;
			}
		}
		return pos;
	}
}
