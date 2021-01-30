import Expression from './expr.js';

export default class Context {
	#cancel = false
	constructor(md, data, scope, place) {
		this.data = data;
		this.scope = Object.assign({}, scope);
		this.matchdom = md;
		this.plugins = md.plugins;
		this.hooks = md.hooks;
		this.symbols = md.symbols;
		this.level = 0;
		place.index = 0;
		this.src = place;
		this.dest = Object.assign({}, place);
		this.dest.before = 0;
		this.dest.after = 0;
	}

	own(node) {
		const doc = this.src.node.ownerDocument;
		return doc.importNode(node, true);
	}

	parse(str) {
		const hits = this.tokenize(str);
		if (hits.length > 1 || hits.length == 1 && typeof hits[0] != "string") {
			return hits;
		} else {
			return;
		}
	}

	cancel() {
		this.#cancel = true;
	}

	processHits(hits) {
		this.level++;
		hits.forEach((hit, i) => {
			if (hit === null || typeof hit == "string") {
				return;
			}
			if (hit.length > 1 || typeof hit[0] != "string") {
				this.processHits(hit);
				hit = hit.join('');
			} else {
				hit = hit[0];
			}
			this.src.index = this.dest.index = i;
			const val = this.mutate(hit);
			if (val !== undefined) {
				hits[this.dest.index] = val;
			} else {
				hits[this.dest.index] = this.symbols.open + hit + this.symbols.close;
			}
		});
	}

	mutate(hit) {
		let val = this.scope.data;
		if (val === undefined) val = this.data;
		if (this.symbols.recheck.test(hit) == false) return undefined;
		const expr = new Expression(hit, this.symbols);
		this.expr = expr;
		const befEach = this.hooks.beforeEach;
		const aftEach = this.hooks.afterEach;

		if (this.hooks.before) this.hooks.before.call(this, val);
		while (expr.filter < expr.filters.length) {
			let filter = expr.filters[expr.filter++];
			if (befEach) befEach.call(this, val, filter);
			val = this.run(filter.name, val, ...filter.params);
			if (aftEach) aftEach.call(this, val, filter);
			if (this.#cancel) {
				expr.last = false;
				val = undefined;
			}
		}
		if (expr.last && val === undefined) val = null;
		if (this.hooks.after) this.hooks.after.call(this, val);
		return val;
	}

	read(place = this.dest) {
		const { node, attr, tag } = place;
		if (tag) return node.tagName;
		else if (attr) return node.getAttribute(attr);
		else return node.nodeValue;
	}

	write(hits) {
		const src = this.src;
		const { node, attr, tag, root } = this.dest;
		this.src = { node, attr, tag, root };

		const doc = node.ownerDocument;
		const list = Array.isArray(hits) ? hits : [hits];
		const parent = node.parentNode;

		if (tag) {
			const tagName = list.join('');
			const is = node.getAttribute('is');
			let tag = doc.createElement(tagName, is ? { is } : null);
			this.replacement = [this.own(tag), node];
		} else {
			let { before, after } = this.dest;
			let mutates = false;
			while (before-- > 0) {
				if (!node.previousSibling) break;
				parent.removeChild(node.previousSibling);
			}
			while (after-- > 0) {
				if (!node.nextSibling) break;
				parent.removeChild(node.nextSibling);
			}
			if (src.attr && (attr != src.attr || node != src.node)) {
				clearAttr(src.node, src.attr);
			}
			if (!attr) {
				for (let i = 0; i < list.length; i++) {
					let item = list[i];
					if (node.nodeType > 0 && item == null) continue;
					if (!item || !item.nodeType) {
						if (i == list.length - 1 && !node.children) {
							// reuse current text node for the last hit
							node.nodeValue = item;
							item = node;
							mutates = true;
						} else {
							item = doc.createTextNode((item == null) ? "" : item);
						}
					} // else item can be a node or fragment
					if (parent && item != node) {
						node.parentNode.insertBefore(this.own(item), node);
					}
				}
				if (src.node != node && src.node && !src.node.contains(node) && src.node.parentNode) {
					// dest node is a node and is replaced by another node
					src.node.parentNode.removeChild(src.node);
				}
				if (!mutates) {
					if (node.children) parent.removeChild(node);
					else node.nodeValue = "";
				}
			} else {
				let str = list.join('').trim();
				let attrNode = node;
				if (!src.attr) {
					if (!node.children) attrNode = node.parentNode;
					if (!src.node.children) src.node.nodeValue = src.hits.join('');
				}
				let attrList = attrNode[attr + 'List'];
				if (!hits || !str) {
					clearAttr(attrNode, attr);
				} else if (typeof attrNode[attr] == "boolean") {
					attrNode.setAttribute(attr, "");
				} else if ((src.attr !== attr || src.node !== node) && attrList && typeof attrList.add == "function") {
					str.replace(/[\n\t\s]+/g, ' ').trim().split(' ').forEach((name) => {
						attrList.add(name);
					});
				} else {
					attrNode.setAttribute(attr, str);
				}
			}
		}
	}
	tokenize(str) {
		const list = [];
		this._tokenize(list, str, 0, str.length);
		return list;
	}

	_tokenize(list, str, pos, len) {
		const { open, close } = this.symbols;
		const openLen = open.length;
		const closeLen = close.length;
		while (pos < len) {
			const openPos = str.indexOf(open, pos);
			const closePos = str.indexOf(close, pos);
			if (openPos >= pos && (openPos < closePos || closePos < pos)) {
				if (pos != openPos) list.push(str.substring(pos, openPos));
				const sub = [];
				pos = this._tokenize(sub, str, openPos + openLen, len);
				if (sub.length > 0) list.push(sub);
			} else if (closePos >= pos && (closePos < openPos || openPos < pos)) {
				if (pos != closePos) list.push(str.substring(pos, closePos));
				return closePos + closeLen;
			} else {
				list.push(str.substring(pos));
				pos = len;
			}
		}
		return pos;
	}

	run(name, ...params) {
		let it = this.plugins.filters[name];
		const val = params[0];
		if (!it && val != null && val[name]) {
			const meth = val[name];
			it = (ctx, val, ...args) => {
				return meth.apply(val, args);
			};
		}
		if (it == null) {
			console.info(name, "filter is missing");
			return val;
		}
		it = Array.isArray(it) ? it.slice() : [it];
		const fn = it.pop();
		try {
			it.forEach((arg, i) => {
				if (arg === null) return; // no check
				const [type, def] = arg.split('?');
				params[i] = this.check(val, params[i], type, def);
			});
			return fn(this, ...params);
		} catch (ex) {
			console.info(name, "filter throws", ex.toString(), params);
			return null;
		}
	}
	check(val, str, type, def) {
		if (str == null) {
			if (def == null) {
				throw new ParamError();
			} else if (type) {
				str = def;
			}
		}
		if (type) {
			if (type == "filter") {
				if (this.plugins.filters[str] == null && (!val[str] || typeof val[str] != "function")) {
					throw new ParamError(val, type);
				}
			} else if (type == "path") {
				str = this.toPath(str, val);
			} else if (type == "any" || type == "*") {
				// check nothing
			} else {
				str = this.run('as', str, type);
			}
		}
		return str;
	}
	isSimpleValue(val) {
		if (val == null) return true;
		if (["boolean", "number", "string"].includes(typeof val)) return true;
		const typ = Object.prototype.toString.call(val).slice(8, -1).toLowerCase();
		return [
			"array", "bigint", "date", "error",
			"function", "generator",
			"regexp", "symbol"
		].includes(typ);
	}

	toPath(str, ctxValue) {
		if (str == null) return [];
		if (str === "" && ctxValue !== undefined && this.isSimpleValue(ctxValue)) return [];
		return str.split(this.symbols.path);
	}
}

function clearAttr(node, attr) {
	if (node[attr] != null) node.setAttribute(attr, '');
	node.removeAttribute(attr);
}

class ParamError extends Error {
	constructor(type, val) {
		super();
		this.type = type;
		this.val = val;
	}
	toString() {
		if (!this.type && this.val == null) {
			return "ParamError: missing param";
		} else {
			return `ParamError: ${this.val} is not of type ${this.type}`;
		}
	}
}
