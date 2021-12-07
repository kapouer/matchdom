import assert from 'assert';
import { Matchdom, ArrayPlugin, DomPlugin, HTML as dom } from 'matchdom';

const matchdom = (node, data, hooks) => new Matchdom({ hooks }).extend(DomPlugin, ArrayPlugin).merge(node, data);

describe('hooks filter', () => {
	it('should be called after this filter', () => {
		const node = dom(`<p>[arr|join: ]</p>`);
		const copy = matchdom(node, {
			arr: ['word1', 'word2']
		}, {
			afterEach(ctx, val, filter) {
				if (filter[0] == "join") {
					assert.strictEqual(val, 'word1 word2');
					return ' it ' + val;
				} else {
					return val;
				}
			}
		});
		assert.equal(copy.outerHTML, '<p> it word1 word2</p>');
	});
	it('should be called before all filters', () => {
		const node = dom(`<p>[arr2|join: ]</p>`);
		const arr = ['word1', 'word2'];
		const copy = matchdom(node, {
			arr: arr
		}, {
			beforeAll(ctx, val, filters) {
				assert.deepStrictEqual(val, { arr });
				assert.strictEqual(filters[0][0], "arr2");
				ctx.data.arr2 = arr;
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>word1 word2</p>');
	});
	it('should be called after all filters', () => {
		const node = dom(`<p>[arr|unshift:now|join:%20]</p>`);
		const copy = matchdom(node, {
			arr: ['word1', 'word2']
		}, {
			afterAll(ctx, val, filters) {
				assert.equal(val, 'now word1 word2');
				return 'it ' + val;
			}
		});
		assert.equal(copy.outerHTML, '<p>it now word1 word2</p>');
	});
	it('should work in repeated block', () => {
		const node = dom(`<p><span>[arr|repeat:*|.val]</span></p>`);
		const copy = matchdom(node, {
			arr: [{val: 'word1'}, {val: 'word2'}]
		}, {
			afterAll(ctx, val, filters) {
				return "it " + val;
			}
		});
		assert.equal(copy.outerHTML, '<p><span>it word1</span><span>it word2</span></p>');
	});
});

