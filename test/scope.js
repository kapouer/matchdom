import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom({ filters })).merge(node, data);
};


describe('scope path', function () {
	it('should be set when merging a simple field', function () {
		let node = dom(`<span>[path.test.to|test:]</span>`);
		let copy = matchdom(node, {
			path: {
				test: {
					to: "yes"
				}
			}
		}, {
			test: function (ctx, val) {
				assert.equal(ctx.expr.path.join('.'), 'path.test.to');
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});
	it('should be set when repeating an array', function () {
		let node = dom(`<div>
			<span>[arr|repeat:span:row|row|scope:]</span>
		</div>`);
		let copy = matchdom(node, {
			arr: ['one', 'two']
		}, {
			scope: function (ctx, val) {
				console.log(ctx.expr.path);

				// assert.equal(what.scope.path[0], 'arr');
				// assert.ok(what.scope.path[1] === 0 || what.scope.path[1] === 1);
				// assert.equal(val, what.expr.get(what.data, what.scope.path));
				return val;
			}
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<span>one</span><span>two</span>
		</div>`).outerHTML);
	});
});

describe('scope variables', function () {
	it('should be kept', function () {
		let node = dom(`<div>
			<span>[$one|eq:[$two]:yes:no]</span>
		</div>`);
		let copy = matchdom(node, {}, {}, {
			data: {
				$one: "one",
				$two: "one"
			}
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<span>yes</span>
		</div>`).outerHTML);
	});
});
