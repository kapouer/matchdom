const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('domify');
require('dom4'); // jsdom is missing .closest


describe('scope path', function() {
	it('should be set when merging a simple field', function() {
		let node = dom(`<span>[path.test.to|test]</span>`);
		let copy = matchdom(node, {
			path: {
				test: {
					to: "yes"
				}
			}
		}, {
			test: function(val, what) {
				assert.equal(what.scope.path.join('.'), 'path.test.to');
			}
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});
	it('should be set when repeating an array', function() {
		let node = dom(`<div>
			<span>[arr|repeat:span:row|scope]</span>
		</div>`);
		let copy = matchdom(node, {
			arr: ['one', 'two']
		}, {
			scope: function(val, what) {
				assert.equal(what.scope.path[0], 'arr');
				assert.ok(what.scope.path[1] === 0 || what.scope.path[1] === 1);
				assert.equal(val, what.expr.get(what.data, what.scope.path));
			}
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<span>one</span><span>two</span>
		</div>`).outerHTML);
	});
});

