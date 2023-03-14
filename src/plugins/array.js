export const formats = {
	as: {
		keys(ctx, val) {
			if (typeof val != "object") return [];
			return Object.keys(val);
		},
		values(ctx, val) {
			if (typeof val != "object") return [];
			return Object.values(val);
		},
		entries(ctx, val) {
			if (typeof val != "object") return [];
			const cast = Array.isArray(val);
			return Object.entries(val).map(([key, value]) => {
				if (cast) key = parseInt(key);
				return { key, value };
			});
		}
	}
};

export const filters = {
	filter: ['array', 'path?', 'filter', '?*', (ctx, list, path, filter, params) => {
		return list.filter(item => {
			const data = ctx.expr.get(item, path);
			return ctx.filter(data, filter, params);
		});
	}],
	group: ['array', 'path?', 'filter?', '?*', (ctx, list, path, filter, params) => {
		const groups = new Map();
		for (const item of list) {
			const data = ctx.expr.get(item, path);
			const val = filter != null ? ctx.filter(data, filter, params) : data;
			let group = groups.get(val);
			if (group == null) {
				group = [];
				groups.set(val, group);
			}
			group.push(item);
		}
		return groups.values();
	}],
	map: ['array', 'filter', '?*', (ctx, list, filter, params) => {
		return list.map(item => {
			return ctx.filter(item, filter, params);
		});
	}],
	select: ['array', 'path', (ctx, list, path) => {
		return ctx.filter(list, 'map', 'get', path);
	}],
	page: ['array', 'int', 'int', (ctx, list, len, i) => {
		return list.slice(i * len, (i + 1) * len);
	}],
	nth: ['array', 'int?1', 'int?0', (ctx, list, step, off) => {
		const nlist = [];
		const len = list.length;
		if (step > 0) for (let i = off; i < len && i >= 0; i += step) {
			nlist.push(list[i]);
		}
		else if (step < 0) for (let i = len - 1 - off; i < len && i >= 0; i += step) {
			nlist.push(list[i]);
		}
		return nlist;
	}],
	sort: ['array', 'path?', 'bool?false', ({expr}, list, path, nullsFirst) => {
		return list.sort((ia, ib) => {
			let a = expr.get(ia, path);
			let b = expr.get(ib, path);
			if (a === b) return 0;
			if (a == null) return nullsFirst ? -1 : 1;
			if (b == null) return nullsFirst ? 1 : -1;
			if (typeof a.getTime == "function") a = a.getTime() || NaN;
			if (typeof b.getTime == "function") b = b.getTime() || NaN;
			const ta = typeof a;
			const tb = typeof b;
			if (ta == "number" && tb == "number") {
				if (Number.isNaN(a)) return nullsFirst ? -1 : 1;
				if (Number.isNaN(b)) return nullsFirst ? 1 : -1;
				return a - b;
			} else {
				return a.toString().localeCompare(b);
			}
		});
	}],
	push: ['array', 'any', (ctx, list, item) => {
		list.push(item);
		return list;
	}],
	unshift: ['array', 'any', (ctx, list, item) => {
		list.unshift(item);
		return list;
	}],
	join: ['array', 'str', (ctx, list, tok) => {
		return list.join(tok);
	}]
};
