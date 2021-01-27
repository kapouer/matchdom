import { serializeUrl, parseUrl } from '../utils.js';

export default {
	widen(ctx, val, range) {
		ctx.reduce();
		let node = ctx.dest.node;
		if (!node.parentNode || !range) return val;
		delete ctx.dest.attr;
		delete ctx.dest.tag;
		while (range.startsWith('+')) {
			ctx.dest.before++;
			range = range.slice(1);
		}
		while (range.endsWith('+')) {
			ctx.dest.after++;
			range = range.slice(0, -1);
		}

		if (/^\*+$/.test(range)) {
			let ups = range.length;
			while (ups--) {
				node = node.parentNode;
			}
			ctx.dest.node = node;
		} else {
			node = node.closest ? node : node.parentNode;
			ctx.dest.node = node.closest(range);
		}
		return val;
	},
	to(ctx, val, to) {
		if (val === undefined) return val;
		const dest = ctx.dest;
		let node = dest.node;
		delete dest.attr;
		delete dest.tag;
		const parent = node.parentNode;
		ctx.reduce();
		if (!to) {
			if (node.children) {
				node.textContent = '';
				const text = node.ownerDocument.createTextNode('');
				node.appendChild(text);
				dest.node = text;
			} else {
				while (node.previousSibling) parent.removeChild(node.previousSibling);
				while (node.nextSibling) parent.removeChild(node.nextSibling);
			}
		} else if (to == "*") {
			if (node.children) {
				const text = dest.node = node.ownerDocument.createTextNode('');
				node.replaceWith(text);
			} else {
				parent.replaceWith(node);
				if (parent == dest.root) dest.root = node;
			}
		} else {
			dest.attr = to;
		}
		return val;
	},
	repeat(ctx, val, range, alias) {
		if (!val || typeof val != "object") return val;

		// build a template fragment with the range
		let node = ctx.dest.node;
		const el = node.children ? node : node.parentNode;
		let prevs = 0;
		let nexts = 0;
		while (range.startsWith('+')) {
			prevs++;
			range = range.slice(1);
		}
		while (range.endsWith('+')) {
			nexts++;
			range = range.slice(0, -1);
		}
		if (range == "-") range = "";

		if (range == "*") {
			node = el;
		} else if (range) {
			node = el.closest(range);
		}

		// drop this hit from the expression
		const expr = ctx.expr.clone();
		expr.filters.splice(0, expr.filter);
		expr.filter = 0;
		let cur = ctx.get();

		if (cur != null) {
			ctx.hits[ctx.index] = expr.toString();
			const { open, close } = ctx.symbols;
			cur = cur.replace(open + expr.initial + close, open + ctx.hits[ctx.index] + close);
			ctx.set([cur]);
		}

		const srcFrag = ctx.src.node.ownerDocument.createDocumentFragment();
		const destNode = node.cloneNode(true);
		srcFrag.appendChild(destNode);
		let n = prevs;
		let destSib = destNode;
		let sib;
		while (n-- > 0) {
			sib = node.previousElementSibling;
			if (sib == null) break;
			destSib = srcFrag.insertBefore(sib, destSib);
		}
		destSib = destNode;
		n = nexts;
		while (n-- > 0) {
			sib = node.nextElementSibling;
			if (sib == null) break;
			destSib = srcFrag.insertBefore(sib, destSib.nextSibling);
		}

		Array.prototype.forEach.call(val, (item, i) => {
			let obj = Object.assign({}, ctx.data);

			if (alias) {
				obj[alias] = item;
			} else if (ctx.isSimpleValue(item)) {
				obj = item;
			} else {
				Object.assign(obj, item);
			}
			const copy = ctx.matchdom.merge(srcFrag.cloneNode(true), obj, ctx.scope);
			while (copy.firstChild) node.parentNode.insertBefore(copy.firstChild, node);
		});
		if (node.parentNode) {
			if (ctx.dest.root == node) ctx.dest.root = node.parentNode;
			node.parentNode.removeChild(node);
		}
		// the range replaces src.node so there's not point in returning a value
	},
	class(ctx, val, method) {

	},
	url(ctx, value, to) {
		if (value == null) return value;
		const cur = parseUrl(ctx.get());
		ctx.run("to", value, to);
		const tgt = parseUrl(ctx.get());
		const val = parseUrl(value);
		if (ctx.index == 0) {
			if (!val.pathname) {
				if (tgt.pathname) {
					ctx.hits.unshift(tgt.pathname);
					ctx.index++;
				}
			} else if (val.pathname) {
				if (!val.query) {
					ctx.hits.push(serializeUrl({ query: tgt.query }));
				} else {
					ctx.hits[0] = serializeUrl({
						pathname: val.pathname,
						query: Object.assign(tgt.query || {}, val.query)
					});
				}
			}
		} else if (!cur.query && tgt.query) {
			ctx.hits.push(serializeUrl({ query: tgt.query }));
		} else if (cur.query) {
			if (!cur.pathname) ctx.hits[0] = tgt.pathname + ctx.hits[0];
			if (tgt.query) {
				for (let k in cur.query) delete tgt.query[k];
				let tail = serializeUrl({
					query: tgt.query
				}).substring(1);
				if (tail.length) ctx.hits.push('&' + tail);
			}
		}
	},
	query(ctx, frag, sel) {
		return frag.querySelector(sel);
	},
	queryAll(ctx, frag, sel) {
		const nf = frag.ownerDocument.createDocumentFragment();
		frag.querySelectorAll(sel).forEach((node) => nf.appendChild(node));
		return nf;
	}
};
