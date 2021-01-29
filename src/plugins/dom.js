import { serializeUrl, parseUrl, HTML, XML } from '../utils.js';

export const formats = {
	text(ctx, val) {
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
		return ctx.own(HTML(val));
	},
	xml(ctx, val) {
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
	with(ctx, val, range) {
		const { src, dest } = ctx;
		dest.hits.splice(0, dest.index);
		dest.hits.splice(1);
		dest.index = 0;
		let node = dest.node;
		if (!node.parentNode || !range) return val;
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
			while (ups--) {
				node = node.parentNode;
			}
			dest.node = node;
		} else {
			node = node.closest ? node : node.parentNode;
			dest.node = node.closest(range);
		}
		return val;
	},
	without(ctx, val, range) {
		ctx.run('else', val, 'with', range);
		return "";
	},
	to(ctx, val, to) {
		if (val === undefined) return val;
		const { src, dest } = ctx;
		src.hits[src.index] = null;
		if (!src.attr) {
			for (let k = 0; k < dest.hits.length; k++) {
				if (k !== dest.index) dest.hits[k] = null;
			}
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
	repeat(ctx, val, range, alias) {
		if (!val || typeof val != "object") return val;

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

		const expr = ctx.expr.clone();
		ctx.expr.ignoreFilters();
		expr.filters.splice(0, expr.filter);
		expr.filter = 0;
		const cur = ctx.read();

		if (cur != null) {
			const hit = src.hits[src.index] = expr.toString() || 'get:';
			const { open, close } = ctx.symbols;
			ctx.write([cur.replace(open + expr.initial + close, open + hit + close)]);
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
			if (dest.root == node) dest.root = node.parentNode;
			node.parentNode.removeChild(node);
		}
		// the range replaces src.node so there's not point in returning a value
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
