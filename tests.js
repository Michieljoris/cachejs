var getCache = require('./lru_cache_multiple');
// var getCache = require('./lru_cache');

var cache = [], emptySlots = [], lookup = {};
var maxLen = 20; //should be even
var t = getCache(maxLen/2, 10, cache, emptySlots, lookup, 0);
var b = getCache(maxLen/2, 10, cache, emptySlots, lookup, 1);

var failed = 0;
var count = 0;

t.put('ta','ta'); assert(t, 'ta',1);
// console.log(cache);
// links();
b.put('ba','ba'); assert(b, 'ba',1);
// t.link(b.mru());assert(b, 'ba',1);

t.put('tb','tb'); assert(t, 'tb,ta',2);
// listdown();
b.put('bb','bb'); assert(b, 'bb,ba',2);

t.put('tc','tc'); assert(t, 'tc,tb,ta',3);
b.put('bc','bc'); assert(b, 'bc,bb,ba',3);
// listdown();
t.get('ta');
listdown(t);
listdown(b);
listup(t);
listup(b);
t.get('tc');
b.get('ba');

testSingle();
function testSingle() {
    var c = getCache(5, 10, [], [], {}, 0);
    
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
}

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
        var entry = cache[prev];
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
        var entry = cache[next];
        result.push(entry.key);
        i++;
        next = entry.next;
    }
    console.log(result);
    return result;
}
function links() {
    
    var i=0;
    Object.keys(cache).forEach(function(c) {
        c = cache[c];
        console.log(i + ': ' + c.key + ' ' + (c.next !== undefined ? c.next + '<' : '|') + ' ' +
                    (c.prev !== undefined ? '>' + c.prev : '|'));
        i++;
    });
    console.log('------------------');
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



// c.put('a', 'a'); 
// c.put('b', 'b'); 
// c.put('c', 'c'); 
// console.log('list1');
// c.list();
// console.log('list2');
// c.get('a'); assert('a,c,b');

console.log('\nPerformed ' + count + ' tests. Failed ' + failed + '.');
