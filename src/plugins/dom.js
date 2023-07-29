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
