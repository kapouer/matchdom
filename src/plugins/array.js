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
	filter: ['array', 'path', 'filter', '?*', (ctx, list, path, ...filter) => {
		return list.filter(item => {
			const data = ctx.expr.get(item, path);
			return ctx.filter(data, filter);
		});
	}],
	find: ['array', 'path', '?*', (ctx, list, path, ...filter) => {
		if (filter.length == 0 && path.length > 0) {
			path = path.join(ctx.md.symbols.path);
			return list.includes(path) ? path : null;
		} else {
			return list.find(item => ctx.filter(ctx.expr.get(item, path), filter));
		}
	}],
	has: ['array', 'any', (x, val, str) => {
		return val.includes(str);
	}],
	group: ['array', 'path', '?*', (ctx, list, path, ...filter) => {
		const groups = new Map();
		for (const item of list) {
			const data = ctx.expr.get(item, path);
			const val = filter.length > 0 ? ctx.filter(data, filter) : data;
			let group = groups.get(val);
			if (group == null) {
				group = [];
				groups.set(val, group);
			}
			group.push(item);
		}
		return groups.values();
	}],
	map: ['array', 'filter', '?*', (ctx, list, ...filter) => {
		return list.map(item => {
			return ctx.filter(item, filter);
		});
	}],
	select: ['array', 'path*', (ctx, list, ...paths) => {
		if (paths.length == 1) {
			const [uni] = paths;
			if (uni[0] != "") uni.unshift("");
			return ctx.filter(list, 'map', 'get', uni);
		} else return list.map(item => {
			const obj = {};
			const params = ['set'];
			for (let i = 0; i < paths.length; i += 2) {
				const dst = paths[i];
				const src = paths[i + 1] ?? dst;
				if (src[0] != "") src.unshift("");
				params.push(dst, ctx.filter(item, ['get', src]));
			}
			ctx.filter(obj, params);
			return obj;
		});
	}],
	flat: ['array', 'num?Infinity', (ctx, list, depth) => {
		return list.flat(depth);
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
	sort: ['array', 'path', 'bool?false', ({expr}, list, path, nullsFirst) => {
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
