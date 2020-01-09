const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('domify');
require('dom4'); // jsdom is missing .closest

describe('value', function() {
	it('should be undefined', function() {
		let node = dom(`<a>Size[size|try]</a>`);
		var hasTried = false;
		let copy = matchdom(node, {}, {try: function(val) {
			hasTried = true;
			assert.equal(val, undefined);
		}});
		assert.equal(hasTried, true);
		assert.equal(copy.outerHTML, '<a>Size</a>');
	});

	it('should be undefined and not merge level 2', function() {
		let node = dom(`<a>Size[obj.size|try]</a>`);
		var hasTried = false;
		let copy = matchdom(node, {}, {try: function(val) {
			hasTried = true;
			assert.equal(val, undefined);
		}});
		assert.equal(hasTried, true);
		assert.equal(copy.outerHTML, '<a>Size[obj.size|try]</a>');
	});
});

describe('parameters', function() {
	it('should uri-decode value', function() {
		let node = dom(`<a>Size[size|pre:%3A |post: mm]</a>`);
		let copy = matchdom(node, {size: 10});
		assert.equal(copy.outerHTML, '<a>Size: 10 mm</a>');
	});
	it('should leave value untouched if not uri-decodable', function() {
		let node = dom(`<a>Percent[pp|post: %|pre:%3A ]</a>`);
		let copy = matchdom(node, {pp: 10});
		assert.equal(copy.outerHTML, '<a>Percent: 10 %</a>');
	});
});

describe('what', function() {
	it('cancel drops merging of expression', function() {
		let node = dom(`<p>[arr|drop]</p>`);
		let copy = matchdom(node, {
			arr: ['word1', 'word2']
		}, {
			drop: function(val, what) {
				what.cancel = true;
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[arr|drop]</p>');
	});

	it('cancel drops merging of missing level one expression', function() {
		let node = dom(`<p>[arr|drop]</p>`);
		let copy = matchdom(node, {}, {
			drop: function(val, what) {
				what.cancel = true;
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[arr|drop]</p>');
	});

	it('cancel drops merging of level two expression', function() {
		let node = dom(`<p>[obj.toto|drop]</p>`);
		let copy = matchdom(node, {obj: {toto:1}}, {
			drop: function(val, what) {
				what.cancel = true;
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[obj.toto|drop]</p>');
	});

	it('cancel drops merging of missing level two expression', function() {
		let node = dom(`<p>[arr.toto|drop]</p>`);
		let copy = matchdom(node, {}, {
			drop: function(val, what) {
				what.cancel = true;
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[arr.toto|drop]</p>');
	});
});

describe('html filter', function() {
	it('should select nodes', function() {
		let node = dom(`<p>[str|html:span]</p>`);
		let copy = matchdom(node, {
			str: '<img src="toto"><span>test</span><i>test</i><span>toto</span>'
		});
		assert.equal(copy.outerHTML, '<p><span>test</span><span>toto</span></p>');
	});
});

describe('join filter', function() {
	it('with space', function() {
		let node = dom(`<p>[arr|join: ]</p>`);
		let copy = matchdom(node, {
			arr: ['word1', 'word2']
		});
		assert.equal(copy.outerHTML, '<p>word1 word2</p>');
	});

	it('with newline in br mode', function() {
		let node = dom(`<p>[arr|join:%0A]</p>`);
		let copy = matchdom(node, {
			arr: ['line1', 'line2']
		});
		assert.equal(copy.outerHTML, '<p>line1<br>line2</p>');
	});

	it('html with <br>', function() {
		let node = dom(`<p>[arr|join::br|html]</p>`);
		let copy = matchdom(node, {
			arr: ['<b>line1</b>', '<i>line2</i>']
		});
		assert.equal(copy.outerHTML, '<p><b>line1</b><br><i>line2</i></p>');
	});
});

describe('split filter', function() {
	it('with space', function() {
		let node = dom(`<p>[text|split: |join:X]</p>`);
		let copy = matchdom(node, {
			text: 'word1 word2'
		});
		assert.equal(copy.outerHTML, '<p>word1Xword2</p>');
	});
	it('with newlines and trim', function() {
		let node = dom(`<p>[text|split:%0A:|join:X]</p>`);
		let copy = matchdom(node, {
			text: 'word1\nword2\nword3\n'
		});
		assert.equal(copy.outerHTML, '<p>word1Xword2Xword3</p>');
	});
	it('with newlines and trim by value', function() {
		let node = dom(`<p>[text|split:%0A:word2|join:X]</p>`);
		let copy = matchdom(node, {
			text: 'word1\nword2\nword3'
		});
		assert.equal(copy.outerHTML, '<p>word1Xword3</p>');
	});
});

describe('slice filter', function() {
	it('should slice array with begin and end', function() {
		let node = dom(`<p>[arr|slice:1:3|join: ]</p>`);
		let copy = matchdom(node, {
			arr: ['word1', 'word2', 'word3']
		});
		assert.equal(copy.outerHTML, '<p>word2 word3</p>');
	});
	it('should slice array with begin', function() {
		let node = dom(`<p>[arr|slice:2|join: ]</p>`);
		let copy = matchdom(node, {
			arr: ['word1', 'word2', 'word3', 'word4']
		});
		assert.equal(copy.outerHTML, '<p>word3 word4</p>');
	});
});

describe('pad', function() {
	it('start', function() {
		let node = dom(`<p>[str|padStart:3:x]</p>`);
		let copy = matchdom(node, {
			str: 'a'
		});
		assert.equal(copy.outerHTML, '<p>xxa</p>');
	});

	it('end', function() {
		let node = dom(`<p>[str|padEnd:3:x]</p>`);
		let copy = matchdom(node, {
			str: 'a'
		});
		assert.equal(copy.outerHTML, '<p>axx</p>');
	});
});

describe('or', function() {
	it('should set a default value', function() {
		let node = dom(`<p data-class="[test.yop|or:myclass|attr]" data-test="[vide|or:nothing|attr]">[str|or:empty] - [nul]</p>`);
		let copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<p class="myclass" test="nothing">empty - </p>');
	});
});

describe('eq', function() {
	it('should return boolean true', function() {
		let node = dom(`<p>[val|eq:ceci]</p>`);
		let copy = matchdom(node, {val: 'ceci'});
		assert.equal(copy.outerHTML, '<p>true</p>');
	});
	it('should return boolean false', function() {
		let node = dom(`<p>[val|eq:cela]</p>`);
		let copy = matchdom(node, {val: 'ceci'});
		assert.equal(copy.outerHTML, '<p>false</p>');
	});
	it('should set another value if equal', function() {
		let node = dom(`<p>[val|eq:ceci:cela]</p>`);
		let copy = matchdom(node, {val: 'ceci'});
		assert.equal(copy.outerHTML, '<p>cela</p>');
	});
	it('should set another value if not equal', function() {
		let node = dom(`<p>[val|eq:ceci:cela:non]</p>`);
		let copy = matchdom(node, {val: 'ceca'});
		assert.equal(copy.outerHTML, '<p>non</p>');
	});
	it('should not change value if not equal and no third param is set', function() {
		let node = dom(`<p>[val|eq:ceci:cela]</p>`);
		let copy = matchdom(node, {val: 'ceca'});
		assert.equal(copy.outerHTML, '<p>ceca</p>');
	});
});

describe('neq', function() {
	it('should return boolean true', function() {
		let node = dom(`<p>[val|neq:ceci]</p>`);
		let copy = matchdom(node, {val: 'cecia'});
		assert.equal(copy.outerHTML, '<p>true</p>');
	});
	it('should return boolean false', function() {
		let node = dom(`<p test="[val|neq:cela]">ora</p>`);
		let copy = matchdom(node, {val: 'cela'});
		assert.equal(copy.outerHTML, '<p>ora</p>');
	});
});

describe('gt', function() {
	it('should parse float, compare, and return boolean true', function() {
		let node = dom(`<p>[val|gt:0.5]</p>`);
		let copy = matchdom(node, {val: 0.6});
		assert.equal(copy.outerHTML, '<p>true</p>');
	});
	it('should fail to parse float and return value', function() {
		let node = dom(`<p>[val|gt:0.5]</p>`);
		let copy = matchdom(node, {val: "xx"});
		assert.equal(copy.outerHTML, '<p>xx</p>');
	});
});

describe('not', function() {
	it('should set to null if empty', function() {
		let node = dom(`<p data-test="[val|not]">test</p>`);
		let copy = matchdom(node, {val: ''});
		assert.equal(copy.outerHTML, '<p>test</p>');
	});
});

describe('?', function() {
	it('should set a value when true', function() {
		let node = dom(`<p>[val|?:ceci:cela]</p>`);
		let copy = matchdom(node, {val: true});
		assert.equal(copy.outerHTML, '<p>ceci</p>');
	});
	it('should set a value when false', function() {
		let node = dom(`<p>[val|?:ceci:cela]</p>`);
		let copy = matchdom(node, {val: false});
		assert.equal(copy.outerHTML, '<p>cela</p>');
	});
	it('should set an empty string when false is not set', function() {
		let node = dom(`<p>[val|?:ceci]</p>`);
		let copy = matchdom(node, {val: false});
		assert.equal(copy.outerHTML, '<p></p>');
	});
	it('should set last path component when true is not set', function() {
		let node = dom(`<p>[to.val|?]</p>`);
		let copy = matchdom(node, {to: {val: true}});
		assert.equal(copy.outerHTML, '<p>val</p>');
	});
	it('should set empty string when true is not set', function() {
		let node = dom(`<p>[val|?]</p>`);
		let copy = matchdom(node, {val: false});
		assert.equal(copy.outerHTML, '<p></p>');
	});
});

describe('empty filter', function() {
	it('should set to empty string', function() {
		let node = dom(`<p>[val|]</p>`);
		let copy = matchdom(node, {val: 'toto'});
		assert.equal(copy.outerHTML, '<p></p>');
	});
	it('should set to string', function() {
		let node = dom(`<p>[val|:def]</p>`);
		let copy = matchdom(node, {val: 'toto'});
		assert.equal(copy.outerHTML, '<p>def</p>');
	});
});

describe('!?', function() {
	it('should set last path component when true is not set', function() {
		let node = dom(`<p>[to.val|!?]</p>`);
		let copy = matchdom(node, {to: {val: false}});
		assert.equal(copy.outerHTML, '<p>val</p>');
	});
});

describe('pre', function() {
	it('should not prepend string if value is empty', function() {
		let node = dom(`<a class="test [button|pre:ui ]">test</a>`);
		let copy = matchdom(node, {button: ''});
		assert.equal(copy.outerHTML, '<a class="test">test</a>');
	});
	it('should prepend string if value is not empty', function() {
		let node = dom(`<a class="[button|pre:ui ]">test</a>`);
		let copy = matchdom(node, {button: 'button'});
		assert.equal(copy.outerHTML, '<a class="ui button">test</a>');
	});
});

describe('post', function() {
	it('should not append string if value is empty', function() {
		let node = dom(`<a class="test [size|post: wide]">test</a>`);
		let copy = matchdom(node, {size: ''});
		assert.equal(copy.outerHTML, '<a class="test">test</a>');
	});
	it('should append string if value is not empty', function() {
		let node = dom(`<a class="test [size|post: wide]">test</a>`);
		let copy = matchdom(node, {size: 'ten'});
		assert.equal(copy.outerHTML, '<a class="test ten wide">test</a>');
	});
});

describe('date filter', function() {
	it('toLocaleString', function() {
		let node = dom(`<p>[str|date::en]</p>`);
		let copy = matchdom(node, {
			str: '2018-03-09T11:12:56.739Z'
		});
		assert.equal(copy.outerHTML, '<p>3/9/2018, 12:12:56 PM</p>');
	});

	it('getYear', function() {
		let node = dom(`<p>[str|date:getFullYear]</p>`);
		let copy = matchdom(node, {
			str: '2018-03-09T11:12:56.739Z'
		});
		assert.equal(copy.outerHTML, '<p>2018</p>');
	});
});

describe('url filter', function() {
	it('should merge url query with target pathname', function() {
		let node = dom(`<a href="/test" data-href="[href|url]">[title]</a>`);
		let copy = matchdom(node, {
			href: '?arg=1&val=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?arg=1&amp;val=2">anchor</a>');
	});

	it('should merge url pathname with target query', function() {
		let node = dom(`<a href="/test?toto=1" data-href="[href|url]">[title]</a>`);
		let copy = matchdom(node, {
			href: '/path',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/path?toto=1">anchor</a>');
	});

	it('should overwrite target with url', function() {
		let node = dom(`<a href="/test?toto=1" data-href="[href|url]">[title]</a>`);
		let copy = matchdom(node, {
			href: '/path?a=1&b=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/path?a=1&amp;b=2">anchor</a>');
	});

	it('should overwrite target query name with partial template', function() {
		let node = dom(`<a href="/test?id=1" data-href="?id=[id|url]">[title]</a>`);
		let copy = matchdom(node, {
			id: 'xx',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?id=xx">anchor</a>');
	});

	it('should merge url query with partial template', function() {
		let node = dom(`<a href="/test?toto=1" data-href="?id=[id|url]">[title]</a>`);
		let copy = matchdom(node, {
			id: 'xx',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?id=xx&amp;toto=1">anchor</a>');
	});

	it('should overwrite url pathname and query with partial template', function() {
		let node = dom(`<a href="/test?toto=1" data-href="/this?id=[id|url]&amp;const=1">[title]</a>`);
		let copy = matchdom(node, {
			id: 'xx',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/this?id=xx&amp;const=1&amp;toto=1">anchor</a>');
	});

	it('should merge url query with partial template when repeated', function() {
		let node = dom(`<div><a href="/test?id=1" data-href="?id=[id|repeat:*|url]">[title]</a></div>`);
		let copy = matchdom(node, [{
			id: 'xx',
			title: 'anchor'
		}]);
		assert.equal(copy.outerHTML, '<div><a href="/test?id=xx">anchor</a></div>');
	});

	it('should be able to be called multiple times for the same attribute', function() {
		let node = dom(`<div><a href="/test?status=0" data-href="?id=[id|url]&amp;status=[status|url]">[title]</a></div>`);
		let copy = matchdom(node, {
			id: 'xx',
			title: 'anchor',
			status: "12"
		});
		assert.equal(copy.outerHTML, '<div><a href="/test?id=xx&amp;status=12">anchor</a></div>');
	});

	it('should not crash when data is not string', function() {
		let node = dom(`<div><a href="/test" data-href="?id=[id|url]">aaa</a></div>`);
		let copy = matchdom(node, {
			id: 12
		});
		assert.equal(copy.outerHTML, '<div><a href="/test?id=12">aaa</a></div>');
	});
});

describe('fill filter', function() {
	it('should fill current node', function() {
		let node = dom(`<p>a[field|fill]b</p>`);
		let copy = matchdom(node, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});

	it('should fill current node from attribute', function() {
		let node = dom(`<p data-template="[field|fill]">ab</p>`);
		let copy = matchdom(node, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});

	it('should fill current node from attribute using html', function() {
		let node = dom(`<p data-template="[field|fill|html]">ab</p>`);
		let copy = matchdom(node, {
			field: '<b>word</b>'
		});
		assert.equal(copy.outerHTML, '<p><b>word</b></p>');
	});

	it('should not fill current node', function() {
		let node = dom(`<p>a[field.it|fill]b</p>`);
		let copy = matchdom(node, {
			other: 'word'
		});
		assert.equal(copy.outerHTML, '<p>a[field.it|fill]b</p>');
	});

	it('should not fill from attribute', function() {
		let node = dom(`<p data-template="[field.it|fill]">abb</p>`);
		let copy = matchdom(node, {
			other: 'word'
		});
		assert.equal(copy.outerHTML, '<p data-template="[field.it|fill]">abb</p>');
	});

	it('should fill current node and set an attribute using two separate expressions', function() {
		let node = dom(`<p data-fill="[field|fill]" data-attr="[field2|attr:class]">astuffb</p>`);
		let copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<p class="myclass">word</p>');
	});

	it('should fill current node and set an attribute on parent node using two separate expressions', function() {
		let node = dom(`<div><p data-fill="[field|fill]" data-attr="[field2|attr:class:div]">astuffb</p></div>`);
		let copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<div class="myclass"><p>word</p></div>');
	});

	it('should fill current node before setting an attribute from within', function() {
		let node = dom(`<p data-expr="[field|fill]">a[field|attr:class]b</p>`);
		let copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});

	it('should set an attribute partially filled', function() {
		let node = dom(`<div><p data-attr="toto[field|fill]aa">astuffb</p></div>`);
		let copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<div><p>totowordaa</p></div>');
	});
});

