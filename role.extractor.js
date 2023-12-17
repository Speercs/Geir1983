'use strict'
let roleExtractor = {

    /** @param {Creep} creep **/
    run: function(creep) {
        
		if (creep.defensiveRetreatPath() && !creep.extractorInPlaceAndSafe() ) { 			
			return;
		}
		
		if (creep.sleep() ) { return }
		creep.roleExtractor()
		
	}
};

module.exports = roleExtractor;


// ROLE EXTRACTOR
Creep.prototype.roleExtractor = function () {
	let source = Game.getObjectById(this._memory[C.SOURCE_ID]);		
	
	if (source && this._cache.containerId === undefined) {

		let pos = source.getHarvesterPos(this._memory[C.ROOM_ORIGIN]);
		this._cache.containerPos = posCompress(source.getHarvesterPos(this._memory[C.ROOM_ORIGIN]));
		this._cache.cRm = source.room.name;
		let target = _.filter(pos.lookFor(LOOK_STRUCTURES),
			function (c) {
				return (c.structureType === STRUCTURE_CONTAINER);
			});
		if (target.length > 0) {
			//	console.log(target)
			this._cache.containerId = target[0].id;
		}
	}

	

	let result = ERR_NOT_IN_RANGE;
	if (!source) {
		result = ERR_INVALID_TARGET;
	} else if (!this.pos.inRangeTo(source, 2)) {
		this._memory[C.TICKS_TO_TARGET]++;
	} else {
		source._cache.extractorTs = Game.time + Math.min(55, this.ticksToLive);

		if (source.energy > 0) {

			let building
			if ((this._cache.buildId || !isCpuLimited() ) && this.store[RESOURCE_ENERGY] > 25 && ((source.energy / source.energyCapacity) < (source.ticksToRegeneration / ENERGY_REGEN_TIME))) {
						
				let _building = Game.getObjectById(this._cache.buildId);
				if (!_building) {
					
					delete this._cache.buildId; 		
					let buildRange = 3;
					let delaySearch = 5;
					if (isCpuLimited()) { 
						buildRange = 1
						delaySearch = 50;
					}
	
					let buildId = this.repairWhileMoving(buildRange, true, true, delaySearch);
					if (buildId && buildId !== 1) {
						building = true;
						this._cache.buildId = buildId;
						source._cache.containerConstructing = this._cache.buildId;
					}
				} else {
					this.build(_building);
					building = true;
					source._cache.containerConstructing = this._cache.buildId;
				}
			}


			if (!building && !this.repairContainer()) {

				if (!this._cache.harvestPower) {
					this._cache.harvestPower = this.hasBodyparts(WORK) * HARVEST_POWER;
					source._cache.harvestPower = this._cache.harvestPower;
				}

				let cntr = Game.getObjectById(this._cache.containerId)
				if (cntr && cntr.store[RESOURCE_ENERGY] + this._cache.harvestPower > 2000 && cntr.hits > 240000 && source.energy < this._cache.harvestPower * source.ticksToRegeneration) {
					return;
				}

				result = this.harvest(source);
			} else {
				result = ERR_BUSY;
			}
		} else {
			result = ERR_NOT_ENOUGH_RESOURCES;
		}
	}

	if (result == ERR_NOT_IN_RANGE) {
		let wait = 0;
		if (this.pos.inRangeTo(source, 2)) {
			let pos = source.getHarvesterPos(this._memory[C.ROOM_ORIGIN]);
			let me = this.name;
			let mySourceId = this._memory[C.SOURCE_ID];
			let curExtractor = _.filter(pos.lookFor(LOOK_CREEPS),
				function (c) {
					return (c.my && c.memory[C.ROLE] === 'extractor' &&
					c.memory[C.SOURCE_ID] === mySourceId &&
						c.name !== me);
				});
			if (curExtractor.length > 0) {
				curExtractor[0].recycleOrSuicide();
			}
		}
		if (wait === 0) {
			let pos;
			if (this._cache.containerId && Game.getObjectById(this._cache.containerId)){
				pos = Game.getObjectById(this._cache.containerId).pos;
			} else {
				pos = posDecompress(this._cache.containerPos, this._cache.cRm);
			}
			
			this.travelTo(pos, { allowSK: true, range: 0, roomCallback: avoidSKcreeps });
		}
	}
	else if (result == OK) {	
		if (!this._memory[C.TICKS_TO_TARGET]) { 
			this._memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - this.ticksToLive; 
		}
		if (this._cache.containerId != undefined) {
			let container = Game.getObjectById(this._cache.containerId);
			if (!container) { 
				delete this._cache.containerId;
				return;
			}
			let containerPos = container.pos;
			if (this.pos.x !== containerPos.x || this.pos.y !== containerPos.y) {			
				container = Game.getObjectById(this._cache.containerId);
				if (container) {
					this.travelTo(container, { allowSK: true, range: 0 });
				} else {
					delete this._cache.containerId;						
				}
			} else if (ENABLE_SOURCE_EXTENSIONS && this.depositToExtensions(source)) {
				// depositing
				return;
			} else {
				this.depositToLink();
				
			}

		} else {
			if ((this.store[RESOURCE_ENERGY] > 10 || Math.random() > 0.95) && 
				((this.room.controller && (!this.room.controller.my || getRoomPRCL(this.room.name) >= 2)) || !this.room.controller)) {
				
				let pos = posDecompress(this._cache.containerPos, this._cache.cRm);
				

				let csites = pos.findInRange(FIND_CONSTRUCTION_SITES, 0, {
					filter: (structure) => {
						return (structure.structureType == STRUCTURE_CONTAINER);
					}
				});

				/*
				if (csites.length === 1) {
					source._cache.containerConstructing = csites[0].id
					this._cache.buildId = csites[0].id;
					this.build(csites[0]);
					return;
				}*/

				if (csites.length === 0) {

					/*
					if (remotesConstructingContainers(this._memory[C.ROOM_ORIGIN], this._memory[C.SOURCE_ID]) <= 0) {
						Game.rooms[this.pos.roomName].createConstructionSite(pos, STRUCTURE_CONTAINER);
					}*/
					
					if (Game.rooms[this.pos.roomName]._cache.createdSourceContainer !== Game.time &&
						roadBuiltStatus(this._memory[C.ROOM_ORIGIN], source.id) >= 0.75 && 
						getRoomPRCL(this._memory[C.ROOM_ORIGIN]) >= 3 && 
						constructingStructures(this.room.name, STRUCTURE_CONTAINER) <= 0
					) {
						Game.rooms[this.pos.roomName]._cache.createdSourceContainer = Game.time;
						Game.rooms[this.pos.roomName].createConstructionSite(pos, STRUCTURE_CONTAINER);
					}
				}
			}
		}		
	}
	else if (result == ERR_INVALID_TARGET) {
		//	console.log(this + "harvest error " + result)
		if (this._memory[C.ROOM_TARGET] != undefined) {
			if (Memory.rooms[this._memory[C.ROOM_TARGET]] &&
				Memory.rooms[this._memory[C.ROOM_TARGET]].sources &&
				Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]] &&
				Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]].pos) {
				let pos = posDecompress(Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]].pos, this._memory[C.ROOM_TARGET]);

				//	let pos = new RoomPosition(Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]].pos.x, Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]].pos.y , this._memory[C.ROOM_TARGET]) 	
				this.travelTo(pos, { allowSK: true, range: 1 });
			}
			else {
				let dest = pullIdlePosForRoom(this._memory[C.ROOM_TARGET]);
				this.travelTo(dest, { allowSK: true, range: 3 });
			}
		}
	}
	else if (result == ERR_NOT_ENOUGH_RESOURCES) {

		if (ENABLE_SOURCE_EXTENSIONS) {
			source.pos._cache.craneTs = Game.time + source.ticksToRegeneration + 35;
		}

		
		if (this.carry[RESOURCE_ENERGY] > 0) {

			let allowBuild = false;
			let range = 1;
			if (Game.cpu.bucket > 1500 || BOT_MODE) {
				allowBuild = true;
				range = 3
			}

			let buildId = this.repairWhileMoving(range, true, allowBuild, 50);
			if (buildId && buildId != 1) {
				this._cache.buildId = buildId;
			//	log("storing build id " + buildId)
			} else {
				if (ENABLE_SOURCE_EXTENSIONS) {
					this.depositToExtensions(source)
				}
			}
		} else{
			if (ENABLE_SOURCE_EXTENSIONS) {
				this.depositToExtensions(source)
			}	
		}
		
	}
};

global._remotesConstructingContainers = {}
function remotesConstructingContainers(spawner, sourceId) {



	let containers = constructingStructures(spawner, STRUCTURE_CONTAINER);
	if (containers > 0) { return containers}

	for(let room in Memory.rooms[spawner].remoteMineOps) {
		containers += constructingStructures(room, STRUCTURE_CONTAINER);
		if (containers > 0) { return containers}
	}
	return containers;

}