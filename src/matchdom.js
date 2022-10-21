import Symbols from './symbols.js';
import Context from './context.js';
import TextDocument from './fragment.js';

import * as Core from "./plugins/core.js";
import * as Flow from "./plugins/flow.js";
export * as TextPlugin from './plugins/text.js';
export * as OpsPlugin from './plugins/ops.js';
export * as ArrayPlugin from './plugins/array.js';
export * as JsonPlugin from './plugins/json.js';
export * as NumPlugin from './plugins/number.js';
export * as DatePlugin from './plugins/date.js';
export * as DomPlugin from './plugins/dom.js';

export class Matchdom {
	static Symbols = Symbols;

	constructor(...plugins) {
		this.symbols = this.constructor.Symbols;
		this.filters = Object.create(null);
		this.types = Object.create(null);
		this.formats = Object.create(null);
		this.hooks = Object.create(null);
		this.extend(Core).extend(Flow);
		for (const p of plugins) {
			this.extend(p);
		}
	}

	extend(p) {
		const { filters, types, formats, hooks } = p;
		if (!filters && !types && !formats && !hooks) {
			if (p.beforeAll || p.beforeEach || p.afterAll || p.afterEach) {
				Object.assign(this.hooks, p);
			} else {
				Object.assign(this.filters, p);
			}
		} else {
			Object.assign(this.filters, filters);
			Object.assign(this.types, types);
			Object.assign(this.formats, formats);
			Object.assign(this.hooks, hooks);
		}
		return this;
	}

	merge(list, data, scope) {
		let wasText = false;
		let wasArray = false;
		if (typeof list == "string") {
			if (document) {
				if (list.startsWith('<') && list.endsWith('>')) {
					const fn = this.formats[list.startsWith('<?xml') ? 'xml' : 'html'];
					list = [fn(list)];
				} else {
					const node = this.formats.html("-");
					node.nodeValue = list;
					wasText = true;
					list = [node.parentNode];
				}
			} else {
				list = [TextDocument.from(list)];
				wasText = true;
			}
		} else if (typeof list.forEach == "function") {
			wasArray = true;
		} else {
			list = [list];
		}

		list = Array.prototype.map.call(list, root => {
			const replacements = [];
			if (root.documentElement) {
				root = root.documentElement;
			}
			this.matchEachDom(root, (node, name, str) => {
				const hits = Context.parse(this.symbols, str);
				if (!hits) return;
				const ctx = new Context(this, data, scope);
				ctx.setup(hits, root, node, name);
				const { dest } = ctx;
				let allNulls = true;
				let allTrue = true;
				let allBools = true;
				const filteredHits = hits.filter(val => {
					if (val !== null) allNulls = false;
					if (val === true); // do nothing
					else if (val === false) allTrue = false;
					else allBools = false;
					return val !== undefined;
				});
				// [a][b] returns null if a and b are null
				// likewise for booleans
				if (filteredHits.length > 0) {
					let result;
					if (allNulls) result = null;
					else if (allBools) result = allTrue;
					else result = filteredHits;
					dest.write(result, ctx.src);
				}
				if (dest.root) root = dest.root;
				if (dest.replacement) replacements.unshift(dest.replacement);
			});
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
			return root;
		});
		if (wasText) {
			const item = list[0];
			if (item.childNodes.length == 1) return item.firstChild.nodeValue;
			else return Array.from(item.childNodes).map(x => x.nodeValue).join('');
		} else if (wasArray) {
			return list;
		} else {
			return list[0];
		}
	}

	matchEachDom(root, fn) {
		const ctx = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT;
		// old IE need all params
		const it = root.ownerDocument.createNodeIterator(root, ctx, null, false);
		let node;
		while ((node = it.nextNode())) {
			if (node.attributes) {
				for (const att of Array.from(node.attributes)) {
					if (att.value) fn(node, att.name, att.value);
				}
				fn(node, true, node.tagName.toLowerCase());
			} else if (node.nodeValue != null) {
				fn(node, null, node.nodeValue);
			}
		}
	}
}
