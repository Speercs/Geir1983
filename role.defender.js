'use strict'
let roleDefender = {

	/** @param {Creep} creep **/
	run: function (creep) {

		if (creep._memory.boost && creep.ticksToLive > 1400) {
			if ((!creep.room.memory.hostiles || !creep.room.memory.hostiles.power) && !creep._memory.PRCL) {
				//Prespawned
				creep.idleOffRoad()
				return;
			}

			for (let boost in creep._memory.appBoosts) {
				if (creep.applyBoost(boost, true)) { return; }
			}
			
			delete creep._memory.boost;
			delete creep._memory.appBoosts;
		} 

		if (roomIsSafeModed(creep._memory[C.ROOM_TARGET])) {
			creep.roleInvaderKiller(creep.room.name);
			return;
		}

		if (creep._memory.PRCL ){
			if (creep._memory[C.TICKS_TO_TARGET] === undefined && creep.room.name === creep._memory[C.ROOM_TARGET]) {
				creep._memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - creep.ticksToLive;
			}

			if (creep.room.name === creep._memory[C.ROOM_TARGET] && getRoomPRCL(creep.room.name) < 3 ) {				
				creep.roleInvaderKiller(creep.room.name);

				if (!creep.room.memory.hostiles && !creep.room.memory.sieged && Game.time % 5 === 0 && isOutsideWalls(creep.pos)) {
					creep._memory.travelInTicks = Game.time + 5;
					creep._memory[C.TARGET_POS] = posSave(creep.room.controller.pos);
					creep.travelTo(creep.room.controller.pos, { range: 5, roomCallback: avoidSKcreeps })
				}

				return;			
			} else if (creep.room.name != creep._memory[C.ROOM_TARGET] || isOutsideWalls(creep.pos) ){
				let dest = posDecompress(Memory.rooms[creep._memory[C.ROOM_TARGET]].controller.pos, creep._memory[C.ROOM_TARGET]);
				creep.travelTo(dest, { roomCallback: avoidSKcreeps })
				
				if (creep._memory.ranged) {
					creep.rangedAttackInRange();
				} else {
					creep.meleeAttackInRange();
				}
				
				creep._memory.travelInTicks = Game.time + 5;				
				return;
			} else {
				
			}
		}

		if (creep.timeToHeadBackForUnBoost() && creep.unBoost()) {
			delete creep._memory.active;
			return;
		}

		if (creep.refreshTTLdefender() ) {
			delete creep._memory.active;
			return;
		}

		
		creep._memory.active = 1;

		creep.roomDefender();
	}
};

module.exports = roleDefender;

Room.prototype.assignDefenders = function () {

	let defenders = this.find(FIND_MY_CREEPS, {
		filter: function (object) {
			return (object.memory[C.ROLE] === 'defender' && object.memory.active);
		}
	});

	if (defenders.length === 0) { return 0; }
	let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);

	let assignedRamparts = {};
	let assignedDefenders = [];
	if (defenders.length > 1 || this.memory.hostiles === undefined) {
		// FIND LOWEST WALL/RAMPART AND PARK ON IT
		let walls = this.findByType(STRUCTURE_RAMPART);
		if (walls.length > 0) {
			let lowWall;
			let lowWallHp = Infinity;
			for (let idx in walls) {
				let wall = walls[idx];
				if (wall.hits > 10000 && wall.hits < lowWallHp && !isOutsideWalls(wall.pos)) {

					if (!bordersToOutsidePixel(wall.pos, segmentOOB)) { continue; }
					lowWallHp = wall.hits;
					lowWall = wall;
				}
			}

			if (lowWall && lowWall.pos.isPassible(true)) {
				let csite = lowWall.pos.lookFor(LOOK_CONSTRUCTION_SITES)
				if (!csite.length || !OBSTACLE_OBJECT_TYPES.includes(csite[0].structureType) ){
					let targetWall = lowWall;
					assignedRamparts[targetWall.id] = {};
					let closestDefender = targetWall.pos.findClosestByRange(defenders);
					if (closestDefender) {
						closestDefender.memory.rampartId = targetWall.id;
						this.visual.line(closestDefender.pos, targetWall.pos, { color: "blue", lineStyle: "solid" });
						this.visual.circle(targetWall.pos, { fill: 'transparent', radius: 0.50, stroke: 'blue' });
						assignedDefenders.push(closestDefender);
						defenders = _.difference(defenders, assignedDefenders);
						//	console.log("assigning defender " + closestDefender + " to low rampart ")
					}
				}				
			}
		}
	}

	/*
	defenders.sort(
		function (a, b) { return a.body.length - b.body.length });
		*/

	if (this.memory.hostiles) {
		let enemySquads = this.getEnemySquads();

		enemySquads.sort(
			function (a, b) { return b.length - a.length });

		let maxIterations = enemySquads.length * defenders.length;
		let iterations = 0;
		
		while (defenders.length > 0) {
			let hostiles = enemySquads[iterations % enemySquads.length];
			let target;

			// FIND HOSTILE WITH MOST ADJACENT RAMPARTS		
			let bestTarget;
			let mostRamps = 0;
			for (let idx in hostiles) {
				let enemyCreep = hostiles[idx];
			//	this.visual.line(defender.pos, enemyCreep.pos, { color: "green", lineStyle: "solid" });
				let nearbyRamparts = enemyCreep.pos.lookForStructuresAround(STRUCTURE_RAMPART, 1);
				if (nearbyRamparts.length > mostRamps) {
					mostRamps = nearbyRamparts.length;
					bestTarget = enemyCreep;
				}
			}

			if (bestTarget) {
				target = bestTarget;
			//	defender.memory.targetId = target.id;
			} else if (hostiles && hostiles.length > 0) {
				target = hostiles[0];
			}

			if (target) {
				
				let defender;
				let bestRange = Infinity;
				let bestDefenderScore = -9999;
				for (let idx in defenders) {
					let defenderScore = 0;
					let curDefnder = defenders[idx];					
					defenderScore += (50 - curDefnder.pos.getRangeTo(target)) / 10;
					defenderScore += (calcSingleCreepStrength(curDefnder).strength / 750);
					if (defenderScore > bestDefenderScore) {
						bestDefenderScore = defenderScore;
						defender = curDefnder;
					//	this.visual.text(iterations, bestRampart.pos, { color: "red", font: 0.8 });
					}
				}

				this.visual.line(defender.pos, target.pos, { color: "red", lineStyle: "solid" });
				defender.memory.targetId = target.id;

				

			//	if (defender.pos.getRangeTo(target) >= 1) {
					let thisPos = defender.pos;
                    let bestRampart
                    bestRange = Infinity;
                    let bestAttack = 0;
                    let possibleRamparts = target.pos.lookForStructuresAround(STRUCTURE_RAMPART, 10);
                    for (let idx in possibleRamparts) {
						let rampart = possibleRamparts[idx]
						if (rampart.hits < 5000) { continue; }
						if (assignedRamparts[rampart.id]) { continue; }
						if (!rampart.pos.isPassible(true) ) { continue; } 					
						let csite = rampart.pos.lookFor(LOOK_CONSTRUCTION_SITES)
						if (csite.length && OBSTACLE_OBJECT_TYPES.includes(csite[0].structureType) ) { continue; }
                        let range = rampart.pos.getRangeTo(target);
                        if (range < bestRange) {
                            bestRampart = rampart;
                            bestRange = range;
                            bestAttack = rampart.pos.lookForEnemyCreepsAround(1).length;
                        } else if (range === bestRange) {
                            let possibleAttacks = rampart.pos.lookForEnemyCreepsAround(1).length;
                            if (possibleAttacks > bestAttack) {
                                bestRampart = rampart;
                                bestAttack = possibleAttacks;
                            }
                        }
                    }

                    if (bestRampart) {
					//	this.visual.line(defender.pos, bestRampart.pos, { color: "green", lineStyle: "solid" });
					//	this.visual.text(iterations, bestRampart.pos, { color: "red", font: 0.8 });
						defender.memory.rampartId = bestRampart.id;
						assignedRamparts[bestRampart.id] = {};
					} 

					
			//	}
				assignedDefenders.push(defender);
				//	console.log("assigning defender " + defender)
				defenders = _.difference(defenders, assignedDefenders);
			}
			iterations++;
			if (iterations > maxIterations) {
				log(this.name + " assignDefenders no targets??")
				break;
			}
		}
	}

	this._cache.defenderTs = Game.time + 3;
}


Creep.prototype.roomDefender = function () {

	// FIND HOSTILE	
	if (this.room.controller && 
		(this.memory.rampartId == undefined || this.room._cache.defenderTs === undefined || Game.time > this.room._cache.defenderTs)
	){
		this.room.assignDefenders();
	}

	// MOVE TO RAMPART
	let rampart = Game.getObjectById(this.memory.rampartId);
	if (!rampart) {
		delete this.memory.rampartId;
	}

	if (rampart) {
		this.room.visual.circle(rampart.pos, { fill: 'transparent', radius: 0.50, stroke: 'red' });
		if (this.pos.getRangeTo(rampart) > 0) {

			if (isOutsideWalls(this.pos)) {
				this.travelTo(rampart, { range: 0 });
			} else {
				let ignoreRoads = this.canIgnoreRoads();
				this.travelTo(rampart, { showPath: 1, maxRooms: 1, range: 0, ignoreRoads: ignoreRoads, ensurePath: true, roomCallback: getWallLimitMatrix });
			}			
		}
	} else {
		let target = Game.getObjectById(this.memory.targetId);
		if (target) {
			if (isOutsideWalls(this.pos)) {
				this.travelTo(target, { range: 0 });
				//	this.say("out?")
			} else if (isOutsideWalls(target.pos)) {
				//	this.say("in?")

			}
		} else {
			if (isOutsideWalls(this.pos) || this.memory.travelInTicks) {

				if (this.memory.travelInTicks === undefined) {
					this.memory.travelInTicks = Game.time + 5;
				} else if (Game.time > this.memory.travelInTicks) {
					delete this.memory.travelInTicks;
				}
				
				if (this.room.controller) {
					this.travelTo(this.room.controller, { range: 1 });
				}
			}
			delete this.memory.targetId;
		}
	}

	// ATTACK IN RANGE
	if (this.getActiveBodyparts(ATTACK) > 0) {
		this.meleeAttackInRange();
	}

	// ATTACK IN RANGE
	if (this.getActiveBodyparts(RANGED_ATTACK) > 0) {
		this.rangedAttackInRange();
	}

};