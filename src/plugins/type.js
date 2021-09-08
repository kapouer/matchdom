export const types = {
	date(ctx, val) {
		if (val == null) return val;
		const date = val == "now" ? new Date() : new Date(val);
		if (Number.isNaN(date.getDate())) return null;
		else return date;
	},
	json(ctx, val) {
		if (typeof val != "string") return null;
		try {
			val = JSON.parse(val);
		} catch (ex) {
			return null;
		}
		return val;
	}
};
export const filters = {
	as(ctx, val, type) {
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
			const fn = ctx.plugins.types[type] || ctx.plugins.formats[type];
			if (!fn) throw new Error(`Unknown type: ${type}`);
			return fn(ctx, val);
		}
	},
	is(ctx, val, type) {
		if (type in ctx.plugins.formats) throw new Error(`Cannot check a format: ${type}`);
		return ctx.run('as', val, type) == val;
	}
};
