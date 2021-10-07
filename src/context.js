import Expression from './expr.js';
import Place from './place.js';

class ParamError extends Error {
	constructor(msg) {
		super(msg);
		this.name = "ParamError";
	}
}
export default class Context {
	cancel = false

	static parse(symbols, str) {
		const { open, close } = symbols;
		const hits = this.tokenize(open, close, str);
		if (hits.length > 1 || hits.length == 1 && typeof hits[0] != "string") {
			return hits;
		} else {
			return;
		}
	}
	static tokenize(open, close, str) {
		const hits = [];
		this.fillTokens(open, close, hits, str, 0, str.length);
		return hits;
	}

	static fillTokens(open, close, hits, str, pos, len) {
		const openLen = open.length;
		const closeLen = close.length;
		while (pos < len) {
			const openPos = str.indexOf(open, pos);
			const closePos = str.indexOf(close, pos);
			if (openPos >= pos && (openPos < closePos || closePos < pos)) {
				if (pos != openPos) hits.push(str.substring(pos, openPos));
				const sub = [];
				pos = this.fillTokens(open, close, sub, str, openPos + openLen, len);
				if (sub.length > 0) hits.push(sub);
			} else if (closePos >= pos && (closePos < openPos || openPos < pos)) {
				if (pos != closePos) hits.push(str.substring(pos, closePos));
				return closePos + closeLen;
			} else {
				hits.push(str.substring(pos));
				pos = len;
			}
		}
		return pos;
	}

	constructor(md, data, scope) {
		this.data = data;
		this.scope = Object.assign({}, scope);
		this.matchdom = md;
		this.plugins = md.plugins;
		this.hooks = md.hooks;
		this.symbols = md.symbols;
		this.level = 0;
	}

	setup(hits, root, node, name) {
		this.src = new Place(root, node, name);
		this.src.hits = hits.slice();
		this.dest = new Place(root, node, name);
		this.dest.hits = hits;
		this.process(hits);
	}

	process(hits) {
		this.level++;
		for (let i = 0; i < hits.length; i++) {
			let hit = hits[i];
			if (hit === null || typeof hit == "string") {
				continue;
			}
			if (hit.length > 1 || typeof hit[0] != "string") {
				this.process(hit);
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

