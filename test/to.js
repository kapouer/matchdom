import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin } from 'matchdom';

describe('to filter', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	const md = new Matchdom().extend(DomPlugin);

	it('should be renamed and merged with simple value', () => {
		const html = `<img data-src="[test|to:src]">`;
		const copy = md.merge(html, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<img src="yes">');
	});

	it('should be renamed and merged with simple value with parameter', () => {
		const html = `<img toubidouhoua="[test|to:src]">`;
		const copy = md.merge(html, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<img src="yes">');
	});

	it('should set attribute even when defined in the text html', () => {
		const html = `<a>test[href|to:href]</a>`;
		const copy = md.merge(html, {
			href: "/test"
		});
		assert.equal(copy.outerHTML, '<a href="/test">test</a>');
	});

	it('should set attribute of selected ancestor when defined in text html', () => {
		const html = `<div class="add"><span>test[myclass|at:div|to:class]</span></div>`;
		const copy = md.merge(html, {
			myclass: "test product"
		});
		assert.equal(copy.outerHTML, '<div class="add test product"><span>test</span></div>');
	});

	it ('should set attribute of selected ancestor with undefined or filter', () => {
		const html = `<div><span>test[undef|or:toto|at:div|to:class]</span></div>`;
		const copy = md.merge(html, {});
		assert.equal(copy.outerHTML, '<div class="toto"><span>test</span></div>');
	});

	it('should add a class', () => {
		const html = `<span class="some">[label|to:class]test</span>`;
		const copy = md.merge(html, {
			label: "visible"
		});
		assert.equal(copy.outerHTML, '<span class="some visible">test</span>');
	});

	it('should not crash when adding an empty class', () => {
		const html = `<span class="some">[label|attr:class]test</span>`;
		const copy = md.merge(html, {
			label: ""
		});
		assert.equal(copy.outerHTML, '<span class="some">test</span>');
	});
});
