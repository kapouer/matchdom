let doc, parser;
function HTML(str) {
	if (str.startsWith('<html') && str.endsWith('</html>')) {
		if (!parser) parser = new DOMParser();
		return parser.parseFromString(str, "text/html");
	} else {
		if (!doc) doc = document.cloneNode();
		const tpl = doc.createElement('template');
		tpl.innerHTML = str.trim();
		const frag = tpl.content;
		return frag.childNodes.length == 1 ? frag.childNodes[0] : frag;
	}
}

function XML(str) {
	if (!parser) parser = new DOMParser();
	const doc = parser.parseFromString(`<root>${str.trim()}</root>`, "text/xml");
	const root = doc.documentElement;
	if (root.childNodes.length == 1) return root.childNodes[0];
	const frag = doc.createDocumentFragment();
	while (root.firstChild) frag.appendChild(root.firstChild);
	return frag;
}

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
		html(ctx, val) {
			if (typeof val != "string") return val;
			val = HTML(val);
			if (ctx) return ctx.src.doc.importNode(val, true);
			else return val;
		},
		xml(ctx, val) {
			if (typeof val != "string") return val;
			val = XML(val);
			if (ctx) return ctx.src.doc.importNode(val, true);
			else return val;
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
	repeat: ['array', 'path', 'filter?', '?*', (ctx, list, alias, placer, ...params) => {
		const { src, dest } = ctx;
		if (dest.ancestor == null) {
			ctx.filter(list, 'at', '*');
		}

		const cur = src.read();
		const name = alias.shift();
		if (cur != null) {
			const expr = ctx.expr.clone();
			expr.prepend(["get", name || ""]);
			const hit = dest.hits[dest.index] = ctx.wrap(expr.toString());
			src.write([cur.replace(ctx.wrap(expr.initial), hit)], src);
		}
		ctx.expr.drop();

		const [fragment, cursor] = dest.extract();
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
	one: ['html', 'string', (ctx, frag, sel) => {
		return frag.querySelector(sel);
	}],
	all: ['html', 'string', (ctx, frag, sel) => {
		const nf = frag.ownerDocument.createDocumentFragment();
		for (const node of frag.querySelectorAll(sel)) {
			nf.appendChild(node);
		}
		return nf;
	}]
};
