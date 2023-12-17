'use strict'
let roleMineralMover = {

    /** @param {Creep} creep **/
    run: function(creep) {
        
		if (creep.sleep() ){
			return 0;
		}
		
        creep.manageState();
		
		
		
        if (!creep.defensiveRetreatPath() ) {
			if(creep._memory[C.WORK]) {
				creep.roleMineralMover();

				if (!creep._cache.startedWorking) {
					creep.room.wakeCreepsOfRole('mineralMover');
					creep._cache.startedWorking = 1;
				}
			} else { 
				creep.roleMineralHaulerV2();
				delete creep._cache.startedWorking;
			}
		}
	}
};

module.exports = roleMineralMover;


// ROLE MINERAL HAULER
Creep.prototype.roleMineralHaulerV2 = function () {
	
	let source = Game.getObjectById(this._memory[C.SOURCE_ID]);
	let roomName = this.room.name

	if (source && roomName === source.room.name && this.pos.getRangeTo(source) <= 5) {
		// register hauler
		if (source.pos._cache.mineHaulers === undefined) { source.pos._cache.mineHaulers = {}; }
		source.pos._cache.mineHaulers[this.id] = {};
		
		// register travel time
		
		if (!this._memory[C.TICKS_TO_TARGET] && this._memory[C.ROOM_TARGET] === roomName) { 
			this._memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - this.ticksToLive; 
			this._memory.ticksToStore = this._memory[C.TICKS_TO_TARGET];

			let sourceId = this._memory[C.SOURCE_ID]
			

			if (Memory.deposits[roomName] && 					
				Memory.deposits[roomName].deposit[sourceId] && 
				Memory.deposits[roomName].deposit[sourceId].travelTime
			) {
				this._memory.ticksToStore = Memory.deposits[roomName].deposit[sourceId].travelTime
			} else if (Memory.rooms[roomName] &&
				Memory.rooms[roomName].remoteMine &&
				Memory.rooms[roomName].remoteMine[sourceId] &&
				Memory.rooms[roomName].remoteMine[sourceId].dist
				) {
				this._memory.ticksToStore = Memory.rooms[roomName].remoteMine[sourceId].dist
			} else if (Memory.rooms[this._memory[C.ROOM_ORIGIN]] &&
				Memory.rooms[this._memory[C.ROOM_ORIGIN]].remoteMine &&
				Memory.rooms[this._memory[C.ROOM_ORIGIN]].remoteMine[sourceId] &&
				Memory.rooms[this._memory[C.ROOM_ORIGIN]].remoteMine[sourceId].dist) {
				this._memory.ticksToStore = Memory.rooms[this._memory[C.ROOM_ORIGIN]].remoteMine[sourceId].dist
			}
		}


		// Check for other haulers nearby, decide who will withdraw
		// Check for minerals on miners and if above threshold
		// Assign withdraw target
		assignHaulersToMiners(source);
	}
	
	// withdraw from assigned target
	let working = false;
	if (this._memory[C.CLOSEST_TARGET]) {
		let target = Game.getObjectById(this._memory[C.CLOSEST_TARGET])
		if (target) { target._transferTs = Game.time; }
		this.withdrawAction(undefined, avoidSKcreeps);
		this.withDrawFromNearby();

		
		if (this._withdrawOk === Game.time && SEASONAL_THORIUM) {
			if (this._transfer === undefined) { this._transfer = 0; }
			let resType = this.resourceType || target._memory[C.RESOURCE_TYPE];
			this._transfer += Math.min(this.store.getFreeCapacity(resType), target.store[resType])
			
			if (this.store.getFreeCapacity(resType) > this._transfer) {
				assignHaulersToMiners(source, true);
				this.withdrawAction(undefined, avoidSKcreeps);
			} else {
			//	this.room.visual.text(this._transfer + "/" +this.store.getFreeCapacity(target._memory[C.RESOURCE_TYPE]), this.pos.x, this.pos.y, { color: 'red', font: 0.8 });
				this._memory[C.WORK] = 1;
				this.roleMineralMover();
				this.room.wakeCreepsOfRole('mineralMover');
			}
			
		}
		this.say("W")
		working = true;
		return;
	}

	// Get into range of source
	let dest;
	if (source) {
		dest = source.pos;
	} else if (Memory.rooms[this._memory[C.ROOM_TARGET]] &&
		Memory.rooms[this._memory[C.ROOM_TARGET]].mineral &&
		Memory.rooms[this._memory[C.ROOM_TARGET]].mineral[this._memory[C.SOURCE_ID]].pos
	) {
		dest = posDecompressXY(Memory.rooms[this._memory[C.ROOM_TARGET]].mineral[this._memory[C.SOURCE_ID]].pos, this._memory[C.ROOM_TARGET]);
	} else if (Memory.deposits && Memory.deposits[this._memory[C.ROOM_TARGET]] &&
		Memory.deposits[this._memory[C.ROOM_TARGET]].deposit[this._memory[C.SOURCE_ID]] &&
		Memory.deposits[this._memory[C.ROOM_TARGET]].deposit[this._memory[C.SOURCE_ID]].pos
	) {
		dest = Memory.deposits[this._memory[C.ROOM_TARGET]].deposit[this._memory[C.SOURCE_ID]].pos;
	}
	
	if (dest && this.pos.getRangeTo(dest) > 3) {
		this.travelTo(dest, { allowSK: true, range: 1, offRoad: true, roomCallback: avoidSKcreeps });	
		return;
	}

	
	if (!working) {
		let sleep = 1;
		if (source && source.cooldown) {
			sleep = source.cooldown;
		} else if (source && source.memory.cd && Game.time < source.memory.cd) {
			sleep = Math.min(source.memory.cd - Game.time + 1); 
		}
		this.yieldRoad(source);
		this.sleep(sleep);
	}
}

function assignHaulersToMiners(source, force = false) {
	if (source.pos._cache.mineralTs === Game.time && !force) { return; }

	source.pos._cache.mineralTs = Game.time;
	
	let resourceType = source.mineralType || source.depositType;

	let bestHauler;
	let lowFreeCap = Infinity;
	let dyingHauler;
	for (let id in source.pos._cache.mineHaulers) {
		let hauler = Game.getObjectById(id);

		if (!hauler || hauler.memory[C.WORK] || hauler.room.name !== source.room.name ) { 
			delete source.pos._cache.mineHaulers[id];			
			continue;
		}

		let ticksToReturn = hauler.memory.ticksToStore || hauler.memory[C.TICKS_TO_TARGET];
		if (SEASONAL_THORIUM && resourceType === RESOURCE_THORIUM) {
			ticksToReturn = Math.ceil((Math.max(1.2 * ticksToReturn, ticksToReturn + 25)) * thoriumAddedDecayTicks(hauler.store.getCapacity(RESOURCE_THORIUM) || 1));				
		}

		if (hauler.ticksToLive < ticksToReturn) {
			hauler.memory.dying = true;
		//	log(hauler.room.name + " dying hauler! " + hauler.ticksToLive +"/"+ticksToReturn + " normal path " + hauler.memory[C.TICKS_TO_TARGET])
			
			if (hauler.store[resourceType]) {
				hauler.memory[C.WORK] = 1;
				delete hauler._cache.mstate;
				dyingHauler = hauler;
			} else {
				hauler.suicide();
			}
			continue;
		}

		let freeCap = hauler.store.getFreeCapacity(resourceType)
		if (freeCap < lowFreeCap) {
			lowFreeCap = freeCap
			bestHauler = hauler;
		}
	}

	if (dyingHauler) {
		if (bestHauler && dyingHauler.id !== bestHauler.id) {
			bestHauler.assignTarget(dyingHauler.id, "mineralHauler", resourceType);
			return;
		} else {
			dyingHauler.memory[C.WORK] = 1;
			delete dyingHauler._cache.mstate;
		}
	}

	if (!bestHauler) { return; }

	let totalAmount = 0;
	let bestMiner
	let bestMinerFreeAmount = Infinity;

	let cd = source.lastCooldown || EXTRACTOR_COOLDOWN; 

	let tombstones = source.room.find(FIND_TOMBSTONES, {
		filter: (resource) => {
			return (resource.store[resourceType] > 0)
		}
	});

	let bestTombStone 
	for (let i=0; i < tombstones.length; i++ ) {
		if (bestHauler.pos.getRangeTo(tombstones[i]) > 7) { continue; }
		bestTombStone = tombstones[i];
	}

	if (bestTombStone) {
		bestHauler.assignTarget(bestTombStone.id, "mineralHauler", resourceType);
		return;
	}

	let miners = 0;
	for (let id in source.memory.miners) {
		let miner = Game.getObjectById(id);

		if (!miner) {
			delete source.memory.miners[id];
			if (Object.keys(source.memory.miners).length <= 0) { delete source.memory.miners; }
			
			continue;
		}
		miners++

		if (miner._transferTs === Game.time) { continue; }

		if (miner.store[resourceType] === 0) { continue; }

		let minerAmount = miner.store.getFreeCapacity(resourceType);
		if (minerAmount < bestMinerFreeAmount) {
			bestMinerFreeAmount = minerAmount;
			bestMiner = miner;
		}

		if (miner.ticksToLive < cd && miner.store[resourceType]) {
			bestMinerFreeAmount = 0;
			bestMiner = miner;
		}

		totalAmount += miner.store[resourceType];
	}

	if (bestMiner) {
		if (totalAmount > lowFreeCap || 
			bestHauler.store[resourceType] === 0 || 
			(bestMiner._cache.delayed && bestMiner.store[resourceType] > 0) || 
			(SEASONAL_THORIUM && resourceType === RESOURCE_THORIUM && bestMiner.store[RESOURCE_THORIUM])) {
			bestHauler.assignTarget(bestMiner.id, "mineralHauler", resourceType);
			return;
		} else if (bestMinerFreeAmount < bestMiner.getHarvestPower()) {
			bestHauler.assignTarget(bestMiner.id, "mineralHauler", resourceType);
			return;
		}
	} else if (miners === 0 && bestHauler.store[resourceType] > 0) {
		bestHauler._memory[C.WORK] = 1;
	}	
}

Creep.prototype.withDrawFromNearby = function() {
	if (!SEASONAL_THORIUM) {return; }
	let myId = this.id;
	let creeps = _.filter(this.pos.lookForMyCreepsAround(1), 
		function(c) {return (c.id !== myId && (c.store.getFreeCapacity(RESOURCE_ENERGY) < c.getHarvestPower() || c.store[RESOURCE_THORIUM] || c._cache.delayed) && c._memory[C.ROLE] === 'mineralExtractor'  )
	});	

	for (let idx in creeps) {
		let creep = creeps[idx];
		if (creep.id === this.id) { continue; }
		if (creep._transferTs === Game.time) { continue; }
		let result = creep.transfer(this, creep._memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY);
		if (result === OK) {
			if (this._transfer === undefined) { this._transfer = 0; }
			this._transfer += Math.min(this.store.getFreeCapacity(creep._memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY), creep.store[creep._memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY])
		}
		creep._transferTs = Game.time;
	}
}

// ROLE MINERAL HAULER
Creep.prototype.roleMineralHauler = function () {

	let miner = Game.creeps[this._memory.follow];
	if (miner === undefined || 			
		this.ticksToLive < this._memory[C.TICKS_TO_TARGET]
	) {
		let otherHauler = Game.creeps[this._memory.otherHauler];
		if (otherHauler && 
			this.ticksToLive < this._memory[C.TICKS_TO_TARGET] &&
			otherHauler.ticksToLive > this._memory[C.TICKS_TO_TARGET] && 
			otherHauler.carryCapacity - otherHauler.sumCarry >= this.sumCarry
		){
			this.transferAny(otherHauler);
			this.suicide();
			return 0;
		} else if (this.sumCarry > 0) {
			this._memory[C.WORK] = 1;
			return 0;
		}
	}

	if (!this._memory[C.TICKS_TO_TARGET] && this._memory[C.ROOM_TARGET] === this.room.name) { 
		this._memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - this.ticksToLive; 
	}

	if (miner && miner.memory[C.STARTED] && miner.room.name === this.room.name) {

		let rangeToMiner = this.pos.getRangeTo(miner);			
		if (rangeToMiner < 3) {
			let targetPos = miner.pos.pullSiegeFormation(this.pos);
			if (this.pos.getRangeTo(targetPos) > 0) {
				let obstacles = [];
				obstacles.push(miner.pos);
				this.travelTo(targetPos, { allowSK: true, ignoreCreeps: true, offRoad: true, range: 0, maxOps: 5000, roomCallback: avoidSKcreeps, obstacles: obstacles });
			}
		} else {
			this.travelTo(miner.pos, { allowSK: true, range: 1, offRoad: true, roomCallback: avoidSKcreeps });
		}

		if (rangeToMiner <= 1 &&
			(miner.sumCarry >= miner.carryCapacity - miner.getHarvestPower() ||
			miner.sumCarry >= this.carryCapacity - this.sumCarry ||
			miner.ticksToLive <= 5)
		) {
				
			let otherHauler = Game.creeps[this._memory.otherHauler];
			if (!otherHauler && (!this._cache.searchTs || Game.time > this._cache.searchTs)) {
				this._cache.searchTs = Game.time + 49;
				let myId = this.id;
				let sourceId = this._memory[C.SOURCE_ID];
				let haulers = this.room.find(FIND_MY_CREEPS, {
					filter: function(object) {
					return (object.memory[C.ROLE] === "mineralMover" &&
							object.id !== myId &&
							object.memory[C.SOURCE_ID] === sourceId);
						}});
				if (haulers.length > 0) {
					this._memory.otherHauler = haulers[0].name;
					otherHauler = haulers[0];
				}
			}

			if (!otherHauler || 
				otherHauler.pos.getRangeTo(miner) > 1 || 
				otherHauler.sumCarry <= this.sumCarry					
			) {
				let result
				if (ENABLE_FACTORIES){
					result = miner.transfer(this, Object.keys(miner.carry)[0]);
				} else {
					result = miner.transfer(this, Object.keys(miner.carry)[1]);
				}

				if (result === OK && this.sumCarry + miner.sumCarry < this.carryCapacity) {
				//	if (!Memory.deposits[this.room.name]) {
						this.sleep(5);
				//	}
				}
			} else {
				this.sleep(5);
			}
		}
	} else {
		let dest;
		let source = Game.getObjectById(this._memory[C.SOURCE_ID]);

		if (source) {
			dest = source.pos;
		} else if (Memory.rooms[this._memory[C.ROOM_TARGET]] &&
			Memory.rooms[this._memory[C.ROOM_TARGET]].mineral &&
			Memory.rooms[this._memory[C.ROOM_TARGET]].mineral[this._memory[C.SOURCE_ID]].pos
		) {
			dest = posDecompressXY(Memory.rooms[this._memory[C.ROOM_TARGET]].mineral[this._memory[C.SOURCE_ID]].pos, this._memory[C.ROOM_TARGET]);
		} else if (Memory.deposits && Memory.deposits[this._memory[C.ROOM_TARGET]] &&
			Memory.deposits[this._memory[C.ROOM_TARGET]].deposit[this._memory[C.SOURCE_ID]] &&
			Memory.deposits[this._memory[C.ROOM_TARGET]].deposit[this._memory[C.SOURCE_ID]].pos
		) {
			dest = Memory.deposits[this._memory[C.ROOM_TARGET]].deposit[this._memory[C.SOURCE_ID]].pos;
		} else {
			dest = pullIdlePosForRoom(this._memory[C.ROOM_TARGET])
		}
		
		if (dest) {				
			this.travelTo(dest, { allowSK: true, range: 2, offRoad: true, roomCallback: avoidSKcreeps });				
		}
	}
};