const assert = require('assert');
const matchdom = require('../matchdom');

describe('string', function() {
	it('should be merged and returned', function() {
		let copy = matchdom('no? [test]!', {
			test: "yes"
		});
		assert.equal(copy, 'no? yes!');
	});

	it('should be merged as text', function() {
		let copy = matchdom('no?\n [test]!', {
			test: "yes\nnl"
		});
		assert.equal(copy, 'no?\n yes\nnl!');
	});

	it('should return null', function() {
		let copy = matchdom('[test]', {
			test: null
		});
		assert.equal(copy, null);
	});

	it('should not change when nested variable has no parent set', function() {
		let copy = matchdom('notfound: [test.a]', {});
		assert.equal(copy, 'notfound: [test.a]');
	});

	it('should not change when top variable is not \\w\\S*', function() {
		let copy = matchdom('notfound: [\\w]', {test:1});
		assert.equal(copy, 'notfound: [\\w]');
	});

	it('should not return null', function() {
		let copy = matchdom('[test]a', {
			test: null
		});
		assert.equal(copy, 'a');
	});

	it('should repeat array', function() {
		let copy = matchdom("--[arr.value|repeat:*]--", {
			arr: [{value: 'one'}, {value: 'two'}]
		});
		assert.equal(copy, "--onetwo--");
	});

	it('should repeat object', function() {
		let copy = matchdom("keys: [obj+.key|repeat:*+] ", {
			obj: {a: 1, b: 2}
		});
		assert.equal(copy, "keys: a b ");
	});

	it('should repeat object keys', function() {
		let copy = matchdom("[obj+.key|repeat]=[obj.val]&", {
			obj: {a: 1, b: 2}
		});
		assert.equal(copy, "a=1&b=2&");
	});

	it('should repeat array using whole string', function() {
		let copy = matchdom("--[arr.value|repeat]--", {
			arr: [{value: 'one'}, {value: 'two'}]
		});
		assert.equal(copy, "--one----two--");
	});

	it('should repeat array using chars around', function() {
		let copy = matchdom("-X[arr.value|repeat:+*++]YY-", {
			arr: [{value: 'one'}, {value: 'two'}]
		});
		assert.equal(copy, "-XoneYYXtwoYY-");
	});

	it('should ignore magnet', function() {
		let copy = matchdom("[$query.event-id|magnet:form]", {
			
		});
		assert.equal(copy, null);
	});
});

