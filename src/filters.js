import Symbols from './symbols.js';
import { serializeUrl, parseUrl, findData } from './utils.js';

export const mappings = {};

export function json(val) {
	return JSON.stringify(val);
}

export function or(value, what, str) {
	if (value == null) return str;
}

export function opt(val) {
	if (val === undefined) return null;
	else return val;
}

export function eq(val, what, str, yes, no) {
	const test = val == str;
	if (yes !== undefined) {
		if (test) return yes;
		else return no !== undefined ? no : val;
	} else {
		return test;
	}
}

export function neq(val, what, str, yes, no) {
	const test = val != str;
	if (yes !== undefined) {
		if (test) return yes;
		else return no !== undefined ? no : val;
	} else {
		return test;
	}
}

export function gt(val, what, to) {
	const fval = parseFloat(val);
	const fto = parseFloat(to);
	if (isNaN(fval) || isNaN(fto)) return val;
	else return fval > fto;
}

export function gte(val, what, to) {
	const fval = parseFloat(val);
	const fto = parseFloat(to);
	if (isNaN(fval) || isNaN(fto)) return val;
	else return fval >= fto;
}

export function lt(val, what, to) {
	const fval = parseFloat(val);
	const fto = parseFloat(to);
	if (isNaN(fval) || isNaN(fto)) return val;
	else return fval < fto;
}

export function lte(val, what, to) {
	const fval = parseFloat(val);
	const fto = parseFloat(to);
	if (isNaN(fval) || isNaN(fto)) return val;
	else return fval <= fto;
}

export function battr(val, what) {
	if (!what.attr) {
		// eslint-disable-next-line no-console
		console.warn("battr must be used inside an attribute")
	}
	if (val == true) return what.attr;
	else return null;
}

export function not(value) {
	if (!value) return null;
}

export function ornull(value) {
	if (!value) return null;
}

export function attr(value, what, name, selector) {
	if (value === undefined) return;
	let attr = name;
	if (!name && what.attr) {
		if (what.attr.startsWith('data-')) {
			attr = what.attr.substring(5);
		} else {
			attr = what.attr;
		}
	}
	if (!attr) {
		// eslint-disable-next-line no-console
		console.warn('attr filter first :name parameter is needed');
		return;
	}
	let parent = what.parent || what.node;

	if (!selector) {
		if (what.attr) {
			what.attr = attr;
			return value;
		}
	} else {
		parent = parent.closest(selector);
	}

	if (parent && value !== null) {
		if (attr == "class") {
			if (value) parent.classList.add.apply(parent.classList, value.split(' '))
		} else {
			parent.setAttribute(attr, value);
		}
	}
	return (selector || what.node) ? null : value;
}

export function url(value, what, name, selector) {
	if (value === undefined) return;
	if (value != null && typeof value != "string") value = "" + value;
	const cur = parseUrl(what.get());
	attr(value, what, name, selector);
	const tgt = parseUrl(what.get());
	const val = parseUrl(value);
	if (what.index == 0) {
		if (!val.pathname) {
			if (tgt.pathname) {
				what.hits.unshift(tgt.pathname);
				what.index++;
			}
		} else if (val.pathname) {
			if (!val.query) {
				what.hits.push(serializeUrl({ query: tgt.query }));
			} else {
				what.hits[0] = serializeUrl({
					pathname: val.pathname,
					query: Object.assign(tgt.query || {}, val.query)
				});
			}
		}
	} else if (!cur.query && tgt.query) {
		what.hits.push(serializeUrl({ query: tgt.query }));
	} else if (cur.query) {
		if (!cur.pathname) what.hits[0] = tgt.pathname + what.hits[0];
		if (tgt.query) {
			for (let k in cur.query) delete tgt.query[k];
			let tail = serializeUrl({
				query: tgt.query
			}).substring(1);
			if (tail.length) what.hits.push('&' + tail);
		}
	}
}

export function magnet(value, what, selector) {
	if (value != null) return;
	if (what.attr && !selector) {
		what.attr = null;
		return null;
	}
	let parent = what.parent;
	let prevSibs = 0;
	let nextSibs = 0;
	const tmode = what.mode == "text";
	if (selector) {
		while (selector.startsWith('+')) {
			prevSibs++;
			selector = selector.slice(1);
		}
		while (selector.endsWith('+')) {
			nextSibs++;
			selector = selector.slice(0, -1);
		}
		if (tmode && selector != "*") {
			// eslint-disable-next-line no-console
			console.warn("text mode supports only repeat with * or no selector");
			selector = "*";
		}
		if (selector != "*") {
			parent = parent.closest(selector);
		} else if (what.node) {
			if (prevSibs && what.node.previousElementSibling || nextSibs && what.node.nextElementSibling) parent = what.node;
		}
	}
	if (parent) {
		while (prevSibs-- && parent.previousElementSibling) parent.previousElementSibling.remove();
		while (nextSibs-- && parent.nextElementSibling) parent.nextElementSibling.remove();
		parent.remove();
	}
	return null;
}

export function bmagnet(val, what, sel) {
	magnet(val ? val : null, what, sel);
	return null;
}

export function html(val, what, selector) {
	what.mode = 'html';
	if (val == null || val === true || val === false) return;
	const list = Array.isArray(val) ? val : [val];
	const doc = what.parent.ownerDocument;
	const cont = doc.createElement("div");
	for (let item of list) {
		if (typeof item == "string") {
			cont.insertAdjacentHTML('beforeEnd', item);
		} else if (item.nodeType) {
			cont.appendChild(item);
		}
	}
	if (selector) {
		return cont.querySelectorAll(selector);
	} else {
		return cont;
	}
}

export function text(val, what) {
	what.mode = 'text';
	if (val == null || val === true || val === false) return val;
	if (val.nodeType) return val.innerHTML;
	else return val;
}

export function br(value, what) {
	what.mode = 'br';
}

export function join(list, what, bef, tag, aft) {
	if (list == null || !list.join) return;
	if (!bef) bef = '';
	if (!aft) aft = '';
	if (!tag) return list.join(bef + aft);
	const doc = what.parent.ownerDocument;
	const ret = [];
	for (let i = 0; i < list.length; i++) {
		if (i > 0) ret.push(doc.createElement(tag));
		ret.push(list[i]);
	}
	return ret;
}

export function split(value, what, sep, trim) {
	if (value == null || !value.split) return;
	let list = value.split(sep);
	if (trim != null) list = list.filter(function (item) {
		return item !== trim;
	});
	return list;
}

export function repeat(value, what, selector, alias, step, offset, limit, func) {
	const tmode = what.mode == "text";
	let parent = what.parent;
	const o = Symbols.open;
	const c = Symbols.close;
	let prevSibs = 0;
	let nextSibs = 0;
	let ancestor;
	if (selector) {
		while (selector.startsWith('+')) {
			prevSibs++;
			selector = selector.slice(1);
		}
		while (selector.endsWith('+')) {
			nextSibs++;
			selector = selector.slice(0, -1);
		}
		if (tmode && selector != "*") {
			// eslint-disable-next-line no-console
			console.warn("text mode supports only repeat with * or no selector");
			selector = "*";
		}
		if (selector != "*") {
			parent = parent.closest(selector);
		} else if (what.node) {
			if (prevSibs && what.node.previousElementSibling
				|| nextSibs && what.node.nextElementSibling) {
				parent = what.node;
			}
			if (tmode) {
				ancestor = {
					nodeValue: ''
				};
			}
		}
	} else if (tmode) {
		parent = what.node;
		ancestor = what.ancestor = {
			nodeValue: ''
		};
	}
	const expr = what.expr.clone();


	let ret = findData(what.scope.data, expr.path);
	if (!ret.data) ret = findData(what.data, expr.path);
	let data = ret.data;
	if (typeof data == "string") return;
	if (data == null) data = [];
	const path = expr.path = ret.path;
	const keys = ret.keys;
	const inkeys = ret.inkeys;
	let head = ret.head;
	if (alias) head = alias;
	if (head) path.unshift(head);
	what.expr.filters.splice(0, what.expr.filters.length); // empty next filters
	let cur = what.get();

	if (cur != null) {
		what.hits[what.index] = expr.toString();
		cur = cur.replace(o + expr.initial + c, o + what.hits[what.index] + c);
		what.set([cur]);
	}

	let frag;
	if (tmode) {
		if (selector == "*") parent = {
			nodeValue: o + what.hits[what.index] + c
		};
		let hit = what.hits[what.index - 1];
		if (hit && prevSibs) {
			what.hits[what.index - 1] = hit.slice(0, -prevSibs);
			parent.nodeValue = hit.slice(-prevSibs) + parent.nodeValue;
		}
		hit = what.hits[what.index + 1];
		if (hit && nextSibs) {
			what.hits[what.index + 1] = hit.slice(nextSibs);
			parent.nodeValue = parent.nodeValue + hit.slice(0, nextSibs);
		}
		frag = { nodeValue: parent.nodeValue };
	} else if (!parent) {
		// eslint-disable-next-line no-console
		console.warn("Cannot repeat: ancestor not found", selector);
		return null;
	} else {
		ancestor = parent.parentNode;
		frag = parent.ownerDocument.createDocumentFragment();
		while (prevSibs-- && parent.previousElementSibling) {
			frag.appendChild(parent.previousElementSibling);
		}
		frag.appendChild(parent.cloneNode(true));
		while (nextSibs-- && parent.nextElementSibling) {
			frag.appendChild(parent.nextElementSibling);
		}
		if (!ancestor) {
			what.ancestor = ancestor = frag.cloneNode();
			parent = ancestor.appendChild(parent);
		}
	}
	let scope;
	const scopePath = what.scope.path.slice(0, -path.length);
	if (keys.length) scopePath.push(keys[keys.length - 1]);

	if (inkeys) data = Object.keys(data).map(function (key) {
		return { key: key, val: data[key] };
	});

	step = parseInt(step);
	if (isNaN(step) || step === 0) step = 1;

	offset = parseInt(offset);
	if (isNaN(offset) || offset < 0) offset = 0;

	limit = parseInt(limit);
	if (isNaN(limit) || limit <= 0) limit = Infinity;

	const asc = step > 0;
	const len = data.length - 1;
	let count = 0;
	let scopeData = what.scope.data;
	if (Array.isArray(scopeData)) scopeData = {};
	for (let i = asc ? offset : (len - offset); asc ? i <= len : i >= 0; i += step) {
		if (count++ >= limit) break;
		scope = Object.assign({}, what.scope);
		scope.path = scopePath.slice();
		scope.iskey = inkeys;
		let item = data[i];
		scope.path.push(inkeys ? item.key : i);
		scope.data = Object.assign({}, scopeData);
		scope.alias = alias || head;
		if (head) {
			scope.data[head] = item;
		} else {
			Object.assign(scope.data, item);
		}
		let copy = tmode ? frag.nodeValue : frag.cloneNode(true);
		copy = this.merge(copy, what.data, scope);
		if (func) {
			if (this.filters[func]) {
				this.filters[func](copy, what, ancestor, parent);
				continue;
			} else {
				console.warn("repeat func is not found in filters");
			}
		}
		if (!tmode) {
			ancestor.insertBefore(copy, parent);
		} else {
			ancestor.nodeValue += copy;
		}
	}
	if (!tmode) {
		parent.remove();
		return null;
	} else {
		if (!what.ancestor) return ancestor.nodeValue;
		else return null;
	}
}

export function keys(val) {
	// eslint-disable-next-line no-console
	console.error("This filter is no longer available in matchdom 3.\n\
		The repeat filter can now handle this.");
	return val;
}

export function date(val, what, method, param) {
	const d = new Date(val);
	const fn = method && d[method] || d.toLocaleString;
	return fn.call(d, param);
}

export function padStart(val, what, size, char) {
	if (val == null || !size || char == null) return;
	return val.toString().padStart(size, char);
}

export function padEnd(val, what, size, char) {
	if (val == null || !size || char == null) return;
	return val.toString().padEnd(size, char);
}

export function slice(val, what, begin, end) {
	if (!val || !val.slice) return;
	begin = parseInt(begin);
	if (isNaN(begin)) return;
	end = parseInt(end);
	if (isNaN(end)) end = undefined;
	return val.slice(begin, end);
}

export function trim(val) {
	if (!val) return val;
	return val.toString().trim();
}

export function trimStart(val) {
	if (!val) return val;
	return val.toString().trimStart();
}

export function trimEnd(val) {
	if (!val) return val;
	return val.toString().trimEnd();
}

export function lower(val) {
	if (!val) return val;
	return val.toString().toLowerCase();
}

export function upper(val) {
	if (!val) return val;
	return val.toString().toUpperCase();
}

export function capitalize(val) {
	if (!val) return val;
	const str = val.toString();
	return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
}

export function fill(val, what) {
	if (val === undefined) return;
	const fromNode = !!what.node;
	if (what.parent && !what.tag) {
		what.parent.textContent = "";
		what.node = what.parent.ownerDocument.createTextNode('');
		what.parent.appendChild(what.node);
		if (what.attr && what.attr == what.initialAttr && !fromNode) {
			what.parent.removeAttribute(what.attr);
			delete what.attr;
			delete what.initialAttr;
		}
	}
	if (fromNode) what.hits.forEach(function (h, i) {
		if (typeof h != "string" && what.expr.initial == h[0]) {
			// leave intact for other filters ? but cannot figure out a test for this
		} else {
			what.hits[i] = '';
		}
	});
	if (val == null && what.val !== undefined) {
		return what.val;
	}
}

export function pre(val, what, str) {
	if (val == null || val === '') return val;
	if (val && str != null) val = str + val;
	return val;
}

export function post(val, what, str) {
	if (val == null || val === '') return val;
	if (val && str != null) val += str;
	return val;
}

export function bIs(val, what, yes, no) {
	if (val === true) {
		if (yes === undefined) return what.scope.path.slice(-1).pop();
		return yes;
	} else if (val === false) {
		if (no === undefined) no = '';
		return no;
	} else {
		return val;
	}
}
mappings['?'] = 'bIs';

export function bNot(val) {
	return !val;
}
mappings['!'] = 'bNot';


export function doubleNot(val) {
	return !!val;
}
mappings['!!'] = 'doubleNot';

export function notIs(val, what, yes, no) {
	return bIs(!val, what, yes, no);
}
mappings['!?'] = 'notIs';

export function orEmpty(val, what, str) {
	return str || '';
}
mappings[''] = 'orEmpty';
