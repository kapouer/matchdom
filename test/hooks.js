import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, ArrayPlugin, DomPlugin, RepeatPlugin } from 'matchdom';

describe('hooks filter', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	it('should be called after this filter', () => {
		const md = new Matchdom({
			after: {
				join(ctx, val, args) {
					assert.equal(val, 'word1 word2');
					return ' it ' + val;
				}
			}
		});
		const html = `[arr|join: ]`;
		const copy = md.merge(html, {
			arr: ['word1', 'word2']
		});
		assert.equal(copy, ' it word1 word2');
	});

	it('should be called after this filter with unmutated params', () => {
		const md = new Matchdom({
			debug: true,
			after: {
				omit(ctx, val, paths) {
					assert.deepEqual(paths, [['test']]);
					return val;
				}
			}
		});
		const copy = md.merge(`[obj|omit:test]`, { obj: { test: 2, b: 1 } });
		assert.deepEqual(copy, { b: 1 });
	});

	it('should be called before all filters', () => {
		const html = `[arr2|join: ]`;
		const arr = ['word1', 'word2'];
		const md = new Matchdom({
			beforeAll(ctx, val) {
				assert.deepEqual(val, { arr });
				assert.equal(ctx.expr.filters[0][1], "arr2");
				ctx.data.arr2 = arr;
			}
		});
		const copy = md.merge(html, {
			arr: arr
		});
		assert.equal(copy, 'word1 word2');
	});

	it('should be called after all filters', () => {
		const html = `[arr|unshift:now|join:%20]`;
		let called = false;
		const md = new Matchdom(ArrayPlugin, {
			afterAll(ctx, val) {
				assert.equal(val, 'now word1 word2');
				called = true;
				return 'it ' + val;
			}
		});

		const copy = md.merge(html, {
			arr: ['word1', 'word2']
		});
		assert.ok(called);
		assert.equal(copy, 'it now word1 word2');
	});

	it('should be called before get filter', () => {
		const html = `[$val|test:$me]`;
		const md = new Matchdom({
			before: {
				get(ctx, val, [path]) {
					if (path[0]?.startsWith('$')) {
						if (ctx.$data == null) {
							ctx.$data = ctx.data;
							ctx.data = ctx.scope;
						}
					}
				}
			},
			after: {
				get(ctx) {
					if (ctx.$data != null) {
						ctx.data = ctx.$data;
						ctx.$data = null;
					}
				}
			}
		}, {
			filters: {
				test(ctx, val, p) {
					return val + ctx.filter(val, 'get', p);
				}
			}
		});

		const copy = md.merge(html, {}, { // scope
			$val: 1,
			$me: 2
		});
		assert.equal(copy, 3);
	});

	it('should work in repeated block', () => {
		const html = `<p><span>[arr|repeat:*|.val]</span></p>`;
		const vals = [];
		const md = new Matchdom(DomPlugin, RepeatPlugin, {
			afterAll(ctx, val) {
				vals.push(val);
			}
		});
		const copy = md.merge(html, {
			arr: [{ val: 'word1' }, { val: 'word2' }]
		});
		assert.deepEqual(vals, ["word1", "word2", null]);
		assert.equal(copy.outerHTML, '<p><span>word1</span><span>word2</span></p>');
	});

	it('should register multiple hooks', () => {
		const html = `[arr2|join:-]`;
		const arr = ['word1', 'word2'];
		const md = new Matchdom({
			beforeAll(ctx, val) {
				assert.deepEqual(val, { arr });
				assert.equal(ctx.expr.filters[0][1], "arr2");
				ctx.data.arr2 = arr;
			}
		}, {
			hooks: {
				beforeAll(ctx) {
					ctx.data.arr2.push('word3');
				}
			}
		});
		const copy = md.merge(html, { arr });
		assert.equal(copy, 'word1-word2-word3');
		// also a copy of md should work
		assert.equal((new Matchdom(md)).merge(html, { arr }), 'word1-word2-word3-word3');
	});

	it('should be called with typed parameters', () => {
		const html = `[$val|test:$me]`;
		const md = new Matchdom({
			before: {
				get(ctx, val, [path]) {
					if (path[0]?.startsWith('$')) {
						if (ctx.$data == null) {
							ctx.$data = ctx.data;
							ctx.data = ctx.scope;
						}
					}
				}
			},
			after: {
				get(ctx) {
					if (ctx.$data != null) {
						ctx.data = ctx.$data;
						ctx.$data = null;
					}
				}
			}
		}, {
			filters: {
				test(ctx, val, p) {
					return val + ctx.filter(val, 'get', p);
				}
			}
		});

		const copy = md.merge(html, {}, { // scope
			$val: 1,
			$me: 2
		});
		assert.equal(copy, 3);
	});
});

