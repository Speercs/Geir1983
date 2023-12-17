'use strict'

let roleKeeperKiller = {

    /** @param {Creep} creep **/
    run: function(creep) {
				
		creep.roleKeeperKiller();
		
	}
};
module.exports = roleKeeperKiller;

function getLairsToClear(roomName) {
	let room = Game.rooms[roomName]
	let lairs = room.findByType(STRUCTURE_KEEPER_LAIR);
	let minerals = room.getMinerals();

	if (minerals.length === 0) {
		return lairs;
	} 
	let mineral = minerals[0]

	let targets = [];
	for (let idx in lairs) {
		let lair = lairs[idx];
		if (lair.pos.getRangeTo(mineral) <= 5) {
			if ((wantToMineMineral(mineral.mineralType) && (mineral.mineralAmount || mineral.ticksToRegeneration < 300)) || 				
				mineral.pos.lookForStructuresAround(STRUCTURE_ROAD, 4).length > 0 ||
				mineralHasActiveMiners(mineral)
			) {
				targets.push(lair);
			}
		} else {
			if (checkRoomIsActiveMine(roomName)) {
				targets.push(lair);
			}			
		}
	}
	return targets;
}

Creep.prototype.roleCoreSniper = function() {

	registerAttacker(this, this._memory[C.ROOM_TARGET]);

	if (this._memory.appBoosts && this.ticksToLive > 1200) {		
		for (let boost in this._memory.appBoosts) {
			if (this.applyBoost(boost, true)) { return; }
		}
		delete this._memory.appBoosts;
	}

	let targetRoom = this._memory[C.ROOM_TARGET]
	if (this._memory[C.TARGET_POS] === undefined) {
		
		if (Memory.rooms[targetRoom] && Memory.rooms[targetRoom].invaderCore && Memory.rooms[targetRoom].invaderCore.pos) {
			this._memory[C.TARGET_POS] = Memory.rooms[targetRoom].invaderCore.pos;
			this._memory.targetRange = 3;
		} else {
			this._memory[C.TARGET_POS] = posCompress(pullIdlePosForRoom(this._memory[C.ROOM_TARGET]));
			this._memory.targetRange = 0;
		}
	}

	let fleeing;
	if (this.hits < this.hitsMax * 0.85) {
		fleeing = this.fleeFromDamage();
	}

	let target
	let core = Game.getObjectById(this._memory.coreId)
	if (core) {
		target = core;

		let attackTarget = this.getAttackTarget(false, false, undefined, true, undefined, true);
		if (attackTarget && attackTarget.isCreep) {
			target = attackTarget;
		}

		if (!this._memory.sniperPos && this.pos.getRangeTo(core) <= 7) {

			let xStart = limit((core.pos.x) - 3, 0, 49);
			let yStart = limit((core.pos.y) - 3, 0, 49);
			let xEnd = limit((core.pos.x) + 3, 0, 49);
			let yEnd = limit((core.pos.y) + 3, 0, 49);
		
			let sniperPos;
			let bestScore = 0;
			let roomName = core.room.name;
			for (let x=xStart; x<=xEnd; x++) {
				for (let y=yStart; y<=yEnd; y++) {
		
					let posToCheck = new RoomPosition(x, y, roomName);
		
					if (posToCheck.isPassible(true, false)){
		
						let score = posToCheck.scoreSiegePos(true);

						score -= (posToCheck.getRangeTo(this.pos) / 10)
		
						core.room.visual.text(score.toFixed(1), posToCheck.x, posToCheck.y, {color: 'red', font: 0.5});
		
						if (score > bestScore) {
							bestScore = score;
							sniperPos = posCompress(posToCheck);
						}
					}
				}
			}

			this._memory.sniperPos = sniperPos
		}

	} else {
		target = this.getAttackTarget(false, false, undefined, true, undefined, true);
	}

	let targetPos
	let targetRange = this._memory.targetRange
	if (this._memory.sniperPos && core) {
		targetPos = posDecompress(this._memory.sniperPos, targetRoom)
		targetRange = 0;
	} else if (this._memory[C.TARGET_POS] && Memory.rooms[targetRoom] && Memory.rooms[targetRoom].invaderCore ) {
		targetPos = posDecompress(this._memory[C.TARGET_POS], targetRoom)
	} else if (target) {
		targetPos = target.pos.pullSiegeFormationCombat(this)
		targetRange = 0;
	}


	if (!fleeing && (this.room.name !== targetRoom || this.pos.getRangeTo(targetPos) > targetRange)) {
		let travelOptions = {allowSK: true, range: targetRange, roomCallback: raidMatrix}
		this.travelTo(targetPos, travelOptions);
	}

	let rangedAttacking = this.rangedAttackInRange(target);

	if (this.pos.lookForHealReasons(4) > 0 ) {
		this.healInRange(rangedAttacking);
	}
}

global.sniperPos = function(core) {
	if (!core) { return}
	let xStart = limit((core.pos.x) - 3, 0, 49);
	let yStart = limit((core.pos.y) - 3, 0, 49);
	let xEnd = limit((core.pos.x) + 3, 0, 49);
	let yEnd = limit((core.pos.y) + 3, 0, 49);

	let sniperPos;
	let bestScore = 0;
	let roomName = core.room.name;
	for (let x=xStart; x<=xEnd; x++) {
		for (let y=yStart; y<=yEnd; y++) {

			let posToCheck = new RoomPosition(x, y, roomName);

			if (posToCheck.isPassible(true, false)){

				let score = posToCheck.scoreSiegePos(true);

				core.room.visual.text(score.toFixed(1), posToCheck.x, posToCheck.y, {color: 'red', font: 0.5});

				if (score > bestScore) {
					bestScore = score;
					sniperPos = posCompress(posToCheck);
				}
			}
		}
	}

	return sniperPos;
}

Creep.prototype.roleKeeperKiller = function() {	

	if (this._memory[C.TARGET_POS] && this._memory[C.TARGET_POS].roomName) {
		delete this._memory[C.TARGET_POS];
	}

	if (this._memory[C.TARGET_POS] === undefined) {
		this._memory[C.TARGET_POS] = posCompress(new RoomPosition(25,25, this._memory[C.ROOM_TARGET]));
		this._memory.tRm = this._memory[C.ROOM_TARGET];
	}

	let rangedAttacking;
	let attacking;
	let target;

	let moveAsOne = false;
	if (this._memory.guard) {
		let guard = Game.creeps[this._memory.guard]
		if (guard && (guard._memory.RC || this.pos.getRangeTo(guard) <= 3)) {
			moveAsOne = true;
		}
	}
	
	
	if (this.room.name == this._memory[C.ROOM_TARGET]){
			
		if (this._memory[C.TICKS_TO_TARGET] === undefined) { this._memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - this.ticksToLive; }

		let bestTarget = this.pos.getBestNearbyCreepTarget(1);

		if (bestTarget) {

			this.room.visual.circle(bestTarget.pos.x, bestTarget.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'});

			if (bestTarget.getActiveBodyparts(ATTACK) <= 0 && this.attack(bestTarget) === OK) {
				attacking = true;
			}
			if (this.hasBodyparts(RANGED_ATTACK) > 0) {
				rangedAttacking = this.rangedAttackInRange();
			}
		} else {

			let enemies = getEnemyCreeps(this.room.name);

			let nonSk = _.filter(enemies, 
				function(creep) {return (
								creep.owner.username !== "Source Keeper"
								);
					});	

			if (nonSk.length > 0) {
				target = this.pos.findClosestByRange(nonSk, {
					filter: function(object) {
					return (
						//	object.owner.username !== "Source Keeper" &&
							(object.hasBodyparts(ATTACK) > 0 ||
							object.hasBodyparts(RANGED_ATTACK) > 0 || 
							object.hasBodyparts(WORK) > 0 || 
							object.hasBodyparts(HEAL) > 0)
							);
					}});
			//	this.room.visual.circle(target.pos.x, target.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});	
			} else {
				target = Game.getObjectById(this._memory.skTarget);
				
				if (!target) {
					delete this._memory.skTarget;

					let nearbyEnemies = this.pos.lookForEnemyCreepsAround(5);
					target = this.pos.findClosestByRange(nearbyEnemies, {
						filter: function(object) {
						return (object.hasBodyparts(ATTACK) > 0 || 
								object.hasBodyparts(RANGED_ATTACK) > 0);
						}});
					if (target) {
						this.room.visual.circle(target.pos.x, target.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'green'});	
						this._memory.skTarget = target.id;
					}
					
				}
			}

			if (target && this.hits < this.hitsMax * 0.95 && this.pos.getRangeTo(target) > 4 && this.pos.getRangeTo(target) < 7 ){
				if (this.hasBodyparts(RANGED_ATTACK) > 0) {
					rangedAttacking = this.rangedAttackInRange();
				}
				if (target.owner.username !== "Source Keeper" && this.attack(target) === OK) {
					attacking = true;
				}				
				
				let travelOptions = {allowSK:true, range:0}
				if (moveAsOne) {
					this.moveAsOne(this.pos, this._memory.guardActive, travelOptions);
				} 
				/*else {
					this.travelTo(this.pos, travelOptions);
				}*/
			} else if (target) {				
				this._memory[C.TARGET_POS] = posCompress(target.pos);
				this._memory.tRm = target.room.name;	
				if (!this.pos.inRangeTo(target.pos, 1)) {

					let travelOptions = {allowSK:true, range:1}
					if (moveAsOne) {
						this.moveAsOne(target.pos, this._memory.guardActive, travelOptions);
					} else {
						this.travelTo(target.pos, travelOptions);
					}
				} else if (target.owner.username !== "Source Keeper") {
					this.attack(target);
					attacking = true;
				}
				if (this.getActiveBodyparts(RANGED_ATTACK) > 0) {
					rangedAttacking = this.rangedAttackInRange();
				}
			} else {
				if (this._memory.lairs === undefined || this._memory.lairs.length === 0) {
					this._memory.lairs = [];
				//	let lairs = this.room.findByType(STRUCTURE_KEEPER_LAIR);
					let lairs = getLairsToClear(this.room.name);
					lairs.sort( function(l1,l2) { return l1.ticksToSpawn - l2.ticksToSpawn; });
					let length = lairs.length;
					for (let i=0; i < length; i++) {
						this._memory.lairs.push(lairs[i].id);
					}
				}
				let nextLair = Game.getObjectById(this._memory.lairs[0]);
				
				if (nextLair) {
					if ((nextLair.ticksToSpawn === undefined || nextLair.ticksToSpawn > 200) && 
						nextLair.pos.lookForEnemyCreepsAround(5).length === 0
					) {
						this._memory.lairs.splice(0, 1);
					} else if (!this.pos.inRangeTo(nextLair.pos, 1)) {
						this._memory[C.TARGET_POS] = posCompress(nextLair.pos);
						this._memory.tRm = nextLair.room.name;
						if (this.getActiveBodyparts(MOVE) > 0) {

							let travelOptions = {allowSK:true, range:1}
							if (moveAsOne) {
								this.moveAsOne(nextLair, this._memory.guardActive, travelOptions);
							} else {
								this.travelTo(nextLair, travelOptions);
							}
						}
					}
				}
				
			}	
		}
			/*
			let lairs = this.room.findByType(STRUCTURE_KEEPER_LAIR)				
			lairs.sort( function(l1,l2) { return l1.ticksToSpawn - l2.ticksToSpawn; });
			this._memory[C.TARGET_POS] = lairs[0].pos
			this.travelTo(lairs[0], {allowHostile:true, range:1, allowSK:true});
			*/
		
	} else {
		let pos = posDecompress(this._memory[C.TARGET_POS], this._memory.tRm);
		let travelOptions = {allowSK:true, range:1}
		if (moveAsOne) {
			this.moveAsOne(pos, this._memory.guard, travelOptions);
		} else {
			this.travelTo(pos, travelOptions);
		}
		
	}


	let healing;
//	let missingHp = 
	if (!this._memory.guardActive || (this._memory.guard && Game.creeps[this._memory.guard])) {
		let otherCreep = Game.creeps[this._memory.guard];
		if (otherCreep && this.pos.getRangeTo(otherCreep) <= 2) {
			this._memory.guardActive = this._memory.guard;
			otherCreep.memory.RC = 1;
		}
		if (otherCreep) {			
			let rangedRC = otherCreep.rangedAttackInRange(target);
			if (rangedAttacking || attacking || rangedRC || otherCreep.hits < otherCreep.hitsMax){
				healing = true;
				otherCreep.healInRange(rangedRC);
			}
		} else {
			delete this._memory.guardActive;
		}
	}
	

	if (!attacking || this.hits <= (this.hitsMax/3) ){
		if (this.hits <= this.hitsMax/2) {
			this.heal(this);
		}
		else {
			if (this.pos.lookForHealReasons(3) > 0){
				this.healInRange(rangedAttacking);
			}
		}
	}
	
};