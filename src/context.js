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
	#locales;

	constructor(md, data, scope) {
		this.data = data;
		this.scope = scope || {};
		this.md = md;
	}

	setup(hits, root, node, name) {
		this.src = new Place(hits, root, node, name);
		this.dest = this.src.clone();
		return this.process(this.dest, this.src);
	}

	process(dest, src = {}) {
		for (let i = 0; i < dest.hits.length; i++) {
			let hit = dest.hits[i];
			if (hit === null || typeof hit == "string") {
				continue;
			}
			src.index = dest.index = i;
			if (hit.length > 1 || typeof hit[0] != "string") {
				hit = this.process(dest.clone(hit));
				hit = this.unwrap(hit[0]);
			} else {
				hit = hit[0];
			}
			const val = this.mutate(hit);
			dest.hits[dest.index] = val !== undefined ? val : this.wrap(hit);
		}
		if (!src.hits) {
			// recursive
			dest.hits = [this.wrap(dest.hits.join(''))];
			src.index = dest.index = 0;
		}
		return dest.write(src);
	}

	mutate(hit) {
		if (hit.length == 0) return;
		let val = this.data;
		const expr = new Expression(this.md.symbols);
		try {
			expr.parse(hit);
		} catch {
			return;
		}
		this.expr = expr;
		const { beforeAll, afterAll } = this.md.hooks;
		const src = this.src.clone();
		const dest = this.dest.clone();
		for (const fn of beforeAll) {
			const ret = fn(this, val);
			if (ret !== undefined) val = ret;
		}
		while (expr.filter < expr.filters.length) {
			if (expr.last) {
				for (const [name, param] of expr.filters.slice(expr.filter + 1)) {
					if (name == "get" && param.startsWith('.')) {
						expr.last = false;
						break;
					}
				}
			}
			if (val === undefined && !expr.last || expr.cancel) {
				break;
			}
			const filter = expr.filters[expr.filter++];
			val = this.filter(val, filter);
		}
		if (expr.rebase !== undefined) {
			val = expr.rebase;
			delete expr.rebase;
		}
		for (const fn of afterAll) {
			const ret = fn(this, val);
			if (ret !== undefined) val = ret;
		}
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

	#filter(args, name, def) {
		const val = args[0];
		const { hooks } = this.md;
		const typed = def.length > 1;
		const fn = def.pop();
		let stop;
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
			const fi = this.check(val, args, i, arg);
			if (i === 0 && fi === undefined) {
				stop = true;
				break;
			}
			if (!mtype || fi !== undefined) args[i] = fi;
		}
		if (stop) {
			this.expr.cancel = true;
			return;
		}
		if (def.length < args.length) {
			if (typed) {
				if (args.length == 2 && args[1] === "") {
					// [myfilter:] has a mandatory empty param
					args.length = 1;
				} else if (!mtype) {
					throw new Context.ParamError("Wrong number of parameters");
				}
			}
			for (let i = def.length; i < args.length; i++) {
				const fi = this.check(val, args, i, mtype || '?');
				if (!mtype || fi !== undefined) args[i] = fi;
			}
		}
		let fval = args[0];
		const vars = args.slice(1);
		const before = hooks.before[name];
		if (before) {
			const ret = before(this, fval, vars);
			if (ret !== undefined) fval = ret;
		}
		this.raw = val;
		fval = fn(this, fval, ...vars);
		const after = hooks.after[name];
		if (after) {
			const ret = after(this, fval, vars);
			if (ret !== undefined) fval = ret;
		}
		return fval;
	}

	filter(val, filter, ...params) {
		const { debug } = this.md;
		if (!Array.isArray(filter)) {
			filter = [filter, ...params];
		}
		const [name, def] = this.getFilter(val, filter);
		if (!def) {
			const err = `Missing filter: ${name}`;
			if (debug) throw new Error(err);
			else console.warn(err);
			return val;
		}
		const args = filter.slice();
		args[0] = val;
		try {
			val = this.#filter(args, name, def);
		} catch (ex) {
			if (debug) throw ex;
			console.warn(filter, "filter throws", ex.toString(), "in", this.expr.initial);
			val = null;
		}
		return val;
	}
	check(val, params, i, arg) {
		let str = params[i];
		if (!arg || arg.startsWith('?')) arg = "any" + arg;
		const [type, def] = arg.split("?");
		if (def != null && (str == null || str === "")) {
			if (type == "any") {
				if (i === 0 && str === undefined) {
					str = def || null; // any do not skip undefined val
				}
				return str;
			} else if (def === "") {
				return str ?? null; // do not cast null
			} else {
				str = def; // cast def
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
			str = this.filter(str, ['as', type, ...params.slice(i + 1)]);
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
		} catch {
			return str;
		}
	}

	get locales() {
		if (!this.#locales) {
			if (typeof window != "undefined") {
				this.#locales = Array.from(window.navigator.languages);
				const { lang } = document.documentElement ?? {};
				if (lang) this.#locales.unshift(lang);
			} else {
				this.#locales = ['en'];
			}
		}
		return this.#locales;
	}
	set locales(list) {
		this.#locales = list;
	}

	getFilter(val, filter) {
		if (filter.length <= 1) filter.unshift("get");
		const name = filter[0];
		let def = this.md.filters[name];
		if (def) {
			if (!Array.isArray(def)) def = [def];
			else def = def.slice();
		}
		return [name, def];
	}

	wrap(str, to = 3) {
		const { open, close } = this.md.symbols;
		if (to & 1) str = open + str;
		if (to & 2) str = str + close;
		return str;
	}
	unwrap(str) {
		const { open, close } = this.md.symbols;
		return str.slice(open.length, -close.length);
	}
}
