export const types = {
	json(ctx, val) {
		if (typeof val != "string") return null;
		try {
			val = JSON.parse(val);
		} catch (ex) {
			return null;
		}
		return val;
	}
};
