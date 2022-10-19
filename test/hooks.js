import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, ArrayPlugin, DomPlugin } from 'matchdom';

before(function () {
	this.jsdom = globalJsdom();
});
after(function () {
	this.jsdom();
});

describe('hooks filter', () => {
	it('should be called after this filter', () => {
		const md = new Matchdom({
			afterEach(ctx, val, filter) {
				if (filter[0] == "join") {
					assert.equal(val, 'word1 word2');
					return ' it ' + val;
				} else {
					return val;
				}
			}
		});
		const html = `[arr|join: ]`;
		const copy = md.merge(html, {
			arr: ['word1', 'word2']
		});
		assert.equal(copy, ' it word1 word2');
	});
	it('should be called before all filters', () => {
		const html = `[arr2|join: ]`;
		const arr = ['word1', 'word2'];
		const md = new Matchdom({
			beforeAll(ctx, val, filters) {
				assert.deepEqual(val, { arr });
				assert.equal(filters[0][0], "arr2");
				ctx.data.arr2 = arr;
				return val;
			}
		});
		const copy = md.merge(html, {
			arr: arr
		});
		assert.equal(copy, 'word1 word2');
	});
	it('should be called after all filters', () => {
		const html = `[arr|unshift:now|join:%20]`;
		const md = new Matchdom(ArrayPlugin, {
			afterAll(ctx, val, filters) {
				assert.equal(val, 'now word1 word2');
				return 'it ' + val;
			}
		});

		const copy = md.merge(html, {
			arr: ['word1', 'word2']
		});
		assert.equal(copy, 'it now word1 word2');
	});
	it('should work in repeated block', () => {
		const html = `<p><span>[arr|repeat:*|.val]</span></p>`;
		const md = new Matchdom(DomPlugin, {
			afterAll(ctx, val, filters) {
				return "it " + val;
			}
		});
		const copy = md.merge(html, {
			arr: [{ val: 'word1' }, { val: 'word2' }]
		});
		assert.equal(copy.outerHTML, '<p><span>it word1</span><span>it word2</span></p>');
	});
});

