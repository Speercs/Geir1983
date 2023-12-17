'use strict'
let raidHandler = {
    run: function() {

		// SETUP 
		if (Memory.raids === undefined) {
			Memory.raids = {}; 
			Memory.raids.raidCounter = 0;
			Memory.raids.activeTargets = {};
		}

		if (Memory.raids.activeTargets === undefined) {
			Memory.raids.activeTargets = {};
		}

		// FIND RAID FLAGS
		let raidFlags = _.filter(Game.flags, flag => ((flag.color == COLOR_BROWN)));
		if (raidFlags.length > 0) {
			for (let idx in raidFlags){
				let flag = Game.flags[raidFlags[idx].name];
				
				if (flag.memory.spotted === undefined
				){
					flag.memory.spotted = Game.time;

					let unBoosted, test;
					let raidType = RAID_TYPE_PHALANX;
					if (flag.secondaryColor == COLOR_WHITE){
						unBoosted = true;
						console.log("flag unboosted")
					} else if (flag.secondaryColor == COLOR_RED) {
						raidType = RAID_TYPE_PHALANX_ATTACKERS;
					} else if (flag.secondaryColor == COLOR_ORANGE) {
						raidType = RAID_TYPE_PHALANX_DECONSTRUCT;
					} else if (flag.secondaryColor == COLOR_PURPLE) {
						test = true;
						unBoosted = true;
						log("adding raid flag test")
					}

					// ADD RAID REQUEST
					addRaid(flag.pos.roomName, {raidType: raidType, flagName: raidFlags[idx].name, unBoosted: unBoosted, targetPos: flag.pos, test: test});

					requestMemSave();
					
					//	addRaid(flag.pos.roomName, {raidType: RAID_TYPE_PHALANX_TEST});
					//	addRaid(flag.pos.roomName, {raidType: RAID_TYPE_CLASSIC, targetPos: raidFlags[idx].pos });

					continue;
				} else {

					if (flag.secondaryColor === COLOR_YELLOW){
						let timeSinceLastRaid = Game.time - flag.memory.spotted
						if (timeSinceLastRaid > 1000 && !roomIsSafeModed(flag.pos.roomName)) {
							delete flag.memory.spotted;
						}

						if (Memory.rooms[flag.pos.roomName] && !Memory.rooms[flag.pos.roomName].player && !Memory.rooms[flag.pos.roomName].invaderCore) {
							flag.remove();
						}

					} else {
						flag.remove();

					}
				}
			}
		}

		// RUN RAIDS
		delete Memory.raids.activeTargets;
		Memory.raids.activeTargets = {};

		
		for (let id in Memory.raids){
			let raid = Memory.raids[id];
			let init = Game.cpu.getUsed();

			try {
				
				if (!raid || !raid.state) { continue; }


				if (raid.flagName && !Game.flags[raid.flagName]) {
					delete Memory.flags[raid.flagName];
					delete raid.flagName;
				}

				if (raid.state === STATE_COMPLETE) { 
					if (Game.time > raid.startTick + 50000) { delete Memory.raids[id] }
					continue;
				}

				if (Memory.raids.activeTargets[raid.targetRoom] === undefined) {
					Memory.raids.activeTargets[raid.targetRoom] = {};
					Memory.raids.activeTargets[raid.targetRoom].spawners = {};					

				}
				Memory.raids.activeTargets[raid.targetRoom].raidType = raid.raidType;	// just one type?

				if (Memory.raids.activeTargets[raid.targetRoom].spawners[raid.assignedRoom] === undefined) {
					Memory.raids.activeTargets[raid.targetRoom].spawners[raid.assignedRoom] = {};
					Memory.raids.activeTargets[raid.targetRoom].spawners[raid.assignedRoom].raids = 0;
				}
				
				Memory.raids.activeTargets[raid.targetRoom].spawners[raid.assignedRoom].raids++


				// START RAID
				if (raid.state === STATE_PRE) {
					if (roomIsSafeModed(raid.targetRoom)) {
						raid.startTick = Game.time; 
						continue;
					}
					if (Game.time < raid.startTick ){ continue; }
					raid.state = STATE_INIT;
					requestMemSave();
				}

				// REQUEST VISION
				if (!Game.rooms[raid.targetRoom]) { requestRoomVision(raid.targetRoom); }

				// GET MY TROOPS
				raid.allCreeps = [];
			
				raid.deconstructors = _.filter(getCreeps(R_DECON), (creep) => creep._memory.raidId === id);
				raid.allCreeps = raid.allCreeps.concat(raid.deconstructors);

				raid.attackers = _.filter(getCreeps(R_ATTACK), (creep) => creep._memory.raidId === id);
				raid.allCreeps = raid.allCreeps.concat(raid.attackers);
				
				raid.rangers = _.filter(getCreeps(R_RANGED), (creep) => creep._memory.raidId === id);
				raid.allCreeps = raid.allCreeps.concat(raid.rangers);
				
				raid.healers = _.filter(getCreeps(R_HEALER), (creep) => creep._memory.raidId === id);
				raid.allCreeps = raid.allCreeps.concat(raid.healers);

				raid.combos = _.filter(getCreeps(R_COMBO), (creep) => creep._memory.raidId === id);
				raid.allCreeps = raid.allCreeps.concat(raid.combos);

				raid.healers = raid.healers.concat(raid.combos);
			
				raid.combos.sort(function(a, b) { return a.id - b.id })
				raid.allCreeps.sort(function(a, b) { return a.id - b.id })

				if (raid.requestedBy && raid.allCreeps.length) {
					let modulo = Game.time % 8;
					if (modulo === 0) {
						raid.allCreeps[0].say(raid.requestedBy, true)
					} else if (modulo === 1) {
						raid.allCreeps[0].say('sent me', true)
					}
				}
							
				if (raid.target){
					let highlightTarget = Game.getObjectById(raid.target);
					if (highlightTarget && Game.rooms[raid.targetRoom]){					
						Game.rooms[raid.targetRoom].visual.circle(highlightTarget.pos.x, highlightTarget.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'});
					}
				}

				if (raid.state === STATE_RALLY || raid.state === STATE_TRAVEL || raid.state === STATE_RAID) {

					if (raid.allCreeps.length === 0) { 
						raid.state = STATE_END;
						requestMemSave();
					} else if (raid.allCreeps[0].pos.roomName !== raid.targetRoom && 
						(Memory.rooms[raid.allCreeps[0].pos.roomName] && !Memory.rooms[raid.allCreeps[0].pos.roomName].hostileRoom)) {					
						raid.roomFallback = raid.allCreeps[0].room.name;
					}
				}

				/*
				if (raid.waves > 1 && !raid.calledNextWave && raid.state >= STATE_RAID && raid.eventChanges[STATE_RAID].raidTick !== undefined) {
					let ticksLeftInRaid = CREEP_LIFE_TIME - Game.time - raid.startTick
					if (CREEP_LIFE_TIME - raid.eventChanges[STATE_RAID].raidTick )
				}*/

				global.stats['cpu.aiRaidHandler.overhead'] += Game.cpu.getUsed()-init;
				init = Game.cpu.getUsed();

				switch(raid.state){
					case STATE_INIT: 
						raidStateInit(raid);
						global.stats['cpu.aiRaidHandler.raidStateInit'] += Game.cpu.getUsed()-init;
						break;

					case STATE_SPAWNING:
						raidStateSpawning(raid);
						global.stats['cpu.aiRaidHandler.raidStateSpawning'] += Game.cpu.getUsed()-init;
						break;

					case STATE_REFRESH_TTL: 
						raidStateRefreshTTL(raid);
						global.stats['cpu.aiRaidHandler.raidStateRefreshTTL'] += Game.cpu.getUsed()-init;
						break;

					case STATE_BOOST:
						raidStateBoost(raid);	
						global.stats['cpu.aiRaidHandler.raidStateBoost'] += Game.cpu.getUsed()-init;
						break;

					case STATE_RALLY:
						raidStateRally(raid);	
						global.stats['cpu.aiRaidHandler.raidStateRally'] += Game.cpu.getUsed()-init;				
						break;

					case STATE_TRAVEL:
						raidStateTravel(raid);	
						global.stats['cpu.aiRaidHandler.raidStateTravel'] += Game.cpu.getUsed()-init;				
						break;

					case STATE_RAID:
						// PERFORM RAID TYPE
						switch(raid.raidType) {
							case RAID_TYPE_CLASSIC:
							//	raidPerformTypeClassic(raid);
								global.stats['cpu.aiRaidHandler.raidPerformTypeClassic'] += Game.cpu.getUsed()-init;
								break;
							case RAID_TYPE_PHALANX:
								raidPerformTypePhalanx(raid);
								global.stats['cpu.aiRaidHandler.raidPerformTypePhalanx'] += Game.cpu.getUsed()-init;
								break;
							case RAID_TYPE_PHALANX_ATTACKERS:
								raidPerformTypePhalanx(raid);
								global.stats['cpu.aiRaidHandler.raidPerformTypePhalanx'] += Game.cpu.getUsed()-init;
								break;
							case RAID_TYPE_PHALANX_DECONSTRUCT:
								raidPerformTypePhalanx(raid);
								global.stats['cpu.aiRaidHandler.raidPerformTypePhalanx'] += Game.cpu.getUsed()-init;
								break;

								

						}
						break;

					case STATE_END:
						raidStateEnd(raid);
						break;
				}

				delete raid.allCreeps;
				delete raid.deconstructors;
				delete raid.attackers;
				delete raid.rangers;
				delete raid.healers;
				delete raid.combos;

				// LOG PROGRESS	
				if (raid.prevState !== raid.state){	

					console.log("Raid " +id+ " state changed from " + raid.prevState + " to new state " + raid.state +" at tick "+	(Game.time-raid.startTick) );
					if (raid.eventChanges === undefined) { raid.eventChanges = {}; }
					if (raid.eventChanges[raid.state] === undefined ) {
						raid.eventChanges[raid.state] = {};
						raid.eventChanges[raid.state].raidTick = Game.time-raid.startTick;
					}
					raid.prevState = raid.state;
				}
			
			} catch (err){
				
				if (err) {
					console.log('error running raid ' +raid.raidId +' at target ' +raid.targetRoom+ ' raid state '+raid.state +" " +err.name + err.stack);
				} else {
					console.log('error running raid ' +raid.raidId +' at target ' +raid.targetRoom + " no error to display");
				}								
			}	 
		} 		
	}
};
module.exports = raidHandler;

function raidPerformTypePhalanx(raid){
	let offensiveCreeps = [];
	offensiveCreeps = offensiveCreeps.concat(raid.combos);
	offensiveCreeps = offensiveCreeps.concat(raid.attackers);
	

	let roomName = raid.targetRoom;
	let attackTarget;
	let targetPos
	let retreat = false;
	
	if (raid.targetPos) {
		targetPos = posLoad(raid.targetPos)
		if (Game.rooms[roomName]) {
			Game.rooms[roomName].visual.circle(targetPos.x, targetPos.y , {fill: 'transparent', radius: 0.30, stroke: 'orange'});
		}
	}

	if (raid.target && Game.rooms[roomName]) {
		attackTarget = Game.getObjectById(raid.target);
		if (!attackTarget) {
			delete raid.target;
		}
	}
		
	// DISPLAY TARGET
	if (attackTarget) {
		Game.rooms[raid.targetRoom].visual.circle(attackTarget.pos.x, attackTarget.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
	}

	// REMOVE FLAGS	
	let flags = _.filter(Object.keys(Game.flags), flag => ((Game.flags[flag].color == COLOR_GREY)));
	let flagTarget = false;
	for (let idx in flags){

		let flag = Game.flags[flags[idx]]
		if (!Game.rooms[flag.pos.roomName]) { continue; }

		if (flag.secondaryColor === COLOR_RED) {
			retreat = true;
			continue;
		}		
		
		let structure = flag.pos.lookFor(LOOK_STRUCTURES);
		if (structure.length == 0) {
			flag.remove();
		} else {
			attackTarget = structure[0];
			flagTarget = true;
		}
		
		raid.targetPos = posSave(flag.pos)

		break;
	}	

	let dest;
	let range = 3;
	let attackRange = 3;
	let siegeRange = 0;
	if (raid.raidType === RAID_TYPE_PHALANX_ATTACKERS || raid.raidType === RAID_TYPE_PHALANX_DECONSTRUCT) {
		attackRange = 1;
	}

	let power = calcCreepStrength(raid.allCreeps, true)
	if (!raid.raidDamage) {		
		raid.raidDamage = power.attackDamage + power.rangedAttackDamage + power.dismantlePower;
	}
	
	let init = Game.cpu.getUsed();
	
	let fallbackPos;
	let atFullHealth = false;
	let healReasons = 0;
	let rangeToTarget = 50;
	let missingHealth = 0;
	let holdPos = false;

	for (let creepIdx in raid.allCreeps){
		
		let creep = raid.allCreeps[creepIdx];
		if (!raid.reassigned){
			registerAttacker(creep, raid.targetRoom, raid.attId, raid.raidType);
		}

		if (attackTarget) {
			rangeToTarget = Math.min(creep.pos.getRangeTo(attackTarget), rangeToTarget);
		}

		if (creepIdx == 0) {
			healReasons = creep.pos.lookForHealReasons(5)
		}


		if (creep.hits < creep.hitsMax) {
			missingHealth += creep.hitsMax - creep.hits;			
			delete raid.snakeTravel;
			

			if (missingHealth > power.healPower) {
				retreat = true;
			}
		}

		
	}

	let _phalanxInDanger = phalanxInDanger(raid.allCreeps)
	if (!retreat && _phalanxInDanger) {
		retreat = true;
	}

	
	if (missingHealth > 0) {

		if (raid.missingHealth === undefined) { raid.missingHealth = 0; }
		if (raid.missingHpTicks === undefined) { raid.missingHpTicks = 0; }

		if (missingHealth > raid.missingHealth) {
			raid.missingHpTicks++ 
		} else {
			raid.missingHpTicks--
		}
		raid.missingHealth = missingHealth;


		if (raid.missingHpTicks >= 4) {
			retreat = true;
		} else if (raid.missingHpTicks >= 1 && !retreat) {
			holdPos = true;
		}
	} else {
		delete raid.missingHealth;
		delete raid.missingHpTicks;
	}

	if (retreat) { 
		holdPos = false;
	}


	

	if (offensiveCreeps.length > 0 &&		
		roomIsSafeModed(raid.targetRoom)
	//	roomHp(raid.targetRoom) < 10000
		) {
		retreat = true;
		offensiveCreeps[0].say("sm")

		if (offensiveCreeps[0].room.name !== raid.targetRoom && !offensiveCreeps[0].pos.isNearExit(2)) {
			raidFindNextTargetForRaid(raid, offensiveCreeps[0].room.name)
		}
	}

	if (Game.rooms[raid.targetRoom] && 
		getRoomPRCL(raid.targetRoom) === 0 && 
		Memory.rooms[raid.targetRoom] && 
		!Memory.rooms[raid.targetRoom].hostiles && 
		roomHp(Game.rooms[raid.targetRoom]) === 0 && 
		offensiveCreeps.length >= 0
	) {
		raidFindNextTargetForRaid(raid, offensiveCreeps[0].room.name)
	}

	global.stats['cpu.aiRaidHandler.raidCheckRetreat'] += Game.cpu.getUsed()-init;

	init = Game.cpu.getUsed();
	if (retreat) {
		
	//	fallbackPos = getClosestSafeExit(offensiveCreeps[0].pos);		
		fallbackPos = pullIdlePosForRoom(raid.roomFallback);
		log("retreating to "+ fallbackPos);

	}
	global.stats['cpu.aiRaidHandler.raidRetreat'] += Game.cpu.getUsed()-init;


	init = Game.cpu.getUsed();

	
	if (raid.snakeTravel && Game.time > raid.snakeTravel) {
		delete raid.snakeTravel;
	}

	if (!roomIsHW(raid.targetRoom) && (!Memory.rooms[raid.targetRoom]._breachPosPhalanx && Memory.rooms[raid.targetRoom]._breachPos && raidCanSnake(raid))
	) {
		raid.snakeTravel = Game.time + 53;
		raid.targetTs = Game.time;
	}
	
	
	if (raid.stickyTarget === undefined) {
		raid.stickyTarget = 40;
	}

	
	let allowFreeFire = false;
	let checkForSnipeTargets;
	let snipeTarget;
	let towers;

	if (!retreat) { 		

		for (let creepIdx in offensiveCreeps){
			let creep = offensiveCreeps[creepIdx];
			
			if ((!attackTarget || !raid.targetTs || Game.time > raid.targetTs) && raid.targetRoom === creep.room.name){
				let ignoreWorkers = true;
				if (!creep.room.controller) {
					ignoreWorkers = false
				}
				let ignoreCreeps = false;
				if (raid.raidType === RAID_TYPE_PHALANX_DECONSTRUCT) {
					ignoreCreeps = true;
				}

				// request unique target?
				let unique = raid.raidId;
				if (roomIsSk(raid.targetRoom)) {
					unique = null;
				}

				// stickyWallTarget
				let useStickyTarget;
				if (raid.stickyTarget > 0) {
					useStickyTarget = true;
				} else if (raid.stickyTarget < 10){
					raid.stickyTarget = 40;
				}

				if (!raid.snakeTravel) {
					if (!flagTarget) {
						attackTarget = creep.getAttackTarget(ignoreCreeps, ignoreWorkers, undefined, true, unique, useStickyTarget);
					}
				} else {
					attackTarget = creep.getAttackTarget(ignoreCreeps, ignoreWorkers, undefined, false, unique); // Call on different creep?
				}
				
				log(raid.targetRoom + " target " + attackTarget + " as snake " + raid.snakeTravel + " hold pos " + holdPos)
				if (attackTarget) {
					raid.targetTs = Game.time + 1;
					raid.target = attackTarget.id;
					raid.targetFallback = Game.time + 37;
					delete raid.noTargetCount;
				} else {
					raid.targetTs = Game.time + 7;
					if (raid.noTargetCount === undefined) { raid.noTargetCount = 0; }
					raid.noTargetCount++

					if (raid.noTargetCount > 15 && !roomIsHW(raid.targetRoom) && raidCanSnake(raid)) {
						delete raid.noTargetCount;
						raid.snakeTravel = Game.time + 15 + Math.floor((Math.random() * 25));
						raid.targetTs = Game.time;
					}
				}
				break;
			}
		}

		// snipe core
		
		if ((!attackTarget || !attackTarget.isCreep) && Memory.rooms[roomName] && Memory.rooms[roomName].invaderCore && Memory.rooms[roomName].invaderCore.level >= 1 && !roomHasDeadCore(roomName)) {

			checkForSnipeTargets = true;
			if (Memory.rooms[roomName] && Memory.rooms[roomName].hostiles && Memory.rooms[roomName].hostiles.power.repairPower > 1000) {
				allowFreeFire = true;
			}
			
			let core = Game.getObjectById(Memory.rooms[roomName].invaderCore.id)
			if (core) {
				for (let creepIdx in offensiveCreeps){
					let creep = offensiveCreeps[creepIdx];
					if (creep.pos.getRangeTo(core) <= attackRange ) {
						snipeTarget = core;
						allowFreeFire = false;
						break;
					}
				}
			}

			towers = getEnemyTowers(roomName);
		}
	}

	// check if we should stick to this attackTarget or request new
	// if in range, at least some time its fine?
	if (attackTarget) {
		
		if (!attackTarget.isCreep && !snipeTarget) {

			let lastAttackTarget = raid.lastTarget
			if (lastAttackTarget !== attackTarget.id) {
				raid.stickyTarget = 40;
			}
			raid.lastTarget = attackTarget.id;			

			let inRange = 0;
			for (let creepIdx in offensiveCreeps){
				let creep = offensiveCreeps[creepIdx];
				if (creep.pos.getRangeTo(attackTarget) <= 3) {
					inRange++;
				}
			}

			let inRangePercentage = 2*(inRange/offensiveCreeps.length) - 1;	// +/- 1
			raid.stickyTarget += inRangePercentage;			
		} else {
			raid.stickyTarget += 0.5; // rebuild to allow travel back to target
		}

		raid.stickyTarget = limit(-20, raid.stickyTarget, 40);
	}
	

	global.stats['cpu.aiRaidHandler.raidNotRetreat'] += Game.cpu.getUsed()-init;


	if (!attackTarget && raid.targetFallback && Game.time > raid.targetFallback) {
		flags = _.filter(Object.keys(Game.flags), flag => ((Game.flags[flag].color == COLOR_BROWN)));
		for (let idx in flags){
			if (Game.flags[flags[idx]].pos.roomName !== raid.targetRoom) { continue; }
			raid.targetPos =  posSave(Game.flags[flags[idx]].pos)
		}
	}	
	

	if (attackTarget) {

		if (attackRange >= 3 && (_phalanxInDanger || !attackTarget.pos.myCombatStrengthLarger(4, power)) ) {
			siegeRange = 2;
		}		

		range = 0;
		if (!raid.snakeTravel) {
			let anchor = getCurrentAnchorCreep(offensiveCreeps);
			if (!anchor) {
				anchor = offensiveCreeps[0]
			}
			dest = attackTarget.pos.pullSiegeFormationCombatPhalanx(anchor, false, true, attackRange, attackTarget, siegeRange, power);
		} else {
			dest = attackTarget.pos.pullSiegeFormationCombat(offensiveCreeps[0]);
		}	
			
		if (!dest) {
			console.log("no siege pos?? " + attackTarget.pos)
			dest = attackTarget.pos;
			range = 1;
		}

	} else if (raid.targetPos){
		dest = posLoad(raid.targetPos)		 
		range = raid.targetRange || 3;
		log("using old pos " + raid.targetPos)

	} else if (Memory.rooms[raid.targetRoom] && Memory.rooms[raid.targetRoom].controller) {	
		dest = posDecompress(Memory.rooms[raid.targetRoom].controller.pos, raid.targetRoom)
		range = 5;
	}

	// RUN OFFENSIVE CREEPS		
	let phalanxMove;
	let outHealPotential = 0;
	for (let creepIdx in raid.allCreeps){
		init = Game.cpu.getUsed();		
		let creep = raid.allCreeps[creepIdx];
		let attacking;

		outHealPotential += calcSingleCreepStrength(creep).healPower;

		switch(creep._memory[C.ROLE]){			

			case R_COMBO:

				if (checkForSnipeTargets && !snipeTarget) {
					for (let idx in towers) {
						let tower = towers[idx];
						if (creep.pos.getRangeTo(tower) <= 3) {
							snipeTarget = tower;
							break;
						}
					}
				}


				if (snipeTarget && creep.pos.getRangeTo(snipeTarget) <= 3){
					attacking = creep.rangedAttackInRange(snipeTarget);	
				} else if (!allowFreeFire && attackTarget && creep.pos.getRangeTo(attackTarget) <= 3){
					attacking = creep.rangedAttackInRange(attackTarget);
				} else {
					attacking = creep.rangedAttackInRange();
				}

				if (creep.room._memory.numberOfTowers > 0 ||
					healReasons > 0
					){
					if (atFullHealth) {
						creep.heal(creep);
					} else {
						creep.healInRange(attacking);
					}					
				}
				break;

			case R_ATTACK:

				if (attackTarget && creep.pos.getRangeTo(attackTarget) <= 1){
					creep.attackOrDismantleInRange(attackTarget);
				} else {
					creep.attackOrDismantleInRange();
				}

				if (creep.hasBodyparts(RANGED_ATTACK)) {
					creep.rangedAttackInRange();
				}

				break;

			case R_HEALER:

				if (creep.room._memory.numberOfTowers > 0 ||
					healReasons > 0
				){						
					creep.healInRange(attacking);
				}
				break;
				
		}
		global.stats['cpu.aiRaidHandler.raidActions'] += Game.cpu.getUsed()-init;

		// GENERIC MOVE COMMAND
		init = Game.cpu.getUsed();
		if (creepIdx == 0) { 

			

			if (!raid.snakeTravel) {
				if (dest && !holdPos){
					// PHALANX MOVE
					phalanxMove = true;	// moving all other creeps from first creep		
					
					if (dest.roomName === raid.targetRoom) {
						raid.targetPos = posSave(dest);
						raid.targetRange = range || 1;
					}
	
					if (retreat) {
						dest = fallbackPos;
					}
	
					if (Game.rooms[raid.targetRoom] && outHealPotential) {
						getDangerExits(raid.targetRoom, outHealPotential)
					}
	
					let rotateTarget;
					if(attackTarget) {
						rotateTarget = attackTarget.pos;
					}
	
					let travelOptions =  {
						raidFlee: retreat, 
						ensurePath: true, 
						freshMatrix: true, 
						allowHostile: true, 
						allowSK: true, 
						range: range, 
						ignoreCreeps: true, 
						stuckValue: 3, 
						ignoreRoads: true, 
						roomCallback: raidPhalanx,
						raidDamage: raid.raidDamage,
						raidTargetRoom: raid.targetRoom,
						outHeal: outHealPotential * 2,
						rotateTarget: rotateTarget
					};
					
					creep.phalanxMove(dest, raid.allCreeps, travelOptions);
				}			
			} else {
				travelAsSnake(dest, raid.allCreeps);
			}
		} else {
		//	if (phalanxMove) { continue; }
		}
		global.stats['cpu.aiRaidHandler.raidphalanxMove'] += Game.cpu.getUsed()-init;

	} // END OFFENSIVE CREEPS LOOP
	
	let wallObject = Game.getObjectById(raid.wallTargetId);
	if (wallObject) {
		raid.wallHpCurrent = wallObject.hits;
	}	
}

function phalanxInDanger(phalanxCreeps) {

	if (phalanxCreeps.length <= 0) { return false;}

	let roomName = phalanxCreeps[0].pos.roomName;

	if (!Game.rooms[roomName]) { return false; }

//	let enemies = Game.rooms[roomName].find(FIND_HOSTILE_CREEPS);
	let enemies = getEnemyCreeps(roomName);	

	let towers = getEnemyTowers(roomName);
	/*
	let towers = _.filter(Game.rooms[roomName].findByType(STRUCTURE_TOWER), 
		function(c) {return (c.energy > 10 && !c.my);
		});*/

	for (let idx in phalanxCreeps) {
		let totalDamage = 0;
		let creep = phalanxCreeps[idx];
		let dmgCriticalDmg = creep.hitsMax * 0.10;

		let towerDamage = getTowerDamage(creep.pos, towers);
		totalDamage += towerDamage

		
		totalDamage += getCreepDamagePotential(creep.pos, enemies);
		let healing = getCreepHeal(creep, phalanxCreeps);
		let dmgTaken = effectiveDamage(creep.body, creep.hits, totalDamage, healing);

		if (dmgTaken > dmgCriticalDmg) {
			log("phalanx in danger! " + dmgTaken + "/" +dmgCriticalDmg + " total damage " + totalDamage)
			return true;
		}
	}

	return false;
}

function raidCanSnake(raid) {

	if (raid.snakeTravelTs && Game.time < raid.snakeTravelTs ) { return false; }

	let halfSquad = [];
	for (let idx in raid.combos) {
		halfSquad.push(raid.combos[idx])
		if (idx >=  raid.combos.length/2) { break;}
	}

	for (let idx in raid.healers) {
		halfSquad.push(raid.healers[idx])
		if (idx >=  raid.healers.length/2) { break;}
	}

	let criticalDmg = halfSquad[0].pos.phalanxChecCriticalDmgNextStep(halfSquad, halfSquad[0].pos.getDirectionTo[halfSquad[1].pos]);
	if (!criticalDmg) { 
		raid.snakeTravelTs = Game.time + 137;
		return true; 
	} 
}
/*
function raidPerformTypeClassic(raid){
	let offensiveCreeps = [];
	offensiveCreeps = offensiveCreeps.concat(raid.deconstructors);
	offensiveCreeps = offensiveCreeps.concat(raid.rangers);
	let healers = raid.healers;

	let attackTarget;	
	let targetPos =  posLoad(raid.targetPos);
	Game.rooms[raid.targetRoom].visual.circle(targetPos.x, targetPos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
	let roomName = raid.targetRoom;
	let wallTarget;


	if (raid.target && Game.rooms[roomName]) {
		attackTarget = Game.getObjectById(raid.target);
		if (!attackTarget) {
			delete raid.target;
		}
	}

	if (raid.wallsBreached && attackTarget.isStructure) { 
		if (attackTarget.structureType === STRUCTURE_WALL || attackTarget.structureType === STRUCTURE_RAMPART) {
			wallTarget = true;
		}
	}

	let nonRampartStructures = [];
	if (Game.rooms[roomName] ) {
		nonRampartStructures = Game.rooms[roomName].find(FIND_HOSTILE_STRUCTURES, {
		filter: (structure) => {
		return (structure.structureType !== STRUCTURE_CONTROLLER &&
				structure.structureType !== STRUCTURE_RAMPART &&
				!structure.pos.lookForStructure(STRUCTURE_RAMPART));
		}});
	}
		
	// DISPLAY TARGET
	if (attackTarget) {
		Game.rooms[raid.targetRoom].visual.circle(attackTarget.pos.x, attackTarget.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
	}

	// GET ENEMY CREEPS	
	let hostiles = [];
	let avoids = [];
	if (offensiveCreeps.length > 0 && Game.rooms[roomName]) {				
		hostiles = getEnemyCreeps(roomName);						
		for (let creep in hostiles){
			let hostileCreep = hostiles[creep];
			// FILTER OUT CREEPS UNDER RAMPARTS
			if (hostileCreep.pos.lookForStructure(STRUCTURE_RAMPART) && 
					(hostileCreep.getActiveBodyparts(ATTACK) > 10 || 
					hostileCreep.getActiveBodyparts(RANGED_ATTACK) > 10)) {

				let underRampart = hostiles.splice(creep, 1);
				avoids.push(underRampart);

				// CHECK IF TARGET IS IN RANGE OF RAMPART DEFENDER
				if (attackTarget && hostileCreep.pos.getRangeTo(attackTarget) <= 1) {
					delete raid.targets;
				}
			}
		}
	}

	// RETREAT?
	let retreat = false;
	let fallbackPos;
//	let fallbackRange = 5;
	for (let creepIdx in offensiveCreeps){
		let creep = offensiveCreeps[creepIdx];
		if (creep.hits < (creep.hitsMax * 0.8) ) {
			retreat = true;
			fallbackPos = pullIdlePosForRoom(raid.roomFallback);
		}
	}
	
	// FIND FORMATION
	let formationValidPos = [];
	if (attackTarget && offensiveCreeps.length > 0) {
		formationValidPos = attackTarget.pos.getSiegeFormation(offensiveCreeps[0].pos);
	}
	

	// ASSIGN POSITIONS
	let assignedDismantlers = 0;
	let dismantlerFormation = [];
	let assignedHealers = 0;
	let healerFormation = [];
	let assignedRanged = 0;
	let rangedFormation = [];
	for (let posIdx in formationValidPos){
		let currentPosInfo = formationValidPos[posIdx];

		if (assignedDismantlers < raid.deconstructors.length && currentPosInfo.range === 1) {
			dismantlerFormation.push(currentPosInfo.pos);
			assignedDismantlers++;
			continue;
		}

		if (assignedHealers < healers.length &&
			(currentPosInfo.range === 2 || assignedDismantlers >= raid.deconstructors.length )) {
			healerFormation.push(currentPosInfo.pos);
			Game.rooms[raid.targetRoom].visual.circle(currentPosInfo.x, currentPosInfo.y , {fill: 'transparent', radius: 0.50, stroke: 'green'});
			assignedHealers++;
			continue;
		}

		if (assignedRanged < raid.rangers.length) {						
			rangedFormation.push(currentPosInfo.pos);
			assignedRanged++;
			continue;
		}
	}

	
	if (!raid.raidDamage) {
		let power = calcCreepStrength(raid.allCreeps)
		raid.raidDamage = power.attackDamage + power.rangedAttackDamage + power.dismantlePower;
	}

	
	// RUN OFFENSIVE CREEPS	
	let travelOptions =  {ensurePath: true,  freshMatrix: true, allowHostile:true, allowSK:true, range:1, ignoreCreeps: true, stuckValue: 3, ignoreRoads: true, roomCallback: raidMatrix, raidDamage: raid.raidDamage};	
	for (let creepIdx in offensiveCreeps){
		let creep = offensiveCreeps[creepIdx];
		let formationPos;
		let range;
		let value;
		switch(creep._memory[C.ROLE]){	
			
			case R_DECON:
			
				formationPos = dismantlerFormation.splice(0,1);
				
			//	value = creep.dismantleInRange(attackTarget);
				value = creep.attackOrDismantleInRange(attackTarget);

				range = 1;
				travelOptions.range = range;
				travelOptions = {ensurePath: true,  freshMatrix: true, allowHostile:true, allowSK:true, range:1, ignoreCreeps: true, stuckValue: 3, ignoreRoads: true, roomCallback: raidMatrix, raidDamage: raid.raidDamage};
				break;	

			case R_RANGED: 

				// PULL FORMATION POS													
				formationPos = rangedFormation.splice(0,1);
				let localTarget = findRangedAttackTarget(creep, hostiles, nonRampartStructures);
			//	let inRangeHostiles = creep.pos.findInRange(hostiles, 3)
				if (localTarget) {
					creep.rangedAttackInRange(localTarget);
				} else {
					creep.rangedAttackInRange(attackTarget);
				} 
				travelOptions =  {ensurePath: true, freshMatrix: true, allowHostile:true, allowSK:true, range:3, ignoreCreeps: true, stuckValue: 3, ignoreRoads: true, roomCallback: raidMatrix, raidDamage: raid.raidDamage};
				range = 3;
				break;	
		}	


		// FLEE FROM RAMPART DEFENDERS
		if ( creep.raidAvoidDefenders(avoids) || creep._is_pushed ){
			continue;
		}
		
		// GENERIC MOVE COMMAND		
		
		let healersInRange = creep.pos.findInRange(raid.healers, 3);
		// NO HEALER IN RANGE, MOVE TOWARDS HEALER
		if (healersInRange.length === 0 && raid.healers.length > 0 && !creep.pos.isNearExit(0)) {
			let closestHealer = creep.pos.findClosestByRange(raid.healers);
			if (closestHealer){
				creep.travelTo(closestHealer.pos, travelOptions);
				continue;
			}
		} 

		// MOVE TO FORMATION
		if (formationPos[0]) {
		//	console.log(formationPos)
			travelOptions =  {ensurePath: true, freshMatrix: true, allowHostile:true, allowSK:true, range:0, ignoreCreeps: false, stuckValue: 3, ignoreRoads: true, roomCallback: raidMatrix, raidDamage: raid.raidDamage};
			creep.travelTo(formationPos[0], travelOptions);
			continue;
		} 

		// DONT STAND ON EXIT TILES
		if (creep.room.name === roomName && creep.pos.isNearExit(0) ){
			let openSpots = creep.pos.openAdjacentSiegeSpots(false);					
			if (openSpots.length > 0) {
			//	console.log(creep +" traveling to  " + openSpots[0] )
			//	Game.rooms[raid.targetRoom].visual.circle(openSpots[0].x, openSpots[0].y , {fill: 'transparent', radius: 0.50, stroke: 'orange'}) 	
				travelOptions =  {ensurePath: true, freshMatrix: true, allowHostile:true, allowSK:true, range:0, ignoreCreeps: true, stuckValue: 3, ignoreRoads: true, roomCallback: raidMatrix, raidDamage: raid.raidDamage};
				creep.travelTo(openSpots[0], travelOptions);
				continue;
			}
		}

		// GOT A TARGET TO ATTACK
		if (attackTarget) {
			if (creep.pos.getRangeTo(attackTarget) > range ) {
				creep.travelTo(attackTarget.pos, travelOptions);
			}
			continue;
		}

		// JUST MOVE TOWARDS THE LAST TARGET POS
		if (creep.room.name !== roomName ) {
			creep.travelTo(targetPos, travelOptions);
			continue;
		}
	} // END OFFENSIVE CREEPS LOOP


	// RUN HEALERS
//	let myHealTargets = getMyDamagedCreeps(roomName);
	for (let creepIdx in raid.healers){	
		let creep = raid.healers[creepIdx];			
		creep.healInRange();


		// FLEE FROM RAMPART DEFENDERS
		if ( creep.raidAvoidDefenders(avoids) || creep._is_pushed ){
			continue;
		}

		// MOVE TOWARDS FORMATION
		if (healerFormation.length > 0) {
			let dest = healerFormation[creepIdx];
			let travelInfo = {};
			creep.travelTo(dest, {ensurePath: true,  freshMatrix: true, allowHostile:true, allowSK:true, range:0, ignoreCreeps: true, stuckValue: 3, ignoreRoads: true, returnData: travelInfo, roomCallback: raidMatrix, raidDamage: raid.raidDamage});
			if (creep.pos.getRangeTo(dest) > 0 && travelInfo.nextPos) {								
				let blockingCreep = travelInfo.nextPos.lookForCreep();
				if (blockingCreep && blockingCreep._memory[C.ROLE] !== "R_DECON") {
					blockingCreep.move(blockingCreep.pos.getDirectionTo(creep));
				}
			}
			continue;
		}

		// MOVE TOWARDS OFFENSIVE CREEPS
		if (offensiveCreeps.length > 0 ) {
			let followIdx = creepIdx % offensiveCreeps.length;
			let dest;
			let openSpots = offensiveCreeps[followIdx].pos.openAdjacentSiegeSpots(false);	
			if (openSpots){
				dest = openSpots[0];
			} else {
				dest = offensiveCreeps[followIdx].pos;
			}
			let travelInfo = {};
			creep.travelTo(dest, {ensurePath: true,  freshMatrix: true, allowHostile:true, allowSK:true, range:0, stuckValue: 3, ignoreRoads: true, returnData: travelInfo, roomCallback: raidMatrix, raidDamage: raid.raidDamage});
			
			if (creep.pos.getRangeTo(dest) > 1 && travelInfo.nextPos) {								
				let blockingCreep = travelInfo.nextPos.lookForCreep();
				if (blockingCreep && blockingCreep._memory[C.ROLE] !== "R_DECON") {
					blockingCreep.move(blockingCreep.pos.getDirectionTo(creep));
				}
			}
			continue;
		} 
	}
						
	if (raid.allCreeps.length === 0 ||
		(roomIsSafeModed(roomName))
	) { 
		raid.state = STATE_END; 
		requestMemSave();
	}

	let wallObject = Game.getObjectById(raid.wallTargetId);
	if (wallObject) {
		raid.wallHpCurrent = wallObject.hits;
	}	
}
*/

global.activeRaidsOnTarget = function(targetRoom) {

	let count = 0;
	if (Memory.raids.activeTargets[targetRoom]) {
		let target = Memory.raids.activeTargets[targetRoom]
		for (let spawner in target.spawners) {
			count += target.spawners[spawner].raids;
		}
	}

	return count;
}

function raidStateEnd(raid){
	// RAID OVER, EVALUATE
	console.log(" raid ending, wall hp removed " + (raid.wallHpStart - raid.wallHpCurrent)   );

	// REASSIGN LEFT OVER CREEPS?

	raid.state = STATE_COMPLETE;
	requestMemSave();

	// ORDER FOLLOW UP RAID
	if (roomIsSafeModed(raid.targetRoom)) { 		
	//	addRaid(raid.targetRoom, Game.time + SAFE_MODE_DURATION);
	}
	
	// WALLS TAKEN OUT, REMOVE CONTROLLER OWNER
	if (raid.wallsBreached && !roomIsSafeModed(raid.targetRoom)) {				 		
	//	Memory.controllerAttack[raid.targetRoom] = {};
	}

	if (raid.canceled) {
		for (let creepIdx in raid.allCreeps){				
			let creep = raid.allCreeps[creepIdx];
			creep.recycleOrSuicide();
		}
	}
}

function travelAsSnake(targetPos, allCreeps) {

	let lastCreep = allCreeps.length - 1;
	let allReady = true;
	let returnData = {};

	let range = 0;
	if (allCreeps[lastCreep].fatigue) {
		range = 1;
	}

	for (let creepIdx in allCreeps){

		let creep = allCreeps[creepIdx];
		let me = creep.name;

		let allExceptMe = _.filter(allCreeps, (c) => c.name !== me );											
		let inRangeofGroup = creep.pos.findInRange(allExceptMe, 1);					
		if (((allExceptMe.length > 0 && inRangeofGroup.length < 1) || creep.fatigue) &&
			(!creep.pos.isNearExit(1) && (!roomIsCenter(creep.room.name) && !creep.pos.lookForStructure(STRUCTURE_PORTAL)))			
		){
			creep.say("wait for me!");
			allReady = false;
		}


		if (creepIdx == lastCreep) {

			if (allReady || 
				creep.pos.isNearExit(1) || 
				(roomIsCenter(creep.room.name) && creep.pos.lookForStructure(STRUCTURE_PORTAL))
			){
				creep.travelTo(targetPos, {allowSK: true, range:0, maxOps: 60000, ignoreRoads: true, ignoreCreeps: true, preferHighway: true, ensurePath: true, freshMatrix: true, returnData: returnData, snake: true, snakeCreeps: allCreeps});
				
			} 
			// Else wait

		} else {



			let nextIdx = Number(creepIdx)+1
			let nextCreep = allCreeps[nextIdx];
			if (nextCreep)
				if (creep.pos.getRangeTo(nextCreep) === 1) {
					creep.move(creep.pos.getDirectionTo(nextCreep))
					nextCreep.pull(creep);
				} else {
					creep.travelTo(nextCreep, {ensurePath: true, freshMatrix: true, maxOps: 1500, allowSK:true, range:0, ignoreRoads: true});
					creep.say("trv");					
			} else {
				creep.travelTo(allCreeps[lastCreep], {ensurePath: true, freshMatrix: true, allowSK:true, range:range, ignoreRoads: true});			
			}			
		}
	}

	return { leader: allCreeps[lastCreep], returnData: returnData}





}

function raidStateTravel(raid){

	if (raid.allCreeps.length === 0
		) { 
		raid.state = STATE_END; 
		requestMemSave();
		return;
	}
	
	for (let creepIdx in raid.allCreeps){
		let creep = raid.allCreeps[creepIdx];

		if (creep.hasBodyparts(RANGED_ATTACK) > 0) 	{ creep.rangedAttackInRange(); }
		if (creep.hasBodyparts(HEAL) > 0) 			{ creep.healInRange(); }
		if (creep.hasBodyparts(WORK) > 0) 			{ creep.dismantleInRange(); }
		if (creep.hasBodyparts(ATTACK) > 0) 		{ creep.meleeAttackInRange(); }
	}

	// MOVE TO TARGET	
	let targetPos = posLoad(raid.targetPos);
	let targetRoom = targetPos.roomName;
	let snakeData = travelAsSnake(targetPos, raid.allCreeps);

	let leaderCreepNextRoom = "";
	let posToCheck = 4;	
	if (snakeData.returnData && snakeData.leader) {

		if (snakeData.leader._cache._trav && snakeData.leader._cache._trav.path && snakeData.leader._cache._trav.path.length > posToCheck) {
			let nextPos = snakeData.leader.pos.getPositionAtDirectionWrapToNextRoom(Number(snakeData.leader._cache._trav.path[0]));
			for (let i=1; i < posToCheck; i++) {
				snakeData.leader.room.visual.circle(nextPos.x, nextPos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
				nextPos = nextPos.getPositionAtDirectionWrapToNextRoom(Number(snakeData.leader._cache._trav.path[i]));
				leaderCreepNextRoom = nextPos.roomName;
			}
		}
	}

	if (leaderCreepNextRoom === targetRoom || snakeData.leader.room.name === targetRoom ) {
		raid.state = STATE_RAID;
		requestMemSave();
	}
	
	/*
		let me = creep.name;
		let allExceptMe = _.filter(raid.allCreeps, (c) => c.name !== me );											
		let inRangeofGroup = creep.pos.findInRange(allExceptMe, 1);					
		if (allExceptMe.length > 0 && inRangeofGroup.length < 1 && 
			(!creep.pos.isNearExit(1) && (!roomIsCenter(creep.room.name) && !creep.pos.lookForStructure(STRUCTURE_PORTAL)))			
		){
			creep.say("wait for me!");
			allInRAnge = false;
		}

		if (creepIdx == lastCreep) {

			if (allInRAnge || 
				creep.pos.isNearExit(1) || 
				(roomIsCenter(creep.room.name) && creep.pos.lookForStructure(STRUCTURE_PORTAL))
			){
				let returnData = {};
				creep.travelTo(targetPos, {allowSK: true, range:0, maxOps: 60000, ignoreRoads: true, ignoreCreeps: true, preferHighway: true, ensurePath: true, freshMatrix: true, returnData: returnData});
				if (creep._cache._trav && creep._cache._trav.path && creep._cache._trav.path.length > posToCheck) {
					let nextPos = creep.pos.getPositionAtDirectionWrapToNextRoom(Number(creep._cache._trav.path[0]));
					for (let i=1; i < posToCheck; i++) {
						creep.room.visual.circle(nextPos.x, nextPos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
						nextPos = nextPos.getPositionAtDirectionWrapToNextRoom(Number(creep._cache._trav.path[i]));
						leaderCreepNextRoom = nextPos.roomName;
					}
				}
			} 
			// Else wait

		} else {

			let range = 0;
			if (raid.allCreeps[lastCreep].fatigue) {
				range = 1;
			}
			let nextIdx = Number(creepIdx)+1
			let nextCreep = raid.allCreeps[nextIdx];
			if (nextCreep)
				if (creep.pos.getRangeTo(nextCreep) === 1) {
					creep.move(creep.pos.getDirectionTo(nextCreep))
					nextCreep.pull(creep);
				} else {
					creep.travelTo(nextCreep, {ensurePath: true, freshMatrix: true, maxOps: 1500, allowSK:true, range:0, ignoreRoads: true});
					creep.say("trv");
			} else {
				creep.travelTo(raid.allCreeps[lastCreep], {ensurePath: true, freshMatrix: true, allowSK:true, range:range, ignoreRoads: true});
			//	creep.say(creepIdx)
			}			
		}
		if (creep.room.name === targetRoom || leaderCreepNextRoom == targetRoom ) {
			raid.state = STATE_RAID;
			requestMemSave();
		}
		*/

		
	
}

function raidStateRally(raid){
	
	if (raid.allCreeps.length === 0
		) { 
		raid.state = STATE_END;
		requestMemSave();
		return; 
	}


	// MOVE TO RALLY
	let rallyRoom = raid.rally[0].roomName;
	let targetPos = new RoomPosition(raid.rally[0].x, raid.rally[0].y, raid.rally[0].roomName);
	

	let creepsTravelling;
	for (let creepIdx in raid.allCreeps){
		let creep = raid.allCreeps[creepIdx];
		creep.notifyWhenAttacked(false);
		creep.travelTo(targetPos, {allowHostile:true, allowSK:true, range:3});
		if (creep.room.name !== rallyRoom || creep.pos.getRangeTo(targetPos) > 6 ) {
			creepsTravelling = true;
		} else {
			creep.yieldRoad(targetPos);
		}

		if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) 	{ creep.rangedAttackInRange(); }
		if (creep.getActiveBodyparts(HEAL) > 0) 			{ creep.healInRange(); }
	}
	if (!creepsTravelling) { 
		raid.state = STATE_TRAVEL; 
		requestMemSave();
	}
}

function raidStateBoost(raid){
	Game.rooms[raid.assignedRoom].setBoostMode(true, raid.boostRequest, 250);

	let creep;
	let creepType;
	let creepsBusyBoosting;
	let targetPos = new RoomPosition(raid.rally[0].x, raid.rally[0].y, raid.rally[0].roomName);

	for (let creepIdx in raid.allCreeps){

		creep = raid.allCreeps[creepIdx];
		if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) 	{ creep.rangedAttackInRange(); }
		if (creep.getActiveBodyparts(HEAL) > 0) 			{ creep.healInRange(); }
		if (creep.getActiveBodyparts(WORK) > 0) 			{ creep.dismantleInRange(); }

		if (!creep._memory.boostsApplied){
			creepType = creep._memory[C.ROLE];
			let requiredBoosts = raid.requiredCreeps[creepType].requiredBoost;
			let creepBoosting = false;
			for (let boostIdx in requiredBoosts) {
				let requiredBoost = requiredBoosts[boostIdx];						
				if( (!creep._memory.boosts || !creep._memory.boosts[requiredBoost]) && creep.applyBoost(requiredBoost, true)  ) { 
					creepBoosting = true;
					break;
				}
			}						
			if (creepBoosting === false){
				creep._memory.boostsApplied = true;
			} else {
				creepsBusyBoosting = true;
			}
		} else {
			creep.travelTo(targetPos, {allowHostile:true, allowSK:true, range:3});
			if (creep.room.name !== targetPos.roomName || creep.pos.getRangeTo(targetPos) > 5 ) {
				// let creepsTravelling = true;						
			} else {
				creep.yieldRoad(targetPos);
			}
		}
	}

	if (!creepsBusyBoosting) { 
		raid.state = STATE_RALLY; 
		requestMemSave();
	}
}

global._tempActiveRaidsSpawning = {};
global.activeRaidsSpawning = function(spawner) {

	if (global._tempActiveRaidsSpawningTs || Game.time !== global._tempActiveRaidsSpawningTs){
		
		global._tempActiveRaidsSpawningTs = Game.time;
		for (let id in Memory.raids) {
			let raid = Memory.raids[id];
			if (raid.state !== STATE_SPAWNING) { continue; }

			if (global._tempActiveRaidsSpawning[spawner] === undefined) { 
				global._tempActiveRaidsSpawning[spawner] = {};
				global._tempActiveRaidsSpawning[spawner].activeSpawners = 0;
			}

			global._tempActiveRaidsSpawning[spawner].activeSpawners++;
		}
	}		

	if (global._tempActiveRaidsSpawning[spawner]) {
		return global._tempActiveRaidsSpawning[spawner].activeSpawners;
	}
	return 0;
}

global.addActiveRaidCount = function(spawner, count = 1) {
	if (global._tempActiveRaidsSpawning[spawner] === undefined) { 
		global._tempActiveRaidsSpawning[spawner] = {};
		global._tempActiveRaidsSpawning[spawner].activeSpawners = 0;

		global._tempActiveRaidsSpawning[spawner].activeSpawners += count;
	}
}


function raidStateSpawning(raid){	
	// ABORT IF LOW ENERGY OR STUCK
	let ticksInSpawning = Game.time - raid.startTick;
	if (raid.allCreeps.length < raid.allCreepsCount &&
		((Game.rooms[raid.assignedRoom].store(RESOURCE_ENERGY) < 5000 && ticksInSpawning > 750) || ticksInSpawning > 1500)
	) {
		raid.canceled = true;
		raid.state = STATE_END;
		requestMemSave();

		for (let idx in raid.allCreeps) {

			let orphanCreep = raid.allCreeps[idx];

			let creepReassigned = false;
									
			// pass ownership of current creeps to other spawning raids
			for (let id in Memory.raids) {
				let otherRaid = Memory.raids[id];
				if (otherRaid.state !== STATE_SPAWNING) { continue; }
				if (otherRaid.assignedRoom !== raid.assignedRoom) { continue; }		

				for (let creepType in otherRaid.requiredCreeps) {

					if (orphanCreep._memory[C.ROLE] !== creepType) { continue; }

					let currentCreeps = _.filter(getCreeps(R_ATTACK), (creep) => creep._memory.raidId === id);
					if (currentCreeps.length >= otherRaid.requiredCreeps[creepType].reqNumber) { continue; }

					let creepMatch = true;
					for (let requestedBodyPart in otherRaid.requiredCreeps[creepType].body) {
						if (orphanCreep.hasBodyparts(requestedBodyPart) !== otherRaid.requiredCreeps[creepType].body) {
							creepMatch = false;
							break;
						}
					}
					if (creepMatch) {
						orphanCreep._memory.raidId = id;
						creepReassigned = true;
						addCreepToCache(orphanCreep.name, orphanCreep._memory[C.ROLE], orphanCreep._memory[C.ROOM_ORIGIN]);
						break;
					}
				}
				if (creepReassigned) { break; }				
			}

			if (!creepReassigned) {
				orphanCreep.recycleOrSuicide();
			}
		}

		requestMemSave();
		return;
	}


	// WAITING FOR CREEPS TO SPAWN, REFRESH TTL? 
	Game.rooms[raid.assignedRoom].setBoostMode(true, raid.boostRequest);
	let spawn = Game.rooms[raid.assignedRoom].findByType(STRUCTURE_SPAWN);
	let allCreepsSpawned = true;
	for (let creepIdx in raid.allCreeps){
		let creep = raid.allCreeps[creepIdx];
		if (creep.spawning) { 
			allCreepsSpawned = false;
			continue; 
		}
		// REFRESH TTL
		if (creep.ticksToLive < 1450) {
			let idleSpawns = _.filter(spawn, (c) => !c.spawning );						
			if (idleSpawns.length > 0) {
				if (creep.pos.getRangeTo(idleSpawns[0]) > 1) {
					creep.travelTo(idleSpawns[0]);
				} else {
					idleSpawns[0].renewCreep(creep);
				}
			}
		} else {
		//	creep.yieldRoad(spawn[0].pos, true, 5);
			creep.idleOffRoad(spawn[0].pos)
		}
	}

	if (raid.allCreeps.length >= raid.allCreepsCount && allCreepsSpawned) { 
		raid.state = STATE_REFRESH_TTL; 
		requestMemSave();
	}
}

function raidStateRefreshTTL(raid){

	// ABORT IF LOW ENERGY OR STUCK
	let ticksInSpawning = Game.time - raid.startTick;
	if (raid.allCreeps.length < raid.allCreepsCount &&
		((Game.rooms[raid.assignedRoom].store(RESOURCE_ENERGY) < 5000 && ticksInSpawning > 1750) || ticksInSpawning > 3500)
	) {
		raid.canceled = true;
		raid.state = STATE_END;
		requestMemSave();
		return;
	}


	Game.rooms[raid.assignedRoom].setBoostMode(true, raid.boostRequest);
	let idleSpawns = _.filter(Game.rooms[raid.assignedRoom].findByType(STRUCTURE_SPAWN), (c) => !c.spawning );
	if (idleSpawns.length === 0) {return; }
	let lowestTTL;
	let refreshing = 0;
	let creepsRefreshing = 0;
	let obstacle = [] 
	obstacle.push(Game.rooms[raid.assignedRoom].getCranePos());
	for (let creepIdx in raid.allCreeps){
		let creep = raid.allCreeps[creepIdx];
					
		// REFRESH TTL
		let requiredTTL = Math.min(1450, CREEP_LIFE_TIME - Math.floor(600/creep.body.length));
		creep._requiredTTL = requiredTTL;
		creepsRefreshing += 1;
		let spawnIdx = creepsRefreshing % idleSpawns.length;
	//	console.log("required ttl " + requiredTTL + " / " + creep.ticksToLive)
		if (creep.ticksToLive < requiredTTL) {
			refreshing++;				
			// MOVE TO A SPAWN				
			creep.travelTo(idleSpawns[spawnIdx].pos.pullSiegeFormation(creep.pos), {ignoreCreeps: true, range: 0, obstacles: obstacle});
		} else {
			creep.yieldRoad(idleSpawns[spawnIdx].pos, true, 5);
		}
	}
//	console.log("raid renew creeps left needing refresh " +creepsRefreshing)
	for (let spawnIdx in idleSpawns){
		let spawn = idleSpawns[spawnIdx];
		let creepsInRange = spawn.pos.findInRange(raid.allCreeps, 1);		
		let lowestCreep;
		for (let creepIdx in creepsInRange){
			let creep = creepsInRange[creepIdx];
			if (creep.ticksToLive < creep._requiredTTL) {
				lowestTTL = creep.ticksToLive;
				lowestCreep = creep;
				break;
			}
		}
	//	console.log(lowestCreep)
		if (!lowestCreep) { continue; }
		spawn.renewCreep(lowestCreep);	
	}
			
	if (!refreshing) {
		raid.spawnComplete = true;
		raid.state = STATE_BOOST;
		requestMemSave();
	}
}

function raidFindNextTargetForRaid(raid, currentRoom){
	
//	let creeps = raid.allCreeps
	let maxDist = raid.allCreeps[0].ticksToLive * 50;

	let playerName = getPlayerByRoomName(raid.targetRoom);
	let nextTarget;
	let bestTargetScore = -9999;
	
	if (!ALLIES[playerName] && Memory.players[playerName] && Memory.players[playerName].ownedRooms ) {
		
		for (let roomName in Memory.players[playerName].ownedRooms) {

			if (currentRoom === roomName) { continue; }
			let score = 0;	// Higher is better target
		//	let roomIntel = Memory.players[playerName].ownedRooms[roomName];
			if (!Memory.rooms[roomName]) { continue; }

			if (roomIsSafeModed(roomName) ) { continue; }
			// Room down and occupied by someone else
			if (getRoomPRCL(roomName) === 0 || (Memory.rooms[roomName].isPlayer && Memory.rooms[roomName].isPlayer !== Memory.rooms[roomName].player)) {				
				continue;
			}

			let range = getRouteDistanceOnly(roomName, currentRoom, { restrictDistance: maxDist, allowSK: true });
			if (range >= maxDist) { continue; }

			score -= (range/maxDist);

			if(score > bestTargetScore) {
				score = bestTargetScore;
				nextTarget = roomName;
			}
		}
	}

	if (nextTarget) {
		log("reassinged raid to " + nextTarget)
		raid.reassigned = raid.targetRoom;
		raid.targetRoom = nextTarget;
		raid.state = STATE_TRAVEL;		
		delete raid.targetPos;
		raid.targetPos = posSave(pullIdlePosForRoom(raid.targetRoom));
		delete raid.target;
		requestMemSave();
	}
}

global.countMySpawningRaids = function(spawner) {
	let cnt = 0;
	for (let id in Memory.raids) {
		let state = Memory.raids[id].state 
		if (Memory.raids[id].assignedRoom === spawner &&
			(state === STATE_SPAWNING || state === STATE_REFRESH_TTL || state === STATE_BOOST)
		) {
			cnt++;
		}
	}
	return cnt
}

global.countMyActiveRaids = function(spawner) {
	let cnt = 0;
	for (let id in Memory.raids) {
		let state = Memory.raids[id].state 
		if (Memory.raids[id].assignedRoom === spawner &&
			(state === STATE_SPAWNING || state === STATE_REFRESH_TTL || state === STATE_BOOST || state === STATE_TRAVEL || state === STATE_RAID)
		) {
			cnt++;
		}
	}
	return cnt
}

function getBoostAmount(compund, requiredCreeps) {
	let bodyPart = BODYPART_FROM_BOOST[compund];	
	let amount = 0;

	for (let creepType in requiredCreeps) {

		if (Array.isArray(requiredCreeps[creepType].body) ) {
			for (let idxBodyPart in requiredCreeps[creepType].body) {
				if (requiredCreeps[creepType].body[idxBodyPart] !== bodyPart) { continue; }
				amount += LAB_BOOST_MINERAL * requiredCreeps[creepType].reqNumber;
			}
		} else {
			for (let usedBodyPart in requiredCreeps[creepType].body) {
				if (usedBodyPart !== bodyPart) { continue; }
				amount += requiredCreeps[creepType].body[usedBodyPart] * LAB_BOOST_MINERAL * requiredCreeps[creepType].reqNumber;
			}
		}
			
	}

	log(bodyPart + " required " + amount)

	return amount;
}

function raidStateInit(raid){	

	if (!raid.assignedRoom) {

		if (!Game.rooms[raid.targetRoom]) {
			let targetPlayer = getPlayerByRoomName(raid.targetRoom);
			if (!targetPlayer || !Memory.players[targetPlayer] || !Memory.players[targetPlayer].ownedRooms[raid.targetRoom]){
				// Needs vision to create body, added by flag on mmo out of range?
				requestRoomVision(raid.targetRoom);
				return; 
			}
		}

		// FIND CLOSEST CAPABLE ROOM
		let myRooms = getMyRooms();

		let shortestDist = 25;
		let bestRoom = '';
		let bestScore = Infinity;
		let reqSpawn = limit(Memory.myRoomHighPRCL, 4, 7);
		let minimumEco = ECONOMY_DEVELOPING

		if (raid.test) {
			minimumEco = ECONOMY_CRASHED;
			reqSpawn = 3;
		}

		for (let roomName in myRooms){
			if (Game.rooms[roomName].controller.level < reqSpawn) { continue; }
			if (Game.rooms[roomName].energyStatus() < minimumEco) { continue; }
		//	if (!Game.rooms[roomName].boostsAvailable( [T3_HEAL, T3_TOUGH, T3_MOVE, T3_DISMANTLE] ) ) { continue }	// ASSUME BOOSTS WILL BE SENT IN TIME
			if (getRoomLinearDistance(roomName, raid.targetRoom) > 15) { continue; }
			let dist = getRouteDistanceOnly(roomName, raid.targetRoom);
			if (dist > shortestDist) { continue; }

			// low score is better
			let score = dist / shortestDist;
			let PRCLscore = (8 - getRoomPRCL(roomName)) * 0.5;

			score += PRCLscore;

			if (PUSH_RCL_TARGETS[roomName]) { score *= 2; }

			/*
			if (Memory.raids.activeTargets[raid.targetRoom] && 
				Memory.raids.activeTargets[raid.targetRoom].spawners &&				
				Memory.raids.activeTargets[raid.targetRoom].spawners[roomName]
			) {
				score *= 1.5; // add half my score!
			}*/
			let activeSpawner = countMySpawningRaids(roomName);
			if (activeSpawner >= 2) { continue; }
			score += activeSpawner;
			

			if (score < bestScore) {
				bestScore = score;
				bestRoom = roomName;
			}
		}		

		if (!bestRoom || roomIsSafeModed(raid.targetRoom) > 500) { 						
			console.log("Assigning raid failed! no suitable room found for target " + raid.targetRoom );	
			raid.state = STATE_COMPLETE;
			raid.noRoom = true;
			requestMemSave();
			return;
		}
		raid.assignedRoom = bestRoom;
	}

	raid.attId = createAttackId();	
	console.log("Assigning Raid: Target room " + raid.targetRoom + " from " + raid.assignedRoom);

	// SET TARGET POS IF MISSING
	if (!raid.targetPos){
		raid.targetPos = posSave(pullIdlePosForRoom(raid.targetRoom));
	}

	// COUNT ALL CREEPS
	raid.allCreepsCount = 0;
	for (let creepType in raid.requiredCreeps) {
		raid.allCreepsCount += raid.requiredCreeps[creepType].reqNumber;
	}
	
	// CHECK IF BOOSTS AVAILABLE, IF NOT CREATE DIFFERENT BODY
	if (raid.raidType === RAID_TYPE_PHALANX) {
		if (raid.boostRequest !== undefined && empireHasBoosts(raid.boostRequest)  ) {
			
		} else {
			// Create Custom body + boost request
			let combo
			if (raid.raidRequest) {
				combo = raid.raidRequest


			} else {
				combo = createComboBody(raid.targetRoom, raid.assignedRoom, raid.boostTier || 3);
			}

			if (combo.body) {

				
				raid.requiredCreeps[R_COMBO].body = combo.body;
				raid.requiredCreeps[R_COMBO].requiredBoost = combo.boosts;
				raid.boostRequest = {};

				for (let idx in combo.boosts) {
					let compund = combo.boosts[idx];
					raid.boostRequest[compund] = Math.min(3000, getBoostAmount(compund, raid.requiredCreeps)) || 3000;					
				}

			} else if (!raid.unBoosted) {
				raid.canceled = true;
				raid.state = STATE_COMPLETE;
				requestMemSave();
				return;
			}
		}
	} else if (raid.raidType === RAID_TYPE_PHALANX_ATTACKERS) {	
		let dismantlerSquad = createDismantlerSquadBodies(raid.targetRoom, raid.assignedRoom, 4, false, raid.boostTier || 3);

		if (dismantlerSquad.attackerParts) {

			raid.requiredCreeps[R_ATTACK].body = dismantlerSquad.attackerParts;
			raid.requiredCreeps[R_ATTACK].requiredBoost = dismantlerSquad.attackerBoosts;	
			raid.requiredCreeps[R_ATTACK].rotation = FRONT;
			
			raid.requiredCreeps[R_HEALER].body = dismantlerSquad.healerParts;
			raid.requiredCreeps[R_HEALER].requiredBoost = dismantlerSquad.healerBoosts;		
			raid.requiredCreeps[R_HEALER].rotation = BACK;
	
			raid.boostRequest = {};
			for (let idx in dismantlerSquad.boosts) {
				let compund = dismantlerSquad.boosts[idx];
			//	raid.boostRequest[compund] = 3000;	// count body parts?
				raid.boostRequest[compund] = Math.min(3000, getBoostAmount(compund, raid.requiredCreeps)) || 3000;
			}
		} else {
			raid.canceled = true;
			raid.state = STATE_COMPLETE;
			requestMemSave();
			return;
		}

	} else if (raid.raidType === RAID_TYPE_PHALANX_DECONSTRUCT) {	
		let dismantlerSquad = createDismantlerSquadBodies(raid.targetRoom, raid.assignedRoom, 4, true, raid.boostTier || 3);

		if (dismantlerSquad.attackerParts) {

			JSON.stringify(dismantlerSquad)
			raid.requiredCreeps[R_ATTACK].body = dismantlerSquad.attackerParts;
			raid.requiredCreeps[R_ATTACK].requiredBoost = dismantlerSquad.attackerBoosts;	
			raid.requiredCreeps[R_ATTACK].rotation = FRONT;
			
			raid.requiredCreeps[R_HEALER].body = dismantlerSquad.healerParts;
			raid.requiredCreeps[R_HEALER].requiredBoost = dismantlerSquad.healerBoosts;		
			raid.requiredCreeps[R_HEALER].rotation = BACK;
	
			raid.boostRequest = {};
			for (let idx in dismantlerSquad.boosts) {
				let compund = dismantlerSquad.boosts[idx];
			//	raid.boostRequest[compund] = 3000;	// count body parts?
				raid.boostRequest[compund] = Math.min(3000, getBoostAmount(compund, raid.requiredCreeps)) || 3000;
			}
		} else {
			raid.canceled = true;
			raid.state = STATE_COMPLETE;
			requestMemSave();
			return;
		}	



	} else {
		// COUNT REQUIRED BOOSTS
		raid.boostRequest = requiredBoostForRaid(raid.requiredCreeps);
	}

	// COUNT ALL CREEPS
	raid.allCreepsCount = 0;
	for (let creepType in raid.requiredCreeps) {
		raid.allCreepsCount += raid.requiredCreeps[creepType].reqNumber;
	}
	
	// SET RALLY POSITION
	raid.rally = [];
	raid.rally.push(getRallyPoint(raid.assignedRoom, posLoad(raid.targetPos)));

	// SET SPAWNING STATE
	raid.state = STATE_SPAWNING;
	requestMemSave();
	
} 


global.addRaid = function(targetRoom, options = {} ){

	let startTick = options.startTick || Game.time;

	requestMemSave();

	Memory.raids.raidCounter ++;
	let raidId = Memory.raids.raidCounter + "-" + targetRoom;

	// CREATE RAID INFORMATION
	Memory.raids[raidId] = {};
	Memory.raids[raidId].raidId = raidId;

	Memory.raids[raidId].flagName = options.flagName;

	Memory.raids[raidId].startTick = startTick;					
	Memory.raids[raidId].targetRoom = targetRoom;
	Memory.raids[raidId].assignedRoom = options.spawner || undefined;
	Memory.raids[raidId].raidType = options.raidType || RAID_TYPE_PHALANX;
	Memory.raids[raidId].waves = options.waves || 1;
	Memory.raids[raidId].requestedBy = options.requestedBy;
	Memory.raids[raidId].test = options.test;
	Memory.raids[raidId].boostTier = options.boostTier || 3;
	Memory.raids[raidId].raidRequest = options.raidRequest

	if (options.targetPos) {
		Memory.raids[raidId].targetPos = posSave(options.targetPos);
	}

	// UPDATE ACTIVE RAIDS
//	if (Memory.raids.activeTargets[targetRoom] === undefined) { Memory.raids.activeTargets[targetRoom] = {}; }
//	Memory.raids.activeTargets[targetRoom].raidType = Memory.raids[raidId].raidType;	 

	// WHAT CREEPS TO ADD
	Memory.raids[raidId].requiredCreeps = {};
	
	switch(Memory.raids[raidId].raidType) {
		case RAID_TYPE_CLASSIC:
		
			Memory.raids[raidId].requiredCreeps[R_HEALER] = {};
			Memory.raids[raidId].requiredCreeps[R_HEALER].reqNumber = 3;		
			Memory.raids[raidId].requiredCreeps[R_HEALER].body = {tough: 15, heal: 25, move: 10 };		
			Memory.raids[raidId].requiredCreeps[R_HEALER].requiredBoost = [T3_MOVE, T3_TOUGH, T3_HEAL];			
		
			Memory.raids[raidId].requiredCreeps[R_RANGED] = {};
			Memory.raids[raidId].requiredCreeps[R_RANGED].reqNumber = 2;		
			Memory.raids[raidId].requiredCreeps[R_RANGED].body = {tough: 15, ranged_attack: 25, move: 10 };		
			Memory.raids[raidId].requiredCreeps[R_RANGED].requiredBoost = [T3_MOVE, T3_TOUGH, T3_RANGED_ATTACK];
	
			Memory.raids[raidId].requiredCreeps[R_DECON] = {};
			Memory.raids[raidId].requiredCreeps[R_DECON].reqNumber = 3;
			Memory.raids[raidId].requiredCreeps[R_DECON].body = {tough: 15, work: 25, move: 10 }; 	
			Memory.raids[raidId].requiredCreeps[R_DECON].requiredBoost = [T3_MOVE, T3_TOUGH, T3_DISMANTLE];
		

			break;
		case RAID_TYPE_PHALANX:		

			Memory.raids[raidId].requiredCreeps[R_COMBO] = {};
			Memory.raids[raidId].requiredCreeps[R_COMBO].reqNumber = 4;	

			if (options.test){
			
				Memory.raids[raidId].requiredCreeps[R_COMBO].body = [RANGED_ATTACK, MOVE];
				Memory.raids[raidId].boostRequest = {};
				Memory.raids[raidId].unBoosted = true;

			} else if (!options.unBoosted) {				
				// FULL OFFENSE
				// Calc after assigned spawner

			} else {
				// FALLBACK TO UNBOOSTED
				Memory.raids[raidId].requiredCreeps[R_COMBO].body = {ranged_attack: 3, move: 5, heal: 2, };
				Memory.raids[raidId].boostRequest = {};
				Memory.raids[raidId].unBoosted = true;
			}
			
			break;

		case RAID_TYPE_PHALANX_ATTACKERS:

			Memory.raids[raidId].requiredCreeps[R_ATTACK] = {};
			Memory.raids[raidId].requiredCreeps[R_ATTACK].reqNumber = 2;

			Memory.raids[raidId].requiredCreeps[R_HEALER] = {};
			Memory.raids[raidId].requiredCreeps[R_HEALER].reqNumber = 2;	

			break;

		case RAID_TYPE_PHALANX_DECONSTRUCT:

			Memory.raids[raidId].requiredCreeps[R_ATTACK] = {};
			Memory.raids[raidId].requiredCreeps[R_ATTACK].reqNumber = 2;

			Memory.raids[raidId].requiredCreeps[R_HEALER] = {};
			Memory.raids[raidId].requiredCreeps[R_HEALER].reqNumber = 2;	

			break;
	}
	/*
	// FORMATION?
					^	
	Memory.raids[raidId].formation = [
		[R_DECON, R_DECON, R_DECON],
		[R_HEALER, R_EMPTY, R_HEALER],
		[R_RANGED, R_RANGED, R_RANGED]
	]*/

	Memory.raids[raidId].state = STATE_PRE;
};

global.checkForChangedStructureCount = function(roomName) {

	if (!global.StrucutreCount[roomName] || Game.time > global.StrucutreCount[roomName].ts) {
		
		let structures = Game.rooms[roomName].find(FIND_STRUCTURES, {
			filter: (structure) => {
			return (structure.structureType !== STRUCTURE_ROAD);
		}});
		
		if (global.StrucutreCount[roomName] && global.StrucutreCount[roomName].cnt !== structures.length) {

			// Changed and had a previous value
			let prevTick = Game.time - 1;

			// If changed invalidate caches
			if (Memory.rooms[roomName]._breachPosPhalanxTs) { Memory.rooms[roomName]._breachPosPhalanxTs = prevTick; }
			if (Memory.rooms[roomName]._breachPosTs) { Memory.rooms[roomName]._breachPosTs = prevTick; }

			Memory.rooms[roomName].destroyedStructure = 1;

			// Just the rooms ?
			global.getOutsidePixels = {};
			global.raidPhalanxCm = {};
			global.getPhalanxMatrixCm = {};	

			global._isPassibleCache = {};

			// Store result
			global.StrucutreCount[roomName] = {};
			global.StrucutreCount[roomName].ts = Game.time;
			global.StrucutreCount[roomName].cnt = structures.length;
			global.StrucutreCount[roomName].changedCnt = true;

		} else {

			// Store result
			global.StrucutreCount[roomName] = {};
			global.StrucutreCount[roomName].ts = Game.time;
			global.StrucutreCount[roomName].cnt = structures.length;
		}		
	}

	return global.StrucutreCount[roomName].changedCnt;	
}

global.hasBreachedWalls = function(roomName, phalanx = false){	
	if (!Game.rooms[roomName]) { return false; }

	if (phalanx) {
		if (Memory.rooms[roomName]._breachPosPhalanxTs && Game.time > Memory.rooms[roomName]._breachPosPhalanxTs) {
			delete Memory.rooms[roomName]._breachPosPhalanxTs;
			delete Memory.rooms[roomName]._breachPosPhalanx;
		}

		if (Memory.rooms[roomName]._breachPosPhalanx) {
			return posDecompress(Memory.rooms[roomName]._breachPosPhalanx, roomName);
		}

	} else {
		if (Memory.rooms[roomName]._breachPosTs && Game.time > Memory.rooms[roomName]._breachPosTs) {
			delete Memory.rooms[roomName]._breachPosTs;
			delete Memory.rooms[roomName]._breachPos;
		}
		if (Memory.rooms[roomName]._breachPos) {
			return posDecompress(Memory.rooms[roomName]._breachPos, roomName);
		}
	}

	// FIND KEY STRUCTURES	
	
	let priTargets;

	if (roomIsSk(roomName)) {
		priTargets = {
			[STRUCTURE_INVADER_CORE] : {},
		}
	} else {
		priTargets = {
			[STRUCTURE_SPAWN] : {},		
			[STRUCTURE_TOWER] : {},
			[STRUCTURE_TERMINAL] : {},
			[STRUCTURE_STORAGE] : {},
		};
	}

	let keyStructures = [];
	for (let type in priTargets) {
		
		let targetPrioritized = _.filter(Game.rooms[roomName].find(FIND_STRUCTURES),
			function (c) {
				return (c.structureType === type);
			});
	//	log(roomName + " getAttackTarget found priority targets " + targetPrioritized.length + " of type " + type);	
		if (targetPrioritized.length > 0) {
			for (let idx2 in targetPrioritized) {
				keyStructures.push(targetPrioritized[idx2].pos)
			}
			break;
		}
	}

	let cm;
	if (phalanx){
		cm = raidPhalanx
	}

	if (keyStructures.length > 0) {
		let obstacles = [];
		if (Game.rooms[roomName].controller && Game.rooms[roomName].controller.my) {
			obstacles = Game.rooms[roomName].find(FIND_STRUCTURES, {
				filter: (structure) => {
				return (structure.structureType === STRUCTURE_RAMPART);
				}});
		}

		let exits = Game.rooms[roomName].findReducedExits();
		for (let exit in exits){
			for (let struct in keyStructures) {
				let pathToSpawn = findTravelPath(exits[exit], keyStructures[struct],
					{range: 1, ignoreCreeps: true, freshMatrix: true, maxRooms: 1, obstacles: obstacles, roomCallback: cm, retry: false}); 
				if (!pathToSpawn.incomplete) {
					console.log(" breach at " + exits[exit] + " to " + keyStructures[struct]);
					Memory.rooms[roomName]._breachPos = posCompress(exits[exit]);
					Memory.rooms[roomName]._breachPosTs = Game.time + 50;

					if (phalanx) {
						Memory.rooms[roomName]._breachPosPhalanxTs = Game.time + 50;
						Memory.rooms[roomName]._breachPosPhalanx = posCompress(exits[exit]);
					}
					requestMemSave();
					return exits[exit];
				}
			}
		}

		if (!phalanx) {
			delete Memory.rooms[roomName]._breachPos;
		}

		delete Memory.rooms[roomName]._breachPosPhalanx;
		requestMemSave();
		return false;
	} else {
		if (Game.rooms[roomName] && Game.rooms[roomName].controller) {
			return Game.rooms[roomName].controller.pos;
		}
	}

};

global.setOutsidePixelsRaid = function(roomName, origin, phalanx=false){
	let id = roomName+phalanx;
	if (global.getOutsidePixels[id] === undefined ||
		Game.time > global.getOutsidePixels[id].ts
	){
		global.getOutsidePixels[id] = {};
		let cache = global.getOutsidePixels[id]
		cache.ts = Game.time + 31;
		cache.zones = []
		cache.posTested = {};		

		let cm; 
		if (phalanx) {
		//	cm = phalanxTransform(cm);
			cm = phalanxTransform(setWalkablePhalanxCosts(roomName));

		} else {
			cm = setWalkablePhalanxCosts(roomName);
		}

	//	displayCostMatrix(cm, roomName)

		let exits = Game.rooms[roomName].findReducedExits();

		for (let exit in exits) {
			if (!cache.posTested[posCompress(exits[exit])]) {
				cache.zones.push({pos: {}, exit: true })
			} else {
				continue;
			}

			setConnectedPixelsRaid(cache.posTested, cache.zones[cache.zones.length-1], exits[exit], cm, phalanx);	
		}

		if (!cache.posTested[posCompress(origin)]) {
			cache.zones.push({pos: {} })
		}
		setConnectedPixelsRaid(cache.posTested, cache.zones[cache.zones.length-1], origin, cm, phalanx);
		
		delete global.getOutsidePixels[id].posTested;
	}
};

// reachableRaidPos(new RoomPosition(13, 30, "E3N5"), new RoomPosition(32, 20, "E3N5"), true)

global.setConnectedPixelsRaid = function(posTested, zone, pos, cm, phalanx, lastPassed=false) {
	let id = posCompress(pos);
	if (!posTested[id]) {
		posTested[id] = {};

		// Can reach this pos (range 0)	
		zone.pos[posCompress(pos)] = {};
		
		if (Game.rooms[pos.roomName]) {
		//	Game.rooms[pos.roomName].visual.text("R", pos.x, pos.y, {color: 'green', font: 0.5});
		}

		if (lastPassed) { return; }

		let value = cm.get(pos.x, pos.y);

		let last = false;
		if (value === 255) { // THIS IS OUTSIDE
			last = true;
			if (!phalanx || !lastPassed) { return; }
			return;
		}
			
		// TEST ALL CONNECTED PIXELS
		if (!last || !phalanx) {
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(TOP_RIGHT), cm, phalanx, last);
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(RIGHT), cm, phalanx, last);
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(BOTTOM), cm, phalanx, last);
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(BOTTOM_LEFT), cm, phalanx, last);
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(BOTTOM_RIGHT), cm, phalanx, last);
		}

		setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(TOP), cm, phalanx, last);
		setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(TOP_LEFT), cm, phalanx, last);
		setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(LEFT), cm, phalanx, last);

		if (phalanx) {
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(TOP).getPositionAtDirection(TOP), cm, phalanx, last);
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(TOP).getPositionAtDirection(TOP_RIGHT), cm, phalanx, last);
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(TOP_LEFT).getPositionAtDirection(TOP_LEFT), cm, phalanx, last);
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(TOP_LEFT).getPositionAtDirection(LEFT), cm, phalanx, last);
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(TOP_LEFT).getPositionAtDirection(TOP), cm, phalanx, last);
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(LEFT).getPositionAtDirection(LEFT), cm, phalanx, last);
			setConnectedPixelsRaid(posTested, zone, pos.getPositionAtDirection(LEFT).getPositionAtDirection(BOTTOM_LEFT), cm, phalanx, last);
		}
				
	}
};

global.isOutsidePixelRaidXY = function(x, y, roomName, phalanx){	
	let id = roomName+phalanx;
	
	if (global.getOutsidePixels && global.getOutsidePixels[id]) {
		let zones = global.getOutsidePixels[id].zones
		for (let idx in zones) {
			if (!zones[idx].exit) { continue; }
			if (zones[idx].pos[posCompressXY(x, y)]) { return true }
		}
	}
};

global.isOutsidePixelRaid = function(pos, origin, phalanx){	
	let id = pos.roomName+phalanx;
	if (global.getOutsidePixels && global.getOutsidePixels[id]) {
		let zones = global.getOutsidePixels[id].zones
		for (let idx in zones) {
			if (zones[idx].pos[posCompress(origin)] && zones[idx].pos[posCompress(pos)]) { return true }
		}
	}
};

global.reachableRaidPos = function(pos, origin, phalanx=false){
	
	let roomName = pos.roomName;

	if (phalanx) {
		if (Memory.rooms[roomName] && Memory.rooms[roomName]._breachPosPhalanx && Game.time < Memory.rooms[roomName]._breachPosPhalanxTs) { return true; }
	} else {
		if (Memory.rooms[roomName] && Memory.rooms[roomName]._breachPos && Game.time < Memory.rooms[roomName]._breachPosTs) { return true; }
	}

	let id = roomName + phalanx;
	if (!global.getOutsidePixels[id] || Game.time > global.getOutsidePixels[id].ts) { 

		if (Game.rooms[roomName] && 
			((Game.rooms[roomName].controller && !Game.rooms[roomName].controller.my) || 
			checkForInvaderCore(roomName))
		){
			setOutsidePixelsRaid(roomName, origin, phalanx);
		} else {
			return true;
		}
	}
	return isOutsidePixelRaid(pos, origin, phalanx);
}

function setAvoidAround(cm, _registeredPos, pos, roomName, range = 4) {

	cm.set(pos.x, pos.y, 254);
	Game.rooms[roomName].visual.text("A", pos.x, pos.y, {color: 'red', font: 0.8});
	
	let startX = pos.x - range;
	let startY = pos.y - range;

	let id = pos.x + (pos.y*50)
	_registeredPos[id] = {};

	for (let y = startY; y <= pos.y + range; ++y) {
		for (let x = startX; x <= pos.x+range; ++x) {
			if (x<2 || x>47 || y<2 || y>47)	{ continue; }
			
			id = x + (y*50)
			if (_registeredPos[id] !== undefined) { continue; }
			_registeredPos[id] = {};						   
			
			let terrain = getRoomTerrainAt(x, y, roomName);
			let terrainAdd = 0;
			if (terrain === TERRAIN_MASK_WALL) {
				continue;
			} else if (terrain === TERRAIN_MASK_SWAMP) {
				terrainAdd = 5;
			}

			let currentValue = cm.get(x, y)
			if (currentValue >= 255) { continue; }


			let dist = Math.max(Math.abs(startX - x), Math.abs(startY - y));
			let distToDangerScore = terrainAdd + 3 + Math.ceil(Math.pow( (range - dist), 3.5));	

			cm.set(x, y, Math.min(254, distToDangerScore+ currentValue));
			

		}
	}
}

global.findWallToAttack = function(roomName, allCreeps, myStrength, phalanx, unique, targets = []){

	let origin;
	let fromExit;
	let timeout = 2500;
	if (allCreeps.length > 0) {
		origin = allCreeps[0].pos;
		let anchor
		if (phalanx) {
			anchor = getCurrentAnchorCreep(allCreeps);
		}
		if (anchor) {
			origin = anchor.pos;
		}
	} else {
		timeout = 10000;
		let exits = Game.rooms[roomName].findReducedExits();
		let randomExit = exits[Math.floor((Math.random() * exits.length))];

		fromExit = randomExit;
	//	console.log("random exit " + randomExit)
		origin = randomExit;
	}

	// Clear HP
	if (phalanx) {
		Memory.rooms[roomName].breachHpPhalanxTs = Game.time + timeout + Math.floor(Math.random() * 500);

		Memory.rooms[roomName].breachHpPhalanx = 0;
		Memory.rooms[roomName].breachWallHpPhalanx = 0;
		Memory.rooms[roomName].breachRampartHpPhalanx = 0;
	} else {
		Memory.rooms[roomName].breachHpTs = Game.time + timeout + Math.floor(Math.random() * 500);

		Memory.rooms[roomName].breachHp = 0;
		Memory.rooms[roomName].breachWallHp	= 0;
		Memory.rooms[roomName].breachRampartHp = 0;
	}

	let priTargets = {};

	if (roomIsSk(roomName)) {
		priTargets = {
			[STRUCTURE_INVADER_CORE] : {},
		}
	} else {
		priTargets = {
			[STRUCTURE_SPAWN] : {},		
			[STRUCTURE_TOWER] : {},
			[STRUCTURE_TERMINAL] : {},
			[STRUCTURE_STORAGE] : {},
			[STRUCTURE_LAB] : {},	
			[STRUCTURE_NUKER] : {},		
			[STRUCTURE_FACTORY] : {},
		};
	}

	priTargets = Object.keys(priTargets);

	let enemyStructures = []
	if (targets.length > 0) {
		for (let idx in targets) {
			enemyStructures.push(targets[idx])
		}
	} else {
		enemyStructures = Game.rooms[roomName].find(FIND_STRUCTURES, {
			filter: (structure) => {
				return (priTargets.includes(structure.structureType));
				}});
		
	}	
	
	
	if (SEASONAL_SCORE && roomIsCorner(roomName)) {
		let score = Game.rooms[roomName].find(FIND_SCORE_COLLECTORS)
		if (score.length > 0 ) {
			enemyStructures.push(score[0])		
		}
	}



	if (SEASONAL_SYMBOLS && roomIsHW(roomName) ){
		
		let flags = _.filter(Object.keys(Game.flags), flag => ((Game.flags[flag].color == COLOR_ORANGE)));
		for (let idx in flags){
			let flagRoom = Game.flags[flags[idx]].pos.roomName
			if (flagRoom === roomName) {
				
				enemyStructures.push(Game.flags[flags[idx]])
			}
		}			
	}

//	log("findwall targets " + enemyStructures.length)

	let targetPos = {};
	if (enemyStructures.length === 0) { return []; }


	let destinations = [];
	for (let idx in priTargets) {
		let type = priTargets[idx];
		let targetPrioritized = _.filter(enemyStructures,
			function (c) {
				return (c.structureType === type);
			});

		if (targetPrioritized.length > 0) {
			for (let idx2 in targetPrioritized) {
				destinations.push({pos: targetPrioritized[idx2].pos, range: 1})
			}
			break;
		}
	}	

	if (destinations.length === 0) { return []; }

	for (let idx in enemyStructures) {
		targetPos[posCompress(enemyStructures[idx].pos)] = {};
	}


	let walls = Game.rooms[roomName].find(FIND_STRUCTURES, {
		filter: (structure) => {
		return (structure.structureType === STRUCTURE_RAMPART ||
				 structure.structureType === STRUCTURE_WALL);
		}});
	let maxHits = 1000000;
	let maxSiegePos = 0;
	let sigePos = {};
	let _registeredPos = {};

	if (walls.length > 0) { setOutsidePixelsRaid(roomName, origin, phalanx); } 	
	
	let cm;
	let swampCost = 5;	// Swampcost should only be increased near walls! High swamp cost can avoid a better wall if the path to it is swampy
	if (phalanx) {
		cm = phalanxTransform(setWalkablePhalanxCosts(roomName, false, true, swampCost, true, 10));	
	} else {
		cm = setWalkablePhalanxCosts(roomName, false, true, swampCost, true, 10)	
	}
		
		
	let towers = Game.rooms[roomName].find(FIND_STRUCTURES, {
		filter: (structure) => {
		return (structure.structureType === STRUCTURE_TOWER);
		}});  

 

	let hostiles = _.filter(getEnemyCreeps(roomName),
		function (creep) {
			return (
				(creep.hasBodyparts(ATTACK) > 10 ||
				creep.hasBodyparts(RANGED_ATTACK) > 15) &&
				creep.pos.lookForStructure(STRUCTURE_RAMPART)
			);
		});

	let avoidHostiles = false;	
	
	if (!roomIsSk(roomName)) {
		for (let idx in hostiles){
		
			let pos = hostiles[idx].pos;
			let nearbyEnemies = pos.lookForEnemyCreepsAround(3);
			let hostileForce = calcCreepStrength(nearbyEnemies, true);
			let towerDmg = getTowerDamage(pos, towers);
	
			let dmg = hostileForce.attackDamage + hostileForce.rangedAttackDamage + towerDmg;
			if (myStrength && myStrength.rangedAttackDamage > (myStrength.attackDamage + myStrength.dismantlePower)) { // i can avoid melee
				dmg = hostileForce.rangedAttackDamage + towerDmg;
			}
			
			Game.rooms[roomName].visual.text(dmg  , pos.x, pos.y, {color: 'red', font: 1.0});	
	
			if (myStrength && myStrength.healPower < dmg ) {
				avoidHostiles = true;
				setAvoidAround(cm, _registeredPos, pos, roomName)
			} else if (phalanx && pos.isNearExit(2) && myStrength && (myStrength.healPower/2) < dmg) {
				avoidHostiles = true;
				setAvoidAround(cm, _registeredPos, pos, roomName)
			}
		}
	}
	

	let preferWalls = false;
	if (myStrength && myStrength.rangedAttackDamage < (myStrength.attackDamage + myStrength.dismantlePower)) {
		preferWalls = true;
	}

	let avoidRamparts = false;	
	if (avoidHostiles || preferWalls) {
		avoidRamparts = true;
	}

	log("findwall prefer walls " + preferWalls + " avoid ramparts " +avoidRamparts + " avoid hostiles " + avoidHostiles)

	let hitsAtPos = {};
	sigePos = {};
    for (let wall of walls) {
    	// SET WALL MAX	

		let weightedWallHits = wall.hits
		if (preferWalls && wall.isWall) {
			weightedWallHits *= 0.75;
		}

		let posCmp = posCompress(wall.pos);
		if (targetPos[posCmp]) {
			weightedWallHits *= 0.25;
		}

		
		if (phalanx) {
			
			let walkable = cm.get(wall.pos.x, wall.pos.y);			
			
			
			if (walkable < 255) {
				if (hitsAtPos[posCmp] === undefined) {
					hitsAtPos[posCmp] = {};
					hitsAtPos[posCmp].hits = 0;
					hitsAtPos[posCmp].walls = 0;
				}
				hitsAtPos[posCmp].walls++;
				hitsAtPos[posCmp].hits += weightedWallHits;
				if (hitsAtPos[posCmp].hits > maxHits) { maxHits = hitsAtPos[posCmp].hits; } 
			} 

			for (let i = 1; i <= 8; i++) {
				let formationPos = wall.pos.getPositionAtDirection(i);
				let posIdPh = posCompress(formationPos);
				if (hitsAtPos[posIdPh] === undefined) {
					hitsAtPos[posIdPh] = {} 
					hitsAtPos[posIdPh].hits = 0;
					hitsAtPos[posIdPh].walls = 0;
				}
				hitsAtPos[posIdPh].walls++;
				hitsAtPos[posIdPh].hits += weightedWallHits;
				if (hitsAtPos[posIdPh].hits > maxHits) { maxHits = hitsAtPos[posIdPh].hits; } 
			}

		} else {
			
			hitsAtPos[posCmp] = {};
			hitsAtPos[posCmp].hits = weightedWallHits;
			
		//	hitsAtPos[posId].hits += wall.hits;]
			if (weightedWallHits > maxHits) { maxHits = weightedWallHits; } 
		}
		
		if (wall.getEffect(PWR_FORTIFY)) {
			let id = wall.pos.x + (wall.pos.y*50)
			_registeredPos[id] = {};
			setAvoidAround(cm, _registeredPos, wall.pos, roomName, 1)
		}		

    	// SET SIGE POS MAX
    	let siegePosCnt = 0;
    	sigePos[posCmp] = {};

		sigePos[posCmp].val = siegePosCnt;
		if (maxSiegePos < siegePosCnt) {
			maxSiegePos = siegePosCnt;
		}
	}
    
	
	if (Memory.rooms[roomName].uniqWallTargets && unique)	{

		for (let uniqueId in Memory.rooms[roomName].uniqWallTargets) {
			if ((!Game.getObjectById(uniqueId) && (!Memory.raids[uniqueId] || Memory.raids[uniqueId].state != STATE_RAID)) || 
				Game.time > Memory.rooms[roomName].uniqWallTargets[uniqueId].ts || 
				uniqueId === unique
			) {
				delete Memory.rooms[roomName].uniqWallTargets[uniqueId];
				continue;
			}

			log("setting avoid of already  sieged walls")
			for (let idx in Memory.rooms[roomName].uniqWallTargets[uniqueId].walls) {
				let wall = Game.getObjectById(Memory.rooms[roomName].uniqWallTargets[uniqueId].walls[idx])
				if (wall) {
					setAvoidAround(cm, _registeredPos, wall.pos, roomName)
				}
			}
		}
	}


    
	for (let posIdHits in hitsAtPos) {	
		let pos = posDecompress(posIdHits, roomName);

		let id = pos.x + (pos.y*50)

		let walkable = cm.get(pos.x, pos.y);
		if (walkable >= 254) { continue; }

		if (_registeredPos[id]) {
			continue;
		}

		let cost = 0;
		if (phalanx) {
			
			if (!hitsAtPos[posIdHits]) { continue; }
			if (pos.phalanxIsNearExit(2)) {
				cost = 200 + Math.ceil((hitsAtPos[posIdHits].hits * 2 / maxHits) * 50);
			} else {
				cost = Math.ceil((hitsAtPos[posIdHits].hits / maxHits) * 100);
			}
			

			delete hitsAtPos[posIdHits];			
		} else {
			cost = Math.ceil((hitsAtPos[posIdHits].hits / maxHits) * 100);
		}

		let towerDmg = Math.ceil((getTowerDamage(pos, towers) / 3600) * 20);
		cost += towerDmg;
		

		if (SEASONAL_SYMBOLS) {
			if (pos.isNearExit(0)) {
				cost += 100;
			}

			let terrain = getRoomTerrainAt(pos.x, pos.y, pos.roomName);
			if (terrain === TERRAIN_MASK_WALL) {
				cost = 255;
			}
		}

		let terrain = getRoomTerrainAt(pos.x, pos.y, pos.roomName);
		if (terrain === TERRAIN_MASK_SWAMP) {
			cost += 20;
		}

		// Force more straight lines
		if (pos.x % 2 === 0) {
			cost += 5;
		}
		if (pos.y % 2 === 0) {
			cost += 5;
		}
		if (pos.x % 4 === 0) {
			cost += 10;
		}
		if (pos.y % 4 === 0) {
			cost += 10;
		}

		// Count nearby ramparts
		if (avoidRamparts) {
			let nearbyRamparts = 0;
			for (let i = 1; i <= 8; i++) {
				let formationPos = pos.getPositionAtDirection(i);
				let posId = posCompress(formationPos);
				if (sigePos[posId]) {
					nearbyRamparts++
				}
			}
			cost += nearbyRamparts * 5;
		}

		// update the costmatrix
        cm.set(pos.x, pos.y, Math.min(cost + walkable, 254));
	}

	
	
	/*
	let ret = findTravelPath(origin, enemyStructures[0], {
		roomCallback: () => cm, uncompressed: true, ignoreRoads: true, ignoreCreeps: true, ensurePath: true, freshMatrix: true, maxOps: 60000, denyTunnel: true});
		*/
		
	let ret = PathFinder.search(origin, destinations, {roomCallback: () => cm, maxRooms: 1, maxOps: 60000});


	if (ret.incomplete) {
		log(roomName + " failed to find wall to attack! is phalanx " + phalanx)
		let maxHp = 300000000
		if (phalanx) {
			Memory.rooms[roomName].breachHpPhalanx = maxHp;
			Memory.rooms[roomName].breachWallHpPhalanx = maxHp;
			Memory.rooms[roomName].breachRampartHpPhalanx = maxHp;

			
			if (fromExit) {
				if (Memory.rooms[roomName].avoidExit === undefined) {
					Memory.rooms[roomName].avoidExit = {};					
				}
				let exitToBlock = posCompress(fromExit)
				Memory.rooms[roomName].avoidExit[exitToBlock] = {};
				Memory.rooms[roomName].avoidExit[exitToBlock].pos = packrat.packPosList(Game.rooms[roomName].getExitsFromReducedExits(fromExit));
				Game.rooms[roomName].setAllowedExits();
			}

		} else {
			Memory.rooms[roomName].breachHp = maxHp;
			Memory.rooms[roomName].breachWallHp	= maxHp;
			Memory.rooms[roomName].breachRampartHp = maxHp;
		}
	} else {
		if (fromExit && Memory.rooms[roomName].avoidExit) {
			delete Memory.rooms[roomName].avoidExit[posCompress(fromExit)];
			Game.rooms[roomName].setAllowedExits();
		}
	}

	let wallsToAttack = [];	
	let rampartHp = 0;
	let wallHp = 0;
	for (let position of ret.path) {
		if (position.roomName !== roomName) { continue; }
		Game.rooms[position.roomName].visual.text("W" , position.x, position.y, {color: 'red', font: 0.5});

		let blocker = position.lookForStructure(STRUCTURE_WALL);
		if (blocker) { 
			wallsToAttack.push(blocker);			
			wallHp += blocker.hits;
			Game.rooms[roomName].visual.text("X" , blocker.pos.x, blocker.pos.y, {color: 'red', font: 0.5});
		}

		blocker = position.lookForStructure(STRUCTURE_RAMPART);
		if (blocker) {
			wallsToAttack.push(blocker);			
			rampartHp += blocker.hits;
			Game.rooms[roomName].visual.text("X" , blocker.pos.x, blocker.pos.y, {color: 'red', font: 0.5});
		}

		if (phalanx) {
			// Check nearby walls
			let pos = position.getPositionAtDirection(TOP);
			blocker = pos.lookForStructure(STRUCTURE_RAMPART);
			if (blocker) { 
				wallsToAttack.push(blocker);
				Game.rooms[roomName].visual.text("X" , blocker.pos.x, blocker.pos.y, {color: 'red', font: 0.5});
			}

			blocker = pos.lookForStructure(STRUCTURE_WALL);
			if (blocker) { 
				wallsToAttack.push(blocker);
				Game.rooms[roomName].visual.text("X" , blocker.pos.x, blocker.pos.y, {color: 'red', font: 0.5});
			}

			pos = position.getPositionAtDirection(LEFT);
			blocker = pos.lookForStructure(STRUCTURE_RAMPART);
			if (blocker) {
				wallsToAttack.push(blocker);
				Game.rooms[roomName].visual.text("X" , blocker.pos.x, blocker.pos.y, {color: 'red', font: 0.5});
			}
			blocker = pos.lookForStructure(STRUCTURE_WALL);
			if (blocker) {
				wallsToAttack.push(blocker);
				Game.rooms[roomName].visual.text("X" , blocker.pos.x, blocker.pos.y, {color: 'red', font: 0.5});
			}

			pos = position.getPositionAtDirection(TOP_LEFT);
			blocker = pos.lookForStructure(STRUCTURE_RAMPART);
			if (blocker) { 
				wallsToAttack.push(blocker);
				Game.rooms[roomName].visual.text("X" , blocker.pos.x, blocker.pos.y, {color: 'red', font: 0.5});
			}
			blocker = pos.lookForStructure(STRUCTURE_WALL);
			if (blocker) { 
				wallsToAttack.push(blocker);				
				Game.rooms[roomName].visual.text("X" , blocker.pos.x, blocker.pos.y, {color: 'red', font: 0.5});	
			}
		}
	}

	if (!phalanx) {
		Memory.rooms[roomName].breachHp = wallHp + rampartHp;		
	//	Memory.rooms[roomName].breachRampartToWallRatio = limit((rampartHp / wallHp || 1 ) / 100, 0, 1);		

		Memory.rooms[roomName].breachWallHp += wallHp;
		Memory.rooms[roomName].breachRampartHp += rampartHp;
	}	

	wallsToAttack = _.uniq(wallsToAttack);

	if (unique) {
		if (Memory.rooms[roomName].uniqWallTargets === undefined) { Memory.rooms[roomName].uniqWallTargets = {}; }
		Memory.rooms[roomName].uniqWallTargets[unique] = {};
		Memory.rooms[roomName].uniqWallTargets[unique].ts = Game.time + 74;
		Memory.rooms[roomName].uniqWallTargets[unique].walls = [];		
	}

	rampartHp = 0;
	wallHp = 0;

	if (phalanx || unique) {
		for (let idx in wallsToAttack) {
			let blocker = wallsToAttack[idx];

			if (phalanx) {
				Memory.rooms[roomName].breachHpPhalanx += blocker.hits;
				if (blocker.structureType === STRUCTURE_RAMPART) {
					rampartHp += blocker.hits;
				} else {
					wallHp += blocker.hits;
				}
			}
			
			if (unique) {
				Memory.rooms[roomName].uniqWallTargets[unique].walls.push(blocker.id)
			}
		}
	}

	if (phalanx) {
		Memory.rooms[roomName].breachWallHpPhalanx += wallHp;
		Memory.rooms[roomName].breachRampartHpPhalanx += rampartHp;

	//	Memory.rooms[roomName].breachRampartToWallRatioPhalanx = limit((rampartHp / wallHp || 1 ) / 100, 0, 1);
	}

	return wallsToAttack;
};

function findRangedAttackTarget(creep, hostiles, nonRampartStructures){

	let target = creep.pos.findInRange(hostiles, 3);
	if (target.length > 0 ) { return target[0]; }

	target = creep.pos.findInRange(nonRampartStructures, 3);
	if (target.length > 0 ) { return target[0]; }
}

global.getRallyPoint = function(fromRoom, dest){
	let originLabs = Game.rooms[fromRoom].findByType(STRUCTURE_LAB);
	let origin;
	if (originLabs.length > 0 ) {
		origin = originLabs[0].pos;
	} else {
		origin = Game.rooms[fromRoom].controller.pos;
	}
	
	let road = findTravelPath(origin, dest,	{range: 5, ignoreCreeps: true, uncompressed: true, allowHostile: true});
	let length = road.path.length;
	let roomName;
	let rallyPos = origin;
	let pos;
	for (let i = 0; i < length; i++) {
		roomName = road.path[i].roomName;
		pos = road.path[i];
		if (pos.x > 5 && pos.x < 45 && pos.y > 5 && pos.y < 45 ) {
			if (Memory.rooms[roomName] && Memory.rooms[roomName].hostiles || !Game.rooms[roomName]) { break; }
			if (roomName !== fromRoom) {
				break;
			}
			rallyPos = pos;
		}
	}
	return rallyPos;
};



function requiredBoostForRaid(requiredCreeps){

	let requestedBoost = {};
	for (let creepType in requiredCreeps) {
		let currentType = requiredCreeps[creepType];
		let bodyScale = 0;
		let partsCount = 0;
		for (let type in  currentType.body) {
			partsCount += currentType.body[type];
		}
		bodyScale = Math.floor(50 / partsCount);

		if (currentType.reqNumber === 0) { continue; }
		for (let boost in  currentType.requiredBoost) {
			let boostType = currentType.requiredBoost[boost];
			if (requestedBoost[boostType] === undefined) { requestedBoost[boostType] = 0; }
			let requiredAmount = currentType.body[BODYPART_FROM_BOOST[boostType]] * LAB_BOOST_MINERAL * currentType.reqNumber * bodyScale;
			requestedBoost[boostType] += requiredAmount;
		}
	}
	return requestedBoost;
}

global.getMyBestBoosts = function(minimumAmount=6000){

	if (global.myBestBoost === undefined || Game.time > global.myBestBoost.ts) {
		

		global.myBestBoost = {};
		global.myBestBoost.boost = {}
		global.myBestBoost.ts = Game.time + 100;

		for (let boost in BOOST_LEVEL) {
			let type = getBestBoost(boost, minimumAmount);
			if (type === undefined) { continue; }
			global.myBestBoost.boost[type] = {};			
		}
		
	}
	return global.myBestBoost.boost
} 

global.getBestBoost = function(boostType, minimumAmount=6000){
	let boostLevel = empireHasBoostsLevel({[boostType]: minimumAmount});
	if (boostLevel > 0) {
		return BOOST_LEVEL[boostType][boostLevel-1]
	}
}

global.getBoostAtLevel = function(type, level) {
	if (level > 0) {
		return BOOST_LEVEL[type][level-1]
	}
	
}

global.empireHasBoostsLevel = function(requestedBoost, maxLevel = 3){
	if (!Memory.Minerals) { return false; }
	let bestLevel = 0;
	for (let boostType in requestedBoost) {
		bestLevel = 0;
		for (let level in BOOST_LEVEL[boostType]) {
			let currentLevel = Number(level)+1
			if (currentLevel > maxLevel) { break; }
			let boost = BOOST_LEVEL[boostType][level]
			if (Memory.Minerals[boost] && Memory.Minerals[boost] > requestedBoost[boostType]) {				
				bestLevel = Math.max(bestLevel, currentLevel)
			}
		}
	}
	return bestLevel;
}

/*
global.createPhalanxAttacker = function(roomTarget, spawner){
	let energyAvailable = Game.rooms[spawner].energyCapacityAvailable;
	let towerDmg = getRoomTowerDmg(roomTarget);

	let wantedBoostAmount = 6000;	
	let bodyBoostsHealer = [];
	let bodyBoostsAttacker = [];

	let moveBoostLevel = empireHasBoostsLevel({[MOVE]: wantedBoostAmount});
	if (moveBoostLevel > 0) {
		let compund = BOOST_LEVEL[MOVE][moveBoostLevel-1]
		bodyBoostsHealer.push(compund);
		bodyBoostsAttacker.push(compund);
	}

	let healBoostLevel = empireHasBoostsLevel({[HEAL]: wantedBoostAmount});
	if (healBoostLevel > 0) {
		let compund = BOOST_LEVEL[HEAL][healBoostLevel-1]
		bodyBoostsHealer.push(compund);
	}

	let boostLevel = empireHasBoostsLevel({[ATTACK]: wantedBoostAmount * 2});	// Needs more to leave some for defenders!
	if (boostLevel > 0) {
		let compund = BOOST_LEVEL[ATTACK][boostLevel-1]
		bodyBoostsAttacker.push(compund);
	}
		
	let healFormation = 2;
	let requiredHealParts = Math.max(Math.ceil(towerDmg / (HEAL_POWER * (1+healBoostLevel)) / healFormation), 8)
//	console.log("required heals " + requiredHealParts + " with boost level " + healBoostLevel)

	if (requiredHealParts > 40) {
		return {};
		// cancel raid?
	 }

	// HEALER 
	let requiredMove = Math.ceil(requiredHealParts / (1 + moveBoostLevel));
	let costBase = requiredMove * BODYPART_COST[MOVE] + requiredHealParts * BODYPART_COST[HEAL];	

	let RAratio = 1 + moveBoostLevel
	let pricePerRa = Math.floor(RAratio * BODYPART_COST[HEAL] + BODYPART_COST[MOVE]);
	let affordableRa = Math.floor((energyAvailable - costBase ) / pricePerRa); 

	let maxSpaceRatios = Math.floor((50 - requiredMove - requiredHealParts) / (RAratio + 1))
//	console.log("max add ratio " + maxSpaceRatios)
	let appliedRA = Math.min(maxSpaceRatios, affordableRa)
	let rangedAttacks = Math.min(appliedRA * RAratio, 25);	// full lab amount
	let additionalMove = Math.ceil(rangedAttacks / (1 + moveBoostLevel));

//	console.log("RA " + rangedAttacks + " move " + additionalMove);
	let totalPrice = rangedAttacks * BODYPART_COST[RANGED_ATTACK] + (requiredMove + additionalMove) * BODYPART_COST[MOVE] + requiredHealParts * BODYPART_COST[HEAL]
	
	let totalMove = requiredMove + additionalMove
	let totalParts = rangedAttacks + totalMove + requiredHealParts
//	console.log(" total price " +  totalPrice+ "/"+ price + " total parts " + totalParts)

	if (totalMove < requiredMove || rangedAttacks < 5) {
	//	console.log("abort combo, move parts " + totalMove + "/" + requiredMove + " ra " + rangedAttacks  )
		return {};
	}

	if (totalParts < 50 && totalPrice < energyAvailable) {
		let possibleAdd = (totalMove + Math.floor(totalMove * (moveBoostLevel+1))) - totalParts;
		if (possibleAdd > 0) {			
		//	console.log("can add additional parts " + possibleAdd + " move boost level " + moveBoostLevel + " total parts " + totalParts + " non move parts "+(totalParts-totalMove)+ " move parts " + totalMove + " boosted moves " + Math.floor((totalMove * (moveBoostLevel+1))))

			let affordable = Math.floor(BODYPART_COST[RANGED_ATTACK] / (energyAvailable - totalPrice))
			let fits = 50 - totalParts;			
			let adding = Math.min(fits, affordable, possibleAdd);
		//	rangedAttacks += adding;
		//	console.log("adding " +adding+" affordable " + affordable + " fits " + fits)
		}
	}

	let body = { ranged_attack: rangedAttacks, heal: requiredHealParts, move: totalMove };
	return {
		body: body,
		boosts: bodyBoosts,
	};

}  */

global.createComboBody = function(roomTarget, spawner, maxBoostLevel = 3, addedDamage = 0){
	
	let energyAvailable = Game.rooms[spawner].energyCapacityAvailable;
	
	let towerDmg = getRoomTowerDmg(roomTarget);

	let totalDamage = addedDamage + towerDmg;

	let wantedBoostAmount = 6000;
	
	let bodyBoosts = [];
	let moveBoostLevel = empireHasBoostsLevel({[MOVE]: wantedBoostAmount}, maxBoostLevel);
	if (moveBoostLevel > 0) {
		let compund = BOOST_LEVEL[MOVE][moveBoostLevel-1]
		bodyBoosts.push(compund);
	}

	let healBoostLevel = empireHasBoostsLevel({[HEAL]: wantedBoostAmount}, maxBoostLevel);
	let healFactor = 1;
	if (healBoostLevel > 0) {
		let compund = BOOST_LEVEL[HEAL][healBoostLevel-1]
		healFactor = BOOSTS.heal[compund].heal;
		bodyBoosts.push(compund);
	}

	let boostLevel = empireHasBoostsLevel({[RANGED_ATTACK]: wantedBoostAmount}, maxBoostLevel);
	if (boostLevel > 0) {
		let compund = BOOST_LEVEL[RANGED_ATTACK][boostLevel-1]
		bodyBoosts.push(compund);
	}
		
	let formation = 4;
	let requiredHealParts = Math.max(Math.ceil(totalDamage / (HEAL_POWER * (1+healBoostLevel)) / formation), 8)
	console.log("required heals " + requiredHealParts + " with boost level " + healBoostLevel)

	let requiredToughParts = 0;
	if (requiredHealParts > 20) {

		let dmgCoverage = 2.0;
		let toughBoostLevel = empireHasBoostsLevel({[TOUGH]: wantedBoostAmount}, maxBoostLevel);
		let toughDmgReduction = 1;
		if (toughBoostLevel > 0) {
			let compund = BOOST_LEVEL[TOUGH][toughBoostLevel-1]
			bodyBoosts.push(compund);

			toughDmgReduction = BOOSTS.tough[compund].damage;
			requiredToughParts = Math.min(Math.ceil((dmgCoverage * totalDamage * toughDmgReduction) / 100), 15);
		
			requiredHealParts = Math.ceil((requiredToughParts * 100 / (healFactor * HEAL_POWER)) / formation);
		}

		if (requiredHealParts + requiredToughParts > 20) {
			return {};
		}
	 }

	let requiredMove = Math.ceil((requiredHealParts+requiredToughParts) / (1 + moveBoostLevel));
//	console.log("required move " + requiredMove + " with boost level " + moveBoostLevel);

	let costBase = requiredMove * BODYPART_COST[MOVE] + requiredHealParts * BODYPART_COST[HEAL] + requiredToughParts * BODYPART_COST[TOUGH];

	let RAratio = 1 + moveBoostLevel
	let pricePerRa = (RAratio * BODYPART_COST[RANGED_ATTACK]) + BODYPART_COST[MOVE];
	let affordableRa = Math.floor((energyAvailable - costBase ) / pricePerRa); 

	// requiredMove 7, requiredHealParts 14, RAratio = 2

	let maxSpaceRatios = Math.floor((50 - requiredMove - requiredHealParts - requiredToughParts) / (RAratio + 1))
//	console.log("max add ratio " + maxSpaceRatios)
	let appliedRA = Math.min(maxSpaceRatios, affordableRa)
	let rangedAttacks = Math.min(appliedRA * RAratio, 40);
	let additionalMove = Math.ceil(rangedAttacks / (1 + moveBoostLevel));

//	console.log("RA " + rangedAttacks + " move " + additionalMove);
	let totalMove = requiredMove + additionalMove
	let totalPrice = rangedAttacks * BODYPART_COST[RANGED_ATTACK] + totalMove * BODYPART_COST[MOVE] + requiredHealParts * BODYPART_COST[HEAL] + requiredToughParts * BODYPART_COST[TOUGH]
	
//	console.log("required move " + requiredMove + " add move " + additionalMove)
	let totalParts = rangedAttacks + totalMove + requiredHealParts + requiredToughParts;
//	let totalNonMove = rangedAttacks + requiredHealParts + requiredToughParts
//	console.log(" total price " +  totalPrice+ "/"+ price + " total parts " + totalParts)

	if (totalMove < requiredMove || rangedAttacks < 5 || totalParts > 50) {
	//	console.log("abort combo, move parts " + totalMove + "/" + requiredMove + " ra " + rangedAttacks  )
		return {};
	}

	// Add more parts
	if (totalParts < 50 && totalPrice < energyAvailable) {
		let partsSupported = totalMove * (moveBoostLevel+1);
		let possibleAdd = partsSupported - (totalParts - totalMove);

		let fits = 50 - totalParts;
		if (possibleAdd > 0) {
		//	console.log("can add additional parts " + possibleAdd + " move boost level " + moveBoostLevel + " total parts " + totalParts + " non move parts "+(totalParts-totalMove)+ " move parts " + totalMove + " boosted moves " + Math.floor((totalMove * (moveBoostLevel+1))))

			let affordable = Math.floor((energyAvailable - totalPrice) / BODYPART_COST[RANGED_ATTACK])
					
			let adding = Math.min(fits, affordable, possibleAdd);
			if (adding > 0) {
				rangedAttacks += adding;
				totalPrice += adding * BODYPART_COST[RANGED_ATTACK];
				fits -= adding;
			}
		}



		if (fits >= 2) {
			// Add more move?
		//	console.log("can add additional move parts " + possibleAdd + " move boost level " + moveBoostLevel + " total parts " + totalParts + " non move parts "+(totalParts-totalMove)+ " move parts " + totalMove + " boosted moves " + Math.floor((totalMove * (moveBoostLevel+1))))
			

			if (((energyAvailable - totalPrice) - (BODYPART_COST[RANGED_ATTACK] + BODYPART_COST[MOVE]) ) >= 0) {
				totalMove += 1;
				totalPrice += BODYPART_COST[MOVE];
				fits--;
				partsSupported = totalMove * (moveBoostLevel+1);
				
				totalParts = rangedAttacks + totalMove + requiredHealParts + requiredToughParts;
				possibleAdd = partsSupported - (totalParts - totalMove);

				let affordable = Math.floor((energyAvailable - totalPrice) / BODYPART_COST[RANGED_ATTACK])
					
				let adding = Math.min(fits, affordable, possibleAdd);
				if (adding > 0) {
					rangedAttacks += adding;
				}

			}
		}
	}

	let body = {}
	if (requiredToughParts) {
		body = { tough: requiredToughParts, ranged_attack: rangedAttacks, heal: requiredHealParts, move: totalMove };
	} else {
		body = { ranged_attack: rangedAttacks, heal: requiredHealParts, move: totalMove };
	}
	
	return {
		body: body,
		boosts: bodyBoosts,
	};
}



global.empireHasBoosts = function(requestedBoost){
	if (!Memory.Minerals) { return false; }
	for (let boostType in requestedBoost) {
		if (!boostType) { continue; }
		if (!Memory.Minerals[boostType] || Memory.Minerals[boostType] < requestedBoost[boostType]) {
			return false;
		}
	}
	return true;	 
};

global.debugPhalanxV2 = function(roomName, flee) {
	let init = Game.cpu.getUsed();
	let dt = getPhalanxMatrix(roomName, flee);
	console.log("used cpu " + ( Game.cpu.getUsed()-init))
//	let dt = setWalkablePhalanxCosts(roomName, [])
	displayCostMatrix(dt, roomName);
}

global._getDangerExits = {};
global.getDangerExits = function(roomName, outHeal, towers) {
	let getDangerExitsId = roomName + outHeal;

	if (global._getDangerExits[getDangerExitsId] === undefined || Game.time > global._getDangerExits[getDangerExitsId].ts) {
		global._getDangerExits[getDangerExitsId] = {};
		global._getDangerExits[getDangerExitsId].ts = Game.time + 347;

		global._getDangerExits[getDangerExitsId].pos = [];

		if (!towers) {
			towers = Game.rooms[roomName].find(FIND_STRUCTURES, {
				filter: (structure) => {
				return (structure.structureType === STRUCTURE_TOWER
						);
				}});
		}

		if (towers.length > 0) {
			let maxTowerDmg = towers.length * 600
			let exits = Game.rooms[roomName].find(FIND_EXIT);
			for (let idx in exits) {
				let pos = exits[idx];
				let towerDmg = getTowerDamage(pos, towers);
				if (towerDmg > outHeal) {
					let value = Math.ceil(100 * (towerDmg / maxTowerDmg));
					global._getDangerExits[getDangerExitsId].pos.push({pos: posCompress(pos), value: value} )
					Game.rooms[roomName].visual.text(value, pos.x, pos.y, {color: 'red', font: 0.5});

				}
			}
		}
	}

	return global._getDangerExits[getDangerExitsId].pos;
}


// global.raidPhalanx = (roomName, phalanxMatrix, options = {} ) => {
global.raidPhalanx = function(roomName, phalanxMatrix, options = {} ){
	let init = Game.cpu.getUsed();
	let raidPhalanxId = roomName + options.raidFlee;

	if (global.raidPhalanxCm[raidPhalanxId] === undefined || 
		Game.time > global.raidPhalanxCm[raidPhalanxId].ts || 
		(!global.raidPhalanxCm[raidPhalanxId].real && Game.rooms[roomName])
	){
		
		global.stats['cpu.aiRaidHandler.getPhalanxMatrix'] += Game.cpu.getUsed()-init;
		init = Game.cpu.getUsed();

		if (Game.rooms[roomName]  ) {
			
			global.raidPhalanxCm[raidPhalanxId] = {};	
			global.raidPhalanxCm[raidPhalanxId].real = 1;
			global.raidPhalanxCm[raidPhalanxId].ts = Game.time + 2;
		} else {

			if (global.raidPhalanxCm[raidPhalanxId] && global.raidPhalanxCm[raidPhalanxId].real ) {
				return PathFinder.CostMatrix.deserialize(global.raidPhalanxCm[raidPhalanxId].matrix);
			}

			global.raidPhalanxCm[raidPhalanxId] = {};	

			if (!Memory.rooms[roomName] || !getRoomPRCL(roomName)) {
				global.raidPhalanxCm[raidPhalanxId].ts = Game.time;
			} else {
				global.raidPhalanxCm[raidPhalanxId].ts = Game.time;
			}
		}

		let inTargetRoom = options.raidTargetRoom !== undefined && roomName !== options.raidTargetRoom

		let structureCost = 255
		let raidDmg = 1;
		if (options.raidDamage && inTargetRoom) {
			structureCost = 0;
			raidDmg = options.raidDamage;
		}

		let dt = getPhalanxMatrix(roomName, options.raidFlee, structureCost);

		let towers = [];
		let searchedForTowers = false;
		if (options.outHeal) {
			if (!searchedForTowers && Game.rooms[roomName]) {
				towers = Game.rooms[roomName].find(FIND_STRUCTURES, {
					filter: (structure) => {
					return (structure.structureType === STRUCTURE_TOWER
							);
					}});
			}

			let dangerExits = getDangerExits(roomName, options.outHeal, towers);
			for (let idx in dangerExits) {
				let pos = posDecompressXY(dangerExits[idx].pos);
				let currentValue = dt.get(pos.x, pos.y);
				currentValue += dangerExits[idx].value;
				dt.set(pos.x, pos.y, Math.max(254, currentValue));
			}
		}
		
 
		if (!Game.rooms[roomName] || !inTargetRoom) {
			// avoid creeps should also include my own here?

		} else {

			let hostiles = _.filter(getEnemyCreeps(roomName),
				function (creep) {
					return (
						(creep.hasBodyparts(ATTACK) > 10 ||
						creep.hasBodyparts(RANGED_ATTACK) > 10)
					);
				});
			
			if (hostiles.length) {
				searchedForTowers = true;
				towers = Game.rooms[roomName].find(FIND_STRUCTURES, {
					filter: (structure) => {
					return (structure.structureType === STRUCTURE_TOWER
							);
					}});
			}

			let structures = Game.rooms[roomName].find(FIND_STRUCTURES);
			raidSetStructureCost(dt, structures, raidDmg);
			
			let _registeredPos = {}
			raidAvoidHostiles(roomName, dt, _registeredPos, hostiles);			

		}

		global.raidPhalanxCm[raidPhalanxId].matrix = dt.serialize();
		global.stats['cpu.aiRaidHandler.raidphalanxMatrix'] += Game.cpu.getUsed()-init;
	}
	
	let cm = PathFinder.CostMatrix.deserialize(global.raidPhalanxCm[raidPhalanxId].matrix)

	
	let raidId;
	if (options.phalanxCreeps) {		
		// find creeps in range of all phalanx creeps and increase cost around them to avoid moving to the same pos as other creeps, potentially breaking formation
		let registeredCreeps = {}
		
		for (let idx in options.phalanxCreeps) {
			let creep = options.phalanxCreeps[idx];
			registeredCreeps[creep.id] = {}
			raidId = creep._memory.raidId;
		}

		let currentValue, distance, x, y
		for (let idx in options.phalanxCreeps) {
			let creep = options.phalanxCreeps[idx];
			let otherCreeps = creep.pos.findInRange(FIND_CREEPS, 3)
			for (let idx2 in otherCreeps) {
				let other = otherCreeps[idx2]
				if (registeredCreeps[other.id]) { continue; }
				if (other._phalanxMove === Game.time) { continue; }
				registeredCreeps[other.id] = {}

				let range = 1;
				let startX = other.pos.x - range;
				let startY = other.pos.y - range;

				if (other.my) { registerPhalanxBlocker(other.pos, false, raidId) }

				for (y = startY; y <= other.pos.y + range; ++y) {
					for (x = startX; x <= other.pos.x+range; ++x) {

						distance = getRangeXY(x, y, other.pos.x, other.pos.y)
						if (distance >= 3) { continue; }

						currentValue = cm.get(x, y);
						if (currentValue >= 255) { continue; }

						let newValue = Math.min(254, currentValue + (3 - distance) * 45);
						cm.set(x, y, newValue);
					}
				}
			}
		}
	}

	if (global.blockers[roomName]) {
		for (let compressedPos in global.blockers[roomName]) {
			if (global.blockers[roomName][compressedPos].id === raidId) { continue; }
			let pos = posDecompressXY(compressedPos);
			cm.set(pos.x, pos.y, 255);
			Game.rooms[roomName].visual.text("B", pos.x, pos.y, {color: 'red', font: 0.8});
		}
	}

	// showMatrix	
	/*
	if (Game.rooms[roomName] && !Game.rooms[roomName]._raidMatrixShown) {
		Game.rooms[roomName]._raidMatrixShown = Game.time;
		for (let y = 0; y < 50; y++) {
			for (let x = 0; x < 50; x++) {
				let value = cm.get(x, y);
	
				if (value <= 1) { continue; }
	
				if (value === 0xff) {
					Game.rooms[roomName].visual.text("X", x, y, {color: 'red', font: 0.5});
				//	Game.rooms[roomName].visual.circle(x, y , {fill: 'transparent', radius: 0.50, stroke: 'red'}) 
				} else {
					Game.rooms[roomName].visual.text(value, x, y, {color: 'green', font: 0.5});									
				}
			}
		}
	}*/
	


	global.stats['cpu.aiRaidHandler.raidphalanxMatrix'] += Game.cpu.getUsed()-init;
	return cm;
};

global.raidSetStructureCost = function(matrix, structures, raidDmg = 250) {

	for (let structure of structures) {

		if (structure.isContainer || structure.isRoad) { continue; }

		if (structure.isRampart && structure.my) { continue; }

		if (structure.isRampart) {
			let rampart = structure;
			if (rampart.owner.username === "Screeps") { continue; }

			let ticksToDestroy = Math.min(255, Math.ceil(structure.hits / raidDmg));
		//	let newValue = Math.min(255, ticksToDestroy);

		//	let newValue = 50 + (50*(rampart.hits / dmgScale));
			matrix.set(rampart.pos.x, rampart.pos.y, ticksToDestroy);

			for (let i = 1; i <= 8; i++) {
				
				let position = rampart.pos.getPositionAtDirection(i);
				let currentValue = matrix.get(position.x, position.y);
				if (currentValue >= 255) { continue; }
				
				let terrain = getRoomTerrainAt(position);
				if (terrain === TERRAIN_MASK_WALL) {
					matrix.set(position.x, position.y, 255);
				} else if (terrain === TERRAIN_MASK_SWAMP) {
					let newValueValue = limit(currentValue + 15, 0, 254);
					matrix.set(position.x, position.y, newValueValue);
				} else {
					let newValueValue = limit(currentValue + 10, 0, 254);
					matrix.set(position.x, position.y, newValueValue);
				}
			}
		} else if (structure.hits) {
			
			let currentValue = matrix.get(structure.pos.x, structure.pos.y);
			if (currentValue >= 255) { continue; }

			let ticksToDestroy = Math.min(255, Math.ceil(structure.hits / raidDmg));
			

			let newValue = ticksToDestroy + currentValue;
			newValue = limit(newValue, 0, 254);
			matrix.set(structure.pos.x, structure.pos.y, newValue);
		}
	}

}

global.explodeQuad = function(creeps) {
	for (let idx in creeps) {
		let creep = Game.getObjectById(creeps[idx])
		creep.move(Math.floor(Math.random()*8))
	}
}

global.raidAvoidHostiles = function(roomName, matrix, _registeredPos, hostiles) {
	for (let idx in hostiles){
			
		let pos = hostiles[idx].pos;

		if (!pos.lookForStructure(STRUCTURE_RAMPART)) { continue; }

		let friendlies = pos.lookForAlliedAndMyCreepsAround(5);
		let myStrength = calcCreepStrength(friendlies, true);

		let nearbyEnemies = pos.lookForEnemyCreepsAround(3);
		let hostileForce = calcCreepStrength(nearbyEnemies, true);
	
		let dmg = hostileForce.attackDamage + hostileForce.rangedAttackDamage;
		if (myStrength && myStrength.healPower >= dmg ) { continue; }
		
	//	Game.rooms[roomName].visual.text("A", pos.x, pos.y, {color: 'red', font: 0.8});
		
		let range = 2;
		let currentHostileStrength = calcSingleCreepStrength(hostiles[idx], true);

		if (!currentHostileStrength.rangedAttackDamage && !currentHostileStrength.attackDamage) {
			continue;
		} else if (currentHostileStrength.rangedAttackDamage > 0) {
			range = 4;
		}

		let id = pos.x + (pos.y*50)

		let currentValue = 0;
		let addValue = 45;
		if (_registeredPos[id] === undefined) {
			currentValue = matrix.get(pos.x, pos.y);
		} else {
			currentValue = _registeredPos[id].cur;
			addValue = Math.max(addValue, _registeredPos[id].add);
		}

		let maxValue = 254;
		if (currentValue >= 255) { maxValue = 255 }
		
		matrix.set(pos.x, pos.y, Math.min(maxValue, currentValue + addValue));

		let startX = pos.x - range;
		let startY = pos.y - range;

		_registeredPos[id] = {
			cur: currentValue,
			add: addValue
		};
		

		for (let y = startY; y <= pos.y + range; ++y) {
			for (let x = startX; x <= pos.x+range; ++x) {
				if (x<2 || x>47 || y<2 || y>47)	{ continue; }
				
				id = x + (y*50)

				if (_registeredPos[id] === undefined) {
					currentValue = matrix.get(x, y);
					addValue = 0;
				} else {
					currentValue = _registeredPos[id].cur;
					addValue = _registeredPos[id].add;
				}

				if (currentValue >= 255) { 
					_registeredPos[id] = {
						cur: currentValue,
						add: 0
					};
					continue; 
				}
				
				let terrain = getRoomTerrainAt(x, y, roomName);
				if (terrain === TERRAIN_MASK_WALL) {
					_registeredPos[id] = {
						cur: currentValue,
						add: 0
					};
					continue;
				}
				
				let rangeFromHostile = getRangeXY(pos.x, pos.y, x, y);
			//	let newValue = 100 - (rangeFromHostile * rangeFromHostile * 10);

				let newValue =  3 + Math.ceil(Math.pow( (range - rangeFromHostile), 3.5));	

				if (newValue > addValue) {
					newValue = Math.max(addValue, newValue);

					matrix.set(x, y, Math.min(254, newValue + currentValue));
				//	Game.rooms[roomName].visual.text(newValue, x, y, {color: 'red', font: 0.8});

					_registeredPos[id] = {
						cur: currentValue,
						add: newValue
					};
				}
			}
		}		
	}
}

// global.raidMatrix = (roomName, matrix, options = {} ) => {
global.raidMatrix = function(roomName, matrix, options = {} ) {

	let dmg = options.raidDamage || 1000;
	let raidId = roomName + options.raidFlee + dmg;

	if (global.raidMatrixCm === undefined) {global.raidMatrixCm = {}; }

	let rebuildCm;
	let structures;
	if (Game.rooms[roomName] && global.raidMatrixCm[raidId]) {			
		structures = Game.rooms[roomName].find(FIND_STRUCTURES, {
				filter: (structure) => {
				return (structure.structureType !== STRUCTURE_ROAD);
			}});

		if (global.raidMatrixCm[raidId].cnt === undefined || global.raidMatrixCm[raidId].cnt !== structures.length) {
			
			if (global.raidMatrixCm[raidId].cnt !== undefined && Memory.rooms[roomName]) {
				Memory.rooms[roomName].destroyedStructure = 1;
				rebuildCm = true;
				log(roomName +" rebuilding raidMatrix cm, different structures count ! " + structures.length + "/" +global.raidMatrixCm[raidId].cnt + " id " +raidId )
			}

			
			global.raidMatrixCm[raidId].cnt = structures.length;
		}
	}

	if (global.raidMatrixCm[raidId] === undefined || rebuildCm || Game.time > global.raidMatrixCm[raidId].ts) {	

		if (!Game.rooms[roomName]) { return matrix; }

		global.raidMatrixCm[raidId] = {};
		global.raidMatrixCm[raidId].ts = Game.time + 101;

		
		// MAKE SURE YOU CANT BE TRAPPED BY PUBLIC RAMPARTS
		/*
		let ramparts = Game.rooms[roomName].find(FIND_HOSTILE_STRUCTURES, {
							filter: (structure) => {
							return (structure.structureType === STRUCTURE_RAMPART);
							}});  */

		let dmgScale = 1000000;
		if (Memory.rooms[roomName] && Memory.rooms[roomName].breachHp) {
			dmgScale = Math.max(15000, Memory.rooms[roomName].breachHp);
		}

		/*
		if (options.raidDamage) {
			dmgScale 
		}*/

		/*
		for (let rampart of ramparts) {
			if (rampart.owner.username === "Screeps") { continue; }

			let newValue = 120 + (rampart.hits / dmgScale)
			matrix.set(rampart.pos.x, rampart.pos.y, newValue);

			for (let i = 1; i <= 8; i++) {
				
				let position = rampart.pos.getPositionAtDirection(i);
				let currentValue = matrix.get(position.x, position.y);
				if (currentValue >= 255) { continue; }
				
				let terrain = getRoomTerrainAt(position);
				if (terrain === TERRAIN_MASK_WALL) {
					matrix.set(position.x, position.y, 255);
				} else if (terrain === TERRAIN_MASK_SWAMP) {					
					let newValueValue = limit(currentValue + 15, 0, 254);
					matrix.set(position.x, position.y, newValueValue);
				} else {
					let newValueValue = limit(currentValue + 10, 0, 254);
					matrix.set(position.x, position.y, newValueValue);
				}
			}
		}*/

		

		if (!options.raidFlee) {


			if (!structures) {
				structures = Game.rooms[roomName].find(FIND_STRUCTURES, {
					filter: (structure) => {
					return (structure.structureType !== STRUCTURE_ROAD);
				}});
			}

			// set structures as walkable, depending on hits
			for (let structure of structures) {

				if (structure.isContainer) { continue; }

				if (structure.isRampart) {
					let rampart = structure;
					if (rampart.my || rampart.owner.username === "Screeps") { continue; }

					let ticksToDestroy = Math.min(255, Math.ceil(structure.hits / dmg));
				//	let newValue = Math.min(255, ticksToDestroy);

				//	let newValue = 50 + (50*(rampart.hits / dmgScale));
					matrix.set(rampart.pos.x, rampart.pos.y, ticksToDestroy);

					for (let i = 1; i <= 8; i++) {
						
						let position = rampart.pos.getPositionAtDirection(i);
						let currentValue = matrix.get(position.x, position.y);
						if (currentValue >= 255) { continue; }
						
						let terrain = getRoomTerrainAt(position);
						if (terrain === TERRAIN_MASK_WALL) {
							matrix.set(position.x, position.y, 255);
						} else if (terrain === TERRAIN_MASK_SWAMP) {
							let newValueValue = limit(currentValue + 15, 0, 254);
							matrix.set(position.x, position.y, newValueValue);
						} else {
							let newValueValue = limit(currentValue + 10, 0, 254);
							matrix.set(position.x, position.y, newValueValue);
						}
					}
				} else if (structure.hits) {
					
					let currentValue = matrix.get(structure.pos.x, structure.pos.y);
					if (currentValue >= 255) { continue; }

					let ticksToDestroy = Math.min(255, Math.ceil(structure.hits / dmg));
					

					let newValue = ticksToDestroy + currentValue;
					newValue = limit(newValue, 0, 254);
					matrix.set(structure.pos.x, structure.pos.y, newValue);
				}
			}

		} else {

			// fleeing
			let towers = [];
			let maxTowerDmg = 0;
			if (options.raidFlee) {
	
				towers = Game.rooms[roomName].find(FIND_HOSTILE_STRUCTURES, {
					filter: (structure) => {
					return (structure.structureType === STRUCTURE_TOWER);
					}});
				maxTowerDmg = towers.length * 600;
			}
	
			if (towers.length) {
				for (let y = 0; y < 50; y++) {
					for (let x = 0; x < 50; x++) {
	
						let newScore = 0;
						let currentScore = matrix.get(x, y);
	
						if (currentScore >= 255) { continue; }
	
						let terrain = getRoomTerrainAt(x, y, roomName);
						let terrainScore = 0;
						if (terrain === TERRAIN_MASK_WALL) {
							matrix.set(x, y, 255);
							continue;
						} else if (terrain === TERRAIN_MASK_SWAMP && !Game.rooms[roomName].lookForStructureAtXY(STRUCTURE_ROAD, x, y)) {
							terrainScore = 15;
						}
	
						if (maxTowerDmg > 0) {
							let towerDmg = Math.ceil((getTowerDamageXY(x, y, towers) / maxTowerDmg) * 100);
							newScore += towerDmg;
						}
	
						newScore = Math.min(newScore + currentScore + terrainScore, 250);
						matrix.set(x, y, newScore);
	
					}
				}
			}
		}
		

		let hostiles = _.filter(getEnemyCreeps(roomName),
			function (creep) {
				return (
					(creep.hasBodyparts(ATTACK) > 5 ||
					creep.hasBodyparts(RANGED_ATTACK) > 5)
				);
			});

		
		let _registeredPos = {}
		raidAvoidHostiles(roomName, matrix, _registeredPos, hostiles);
			
		/*
		// showMatrix
		for (let y = 0; y < 50; y++) {
			for (let x = 0; x < 50; x++) {
				let value = matrix.get(x, y);
				if (value === 0xff) {
					Game.rooms[roomName].visual.circle(x, y , {fill: 'transparent', radius: 0.50, stroke: 'red'}) 
				} else {										
					Game.rooms[roomName].visual.text(value  , x, y, {color: 'green', font: 0.5});									
				}
			}
		}*/
		global.raidMatrixCm[raidId].matrix = matrix.serialize();
		return matrix;
	}

	return PathFinder.CostMatrix.deserialize(global.raidMatrixCm[raidId].matrix);
	
};


/*
Creep.prototype.raidAvoidDefenders = function(avoids, options = {}) {
	if (defendersInRange) {
		this.fleeRaid(defendersInRange)
	}

}
*/
Creep.prototype.raidAvoidDefenders = function(hostiles) {	
	
	let defendersInRange = this.pos.findInRange(hostiles, 2);
	if (defendersInRange.length === 0) { return 0; }

	let rangeAvoid = 5;
	let b = _.map(defendersInRange, c => ({pos: c.pos, range: rangeAvoid}));
	let opts = {
		flee: true,	
		maxOps: 500, // this might determine where we flee to.
		maxRooms: 1
	};
	
	let path = PathFinder.search(this.pos, b, opts);
	if(!path || path.path || path.path.length <= 0) {		
		return 0;
	}
//	let dir = this.pos.getDirectionTo(path[0]); 	
	this.moveAllCreepsOnPath(path, {recursive: true});
	
};

