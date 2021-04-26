export const filters = {
	digits: ['num', 'num?0', (x, digits) => {
		return nbfmt(x, {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits
		});
	}],
	currency: ['num', 'str', (x, currency) => {
		return nbfmt(x, {
			style: 'currency',
			currency
		});
	}],
	percent: ['num', 'num?0', (x, digits) => {
		return nbfmt(x, {
			style: 'percent',
			minimumFractionDigits: digits,
			maximumFractionDigits: digits
		});
	}]
};

function nbfmt(x, opts) {
	return x.toLocaleString(
		document.documentElement.lang || window.navigator.language(),
		opts
	);
}
