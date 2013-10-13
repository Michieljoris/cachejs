Cachejs
__________

Implementation of both LRU and ARC cache.

Require either arc_cache or lru_cache. Their api is the same for
standard use.

    var cache = require('path/to/arc_cache')();
	
or 	
	
    var cache = require('path/to/lru_cache')();

Before retrieving a value from disk or from a server or calculating it:

	var key = 'mykey'; //or an url or UUID or any other string.
    var success = cache(key, function(value) {
	   //process value, eg sending it to a client
    });
	
	//then:
	if (!success) retrieve(key, function(value) {
		cache(key, value);
    });
	
	//or:
	if (!success) { cache(key, calculateValue(key)); }

Any following requests for the same value will immediately result in
the callback being called. If it takes a while to create the value,
and there are requests coming in for the same value 'cache' will only
return false for the first request. For any subsequent requests the
callback is stored till 'cache' is called with the key and value. All
callbacks are then called.

If creating a value takes a while or there are a lot of requests
coming in the callbacks will keep piling up. To prevent that either
make sure to always call cache with the value at some point, even if
you have to set a timeout. Call cache with a value that might indicate
an error condition and deal with it in the callback. 

* TODO: add a function cache.cancel(key) that triggers the callbacks but
with undefined value and an err param.
* TODO prevent cache(key, value) to have any effect unless there are
callbacks waiting for it, so you can cancel a key, deal with the error
in the callbacks and not worry about a possible timedout async
retrieve function by mistake still call cache(key, value)
* TODO make sure cache doesn't blow up size wise.
