import { serializeUrl, parseUrl } from '../utils.js';

export const formats = {
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
};

export const filters = {
	at: ['?', 'str?', 'str?', 'str?', (ctx, val, ancestor, before, after) => {
		const { dest } = ctx;
		dest.ancestor = ancestor;
		dest.before = before;
		dest.after = after;
		if (ancestor) dest.reduceHit();
		dest.extend(ctx.src.target);
		return val;
	}],
	prune: ['?', 'str?', 'str?', 'str?', (ctx, val, ...params) => {
		if (!val) {
			params.unshift('at');
			ctx.run(val, params);
		}
		return null;
	}],
	to: ['?', 'str?', (ctx, val, to) => {
		if (!to) {
			return val;
		}
		const { src, dest } = ctx;
		// prevents merging of current expression
		src.hits[src.index] = null;
		if (!src.attr) {
			dest.reduceHit();
		}
		dest.restrict(to);
		return val;
	}],
	repeat: ['array?', 'string?', 'filter?', '?*', (ctx, list, alias, placer, ...params) => {
		const { src, dest } = ctx;
		if (dest.ancestor == null) {
			ctx.run(list, ['at', '*']);
		}

		const cur = src.read();
		if (cur != null) {
			const expr = ctx.expr.clone();
			expr.prepend(["get", alias || ""]);
			const hit = dest.hits[dest.index] = expr.wrap(expr.toString());
			src.write([cur.replace(expr.wrap(expr.initial), hit)]);
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
				ctx.run(item, [placer, cursor, fg, ...params]);
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
