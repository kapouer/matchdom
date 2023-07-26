import { strict as assert } from 'node:assert';
import {
	Matchdom, OpsPlugin
} from 'matchdom';

const md = new Matchdom(OpsPlugin);

describe('eq', () => {
	it('should keep equal value', () => {
		const html = `[val|eq:ceci]`;
		const copy = md.merge(html, { val: 'ceci' });
		assert.equal(copy, true);
	});
	it('should return null', () => {
		const html = `[val|eq:cela]`;
		const copy = md.merge(html, { val: 'ceci' });
		assert.equal(copy, false);
	});
});

describe('neq', () => {
	it('should keep value', () => {
		const html = `[val|neq:ceci]`;
		const copy = md.merge(html, { val: 'cecia' });
		assert.equal(copy, true);
	});
	it('should return null', () => {
		const html = `[val|neq:cela]`;
		const copy = md.merge(html, { val: 'cela' });
		assert.equal(copy, false);
	});
});

describe('gt', () => {
	it('should parse float, compare, and return boolean true', () => {
		const html = `[val|gt:0.5]`;
		const copy = md.merge(html, { val: 0.6 });
		assert.equal(copy, true);
	});
	it('should fail to parse float and return value', () => {
		const html = `[val|gt:0.5]`;
		const copy = md.merge(html, { val: 'xx' });
		assert.equal(copy, false);
	});
});

describe('switch', () => {
	it('should change value', () => {
		const html = `[val|switch:ceci:cela]`;
		const copy = md.merge(html, { val: 'ceci' });
		assert.equal(copy, 'cela');
	});
	it('should not change value and pass-through', () => {
		const html = `[val|switch:ceci:cela]`;
		const copy = md.merge(html, { val: 'it' });
		assert.equal(copy, 'it');
	});
	it('should not change value and return null', () => {
		const html = `[val|switch:ceci:cela:]`;
		const copy = md.merge(html, { val: 'it' });
		assert.equal(copy, null);
	});
	it('should match null key', () => {
		const html = `[query.test|switch:ceci:cela::quoi]`;
		const copy = md.merge(html, {
			query: {
				test: null
			}
		});
		assert.equal(copy, 'quoi');
	});
	it('should match optional chaining', () => {
		const html = `[query?.test|switch:ceci:cela::quoi]`;
		const copy = md.merge(html, {});
		assert.equal(copy, 'quoi');
	});
});

describe('if', () => {
	it('should return value if true', () => {
		const html = `[val|if:eq:ceci]`;
		const copy = md.merge(html, { val: 'ceci' });
		assert.equal(copy, 'ceci');
	});
	it('should return null if false', () => {
		const html = `[val|if:eq:ceci]`;
		const copy = md.merge(html, { val: 'cela' });
		assert.equal(copy, null);
	});
});

describe('in', () => {
	it('should return str', () => {
		const html = `[val|in:a:b:c]`;
		const copy = md.merge(html, { val: 'a' });
		assert.equal(copy, true);
	});

	it('should return null', () => {
		const html = `[val|in:a:b:c]`;
		const copy = md.merge(html, { val: 'd' });
		assert.equal(copy, false);
	});

	it('should return empty', () => {
		const html = `[val|in:]`;
		const copy = md.merge(html, { val: '' });
		assert.equal(copy, true);
	});

	it('should return null too', () => {
		const html = `[val|in:a:b:c]`;
		const copy = md.merge(html, { val: null });
		assert.equal(copy, false);
	});
});

describe('add filter', () => {
	it('should add a numeric value', () => {
		const copy = md.merge(`[x|add:3.14]`, { x: '3.14' });
		assert.deepEqual(copy, 6.28);
	});
	it('should not add NaN', () => {
		const copy = md.merge(`[x|add:xyz]`, { x: '3.14' });
		assert.deepEqual(copy, 3.14);
	});
});

describe('mod filter', () => {
	it('should mod integer', () => {
		const copy = md.merge(`[x|mod:3]`, { x: 4 });
		assert.deepEqual(copy, 1);
	});
	it('should mod cast integer', () => {
		const copy = md.merge(`[q?.x|mod:3]`, { });
		assert.deepEqual(copy, 0);
	});
	it('should not mod', () => {
		const copy = md.merge(`[q.x|mod:3]`, { });
		assert.deepEqual(copy, '[q.x|mod:3]');
	});
});
