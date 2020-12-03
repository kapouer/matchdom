import assert from 'assert';
import matchdom from 'matchdom';
import dom from 'domify';

describe('hooks filter', function() {
	it('should be called after this filter', function() {
		let node = dom(`<p>[arr|join: |pre:now]</p>`);
		let copy = matchdom(node, {
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
		let node = dom(`<p>[arr2|join: |pre:now ]</p>`);
		var arr = ['word1', 'word2'];
		let copy = matchdom(node, {
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
		let node = dom(`<p>[arr|join: |pre:now ]</p>`);
		let copy = matchdom(node, {
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
		let node = dom(`<p><span>[arr.val|repeat]</span></p>`);
		let copy = matchdom(node, {
			arr: [{val: 'word1'}, {val: 'word2'}]
		}, {
			'||': function(val, what) {
				var len = what.scope.path.length;
				assert.ok((val == "word1" || val == "word2") && len == 3 || len == 2);
				if (len == 3) return "it " + val;
			}
		});
		assert.equal(copy.outerHTML, '<p><span>it word1</span><span>it word2</span></p>');
	});
});

