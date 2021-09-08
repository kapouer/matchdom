import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';

const matchdom = (node, data, filters) => new Matchdom().extend({ filters }).merge(node, data);

describe('hooks filter', function() {
	it('should be called after this filter', function() {
		const node = dom(`<p>[arr|join: |pre:now]</p>`);
		const copy = matchdom(node, {
			arr: ['word1', 'word2']
		}, {
			'join|': function(val, what) {
				assert.equal(val, 'word1 word2');
				return ' it ' + val;
			}
		});
		assert.equal(copy.outerHTML, '<p>now it word1 word2</p>');
	});
	it('should be called before all filters', function() {
		const node = dom(`<p>[arr2|join: |pre:now ]</p>`);
		const arr = ['word1', 'word2'];
		const copy = matchdom(node, {
			arr: arr
		}, {
			'|': function(val, what) {
				assert.equal(val, undefined);
				if (what.expr.path[0] == "arr2") return arr;
			}
		});
		assert.equal(copy.outerHTML, '<p>now word1 word2</p>');
	});
	it('should be called after all filters', function() {
		const node = dom(`<p>[arr|join: |pre:now ]</p>`);
		const copy = matchdom(node, {
			arr: ['word1', 'word2']
		}, {
			'||': function(val, what) {
				assert.equal(val, 'now word1 word2');
				return 'it ' + val;
			}
		});
		assert.equal(copy.outerHTML, '<p>it now word1 word2</p>');
	});
	it('should not be written in repeated block', function() {
		const node = dom(`<p><span>[arr.val|repeat]</span></p>`);
		const copy = matchdom(node, {
			arr: [{val: 'word1'}, {val: 'word2'}]
		}, {
			'||': function(val, what) {
				const len = what.scope.path.length;
				assert.ok((val == "word1" || val == "word2") && len == 3 || len == 2);
				if (len == 3) return "it " + val;
			}
		});
		assert.equal(copy.outerHTML, '<p><span>it word1</span><span>it word2</span></p>');
	});
});

