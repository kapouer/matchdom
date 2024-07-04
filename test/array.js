import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, OpsPlugin, StringPlugin, TextPlugin,
	ArrayPlugin, DomPlugin, DatePlugin, RepeatPlugin
} from 'matchdom';

describe('array', () => {

	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	describe('join filter', () => {
		const md = new Matchdom(ArrayPlugin, DomPlugin);
		it('with space', () => {
			const html = `[arr|join: ]`;
			const copy = md.merge(html, {
				arr: ['word1', 'word2']
			});
			assert.equal(copy, 'word1 word2');
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
		const md = new Matchdom(ArrayPlugin, DomPlugin, StringPlugin);
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
			const html = `<p>[text|split:%0A|filter::neq:word2|join:X]</p>`;
			const copy = md.extend(OpsPlugin).merge(html, {
				text: 'word1\nword2\nword3'
			});
			assert.equal(copy.outerHTML, '<p>word1Xword3</p>');
		});
		it('with array first or last', () => {
			const copy = md.extend(OpsPlugin).merge(`[text|split:-|.first]`, {
				text: 'fr-an'
			});
			assert.equal(copy, 'fr');
		});
	});

	describe('filter and find', () => {
		const md = new Matchdom(DomPlugin, ArrayPlugin, StringPlugin, OpsPlugin);

		it('should filter by boolean', () => {
			const html = `<p>[arr|filter::as:bool|join:-]</p>`;
			const copy = md.merge(html, {
				arr: [0, 1, 2, new Date('a')]
			});
			assert.equal(copy.outerHTML, '<p>1-2</p>');
		});

		it('should filter strings', () => {
			const html = `<p>[arr|filter::is:string|join:-]</p>`;
			const copy = md.merge(html, {
				arr: [0, "a", 1, "b", 2, new Date('a')]
			});
			assert.equal(copy.outerHTML, '<p>a-b</p>');
		});

		it('should find one item', () => {
			const html = `<p>[arr|find:id:eq:a|.name]</p>`;
			const copy = md.merge(html, {
				arr: [
					{ id: 'b', name: 'best' },
					{ id: 'a', name: 'toto' },
					{ id: 'cc', name: 'aaa' }
				]
			});
			assert.equal(copy.outerHTML, '<p>toto</p>');
		});

		it('should find value with shorthand', () => {
			const html = `[arr|find:b]`;
			const copy = md.merge(html, {
				arr: ['a', 'b', 'c']
			});
			assert.equal(copy, 'b');
		});

		it('should find value with shorthand and not confuse it with a path', () => {
			const html = `[arr|find:b.a]`;
			const copy = md.merge(html, {
				arr: ['a', 'b.a', 'c']
			});
			assert.equal(copy, 'b.a');
		});

		it('should not find value with shorthand', () => {
			const html = `[arr|find:d]`;
			const copy = md.extend(TextPlugin).merge(html, {
				arr: ['a', 'b', 'c']
			});
			assert.equal(copy, null);
		});

		it('should filter by inner data check', () => {
			const html = `<p>[arr|filter:value:as:bool|map:get:.title|join:-]</p>`;
			const copy = md.merge(html, {
				arr: [{
					title: 'zero', value: 0
				}, {
					title: 'one', value: 1
				}, {
					title: 'two',
					value: 2
				}, {
					title: 'date',
					value: new Date('a')
				}]
			});
			assert.equal(copy.outerHTML, '<p>one-two</p>');
		});
	});

	describe('group filter', () => {
		const md = new Matchdom(DomPlugin, ArrayPlugin, StringPlugin, OpsPlugin, RepeatPlugin);

		it('should group by value', () => {
			const html = `<p>[arr|group:|at:-|repeat:|join:-] </p>`;
			const copy = md.merge(html, {
				arr: [0, 3, 0, 1, 2, 1, 2, 3]
			});
			assert.equal(copy.outerHTML, '<p>0-0 3-3 1-1 2-2 </p>');
		});

		it('should group by inner value with operation', () => {
			const html = `<p><i>[arr|group:val:mod:3|repeat:|map:get:.const|join:-]</i></p>`;
			const copy = md.merge(html, {
				arr: [{
					const: 'a',
					val: 3
				}, {
					const: 'b',
					val: 6
				}, {
					const: 'c',
					val: 5
				}]
			});
			assert.equal(copy.outerHTML, '<p><i>a-b</i><i>c</i></p>');
		});
	});

	describe('flat filter', () => {
		const md = new Matchdom(DomPlugin, ArrayPlugin, StringPlugin);

		it('should flatten at given depth', () => {
			const obj = {
				arr: [0, 1, [2, [3, [4, 5]]]]
			};
			assert.deepEqual(
				md.merge(`[arr|flat:1]`, obj),
				[0, 1, 2, [3, [4, 5]]]
			);
			assert.deepEqual(
				md.merge(`[arr|flat:2]`, obj),
				[0, 1, 2, 3, [4, 5]]
			);
		});

		it('should flatten at depth Infinity when empty depth', () => {
			const obj = {
				arr: [0, 1, [2, [3, [4, 5]]]]
			};
			assert.deepEqual(
				md.merge(`[arr|flat:]`, obj),
				[0, 1, 2, 3, 4, 5]
			);
		});

		it('should select an absolute path and flatten', () => {
			const obj = {
				arr: [
					{ a: { b: [{ id: 'word1' }, { id: 'word2' }] } },
					{ a: { b: [{ id: 'word3' }, { id: 'word4' }] } }
				]
			};
			assert.deepEqual(
				md.merge(`[arr|select:a.b|flat:1]`, obj),
				[{ id: 'word1' }, { id: 'word2' }, { id: 'word3' }, { id: 'word4' }]
			);
		});
	});

	describe('select filter', () => {
		const md = new Matchdom(DomPlugin, ArrayPlugin, StringPlugin);

		it('should select one path and return array of values', () => {
			const obj = {
				arr: [{ a: { b: 'word1' } }, { a: { b: 'word2' } }]
			};
			assert.equal(
				md.merge(`<p>[arr|select:.a.b|join:,]</p>`, obj).outerHTML,
				'<p>word1,word2</p>'
			);
			assert.equal(
				md.merge(`<p>[arr|select:a.b|join:,]</p>`, obj).outerHTML,
				'<p>word1,word2</p>'
			);
		});

		it('should select multiple paths and return array of objects', () => {
			const obj = {
				arr: [{ c: 8, a: { b: 'word1' } }, { c: 9, a: { b: 'word2' } }]
			};
			assert.deepEqual(
				md.merge(`[arr|select:w:.a.b:n:.c]`, obj),
				[{ w: 'word1', n: 8 }, { w: 'word2', n: 9 }]
			);
			assert.deepEqual(
				md.merge(`[arr|select:w:a.b:n:c]`, obj),
				[{ w: 'word1', n: 8 }, { w: 'word2', n: 9 }]
			);
		});
	});

	describe('slice filter', () => {
		const md = new Matchdom(DomPlugin, ArrayPlugin, StringPlugin);

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

	describe('sort filter', () => {
		const md = new Matchdom(ArrayPlugin, DomPlugin, RepeatPlugin);

		it('should sort array with nulls last', () => {
			const html = `<p>[arr|sort:|join: ]</p>`;
			const copy = md.merge(html, {
				arr: ['word2', 'word1', null, 'word3']
			});
			assert.equal(copy.outerHTML, '<p>word1 word2 word3 </p>');
		});

		it('should sort set with nulls last', () => {
			const html = `<p>[set|sort:|join: ]</p>`;
			const copy = md.merge(html, {
				set: new Set(['word2', 'word1', null, 'word3'])
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
			const copy = md.merge(html, {
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
			const html = `<p>[sort::true|filter::as:bool|map:date:iso|join:%0A|as:text] </p>`;
			const copy = md.extend(DatePlugin).merge(html, [
				new Date("2021-02-28T15:12"),
				new Date("2021-02-26T14:12"),
				new Date("invalid"),
			]);
			assert.equal(copy.outerHTML, '<p>2021-02-26T13:12:00Z<br>2021-02-28T14:12:00Z </p>');
		});
	});

	describe('has', () => {
		const md = new Matchdom(DomPlugin, ArrayPlugin);

		it('should return str', () => {
			const html = `[arr|has:test]`;
			const copy = md.merge(html, { arr: ['a', 'test'] });
			assert.equal(copy, true);
		});

		it('should return null', () => {
			const html = `[arr|has:test]`;
			const copy = md.merge(html, { arr: ['a', 'tesst'] });
			assert.equal(copy, false);
		});

		it('should return empty', () => {
			const html = `[arr|has:]`;
			const copy = md.merge(html, { arr: ['a', ''] });
			assert.equal(copy, true);
		});

		it('should return null too', () => {
			const html = `[arr|has:test]`;
			const copy = md.merge(html, { arr: null });
			assert.equal(copy, false);
		});
	});
});
