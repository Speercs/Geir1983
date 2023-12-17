'use strict'
let roleRangedAttacker = {

    /** @param {Creep} creep **/
    run: function(creep) {
	  
		
        /*
		if( creep.applyBoost(T3_MOVE, true) ) { return; } 
		if( creep.applyBoost(T3_TOUGH, true) ) { return; } 		
		if( creep.applyBoost(T3_HEAL, true) ) { return; } 
		if( creep.applyBoost(T3_RANGED_ATTACK, true) ) { return; } 
		*/

		registerAttacker(creep, creep._memory[C.ROOM_TARGET]);		

		if (BOT_MODE && !creep._memory.pita && creep.groupBeforeAttack() ) {
			creep.say("g-" + creep._memory[C.ROOM_TARGET] )
			let rangedAttacking;
			if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
				rangedAttacking = creep.rangedAttackInRange();
			}

			if (creep.getActiveBodyparts(HEAL) > 0 && creep.pos.lookForHealReasons(4) > 0 )  {
				creep.healInRange(rangedAttacking);
			}

			if (creep._memory.grouped && creep.room.memory.hostiles) {
				creep.roleInvaderKiller(creep._memory.groupRoom);
			}
			return;
		} else if (creep._memory.pita) {
			creep.pitaSwitchTarget()
		}

	//	creep._memory[C.ROOM_TARGET] = "E13S5"
		if (BOT_MODE && creep.ticksToLive < 100 && !Memory.rooms[creep.room.name].hostiles && !creep._memory.kamikaze) {
			creep._memory.kamikaze = 1;
			let roomToTarget = [];
			findClosestHostileBase(creep._memory[C.ROOM_TARGET], roomToTarget);
			if (roomToTarget.length > 0) {
				console.log(creep + " in " + creep._memory[C.ROOM_TARGET] + " found kamikaze target " + roomToTarget[0]);
				creep._memory[C.ROOM_TARGET] = roomToTarget[0];
			}
		}

		if (creep.pos.roomName !== creep._memory[C.ROOM_TARGET] && 
			(Memory.rooms[creep.pos.roomName] && !Memory.rooms[creep.pos.roomName].hostileRoom)) {
			if (creep._memory.wait === undefined) { creep._memory.wait = 15; }
			creep._memory.roomFallback = creep.room.name;
		}

		if (creep._memory.enemySpottedPos) {
			let posInRoom = creep._memory.enemySpottedPos;
			if (posInRoom && posInRoom.roomName !== creep._memory[C.ROOM_TARGET]) {
				delete creep._memory.enemySpottedPos;
			}
		}

		if (creep._memory.enemySpottedPos === undefined) {
			
			if (Memory.rooms[creep._memory[C.ROOM_TARGET]] && Memory.rooms[creep._memory[C.ROOM_TARGET]]._breachPos) {
				creep._memory.enemySpottedPos = posSave(posDecompressXY(Memory.rooms[creep._memory[C.ROOM_TARGET]]._breachPos, creep._memory[C.ROOM_TARGET]));
			} else if (Memory.rooms[creep._memory[C.ROOM_TARGET]] && Memory.rooms[creep._memory[C.ROOM_TARGET]]._wallTargetPos) {				
				creep._memory.enemySpottedPos = posSave(posDecompressXY(Memory.rooms[creep._memory[C.ROOM_TARGET]]._wallTargetPos, creep._memory[C.ROOM_TARGET]));
			} else if (Memory.rooms[creep._memory[C.ROOM_TARGET]] && Memory.rooms[creep._memory[C.ROOM_TARGET]]._waitPosTowerDrain && Memory.rooms[creep._memory[C.ROOM_TARGET]]._waitPosTowerDrain[creep.pos.roomName]) {		
				creep._memory.enemySpottedPos = posSave(posDecompressXY(Memory.rooms[creep._memory[C.ROOM_TARGET]]._waitPosTowerDrain[creep.pos.roomName].pos, creep._memory[C.ROOM_TARGET]));
			} else if (creep._memory.exitPos) {
				creep._memory.enemySpottedPos = creep._memory.exitPos;
			} else {
				creep._memory.enemySpottedPos = posSave(pullIdlePosForRoom(creep._memory[C.ROOM_TARGET]));			
			}		
		}
		
		let attacking = false;
		let kiting = false;
		let imStronger;
		
        if (creep._memory[C.ROOM_TARGET] == 0 || creep._memory[C.ROOM_TARGET] === undefined) {
            creep._memory[C.ROOM_TARGET] = creep._memory[C.ROOM_ORIGIN];
        }
		let retreat;	
		let target;
        if (creep.room.name == creep._memory[C.ROOM_TARGET]){

			// RECORD TICKS IN COMBAT
			if (!creep._memory.fightTicks) { creep._memory.fightTicks = 0; }
			creep._memory.fightTicks++;
			
        	delete creep._memory.goBackIn;
        	// RECORD TICKS TO TARGET
        	if (!creep._memory[C.TICKS_TO_TARGET]) {
        		creep._memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - creep.ticksToLive;
        	}
			// RETREAT IF TAKING DAMAGE
			if ((creep.hits <= (creep.hitsMax * 0.85) && !creep.pos.myCombatStrengthLarger()) ||
				(roomIsSafeModed(creep._memory[C.ROOM_TARGET]) && !creep.room.memory.myRoom)
				){
				let destExit
				if (creep.room.controller && creep.room.controller.my) {
					destExit = creep.room.controller.pos
				} else {
					destExit = getClosestSafeExit(creep.pos);
				} 

				if (!destExit) {
					destExit = pullIdlePosForRoom(creep._memory.roomFallback)
				}
			//	console.log(creep.pos +"FOUND SAFE EXIT : " + safeExit)
			//	let destExit = getClosestExitTile(creep.pos);
				creep.room.visual.circle(destExit.x, destExit.y , {fill: 'transparent', radius: 0.50, stroke: 'green'});

			//	creep.travelTo(fallbackPos, {range:2, stuckValue: 2, ignoreCreeps: false, roomCallback: avoidSKcreeps});
				creep.travelTo(destExit, {range:0, stuckValue: 1, roomCallback: raidMatrix});
				
				if (creep.room.name !== creep._memory.roomFallback) {
					retreat	= true;
				}
				creep._memory.wait = 25;	// MAKES THE CREEP ATTACK IF HEALED BACK UP
			// WAIT NEAR BORDER
			} else if (creep._memory.wait && !creep.room.memory.myRoom && creep.room.memory.numberOfTowers > 0) {	
				
				let drainPos = Game.rooms[creep.room.name].getWaitPosTowerDrain(creep._memory.roomFallback);
				if (!creep._memory.inRoom && !creep.pos.isNearExit(0)) {
					creep.say("entered");
					creep._memory.inRoom = 1;
					creep._memory.wait--;
				} else if (drainPos) {
					creep._memory.enemySpottedPos = posSave(clampRoomEdges(drainPos));
					if (creep.pos.isNearExit(2) ) {
						creep.travelTo(drainPos, {range: 0, maxRooms: 1, stuckValue: 1, ignoreCreeps: false, roomCallback: avoidSKcreeps});
					}
					if (Game.rooms[creep._memory[C.ROOM_TARGET]].isTowersDraining() ) { creep._memory.wait = 3; }
					if (Game.rooms[creep._memory[C.ROOM_TARGET]].memory.prevTowerE && Game.rooms[creep._memory[C.ROOM_TARGET]].memory.prevTowerE <= 10) { delete creep._memory.wait; }	
					creep.say(creep._memory.wait);
					creep._memory.wait--;
					if (creep._memory.wait <= 0 ) { delete creep._memory.wait; }
				} else { // FAILED TO GET DRAIN POS
					if (creep.pos.isNearExit(0)) {
						creep.travelTo(new RoomPosition(25,25, creep._memory[C.ROOM_TARGET]), {range: 23, maxRooms: 1, ignoreCreeps: false, roomCallback: avoidSKcreeps});
					}
					creep.say(creep._memory.wait);
					creep._memory.wait--;
				}
							
				if (!creep._memory.previousTarget) {		
					if (!creep._memory.getTargetTs || Game.time > creep._memory.getTargetTs) {
						target = creep.getAttackTarget();
						creep._memory.getTargetTs = Game.time + 7;
						if (!target) {
							creep._memory.getTargetTs = Game.time + 17;
						}					
					}
					if (target) {											
						creep._memory.previousTarget = target.id;
						creep._memory.enemySpottedPos = posSave(clampRoomEdges(target.pos));
					}
				}
			// ATTACK
			} else {
				if (!creep._memory.getTargetTs || Game.time > creep._memory.getTargetTs) {
					target = creep.getAttackTarget();
					creep.say("1?")
					creep._memory.getTargetTs = Game.time + 1;
					if (!target) {
						creep._memory.getTargetTs = Game.time + 13;
					}
				}

				if (Game.rooms[creep._memory[C.ROOM_TARGET]].isTowersDraining() ) { creep._memory.wait = 3; }

				if (!target) {											
					if (creep._memory.previousTarget) {
						target = Game.getObjectById(creep._memory.previousTarget);
						if (!target || target.pos.roomName !== creep._memory[C.ROOM_TARGET]) {
							delete creep._memory.previousTarget;
							target = creep.getAttackTarget();
						}
					} else {
						if (getEnemyCreeps(creep.room.name).length > 0) {
							target = creep.getAttackTarget();
						}
					}
				}

				if (target){
					creep._memory.previousTarget = target.id;
					creep._memory.enemySpottedPos = posSave(clampRoomEdges(target.pos));

					creep._memory.attackTimeOut = 35;	
					creep.room.visual.circle(target.pos.x, target.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
					creep.room.visual.line(creep.pos, target.pos, { color: "red", lineStyle: "solid" });

					creep._memory.enemySpottedPos = posSave(clampRoomEdges(target.pos));
					
					attacking = creep.rangedAttackInRange(target);
					let wantedRange = 3;


					if (target.isCreep) {
						if (target.enemyIsCombatCreep() ) {
							wantedRange = creep.wantedCombatRange(target.pos);	
						} else {
							wantedRange = 1; 
						}

						creep.maintainDistance(target, wantedRange, true);

					} else {

						let targetPos = target.pos;
						if (target.isStructure) {
							wantedRange = 1;							
							
							if (target.structureType === STRUCTURE_POWER_BANK){
								wantedRange = 1;
							} else {
								wantedRange = 0;							
								if (Memory.combatDeconstruct[creep.pos.roomName]) {
									targetPos = target.pos.pullSiegeFormationCombat(creep.pos);
								} else {
									targetPos = target.pos.pullSiegeFormation(creep.pos);
								}
							}
						}  else if (target.isConstructionSite) { 
							wantedRange = 0; 
						} 

						let rangeToTarget = creep.pos.getRangeTo(targetPos);
						if (rangeToTarget > wantedRange || creep.pos.isNearExit(0)) {
							creep.travelTo(targetPos, {range: wantedRange, maxOps: 5000, ignoreCreeps: false, ignoreRoads: true, roomCallback: raidMatrix, ensurePath: true});
						} 
					}

					
				} else {
					if (creep._memory.attackTimeOut) {
						creep._memory.attackTimeOut--;
					} else {

						if (creep.medic() ) {
							// do medic
						} else {
							let dest = creep._memory.enemySpottedPos;
							if (!dest) {
								if (creep._memory.exitPos) {
									dest = clampRoomEdges(creep._memory.exitPos);
								} else if (Memory.attackTarget[creep._memory[C.ROOM_TARGET]] && Memory.attackTarget[creep._memory[C.ROOM_TARGET]].idlePos) {
									dest = Memory.attackTarget[creep._memory[C.ROOM_TARGET]].idlePos;
								} else if (creep.room.controller) {
									dest = creep.room.controller.pos;
								}
							}
	
							let range = 5;
							if (creep.pos.isNearExit(0) && creep.pos.getRangeTo(dest) < range) {
								range = 0;
							}
							creep.travelTo(dest, {range: range, maxRooms:1, roomCallback: raidMatrix, ensurePath: true, ignoreRoads: true});
						}						
					}
				}
			}
        }
        else {
			delete creep._memory.inRoom 
			// MOVE TO TARGET		
			if (creep._memory.previousTarget) {
				target = Game.getObjectById(creep._memory.previousTarget);
				if (target) {

				}
			}

			if (creep.hits >= (creep.hitsMax * 0.85) && !creep._memory.previousTarget ){					
				let dest = posLoad(creep._memory.enemySpottedPos);
				creep.travelTo(dest, {ignoreCreeps:true, ignoreRoads: true, maxOps: 50000, roomCallback: avoidSKcreeps, freshMatrix: true, ensurePath: true} );	
			// GO BACK IN
			} else if (Memory.rooms[creep._memory[C.ROOM_TARGET]] && Memory.rooms[creep._memory[C.ROOM_TARGET]].myRoom ||
					creep.hits == creep.hitsMax ||
				//	Game.rooms[creep.pos.roomName].allDrainersPresentAndHealed(creep._memory[C.ROOM_TARGET]) || 
					creep._memory.goBackIn) 
				{
				creep._memory.goBackIn = 1;
				let dest = posLoad(creep._memory.enemySpottedPos);
				creep.travelTo(dest, {ignoreCreeps:false, ignoreRoads: true, roomCallback: avoidSKcreeps} );	
			//	}
			// HEAL UP	
			} else {
				let dest = posLoad(creep._memory.enemySpottedPos);
       			let healPos = Game.rooms[creep.pos.roomName].getDrainerHealPos(dest);
       			if (healPos && Memory.rooms[healPos.roomName] && Memory.rooms[healPos.roomName].hostileRoom) {
					creep.travelTo(healPos, {maxRooms: 1, ignoreCreeps: false, ignoreRoads: true, range:1, roomCallback: avoidSKcreeps});       				
       			} else {
				//	console.log("moving to fallback ");
					if (creep.room.name === creep._memory.roomFallback) {				
						creep.travelTo(new RoomPosition(25,25, creep._memory.roomFallback), {maxRooms: 1, ignoreCreeps:false, ignoreRoads: true, range:1, roomCallback: avoidSKcreeps});
					} else {
						creep.travelTo(new RoomPosition(25,25, creep._memory[C.ROOM_TARGET]), {maxRooms: 1, ignoreCreeps:false, ignoreRoads: true, range:1, roomCallback: avoidSKcreeps});
					}
				}
			}
        }

		
		if (!retreat && !creep.pos.myCombatStrengthLarger(5) ) {			
			creep.defensiveRetreatPath({ kite: true });
		}

		if (!attacking) {
		//	creep.say("pew")
			attacking = creep.rangedAttackInRange();
		}

		let missingHp = creep.hitsMax - creep.hits;
	//	healPower()
		if (missingHp >= creep.healPower() ) {
			creep.heal(creep);
		} else {
			creep.healInRange(attacking);
		}
	}
};

module.exports = roleRangedAttacker;