export const filters = {
	// FIXME "?" semantics with boolean, "", 0
	// FIXME val is mapped to bool but we want to return the uncasted val
	// e.g. [toto|or:tata] currently gives 'true'
	then: ['bool?', 'filter', '?*', (ctx, val, name, ...params) => {
		return val ? ctx.run(name, val, ...params) : val;
	}],
	and: ['bool?', '?', (ctx, val, str) => {
		return val ? str : val;
	}],
	else: ['bool?', 'filter', '?*', (ctx, val, name, ...params) => {
		return !val ? ctx.run(name, val, ...params) : val;
	}],
	or: ['bool?', '?', (ctx, val, str) => {
		return !val ? str : val;
	}]
};
