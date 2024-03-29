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
	get: ['?', 'path?', (ctx, data, path) => {
		const { expr } = ctx;
		if (path.length == 0) {
			if (expr.filter > 1) {
				if (expr.rebase === undefined) {
					expr.rebase = data;
				} else {
					data = expr.rebase;
				}
			}
			return data;
		} else {
			if (expr.filter == expr.filters.length) {
				delete expr.rebase;
			}
			return ctx.expr.get(data, path, ctx.data);
		}
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
				params.push(dst, ctx.filter(data, ['get', src]));
			}
		}
		ctx.filter(data, params);
		return data;
	}],
	set: ['obj?', '?*', (ctx, data, ...params) => {
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
				if (typeof obj.append == "function") {
					obj.append(key, val);
				} else {
					if (sub == null) obj[key] = val;
					else if (typeof sub.add == "function") sub.add(val);
					else if (typeof sub.push == "function") sub.push(val);
					else obj[key] = [sub, val];
				}
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
	omit: ['obj', 'path*', (ctx, obj, ...list) => {
		for (const path of list) {
			const copy = path.slice();
			const key = copy.pop();
			const sub = ctx.expr.get(obj, copy);
			if (sub == null) continue;
			if (typeof sub.delete == "function") {
				sub.delete(key);
			} else if (typeof sub == "object") {
				sub[key] = undefined;
				delete sub[key];
			}
		}
		return obj;
	}],
	pick: ['obj', 'str*', (ctx, obj, ...list) => {
		const del = typeof obj.delete == "function";
		const keys = typeof obj.keys == "function" ? obj.keys() : Object.keys(obj);
		for (const key of keys) {
			if (list.includes(key)) continue;
			if (del) {
				obj.delete(key);
			} else {
				obj[key] = undefined;
				delete obj[key];
			}
		}
		return obj;
	}],
	as(ctx, val, type, ...params) {
		if (type == "none" || type == "undefined") {
			if (!val) return undefined;
			else return val;
		} else if (type == "null") {
			if (!val) return null;
			else return val;
		} else if (val === undefined) {
			// may happen when called by another filter
			return val;
		}
		if (type == "bool" || type == "boolean") {
			if (val == "true" || val == "1") val = true;
			else if (val == "false" || val == "0") val = false;
			else if (val instanceof Date) val = Boolean(val.getTime());
			else val = Boolean(val);
			return val;
		} else if (type == "str" || type == "string") {
			if (val == null) return "";
			else return val.toString();
		} else if (type == "int" || type == "integer") {
			val = Number.parseInt(val);
			if (Number.isNaN(val)) val = 0;
			return val;
		} else if (type == "float" || type == "num" || type == "numeric") {
			val = Number.parseFloat(val);
			if (Number.isNaN(val)) val = 0;
			return val;
		} else if (type == "obj" || type == "object") {
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
	lang(ctx, val, lang) {
		ctx.lang = lang || null;
		return val;
	}
};
