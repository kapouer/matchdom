import Expression from './expr.js';

class ParamError extends Error {
	constructor(msg) {
		super(msg);
		this.name = "ParamError";
	}
}
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
		for (let i = 0; i < hits.length; i++) {
			let hit = hits[i];
			if (hit === null || typeof hit == "string") {
				continue;
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
		}
	}

	mutate(hit) {
		let val = this.scope.data;
		if (val === undefined) val = this.data;
		if (/^[^\\]+$/.test(hit) == false) {
			// TODO this regexp seems odd
			return undefined;
		}
		const expr = this.expr = new Expression(this.symbols).parse(hit);
		const { beforeAll, beforeEach, afterEach, afterAll } = this.hooks;

		if (beforeAll) val = beforeAll(this, val, expr.filters);
		while (expr.filter < expr.filters.length) {
			if (val === undefined && !expr.last) break;
			const filter = expr.filters[expr.filter++];
			if (beforeEach) val = beforeEach(this, val, filter);
			val = this.run(filter.name, val, ...filter.params);
			if (afterEach) val = afterEach(this, val, filter);
			if (this.cancel) {
				expr.last = false; // probably a bad idea
				// FIXME skip = true -rename "last" to "skip" and invert the meaning
				val = undefined;
			}
		}
		if (expr.last && val === undefined) val = null;
		if (afterAll) val = afterAll(this, val, expr.filters);
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
			const tag = doc.createElement(tagName, is ? { is } : null);
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
				const str = list.join('').trim();
				let attrNode = node;
				if (!src.attr) {
					if (!node.children) attrNode = node.parentNode;
					if (!src.node.children) src.node.nodeValue = src.hits.join('');
				}
				const attrList = attrNode[attr + 'List'];
				if (!hits || !str) {
					clearAttr(attrNode, attr);
				} else if (typeof attrNode[attr] == "boolean") {
					attrNode.setAttribute(attr, "");
				} else if ((src.attr !== attr || src.node !== node) && attrList && typeof attrList.add == "function") {
					for (const name of str.replace(/[\n\t\s]+/g, ' ').trim().split(' ')) {
						attrList.add(name);
					}
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
		if (!it && val != null && typeof val[name] == "function") {
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
			if (it.length < params.length) {
				if (typed) {
					if (params.length == 2 && params[1] === "") {
						// [myfilter:] has a mandatory empty param
						params.length = 1;
					} else if (!mtype) {
						throw new ParamError("wrong number of parameters");
					}
				}
				for (let i = it.length; i < params.length; i++) {
					params[i] = this.check(val, params[i], mtype || '?');
				}
			}
			this.raw = val;
			return fn(this, ...params);
		} catch (ex) {
			if (this.matchdom.debug) throw ex;
			// eslint-disable-next-line no-console
			console.warn(name, "filter throws", ex.toString(), "in", this.expr.initial);
			return null;
		}
	}
	check(val, str, arg) {
		if (!arg || arg.startsWith('?')) arg = "any" + arg;
		const [type, def] = arg.split("?");
		if (str == null) {
			if (def == null) {
				throw new ParamError("Missing required type " + arg);
			} else if (type == "any") {
				return null;
			} else {
				str = def === "" ? null : def;
			}
		}
		const alts = type.split('|');
		if (alts.length > 1) {
			if (alts.includes(str)) return str;
			else throw new ParamError(`"${val}" is not of in enum ${type}`);
		}

		if (type == "filter") {
			if (str && this.plugins.filters[str] == null && (!val[str] || typeof val[str] != "function")) {
				throw new ParamError(`"${val}" is not of type ${type}`);
			}
		} else if (type == "path") {
			str = this.toPath(str, val);
		} else if (type == "any") {
			// check nothing
		} else {
			str = this.run('as', str, type);
		}
		if (typeof str == "string") str = this.decode(str);

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
		if (str == null) str = "";
		if (!str && ctxValue !== undefined && this.isSimpleValue(ctxValue)) return [];
		return str.split(this.symbols.path).map(str => this.decode(str));
	}

	decode(str) {
		try {
			return decodeURIComponent(str);
		} catch (ex) {
			return str;
		}
	}
}

function clearAttr(node, attr) {
	if (node[attr] != null) node.setAttribute(attr, '');
	node.removeAttribute(attr);
}

