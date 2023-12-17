'use strict'


let roleResourceTransport = {

    /** @param {Creep} creep **/
    run: function(creep) {
        
       

		if (!creep.hasBodyparts(HEAL)) {
			creep.manageState();
			if (creep.defensiveRetreatPath() ) { return; }
		}
		
		if (creep.sleep() ) { return; }
		
		/*
		if () {
			addCreepToCache(creep.name, creep._memory.evacuate.prevRole, creep._memory[C.ROOM_ORIGIN]);
		}*/

        
		if(creep._memory[C.WORK] || (creep.hasBodyparts(HEAL) && creep.store.getCapacity() === 0) ){		

			creep.memory.hasWorked = 1;

			if (creep._memory.shard && !creep._memory.regRes) {
				creep._memory.regRes = 1;
				interShard.registerDepartingResource(creep._memory.targetRes, creep.store[creep._memory.targetRes], creep._memory.shard)
				requestMemSave();
			}

			if (creep.room.name !== creep._memory[C.ROOM_TARGET]) {
				let dest;
				let range;
				if (Game.rooms[creep._memory[C.ROOM_TARGET]] && Game.rooms[creep._memory[C.ROOM_TARGET]].storage) {
					dest = Game.rooms[creep._memory[C.ROOM_TARGET]].storage.pos;
					range = 1;
				} else if (Memory.rooms[creep._memory[C.ROOM_TARGET]] && creep._memory[C.ROOM_TARGET].controller) {
					dest = posDecompress(creep._memory[C.ROOM_TARGET].controller.pos, creep._memory[C.ROOM_TARGET].controller);
					range = 3;
				} else {
					dest = pullIdlePosForRoom(creep._memory[C.ROOM_TARGET]);
					range = 3;
				}
				creep.travelTo(dest, {range: range, ignoreRoads: true,  roomCallback: avoidSKcreeps, shard: creep._memory.shard});

			} else {	
				if (creep.hasBodyparts(HEAL) && creep.store.getUsedCapacity() === 0) { 
					creep.recycleOrSuicide(true);
				} else {
					if (!PRAISE_GCL_ROOMS[creep._memory[C.ROOM_TARGET]] && creep._memory.targetRes === RESOURCE_ENERGY){
						if (!creep.roleHarvester(true) ) {
							if (!creep.roleRefillControllerContainer(creep._memory[C.ROOM_TARGET]) ) {
								if (!creep.refillSpawnerContainers() ){
									if (!creep.giveAwayEnergy() ) {
										if (!creep.roleResourceDeposit() ) {
											creep.dropAtStorageLocation(creep._memory[C.ROOM_TARGET])
										}
									}
								}
							}
						}
					} else {
						creep.roleResourceDeposit();
					}

					if (creep._memory[C.TRACK_DISTANCE] && creep._memory.shard && !creep._memory.regResArival) {
						interShard.registerArrivingResource(creep._memory.targetRes, creep.store[creep._memory.targetRes], creep._memory.shardOrigin)
						creep._memory.regResArival = 1;
						creep.recycleOrSuicide()
					}
				}
			}
		} else {

			if (creep.memory.hasWorked) {	// check before returning
				delete creep.memory.hasWorked;
				let roundTrip = 50 + (creep.memory[C.TICKS_TO_TARGET] * 2)
				if (creep.ticksToLive < roundTrip) {
					creep.recycleOrSuicide()
					return;
				}
			}


			if (creep.room.name !== creep._memory[C.ROOM_ORIGIN]) {

				let dest;
				let range;
				if (Game.rooms[creep._memory[C.ROOM_ORIGIN]] && Game.rooms[creep._memory[C.ROOM_ORIGIN]].storage) {
					dest = Game.rooms[creep._memory[C.ROOM_ORIGIN]].storage.pos;
					range = 1;
				} else {
					dest = pullIdlePosForRoom(creep._memory[C.ROOM_ORIGIN]);
					range = 3;
				}

				creep.travelTo(dest, {range: range, offRoad: true, ignoreCreeps: false, roomCallback: avoidSKcreeps});
			} else {


				if (creep._memory.targetRes === RESOURCE_ENERGY) {

					if (creep.memory[C.TICKS_TO_TARGET] !== undefined) {	// check after returning
						if (creep.ticksToLive < creep.memory[C.TICKS_TO_TARGET] + 35) {
							creep.recycleOrSuicide()
							return;
						}
					}

					creep.getConsumerEnergy();
				} else {
					creep.getResource2(creep._memory.targetRes, creep._memory.exportAmount);
				}
			}
		}

		if (creep.hasBodyparts(HEAL)) { 
			creep.healInRange();
		}

		
		
	}
};

module.exports = roleResourceTransport;

Creep.prototype.clearMemory = function() {
	for (let key in this._memory) {
		delete this._memory[key]
	}
}

Creep.prototype.haulerTypeGetNewRole = function(roomName) {
	
	if (!Memory.rooms[roomName] || !Memory.rooms[roomName].myRoom) { return false;}	
	let localCreeps = _.filter(Game.creeps, (c) => (c._memory[C.ROOM_ORIGIN] === roomName));

	// Movers
	if (this._memory[C.ROLE] !== 'mover') {
		let movers = _.filter(localCreeps, (c) => (c._memory[C.ROLE] === 'mover'));
		let wantedMovers = Memory.rooms[roomName][R.REQUESTED_MOVERS] || 0;
		if (movers.length < wantedMovers) {
			this.clearTarget();
			this.clearMemory();
			this._memory[C.ROOM_ORIGIN] = roomName;
			this._memory[C.ROLE] = 'mover';
			log(this+ " chainging role to mover! " + roomName, "green")
			return true;
		}
	}	

	if (this.ticksToLive < 100) { return false;}

	// Haulers
	if (this._memory[C.ROLE] !== 'hauler') {
		let haulers = _.filter(localCreeps, (c) => (c._memory[C.ROLE] === 'hauler'));
		let haulCarryParts = getBodyparts(haulers, CARRY);
		let wantedHaulCarry = Memory.rooms[roomName].reqHalCarry || 0;
		if (wantedHaulCarry > haulCarryParts) {
			this.clearTarget();
			this.clearMemory();
			this._memory[C.ROOM_ORIGIN] = roomName;
			this._memory[C.ROLE] = 'hauler';
			log(this+ " chainging role to hauler! " + roomName, "green")
			return true;
		}
	}

	// Mineral Mover

	// Deposits

	// Power Bank Hauler

	// SK Mineral Mover


}


Creep.prototype.commScorer = function() {

	log(this + " comScorer! " + this.room.name, "green")
	this.room.visual.circle(this.pos.x, this.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'green'});	

	let caravan = Memory.caravans[this.memory.caravanId]
	let res = this._memory.scoreRes
	if (!this._memory.filled) {
				
		let timeLeft = caravan.eta - Game.time;
		let travelTime = caravan.assignedRooms[this._memory[C.ROOM_ORIGIN]].travelTime;

		if (!travelTime) {
			travelTime = caravan.assignedRooms[this._memory[C.ROOM_ORIGIN]].dist * 45;
		}
		
		if (timeLeft < travelTime) {
			this.recycleOrSuicide();
			return;
		}
		
		let amount = this.store.getFreeCapacity(res);
		if (caravan && caravan.commodities && caravan.commodities[res]) {
			amount = Math.min(amount, caravan.commodities[res].store)
		}
		if (caravan && caravan.score && caravan.score[res]) {
			amount = Math.min(amount, caravan.score[res].amount)
		}

		if (this.room.terminal) {
			amount = Math.min(amount, this.room.terminal.store[res])
		}		

		let filled = true;	
		if (!this.store[res]) {
			this.getResource2(res, amount);
			filled = false;
		}
		
		this._memory.filled = filled;
	}

	if (!this._memory.filled) {
		return;
	}

	if (this.hasBodyparts(HEAL)) { 
		this.healInRange();
	}

	let destinationRoom = this._memory[C.ROOM_TARGET];

	if (this.room.name === destinationRoom) {
		this._memory.reachedTarget = true;
		this._memory[C.ROOM_TARGET] = caravan.destination
	}
	
	let dest;
	let range = 5;	

	let caravanCreep;
	if (caravan && caravan.commodities && caravan.commodities[res]) {
		for (let idx in caravan.commodities[res].creeps) {			
			let creep = Game.getObjectById(caravan.commodities[res].creeps[idx])		
			if (creep && creep.store[res] && creep.store.getFreeCapacity(res) > 0) {
				caravanCreep = creep;
				this.room.visual.line(this.pos, caravanCreep.pos, { color: "green", lineStyle: "solid" });
				break;
			}

		}		
	}

	if (caravanCreep && roomIsHW(this.room.name)) {

		if (this.pos.getRangeTo(caravanCreep) <= 1) {
			this.transfer(caravanCreep, res);
		} else {
			this.travelTo(caravanCreep, {range: 1, ignoreRoads: true,  roomCallback: avoidSKcreeps, preferHighway: true});
		}

		if (this._memory.reachedTarget &&
			(caravanCreep.room.name === this.room.name || 
			caravanCreep.pos.getRangeToWP(pullIdlePosForRoom(destinationRoom)) < this.pos.getRangeToWP(pullIdlePosForRoom(destinationRoom)))
		) {
			delete this._memory.reachedTarget // make sure to turn around if i fail to catch up, maybe room crossing has bad timing etc
		}		

	} else if (!this._memory.reachedTarget && (this.room.name !== destinationRoom || this.pos.isNearExit(5))) {
		dest = pullIdlePosForRoom(destinationRoom);
		range = 3;
		this.travelTo(dest, {range: range, ignoreRoads: true,  roomCallback: avoidSKcreeps, preferHighway: true});
		
	} else {
		dest = pullIdlePosForRoom(caravan.origin);
		range = 3;
		this.travelTo(dest, {range: range, ignoreRoads: true,  roomCallback: avoidSKcreeps, preferHighway: true});
	}

	if (this.sumCarry === 0) {
		this.recycleOrSuicide();
	}
}



Creep.prototype.checkReturnCargo = function(currentRoom, targetRoom) {	


	for (let room in Memory.caravans) {
		if (currentRoom !== room) { continue; }
		for (let res in Memory.caravans[room]) {

			for (let dest in Memory.caravans[room][res]) {
				if (dest !== targetRoom) { continue; }

				this.memory.prevRoomOrigin = this.memory[C.ROOM_ORIGIN];
				this.memory.prevRoomTargetLookup = this.memory[C.ROOM_TARGET];
				this.memory.prevRes = this.memory.targetRes;
			}
		}
	}
}



Creep.prototype.getResource2 = function(res, amount = 0) {
	let role = "getResource";
	// CHECK IF OTHER ROLE ACTIVE	
	if (!this.checkRole(role)) {return 0;}	     
	// ASSIGN BUILD 		
	if (!this.memory[C.CLOSEST_TARGET]) { 
		if (!amount) {
			amount = this.store.getFreeCapacity()
		}
		let source = _.filter(this.room.findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
			function (structure) {
				return (structure.store[res] >= amount);
			});
		if (source.length === 0) { return 0; }
		let closestTarget = this.pos.findClosestByRange(source)
		if (closestTarget) {
			this.assignTarget(closestTarget.id, role, res); 
			this._memory.amount = Math.min(amount, this.store.getFreeCapacity(), closestTarget.store[res] );
		}
	}

	if (this.memory[C.CLOSEST_TARGET]) {
		return this.withdrawAction(this._memory.amount);
	}
}

	
// ROLE HAULER
Creep.prototype.roleResourceDeposit = function() {	
	let role = "roleResourceDeposit";
	// CHECK IF OTHER ROLE ACTIVE	
	if (!this.checkRole(role)) {return 0;}
	// ASSIGN BUILD 		
	if (!this.memory[C.CLOSEST_TARGET]) { 

		if (this.memory[C.TICKS_TO_TARGET] === undefined){				
			this.memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - this.ticksToLive
		}

		let carry = this.sumCarry
		let targets = _.filter(Game.rooms[this.memory[C.ROOM_TARGET]].findByType([STRUCTURE_STORAGE, STRUCTURE_TERMINAL]), 
				function(structure) {return (structure.freeSpace >= carry)
				});	
	
		if (targets.length > 0 ) { 
			let closestTarget = this.pos.findClosestByRange(targets)
			if(closestTarget) {
				this.assignTarget(closestTarget.id, role); 
			}
		}
				
		
	}
	if (this.memory[C.CLOSEST_TARGET]) { // MOVE TO TARGET			
        let targetObj = Game.getObjectById(this.memory[C.CLOSEST_TARGET]);
		if (!targetObj) {
			this.clearTarget()
			return 1
		}
		
		let value = ERR_NOT_IN_RANGE
		if (this.room.name === this.memory[C.ROOM_TARGET] && this.pos.inRangeTo(targetObj.pos, 1)) {
			value = this.transferAny(targetObj);
		}	
		
		if (value == ERR_NOT_IN_RANGE) {
			this.travelTo(targetObj, {allowSK: true, range: 1, ignoreCreeps: false, roomCallback: avoidSKcreeps}); 			
			if (this.memory[C.TRACK_DISTANCE] === undefined){				
				this.memory[C.TICKS_TO_TARGET] += 1;
			}
		} else if (value == ERR_INVALID_TARGET || value == ERR_FULL) {				
			this.clearTarget();
		
		//	delete this._cache.haulStorage
			return 0 				
		} else if (value == OK){
			this.memory[C.TRACK_DISTANCE] = 1
			this.clearTarget();
			
			if (this.memory[C.TICKS_TO_TARGET] !== undefined) {
				if (this.ticksToLive <= (this.memory[C.TICKS_TO_TARGET] * 2)+15) {
				//	console.log(this.room.name + " " + this + " I have nothing left ot live for! " +this.ticksToLive + " ticks left " +this.memory[C.TICKS_TO_TARGET] +" ticks to target"  )
					if (isGCLPraiseRoomStandby(this.room.name)) {
						this.recycleOrSuicide()
					} else {
						if (!this.haulerTypeGetNewRole() ) {
							this.recycleOrSuicide()
						}
						/*
						this.memory[C.ROLE] = "mover";
						this.memory[C.ROOM_ORIGIN] = this.room.name;
						this.memory[C.ROOM_TARGET] = this.room.name;
						*/
					}
					
					return 1
				}
			}
		} else {			
			console.log(this.name + " in "+ this.room.name + " roleResourceDeposit return " + value)
		}
		return 1
	}   
	return 0
}

/*

Creep.prototype.runSpawning = function(options) {
	if(!creep.spawning) {
		this.memory.state = options.nextState;	// Set the creeps new state
		this.run(this);	// Call the main run function so that the next state function runs straight away	
		return 
	}	

	if(!creep._memory.init) {
		creep._memory.init = true;
	}
}

Creep.prototype.runTravelTo = function(options) {

	if(creep.pos.getRangeTo(pos) <= 1) {
		this.memory.state = options.nextState;
		this.run(this);
	}	
	
	
}*/