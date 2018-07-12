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
		var attr = name;
		if (!name && what.attr) {
			if (what.attr.startsWith('data-')) {
				attr = what.attr.substring(5);
			} else {
				attr = what.attr;
			}
		}
		if (!attr) {
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
				parent.classList.add.apply(parent.classList, value.split(' '))
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
		if (!parent) {
			console.warn("Cannot repeat: ancestor not found", selector);
			return null;
		}
		var o = Symbols.open;
		var c = Symbols.close;
		var data = what.scope.data || what.data;
		var expr = what.expr.clone();
		var path = expr.path;
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
		if (typeof data == "string") return;
		if (data == null) data = [];
		if (alias) head = alias;
		if (head) path.unshift(head);
		what.expr.filters.splice(0, what.expr.filters.length); // empty next filters
		var cur = what.get();
		if (cur != null) {
			what.set(cur.replace(o + expr.initial + c, o + expr.toString() + c));
		}
		var ancestor = parent.parentNode;
		var frag = parent.ownerDocument.createDocumentFragment();
		if (!ancestor) {
			ancestor = frag.cloneNode();
			ancestor.appendChild(parent);
			what.ancestor = ancestor;
		}
		var copy;
		var scope;
		var scopePath = what.scope.path.slice(0, -path.length).concat([keys[keys.length - 1]]);

		if (inkeys) data = Object.keys(data).map(function(key) {
			return {key: key, val: data[key]};
		});

		var item;
		for (var i=0; i < data.length; i++) {
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

			copy = frag.cloneNode();
			copy.appendChild(parent.cloneNode(true));
			copy = matchdom(copy, what.data, what.filters, scope);
			ancestor.insertBefore(copy, parent);
		}
		parent.remove();
		return null;
	},
	keys: function(val) {
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
		if (typeof window !== 'undefined') {
			parent = document.createElement('div');
		} else {
			parent = {};
		}
		parent.textContent = str;
		list = [parent];
	} else {
		list = parent;
	}

	if (list.ownerDocument && typeof list.item != "function" && list.length === undefined) {
		list = [parent];
	}
	list.forEach(function(root) {
		matchEachDom(root, function(node, hits, attr) {
			var what = new What(data, filters, node, attr, scope);
			if (wasText) what.mode = "text";
			what.hits = hits;
			mutateHits(what, hits);
			var allNulls = true;
			hits = hits.filter(function(val) {
				if (val !== null) allNulls = false;
				return val !== undefined;
			});
			if (hits.length > 0) {
				what.set(allNulls ? null : hits.join(''));
			}
			if (what.ancestor) {
				parent = what.ancestor;
				delete what.ancestor;
			}
		});
	});
	return wasText ? parent.textContent : parent;
}

function mutateHits(what, hits) {
	var scopePath = what.scope.path;
	var scopeIsKey = !!what.scope.iskey;
	hits.forEach(function(hit, i) {
		if (typeof hit == "string") return;
		if (hit.length > 1) {
			hit = mutateHits(what, hit).join('');
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
		if (val !== undefined) hits[what.index] = val;
		else hits[what.index] = Symbols.open + what.expr.initial + Symbols.close;
	});
	what.scope = {path: []};

	return hits;
}

function mutate(what) {
	var expr = what.expr;
	var val = what.scope.data && expr.get(what.scope.data);
	if (val === undefined) val = expr.get(what.data);
	var filter, ret;
	while (filter = expr.filters.shift()) {
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
	var node, i, hits;
	while (node = it.nextNode()) {
		if (node.nodeType == Node.ELEMENT_NODE) {
			matchAttributes(node).forEach(function(atthit) {
				fn(node, atthit.list, atthit.attr);
			});
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

function What(data, filters, node, attr, scope) {
	this.mode = 'br';
	this.data = data;
	this.scope = Object.assign({path: []}, scope);
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
		if (!doc) {
			this.node.textContent = str;
			return str;
		}
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
	}
	if (this.initialAttr && this.attr != this.initialAttr) {
		this.parent.removeAttribute(this.initialAttr);
	}

	if (this.attr) {
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
