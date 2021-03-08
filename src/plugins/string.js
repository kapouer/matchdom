export const filters = {
	const(x, val, param) {
		return param || "";
	},
	case: ['?', 'up|low|caps', (x, val, how) => {
		if (!val) return val;
		val = val.toString();
		if (how == "up") {
			return val.toUpperCase();
		} else if (how == "low") {
			return val.toLowerCase();
		} else if (how == "caps") {
			return val.split(/\.\s+/).map((s) => {
				return s.replace(/^\p{Letter}/u, (c) => c.toUpperCase());
			}).join('. ');
		}
	}],
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
