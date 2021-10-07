import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';

const matchdom = (node, data, filters) => new Matchdom().extend({ filters }).merge(node, data);

describe('attributes', () => {
	it('should be merged with simple value', () => {
		const node = dom(`<span class="[test]">no?</span>`);
		const copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span class="yes">no?</span>');
	});

	it('should be merged with multiple values', () => {
		const node = dom(`<span class="one [two] three [four]">no?</span>`);
		const copy = matchdom(node, {
			two: 2,
			four: 4
		});
		assert.equal(copy.outerHTML, '<span class="one 2 three 4">no?</span>');
	});

	it('should do fine when filters are not defined', () => {
		const node = dom(`<span data-test="[test|notfound:ff|notfound2:kk]">yes</span>`);
		const copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span data-test="yes">yes</span>');
	});

	it('should remove attribute when null', () => {
		const node = dom(`<span class="[empty]">test</span>`);
		const copy = matchdom(node, {
			empty: null
		});
		assert.equal(copy.outerHTML, '<span>test</span>');
	});

	it('should always trim attribute value', () => {
		const node = dom(`<span some=" [notempty]
		">test</span>`);
		const copy = matchdom(node, {
			empty: null,
			notempty: 'test'
		});
		assert.equal(copy.outerHTML, '<span some="test">test</span>');
	});

	it('should not remove attribute when not null', () => {
		const node = dom(`<span class="[notempty] [empty]">test</span>`);
		const copy = matchdom(node, {
			empty: null,
			notempty: 'test'
		});
		assert.equal(copy.outerHTML, '<span class="test">test</span>');
	});

	it('should remove class attribute when empty', () => {
		const node = dom(`<span class="[empty]">test</span>`);
		const copy = matchdom(node, {
			empty: ""
		});
		assert.equal(copy.outerHTML, '<span>test</span>');
	});

	it('should remove class attribute when empty with whitespace', () => {
		const node = dom(`<span class="[empty] [alsoempty]">test</span>`);
		const copy = matchdom(node, {
			empty: "",
			alsoempty: ""
		});
		assert.equal(copy.outerHTML, '<span>test</span>');
	});
});

describe('to filter', () => {
	it('should be renamed and merged with simple value', () => {
		const node = dom(`<img data-src="[test|to:src]">`);
		const copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<img src="yes">');
	});

	it('should be renamed and merged with simple value with parameter', () => {
		const node = dom(`<img toubidouhoua="[test|to:src]">`);
		const copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<img src="yes">');
	});

	it('should set attribute even when defined in the text node', () => {
		const node = dom(`<a>test[href|to:href]</a>`);
		const copy = matchdom(node, {
			href: "/test"
		});
		assert.equal(copy.outerHTML, '<a href="/test">test</a>');
	});

	it('should set attribute of selected ancestor when defined in text node', () => {
		const node = dom(`<div class="add"><span>test[myclass|at:div|to:class]</span></div>`);
		const copy = matchdom(node, {
			myclass: "test product"
		});
		assert.equal(copy.outerHTML, '<div class="add test product"><span>test</span></div>');
	});

	it ('should set attribute of selected ancestor with undefined or filter', () => {
		const node = dom(`<div><span>test[undef|or:toto|at:div|to:class]</span></div>`);
		const copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<div class="toto"><span>test</span></div>');
	});

	it('should add a class', () => {
		const node = dom(`<span class="some">[label|to:class]test</span>`);
		const copy = matchdom(node, {
			label: "visible"
		});
		assert.equal(copy.outerHTML, '<span class="some visible">test</span>');
	});

	it('should not crash when adding an empty class', () => {
		const node = dom(`<span class="some">[label|attr:class]test</span>`);
		const copy = matchdom(node, {
			label: ""
		});
		assert.equal(copy.outerHTML, '<span class="some">test</span>');
	});
});

describe('boolean value in attribute filter', () => {
	it('should drop attribute if value is falsey', () => {
		const node = dom(`<textarea required="[required]"></textarea>`);
		const copy = matchdom(node, {
			required: false
		});
		assert.equal(copy.outerHTML, '<textarea></textarea>');
	});
	it('should keep attribute empty', () => {
		const node = dom(`<textarea required="[required]"></textarea>`);
		const copy = matchdom(node, {
			required: true
		});
		assert.equal(copy.outerHTML, '<textarea required=""></textarea>');
	});
	it('should set data-attribute to true', () => {
		const node = dom(`<textarea data-required="[required]"></textarea>`);
		const copy = matchdom(node, {
			required: true
		});
		assert.equal(copy.outerHTML, '<textarea data-required="true"></textarea>');
	});
	it('should set data-attribute to true with multiple booleans', () => {
		const node = dom(`<textarea data-required="[required][check]"></textarea>`);
		const copy = matchdom(node, {
			required: true,
			check: true
		});
		assert.equal(copy.outerHTML, '<textarea data-required="true"></textarea>');
	});
	it('should set data-attribute to joined strings with multiple booleans and a string', () => {
		const node = dom(`<textarea data-required="[required] [check]"></textarea>`);
		const copy = matchdom(node, {
			required: true,
			check: true
		});
		assert.equal(copy.outerHTML, '<textarea data-required="true true"></textarea>');
	});
});

describe('set a boolean attribute using and:', () => {
	it('should drop attribute if value is falsey', () => {
		const node = dom(`<textarea required="[val]"></textarea>`);
		const copy = matchdom(node, {
			val: false
		});
		assert.equal(copy.outerHTML, '<textarea></textarea>');
	});
	it('should set attribute value to attribute name', () => {
		const node = dom(`<textarea required="[val]"></textarea>`);
		const copy = matchdom(node, {
			val: true
		});
		assert.equal(copy.outerHTML, '<textarea required=""></textarea>');
	});
});
