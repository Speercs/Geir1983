'use strict'
module.exports = function() {

	RoomPosition.prototype.isRoomPosition = true;

	global._roomCache = {};
	Object.defineProperty(Room.prototype, '_cache', {
        get: function() {            
            return global._roomCache[this.name] = global._roomCache[this.name] || {};
        },
        set: function(value) {            
            global._roomCache[this.name] = value;
        },
		enumerable: false,
		configurable: true
    });

	global.getRoomCache = function(roomName) {
		return global._roomCache[roomName] = global._roomCache[roomName] || {};
	}

	Object.defineProperty(Room.prototype, '_memory', {
        get: function() {            
            return Memory.rooms[this.name] = Memory.rooms[this.name] || {};
        },
        set: function(value) {            
            Memory.rooms[this.name] = value;
        },
		enumerable: false,
		configurable: true
    });

	global._roomPosCache = {};
	Object.defineProperty(RoomPosition.prototype, '_cache', {
        get: function() {
            return global._roomPosCache[posId(this)] = global._roomPosCache[posId(this)] || {};
        },
        set: function(value) {            
            global._roomPosCache[posId(this)] = value;
        },
		enumerable: false,
		configurable: true
    });

	

	
	

	Object.defineProperty(Structure.prototype, "total", {  
		configurable: true,  
		get: function () {    
		if (this._storage_sum !== undefined) {      
			return this._storage_sum;    }
		else {     
			this._storage_sum = _.sum(this.store);
			return this._storage_sum;
			} 
		}, 
		enumerable: false,
		configurable: true
	});
	
	Object.defineProperty(Structure.prototype, 'total', {
		configurable: true,
		get: function() {
		if(this.room.memory.storageTimeStamp == undefined || this.room.memory.storageTimeStamp != Game.time) {
			this.room.memory.storageTimeStamp = Game.time;
			if(this.store != undefined) {
				this.room.memory.storageTotal = _.sum(this.store);
			 } else {
				this.room.memory.storageTotal = undefined;
			 }
		}
			return this.room.memory.storageTotal;
		},
		enumerable: false,
		configurable: true
	});  

	Room.prototype.getControllerContainerPos = function(force = false) {
		if (Memory.rooms[this.name][R.CONTROLLER_CONT_POS]) {
			return posDecompress(Memory.rooms[this.name][R.CONTROLLER_CONT_POS], this.name)
		}

	}


	Room.prototype.getControllerContainer = function(force = false) {
		if (!this._cache.getControllerContainer || force) {

			this._cache.getControllerContainer = []
			if (Memory.rooms[this.name][R.CONTROLLER_CONT_POS]) {
				let contPos = posDecompressXY(Memory.rooms[this.name][R.CONTROLLER_CONT_POS], this.name)
				let container = lookForStructureAt(STRUCTURE_CONTAINER, contPos);
				if (container) {
					this._cache.getControllerContainer.push(container.id)
				}
			} 

			if (this._cache.getControllerContainer.length < 0) {
				let container = _.filter(this.findByType(STRUCTURE_CONTAINER), 
				function(structure) {return (structure.isController() ) });
				for (let idx in container) {
					this._cache.getControllerContainer.push(container[idx].id)
				}
			}
			
		}

		let returnValue = [];
		for (let idx in this._cache.getControllerContainer) {
			let cnt = Game.getObjectById(this._cache.getControllerContainer[idx])
			if (!cnt) { 				
				return this.getControllerContainer(true);
			}
			returnValue.push(cnt)
		}
		return returnValue;
	}

	Room.prototype.getStoreCraneExtensions = function(force = false, skipIfActiveCrane=false, updateTs=false) {
		if (!this._cache.storeCraneExtensions || Game.time > this._cache.storeCraneExtensionsTs || force) {
			
			this._cache.storeCraneExtensionsTs = Game.time + 37;
			this._cache.storeCraneExtensions = [];

			for (let idx in Memory.rooms[this.name].craneExtPos) {
				let pos = posDecompressXY(Memory.rooms[this.name].craneExtPos[idx], this.name);
				let ext = lookForStructureAt(STRUCTURE_EXTENSION, pos);
				if (ext && ext.isActive) {
					this._cache.storeCraneExtensions.push(ext.id);
				}
			}
		}

		let returnValue = [];
		for (let idx in this._cache.storeCraneExtensions) {
			let ext = Game.getObjectById(this._cache.storeCraneExtensions[idx])
			if (!ext) {
				return this.getStoreCraneExtensions(true, skipIfActiveCrane, updateTs);
			}

			if (updateTs) {	ext.pos._cache.craneTs = Game.time + 73; }
			if (skipIfActiveCrane && ext.pos._cache.craneTs && Game.time < ext.pos._cache.craneTs) { continue; }
			returnValue.push(ext)
		}
		return returnValue;
	}


	Room.prototype.getSpawnContainerPos = function(){
		if (!this._cache.getSpawnContainerPos || this._cache.getSpawnContainerPosTs !== Game.time ) {
			this._cache.getSpawnContainerPosTs = Game.time;
			if (!Memory.rooms[this.name].spawnContPos) { return [] }
			this._cache.getSpawnContainerPos = packrat.unpackPosList(Memory.rooms[this.name].spawnContPos);
		}
		return this._cache.getSpawnContainerPos || [];
	}

	Room.prototype.getSpawnContainers = function(force = false) {
		if (!this._cache.spawnContainersArray || force) {
			this._cache.spawnContainersArray = []
			let spawnContainerPos = this.getSpawnContainerPos();
			for (let idx in spawnContainerPos) {
				let container = spawnContainerPos[idx].lookForStructure(STRUCTURE_CONTAINER) 
				if (container) {
					this._cache.spawnContainersArray.push(container.id)
					container._cache.isSpawner = true;
				}
			}
		}

		let returnValue = [];
		for (let idx in this._cache.spawnContainersArray) {
			let cnt = Game.getObjectById(this._cache.spawnContainersArray[idx])
			if (!cnt) { 				
				return this.getSpawnContainers(true);
			}
			returnValue.push(cnt)
		}
		return returnValue;

	}

	Room.prototype.getSpawnFillerPos = function(){
		if (!this._cache.getSpawnFillerPos || this._cache.getSpawnFillerPosTs !== Game.time ) {
			this._cache.getSpawnFillerPosTs = Game.time;
			if (!Memory.rooms[this.name].spawnFillerPos) { return [] }
			this._cache.getSpawnFillerPos = packrat.unpackPosList(Memory.rooms[this.name].spawnFillerPos);
		}
		return this._cache.getSpawnFillerPos || [];
	}

	RoomPosition.prototype.getSpawnFillerExtensions = function(force=false){
		
		if (!this._cache.getSpawnFillerExtensions || force) {
			
			this._cache.getSpawnFillerExtensions = [];
			let extensions = this.findInRange(FIND_MY_STRUCTURES, 1, {
				filter: (structure) => {
					return (structure.structureType == STRUCTURE_EXTENSION && structure.isActive());
				}
			});
			for (let idx in extensions) {
				this._cache.getSpawnFillerExtensions.push(extensions[idx].id);
			}
		}

		let returnValue = []
		for (let idx in this._cache.getSpawnFillerExtensions) {
			let ext = Game.getObjectById(this._cache.getSpawnFillerExtensions[idx]);
			if (!ext) { 
				delete this._cache.getSpawnFillerExtensions;
				return returnValue
			}
			returnValue.push(ext)
		}
		return returnValue;
	}

	Room.prototype.wakeCraneBalancer = function() {
		let creeps = this.find(FIND_MY_CREEPS, {
			filter: function (c) {
				return (c._memory[C.ROLE] === 'crane');
			}
		});
		for (let idx in creeps) {
			creeps[idx]._cache.balancerSleep = Game.time + 1;				
		}
	}

	Room.prototype.wakeCreepsOfRole = function(role) {
		let creeps = this.find(FIND_MY_CREEPS, {
			filter: function (c) {
				return (c._memory[C.ROLE] === role);
			}
		});
		for (let idx in creeps) {
			delete creeps[idx]._memory.sleep;				
		}
	}


	Room.prototype.wakeSpawnFillers = function(linkRefilled=false){

		let cranes = this.find(FIND_MY_CREEPS, {
			filter: function (c) {
				return (c._memory[C.ROLE] === 'spawnFillers' || c._memory[C.ROLE] === 'crane');
			}
		});
		for (let idx in cranes) {
			let crane = cranes[idx];
			delete cranes[idx]._memory.sleep;		
			if (linkRefilled && crane.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
				crane._cache.emptyLink = true;
			}
			
		}
	}



	Room.prototype.getSpawnExtensions = function(force=false, skipIfActiveCrane=false){
		if (!this._cache.spawnExtensionsArray || force) {

			this._cache.spawnExtensionsArray = []
			let spawnFillerPos = this.getSpawnFillerPos();
			let sortable = []
			let linkPos = posDecompress(Memory.rooms[this.name].spawnLinkPos, this.name)
			for (let idx in spawnFillerPos) {

				
				let extensions = spawnFillerPos[idx].getSpawnFillerExtensions(force)
	
				for (let idx2 in extensions) {
					let dist = linkPos.getRangeTo(extensions[idx2])
					sortable.push({id: extensions[idx2].id, score: dist + (idx2/10)})
				}
			}

			sortable.sort(function(a, b) {
				return (a.score - b.score);});

			for (let idx in sortable) {
				this._cache.spawnExtensionsArray.push(sortable[idx].id)
			}

			this._cache.spawnExtensionsArray = _.uniq(this._cache.spawnExtensionsArray);
		}

		let returnValue = [];
		for (let idx in this._cache.spawnExtensionsArray) {
			let ext = Game.getObjectById(this._cache.spawnExtensionsArray[idx])
			if (!ext && !force) { 				
				return this.getSpawnExtensions(true, skipIfActiveCrane);
			}
			if (skipIfActiveCrane && ext.pos._cache.craneTs && Game.time < ext.pos._cache.craneTs) { continue; }
			returnValue.push(ext)
		}
		return returnValue;
	}

	Room.prototype.warEffortActive = function() {
		if (!this._cache.warEffortTs || Game.time > this._cache.warEffortTs) {
			this._cache.warEffortTs = Game.time + 101;
			delete this._cache.warEffort;
			if (!this._memory.myRoom) { 
				return this._memory.warEffort;
			}
			let roomName = this.name;
			if (Memory.roomAttacked[roomName]) {
				if ((Memory.rooms[roomName].hostiles && Memory.rooms[roomName].isPlayer) || Memory.rooms[roomName].preSpawnDefender) {
					this._memory.warEffort = true;
					return this._memory.warEffort;
				}				
			}
			
			/*
			for (let room in Memory.attackTarget) {
				if (Memory.attackTarget[room].assignedSpawn[roomName] && Memory.attackTarget[room].assignedSpawn[roomName].score <= 10 ) { 
					this._memory.warEffort = true;
					return this._memory.warEffort;
				}
			}

			for (let room in Memory.combatDeconstruct) {
				if (Memory.combatDeconstruct[room].assignedRoom === roomName) { 
					this._memory.warEffort = true;
					return this._memory.warEffort;
				}
			}*/

			if (countMyActiveRaids(roomName) > 0) {
				this._cache.warEffort = true;
				return this._cache.warEffort;
			}

		}
		return this._cache.warEffort;

	}
	
	Room.prototype.clearLabJobs = function() {
		let allLabs = this.findByType(STRUCTURE_LAB);
		let length = allLabs.length;
		for (let i=0; i < length; i++) {
			
			let labId = allLabs[i].id;
			if (Memory.structures[labId] === undefined) { continue; }

			let isInput = false;
			if (Memory.structures[labId][S.INPUT_LAB]) { isInput = true}
			delete Memory.structures[labId];
			if (isInput) {
				Memory.structures[labId] = {
					[S.INPUT_LAB]: 0
				}
			}
		}
	};

	Room.prototype.allDrainersPresentAndHealed = function(target){
		if (this._allDrainersPresentAndHealed && this._allDrainersPresentAndHealedts == Game.time) { return this._allDrainersPresentAndHealed; }
		let room = this.name;
		this._allDrainersPresentAndHealedts = Game.time;
		let allRangedAttackers = _.filter(Game.creeps, (creep) => creep._memory[C.ROLE] == "rangedAttacker" );
	
		let attackers = _.filter(allRangedAttackers, (creep) => creep._memory[C.ROOM_TARGET] == target && creep.pos.roomName == room );
		let healed = true;
		for (let attackerIdx in attackers) {
			let creep = attackers[attackerIdx];	
		//	console.log(creep.hits/creep.hitsMax )
			if (creep.hits < creep.hitsMax) { 
				healed = false;
				break;				
			}
		}
		this._allDrainersPresentAndHealed = healed;
		return this._allDrainersPresentAndHealed;

	};

	Room.prototype.isTowersDraining = function(){
		if ((this.controller && this.controller.my) || !this.controller) {return false;}
		if (this._towersDraining) { return this._towersDraining; }

		let towers = this.find(FIND_STRUCTURES, {
			filter: (structure) => {
			return (structure.structureType === STRUCTURE_TOWER);
			}});	

		if (towers.length === 0) {
			delete this._memory.prevTowerE;
			return false;
		}

		let towerEnergy = 0;
		for (let towerIdx in towers) {
			towerEnergy += towers[towerIdx].energy;
		}
		if (this._cache.prevTowerE === undefined) { this._cache.prevTowerE = 0; }

		this._towersDraining = false;
		if (towerEnergy < this._cache.prevTowerE ) {
			this._towersDraining = true;
		}
	//	console.log(" isTowersDraining " + this._towersDraining + " " + towerEnergy + " / " +this._memory.prevTowerE )
		this._cache.prevTowerE = towerEnergy;		
		return this._towersDraining;
	};	


	function exitLeadsToDirection(exitPos, direction) {
		if (direction === TOP) {
			if (exitPos.y === 0) { return true; }
		} else if (direction === RIGHT) {
			if (exitPos.x === 49) { return true; }
		} else if(direction === BOTTOM) {
			if (exitPos.y === 49) { return true; }
		} else if(direction === LEFT) {
			if (exitPos.x === 0) { return true; }
		}
		return false;
	}

	Room.prototype.setAllowedExits = function(){
		if (!Memory.rooms[this.name] || !Memory.rooms[this.name].avoidExit) {
			delete Memory.rooms[this.name].avoidRoomExit;
			return 
			
		}

		let reducedExits = this.findReducedExits();

		let allExits = Game.map.describeExits(this.name);
		for (let directions in allExits) {
			let direction = allExits[directions]

			let confirmedDirection = false;
			for (let idx in reducedExits) {
				let exit = reducedExits[idx];

				if (!exitLeadsToDirection(exit, direction) ) { continue; }
				if (Memory.rooms[this.name].avoidExit[posCompress(exit)]) { continue; }
				confirmedDirection = true;
				break;
			}

			if (!confirmedDirection) {
				if (!Memory.rooms[this.name].avoidRoomExit) {
					Memory.rooms[this.name].avoidRoomExit = {};
				}
				Memory.rooms[this.name].avoidRoomExit[allExits[direction]] = {};
			} else if (Memory.rooms[this.name].avoidRoomExit) {
				delete Memory.rooms[this.name].avoidRoomExit[allExits[direction]];
			}
		}		
	}

	Room.prototype.getExitsFromReducedExits = function(exitPos){
		let unGroupedExits = this.find(FIND_EXIT);

		let group = exitPos.findInRange(unGroupedExits, 1);
		for (let idx3 = 0; idx3 < group.length; idx3++) {
			let groupAdd = group[idx3].findInRange(unGroupedExits, 1);
			group = group.concat(groupAdd);
			group = _.uniq(group);
		}

		/*
		for (let idx in group) {
			this.visual.circle(group[idx].x, group[idx].y , {fill: 'transparent', radius: 0.50, stroke: 'red'}) 
		}*/
		return group;
	}
	
	Room.prototype.findReducedExits = function(){
		return findReducedExits(this.name);		
	};

	RoomPosition.prototype.findInRangeOffline = function(type, range, opts) {
       
        opts = _.clone(opts || {});

        var objects = [],
            result = [];

        if(_.isArray(type)) {
            objects = opts.filter ? _.filter(type, opts.filter) : type;
        }

        objects.forEach((i) => {
            if(this.inRangeTo(i, range)) {
                result.push(i);
            }
        });

        return result;
    };




	global.findReducedExits = function(roomName){
		if (!global.reducedExits[roomName]) {

			global.reducedExits[roomName] = {};
			global.reducedExits[roomName].pos = [];

			let unGroupedExits = [];
			if (Game.rooms[roomName]) {
				unGroupedExits = Game.rooms[roomName].find(FIND_EXIT);
			} else {
				unGroupedExits = getOfflineExits(roomName);
			}
			
			let groupedExits = [];
			while (unGroupedExits.length > 0) {
				let group = unGroupedExits[0].findInRangeOffline(unGroupedExits, 2);
				unGroupedExits.splice(0,1);
				for (let idx3 = 0; idx3 < group.length; idx3++) {
					let groupAdd = group[idx3].findInRangeOffline(unGroupedExits, 1);
					group = group.concat(groupAdd);
					group = _.uniq(group);
				}	
				groupedExits.push(group);
				unGroupedExits = _.difference(unGroupedExits, group);
			}
			
			for (let idx in groupedExits) {
				let exit = groupedExits[idx];
				global.reducedExits[roomName].pos.push(posCompress(exit[Math.floor(exit.length/2)])); 
			}
		}

		let returnValue = [];
		for (let idx in global.reducedExits[roomName].pos) {
			returnValue.push(posDecompress(global.reducedExits[roomName].pos[idx], roomName));
		//	this.visual.circle(returnValue[idx].x, returnValue[idx].y , {fill: 'transparent', radius: 0.50, stroke: 'red'}) 
		}
		return returnValue;
	}





	Room.prototype.getDrainerHealPos = function(target){
		let roomName = this.name;
		if (this._cache._getDrainerHealPos) {
			if (Game.time > this._cache._getDrainerHealPosTs) {
				delete this._cache._getDrainerHealPos;
			} else {
				let positionDrain = posDecompress(this._cache._getDrainerHealPos, roomName);
				this.visual.circle(positionDrain.x, positionDrain.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
				return positionDrain;
			}
		}

	//	console.log(" getDrainerHealPos " + )
		let cm = new PathFinder.CostMatrix(); 
		let walkableTiles = tilesToStandOn(roomName);
		let dt = distanceTransform(walkableTiles, 255);

		for (let y = 0; y < 50; ++y) {
	        for (let x = 0; x < 50; ++x) {
	        	let dtValue = dt.get(x, y);
				let dtScore = 0;
				if (dtValue < 1) { dtScore = 10; 
				} else if (dtValue < 2) { 
					dtScore = 8; 
				} else if (dtValue < 3) { 
					dtScore = 5; 
				}
				cm.set(x, y, dtScore );
				this.visual.text(dtScore  , x, y, {color: 'green', font: 0.8});	
	 	   }
	    }

	    let dest = pullIdlePosForRoom(this.name)
	    let bestCmScore = 0;
	    let ret = findTravelPath(target, dest, {roomCallback: () => cm, uncompressed: true, freshMatrix: true, ensurePath: true, ignoreRoads: true, ignoreCreeps: true});
	    for (let position of ret.path) {
			if (position.roomName !== roomName) { continue; }
			let cmScore = dt.get(position.x, position.y);
		//	this.visual.text(cmScore, position.x, position.y, {color: 'red', font: 0.8});
			this.visual.circle(position.x, position.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'});
			if (cmScore >= 3 && !position.isNearExit(1)) {
				this.visual.circle(position.x, position.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'});
				this._cache._getDrainerHealPos = posCompress(position);
				break;
			} else if (cmScore > bestCmScore) {
				bestCmScore = cmScore;
				this._cache._getDrainerHealPos = posCompress(position);
			}	
		}
		this._cache._getDrainerHealPosTs = Game.time + 101;
		return posDecompress(this._cache._getDrainerHealPos, roomName);
	};	
	
	Room.prototype.getWaitPosTowerDrain = function(fallbackRoom){		
		let roomName = this.name;

		if (!this._cache._waitPosTowerDrain ) { this._cache._waitPosTowerDrain = {}; }

		if (this._cache._waitPosTowerDrain[fallbackRoom] ) {
			if (Game.time > this._cache._waitPosTowerDrain[fallbackRoom]._waitPosTowerDrainTs) {
				delete this._cache._waitPosTowerDrain;
				this._cache._waitPosTowerDrain = {};
				this._cache._waitPosTowerDrain[fallbackRoom] = {};
			} else {
				let position = posDecompress(this._cache._waitPosTowerDrain[fallbackRoom].pos, roomName);
				this.visual.circle(position.x, position.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
				return position;
			}
		} else {
			this._cache._waitPosTowerDrain[fallbackRoom] = {};
		}
		
		let cm = new PathFinder.CostMatrix(); 
		let towers = Game.rooms[roomName].find(FIND_STRUCTURES, {
			filter: (structure) => {
			return (structure.structureType === STRUCTURE_TOWER);
			}});
		let amountOfTowers = towers.length;
		let maxTowerDmg = towers.length * 600;
		let towerFalloff = (600/150);
		
		let walkableTiles = tilesToStandOn(roomName);
		let dt = distanceTransform(walkableTiles);

		if (amountOfTowers > 0) {
			for (let y = 0; y < 50; ++y) {
	        	for (let x = 0; x < 50; ++x) {
					if (getRoomTerrainAt(x, y, roomName) === TERRAIN_MASK_WALL	) { continue; }
					
	        		let towerDmg = Math.ceil((getTowerDamageXY(x, y, towers) / maxTowerDmg) * towerFalloff);
	        		let dtValue = dt.get(x, y);
	        		let dtScore = 0;
	        		if (dtValue < 2) { dtScore = 5; }
	        		cm.set(x, y, towerDmg+dtScore );
	        		this.visual.text(towerDmg+dtScore  , x, y, {color: 'green', font: 0.8});	
	        	}	
	        }
		}
		
		let origin = pullIdlePosForRoom(fallbackRoom);	

		let enemyStructures = Game.rooms[roomName].find(FIND_STRUCTURES, {	//FIND_HOSTILE_STRUCTURES
			filter: (structure) => {
			return (structure.structureType === STRUCTURE_SPAWN || 
					structure.structureType === STRUCTURE_TERMINAL || 
					structure.structureType === STRUCTURE_STORAGE || 
					structure.structureType === STRUCTURE_TOWER);
			}});
		
		if (enemyStructures.length === 0) { return; }
		let ret = findTravelPath(origin, enemyStructures[0], {roomCallback: () => cm, uncompressed: true, ignoreRoads: true, ignoreCreeps: true, ensurePath: true});
		let bestCmScore = 100;
		for (let position of ret.path) {
			if (position.roomName !== roomName) { continue; }
			if (!position.isPassible(true, true)) { 
				if (!this._cache._waitPosTowerDrain[fallbackRoom].pos) { 
					this._cache._waitPosTowerDrain[fallbackRoom].pos = posCompress(position)
				}
				break;
			}
			let cmScore = cm.get(position.x, position.y);
			this.visual.circle(position.x, position.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
			if (cmScore === 1 && !position.isNearExit(1)) {
				this._cache._waitPosTowerDrain[fallbackRoom].pos = posCompress(position);
				break;
			} else if (cmScore < bestCmScore && !position.isNearExit(0)) {
				bestCmScore = cmScore;

				this._cache._waitPosTowerDrain[fallbackRoom].pos = posCompress(position);
			}
		}

	//	Memory.rooms[roomName]._waitPosTowerDrain[fallbackRoom].pos
		this._cache._waitPosTowerDrain[fallbackRoom]._waitPosTowerDrainTs = Game.time + 1499;
		return posDecompress(this._cache._waitPosTowerDrain[fallbackRoom].pos, roomName);
	};

	function setLabToBoost(lab, boost, amount, boostTime, combat){
		if (!lab) { return; }

		let _amount = limit(amount, 0, lab.room.storeWithLabs(boost));
		_amount = limit(amount, 0, LAB_MINERAL_CAPACITY);

		if (lab.memory[S.BOOSTER_LAB] === boost) {
			lab.memory[S.BATCH_LAB] = Math.max(_amount, lab.memory[S.BATCH_LAB]);
		} else {
			let isInput = lab.memory[S.INPUT_LAB];
			delete Memory.structures[lab.id]

			if (isInput) {
				lab.memory[S.INPUT_LAB] = isInput;
			}
			
			lab.memory[S.BATCH_LAB] = _amount;
			lab.memory[S.BOOSTER_LAB] = boost;
			requestMemSave();
		}

		if ( _amount > 0 ) {
			lab.memory.boostTs = Game.time + boostTime;
			lab.memory.combat = combat;	
		}
		
	}


	Room.prototype.setBoostMode = function(combat, boosts = {}, boostTime = CREEP_LIFE_TIME ) {
	
		let allLabs = [];
		allLabs = allLabs.concat(this.getOutputLabs(false));
		allLabs = allLabs.concat(this.getInputLabs(false));

		for (let idx in allLabs) {
			if (allLabs[idx].memory[S.LAB_ERROR_CYCLES]) {
				delete allLabs[idx].memory[S.LAB_ERROR_CYCLES];
			}
		}

		if (allLabs.length === 0) { return; }

		if (combat) {
			orderCombatBoost(this.name, boosts);			
		}

		let labIdx = 0;
		
		for (let boost in boosts) {
			// CHECK IF BOOST IS ALREADY ACTIVE
			let boosterAlreadyActive = false;
			let freeLab = null;
			let nonCombatLab = null;
			for (let idx in allLabs) {
				let labToCheck = allLabs[idx];
				if (!labToCheck || !labToCheck.memory) { continue; }

				if (labToCheck.memory[S.BOOSTER_LAB] === boost) {
					setLabToBoost(labToCheck, boost, boosts[boost], boostTime, combat);
					labIdx++;
					boosterAlreadyActive = true;
					break;
				} else if (labToCheck.memory[S.BOOSTER_LAB] && labToCheck.memory.boostTs > Game.time) {
					if (combat && !labToCheck.memory.combat) {
						nonCombatLab = labToCheck;
					}
					continue;	// lan is busy boosting already
				} else if (!freeLab){
					freeLab = labToCheck;
				}
			}

			if (!boosterAlreadyActive) {
				if (freeLab) {
					setLabToBoost(freeLab, boost, boosts[boost], boostTime, combat);
					labIdx++;
				} else if (nonCombatLab) {
					setLabToBoost(nonCombatLab, boost, boosts[boost], boostTime, combat);
					labIdx++;
				}
			}

			if (labIdx >= allLabs.length) { 
				break;
			}
		}
	};

	Room.prototype.netEnergyIncome = function(lowRcl = false) {
		let income = 0;

		// local sources
		for (let sourceId in this._memory.sources) {
			income += 8;
		}

		let spawner = this.name;

		// remotes
		for (let room in this._memory.remoteMineOps) {
			let sources = this._memory.remoteMineOps[room].sources;
			for (let sourceId in sources) {
				if (!checkSourceIsActiveMine(sourceId)) { continue; }

				let factor = 1;
				if (lowRcl) {
					if(roadBuiltStatus(spawner, sourceId) < 0.9) { 
						factor -= 0.15;
					}

					if (!Memory.rooms[room] || !Memory.rooms[room].RCLreserved || Memory.rooms[room].RCLreserved.username !== Memory.username) {
						factor -= 0.5;
					}
				}

				income += (sources[sourceId].netEnergy * factor) || 5;
			}
		}

		return income;
	}

	Room.prototype.wantedEnergyfPRCL = function(PRCL, fPRCL = 0, minStock=20000) {

		if (!fPRCL) {
			if (this.controller) {
				fPRCL = this.controller.progress / this.controller.progressTotal
			}
		}
		
		if (!PRCL) {
			PRCL = this.controller.level;
		}


		if (PRCL < CONTROLLER_MAX_LEVEL) {
			let wantedCurrent = this.wantedEnergy(PRCL) + minStock
			let wantedNext = this.wantedEnergy(PRCL+1) + minStock
			let diff = wantedNext - wantedCurrent;
			let wanted = wantedCurrent + (diff * fPRCL);
			return wanted;
		} else {
			return this.wantedEnergy(PRCL) + minStock;
		}
	}

	Room.prototype.wantedEnergy = function(PRCL) {
		if (PRCL < 4) { return 1; }
		
		if (Memory.myRoomHighPRCL < 7) {
			return limit((PRCL - 2) * 15000, 20000, 175000);
		} else {
			return limit((PRCL - 2) * 50000, 50000, 400000);
		}
	}

	Room.prototype.cacheEnergyStatus = function(status) {
		this._cache.energyStatusTs = Game.time + 47;
		this._cache.energyStatus = status;
	}

	Room.prototype.energyStatus = function() {
		if (this._cache.energyStatusTs && Game.time <= this._cache.energyStatusTs) {
			return this._cache.energyStatus;
		}
		
		let PRCL = getRoomPRCL(this.name)
		if (PRCL < 4) { 
			this.cacheEnergyStatus(ECONOMY_STABLE);
			return ECONOMY_STABLE; 
		}

		let fPRCL = 1;	// fraction next prcl
		if (PRCL < CONTROLLER_MAX_LEVEL) {
			if (this.controller) {
				fPRCL = this.controller.progress / this.controller.progressTotal
			}
		}

		let currentEnergy = this.store(RESOURCE_ENERGY);
		let crashedMinimalEnergy = 35000;
		if (PRCL === 4) {
			crashedMinimalEnergy *= fPRCL;
		}

		if (currentEnergy < crashedMinimalEnergy) {
			this.cacheEnergyStatus(ECONOMY_CRASHED);
			return ECONOMY_CRASHED;
		}
		
		let wantedEnergy = this.wantedEnergyfPRCL(this.controller.level, fPRCL, crashedMinimalEnergy);

		// LESS THAN 25%
		if (currentEnergy < (wantedEnergy * 0.25)) {
			this.cacheEnergyStatus(ECONOMY_LOW);
			return ECONOMY_LOW;
		}

		// LESS THAN 55 %
		if (currentEnergy < (wantedEnergy * 0.55)) {
			this.cacheEnergyStatus(ECONOMY_DEVELOPING);
			return ECONOMY_DEVELOPING;
		}

		// LESS THAN 75 %
		if (currentEnergy < (wantedEnergy * 0.75)) {
			this.cacheEnergyStatus(ECONOMY_STABLE);
			return ECONOMY_STABLE;
		}

		// LESS THAN 100%
		if (currentEnergy < (wantedEnergy * 1.0)) {
			this.cacheEnergyStatus(ECONOMY_RICH);
			return ECONOMY_RICH;
		}

		this.cacheEnergyStatus(ECONOMY_SURPLUS);
		return ECONOMY_SURPLUS;
	}

	
	Room.prototype.whatToProduceNextForBoost = function(compund, requiredAmount = 3000, isComponent = false ){
	//	if (this._nextRecepie) { return this._nextRecepie; }
		let requiredAmountReagen = 1000;
		if (reactionJob[compund]) {
		//	console.log(" testing for " + compund)
			let r1 = reactionJob[compund].r1;
			let r2 = reactionJob[compund].r2;
			
			if ((!isComponent || this.storeWithLabs(compund) < requiredAmount) &&
				this.storeWithLabs(r1) >= requiredAmountReagen &&
				this.storeWithLabs(r2) >= requiredAmountReagen) {
			//	console.log(" returning " + compund +" needs " + r1 + " and " + r2)	
			//	this._nextRecepie = compund;
				return compund;			
			} else {
				let r1required = this.whatToProduceNextForBoost(r1, undefined, true);
				if (r1required) { return r1required; }
				let r2required = this.whatToProduceNextForBoost(r2, undefined, true);
				if (r2required) { return r2required; }
			}
		}
	};
	
	Room.prototype.setRecepie = function() {
		if (this._cache._setRecepie === undefined) { this._cache._setRecepie = Game.time + Math.floor(Math.random()*100)}

		if (Game.time < this._cache._setRecepie) { return -1; }
		this._cache._setRecepie = Game.time + 400 + Math.floor(Math.random()*100);

		let inputLabs = this.getInputLabs()
		let outputLabs = this.getOutputLabs()
		if (outputLabs.length >= 1 && inputLabs.length >= 2) {
			
			
			let batchAmount = 3000;	// HOW MUCH INPUT; 	
			let recepie;
			
			if (BOT_MODE) {
				// ALWAYS STOCK LOWER TO HIGHER TIERS
				let localWantedAmount = 4000
				let wantedAmount = Math.max(15000, Object.keys(Memory.Minerals.Labs).length * localWantedAmount);
			//	log("set recepie wanted amount " + wantedAmount)
				let missingNextLevel = wantedAmount * 0.8;

				let missingLowBoost;

				let bestScore = 0;

				// Refill nuker
				if (getRoomPRCL(this.name) >= CONTROLLER_MAX_LEVEL) {
					let nuker = this.findByType(STRUCTURE_NUKER)[0];
					if (nuker && nuker.store.getFreeCapacity(RESOURCE_GHODIUM) > 0 && this.storeWithLabs(RESOURCE_GHODIUM) < 1000) {
						recepie = this.whatToProduceNextForBoost(RESOURCE_GHODIUM);							
					}
				}

				// Needs safemode
				if (!recepie && 
					this.controller.safeModeAvailable < 3) {
					if (this.storeWithLabs(RESOURCE_GHODIUM) < 1000) {
						recepie = this.whatToProduceNextForBoost(RESOURCE_GHODIUM);							
					}
				}

				// Produce Ghodium Melt for Credits
				if (Memory.comodityToProcude === RESOURCE_GHODIUM_MELT && Game.market.credits < Memory.wantedCredits || 1000 ) {
					if (this.storeWithLabs(RESOURCE_GHODIUM) < 1000) {
						recepie = this.whatToProduceNextForBoost(RESOURCE_GHODIUM);
					}
				}

				if (!recepie) {
					for (let boostType in BOOST_LEVEL) {

						if (boostType === BUILD || (boostType === DISMANTLE && !SEASONAL_SCORE && !SEASONAL_SYMBOLS) || boostType === HARVEST || boostType === CARRY || boostType === UPGRADE) { continue; }

						for (let boostAtLevel in BOOST_LEVEL[boostType]) {
							let type = BOOST_LEVEL[boostType][boostAtLevel]
							
							let currentAmount = Memory.Minerals[type] || 0;
							let amountModifier = 1;
							if (boostType === ATTACK) { amountModifier += 0.25}
							if (boostAtLevel == 2) { amountModifier += 3.0}
							let currentWantedAmount = amountModifier * wantedAmount
							let missingAmount = Math.max(currentWantedAmount  - currentAmount);
							if (missingAmount <= 0) { continue; }

							let score = 0;
							score += missingAmount / currentWantedAmount;
							score += 3-boostAtLevel;

						//	log("set recepie scores " + type + " at " + score.toFixed(1) + " missingAmount amount " +  missingAmount + "/" +currentWantedAmount  )
							if (score > bestScore) {
								let nextRecepie = this.whatToProduceNextForBoost(type, currentWantedAmount);
							//	log("set recepie checking if i can create " + type + " recepie " + nextRecepie);
								if (nextRecepie) {
								//	log("nextRecepie best so far recepie create " + type);
									bestScore = score;
									missingLowBoost = nextRecepie;
								}
							}

							// Stop checking higher tiers if not stocked up at lower tiers
							if (missingAmount > missingNextLevel) {
								break;
							}
						}
					}				
					recepie = missingLowBoost;
				}

			} else {
				// AIM FOR T3					

				let globalSetpoint = 500000;
				if( Memory.Minerals && Memory.Minerals.Labs) {
					globalSetpoint = Object.keys(Memory.Minerals.Labs).length * BOOST_STOCK; 
				}
	
				// FIND LOW AMOUNT
				let missingMost = batchAmount;
				
				for (let idx in T3_BOOSTS){
					let compund = T3_BOOSTS[idx];

					let wantedAmount = globalSetpoint;
					if (T3_BOOSTS_GLOABL_SETPOINT[compund] !== undefined) {						
						wantedAmount = T3_BOOSTS_GLOABL_SETPOINT[compund];
					}
					
					let currentStock = Memory.Minerals[compund] || 0;
					let missingAmount = wantedAmount - currentStock;
					
				//	log("check production of " + compund+ " missing amount " + missingAmount + " / " + wantedAmount)
					if (missingAmount > missingMost) {
						let possibleRecepie = this.whatToProduceNextForBoost(compund, batchAmount);
						if (possibleRecepie) {
						//	log("can produce " + compund + " next compund required " + possibleRecepie)
							missingMost = missingAmount;
							recepie = possibleRecepie;
						}
					}
				}
			}

		//	log("producing " + recepie)
			// Produce G
			if (!recepie) {
				if (this.storeWithLabs(RESOURCE_GHODIUM) < batchAmount) {
					recepie = this.whatToProduceNextForBoost(RESOURCE_GHODIUM);
					if (recepie) { 
					//	console.log(this.name + " labs want to produce " +  RESOURCE_GHODIUM + ", starting production of " + recepie);
					}
				}
			}
			
			if (!recepie) {
				
				if (BOT_MODE) {
					/*
					let combatBoosts = getMyBestBoosts();
					for (let boost in combatBoosts){						
						if (this.storeWithLabs(boost) < 12000 ) {
							recepie = this.whatToProduceNextForBoost(boost, requiredAmount);
						}
						if (recepie) { 
							log(this.name + " creating current best boost " + boost)
							break; 
						}
					}
					*/
				} else {
					// Find left over T2 and finsish them
					if (this.store(RESOURCE_CATALYST) > 750) {
						let bestAmount = 750;
						let bestCompund;
						for (let boost in T2_BOOSTS){
							let compund = T2_BOOSTS[boost];
							if (this.store(compund) > bestAmount) {
								bestAmount = this.store(compund);
								bestCompund = compund;
							}
						}
						if (bestCompund) {
							recepie = "X"+bestCompund;	// hack!
						}
					}
				}
			}

			
			if (recepie) {
				requestMemSave();

				let currentBatchAmount = Math.min(batchAmount, this.storeWithLabs(reactionJob[recepie].r1), this.storeWithLabs(reactionJob[recepie].r2));
			//	console.log(this.name + " currentBatchAmount " + currentBatchAmount + " producing " + recepie)
				if (!BOT_MODE && !T3_BOOSTS_OBJECT[recepie]) {
					currentBatchAmount = Math.min(currentBatchAmount, 3200-this.storeWithLabs(recepie));
				}
				currentBatchAmount = Math.floor(currentBatchAmount / LAB_REACTION_AMOUNT) * LAB_REACTION_AMOUNT;	// round down to closest reaction amount
			//	console.log(this.name + " batch amount " + currentBatchAmount + " producing " + recepie)

				let inputLab1 = inputLabs[0];
				inputLab1.memory = {};
				inputLab1.memory[S.INPUT_LAB] = reactionJob[recepie].r1;
				inputLab1.memory[S.BATCH_LAB] = currentBatchAmount;								

				let inputLab2 = inputLabs[1];
				inputLab2.memory = {};
				inputLab2.memory[S.INPUT_LAB] = reactionJob[recepie].r2;				
				inputLab2.memory[S.BATCH_LAB] = currentBatchAmount;
										
				for (let idx in outputLabs) {
					let outputLab = outputLabs[idx];

					if (outputLab.memory.boostTs) {
						if (Game.time < outputLab.memory.boostTs) { continue; }
					}

					if (outputLab.memory[S.LAB_ERROR_CYCLES]) {
						delete outputLab.memory[S.LAB_ERROR_CYCLES]
					}

				}

				this._memory[R.LABS_PRODUCING] = recepie;
				delete Memory.combatBoost[this.name];

				let requiredUpgradeBoost;
				if (this.controller.level >= 8) {
					requiredUpgradeBoost = LAB_BOOST_MINERAL * CONTROLLER_MAX_UPGRADE_PER_TICK;
				} else {
					requiredUpgradeBoost = LAB_BOOST_MINERAL * 50;
				}
				
				if (this.store(T3_UPGRADE_CONTROLLER) > requiredUpgradeBoost) {
					// UPGRADE GCL
					this.setBoostMode(false, {XGH2O:  requiredUpgradeBoost});
				}
				requestMemSave();
				
				return recepie;
				
			} else {
				console.log(this.name + " labs nothing to produce");
				delete this._memory[R.LABS_PRODUCING];
			}
		} 
		
		// NO ACTIVE JOBS, SET BOOSTING MODE
		this.clearLabJobs();		
		if (Memory.Minerals[T3_UPGRADE_CONTROLLER] > (T3_BOOSTS_GLOABL_SETPOINT[T3_UPGRADE_CONTROLLER] - 3000) && this.store(T3_UPGRADE_CONTROLLER) > 300) {
			let upgradeCtrlAmount = 0;
			if (PRAISE_GCL_ROOMS[this.name]) {
				upgradeCtrlAmount = 3000;
			} else {
				upgradeCtrlAmount = 15*30;
			}
			// UPGRADE GCL 	
			this.setBoostMode(false, {XGH2O: upgradeCtrlAmount});
		}
	};

	global._openAdjacentSpotsCacheGlobal = {};
	global.openAdjacentSpots = function (pos, ignoreCreeps, allowEdge = false){
			
		let posIdentifier = posId(pos) + ignoreCreeps + allowEdge;

		if (!global._openAdjacentSpotsCacheGlobal[posIdentifier] || Game.time > global._openAdjacentSpotsCacheGlobal[posIdentifier].ts) {
			global._openAdjacentSpotsCacheGlobal[posIdentifier] = {};
			global._openAdjacentSpotsCacheGlobal[posIdentifier].ts = Game.time + 447;
			global._openAdjacentSpotsCacheGlobal[posIdentifier].pos = [];

			let posObj = {};		
			for (let i = 1; i <= 8; i++) {
				let testPosition = getPositionAtDirection(pos, i);
				
				if (!allowEdge && isNearExit(testPosition, 0)) { continue }

				// look for walls
				if (getRoomTerrainAt(testPosition) === TERRAIN_MASK_WALL){ continue }
				
				let posId = posCompress(testPosition);
				posObj[posId] = {};
				posObj[posId].pos = testPosition;
			}

			if (Game.rooms[pos.roomName]) {
				if (roomIsController(pos.roomName)) {
					let structures = lookForAnyStructuresAround(pos, 1);
					for (let idx in structures) {
						let structure = structures[idx];
						if (structure.structureType === STRUCTURE_ROAD || 
							structure.structureType === STRUCTURE_CONTAINER || 
							(structure.structureType === STRUCTURE_RAMPART && structure.my)
							
						) {
							continue;
						}
						// remove pos
						delete posObj[posCompress(structure.pos)];	
					}

					if (Game.rooms[pos.roomName].controller.my) {
						let blockingSites = lookForBlockingConstructionSiteAround(pos, 1);
						for (let idx in blockingSites) {
							let site = blockingSites[idx];
							delete posObj[posCompress(site.pos)];	
						}
					}

				}

				if (!ignoreCreeps) {
					let creeps = lookForAnyCreepAround(pos, 1);
					for (let idx in creeps) {
						let creep = creeps[idx];
						delete posObj[posCompress(creep.pos)];
					}
				}
			} else {
				global._openAdjacentSpotsCacheGlobal[posIdentifier].ts = Game.time;
			}

			let positions = [];
			for (let id in posObj) {
				positions.push(posObj[id].pos);
				global._openAdjacentSpotsCacheGlobal[posIdentifier].pos.push(posCompress(posObj[id].pos));
			}

			return positions;	
		}

		let positions = [];
		for (let idx in global._openAdjacentSpotsCacheGlobal[posIdentifier].pos) {
			positions.push(posDecompressXY(global._openAdjacentSpotsCacheGlobal[posIdentifier].pos[idx], pos.roomName));
		}

		return positions;

	};

	global._openAdjacentSpotsCache = {};
	RoomPosition.prototype.openAdjacentSpots = function (ignoreCreeps, allowEdge = false){
			
		let posIdentifier = posId(this) + ignoreCreeps + allowEdge;

		if (!global._openAdjacentSpotsCache[posIdentifier] || Game.time > global._openAdjacentSpotsCache[posIdentifier].ts) {
			global._openAdjacentSpotsCache[posIdentifier] = {};
			global._openAdjacentSpotsCache[posIdentifier].ts = Game.time + 447;
			global._openAdjacentSpotsCache[posIdentifier].pos = [];

			let posObj = {};		
			for (let i = 1; i <= 8; i++) {
				let testPosition = this.getPositionAtDirection(i);
				
				if (!allowEdge && testPosition.isNearExit(0)) { continue }

				// look for walls
				if (getRoomTerrainAt(testPosition) === TERRAIN_MASK_WALL){ continue }
				
				let posId = posCompress(testPosition);
				posObj[posId] = {};
				posObj[posId].pos = testPosition;
			}

			if (Game.rooms[this.roomName]) {
				if (roomIsController(this.roomName)) {
					let structures = this.lookForAnyStructuresAround(1);
					for (let idx in structures) {
						let structure = structures[idx];
						if (structure.structureType === STRUCTURE_ROAD || 
							structure.structureType === STRUCTURE_CONTAINER || 
							(structure.structureType === STRUCTURE_RAMPART && structure.my)
							
						) {
							continue;
						}
						// remove pos
						delete posObj[posCompress(structure.pos)];	
					}

					if (Game.rooms[this.roomName].controller.my) {
						let blockingSites = this.lookForBlockingConstructionSiteAround(1);
						for (let idx in blockingSites) {
							let site = blockingSites[idx];
							delete posObj[posCompress(site.pos)];	
						}
					}

				}

				if (!ignoreCreeps) {
					let creeps = this.lookForAnyCreepAround(1);
					for (let idx in creeps) {
						let creep = creeps[idx];
						delete posObj[posCompress(creep.pos)];
					}
				}
			} else {
				global._openAdjacentSpotsCache[posIdentifier].ts = Game.time;
			}

			let positions = [];
			for (let id in posObj) {
				positions.push(posObj[id].pos);
				global._openAdjacentSpotsCache[posIdentifier].pos.push(posCompress(posObj[id].pos));
			}

			return positions;	
		}

		let positions = [];
		for (let idx in global._openAdjacentSpotsCache[posIdentifier].pos) {
			positions.push(posDecompress(global._openAdjacentSpotsCache[posIdentifier].pos[idx], this.roomName));
		}

		return positions;

	};

	global.openAdjacentSiegeSpots = function (pos, ignoreCreeps, ignoreEdge=false){
        let positions = [];
        for (let i = 1; i <= 8; i++) {
        //    let testPosition = this.getPositionAtDirection(i);
			let testPosition = getPositionAtDirection(pos, i)
            if (!ignoreEdge && (testPosition.x === 0 || testPosition.x === 49 || testPosition.y === 0 || testPosition.y === 49 )) { continue; }
            if (isPassible(testPosition, ignoreCreeps, ignoreEdge)) {
                // passed all tests
                positions.push(testPosition);
            }
        }
        return positions;
	};


	RoomPosition.prototype.openAdjacentSiegeSpots = function (ignoreCreeps, ignoreEdge=false){
        let positions = [];
        for (let i = 1; i <= 8; i++) {
            let testPosition = this.getPositionAtDirection(i);
            if (!ignoreEdge && (testPosition.x === 0 || testPosition.x === 49 || testPosition.y === 0 || testPosition.y === 49 )) { continue; }
            if (testPosition.isPassible(ignoreCreeps, ignoreEdge)) {
                // passed all tests
                positions.push(testPosition);
            }
        }
        return positions;
	};

	RoomPosition.prototype.openAdjacentExitSpots = function (ignoreCreeps){
        let positions = [];
        for (let i = 1; i <= 8; i++) {
            let testPosition = this.getPositionAtDirection(i);
            if (testPosition.x != 0 && testPosition.x != 49 && testPosition.y != 0 && testPosition.y != 49 ) { continue; }
            if (testPosition.isPassible(ignoreCreeps, false)) {
                // passed all tests
                positions.push(testPosition);
            }
        }
        return positions;
	};

	
	global.pullIdlePosForRoom = function(roomName){

		let hasVision = 0;
		if (Game.rooms[roomName]) {
			hasVision = 1;
		} 
		let id = roomId(roomName)

		// Cache valid positions
		if(global.pullIdlePos[id] === undefined ||
			hasVision && !global.pullIdlePos[id].hasVision || 
			(hasVision && global.pullIdlePos[id].ts > Game.time)
		) { 
			global.pullIdlePos[id] = {};
			global.pullIdlePos[id].hasVision = hasVision;
			global.pullIdlePos[id].ts = Game.time + 749;
			global.pullIdlePos[id].pos = [];
			let center = new RoomPosition(25, 25 , roomName);
			let openPos = getOpenPositions(center, 20, {maxPositions: 5});
			for (let idx in openPos) {
				global.pullIdlePos[id].pos.push(posCompress(openPos[idx]))
			}
		}

		if(global.idlePosTick[id] === undefined && global.pullIdlePos[id]) {
			global.idlePosTick[id] = {};
			global.idlePosTick[id].pos = _.clone(global.pullIdlePos[id].pos);
		}

		if (global.idlePosTick[id] && global.idlePosTick[id].pos && global.idlePosTick[id].pos.length > 0) {			
			let currentPosInfo = global.idlePosTick[id].pos[0];
			if (global.idlePosTick[id].pos.length > 1) {
				global.idlePosTick[id].pos.splice(0, 1);
			} else {
			//	log("out of idle rooompos for room " + roomName);
			}					
			return posDecompress(currentPosInfo, roomName);
		}
		log("missing idle rooompos for room " + roomName)
		return new RoomPosition(25, 25, roomName);

	}

	RoomPosition.prototype.pullSiegeFormationV2 = function (attackFrom){
		if (!this._pullSiegeFormationV2 || 
			Game.time > this._pullSiegeFormationV2
			){
			this._pullSiegeFormationV2 = Game.time; 
			this._allFormationV2 = this.getSiegeFormationV2(attackFrom);
		//	console.log(" this._allFormationV2 result " + this._allFormationV2.length)
		}
	//	console.log(this + " this._allFormationV2 called " + this._pullSiegeFormationV2 )

		if (this._allFormationV2.length > 0) {
		//	for (let posIdx in this._allFormationV2){
				let currentPosInfo = this._allFormationV2[0];
				this._allFormationV2.splice(0, 1);
				return currentPosInfo.pos;
		//	}
		}
		return this;
	};

	RoomPosition.prototype.pullSiegeFormation = function (attackFrom, ignoreHostile = true){

		/*
		let id = posId(this);
		if (!global.pullSiegeFormation[id] || Game.time > global.pullSiegeFormation[id].ts ) {
			global.pullSiegeFormation[id] = {};
			global.pullSiegeFormation[id].ts = Game.time + 101;*/

		if (!this._cache._pullSiegeFormation || this._cache._pullSiegeFormation !== Game.time) {
			this._cache._pullSiegeFormation = Game.time;
			this._cache._allFormation = this.getSiegeFormation(attackFrom);
		}

		if (this._cache._allFormation.length > 0) {

			// Check if im on a valid spot already
			// Find a free spot with range <= 1
			// Else return first spot?

			
			let bestSpot;
			let bestScore = 999;
			let freeSpot;
			let spot;
			let spotIdx;

			if (this.getRangeTo(attackFrom) <= 1) {
				for (let posIdx in this._cache._allFormation) {
					let currentPosInfo = this._cache._allFormation[posIdx];
					if (currentPosInfo.range >= 2) { break;}

				//	log("checking if already in pos! " + attackFrom + " vs " + currentPosInfo.pos)

					// Im on a valid pos already
					if (currentPosInfo.pos.isThisPos(attackFrom) && currentPosInfo.range <= 1){
						this._cache._allFormation.splice(posIdx, 1);
					//	log("match found! " + attackFrom + " vs " + currentPosInfo.pos)
						return currentPosInfo.pos;
					}
				}
			}
				

			for (let posIdx in this._cache._allFormation) {
				
				let currentPosInfo = this._cache._allFormation[posIdx];
				
				if (currentPosInfo.range > 1 && spot) {
					this._cache._allFormation.splice(spotIdx, 1);
					return spot;
				}

				// find any spot
				if (!ignoreHostile) {
					if(!spot && !lookForAnyCreep(currentPosInfo.pos) ) {
						spot = currentPosInfo.pos;
						spotIdx = posIdx;
					}
				} else {
					
					let blockingCreep = lookForCreep(currentPosInfo.pos)
					if (!blockingCreep || blockingCreep.my && blockingCreep._memory[C.ROLE] === 'engine' ) {
						this._cache._allFormation.splice(spotIdx, 1);
						return currentPosInfo.pos; 
					} else if (!spot) {
						spot = currentPosInfo.pos;
						spotIdx = posIdx;
					}
				}

			}

		}

		log("no sige pos for " + this + " from " + attackFrom)
		return this;
	};

	RoomPosition.prototype.scoreSiegePos = function(avoidRamparts = true, rampartScoreMultiplier = 1){
		let id = posId(this);
		
		if (!global.scoreSiegePos[id] || Game.time > global.scoreSiegePos[id].ts ) {
			global.scoreSiegePos[id] = {};
			global.scoreSiegePos[id].ts = Game.time;

			
			let score = 0;
			let positions = openAdjacentSpots(this, true).length;	// MORE SPACE === MORE BETTER
			score += (positions / 8) * 1;	// MAX +1
			let nearbyRamparts = Math.min(this.lookForStructuresAround(STRUCTURE_RAMPART, 1).length, 5);
			
			let rampartScore = rampartScoreMultiplier;
			if (avoidRamparts) {
				rampartScore *= -1;

				nearbyRamparts *= 2;

				let distantRamparts = Math.min(this.lookForStructuresAround(STRUCTURE_RAMPART, 2).length, 10);
				score += rampartScore * (distantRamparts / 10);	// MAX +/-2
				
			}
			score += rampartScore * (nearbyRamparts / 5) * 2;	// MAX +/-2

			if (getRoomTerrainAt(this) === TERRAIN_MASK_SWAMP && !this.lookForStructure(STRUCTURE_ROAD)) {
				score -= 2;
			}
			
			global.scoreSiegePos[id].score = score;
		}
		return global.scoreSiegePos[id].score;
	}

	global._occupiedSiegePositions = {}
	function registerPulledSiegePos(pos) {
		let roomName = pos.roomName;
		if (global._occupiedSiegePositions[roomName] === undefined) {
			global._occupiedSiegePositions[roomName] = {}
		}

		global._occupiedSiegePositions[roomName][posCompress(pos)] = {}
	}

	function siegePosIsPulled(compressedPos, roomName, quad=false) {
		
		if (!global._occupiedSiegePositions[roomName]) { return false}
		if (global._occupiedSiegePositions[roomName][compressedPos]) {
			return true
		}

		if (quad) {
			let pos = posDecompressXY(compressedPos, roomName)
			
			let blockPos = getPositionAtDirection(pos, LEFT);
			if (global._occupiedSiegePositions[roomName][posCompress(blockPos)]) { return true; }
			blockPos = getPositionAtDirection(pos, TOP);
			if (global._occupiedSiegePositions[roomName][posCompress(blockPos)]) { return true; }
			blockPos = getPositionAtDirection(pos, TOP_LEFT);
			if (global._occupiedSiegePositions[roomName][posCompress(blockPos)]) { return true; }
		}

		return false;
	}

	RoomPosition.prototype.pullSiegeFormationCombatPhalanx = function (attackFrom, ignoreHostile = true, phalanx = false, maxRange = 3, attackTarget, minRange = 0, myPower){

		let id = posId(this) + phalanx;
		if (!global.pullSiegeFormationCombat[id] || Game.time > global.pullSiegeFormationCombat[id].ts ) {

			global.pullSiegeFormationCombat[id] = {};
			global.pullSiegeFormationCombat[id].ts = Game.time; // + 7;
			
			// Prefer corner or adjacent
			let directAdjacent = {[TOP] : {}, [BOTTOM] : {}, [LEFT] : {}, [RIGHT] : {}, }
			let cornerScore = 1;
			let avoidRamparts = true;

			let power
			if (myPower) {
				power = myPower
			} 

			if (this.myCombatStrengthLarger(4, power)) {				
				avoidRamparts = false;
			}
			/*
			else if (this.canOneShotMe(4) ){

			}*/

			let siegeFormations = this.getSiegeFormation(attackFrom);
			let formationsToRate = [];

			let preferCloser = false;
			let rangeScore = 2;
			if (attackTarget && (attackTarget.isCreep || attackTarget.isPowerCreep)) {
				preferCloser = true;
				rangeScore = 5;
			}

			let rampartScoreMultiplier = 1;
			if (minRange > 0) {
				rangeScore = 1.5;
				rampartScoreMultiplier = 3;
			}

			for (let idx in siegeFormations) {
				if (formationsToRate.length > 12 && siegeFormations[idx].range > 3) { break; }

				let posToScore = siegeFormations[idx].pos;
				if (phalanx && !reachableRaidPos(posToScore, attackFrom, phalanx)) {
					continue;
				}

				let score = 0;
				if (siegeFormations[idx].range - 1 > maxRange) {
				//	Game.rooms[this.roomName].visual.text("-" , posToScore.x, posToScore.y, {color: 'red', font: 1.0});
					continue;
				}

				let formations = getPhalanxFormation(posToScore);
				if (formations.length < 4) { continue; }
				let phalanxPos = [];

				let range = Infinity;
				let invalidFormationPos = false;			

				for (let idxFormation in formations) {
					
					let pos = formations[idxFormation].pos;

					if (phalanx && !reachableRaidPos(pos, attackFrom, phalanx) ) {
						invalidFormationPos = true;
						break;
					}

					let currentRange = Math.min(this.getRangeTo(pos), 25) || 25;	// getRangeTo fails if out of room?
					if (currentRange < range) {
						range = currentRange;
					}

					score += 2 * pos.scoreSiegePos(avoidRamparts, rampartScoreMultiplier);
					score += 3 - (currentRange*rangeScore);

					if (directAdjacent[pos.getDirectionTo(this)]) {
						score += cornerScore;
					}

					if (formations[idxFormation].anchor) { continue; }
					phalanxPos.push(posCompress(pos));

				}

				if (invalidFormationPos) {
					continue;
				}

				if (range < minRange) {
					continue;
				}

				if (range > maxRange) {
				//	Game.rooms[this.roomName].visual.text("-" , posToScore.x, posToScore.y, {color: 'blue', font: 0.8});
					continue;
				}
 
				// Add hosile strength vs myStrength to score
			//	score -= formations[idx].range * 10;

			//	Game.rooms[this.roomName].visual.text(score.toFixed(1) , posToScore.x, posToScore.y, {color: 'red', font: 0.4});

				formationsToRate.push([posCompress(posToScore), score, phalanxPos]);
			}

			formationsToRate.sort(function(a, b) {
				return (b[1] - a[1]);});
	
			global.pullSiegeFormationCombat[id]._SiegeFormationCombat = formationsToRate;
		}

		if (!global.pullSiegeFormationCombat[id]._inTickFormations || Game.time !== global.pullSiegeFormationCombat[id]._inTickFormationsTs) {
			global.pullSiegeFormationCombat[id]._inTickFormations = _.clone(global.pullSiegeFormationCombat[id]._SiegeFormationCombat);
			global.pullSiegeFormationCombat[id]._inTickFormationsTs = Game.time;
		}
		
		if (global.pullSiegeFormationCombat[id]._inTickFormations.length > 0) {
			
			for (let posIdx in global.pullSiegeFormationCombat[id]._inTickFormations){

				let currentPosInfo = posDecompress(global.pullSiegeFormationCombat[id]._inTickFormations[posIdx][0], this.roomName);				
				if (!ignoreHostile && currentPosInfo.lookForHostileCreep() ) {
					continue;
				}

				if (siegePosIsPulled(global.pullSiegeFormationCombat[id]._inTickFormations[posIdx][0], this.roomName, true)) { 
					continue;
				}

				let formations = global.pullSiegeFormationCombat[id]._inTickFormations[posIdx][2];

				global.pullSiegeFormationCombat[id]._inTickFormations.splice(posIdx, 1);
				
				for (let idx in formations) {
					// remove as valid option for others
					let formationPos = formations[idx];
					let posIdxChck = global.pullSiegeFormationCombat[id]._inTickFormations.length;

				//	for (let posIdxChck in global.pullSiegeFormationCombat[id]._inTickFormations){
					while (posIdxChck--) {
						let validPos = global.pullSiegeFormationCombat[id]._inTickFormations[posIdxChck][0]
						
						if (validPos === formationPos) {
						//	let showPos = posDecompress(validPos, this.roomName);
						//	Game.rooms[this.roomName].visual.text("!" , showPos.x, showPos.y, {color: 'blue', font: 1.0});
							global.pullSiegeFormationCombat[id]._inTickFormations.splice(posIdxChck, 1);
						}
					}
				}

				Game.rooms[this.roomName].visual.text("!" , currentPosInfo.x, currentPosInfo.y, {color: 'red', font: 1.0});

			

				registerPulledSiegePos(currentPosInfo)
				let blockPos = currentPosInfo.getPositionAtDirection(LEFT);
				Game.rooms[this.roomName].visual.text("-" , blockPos.x, blockPos.y, {color: 'red', font: 1.0});
				registerPulledSiegePos(blockPos)
				blockPos = currentPosInfo.getPositionAtDirection(TOP);
				Game.rooms[this.roomName].visual.text("-" , blockPos.x, blockPos.y, {color: 'red', font: 1.0});
				registerPulledSiegePos(blockPos)
				blockPos = currentPosInfo.getPositionAtDirection(TOP_LEFT);
				Game.rooms[this.roomName].visual.text("-" , blockPos.x, blockPos.y, {color: 'red', font: 1.0});
				registerPulledSiegePos(blockPos)

				return currentPosInfo;
			}
		}
		return this;
	};

	RoomPosition.prototype.pullSiegeFormationCombat = function (attackFrom, ignoreHostile = true){

		let id = posId(this);
		if (!global.pullSiegeFormationCombat[id] || Game.time > global.pullSiegeFormationCombat[id].ts ) {
			global.pullSiegeFormationCombat[id] = {};
			global.pullSiegeFormationCombat[id].ts = Game.time + 101;
			
			let formations = this.getSiegeFormation(attackFrom);
			let formationsToRate = [];
			for (let idx in formations) {
				if (formationsToRate.length > 8 && formations[idx].range > 1) { break; }
				let posToScore = formations[idx].pos;
				let score = posToScore.scoreSiegePos();
				score -= formations[idx].range*10;
				Game.rooms[this.roomName].visual.text(score.toFixed(1) , posToScore.x, posToScore.y, {color: 'red', font: 0.5});
				formationsToRate.push([posSave(posToScore), score]);
			}

			formationsToRate.sort(function(a, b) {
				return (b[1] - a[1]);});

			global.pullSiegeFormationCombat[id]._SiegeFormationCombat = formationsToRate;
		}

		if (!global.pullSiegeFormationCombat[id]._inTickFormations || Game.time !== global.pullSiegeFormationCombat[id]._inTickFormationsTs) {
			global.pullSiegeFormationCombat[id]._inTickFormations = _.clone(global.pullSiegeFormationCombat[id]._SiegeFormationCombat);
			global.pullSiegeFormationCombat[id]._inTickFormationsTs = Game.time;
		}



		if (global.pullSiegeFormationCombat[id]._inTickFormations.length > 0) {
		//	console.log(" pullSiegeFormationCombat " + this._SiegeFormationCombat.length + " valid pos")'
		/*
			if (ignoreHostile) {
				let currentPosInfo = posLoad(global.pullSiegeFormationCombat[id]._inTickFormations[0][0]);
				global.pullSiegeFormationCombat[id]._inTickFormations.splice(0, 1);				
				Game.rooms[this.roomName].visual.text("!" , currentPosInfo.x, currentPosInfo.y, {color: 'red', font: 1.0});
				registerPulledSiegePos(currentPosInfo)
				return currentPosInfo;
				
			} else {*/
			for (let posIdx in global.pullSiegeFormationCombat[id]._inTickFormations){
				let currentPosInfo = posLoad(global.pullSiegeFormationCombat[id]._inTickFormations[posIdx][0]);
				if (!ignoreHostile && currentPosInfo.lookForHostileCreep() ) {
					continue;
				}
				if (siegePosIsPulled(global.pullSiegeFormationCombat[id]._inTickFormations[posIdx][0], this.roomName)) { 
					continue;
				}
				global.pullSiegeFormationCombat[id]._inTickFormations.splice(posIdx, 1);
				registerPulledSiegePos(currentPosInfo)
				return currentPosInfo;
			}
			
		}
		return this;
	};

	RoomPosition.prototype.pullRepairFormation = function (aproachFrom, myId){
		if (!this._pullRepairFormation) {			
			this._pullRepairFormation = this.getRepairFormation(aproachFrom);
		}

		if (this._pullRepairFormation.length > 0) {
			/*
			let currentPosInfo = this._pullRepairFormation[0];
			this._pullRepairFormation.splice(0, 1);
			return currentPosInfo;
			*/

			for (let idx in this._pullRepairFormation) {
				let pos = this._pullRepairFormation[idx];
				let occupied = lookForCreep(pos)
				if (occupied && occupied.id !== myId) { continue; }
				let currentPosInfo = this._pullRepairFormation[idx];
				this._pullRepairFormation.splice(idx, 1);
				return currentPosInfo;
			}

		}
		return this;
	}
		
	RoomPosition.prototype.getRepairFormation = function (aproachFrom, requiredPositions = 100){
		let id = posId(this)		
		if (global.getRepairFormation[id] === undefined || Game.time > global.getRepairFormation[id].ts) {


			global.getRepairFormation[id] = {};
			global.getRepairFormation[id].ts = Game.time + 999;	

			let tempPos = getSiegeFormation(this, aproachFrom);
			let sortable = [];

			let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);

			for (let idx in tempPos) {
				let score = 0;	// lower is better
				let currentPosInfo = tempPos[idx].pos;
				if (isOutsideWalls(currentPosInfo, segmentOOB)) { continue; }
				let rampart = lookForStructureAt(STRUCTURE_RAMPART, currentPosInfo);
				if (posWithinAttackRangeOfOutside(currentPosInfo) && !rampart ) { continue; }
				score -= tempPos[idx].range * 4;
				if (bordersToOutsidePixel(currentPosInfo, segmentOOB))	{ score += 15; }
				if (lookForStructureAt(STRUCTURE_ROAD, currentPosInfo)) { score += 5; }
				if (rampart) { score += 5; }
			//	console.log("range " + tempPos[idx].range)
				sortable.push([currentPosInfo, score]);
			}
			sortable.sort(function(a, b) {
				return a[1] - b[1];
			});

			global.getRepairFormation[id] = [];
			for (let idx in sortable){
				global.getRepairFormation[id].push(posCompress(sortable[idx][0]));
				Game.rooms[this.roomName].visual.text(sortable[idx][1]  , sortable[idx][0].x, sortable[idx][0].y, {color: 'red', font: 0.8});
			}
		}

		if (!this._formationValidPosRepair) {
			this._formationValidPosRepair = [];			
			for (let idx in global.getRepairFormation[id]) {
				let pos = posDecompressXY(global.getRepairFormation[id][idx], this.roomName);
			//	Game.rooms[this.roomName].visual.text(idx  , pos.x, pos.y, {color: 'green', font: 0.8});			
				this._formationValidPosRepair.push(pos); 
				if (idx > requiredPositions) { break; }
			}
		}
		return this._formationValidPosRepair;		
	}

	RoomPosition.prototype.countUpgraderFormation = function (aproachFrom) {
		let formations = getSiegeFormation(this, aproachFrom);
		return formations.length;
	}

	global._registerdUpgraderPos = {}
	function registerUpgraderPos(pos){

		let roomName = pos.roomName;
		if (global._registerdUpgraderPos[roomName] === undefined) { global._registerdUpgraderPos[roomName] = {} }

		global._registerdUpgraderPos[roomName][posCompress(pos)] = {
			ts: Game.time + 35
		}
	}

	global.getRegisteredUpgraderPos = function(roomName) {
		let ret = []
		if (global._registerdUpgraderPos[roomName] === undefined) { return ret}
		for (let pos in global._registerdUpgraderPos[roomName]) {
			if (Game.time > global._registerdUpgraderPos[roomName][pos].ts) { 
				delete global._registerdUpgraderPos[roomName][pos]
				continue; 
			}
			ret.push(posDecompressXY(pos, roomName))
		}
		return ret;
	}

	RoomPosition.prototype.pullUpgraderFormation = function (aproachFrom, myId){
		if (!this._pullUpgraderFormation) {			
			this._pullUpgraderFormation = this.getUpgraderFormation(aproachFrom);
		}

		if (this._pullUpgraderFormation.length > 0) {

			for (let idx in this._pullUpgraderFormation) {
				let pos = this._pullUpgraderFormation[idx];
				let occupied = lookForCreep(pos);
				if (occupied && occupied.id !== myId && occupied._memory[C.ROLE] === "upgrader") { continue; }
				let currentPosInfo = this._pullUpgraderFormation[idx];
				this._pullUpgraderFormation.splice(idx, 1);
				registerUpgraderPos(currentPosInfo);
				return currentPosInfo;
			}

			/*
			let currentPosInfo = this._pullUpgraderFormation[0];
			this._pullUpgraderFormation.splice(0, 1);
			return currentPosInfo;
			*/

			
		}
		return this;
	}

	RoomPosition.prototype.getUpgraderFormation = function (aproachFrom, requiredPositions = 100){
		let id = posId(this) + posId(aproachFrom)
		if (global.getUpgraderFormation[id] === undefined || Game.time > global.getUpgraderFormation[id].ts) {

			global.getUpgraderFormation[id] = {};
			global.getUpgraderFormation[id].ts = Game.time + 999;	
			if (getRoomPRCL(this.roomName) <= 4) {
				global.getUpgraderFormation[id].ts = Game.time + 99;
			}

			let tempPos = getSiegeFormation(this, aproachFrom);
			let sortable = [];
			let container = _.filter(Game.rooms[this.roomName].findByType(STRUCTURE_CONTAINER), 
				function(structure) {return (structure.isController() ) });
			let link = _.filter(Game.rooms[this.roomName].findByType(STRUCTURE_LINK), 
				function(structure) {return (structure.isController() ) });

			let containerScore = 1;	
			let storeLink = _.filter(Game.rooms[this.roomName].findByType(STRUCTURE_LINK), 
				function(structure) {return (structure.isStorage() ) });
			if (!storeLink || storeLink.length <= 0 ) {
				containerScore = 2	// prefer containers
			}
			let noEnergyStore = false;
			
			let controllerContainerPos;
			if (container.length == 0 && link.length == 0 ){
				noEnergyStore = true;
				controllerContainerPos = Game.rooms[this.roomName].getControllerContainerPos()
			}
			let controller = Game.rooms[this.roomName].controller.pos;
			for (let idx in tempPos) {
				let score = 0;	// lower is better
				let currentPosInfo = tempPos[idx].pos;				
				if (lookForStructureAt(STRUCTURE_ROAD, currentPosInfo)) { score += 5; } 
				let rangeToController = getRangeTo(currentPosInfo, controller);
				if (rangeToController > 3) { continue; }				
				if (noEnergyStore) { 
					
					score = rangeToController / 3;
					let rangeToControllerContainer = getRangeTo(currentPosInfo, controllerContainerPos)
					
					if (rangeToControllerContainer === 0) { continue; }
					score += getRangeTo(currentPosInfo, controllerContainerPos) 
				} else {
					for (let i = 0; i < container.length; i++) {
						let range = getRangeTo(currentPosInfo, container[i].pos)
						if (range === 0) { // avoid standing on container to allow energy to be placed on top
							score += 1.5 * containerScore;
						} else {
							score += range * containerScore;
						}						
					}
					for (let i = 0; i < link.length; i++) {
						score += getRangeTo(currentPosInfo, link[i].pos);						
					}
					score += rangeToController/3

				}
				sortable.push([currentPosInfo, score]);
			}
			sortable.sort(function(a, b) {
				return a[1] - b[1];
			});

			global.getUpgraderFormation[id].pos = [];
			for (let idx in sortable){
				global.getUpgraderFormation[id].pos.push(posCompress(sortable[idx][0]));
				Game.rooms[this.roomName].visual.text(sortable[idx][1].toFixed(1)  , sortable[idx][0].x, sortable[idx][0].y, {color: 'green', font: 0.5});
			//	Game.rooms[this.roomName].visual.text(idx  , sortable[idx][0].x, sortable[idx][0].y, {color: 'green', font: 0.8});
			}
		}

		if (!this._formationValidPosUpgrader) {
			this._formationValidPosUpgrader = [];			
			for (let idx in global.getUpgraderFormation[id].pos) {
				let pos = posDecompressXY(global.getUpgraderFormation[id].pos[idx], this.roomName);
			//	Game.rooms[this.roomName].visual.text(idx  , pos.x, pos.y, {color: 'green', font: 0.8});			
				this._formationValidPosUpgrader.push(pos); 
				if (idx > requiredPositions) { break; }
			}
		}
		return this._formationValidPosUpgrader;		
	}
	
/*
	RoomPosition.prototype.getSiegeFormationV2 = function (attackFrom, requiredPositions = 100, allowEdge= false){

		let id = posId(this);
		if (!global.formationValidPosV2[id] || Game.time > global.formationValidPosV2[id].ts) {

			global.formationValidPosV2[id] = {};
			global.formationValidPosV2[id].ts = Game.time + 1// + 101;
			global.formationValidPosV2[id].pos = [];
			let roomName = this.roomName;			

			let reachable = {};
			let unReachable = {};

			let loopRange = 3;
			let n = 0; 
			let ret = ulamSpiral(n);			
			while (ret.sq <= loopRange) {
				ret = ulamSpiral(n);
			//	console.log("looping " + n + " range " + ret.sq + "/" + loopRange)
		        n += 1;
		        if (ret.sq <= loopRange) {
			        let x = limit(this.x + ret.x, 0, 49);
					let y = limit(this.y + ret.y, 0, 49);
					let posToCheck = new RoomPosition(x, y, roomName);
					let confirmed;
				//	let posToCheck = new RoomPosition(limit(x + this.x, 0, 49), limit(y + this.y, 0, 49), roomName);
					
				//	console.log("checking pos " +posToCheck)
					if (!posToCheck.isPassible(true, allowEdge)) { continue; }

				//	console.log("checking pos passed " +posToCheck)

					for (let idx in reachable) {	// CHECK IF CONNECTED TO REACHABLE
						let pos = posDecompress(idx, roomName)
						if (pos.getRangeTo(posToCheck) <= 1) {
							reachable[posCompress(posToCheck)] = {};
							confirmed = true;
						//	formationValidPos.push({ pos: posCompress(posToCheck), range : Math.min(x,y)});
						//	let range = Math.min(Math.abs(x-this.x),Math.abs(y-this.y))
							global.formationValidPosV2[id].pos.push({ pos: posCompress(posToCheck), range : ret.sq});
						//	Game.rooms[this.roomName].visual.circle(posToCheck.x, posToCheck.y , {fill: 'transparent', radius: 0.50, stroke: 'green'});
							break;
						}
					}

					if (!confirmed) {	// CHECK IF CONNECTED TO NON REACHABLE
						for (let idx2 in unReachable) {							
							let pos = posDecompress(idx2, roomName)
							if (pos.getRangeTo(posToCheck) <= 1) {
								unReachable[posCompress(posToCheck)] = {};

							//	Game.rooms[this.roomName].visual.circle(posToCheck.x, posToCheck.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
								confirmed = true;
								break;
							}
						}
					}

					if (!confirmed) {	// USE TRAVELER TO SET REACHABLE
						let path = findTravelPath(attackFrom, posToCheck, {ignoreCreeps: true, range: 0, ignoreRoads: true, maxOps: 3250, maxRooms: 1, denyTunnel: true});		
						if (path.incomplete) {
							unReachable[posCompress(posToCheck)] = {};
						//	Game.rooms[this.roomName].visual.circle(posToCheck.x, posToCheck.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
						} else {
						//	Game.rooms[this.roomName].visual.circle(posToCheck.x, posToCheck.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'});
							reachable[posCompress(posToCheck)] = {};
						//	let range = Math.min(Math.abs(x-this.x),Math.abs(y-this.y))
							global.formationValidPosV2[id].pos.push({ pos: posCompress(posToCheck), range : ret.sq});
						//	formationValidPos.push({ pos: posCompress(posToCheck), range : Math.min(x,y)}); 
						}
					}
				}
			}
		

		}
		if (!this._formationValidPosV2 || 
			Game.time > this._formationValidPosV2Ts
			) {
			this._formationValidPosV2Ts = Game.time;
			this._formationValidPosV2 = [];
			let roomName = this.roomName;
			for (let idx in global.formationValidPosV2[id].pos) {
				let pos = posDecompress(global.formationValidPosV2[id].pos[idx].pos, this.roomName);
			//	console.log(pos)
			//	Game.rooms[this.roomName].visual.text(global.formationValidPosV2[id].pos[idx].range, pos.x, pos.y, {color: 'green', font: 0.8});	
				this._formationValidPosV2.push({ pos: pos, range : global.formationValidPosV2[id].pos[idx].range}); 
				if (idx > requiredPositions) { break; }
			}
		}
	//	console.log("returning formationValidPosV2 " + this._formationValidPosV2.length)
		return this._formationValidPosV2;


	}
	*/


	RoomPosition.prototype.phalanxGetRangeTo = function (pos) {
		let closestRange = Infinity;
		closestRange = Math.min(getRangeTo(this, pos), closestRange)

		let leftPos = getPositionAtDirectionWrapToNextRoom(this, LEFT);
		closestRange = Math.min(getRangeTo(leftPos, pos), closestRange)
		let topPos = getPositionAtDirectionWrapToNextRoom(this, TOP);
		closestRange = Math.min(getRangeTo(topPos, pos), closestRange)
		let topLeftPos = getPositionAtDirectionWrapToNextRoom(this, TOP_LEFT);
		closestRange = Math.min(getRangeTo(topLeftPos, pos), closestRange)
		return closestRange;
	}

	RoomPosition.prototype.phalanxIsNearExit = function (range) {
		if (isNearExit(this, range)) { return true;}
		// Anchor position is bottom right
		let leftPos = getPositionAtDirectionWrapToNextRoom(this, LEFT);
		if (isNearExit(leftPos, range)) { return true;}
		let topPos = getPositionAtDirectionWrapToNextRoom(this, TOP);
		if (isNearExit(topPos, range)) { return true;}
		let topLeftPos = getPositionAtDirectionWrapToNextRoom(this, TOP_LEFT);
		if (isNearExit(topLeftPos, range)) { return true;}
		return false;
	}

	global.registerPhalanxBlocker = function(pos, fromThis = true, id = undefined){
		let roomName = pos.roomName
		if (global.blockers[roomName] === undefined) { 
			global.blockers[roomName] = [];
		} 

		global.blockers[roomName][posCompress(pos)] = { id: id };

		if (fromThis) {
			let blockPos = getPositionAtDirection(pos, LEFT)
			global.blockers[roomName][posCompress(blockPos)] = { id: id };
			blockPos = getPositionAtDirection(pos, TOP);
			global.blockers[roomName][posCompress(blockPos)] = { id: id };
			blockPos = getPositionAtDirection(pos, TOP_LEFT);
			global.blockers[roomName][posCompress(blockPos)] = { id: id };
		} else {
			let blockPos = getPositionAtDirection(pos, RIGHT);
			global.blockers[roomName][posCompress(blockPos)] = { id: id };
			blockPos = getPositionAtDirection(pos, BOTTOM);
			global.blockers[roomName][posCompress(blockPos)] = { id: id };
			blockPos = getPositionAtDirection(pos, BOTTOM_RIGHT);
			global.blockers[roomName][posCompress(blockPos)] = { id: id };
		}
		

	}


	

	RoomPosition.prototype.phalanxChecCriticalDmgNextStep = function(phalanxCreeps, nextDir) {

		let roomName = this.roomName;

		if (!Game.rooms[roomName]) { return false; }

	//	let enemies = Game.rooms[roomName].find(FIND_HOSTILE_CREEPS);

		let enemies = getEnemyCreeps(roomName);	
		let towers = getEnemyTowers(roomName);

		/*
		let towers = _.filter(Game.rooms[roomName].findByType(STRUCTURE_TOWER), 
			function(c) {return (c.energy > 10 && !c.my);
			});*/

		let nextPosCritical = false	
		for (let idx in phalanxCreeps) {
			let totalDamage = 0;
			let creep = phalanxCreeps[idx];
			let dmgCriticalDmg = creep.hitsMax * 0.15;

			totalDamage += getTowerDamage(creep.pos, towers);
			totalDamage += getCreepDamagePotential(creep.pos, enemies);
			let healing = getCreepHeal(creep, phalanxCreeps);
			let dmgTaken = effectiveDamage(creep.body, creep.hits, totalDamage, healing);
		//	log("current dmg " + dmgTaken + " / " + dmgCriticalDmg.toFixed(0))

			if (dmgTaken > dmgCriticalDmg) { return false; } // Already in a bad spot, allow move anywhere
			let currentDmg = totalDamage;

			let nextPos = creep.pos.getPositionAtDirectionWrapToNextRoom(nextDir);
			if (!nextPos || nextPos.roomName !== roomName) { continue; }

			let nextDmg = 0
			nextDmg += getTowerDamage(nextPos, towers);
			nextDmg += getCreepDamagePotential(nextPos, enemies);

			healing = getCreepHeal(creep, phalanxCreeps);
			let nextDmgTaken = effectiveDamage(creep.body, creep.hits, nextDmg, healing);

		//	log("next dmg " + nextDmgTaken + " / " + dmgCriticalDmg.toFixed(0))

			if (nextDmgTaken > dmgCriticalDmg ) { // Next pos is deadly
				nextPosCritical = true;
				Game.rooms[roomName].visual.circle(nextPos.x, nextPos.y , {fill: 'transparent', radius: 0.50, stroke: 'brown'});
			}
		}

		if (nextPosCritical) { return true; }

	}

	global.getBlockersforPhalanxFormation = function (id, formations) {
		let blocking = [];
	
		for (let idx in formations) {
			let _pos = formations[idx].pos;
			let room = Game.rooms[_pos.roomName];
			if (!room) { continue; }
			let creep = lookForAnyCreep(_pos);
			if (creep) {
				if(!creep.my || creep._memory.raidId !== id ) {
					blocking.push(creep)
					registerPhalanxBlocker(creep.pos, false)
				}
			}
			let found = room.lookForAt(LOOK_STRUCTURES, _pos.x, _pos.y);
			if (found && found.length) {
				for (let idx2 in found) {
					let structure = found[idx2]
					if (structure.structureType === STRUCTURE_RAMPART && structure.my) { continue; }
					if (OBSTACLE_OBJECT_TYPES.includes(structure.structureType)) {
						blocking.push(structure)
					}
				}
			}
		}

		return blocking;
	}

	function getNextdoorExitPrev(pos){
		let room, x, y
		let exits = Game.map.describeExits(pos.roomName);
		if (pos.x === 0) {
			x = 48;			
			if (exits[LEFT]) {
				room = exits[LEFT];
				return new RoomPosition(x, pos.y, room);
			}			
		} else if ( pos.x === 49) {
			x = 1;
			if (exits[RIGHT]) {
				room = exits[RIGHT];
				return new RoomPosition(x, pos.y, room);
			}
			
		} else if (pos.y === 0) {
			y = 48;
			if (exits[TOP]) {
				room = exits[TOP];
				return new RoomPosition(pos.x, y, room);
			}			
		} else if (pos.y === 49) {
			y = 1;
			if (exits[BOTTOM]) {
				room = exits[BOTTOM];	
				return new RoomPosition(pos.x, y, room);			
			}			
		}

		return pos
	}

	function getNextdoorExit(pos){

		let room, x, y
		let exits = Game.map.describeExits(pos.roomName);
		if (pos.x === 0) {
			x = 49;			
			if (exits[LEFT]) {
				room = exits[LEFT];
				return new RoomPosition(x, pos.y, room);
			}			
		} else if ( pos.x === 49) {
			x = 0;
			if (exits[RIGHT]) {
				room = exits[RIGHT];
				return new RoomPosition(x, pos.y, room);
			}
			
		} else if (pos.y === 0) {
			y = 49;
			if (exits[TOP]) {
				room = exits[TOP];
				return new RoomPosition(pos.x, y, room);
			}			
		} else if (pos.y === 49) {
			y = 0;
			if (exits[BOTTOM]) {
				room = exits[BOTTOM];
				return new RoomPosition(pos.x, y, room);			
			}			
		}

		return pos
	}

	global._phalanxFormationCache = {}
	global.getPhalanxFormation = function (pos, direction) {

		//	--
		//	-A

		// 	FF	BF	FB	BB
		// 	BB	BF	FB	FF

		let roomName = pos.roomName
		if (global._phalanxFormationCache[roomName] === undefined) { global._phalanxFormationCache[roomName] = {} }
						
		let validTurnDirections = {[TOP] : {}, [BOTTOM] : {}, [LEFT] : {}, [RIGHT] : {}, }

		if (!direction || !validTurnDirections[direction]) {
			direction = ANY;
		}

		let id = posCompress(pos) + direction;
		if (global._phalanxFormationCache[roomName][id] === undefined) {		

			let cache = global._phalanxFormationCache[roomName][id] = []

			let ANCHOR = "Anchor";
			let formationDirection = { 
				[TOP] : 	{ [ANCHOR] : BACK, 	[LEFT] : BACK, 	[TOP] : FRONT, 	[TOP_LEFT] : FRONT},
				[RIGHT] : 	{ [ANCHOR] : FRONT, [LEFT] : BACK, 	[TOP] : FRONT, 	[TOP_LEFT] : BACK},
				[LEFT] : 	{ [ANCHOR] : BACK, 	[LEFT] : FRONT, [TOP] : BACK, 	[TOP_LEFT] : FRONT},
				[BOTTOM] : 	{ [ANCHOR] : FRONT, [LEFT] : FRONT, [TOP] : BACK, 	[TOP_LEFT] : BACK},
				[ANY] : 	{ [ANCHOR] : ANY, 	[LEFT] : ANY, 	[TOP] : ANY, 	[TOP_LEFT] : ANY},
			}

			// Anchor position is bottom right
			let positions = [];
			let registeredPos = {};

			let onLeftExit = false;
			let onTopExit = false;
			
			positions.push({pos: pos, type: formationDirection[direction][ANCHOR], anchor: 1 });
			registeredPos[posId(pos)] = {};
			if (isNearExit(pos, 0)) {
				
				if (pos.x === 0) {
					onLeftExit = true;
				} else if (pos.y === 0) {
					onTopExit = true;
				}


				positions.push({pos: getNextdoorExit(pos), type: formationDirection[direction][ANCHOR], anchor: 1});
			}

			let leftPos = pos.getPositionAtDirectionWrapToNextRoom(LEFT);
			if (onLeftExit) {
				leftPos = leftPos.getPositionAtDirectionWrapToNextRoom(LEFT);
			}

			if (leftPos.isPassible(true, true)) {
				positions.push({pos: leftPos, type: formationDirection[direction][LEFT] });			

				// If crossing border it needs to add additional pos as it skips the exit pos of the current room
				if (leftPos.isNearExit(0)) {
					positions.push({pos: getNextdoorExit(leftPos), type: formationDirection[direction][LEFT] });
				}
			}
			
			let topPos = pos.getPositionAtDirectionWrapToNextRoom(TOP);	
			if (onTopExit) {
				topPos = topPos.getPositionAtDirectionWrapToNextRoom(TOP);
			}	

			if (topPos.isPassible(true, true)) {
				positions.push({pos: topPos, type: formationDirection[direction][TOP] });

				if (topPos.isNearExit(0)) {
					positions.push({pos: getNextdoorExit(topPos), type: formationDirection[direction][TOP] });
				}
			}

			let topLeftPos = pos.getPositionAtDirectionWrapToNextRoom(TOP_LEFT);
			if (onLeftExit) {
				topLeftPos = topLeftPos.getPositionAtDirectionWrapToNextRoom(LEFT);
			} else if (onTopExit) {
				topLeftPos = topLeftPos.getPositionAtDirectionWrapToNextRoom(TOP);
			}

			if (topLeftPos.isPassible(true, true)) {
				positions.push({pos: topLeftPos, type: formationDirection[direction][TOP_LEFT] });

				if (topLeftPos.isNearExit(0)) {
					positions.push({pos: getNextdoorExit(topLeftPos), type: formationDirection[direction][TOP_LEFT] });
				}
			}

			for (let idx in positions) {
				cache.push({pos: posCompress(positions[idx].pos), type: positions[idx].type})
			}
			return positions;
		}

		let positions = []
		let cache = global._phalanxFormationCache[roomName][id]
		for (let idx in cache) {
			positions.push({pos: posDecompress(cache[idx].pos, roomName), type: cache[idx].type})
		}

		return positions
	}

	global.getSiegeFormation = function (posToAttack, attackFrom, requiredPositions = 100, allowEdge= false){
		
		let id = posId(posToAttack);
		if (!global.formationValidPos[id] || Game.time > global.formationValidPos[id].ts) {
			global.formationValidPos[id] = {};
			global.formationValidPos[id].ts = Game.time + 37;
			if (!Game.rooms[posToAttack.roomName]) {
				global.formationValidPos[id].ts = Game.time + 7;
			}
			
			global.formationValidPos[id].pos = [];
			let _formationValidPos = [];
		//	let range1Pos = this.openAdjacentSiegeSpots(true, allowEdge);

			let range1Pos = openAdjacentSiegeSpots(posToAttack, true, allowEdge)
			
			let addedPos = {};
			for (let posIdx in range1Pos){
				let pos = range1Pos[posIdx];
				let path = findTravelPath(attackFrom, pos, {ignoreCreeps: true, ignoreRoads: true, maxOps: 3250, maxRooms: 1, denyTunnel: true});		
				if (!path.incomplete) {
					_formationValidPos.push({ pos: pos, range : 1, path: path.path.length});
					let compressedPos = posCompress(pos)
					global.formationValidPos[id].pos.push({ pos: compressedPos, range : 1});
					addedPos[compressedPos] = {}; 
					Game.rooms[posToAttack.roomName].visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'yellow'});
				}
			}

			let range2pos = [];	// ADD ALL RANGE 2
			for (let posIdx in _formationValidPos){
				range2pos = range2pos.concat(openAdjacentSiegeSpots(_formationValidPos[posIdx].pos, true, allowEdge));
			}

			for (let posIdx2 in range2pos){ // REMOVE OVERLAPPING
				let pos = range2pos[posIdx2];
				let compressedPos = posCompress(pos);
				if (!addedPos[compressedPos]) {
					_formationValidPos.push({ pos: pos, range : 2});
					global.formationValidPos[id].pos.push({ pos: compressedPos, range : 2});
					addedPos[compressedPos] = {};
					Game.rooms[posToAttack.roomName].visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'green'});
				}


				
			}

			let range3pos = [];	// ADD ALL RANGE 3
			for (let posIdx in _formationValidPos){
				if (_formationValidPos[posIdx].range !== 2) { continue; }
				range3pos = range3pos.concat(openAdjacentSiegeSpots(_formationValidPos[posIdx].pos, true, allowEdge));							
			}

			for (let posIdx3 in range3pos){ // REMOVE OVERLAPPING IN RANGE 1 + 2
				let pos = range3pos[posIdx3];
				let compressedPos = posCompress(pos);
				if (!addedPos[compressedPos]) {
					_formationValidPos.push({ pos: pos, range : 3});
					global.formationValidPos[id].pos.push({ pos: compressedPos, range : 3});					
					addedPos[compressedPos] = {};
					Game.rooms[posToAttack.roomName].visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'}); 
				}
			}
		}

		
		if (!global.formationValidPos[id]._formationValidPos || global.formationValidPos[id].retTs !== Game.time) {
			global.formationValidPos[id]._formationValidPos = [];			
			global.formationValidPos[id].retTs = Game.time;
			for (let idx in global.formationValidPos[id].pos) {
				let pos = posDecompressXY(global.formationValidPos[id].pos[idx].pos, posToAttack.roomName);
				
			//	Game.rooms[this.roomName].visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
			global.formationValidPos[id]._formationValidPos.push({ pos: pos, range : global.formationValidPos[id].pos[idx].range}); 
				if (idx > requiredPositions) { break; }
			}
		}
		return global.formationValidPos[id]._formationValidPos;
	};


	RoomPosition.prototype.getSiegeFormation = function (attackFrom, requiredPositions = 100, allowEdge= false){
		
		let id = posId(this);
		if (!global.formationValidPos[id] || Game.time > global.formationValidPos[id].ts) {
			global.formationValidPos[id] = {};
			global.formationValidPos[id].ts = Game.time + 37;
			if (!Game.rooms[this.roomName]) {
				global.formationValidPos[id].ts = Game.time + 7;
			}
			
			global.formationValidPos[id].pos = [];
			let _formationValidPos = [];
		//	let range1Pos = this.openAdjacentSiegeSpots(true, allowEdge);

			let range1Pos = openAdjacentSiegeSpots(this, true, allowEdge)
			
			let addedPos = {};
			for (let posIdx in range1Pos){
				let pos = range1Pos[posIdx];
				let path = findTravelPath(attackFrom, pos, {ignoreCreeps: true, ignoreRoads: true, maxOps: 3250, maxRooms: 1, denyTunnel: true});		
				if (!path.incomplete) {
					_formationValidPos.push({ pos: pos, range : 1, path: path.path.length});
					let compressedPos = posCompress(pos)
					global.formationValidPos[id].pos.push({ pos: compressedPos, range : 1});
					addedPos[compressedPos] = {}; 
					Game.rooms[this.roomName].visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'yellow'});
				}
			}

			let range2pos = [];	// ADD ALL RANGE 2
			for (let posIdx in _formationValidPos){
				range2pos = range2pos.concat(openAdjacentSiegeSpots(_formationValidPos[posIdx].pos, true, allowEdge));
			}

			for (let posIdx2 in range2pos){ // REMOVE OVERLAPPING
				let pos = range2pos[posIdx2];
				let compressedPos = posCompress(pos);
				if (!addedPos[compressedPos]) {
					_formationValidPos.push({ pos: pos, range : 2});
					global.formationValidPos[id].pos.push({ pos: compressedPos, range : 2});
					addedPos[compressedPos] = {};
					Game.rooms[this.roomName].visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'green'});
				}


				
			}

			let range3pos = [];	// ADD ALL RANGE 3
			for (let posIdx in _formationValidPos){
				if (_formationValidPos[posIdx].range !== 2) { continue; }
				range3pos = range3pos.concat(openAdjacentSiegeSpots(_formationValidPos[posIdx].pos, true, allowEdge));							
			}

			for (let posIdx3 in range3pos){ // REMOVE OVERLAPPING IN RANGE 1 + 2
				let pos = range3pos[posIdx3];
				let compressedPos = posCompress(pos);
				if (!addedPos[compressedPos]) {
					_formationValidPos.push({ pos: pos, range : 3});
					global.formationValidPos[id].pos.push({ pos: compressedPos, range : 3});					
					addedPos[compressedPos] = {};
					Game.rooms[this.roomName].visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'}); 
				}
			}
		}

		
		if (!global.formationValidPos[id]._formationValidPos || global.formationValidPos[id].retTs !== Game.time) {
			global.formationValidPos[id]._formationValidPos = [];			
			global.formationValidPos[id].retTs = Game.time;
			for (let idx in global.formationValidPos[id].pos) {
				let pos = posDecompress(global.formationValidPos[id].pos[idx].pos, this.roomName);
				
			//	Game.rooms[this.roomName].visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
			global.formationValidPos[id]._formationValidPos.push({ pos: pos, range : global.formationValidPos[id].pos[idx].range}); 
				if (idx > requiredPositions) { break; }
			}
		}
		return global.formationValidPos[id]._formationValidPos;
	};

	global.isNearExit = function(pos, range){
        return pos.x - range <= 0 || pos.x + range >= 49 || pos.y - range <= 0 || pos.y + range >= 49;
	};

	RoomPosition.prototype.isNearExit = function(range){
        return this.x - range <= 0 || this.x + range >= 49 || this.y - range <= 0 || this.y + range >= 49;
	};

	RoomPosition.prototype.rangeToExit = function(){

        return Math.min(this.x, 49-this.x, this.y, 49-this.y);
	};

	global.getXYPositionAtDirection = function(x, y, direction) {	
		let range = 1;

		if (direction === 1) {
            y -= range;
        }
        else if (direction === 2) {
            y -= range;
            x += range;
        }
        else if (direction === 3) {
            x += range;
        }
        else if (direction === 4) {
            x += range;
            y += range;
        }
        else if (direction === 5) {
            y += range;
        }
        else if (direction === 6) {
            y += range;
            x -= range;
        }
        else if (direction === 7) {
            x -= range;
        }
        else if (direction === 8) {
            x -= range;
            y -= range;
        }
        x = limit(x, 0, 49);
        y = limit(y, 0, 49);
        return {x: x, y: y};

	}

	global.getPositionAtDirection = function(pos, direction, range){
        if (!range) {
            range = 1;
        }
        let x = pos.x;
        let y = pos.y;
        let room = pos.roomName;

        if (direction === 1) {
            y -= range;
        }
        else if (direction === 2) {
            y -= range;
            x += range;
        }
        else if (direction === 3) {
            x += range;
        }
        else if (direction === 4) {
            x += range;
            y += range;
        }
        else if (direction === 5) {
            y += range;
        }
        else if (direction === 6) {
            y += range;
            x -= range;
        }
        else if (direction === 7) {
            x -= range;
        }
        else if (direction === 8) {
            x -= range;
            y -= range;
        }
        x = limit(x, 0, 49);
        y = limit(y, 0, 49);
        return {x: x, y: y, roomName: room};
	};
	
	RoomPosition.prototype.getPositionAtDirection = function(direction, range){
        if (!range) {
            range = 1;
        }
        let x = this.x;
        let y = this.y;
        let room = this.roomName;

        if (direction === 1) {
            y -= range;
        }
        else if (direction === 2) {
            y -= range;
            x += range;
        }
        else if (direction === 3) {
            x += range;
        }
        else if (direction === 4) {
            x += range;
            y += range;
        }
        else if (direction === 5) {
            y += range;
        }
        else if (direction === 6) {
            y += range;
            x -= range;
        }
        else if (direction === 7) {
            x -= range;
        }
        else if (direction === 8) {
            x -= range;
            y -= range;
        }
        x = limit(x, 0, 49);
        y = limit(y, 0, 49);
        return new RoomPosition(x, y, room);
	};


	global._toWpCache = {}
	RoomPosition.prototype.toWP = function(){
		let id = posId(this)
		if (global._toWpCache[id] === undefined) {
			let {x,y,roomName} = this;
			let [name,h,wx,v,wy] = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/);
			if(h == 'W') x = ~x;
			if(v == 'N') y = ~y;
			global._toWpCache[id] = {x: (49*wx)+x, y: (49*wy)+y };
		}
		
		return global._toWpCache[id]
	}

	RoomPosition.prototype.getRangeToWP = function(pos){
		let thisWP = this.toWP();
		let destWP = pos.toWP();
		return Math.max( Math.abs((destWP.x-thisWP.x)), Math.abs((destWP.y-thisWP.y)) );
	}
	
	
	global.getPositionAtDirectionWrapToNextRoom = function(origin, direction, range){
        if (!range) {
            range = 1;
        }
        let x = origin.x;
        let y = origin.y;
        let room = origin.roomName;

        if (direction === TOP) {
            y -= range;
        }
        else if (direction === TOP_RIGHT) {
            y -= range;
            x += range;
        }
        else if (direction === RIGHT) {
            x += range;
        }
        else if (direction === BOTTOM_RIGHT) {
            x += range;
            y += range;
        }
        else if (direction === BOTTOM) {
            y += range;
        }
        else if (direction === BOTTOM_LEFT) {
            y += range;
            x -= range;
        }
        else if (direction === LEFT) {
            x -= range;
        }
        else if (direction === TOP_LEFT) {
            x -= range;
            y -= range;
		}
		
		if (x < 0) {
			x = 49;
			let exits = Game.map.describeExits(room);
			if (exits[LEFT]) {
				room = exits[LEFT];
			}
		} else if ( x > 49) {
			x = 0;
			let exits = Game.map.describeExits(room);
			if (exits[RIGHT]) {
				room = exits[RIGHT];
			}			
		} else if (y < 0) {
			y = 49;
			let exits = Game.map.describeExits(room);
			if (exits[TOP]) {
				room = exits[TOP];
			}
		} else if (y > 49) {
			y = 0;
			let exits = Game.map.describeExits(room);
			if (exits[BOTTOM]) {
				room = exits[BOTTOM];				
			}
		}
        return {x: x, y: y, roomName: room};
	};

	RoomPosition.prototype.getPositionAtDirectionWrapToNextRoom = function(direction, range){
        if (!range) {
            range = 1;
        }
        let x = this.x;
        let y = this.y;
        let room = this.roomName;

        if (direction === TOP) {
            y -= range;
        }
        else if (direction === TOP_RIGHT) {
            y -= range;
            x += range;
        }
        else if (direction === RIGHT) {
            x += range;
        }
        else if (direction === BOTTOM_RIGHT) {
            x += range;
            y += range;
        }
        else if (direction === BOTTOM) {
            y += range;
        }
        else if (direction === BOTTOM_LEFT) {
            y += range;
            x -= range;
        }
        else if (direction === LEFT) {
            x -= range;
        }
        else if (direction === TOP_LEFT) {
            x -= range;
            y -= range;
		}
		
		if (x < 0) {
			x = 49;
			let exits = Game.map.describeExits(room);
			if (exits[LEFT]) {
				room = exits[LEFT];
			}
		} else if ( x > 49) {
			x = 0;
			let exits = Game.map.describeExits(room);
			if (exits[RIGHT]) {
				room = exits[RIGHT];
			}			
		} else if (y < 0) {
			y = 49;
			let exits = Game.map.describeExits(room);
			if (exits[TOP]) {
				room = exits[TOP];
			}
		} else if (y > 49) {
			y = 0;
			let exits = Game.map.describeExits(room);
			if (exits[BOTTOM]) {
				room = exits[BOTTOM];				
			}
		}
        return new RoomPosition(x, y, room);
	};
	
	RoomPosition.prototype.isThisPos = function(pos) {		
		if (this.x === pos.x && this.y === pos.y && this.roomName === pos.roomName) {
			return true;
		}		
		return false;
	};	

	global._isPassibleCache = {};
	global.isPassible = function(pos, ignoreCreeps, allowEdge=false) {

		if (!allowEdge && isNearExit(pos, 0)) return false;

		let id = posId(pos)+ignoreCreeps+allowEdge;
		if (!global._isPassibleCache[id] || Game.time > global._isPassibleCache[id].ts) {
			global._isPassibleCache[id] = {};

			if (ignoreCreeps) {
				global._isPassibleCache[id].ts = Game.time + 17;
			} else {
				global._isPassibleCache[id].ts = Game.time
			}

			// look for walls
			if (getRoomTerrainAt(pos) !== TERRAIN_MASK_WALL && !lookForBlockingConstructionSite(pos)){
				// look for creeps
				let room = Game.rooms[pos.roomName]
				if (!room) { 
					global._isPassibleCache[id].ts = Game.time;
					global._isPassibleCache[id].passible = pos;
					return true; 
				}


			//	let creeps = this.lookForAnyCreep();
				if (ignoreCreeps || !lookForAnyCreep(pos) ) {
					// look for impassible structions
				//  if (_.filter(this.lookFor(LOOK_STRUCTURES), (struct) => {
						if (_.filter(room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y), (struct) => {
							return struct.structureType !== STRUCTURE_ROAD &&
								struct.structureType !== STRUCTURE_CONTAINER &&
								(struct.structureType !== STRUCTURE_RAMPART || (struct.structureType === STRUCTURE_RAMPART && !struct.my));
						}).length === 0 ) {
						global._isPassibleCache[id].passible = true;
						return true;
					}
				}
			}
			global._isPassibleCache[id].passible = false;
			return false;
		}        
		return global._isPassibleCache[id].passible;		
	};

	RoomPosition.prototype.isPassible = function(ignoreCreeps, allowEdge=false) {

		if (!allowEdge && this.isNearExit(0)) return false;

		let id = posId(this)+ignoreCreeps+allowEdge;
		if (!global._isPassibleCache[id] || Game.time > global._isPassibleCache[id].ts) {
			global._isPassibleCache[id] = {};

			if (ignoreCreeps) {
				global._isPassibleCache[id].ts = Game.time + 17;
			} else {
				global._isPassibleCache[id].ts = Game.time
			}

			// look for walls
			if (getRoomTerrainAt(this) !== TERRAIN_MASK_WALL && !this.lookForBlockingConstructionSite()){
				// look for creeps
				let room = Game.rooms[this.roomName]
				if (!room) { 
					global._isPassibleCache[id].ts = Game.time;
					global._isPassibleCache[id].passible = true;
					return true; 
				}


			//	let creeps = this.lookForAnyCreep();
				if (ignoreCreeps || !this.lookForAnyCreep() ) {
					// look for impassible structions
				//  if (_.filter(this.lookFor(LOOK_STRUCTURES), (struct) => {
						if (_.filter(room.lookForAt(LOOK_STRUCTURES, this), (struct) => {
							return struct.structureType !== STRUCTURE_ROAD &&
								struct.structureType !== STRUCTURE_CONTAINER &&
								(struct.structureType !== STRUCTURE_RAMPART || (struct.structureType === STRUCTURE_RAMPART && !struct.my));
						}).length === 0 ) {
						global._isPassibleCache[id].passible = true;
						return true;
					}
				}
			}
			global._isPassibleCache[id].passible = false;
			return false;
		}        
		return global._isPassibleCache[id].passible;		
	};
	
	
	global.lookForBlockingConstructionSite = function(pos) {
        let room = Game.rooms[pos.roomName];
		if (!room) { return; }
        let csites = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y);

		for (let idx in csites) {
			if (csites[idx].my && OBSTACLE_OBJECT_TYPES.includes(csites[idx].structureType)) { 
				return csites[idx]
			}
		}		
	};

	RoomPosition.prototype.lookForBlockingConstructionSite = function() {
        let room = Game.rooms[this.roomName];
		if (!room) { return; }
        let csites = room.lookForAt(LOOK_CONSTRUCTION_SITES, this);

		for (let idx in csites) {
			if (csites[idx].my && OBSTACLE_OBJECT_TYPES.includes(csites[idx].structureType)) { 
				return csites[idx]
			}
		}		
	};

	global.lookForBlockingConstructionSiteAround = function(pos, dist=1) {
        let room = Game.rooms[pos.roomName];
		if (!room) { return; }
     //   let csites = room.lookForAt(LOOK_CONSTRUCTION_SITES, this);

		let top = limit(pos.y-dist, 0, 49);
		let left = limit(pos.x-dist, 0, 49);
		let bot = limit(pos.y+dist, 0, 49);
		let right = limit(pos.x+dist, 0, 49);	

		let csites = room.lookForAtArea(LOOK_CONSTRUCTION_SITES, top,left,bot,right, true);

		for (let idx in csites) {
			if (csites[idx].my && OBSTACLE_OBJECT_TYPES.includes(csites[idx].structureType)) { 
				return csites[idx]
			}
		}		
	};

	RoomPosition.prototype.lookForBlockingConstructionSiteAround = function(dist=1) {
        let room = Game.rooms[this.roomName];
		if (!room) { return; }
     //   let csites = room.lookForAt(LOOK_CONSTRUCTION_SITES, this);

		let top = limit(this.y-dist, 0, 49);
		let left = limit(this.x-dist, 0, 49);
		let bot = limit(this.y+dist, 0, 49);
		let right = limit(this.x+dist, 0, 49);	

		let csites = room.lookForAtArea(LOOK_CONSTRUCTION_SITES, top,left,bot,right, true);

		for (let idx in csites) {
			if (csites[idx].my && OBSTACLE_OBJECT_TYPES.includes(csites[idx].structureType)) { 
				return csites[idx]
			}
		}		
	};

	RoomPosition.prototype.lookForConstructionSite = function(structureType) {
		let room = Game.rooms[this.roomName];
		if (!room) { return; }
        let structures = room.lookForAt(LOOK_CONSTRUCTION_SITES, this);
        return _.find(structures, {structureType: structureType});
	};

	Room.prototype.lookForStructureAtXY = function(structureType, x, y) {
		let structures = this.lookForAt(LOOK_STRUCTURES, x, y);
        return _.find(structures, {structureType: structureType});
	}

	Room.prototype.lookForStructureAt = function(structureType, pos) {		
		let structures = this.lookForAt(LOOK_STRUCTURES, pos);
        return _.find(structures, {structureType: structureType});
	}

	global.lookForStructureAt = function(structureType, pos) {
		let room = Game.rooms[pos.roomName];
		if (!room) { return }
        let structures = room.lookForAt(LOOK_STRUCTURES, pos.x, pos.y);
        return _.find(structures, {structureType: structureType});
	};

	RoomPosition.prototype.lookForStructure = function(structureType) {
		let room = Game.rooms[this.roomName];
		if (!room) { return }
        let structures = room.lookForAt(LOOK_STRUCTURES, this);
        return _.find(structures, {structureType: structureType});
	};

	global.lookForCreep = function(pos) {
		let room = Game.rooms[pos.roomName];
		let creeps = room.lookForAt(LOOK_CREEPS, pos.x, pos.y);
		if (creeps.length === 0) {
			creeps = room.lookForAt(LOOK_POWER_CREEPS, pos.x, pos.y);
		}
        return _.find(creeps, {my: true});
	}

	RoomPosition.prototype.lookForCreep = function() {
		let room = Game.rooms[this.roomName];
		let creeps = room.lookForAt(LOOK_CREEPS, this);
		if (creeps.length === 0) {
			creeps = room.lookForAt(LOOK_POWER_CREEPS, this);
		}
        return _.find(creeps, {my: true});
	};

	RoomPosition.prototype.lookForHostileCreep = function() {
		let room = Game.rooms[this.roomName];
		let creeps = room.lookForAt(LOOK_CREEPS, this);	
		if (creeps.length === 0) {
			creeps = room.lookForAt(LOOK_POWER_CREEPS, this);
		}
        return _.find(creeps, {my: undefined});
	};

	global.lookForAnyCreep = function(pos) {
		let room = Game.rooms[pos.roomName];
		let creeps = room.lookForAt(LOOK_CREEPS, pos.x, pos.y);		
		if (creeps.length === 0) {
			creeps = room.lookForAt(LOOK_POWER_CREEPS, pos.x, pos.y);
		}
        return _.find(creeps, {});
	};
	
	RoomPosition.prototype.lookForAnyCreep = function() {
		let room = Game.rooms[this.roomName];
		let creeps = room.lookForAt(LOOK_CREEPS, this);		
		if (creeps.length === 0) {
			creeps = room.lookForAt(LOOK_POWER_CREEPS, this);
		}
        return _.find(creeps, {});
	};

	global.lookForAnyCreepAround = function(pos, dist = 1) {
		let room = Game.rooms[pos.roomName];
		let returnValue = [];
		if (!room) return returnValue;

		let top = limit(pos.y-dist, 0, 49);
		let left = limit(pos.x-dist, 0, 49);
		let bot = limit(pos.y+dist, 0, 49);
		let right = limit(pos.x+dist, 0, 49);	

		let creeps = room.lookForAtArea(LOOK_CREEPS, top,left,bot,right, true);
		let powerCreeps = room.lookForAtArea(LOOK_POWER_CREEPS, top,left,bot,right, true);
		creeps = creeps.concat(powerCreeps);
		let i = creeps.length;
		while (i--) {			
			returnValue.push(creeps[i].creep || creeps[i].powerCreep);		
		}
        return returnValue
	};

	RoomPosition.prototype.lookForAnyCreepAround = function(dist = 1) {
		let room = Game.rooms[this.roomName];
		let returnValue = [];
		if (!room) return returnValue;

		let top = limit(this.y-dist, 0, 49);
		let left = limit(this.x-dist, 0, 49);
		let bot = limit(this.y+dist, 0, 49);
		let right = limit(this.x+dist, 0, 49);	

		let creeps = room.lookForAtArea(LOOK_CREEPS, top,left,bot,right, true);
		let powerCreeps = room.lookForAtArea(LOOK_POWER_CREEPS, top,left,bot,right, true);
		creeps = creeps.concat(powerCreeps);
		let i = creeps.length;
		while (i--) {			
			returnValue.push(creeps[i].creep || creeps[i].powerCreep);		
		}
        return returnValue
	};

	global.lookForAnyStructuresAround = function(pos, dist = 1) {
		let room = Game.rooms[pos.roomName];
		let returnValue = [];
		if (!room) return returnValue;
		
		let top = limit(pos.y-dist, 0, 49);
		let left = limit(pos.x-dist, 0, 49);
		let bot = limit(pos.y+dist, 0, 49);
		let right = limit(pos.x+dist, 0, 49);		
		let structures = room.lookForAtArea(LOOK_STRUCTURES, top,left,bot,right, true);
		let i = structures.length;
			
		while (i--) {
			returnValue.push(structures[i].structure);		
		}
		return returnValue;
	}

	RoomPosition.prototype.lookForAnyStructuresAround = function(dist = 1) {
		let room = Game.rooms[this.roomName];
		let returnValue = [];
		if (!room) return returnValue;
		
		let top = limit(this.y-dist, 0, 49);
		let left = limit(this.x-dist, 0, 49);
		let bot = limit(this.y+dist, 0, 49);
		let right = limit(this.x+dist, 0, 49);		
		let structures = room.lookForAtArea(LOOK_STRUCTURES, top,left,bot,right, true);
		let i = structures.length;
			
		while (i--) {			
			returnValue.push(structures[i].structure);		
		}
		return returnValue;
	}
	
	RoomPosition.prototype.lookForStructuresAround = function(structureType, dist) {
		let room = Game.rooms[this.roomName];
		let returnValue = [];
		if (!room) return returnValue;		
		
		let top = limit(this.y-dist, 0, 49);
		let left = limit(this.x-dist, 0, 49);
		let bot = limit(this.y+dist, 0, 49);
		let right = limit(this.x+dist, 0, 49);		
		let structures = room.lookForAtArea(LOOK_STRUCTURES, top,left,bot,right, true);
		let i = structures.length;
			
		while (i--) {
			if (structures[i].structure.structureType === structureType				
				) {
				returnValue.push(structures[i].structure);
			}
		}
		return returnValue;
	};
			
	RoomPosition.prototype.lookForEnemyStructuresAround = function(dist, allowSk = false) {
	
		let room = Game.rooms[this.roomName];
		let returnValue = [];
		if (!room) return returnValue;
		if (Memory.rooms[this.roomName] && (
			(Memory.rooms[this.roomName][R.MY_MINING_OUTPOST] && !Memory.rooms[this.roomName].isPlayer && !Memory.rooms[this.roomName].invaderCore) || 
			Memory.rooms[this.roomName].myRoom || 
			ALLIES[Memory.rooms[this.roomName].enemyRemote])
			) { return returnValue; }
		if (room.controller) {
			let controller = room.controller;			
			if (controller.owner && ALLIES[controller.owner.username]) { return returnValue; }	
			if (controller.reservation && ALLIES[controller.reservation.username]) { return returnValue; }	
		}
		
		let top = limit(this.y-dist, 0, 49);
		let left = limit(this.x-dist, 0, 49);
		let bot = limit(this.y+dist, 0, 49);
		let right = limit(this.x+dist, 0, 49);		
		let structures = room.lookForAtArea(LOOK_STRUCTURES, top,left,bot,right, true);
		let i = structures.length;	
		let hasInvaderCore = Memory.rooms[this.roomName] && Memory.rooms[this.roomName].invaderCore;
		while (i--) {
			if (hasInvaderCore && !structures[i].structure.owner) { continue; }
			if (structures[i].structure.owner && ALLIES[structures[i].structure.owner.username]) { continue; }
			if (structures[i].structure.structureType === STRUCTURE_CONTROLLER) { continue;}
			if (structures[i].structure.structureType === STRUCTURE_POWER_BANK) { continue;}	
			if (structures[i].structure.structureType === STRUCTURE_KEEPER_LAIR) { continue;}					
		//	if (!allowSk && structures[i].structure.structureType === STRUCTURE_KEEPER_LAIR) { continue; }

			returnValue.push(structures[i].structure);
			
		}
		return returnValue;
	};


	Room.prototype.posCompress = function(pos) {
		return 	pos.x +":"+ pos.y;
	};
	
	Room.prototype.posDecompress = function(pos) {
		let comp = pos.split(":"); 
		return new RoomPosition(comp[0], comp[1], this.name);
	};
	
	/*
	function pad(n, width, z) {
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
	}*/
	
	Room.prototype.trackEnergyHarvestedAndInvaders = function() {

		if (this._cache.trackSleep && Game.time < this._cache.trackSleep) { return; }
		
		if (this._memory[R.ENERGY_HARVESTED] === undefined) { this._memory[R.ENERGY_HARVESTED] = 0; }

		let numberOfSources = 0;
		let sleepTicksNext = 3;
		let ticksToSleep = 3;
		if (this._memory.sources) {
			for(let id in this._memory.sources) {
				let source = Game.getObjectById(id);
				numberOfSources++;

				let ticksToRegen = source.ticksToRegeneration || 300
				sleepTicksNext = Math.max(sleepTicksNext, ticksToRegen - 3);

				if (ticksToRegen <= ticksToSleep) {
					this._memory[R.ENERGY_HARVESTED] += source.energyCapacity - source.energy;
				}
			}
		}
		
		this._cache.trackSleep = Game.time + sleepTicksNext;
		
		
		if (this._memory[R.INVADER_LAST_SEEN] === undefined) { this._memory[R.INVADER_LAST_SEEN] = 0; }
				
		if (sectorHasDeadInvaderCore(this.name) > 150 ) {
			delete this._memory[R.INVADER_PROBABLE];
		} else if (numberOfSources === 3 && this._memory[R.ENERGY_HARVESTED] > 65000) {
			this._memory[R.INVADER_PROBABLE] = 1;
		} else if (numberOfSources === 2 && Game.time - this._memory[R.INVADER_LAST_SEEN] < 20000 && this._memory[R.ENERGY_HARVESTED] > 75000) {
            this._memory[R.INVADER_PROBABLE] = 1;
        } else if (numberOfSources === 1 && Game.time - this._memory[R.INVADER_LAST_SEEN] < 20000 && this._memory[R.ENERGY_HARVESTED] > 90000) {
            this._memory[R.INVADER_PROBABLE] = 1;
        } else {
            delete this._memory[R.INVADER_PROBABLE];
		}
		
		if (this._memory.hostiles && this._memory.hostiles.invaders > 0 && Game.time - this._memory[R.INVADER_LAST_SEEN] > CREEP_LIFE_TIME) {
            // reset trackers
            this._memory[R.ENERGY_HARVESTED] = 0;
            this._memory[R.INVADER_LAST_SEEN] = Game.time;
			
			// Store average creep
			if (Memory.rooms[this.name].hostiles.power) {
				if (Memory.invaderPower === undefined) { Memory.invaderPower = {}; }
				if (Memory.invaderPower[numberOfSources] === undefined) { Memory.invaderPower[numberOfSources] = {}; }
				let cur = Memory.rooms[this.name].hostiles.power;
				
				if (Memory.invaderPower[numberOfSources].strength === undefined) { Memory.invaderPower[numberOfSources].strength = cur.strength; }
				if (Memory.invaderPower[numberOfSources].attackDamage === undefined) { Memory.invaderPower[numberOfSources].attackDamage = cur.attackDamage; }
				if (Memory.invaderPower[numberOfSources].rangedAttackDamage === undefined) { Memory.invaderPower[numberOfSources].rangedAttackDamage = cur.rangedAttackDamage; }
				if (Memory.invaderPower[numberOfSources].healPower === undefined) { Memory.invaderPower[numberOfSources].healPower = cur.healPower; }
				if (Memory.invaderPower[numberOfSources].tough === undefined) { Memory.invaderPower[numberOfSources].tough = cur.tough; }
				if (Memory.invaderPower[numberOfSources].samples === undefined) { Memory.invaderPower[numberOfSources].samples = 0; }
				
				let sample = Memory.invaderPower[numberOfSources].samples; 
				
				Memory.invaderPower[numberOfSources].strength = cumulativeAverage(Memory.rooms[this.name].hostiles.power.strength, cur.strength, sample);
				Memory.invaderPower[numberOfSources].attackDamage = cumulativeAverage(Memory.rooms[this.name].hostiles.power.attackDamage, cur.attackDamage, sample);
				Memory.invaderPower[numberOfSources].rangedAttackDamage = cumulativeAverage(Memory.rooms[this.name].hostiles.power.rangedAttackDamage, cur.rangedAttackDamage, sample);
				Memory.invaderPower[numberOfSources].healPower = cumulativeAverage(Memory.rooms[this.name].hostiles.power.healPower, cur.healPower, sample);
				Memory.invaderPower[numberOfSources].tough = cumulativeAverage(Memory.rooms[this.name].hostiles.power.tough, cur.tough, sample);

				Memory.invaderPower[numberOfSources].samples += 1;
			}
		}
	};	

	StructurePowerBank.prototype.getNumberOfAttackPos = function() {		
		return openAdjacentSpots(this.pos, true).length;
	};

	Deposit.prototype.getNumberOfMiningPos = function() {		
		return openAdjacentSpots(this.pos, true).length;
	};

	Mineral.prototype.getNumberOfMiningPos = function() {

		let spots = openAdjacentSpots(this.pos, true);
		

		return openAdjacentSpots(this.pos, true).length;
	};

	global.sourceCache = {};
	Object.defineProperty(Source.prototype, '_cache', {
        get: function() {            
            return global.sourceCache[this.id] = global.sourceCache[this.id] || {};
        },
        set: function(value) {            
            global.sourceCache[this.id] = value;
        },
		enumerable: false,
		configurable: true
    });


	Source.prototype.getSourceExtensions = function(refresh=false) {
		if (!this._cache.sourceExtensions || refresh) {
			this._cache.sourceExtensions = [];
			let harvesterPos = this.getHarvesterPos(this.room.name);
			let extensions = harvesterPos.findInRange(FIND_MY_STRUCTURES, 1, {
				filter: (structure) => {
					return (structure.structureType == STRUCTURE_EXTENSION);
				}
			});

			for (let idx in extensions) {
				this._cache.sourceExtensions.push(extensions[idx].id)
			}
		}
		return this._cache.sourceExtensions;
	}


	Source.prototype.getNumberOfHarvestPos = function() {
		if (global.havestPos === undefined) {global.havestPos = {}; }
		if (global.havestPos[this.id] === undefined) {
			global.havestPos[this.id] = {};
			let temp = openAdjacentSpots(this.pos, true);
			global.havestPos[this.id].freeSpaces = temp.length;
		}	
		return global.havestPos[this.id].freeSpaces;
	};

	Source.prototype.getHarvesterContainer = function(spawner) {	

		let container = Game.getObjectById(getHarvesterContainer[this.id]);
		if (container) { return container;}

		let conatinerPos = this.getHarvesterPos(spawner);
		container = conatinerPos.lookForStructure(STRUCTURE_CONTAINER);
		if (container) { 
			getHarvesterContainer[this.id] = container.id;
			return container;
		}
		return;
	}

	RoomPosition.prototype.getHarvesterPos = function(origin, spawnPos = undefined, roomPlanner= false) {
		let roomName = this.roomName;
		if (Memory.rooms[roomName] && Memory.rooms[roomName].sources) {
			let posComp = posCompress(this);
			for (let sourceId in Memory.rooms[roomName].sources) {
				if (Memory.rooms[roomName].sources[sourceId].pos === posComp) {

					let harvestPos = getHarvesterPos(sourceId, this, origin, spawnPos, roomPlanner)
					// get the harvest pos
					if (harvestPos) { return harvestPos}
					break;
				}
			}
		}

	}

	Source.prototype.getHarvesterPos = function(origin, spawnPos = undefined, roomPlanner= false) {
		
	//	if (Memory.rooms[this.room.name] === undefined) {}
	//	let identifier = this.id+origin	
		return getHarvesterPos(this.id, this.pos, origin, spawnPos, roomPlanner)

	
	};

	function getHarvesterPos(sourceId, roomPos, origin, spawnPos = undefined, roomPlanner = false) {

		let roomName = roomPos.roomName;

		if (Memory.rooms[roomName] &&
			Memory.rooms[roomName].sources &&
			Memory.rooms[roomName].sources[sourceId] &&
			(!Memory.rooms[roomName].sources[sourceId].EPos || !Memory.rooms[roomName].sources[sourceId].EPos[origin])
		) {
			
		//	let sources = this.room.find(FIND_SOURCES);
			let sources = getFakeSources(roomName)		

			// Make sure to start with the source with fewest free spaces, especially ones with 1 free space
			let sortable = [];
			let length = sources.length;

			for (let x=0; x<length; x++) {
				let adjacentSpot = openAdjacentSpots(sources[x].pos, true);
				sortable.push([sources[x].id, adjacentSpot.length, sources[x].pos]);
			}
			
			sortable.sort(function(a, b) {
				return a[1] - b[1];});
				
			let cm = new PathFinder.CostMatrix();

			let controller = getFakeController(roomName)
			
			if (ENABLE_SOURCE_EXTENSIONS && (roomPlanner || (controller && controller.my))) {

				for (let i=0; i<sortable.length; i++) {

					for (let p = 1; p <= 8; p++) {

						let position = getPositionAtDirection(sortable[i][2], p)
						let currentCost = cm.get(position.x, position.y)
						if (currentCost >= 255) { continue;}
						let terrain = getRoomTerrainAt(position)
						let terrainCost = 1;
						if (terrain === TERRAIN_MASK_WALL) {
							 continue;
						} else if (terrain === TERRAIN_MASK_SWAMP) {
							terrainCost = 5;
						}
						
						let openCost = 0;
						if (ENABLE_SOURCE_EXTENSIONS) {
							let _openAdjacentSpots = openAdjacentSpots(position, true).length;
							openCost = (8 - _openAdjacentSpots) * 10;
						}
						cm.set(position.x, position.y, openCost+terrainCost)
					}
				}
			}


			
			for (let i=0; i<sortable.length; i++) {
				
				let id = sortable[i][0];
				let sourcePos = sortable[i][2];
				let dest;
				if (spawnPos === undefined) {
					if (Memory.rooms[roomName].sources[id].link && Game.rooms[roomName] ) {
						let link = Game.getObjectById(Memory.rooms[roomName].sources[id].link).pos
						if (link.getRangeTo(sourcePos) > 1) {
							dest = link.pos
						}
					}
					
					if (!dest) {
						let spawn
						if (Game.rooms[origin]) {
							spawn = Game.rooms[origin].findByType(STRUCTURE_SPAWN)[0];
						}
						if (spawn) {
							dest = spawn.pos;
						} else if (controller) {
							dest = controller.pos;
						}
					}
					
				} else {
					dest = spawnPos;
				}

				if (!dest) { 
					log(origin+ " failed to find harvester pos! " +  id)
					return;
				}

			//	let {path,incomplete} = PathFinder.search(source.pos, dest, {roomCallback: () => cm, maxRooms: 1});

				let maxRooms;
				if (sourcePos.roomName === dest.roomName) { maxRooms = 1;}

				let {path,incomplete} = findTravelPath(sourcePos, dest,
					{range: 1, ignoreRoads: true, ignoreCreeps: true, ignoreContainer: true, costMatrix: cm, maxRooms: maxRooms});
				

				log("searching source " + id + " path incomplete " + incomplete + " pos " + path.length)

				let pos = path[0];
				
				cm.set(pos.x,pos.y,255);  // obstruct path for next loop
								
				if (Memory.rooms[roomName].sources[id].EPos === undefined) { Memory.rooms[roomName].sources[id].EPos = {}; }				
				Memory.rooms[roomName].sources[id].EPos[origin] = posCompress(pos);
						
			//	this.room.visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
			}
		}
		
		return posDecompress(Memory.rooms[roomName].sources[sourceId].EPos[origin], roomName);

	}


	

	Room.prototype.getMinerals = function() {
		let minerals = this.find(FIND_MINERALS);

		if (SEASONAL_THORIUM) {
			for (let idx in minerals) {
				if (minerals[idx].mineralType === RESOURCE_THORIUM) { 
					minerals.splice(idx, 1);
					break;
				}
			}
		}
		return minerals;
	}

	Room.prototype.getThorium = function() {
		let minerals = this.find(FIND_MINERALS);

		if (SEASONAL_THORIUM) {
			for (let idx in minerals) {
				if (minerals[idx].mineralType === RESOURCE_THORIUM) { 
					return minerals[idx]
				}
			}
		}
		return;
	}





	Room.prototype.mineralOnCd = function() {
		let minerals = this.getMinerals()
		if (minerals.length) {
			return minerals[0].ticksToRegeneration
		}
		return Infinity;
	}
 	

	Room.prototype.resetAndGetRefillJobs = function(options = {}) {
		delete this._cache.RefillJob;
		return this.getRefillJobs(options);
	};
	
	Room.prototype.getRefillJobs = function(options = {}) {
		if (this._cache.RefillJob === undefined) {this._cache.RefillJob = []; }
		if (this._cache.RefillJobPrev === undefined) { this._cache.RefillJobPrev = this.energyAvailable; }		

		if (((this._cache.RefillJob.length === 0 && (this.energyAvailable < this.energyCapacityAvailable) || 
			this.energyAvailable < this._cache.RefillJobPrev)) || 
			this._cache.RefillJobTs <= Game.time
		) {
			this._cache.RefillJobTs = Game.time + 25;
		//	console.log(this.name + " getRefillJobs	length " + this._cache.RefillJob.length + " prev energy " + this._cache.RefillJobPrev+ " current " + this.energyAvailable + "/"+this.energyCapacityAvailable)
			this._cache.RefillJob = [];
			
			let targets = [];	
		//		targets = this.findByType(STRUCTURE_EXTENSION);
		//	} else {
			targets = this.findByType([STRUCTURE_SPAWN, STRUCTURE_EXTENSION]);

		//	}			

			let craneExtensions = {}
			if (ENABLE_SOURCE_EXTENSIONS) {
				let sources = this.find(FIND_SOURCES); 	
				for (let i = 0; i < sources.length; i++) {
					if (!sources[i].pos._cache.craneTs || Game.time > sources[i].pos._cache.craneTs) { continue; } // no active crane here
					let sourceExt = sources[i].getSourceExtensions(true)
					for (let idx in sourceExt) {
						craneExtensions[sourceExt[idx]] = {};
					}
				}

				let spawnExt = this.getSpawnExtensions(false, false);
				for (let idx in spawnExt) {
					let ext = spawnExt[idx]
					if (!ext.pos._cache.craneTs || Game.time > ext.pos._cache.craneTs) { continue; } // no active crane here
					craneExtensions[ext.id] = {};
				}

				let storeCraneExt = this.getStoreCraneExtensions()
				for (let idx in storeCraneExt) {
					let ext = storeCraneExt[idx];
					if (!ext.pos._cache.craneTs || Game.time > ext.pos._cache.craneTs) { continue; } // no active crane here
					craneExtensions[ext.id] = {};
				}
			}


			let length = targets.length;
			for (let idx = 0; idx < length; idx++ ) {
				
				if (targets[idx].energy < targets[idx].energyCapacity) {

					if (craneExtensions[targets[idx].id]) { continue; }
					if (targets[idx].isSpawn && targets[idx].pos._cache.craneTs && Game.time < targets[idx].pos._cache.craneTs) { continue; }					
					this._cache.RefillJob.push(targets[idx].id);
				}
			}
		}
	
		this._cache.RefillJobPrev = this.energyAvailable;
		let arr = [];				
		let object;
		let length = this._cache.RefillJob.length;
		for (let idx = 0; idx < length; idx++ ) {
			object = Game.getObjectById(this._cache.RefillJob[idx]);
			arr.push(object);
		}
		return arr;
	};
	
	Room.prototype.pullRefillJob = function(id) {
		this._cache.RefillJob.splice(_.indexOf(this._cache.RefillJob, id) , 1);
	};
	
	Room.prototype.getFillOrderJobs = function(fromPos) {
		let jobs = [];
		if (this._memory.fillOrder == undefined) {
			return jobs;
		}

		let missingEnergy = this.energyCapacityAvailable - this.energyAvailable
		

		let targets = this.findByType(STRUCTURE_SPAWN)
		for (let idx in targets) {
			let spawn = targets[idx];
			if (spawn.pos._cache.craneTs && Game.time < spawn.pos._cache.craneTs) { continue; }
			
			if (spawn.energy < spawn.energyCapacity) {
				missingEnergy -= (spawn.energyCapacity - spawn.energy);
				if (!spawn.deliver) {
					jobs.push(spawn);
				}
			}
		}

		if (jobs.length > 0 || missingEnergy <= 0) {
			return jobs;
		}

		let bestJobs = [];
		let bestDistance = Infinity;
		for (let idx in this._memory.fillOrder) {	
			let jobList = this._memory.fillOrder[idx];
			let currentDistance = Infinity;
			
			jobs = [];
			for (let extIdx in jobList) {
				
				let ext = Game.getObjectById(jobList[extIdx]);				
				if (!ext) { continue; }
				
				if (ext.energy < ext.energyCapacity && !ext.deliver) {
					jobs.push(ext);
					let range = fromPos.getRangeTo(ext);
					currentDistance = Math.min(currentDistance, range);					
				}
			}

			if (currentDistance < bestDistance) {
				bestJobs = [];
				bestJobs = _.clone(jobs);
				bestDistance = currentDistance;
				if (bestDistance <= 1) {
					return bestJobs;
				}
			}
		}

		if (bestJobs.length === 0 && this.energyAvailable < this.energyCapacityAvailable) {
			let spawnExt = this.getSpawnExtensions(false, true);
			for (let idx in spawnExt) {
				let ext = spawnExt[idx]
				if (ext.energy < ext.energyCapacity && !ext.deliver) {
					bestJobs.push(ext);
				}
				if (bestJobs.length >= 5) { break; }
			}

			if (bestJobs.length === 0 ) {
				let storeCraneExt = this.getStoreCraneExtensions();
				for (let idx in storeCraneExt) {
					let ext = storeCraneExt[idx]
					if (ext.pos._cache.craneTs && Game.time < ext.pos._cache.craneTs) { continue; }
					if (ext.energy < ext.energyCapacity && !ext.deliver) {
						bestJobs.push(ext);						
					}
				}
			}

			if (bestJobs.length === 0 ) {
				let sources = this.find(FIND_SOURCES); 	
				for (let i = 0; i < sources.length; i++) {
					if (sources[i].pos._cache.craneTs && Game.time < sources[i].pos._cache.craneTs) { continue; }
					let sourceExt = sources[i].getSourceExtensions();
					for (let idx in sourceExt) {
						
						let ext = Game.getObjectById(sourceExt[idx])
						if (ext.energy < ext.energyCapacity && !ext.deliver &&
						(!this._memory.hostiles || !isOutsideWalls(ext.pos)) 
						) {
							bestJobs.push(ext);
						}						
					}
					if (bestJobs.length > 0) { break; }
				}
			}

			
			

		}

		return bestJobs;
	}
	
	Room.prototype.getEnemySquads = function(){
		 // find squads
		let attackers = _.sortBy(getEnemyCreeps(this.name), (c) => { this.controller.pos.getRangeTo(c); });
		let enemySquads = [];
		this.wallRamparts = _.filter(this.findByType(STRUCTURE_RAMPART), (r) => {
                return _.filter(r.pos.lookFor(LOOK_STRUCTURES), (s) => {
                        return s.structureType !== STRUCTURE_ROAD;
                    }).length === 1;
			});
		while (attackers.length > 0) {
			let squad = attackers[0].pos.findInRange(attackers, 2);
			let nearbyRamparts = attackers[0].pos.findInRange(this.wallRamparts, 10);
			if (enemySquads.length === 0 || nearbyRamparts.length > 0) {
				enemySquads.push(squad);
			}
			attackers = _.difference(attackers, squad);
		}
		return enemySquads;
	};

	Room.prototype.getInputLabs = function(ignoreBooster=true) {

		let inputLabs = []
		let labs = this.findByType(STRUCTURE_LAB)
		for (let idx in labs) {
			let lab = labs[idx]
			if (lab.memory[S.INPUT_LAB] === undefined) { continue; }

			if (lab.memory[S.BOOSTER_LAB] && Game.time > lab.memory.boostTs) {
				delete lab.memory.boostTs;
				delete lab.memory[S.BOOSTER_LAB];
				delete lab.memory.combat;
				delete lab.memory[S.BATCH_LAB];
			}

			if (ignoreBooster && lab.memory[S.BOOSTER_LAB] !== undefined) { continue; }
			inputLabs.push(lab)

			drawCircle(this.name, lab.pos.x, lab.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'});
		}
		return inputLabs
	}

	Room.prototype.getOutputLabs = function(ignoreBooster=true) {

		let outputLabs = []
		let labs = this.findByType(STRUCTURE_LAB)
		for (let idx in labs) {
			let lab = labs[idx]
			if (lab.memory[S.INPUT_LAB] !== undefined) { continue; }

			if (lab.memory[S.BOOSTER_LAB] && Game.time > lab.memory.boostTs) {
				delete lab.memory.boostTs;
				delete lab.memory[S.BOOSTER_LAB];
				delete lab.memory.combat;
				delete lab.memory[S.BATCH_LAB];
			}

			if (ignoreBooster && lab.memory[S.BOOSTER_LAB] !== undefined) { continue; }
			outputLabs.push(lab)
			drawCircle(this.name, lab.pos.x, lab.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'});
		}
		return outputLabs
	}

	Room.prototype.hasFactory = function() {
		if (this._cache.hasFactory === undefined || Game.time > this._cache.hasFactoryTs) {	
			let factory = this.findByType(STRUCTURE_FACTORY)
			if (factory.length >= 1) {
				this._cache.hasFactory = factory[0].id
			}
			if (this._cache.hasFactory) {
				this._cache.hasFactoryTs = Game.time + 333;
			} else {
				this._cache.hasFactoryTs = Game.time + 23;
			}
		}
		return this._cache.hasFactory
	}

	Room.prototype.hasLabs = function() {
		if (this._cache.hasLabs === undefined || Game.time > this._cache.hasLabsTs) {			
			this._cache.hasLabs = this.findByType(STRUCTURE_LAB).length
			if (this._cache.hasLabs >= 10) {
				this._cache.hasLabsTs = Game.time + 333;
			} else {
				this._cache.hasLabsTs = Game.time + 23;
			}
		}
		return this._cache.hasLabs
	}

	Room.prototype.hasStoreLink = function() {
		if (this._cache.hasStoreLink === undefined || Game.time > this._cache.hasStoreLinkTs) {		
			let storeLink = _.filter(this.findByType(STRUCTURE_LINK), 
				function(c) {return (c.isStorage() )
				});
					
			this._cache.hasStoreLink = storeLink.length 
			if (this._cache.hasStoreLink >= 1) {
				this._cache.hasStoreLinkTs = Game.time + 333;
			} else {
				this._cache.hasStoreLinkTs = Game.time + 23;
			}
		}
		return this._cache.hasStoreLink
	}

	Room.prototype.hasPowerSpawn = function() {
		if (this._cache.hasPowerSpawn === undefined || Game.time > this._cache.hasPowerSpawnTs) {			
			this._cache.hasPowerSpawn = this.findByType(STRUCTURE_LAB).length				
			if (this._cache.hasPowerSpawn >= 1) {
				this._cache.hasPowerSpawnTs = Game.time + 333;
			} else {
				this._cache.hasPowerSpawnTs = Game.time + 23;
			}
		}
		return this._cache.hasPowerSpawn
	}

	Room.prototype.boostsAvailable = function(boosts = []){
		if (this._memory.hasLabs < 	boosts.length ) { return 0; }
		let length = boosts.length;
		for (let idx=0; idx< length; idx++) {
			if (this.storeWithLabs(boosts[idx]) < 2000) {
				return 0;
			}
		}
		return 1;
	};
			
	Room.prototype.setInnerWallMatrixPos = function(matrix, pos, value){
		if (!pos.isPassible() ) { return matrix; }		
		
		if (getRoomTerrainAt(pos) === TERRAIN_MASK_SWAMP && pos.lookForStructure(STRUCTURE_ROAD) === undefined) {
			// SWAMP, NO ROAD
			matrix.set(pos.x, pos.y, value * 5);
		} else {
			matrix.set(pos.x, pos.y, value);
		}
		return matrix;
	};

	global.posWithinAttackRangeOfOutside = function(pos){
		let id = posId(pos);
		if (posInRangeOfOutside[id] === undefined) {

			if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {				
				console.log(" posWithinAttackRangeOfOutside no access to id " +SEGMENT_ALL_ROOM_OOB);
				return true;
			}


			let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);

			let inRange;
			for (let y = -3; y <= 3; ++y) {
				for (let x = -3; x <= 3; ++x) {
					if (x !== 3 && x !== -3 || y !== 3 && y !== -3 ) { continue; }

					let xPos = limit(x + pos.x, 0, 49)
					let yPos = limit(y + pos.y, 0, 49)
					if (isOutsideWallsXY(xPos, yPos, pos.roomName, segmentOOB) ) {
						inRange = true;
						break;
					}
				}
				if (inRange) { break; }
			}
			posInRangeOfOutside[id] = {}
			posInRangeOfOutside[id].b = inRange;
		}
		return posInRangeOfOutside[id].b;
	}

	global.bordersToOutsidePixel = function(pos, segment){	
		let pixel = getPositionAtDirection(pos, TOP);
		if (isOutsideWalls(pixel, segment)) { return true; }
		pixel = getPositionAtDirection(pos, RIGHT);
		if (isOutsideWalls(pixel, segment)) { return true; }
		pixel = getPositionAtDirection(pos, BOTTOM);
		if (isOutsideWalls(pixel, segment)) { return true; }
		pixel = getPositionAtDirection(pos, LEFT);
		if (isOutsideWalls(pixel, segment)) { return true; }
		return false;
	}
	
	
	Room.prototype.wallsLimitV2 = function(matrix, options = {} ){		
		if (global._wallsLimit === undefined) { global._wallsLimit = {}; }
		
			global._wallsLimit[this.name] = {};
			global._wallsLimit[this.name].ts = Game.time;

			let ramparts = this.findByType([STRUCTURE_RAMPART]);


			if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
				console.log(" wallsLimitV2 no access to id " +SEGMENT_ALL_ROOM_OOB);
				return matrix;
			}
			let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);

			let nearWallValue = 50;	
			if (options.civilian) { nearWallValue = 255; }	

			let _registeredPos = {};			

			for (let rampart of ramparts) {				
				if (!rampart.pos.isPassible(true)) { continue; }

				if (!bordersToOutsidePixel(rampart.pos, segmentOOB))	{ continue; }	
					
				let startX = rampart.pos.x - 2;
				let startY = rampart.pos.y - 2;
				for (let y = startY; y <= rampart.pos.y + 2; ++y) {
   					for (let x = startX; x <= rampart.pos.x+2; ++x) { 
						if (x<1 || x>48 || y<1 || y>48)	{ continue; }

						let id = x + (y*50)
						if (_registeredPos[id] !== undefined) { continue; }
						_registeredPos[id] = {};
						   
   						let pos = new RoomPosition(x, y, this.name);
   						if (!pos.isPassible(true) ) { continue; }
						if (isOutsideWalls(pos, segmentOOB)) {
							matrix.update(x, y, 255);
						//	this.visual.circle(x, y , {fill: 'transparent', radius: 0.50, stroke: 'orange'});
						} else {

							let terrainCost = 0;
							if (getRoomTerrainAt(rampart.pos) === TERRAIN_MASK_SWAMP){
								terrainCost = 3;
							}
							matrix.update(x, y, nearWallValue + terrainCost);
						}
						
   					}
   				}
			}
			
			let rampartValue = 1;
			if (options.civilian) { rampartValue = 255; }		
			for (let rampart of ramparts) {
				if (rampart.pos.isPassible(true) ){
					// set rampart costs to same as road
					let terrainCost = 0;
					if (getRoomTerrainAt(rampart.pos) === TERRAIN_MASK_SWAMP){
						terrainCost = 3;
					}
				//	let currentCost = matrix.get(rampart.pos.x, rampart.pos.y)	// ramparts needs reset to road cost
					matrix.update(rampart.pos.x, rampart.pos.y, Math.min(rampartValue + terrainCost, 255));
				}
			}

			if (ENABLE_SPAWN_EXTENSIONS) {
                let fillers = this.getSpawnFillerPos();
                for (let idx in fillers) {
                    matrix.update(fillers[idx].x, fillers[idx].y, 210);
                }
            }

			for (let site of this.find(FIND_CONSTRUCTION_SITES)) {
				if (site.structureType === STRUCTURE_CONTAINER || 
					site.structureType === STRUCTURE_ROAD ||
					site.structureType === STRUCTURE_RAMPART) {
					continue;
				}
				matrix.update(site.pos.x, site.pos.y, 0xff);				
			}

			global._wallsLimit[this.name].matrix = matrix.pack();
		//	console.log("new")
			return matrix;
	//	}
	//	return PathFinder.CostMatrix.unpack(global._wallsLimit[this.name].matrix);        
	};	

	Room.prototype.getBuilderJob = function(options = {}) {
		if (this._cache.builderJobTs === undefined) { this._cache.builderJobTs = 0; }
		
		
		let cSites = this.getConstuctionSites()
		if ((this._memory.cSitesCount || 0) !== cSites.length ||
			(cSites.length > 0 && (!this._cache.builderJob || this._cache.builderJob.length <= 0)) ||
			this._cache.builderJobTs <= Game.time 
		){

			delete this._cache.builderJob;
			delete this._memory.cSitesCount;
			
			if (cSites.length > 0) { 
				this._memory.cSitesCount = cSites.length;
			}


			if (this._memory.myRoom) {
				this._cache.builderJobTs = Game.time + 13;				
			} else {
				this._cache.builderJobTs = Game.time + 99;
			}
			
			let walls = [];
			let lowestWall = 0;
			
			let wallSetpoint = 0;
			let wallIncrement = 100000;

			let maxWallHits = 0;
			if (Memory.rooms[this.name].myRoom){

				if (this.controller.level >= 2) {
					maxWallHits = RAMPART_HITS_MAX[this.controller.level] 
				}
				
				wallSetpoint = WALL_HP_SETPOINT[getRoomPRCL(this.name)];
				let allWalls = this.findByTypeMy(STRUCTURE_RAMPART);
				if (allWalls.length > 0 && getLowWallHp(this.name)) {

					/*
					if (this._memory.sieged || this._memory.hostiles) {
						walls = _.filter(walls, 
						function(c) {return (!isOutsideWalls(c.pos) )
						});
					}*/


					let sieged = this._memory.sieged || this._memory.hostiles;
					for (let idx in allWalls) {
						let wall = allWalls[idx];

						if (sieged && isOutsideWalls(wall.pos)) { continue; }

						let wallType = rampartIsValid(wall.pos);
						if (wallType === undefined) { 
							if (!BOT_MODE) {
								wallType = RAMPART_PRIMARY;
							} else {

							}
							continue; 
						}

						wall._effectiveHp = wall.hits * RAMPART_HP[wallType];
						walls.push(wall);
					}

					walls.sort(function (a,b) {return (a._effectiveHp - b._effectiveHp);});
					lowestWall = getLowWallHp(this.name);
					if (walls.length && walls[0]._effectiveHp > lowestWall + wallIncrement){
						updateWallInfo(this.name, true);
						lowestWall = getLowWallHp(this.name);
					}

				}
			}
			
			let nukeRamparts = [];
			let nukeBuffer = 100000;
			delete this._memory.nukeResponse;
			if (Memory.nukeRampart && Memory.nukeRampart[this.name]) {
				for (let pos in Memory.nukeRampart[this.name].pos) {
					let rampartPos = this.posDecompress(pos);
								
					let rampart = rampartPos.lookForStructure(STRUCTURE_RAMPART);
					if (!rampart) { continue; }
					let wantedHits = Math.min(maxWallHits, nukeBuffer + lowestWall + Memory.nukeRampart[this.name].pos[pos].dmg);
					if (rampart.hits < wantedHits && maxWallHits > Memory.nukeRampart[this.name].pos[pos].dmg){
						nukeRamparts.push(rampart);
						this._memory.nukeResponse = 1;
					}
				}
			}

			let priConstruction = [];
			let constructionsite = [];
			let roadsConstruction = [];
			let othersConstruction = [];
			let maintainTargets = [];
			if ((!this._memory.sieged && !this._memory.hostiles) || roomIsSafeModed(this.name)) {
			
				constructionsite = cSites;
			
				let sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_TOWER);
				priConstruction = priConstruction.concat(sites);
				sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_SPAWN);
				priConstruction = priConstruction.concat(sites);

				/*
				if (this._memory.mineOnly) {
					sites = _.filter(constructionsite,
						(s) => s.structureType === STRUCTURE_EXTRACTOR);
					priConstruction = priConstruction.concat(sites);
				}*/

				sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_TERMINAL);
				priConstruction = priConstruction.concat(sites);

				sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_STORAGE);
				priConstruction = priConstruction.concat(sites);
				
				sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_RAMPART);
				priConstruction = priConstruction.concat(sites);
				

				let priExt = false;
				if (currentStructures(this.name, STRUCTURE_EXTENSION) < 10) {
					priExt = true;
					sites = _.filter(constructionsite,
						(s) => s.structureType === STRUCTURE_EXTENSION);
					priConstruction = priConstruction.concat(sites);
				}

				
				sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_LINK);
				priConstruction = priConstruction.concat(sites);
				sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_EXTRACTOR);
				priConstruction = priConstruction.concat(sites);	
				sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_OBSERVER);
				priConstruction = priConstruction.concat(sites);


				/*							
				let wallsConstruction = _.filter(constructionsite,
											(s) => s.structureType === STRUCTURE_RAMPART || 
												s.structureType === STRUCTURE_WALL);	*/						
				othersConstruction = _.filter(constructionsite,
					(s) => s.structureType !== STRUCTURE_TOWER && 
						s.structureType !== STRUCTURE_SPAWN && 
						s.structureType !== STRUCTURE_TERMINAL && 
						s.structureType !== STRUCTURE_STORAGE && 
						(s.structureType !== STRUCTURE_EXTENSION || (!priExt && s.structureType === STRUCTURE_EXTENSION)) && 
						s.structureType !== STRUCTURE_RAMPART && 
						s.structureType !== STRUCTURE_LINK &&
						s.structureType !== STRUCTURE_EXTRACTOR &&
						s.structureType !== STRUCTURE_OBSERVER &&
						s.structureType !== STRUCTURE_ROAD); 
											
				roadsConstruction = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_ROAD);

			
				if (Memory.rooms[this.name].myRoom || Memory.rooms[this.name][R.MY_MINING_OUTPOST]) {
					maintainTargets = _.filter(this.findByType(STRUCTURE_CONTAINER),
											(s) => (containerIsValid(s.pos) && s.hits <= s.hitsMax*0.75));
					if (maintainTargets.length > 0) {
						
					}
				}
			} else { // UNDER ATTACK
				constructionsite = cSites;
				let sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_TOWER);
				priConstruction = priConstruction.concat(sites);
				sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_SPAWN);
				priConstruction = priConstruction.concat(sites);
				sites = _.filter(constructionsite,
					(s) => s.structureType === STRUCTURE_RAMPART);
				priConstruction = priConstruction.concat(sites);

			}
										
			if (walls.length > 0 || nukeRamparts.length > 0|| constructionsite.length > 0 || maintainTargets.length > 0) {
				this._cache.builderJob = [];
				let wallsIdx = 0;
				let constructionsiteIdx = 0;
				let priIdx = 0;
				let roadsIdx = 0;
				let maintainIdx = 0;
				let nukeIdx = 0;
				let wallsAreLow = false;
				let loopLength = walls.length + constructionsite.length + maintainTargets.length + nukeRamparts.length;
				for (let idx = 0; idx < loopLength; idx++ ) { 			
					
					if (idx > 15) { break; }	// no need to store more jobs??
					
					if (wallsIdx < walls.length && walls[wallsIdx].hits < 15000) {
						this._cache.builderJob.push(walls[wallsIdx].id);
						wallsIdx++;
						wallsAreLow = true;
						continue;
					}

					if (wallsAreLow) { break; }	

					if (priIdx	< priConstruction.length){
					//	if (priConstruction[priIdx].pos.lookForAnyCreep() ) { priIdx++; continue; }
						this._cache.builderJob.push(priConstruction[priIdx].id);
						priIdx++;
						continue;
					}

					if (nukeIdx	< nukeRamparts.length){
						this._cache.builderJob.push(nukeRamparts[nukeIdx].id);
						nukeIdx++;
					//	break;
						continue;
					}
					
					if (maintainIdx	< maintainTargets.length){
						this._cache.builderJob.push(maintainTargets[maintainIdx].id);
						maintainIdx++;
						continue;
					}
					
					if (constructionsiteIdx	< othersConstruction.length){
					//	if (othersConstruction[priIdx].pos.lookForAnyCreep() ) {constructionsiteIdx++; continue; }
						this._cache.builderJob.push(othersConstruction[constructionsiteIdx].id);
						constructionsiteIdx++;
						continue;
					}

					if (roadsIdx < roadsConstruction.length){
						this._cache.builderJob.push(roadsConstruction[roadsIdx].id);
						roadsIdx++;
						continue;
					}

					if (wallsIdx < walls.length && (nukeRamparts.length <= 0 || this._memory.sieged) ) {					

						if ((lowestWall+wallIncrement) > walls[wallsIdx]._effectiveHp && walls[wallsIdx]._effectiveHp < walls[wallsIdx].hitsMax && walls[wallsIdx].hits < maxWallHits){	// Make sure to not work on walls that are way beyond the rest
							this._cache.builderJob.push(walls[wallsIdx].id);
						}
						wallsIdx++;
						continue;
					}
				}
				this._cache.builderJob.reverse();	
			}						
		}
		
		if (!options.checkOnly && this._cache.builderJob) {
			let length = this._cache.builderJob.length;
			let jobStructureType
			let bestJobIdx
			let bestJobid
			let bestJobScore = 0	

			let myRoom = this._memory.myRoom


			for (let idx = length-1; idx >= 0; idx--) { 
				let object = Game.getObjectById(this._cache.builderJob[idx]);
				if (!object){
					this._cache.builderJob.splice(idx, 1); // Not a valid object anymore					
					continue;
				} else {

					if (options.fromPos && bestJobIdx !== undefined && (!object.isConstructionSite || object.structureType !== jobStructureType) ) { break; }

					if (object.isConstructionSite) {
						let id = this._cache.builderJob[idx];
						
						if (options.buildAmount && options.buildAmount > object.progressTotal) { 
						//	console.log(this + " popping builder job " + object + " " + options.buildAmount + "/" + object.progressTotal)
							this._cache.builderJob.splice(idx, 1);

							// request more roads in this room?
							if (object.structureType === STRUCTURE_ROAD) {
								let roadsConstruction = _.filter(cSites,
									(s) => s.structureType === STRUCTURE_ROAD);
								if (roadsConstruction.length <= 2) {
									requestMoreRoadCsites(this.name);
								}
							}
						}

						
						if (options.fromPos) {
							jobStructureType = object.structureType;

							let rangeFromBuilder = options.fromPos.getRangeTo(object)
							let score = 50 - rangeFromBuilder

							let ignoreProgress = false;
							if (myRoom && (jobStructureType === STRUCTURE_EXTENSION || jobStructureType === STRUCTURE_CONTAINER)) {
								let sources = this.find(FIND_SOURCES);
								for (let i = 0; i < sources.length; i++) {
									let harvesterPos = sources[i].getHarvesterPos(this.name);
									if (getRangeTo(harvesterPos, object.pos) <= 1) {
										ignoreProgress = true;
									}
								}
							} else if (jobStructureType === STRUCTURE_ROAD && myRoom) {
								ignoreProgress = true;
							}

							if (!ignoreProgress || rangeFromBuilder <= 3) {
								score += object.progress;
							}

							
							if (score > bestJobScore) {
								jobStructureType = object.structureType;
								bestJobScore = score;
								bestJobIdx = idx;
								bestJobid = id;
							}
						} else {
							return id;
						}

					//	return id;

					} else { // Repair
						if (object.structureType === STRUCTURE_CONTAINER || object.structureType === STRUCTURE_ROAD) {
							if (object.hits === object.hitsMax) {
								this._cache.builderJob.splice(idx, 1);
							}
							return this._cache.builderJob[idx];
						} else if (object.isRampart && 
							options.buildOnly &&
							object.hits > WALL_HP_SETPOINT[getRoomPRCL(this.name)] 
						//	(!Memory.nukeRampart || !Memory.nukeRampart[this.name] && !Memory.nukeRampart[this.name].pos[posDecompress(object.pos)])
						){
							continue;
							
						} else { // WALL + RAMPART
							this._cache.builderJob.splice(idx, 1);
							return object.id							
						}
					}				
				}
			}
			
			if (bestJobid) {
				return bestJobid
			}
		}

		delete this._cache.builderJob;
	};

	
	Room.prototype.getIdlePos = function() {
		let id = roomId(this.name)
		if(global.idlePos[id] === undefined) { 
			global.idlePos[id] = {};
			let center = new RoomPosition(25, 25 , this.name);
			let openPos = getOpenPositions(center, 20, {maxPositions: 1});
			if (openPos.length > 0){
				global.idlePos[id] = posCompress(openPos[0]);
			} else {
				global.idlePos[id] = posCompress(center);
			}			
		}			
		return posDecompress(global.idlePos[id], this.name)
	};

	Room.prototype.getConstuctionSites = function() {
		return this.find(FIND_MY_CONSTRUCTION_SITES)
		/*
		if(global.getConstuctionSitesTimestamp == undefined) { global.getConstuctionSitesTimestamp = {}; }
		if(global.constructionsites === undefined) { global.constructionsites = {}; }
		
		if(global.getConstuctionSitesTimestamp[this.name] === undefined || global.getConstuctionSitesTimestamp[this.name] !== Game.time) {
			global.getConstuctionSitesTimestamp[this.name] = Game.time;
			global.constructionsites[this.name] = this.find(FIND_MY_CONSTRUCTION_SITES);			
		}
		return global.constructionsites[this.name]; */
	};
	
	Room.prototype.checkFindCache = function() {
		// COUNT STRUCTURES AND UPDATE CACHE IF NEEDED
		let id = roomId(this.name);
		if (!global.roomsFindCache[id]) { global.roomsFindCache[id] = {}; }
		let structures = this.find(FIND_STRUCTURES, {
			filter: (structure) => (structure.structureType !== STRUCTURE_ROAD)
			});

		if (global.roomsFindCache[id].numStructures !== structures.length) {

			global.roomsFindCache[id].numStructures = structures.length;
			for (let structure in global.roomsFindCache[id].structures) {
				this.findByType(structure, true);
				break;
			}
		}
	};
	
	Room.prototype.findByTypeMy = function(structureType, forceUpdate) {
			
		let myStrucutres = _.filter(this.findByType(structureType, forceUpdate), 
			function(structure) {return (structure.my);
			});
		
		return myStrucutres;
	};	


	let isActive = OwnedStructure.prototype.isActive;
	OwnedStructure.prototype.isActive = function() {
		if (!this.room.controller || this.room.controller.level === 8 || (this.room._memory && this.room._memory.maxRCL && this.room._memory.maxRCL === (this.room.controller.level || 0))) {
			return true;
		}
		return isActive.call(this);
	}

	global.roomId = function(roomName){
		return "_"+roomName
	} 
		
	Room.prototype.findByType = function(structureType, forceUpdate) {
		//console.log("init for " + structureType)
		if (Array.isArray(structureType)) {
			let arrStructure = [];
			let length = structureType.length;
			for (let idx=0; idx < length; idx++) {
				let temp = this.findByType(structureType[idx]);
				arrStructure = arrStructure.concat(temp);
			}
			return arrStructure;
		}

		let id = roomId(this.name);
		if (global.roomsFindCache === undefined) { global.roomsFindCache = {}; }
		if (global.roomsFindCache[id] === undefined) {global.roomsFindCache[id] = {}; }	
		if (global.roomsFindCache[id].structures === undefined) {global.roomsFindCache[id].structures = {}; }	

		if (global.roomsFindCache[id].structures[structureType] === undefined || forceUpdate || Game.time > global.roomsFindCache[id].ts)	{

			let my;
			let findConstant = FIND_STRUCTURES;
			if (this.controller && this.controller.my) {
				global.roomsFindCache[id].ts = Game.time + 17;
				my = true;
				
				/*
				if (structureType !== STRUCTURE_CONTAINER && structureType !== STRUCTURE_ROAD && structureType !== STRUCTURE_WALL) {
					findConstant = FIND_MY_STRUCTURES
				}*/

			} else {
				global.roomsFindCache[id].ts = Game.time + 477;
			}

			let cache = global.roomsFindCache[id].structures;

			cache[structureType] = {
				id: []
			}

			let foundType = {}
			let structures = this.find(findConstant);

			global.roomsFindCache[id].numStructures = 0;
			for (let idx in structures) {

				let type = structures[idx].structureType;

				if (type !== STRUCTURE_ROAD) {
					global.roomsFindCache[id].numStructures++
				}

				if (!foundType[type] || cache[type] === undefined) {
					foundType[type] = {};
					cache[type] = {
						id: []
					}
				}

				if (my && (type !== STRUCTURE_EXTENSION && type !== STRUCTURE_RAMPART && type !== STRUCTURE_STORAGE)) {
					if (!structures[idx].isActive() ) { continue; }
				}
				cache[type].id.push(structures[idx].id);
			}


			/*
			let structures;
			if (structureType === STRUCTURE_EXTENSION || 
				structureType === STRUCTURE_RAMPART || 
				structureType === STRUCTURE_STORAGE
			){
				structures = this.find(FIND_STRUCTURES, {
					filter: (structure) => {
						return (structure.structureType == structureType);
					}});
			} else { 
				structures = this.find(FIND_STRUCTURES, {
					filter: (structure) => {
						return (structure.structureType == structureType &&
								structure.isActive() );
					}}); 
			}
			global.roomsFindCache[id].structures[structureType].id = [];
			let length = structures.length;
			for (let i=0; i< length; i++) {
				global.roomsFindCache[id].structures[structureType].id[i] = structures[i].id;
			}*/
		}
		let arrStructure2 = [];
		let obj;
		let structures = global.roomsFindCache[id].structures[structureType];
		if (!structures || !structures.id) { return arrStructure2; }
		let lengthLoop = structures.id.length;
		for (let i=0; i<lengthLoop; i++) { 
		//	obj = Game.getObjectById(Memory.rooms[id].structures[structureType].id[i])
			obj = Game.getObjectById(structures.id[i]);
			if (obj !== undefined && obj !== null) { arrStructure2.push(obj); }
		}
		return arrStructure2;
	};
	
	Room.prototype.storeWithLabs = function(resource) {
		let amount = 0;
		if (!this._labStore) {	// build cache
			this._labStore = {};
			let allLabs = this.findByType(STRUCTURE_LAB);
			let length = allLabs.length;
			for (let i=0; i < length; i++) {
				let type = allLabs[i].mineralType;
				if (!this._labStore[type]) {
					this._labStore[type] = {};
					this._labStore[type].amount = 0;
				}
				this._labStore[type].amount += allLabs[i].mineralAmount;
			}
		}
		if (this._labStore[resource]) {
			amount = this._labStore[resource].amount;
		}		
	//	console.log(" storeWithLabs " + resource + " store "+ resource + this.store(resource) + " labs "+amount )
		return amount + this.store(resource);
	};	

	Room.prototype.storeWithFactory = function(resource) {
		let amount = 0;
		let factory = this.findByType(STRUCTURE_FACTORY)[0];
		if (factory) {
			amount += factory.store[resource] || 0
		}
		return amount + this.store(resource);
	};	
	
	Room.prototype.store = function(resource) {
		if (this._resource === undefined || this._resource[resource] === undefined ) {
			if (this._resource === undefined ) { this._resource = {}; }
						
			let amount = 0;
			if (this.storage && this.storage.store[resource]) {		
				amount += this.storage.store[resource];
			}
			if (this.terminal && this.terminal.store[resource]) {
				amount += this.terminal.store[resource];
			}
			this._resource[resource] = amount;
		}
		return this._resource[resource];
	};

	Room.prototype.getActiveSKLairs = function() {		

		if (this._mineralLairs === undefined) {
			let allLairs = this.room.findByType(STRUCTURE_KEEPER_LAIR);

			this._mineralLairs = [];
			this._sourceLairs = [];

			let mineral;
			for (let id in this._memory.mineral) {
				mineral = Game.getObjectById(id);
				this._mineralId = id;
			}

			for (let i=0; i< allLairs.length; i++) {
				let lair = allLairs[i];
				if (lair.pos.getRangeTo(mineral) <= 5) {
					this._mineralLairs.push(lair.id);
				} else {
					this._sourceLairs.push(lair.id);
				}
			}
		}

		let returnValues = [];
		for (let i=0; i< this._sourceLairs.length; i++) {
			let lair = Game.getObjectById(this._sourceLairs[i]);
			returnValues.push(lair);
		}
			
		if (!mineralOnCd(this.name, this._mineralLairs[0]) || mineralOnCd(this.name, this._mineralLairs[0]) < 300) {
			let lair = Game.getObjectById(this._mineralLairs[0]);
			returnValues.push(lair);
		}
		return returnValues;
	}
	
	Room.prototype.labIdlePos = function() {
		if (global.labIdlePos[this.name] === undefined || !global.labIdlePos[this.name].labIdlePos) {		
			let allLabs = this.findByType(STRUCTURE_LAB);
			if (allLabs.length === 0) { return }
			let xAvg = 0;
			let yAvg = 0;
			let length = allLabs.length;
			for (let i=0; i< length; i++) {
				xAvg += allLabs[i].pos.x;
				yAvg += allLabs[i].pos.y;
			}
			xAvg = Math.floor(xAvg / allLabs.length);
			yAvg = Math.ceil(yAvg / allLabs.length);
			global.labIdlePos[this.name] = {};
			global.labIdlePos[this.name].labIdlePos = this.posCompress(new RoomPosition(xAvg,yAvg, this.name));
		}
		return this.posDecompress(global.labIdlePos[this.name].labIdlePos);
	};
	
	Room.prototype.splitRoomName = function() {
		let patt = /([A-Z]+)(\d+)([A-Z]+)(\d+)/;
		let result = patt.exec(this.name);
		return result;
	};

	/*
	global.registerRaidMove = function(pos) {
		if (global.registerRaidMove === undefined ) { global.registerRaidMove = {}; }
		if (global.registerRaidMove[pos.roomName] === undefined ) { 
			global.registerRaidMove[pos.roomName] = {};
			global.registerRaidMove[pos.roomName].pos = {};
		}
		global.registerRaidMove[pos.roomName].pos[pos] = {};
	};*/

	global.requestRoomVision = function(roomName) {
		if (global.requestRoomsVis === undefined ) { global.requestRoomsVis = {}; }
		if (global.requestRoomsVis[roomName] === undefined ) { 
			global.requestRoomsVis[roomName] = {}; 			
		}
		return true;
	};

	Room.prototype.fulfillVisionRequest = function() {
		let observers = [];
		if (global.requestRoomsVis) {			
			for (let room in global.requestRoomsVis) {	
				if (room === undefined) { continue; }

				if (Game.rooms[room]) {
					delete global.requestRoomsVis[room];
					continue;
				}

				if (Game.map.getRoomLinearDistance(this.name, room) <= OBSERVER_RANGE) {
															
					if (observers.length === 0) { 
						observers = this.findByType(STRUCTURE_OBSERVER);
						if (observers.length === 0) {
							return 0; 
						}							
					}
					let result = observers[0].observeRoom(room);
					if (result !== OK) { 
						log(this.name + " observer return " + result + " for target room " + room);
						return 0; 
					}
					delete global.requestRoomsVis[room];
					return 1;
				}
			}
		}
	};


	function defendersStepOutside(allies, enemies, towers){
		if (allies.length === 0) { return; }

		for (let enemy of enemies) {

			let myPossibleDmg = 0;
			let maxTicksInRange = 0;
			
			for (let ally of allies) {
				if (ally.fatigue) { continue; }
				let rangeToEnemy = ally.pos.getRangeTo(enemy);

				if (ally._cache.inRangeOfEnemy === undefined) { ally._cache.inRangeOfEnemy = 0; }

				if (rangeToEnemy !== 2) {
					continue;
				}
				
				if (ally._cache.inRangeOfEnemyTs !== Game.time) {
					ally._cache.inRangeOfEnemyTs = Game.time;
					ally._cache.inRangeOfEnemy++;
				}
				

				Math.min(maxTicksInRange, ally._cache.inRangeOfEnemy);

				let strength = calcBodyStrength(ally.body, true);
				myPossibleDmg += strength.attackDamage + strength.rangedAttackDamage;				
			}

			if (myPossibleDmg === 0) { continue; }
			if (maxTicksInRange < 7) { continue; }

			// check that all my creeps actually can move in range in one tick!

			myPossibleDmg += getTowerDamage(enemy.pos, towers);

			let enemyHeal = 0;
			let effDmg = effectiveDamage(enemy.body, enemy.hits, myPossibleDmg, enemyHeal);
			if (effDmg > enemy.hits) {
				// can kill this creep if we step outside!

				// store this action to rate the best action

				// Fire towers at nearby enemy to draw enemy healers

				// Step Out!
			}
		}

		for (let ally of allies) {
			if (ally._cache.inRangeOfEnemyTs !== Game.time) {
				ally._cache.inRangeOfEnemy = 0;
			}
		}




	}

	Room.prototype.handleTowers = function() {

		let structure = this.name;	

		// GET TARGETS ONCE
		let damagedCreep = getMyDamagedCreeps(structure);
		let enemies = getEnemyCreeps(structure);
		let allies = [];
		let towersAttacked;
		let lowestWall;
		let closestDamagedStructure;
		let towers = [];

		if (enemies.length > 0) {	// FIND AND ATTACK


			towers = _.filter(this.findByType(STRUCTURE_TOWER), 
				function(c) {return (c.energy > 10);
				});
			if (towers.length === 0) { return; }

			if (Game.time % 10 === 0) {
				// Once in a while heal non combat
			} else {
				damagedCreep = _.filter(damagedCreep, 
					function(creep) {return (	
							creep.isCombatCreep() &&
							creep.hits < (creep.hitsMax * 0.8)
							)
						});	
			}
			

			allies = this.find(FIND_MY_CREEPS, {
				filter: function(creep) {
					return (creep.hasBodyparts(ATTACK) > 0 || 
							creep.hasBodyparts(RANGED_ATTACK) > 0);
				}});
			let roomSafeMode = roomIsSafeModed(structure)
			towersAttacked = findAttackTargetDmgBased(enemies, towers, allies, roomSafeMode);

			if (!towersAttacked && Memory.rooms[structure].isPlayer ) {
				if (!doScatterShot(structure, enemies, towers) && !globalEnergyCrysis() ) {
					let walls = Game.rooms[structure].findByType(STRUCTURE_RAMPART);
					if (walls.length > 0) {
						let lowWallHits = _.min(walls, 'hits');
						if (lowWallHits.hits < (getAvgWallHp(structure) / 4)) {
							lowestWall = lowWallHits;
						}
					}
				}
			}
		} else {
			
			if ((!this._cache.repairTs || 
				Game.time > this._cache.repairTs) && 
				!Memory.rooms[structure].sieged &&
				getRoomPRCL(structure)  >= 3 &&
				damagedCreep.length <= 0
			){
				
				let damagedStructures = getTowerRepairTargets(structure);
				this._cache.repairTs = Game.time + 301;					
				if (damagedStructures.length > 0) {

					towers = _.filter(this.findByType(STRUCTURE_TOWER), 
						function(c) {return (c.energy > 10);
						});		
					if (towers.length === 0) { return; }

					for (let idx in damagedStructures) {
						let damagedStructure = damagedStructures[idx];

						let missingHits = damagedStructure.hitsMax - damagedStructure.hits;
						if (damagedStructure.structureType === STRUCTURE_ROAD && missingHits < TOWER_POWER_REPAIR) { continue; }
						if (damagedStructure.structureType === STRUCTURE_CONTAINER && missingHits < damagedStructure.hitsMax/2 ) { continue; }
												
						let repaired = repairWihClosestTower(damagedStructure, towers);
						if (repaired) {
							this._cache.repairTs = Game.time;
						}

						if (idx >= towers.length) { break; }
					}
				}
			}
		}			

		if (!towersAttacked && (damagedCreep.length > 0 || enemies.length > 0)) {
			let healCounter = 0;

			if (towers.length === 0) {
				towers = _.filter(this.findByType(STRUCTURE_TOWER), 
					function(c) {return (c.energy > 10);
					});
				if (towers.length === 0) { return; }
			}		

			let length = towers.length;

			let healer;
			if (damagedCreep.length > 0 && !damagedCreep[0].isPowerCreep) {
				healer = calcSingleCreepStrength(damagedCreep[0], true).healPower;
			}

			for (let i=0; i < length; i++) {					
										
				if(!healer && damagedCreep.length > 0 && towers[i].energy > 650 ) {				
					

					if (!Memory.rooms[structure].hostiles) {	// IF NO HOSTILES, ONE HEAL AT A TIME
						if (healCounter >= 1) { continue; }
						healCounter++;
					}
					towers[i].heal(damagedCreep[0]);
					continue;
				}
				
				if (lowestWall && towers[i].energy > 750) {
					towers[i].repair(lowestWall);
					continue;
				}
			}
		}			
		
	}
	
	Room.prototype.handleObserver = function(highWaysOnly=false) {
		
		let observers = this.findByType(STRUCTURE_OBSERVER);
	  	let roomName = this.name;
		if (observers.length > 0) {
			if (!global.observe_rooms[roomName]) {

				if (this._cache.observIdx === undefined) { 
					this._cache.observIdx = Math.floor(Math.random() * 400)
				}
			//	let init = Game.cpu.getUsed()
				global.observe_rooms[roomName] = [];
				let nameSplit = this.splitRoomName();
				let range = 10;
				let xName, yName;
				let xOverflow, yOverflow;
				for (let x = +nameSplit[2] - range; x <= +nameSplit[2] + range; x++) {
					for (let y = +nameSplit[4] - range; y <= +nameSplit[4] + range; y++) {
						if (x >= 0 && y >= 0) {	
					//	if (x % 10 === 0 || y % 10 === 0) {	// Only highways
							global.observe_rooms[roomName].push(nameSplit[1] + x + nameSplit[3] + y);
						} else {
							if (x < 0 ) {
								if (nameSplit[1] === "E") {
									xName = "W";
								} else {
									xName = "E";
								}
								xOverflow = (x * -1) - 1;
							} else {
								xOverflow = x;
								xName = nameSplit[1];
							}

							if (y < 0 ) {
								if (nameSplit[3] === "N") {
									yName = "S";
								} else {
									yName = "N";
								}
								yOverflow = (y * -1) - 1;
							} else {
								yOverflow = y;
								yName = nameSplit[3];
							}
							global.observe_rooms[roomName].push(xName + xOverflow + yName +yOverflow);
						}
					}
				}
			}

			let observe_idx = this._cache.observIdx % global.observe_rooms[roomName].length
			let observe_room = global.observe_rooms[roomName][observe_idx];
			this._cache.observIdx++;

			let checks = 0;
			while (Game.rooms[observe_room] || (SEASONAL_COMMS && !roomIsHW(observe_room) && Math.random() > 0.1)) {

				observe_idx = this._cache.observIdx % global.observe_rooms[roomName].length
				observe_room = global.observe_rooms[roomName][observe_idx];
				this._cache.observIdx++;
				
				if (BOT_MODE && (getRoomStatus(observe_room) === 'closed' || getRoomStatus(observe_room) !== getRoomStatus(roomName))) { 
					global.observe_rooms[roomName].splice(observe_idx, 1);
					this._cache.observIdx--;
					observe_room = global.observe_rooms[roomName][observe_idx];
				}

			//	if (!Game.rooms[observe_room] && (!highWaysOnly || roomIsHW(observe_room))) { break; }

				checks++
				if (checks > 30) { break; }
			}

			if (!Game.rooms[observe_room]) {
				if (highWaysOnly && 
					Math.random() > 0.1 &&
					(roomIsController(observe_room) && 
					Memory.rooms[observe_room] && 
					!Memory.rooms[observe_room].hostiles && Game.time < (getRoomCache(roomName).scoutController || 0) + 397)
					) { 
					return;
				}

				if (HIGHWAY_WALLS && !roomsInSameSectorV2(observe_room, roomName) && !Memory.rooms[observe_room]) { return; }

				if (BOT_MODE && (getRoomStatus(observe_room) === 'closed' || getRoomStatus(observe_room) !== getRoomStatus(roomName))) { 
					global.observe_rooms[roomName].splice(observe_idx, 1);
					this._cache.observIdx--
					return; 
				}


				let returnCode = observers[0].observeRoom(observe_room);
				if (returnCode !== OK) {
					console.log(this.name + " observing " + observe_room + " failed with error code " + returnCode);
				}
			}
		}
	};

	/**
	 * CostMatrix serialization and deserialization alternatives
	 *
	 * ***********************************USAGE************************************
	 * New methods replace .serialize(), .deserialize(), and .set(); original method
	 * names have not been overloaded.  Functionality is equivalent in most cases
	 * and shouldn't require any code changes beyond swapping out method names
	 * (except for .pack()).  The new methods are as follows:
	 *
	 * .set(x, y, cost) --------------------------------> .update(x, y, cost)
	 * .deserialize(serializedMatrix) ------------------> .unpack(serializedMatrix)
	 * .serialize() ------------------------------------> .pack([freeze=false])
	 *
	 * In the case of .pack(); if you cache CostMatrix objects globally, call it
	 * without any additional arguments like you would .serialize().  If you plan to
	 * store the result in Memory and deserialize at some arbitrary point in the
	 * future, provide true as the only argument.
	 *
	 * Either require() this file in your own screeps code somewhere, or copy and
	 * paste all contents into an existing file.
	 *
	 * ******************************LIMITATION NOTICE*****************************
	 * These new serialization/deserialization methods assume that at most, only 22
	 * unique cost values are reflected in all globally cached CostMatrix instances.
	 *
	 * For example, if I assign roads a cost of 1, containers a cost of 10, and all
	 * other structures a cost of 255, I'm using 3 unique cost values. Terrain costs
	 * inserted by the gain don't count towards this limitation.
	 *
	 * Based on player input, the upper range of cost values in circulation is 10
	 * and will never be a problem. However, if you need more than 22 unique cost
	 * values, these methods will not work as expected.
	 */

	/**
	 * Holds all cost values being utilized by serialized CostMatrix instances
	 * stored in global scope
	 *
	 * @constant
	 * @type       {number[]}
	 */
	const OFFSETS = [];

	/**
	 * Used as marker to indicate offset has been stored along with serialized
	 * matrix
	 *
	 * @constant
	 * @type       {string}
	 */
	const TRIGGER = String.fromCharCode(65355);


	Object.defineProperty(PathFinder.CostMatrix.prototype, 'costMap', {
		/**
		 * Gets values that reflect modified CostMatrix positions and their
		 * associated cost
		 *
		 * @return     {number[]}  this._bits indices with an offset added that
		 *                         reflects associated cost
		 */
		get: function() {
			if (!this._costMap) {
				this._costMap = [];
			}
			return this._costMap;
		},
		enumerable: false,
		configurable: true
	});

	/**
	 * Sets the cost at the provided (x,y) position and updates this.costMap with a
	 * value that reflects the modified position cost and the index it is found at
	 * in this._bits
	 *
	 * Use this method instead of this.set() only when using this.pack() for data
	 * serialization
	 *
	 * @param      {number}  x       x position
	 * @param      {number}  y       y position
	 * @param      {number}  cost    PathFinding cost position will be set to
	 */
	PathFinder.CostMatrix.prototype.update = function(x = 0, y = 0, cost = 0) {
		const index = x * 50 + y;
		this._bits[index] = Math.min(Math.max(0, cost), 255);

		let offset = OFFSETS.indexOf(cost);
		if (offset === -1) {
			offset = OFFSETS.push(cost) - 1;
		}
		this.costMap.push(index * 22 + offset);
	};

	/**
	 * Translates CostMatrix to a string representing all positions in room where
	 * the associated cost is > 0.
	 *
	 * @param      {boolean}  [freeze=false]  If true, the current state OFFSETS is
	 *                                        serialized with the CostMatrix,
	 *                                        allowing it to be stored in Memory and
	 *                                        reused between global resets.
	 *
	 * @return     {string}  Serialized form of CostMatrix in its current state
	 */
	PathFinder.CostMatrix.prototype.pack = function(freeze = false) {
		let base = '';
		if (freeze) {
			base += TRIGGER + OFFSETS.length + String.fromCharCode(...OFFSETS);
		}

		if (this.costMap.length > 0) {
			return base + String.fromCharCode(...this.costMap);
		}

		for (let i = 0; i < this._bits.length; i++) {
			let cost = this._bits[i];
			if (cost === 0) {
				continue;
			}
			let offset = OFFSETS.indexOf(cost);
			if (offset === -1) {
				offset = OFFSETS.push(cost) - 1;
			}
			this.costMap.push(i * 22 + offset);
		}
		return base + String.fromCharCode(...this.costMap);
	};

	/**
	 * Converts an encoded CostMatrix string back to its original form
	 *
	 * @param      {string}  packed  A CostMatrix in its serialized, encoded form
	 *
	 * @return     {PathFinder.CostMatrix}  CostMatrix instance with position costs
	 *                                      pulled from the encoded string
	 */

	PathFinder.CostMatrix.unpack = function(packed) {
		let [codec, start] = [OFFSETS, 0];
		if (packed[0] === TRIGGER) {
			codec = _deserializeOffset(packed);
			start += codec.length + 2;
		}
		const matrix = new PathFinder.CostMatrix();
		for (let i = start; i < packed.length; i++) {
			let value = packed.charCodeAt(i);
			matrix._bits[(value / 22) | 0] = codec[value % 22];
		}
		return matrix;
	};

	/**
	 * Creates OFFSET array active at the time the packed matrix was created
	 *
	 * @param      {string}    packed  CostMatrix created by .pack(true)
	 * @return     {number[]}  Array of numbers representing the state OFFSETS at
	 *                         time of serialization
	 */
	function _deserializeOffset(packed) {
		const codecLength = parseInt(packed[1], 10);

		const offsets = [];
		for (let i = 2; i < 2 + codecLength; i++) {
			offsets.push(packed.charCodeAt(i));
		}
		return offsets;
	}

};
	