'use strict'
let roleExtractorAdd = {

    /** @param {Creep} creep **/
    run: function(creep) {
		if (creep.sleep() ) { return }
		creep.roleExtractorAdd()		
	}
};

module.exports = roleExtractorAdd;


// ROLE EXTRACTOR (ADDITIONAL FOR LOW LEVELS)
Creep.prototype.roleExtractorAdd = function () {
	let source = Game.getObjectById(this._memory[C.SOURCE_ID]);
	let result = ERR_NOT_IN_RANGE;
	if (source && this.pos.inRangeTo(source, 1)) {

		let mainHarvestPower = source._cache.harvestPower || 1;
		if (source.energy > 0 && (source.energyCapacity / mainHarvestPower) > ENERGY_REGEN_TIME) {
			result = this.harvest(source);
		} else {
			result = ERR_NOT_ENOUGH_RESOURCES;
		}
	}
	if (result == ERR_NOT_IN_RANGE) {

		let dest;
		if (source) {
			dest = source.pos
		} else {
			if (Memory.rooms[this._memory[C.ROOM_TARGET]] && Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]]) {
				dest = posDecompress(Memory.rooms[this._memory[C.ROOM_TARGET]].sources[this._memory[C.SOURCE_ID]].pos, this._memory[C.ROOM_TARGET])
			}
		}

		let ignoreCreeps = true;
		if (source && this.pos.getRangeTo(source) <= 2) {
			ignoreCreeps = false;
		}
		this.travelTo(dest, { range: 1, ignoreCreeps: ignoreCreeps });
	}
};