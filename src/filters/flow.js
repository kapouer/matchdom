export default {
	then: [null, 'filter', (ctx, val, name, ...params) => {
		if (val == null) return val;
		else return ctx.run(name, params);
	}],
	and(ctx, val, str) {
		if (!val) return val;
		return str;
	},
	else: [null, 'filter', (ctx, val, name, ...params) => {
		if (val == null) return val;
		else return ctx.run(name, params);
	}],
	or(ctx, val, str) {
		if (!val) return str;
		else return val;
	}
};
