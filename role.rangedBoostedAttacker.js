'use strict'
let roleRangedBoostedAttacker = {

    /** @param {Creep} creep **/
    run: function(creep) {
		
	
		if (!creep._memory.healer && Game.time % 19 === 1) {
			let follow = creep.room.find(FIND_MY_CREEPS, {
				filter: function(object) {
                return (object.memory.follow === creep.name)
					}});
			if (follow.length > 0) {
				creep._memory.healer = follow[0].name
			}	
		}
		
		if (creep._memory.boost) {
			if( creep.applyBoost(T3_MOVE, true) ) { return }
			if( creep.applyBoost(T3_TOUGH, true) ) { return }
			if( creep.applyBoost(T3_RANGED_ATTACK, true) ) { return } 
			delete creep._memory.boost
		}
		
        creep.RangedBoostedAttacker()
		
	}
};
module.exports = roleRangedBoostedAttacker;

Creep.prototype.RangedBoostedAttacker = function() {
	// RETREAT
	if (this.hits < this.hitsMax / 2) {
		let targetPos = pullIdlePosForRoom(this._memory[C.ROOM_ORIGIN]);
		this.moveAsOne(targetPos, this._memory.healer, {range: 5, ignoreCreeps: false, moveAsOne: Game.creeps[this._memory.healer]  })
	}
	let target;
	// CHECK ROOM 
	if (this.room.name !== this._memory[C.ROOM_TARGET]) {
		let targetPos = pullIdlePosForRoom(this._memory[C.ROOM_TARGET]); 
		this.moveAsOne(targetPos, this._memory.healer, {range:5 ,moveAsOne: Game.creeps[this._memory.healer]})
	} else {
		// FIND HOSTILE
		let hostiles = getEnemyCreeps(this._memory[C.ROOM_TARGET])
		target = this.pos.findClosestByRange(hostiles)

		if (!target) {
			let enemyStructures  = getEnemyStructures(this.room.name);
			/*
			let enemyStructures = this.room.find(FIND_STRUCTURES, {
					filter: (structure) => {
					return (structure.structureType != STRUCTURE_CONTROLLER
					)}}); 
			*/
			target = this.pos.findClosestByRange(enemyStructures)	

		}

		// MOVE AS ONE
		if (target) {
			let range = this.pos.getRangeTo(target)
			if (this.pos.getRangeTo(target) > 1) {
				if (this.room.memory.myRoom && this.room.memory.hostiles) {
					this.moveAsOne(target, this._memory.healer, {maxRooms: 1, range:1, ignoreCreeps: false, roomCallback: getWallLimitMatrix, moveAsOne: Game.creeps[this._memory.healer] })
				} else {
					this.moveAsOne(target, this._memory.healer, {maxRooms: 1, range:3, ignoreCreeps: false, moveAsOne: Game.creeps[this._memory.healer] })
				}	
			
			} else if (range < 3) {
				// KITE
			//	let kitePos = this.kiteAsOne(3, this._memory.healer);
				
				let kitePos = this.defensiveRetreatPath({kite: true, returnPos: true })
				/*
				if (kitePos) {
					this.moveAsOne(target, this._memory.healer, {range:0, ignoreCreeps: false })
				}*/
			}
		} else {
			let targetPos = pullIdlePosForRoom(this._memory[C.ROOM_TARGET]); 
		//	this.moveAsOne(targetPos, this._memory.healer, {maxRooms: 1, range:3, ignoreCreeps: false })
		}
	} 	
	
	this.rangedAttackInRange(target);
	
}

//this is the borrowed flee action
//let rooms = require('rooms');

Creep.prototype.kiteAsOne = function(range, follower) {
	let nearCreeps = this.pos.findInRange(FIND_HOSTILE_CREEPS, range-1, {filter: i => i.getActiveBodyparts(ATTACK) > 0 || i.getActiveBodyparts(RANGED_ATTACK) > 0});
	
	if(nearCreeps.length > 0) {
		let ret = PathFinder.search(this.pos, _.map(nearCreeps, i => ({pos: i.pos, range: range})), { maxRooms: 1, flee: true, roomCallback: global.createCostMatrix() })
			
		if(ret.path.length) { 
		//	this.moveTo(ret.path[0]);
			this.move(this.pos.getDirectionTo(ret.path[0]))
			
			
			
			follower.move(follower.pos.getDirectionTo(this.pos));
			return ret.path[0]
		//	return true; 
		} 
	} 
	return false; 
}
global.createCostMatrix = (roomName) => {
	let cm = new PathFinder.CostMatrix(); 
	Game.rooms[roomName].find(FIND_CREEPS).forEach(i => cm.set(i.pos.x, i.pos.y, 255));
	Game.rooms[roomName].find(FIND_STRUCTURES).forEach(i => { 
		if(i.structureType != STRUCTURE_ROAD && i.structureType != STRUCTURE_CONTAINER) { 
			cm.set(i.pos.x, i.pos.y, 255); 
		//	Game.rooms[roomName].visual.circle(i.pos.x, i.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'}) 
		} 
	}); 
	return cm; 
}


