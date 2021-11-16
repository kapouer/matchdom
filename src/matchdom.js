import Plugins from './plugins/index.js';
import Symbols from './symbols.js';
import Context from './context.js';
import TextDocument from './fragment.js';
import { XML, HTML } from './utils.js';

export * as String from './plugins/string.js';
export * as Operator from './plugins/operator.js';
export * as Locale from './plugins/locale.js';

export { XML, HTML };

export class Matchdom {
	constructor({ debug = false, hooks = {}, symbols = {}, visitor } = {}) {
		this.visitor = visitor;
		this.hooks = hooks;
		this.debug = debug;
		this.symbols = Object.assign({}, Symbols, symbols);
		this.plugins = new Plugins();
	}

	extend(plugins) {
		plugins = Array.isArray(plugins) ? plugins : [plugins];
		for (const plugin of plugins) this.plugins.add(plugin);
		return this;
	}

	merge(list, data, scope) {
		if (data == null) return list;
		let wasText = false;
		let wasArray = false;
		if (typeof list == "string") {
			if (document && list.startsWith('<') && list.endsWith('>')) {
				list = [HTML(list)];
			} else {
				list = [TextDocument.from(list)];
				wasText = true;
			}
		} else if (typeof list.forEach == "function") {
			wasArray = true;
		} else {
			list = [list];
		}

		list = Array.prototype.map.call(list, (root) => {
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
				const filteredHits = hits.filter((val) => {
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
			if (list[0].childNodes.length == 1) return list[0].firstChild.nodeValue;
			else return list[0].childNodes.join('');
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
