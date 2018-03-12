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
	or: function(value, what, str) {
		if (value == null) return str;
	},
	eq: function(value, what, str, to) {
		if (value == str) return to;
	},
	not: function(value) {
		if (!value) return null;
	},
	attr: function(value, what, name, selector) {
		if (value === undefined) return;
		if (!what.attr) {
			if (name) {
				var parent = what.parent;
				var parent = what.parent;
				if (selector) parent = parent.closest(selector);
				if (parent && value !== null) {
					if (name == "class") {
						parent.classList.add.apply(parent.classList, value.split(' '))
					} else {
						parent.setAttribute(name, value);
					}
				}
				return null;
			} else {
				console.warn("attr filter in text node need a :name parameter");
			}
		} else {
			if (!selector) {
				var attr = name || what.attr.startsWith('data-') && what.attr.substring(5);
				if (attr) what.attr = attr;
			} else {
				console.warn("attr filter in attribute cannot select ancestor");
			}
		}
	},
	url: function(val, what, name) {
		if (val === undefined) return;
		if (val != null && typeof val != "string") val = "" + val;
		var cur = (what.get() || '').split('?');
		matchdom.filters.attr(val, what, name);
		var tgt = (what.get() || '').split('?');
		var parts = (val || '').split('?');
		if (cur[0] == "") {
			what.hits[0] = tgt[0] + what.hits[0];
		} else if (what.index == 0) {
			if (val.startsWith('?')) {
				if (tgt[0]) {
					what.hits.unshift(tgt[0]);
					what.index++;
				}
			} else if (tgt[1] != null && parts[1] == null) {
				what.hits.push('?' + tgt[1]);
			}
		} else if (cur[1] == null && tgt[1] != null) {
			what.hits.push(tgt[1]);
		}
	},
	magnet: function(value, what, selector) {
		if (value != null) return;
		if (what.attr && !selector) {
			what.attr = null;
			return;
		}
		var parent = what.parent;
		if (selector) parent = parent.closest(selector);
		if (parent) parent.remove();
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
		var doc = what.node.ownerDocument;
		if (what.mode != 'html') for (var i=0; i < value.length; i++) {
			what.parent.insertBefore(doc.createTextNode((i > 0 ? aft : "") + value[i] + bef), what.node);
			if (i < value.length - 1) what.parent.insertBefore(doc.createElement(tag), what.node);
		} else {
			var joiner = bef + (tag ? '<' + tag + '>' : '') + aft;
			what.set(value.join(joiner));
		}
		return "";
	},
	repeat: function(value, what, selector, alias) {
		var parent = what.parent;
		if (selector) parent = parent.closest(selector);
		if (!parent) return null;
		var o = Symbols.open;
		var c = Symbols.close;
		var data = what.scope || what.data;
		var expr = what.expr.clone();
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
		if (typeof data == "string") return;
		if (data == null) data = [];
		if (!alias) alias = head;
		if (alias) path.unshift(alias);
		what.expr.filters.splice(0, what.expr.filters.length); // empty next filters
		var cur = what.get();
		if (cur != null) {
			what.set(cur.replace(o + expr.initial + c, o + expr.toString() + c));
		}
		var copy, scope;
		var ancestor = parent.parentNode;
		if (!ancestor) {
			ancestor = parent.ownerDocument.createDocumentFragment();
			ancestor.appendChild(parent);
			what.ancestor = ancestor;
		}
		for (var i=0; i < data.length; i++) {
			if (alias) {
				scope = {};
				scope[alias] = data[i];
			} else {
				scope = data[i];
			}
			copy = matchdom(parent.cloneNode(true), what.data, what.filters, scope);
			ancestor.insertBefore(copy, parent);
		}
		parent.remove();
		return null;
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

function matchdom(parent, data, filters, scope) {
	filters = Object.assign({}, matchdom.filters, filters);
	if (data == null) data = {};
	var re = new RegExp('\\' + Symbols.open + '([^\\' + Symbols.open + '\\' + Symbols.close + '<>=""\'\']*)' + Symbols.close, 'g');

	matchEachDom(parent, re, function(node, hits, attr) {
		var what = new What(data, filters, node, attr, scope);
		hits = hits.map(function(hit) {
			if (hit.str) return hit.str;
			return new Expression(hit.hits[1], what.filters);
		});
		what.hits = hits;
		hits.forEach(function(hit, i) {
			if (typeof hit == "string") return;
			what.expr = hit;
			what.index = i;
			var val = mutate(what);
			if (val !== undefined) hits[what.index] = val;
			else hits[what.index] = Symbols.open + what.expr.initial + Symbols.close;
		});
		var allNulls = true;
		hits = hits.filter(function(val) {
			if (val !== null) allNulls = false;
			return val !== undefined;
		});
		if (hits.length > 0) {
			what.set(allNulls ? null : hits.join(''));
		}
		if (what.ancestor) parent = what.ancestor;
	});
	return parent;
}

function mutate(what) {
	var expr = what.expr;
	var val = what.scope && expr.get(what.scope);
	if (val === undefined) val = expr.get(what.data);
	var filter, ret;
	while (filter = expr.filters.shift()) {
		ret = filter.fn.apply(null, [val, what].concat(filter.params));
		if (ret !== undefined) val = ret;
	}
	return val;
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

function What(data, filters, node, attr, scope) {
	this.mode = 'br';
	this.data = data;
	if (scope) this.scope = scope;
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
		if (str == null) str = "";
		var doc = this.node.ownerDocument;
		var parent = this.node.parentNode;
		if (this.mode == 'html') {
			var cont = doc.createElement("div");
			cont.innerHTML = str;
			while (cont.firstChild) {
				parent.insertBefore(cont.firstChild, this.node);
			}
			this.node.nodeValue = "";
		} else if (this.mode == 'text') {
			this.node.nodeValue = str;
		} else {
			var list = str.split('\n');
			for (var i=0; i < list.length; i++) {
				last = parent.insertBefore(doc.createTextNode(list[i]), this.node);
				if (i < list.length - 1) parent.insertBefore(doc.createElement('br'), this.node);
			}
			this.node.nodeValue = "";
		}
	} else {
		if (this.initialAttr && this.attr != this.initialAttr) {
			this.parent.removeAttribute(this.initialAttr);
		}
		this.initialAttr = this.attr;
		if (this.attr) {
			if (str != null) this.parent.setAttribute(this.attr, str);
			else this.parent.removeAttribute(this.attr);
		}
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
		if (typeof path == "string") path = path.split(Symbols.path);
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
