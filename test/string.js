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
});

