const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('dom-template-strings');
require('dom4'); // jsdom is missing .closest

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
