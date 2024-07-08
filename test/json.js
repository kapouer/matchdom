import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, RepeatPlugin, OpsPlugin, JsonPlugin, DomPlugin, ArrayPlugin
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
		it('should merge basic object', () => {
			const md = new Matchdom(JsonPlugin);
			md.debug = true;
			const item = { id: 1, title: 'title1' };
			assert.deepEqual(md.merge({
				id: '[item.id]',
				title: '[item.title]'
			}, { item }), item);

			assert.deepEqual(md.merge({
				obj: '[item]'
			}, { item }), { obj: item });
		});

		it('should merge basic object with null value', () => {
			const tjson = {
				id: '[item.id]',
				title: '[item.title]'
			};
			const md = new Matchdom(JsonPlugin);
			md.debug = true;
			const copy = md.merge(tjson, { item: { id: 1, title: null } });
			assert.deepEqual(copy, { id: 1, title: null });
		});

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

		it('should assign to parent range', () => {
			const md = new Matchdom(JsonPlugin, RepeatPlugin, OpsPlugin);
			assert.deepEqual(md.merge({
				a: true,
				'[item|at:*]': ''
			}, {
				item: { id: '1', title: 'title1' }
			}), {
				a: true,
				id: '1', title: 'title1'
			});

			assert.deepEqual(md.merge({
				b: true,
				'key': '[item|at:*]'
			}, {
				item: { id: '1', title: 'title1' }
			}), {
				b: true,
				id: '1', title: 'title1'
			});
		});

		it('should replace parent range', () => {
			const md = new Matchdom(JsonPlugin, RepeatPlugin, OpsPlugin);
			assert.deepEqual(md.merge({
				list: {
					a: true,
					num: '[item|at:**]'
				}
			}, {
				item: { id: '1', title: 'title1' }
			}), {
				list: { id: '1', title: 'title1' }
			});
			assert.deepEqual(md.merge({
				list: {
					a: true,
					'[item|at:**]': ''
				}
			}, {
				item: { id: '1', title: 'title1' }
			}), {
				list: { id: '1', title: 'title1' }
			});
		});

		it('should replace parent range by key', () => {
			const md = new Matchdom(JsonPlugin, RepeatPlugin, OpsPlugin);
			assert.deepEqual(md.merge({
				list: {
					a: true,
					num: '[item|at:list]'
				}
			}, {
				item: { id: '1', title: 'title1' }
			}), {
				 id: '1', title: 'title1'
			});
			assert.deepEqual(md.merge({
				list: {
					a: true,
					'[item|at:list]': ''
				}
			}, {
				item: { id: '1', title: 'title1' }
			}), {
				id: '1', title: 'title1'
			});
		});

		it('should fail correct range', () => {
			const tjson = {
				list: {
					num: '[item.id|fail:*]',
					desc: '[item.title]'
				}
			};
			const md = new Matchdom(JsonPlugin, RepeatPlugin, OpsPlugin);
			md.debug = true;
			const copy = md.merge(tjson, {
				item:  { id: null, title: 'title1' }
			});
			assert.deepEqual(copy, {
				list: {
					desc: 'title1'
				}
			});
		});

		it('should allow range by key', () => {
			const tjson = {
				list: {
					num: '[item.id|fail:list:1]',
					desc: '[item.title]'
				},
				it: { k: 1 }
			};
			const md = new Matchdom(JsonPlugin, RepeatPlugin, OpsPlugin);
			md.debug = true;
			const copy = md.merge(tjson, {
				item: { id: null, title: 'title1' }
			});
			assert.deepEqual(copy, {});
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

		it('should build object by looping over keys', () => {
			const tjson = {
				'[obj|as:entries|at:*|repeat:it|.key]k': '[it.value]v'
			};
			const md = new Matchdom(JsonPlugin, ArrayPlugin, RepeatPlugin);
			md.debug = true;
			const copy = md.merge(tjson, { obj: { id: 1, title: 'title1' } });
			assert.deepEqual(copy, { idk: '1v', titlek: 'title1v' });
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

