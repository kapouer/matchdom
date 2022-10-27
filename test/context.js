import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, DomPlugin, DatePlugin
} from 'matchdom';

describe('context', () => {

	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	const md = new Matchdom(DomPlugin);


	it('should run filter', () => {
		const html = `<div>List: [list|run:join:-]</div>`;
		md.extend({
			filters: {
				run: ['?', 'filter', '*', (ctx, val, ...filter) => {
					return ctx.filter(val, filter);
				}],
				join(ctx, val, sep) {
					return val.join(sep);
				}
			}
		});

		const copy = md.merge(html, {
			list: ["a", "b"]
		});
		assert.equal(copy.outerHTML, '<div>List: a-b</div>');
	});

	it('should extend date format and run another format', () => {
		const html = `<div>Date: [date|date:multiline]</div>`;
		md.extend(DatePlugin);
		md.extend({
			formats: {
				date: {
					multiline(ctx, date) {
						const str = ctx.filter(date, 'date', 'iso');
						return ctx.format(str.split('T').join('\n'), 'as', 'text');
					}
				}
			}
		});
		const copy = md.merge(html, {
			date: new Date("2022-10-27T10:55:32Z")
		});
		assert.equal(copy.outerHTML, '<div>Date: 2022-10-27<br>10:55:32Z</div>');
	});

});
