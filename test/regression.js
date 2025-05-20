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


	it('should not infinitely repeat', () => {
		const copy = md.merge(`<div>
			<fieldset>
				<div>[types|at:fieldset|repeat:mytype|.const]</div>
				<div>
					<input type="radio" name="test">
					<label data-value="[to:value:-input|it.const]">
					[cases.[mytype.const].list|at:div|repeat:it|.title]
					</label>
				</div>
			</fieldset>
		</div>`, {
			types: [{ const: 'a' }, { const: 'b' }],
			cases: {
				a: {
					list: [{ const: '1a', title: 'One' }, { const: '2a', title: 'Two' }]
				},
				b: {
					list: [{ const: '1b', title: 'One' }, { const: '2b', title: 'Two' }, { const: '3b', title: 'Three' }]
				}
			}
		});

		assert.equal(copy.outerHTML.replaceAll(/\t|\n/g, ""), `<div>
			<fieldset>
				<div>a</div>
				<div>
					<input type="radio" name="test" value="1a">
					<label>One</label>
				</div>
				<div>
					<input type="radio" name="test" value="2a">
					<label>Two</label>
				</div>
			</fieldset>
			<fieldset>
				<div>b</div>
				<div>
					<input type="radio" name="test" value="1b">
					<label>One</label>
				</div>
				<div>
					<input type="radio" name="test" value="2b">
					<label>Two</label>
				</div>
				<div>
					<input type="radio" name="test" value="3b">
					<label>Three</label>
				</div>
			</fieldset>
		</div>`.replaceAll(/\t|\n/g, ""));
	});
});
