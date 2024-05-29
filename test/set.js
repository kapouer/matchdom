import { strict as assert } from 'node:assert';
import {
	Matchdom, ArrayPlugin
} from 'matchdom';

describe('set filter', () => {

	describe('set with object', () => {
		it('should set a value', () => {
			const md = new Matchdom();
			const copy = md.merge(`[obj|set:a:1]`, { obj: { test: 2 } });
			assert.deepEqual(copy, {test:2, a:'1'});
		});
		it('should put a value and promote to array', () => {
			const md = new Matchdom();
			const copy = md.merge(`[obj|set:+a:2]`, { obj: { a: 1, test: 2 } });
			assert.deepEqual(copy, { a: [1, '2'], test: 2 });
		});
	});

	describe('set with array', () => {
		it('should set a value', () => {
			const md = new Matchdom();
			const copy = md.merge(`[obj|set:a:1]`, { obj: { a: ["b"] } });
			assert.deepEqual(copy, { a: '1' });
		});
		it('should delete a value from a list', () => {
			const md = new Matchdom();
			const copy = md.merge(`[obj|set:-a:b]`, { obj: { a: ["b", "c"] } });
			assert.deepEqual(copy, { a: ["c"] });
		});
		it('should put a value', () => {
			const md = new Matchdom();
			const copy = md.merge(`[obj|set:+a:c]`, { obj: { a: ["b"] } });
			assert.deepEqual(copy, { a: ["b", "c"] });
		});
	});

	describe('set with map', () => {
		it('should assign keys', () => {
			const md = new Matchdom(ArrayPlugin);
			const obj = {
				list: [{
					a: { b: 7, c: 3 }
				}, {
					a: { b: 4, c: 9 }
				}]
			};
			const copy = md.merge(`[list|map:assign:c:.a.b:d:.a.c]`, structuredClone(obj));
			Object.assign(obj.list[0], { c: 7, d: 3 });
			Object.assign(obj.list[1], { c: 4, d: 9 });
			assert.deepEqual(copy, obj.list);
		});
	});

	describe('set with set', () => {
		it('should overwrite value', () => {
			const md = new Matchdom();
			const copy = md.merge(`[set:obj:b]`, { obj: new Set("a") } );
			assert.deepEqual(copy, { obj: "b" });
		});
		it('should remove a value from a list', () => {
			const md = new Matchdom();
			const copy = md.merge(`[set:-obj:a]`, { obj: new Set(["a", "b"]) });
			assert.deepEqual(copy, { obj: new Set(["b"]) });
		});
		it('should put a value', () => {
			const md = new Matchdom();
			const copy = md.merge(`[set:+obj:c]`, { obj: new Set("b") });
			assert.deepEqual(copy, { obj: new Set(["b", "c"]) });
		});
	});
});

