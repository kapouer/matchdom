const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('dom-template-strings');
require('dom4'); // jsdom is missing .closest

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

