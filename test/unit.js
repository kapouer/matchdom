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

describe('filters on attributes', function() {
	it('should be replaced with parameters should do nothing', function() {
		let node = dom`<span data-test="[test|notfound:ff|notfound2:kk]">yes</span>`;
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span data-test="yes">yes</span>');
	});

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
});

describe('repeating', function() {
	it('should repeat array over node', function() {
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

});

