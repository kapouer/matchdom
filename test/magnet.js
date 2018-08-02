const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('domify');

require('dom4'); // jsdom is missing .closest

describe('magnet filter', function() {
	it('should remove current node', function() {
		let node = dom(`<div><span>[test|magnet]</span></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove current node and previous and next element siblings', function() {
		let node = dom(`<div><br><br><span>[test|magnet:+span+]</span><hr><hr></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove current node and previous and next element siblings with wildcard selector', function() {
		let node = dom(`<div><br><br><span>[test|magnet:+*+]</span><hr><hr></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove closest tr', function() {
		let node = dom(`<table><tbody>
			<th><td>Hello</td></tr><tr><td>[test|magnet:tr]</td></tr>
		</tbody></table>`);
		let copy = matchdom(node, {
			test: null // nothing is fine too
		});
		assert.equal(copy.outerHTML, dom(`<table><tbody>
			<th><td>Hello</td></tr>
		</tbody></table>`).outerHTML);
	});

	it('should remove current attribute', function() {
		let node = dom(`<div><span class="some [test|magnet]">test</span></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should remove current node from attribute', function() {
		let node = dom(`<div><span class="some [test|magnet:span]">test</span></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove current node from attribute using wildcard selector', function() {
		let node = dom(`<div><span class="[test|magnet:*]">test</span></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

});
