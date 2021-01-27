import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => new Matchdom({filters}).merge(node, data);

describe('value', function() {
	it('should be undefined', function() {
		let node = dom(`<a>Size[size|try:]</a>`);
		var hasTried = false;
		let copy = matchdom(node, {}, {try: function(val) {
			hasTried = true;
			assert.equal(val, undefined);
		}});
		assert.equal(hasTried, true);
		assert.equal(copy.outerHTML, '<a>Size</a>');
	});

	it('should be undefined and not merge level 2', function() {
		let node = dom(`<a>Size[obj.size|try:]</a>`);
		var hasTried = false;
		let copy = matchdom(node, {}, {try: function(ctx, val) {
			hasTried = true;
			assert.equal(val, undefined);
		}});
		assert.equal(hasTried, true);
		assert.equal(copy.outerHTML, '<a>Size[obj.size|try:]</a>');
	});
});

describe('method filters', function () {
	it('should call method on value', function () {
		let copy = matchdom(`[toUpperCase:]`, "up");
		assert.equal(copy, 'UP');
	});

	it('should return value when method fails on value', function () {
		let copy = matchdom(`[toISOString:]`, new Date("invalid"));
		assert.equal(copy, null);
	});
});

describe('get is a filter', function () {
	it('should get path', function () {
		let node = dom(`<a>Si[get:a]</a>`);
		let copy = matchdom(node, { a: "ze" });
		assert.equal(copy.outerHTML, '<a>Size</a>');
	});
	it('should get empty path', function () {
		let node = dom(`<a>Si[get:]</a>`);
		let copy = matchdom(node, { "": "ze" });
		assert.equal(copy.outerHTML, '<a>Size</a>');
	});
	it('should get empty path when given a tring', function () {
		let node = dom(`<a>Si[get:]</a>`);
		let copy = matchdom(node, "ze");
		assert.equal(copy.outerHTML, '<a>Size</a>');
	});
	it('should access path in several filters', function () {
		let node = dom(`<p>[a.b|c.d]</p>`);
		let copy = matchdom(node, {
			a: {
				b: {
					c: {
						d: "test"
					}
				}
			}
		});
		assert.equal(copy.outerHTML, '<p>test</p>');
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
		let node = dom(`<p>[arr|drop:]</p>`);
		let copy = matchdom(node, {
			arr: ['word1', 'word2']
		}, {
			drop: function(ctx, val) {
				ctx.cancel();
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[arr|drop:]</p>');
	});

	it('cancel drops merging of missing level one expression', function() {
		let node = dom(`<p>[arr|drop:]</p>`);
		let copy = matchdom(node, {}, {
			drop: function(ctx, val) {
				ctx.cancel();
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[arr|drop:]</p>');
	});

	it('cancel drops merging of level two expression', function() {
		let node = dom(`<p>[obj.toto|drop:]</p>`);
		let copy = matchdom(node, {obj: {toto:1}}, {
			drop: function (ctx, val, what) {
				ctx.cancel();
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[obj.toto|drop:]</p>');
	});

	it('cancel drops merging of missing level two expression', function() {
		let node = dom(`<p>[arr.toto|drop:]</p>`);
		let copy = matchdom(node, {}, {
			drop: function(ctx, val, what) {
				ctx.cancel();
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[arr.toto|drop:]</p>');
	});
});

describe('html filter', function() {
	it('should select nodes', function() {
		let node = dom(`<p>[str|as:html|queryAll:span]</p>`);
		let copy = matchdom(node, {
			str: '<img src="toto"><span>test</span><i>test</i><span>toto</span>'
		});
		assert.equal(copy.outerHTML, '<p><span>test</span><span>toto</span></p>');
	});

	it('should support xml', function() {
		const xml = `<?xml version="1.0" encoding="utf-8"?>
		<root>
			<title>[title]</title>
		</root>`;
		var node = (new DOMParser()).parseFromString(xml, "application/xml");
		let copy = matchdom(node, {
			title: 'test'
		});
		assert.equal((new XMLSerializer()).serializeToString(copy), `<root>
			<title>test</title>
		</root>`);
	});

	it('should support merging html in xml', function() {
		const xml = `<?xml version="1.0" encoding="utf-8"?>
		<root>
			<content>
				[content|as:xml]
			</content>
		</root>`;
		var node = (new DOMParser()).parseFromString(xml, "application/xml");
		let copy = matchdom(node, {
			content: 'test<br/>test'
		});
		assert.equal((new XMLSerializer()).serializeToString(copy), `<root>
			<content>
				test<br/>test
			</content>
		</root>`);
	});

	it('should support magnet in xml', function() {
		const xml = `<?xml version="1.0" encoding="utf-8"?>
		<root><content>
			[content|widen:content]
		</content></root>`;
		var node = (new DOMParser()).parseFromString(xml, "application/xml");
		let copy = matchdom(node, {
			content: null
		});
		assert.equal((new XMLSerializer()).serializeToString(copy), `<root/>`);
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
		let node = dom(`<p>[arr|join:%0A|as:text]</p>`);
		let copy = matchdom(node, {
			arr: ['line1', 'line2']
		});
		assert.equal(copy.outerHTML, '<p>line1<br>line2</p>');
	});

	it('html with <br>', function() {
		let node = dom(`<p>[arr|join:%3Cbr%3E|as:html]</p>`);
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
		let node = dom(`<p>[text|trim:|split:%0A|join:X]</p>`);
		let copy = matchdom(node, {
			text: 'word1\nword2\nword3\n'
		});
		assert.equal(copy.outerHTML, '<p>word1Xword2Xword3</p>');
	});
	it('with newlines and trim by value', function() {
		let node = dom(`<p>[text|split:%0A|filter:word2:neq|join:X]</p>`);
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

describe('sort filter', function () {
	it('should sort array with nulls last', function () {
		let node = dom(`<p>[arr|sort:|join: ]</p>`);
		let copy = matchdom(node, {
			arr: ['word2', 'word1', null, 'word3']
		});
		assert.equal(copy.outerHTML, '<p>word1 word2 word3 </p>');
	});

	it('should sort array with nulls first', function () {
		let node = dom(`<p>[arr|sort::true|join: ]</p>`);
		let copy = matchdom(node, {
			arr: ['word2', 'word1', null, 'word3']
		});
		assert.equal(copy.outerHTML, '<p> word1 word2 word3</p>');
	});
	it('should sort array by item and nulls first', function () {
		let node = dom(`<p>[arr|sort:val:true|repeat:|key] </p>`);
		let copy = matchdom(node, {
			arr: [
				{ key: 'a', val: 'word2' },
				{ key: 'b', val: 'word1' },
				{ key: 'c', val: null },
				{ key: 'd', val: 'word3' }
			]
		});
		assert.equal(copy.outerHTML, '<p>c b a d </p>');
	});

	it('should sort array by numeric item and nulls last', function () {
		let node = dom(`<p>[arr|sort:val:false|repeat:|key] </p>`);
		let copy = matchdom(node, {
			arr: [
				{ key: 'a', val: 2 },
				{ key: 'b', val: 1 },
				{ key: 'c', val: null },
				{ key: 'd', val: 11 }
			]
		});
		assert.equal(copy.outerHTML, '<p>b a d c </p>');
	});

	it('should sort array by date item and NaN first', function () {
		let node = dom(`<p>[sort::true|map:toISOString|join:%0A|as:text] </p>`);
		let copy = matchdom(node, [
			new Date("2021-02-28T15:12"),
			new Date("2021-02-26T14:12"),
			new Date("invalid"),
		]);
		assert.equal(copy.outerHTML, '<p><br>2021-02-26T13:12:00.000Z<br>2021-02-28T14:12:00.000Z </p>');
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
	it('should not change value when true', function () {
		let node = dom(`<p>[str|or:yes]</p>`);
		let copy = matchdom(node, { str: "stuff" });
		assert.equal(copy.outerHTML, '<p>stuff</p>');
	});
	it('should change value when false', function () {
		let node = dom(`<p>[str|or:yes]</p>`);
		let copy = matchdom(node, { });
		assert.equal(copy.outerHTML, '<p>yes</p>');
	});
});

describe('and', function () {
	it('should change value when true', function () {
		let node = dom(`<p>[str|and:yes]</p>`);
		let copy = matchdom(node, {str: "stuff"});
		assert.equal(copy.outerHTML, '<p>yes</p>');
	});
	it('should not change value when false', function () {
		let node = dom(`<p>[str|and:yes]</p>`);
		let copy = matchdom(node, { str: "" });
		assert.equal(copy.outerHTML, '<p></p>');
	});
});

describe('eq', function() {
	it('should keep equal value', function() {
		let node = dom(`<p>[val|eq:ceci]</p>`);
		let copy = matchdom(node, {val: 'ceci'});
		assert.equal(copy.outerHTML, '<p>ceci</p>');
	});
	it('should return null', function() {
		let node = dom(`<p>[val|eq:cela]</p>`);
		let copy = matchdom(node, {val: 'ceci'});
		assert.equal(copy.outerHTML, '<p></p>');
	});
});

describe('neq', function() {
	it('should keep value', function() {
		let node = dom(`<p>[val|neq:ceci]</p>`);
		let copy = matchdom(node, {val: 'cecia'});
		assert.equal(copy.outerHTML, '<p>cecia</p>');
	});
	it('should return null', function() {
		let node = dom(`<p test="[val|neq:cela]">ora</p>`);
		let copy = matchdom(node, {val: 'cela'});
		assert.equal(copy.outerHTML, '<p>ora</p>');
	});
});

describe('gt', function() {
	it('should parse float, compare, and return boolean true', function() {
		let node = dom(`<p>[val|gt:0.5]</p>`);
		let copy = matchdom(node, {val: 0.6});
		assert.equal(copy.outerHTML, '<p>0.6</p>');
	});
	it('should fail to parse float and return value', function() {
		let node = dom(`<p>[val|gt:0.5]</p>`);
		let copy = matchdom(node, {val: "xx"});
		assert.equal(copy.outerHTML, '<p></p>');
	});
});

describe('not', function() {
	it('should set to null if empty', function() {
		let node = dom(`<p class="[val]">test</p>`);
		let copy = matchdom(node, {val: ''});
		assert.equal(copy.outerHTML, '<p>test</p>');
	});
});

describe('name', function() {
	it('should set a value when true', function() {
		let node = dom(`<p>[val|path:name]</p>`);
		let copy = matchdom(node, {val: true});
		assert.equal(copy.outerHTML, '<p>val</p>');
	});
	it('should set a value when false', function() {
		let node = dom(`<p>[val|and:ceci|else:path:name]</p>`);
		let copy = matchdom(node, {val: false});
		assert.equal(copy.outerHTML, '<p>val</p>');
	});
	it('should set an empty string when false is not set', function() {
		let node = dom(`<p>[val|and:path:name|or:]</p>`);
		let copy = matchdom(node, {val: false});
		assert.equal(copy.outerHTML, '<p></p>');
	});
	it('should set last path component when true is not set', function() {
		let node = dom(`<p>[to.val|path:name]</p>`);
		let copy = matchdom(node, {to: {val: true}});
		assert.equal(copy.outerHTML, '<p>val</p>');
	});
	it('should set empty string when true is not set', function() {
		let node = dom(`<p>[val|and:path:name|or:]</p>`);
		let copy = matchdom(node, {val: false});
		assert.equal(copy.outerHTML, '<p></p>');
	});
});

describe('const filter', function() {
	it('should set to empty string', function() {
		let node = dom(`<p>[val|const:]</p>`);
		let copy = matchdom(node, {val: 'toto'});
		assert.equal(copy.outerHTML, '<p></p>');
	});
	it('should set to string', function() {
		let node = dom(`<p>[val|const:def]</p>`);
		let copy = matchdom(node, {val: 'toto'});
		assert.equal(copy.outerHTML, '<p>def</p>');
	});
});

describe('!?', function() {
	it('should set last path component when true is not set', function() {
		let node = dom(`<p>[to.val|not:|path:name]</p>`);
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
		let node = dom(`<p>[str|as:date|toLocaleString:en]</p>`);
		let copy = matchdom(node, {
			str: '2018-03-09T11:12:56.739Z'
		});
		assert.equal(copy.outerHTML, '<p>3/9/2018, 12:12:56 PM</p>');
	});

	it('getYear', function() {
		let node = dom(`<p>[str|as:date|getFullYear:]</p>`);
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

describe('to filter', function() {
	it('should fill current node', function() {
		let node = dom(`<p>a[field|to:]b</p>`);
		let copy = matchdom(node, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});

	it('should fill current node from attribute', function() {
		let node = dom(`<div><p data-template="[field|to:]">ab</p></div>`);
		let copy = matchdom(node, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<div><p>word</p></div>');
	});

	it('should replace current root node', function () {
		let node = dom(`<p>[field|to:*]a</p>`);
		let copy = matchdom(node, {
			field: 'word'
		});
		assert.equal(copy.nodeValue, 'word');
	});

	it('should replace current node from attribute', function () {
		let node = dom(`<div><p data-template="[field|to:*]">ab</p></div>`);
		let copy = matchdom(node, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<div>word</div>');
	});

	it('should fill current node from attribute using html', function() {
		let node = dom(`<p data-template="[field|to:|as:html]">ab</p>`);
		let copy = matchdom(node, {
			field: '<b>word</b>'
		});
		assert.equal(copy.outerHTML, '<p><b>word</b></p>');
	});

	it('should replace current node from attribute using html', function () {
		let node = dom(`<p data-template="[field|as:html|to:*]">ab</p>thing`);
		let copy = matchdom(node, {
			field: '<b>word</b>'
		});
		let div = dom('<div>');
		div.append(copy);
		assert.equal(div.innerHTML, '<b>word</b>thing');
	});

	it('should not fill current node', function() {
		let node = dom(`<p>a[field.it|to:]b</p>`);
		let copy = matchdom(node, {
			other: 'word'
		});
		assert.equal(copy.outerHTML, '<p>a[field.it|to:]b</p>');
	});

	it('should not fill from attribute', function() {
		let node = dom(`<p data-template="[field.it|to:*]">abb</p>`);
		let copy = matchdom(node, {
			other: 'word'
		});
		assert.equal(copy.outerHTML, '<p data-template="[field.it|to:*]">abb</p>');
	});

	it('should fill current node and set an attribute using two separate expressions', function() {
		let node = dom(`<p data-fill="[field|to:]" data-attr="[field2|to:class]">astuffb</p>`);
		let copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<p class="myclass">word</p>');
	});

	it('should fill current node and set an attribute on parent node using two separate expressions', function() {
		let node = dom(`<div><p data-fill="[field|to:]" data-attr="[field2|widen:div|to:class]">astuffb</p></div>`);
		let copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<div class="myclass"><p>word</p></div>');
	});

	it('should fill current node before setting an attribute from within', function() {
		let node = dom(`<p data-expr="[field|to:]">a[field|to:class]b</p>`);
		let copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});

	it('should not set an attribute partially filled', function() {
		let node = dom(`<div><p data-attr="toto[field|to:]aa">astuffb</p></div>`);
		let copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<div><p>word</p></div>');
	});
});

