'use strict'


global.thoriumAddedDecayTicks = function(thoriumAmount = 0) {
   return Math.floor(Math.log10(thoriumAmount || 1))
}

