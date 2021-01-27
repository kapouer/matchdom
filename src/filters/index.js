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
			alias: (ctx, data, alias) => {
				// TODO this is under-specified
				// val == what.expr.get(what.data, what.path) should always be true
				throw new Error("TODO");
			}
		});

		Object.assign(this.map, StringFilters, DomFilters, ArrayFilters, FlowFilters, TypeFilters, OperatorFilters, filters);
	}
}
