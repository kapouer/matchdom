export const types = {
	array(ctx, val) {
		if (val === undefined) return val;
		else if (val == null) return [];
		if (
			Array.isArray(val) || typeof val.forEach != "function" || typeof val.item == "function" && typeof val.length == "number"
		) {
			// ok
		} else {
			val = [val];
		}
		return val;
	}
};

export const formats = {
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
};

export const filters = {
	filter: ['array', 'string', 'string?eq', 'path?', (ctx, list, str, op, path) => {
		return list.filter((item) => {
			const data = ctx.expr.get(item, path);
			return ctx.run(str, [op, data]);
		});
	}],
	map: ['array', 'string', '?*', (ctx, list, ...filter) => {
		return list.map((item) => {
			return ctx.run(item, filter);
		});
	}],
	select: ['array', 'path', (ctx, list, path) => {
		return ctx.run(list, ['map', 'get', path]);
	}],
	page: ['array', 'int', 'int', (ctx, list, len, i) => {
		return list.slice(i * len, (i + 1) * len);
	}],
	nth: ['array', 'int?1', 'int?0', (ctx, list, step, off) => {
		return list.filter((item, i) => (i - off) % step == 0);
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
	}]
};
