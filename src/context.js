import Expression from './expr.js';
import Place from './place.js';

export default class Context {
	static ParamError = class extends Error {
		constructor(msg) {
			super(msg);
			this.name = "ParamError";
		}
	};

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

	raw;

	constructor(md, data, scope) {
		this.data = data;
		this.scope = scope || {};
		this.md = md;
	}

	setup(hits, root, node, name) {
		this.src = new Place(hits, root, node, name);
		this.dest = this.src.clone();
		this.process(this.dest);
	}

	process(place) {
		for (let i = 0; i < place.hits.length; i++) {
			let hit = place.hits[i];
			if (hit === null || typeof hit == "string") {
				continue;
			}
			if (hit.length > 1 || typeof hit[0] != "string") {
				hit = this.process(new Place(hit)).join('');
			} else {
				hit = hit[0];
			}
			this.src.index = place.index = i;
			const val = this.mutate(hit);
			place.hits[place.index] = val !== undefined ? val : this.wrap(hit);
		}
		return place.hits;
	}

	mutate(hit) {
		let val = this.data;
		if (/^[^\\]+$/.test(hit) == false) {
			// expressions with \ are not ours
			return undefined;
		}
		const expr = this.expr = new Expression(this.md.symbols).parse(hit);
		const { beforeAll, beforeEach, afterEach, afterAll } = this.md.hooks;
		const src = this.src.clone();
		const dest = this.dest.clone();

		if (beforeAll) val = beforeAll(this, val, expr.filters);
		while (expr.filter < expr.filters.length) {
			if (val === undefined && !expr.last || expr.cancel) break;
			const filter = expr.filters[expr.filter++];
			if (beforeEach) val = beforeEach(this, val, filter);
			val = this.filter(val, filter);
			if (afterEach) val = afterEach(this, val, filter);
		}
		if (afterAll) val = afterAll(this, val, expr.filters);
		if (expr.cancel) {
			Object.assign(this.src, src);
			Object.assign(this.dest, dest);
			return;
		}
		if (expr.last && val === undefined) val = null;
		return val;
	}

	format(val, name, fmt) {
		const fn = (this.md.formats[name] || {})[fmt];
		if (fn) {
			return fn(this, val);
		} else {
			console.warn("Unknown format", name, fmt);
			return val;
		}
	}

	filter(val, filter, ...params) {
		if (Array.isArray(filter)) {
			filter = filter.slice();
		} else {
			filter = [filter, ...params];
		}
		const [name, def] = this.getFilter(val, filter);
		if (!def) {
			console.info(name, "filter is missing");
			return val;
		}
		if (filter.length > 1) filter[0] = val;
		const typed = def.length > 1;
		const fn = def.pop();
		let stop;
		try {
			let mtype;
			for (let i = 0; i < def.length; i++) {
				let arg = def[i];
				if (arg == null) {
					throw new Error("Missing type");
				}
				if (arg.endsWith('*')) {
					if (mtype) {
						throw new Error("Checking multiple lists is not implemented");
					}
					arg = arg.slice(0, -1);
					mtype = arg;
				}
				const fi = this.check(val, filter, i, arg);
				if (i === 0 && fi === undefined) {
					stop = true;
					break;
				}
				if (!mtype || fi !== undefined) filter[i] = fi;
			}
			if (stop) {
				this.expr.cancel = true;
				return;
			}
			if (def.length < filter.length) {
				if (typed) {
					if (filter.length == 2 && filter[1] === "") {
						// [myfilter:] has a mandatory empty param
						filter.length = 1;
					} else if (!mtype) {
						throw new Context.ParamError("Wrong number of parameters");
					}
				}
				for (let i = def.length; i < filter.length; i++) {
					const fi = this.check(val, filter, i, mtype || '?');
					if (!mtype || fi !== undefined) filter[i] = fi;
				}
			}
			this.raw = val;
			return fn(this, ...filter);
		} catch (ex) {
			if (this.md.debug) throw ex;
			// eslint-disable-next-line no-console
			console.warn(name, "filter throws", ex.toString(), "in", this.expr.initial);
			return null;
		}
	}
	check(val, params, i, arg) {
		let str = params[i];
		if (!arg || arg.startsWith('?')) arg = "any" + arg;
		const [type, def] = arg.split("?");
		if (str == null && def != null) {
			if (type == "any") {
				if (i === 0 && str === undefined) str = null;
				return str;
			} else {
				str = def === "" ? null : def;
			}
		}
		const alts = type.split('|');
		if (str != null && alts.length > 1) {
			if (alts.includes(str)) return str;
			else throw new Context.ParamError(`"${str}" is not in enum ${type}`);
		}

		if (type == "any") {
			// check nothing
		} else {
			str = this.filter(str, 'as', type, ...params.slice(i + 1));
		}
		if (typeof str == "string" && i > 0) {
			str = this.decode(str);
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

	decode(str) {
		try {
			return decodeURIComponent(str);
		} catch (ex) {
			return str;
		}
	}

	getLang() {
		if (!this.lang && typeof window != "undefined") {
			this.lang = document.documentElement && document.documentElement.lang || window.navigator.language;
		}
		return this.lang;
	}

	getFilter(val, filter) {
		if (filter.length <= 1) filter.unshift("get");
		const name = filter[0];
		let def = this.md.filters[name];
		if (!def && val != null && typeof val[name] == "function") {
			const meth = val[name];
			def = (ctx, val, ...args) => {
				return meth.apply(val, args);
			};
		}
		if (def) {
			if (!Array.isArray(def)) def = [def];
			else def = def.slice();
		}
		return [name, def];
	}

	wrap(str) {
		return this.md.symbols.open + str + this.md.symbols.close;
	}
}
