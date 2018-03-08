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
		var parent = what.node.parentNode;
		if (selector) parent = parent.closest(selector);
		if (parent) parent.remove();
	},
	join: function(value, what, bef, tag, aft) {
		if (value == null || !value.join) return;
		if (!bef) bef = '';
		if (!aft) aft = '';
		if (!tag) return value.join(bef + aft);
		var parent = what.node.parentNode;
		var doc = what.node.ownerDocument;
		for (var i=0; i < value.length; i++) {
			parent.insertBefore(doc.createTextNode((i > 0 ? aft : "") + value[i] + bef), what.node);
			if (i < value.length - 1) parent.insertBefore(doc.createElement(tag), what.node);
		}
		return "";
	},
	repeat: function(value, what, selector) {
		var node = what.node;
		var parent = node.parentNode;
		if (selector) parent = parent.closest(selector);
		if (!parent) return null;
		if (value == null) value = [];
		if (typeof value != "object") value = [value];
		var expr = what.expr;
		var copy;
		var ini = what.expr.initial;
		var cur;
		var o = matchdom.Symbols.open;
		var c = matchdom.Symbols.close;
		expr.removeFilter('repeat');
		expr.path.push(-1);
		for (var i=0; i < value.length; i++) {
			expr.path[expr.path.length - 1] = i;
			cur = expr.toString();
			node.nodeValue = node.nodeValue.replace(o + ini + c, o + cur + c);
			ini = cur;
			copy = matchdom(parent.cloneNode(true), what.data, what.filters);
			parent.parentNode.insertBefore(copy, parent);
		}
		parent.remove();
	}
};

function matchdom(root, data, filters) {
	filters = Object.assign({}, matchdom.filters, filters);
	if (data == null) data = {};
	var re = new RegExp('\\' + Symbols.open + '([^\\' + Symbols.open + '\\' + Symbols.close + '<>=""\'\']+)' + Symbols.close, 'g')
	matchEachDom(root, re, function(node, hits, attr) {
		var what = {
			data: data,
			node: node,
			attr: attr,
			filters: filters
		};
		var strlist = hits.map(function(hit) {
			if (hit.str) return hit.str;
			return mutate(what, hit.hits[1]);
		});
		var str = strlist.join('');
		if (!attr) {
			node.nodeValue = str;
		} else {
			if (attr != what.attr) node.removeAttribute(attr);
			attr = what.attr;
			if (str.length && attr) node.setAttribute(attr, str);
		}
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
				fn(node, atthit.list, atthit.name);
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
			name: att.name,
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

function Expression(str, filters) {
	this.initial = str;
	var list = str.split(Symbols.append);
	this.path = list.shift().split(Symbols.path);
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
	this.filters = this.filters.filter(function(obj) {
		return obj.name != name;
	});
};

})(global);
