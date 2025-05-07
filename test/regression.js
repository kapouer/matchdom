import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, OpsPlugin,
	DomPlugin, RepeatPlugin,
	JsonPlugin, UrlPlugin
} from 'matchdom';

describe('regressions', () => {

	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	const md = new Matchdom(DomPlugin, OpsPlugin, RepeatPlugin, JsonPlugin, UrlPlugin);

	it('at/to/repeat/prune combinations', () => {
		const html = `<div>
			<div class="page">
				<span>[items|at:.page:2|repeat:item|.id]-0</span>
				<span>[item.pages|eq:1|alt:single|at:.page|to:class]</span>
				<span>[item.pages|eq:1|prune:.page]</span>
			</div>
			<div class="page">
				<span>[item.pages|eq:2|alt:double|at:.page|to:class]</span>
				<span>[item.pages|eq:2|prune:.page:1]</span>
				<span>[item.id]-1</span>
			</div>
			<div class="page">
				[item.id]-2
			</div>
		</div>`;
		const copy = md.merge(html, {
			items: [
				{
					"pages": 1,
					"id": "singleA"
				},
				{
					"pages": 1,
					"id": "singleB"
				}
			]
		});
		assert.equal(copy.querySelectorAll('.page.single').length, 2);
		assert.equal(copy.querySelectorAll('.page').length, 2);
	});

	it('rebase should work', () => {
		const obj = {
			href: '/pathname?toto=1&it=3&tata=2'
		};
		const copy = md.merge({ url: `[href|as:url||.query|set:it:4||as:str]` }, obj);
		assert.equal(copy.url, '/pathname?toto=1&it=4&tata=2');
	});
});
