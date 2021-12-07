export const filters = {
	not: ['bool?', 'filter', '?*', (ctx, val, ...filter) => {
		return ctx.run(!val, filter);
	}],
	then: ['bool?', 'filter', '?*', (ctx, val, ...filter) => {
		return val ? ctx.run(ctx.raw, filter) : ctx.raw;
	}],
	and: ['bool?', '?', (ctx, val, str) => {
		return val ? str : ctx.raw;
	}],
	else: ['bool?', 'filter', '?*', (ctx, val, ...filter) => {
		return !val ? ctx.run(ctx.raw, filter) : ctx.raw;
	}],
	or: ['bool?', '?', (ctx, val, str) => {
		return !val ? str : ctx.raw;
	}]
};
