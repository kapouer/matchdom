import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, RepeatPlugin, OpsPlugin, JsonPlugin, DomPlugin
} from 'matchdom';

describe('json plugin', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	describe('parse strings', () => {
		const md = new Matchdom(JsonPlugin, DomPlugin);

		it('should parse string', () => {
			const html = `<p>[str|as:obj|.test]</p>`;
			const copy = md.merge(html, {
				str: '{"test":10}'
			});
			assert.equal(copy.outerHTML, '<p>10</p>');
		});

		it('should fail to parse', () => {
			md.debug = true; // ensure missing json as type will crash
			const html = `<p>[str|as:obj|.test]</p>`;
			const copy = md.merge(html, {
				str: '{test:10}'
			});
			assert.equal(copy.outerHTML, '<p></p>');
		});

		it('should fail to parse and not merge', () => {
			md.debug = true; // ensure missing json as type will crash
			const html = `<p>[str|as:obj|other.test]</p>`;
			const copy = md.merge(html, {
				str: '{test:10}'
			});
			assert.equal(copy.outerHTML, '<p>[str|as:obj|other.test]</p>');
		});
	});

	describe('modelize and works with repeat', () => {

		it('should loop over correctly declared json', () => {
			const tjson = {
				list: [{
					num: '[items|at:**|repeat:item|.id]',
					desc: '[item.title]-[item.id]'
				}]
			};
			const md = new Matchdom(JsonPlugin, RepeatPlugin, OpsPlugin);
			md.debug = true;
			const copy = md.merge(tjson, {
				items: [
					{ id: 1, title: 'title1' },
					{ id: 2, title: 'title2' }
				]
			});
			assert.deepEqual(copy, {
				list: [{
					num: 1,
					desc: 'title1-1'
				}, {
					num: 2,
					desc: 'title2-2'
				}]
			});
		});

		it('should loop over json object and promote it to array', () => {
			const tjson = {
				list: {
					num: '[items|at:**|repeat:item|.id]',
					desc: '[item.title]-[item.id]'
				}
			};
			const md = new Matchdom(JsonPlugin, RepeatPlugin, OpsPlugin);
			md.debug = true;
			const copy = md.merge(tjson, {
				items: [
					{ id: 1, title: 'title1' },
					{ id: 2, title: 'title2' }
				]
			});
			assert.deepEqual(copy, {
				list: [{
					num: 1,
					desc: 'title1-1'
				}, {
					num: 2,
					desc: 'title2-2'
				}]
			});
		});

		it('should loop over root json object and promote it to array', () => {
			const tjson = {
				num: '[items|at:**|repeat:item|.id]',
				desc: '[item.title]'
			};
			const md = new Matchdom(JsonPlugin, RepeatPlugin);
			md.debug = true;
			const copy = md.merge(tjson, {
				items: [
					{ id: 1, title: 'title1' },
					{ id: 2, title: 'title2' }
				]
			});
			assert.deepEqual(copy, [{
				num: 1,
				desc: 'title1'
			}, {
				num: 2,
				desc: 'title2'
			}]);
		});

		it('should loop over json array', () => {
			const tjson = [{
				num: '[at:**|repeat:item|.id]',
				desc: '[item.title]-[item.id]'
			}];
			const md = new Matchdom(JsonPlugin, RepeatPlugin);
			md.debug = true;
			const copy = md.merge(tjson, [
				{ id: 1, title: 'title1' },
				{ id: 2, title: 'title2' }
			]);
			assert.deepEqual(copy, [{
				num: 1,
				desc: 'title1-1'
			}, {
				num: 2,
				desc: 'title2-2'
			}]);
		});

		it('should not continue merging on orphaned json fragments', () => {
			const tjson = {
				num: '[at:**|repeat:item|.id]',
				desc: '[item.title]'
			};
			let miss = false;
			const md = new Matchdom(RepeatPlugin, JsonPlugin, {
				hooks: {
					afterAll(ctx, val) {
						if (val === undefined) miss = true;
						return val;
					}
				}
			});
			const copy = md.merge(tjson, [
				{ id: 1, title: 'title1' },
				{ id: 2, title: 'title2' }
			]);
			assert.deepEqual(copy, [{
				num: 1,
				desc: 'title1'
			}, {
				num: 2,
				desc: 'title2'
			}]);
			assert.ok(!miss);
		});

		it('should iterate after on removal of referenceNode', () => {
			const tjson = {
				items: [{
					id: "[items|at:**|repeat:it|.id]",
					image: "[it.image]"
				}],
				count: "[items.length]"
			};
			let miss = false;
			const md = new Matchdom(RepeatPlugin, JsonPlugin, {
				hooks: {
					afterAll(ctx, val) {
						if (val === undefined) miss = true;
						return val;
					}
				}
			});
			const copy = md.merge(tjson, {
				items: [{
					"id": "1",
					"image": "a"
				}, {
					"id": "2",
					"image": "b"
				}]
			});
			assert.deepEqual(copy, {
				items: [{
					id: "1",
					image: 'a'
				}, {
					id: "2",
					image: 'b'
				}],
				count: 2
			});
			assert.ok(!miss);
		});
	});
});

