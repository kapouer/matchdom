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
		this.filters.push(params);
	}
	prepend(params = []) {
		this.filters.splice(this.filter, 0, params);
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
			return params.join(param);
		}).join(append);
	}
	wrap(str) {
		return this.symbols.open + str + this.symbols.close;
	}
	drop() {
		if (this.filter != this.filters.length) {
			this.filter = this.filters.length;
			return true;
		} else {
			return false;
		}
	}

	get(data, path, root) {
		if (path.length == 0) return data;
		if (root) {
			if (path[0] !== "") {
				// absolute path
				data = root;
				this.path = path.slice();
			} else {
				path = path.slice(1);
				this.path.push(...path);
			}
		}
		let n = 0;
		for (let item of path) {
			if (data == null) break;
			let opt = false;
			if (item.endsWith(this.symbols.opt)) {
				item = item.slice(0, -1);
				opt = true;
			}
			n++;
			if (Array.isArray(data)) {
				const len = data.length;
				const k = { first: 0, last: -1 }[item] ?? parseInt(item);
				if (!Number.isNaN(k)) {
					// allows negative integers as well
					data = data[((k % len) + len) % len];
				} else {
					data = data[item];
				}
			} else {
				data = data[item];
			}
			if (opt && data === undefined) data = null;
		}
		if (path.length == 1 && this.last && data === null) {
			// do not change the value
		} else {
			this.last = data === undefined && n === path.length;
		}
		return data;
	}
}

