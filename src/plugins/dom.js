import { serializeUrl, parseUrl } from '../utils.js';

export const formats = {
	as: {
		text(ctx, val) {
			if (val == null) return val;
			val = val.toString();
			const doc = ctx.src.doc;
			if (!doc) {
				// no dom available
				return val;
			}
			const frag = doc.createDocumentFragment();
			const list = val.toString().split('\n');
			for (let i = 0; i < list.length; i++) {
				if (i > 0) frag.appendChild(doc.createElement('br'));
				frag.appendChild(doc.createTextNode(list[i]));
			}
			return frag;
		},
		url(ctx, val) {
			if (val == null) return val;
			const { src, dest } = ctx;
			const same = src.attr === dest.attr && src.node === dest.node;
			const valUrl = parseUrl(val);
			const srcHits = dest.hits.slice();
			srcHits[dest.index] = dest.index > 0 ? val : '';
			const srcVal = srcHits.join('');
			if (src.index > 0 && valUrl.pathname) {
				delete valUrl.pathname;
			}
			const srcUrl = parseUrl(srcVal);
			const destUrl = same ? {} : parseUrl(dest.read());
			const finalUrl = Object.assign({}, destUrl, srcUrl, valUrl);
			finalUrl.query = Object.assign({}, destUrl.query, srcUrl.query, valUrl.query);

			dest.reduceHit();
			return serializeUrl(finalUrl);
		}
	}
};

export const hooks = {
	afterEach({ dest, expr }, val) {
		if (dest.attr && dest.node[dest.attr + 'List']) {
			if (val === true) return expr.path[expr.path.length - 1];
			else if (val === false) return null;
		}
		return val;
	}
};

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
	repeat: ['array', 'string?', 'filter?', '?*', (ctx, list, alias, placer, ...params) => {
		const { src, dest } = ctx;
		if (dest.ancestor == null) {
			ctx.filter(list, 'at', '*');
		}

		const cur = src.read();
		if (cur != null) {
			const expr = ctx.expr.clone();
			expr.prepend(["get", alias || ""]);
			const hit = dest.hits[dest.index] = ctx.wrap(expr.toString());
			src.write([cur.replace(ctx.wrap(expr.initial), hit)], src);
		}
		ctx.expr.drop();

		const [fragment, cursor] = dest.extract();
		const parent = cursor.parentNode;

		for (const item of Array.from(list)) {
			let obj = Object.assign({}, ctx.data);

			if (alias) {
				obj[alias] = item;
			} else if (ctx.isSimpleValue(item)) {
				obj = item;
			} else {
				Object.assign(obj, item);
			}
			const fg = ctx.md.merge(fragment.cloneNode(true), obj, ctx.scope);
			if (fg == null || fg == "" || fg.childNodes && fg.childNodes.length == 0) {
				continue;
			}
			if (placer) {
				ctx.filter(item, placer, cursor, fg, ...params);
			} else {
				parent.insertBefore(fg, cursor);
			}
		}
		// dropped expr so no return value
		return null;
	}],
	query: ['html', 'string', (ctx, frag, sel) => {
		return frag.querySelector(sel);
	}],
	queryAll: ['html', 'string', (ctx, frag, sel) => {
		const nf = frag.ownerDocument.createDocumentFragment();
		for (const node of frag.querySelectorAll(sel)) {
			nf.appendChild(node);
		}
		return nf;
	}]
};
