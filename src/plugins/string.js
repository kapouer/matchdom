export const filters = {
	const(x, val, param) {
		return param || "";
	},
	lower(x, val) {
		if (!val) return val;
		return val.toString().toLowerCase();
	},
	upper(x, val) {
		if (!val) return val;
		return val.toString().toUpperCase();
	},
	cap(x, val) {
		if (!val) return val;
		const str = val.toString();
		return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
	},
	pre(x, val, str) {
		if (val == null || val === '') return val;
		if (val && str != null) val = str + val;
		return val;
	},
	post(x, val, str) {
		if (val == null || val === '') return val;
		if (val && str != null) val += str;
		return val;
	}
};
