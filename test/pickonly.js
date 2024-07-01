import { strict as assert } from 'node:assert';
import {
	Matchdom, TextPlugin
} from 'matchdom';

const md = new Matchdom(TextPlugin);

describe('only filter', () => {
	it('should keep a key', () => {
		const obj = { obj: { a: 2, b: 1 } };
		const copy = md.merge(`[obj|only:a]`, obj);
		assert.deepEqual(copy, { a: 2 });
	});

	it('should mutate object', () => {
		const obj = { obj: { a: 2, b: 1 } };
		const copy = md.merge(`[obj|only:a]`, obj);
		assert.deepEqual(copy, { a: 2 });
		assert.deepEqual(copy, obj.obj);
	});

	it('should keep multiple keys', () => {
		const copy = md.merge(`[obj|only:a:c]`, { obj: { a: 2, b: 1, c:5 } });
		assert.deepEqual(copy, { a: 2, c:5 });
	});

	it('should keep empty string key', () => {
		const copy = md.merge(`[obj|only:]`, { obj: { a: 2, b: 1, "": 12 } });
		assert.deepEqual(copy, { "": 12});
	});

	it('should not fail on missing key', () => {
		const copy = md.merge(`[obj|only:a:b]`, { obj: { b: 1 } });
		assert.deepEqual(copy, { b: 1 });
	});

	it('should skip non-object', () => {
		const copy = md.merge(`[obj|only:a]`, { obj: 'toto' });
		assert.deepEqual(copy, '[obj|only:a]');
	});

	it('should skip array', () => {
		const copy = md.merge(`[obj|only:a]`, { obj: ['toto'] });
		assert.deepEqual(copy, '[obj|only:a]');
	});

	it('should work with searchParams', () => {
		const copy = md.merge(`?[url|.searchParams|only:a:c]`, { url: new URL("https://example.com/test?a=1&b=2&c=3") });
		assert.deepEqual(copy, '?a=1&c=3');
	});
});

describe('pick filter', () => {
	it('should keep a key', () => {
		const obj = { obj: { a: 2, b: 1 } };
		const copy = md.merge(`[obj|pick:a]`, obj);
		assert.deepEqual(copy, { a: 2 });
	});

	it('should not mutate object', () => {
		const obj = { obj: { a: 2, b: 1 } };
		const copy = md.merge(`[obj|pick:a]`, obj);
		assert.deepEqual(copy, { a: 2 });
		assert.deepEqual(obj.obj, { a: 2, b: 1 });
	});

	it('should keep multiple keys', () => {
		const copy = md.merge(`[obj|pick:a:c]`, { obj: { a: 2, b: 1, c: 5 } });
		assert.deepEqual(copy, { a: 2, c: 5 });
	});

	it('should keep empty string key', () => {
		const copy = md.merge(`[obj|pick:]`, { obj: { a: 2, b: 1, "": 12 } });
		assert.deepEqual(copy, { "": 12 });
	});

	it('should not fail on missing key', () => {
		const copy = md.merge(`[obj|pick:a:b]`, { obj: { b: 1 } });
		assert.deepEqual(copy, { b: 1 });
	});

	it('should allow optional fields', () => {
		const copy = md.merge(`[obj|pick:a?]`, { obj: { a: 1, b: 2 } });
		assert.deepEqual(copy, { a: 1 });
	});

	it('should pick paths', () => {
		const copy = md.merge(`[pick:obj.a:obj.b]`, { obj: { a: 1, b: 2 } });
		assert.deepEqual(copy, { a: 1, b: 2 });
	});

	it('should skip non-object', () => {
		const copy = md.merge(`[obj|pick:a]`, { obj: 'toto' });
		assert.deepEqual(copy, '[obj|pick:a]');
	});

	it('should skip array', () => {
		const copy = md.merge(`[obj|pick:a]`, { obj: ['toto'] });
		assert.deepEqual(copy, '[obj|pick:a]');
	});

	it('should work with searchParams', () => {
		const copy = md.merge(`[url|.searchParams|pick:a:c]`, { url: new URL("https://example.com/test?a=1&b=2&c=3") });
		assert.deepEqual(copy, { a: '1', c: '3' });
	});
});
