export const types = {
	path(ctx, str) {
		if (str == null) str = "";
		if (!str && ctx.raw !== undefined && ctx.isSimpleValue(ctx.raw)) return [];
		return str.split(ctx.md.symbols.path).map(str => ctx.decode(str));
	},
	mutation(ctx, str) {
		if (!str) return null;
		const eq = '=';
		const mut = {};
		const parts = str.split(eq);
		str = parts.shift();
		if (parts.length == 0) return null;
		if (str.endsWith('-')) {
			mut.del = true;
			str = str.slice(0, -1);
		} else if (str.endsWith('+')) {
			mut.add = true;
			str = str.slice(0, -1);
		} else {
			mut.set = true;
		}
		mut.str = parts.join(eq);
		mut.path = types.path(ctx, str);
		return mut;
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
		return ctx.expr.get(data, path, ctx.data);
	}],
	set: ['?', 'mutation*', (ctx, data, ...mutations) => {
		for (const mut of mutations) {
			const { str, path } = mut;
			if (mut.del) {
				const obj = filters.get(ctx, data, path);
				if (obj == null) {
					continue;
				} else if (typeof obj.indexOf == "function") {
					const index = obj.indexOf(str);
					if (index >= 0) obj.splice(index, 1);
				} else if (typeof obj.delete == "function") {
					obj.delete(str);
				} else if (typeof obj == "object") {
					delete obj[str];
				}
			} else if (mut.set) {
				const key = path.pop();
				const obj = filters.get(ctx, data, path);
				if (obj == null) {
					continue;
				} else if (typeof obj.set == "function") {
					obj.set(key, str);
				} else {
					obj[key] = str;
				}
			} else if (mut.add) {
				const key = path.pop();
				const obj = filters.get(ctx, data, path);
				if (obj == null) {
					continue;
				} else if (typeof obj.append == "function") {
					obj.append(key, str);
				} else {
					const sub = obj[key];
					if (sub == null) continue;
					if (typeof sub.add == "function") sub.add(str);
					else if (typeof sub.push == "function") sub.push(str);
				}
			}
		}
	}],
	alias: ['any', 'path', (ctx, data, path) => {
		const obj = {};
		let cur = obj;
		const len = path.length - 1;
		for (let i = 0; i <= len; i++) {
			const item = path[i];
			if (i == len) cur[item] = data;
			else cur = cur[item] = {};
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
			if (val == null) return val;
			val = Number.parseInt(val);
			if (Number.isNaN(val)) val = null;
			return val;
		} else if (type == "float" || type == "num" || type == "numeric") {
			if (val == null) return val;
			val = Number.parseFloat(val);
			if (Number.isNaN(val)) val = null;
			return val;
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
		return ctx.filter(val, 'as', type, ...params) == val;
	},
	lang(ctx, val, lang) {
		ctx.lang = lang || null;
		return val;
	}
};
