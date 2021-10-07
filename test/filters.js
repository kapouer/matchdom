import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) =>
	new Matchdom().extend({ filters }).merge(node, data);

describe('value', () => {
	it('should be undefined', () => {
		const node = dom(`<a>Size[size|try:]</a>`);
		let hasTried = false;
		const copy = matchdom(node, {}, {try: function(ctx, val) {
			hasTried = true;
			assert.strictEqual(val, undefined);
		}});
		assert.equal(hasTried, true);
		assert.equal(copy.outerHTML, '<a>Size</a>');
	});

	it('should be undefined and not merge level 2', () => {
		const node = dom(`<a>Size[obj.size|try:]</a>`);
		let hasTried = false;
		const copy = matchdom(node, {}, {try: function(ctx, val) {
			hasTried = true;
		}});
		assert.equal(hasTried, false);
		assert.equal(copy.outerHTML, '<a>Size[obj.size|try:]</a>');
	});
});

describe('method filters', () => {
	it('should call method on value', () => {
		const copy = matchdom(`[toUpperCase:]`, "up");
		assert.equal(copy, 'UP');
	});

	it('should return value when method fails on value', () => {
		const copy = matchdom(`[toISOString:]`, new Date("invalid"));
		assert.strictEqual(copy, null);
	});
});

describe('get is a filter', () => {
	it('should get path', () => {
		const node = dom(`<a>Si[get:a]</a>`);
		const copy = matchdom(node, { a: "ze" });
		assert.equal(copy.outerHTML, '<a>Size</a>');
	});
	it('should allow escaped path', () => {
		const node = dom(`<a>Si[get:a%2eb]</a>`);
		const copy = matchdom(node, { "a.b": "ze" });
		assert.equal(copy.outerHTML, '<a>Size</a>');
	});
	it('should get top value', () => {
		const node = dom(`<a>Si[get:]</a>`);
		const copy = matchdom(node, { toString: () => "ze" });
		assert.equal(copy.outerHTML, '<a>Size</a>');
	});
	it('should get current value as string', () => {
		const node = dom(`<a>Si[get:]</a>`);
		const copy = matchdom(node, "ze");
		assert.equal(copy.outerHTML, '<a>Size</a>');
	});
	it('should access path in several filters', () => {
		const node = dom(`<p>[a.b|.c.d]</p>`);
		const copy = matchdom(node, {
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
		const node = dom(`<p>[a.b|a.b1|test:]</p>`);
		let path;
		const copy = matchdom(node, {
			a: {
				b: "test",
				b1: "toast"
			}
		}, {
			test(ctx, val) {
				path = ctx.expr.path;
				return val;
			}
		});
		assert.deepStrictEqual(path, ['a', 'b1']);
		assert.strictEqual(copy.outerHTML, '<p>toast</p>');
	});

	it('should work with then', () => {
		const node = dom(`<p>[a.b|then:get:a.b1]</p>`);
		const copy = matchdom(node, {
			a: {
				b: "test",
				b1: "toast"
			}
		});
		assert.strictEqual(copy.outerHTML, '<p>toast</p>');
	});
	it('should work with else', () => {
		const node = dom(`<p>[a.b|else:get:a.b1]</p>`);
		const copy = matchdom(node, {
			a: {
				c: "test",
				b1: "toast"
			}
		});
		assert.strictEqual(copy.outerHTML, '<p>toast</p>');
	});
});

describe('alias', () => {
	it('should alias value in context', () => {
		const node = dom(`<a>[size|alias:test.it|.test.it]</a>`);
		const copy = matchdom(node, {size: 'wot'});
		assert.equal(copy.outerHTML, '<a>wot</a>');
	});
});

describe('parameters', () => {
	it('should uri-decode value', () => {
		const node = dom(`<a>Size[size|pre:%3A |post: mm]</a>`);
		const copy = matchdom(node, {size: 10});
		assert.equal(copy.outerHTML, '<a>Size: 10 mm</a>');
	});
	it('should leave value untouched if not uri-decodable', () => {
		const node = dom(`<a>Percent[pp|post: %|pre:%3A ]</a>`);
		const copy = matchdom(node, { pp: 10 });
		assert.equal(copy.outerHTML, '<a>Percent: 10 %</a>');
	});
});

describe('types', () => {
	it('should cast value to int', () => {
		let ok = false;
		matchdom('[val|mycheck:]', { val: "10" }, {
			mycheck: ['int', (ctx, val) => {
				assert.strictEqual(val, 10);
				ok = true;
				return val;
			}]
		});
		assert.strictEqual(ok, true);
	});
	it('should cast param to int', () => {
		let ok = false;
		matchdom('[val|mycheck:7]', { val: 10 }, {
			mycheck: ['int', 'int', (ctx, val, cte) => {
				assert.strictEqual(cte, 7);
				ok = true;
				return val + cte;
			}]
		});
		assert.strictEqual(ok, true);
	});
	it('should cast param to boolean', () => {
		let ok = false;
		matchdom('[val|mycheck:7]', { val: 10 }, {
			mycheck: ['int', 'bool', (ctx, val, cte) => {
				assert.strictEqual(cte, true);
				ok = true;
				return val;
			}]
		});
		assert.strictEqual(ok, true);
	});
	it('should not check value when type is null', () => {
		let ok = false;
		matchdom('[val|mycheck:false]', { val: 10 }, {
			mycheck: ['any', 'bool', (ctx, val, cte) => {
				assert.strictEqual(val, 10);
				assert.strictEqual(cte, false);
				ok = true;
				return val;
			}]
		});
		assert.strictEqual(ok, true);
	});
	it('should allow null value when type is null', () => {
		let ok = false;
		matchdom('[val|mycheck:false]', { val: null }, {
			mycheck: ['any?', 'bool', (ctx, val, cte) => {
				assert.strictEqual(val, null);
				assert.strictEqual(cte, false);
				ok = true;
				return val;
			}]
		});
		assert.strictEqual(ok, true);
	});

	it('should allow any value when type is "any"', () => {
		let ok = false;
		matchdom('[val|mycheck:1]', { val: new Date() }, {
			mycheck: ['any', 'bool', (ctx, val, cte) => {
				assert.ok(val instanceof Date);
				assert.strictEqual(cte, true);
				ok = true;
				return val;
			}]
		});
		assert.strictEqual(ok, true);
	});
	it('should require any value when type is "any"', () => {
		let ok = false;
		matchdom('[val|mycheck:1]', { val: undefined }, {
			mycheck: ['any', 'bool', (ctx, val, cte) => {
				ok = true;
				return val;
			}]
		});
		assert.strictEqual(ok, false);
	});
	it('should get a default empty string value', () => {
		let ok = false;
		matchdom('[val|mycheck:1]', { val: null }, {
			mycheck: ['any?', 'bool', (ctx, val, cte) => {
				assert.strictEqual(val, null);
				ok = true;
				return val;
			}]
		});
		assert.strictEqual(ok, true);
	});
	it('should get a default integer value', () => {
		let ok = false;
		matchdom('[val|mycheck:1]', { val: null }, {
			mycheck: ['int?10', 'bool', (ctx, val, cte) => {
				assert.strictEqual(val, 10);
				ok = true;
				return val;
			}]
		});
		assert.strictEqual(ok, true);
	});
});

describe('what', () => {
	it('cancel drops merging of expression', () => {
		const node = dom(`<p>[arr|drop:]</p>`);
		const copy = matchdom(node, {
			arr: ['word1', 'word2']
		}, {
			drop: function(ctx, val) {
				ctx.cancel = true;
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[arr|drop:]</p>');
	});

	it('cancel drops merging of missing level one expression', () => {
		const node = dom(`<p>[arr|drop:]</p>`);
		const copy = matchdom(node, {}, {
			drop: function(ctx, val) {
				ctx.cancel = true;
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[arr|drop:]</p>');
	});

	it('cancel drops merging of level two expression', () => {
		const node = dom(`<p>[obj.toto|drop:]</p>`);
		const copy = matchdom(node, {obj: {toto:1}}, {
			drop: function (ctx, val, what) {
				ctx.cancel = true;
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[obj.toto|drop:]</p>');
	});

	it('cancel drops merging of missing level two expression', () => {
		const node = dom(`<p>[arr.toto|drop:]</p>`);
		const copy = matchdom(node, {}, {
			drop: function(ctx, val, what) {
				ctx.cancel = true;
				return val;
			}
		});
		assert.equal(copy.outerHTML, '<p>[arr.toto|drop:]</p>');
	});
});

describe('html type', () => {
	it('should select nodes', () => {
		const node = dom(`<p>[str|as:html|queryAll:span]</p>`);
		const copy = matchdom(node, {
			str: '<img src="toto"><span>test</span><i>test</i><span>toto</span>'
		});
		assert.equal(copy.outerHTML, '<p><span>test</span><span>toto</span></p>');
	});

	it('should allow null val', () => {
		const node = dom(`<p>[str|as:html]</p>`);
		const copy = matchdom(node, {
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
		const copy = matchdom(node, {
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
		const copy = matchdom(node, {
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
		const copy = matchdom(node, {
			content: null
		});
		assert.equal((new XMLSerializer()).serializeToString(copy), `<root/>`);
	});
});

describe('join filter', () => {
	it('with space', () => {
		const node = dom(`<p>[arr|join: ]</p>`);
		const copy = matchdom(node, {
			arr: ['word1', 'word2']
		});
		assert.equal(copy.outerHTML, '<p>word1 word2</p>');
	});

	it('with newline in br mode', () => {
		const node = dom(`<p>[arr|join:%0A|as:text]</p>`);
		const copy = matchdom(node, {
			arr: ['line1', 'line2']
		});
		assert.equal(copy.outerHTML, '<p>line1<br>line2</p>');
	});

	it('html with <br>', () => {
		const node = dom(`<p>[arr|join:%3Cbr%3E|as:html]</p>`);
		const copy = matchdom(node, {
			arr: ['<b>line1</b>', '<i>line2</i>']
		});
		assert.equal(copy.outerHTML, '<p><b>line1</b><br><i>line2</i></p>');
	});
});

describe('split filter', () => {
	it('with space', () => {
		const node = dom(`<p>[text|split: |join:X]</p>`);
		const copy = matchdom(node, {
			text: 'word1 word2'
		});
		assert.equal(copy.outerHTML, '<p>word1Xword2</p>');
	});
	it('with newlines and trim', () => {
		const node = dom(`<p>[text|trim:|split:%0A|join:X]</p>`);
		const copy = matchdom(node, {
			text: 'word1\nword2\nword3\n'
		});
		assert.equal(copy.outerHTML, '<p>word1Xword2Xword3</p>');
	});
	it('with newlines and trim by value', () => {
		const node = dom(`<p>[text|split:%0A|filter:word2:neq|join:X]</p>`);
		const copy = matchdom(node, {
			text: 'word1\nword2\nword3'
		});
		assert.equal(copy.outerHTML, '<p>word1Xword3</p>');
	});
});

describe('slice filter', () => {
	it('should slice array with begin and end', () => {
		const node = dom(`<p>[arr|slice:1:3|join: ]</p>`);
		const copy = matchdom(node, {
			arr: ['word1', 'word2', 'word3']
		});
		assert.equal(copy.outerHTML, '<p>word2 word3</p>');
	});
	it('should slice array with begin', () => {
		const node = dom(`<p>[arr|slice:2|join: ]</p>`);
		const copy = matchdom(node, {
			arr: ['word1', 'word2', 'word3', 'word4']
		});
		assert.equal(copy.outerHTML, '<p>word3 word4</p>');
	});
});

describe('sort filter', () => {
	it('should sort array with nulls last', () => {
		const node = dom(`<p>[arr|sort:|join: ]</p>`);
		const copy = matchdom(node, {
			arr: ['word2', 'word1', null, 'word3']
		});
		assert.equal(copy.outerHTML, '<p>word1 word2 word3 </p>');
	});

	it('should sort array with nulls first', () => {
		const node = dom(`<p>[arr|sort::true|join: ]</p>`);
		const copy = matchdom(node, {
			arr: ['word2', 'word1', null, 'word3']
		});
		assert.equal(copy.outerHTML, '<p> word1 word2 word3</p>');
	});
	it('should sort array by item and nulls first', () => {
		const node = dom(`<p>[arr|sort:val:true|at:-|repeat:|key] </p>`);
		const copy = matchdom(node, {
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
		const node = dom(`<p>[arr|sort:val:false|at:-|repeat:|key] </p>`);
		const copy = matchdom(node, {
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
		const node = dom(`<p>[sort::true|map:toISOString|join:%0A|as:text] </p>`);
		const copy = matchdom(node, [
			new Date("2021-02-28T15:12"),
			new Date("2021-02-26T14:12"),
			new Date("invalid"),
		]);
		assert.equal(copy.outerHTML, '<p><br>2021-02-26T13:12:00.000Z<br>2021-02-28T14:12:00.000Z </p>');
	});
});

describe('pad', () => {
	it('start', () => {
		const node = dom(`<p>[str|padStart:3:x]</p>`);
		const copy = matchdom(node, {
			str: 'a'
		});
		assert.equal(copy.outerHTML, '<p>xxa</p>');
	});

	it('end', () => {
		const node = dom(`<p>[str|padEnd:3:x]</p>`);
		const copy = matchdom(node, {
			str: 'a'
		});
		assert.equal(copy.outerHTML, '<p>axx</p>');
	});
});

describe('eq', () => {
	it('should keep equal value', () => {
		const node = dom(`<p>[val|eq:ceci]</p>`);
		const copy = matchdom(node, {val: 'ceci'});
		assert.equal(copy.outerHTML, '<p>ceci</p>');
	});
	it('should return null', () => {
		const node = dom(`<p>[val|eq:cela]</p>`);
		const copy = matchdom(node, {val: 'ceci'});
		assert.equal(copy.outerHTML, '<p></p>');
	});
});

describe('neq', () => {
	it('should keep value', () => {
		const node = dom(`<p>[val|neq:ceci]</p>`);
		const copy = matchdom(node, {val: 'cecia'});
		assert.equal(copy.outerHTML, '<p>cecia</p>');
	});
	it('should return null', () => {
		const node = dom(`<p test="[val|neq:cela]">ora</p>`);
		const copy = matchdom(node, {val: 'cela'});
		assert.equal(copy.outerHTML, '<p>ora</p>');
	});
});

describe('gt', () => {
	it('should parse float, compare, and return boolean true', () => {
		const node = dom(`<p>[val|gt:0.5]</p>`);
		const copy = matchdom(node, {val: 0.6});
		assert.equal(copy.outerHTML, '<p>0.6</p>');
	});
	it('should fail to parse float and return value', () => {
		const node = dom(`<p>[val|gt:0.5]</p>`);
		const copy = matchdom(node, {val: "xx"});
		assert.equal(copy.outerHTML, '<p></p>');
	});
});

describe('not', () => {
	it('should set to null if empty', () => {
		const node = dom(`<p class="[val|as:null]">test</p>`);
		const copy = matchdom(node, {val: ''});
		assert.equal(copy.outerHTML, '<p>test</p>');
	});

	it('should not set to null if not empty', () => {
		const node = dom(`<p>[val|or:toto]</p>`);
		const copy = matchdom(node, {val: ''});
		assert.equal(copy.outerHTML, '<p>toto</p>');
	});
});

describe('name', () => {
	it('should set a value when true', () => {
		const node = dom(`<p>[val|path:name]</p>`);
		const copy = matchdom(node, {val: true});
		assert.equal(copy.outerHTML, '<p>val</p>');
	});
	it('should set a value when false', () => {
		const node = dom(`<p>[val|and:ceci|else:path:name]</p>`);
		const copy = matchdom(node, {val: false});
		assert.equal(copy.outerHTML, '<p>val</p>');
	});
	it('should set an empty string when false is not set', () => {
		const node = dom(`<p>[val|and:path:name|or:]</p>`);
		const copy = matchdom(node, {val: false});
		assert.equal(copy.outerHTML, '<p></p>');
	});
	it('should set last path component when true is not set', () => {
		const node = dom(`<p>[to.val|path:name]</p>`);
		const copy = matchdom(node, {to: {val: true}});
		assert.equal(copy.outerHTML, '<p>val</p>');
	});
	it('should set empty string when true is not set', () => {
		const node = dom(`<p>[val|and:path:name|or:]</p>`);
		const copy = matchdom(node, {val: false});
		assert.equal(copy.outerHTML, '<p></p>');
	});
});

describe('const filter', () => {
	it('should set to empty string', () => {
		const node = dom(`<p>[val|const:]</p>`);
		const copy = matchdom(node, {val: 'toto'});
		assert.equal(copy.outerHTML, '<p></p>');
	});
	it('should set to string', () => {
		const node = dom(`<p>[val|const:def]</p>`);
		const copy = matchdom(node, {val: 'toto'});
		assert.equal(copy.outerHTML, '<p>def</p>');
	});
});

describe('!?', () => {
	it('should set last path component when true is not set', () => {
		const node = dom(`<p>[to.val|not:|path:name]</p>`);
		const copy = matchdom(node, {to: {val: false}});
		assert.equal(copy.outerHTML, '<p>val</p>');
	});
});

describe('pre', () => {
	it('should not prepend string if value is empty', () => {
		const node = dom(`<a class="test [button|pre:ui ]">test</a>`);
		const copy = matchdom(node, {button: ''});
		assert.equal(copy.outerHTML, '<a class="test">test</a>');
	});
	it('should prepend string if value is not empty', () => {
		const node = dom(`<a class="[button|pre:ui ]">test</a>`);
		const copy = matchdom(node, {button: 'button'});
		assert.equal(copy.outerHTML, '<a class="ui button">test</a>');
	});
});

describe('post', () => {
	it('should not append string if value is empty', () => {
		const node = dom(`<a class="test [size|post: wide]">test</a>`);
		const copy = matchdom(node, {size: ''});
		assert.equal(copy.outerHTML, '<a class="test">test</a>');
	});
	it('should append string if value is not empty', () => {
		const node = dom(`<a class="test [size|post: wide]">test</a>`);
		const copy = matchdom(node, {size: 'ten'});
		assert.equal(copy.outerHTML, '<a class="test ten wide">test</a>');
	});
});

describe('case', () => {
	it('should upper case', () => {
		const str = 'minusculés';
		const copy = matchdom("[str|case:up]", { str });
		assert.equal(copy, str.toUpperCase());
	});
	it('should lower case', () => {
		const str = 'ÉCRASÉS';
		const copy = matchdom("[str|case:low]", { str });
		assert.equal(copy, str.toLowerCase());
	});
	it('should capitalize sentences', () => {
		const str = 'à 0.5° il ne gèle pas.\nmais à .0 il gèle.';
		const copy = matchdom("[str|case:caps]", { str });
		assert.equal(copy, 'À 0.5° il ne gèle pas. Mais à .0 il gèle.');
	});
});

describe('date type', () => {
	it('toLocaleString', () => {
		const node = dom(`<p>[str|as:date|toLocaleString:en]</p>`);
		const copy = matchdom(node, {
			str: '2018-03-09T11:12:56.739Z'
		});
		assert.equal(copy.outerHTML, '<p>3/9/2018, 12:12:56 PM</p>');
	});

	it('accepts "now" as keyword', () => {
		const node = dom(`<p>[str|as:date|toLocaleTimeString:fr-FR]</p>`);
		const now = new Date();
		const copy = matchdom(node, {
			str: 'now'
		});
		assert.equal(copy.outerHTML, `<p>${now.toLocaleTimeString('fr-FR')}</p>`);
	});

	it('getYear', () => {
		const node = dom(`<p>[str|as:date|getFullYear:]</p>`);
		const copy = matchdom(node, {
			str: '2018-03-09T11:12:56.739Z'
		});
		assert.equal(copy.outerHTML, '<p>2018</p>');
	});
});


describe('json type', () => {
	it('should parse string', () => {
		const node = dom(`<p>[str|as:json|.test]</p>`);
		const copy = matchdom(node, {
			str: '{"test":10}'
		});
		assert.equal(copy.outerHTML, '<p>10</p>');
	});

	it('should fail to parse', () => {
		const node = dom(`<p>[str|as:json|test]</p>`);
		const copy = matchdom(node, {
			str: '{test:10}'
		});
		assert.equal(copy.outerHTML, '<p></p>');
	});
});

describe('url filter', () => {
	it('should work in the same attribute with a query string', () => {
		const node = dom(`<a href="/test?[href|as:url]">[title]</a>`);
		const copy = matchdom(node, {
			href: '?arg=1&val=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?arg=1&amp;val=2">anchor</a>');
	});

	it('should work in the same attribute with a full url', () => {
		const node = dom(`<a href="[href|as:url]?toto=2">[title]</a>`);
		const copy = matchdom(node, {
			href: '/pathname?test=1',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/pathname?toto=2&amp;test=1">anchor</a>');
	});

	it('should merge url query with target pathname', () => {
		const node = dom(`<a href="/test" data-href="[href|to:href|as:url]">[title]</a>`);
		const copy = matchdom(node, {
			href: '?arg=1&val=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?arg=1&amp;val=2">anchor</a>');
	});

	it('should merge url pathname with target query', () => {
		const node = dom(`<a href="/test?toto=1" data-href="[href|to:href|as:url]">[title]</a>`);
		const copy = matchdom(node, {
			href: '/path',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/path?toto=1">anchor</a>');
	});

	it('should merge pathname and query', () => {
		const node = dom(`<a href="/test?toto=1" data-href="[href|to:href|as:url]">[title]</a>`);
		const copy = matchdom(node, {
			href: '/path?a=1&b=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/path?toto=1&amp;a=1&amp;b=2">anchor</a>');
	});

	it('should overwrite target query name with partial template', () => {
		const node = dom(`<a href="/test?id=1" data-href="?id=[id|to:href|as:url]">[title]</a>`);
		const copy = matchdom(node, {
			id: 'xx',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?id=xx">anchor</a>');
	});

	it('should merge url query with partial template', () => {
		const node = dom(`<a href="/test?toto=1" data-href="?id=[id|to:href|as:url]">[title]</a>`);
		const copy = matchdom(node, {
			id: 'xx',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?toto=1&amp;id=xx">anchor</a>');
	});

	it('should overwrite url pathname and query with partial template', () => {
		const node = dom(`<a href="/test?toto=1" data-href="/this?id=[id|to:href|as:url]&amp;const=1">[title]</a>`);
		const copy = matchdom(node, {
			id: 'xx',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/this?toto=1&amp;id=xx&amp;const=1">anchor</a>');
	});

	it('should merge url query with partial template when repeated', () => {
		const node = dom(`<div><a href="/test?id=1" data-href="?id=[repeat:|id|to:href|as:url]">[title]</a></div>`);
		const copy = matchdom(node, [{
			id: 'xx',
			title: 'anchor'
		}]);
		assert.equal(copy.outerHTML, '<div><a href="/test?id=xx">anchor</a></div>');
	});

	it('should be able to be called multiple times for the same attribute ???', () => {
		const node = dom(`<div><a href="/test?status=0" data-href="?id=[id]&amp;status=[status|to:href|as:url]">[title]</a></div>`);
		const copy = matchdom(node, {
			id: 'xx',
			title: 'anchor',
			status: "12"
		});
		assert.equal(copy.outerHTML, '<div><a href="/test?status=12&amp;id=xx">anchor</a></div>');
	});

	it('should not crash when data is not string', () => {
		const node = dom(`<div><a href="/test" data-href="?id=[id|to:href|as:url]">aaa</a></div>`);
		const copy = matchdom(node, {
			id: 12
		});
		assert.equal(copy.outerHTML, '<div><a href="/test?id=12">aaa</a></div>');
	});
});

describe('to filter', () => {
	it('should fill current node', () => {
		const node = dom(`<p>a[field|to:-]b</p>`);
		const copy = matchdom(node, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});

	it('should fill current node from attribute', () => {
		const node = dom(`<div><p data-template="[field|to:-]">ab</p></div>`);
		const copy = matchdom(node, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<div><p>word</p></div>');
	});

	it('should replace current root node', () => {
		const node = dom(`<p>[field|to:*]a</p>`);
		const copy = matchdom(node, {
			field: 'word'
		});
		assert.equal(copy.nodeValue, 'word');
	});

	it('should replace current node from attribute', () => {
		const node = dom(`<div><p data-template="[field|to:*]">ab</p></div>`);
		const copy = matchdom(node, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<div>word</div>');
	});

	it('should fill current node from attribute using html', () => {
		const node = dom(`<p data-template="[field|to:-|as:html]">ab</p>`);
		const copy = matchdom(node, {
			field: '<b>word</b>'
		});
		assert.equal(copy.outerHTML, '<p><b>word</b></p>');
	});

	it('should replace current node from attribute using html', () => {
		const node = dom(`<p data-template="[field|as:html|to:*]">ab</p>thing`);
		const copy = matchdom(node, {
			field: '<b>word</b>'
		});
		const div = dom('<div>');
		div.append(copy);
		assert.equal(div.innerHTML, '<b>word</b>thing');
	});

	it('should not fill current node', () => {
		const node = dom(`<p>a[field.it|to:]b</p>`);
		const copy = matchdom(node, {
			other: 'word'
		});
		assert.equal(copy.outerHTML, '<p>a[field.it|to:]b</p>');
	});

	it('should not fill from attribute', () => {
		const node = dom(`<p data-template="[field.it|to:*]">abb</p>`);
		const copy = matchdom(node, {
			other: 'word'
		});
		assert.equal(copy.outerHTML, '<p data-template="[field.it|to:*]">abb</p>');
	});


	it('should append to space-separated attribute', () => {
		const node = dom(`<p class="test">[style|to:class]abb</p>`);
		const copy = matchdom(node, {
			style: 'word'
		});
		assert.equal(copy.outerHTML, '<p class="test word">abb</p>');
	});

	it('should fill current node and set an attribute using two separate expressions', () => {
		const node = dom(`<p data-fill="[field|to:-]" data-attr="[field2|to:class]">astuffb</p>`);
		const copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<p class="myclass">word</p>');
	});

	it('should fill current node and set an attribute on parent node using two separate expressions', () => {
		const node = dom(`<div><p data-fill="[field|to:-]" data-attr="[field2|at:div|to:class]">astuffb</p></div>`);
		const copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<div class="myclass"><p>word</p></div>');
	});

	it('should fill current node before setting an attribute from within', () => {
		const node = dom(`<p data-expr="[field|to:-]">a[field|to:class]b</p>`);
		const copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});

	it('should not set an attribute partially filled', () => {
		const node = dom(`<div><p data-attr="toto[field|to:-]aa">astuffb</p></div>`);
		const copy = matchdom(node, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<div><p>totowordaa</p></div>');
	});
});

