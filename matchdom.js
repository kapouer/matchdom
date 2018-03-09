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
		what.attr = name || what.attr.startsWith('data-') && what.attr.substring(5);
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
	repeat: function(value, what, selector) {
		var node = what.node;
		var parent = what.parent;
		if (selector) parent = parent.closest(selector);
		if (!parent) return null;
		if (value == null) value = [];
		if (typeof value != "object") value = [value];
		var expr = what.expr;
		var copy;
		var o = matchdom.Symbols.open;
		var c = matchdom.Symbols.close;
		var data = what.data;
		var path = expr.path.slice();
		while (path.length) {
			if (typeof data == "object" && data.length) {
				break;
			}
			data = data[path.shift()];
			if (data == null) break;
		}
		if (data == null) data = [];
		expr.path = path;
		expr.removeFilter('repeat'); // this removes the first repeat
		what.set(what.get().replace(o + expr.initial + c, o + expr.toString() + c));
		for (var i=0; i < data.length; i++) {
			copy = matchdom(parent.cloneNode(true), data[i], what.filters);
			parent.parentNode.insertBefore(copy, parent);
		}
		parent.remove();
	},
	url: function(url, what, name) {
		matchdom.filters.attr(url, what, name);
		var old = what.get().split('?');
		var it = url.split('?');
		if (it[0]) old[0] = it[0];
		if (it[1]) old[1] = it[1];
		return old[0] + (old[1] ? '?' + old[1] : '');
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
	var data = what.data;
	for (var i=0; i < expr.path.length; i++) {
		data = data[expr.path[i]];
		if (data == null) break;
	}
	expr.filters.forEach(function(filter) {
		var params = [data, what].concat(filter.params);
		var ret = filter.fn.apply(null, params);
		if (ret !== undefined) data = ret;
	});
	return data;
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
	var hit, index = 0, sli;
	while ((hit = re.exec(str)) != null) {
		if (index != hit.index) list.push({str:str.substring(index, hit.index)});
		index = hit.index + hit[0].length;
		list.push({hits: hit.slice(0)});
		re.lastIndex = index;
	}
	if (index != str.length) list.push({str: str.substring(index)});
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
		if (this.attr != this.initialAttr) {
			this.parent.removeAttribute(this.initialAttr);
			this.initialAttr = this.attr;
		}
		if (str != null) this.parent.setAttribute(this.attr, str);
		else this.parent.removeAttribute(this.attr);
	}
	return str;
};

function Expression(str, filters) {
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

Expression.prototype.toString = function() {
	var str = this.path.join(Symbols.path);
	if (this.filters.length) str += Symbols.append + this.filters.map(function(obj) {
		var expr = obj.name;
		if (obj.params.length) expr += Symbols.param + obj.params.join(Symbols.param);
		return expr;
	}).join(Symbols.append);
	return str;
};

Expression.prototype.removeFilter = function(name) {
	var found = false;
	this.filters = this.filters.filter(function(obj) {
		if (!found && obj.name == name) {
			found = true;
			return false;
		}
		return true;
	});
};

})(global);
