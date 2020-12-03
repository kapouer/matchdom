import Matchdom from './matchdom.js';
import Symbols from './symbols.js';

function matchdom(parent, data, filters, scope) {
	const inst = new Matchdom({filters});
	return inst.merge(parent, data, scope);
}

export { Matchdom, Symbols };

export default matchdom;

