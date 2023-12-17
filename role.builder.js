'use strict'
let roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep, slowCreep=false) {
        
		
		if (creep.ticksToLive > 1400 && !BOT_MODE) {
			if( creep.applyBoost(T3_MOVE) ) { return; }		
			if( creep.applyBoost(T3_BUILD) ) { return; }
			if( creep.applyBoost(T3_CARRY) ) { return; }	
		}

		if (creep._memory.appBoosts && creep.ticksToLive > 1300) {
			if (creep._memory.repairGuy && creep.room.sieged) {
				for (let boost in creep._memory.appBoosts) {
					if (creep.applyBoost(boost, true)) { return; }
				}
				delete creep._memory.appBoosts;
			}
		}		

		if(creep.timeToHeadBackForUnBoost() && creep.unBoost() ) { return; }
		
		if (creep.room.hostiles && creep.defensiveRetreatPath({distance: 3}) ) {
			return;
		}

		creep.manageState();
		
	    if(creep._memory[C.WORK]) {
        	if (!creep.roleBuilder({ buildOnly : creep._memory.startup, slowCreep: slowCreep }) && !creep._memory.repairGuy) {
                if (creep.room.controller && creep.room.controller.my && creep.room.controller.level < 8) {
					if (creep.roleUpgrader() ) {
						creep._cache.upgrader = Game.time + 15;
					}
				} else {
					creep.say("home?")
					creep.returnHome();
				}
            }
	    }
	    else {  // Find some energy

			let upgrader = creep._cache.upgrader > Game.time
			if (upgrader && creep.upgraderPassMeTheEnergy() ) {
				// getting from upgraders
				delete creep._cache.mState
			} else if (!creep.getConsumerEnergy(creep._cache.upgrader > Game.time) ) {

	    	}
		}
	}
};

module.exports = roleBuilder;