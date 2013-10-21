module.exports = 
     {
         lru: function() {
             return require('./lib/lru_cache').apply(null, arguments);
         }
        ,arc: function(len) {
             return require('./lib/arc_cache').apply(null, arguments);
        }
    };
