export const filters = {
	at: ['?', 'str?', 'str?', 'str?', (ctx, val, ancestor, after, before) => {
		const { dest } = ctx;
		dest.ancestor = ancestor;
		if (!before) {
			dest.before = 0;
		} else {
			const bef = parseInt(before);
			dest.before = bef == before ? bef : before;
		}
		if (!after) {
			dest.after = 0;
		} else {
			const aft = parseInt(after);
			dest.after = aft == after ? aft : after;
		}
		if (ancestor) dest.reduceHit();
		dest.extend(ctx.src.target);
		return ctx.raw;
	}],
	prune: ['?', 'str?', 'str?', 'str?', (ctx, val, ...params) => {
		if (!val) {
			params.unshift('at');
			ctx.filter(val, params);
		}
		return null;
	}],
	fail: ['bool?', '?*', (ctx, test, ...args) => {
		if (!test) return ctx.filter(null, 'at', ...args);
		else return ctx.raw;
	}],
	to: ['?', 'str?', ({ src, dest, raw }, val, to) => {
		if (to) {
			// prevents merging of current expression
			src.hits[src.index] = null;
			if (!src.attr) {
				dest.reduceHit();
			}
			dest.restrict(to);
		}
		return raw;
	}],
	repeat: ['array', 'path', 'filter?', '?*', (ctx, list, alias, placer, ...params) => {
		const { src, dest } = ctx;
		if (dest.ancestor == null) {
			ctx.filter(list, 'at', '*');
		}
		alias = alias.slice();

		const cur = src.read();
		const name = alias.shift();
		if (cur != null) {
			const expr = ctx.expr.clone();
			expr.prepend(["get", name || ""]);
			const hit = ctx.wrap(expr.toString(), 1);
			src.write([cur.replace(ctx.wrap(expr.initial, 1), hit)], src);
			dest.hits[dest.index] = ctx.wrap(hit, 2);
		}
		ctx.expr.drop();

		const [ifrag, cursor] = dest.extract();
		const parent = cursor.parentNode;

		for (let item of Array.from(list)) {
			let obj = Object.assign({}, ctx.data);
			if (alias.length) item = ctx.expr.get(item, alias);

			if (name) {
				obj[name] = item;
			} else if (ctx.isSimpleValue(item)) {
				obj = item;
			} else {
				Object.assign(obj, item);
			}
			const fragment = ctx.md.merge(ifrag.cloneNode(true), obj, ctx.scope);
			if (fragment == null || fragment === "" || !fragment.childNodes?.length) {
				continue;
			}
			if (placer) {
				ctx.filter(item, placer, cursor, fragment, ...params);
			} else {
				parent.insertBefore(fragment, cursor);
			}
		}
		parent.removeChild(cursor);
		// dropped expr so no return value
		return null;
	}]
};
