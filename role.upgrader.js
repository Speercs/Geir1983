'use strict'
module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {
        
		
		if (creep.sleep() ) { return 0 }



		if (isGCLPraiseRoom(creep.room.name) && isGCLPraiseRoomStandby(creep.room.name)){
			creep.roleGCLUpgrader();
			creep.GCLrefreshTTL();
		} else {
			if( creep.applyBoost(T3_UPGRADE_CONTROLLER) ) { return }
			if( creep.timeToHeadBackForUnBoost() && creep.unBoost() ) { return; }
			if (creep._memory[C.ROOM_TARGET] && creep.room.name !== creep._memory[C.ROOM_TARGET]) {
				creep.goToRoom(creep._memory[C.ROOM_TARGET])
			} else {
				creep.roleStationaryUpgrader();
			}
		}
	}
};

Creep.prototype.recordIdleUpgrader = function () {
	if (Memory.rooms[this.room.name].idleUp === undefined) { Memory.rooms[this.room.name].idleUp = 0; }
	Memory.rooms[this.room.name].idleUp++;
}

Creep.prototype.recordWorkingUpgrader = function () {
	if (Memory.rooms[this.room.name].wrkUp === undefined) { Memory.rooms[this.room.name].wrkUp = 0; }
	Memory.rooms[this.room.name].wrkUp++;
}

// ROLE roleStationaryUpgrader
Creep.prototype.roleStationaryUpgrader = function () {

	// CHECK IF NEEDING ENERGY
	if (!this._cache.wantedEnergy) {

		let consumption = this.getActiveBodyparts(WORK);

		let capacity = 0
		if (this.room.controller && this.room.controller.level < 8) {
			this._cache.wantedEnergy = capacity = this.store.getCapacity(RESOURCE_ENERGY) - consumption
		} else {
			this._cache.wantedEnergy = consumption * 2;
		}


		if (this._memory[C.BOOSTED]) { this.recordTicksFromLabToWork(); }	// first time in function
	}

	let scooped 
	if (this.room.controller.level < 8) {
		if (Game.time % 2 === 0) { scooped = this.scoopNearbyEnergy() }
	}

	if (this._memory[C.STARTED] && !scooped && !this.upgraderPassMeTheEnergy() && this.carry[RESOURCE_ENERGY] <= this._cache.wantedEnergy) {
		// WITHDRAW ENERGY
		let gettingEnergy = this.getUpgraderEnergy();
		if (!this._withdrawOk && this.store[RESOURCE_ENERGY] === 0) {
			this.recordIdleUpgrader();
		}

		if (gettingEnergy === ERR_BUSY) { return; }
	}

	// IN RANGE
	let dest;
	let range;
	if (this.room.controller.level < 8) {

		if (this._memory.anchor === undefined) {
			let link = _.filter(this.room.findByType(STRUCTURE_LINK), 
				function(structure) {return (structure.isController() ) });
			if (link[0]) { 
				dest = link[0].pos.pullUpgraderFormation(this.pos, this.id);
				this._memory.anchor = link[0].id
			} else {
				let container = _.filter(this.room.findByType(STRUCTURE_CONTAINER), 
					function(structure) {return (structure.isController() ) });
				if (container[0]) { 
					this._memory.anchor = container[0].id
				} else {
					this._memory.anchor = this.room.controller.id
				}
			}			
		}
		let anchor = Game.getObjectById(this._memory.anchor)
		if (anchor) {
			dest = anchor.pos.pullUpgraderFormation(this.pos, this.id);
		} else {
			dest = this.room.controller.pos.pullUpgraderFormation(this.pos, this.id);
		}
		range = 0;
	} else {
		if (this._cache.bestPos === undefined) {

			let link = _.filter(this.room.findByType(STRUCTURE_LINK), 
				function(structure) {return (structure.isController() ) });

			if (link[0]) { 
				dest = link[0].pos.pullUpgraderFormation(this.pos, this.id);				
			} else {
				dest = this.room.controller.pos.pullUpgraderFormation(this.pos, this.id);
			}			
			this._cache.bestPos = posSave(dest);
		}
		dest = this._cache.bestPos;
		range = 0;
		if (!dest) {
			dest = this.room.controller.pos;
			range = 3;
		}		
	}
	

	let moving;
	if (this.pos.getRangeTo(dest) > range) {
		moving = true;


		this.room.visual.line(this.pos, dest, { color: "green", lineStyle: "solid" });

		if (this.pos.getRangeTo(this.room.controller) <= 4) {
			if (this._memory[C.STARTED] === undefined) {
				this._memory[C.STARTED] = 1;
				this._memory.upEn = 26;
			}
			
		//	let blocker = dest.lookForCreep();
			let blocker = lookForCreep(dest)
			if (!blocker) {
				this.room.visual.text("m", this.pos.x,  this.pos.y, { color: 'green', font: 0.5 });
				if (!this.fatigue) {
				
					let { path, ops } = findTravelPath(this.pos, dest,
						{range: range, ignoreCreeps: true,  maxOps:1000, roomCallback: stayCloseToController});

					if (path && path.length > 0) {						
						let nextPos = path[0];
						blocker = nextPos.lookForCreep();

						if (!blocker || !blocker.fatigue) {
							this.moveAllCreepsOnPath(path, { recursive: true});
						}
						this.room.visual.line(this.pos, nextPos, { color: "red", lineStyle: "solid" });
					}
				}
			} else {
				// Wait?
				this.room.visual.text("s", this.pos.x,  this.pos.y, { color: 'green', font: 0.5 });
				
				// Swap
				if (!this.fatigue && Math.random() > 0.75) {

					let { path, ops } = findTravelPath(this.pos, dest,
						{range: range, ignoreCreeps: true,  maxOps:1000, roomCallback: stayCloseToController, ignoreContainer: true});

					if (path && path.length > 0) {
						let nextPos = path[0];
						
						blocker = nextPos.lookForCreep();
						if (blocker && !blocker.fatigue) {
							blocker.move(blocker.pos.getDirectionTo(this.pos))
						}

						if (!blocker || !blocker.fatigue) {
							this.move(this.pos.getDirectionTo(nextPos))
						}
											
					}
				}
			}

		} else {
			this.room.visual.text("t", this.pos.x,  this.pos.y, { color: 'green', font: 0.5 });
			this.travelTo(dest, { maxRooms: 1, range: range, ignoreCreeps: true, roomCallback: stayCloseToController, ignoreContainer: true });			
		}		
	}

	if (this.store[RESOURCE_ENERGY] <= 0) { return; }

	let repairing = false;
	let rangeToController = this.pos.getRangeTo(this.room.controller)
	if (this._cache.wantedEnergy > 2) {
		let allowBuild = false;
		range = 1;
		if (Game.cpu.bucket > 8000) { 
			allowBuild = true;
			range = 3;
		}

		let delay = 50;
		if (this.room.controller.level < 4) {
			delay = 5;
		}
		repairing = this.repairWhileMoving(range, true, allowBuild, delay);
		if (repairing) {
			this.recordWorkingUpgrader()
			delete this._memory.upEn;
			if (this._memory[C.STARTED] === undefined) {
				this._memory[C.STARTED] = 1;
				this._memory.upEn = 26;
			}
		}
	}

	if (rangeToController <= 3) {
		// UPGRADE
		this.upgradeController(this.room.controller);
		delete this._memory.upEn;
		if (this._memory[C.STARTED] === undefined) {
			this._memory[C.STARTED] = 1;
			this._memory.upEn = 26;
		}
		if (this._memory[C.BOOSTED]) { this.recordTicksFromLabToWork(15); }
		this.recordWorkingUpgrader()
	}
	return 1;
	
};

Creep.prototype.isNearUpgEnergySource = function(linkOnly){
	let energyStore = [];

	if (!this._cache.linkId) {
		let link = _.filter(this.room.findByType(STRUCTURE_LINK),
			function (structure) {
				return (structure.isController() );
			});
		if (link.length > 0) {
			this._cache.linkId = link[0].id;
		} else {
			this._cache.linkId = -1;
		}
	}

	let link = Game.getObjectById(this._cache.linkId)
	energyStore.push(link);

	if (!linkOnly || !link) {

		if (!this._cache.contId) {
			let container = _.filter(this.room.findByType(STRUCTURE_CONTAINER),
				function (structure) {
					return (structure.isController() );
				});
			if (container.length > 0) {
				this._cache.contId = container[0].id;
			} else {
				this._cache.contId = -1;
			}
		}

		let cont = Game.getObjectById(this._cache.contId)
		energyStore.push(cont);
	}
	
	for (let idx in energyStore) {
		let energy = energyStore[idx];
		if (energy && this.pos.isNearTo(energy) && energy.store[RESOURCE_ENERGY] > 0) { return energy; }
	}
}

Creep.prototype.upgraderPassMeTheEnergy = function() {

	
	if (this.room.controller.level === 8 ) { return false; }
	
	if (this._cache.wantedEnergy === undefined) {	// builder?
		this._cache.wantedEnergy = this.store.getCapacity(RESOURCE_ENERGY) * 0.5
	}

	let wantedEnergy = this._cache.wantedEnergy * 2;
	let linkOnly = false;
	let pushing = false;
	if (this.room.controller.level < 8){				
	//	if (this.room.controller.level >= 5 && this.carry[RESOURCE_ENERGY] > this._cache.wantedEnergy) { linkOnly = true; }
		wantedEnergy = Math.max(this._cache.wantedEnergy, this.store.getCapacity(RESOURCE_ENERGY) * 0.6)
		pushing = true;
	}

	
	let missingEnergy = wantedEnergy - this.carry[RESOURCE_ENERGY]
	if (this.store[RESOURCE_ENERGY] <= wantedEnergy) {
		this.room.visual.text(wantedEnergy, this.pos.x, this.pos.y, {color: 'red', font: 0.5});

		let myEnergySource = this.isNearUpgEnergySource(linkOnly)
		if (myEnergySource) { 
			this.room.visual.circle(this.pos, {fill: 'transparent', radius: 0.50, stroke: 'white'});
			if (pushing) {
				this.withdraw(myEnergySource, RESOURCE_ENERGY);
			}
			return true;
		}

		let nearbyCreeps = this.lookForAdjacentCreeps(1);
		let bestNearbyArm 
		let bestScore = 0;
		let bestSource

		for (let idx in nearbyCreeps) {
			let creep = nearbyCreeps[idx];			
			if (!creep || (creep._memory[C.ROLE] !== 'upgrader' && creep._memory[C.ASSIGNED_ROLE] !== 'roleUpgrader')) { continue; }
			if (creep.id === this.id) { continue; }

			let energySource = creep.isNearUpgEnergySource(linkOnly);
			if (!energySource) { continue; }

			let score = creep.store[RESOURCE_ENERGY] - (creep._armed || 0)
			if (score > bestScore) {
				bestScore = score;
				bestNearbyArm = creep;
				bestSource = energySource
			}
		}

		if (bestNearbyArm) {
			if (!bestNearbyArm._withdrawOk) {
				bestNearbyArm.withdraw(bestSource, RESOURCE_ENERGY);
			}

			bestNearbyArm.transfer(this, RESOURCE_ENERGY)
			bestNearbyArm._armed = missingEnergy;

			this.room.visual.line(this.pos, bestNearbyArm.pos, { color: "blue", lineStyle: "solid" });
			this.room.visual.line(bestNearbyArm.pos, bestSource.pos, { color: "blue", lineStyle: "solid" });		
			return true;
		}
	}



	return false;
}

Creep.prototype.getUpgraderEnergy = function () {
	let role = "getUpgraderEnergy";
	if (!this._cache.linkId) {
		let link = _.filter(this.room.findByType(STRUCTURE_LINK),
			function (structure) {
				return (structure.isController() );
			});
		if (link.length > 0) {
			this._cache.linkId = link[0].id;
		} else {
			this._cache.linkId = -1;
		}
	}

	let upgraderStore = false;
	let link = Game.getObjectById(this._cache.linkId)
	if (link) {
		upgraderStore = true;		
		if (link.energy > 0 && this.pos.isNearTo(link)) {			
			let withdrawResult = this.withdraw(link, RESOURCE_ENERGY)
			if (withdrawResult === OK) {
				this._withdrawOk = true;
				delete this._memory.upEn;
				return true;
			}
		}
	} 

	// container
	if (!this._cache.contId) {
		let container = _.filter(this.room.findByType(STRUCTURE_CONTAINER),
			function (structure) {
				return (structure.isController() );
			});
		if (container.length > 0) {
			this._cache.contId = container[0].id;
		} else {
			this._cache.contId = -1;
		}
	}

	let cont = Game.getObjectById(this._cache.contId)
	if (cont) {
		upgraderStore = true;
		if (this.pos.inRangeTo(cont, 2)) {			
			if (cont.store[RESOURCE_ENERGY] > 0) {
				let withdrawResult = this.withdraw(cont, RESOURCE_ENERGY)
				if (withdrawResult === OK) {
					this._withdrawOk = true;
					delete this._memory.upEn;
					return true;
				}
			}
		}
	}

	if (this.store[RESOURCE_ENERGY] > 0) { return }

	if (this._memory.upEn === undefined) { this._memory.upEn = 0; }

	let waitEnergy = 107
	if (!upgraderStore) {
		waitEnergy = 13;
	}
	
	this._memory.upEn++;

	if (this._memory.upEn > waitEnergy || !upgraderStore) {
		this.getConsumerEnergy(true);
		return ERR_BUSY;
	}
}

Creep.prototype.GCLrefreshTTL = function() {
	if (!PRAISE_GCL_ROOMS[this.room.name])  { return }
	if (this.ticksToLive < 1450) {

		let spawns = this.pos.lookForStructuresAround(STRUCTURE_SPAWN, 1)
		for (let idx in spawns) {
			let spawn = spawns[idx];
			if (spawn && !spawn.spawning && spawn._refreshing !== Game.time ) {
				spawn.renewCreep(this);
				spawn._refreshing = Game.time;
			}
		}		
	}
}

Creep.prototype.roleGCLUpgrader = function() {

	// CHECK IF NEEDING ENERGY
	if (this.carry[RESOURCE_ENERGY] <= this.getActiveBodyparts(WORK)) {
		// WITHDRAW ENERGY

		let containers = this.pos.lookForStructuresAround(STRUCTURE_CONTAINER, 1)
		for (let idx in containers) {
			let container = containers[idx]
			if (container.store[RESOURCE_ENERGY]) {
				this.withdraw(container, RESOURCE_ENERGY);
				break;
			}
		}
	}

	let posIdx = [];
	if (isGCLPraiseRoomStandby(this.room.name) && this.room.name === "E3N17") {
		posIdx = [ "18:20", "17:20", "17:19", "18:19", "19:19", "19:20", "19:21", "19:22", "19:23", "18:23", "18:22", "18:21" ];
	} else  {
		posIdx = [ "42:33", "42:32", "41:32" , "41:31", "42:31", "43:31", "43:32", "43:33", "43:34", "43:35", "42:35", "42:34" ];
	}	
	
	let currPos = posCompress(this.pos);
	let inPosSequence;
	let nextPos;
	let repairing;
	let roomName = this.pos.roomName;
	for (let idx in posIdx) {
	//	console.log("checking pos " + currPos + " to " +  posIdx[idx])
		if (currPos === posIdx[idx]){
			inPosSequence = true;
			let next = Number(idx) + 1;
			if (next >= posIdx.length) {
				repairing = this.repairWhileMoving(1, true);
				nextPos = posDecompressXY(posIdx[0], roomName);
				this.move(this.pos.getDirectionTo(nextPos));
			} else {
				nextPos = posDecompressXY(posIdx[next], roomName);
				
			//	console.log("next pos " + nextPos)
			}
			break;
		}
	}
	// IN POSITION
	// IN RANGE
	if (!repairing && this.pos.getRangeTo(this.room.controller) <= 3) {
		// UPGRADE
		this.upgradeController(this.room.controller);
	}

	let ignore = true;	

	let gclDest;
	if (this.room.memory.GCLmove) {
		if (this.room.memory.GCLmove >= Game.time) {
			gclDest = posLoad(this.room.memory.GCLdest);
			this.room.visual.circle(gclDest, {fill: 'transparent', radius: 0.20, stroke: 'white'});
		} else {
			delete this.room.memory.GCLmove;
			delete this.room.memory.GCLdest;
		}

	}
	if (!inPosSequence || !nextPos) {
		let validPos = []
		for (let idx in posIdx) {
			let pos = posDecompressXY(posIdx[idx], roomName)
		//	if (!pos.isPassible()) { continue; }
			validPos.push(pos)
		//	console.log("dest " + pos)
		}
		nextPos = this.pos.findClosestByRange(validPos);
		this.travelTo(nextPos, {maxRooms:1, range :0, ignoreCreeps: true, stuckValue: 250});
		this.room.visual.line(this.pos, nextPos, { color: "blue", lineStyle: "solid" });		
		if (this.pos.getRangeTo(nextPos) <= 1) {		
			this.room.memory.GCLmove = Game.time + 2;
			this.room.memory.GCLdest = posSave(nextPos);
			this.room.visual.circle(nextPos, {fill: 'transparent', radius: 0.50, stroke: 'red'});
		}

	} else {
		if (this.fatigue === 0) {
			if (!gclDest || !gclDest.isThisPos(nextPos)) {
				this.move(this.pos.getDirectionTo(nextPos));
			} else {
				this.say("come in")				
			}
		}
	}
	
	
};