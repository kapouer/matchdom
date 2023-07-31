export const types = {
	path(ctx, str) {
		if (str == null) return [];
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
		else if (
			Array.isArray(val) || typeof val.forEach == "function" || typeof val.item == "function" && typeof val.length == "number" || typeof val[Symbol.iterator] == 'function'
		) {
			// ok
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
	assign: ['?', 'path', 'path', (ctx, val, dst, src) => {
		let data = ctx.data = Object.assign({}, ctx.data);
		for (let i = 0; i < dst.length - 1; i++) {
			const str = dst[i];
			if (data[str] == null) {
				if (i > 0) data = Object.assign({}, data);
				data = data[str] = {};
			} else if (typeof data[str] != 'object') {
				throw new Error(`Cannot set property '${str}' on non-object`);
			} else {
				data = data[str] = Object.assign({}, data[str]);
			}
		}
		data[dst[dst.length - 1]] = ctx.expr.get(val, src);
		return val;
	}],
	set: ['obj?', '?*', (ctx, data, ...params) => {
		if (!data) return data;
		while (params.length) {
			const str = params.shift();
			let act = 0;
			if (str.startsWith('+')) act = 1;
			else if (str.startsWith('-')) act = 2;
			const path = types.path(ctx, act ? str.slice(1) : str);
			const key = path.pop();
			const obj = ctx.expr.get(data, path);
			const val = act == 2 ? null : params.shift();
			if (obj == null) continue;
			if (act == 2) {
				if (typeof obj.indexOf == "function") {
					const index = obj.indexOf(key);
					if (index >= 0) obj.splice(index, 1);
				} else if (typeof obj.delete == "function") {
					obj.delete(key);
				} else if (typeof obj == "object") {
					delete obj[key];
				}
			} else if (!act) {
				if (typeof obj.set == "function") {
					obj.set(key, val);
				} else {
					obj[key] = val;
				}
			} else if (typeof obj.append == "function") {
				obj.append(key, val);
			} else {
				const sub = obj[key];
				if (sub == null) obj[key] = val;
				else if (typeof sub.add == "function") sub.add(val);
				else if (typeof sub.push == "function") sub.push(val);
				else obj[key] = [sub, val];
			}
		}
		return data;
	}],
	pick: ['obj', 'str*', (ctx, obj, ...list) => {
		const del = typeof obj.delete == "function";
		const keys = typeof obj.keys == "function" ? obj.keys() : Object.keys(obj);
		for (const key of keys) {
			if (list.includes(key)) continue;
			if (del) obj.delete(key);
			else delete obj[key];
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
		return ctx.filter(val, 'as', type, ...params) === val;
	},
	lang(ctx, val, lang) {
		ctx.lang = lang || null;
		return val;
	}
};
