export const filters = {
	then: ['bool?', 'filter', '?*', (ctx, val, name, ...params) => {
		return val ? ctx.run(name, ctx.raw, ...params) : ctx.raw;
	}],
	and: ['bool?', '?', (ctx, val, str) => {
		return val ? str : ctx.raw;
	}],
	else: ['bool?', 'filter', '?*', (ctx, val, name, ...params) => {
		return !val ? ctx.run(name, ctx.raw, ...params) : ctx.raw;
	}],
	or: ['bool?', '?', (ctx, val, str) => {
		return !val ? str : ctx.raw;
	}]
};
