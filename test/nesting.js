const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('domify');
require('dom4'); // jsdom is missing .closest

describe('nesting', function() {
	it('should not crash on empty expressions', function() {
		let node = dom(`<div>[]</div>`);
		let copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<div>[]</div>');
	});

	it('should merge expression in text node expression parameter', function() {
		let node = dom(`<div>[test|or:[def]]</div>`);
		let copy = matchdom(node, {
			test: null,
			def: 'str'
		});
		assert.equal(copy.outerHTML, '<div>str</div>');
	});
});

