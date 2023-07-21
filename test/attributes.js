import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin } from 'matchdom';

describe('attributes', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	const md = new Matchdom(DomPlugin);
	md.debug = true;

	describe('core', () => {

		it('should be merged with simple value', () => {
			const html = `<span class="[test]">no?</span>`;
			const copy = md.merge(html, {
				test: "yes"
			});
			assert.equal(copy.outerHTML, '<span class="yes">no?</span>');
		});

		it('should be merged with multiple values', () => {
			const html = `<span class="one [two] three [four]">no?</span>`;
			const copy = md.merge(html, {
				two: 2,
				four: 4
			});
			assert.equal(copy.outerHTML, '<span class="one 2 three 4">no?</span>');
		});

		it('should do fine when filters are not defined', () => {
			const html = `<span data-test="[test|notfound:ff|notfound2:kk]">yes</span>`;
			const copy = md.merge(html, {
				test: "yes"
			});
			assert.equal(copy.outerHTML, '<span data-test="yes">yes</span>');
		});

		it('should remove attribute when null', () => {
			const html = `<span class="[empty]">test</span>`;
			const copy = md.merge(html, {
				empty: null
			});
			assert.equal(copy.outerHTML, '<span>test</span>');
		});

		it('should set empty attribute value when falsey', () => {
			const data = { empty: "" };
			assert.equal(md.merge(`<input value="[empty]">`, data).outerHTML, "<input>");
			assert.equal(md.merge(`<option value="[empty]">-</option>`, data).outerHTML, '<option value="">-</option>');
		});

		it('should always trim class attribute value', () => {
			const html = `<span class=" [notempty]
			">test</span>`;
			const copy = md.merge(html, {
				empty: null,
				notempty: 'test'
			});
			assert.equal(copy.outerHTML, '<span class="test">test</span>');
		});

		it('should never trim other attribute value', () => {
			const html = `<input value=" [notempty] ">`;
			const copy = md.merge(html, {
				empty: null,
				notempty: 'test'
			});
			assert.equal(copy.outerHTML, '<input value=" test ">');
		});

		it('should not remove attribute when not null', () => {
			const html = `<span class="[notempty] [empty]">test</span>`;
			const copy = md.merge(html, {
				empty: null,
				notempty: 'test'
			});
			assert.equal(copy.outerHTML, '<span class="test">test</span>');
		});

		it('should remove class attribute when empty after being trimmed', () => {
			const html = `<span class="[empty] ">test</span>`;
			const copy = md.merge(html, {
				empty: " "
			});
			assert.equal(copy.outerHTML, '<span>test</span>');
		});

		it('should remove class attribute when empty with whitespace', () => {
			const html = `<span class="[empty] [alsoempty]">test</span>`;
			const copy = md.merge(html, {
				empty: "",
				alsoempty: ""
			});
			assert.equal(copy.outerHTML, '<span>test</span>');
		});
	});

	describe('boolean value in attribute filter', () => {
		const md = new Matchdom(DomPlugin);

		it('should drop attribute if value is falsey', () => {
			const html = `<textarea required="[required]"></textarea>`;
			const copy = md.merge(html, {
				required: false
			});
			assert.equal(copy.outerHTML, '<textarea></textarea>');
		});
		it('should keep attribute empty if attribute is boolean', () => {
			const html = `<textarea required="[required]"></textarea>`;
			const copy = md.merge(html, {
				required: true
			});
			assert.equal(copy.outerHTML, '<textarea required=""></textarea>');
		});
		it('should add variable name if attribute is a class and value is true', () => {
			const html = `<div class="[some]"></div>`;
			const copy = md.merge(html, {
				some: true
			});
			assert.equal(copy.outerHTML, '<div class="some"></div>');
		});
		it('should add variable names or not if attribute is a class and values are true or false', () => {
			const html = `<div class="[some] [testbool] [other]"></div>`;
			const copy = md.merge(html, {
				some: true,
				testbool: false,
				other: true
			});
			assert.equal(copy.outerHTML, '<div class="some other"></div>');
		});
		it('should not add variable name if attribute is a class and value is false', () => {
			const html = `<div class="[some]"></div>`;
			const copy = md.merge(html, {
				some: false
			});
			assert.equal(copy.outerHTML, '<div></div>');
		});
		it('should set data-attribute to true', () => {
			const html = `<textarea data-required="[required]"></textarea>`;
			const copy = md.merge(html, {
				required: true
			});
			assert.equal(copy.outerHTML, '<textarea data-required="true"></textarea>');
		});
		it('should set data-attribute to true with multiple booleans', () => {
			const html = `<textarea data-required="[required][check]"></textarea>`;
			const copy = md.merge(html, {
				required: true,
				check: true
			});
			assert.equal(copy.outerHTML, '<textarea data-required="true"></textarea>');
		});
		it('should set data-attribute to joined strings with multiple booleans and a string', () => {
			const html = `<textarea data-required="[required] [check]"></textarea>`;
			const copy = md.merge(html, {
				required: true,
				check: true
			});
			assert.equal(copy.outerHTML, '<textarea data-required="true true"></textarea>');
		});
	});

	describe('set a boolean attribute', () => {
		const md = new Matchdom(DomPlugin);

		it('should drop attribute if value is falsey', () => {
			const html = `<textarea required="[val]"></textarea>`;
			const copy = md.merge(html, {
				val: false
			});
			assert.equal(copy.outerHTML, '<textarea></textarea>');
		});
		it('should set attribute value to empty if value is boolean true', () => {
			const html = `<textarea required="[val]"></textarea>`;
			const copy = md.merge(html, {
				val: true
			});
			assert.equal(copy.outerHTML, '<textarea required=""></textarea>');
		});
		it('should set attribute value to str if value is a string', () => {
			const html = `<textarea required="[val]"></textarea>`;
			const copy = md.merge(html, {
				val: "test"
			});
			assert.equal(copy.outerHTML, '<textarea required="test"></textarea>');
		});
	});
});
