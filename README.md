Cachejs
__________

Implementation of both LRU and ARC cache.

Require either arc_cache or lru_cache. The latter is backwards
compatible with the former. Actually arch_cache uses lru_cache to
implement its lru caches.

    var lru_cache = require('path/to/arc_cache')(); //or
    var arc_cache = require('path/to/lru_cache')();
	
Or do 

    npm install cachejs
    var lru_cache = require('cachejs').lru() //or
    var arc_cache = require('cachejs').arc()
	
Pass optional length of cache and expire in seconds.	

	//128 items, expire after 10 seconds
    var arc_cache = require('cachejs').arc(128, 10) 

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

Arc algorithm:

Paper:

* http://domino.research.ibm.com/library/cyberdig.nsf/papers/D6FE9A14C67AB32E85256CE500621A9A/$File/rj10284.pdf
  
Wikipedia:

* http://en.wikipedia.org/wiki/Adaptive_Replacement_Cache

Overview with slides:

* http://u.cs.biu.ac.il/~wiseman/2os/2os/os2.pdf

Articles:

* http://dbs.uni-leipzig.de/file/ARC.pdf
* https://www.dropbox.com/sh/9ii9sc7spcgzrth/VcpfMCYyWF/Papers/arcfast.pdf

C implementation:

* https://www.dropbox.com/sh/9ii9sc7spcgzrth/Zf2HHzyXFS/Papers/oneup.pdf
  
Javascript implementation:

* https://gist.github.com/kriskowal/4409155

Python implementation:

* http://code.activestate.com/recipes/576532/

My version is adapted from the javascript and python versions, which
both seem to have been adapted from the original c version.

Intuition:
-------------

The idea is that the cache is split in two. One to hold values for
recent requests, the other for values for requests that seemed to have
been popular (requested more than once)in the recent past, both
ordered by least recently used.

If you only had new, before unseen requests, arc would function as a
ordinary lru cache. That is, just holding on to the last number of
values, hoping one of them would be requested again before having to
discard it. By necessity not much of an improvement.

If however one of the values is requested again before being
discarded, the second cache kicks in. The value gets moved from the
first to the second. It stores now the only value requested twice so
far. The cache as a whole still stores the same (max) amount of
values. But it will discard them in a different order now.

If a once again a before unseen new value now comes in to be stored,
it will have to go into the first cache again. However, to make room
the algorithm has to make a choice about from which cache to expel
the least recently added.

It does this on the basis of a preferred size for the first cache. If
its actual size is over the target size it will expel its lru,
otherwise it will it expel the lru of the second cache. So one way or
the other the total cache will stay the same size.

The clever bit is where these values get expelled to. They don't get
discarded but put in their respective ghost caches. Values are looked
up by some kind of key. In a ghost cache only the key is held on to,
the value itself is discarded. So the algorithm will be able to find
the key still, at least for a while after the value is expelled from
the proper cache, but will not be able to return the value from its
own caches.

But it can use these hits on the ghost caches to make a more informed
decision about which of the two proper caches seems more important. On
every one of these hits it will increase the preferred size of the
cache whose ghost cache was hit. The amount by which this preferred
size gets incremented or decremented depends on the ratio between the
two ghost caches, which of course is also a fluent thing. So this is a
self tuning system. 

The more ghost cache one gets hit, the bigger the preferred size
gets. The bigger the preferred size is, the less likely it is that
values will be expelled from it, instead they will be taken from cache
2 and go into ghost cache 2. Eventually to make room for new values
ghost cache 1 will start to be emptied out. So you will end up with a
full first proper cache and a full second ghost cache.

If from now on only the second ghost cache gets hit, the reverse
happens. The preferred size for cache one will reduce. This means that
when it is expel time (before adding a new value to a proper cache),
cache one will be the one to have its lru value expelled. This will
continue till they are all expelled, ghost cache one is full, and all
value from ghost cache two have been added to proper cache two again. 

The goal is to have an optimum and self adapting preferred size of
cache one, depending on the hit rate of the ghost caches.

It's possible to grasp the algorithm somewhat by mentally following
through the logic using edge cases, such as only new values, or only
repeated values, or only ghost cache hits etc. 

You can see that if any of the caches are hit, the total size of all
caches together doesn't change, but their relative sizes to each other
does change. Also how their relative sizes change is dependent on
which cache gets hit and what their relative sizes are at that moment.

You can see that with a fixed preferred size for proper cache one and
a primed total cache, the system will gradually decrease an oversized
cache one to its preferred size when either of the ghost caches are
hit, and fill up an undersized cache one and decrease cache two when a
new value comes in. So if you dynamically adjust the preferred size
the system will also dynamically change it internal composition.

The only change to the total size of all 4 caches can happen when the
total is less than twice the desired size of the size of cache one and
two together. Once the maximum size is reached it will stay at this
size. However depending on the situation, either ghost cache one,
ghost cache two, or proper cache one will have to give up its lru to
make room for a value that's not in any cache yet.

So the system is persistent. Its internals are in constant flux, but
it will not shrink to nothing, or blow up. And the key to its internal
logic is a dynamic preferred size for proper cache one.

TODO
--------

* write tests that show the dynamic nature
* optimize. 
* use preallocated arrays
* integrate lru and arc cache better
* share lookup array between caches and use flags instead of separate
  hash tables to find values. Trade space for time.
* benchmark  


