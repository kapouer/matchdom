import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';

const matchdom = (node, data, filters) => new Matchdom({ filters }).merge(node, data);

describe('attributes', function() {
	it('should be merged with simple value', function() {
		let node = dom(`<span class="[test]">no?</span>`);
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span class="yes">no?</span>');
	});

	it('should be merged with multiple values', function() {
		let node = dom(`<span class="one [two] three [four]">no?</span>`);
		let copy = matchdom(node, {
			two: 2,
			four: 4
		});
		assert.equal(copy.outerHTML, '<span class="one 2 three 4">no?</span>');
	});

	it('should do fine when filters are not defined', function() {
		let node = dom(`<span data-test="[test|notfound:ff|notfound2:kk]">yes</span>`);
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span data-test="yes">yes</span>');
	});

	it('should remove attribute when null', function() {
		let node = dom(`<span class="[empty]">test</span>`);
		let copy = matchdom(node, {
			empty: null
		});
		assert.equal(copy.outerHTML, '<span>test</span>');
	});

	it('should always trim attribute value', function() {
		let node = dom(`<span some=" [notempty]
		">test</span>`);
		let copy = matchdom(node, {
			empty: null,
			notempty: 'test'
		});
		assert.equal(copy.outerHTML, '<span some="test">test</span>');
	});

	it('should not remove attribute when not null', function() {
		let node = dom(`<span class="[notempty] [empty]">test</span>`);
		let copy = matchdom(node, {
			empty: null,
			notempty: 'test'
		});
		assert.equal(copy.outerHTML, '<span class="test">test</span>');
	});

	it('should remove class attribute when empty', function() {
		let node = dom(`<span class="[empty]">test</span>`);
		let copy = matchdom(node, {
			empty: ""
		});
		assert.equal(copy.outerHTML, '<span>test</span>');
	});

	it('should remove class attribute when empty with whitespace', function() {
		let node = dom(`<span class="[empty] [alsoempty]">test</span>`);
		let copy = matchdom(node, {
			empty: "",
			alsoempty: ""
		});
		assert.equal(copy.outerHTML, '<span>test</span>');
	});
});

describe('to filter', function() {
	it('should be renamed and merged with simple value', function() {
		let node = dom(`<img data-src="[test|to:src]">`);
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<img src="yes">');
	});

	it('should be renamed and merged with simple value with parameter', function() {
		let node = dom(`<img toubidouhoua="[test|to:src]">`);
		let copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<img src="yes">');
	});

	it('should set attribute even when defined in the text node', function() {
		let node = dom(`<a>test[href|to:href]</a>`);
		let copy = matchdom(node, {
			href: "/test"
		});
		assert.equal(copy.outerHTML, '<a href="/test">test</a>');
	});

	it('should set attribute of selected ancestor when defined in text node', function() {
		let node = dom(`<div class="add"><span>test[myclass|with:div|to:class]</span></div>`);
		let copy = matchdom(node, {
			myclass: "test product"
		});
		assert.equal(copy.outerHTML, '<div class="add test product"><span>test</span></div>');
	});

	it ('should set attribute of selected ancestor with undefined or filter', function() {
		let node = dom(`<div><span>test[undef|or:toto|with:div|to:class]</span></div>`);
		let copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<div class="toto"><span>test</span></div>');
	});

	it('should add a class', function() {
		let node = dom(`<span class="some">[label|to:class]test</span>`);
		let copy = matchdom(node, {
			label: "visible"
		});
		assert.equal(copy.outerHTML, '<span class="some visible">test</span>');
	});

	it('should not crash when adding an empty class', function() {
		let node = dom(`<span class="some">[label|attr:class]test</span>`);
		let copy = matchdom(node, {
			label: ""
		});
		assert.equal(copy.outerHTML, '<span class="some">test</span>');
	});
});

describe('boolean value in attribute filter', function() {
	it('should drop attribute if value is falsey', function() {
		let node = dom(`<textarea required="[required]"></textarea>`);
		let copy = matchdom(node, {
			required: false
		});
		assert.equal(copy.outerHTML, '<textarea></textarea>');
	});
	it('should keep attribute empty', function() {
		let node = dom(`<textarea required="[required|and:]"></textarea>`);
		let copy = matchdom(node, {
			required: true
		});
		assert.equal(copy.outerHTML, '<textarea required=""></textarea>');
	});
	it('should set data-attribute to true', function() {
		let node = dom(`<textarea data-required="[required]"></textarea>`);
		let copy = matchdom(node, {
			required: true
		});
		assert.equal(copy.outerHTML, '<textarea data-required="true"></textarea>');
	});
	it('should set data-attribute to true with multiple booleans', function() {
		let node = dom(`<textarea data-required="[required][check]"></textarea>`);
		let copy = matchdom(node, {
			required: true,
			check: true
		});
		assert.equal(copy.outerHTML, '<textarea data-required="true"></textarea>');
	});
	it('should set data-attribute to joined strings with multiple booleans and a string', function() {
		let node = dom(`<textarea data-required="[required] [check]"></textarea>`);
		let copy = matchdom(node, {
			required: true,
			check: true
		});
		assert.equal(copy.outerHTML, '<textarea data-required="true true"></textarea>');
	});
});

describe('set a boolean attribute using and:', function() {
	it('should drop attribute if value is falsey', function() {
		let node = dom(`<textarea required="[val|and:]"></textarea>`);
		let copy = matchdom(node, {
			val: false
		});
		assert.equal(copy.outerHTML, '<textarea></textarea>');
	});
	it('should set attribute value to attribute name', function() {
		let node = dom(`<textarea required="[val|and:]"></textarea>`);
		let copy = matchdom(node, {
			val: true
		});
		assert.equal(copy.outerHTML, '<textarea required=""></textarea>');
	});
});
