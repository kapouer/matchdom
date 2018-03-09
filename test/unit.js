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

	it('should be able to remove current node', function() {
		let node = dom`<div><span>[test|magnet]</span></div>`;
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should be able to remove closest tr', function() {
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

	it('should repeat array and continue merging', function() {
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

	it('should repeat array and continue merging recursively', function() {
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

	it('should repeat array and continue merging recursively with direct value', function() {
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

	it('should repeat renamed array items', function() {
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

	it('should repeat array and continue merging recursively, with data outside scope', function() {
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
});

