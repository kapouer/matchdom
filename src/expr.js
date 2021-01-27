export default class Expression {
	constructor(str, symbols) {
		this.filter = 0;
		if (str instanceof Expression) {
			this.initial = str.initial;
			this.path = str.path.slice();
			this.filter = str.filter;
			this.filters = str.filters.slice();
			this.symbols = str.symbols;
			return this;
		} else {
			this.path = [];
			this.initial = str;
			this.symbols = symbols;
		}

		const sa = symbols.append;
		const list = str.split(sa);
		this.filters = [];
		for (let item of list) {
			let parts = item.split(symbols.param);
			const name = parts.length == 1 ? 'get' : parts.shift();
			const params = parts.map(function (pt) {
				try {
					return decodeURIComponent(pt);
				} catch (ex) {
					return pt;
				}
			});
			this.filters.push({ name, params });
		}
	}
	clone() {
		return new Expression(this);
	}
	toString() {
		const sp = this.symbols.param;
		return this.filters.map(function (obj) {
			let expr = obj.name;
			if (expr.length) expr += sp;
			if (obj.params.length) expr += obj.params.join(sp);
			return expr;
		}).join(this.symbols.append);
	}
	ignoreFilters() {
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
