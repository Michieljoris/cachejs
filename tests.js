var getCache = require('./lru_cache');

var c = getCache(5);

var failed = 0;
var count = 0;

c.put('a', 'a'); assert('a',1);
c.get('a'); assert('a',1);
c.put('b', 'b'); assert('b,a',2);
c.get('b'); assert('b,a',2);
c.put('c', 'c'); assert('c,b,a',3);
c.put('d', 'd'); assert('d,c,b,a', 4);
c.put('e', 'e'); assert('e,d,c,b,a', 5);
c.del('a'); assert('e,d,c,b',4);
c.del('e'); assert('d,c,b',3);
c.del('e'); assert('d,c,b', 3);
c.put('f', 'f', 3);  assert('f,d,c,b',4);
c.put('g', 'g'); assert('g,f,d,c,b',5);
c.put('h', 'h', 4); assert('h,g,f,d,c',5); //drop lru
c.get('f'); assert('f,h,g,d,c', 5);
c.get('c'); assert('c,f,h,g,d',5);
c.get('d'); assert('d,c,f,h,g',5);
c.del('d'); assert('c,f,h,g',4);
c.del('g'); assert('c,f,h',3);
c.del('f'); assert('c,h',2);
c.del('z'); assert('c,h',2);
c.del('c'); assert('h',1);
c.del('h'); assert('', 0);


c.put('a', 'a'); assert('a',1);
c.get('a'); assert('a',1);
c.put('b', 'b'); assert('b,a',2);
c.get('b'); assert('b,a',2);
c.put('c', 'c'); assert('c,b,a',3);
c.put('d', 'd'); assert('d,c,b,a', 4);
c.put('e', 'e'); assert('e,d,c,b,a', 5);
c.del('a'); assert('e,d,c,b',4);
c.del('e'); assert('d,c,b',3);
c.del('e'); assert('d,c,b', 3);
c.put('f', 'f', 3);  assert('f,d,c,b',4);
c.put('g', 'g'); assert('g,f,d,c,b',5);

c.delLru(); assert('g,f,d,c', 4);
c.delLru(); assert('g,f,d', 3);
c.delLru(); assert('g,f', 2);
c.delLru(); assert('g', 1);
c.delLru(); assert('', 0);
c.delLru(); assert('', 0);

function assert(str, len) {
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
