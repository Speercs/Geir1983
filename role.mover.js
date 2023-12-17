'use strict'
let roleMover = {

    /** @param {Creep} creep **/
    run: function(creep) {

		creep.doMover();		
		
	}
};
module.exports = roleMover;

Creep.prototype.doMover = function (){
	
	this.room.memory.wrkMv ++;
	if (this.sleep() ) { 
		this.room.memory.idleMv ++;

	//	this.avoidTravelers()
		/*
		if (this.room.storage) {
			this.yieldRoad(this.room.storage)
		}*/
		return 0;
	}

		
	if (!this._memory.labrat && this._memory._targets && this.carry[RESOURCE_ENERGY] === 0) {		
		this.clearAllTargets();
	}
	
	this.moverGoToWork();
	this.moverManageState();

	if (this.room.memory.hostiles && isOutsideWalls(this.pos) && this.defensiveRetreatPath() ) {
		return;
	}
	
	if (// BOT_MODE && 
		(this._memory.labrat || (!this._memory[C.CLOSEST_TARGET] && !this._memory[C.WORK] && !this._memory._targets)) && 
		this.doLabRat() 
	){
		return 0;
	}


	if (this.performAssignedRole() ) {		
		return 1;
	}

		
	
	if(this._memory[C.WORK] || this._memory._targets) {
		
		if (!this._memory[C.RESOURCE_TYPE] || this._memory[C.RESOURCE_TYPE] === RESOURCE_ENERGY) {
			if (!this.roleHarvester(true) ) {
				if (!this.refillSpawnerContainers(1000) ) {
					if (!this.roleRefillControllerContainer() ) {
						
						this.room.memory.idleMv ++;

						if (this.roleMoveTowardsController() ) {
							return; 
						} else if (this.refillBuilders()) {
							return;
						}

						if (this._cache.fromStore) {

							if (this.sumCarry <= this.carryCapacity/2) {
								delete this._memory[C.WORK];
								this.say("no work")
								return;
							}

							if (Game.time > this._cache.fromStore) {
								if (!this.room._cache.moverSleep || Game.time > this.room._cache.moverSleep) {
									delete this._cache.fromStore;
									this.room._cache.moverSleep = Game.time + 7;
									return;
								}
							}

							this.sleep(7);
							this.say("idle")
						//	this.avoidTravelers()

						} else {
							this.roleStoreEnergy()
						}			
					}
				}
			} 
		}
		else {
			// Deliver minerals
			this.roleMineralMover(true)
		}
	} else { 
		if (!this.roleMoverHasTicksLeft(35) ) {		
			if (!this.moverGetEnergy() ) {
				this.sleep(10)
			//	this.avoidTravelers()
				this.room.memory.idleMv ++;
			}
		}
	}

	if (this.ticksToLive === 1) {
		this.clearAllTargets();
		this.clearTarget();
	}

}



Creep.prototype.moverRefill = function () {

	if (!this.room.memory.fillOrder) { return this.roleHarvester() }
}


Creep.prototype.roleMoveTowardsController = function() {
	let role = "roleMoveTowardsController";
	// CHECK IF OTHER ROLE ACTIVE
	if (!this.checkRole(role)) { return 0; }

	let energyLevelsOk = this.room.energyStatus() >= ECONOMY_DEVELOPING
	if (!energyLevelsOk) { return 0; }

	if (!this.room.controller || this.room.controller.level >= 8) { return 0; }

	if (this.room.memory.mineOnly && this.room.controller.level >= 6) { return 0; }

	if (this.room.memory.newRCL) { return 0; }

	let targetRoom = Game.rooms[this._memory[C.ROOM_ORIGIN]]
	if (!targetRoom) { return 0; }
	if (PRAISE_GCL_ROOMS[this._memory[C.ROOM_ORIGIN]]) { return 0; }

	this.fillWhileMoving();

	let link = getControllerLink(this.room.name)
	if (link.length >= 1) {
		this.travelTo(link[0], { maxRooms: 2, range: 1 });
		return 1;
	}

	let container = _.filter(targetRoom.findByType(STRUCTURE_CONTAINER),
		function (structure) {
			return (structure.isController() && !structure.isProvider() );
		});
	if (container.length >= 1) {
		if (container[0].store[RESOURCE_ENERGY] >= 1900) { return 0;}

		if (this.pos.getRangeTo(container[0]) > 1) {
			this.travelTo(container[0], { maxRooms: 2, range: 1 });
		} else {
		//	this.avoidTravelers()
		}

		return 1;
	}
}
