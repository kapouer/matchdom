import { strict as assert } from 'node:assert';
import {
	Matchdom
} from 'matchdom';

describe('set filter', () => {

	describe('set with object', () => {
		it('should set a value', () => {
			const md = new Matchdom();
			const copy = md.merge(`[obj|set:a:1]`, { obj: { test: 2 } });
			assert.deepEqual(copy, {test:2, a:'1'});
		});
		it('should delete a key', () => {
			const md = new Matchdom();
			const copy = md.merge(`[obj|set:-a]`, { obj: { a: 1, test: 2 } });
			assert.deepEqual(copy, { test: 2 });
		});
		it('should put a value', () => {
			const md = new Matchdom();
			const copy = md.merge(`[obj|set:+a:2]`, { obj: { a: [1], test: 2 } });
			assert.deepEqual(copy, { a: [1, '2'], test: 2 });
		});
		it('should put a value and promote to array', () => {
			const md = new Matchdom();
			const copy = md.merge(`[obj|set:+a:2]`, { obj: { a: 1, test: 2 } });
			assert.deepEqual(copy, { a: [1, '2'], test: 2 });
		});
	});
});

