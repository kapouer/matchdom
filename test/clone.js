import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
	Matchdom, TextPlugin
} from 'matchdom';

const md = new Matchdom(TextPlugin);

describe('clone format', () => {
	it('should not mutate picked object', () => {
		const obj = { obj: { a: 2, b: 1 } };
		const copy = md.merge(`[obj|as:clone|only:a]`, obj);
		assert.deepEqual(copy, { a: 2 });
		assert.deepEqual(obj.obj.b, 1);
	});

	it('should not mutate picked map', () => {
		const obj = new Map();
		obj.set('a', 2);
		obj.set('b', 1);
		const copy = md.merge(`[as:clone|only:a]`, obj);
		assert.ok(copy instanceof Map);
		assert.equal(copy.get('a'), 2);
		assert.equal(obj.get('b'), 1);
	});

	it('should not mutate picked URLSearchParams', () => {
		const obj = new URLSearchParams("a=2&b=1");
		const copy = md.merge(`[as:clone|only:a]`, obj);
		assert.ok(copy instanceof URLSearchParams);
		assert.equal(copy.toString(), "a=2");
		assert.equal(obj.toString(), "a=2&b=1");
	});
});

