import * as Core from "./core.js";
import * as Flow from "./flow.js";

export default class Plugins {
	constructor() {
		this.filters = Object.create(null);
		this.types = Object.create(null);
		this.formats = Object.create(null);
		this.add(Core, Flow);
	}
	add(...plugins) {
		for (const plugin of plugins) {
			Object.assign(this.filters, plugin.filters);
			Object.assign(this.types, plugin.types);
			Object.assign(this.formats, plugin.formats);
		}
	}
}
