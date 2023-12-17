'use strict'
let roomData = {

    /** @param {builder} builder **/
    run: function(roomCaller) {

		let room = Game.rooms[roomCaller];	
		
		// DECLARE VARIABLES
		if (Memory.rooms[roomCaller] === undefined)  { Memory.rooms[roomCaller] = {}; }	
		let roomMemory = Memory.rooms[roomCaller];
		let roomCache = Game.rooms[roomCaller]._cache
		
		
	//	let init = Game.cpu.getUsed();
        // PREDICT INVADERS AND TRACK ENERGY HARVESTED
		if (roomMemory[R.MY_MINING_OUTPOST]){
			room.trackEnergyHarvestedAndInvaders();
		}
	//	global.stats['cpu.aiRoomData.trackEnergyHarvestedAndInvaders'] += Game.cpu.getUsed()-init;

		
		let roomIsConfirmedController;
		let roomIsConfirmedHW;
		let roomIsConfirmedSk;
		let roomIsConfirmedCenter;

		if (roomIsController(roomCaller)) {
			roomIsConfirmedController = true; 
		} else if (roomIsHW(roomCaller)) {
			roomIsConfirmedHW = true;
		} else if (roomIsSk(roomCaller)) {
			roomIsConfirmedSk = true;		
		} else if (roomIsCenter(roomCaller)) {
			roomIsConfirmedCenter
		} else {
			return;
		}
		
		  
	//	init = Game.cpu.getUsed();
		if (roomMemory.myRoom ||
			roomMemory[R.MY_MINING_OUTPOST] ||
			roomMemory.buildRoads ||
			Memory.controllerAttack[roomCaller] ||
			Memory.attackTarget[roomCaller] ||
			roomMemory.player ||
			roomMemory.enemyRemote ||
			roomIsConfirmedHW	// caravans/pb
			){


			if (Game.time % 101 === 1) {
				// UPDATE BUILDERJOBS
				room.getBuilderJob({checkOnly: true})
			}

			
						
			// UPDATE HOSTILES
			let enemyCreeps = getEnemyCreeps(roomCaller);

			let hostiles = [];
			if (enemyCreeps.length > 0) {

				// SET TIMESTAMP
				roomMemory.hostileTs = Game.time;

				if (roomIsConfirmedController) {
					hostiles = _.filter(enemyCreeps, 
						function(creep) {return ((creep.hasBodyparts(ATTACK) > 0 ||
										creep.hasBodyparts(RANGED_ATTACK) > 0 ||
										creep.hasBodyparts(HEAL) > 0 ||
										creep.hasBodyparts(WORK) > 0 ||
										creep.hasBodyparts(CARRY) > 0 )
										);
							});	
				} else if (roomIsConfirmedSk || roomIsConfirmedCenter) {					
					hostiles = _.filter(enemyCreeps, 
						function(creep) {return ((creep.hasBodyparts(ATTACK) > 0 ||
										creep.hasBodyparts(RANGED_ATTACK) > 0 ||
										creep.hasBodyparts(HEAL) > 0 ||
										creep.hasBodyparts(WORK) > 0 ||
										creep.hasBodyparts(CARRY) > 0 ) && 
										(creep.owner.username !== "Source Keeper") && 
										(creep.owner.username !== "Invader" && sectorHasDeadInvaderCore(roomCaller))
										);
							});	
				} else if (roomIsConfirmedHW) {
					hostiles = _.filter(enemyCreeps, 
						function(creep) {return ((creep.hasBodyparts(ATTACK) > 0 ||
										creep.hasBodyparts(RANGED_ATTACK) > 0 ||
										creep.hasBodyparts(HEAL) > 0 ||
										creep.hasBodyparts(WORK) > 0 ||
										creep.hasBodyparts(CARRY) > 0 ) && 
										(creep.owner.username !== "Screeps")
										);
							});	
				} 
			} else {
				delete roomMemory.hostileTs
			}
				/*
			let hostiles = _.filter(enemyCreeps, 
				function(creep) {return ((creep.hasBodyparts(ATTACK) > 0 ||
								creep.hasBodyparts(RANGED_ATTACK) > 0 ||
								creep.hasBodyparts(HEAL) > 0 ||
								creep.hasBodyparts(WORK) > 0 ||
								creep.hasBodyparts(CARRY) > 0 ) && 
								(creep.owner.username !== "Source Keeper" &&
								creep.owner.username !== "Screeps")
								);
					});	
					*/
			
			// CHECK FOR SINGLE MOVE CREEPS ETC, BODY BLOCKERS
			if (hostiles.length === 0 && enemyCreeps.length > 5){
				hostiles = _.filter(enemyCreeps, 
				function(creep) {return (
							   	creep.owner.username !== "Source Keeper" &&
								creep.owner.username !== "Screeps");
					});
			}

			if (hostiles.length > 0) {				

				if (roomMemory.hostiles === undefined) { roomMemory.hostiles = {} }

				if (roomMemory.hostiles.numberHostiles === undefined ||
					(roomMemory.hostiles.numberHostiles !== hostiles.length ||
					!roomMemory.avoid)
				) {
				
					roomMemory.hostiles.numberHostiles = hostiles.length;
					roomMemory.hostiles.player = hostiles[0].owner.username;

					roomMemory.avoid = Game.time + 75;
				
					let invaders = _.filter(hostiles, 
						function(creep) {return (
										   creep.owner.username === "Invader");
							});

					roomMemory.hostiles.invaders = invaders.length;

					
					if (invaders.length > 0 || roomMemory.hostiles.player === "Invader") {
						roomMemory.avoid = Game.time + 125;
					}
					

					
					// CALC ENEMY STRENGTH
					let newForce = false;
					let forceRecalc = Math.random() > 0.75;
					if (hostiles.length > 0 &&
						(roomMemory.hostiles.numberHostiles !== roomMemory.hostiles.OldnumberHostiles ||
						forceRecalc)
						){
						newForce = true;
						roomMemory.hostiles.OldnumberHostiles = roomMemory.hostiles.numberHostiles						
						roomMemory.hostiles.power = calcCreepStrength(hostiles, false, forceRecalc);
				
						
						if (roomMemory.myRoom && SEASONAL_SYMBOLS) {
							openGates(roomCaller, false);
						}
					}
					
					// UPDATE ENEMY PLAYER
					let enemyPlayer = _.filter(hostiles, (creep) => (creep.owner.username !== "Invader")); 
				
					if (enemyPlayer.length > 0) {
						
						roomMemory.hostiles.creeps = {};
						for (let idx in enemyPlayer) {
							let enemyCreep = enemyPlayer[idx];
							roomMemory.hostiles.creeps[enemyCreep.id] = {};

							if (global.hostileTracker[enemyCreep.id] === undefined) {
								global.hostileTracker[enemyCreep.id] = {};
								global.hostileTracker[enemyCreep.id].ts = Game.time + enemyCreep.ticksToLive;
							}													

							if (global.hostileTracker[enemyCreep.id] && global.hostileTracker[enemyCreep.id].room !== roomCaller) {

								global.hostileTracker[enemyCreep.id].room = roomCaller;

								let prevRoom = global.hostileTracker[enemyCreep.id].room;
								if (Game.rooms[prevRoom]) { continue; }
								if (!Memory.rooms[prevRoom] || !Memory.rooms[prevRoom].hostiles || !roomMemory.hostiles.creeps) { continue; }
								delete Memory.rooms[prevRoom].hostiles.creeps[enemyCreep.id];
								let strength = calcCreepStrength(enemyCreep);
								let def = Memory.rooms[prevRoom].hostiles.power.defensive;
								for (let key in strength) {
									if (!Memory.rooms[prevRoom].hostiles.power[key]) { continue; }									
									Memory.rooms[prevRoom].hostiles.power[key] -= strength[key];
								}

								log("deleting old creep from room " + prevRoom + " removed power " + strength.defensive + " old " + def + " new " + Memory.rooms[prevRoom].hostiles.power.defensive )

								if (Memory.rooms[prevRoom].isPlayer && Object.keys(Memory.rooms[prevRoom].hostiles.creeps).length == 0) {
									delete Memory.rooms[prevRoom].hostiles;
									log("removing hostiles from " + prevRoom + " they are now in " + roomCaller)

									if (Memory.rooms[prevRoom].evacuated) {
										releaseFleeRoles(prevRoom);
										delete Memory.rooms[prevRoom].evacuated;
									}
								}
							}	
						}

						// Check for powercreeps
						let powerCreeps = _.filter(hostiles, (creep) => (creep.isPowerCreep)); 
						if (powerCreeps.length > 0) {
							roomMemory.hostiles.powerCreeps = {};
						}

						roomMemory.hostilesTimeout = Game.time + 15;
						// RESET BUILDERJOB SO IT WILL GET LOWEST WALLS
						if (roomMemory.myRoom) { delete getRoomCache(roomCaller).builderJobTs  }

						roomMemory.isPlayer = enemyPlayer[0].owner.username;
						
						if (roomMemory.hostiles.power && !roomIsSafeModed(roomCaller)) {

							if (roomMemory.hostiles.power.defensive > 50) {
								roomMemory.isAttacked = Game.time + 50;
								roomMemory.avoid = Game.time + 25;
							}
							
							if (roomMemory.hostiles.power.defensive > 2500) {
								roomMemory.avoid = Game.time + 500;
								//SIEGE INCOMMING
								for (let exits in getExits(roomCaller) ) {
									if (Memory.rooms[exits] && Memory.rooms[exits].myRoom ) {
										if (Memory.rooms[exits].preSpawnDefender === undefined) { Memory.rooms[exits].preSpawnDefender = true }
										// Memory.rooms[exits].
										Memory.hasBeenSieged = Game.time;
										console.log("setting prespawn defenders for " + exits + " neighbour " + roomCaller + " is invaded by " + roomMemory.isPlayer  + " with force " + roomMemory.hostiles.power.strength)
									}
								}
							}
						}

						let siegedPower = 1500 * (getRoomPRCL(roomCaller) / CONTROLLER_MAX_LEVEL)

						if (roomMemory.myRoom && roomMemory.hostiles.power.strength > siegedPower && !roomIsSafeModed(roomCaller)) {
							if (!roomMemory.sieged) {
								convertUpgradersToBuilders(roomCaller);

								
								if (roomMemory.wallMp === undefined) { roomMemory.wallMp = 1.0;}
								roomMemory.wallMp += 0.1;
								roomMemory.wallMp = Number(roomMemory.wallMp.toFixed(1))
								roomMemory.sieged = {};
								roomMemory.sieged.startTick = Game.time;
								
							}

							if (roomMemory.sieged.attackPower === undefined) { roomMemory.sieged.attackPower = 0;}

							let attackPower = roomMemory.hostiles.power
							let offensive = attackPower.attackDamage + attackPower.rangedAttackDamage + attackPower.dismantlePower
							roomMemory.sieged.attackPower = Math.max( roomMemory.sieged.strength, offensive )

							console.log(roomCaller + " sieged ")
							roomMemory.sieged.ts = Game.time + 100;
							Memory.hasBeenSieged = Game.time;
						}

						// Accumulate Rage
						if ((roomMemory.myRoom || 
							roomMemory[R.MY_MINING_OUTPOST] ||
							(!SEASONAL_PASSIVE_MODE && Memory.powerBanks[roomCaller] && Memory.powerBanks[roomCaller].assignedRoom) &&
							(!roomMemory.hostiles.invaders && !checkForInvaderCore(roomCaller)) )
						){
							let enemy = roomMemory.isPlayer;
							addRage(enemy, roomMemory.hostiles.power.strength);
						}
					}
					
					// Evacuate?
					if (newForce && roomMemory[R.MY_MINING_OUTPOST] &&
						!roomMemory.evacuated && checkFleeNeeded(roomCaller)
					) {
						// Evacuate non combat creeps
						assignFleeRoles(roomCaller);

						// Send in reinforcements
					//	sendInIdleCreeps(roomCaller)

						roomMemory.evacuated = Game.time;
					}
				}
				if (roomMemory.isPlayer && roomMemory.myRoom) {// ENEMY PLAYER IN MY ROOM
				
					// TRIGGER SAFE MODE					
					if (!roomIsSafeModed(roomCaller)  ){

						
						// MISSING WALL								
						let wallCount = getWallCount(roomCaller, true);

						if (roomMemory.wallCount && 
							roomMemory.wallCount > wallCount &&
							hasBreachedWalls(roomCaller)
						) {
							console.log(roomCaller + "missing wall ! ACTIVATING SAFEMODE " + wallCount + "/" +roomMemory.wallCount )
						//	Game.rooms[roomCaller].controller.handleActivateSafemode();							
						}
						roomMemory.wallCount = wallCount;
						
						// DAMAGED STRUCTURES	
						let damagedStructures = room.find(FIND_MY_STRUCTURES, {
								filter: (structure) => {
								return ((structure.structureType != STRUCTURE_RAMPART && 
										structure.structureType != STRUCTURE_EXTRACTOR &&
										structure.structureType != STRUCTURE_EXTENSION &&
										structure.structureType != STRUCTURE_LINK) &&
										structure.hits < structure.hitsMax && 
										!isWithinAttackRangeOfOutside(structure.pos)
										);
								}});
						if (damagedStructures.length > 0 ){
							console.log(roomCaller + "damaged structure ! ACTIVATING SAFEMODE " + damagedStructures.length );
							room.controller.handleActivateSafemode();							
						}
						
						// IF BREACHED WALLS
						if (roomMemory._breachPos || getRoomPRCL(roomCaller) < 3){

							// UNRAMPARTED WITH NEARBY ENEMIES
							let structureCanBeDestroyed = room.find(FIND_MY_STRUCTURES, {
								filter: (structure) => {
								return ((structure.structureType === STRUCTURE_SPAWN || 
										structure.structureType === STRUCTURE_TERMINAL ||
										structure.structureType === STRUCTURE_STORAGE ||
										structure.structureType === STRUCTURE_EXTENSION ||
										structure.structureType === STRUCTURE_LAB || 
										structure.structureType === STRUCTURE_TOWER) && 
										((!structure.pos.lookForStructure(STRUCTURE_RAMPART) || structure.pos.lookForStructure(STRUCTURE_RAMPART).hits < 10000	) &&
										!isWithinAttackRangeOfOutside(structure.pos) &&
										calcCreepStrength(structure.pos.lookForEnemyCreepsAround(3)).strength > 10)
										);
									}}); 
							if (structureCanBeDestroyed.length > 0 ){
								console.log(roomCaller + "structureCanBeDestroyed ! ACTIVATING SAFEMODE " + structureCanBeDestroyed.length );
								room.controller.handleActivateSafemode();								
							}
						}

						
						
						// IF NO SPAWNS
						let spawnsExisting = room.findByType(STRUCTURE_SPAWN);
						if (spawnsExisting.length === 0) {
							// STOMPING FIRST SPAWN
							let constructionsite = room.getConstuctionSites();
							let spawnConstructionSite = _.filter(constructionsite,
								(s) => s.structureType === STRUCTURE_SPAWN);
							if (spawnConstructionSite.length > 0 && 
								enemyCreeps.length > 0
								){
								let rampart = spawnConstructionSite[0].pos.lookForStructure(STRUCTURE_RAMPART)
								if (!rampart || rampart.hits < 5000) {
									let creepsNearSpawn = spawnConstructionSite[0].pos.findInRange(enemyCreeps, 4)
									if (creepsNearSpawn.length > 0 ) {
										console.log(roomCaller + " enemy creeps trying to stomp spawn! " );
										room.controller.handleActivateSafemode();										
									}
								}
							}
						}
					
						// ATTACKING THE CONTROLLER
						let creepsNearController = _.filter(room.controller.pos.lookForEnemyCreepsAround(2),
							function (creep) {
								return (creep.hasBodyparts(CLAIM) > 0)
							});
						if (creepsNearController.length > 0) {
							console.log(roomCaller + " enemy creeps trying to downgrade controller! " );
							room.controller.handleActivateSafemode();
						}
					}
					
					// LOG INVASIONS
					if (Memory.invasions === undefined) { Memory.invasions = {} }
					if (Memory.invasions[roomCaller] === undefined) { Memory.invasions[roomCaller] = {} }
					if (Memory.invasions[roomCaller].player === undefined) { Memory.invasions[roomCaller].player= {} }
						
					let playerName = roomMemory.isPlayer	
					if (Memory.invasions[roomCaller].player[playerName] === undefined) { Memory.invasions[roomCaller].player[playerName] = {} }		
					
					if (!Memory.invasions[roomCaller].player[playerName].power || roomMemory.hostiles.power.strength > Memory.invasions[roomCaller].player[playerName].power.strength) {
						Memory.invasions[roomCaller].player[playerName].power = roomMemory.hostiles.power
						Memory.invasions[roomCaller].player[playerName].time = Game.time
					}
				}
				
			} else if (hostiles.length == 0) {

				if (SEASONAL_SYMBOLS && roomMemory.myRoom) {
					let allies = getAlliedCreeps(roomCaller);
					if (allies.length > 0 ) { 
						openGates(roomCaller, true);
					}
				}

				if (roomMemory.hostilesTimeout && Game.time > roomMemory.hostilesTimeout) {
					delete roomMemory.hostilesTimeout
				}

				if (Game.time % 23 === 1) {
					delete roomMemory.preSpawnDefender;	
				}

				if (Game.time > roomMemory.isAttacked) {								
					delete roomMemory.isAttacked;
					delete roomMemory.isPlayer;
				}

				delete roomMemory.wallCount;
				delete roomMemory.isPlayer;
				delete roomMemory.hostiles;

				if (roomMemory.evacuated) {
					releaseFleeRoles(roomCaller);
					delete roomMemory.evacuated;
				}

				// Probably Screeps Caravan spotted
				if ((enemyCreeps.length > 0 || roomMemory.csTs) && roomIsConfirmedHW) {

					if (roomMemory.csTs === undefined) {
						roomMemory.csTs = Game.time + 3;
					} else if (Game.time > roomMemory.csTs) {
						delete roomMemory.csTs
					}
					
					checkScreepsCaravan(enemyCreeps, roomCaller)

					if (Memory.raids.activeTargets[roomCaller] || Memory.powerBanks[roomCaller]) {
						checkForLootMission(roomCaller, true)
					}
				}
			}
		}		 
	//	global.stats['cpu.aiRoomData.hostiles'] += Game.cpu.getUsed()-init;
		  	
		
	//	init = Game.cpu.getUsed();
      	let controller = room.controller;
        if (controller && (!roomCache.scoutController || Game.time > roomCache.scoutController)) {
		
			roomCache.scoutController = Game.time + 5;

			if (controller.level > 0) {
				roomMemory.RCL = controller.level;

				setRoomPRCL(roomCaller);

				if (controller.progress > controller.progressTotal) {
					roomMemory.RRCL = getRoomRRCL(controller);				
				} else {
					delete roomMemory.RRCL;
				}
			} else {
				delete roomMemory.PRCL;
				delete roomMemory.RRCL;
				delete roomMemory.RCL;
			}

			if (roomMemory.controller === undefined && (BOT_MODE || withinMyTerritory(roomCaller) !== undefined || controller.owner || controller.reservation)) {
				roomMemory.controller = {};
				roomMemory.controller.pos = posCompress(controller.pos);
			}
				
			roomMemory.RCLreserved = controller.reservation;
			
			
			if (controller.safeMode !== undefined){
				if (!roomMemory.safeModeEnd) {			
					roomMemory.safeModeEnd = Game.time + controller.safeMode;
				}
			} else if (roomMemory.safeModeEnd !== undefined) {
				delete roomMemory.safeModeEnd;
			} 
			
			if (controller.safeModeCooldown !== undefined){
				if (!roomMemory.safeModeCooldown) {
					roomMemory.safeModeCooldown = Game.time + controller.safeModeCooldown;
				}
			} else if (roomMemory.safeModeCooldown !== undefined) {
				delete roomMemory.safeModeCooldown;
			}

			if (controller.upgradeBlocked !== undefined){
				roomMemory.upgradeBlocked = Game.time + controller.upgradeBlocked;
			} else if (roomMemory.upgradeBlocked !== undefined){
				delete roomMemory.upgradeBlocked;
			}
			
			if (controller.my){
			
				if (!roomMemory.maxRCL || roomMemory.maxRCL < controller.level) {
					roomMemory.maxRCL = controller.level;
				}

				if (roomMemory.roomBreached && Game.time > roomMemory.roomBreached) {
					delete roomMemory.roomBreached;
				}				

				// FORCE RECALC OF REMOTE SOURCES WHEN PRCL LEVEL CHANGES
				if (getRoomPRCL(roomCaller) && 
					(getRoomPRCL(roomCaller) !== roomMemory.PRCLold)
				) {	// FORCE RECALC OF REMOTE SOURCES
					roomMemory.PRCLold = getRoomPRCL(roomCaller);

					delete Memory.remoteSources;
					Memory.remoteSources = {};
					delete Memory.miningTarget;
					Memory.miningTarget = {};

					roomMemory.wallCountTimer = Game.time;

					if (removeBlockedRoads(roomCaller) ) { }
				}

				if (getRoomPRCL(roomCaller) === 2 && !roomMemory.controllerContainer && room.getControllerContainer().length > 0) {
					roomMemory.controllerContainer = 1;
					convertBuildersToUpgraders(roomCaller);
					fetchControllerContainer(roomCaller);
				} 

				if (roomMemory.newRCL) {
					room.visual.text('new', controller.pos.x, controller.pos.y, {color: 'red', font: 0.8});

					convertUpgradersToBuilders(roomCaller);

					if (Game.time > roomMemory.newRCL ||
						getRoomPRCL(roomCaller) >= getRoomRCL(roomCaller)
					) {
						delete roomMemory.newRCL;
						roomMemory.upWorking = 100;
						delete roomMemory.wrkUp;
						delete roomMemory.idleUp;
						revertUpgradersToBuilders(roomCaller);
						requestMemSave();
					}
				}

				if (getRoomRCL(roomCaller) !== roomMemory.RCLold) {	

					requestMemSave();

					// Update PRCL
					setRoomPRCL(roomCaller, true);
			
					// ABANDON ROOM IF RCL FALLS FROM 2 to 1	
					if (roomMemory.RCLold === 2 && getRoomRCL(roomCaller) === 1) {
						unclaimController(room.controller);
					}

					// FORCE TERRITORY UPDATE
					if (!roomMemory.RCLold || roomMemory.RCLold < 3) {
						createMyTerritory();
					}
						
					// CONVERT UPGRADERS TO BUILDERS ON RCL UP					
					if (!isGCLPraiseRoomStandby(roomCaller)) {						
						convertUpgradersToBuilders(roomCaller);
					}

					// REMOVE CONTROLLER CONTAINER AT RCL 8
					if (!isGCLPraiseRoomStandby(roomCaller) && getRoomRCL(roomCaller) === 8) {						
						removeControllerContainer(roomCaller);
					}
											
					// make sure builder starts placing construction sites
					delete roomCache.buildNext;
					delete roomCache.keyRampart;

					delete roomMemory.controllerContainer;
					
					if (getRoomRCL(roomCaller) >= 2) {
						roomMemory.newRCL = Game.time + 10000;
					}					

					// TRACK RCL PROGRESS TIME					
					if (roomMemory.level === undefined) { roomMemory.level = {} } 
					if (roomMemory.level[controller.level] === undefined) {
						roomMemory.level[controller.level] = {};

						if (controller.level === 1) {
							roomMemory.level[controller.level].start = Game.time;
						} else {
							roomMemory.level[controller.level].time = Game.time - roomMemory.level[1].start;	
						}
					}

					delete PUSH_RCL_TARGETS[roomCaller];					

					// Avoid stale objects
					if (BOT_MODE) {
						cleanGlobal(); 
					}

					// Update values
					roomMemory.RCLold = getRoomRCL(roomCaller);
				}

				// UPDATE SIEGED STATUS
				if (roomMemory.sieged) {
					if (Game.time >= roomMemory.sieged.ts && !roomMemory.hostiles) {
						delete roomMemory.sieged;

						let attackPower = roomMemory.sieged.attackPower || 100;
						let ticksToBreach = getLowWallHp(roomCaller) / attackPower;

						if (ticksToBreach < 2500) {
							roomMemory.reinforce = Math.max(Game.time + 2500, roomMemory.reinforce || 0);
						}

						if (getLowWallHp(roomCaller) < Math.min(1000000, WALL_HP_SETPOINT[room.controller.level] * 5)) {
							roomMemory.reinforce = Math.max(Game.time + 2500, roomMemory.reinforce || 0);
						}

						if (getAvgWallHp(roomCaller) >= WALL_HP_SETPOINT[room.controller.level]) {
							roomMemory.buildLayer2 = Game.time + 25000;
						}

					} else if (roomMemory.isPlayer && roomMemory.hostiles.power.strength >= 1500) {						
						roomMemory.sieged.ts = Game.time + 100;

						if (Memory.energyShare && !Memory.energyShare[roomCaller] &&
							room.energyStatus() < ECONOMY_SURPLUS
						) {
							if (Memory.energyShare.recieve === undefined) { Memory.energyShare.recieve = {}; }
							Memory.energyShare.recieve[roomCaller] = {};
						}
					}
				}
		

				if (roomMemory.reinforce && Game.time > roomMemory.reinforce) {
					delete roomMemory.reinforce;
				}
			}
		//	global.stats['cpu.aiRoomData.controller'] += Game.cpu.getUsed()-init;
			
        } else if (roomIsConfirmedHW){ // HIGHWAY ROOM
			// POWERBANK
			let powerBank;
			if (roomMemory.powerBank === undefined) {
				powerBank = room.find(FIND_STRUCTURES, {
						filter: (structure) => {
							return (structure.structureType == STRUCTURE_POWER_BANK)
						}});				
				if (powerBank.length > 0 ) {				 
					if (roomMemory.powerBank === undefined) { 
						roomMemory.powerBank = {} 
						roomMemory.powerBank.id = powerBank[0].id;
						roomMemory.powerBank.timeOut = Game.time + powerBank[0].ticksToDecay;
						roomMemory.powerBank.power = powerBank[0].power;
						roomMemory.powerBank.pos = posSave(powerBank[0].pos);
						roomMemory.powerBank.hits = powerBank[0].hits;
						roomMemory.powerBank.attackPos = powerBank[0].getNumberOfAttackPos();
					}
				}
			} else {
				powerBank = Game.getObjectById(roomMemory.powerBank.id)				
				if (powerBank) {
					roomMemory.powerBank.hits = powerBank.hits;						
				} else {
					delete roomMemory.powerBank;
				}
			}

			// TRACK PORTALS
			if (roomIsCorner(roomCaller)) {
				if (!roomCache.shardPortalsTs || Game.time > roomCache.shardPortalsTs){
					roomCache.shardPortalsTs = Game.time + 999;
					delete Memory.shardPortals[roomCaller];
					let portals = room.find(FIND_STRUCTURES, {
						filter: (structure) => {
							return (structure.structureType === STRUCTURE_PORTAL);
						}});

					if (portals.length > 0) {						
						if (!Memory.shardPortals[roomCaller]) { Memory.shardPortals[roomCaller] = {};	}						
						for (let idx=0; idx < portals.length; idx++ ){
							let portal = portals[idx];
							let destRoom = portal.destination.room;
							let destShard = portal.destination.shard;
						//	console.log("found portal from " + roomCaller + " to " +  dest);
							if (Memory.shardPortals[roomCaller][destShard] === undefined) { Memory.shardPortals[roomCaller][destShard] = {} }

							if (Memory.shardPortals[roomCaller][destShard][destRoom] === undefined)	{
								Memory.shardPortals[roomCaller][destShard][destRoom] = {}
								Memory.shardPortals[roomCaller][destShard][destRoom].pos = posCompress(portal.pos);
							//	console.log("added " + JSON.stringify(Memory.shardPortals[roomCaller][destShard][destRoom]))
							}
						}
					} 
				} 
			}			

			// TRACK DEPOSITS
			if (HARVEST_DEPOSITS || global._depositsForCredits.mine) {
				let deposit;
				if (Memory.deposits[roomCaller] === undefined || Game.time > Memory.deposits[roomCaller].ts) {
					deposit = room.find(FIND_DEPOSITS);
					if (deposit.length > 0 ) {

						if (Memory.deposits[roomCaller] === undefined) {
							Memory.deposits[roomCaller] = {}
							Memory.deposits[roomCaller].deposit = {};
							let minPrcl = DEPOSIT_MIN_PRCL
							if (!HARVEST_DEPOSITS) {
								minPrcl = 7;
							}

							Memory.deposits[roomCaller].assignedRooms = getMyClosestRooms(roomCaller, minPrcl, 2, 6);							
						}

						Memory.deposits[roomCaller].ts = Game.time + 97;

						for (let idx in deposit) {
							let id = deposit[idx].id;
							if (Memory.deposits[roomCaller].deposit[id] === undefined) {
								Memory.deposits[roomCaller].deposit[id] = {} 
								Memory.deposits[roomCaller].deposit[id].id = deposit[idx].id;
								Memory.deposits[roomCaller].deposit[id].timeOut = Game.time + deposit[idx].ticksToDecay;
								Memory.deposits[roomCaller].deposit[id].pos = posSave(deposit[idx].pos);
								let type = deposit[idx].depositType;
								Memory.deposits[roomCaller].deposit[id].type = type;
								Memory.deposits[roomCaller].deposit[id].minePos = deposit[idx].getNumberOfMiningPos();

								// Check if we want more								
								let currentAmount = Memory.Minerals[type] || 0;

								let wantedAmount = MINERAL_MIN_AMOUNT_STORED * 10
								if (BOT_MODE) {
									wantedAmount = MINERAL_MIN_AMOUNT_STORED
								}
								
								if (Memory.Minerals.Labs) {	// Factories?
									wantedAmount *= Object.keys(Memory.Minerals.Labs).length;
								}

								if (currentAmount > wantedAmount) {
									Memory.deposits[roomCaller].deposit[id].noTravel = true;
								}

								let sector = getSectorFromPos(deposit[idx].pos)
								if (HARVEST_DEPOSITS && MY_SECTORS[sector]) {
									Memory.deposits[roomCaller].deposit[id].mySector = 1;
								}

								// If my sector, mine it anyways!
								if (HARVEST_DEPOSITS && Object.keys(Memory.deposits[roomCaller].assignedRooms).length === 0) {									
									
									if (MY_SECTORS[sector]) {
										Memory.deposits[roomCaller].assignedRooms = getMyClosestRooms(roomCaller, DEPOSIT_MIN_PRCL, 2, 9);
									}
	
								}
								
								
							}										
							Memory.deposits[roomCaller].deposit[id].lastCooldown = deposit[idx].lastCooldown;
						}
					} else {
						delete Memory.deposits[roomCaller]
					}
				} else {

					for (let id in Memory.deposits[roomCaller].deposit) {
						deposit = Game.getObjectById(id);
						if (!deposit) { 
							delete Memory.deposits[roomCaller].deposit[id];
							continue;							
						}
						Memory.deposits[roomCaller].deposit[id].lastCooldown = deposit.lastCooldown
						Memory.deposits[roomCaller].deposit[id].timeOut = Game.time + deposit.ticksToDecay;
					}
					
					if (!Memory.deposits[roomCaller].deposit || Object.keys(Memory.deposits[roomCaller].deposit).length === 0) {
						delete Memory.deposits[roomCaller]
					}
				}
			}



		//	global.stats['cpu.aiRoomData.highway'] += Game.cpu.getUsed()-init;		  
		}

		// TRACK SYMBOLS
		if (SEASONAL_SYMBOLS) {

			// Average Data 
			if (roomIsConfirmedHW && Memory.combatDeconstruct[roomCaller]) {
				storeAverageHostiles(roomCaller, roomMemory.hostiles)
			}

			let score;
			if (Memory.score[roomCaller] === undefined || Game.time > Memory.score[roomCaller].ts) {
				score = room.find(FIND_SYMBOL_CONTAINERS)
				if (score.length > 0 ) {
					if (Memory.score[roomCaller] === undefined) {
						Memory.score[roomCaller] = {}
						Memory.score[roomCaller].score = {};

						let roomsInRange = getMyClosestRooms(roomCaller, 4, 0, 10);

						let closestRoom;
						let closestDistance = 9999;
						for (let roomName in roomsInRange) {
							if (roomsInRange[roomName].dist < closestDistance) {
								closestDistance = roomsInRange[roomName].dist;
								closestRoom = roomName;
							}
						}

						Memory.score[roomCaller].assignedRooms = {}
						if (closestRoom) {
							Memory.score[roomCaller].assignedRooms[closestRoom] = {};
							Memory.score[roomCaller].assignedRooms[closestRoom].dist = closestDistance;
						}
						
						
						if (Object.keys(roomsInRange).length > 0) {
							Memory.score[roomCaller].haulers = {};
							Memory.score[roomCaller].haulers = roomsInRange;
						}
						requestMemSave();
					}				

					Memory.score[roomCaller].ts = Game.time + 97;
					for (let idx in score) {
						let id = score[idx].id;
						if (Memory.score[roomCaller].score[id] === undefined) {
							Memory.score[roomCaller].score[id] = {} 
							Memory.score[roomCaller].score[id].id = score[idx].id;
							Memory.score[roomCaller].score[id].timeOut = Game.time + score[idx].ticksToDecay;
							Memory.score[roomCaller].score[id].pos = posSave(score[idx].pos);
							Memory.score[roomCaller].score[id].amount = score[idx].store[score[idx].resourceType];
							Memory.score[roomCaller].score[id].type = score[idx].resourceType;
						}
					}
				} else {
					delete Memory.score[roomCaller];
				}

			} else {

				for (let id in Memory.score[roomCaller].score) {
					score = Game.getObjectById(id);
					if (!score) { 
						delete Memory.score[roomCaller].score[id];
						continue;
					}
					Memory.score[roomCaller].score[id].amount = score.store[score.resourceType];
				}
				
				if (!Memory.score[roomCaller].score || Object.keys(Memory.score[roomCaller].score).length === 0) {
					delete Memory.score[roomCaller]
				}
			}



			// TRACK SYMBOL DECODERS
			
			if (room.controller && room.controller.owner ) {


				if (Memory.scoreCollector[roomCaller] === undefined || Game.time > Memory.scoreCollector[roomCaller].ts) {
					
					if (Memory.scoreCollector[roomCaller] === undefined) {
						score = room.find(FIND_SYMBOL_DECODERS)
						if (score.length > 0 ) {
							let collector = score[0];
							Memory.scoreCollector[roomCaller] = {}
							Memory.scoreCollector[roomCaller].id = collector.id;
							Memory.scoreCollector[roomCaller].pos = posSave(collector.pos);
							Memory.scoreCollector[roomCaller].type = collector.resourceType;
							Memory.scoreCollector[roomCaller].player = room.controller.owner.username;
							requestMemSave();
						}
					}

					if (Memory.scoreCollector[roomCaller] && Memory.scoreCollector[roomCaller].id) {
						let collector = Game.getObjectById(Memory.scoreCollector[roomCaller].id);
						if (!collector) {
							delete Memory.scoreCollector[roomCaller];
						} else {
							Memory.scoreCollector[roomCaller].ts = Game.time + 377;

							if (!Memory.scoreCollector[roomCaller].assignedSpawns || Game.time > Memory.scoreCollector[roomCaller].spawnTs) {

								Memory.scoreCollector[roomCaller].player = room.controller.owner.username;
								Memory.scoreCollector[roomCaller].spawnTs = Game.time + 1497;
								Memory.scoreCollector[roomCaller].assignedSpawns = {};

								let roomsInRange = {};
								if (room.controller.my) {
									roomsInRange[roomCaller] = {};
									roomsInRange[roomCaller].range = 1;
								} else {
									roomsInRange = getMyClosestRooms(roomCaller, 6, 0, 12);

								}

								if (Object.keys(roomsInRange).length > 0) {										
									Memory.scoreCollector[roomCaller].assignedSpawns = roomsInRange;									
								}
								requestMemSave();
							}							
						}
					}
				}
			} else {
				delete Memory.scoreCollector[roomCaller];
			}
		}

		// TRACK SCORE COLLECTORS
		if (SEASONAL_SCORE) {			
			if (roomIsCorner(roomCaller) ) {
				if (Memory.scoreCollector[roomCaller] === undefined || Game.time > Memory.scoreCollector[roomCaller].ts) {
					
					if (Memory.scoreCollector[roomCaller] === undefined) {
						let score = room.find(FIND_SCORE_COLLECTORS)
						if (score.length > 0 ) {
							let collector = score[0];
							Memory.scoreCollector[roomCaller] = {}
							Memory.scoreCollector[roomCaller].id = collector.id;
							Memory.scoreCollector[roomCaller].pos = posSave(collector.pos);
							requestMemSave();
						}
					}

					if (Memory.scoreCollector[roomCaller] && Memory.scoreCollector[roomCaller].id) {
						let collector = Game.getObjectById(Memory.scoreCollector[roomCaller].id);
						if (!collector) {
							delete Memory.scoreCollector[roomCaller];
						} else {
							Memory.scoreCollector[roomCaller].ts = Game.time + 37;
							Memory.scoreCollector[roomCaller].capacity = collector.store.getFreeCapacity(RESOURCE_SCORE);
							if (!Memory.scoreCollector[roomCaller].clearPath && (!Memory.scoreCollector[roomCaller].pathTs || Game.time > Memory.scoreCollector[roomCaller].pathTs)) {

								// Check for path
								let exits = room.find(FIND_EXIT);
								let pathToBank = findTravelPath(collector, exits[0],
									{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:2500});
								if (pathToBank.incomplete) {	
									// delay next search
									Memory.scoreCollector[roomCaller].pathTs = Game.time + 337;

									let roomsInRange = getMyClosestRooms(roomCaller, 7, 0, 9)
									if (Object.keys(roomsInRange).length > 0) {										
										Memory.scoreCollector[roomCaller].destoyer = Object.keys(roomsInRange)[0];
									}									
								} else {
									Memory.scoreCollector[roomCaller].clearPath = true;
									delete Memory.scoreCollector[roomCaller].pathTs;
									delete Memory.scoreCollector[roomCaller].destoyer;									
									requestMemSave();
								} 
							}
							if (Memory.scoreCollector[roomCaller].clearPath && !Memory.scoreCollector[roomCaller].assignedSpawns || Game.time > Memory.scoreCollector[roomCaller].spawnTs) {
								Memory.scoreCollector[roomCaller].spawnTs = Game.time + 1497;
								let roomsInRange = getMyClosestRooms(roomCaller, 7, 4, 5)
								if (Object.keys(roomsInRange).length > 0) {										
									Memory.scoreCollector[roomCaller].assignedSpawns = roomsInRange;
								}
							}

							
						}
					}
				}
			}

			
			let score;
			// TRACK SCORE CONTAINERS
			if (Memory.score[roomCaller] === undefined || Game.time > Memory.score[roomCaller].ts) {
				score = room.find(FIND_SCORE_CONTAINERS)	//??
				if (score.length > 0 ) {
					if (Memory.score[roomCaller] === undefined) {
						Memory.score[roomCaller] = {}
						Memory.score[roomCaller].score = {};
					//	Memory.score[roomCaller].assignedRooms = getMyClosestRooms(roomCaller, 4, 0, 5);

						let roomsInRange = getMyClosestRooms(roomCaller, 4, 5, 5);

						let closestRoom;
						let closestDistance = 9999;
						for (let roomName in roomsInRange) {
							if (roomsInRange[roomName].dist < closestDistance) {
								closestDistance = roomsInRange[roomName].dist;
								closestRoom = roomName;
							}
						}

						Memory.score[roomCaller].assignedRooms = {}
						if (closestRoom) {
							Memory.score[roomCaller].assignedRooms[closestRoom] = {};
							Memory.score[roomCaller].assignedRooms[closestRoom].dist = closestRoom;
						}
						
						
						if (Object.keys(roomsInRange).length > 0) {
							Memory.score[roomCaller].haulers = {};
							Memory.score[roomCaller].haulers = roomsInRange;
						}
						requestMemSave();
					}				

					Memory.score[roomCaller].ts = Game.time + 97;
					for (let idx in score) {
						let id = score[idx].id;
						if (Memory.score[roomCaller].score[id] === undefined) {
							Memory.score[roomCaller].score[id] = {} 
							Memory.score[roomCaller].score[id].id = score[idx].id;
							Memory.score[roomCaller].score[id].timeOut = Game.time + score[idx].ticksToDecay;
							Memory.score[roomCaller].score[id].pos = posSave(score[idx].pos);
							Memory.score[roomCaller].score[id].amount = score[idx].store[RESOURCE_SCORE];
						}
					}
				} else {
					delete Memory.score[roomCaller];
				}

			} else {

				for (let id in Memory.score[roomCaller].score) {
					score = Game.getObjectById(id);
					if (!score) { 
						delete Memory.score[roomCaller].score[id];
						continue;
					}
					Memory.score[roomCaller].score[id].amount = score.store[RESOURCE_SCORE];
				}
				
				if (!Memory.score[roomCaller].score || Object.keys(Memory.score[roomCaller].score).length === 0) {
					delete Memory.score[roomCaller]
				}
			}
		}

		
		
	//	init = Game.cpu.getUsed();
		
		if (!roomIsConfirmedHW && 
			(!roomCache.scoutNotHighway || Game.time > roomCache.scoutNotHighway )
		){

			roomCache.scoutNotHighway = Game.time + 27;

			if (BOT_MODE && !roomMemory[R.MY_MINING_OUTPOST] ){
				detectEnemyRemote(roomCaller);
			} else {
				if (roomMemory.enemyRemoteTs && Game.time > roomMemory.enemyRemoteTs) {
					delete roomMemory.enemyRemoteTs;
					delete roomMemory.enemyRemote;
				}
			}

			controller = room.controller;

			if (roomMemory.invaderCore || 
				(controller && controller.reservation && controller.reservation.username === "Invader") ||
				((roomMemory[R.MY_MINING_OUTPOST] || roomIsConfirmedSk) && (!roomCache.coreTs || Game.time > roomCache.coreTs))
			) {
				roomCache.coreTs = Game.time + 78;

				if (roomMemory.invaderCore === undefined) {
					let invaderCore = room.find(FIND_STRUCTURES, {
						filter: (structure) => {
							return (structure.structureType == STRUCTURE_INVADER_CORE)
						}});
					if (invaderCore.length) {
						roomMemory.invaderCore = {};
						roomMemory.invaderCore.id = invaderCore[0].id;
						roomMemory.invaderCore.level = invaderCore[0].level;
						

						if (invaderCore[0].ticksToDeploy) {
							roomMemory.invaderCore.deploy = Game.time + invaderCore[0].ticksToDeploy;
							roomMemory.invaderCore.ts = Game.time + invaderCore[0].ticksToDeploy + STRONGHOLD_DECAY_TICKS;
						} else {
							let collapseEffect = invaderCore[0].getEffect(EFFECT_COLLAPSE_TIMER) 
							if (collapseEffect) {
								roomMemory.invaderCore.ts = collapseEffect.ticksRemaining + Game.time;
							}
						}

						if (roomMemory.invaderCore.level === 0 && roomMemory[R.MY_MINING_OUTPOST]) {
							roomMemory.invaderCore.remote = 1;		
						} else if (roomMemory.invaderCore.level > 0) {			
							clearDeadCore(roomCaller)
							roomMemory.invaderCore.base = 1;
							roomMemory.invaderCore.pos = posCompress(invaderCore[0].pos)
							if (roomMemory.invaderCore.deploy && Game.time > roomMemory.invaderCore.deploy) {
								delete roomMemory.invaderCore.deploy;
								gatherInvaderData(roomCaller, invaderCore[0]);
							} else {
								roomMemory.avoid = Game.time + 2500;
							}
						}

					} else {
						delete roomMemory.invaderCore;

						
					}

				} else {
					let core = Game.getObjectById(roomMemory.invaderCore.id);
					if (!core) {
						if (roomMemory.invaderCore.level > 0 && Game.time < roomMemory.invaderCore.ts) {
							checkForLootMission(roomCaller, true);
							registerDeadCore(roomCaller, roomMemory.invaderCore.ts);
						}
						delete roomMemory.invaderCore;
					} else if (core.level > 0) {
						roomMemory.avoid = Game.time + 1500;
						if (!core.ticksToDeploy && (!roomMemory.invaderCore.tsData || Game.time > roomMemory.invaderCore.tsData)) {
							gatherInvaderData(roomCaller, core);
							roomMemory.invaderCore.tsData = Game.time + 477;
						}
					}
					
					if (roomMemory.invaderCore && 
						roomMemory.invaderCore.deploy && 
						Game.time > roomMemory.invaderCore.deploy
					) {
						delete roomMemory.invaderCore.deploy;
					}
				}
			}

			 // ADD SOURCES TO ROOM
			if (BOT_MODE || withinMyTerritory(roomCaller) <= 2) {

				if (roomMemory.sources === undefined) {
					roomMemory.sources = {}
					let sources = room.find(FIND_SOURCES);
					for (let x=0; x<sources.length; x++) {
						roomMemory.sources[sources[x].id] = {};
						roomMemory.sources[sources[x].id].pos = posCompress(sources[x].pos);
					}
				}
			 
				// ADD MINERAL TO ROOM
				if (roomMemory.mineral === undefined || (SEASONAL_THORIUM && roomIsConfirmedController && Object.keys(roomMemory.mineral).length < 2)) {
					roomMemory.mineral = {}
					let mineral = room.getMinerals();
					for (let x=0; x<mineral.length; x++) {
						roomMemory.mineral[mineral[x].id] = {} ;
						roomMemory.mineral[mineral[x].id].type = mineral[x].mineralType;
						roomMemory.mineral[mineral[x].id].pos = posCompress(mineral[x].pos);
					}
	
					if (SEASONAL_THORIUM) {
					//	if (!roomMemory.thorium) {
						let thor = room.getThorium();
						if (thor) {
							roomMemory.thorium = {}
							roomMemory.thorium[thor.id] = {};
							roomMemory.thorium[thor.id].pos = posCompress(thor.pos);
							roomMemory.thorium[thor.id].mineralAmount = thor.mineralAmount;
	
							roomMemory.mineral[thor.id] = {};
							roomMemory.mineral[thor.id].type = thor.mineralType;
							roomMemory.mineral[thor.id].pos = posCompress(thor.pos);
						
						}
					}
				}

				if (SEASONAL_THORIUM) {				
					for (let id in roomMemory.thorium) {
						let thorium = Game.getObjectById(id);
						if (!thorium) { 
							roomMemory.thorium[id].mineralAmount = 0; 
							roomMemory.thorium[id].depleted = true;
						} else {
							roomMemory.thorium[id].mineralAmount = thorium.mineralAmount;
						}
					}
				}	
			}
			

			
			

			
			if (BOT_MODE && roomIsConfirmedSk && roomMemory.lairs === undefined) {
				let skSpawn = room.find(FIND_HOSTILE_STRUCTURES, {
					filter: (structure) => {
					return (structure.structureType === STRUCTURE_KEEPER_LAIR);
				}}); 
				roomMemory.lairs = [];
				for (let idx in skSpawn) {
					roomMemory.lairs.push(posCompress(skSpawn[idx].pos));
				}
			}

					
			if (roomMemory.myRoom || roomIsConfirmedSk || roomIsConfirmedCenter ) {
				// TRACK MINERAL CD
				for (let mineralId in roomMemory.mineral) {
				//	if (roomMemory.mineral.cd) { continue; }
					let mineral = Game.getObjectById(mineralId);
					if (mineral && mineral.ticksToRegeneration) {
						roomMemory.mineral[mineralId].cd = Game.time + mineral.ticksToRegeneration;
					} else {
						delete roomMemory.mineral[mineralId].cd;
					}
				}
				delete roomMemory.mineralCd 	

				// TRACK PORTALS
				if (roomIsConfirmedCenter) {
					if (!roomMemory.portal){
						let portals = room.find(FIND_STRUCTURES, {
							filter: (structure) => {
								return (structure.structureType === STRUCTURE_PORTAL);
							}});

						if (portals.length > 0) {
							roomMemory.portal = portals[0].id;
							if (!Memory.portals[roomCaller]) { Memory.portals[roomCaller] = {};	}
							
							for (let idx=0; idx < portals.length; idx++ ){
								let portal = portals[idx];
								let dest = portal.destination.roomName;
							//	console.log("found portal from " + roomCaller + " to " +  dest);
								if (Memory.portals[roomCaller][dest] === undefined) {
									global.portalMap = {};
									
									Memory.portals[roomCaller][dest] = {};
									Memory.portals[roomCaller][dest].pos = posCompress(portal.pos);
									Memory.portals[roomCaller][dest].destPos = posCompress(portal.destination);
									console.log("added portals " + JSON.stringify(Memory.portals[roomCaller][dest]))
								}
							}
						} else {
							delete roomMemory.portal;
							delete Memory.portals[roomCaller];
							global.portalMap = {};
						}
					} else {
						let portalFromId = Game.getObjectById(roomMemory.portal)
						if (portalFromId) {
							if (portalFromId.ticksToDecay) {
							//	Memory.portals[roomCaller].decay = Game.time + portalFromId.ticksToDecay;
							}
						} else {
							delete roomMemory.portal;
							delete Memory.portals[roomCaller];
							global.portalMap = {};
						}
					}

					if (SEASONAL_THORIUM) {
						if (!roomMemory.reactor) {
							let reactor = room.find(FIND_REACTORS);
							if (reactor.length > 0) {

								roomMemory.reactor = {
									id: reactor[0].id,
									pos: posCompress(reactor[0].pos)
								};

								Memory.reactors[roomCaller] = {
									id: reactor[0].id,
									pos: posCompress(reactor[0].pos)
								}

							}
						} 

						if (roomMemory.reactor) {
							let reactor = Game.getObjectById(roomMemory.reactor.id)

							if (reactor && Memory.reactors[roomCaller]) {
								Memory.reactors[roomCaller].ts = Game.time;
								if (Memory.reactors[roomCaller].continuousWork && (!reactor.continuousWork || Memory.reactors[roomCaller].continuousWork > reactor.continuousWork)) {
									if (Memory.reactors[roomCaller].resets === undefined) { Memory.reactors[roomCaller].resets = 0; }
									Memory.reactors[roomCaller].resets++;
									if (Memory.reactors[roomCaller].maxLostContinousWork === undefined) { Memory.reactors[roomCaller].maxLostContinousWork = 0; }
									Memory.reactors[roomCaller].maxLostContinousWork = Math.max(Memory.reactors[roomCaller].maxLostContinousWork, Memory.reactors[roomCaller].continuousWork)
									log("REACTOR RESET DETECTED IN " + roomCaller)
								}
								delete Memory.reactors[roomCaller].transfer
								Memory.reactors[roomCaller].continuousWork = reactor.continuousWork;
								Memory.reactors[roomCaller].storedThorium = reactor.store[RESOURCE_THORIUM];

								if (Memory.reactors[roomCaller].maxContinousWork === undefined) { Memory.reactors[roomCaller].maxContinousWork = 0; }
								Memory.reactors[roomCaller].maxContinousWork = Math.max(Memory.reactors[roomCaller].maxContinousWork, reactor.continuousWork)
								

								Memory.reactors[roomCaller].my = reactor.my;
								if (reactor.my) {
									roomCache.scoutNotHighway = Game.time;
								}
								Memory.reactors[roomCaller].playerName = "";
								if (reactor.owner && reactor.owner.username) {
									Memory.reactors[roomCaller].playerName = reactor.owner.username
								}

								if (!Memory.reactors[roomCaller].assignTs || Game.time > Memory.reactors[roomCaller].assignTs) {
									Memory.reactors[roomCaller].assignTs = Game.time + 3999;

									let prevData;
									if (Memory.reactors[roomCaller].assignedRooms) { 
										prevData = _.clone(Memory.reactors[roomCaller].assignedRooms)
									}

									Memory.reactors[roomCaller].assignedRooms = getMyClosestRooms(roomCaller, 6, 2, 5);

									for (let spawner in Memory.reactors[roomCaller].assignedRooms) {
										if (Memory.rooms[spawner].mineOnly) { 
											delete Memory.reactors[roomCaller].assignedRooms[spawner] 
										}
									}

									// restore data
									for (let prevRoom in prevData) {
										if (Memory.reactors[roomCaller].assignedRooms[prevRoom] && Memory.reactors[roomCaller].assignedRooms[prevRoom].dist === prevData[prevRoom].dist) {
											Memory.reactors[roomCaller].assignedRooms[prevRoom] = prevData[prevRoom];
										}
									}
								}
							}
							
						}
					}
				}
			}
		}			   
	//	global.stats['cpu.aiRoomData.notHighway'] += Game.cpu.getUsed()-init;
		  
	//	init = Game.cpu.getUsed();
		// FIND STRUCTURES
		
        if (room.controller && (!roomCache.scoutStructures || Game.time > roomCache.scoutStructures)) {

			roomCache.scoutStructures = Game.time + 17;
			delete roomMemory.myRoom
			delete roomMemory.hostileRoom
			delete roomMemory.player
			
			if (room.controller.owner){

				recordNukes(roomCaller);
				let nukeIminent = nukeThreatImminent(roomCaller);
				if (nukeIminent) {
					assignFleeRoles(roomCaller, nukeIminent);
					console.log(roomCaller + " FLEE FROM NUKE! ")
				}
			

				if (room.controller.my && !room.controller._unclaimed){
					roomMemory.myRoom = 1;
					delete roomMemory[R.MY_MINING_OUTPOST];
									
					// COUNT STRUCTURES AND UPDATE CACHE IF NEEDED
					room.checkFindCache();					
					
				} else  {

					// Average Data 
					if (BOT_MODE) {
						storeAverageHostiles(roomCaller, roomMemory.hostiles)
					}

					roomMemory.player = room.controller.owner.username;

					let enemyStructures = room.find(FIND_HOSTILE_STRUCTURES, {
						filter: (structure) => {
						return (structure.structureType != STRUCTURE_CONTROLLER &&
								structure.structureType != STRUCTURE_RAMPART &&
								structure.structureType != STRUCTURE_EXTRACTOR &&
								structure.structureType != STRUCTURE_LINK) }});
					if (enemyStructures.length){
						roomMemory.hostileRoom = 1;

						let towers = _.filter(enemyStructures,
							(s) => s.structureType === STRUCTURE_TOWER);

						roomMemory.numberOfTowers = Math.min(towers.length, CONTROLLER_STRUCTURES[STRUCTURE_TOWER][room.controller.level]);
					} else {
						roomMemory.numberOfTowers = 0;
					}

					// Squash new room!
					if (BOT_MODE &&
						!globalEnergyCrysis() &&
						!ALLIES[roomMemory.player] &&
						(!AVOID[roomMemory.player] || (AVOID[roomMemory.player] && (Object.keys(getMyClosestRooms(roomCaller, 3, 8)).length === 0) || (SEASONAL_THORIUM && MY_SECTORS[getSectorV2(roomCaller)]))) &&						
						!roomIsSafeModed(roomCaller) &&
						!playerIsDead(getPlayerByRoomName(roomCaller)) &&
						roomMemory.numberOfTowers <= 0 &&						
						(roomMemory.isPlayer === roomMemory.player || 
						roomMemory.hostileRoom)
					) {



						let requiredEco = ECONOMY_RICH;
						let inMyTerritory = withinMyTerritory(roomCaller);
						if (inMyTerritory !== undefined && inMyTerritory <= 1) {
							requiredEco = ECONOMY_LOW;
						} else if (inMyTerritory !== undefined && inMyTerritory <= 3) {
							requiredEco = ECONOMY_DEVELOPING;
						}

						let skipAttack = false
						if (SEASONAL_PASSIVE_MODE && !MY_SECTORS[getSectorV2(roomCaller)] && !inMyTerritory) {
							skipAttack = true;
						}

						if (!skipAttack && Object.keys(getMyClosestRooms(roomCaller, 5, 4, 5, requiredEco).length > 0)) {
							reassignInvaderKillers(roomCaller);
							reassignAttackers(roomCaller, getCreeps('rangedAttacker'));
							orderRangedAttackers(roomCaller, 500, "low RCL mining");
							
							if (Memory.myRoomHighPRCL >= 8 && 
								roomMemory.hostiles && roomMemory.hostiles.power.defensive > 500 &&
								roomMemory.isPlayer === roomMemory.player
							) {
								if (Memory.raids.activeTargets[roomCaller] === undefined) {
									console.log("addRaid low RCL " + roomCaller);
									addRaid(roomCaller, {raidType: RAID_TYPE_PHALANX, unBoosted: true});
								}
							} else {
								console.log("orderRangedAttackers low RCL " + roomCaller)
								orderRangedAttackers(roomCaller, 500, "low RCL");
							}
						}
					}
				
					if (BOT_MODE || blackList[roomMemory.player]) {
						checkForChangedStructureCount(roomCaller)
						gatherPlayerData(roomCaller, roomMemory.player);
						getControllerAttackPositionsCount(roomCaller);
					}
					

				}
            } else {
				delete roomMemory.player;
				delete roomMemory.numberOfTowers;
				delete roomMemory.myRoom;

				checkForLootMission(roomCaller);
			}
		}
	//	global.stats['cpu.aiRoomData.structures'] += Game.cpu.getUsed()-init;
		  
	//	init = Game.cpu.getUsed();
        if (roomIsConfirmedSk && Game.cpu.getUsed() < 300 ) {

			let options = {
				plainCost: 2,
				swampCost: 10
			}
			let id = roomCaller + options.plainCost + ":" + options.swampCost;

			
			if (!global._avoidSKcreeps[id]) {
				// update the matrix
				let matrix = new PathFinder.CostMatrix();
				avoidSKcreeps(roomCaller, matrix, options)
			}
		}
	//	global.stats['cpu.aiRoomData.avoidSKcreeps'] += Game.cpu.getUsed()-init;
		
		
        if (BOT_MODE && !roomIsConfirmedHW && !roomIsConfirmedCenter && !roomIsConfirmedSk ){
			gatherRoomData(roomCaller);
			scoreAttacks(roomCaller);
		} else if (roomMemory.invaderCore && (roomIsConfirmedCenter || roomIsConfirmedSk)) {
			scoreAttacks(roomCaller);
		}

		// Update Avoid status for Traveller		
		if (roomMemory.hostiles && roomMemory.hostiles.power.defensive > 1500) {
			roomMemory.avoid = Game.time + 500;
		} else if (room.controller && room.controller.owner && !room.controller.my) {
			if (SEASONAL_SYMBOLS && (ALLIES[room.controller.owner.username] || ALLOW_SCORE[room.controller.owner.username])) {
				delete roomMemory.avoid;
			} else if (roomMemory.numberOfTowers > 0 || roomIsSafeModed(roomCaller) > 1000) {
				roomMemory.avoid = Game.time + 5000;
			}
        } else {
            if (roomMemory.avoid && Game.time > roomMemory.avoid) {
                delete roomMemory.avoid;
            }
		}

		
		if (!BOT_MODE && !roomMemory.myRoom && !roomMemory[R.MY_MINING_OUTPOST] && Object.keys(roomMemory).length <= 0) {
			delete Memory.rooms[roomCaller];
		}

    }
}
module.exports = roomData;


global.getFakeSources = function (roomName) {
	let sources = []

	if (Memory.rooms[roomName] && Memory.rooms[roomName].sources) {
		for (let id in Memory.rooms[roomName].sources) {
			sources.push({id: id, pos: posDecompress(Memory.rooms[roomName].sources[id].pos, roomName)})
		}
	} else {
		log(roomName + " NO SOURCES!")
	}

	return sources
}

global.getFakeMinerals = function (roomName) {
	let minerals = []

	if (Memory.rooms[roomName] && Memory.rooms[roomName].mineral) {
		for (let id in Memory.rooms[roomName].mineral) {
			minerals.push({id: id, pos: posDecompress(Memory.rooms[roomName].mineral[id].pos, roomName)})
		}
	} else {
		log(roomName + " NO MINERALS!")
	}
	
	return minerals
}

global.getFakeController = function (roomName) {
	if (Memory.rooms[roomName] && Memory.rooms[roomName].controller) {
		return {pos: posDecompress(Memory.rooms[roomName].controller.pos, roomName), my: Memory.rooms[roomName].myRoom}
	}
	log(roomName + " NO CONTROLLER!")
}

global.getFakeExits = function (roomName) {
	let exits = []
	for (let n = 0; n <= 49; n++) {
		if (getRoomTerrainAt(0, n, roomName) !== TERRAIN_MASK_WALL) { exits.push({x: 0, y: n, roomName: roomName}) }
		if (getRoomTerrainAt(n, 0, roomName) !== TERRAIN_MASK_WALL) { exits.push({x: n, y: 0, roomName: roomName}) }
		if (getRoomTerrainAt(49, n, roomName) !== TERRAIN_MASK_WALL) { exits.push({x: 49, y: n, roomName: roomName}) }
		if (getRoomTerrainAt(n, 49, roomName) !== TERRAIN_MASK_WALL) { exits.push({x: n, y: 49, roomName: roomName}) }
	}

	return exits;
}

global.getOfflineExits = function (roomName) {
	let exits = []
	for (let n = 0; n <= 49; n++) {
		if (getRoomTerrainAt(0, n, roomName) !== TERRAIN_MASK_WALL) { exits.push(new RoomPosition(0, n, roomName)) }
		if (getRoomTerrainAt(n, 0, roomName) !== TERRAIN_MASK_WALL) { exits.push(new RoomPosition(n, 0, roomName)) }
		if (getRoomTerrainAt(49, n, roomName) !== TERRAIN_MASK_WALL) { exits.push(new RoomPosition(49, n, roomName)) }
		if (getRoomTerrainAt(n, 49, roomName) !== TERRAIN_MASK_WALL) { exits.push(new RoomPosition(n, 49, roomName)) }
	}

	return exits;
}


function backStabDetection(roomCaller){

	
	let events = Game.rooms[roomCaller].getEventLog();
	let destroyedEvents = [];
	let cacheHits = {}; // since event destroyed does not work for structures
	for (let eventIdx in events) {
		let event = events[eventIdx];
		if (event.event === EVENT_ATTACK) {

			let actor = Game.getObjectById(event.objectId);
			if (actor && actor.my) { continue; }
			
			let target = Game.getObjectById(event.data.targetId);
			
		}
	}
}

global.openGates = function(roomCaller, open) {

	if (!Memory.rooms[roomCaller].gates || Game.time > Memory.rooms[roomCaller].gatesTs ) {
		Memory.rooms[roomCaller].gatesTs = Game.time + 1377;
		Memory.rooms[roomCaller].gates = [];
		
		let goal;
		if (SEASONAL_SYMBOLS) {
			goal = Game.rooms[roomCaller].find(FIND_SYMBOL_DECODERS)[0];
		} else {
			goal = Game.rooms[roomCaller].controller;
		}
		
		let ramparts = Game.rooms[roomCaller].findByType(STRUCTURE_RAMPART);
		let avoidRamparts = new PathFinder.CostMatrix();
		for (let idx in ramparts){
			let rampart = ramparts[idx];

			let terrainCost = 0;
			if (getRoomTerrainAt(rampart.pos) === TERRAIN_MASK_SWAMP) {
				terrainCost = 5;
			}
			avoidRamparts.set(rampart.pos.x, rampart.pos.y, 10 + terrainCost);
		}
		
		// Get exits to path from, make sure each exit has a path to the goal 
		let exits = Game.rooms[roomCaller].findReducedExits();

		for (let exit in exits){

			let pathToDecoder = findTravelPath(exits[exit], goal.pos,
				{range: 1, uncompressed: true, ignoreRoads: true, freshMatrix: true, maxRooms: 1, costMatrix: avoidRamparts}); 
			if (pathToDecoder.incomplete) { continue; }
			for (let position of pathToDecoder.path ) {	
					
				let blocker = position.lookForStructure(STRUCTURE_RAMPART);
				if (blocker) {
					Memory.rooms[roomCaller].gates.push(blocker.id);
					avoidRamparts.set(blocker.pos.x, blocker.pos.y, 1); // reuse this gate for other paths
				}
			}
		}
		
		// Make sure to close old gates no longer used as gate
		for (let idx in ramparts) {
			let rampart = ramparts[idx];
			if (rampart.isPublic && !Memory.rooms[roomCaller].gates.includes(rampart.id)) {
				rampart.setPublic(false);
			}
		}
	}

	// let gates stay shut some ticks before opening again
	if (open && Game.time < Memory.rooms[roomCaller].gatesToggleTs) { return; }

	for (let idx in Memory.rooms[roomCaller].gates) {
		
		let rampart = Game.getObjectById(Memory.rooms[roomCaller].gates[idx]);

		if (!rampart) {
			// gate is missing, recalc gates
			Memory.rooms[roomCaller].gatesTs = Game.time;
			continue;
		}

		if (rampart.isPublic !== open) {
			Memory.rooms[roomCaller].gatesToggleTs = Game.time + 50;
			rampart.setPublic(open);
		}
	}
}

function clearDeadCore(roomName){
	let sector = getSectorV2(roomName);
	delete Memory.iCore[sector];
}

function registerDeadCore(roomName, ts) {
	let sector = getSectorV2(roomName);
	Memory.iCore[sector] = {};
	Memory.iCore[sector].deadTs = ts;
	Memory.iCore[sector].roomName = roomName;
}

global.checkDeadInvaderCoresForLoot = function(){
	if (Game.time % 137 === 0) {
		for (let sector in Memory.iCore) {
			if (Game.time > Memory.iCore[sector].deadTs) { 
				delete Memory.iCore[sector]
				continue;
			}
			let roomName = Memory.iCore[sector].roomName
			if (!roomName) { continue; }
			
			if (!Game.rooms[roomName]) {continue; }
			checkForLootMission(Memory.iCore[sector].roomName, true);
		}
	}
}

global.roomHasDeadCore = function(roomName){
	let sector = getSectorV2(roomName);
	if (Memory.iCore[sector] && Memory.iCore[sector].roomName === roomName) {
		if (Game.time < Memory.iCore[sector].deadTs) {
			return Memory.iCore[sector].deadTs - Game.time;
		} else {
			delete Memory.iCore[sector];
		}
	}
	return 0;
}

global.sectorHasDeadInvaderCore = function(roomName){
	let sector = getSectorV2(roomName);
	if (Memory.iCore[sector]) {
		if (Game.time < Memory.iCore[sector].deadTs) {
			return Memory.iCore[sector].deadTs - Game.time;
		} else {
			delete Memory.iCore[sector];
		}
	}
	return 0;
}

global.getLootStores = function(roomName, ignoreRampart = false) {
	let stores = [];
	
	if (roomIsHW(roomName)) {
		let lootCreeps = Game.rooms[roomName].find(FIND_TOMBSTONES, {
			filter: (stones) => {
				return ((
					stones.ticksToDecay > 1500)
				);
			}
		});
		stores = stores.concat(lootCreeps);
	} else {
		if (!ignoreRampart) {
			stores = _.filter(Game.rooms[roomName].findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE, STRUCTURE_CONTAINER, STRUCTURE_FACTORY]),
				function (structure) {
					return (!structure.pos.lookForStructure(STRUCTURE_RAMPART));
				});
		} else {
			stores = Game.rooms[roomName].findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE, STRUCTURE_CONTAINER, STRUCTURE_FACTORY])
		}
	}

	let lootRuins = Game.rooms[roomName].find(FIND_RUINS, {
			filter: (ruin) => {
				return ((
					ruin.ticksToDecay > 1500 && 
					(ruin.structure.structureType === STRUCTURE_INVADER_CORE ||
					ruin.structure.structureType === STRUCTURE_STORAGE || 
					ruin.structure.structureType === STRUCTURE_TERMINAL) &&					
					!ruin.pos.lookForStructure(STRUCTURE_RAMPART))
				);
			}
		});

	stores = stores.concat(lootRuins);
	
	return stores;
}

global.checkForLootMission = function(roomName, forceCheck=false, ignoreRampart=false){

	if (!Game.rooms[roomName] || 
		(Game.rooms[roomName].controller && Game.rooms[roomName].controller.my) || 
		(Game.rooms[roomName].controller && Game.rooms[roomName].controller.reservation && ALLIES[Game.rooms[roomName].controller.reservation.username]) ||
		isGCLPraiseRoomStandby(roomName)
	) {
		return 0;
	}

	if (!forceCheck && 
		(Memory.rooms[roomName] && Memory.rooms[roomName].lootTs && Game.time < Memory.rooms[roomName].lootTs )
	) {
		return 0;
	}
	
	delete Memory.lootMission[roomName];

	let stores = getLootStores(roomName, ignoreRampart)

	if (stores.length <= 0) { return; }

	if (Memory.rooms[roomName] === undefined) {Memory.rooms[roomName] = {} }

	Memory.rooms[roomName].lootTs = Game.time + 15000;

	let score = 0;
	let totalRes = 0;
	let mostValuable = 0;

	let unreachableScore = 0;
	let unreachableStores = []

	
	let energyCost = getResourceWorth(RESOURCE_ENERGY);
	let looterCost = (energyCost * BODYPART_COST[MOVE] * 25) + (energyCost * BODYPART_COST[CARRY] * 25);
	let targetStore;
	
	for (let i=0; i < stores.length; i++ ) {
		let storeStructure = stores[i];

		let currentScore = 0;
		let currentMostValuable = 0;

		for (let res in storeStructure.store) {
			
			if (res === RESOURCE_ENERGY && Memory.rooms[roomName][R.MY_MINING_OUTPOST]) { continue; }

			let amount = storeStructure.store[res];
			if (amount <= 0) { continue; }
			totalRes += amount;			
			
			if (BASE_MINERALS_OBJECT[res] && !wantToMineMineral(res)) { continue; }			
			if (COMPRESSED_RESOURCE[res] && !wantToMineMineral(COMPRESSED_RESOURCE[res].raw)) { continue; }

			let currentMarketValue = getResourceWorth(res);
									

			if (T3_WANTED_BOOSTS_OBJECT[res]) { 
				currentScore += 1.5 * currentMarketValue * amount;
			} else {
				currentScore += currentMarketValue * amount;
			}

			currentMostValuable = Math.max(currentMostValuable, currentMarketValue)
		}

		let reachable = true;
		let entrances = 0;
		if (currentScore > looterCost * 5) {
			
			let exits = Game.rooms[roomName].findReducedExits();
			for (let exit in exits) {
				let pathToStore = findTravelPath(exits[exit], storeStructure.pos,
					{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:5000});
				if (pathToStore.incomplete) {
					reachable = false;
					break;
				} else if (SEASONAL_SYMBOLS && getRoomPRCL(roomName) <= 0) {
					entrances++;
				}
				targetStore = storeStructure
			}

			if (!reachable && entrances <= 0) {
				unreachableScore += currentScore;
				unreachableStores.push({store: storeStructure, score: currentScore})
				continue; 
			}

			score += currentScore;
			mostValuable = Math.max(mostValuable, currentMostValuable)
		}

	}

	let maxRange = 12;
	let addMaxRange = 0;
	let minPRCL = 6;

	let roomsInRange
	if (unreachableScore) {
		roomsInRange = getMyClosestRooms(roomName, minPRCL, addMaxRange, maxRange);
		if (Object.keys(roomsInRange).length > 0) { 
			log("checkForLootMission found UNREACHABLE credits value of " + unreachableScore.toFixed(0) + " in room " + roomName + " with rooms in range " +Object.keys(roomsInRange).length  )

			Memory.rooms[roomName].lootTs = Game.time + 500;

			if (SEASONAL_THORIUM && roomHasDeadCore(roomName) && !Memory.combatDeconstruct[roomName]) {
				orderCleanUp(roomName);
			}
			// check cost of deconstructors 
		}
	}

	if (score === 0) { return false; } 

	if (score > looterCost * 10) {
		
	//	if (!roomsInRange) {
			roomsInRange = getMyClosestRooms(roomName, minPRCL, addMaxRange, maxRange);
	//	}
		
		log("checkForLootMission found credits value of " + score.toFixed(0) + " in room " + roomName + " with rooms in range " +Object.keys(roomsInRange).length  )
		if (Object.keys(roomsInRange).length > 0) {

			requestMemSave();

			let roomDistance = roomsInRange[Object.keys(roomsInRange)[0]].dist;
			let tripsPerLifetime = Math.floor(CREEP_LIFE_TIME / (roomDistance * 2 * 50));
			let creepLifeHaul = mostValuable * CARRY_CAPACITY * 25 * tripsPerLifetime;
			
			let netGain = creepLifeHaul - looterCost;

			console.log("loot mission to " + roomName + " credits gain hauler " + netGain.toFixed(0) + " possible roundtrips " + tripsPerLifetime + " with most valuable " + mostValuable + " creep cost " + looterCost)
			if (netGain > looterCost * 10) {

				// check if assigned rooms can reach
				let pathPossible = false;
				for (let assignedRooms in roomsInRange) {
					let pathToStore = findTravelPath(Game.rooms[assignedRooms].controller.pos, targetStore,
					{range: 1, ignoreRoads: true, ignoreCreeps: true, maxOps:50000});
					if (pathToStore.incomplete) {
						delete roomsInRange[assignedRooms];
						continue;
					}
					pathPossible = true;
					break;
				}

				if (!pathPossible) {
					return false;
				}

				Memory.lootMission[roomName] = {};
				Memory.lootMission[roomName].lootScore = Number(score.toFixed(0));
				Memory.lootMission[roomName].assignedSpawns = roomsInRange;
				Memory.lootMission[roomName].totalResources = totalRes;
				Memory.lootMission[roomName].netGain = Number(netGain.toFixed(0));
				Memory.lootMission[roomName].requiredHaulers = Math.ceil(totalRes / creepLifeHaul);

				Memory.rooms[roomName].lootTs = Game.time + 500;
				
			}
		}

		return score;
	}
	return false;
}

function removeControllerContainer(roomName) {
	let container = _.filter(Game.rooms[roomName].findByType(STRUCTURE_CONTAINER),
				function (structure) {
					return (structure.isController() );
				});
	if (container.length > 0) {
		container[0].destroy();
	//	Game.rooms[roomName].visual.circle(container[0].pos.x, container[0].pos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'});
	} 
}

function checkCaravanMissions() {
	for (let id in Memory.caravans) {
		if (Game.time > Memory.caravans[id].eta + 1500) {
			delete Memory.caravans[id];
		}
	}
}

function checkCaravanLoot(creeps){
	let loot = {};
	for (let idx in creeps) {
		let creep = creeps[idx];
		for (let res in creep.carry) {
			if (creep.carry[res] > 0) {
				if (loot[res] === undefined) { loot[res] = 0; }
				loot[res] += creep.carry[res];
			}
		}
	}
	return loot;
}

function caravanOnBorder(caravan){
	for (let idx in caravan) {
		if (caravan[idx].pos.isNearExit(1)) { return true; }
	}
}

function getCaravanId(caravan){
	let comp = caravan[0].name.split("_");
	return comp[0];
}

function checkScreepsCaravan(enemyCreeps, roomCaller) {

	if (roomIsCorner(roomCaller) ) { return 0; }
	let caravan = _.filter(enemyCreeps, 
		function(creep) {return (
			creep.owner.username === "Screeps");
		});
	if (caravan.length === 0) { return 0;}

	let caravanId = getCaravanId(caravan);

	let onBorder = caravanOnBorder(caravan)

	if (onBorder) {
		requestRoomVision(roomCaller)
	}
	
	if (Memory.caravans[caravanId] === undefined) {
		Memory.caravans[caravanId] = {};
				
		let caravanRooms = getCaravanTarget(caravan[0].ticksToLive, roomCaller);

		Memory.caravans[caravanId].eta = Game.time + caravan[0].ticksToLive - 600;
		Memory.caravans[caravanId].ts = Game.time + caravan[0].ticksToLive;
		Memory.caravans[caravanId].origin = caravanRooms.caravanOrigin;
		Memory.caravans[caravanId].destination = caravanRooms.caravanTarget;
		Memory.caravans[caravanId].target = caravanRooms.caravanIntercept;
		
		let requiredRCL = 8;
		if (SEASONAL_COMMS) {
			requiredRCL = 7;
		}
		Memory.caravans[caravanId].assignedRooms = getMyClosestRooms(caravanRooms.caravanIntercept, requiredRCL, 1, 10);
		log(caravanId + " caravan detected in " + roomCaller + " heading to " + caravanRooms.caravanIntercept);

		if (SEASONAL_COMMS) {
			Memory.caravans[caravanId].commodities = {};
			for (let idx in caravan) {
				let creep = caravan[idx];
				for (let res in creep.store) {
					if (creep.store[res] > 0) {
						if (Memory.caravans[caravanId].commodities[res] === undefined) {
							Memory.caravans[caravanId].commodities[res] = {};
							Memory.caravans[caravanId].commodities[res].store = 0;
							Memory.caravans[caravanId].commodities[res].creeps = [];
						}

						Memory.caravans[caravanId].commodities[res].store += creep.store.getFreeCapacity(res);
						Memory.caravans[caravanId].commodities[res].creeps.push(creep.id);
					}
				}
			}
		}
	} else {

		if (SEASONAL_COMMS && !onBorder) {

			let resources = Object.keys(Memory.caravans[caravanId].commodities).length;
			Memory.caravans[caravanId].commodities = {};
			for (let idx in caravan) {
				let creep = caravan[idx];
				for (let res in creep.store) {
					if (creep.store[res] > 0) {
						if (Memory.caravans[caravanId].commodities[res] === undefined) {
							Memory.caravans[caravanId].commodities[res] = {};
							Memory.caravans[caravanId].commodities[res].store = 0;
							Memory.caravans[caravanId].commodities[res].creeps = [];
						}

						Memory.caravans[caravanId].commodities[res].store += creep.store.getFreeCapacity(res);
						Memory.caravans[caravanId].commodities[res].creeps.push(creep.id);
					}
				}
			}

			let newResources = Object.keys(Memory.caravans[caravanId].commodities).length;
			if (newResources > resources) {
				delete Memory.caravans[caravanId].evaluated
			}
		}
	}

	if (SEASONAL_COMMS) {	// Season 4
		assignCommodityScorers()
	}

	if (Memory.caravans[caravanId] && Memory.caravans[caravanId].strength === undefined && !caravanOnBorder(caravan) && !SEASONAL_COMMS) {
		let strength = calcCreepStrength(caravan);
		log("caravan detected in " + roomCaller + " caravan strength " + strength.defensive + " total creeps " + caravan.length)

		Memory.caravans[caravanId].strength = strength;
		Memory.caravans[caravanId].loot = checkCaravanLoot(caravan);

		let targetRoom = Memory.caravans[caravanId].target
		if (strength.healPower < 600 &&
			Memory.raids.activeTargets[targetRoom] === undefined && 
			Object.keys(Memory.caravans[caravanId].assignedRooms).length > 0
			) {
			let timeLeft = Memory.caravans[caravanId].eta - Game.time;

			let travelTime = Memory.caravans[caravanId].assignedRooms[Object.keys(Memory.caravans[caravanId].assignedRooms)[0]].dist * 50;
			let spawnTime = 350;
			if (timeLeft > spawnTime + travelTime) {
				addRaid(targetRoom, {raidType: RAID_TYPE_PHALANX, unBoosted: true});
			}
			
		}
		checkCaravanMissions();
	}
}

function assignCommodityScorers(){
	for (let caravanId in Memory.caravans) {
		if (Game.time > Memory.caravans[caravanId].eta + 500) {
			delete Memory.caravans[caravanId];
			continue; 
		}

		if (Memory.caravans[caravanId].evaluated || !Memory.caravans[caravanId].assignedRooms || Object.keys(Memory.caravans[caravanId].assignedRooms).length <= 0) { continue; }

		let safeHW = false;
		for (let safeRoom in global.SAFE_COMMS_HW) {
			let dist = Game.map.getRoomLinearDistance(safeRoom, Memory.caravans[caravanId].destination )
			if (dist <= 3) {
				safeHW = true;
				break;
			}
		}

		if (!safeHW) {
			Memory.caravans[caravanId].abortSpawn = true;
			Memory.caravans[caravanId].unsafe = true;
		}

		for (let res in Memory.caravans[caravanId].commodities) {

			let maxCaravanAccept = 999
			/*
			if (COMPRESSED_RESOURCE[res]) {
				
				let labRooms = Object.keys(Memory.Minerals.Labs).length;
				let wantedRes = labRooms * SELL_MINERAL_ABOVE * 2
				let currentRes = (Memory.Minerals[res] || 0) + ((Memory.Minerals[COMPRESSED_RESOURCE[res].raw] || 0) * 5)

				if (currentRes > wantedRes) {
					if (Memory.caravans[caravanId].score === undefined) { Memory.caravans[caravanId].score = {} }

					Memory.caravans[caravanId].score[res] = {
						amount: Math.min(Memory.caravans[caravanId].commodities[res].store, maxCaravanAccept)
					}
				}				
			} else if (COMMODITY_SCORE[res] > 4000 && Memory.Minerals[res] > 0) {
				if (Memory.caravans[caravanId].score === undefined) { Memory.caravans[caravanId].score = {} }
				
				Memory.caravans[caravanId].score[res] = {
					amount: Math.min(Memory.caravans[caravanId].commodities[res].store, maxCaravanAccept, maxStoreInRoom(res))
				}
			} else if (COMMODITY_SCORE[res] === 2) {
				if (Memory.caravans[caravanId].score === undefined) { Memory.caravans[caravanId].score = {} }
				
				Memory.caravans[caravanId].score[res] = {
					amount: Math.min(Memory.caravans[caravanId].commodities[res].store, maxCaravanAccept, maxStoreInRoom(res))
				}
			} else */
			
			if(Memory.Minerals[res] > 0) {
				
				if (Memory.caravans[caravanId].score === undefined) { Memory.caravans[caravanId].score = {} }
				
				Memory.caravans[caravanId].score[res] = {
					amount: Math.min(Memory.caravans[caravanId].commodities[res].store, maxCaravanAccept, maxStoreInRoom(res))
				}
			}
		}

		Memory.caravans[caravanId].evaluated = true;


		if (Memory.caravans[caravanId].score) {

			let idlePos = pullIdlePosForRoom(Memory.caravans[caravanId].target);
			for (let spawner in Memory.caravans[caravanId].assignedRooms) {


				let pathToIntercept = findTravelPath(Game.rooms[spawner].controller.pos, idlePos,
					{range: 3, ignoreRoads: true, ignoreCreeps: true,  maxOps:50000, preferHighway: true});

				if (!pathToIntercept.incomplete && pathToIntercept.path) {
					Memory.caravans[caravanId].assignedRooms[spawner].travelTime = pathToIntercept.path.length;
				}	
			}
		}

		
	}
}

/*
global.getRoomNameAtDirection = function(fromRoom, dir, steps=1) {
	let patt = /([A-Z]+)(\d+)([A-Z]+)(\d+)/;
	let roomSplit = patt.exec(fromRoom);
	let destRoom

	// Needs different adds based on N/S and E/W and handling when moving past W/E borders
	switch(dir){
		case TOP:
			destRoom = roomSplit[1]+roomSplit[2]+roomSplit[3]+(Number(roomSplit[4])+steps)
			break;
		case BOTTOM: 
			destRoom = roomSplit[1]+roomSplit[2]+roomSplit[3]+(Number(roomSplit[4])-steps)
			break;
		case LEFT: 
			destRoom = roomSplit[1]+(Number(roomSplit[2])-steps)+roomSplit[3]+roomSplit[4]
			break;
		case RIGHT: 
			destRoom = roomSplit[1]+(Number(roomSplit[2])-steps)+roomSplit[3]+roomSplit[4]
			break;

	}
	return destRoom;
}*/

global.getCaravanTarget = function(ticksToLive, roomCaller) {

	let creepTicksLived = CREEP_LIFE_TIME - ticksToLive;
	let estimatedRoomsTraveled = creepTicksLived / 100;
	
	// TTL 1450 - 1320	room 1/10
	// TTL 1340 - 1220	room 2/10
	// TTL 1240 - 1120	room 3/10
	// ...
	// TTL 720 - 600	room 9/10

	// split roomName
	let patt = /([A-Z]+)(\d+)([A-Z]+)(\d+)/;
	let roomSplit = patt.exec(roomCaller);
	
	let weMod = roomSplit[2] % 10;
	let nsMod = roomSplit[4] % 10;
	let highwayNumber = Math.max(weMod, nsMod);	// ignore "0"
	let highwayNumberReversed = (10-highwayNumber)

	let fitRisingDirection = Math.abs(1 - (estimatedRoomsTraveled/highwayNumber) );
	let fitReverseDirection = Math.abs(1 - (estimatedRoomsTraveled/highwayNumberReversed));
//	log("fitRisingDirection " + fitRisingDirection + " estimeated " + estimatedRoomsTraveled + " hwNumber " + highwayNumber)
//	log("fitReverseDirection " + fitReverseDirection + " estimeated " + estimatedRoomsTraveled + " hwNumberreverseed " + highwayNumberReversed)
//	log("weMod " + weMod + " nsMod " +nsMod)
	/*
	// WE or NS highway
	let travelingIdx;
	if (weMod > nsMod) {
		travelingIdx = 2;
	} else {
		travelingIdx = 4;
	}*/

	let caravanTarget;
	let caravanOrigin;
	let interceptRoom;
	// Increasing or decreasing direction
	

	// add number
	if (fitRisingDirection < fitReverseDirection) {		
		if (weMod > nsMod) {
			log("1")

			let base = Math.floor(roomSplit[2]/10)*10
			caravanTarget = roomSplit[1]+(base+10)+roomSplit[3]+roomSplit[4]
			interceptRoom = roomSplit[1]+(base+9)+roomSplit[3]+roomSplit[4]
			caravanOrigin = roomSplit[1]+base+roomSplit[3]+roomSplit[4]
		} else {
			log("2")
			let base = Math.floor(roomSplit[4]/10)*10
			caravanTarget = roomSplit[1]+roomSplit[2]+roomSplit[3]+(base+10)
			interceptRoom = roomSplit[1]+roomSplit[2]+roomSplit[3]+(base+9)
			caravanOrigin = roomSplit[1]+roomSplit[2]+roomSplit[3]+base
		}
	} else {
		
		if (weMod > nsMod) {
			log("3")
			let base = Math.floor(roomSplit[2]/10)*10
			caravanTarget = roomSplit[1]+base+roomSplit[3]+roomSplit[4]
			interceptRoom = roomSplit[1]+(base+1)+roomSplit[3]+roomSplit[4]
			caravanOrigin = roomSplit[1]+(base+10)+roomSplit[3]+roomSplit[4]
		} else {
			log("4")
			let base = Math.floor(roomSplit[4]/10)*10
			caravanTarget = roomSplit[1]+roomSplit[2]+roomSplit[3]+base
			interceptRoom = roomSplit[1]+roomSplit[2]+roomSplit[3]+(base+1)
			caravanOrigin = roomSplit[1]+roomSplit[2]+roomSplit[3]+(base+10)
		}
	}

	
	console.log("getCaravanId current room " + roomCaller + " caravan ticks lived " + creepTicksLived + " rising direction " + fitRisingDirection.toFixed(2), " reverse dir " + fitReverseDirection.toFixed(2) + " target " +caravanTarget + " origin " + caravanOrigin)

	let returnData = {
		caravanTarget: caravanTarget,
		caravanOrigin: caravanOrigin,
		caravanIntercept: interceptRoom,
	};	

	return returnData;
}

function gatherInvaderData(roomCaller, core){
	let playerName = 'Invader';
	if (Memory.players[playerName] === undefined) {
		Memory.players[playerName] = {};
		Memory.players[playerName].ownedRooms = {};
		Memory.players[playerName].estimatedSumRcl = 1;
		Memory.players[playerName].maxSumRcl = 1;
		Memory.players[playerName].isInvader = 1;
	}
	
	Memory.players[playerName].ts = Game.time + 150000;

	let playerRooms = Memory.players[playerName].ownedRooms;
	if (playerRooms[roomCaller] === undefined) {
		playerRooms[roomCaller] = {};
		playerRooms[roomCaller].isStronghold = core.level;
	}


	playerRooms[roomCaller].storedEnergy = 9999999;

	// Ramparts hp to breach
	if (Memory.rooms[roomCaller].breachHpPhalanx === undefined || Game.time > Memory.rooms[roomCaller].breachHpPhalanxTs) {
		findWallToAttack(roomCaller, [], undefined, true);
	} 
	if (Memory.rooms[roomCaller].breachHp === undefined || Game.time > Memory.rooms[roomCaller].breachHpTs) {
		findWallToAttack(roomCaller, [], undefined, false);
	}

	playerRooms[roomCaller].breachHpPhalanx = Memory.rooms[roomCaller].breachHpPhalanx || 0;
	playerRooms[roomCaller].breachHp = Memory.rooms[roomCaller].breachHp || 0;

	// Tower damage
	let tempTowerDmg = getHighTowerDamage(roomCaller);
	if (playerRooms[roomCaller].towerDmg === undefined) {
		playerRooms[roomCaller].towerDmg = tempTowerDmg;
	}

	if (playerRooms[roomCaller].towerPerimiterDmg === undefined || playerRooms[roomCaller].towerDmg !== tempTowerDmg) {
		playerRooms[roomCaller].towerPerimiterDmg = getWallPerimiterDamage(roomCaller);
	}

	playerRooms[roomCaller].towerDmg = tempTowerDmg;

	// Defenders
	let defenders = _.filter(getEnemyCreeps(roomCaller), 
		function(creep) {return ((creep.owner.username === playerName));
			});	

	if (defenders.length >= STRONGHOLD_POPULATION[core.level]) {
		playerRooms[roomCaller].allCreepsSpawned = true;
	}

	


	let enemyStrength = calcCreepStrength(defenders);
	
	if (playerRooms[roomCaller].defenderStrength === undefined) { playerRooms[roomCaller].defenderStrength = {} }
	if (!playerRooms[roomCaller].defenderStrength.repairPower) {playerRooms[roomCaller].defenderStrength.repairPower = 0;}
	if (!playerRooms[roomCaller].defenderStrength.attackDamage) {playerRooms[roomCaller].defenderStrength.attackDamage = 0;}
	if (!playerRooms[roomCaller].defenderStrength.rangedAttackDamage) {playerRooms[roomCaller].defenderStrength.rangedAttackDamage = 0;}


	playerRooms[roomCaller].defenderStrength.repairPower = Math.max(playerRooms[roomCaller].defenderStrength.repairPower, enemyStrength.repairPower)
	playerRooms[roomCaller].defenderStrength.attackDamage = Math.max(playerRooms[roomCaller].defenderStrength.attackDamage, enemyStrength.attackDamage)
	playerRooms[roomCaller].defenderStrength.rangedAttackDamage = Math.max(playerRooms[roomCaller].defenderStrength.rangedAttackDamage, enemyStrength.rangedAttackDamage)							

	// core rampart hp
	if (core && !core.ticksToDeploy && playerRooms[roomCaller].coreRampartHp === undefined) {
		let rampart = core.pos.lookForStructure(STRUCTURE_RAMPART)
		playerRooms[roomCaller].coreRampartHp = rampart.hits || 0;		
	}

}





function gatherPlayerData(roomCaller, playerName){
	if (Memory.players[playerName] === undefined) {
		Memory.players[playerName] = {};
		Memory.players[playerName].ownedRooms = {};
		Memory.players[playerName].estimatedSumRcl = 1;
		Memory.players[playerName].maxSumRcl = 1;		
	}

	Memory.players[playerName].ts = Game.time + 50000;

	let playerRooms = Memory.players[playerName].ownedRooms;
	if (playerRooms[roomCaller] === undefined) {
		playerRooms[roomCaller] = {};
	}

	// Stored Energy
	let storedEnergy = 0;
	if (Game.rooms[roomCaller].storage){
		storedEnergy += Game.rooms[roomCaller].storage.store[RESOURCE_ENERGY];
	}

	if (Game.rooms[roomCaller].terminal){
		storedEnergy += Game.rooms[roomCaller].terminal.store[RESOURCE_ENERGY];
	}
	playerRooms[roomCaller].storedEnergy = storedEnergy;
	
	// Nuke targets
	if (Memory.rooms[roomCaller].numberOfTowers >= 2 && 
		(playerRooms[roomCaller].nukeTarget === undefined ||
		playerRooms[roomCaller].nukeTarget.ts === undefined ||
		playerRooms[roomCaller].nukeTarget.ts + 1500 < Game.time)
	){
		playerRooms[roomCaller].nukeTarget = getNukeTarget(roomCaller);
	}

	// Ramparts hp to breach
	if (Memory.rooms[roomCaller].breachHpPhalanx === undefined || Game.time > Memory.rooms[roomCaller].breachHpPhalanxTs) {
		findWallToAttack(roomCaller, [], undefined, true);
	} 
	if (Memory.rooms[roomCaller].breachHp === undefined || Game.time > Memory.rooms[roomCaller].breachHpTs) {
		findWallToAttack(roomCaller, [], undefined, false);
	}

	playerRooms[roomCaller].breachHpPhalanx = Memory.rooms[roomCaller].breachHpPhalanx || 0;
	playerRooms[roomCaller].breachHp = Memory.rooms[roomCaller].breachHp || 0;

	// Breached walls stored
	if (Memory.rooms[roomCaller]._breachPosPhalanx && Game.time > Memory.rooms[roomCaller]._breachPosPhalanxTs) {
		hasBreachedWalls(roomCaller, true);
	}

	if (Memory.rooms[roomCaller]._breachPos && Game.time > Memory.rooms[roomCaller]._breachPosTs) {
		hasBreachedWalls(roomCaller);
	}
	
	if (Memory.rooms[roomCaller].destroyedStructure) {
		hasBreachedWalls(roomCaller);
		hasBreachedWalls(roomCaller, true);
		global._isPassibleCache = {};
		delete global.travStructureCache;
		global.travStructureCache = {};
		delete global.pullSiegeFormationCombat;
		global.pullSiegeFormationCombat = {};
		delete Memory.rooms[roomCaller].destroyedStructure;

		delete global._phalanxFormationCache[roomCaller]

		// Reachable raid pos
		let id = roomCaller+true;
		delete global.getOutsidePixels[id]
		id = roomCaller+false;
		delete global.getOutsidePixels[id]

		
	}
		

	// Tower damage
	playerRooms[roomCaller].towerDmg = getHighTowerDamage(roomCaller)

	// Exits/remotes?

	// Score attacks
	

}

function recordNukes(roomName) {
	let room = Game.rooms[roomName]
	if (!room._cache.nukeCheckedTs) { room._cache.nukeCheckedTs = 0;}

	if (Game.time > room._cache.nukeCheckedTs) {
		room._cache.nukeCheckedTs = Game.time + 497;
		let nukes = Game.rooms[roomName].find(FIND_NUKES);
		if (nukes.length === 0) {
			return;
		}
		
		let player = getPlayerByRoomName(roomName)
		for (let idx in nukes) {
			let nuke = nukes[idx];
			if (Memory.nukes[roomName] === undefined) { 
				Memory.nukes[roomName] = {}; 
				Memory.nukes[roomName].nukes = {};
			}

			let firstSeen = false;
			if (Memory.nukes[roomName].nukes[nuke.id] === undefined) {
				Memory.nukes[roomName].nukes[nuke.id] = {}; 
				Memory.nukes[roomName].nukes[nuke.id].ts = nuke.timeToLand + Game.time;
				firstSeen = true;
			}
			
			if (!player) { continue; }

			let rampartHits = 0;
			let ramparts = nuke.pos.lookForStructuresAround(STRUCTURE_RAMPART, 2)
			for (let idx2 in ramparts) {
				let rampart = ramparts[idx2];		
				rampartHits += rampart.hits;
			}

			if (Memory.nukes[roomName].nukes[nuke.id].iniRampartHits === undefined) {
				Memory.nukes[roomName].nukes[nuke.id].initRampartHits = rampartHits / (ramparts.length || 1);
				Memory.nukes[roomName].nukes[nuke.id].initNumberRamp = ramparts.length
			} else {
				Memory.nukes[roomName].nukes[nuke.id].rampartHits = rampartHits / (ramparts.length || 1);
				Memory.nukes[roomName].nukes[nuke.id].numberRamp = ramparts.length
			}

			if (!firstSeen && nuke.timeToLand < NUKE_LAND_TIME * 0.95 ) {
				registerNukeResponses(roomName, nuke.id);
			}


		}
	}
}

global.registerNukeResponses = function(roomName, nukeId) {
	let player = getPlayerByRoomName(roomName)
	if (!player || !Memory.players[player]) { return; }
	if (!Memory.nukes[roomName] || !Memory.nukes[roomName].nukes[nukeId]) { return; }
	if (Memory.nukes[roomName].nukes[nukeId].rampartHits === undefined || Memory.nukes[roomName].nukes[nukeId].rampartHits === undefined) { return; }

	let startHp = Memory.nukes[roomName].nukes[nukeId].initialRampartHits;
	let endHp = Memory.nukes[roomName].nukes[nukeId].rampartHits;
	let hpIncrease = endHp - startHp

	let timeToLand = Memory.nukes[roomName].nukes[nukeId].ts - Game.time;

	let nukeResponse = (endHp > NUKE_DAMAGE[2] && timeToLand < 1000) || hpIncrease > NUKE_DAMAGE[2]/2 || Memory.nukes[roomName].nukes[nukeId].numberRamp > Memory.nukes[roomName].nukes[nukeId].initNumberRamp
	
	Memory.players[player].hasNukeResponse = nukeResponse || Memory.players[player].hasNukeResponse;
	return nukeResponse;
}

global.getNukeTarget = function(roomName) {
	let potentialTargets =  Game.rooms[roomName].find(FIND_STRUCTURES, {
			filter: (structure) => {
			return (structure.structureType === STRUCTURE_SPAWN ||
					structure.structureType === STRUCTURE_TERMINAL ||
					structure.structureType === STRUCTURE_STORAGE ||
					structure.structureType === STRUCTURE_TOWER ||
					structure.structureType === STRUCTURE_LAB				
					) 		
			}});

	let scores = {
		[STRUCTURE_SPAWN] : 100, 
		[STRUCTURE_TERMINAL] : 75,
		[STRUCTURE_STORAGE] : 75,
		[STRUCTURE_TOWER] : 75,
		[STRUCTURE_LAB] : 40,
		[STRUCTURE_RAMPART] : 5,
	}		

	let maxScore = (scores[STRUCTURE_SPAWN] * 3) + scores[STRUCTURE_TERMINAL] + scores[STRUCTURE_STORAGE] + (scores[STRUCTURE_TOWER] * 5) + (scores[STRUCTURE_LAB] * 10);

	let bestScore = 0;
	let bestTarget;
	let spawnTargets = [];
	let spawnsCovered = {}

	for (let idx in potentialTargets) {
		let score = 0;
		let target = potentialTargets[idx];

		score += scores[target.structureType] || 0;

		let nearbyTargets = target.pos.lookForEnemyStructuresAround(2);
		for (let idxNear in nearbyTargets) {
			let nearTarget = nearbyTargets[idxNear];
			if (nearTarget.id == target.id) { continue; }
			score += scores[nearTarget.structureType] * 0.5 || 1;

			if (nearTarget.isSpawn && !spawnsCovered[nearTarget.id]) {
				spawnTargets.push(posCompress(target.pos))
				spawnsCovered[nearTarget.id] = {};
			}
		}

		if (target.isSpawn && !spawnsCovered[target.id]) {
			spawnTargets.push(posCompress(target.pos))
			spawnsCovered[target.id] = {};
		}

		score = score / maxScore;

		if (score > bestScore) {
			bestScore = score;
			bestTarget = target;
		}
	}




//	log( roomName+ " findNukeTarget found target " + bestTarget+ " with score " +bestScore )
	let targetId;
	let targetPos;
	if (bestTarget) {
		targetId = bestTarget.id;
		targetPos = posCompress(bestTarget.pos)
	}

	return {
		id: targetId,
		pos: targetPos,
		score: bestScore,
		ts: Game.time,
		spawnTargets: spawnTargets,
	}
}

global.getHighTowerDamage = function(roomCaller){
	
	let towers = Game.rooms[roomCaller].find(FIND_STRUCTURES, {
		filter: (structure) => {
		return (structure.structureType === STRUCTURE_TOWER) }});

	let maxDmg = 0;	
	for (let idx in towers){
		let tower = towers[idx];
		let currentDmg = getTowerDamage(tower.pos, towers, true)
		maxDmg = Math.max(maxDmg, currentDmg)
	}
	return maxDmg;
}

global.getWallPerimiterDamage = function(roomCaller) {
	let towers = Game.rooms[roomCaller].find(FIND_STRUCTURES, {
		filter: (structure) => {
		return (structure.structureType === STRUCTURE_TOWER) }});

	if (towers.length === 0) { return 0 }	

	let unGroupedWalls = Game.rooms[roomCaller].findByType([STRUCTURE_RAMPART, STRUCTURE_WALL]);	// hostile ramparts not passible
	
	let maxSize = 5;
	let groupedWalls = [];
	while (unGroupedWalls.length > 0) {
		let group = unGroupedWalls[0].pos.findInRange(unGroupedWalls, 1);
		unGroupedWalls.splice(0,1);

		for (let idx3 = 0; idx3 < group.length; idx3++) {
			let groupAdd = group[idx3].pos.findInRange(unGroupedWalls, 1);
			group = group.concat(groupAdd);
			group = _.uniq(group);
			if (group.length >= maxSize) { break; }
		}
		groupedWalls.push(group);
		unGroupedWalls = _.difference(unGroupedWalls, group);
	}

	let lowDmg = towers.length * 600;
	
	for (let idx in groupedWalls) {
		let x = 0;
		let y = 0;
		let group = groupedWalls[idx]
		for (let idx2 = 0; idx2 < group.length; idx2++) {	
			x += group[idx2].pos.x;
			y += group[idx2].pos.y;
		}
		x =	Math.ceil(x / group.length);
		y =	Math.ceil(y / group.length);

		Game.rooms[roomCaller].visual.circle(x, y , {fill: 'transparent', radius: 0.50, stroke: 'blue'})
		let currentDmg = getTowerDamageXY(x, y, towers, true)
		
		Game.rooms[roomCaller].visual.text(currentDmg, x, y, {color: 'red', font: 0.5});

	//	console.log("avg x " + x + " avg y " + y + " dmg " + currentDmg)
		if (currentDmg < lowDmg) {
			lowDmg = currentDmg;
		}
	}

	return lowDmg;

}

global.getBodyCostArray = function(body) {
	let cost = 0;
	for (let idx in body) {				
		cost += BODYPART_COST[body[idx]]
	}
	return cost
}

global.getBodyCost = function(body) {
	let cost = 0;
	for (let idx in body) {				
		cost += BODYPART_COST[body[idx].type]
	}
	return cost
}

global.cacheObjectForDestroyEvent = function(obj, attId) {

	let id = obj.id;

	if (!eventCache[id]) {
		eventCache[id] = {};
		eventCache[id].attId = attId;
		eventCache[id].ts = Game.time;

		if (obj.isCreep) {
			eventCache[id].my = obj.my
			eventCache[id].player = obj.owner.username;
			eventCache[id].cost = getBodyCost(obj.body);
			eventCache[id].type = "Creep";			
			eventCache[id].ttl = obj.ticksToLive;
			
		} 

		if (obj.isStructure) {
			eventCache[id].my = obj.my
			if (obj.owner) {
				eventCache[id].player = obj.owner.username;
			} else {
				if (obj.room._memory.myRoom || obj.room._memory[R.MY_MINING_OUTPOST]) {
					eventCache[id].my = true;
					eventCache[id].player = Memory.username;
				} else {
					eventCache[id].player = obj.room._memory.player || obj.room._memory.enemyRemote;
				}
			}
			eventCache[id].cost = CONSTRUCTION_COST[obj.structureType];
			eventCache[id].type = obj.structureType;
		}

	//	console.log("stored object for event " + JSON.stringify(eventCache[id]))
	} else {
		eventCache[id].ts = Game.time;
		eventCache[id].attId = attId;
		if (obj.isCreep) {			
			eventCache[id].ttl = obj.ticksToLive;			
		}
	}
}

global.getDestroyEventObj = function(id) {	

	if (eventCache[id]) {
		return eventCache[id];

		/*
		if (eventCache[id].type === "Creep") {
			if (eventCache[id].ttl > 10 &&
				eventCache[id].ts + 2 >= Game.time) {
				return eventCache[id];
			} else {
				console.log("creep death not killed by me? " + id)
			}
		} else {
			return eventCache[id];
		}*/
	}
}

global.registerAttacker = function (creep, roomName, _attId, attType = undefined){

	if (creep._memory.reg === undefined) { creep._memory.reg = {} }	
	if (creep._memory.reg[roomName]) { return; }
		

	if (!Memory.rooms[roomName] || 		
		((!getRoomCache(roomName).scoutController || 
		getRoomCache(roomName).scoutController < (Game.time - 150)) &&
		(!getRoomCache(roomName).scoutNotHighway || 
		getRoomCache(roomName).scoutNotHighway < (Game.time - 150)))
	) { 
		return; 
	}

	creep._memory.reg[roomName] = {};

	let player = getPlayerByRoomName(roomName);

	let attackType = attType || creep._memory[C.ROLE];

	if (creep._memory.pita) {
		attackType = "pita";
	}
	
	let attId = creep._memory.attId || _attId;
	if (!attId) {
		attId = createAttackId();
		creep._memory.attId = attId;
	}

	if (Memory.players[player]) {		
		if (Memory.players[player].ownedRooms[roomName]) {

			if (!Memory.players[player].ownedRooms[roomName].attacks)  { Memory.players[player].ownedRooms[roomName].attacks = {} }

			
			if (Memory.players[player].ownedRooms[roomName].attacks[attId] === undefined)  { 

				Memory.players[player].ownedRooms[roomName].attacks[attId] = {};
				Memory.players[player].ownedRooms[roomName].attacks[attId].attackType = attackType;
				Memory.players[player].ownedRooms[roomName].attacks[attId].ts = Game.time;				
				Memory.players[player].ownedRooms[roomName].attacks[attId].attackers = {};
				Memory.players[player].ownedRooms[roomName].attacks[attId].energyDmg = 0;
				Memory.players[player].ownedRooms[roomName].attacks[attId].cost = 0;
				Memory.players[player].ownedRooms[roomName].attacks[attId].power = 0;
				Memory.players[player].ownedRooms[roomName].attacks[attId].attackPower = 0;
				Memory.players[player].ownedRooms[roomName].attacks[attId].PRCL = Memory.players[player].ownedRooms[roomName].oldPRCL;
				Memory.players[player].ownedRooms[roomName].attacks[attId].storedEnergy = Memory.players[player].ownedRooms[roomName].storedEnergy || 0;
				Memory.players[player].ownedRooms[roomName].attacks[attId].towerDmg =  Memory.players[player].ownedRooms[roomName].towerDmg;

				Memory.players[player].ownedRooms[roomName].attacks[attId].phalanx = (attackType === RAID_TYPE_PHALANX || attackType === RAID_TYPE_PHALANX_ATTACKERS);
				Memory.players[player].ownedRooms[roomName].attacks[attId].breachHp =  Memory.players[player].ownedRooms[roomName].breachHp;
				Memory.players[player].ownedRooms[roomName].attacks[attId].breachHpPhalanx =  Memory.players[player].ownedRooms[roomName].breachHpPhalanx;

				Memory.players[player].ownedRooms[roomName].attacks[attId].RMAbonus =  Memory.players[player].ownedRooms[roomName].RMAbonus || 1;
				
			}
			
			let attack = Memory.players[player].ownedRooms[roomName].attacks[attId];
			attack.attackers[creep.id] = {};

			Memory.players[player].ownedRooms[roomName].attacks[attId].cost += getBodyCost(creep.body);
			let creepStrength = calcSingleCreepStrength(creep)
			Memory.players[player].ownedRooms[roomName].attacks[attId].power += creepStrength.strength;

			let totalAttack = creepStrength.attackDamage + (creepStrength.rangedAttackDamage * Memory.players[player].ownedRooms[roomName].attacks[attId].RMAbonus);
			Memory.players[player].ownedRooms[roomName].attacks[attId].attackPower += totalAttack;

			creep._memory.reg[roomName].debug = attId;

		} else if (Memory.players[player].remotes && Memory.players[player].remotes[roomName]) {

			if (Memory.players[player].remotes[roomName].attacks === undefined)  { Memory.players[player].remotes[roomName].attacks = {} }

			attId = creep._memory.attId || _attId;
			if (Memory.players[player].remotes[roomName].attacks[attId] === undefined)  {
				Memory.players[player].remotes[roomName].attacks[attId] = {};
				Memory.players[player].remotes[roomName].attacks[attId].attackType = attackType;
				Memory.players[player].remotes[roomName].attacks[attId].ts = Game.time;
				Memory.players[player].remotes[roomName].attacks[attId].attackers = {};
				Memory.players[player].remotes[roomName].attacks[attId].energyDmg = 0;
				Memory.players[player].remotes[roomName].attacks[attId].cost = 0;
				Memory.players[player].remotes[roomName].attacks[attId].power = 0;
			}

			let attack = Memory.players[player].remotes[roomName].attacks[attId];
			attack.attackers[creep.id] = {};

			// Register cost based on lifetime if on second rooms
			if (Object.keys(creep._memory.reg[roomName].length <= 1)) {
				Memory.players[player].remotes[roomName].attacks[attId].cost += getBodyCost(creep.body);
			} else {
				Memory.players[player].remotes[roomName].attacks[attId].cost += getBodyCost(creep.body) / (creep.ticksToLive / CREEP_LIFE_TIME);
			}

			Memory.players[player].remotes[roomName].attacks[attId].power += calcSingleCreepStrength(creep).strength;

			creep._memory.reg[roomName].debug = attId;

		} else {

			creep._memory.reg[roomName].debug = "noRoom" + roomName
		}
	} else {
		creep._memory.reg[roomName].debug = "noPlayer" + roomName
	}
}

global.unclaimController = function(controller){
	let roomName = controller.room.name;

	let roomMem = Memory.rooms[roomName];

	delete roomMem.myRoom;
	delete roomMem.player;
	delete roomMem.isPlayer;
	delete roomMem.numberOfTowers;
	delete roomMem.hasStoreLink;

	controller.unclaim();
	controller._unclaimed = Game.time;
}


global.registerEvent = function(attId, energyDmg, player, roomName) {
//	log("register event! " + player+ ", attId: " +  attId + ", roomName: " + roomName + ", cost: " + energyDmg )

//	if (player === "Invader") { return; }
	if (Memory.players[player] && Memory.players[player].ownedRooms[roomName] && Memory.players[player].ownedRooms[roomName].attacks && Memory.players[player].ownedRooms[roomName].attacks[attId]) {
		Memory.players[player].ownedRooms[roomName].attacks[attId].energyDmg += energyDmg;
	} else if (Memory.players[player] && Memory.players[player].remotes && Memory.players[player].remotes[roomName] && Memory.players[player].remotes[roomName].attacks && Memory.players[player].remotes[roomName].attacks[attId]) {
		Memory.players[player].remotes[roomName].attacks[attId].energyDmg += energyDmg;
	//	
	} else {
		let dmg = energyDmg || 0;
		log("failed to register event! " + player+ ", attId: " +  attId + ", roomName: " + roomName + ", cost: " + dmg.toFixed(1))
	}
}

global.getPlayerByRoomName = function(roomName) {
	if (Memory.rooms[roomName]) {
		if (Memory.rooms[roomName].player) {
			return Memory.rooms[roomName].player;
		}

		if (Memory.rooms[roomName].enemyRemote) { 
			return Memory.rooms[roomName].enemyRemote;
		}

		if (Memory.rooms[roomName].invaderCore) { 
			return "Invader"
		}
	}

	for (let player in Memory.players){
		let rooms = Memory.players[player].ownedRooms
		if (!rooms) { continue; }
		for (let room in rooms) {
			if (room === roomName) {
				return player;
			}
		}
	}

}

global.getActiveAttIds = function(player, roomName) {
	let ids = [];
	let attackObj = {}
	if (Memory.players[player] && Memory.players[player].ownedRooms[roomName] && Memory.players[player].ownedRooms[roomName].attacks) {
		attackObj = Memory.players[player].ownedRooms[roomName].attacks;	
	} else if (Memory.players[player] && Memory.players[player].remotes && Memory.players[player].remotes[roomName] && Memory.players[player].remotes[roomName].attacks) {
		attackObj = Memory.players[player].remotes[roomName].attacks;
	}
	for (let id in attackObj) {
		if (!attackObj[id].score) {
			ids.push(id);
			//console.log(id +" active attack on " + roomName + player)
		}
	}
	return ids;
}



function scoreAttacks(roomCaller){

//	if (!Memory.rooms[roomCaller].hostiles || !Memory.rooms[roomCaller].player || !Memory.rooms[roomCaller].enemyRemote) { return; }

	if (Memory.raids.activeTargets[roomCaller]) {

	}

	if (Memory.attackTarget[roomCaller]){

	}

	if (Memory.rooms[roomCaller].enemyRemote) {
		let energyNotMined = 0;
		for (let id in Memory.rooms[roomCaller].sources) {
			let source = Game.getObjectById(id);
			if (!source) { continue; }

			if (source.ticksToRegeneration === 1) {
				energyNotMined += source.energy;				
			} else if (!source.ticksToRegeneration) {
				energyNotMined = 10;
			}
		}

		if (energyNotMined) {
			let player = getPlayerByRoomName(roomCaller);
			let attIds = getActiveAttIds(player, roomCaller);
			if (attIds.length) {
				let energyEach = energyNotMined / attIds.length;
				for (let idx in attIds) {
					let attId = attIds[idx]
					registerEvent(attId, energyEach, player, roomCaller);
				//	log(attId+ " register energy not harvested in " + roomCaller + " amount " + energyEach + " for player " + player)
				}
			}
			

		}
	}

	let events = Game.rooms[roomCaller].getEventLog();
	let destroyedEvents = [];
	let cacheHits = {}; // since event destroyed does not work for structures
	for (let eventIdx in events) {
		let event = events[eventIdx];
		if (event.event === EVENT_ATTACK) {

			let target = Game.getObjectById(event.data.targetId);
			let actor = Game.getObjectById(event.objectId);

			let attId;
			if (actor && actor.my) {
				if (actor._memory) {
					attId = actor._memory.attId;
				} // else tower?
				
			} else {	// Enemy Attack Action
				// enemy firing tower at me?
				if (target && target.my && target._memory) {
					attId = target._memory.attId;
				}

				let player;
				if (actor && actor.owner) {
					player = actor.owner.username;
					
					if (attId && 
						Game.rooms[roomCaller].controller && 
						Game.rooms[roomCaller].controller.owner && 
						!Game.rooms[roomCaller].controller.my && 
						Game.rooms[roomCaller].controller.owner.username !== player
					) {
						log(roomCaller + " hostile player " + player + " in owned room " + Game.rooms[roomCaller].controller.owner.username + " to naughty list")						
						storeNaughtyPlayer(player, roomCaller);
						if (target && target.isCreep) {
							target.say("no coop? " + player, true)
						}
						
					}
				} else {
					player = Memory.rooms[roomCaller].player || Memory.rooms[roomCaller].enemyRemote;
				}

				if (actor && actor.structureType === STRUCTURE_TOWER && target && target.my) {
					registerEvent(attId, TOWER_ENERGY_COST, player, roomCaller);
				} 
				continue;
			}

			if (target && attId) {
				cacheObjectForDestroyEvent(target, attId);
			}
			
			if (target && target.isStructure) {
				
				if (target.my || !target.owner && (Memory.rooms[roomCaller].myRoom || Memory.rooms[roomCaller][R.MY_MINING_OUTPOST])) {
				//	enemy = Game.getObjectById(event.objectId);
				//	log(enemy.owner.username + " attacking my structure " + target.structureType + " for damage " + event.data.damage + " energy " + repairCost)
				} else {
					
					let player;
					if (target.owner) {
						player = target.owner.username;
					} else {
						player = Memory.rooms[roomCaller].player || Memory.rooms[roomCaller].enemyRemote;
					}

					actor = Game.getObjectById(event.objectId);


					if (player === Memory.username || (!actor || !actor.my)) { continue; }
					
					attId = actor._memory.attId;
					if (!attId) { continue; }


					if (target.structureType == STRUCTURE_RAMPART || target.structureType == STRUCTURE_WALL) {
						let repairCost = REPAIR_COST * event.data.damage;	
						registerEvent(attId, repairCost, player, roomCaller);
					} else 

					//	console.log(target.structureType )
						if (!event.data.targetId) { continue; }							
						
						if (cacheHits[event.data.targetId] === undefined) {
							cacheHits[event.data.targetId] = {};
							cacheHits[event.data.targetId].hits = target.hits;
						}

						cacheHits[event.data.targetId].hits -= event.data.damage;
					//	console.log("new hits for " + target.structureType +" : "+ cacheHits[event.data.targetId].hits)
					
						if (cacheHits[event.data.targetId].hits <= 0) {

						log("assume destroy event! " + event.data.targetId)
						let storedData = getDestroyEventObj(event.objectId);
						if (storedData) {
							if (!storedData.my) {
								attId = storedData.attId;
								let cost = storedData.cost;
								if (storedData.ttl) {
									cost = storedData.cost * (storedData.ttl / CREEP_LIFE_TIME);
								} 
								if (storedData.type !== "Creep") {
									log(roomCaller + " destroyed event for " + storedData.type)
								}
								registerEvent(attId, cost, storedData.player, roomCaller);
							}
						}
					}
					
				//	log(roomCaller + " attacking enemy " + player + " structure " + target.structureType + " for damage " + event.data.damage + " energy " + repairCost)
				}
			}
		}

		if (event.event === EVENT_OBJECT_DESTROYED) {
			destroyedEvents.push(event);
			continue;
		}
	}
	

	for (let eventIdx in destroyedEvents) {
		let event = destroyedEvents[eventIdx];
	//	log(JSON.stringify(event));
		let storedData = getDestroyEventObj(event.objectId);
		if (storedData) {
			if (!storedData.my) {
				let attId = storedData.attId;
				let cost = storedData.cost;
				if (storedData.ttl) {
					cost = storedData.cost * (storedData.ttl / CREEP_LIFE_TIME);
				}
				registerEvent(attId, cost, storedData.player, roomCaller);
			}
		} else if (!event.data || event.data.type !== "creep") {
			log(roomCaller + " no data for destroyed object! ")
			log(JSON.stringify(event))
		}
	}
}

function gatherRoomData(roomCaller){

	if (Memory.rooms[roomCaller].swampRatio === undefined) {
		let swamps = 0;
		let plains = 0; 
		for (let y = 0; y < 50; ++y) {
			for (let x = 0; x < 50; ++x) {
				let terrain = getRoomTerrainAt(x, y, roomCaller);
				if (terrain === TERRAIN_MASK_SWAMP ) {
					swamps++;
				} else if (terrain === TERRAIN_MASK_PLAIN ) {
					plains++;
				}
			}
		}

		let swampRatio = swamps / (swamps+plains)
		Memory.rooms[roomCaller].swampRatio = swampRatio.toFixed(3);
		Memory.rooms[roomCaller].buildableTerrain = swamps+plains;
		console.log(roomCaller + " registered plains " + plains+ " with swamp ratio " + Memory.rooms[roomCaller].swampRatio);
	}
}

function resetActiveMines(roomCaller){
	if (!Memory.rooms[roomCaller] || 
		!Memory.rooms[roomCaller].remoteMineOps) { return; }
		
	for (let room in Memory.rooms[roomCaller].remoteMineOps) {
		for (let source in Memory.rooms[roomCaller].remoteMineOps[room].sources) {
			Memory.activeMines[source].ts = Math.min(Memory.activeMines[source].ts, Game.time + 500);
		}
	}
}

global.registerConflictingRemote = function(roomCaller) {
	let playerName = getPlayerByRoomName(roomCaller);
	if (Memory.players[playerName]) {
		if (Memory.players[playerName].conflictRemotes === undefined) { Memory.players[playerName].conflictRemotes = 0 }
		Memory.players[playerName].conflictRemotes++;

		if (Memory.players[playerName].remotes && Memory.players[playerName].remotes[roomCaller]) {
			Memory.players[playerName].remotes[roomCaller].overlapping = 1;
		}
	}
} 

global.resetConflictRemotes = function() {
	for (let player in Memory.players) {
		delete Memory.players[player].conflictRemotes;		

		for (let room in Memory.players[player].remotes) {
			delete Memory.players[player].remotes[room].overlapping
		}
	}


}

function registerRemoteToPlayer(roomCaller, playerName) {

	if (Memory.players[playerName]) {
		if (Memory.players[playerName].remotes === undefined) { Memory.players[playerName].remotes = {} }
		if (Memory.players[playerName].remotes[roomCaller] === undefined) { Memory.players[playerName].remotes[roomCaller] = {} }

		// Check for owned room next door
		if (Memory.players[playerName].ownedRooms) {
			let exitsForRemote = getExits(roomCaller);
			for (let adjacentRoom in exitsForRemote) {
				if (Memory.players[playerName].ownedRooms[adjacentRoom]) {
					Memory.players[playerName].remotes[roomCaller].adjacentToOwner = 1;
				}
			}
		}
		
	}
}

function deleteRemoteFromPlayer(roomCaller, playerName) {
	if (Memory.players[playerName] && Memory.players[playerName].remotes) {
		delete Memory.players[playerName].remotes[roomCaller];
	}
}

function detectEnemyRemote(roomCaller){
//	console.log("detectEnemyRemote" + roomCaller)
	let owner = Memory.rooms[roomCaller].enemyRemote;

	if (Memory.rooms[roomCaller].enemyRemoteTs && Game.time > Memory.rooms[roomCaller].enemyRemoteTs) { 
		delete Memory.rooms[roomCaller].enemyRemote
		delete Memory.rooms[roomCaller].enemyRemoteTs
		deleteRemoteFromPlayer(owner, roomCaller)
	}

	let room = Game.rooms[roomCaller];

	if (room.controller && room.controller.reservation) {

		Memory.rooms[roomCaller].enemyRemote = room.controller.reservation.username;
		Memory.rooms[roomCaller].enemyRemoteTs = room.controller.reservation.ticksToEnd + Game.time + 2500;
		registerRemoteToPlayer(roomCaller, Memory.rooms[roomCaller].enemyRemote);

		return;
	} else if (room.controller && room.controller.owner) {
		deleteRemoteFromPlayer(owner, roomCaller)
		return;
	}

	let creeps = getEnemyCreeps(roomCaller);
	if (creeps.length === 0) { return; }

	let enemyCreeps = _.filter(creeps, 
		function(creep) {return (
						creep.body &&
						creep.body.length > 0 &&
						creep.owner.username !== "Source Keeper" &&
						creep.owner.username !== "Screeps");
			});

	if (enemyCreeps.length === 0){ return; }
	let sources = Game.rooms[roomCaller].find(FIND_SOURCES);
	if (sources.length === 0){ return; }
	let mined = 0;

	for (let idx in sources) {
		let source = sources[idx];
		mined += source.energyCapacity - source.energy;
	}

	if (mined > 0) {
		let playerName = enemyCreeps[0].owner.username;
		Memory.rooms[roomCaller].enemyRemote = playerName;
		Memory.rooms[roomCaller].enemyRemoteTs = Game.time + 2500;

		registerRemoteToPlayer(roomCaller, playerName);
	} 
}

global.getRoomRRCL = function(controller) {

	if (controller.progress < controller.progressTotal) {
		return controller.level;
	} else {
		let realRCL = controller.level;
		let progress = controller.progress;

		while (progress > CONTROLLER_LEVELS[realRCL]) {			
			progress -= CONTROLLER_LEVELS[realRCL]
			realRCL++;
		}
		return realRCL;
	}
}

global.getRoomPRCL = function(roomName) {
	let PRCL = 0;
	if (Memory.rooms[roomName]) {
		if (Memory.rooms[roomName].PRCL !== undefined) {
			PRCL = Memory.rooms[roomName].PRCL;
		} else if (Memory.rooms[roomName].RCL !== undefined) {
			PRCL = Memory.rooms[roomName].RCL;
		}
	}

	return PRCL;
}

global.getRoomRCL = function(roomName) {
	let RCL = 0;
	if (Memory.rooms[roomName] && Memory.rooms[roomName].RCL !== undefined) {
		RCL = Memory.rooms[roomName].RCL;
	}

	return RCL;
}

global.setRoomPRCL = function(room, force = false) {
	if (global._getRoomPRCL === undefined) {global._getRoomPRCL = {} }

	if (!global._getRoomPRCL[room] || global._getRoomPRCL[room].ts < Game.time || force) {

		let keyStructures = [
			STRUCTURE_SPAWN, 
			STRUCTURE_TOWER, 
			STRUCTURE_TERMINAL,
			STRUCTURE_LAB,
			STRUCTURE_STORAGE, 
			STRUCTURE_EXTENSION
		];

		let myRoom = Game.rooms[room].controller && Game.rooms[room].controller.my

		if (myRoom) {
			if (DISABLED_TERMINAL || !Memory.buildTerminal) {
				for (let idx in keyStructures) {
					if (keyStructures[idx] === STRUCTURE_TERMINAL) {
						keyStructures.splice(idx, 1);
						break;
					}
				}
			} 
	
			if (!Memory.buildLabs) {
				for (let idx in keyStructures) {
					if (keyStructures[idx] === STRUCTURE_LAB) {
						keyStructures.splice(idx, 1);
						break;
					}
				}
			} 
	
			if (roomIsSafeModed(room) > 4000) {
				for (let idx in keyStructures) {
					if (keyStructures[idx] === STRUCTURE_TOWER) {
						keyStructures.splice(idx, 1);
						break;
					}
				}
			}
		}
		

		let currentPRCL = 8	
		for (let structureIdx in keyStructures)	{
			let structureType = keyStructures[structureIdx]
			let currentStructures = Game.rooms[room].findByType(structureType).length
			let RCL_Check = 9
			while (RCL_Check--) {
				currentPRCL = Math.min(RCL_Check, currentPRCL)
				let maxStructuresAtLevel = CONTROLLER_STRUCTURES[structureType][RCL_Check];
				if (structureType === STRUCTURE_EXTENSION) {
					if (myRoom) {
						maxStructuresAtLevel = maxStructuresAtLevel * 0.9;
					} else {
						maxStructuresAtLevel = maxStructuresAtLevel * 0.75;
					}					
				} else if (structureType === STRUCTURE_LAB && !myRoom) {
					maxStructuresAtLevel = Math.min(maxStructuresAtLevel * 0.5, 1);
				}

				if (currentStructures >= maxStructuresAtLevel ) {
					break;
				}
			}
		}

		if (currentPRCL > Game.rooms[room].controller.level) {	// PRCL could be higher with inactive structures
			currentPRCL = Game.rooms[room].controller.level;
		}
		
		if (currentPRCL !== Game.rooms[room].controller.level) {
			Memory.rooms[room].PRCL = currentPRCL;
		} else {
			delete Memory.rooms[room].PRCL
		}

		global._getRoomPRCL[room] = {}
		global._getRoomPRCL[room].ts = Game.time + 101
		global._getRoomPRCL[room].PRCL = currentPRCL
		
	}	

	return global._getRoomPRCL[room].PRCL
}

function storeAverageHostiles(roomName, hostiles){

	let maxSampleTime = 2500;
	let interval = 75; 
	let maxSamples = Math.floor(maxSampleTime / interval);

	let data = Memory.rooms[roomName].avgHostile;
	let strength = 0;
	let creepDmg = 0;
	if (hostiles && hostiles.power) { 
		strength = hostiles.power.defensive || 0;
		creepDmg = (hostiles.power.attackDamage || 0) + (hostiles.power.rangedAttackDamage || 0);
	}

	if (data && !data.creepDmg) {	// temp while new data outheal
		data.creepDmg = creepDmg;
	}

	if (data === undefined) {
		Memory.rooms[roomName].avgHostile = {};
		data = Memory.rooms[roomName].avgHostile;
		data.avgStrength = strength;
		data.creepDmg = creepDmg;
		data.avgStrengthSamples = 1;
		data.ts = Game.time + interval;
	} else {

		if (creepDmg > data.creepDmg) {
			data.creepDmg = creepDmg;
		}

		if (strength > data.avgStrength) {
			data.avgStrength = strength
		}
		
		if (!data.ts || Game.time > data.ts) {
			data.avgStrengthSamples++;
			data.avgStrengthSamples = limit(data.avgStrengthSamples, 1, maxSamples);
			data.ts = Game.time + interval;
			data.avgStrength = rollingExpAvg(data.avgStrength, strength, data.avgStrengthSamples);	
			data.creepDmg = rollingExpAvg(data.creepDmg, creepDmg, data.avgStrengthSamples);				
		}
	}
}

global.getCurrentDefensiveStrength = function(roomName) {
	if (!Memory.rooms[roomName] || !Memory.rooms[roomName].hostiles || !Memory.rooms[roomName].hostiles.power) { return 0; }
	return Memory.rooms[roomName].hostiles.power.defensive;
}

global.getAverageStrength = function (roomName) {
	if (!Memory.rooms[roomName] || !Memory.rooms[roomName].avgHostile) { return 0; }
	return Memory.rooms[roomName].avgHostile.avgStrength;
}

global.getAverageCreepDmg = function (roomName) {
	if (!Memory.rooms[roomName] || !Memory.rooms[roomName].avgHostile) { return 0; }
	return Memory.rooms[roomName].avgHostile.creepDmg;
}

function convertBuildersToUpgraders(roomName) {
	if (!Game.rooms[roomName]) { return; }

//	let upgraders = getCreeps('upgrader', roomName);	// dont catch all?
	let upgraders = Game.rooms[roomName].find(FIND_MY_CREEPS, {
		filter: function(creep) {
			  return (creep._memory[C.ROLE] === "builder");
	   }});	

	log(roomName + " converting " + upgraders.length + " upgraders to builders! ")

	let amount = Math.max(0, upgraders.length - 2);

	let converts = 0;
	for (let idx in upgraders) {
		let upgrader = upgraders[idx]
		upgrader._memory[C.ROLE] = "upgrader";
		delete upgrader._memory[C.ASSIGNED_ROLE];
		delete upgrader._memory[C.CLOSEST_TARGET];
		upgrader.clearTarget();
		converts++
		if (converts > amount ) { break; }
	}

	requestMemSave();
}

function fetchControllerContainer(roomName) {
	if (!Game.rooms[roomName]) { return; }

	let upgraders = Game.rooms[roomName].find(FIND_MY_CREEPS, {
		filter: function(creep) {
			  return (creep._memory[C.ROLE] === "upgrader");
	   }});

	for (let idx in upgraders) {
		let upgrader = upgraders[idx]
		if (upgrader._cache.contId === -1) {
			delete upgrader._cache.contId;
		}
	}
}


global.convertUpgradersToBuilders = function(roomName) {
	if (!Game.rooms[roomName]) { return; }

//	let upgraders = getCreeps('upgrader', roomName);	// dont catch all?
	let upgraders = Game.rooms[roomName].find(FIND_MY_CREEPS, {
		filter: function(creep) {
			  return (creep._memory[C.ROLE] === "upgrader");
	   }});
	
	if (Game.rooms[roomName].controller.level === 6) {
		let assistedUpgraders = _.filter(getCreeps('upgrader'), (creep) => creep._memory[C.ROOM_TARGET] == roomName);
		upgraders = upgraders.concat(assistedUpgraders)
	}

	let needsUpgrade = controllerNeedsUpgrade(Game.rooms[roomName].controller)

	log(roomName + " converting " + upgraders.length + " upgraders to temp builders! ")

	for (let idx in upgraders) {
		let upgrader = upgraders[idx]
		if (needsUpgrade && upgrader.body.length <= 3) { continue; }
		upgrader._memory[C.ROLE] = "builderUpgrader";
		delete upgrader._memory[C.ASSIGNED_ROLE];
		delete upgrader._memory[C.CLOSEST_TARGET];
		upgrader.clearTarget();
	}

	requestMemSave();
}


global.revertUpgradersToBuilders = function(roomName) {
	if (!Game.rooms[roomName]) { return; }
	let upgraders = getCreeps('builderUpgrader', roomName);

	log(roomName + " reverting "+upgraders.length+" builderUpgrader to upgraders ")

	for (let idx in upgraders) {
		upgraders[idx]._memory[C.ROLE] = "upgrader";
		delete upgraders[idx]._memory[C.ASSIGNED_ROLE];
		delete upgraders[idx]._memory[C.CLOSEST_TARGET];
		upgraders[idx].clearTarget();		
	}
	requestMemSave();
}



global.countIncomingNukes = function(roomName) {
	let nukes = 0;
	if (!Memory.nukes[roomName]) { return 0; }

	

	for (let id in Memory.nukes[roomName].nukes) {
		if (Memory.nukes[roomName].nukes[id].ts < Game.time) {

			registerNukeResponses(roomName, id);

			delete Memory.nukes[roomName].nukes[id];
			
			releaseFleeRoles(roomName);
			requestMemSave();
			
			continue;
		}
		nukes++;
	}

	if (Object.keys(Memory.nukes[roomName].nukes).length === 0) { 
		delete Memory.nukes[roomName];
	}

	return nukes;

}

global.nukeThreatImminent = function(roomName, ticks=70) {
	if (!Memory.nukes[roomName]) { return; }
	let time = Game.time + ticks;
	for (let id in Memory.nukes[roomName].nukes) {
		if (Memory.nukes[roomName].nukes[id].ts > Game.time && Memory.nukes[roomName].nukes[id].ts < time ) {
			return Memory.nukes[roomName].nukes[id].ts;
		}
		if (Memory.nukes[roomName].nukes[id].ts < Game.time) {
			registerNukeResponses(roomName, id);
			delete Memory.nukes[roomName].nukes[id];
			requestMemSave();
			releaseFleeRoles(roomName);
		}
	}
}