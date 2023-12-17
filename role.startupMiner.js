'use strict'
/*
let roleStartupMiner = {

    /** @param {Creep} creep **/
 //   run: function(creep) {
        
        
Creep.prototype.runStartupMiner = function() {
	
		
	if (this.defensiveRetreatPath() ) { return; }
	
//	creep.manageState()
	
	if (!isCpuLimited() ) {
		this.doBucketBrigade();
	}

	this.manageStartupMinerState()

	if(this._memory[C.WORK]) {
		if (this.room.name !== this._memory[C.ROOM_ORIGIN]) {
			let dest = posDecompress(Memory.rooms[this._memory[C.ROOM_ORIGIN]].controller.pos, this._memory[C.ROOM_ORIGIN]);
			this.travelTo(dest, {allowSK:true, range:3, roomCallback: avoidSKcreeps})
		} else {
			this.checkClearWorkerTarget();
			
			if (!this.refillSpawnerContainers() ) {
				if (!this.roleRefillControllerContainer() ) {
					if (!this.roleHarvester() ) {
					//	if (getRoomPRCL(creep._memory[C.ROOM_ORIGIN]) < 4 || !creep.roleBuilder({buildOnly: true}) ) {
					//		if (getRoomPRCL(creep._memory[C.ROOM_ORIGIN]) >= 4 && !creep.roleHauler() ){
						if (!this.roleBuilder({buildOnly: true}) ) {
							if ((getRoomPRCL(this._memory[C.ROOM_ORIGIN]) >= 4 && !this.roleHauler()) || getRoomPRCL(this._memory[C.ROOM_ORIGIN]) < 4 ){		
								if (!this.giveAwayEnergy() ){
									if (!this.roleUpgrader() ){

									}
								}
							}
						}
					}
				}
			}
		}
	} else { 
		if (this._memory[C.SOURCE_ID]) {

			this.assignHauler(this._memory[C.SOURCE_ID], this._memory[C.ROOM_TARGET]);
			if (this.room.name !== this._memory[C.ROOM_TARGET]) {
				let dest = new RoomPosition(25, 25, this._memory[C.ROOM_TARGET])
				let range = 20;
				
				if (Memory.rooms[this._memory[C.ROOM_TARGET]] && 
					Memory.rooms[this._memory[C.ROOM_TARGET]].sources &&
					Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]]
					) {
					dest = posDecompress(Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]].pos, this._memory[C.ROOM_TARGET])
					range = 1;
				} else if (Game.rooms[this._memory[C.ROOM_TARGET]]) {
					dest = pullIdlePosForRoom(this._memory[C.ROOM_TARGET]);
					range = 2;
				}
				this.travelTo(dest, {allowSK:true, range: range, roomCallback: avoidSKcreeps})
			} else {
				this.getEnergyFromSource(this._memory[C.SOURCE_ID])
				
				this.passEnergyToNearbyStartupMiners(this._memory[C.SOURCE_ID]);					
			}			
		}			
	}
}


// module.exports = roleStartupMiner;



Creep.prototype.doBucketBrigade = function () {
	if (this._cache.bucketSwapTs === Game.time) { return; }	// If someone swapped with me already, abort

	if (this._cache.bucketSelfCheckTs === Game.time) {
		log("i was called again! " + this)
		return;
	}

	
	// find my next pos
//	if (!this._cache._trav || !this._cache._trav.path || this._cache._trav.path.length <= 1) { return; }
//	let nextDir = parseInt(this._cache._trav.path[1], 10);
	let nextDir = this.getNextDirFromPath();
	if (nextDir === undefined) { return; }
	let nextPos = this.pos.getPositionAtDirection(nextDir)


//	this.room.visual.circle(this.pos.x, this.pos.y , {fill: 'transparent', radius: 0.30, stroke: 'red'}) 
//	this.room.visual.circle(nextPos.x, nextPos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'}) 

	

	// check nearby creeps
	let nearbyCreeps = nextPos.lookForMyCreepsAround(0)
	let thisPathLength = 0;

	for (let creep of nearbyCreeps) {
		if (creep.id === this.id) { continue; }

		if (creep._memory[C.ROLE] !== this._memory[C.ROLE]) { continue; }

		if (creep._memory[C.WORK] === this._memory[C.WORK] && ((this._memory[C.SOURCE_ID] === undefined) === (creep._memory[C.SOURCE_ID] === undefined))) { continue; }



		if (creep._cache.bucketSwapTs === Game.time) { continue; }	

		if (this.store[RESOURCE_ENERGY] > 0 && creep.store[RESOURCE_ENERGY] > 0) { continue; }

		if (this.store.getCapacity(RESOURCE_ENERGY) !== creep.store.getCapacity(RESOURCE_ENERGY)) { continue; }

		if (this.forRoads() !== creep.forRoads() ) { continue; }

		// Check that the new creep that is heading out has enough ttl
		if (thisPathLength === 0) {
			thisPathLength = this._cache._trav.path.length;
		}

		let otherPathLength = 0;
		if (creep._cache._trav && creep._cache._trav.path) {
			otherPathLength = creep._cache._trav.path.length;

			let otherNextDir = creep.getNextDirFromPath()
		//	let otherNextDir = parseInt(creep._cache._trav.path[1], 10);			
			let otherNextPos = creep.pos.getPositionAtDirection(otherNextDir);
			if (!otherNextPos.isThisPos(this.pos) && otherNextPos.getRangeTo(this.pos) > 1 ) { continue; }

		}

		let newOutgoingCreep;
		let totalPathForOutgoingCreep = 0;
		if (this._memory[C.WORK]) {
			newOutgoingCreep = this;
			totalPathForOutgoingCreep = thisPathLength + (otherPathLength*2);			
		} else {
			newOutgoingCreep = creep;
			totalPathForOutgoingCreep = (thisPathLength*2) + otherPathLength;
		}

		if (newOutgoingCreep.ticksToLive < totalPathForOutgoingCreep + 50) { 
			continue; 
		}



		/*
		if (!creep._cache._trav || !creep._cache._trav.path || creep._cache._trav.path.length <= 1) { continue; }	// idle?
		if (creep._cache.travTick) {
			let ticksSinceTravel = Game.time - creep._cache.travTick;
			if (ticksSinceTravel === 1) {
				let nextDir = parseInt(this._cache._trav.path[1], 10);

		}*/
		
	//	this.room.visual.line(this.pos, creep.pos, { color: "blue", lineStyle: "solid" });

	//	this.room.visual.circle(creep.pos.x, creep.pos.y , {fill: 'transparent', radius: 0.3, stroke: 'yellow'})

		// bucket partner found!
		if (this._cache._trav) {
			delete this._cache._trav.path;
		}

		if (creep._cache._trav) {
			delete creep._cache._trav.path;
		}

		// transfer carry
		if (this._memory[C.WORK]) {
			this.transfer(creep, RESOURCE_ENERGY)
			creep.store[RESOURCE_ENERGY] = this.store[RESOURCE_ENERGY]
		} else {
			creep.transfer(this, RESOURCE_ENERGY)
			this.store[RESOURCE_ENERGY] = creep.store[RESOURCE_ENERGY]
		}

		// Swap memory and cache
		let otherMemory = _.cloneDeep(creep._memory);	
		let otherCache = _.cloneDeep(creep._cache);	
		let myMemory = _.cloneDeep(this._memory);
		let myCache = _.cloneDeep(this._cache);

		creep._memory = myMemory
		creep._cache = myCache;
		this._memory = otherMemory
		this._cache = otherCache

		delete this._cache.sleep
		delete creep._cache.sleep

		creep._cache.bucketSwapTs = Game.time
		this._cache.bucketSwapTs = Game.time

		
		if (this._memory[C.WORK]) {
			this.clearHauler()
		} else {
			this.assignHauler(this._memory[C.SOURCE_ID], this._memory[C.ROOM_TARGET]);			
		}

		if (creep._memory[C.WORK]) {
			creep.clearHauler()
		} else {
			creep.assignHauler(creep._memory[C.SOURCE_ID], creep._memory[C.ROOM_TARGET]);			
		}

		if (creep._cache.bucketSelfCheckTs === Game.time) {
			if (creep._memory[C.ROLE] === 'startupMiner') {
				creep.runStartupMiner();
			} else if (creep._memory[C.ROLE] === 'hauler') {
				creep.runHauler()
			}
		}
		break;
	}	

	this._cache.bucketSelfCheckTs = Game.time;
}



Creep.prototype.manageStartupMinerState = function () {

	if (this._cache.bucketSwapTs === Game.time) { return }
	
	if (this._cache.mstate !== undefined && this._memory[C.SOURCE_ID] && Game.time % 7 !== 0 ) {
		return true;
	}
	this._cache.mstate = 1;
	
	let total = 0;

	total = this.store.getUsedCapacity();
	let searchDelay = 9;

	if ((this._memory[C.WORK] || !this._memory[C.SOURCE_ID]) && total === 0 && this.carryCapacity > 0) {
		delete this._memory[C.WORK];
		this.clearTarget();
		
		if (!this._cache.targetTs || Game.time > this._cache.targetTs) {
			this._cache.targetTs = Game.time + searchDelay;
			this.clearHauler();
		
			let options = {}
			if (!this.setStartupMinerNextTargetSource(options) ) {
								
				this._memory[C.WORK] = 1;

				if (this.ticksToLive < 30) {
					this.recycleOrSuicide();
					return 1;
				}
				
				this.sleep(searchDelay);

				
				if (!options.lowTTL) {
					let spawner = this.memory[C.ROOM_ORIGIN];
					if (Memory.rooms[spawner].idleStartMiner === undefined){ Memory.rooms[spawner].idleStartMiner = 0; }
					Memory.rooms[spawner].idleStartMiner += searchDelay;
				}
				return false;
			} 
		}
	}
	
	if (!this._memory[C.WORK] && (total === this.carryCapacity)) {
		this._memory[C.WORK] = 1;
		this.clearTarget();
		this.clearHauler();
		return true;
	}

	if (!this._memory[C.WORK] && !this._memory[C.SOURCE_ID] && this.store[RESOURCE_ENERGY] > 0) {
		this._memory[C.WORK] = 1;
		this.clearTarget();
		this.clearHauler();
		return true;
	}
	
};


Creep.prototype.passEnergyToNearbyStartupMiners = function (sourceId) {
	let myEnergy = this.store[RESOURCE_ENERGY];
	if (!myEnergy || myEnergy < 5) {return 0; }

	let source = Game.getObjectById(sourceId)
	if (!source || source.room.name !== this.room.name || source.pos.getRangeTo(this) > 5) { return 0; }

	let nearbyCreeps = this.pos.lookForAnyCreepAround(1);
	let bestTarget;
	let bestCarryEnergy = 0;
	for (let idx in nearbyCreeps) {
		let _creep = nearbyCreeps[idx];
		if (!_creep.my || _creep._memory[C.ROLE] !== 'startupMiner') { continue; }

		let creepEnergy = _creep.store[RESOURCE_ENERGY];
		if (creepEnergy < myEnergy) { continue; }
		if (_creep.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) { continue; }

		if (creepEnergy > bestCarryEnergy) {
			bestCarryEnergy = creepEnergy;
			bestTarget = _creep;
		}
	}

	if (bestTarget) {
		let result = this.transfer(bestTarget, RESOURCE_ENERGY);
	}
}

function bestNearbyEnergyTarget(myId, creeps, minEnergyTransfer) {
	let bestNearby;
	let bestMissingEnergy = 0;

	for (let idx in creeps) {
		let _creep = creeps[idx];
		if (_creep.id === myId) { continue; }
		if (!_creep.my || (_creep._memory[C.ROLE] !== 'upgrader' && _creep._memory[C.ROLE] !== 'builder' && _creep._memory[C.ROLE] !== 'helper' && _creep._memory[C.ROLE] !== 'builderUpgrader')) { continue; }
		if (_creep._memory[C.ROLE] === 'upgrader' && !_creep._memory[C.STARTED]) { continue; }
		let freeCap = _creep.store.getFreeCapacity(RESOURCE_ENERGY);
		if (freeCap < minEnergyTransfer) { continue; }		

		
		if (freeCap > bestMissingEnergy) {
			bestMissingEnergy = freeCap;
			bestNearby = _creep;
		}
	}
	return bestNearby;
}

Creep.prototype.giveAwayEnergy = function (range=1) {

	let myEnergy = this.store[RESOURCE_ENERGY];
	if (!myEnergy) {return 0; }
	let minEnergyTransfer = Math.min(25, myEnergy)

	let nearbyCreeps = this.pos.lookForAnyCreepAround(1);
	let bestNearby = bestNearbyEnergyTarget(this.id, nearbyCreeps, minEnergyTransfer)

	if (bestNearby) {
		let result = this.transfer(bestNearby, RESOURCE_ENERGY);
		if (result === OK && !bestNearby._memory[C.WORK]) {
			delete bestNearby._cache.mstate;
		}
		return 1;
	} else if (range > 1) {
		nearbyCreeps = this.pos.lookForAnyCreepAround(range);
		bestNearby = bestNearbyEnergyTarget(this.id, nearbyCreeps, minEnergyTransfer)
		if (bestNearby) {
			this.travelTo(bestNearby, {range: 1, roomCallback: avoidSKcreeps})
		}
	}

	

	let containers = this.room.getControllerContainer();
	for (let idx in containers) {
		let container = containers[idx];
		if (!this.pos.isNearTo(container.pos)) { continue; }
		let freeCap = container.store.getFreeCapacity(RESOURCE_ENERGY);
		if (freeCap < minEnergyTransfer) { continue; }
		this.transfer(container, RESOURCE_ENERGY);
		delete this._cache.mstate;
	//	log(this + " transfering to " + container)
		return 1;
	}

	if (bestNearby) { return 1; }
}

Creep.prototype.setStartupMinerNextTargetSource = function (options = {}) {
	let spawner = this._memory[C.ROOM_ORIGIN];
	let mineOps = this.room.memory.remoteMineOps;
	let carryCapacity = this.carryCapacity
	let shortestRange = 250;

	let bestScore = -9999;
	let bestSource;
	let bestRoom;
	let bestRange;

	// Remote Sources
	for (let room in mineOps) {

		if (BOT_MODE && checkTraversedRoomsForHostiles(spawner, room) )  { continue; }

		if (Memory.rooms[room] && Memory.rooms[room].RCLreserved && Memory.rooms[room].RCLreserved.username !== Memory.username) { continue; }

		for (let sourceId in mineOps[room].sources) {

			let rangeToSource = mineOps[room].sources[sourceId].range;
			let roundtriptime = mineOps[room].sources[sourceId].range * 2 // - 20;
			shortestRange = Math.min(shortestRange, roundtriptime)

			if (roundtriptime > this.ticksToLive) { 
				options.lowTTL = true;
				continue; 
			}

			

			let source = Game.getObjectById(sourceId);

			let energyCap = SOURCE_ENERGY_NEUTRAL_CAPACITY;			
			let currentEnergy = SOURCE_ENERGY_NEUTRAL_CAPACITY;
			let maxExtractors = 3;
			let cd = 0;
			if (source) {
				
				if (source._cache.extractorTs && Game.time < source._cache.extractorTs) { continue; }
				cd = source.ticksToRegeneration
				currentEnergy = source.energy;
				energyCap = source.energyCapacity;
				maxExtractors = source.getNumberOfHarvestPos();
			} else if (global.havestPos[sourceId] && global.havestPos[sourceId].freeSpaces) {
				maxExtractors = global.havestPos[sourceId].freeSpaces;
			}

			let minersAtLocation = estimatedMinersAtArrival(sourceId, rangeToSource, source, maxExtractors)
			if (minersAtLocation >= maxExtractors) { 
			//	log(sourceId + " has miners " + minersAtLocation + "/" + maxExtractors)
				continue; 
			}

			let generatedEnergy = ((energyCap/ENERGY_REGEN_TIME) * rangeToSource);
			let energyHauled = getCurrentHaulCapForSource(sourceId);
			if (energyHauled > currentEnergy && cd > rangeToSource) { continue; }

			let energyAtArrival = Math.min(currentEnergy + generatedEnergy, energyCap) - energyHauled;
		
			let score = Math.min(energyAtArrival, carryCapacity) - rangeToSource;

			if (score > bestScore) {
				bestScore = score;
				bestSource = sourceId;
				bestRoom = room;
				bestRange = roundtriptime;
			}
		}
	}

	

	if (this.ticksToLive < shortestRange) {
		this.recycleOrSuicide();
		return false;
	}

	if (bestSource) {
		this.assignHauler(bestSource, bestRoom);

		if (!Memory.activeMines[bestSource]) { Memory.activeMines[bestSource] =  {} }
		Memory.activeMines[bestSource].ts = Game.time + 1250;

		if (Memory.rooms[spawner].wrkStartMiner === undefined){ Memory.rooms[spawner].wrkStartMiner = 0; }
		Memory.rooms[spawner].wrkStartMiner += bestRange;
		
		return true;
	} else {
		log("setStartupMinerNextTargetSource no source! my ttl " + this.ticksToLive)
	}
}



global.estimatedMinersAtArrival = function(sourceId, range, source, maxExtractors=3){

	if (!Memory.activeMines[sourceId]) { 
		if (sourceId ==="61294073d9af2043bb64988e") { 
			log("source " + sourceId + " not existing as active mine!");
		}
		return 0; 
	}
	if (Memory.activeMines[sourceId].haulers === undefined) { Memory.activeMines[sourceId].haulers = {}; }
	
	let myEta = range;	

	
	let currentEnergyInSource = SOURCE_ENERGY_NEUTRAL_CAPACITY;
	if (source) {
		currentEnergyInSource = source.energy;
	}

	let allCreeps = 0;
	let currentCreeps = 0;
	let creepCount = 0;

	let keys = Object.keys(Memory.activeMines[sourceId].haulers);

	if (sourceId ==="61294073d9af2043bb64988e") { 
		log("source " + sourceId + " has haulers " + JSON.stringify(keys));
	}

	for (let idx in keys) {
		let id = keys[idx]
		let creep = Game.getObjectById(id);
		if (!creep || creep._memory[C.WORK] || creep._memory[C.SOURCE_ID] !== sourceId) {
			delete Memory.activeMines[sourceId].haulers[id];
			if (sourceId ==="61294073d9af2043bb64988e") {
				log("deleting st " + creep + " id " + id)
			} 
			continue;
		}

		if (creep._memory[C.ROLE] !== 'startupMiner') {
			continue;
		}

		allCreeps++
			
		let creepTravelTime = range;
		if (source && creep.pos.getRangeTo(source) <= 5) {
			creepTravelTime = 0;
			currentCreeps++;
		} else if (creep._cache._trav && creep._cache._trav.path) {
			creepTravelTime = creep._cache._trav.path.length			
		}	

		let harvestPower = (creep.hasBodyparts(WORK) * HARVEST_POWER) || 1;
		let addTime = 0;
		
		let missingEnergy = creep.store.getFreeCapacity(RESOURCE_ENERGY)
		currentEnergyInSource -= missingEnergy;
		if (currentEnergyInSource <= 0) {
			addTime += source.ticksToRegeneration;
		}

		let timeToFill = missingEnergy/harvestPower;

		if (currentCreeps > maxExtractors) {
			harvestPower = harvestPower * (maxExtractors/creepCount);
			addTime += timeToFill * (currentCreeps/maxExtractors);
			creepCount++
		}
		
		if (sourceId ==="61294073d9af2043bb64988e") { 
			log("source " + sourceId + " myEta " + myEta + " creepTravelTime " + creepTravelTime+ " timeToFill " + timeToFill+ " addTime " + addTime + " allCreeps "+ allCreeps + "/" +maxExtractors+" creepCount when i arrive " + creepCount)
		}

		if (timeToFill + creepTravelTime + addTime + 10 < myEta) {			
			continue; 
			// check if these creeps can really finish in time
		}

		if (sourceId ==="61294073d9af2043bb64988e") { 
			log("source " + sourceId + " adding this creep " + creep + " has travel time " +creepTravelTime);
		}
		
		creepCount++
	}
	return creepCount;
}