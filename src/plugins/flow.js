export const filters = {
	not: ['bool?', 'filter', '?*', (ctx, val, ...filter) => {
		return ctx.filter(!val, filter);
	}],
	then: ['bool?', 'filter', '?*', (ctx, val, ...filter) => {
		return val ? ctx.filter(ctx.raw, filter) : ctx.raw;
	}],
	and: ['bool?', '?', (ctx, val, str) => {
		return val ? str : ctx.raw;
	}],
	else: ['bool?', 'filter', '?*', (ctx, val, ...filter) => {
		return !val ? ctx.filter(ctx.raw, filter) : ctx.raw;
	}],
	or: ['bool?', '?', (ctx, val, str) => {
		return !val ? str : ctx.raw;
	}],
	'?': ['bool?', '?', '?', (ctx, val, yes, no) => {
		return val ? yes : no;
	}]
};
