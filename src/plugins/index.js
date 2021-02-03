import * as Array from "./array.js";
import * as Dom from "./dom.js";
import * as Flow from "./flow.js";
import * as String from "./string.js";
import * as Type from "./type.js";
import * as Operator from "./operator.js";

const Base = {
	filters: {
		get: [null, 'path', (ctx, data, path) => {
			return ctx.expr.get(data, path, true);
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
		alias: [null, 'string', (ctx, data, alias) => {
			ctx.data[alias] = data;
			return data;
		}]
	}
};

const Defaults = [
	Base, Array, Dom, Flow, String, Type, Operator,
];

export default class Plugins {
	constructor() {
		this.filters = Object.create(null);
		this.types = Object.create(null);
		this.formats = Object.create(null);

		Defaults.forEach((plugin) => {
			this.add(plugin);
		});
	}
	add(plugin) {
		Object.assign(this.filters, plugin.filters);
		Object.assign(this.types, plugin.types);
		Object.assign(this.formats, plugin.formats);
	}
}
