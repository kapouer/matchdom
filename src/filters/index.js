import ArrayFilters from "./array.js";
import DomFilters from "./dom.js";
import FlowFilters from "./flow.js";
import StringFilters from "./string.js";
import TypeFilters from "./type.js";
import OperatorFilters from "./operator.js";

export default class Filters {
	constructor(filters) {
		this.map = Object.create(null);
		Object.assign(this.map, {
			get: [null, 'path', (ctx, data, path) => {
				return ctx.expr.get(data, path, true);
			}],
			path({expr, symbols}, val, part) {
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
		});

		Object.assign(this.map, StringFilters, DomFilters, ArrayFilters, FlowFilters, TypeFilters, OperatorFilters, filters);
	}
}
