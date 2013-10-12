/*global module:false require:false*/
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:8 maxlen:150 devel:true newcap:false*/ 

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


//TODO creating new values is async very likely!!!, does algo rely on sync?

var cache = require('./lru_cache_multiple');

var c = 10;
//We're passing in max sizes for the cache, but this is managed in this module
var t1 = cache(c);
var t2 = cache(c);
var b1 = cache(c);
var b2 = cache(c);
var p = 0; //0<p<c


// 0 <= p <= c

// pop values into the ghost caches depending on whether t1.length > p
// p > t1.len , pop t2 to b2, reduce length of t2
// p < t1.len , pop t1 to b1, reduces length of t1
// this reduces t1 till it's the size of p. After that t2 will be
// shrunk, and b2 grown from it.
function replace(key) {
    if (t1.length() &&
        ((b2.has(key) && t1.length() === p) ||
         (t1.length() > p)))
        //move lru of t1 to mru of b1, so reduce the size of t1 by
        //one, t1.len > p so bringing it closer to p, if b2.has(key)
        //even reduce the size of t1 to one less than p
        b1.put(t1.delLru()); //b1++ and t1--
    //move lru of t2 to mru of b2, so reduce the size of t2 by
    //one,
    else b2.put(t2.delLru()); //b2++ and t2--
}

//We return the value if it is in the cache, however if we find it in
//the one hit cache we move the value over to the multiple hit cache
//before returning it. So if there are a bunch of single hits flooding
//the one hit cache, we still have a copy of this value that was
//important enough to be hit at least twice. 
//We do a possible t1-- and t2++
function get(key) {
    var result = t1.has(key);
    if (result){
        //we've had this hit exactly once already since it is in
        //t1. Let's remove the value from t1 and put it at the top of
        //t2, which is where we're keeping track of values requested at
        //least twice from this cache.
        t1.del(key);  //t1--
        t2.put(key, result.val); //t2++
        return result.val;
    }
    else {
        //any put or get to the LRU cache will put the value at the
        //top of the list, which is what we're doing here to the value
        //with key 'key' in t2, if it is present in t2.
        return t2.get(key);  
    }
    
}

//this assumes a get has already been done for key, and it was a
//miss. If it was a hit, caches were updated and the value
//returned. If it was a miss we're here now to enter the value into
//the cache:
function put(key, value) {
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
        t2.put(key,value);
        return;
        
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
        t2.put(key,value);
        return;
    }
    var l1Length = t1.length() + b1.length();
    //The key is not to be found in any cache: None of the operations
    //sofar, including the get would have changed the size of the
    //total cache. However we're about to add a new value to the T1
    //cache, we need to check whether there is room in L1:
    if (l1Length === c) { 
        //L1 is full. Either evenly divided between t1 and b1 or
        //possibly one empty and the other one full, or somewhere in
        //between. But one of them will have to shrink since we have a
        //new value for T1.
        if (t1.length() < c) { //or if (b1.length()>0)
            //We can make room by deleting a key from b1.
            b1.delLru(); //b1--
            replace(key);
        } else { //t1.length === c
            //we'll have to reduce t1 in size now
            t1.delLru(); //t1--
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
        //the key was not in any cache, lets put it in the one hit
        //so far cache:
    } 
    t1.put(key, value); //t1++
}

function delWrapper() {
    
}

function del() {
    
}

module.exports = {
    // has: has,
    put: put,
    get: get,
    del: delWrapper
    // ,flush: flush,
    // list: list,
    // stats, stats,
    ,length: function() { return t1.length() + t2.length; }
    
    
};
