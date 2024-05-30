import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, ArrayPlugin, DomPlugin, RepeatPlugin, TextPlugin } from 'matchdom';

describe('scope', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	const md = new Matchdom(TextPlugin);

	it('path should be set when merging a simple field', () => {
		const html = `[path.test.to|test:]`;
		const copy = md.extend({
			test: function (ctx, val) {
				assert.equal(ctx.expr.path.join('.'), 'path.test.to');
				return val;
			}
		}).merge(html, {
			path: {
				test: {
					to: "yes"
				}
			}
		});
		assert.equal(copy, 'yes');
	});
	it('path should be set when repeating an array', () => {
		const md = new Matchdom(ArrayPlugin, DomPlugin, RepeatPlugin, {
			scope: function (ctx, entry) {
				assert.equal(ctx.expr.path[0], 'row');
				assert.ok([0, 1].includes(entry.key));
				return entry;
			}
		});
		md.debug = true;
		const html = `<div>
			<span>[arr|as:entries|repeat:row|scope:|.value]</span>
		</div>`;
		const copy = md.merge(html, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span>one</span><span>two</span>
		</div>`).outerHTML);
	});
});
