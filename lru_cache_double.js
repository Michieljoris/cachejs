/*global module:false*/
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:8 maxlen:150 devel:true newcap:false*/ 

//LRU cache implementation using doubly linked lists:

//TODO filter out large entries over a certain threshold to make room
//for lots of small values
//TODO keep a value in cache no matter what if its flag is set

//TODO maintain 2 LRUs in one cache for ARC purposes. Move the lru of
//the top list to resize both

//TODO replace lru and mru with psuedo entries in the cache. they just
//are not in lookup, you wouldn't have to check for undefined in
//bridge

//TODO change cache index to start from 1, you can then drop checking
//for undefined, or maybe with lru and mru added to linkded list it's
//not necessary?
//TODO have more than 2 LRUs?
//For a simple LRU implementation using arrays see lru_cache_simple in
//this repo, copied from connect middleware staticCache.


function getCache(someMaxLen, someMaxSize, cache, emptySlots){
    
    var lookup;
    var mru, lru;
    
    var maxLen, maxSize;
    maxLen = someMaxLen || 128;
    maxSize = someMaxSize || 1024 * 256;
    var length = 0;

    //make the neighbours of a value point to eachother, cutting the
    //value itself out of the list:
    function bridge(index, val) {
        var prev = val.prev;
        var next = val.next;
        //if we're cutting out the last one in the list lru will have
        //to point at the next one up
        if (index === lru) lru = val.next;
        //the neighbour below has to point to the neighbour above:
        if (prev !== undefined) cache[prev].next = next;
        //and the neighbour above to the neighbour below:
        if (next !== undefined) cache[next].prev = prev;
        //unless the value was actually at the top of the list, in
        //that case mru will have to point to the neighbour below:
        else mru = prev;
    }

    //move the value to the top of the list:
    function touch(touching, val) {
        //nothing to do:
        if (touching === mru) return;
        //
        bridge(touching, val);
        //point down to the old mru:
        val.prev = mru;
        //point up to whatever was above mru
        val.next = cache[mru].next;
        //and point back:
        if (val.next !== undefined) cache[val.next].prev = touching;
        //the old mru has to point up the new one:
        cache[mru].next = mru = touching;
    }
    
    function has(key){
        var index = lookup[key];
        if (index === undefined) return undefined;
        return cache[index];
    }

    //only difference with 'has()' it that this will touch the value:
    function get(key, func){
        var index = lookup[key];
        if (index === undefined) {
            if (typeof func === 'function')
                return put(key, func());
            else return undefined;
        }
        var val = cache[index];
        touch(index, val);
        return val;
    }


    function put(key, val, size){
        if (size > maxSize) return val;
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
            //emptySlot points at the end of the cache:
            emptySlot = cache.length;
            //if we have room still just add it to the cache:
            if (emptySlot < maxLen) {
                cache.push(val);   
                length++;
            }
            else {
                if (emptySlots.length)  {
                    emptySlot = emptySlots.pop();
                    length++;
                } 
                //if there were no empty slots then..
                else {
                    var lruVal = cache[lru];
                    //we need to drop the lru to make room for our new value:
                    delete lookup[lruVal.key];
                    //emptySlot is now pointing to the old lru
                    emptySlot = lru;
                    //cut lru out of the list:
                    bridge(emptySlot, lruVal);
                }
                //we found an empty slot so we need to incr the len of the cache
                //assign the value to the empty slot:
                cache[emptySlot] = val;
            }
            //if this is the only item it will be linked in between lru and mru
            if (length === 1) lru = emptySlot;
            else {
                //point down to the old mru:
                val.prev = mru;
                // if (mru === undefined) val.prev = 0;
                var anchor = cache[mru].next;
                val.next = anchor;
                if (anchor !== undefined) {
                    cache[anchor].prev = emptySlot;  
                }
                // else val.next = 1
                //and the old mru can point up to the new value:
                cache[mru].next = emptySlot;
                
                
            }
            //look up values by key in a hashtable, and point mru at
            //our new value:
            lookup[key] = mru = emptySlot;
        }
        return val;
    }

    function del(key) {
        if (length === 1) {
            console.log('You should flush it. Deleting the last value would break the link in a double lru between top and bottom');
            return undefined;;
        }
        var index = lookup[key];
        //if value is not present in cache we're done:
        if (index === undefined) return undefined;
        //delete from lookup
        delete lookup[key];
        var deletedValue = cache[index];
        //delete the value itself:
        delete deletedValue.val;
        //fix up the dbly linked list now:
        //break its links and bridge the gap: 
        bridge(index, deletedValue);
        //keep track of empty slots:
        emptySlots.push(index);
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
        // cache = [];
        mru = 0, lru = 0;
        // emptySlots = [];
    }

    // function mru(index) {
    //     if (index !== undefined) cache[1].prev = index;
    //     else return cache[1].prev;
    //     return undefined; 
    // }
    // function lru(index) {
    //     if (index !== undefined) cache[0].next = index;
    //     else return cache[0].next;
    //     return undefined; 
    // }
    
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
        if (!length) return [];
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
        if (!length) return undefined;
        var val = cache[lru];
        return del(val.key);
    }
    
    function link(otherMru) {
        cache[otherMru].next = lru;
        cache[lru].prev = otherMru;
    }

    flush();
    
    return {
        has: has, //calling this has no bearing on LRU ordering
        get: get, //if the value is in the cache it will go to the top
                  //of the list, if not it will return undefined,
                  //unless a function has been passed in as the 2nd
                  //arg. It will then return the value returnd by that
                  //function, and add that value to the cache.
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
        delLru: delLru, //deletes the lru from the cache
        length: function() { return length; } //returns the actual number of values in the cache
        ,mru: function() { return mru; }
        ,lru: function() { return lru; }
        ,link: link
    };
}

//pass in max of items stored in cache and max size per item,
//defaulting to 128 and 256kb respectively
module.exports = getCache;
