'use strict'
module.exports = function() {
	
	StructureSpawn.prototype._renewCreep = StructureSpawn.prototype.renewCreep; // OLD METHOD

	StructureSpawn.prototype.renewCreep = function (creep){
		this.room._cache._spawnRefresh = Game.time + 3;
		return this._renewCreep(creep);
	};

	Object.defineProperty(StructureTerminal.prototype, "__cooldown", {
		get: function () {
			if (this === StructureTerminal.prototype || this == undefined)
				return 0;

			if (this.__cd) {
				return this.__cd
			}
			return this.cooldown;
		},
		set: function(v) {
			this.__cd = v;
			return 
		},
		configurable: true,
		enumerable: false
	});


	if(!Memory.structures) { Memory.structures = {}; }
	Object.defineProperty(Structure.prototype, "memory", {
		get: function () {
			return Memory.structures[this.id] = Memory.structures[this.id] || {};
		},
		set: function(value) {
			Memory.structures[this.id] = value;
		},
		configurable: true,
		enumerable: false
	});

	global.strucutreCacheMem = {};
	Object.defineProperty(Structure.prototype, '_cache', {
		get: function() {            
			return global.strucutreCacheMem[this.id] = global.strucutreCacheMem[this.id] || {};
		},
		set: function(value) {            
			global.strucutreCacheMem[this.id] = value;
		},
		configurable: true,
		enumerable: false
	});

	Object.defineProperty(Mineral.prototype, "memory", {
		get: function () {
			return Memory.structures[this.id] = Memory.structures[this.id] || {};
		},
		set: function(value) {
			Memory.structures[this.id] = value;
		},
		configurable: true,
		enumerable: false
	});

	
	Object.defineProperty(Deposit.prototype, "memory", {
		get: function () {
			return Memory.structures[this.id] = Memory.structures[this.id] || {};
		},
		set: function(value) {
			Memory.structures[this.id] = value;
		},
		configurable: true,
		enumerable: false
	});
	
	Object.defineProperty(StructureTerminal.prototype, "freeSpace", {
		get: function () {
			if (this._tsFreeSpace === Game.time) {
				return this._freeSpace;
			}
			this._tsFreeSpace = Game.time;
			this._freeSpace =  this.storeCapacity - _.sum(this.store);
			return this._freeSpace;
		},
		set: function() {			
		},
		configurable: true,
		enumerable: false
	});

	Object.defineProperty(StructureStorage.prototype, "freeSpace", {
		get: function () {
			if (this._tsFreeSpace === Game.time) {
				return this._freeSpace;
			}
			this._tsFreeSpace = Game.time;

			let capacicty = this.storeCapacity;
			/*
			let powerStore = this.getEffect(PWR_OPERATE_STORAGE);
			if (powerStore) {
				capacicty += POWER_INFO[PWR_OPERATE_STORAGE].effect[powerStore.level-1];				
			}*/

			this._freeSpace =  capacicty - _.sum(this.store);
			return this._freeSpace;
		},
		set: function() {			
		},
		configurable: true,
		enumerable: false
	});

	Object.defineProperty(StructureContainer.prototype, "freeSpace", {
		get: function () {
			if (this._tsFreeSpace === Game.time) {
				return this._freeSpace;
			}
			this._tsFreeSpace = Game.time;
			this._freeSpace =  this.storeCapacity - _.sum(this.store);
			return this._freeSpace;
		},
		set: function() {			
		},
		configurable: true,
		enumerable: false
	});

	StructureTerminal.prototype._send = StructureTerminal.prototype.send; // OLD METHOD

	StructureTerminal.prototype.send = function (resourceType, amount, destination, description){
		let result = this._send(resourceType, amount, destination, description);
		if (result === OK) { this.__cooldown = TERMINAL_COOLDOWN; }
		return result
	};


	Source.prototype.isSource = true;
	Structure.prototype.isStructure = true;
	Tombstone.prototype.isTombstone = true;
	StructureLab.prototype.isLab = true;
	StructureSpawn.prototype.isSpawn = true;
	StructureRampart.prototype.isRampart = true;
	StructureWall.prototype.isWall = true;
	StructureLink.prototype.isLink = true;
	StructureContainer.prototype.isContainer = true;
	StructureRoad.prototype.isRoad = true;
	StructurePortal.prototype.isPortal = true;
	StructureExtractor.prototype.isExtractor = true;
	StructureInvaderCore.prototype.isInvaderCore = true; 
	ConstructionSite.prototype.isConstructionSite = true;
	Resource.prototype.isResource = true;
	Ruin.prototype.isRuin = true;

	
	if (SEASONAL_SCORE) { ScoreContainer.prototype.isScoreContainer = true;}

	if (SEASONAL_SYMBOLS) { SymbolContainer.prototype.isScoreContainer = true;}

	function getEnergyOrder(roomName, force = false){
		
		if (!Memory.rooms[roomName].fillOrder) { return; }	// return undefined and not empty array
		let fillOrder = [];
		
		if (ENABLE_SOURCE_EXTENSIONS) {
			let sources = Game.rooms[roomName].find(FIND_SOURCES)
			for (let idx in sources){	
				let sourceExtensions = sources[idx].getSourceExtensions(force);
				for (let idx2 in sourceExtensions){	
					let ext = Game.getObjectById(sourceExtensions[idx2]);
					if (!ext) { continue; }
					fillOrder.push(ext)
				}
			}
		}

		let storeCraneExt = Game.rooms[roomName].getStoreCraneExtensions()
		for (let idx in storeCraneExt) {
			fillOrder.push(storeCraneExt[idx]);
		}

		if (ENABLE_SOURCE_EXTENSIONS) {
			let spawnExtensions = Game.rooms[roomName].getSpawnExtensions(force);
			for (let idx in spawnExtensions){
				fillOrder.push(spawnExtensions[idx]);
			}
		}

		let spawns = Game.rooms[roomName].findByType(STRUCTURE_SPAWN);
		for (let idx in spawns) {
			fillOrder.push(spawns[idx]);
		}

		for (let idx in Memory.rooms[roomName].fillOrder) {
			let fill = Memory.rooms[roomName].fillOrder[idx];
			for (let idx2 in fill) {
				let ext = Game.getObjectById(fill[idx2]);
				if (!ext) { continue; }
				fillOrder.push(ext)
			}
		}
		return fillOrder;
	}

	StructureSpawn.prototype.spawningHasDefaultDirections = function() {
		if (!this.spawning || !this.spawning.directions || !this.spawning.directions.length > 0) { return false; }
		
		let defaultDir = this.getDefaultDirections();

		if (this.spawning.directions.length !== defaultDir.length) { return false; }

		for (let idx in defaultDir) {
			if (defaultDir[idx] !== this.spawning.directions[idx]) { return false; }
		}
		return true;
	}

	StructureSpawn.prototype.getDefaultDirections = function( force=false) {

		if (!this._cache.defaultDirections || force) {			
			
			let allCranePos = {};

			let cranePos = this.room.getCranePos(this.name);
			if (cranePos) {
				allCranePos[posCompress(cranePos)] = {};
			}
			
			let fillerPos = this.room.getSpawnFillerPos();
			for (let idx in fillerPos) {
				allCranePos[posCompress(fillerPos[idx])] = {};
			}

			let possibleDirections = []
			for (let i = 1; i <= 8; i++) {							
				let position = this.pos.getPositionAtDirection(i);
				if (allCranePos[posCompress(position)]) { continue; }
				if (!position.isPassible(true)) { continue; }
				possibleDirections.push(i)
			}
			this._cache.defaultDirections = possibleDirections;
		}
		

		return this._cache.defaultDirections;
	}
	
	StructureSpawn.prototype.createCreep = function (body, name, memory = {}, directions ){
		
		
		this.spawningTs = Game.time;
	
		let result = this.spawnCreep(body, name, {dryRun: true});
	//	let result = this.canCreateCreep(body, name) // OLD METHOD!
		
		if (result === ERR_NOT_ENOUGH_ENERGY) {
			let cost = this.creepCost(body);

			

			if (this.room.energyCapacityAvailable >= cost) {

				this.addToQ(body, name, memory, 60, cost, directions);
				return result;
			} else {
				console.log(this.room.name + " spawn cost to high! " + cost + " / " + this.room.energyCapacityAvailable+ " for role "  + memory[C.ROLE]);
			}
		} else if (result === OK) {
			delete this.room._cache.RefillJob; // reset refill jobs as we used energy
			requestMemSave();
			let energySource = getEnergyOrder(this.room.name)
			addCreepToCache(name, memory[C.ROLE], memory[C.ROOM_ORIGIN]);

			if (USE_SHARDS && memory.shard) {
				let spawnTicks = body.length * CREEP_SPAWN_TIME;
				interShard.registerDepartingCreep(name, memory.shard, spawnTicks)
			}			

			if (!directions) {
				directions = this.getDefaultDirections()
			} 
			let actualResult = this.spawnCreep(body, name, {memory: memory, energyStructures: energySource, directions: directions});
			if (actualResult === ERR_NOT_ENOUGH_ENERGY) { 
				energySource = getEnergyOrder(this.room.name, true);
				if (this.room.memory.fillOrder) {	// retry after refresh
					actualResult = this.spawnCreep(body, name, {memory: memory, energyStructures: energySource, directions: directions});
				}

				if (actualResult === ERR_NOT_ENOUGH_ENERGY) { // if still not ok, recreate routes?
					delete this.room.memory.extCnt;
					delete this.room.memory.fillOrder;
				}
			} else if (actualResult === OK && ENABLE_ENERGY_PROFILING) {

				let cost
				if (!this.room.storage) {
					cost = this.creepCost(body);
					if (this.room._memory.spawnCost === undefined) { this.room._memory.spawnCost = 0}
					this.room._memory.spawnCost += cost;
				}

				if (ENABLE_ENERGY_PROFILING) {
					energyProfileCreep(this.room.name, memory[C.ROLE], cost || this.creepCost(body));
				}
				
				
			}
			this.room.wakeSpawnFillers();
			return actualResult
		} else {
			console.log(this.room.name + " error spawning creep " + name + " error code " + result + " body length " + body.length + " body parts " + body);
			return result;
		}
	};

	function addCreepCostData(role, energy) {
		if (Memory.energyData.creeps[role] === undefined) {
			Memory.energyData.creeps[role] = 0;
		}
		Memory.energyData.creeps[role] += energy;
	}

	StructureSpawn.prototype.addToQ = function (body, name, memory, ts=25, cost=0, directions){	
		addCreepToCache(name, memory[C.ROLE], memory[C.ROOM_ORIGIN]);

		if (!Memory.rooms[this.room.name].spawnQ || !Memory.rooms[this.room.name].spawnQ.length) { Memory.rooms[this.room.name].spawnQ = []; }

		Memory.rooms[this.room.name].spawnQ.push({
			cost: cost || this.creepCost(body),
			name: name,
			body: body,
			memory: memory,
			directions: directions,
			ts: Game.time + ts
		});		
	}

	StructureSpawn.prototype.spawnFromQ = function (){
		let roomName = this.room.name;
		if (!Memory.rooms[roomName].spawnQ || Memory.rooms[roomName].spawnQ.length === 0) {return 0;}
		
		if (Memory.rooms[roomName].spawnQ[0].ts && Game.time > Memory.rooms[roomName].spawnQ[0].ts) {

			if (Memory.rooms[roomName].spawnQ[0].memory && 
				Memory.rooms[roomName].spawnQ[0].memory[C.ROLE] === 'mover' &&
				(this.room.energyAvailable >= Memory.rooms[roomName].spawnQ[0].cost * 0.5) && 
				Memory.rooms[roomName].spawnQ[0].resized === undefined
			) {
				Memory.rooms[roomName].spawnQ[0].resized = 1;
				let newBody = createBodyPartCarrier(this.room.energyAvailable, 25);
				Memory.rooms[roomName].spawnQ[0].body = newBody
				Memory.rooms[roomName].spawnQ[0].cost = this.creepCost(newBody);
				Memory.rooms[roomName].spawnQ[0].ts = Game.time + 3;
				console.log(roomName + " resizing mover due to Q timeout! ")

			} else {
				console.log(roomName + " deleting queue, timed out " + Memory.rooms[roomName].spawnQ[0].name + " tick " + Memory.rooms[roomName].spawnQ[0].ts + "/"+ Game.time);
				Memory.rooms[roomName].spawnQ.splice(0, 1);
				if (Memory.rooms[roomName].spawnQ.length === 0) { delete Memory.rooms[roomName].spawnQ }
				return 0;
			}			
		}
	//	console.log(roomName + " checking spawn Q " + Memory.rooms[roomName].spawnQ.name + " has "+ this.room.energyCapacityAvailable + "/"+ Memory.rooms[roomName].spawnQ.cost  )
		if (this.room.energyCapacityAvailable >= Memory.rooms[roomName].spawnQ[0].cost) {
			let name = Memory.rooms[roomName].spawnQ[0].name;
			let body = Memory.rooms[roomName].spawnQ[0].body;
			let mem = Memory.rooms[roomName].spawnQ[0].memory;
			let dir = Memory.rooms[roomName].spawnQ[0].directions;
			if (!dir) {
				dir = this.getDefaultDirections()
			} 

			let energySource = getEnergyOrder(this.room.name)
				
			let result = this.spawnCreep(body, name, {memory: mem, energyStructures: energySource, directions: dir});
		//	console.log(this + " " +this.room.name+ " spawning "+ name+ " from Q " + result);
			this.spawningTs = Game.time;

			if (result === OK){

				if(USE_SHARDS && mem.shard) {
					let spawnTicks = body.length * CREEP_SPAWN_TIME;
					interShard.registerDepartingCreep(name, mem.shard, spawnTicks)
				}

				if (ENABLE_ENERGY_PROFILING) {
					energyProfileCreep(roomName, mem.role, Memory.rooms[roomName].spawnQ[0].cost);
				}

				this.room.wakeSpawnFillers();

			} else if (result === ERR_NOT_ENOUGH_ENERGY) { 
				energySource = getEnergyOrder(this.room.name, true)	
				if (this.room.memory.fillOrder) {	// retry after refresh
					result = this.spawnCreep(body, name, {memory: mem, energyStructures: energySource, directions: dir});
				}
				delete this.room.memory.extCnt;
				delete this.room.memory.fillOrder;	
				
				this.room.wakeSpawnFillers();
			}

			Memory.rooms[roomName].spawnQ.splice(0, 1);
			
			if (Memory.rooms[roomName].spawnQ.length === 0) { delete Memory.rooms[roomName].spawnQ }
			

			return 1;
		} else {
			delete Memory.rooms[roomName].spawnQ
			return 0;
		}
	};
	
	global.getControllerAttackPositionsCount = function(room){

		if (Game.rooms[room] && (Memory.rooms[room].cntrlAtkCnt === undefined || Game.time > Memory.rooms[room].cntrlAtkTs)) {
			Memory.rooms[room].cntrlAtkTs = Game.time + 979;
			let cnt = 0;
			if (Game.rooms[room].controller) {
				cnt = Game.rooms[room].controller.getAttackPositions().length;
			}
			Memory.rooms[room].cntrlAtkCnt = cnt;
		}

		if (Memory.rooms[room] && Memory.rooms[room].cntrlAtkCnt !== undefined) {
			return Memory.rooms[room].cntrlAtkCnt;
		}
		return 1 // If no data, guess atleast 1 pos is available
		
	}

	StructureController.prototype.getAttackPositions = function (){
		if (!this.memory.attackPos || 
			!this.memory.attackPosTs ||
			Game.time > this.memory.attackPosTs
		) {
			this.memory.attackPosTs = Game.time + 171;
			let positions = this.pos.openAdjacentSpots(true);
			this.memory.attackPos = [];
			for (let idx in positions) {
				this.memory.attackPos.push(posSave(positions[idx]));
			}
		}
		let temp = [];
		for (let pos in this.memory.attackPos) {
			let roomPos = posLoad(this.memory.attackPos[pos])
			temp.push(roomPos);
		}
		return temp;
	};

	StructureController.prototype.allInPos = function (creep){

		let targetRoom = this.room.name;
		let claimers = _.filter(Game.creeps, (c) => c.memory[C.ROOM_TARGET] == targetRoom && c.memory[C.ROLE] === "claimer");

		let allInRange = true;
		for (let idx in claimers) {
			let claimer = claimers[idx];
			if (this.pos.getRangeTo(claimer) > 1) {
				return false;
			}
		}
		return allInRange;
	}
	
	StructureSpawn.prototype.creepCost = function (body){
		let cost = 0;
		let length = body.length;	
		for (let i=0; i< length; i++){
			cost += BODYPART_COST[body[i]];
		}		
		return cost;
	};
	
	// DELIVER MEMORY TO PREVENT MULTIPLE DELIVERIES TO THE SAME TARGET
	Object.defineProperty(Structure.prototype, 'deliver', {
		get: function() {		
			let value = 0;
			if(Memory.deliver[this.id]) {
				value = Memory.deliver[this.id];
			}
			return value;
		},
		set: function(value) {
			if (Memory.deliver[this.id] === undefined ) {
				Memory.deliver[this.id] = 0
			}
			Memory.deliver[this.id] += value;
			if (Memory.deliver[this.id] <= 0) {
				delete Memory.deliver[this.id];
			}
		},
		enumerable: false,
		configurable: true
	});

		
	// WITHDRAW MEMORY TO PREVENT WITHDRAW FROM THE SAME TARGET
	Object.defineProperty(Structure.prototype, 'withdraw', {
		get: function() {
			let value = 0;
			if(Memory.withdraw[this.id]) {
				value = Memory.withdraw[this.id];
			}
			return value;
		},
		set: function(value) {

			if (Memory.withdraw[this.id] === undefined ) {
				Memory.withdraw[this.id] = 0
			}

			Memory.withdraw[this.id] += value
			if (Memory.withdraw[this.id] <= 0) {
				delete Memory.withdraw[this.id];
			}
			
		},
		enumerable: false,
		configurable: true
	});
	
	// WITHDRAW MEMORY TO PREVENT WITHDRAW FROM THE SAME TARGET
	Object.defineProperty(Resource.prototype, 'withdraw', {
		get: function() {
			let value = 0;			
			if(Memory.withdraw[this.id]) {
				value = Memory.withdraw[this.id]
			}
			return value
		},
		set: function(value ) {

			if (Memory.withdraw[this.id] === undefined ) {
				Memory.withdraw[this.id] = 0;
			}

			Memory.withdraw[this.id] += value
			if (Memory.withdraw[this.id] <= 0) {
				delete Memory.withdraw[this.id];
			}
		},
		enumerable: false,
		configurable: true
	});

	// WITHDRAW MEMORY TO PREVENT WITHDRAW FROM THE SAME TARGET
	Object.defineProperty(Tombstone.prototype, 'withdraw', {
		get: function() {
			let value = 0 
			if(Memory.withdraw[this.id]) {
				value = Memory.withdraw[this.id]
			}
			return value
		},
		set: function(value ) {
			if (Memory.withdraw[this.id] === undefined ) {
				Memory.withdraw[this.id] = 0
			}	
			Memory.withdraw[this.id] += value
			if (Memory.withdraw[this.id] <= 0) {
				delete Memory.withdraw[this.id];
			}
		},
		enumerable: false,
		configurable: true
	});

	Object.defineProperty(StructureContainer.prototype, 'energy', {
		get: function() {
			return this.store[RESOURCE_ENERGY] || 0;
		},
		
		enumerable: false,
		configurable: true
	});

	Object.defineProperty(StructureContainer.prototype, 'energyCapacity', {
		get: function() {
			return 2000;
		},
		
		enumerable: false,
		configurable: true
	});
	
	StructureLab.prototype.runMyReaction = function(r1, r2) {
		if (this.memory[S.BOOSTER_LAB]) {
			if ( this.memory[S.LAB_ERROR_CYCLES] === undefined ) { this.memory[S.LAB_ERROR_CYCLES] = Game.time + 750}
			if (Game.time > this.memory[S.LAB_ERROR_CYCLES]) {
				delete this.memory[S.LAB_ERROR_CYCLES];

				this.room._cache._setRecepie = 0;
				this.room.setRecepie();
				return ;
			}
		}
		
		let result
		if (r1 && r2 && r1.mineralAmount > 0 && r2.mineralAmount > 0) {
			result = this.runReaction(r1, r2);
		} else {
			result = ERR_NOT_ENOUGH_RESOURCES;
		}

		if (result === OK ) {
			delete this.memory[S.LAB_ERROR_CYCLES];
			
			let batchAmount = 5;
			let powerLab = this.getEffect(PWR_OPERATE_LAB);
			if (powerLab) {
				batchAmount += POWER_INFO[PWR_OPERATE_LAB].effect[powerLab.level-1];				
			}
			r1.memory[S.BATCH_LAB] -= batchAmount;
			r2.memory[S.BATCH_LAB] -= batchAmount;
			
		} else {
			if ( this.memory[S.LAB_ERROR_CYCLES] === undefined ) { this.memory[S.LAB_ERROR_CYCLES] = Game.time + 250}
			if (Game.time > this.memory[S.LAB_ERROR_CYCLES]) {
				delete this.memory[S.LAB_ERROR_CYCLES];
				
				this.room.setRecepie();
			}
		}
		return result;
	}

	StructureLink.prototype.getCapacity = function() {
		if (linkCap[this.id]) { return linkCap[this.id] }

		let cap = 0;
		if (this.isProvider) {
			let storageLink = getStorageLink(this.room.name);
			if (storageLink.length <= 0) { 
				storageLink = getControllerLink(this.room.name);
				if (storageLink.length <= 0) { 
					return 0;
				}
			}
			
			let range = this.pos.getRangeTo(storageLink[0]) || 1;
			cap = 800 / range;
			linkCap[this.id] = cap;	
		}	
		return cap;
	}

	StructureLink.prototype.isProvider = function() {
		if (this._cache.isProvider === undefined || Game.time % 199 == 1) {
			let dist = 2
			let top = limit(this.pos.y-dist, 1, 48)
			let left = limit(this.pos.x-dist, 1, 48)
			let bot = limit(this.pos.y+dist, 1, 48)
			let right = limit(this.pos.x+dist, 1, 48)
			let source = this.room.lookForAtArea(LOOK_SOURCES, top,left,bot,right, true)
			this._cache.isProvider = source.length
		}	
		return this._cache.isProvider
	}
	
	StructureLink.prototype.isController = function() {
		if (this._cache.isController === undefined || Game.time % 499 == 1) {
			let dist = 3

			let rangeToController = this.pos.getRangeTo(this.room.controller);
			this._cache.isController = (rangeToController <= dist);			
		}
			
		return this._cache.isController
	}
	
	StructureLink.prototype.isStorage = function() {
		if (this._cache.isStorage === undefined || Game.time > this._cache.isStorageTs) {
			
			let cranePos = this.room.getCranePos();

			if (cranePos) {
				this._cache.isStorageTs = Game.time + 799;

				if (this.pos.isNearTo(cranePos)) {
					this._cache.isStorage = 1;
				} else {
					this._cache.isStorage = 0;
				}
			} else {
				this._cache.isStorageTs = Game.time + 1;
				this._cache.isStorage = 0;
			}
			
		}
		return this._cache.isStorage
	}
	
	global.cleanStructures = function() {
		let removed = 0;
		let keys = Object.keys(Memory.structures)
		let idx = keys.length
		
		while(idx--) {
			let id = keys[idx]

			if (!Memory.structures[id]){ continue; }

			if (Memory.structures[id].r1 !== undefined) {
				delete Memory.structures[id].r1
				delete Memory.structures[id].r2
			}

			if (Object.keys(Memory.structures[id]).length === 0) { 
				delete Memory.structures[id]
				removed++
				continue;
			}			
			
			if (Memory.structures[id].isController !== undefined || 
				Memory.structures[id].isProvider !== undefined || 
				Memory.structures[id].isStorage !== undefined
			) {
				delete Memory.structures[id]
				removed++
			}
		}
		return removed + "/" + keys.length;
	}
	
	StructureContainer.prototype.isController = function() {
		if (this._cache.isController === undefined || Game.time % 499 == 1) {
			
			if (this.isProvider()) {
				this._cache.isController = 0;
				return 0;
			}
			let dist = 3
			let rangeToController = this.pos.getRangeTo(this.room.controller);
			this._cache.isController = (rangeToController <= dist);
			
		}
		return this._cache.isController
	}
	
	StructureContainer.prototype.isSpawner = function() {
		return this._cache.isSpawner;
	}

	StructureContainer.prototype.isProvider = function() {

		if (this._cache.isProvider === undefined || Game.time % 199 == 1) {
			let dist = 1
			let top = limit(this.pos.y-dist, 1, 48)
			let left = limit(this.pos.x-dist, 1, 48)
			let bot = limit(this.pos.y+dist, 1, 48)
			let right = limit(this.pos.x+dist, 1, 48)
			let source =this.room.lookForAtArea(LOOK_SOURCES, top,left,bot,right, true)
			this._cache.isProvider = source.length
		}	
		return this._cache.isProvider;
	}

	StructureController.prototype.handleActivateSafemode = function() {
		let result = this.activateSafeMode();
		this.room.memory.reinforce = Math.max(Game.time + 25000, this.room.memory.reinforce || 0);
		this.room.memory.roomBreached = Game.time + SAFE_MODE_COOLDOWN;



		if (result === ERR_BUSY && this.level >= 5) {
			
			// Check if a "useless" safemode is active and if so remove the room
			let myLowLevelRooms = getMyRoomsBelowPrcl(4)

			for (let roomName in myLowLevelRooms) {				
				if (Memory.rooms[roomName] && getRoomRCL(roomName)<= 3 && roomIsSafeModed(roomName)) {	// better doubble check this!
					unclaimController(Game.rooms[roomName].controller);
					log(this.room.name + " handleActivateSafemode unclaimed room " + roomName + " to save itself!")
					return result; // return here to not trigger abandon ship
				}
			}
		}
		
		if (result !== OK && this.room.terminal) {
			this.room.memory.evacRes = Game.time + 7500;
			global.ABANDON_SHIP[this.room.name] = {};

			if (this.room.memory.hostiles && this.room.memory.hostiles.player) {
				addRage(this.room.memory.hostiles.player, 50000);
			}
		}

		return result;
	}

	global.evacuateTerminalResources = function(terminal, evacEnergy=true) {

		if (!terminal || terminal.__cooldown > 0 || terminal.store[RESOURCE_ENERGY] < 1000) { return false; }

		let roomName = terminal.room.name
		let dist;
		let shortestDist = 100;
		let targetTerminal;
		for (let room in Memory.Minerals.Labs){
			if (room === roomName) { continue }
			if (!Game.rooms[room] || !Game.rooms[room].terminal) { continue }
			if (isAbandonedRoom(room)) { continue }
							
			let freeSpaceRemote = Game.rooms[room].terminal.freeSpace + Game.rooms[room].storage.freeSpace;				
			if (freeSpaceRemote < 25000) { continue; }

			dist = Game.map.getRoomLinearDistance(roomName, room);					
			if (dist < shortestDist) {
				targetTerminal = room
				shortestDist = freeSpaceRemote
			}
		}

		
		if (targetTerminal) {
			let amountToSend = 10000
			let cost = Game.market.calcTransactionCost(amountToSend, roomName, targetTerminal);
			let maxAffordableSend = Math.floor(terminal.store[RESOURCE_ENERGY] / (cost / amountToSend))
			amountToSend = Math.min(maxAffordableSend, amountToSend, Game.rooms[targetTerminal].terminal.freeSpace)
			
			// START WITH T3 BOOSTS
			for (let res in T3_BOOSTS){ 
				let boost = T3_BOOSTS[res]
				if (!terminal.store[boost]) { continue } 
				if (terminal.store[boost] < TERMINAL_MIN_SEND) { continue }	
				amountToSend = limit(amountToSend, 0, terminal.store[boost])
				let result = terminal.send(boost, amountToSend, targetTerminal)
				log(roomName+ " evacuating " +boost+ " - " +amountToSend+ " to " +  targetTerminal + " (cost " + cost +") result " +result)
				return 1;
			}

			// THEN OTHER MINERALS
			for (let res in terminal.store){
				if (terminal.store[res] < 100 && BASE_MINERALS_OBJECT[res]) { continue }
				if (res === RESOURCE_ENERGY) { continue }
				amountToSend = limit(amountToSend, 0, terminal.store[res])
				let result = terminal.send(res, amountToSend, targetTerminal)					
				log(roomName+ " evacuating " +res+ " - " +amountToSend+ " to " +  targetTerminal + " (cost " + cost +") result " +result)
				return 1;
			}

			// LAST SHIP OUT ENERGY
			if (evacEnergy && terminal.store[RESOURCE_ENERGY] > TERMINAL_MIN_SEND) {

				let keepEnergy = 5000;
				if (terminal.room.memory.rebuild) {
					keepEnergy = 200000;
				}

				if (terminal.room.store(RESOURCE_ENERGY) < keepEnergy) {
					terminal.room.memory.evacuatedResources = 1;
					return 0;
				}

				amountToSend = limit(amountToSend, 0, terminal.store[RESOURCE_ENERGY])	
				cost = Game.market.calcTransactionCost(amountToSend, roomName, targetTerminal)
				amountToSend = amountToSend - cost;
				let result = terminal.send(RESOURCE_ENERGY, amountToSend, targetTerminal)					
				log(roomName+ " evacuating " +RESOURCE_ENERGY+ " - " +amountToSend+ " to " +  targetTerminal + " (cost " + cost +") result " +result)
				terminal.room.wakeCraneBalancer();
				return 1;
			}
		} else {
			console.log("no evacuate terminal found for " + roomName)
		}
		return 1;
	}
	
	StructureTerminal.prototype.handleTerminal = function() {
		if (this.__cooldown > 0) { return 0 }
		if (this.store[RESOURCE_ENERGY] < 1000) { return 0 }

		let roomName = this.room.name;

		// IF ABANDON 
		if (isAbandonedRoom(roomName)) {

			evacuateTerminalResources(this, true);
			return 1; // WHEN EVACUATING, STOP HERE
		}
		
		// CHECK IF WE NEED TO SEND BOOSTS
		if (Memory.combatBoost !== undefined) {				
			let minimumLocalStock = 0;
			for (let room in Memory.combatBoost){
				if (Memory.combatBoost[room].stockedTs > Game.time) { continue; }
				if (isAbandonedRoom(room)) { continue; }				
				if (room === roomName) { continue; }
				if (!Game.rooms[room] || !Game.rooms[room].terminal) { continue; }	
				let roomIsStocked = true;
			//	let combatBoosts = getMyBestBoosts();
				let combatBoosts = {};
				let wantedBoosts = Object.assign(combatBoosts, Memory.combatBoost[room].boosts);

				for (let boostType in wantedBoosts) {
					if (Game.rooms[room].store(boostType) < MIN_T3_COMBAT_BOOSTS) {
						roomIsStocked = false;	

						if (Memory.combatBoost[roomName] && Memory.combatBoost[roomName].boosts && Memory.combatBoost[roomName].boosts[boostType])  { 
							minimumLocalStock = 5000; 
						} else {
							minimumLocalStock = 0; 
						}
						if (this.store[boostType] > minimumLocalStock) {							
							if (Game.rooms[room].terminal.freeSpace < 2000) { break; }
							let amountToSend = limit(this.store[boostType], 0, 3000);
							if (amountToSend < TERMINAL_MIN_SEND) { continue; }
							let result = this.send(boostType, amountToSend, room);
							console.log(roomName+ " sending " +amountToSend+ " " +boostType + " to " +  room + " result " + result);
							if (result === OK) {
								return 1;
							}
						}
					}
				}
				
				if (roomIsStocked) {
					Memory.combatBoost[room].stockedTs = Game.time + 79;
				}
			}
		}
		
		// SEND ONE TIME TRADES
		for (let dest in SEND_ONE_TIME){
			if (Memory.sendOneTime === undefined) { Memory.sendOneTime  = {} }
			if (Memory.sendOneTime[dest] === undefined) { Memory.sendOneTime[dest]  = {} }
			for (let res in SEND_ONE_TIME[dest]){
				if (Memory.sendOneTime[dest][res] === undefined) { Memory.sendOneTime[dest][res]  = 0 }		
				if (Memory.sendOneTime[dest][res] >= SEND_ONE_TIME[dest][res]) { continue }			
				let remainingAmount = SEND_ONE_TIME[dest][res] - Memory.sendOneTime[dest][res]				
				let amountToSend = 1000
				let minLocal = 0;
				if (BASE_MINERALS_OBJECT[res]) {
					minLocal = BUY_MINERAL_BELOW;
				}
				if (remainingAmount > 0 && this.store[res] && this.store[res] > 0 && this.room.store(res) > minLocal) {
					let cost = Game.market.calcTransactionCost(amountToSend, roomName, dest) 
					
					amountToSend = Math.floor((cost / amountToSend)*this.store[RESOURCE_ENERGY])
					amountToSend = limit(amountToSend, 0, remainingAmount)
					amountToSend = limit(amountToSend, 0, (this.room.store(res)-minLocal))					
					amountToSend = limit(amountToSend, 0, this.store[res])
					if (res == RESOURCE_ENERGY) {
						cost = Game.market.calcTransactionCost(amountToSend, roomName, dest) 
						amountToSend = limit(amountToSend, 0, (this.store[res]-cost))
					}
					if (amountToSend > 0) {
						let result = this.send(res, amountToSend, dest)
						if (result === OK) {
							Memory.sendOneTime[dest][res] += amountToSend
							console.log(roomName +" completed part of one time trade " + amountToSend + " " + res + " to " +dest + "! now sent " +Memory.sendOneTime[dest][res] + "/"+SEND_ONE_TIME[dest][res] )
							return 1;
						} else {
							console.log(roomName +" failed one time trade " + amountToSend + " " + res + " to " +dest + "! now sent " +Memory.sendOneTime[dest][res] + "/"+SEND_ONE_TIME[dest][res] + " error " +result)
						}
					}
				}				
			}
		}

		
		// CHECK IF WE NEED TO SEND MINERALS
		if (Memory.Minerals.mineralShare && Memory.Minerals.mineralShare[roomName]) {

		//	for (let idx in BASE_MINERALS){	
			for (let res in Memory.Minerals.mineralShare[roomName]){	
			//	let res = BASE_MINERALS[idx]			
				if (Memory.Minerals.mineralRecieve[res] === undefined) { continue; }
			//	console.log(roomName + " wants to share " + res + " targets " + Memory.Minerals.mineralRecieve[res] + " - " + Game.rooms[roomName].store(res));
				let resToSend = MINERAL_MIN_SEND;
				if (!this.store[res]) { continue; }
				
				
				if (res === RESOURCE_POWER && Memory.Minerals.PS) {
					// POWER
					let availbaleToSend = this.room.store(res) - 5000
					if (availbaleToSend < 100 ) { continue }
					for (let room in Memory.Minerals.PS){
						if (isAbandonedRoom(room) ) { continue }
						let remoteRoom = Game.rooms[room]
						let currentFreeSpace = remoteRoom.terminal.freeSpace;
						if (currentFreeSpace > 0 && Game.rooms[room].store(RESOURCE_POWER) < 2500 ) {								

							let cost = Game.market.calcTransactionCost(resToSend, roomName, room)
							let maxAffordableSend = Math.floor(this.store[RESOURCE_ENERGY] / (cost / resToSend))	
							resToSend = limit(this.store[RESOURCE_ENERGY]/2, 0, currentFreeSpace)
							let remoteAccept = 5000 - remoteRoom.store(res)
							let currentMaxSend = Math.min(currentFreeSpace, availbaleToSend, maxAffordableSend, remoteAccept, this.store[res])
							if (currentMaxSend < TERMINAL_MIN_SEND) { continue }
							let result = this.send(res, currentMaxSend, room)
							console.log(roomName+ " sending " + currentMaxSend+ " " + res + " to " + room + " result " + result)
							return 1;
						}
					}
				} else {
					// MINERALS
					let minReserve = 0
					if (Memory.Minerals.Labs[roomName] !== undefined) { // i have my own lab
						minReserve = MINERAL_MIN_AMOUNT_STORED 
					}

					let rawResStored = this.room.store(res);
					let availbaleToSend = rawResStored - minReserve

					let bars = COMPRESSED_RESOURCE_FROM_RAW[res].raw;
					let compressedResStored = this.room.store(bars) * BAR_PACK_RATIO;


					if (availbaleToSend + compressedResStored < resToSend) { continue }
					for (let room in Memory.Minerals.mineralRecieve[res]){
					//	console.log("checking recieve of " + res + " in " + room + " " + Game.rooms[room].store(res))
						if (room === roomName) { continue; }
						let remoteRoom = Game.rooms[room];
						if (!remoteRoom.terminal) { continue }
						if (isAbandonedRoom(room) ) { continue }

						let remoteMinReserve = BUY_MINERAL_BELOW 
						if (SEASONAL_SCORE && res === RESOURCE_SCORE) {
							remoteMinReserve *= 5;
						}

						if (this.freeSpace < 5000 || PRAISE_GCL_ROOMS[roomName]) {	// ATTEMPT TO SEND MORE
							remoteMinReserve = BUY_MINERAL_BELOW * 2
						}

						let remoteRoomStored = remoteRoom.store(res)
						let myResAmount = rawResStored;
						let mineralToSend = res;
						if (Game.rooms[room].hasFactory() ) {
							remoteRoomStored += remoteRoom.store(bars) * BAR_PACK_RATIO;
							if (remoteRoomStored <= 100 && this.store[bars]) {
								mineralToSend = bars;
								resToSend = resToSend / BAR_PACK_RATIO
							}
							
						//	myResAmount += compressedResStored
						}


						if (myResAmount > (minReserve+resToSend) &&
							(remoteRoomStored < remoteMinReserve))  {
							if (remoteRoom.terminal.freeSpace >= BUY_MINERAL_BELOW){
								let cost = Game.market.calcTransactionCost(resToSend, roomName, room) 				
							//	if (cost >= resToSend) { continue }	
								let remoteAccept = remoteMinReserve - remoteRoomStored										
								let maxAffordableSend = Math.floor(this.store[RESOURCE_ENERGY] / (cost / resToSend))
								let currentMaxSend = Math.min(remoteRoom.terminal.freeSpace, availbaleToSend, maxAffordableSend, remoteAccept, this.store[mineralToSend])									
								if (currentMaxSend < TERMINAL_MIN_SEND) { continue }
								let result = this.send(mineralToSend, currentMaxSend, room)
								console.log(roomName+ " sending " + currentMaxSend+ " " + mineralToSend + " to " + room + " result " + result)
								return 1;
							}
						}
						
					}
				}
			}			
		}

		// SEND EXCESS ENERGY
		if (Memory.energyShare !== undefined && Memory.energyShare.recieve !== undefined){
			if (!Memory.PraiseGCL[roomName] && Memory.energyShare[roomName] !== undefined && this.store[RESOURCE_ENERGY] >= 5000 ) {
				
				let minimumEnergyLevel = ECONOMY_DEVELOPING;
				let myEnergyStock = Game.rooms[roomName].store(RESOURCE_ENERGY);

				if (this.room.warEffortActive() ||
					this.room.memory.newRCL
				){
					minimumEnergyLevel = ECONOMY_SURPLUS;
				}
				if (Game.rooms[roomName].energyStatus() >= minimumEnergyLevel) {
					let energyToSend = limit(this.store[RESOURCE_ENERGY], 0, ENERGYSHARE_SEND_AMOUNT);
					let lowestRecieveTarget;
					let currentFreeSpace = 0;
					let lowestRecieveTargetEnergy = Infinity;
					for (let reciver in Memory.energyShare.recieve){
						if (isAbandonedRoom(reciver) || !Game.rooms[reciver]) { continue; }
						if (Memory.PraiseGCL[reciver] && myEnergyStock < ENERGYSHARE_GCL_MINSTORED ) { continue; }	// Only send to GCL praise room if overflow

						if (Memory.rooms[reciver].mineOnly && Game.rooms[reciver].terminal && Game.rooms[reciver].store(RESOURCE_ENERGY) >= 50000) { continue; }

						let wantedAmount = Memory.energyShare.recieve[reciver].amount || 50000;
						if (Game.rooms[reciver].store(RESOURCE_ENERGY) > wantedAmount) { continue; }

						let allowedRatio = 0.55;
						if (Memory.energyShare.recieve[reciver].pushRCL) {
							
							if (Game.rooms[reciver].store(RESOURCE_ENERGY) >= myEnergyStock * 2 ||
								(Game.rooms[reciver].store(RESOURCE_ENERGY) >= (Game.rooms[reciver].controller.progressTotal - Game.rooms[reciver].controller.progress) && Game.rooms[reciver].store(RESOURCE_ENERGY) >= myEnergyStock) ||
								myEnergyStock < 50000
							) {
								continue;
							}

							if (getRoomPRCL(roomName) === 8) {
							//	allowedRatio = 0.50;
							} else if (Game.rooms[roomName].energyStatus() >= ECONOMY_SURPLUS) {
								allowedRatio = 0.35;
							} else {
								allowedRatio = 0.15;
							}

						} else if (Game.rooms[reciver].store(RESOURCE_ENERGY) >= myEnergyStock * 0.9 ) {
							continue;
						}

						if (Game.rooms[reciver].store(RESOURCE_ENERGY) < lowestRecieveTargetEnergy) {
							if (!Game.rooms[reciver].terminal || Game.rooms[reciver].controller.level < 6 ) { continue; }
							if (Game.rooms[reciver].terminal.freeSpace > 5000) {
								let costToSend = Game.market.calcTransactionCost(energyToSend, roomName, reciver);
								if ((costToSend / energyToSend) > allowedRatio) {
								
									// Can send batteries instead?
									if (getRoomRCL(reciver) < 8 ||
										this.store[RESOURCE_BATTERY] < 50 || 
										!Game.rooms[reciver].hasFactory() || 										
										Game.rooms[reciver].storeWithFactory(RESOURCE_BATTERY) > (maxStoreInRoom(RESOURCE_BATTERY) * 3)
									) {
										continue;
									}
									//	console.log("skipping energy send, cost " +  costToSend + " energy send " + energyToSend+ " ratio " + (costToSend / energyToSend) + " allowed ratio " + allowedRatio)
																		
								}
								lowestRecieveTarget = reciver;
								lowestRecieveTargetEnergy = Game.rooms[reciver].store(RESOURCE_ENERGY);
							}
						}
					}

					// SHARE WITH ALLIES
					if (!lowestRecieveTarget || lowestRecieveTargetEnergy > 50000) {
						for (let room in Memory.energyShare.recieveAllies){
							if (Memory.energySharedToAllies === undefined) { Memory.energySharedToAllies = {} }

							if (Memory.energySharedToAllies[room] === undefined) { 						
								Memory.energySharedToAllies[room] = {};
								Memory.energySharedToAllies[room].amount = 0;
								Memory.energySharedToAllies[room].tsNextSend = 0;
							}

							if (Memory.energySharedToAllies[room].tsNextSend < Game.time) {							
								let costToSend = Game.market.calcTransactionCost(energyToSend, roomName, room) 
								energyToSend -= costToSend
								if (energyToSend < TERMINAL_MIN_SEND) { continue }
								let result = this.send(RESOURCE_ENERGY, energyToSend, room)

								console.log(roomName+ " sending " + energyToSend + " energy (cost " +costToSend + ") to ally : " + room + " result " + result)
								if (result === OK) {
									Memory.energySharedToAllies[room].amount += energyToSend
									Memory.energySharedToAllies[room].tsNextSend = Game.time + ENERGYSHARE_ALLIES_TIMER
									return 1;
								}
							}
						}
					}

					if (lowestRecieveTarget) {					
						let costToSend = Game.market.calcTransactionCost(energyToSend, roomName, lowestRecieveTarget) 
						

						let resToSend;

						if ((costToSend / energyToSend) > 0.17 &&
							this.store[RESOURCE_BATTERY] > 50 && 
							Game.rooms[lowestRecieveTarget].hasFactory() &&
							Game.rooms[lowestRecieveTarget].storeWithFactory(RESOURCE_BATTERY) <= 1000
						) {
							// Send batteries instead
							resToSend = RESOURCE_BATTERY;
							energyToSend = Math.min(this.store[RESOURCE_BATTERY], energyToSend/10)
						} else {
							// Send energy
							resToSend = RESOURCE_ENERGY;
							energyToSend -= costToSend
						}

						let result = this.send(resToSend, energyToSend, lowestRecieveTarget)
						console.log(roomName+ " sending " + energyToSend +  resToSend + " (cost " +costToSend + ") to : " + lowestRecieveTarget + " current energy "+lowestRecieveTargetEnergy+ " result " + result)
						return 1;
					}
				}
			}
		}
	
		// SHARE MINERALS
		let amountToSell = 1000
		if (this.store[RESOURCE_ENERGY] >= (amountToSell*2) && Memory.Minerals.Share !== undefined ) {
			for (let res in Memory.Minerals.Share){
				let availableToSell = Game.rooms[roomName].store(res) - MINERAL_MIN_AMOUNT_STORED
			//	console.log(roomName + " selling " + res + " i have " + availableToSell  +" min " + MINERAL_MIN_AMOUNT_STORED)				
				if (this.store[res] && 
					Memory.Minerals.Share[res] >= amountToSell &&
					availableToSell > amountToSell
					){
					if (global.mineralShare && global.mineralShare[res]) {
						amountToSell = 1000;
					//	console.log("mineral share "  + res)
						for (let room in global.mineralShare[res]) {
							if (!room) { continue; }
							if (isAbandonedRoom(room)) { continue }
							let cost = Game.market.calcTransactionCost(amountToSell, roomName, room);
							let maxAffordableSell = Math.floor(this.store[RESOURCE_ENERGY] / (cost / amountToSell))
							let amountToSend = Math.min(1000, maxAffordableSell, this.store[res] );
							let result = this.send(res, amountToSend, room);
							console.log("mineralShare sending " + res + " to " + room + " result " + result);
							if (result === OK) {
								Memory.Minerals.Share[res] -= amountToSend;
								delete global.mineralShare[res][room]
								return 1;
							}
						}
					}
				}
			}
		}

		// CLEAR SPACE
		let freeSpace = this.freeSpace;
		delete this.room.memory.burnEnergy;
		
		if (this.room.storage) {
			freeSpace += this.room.storage.freeSpace;
		}

		let wantedFreeSpace = 25000;
		if (isGCLPraiseRoomStandby(this.room.name)) {
			wantedFreeSpace = 40000;
		}

		let clearSpace = false;		
		if (freeSpace < wantedFreeSpace) {
			if (isGCLPraiseRoomStandby(this.room.name)) {
				if (this.room.store(RESOURCE_ENERGY) < 1900000) {
					clearSpace = true;
				}
			} else {
				clearSpace = true;
			}
		}		
		
		if (clearSpace) {

			let allowEnergyRemoval = (this.room.energyStatus() > ECONOMY_STABLE && !isGCLPraiseRoomStandby(this.room.name) && !PUSH_RCL_TARGETS[roomName] && (!Memory.energyShare.recieve || !Memory.energyShare.recieve[roomName]))
			if (allowEnergyRemoval) {
				this.room.memory.burnEnergy = Game.time + 799;
			}

			// CHECK MY ROOMS IF FREE SPACE	
			let bestFreeSpace = 100000;
			let targetTerminal;	
			for (let room in Memory.Minerals.Labs){
				if (room === roomName) { continue }
				if (!Game.rooms[room].terminal) { continue }
				if (isAbandonedRoom(room)) { continue }
				if (!allowEnergyRemoval && isGCLPraiseRoomStandby(room)) { continue }
				if (Memory.rooms[room].mineOnly) { continue; }
				
				let freeSpaceRemote = Game.rooms[room].terminal.freeSpace + Game.rooms[room].storage.freeSpace
				if (freeSpaceRemote > bestFreeSpace && Game.rooms[room].terminal.freeSpace > 45000) {
					targetTerminal = room
					bestFreeSpace = freeSpaceRemote
				}
			}

		//	log(roomName + " store overflow, free space " +freeSpace+ "! found target terminal " + targetTerminal + " has free space " + bestFreeSpace)

			

			if (targetTerminal) {		

				// What to send?
				let bestRes;
				let bestScore = 0;
				for (let res in this.store) {
					let amount = this.room.store(res);					
					if (amount < 500) { continue; }
				//	let score = amount / 50000;
					let score = amount;
					score += this.store[res]

					if (!allowEnergyRemoval && (res === RESOURCE_ENERGY || res === RESOURCE_BATTERY)) {						
						continue;
					}

					if (score > bestScore) {
						bestScore = score;
						bestRes = res;
					}
				}

				if (bestRes) {
					let cost = Game.market.calcTransactionCost(amountToSell, roomName, targetTerminal);
					let maxAffordableSell = Math.floor(this.store[RESOURCE_ENERGY] / (cost / amountToSell))
					let amountToSend = Math.min(5000, maxAffordableSell, this.store[bestRes], bestFreeSpace );
					let result = this.send(bestRes, amountToSend, targetTerminal);
					log(roomName+ " overflow sending " +amountToSend + " " +bestRes+ " to " +  targetTerminal + " (cost " + cost +") result " +result)
					this.room.wakeCraneBalancer();
					return 1;
				} else if (allowEnergyRemoval) {
					let amountToSend = 20000;
					let cost = Game.market.calcTransactionCost(amountToSend, roomName, targetTerminal);
					amountToSend = Math.floor((cost / amountToSend)*this.store[RESOURCE_ENERGY]);
					amountToSend = limit(amountToSend, 0, Game.rooms[targetTerminal].terminal.freeSpace);
					amountToSend = limit(amountToSend, 0, this.store[RESOURCE_ENERGY]);
					amountToSend = limit(amountToSend, 0, 20000);
					cost = Game.market.calcTransactionCost(amountToSend, roomName, targetTerminal);
					amountToSend = amountToSend - cost;
					let result = this.send(RESOURCE_ENERGY, amountToSend, targetTerminal);
					log(roomName+ " overflow " +RESOURCE_ENERGY+ " - " +amountToSend+ " to " +  targetTerminal + " (cost " + cost +") result " +result)
					return 1;
				} 
				
			} else {
				
				
				let traded
				let totalEnergy = this.room.store(RESOURCE_ENERGY) 

				
				let bestScore = 0;
				let bestRes;
				let bestOrder;
				// Sell something that is stocked more than energy?
				for (let res in this.store) {
					if (res === RESOURCE_ENERGY) { continue; }
					let amount = this.room.store(res);					
					if (amount < totalEnergy || amount < 1000) { continue; }
					if (!this.store[res]) { continue; }

					let score = amount;

					if (score > bestScore) {
						let foundOrder = undefined;
						let orders = getMarketBuyOrders(res);
						for (let i=0; i < orders.length; i++) {
							let order = orders[i];
			
							if (order.amount < 1000 ) { continue; }
							if (order.remainingAmount < 1000 ) { continue; }
			
							if (!marketMineralSensiblePrice(order.price, res, ORDER_BUY)) { break; }

							foundOrder = order;
							break;
						}

						if (foundOrder) {
							bestOrder = foundOrder; 
							bestScore = score;
							bestRes = res;
						}
					}
				}

				
				if (bestOrder && bestRes) {
					amountToSell = 5500-this.freeSpace;
					let cost = Game.market.calcTransactionCost(amountToSell, roomName, bestOrder.roomName);
					let maxAffordableSell = Math.floor(this.store[RESOURCE_ENERGY] / (cost / amountToSell));
					let currentMaxSell = Math.min(bestOrder.amount, maxAffordableSell, this.store[bestRes], 5000);
					let result = Game.market.deal(bestOrder.id, currentMaxSell, roomName); 
					log(roomName + " " + bestRes + " overflow selling " +currentMaxSell + ' units, completed with result ' +result +' order room ' + bestOrder.roomName+ ". order had "+bestOrder.amount + " units for " +bestOrder.price ); 
					if (result === OK) {
						this.__cooldown = TERMINAL_COOLDOWN;
						this.room.wakeCraneBalancer();

						return 1;
					}
				}

				if (!traded && allowEnergyRemoval){
					// Sell energy!				
					amountToSell = 5500-this.freeSpace;
					if (amountToSell > TERMINAL_MIN_SEND) {
						let orders = getMarketBuyOrders(RESOURCE_ENERGY);	
						for (let i=0; i < orders.length; i++) {
							let cost = Game.market.calcTransactionCost(amountToSell, roomName, orders[i].roomName);
							let maxAffordableSell = Math.floor(this.store[RESOURCE_ENERGY] / (cost / amountToSell));
							let currentMaxSell = Math.min(orders[i].amount, maxAffordableSell, this.store[RESOURCE_ENERGY]-cost, 5000);
							let result = Game.market.deal(orders[i].id, currentMaxSell, roomName); 
							
							log(roomName + " " + RESOURCE_ENERGY + " overflow selling " +currentMaxSell + ' units, completed successfully to ' +orders[i].roomName+ ". order had "+orders[i].amount + " units for " +orders[i].price ); 
							if (result === OK) {
								this.__cooldown = TERMINAL_COOLDOWN;
								return 1;
							}
							
						}
					}
				}
			}
		}

		// SELL COMMODITIES
		let minStock = 0.25;
		if (BOT_MODE) { minStock = 0; }

		if (this.store[Memory.comodityToProcude] && this.store[Memory.comodityToProcude] >= maxStoreInRoom(Memory.comodityToProcude) * minStock) {
			let orders = getMarketBuyOrders(Memory.comodityToProcude);
			amountToSell = this.store[Memory.comodityToProcude];

			let bestPrice = 0;
			let bestOrder;
			let bestPlayerPrice = 0;
			let bestPlayerOrder;
			for (let i=0; i < orders.length; i++) {
				let order = orders[i];

				if (order.amount < 1 ) { continue; }
				if (order.remainingAmount < 1 ) { continue; }

				if (!roomIsHW(order.roomName)) { 
					if (order.price > bestPlayerPrice) {
						bestPlayerPrice = order.price;
						bestPlayerOrder = order;
					}
					continue;
				}

				if (!marketMineralSensiblePrice(order.price, Memory.comodityToProcude, ORDER_BUY)) { break; }

				if (USE_SHARDS && !interShardLocalPriceBest(order.price, Memory.comodityToProcude, ORDER_BUY, 1)) {				
					continue;
				}

				if (order.price > bestPrice) {
					bestPrice = order.price;
					bestOrder = order;
				}
				break;
			}

			if (bestPlayerPrice > bestPrice * 1.3) {
				bestOrder = bestPlayerOrder;
			}

			if (bestOrder) {
				let cost = Game.market.calcTransactionCost(amountToSell, roomName, bestOrder.roomName);
				let maxAffordableSell = Math.floor(this.store[RESOURCE_ENERGY] / (cost/amountToSell));
				let result = Game.market.deal(bestOrder.id, amountToSell, roomName);
				
				if (result === OK) {
					// Recalc in case no more good orders left!
					Memory.comToProduceTs = Game.time;
					this.__cooldown = TERMINAL_COOLDOWN;
					console.log(roomName + " " + Memory.comodityToProcude+ " selling " +amountToSell + ' units, completed successfully to ' +bestOrder.roomName+ ". order had "+bestOrder.amount + " units for " +bestOrder.price ); 
					return 1;
				}

			}
		}
	}
		
	
/*	
StructureTower.getDamageValue = function(range) {
	let effect = TOWER_POWER_ATTACK;
    if(range > TOWER_OPTIMAL_RANGE) {
        if(range > TOWER_FALLOFF_RANGE) {
            range = TOWER_FALLOFF_RANGE;
        }
        effect -= effect * TOWER_FALLOFF * (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
    }
    return Math.floor(effect);
}*/
/* Sample
	StructureTower.getRepairValue = function(range) {	
		let effect = TOWER_POWER_REPAIR;
		if(range > TOWER_OPTIMAL_RANGE) {
			if(range > TOWER_FALLOFF_RANGE) {
				range = TOWER_FALLOFF_RANGE;
			}
			effect -= effect * TOWER_FALLOFF * (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
		}
		return Math.floor(effect);
	}

	StructureTower.getHealValue = function(range) {
		let effect = TOWER_POWER_HEAL;
		if(range > TOWER_OPTIMAL_RANGE) {
			if(range > TOWER_FALLOFF_RANGE) {
				range = TOWER_FALLOFF_RANGE;
			}
			effect -= effect * TOWER_FALLOFF * (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
		}
		return Math.floor(effect);
	}

	global.TOWER_DAMAGE_EFFECT = [];
	global.TOWER_REPAIR_EFFECT = [];
	global.TOWER_HEAL_EFFECT = [];
	for(let i=0; i<50; i++) {
		TOWER_DAMAGE_EFFECT[i] = StructureTower.getDamageValue(i);
		TOWER_REPAIR_EFFECT[i] = StructureTower.getRepairValue(i);
		TOWER_HEAL_EFFECT[i] = StructureTower.getHealValue(i);
	}
*/		

}