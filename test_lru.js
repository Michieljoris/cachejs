/*global require:false*/
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:8 maxlen:150 devel:true newcap:false*/ 

var getLruCache = require('./cachejs').lru;

var failed = 0;
var count = 0;
test(getLruCache);

function test(getCache) {
    var store = [], emptySlots = [], lookup = {};
    var maxLen = 20; //should be even

    //cache items expire after two second
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
    var a = getCache(maxLen/2, 0, store, emptySlots, lookup);

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

    a.cache('b', function(val) {
        console.log('received value for b:', val);
        assert(a, 'b,a', 2);
    });

    a.cache('b', 'b'); 

    assert(a, 'b,a', 2);

    //sync cache:
    var t = getCache(maxLen/2, 0, store, emptySlots, lookup);
    var b = getCache(maxLen/2, 0, store, emptySlots, lookup);

    t.put('ta','ta'); assert(t, 'ta',1);
    b.put('ba','ba'); assert(b, 'ba',1);

    t.put('tb','tb'); assert(t, 'tb,ta',2);
    b.put('bb','bb'); assert(b, 'bb,ba',2);

    t.put('tc','tc'); assert(t, 'tc,tb,ta',3);
    b.put('bc','bc'); assert(b, 'bc,bb,ba',3);

    t.get('ta'); assert(t, 'ta,tc,tb', 3);
    b.get('ba'); assert(b, 'ba,bc,bb', 3);

    // listdown(t);
    // listdown(b);

    // testSingle();
    // function testSingle() {
    var c = getCache(5, 0, [], [], {});
    
    c.put('a', 'a'); assert(c,'a',1);
    c.get('a'); assert(c,'a',1);
    c.put('b', 'b'); assert(c,'b,a',2);
    c.get('b'); assert(c,'b,a',2);
    c.put('c', 'c'); assert(c,'c,b,a',3);
    c.put('d', 'd'); assert(c,'d,c,b,a', 4);
    c.put('e', 'e'); assert(c,'e,d,c,b,a', 5);
    c.del('a'); assert(c,'e,d,c,b',4);
    c.del('e'); assert(c,'d,c,b',3);
    c.del('e'); assert(c,'d,c,b', 3);
    c.put('f', 'f', 3);  assert(c,'f,d,c,b',4);
    c.put('g', 'g'); assert(c,'g,f,d,c,b',5);
    c.put('h', 'h', 4); assert(c,'h,g,f,d,c',5); //drop lru
    c.get('f'); assert(c,'f,h,g,d,c', 5);
    c.get('c'); assert(c,'c,f,h,g,d',5);
    c.get('d'); assert(c,'d,c,f,h,g',5);
    c.del('d'); assert(c,'c,f,h,g',4);
    c.del('g'); assert(c,'c,f,h',3);
    c.del('f'); assert(c,'c,h',2);
    c.del('z'); assert(c,'c,h',2);
    c.del('c'); assert(c,'h',1);
    c.del('h'); assert(c,'',0);
    c.put('a', 'a'); assert(c,'a',1);
    c.get('a'); assert(c,'a',1);
    c.put('b', 'b'); assert(c,'b,a',2);
    c.get('b'); assert(c,'b,a',2);
    c.put('c', 'c'); assert(c,'c,b,a',3);
    c.put('d', 'd'); assert(c,'d,c,b,a', 4);
    c.put('e', 'e'); assert(c,'e,d,c,b,a', 5);
    c.del('a'); assert(c,'e,d,c,b',4);
    c.del('e'); assert(c,'d,c,b',3);
    c.del('e'); assert(c,'d,c,b', 3);
    c.put('f', 'f', 3);  assert(c,'f,d,c,b',4);
    c.put('g', 'g'); assert(c,'g,f,d,c,b',5);

    c.delLru(); assert(c,'g,f,d,c', 4);
    c.delLru(); assert(c,'g,f,d', 3);
    c.delLru(); assert(c,'g,f', 2);
    c.delLru(); assert(c,'g', 1);
    c.delLru(); assert(c,'', 0);
    c.delLru(); assert(c,'', 0);
    // }
    


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
    
