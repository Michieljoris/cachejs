var lru_cache = require('./cachejs').lru;
// Sync cache - 100 items, expire after 5 seconds
var cache = lru_cache(100,5);
newTest(cache);

function newTest(lruCache) {
	lruCache.put('a', 'aa');
	lruCache.put('b', 'ab');
	lruCache.put('c', 'ac');
	lruCache.put('d', 'ad');
	assert(lruCache.get('a'),'aa');
	assert(lruCache.get('b'),'ab');
	assert(lruCache.get('c'),'ac');
	assert(lruCache.get('d'),'ad');

	setTimeout(function() {
			lruCache.put('a','aa'); // This fails
			lruCache.put('b', 'ab');
			lruCache.put('c', 'ac');
			lruCache.put('d', 'ad');
			assert(lruCache.get('a'),'aa');
			assert(lruCache.get('b'),'ab');
			assert(lruCache.get('c'),'ac');
			assert(lruCache.get('d'),'ad');
		}, 6000);
}

function assert(expected, actual) {
    if (actual.toString() != expected.toString())  {
        console.log('Failed test  Expecting: ' + expected + ' but receiving: ' + actual);
    }
}

