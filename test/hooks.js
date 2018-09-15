const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('domify');
require('dom4'); // jsdom is missing .closest

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
});

