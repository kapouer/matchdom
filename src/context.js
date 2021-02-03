import Expression from './expr.js';

export default class Context {
	cancel = false
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
		const expr = this.expr = new Expression(this.symbols).parse(hit);
		const befEach = this.hooks.beforeEach;
		const aftEach = this.hooks.afterEach;

		if (this.hooks.before) this.hooks.before.call(this, val);
		while (expr.filter < expr.filters.length) {
			let filter = expr.filters[expr.filter++];
			if (befEach) befEach.call(this, val, filter);
			val = this.run(filter.name, val, ...filter.params);
			if (aftEach) aftEach.call(this, val, filter);
			if (this.cancel) {
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

		const doc = src.node.ownerDocument;
		const list = Array.isArray(hits) ? hits : [hits];

		if (tag) {
			const tagName = list.join('');
			const is = node.getAttribute('is');
			let tag = doc.createElement(tagName, is ? { is } : null);
			this.replacement = [this.own(tag), node];
		} else {
			const parent = node ? node.parentNode : null;
			let { before, after } = this.dest;
			let mutates = false;
			while (node && before-- > 0) {
				if (!node.previousSibling) break;
				parent.removeChild(node.previousSibling);
			}
			while (node && after-- > 0) {
				if (!node.nextSibling) break;
				parent.removeChild(node.nextSibling);
			}
			if (src.attr && (attr != src.attr || node != src.node)) {
				clearAttr(src.node, src.attr);
			}
			if (src.node && src.node != node && (!node || !src.node.contains(node)) && src.node.parentNode && !attr) {
				// dest node is a node and is replaced by another node
				src.node.parentNode.removeChild(src.node);
			}
			if (!node) {
				// do nothing more
			} else if (!attr) {
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
			// eslint-disable-next-line no-console
			console.info(name, "filter is missing");
			return val;
		}
		const typed = Array.isArray(it);
		it = typed ? it.slice() : [it];
		const fn = it.pop();
		try {
			let mtype;
			for (let i = 0; i < it.length; i++) {
				let arg = it[i];
				if (arg == null) {
					throw new Error("missing type");
				}
				if (arg.endsWith('*')) {
					if (mtype) {
						throw new Error("cannot check multiple lists");
					}
					arg = arg.slice(0, -1);
					mtype = arg;
				}
				params[i] = this.check(val, params[i], arg);
			}
			if (typed && it.length < params.length) {
				if (params.length == 2 && params[1] === null) {
					// [myfilter:] has a mandatory empty param
				} else if (!mtype) {
					throw new ParamError("length");
				} else {
					for (let i = it.length; i < params.length; i++) {
						params[i] = this.check(val, params[i], mtype);
					}
				}
			}
			return fn(this, ...params);
		} catch (ex) {
			if (this.matchdom.debug) throw ex;
			// eslint-disable-next-line no-console
			console.warn(name, "filter throws", ex);
			return null;
		}
	}
	check(val, str, arg) {
		let [type, def] = arg.split("?");
		if (type === "") type = "any";
		if (str == null) {
			if (def == null) {
				throw new ParamError("");
			} else if (type == "any") {
				return null;
			} else {
				str = def;
			}
		}

		if (type == "filter") {
			if (this.plugins.filters[str] == null && (!val[str] || typeof val[str] != "function")) {
				throw new ParamError(val, type);
			}
		} else if (type == "path") {
			str = this.toPath(str, val);
		} else if (type == "any") {
			// check nothing
		} else {
			str = this.run('as', str, type);
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
		this.name = "ParamError";
		this.type = type;
		this.val = val;
	}
	toString() {
		if (!this.type && this.val == null) {
			return `${this.name}: missing param`;
		} else {
			return `${this.name}: ${this.val} is not of type ${this.type}`;
		}
	}
}
