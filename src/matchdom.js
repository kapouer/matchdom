import './polyfills.js';
import Filters from './filters/index.js';
import Symbols from './symbols.js';
import What from './what.js';
import TextDocument from './fragment.js';

export default class Matchdom {
	constructor({ filters = {}, hooks = {}, symbols = {}, nodeFilter }) {
		this.nodeFilter = nodeFilter;
		this.hooks = hooks;
		this.symbols = Object.assign({}, Symbols, symbols);
		this.filters = new Filters(filters);
	}

	merge(list, data, scope) {
		if (data == null) return list;
		let wasText = false;
		let wasArray = false;
		if (typeof list == "string") {
			list = [TextDocument.from(list)];
			wasText = true;
		} else if (typeof list.forEach == "function") {
			wasArray = true;
		} else {
			list = [list];
		}

		list = Array.prototype.map.call(list, (root) => {
			const replacements = [];
			this.matchEachDom(root, data, scope, (place, str) => {
				const what = new What(this, data, scope, place);
				let hits = what.parse(str);
				if (!hits) return;
				what.hits = hits;
				hits = what.processHits(hits);
				let allNulls = true;
				let allTrue = true;
				let allBools = true;
				hits = hits.filter(function (val) {
					if (val !== null) allNulls = false;
					if (val === true); // do nothing
					else if (val === false) allTrue = false;
					else allBools = false;
					return val !== undefined;
				});
				// [a][b] returns null if a and b are null
				// likewise for booleans
				if (hits.length > 0) {
					let result;
					if (allNulls) result = null;
					else if (allBools) result = allTrue;
					else result = hits;
					what.set(result);
				}
				if (what.dest.root && what.dest.root != root) root = what.dest.root;
				if (what.replacement) replacements.unshift(what.replacement);
			});
			replacements.forEach(function (pair) {
				const old = pair[1];
				const tag = pair[0];
				for (let att of old.attributes) {
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
			});
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

	matchEachDom(root, data, scope, fn) {
		let val;
		if (root.documentElement) {
			root = root.documentElement;
		}
		const what = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT;
		// old IE need all params
		const it = root.ownerDocument.createNodeIterator(root, what, null, false);
		const nf = this.nodeFilter;
		let node;
		while ((node = it.nextNode())) {
			if (!(nf ? nf(node, it, data, scope) : true)) continue;
			const place = { node, root };
			if (node.attributes) {
				Array.from(node.attributes).forEach((att) => {
					if (!att.value) return;
					place.attr = att.name;
					fn(place, att.value);
				});
				place.tag = true;
				fn(place, node.tagName.toLowerCase());
			} else if (node.nodeValue != null) {
				val = node.nodeValue;
				if (val != null) fn(place, val);
			}
		}
	}
}
