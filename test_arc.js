/*global require:false*/
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:8 maxlen:150 devel:true newcap:false*/ 

var getArcCache = require('./cachejs').arc;

var failed = 0;
var count = 0;
test(getArcCache);

function test(getCache) {
    
    var maxLen = 5; 

    //testing of expire 
    var e = getCache(5, 2);
    
    e.cache('a', 1);
    
    setTimeout(function() {
        e.cache('a', function(val) {
            console.log('received not yet expired value:', val);
        });
    }, 1000);
    
    setTimeout(function() {
        //this won't invoke the callback since the value is expired
        e.cache('a', function(val) {
            console.log('received value set after it expired:', val);
        });
        //but now it will:
        e.cache('a', 2);
    }, 3000);

    //async cache:
    var a = getCache(maxLen, 0);

    a.cache('a', function(val) {
        console.log('received value first:', val);
        assert(a, 'a', 1);
    });

    a.cache('a', function(val) {
        console.log('received value second:', val);
        assert(a, 'a', 1);
    });
    a.cache('a', 'a'); 

    a.cache('a', function(val) {
        console.log('received value third:', val);
        assert(a, 'a', 1);
    });

    // return;
    a.cache('b', function(val) {
        console.log('received value for b:', val);
        assert(a, 'b,a', 2);
    });
    console.log(a.debug());
    a.cache('b', 'b'); 

    console.log(a.debug());
    
    a.cache('b', function(val) {
        console.log('received value for b:', val);
        assert(a, 'b,a', 2);
    });
    
    a.cache('c','c');
    a.cache('d','d');
    a.cache('e','e');
    
    a.cache('c', function(val) {console.log('received value for c:', val);});
    a.cache('d', function(val) {console.log('received value for d:', val);});
    a.cache('e', function(val) {console.log('received value for e:', val);});
    a.cache('f', function(val) {console.log('received value for f:', val);});
    a.cache('f','f');
    a.cache('f', function(val) {console.log('received value for f:', val);});
    
    console.log(a.debug());
    


    function listdown(list){
        // console.log('lru', lru);
        // console.log('mru', mru);
        // console.log(lookup);
        // console.log(cache);
            var result = [];
            var prev = list.mru();
        // if (!length) return [];
        var i=0;
        while (i < list.length()) {
            // console.log(i, t.length(), b.length());
                var entry = store[prev];
            result.push(entry.key);
            i++;
            prev = entry.prev;
        }
        console.log(result);
        return result;
    }

    function listup(list){
        // console.log('lru', lru);
        // console.log('mru', mru);
        // console.log(lookup);
        // console.log(cache);
            var result = [];
        var next = list.lru();
        // if (!length) return [];
        var i=0;
        while (i < list.length()) {
            var entry = store[next];
            result.push(entry.key);
            i++;
            next = entry.next;
        }
        console.log(result);
        return result;
    }

    function links() {
        var i=0;
        Object.keys(store).forEach(function(c) {
            c = store[c];
            console.log(i + ': ' + c.key + ' ' + (c.next !== undefined ? c.next + '<' : '|') + ' ' +
                        (c.prev !== undefined ? '>' + c.prev : '|'));
            i++;
        });
        console.log('------------------');
    }
    
}
function assert(c, str, len) {
    count++;
    if (c.length() !== len) {
        failed++;
        console.log('Failed test ' + count + '. Expecting length: ' + len + ' but receiving: ' + c.length());
    }
    var result = c.list().toString();
    if (result.toString() !== str)  {
        failed++;
        console.log('Failed test ' + count + '. Expecting: ' + str + ' but receiving: ' + result);
    }
}

console.log('\nPerformed ' + count + ' tests. Failed ' + failed + '.');
    
