/*global module:false*/
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:8 maxlen:150 devel:true newcap:false*/ 

//simple LRU implementation using arrays:
// http://www.senchalabs.org/connect/staticCache.html

//lru implementation using doubly linked lists:

//TODO remove large entries over a certain threshold before lru
//TODO keep a value in cache no matter what if its flag is set
//TODO replace linked empty slots trick with just a list of indexes of empty slots.
//TODO maintain 2 LRUs in one cache for ARC purposes. Move the lru of the top list to resize both 
//TODO write more tests
//TODO remove 'put', but pass function into get to get value if there's a cache miss.


function getCache(someMaxLen, someMaxSize){
    
    var lookup;
    var cache;
    var mru, lru;
    var emptySlots;
    
    var maxLen, maxSize;
    maxLen = someMaxLen || 128;
    maxSize = someMaxSize || 1024 * 256;
    var length = 0;

    //make the neighbours of a value point to eachother, cutting the
    //value itself out of the list:
    function bridge(val) {
        var prev = val.prev;
        var next = val.next;
        //the neighbour below has to point to the neighbour above:
        if (prev !== undefined) cache[prev].next = next;
        //and the neighbour above to the neighbour below:
        if (next !== undefined) cache[next].prev = prev;
        //unless the value was actually at the top of the list, in
        //that case mru will have to point to the neighbour below:
        else mru = prev;
    }

    //move the value to the top of the list:
    function touch(index, val) {
        //nothing to do:
        if (index === mru) return;
        bridge(val);
        //if we're cutting out the last one in the list lru will have
        //to point at the next one up
        if (index === lru) lru = val.next;
        //point to the old mru:
        val.prev = mru;
        //there is no next, it's the mru now:
        delete val.next;
        //the old mru has to point up the new one:
        cache[mru].next = mru = index;
    }
    
    function has(key){
        var index = lookup[key];
        if (index === undefined) return undefined;
        return cache[index];
    }

    //only difference with 'has()' it that this will touch the value:
    function get(key){
        var index = lookup[key];
        if (index === undefined) return undefined;
        var val = cache[index];
        touch(index, val);
        return val;
    }


    function put(key, val, size){
        if (size > maxSize) return;
        var emptySlot = lookup[key];
        //update the value if already present in cache, this shouldn't
        //be the way to use the cache. You should (partially) flush
        //the cache and let the normal application's cache logic
        //repopulate it.
        if (emptySlot !== undefined) {
            cache[emptySlot].val = val;   
            touch(emptySlot, cache[emptySlot]);
        }
        else {
            //wrap the value so we can place it in our cache:
            val = {
                key: key,
                val: val,
                size: size || val.length || 0
            };
            //index points at the end of the cache:
            emptySlot = cache.length;
            //if we have room still just add it to the cache:
            if (emptySlot < maxLen) cache.push(val);
            else {
                var lruVal = cache[lru];
                //let emptySlot point to whatever's below lru:
                emptySlot = lruVal.prev;
                //see if it exists:
                if (emptySlot !== undefined) {
                    //yes we have an empty slot we can use, lets splice it out:
                    lruVal.prev = cache[emptySlot].prev;
                }
                else {
                    //we need to drop the lru to make room for our new value:
                    delete lookup[lruVal.key];
                    //emptySlot is now pointing to the old lru
                    emptySlot = lru;
                    //point lru at the next one up:
                    lru = lruVal.next;
                    //point the new lru to whatever was hangin off the old mru:
                    cache[lru].prev = lruVal.prev;
                }
                //if there was anything below lru point it up to the new lru:
                if (lruVal.prev !== undefined) cache[lruVal.prev].next = lru;
                //assign the value to the empty slot:
                cache[emptySlot] = val;
            }
            //if the cache is empty there is no mru and there is
            //nothing to do:
            if (mru === -1) ;
            else {
                //point down to the old mru:
                val.prev = mru;
                //and the old mru can point up to the new value:
                cache[mru].next = emptySlot;
            }
            //look up values by key in a hashtable, and point mru at
            //our new value:
            lookup[key] = mru = emptySlot;
        }
        length++;
    }

    function del(key) {
        var index = lookup[key];
        //if value is not present in cache we're done:
        if (index === undefined) return undefined;
        //delete from lookup
        delete lookup[key];
        var deletedValue = cache[index];
        //delete the value itself:
        delete deletedValue.val;
        //fix up the dbly linked list 
        //break its links and bridge the gap: 
        bridge(deletedValue);
        //if this happened to be the lru, the penultimate value in the
        //list becomes lru
        if (lru === index) lru = deletedValue.next;
        //since we have now an open slot in the cache, let's splice it
        //into the list just below lru and whatever other empty slots
        //are hanging from the bottom, so we can find these slots
        //again if we need them
        var lruVal = cache[lru];
        //our deletedValue needs to point to the tail:
        deletedValue.prev = lruVal.prev;
        //and lru value needs to point to our deleted value
        lruVal.prev = index;
        //and the other way as well, up the list from deleted value:
        deletedValue.next = lru;
        //and up from whatever is hanging below the deleted value now:
        if (deletedValue.prev) cache[deletedValue.prev].next = index;
        //one less value in the cache:
        length--;
        //be polite and return the key:
        return key;
    }
    
    function Typeof(v) {
        var type = {}.toString.call(v);
        return type.slice(8, type.length-1);
    }
    
    //str, array, or regexp, will call del to do the work:
    function delWrapper(keys){
        if (!keys) return;
        if (Typeof(keys) === 'RegExp') {
            keys = Object.keys(lookup).filter(function(k) {
                return keys.test(k) ;
            });
        }
        else if (typeof keys === 'string') keys = [keys]; 
        keys.forEach(function(k) {
            del(k);
        });
    }

    function flush(){
        lookup = {};
        cache = [];
        mru = -1, lru = 0;
        emptySlots = [];
    }

    //return a list ordered by mru, filtered by the regexp if passed
    //in:
    function list(regExp){
        // console.log('lru', lru);
        // console.log('mru', mru);
        // console.log(lookup);
        // console.log(cache);
        regExp = regExp || /.*/;
        var result = [];
        var prev = mru;
        if (prev === -1) return [];
        var i=0;
        while (i < maxLen) {
            var entry = cache[prev];
            if (regExp.test(entry.key)) result.push(entry.key);
            i++;
            if (prev === lru) return result;
            prev = entry.prev;
        }
        return result;
    }

    function stats(){
        return {
            len: Object.keys(lookup).length,
            size: (function() {
                return cache.reduce(function(s, e) {
                    return (e.size || 0) + s; 
                }, 0);
            })()
        };
    }
    
    function delLru() {
        // var index = lru;
        // var val = cache[index];
        // var key = val.key;
        // delete lookup[key];
        // // val.deleted = true;
        // // delete val.key;
        // delete val.val;
        // bridge(val);
        // var lruVal = cache[lru];
        // val.prev = lruVal.prev;
        // lruVal.prev = index;
        // val.next = lru;
        // if (val.prev) cache[val.prev].next = index;
        // length--;
        // return key;
        // or:
        var val = cache[lru];
        return del(val.key);
    }

    flush();
    
    return {
        has: has, //calling this has no bearing on LRU ordering
        get: get, //if the value is in the cache it will go to the top of the list
        put: put, //an assumed miss, not an update, though it will
                  //update the value if it is found in the cache. In
                  //both cases the value will be put at the top of the
                  //list.
        del: delWrapper, //convenience wrapper to selectively flush
                         //the cache by key, [keys] or /key/
        flush: flush, //completely empty out the cache
        list: list, //return a list of the cache contents, filtered by
                    //a regexp if passed in
        stats: stats, //return len and size of of cache. size will
                      //only be accurate if a size param is present in
                      //every put call or every value stored is in
                      //string form
        //api for ARC-cache:
        delLru: delLru,
        length: function() { return length; }
    };
}

//pass in max of items stored in cache and max size per item,
//defaulting to 128 and 256kb respectively
module.exports = getCache;
