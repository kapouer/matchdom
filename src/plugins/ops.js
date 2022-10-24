export const filters = {
	eq(x, val, str) {
		if (val == str) return val;
		else return null;
	},
	neq(x, val, str) {
		if (val != str) return val;
		else return null;
	},
	switch(x, val, ...list) {
		const pos = list.findIndex((str, i) => {
			return i % 2 == 0 && str == val;
		});
		const len = list.length;
		if (pos >= 0) {
			if (pos + 1 == len) return null;
			else return list[pos + 1];
		} else if (len % 2 == 1 && list[len - 1] === "") {
			return null;
		} else {
			return val;
		}
	},
	has: ['array', (x, val, str) => {
		if (val == null) return val;
		if (val.includes(str)) return str;
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
