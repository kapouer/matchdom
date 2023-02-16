import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, OpsPlugin, TextPlugin,
	ArrayPlugin, DomPlugin, DatePlugin,
	JsonPlugin
} from 'matchdom';

describe('filters', () => {

	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	describe('value', () => {
		it('should be undefined', () => {
			const html = `<a>Size[size|try:]</a>`;
			let hasTried = false;
			const md = new Matchdom(DomPlugin, {
				try(ctx, val) {
					hasTried = true;
					assert.equal(val, undefined);
				}
			});
			const copy = md.merge(html, {});
			assert.equal(hasTried, true);
			assert.equal(copy.outerHTML, '<a>Size</a>');
		});

		it('should be undefined and not merge level 2', () => {
			const html = `<a>Size[obj.size|try:]</a>`;
			let hasTried = false;

			const md = new Matchdom(DomPlugin, {
				try(ctx, val) {
					hasTried = true;
				}
			});
			const copy = md.merge(html, {});
			assert.equal(hasTried, false);
			assert.equal(copy.outerHTML, '<a>Size[obj.size|try:]</a>');
		});

		it('should be returned if it is the only hit and deal properly with undef/null/boolean', () => {
			const md = new Matchdom();
			assert.equal(md.merge(`[val]`, { val: 12 }), 12);
			assert.equal(md.merge(`[val]`, { val: true }), true);
			assert.equal(md.merge(`[val]`, { val: false }), false);
			assert.equal(md.merge(`[val]`, { val: null }), null);
			assert.equal(md.merge(`toto`, {}), 'toto');
			assert.equal(md.merge(`[val]`, {}), null);
			assert.equal(md.merge(`[obj.val]`, {}), '[obj.val]');
			assert.equal(md.merge(`[obj.val]`, { obj: {} }), null);
		});
	});

	describe('method filters', () => {
		const md = new Matchdom();

		it('should call method on value', () => {
			const copy = md.merge(`[toUpperCase:]`, "up");
			assert.equal(copy, 'UP');
		});

		it('should return value when method fails on value', () => {
			const copy = md.merge(`[toISOString:]`, new Date("invalid"));
			assert.equal(copy, null);
		});
	});

	describe('get is a filter', () => {
		const md = new Matchdom(DomPlugin);

		it('should get path', () => {
			const html = `<a>Si[get:a]</a>`;
			const copy = md.merge(html, { a: "ze" });
			assert.equal(copy.outerHTML, '<a>Size</a>');
		});
		it('should allow escaped path', () => {
			const html = `<a>Si[get:a%2eb]</a>`;
			const copy = md.merge(html, { "a.b": "ze" });
			assert.equal(copy.outerHTML, '<a>Size</a>');
		});
		it('should get top value', () => {
			const html = `<a>Si[get:]</a>`;
			const copy = md.merge(html, { toString: () => "ze" });
			assert.equal(copy.outerHTML, '<a>Size</a>');
		});
		it('should get current value as string', () => {
			const html = `<a>Si[get:]</a>`;
			const copy = md.merge(html, "ze");
			assert.equal(copy.outerHTML, '<a>Size</a>');
		});
		it('should access path in several filters', () => {
			const html = `<p>[a.b|.c.d]</p>`;
			const copy = md.merge(html, {
				a: {
					b: {
						c: {
							d: "test"
						}
					}
				}
			});
			assert.equal(copy.outerHTML, '<p>test</p>');
		});
		it('should allow to get path from root', () => {
			const html = `<p>[a.b|a.b1|test:]</p>`;
			let path;
			const copy = md.extend({filters: {
				test(ctx, val) {
					path = ctx.expr.path;
					return val;
				}
			}}).merge(html, {
				a: {
					b: "test",
					b1: "toast"
				}
			});
			assert.deepEqual(path, ['a', 'b1']);
			assert.equal(copy.outerHTML, '<p>toast</p>');
		});

		it('should work with then', () => {
			const html = `<p>[a.b|then:get:a.b1]</p>`;
			const copy = md.merge(html, {
				a: {
					b: "test",
					b1: "toast"
				}
			});
			assert.equal(copy.outerHTML, '<p>toast</p>');
		});
		it('should work with else', () => {
			const html = `<p>[a.b|else:get:a.b1]</p>`;
			const copy = md.merge(html, {
				a: {
					c: "test",
					b1: "toast"
				}
			});
			assert.equal(copy.outerHTML, '<p>toast</p>');
		});

		it('should be writable as shorthand syntax for filter parameter', () => {
			const html = `<p>[a.b|then:a.b1]</p>`;
			const copy = md.merge(html, {
				a: {
					b: "test",
					b1: "toast"
				}
			});
			assert.equal(copy.outerHTML, '<p>toast</p>');
		});
	});

	describe('alias', () => {
		const md = new Matchdom();

		it('should alias value in context', () => {
			const html = `[size|alias:test.it|.test.it]`;
			const copy = md.merge(html, {size: 'wot'});
			assert.equal(copy, 'wot');
		});
	});

	describe('parameters', () => {
		const md = new Matchdom(DomPlugin);

		it('should be uri-decoded', () => {
			const html = `<a>Size[size|const:%3A ]10mm</a>`;
			const copy = md.merge(html, {size: 10});
			assert.equal(copy.outerHTML, '<a>Size: 10mm</a>');
		});
		it('should be left untouched if not uri-decodable', () => {
			const html = `<a>Percent: [pp][const: %]</a>`;
			const copy = md.merge(html, { pp: 10 });
			assert.equal(copy.outerHTML, '<a>Percent: 10 %</a>');
		});

		it('should not consider value to be uri-decodable', () => {
			const html = `<a href="?[pp]">ok</a>`;
			const copy = md.merge(html, { pp: 'test=a%20b' });
			assert.equal(copy.outerHTML, '<a href="?test=a%20b">ok</a>');
		});
	});

	describe('types', () => {
		const md = new Matchdom();

		it('should cast value to int', () => {
			let ok = false;
			md.extend({
				filters: {
					mycheck: ['int', (ctx, val) => {
						assert.equal(val, 10);
						ok = true;
						return val;
					}]
				}
			}).merge('[val|mycheck:]', { val: "10" });
			assert.equal(ok, true);
		});
		it('should cast param to int', () => {
			let ok = false;
			md.extend({filters: {
				mycheck: ['int', 'int', (ctx, val, cte) => {
					assert.equal(cte, 7);
					ok = true;
					return val + cte;
				}]
			}}).merge('[val|mycheck:7]', { val: 10 });
			assert.equal(ok, true);
		});
		it('should cast param to boolean', () => {
			let ok = false;
			md.extend({filters: {
				mycheck: ['int', 'bool', (ctx, val, cte) => {
					assert.equal(cte, true);
					ok = true;
					return val;
				}]
			}}).merge('[val|mycheck:7]', { val: 10 });
			assert.equal(ok, true);
		});
		it('should not check value when type is null', () => {
			let ok = false;
			md.extend({filters: {
				mycheck: ['any', 'bool', (ctx, val, cte) => {
					assert.equal(val, 10);
					assert.equal(cte, false);
					ok = true;
					return val;
				}]
			}}).merge('[val|mycheck:false]', { val: 10 });
			assert.equal(ok, true);
		});
		it('should allow null value when type is null', () => {
			let ok = false;
			md.extend({ filters: {
				mycheck: ['any?', 'bool', (ctx, val, cte) => {
					assert.equal(val, null);
					assert.equal(cte, false);
					ok = true;
					return val;
				}]
			}}).merge('[val|mycheck:false]', { val: null });
			assert.equal(ok, true);
		});

		it('should allow any value when type is "any"', () => {
			let ok = false;
			md.extend({filters: {
				mycheck: ['any', 'bool', (ctx, val, cte) => {
					assert.ok(val instanceof Date);
					assert.equal(cte, true);
					ok = true;
					return val;
				}]
			}}).merge('[val|mycheck:1]', { val: new Date() });
			assert.equal(ok, true);
		});
		it('should require any value when type is "any"', () => {
			let ok = false;
			md.extend({filters: {
				mycheck: ['any', 'bool', (ctx, val, cte) => {
					ok = true;
					return val;
				}]
			}}).merge('[val|mycheck:1]', { val: undefined });
			assert.equal(ok, false);
		});
		it('should get a default empty string value', () => {
			let ok = false;
			md.extend({filters: {
				mycheck: ['any?', 'bool', (ctx, val, cte) => {
					assert.equal(val, null);
					ok = true;
					return val;
				}]
			}}).merge('[val|mycheck:1]', { val: null });
			assert.equal(ok, true);
		});
		it('should get a default integer value', () => {
			let ok = false;
			md.extend({filters:{
				mycheck: ['int?10', 'bool', (ctx, val, cte) => {
					assert.equal(val, 10);
					ok = true;
					return val;
				}]
			}}).merge('[val|mycheck:1]', { val: null });
			assert.equal(ok, true);
		});
	});

	describe('what', () => {
		const md = new Matchdom(DomPlugin, {
			drop: function (ctx, val, what) {
				ctx.cancel = true;
				return val;
			}
		});

		it('cancel drops merging of expression', () => {
			const html = `<p>[arr|drop:]</p>`;
			const copy = md.merge(html, {
				arr: ['word1', 'word2']
			});
			assert.equal(copy.outerHTML, '<p>[arr|drop:]</p>');
		});

		it('cancel drops merging of missing level one expression', () => {
			const html = `<p>[arr|drop:]</p>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<p>[arr|drop:]</p>');
		});

		it('cancel drops merging of level two expression', () => {
			const html = `<p>[obj.toto|drop:]</p>`;
			const copy = md.merge(html, {obj: {toto:1}});
			assert.equal(copy.outerHTML, '<p>[obj.toto|drop:]</p>');
		});

		it('cancel drops merging of missing level two expression', () => {
			const html = `<p>[arr.toto|drop:]</p>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<p>[arr.toto|drop:]</p>');
		});
	});

	describe('html type', () => {
		const md = new Matchdom().extend(DomPlugin);

		it('should keep whitespace', () => {
			const html = `<div>[str|as:html]</div>`;
			const copy = md.merge(html, {
				str: '<p>One <strong>two</strong>\n<strong>three</strong> four</p>'
			});
			assert.equal(copy.outerHTML, '<div><p>One <strong>two</strong>\n<strong>three</strong> four</p></div>');
		});

		it('should select first node', () => {
			const html = `<p>[str|query:img+span]</p>`;
			const copy = md.merge(html, {
				str: '<img src="toto"><span>test</span><i>test</i><span>toto</span>'
			});
			assert.equal(copy.outerHTML, '<p><span>test</span></p>');
		});

		it('should select nodes', () => {
			const html = `<p>[str|queryAll:span]</p>`;
			const copy = md.merge(html, {
				str: '<img src="toto"><span>test</span><i>test</i><span>toto</span>'
			});
			assert.equal(copy.outerHTML, '<p><span>test</span><span>toto</span></p>');
		});

		it('should allow null val', () => {
			const html = `<p>[str|as:html]</p>`;
			const copy = md.merge(html, {
				str: null
			});
			assert.equal(copy.outerHTML, '<p></p>');
		});

		it('should support xml', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
			<root>
				<title>[title]</title>
			</root>`;
			const node = (new DOMParser()).parseFromString(xml, "application/xml");
			const copy = md.merge(node, {
				title: 'test'
			});
			assert.equal((new XMLSerializer()).serializeToString(copy), `<root>
				<title>test</title>
			</root>`);
		});

		it('should support merging html in xml', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
			<root>
				<content>
					[content|as:xml]
				</content>
			</root>`;
			const node = (new DOMParser()).parseFromString(xml, "application/xml");
			const copy = md.merge(node, {
				content: 'test<br/>test'
			});
			assert.equal((new XMLSerializer()).serializeToString(copy), `<root>
				<content>
					test<br/>test
				</content>
			</root>`);
		});

		it('should support magnet in xml', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
			<root><content>
				[content|prune:content]
			</content></root>`;
			const node = (new DOMParser()).parseFromString(xml, "application/xml");
			const copy = md.merge(node, {
				content: null
			});
			assert.equal((new XMLSerializer()).serializeToString(copy), `<root/>`);
		});
	});

	describe('join filter', () => {
		const md = new Matchdom().extend(DomPlugin);
		it('with space', () => {
			const html = `<p>[arr|join: ]</p>`;
			const copy = md.merge(html, {
				arr: ['word1', 'word2']
			});
			assert.equal(copy.outerHTML, '<p>word1 word2</p>');
		});

		it('with newline in br mode', () => {
			const html = `<p>[arr|join:%0A|as:text]</p>`;
			const copy = md.merge(html, {
				arr: ['line1', 'line2']
			});
			assert.equal(copy.outerHTML, '<p>line1<br>line2</p>');
		});

		it('html with <br>', () => {
			const html = `<p>[arr|join:%3Cbr%3E|as:html]</p>`;
			const copy = md.merge(html, {
				arr: ['<b>line1</b>', '<i>line2</i>']
			});
			assert.equal(copy.outerHTML, '<p><b>line1</b><br><i>line2</i></p>');
		});
	});

	describe('split filter', () => {
		const md = new Matchdom(ArrayPlugin, DomPlugin, TextPlugin);
		it('with space', () => {
			const html = `<p>[text|split: |join:X]</p>`;
			const copy = md.merge(html, {
				text: 'word1 word2'
			});
			assert.equal(copy.outerHTML, '<p>word1Xword2</p>');
		});
		it('when value is not a string', () => {
			const html = `<p>[text|split:.]</p>`;
			const info = console.info;
			console.info = (...args) => {
				throw new Error(args.join(' '));
			};
			const copy = md.merge(html, {
				text: null
			});
			console.info = info;
			assert.equal(copy.outerHTML, '<p></p>');
		});
		it('with newlines and trim', () => {
			const html = `<p>[text|trim:|split:%0A|join:X]</p>`;
			const copy = md.merge(html, {
				text: 'word1\nword2\nword3\n'
			});
			assert.equal(copy.outerHTML, '<p>word1Xword2Xword3</p>');
		});
		it('with newlines and trim by value', () => {
			const html = `<p>[text|split:%0A|filter:word2:neq|join:X]</p>`;
			const copy = md.extend(OpsPlugin).merge(html, {
				text: 'word1\nword2\nword3'
			});
			assert.equal(copy.outerHTML, '<p>word1Xword3</p>');
		});
	});

	describe('slice filter', () => {
		const md = new Matchdom(DomPlugin, ArrayPlugin, TextPlugin);

		it('should slice array with begin and end', () => {
			const html = `<p>[arr|slice:1:3|join: ]</p>`;
			const copy = md.merge(html, {
				arr: ['word1', 'word2', 'word3']
			});
			assert.equal(copy.outerHTML, '<p>word2 word3</p>');
		});
		it('should slice array with begin', () => {
			const html = `<p>[arr|slice:2|join: ]</p>`;
			const copy = md.merge(html, {
				arr: ['word1', 'word2', 'word3', 'word4']
			});
			assert.equal(copy.outerHTML, '<p>word3 word4</p>');
		});
		it('should slice text with begin', () => {
			const html = `<p>[text|slice:2|join: ]</p>`;
			const copy = md.merge(html, {
				text: 'abcdef'
			});
			assert.equal(copy.outerHTML, '<p>cdef</p>');
		});
	});

	describe('parts filter', () => {
		const md = new Matchdom(DatePlugin, TextPlugin);

		it('should get last part of a path', () => {
			const html = `<p>[path|parts:.:-1]</p>`;
			const copy = md.merge(html, {
				path: 'test.to.last'
			});
			assert.equal(copy.outerHTML, '<p>last</p>');
		});
		it('should get first parts of isodate', () => {
			const html = `<p>[date|date:isodate|parts:-:0:2]</p>`;
			const copy = md.merge(html, {
				date: new Date("2022-05-30")
			});
			assert.equal(copy.outerHTML, '<p>2022-05</p>');
		});

		it('should do nothing', () => {
			const html = `<p>[str|parts:x]</p>`;
			const copy = md.merge(html, {
				str: 'xyzzx'
			});
			assert.equal(copy.outerHTML, '<p>xyzzx</p>');
		});
	});

	describe('sort filter', () => {
		const md = new Matchdom(ArrayPlugin, DomPlugin);

		it('should sort array with nulls last', () => {
			const html = `<p>[arr|sort:|join: ]</p>`;
			const copy = md.merge(html, {
				arr: ['word2', 'word1', null, 'word3']
			});
			assert.equal(copy.outerHTML, '<p>word1 word2 word3 </p>');
		});

		it('should sort array with nulls first', () => {
			const html = `<p>[arr|sort::true|join: ]</p>`;
			const copy = md.merge(html, {
				arr: ['word2', 'word1', null, 'word3']
			});
			assert.equal(copy.outerHTML, '<p> word1 word2 word3</p>');
		});
		it('should sort array by item and nulls first', () => {
			const html = `<p>[arr|sort:val:true|at:-:0:1|repeat:|key] </p>`;
			const copy = md.extend(DomPlugin).merge(html, {
				arr: [
					{ key: 'a', val: 'word2' },
					{ key: 'b', val: 'word1' },
					{ key: 'c', val: null },
					{ key: 'd', val: 'word3' }
				]
			});
			assert.equal(copy.outerHTML, '<p>c b a d </p>');
		});

		it('should sort array by numeric item and nulls last', () => {
			const html = `<p>[arr|sort:val:false|at:-:0:1|repeat:|key] </p>`;
			const copy = md.extend(DomPlugin).merge(html, {
				arr: [
					{ key: 'a', val: 2 },
					{ key: 'b', val: 1 },
					{ key: 'c', val: null },
					{ key: 'd', val: 11 }
				]
			});
			assert.equal(copy.outerHTML, '<p>b a d c </p>');
		});

		it('should sort array by date item and NaN first', () => {
			const html = `<p>[sort::true|map:date:iso|join:%0A|as:text] </p>`;
			const copy = md.extend(DatePlugin).merge(html, [
				new Date("2021-02-28T15:12"),
				new Date("2021-02-26T14:12"),
				new Date("invalid"),
			]);
			assert.equal(copy.outerHTML, '<p><br>2021-02-26T13:12:00Z<br>2021-02-28T14:12:00Z </p>');
		});
	});

	describe('pad', () => {
		const md = new Matchdom(DomPlugin);

		it('start', () => {
			const html = `<p>[str|padStart:3:x]</p>`;
			const copy = md.merge(html, {
				str: 'a'
			});
			assert.equal(copy.outerHTML, '<p>xxa</p>');
		});

		it('end', () => {
			const html = `<p>[str|padEnd:3:x]</p>`;
			const copy = md.merge(html, {
				str: 'a'
			});
			assert.equal(copy.outerHTML, '<p>axx</p>');
		});
	});

	describe('eq', () => {
		const md = new Matchdom(DomPlugin, OpsPlugin);

		it('should keep equal value', () => {
			const html = `<p>[val|eq:ceci]</p>`;
			const copy = md.merge(html, {val: 'ceci'});
			assert.equal(copy.outerHTML, '<p>ceci</p>');
		});
		it('should return null', () => {
			const html = `<p>[val|eq:cela]</p>`;
			const copy = md.merge(html, {val: 'ceci'});
			assert.equal(copy.outerHTML, '<p></p>');
		});
	});

	describe('neq', () => {
		const md = new Matchdom(DomPlugin, OpsPlugin);

		it('should keep value', () => {
			const html = `<p>[val|neq:ceci]</p>`;
			const copy = md.merge(html, {val: 'cecia'});
			assert.equal(copy.outerHTML, '<p>cecia</p>');
		});
		it('should return null', () => {
			const html = `<p test="[val|neq:cela]">ora</p>`;
			const copy = md.merge(html, {val: 'cela'});
			assert.equal(copy.outerHTML, '<p>ora</p>');
		});
	});

	describe('gt', () => {
		const md = new Matchdom(DomPlugin, OpsPlugin);

		it('should parse float, compare, and return boolean true', () => {
			const html = `<p>[val|gt:0.5]</p>`;
			const copy = md.merge(html, {val: 0.6});
			assert.equal(copy.outerHTML, '<p>0.6</p>');
		});
		it('should fail to parse float and return value', () => {
			const html = `<p>[val|gt:0.5]</p>`;
			const copy = md.merge(html, {val: 'xx'});
			assert.equal(copy.outerHTML, '<p></p>');
		});
	});

	describe('null/undefined', () => {
		const md = new Matchdom(DomPlugin, OpsPlugin);

		it('work with tests in the README', () => {
			assert.equal(md.merge("a[to.nothing]b", { to: {} }), 'ab');
			assert.equal(md.merge("a[to.nothing]b", {}), 'a[to.nothing]b');
			assert.equal(md.merge("a[to?.nothing]b", {}), 'ab');
			assert.equal(md.merge("a[to|repeat:|.first]b", {}), 'a[to|repeat:|.first]b');
			assert.equal(md.merge("a[to?|as:array|.first]b", {}), 'ab');
			assert.equal(md.merge("a[top]b", {}), 'ab');
			assert.equal(md.merge("a[top?]b", {}), 'ab');
		});

		it('should set to null if empty', () => {
			const html = `<p class="[val|as:null]">test</p>`;
			const copy = md.merge(html, {val: ''});
			assert.equal(copy.outerHTML, '<p>test</p>');
		});

		it('should merge an undefined top-level value', () => {
			const html = `<p>[val]test</p>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<p>test</p>');
		});

		it('should not merge an undefined top-level value if next filter requires a value', () => {
			const html = `<p>[list|repeat:]test</p>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<p>[list|repeat:]test</p>');
		});

		it('should merge an undefined optional top-level value even if next filter requires a value', () => {
			const html = `<div>a<p>[list?|repeat:]test</p></div>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<div>a</div>');
		});

		it('should not set to null if not empty', () => {
			const html = `<p>[val|or:toto]</p>`;
			const copy = md.merge(html, {val: ''});
			assert.equal(copy.outerHTML, '<p>toto</p>');
		});

		it('should set to null if undefined', () => {
			const html = `<div><p>[obj|as:null|.test|fail:*]</p></div>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<div></div>');
		});
		it('should not set to null if not undefined', () => {
			const html = `<div><p>[obj|as:null|.test|fail:*]</p></div>`;
			const copy = md.merge(html, {obj: {test:1}});
			assert.equal(copy.outerHTML, '<div><p>1</p></div>');
		});

		it('should set to null if undefined using optional chaining', () => {
			const html = `<div><p>[obj?.test|fail:*]</p></div>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<div></div>');
		});
		it('should not set to null if not undefined using optional chaining', () => {
			const copy = md.merge('[obj.test?]', { obj: { test: 1 } });
			assert.equal(copy, 1);
		});

		it('optional chaining should affect afterAll filter', () => {
			const result = {};
			const md = new Matchdom({
				hooks: {
					afterAll(ctx, val) {
						result.test = val;
						return val;
					}
				}
			});
			assert.equal(md.merge('[obj.test]', { obj: {} }), null);
			assert.equal(result.test, undefined);
			assert.equal(md.merge('[obj.test?]', { obj: {} }), null);
			assert.equal(result.test, null);
		});
	});

	describe('switch', () => {
		const md = new Matchdom(DomPlugin, OpsPlugin);

		it('should change value', () => {
			const html = `<p>[val|switch:ceci:cela]</p>`;
			const copy = md.merge(html, { val: 'ceci' });
			assert.equal(copy.outerHTML, '<p>cela</p>');
		});
		it('should not change value and pass-through', () => {
			const html = `<p>[val|switch:ceci:cela]</p>`;
			const copy = md.merge(html, { val: 'it' });
			assert.equal(copy.outerHTML, '<p>it</p>');
		});
		it('should not change value and return null', () => {
			const html = `<p>[val|switch:ceci:cela:]</p>`;
			const copy = md.merge(html, { val: 'it' });
			assert.equal(copy.outerHTML, '<p></p>');
		});
	});

	describe('name', () => {
		const md = new Matchdom(DomPlugin);

		it('should set a value when true', () => {
			const html = `<p>[val|path:name]</p>`;
			const copy = md.merge(html, {val: true});
			assert.equal(copy.outerHTML, '<p>val</p>');
		});
		it('should set a value when false', () => {
			const html = `<p>[val|and:ceci|else:path:name]</p>`;
			const copy = md.merge(html, {val: false});
			assert.equal(copy.outerHTML, '<p>val</p>');
		});
		it('should set an empty string when false is not set', () => {
			const html = `<p>[val|and:path:name|or:]</p>`;
			const copy = md.merge(html, {val: false});
			assert.equal(copy.outerHTML, '<p></p>');
		});
		it('should set last path component when true is not set', () => {
			const html = `<p>[to.val|path:name]</p>`;
			const copy = md.merge(html, {to: {val: true}});
			assert.equal(copy.outerHTML, '<p>val</p>');
		});
		it('should set empty string when true is not set', () => {
			const html = `<p>[val|and:path:name|or:]</p>`;
			const copy = md.merge(html, {val: false});
			assert.equal(copy.outerHTML, '<p></p>');
		});
	});

	describe('const filter', () => {
		const md = new Matchdom(DomPlugin);

		it('should set to empty string', () => {
			const html = `<p>[val|const:]</p>`;
			const copy = md.merge(html, {val: 'toto'});
			assert.equal(copy.outerHTML, '<p></p>');
		});
		it('should set to string', () => {
			const html = `<p>[val|const:def]</p>`;
			const copy = md.merge(html, {val: 'toto'});
			assert.equal(copy.outerHTML, '<p>def</p>');
		});
	});

	describe('!?', () => {
		const md = new Matchdom(DomPlugin);

		it('should set last path component when true is not set', () => {
			const html = `<p>[to.val|not:|path:name]</p>`;
			const copy = md.merge(html, {to: {val: false}});
			assert.equal(copy.outerHTML, '<p>val</p>');
		});
	});

	describe('pre', () => {
		const md = new Matchdom(TextPlugin, DomPlugin);

		it('should not prepend string if value is empty', () => {
			const html = `<a class="test [button|pre:ui ]">test</a>`;
			const copy = md.merge(html, {button: ''});
			assert.equal(copy.outerHTML, '<a class="test">test</a>');
		});
		it('should prepend string if value is not empty', () => {
			const html = `<a class="[button|pre:ui ]">test</a>`;
			const copy = md.merge(html, {button: 'button'});
			assert.equal(copy.outerHTML, '<a class="ui button">test</a>');
		});
	});

	describe('post', () => {
		const md = new Matchdom(TextPlugin, DomPlugin);

		it('should not append string if value is empty', () => {
			const html = `<a class="test [size|post: wide]">test</a>`;
			const copy = md.merge(html, {size: ''});
			assert.equal(copy.outerHTML, '<a class="test">test</a>');
		});
		it('should append string if value is not empty', () => {
			const html = `<a class="test [size|post: wide]">test</a>`;
			const copy = md.merge(html, {size: 'ten'});
			assert.equal(copy.outerHTML, '<a class="test ten wide">test</a>');
		});
	});

	describe('case', () => {
		const md = new Matchdom(TextPlugin, DomPlugin);

		it('should upper case', () => {
			const str = 'minusculés';
			const copy = md.merge("[str|case:up]", { str });
			assert.equal(copy, str.toUpperCase());
		});
		it('should lower case', () => {
			const str = 'ÉCRASÉS';
			const copy = md.merge("[str|case:low]", { str });
			assert.equal(copy, str.toLowerCase());
		});
		it('should capitalize sentences', () => {
			const str = 'à 0.5° il ne gèle pas.\nmais à .0 il gèle.';
			const copy = md.merge("[str|case:caps]", { str });
			assert.equal(copy, 'À 0.5° il ne gèle pas. Mais à .0 il gèle.');
		});
	});

	describe('date type', () => {
		const md = new Matchdom(DatePlugin, DomPlugin);

		it('toLocaleString', () => {
			const html = `<p>[str|lang:en|date:]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>3/9/2018, 12:12:56 PM</p>');
		});

		it('complex format', () => {
			const html = `<p>[str|lang:fr|date:day:D:month:Y:h:m]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>vendredi 9 mars 2018 à 12:12</p>');
		});

		it('adds time', () => {
			const html = `<p>[str|clock:3:D|lang:fr|date:date]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>12/03/2018</p>');
		});

		it('accepts "now" as keyword', () => {
			const html = `<p>[str|as:date|toLocaleTimeString:fr-FR]</p>`;
			const now = new Date();
			const copy = md.merge(html, {
				str: 'now'
			});
			assert.equal(copy.outerHTML, `<p>${now.toLocaleTimeString('fr-FR')}</p>`);
		});

		it('getYear', () => {
			const html = `<p>[str|as:date|getFullYear:]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>2018</p>');
		});
	});


	describe('json type', () => {
		const md = new Matchdom(JsonPlugin, DomPlugin);

		it('should parse string', () => {
			const html = `<p>[str|as:json|.test]</p>`;
			const copy = md.merge(html, {
				str: '{"test":10}'
			});
			assert.equal(copy.outerHTML, '<p>10</p>');
		});

		it('should fail to parse', () => {
			md.debug = true; // ensure missing json as type will crash
			const html = `<p>[str|as:json|.test]</p>`;
			const copy = md.merge(html, {
				str: '{test:10}'
			});
			assert.equal(copy.outerHTML, '<p></p>');
		});

		it('should fail to parse and not merge', () => {
			md.debug = true; // ensure missing json as type will crash
			const html = `<p>[str|as:json|other.test]</p>`;
			const copy = md.merge(html, {
				str: '{test:10}'
			});
			assert.equal(copy.outerHTML, '<p>[str|as:json|other.test]</p>');
		});
	});

	describe('url filter', () => {
		const md = new Matchdom(ArrayPlugin, DomPlugin);

		it('should work in the same attribute with a query string', () => {
			const html = `<a href="/test?[href|as:url]">[title]</a>`;
			const copy = md.merge(html, {
				href: '?arg=1&val=2',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/test?arg=1&amp;val=2">anchor</a>');
		});

		it('should work in the same attribute with a full url', () => {
			const html = `<a href="[href|as:url]?toto=2">[title]</a>`;
			const copy = md.merge(html, {
				href: '/pathname?test=1',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/pathname?toto=2&amp;test=1">anchor</a>');
		});

		it('should merge url query with target pathname', () => {
			const html = `<a href="/test" data-href="[href|to:href|as:url]">[title]</a>`;
			const copy = md.merge(html, {
				href: '?arg=1&val=2',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/test?arg=1&amp;val=2">anchor</a>');
		});

		it('should merge url pathname with target query', () => {
			const html = `<a href="/test?toto=1" data-href="[href|to:href|as:url]">[title]</a>`;
			const copy = md.merge(html, {
				href: '/path',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/path?toto=1">anchor</a>');
		});

		it('should merge pathname and query', () => {
			const html = `<a href="/test?toto=1" data-href="[href|to:href|as:url]">[title]</a>`;
			const copy = md.merge(html, {
				href: '/path?a=1&b=2',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/path?toto=1&amp;a=1&amp;b=2">anchor</a>');
		});

		it('should overwrite target query name with partial template', () => {
			const html = `<a href="/test?id=1" data-href="?id=[id|to:href|as:url]">[title]</a>`;
			const copy = md.merge(html, {
				id: 'xx',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/test?id=xx">anchor</a>');
		});

		it('should merge url query with partial template', () => {
			const html = `<a href="/test?toto=1" data-href="?id=[id|to:href|as:url]">[title]</a>`;
			const copy = md.merge(html, {
				id: 'xx',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/test?toto=1&amp;id=xx">anchor</a>');
		});

		it('should overwrite url pathname and query with partial template', () => {
			const html = `<a href="/test?toto=1" data-href="/this?id=[id|to:href|as:url]&amp;const=1">[title]</a>`;
			const copy = md.merge(html, {
				id: 'xx',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/this?toto=1&amp;id=xx&amp;const=1">anchor</a>');
		});

		it('should merge url query with partial template when repeated', () => {
			const html = `<div><a href="/test?id=1" data-href="?id=[repeat:|id|to:href|as:url]">[title]</a></div>`;
			const copy = md.merge(html, [{
				id: 'xx',
				title: 'anchor'
			}]);
			assert.equal(copy.outerHTML, '<div><a href="/test?id=xx">anchor</a></div>');
		});

		it('should be able to be called multiple times for the same attribute ???', () => {
			const html = `<div><a href="/test?status=0" data-href="?id=[id]&amp;status=[status|to:href|as:url]">[title]</a></div>`;
			const copy = md.merge(html, {
				id: 'xx',
				title: 'anchor',
				status: "12"
			});
			assert.equal(copy.outerHTML, '<div><a href="/test?status=12&amp;id=xx">anchor</a></div>');
		});

		it('should not crash when data is not string', () => {
			const html = `<div><a href="/test" data-href="?id=[id|to:href|as:url]">aaa</a></div>`;
			const copy = md.merge(html, {
				id: 12
			});
			assert.equal(copy.outerHTML, '<div><a href="/test?id=12">aaa</a></div>');
		});
	});

	describe('to filter', () => {
		const md = new Matchdom(ArrayPlugin, DomPlugin);

		it('should fill current node', () => {
			const html = `<p>a[field|to:-]b</p>`;
			const copy = md.merge(html, {
				field: 'word'
			});
			assert.equal(copy.outerHTML, '<p>word</p>');
		});

		it('should fill current node from attribute', () => {
			const html = `<div><p data-template="[field|to:-]">ab</p></div>`;
			const copy = md.merge(html, {
				field: 'word'
			});
			assert.equal(copy.outerHTML, '<div><p>word</p></div>');
		});

		it('should replace current root node', () => {
			const html = `<p>[field|to:*]a</p>`;
			const copy = md.merge(html, {
				field: 'word'
			});
			assert.equal(copy.nodeValue, 'word');
		});

		it('should replace current node from attribute', () => {
			const html = `<div><p data-template="[field|to:*]">ab</p></div>`;
			const copy = md.merge(html, {
				field: 'word'
			});
			assert.equal(copy.outerHTML, '<div>word</div>');
		});

		it('should fill current node from attribute using html', () => {
			const html = `<p data-template="[field|to:-|as:html]">ab</p>`;
			const copy = md.merge(html, {
				field: '<b>word</b>'
			});
			assert.equal(copy.outerHTML, '<p><b>word</b></p>');
		});

		it('should replace current node from attribute using html', () => {
			const frag = md.merge(`[html|as:html]`, {
				html: `<p data-template="[field|as:html|to:*]">ab</p>thing`
			});
			const copy = md.merge(frag, {
				field: '<b>word</b>'
			});
			const div = copy.ownerDocument.createElement('div');
			div.append(copy);
			assert.equal(div.innerHTML, '<b>word</b>thing');
		});

		it('should not fill current node', () => {
			const html = `<p>a[field.it|to:]b</p>`;
			const copy = md.merge(html, {
				other: 'word'
			});
			assert.equal(copy.outerHTML, '<p>a[field.it|to:]b</p>');
		});

		it('should not fill from attribute', () => {
			const html = `<p data-template="[field.it|to:*]">abb</p>`;
			const copy = md.merge(html, {
				other: 'word'
			});
			assert.equal(copy.outerHTML, '<p data-template="[field.it|to:*]">abb</p>');
		});


		it('should append to space-separated attribute', () => {
			const html = `<p class="test">[style|to:class]abb</p>`;
			const copy = md.merge(html, {
				style: 'word'
			});
			assert.equal(copy.outerHTML, '<p class="test word">abb</p>');
		});

		it('should fill current node and set an attribute using two separate expressions', () => {
			const html = `<p data-fill="[field|to:-]" data-attr="[field2|to:class]">astuffb</p>`;
			const copy = md.merge(html, {
				field: 'word',
				field2: 'myclass'
			});
			assert.equal(copy.outerHTML, '<p class="myclass">word</p>');
		});

		it('should fill current node and set an attribute on parent node using two separate expressions', () => {
			const html = `<div><p data-fill="[field|to:-]" data-attr="[field2|at:div|to:class]">astuffb</p></div>`;
			const copy = md.merge(html, {
				field: 'word',
				field2: 'myclass'
			});
			assert.equal(copy.outerHTML, '<div class="myclass"><p>word</p></div>');
		});

		it('should fill current node before setting an attribute from within', () => {
			const html = `<p data-expr="[field|to:-]">a[field|to:class]b</p>`;
			const copy = md.merge(html, {
				field: 'word',
				field2: 'myclass'
			});
			assert.equal(copy.outerHTML, '<p>word</p>');
		});

		it('should not set an attribute partially filled', () => {
			const html = `<div><p data-attr="toto[field|to:-]aa">astuffb</p></div>`;
			const copy = md.merge(html, {
				field: 'word',
				field2: 'myclass'
			});
			assert.equal(copy.outerHTML, '<div><p>totowordaa</p></div>');
		});
	});

	describe('trim', () => {
		const md = new Matchdom(TextPlugin);
		it('out', () => {
			const html = `<span>-[test|trim:out]-</span>`;
			const copy = md.merge(html, { test: ' a ' });
			assert.equal(copy.outerHTML, '<span>-a-</span>');
		});

		it('default', () => {
			const html = `<span>-[test|trim:]-</span>`;
			const copy = md.merge(html, { test: ' a ' });
			assert.equal(copy.outerHTML, '<span>-a-</span>');
		});

		it('start', () => {
			const html = `<span>-[test|trim:start]-</span>`;
			const copy = md.merge(html, { test: ' a ' });
			assert.equal(copy.outerHTML, '<span>-a -</span>');
		});

		it('end', () => {
			const html = `<span>-[test|trim:end]-</span>`;
			const copy = md.merge(html, { test: ' a ' });
			assert.equal(copy.outerHTML, '<span>- a-</span>');
		});

		it('all', () => {
			const html = `<span>-[test|trim:all]-</span>`;
			const copy = md.merge(html, { test: ' a b\n\tc ' });
			assert.equal(copy.outerHTML, '<span>-abc-</span>');
		});

		it('line', () => {
			const html = `<span>-[test|trim:line]-</span>`;
			const copy = md.merge(html, { test: ' a\nb\n\nc ' });
			assert.equal(copy.outerHTML, '<span>- a\nb\nc -</span>');
		});
	});
});
