(function(self) {

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
	attr: function(value, what, name) {
		if (!what.attr) {
			if (name) {
				what.parent.setAttribute(name, value);
				return null;
			} else {
				console.warn("attr filter in text node need a :name parameter");
			}
		} else {
			what.attr = name || what.attr.startsWith('data-') && what.attr.substring(5);
		}
	},
	magnet: function(value, what, selector) {
		if (value != null) return;
		var parent = what.parent;
		if (selector) parent = parent.closest(selector);
		if (parent) parent.remove();
	},
	join: function(value, what, bef, tag, aft) {
		if (value == null || !value.join) return;
		if (!bef) bef = '';
		if (!aft) aft = '';
		if (!tag) return value.join(bef + aft);
		var doc = what.node.ownerDocument;
		for (var i=0; i < value.length; i++) {
			what.parent.insertBefore(doc.createTextNode((i > 0 ? aft : "") + value[i] + bef), what.node);
			if (i < value.length - 1) what.parent.insertBefore(doc.createElement(tag), what.node);
		}
		return "";
	},
	repeat: function(value, what, selector, alias) {
		var node = what.node;
		var parent = what.parent;
		if (selector) parent = parent.closest(selector);
		if (!parent) return null;
		if (value == null) value = [];
		if (typeof value != "object") value = [value];
		var o = matchdom.Symbols.open;
		var c = matchdom.Symbols.close;
		var data = what.data;
		var expr = what.expr.clone();
		what.expr.filters.splice(0, what.expr.filters.length); // empty next filters
		var path = expr.path;
		var head;
		while (path.length) {
			if (typeof data == "object" && data.length) {
				break;
			}
			head = path.shift();
			data = data[head];
			if (data == null) break;
		}
		if (data == null) data = [];
		if (!alias) alias = head;
		path.unshift(alias);
		what.set(what.get().replace(o + expr.initial + c, o + expr.toString() + c));
		var copy, item;
		var grandParent = parent.parentNode;
		for (var i=0; i < data.length; i++) {
			item = {};
			item[alias] = data[i];
			copy = matchdom(parent.cloneNode(true), item, what.filters);
			grandParent.insertBefore(copy, parent);
		}
		parent.remove();
		return null;
	},
	url: function(url, what, name) {
		matchdom.filters.attr(url, what, name);
		var old = what.get().split('?');
		var it = url.split('?');
		if (it[0]) old[0] = it[0];
		if (it[1]) old[1] = it[1];
		return old[0] + (old[1] ? '?' + old[1] : '');
	},
	date: function(val, what, method, param) {
		var d = new Date(val);
		var fn = name && d[method] || d.toLocaleString;
		return fn.call(d, param);
	},
	padStart: function(val, what, size, char) {
		if (val == null || !size || char == null) return;
		return val.toString().padStart(size, char);
	},
	padEnd: function(val, what, size, char) {
		if (val == null || !size || char == null) return;
		return val.toString().padEnd(size, char);
	}
};

function matchdom(root, data, filters) {
	filters = Object.assign({}, matchdom.filters, filters);
	if (data == null) data = {};
	var re = new RegExp('\\' + Symbols.open + '([^\\' + Symbols.open + '\\' + Symbols.close + '<>=""\'\']*)' + Symbols.close, 'g')
	matchEachDom(root, re, function(node, hits, attr) {
		var what = new What(data, filters, node, attr);
		var strlist = hits.map(function(hit) {
			if (hit.str) return hit.str;
			return mutate(what, hit.hits[1]);
		});
		what.set(strlist.join(''));
	});
	return root;
}

function mutate(what, str) {
	var expr = what.expr = new Expression(str, what.filters);
	var data = expr.get(what.data);
	var filter, ret;
	while (filter = expr.filters.shift()) {
		ret = filter.fn.apply(null, [data, what].concat(filter.params));
		if (ret !== undefined) data = ret;
	}
	return data == null ? "" : data;
}

function matchEachDom(root, re, fn) {
	var what = NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT;
	var it = root.ownerDocument.createNodeIterator(root, what);
	var node, i, hits;
	while (node = it.nextNode()) {
		if (node.nodeType == Node.ELEMENT_NODE) {
			matchAttributes(node, re).forEach(function(atthit) {
				fn(node, atthit.list, atthit.attr);
			});
		} else {
			hits = matchText(node.nodeValue, re);
			if (hits.length) fn(node, hits);
		}
	}
}

function matchAttributes(node, re) {
	var hits = [];
	var atts = node.attributes;
	var att, list;
	for (var i=0; i < atts.length; i++) {
		att = atts[i];
		if (!att.value) continue;
		list = matchText(att.value, re);
		if (!list.length) continue;
		hits.push({
			attr: att.name,
			list: list
		});
	}
	return hits;
}

function matchText(str, re) {
	var list = [];
	var hit, index = 0, ok = false;
	while ((hit = re.exec(str)) != null) {
		ok = true;
		if (index != hit.index) list.push({
			str:str.substring(index, hit.index)
		});
		index = hit.index + hit[0].length;
		list.push({
			hits: hit.slice(0)
		});
		re.lastIndex = index;
	}
	if (!ok) return [];
	if (index != str.length) list.push({
		str: str.substring(index)
	});
	return list;
}

function What(data, filters, node, attr) {
	this.data = data;
	this.filters = filters;
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
What.prototype.set = function(str) {
	if (this.node) {
		this.node.nodeValue = str;
	} else {
		if (this.initialAttr && this.attr != this.initialAttr) {
			this.parent.removeAttribute(this.initialAttr);
		}
		this.initialAttr = this.attr;
		if (str != null) this.parent.setAttribute(this.attr, str);
		else this.parent.removeAttribute(this.attr);
	}
	return str;
};

function Expression(str, filters) {
	if (str instanceof Expression) {
		this.initial = str.initial;
		this.path = str.path.slice();
		this.filters = str.filters.slice();
		return this;
	}
	this.initial = str;
	var list = str.split(Symbols.append);
	var path = list.shift();
	if (path == "") this.path = [];
	else this.path = path.split(Symbols.path);
	this.filters = [];
	var name, parts, fn;
	for (var i=0; i < list.length; i++) {
		parts = list[i].split(Symbols.param);
		name = parts.shift();
		fn = filters[name];
		if (fn) this.filters.push({
			name: name,
			fn: fn,
			params: parts
		});
	}
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
	if (path) {
		if (typeof path == "string") path = path.split(matchdom.Symbols.path);
	} else {
		path = this.path;
	}
	for (var i=0; i < path.length; i++) {
		data = data[path[i]];
		if (data == null) break;
	}
	return data;
};

})();
