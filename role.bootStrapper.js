'use strict'
let roleBootStrapper = {

    /** @param {Creep} creep **/
    run: function(creep) {

        creep.manageState();
		
	    if(creep._memory[C.WORK]) {
			if (!creep.roleEmUpgrader(true) ) {
				if (!creep.refillSpawnerContainers() ) {
					if (!creep.roleHarvester() ) {
						if (!creep.roleBuilder() ) {
							if (creep.room.memory.em) {
								// hang out by the spawns
								creep.clearTarget();
							} else {

								if ((creep._cache.lastCheckUpgrader === Game.time - 1) && !creep.roleUpgrader() ) {
									creep.travelTo(new RoomPosition(25,25, creep._memory[C.ROOM_ORIGIN]))
									creep.clearTarget();
								}

								creep._cache.lastCheckUpgrader = Game.time; // make sure spawns gets filled, dont jump on upgrading task

							}
							
						}
					}
				}
			}
		}
		
		if (!creep._memory[C.WORK]) {  // Find some energy

			creep.scoopNearbyEnergy();

			if (!creep.moverGetEnergy() ) {
				creep.getEnergyFromSource();
			}			
		}
	}
	
};

module.exports = roleBootStrapper;