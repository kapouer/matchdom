import { serializeUrl, parseUrl, HTML, XML } from '../utils.js';

export const formats = {
	text(ctx, val) {
		if (val == null) return val;
		val = val.toString();
		const doc = ctx.src.node.ownerDocument;
		if (!doc) return val;
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
		return ctx.own(HTML(val));
	},
	xml(ctx, val) {
		if (val == null) return val;
		return ctx.own(XML(val));
	},
	url(ctx, val) {
		if (val == null) return val;
		const { src, dest } = ctx;
		const same = src.attr === dest.attr && src.node === dest.node;
		const valUrl = parseUrl(val);
		const srcHits = src.hits.slice();
		srcHits[src.index] = src.index > 0 ? val : '';
		const srcVal = srcHits.join('');
		if (src.index > 0 && valUrl.pathname) {
			delete valUrl.pathname;
		}
		const srcUrl = parseUrl(srcVal);
		const destUrl = same ? {} : parseUrl(ctx.read(dest));
		const finalUrl = Object.assign({}, destUrl, srcUrl, valUrl);
		finalUrl.query = Object.assign({}, destUrl.query, srcUrl.query, valUrl.query);

		for (let k = 0; k < dest.hits.length; k++) {
			if (k !== dest.index) dest.hits[k] = null;
		}
		return serializeUrl(finalUrl);
	}
};

export const filters = {
	at(ctx, val, range) {
		const { dest } = ctx;
		dest.hits.splice(0, dest.index);
		dest.hits.splice(1);
		dest.index = 0;
		let node = dest.node;
		if (!node.parentNode || !range) return val;
		const { attr, tag } = dest;
		delete dest.attr;
		delete dest.tag;
		while (range.startsWith('+')) {
			dest.before++;
			range = range.slice(1);
		}
		while (range.endsWith('+')) {
			dest.after++;
			range = range.slice(0, -1);
		}

		if (/^\*+$/.test(range)) {
			let ups = range.length;
			if (attr || tag) ups += -1;
			while (ups-- > 0) {
				node = node.parentNode;
			}
			dest.node = node;
		} else {
			node = node.closest ? node : node.parentNode;
			dest.node = node.closest(range);
		}
		return val;
	},
	orAt(ctx, val, range) {
		return ctx.run('else', val, 'at', range);
	},
	ifAt(ctx, val, range) {
		ctx.run('else', val, 'at', range);
		if (ctx.expr.drop()) {
			// eslint-disable-next-line no-console
			console.info("ifAt should not be followed by other filters");
		}
		return "";
	},
	to(ctx, val, to) {
		if (val === undefined) return val;
		const { src, dest } = ctx;
		src.hits[src.index] = null;
		if (!src.attr) {
			dest.hits.splice(dest.index + 1);
			dest.hits.splice(0, dest.index);
			dest.index = 0;
		}

		let node = dest.node;
		delete dest.attr;
		delete dest.tag;
		const parent = node.parentNode;
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
	repeat: ['array?', 'string?', 'string?', 'filter?', (ctx, val, range, alias, place) => {
		const { src, dest } = ctx;
		let node = dest.node;
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

		const cur = ctx.read();

		if (cur != null) {
			const expr = ctx.expr.clone();
			if (alias) expr.prepend("get", [alias]);
			const hit = src.hits[src.index] = expr.toString();
			ctx.write([cur.replace(expr.wrap(expr.initial), expr.wrap(hit))]);
		}
		ctx.expr.drop();
		const doc = ctx.src.node.ownerDocument;

		const srcFrag = doc.createDocumentFragment();
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

		const cursor = doc.createTextNode("");
		const parent = node.parentNode;
		parent.replaceChild(cursor, node);

		Array.prototype.forEach.call(val, (item, i) => {
			let obj = Object.assign({}, ctx.data);

			if (alias) {
				obj[alias] = item;
			} else if (ctx.isSimpleValue(item)) {
				obj = item;
			} else {
				Object.assign(obj, item);
			}
			const dstFrag = ctx.matchdom.merge(srcFrag.cloneNode(true), obj, ctx.scope);
			let child;
			while ((child = dstFrag.firstChild)) {
				if (place) {
					ctx.src = {
						node: cursor,
						root: parent
					};
					ctx.dest = {
						node: child,
						root: dstFrag
					};
					ctx.run(place, item);
					if (child.parentNode == dstFrag) dstFrag.removeChild(child);
				} else {
					parent.insertBefore(dstFrag.firstChild, cursor);
				}
			}
			ctx.src = src;
			ctx.dest = dest;
		});
		if (dest.root == node) dest.root = parent;
		parent.removeChild(cursor);
		// the range replaces src.node so there's not point in returning a value
	}],
	query(ctx, frag, sel) {
		return frag.querySelector(sel);
	},
	queryAll(ctx, frag, sel) {
		const nf = frag.ownerDocument.createDocumentFragment();
		frag.querySelectorAll(sel).forEach((node) => nf.appendChild(node));
		return nf;
	}
};
