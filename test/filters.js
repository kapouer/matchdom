import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, StringPlugin,
	DomPlugin,
	RepeatPlugin, TextPlugin,
	ArrayPlugin
} from 'matchdom';

describe('filters', () => {

	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	describe('value', () => {
		it('should be null if top-level', () => {
			const html = `<a>Size[size|try:]</a>`;
			let hasTried = false;
			let lastVal;
			const md = new Matchdom(DomPlugin, {
				try(ctx, val) {
					hasTried = true;
					lastVal = val;
				}
			});
			const copy = md.merge(html, {});
			assert.equal(hasTried, true);
			assert.equal(lastVal, null);
			assert.equal(copy.outerHTML, '<a>Size</a>');
		});

		it('should be undefined and not merge level 2', () => {
			let hasTried = false;
			let lastVal;
			const md = new Matchdom(DomPlugin, {
				hooks: {
					after: {
						get(ctx, val) {
							hasTried = true;
							lastVal = val;
						}
					}
				}
			});
			const copy = md.merge(`[obj.size]`, {});
			assert.equal(hasTried, true);
			assert.equal(lastVal, undefined);
			assert.equal(copy, `[obj.size]`);
		});

		it('should be returned if it is the only hit and deal properly with undef/null/boolean', () => {
			const md = new Matchdom(TextPlugin);
			assert.equal(md.merge(`[val]`, { val: 12 }), 12);
			assert.equal(md.merge(`[val]`, { val: true }), true);
			assert.equal(md.merge(`[val]`, { val: false }), false);
			assert.equal(md.merge(`[val]`, { val: null }), null);
			assert.equal(md.merge(`toto`, {}), 'toto');
			assert.equal(md.merge(`[val]`, {}), null);
			assert.equal(md.merge(`[obj.val]`, {}), '[obj.val]');
			assert.equal(md.merge(`[obj.val]`, { obj: {} }), null);
		});
	});

	describe('allowed chars', () => {
		const md = new Matchdom({
			filters: {
				'{test'(ctx, val, param) {
					return "not";
				}
			}
		});

		it('should only allow word chars for filter names', () => {
			const copy = md.merge(`[{test: 1}]`, {});
			assert.equal(copy, '[{test: 1}]');
		});

		it('should only allow word chars for get accessors', () => {
			const copy = md.merge(`[{test}]`, {'{test}':'no'});
			assert.equal(copy, '[{test}]');
		});
	});

	describe('get filter', () => {
		const md = new Matchdom(DomPlugin);

		it('should get path', () => {
			const html = `<a>Si[get:a]</a>`;
			const copy = md.merge(html, { a: "ze" });
			assert.equal(copy.outerHTML, '<a>Size</a>');
		});
		it('should allow escaped path', () => {
			const html = `<a>Si[get:a%2eb]</a>`;
			const copy = md.merge(html, { "a.b": "ze" });
			assert.equal(copy.outerHTML, '<a>Size</a>');
		});
		it('should get top value', () => {
			const html = `<a>Si[get:]</a>`;
			const copy = md.merge(html, { toString: () => "ze" });
			assert.equal(copy.outerHTML, '<a>Size</a>');
		});
		it('should get current value as string', () => {
			const html = `<a>Si[get:]</a>`;
			const copy = md.merge(html, "ze");
			assert.equal(copy.outerHTML, '<a>Size</a>');
		});
		it('should access path in several filters', () => {
			const html = `<p>[a.b|.c.d]</p>`;
			const copy = md.merge(html, {
				a: {
					b: {
						c: {
							d: "test"
						}
					}
				}
			});
			assert.equal(copy.outerHTML, '<p>test</p>');
		});
		it('should allow to get path from root', () => {
			const html = `<p>[a.b|a.b1|test:]</p>`;
			let path;
			const copy = md.extend({filters: {
				test(ctx, val) {
					path = ctx.expr.path;
					return val;
				}
			}}).merge(html, {
				a: {
					b: "test",
					b1: "toast"
				}
			});
			assert.deepEqual(path, ['a', 'b1']);
			assert.equal(copy.outerHTML, '<p>toast</p>');
		});

		it('should work with then', () => {
			const html = `<p>[a.b|then:get:a.b1]</p>`;
			const copy = md.merge(html, {
				a: {
					b: "test",
					b1: "toast"
				}
			});
			assert.equal(copy.outerHTML, '<p>toast</p>');
		});
		it('should work with else', () => {
			const html = `<p>[a.b|else:get:a.b1]</p>`;
			const copy = md.merge(html, {
				a: {
					c: "test",
					b1: "toast"
				}
			});
			assert.equal(copy.outerHTML, '<p>toast</p>');
		});

		it('should be writable as shorthand syntax for filter parameter', () => {
			const html = `<p>[a.b|then:a.b1]</p>`;
			const copy = md.merge(html, {
				a: {
					b: "test",
					b1: "toast"
				}
			});
			assert.equal(copy.outerHTML, '<p>toast</p>');
		});
	});

	describe('list format', () => {
		before(function () {
			this.jsdom = globalJsdom();
		});
		after(function () {
			this.jsdom();
		});
		const md = new Matchdom(DomPlugin);
		it('should merge to true to boolean attribute', () => {
			const html = `<x-test list="[obj.one|as:list] [obj.two|as:list]">test</x-test>`;
			const copy = md.merge(html, {
				obj: {
					one: true,
					two: true
				}
			});
			assert.equal(copy.outerHTML, '<x-test list="one two">test</x-test>');
		});

		it('should merge whole object to boolean attribute', () => {
			const html = `<x-test list="[obj|as:list]">test</x-test>`;
			const copy = md.merge(html, {
				obj: {
					one: true,
					two: true
				}
			});
			assert.equal(copy.outerHTML, '<x-test list="one two">test</x-test>');
		});

		it('should merge whole object to false to boolean attribute', () => {
			const html = `<x-test list="[obj|as:list]">test</x-test>`;
			const copy = md.merge(html, {
				obj: {}
			});
			assert.equal(copy.outerHTML, '<x-test>test</x-test>');
		});
	});

	describe('rebase filter', () => {
		const md = new Matchdom(TextPlugin, StringPlugin);
		it('should return value', () => {
			const txt = `[a||.b|set:c:test||.b.c]`;
			const data = {
				a: {
					b: {
						d:2
					}
				}
			};
			const copy = md.merge(txt, data);
			assert.equal(copy, 'test');
		});

		it('should not need second call to return value', () => {
			const txt = `a[a||.b|case:up]`;
			const data = {
				a: new (class {
					b = "test";
					toString() {
						return "toto";
					}
				})()
			};
			const copy = md.merge(txt, data);
			assert.equal(copy, 'atoto');
		});

		it('should not perturb empty key', () => {
			//md.debug = true;

			const copy = md.extend(RepeatPlugin).merge("--[arr|repeat:]--", {
				arr: ['one', 'two']
			});
			assert.equal(copy, "--one----two--");
		});
	});

	describe('assign filter', () => {
		const md = new Matchdom(TextPlugin);

		it('should assign data to given path', () => {
			const txt = `Si[assign:a.b:c|.c] and [a.b]`;
			const data = {
				c: 'value'
			};
			const clone = structuredClone(data);
			clone.a = { b: 'value' };
			const copy = md.merge(txt, data);
			assert.equal(copy, 'Sivalue and value');
			assert.deepEqual(data, clone);
		});

		it('should assign multiple pairs', () => {
			const txt = `A [assign:b:a:d:c|.b], A [c]`;
			const data = {
				a: 'one',
				c: 'two'
			};
			const clone = structuredClone(data);
			clone.b = clone.a;
			clone.d = clone.c;
			const copy = md.merge(txt, data);
			assert.equal(copy, 'A one, A two');
			assert.deepEqual(data, clone);
		});

		it('should always use relative path', () => {
			const txt = `Si[assign:.a.b:.c|.a.b] [assign:a.d:a.b|const:][a.d]`;
			const data = {
				c: 'value'
			};
			const clone = structuredClone(data);
			clone.a = { b: 'value', d: 'value' };
			const copy = md.merge(txt, data);
			assert.equal(copy, 'Sivalue value');
			assert.deepEqual(data, clone);
		});

		it('should set global data at given path with existing object', () => {
			const txt = `Si[assign:a.b:c|.c] and [a.b] [a.d]`;
			const data = {
				a: { d: 1 },
				c: 'value'
			};
			const clone = structuredClone(data);
			clone.a.b = 'value';
			const copy = md.merge(txt, data);
			assert.deepEqual(data, clone);
			assert.equal(copy, 'Sivalue and value 1');
		});

		it('should cancel merge if a path is undefined', () => {
			const txt = `[assign:.b.d:.a.b.c]`;
			const data = {
				a: 3
			};
			const copy = md.merge(txt, data);
			assert.equal(copy, txt);
		});

		it('should cancel merge if a last path is undefined', () => {
			const txt = `[assign:.b.d:.d]`;
			const data = {
				a: 3
			};
			const copy = md.merge(txt, data);
			assert.equal(copy, txt);
		});

		it('should fail to set global data at path with a value', () => {
			const txt = `Si[assign:a.b:c|.c] and [a.b]`;
			const data = {
				a: 3,
				c: 'value'
			};
			const clone = structuredClone(data);
			const copy = md.merge(txt, data);
			assert.deepEqual(data, clone);
			assert.equal(copy, 'Sivalue and ');
		});
	});

	describe('join filter', () => {
		const md = new Matchdom(DomPlugin, ArrayPlugin);
		it('with space', () => {
			const html = `<p>[arr|join: ]</p>`;
			const copy = md.merge(html, {
				arr: ['word1', 'word2']
			});
			assert.equal(copy.outerHTML, '<p>word1 word2</p>');
		});

		it('with newline in br mode', () => {
			const html = `<p>[arr|join:%0A|as:text]</p>`;
			const copy = md.merge(html, {
				arr: ['line1', 'line2']
			});
			assert.equal(copy.outerHTML, '<p>line1<br>line2</p>');
		});

		it('html with <br>', () => {
			const html = `<p>[arr|join:%3Cbr%3E|as:html]</p>`;
			const copy = md.merge(html, {
				arr: ['<b>line1</b>', '<i>line2</i>']
			});
			assert.equal(copy.outerHTML, '<p><b>line1</b><br><i>line2</i></p>');
		});
	});

	describe('pad', () => {
		const md = new Matchdom(StringPlugin, DomPlugin);

		it('start', () => {
			const html = `<p>[str|pad:3:x]</p>`;
			const copy = md.merge(html, {
				str: 'a'
			});
			assert.equal(copy.outerHTML, '<p>xxa</p>');
		});

		it('end', () => {
			const html = `<p>[str|pad:-3:x]</p>`;
			const copy = md.merge(html, {
				str: 'a'
			});
			assert.equal(copy.outerHTML, '<p>axx</p>');
		});
	});

	describe('null/undefined', () => {
		it('work with tests in the README', () => {
			// non-existent object
			const md = new Matchdom(RepeatPlugin, TextPlugin);
			assert.equal(md.merge("a[to.nothing]b", {}), 'a[to.nothing]b');
			// existent object
			assert.equal(md.merge("a[to.nothing]b", { to: {} }), 'ab');
			// optional chaining
			assert.equal(md.merge("a[to?.nothing]b", {}), 'ab');
			// expression is not fully resolved because `to` is not the last component
			assert.equal(md.merge("a[to|as:array|.first]b", {}), 'a[to|as:array|.first]b');
			// to is optional, null is cast to [], .first is fully resolved and becomes null
			assert.equal(md.merge("a[to?|as:array|.first]b", {}), 'ab');
			// top level value is resolved, so optional chaining doesn't change the result
			assert.equal(md.merge("a[top]b", {}), 'ab');
			assert.equal(md.merge("a[top?]b", {}), 'ab');
			// list becomes null and cast to []
			assert.equal(md.merge("a[list|at:|repeat:]b", {}), 'ab');
			// here list is not fully resolved, and repeat filter expects defined value, the whole expression is canceled
			assert.equal(md.merge("a[list|at:-|repeat:|.title]b", {}), 'a[list|at:-|repeat:|.title]b');
			// here the list becomes optional, cast to null then []
			assert.equal(md.merge("a[list?|at:|repeat:|.title]b", {}), 'ab');
		});

		it('should set to null if empty', () => {
			const md = new Matchdom(DomPlugin);
			const html = `<p class="[val|as:null]">test</p>`;
			const copy = md.merge(html, {val: ''});
			assert.equal(copy.outerHTML, '<p>test</p>');
		});

		it('should set to null if false', () => {
			const md = new Matchdom(DomPlugin);
			const html = `<p class="[val|as:null]">test</p>`;
			const copy = md.merge(html, { val: false });
			assert.equal(copy.outerHTML, '<p>test</p>');
		});

		it('should test if null', () => {
			const md = new Matchdom(DomPlugin);
			assert.equal(
				md.merge(
					`<p hidden="[val|is:null]">test</p>`, { val: '' }
				).outerHTML,
				'<p>test</p>'
			);
			assert.equal(
				md.merge(
					`<p hidden="[val|is:null]">test</p>`, { val: false }
				).outerHTML,
				'<p>test</p>'
			);
			assert.equal(
				md.merge(
					`<p hidden="[val|is:null]">test</p>`, { val: null }
				).outerHTML,
				'<p hidden="">test</p>'
			);
		});

		it('should test if undefined', () => {
			const md = new Matchdom(DomPlugin);
			assert.equal(
				md.merge(
					`<p hidden="[val|is:none]">test</p>`, { val: '' }
				).outerHTML,
				'<p>test</p>'
			);
			assert.equal(
				md.merge(
					`<p hidden="[val|is:none]">test</p>`, { val: false }
				).outerHTML,
				'<p>test</p>'
			);
			assert.equal(
				md.merge(
					`<p hidden="[obj.val|is:none]">test</p>`, { obj: {} }
				).outerHTML,
				'<p hidden="">test</p>'
			);
		});

		it('should merge an undefined top-level value', () => {
			const md = new Matchdom(DomPlugin);
			const html = `<p>[val]test</p>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<p>test</p>');
		});

		it('should merge an undefined optional top-level value even if next filter requires a value', () => {
			const md = new Matchdom(DomPlugin, RepeatPlugin);
			const html = `<div>a<p>[list?|repeat:]test</p></div>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<div>a</div>');
		});

		it('should not set to null if not empty', () => {
			const md = new Matchdom(DomPlugin);
			const html = `<p>[val|or:toto]</p>`;
			const copy = md.merge(html, {val: ''});
			assert.equal(copy.outerHTML, '<p>toto</p>');
		});

		it('should not process undefined unresolved path', () => {
			const md = new Matchdom(DomPlugin);
			const html = `<div><p>[obj|as:null|.test|fail:*]</p></div>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<div><p>[obj|as:null|.test|fail:*]</p></div>');
		});

		it('should not set to null if not undefined', () => {
			const md = new Matchdom(DomPlugin);
			const html = `<div><p>[obj|as:null|.test|fail:*]</p></div>`;
			const copy = md.merge(html, {obj: {test:1}});
			assert.equal(copy.outerHTML, '<div><p>1</p></div>');
		});

		it('should set to null if undefined using optional chaining', () => {
			const md = new Matchdom(DomPlugin, RepeatPlugin);
			const html = `<div><p>[obj?.test|fail:*]</p></div>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<div></div>');
		});

		it('should set to undefined after optional chaining', () => {
			const md = new Matchdom(DomPlugin);
			const html = `<div><p>[obj?|as:none|.test]</p></div>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<div><p>[obj?|as:none|.test]</p></div>');
		});

		it('should not set to null if not undefined using optional chaining', () => {
			const md = new Matchdom(TextPlugin);
			const copy = md.merge('[obj.test?]', { obj: { test: 1 } });
			assert.equal(copy, 1);
		});

		it('optional chaining should affect after filter', () => {
			let filtered = false;
			const md = new Matchdom(TextPlugin, {
				hooks: {
					after: {
						get(ctx, val, [path]) {
							filtered = true;
							assert.ok(ctx.expr.optional);
							assert.ok(!path.pop().endsWith('?'));
						}
					}
				}
			});
			assert.equal(md.merge('[obj.test?]', { obj: { test: 1 } }), 1);
			assert.ok(filtered);

		});

		it('optional chaining should affect afterAll filter', () => {
			const result = {};
			const md = new Matchdom(TextPlugin, {
				hooks: {
					afterAll(ctx, val) {
						assert.ok(ctx.expr.optional || val === undefined);
						result.test = val;
						return val;
					}
				}
			});
			assert.equal(md.merge('[obj.test]', { obj: {} }), null);
			assert.equal(result.test, undefined);
			assert.equal(md.merge('[obj.test?]', { obj: {} }), null);
			assert.equal(result.test, null);
		});
	});

	describe('path filter', () => {
		const md = new Matchdom(TextPlugin);

		it('should get path', () => {
			const copy = md.merge(`[obj.test|path:]`, { obj: { test: 'toto' }});
			assert.deepEqual(copy, ['obj', 'test']);
		});

		it('should get path name', () => {
			const copy = md.merge(`[obj.test|path:last]`, { obj: { test: 'toto' } });
			assert.deepEqual(copy, 'test');
		});
	});

	describe('const filter', () => {
		const md = new Matchdom(DomPlugin);

		it('should set to empty string', () => {
			const html = `<p>[val|const:]</p>`;
			const copy = md.merge(html, {val: 'toto'});
			assert.equal(copy.outerHTML, '<p></p>');
		});
		it('should set to string', () => {
			const html = `<p>[val|const:def]</p>`;
			const copy = md.merge(html, {val: 'toto'});
			assert.equal(copy.outerHTML, '<p>def</p>');
		});
	});

	describe('parts filter', () => {
		const md = new Matchdom(StringPlugin, TextPlugin);

		it('should get last part of a path', () => {
			const html = `[path|parts:.:-1]`;
			const copy = md.merge(html, {
				path: 'test.to.last'
			});
			assert.equal(copy, 'last');
		});
		it('should get first parts', () => {
			const html = `[datestr|parts:-:0:2]`;
			const copy = md.merge(html, {
				datestr: "2022-05-30"
			});
			assert.equal(copy, '2022-05');
		});

		it('should do nothing', () => {
			const html = `[str|parts:x]`;
			const copy = md.merge(html, {
				str: 'xyzzx'
			});
			assert.equal(copy, 'xyzzx');
		});
	});

});
