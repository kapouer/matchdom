(function() {

if (typeof module !== 'undefined') module.exports = matchdom;
else window.matchdom = matchdom;

var Symbols = matchdom.Symbols = {
	open: '[',
	close: ']',
	path: '.',
	append: '|',
	param: ':'
};

matchdom.filters = {
	or: function(value, what, str) {
		if (value == null) return str;
	},
	eq: function(val, what, str, yes, no) {
		var test = val == str;
		if (yes !== undefined) {
			if (test) return yes;
			else return no !== undefined ? no : val;
		} else {
			return test;
		}
	},
	neq: function(val, what, str, yes, no) {
		var test = val != str;
		if (yes !== undefined) {
			if (test) return yes;
			else return no !== undefined ? no : val;
		} else {
			return test;
		}
	},
	not: function(value) {
		if (!value) return null;
	},
	attr: function(value, what, name, selector) {
		if (value === undefined) return;
		var attr = name;
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
		var parent = what.parent || what.node;

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
	},
	url: function(value, what, name) {
		if (value === undefined) return;
		if (value != null && typeof value != "string") value = "" + value;
		var cur = parseUrl(what.get());
		what.filters.attr(value, what, name);
		var tgt = parseUrl(what.get());
		var val = parseUrl(value);
		if (what.index == 0) {
			if (!val.pathname) {
				if (tgt.pathname) {
					what.hits.unshift(tgt.pathname);
					what.index++;
				}
			} else if (val.pathname) {
				if (!val.query) {
					what.hits.push(serializeUrl({query: tgt.query}));
				} else {
					what.hits[0] = serializeUrl({
						pathname: val.pathname,
						query: Object.assign(tgt.query || {}, val.query)
					});
				}
			}
		} else if (!cur.query && tgt.query) {
			what.hits.push(serializeUrl({query: tgt.query}));
		} else if (cur.query) {
			if (!cur.pathname) what.hits[0] = tgt.pathname + what.hits[0];
			if (tgt.query) {
				for (var k in cur.query) delete tgt.query[k];
				var tail = serializeUrl({
					query: tgt.query
				}).substring(1);
				if (tail.length) what.hits.push('&' + tail);
			}
		}
	},
	magnet: function(value, what, selector) {
		if (value != null) return;
		if (what.attr && !selector) {
			what.attr = null;
			return null;
		}
		var parent = what.parent;
		var prevSibs = 0;
		var nextSibs = 0;
		if (selector) {
			while (selector.startsWith('+')) {
				prevSibs++;
				selector = selector.slice(1);
			}
			while (selector.endsWith('+')) {
				nextSibs++;
				selector = selector.slice(0, -1);
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
	},
	bmagnet: function(val, what, sel) {
		what.filters.magnet(val ? val : null, what, sel);
		return null;
	},
	html: function(value, what) {
		what.mode = 'html';
	},
	text: function(value, what) {
		what.mode = 'text';
	},
	br: function(value, what) {
		what.mode = 'br';
	},
	join: function(value, what, bef, tag, aft) {
		if (value == null || !value.join) return;
		if (!bef) bef = '';
		if (!aft) aft = '';
		if (!tag) return value.join(bef + aft);
		var doc = what.parent.ownerDocument;
		if (what.mode != 'html') for (var i=0; i < value.length; i++) {
			what.parent.insertBefore(doc.createTextNode((i > 0 ? aft : "") + value[i] + bef), what.node);
			if (i < value.length - 1) what.parent.insertBefore(doc.createElement(tag), what.node);
		} else {
			var joiner = bef + (tag ? '<' + tag + '>' : '') + aft;
			what.set(value.join(joiner));
		}
		return "";
	},
	split: function(value, what, sep, trim) {
		if (value == null || !value.split) return;
		var list = value.split(sep);
		if (trim != null) list = list.filter(function(item) {
			return item !== trim;
		});
		return list;
	},
	repeat: function(value, what, selector, alias, step, offset, limit) {
		var parent = what.parent;
		var prevSibs = 0;
		var nextSibs = 0;
		if (selector) {
			while (selector.startsWith('+')) {
				prevSibs++;
				selector = selector.slice(1);
			}
			while (selector.endsWith('+')) {
				nextSibs++;
				selector = selector.slice(0, -1);
			}
			if (selector != "*") {
				parent = parent.closest(selector);
			} else if (what.node) {
				if (prevSibs && what.node.previousElementSibling || nextSibs && what.node.nextElementSibling) parent = what.node;
			}
		}
		if (!parent) {
			// eslint-disable-next-line no-console
			console.warn("Cannot repeat: ancestor not found", selector);
			return null;
		}
		var o = Symbols.open;
		var c = Symbols.close;
		var expr = what.expr.clone();

		var ret = findData(what.scope.data, expr.path);
		if (!ret.data) ret = findData(what.data, expr.path);
		var data = ret.data;
		if (typeof data == "string") return;
		if (data == null) data = [];
		var path = expr.path = ret.path;
		var keys = ret.keys;
		var inkeys = ret.inkeys;
		var head = ret.head;
		if (alias) head = alias;
		if (head) path.unshift(head);
		what.expr.filters.splice(0, what.expr.filters.length); // empty next filters
		var cur = what.get();
		if (cur != null) {
			what.set(cur.replace(o + expr.initial + c, o + expr.toString() + c));
		}
		var ancestor = parent.parentNode;
		var frag = parent.ownerDocument.createDocumentFragment();
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
		var copy;
		var scope;
		var scopePath = what.scope.path.slice(0, -path.length).concat([keys[keys.length - 1]]);

		if (inkeys) data = Object.keys(data).map(function(key) {
			return {key: key, val: data[key]};
		});

		step = parseInt(step);
		if (isNaN(step) || step === 0) step = 1;

		offset = parseInt(offset);
		if (isNaN(offset) || offset < 0) offset = 0;

		limit = parseInt(limit);
		if (isNaN(limit) || limit <= 0) limit = Infinity;

		var item;
		var asc = step > 0;
		var len = data.length - 1;
		var count = 0;
		for (var i = asc ? offset : (len - offset); asc ? i <= len : i >= 0; i += step) {
			if (count++ >= limit) break;
			scope = Object.assign({}, what.scope);
			scope.path = scopePath.slice();
			scope.iskey = inkeys;
			item = data[i];
			scope.path.push(inkeys ? item.key : i);
			scope.data = Object.assign({}, what.scope.data);
			scope.alias = alias || head;
			if (head) {
				scope.data[head] = item;
			} else {
				Object.assign(scope.data, item);
			}

			copy = frag.cloneNode(true);
			copy = matchdom(copy, what.data, what.filters, scope);
			ancestor.insertBefore(copy, parent);
		}
		parent.remove();
		return null;
	},
	keys: function(val) {
		// eslint-disable-next-line no-console
		console.error("This filter is no longer available in matchdom 3.\n\
		The repeat filter can now handle this.");
		return val;
	},
	date: function(val, what, method, param) {
		var d = new Date(val);
		var fn = method && d[method] || d.toLocaleString;
		return fn.call(d, param);
	},
	padStart: function(val, what, size, char) {
		if (val == null || !size || char == null) return;
		return val.toString().padStart(size, char);
	},
	padEnd: function(val, what, size, char) {
		if (val == null || !size || char == null) return;
		return val.toString().padEnd(size, char);
	},
	slice: function(val, what, begin, end) {
		if (!val || !val.slice) return;
		begin = parseInt(begin);
		if (isNaN(begin)) return;
		end = parseInt(end);
		if (isNaN(end)) end = undefined;
		return val.slice(begin, end);
	},
	trim: function(val) {
		if (!val) return val;
		return val.toString().trim();
	},
	trimStart: function(val) {
		if (!val) return val;
		return val.toString().trimStart();
	},
	trimEnd: function(val) {
		if (!val) return val;
		return val.toString().trimEnd();
	},
	lower: function(val) {
		if (!val) return val;
		return val.toString().toLowerCase();
	},
	upper: function(val) {
		if (!val) return val;
		return val.toString().toUpperCase();
	},
	capitalize: function(val) {
		if (!val) return val;
		var str = val.toString();
		return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
	},
	fill: function(val, what) {
		if (val === undefined) return;
		what.parent.textContent = "";
		var fromNode = !!what.node;
		what.node = what.parent.ownerDocument.createTextNode('');
		what.parent.appendChild(what.node);
		if (what.attr && what.attr == what.initialAttr && !fromNode) {
			what.parent.removeAttribute(what.attr);
			delete what.attr;
			delete what.initialAttr;
		}
		if (fromNode) what.hits.forEach(function(h, i) {
			if (typeof h != "string" && what.expr.initial == h[0]) {
				// leave intact for other filters ? but cannot figure out a test for this
			} else {
				what.hits[i] = '';
			}
		});
		if (val == null && what.val !== undefined) {
			return what.val;
		}
	},
	pre: function(val, what, str) {
		if (val == null || val === '') return val;
		if (val && str != null) val = str + val;
		return val;
	},
	post: function(val, what, str) {
		if (val == null || val === '') return val;
		if (val && str != null) val += str;
		return val;
	},
	'?': function(val, what, yes, no) {
		if (val === true) {
			if (yes === undefined) return what.scope.path.slice(-1).pop();
			return yes;
		} else if (val === false) {
			if (no === undefined) no = '';
			return no;
		} else {
			return val;
		}
	},
	'!': function(val) {
		return !val;
	},
	'!!': function(val) {
		return !!val;
	},
	'!?': function(val, what, yes, no) {
		return what.filters['?'](!val, what, yes, no);
	},
	'': function(val, what, str) {
		return str || '';
	}
};

function matchdom(parent, data, filters, scope) {
	filters = Object.assign({}, matchdom.filters, filters);
	if (data == null) data = {};
	var wasText = false;
	var list;
	if (typeof parent == "string") {
		wasText = true;
		var str = parent;
		parent = {
			textContent: str
		};
		list = [parent];
	} else {
		list = parent;
	}

	if (typeof list.forEach != "function") {
		list = [list];
	}
	list.forEach(function(root) {
		var replacements = [];
		matchEachDom(root, function(node, hits, attr) {
			var what = new What(data, filters, node, attr, scope);
			if (wasText) what.mode = "text";
			what.hits = hits;
			what.level = 0;
			mutateHits(what, hits);
			var allNulls = true;
			var allTrue = true;
			var allBools = true;
			hits = hits.filter(function(val) {
				if (val !== null) allNulls = false;
				if (val === true) ; // do nothing
				else if (val === false) allTrue = false;
				else allBools = false;
				return val !== undefined;
			});
			if (hits.length > 0) {
				var result;
				if (allNulls) result = null;
				else if (allBools) result = allTrue;
				else result = hits;
				what.set(result);
			}
			if (what.replacement) replacements.unshift(what.replacement);
			if (what.ancestor) {
				parent = what.ancestor;
				delete what.ancestor;
			}
		});
		replacements.forEach(function(pair) {
			var old = pair[1];
			var tag = pair[0];
			var atts = old.attributes;
			var att;
			for (var i=0; i < atts.length; i++) {
				att = atts[i];
				tag.setAttribute(att.name, att.value);
			}
			while (old.firstChild) tag.appendChild(old.firstChild);
			if (old.parentNode) {
				old.parentNode.replaceChild(tag, old);
			} else if (old == parent) {
				parent = tag;
			}
		});
	});
	return wasText ? parent.textContent : parent;
}

function mutateHits(what, hits) {
	var scopePath = what.scope.path;
	var scopeIsKey = !!what.scope.iskey;
	what.level++;
	hits.forEach(function(hit, i) {
		if (typeof hit == "string") {
			return;
		}
		if (hit.length > 1 || typeof hit[0] != "string") {
			hit = mutateHits(what, hit).join('')
		} else {
			hit = hit[0];
		}
		what.expr = new Expression(hit, what.filters);
		what.index = i;
		var path = what.expr.path;
		var beg = 0;
		if (path[0] == what.scope.alias) {
			beg = 1;
			if (scopeIsKey) {
				delete what.scope.iskey;
				if (path.length >= 2) {
					if (path[1] == "key") {
						what.scope.iskey = true;
						beg = 2;
					} else if (path[1] == "val") {
						what.scope.iskey = false;
						beg = 2;
					}
				}
			}
			what.scope.path = scopePath.concat(path.slice(beg));
		} else {
			what.scope.path = path.slice(beg);
		}
		var val = mutate(what);
		if (val !== undefined) {
			if (what.level == 1 && typeof val == "string") hits[what.index] = { val: val };
			else hits[what.index] = val;
		} else {
			hits[what.index] = Symbols.open + what.expr.initial + Symbols.close;
		}
	});
	what.scope.path = [];
	return hits;
}

function mutate(what) {
	var expr = what.expr;
	var val = what.scope.data && expr.get(what.scope.data);
	if (val === undefined) val = expr.get(what.data);
	if (expr.last && val === undefined) val = null;
	var filter, ret;
	var hooks = [];
	if (expr.hook) hooks.push(expr.hook);
	while (expr.filter < expr.filters.length || hooks.length) {
		filter = expr.filters[expr.filter++] || hooks.shift();
		if (val !== null) what.val = val;
		ret = filter.fn.apply(null, [val, what].concat(filter.params));
		if (ret !== undefined) val = ret;
	}
	return val;
}

function matchEachDom(root, fn) {
	if (!root.ownerDocument) {
		fn(root, tokenize(root.textContent));
		return;
	}
	var what = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT;
	var it = root.ownerDocument.createNodeIterator(root, what);
	var node, hits;
	while ((node = it.nextNode())) {
		if (node.nodeType == Node.ELEMENT_NODE) {
			matchAttributes(node).forEach(function(atthit) {
				fn(node, atthit.list, atthit.attr);
			});
			hits = tokenize(node.tagName.toLowerCase());
			if (hits.length > 1 || hits.length == 1 && typeof hits[0] != "string") fn(node, hits, true);
		} else {
			hits = tokenize(node.nodeValue);
			if (hits.length > 1 || hits.length == 1 && typeof hits[0] != "string") fn(node, hits);
		}
	}
}

function matchAttributes(node) {
	var hits = [];
	var atts = node.attributes;
	var att, list;
	for (var i=0; i < atts.length; i++) {
		att = atts[i];
		if (!att.value) continue;
		list = tokenize(att.value);
		if (!list.length) continue;
		hits.push({
			attr: att.name,
			list: list
		});
	}
	return hits;
}

function tokenize(str) {
	var list = [];
	_tokenize(list, str, 0, str.length);
	return list;
}
function _tokenize(list, str, pos, len) {
	var openPos, closePos;
	while (pos < len) {
		openPos = str.indexOf(Symbols.open, pos);
		closePos = str.indexOf(Symbols.close, pos);
		if (openPos >= pos && (openPos < closePos || closePos < pos)) {
			if (pos != openPos) list.push(str.substring(pos, openPos));
			var sub = [];
			pos = _tokenize(sub, str, openPos + 1, len);
			if (sub.length > 0) list.push(sub);
		} else if (closePos >= pos && (closePos < openPos || openPos < pos)) {
			if (pos != closePos) list.push(str.substring(pos, closePos));
			return closePos + 1;
		} else {
			list.push(str.substring(pos));
			pos = len;
		}
	}
	return pos;
}

function parseUrl(str) {
	var obj = {};
	var parts = (str || '').split('?');
	obj.pathname = parts[0];
	if (parts.length > 1) {
		obj.query = {};
		parts[1].split('&').forEach(function(pair) {
			pair = pair.split('=');
			obj.query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
		});
	}
	return obj;
}

function serializeUrl(obj) {
	var str = obj.query && Object.keys(obj.query).map(function(key) {
		return key + '=' + obj.query[key];
	}).join('&');
	return (obj.pathname || '') + (str && '?' + str || '');
}

function findData(data, path) {
	if (!data) return {};
	path = path.slice();
	var keys = [];
	var head;
	var inkeys = false;
	while (path.length && inkeys == false) {
		if (typeof data == "object" && data.length) {
			break;
		}
		head = path.shift();
		if (head.endsWith('+')) {
			if (data[head]) {
				// eslint-disable-next-line no-console
				console.warn("repeat filter ignores", head, "because the key exists");
			} else {
				head = head.slice(0, -1);
				inkeys = true;
			}
		}
		data = data[head];
		if (data == null) break;
		keys.push(head);
	}
	return {
		head: head,
		path: path,
		keys: keys,
		inkeys: inkeys,
		data: data
	};
}

function What(data, filters, node, attr, scope) {
	this.mode = 'br';
	this.data = data;
	this.scope = Object.assign({path: []}, scope);
	this.filters = filters;
	if (attr === true) {
		this.tag = true;
		attr = false;
	}
	if (attr) {
		this.initialAttr = attr;
		this.attr = attr;
		this.parent = node;
	} else {
		this.node = node;
		this.parent = node.parentNode;
	}
}
What.prototype.get = function() {
	if (this.node) return this.node.nodeValue;
	else return this.parent.getAttribute(this.attr);
};

function textOut(hits) {
	if (hits == null) return hits;
	else if (hits === true || hits === false) return hits;
	else if (Array.isArray(hits)) return hits.map(function(hit) {
		if (hit == null) return "";
		else if (hit.val != null) return hit.val;
		else return hit;
	}).join('');
	else return hits;
}

What.prototype.set = function(hits) {
	var str;
	var node = this.node;
	var doc = node ? node.ownerDocument : null;
	if (this.tag) {
		if (!doc) return;
		str = textOut(hits);
		var tag = doc.createElement('body');
		// customize built-in elements compatibility
		var is = node.getAttribute('is');
		if (is) str += ' is="' + is + '"';
		tag.innerHTML = '<' + str + '></' + str + '>';
		tag = tag.firstChild;
		this.replacement = [tag, node];
		return;
	}
	if (node) {
		if (!doc) {
			node.textContent = textOut(hits);
			return;
		}
		var parent = this.parent;
		if (!parent) {
			// do nothing
		} else if (this.mode == 'html') {
			var cont = doc.createElement("div");
			cont.innerHTML = textOut(hits);
			while (cont.firstChild) {
				parent.insertBefore(cont.firstChild, node);
			}
			node.nodeValue = "";
		} else if (this.mode == 'text') {
			node.nodeValue = textOut(hits);
		} else if (Array.isArray(hits)) {
			var cur = node;
			hits.forEach(function(obj, i) {
				var list;
				if (obj == null) list = [''];
				else if (obj === true || obj === false) list = [obj.toString()];
				else if (typeof obj == "object" && obj.val != null) list = obj.val.toString().split('\n');
				else list = [obj];
				if (i == 0) node.nodeValue = list[0];
				else cur = parent.insertBefore(doc.createTextNode(list[0]), cur.nextSibling);
				for (var j=1; j < list.length; j++) {
					cur = parent.insertBefore(doc.createElement('br'), cur.nextSibling);
					cur = parent.insertBefore(doc.createTextNode(list[j]), cur.nextSibling);
				}
			});
		} else {
			node.nodeValue = hits;
		}
	}
	if (this.initialAttr && this.attr != this.initialAttr) {
		this.parent.removeAttribute(this.initialAttr);
	}

	if (this.attr) {
		str = textOut(hits);
		if (str === null) str = "";
		else str = str.toString();
		this.initialAttr = this.attr;
		if (typeof str == "string") str = str.trim();
		if (hits === false || hits == null || (this.attr == "class" && str === "")) {
			this.parent.removeAttribute(this.attr);
		} else {
			if (hits === true) {
				if (this.attr.startsWith('data-') == false) str = "";
			} else if (this.attr == "class" && typeof str == "string") {
				str = str.replace(/[\n\t\s]+/g, ' ').trim();
			}
			this.parent.setAttribute(this.attr, str);
		}
	}
};

function Expression(str, filters) {
	this.filter = 0;
	if (str instanceof Expression) {
		this.initial = str.initial;
		this.path = str.path.slice();
		this.filters = str.filters.slice(str.filter);
		return this;
	}
	this.initial = str;
	var sa = Symbols.append;
	var list = str.split(sa);
	var path = list.shift();
	if (path == "") this.path = [];
	else this.path = path.split(Symbols.path);
	this.filters = [];
	var name, parts, fn;

	for (var i=0; i < list.length; i++) {
		parts = list[i].split(Symbols.param);
		name = parts.shift();
		parts = parts.map(function(pt) {
			try {
				return decodeURIComponent(pt);
			} catch(ex) {
				return pt;
			}
		});
		fn = filters[name];
		if (!fn) continue;
		this.filters.push({
			name: name,
			fn: fn,
			params: parts
		});
		name = name + sa;
		fn = filters[name];
		if (fn) this.filters.push({
			name: name,
			fn: fn,
			params: []
		});
	}
	name = sa + sa;
	fn = filters[name];
	if (fn) this.hook = {
		name: name,
		fn: fn,
		params: []
	};
}

Expression.prototype.clone = function() {
	return new Expression(this);
};

Expression.prototype.toString = function() {
	var str = this.path.join(Symbols.path);
	if (this.filters.length) str += Symbols.append + this.filters.map(function(obj) {
		var expr = obj.name;
		if (obj.params.length) expr += Symbols.param + obj.params.join(Symbols.param);
		return expr;
	}).join(Symbols.append);
	return str;
};

Expression.prototype.get = function(data, path) {
	this.last = false;
	if (path) {
		if (typeof path == "string") path = path.split(Symbols.path);
	} else {
		path = this.path;
	}
	if (path.length == 0) return;
	for (var i=0; i < path.length; i++) {
		data = data[path[i]];
		if (data == null) {
			i += 1;
			break;
		}
	}
	if (data === undefined && i == path.length) this.last = true;
	return data;
};

})();
