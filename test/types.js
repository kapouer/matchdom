import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, ArrayPlugin } from 'matchdom';

describe('types', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	const md = new Matchdom(ArrayPlugin);
	md.debug = true;

	describe('array', () => {
		const md = new Matchdom(ArrayPlugin);

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
