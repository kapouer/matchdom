import { strict as assert } from 'node:assert';
import {
	Matchdom
} from 'matchdom';

describe('omit filter', () => {
	it('should remove a key', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|omit:a]`, { obj: { a: 2, b: 1 } });
		assert.deepEqual(copy, { b: 1 });
	});

	it('should remove a path', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|omit:a.b]`, { obj: { a: { b: 1, c: 2 }, d: 1 } });
		assert.deepEqual(copy, { a: { c: 2 }, d: 1 });
	});

	it('should remove multiple keys', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|omit:a:c]`, { obj: { a: 2, b: 1, c:5 } });
		assert.deepEqual(copy, { b:1 });
	});

	it('should not omit empty string key', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|omit:]`, { obj: { a: 2, "": 12 } });
		assert.deepEqual(copy, { a: 2, "": 12 });
	});

	it('should not fail on missing key', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|omit:a:b]`, { obj: { b: 1, c: 2 } });
		assert.deepEqual(copy, { c: 2 });
	});

	it('should skip non-object', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|omit:a]`, { obj: 'toto' });
		assert.deepEqual(copy, '[obj|omit:a]');
	});

	it('should skip array', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|omit:a]`, { obj: ['toto'] });
		assert.deepEqual(copy, '[obj|omit:a]');
	});

	it('should work with searchParams', () => {
		const md = new Matchdom();
		const copy = md.merge(`?[url|.searchParams|omit:b]`, { url: new URL("https://example.com/test?a=1&b=2&c=3") });
		assert.deepEqual(copy, '?a=1&c=3');
	});
});

