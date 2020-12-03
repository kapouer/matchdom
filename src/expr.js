import Symbols from './symbols.js';

export default class Expression {
	constructor(str, filters) {
		function gf(n) {
			n = filters.mappings[n] || n;
			return filters[n];
		}
		this.filter = 0;
		if (str instanceof Expression) {
			this.initial = str.initial;
			this.path = str.path.slice();
			this.filters = str.filters.slice(str.filter);
			return this;
		}
		this.initial = str;
		const sa = Symbols.append;
		const list = str.split(sa);
		const path = list.shift();
		if (path == "") this.path = [];
		else this.path = path.split(Symbols.path);
		this.filters = [];
		const fsa = gf(sa);
		if (fsa) this.prehook = {
			name: sa,
			fn: fsa,
			params: []
		};
		for (let item of list) {
			let parts = item.split(Symbols.param);
			const name = parts.shift();
			parts = parts.map(function (pt) {
				try {
					return decodeURIComponent(pt);
				} catch (ex) {
					return pt;
				}
			});
			const fn = gf(name);
			if (!fn) continue;
			this.filters.push({
				name: name,
				fn: fn,
				params: parts
			});
			const bname = name + sa;
			const bfn = gf(bname);
			if (bfn) this.filters.push({
				name: bname,
				fn: bfn,
				params: []
			});
		}
		const dsa = sa + sa;
		const fdsa = gf(dsa);
		if (fdsa) this.posthook = {
			name: fdsa,
			fn: fdsa,
			params: []
		};
	}
	clone() {
		return new Expression(this);
	}
	check() {
		for (let str of this.path) {
			if (/^[^\\]*$/.test(str) === false) return false;
		}
		return true;
	}
	toString() {
		let str = this.path.join(Symbols.path);
		if (this.filters.length) str += Symbols.append + this.filters.map(function (obj) {
			let expr = obj.name;
			if (obj.params.length) expr += Symbols.param + obj.params.join(Symbols.param);
			return expr;
		}).join(Symbols.append);
		return str;
	}
	get(data, path) {
		this.last = false;
		if (path) {
			if (typeof path == "string") path = path.split(Symbols.path);
		} else {
			path = this.path;
		}
		if (path.length == 0) return;
		let i;
		for (i = 0; i < path.length; i++) {
			data = data[path[i]];
			if (data == null) {
				i += 1;
				break;
			}
		}
		if (data === undefined && i == path.length) this.last = true;
		return data;
	}
}
