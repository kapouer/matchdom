import { serializeUrl, parseUrl, HTML, XML } from '../utils.js';

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
	html(ctx, val) {
		if (val == null) return val;
		return ctx.src.doc.importNode(HTML(val), true);
	},
	xml(ctx, val) {
		if (val == null) return val;
		return ctx.src.doc.importNode(XML(val), true);
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
	at(ctx, val, range) {
		const { dest } = ctx;
		dest.parse(range);
		if (dest.ancestor) dest.reduceHit();
		dest.extend(ctx.src.target);
		return val;
	},
	prune(ctx, val, range) {
		if (!val) {
			filters.at(ctx, val, range);
		}
		return null;
	},
	to(ctx, val, to) {
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
	},
	repeat: ['array?', 'string?', 'filter?', '?*', (ctx, list, alias, placer, ...params) => {
		const { src, dest } = ctx;

		// rewrite expression without repeat and with alias if any
		const cur = src.read();
		if (cur != null) {
			const expr = ctx.expr.clone();
			if (alias) expr.prepend("get", [alias]);
			const hit = dest.hits[dest.index] = expr.wrap(expr.toString());
			// this call fucks up everything
			// we just want to write back the expression where it was,
			// probably on the *source* place
			src.write([cur.replace(expr.wrap(expr.initial), hit)]);
		}
		ctx.expr.drop();

		if (!dest.changed) {
			dest.parse("*");
			dest.extend();
		}
		const [frag, cursor] = dest.extract();
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
			const dstFrag = ctx.matchdom.merge(frag.cloneNode(true), obj, ctx.scope);
			if (placer) {
				ctx.run(placer, item, cursor, dstFrag, ...params);
			} else {
				parent.insertBefore(dstFrag, cursor);
			}
		}
		// dropped expr so no return value
		return null;
	}],
	query(ctx, frag, sel) {
		return frag.querySelector(sel);
	},
	queryAll(ctx, frag, sel) {
		const nf = frag.ownerDocument.createDocumentFragment();
		for (const node of frag.querySelectorAll(sel)) {
			nf.appendChild(node);
		}
		return nf;
	}
};
