import Symbols from './symbols.js';
import Context from './context.js';

import * as Core from "./plugins/core.js";
import * as Flow from "./plugins/flow.js";
export * as StringPlugin from './plugins/string.js';
export * as OpsPlugin from './plugins/ops.js';
export * as ArrayPlugin from './plugins/array.js';
export * as NumPlugin from './plugins/number.js';
export * as DatePlugin from './plugins/date.js';
export * as RepeatPlugin from './plugins/repeat.js';
export * as DomPlugin from './plugins/dom.js';
export * as UrlPlugin from './plugins/url.js';
export * as TextPlugin from './plugins/text.js';
export * as JsonPlugin from './plugins/json.js';

export class Matchdom {
	static Symbols = Symbols;

	constructor(...plugins) {
		this.symbols = this.constructor.Symbols;
		this.filters = Object.create(null);
		this.types = Object.create(null);
		this.formats = Object.create(null);
		this.formats.as = {};
		this.hooks = {
			beforeAll: [],
			before: {},
			after: {},
			afterAll: []
		};
		this.extend(Core).extend(Flow);
		for (const p of plugins) {
			this.extend(p);
		}
	}

	copy() {
		return new Matchdom(this);
	}

	extend(p) {
		let { filters, hooks } = p;
		const { debug, types, formats } = p;
		this.debug = debug;
		if (!filters && !types && !formats && !hooks) {
			if (p.beforeAll || p.before || p.after || p.afterAll) {
				hooks = p;
			} else {
				filters = p;
			}
		}
		if (filters) Object.assign(this.filters, filters);
		if (types) Object.assign(this.types, types);
		if (hooks) {
			let ba = hooks.beforeAll;
			if (ba == null) ba = [];
			else if (!Array.isArray(ba)) ba = [ba];
			this.hooks.beforeAll.push(...ba);
			let aa = hooks.afterAll;
			if (aa == null) aa = [];
			else if (!Array.isArray(aa)) aa = [aa];
			this.hooks.afterAll.push(...aa);
			Object.assign(this.hooks.before, hooks.before);
			Object.assign(this.hooks.after, hooks.after);
		}
		if (formats) for (const [n, obj] of Object.entries(formats)) {
			if (!this.formats[n]) this.formats[n] = Object.create(null);
			Object.assign(this.formats[n], obj);
		}
		return this;
	}

	merge(root, data, scope) {
		let wasJSON = false;
		let wasDOM = false;
		let wasFrag = false;
		let wasText = false;

		const trackHits = {
			count: 0,
			last: undefined
		};
		const replacements = [];
		if (root.documentElement) {
			root = root.documentElement;
		}
		if (typeof root == "string") {
			if (this.formats.as.html) {
				if (root.startsWith('<?xml')) {
					root = this.formats.as.xml(null, root);
				} else {
					root = this.formats.as.html(null, root);
				}
				wasDOM = true;
			} else if (this.types.text) {
				wasText = true;
				root = this.types.text(null, root);
			}
		} else if (this.types.obj && ([undefined, Object].includes(root.constructor) || Array.isArray(root))) {
			wasJSON = true;
			root = this.types.obj(null, root);
		} else if (root.nodeType == 11) {
			wasFrag = true;
		}
		const ref = { root };
		this.matchEachDom(ref, (node, name, str) => {
			const hits = Context.parse(this.symbols, str);
			if (!hits) return;
			const ctx = new Context(this, data, scope);
			ctx.setup(hits, ref.root, node, name);
			const { dest } = ctx;
			const filteredHits = dest.write(ctx.src);
			trackHits.count += filteredHits.length;
			trackHits.last = filteredHits[filteredHits.length - 1];
			if (dest.root) ref.root = dest.root;
			if (dest.replacement) replacements.unshift(dest.replacement);
		});
		root = ref.root;
		for (const pair of replacements) {
			const [tag, old] = pair;
			for (const att of Array.from(old.attributes)) {
				tag.setAttribute(att.name, att.value);
			}
			while (old.firstChild) {
				tag.appendChild(old.firstChild);
			}
			if (old.parentNode) {
				old.replaceWith(tag);
			}
			if (old == root) {
				root = tag;
			}
		}

		if (wasJSON) {
			return root.toJSON();
		}

		if (root.nodeType == 11) {
			if (wasFrag) return root;
			const list = Array.from(root.childNodes);
			if (list.length == 0) {
				if (!wasFrag && trackHits.count == 1) return trackHits.last;
				else return root;
			} else if (list.length == 1) {
				root = list[0];
			} else if (wasText) {
				return list.map(item => item.nodeValue).join('');
			} else if (wasDOM) {
				if (list.every(item => item.nodeType == 3)) {
					return list.map(item => item.nodeValue).join('');
				}
				return root;
			}
		}
		if (root.nodeType == 3) {
			if (trackHits.count == 1) return trackHits.last;
			else return root.nodeValue;
		}

		return root;
	}

	matchEachDom(ref, fn) {
		const { root } = ref;
		if (!root.ownerDocument) return;
		// NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
		const ctx = 5;
		// old IE need all params
		const it = root.ownerDocument.createNodeIterator(root, ctx, null, false);
		let node;
		while ((node = it.nextNode())) {
			if (node.attributes) {
				for (const att of Array.from(node.attributes)) {
					if (att.value) fn(node, att.name, att.value);
				}
				fn(node, true, node.tagName.toLowerCase());
			} else if (node.nodeValue != null && node.nodeValue.substring) {
				fn(node, null, node.nodeValue);
			}
			if (ref.root != root) {
				break;
			}
		}
		it.detach?.(); // our models need that
	}
}
