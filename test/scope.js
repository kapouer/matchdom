import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters, scope) => {
	return (new Matchdom()).extend({ filters }).merge(node, data, scope);
};


describe('scope path', () => {
	it('should be set when merging a simple field', () => {
		const node = dom(`<span>[path.test.to|test:]</span>`);
		const copy = matchdom(node, {
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
	it('should be set when repeating an array', () => {
		const node = dom(`<div>
			<span>[arr|as:entries|repeat:row|scope:|.value]</span>
		</div>`);
		const copy = matchdom(node, {
			arr: ['one', 'two']
		}, {
			scope: function (ctx, entry) {
				assert.equal(ctx.expr.path[0], 'row');
				assert.ok([0, 1].includes(entry.key));
				return entry;
			}
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<span>one</span><span>two</span>
		</div>`).outerHTML);
	});
});

describe('scope variables', () => {
	it('should be kept', () => {
		const node = dom(`<div>
			<span>[.$one|eq:[.$two]|and:yes]</span>
		</div>`);
		const copy = matchdom(node, {}, {}, {
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
