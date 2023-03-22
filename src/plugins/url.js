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
}

export const types = {
	url(ctx, str) {
		if (str == null) return str;
		return new RelativeURL(str);
	}
};

export const formats = {
	url: {
		query(ctx, url) {
			const copy = new RelativeURL(url);
			copy.pathname = '';
		}
	}
};

export const filters = {
	// sometimes we get an object and we want a query out of it
	// sometimes we get a url and we want to change something in it, like remove some variables, or add some variables, or allow only some variables
	// sometimes we get
	query: ['url', '*', (ctx, url, ...pairs) => {

	}]
};
