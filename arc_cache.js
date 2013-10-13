/*global module:false require:false*/
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7  maxlen:150 devel:true newcap:false*/ 

// paper:
// http://domino.research.ibm.com/library/cyberdig.nsf/papers/D6FE9A14C67AB32E85256CE500621A9A/$File/rj10284.pdf
// wikipedia:
// http://en.wikipedia.org/wiki/Adaptive_Replacement_Cache
// overview with slides:
// http://u.cs.biu.ac.il/~wiseman/2os/2os/os2.pdf
// articles:
// http://dbs.uni-leipzig.de/file/ARC.pdf
// https://www.dropbox.com/sh/9ii9sc7spcgzrth/VcpfMCYyWF/Papers/arcfast.pdf

// c implementation:
// https://www.dropbox.com/sh/9ii9sc7spcgzrth/Zf2HHzyXFS/Papers/oneup.pdf
// javascript implementation:
// https://gist.github.com/kriskowal/4409155
// python implementation:
// http://code.activestate.com/recipes/576532/
// The following is adapted from the javascript and python versions, which
// both seem to have been adapted from the original c version

var getLruCache = require('./lru_cache');

function getCache(len) {

    //TODO this will store values of indefinite size, there's no checks,
    //so if a value might be dangerously large don't put the cache between
    //it and delivering it

    //TODO if lookup is shared that means that a get will search the whole
    //cache.  a flag needs to be set and checked on every value in which
    //subcache it is. It does replace several hash lookups with space to
    //store the flags.  If space isn't an issue it might be faster.
    //At the moment every cache has its own lookup hash
    // var lookup = {};

    var c, store, emptySlots;
    var t1, b1, t2, b2;
    var p;
    var defaultLen = 10;
    
    function init(len) {
        defaultLen = c = len || defaultLen;
        // store = new Array(2 * c + 4 * 2);
        store = [];
        emptySlots = [];
        //each cache can grow up to size c:
        t1 = getLruCache(c, store, emptySlots);
        b1 = getLruCache(c, store, emptySlots);
        t2 = getLruCache(c, store, emptySlots);
        b2 = getLruCache(c, store, emptySlots);
        p = 0; //0<p<c
    }

    // pop values into the ghost caches depending on whether t1.length > p
    // t1.len < p , pop t2 to b2, reduce length of t2
    // t1.len > p , pop t1 to b1, reduces length of t1
    // this reduces t1 till it's the size of p. After that t2 will be
    // shrunk, and b2 grown from it.
    function replace(key) {
        if (t1.length() &&
            ((b2.has(key) && t1.length() === p) ||
             (t1.length() > p)))
            //move lru of t1 to mru of b1, so reduce the size of t1 by
            //one, t1.len > p so bringing it closer to p, if b2.has(key)
            //even reduce the size of t1 to one less than p
            b1.setMru(t1.cutLru());
        //move lru of t2 to mru of b2, so reduce the size of t2 by
        //one,
        else b2.setMru(t2.cutLru()); //b2++ and t2--
    }

    var requesters = {};

    function get(key, cb) {
        if (t1.has(key)) {
            //we've had this hit exactly once already since it is in
            //t1. Let's remove the value from t1 and put it at the top of
            //t2, which is where we're keeping track of values requested at
            //least twice from this cache.
            cb(t2.put(key, t1.elide(key).val)); //t2++ t1--
        }
        else if (t2.has(key)) {
            //any put or get to the LRU cache will put the value at the
            //top of the list, which is what we're doing here to the value
            //with key 'key' in t2, if it is present in t2.
            cb(t2.get(key));  
        }
        else {
            //get in line!!!
            requesters[key] =  requesters[key] || [];
            requesters[key].push(cb);
            return requesters.length > 1;
        }
        return true;
    }
    
    function ghostCache(key, value, size) {
        //The key might be in the one hit ghostcache (b1), if so we move
        //it to the multiple hit cache. So b1-- and t2++
        if (b1.has(key)) {
            //it seems that there is a demand for single hit values. We
            //move p more to the right the bigger b2 is compared to b1. 
            //P will move at least by 1, but will be at most c.
            //If b2.len === b1.len p will inc by 1. If b2 is twice bigger
            //than b1, it will move by 2, etc
            p = Math.min(p + Math.max(b2.length()/b1.length(), 1), c);
            replace(key);
            //take it out of b1, which also reduce b1's size by one:
            b1.del(key);
            //add the key to t2, since we've seen it before
            t2.put(key, value, size);
            
            return true;
        }
        //The key might be in the multiple hit ghostcache (b2). If so we
        //move it to the multiple hit real cache. So b2-- and t2++
        else if (b2.has(key)) {
            //it seems we get another hit for a value that in the past was
            //already at some time popular We move p more to the left the
            //bigger b1 is compared to b2. P will move at least by on, but
            //will be at most 0. 
            p = Math.max(p - Math.max(b1.length()/b2.length(), 1), 0);
            replace(key);
            //take it out of b2, which also reduce b2's size by one:
            b2.del(key); 
            //add the key to t2, since we've seen it before
            t2.put(key, value, size);
            
            return true;
        }
        return false;
    }
    
    function put(key, value, size) {
        var l1Length = t1.length() + b1.length();
        //The key is not to be found in any cache: None of the operations
        //sofar, including the get would have changed the size of the
        //total cache. However we're about to add a new value to the T1
        //cache, and we need to check whether there is room in L1:
        if (l1Length === c) { 
            //L1 is full. Either evenly divided between t1 and b1 or
            //possibly one empty and the other one full, or somewhere in
            //between. But one of them will have to shrink since we have a
            //new value for T1.
            if (t1.length() < c) { //same as if (b1.length()>0)
                //We can make room by deleting a key from b1.
                b1.delLru(); //b1--
                replace(key);
            } else { //t1.length === c/2
                //we'll have to reduce t1 in size now
                // t1.delLru(); //t1-- //happens anyway when t1.put is called
            }
        } else {
            //L1 is not full. But L2 might be and then some.
            var total = l1Length + t2.length() + b2.length();
            if (total >= c) {
                if (total === c * 2) { 
                    //cache is full, full, full. Delete a key from b2
                    b2.delLru(); //b2--
                }
                //as soon as the total reaches c or is over we start popping values
                //from t1 to b1 and t2 to b2 in replace
                replace(key);
            }
        } 
        t1.put(key, value, size); //t1++
        //bit of a hack, should modify the bit above:
        if (requesters[key]) 
            t2.put(key, t1.elide(key).val, size); //t2++ t1--
    } 
    

    //call cache with a key and a callback. The callback gets the
    //value passed in. If the cache actually doesn't have the value,
    //and it's the first time it's been asked for it then the function
    //returns false. In that case you need to get the resource (async
    //perhaps). When you have the resource, call cache again, this
    //time with the value as the 2nd param however. The function will
    //call the callbacks of all cache requests that occured before the
    //resource was available. 
    function cache(key, value, size) {
        if (typeof value === 'function')
            //try to retrieve value, if not then store the callback
            //and return false the first time this key is requested:
            return get(key, value);
        
        //check if we've had requests in the past for this key before,
        //and if so add them to t2:
        if (!ghostCache(key, value, size))
            //add the value to t1 cache:
            put(key, value, size);
        
        //respond to all the requesters of this key:
        if (requesters[key]) {
            requesters[key].forEach(function(cb) {
                cb(value);
            });
            delete requesters[key];
        }
    
        return true;
    }
    
    function remove(keys) {
        t1.remove(keys);
        t2.remove(keys);
        b1.remove(keys);
        b2.remove(keys);
    }
    
    function list(regExp) {
        return t1.list(regExp).concat(t2.list(regExp));
    }
    
    function stats() {
        var one = t1.stats();
        var two = t2.stats();
        return {
            len: one.len + two.len,
            size: one.size + two.size
        };
    }
    
    init(len);
    
    return {
        cache: cache,
        remove: remove,
        flush: init,
        list: list,
        stats: stats,
        length: function() { return t1.length() + t2.length(); }
    };
}


module.exports = getCache;
