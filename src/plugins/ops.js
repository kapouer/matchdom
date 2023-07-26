export const filters = {
	switch(x, val, ...list) {
		const pos = list.findIndex((str, i) => {
			return i % 2 == 0 && (!str && !val || str == val);
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
	if: ['?', 'filter', '?*', (ctx, val, ...filter) => {
		if (ctx.filter(val, filter)) return val;
		else return null;
	}],
	eq(x, val, str) {
		return val == str;
	},
	neq(x, val, str) {
		return val != str;
	},
	in: ['any', 'any*', (x, val, ...list) => {
		return list.includes(val);
	}],
	gt: ['num', 'num', (x, a, b) => {
		return a > b;
	}],
	gte: ['num', 'num', (x, a, b) => {
		return a >= b;
	}],
	lt: ['num', 'num', (x, a, b) => {
		return a < b;
	}],
	lte: ['num', 'num', (x, a, b) => {
		return a <= b;
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
	quot: ['num', 'num', (x, a, b) => {
		return Math.trunc(a / b);
	}],
	mod: ['num', 'num', (x, a, b) => {
		return a % b;
	}],
	pow: ['num', 'num', (x, a, b) => {
		return a ** b;
	}]
};
