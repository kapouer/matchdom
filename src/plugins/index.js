import * as Array from "./array.js";
import * as Dom from "./dom.js";
import * as Flow from "./flow.js";
import * as Type from "./type.js";

const Base = {
	filters: {
		const(x, val, param) {
			return param || "";
		},
		get: ['?', 'path?', (ctx, data, path) => {
			return ctx.expr.get(data, path, ctx.data);
		}],
		path({ expr, symbols }, val, part) {
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
		}]
	}
};

const Defaults = [
	Base, Array, Dom, Flow, Type
];

export default class Plugins {
	constructor() {
		this.filters = Object.create(null);
		this.types = Object.create(null);
		this.formats = Object.create(null);

		for (const plugin of Defaults) {
			this.add(plugin);
		}
	}
	add(plugin) {
		Object.assign(this.filters, plugin.filters);
		Object.assign(this.types, plugin.types);
		Object.assign(this.formats, plugin.formats);
	}
}
