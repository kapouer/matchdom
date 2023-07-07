import { strict as assert } from 'node:assert';
import {
	Matchdom
} from 'matchdom';

describe('pick filter', () => {
	it('should keep a key', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|pick:a]`, { obj: { a: 2, b: 1 } });
		assert.deepEqual(copy, { a: 2 });
	});

	it('should keep multiple keys', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|pick:a:c]`, { obj: { a: 2, b: 1, c:5 } });
		assert.deepEqual(copy, { a: 2, c:5 });
	});

	it('should keep empty string key', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|pick:]`, { obj: { a: 2, b: 1, "": 12 } });
		assert.deepEqual(copy, { "": 12});
	});

	it('should not fail on missing key', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|pick:a:b]`, { obj: { b: 1 } });
		assert.deepEqual(copy, { b: 1 });
	});

	it('should skip non-object', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|pick:a]`, { obj: 'toto' });
		assert.deepEqual(copy, '[obj|pick:a]');
	});

	it('should skip array', () => {
		const md = new Matchdom();
		const copy = md.merge(`[obj|pick:a]`, { obj: ['toto'] });
		assert.deepEqual(copy, '[obj|pick:a]');
	});
});

