import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, ArrayPlugin, DomPlugin, TextPlugin } from 'matchdom';

describe('types', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});
	describe('simple', () => {
		it('should cast value to num', () => {
			const md = new Matchdom(TextPlugin);
			const copy = md.merge(`[str|as:num]`, { str: '3' });
			assert.equal(copy, 3);
		});
		it('should tell it is a num', () => {
			const md = new Matchdom(TextPlugin);
			assert.equal(md.merge(`[str|is:num]`, { str: 3 }), true);
			assert.equal(md.merge(`[str|is:int]`, { str: 3 }), true);
		});
		it('should tell it is not a num', () => {
			const md = new Matchdom(TextPlugin);
			assert.equal(md.merge(`[str|is:num]`, { str: '3' }), false);
			assert.equal(md.merge(`[str|is:int]`, { str: '3' }), false);
		});
		it('should tell it is not an int', () => {
			const md = new Matchdom(TextPlugin);
			assert.equal(md.merge(`[str|is:int]`, { str: 3.2 }), false);
		});
		it('should tell null is not a num', () => {
			const md = new Matchdom(TextPlugin);
			assert.equal(md.merge(`[str|is:num]`, { str: null }), false);
			assert.equal(md.merge(`[str|is:int]`, { str: null }), false);
		});
		it('should tell undefined is not a num', () => {
			const md = new Matchdom(TextPlugin);
			// assert.equal(md.merge(`[str|is:num]`, { }), false);
			// assert.equal(md.merge(`[str|is:int]`, {}), false);
			assert.equal(md.merge(`[q?.str|is:int]`, {}), false);
		});
		it('should cast num/int in a practical way', () => {
			const md = new Matchdom(TextPlugin);
			assert.equal(md.merge(`[str|as:num]`, {}), 0);
			assert.equal(md.merge(`[str|as:int]`, {}), 0);
			assert.equal(md.merge(`[str|as:int]`, {str: '3.4'}), 3);
		});
		it('should let any have a default value', () => {
			let got;
			const md = new Matchdom(TextPlugin, {
				any: ['any?test', 'any?test', (ctx, str, param) => {
					got = param;
					return str;
				}]
			});
			const copy = md.merge(`[str|any:]`, {});
			assert.equal(copy, 'test');
			assert.equal(got, '');
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
	describe('parameters', () => {
		const md = new Matchdom(TextPlugin);

		it('should be uri-decoded', () => {
			const html = `Size[size|const:%3A ]10mm`;
			const copy = md.merge(html, { size: 10 });
			assert.equal(copy, 'Size: 10mm');
		});
		it('should be left untouched if not uri-decodable', () => {
			const html = `Percent: [pp][const: %]`;
			const copy = md.merge(html, { pp: 10 });
			assert.equal(copy, 'Percent: 10 %');
		});

		it('should not consider value to be uri-decodable', () => {
			const html = `?[pp]`;
			const copy = md.merge(html, { pp: 'test=a%20b' });
			assert.equal(copy, '?test=a%20b');
		});

		it('should cast value to int', () => {
			let ok = false;
			md.extend({
				filters: {
					mycheck: ['int', (ctx, val) => {
						assert.equal(val, 10);
						ok = true;
						return val;
					}]
				}
			}).merge('[val|mycheck:]', { val: "10" });
			assert.equal(ok, true);
		});
		it('should cast param to int', () => {
			let ok = false;
			md.extend({
				filters: {
					mycheck: ['int', 'int', (ctx, val, cte) => {
						assert.equal(cte, 7);
						ok = true;
						return val + cte;
					}]
				}
			}).merge('[val|mycheck:7]', { val: 10 });
			assert.equal(ok, true);
		});
		it('should cast param to boolean', () => {
			let ok = false;
			md.extend({
				filters: {
					mycheck: ['int', 'bool', (ctx, val, cte) => {
						assert.equal(cte, true);
						ok = true;
						return val;
					}]
				}
			}).merge('[val|mycheck:7]', { val: 10 });
			assert.equal(ok, true);
		});
		it('should not check value when type is null', () => {
			let ok = false;
			md.extend({
				filters: {
					mycheck: ['any', 'bool', (ctx, val, cte) => {
						assert.equal(val, 10);
						assert.equal(cte, false);
						ok = true;
						return val;
					}]
				}
			}).merge('[val|mycheck:false]', { val: 10 });
			assert.equal(ok, true);
		});
		it('should allow null value when type is null', () => {
			let ok = false;
			md.extend({
				filters: {
					mycheck: ['any?', 'bool', (ctx, val, cte) => {
						assert.equal(val, null);
						assert.equal(cte, false);
						ok = true;
						return val;
					}]
				}
			}).merge('[val|mycheck:false]', { val: null });
			assert.equal(ok, true);
		});

		it('should allow any value when type is "any"', () => {
			let ok = false;
			md.extend({
				filters: {
					mycheck: ['any', 'bool', (ctx, val, cte) => {
						assert.ok(val instanceof Date);
						assert.equal(cte, true);
						ok = true;
						return val;
					}]
				}
			}).merge('[val|mycheck:1]', { val: new Date() });
			assert.equal(ok, true);
		});
		it('should require any value when type is "any"', () => {
			let ok = false;
			md.extend({
				filters: {
					mycheck: ['any', 'bool', (ctx, val, cte) => {
						ok = true;
						return val;
					}]
				}
			}).merge('[val|mycheck:1]', { val: undefined });
			assert.equal(ok, false);
		});
		it('should get a default empty string value', () => {
			let ok = false;
			md.extend({
				filters: {
					mycheck: ['any?', 'bool', (ctx, val, cte) => {
						assert.equal(val, null);
						ok = true;
						return val;
					}]
				}
			}).merge('[val|mycheck:1]', { val: null });
			assert.equal(ok, true);
		});
		it('should get a default integer value', () => {
			let ok = false;
			md.extend({
				filters: {
					mycheck: ['int?10', 'bool', (ctx, val, cte) => {
						assert.equal(val, 10);
						ok = true;
						return val;
					}]
				}
			}).merge('[val|mycheck:1]', { val: null });
			assert.equal(ok, true);
		});
	});
});
