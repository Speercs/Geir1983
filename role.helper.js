'use strict'
let roleHelper = {

    /** @param {Creep} creep **/
    run: function(creep) {

        if (!creep.defensiveRetreatPath({ keepRes: 1 }) ) {
			if (creep.sleep() ) { return; }
			
			creep.manageState();		
			
			if(creep._memory[C.WORK]) {
				if (creep.pos.roomName == creep._memory[C.ROOM_TARGET]){
					if (!creep._memory[C.TICKS_TO_TARGET]) { creep._memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME-creep.ticksToLive; }
					
					if (creep.room.controller && !creep.room.controller.my){
						if (!creep.roleDeconstructor() ) {
							if (!creep.roleBuilder() ) {
								creep.travelTo(creep.room.controller, {range: 3, maxRooms: 1});
							}
						}
					} else {
						if (!creep.roleEmUpgrader() ) {
							if (!creep.refillSpawnerContainers(1000) ) {
								if (!creep.boosted && !creep.roleHarvester() ) {
									let buildOnly = true;
									if ((creep.room.controller && creep.room.controller.level >= 8) || creep.room.memory.hostiles) {
										buildOnly = false;
									}
									if (!creep.roleBuilder({buildOnly: buildOnly}) ) {

										if (getRoomPRCL(creep.room.name) >= 3) {
											if (!creep.roleStationaryUpgrader() ) {
												creep.sleep(5);
											}
										} else {
											if (!creep.roleUpgrader() ) {
												creep.sleep(20);
											} else {
												creep._cache.upgrader = Game.time + 15;
											}
										}
										
									}
								}
							}
						}	
					}	
				}   
				else {
					if (!creep._memory[C.CLOSEST_TARGET]) {
						let targetObj = Game.getObjectById(creep._memory[C.CLOSEST_TARGET]);
						if (targetObj) {
							creep.travelTo(targetObj.pos, {range: 1, roomCallback: avoidSKcreeps});
						} else {
							creep.travelTo(pullIdlePosForRoom(creep._memory[C.ROOM_TARGET]), {range: 2, roomCallback: avoidSKcreeps, maxOps: 50000, ensurePath: true, shard: creep._memory.shard});
						}					
					} else {
						creep.travelTo(pullIdlePosForRoom(creep._memory[C.ROOM_TARGET]), {range: 2, roomCallback: avoidSKcreeps, maxOps: 50000, ensurePath: true, shard: creep._memory.shard});
						
					}
				}
			}
			else {  
				if (Memory.PraiseGCL[creep._memory[C.ROOM_TARGET]]) {
					if (!creep.getEnergyFromStorageLink() ) {
						if (!creep.getEnergyFromStorage() ) {
							creep.getEnergyFromSource();
						}
					}
				} else {	
					let upgrader = creep._cache.upgrader > Game.time
					if (upgrader && creep.upgraderPassMeTheEnergy() ) {
						// getting from upgraders
					} else if (!creep.moverGetEnergy() ) {
						if (!creep.getEnergyFromSource() ) {
							creep.returnHome();
						}
					}
				}
			}
		}		
	}
};

module.exports = roleHelper;



Creep.prototype.helperRefreshWhileLowLevel = function() {

	let ticksToLive = this.ticksToLive;

	if (ticksToLive > 500 && !this._memory.refresh) { return 0; }
	if (!this.room.controller || !this.room.controller.my || this.room.controller.level >= 4) { return 0; } // ONLY DO REFRESH ON LOW LEVEL ROOMS
	
	if (ticksToLive < 500) {
		this._memory.refresh = 1;
	} else if ( ticksToLive > 1350 ) {
		delete this._memory.refresh;
	}

	let spawns = _.filter(this.room.findByType(STRUCTURE_SPAWN), (c) => !c.spawning );

	let targetSpawn = spawns[0];
	if (this.pos.getRangeTo(targetSpawn) > 1) {
		this.travelTo(targetSpawn);
	} else {
		targetSpawn.renewCreep(this);
	}

};