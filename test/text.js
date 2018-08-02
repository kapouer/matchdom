const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('domify');

require('dom4'); // jsdom is missing .closest

describe('string', function() {
	it('should be merged and returned', function() {
		let copy = matchdom('no? [test]!', {
			test: "yes"
		});
		assert.equal(copy, 'no? yes!');
	});

	it('should be merged as text', function() {
		let copy = matchdom('no?\n [test]!', {
			test: "yes\nnl"
		});
		assert.equal(copy, 'no?\n yes\nnl!');
	});
});

describe('text nodes', function() {
	it('should be merged with simple value', function() {
		let node = dom(`<span>no? [test]!</span>`);
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>no? yes!</span>');
	});

	it('should be merged with nested path accessor', function() {
		let node = dom(`<span>[path.test.to]</span>`);
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
		let node = dom(`<span>[str|html|text]</span>`);
		let copy = matchdom(node, {
			str: "<b>bold</b>"
		});
		assert.equal(copy.outerHTML, '<span>&lt;b&gt;bold&lt;/b&gt;</span>');
	});

	it('should be merged as html', function() {
		let node = dom(`<span>[str|html]</span>`);
		let copy = matchdom(node, {
			str: "test<b>bold</b><i>italic</i>test"
		});
		assert.equal(copy.outerHTML, '<span>test<b>bold</b><i>italic</i>test</span>');
	});

	it('should replace newlines with br', function() {
		let node = dom(`<p>[str]</p>`);
		let copy = matchdom(node, {
			str: "test\n\ntest\n"
		});
		assert.equal(copy.outerHTML, '<p>test<br><br>test<br></p>');
	});
});

describe('filters on text nodes', function() {
	it('should do nothing if missing', function() {
		let node = dom(`<span>[test|notfound]</span>`);
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should do nothing if multiple filters are missing', function() {
		let node = dom(`<span>[test|notfound|notfound2]</span>`);
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should do nothing if multiple filters with parameters are missing', function() {
		let node = dom(`<span>[test|notfound:ff|notfound2:kk]</span>`);
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should receive parameter', function() {
		let node = dom(`<span>[test|prefix:me]</span>`);
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
		let node = dom(`<span>[test|prefix:me|postfix:you]</span>`);
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

	it('should be merge list of nodes', function() {
		let node = dom(`<div>
			<span>no? [test]!</span>
			<div><span>no? [test2]!</span></div>
		</div>`);
		matchdom(node.querySelectorAll('span'), {
			test: "yes",
			test2: "no"
		});
		assert.equal(node.outerHTML, dom(`<div>
			<span>no? yes!</span>
			<div><span>no? no!</span></div>
		</div>`).outerHTML);
	});
});

