import { HTML, XML } from '../utils.js';

export default {
	as(ctx, val, type) {
		if (type == "none") {
			if (val == null) return undefined;
			else return val;
		} else if (type == "null") {
			if (!val) return null;
			else return val;
		} else if (val === undefined) {
			return val;
		}
		if (type == "bool" || type == "boolean") {
			if (val === "true" || val === "1") val = true;
			else if (val === "false" || val === "0") val = false;
			else val = !!val;
			return val;
		} else if (type == "str" || type == "string") {
			if (val == null) return "";
			else return val.toString();
		} else if (val == null) {
			return val;
		} else if (type == "int" || type == "integer") {
			val = Number.parseInt(val);
			if (Number.isNaN(val)) val = null;
			return val;
		} else if (type == "float" || type == "num" || type == "numeric") {
			val = Number.parseFloat(val);
			if (Number.isNaN(val)) val = null;
			return val;
		} else if (type == "date") {
			const date = new Date(val);
			if (Number.isNaN(date.getDate())) return null;
			else return date;
		} else if (type == "array") {
			if (
				Array.isArray(val) || typeof val.forEach != "function" || typeof val.item == "function" && typeof val.length == "number"
			) {
				// ok
			} else {
				val = [val];
			}
			return val;
		} else if (type == "keys") {
			if (typeof val != "object") return [];
			return Object.keys(val);
		} else if (type == "values") {
			if (typeof val != "object") return [];
			return Object.values(val);
		} else if (type == "entries") {
			if (typeof val != "object") return [];
			return Object.entries(val).map(([key, value]) => {
				return { key, value };
			});
		} else if (type == "text") {
			val = val.toString();
			const doc = ctx.src.node.ownerDocument;
			if (!doc) return val;
			const frag = doc.createDocumentFragment();
			const list = val.toString().split('\n');
			for (let i = 0; i < list.length; i++) {
				if (i > 0) frag.appendChild(doc.createElement('br'));
				frag.appendChild(doc.createTextNode(list[i]));
			}
			return frag;
		} else if (type == "html") {
			return ctx.own(HTML(val));
		} else if (type == "xml") {
			return ctx.own(XML(val));
		} else {
			throw new Error(`Unknown type: ${type}`);
		}
	},
	is(ctx, val, type) {
		return ctx.run('as', val, type) == val;
	}
};
