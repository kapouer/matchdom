// IE/Edge/OldSafari polyfill
if (typeof window !== "undefined") ['previous', 'next'].forEach(function (name) {
	const keyEl = name + 'ElementSibling';
	const key = name + 'Sibling';
	[Element, CharacterData].forEach(function (item) {
		const proto = item.prototype;
		if (Object.prototype.hasOwnProperty.call(proto, keyEl)) return;
		Object.defineProperty(proto, keyEl, {
			configurable: true,
			enumerable: true,
			get: function () {
				let el = this;
				while ((el = el[key])) {
					if (el.nodeType === 1) return el;
				}
				return null;
			},
			set: undefined
		});
	});
});
