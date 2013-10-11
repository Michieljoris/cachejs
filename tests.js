var getCache = require('./lru_cache');

var c = getCache(5);

var failed = 0;
var count = 0;

c.put('a', 'a'); assert('a');
c.get('a'); assert('a');
c.put('b', 'b'); assert('b,a');
c.get('b'); assert('b,a');
c.put('c', 'c'); assert('c,b,a');
c.put('d', 'd'); assert('d,c,b,a');
c.put('e', 'e'); assert('e,d,c,b,a');
c.del('a'); assert('e,d,c,b');
c.del('e'); assert('d,c,b');
c.del('e'); assert('d,c,b');
c.put('f', 'f', 3);  assert('f,d,c,b');
c.put('g', 'g'); assert('g,f,d,c,b');
c.put('h', 'h', 4); assert('h,g,f,d,c'); //drop lru
c.get('f'); assert('f,h,g,d,c');
c.get('c'); assert('c,f,h,g,d');
c.get('d'); assert('d,c,f,h,g');

function assert(str) {
    count++;
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
