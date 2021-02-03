export const filters = {
	then: ['?', 'filter', '?*', (ctx, val, name, ...params) => {
		return val ? ctx.run(name, val, ...params) : val;
	}],
	and: ['?', '?', (ctx, val, str) => {
		return val ? str : val;
	}],
	else: ['?', 'filter', '?*', (ctx, val, name, ...params) => {
		return val ? val : ctx.run(name, val, ...params);
	}],
	or: ['?', '?', (ctx, val, str) => {
		return val ? val : str;
	}]
};
