'use strict'

Creep.prototype.runHauler = function() {
        	

	if (!this.defensiveRetreatPath() ) {
		if (Game.cpu.bucket < 750) { return; }

		if (this.sleep() ) {

			if (!isCpuLimited() ) {
			//	this.avoidTravelers()
			}
			return;
		}

		if (!isCpuLimited() ) {
			this.doBucketBrigade();
		}
		
		if (!this.manageHaluerState() ) { return; }
		
		if(this._memory[C.WORK]) {
			if (ENABLE_SPAWN_EXTENSIONS && Game.rooms[this._memory[C.ROOM_ORIGIN]].controller.level < 8) {
				if (!this.returnHome() ) {
					
					if (!this.refillSpawnerContainers() ) {
						if (!this.roleRefillControllerContainer() ) {
							if (!this.roleHauler(false, false) ){		
								if (!this.roleHarvester() ) {
									if (!this.giveAwayEnergy() ) {
										if (!this.dropAtStorageLocation() ) {	
											this.clearTarget()
										}
									}
								}
							}
						}
					}
				}
			} else {
				if (!this.roleHauler(false, false) ){
					if (!this.returnHome() ) {
						if (!this.refillSpawnerContainers() ) {
							if (!this.roleHarvester() ) {
								if (!this.roleRefillControllerContainer() ) {
									if (!this.dropAtStorageLocation() ) {

									}
								}
							}
						}
					}
				}
			}

			if (this._readyForNewWork && !this.fatigue) {
				if (this.setTargetSource() ) {
					delete this._cache.mstate;
					delete this._memory[C.WORK] 
					this.roleHaulerPickupV2();
				} else {
				//	this.avoidTravelers()
				}
			}

			
		} else {
			if (this._memory[C.SOURCE_ID]) {
				this.roleHaulerPickupV2();
			} else {
			//	this.avoidTravelers()
			}
		}

		/*
		if (!isCpuLimited() ) {
			this.doBucketBrigade();
		}
*/
	}
}

function registerIdleHauler(spawner, ticks=1) {
	if (Memory.rooms[spawner].idleHaul === undefined){ Memory.rooms[spawner].idleHaul = 0; }
	Memory.rooms[spawner].idleHaul += ticks;
}

Creep.prototype.manageHaluerState = function () {

	if (this._cache.bucketSwapTs === Game.time) { return true }
	
	if (this._cache.mstate !== undefined && this._memory[C.SOURCE_ID] && Game.time % 7 !== 0 ) {
		return true;
	}

	/*
	if (this._cache.mstate === undefined && this.store[RESOURCE_ENERGY] > 0 ) {
		this._memory[C.WORK] = 1;
		this.clearHauler();
		delete this._memory[C.SOURCE_ID];
	}*/

	this._cache.mstate = 1;
	
	let total = 0;

	total = this.store.getUsedCapacity();
	let searchDelay = 1;
	if (isCpuLimited() ) {
		searchDelay = 9;
	}
	

	if ((this._memory[C.WORK] || !this._memory[C.SOURCE_ID]) && total === 0 && this.carryCapacity > 0) {
		delete this._memory[C.WORK];
		this.clearTarget();		
		
		if (!this._cache.targetTs || Game.time > this._cache.targetTs) {
			this._cache.targetTs = Game.time + searchDelay;
			this.clearHauler();
		
			let options={}
			if (!this.setTargetSource(options) ) {
				
				let spawner = this._memory[C.ROOM_ORIGIN];
				
				if (!options.lowTTL) {
					registerIdleHauler(spawner, searchDelay)
				}

				this._memory[C.WORK] = 1;

				if (this.ticksToLive < 30) {
					this.recycleOrSuicide();
					return 1;
				}
				
				this.sleep(searchDelay);
				return false;
			} 
		}
	}
	
	if (!this._memory[C.WORK] && ((total >= this.carryCapacity - 5) || !this._memory[C.SOURCE_ID])) {
		
		let resType = this.resourceType;
		if (resType !== RESOURCE_ENERGY) {
			this._memory[C.RESOURCE_TYPE] = resType;
		} else {
			delete this._memory[C.RESOURCE_TYPE]
		}

		this._memory[C.WORK] = 1;
		delete this._memory.dropTarget;
		this.clearTarget();
	}


	return true;
};

	
Creep.prototype.setTargetSource = function (options={}) {

	let init = Game.cpu.getUsed();
	let spawner = this._memory[C.ROOM_ORIGIN];
	let mineOps = this.room.memory.remoteMineOps;

	let carryCapacity = this.carryCapacity
//	let mostEnergy = carryCapacity * 1.05;
	let mostEnergy = carryCapacity;
	let bestScore = 0;
	let bestSource;
	let bestRoom;
	let bestRange = 0;

	let creepForRoads = this.forRoads()

	let shortestRange = 150;

	let creepLowTTL = this._memory[C.LOW_TTL]
	
	// Local Sources
	for (let sourceId in Memory.rooms[spawner].sources) {	

		let source = Game.getObjectById(sourceId);
		
		let linkCap = 0;
		if (Memory.rooms[spawner].sources[sourceId].link) {
			let link = Game.getObjectById(Memory.rooms[spawner].sources[sourceId].link)
			if (link) {
				linkCap = link.getCapacity();
			}
		}

		let score = 0;
		let currentEnergy = 0;

		let container = source.getHarvesterContainer(spawner);

		let energyHauled = 0;
		let sourceExtensions = 0;
		if (container) {
			currentEnergy += container.store[RESOURCE_ENERGY];
			
			sourceExtensions = source.getSourceExtensions().length
			if ((linkCap || (ENABLE_SOURCE_EXTENSIONS && sourceExtensions)) && currentEnergy < this.carryCapacity) { continue; }
			energyHauled += container.withdraw;
		}

		if (Memory.rooms[spawner].sieged) {
			if (source && isOutsideWalls(source.getHarvesterPos(spawner))) {
				continue;
			}
		}

	//	if (!Memory.rooms[spawner].remoteSources[sourceId]) { continue; }	// no spawn yet for this source!

		
		let roadsPercentage = roadBuiltStatus(spawner, sourceId)
		let roadBuilt = roadsPercentage > 0.9;		
		
		let rangeToSource = 20
		if (Memory.rooms[spawner].remoteSources && Memory.rooms[spawner].remoteSources[sourceId]) {
			rangeToSource = Memory.rooms[spawner].remoteSources[sourceId].range;
		}

		let roundtriptime;
		if (!roadBuilt && creepForRoads) {
			roundtriptime = Math.ceil(rangeToSource * (2 + (1 - roadsPercentage)) + 20);
		} else {
			roundtriptime = Math.ceil(rangeToSource * 2 * 0.1);
		}


		shortestRange = Math.min(shortestRange, roundtriptime)
		if (roundtriptime > this.ticksToLive) {
			options.lowTTL = true;
			this._memory[C.LOW_TTL] = 1;
			continue; 
		}
	
		if ((!container && !linkCap) || currentEnergy >= 1500) {

			let pos = source.pos;
			let dist = 1;
			let top = limit(pos.y - dist, 0, 49);
			let left = limit(pos.x - dist, 0, 49);
			let bot = limit(pos.y + dist, 0, 49);
			let right = limit(pos.x + dist, 0, 49);

			let dropped = _.filter(Game.rooms[spawner].lookForAtArea(LOOK_RESOURCES, top, left, bot, right, true),
				function (c) {
					return (c.resource.energy >= 50);
				});

			for (let idx in dropped) {
				currentEnergy += dropped[idx].resource.energy - dropped[idx].resource.withdraw
			}
		}

		let generatedEnergy = 0;

		if (container) {
			generatedEnergy -= 250;	// some energy spent on repairs
			generatedEnergy -= container.withdraw
		} else {
			generatedEnergy -= rangeToSource;
		}


		if (!creepLowTTL && ((roadBuilt && !creepForRoads) || (creepForRoads && !roadBuilt))) {
			generatedEnergy -= 500;	// penalize to let creeps for roads go here first			
		} else if (source._cache.extractorTs && Game.time < source._cache.extractorTs) {		

			if (!creepLowTTL) { // scaled penalty
				if (!creepForRoads) {
					generatedEnergy -= roadsPercentage * 500;
				} else {
					generatedEnergy -= (1-roadsPercentage) * 500;
				}				
			}
			

			let miningRate = source._cache.harvestPower || 12;
			let ticksToDepletion = source.energy / miningRate;
			let ticksOfMining = rangeToSource
			if (ticksToDepletion < rangeToSource) {

				let ticksToConsider = rangeToSource
				ticksOfMining = ticksToDepletion
				ticksToConsider -= ticksToDepletion
				ticksToConsider -= source.ticksToRegeneration - ticksToDepletion

				if (ticksToConsider > 0) {
					ticksOfMining += ticksOfMining;
				}
			}

			generatedEnergy += Math.max(0, ticksOfMining) * miningRate;

			if (sourceExtensions) {
				generatedEnergy -= sourceExtensions * 100;
			}
			
			generatedEnergy -= 150;
			generatedEnergy -= linkCap;
		
			if (roomIsPowerSource(spawner) ) {
				let power = POWER_INFO[PWR_REGEN_SOURCE];
				let level = source.room.getPowerLevel(PWR_REGEN_SOURCE) || 0
				generatedEnergy += Math.ceil((power.effect[limit(level-1, 0, 4)] / power.period)  * rangeToSource );
			}			
		}		

	//	drawText(source.room.name, generatedEnergy, source.pos.x, source.pos.y, {color: 'red', font: 0.8});
		
		energyHauled += getCurrentHaulCapForSource(sourceId);

		let energyAtArrival = currentEnergy + generatedEnergy - energyHauled;

		if (energyAtArrival < mostEnergy) { continue; }

		score = Math.min(energyAtArrival, carryCapacity) - rangeToSource;
	
		if (score > bestScore) {
			bestScore = score;
			bestSource = sourceId;
			bestRoom = spawner;
			bestRange = rangeToSource;
		}
	}

	if (bestSource) {
		let used = Game.cpu.getUsed() - init;
	//	log(spawner + this + " found best haul local target! " + bestSource + " energyAtArrival " + mostEnergy + " already hauled " + getCurrentHaulCapForSource(bestSource, spawner) + " cpu "+ used.toFixed(2))
		this.assignHauler(bestSource, bestRoom);
		return true;
	}

	

	// Remote Sources
	let avoidPlayers = false;
	let repairedContainerHits = CONTAINER_HITS - 10000

	for (let room in mineOps) {

		if (!Memory.rooms[room] || Memory.rooms[room].hostiles) { continue; }
		
		if (!checkRoomIsActiveMine(room)) { continue; }
		
		if (!Game.rooms[room]) { continue; }
		if (BOT_MODE && checkTraversedRoomsForHostiles(spawner, room) )  { 

			if (Memory.rooms[room].isPlayer) {
				avoidPlayers = true;
			}
			continue;
		}

		let helper
		if (Memory.helpNeeded[room]) {			
			helper = true;
		}
		
		let addSkEnergy = 0;
		if (roomIsSk(room)) {
			addSkEnergy = SOURCE_KEEPER_DROP_ENERGY
		}
			
		for (let sourceId in mineOps[room].sources) {

			let roadsPercentage = roadBuiltStatus(spawner, sourceId)
			let roadBuilt = roadsPercentage > 0.9;
			
			let rangeToSource = mineOps[room].sources[sourceId].range;
			let roundtriptime;

			if (!roadBuilt && creepForRoads) {
				roundtriptime = Math.ceil(rangeToSource * (2 + (1 - roadsPercentage)) + 20);
			} else {
				roundtriptime = Math.ceil(rangeToSource * 2 + 20);
			}

			shortestRange = Math.min(shortestRange, roundtriptime)
			if (roundtriptime > this.ticksToLive) { 
				options.lowTTL = true;
				this._memory[C.LOW_TTL] = 1;
				continue;
			}
			
			let source = Game.getObjectById(sourceId);
			if (!source) { continue; }
			let pos = source.pos;

			let score = 0;
			let currentEnergy = 0;

			/*
			let pos = source.getHarvesterPos(spawner);
			let container = pos.lookForStructure(STRUCTURE_CONTAINER);
			*/

			let container = source.getHarvesterContainer(spawner);
			let constructingContainer;
			let repairingContainer;
			if (container) {
				currentEnergy += container.store[RESOURCE_ENERGY];
				pos = container.pos
				if (container.hits < repairedContainerHits) {
					repairingContainer = true;
				}
			} else {
				if (source._cache.containerConstructing) {
					let csite = Game.getObjectById(source._cache.containerConstructing)
					if (!csite){
						delete source._cache.containerConstructing;
					} else {
						constructingContainer = true;
					}
				}
			}
			


			if (addSkEnergy || !container || currentEnergy >= 1800) {
			
				let dist = 1;
				if (addSkEnergy) {
					dist = 5;
				}				

				let top = limit(pos.y - dist, 0, 49);
				let left = limit(pos.x - dist, 0, 49);
				let bot = limit(pos.y + dist, 0, 49);
				let right = limit(pos.x + dist, 0, 49);

				let dropped = _.filter(Game.rooms[room].lookForAtArea(LOOK_RESOURCES, top, left, bot, right, true),
					function (c) {
						return (c.resource.energy >= 100);
					});

				for (let idx in dropped) {
					currentEnergy += dropped[idx].resource.energy
				}
			}

			let generatedEnergy = 0;

			if (container) {
				generatedEnergy -= 250;	// some energy spent on repairs
			} else {
				generatedEnergy -= rangeToSource;
			}

			if (!creepLowTTL && ((roadBuilt && !creepForRoads) || (creepForRoads && !roadBuilt))) {
				generatedEnergy -= 1000;	// penalize to let creeps for roads go here first
			} else if (!constructingContainer && !repairingContainer && !helper && (source._cache.extractorTs && Game.time < source._cache.extractorTs)) {

				if (!creepLowTTL) { // scaled penalty
					if (!creepForRoads) {
						generatedEnergy -= roadsPercentage * 1000;
					} else {
						generatedEnergy -= (1-roadsPercentage) * 1000;
					}				
				}
			
				let miningRate = source._cache.harvestPower || 12;
				let ticksToDepletion = source.energy / miningRate;
				let ticksOfMining = rangeToSource
				if (ticksToDepletion < rangeToSource) {

					let ticksToConsider = rangeToSource
					ticksOfMining = ticksToDepletion
					ticksToConsider -= ticksToDepletion
					ticksToConsider -= source.ticksToRegeneration - ticksToDepletion

					if (ticksToConsider > 0) {
						ticksOfMining += ticksOfMining;
					}
				}

				generatedEnergy += Math.max(0, ticksOfMining) * miningRate;
				generatedEnergy -= 150


			}
			
			let energyHauled = getCurrentHaulCapForSource(sourceId);
			let energyAtArrival = currentEnergy + generatedEnergy - energyHauled;

			if (energyAtArrival < mostEnergy) { continue; }

			score = Math.min(energyAtArrival, carryCapacity) - rangeToSource;

			if (score > bestScore) {
				bestScore = score;
				bestSource = sourceId;
				bestRoom = room;
				bestRange = rangeToSource;
			}
		}
	}

	let used = Game.cpu.getUsed() - init;

	if (this.ticksToLive < shortestRange) {
	//	log(spawner + this + " low ttl " + this.ticksToLive + "/" + shortestRange);
		this.recycleOrSuicide();
		return false;
	}
	
	if (bestSource) {
	//	log(spawner + this + " found best haul target! " + bestSource + " in room " + bestRoom + " energyAtArrival " + mostEnergy + " already hauled " + getCurrentHaulCapForSource(bestSource, spawner) + " cpu "+ used.toFixed(2))
		this.assignHauler(bestSource, bestRoom);

		if (Memory.rooms[spawner].wrkHaul === undefined){ Memory.rooms[spawner].wrkHaul = 0; }
		Memory.rooms[spawner].wrkHaul += (bestRange * 2);
		return true;
	} else if (avoidPlayers) {
		if (Memory.rooms[spawner].roleHaulerAvoidPlayers === undefined){ Memory.rooms[spawner].roleHaulerAvoidPlayers = 0; }
		Memory.rooms[spawner].roleHaulerAvoidPlayers += 10;
	}
}



Creep.prototype.assignHauler = function (sourceId, targetRoom) {

	this._memory[C.SOURCE_ID] = sourceId;
	this._memory[C.ROOM_TARGET] = targetRoom;
	delete this._cache.containerId;

	if (!Memory.activeMines[sourceId]) { Memory.activeMines[sourceId] = {}; }
	if (!Memory.activeMines[sourceId].haulers) { Memory.activeMines[sourceId].haulers = {}; }

	if (Memory.activeMines && Memory.activeMines[sourceId] && Memory.activeMines[sourceId].haulers) {
		Memory.activeMines[sourceId].haulers[this.id] = {};	
	} else {
		log("missing active mine! " +sourceId + " in room " + targetRoom)
	}	
}

Creep.prototype.clearHauler = function () {

	if (this._memory[C.SOURCE_ID]) {
		if (Memory.activeMines && Memory.activeMines[this._memory[C.SOURCE_ID]] && Memory.activeMines[this._memory[C.SOURCE_ID]].haulers) {
			delete Memory.activeMines[this._memory[C.SOURCE_ID]].haulers[this.id];
		}
		delete this._memory[C.SOURCE_ID];
	}
	
	delete this._cache.cRm;
	delete this._memory[C.ROOM_TARGET];
	delete this._cache.containerId;
	delete this._cache.containerPos;
}

global.getCurrentHaulCapForSource = function(sourceId, cache){

	if (!Memory.activeMines[sourceId]) { return 0; }
	if (Memory.activeMines[sourceId].haulers === undefined) { Memory.activeMines[sourceId].haulers = {}; }
	
	let carry = 0;
	for (let id in Memory.activeMines[sourceId].haulers) {
		let creep = Game.getObjectById(id);
		if (!creep || creep._memory[C.SOURCE_ID] !== sourceId) {
			delete Memory.activeMines[sourceId].haulers[id];
			continue;
		}
		carry += creep.carryCapacity - creep.sumCarry;
	}
	return carry;
}


// ROLE HAULER PICKUP
Creep.prototype.roleHaulerPickupV2 = function () {
	let role = 'roleHaulerPickup';

	if (!this._cache.containerId || !this._cache.containerPos) {

		if (this._cache.offRoad === undefined && isCpuLimited() ) {
			this._cache.offRoad = this.canOffroad();
			this._cache.ignoreRoad = this.canIgnoreRoads();
		}

		let source = Game.getObjectById(this._memory[C.SOURCE_ID]);
		if (source) {
			let pos = source.getHarvesterPos(this._memory[C.ROOM_ORIGIN]);
			let target = pos.lookForStructure(STRUCTURE_CONTAINER);
			if (target) {
				this._cache.containerId = target.id;
				this._cache.containerPos = posCompress(target.pos);
				this._cache.cRm = target.room.name;
			} else {
				this._cache.containerPos = posCompress(pos);
				this._cache.cRm = this._memory[C.ROOM_TARGET];
			}
		}
	}

	if (this._cache.containerId && this._memory[C.ROOM_TARGET] !== this._cache.cRm) {
		this._memory[C.ROOM_TARGET] = this._cache.cRm
	}

	if (!this._memory[C.CLOSEST_TARGET]) {
		let rangeToContainer = 100;
		if (this.pos.roomName === this._memory[C.ROOM_TARGET]) {
			let container = Game.getObjectById(this._cache.containerId);
			if (container) {
				rangeToContainer = this.pos.getRangeTo(container);
			} else {
				let source = Game.getObjectById(this._memory[C.SOURCE_ID]);
				if (source) {
					let pos = source.getHarvesterPos(this._memory[C.ROOM_ORIGIN]);
					rangeToContainer = this.pos.getRangeTo(pos);
				} else {
					log(this + "invalid source? " + this._memory[C.SOURCE_ID] + " in room " + this._memory[C.ROOM_TARGET])
					this.clearTarget();
					this.clearHauler();
					return					
				}
			}
		}

		if (rangeToContainer < 5) {

			
			if (this._cache.pickupTs === undefined) {
				this._cache.pickupTs = Game.time + 37;
			}

			if (Game.time > this._cache.pickupTs) { 
				delete this._cache.pickupTs;
				this.clearTarget();
				this.say("noWork?")
			}

			let source = Game.getObjectById(this._memory[C.SOURCE_ID]);
		
			let minDroppedAmount = 10;
			if (isCpuLimited() ) {
				minDroppedAmount = 50;				
			}

			let droppedRange = 1;
			if (roomIsSk(source.room.name)) {
				droppedRange = 5;
			}
			
			let dropped = source.pos.findInRange(FIND_DROPPED_RESOURCES, droppedRange, {
				filter: (c) => {
					return (c.amount >= minDroppedAmount && c.resourceType === RESOURCE_ENERGY)
				}});
			if (dropped.length > 0) {
				let bestDrop
				let bestDropScore = Infinity;
				for (let idx in dropped) {

					if (dropped[idx].withdraw >= dropped[idx].amount) { continue; }
					let score = dropped[idx].amount;					
				
					if (score < bestDropScore) {	// low amount first, so it dont decays to zero (probably mined by smaller add creep?)
						bestDropScore = score
						bestDrop = dropped[idx]
					}
				}
				if (bestDrop) {
					this.assignTarget(bestDrop.id, role);
				}
			}
				
			if (!this._memory[C.CLOSEST_TARGET]) {

				dropped = source.pos.findInRange(FIND_TOMBSTONES, droppedRange, {
					filter: (c) => {
						return (c.store[RESOURCE_ENERGY] >= minDroppedAmount)
					}});  

				if (dropped[0] != undefined) {
					this.assignTarget(dropped[0].id, role);
				}
			}

			if (!this._memory[C.CLOSEST_TARGET]) {
				this.assignTarget(this._cache.containerId, role);
			}
		
		} else {

			let dest
			let range = 1; 
			if (this._cache.containerId && Game.getObjectById(this._cache.containerId) ) {
				dest = Game.getObjectById(this._cache.containerId).pos;
			} else if (this._cache.containerPos) {
				dest = posDecompressXY(this._cache.containerPos, this._cache.cRm);				
			} else if (Memory.rooms[this._memory[C.ROOM_TARGET]] && 
				Memory.rooms[this._memory[C.ROOM_TARGET]].sources && 
				Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]]
			) {
				dest = posDecompressXY(Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]].pos, this._memory[C.ROOM_TARGET])			
			} else {
				dest = {x: 25, y: 25, roomName: this._memory[C.ROOM_TARGET]};
				range = 20;
			}

			
			let useFutureRoads
			let returnData
			let ensurePath
			if (!isCpuLimited() && roadBuiltStatus(this._memory[C.ROOM_ORIGIN], this._memory[C.SOURCE_ID]) < 0.75) {
				useFutureRoads = true
				ensurePath= true,
				returnData = {}
			}

			this.travelTo(dest, { allowSK: true, range: range, ignoreRoads: this._cache.ignoreRoad, offRoad: this._cache.offRoad, roomCallback: avoidSKcreeps, returnData: returnData, useFutureRoads: useFutureRoads, ensurePath: ensurePath});

			if (useFutureRoads && returnData.pathfinderReturn && returnData.pathfinderReturn.path && this._cache.bucketSwapTs !== Game.time) {
				storeFutureRoads(returnData.pathfinderReturn.path, this._memory[C.SOURCE_ID])
			}

			return 1;
		}
	}

	if (this._memory[C.CLOSEST_TARGET]) { // MOVE TO TARGET	
		let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
		if (!targetObj) {
			this.clearTarget();
			return 0;
		}

		let value = ERR_NOT_IN_RANGE;
		let withdrawAmount = 0;
		if (this.pos.inRangeTo(targetObj.pos, 1)) {
			if (targetObj.resourceType) {
				value = this.pickup(targetObj);
				withdrawAmount = targetObj.amount;
			} else if (targetObj.isTombstone) {
				value = this.withdraw(targetObj, RESOURCE_ENERGY);
				withdrawAmount = targetObj.store[RESOURCE_ENERGY];
			} else {
				if (this._cache.wantedEnergy === undefined ) { this._cache.wantedEnergy = this.carryCapacity - this.sumCarry}
				if (targetObj.store[RESOURCE_ENERGY] >= this._cache.wantedEnergy) {
					value = this.withdraw(targetObj, RESOURCE_ENERGY);
					withdrawAmount = targetObj.store[RESOURCE_ENERGY];
					delete this._cache.wantedEnergy;
				} else {					
					this._cache.wantedEnergy -= 50;
					if (this._cache.wantedEnergy <= 0 ) { 
						delete this._cache.wantedEnergy;
						this.clearTarget();
						this.clearHauler();
						if (this.store[RESOURCE_ENERGY]) {
							this._memory[C.WORK] = 1;
						}
					} else {
						this.sleep(5);
					}						
				}
			}
		} else {

			let useFutureRoads
			if (!isCpuLimited() && roadBuiltStatus(this._memory[C.ROOM_ORIGIN], this._memory[C.SOURCE_ID]) < 0.75) {
				useFutureRoads = true
				
			}

			this.travelTo(targetObj, { allowSK: true, range: 1, ignoreRoads: this._cache.ignoreRoad, offRoad: this._cache.offRoad, roomCallback: avoidSKcreeps, useFutureRoads: useFutureRoads });
		
		}

		if (value == ERR_NOT_IN_RANGE) {
			// Do nothing
		} else if (value == OK) {
			this.clearTarget();
			delete this._cache.pickupTs;
			delete this._cache.wantedEnergy;

			if (this.store.getFreeCapacity(RESOURCE_ENERGY) <= withdrawAmount ) {
				this.returnHome(true);
				delete this._cache.mstate;
			} else {
				this._cache.mstate = 1;
			}
		} else {
			this.clearTarget();
			delete this._cache.pickupTs;
			delete this._cache.wantedEnergy;
		}
		return 1;
	}
	//registerIdleHauler(this._memory[C.ROOM_ORIGIN], 1);
	return 0;
};	