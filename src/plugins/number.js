export const filters = {
	digits: ['num', 'num?0', 'num?0', (ctx, x, min, max) => {
		if (max < min) max = min;
		return x.toLocaleString(ctx.locales, {
			minimumFractionDigits: min,
			maximumFractionDigits: max
		});
	}],
	currency: ['num', 'str', 'num?0', 'num?0', (ctx, x, currency, min, max) => {
		if (max < min) max = min;
		return x.toLocaleString(ctx.locales, {
			minimumFractionDigits: min,
			maximumFractionDigits: max,
			style: 'currency',
			currency
		});
	}],
	percent: ['num', 'num?0', (ctx, x, min, max) => {
		if (max < min) max = min;
		return x.toLocaleString(ctx.locales, {
			style: 'percent',
			minimumFractionDigits: min,
			maximumFractionDigits: max
		});
	}]
};
