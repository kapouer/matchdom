const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('dom-template-strings');
require('dom4'); // jsdom is missing .closest

// NB: keep all tests in a single file, for jsdom is slow to load

describe('text nodes', function() {
	it('should be merged with simple value', function() {
		let node = dom`<span>no? [test]!</span>`;
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>no? yes!</span>');
	});

	it('should be merged with nested path accessor', function() {
		let node = dom`<span>[path.test.to]</span>`;
		let copy = matchdom(node, {
			path: {
				test: {
					to: "yes"
				}
			}
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should not be merged as html', function() {
		let node = dom`<span>[str|html|text]</span>`;
		let copy = matchdom(node, {
			str: "<b>bold</b>"
		});
		assert.equal(copy.outerHTML, '<span>&lt;b&gt;bold&lt;/b&gt;</span>');
	});

	it('should be merged as html', function() {
		let node = dom`<span>[str|html]</span>`;
		let copy = matchdom(node, {
			str: "test<b>bold</b><i>italic</i>test"
		});
		assert.equal(copy.outerHTML, '<span>test<b>bold</b><i>italic</i>test</span>');
	});

	it('should replace newlines with br', function() {
		let node = dom`<p>[str]</p>`;
		let copy = matchdom(node, {
			str: "test\n\ntest\n"
		});
		assert.equal(copy.outerHTML, '<p>test<br><br>test<br></p>');
	});
});

describe('attributes', function() {
	it('should be merged with simple value', function() {
		let node = dom`<span class="[test]">no?</span>`;
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span class="yes">no?</span>');
	});

	it('should be merged with multiple values', function() {
		let node = dom`<span class="one [two] three [four]">no?</span>`;
		let copy = matchdom(node, {
			two: 2,
			four: 4
		});
		assert.equal(copy.outerHTML, '<span class="one 2 three 4">no?</span>');
	});

	it('should do fine when filters are not defined', function() {
		let node = dom`<span data-test="[test|notfound:ff|notfound2:kk]">yes</span>`;
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span data-test="yes">yes</span>');
	});
});

describe('filters on text nodes', function() {
	it('should do nothing if missing', function() {
		let node = dom`<span>[test|notfound]</span>`;
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should do nothing if multiple filters are missing', function() {
		let node = dom`<span>[test|notfound|notfound2]</span>`;
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should do nothing if multiple filters with parameters are missing', function() {
		let node = dom`<span>[test|notfound:ff|notfound2:kk]</span>`;
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should receive parameter', function() {
		let node = dom`<span>[test|prefix:me]</span>`;
		let copy = matchdom(node, {
			test: "yes"
		}, {
			prefix: function(val, what, prefix) {
				return prefix + val;
			}
		});
		assert.equal(copy.outerHTML, '<span>meyes</span>');
	});

	it('should receive parameter when multiple filters are applied', function() {
		let node = dom`<span>[test|prefix:me|postfix:you]</span>`;
		let copy = matchdom(node, {
			test: " and "
		}, {
			prefix: function(val, what, str) {
				return str + val;
			},
			postfix: function(val, what, str) {
				return val + str;
			}
		});
		assert.equal(copy.outerHTML, '<span>me and you</span>');
	});

	it('should remove current node', function() {
		let node = dom`<div><span>[test|magnet]</span></div>`;
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove closest tr', function() {
		let node = dom`<table><tbody>
			<th><td>Hello</td></tr><tr><td>[test|magnet:tr]</td></tr>
		</tbody></table>`;
		let copy = matchdom(node, {
			test: null // nothing is fine too
		});
		assert.equal(copy.outerHTML, dom`<table><tbody>
			<th><td>Hello</td></tr>
		</tbody></table>`.outerHTML);
	});

	it('should remove current attribute', function() {
		let node = dom`<div><span class="some [test|magnet]">test</span></div>`;
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should remove current node from attribute', function() {
		let node = dom`<div><span class="some [test|magnet:span]">test</span></div>`;
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});
});

describe('attr filter', function() {
	it('should be renamed and merged with simple value', function() {
		let node = dom`<img data-src="[test|attr]">`;
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<img src="yes">');
	});

	it('should be renamed and merged with simple value with parameter', function() {
		let node = dom`<img toubidouhoua="[test|attr:src]">`;
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<img src="yes">');
	});

	it('should set attribute even when defined in the text node', function() {
		let node = dom`<a>test[href|attr:href]</a>`;
		let copy = matchdom(node, {
			href: "/test"
		});
		assert.equal(copy.outerHTML, '<a href="/test">test</a>');
	});

	it('should set attribute of selected ancestor when defined in text node', function() {
		let node = dom`<div class="add"><span>test[myclass|attr:class:div]</span></div>`;
		let copy = matchdom(node, {
			myclass: "test product"
		});
		assert.equal(copy.outerHTML, '<div class="add test product"><span>test</span></div>');
	});

	it ('should set attribute of selected ancestor with undefined or filter', function() {
		let node = dom`<div><span>test[*|or:toto|attr:class:div]</span></div>`;
		let copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<div class="toto"><span>test</span></div>');
	});
});

describe('repeating', function() {
	it('should repeat array-in-object over node', function() {
		let node = dom`<div>
			<span>[arr|repeat]</span>
		</div>`;
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, dom`<div>
			<span>one</span><span>two</span>
		</div>`.outerHTML);
	});

	it('should repeat direct array over node', function() {
		let node = dom`<div>
			<span>[test|repeat]</span>
		</div>`;
		let copy = matchdom(node, [{test: 'one'}, {test: 'two'}]);
		assert.equal(copy.outerHTML, dom`<div>
			<span>one</span><span>two</span>
		</div>`.outerHTML);
	});

	it('should repeat array over closest node', function() {
		let node = dom`<table><tbody>
			<th><td>Hello</td></tr><tr><td>[arr|repeat:tr]</td></tr>
		</tbody></table>`;
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, dom`<table><tbody>
			<th><td>Hello</td></tr><tr><td>one</td></tr><tr><td>two</td></tr>
		</tbody></table>`.outerHTML);
	});

	it('should repeat array over parent of attribute', function() {
		let node = dom`<div>
			<img data-src="[arr|repeat|attr]" />
		</div>`;
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, dom`<div>
			<img src="one" /><img src="two" />
		</div>`.outerHTML);
	});

	it('should repeat array over parent of attribute with url', function() {
		let node = dom`<div><div>
			<img data-src="[arr|url|repeat:div]" />
		</div></div>`;
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.innerHTML, dom`<div><div>
			<img src="one" />
		</div><div>
			<img src="two" />
		</div></div>`.innerHTML);
	});

	it('should repeat array', function() {
		let node = dom`<div>
			<span>[arr.value|repeat]</span>
		</div>`;
		let copy = matchdom(node, {
			arr: [{value: 'one'}, {value: 'two'}]
		});
		assert.equal(copy.outerHTML, dom`<div>
			<span>one</span><span>two</span>
		</div>`.outerHTML);
	});

	it('should repeat array and return fragment', function() {
		let node = dom`<span>[arr.value|repeat]</span>`;
		let copy = matchdom(node, {
			arr: [{value: 'one'}, {value: 'two'}]
		});
		assert.equal(dom`<div>${copy}</div>`.innerHTML, '<span>one</span><span>two</span>');
	});

	it('should repeat array when filter is not the first one', function() {
		let node = dom`<div>
			<span>[arr.key] [arr.value|repeat]</span>
		</div>`;
		let copy = matchdom(node, {
			arr: [{key: 1, value: 'one'}, {key: 2, value: 'two'}]
		});
		assert.equal(copy.outerHTML, dom`<div>
			<span>1 one</span><span>2 two</span>
		</div>`.outerHTML);
	});

	it('should repeat array when filter is not the first one and data is array', function() {
		let node = dom`<div>
			<span>[key] [value|repeat]</span>
		</div>`;
		let copy = matchdom(node, [
			{key: 1, value: 'one'},
			{key: 2, value: 'two'}
		]);
		assert.equal(copy.outerHTML, dom`<div>
			<span>1 one</span><span>2 two</span>
		</div>`.outerHTML);
	});

	it('should repeat array when filter is not the first one and data is array and first one is in attribute', function() {
		let node = dom`<div>
			<span data-class="[style|attr]">[key] [value|repeat]</span>
		</div>`;
		let copy = matchdom(node, [
			{key: 1, value: 'one', style: 'a'},
			{key: 2, value: 'two', style: 'b'}
		]);
		assert.equal(copy.outerHTML, dom`<div>
			<span class="a">1 one</span><span class="b">2 two</span>
		</div>`.outerHTML);
	});

	it('should repeat array recursively', function() {
		let node = dom`<table>
			<tr>
				<td>[rows.cells.val|repeat:tr|repeat]</td>
			</tr>
		</table>`;
		let copy = matchdom(node, {
			rows: [
				{cells: [{val:'A1'}, {val:'A2'}]},
				{cells: [{val:'B1'}, {val:'B2'}]}
			]
		});
		assert.equal(copy.outerHTML, dom`<table>
			<tr>
				<td>A1</td><td>A2</td>
			</tr><tr>
				<td>B1</td><td>B2</td>
			</tr>
		</table>`.outerHTML);
	});

	it('should repeat array recursively with direct value', function() {
		let node = dom`<table>
			<tr>
				<td>[rows.cells|repeat:tr|repeat]</td>
			</tr>
		</table>`;
		let copy = matchdom(node, {
			rows: [
				{cells: ['A1', 'A2']},
				{cells: ['B1', 'B2']}
			]
		});
		assert.equal(copy.outerHTML, dom`<table>
			<tr>
				<td>A1</td><td>A2</td>
			</tr><tr>
				<td>B1</td><td>B2</td>
			</tr>
		</table>`.outerHTML);
	});

	it('should repeat aliased array items', function() {
		let node = dom`<table>
			<tr>
				<td>[cells.txt|repeat:td:cell] [cell.txt]</td>
			</tr>
		</table>`;
		let copy = matchdom(node, {
			cells: [
				{txt: 'a'},
				{txt: 'b'}
			]
		});
		assert.equal(copy.outerHTML, dom`<table>
			<tr>
				<td>a a</td><td>b b</td>
			</tr>
		</table>`.outerHTML);
	});

	it('should repeat array recursively, with data outside scope', function() {
		let node = dom`<table>
			<tr>
				<td>[rows.cells.val|repeat:tr|repeat][some.data]</td>
			</tr>
		</table>`;
		let copy = matchdom(node, {
			rows: [
				{cells: [{val:'A1'}, {val:'A2'}]},
				{cells: [{val:'B1'}, {val:'B2'}]}
			],
			some: {
				data: "x"
			}
		});
		assert.equal(copy.outerHTML, dom`<table>
			<tr>
				<td>A1x</td><td>A2x</td>
			</tr><tr>
				<td>B1x</td><td>B2x</td>
			</tr>
		</table>`.outerHTML);
	});
});

describe('join filter', function() {
	it('with space', function() {
		let node = dom`<p>[arr|join: ]</p>`;
		let copy = matchdom(node, {
			arr: ['word1', 'word2']
		});
		assert.equal(copy.outerHTML, '<p>word1 word2</p>');
	});

	it('with <br>', function() {
		let node = dom`<p>[arr|join::br]</p>`;
		let copy = matchdom(node, {
			arr: ['line1', 'line2']
		});
		assert.equal(copy.outerHTML, '<p>line1<br>line2</p>');
	});

	it('html with <br>', function() {
		let node = dom`<p>[arr|html|join::br]</p>`;
		let copy = matchdom(node, {
			arr: ['<b>line1</b>', '<i>line2</i>']
		});
		assert.equal(copy.outerHTML, '<p><b>line1</b><br><i>line2</i></p>');
	});
});

describe('slice filter', function() {
	it('should slice array with begin and end', function() {
		let node = dom`<p>[arr|slice:1:3|join: ]</p>`;
		let copy = matchdom(node, {
			arr: ['word1', 'word2', 'word3']
		});
		assert.equal(copy.outerHTML, '<p>word2 word3</p>');
	});
	it('should slice array with begin', function() {
		let node = dom`<p>[arr|slice:2|join: ]</p>`;
		let copy = matchdom(node, {
			arr: ['word1', 'word2', 'word3', 'word4']
		});
		assert.equal(copy.outerHTML, '<p>word3 word4</p>');
	});
});

describe('pad', function() {
	it('start', function() {
		let node = dom`<p>[str|padStart:3:x]</p>`;
		let copy = matchdom(node, {
			str: 'a'
		});
		assert.equal(copy.outerHTML, '<p>xxa</p>');
	});

	it('end', function() {
		let node = dom`<p>[str|padEnd:3:x]</p>`;
		let copy = matchdom(node, {
			str: 'a'
		});
		assert.equal(copy.outerHTML, '<p>axx</p>');
	});
});

describe('or', function() {
	it('should set a default value', function() {
		let node = dom`<p data-class="[yop|attr]" data-test="[vide|or:nothing|attr]">[str|or:empty] - [nul]</p>`;
		let copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<p data-class="[yop|attr]" test="nothing">empty - [nul]</p>');
	});
});

describe('eq', function() {
	it('should set another value if equal', function() {
		let node = dom`<p>[val|eq:ceci:cela]</p>`;
		let copy = matchdom(node, {val: 'ceci'});
		assert.equal(copy.outerHTML, '<p>cela</p>');
	});
});

describe('not', function() {
	it('should set to null if empty', function() {
		let node = dom`<p data-test="[val|not]">test</p>`;
		let copy = matchdom(node, {val: ''});
		assert.equal(copy.outerHTML, '<p>test</p>');
	});
});

describe('date filter', function() {
	it('toLocaleString', function() {
		let node = dom`<p>[str|date::en]</p>`;
		let copy = matchdom(node, {
			str: '2018-03-09T11:12:56.739Z'
		});
		assert.equal(copy.outerHTML, '<p>3/9/2018, 12:12:56 PM</p>');
	});

	it('getYear', function() {
		let node = dom`<p>[str|date:getFullYear]</p>`;
		let copy = matchdom(node, {
			str: '2018-03-09T11:12:56.739Z'
		});
		assert.equal(copy.outerHTML, '<p>2018</p>');
	});
});

describe('url filter', function() {
	it('should merge url query with target pathname', function() {
		let node = dom`<a href="/test" data-href="[href|url]">[title]</a>`;
		let copy = matchdom(node, {
			href: '?arg=1&val=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?arg=1&amp;val=2">anchor</a>');
	});

	it('should merge url pathname with target query', function() {
		let node = dom`<a href="/test?toto=1" data-href="[href|url]">[title]</a>`;
		let copy = matchdom(node, {
			href: '/path',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/path?toto=1">anchor</a>');
	});

	it('should overwrite target with url', function() {
		let node = dom`<a href="/test?toto=1" data-href="[href|url]">[title]</a>`;
		let copy = matchdom(node, {
			href: '/path?a=1&b=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/path?a=1&amp;b=2">anchor</a>');
	});

	it('should merge url query with partial template', function() {
		let node = dom`<a href="/test?toto=1" data-href="?id=[id|url]">[title]</a>`;
		let copy = matchdom(node, {
			id: 'xx',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?id=xx">anchor</a>');
	});

	it('should overwrite url pathname and query with partial template', function() {
		let node = dom`<a href="/test?toto=1" data-href="/this?id=[id|url]&amp;const=1">[title]</a>`;
		let copy = matchdom(node, {
			id: 'xx',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/this?id=xx&amp;const=1">anchor</a>');
	});

	it('should merge url query with partial template when repeated', function() {
		let node = dom`<div><a href="/test?toto=1" data-href="?id=[id|url]">[title|repeat]</a></div>`;
		let copy = matchdom(node, [{
			id: 'xx',
			title: 'anchor'
		}]);
		assert.equal(copy.outerHTML, '<div><a href="/test?id=xx">anchor</a></div>');
	});

	it('should be able to be called multiple times for the same attribute', function() {
		let node = dom`<div><a href="/test?toto=1" data-href="?id=[id|url]&amp;status=[status|url]">[title]</a></div>`;
		let copy = matchdom(node, {
			id: 'xx',
			title: 'anchor',
			status: "12"
		});
		assert.equal(copy.outerHTML, '<div><a href="/test?id=xx&amp;status=12">anchor</a></div>');
	});

	it('should not crash when data is not string', function() {
		let node = dom`<div><a href="/test?toto=1" data-href="?id=[id|url]">aaa</a></div>`;
		let copy = matchdom(node, {
			id: 12
		});
		assert.equal(copy.outerHTML, '<div><a href="/test?id=12">aaa</a></div>');
	});

	it('should remove current attribute', function() {
		let node = dom`<div><a data-href="/test?[test|magnet|url]">test</a></div>`;
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><a>test</a></div>');
	});

	it('should remove current node', function() {
		let node = dom`<div><a href="" data-href="[test|magnet:a|url]">test</a></div>`;
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});
});

