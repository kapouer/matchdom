import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, ArrayPlugin, DomPlugin } from 'matchdom';

describe('types', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});
	describe('simple', () => {
		it('should cast value to num', () => {
			const md = new Matchdom();
			const copy = md.merge(`[str|as:num]`, { str: '3' });
			assert.equal(copy, 3);
		});
		it('should tell it is a num', () => {
			const md = new Matchdom();
			assert.equal(md.merge(`[str|is:num]`, { str: 3 }), true);
			assert.equal(md.merge(`[str|is:int]`, { str: 3 }), true);
		});
		it('should tell it is not a num', () => {
			const md = new Matchdom();
			assert.equal(md.merge(`[str|is:num]`, { str: '3' }), false);
			assert.equal(md.merge(`[str|is:int]`, { str: '3' }), false);
		});
		it('should tell it is not an int', () => {
			const md = new Matchdom();
			assert.equal(md.merge(`[str|is:int]`, { str: 3.2 }), false);
		});
		it('should tell null is not a num', () => {
			const md = new Matchdom();
			assert.equal(md.merge(`[str|is:num]`, { str: null }), false);
			assert.equal(md.merge(`[str|is:int]`, { str: null }), false);
		});
		it('should tell undefined is not a num', () => {
			const md = new Matchdom();
			// assert.equal(md.merge(`[str|is:num]`, { }), false);
			// assert.equal(md.merge(`[str|is:int]`, {}), false);
			assert.equal(md.merge(`[q?.str|is:int]`, {}), false);
		});
		it('should cast num/int in a practical way', () => {
			const md = new Matchdom();
			assert.equal(md.merge(`[str|as:num]`, {}), 0);
			assert.equal(md.merge(`[str|as:int]`, {}), 0);
			assert.equal(md.merge(`[str|as:int]`, {str: '3.4'}), 3);
		});
	});
	describe('array', () => {
		const md = new Matchdom(ArrayPlugin, DomPlugin);

		it('should cast value to array', () => {
			const html = `<span>[val|as:array|join:-]</span>`;
			const copy = md.merge(html, {
				val: 'test'
			});
			assert.equal(copy.outerHTML, '<span>test</span>');
		});
		it('should keep array', () => {
			const html = `<span>[val|as:array|join:-]</span>`;
			const copy = md.merge(html, {
				val: ['test1', 'test2']
			});
			assert.equal(copy.outerHTML, '<span>test1-test2</span>');
		});
		it('should access item array', () => {
			const html = `<span>[val|as:array|.0] - [val|as:array|.1]</span>`;
			const copy = md.merge(html, {
				val: ['test1', 'test2']
			});
			assert.equal(copy.outerHTML, '<span>test1 - test2</span>');
		});
		it('should access last item in array', () => {
			const html = `<span>[val|as:array|.-1]</span>`;
			const copy = md.merge(html, {
				val: ['test1', 'test2']
			});
			assert.equal(copy.outerHTML, '<span>test2</span>');
		});
		it('should access first and last item in array', () => {
			const html = `<span>[val|as:array|.first] - [val|as:array|.last]</span>`;
			const copy = md.merge(html, {
				val: ['test1', 'test2']
			});
			assert.equal(copy.outerHTML, '<span>test1 - test2</span>');
		});
	});
});
