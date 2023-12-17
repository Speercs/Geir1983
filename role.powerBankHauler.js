'use strict'
let rolePowerBankHauler = {

    /** @param {Creep} creep **/
    run: function(creep) {
		
        creep.manageState();
		
		if (creep._memory[C.TRACK_DISTANCE]) {	// One cycle completed
			creep.recycleOrSuicide(true);
			return;
		}
		
		
		if (creep.defensiveRetreatPath({ keepRes: 1 }) ) {
			return;
		}		


		if(creep.sumCarry > 0) {
			creep.roleHauler(true);
		}
		else {
			creep.PowerBankHauler();
		}
				
	}
};
module.exports = rolePowerBankHauler;