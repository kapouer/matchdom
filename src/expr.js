export default class Expression {
	initial;
	filters;

	constructor(symbols) {
		this.filter = 0;
		this.path = [];
		this.symbols = symbols;
	}

	parse(str) {
		const { append, param } = this.symbols;
		this.initial = str;
		const sa = append;
		const list = str.split(sa);
		this.filters = [];
		for (const item of list) {
			this.append(item.split(param));
		}
		return this;
	}

	append(params = []) {
		this.check(params);
		this.filters.push(params);
	}

	prepend(params = []) {
		this.check(params);
		this.filters.splice(this.filter, 0, params);
	}

	check(params) {
		const { fname, fparam } = this.symbols;
		if (params.length == 1) {
			params.unshift('get');
		} else if (fname.test(params[0]) == false) {
			throw new Error();
		}
		for (let i = 1; i < params.length; i++) {
			if (fparam.test(params[i]) == false) {
				throw new Error();
			}
		}
	}

	clone() {
		const expr = new Expression(this.symbols);
		expr.filters = this.filters.slice(this.filter);
		expr.initial = this.initial;
		return expr;
	}

	toString() {
		const { param, append } = this.symbols;
		return this.filters.map(params => {
			if (!params.join) console.error(params);
			if (params[0] == "get" && params[1] != "") return params[1];
			else return params.join(param);
		}).join(append);
	}

	drop() {
		if (this.filter != this.filters.length) {
			this.filter = this.filters.length;
			return true;
		} else {
			return false;
		}
	}

	set(data, path, ctx) {
		if (path.length == 0) return data;
		let skip = false;
		if (path[0] !== "") {
			// absolute path
			data = ctx.data;
			this.path = [];
		} else {
			skip = true;
		}
		for (const item of path) {
			if (skip) {
				skip = false;
				continue;
			}
			let next = data[item];
			if (next == null) {
				next = {};
			} else if (typeof next != "object") {
				return null;
			}
			data = data[item] = next;
		}
		return data;
	}

	get(data, path, root) {
		if (path.length == 0) return data;
		const internal = root !== undefined;
		let n = 0;
		let skip = false;
		if (internal) {
			// called from filter
			if (path[0] !== "") {
				// absolute path
				data = root;
				this.path = [];
			} else {
				skip = true;
			}
			n = this.path.length;
		}
		for (let i = 0; i < path.length; i++) {
			if (skip) {
				skip = false;
				continue;
			}
			let opt = false;
			let item = path[i];
			if (item.endsWith(this.symbols.opt)) {
				item = path[i] = item.slice(0, -1);
				opt = true;
			}
			this.optional = opt;
			if (data != null) {
				if (Array.isArray(data)) {
					const len = data.length || 1;
					const map = { first: 0, last: -1 };
					const k = item in map ? map[item] : parseInt(item);
					if (!Number.isNaN(k)) {
						// allows negative integers as well
						item = ((k % len) + len) % len;
					}
				}
				if (typeof data.getAll == "function") {
					data = data.getAll(item);
					if (data.length <= 1) data = data[0];
				} else if (typeof data.get == "function") {
					data = data.get(item);
				} else {
					data = data[item];
				}
				if (opt && data === undefined) {
					data = null;
				}
				n++;
			}
			if (internal) this.path.push(item);
		}
		if (internal) {
			this.last = n === this.path.length;
		}
		return data;
	}
}
