class QURLSearchParams extends URLSearchParams {
	toString() {
		const str = super.toString();
		return str.length ? `?${str}` : '';
	}
}

export const types = {
	url(ctx, str) {
		if (str == null) return str;
		// eslint-disable-next-line no-use-before-define
		return new RelativeURL(str);
	},
	query(ctx, obj) {
		if (obj && obj.set && obj.append) return obj;
		const q = new QURLSearchParams(typeof obj == "string" ? obj : undefined);
		if (obj && typeof obj == "object") for (const [key, val] of Object.entries(obj)) {
			if (Array.isArray(val)) {
				for (const item of val) q.append(key, item);
			} else {
				q.set(key, val == null ? '' : val);
			}
		}
		return q;
	}
};

class RelativeURL extends URL {
	static origin = typeof document !== 'undefined' ? document.location : new URL('null://');

	constructor(str) {
		super(str, RelativeURL.origin);
	}
	toString() {
		if (this.host == RelativeURL.origin.host) {
			return this.pathname + this.search + this.hash;
		} else {
			return super.toString();
		}
	}
	get query() {
		return this.searchParams;
	}
	set query(str) {
		if (str == null) str = '';
		if (typeof str == "string") this.search = str;
		else this.search = types.query(null, str).toString();
	}
}
