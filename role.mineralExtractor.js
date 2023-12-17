'use strict'
let roleMineralExtractor = {

    /** @param {Creep} creep **/
    run: function(creep) {
		if (!creep.defensiveRetreatPath() ) {
			if (!creep.sleep() && !creep.moveToPos() ) {
				creep.roleMineralExtractor();			
			}
		}        
	}
};

module.exports = roleMineralExtractor;





// ROLE MINERAL EXTRACTOR
Creep.prototype.roleMineralExtractor = function () {

	let source = Game.getObjectById(this._memory[C.SOURCE_ID]);	

	if (this._memory.sum === undefined) { this._memory.sum = 0; }
	let result;
		
	let targetPos;
	let range = 1;
	let rangeToSource = Infinity;
	if (source) {	
		rangeToSource = this.pos.getRangeTo(source)
		if (rangeToSource < 4 || this._cache.tPos) {
			targetPos = source.pos.pullSiegeFormation(this.pos);
			range = 0;
			this._cache.tPos = posSave(targetPos)
			if (source.memory.miners === undefined) { source.memory.miners = {}; }
			source.memory.miners[this.id] = {};
		} else {
			targetPos = source.pos;
		}
	}
			


	if (source && rangeToSource <= 1) {
		if (source.cooldown) {	// deposit
			this.sleep(source.cooldown-2);
			return;
		} else if (source.memory.cd) {
			if (Game.time < source.memory.cd) {
				let duration = source.memory.cd - Game.time;
				if (duration < EXTRACTOR_COOLDOWN) {
					this.sleep(source.memory.cd - Game.time);
					return;
				}
			} else {
				delete source.memory.cd;
			}				
		}

		let harvestPower = this.getHarvestPower()
		if (this.sumCarry + harvestPower <= this.carryCapacity) {

			if (SEASONAL_THORIUM && source.mineralType === RESOURCE_THORIUM) {

				if (!source._minedAmount) { source._minedAmount = 0;}

				let mineralsLeft = source.mineralAmount;
				if (mineralsLeft - source._minedAmount - harvestPower <= 0) {
					log(this.room.name + " abort mining thorium! minerals left " + mineralsLeft + " my power " + harvestPower)					
					result = ERR_NOT_ENOUGH_RESOURCES
				} else {
					result = this.harvest(source);
					if (result === OK) {
						source._minedAmount += harvestPower;
					}
				}
			} else {
				result = this.harvest(source);
			}
		} else {
			result = ERR_FULL;
			this._cache.delayed = Game.time;
		}
	} else {
		result = ERR_NOT_IN_RANGE;
	}


	if (result === ERR_NOT_IN_RANGE || (targetPos && this.pos.getRangeTo(targetPos) > 0)) {
		this._memory[C.STARTED] = false;

		if (source) {
			if (this._memory[C.RESOURCE_TYPE] === undefined) { this._memory[C.RESOURCE_TYPE] = source.mineralType || source.depositType; }
		}
		
		if (targetPos) {
			//
		} else if (Memory.deposits[this._memory[C.ROOM_TARGET]] && Memory.deposits[this._memory[C.ROOM_TARGET]].deposit && Memory.deposits[this._memory[C.ROOM_TARGET]].deposit[this._memory[C.SOURCE_ID]] ) {
			targetPos = Memory.deposits[this._memory[C.ROOM_TARGET]].deposit[this._memory[C.SOURCE_ID]].pos
		} else if (Memory.rooms[this._memory[C.ROOM_TARGET]] && Memory.rooms[this._memory[C.ROOM_TARGET]].mineral && Memory.rooms[this._memory[C.ROOM_TARGET]].mineral[this._memory[C.SOURCE_ID]]){
			targetPos = posDecompressXY(Memory.rooms[this._memory[C.ROOM_TARGET]].mineral[this._memory[C.SOURCE_ID]].pos, this._memory[C.ROOM_TARGET]);
		} else {
			targetPos = pullIdlePosForRoom(this._memory[C.ROOM_TARGET])
		}	

		if (this._memory.engine || this._memory[C.WAGON_WEIGHT]) {
			let engine = Game.getObjectById(this._memory.engine);
			if (!engine) { return; }
			engine.engine(this, targetPos);
		} else {
			this.travelTo(targetPos, { allowSK: true, range: range, roomCallback: avoidSKcreeps, maxOps: 60000 });
		}

	} else if (result === OK || result === ERR_FULL) {
		if (this._memory[C.TICKS_TO_TARGET] === undefined) { this._memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - this.ticksToLive; }
		this._memory[C.STARTED] = true;

		clearOldExtractors(source);
		if (source.mineralType) {
			this.sleep(EXTRACTOR_COOLDOWN);
			source.memory.cd = Game.time + EXTRACTOR_COOLDOWN;
		} 

		if (this._memory.engine && this.pos.getRangeTo(targetPos) === 0) {
			let engine = Game.getObjectById(this._memory.engine);
			if (!engine) { return; }

			if (this.room.name !== this._memory[C.ROOM_ORIGIN]) {
				engine.recycleOrSuicide()
			}

			delete engine._memory.wagonId;
			delete engine._memory.engineStarted;
			delete engine._memory.wagonDestRoom;

			delete this._memory.engine;
		}
		
	} else if (result === ERR_NOT_ENOUGH_RESOURCES) {
		this.recycleOrSuicide();
		console.log(this.room.name + " killing mineral extractor, mineral empty! " + this.name);
		
		let sourceId = this._memory[C.SOURCE_ID];
		let haulers = this.room.find(FIND_MY_CREEPS, {
			filter: function(object) {
			return (object.memory[C.ROLE] === "mineralMover" &&
					object.memory[C.SOURCE_ID] === sourceId);
				}});
		for (let idx in haulers) {
			let hauler = haulers[idx]
			if (hauler.sumCarry > 0) {
				hauler.memory[C.WORK] = 1;
			} else {
				hauler.recycleOrSuicide();
			}
		}

	} else {
	//	this.sleep(5);
		console.log(this.room.name + " roleMineralExtractor error " + result);
	}
};

Creep.prototype.moveToPos = function() {
	if (!this._cache.tPos) { return false; }
	let targetPos = this._cache.tPos


	if (!targetPos){ return false; }

	

	if (this.pos.getRangeTo(targetPos) > 0) {
		this.room.visual.line(this.pos, targetPos, { color: "blue", lineStyle: "solid" });
		if (this._memory.engine) {
			let engine = Game.getObjectById(this._memory.engine);
			if (!engine) { return; }
			engine.engine(this, targetPos);
		} else {
			this.travelTo(targetPos, { allowSK: true, range: 0, roomCallback: avoidSKcreeps });		
		}				
	} else {
		this.room.visual.circle(this.pos.x, this.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'});
	}
}

function clearOldExtractors(source) {

	if (source._clearTs === Game.time) { return; }
	source._clearTs = Game.time;

	let roomName = source.room.name;
	if (!Memory.rooms[roomName] || !Memory.rooms[roomName].mineral || !Memory.rooms[roomName].mineral[source.id]) { return; }

	let maxExtractors = Memory.rooms[roomName].mineral[source.id].minePos || 1;
	if (source.memory.miners === undefined) { return; }
	let currentExtractors = Object.keys(source.memory.miners).length || 0;

	if (currentExtractors <= maxExtractors) { return; }

	let lowTtl = Infinity;
	let lowMiner; 
	for (let id in source.memory.miners) {
		let miner = Game.getObjectById(id);
		if (!miner) {
			delete source.memory.miners[id];

			if (Object.keys(source.memory.miners).length <= 0) { delete source.memory.miners; }

			return;
		}
		if (miner.ticksToLive < lowTtl) {
			lowTtl = miner.ticksToLive;
			lowMiner = miner;
		}
	}

	if (lowMiner) {
		lowMiner.suicide();
	}
}