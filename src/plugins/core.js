import { XML, HTML } from '../utils.js';
export const types = {
	path(ctx, str) {
		if (str == null) str = "";
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
		if (
			Array.isArray(val) || typeof val.forEach == "function" || typeof val.item == "function" && typeof val.length == "number"
		) {
			// ok
		} else {
			val = [val];
		}
		return val;
	}
};

export const formats = {
	as: {
		html(ctx, val) {
			if (typeof val != "string") return val;
			val = HTML(val);
			if (ctx) return ctx.src.doc.importNode(val, true);
			else return val;
		},
		xml(ctx, val) {
			if (typeof val != "string") return val;
			val = XML(val);
			if (ctx) return ctx.src.doc.importNode(val, true);
			else return val;
		}
	}
};

export const filters = {
	const(x, val, param) {
		return param || "";
	},
	get: ['?', 'path?', (ctx, data, path) => {
		return ctx.expr.get(data, path, ctx.data);
	}],
	path({ expr, symbols }, val, part) {
		// TODO evaluate the need for this filter
		const path = expr.path;
		if (part == "name") {
			return path[path.length - 1];
		} else if (part == "parent") {
			return path[path.length - 2];
		} else if (part == "dir") {
			return path.slice(0, -1).join(symbols.path);
		} else {
			return path.join(symbols.path);
		}
	},
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
