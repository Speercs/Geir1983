'use strict'
let roleClaimer = {

    /** @param {Creep} creep **/
    run: function(creep) {		

		let targetObj;
        if (creep.room.name == creep._memory[C.ROOM_TARGET]){
			
            if (creep._memory.targetId === undefined) {creep._memory.targetId = creep.room.controller.id;}
			targetObj = Game.getObjectById(creep._memory.targetId);

			if (targetObj && !creep._memory[C.TARGET_POS]) {
				creep._memory[C.TARGET_POS] = posSave(targetObj.pos);
			}

			let result;
			if (SEASONAL_THORIUM && creep._memory.claimController) {

				if (creep.pos.getRangeTo(targetObj) <= 1) {
							
					if (!creep._memory[C.TICKS_TO_TARGET]) {
						creep._memory[C.TICKS_TO_TARGET] = CREEP_CLAIM_LIFE_TIME - creep.ticksToLive;
					}

					
					
					result = creep.claimReactor(targetObj)
				//	console.log("CLAIM " + result)
					if (result === OK) {
						
						if (creep._memory.suicide) {
							creep.recycleOrSuicide();
							return;
						}
						
					}
					
				} else {
					creep.travelTo(targetObj, {range: 1, offRoad: true, maxOps: 50000, ensurePath: true});
				}
				
			} else if (targetObj.owner && !targetObj.my){	
				let targetPos = targetObj.pos.pullSiegeFormationCombat(creep.pos, false);

				let range = 0;
				if (!targetPos || targetPos.isThisPos(targetObj.pos)) {	
					range = 1;
				}

			//	this.room.visual.circle(targetPos.x, targetPos.y , {fill: 'transparent', radius: 0.50, stroke: 'yellow'}) 
				let ignoreCreeps = true;
				let freshMatrix = false;
				
				if (creep.pos.getRangeTo(targetPos) <= 3) {
					ignoreCreeps = false;
					freshMatrix = true;
				}

				creep.travelTo(targetPos, {range: range, ignoreRoads: true, maxOps: 50000, ensurePath: true, ignoreCreeps: ignoreCreeps, freshMatrix: freshMatrix});

				if (creep.pos.getRangeTo(targetObj) <= 1) {

					if (!creep._memory[C.TICKS_TO_TARGET]) {
						creep._memory[C.TICKS_TO_TARGET] = CREEP_CLAIM_LIFE_TIME - creep.ticksToLive;
						if (Memory.controllerAttack[creep.pos.roomName] &&
							Memory.controllerAttack[creep.pos.roomName].assignedRooms &&
							Memory.controllerAttack[creep.pos.roomName].assignedRooms[creep._memory[C.ROOM_ORIGIN]]	
							){
							Memory.controllerAttack[creep.pos.roomName].assignedRooms[creep._memory[C.ROOM_ORIGIN]].travelTime = creep._memory[C.TICKS_TO_TARGET];
						}
					}

					if (targetObj.allInPos(creep) || 
						creep.ticksToLive <= 1 ||
						Memory.rooms[creep.pos.roomName].numberOfTowers > 0 ||
						(Memory.rooms[creep.pos.roomName].hostiles && Memory.rooms[creep.pos.roomName].hostiles.power.defensive > 0)
					){
						result = creep.attackController(targetObj);
						if (result === OK) {
							registerControllerBlocked(creep.room.name);
							creep.mySignController(targetObj);
							creep.recycleOrSuicide();
						}
					}
				}
			} else if (creep._memory.claim || (Memory.expansionTarget[NEXT_EXPANSION] && Memory.expansionTarget[NEXT_EXPANSION].roomName === creep.room.name))	{				
				if (creep.pos.getRangeTo(targetObj) <= 1) {
							
					if (!creep._memory[C.TICKS_TO_TARGET]) {
						creep._memory[C.TICKS_TO_TARGET] = CREEP_CLAIM_LIFE_TIME - creep.ticksToLive;
					}
					if (targetObj.reservation && targetObj.reservation.username !== Memory.username || targetObj.owner && targetObj.owner.username !== Memory.username){	
						result = creep.attackController(targetObj);
					//	console.log("attacking controller " + result);
					} else if (PRAISE_GCL_ROOMS[targetObj.room.name] && PRAISE_GCL_ROOMS[targetObj.room.name].unclaim && targetObj.my) {
						unclaimController(targetObj);
						delete PRAISE_GCL_ROOMS[targetObj.room.name].unclaim;
						creep._memory.suicide = 1;
					} else {
						result = creep.claimController(targetObj);
					//	console.log("CLAIM " + result)
						if (result === OK) {
							creep.mySignController(targetObj);
							if (creep._memory.suicide) {
								creep.recycleOrSuicide();
								return;
							}
							/*
							creep.recycleOrSuicide();	//might result in spawning another claimer?
							return;
							*/
						}
					}
					
				} else {
					creep.travelTo(targetObj, {range: 1, offRoad: true, maxOps: 50000, ensurePath: true});
				}
			} else {
				if (creep.pos.getRangeTo(targetObj) > 1) {	
					creep._memory[C.TICKS_TO_TARGET]++;
					let returnData = {};

					let ignoreCreeps = undefined;
					let dest = targetObj
					let range = 1;
					if ((creep._memory.addReserver || creep._memory.finalPath) && creep.pos.getRangeTo(targetObj) <= 3) {
						creep._memory.finalPath = 1;
						ignoreCreeps = false;
					}

					if (creep._memory.finalPath && creep._memory.addReserver) {
						dest = targetObj.pos.pullSiegeFormation(creep.pos)
						range = 0;
					}

					creep.travelTo(dest, {range: range, maxOps: 50000, ensurePath: true, returnData: returnData, ignoreCreeps: ignoreCreeps});
					if (returnData.pathfinderReturn && returnData.pathfinderReturn.incomplete) {
						log("claimer cant reach! " + targetObj.pos)
						creep.room.memory.controller.unreachableTs = Game.time + 1500;
					//	creep.suicide();	// todo: find other target!
					}
				} else if (targetObj.reservation && targetObj.reservation.username !== Memory.username){	
					result = creep.attackController(targetObj);
					creep.mySignController(targetObj);
					if (!creep._memory[C.TICKS_TO_TARGET]) {
						creep._memory[C.TICKS_TO_TARGET] = CREEP_CLAIM_LIFE_TIME - creep.ticksToLive;
					}
				} else {
					if (!creep._memory[C.TICKS_TO_TARGET]) {
						creep._memory[C.TICKS_TO_TARGET] = CREEP_CLAIM_LIFE_TIME - creep.ticksToLive;
					}

					if ((!targetObj.reservation || targetObj.reservation.username === Memory.username) &&
						creep._memory.checkExplode === undefined || creep._memory.checkExplode < 1
					) {

						requestMemSave();

						if (creep._memory.checkExplode === undefined &&
							
							((needsCleanUp(creep.room.name) &&						
							canClaimForExplode(creep.room.name)) ||

							(!BOT_MODE && Memory.rooms[creep.room.name][R.MY_MINING_OUTPOST] &&
							(!targetObj.safeModeCooldown || targetObj.safeModeCooldown < 7500) &&
							canClaimForExplode(creep.room.name)))
						) {
							result = creep.claimController(targetObj);

							if (!targetObj.safeModeCooldown || targetObj.safeModeCooldown < 7500) {
								Memory.rooms[creep.room.name].resetSafeModeCd = 1;								
							}

							if (needsCleanUp(creep.room.name)) {
								creep._memory.checkExplode = -1;
							} else {
								creep._memory.checkExplode = -2;								
							}
							
							if (result === OK) {
								if (Memory.rooms[creep.room.name][R.MY_MINING_OUTPOST]) {
									creep._memory.softReset = true;
								} else {
									creep._memory.softReset = false;
								}
								setExplodeTimer();


								Memory.rooms[creep.room.name].explodeRoom = 1;
								return;
							}
						} else if (creep._memory.checkExplode === -1 && targetObj.my){
							let destroyMy = false;
							
							result = performExplode(creep.room.name, creep._memory.softReset, destroyMy);
							creep.say("BOOM");
							if (result === OK) {
								delete creep._memory.softReset;
								creep._memory.checkExplode = -2;
							}
							return;
						} else if (creep._memory.checkExplode === -2 && targetObj.my){	
							creep._memory.checkExplode = 1;
							unclaimController(targetObj);
							return;
						} else {
							creep._memory.checkExplode = 1;
						}
					}

					if (creep._memory.addReserver) {
						let dest = targetObj.pos.pullSiegeFormation(creep.pos);		
						if (creep.pos.getRangeTo(dest) > 0) {
							creep.travelTo(dest, {range: 0});
						}
					}

					creep.reserveController(targetObj);
					creep.mySignController(targetObj);
    		    }
    		}
		}
		else {	
						
			let dest;
			let range = 1;
			if (creep._memory[C.TARGET_POS]) {
				dest = creep._memory[C.TARGET_POS];
				range = 1;
			} else if (creep._memory.shard && creep._memory.shard !== Game.shard.name) {
				dest = new RoomPosition(25,25, creep._memory[C.ROOM_TARGET]);
				range = 20;
			} else if (Memory.rooms[creep._memory[C.ROOM_TARGET]] && Memory.rooms[creep._memory[C.ROOM_TARGET]].controller) {
				dest = posDecompressXY(Memory.rooms[creep._memory[C.ROOM_TARGET]].controller.pos, creep._memory[C.ROOM_TARGET]);
				range = 1;
			} else if (creep._memory.targetId && Game.getObjectById(creep._memory.targetId)) {
				targetObj = Game.getObjectById(creep._memory.targetId);
				dest = targetObj.pos;
				creep._memory[C.TARGET_POS] = posSave(targetObj.pos);
			} else {
				dest = new RoomPosition(25,25, creep._memory[C.ROOM_TARGET]);
				range = 20;
			}

			let offRoad = creep.canOffroad();
			let ignoreRoad = creep.canIgnoreRoads();

			creep.travelTo(dest, {range: range, ignoreRoads: ignoreRoad, offRoad: offRoad, roomCallback: avoidSKcreeps, maxOps: 50000, ensurePath: true, shard: creep._memory.shard});
		}
    }

};

module.exports = roleClaimer;

