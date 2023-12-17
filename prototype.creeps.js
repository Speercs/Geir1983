'use strict'
module.exports = function () {

	Creep.prototype.isCreep = true; 

	Object.defineProperty(Creep.prototype, '_memory', {
        get: function() {            
            return Memory.creeps[this.name] = Memory.creeps[this.name] || {};
        },
        set: function(value) {            
            Memory.creeps[this.name] = value;
        },
		enumerable: false,
		configurable: true
    });

	Object.defineProperty(Creep.prototype, '_cache', {
        get: function() {            
            return global.creepsCacheMem[this.name] = global.creepsCacheMem[this.name] || {};
        },
        set: function(value) {            
            global.creepsCacheMem[this.name] = value;
        },
		enumerable: false,
		configurable: true
    });

	Object.defineProperty(PowerCreep.prototype, '_cache', {
        get: function() {            
            return global.creepsCacheMem[this.name] = global.creepsCacheMem[this.name] || {};
        },
        set: function(value) {            
            global.creepsCacheMem[this.name] = value;
        },
		enumerable: false,
		configurable: true
    });

	Object.defineProperty(Creep.prototype, 'sumCarry', {
		get: function () {
			if (this === Creep.prototype || this == undefined)
				return 0;

			if (!this._sumCarry) {
				this._sumCarry = 0;
				for (let e in this.carry) {
					if (this.carry[e] > 0) {
						this._sumCarry += this.carry[e];
						this._resourceType = e;
					}
				}
			//	this._sumCarry = _.sum(this.carry);
			}
			return this._sumCarry;
		},
		enumerable: false,
		configurable: true
	});

	Object.defineProperty(Creep.prototype, 'resourceType', {
		get: function () {
			if (this === Creep.prototype || this == undefined)
				return RESOURCE_ENERGY;

			if (!this._resourceType) {
				this._resourceType = RESOURCE_ENERGY; // IF UNDEFINED
			//	if (this.carry[RESOURCE_ENERGY] === 0) {
					for (let e in this.carry) {
						if (this.carry[e] > 0) {
							this._resourceType = e;
						//	break;
						}
					}
			//	}
			}
			return this._resourceType;
		},
		enumerable: false,
		configurable: true
	});

	Creep.prototype.moverGoToWork = function () {

		if (this._withdrawOk === Game.time - 1 &&
			!this._memory[C.WORK] &&
			!this._memory[C.ASSIGNED_ROLE] &&
			this.sumCarry >= this.carryCapacity * 0.75 
		) {
			if (this.room.storage && this.getRangeTo(this.room.storage) < 7 ) { return; }
			this._memory[C.WORK] = 1;
			log(this + " going to work! has " + this.sumCarry +"/" +this.carryCapacity)
		}
	}

	Creep.prototype.fillerCrane = function() {
		       

		let cranePos = posDecompressXY(this._memory.fillPos, this._memory[C.ROOM_ORIGIN])
		if (cranePos && !this.pos.isThisPos(cranePos)){
			if (!this.hasBodyparts(MOVE) ) {
				this.suicide()
				return;
			}
			this.craneMoveToPos(cranePos);

			if (this.pos.getRangeTo(cranePos) === 1) {
				this.checkFillerPosEnergy();
			}
			return;
		} 

		if (this.sleep() && !this._cache.emptyLink ) { return; } 

		if (this.store[RESOURCE_ENERGY] < 50 || this._cache.emptyLink) {
			
			if (!this.checkFillerPosEnergy() ) {
				if (!this.fillerCraneGetEnergyFromLink() ) {
					if (!this.fillerCraneGetEnergyFromContainer() ) {
						if (!this.stealFromNearbyCreeps() ) {
							this.sleep(3)
						}						
					}
				}
			}
		} else {
			
			if (!this.refillSpawnExtensions() ) {
				if (!this.fillerCraneFillContainer() ) {
					this.sleep(3)
				}					
			}
		}
	}

	Creep.prototype.stealFromNearbyCreeps = function() {

		let myId = this.id;
		let creeps = _.filter(this.pos.lookForMyCreepsAround(1), 
			function(c) {return (c.id !== myId && c.store[RESOURCE_ENERGY] > 0  )
		});	

		if (creeps.length) {
			creeps[0].transfer(this, RESOURCE_ENERGY)
			return true;
		}	
	}

	Creep.prototype.scoopNearbyEnergy = function() {

		let dropped = this.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { 
			filter: (resource) => {
				return (resource.amount > 0 &&
					resource.resourceType === RESOURCE_ENERGY);
			}
		});

		if (dropped.length) {
			for (let idx in dropped) {
				let drop = dropped[idx]
			//	if (drop._scooped) { continue; }
				this.pickup(drop)
				drop._scooped = true;
				delete this._cache.mstate;
				return true;
			}
		}

		let tombstones = this.pos.findInRange(FIND_TOMBSTONES, 1, {
			filter: (c) => {
				return (c.store[RESOURCE_ENERGY] > 0)
			}});
		if (tombstones.length) {

			for (let idx in tombstones) {
				let stone = tombstones[idx]
				if (stone._scooped) { continue; }
				this.withdraw(stone, RESOURCE_ENERGY)
				stone._scooped = true;
				delete this._cache.mstate;
				return true;
			}			
		}
	}

	Creep.prototype.checkFillerPosEnergy = function() {
		
		if (this._cache.checkedFiller) { return false; }
		let tombstones = this.pos.findInRange(FIND_TOMBSTONES, 1, {
			filter: (c) => {
				return (c.store[RESOURCE_ENERGY] > 0)
			}});
		if (tombstones.length) {
			this.withdraw(tombstones[0], RESOURCE_ENERGY)
			return true;
		}

		let dropped = this.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { 
			filter: (resource) => {
				return (resource.amount > 0 &&
					resource.resourceType === RESOURCE_ENERGY);
			}
		});
		if (dropped.length) {
			this.pickup(dropped[0])
			return true;
		}
		this._cache.checkedFiller = 1;
	}

	Creep.prototype.refillSpawnExtensions = function() {

		
		
		let currentEnergy = this.store[RESOURCE_ENERGY]

		let extensions = this.pos.getSpawnFillerExtensions();
		let spawnLink = getSpawnLinkPos(this.room.name);
		let bestScore = 0;
		let bestExtension;
		
		for (let idx in extensions) {
			let ext = extensions[idx];
			
			ext.pos._cache.craneTs = Game.time + 73;

			let missingEnergy = ext.store.getFreeCapacity(RESOURCE_ENERGY) - (ext._transfer || 0)
			if (missingEnergy <= 0) { continue; }
			let rangeFromLink = ext.pos.getRangeTo(spawnLink) || 0;

			let canFill = Math.min(currentEnergy, missingEnergy);
			let score = canFill + rangeFromLink;

			if (score > bestScore) {
				bestScore = score;
				bestExtension = ext;				
			}
		}

		if (bestExtension) {
			this.transfer(bestExtension, RESOURCE_ENERGY)
			bestExtension._transfer = currentEnergy;
			return true;
		}

		let spawns = this.pos.findInRange(FIND_MY_STRUCTURES, 1, {
			filter: (structure) => {
				return (structure.structureType == STRUCTURE_SPAWN);
			}
		});

		let spawnReqMissing = 0;
		if (this.room._cache._spawnRefresh) {
			if (this.room.storage && Game.time < this.room.memory._spawnRefres) {
				spawnReqMissing = Math.min(200, currentEnergy)
			} else {
				delete this.room._cache._spawnRefresh;
			}				
		}

		for (let idx in spawns) {
			let spawn = spawns[idx]			
			spawn.pos._cache.craneTs = Game.time + 73;

			/*
			if (extensions.length <= 0) {
				if (spawn.store.getFreeCapacity(RESOURCE_ENERGY) < this.store[RESOURCE_ENERGY] && (!spawn.spawning || spawn.spawning.remainingTime > 1)) {
					continue;
				}
			}*/

			if (spawn.store.getFreeCapacity(RESOURCE_ENERGY) - (spawn._transfer || 0) > spawnReqMissing) {
				this.transfer(spawn, RESOURCE_ENERGY)
				spawn._transfer = currentEnergy;				
				return true;
			}
		}

	}

	Creep.prototype.fillerCraneFillContainer = function() {
		if (this._cache.energyFrom === STRUCTURE_CONTAINER) { return 0; }

		if (!this._cache.containerId) {
			let containers = this.room.getSpawnContainers()
			for (let idx in containers) {
				if (this.pos.isNearTo(containers[idx])) {

					this._cache.containerId = containers[idx].id;
					break;
				}
			}
		}

		if (this._cache.containerId) {
			let container = Game.getObjectById(this._cache.containerId)
			if (!container) {
				this._cache.containerId = null;
				this.room.getSpawnContainers(true);
				return 0;
			}
			let spawnLink = Game.getObjectById(getSpawnLink(this.room.name));
			
			if (spawnLink && spawnLink.energy > 50 && container.store.getFreeCapacity(RESOURCE_ENERGY) >= 50){
				this.transfer(container, RESOURCE_ENERGY)				
				return 1;
			} else {
				delete this._cache.energyFrom;
			}
		}
	}

	Creep.prototype.fillerCraneGetEnergyFromLink = function() {
		let spawnLink = Game.getObjectById(getSpawnLink(this.room.name));
		if (!spawnLink) { return; }
		if (spawnLink.energy > 50) {
			this.withdraw(spawnLink, RESOURCE_ENERGY)
			spawnLink.pos._cache.tsLinkWithdraw = Game.time + 2;
			this._cache.energyFrom = STRUCTURE_LINK;
			delete this._cache.emptyLink;
			return 1;
		}
	}

	Creep.prototype.fillerCraneGetEnergyFromContainer = function() {

		if (!this._cache.containerId) {
			let containers = this.room.getSpawnContainers()
			for (let idx in containers) {
				if (this.pos.isNearTo(containers[idx])) {

					this._cache.containerId = containers[idx].id;
					break;
				}
			}
		}

		if (this._cache.containerId) {
			let container = Game.getObjectById(this._cache.containerId)
			if (!container) {
				this._cache.containerId = null;
				this.room.getSpawnContainers(true);
				return 0;
			}
			if (container.store[RESOURCE_ENERGY] >= 50){
				this.withdraw(container, RESOURCE_ENERGY)
				this._cache.energyFrom = STRUCTURE_CONTAINER
				return 1;
			}
		}
	}

	

	Creep.prototype.medic = function () {

		if (this._cache.medicTs === undefined) { this._cache.medicTs = 0; } // room ts instead?

		if (!this._cache.medicTarget && this._cache.medicTs < Game.time && this.hasBodyparts(HEAL)) {
			this._cache.medicTs = Game.time + 27;
			let damaged = this.room.find(FIND_MY_CREEPS, {
				filter: function (c) {
					return (c.hits < c.hitsMax);
				}
			});

			if (damaged.length > 0) {
				this._cache.medicTs = Game.time + 7;
				let bestTarget
				let bestScore = -9999;
				for (let target in damaged) {
					let creep = damaged[target];
					let score = creep.hitsMax - creep.hits;
					score -= this.pos.getRangeTo(creep) * 10;
					if (creep.isCombatCreep() ) {
						score += calcSingleCreepStrength(creep);
					}
					if (score > bestScore) {
						bestScore = score;
						bestTarget = creep.id;
					}
				}

				this._cache.medicTarget = bestTarget;
			}
		}

		if (this._cache.medicTarget) {
			let medicTarget = Game.getObjectById(this._cache.medicTarget)
			if (!medicTarget || medicTarget.hits === medicTarget.hitsMax) {
				delete this._cache.medicTarget;
				return 0;
			}

			this.travelTo(medicTarget.pos, {range: 1})
			this.healInRange();
			return 1;
		}
	}


	

	Creep.prototype.moverManageState = function () {
		if (this._cache.mstate !== undefined && Game.time % 7 !== 0) {
			return 
		}

		let total = this.store.getUsedCapacity();

		if (this._memory[C.WORK] && total === 0 && this.carryCapacity > 0) {
			delete this._memory[C.WORK];

			if (this._memory[C.ASSIGNED_ROLE]) { 
				if (this._memory._targets) {
					this.clearAllTargets()
				}
				this.clearTarget();
			}
		}

		if (!this._memory[C.WORK] && (total === this.carryCapacity)) {
			let resType = this.resourceType;
			if (resType !== RESOURCE_ENERGY) {
				this._memory[C.RESOURCE_TYPE] = resType;
			} else {
				delete this._memory[C.RESOURCE_TYPE]
			}

			this._memory[C.WORK] = 1;
			this.say("work")

			if (this._memory[C.ASSIGNED_ROLE]) {
				if (this._memory._targets) {
					this.clearAllTargets()
				}
				this.clearTarget();
			}
		}

		if (this._cache.mstate === undefined) {
			let resType = this.resourceType;
			if (resType !== RESOURCE_ENERGY) {
				this._memory[C.RESOURCE_TYPE] = resType;
			} else {
				delete this._memory[C.RESOURCE_TYPE]
			}
		}

		this._cache.mstate = 1;
	}


	Creep.prototype.manageState = function () {

		if (this._cache.mstate !== undefined && Game.time % 7 !== 0) {
			return
		}

		let total = this.store.getUsedCapacity();

		if (this._memory[C.WORK] && total === 0 && this.carryCapacity > 0) {
			delete this._memory[C.WORK];

			if (this._memory[C.ASSIGNED_ROLE]) { 
				this.clearTarget();
			}
		}

		if (!this._memory[C.WORK] && (total === this.carryCapacity)) {

			let resType = this.resourceType;
			if (resType !== RESOURCE_ENERGY) {
				this._memory[C.RESOURCE_TYPE] = resType;
			} else {
				delete this._memory[C.RESOURCE_TYPE]
			}
			
			this._memory[C.WORK] = 1;
			this.say("work")

			if (this._memory[C.ASSIGNED_ROLE]) { 
				this.clearTarget();
			}
		}

		this._cache.mstate = 1;
	};



	Creep.prototype.performAssignedRole = function () {
		if (this._memory[C.ASSIGNED_ROLE]) {
			return this[this._memory[C.ASSIGNED_ROLE]]();
		}
	}

	// CHECK ROLE
	Creep.prototype.checkRole = function (role) {
		if (!this._memory[C.ASSIGNED_ROLE] || this._memory[C.ASSIGNED_ROLE] === role) {
			return 1;
		}
		else {
			return 0;
		}
	};
	
	// ASSIGN TARGET
	Creep.prototype.assignTarget = function (id, role, resource) {
		
		let object = Game.getObjectById(id);
		if (object) {
			if (this._memory[C.WORK]) {
				object.deliver = this.carry[resource || RESOURCE_ENERGY];
			} else {				
				object.withdraw = this.carryCapacity - this.sumCarry;				
			}
		}
		
		this._memory[C.CLOSEST_TARGET] = id;
		this._memory[C.ASSIGNED_ROLE] = role;
		if (resource && resource !== RESOURCE_ENERGY) {
			this._memory[C.RESOURCE_TYPE] = resource
		}
	};

	Creep.prototype.assignMultiTarget = function (object, role, resource, amount=undefined, jobId = undefined) {
		
		if (object) { 
			if (this._memory[C.WORK]) {				
				object.deliver = this.carry[resource || RESOURCE_ENERGY];				
			} else {				
				object.withdraw = this.carryCapacity - this.sumCarry;				
			}
		}

		if (this._memory._targets === undefined) { this._memory._targets = []; }
		this._memory._targets.push( { id: object.id, [C.ASSIGNED_ROLE]: role, res: resource, amount: amount, jobId: jobId } );
	}

	//CLEAR TARGET
	Creep.prototype.clearTarget = function () {

		if (this._memory[C.CLOSEST_TARGET]) {
			let object = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (object) {
				if (this._memory[C.WORK]) {
					object.deliver = -this.carryCapacity;
				} else {
					object.withdraw = -this.carryCapacity;
				}
			}
		}

		let prevId = this._memory[C.CLOSEST_TARGET]
		delete this._memory[C.CLOSEST_TARGET];
		delete this._memory[C.ASSIGNED_ROLE];
		delete this._memory[C.RESOURCE_TYPE];
		delete this._cache.mstate; // flag to manage state
		this.clearMultiTarget(prevId);
	};

	Creep.prototype.clearAllTargets = function () {
		while (this._memory._targets) {
			if (this._memory[C.CLOSEST_TARGET]) {
				let object = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);				
				if (object) {
					if (this._memory[C.WORK]) {
						object.deliver = -this.carryCapacity;
					} else {
						object.withdraw = -this.carryCapacity;
					}
				}
			}
			let prevId = this._memory[C.CLOSEST_TARGET]
			delete this._memory[C.CLOSEST_TARGET];
			delete this._memory[C.ASSIGNED_ROLE];
			delete this._memory[C.RESOURCE_TYPE];
			this.clearMultiTarget(prevId);
		}	
	};

	Creep.prototype.clearMultiTarget = function(prevId) {
		if (!this._memory._targets) { return; }

		let idx = _.findIndex(this._memory._targets, { 'id': prevId });
		this._memory._targets.splice(idx, 1); 
		if (this._memory._targets.length === 0) {
			delete this._memory._targets;
			return;
		}
		this.checkCurrentTarget();
	}

	Creep.prototype.checkCurrentTarget = function () {
		
		if (this._memory._targets !== undefined && this._memory._targets.length > 0) {

			let bestIdx = 0;
			let bestRange = Infinity;
			
			for (let idx in this._memory._targets) {
				let obj = Game.getObjectById(this._memory._targets[idx].id);
				if (!obj) { continue; }
				let distance = this.pos.getRangeTo(obj)
				if (distance < bestRange) {
					bestRange = distance;
					bestIdx = idx;
					if (distance <= 1) { break; }
				}				
			}

			this._memory[C.CLOSEST_TARGET] = this._memory._targets[bestIdx].id;
			this._memory[C.ASSIGNED_ROLE] = this._memory._targets[bestIdx][C.ASSIGNED_ROLE];
			this._memory[C.RESOURCE_TYPE] = this._memory._targets[bestIdx].res;
			this._memory.amount = this._memory._targets[bestIdx].amount;
			this._memory.jobId = this._memory._targets[bestIdx].jobId;

		}
	}

	Creep.prototype.recordTicksFromLabToWork = function (end) {
		
		if (this._memory[C.TICKS_FROM_LAB] !== undefined) { return; }

		if (!this._memory.startTick) {
			this._memory.startTick = Game.time;
		}

		if (end) {
			this._memory[C.TICKS_FROM_LAB] = Game.time - this._memory.startTick + end;
			delete this._memory.startTick;
		}
	}

	Creep.prototype.getHarvestPower = function () {
		if (this._cache.getHarvestPower === undefined) {
			this._cache.getHarvestPower = this.hasBodyparts(WORK) * HARVEST_MINERAL_POWER;
		}	
		return this._cache.getHarvestPower
	}

	Creep.prototype.getHarvestEnergyPower = function () {
		if (this._cache.getHarvestEnergyPower === undefined) {
			this._cache.getHarvestEnergyPower = this.hasBodyparts(WORK) * HARVEST_POWER;
		}	
		return this._cache.getHarvestEnergyPower
	}

	
	Creep.prototype.refreshTTLdefender = function () {
		if (!this._memory.PRCL || !this.room.memory.sieged) { return false; }
		
		if (this.room.store(RESOURCE_ENERGY) < 2000) { 
			delete this._memory.refreshing;
			return false; 
		}
		if (this.ticksToLive < 65) { this._memory.refreshing = true; }
		if (!this._memory.refreshing) {return false; }

		let spawns = this.room.findByType(STRUCTURE_SPAWN)
		if (spawns.length === 0) { return false; }
		
		let idleSpawns = _.filter(spawns, (c) => !c.spawning );

		if (idleSpawns.length === 0) {
			let nextIdle = Infinity;
			for (let idx in spawns) {
				let spawn = spawns[idx];
				if (spawn.spawning) {
					nextIdle = Math.min(nextIdle, spawn.spawning.neededTime )
				}
			}
			if (nextIdle > this.ticksToLive) { return false; }
		}
		let requiredTTL = CREEP_LIFE_TIME - Math.floor(600/this.body.length);

		if (this.ticksToLive < requiredTTL) {
			// MOVE TO A SPAWN

			if (idleSpawns.length) {
				if (this.pos.getRangeTo(idleSpawns[0]) <= 1) {
					idleSpawns[0].renewCreep(this);	
				} else {
					this.travelTo(idleSpawns[0].pos.pullSiegeFormation(this.pos), {ignoreCreeps: true, range: 0});
				}
			} else {
				this.travelTo(spawns[0].pos, {ignoreCreeps: true, range: 2});
			}
			
			return true;
		}
		delete this._memory.refreshing;
		return true;

	}

	Creep.prototype.timeToHeadBackForUnBoost = function () {
		if (!this._memory[C.BOOSTED]) { return 0; }
		let ticksToLab = this._memory[C.TICKS_FROM_LAB] || 35;
		if (ticksToLab > 300) { return false; }
		if (this.ticksToLive < ticksToLab + 15) { return true; }
	}

	Creep.prototype.unBoost = function () {

		if (!this._memory[C.BOOSTED]) { return 0; }
		if (this.room.hasLabs() <= 0) { return 0; }

		let role = 'unboost'
		// ASSIGN
		if (!this._memory.unboostTarget) {

			let allLabs = [];
			allLabs = allLabs.concat(this.room.getOutputLabs(false));
			allLabs = allLabs.concat(this.room.getInputLabs(false));
			
			for (let idx in allLabs) {
				let lab = allLabs[idx];
				if (lab.memory.unboost) { continue; }
				if (!lab.cooldown || lab.cooldown < this.ticksToLive) {
					this._memory.unboostTarget = lab.id;
					lab.memory.unboost = Game.time + this.ticksToLive;
					break;
				}
			}
		}

		if (this._memory.unboostTarget) {
		//	console.log(this.room.name + " UNBOOSTING")
			let targetObj = Game.getObjectById(this._memory.unboostTarget);
			if (!targetObj) { 
				this.clearTarget(); 
				delete this._memory.unboostTarget;
				return;
			}
			let rangeToTarget = this.pos.getRangeTo(targetObj);
			if (rangeToTarget > 1) {
				if (this._memory.engine) {
					let engine = Game.getObjectById(this._memory.engine);
					if (!engine) { return; }
					engine.engine(this, targetObj.pos);
				} else {
					this.travelTo(targetObj, { range: 1 });
				}
				
				return 1;
			} else if (targetObj.cooldown) {
				if (targetObj.cooldown > this.ticksToLive) {
					this.clearTarget();
				}
				return 1;
			}

			console.log("attempting to unboost on " + targetObj)
			let result = targetObj.unboostCreep(this);
			if (result === OK) {			
				targetObj.room._cache.unboosted = Game.time;
				this.recycleOrSuicide();
				return 1;
			} else {
				this.clearTarget();
				console.log(this.room.name +" error " + result +" unBoosting on creep " + this.name + " target " + targetObj);
				this.recycleOrSuicide();
				return 0;
			}
		} 
	}

	

	Creep.prototype.recycleOrSuicide = function (forceAtSpawn = false) {
		let spawns = this.pos.lookForStructuresAround(STRUCTURE_SPAWN, 1);
		if (spawns.length > 0) {
			let result = spawns[0].recycleCreep(this);
			if (result === OK) {
				this.clearTarget();
				return true;
			} else {
				this.clearTarget();
				this.suicide();
				return true;
			}
		} else {

			if (!isCpuLimited() || forceAtSpawn) {
				let recycleRoom;
				if (this.room.controller && this.room.controller.my) {
					recycleRoom= this.room.name;
				} else {
					let closeRooms = getMyClosestRooms(this.room.name, 1, 0, 9);
					if (Object.keys(closeRooms).length > 0){
						recycleRoom = Object.keys(closeRooms)[0];
					}
				}

				if (recycleRoom && Game.rooms[recycleRoom]) {
					
					spawns = Game.rooms[recycleRoom].findByType(STRUCTURE_SPAWN)
					let eta = 150;
					if (spawns.length > 0) {
						let pathToDeposit = findTravelPath(this.pos, spawns[0],
							{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:50000});
						if (!pathToDeposit.incomplete) {
							eta += pathToDeposit.path.length;
						} else {
							eta += Infinity
						}
					}

					if (eta < this.ticksToLive) {
						log(this + " recycling in room " + recycleRoom + " eta " + eta +"/" + this.ticksToLive);
						this.clearTarget();
						this._memory[C.ROOM_TARGET] = recycleRoom;
						this._memory[C.ROLE] = 'recycle';
						
						this._memory[C.CLOSEST_TARGET] = spawns[0].id
						this._memory.rangeToTarget = 1;
					
						return true;
					}
				}
			} 

			this.clearTarget();
			this.suicide();			
			return true;
		}
	}

	Creep.prototype.roleSuicideBooth = function() {	
		let role = "roleSuicideBooth";
		// CHECK IF OTHER ROLE ACTIVE	   
		// ASSIGN BUILD 		
		this.say("🪦")
		if (!this._memory[C.CLOSEST_TARGET]) {
				
			if (this._memory[C.BOOSTED]) {

			}

			// Find container?
			if (Game.rooms[this._memory[C.ROOM_TARGET]]) {
				let spawns = Game.rooms[this._memory[C.ROOM_TARGET]].findByType(STRUCTURE_SPAWN)
				if (spawns.length > 0) {
					this.assignTarget(spawns[0].id, role);
				}
			}
		}
		
		if (this._memory[C.CLOSEST_TARGET]) { // MOVE TO TARGET			
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (!targetObj) {
				this.clearTarget();
				return 1;
			}
	
			let wantedRange = this._memory.rangeToTarget || 1;

			let rangeToBooth = this.pos.getRangeTo(targetObj);
			if (rangeToBooth === wantedRange) {
				let spawns = this.pos.lookForStructuresAround(STRUCTURE_SPAWN, 1);
				if (spawns.length > 0) {
					spawns[0].recycleCreep(this);
				}
			} else {
				if (this._memory.engine || this._memory[C.WAGON_WEIGHT]) {
					let engine = Game.getObjectById(this._memory.engine);
					if (!engine) { return; }
					engine.engine(this, targetObj.pos);
				} else {
					this.travelTo(targetObj, { range: 1 });
				}
			//	this.travelTo(targetObj, {range: wantedRange}); 	
			}
			return 1;
		}
	}



	Creep.prototype.delayForPBHaulers = function(powerBank){
		if (powerBank.hits > 10000) { return false; }
		
		let healer = Game.creeps[this._memory.healer];
		if (!healer) { return false; }
		if (this.ticksToLive < 20 || healer.ticksToLive < 20 || powerBank.ticksToDecay < 20) { return false; }

		let room = powerBank.room.name;
		if (!Memory.powerBanks[room]) { return false; }
		if (Memory.powerBanks[room].spawnedHaulers === undefined || Memory.powerBanks[room].spawnedHaulers.length === 0) {
			this.say("delay")
			return true; 
		}

		let haulers = [];
		let haulersInRoom = true;
		let haluersOnTheWay = 0;
		let ticksToTarget = this._memory[C.TICKS_TO_TARGET] || Memory.powerBanks[room].ticksToTarget;	
		for (let idx in Memory.powerBanks[room].spawnedHaulers) {
			let hauler = Game.creeps[Memory.powerBanks[room].spawnedHaulers[idx]];
			if (!hauler) { continue; }
					
			if (hauler.ticksToLive < ticksToTarget + 25) { 
				this.say("low ttl")
				return false; 
			}
			if (hauler.room.name !== room) {
				haulersInRoom = false;
				haluersOnTheWay++;
			}
			haulers.push(hauler);
		}

		if (!haulersInRoom) {
			this.say("omw " + haluersOnTheWay + "/" +haulers.length)
			return true;
		}

		if (Memory.powerBanks[room].requiredHaulers && haulers.length < Memory.powerBanks[room].requiredHaulers) {
			this.say("delay")
			return true;
		}
		
	}

	

	Creep.prototype.applyBoost = function (type, required) {

		if (this._memory.boosts === undefined) { this._memory.boosts = {}; }
		if (this._memory.boosts[type] !== undefined) { return 0; }
		let role = "applyBoost";

		// CHECK IF OTHER ROLE ACTIVE
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN

		if (!this._memory[C.CLOSEST_TARGET]) {

			this.say(type)
			if (type === T3_MOVE && ((this.hasBodyparts(MOVE) / this.body.length) >= 0.5)) {
				console.log(this.name + " skipping move boost, has enough move parts " + (this.body.length / this.hasBodyparts(MOVE)));
				this._memory.boosts[type] = {};
				this.clearTarget();
				return 0;
			}

			if (!this.room.controller || this.room.controller.level < 6) {
				this._memory.boosts[type] = {};
				this.clearTarget();
				return 0;
			}


			let requiredBoosts;
			if (BODYPART_FROM_BOOST[type] === MOVE) {

				let moveParts = this.hasBodyparts(MOVE);
				requiredBoosts = moveParts;
				let otherParts = this.body.length - moveParts
				if ((moveParts / otherParts) >= 1) {
					console.log(this.name + " skipping move boost, has enough move parts " + (moveParts / otherParts));
					this._memory.boosts[type] = {};
					this.clearTarget();
					return 0;
				}
				
				let boostLevel = BOOST_LEVEL[MOVE].indexOf(type) + 1;
				if (boostLevel >= 0) {
					let boostedParts = moveParts;

					for (let i = 0; i < moveParts; i++) {
						let moveRatio = (((boostedParts - i) * (boostLevel+1) ) + i ) / otherParts;
						if (moveRatio >= 1){
							requiredBoosts = boostedParts - i;
						} else {
							break;
						}
					}
				}
			} else {
				requiredBoosts = this.getActiveBodyparts(BODYPART_FROM_BOOST[type]);
			}
			
			if (requiredBoosts === 0) {
				console.log(this.name + " skipping boost " + type + " no valid bodyparts ");
				this._memory.boosts[type] = {};
				this.clearTarget();
				return 0;
			} else {
				this._memory.rBoostNm = requiredBoosts;
				this._memory.rBoostAm = requiredBoosts * LAB_BOOST_MINERAL;
				this._memory.rEnergyAm = requiredBoosts * LAB_BOOST_ENERGY;

			}
			//	console.log(this.name + " needs "+ requiredBoosts + " of type " + " for bodypart " +  BODYPART_FROM_BOOST[type])
			let labsWithRequiredMineral = _.filter(this.room.findByType(STRUCTURE_LAB),
				function (structure) {
					return (structure.mineralType === type &&
						structure.mineralAmount >= (requiredBoosts * LAB_BOOST_MINERAL));					
				});
			if (labsWithRequiredMineral.length > 0) {
				this.assignTarget(labsWithRequiredMineral[0].id, role, type);
			} else if (!required) {
				this._memory.boosts[type] = {};
				delete this._memory.rBoostAm;
				delete this._memory.rBoostNm;
				delete this._memory.rEnergyAm;
				return 0;
			} else {
				console.log(this.room.name + " " + this.name + " waiting for boosts! " + type + " ticks to live " + this.ticksToLive )

				this.room.setBoostMode(false, {[type]: requiredBoosts * LAB_BOOST_MINERAL});
				if (this.ticksToLive < 1200) {
					this._memory.boosts[type] = {};
					return 0;
				}
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (!targetObj) { this.clearTarget(); }

			if (targetObj.mineralAmount < this._memory.rBoostAm ||
				targetObj.energy < this._memory.rEnergyAm
				) { 
				this.say(targetObj.memory[S.BOOSTER_LAB]);

				if (targetObj.energy < this._memory.rEnergyAm) {
					targetObj.memory.needEnergy = this._memory.rEnergyAm;
				}

				if (!required && (!targetObj.memory[S.BOOSTER_LAB] || this.room.store(targetObj.memory[S.BOOSTER_LAB]) < this._memory.rBoostAm)) {  
					this.clearTarget(); 
				} else {
					this.room.setBoostMode(false, {[this._memory[C.RESOURCE_TYPE]]: this._memory.rBoostAm});
					this.clearTarget();  // might end up in different lab
				}

				if (!this.room.memory.hostiles) { this.idleOffRoad(targetObj); }
				return 1; 
			}
			if (targetObj._boostedTs && targetObj._boostedTs === Game.time) {
				this.say("2");
				return 1;
			}

			let value = targetObj.boostCreep(this, this._memory.rBoostNm);	

			if (value === OK) {
				targetObj._boostedTs = Game.time;
				this._memory.boosts[type] = {};
				this._memory[C.BOOSTED] = 1;
				delete this._memory.rBoostAm;
				delete this._memory.rBoostNm;
				delete this._memory.rEnergyAm;
				this.clearTarget();
			}
			else if (value === ERR_NOT_IN_RANGE) {

				if (this._memory.engine) {
					let engine = Game.getObjectById(this._memory.engine);
					if (!engine) { return; }
					engine.engine(this, targetObj.pos);
				} else {
					this.travelTo(targetObj, { maxRooms: 1, range: 1 });
				}

				
			} else if (value === ERR_NOT_FOUND) {
				this._memory.boosts[type] = {};
				delete this._memory.rBoostAm;
				delete this._memory.rBoostNm;
				delete this._memory.rEnergyAm;
				this.clearTarget();
			} else {
				console.log(this.pos.roomName + " " + this.name + " error boosting " + type + ". error " + value);
				delete this._memory.rBoostAm;
				delete this._memory.rBoostNm;
				delete this._memory.rEnergyAm;
				this.clearTarget();
				//	return 0 				
			}
			return 1;
		} else {
			let labs = this.room.findByType(STRUCTURE_LAB);
			if (labs.length > 0 ) {
				if (!this.room.memory.hostiles) { this.yieldRoad(labs[0].pos, true, 5); }
			}
			
		}
		return 1;
	};


	// HEAL IN RANGE
	Creep.prototype.healInRange = function (rangedAttacking) {

		if (this._healInRange) { return 1; }
		this._healInRange = Game.time;

		let dist = 3;
		if (this._rangedAttack || rangedAttacking) {
			dist = 1;
		}
		let top = limit(this.pos.y - dist, 0, 49);
		let left = limit(this.pos.x - dist, 0, 49);
		let bot = limit(this.pos.y + dist, 0, 49);
		let right = limit(this.pos.x + dist, 0, 49);

		let healTargets = _.filter(this.room.lookForAtArea(LOOK_CREEPS, top, left, bot, right, true),
			function (c) {
				return (c.creep.hits < c.creep.hitsMax && ALLIES[c.creep.owner.username]);
			});
		let powerTargets = _.filter(this.room.lookForAtArea(LOOK_POWER_CREEPS, top, left, bot, right, true),
			function (c) {
				return (c.powerCreep.hits < c.powerCreep.hitsMax && ALLIES[c.powerCreep.owner.username]);
			});
		healTargets = healTargets.concat(powerTargets);
		let length = healTargets.length;
		let healingDone;
		let range;
		let highestHeal = 0;
		let healPower = 0;
		let rangedHealPower = 0;

		let pbRoom = this.room.memory.powerBank


		if (length > 0) {
			let healParts = this.hasBodyparts(HEAL);
			healPower = healParts * HEAL_POWER;
			rangedHealPower = healParts * RANGED_HEAL_POWER;
			
			let HigestMissingHp = 0;
			let heal = 0;
			let selectedRange;			
			let creepToHeal;
			for (let i = 0; i < length; i++) {
				let currentCreep =  healTargets[i].creep || healTargets[i].powerCreep;

				if (pbRoom && !currentCreep.my) { continue; }

				let currentHpMissing = currentCreep.hitsMax - currentCreep.hits - creepHealed(currentCreep);

				range = this.pos.getRangeTo(currentCreep);
				if (range <= 1){
					heal = Math.min(currentHpMissing, healPower);
				} else {
					heal = Math.min(currentHpMissing, rangedHealPower);
				}

				if ((heal > highestHeal && currentHpMissing > 0) ||
					(heal == highestHeal &&
					currentHpMissing > HigestMissingHp)
				) {
					highestHeal = heal;
					HigestMissingHp = currentHpMissing;
					selectedRange = range;
					creepToHeal = currentCreep;
				}
			}

			if (creepToHeal) {	
			//	console.log(this.room.name + " healing " +creepToHeal.name + " heal amount " + highestHeal + " at range " + selectedRange);
				if (selectedRange <= 1) {
					this.heal(creepToHeal);
					registerHeal(creepToHeal, healPower);
					this._heal = Game.time;
				} else {
					this.rangedHeal(creepToHeal);
					registerHeal(creepToHeal, rangedHealPower);
					this._rangedHeal = Game.time;
				}
				
				this.room.visual.line(this.pos, creepToHeal.pos, { color: "green", lineStyle: "solid" });
				healingDone = true;
				this._cache.echoHeal = creepToHeal.id;
			//	this._cache.healTs = Game.timhighestHeale + 10;
				return 1;
			}
		}
			
		if (!healingDone && 
			this._cache.echoHeal
			) { // || this._memory.healTs > Game.time)) {
			let creep = Game.getObjectById(this._cache.echoHeal);
			
			if (creep) {
				range = this.pos.getRangeTo(creep);				
				if (this.pos.inRangeTo(creep.pos, 1)) {
					this.room.visual.line(this.pos, creep.pos, { color: "green", lineStyle: "dashed" });
					this.heal(creep);
					this._heal = Game.time;
					registerHeal(creep, healPower);
				} else if (range <= dist) {
					this.room.visual.line(this.pos, creep.pos, { color: "green", lineStyle: "dashed" });
					this.rangedHeal(creep);
					this._rangedHeal = Game.time;
					registerHeal(creep, rangedHealPower);
				}
			}
		}
	};

	function creepHealed(creep) {
		let amount = 0;
		if (global.temp.healedTargets && global.temp.healedTargets[creep.id]) {
			amount = global.temp.healedTargets[creep.id].healAmount;
		} 
		return amount;
	}

	function registerHeal(creep, amount) {
		if (global.temp.healedTargets === undefined) { global.temp.healedTargets = {} }
		if (global.temp.healedTargets[creep.id] === undefined) {
			global.temp.healedTargets[creep.id] = {};
			global.temp.healedTargets[creep.id].healAmount = 0;
		}
		global.temp.healedTargets[creep.id].healAmount += amount;

	}

	Creep.prototype.meleeAttackInRange = function (target, ignoreStructures) {

		if (target && this.pos.getRangeTo(target) <= 1 && !valuableScoreStore(target)) {
			return this.attack(target);
		}

		let dist = 1;
		let targetCreep = this.pos.getBestNearbyCreepTarget(dist);
		if (targetCreep) {
			let result = this.attack(targetCreep);
			if (result === OK) {
				this.room._attackTarget = targetCreep;	// TODO
				return result;
			}
		}

		if (ignoreStructures) { return }

		let enemyStructures = this.pos.lookForEnemyStructuresAround(dist);
		let preferedTarget = getBestStructureTarget(enemyStructures);
		if (preferedTarget) {
			return this.attack(preferedTarget);
		}
		
		/*
		let targets = [];

		let priTargets = {
			[STRUCTURE_SPAWN] : {},
			[STRUCTURE_TOWER] : {},
			[STRUCTURE_STORAGE] : {},
			[STRUCTURE_LAB] : {},
			[STRUCTURE_TERMINAL] : {},
		};

		let score;
		let enemyStructures = this.pos.lookForEnemyStructuresAround(dist);
		if (enemyStructures.length > 0) {
			for (let idx in enemyStructures) {
				let structure = enemyStructures[idx];

				
				if (structure.structureType === STRUCTURE_ROAD) {					
					if (getRoomTerrainAt(structure.pos) === TERRAIN_MASK_SWAMP) { continue; }					
					score = 100 + structure.hits;
				} else if (structure.structureType === STRUCTURE_POWER_BANK) {
					continue;	
				} else if (priTargets[structure.structureType] !== undefined) {
					score = 10 + structure.hits;
				} else {
					score = 50 + structure.hits;
				}

				if (structure.structureType !== STRUCTURE_RAMPART && structure.pos.lookForStructure(STRUCTURE_RAMPART)) { 
					score -= +50;	// PENALTY, HIGHER THAN NORMAL UNRAMPARTED 
				}

				if (valuableScoreStore(structure) ) { continue; }

				this.room.visual.text(score, structure.pos, { color: 'red', font: 0.8 });
				targets.push({target: structure, score: score });
			}
		}

		

		if (targets.length > 0) {
			let preferedTarget;
			let bestScore = Infinity;
			
			for (let i=0; i < targets.length; i++ ) {				
				if (targets[i].score < bestScore) {						
					bestScore = targets[i].score;
					preferedTarget = targets[i].target;
				}
			}
			if (preferedTarget) {
				return this.attack(preferedTarget);		
			}
		} */
	};

	function getBestStructureTarget(enemyStructures) {
		
		let priTargets = {
			[STRUCTURE_SPAWN] : {},
			[STRUCTURE_TOWER] : {},
			[STRUCTURE_STORAGE] : {},
			[STRUCTURE_LAB] : {},
			[STRUCTURE_TERMINAL] : {},
		};

		let score;
		let preferedTarget;
		let bestScore = Infinity;
		if (enemyStructures.length > 0) {
			for (let idx in enemyStructures) {
				let structure = enemyStructures[idx];

				
				if (structure.structureType === STRUCTURE_ROAD) {					
					if (getRoomTerrainAt(structure.pos) === TERRAIN_MASK_SWAMP) { continue; }					
					score = 10000 + structure.hits;
				} else if (structure.structureType === STRUCTURE_POWER_BANK) {
					continue;	
				} else if (priTargets[structure.structureType] !== undefined) {
					score = 10 + structure.hits;
				} else {
					score = 5000 + structure.hits;
				}

				
				if (structure.structureType !== STRUCTURE_RAMPART) { 
					let rampart = structure.pos.lookForStructure(STRUCTURE_RAMPART);
					if (rampart) {
						score += rampart.hits;	// PENALTY, HIGHER THAN NORMAL UNRAMPARTED 
					}
				}

				if (valuableScoreStore(structure) ) { continue; }

				if (score < bestScore) {
					bestScore = score;
					preferedTarget = structure;
				}

			//	this.room.visual.text(score, structure.pos, { color: 'red', font: 0.8 });
			//	targets.push({target: structure, score: score });
			}
		}

		return preferedTarget;

		/*
		if (targets.length > 0) {
			let preferedTarget;
			let bestScore = Infinity;
			
			for (let i=0; i < targets.length; i++ ) {				
				if (targets[i].score < bestScore) {						
					bestScore = targets[i].score;
					preferedTarget = targets[i].target;
				}
			}
			if (preferedTarget) {
				return preferedTarget;		
			}
		} */
	}


	Creep.prototype.dismantleInRange = function (target) {
		
		if (target && this.pos.getRangeTo(target) <= 1 && !valuableScoreStore(target)) { return this.dismantle(target); }
		
		let dist = 1;
		let enemyStructures = this.pos.lookForEnemyStructuresAround(dist);

		let preferedTarget = getBestStructureTarget(enemyStructures);
		if (preferedTarget) {
			return this.dismantle(preferedTarget);
		}		
	};

	Creep.prototype.rangedAttackInRange = function (target) {
		if (target && !valuableScoreStore(target)) {
			if (target.owner && ALLIES[target.owner.username]) { return 0; }

			let rangeToTarget = this.pos.getRangeTo(target);
			if (rangeToTarget <= 1) {
				if (target.owner && this.pos.lookForAlliedCreepsAround(3).length <= 0) {
					this.rangedMassAttack();
					this._rangedAttack = Game.time;
					return 1;
				} else {
					this.rangedAttack(target);
					this._rangedAttack = Game.time;
					return 1;
				}
			} else if (rangeToTarget <= 3) {
				this.rangedAttack(target);
				this._rangedAttack = Game.time;
				return 1;
			}
		}
		let dist = 3;
		let targets = [];
		let creeps = this.pos.lookForEnemyCreepsAround(dist);
		let enemyStructures = this.pos.lookForEnemyStructuresAround(dist);
		
		targets = targets.concat(creeps);
		targets = targets.concat(enemyStructures);
		
		if (targets.length > 0) {

			let singleTarget;
			let bestScore = Infinity;
			let massRaDmg = 0;
			let alliesNearby = this.pos.lookForAlliedCreepsAround(3).length;

			let allowedTargets = _.filter(targets, 
				function(c) {return (!valuableScoreStore(c)
				)});
			
			alliesNearby = alliesNearby || (allowedTargets.length < targets.length);		
			
			let priTargets = {
				[STRUCTURE_INVADER_CORE] : {},
				[STRUCTURE_SPAWN] : {},		
				[STRUCTURE_TOWER] : {},
				[STRUCTURE_TERMINAL] : {},
				[STRUCTURE_STORAGE] : {},
				[STRUCTURE_LAB] : {},	
				[STRUCTURE_NUKER] : {},		
				[STRUCTURE_FACTORY] : {},
			};
	
			for (let idx in allowedTargets) {				
				target = allowedTargets[idx];

				// invalid targets
				if (target.structureType === STRUCTURE_ROAD && getRoomTerrainAt(target.pos) === TERRAIN_MASK_SWAMP) { continue; }

				let ramparted
				if ((target.structureType && target.structureType !== STRUCTURE_RAMPART) || !target.structureType) {
					ramparted = target.pos.lookForStructure(STRUCTURE_RAMPART);		
				}			
				
				// multi target
				if (!ramparted && alliesNearby <= 0 && target.owner) {
					massRaDmg += RANGED_MASS_ATTACK_DAMAGE[this.pos.getRangeTo(target)];
					if (massRaDmg >= 10) {
						this.rangedMassAttack();
						this._rangedAttack = Game.time;
						return 1;
					}
				}

				// single target
				let score = 0;
				score += target.hits;
				if (target.isCreep && !ramparted) {
					let creepPower = calcSingleCreepStrength(target);
					let dmg = creepPower.attackDamage + creepPower.rangedAttackDamage;

					score -= dmg * 10;
					score -= creepPower.healPower;
					score -= target.body.length;
				} else if (target.isPowerCreep && !ramparted){
					score -= 5000;
				} else {

					// structure
					if (priTargets[target.structureType]) {
						score -= 50000;
					}

					if (ramparted) {
						score += ramparted.hits;
					}
					
				}

				if (score < bestScore) {
					bestScore = score;
					singleTarget = target;
				}
			}

			if (singleTarget) {
				let result = this.rangedAttack(singleTarget);
				if (result === OK) {
					this._rangedAttack = Game.time;
					return 1;
				}			
			}
		}
	};

	Creep.prototype.lootTargetRoom = function() {
		let role = "lootTargetRoom";
		
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }

		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET]) {			
		
			let targets = [];		

			let stores = getLootStores(this.room.name, false)

			let carryCap = this.store.getFreeCapacity(RESOURCE_ENERGY);

			for (let i=0; i < stores.length; i++ ) {
				let storeStructure = stores[i];


				let pathToStore = findTravelPath(this.pos, storeStructure.pos,
					{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:5000});
				if (pathToStore.incomplete) {
					log("cant reach store " + storeStructure)
					continue;
				}

				for (let res in storeStructure.store) {
					let score = -pathToStore.path.length;

					if (storeStructure.store[res] == 0) { continue; }
					if (BASE_MINERALS_OBJECT[res] && !wantToMineMineral(res)) { continue; }
					if (COMPRESSED_RESOURCE[res] && !wantToMineMineral(COMPRESSED_RESOURCE[res].raw)) { continue; }

					score += getResourceWorth(res) * Math.min(carryCap, storeStructure.store[res]);
					targets.push({id: storeStructure.id, score: score, res: res });
				}
			}

		
			if (targets.length > 0) {
				let preferedTarget;
				let preferedRes;
				let bestScore = -9999;
				
				for (let i=0; i < targets.length; i++ ) {
					if (targets[i].score > bestScore) {
						bestScore = targets[i].score;
						preferedTarget = targets[i].id;
						preferedRes = targets[i].res;
					}
				}
				
				if (preferedTarget) {						
					this.assignTarget(preferedTarget, role, preferedRes);
				}
			} else {
				this._memory[C.WORK] = 1;
				delete Memory.lootMission[this.room.name];
				// clear loot target?
			}
		}
		
		if (this._memory[C.CLOSEST_TARGET]) {

			let result = this.withdrawAction();

			if (result === OK) {
				Memory.rooms[this.room.name].lootTs = Game.time + 1;
			}
			return result;			
		}
	}

	Creep.prototype.doLooter = function(){

		this.manageState();	

		if(!this._memory[C.WORK]) {
			if (this.room.name !== this._memory[C.ROOM_TARGET]) {
				if (!Memory.lootMission[this._memory[C.ROOM_TARGET]]) {
					this.recycleOrSuicide();
					return;
				}
				let dest = pullIdlePosForRoom(this._memory[C.ROOM_TARGET])
				this.travelTo(dest, {range:20, ignoreRoads: true,  roomCallback: avoidSKcreeps});				
			} else {
				this.lootTargetRoom();
			}
		} else {
			this.roleHauler(true);

			checkForLootMission(this._memory[C.ROOM_TARGET])
		}
	}


	RoomPosition.prototype.getBestNearbyCreepTarget = function(range) {
		let nearbyCreeps = this.lookForEnemyCreepsAround(range)
		if (nearbyCreeps.length === 0) { return; }
		
	//	let targets = [];
		
		let bestScore = 0;	// dont chase scouts?
		let preferedTarget;
	
		for (let idx in nearbyCreeps) {			

			let creep = nearbyCreeps[idx];
			if (creep.pos.lookForStructure(STRUCTURE_RAMPART)) { continue; }

			let score = 0;

			let creepPower = calcSingleCreepStrength(creep);
			let dmg = creepPower.attackDamage + creepPower.rangedAttackDamage;
			
			score += dmg * 10;
			score += creepPower.healPower;
			score += creep.body.length;			

		//	creep.room.visual.text(score.toFixed(0), creep.pos, { color: 'orange', font: 0.8 });
		//	creep.room.visual.line(creep.pos, this, { color: "blue", lineStyle: "solid" });

			if (score > bestScore) {
				bestScore = score;
				preferedTarget = creep;
			}
		}

		return preferedTarget;

		/*
		if (targets.length > 0) {
			let preferedTarget;
			let bestScore = -10;
			
			for (let i=0; i < targets.length; i++ ) {				
				if (targets[i].score > bestScore) {						
					bestScore = targets[i].score;
					preferedTarget = targets[i].target;
				}
			}
			
			return preferedTarget;
		}*/

	}




	RoomPosition.prototype.getTargetInRange = function(dist) {	

		let targets = [];
		let creeps = _.filter(this.lookForEnemyCreepsAround(dist),
			function (creep) {
				return (
					!creep.pos.lookForStructure(STRUCTURE_RAMPART));
			});

		if (creeps.length > 0) {
		//	this.room.visual.text("C", creeps[0].pos, { color: 'red', font: 0.8 });	
			return creeps[0];
			/*
			if (result === OK) {
				this.room._attackTarget = creeps[0];
				return result;
			}*/	
		}

		let priTargets = {
			STRUCTURE_SPAWN : {},
			STRUCTURE_TOWER : {},
			STRUCTURE_STORAGE : {},
			STRUCTURE_LAB : {},
			STRUCTURE_TERMINAL : {},
		};

		let score;
		let enemyStructures = this.lookForEnemyStructuresAround(dist);
		if (enemyStructures.length > 0) {
			for (let idx in enemyStructures) {
				let structure = enemyStructures[idx];
				

				if (structure.structureType === STRUCTURE_ROAD) {
					if (getRoomTerrainAt(structure.pos) === TERRAIN_MASK_SWAMP) { continue; }					
					score = 100;
				} else if (priTargets[structure.structureType]) {
					score = 10;
				} else {
					score = 50;
				}

				if (structure.structureType !== STRUCTURE_RAMPART && structure.pos.lookForStructure(STRUCTURE_RAMPART)) { 
					score -= +50;	// PENALTY, HIGHER THAN NORMAL UNRAMPARTED 
				}

//this.room.visual.text(score, structure.pos, { color: 'red', font: 0.8 });
				targets.push({target: structure, score: score });
			}
		}

		

		if (targets.length > 0) {
			let preferedTarget;
			let bestScore = Infinity;
			
			for (let i=0; i < targets.length; i++ ) {				
				if (targets[i].score < bestScore) {						
					bestScore = targets[i].score;
					preferedTarget = targets[i].target;
				}
			}
			if (preferedTarget) {
				return preferedTarget;		
			}
		}
	};

	

	Creep.prototype.withdrawAction = function (amount, cm = undefined) {

		let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
		if (!targetObj) {
			this.clearTarget();
			return 0;
		}

		let value = ERR_NOT_IN_RANGE;
		let resourceType = this._memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY;


		if (this.pos.inRangeTo(targetObj.pos, 1)) {			
			if (targetObj.structureType || targetObj.isTombstone || targetObj.isRuin || targetObj.isScoreContainer) {
				value = this.withdraw(targetObj, resourceType, amount);
			} else if (targetObj.isCreep) {
				value = targetObj.transfer(this, resourceType, amount);
			} else {
				value = this.pickup(targetObj);
			}
		}


		if (value === OK) {
			this.clearTarget();
			this._withdrawOk = Game.time;

			delete this._cache.offRoad;
			delete this._cache.ignoreRoad;
			delete this._memory.withDrawTimeout;
		}
		else if (value === ERR_NOT_IN_RANGE) {
			
			if (this.room.memory.myRoom && this.room.memory.hostiles && !isOutsideWalls(this.pos) && isOutsideWalls(targetObj.pos)) {
				if (Memory.creeps[this.name].withDrawTimeout === undefined) { this._memory.withDrawTimeout = 0; }
				this._memory.withDrawTimeout++;
				if (this._memory.withDrawTimeout > 25) {
					this.clearTarget();
					if (this._memory.avoidRes === undefined) { this._memory.avoidRes = []; }
					this._memory.avoidRes.push(targetObj.id)
					delete this._memory.withDrawTimeout;
				}
				this.travelTo(targetObj, { maxRooms: 1, range: 1, roomCallback: getWallLimitMatrix });								
			} else {

				if (this._cache.offRoad === undefined) {
					this._cache.offRoad = this.canOffroad();
					this._cache.ignoreRoad = this.canIgnoreRoads();
				}

				this.travelTo(targetObj, { maxRooms: 1, range: 1, offRoad: this._cache.offRoad, ignoreRoads: this._cache.ignoreRoad, roomCallback: cm });				
			}
		}
		else {
			console.log(this.pos.roomName + " " + this.name + " error withdrawing " + amount + " " + resourceType + ". error " + 
			errCodes[value] + " current role " + this._memory[C.ASSIGNED_ROLE] + " id " + this._memory[C.CLOSEST_TARGET] + " type " +targetObj );
			this.clearTarget();
			delete this._cache.offRoad;
			delete this._cache.ignoreRoad;
			//	return 0
		}
		return 1;
	};

	Creep.prototype.transferAny = function (targetObj) {
		let result = -999;
		for (let res in this.store) {			
			if (this.store[res] > 0) {
				result = this.transfer(targetObj, res);
				if (result === OK) {
					return result
				}
			}
		}

		return result;
	};

	// GET ENERGY FROM CONTAINER
	Creep.prototype.getEnergyFromContainer = function () {
		let role = "getEnergyFromContainer";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN 
		if (!this._memory[C.CLOSEST_TARGET]) {			
			let carry = this.carry[RESOURCE_ENERGY];
			let carryCapacity = this.carryCapacity;
			let targets = _.filter(this.room.findByType(STRUCTURE_CONTAINER),
				function (structure) {
					return (structure.isProvider() &&
						((structure.store[RESOURCE_ENERGY] - structure.withdraw) >= (carryCapacity - carry)));
				});
			if (targets.length > 0) {
				let ClosestTarget = this.pos.findClosestByRange(targets, { ignoreCreeps: true });
				if (ClosestTarget != undefined) {
					this.assignTarget(ClosestTarget.id, role, RESOURCE_ENERGY);
				}
			}
			else { return 0; }
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
	};

	// GET ENERGY FROM CONTROLLER CONTAINER
	Creep.prototype.getEnergyFromControllerContainer = function () {
		let role = "getEnergyFromControllerContainer";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN 
		if (!this._memory[C.CLOSEST_TARGET]) {			
			let carryCapacity = this.carryCapacity;
			let targets = _.filter(this.room.findByType(STRUCTURE_CONTAINER),
				function (structure) {
					return (structure.isController() &&
						//								((structure.store[RESOURCE_ENERGY]) >= carryCapacity ))
						((structure.store[RESOURCE_ENERGY] - structure.withdraw) >= carryCapacity));
				});

			if (targets != undefined) {
				let ClosestTarget = this.pos.findClosestByRange(targets, { ignoreCreeps: true });
				if (ClosestTarget != undefined) {
					this.assignTarget(ClosestTarget.id, role, RESOURCE_ENERGY);
				}
			}
			else { return 0; }
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
	};



	// ROLE LABRAT
	Creep.prototype.roleLabRatRefillEnergy = function () {
		let role = "roleLabRatRefillEnergy";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET]) {
			let carryCapacity = this.carryCapacity;
			
			let labsNeedsEnergy = _.filter(this.room.findByType(STRUCTURE_LAB),
				function (structure) {
					return ((structure.energyCapacity - structure.energy) >= carryCapacity ||
							structure.memory.needEnergy);
				});
			if (labsNeedsEnergy.length > 0) {
				this._memory.jobId = labsNeedsEnergy[0].id;
				delete labsNeedsEnergy[0].memory.needEnergy;
				//	let carryCapacity = this.carryCapacity;;
				let energySourceTerminal = _.filter(this.room.findByType(STRUCTURE_TERMINAL),
					function (structure) {
						return (structure.store[RESOURCE_ENERGY] >= carryCapacity);
					});

				if (energySourceTerminal.length > 0) {
					this.assignTarget(energySourceTerminal[0].id, role);
					this._memory[C.RESOURCE_TYPE] = RESOURCE_ENERGY;
				} else {
					//	let carryCapacity = this.carryCapacity
					let energySourceStore = _.filter(this.room.findByType(STRUCTURE_STORAGE),
						function (structure) {
							return (structure.store[RESOURCE_ENERGY] >= carryCapacity);
						});

					if (energySourceStore.length > 0) {
						this.assignTarget(energySourceStore[0].id, role, RESOURCE_ENERGY);
					}
				}
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
	};

	Creep.prototype.roleRefillNukerEnergy = function (crane) {
		let role = "roleRefillNukerEnergy";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET]) {

			if (this.room.memory.spawnQ || this.room.memory.sieged || this.room.energyAvailable < this.room.energyCapacityAvailable*0.75) { return 0; }

			let nukerNeedsEnergy = _.filter(this.room.findByType(STRUCTURE_NUKER),
				function (structure) {
					return (structure.energyCapacity > structure.energy);
				});
			if (nukerNeedsEnergy.length > 0 && (!crane || crane.pos.isNearTo(nukerNeedsEnergy)) ) {
				this._memory.jobId = nukerNeedsEnergy[0].id;

				let energySourceTerminal = this.room.find(FIND_MY_STRUCTURES, {
					filter: (structure) => {
						return (structure.structureType == STRUCTURE_TERMINAL &&
							structure.store[RESOURCE_ENERGY] >= 40000);
					}
				});
				if (energySourceTerminal.length > 0) {
					this.assignTarget(energySourceTerminal[0].id, role);
				} else {
					let energySourceStore = this.room.find(FIND_MY_STRUCTURES, {
						filter: (structure) => {
							return (structure.structureType == STRUCTURE_STORAGE &&
								structure.store[RESOURCE_ENERGY] >= 40000);
						}
					});
					if (energySourceStore.length > 0) {
						this.assignTarget(energySourceStore[0].id, role, RESOURCE_ENERGY);
					}
				}
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
	};

	// ROLE LABRAT
	Creep.prototype.roleRefillNukerGhodium = function (crane) {
		let role = "roleRefillNukerGhodium";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET]) {

			let nukerNeedsEnergy = _.filter(this.room.findByType(STRUCTURE_NUKER),
				function (structure) {
					return (structure.ghodiumCapacity > structure.ghodium);
				});

			if (nukerNeedsEnergy.length > 0 && (!crane || crane.pos.isNearTo(nukerNeedsEnergy))) {
				let source = _.filter(this.room.findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
					function (structure) {
						return (structure.store[RESOURCE_GHODIUM]);
					});

				if (source.length > 0) {
					this._memory.jobId = nukerNeedsEnergy[0].id;
					this.assignTarget(source[0].id, role, RESOURCE_GHODIUM);
				}
			}
		}

		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
	};

	Creep.prototype.roleRefillPowerSpawnPower = function () {
		
		// CHECK IF OTHER ROLE ACTIVE	
	//	if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		
		if (!this._memory[C.CLOSEST_TARGET]) {

			if (this._cache.rflPsPwr > Game.time ) { return; }			

			let powerSpawn = this.room.findByType(STRUCTURE_POWER_SPAWN)[0];
			if (!powerSpawn) {
				this._cache.rflPsPwr = Game.time + 137;
				return;
			}


			if (powerSpawn.power < 15 ) {
				let source = _.filter(this.room.findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
					function (structure) {
						return (structure.store[RESOURCE_POWER]);
					});

				if (source.length > 0) {
					this._memory.amount = Math.min(powerSpawn.powerCapacity - powerSpawn.power, source[0].store[RESOURCE_POWER]);
					this._memory.jobId = powerSpawn.id;
					let role = "roleRefillPowerSpawnPower"
					this.assignTarget(source[0].id, role, RESOURCE_POWER);
				} else {
					this._cache.rflPsPwr = Game.time + 27;
				}
			} else {
				this._cache.rflPsPwr = Game.time + powerSpawn.power - 9;
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction(this._memory.amount);
		}
	};



	Creep.prototype.craneEmptyEnergy = function() {
		if (this.store[RESOURCE_ENERGY]) {

		} 
	}

	// LABRAT EMPTY LEFTOVERS
	Creep.prototype.roleLabRatEmpty = function () {
		
		// ASSIGN  		
		if (this.sumCarry > 0 && !this._memory[C.CLOSEST_TARGET]) {
			let role = "roleLabRatEmpty";

			let homeRoom = Game.rooms[this._memory[C.ROOM_ORIGIN]] || Game.rooms[this._memory[C.ROOM_TARGET]];
			if (!homeRoom) { return; }
			let terminal = homeRoom.terminal;

			let terminalFreeSpace = 0;
			if (terminal) {
				terminalFreeSpace = homeRoom.terminal.freeSpace;
			}

			let storageFreeSpace = 0;
			let storage = homeRoom.storage;
			if (storage) {
				storageFreeSpace = homeRoom.storage.freeSpace;
			}

			if (terminal && terminalFreeSpace > storageFreeSpace) {
				this.assignTarget(terminal.id, role);
			} else if (storage) {
				this.assignTarget(storage.id, role);
			}
			this.say("empty");
		}

		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (!targetObj) { this.clearTarget(); return; }

			let value = ERR_NOT_IN_RANGE;
			if (this.pos.inRangeTo(targetObj.pos, 1)) {
				value = this.transferAny(targetObj);
			}
			
			//	console.log(" crane empty " +value + this._memory[C.RESOURCE_TYPE])
			if (value == OK) {
				this.say("empty");
				this.clearTarget();
				delete this._memory.jobId;
			}
			else if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 2, range: 1 });
			}
			else {
				console.log(this.room.name + " error empty " + value + " transfering " + this.resourceType+ " at " +targetObj.structureType + " creep " +this);
				delete this._memory.jobId;
				delete this._memory.amount;
				this.clearTarget();

				if (this._cache.lastEmptyError === Game.time) {
					for (let res in this.carry) {
						if (this.carry[res] > 0) {
							this.drop(res)							
						}
					}					
				}
				this._cache.lastEmptyError = Game.time + 1;

			}
			return 1;
		}

		return 0;
	};

	// LABRAT MOVE TO IDLE POSITION
	Creep.prototype.roleLabRatToIdle = function () {
		let role = "roleLabRatToIdle";
		this.assignTarget(0, role);
		let idlePos = this.room.labIdlePos();
		//	if (!idlePos) {return 0;}
		let value = this.idleOffRoad(idlePos);
		if (value === OK) {
			this.clearTarget();
			return 0;
		} else {
			return 1;
		}
		/*
		if (this.pos.inRangeTo(idlePos, 1)) {
		//	this.idleOffRoad(idlePos)
			this.clearTarget();
			return 0;
		} else {
			this.travelTo(idlePos, {range:1});
			return 1;
		}*/
	};

	global.mineralHasActiveMiners = function(source) {
		let roomName = source.room.name;
		if (!Memory.rooms[roomName] || !Memory.rooms[roomName].mineral || !Memory.rooms[roomName].mineral[source.id]) { return false; }

		for (let id in source.memory.miners) {

			let miner = Game.getObjectById(id);
			if (miner) { 
				return true; 
			} else {
				delete delete source.memory.miners[id];
				if (Object.keys(source.memory.miners).length <= 0) {
					delete source.memory.miners;
				}
			}
		}
		return false;
	}

	Creep.prototype.roleLabRatDeliver = function () {
		let role = "roleLabRatDeliver";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		
		// ASSIGN
		let resType;
		if (this._memory.jobId !== 0) {

			if (this._memory[C.RESOURCE_TYPE] && this.store[this._memory[C.RESOURCE_TYPE]] > 0) {
				resType = this._memory[C.RESOURCE_TYPE];
			} else {
				resType = this.resourceType;
			}

			if (resType && !this.store[resType]) {
				delete this._memory.jobId;
				delete this._memory[C.WORK];
				this.clearTarget();
				return;
			}

			this.assignTarget(this._memory.jobId, role, resType);
		}		

		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);

			let value;
			if (!targetObj) { 
				
				delete this._memory.jobId;
				delete this._memory[C.WORK];
				this.clearTarget(); 
				return 0;
			}


			let isLab;
			if (targetObj.isLab && resType !== RESOURCE_ENERGY) {
				let wantedRes = targetObj.mineralType || targetObj.memory[S.BOOSTER_LAB] || targetObj.memory[S.INPUT_LAB];
				value = this.transfer(targetObj, wantedRes, this._memory.jobIdAmount);
				isLab = true;
			} else if (resType) {
				value = this.transfer(targetObj, resType, this._memory.jobIdAmount);				
			} else {
				value = this.transferAny(targetObj);
			}
			//console.log( this +  value)

			if (value === OK) {

			//	if (this._memory.jobIdAmount || Object.keys(this.carry).length === 1){
				delete this._memory.jobId;
				delete this._memory.jobIdAmount;

				if (!targetObj.isCreep) { // dont overwrite creep.withdraw function
					delete this._memory[C.CLOSEST_TARGET];
					delete this._memory[C.ASSIGNED_ROLE];
					delete this._memory[C.RESOURCE_TYPE];
				} else {
					this.clearTarget();
				}
				

				if (Object.keys(this.carry).length === 1){						
					this.work = false;
				}

				if (isLab && !targetObj.memory[S.BOOSTER_LAB] && !targetObj.mineralType) {
					this.room._cache.labsCd = Game.time + 1;
				}

			} else if (value === ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { range: 1 });
			} else {
				console.log(this + " error " + value + " delivering " +resType + " to " + targetObj);
				this.room.visual.text("X", targetObj.pos, { color: 'red', font: 0.8 });
				delete this._memory.jobId;
				this.clearTarget();
			}
			return 1;
		}
	};

	// GET MINERAL FROM CONTAINER
	Creep.prototype.getMineralFromContainer = function () {
		let role = "getMineralFromContainer";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET]) {
			let containers = this.room.findByType(STRUCTURE_CONTAINER);

			for (let idx in containers) {
				let totalAmount = 0;
				for (let e in containers[idx].store) {
					if (e != RESOURCE_ENERGY) {
						totalAmount = containers[idx].store[e];
						this._memory[C.RESOURCE_TYPE] = e;
					}
				}
				if ((totalAmount - containers[idx].withdraw) >= this.carryCapacity) {
					this.assignTarget(containers[idx].id, role, this._memory[C.RESOURCE_TYPE]);
					break;
				}
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
		return 0;
	};

	Creep.prototype.getConsumerEnergy = function (upgrader = false) {
		let role = "getConsumerEnergy";
		//	
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET]) {

			let carryCapacity = this.carryCapacity;
		//	let room = this.room.name;
			let targets = [];		
			let score;	// lower is better
			
			if (upgrader || this.room.memory.newRCL || this.room.memory.sieged) {
				let link = _.filter(this.room.findByType(STRUCTURE_LINK),
					function (structure) {
						return (structure.isController() && structure.energy > 100);
					});

				for (let i=0; i < link.length; i++ ) {
					score = this.pos.getRangeTo(link[i]);	
					if (upgrader) { score -= 6} // PREFERED
					targets.push({id: link[i].id, score: score });
				//	this.room.visual.text(score.toFixed(0), link[i].pos.x, link[i].pos.y, { color: 'red', font: 0.8 });
				}
				// CHECK CONTAINER					
				let containers = _.filter(this.room.getControllerContainer(),
					function (structure) {
						return ((structure.store[RESOURCE_ENERGY] - structure.withdraw) > 50);
					});
				for (let i=0; i < containers.length; i++ ) {
					score = this.pos.getRangeTo(containers[i]);	// PREFERED
					if (upgrader) { score -= 5} // PREFERED
					targets.push({id: containers[i].id, score: score });
				//	this.room.visual.text(score.toFixed(0), conatiners[i].pos.x, conatiners[i].pos.y, { color: 'red', font: 0.8 });
				}

				if (targets.length <= 0 && !this.room.memory.isAttacked && 					
					(this.room.controller && this.room.controller.level <= 3 || (!this.room.storage && !this.room.terminal))
					) {
					let dropped = this.room.find(FIND_DROPPED_RESOURCES, {
						filter: (resource) => {
							return ((resource.amount - resource.withdraw) >= carryCapacity &&
								resource.resourceType == RESOURCE_ENERGY);
						}
					});
					for (let i=0; i < dropped.length; i++ ) {
						if (this.room.memory.isAttacked && isOutsideWalls(containers[i].pos) ) { continue; }
						let range = this.pos.getRangeTo(dropped[i]);
						if (range > 10 ) { continue; }
						score = this.pos.getRangeTo(dropped[i]);
						if (upgrader) { score -= 5} // PREFERED
						score -= dropped[i].amount / 250;	

						targets.push({id: dropped[i].id, score: score });	
					}
				}
			} 

			if (!upgrader) {
				// CHECK CONTAINER
				let containers = []
				if (Memory.rooms[this.room.name].newRCL) {
					containers = _.filter(this.room.findByType(STRUCTURE_CONTAINER),
					function (structure) {
						return ((structure.isProvider() || structure.isController()) &&
							((structure.store[RESOURCE_ENERGY] - structure.withdraw) >= carryCapacity));
					});
				} else {
					containers = _.filter(this.room.findByType(STRUCTURE_CONTAINER),
					function (structure) {
						return (structure.isProvider() &&
							((structure.store[RESOURCE_ENERGY] - structure.withdraw) >= carryCapacity));
					});
				}				

				for (let i=0; i < containers.length; i++ ) {

					if (this.room.memory.isAttacked) {
						if (isOutsideWalls(containers[i].pos) ) { continue; }
						if (this._memory.avoidRes) {
							if (this._memory.avoidRes.includes(containers[i].id)) { continue; }
						}
					}
						 
					score = this.pos.getRangeTo(containers[i]);
					targets.push({id: containers[i].id, score: score });	
				}

				// CHECK DROPPED IF LOW LEVEL ROOM
				if (!this.room.memory.isAttacked && 					
					(this.room.controller && this.room.controller.level <= 3 || (!this.room.storage && !this.room.terminal))
					) {
					let dropped = this.room.find(FIND_DROPPED_RESOURCES, {
						filter: (resource) => {
							return ((resource.amount - resource.withdraw) >= carryCapacity &&
								resource.resourceType == RESOURCE_ENERGY);
						}
					});
					for (let i=0; i < dropped.length; i++ ) {

						if (this.room.memory.isAttacked) {
							if (isOutsideWalls(dropped[i].pos) ) { continue; }
							if (this._memory.avoidRes) {
								if (this._memory.avoidRes.includes(dropped[i].id)) { continue; }
							}
						}

						score = this.pos.getRangeTo(dropped[i]) - 5;
						score -= dropped[i].amount / 250;

						targets.push({id: dropped[i].id, score: score });	
					}
				}

				// CHECK DROPPED IF SIEGED
				if (this.room.memory.isAttacked) {
					let dropped = this.room.find(FIND_DROPPED_RESOURCES, {
						filter: (resource) => {
							return ((resource.amount - resource.withdraw) >= carryCapacity &&
								resource.resourceType == RESOURCE_ENERGY);
						}
					});
					for (let i=0; i < dropped.length; i++ ) {
						if (dropped[i].pos.lookForStructuresAround(STRUCTURE_RAMPART, 1).length < 1 ) { continue; }

						if (this._memory.avoidRes) {
							if (this._memory.avoidRes.includes(dropped[i].id)) { continue; }
						}

						score = this.pos.getRangeTo(dropped[i]) - 5;
						score -= dropped[i].amount / 250;

						targets.push({id: dropped[i].id, score: score });	
					}
				}

				// CHECK TOMBSTONES
				if (!this.room.memory.isAttacked) {


					let tombstones = this.room.find(FIND_TOMBSTONES, {
						filter: (resource) => {
							return ((resource.store[RESOURCE_ENERGY] - resource.withdraw) >= carryCapacity);
						}
					});
					for (let i=0; i < tombstones.length; i++ ) {

						score = this.pos.getRangeTo(tombstones[i]);
						
						targets.push({id: tombstones[i].id, score: score });	
					}
				}
			}

			// SPAWN CONTAINERS
			let containers = this.room.getSpawnContainers();
			for (let idx in containers) {
				let container = containers[idx]

				let freeCap = 250;
				if (Memory.rooms[this.room.name].newRCL) {
					freeCap = 700;
				}

				if (container.store.getFreeCapacity(RESOURCE_ENERGY) <= freeCap) {
					score = this.pos.getRangeTo(container) + 2;
						
					targets.push({id: container.id, score: score });
				}
			}


			
			if (!upgrader || targets.length <= 0 && this.room.store(RESOURCE_ENERGY) > 5000) {
				
				// CHECK STORAGE
				let storage = this.room.storage;
				if (storage && storage.store[RESOURCE_ENERGY] && storage.store[RESOURCE_ENERGY] > carryCapacity) {
					score = this.pos.getRangeTo(storage);
					targets.push({id: storage.id, score: score });
				}

				// CHECK TERMINAL
				let terminal = this.room.terminal;
				if (terminal && terminal.store[RESOURCE_ENERGY] && terminal.store[RESOURCE_ENERGY] > carryCapacity) {
					if (terminal.store[RESOURCE_ENERGY] > 5000) {
						score = this.pos.getRangeTo(terminal) + 1;
						targets.push({id: terminal.id, score: score });
					}
				}
			}

			if (targets.length > 0) {
				let preferedTarget;
				let bestScore = Infinity;
				
				for (let i=0; i < targets.length; i++ ) {
					if (targets[i].score < bestScore) {
						bestScore = targets[i].score;
						preferedTarget = targets[i].id;
					}
				}

				if (preferedTarget) {
					this.assignTarget(preferedTarget, role, RESOURCE_ENERGY);					
				}
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
	};

	Creep.prototype.moverGetEnergy = function () {
		let role = "moverGetEnergy";
		
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }

		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET]) {
		
			let carryCapacity = this.carryCapacity;
			let neededAmount = this.carryCapacity - this.sumCarry;
			if (!this._memory[C.ROLE] === 'bootStrapper' && (neededAmount < 50 || neededAmount/carryCapacity < 0.1 )) {
				this._memory[C.WORK] = 1;
				return 0;
			}

			if(this._memory.retryCount) {
				neededAmount = neededAmount / (this._memory.retryCount / 5);
			}
			delete this._cache.fromStore;			
			let targets = [];
			let score;	// lower is better
			
			
			// CHECK DROPPED			
			let droppedMinAmount = Math.min(neededAmount, 350);
			let dropped = this.room.find(FIND_DROPPED_RESOURCES, {
				filter: (resource) => {
					return ((resource.amount - resource.withdraw) >= droppedMinAmount &&
						resource.resourceType == RESOURCE_ENERGY);
				}
			});			

			
			for (let i=0; i < dropped.length; i++ ) {

				let cranePos
				if (!cranePos && getRoomPRCL(this.room.name) >= 8) {
					cranePos = this.room.getCranePos();
				}

				if (cranePos && dropped[i].pos.isThisPos(cranePos)){ continue; }

				if (this.room.memory.isAttacked) {
					if (isOutsideWalls(dropped[i].pos) && dropped[i].pos.lookForStructuresAround(STRUCTURE_RAMPART, 1).length <= 0) { continue; }

					if (this._memory.avoidRes) {
						if (this._memory.avoidRes.includes(dropped[i].id)) { continue; }
					}
				}

				if (this._memory[C.ROLE] === 'mover') {
					let source = dropped[i].pos.findInRange(FIND_SOURCES, 1).length
					if (source.length > 0) {
						if ((roadBuiltStatus(this._memory[C.ROOM_ORIGIN], source[0].id) > 0.9) !== this.forRoads() ) {
							if (dropped[i].amount < 750) { continue; } // let haulers pick this up)
						}
					}
				}
				
				

				score = this.pos.getRangeTo(dropped[i]) - 35;
			//	this.room.visual.text(score.toFixed(0), dropped[i].pos.x, dropped[i].pos.y, { color: 'green', font: 0.8 });
				targets.push({id: dropped[i].id, score: score });	
			}

			// CHECK TOMBSTONES			
			let tombstones = this.room.find(FIND_TOMBSTONES, {
				filter: (resource) => {
					return ((resource.store[RESOURCE_ENERGY] - resource.withdraw) >= droppedMinAmount);
				}
			});
			for (let i=0; i < tombstones.length; i++ ) {
				if (this.room.memory.isAttacked && isOutsideWalls(tombstones[i].pos) ) { continue; }
				
				score = this.pos.getRangeTo(tombstones[i]) - 10;
			//	this.room.visual.text(score.toFixed(0), tombstones[i].pos.x, tombstones[i].pos.y, { color: 'green', font: 0.8 });
				targets.push({id: tombstones[i].id, score: score });	
			}				
					
			// CHECK CONTAINERS
			let containerRequiredAmount = Math.max(1900, neededAmount);
			let containers = _.filter(this.room.findByType(STRUCTURE_CONTAINER),
				function (structure) {
					return (structure.isProvider() &&
						((structure.store[RESOURCE_ENERGY] - structure.withdraw) >= containerRequiredAmount));
				});
			for (let i=0; i < containers.length; i++ ) {

				if (this.room.memory.isAttacked) {
					if (isOutsideWalls(containers[i].pos) && containers[i].pos.lookForStructuresAround(STRUCTURE_RAMPART, 1).length <= 0) { continue; }

					if (this._memory.avoidRes) {
						if (this._memory.avoidRes.includes(containers[i].id)) { continue; }
					}
				}

				if (this._memory[C.ROLE] === 'mover') {
					let source = containers[i].pos.findInRange(FIND_SOURCES, 1)
					if (source.length > 0) {
						if ((roadBuiltStatus(this._memory[C.ROOM_ORIGIN], source[0].id) > 0.9) !== this.forRoads() ) {
							if (containers[i].store[RESOURCE_ENERGY] < 1000) { continue; } // let haulers pick this up)
						}
					}	
				}			

				score = this.pos.getRangeTo(containers[i]) + 25; // let haulers pick this up
				score -= ((containers[i].store[RESOURCE_ENERGY] - 1000) / 1000) * 10;	// (0-5 = 1000-2000)
				targets.push({id: containers[i].id, score: score });
			}

			if (targets.length === 0) {
				// CHECK STORAGE
				let storage = this.room.storage;
				if (storage && storage.store[RESOURCE_ENERGY] && storage.store[RESOURCE_ENERGY] > carryCapacity) {
					score = this.pos.getRangeTo(storage);
					targets.push({id: storage.id, score: score });
				}

				// CHECK TERMINAL
				let terminal = this.room.terminal;
				if (terminal && terminal.store[RESOURCE_ENERGY] && terminal.store[RESOURCE_ENERGY] >= carryCapacity) {
				//	if (((Memory.energyShare !== undefined && Memory.energyShare[room] !== undefined)) ||
				//		terminal.store[RESOURCE_ENERGY] > TERMINAL_TARGET_ENERGY_SHARE) {
						score = this.pos.getRangeTo(terminal);
					//	this.room.visual.text(score, terminal.pos.x, terminal.pos.y, { color: 'green', font: 0.8 });
						targets.push({id: terminal.id, score: score });						
				//	}
				}
				this._cache.fromStore = Game.time + 10;
			}

			if (targets.length === 0) {
				// CHECK CONTAINERS
				containerRequiredAmount = neededAmount;
				containers = _.filter(this.room.findByType(STRUCTURE_CONTAINER),
					function (structure) {
						return (structure.isProvider() &&
							((structure.store[RESOURCE_ENERGY] - structure.withdraw) >= containerRequiredAmount));
					});
				for (let i=0; i < containers.length; i++ ) {

					if (this.room.memory.isAttacked) {
						if (isOutsideWalls(containers[i].pos) && containers[i].pos.lookForStructuresAround(STRUCTURE_RAMPART, 1).length <= 0) { continue; }

						if (this._memory.avoidRes) {
							if (this._memory.avoidRes.includes(containers[i].id)) { continue; }
						}
					}

					if (this._memory[C.ROLE] === 'mover') {
						let source = containers[i].pos.findInRange(FIND_SOURCES, 1)
						if (source.length > 0) {
							if ((roadBuiltStatus(this._memory[C.ROOM_ORIGIN], source[0].id) > 0.9) !== this.forRoads() ) {
								if (containers[i].store[RESOURCE_ENERGY] < 1000) { continue; } // let haulers pick this up)
							}
						}
					}
					
					score = this.pos.getRangeTo(containers[i]) + 25; // let haulers pick this up
					score -= ((containers[i].store[RESOURCE_ENERGY] - 1000) / 1000) * 10;	// (0-5 = 1000-2000)
					targets.push({id: containers[i].id, score: score });
				}
			}

			if (this.room.energyStatus() <= ECONOMY_CRASHED) {
				let links = getControllerLink(this.room.name);
				
				for (let i=0; i < links.length; i++ ) {
					let link = links[i];
					if (link.energy > 250) {
						score = this.pos.getRangeTo(link);
					//	this.room.visual.text(score, link.pos.x, link.pos.y, { color: 'green', font: 0.8 });
						targets.push({id: link.id, score: score });	
					}
				}
			}
		
			
			if (targets.length > 0) {
				let preferedTarget;
				let bestScore = Infinity;
				
				for (let i=0; i < targets.length; i++ ) {				
					if (targets[i].score < bestScore) {						
						bestScore = targets[i].score;
						preferedTarget = targets[i].id;
					}
				}

				if (preferedTarget) {

					// if creep has some energy, consider going to work instead if energy is far away

					this.assignTarget(preferedTarget, role, RESOURCE_ENERGY);	
					delete this._memory.retryCount;
				} 
			} else {
				if (!this._memory.retryCount) { this._memory.retryCount = 0; }
				this._memory.retryCount++
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
	};

	// GET ENERGY FROM STORAGE
	Creep.prototype.getEnergyFromStorage = function () {
		let role = "getEnergyFromStorage";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET]) {
			if (!this.room.storage) { return 0; }
			let carryCapacity = this.carryCapacity;			
			let targets = _.filter([this.room.storage],
				function (structure) {
					return ((structure.store[RESOURCE_ENERGY] - structure.withdraw) >= carryCapacity);
				});

			if (targets.length > 0) {
				this.assignTarget(targets[0].id, role, RESOURCE_ENERGY);
				//	this.room.memory.withdraw[targets[0].id]+=this.carryCapacity;
				//console.log(this.room +" get source from storage; " + ClosestTarget.id +" "+ this +" role " + this._memory[C.ROLE])					
			}

		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
		return 0;
	};
	// GET ENERGY FROM TERMINAL
	Creep.prototype.getEnergyFromStores = function () {
		let role = "getEnergyFromStores";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {

			let carryCapacity = this.carryCapacity;			
			let targets = [];

			// CHECK STORAGE
			let storage = this.room.storage;
			if (storage && storage.store[RESOURCE_ENERGY] && storage.store[RESOURCE_ENERGY] > carryCapacity) {
				targets.push(this.room.storage);
			}

			// CHECK TERMINAL
			if (this.room.terminal && this.room.terminal.store[RESOURCE_ENERGY] && this.room.terminal.store[RESOURCE_ENERGY] >= carryCapacity) {
				//		if (((Memory.energyShare !== undefined && Memory.energyShare[room] !== undefined)) || 
				//			this.room.terminal.store[RESOURCE_ENERGY] > TERMINAL_TARGET_ENERGY_SHARE){					
				targets.push(this.room.terminal);
				//		}
			}

			if (targets.length > 0) {
				let closestTarget = this.pos.findClosestByRange(targets, {});
				if (closestTarget != undefined) {
					this.assignTarget(closestTarget.id, role, RESOURCE_ENERGY);
					//	console.log(this.room + " getConsumerEnergy assigned " + type)
				}
			}

		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}

	};

	// GET ENERGY FROM TERMINAL
	Creep.prototype.getEnergyFromTerminal = function () {
		let role = "getEnergyFromTerminal";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }

		// ASSIGN  	
		if (!this._memory[C.CLOSEST_TARGET]) {
			if (!this.room.terminal) { return 0; }
			if (Memory.energyShare !== undefined && Memory.energyShare[this.room.name] !== undefined) {
				if (this.room.terminal && this.room.terminal.store[RESOURCE_ENERGY] && (this.room.terminal.store[RESOURCE_ENERGY] - this.carryCapacity) < TERMINAL_TARGET_ENERGY_SHARE) {
					return 0;
				}
			}
			let carryCapacity = this.carryCapacity;			
			let targets = _.filter([this.room.terminal],
				function (structure) {
					return ((structure.store[RESOURCE_ENERGY] - structure.withdraw) >= (TERMINAL_TARGET_ENERGY_LOW + carryCapacity));
				});
			if (targets.length > 0) {
				this.assignTarget(targets[0].id, role, RESOURCE_ENERGY);
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
	};


	// GET ENERGY FROM GROUND	
	Creep.prototype.getEnergyFromGround = function () {
		let role = "getEnergyFromGround";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET] && !this.room.memory.hostiles) {
			let targets = this.room.find(FIND_DROPPED_RESOURCES, {
				filter: (resource) => {
					return ((resource.amount - resource.withdraw) >= 100 &&
						resource.resourceType == RESOURCE_ENERGY);
				}
			});
			if (targets != undefined) {
				let ClosestTarget = this.pos.findClosestByRange(targets, { ignoreCreeps: true });
				if (ClosestTarget != undefined) {
					this.assignTarget(ClosestTarget.id, role);

				}
			}
			else { return 0; }
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);

			let value = this.pickup(targetObj);

			if (value == OK) {
				this.clearTarget();
			}
			else if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 1, range: 1 });
				//	this.room.memory.withdraw[targetObj.id]+=this.carryCapacity;
			}
			else if (value < 0) {
				this.clearTarget();
			}
			return 1;
		}
	};

	Creep.prototype.pitaSwitchTarget = function () {
		
		if (this._memory.pitaTs && Game.time < this._memory.pitaTs) { return; }
		if (this.room.name !== this._memory[C.ROOM_TARGET]) { return; }
		
		let hostiles = calcCreepStrength(getEnemyCreeps(this.room.name))
		if (hostiles && hostiles.defensive >= 10 ) {
			let currentPlayerTarget = getPlayerByRoomName(this.room.name) 
			
			if (currentPlayerTarget && Memory.players[currentPlayerTarget] && Memory.players[currentPlayerTarget].remotes) {
				let bestScore = Infinity;
				let bestTarget;
				for (let remote in Memory.players[currentPlayerTarget].remotes) {
					let score = 0;

					if (remote === this.room.name) { continue; }

					if (Game.rooms[remote]) {
						score += 1;
					}
					if (Game.map.getRoomLinearDistance(this.room.name, remote) > 5) { continue; }

					score += getRouteDistanceOnly(this.room.name, remote, { restrictDistance: 5 });
					if (score < bestScore) {
						bestScore = score;
						bestTarget = remote;
					}
				}

				if (bestTarget) {
					this._memory[C.ROOM_TARGET] = bestTarget;
					this._memory.pitaTs = Game.time + 75;
					delete this._memory.reg;
				}
			}
		}
	}

	// GET ENERGY FROM SOURCE	
	Creep.prototype.getEnergyFromSource = function (sourceId) {
		let role = "getEnergyFromSource";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  	
		if (!this._memory[C.CLOSEST_TARGET]) {
			
			if (sourceId) {
				this.assignTarget(sourceId, role);
				this._memory.gotoSource = 3;
			} else {

				if (roomIsSk(this.room.name) && (!Memory.rooms[this.room.name] || !Memory.rooms[this.room.name][R.MY_MINING_OUTPOST])) { return 0; }

				let needEnergy = this.store.getFreeCapacity(RESOURCE_ENERGY);
				let targets = this.room.find(FIND_SOURCES, {
					filter: (source) => {
						return (source.energy > needEnergy &&
								(!source._cache.extractorTs || Game.time > source._cache.extractorTs)
								);
					}
				});
				//	console.log(this.room.name + " getEnergyFromSource targets " +targets.length)
				if (targets.length > 0) {

					let ClosestTarget = this.pos.findClosestByPath(targets, { ignoreCreeps: true });
					if (ClosestTarget != undefined) {
						this.assignTarget(ClosestTarget.id, role);
						this._memory.gotoSource = 3;						
					}
				}
			}
		}

		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			
			if (!targetObj) {
				this.clearTarget();
				return;
			}
			
			if (this._memory.gotoSource && this.room.name === targetObj.room.name && this.pos.getRangeTo(targetObj) < this._memory.gotoSource ) {
				delete this._memory.gotoSource;
			}

			let dest = targetObj.pos;
			let range = 1;
			if (!this._memory.gotoSource) {
				dest = targetObj.pos.pullSiegeFormation(this.pos);
				range = 0;
			}
			
			if (this.pos.getRangeTo(dest) > range) {
				this.travelTo(dest, { range: range, roomCallback: avoidSources});
				this.room.visual.line(this.pos, dest, { color: "green", lineStyle: "solid" });
			} 

			let result = ERR_NOT_IN_RANGE;
			if (this.pos.getRangeTo(targetObj) <= 1) {
				result = this.harvest(targetObj);
			}
		
			if (result === OK) {
				delete this._cache.mstate;
			} else if (result == ERR_NOT_IN_RANGE) {

			} else {
				this.clearTarget();
				delete this._memory.retryCount;
			}
			
			return 1;
		}
	};

	Creep.prototype.maintainDistance = function(target, wantedRange, kite = false){

		let rangeToTarget = this.pos.getRangeTo(target);

		if (wantedRange >= 0 && wantedRange === rangeToTarget) { return; }

		let dest = target.pos
		if (kite) {
		//	wantedRange = 3;
		} else if (wantedRange == 0) {
			//
		} else if (wantedRange <= 1) {
			dest = target.pos.pullSiegeFormationCombat(this.pos);
			rangeToTarget = this.pos.getRangeTo(dest);
			wantedRange = 0;
		}

		if (target.isCreep && wantedRange >= 2) {
			kite = true;
		}

		if (rangeToTarget > wantedRange || this.pos.isNearExit(0)) {
			this.travelTo(dest, {range: wantedRange, maxOps: 10000, ignoreCreeps: false, roomCallback: raidMatrix, ensurePath: true});
		} else if (kite && rangeToTarget <= wantedRange) {
			if (this.controller && this.controller.my && this.pos.lookForStructure(STRUCTURE_RAMPART) ) { return 0; }
			this.defensiveRetreatPath({ kite: kite });
		}
	}

	// GET ENERGY FROM CONTROLLER LINK
	Creep.prototype.getEnergyFromControllerLink = function () {
		let role = "getEnergyFromControllerLink";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  	
		if (!this._memory[C.CLOSEST_TARGET]) {
			let targets = _.filter(this.room.findByType(STRUCTURE_LINK),
				function (structure) {
					return (structure.isController() && structure.energy > 0);
				});

			if (targets.length > 0)
				this.assignTarget(targets[0].id, role);
			//	this.room.memory.withdraw[targets[0]]+=this.carryCapacity;
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();

		}
		return 0;
	};

	// GET ENERGY FROM STORAGE LINK
	Creep.prototype.getEnergyFromStorageLink = function () {
		let role = "getEnergyFromStorageLink";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  	
		if (!this._memory[C.CLOSEST_TARGET] && (this.room.controller.level === 8 || Memory.PraiseGCL && Memory.PraiseGCL[this.room.name])) {
			let targets = _.filter(this.room.findByType(STRUCTURE_LINK),
				function (structure) {
					return (structure.isStorage() && structure.energy >= 100);
				});
			if (targets.length > 0) {
				this.assignTarget(targets[0].id, role);
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			return this.withdrawAction();
		}
		return 0;
	};

	Creep.prototype.depositToExtensions = function (source) {		

		if (!this.room.controller || !this.room.controller.my) { return }
		source.pos._cache.craneTs = Game.time + 73;

		if (this._cache.delayFillSourceExt > Game.time) { return }

		if (this.room.energyAvailable === this.room.energyCapacityAvailable) { return }

		let sourceExtensions = source.getSourceExtensions();

		let energyMined = 12;
		if (!this._cache.energyMined) {
			this._cache.energyMined = this.hasBodyparts(WORK) * HARVEST_POWER
		} else {
			energyMined = this._cache.energyMined;
		}
		if (source.energy === 0) { energyMined = 0; }

		if (sourceExtensions.length > 0) {

			let transfered = false;
			let wantToWithdraw;
			let transferedAmount = 0;
			for (let idx in sourceExtensions) {
				let extension = Game.getObjectById(sourceExtensions[idx])
				if (!extension) {
					source.getSourceExtensions(true);
					log(this.room.name + " missing source extension!" + sourceExtensions[idx])
					return;
				}

				let missingEnergy = extension.store.getFreeCapacity(RESOURCE_ENERGY)
				if (missingEnergy <= 0) { continue; }
				this.room.visual.circle(extension.pos.x, extension.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'yellow'}) 
				
				if (this.store.getFreeCapacity(RESOURCE_ENERGY) < energyMined || (energyMined === 0 && this.store[RESOURCE_ENERGY] > 0)) {
					this.transfer(extension, RESOURCE_ENERGY);
					transferedAmount = Math.min(this.store[RESOURCE_ENERGY], missingEnergy);
					transfered = true;
					break;
				}

				if (energyMined === 0) {
					wantToWithdraw = true;
				}
				
				break;
			}

			if (wantToWithdraw) {
				let container = Game.getObjectById(this._cache.containerId);
				if (container) {
					let energyInContainer = container.store[RESOURCE_ENERGY];
					let amoutToWithdraw = Math.min(energyInContainer, this.store.getFreeCapacity(RESOURCE_ENERGY) - (energyMined) + transferedAmount)
					if (amoutToWithdraw > 40) {
						this.withdraw(container, RESOURCE_ENERGY, amoutToWithdraw)
						transfered = true;
						this.room.visual.circle(container.pos.x, container.pos.y , {fill: 'transparent', radius: 0.25, stroke: 'yellow'})	
					} else if (energyInContainer < 40 && energyMined === 0) {
						
						if (roomIsPowerSource(this.room.name)) {
							this._cache.delayFillSourceExt = Game.time + 5;
						} else {
							this._cache.delayFillSourceExt = Game.time + source.ticksToRegeneration;
						}
					}
				}				
			}
			return transfered;
		}

	}

	// TRANSFER TO LINK
	Creep.prototype.depositToLink = function () {

		if (this._cache.sourceLink === undefined) {

			if (this.room.memory.sources && this.room.memory.sources[this._memory[C.SOURCE_ID]] && this.room.memory.sources[this._memory[C.SOURCE_ID]].link) {
				let link = Game.getObjectById(this.room.memory.sources[this._memory[C.SOURCE_ID]].link);
				if (link) {
					this._cache.sourceLink = link.id;
				} else {
					delete this.room.memory.sources[this._memory[C.SOURCE_ID]].link;
				}
			}

			if (this._cache.sourceLink === undefined) {
				let links = this.pos.findInRange(FIND_MY_STRUCTURES, 1, {
					filter: (structure) => {
						return (structure.structureType == STRUCTURE_LINK &&
								!structure.isController() );
					}
				});

				if (links.length > 0) {
					this._cache.sourceLink = links[0].id;

					this.room.memory.sources[this._memory[C.SOURCE_ID]].link = links[0].id;
					
				}
				else {
					this._cache.sourceLink = -1;
				}
			}
			
		}

		if (this._cache.sourceLink === -1) {
			return;
		}
		else {
			if (this.carry[RESOURCE_ENERGY] >= (this.carryCapacity - 12)) {
				let targetObj = Game.getObjectById(this._cache.sourceLink);				
				this.transfer(targetObj, RESOURCE_ENERGY);
			}
		}
	};


	Creep.prototype.repairContainer = function () {
		if (this._cache.rt === undefined) { this._cache.rt = Game.time; }
		if (this._cache.rt > Game.time) { return 0; }

		if (this._cache.rp === undefined) {
			let WorkParts = this.getActiveBodyparts(WORK);
			this._cache.rp = REPAIR_POWER * WorkParts;
		}

		if (this._cache.rp === 0 || this.store.energy === 0) { return 0; }
		let container = Game.getObjectById(this._cache.containerId);
		if (!container) { return 0; }
		if ((container.hitsMax - container.hits) >= this._cache.rp) {
			this.repair(container);
			return 1;
		} else { // Wait n tick for next attempt
			this._cache.rt = Game.time + 37;
		}
	};

	Creep.prototype.roleGenerateSafemode = function () {
		let role = "roleGenerateSafemode";
		// CHECK IF OTHER ROLE ACTIVE
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this.room.controller || this.room.controller.safeModeAvailable >= 3 || this.room.controller.level < 3) { return 0; }
		if (!this._memory[C.CLOSEST_TARGET] && !this.carry[RESOURCE_GHODIUM]) {
			if (this.carryCapacity < 1000 || this.sumCarry > 0) { return 0; }
			if (this.room.controller.safeModeAvailable >= 3 || this.room.controller.level < 3) { return 0; }
			let source = _.filter(this.room.findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
					function (structure) {
						return (structure.store[RESOURCE_GHODIUM] >= 1000);
					});
			if (source.length > 0) {
				this.assignTarget(source[0].id, role, RESOURCE_GHODIUM);
				this._memory.amount = 1000;
			}
		}
	
		if (this._memory[C.CLOSEST_TARGET] || this.carry[RESOURCE_GHODIUM] >= 1000) {
			if (!this.carry[RESOURCE_GHODIUM]) {
				this.withdrawAction(this._memory.amount);
			} else {
				if (this.pos.getRangeTo(this.room.controller) > 1) {					
					this.travelTo(this.room.controller, { range: 1});
				} else {
					let value = this.generateSafeMode(this.room.controller);
					if (value === OK) {
						this.clearTarget();
					} else {
						this.clearTarget();
					}
				}
			}
			return 1;	
		}
		
	}

	// REPAIR WHILE MOVING
	Creep.prototype.fillWhileMoving = function (spawnersOnly=false) {
		
	//	if (this.room._noHarvestJob) { return 0; }	// ignores jobs which are under way
		if (this.carry.energy == 0) { return 0; }

	//	if (this.room.energyAvailable === this.room.energyCapacityAvailable) { return 0; } // labs, towers?
		let dist = 1;
		let top = limit(this.pos.y - dist, 1, 48);
		let left = limit(this.pos.x - dist, 1, 48);
		let bot = limit(this.pos.y + dist, 1, 48);
		let right = limit(this.pos.x + dist, 1, 48);
	//	let rp = this._memory.rp;
		let refillTargets = [];
		if (this.room.memory.spawnQ || spawnersOnly) {
			refillTargets = _.filter(this.room.lookForAtArea(LOOK_STRUCTURES, top, left, bot, right, true),
				function (c) {
					return (
						(c.structure.store && c.structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) &&
						(c.structure.structureType === STRUCTURE_EXTENSION ||
						(c.structure.structureType === STRUCTURE_CONTAINER && c.structure.isSpawner() && c.structure.store[RESOURCE_ENERGY] < 200 )  ||
						c.structure.structureType === STRUCTURE_SPAWN)
						);
				});
		} else if (this.room.energyAvailable === this.room.energyCapacityAvailable) {
			refillTargets = _.filter(this.room.lookForAtArea(LOOK_STRUCTURES, top, left, bot, right, true),
			function (c) {
				return (
					(c.structure.store && c.structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) &&
					(c.structure.structureType === STRUCTURE_LAB ||
					(c.structure.structureType === STRUCTURE_CONTAINER && (c.structure.isController() || c.structure.isSpawner() ) )  ||
					(c.structure.structureType === STRUCTURE_LINK && c.structure.isController() ) ||
					c.structure.structureType === STRUCTURE_TOWER)
					);
			});
		} else {
			let energyLevelsOk = this.room.energyStatus() >= ECONOMY_DEVELOPING
			refillTargets = _.filter(this.room.lookForAtArea(LOOK_STRUCTURES, top, left, bot, right, true),
				function (c) {
					return (
						(c.structure.store && c.structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0) &&
						(c.structure.structureType === STRUCTURE_EXTENSION ||
						c.structure.structureType === STRUCTURE_SPAWN ||
						c.structure.structureType === STRUCTURE_LAB ||
						(c.structure.structureType === STRUCTURE_CONTAINER && c.structure.isController() && energyLevelsOk) ||
						(c.structure.structureType === STRUCTURE_LINK && c.structure.isController() && energyLevelsOk) ||
						c.structure.structureType === STRUCTURE_TOWER && energyLevelsOk)
						);
				});
		}
			
		if (refillTargets.length > 0){

			let bestTarget
			let bestScore = 0;
			for (let idx in refillTargets) {
				let target = refillTargets[idx].structure
				if (target.store.getFreeCapacity(RESOURCE_ENERGY) > bestScore) { 
					bestScore = target.store.getFreeCapacity(RESOURCE_ENERGY)
					bestTarget = target
				}
			}

			if (!bestTarget) { return 0; } 
			let result = this.transfer(bestTarget, RESOURCE_ENERGY);

			if (result === OK && bestTarget.store.getFreeCapacity(RESOURCE_ENERGY) >= this.store[RESOURCE_ENERGY] ) {
				delete this._cache.mstate;
			}

			return refillTargets.length;
		}
		return 0;
	}

	Creep.prototype.mySignController = function(targetObj) {
		if (targetObj && 
			!this._cache.signed && 
			((targetObj.sign && targetObj.sign.text !== signText) || !targetObj.sign)
			) {
			this._cache.signed = 1;
			this.signController(targetObj, signText);
		}
	}
	

	// REPAIR WHILE MOVING
	Creep.prototype.repairWhileMoving = function (dist, allowLocal = false, allowBuild = false, repairTicks = 2) {
		if (!allowLocal && this.room.controller && this.room.controller.my) { return 0; }

		if (this._cache.rep === undefined) { this._cache.rep = Game.time-1; }
		if (this._cache.rep >= Game.time) { return 0; }

		if (this._cache.rp === undefined) {
			this._cache.rp = REPAIR_POWER * this.getActiveBodyparts(WORK);
		}

		if (this._cache.rp === 0 || this.store[RESOURCE_ENERGY] === 0) { return 0; }
	
		if (typeof dist === 'undefined') { dist = 1; }
		let top = limit(this.pos.y - dist, 1, 48);
		let left = limit(this.pos.x - dist, 1, 48);
		let bot = limit(this.pos.y + dist, 1, 48);
		let right = limit(this.pos.x + dist, 1, 48);
		let rp = this._cache.rp;

		let allowRampRepair = false;
		let rampartHpLimit = 10000;
		if (allowBuild && rp >= 500) {
			allowRampRepair = true;
			rampartHpLimit = getAvgWallHp(this.room.name)
		}		

		let repairTargets = _.filter(this.room.lookForAtArea(LOOK_STRUCTURES, top, left, bot, right, true),
			function (c) {
				return (c.structure.hitsMax - (c.structure.hits + (c.structure._repaired || 0))) >= rp &&
					((c.structure.structureType != STRUCTURE_WALL &&
					c.structure.structureType != STRUCTURE_CONTAINER &&
					c.structure.structureType != STRUCTURE_RAMPART &&
					c.structure.structureType != STRUCTURE_ROAD) ||
					((c.structure.structureType === STRUCTURE_RAMPART && allowRampRepair && rampartIsValid(c.structure.pos)) ||
					(c.structure.structureType === STRUCTURE_CONTAINER && containerIsValid(c.structure.pos)) ||
					(c.structure.structureType === STRUCTURE_ROAD && roadIsValid(c.structure.pos)) )) 
			});
		
		if (allowBuild) {
			let buildTargets = _.filter(this.room.lookForAtArea(LOOK_CONSTRUCTION_SITES, top, left, bot, right, true),
			function (c) {
				return (
					c.constructionSite.my &&
					c.constructionSite.structureType !== STRUCTURE_RAMPART	// Ramparts will likely decay if built by haulers etc 
					);
			});
			repairTargets = repairTargets.concat(buildTargets);
		}

		if (repairTargets.length > 0) {
			if (repairTargets[0].constructionSite) {
				this.build(repairTargets[0].constructionSite);
				return repairTargets[0].constructionSite.id;
			} else {
				let target 
				for (let idx in repairTargets) {
					let tempTarget = repairTargets[idx].structure;
					if (!tempTarget) { continue; } // could be csite
					
					if (tempTarget.isRampart) {
						let wallType = rampartIsValid(tempTarget.pos);
						if (!wallType) { continue; }
						let effectiveHp = tempTarget.hits * (RAMPART_HP[wallType] || 1)		
						if (effectiveHp > rampartHpLimit) { continue; }
						target = tempTarget
						break
					} else {
						target = repairTargets[idx].structure;
						break;
					}
				}

				if (target) {
					this.repair(target);
					if (target._repaired === undefined) { target._repaired = 0; }
					target._repaired += this._cache.rp
					return 1;
				}
			}			
		} else { // Wait 1 tick for next attempt
			this._cache.rep = Game.time + repairTicks;
		}
		return 0;
	};

	Creep.prototype.upgraderGetEnergy = function () {
		let dist = 3;
		let top = limit(this.room.controller.pos.y - dist, 1, 48);
		let left = limit(this.room.controller.pos.x - dist, 1, 48);
		let bot = limit(this.room.controller.pos.y + dist, 1, 48);
		let right = limit(this.room.controller.pos.x + dist, 1, 48);

		let energy = _.filter(this.room.lookForAtArea(LOOK_STRUCTURES, top, left, bot, right, true),
			function (c) { return (c.structure.structureType == STRUCTURE_STORAGE); });
		if (energy.length > 0) {
			let targetObj = energy[0].structure;
			if (this.pos.getRangeTo(targetObj) > 1) {
				this.travelTo(targetObj, { maxRooms: 1, range: 1 });
				return 1;
			} else {
				this.withdraw(targetObj, RESOURCE_ENERGY);
			}
		}
	};


	global.controllerNeedsUpgrade = function(controller, needOnly = false) {
		if (controller && controller.my && !controller.upgradeBlocked) {
			let level = controller.level;

			if (level === 1 && !needOnly) { return true; }
			if (controller.progress > controller.progressTotal) { return true; }
			let factorDowngrade = 0.5;
			if (controller.safeModeCooldown || controller.room.memory.reinforce) {
				factorDowngrade = 0.85;
			}

			let maxTicksToDowngrade = CONTROLLER_DOWNGRADE[level] * factorDowngrade;
			if (controller.ticksToDowngrade < (maxTicksToDowngrade - CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD + CREEP_LIFE_TIME)) {
				return true;
			}
			return false
		}
	}

	// ROLE UPGRADER
	Creep.prototype.roleEmUpgrader = function (bootStrapper = false) {
		let role = "roleUpgrader";
		if (!this.checkRole(role)) { return 0; }
		if (!this._memory[C.CLOSEST_TARGET]) {
			if (controllerNeedsUpgrade(this.room.controller, bootStrapper)) {
			//	this.assignTarget(this.room.controller.id, role);
				this.roleUpgrader();
				//	this.clearTarget()
				return 1;
			}
		} else {

			return 0;
		}
	};


	// ROLE UPGRADER
	Creep.prototype.roleUpgrader = function () {
		let role = "roleUpgrader";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET]) {

			if (this.room.controller && this.room.controller.my) {
				this.assignTarget(this.room.controller.id, role);
			}
			else { return 0; }
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);

			let value = ERR_NOT_IN_RANGE;

			// IN RANGE
			let dest 
			let range = 0;
			if (this.room.controller.level < 8) {
				dest = targetObj.pos.pullUpgraderFormation(this.pos, this.id);				
			} else {
				dest = this.room.controller.pos;
				range = 3;
			}

			if (this.pos.getRangeTo(this.room.controller) <= 3) {
				value = this.upgradeController(this.room.controller);
			}

			if (dest && this.pos.getRangeTo(dest) > range) {
				value = ERR_NOT_IN_RANGE;
			}


			if (value == OK) {
				delete this._cache.mstate;
				this.yieldRoad(targetObj.pos);
				if (Game.time % 199 === 1) {
					if (targetObj && (targetObj.sign && targetObj.sign.text !== signText) || !targetObj.sign) {
						this.signController(targetObj, signText);
						this.travelTo(targetObj, { maxRooms: 1, range: 1 });
					}
				} else if (Game.time % 19 === 2) {
					this.repairWhileMoving(1, true);
				}

			}
			else if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(dest, { maxRooms: 1, range: range });
			}
			else if (value < 0) {
				console.log(this + " upgrader return " + value + " room " + this.pos.roomName + " is carrying " + this.carry[RESOURCE_ENERGY]);
				this.clearTarget();
				return 0;
			}
			return 1;
		}
	};

	// REFILL LABS
	Creep.prototype.roleRefillLab = function () {
		let role = "roleRefillLab";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		if (!this._memory[C.CLOSEST_TARGET]) {
			let carryCapacity = this.carryCapacity;			
			let targets = _.filter(this.room.findByType(STRUCTURE_LAB),
				function (structure) {
					return ((structure.energyCapacity - (structure.energy + structure.deliver)) >= carryCapacity);
				});
			if (targets.length > 0) {
				this.assignTarget(targets[0].id, role);
			}
			else { return 0; }
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (targetObj.id === undefined) { this.clearTarget(); }

			let value = ERR_NOT_IN_RANGE;
			if (this.pos.inRangeTo(targetObj.pos, 1)) {
				value = this.transferAny(targetObj);
			}

			if (value == OK || value == ERR_FULL) {
				this.clearTarget();
			}
			else if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 1, range: 1 });
			}
			else if (value < 0) {
				this.clearTarget();
				return 0;
			}
			return 1;
		}
		else { return 0; }
	};

	// HARVESTER GET TARGET	
	Creep.prototype.roleMoverHasTicksLeft = function (minTicks) {
		let role = "roleMoverHasTicksLeft";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  		
		if (this.ticksToLive <= minTicks) {
			this.recycleOrSuicide();
			return 1;
		}
	};

	Creep.prototype.refillSpawnerContainers = function(neededMissingEnergy = 0) {

		if (!ENABLE_SPAWN_EXTENSIONS) { return 0; }
		let role = "refillSpawnerContainers";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
			let containers = this.room.getSpawnContainers();

			let bestTarget;
			let bestScore = -999;
			for (let idx in containers) {
				let container = containers[idx]
				let missingEnergy = container.store.getFreeCapacity(RESOURCE_ENERGY) - container.deliver
				if (missingEnergy < this.store[RESOURCE_ENERGY] || missingEnergy < neededMissingEnergy) { continue; }
			//	let distance = this.pos.getRangeTo(container)
				let score = (missingEnergy / CONTAINER_CAPACITY);
				if (score > bestScore) {
					bestScore = score;
					bestTarget = container;
				}
			}
			if (bestTarget) {
				this.assignTarget(bestTarget.id, role);
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (!targetObj || targetObj.id === undefined) { this.clearTarget(); }


			let value = this.transfer(targetObj, RESOURCE_ENERGY);
			if (value == OK) {

				let transfered = Math.min(this.store[RESOURCE_ENERGY], targetObj.store.getFreeCapacity(RESOURCE_ENERGY))
				if (transfered >= this.store[RESOURCE_ENERGY]) {
					this._readyForNewWork = true;
				}
				this.clearTarget();
			}
			else if (value == ERR_NOT_IN_RANGE) {
				let targets = this.fillWhileMoving(true);
				if (targets > 1) { return 1; }

				this.travelTo(targetObj, { maxRooms: 2, range: 1 });

			}
			else if (value < 0) {
				this.clearTarget();
				delete this._cache.mstate;
				return 0;
			}
			return 1;

		}
	}
	

	// REFILL CONTROLLER CONTAINER
	Creep.prototype.roleRefillControllerContainer = function (_targetRoom) {
		let role = "roleRefillControllerContainer";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {

			let roomName = _targetRoom
			if (!_targetRoom) {
				roomName = this._memory[C.ROOM_ORIGIN];
			}
			let targetRoom = Game.rooms[roomName]
			if (!targetRoom) { return 0; }
		//	if (!targetRoom.controller || targetRoom.controller.level >= 8) { return 0; }
			if (PRAISE_GCL_ROOMS[roomName]) { return 0; }
			let currentEnergy = Math.min(this.carry[RESOURCE_ENERGY], 1000);
		//	let energyDrain = getEstimatedEnergyDrainController(this.room.name);
			let targets = _.filter(targetRoom.findByType(STRUCTURE_CONTAINER),
				function (structure) {
					return (structure.isController() && !structure.isProvider() &&
						((structure.storeCapacity - (structure.store[RESOURCE_ENERGY] + structure.deliver) )  >= currentEnergy));
				});

			if (targets.length > 0) {

				
			} else {
				//
				let minimumEnergy = Math.min(currentEnergy, 0)
				targets = _.filter(getControllerLink(this.room.name),
				function (structure) {
					return ((structure.store[RESOURCE_ENERGY] + structure.deliver) <= minimumEnergy)
				});
			}

			if (targets.length > 0) {
				// If low energy and long range, get energy instead
				let energyPercentage = this.store[RESOURCE_ENERGY] / this.store.getCapacity()
				if (energyPercentage < 0.5 && this.pos.getRangeTo(targets[0]) > 5) { return 0; } 

				this.assignTarget(targets[0].id, role);
			}			
		}

		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (!targetObj || targetObj.id === undefined) { this.clearTarget(); }

			this.room.visual.line(this.pos, targetObj.pos, { color: "yellow", lineStyle: "solid" });

			let value = this.transfer(targetObj, RESOURCE_ENERGY);
			if (value == OK || value == ERR_FULL) {

				let transfered = Math.min(this.store[RESOURCE_ENERGY], targetObj.store.getFreeCapacity(RESOURCE_ENERGY))
				if (transfered >= this.store[RESOURCE_ENERGY]) {
					this._readyForNewWork = true;
				}

				this.clearTarget();
			}
			else if (value == ERR_NOT_IN_RANGE) {
				let targets = this.fillWhileMoving();
				if (targets > 1) { return 1; }
				if (this.room._memory.newRCL) { this.giveAwayEnergy() }

				this.travelTo(targetObj, { maxRooms: 1, range: 1 });
			}
			else if (value < 0) {
				log(this + " roleRefillControllerContainer " + " error " + value)
				this.clearTarget();
				delete this._cache.mstate;
				return 0;
			}
			return 1;
		}
		else { return 0; }
	};

	// HARVESTER GET TARGET	
	Creep.prototype.roleHarvesterGetTarget = function (premove, multiTarget) {

		if (this.room._noHarvestJob) { return 0; }
		let role = "roleHarvester";
		// console.log(" roleHarvesterGetTarget energy available :" + this.room.energyAvailable + "/" +this.room.energyCapacityAvailable)
		if (Memory.rooms[this.room.name] && Memory.rooms[this.room.name].hostiles && !Memory.rooms[this.room.name].spawnQ ) {

			let targetsSec = _.filter(this.room.findByType([STRUCTURE_TOWER, STRUCTURE_LAB]),
				function (structure) {
					return (structure.energy < (structure.energyCapacity - 250) &&
						((structure.energy + structure.deliver) < structure.energyCapacity));
				});

			if (targetsSec.length > 0) {
				let ClosestTarget = this.pos.findClosestByRange(targetsSec, { ignoreCreeps: true });
				if (ClosestTarget != undefined) {
					this.assignTarget(ClosestTarget.id, role);
				}
			} else if (this.room.energyAvailable < this.room.energyCapacityAvailable) {
				if (this.room.memory.fillOrder && multiTarget) {	
					let targets = this.room.getFillOrderJobs(this.pos);
					for (let idx in targets) {
						this.assignMultiTarget(targets[idx], role);
					}
					this.checkCurrentTarget();
				} else {
					let targets = this.room.getRefillJobs();
					if (targets.length === 0) {
						targets = this.room.resetAndGetRefillJobs();
					}
					if (targets.length > 0) {
						let nearbyTarget = this.pos.findClosestByRange(targets, { ignoreCreeps: true });
						if (nearbyTarget != undefined) {
							if (this.carry[RESOURCE_ENERGY] >= (nearbyTarget.energyCapacity - (nearbyTarget.energy + nearbyTarget.deliver))) {
								this.room.pullRefillJob(nearbyTarget.id);
							}
							this.assignTarget(nearbyTarget.id, role);
						}
					}
				}
			}
		} else if (this.room.energyAvailable < this.room.energyCapacityAvailable) {
			
			
			if (this.room.memory.fillOrder && multiTarget) {	
				let targets = this.room.getFillOrderJobs(this.pos);
				for (let idx in targets) {
					this.room.visual.circle(targets[idx].pos.x, targets[idx].pos.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'}) 
					this.room.visual.line(this.pos, targets[idx].pos, { color: "blue", lineStyle: "solid" });
					this.assignMultiTarget(targets[idx], role);
				}
				this.checkCurrentTarget();
			} else {
				let targets = this.room.getRefillJobs();
				if (targets.length === 0) {
					targets = this.room.resetAndGetRefillJobs();
				}
				if (targets.length > 0) {
					let nearbyTarget = this.pos.findClosestByRange(targets, { ignoreCreeps: true });
					if (nearbyTarget) {
						if (this.carry[RESOURCE_ENERGY] >= (nearbyTarget.energyCapacity - (nearbyTarget.energy + nearbyTarget.deliver))) {
							this.room.pullRefillJob(nearbyTarget.id);
						}
						this.assignTarget(nearbyTarget.id, role);
					}
				} else {
					let targetsSec = _.filter(this.room.findByType([STRUCTURE_TOWER, STRUCTURE_LAB]),
						function (structure) {
							return (structure.energy < (structure.energyCapacity - 400) &&
								((structure.energy + structure.deliver) < structure.energyCapacity));
						});
						
					if (targetsSec.length > 0) {
						let ClosestTarget = this.pos.findClosestByRange(targetsSec, { ignoreCreeps: true });
						if (ClosestTarget != undefined) {
							this.assignTarget(ClosestTarget.id, role);
						}
					}
				}
			}
		}
		else {
			let targetsSec = _.filter(this.room.findByType([STRUCTURE_TOWER, STRUCTURE_LAB]),
				function (structure) {
					return (structure.energy < (structure.energyCapacity - 400) &&
						((structure.energy + structure.deliver) < structure.energyCapacity));
				});
				
			if (targetsSec.length > 0) {
				let ClosestTarget = this.pos.findClosestByRange(targetsSec, { ignoreCreeps: true });
				if (ClosestTarget != undefined) {
					this.assignTarget(ClosestTarget.id, role);
				}
			}
		}

		if (this._memory[C.CLOSEST_TARGET]) {

			if (premove) {
				let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
				if (targetObj) {
					if (!this.pos.inRangeTo(targetObj.pos, 1)) {
						this.travelTo(targetObj.pos, { maxRooms: 1, range: 1 });
					}
				}
			}
			return 1;
		} else {
			this.room._noHarvestJob = true;
		}
	};

	Creep.prototype.getClosestMultiTarget = function(){

		if (!this._memory._targets) {
			return Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
		}
		let targets = [];
		targets.push(Game.getObjectById(this._memory[C.CLOSEST_TARGET]));
		let targetsLength = this._memory._targets.length;
		while (targetsLength--) {
	//	for (let idx in this._memory._targets) {
			let object = Game.getObjectById(this._memory._targets[targetsLength].id);
			if (object && object.energy < object.energyCapacity) {
				targets.push(Game.getObjectById(this._memory[C.CLOSEST_TARGET]));
			} else {
				this._memory._targets = this._memory._targets.splice(targetsLength, 1)
			}
		}
		return this.pos.findClosestByRange(targets);
	}


	global.fillPosCache = {};
	Creep.prototype.getFillPos = function(targetObj) {

		// csite + crane pos ??

		if (fillPosCache[this.room.name] === undefined) { fillPosCache[this.room.name] = {}; }
		let fillPos = fillPosCache[this.room.name];

		if (fillPos[targetObj.id] === undefined) { fillPos[targetObj.id] = {}; }

		let fromPos = posCompress(this.pos)
		if (!fillPos[targetObj.id][fromPos]) {

			let possiblePos = targetObj.pos.openAdjacentSpots(true)
			let bestScore = -10000;
			let bestFillPos = targetObj.pos;
			let bestRange = Infinity
			for (let idx in possiblePos) {
				let pos = possiblePos[idx];
				let rangeToMe = this.pos.getRangeTo(pos)

				if (rangeToMe > bestRange) { continue; }		
				bestRange = rangeToMe;

				let score = 20;
				if (rangeToMe !== 0) {
					score = (1/rangeToMe) * 10;					
				}

			//	let extensionsInRange = pos.lookForStructuresAround(STRUCTURE_EXTENSION, 1).length;

				/*
				if (!this._memory._targets) {
					if (this.room.storage) {
						score += 1/pos.getRangeTo(this.room.storage) 
					}
				} else {
					
					for (let nextIdx in this._memory._targets) {
						let nextFiller = Game.getObjectById(this._memory._targets[nextIdx].id);
						if (!nextFiller || nextFiller.id === targetObj.id) { continue; }
						let nextRange = pos.getRangeTo(nextFiller)
						
						if (nextRange <= 1) {
							score += 2
						} else {
							score += 1/nextRange;
						}
					}
				}*/

			//	this.room.visual.text(score, pos.x, pos.y, { color: 'orange', font: 1 });
				if (score > bestScore) {
					bestScore = score;
					bestFillPos = pos;
				}
			}
		//	this.room.visual.text(bestScore, bestFillPos.x, bestFillPos.y, { color: 'blue', font: 1 });
			this._memory.fillPos[targetObj.id] = posSave(bestFillPos)
			return bestFillPos;
		}
		return posLoad(this._memory.fillPos[targetObj.id])
	}

	Creep.prototype.refillBuilders = function () {
		let role = "refillBuilders";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }

		if (getRoomPRCL(this.room.name) >= CONTROLLER_MAX_LEVEL) { return 0; }

		if (this.room.getSpawnContainers().length === 0) { return 0; }

		// ASSIGN BUILD
		if (!this._memory.refillBuilderTarget) {

			let constructionSites = this.room.getConstuctionSites();
			let bestScore
			for (let idx in constructionSites) {
				let site = constructionSites[idx]
				if (site.progressTotal < 3000 || site.progress === 0) { continue; }

				this._memory.refillBuilderTarget = site.id;			
			}
		}

		if (this._memory.refillBuilderTarget) {
			let site = Game.getObjectById(this._memory.refillBuilderTarget)
			if (!site) {
				delete this._memory.refillBuilderTarget;
				return 0;				
			}

			if (this.giveAwayEnergy(4)) { 
				return 1
			}

			if (this.pos.getRangeTo(site) >= 1) {
				this.travelTo(site, { range: 0 });
				this.room.visual.line(this.pos, site, { color: "blue", lineStyle: "solid" });
				return true
			}
		}

	}

	Creep.prototype.dropAtStorageLocation = function (_destRoom) {
		let role = "dropAtStorageLocation";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD
		
		let destRoom = _destRoom
		if (!_destRoom) {
			destRoom = this._memory[C.ROOM_ORIGIN];
		}
		if (!this._memory.dropTarget) {			
			
			let homeRoom = Game.rooms[destRoom]
			if (!homeRoom) { return 0; }

			let bestDropPos;
			let bestDropScore = -Infinity;


			let constructionSites = this.room.getConstuctionSites();

			
			if (constructionSites.length > 0) {

				let fillerPos = this.room.getSpawnFillerPos();
				for (let idx in constructionSites) {
					let site = constructionSites[idx]
					if (site.progressTotal < 3000 || site.progress === 0) { continue; }

					let bestPos
					let bestScore = 0;
					if (site.pos._cache.dropPos === undefined || Game.time > site.pos._cache.dropPosTs) {
						site.pos._cache.dropPosTs = Game.time + 100;
						for (let i = 1; i <= 8; i++) {
							let position = site.pos.getPositionAtDirection(i);					
		
							if (!position.isPassible(true)) { continue; }
							for (let _idx in fillerPos) { if (position.isThisPos(fillerPos[_idx])) { continue; }}
							
							let adjacentSpots = openAdjacentSpots(position, true).length
							if (adjacentSpots > bestScore) {
								bestScore = adjacentSpots
								bestPos = position;
							}
						}
						site.pos._cache.dropPos = bestPos
					}
					
					bestPos = site.pos._cache.dropPos

					if (!bestPos) { continue; }

					let dropped = homeRoom.lookForAt(LOOK_RESOURCES, bestPos)
					let amount = 0;
					for (let _idx in dropped) {
						if (dropped[_idx].resourceType !== RESOURCE_ENERGY) { continue; }
						amount += dropped[_idx].amount;
					}

					if (amount > site.progressTotal - site.progress + 100) { continue; }

					this._memory.dropTarget = posCompress(bestPos);
					bestDropPos = bestPos
					break;
				}
			}


			let controllerContPos = homeRoom.getControllerContainerPos();
			if (controllerContPos && !bestDropPos) {
				this._memory.dropTarget = posCompress(controllerContPos)
			}


			let cranePos = homeRoom.getCranePos();
			if (cranePos && (Math.random() > 0.95 || !bestDropPos)) {

				let dropped = homeRoom.lookForAt(LOOK_RESOURCES, cranePos)
				let amount = 0;
				for (let idx in dropped) {
					if (dropped[idx].resourceType !== RESOURCE_ENERGY) { continue; }
					amount += dropped[idx].amount;
				}

				let score = -this.pos.getRangeTo(cranePos)
				score -= amount / 1000;

				if (score > bestDropScore) {
					bestDropScore = score;
					bestDropPos = cranePos;
				}
			}

			let spawn = homeRoom.findByType(STRUCTURE_SPAWN)[0];
			if (spawn && (Math.random() > 0.95 || !bestDropPos)) {
				let spawnValidPos = spawn.getDefaultDirections(true);
				let dropDirection = spawnValidPos[spawnValidPos.length-1]				
				let dropPos = spawn.pos.getPositionAtDirection(dropDirection)


				let bestPos = dropPos
				let bestScore = 0;
				for (let i = 1; i <= 8; i++) {
					let position = dropPos.getPositionAtDirection(i);
					if (position.y === spawn.y) { continue; }

					if (!position.isPassible(true)) { continue; }

					let adjacentSpots = openAdjacentSpots(position, true).length
					if (adjacentSpots > bestScore) {
						bestScore = adjacentSpots
						bestPos = position;
					}
				}

				let dropped = homeRoom.lookForAt(LOOK_RESOURCES, bestPos)
				let amount = 0;
				for (let idx in dropped) {
					if (dropped[idx].resourceType !== RESOURCE_ENERGY) { continue; }
					amount += dropped[idx].amount;
				}

				let score = -this.pos.getRangeTo(bestPos)
				score -= amount / 1000;

				if (score > bestDropScore) {
					bestDropScore = score;
					bestDropPos = bestPos;
				}
			}

			if (bestDropPos) {
				this._memory.dropTarget = posCompress(bestDropPos)
			}

		}

		this.room.visual.circle(this.pos.x, this.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'yellow'}) 

		if (this._memory.dropTarget !== undefined) { // MOVE TO TARGET
			let dest = posDecompress(this._memory.dropTarget, destRoom)

			let rangeToTarget = this.pos.getRangeTo(dest);
			if (rangeToTarget <= 0) {

				checkRoomOverflowing(this.room.name)
				let result = this.drop(RESOURCE_ENERGY);
				this.clearTarget();
				delete this._memory.dropTarget;
				
				this._readyForNewWork = true;
				
			} else {
				this.travelTo(dest, { range: 0 });
				this.room.visual.line(this.pos, dest, { color: "yellow", lineStyle: "solid" });

				if (rangeToTarget === 1) {
					if (this._cache.prevRange === 1) {
						if (!dest.isPassible(true)) { delete this._memory.dropTarget }
					}					
				}
				

			}
			this._cache.prevRange = rangeToTarget
			return 1;
		}
		return 0;
	}

	function checkRoomOverflowing(roomName) {
		
		let freeSpace = 0;
		let hasStore = false;
		let room = Game.rooms[roomName]
		if (!room || (room.controller && room.controller.level < 4)) { return false; }
		if (room.storage) {
			hasStore = true;
			freeSpace += room.storage.store.getFreeCapacity(RESOURCE_ENERGY);
		}
		if (room.terminal) {
			hasStore = true;
			freeSpace += room.terminal.store.getFreeCapacity(RESOURCE_ENERGY);
		}

		if (hasStore && freeSpace < 10000) {
			room._memory.noFreeStore = Game.time + 1999;
			return true;
		}
		return false;
	}

	Creep.prototype.checkClearWorkerTarget = function() {
		if (!this._memory[C.CLOSEST_TARGET]) { return 0;}

		if (this._memory[C.ASSIGNED_ROLE] === "roleHarvester") {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (!targetObj) {
				this.clearTarget(true);
				return 1;
			} else if (targetObj.energy === targetObj.energyCapacity) {
				this.clearTarget(true);
				return 1;
			} else if (this.carry[RESOURCE_ENERGY] === 0) {
				this.clearAllTargets();
				this._memory[C.RESOURCE_TYPE] = this.resourceType;
				return 1;
			}
		}
	}


	// HARVESTER ROLE
	Creep.prototype.roleHarvester = function (multiTarget) {
		let role = "roleHarvester";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD
		if (!this._memory[C.CLOSEST_TARGET] || this.checkClearWorkerTarget() ) {
			this.roleHarvesterGetTarget(false, multiTarget);
		}

		if (this._memory[C.CLOSEST_TARGET]) { // MOVE TO TARGET
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
		//	this.room.visual.line(this.pos, targetObj.pos, { color: "green", lineStyle: "solid" });
		//	let targetObj = this.getClosestMultiTarget()
			let getClosestMluti = true;
			/*
			if (!targetObj) {
				this.clearTarget(getClosestMluti);
				return 1;
			} else if (targetObj.energy === targetObj.energyCapacity) {
				this.clearTarget(getClosestMluti);
				return 1;
			} else if (this.carry[RESOURCE_ENERGY] === 0) {
				this.clearAllTargets();
				this._memory[C.RESOURCE_TYPE] = this.resourceType;
				return 1;
			}*/

			let value = ERR_NOT_IN_RANGE;

			
			if (this.pos.inRangeTo(targetObj.pos, 1)) {
				value = this.transfer(targetObj, this._memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY);
			}

			if (value === OK || value === ERR_FULL) {
				
				let creepHasEnergyLeft = this.carry[RESOURCE_ENERGY] - targetObj.store.getFreeCapacity(RESOURCE_ENERGY);
				let prevTarget = this._memory[C.CLOSEST_TARGET];
				this.clearTarget(getClosestMluti);
			
				if (creepHasEnergyLeft > 0) {

					if (this._memory[C.CLOSEST_TARGET]){	// multitarget
						targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);

						if (this.pos.getRangeTo(targetObj) > 1) {

							/*
							let nearbyExtensions = this.pos.lookForStructuresAround(STRUCTURE_EXTENSION);
							for (let idx in nearbyExtensions) {
								let ext = nearbyExtensions[idx];
								if (ext.id === prevTarget) { continue; }
								if (ext.energy < targetObj.energyCapacity) {
									return 1; // Stay here!
								}
							}*/


							this.travelTo(targetObj, { maxRooms: 1, range: 1 });
						}
						return 1;
					} else {
						this.roleHarvesterGetTarget(true, multiTarget);
					}
				} else {					
					this._readyForNewWork = true;				
				}
			} else if (value === ERR_NOT_IN_RANGE) {

				let range = 1;
				let dest = targetObj.pos;
				/*
				if (getRoomPRCL(this.room.name) >= 8) {
					dest = this.getFillPos(targetObj);
					range = 0;
				} */
				
				let fillTargets = this.fillWhileMoving();
				if (fillTargets > 1) {
					return;
				}

				if (this.room.memory.myRoom && this.room.memory.hostiles && !isOutsideWalls(this.pos)) {				
					this.travelTo(dest, { maxRooms: 1, range: range, roomCallback: getWallLimitMatrix });								
				} else {					
					this.travelTo(dest, { maxRooms: 1, range: range });
				}
				
			}
			else if (value < 0) {
				console.log(this.room.name + " harvester error " + value);
				this.clearTarget(getClosestMluti);
				delete this._cache.mstate;
			}
			return 1;
		}
		else { return 0; }
	};

	// MINERAL EXTRACTOR DELIVER
	Creep.prototype.mineralExtractorDeliver = function () {
		let role = "mineralExtractorDeliver";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN  				
		if (this.room.terminal) {
			this.assignTarget(this.room.terminal.id, role);
		} else {
			this.assignTarget(this.room.storage.id, role);
		}

		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (targetObj.id === undefined) { this.clearTarget(); }

			let value = ERR_NOT_IN_RANGE;
			if (this.pos.inRangeTo(targetObj.pos, 1)) {
				value = this.transferAny(targetObj);
			}			

			if (value == OK) {
				this.clearTarget();
			}
			else if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 1, range: 1 });
			}
			else {
				//	this._memory.jobId = this.room.terminal.id;
				this.clearTarget();
				return 0;
			}
			return 1;
		}
		else { return 0; }
	};




	Creep.prototype.extractorInPlaceAndSafe = function() {
		let source = Game.getObjectById(this._memory[C.SOURCE_ID]);		
		if (!source) { return false; }
		let pos = source.getHarvesterPos(this._memory[C.ROOM_ORIGIN]);
		if (!source) { return false; }
		if (pos.isThisPos(this.pos) && pos.lookForStructure(STRUCTURE_RAMPART)) { return true}
		return false;
	}


	Creep.prototype.getClosestByPathRooms = function (targets) {
		let target;
		let closestPath = 999999;
		let length = targets.length;
		for (let i = 0; i < length; i++) {
			let pathToTarget = findTravelPath(this.pos, targets[i].pos,
				{ range: 1, ignoreCreeps: true, maxOps: 20000, uncompressed: true, allowSK: true });
			if (closestPath > pathToTarget.path.length) {
				target = targets[i];
				closestPath = pathToTarget.path.length;
			}
		}
		return target;
	};

	function getHaulStore(spawner, room, source){
		
		if (!Memory.rooms[spawner] || !Memory.rooms[spawner].remoteMineOps[room] || !Memory.rooms[spawner].remoteMineOps[room].sources[source]) {
		//	console.log(spawner +" not found remoteops from " + room)
			return;
		}

		if (Memory.rooms[spawner].remoteMineOps[room].sources[source].store) {
			return Memory.rooms[spawner].remoteMineOps[room].sources[source].store;
		}

		if (!Memory.rooms[room] || !Memory.rooms[room].sources || !Memory.rooms[room].sources[source]) {
			console.log("not found sources") 
			return; 
		}
		let sourcePos = posDecompressXY(Memory.rooms[room].sources[source].pos, room);
		if (!sourcePos) { 
			console.log("not found sourcePos " + source) 
			return; 
		}

		if (Game.rooms[spawner] && Game.rooms[spawner].storage && !Game.rooms[spawner].terminal) {
			Memory.rooms[spawner].remoteMineOps[room].sources[source].store = Game.rooms[spawner].storage.id;
			return Memory.rooms[spawner].remoteMineOps[room].sources[source].store;
		}

		let pathLengthToStorage = Infinity; 
		if (Game.rooms[spawner] && Game.rooms[spawner].storage) {
			let pathToStore = findTravelPath(sourcePos, Game.rooms[spawner].storage.pos,
				{range: 1, ignoreCreeps: true,  uncompressed: true, allowSK: true, ensurePath: true})
			if (!pathToStore.incomplete) {
				pathLengthToStorage = pathToStore.path.length;
			}
		}

		let pathLengthToTerminal = Infinity; 
		if (Game.rooms[spawner] && Game.rooms[spawner].terminal) {
			let pathToStore = findTravelPath(sourcePos, Game.rooms[spawner].terminal.pos,
				{range: 1, ignoreCreeps: true,  uncompressed: true, allowSK: true, ensurePath: true})
			if (!pathToStore.incomplete) {
				pathLengthToTerminal = pathToStore.path.length;
			}
		}

		if (pathLengthToStorage <= pathLengthToTerminal && pathLengthToStorage !== Infinity ) {
			Memory.rooms[spawner].remoteMineOps[room].sources[source].store = Game.rooms[spawner].storage.id;
		//	console.log(room + " found shortest store from source " + source+ " was storage in room " + spawner + " length " + pathLengthToStorage + "/" + pathLengthToTerminal);
		} else if (pathLengthToTerminal < pathLengthToStorage  ) {
			Memory.rooms[spawner].remoteMineOps[room].sources[source].store = Game.rooms[spawner].terminal.id;
		//	console.log(room + " found shortest store from source " + source+ " was terminal in room " + spawner);
		}		
		return Memory.rooms[spawner].remoteMineOps[room].sources[source].store;
	}


	// ROLE HAULER
	Creep.prototype.roleHauler = function (preferHighway = false, allowSuicide = true) {
		let role = "hauler";
		// CHECK IF OTHER ROLE ACTIVE
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD
		if (!this._memory[C.CLOSEST_TARGET]) {		
			
			if (ABANDON_SHIP[this._memory[C.ROOM_ORIGIN]] && Game.rooms[this._memory[C.ROOM_ORIGIN]].terminal) {
				this.assignTarget(Game.rooms[this._memory[C.ROOM_ORIGIN]].terminal.id, role);
			}

			if (!this._memory[C.CLOSEST_TARGET]) {
				let shortestStore = getHaulStore(this._memory[C.ROOM_ORIGIN], this._memory[C.ROOM_TARGET], this._memory[C.SOURCE_ID])
				if (shortestStore){
					let store = Game.getObjectById(shortestStore);
					if (store && store.store.getFreeCapacity(RESOURCE_ENERGY) >= 5000) {
					//	this._cache.haulStorage = shortestStore;
						this.assignTarget(shortestStore, role);

					} else {
					//	console.log(this._memory[C.ROOM_ORIGIN] + " getHaulStore is full! " + store.freeSpace)
					}
				}
			}

			if (!this._memory[C.CLOSEST_TARGET]) {	// FALLBACK TO OLD METHOD
			//	console.log(this + " fallback!")
				let carry = this.sumCarry;
				let targets = _.filter(Game.rooms[this._memory[C.ROOM_ORIGIN]].findByType([STRUCTURE_STORAGE, STRUCTURE_TERMINAL]),
					function (structure) {
						return (structure.store.getFreeCapacity(RESOURCE_ENERGY) >= carry + 5000);
					});
				if (targets.length > 0) {
				//	this._cache.haulStorage = targets[0].id;
					this.assignTarget(targets[0].id, role);
				}
			}
			
			
		}

		if (this._memory[C.CLOSEST_TARGET]) { // MOVE TO TARGET			
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (!targetObj) {
				this.clearTarget();
				return 1;
			}
			
			let value = ERR_NOT_IN_RANGE;
			if (this.room.name === this._memory[C.ROOM_ORIGIN]) {
				if (this.pos.inRangeTo(targetObj.pos, 1)) {
					value = this.transferAny(targetObj);
					if (allowSuicide && this._memory[C.TICKS_TO_TARGET] === undefined) { this._memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - this.ticksToLive; }
				} else if (Game.cpu.bucket >= 700) {
					let targets = this.fillWhileMoving();
					if (targets > 1) { return 1; }
				}
			}
				
			if (value == ERR_NOT_IN_RANGE) {
				let allowBuilding = false;
				let range = 1;
				
				if (Game.cpu.bucket >= 5000) {
					allowBuilding = true;
					range = 3;
				}
				this.repairWhileMoving(range, true, allowBuilding);

				this.travelTo(targetObj, { maxOps: 30000, allowSK: true, preferHighway: preferHighway, range: 1, roomCallback: avoidSKcreeps });
				
			} else if (value == ERR_INVALID_TARGET || value == ERR_FULL) {
				this.clearTarget();
			//	delete this._cache.haulStorage;
				return 0;
			} else if (value == OK) {
				this._memory[C.TRACK_DISTANCE] = 1;	// kills powerbank haulers
				this.clearTarget();

			//	this.setTargetSource();

				if (this._memory[C.TICKS_TO_TARGET] !== undefined) {
					
					

					if (allowSuicide && this.ticksToLive <= this._memory[C.TICKS_TO_TARGET] + 10) {
						//	console.log(this.room.name + " " + this + " I have nothing left ot live for! " +this.ticksToLive + " ticks left " +this._memory[C.TICKS_TO_TARGET] +" ticks to target"  )
						this.recycleOrSuicide();
						return 1;
					}
				}

				if (this.store[RESOURCE_ENERGY] > 0) {
					let transfered = Math.min(this.store[RESOURCE_ENERGY], targetObj.store.getFreeCapacity(RESOURCE_ENERGY))
					if (transfered >= this.store[RESOURCE_ENERGY]) {
						this._readyForNewWork = true;
					}
				}

			} else {
				console.log(this.name + " in " + this.room.name + " hauler return " + value);
			}
			return 1;
		}

		return 0;
	};

	

	Creep.prototype.grabNearbyDroppedEnerg = function(anchor, dist = 5) {
		
		if (this._memory.drpTs && Game.time < this._memory.drpTs) { return false }

		
		let top = limit(anchor.y - dist, 0, 49);
		let left = limit(anchor.x - dist, 0, 49);
		let bot = limit(anchor.y + dist, 0, 49);
		let right = limit(anchor.x + dist, 0, 49);

		let dropped = _.filter(Game.rooms[this._memory[C.ROOM_TARGET]].lookForAtArea(LOOK_RESOURCES, top, left, bot, right, true),
			function (c) {
				return (c.resource.energy >= 100);
			});
		if (dropped[0] != undefined) {
		//	this.assignTarget(dropped[0].resource.id, role);
			// dont overwrite normal target
		}

		// move to and pickup

	}



	function cahceAnchor(creeps, anchor) {
		if (creeps.length > 0 && anchor) {
			creeps[0]._cache.anchor = anchor.id;
			creeps[0]._cache.anchorTs = Game.time;
		}			
		return anchor;
	}

	global.getCurrentAnchorCreep = function(creeps) {

		if (creeps[0] && creeps[0]._cache.anchor && creeps[0]._cache.anchorTs === Game.time) { return Game.getObjectById(creeps[0]._cache.anchor) }
	//	let anchorDirections = {[TOP] : {}, [LEFT] : {}, [TOP_LEFT] : {}}
		let lastAnchor;
		let bestLastAnchor = Infinity;

		let bestScore = 99999;
		let bestFitCreep;
		for (let idx in creeps) {			
			let creep = creeps[idx];		

			let phalanxFormation = getPhalanxFormation(creep.pos);		
			
			let score = 0;
			if (phalanxFormation.length < 4) { 
			//	log("im not in formation position! " +creep.pos +" formations " + phalanxFormation.length)
				score += (4 - phalanxFormation.length) * 10
			}

			for (let others in creeps) {
				let otherCreep = creeps[others]
				if (creep.id === otherCreep.id) { continue; }

				let lowRange = 50;

				for (let idx2 in phalanxFormation) { 
					let dist = otherCreep.pos.getRangeToWP(phalanxFormation[idx2].pos)
					lowRange = Math.min(dist, lowRange);
				//	if (lowRange === 0) { break; }
				}

				score += lowRange**2;
			}

		//	creep.room.visual.text(score, creep.pos, { color: 'red', font: 0.5 });

			if (score < bestScore) {
				if (score === 0) {
					creep._anchorInFormation = Game.time;
					return cahceAnchor(creeps, creep);	// im in the anchor position
				}
				bestScore = score;
				bestFitCreep = creep;
			}
			
			if (creep._memory.inFormation) {
				let ticksSinceLast = Game.time - creep._memory.inFormation
				if (ticksSinceLast < bestLastAnchor) {
					bestLastAnchor = ticksSinceLast;
					lastAnchor = creep;
				}
			}
		}

		if (bestFitCreep) {
			log("best anchor fit " + bestFitCreep + " score " + bestScore)
			return cahceAnchor(creeps, bestFitCreep); 
		}	// my position is closest to a new formation
		if (lastAnchor) { return cahceAnchor(creeps, lastAnchor); }		// i was the last anchor
		return cahceAnchor(creeps, creeps[0]);	// falback to first creep
	}

	function getCurrentFormationDir(anchor) {

		// 	FF	BF	FB	BB
		// 	BB	BF	FB	FF

		let leftCreep = anchor.pos.getPositionAtDirection(LEFT).lookForCreep();
		let topCreep = anchor.pos.getPositionAtDirection(TOP).lookForCreep();

		if (!leftCreep || !topCreep) { return ERR_NOT_FOUND }

		if (anchor.memory.rotation === BACK && leftCreep.memory.rotation === BACK && topCreep.memory.rotation === FRONT ) {
			return TOP;
		} else if (anchor.memory.rotation === FRONT && leftCreep.memory.rotation === BACK && topCreep.memory.rotation === FRONT) {
			return RIGHT;
		} else if (anchor.memory.rotation === FRONT && leftCreep.memory.rotation === FRONT && topCreep.memory.rotation === BACK) {
			return BOTTOM;
		} else if (anchor.memory.rotation === BACK && leftCreep.memory.rotation === FRONT && topCreep.memory.rotation === BACK) {
			return LEFT;
		}
		return ERR_NOT_FOUND;
	}

	function performPhalanxRotation(creeps, formation) {

		let creepsToMove = []

		for (let creepIdx in creeps) {
			let creep = creeps[creepIdx];			
			for (let posIdx in formation) {
				if (formation[posIdx].type === ANY) { return 0; }	// No rotations
			//	creep.room.visual.text(formation[posIdx].type, formation[posIdx].pos.x, formation[posIdx].pos.y, { color: 'blue', font: 1 });
				if (creep.pos.isThisPos(formation[posIdx].pos)) {
					if (creep._memory.rotation !== formation[posIdx].type) {
						// i need to move
						creepsToMove.push(creep);					
						creep.room.visual.text(creep._memory.rotation, creep.pos.x, creep.pos.y, { color: 'red', font: 0.8 });						
					} else {
						creep.room.visual.text(creep._memory.rotation, creep.pos.x, creep.pos.y, { color: 'green', font: 0.8 });
					}
					break;
				}
			}
		}

		for (let idx in creepsToMove) {
			let creep = creepsToMove[idx];			
			if (creep._swapped) { continue; }

			for (let idx2 in creepsToMove) {				
				let creep2 = creepsToMove[idx2];
				if (creep.id === creep2.id) { continue; }
				if (creep2._swapped) { continue; }

				if (creep._memory.rotation !== creep2.memory.rotation) {
					creep.move(creep.pos.getDirectionTo(creep2))
					creep2.move(creep2.pos.getDirectionTo(creep))
					creep._swapped = Game.time;
					creep2._swapped = Game.time;
					break;
				}
			}
		}
		return 1;
	}

	function getPhalanxDirectionTo(target, anchor) {
		let validTurnDirections = {[TOP] : {}, [BOTTOM] : {}, [LEFT] : {}, [RIGHT] : {}, }
		let dirToTarget = anchor.pos.getDirectionTo(target);
		if (validTurnDirections[dirToTarget]) { return dirToTarget; }
		let creepTopLeft = anchor.pos.getPositionAtDirection(TOP_LEFT).lookForCreep();
		if (!creepTopLeft) { return ERR_NOT_FOUND; }
		let dirToTargetTopLeft = creepTopLeft.pos.getDirectionTo(target);
		if (validTurnDirections[dirToTargetTopLeft]) { return dirToTargetTopLeft; }
		return ERR_NOT_FOUND;
	}

	Creep.prototype.PhalanxRotation = function (target, anchor, creeps, formation, dirToTarget){

		// 	FF	BF	FB	BB
		// 	BB	BF	FB	FF
		
		let currentFormationDir = getCurrentFormationDir(anchor);

	//	log("current rotation " + currentFormationDir + " wanted " + dirToTarget )

		let validTurnDirections = {[TOP] : {}, [BOTTOM] : {}, [LEFT] : {}, [RIGHT] : {}, }

		if (validTurnDirections[dirToTarget] && dirToTarget !== currentFormationDir) {
			return performPhalanxRotation(creeps, formation, dirToTarget);
		}
		return 0;
	}
	// W12S21

	Creep.prototype.phalanxHeal = function(creeps, healers) {

		let roomName = this.room.name;	// bouncing on the edge?
		let enemies = getEnemyCreeps(roomName)

		let towers = this.room.find(FIND_STRUCTURES, {
			filter: (c) => {
			return (c.structureType === STRUCTURE_TOWER);
			}});

		for (let idx in creeps) {
			let myCreep = creeps[idx];
			let dmgToMe = 0;

			// Incomming dmg from creeps
			let i = enemies.length;
			while (i--) {
				let hostile = enemies[i];
				let power = calcSingleCreepStrength(hostile, true);

				if (power.attackDamage === 0 && power.rangedAttackDamage === 0) {
					enemies.splice(i,1);
					continue;
				}

				let rangeToMe = myCreep.pos.getRangeTo(hostile);				
				if (rangeToMe <= 3) {
					dmgToMe += power.rangedAttackDamage;
					if (rangeToMe <= 1) {
						dmgToMe += power.attackDamage;
					}
				}
			}

			// Incomming dmg from Towers
			dmgToMe += getTowerDamage(myCreep.pos, towers);

		}
	}


	function phalanxNearOtherCreeps(phalanxCreeps) {
		let registeredCreeps = {}
		for (let idx in phalanxCreeps) {
			let creep = phalanxCreeps[idx];
			registeredCreeps[creep.id] = {}
		}

		for (let idx in phalanxCreeps) {
			let creep = phalanxCreeps[idx];
			let otherCreeps = creep.pos.findInRange(FIND_CREEPS, 3)
			for (let idx2 in otherCreeps) {
				let other = otherCreeps[idx2]
				if (other.owner.username === "Source Keeper") { continue; }

				if (registeredCreeps[other.id]) { continue; }
				return true;
			}
		}
		return false;
	}
	
	
	function raidFleeFrom(roomName) {
		let flee = []

		if (!Game.rooms[roomName]) { return flee }
		let hostiles = _.filter(getEnemyCreeps(roomName),
			function (creep) {
				return (
					(creep.hasBodyparts(ATTACK) > 2 ||
					creep.hasBodyparts(RANGED_ATTACK) > 2)
				);
			});

		for (let idx in hostiles) {
			flee.push({pos: hostiles[idx].pos, range: 5})
		}

		let towers = getEnemyTowers(roomName);

		for (let idx in towers) {
			flee.push({pos: towers[idx].pos, range: 20})
		}	

		/*
		let flags = _.filter(Object.keys(Game.flags), flag => ((Game.flags[flag].color == COLOR_GREY)));
		for (let idx in flags){
			let flag = Game.flags[flags[idx]]
			if (flag.secondaryColor !== COLOR_RED) { continue; }
			flee.push({pos: flag.pos, range: 20})
		}*/

		return flee
	}

	Creep.prototype.phalanxMove = function (target, creeps, options = {}) {
		
		let range = options.range;

		let travelerInfo = {};
		let phalanxId = this._memory.raidId || this.id;	

		let readyToMove = true;
		let inFormation = true;

		let anchor = getCurrentAnchorCreep(creeps);
		anchor.room.visual.circle(anchor.pos.x, anchor.pos.y, { fill: 'transparent', radius: 0.55, stroke: 'green' });

		
		

		let rotateTowards = options.rotateTarget || target;
		let rangeToTarget = anchor.pos.phalanxGetRangeTo(rotateTowards);
		let dirToTarget;
		if (rangeToTarget <= 3 && rotateTowards.roomName === anchor.pos.roomName) { 
			dirToTarget = getPhalanxDirectionTo(rotateTowards, anchor);
		} else if (rotateTowards) {

			for (let idx in creeps) {
				let creep = creeps[idx];
				let nearbyStuff = creep.pos.lookForEnemyStructuresAround(1);
				if (nearbyStuff.length > 0) {
					dirToTarget = getPhalanxDirectionTo(nearbyStuff[0], anchor);
					break;
				}
			}
		}

		let confirmedFormation = anchor._anchorInFormation === Game.time;
		let formations = getPhalanxFormation(anchor.pos, dirToTarget);		

		let requiredMove;
		if (formations.length < 4){	// Im on an invalid pos for the formation
			target = getClosestSafeExit(anchor.pos);
			log("safe exit " + target)
			if (anchor.pos.getRangeTo(target) <= 1) {
				target = getSafePosInExit(target);
			}
			requiredMove = true;
			inFormation = false;
			log(anchor.pos+  " invalid phalanx pos " + formations.length + " target " + target)
			anchor.say("!");
		}

		// Update path
		if (!anchor._cache._trav) { anchor._cache._trav = {} }
	//	let thisDest = posCompress(target);
		
		for (let idx in creeps) {	// CHECK FOLLOWERS STATUS
			let creep = creeps[idx];
			if (creep.fatigue > 0) {
				readyToMove = false;
			}
			
			if (confirmedFormation) { 
				creep._inFormation = true;
				continue;
			}

			if (creep.id === anchor.id) { continue; }
			
			let foundPos = false;
			let formationIdx2 = formations.length;
			while(formationIdx2--) {
		//	for (let formationIdx2 in formations) {

				if (formations[formationIdx2].anchor) {					
					continue;
				}

				let posToCheck = formations[formationIdx2].pos;
				if (creep.room.name !== posToCheck.roomName) { continue; }
				creep.room.visual.circle(posToCheck.x, posToCheck.y, { fill: 'transparent', radius: 0.55, stroke: 'blue' });
			
				if (creep.pos.isThisPos(posToCheck)) {
					foundPos = true;
					creep._inFormation = true;
				//	formations.splice(formationIdx2, 1);
					break;
				}
			}
			
			if (!foundPos) {
				creep.room.visual.circle(creep.pos.x, creep.pos.y, { fill: 'transparent', radius: 0.50, stroke: 'red' });
				inFormation = false;
				//	break;
			}

			if (creep._memory.noBest) {
				requiredMove = true;
			}
		}

		// rotate if needed		
		if (!requiredMove && confirmedFormation && anchor.memory.rotation && anchor.memory.rotation !== ANY) {
			let formationsClone = _.clone(formations);
			if (anchor.PhalanxRotation(target, anchor, creeps, formationsClone, dirToTarget)) { 
			//	anchor.say("R")
				return 1;
			}
		}

		if (range >= 1 && confirmedFormation && anchor.pos.phalanxGetRangeTo(target) <= range) { 
			anchor.say("oke");
			registerPhalanxBlocker(anchor.pos);
			return;
		} else if (range === 0 && confirmedFormation && anchor.pos.getRangeTo(target) === 0) {
			anchor.say("ok0")
			registerPhalanxBlocker(anchor.pos);
			return;
		}

		let moving = false;
		let nextDir;
		let nextPos;

		let nearExit = anchor.pos.phalanxIsNearExit(0);
		
		// MOVE ANCHOR CREEP
		if (readyToMove &&
			((inFormation || nearExit ) || 
			requiredMove)
		){
				
			if (inFormation) {
				anchor.memory.inFormation = Game.time + 1;
			}

			if (nearExit && Game.time <= anchor.memory.inFormation) {
				inFormation = true;
			}
			
			if 	(options.raidFlee ||
				(phalanxNearOtherCreeps(creeps) && Math.random() > 0.5) ||
				(checkForChangedStructureCount(anchor.room.name))
			){
				// Force new path
				if (anchor._cache._trav) {
					delete anchor._cache._trav.path;
				}
			}

			let maxRooms = undefined
			if (anchor.room.name === target.roomName && reachableRaidPos(anchor.pos, target, true)) {
				maxRooms = 1
			}

			let travelOptions = { 
				ensurePath: true, 			
				freshMatrix: true, 
				maxRooms: maxRooms,
				range: range, 
				ignoreCreeps: true, 
				ignoreStructures: true,
				showPath: true, 
				stuckValue: 3,
				ignoreRoads: true, 
				returnData: travelerInfo, 
				roomCallback: raidPhalanx,
				raidDamage: options.raidDamage,
				outHeal: options.outHeal,
				phalanx: phalanxId,
				raidFlee: options.raidFlee,
				phalanxCreeps: creeps,
			};

			// move by flee
			if (options.raidFlee) {

				let fleeTargets = raidFleeFrom(target.roomName)

				if (fleeTargets.length > 0) {

					let callback = (roomName) => {
						if (options.roomCallback) {							
							let outcome = options.roomCallback(roomName, undefined, options);
							if (outcome !== undefined) {
								return outcome;
							}
						}
					}

					let { path, ops } = PathFinder.search(anchor.pos, fleeTargets, {flee: true, roomCallback: callback});

					if (path.length > 0) {
						moving = true;

						nextPos = path[0]
						nextDir = anchor.pos.getDirectionTo(nextPos)

						anchor.move(nextDir);
						anchor._phalanxMove = Game.time;
					}
				}
			}

			// normal move
			if (!moving) {
				moving = true;
				let res = anchor.travelTo(target, travelOptions);
				anchor._phalanxMove = Game.time;
	
				if (res === OK) {	
					
					nextDir = travelerInfo.nextDir;
					nextPos = anchor.pos.getPositionAtDirection(nextDir);
					registerPhalanxBlocker(nextPos);
					if (requiredMove && travelerInfo.path){
						anchor.moveAllCreepsOnPath(travelerInfo.path, {recursive: true, allowCombatCreeps: true}); // obstacle?
						log("moving required!" + nextDir)
					}
				} else {
					moving = false;
				}
			}
			
		}

		// MOVE FOLLOWERS
		if (moving || !inFormation) {
			let obstacle = [];
		//	obstacle.push(anchor);
			let travelOptions = { ensurePath: true, freshMatrix: true, range: 0, ignoreCreeps: true, stuckValue: 3, ignoreRoads: true, obstacles: obstacle };

			for (let idx in creeps) {	// CHECK FOLLOWERS STATUS
				
				let creep = creeps[idx];

				delete creep._memory.noBest;
				

				if (inFormation && nextDir !== undefined) {	// MOVE BY DIRECTION
					if (creep.id === anchor.id) { continue; }				
					if (creep.fatigue) { continue; }
					creep.move(nextDir);
					creep._phalanxMove = Game.time;
					delete creep._cache._trav;
				} else if (!inFormation) {					
										
					let usedMoves = {}
					let useNextFormation;
					if (nextPos) {
						// move to new formation?
						let nextFormation = getPhalanxFormation(nextPos, undefined)
						if (nextFormation.length >= formations.length || nextFormation.length >= creeps.length) {
							formations = nextFormation;
							useNextFormation = true;
							usedMoves[posCompress(nextPos)] = {}
						}						
					}
					
					log("moving creeps into formation! " + creep + " available formations " + formations.length)

					let sortable = []
					
					for (let _idx in creeps) {
						let availableShortMoves = []
						let _creep = creeps[_idx]
						let score = 0;

						if (useNextFormation && creeps.id === anchor.id) {continue; }

						if (_creep.fatigue) { 
							score -= 0.5;
							availableShortMoves.push(_creep.pos)
							continue; 
						} 

						for (let formationIdx in formations) {
							let posToCheck = formations[formationIdx].pos;
							let _range = _creep.pos.getRangeTo(posToCheck)
							if (_range <= 1) {
								availableShortMoves.push(posToCheck)
							}
						}												

						score += availableShortMoves.length
						
						sortable.push({creep: _creep, moves: availableShortMoves, score: score})
					}

					sortable.sort(function(a, b) {
						return (a.score - b.score);});

					for (let _idx in sortable) {
						let _creep = sortable[_idx].creep;

						let bestScore = 9999;
						let possibleMoves = sortable[_idx].moves
						let bestPos
						let bestRange = 999;

						for (let __idx in possibleMoves) {
							let pos = possibleMoves[__idx]
							if (usedMoves[posCompress(pos)]) { continue; }		
							let _range = _creep.pos.getRangeToWP(pos)					
							let score = range;
							if (score < bestScore) {
								bestScore = score;
								bestPos = pos
								bestRange = _range
							}
						}

						if (bestPos) {
							usedMoves[posCompress(bestPos)] = {}
							if (bestRange > 0) {
								_creep.move(_creep.pos.getDirectionTo(bestPos))
							}
						} else {

							let _bestRange = 999;
							for (let formationIdx in formations) {
								let posToCheck = formations[formationIdx].pos;
								let _range = _creep.pos.getRangeToWP(posToCheck)
								if (_range < _bestRange) {
									bestPos = posToCheck
									_bestRange = _range
								}
							}
							_creep.travelTo(bestPos || anchor.pos, travelOptions);
						}						
					}
					break;


					/*
					let bestPos;
					let bestFormationIdx;
					let bestScore = 0;

					for (let formationIdx in formations) {
*/
						/*
						if (formations[formationIdx].anchor) {
							continue;
						}*/
/*
						let posToCheck = formations[formationIdx].pos;
						if (!posToCheck.isPassible(false, true)) { continue; }
						
						let score = creep.pos.getRangeToWP(posToCheck)
						if (posToCheck.roomName === anchor.roomName) { score += 0.5; }
						if (score > bestScore) {
							bestScore = score
							bestPos = posToCheck;
							bestFormationIdx = formationIdx;
						}
					}

					if (!bestPos ) {
						creep._memory.noBest = Game.time;
						bestFormationIdx = 0;
						if (formations.length > 0) {
							bestPos = formations[bestFormationIdx].pos;
						}
					}
						
					log("moving creep into formation! pos " + bestPos)
					if (bestPos) {
						if (creep._inFormation) {
							creep.room.visual.circle(creep.pos.x, creep.pos.y, { fill: 'transparent', radius: 0.50, stroke: 'green' });
						}

						formations.splice(bestFormationIdx, 1);
						
						if (!creep._inFormation && 
							bestPos && bestPos.isPassible(true, true) &&
							((!creep.pushed || creep.pushed < Game.time) && 
							Math.random() > 0.20)
						) {
							
							
									
							let path = findTravelPath(creep.pos, bestPos, travelOptions);

							log("moving creep into formation! path " + JSON.stringify(path))
												
							if (!path || path.path.length <= 0) {
								console.log(creep + " no path phalanx move?")								
								continue;
							}
							
							creep.pushed = Game.time;
							let pushed = creep.moveAllCreepsOnPath(path.path, {recursive: true, allowCombatCreeps: true}); // obstacle?
							if (pushed !== OK || Math.random() > 0.8) {
								creep.say("mvpth?" + path.path)
								travelOptions.ignoreCreeps = false;
								creep.travelTo(bestPos, travelOptions);
							}
						} else {
							log("moving creep into formation! normal travelTo ")
							creep.travelTo(bestPos, travelOptions);
						}
					} */
				}
			}
		}
	}

	Creep.prototype.getNextDirFromPath = function(){

		if (!this._cache._trav || !this._cache._trav.path) { return; }

		let nextDirection
		if (isStuck(this)){			
			nextDirection = parseInt(this._cache._trav.path[0], 10);
			return nextDirection
		}

		// new path
		if (!this._cache._trav.state) {
			nextDirection = parseInt(this._cache._trav.path[0], 10);
			return nextDirection
		}

		// Have moved last tick
		if (this._cache._trav.path.length > 1){
			nextDirection = parseInt(this._cache._trav.path[1], 10);
			return nextDirection
		}

		return;
	}

	/*
	Creep.prototype.snakeMove = function (target, creeps, options = {}) {

		let readyToMove = true;
		if (this.fatigue) { readyToMove = false; }
		for (let idx in followers) {
			let follower = followers[idx]
			if (follower.fatigue) { readyToMove = false; }
		}

	}

	*/
	global._moveIntents = {};
	function registerMoveIntent(pos) {
		if (global._moveIntents[pos.roomName] === undefined || global._moveIntents[pos.roomName].ts !== Game.time) {
			global._moveIntents[pos.roomName] = {} 
			global._moveIntents[pos.roomName].ts = Game.time; 
			
		}
		global._moveIntents[pos.roomName][posCompress(pos)] = {};
	}

	function nearbyMoveIntents(pos, range = 0) {
		if (!global._moveIntents[pos.roomName]) { return false;}

		for (let storedPos in global._moveIntents[pos.roomName]) {
			let registeredPos = posDecompressXY(storedPos, pos.roomName);

			if (pos.getRangeTo(registeredPos) <= range) {

				
			//	.visual.circle(registeredPos.x, registeredPos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'})
				return true;
			}
		}
		return false;
	}

	Creep.prototype.moveAsOne = function (target, followerName, options = {}) {

		let follower = Game.creeps[followerName];
		if (!follower) {
			this.travelTo(target, options);
			return 0;
		}

		if (follower._memory[C.ASSIGNED_ROLE] === 'applyBoost') {
			return 0;
		}
		
		let followerMoved = false;
		follower.memory.RC = true;	// remote controlled

		if (this.room.name !== follower.room.name) {
			if (this.pos.isNearExit(0)) {
				this.travelTo(target, options);			
			} else if (roomIsCenter(this.room.name) && this.pos.lookForStructure(STRUCTURE_PORTAL)) {
				this.travelTo(target, options);
			}

			if (this.pos.getRangeTo(target) <= options.range || follower.pos.isNearExit(0)) {				
				let dest = this.pos.pullSiegeFormation(follower.pos);
				follower.travelTo(dest, { ignoreCreeps: false, range: 0});
				followerMoved = true;
			} else {
				follower.travelTo(this, { ignoreCreeps: false, range: 1 });
				followerMoved = true;
			}
			return;
		}

		let range = this.pos.getRangeTo(follower);
		if (range > 1) {
			if (!followerMoved) { 
				follower.travelTo(this, { ignoreCreeps: true, range: 1, denyTunnel: true });				
			}
			// leader waits
		} else if (this.fatigue === 0 && follower.fatigue === 0) {

			/*
			let nextPos;			
			*/

			let nearbyMoveIntent;
			let nextDirection = this.getNextDirFromPath()
			let nextPos = this.pos.getPositionAtDirection(nextDirection);

			if (nextPos) {
				nearbyMoveIntent = nearbyMoveIntents(nextPos);
			}

			/*
			if (this._cache._trav && this._cache._trav.path) {
				nextPos = this.pos.getPositionAtDirectionWrapToNextRoom(Number(this._cache._trav.path[0]));				
			}*/

			if (nearbyMoveIntent && Math.random() > 0.2) {
				this.say("after you")
			} else {
				let returnData = {};
				if (!options.returnData) {
					options.returnData = returnData;
				}
				this.travelTo(target, options);
				
				if (options.returnData && options.returnData.nextPos) {
					registerMoveIntent(options.returnData.nextPos);
				}
			} 
				

			if (!followerMoved) {
				if (follower.pos.isNearExit(0) && this.pos.getRangeTo(target) <= (options.range || 1)) {	// Same room and at exit means we bounced?
					this.room.visual.circle(this.pos.x, this.pos.y , {fill: 'transparent', radius: 0.75, stroke: 'brown'}) 
					let edgePositions = this.pos.openAdjacentExitSpots(false)
					if (edgePositions.length > 0) {
						this.room.visual.circle(edgePositions[0].x, edgePositions[0].y , {fill: 'transparent', radius: 0.50, stroke: 'brown'}) 
						this.room.visual.line(edgePositions[0], follower.pos, { color: "brown", lineStyle: "solid" });
						follower.travelTo(edgePositions[0], { ignoreCreeps: false, range: 0});
					} else {
					//	this.pull(follower);
						follower.move(follower.pos.getDirectionTo(this));
					}
				} else {
					follower.move(follower.pos.getDirectionTo(this));
					registerMoveIntent(this.pos);
				}
			}
		}
	};


	// ROLE DECONSTRUCTER
	Creep.prototype.roleDeconstructor = function () {
		let role = "roleDeconstructor";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD 		
		if (!this._memory[C.CLOSEST_TARGET]) {
			let flags = _.filter(Object.keys(Game.flags), flag => ((Game.flags[flag].color == COLOR_BLUE || Game.flags[flag].color == COLOR_ORANGE) && (Game.flags[flag].pos.roomName == this._memory[C.ROOM_TARGET])));
			if (flags.length > 0) {
				let structure = Game.flags[flags[0]].pos.lookFor(LOOK_STRUCTURES);
				if (structure.length > 0) {
					this.assignTarget(structure[0].id, role);
				}
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) { // MOVE TO TARGET	
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			let value = this.dismantleInRange(targetObj);
			if (value == ERR_NOT_IN_RANGE) {

				this.travelTo(targetObj, { range: 1 });
			}
			else if (value == OK) {
				if (this.carry >= this.carryCapacity / 2) {
					this.drop(RESOURCE_ENERGY);
				}
			}
			else {
				this.clearTarget();
			}
			return 1;
		}
		return 0;
	};	

	// ROLE BUILDER
	Creep.prototype.roleBuilder = function (options = {} ) {
		let role = "roleBuilder";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD 		
		if (!this._memory[C.CLOSEST_TARGET]) {
			let buildAmount = 0;
			if (this.ticksToLive > 100) {
				buildAmount = this.carry[RESOURCE_ENERGY];
			}
			let id = this.room.getBuilderJob({ buildAmount: buildAmount, buildOnly: options.buildOnly, fromPos: this.pos  });
			if (id) {
				this.assignTarget(id, role);
			}
		}

		if (this._memory[C.CLOSEST_TARGET]) { // MOVE TO TARGET			
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (!targetObj) {
				//	console.log(this.room.name + " builder invalid target, forcing update")
				this.room.checkFindCache();
				this.clearTarget();
				if (this._memory.buildType === STRUCTURE_RAMPART && this._memory.rampartPos) {
					let posToCheck = posDecompress(this._memory.rampartPos, this.room.name);
					delete this._memory.buildType;
					delete this._memory.rampartPos;
					let newlyBuiltRampart = posToCheck.lookForStructure(STRUCTURE_RAMPART);
					if (newlyBuiltRampart) {
						this.assignTarget(newlyBuiltRampart.id, role);
						targetObj = Game.getObjectById(newlyBuiltRampart.id);
						delete global.rampartCache[this.room.name];						
					} else { 
						return 1;
					}
				} else {
					return 1;
				}				
			}

			let dest = targetObj.pos;
			let wantedRange = 3;
			
			if (this.room.memory.myRoom &&
				(this.room.controller.level >= 3 && this.room.memory.hostiles || this.room.memory.sieged)
				) {

				dest = targetObj.pos.pullRepairFormation(this.pos, this.id);
				wantedRange = 0;
			//	log(this.room.name+" pullRepairFormation ")
			}

			
			let value = ERR_NOT_IN_RANGE;
			if (this.pos.getRangeTo(targetObj) <= 3) {
				if (targetObj.progress === undefined) {
					value = this.repair(targetObj);
				}
				else {
					value = this.build(targetObj);
				}
			}			

			let rangeToTarget = this.pos.getRangeTo(dest)
			let moving;
			if (rangeToTarget > wantedRange) {

				if (this.room.memory.myRoom && 
					(this.room.memory.hostiles || this.room.memory.sieged) && 
					!isOutsideWalls(this.pos) 
					){

					this.travelTo(dest, { maxRooms: 1, range: wantedRange, roomCallback: getWallLimitMatrix });
					if (isOutsideWalls(targetObj.pos) || targetObj.structureType === STRUCTURE_EXTRACTOR) {
						if (!this._memory._reachTargetTs) {
							this._memory._reachTargetTs = Game.time + 20;
						} 

						if (Game.time > this._memory._reachTargetTs) {
							delete this._memory[C.CLOSEST_TARGET];
							this.clearTarget();
							delete this._memory._reachTargetTs;
						}
					}
				} else {
					this.travelTo(dest, { maxRooms: 1, range: wantedRange });
				}

				let buildRange = 1;
				if (options.slowCreep) { buildRange = 3}
				this.repairWhileMoving(buildRange, true);
				moving = true;
			}

			if (value == OK) {
				delete this._cache.mstate;
				if (!this.room.memory.hostiles && !moving && wantedRange !== 0) { this.yieldRoad(targetObj); }
				if (targetObj.progress === undefined) {	// REPAIRING
					if (targetObj.hits === targetObj.hitsMax && targetObj.hitsMax > 1) {
						this.clearTarget();
						console.log(this.room.name + " builder clear! " + value + " " + targetObj.hits + "/" + targetObj.hitsMax);
					}
				} else { // BUILDING
					
					if (targetObj.structureType === STRUCTURE_RAMPART) {
						this._memory.buildType = targetObj.structureType;
						this._memory.rampartPos = posCompress(targetObj.pos);
					}
				}
			} else if (value == ERR_RCL_NOT_ENOUGH) {
				console.log(this.room.name + " builder clear! not enough RCL " + value);
				this.clearTarget();
			} else if (value == ERR_NOT_IN_RANGE) {	
				// handled above
			} else if (value == ERR_INVALID_TARGET && targetObj) {	
				this.clearTarget();
				let blockingCreep = targetObj.pos.lookForCreep()
				if (blockingCreep && blockingCreep.my && blockingCreep.pushedAway !== Game.time) {
					blockingCreep.move(Math.floor(Math.random() * 8));
					blockingCreep.pushedAway = Game.time;
				}
				
			} else {
				this.clearTarget();
				console.log(this.room.name + " builder clear! " + value);
			}
			return 1;
		}
		return 0;
	};

	Creep.prototype.nudgeOutOfMyWay = function(fromPos) {

		let possiblePositions = [];
		for (let i = 1; i <= 8; i++) {
			let pos = this.pos.getPositionAtDirection(i);

			if (pos.isThisPos(fromPos)) { continue; }
			if (!pos.isPassible(false, false)) { continue; }
			possiblePositions.push(i);

		}

		if (possiblePositions.length > 0) {
			let dir = possiblePositions[Math.floor(Math.random()*possiblePositions.length)]
			this.move(dir)
			return true;
		}

		return false;

	}

	Creep.prototype.nudgeTowardsTarget = function(fromPos) {

		if (Math.random() < 0.1) { return false; }
        let swampDir;
		if (this._cache._trav && this._cache._trav.path && this._cache._trav.path.length > 1) {

		//	let nextDirection = parseInt(this._cache._trav.path[0], 10);

			let nextDirection = this.getNextDirFromPath()
			let nextPos = this.pos.getPositionAtDirection(nextDirection);

            if (nextPos.isThisPos(fromPos) || nextPos.isPassible(false, true)) {
				this.move(nextDirection);
				this.say("nudgedNext");
				delete this._cache._trav.path;
				return true;
			}

			for (let i = 1; i <= 8; i++) {

				let pos = nextPos.getPositionAtDirection(i);
				let range = nextPos.getRangeTo(pos)
				if (range > 1) { continue; }
				if (pos.isPassible(false, true)){

                    delete this._cache._trav.path;

                    if (swampDir !== undefined && getRoomTerrainAt(pos) === TERRAIN_MASK_SWAMP) {
                        swampDir = i;
                        continue; 
                    }
					this.move(i);
					this.say("nudgedPath")
					return true;
				}
			}
		} else if (this._memory[C.CLOSEST_TARGET]) {
			let target = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (!target) { return false;}

			let currentDest = this.pos.getRangeTo(target)
			for (let i = 1; i <= 8; i++) {

				let pos = this.pos.getPositionAtDirection(i);
				let range = pos.getRangeTo(target)
				if (range > currentDest) { continue; }
				if (pos.isPassible(false, true)){
                    if (swampDir !== undefined && getRoomTerrainAt(pos) === TERRAIN_MASK_SWAMP) {
                        swampDir = i;
                        continue; 
                    }
					this.move(i);
					this.say("nudgedTar")
					return true;
				}
			}
		}

        if (swampDir !== undefined) {
            this.move(swampDir);
            this.say("nudgedSwmp")
            return true;
        }

	}

	Creep.prototype.yieldRoad = function (target, allowSwamps = true, range = 2) {

		if (!target) { return OK; }
		let isOffRoad = this.pos.lookForStructure(STRUCTURE_ROAD) === undefined;
		if (isOffRoad) { return OK; }


		let creepsAroundMe = this.lookForAdjacentCreeps()
		if (creepsAroundMe.length === 0 ) { return OK; }
		let movingToMyPos = false;
		for (let idx in creepsAroundMe) {
			let creep = creepsAroundMe[idx];

			this.room.visual.circle(creep.pos.x, creep.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'brown'}) 
			
			let nextDirection = creep.getNextDirFromPath()
			if (nextDirection === undefined) { continue; }
			let nextPos = creep.pos.getPositionAtDirection(nextDirection);

		//	let nextPos = creep.pos.getPositionAtDirection(parseInt(creep._cache._trav.path[0], 10));

			this.room.visual.line(nextPos, creep.pos, { color: "blue", lineStyle: "solid" });
			if (nextPos && nextPos.isThisPos(this.pos)) {
				movingToMyPos = true;
				this.room.visual.circle(creep.pos.x, creep.pos.y , {fill: 'transparent', radius: 0.30, stroke: 'red'}) 
				break; 
			}
		}
		if (!movingToMyPos) { return OK; }

		let swampPosition;
		// find movement options
		let direction = this.pos.getDirectionTo(target);
		for (let i = -range; i <= range; i++) {
			let relDirection = direction + i;
			relDirection = clampDirection(relDirection);
			let position = this.pos.getPositionAtDirection(relDirection);
			this.room.visual.circle(position.x, position.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'}) 
			if (!position.inRangeTo(target, range)) continue;
			if (position.lookFor(LOOK_STRUCTURES).length > 0) continue;


			if (position.lookForAnyCreep() ) { continue; }
			if (position.isNearExit(0)) continue;
			let terrain = getRoomTerrainAt(position);
			if (terrain === TERRAIN_MASK_WALL) { continue; }
			if (terrain === TERRAIN_MASK_SWAMP) {			
				swampPosition = position;
				continue;
			}

			this.room.visual.line(this.pos, position, { color: "green", lineStyle: "solid" });		
			return this.move(relDirection);
		}
		if (swampPosition && allowSwamps) {
			return this.move(this.pos.getDirectionTo(swampPosition));
		}
	//	return this.travelTo(target);
	};


	Creep.prototype.avoidTravelers = function () {
		if (isCpuLimited()) { return; }
		let adjacentCreeps = this.lookForAdjacentCreeps()
		if (adjacentCreeps.length <= 0) { return; }

		let swampPosition;
		for (let idx in adjacentCreeps) {
			let otherCreep = adjacentCreeps[idx];
			if (otherCreep.fatigue) { continue; }
			if (otherCreep._cache._trav && otherCreep._cache._trav.path) {

				let nextDirection = otherCreep.getNextDirFromPath()
				if (nextDirection === undefined) { continue; }
				let otherNextPos = otherCreep.pos.getPositionAtDirection(nextDirection);

				if (otherNextPos.isThisPos(this.pos)) {

				//	log(otherCreep + " moving towards me! ", "green")
					this.room.visual.line(this.pos, otherCreep.pos, { color: "green", lineStyle: "solid" });

					return this.move(this.pos.getDirectionTo(otherCreep.pos))
					/*
					for (let i = 1; i <= 8; i++) {
						let position = this.pos.getPositionAtDirection(i);

						if (position.lookFor(LOOK_STRUCTURES).length > 0) continue;


						if (position.lookForAnyCreep() ) { continue; }
						if (position.isNearExit(0)) continue;
						let terrain = getRoomTerrainAt(position);
						if (terrain === TERRAIN_MASK_WALL) { continue; }
						if (terrain === TERRAIN_MASK_SWAMP) {			
							swampPosition = position;
							continue;
						}

						return this.move(this.pos.getDirectionTo(position));
					}*/
				}
			}
		}
		if (swampPosition) {
			return this.move(this.pos.getDirectionTo(swampPosition));
		}
	}

	Creep.prototype.goToRoom = function (roomName) {

		let role = "returnHome";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }

		if (this.room.name === roomName && !isOutsideWalls(this.pos)) { return 0; }

		if (this._cache.homeDest === undefined || this._memory.dropTarget !== undefined) {
		//	this._memory.homeRange = 2;

			let homeRoom = Game.rooms[roomName]

			if (homeRoom && homeRoom.storage) {
				this._cache.homeDest = posCompress(homeRoom.storage.pos)	
			} else if (this._memory.dropTarget) {
				this._cache.homeDest = this._memory.dropTarget
			} else if (homeRoom && homeRoom.getCranePos() ) {				
				this._cache.homeDest = posCompress(homeRoom.getCranePos() )				
			} else if (homeRoom && homeRoom.controller) {
				this._cache.homeDest = posCompress(homeRoom.controller.pos)
			} else {
				this._cache.homeDest = posCompress(pullIdlePosForRoom(this._memory[C.ROOM_ORIGIN]))
			}
		}

		let dest = posDecompressXY(this._cache.homeDest, roomName)

		let allowBuilding
		let range = 1
		if (Game.cpu.bucket >= 5000) {
			allowBuilding = true;
			range = 3;
		}
		this.repairWhileMoving(range, true, allowBuilding);

		if (this.room.name === roomName) {
			this.room.visual.line(this.pos, dest, { color: "green", lineStyle: "solid" });
			if (this.pos.getRangeTo(dest) < 7) { return false;}
		}
		
		this.travelTo(dest, {range: 2, roomCallback: avoidSKcreeps});
		return 1;
	}

	Creep.prototype.returnHome = function (force = false) {

		let role = "returnHome";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role) && !force) { return 0; }

		if (this.room.name === this._memory[C.ROOM_ORIGIN] && !isOutsideWalls(this.pos)) { return 0; }

		if (this._cache.homeDest === undefined || this._memory.dropTarget !== undefined) {
		//	this._memory.homeRange = 2;

			let homeRoom = Game.rooms[this._memory[C.ROOM_ORIGIN]]

			if (homeRoom && homeRoom.storage) {
				this._cache.homeDest = posCompress(homeRoom.storage.pos)	
			} else if (this._memory.dropTarget) {
				this._cache.homeDest = this._memory.dropTarget
			} else if (getSpawnLinkPos(this._memory[C.ROOM_ORIGIN])) {
				this._cache.homeDest = posCompress(getSpawnLinkPos(this._memory[C.ROOM_ORIGIN]))
			} else if (homeRoom && homeRoom.getCranePos() ) {				
				this._cache.homeDest = posCompress(homeRoom.getCranePos() )
			} else if (homeRoom && homeRoom.controller) {
				this._cache.homeDest = posCompress(homeRoom.controller.pos)
			} else {
				this._cache.homeDest = posCompress(pullIdlePosForRoom(this._memory[C.ROOM_ORIGIN]))
			}
		}

		

		let dest = posDecompressXY(this._cache.homeDest, this._memory[C.ROOM_ORIGIN])

		let allowBuilding
		let range = 1
		if (Game.cpu.bucket >= 5000) {
			allowBuilding = true;
			range = 3;
		}
		this.repairWhileMoving(range, true, allowBuilding);

		if (this.room.name === this._memory[C.ROOM_ORIGIN]) {
			this.room.visual.line(this.pos, dest, { color: "green", lineStyle: "solid" });
			if (this.pos.getRangeTo(dest) < 7) { return false;}
		}

		let useFutureRoads
		if (!isCpuLimited() && roadBuiltStatus(this._memory[C.ROOM_ORIGIN], this._memory[C.SOURCE_ID]) < 0.75) {
			useFutureRoads = true
		}
		
		this.travelTo(dest, {range: 2, roomCallback: avoidSKcreeps, useFutureRoads: useFutureRoads});
		return 1;
	}

	Creep.prototype.roleRefillStorageLink = function () {
		let role = "roleRefillStorageLink";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD 
		if (!this._memory[C.CLOSEST_TARGET] && this.room.controller.level < 8 && !Memory.PraiseGCL[this.room.name]) {
			let targets = _.filter(this.room.findByType(STRUCTURE_LINK),
				function (structure) {
					return ((structure.isStorage() && structure.energyCapacity - structure.energy) >= 400);
				});
			if (targets.length > 0) {
				this.assignTarget(targets[0].id, role);
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			let value = this.transfer(targetObj, RESOURCE_ENERGY);
			if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 2, range: 1 });
			}
			else if (value == ERR_INVALID_TARGET || value == ERR_FULL) {
				this.clearTarget();
				return 0;
			}
			return 1;
		}
		return 0;
	};

	Creep.prototype.getStoreFor = function(res = RESOURCE_ENERGY) {

		let storage = this.room.storage;
		let terminal = this.room.terminal;

		if (storage && !terminal) {
			return storage;
		} else if (terminal && !storage) {
			return terminal;
		} else if (!storage && !terminal) {

			if (this._memory[C.ROOM_ORIGIN] !== this.room.name && Game.rooms[this._memory[C.ROOM_ORIGIN]]) {
				storage = Game.rooms[this._memory[C.ROOM_ORIGIN]].storage;
				if (storage) { return storage}

				terminal = Game.rooms[this._memory[C.ROOM_ORIGIN]].terminal;
				if (terminal) { return terminal}
			}
			return;
		}

		let carryCapacity = this.carryCapacity;	
		if (this.pos.getRangeTo(storage.pos) < this.pos.getRangeTo(terminal.pos) ){
			if (storage.store.getFreeCapacity(res) >= carryCapacity) {
				return storage;
			} else if (terminal.store.getFreeCapacity(res) >= carryCapacity)  {
				return terminal
			}
		} else {
			if (terminal.store.getFreeCapacity(res) >= carryCapacity) {
				return terminal;
			} else if (storage.store.getFreeCapacity(res) >= carryCapacity) {
				return storage;
			}
		}
	}

	Creep.prototype.roleStoreEnergy = function () {
		let role = "roleStoreEnergy";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD 
		if (!this._memory[C.CLOSEST_TARGET]) {

			let store = this.getStoreFor(RESOURCE_ENERGY);
			if (store) {
				this.assignTarget(store.id, role, RESOURCE_ENERGY);
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);

			let value = ERR_NOT_IN_RANGE;
			if (this.pos.inRangeTo(targetObj.pos, 1)) {
				value = this.transferAny(targetObj);
			}

			if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 2, range: 1 });
			}
			else if (value == ERR_INVALID_TARGET || value == ERR_FULL) {
				this.clearTarget();
				return 0;
			} else if (value === OK) {
				this.clearTarget();
			}
			return 1;
		}
		return 0;
	};

	Creep.prototype.roleRefillTerminalEnergy = function () {
		let role = "roleRefillTerminalEnergy";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD 
		if (!this._memory[C.CLOSEST_TARGET]) {
			let targetEnergy = TERMINAL_TARGET_ENERGY_LOW;
			if (Memory.energyShare && Memory.energyShare[this.room.name]) {
				targetEnergy = TERMINAL_TARGET_ENERGY_SHARE;
			}
			if (this.room.terminal && this.room.terminal.store[RESOURCE_ENERGY] < targetEnergy) {
				this.assignTarget(this.room.terminal.id, role);
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			let value = this.transfer(targetObj, RESOURCE_ENERGY);
			if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 2, range: 1 });
			}
			else if (value == ERR_INVALID_TARGET || value == ERR_FULL) {
				this.clearTarget();
				return 0;
			}
			return 1;
		}
		return 0;
	};
	//	Game.rooms["E83S75"].terminal.send("XGH2O", 1500, "E85S72")
	Creep.prototype.roleRefillStorageEnergy = function () {
		let role = "roleRefillStorageEnergy";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD 
		if (!this._memory[C.CLOSEST_TARGET]) {		
			if (this.room.storage && this.room.storage.store[RESOURCE_ENERGY] < this.room.storage.storeCapacity) {
				this.assignTarget(this.room.storage.id, role);
			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			let value = this.transfer(targetObj, RESOURCE_ENERGY);
			if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 2, range: 1 });
			}
			else if (value == ERR_INVALID_TARGET || value == ERR_FULL) {
				this.clearTarget();
				return 0;
			}
			return 1;
		}
		return 0;
	};


	Creep.prototype.roleMover = function () {
		let role = "roleMover";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD 

		if (!this._memory[C.CLOSEST_TARGET]) {
			let targetEnergy = 5000;
			if (Memory.energyShare && Memory.energyShare[this.room.name]) {
				targetEnergy = 15000;
			}
			let carryCapacity = this.carryCapacity;
			if (this.room.terminal.store[RESOURCE_ENERGY] < targetEnergy) {
				this.assignTarget(this.room.terminal.id, role);
				return 1;
			} else {
				let targetsStorage = _.filter(this.room.findByType(STRUCTURE_STORAGE),
					function (structure) {
						return ((structure.storeCapacity - structure.store[RESOURCE_ENERGY]) >= carryCapacity);
					});
				if (targetsStorage.length > 0) {
					this.assignTarget(targetsStorage[0].id, role);
					return 1;
				}					
			}
			if (!this._memory[C.CLOSEST_TARGET]) { return 0; }
		} else { // MOVE TO TARGET			
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			let value = this.transfer(targetObj, RESOURCE_ENERGY);
			if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 2, range: 1 });
			} else if (value == ERR_INVALID_TARGET || value == ERR_FULL) {
				this.clearTarget();
				return 0;
			}
			return 1;
		}
	};

	Creep.prototype.sleep = function (delay) {
		if (delay > 0) {
			this._cache.sleep = delay + 1;
			if (this._cache._trav) {
				this._cache._trav.state[2] = 0; // reset stuck state
			}
		} else {
			if (this._cache.sleep) { this._cache.sleep-- }
		}

		if (this._cache.sleep > 0) {
			this.say(this._cache.sleep)
			return 1;
		} else {
			delete this._cache.sleep;
			return 0;
		}
	};

	Creep.prototype.healPower = function () {
		return this.hasBodyparts(HEAL) * HEAL_POWER;
	};

	Creep.prototype.getAttackTarget = function (ignoreCreeps = false, ignoreWorkers = false, myStrength = undefined, phalanx= false, unique= undefined, stickyWallTarget = false) {

		let roomName = this.room.name;
		let myPos = this.pos
	//	let hostiles = getEnemyCreeps(roomName);

		let hostiles = _.filter(getEnemyCreeps(roomName),
			function (creep) {
				return (
					!creep.pos.lookForStructure(STRUCTURE_RAMPART) &&
					reachableRaidPos(creep.pos, myPos, phalanx) &&
					creep.owner.username !== "Source Keeper"
				);
			});

		let isPhalanx;
		if (phalanx) {			
			isPhalanx = raidPhalanx
		}

		if (myStrength === undefined) {
			let friendlies = this.pos.lookForAlliedAndMyCreepsAround(5);			
			myStrength = calcCreepStrength(friendlies, true);
		}

		checkForChangedStructureCount(roomName);		
		
		let targetCache

		if (unique) {
			if (this._cache.targetCache === undefined) { this._cache.targetCache = {} }
			targetCache = this._cache.targetCache;
		} else {
			if (this.room._cache.targetCache === undefined) { this.room._cache.targetCache = {} }
			targetCache = this.room._cache.targetCache;
		}

		if (targetCache.chase === undefined) { 
			targetCache.chase = 0
		}

		if (targetCache.chase > 0) {
			targetCache.chase -= 0.5;
		}

		
		// FIND HOSTILES WITH OFFENSIVE PARTS
		if (!ignoreCreeps) {
			let rangeToCheck = Math.ceil(7 - (6 * ((targetCache.chase || 1) / 100)) );
		//	log("range " + rangeToCheck + " chase " + targetCache.chase)
			if (this.room.controller && this.room.controller.owner && ALLIES[this.room.controller.owner.username]) { 
				rangeToCheck = 50;
			} else if (!this.room.controller) {
				rangeToCheck = 50;
			}

			let dangerHostiles = []
			if (!this.room._dangerHostiles) {
				if (this.room.controller && this.room.controller.my) {
					dangerHostiles = _.filter(hostiles,
						function (creep) {
							return (
								(creep.hasBodyparts(ATTACK) > 1 ||
								creep.hasBodyparts(RANGED_ATTACK) > 1 ||
								creep.hasBodyparts(CLAIM) > 1 ||	
								creep.hasBodyparts(WORK) > 1 ||								
								creep.hasBodyparts(HEAL) > 1 || 
								creep.isPowerCreep) 
							);
						});
				} else {
					dangerHostiles = _.filter(hostiles,
						function (creep) {
							return (
								(creep.hasBodyparts(ATTACK) > 1 ||
								creep.hasBodyparts(RANGED_ATTACK) > 1 ||							
								creep.hasBodyparts(HEAL) > 1 ||
								creep.isPowerCreep)
							);
						});
				}
				
				this.room._dangerHostiles = dangerHostiles;
			} else {
				dangerHostiles = this.room._dangerHostiles;
			}
			let targets = [];
			if (dangerHostiles.length > 0) {
				for (let idx in dangerHostiles) {
					let creep = dangerHostiles[idx];					
					let score = 0; // lower is better

					let range = this.pos.getRangeTo(creep)
					if (phalanx && range > rangeToCheck) { continue; }

					score += range * 5 ;	
					score += (creep.hits / creep.hitsMax) * 5;
					targets.push([creep, score]);
				//	this.room.visual.text(score, creep.pos.x, creep.pos.y, { color: 'red', font: 0.8 });
				}
			}

			if (targets.length > 0) {
				targets.sort(function(a, b) {
					return (a[1] - b[1]);});
							
				for (let i=0; i < targets.length; i++ ) {
					let targetCreep = targets[i][0];
					let path = findTravelPath(this.pos, targetCreep, { ignoreCreeps: true, freshMatrix: true, roomCallback: isPhalanx, maxOps: 2500 });
					if (path.incomplete) { continue; }

				//	targetCache		// add creeps to cache and add limit for chasing time/number of times?
					
					if (targetCache._wallTarget) {
						targetCache.chase += 2;
					}

					return targetCreep;
				}
			}
		}

		let priTargets = {
			[STRUCTURE_SPAWN] : {},
			[STRUCTURE_INVADER_CORE] : {},
			[STRUCTURE_TOWER] : {},
			[STRUCTURE_TERMINAL] : {},
			[STRUCTURE_STORAGE] : {},
			[STRUCTURE_LAB] : {},	
			[STRUCTURE_NUKER] : {},		
			[STRUCTURE_FACTORY] : {},
		};

		priTargets = Object.keys(priTargets);
		
		if (this._memory.getAttackTargetTimeout && Game.time > this._memory.getAttackTargetTimeout) { delete this._memory.getAttackTargetTimeout; }


		
		if (this.room.memory._breachPosTs && Game.time > this.room.memory._breachPosTs) {
			delete this.room.memory._breachPos;
			delete this.room.memory._breachPosTs;
			delete targetCache._wallTargetTs;
			delete targetCache._wallTarget;
		}
		
		if ((targetCache._wallTargetTs && Game.time > targetCache._wallTargetTs) || !Game.getObjectById(targetCache._wallTarget) || valuableScoreStore(Game.getObjectById(targetCache._wallTarget))) { 
			delete targetCache._wallTargetTs;
			delete targetCache._wallTarget;
		}

		// FIND NON RAMPARTED STRUCTURE
		let nonRampartStructures = [];
		if (!this.room._nonRampartStructures && (!targetCache || !targetCache._wallTarget)) {
			nonRampartStructures = _.filter(getEnemyStructures(roomName),			
			function (structure) {
				return (structure.structureType !== STRUCTURE_CONTROLLER &&
					structure.structureType !== STRUCTURE_RAMPART &&
					structure.structureType !== STRUCTURE_CONTAINER &&
					structure.structureType !== STRUCTURE_ROAD &&
					structure.structureType !== STRUCTURE_KEEPER_LAIR &&
					structure.structureType !== STRUCTURE_POWER_BANK &&
					structure.structureType !== STRUCTURE_EXTRACTOR &&
					(!structure.pos.lookForStructure(STRUCTURE_RAMPART) || structure.pos.lookForStructure(STRUCTURE_RAMPART).hits < 25000) && 
					!valuableScoreStore(structure) &&
					reachableRaidPos(structure.pos, myPos, phalanx)
					);
			});
			
			this.room._nonRampartStructures = nonRampartStructures;
		} else {
			nonRampartStructures = this.room._nonRampartStructures;
		}

		let wantedRange = 1
		if (this.hasBodyparts(RANGED_ATTACK)){
			wantedRange = 3
		}

		if (nonRampartStructures && nonRampartStructures.length > 0) {
			for (let idx in priTargets) {
				let type = priTargets[idx];
				let targetPrioritized = _.filter(nonRampartStructures,
					function (c) {
						return (c.structureType === type);
					});

				if (targetPrioritized.length > 0) {
				//	let inRange = this.pos.findClosestByPath(targetPrioritized, { ignoreCreeps: true, range: wantedRange, costCallback: isPhalanx, maxOps: 5000 });
					// find closest by path does not take costCallback as argument
					let inRange = this.pos.findClosestByRange(targetPrioritized);
					if (inRange) {
						this.room.visual.text("NRS", inRange.x, inRange.y, { color: 'blue', font: 0.8 });

						targetCache._wallTarget = inRange.id;
						targetCache._wallTargetTs = Game.time + 23;
						targetCache._wallTargetDebug = 'non rampart pri'
						targetCache._wallTargetPos = posCompress(inRange.pos);
						return inRange;
					}
				}
			}

		//	let inRange = this.pos.findClosestByPath(nonRampartStructures, { ignoreCreeps: true, range: wantedRange, costCallback: isPhalanx, maxOps: 5000 });
			let inRange = this.pos.findClosestByRange(nonRampartStructures)
			if (inRange) {
				this.room.visual.text("NRS", inRange.x, inRange.y, { color: 'green', font: 0.8 });		
				targetCache._wallTarget = inRange.id;
				targetCache._wallTargetTs = Game.time + 17;
				targetCache._wallTargetDebug = 'non rampart'
				targetCache._wallTargetPos = posCompress(inRange.pos);

				return inRange;
			}
		}

		// FIND ANY HOSTILES IN RANGE
		if (hostiles.length > 0  && !ignoreCreeps ) {
			let rangeToCheck = Math.ceil(9 - (7 * ((targetCache.chase || 1) / 100)) ); 
			let aroundMe = this.pos.lookForEnemyCreepsAround(rangeToCheck);
			let nonRamparted = _.filter(aroundMe,
				function (creep) {
					return (
						!creep.pos.lookForStructure(STRUCTURE_RAMPART) &&
						reachableRaidPos(creep.pos, myPos, phalanx) &&
						!creep.isScout() &&
						creep.owner.username !== "Source Keeper"
						);
				});
			if (nonRamparted.length > 0) {
				
				for (let idx in nonRamparted) {
					let creep = nonRamparted[idx];
					if (this.pos.inRangeTo(creep.pos.x, creep.pos.y, wantedRange)) {
						this.room.visual.text("AHR", creep.pos.x, creep.pos.y, { color: 'red', font: 0.8 });
						targetCache.chase += 3;
						return creep;
					}
				}
				if (this.room.memory.numberOfTowers <= 0) {
				//	let inRange = this.pos.findClosestByPath(nonRamparted, { ignoreCreeps: true, range: wantedRange, costCallback: isPhalanx, maxOps: 500 });
					let inRange = this.pos.findClosestByRange(nonRamparted)
					if (inRange) {
						console.log("returning creep in range " + inRange)
						this.room.visual.text("AHRR", inRange.pos.x, inRange.pos.y, { color: 'green', font: 0.8 });
						targetCache.chase += 3;
						return inRange;
					}
				}
			}

			if ((hostiles.length > 0 && 
				(!phalanx || !this.room.controller)) &&
				((!this.room.memory.huntAny || 
				this.room.memory.huntAny < Game.time) || 
				this.room.memory.hunterId === this.id)
				){		

					
				let bestTarget;
				let bestScore = 9999;
				for (let idx in hostiles) {
					let creep = hostiles[idx];
					let score = 0; // lower is better

					let range = this.pos.getRangeTo(creep)
					if (phalanx && range > rangeToCheck) { continue; }

					score += range * 5 ;	
					score += (creep.hits / creep.hitsMax) * 5;
					if (score < bestScore) {
						bestScore = score;
						bestTarget = creep;
					}
				}

				if (bestTarget) {
					this.room.memory.hunterId = this.id;
					this.room.memory.huntAny = Game.time + 13;
					this.say("hunter");

					if (targetCache._wallTarget) {
						targetCache.chase += 2;
					}
					
					return bestTarget;
				}
			}
		}
				
		if (this.room.controller) {
			if (this.room.memory && this.room.memory.myRoom) { return; }
			if (this.room.controller.owner && ALLIES[this.room.controller.owner.username]) { return; }
			if (this.room.controller.reservation && ALLIES[this.room.controller.reservation.username]) { return; }
		}	

		// RETURN CACHED WALL OR RAMPART
		if (targetCache._wallTarget) {
			let wall = Game.getObjectById(targetCache._wallTarget);



			if (wall && 
				(stickyWallTarget || wall.pos.myCombatStrengthLarger(3, myStrength)) &&
				!wall.getEffect(PWR_FORTIFY) ) {
				return wall;
			} else {
				if (wall && !targetCache._deleteTs && Game.time < targetCache._deleteTs) {
					return wall;
				} else {
					log("deleting cahced wall target! " + wall)
					targetCache._deleteTs = Game.time + 31;
					delete targetCache._wallTarget;
				}
			}
		}
		
		// STOMP CONSTRUCTION SITES
		if (!this._memory.getAttackTargetTimeout && !this.room._checkedConstructionSites && !ignoreWorkers) {
			this.room._checkedConstructionSites = 1;
			let site = this.getHostileConstructionSite(500);
			if (site) { return site; }
		}

		// HUNT DOWN WORKERS
		if (hostiles.length > 0 && !ignoreWorkers && !this.room._huntWorkers && !phalanx) {
			let nonRamparted = _.filter(hostiles,
				function (creep) {
					return (
						!creep.pos.lookForStructure(STRUCTURE_RAMPART));
				});
			
		//	let inRange = this.pos.findClosestByPath(nonRamparted, { ignoreCreeps: true, range: wantedRange, maxRooms: 1, costCallback: isPhalanx, maxOps: 250 });
			let inRange = this.pos.findClosestByRange(nonRamparted)
			if (inRange) {
				this.room._huntWorkers = 1;
				this.room.visual.text("WRKR", inRange.x, inRange.y, { color: 'green', font: 0.8 });
				if (targetCache._wallTarget) {
					targetCache.chase += 2;
				}
				return inRange;
			}
		}

		if (this._memory.getAttackTargetTimeout && Game.time < this._memory.getAttackTargetTimeout) { return; }
		
	
		if ((roomIsCenter(roomName) || roomIsSk(roomName)) && 
			(!Memory.rooms[roomName] || (!Memory.rooms[roomName].invaderCore && !sectorHasDeadInvaderCore(roomName) ))
		) { return; }

		
	//	if ((this.room.controller || (Memory.rooms[roomName] && Memory.rooms[roomName].invaderCore) || roomIsCorner(roomName) || (SEASONAL_SYMBOLS && roomIsHW(roomName)) ) && 
	//		(SEASONAL_SYMBOLS || !hasBreachedWalls(roomName, phalanx))
		// BREACH?
		if ((this.room.controller || (Memory.rooms[roomName] && Memory.rooms[roomName].invaderCore)) && !hasBreachedWalls(roomName, phalanx)) {

		//	log(this.room.name + " checking walls ");
			let creeps = [];
			creeps.push(this);
			let targetWalls = findWallToAttack(roomName, creeps, myStrength, phalanx, unique);
			if (targetWalls.length > 0) {
				let targetWall = targetWalls[0];
				targetCache._wallTarget = targetWall.id;
				targetCache._wallTargetTs = Game.time + 97;
				targetCache._wallTargetDebug = 'wallSiege';
				targetCache._wallTargetPos = posCompress(targetWall.pos);
				return targetWall;
			}
		}
		
		// FIND RAMPARTED STRUCTURE

		let targets = []
		if (roomHasDeadCore(roomName)) {
			priTargets[STRUCTURE_CONTAINER] = {};

			targets = this.room.find(FIND_STRUCTURES, {
				filter: (structure) => {
					return (structure.structureType === STRUCTURE_CONTAINER && 
							structure.pos.lookForStructure(STRUCTURE_RAMPART)						
					);
				}
			});
		} 

		if (targets.length <= 0) {
			targets = _.filter(getEnemyStructures(roomName),
			function (structure) {
				return (structure.structureType !== STRUCTURE_CONTROLLER &&
					structure.structureType !== STRUCTURE_ROAD &&
					structure.structureType !== STRUCTURE_CONTAINER &&
					structure.structureType !== STRUCTURE_POWER_BANK &&
					structure.structureType !== STRUCTURE_KEEPER_LAIR &&
					structure.structureType !== STRUCTURE_RAMPART &&
					!valuableScoreStore(structure) &&
					reachableRaidPos(structure.pos, myPos, phalanx)
					);
			});
		}
		
		
		

		if (targets.length > 0) {
			for (let idx in priTargets) {
				let type = priTargets[idx];
				let targetPrioritized = _.filter(targets,
					function (c) {
						return (c.structureType === type);
					});
			//	console.log(roomName + " getAttackTarget found priority ramparted targets " + targetPrioritized.length + " of type " + type);	
				if (targetPrioritized.length > 0) {
					let inRange = this.pos.findClosestByRange(targetPrioritized, { ignoreCreeps: true, range: 1, costCallback: isPhalanx, maxOps: 500 });
					if (inRange) {
						console.log(roomName + " getAttackTarget found ramparted priTargets " + targetPrioritized.length + " of " + type);
						targetCache._wallTarget = inRange.id;
						targetCache._wallTargetTs = Game.time + 350;
						targetCache._wallTargetDebug = 'priRampartedStructure'
						targetCache._wallTargetPos = posCompress(inRange.pos);
						return inRange;
					}
				}
			}
			let inRange = this.pos.findClosestByRange(targets, { ignoreCreeps: true, range: 1, costCallback: isPhalanx });
			if (inRange) {
				targetCache._wallTarget = inRange.id;
				targetCache._wallTargetTs = Game.time + 350;
				targetCache._wallTargetPos = posCompress(inRange.pos);
				targetCache._wallTargetDebug = 'rampartedStructure'
				return inRange;
			}
		}



		
		if (this._memory[C.ROOM_TARGET] !== this.room.name) { return; }
		

		priTargets = {			
			[STRUCTURE_RAMPART] : {},	
			[STRUCTURE_CONTAINER] : {},		
		};

		targets = [];

		// Always unique clean up targets?
		if (this._cache.targetCache === undefined) { this._cache.targetCache = {} }
		targetCache = this._cache.targetCache;
		
		if (this.room.memory && (this.room.memory[R.MY_MINING_OUTPOST] || this.room.memory.invaderCore)) { 
			// CLEAN LEFT OVER WALLS, ETC
			targets = this.room.find(FIND_STRUCTURES, {
				filter: (structure) => {
					return (structure.structureType === STRUCTURE_WALL ||
						structure.structureType === STRUCTURE_RAMPART
						
					);
				}
			});
		} else {
			// CLEAN LEFT OVER WALLS, ROADS ETC
			targets = this.room.find(FIND_STRUCTURES, {
				filter: (structure) => {
					return (structure.structureType === STRUCTURE_WALL ||
						structure.structureType === STRUCTURE_RAMPART ||
						structure.structureType === STRUCTURE_CONTAINER ||
						structure.structureType === STRUCTURE_ROAD
					);
				}
			});
		}
		
		if (targets.length > 0) {
		//	console.log("targets " + targets.length)
			for (let type in priTargets) {
			//	let type = priTargets[idx];
				let targetPrioritized = _.filter(targets,
					function (c) {
						return (c.structureType === type);
					});

				if (targetPrioritized.length > 0) {
					let inRange = this.pos.findClosestByRange(targetPrioritized, { ignoreCreeps: true, range: 1, costCallback: isPhalanx, maxOps: 500 });
					console.log(roomName + " getAttackTarget left overs found " + targetPrioritized.length + " of " + type);
					if (inRange) {						
						targetCache._wallTarget = inRange.id;
						targetCache._wallTargetTs = Game.time + 350;
						targetCache._wallTargetDebug = 'cleanPriStrucutres'
						targetCache._wallTargetPos = posCompress(inRange.pos);
						return inRange;
					}
				}
			}
			
			let inRange = this.pos.findClosestByRange(targets, { ignoreCreeps: true, costCallback: isPhalanx });
			if (inRange) {
				console.log(" returning clean up " + inRange);
				targetCache._wallTarget = inRange.id;
				targetCache._wallTargetTs = Game.time + 350;
				targetCache._wallTargetDebug = 'cleanStrucutres'
				targetCache._wallTargetPos = posCompress(inRange.pos);
				return inRange;
			}
		}

		// NO TARGETS!
		this._memory.getAttackTargetTimeout = Game.time + 49;
	};

	Creep.prototype.getHostileConstructionSite = function (requiredProgress = 100) {
		let sites = this.room.find(FIND_HOSTILE_CONSTRUCTION_SITES);
		let confirmed = [];
		for (let idx in sites) {
			let site = sites[idx];
			if (site.pos.lookForStructure(STRUCTURE_RAMPART) ) { continue; }
			if (site.structureType === STRUCTURE_RAMPART) { continue; }
			if (site.progress > requiredProgress && !ALLIES[site.owner.username] && site.structureType !== STRUCTURE_EXTRACTOR) {
				confirmed.push(site);
			}
		}
		let inRange = this.pos.findClosestByRange(confirmed, { ignoreCreeps: true, maxRooms: 1, range: 1 });
		if (inRange) {
			return inRange;
		}
	}

	Creep.prototype.bodyIsCombatCreep = function(requiredParts = 3) {
		let foundParts = 0;
		for (let idx in this.body) {
			let part = this.body[idx];
			if (part.type === ATTACK || part.type === RANGED_ATTACK || part.type === HEAL) { 
				foundParts++; 
				if (foundParts >= requiredParts) { return true; }
			}			
		}	
		return false;
	}

	Creep.prototype.enemyIsCombatCreep = function () {
		if (this.hasBodyparts(ATTACK)) { return true; }
		if (this.hasBodyparts(RANGED_ATTACK)) { return true; }
	}

	Creep.prototype.isCombatCreep = function () {
		if (creepsCache[this.name] === undefined || creepsCache[this.name].isCombatCreep === undefined ) {
			let isCombat = this.bodyIsCombatCreep(3);
		//	let parts = this.hasBodyparts(ATTACK) + this.hasBodyparts(RANGED_ATTACK) + this.hasBodyparts(HEAL)
			if (creepsCache[this.name] === undefined) { creepsCache[this.name] = {}; }
			if (isCombat) {				
				creepsCache[this.name].isCombatCreep = 1;
			} else {
				creepsCache[this.name].isCombatCreep = 0;
			}
		}
		return creepsCache[this.name].isCombatCreep;
	}

	Creep.prototype.isScout = function () {
		if (creepsCache[this.name] === undefined || creepsCache[this.name].isScout === undefined ) {
			
			if (creepsCache[this.name] === undefined) { creepsCache[this.name] = {}; }

			creepsCache[this.name].isScout = true;

			for (let idx in this.body) {
				let part = this.body[idx];
				if (part.type !== MOVE) { 
					creepsCache[this.name].isScout = false;
				}
			}
			
		}
		return creepsCache[this.name].isScout;
	}

	global._hasBodypartsCache = {};
	Creep.prototype.hasBodyparts = function (type) {		

		var id = this.name + type;
		if (global._hasBodypartsCache[id] === undefined) {

			global._hasBodypartsCache[id] = {};

			let count = 0;
			for (let part in this.body) {
				if (this.body[part].type === type) { count++; }
			}

			global._hasBodypartsCache[id].count = count;
			return count;
		}
		return global._hasBodypartsCache[id].count;
	};

	Creep.prototype.roleMineralBalancer = function () {
		let role = "roleMineralBalancer";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN BUILD 

		if (!this._memory[C.CLOSEST_TARGET]) {
			if (Memory.Minerals && Memory.Minerals.Move && Memory.Minerals.Move[this.room.name]) {

				if (this.room.terminal.freeSpace > this.carryCapacity) {
					for (let res in Memory.Minerals.Move[this.room.name].res) {
						if (this.room.terminal.store[res] === undefined ||
							this.room.storage.store[res] > this.room.terminal.store[res]) {
							this.assignTarget(this.room.storage.id, role, res);
							//console.log(this + " assign move " + res)
							break;
						}
					}
				}
			}


		}
		if (this._memory[C.CLOSEST_TARGET]) {
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			let value = ERR_NOT_IN_RANGE;
			if (this.pos.inRangeTo(targetObj, 1)) {
				value = this.withdraw(targetObj, this._memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY);
			}
			if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 1, range: 1 });
			}
			else if (value == OK) {
				this.clearTarget();
			}
			else {
				console.log(this.room.name + " error roleMineralBalancer " + value);
				this.clearTarget();
			}
			return 1;
		}
		return 0;
	};


	Creep.prototype.roleMineralMover = function (force=false) {
		let role = "roleMineralMover";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!force && !this.checkRole(role)) { return 0; }
		// ASSIGN BUILD 

		if (!this._memory[C.CLOSEST_TARGET]) {
			if (this._cache.oldTarget === undefined) {
				let carryCapacity = this.carryCapacity;

				let targets = []
				if (this.room._memory.mineOnly && this.room.terminal) {
					targets.push(this.room.terminal)
				} else {
					targets = _.filter(Game.rooms[this._memory[C.ROOM_ORIGIN]].findByType([STRUCTURE_STORAGE, STRUCTURE_TERMINAL]),
					function (structure) {
						return (structure.freeSpace >= carryCapacity + 2000);
					});
				}
				
				
				if (targets.length > 0) {
					if (this.room.name === this._memory[C.ROOM_ORIGIN]) {
						let bestTarget = this.pos.findClosestByRange(targets);
						this._cache.oldTarget = bestTarget.id;
					} else {
						this._cache.oldTarget = targets[0].id;
					}					
				}

			} else {
				this.assignTarget(this._cache.oldTarget, role);
			}
		}

		if (!this._memory[C.CLOSEST_TARGET]) {
			return 0;
		} else { // MOVE TO TARGET			
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);

			if (!targetObj) {
				this.clearTarget();
				return 1;
			}

			let value = ERR_NOT_IN_RANGE;
			if (this.pos.inRangeTo(targetObj.pos, 1)) {
				value = this.transferAny(targetObj);
			}

			if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { allowSK: true, range: 1, roomCallback: avoidSKcreeps });
			} else if (value === OK) {
				if (!this._memory.gathered) { this._memory.gathered = 0; }
				this._memory.gathered += this.carryCapacity;
				if (this._memory.dying || this.ticksToLive < (this._memory.ticksToReturn || this._memory[C.TICKS_TO_TARGET])  * 2.2) {
					this.recycleOrSuicide();
					return 1;
				}
				this.clearTarget();
			} else if (value <= 0) {
				delete this._cache.oldTarget;
				this.clearTarget();
			}
			return 1;
		}
	};

	Creep.prototype.findScorers = function() {

		let spawner = this._memory[C.ROOM_ORIGIN];
		let scoreHaulers;

		let bestCollector;
		let shortestDist = 999;

		for (let room in Memory.scoreCollector){
			if (Memory.scoreCollector[room].clearPath) {

				if (!Memory.scoreCollector[room].assignedSpawns || !Memory.scoreCollector[room].assignedSpawns[spawner]) { continue; }
				if (checkTraversedRoomsForHostiles(spawner, room) )  { continue; }

				if (Memory.rooms[room] && Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.defensive) { continue; }
				if (Memory.scoreCollector[room].avoid) { 
					if (Game.time < Memory.scoreCollector[room].avoid) {
						continue; 
					} else {
						delete Memory.scoreCollector[room].avoid;
					}
				}
				
				let dist = getRouteDistanceOnly(room, this.room.name);



				let estimatedRegenSink = SCORE_COLLECTOR_SINK * dist * 35;
				if (!scoreHaulers) {
					scoreHaulers = _.filter(Game.creeps, (c) => (c.memory[C.ROLE] === 'scoreHauler'));
				}
				let scoreHaulersAssigned = _.filter(scoreHaulers, (creep) => creep._memory.scorer === room);

				let scoreOnItsWay = 0;
				if (scoreHaulersAssigned.length > 0) {
					scoreOnItsWay = (scoreHaulersAssigned[0].body.length / 2) * CARRY_CAPACITY;
				}

				if (Memory.scoreCollector[room].capacity + estimatedRegenSink < 1250 ){ continue;  }
				
				if (dist < shortestDist) {
					shortestDist = dist;
					bestCollector = room;
				}
			}
		}

		if (bestCollector) {
			log("assigned new scorer! " + bestCollector, "green")
			return bestCollector;
		} else {
			log("found no suitable collector, spawner " +  spawner, "green")
		}
	}

	global._maxSymbolsStored = {}
	global.maxSymbolsStored = function() {
		if (!global._maxSymbolsStored.ts || Game.time > global._maxSymbolsStored.ts ) {
			global._maxSymbolsStored.ts = Game.time + 799;

			let storeRooms = Object.keys(Memory.Minerals.Labs).length || 1;
			let totalSymbolsRoom = 650000;
			let globalSymbolsStored = totalSymbolsRoom * storeRooms;
			let totalSymbolTypes = SYMBOLS.length;
			let symbolsWithDecoder = 0;
			for (let idx in SYMBOLS) {
				let symbol = SYMBOLS[idx]
				if (hasHigherDecoder(symbol, CONTROLLER_MAX_LEVEL) ) {
					symbolsWithDecoder++;
				}
			}
			let symbolsToStore = globalSymbolsStored / ((totalSymbolTypes - symbolsWithDecoder) || 1);
			log("wanted symbols in stock " + symbolsToStore + " total decoders " + symbolsWithDecoder + " global symbol store " + globalSymbolsStored)
			global._maxSymbolsStored.amount = symbolsToStore;

		}
		return global._maxSymbolsStored.amount;		
	}

	Creep.prototype.canScoreSymbol = function(roomName, res) {

		if (this._memory.isScoring === undefined) {
			
			this._memory.isScoring = false;

			if (SYMBOLS.includes(res) &&
				(roomName === undefined || 
				(Memory.scoreCollector[roomName] && Memory.scoreCollector[roomName].type !== res))
			) {						
				
				
				let addDist = 3;
				

				let allowedDistTTL = estimatedRoomTravelLeft(this.ticksToLive);
				let bestDecoder;
				let bestScore = -99999;
				let maxStored = maxSymbolsStored();
				for(let decoderRoom in Memory.scoreCollector) {

					let type = Memory.scoreCollector[decoderRoom].type;
					if (type !== res) { continue; }

					if (!Memory.rooms[decoderRoom]) { continue; }
					if (!getRoomRCL(decoderRoom) || getRoomRCL(decoderRoom) < 7) { continue; }
					if (getRoomRCL(decoderRoom) <= 7 && (Memory.Minerals[type] < maxStored * 1.5 || hasHigherDecoder(type, 8)) ) { continue; }
					if (!Memory.rooms[decoderRoom].player || !ALLIES[Memory.rooms[decoderRoom].player]) { continue; }

					if (Memory.scoreCollector[decoderRoom].avoid) { 
						if (Game.time < Memory.scoreCollector[decoderRoom].avoid) {
							continue; 
						} else {
							delete Memory.scoreCollector[decoderRoom].avoid;
						}
					}

					let maxDist = 12;
					if (Memory.scoreCollector[decoderRoom] && Memory.scoreCollector[decoderRoom].assignedSpawns) {
						for (let spawner in Memory.scoreCollector[decoderRoom].assignedSpawns) {
							if ((Memory.scoreCollector[decoderRoom].assignedSpawns[spawner].range + addDist) < maxDist) {
								maxDist = Memory.scoreCollector[decoderRoom].assignedSpawns[spawner].range + addDist;
							}
						}
					}

					let assignedScorerDist = closestDecoderRangeForSymbol(res) + addDist;

					maxDist = Math.min(maxDist, allowedDistTTL);

			
					if (getRoomLinearDistance(decoderRoom, this.room.name) > maxDist) { continue; }
					let rangeToDecoder = getRouteDistanceOnly(decoderRoom, this.room.name);
				
					if (rangeToDecoder > maxDist) { continue; }

					


					/*
					if (!posInSameSector(this.pos, fromPos) ){ continue; }
					if (!reachablePosHWWall(this.pos, fromPos) ){ continue; }
					*/

	
					let score = -rangeToDecoder;
					score += CONTROLLER_LEVEL_SCORE_MULTIPLIERS[getRoomRCL(decoderRoom)];				


					if (score > bestScore){
						bestDecoder = decoderRoom;
					}
				}

				roomName = bestDecoder;
				if (!roomName) { return false; }
				
				this._memory.scorer = roomName;
				this._memory.scorerDest = Memory.scoreCollector[roomName].pos;
				this._memory.collectorId = Memory.scoreCollector[roomName].id;

			} 
			
			if ((this._memory.scorer && checkTraversedRoomsForHostiles(this.room.name, this._memory.scorer)) || 				
				(Memory.scoreCollector[roomName] && Memory.scoreCollector[roomName].avoid && Game.time < Memory.scoreCollector[roomName].avoid)
			) {
				log(roomName + " no scoring allowed, hostiles on path or avoided")
				
				return false;
			}			
		
			this._memory.isScoring = roomName;

		}

		return this._memory.isScoring === roomName;
	}

	Creep.prototype.canScore = function(roomName) {
		// SCORE

		if (this._memory.isScoring === undefined) {

			
			this._memory.isScoring = false;

			if (roomName === undefined) {
				this._memory.scorer = this.findScorers();
				
				roomName = this._memory.scorer;
				if (!roomName) { return false; }
				this._memory.scorerDest = Memory.scoreCollector[roomName].pos;
				this._memory.collectorId = Memory.scoreCollector[roomName].id;

			}

			if (Memory.rooms[roomName] && Memory.rooms[roomName].hostiles) {

				addRage(Memory.rooms[roomName].isPlayer, 1500)
				if (Memory.rooms[roomName].hostiles.power.defensive) {
					addRage(Memory.rooms[roomName].isPlayer, Memory.rooms[roomName].hostiles.power.defensive)
					return false;
				}				
			}

			if (checkTraversedRoomsForHostiles(this.room.name, this._memory.scorer) || 				
				(Memory.scoreCollector[roomName].avoid && Game.time < Memory.scoreCollector[roomName].avoid)
			) {
				log(roomName + " no scoring allowed, hostiles on path or avoided")				
				return false;
			}			

			let possibleDeposit = 0;
			if (Memory.scoreCollector[roomName] && Memory.scoreCollector[roomName].capacity) {
				possibleDeposit = Memory.scoreCollector[roomName].capacity;
			}

			if (possibleDeposit > 10000) { 
				this._memory.isScoring = roomName; 
				log(roomName + " allow scoring, large sink possible " + possibleDeposit + "/" + this.carryCapacity)
				return true;
			}


			let scoreres = _.filter(Game.creeps, 
						function(c) {return (c.memory[C.ROLE] === "scoreHauler" &&
											c.memory.isScoring === roomName )
											});


			if (scoreres.length < 0 && possibleDeposit > this.carryCapacity) { 
				this._memory.isScoring = roomName; 
				log(roomName + " allow scoring, no assinged scoreres and free cap above my carry" + possibleDeposit + "/" + this.carryCapacity)
				return true;
			}
			
			let dest;
			if (Memory.scoreCollector[roomName] && Memory.scoreCollector[roomName].pos) {
				dest = posLoad(Memory.scoreCollector[roomName].pos);
			}

			let eta = 0;
			if (dest) {
				let pathToDeposit = findTravelPath(this.pos, dest,
					{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:50000});
				if (!pathToDeposit.incomplete) {
					eta = pathToDeposit.path.length;
				}	
			}
			if (!eta) {
				eta = getRouteDistanceOnly(this._memory.scorer, this.room.name) * 35;
			}

			let estimatedRegenSink = SCORE_COLLECTOR_SINK * eta;
			let scoreOnTheWay = 0;
			if (scoreres.length > 0) {
				scoreOnTheWay = scoreres.length * (scoreres[0].body.length/2) * CARRY_CAPACITY;
			}
			
			if ((possibleDeposit + estimatedRegenSink - scoreOnTheWay) >= this.carryCapacity ){ 
				this._memory.isScoring = roomName; 
				log(roomName + " allow scoring, score on the way" + scoreOnTheWay + "/" + this.carryCapacity + " regen " + estimatedRegenSink + " my eta " + eta + " cap "+ possibleDeposit)
				return true;
			} else {
				log(roomName + " no scoring allowed, score on the way" + scoreOnTheWay + "/" + this.carryCapacity + " regen " + estimatedRegenSink + " my eta " + eta+ " cap "+ possibleDeposit)
			}
		}

		return this._memory.isScoring === roomName;
	}

	Creep.prototype.runSymbolHauler = function () {

		this.manageState();


		this._memory.lastRoom = this.room.name;
		if (this._memory[C.TRACK_DISTANCE]) {
			// One cycle completed, next score source?
			delete this._memory[C.TRACK_DISTANCE];
			log(this + " smh new target?")
			if (!findNextSymbol(this.room.name, this) ) {	
			//	this.recycleOrSuicide();
				return;
			}
		}

		if (this.defensiveRetreatPath({ keepRes: 1 }) ) {
			return;
		}

		if(this.sumCarry > 0) {
			// Symbol Decoder available?
			/*
			if (!SYMBOLS.includes(this._memory.scoreType)) {
				log(this.room.name + " im a symbolhauler carrying res " + this._memory.scoreType)
			}*/

			if (this.canScoreSymbol(this._memory.scorer, this._memory.scoreType) ) {
				this.scoreDeliver();
				this.say("score");
			} else {
				this.roleHauler(true);
				this.say("store");
			}
		}
		else {
			this.scoreStoreRetriver(this._memory.scoreType);			
		}
	}

	Creep.prototype.getResource = function(roomName, res, amount = 99) {
		// From store
		if (!this._memory[C.CLOSEST_TARGET]) {
			if (this.room.name !== roomName) {
				this.travelTo(Game.rooms[roomName].storage || Game.rooms[roomName].terminal, {range: 1 , ensurePath: true, preferHighway: true, ignoreRoads: true, offRoad: true});
				return;
			} 
			let carryCapacity = this.carryCapacity;
			let scoreStore = _.filter(this.room.findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
				function (structure) {
					return (structure.store[res] >= carryCapacity);
				});

			let closestByRange = this.pos.findClosestByRange(scoreStore);
			if (closestByRange) {
				this.assignTarget(closestByRange.id, 'scorer', res);
			} else {

			}
		}
		if (this._memory[C.CLOSEST_TARGET]) {
			amount = Math.min(amount, this.store.getCapacity(res));
			let value = this.withdrawAction(amount, avoidSKcreeps);
		}
	}

	Creep.prototype.checkReturnTrip = function() {
		
		if (this.store[RESOURCE_THORIUM]) { return false; }

		if (this.ticksToLive < this._memory.ticksToTargetThorium +  100) {
			this.recycleOrSuicide();
			return true;
		} 		
	}

	Creep.prototype.checkRoundTrip = function() {
		if (this._memory.checkRoundTrip) {
			delete this.room._cache.scoutNotHighway;



			if (this.ticksToLive < this._memory.ticksToTargetThorium + this._memory[C.TICKS_TO_TARGET] + 50) {
				this.suicide();
				return true;
			} else {
				delete this._memory.checkRoundTrip;
			}
		}
	}

	function reactorNeedsThoriumDelivered(roomName, spawner, thisCreepId) {
		let reactorData = Memory.reactors[roomName];

		let haulTicks = 250;
		if (reactorData.assignedRooms[spawner]) {
			haulTicks = reactorData.assignedRooms[spawner].ticksToTarget || reactorData.assignedRooms[spawner].dist * 35
		}
		let inTickTransfer = reactorData.transfer || 0;
		let missingThorium = 1000 - reactorData.storedThorium;		

		let deliveries = _.filter(Game.creeps, 
			function(c) {return (c.memory[C.ROLE] === "thoriumHauler" && c.memory[C.ROOM_TARGET] === roomName &&
								(c.store[RESOURCE_THORIUM] || c._withdrawOk === Game.time || c.memory.gettingThorium) )
								});
		
		let thoriumOnTheWay = inTickTransfer;
		for (let creepIdx in deliveries) {
			let creep = deliveries[creepIdx];
			if (creep.id === thisCreepId) { continue; }
			thoriumOnTheWay += creep.store[RESOURCE_THORIUM]
			if (creep._withdrawOk === Game.time && !creep.store[RESOURCE_THORIUM]) {
				thoriumOnTheWay += creep.store.getCapacity(RESOURCE_THORIUM);
			}
			if (creep.memory.gettingThorium && !creep.store[RESOURCE_THORIUM]) {
				thoriumOnTheWay += creep.memory.gettingThorium
			}
		}

	//	log("reactorNeedsThoriumDelivered " + (haulTicks + missingThorium - thoriumOnTheWay) + " thoriumOnTheWay " + thoriumOnTheWay + " reactor missing thorium " +missingThorium + " ticks to reach " +haulTicks)
		return haulTicks + missingThorium - thoriumOnTheWay;
	}

	Creep.prototype.runThoriumHauler = function () {
		this.manageState();


		if (this.sleep() ) { return; } 

		if (this.defensiveRetreatPath({ keepRes: 1 }) ) {
			return;
		}

		if (this.store[RESOURCE_THORIUM] === 0) {

			// check if i can make another roundtrip
			this.checkRoundTrip();

			if (this.checkReturnTrip() ) {
				return;
			}

			// if reactor needs more thorium
			let thoriumNeeded = 0;
			if (this.room.name === this._memory[C.ROOM_ORIGIN]) {
				if (this.room.store(RESOURCE_THORIUM) < 50) { this.suicide() }
				thoriumNeeded = reactorNeedsThoriumDelivered(this._memory[C.ROOM_TARGET], this._memory[C.ROOM_ORIGIN], this.id)
			//	log(this + " reactor in " + this._memory[C.ROOM_TARGET] + " needs thorium " + thoriumNeeded + " my room " + this.room.name)
			}

			if (thoriumNeeded > 200 && (!this._cache.lastThoriumNeeded || this._cache.lastThoriumNeeded > 200)){
			//	log(this + " getting thorium! " + thoriumNeeded)
				this._memory.gettingThorium = Math.min(250, thoriumNeeded);
				this.getResource(this._memory[C.ROOM_ORIGIN], RESOURCE_THORIUM, thoriumNeeded);
			} else {
				if (!this.returnHome()) {
					this.sleep(7)
				}
			}

			this._cache.lastThoriumNeeded = thoriumNeeded;
			
		} else {
			delete this.memory.gettingThorium;
			this.thoriumDeliver();
		}
	}

	Creep.prototype.thoriumDeliver = function () {
		let dest;
		let targetObj = Game.getObjectById(this._memory.reactorId);

		if (!this._memory.thoriumWithdrawTs) {
			this._memory.thoriumWithdrawTs = Game.time;
		}

		if (targetObj) {
			dest = targetObj.pos;
		} else {
			if (!this._memory.reactorPos) {
				this._memory.reactorPos = posSave(posDecompressXY(Memory.reactors[this._memory[C.ROOM_TARGET]].pos, this._memory[C.ROOM_TARGET]));
			}
			dest = posLoad(this._memory.reactorPos)
		}

		if (!this.pos.isNearTo(dest)) {
			this.travelTo(dest, {range: 1, ensurePath: true, ignoreRoads: true, roomCallback: avoidSKcreeps});
		} else {
			if (!targetObj) { 
				log(this + " missing target, Reactor missing? " + this.room.name);
				if (Memory.reactors[this.room.name]) {
					this._memory.reactorId = Memory.reactors[this.room.name].id;
				}

				return;
			}

			delete this.room._cache.scoutNotHighway;

			this.transfer(targetObj, RESOURCE_THORIUM);

			if (Memory.reactors[this.room.name].transfer === undefined) { Memory.reactors[this.room.name].transfer = 0;}
			Memory.reactors[this.room.name].transfer += Math.min(targetObj.store.getFreeCapacity(RESOURCE_THORIUM), this.store[RESOURCE_THORIUM])


			if (!this._memory[C.TRACK_DISTANCE]) {

				this._memory[C.TRACK_DISTANCE] = 1;
				this._memory.ticksToTargetThorium = CREEP_LIFE_TIME - this.ticksToLive;
				this._memory[C.TICKS_TO_TARGET] = Game.time - this._memory.thoriumWithdrawTs;

				if (Memory.reactors[this._memory[C.ROOM_TARGET]].assignedRooms && 
					Memory.reactors[this._memory[C.ROOM_TARGET]].assignedRooms[this._memory[C.ROOM_ORIGIN]]
				) {
					let roomData = Memory.reactors[this._memory[C.ROOM_TARGET]].assignedRooms[this._memory[C.ROOM_ORIGIN]];
					if (roomData.avgSamples === undefined) { roomData.avgSamples = 0}
					if (roomData.ticksToTarget === undefined) { roomData.ticksToTarget = 0}
					roomData.avgSamples++;
					roomData.avgSamples = limit(roomData.avgSamples, 1, 5);
					roomData.ticksToTarget = Math.ceil(rollingExpAvg(roomData.ticksToTarget, this._memory[C.TICKS_TO_TARGET], roomData.avgSamples));
				}
			}

			this._memory.checkRoundTrip = 1;
		}	
	}
		



	Creep.prototype.runScoreHauler = function () {

		this.manageState();
		

		this._memory.lastRoom = this.room.name;
		if (this._memory[C.TRACK_DISTANCE]) {
			// One cycle completed, next score source?
			delete this._memory[C.TRACK_DISTANCE];			 
			if (!this.findNextScore() ) {
				this.recycleOrSuicide();
				return;
			}
		}

		if (this.defensiveRetreatPath({ keepRes: 1 }) ) {
			return;
		}

		if(this.sumCarry > 0) {
			// Score Collector available?
			if (this.canScore(this._memory.scorer) ) {
				this.scoreDeliver()
				this.say("score")
			} else {
				this.roleHauler(true);
				this.say("store")
			}
		}
		else {
			this.scoreStoreRetriver(this._memory.scoreType);			
		}
	}

	global.estimatedRoomTravelLeft = function(ticksToLive) {
		return Math.floor(ticksToLive / 35);
	}

	function hasHigherDecoder(res, level){
		for (let room in Memory.scoreCollector){
			if (Memory.scoreCollector[room].type !== res || !Memory.scoreCollector[room].assignedSpawns) { continue; }

			if (!Memory.rooms[room].myRoom && (!Memory.rooms[room].player || !ALLIES[Memory.rooms[room].player])) { continue; }
			if (getRoomRCL(room) >= level) { return true; }
		}
	}

	function closestDecoderRangeForSymbol(res, level = CONTROLLER_MAX_LEVEL) {

		let closestDecoder = 255;
		for (let room in Memory.scoreCollector){
			if (!Memory.rooms[room]) { continue; }
			if (Memory.scoreCollector[room].type !== res || !Memory.scoreCollector[room].assignedSpawns) { continue; }
			if (!Memory.rooms[room].myRoom && (!Memory.rooms[room].player || !ALLIES[Memory.rooms[room].player])) { continue; }
			if (getRoomRCL(room) && getRoomRCL(room) < level) { continue; }

			for (let spawner in Memory.scoreCollector[room].assignedSpawns) {
				closestDecoder = Math.min(closestDecoder, Memory.scoreCollector[room].assignedSpawns[spawner].range)
			}
		}
		return closestDecoder;
	}

	global.knownDecoder = function(res) {
		for (let room in Memory.scoreCollector){
			if (Memory.scoreCollector[room].type === res && Memory.scoreCollector[room].assignedSpawns) { return true; } 
		}
	}

	global.getCollectors = function(type) {
		let list = {};
		for(let decoderRoom in Memory.scoreCollector) {
			if (Memory.scoreCollector[decoderRoom].type !== type) { continue; }
			list[decoderRoom] = {};
		}
		return list;
	}

	
	global.findNextSymbol = function(currentRoom, creep = undefined) {

		let bestTarget;
		let bestRoom;
		let bestStore;
		let bestDest;
		let bestScore = -999;
		
		let ticksToLive = 1500;
		if (creep) { ticksToLive = creep.ticksToLive}
		let estimatedRoomDistLeft = estimatedRoomTravelLeft(ticksToLive) // Math.floor(ticksToLive / 35 / 2);

		let myRoomType = getRoomStatus(currentRoom);

		let minAmount = 500;
		let maxStored = maxSymbolsStored();
		let bestScoreType;

		let fromPos;

		if (creep) {
			/*
			// CHECK LOCAL TOMBSTONES	
			let tombstones = creep.room.find(FIND_TOMBSTONES, {
				filter: (resource) => {
					return (resource.store[RESOURCE_SCORE] >= 200);
				}
			});

			for (let i=0; i < tombstones.length; i++ ) {
				log("possible tombstone! " + this.room.name, "green") 			
				let targetTombstone = tombstones[i];
				delete this._memory[C.TRACK_DISTANCE];
				this._memory[C.ROOM_TARGET] = this.room.name;
				this._memory.dest = targetTombstone.pos;
				this._memory.scoreId = targetTombstone.id;
				log("assigning tombstone resource! " + this.room.name, "green") 
				return true;			
			}
			
			// CHECK LOCAL DROPPED RESOURCES
			let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {
				filter: (resource) => {
					return (resource.amount >= 200 && resource.resourceType === RESOURCE_SCORE);
				}
			});			
			
			for (let i=0; i < dropped.length; i++ ) {
				log("possible dropped! " + this.room.name, "green") 			
				let targetTombstone = dropped[i];
				delete this._memory[C.TRACK_DISTANCE];
				this._memory[C.ROOM_TARGET] = this.room.name;
				this._memory.dest = targetTombstone.pos;
				this._memory.scoreId = targetTombstone.id;
				log("assigning dropped resource! " + this.room.name, "green") 
				return true;			
			}*/
		}


		// From Symbol Containers
		for(let room in Memory.score) {

		//	if (Memory.rooms[room] && Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.defensive) { continue; }
			if (Memory.rooms[room] && Memory.rooms[room].player && Memory.rooms[room].numberOfTowers && !ALLIES[Memory.rooms[room].player]) { continue; }
			if (getRoomLinearDistance(room, currentRoom) >= estimatedRoomDistLeft) { continue; }
			let actDist = getRouteDistanceOnly(room, currentRoom);
			if (actDist > estimatedRoomDistLeft || actDist > 10) { continue; }

			let outOfRange = false;
			for (let spawner in Memory.score[room].assignedRooms) {
				if (currentRoom !== spawner || (creep && spawner !== creep._memory[C.ROOM_ORIGIN])) {
					if (!Number.isInteger(Memory.score[room].assignedRooms[spawner].dist)) { continue; }
					if (actDist >= Memory.score[room].assignedRooms[spawner].dist + 4) {
						outOfRange = true;
						break;
					}
				}				
			}
			if (outOfRange) { continue; }


			if (myRoomType !== getRoomStatus(room)) { continue; }

			for (let scoreId in Memory.score[room].score) {
				let scoreData = Memory.score[room].score[scoreId];

				if ((scoreData.timeOut - Game.time) < ticksToLive ) { continue; }
				if (scoreData.amount < minAmount) { continue; }

				if (scoreData.avoid) { 
					if (Game.time < scoreData.avoid) {
						continue; 
					} else {
						delete scoreData.avoid;
					}
				}

				let currentStored = Memory.Minerals[scoreData.type] || 0;

				let wantedScore = knownDecoder(scoreData.type);
				let addStored = 0;
				if (wantedScore) { addStored = 15000; }

				if (currentStored > (maxStored + wantedScore)) { continue; }


				if (roomIsHW(room) ) {
				//	if (!roomsInSameSectorV2(room, currentRoom)) { continue; }
					
					if (!fromPos) {
						if (creep) {
							fromPos = creep.pos;
						} else {
							fromPos = Game.rooms[currentRoom].controller.pos;
						}
					}

					let symbolPos = posLoad(scoreData.pos);

					if (!posInSameSector(symbolPos, fromPos) ){ continue; }
					if (!reachablePosHWWall(symbolPos, fromPos) ){ continue; }
				} 

				let haulerCapAssigned = 0;
				for (let id in Memory.score[room].score[scoreId].assignedHaulers) {
					let hauler = Game.getObjectById(id)
					if (!hauler || hauler.memory.scoreId !== scoreId) { 
						delete Memory.score[room].score[scoreId].assignedHaulers[id];
						continue;
					}
					haulerCapAssigned += hauler.carryCapacity;
				}

				if ((scoreData.amount - haulerCapAssigned) < minAmount) { continue; }

				let score = -actDist;
				score += 2 // prefer containers
				score += 1 - (scoreData.timeOut / 4500)

				if (wantedScore) { score += 3;}

				// Score higher based on current amount in scored Game.score

				if (score > bestScore) {
					bestScore = score;
					bestTarget = scoreId
					bestRoom = room;
					bestDest = scoreData.pos;
					bestScoreType = scoreData.type;
					if (scoreData.assignedRooms) {
						bestStore = Object.keys(scoreData.assignedRooms)[0];
					}				
					
				}
			}
		}

		// From Store
		let bestDecoder;
		if (!creep) {
			minAmount = 15000;
		} else {
			minAmount = creep.carryCapacity;
		}
		
		if (!bestTarget) {

			for(let decoderRoom in Memory.scoreCollector) {				

				let type = Memory.scoreCollector[decoderRoom].type;
				if (!Memory.Minerals[type] || Memory.Minerals[type] < minAmount) { continue; }
				if (!Memory.scoreCollector[decoderRoom].assignedSpawns) { continue; }
				if (!Memory.rooms[decoderRoom] || !getRoomRCL(decoderRoom) || getRoomRCL(decoderRoom) < 7) { continue; }
				if (getRoomRCL(decoderRoom) <= 7 && (Memory.Minerals[type] < (maxStored * 1.25) || hasHigherDecoder(type, 8)) ) { continue; }
				if (!Memory.rooms[decoderRoom].myRoom && (!Memory.rooms[decoderRoom].player || !ALLIES[Memory.rooms[decoderRoom].player])) { continue; }

				if (Memory.scoreCollector[decoderRoom].avoid) { 
					if (Game.time < Memory.scoreCollector[decoderRoom].avoid) {
						continue; 
					} else {
						delete Memory.scoreCollector[decoderRoom].avoid;
					}
				}

				for(let storeRoom in Memory.scoreCollector[decoderRoom].assignedSpawns) {
					
					if (getRoomLinearDistance(currentRoom, storeRoom) > estimatedRoomDistLeft) { continue; }
					let rangeToSymbol = getRouteDistanceOnly(storeRoom, currentRoom);
					if (rangeToSymbol > estimatedRoomDistLeft) { continue; }

					if ((getRoomLinearDistance(decoderRoom, storeRoom) + rangeToSymbol)  > estimatedRoomDistLeft) { continue; }
					let rangeStoreToDecoder = getRouteDistanceOnly(decoderRoom, storeRoom)
					let totalRange = Math.max(1, rangeToSymbol + rangeStoreToDecoder);
					if (totalRange > estimatedRoomDistLeft || totalRange > 10) { continue; }

					if (storeRoom !== decoderRoom && checkTraversedRoomsForHostiles(storeRoom, decoderRoom) ) { continue; }
					

					let scoreStore = _.filter(Game.rooms[storeRoom].findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
						function (structure) {
							return (structure.store[type] > minAmount);
						});
					if (scoreStore.length > 0) {

						let haulerCapAssigned = 0;
						let imAssignedHere = false;
						let myId = 'noId'
						if (creep) {
							myId = creep.id;
						}

						for (let id in Memory.scoreCollector[decoderRoom].assignedHaulers) {
							if (id === myId) {
								imAssignedHere = true;
								break;
							}
							let hauler = Game.getObjectById(id)
							if (!hauler || hauler.memory.scorer !== decoderRoom) { 
								delete Memory.scoreCollector[decoderRoom].assignedHaulers[id];
								continue;
							}
							haulerCapAssigned += hauler.carryCapacity * (estimatedRoomTravelLeft(hauler.ticksToLive) / rangeStoreToDecoder);
						//	log(decoderRoom+ " assigned hauler cap " + haulerCapAssigned + " current hauler ticks left " + hauler.ticksToLive)
						}

					//	log(decoderRoom + " assigned hauler cap " + haulerCapAssigned + "/" + Game.rooms[storeRoom].store(type) + " " + type)
						if (!imAssignedHere && Game.rooms[storeRoom].store(type) < haulerCapAssigned) { continue; }


						let score = -totalRange;
						score += CONTROLLER_LEVEL_SCORE_MULTIPLIERS[getRoomRCL(decoderRoom)];				

						if (score > bestScore) {
							bestTarget = undefined;	// remove target

							bestScore = score;
							bestRoom = storeRoom;
							bestDecoder = decoderRoom;
							
					// bestDest = Memory.score[room].score[scoreId].pos;
							bestScoreType = type;
							log("want to score! " + type + " store in "+  storeRoom + " decoder room " + bestDecoder)
						}
					}
				}
			}
		}

		// Grab some minerals?
		/*
		if (!bestRoom && creep) {

			if (Memory.Minerals.Buy && creep.room.controller && !creep.room.controller.my && creep.room.controller.owner && MINERAL_SHARERERS[creep.room.controller.owner.username]) {

				log(creep.room.name + " is in allied store room! " + creep.room.controller.owner.username, "green")
				let neededMinerals = Object.keys(Memory.Minerals.Buy)

				log(creep.room.name + " needed minerals " + neededMinerals.length + " index 0 " + neededMinerals[0] , "green")
				if (neededMinerals.length > 0) {

					
					let roomsInRange = getMyClosestRooms(creep.room.name, 6, 0, 8);
					let keysRooms = Object.keys(roomsInRange);

					log(creep.room.name + " my rooms in range " + keysRooms.length, "green")

					if (keysRooms.length > 0 && roomsInRange[keysRooms[0]].dist < estimatedRoomDistLeft ) {

						
						log(creep.room.name + " my rooms in range " + keysRooms.length + " dist " + roomsInRange[keysRooms[0]].dist + "/" + estimatedRoomDistLeft , "green")
						let stores = _.filter(creep.room.findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
							function (structure) {
								return ((!structure.pos.lookForStructure(STRUCTURE_RAMPART) || structure.pos.lookForStructure(STRUCTURE_RAMPART).isPublic)								
								);
							});


						let reachableStores = [];
						for (let idx in stores) {
							let pathToBank = findTravelPath(creep.pos, stores[idx].pos,
								{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:5000, maxRooms: 1});
							if (!pathToBank.incomplete) {
								reachableStores.push(stores[idx]);
							} 

							log(creep.room.name + " checked for store " + stores[idx] + " reachable " + !pathToBank.incomplete, "green")
						}


						if (reachableStores.length > 0 ) {
							for (let res in Memory.Minerals.Buy) {
								for (let idx in reachableStores) {
									let store = reachableStores[idx]
									if (store.store[res] && store.store[res] >= creep.carryCapacity) {

										bestRoom = creep.room.name;
										bestScoreType = res;

										let username = creep.room.controller.owner.username
										log("assigning RES " + res + " in room " + creep.room.name + " owned by " + username)

										if (Memory.mineralWithdraw === undefined) { Memory.mineralWithdraw = {}; }
										if (Memory.mineralWithdraw[username] === undefined) { Memory.mineralWithdraw[username] = {}; }
										if (Memory.mineralWithdraw[username][res] === undefined) { 
											Memory.mineralWithdraw[username][res] = {};
											Memory.mineralWithdraw[username][res].amount = 0;
										}
										Memory.mineralWithdraw[username][res].amount += creep.carryCapacity;
										Memory.mineralWithdraw[username][res].lastRoom = creep.room.name;
										Memory.mineralWithdraw[username][res].lastTs = Game.time

										break;
									}
								}
								if (bestRoom) { break; }
							}		
						}
					}
				}
			}

		}*/



		if (bestRoom) {
			
			if (creep) {
				// Clean previous targets
				delete creep._memory[C.TRACK_DISTANCE];
				delete creep._memory.attemptedReasign;
				delete creep._memory.isScoring;
				delete creep._memory.scorer;
				delete creep._memory.scorerDest;
				delete creep._memory.scoreId;
				delete creep._memory.collectorId; // delete me?

				creep._memory[C.ROOM_TARGET] = bestRoom;
				creep._memory.scoreType = bestScoreType;				

				// Container
				if (bestTarget) {
					creep._memory.scorerDest = bestDest;
					creep._memory.scoreId = bestTarget;
					if (bestStore) {
						creep._memory[C.ROOM_TARGET] = bestStore;
					}
					
					if (Memory.score[bestRoom].score[bestTarget].assignedHaulers === undefined) { Memory.score[bestRoom].score[bestTarget].assignedHaulers = {} }
					Memory.score[bestRoom].score[bestTarget].assignedHaulers[creep.id] = {};					
				} else {
				// From store	
										

					if (bestDecoder) {
						creep._memory.scorer = bestDecoder;
						creep._memory.collectorId = Memory.scoreCollector[bestDecoder].id;
						if (Memory.scoreCollector[bestDecoder].assignedHaulers === undefined) { Memory.scoreCollector[bestDecoder].assignedHaulers = {} }
						Memory.scoreCollector[bestDecoder].assignedHaulers[creep.id] = {};
					}
					
				}
				
				log(creep + " reassigned score scooper! " + bestRoom + " type " + bestScoreType);
				
			}

			return {room: bestRoom, target: bestTarget, type: bestScoreType, decoder: bestDecoder, dest: bestDest};
		}

		return;

	} 


	Creep.prototype.findNextScore = function() {
		let bestTarget
		let bestRoom;
		let bestScore = -999;
		let estimatedRoomDistLeft = Math.floor(this.ticksToLive / 35 / 2);

		log("estimated room distance possible " + estimatedRoomDistLeft + " ticks to live " + this.ticksToLive)

		
		
		// CHECK LOCAL TOMBSTONES	
		let tombstones = this.room.find(FIND_TOMBSTONES, {
			filter: (resource) => {
				return (resource.store[RESOURCE_SCORE] >= 200);
			}
		});

		for (let i=0; i < tombstones.length; i++ ) {
			log("possible tombstone! " + this.room.name, "green") 			
			let targetTombstone = tombstones[i];
			delete this._memory[C.TRACK_DISTANCE];
			this._memory[C.ROOM_TARGET] = this.room.name;
			this._memory.dest = targetTombstone.pos;
			this._memory.scoreId = targetTombstone.id;
			log("assigning tombstone resource! " + this.room.name, "green") 
			return true;			
		}
		
		// CHECK LOCAL DROPPED RESOURCES
		let dropped = this.room.find(FIND_DROPPED_RESOURCES, {
			filter: (resource) => {
				return (resource.amount >= 200 && resource.resourceType === RESOURCE_SCORE);
			}
		});			
		
		for (let i=0; i < dropped.length; i++ ) {
			log("possible dropped! " + this.room.name, "green") 			
			let targetTombstone = dropped[i];
			delete this._memory[C.TRACK_DISTANCE];
			this._memory[C.ROOM_TARGET] = this.room.name;
			this._memory.dest = targetTombstone.pos;
			this._memory.scoreId = targetTombstone.id;
			log("assigning dropped resource! " + this.room.name, "green") 
			return true;			
		}


		let myRoomType = getRoomStatus(this.room.name);

		// From Score Containers
		for(let room in Memory.score) {



			if (Memory.rooms[room] && Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.defensive) { continue; }	
			if (Memory.rooms[room] && Memory.rooms[room].player && Memory.rooms[room].numberOfTowers) { continue; }	
			if (getRoomLinearDistance(room, this.room.name) >= estimatedRoomDistLeft) { continue; }	
			let actDist = getRouteDistanceOnly(room, this.room.name);
			if (actDist > estimatedRoomDistLeft || actDist > 10) { continue; }

			if (myRoomType !== getRoomStatus(room)) { continue; }

		//	if (roomIsHW(room) && (getSector(room) === "W3S1" || getSector(room) === "W3S2")) { continue; }

			for (let scoreId in Memory.score[room].score) {
				let scoreData = Memory.score[room].score[scoreId];

				if ((scoreData.timeOut - Game.time) < this.ticksToLive ) { continue; }

				if (scoreData.amount < this.carryCapacity) { continue; }

				let haulerCapAssigned = 0;
				for (let id in Memory.score[room].score[scoreId].assignedHaulers) {
					let hauler = Game.getObjectById(id)
					if (!hauler || hauler.memory.scoreId !== scoreId) { 
						delete Memory.score[room].score[scoreId].assignedHaulers[id];
						continue;
					}
					haulerCapAssigned += hauler.carryCapacity;
				}

				if ((scoreData.amount - haulerCapAssigned) < (this.carryCapacity / 2)) { continue; }

				let score = -actDist;
				score += 2 // prefer containers
				score += 1 - (scoreData.timeOut / 4500)

				if (score > bestScore) {
					bestScore = score;
					bestTarget = scoreId
					bestRoom = room;
				}
			}
		}

		// If can score
		if (this._memory.scorer ) {

			if (this.canScore(this._memory.scorer) ) {

				if ((getRoomLinearDistance(this._memory[C.ROOM_ORIGIN], this.room.name) < estimatedRoomDistLeft) && 
					(!Memory.rooms[this._memory.scorer] || (!Memory.rooms[this._memory.scorer].hostiles || !Memory.rooms[this._memory.scorer].hostiles.power.defensive) ) &&
					!checkTraversedRoomsForHostiles(this._memory[C.ROOM_ORIGIN], this._memory.scorer))
				{				
					
					let actDist = getRouteDistanceOnly(this._memory[C.ROOM_ORIGIN], this.room.name);
					if (actDist <= estimatedRoomDistLeft) {  
							
						
						let scoreStore = _.filter(Game.rooms[this._memory[C.ROOM_ORIGIN]].findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
							function (structure) {
								return (structure.store[RESOURCE_SCORE] > 5000);
							});
						if (scoreStore.length > 0) {
			
							let score = -actDist;
			
							if (score > bestScore) {
								bestTarget = undefined;	// remove target

								bestScore = score;
							//	bestDest = 
								bestRoom = this._memory.scorer;	//?? origin?
							}
						}
					}
				}
			} 
			
			delete this._memory.isScoring; // Clean canScore check
		}

		if (bestRoom) {
			delete this._memory[C.TRACK_DISTANCE];
			this._memory[C.ROOM_TARGET] = bestRoom;
			
			if (bestTarget) {
				this._memory.dest = Memory.score[bestRoom].score[bestTarget].pos;	
				this._memory.scoreId = bestTarget;
				if (Memory.score[bestRoom].score[bestTarget].assignedHaulers === undefined) { Memory.score[bestRoom].score[bestTarget].assignedHaulers = {} }
				Memory.score[bestRoom].score[bestTarget].assignedHaulers[this.id] = {};
			} else {
				delete this._memory.dest;
				delete this._memory.scoreId;
			}

			this._memory.scoreType = RESOURCE_SCORE;
			
			delete this._memory.attemptedReasign;
			log("reassigned score scooper! " + bestRoom)
			return true;
		}

		return false;
	}

	Creep.prototype.scoreStoreRetriver = function (res) {
		this.say("!")
		if (!this._memory[C.CLOSEST_TARGET]) {
			if (this._memory.scoreId) {

				// From ScoreConatiner or TombStone
				let dest;
				let targetObj = Game.getObjectById(this._memory.scoreId);

				if (targetObj) {
					dest = targetObj.pos;
				} else if (!Game.rooms[this._memory.scorerDest.roomName]) {
					dest = posLoad(this._memory.scorerDest)
				}

				if (dest && !this.pos.isNearTo(dest)) {
					let travelInfo = {};
					this.travelTo(dest, {range: 1 , returnData: travelInfo, ensurePath: true, preferHighway: true, ignoreRoads: true, offRoad: true, maxOps: 60000, roomCallback: avoidSKcreeps});
					if (travelInfo.pathfinderReturn && travelInfo.pathfinderReturn.incomplete && this.room.name === this._memory.scorerDest.roomName) {
						log(this+ " cant reach " + this._memory.scoreId + " in " + dest )

						if (Memory.score[dest.roomName] && Memory.score[dest.roomName].score[this._memory.scoreId]) {
							Memory.score[dest.roomName].score[this._memory.scoreId].avoid = Game.time + 5500;
						}

						if (SEASONAL_SYMBOLS) {
							if (!this._memory.attemptedReasign && !findNextSymbol(this.room.name, this) ) {
								this._memory.attemptedReasign = 1;
								this.recycleOrSuicide();
							}
						}
					}
				} else {
					if (!targetObj || 
						(targetObj.isResource && targetObj.amount <= 0 ||
						!targetObj.isResource && !targetObj.store[res])) {	// no .store for dropped resources 
						log(this + " missing " + res + " target, reassign hauler? " + this.room.name);

						if (SEASONAL_SCORE) {
							if (!this._memory.attemptedReasign && !this.findNextScore() ) {
								this._memory.attemptedReasign = 1;
								this.recycleOrSuicide();
							}
						} else if (SEASONAL_SYMBOLS) {
							if (!this._memory.attemptedReasign && !findNextSymbol(this.room.name, this) ) {
								this._memory.attemptedReasign = 1;
								this.recycleOrSuicide();
							}
						}

						return;
					}


					if (targetObj.resourceType && !targetObj.isScoreContainer) {
						this.pickup(targetObj);
					} else {
						this.withdraw(targetObj, res);
					}
					
					if (Memory.score[this.room.name]) {
						Memory.score[this.room.name].ts = Game.time;
					}

				}
			} else {

				// From store
				if (this.room.name !== this._memory[C.ROOM_TARGET]) {	
					this.travelTo(Game.rooms[this._memory[C.ROOM_TARGET]].storage, {range: 1 , ensurePath: true, preferHighway: true, ignoreRoads: true, offRoad: true});
					return;
				} 
				let carryCapacity = this.carryCapacity;
				let scoreStore = _.filter(this.room.findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
					function (structure) {
						return (structure.store[res] > carryCapacity);
					});

				let closestByRange = this.pos.findClosestByRange(scoreStore);
				if (closestByRange) {
					this.assignTarget(closestByRange.id, 'scorer', res);
				} else {

					if (SEASONAL_SYMBOLS) {
						if (!this._memory.attemptedReasign && !findNextSymbol(this.room.name, this) ) {
							this._memory.attemptedReasign = 1;
							this.recycleOrSuicide();
						}
					}
				}
			}			
		}

		if (this._memory[C.CLOSEST_TARGET]) {		
			let value = this.withdrawAction();
		}
		
	}


/*
	Creep.prototype.scoreScooper= function () {

		let dest;
		let targetObj = Game.getObjectById(this._memory.scoreId);

		if (targetObj) {
			dest = targetObj.pos;
		} else {
			dest = posLoad(this._memory.dest)
		}

		if (!this.pos.isNearTo(dest)) {
			this.travelTo(dest, {range: 1 , ensurePath: true, preferHighway: true, ignoreRoads: true});
		} else {
			if (!targetObj) { 
				log(this + " missing target, reassign hauler? " + this.room.name);
				if (!this._memory.attemptedReasign && !this.findNextScore() ) {
					this._memory.attemptedReasign = 1;
				}
				return;
			}
			this.withdraw(targetObj, RESOURCE_SCORE);
			if (Memory.score[this.room.name]) {
				Memory.score[this.room.name].ts = Game.time;
			}			
		}
	}*/

	Creep.prototype.scoreDeliver = function () {
		let dest;
		let targetObj = Game.getObjectById(this._memory.collectorId);

		if (targetObj) {
			dest = targetObj.pos;
		} else {
			if (!this._memory.scorerDest) {
				this._memory.scorerDest = Memory.scoreCollector[this._memory.scorer].pos;
			}
			dest = posLoad(this._memory.scorerDest)
		}

		if (!this.pos.isNearTo(dest)) {
			this.travelTo(dest, {range: 1 , ensurePath: true, preferHighway: true, ignoreRoads: true});
		} else {
			if (!targetObj) { 
				log(this + " missing target, score Collector missing? " + this.room.name);
				if (Memory.scoreCollector[this.room.name]) {
					this._memory.collectorId = Memory.scoreCollector[this.room.name].id;
				}

				return;
			}			

			this.transfer(targetObj, this._memory.scoreType);
			this._memory[C.TRACK_DISTANCE] = 1;
			
			this.say("KA-CHING!", true)

			delete this._memory.isScoring;

			if (this._memory.hasScored === undefined) { this._memory.hasScored = 0; }
			this._memory.hasScored += this.store[this._memory.scoreType] || 0;

			if (Memory.scoreDelivered === undefined) { Memory.scoreDelivered = 0; }
			Memory.scoreDelivered += this.store[this._memory.scoreType] || 0;			

			if (Memory.scoreCollector[this.room.name]) {
				Memory.scoreCollector[this.room.name].ts = Game.time;
			}
		}	
	}



	Creep.prototype.doEngine = function(){
		// tow creep
		if (!this._memory.wagonId) {

			if (!this._cache.searchTs || Game.time > this._cache.searchTs) {
				this._cache.searchTs = Game.time + 2;
				
				let wagons = this.room.find(FIND_MY_CREEPS, {filter: function (object) {
						return (object.memory[C.WAGON_WEIGHT] !== undefined && (object.memory[C.TICKS_TO_TARGET] === undefined || object.memory[C.ROLE] === 'recycle'));
					}
				});

				let enginePower = this.body.length;
				for (let idx in wagons) {
					let wagon = wagons[idx]
					if (wagon.memory.engine && Game.getObjectById(wagon.memory.engine)) { continue; }
					if (wagon.memory[C.WAGON_WEIGHT] > enginePower && wagon.ticksToLive > 1350) { continue; }
					this._memory.wagonId = wagons[0].id;
					break;
				}
			}

			if (this.ticksToLive < 45) {
				this.recycleOrSuicide();
				return;
			}
			
			if (!this._memory.wagonId) {

				let homeRoom = Game.rooms[this._memory[C.ROOM_ORIGIN]]
				let spawn = homeRoom.findByType(STRUCTURE_SPAWN)[0];
				if (this.room.name !== this._memory[C.ROOM_ORIGIN] || this.pos.getRangeTo(spawn) > 4) {
					this.travelTo(spawn, { range: 1, offRoad: 1 });
				} else {
					this.yieldRoad(spawn);
				}
			}

			
		}

		let wagon = Game.getObjectById(this._memory.wagonId);
		if (!wagon && this._memory.wagonId) {

			delete this._memory.wagonId;
			if (this._memory.wagonDead) {

				this.recycleOrSuicide();
				return;
			}

			this._memory.wagonDead = 1;
			return;
		}

		if (wagon) {
			wagon._memory.engine = this.id;
		}				
	}

	Creep.prototype.engine = function(wagon, dest) {
		if (this.fatigue || !wagon || !dest) { return; }

		this._memory.wagonDestRoom = dest.roomName;
		
		let returnData = {}

		if (!this._memory.engineStarted) {
			if (this.pos.getRangeTo(wagon) > 1) {

				if (wagon.pos.rangeToExit() === 0 && this.pos.rangeToExit() === 0) {
					this.move(Math.ceil(Math.random()*8))
					this.say("rnd")
					return;
				}


				let avoidCreeps = false;
				if (this.pos.getRangeTo(wagon) <= 3) {
					avoidCreeps = (Math.random() > 0.55);
				}
								
				this.travelTo(wagon, { range: 1, avoidCreeps: avoidCreeps, preferHighway: true, returnData: returnData, roomCallback: avoidWagon });
				if (returnData.nextPos && returnData.nextPos.isThisPos(wagon.pos)){
					this.pull(wagon);
					wagon.move(this);
					this.say("strt")
				}
				return;
			} else {
				this._memory.engineStarted = 1;
			}
		}

		if (this._memory.engineStarted) {
			/*
			tick 0: Tug is at (1,10), wagon is at (2,10). tug.pull(wagon); tug.move(LEFT); wagon.move(tug)
			tick 1: Tug is at (49,10), wagon is at (1,10). no intents

			tick 2: Tug is at (0,10), wagon is at (1,10). tug.pull(wagon); tug.move(wagon); wagon.move(tug)
			tick 3: Tug is at (1,10), wagon is at (49,10) tug.move(LEFT)
			tick 4: Tug is at (49,10), wagon is at (0,10) tug.move(LEFT)
			tick 5: Tug is at (48,10), wagon is at (49,10) tug.pull(wagon); tug.move(LEFT); wagon.move(tug)
			*/
			// Cross room edge
			if (this._memory.edgeSwap === 2) {
				if ((this.pos.rangeToExit() !== 0 && wagon.pos.rangeToExit() !== 1) || wagon.room.name !== this.room.name) {
					delete this._memory.edgeSwap;
					delete this._memory.engineStarted;
					this.move(Math.ceil(Math.random()*8))
					log("errror edge stage 1")
					return;
				}
				this.move(this.pos.getDirectionTo(wagon.pos));
				this.pull(wagon);
			//	this._memory.edgeDir = this._cache._trav.path[0] || wagon.pos.getDirectionTo(this.pos)
			//	if (this._memory.edgeDir === undefined) {
					this._memory.edgeDir = wagon.pos.getDirectionTo(this.pos)
			//	}				
				wagon.move(this);
				this._memory.edgeSwap = 3;
				this.say("Cross2")
			} else if (this._memory.edgeSwap === 3) {
				if ((this.pos.rangeToExit() !== 1 && wagon.pos.rangeToExit() !== 1) ||  wagon.room.name === this.room.name) {
					delete this._memory.edgeSwap;
					delete this._memory.engineStarted;
					log("errror edge stage 2")
					return;
				}

				this.move(this._memory.edgeDir);
				this._memory.edgeSwap = 4;
				this.say("Cross3")
			} else if (this._memory.edgeSwap === 4) {
				if ((this.pos.rangeToExit() !== 1 && wagon.pos.rangeToExit() !== 0) || wagon.room.name === this.room.name) {
					delete this._memory.edgeSwap;
					delete this._memory.engineStarted;
					log("errror edge stage 3")
					return;
				}
				this.move(this._memory.edgeDir);
				this._memory.edgeSwap = 5;
				this.say("Cross4")
			} else if (this._memory.edgeSwap === 5) {
			//	if (this.pos.rangeToExit() )
				if(this._cache._trav) {
					delete this._cache._trav.path;
				}				
				this.travelTo(dest, { range: 0, preferHighway: true, returnData: returnData, roomCallback: avoidSKcreeps, moveAsOne: wagon, ignoreRoads: true });
				this.pull(wagon);
				wagon.move(this);
				delete this._memory.edgeSwap;
				delete this._memory.edgeDir;
				this.say("Cross5")
			//	
			} else if (this.room.name !== wagon.room.name) {
				if (wagon.pos.isNearExit(1)) {
					// do nothing
					this._memory.edgeSwap = 2;
					
				//	this._memory.edgeDir = this._cache._trav.path[0]
					this.say("Cross1")
				}

			// Last move
			} else if (this.pos.getRangeTo(dest) === 0) {
				
				this.move(this.pos.getDirectionTo(wagon.pos));
				this.pull(wagon);
				wagon.move(this);
				this.say("last")
			// Lost Wagon	
			} else if (this.pos.getRangeTo(wagon) > 1) {		
					
				this.travelTo(wagon, { range: 1, preferHighway: true, returnData: returnData, roomCallback: avoidWagon, ignoreRoads: true });
				if (returnData.nextPos && returnData.nextPos.isThisPos(wagon.pos)){
					this.pull(wagon);
					wagon.move(this);
					this.say("lost")
				}
			// Normal Movement
			} else {

				this.travelTo(dest, { range: 0, preferHighway: true, returnData: returnData, roomCallback: avoidSKcreeps, moveAsOne: wagon, ignoreRoads: true, maxOps: 50000 });				
				this.pull(wagon);
				wagon.move(this);
				this.say("nrml")
			}
		}
			

		return;
	}

	// COST MATRIX - AVOID WAGONS
	global.avoidWagon = (roomName, matrix) => {
		if (!matrix) { matrix = new PathFinder.CostMatrix(); }
		
		if (Game.rooms[roomName]) {			
			let wagons = Game.rooms[roomName].find(FIND_MY_CREEPS, {
				filter: function (object) {
					return (object.memory[C.WAGON_WEIGHT]);
				}
			});

			for (let wagon of wagons) {

				matrix.set(wagon.pos.x, wagon.pos.y, 15);
			}
		}

		matrix = avoidSKcreeps(roomName, matrix)



		/*
		for (let y = 0; y < 50; ++y) {
			for (let x = 0; x < 50; ++x) {
				let terrain = getRoomTerrainAt(x, y, roomName);
				if (terrain === TERRAIN_MASK_WALL) { continue; }

				*/




		return matrix;
	}

	Creep.prototype.setPowerBankHaulerTarget = function (role) {
		let powerRuins = this.room.find(FIND_RUINS, {
			filter: (ruin) => {
				return (ruin.structure.structureType === STRUCTURE_POWER_BANK &&
						ruin.store[RESOURCE_POWER]
					);
			}
		});

		if (powerRuins.length > 0) {
			this.assignTarget(powerRuins[0].id, role, RESOURCE_POWER);
		} else {
			let droppedPower = this.room.find(FIND_DROPPED_RESOURCES, {
				filter: (resource) => {
					return (resource.resourceType === RESOURCE_POWER);
				}
			});
			//	console.log("power: " + droppedPower.length + JSON.stringify(droppedPower))
			if (droppedPower.length > 0) {
				this.assignTarget(droppedPower[0].id, role, RESOURCE_POWER);
			}
		}
	}

	Creep.prototype.PowerBankHauler = function () {
		let role = "PowerBankHauler";
		// CHECK IF OTHER ROLE ACTIVE	
		if (!this.checkRole(role)) { return 0; }

		if (!this._memory[C.CLOSEST_TARGET]) {
			let target = Game.getObjectById(this._memory.bankId);			

			if (this.room.name !== this._memory[C.ROOM_TARGET] || target) {

				let range = 4;
				if (!target) {
					if (Memory.rooms[this._memory[C.ROOM_TARGET]] && Memory.rooms[this._memory[C.ROOM_TARGET]].powerBank) {
						target = Memory.rooms[this._memory[C.ROOM_TARGET]].powerBank.pos;					
					} else {
						target = {x: 25, y: 25, roomName: this._memory[C.ROOM_TARGET]}; 
					}
				}

				let travelTicks = this._memory[C.TICKS_TO_TARGET] || 50;
				if (Memory.powerBanks[this._memory[C.ROOM_TARGET]] && Memory.powerBanks[this._memory[C.ROOM_TARGET]].ticksToTarget) {
					travelTicks = Memory.powerBanks[this._memory[C.ROOM_TARGET]].ticksToTarget
				}				
				
				if (target && target.hits < 20000) {
					range = 2;
					if (!this.pos.inRangeTo(target, range)) {						
						this.travelTo(target, { range: range, preferHighway: true, ignoreRoads: true });
					}
				} else if (!this.pos.inRangeTo(target, range)) {
					if (this._memory[C.TICKS_TO_TARGET] === undefined) { this._memory[C.TICKS_TO_TARGET] = 0; }
					this._memory[C.TICKS_TO_TARGET] += 1;
					this.travelTo(target, {range: range , ensurePath: true, preferHighway: true, ignoreRoads: true});
				} else if (this.pos.inRangeTo(target, range) && this.ticksToLive < travelTicks )  {
					this.recycleOrSuicide();
					return;
				}

			} else {
				if (!target) { // ASSUME BANK IS DESTROYED
					
					this.setPowerBankHaulerTarget(role);
				}
			}
		}

		if (this._memory[C.CLOSEST_TARGET]) { // MOVE TO TARGET	
			let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);

			if (!targetObj) {
				this.clearTarget();

				this.setPowerBankHaulerTarget(role); // ruins decayed?
				targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
				if (!targetObj) {
					return;
				}
				
			}

			let value = ERR_NOT_IN_RANGE;
			if (targetObj.isResource) {
				value = this.pickup(targetObj);
			} else {
				value = this.withdraw(targetObj, RESOURCE_POWER);
			}			

			if (value == ERR_NOT_IN_RANGE) {
				this.travelTo(targetObj, { maxRooms: 1, range: 1, ignoreRoads: true });
			} else if (value == OK) {
				this.clearTarget();
				this.roleHauler(true);
			} else {
				this.clearTarget();
			}
			return 1;
		}
		return 0;
	};

	Creep.prototype.refreshTTL = function() {

		if (this._memory.reqTTL === undefined) {
			this._memory.reqTTL = CREEP_LIFE_TIME - Math.floor(600/this.body.length);	
		}

		
		if (this.ticksToLive < this._memory.reqTTL) {
			this.say("rfrsh " + this.ticksToLive)
			this._memory.refresh = 1
			let idleSpawns = _.filter(this.room.findByType(STRUCTURE_SPAWN), (c) => !c.spawning );	
			if (idleSpawns.length > 0) {
				this.travelTo(idleSpawns[0], {ignoreCreeps: true})
				idleSpawns[0].renewCreep(this)
			}
			return 1;
		}
	}

	Creep.prototype.lookForAdjacentCreeps = function(dist=1) {		
	
			let returnValue = [];
			let top = limit(this.pos.y-dist, 0, 49);
			let left = limit(this.pos.x-dist, 0, 49);
			let bot = limit(this.pos.y+dist, 0, 49);
			let right = limit(this.pos.x+dist, 0, 49);
		
			let creeps = this.room.lookForAtArea(LOOK_CREEPS, top,left,bot,right, true);
			let i = creeps.length;
			
			while (i--) {
				if (creeps[i].creep.id !== this.id && !creeps[i].creep.spawning) {
					returnValue.push(creeps[i].creep);
				}
			}
		//	console.log(returnValue.length)
			return returnValue;
		};

	Creep.prototype.idleOffRoad = function (anchor, maintainDistance = false) {
		let offRoad = this.pos.lookForStructure(STRUCTURE_ROAD) === undefined;
		if (offRoad) return OK;

		if (this.lookForAdjacentCreeps().length === 0 ) { return OK; }

		let positions = _.sortBy(this.pos.openAdjacentSpots(false), (p) => p.getRangeTo(anchor));
		if (maintainDistance) {
			let currentRange = this.pos.getRangeTo(anchor);
			positions = _.filter(positions, (p) => p.getRangeTo(anchor) <= currentRange);
		}

		let swampPosition;
		for (let position of positions) {
			if (position.lookForStructure(STRUCTURE_ROAD)) continue;
		//	if (position.lookForCreep() ) { continue; }
			if (getRoomTerrainAt(position) === TERRAIN_MASK_SWAMP) {
				swampPosition = position;
			} else {
				return this.move(this.pos.getDirectionTo(position));
			}
		}

		if (swampPosition) {
			return this.move(this.pos.getDirectionTo(swampPosition));
		}
		return this.travelTo(anchor);
	};

	Creep.prototype.followLeader = function (name) {
		if (Game.creeps[name] !== undefined) {
		//	if (this.room.name === Game.creeps[name].room.name) {
				if (Game.creeps[name] && Game.creeps[name].spawning) {
					this.yieldRoad(Game.creeps[name].pos);
				} else if (!this.pos.inRangeTo(Game.creeps[name].pos, 1)) {
					this.travelTo(Game.creeps[name].pos, { range: 0, allowSK: true, stuckCount: 10, movingTarget: true });
				}
	//		} 
			
	//		else {
	//			this.travelTo(new RoomPosition(25, 25, Game.creeps[name].room.name), { range: 20, allowSK: true });
	//		}			
		} else {	
			/*		
			if (this._memory.bankId !== undefined) {
				if (this._memory.ts === undefined) {
					this._memory.ts = Game.time +101;
				}
				if (Game.time < this._memory.ts) { return; }

				let target = Game.getObjectById(this._memory.bankId);
				if (!target) {
					if (this._memory[C.ROOM_TARGET] !== undefined) {
						let dest = new RoomPosition(25, 25, this._memory[C.ROOM_TARGET]);
						this.travelTo(dest, { range: 2, ensurePath: true });
					}
				} else {					
					this.travelTo(target, { range: 2, ensurePath: true });
				}
			}*/ 
		}
	};

	// Push the blocking creep along the same 'path' as the moving creep
	Creep.prototype.moveAllCreepsOnPath = function (path, opts = {}) {
		_.defaults(opts, {
			recursive: false,
			depth: 0,
		});

		if (path.length <= 0) { 
			return ERR_NOT_FOUND; 
		}
	//	console.log(opts.depth + " moving creep " + this + " to pos " + path[0] +" path length " + path.length )

		let dirOwn = this.pos.getDirectionTo(path[0]);
		let status = this.move(dirOwn);

		let blockingCreep = getBlockingCreep(path[0]);

		if (blockingCreep) {

			if (!blockingCreep._is_pushed) {

				if (blockingCreep.isCombatCreep() && !opts.allowCombatCreeps) {
					return ERR_BUSY;
				}

				if (opts.recursive && opts.depth < 5 && path.length > 0) {
					opts.depth += 1;
					path.splice(0, 1);
					//     console.log(opts.depth + " moving creep recursive " + blockingCreep + " to pos " + path[0] + " " + this.room.name )
				//	push_status = blockingCreep.moveAllCreepsOnPath(path, opts);
				//	status = blockingCreep.moveAllCreepsOnPath(path, opts);
					
					status = blockingCreep.moveAllCreepsOnPath(path, opts);
				} else {
					let dir = this.pos.getDirectionTo(path[1]);
				//	push_status = blockingCreep.move(dir);
					status = blockingCreep.move(dir);
				}
			//	if (push_status === OK) {
				if (status === OK) {
					blockingCreep._is_pushed = true;
					delete blockingCreep._cache._trav;
				}
			} else {
				status = ERR_BUSY;
			}
		}
		return status;
	};

	// Push the blocking creep along the same 'path' as the moving creep
	PowerCreep.prototype.moveAllCreepsOnPath = function (path, opts = {}) {
		_.defaults(opts, {
			recursive: false,
			depth: 0,
		});

		//    console.log(opts.depth + " moving creep " + this + " to pos " + path[0] +" path length " + path.length )
		let dirOwn = this.pos.getDirectionTo(path[0]);
		let status = this.move(dirOwn);

		let blockingCreep = getBlockingCreep(path[0]);
		if (blockingCreep && !blockingCreep._is_pushed && !blockingCreep.memory.isCombatCreep) {
			//   blocking_creep._memory._move = creep._memory._move;
			let push_status = null;
			if (opts.recursive && opts.depth < 5 && path.length > 0) {
				opts.depth += 1;
			//	let newPath = path.splice(0, 1);
				//     console.log(opts.depth + " moving creep recursive " + blockingCreep + " to pos " + path[0] + " " + this.room.name )
				push_status = blockingCreep.moveAllCreepsOnPath(path, opts);
			} else {
				let dir = this.pos.getDirectionTo(path[1]);
				push_status = blockingCreep.move(dir);
			}
			if (push_status === OK) {
				blockingCreep._is_pushed = true;
			}
		}
		return status;
	};

	Creep.prototype.moveRatio = function () {
		if (this._moveRatioTs !== Game.time) {
			this._moveRatioTs = Game.time;
			let moveParts = 0;
			moveParts = this.getActiveBodyparts(MOVE);
			/*
			if (this.hits < this.hitsMax) {
				moveParts = this.getActiveBodyparts(MOVE);
			} else {
				moveParts = getBodyparts([this], MOVE);
			}*/

		//	let emptyCarry = getBodyparts([this], CARRY) - Math.ceil(this.sumCarry/CARRY_CAPACITY)
			let emptyCarry = this.getActiveBodyparts(CARRY) - Math.ceil(this.sumCarry/CARRY_CAPACITY)

			let fatigueGenerators = (this.body.length - emptyCarry - moveParts);		 	
			if (fatigueGenerators > 0) {
				this._moveRatio =  moveParts / fatigueGenerators;
			}
			else {
				this._moveRatio = 100
			}
		}
		return this._moveRatio;
	}

	Creep.prototype.getSwampCost = function () {
	//	console.log(this.moveRatio())
		return limit(Math.ceil(5 / this.moveRatio()), 1, 50);
	};

	Creep.prototype.getMoveCost = function () {
		return limit(Math.ceil(1 / this.moveRatio()), 1, 50);
	};
	
	Creep.prototype.canOffroad = function () {
		if( this.moveRatio() >= 5) {
			return 1;
		} 
		return 0;			
	}

	Creep.prototype.canIgnoreRoads = function () {
		if( this.moveRatio() >= 1) {
			return 1;
		} 
		return 0;
	}

	Creep.prototype.forRoads = function () {
		if (this._cache._forRoads === undefined) {
			let moveParts = this.hasBodyparts(MOVE);
			let fatigueGenerators = (this.body.length - moveParts);
			this._cache._forRoads = (moveParts / fatigueGenerators) < 1;
		}
		
		return this._cache._forRoads;
	}


	Creep.prototype.groupBeforeAttack = function () {

		let targetRoom = this._memory[C.ROOM_TARGET];
		if (needsGrouping(targetRoom)) {
		//	let myCreeps = getMyCombatCreepsAssignedTo(targetRoom);

			if (this._memory._returnToHeal) {
				if (this.hits === this.hitsMax) {
					delete this._memory._returnToHeal;
				} else {
					this.returnHome();
				}
			} else if (this._memory.peek) {
				if (this.room.name === targetRoom) {
					delete this._memory.peek;
				} else {
					let targetDest = new RoomPosition(25, 25, targetRoom);
					this.travelTo(targetDest, {range: 20});
					this.say("peek")
					delete this._memory.grouped;

					return;
				}
			}


			if (Memory.rooms[targetRoom].groupRoom) {
				let groupRoom = Memory.rooms[targetRoom].groupRoom;

				if (!this._memory.groupPos) {
					let targetDest = pullIdlePosForRoom(groupRoom);
					this._memory.groupPos = posCompress(targetDest);
					this._memory.groupRoom = groupRoom;
				}
				
				let wantedRange = 8;
				let groupPos = posDecompressXY(this._memory.groupPos, this._memory.groupRoom);

				if (this.hits < this.hitsMax) {
					let healersInGroup = _.filter(getMyCombatCreepsAssignedTo(targetRoom), 
						function(creep) {return (creep.getActiveBodyparts(HEAL) > 0);
							});
					if (healersInGroup.length <= 0) {
						this._memory._returnToHeal = 1;
						this.returnHome();
					}
				}

				if (!this._memory.grouped &&
					!this._memory._returnToHeal &&
					(this.room.name !== this._memory.groupRoom || 				
					this.pos.isNearExit(0) || 
					this.pos.getRangeTo(groupPos) > wantedRange)
				) { // MOVE TOWARDS GROUP
					this.travelTo(groupPos, {range: wantedRange-5, roomCallback: raidMatrix});
				} else {
					

					this._memory.grouped = 1;
					if ((Memory.rooms[targetRoom].hostileTs || 0) + 50 < Game.time &&
						Game.time % 27 === 0
					) { // want to peek
						let peekers = _.filter(getMyCombatCreepsAssignedTo(targetRoom), 
							function(creep) {return (
											creep._memory.peek !== undefined);
								});

						if (peekers.length === 0) {
							this._memory.peek = Game.time;
						}
					}

					if (!this.defensiveRetreatPath() ) {
						this.yieldRoad(groupPos);
					}
				}
			}


			if (Memory.rooms[targetRoom].hostileTs && (Game.time > Memory.rooms[targetRoom].hostileTs + 25)) {
				requestRoomVision(targetRoom)
			}
			
			return 1;
		} else {
			delete this._memory.groupPos;
			delete this._memory.groupRoom;
		}
	}

	Creep.prototype.roleInvaderKiller = function (targetRoom) {
		
		if (this._memory[C.TARGET_POS] && this._memory[C.TARGET_POS].roomName !== targetRoom) {
			delete this._memory[C.TARGET_POS];
			this.say(targetRoom +"?")
		}

		if (this._memory[C.TARGET_POS] === undefined) {
			this._memory[C.TARGET_POS] = posSave(pullIdlePosForRoom(targetRoom));
			this._memory.tRm = targetRoom;
		}
		
		let attacking = false;
		let rangedAttacking;
		let target;
		let rangeSet;
		let hostiles = getEnemyCreeps(this.room.name);

		if (targetRoom === this.room.name) {
			// RECORD TICKS IN COMBAT
			if (!this._memory.fightTicks) { this._memory.fightTicks = 0; }
			this._memory.fightTicks++;
		}

		if (targetRoom === this.room.name && hostiles.length > 0) {//&& Memory.rooms[this.room.name].hostiles.player !== 'Source Keeper') {
			target = this.pos.findClosestByRange(hostiles);
			if (target) {
				this._memory[C.TARGET_POS] = posSave(target.pos); 
				this._memory.tRm = target.room.name;
			}
		} else if (targetRoom === this.room.name && roomIsSk(this.room.name)) {
			if (Game.creeps[this._memory.follow] === undefined && Game.time % 19 === 1) {
				let follow = this.room.find(FIND_MY_CREEPS, {
					filter: function (object) {
						return (object.memory[C.ROLE] === "keeperKiller");
					}
				});
				if (follow.length > 0) {
					this._memory.follow = follow[0].name;
				}
			}
			let creep = Game.creeps[this._memory.follow];
			if (creep) {
			//	this._memory[C.TARGET_POS] = creep._memory[C.TARGET_POS]; 
			//	this._memory.tRm = creep.room.name;				
			}
		} else if (this._memory.follow && Game.creeps[this._memory.follow]) {
			this._memory[C.TARGET_POS] = posSave(Game.creeps[this._memory.follow].pos)
			this._memory.tRm = Game.creeps[this._memory.follow].room.name;			
		} else if (Memory.controllerAttack && Memory.controllerAttack[this.room.name] ||
			(Memory.rooms[this.room.name] && Memory.rooms[this.room.name].invaderCore)
		) {

				target = this.getAttackTarget();
				if (target) {
					this._memory[C.TARGET_POS] = posSave(target.pos);
					this._memory.tRm = target.room.name;	
					rangeSet = 1;
				}
		//	}
		}

		let imStronger = false;
		if (roomIsSafeModed(this.room.name) ) {
			imStronger = true;
		} else {
			imStronger = this.pos.myCombatStrengthLarger(4);
		}

		// SET RANGE
		let range = 2;
		let kiting = false;
		if (rangeSet) { 
			range = rangeSet; 
		} else if(target && target.isConstructionSite){			
			range = 0;
		} else if (target && target.isCreep) {
			if (imStronger)	{
				range = 1;
			} else if (this.pos.canKite() && target.pos.canKite() ) {
				range = 3;
				kiting = true;
			} else {
				range = 5;
			}			
		} else if(target || this.pos.roomName !== targetRoom) {
			range = 1
		} else {
			range = 4;
		}

		let targetPos;
		let traveling;

		if (!kiting && !imStronger){
			this.defensiveRetreatPath();
			this.say("flee")
		} else {
			
			targetPos = clampRoomEdges(posLoad(this._memory[C.TARGET_POS]));
			let rangeToTarget = this.pos.getRangeTo(targetPos);
			
		//	this.say(targetPos.x +":"+ targetPos.y)
			if (rangeToTarget > range || this.pos.roomName !== targetRoom) {
				this.room.visual.line(this.pos, targetPos, { color: "blue", lineStyle: "solid" });
				this.travelTo(targetPos, {range: range, ignoreRoads: true, roomCallback: avoidSKcreeps });
				traveling = true;
			} else if (target && kiting && rangeToTarget < range) {
				this.defensiveRetreatPath({ kite: true });
			} else if (rangeToTarget === 1 && target && target.isCreep && range <= 1){
				this.move(this.pos.getDirectionTo(target))
				this.say("mve!")
			}
		}

		if (!traveling && !target && hostiles.length === 0 && targetPos) {
			this.yieldRoad(targetPos, true, range);
		} else {

			let tryAttack = 1;
			if (this.getActiveBodyparts(RANGED_ATTACK) > 0) {
				rangedAttacking = this.rangedAttackInRange(target);
				tryAttack = rangedAttacking;	// If creep has RA and no target in range, skip Attack
			}

			if (tryAttack && this.meleeAttackInRange(target) === OK) {
				attacking = true;
			}
		}		

		if (!attacking || this.hits <= this.hitsMax / 4) {
			if (this.getActiveBodyparts(HEAL) > 0 && this.pos.lookForHealReasons(4) > 0 )  {
				this.healInRange(rangedAttacking);
			}
		}

	};


	Creep.prototype.fleeFromDamage = function() {

		let roomName = this.room.name;
		if (this.room.controller && this.room.controller.my && roomIsSafeModed(roomName) > 0) { return 0; }
		if (roomIsSafeModed(roomName) > 0) { return 0; }
		let danger = [];
		let hostiles = getEnemyCreeps(roomName);

		for (let idx in hostiles) {

			let creep = hostiles[idx];

			let creepPower = calcSingleCreepStrength(creep)
			if (creepPower.rangedAttackDamage > 0) {
				danger.push({pos: creep.pos, range: 4})
			} else if (creepPower.attackDamage > 0) {
				danger.push({pos: creep.pos, range: 2})
			}

		}

		let towers = this.room.findByType(STRUCTURE_TOWER)
		for (let idx in towers) {
			let tower = towers[idx];

			if (tower.my || tower.energy < 10) { continue; }
			let currentRange = this.pos.getRangeTo(tower)
			if (currentRange > 20) { continue; }

			danger.push({pos: tower.pos, range: currentRange + 6})

		}

		if (danger.length) {
			let currentSwampCost = this.getSwampCost();

			let opts = {
				swampCost: currentSwampCost,
				flee: true,
				maxOps: 2000, // this might determine where we flee to.
				maxRooms: 2,
			};

			let { path, ops } = PathFinder.search(this.pos, danger, opts);
			if (!path || path.length <= 0) {
				return 0;
			}

			let moveCombatCreeps = false;
			if (this.isCombatCreep() ) {
				moveCombatCreeps = true;
			}

			this.moveAllCreepsOnPath(path, { recursive: true, allowCombatCreeps: moveCombatCreeps });
			
			return true;
		}

		return false;
	}

	Creep.prototype.skNearItsTarget = function() {

		let dist = 1;
		let top = limit(this.pos.y-dist, 0, 49);
		let left = limit(this.pos.x-dist, 0, 49);
		let bot = limit(this.pos.y+dist, 0, 49);
		let right = limit(this.pos.x+dist, 0, 49);

		let nearbySource = this.room.lookForAtArea(LOOK_SOURCES, top, left, bot, right, true);
		if (nearbySource.length > 0) { 
			return true; 
		}

		let nearbyMineral = this.room.lookForAtArea(LOOK_MINERALS, top, left, bot, right, true);
		if (nearbyMineral.length > 0) { return true; }

		this.room.visual.circle(this.pos.x, this.pos.y, { fill: 'transparent', radius: 0.55, stroke: 'red' });

		return false;		
	}

	Creep.prototype.defensiveRetreatPath = function (options = {}) {

		let distance = 4;
		if (options.kite) {
			distance = 2;
		} else if (options.distance !== undefined) {
			distance = options.distance
		}

		let roomName = this.room.name;
		if (this.room.controller && this.room.controller.my && roomIsSafeModed(roomName) > 0) { return 0; }
		if (roomIsSafeModed(roomName) > 0) { return 0; }
		let danger = [];
		let hostiles = getEnemyCreeps(roomName);

		let isSk = roomIsSk(roomName)

		if (hostiles.length > 0) {
			if (this.room.controller && this.room.controller.my && this.pos.lookForStructure(STRUCTURE_RAMPART) ) { return 0; }

			let nextDir = this.getNextDirFromPath();
			let nextPos 
			if (nextDir !== undefined) { 				
				nextPos = this.pos.getPositionAtDirection(nextDir)
			}

			for (let i = 0; i < hostiles.length; i++) {
				let creep = hostiles[i];
				let wantedRange = distance;

				
				if (isSk && creep.owner.username === "Source Keeper" && creep.skNearItsTarget() ) {
					wantedRange -= 1;
				}

				if (this.pos.getRangeTo(creep) > wantedRange && (!nextPos || nextPos.getRangeTo(creep) > wantedRange)) { continue; }
				

				if (creep.getActiveBodyparts(ATTACK) <= 0 &&
					creep.getActiveBodyparts(RANGED_ATTACK) <= 0
				) {
					continue;
				}
				//	console.log("adding creep " + creep + " attack  "+ creep.getActiveBodyparts(ATTACK))
				danger = danger.concat(creep);
			}
		}

		if (isSk) {

			let preTicks = this.getMoveCost() * 5;
			let skSpawns = this.room.getSpawningLairs(preTicks);
			if (skSpawns.length > 0) {
				for (let idx in skSpawns) {
					if (this.pos.getRangeTo(skSpawns[idx]) <= 5) {
						danger = danger.concat(skSpawns[idx]);
					}
				}
			}
		}

		if (danger.length === 0) {
			//	return 0 
		} else {
			//	console.log(roomName + " found hostiles to avoid " + danger.length)

			/*
			for (let i = 0; i < danger.length; i++) {				
				if (this.pos.getRangeTo(creep) > distance) { continue; }
			}*/


			let rangeAvoid = 9;
			let b = _.map(danger, c => ({ pos: c.pos, range: rangeAvoid }));
			let currentSwampCost = this.getSwampCost();

			if (options.fleeAsOne && Game.creeps[options.fleeAsOne]) {				
				let follower = Game.creeps[options.fleeAsOne];
				if (this.fatigue || follower.fatigue) { return 0; }
				follower.move(follower.pos.getDirectionTo(this));
			}
			//	console.log(this.room.name + " swampcost " + currentSwampCost + " body " + this._memory[C.ROLE])
			let opts = {
				swampCost: currentSwampCost,
				flee: true,
				maxOps: 3000, // this might determine where we flee to.
				maxRooms: 2,
				roomCallback: avoidSKcreeps
			};

			let { path, ops } = PathFinder.search(this.pos, b, opts);
			if (!path || path.length <= 0) {
				return 0;
			}

			//	let dir = this.pos.getDirectionTo(path[0]);
			let moveCombatCreeps = false;
			if (this.isCombatCreep() ) {
				moveCombatCreeps = true;
			}

			this.moveAllCreepsOnPath(path, { recursive: true, allowCombatCreeps: moveCombatCreeps });
			if (this.carry[RESOURCE_ENERGY] > 0 && !options.keepRes && this.fatigue) {
				this.drop(RESOURCE_ENERGY);
			}

			this._cache.fleeId = danger[0].id;
			this._cache.fleeRoom = danger[0].room.name;

			

			return 1;
		}

		if (this._cache.fleeId) {
			let target = Game.getObjectById(this._cache.fleeId);

			
			if (this.pos.isNearExit(0) && this.room.name !== this._cache.fleeRoom) {
				if (this._cache.edgeDance === undefined) {
					this._cache.edgeDance = Game.time + 7;
				}
			}


			if (this._memory.edgeDance ){
				if (Game.rooms[this._cache.fleeRoom] && !target) {
					delete this._cache.fleeId;
					delete this._cache.edgeDance;
					return 0;
				}

				if (Game.time < this._cache.edgeDance) {
					let dest = new RoomPosition(25, 25, this.room.name)
					this.travelTo(dest, { maxOps: 30000, allowSK: true, range: 20});
				//	log("avoid dancing in " + this.pos.roomName + " pos " + this.pos)
					return 1;
				} else {
					delete this._cache.edgeDance;
				}
			}


			if (target) {
				if (target.ticksToSpawn > 5) {
					delete this._cache.fleeId;
				}
				let dirToDanger = this.pos.getDirectionTo(target.pos);
				if (this._cache._trav && this._cache._trav.path && dirIsNotTowards(dirToDanger, this._cache._trav.path[0])) {
					delete this._cache.fleeId;
					this.say("not towards")
					return 0;
				} else if (this.pos.getRangeTo(target.pos) <= distance + 2) {
					if (!this._cache.fleeRepathTimer || Game.time > this._cache.fleeRepathTimer) {
						if (this._cache._trav && this._cache._trav.path && this._cache._trav.path.length > 3) {
						//	console.log(this.name + " deletig path " + this._cache._trav.path.length);
							let dest = new RoomPosition(this._cache._trav.state[4], this._cache._trav.state[5], this._cache._trav.state[6])
							delete this._cache._trav
							delete this._cache.fleeId;
							this._cache.fleeRepathTimer = Game.time + 25;
							this.say("repathing!")
							this.travelTo(dest, { maxOps: 30000, allowSK: true, range: 1, freshMatrix: true, ensurePath: true,  roomCallback: avoidSKcreepsIgnoreRoads });

							return 1;
						}
					}

					this.say("freeze");
					return 1; // FREEZE	
				}
			} else {
				delete this._cache.fleeId;
			}
		}
		return 0;
	};



	Creep.prototype.defensiveRetreat = function (options = {}) {
		return this.defensiveRetreatPath(options);

	};


};
