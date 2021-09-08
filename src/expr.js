export default class Expression {
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
			const params = item.split(param);
			const name = params.length == 1 ? 'get' : params.shift();
			this.append(name, params);
		}
		return this;
	}
	append(name, params = []) {
		this.filters.push({ name, params });
	}
	prepend(name, params = []) {
		this.filters.splice(this.filter, 0, { name, params });
	}
	clone() {
		const expr = new Expression(this.symbols);
		expr.filter = 0;
		expr.filters = this.filters.slice(this.filter);
		expr.path = [];
		expr.initial = this.initial;
		return expr;
	}
	toString() {
		const { param, append } = this.symbols;
		return this.filters.map(function (obj) {
			let expr = (obj.name || "get") + param;
			if (obj.params.length) expr += obj.params.join(param);
			return expr;
		}).join(append) || "get:";
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
		for (let i = 0; i < path.length; i++) {
			if (data == null) break;
			n++;
			data = data[path[i]];
		}
		if (path.length == 1 && this.last && data === null) {
			// do not change the value
		} else {
			this.last = data === undefined && n === path.length;
		}
		return data;
	}
}
