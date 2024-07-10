export const filters = {
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
