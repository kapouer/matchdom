export const types = {
	path(ctx, str) {
		if (str == null) return [];
		if (Array.isArray(str) && str.every(it => typeof it == "string")) return str;
		if (!str && ctx.raw !== undefined && ctx.isSimpleValue(ctx.raw)) return [];
		return str.split(ctx.md.symbols.path).map(str => ctx.decode(str));
	},
	filter(ctx, str, params) {
		const [name, def] = ctx.getFilter(ctx.raw, [str, ...params]);
		if (!def) {
			throw new ctx.constructor.ParamError(`"${name}" is not a filter`);
		}
		return str;
	},
	array(ctx, val) {
		if (val === undefined) return val;
		else if (val == null) return [];
		else if (typeof val == "string") return [val];
		else if (Array.isArray(val)) return val;
		else if (typeof val.forEach == "function" || typeof val.item == "function" && typeof val.length == "number" || typeof val[Symbol.iterator] == 'function'
		) {
			return Array.from(val);
		} else {
			val = [val];
		}
		return val;
	}
};

export const filters = {
	const(x, val, param) {
		return param || "";
	},
	get: ['?', 'path', (ctx, data, path) => {
		const { expr } = ctx;
		if (path.length == 0) {
			if (expr.filter > 1) {
				if (expr.rebase === undefined) {
					expr.rebase = data;
				} else {
					data = expr.rebase;
					delete expr.rebase;
				}
			}
			return data;
		} else {
			return ctx.expr.get(data, path, ctx.data);
		}
	}],
	path: ['?', 'path', (ctx, d, path) => {
		return ctx.expr.get(ctx.expr.path, path);
	}],
	assign: ['?', 'path*', (ctx, data, ...paths) => {
		const params = ['set'];
		while (paths.length) {
			const dst = paths.shift();
			const src = paths.shift();
			if (!src) {
				// only one parameter
				params.push(dst, data);
			} else {
				const val = ctx.filter(data, ['get', src]);
				if (val === undefined) {
					ctx.expr.cancel = true;
					break;
				}
				params.push(dst, val);
			}
		}
		if (ctx.expr.cancel) return;
		if (params.length > 1) ctx.filter(data, params);
		return data;
	}],
	set: ['object?', '?*', (ctx, data, ...params) => {
		if (!data) return data;
		while (params.length) {
			const str = params.shift();
			let act = 0, path;
			if (Array.isArray(str)) {
				path = str.slice();
			} else {
				if (str.startsWith('+')) act = 1;
				else if (str.startsWith('-')) act = 2;
				path = types.path(ctx, act ? str.slice(1) : str);
				// ctx.expr.set allow abs/rel paths - set filter only allows relative path
				if (path[0] !== "") path.unshift("");
			}
			const key = path.pop();
			const obj = ctx.expr.set(data, path, ctx);
			const val = params.shift();
			if (obj == null) {
				continue;
			}
			const sub = obj[key];
			if (!act) {
				if (sub == null || typeof sub != "object" || val == null || typeof val != "object") {
					if (typeof obj.set == "function") {
						obj.set(key, val);
					} else {
						obj[key] = val;
					}
				} else if (typeof sub.set == "function") {
					for (const [skey, sval] of Object.entries(val)) {
						if (sval === undefined) sub.delete(skey);
						else sub.set(skey, sval ?? "");
					}
				} else {
					Object.assign(sub, val);
				}
			} else if (act == 1) {
				if (typeof obj.append == "function") obj.append(key, val);
				else if (sub == null) obj[key] = val;
				else if (typeof sub.add == "function") sub.add(val);
				else if (typeof sub.push == "function") sub.push(val);
				else obj[key] = [sub, val];
			} else if (act == 2 && sub != null) {
				if (typeof sub.indexOf == "function") {
					const index = sub.indexOf(val);
					if (index >= 0) sub.splice(index, 1);
				} else if (typeof sub.delete == "function") {
					sub.delete(val);
				} else if (typeof sub == "object") {
					sub[key] = undefined; // triggers a setter
					delete sub[key];
				} else if (sub == val) {
					obj[key] = undefined;
					delete obj[key];
				}
			}
		}
		return data;
	}],
	omit: ['object', 'str*', (ctx, obj, ...list) => {
		const del = typeof obj.delete == "function";
		for (const key of list) {
			if (del) {
				obj.delete(key);
			} else {
				obj[key] = undefined; // in case there is a setter
				delete obj[key];
			}
		}
		return obj;
	}],
	only: ['object', 'str*', (ctx, obj, ...list) => {
		const del = typeof obj.delete == "function";
		for (const key of (typeof obj.keys == "function") ? obj.keys() : Object.keys(obj)) {
			if (list.includes(key)) continue;
			if (del) {
				obj.delete(key);
			} else {
				obj[key] = undefined; // in case there is a setter
				delete obj[key];
			}
		}
		return obj;
	}],
	pick: ['object', 'path*', (ctx, data, ...paths) => {
		const ret = {};
		for (const path of paths) {
			if (path.length == 0) path.push('');
			path.unshift('');
			const val = ctx.filter(data, ['get', path]);
			if (val !== undefined) ret[path.pop()] = val;
		}
		return ret;
	}],
	as(ctx, val, type, ...params) {
		const str = val?.toString?.() ?? val;
		if (type == "none" || type == "undefined") {
			if (!str) return undefined;
			else return val;
		} else if (type == "null") {
			if (!str) return null;
			else return val;
		} else if (val === undefined) {
			// may happen when called by another filter
			return val;
		}
		if (type == "bool" || type == "boolean") {
			if (str == "true" || str == "1") val = true;
			else if (str == "false" || str == "0") val = false;
			else if (val instanceof Date) val = Boolean(val.getTime());
			else val = Boolean(val);
			return val;
		} else if (type == "str" || type == "string") {
			if (val == null) return "";
			else return str;
		} else if (type == "int" || type == "integer") {
			val = Number.parseInt(val);
			if (Number.isNaN(val)) val = 0;
			return val;
		} else if (type == "float" || type == "num" || type == "numeric") {
			val = Number.parseFloat(val);
			if (Number.isNaN(val)) val = 0;
			return val;
		} else if (type == "object") {
			if (val != null && typeof val == "object" && !Array.isArray(val)) return val;
		} else {
			const fn = ctx.md.formats.as[type] || ctx.md.types[type];
			if (!fn) throw new Error(`Unknown type: ${type}`);
			return fn(ctx, val, params);
		}
	},
	is(ctx, val, type, ...params) {
		if (type in ctx.md.formats.as) {
			throw new Error(`Cannot check as format: ${type}`);
		}
		if (type == "null") {
			return val == null;
		} else if (type == "undefined" || type == "none") {
			// filter value, if optional and undefined, is mapped to null
			return ctx.raw === undefined;
		} else {
			return ctx.filter(val, ['as', type, ...params]) === val;
		}
	},
	lang(ctx, val, locale) {
		console.warn(`deprecated: 'lang' is renamed 'locales'`);
		ctx.locales = [locale];
		return val;
	},
	locales(ctx, val, ...locales) {
		ctx.locales = locales;
		return val;
	},
	at: ['?', 'str?', 'str?', 'str?', (ctx, val, ancestor, after, before) => {
		if (val === undefined) return val;
		const { dest } = ctx;
		dest.ancestor = ancestor;
		if (before != null) before = '-' + before;
		dest.before = before;
		dest.after = after;
		if (ancestor) dest.reduceHit();
		dest.extend(ctx.src.target);
		return ctx.raw;
	}],
	prune: ['?', 'str?', 'str?', 'str?', (ctx, val, ...params) => {
		if (val === undefined) return val;
		if (!val) {
			params.unshift('at');
			ctx.filter(null, params);
		}
		return null;
	}],
	fail: ['bool?', '?*', (ctx, test, ...args) => {
		if (!test) return ctx.filter(null, 'at', ...args);
		else return ctx.raw;
	}],
	from: ['?', 'str?', 'str?', (ctx, val, to, range) => {
		ctx.filter(val, ['to', to, range]);
		return ctx.dest.read();
	}],
	to: ['?', 'str?', 'str?', ({ src, dest, raw }, val, to, range) => {
		if (to) {
			// prevents merging of current expression
			src.hits[src.index] = null;
			if (!src.attr) {
				dest.reduceHit();
			}
		}
		dest.restrict(to, range);
		return raw;
	}],
	slice: ['?', 'int?', 'int?', (ctx, val, a, b) => {
		if (!val || a == null) return ctx.raw;
		if (b == null) b = undefined;
		if (val.slice) return val.slice(a, b);
		else return val;
	}]
};

export const formats = {
	as: {
		clone(ctx, obj) {
			if (ctx.isSimpleValue(obj)) return obj;
			if (Array.isArray(obj)) return obj.slice();
			const copy = new (Object.getPrototypeOf(obj).constructor)(obj);
			if (copy === obj) return Object.assign({}, obj);
			else return copy;
		},
		list({ expr }, val, opts) {
			if (!val) return null;
			if (typeof val == "object") {
				const list = [];
				for (const [k, v] of Object.entries(val)) {
					if (v) list.push(k);
				}
				return list.length ? list.join(opts?.[0] ?? ' ') : null;
			} else {
				return expr.path[expr.path.length - 1];
			}
		}
	}
};
