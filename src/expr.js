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
		for (let item of list) {
			let parts = item.split(param);
			const name = parts.length == 1 ? 'get' : parts.shift();
			const params = parts.map(function (pt) {
				try {
					return decodeURIComponent(pt);
				} catch (ex) {
					return pt;
				}
			});
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
		this.filter = this.filters.length;
	}

	get(data, path, save) {
		if (path.length == 0) return data;
		if (save) this.path.push(...path);
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
