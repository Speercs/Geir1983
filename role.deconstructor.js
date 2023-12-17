'use strict'
let roleDeconstructor = {

    /** @param {Creep} creep **/
    run: function(creep) {
		
		if (!creep._memory.healer && Game.time % 19 === 1) {
			let follow = creep.room.find(FIND_MY_CREEPS, {
				filter: function(object) {
                return (object.memory.follow === creep.name);
					}});
			if (follow.length > 0) {
				creep._memory.healer = follow[0].name;
			}
		}

		registerAttacker(creep, creep._memory[C.ROOM_TARGET]);

		// Target Room Changed?
		if (creep._memory.enemySpottedPos) {
			let posInRoom = posLoad(creep._memory.enemySpottedPos);
			if (posInRoom && posInRoom.roomName !== creep._memory[C.ROOM_TARGET]) {
				delete creep._memory.enemySpottedPos;
			}
		}

		if (creep._memory.enemySpottedPos === undefined) {
			if (Memory.rooms[creep._memory[C.ROOM_TARGET]] && Memory.rooms[creep._memory[C.ROOM_TARGET]].myRoom) {
				creep._memory.enemySpottedPos = posSave(posDecompress(Memory.rooms[creep._memory[C.ROOM_TARGET]].controller.pos, creep._memory[C.ROOM_TARGET]));
			} else if (Memory.rooms[creep._memory[C.ROOM_TARGET]] && Memory.rooms[creep._memory[C.ROOM_TARGET]]._breachPos) {
				creep._memory.enemySpottedPos = posSave(posDecompress(Memory.rooms[creep._memory[C.ROOM_TARGET]]._breachPos, creep._memory[C.ROOM_TARGET]));
			} else if (Memory.rooms[creep._memory[C.ROOM_TARGET]] && Memory.rooms[creep._memory[C.ROOM_TARGET]]._wallTargetPos) {	
				creep._memory.range = 1;			
				creep._memory.enemySpottedPos = posSave(posDecompress(Memory.rooms[creep._memory[C.ROOM_TARGET]]._wallTargetPos, creep._memory[C.ROOM_TARGET]));			
			} else {
				creep._memory.enemySpottedPos = posSave(pullIdlePosForRoom(creep._memory[C.ROOM_TARGET]));		
			}
		}

		
		if (creep._memory.boost) {
			if( creep.applyBoost(T3_MOVE, true) ) { return; }
			if( creep.applyBoost(T3_TOUGH, true) ) { return; }
			if( creep.applyBoost(T3_ATTACK, true) ) { return; }
			if( creep.applyBoost(T3_DISMANTLE, true) ) { return; }
			if( creep.applyBoost(T3_RANGED_ATTACK, true) ) { return; }
			creep._memory.boost = false;
		}

		for (let idx in creep._memory.appBoosts) {			
			let boost = creep._memory.appBoosts[idx]
			if (creep.applyBoost(boost, true)) { return; }
		}
		delete creep._memory.appBoosts;

		let remoteHealer = Game.creeps[creep._memory.healer];

		// PREVENT STARTING CREEP BEFORE HEALER/ENGINE ASSIGNED
		if (!creep._memory[C.STARTED] && 
			(creep._memory[C.BOOSTED] && creep._memory.healer && (!remoteHealer || remoteHealer && (remoteHealer.memory.boost || remoteHealer._memory.appBoosts))) ||
			(creep._memory[C.WAGON_WEIGHT] && !creep._memory.engine)
		) { 
			creep.yieldRoad(creep.pos)
			return;
		}

		creep._memory[C.STARTED] = Game.time;
		if (creep._memory[C.BOOSTED]) { creep.recordTicksFromLabToWork(); }

		if (!creep._memory.raidDamage) {
			let power = calcCreepStrength([creep])
			creep._memory.raidDamage = power.attackDamage + power.rangedAttackDamage + power.dismantlePower;
		}
		
		// UNBOOST
		if (creep._memory.civ && creep._memory[C.BOOSTED] && creep.timeToHeadBackForUnBoost() ) {
			if (creep.room.name !== creep._memory[C.ROOM_ORIGIN] || creep.pos.isNearExit(1)) {
				const labPos = Game.rooms[creep._memory[C.ROOM_ORIGIN]].labIdlePos();
				
                if (remoteHealer) {
					remoteHealer.moveAsOne(labPos, creep.name,  {range:0, ignoreCreeps: false, ignoreRoads: true,roomCallback: raidMatrix, raidDamage: creep._memory.raidDamage, raidFlee: true, moveAsOne: creep});
				} else if (creep._memory.engine) {
					let engine = Game.getObjectById(creep._memory.engine);
					if (!engine) { return; }
					engine.engine(creep, labPos);
				} else {
					creep.moveAsOne(labPos, creep._memory.healer, {range:0, ignoreCreeps: false, ignoreRoads: true, roomCallback: raidMatrix, raidDamage: creep._memory.raidDamage, raidFlee: true, moveAsOne: remoteHealer});
				}

            } else {
                creep.unBoost();
			}
			return;
		}
		


		if (creep.pos.roomName !== creep._memory[C.ROOM_TARGET] && 
			(Memory.rooms[creep.pos.roomName] && !Memory.rooms[creep.pos.roomName].hostileRoom) &&
			creep.pos.roomName !== creep._memory.roomFallback) {
			if (!creep._memory.wait) { creep._memory.wait = 15; }
			creep._memory.roomFallback = creep.room.name;
		}
		
		if (creep.hasBodyparts(RANGED_ATTACK)) {
			creep.rangedAttackInRange();
		}

		let avoiding;
		if (creep.hits < creep.hitsMax && !creep.pos.myCombatStrengthLarger(3) ) {
			avoiding = true;			
			creep.clearTarget();
			creep.say("?")
			creep._memory.retreat = 3;
			creep.room.memory.decRetreat = Game.time;
		}

		if (remoteHealer && remoteHealer.hits < remoteHealer.hitsMax && !remoteHealer.pos.myCombatStrengthLarger(3)) {
			avoiding = true;
			creep.clearTarget();
			remoteHealer.say("!?")
			creep._memory.retreat = 3;
		}

		
		if (creep.hits <= (creep.hitsMax * 0.85) || 
			(remoteHealer && remoteHealer.hits <= (remoteHealer.hitsMax * 0.85) ) || 
			creep._memory.retreat ||
			avoiding ||
			roomIsSafeModed(creep._memory[C.ROOM_TARGET])

			){	// RETREAT IF TAKING DAMAGE
			if (creep._memory.retreat) {
				creep.say("retreat "+ creep._memory.retreat);
				creep._memory.retreat--;				
				creep._memory.retreatTs = Game.time + 37;
			}

			creep._memory.avoid = 1;

			let fallbackPos
			if (!creep._memory.safePos) {
				fallbackPos = getClosestSafeExit(creep.pos);	
				if (fallbackPos) {
					creep._memory.roomFallback = fallbackPos.roomName;
					fallbackPos = getSafePosInExit(fallbackPos);
					creep._memory.safePos = posSave(fallbackPos);
				}
			} else {
				fallbackPos = posLoad(creep._memory.safePos);
			}
			
			

			/*
			let fallbackPos
			if (Game.rooms[creep._memory.roomFallback]) {
				fallbackPos = pullIdlePosForRoom(creep._memory.roomFallback);
			} else {
				fallbackPos = getClosestSafeExit(creep.pos);	
				if (fallbackPos) {
					creep._memory.roomFallback = fallbackPos.roomName;
					fallbackPos = getSafePosInExit(fallbackPos);
				}
			}*/

			creep.attackOrDismantleInRange();
			
			if (remoteHealer) {
				remoteHealer.moveAsOne(fallbackPos, creep.name,  {range:0, ignoreCreeps: false, ignoreRoads: true, roomCallback: raidMatrix, raidDamage: creep._memory.raidDamage, raidFlee: true, moveAsOne: creep});
			} else if (creep._memory.engine) {
				let engine = Game.getObjectById(creep._memory.engine);
				if (!engine) { return; }
				engine.engine(creep, fallbackPos);
			} else {
				creep.moveAsOne(fallbackPos, creep._memory.healer, {range:0, ignoreCreeps: false, ignoreRoads: true, roomCallback: raidMatrix, raidDamage: creep._memory.raidDamage, raidFlee: true, moveAsOne: remoteHealer});
			}

			delete creep._memory.wait;
			

		} else if (creep.pos.roomName !== creep._memory[C.ROOM_TARGET]) { // MOVE TOWARDS TARGET ROOM			
		
			let range = creep._memory.range || 0;
		
		//	let dest = new RoomPosition(creep._memory.enemySpottedPos.x, creep._memory.enemySpottedPos.y, creep._memory.enemySpottedPos.roomName);
			let dest = posLoad(creep._memory.enemySpottedPos);
			
		//	console.log(" dest " + dest)
			if (creep._memory.engine) {
				let engine = Game.getObjectById(creep._memory.engine);
				if (!engine) { return; }
				engine.engine(creep, dest);
			} else {
				creep.moveAsOne(dest, creep._memory.healer, {range: range, ignoreRoads: true, maxRooms: 20, ensurePath: true, roomCallback: avoidSKcreeps, preferHighway: true , moveAsOne: Game.creeps[creep._memory.healer] });
			}
						
			creep.attackOrDismantleInRange();

			if (roomIsSafeModed() ) {
				let roomToTarget = [];
				findClosestHostileBase(creep._memory[C.ROOM_TARGET], roomToTarget);
				if (roomToTarget.length > 0) {
					console.log(creep + " in " + creep._memory[C.ROOM_TARGET] + " found new target " + roomToTarget[0]);
					creep._memory[C.ROOM_TARGET] = roomToTarget[0];
				}
			}
		// WAIT ON BORDER?
		} else {
			if (creep._memory[C.BOOSTED]) { creep.recordTicksFromLabToWork(35); }
			creep.roleCombatDeconstructor();
		}
	}
};
module.exports = roleDeconstructor;

Creep.prototype.attackOrDismantleInRange = function(target) {	

	if (this._attOrDisTs) { return; }
	this._attOrDisTs = Game.time;
	
	if (this.hasBodyparts(WORK) ) {
		return this.dismantleInRange(target);
	} else {
		return this.meleeAttackInRange(target);
	}
};

// ROLE DECONSTRUCTER
Creep.prototype.roleCombatDeconstructor = function() {	
	
	let role = "roleCombatDeconstructor";
	// CHECK IF OTHER ROLE ACTIVE
	if (!this.checkRole(role)) {return 0;}
	// ASSIGN TARGET 		

	if (!this._memory[C.CLOSEST_TARGET]) {

		if (this.memory[C.TICKS_TO_TARGET] === undefined){				
			this.memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - this.ticksToLive;
		}

		let targetRoom = this.memory[C.ROOM_TARGET];
		let flags = _.filter(Game.flags, 
			function(flag) {return ((flag.color === COLOR_BLUE || flag.color == COLOR_ORANGE) &&
								   (flag.pos.roomName == targetRoom));
				});
		if (flags.length > 0 && !this.room.memory.myRoom) {
			if (this.room.name === this.memory[C.ROOM_TARGET]) {

				let flagTarget;
				let bestFlagScore = Infinity;
				let myCombatStrength = calcCreepStrength(this.pos.lookForAlliedAndMyCreepsAround(3));

				for (let idx in flags) {
					let flag = flags[idx];

					if (this.room.memory && this.room.memory.controller) {
						let controllerPos = posDecompress(this.room.memory.controller.pos, this.room.name)
						if (flag.pos.isThisPos(controllerPos)) { continue; }
					}

					if (!flag.pos.myCombatStrengthLarger(3, myCombatStrength) ) { 
						continue;
					}

					let pathRange = 1;
					let maxRooms = 3;
					if (SEASONAL_SYMBOLS && roomIsHW(targetRoom)) { 

						let structures = _.filter(flag.pos.lookFor(LOOK_STRUCTURES), 
							function(c) {return (c.structureType !== STRUCTURE_RAMPART
							)});
						if (structures.length > 0 ) {
							pathRange = 1;							
						} else {
							pathRange = 0;
						}
						
						maxRooms = 1;						
					}

					let pathToFlag = findTravelPath(this.pos, flag.pos,
						{range: pathRange, ignoreRoads: true, ignoreCreeps: true, maxRooms: maxRooms, freshMatrix: true, denyTunnel: true});
					if (pathToFlag.incomplete) { 
						continue;
					} else {
						if (SEASONAL_SYMBOLS && roomIsHW(targetRoom) && pathRange === 0) {
							Game.flags[flag.name].remove();
							continue;
						}
					}

					let score = 0;
					let target;
					let ramparted = flag.pos.lookForStructure(STRUCTURE_RAMPART);
					if (ramparted) { 
						score += ramparted.hits; 
						target = ramparted;
					} else {
						let structures = _.filter(flag.pos.lookFor(LOOK_STRUCTURES), 
							function(c) {return (c.structureType !== STRUCTURE_RAMPART
						)});
					
						if (structures.length > 0 ) {
							score += structures[0].hits; 
							target = structures[0];
						} else {
							Game.flags[flag.name].remove();
						}
					}
					if (target && score < bestFlagScore) {
						bestFlagScore = score;
						flagTarget = target.id;
					}
				}
				
				if (flagTarget) {
					this.assignTarget(flagTarget, role);
				} else {
					this.say("NoPathFlag");
					
					let unique = this.memory.avoid;

					let target = this.getAttackTarget(this.memory[C.BOOSTED], this.memory[C.BOOSTED], undefined, false, unique);			
					if (target) {
						if (target.isCreep) { this.memory.stickyTarget = Game.time + 9; }
						this.memory.previousTarget = target.id;
					} else if (this.memory.previousTarget) {
						target = Game.getObjectById(this.memory.previousTarget);
					}
					if (target){
						this.assignTarget(target.id, role);
					//	{ this.memory.stickyTarget = Game.time + 49; }
					}
				}

			} else {
				if (this.memory.healer && Game.creeps[this.memory.healer]) {
					let dest = flags[0].pos;
					this.moveAsOne(dest, this.memory.healer, {range: 1, maxRooms: 20, maxOps: 50000, ensurePath: true, freshMatrix: true, preferHighway: true, ignoreRoads: true, moveAsOne: Game.creeps[this.memory.healer] });
				}
			}
		} 
		
		if (!this._memory[C.CLOSEST_TARGET] && this.room.name === this.memory[C.ROOM_TARGET] ) {
			let unique = this.memory.avoid;
			let ignoreCreeps = this.hasBodyparts(WORK) > 0;
			let ignoreWorkers = this.memory[C.BOOSTED] || this.hasBodyparts(WORK) > 0;
			let target = this.getAttackTarget(ignoreCreeps, ignoreWorkers, undefined, false, unique);	
			if (target) {
				if (target.isCreep) { 
					this.memory.stickyTarget = Game.time + 9; 

				} else if (target.structureType && 
					(target.structureType === STRUCTURE_RAMPART || target.structureType === STRUCTURE_WALL)
					) {
					this.memory.stickyTarget = Game.time + 27;	
					this.memory.wasWallTarget = 1;
				} else {
					this.memory.stickyTarget = Game.time + 27;
				}
				this.memory.previousTarget = target.id;
			} else if (this.memory.previousTarget) {
				target = Game.getObjectById(this.memory.previousTarget);
				if (!target) { this.memory.checkCreeps = 1;}
				this.memory.stickyTarget = Game.time + 9;
			} else {
				this.memory.checkCreeps = 1;
			}
			if (target){
				this.assignTarget(target.id, role);				
			}
		}
	}
	
	if (this.memory[C.CLOSEST_TARGET]) { // MOVE TO TARGET

		if (!this._memory.raidDamage) {
			let power = calcCreepStrength([this])
			this._memory.raidDamage = power.attackDamage + power.rangedAttackDamage + power.dismantlePower;
		}
	
		let targetObj = Game.getObjectById(this.memory[C.CLOSEST_TARGET]);
		if (!targetObj || (this.memory.stickyTarget && Game.time > this.memory.stickyTarget)) {
			if (this.memory.wasWallTarget && !targetObj) {
				delete this.room.memory._wallTarget;				
			}
			delete this.memory.wasWallTarget;
			delete this.memory.stickyTarget;
			delete this.memory[C.CLOSEST_TARGET];
			this.clearTarget();
			if (!this.recallTs || this.recallTs !== Game.time ) {
				this.recallTs = Game.time;
				this.roleCombatDeconstructor();
			} else {
				this.attackOrDismantleInRange();
			}
			return;
		} 

		this.room.visual.text("X", targetObj.pos.x, targetObj.pos.y, { color: 'red', font: 0.8, backgroundColor: 'rgba(0, 0, 0, 0.0)' });
		this.room.visual.line(this.pos, targetObj.pos, { color: "red", lineStyle: "solid"});	

		let dest
		if (targetObj.isCreep || targetObj.isConstructionSite) {
			dest = targetObj.pos;
			this.memory.enemySpottedPos = posSave(targetObj.pos);
		} else {
			let ignoreHostile = true;
			if (this.hasBodyparts(ATTACK) <= 0) {
				ignoreHostile = false;
			}

			dest = targetObj.pos.pullSiegeFormationCombat(this.pos, ignoreHostile);
			this.memory.enemySpottedPos = posSave(dest);
		}

		

		let value = ERR_NOT_IN_RANGE;
		if (this.pos.inRangeTo(targetObj, 1) ) {
		//	value = this.attackOrDismantleInRange(targetObj);
			if (this.hasBodyparts(WORK) > 0) {
				value = this.dismantleInRange(targetObj);
			} else {
				value = this.meleeAttackInRange(targetObj);
			}
		} else {			
			this.attackOrDismantleInRange();
		}
		
		// store in memory
		if (this.pos.getRangeTo(dest) > 0 || value == ERR_NOT_IN_RANGE) {

			this.attackOrDismantleInRange();
			let travelReturnData = {}
			this.memory.range = 0;
			if (this.memory.engine) {
				let engine = Game.getObjectById(this.memory.engine);
				if (!engine) { return; }
				engine.engine(this, dest);
			} else {
				this.moveAsOne(dest, this.memory.healer, {ensurePath: true, freshMatrix: true, ignoreRoads: true, range: 0, returnData: travelReturnData, roomCallback: raidMatrix, raidDamage: this._memory.raidDamage, moveAsOne: Game.creeps[this.memory.healer]});
			}
			
		//	console.log(JSON.stringify(travelReturnData))
			if (travelReturnData.pathfinderReturn && travelReturnData.pathfinderReturn.incomplete) {
			//	console.log("unreachable! " + targetObj);
			//	this.say("incomplete")
			//	this.clearTarget();	
			}
		} else if (value == OK) {
			if (Game.creeps[this.memory.healer] && Game.creeps[this.memory.healer].pos.isNearExit(0) ) {
				this.say("healer")
				let healer = Game.creeps[this.memory.healer]
				let destHealer = openAdjacentSpots(this.pos, false)[0];

				healer.travelTo(destHealer, { range: 0, ignoreCreeps: false, ignoreRoads: true})
			} else if (this.pos.getRangeTo(Game.creeps[this.memory.healer]) > 1 ) {
				this.moveAsOne(dest, this.memory.healer, {range: 0, roomCallback: raidMatrix, raidDamage: this._memory.raidDamage, ensurePath: true, freshMatrix: true, ignoreRoads: true, moveAsOne: Game.creeps[this.memory.healer]});
			}

			if (this.hasBodyparts(ATTACK) > 0){
				let nearbyCreeps = this.pos.lookForEnemyCreepsAround(1)
				let creeps = _.filter(nearbyCreeps, 
					function(creep) {return (
						!creep.spawning &&
						!creep.pos.lookForStructure(STRUCTURE_RAMPART)						
						);
					});
				if (creeps.length > 0) {
				//	console.log("attacking " + creeps[0])
					this.attack(creeps[0]);
				}

				// ATTEMPT TO DRAW OUT ATTACKERS
				nearbyCreeps = this.pos.lookForEnemyCreepsAround(2)

				if (!this.memory.retreatTs || this.memory.retreatTs < Game.time) {
					for (let idx in nearbyCreeps) {
						let creep = nearbyCreeps[idx];
						if (creep.my) {continue; }
						if (!creep.pos.lookForStructure(STRUCTURE_RAMPART)) { continue; }

						if (creep.hasBodyparts(ATTACK) > 15) {
						//	this.memory.retreat = 2;
							break;
						}
					}
				}


			}
		} else {
			console.log(this.room.name +" " +this.name + " error " + value +" clear target combat " + this.memory[C.CLOSEST_TARGET]);
			this.clearTarget();	
			if (Game.flags[this.memory.flag]) {
				Game.flags[this.memory.flag].remove();
				delete this.memory.flag;

			}
		}
		return 1;
	} else {
	//	let dest = new RoomPosition(this.memory.enemySpottedPos.x, this.memory.enemySpottedPos.y, this.memory.enemySpottedPos.roomName);
		if (!this.memory.enemySpottedPos) {
			this.memory.enemySpottedPos = posSave(pullIdlePosForRoom(this.room.name));
		}

		let dest = clampRoomEdges(posLoad(this.memory.enemySpottedPos));
		
		let range = this.memory.range || 2
		if (this.pos.isNearExit(0) ) {
			range = 0;
		}

		this.moveAsOne(dest, this.memory.healer, {range: range, roomCallback: raidMatrix, raidDamage: this._memory.raidDamage, ensurePath: true, freshMatrix: true, ignoreRoads: true, moveAsOne: Game.creeps[this.memory.healer]});
		this.attackOrDismantleInRange();
	} 

	return 0;
};