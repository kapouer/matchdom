import { strict as assert } from 'node:assert';
import { Matchdom, DomPlugin, ArrayPlugin } from 'matchdom';

describe('string', () => {
	const md = new Matchdom().extend(DomPlugin, ArrayPlugin);

	it('should be merged and returned', () => {
		const copy = md.merge('no? [test]!', {
			test: "yes"
		});
		assert.equal(copy, 'no? yes!');
	});

	it('should be merged as text', () => {
		const copy = md.merge('no?\n [test]!', {
			test: "yes\nnl"
		});
		assert.equal(copy, 'no?\n yes\nnl!');
	});

	it('should return null', () => {
		const copy = md.merge('[test]', {
			test: null
		});
		assert.equal(copy, null);
	});

	it('should not change when nested variable has no parent set', () => {
		const copy = md.merge('notfound: [test.a]', {});
		assert.equal(copy, 'notfound: [test.a]');
	});

	it('should not change when top variable is not \\w\\S*', () => {
		const copy = md.merge('notfound: [\\w]', {test:1});
		assert.equal(copy, 'notfound: [\\w]');
	});

	it('should not return null', () => {
		const copy = md.merge('[test]a', {
			test: null
		});
		assert.equal(copy, 'a');
	});

	it('should repeat array', () => {
		const copy = md.merge("--[arr|repeat:|value]--", {
			arr: [{value: 'one'}, {value: 'two'}]
		});
		assert.equal(copy, "--one----two--");
	});

	it('should repeat object', () => {
		const copy = md.extend(ArrayPlugin).merge("key:[obj|as:keys|repeat:] ", {
			obj: {a: 1, b: 2}
		});
		assert.equal(copy, "key:a key:b ");
	});

	it('should repeat object keys', () => {
		const copy = md.merge("[obj|as:entries|repeat:|key]=[value]&", {
			obj: {a: 1, b: 2}
		});
		assert.equal(copy, "a=1&b=2&");
	});

	it('should repeat array using whole string', () => {
		const copy = md.merge("--[arr|repeat:|value]--", {
			arr: [{value: 'one'}, {value: 'two'}]
		});
		assert.equal(copy, "--one----two--");
	});

	it('should repeat array inside string', () => {
		const copy = md.merge("-X[arr|at:-|repeat:|value]YY-", {
			arr: [{value: 'one'}, {value: 'two'}]
		});
		assert.equal(copy, "-XonetwoYY-");
	});

	it('should return array', () => {
		const arr = ['one', 'two'];
		const copy = md.merge("[arr]", {arr});
		assert.deepEqual(copy, arr);
	});
});

