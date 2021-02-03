export const filters = {
	eq(x, val, str) {
		if (val == null || val == str) return val;
		else return null;
	},
	neq(x, val, str) {
		if (val == null || val != str) return val;
		else return null;
	},
	has: ['array', (x, val, str) => {
		if (val == null) return val;
		if (val.includes(str)) return val;
		else return null;
	}],
	in: ['?', 'any*', (x, val, ...list) => {
		if (list.includes(val)) return val;
		else return null;
	}],
	gt: ['num', 'num', (x, a, b) => {
		if (a > b) return a;
		else return null;
	}],
	gte: ['num', 'num', (x, a, b) => {
		if (a >= b) return a;
		else return null;
	}],
	lt: ['num', 'num', (x, a, b) => {
		if (a < b) return a;
		else return null;
	}],
	lte: ['num', 'num', (x, a, b) => {
		if (a <= b) return a;
		else return null;
	}],
	add: ['num', 'num', (x, a, b) => {
		return a + b;
	}],
	sub: ['num', 'num', (x, a, b) => {
		return a - b;
	}],
	mul: ['num', 'num', (x, a, b) => {
		return a * b;
	}],
	div: ['num', 'num', (x, a, b) => {
		return a / b;
	}],
	mod: ['num', 'num', (x, a, b) => {
		return a % b;
	}],
	pow: ['num', 'num', (x, a, b) => {
		return a ** b;
	}]
};
