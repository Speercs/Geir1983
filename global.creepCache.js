/* exported EXPORTED_LIB */	
'use strict'
module.exports = function() {
	
	global.limit = function(v, min, max) {
		return (Math.min(max, Math.max(min, v)));
	};
	
	global.addCreepToCache = function(name, role, roomOrigin) {

		
		if(global.getCreepTimestamp == undefined || global.getCreepTimestamp != Game.time) {
			global.getCreepTimestamp = Game.time;
			global.creepsCache = {};
		}
		if (global.creepsCache[role] === undefined) { 
			global.creepsCache[role] = {};
			global.creepsCache[role].origin = {};
		}
		if (global.creepsCache[role].origin[roomOrigin] === undefined) { 
			global.creepsCache[role].origin[roomOrigin] = {};
			global.creepsCache[role].origin[roomOrigin].creep = {};
		}
		// Add to Role Cache
		global.creepsCache[role].origin[roomOrigin].creep[name] = {};

		// Add to Heal Cache
		if (Game.creeps[name] && Game.creeps[name].hits < Game.creeps[name].hitsMax) {			
			if (global.creepsCache.healTargets === undefined) { global.creepsCache.healTargets = {}; }
			let roomName = Game.creeps[name].room.name;
			if (global.creepsCache.healTargets[roomName] === undefined) { 
				global.creepsCache.healTargets[roomName] = {};
				global.creepsCache.healTargets[roomName].creep = {};
			}
			global.creepsCache.healTargets[roomName].creep[name] = {};
		}
	};


	global.addPCToHealCache = function(pc) {		
		if (pc.hits < pc.hitsMax) {
			if (global.pcHealTargets === undefined) { global.pcHealTargets = {}; }
			let roomName = pc.room.name;
			if (global.pcHealTargets[roomName] === undefined) { 
				global.pcHealTargets[roomName] = {};
				global.pcHealTargets[roomName].pc = {};
			}
			global.pcHealTargets[roomName].pc[pc.name] = {};
		}
	}
	
	global.getMyDamagedCreeps = function(room) {
		let arr = [];

		if (global.pcHealTargets && global.pcHealTargets[room] !== undefined) {
			for (let name in  global.pcHealTargets[room].pc ) {
				arr.push(Game.powerCreeps[name]);
			}
		}

		if (global.creepsCache && global.creepsCache.healTargets !== undefined && global.creepsCache.healTargets[room] !== undefined) {
			for (let name in  global.creepsCache.healTargets[room].creep ) {
				arr.push(Game.creeps[name]);
			}
		}

		return arr;
	};

	

	global.getCreeps = function(role, roomOrigin = undefined) {
		let arr = [];
		let name;

		let cache;
		cache = global.creepsCache;

		if ( cache && cache[role] !== undefined) {
			if (roomOrigin){
				if (cache[role].origin[roomOrigin] !== undefined) {			
					for (name in cache[role].origin[roomOrigin].creep ) {
						if (Game.creeps[name] !== undefined) {
							arr.push(Game.creeps[name]);
						}
					}
				}
			} else {
				for (let room in cache[role].origin ) {
					for (name in cache[role].origin[room].creep ) {
						if (Game.creeps[name] !== undefined) {
							arr.push(Game.creeps[name]);
						}
					}
				}
			}
		}		
		return arr;
	};

	function allowScorer(creep, roomName) {

		if (SEASONAL_SYMBOLS && ALLOW_SCORE[creep.owner.username] && Memory.rooms[roomName] && (Memory.rooms[roomName].myRoom || Memory.rooms[roomName][R.MY_MINING_OUTPOST]) ) {
			let creepPower = calcSingleCreepStrength(creep)
			if (creepPower.strength <= 0) {
				return true;
			}
		}
		return false;

	}

	global.cahceFriendOrFoe = function(room) {		

		global.FriendOrFoe[room] = {};

		global.FriendOrFoe[room].getEnemyCreepsTimestamp = Game.time;
	
		global.FriendOrFoe[room].hostileCreeps = [];
		global.FriendOrFoe[room].alliedCreeps = [];

		let temp =  Game.rooms[room].find(FIND_HOSTILE_CREEPS);
		let tempPc =  Game.rooms[room].find(FIND_HOSTILE_POWER_CREEPS);
		temp = temp.concat(tempPc);
		let i = temp.length;
		
		let roomOwner;
		if (Game.rooms[room].controller && Game.rooms[room].controller.owner && !Game.rooms[room].controller.my) {
			roomOwner = Game.rooms[room].controller.owner.username
		}

		while (i--) {
			let creep = temp[i]

			if (checkIfHostile(creep.owner.username, room, roomOwner)) {
				global.FriendOrFoe[room].hostileCreeps.push(creep.id);
			} else {
				global.FriendOrFoe[room].alliedCreeps.push(creep.id);
			}
		}
	}

	global.getAlliedCreeps = function(room) {
		if (!Game.rooms[room]) { return []; }

		if(global.FriendOrFoe[room] === undefined) {
			cahceFriendOrFoe(room);
		}

		let returnValue = [];
		for (let idx in global.FriendOrFoe[room].alliedCreeps) {
			let creep = Game.getObjectById(global.FriendOrFoe[room].alliedCreeps[idx]);
			if (creep) {
				returnValue.push(creep);
			}
		}
		return returnValue;
	}

	

	global.getEnemyCreeps = function(room) {	
		if (!Game.rooms[room]) { return []; }

		if(global.FriendOrFoe[room] === undefined) {
			cahceFriendOrFoe(room);
		}

		let returnValue = [];
		for (let idx in global.FriendOrFoe[room].hostileCreeps) {
			let creep = Game.getObjectById(global.FriendOrFoe[room].hostileCreeps[idx]);
			if (creep) {
				returnValue.push(creep);
			}
		}
		return returnValue;
	};


	global._getEnemyTowers = {};
	global.getEnemyTowers = function(roomName) {

		let hostileTowers = []
		if (!Game.rooms[roomName]) { return hostileTowers; }
		
		if (global._getEnemyTowers[roomName] === undefined) {

			let towers = _.filter(Game.rooms[roomName].findByType(STRUCTURE_TOWER), 
				function(c) {return (c.energy > 10);
				});

				
			global._getEnemyTowers[roomName] = {
				towers: []
			}	

			if (towers.length === 0) { return hostileTowers; }

			let roomOwner;
			if (Game.rooms[roomName].controller && Game.rooms[roomName].controller.owner) {
				roomOwner = Game.rooms[roomName].controller.owner.username
			}

			let hostile = checkIfHostile(towers[0].owner.username, roomName, roomOwner)
			if (!hostile)  { return hostileTowers; }

			for (let idx in towers) {

				let tower = towers[idx];
				if (!checkIfHostile(tower.owner.username, roomName, roomOwner)) { continue; }

				global._getEnemyTowers[roomName].towers.push(tower.id);
			}

			return towers;
		}
		
		for (let idx in global._getEnemyTowers[roomName].towers) {
			hostileTowers.push(Game.getObjectById(global._getEnemyTowers[roomName].towers[idx]));
		}

		return hostileTowers;	
	}	
	


	global.checkIfHostile = function(player, roomName, roomOwner) {

		if (roomName === "E14S17" && Game.shard.name === "shard1") { return true; }

		if (ALLIES[player]) { return false; } 
		

		if (roomOwner) { // except me

			if (player === "Invader") { return true; }

			if (roomOwner === player) {
				return true;
			} else if (roomOwner === Memory.username ) {
				return true;
			} else {
				if (Memory.naughty[player]) {
					if (Game.time > Memory.naughty[player].ts) {
						delete Memory.naughty[player];
					}
					return true; 
				}
				return false;
			}
			
		} else {			

			if (player === 'Invader' && sectorHasDeadInvaderCore(roomName) && roomIsSk(roomName)) { return false; }

			if (specialWhitelist[roomName] && specialWhitelist[roomName][player]) { 
				return false;
			}
		}
		
		
		return true;
	}
	
	global.storeNaughtyPlayer = function(player, roomName){
		if (Memory.naughty[player] === undefined) {
			Memory.naughty[player] = {};
		//	Memory.naughty[player].offendingRooms = {};
		}

		/*
		if (Memory.naughty[player].offendingRooms === undefined) {
			Memory.naughty[player].offendingRooms[roomName] = {};
		}*/

		Memory.naughty[player].ts = Game.time + 5000;	
	}


	global.checkFleeNeeded = function(room){

		if (!Memory.rooms[room].hostiles) return false;
		if (Memory.rooms[room].myRoom) return false;
		if (Memory.rooms[room].isPlayer && Memory.rooms[room].hostiles.power.defensive >= 100 ) { return true; }

		// Else invaders
		let center = new RoomPosition(25,25, room)
		let friendlies = center.lookForAlliedAndMyCreepsAround(25);
		if (friendlies.length <= 0) {
			return true;
		}

		let friendlyForce = calcCreepStrength(friendlies, true);
		let requiredForce = Memory.rooms[room].hostiles.power.defensive * 0.9;

	//	console.log(room + " checkFleeNeeded my force  "  + friendlyForce.defensive + "/" + requiredForce);
		if (friendlyForce.defensive < requiredForce) { 		
			return true;
		} 
	}

	global.findSafeRoomFor = function(evacuateRoom){
	
		if (!global.evacRoom || global.evacRoom.ts !== Game.time) {
			global.evacRoom = {};
			global.evacRoom.ts = Game.time;
			global.evacRoom.origins = {};
		}

		if (!global.evacRoom.origins[evacuateRoom]) {
			global.evacRoom.origins[evacuateRoom] = {};

			let exits = getExits(evacuateRoom);
			let safeRooms = [];
            for (let roomName in exits) {
				let score = 100;

				if (Game.rooms[roomName]) {
					score += 10;
				}


				if (Memory.rooms[roomName]) {
					if (Memory.rooms[roomName].hostiles && 
						Memory.rooms[roomName].hostiles.power && 					
						Memory.rooms[roomName].hostiles.power.defensive
					) {
						score -= Memory.rooms[roomName].hostiles.power.defensive;
					}

					if (Memory.rooms[roomName].myRoom) {
						score += 100 * getRoomPRCL(roomName);
					}

					if (Memory.rooms[roomName].hostileRoom) {
						score -= 100;
					}
				}
				safeRooms.push([roomName, score]);
			}

			safeRooms.sort(function(a, b) {
				return (b[1] - a[1]);});

			if (safeRooms.length > 0) {
				global.evacRoom.origins[evacuateRoom].safeRoom = safeRooms[0][0];
			}
		}
		return global.evacRoom.origins[evacuateRoom].safeRoom;		
	}

	global.assignFleeRoles = function (evacuateRoom, nukeTimer = 0){
		let init = Game.cpu.getUsed();	
		let cnt = 0;

		let remotesForSpawner = {}
	
		for(let name in Game.creeps) {
			let creep = Game.creeps[name];
			if (creep.spawning) { continue; }
			if (!creep._memory[C.ROOM_TARGET] && !creep._memory[C.ROOM_ORIGIN]) { continue; }
			if (creep._memory[C.ROOM_TARGET] && creep._memory[C.ROOM_TARGET] !== evacuateRoom ) { continue; }
			if (!creep._memory[C.ROOM_TARGET] && creep._memory[C.ROOM_ORIGIN] && creep._memory[C.ROOM_ORIGIN] !== evacuateRoom) { continue; }
			if (creep._memory[C.ROLE] === "scout") { continue; }
			if (!nukeTimer && creep.isCombatCreep() ) { continue; }

			let spawner = creep._memory[C.ROOM_ORIGIN];

			if (creep._memory[C.ROLE] === "helper") {

				reassignHelperTo(creep, creep._memory[C.ROOM_ORIGIN]);
				continue;
			} else if (creep._memory[C.ROLE] === "hauler") {

				if (remotesForSpawner[spawner] === undefined) {
					remotesForSpawner[spawner] = getSafeRemoteForAssignments(spawner) 
				}
				if (reassignHauler(creep, remotesForSpawner[spawner])) { continue; }
			} else if (creep._memory[C.ROLE] === "extractor") {

				if (remotesForSpawner[spawner] === undefined) {
					remotesForSpawner[spawner] = getSafeRemoteForAssignments(spawner) 
				}
				if (reassignExtractor(creep, remotesForSpawner[spawner])) { continue; }
			} else if (creep._memory[C.ROLE] === "startupMiner") {

				if (remotesForSpawner[spawner] === undefined) {
					remotesForSpawner[spawner] = getSafeRemoteForAssignments(spawner) 
				}
				if (reassignStartupMiners(creep, remotesForSpawner[spawner])) { continue; }	
				
			} else if (creep._memory[C.ROLE] === "claimer") {

				if (remotesForSpawner[spawner] === undefined) {
					remotesForSpawner[spawner] = getSafeRemoteForAssignments(spawner) 
				}
				if (reassignClaimer(creep, remotesForSpawner[spawner])) { continue; }				
			}

			let safeRoom = creep._memory[C.ROOM_ORIGIN];
			if (creep._memory[C.ROOM_ORIGIN] === evacuateRoom) {
				safeRoom = findSafeRoomFor(evacuateRoom);
			}

			cnt++;
			assignEvacuateCreep(creep, safeRoom, evacuateRoom, nukeTimer);
			
			
			
		}
		let used = Game.cpu.getUsed()-init;
		console.log(evacuateRoom + " assignFleeRoles evacuating " +cnt + " creeps in " +used.toFixed(2) + " cpu");
	}

	global.getSafeRemoteForAssignments = function(spawner) {
		let remotes = {};
		for(let room in Memory.rooms[spawner].remoteMineOps) {
			if (safeToSpawnRemote(spawner, room)) {
				remotes[room] = Memory.rooms[spawner].remoteMineOps[room];
			}
		}
		return remotes;
	}

	function reassignStartupMiners(creep, safeRemotes) {
		let spawner = creep._memory[C.ROOM_ORIGIN]
		for (let room in safeRemotes) {
			for (let sourceId in safeRemotes[room].sources) {
					
				let startupMiners = _.filter(getCreeps('startupMiner', spawner), (c) => c.memory[C.SOURCE_ID] == sourceId);

				let source = Game.getObjectById(sourceId);
				let maxExtracors = 3;
				if (source) {
					maxExtracors = source.getNumberOfHarvestPos();
				}
				if (startupMiners.length > (maxExtracors * 2)) { continue; } 

				let currentCarryParts = getBodyparts(startupMiners, CARRY);
				let requiredCarryParts = calcRequiredCarryParts(spawner, sourceId, room);
									
				if 	(currentCarryParts < requiredCarryParts) {	
					updateActiveMines(spawner, sourceId);
					creep.clearTarget();
					creep._memory[C.SOURCE_ID] = sourceId;
					creep._memory[C.ROOM_TARGET] = room;
					addCreepToCache(creep.name, creep._memory[C.ROLE], creep._memory[C.ROOM_ORIGIN]);
					console.log("reassigned startupMiner to " + room)
					return true;
				}
			}
		}
	}

	function reassignExtractor (creep, safeRemotes) {
		let spawner = creep._memory[C.ROOM_ORIGIN]
		for (let room in safeRemotes) {
			for (let sourceId in safeRemotes[room].sources) {
				let extractors = _.filter(getCreeps('extractor', spawner), (c) => c.memory[C.SOURCE_ID] == sourceId);	
				if (preSpawnCreepsCheck(extractors, 35) ){
					updateActiveMines(spawner, sourceId);
					creep.clearTarget();
					creep.drop(RESOURCE_ENERGY);
					delete creep._cache.containerId;
					delete creep._cache.containerPos;
					delete creep._cache.cRm;

					creep._memory[C.SOURCE_ID] = sourceId;
					creep._memory[C.ROOM_TARGET] = room;
					addCreepToCache(creep.name, creep._memory[C.ROLE], creep._memory[C.ROOM_ORIGIN]);
					console.log("reassigned extractor to " + room)
					return true;
				}
			}
		}
	}

	function reassignClaimer(creep, safeRemotes) {
		for (let room in safeRemotes) {
			
			if (Memory.rooms[room].RCLreserved === undefined || 
				(Memory.rooms[room].RCLreserved.ticksToEnd === undefined || 
				Memory.rooms[room].RCLreserved.ticksToEnd < 4500)
			) {
				if (!Memory.rooms[room].controller) { continue; }
				let mineClaimers = _.filter(getCreeps('claimer'), (c) => c.memory[C.ROOM_TARGET] == room);
				if (mineClaimers.length == 0) {

					creep.clearTarget();
					delete creep._memory[C.TARGET_POS];
					delete creep._memory.targetId;
					creep._memory[C.ROOM_TARGET] = room;					
					addCreepToCache(creep.name, creep._memory[C.ROLE], creep._memory[C.ROOM_ORIGIN]);
					console.log("reassigned claimer to " + room)
					return true;
				}
			}
		}
	}

	function reassignHauler(creep, safeRemotes) {
		let spawner = creep._memory[C.ROOM_ORIGIN]
		let energyCap = Game.rooms[spawner].energyCapacityAvailable;

		for (let room in safeRemotes) {
			for (let sourceId in safeRemotes[room].sources) {
				let haulers = _.filter(getCreeps('hauler', spawner), (c) => c.memory[C.SOURCE_ID] == sourceId);
				let currentCarryParts = getBodyparts(haulers, CARRY);
				let requiredCarryParts = calcRequiredCarryParts(spawner, sourceId, room);

				let maxCarryAffordable = maxHaulerSize(energyCap);
				let maxCreeps = Math.ceil(requiredCarryParts / maxCarryAffordable);

				if 	(currentCarryParts < requiredCarryParts || preSpawnCreepsCheck(haulers, 50, maxCreeps)) {

					creep.clearTarget();

					delete creep._cache.containerId;
					delete creep._cache.containerPos;
					delete creep._cache.cRm;

					creep._memory[C.SOURCE_ID] = sourceId;
					creep._memory[C.ROOM_TARGET] = room;
					addCreepToCache(creep.name, creep._memory[C.ROLE], creep._memory[C.ROOM_ORIGIN]);
					console.log("reassigned hauler to " + room)
					return true;

				}
			}
		}
	}
	
	global.assignFleeToPeek = function(evacuateRoom){
		for(let name in Game.creeps) {
			let creep = Game.creeps[name];
			if (!creep._memory.evacuate || !creep._memory.evacuate.fleeFromRoom ) { continue; }
			if (creep._memory.evacuate.fleeFromRoom !== evacuateRoom ) { continue; }

			creep._memory.peek = 1;
			return;
		}
	}
	
	global.releaseFleeRoles = function(evacuateRoom){
		delete Memory.rooms[evacuateRoom].evacuated;
		let init = Game.cpu.getUsed();	
		let cnt = 0;
		for(let name in Game.creeps) {
			let creep = Game.creeps[name];
			if (!creep._memory.evacuate || !creep._memory.evacuate.fleeFromRoom ) { continue; }
			if (creep._memory.evacuate.fleeFromRoom !== evacuateRoom ) { continue; }
			revertEvacuateCreep(creep);
			cnt++;
		}
		let used = Game.cpu.getUsed()-init;
		console.log(evacuateRoom + " releaseFleeRoles released " +cnt + " creeps in " +used.toFixed(2) + " cpu");	
	}
	
	
	global.assignEvacuateCreep = function (creep, destination, fleeFrom, nukeTimer){

		if (creep._memory[C.ROLE] !== 'roleEvacuate') {
			creep._memory.evacuate = {};
			creep._memory.evacuate.prevRole = creep._memory[C.ROLE];
			creep._memory[C.ROLE] = 'roleEvacuate';
		}
		creep._memory.evacuate.roomFleeTarget = destination;
		creep._memory.evacuate.fleeFromRoom = fleeFrom;
		if (nukeTimer) {
			creep._memory.evacuate.nukeTimer = nukeTimer;
		}
		
	}
	
	global.revertEvacuateCreep = function (creep){
		console.log(creep + " revertEvacuateCreep " +  creep.pos.roomName);
		if(!creep._memory[C.ROOM_TARGET] && 
			creep._memory[C.ROOM_ORIGIN] && creep._memory[C.ROOM_ORIGIN] !== creep.pos.roomName		
			) {
			creep._memory.evacuate.targetDest = pullIdlePosForRoom(creep._memory[C.ROOM_ORIGIN]);
			creep._memory.evacuate.roomFleeTarget = creep._memory[C.ROOM_ORIGIN];		
		} else {
			creep._memory[C.ROLE] = creep._memory.evacuate.prevRole;
			delete creep._memory.evacuate;
		}
		
	//	delete creep._memory.evacuate;
	}


	global.getMyCombatCreepsAssignedTo = function(room) {
		if (global.myCombatCreepsAssignedTo === undefined) { global.myCombatCreepsAssignedTo = {}; }

		if (global.myCombatCreepsAssignedTo[room] === undefined || 
			Game.time > global.myCombatCreepsAssignedTo[room].ts
		) {
			global.myCombatCreepsAssignedTo[room] = {};
			global.myCombatCreepsAssignedTo[room].ts = Game.time;

			let assignedCreeps = [];
		//	let allIK = getCreeps('invaderKiller');
		//	log("getMyCombatCreepsAssignedTo "+room+" ALL IK " + allIK.length)
			let invaderKillers = _.filter(getCreeps('invaderKiller'), (creep) => creep._memory[C.ROOM_TARGET] == room);
			
		//	log("getMyCombatCreepsAssignedTo "+room+" invaderKillers " + invaderKillers.length)

			assignedCreeps = assignedCreeps.concat(invaderKillers);
			let rangedAttackers = _.filter(getCreeps('rangedAttacker'), (creep) => creep._memory[C.ROOM_TARGET] == room);
			assignedCreeps = assignedCreeps.concat(rangedAttackers);

			rangedAttackers = _.filter(getCreeps('defender'), (creep) => creep._memory[C.ROOM_TARGET] == room);
			assignedCreeps = assignedCreeps.concat(rangedAttackers);
			rangedAttackers = _.filter(getCreeps('R_COMBO'), (creep) => creep._memory[C.ROOM_TARGET] == room);
			assignedCreeps = assignedCreeps.concat(rangedAttackers);

			let deconstructors = _.filter(getCreeps('deconstructor'), (creep) => creep._memory[C.ROOM_TARGET] == room);
			assignedCreeps = assignedCreeps.concat(deconstructors);

			let healers = _.filter(getCreeps('healer'), (creep) => creep._memory[C.ROOM_TARGET] == room);
			assignedCreeps = assignedCreeps.concat(healers);
			

			global.myCombatCreepsAssignedTo[room].creeps = assignedCreeps;
		}
		return global.myCombatCreepsAssignedTo[room].creeps;
	}

	

	global.needsGrouping = function(room) {
		if (global.roomNeedsGrouping === undefined) { global.roomNeedsGrouping = {}; }

		if (!Memory.rooms[room] || (Memory.rooms[room].nextGroupTs && Game.time < Memory.rooms[room].nextGroupTs)) { return false; }

		if (Memory.rooms[room] && Memory.rooms[room].myRoom && roomIsSafeModed(room) ) { return false; }

		if (global.roomNeedsGrouping[room] === undefined ||
			Game.time > global.roomNeedsGrouping[room].ts			
			) {
			global.roomNeedsGrouping[room] = {};
			global.roomNeedsGrouping[room].ts = Game.time + 7;

			let groupNeeded = false;
			let myCreeps = [];
			if (Memory.rooms[room] && 
				Memory.rooms[room].hostiles && 
				Memory.rooms[room].hostiles.power && 
				Memory.rooms[room].hostiles.power.defensive > 0
			){

				let defenders = getMyCombatCreepsAssignedTo(room);
			//	let defenders = myCreeps.concat(getAlliedCreeps(room));
				myCreeps = myCreeps.concat(defenders);
			//	log("getMyCombatCreepsAssignedTo " +room +" "+ defenders.length);
			//	log(JSON.stringify(defenders));

				let myPower = calcCreepStrength(defenders, true);
				let myTowerDmg = 0;
				if (Memory.rooms[room].myRoom) {
					myTowerDmg = Game.rooms[room].findByType(STRUCTURE_TOWER).length * 600;	
				}

				let hostiles = Memory.rooms[room].hostiles.power;

				let hostileAttacks = hostiles.attackDamage + hostiles.rangedAttackDamage;
				let friendlyAttacks = myPower.attackDamage + myPower.rangedAttackDamage;

				if (myPower.healPower > (hostileAttacks * SAFETY_FACTOR_CREEPSTRENGTH)) {
					groupNeeded = false;										
				} else if ((hostileAttacks * SAFETY_FACTOR_CREEPSTRENGTH) <= myPower.healPower || 
					friendlyAttacks > ((hostiles.healPower * SAFETY_FACTOR_CREEPSTRENGTH) )
				) {
					groupNeeded = false;
				} else if (friendlyAttacks + myTowerDmg > hostiles.healPower * SAFETY_FACTOR_CREEPSTRENGTH) {
					groupNeeded = false;
				} else if (myPower.defensive + myTowerDmg < Memory.rooms[room].hostiles.power.defensive * SAFETY_FACTOR_CREEPSTRENGTH ) {
					groupNeeded = true;
				} else if (myPower.strength >= hostiles.defensive && unStuck() ) {
					groupNeeded = false;
				}
				console.log(room +" needs group " + groupNeeded +" my power " + myPower.defensive + " tower " + myTowerDmg + " hostiles " + Memory.rooms[room].hostiles.power.defensive)
				log(room + " hostiles ranged attack " +hostiles.rangedAttackDamage + " hostiles heal " + hostiles.healPower + " my ra "+ myPower.rangedAttackDamage  + " my heal " +myPower.healPower)
			}

			// check if creeps are grouped and ready
			if (Memory.rooms[room].needsGrouping && !groupNeeded) {
				let inPos = true;
				for (let idx in myCreeps) {
					let creep = myCreeps[idx];
					if (!creep._memory.grouped && 
						(creep._memory[C.ROLE] === "invaderKiller" || creep._memory[C.ROLE] === "rangedAttacker")) {
						inPos = false;
						break;
					}
				}

				// launch
				if (inPos) {
					for (let idx in myCreeps) {
						let creep = myCreeps[idx];
						delete creep._memory.grouped;
						delete creep._memory.groupPos;
						delete creep._memory.groupRoom;
					}
					delete Memory.rooms[room].needsGrouping;
					delete Memory.rooms[room].groupRoom;
					Memory.rooms[room].nextGroupTs = Game.time + 57;
				}
			}

			// delete group by timeout
			if ((Memory.rooms[room].groupTs && 
				Game.time > Memory.rooms[room].groupTs) ||
				!groupNeeded
				) {
				delete Memory.rooms[room].needsGrouping;
				delete Memory.rooms[room].groupTs;
				Memory.rooms[room].nextGroupTs = Game.time + 57;
			}

			// new assignment
			if ((groupNeeded && !Memory.rooms[room].groupRoom) &&
				!Memory.rooms[room].nextGroupTs || Game.time > Memory.rooms[room].nextGroupTs				
			) {
				Memory.rooms[room].groupRoom = findSafeRoomFor(room);
				Memory.rooms[room].needsGrouping = 1;
				Memory.rooms[room].groupTs = Game.time + 500;
			}


			global.roomNeedsGrouping[room].group = groupNeeded || Memory.rooms[room].needsGrouping;
		//	log(room + " needs group " + global.roomNeedsGrouping[room].group)
		}

	
		return global.roomNeedsGrouping[room].group;
	}

	// HEAP
	global.getEnemyStructures = function(room) {	
		if (global.EnemyStructures === undefined) { global.EnemyStructures = {}; }
		if (!Game.rooms[room]) { return []; }
		if(global.EnemyStructures[room] === undefined || 
			global.EnemyStructures[room].getEnemyCreepsTimestamp == undefined || 
			global.EnemyStructures[room].getEnemyCreepsTimestamp != Game.time) {

			global.EnemyStructures[room] = {};
			global.EnemyStructures[room].getEnemyCreepsTimestamp = Game.time;
			global.EnemyStructures[room].structures = [];

			let temp =  Game.rooms[room].find(FIND_HOSTILE_STRUCTURES);
			let i = temp.length;
		
			while (i--) {
				if (ALLIES[temp[i].owner.username] === undefined) {
					global.EnemyStructures[room].structures.push(temp[i].id);
				}	
			}
		}

		let returnValue = [];
		for (let idx in global.EnemyStructures[room].structures) {
			let structure = Game.getObjectById(global.EnemyStructures[room].structures[idx]);
			if (structure) {
				returnValue.push(structure);
			}
		}
		return returnValue;	
	};



	RoomPosition.prototype.canKite = function(dist = 3, myStrength = undefined) {

		let hostiles = this.lookForEnemyCreepsAround(dist);
		if (hostiles.length <= 0) {
			return true;
		}
				
		let hostileForce = calcCreepStrength(hostiles, true);
		if (hostileForce.defensive == 0) { return true; }

		let towers = getEnemyTowers(this.roomName);
		/*
		let towers = _.filter(Game.rooms[this.roomName].findByType(STRUCTURE_TOWER), 
			function(c) {return (c.energy > 10 && !c.my);
			});*/
				
		let friendlies
		let friendlyForce
		if (myStrength) {
			friendlyForce = myStrength;
		} else {
			friendlies = this.lookForAlliedAndMyCreepsAround(dist);
			if (friendlies.length <= 0 ) {
			//	console.log(this + " no friendlies? ")
				return false;
			}
			friendlyForce = calcCreepStrength(friendlies, true);
		}

		let towerDamage = getTowerDamage(this, towers);
		let totalRangedDamage = towerDamage + hostileForce.rangedAttackDamage

		if (totalRangedDamage <= friendlyForce.healPower || friendlyForce.rangedAttackDamage > hostileForce.healPower) {
			// I can kite!			
			return true;
		}
		return false;
	}

	Creep.prototype.wantedCombatRange = function(targetPos, dist = 12, maxRange = 5) {
		let hostiles = targetPos.lookForEnemyCreepsAround(dist);
		if (hostiles.length <= 0) {
			return 1;
		}

		let hostileForce = calcCreepStrength(hostiles, true);
		if (hostileForce.defensive == 0) { return 1; }

		let friendlies = targetPos.lookForAlliedAndMyCreepsAround(dist);
		if (friendlies.length <= 0 ) {
			return maxRange;
		}

		let minimumTowerDmg = 0;
		let minimumTowerHeal = 0;
		if (this.room.controller && this.room.controller.my){
			minimumTowerDmg = this.room.findByType(STRUCTURE_TOWER).length * 150;
			minimumTowerHeal = this.room.findByType(STRUCTURE_TOWER).length * 100;
		}

		let friendlyForce = calcCreepStrength(friendlies, true);
		let forceMultiplier = 1.0;
		
		let hostileRawDmg = hostileForce.attackDamage + hostileForce.rangedAttackDamage;
		if (hostileRawDmg <= 0 ) { return 1; }	// No damage
		
		let hostileNetDmg = getNetDamage(hostileRawDmg, friendlyForce.toughHp, friendlyForce.toughFactor);
		if (hostileNetDmg < friendlyForce.healPower) { return 1; }	// I can tank!

		let myRawDmg = friendlyForce.attackDamage + friendlyForce.rangedAttackDamage + minimumTowerDmg;
		let myNetDmg = getNetDamage(myRawDmg, hostileForce.toughHp, hostileForce.toughFactor);
		myNetDmg = myNetDmg * forceMultiplier;	// Scale, apply + 10% for players		

		let my = myNetDmg - hostileForce.healPower;
		let enemy = hostileNetDmg - friendlyForce.healPower;

		if (my >= enemy) { 
			 // more effective dmg than enemies!
			Game.rooms[targetPos.roomName].visual.text(my.toFixed(0) + "/" + enemy.toFixed(0), targetPos.x, targetPos.y, {color: 'green', font: 0.8});	
									
			if (hostileForce.attackDamage <= 0) {
				return 1;
			} else {
				return 2;
			}

		} else if (hostileForce.rangedAttackDamage <= friendlyForce.healPower && (friendlyForce.rangedAttackDamage + minimumTowerDmg) > hostileForce.healPower) {
			// I can kite!
			Game.rooms[targetPos.roomName].visual.text("kite", targetPos.x, targetPos.y, {color: 'green', font: 0.8});	
			return 3;
		} else {
			Game.rooms[targetPos.roomName].visual.text(my.toFixed(0) + "/" + enemy.toFixed(0), targetPos.x, targetPos.y, {color: 'red', font: 0.8});
		}
		
		return maxRange;

	}


	
	RoomPosition.prototype.myCombatStrengthLarger = function(dist = 8, myStrength = undefined) {

		let hostiles = this.lookForEnemyCreepsAround(dist);
		if (hostiles.length <= 0) {
			return true;
		}
				
		let hostileForce = calcCreepStrength(hostiles, true);
		if (hostileForce.defensive == 0) { return true; }
				
		let friendlies
		let friendlyForce
		if (myStrength) {
			friendlyForce = myStrength;
		} else {
			friendlies = this.lookForAlliedAndMyCreepsAround(dist);
			if (friendlies.length <= 0 ) {
			//	console.log(this + " no friendlies? ")
				return false;
			}
			friendlyForce = calcCreepStrength(friendlies, true);
		}
		
		if (hostileForce.rangedAttackDamage <= friendlyForce.healPower && friendlyForce.rangedAttackDamage > hostileForce.healPower) {
			// I can kite!
			Game.rooms[this.roomName].visual.text("kite", this.x, this.y, {color: 'green', font: 0.8});			
		}

		let forceMultiplier = 1.0;
		if (hostiles[0].owner.username !== "Source Keeper" &&
			hostiles[0].owner.username !== "Screeps" &&
			hostiles[0].owner.username !== "Invader"
			){
			forceMultiplier = 1.0;
		}

		let hostileRawDmg = hostileForce.attackDamage + hostileForce.rangedAttackDamage;
	//	if ((friendlyForce.healPower * requiredForce) > hostileRawDmg) { return true; }
				
		let towerDmg = 0;
		let rampartDefenders = false;
		let reachable = [];
		if (Memory.rooms[this.roomName] && Memory.rooms[this.roomName].player) {
			if (Memory.rooms[this.roomName].numberOfTowers) {
				let towers = getEnemyTowers(this.roomName);
				/*
				let towers = _.filter(Game.rooms[this.roomName].findByType(STRUCTURE_TOWER), 
					function(c) {return (c.energy > 10);
					});*/

				towerDmg = getTowerDamage(this, towers);
			}

			for (let idx in hostiles) {
				let hostile = hostiles[idx];
				if (hostile.pos.lookForStructure(STRUCTURE_RAMPART) ) {
					rampartDefenders = true;
				} else {
					reachable.push(hostile);
				}
			}
		}

		let hostileNetDmg = getNetDamage(hostileRawDmg+towerDmg, friendlyForce.toughHp, friendlyForce.toughFactor);		
		if (hostileNetDmg < friendlyForce.healPower) { return true; }	// I can tank!

		let myRawDmg = friendlyForce.attackDamage + friendlyForce.rangedAttackDamage;

		if (rampartDefenders) {
			if (reachable.length > 0) {
				hostileForce = calcCreepStrength(reachable, true);
			} else {
				myRawDmg = 0; // Rampart defenders only
			}
		}		

		let myNetDmg = getNetDamage(myRawDmg, hostileForce.toughHp, hostileForce.toughFactor);
		myNetDmg = myNetDmg * forceMultiplier;	// Scale, apply + 10% for players?		

		let my = myNetDmg - hostileForce.healPower;
		let enemy = hostileNetDmg - friendlyForce.healPower;

		enemy += towerDmg;

		if (my > enemy) { 
			 // more effective dmg than enemies!
			Game.rooms[this.roomName].visual.text(my.toFixed(0) + "/" + enemy.toFixed(0), this.x, this.y, {color: 'green', font: 0.8});
			return true;
		} else {	
				
			Game.rooms[this.roomName].visual.text(my.toFixed(0) + "/" + enemy.toFixed(0), this.x, this.y, {color: 'red', font: 0.8});
			if (enemy < friendlyForce.healPower) { // I can tank this
				return true;
			}	
		}

		
		return false;
	};

	//getNetDamage(1200, 300, 0.3)
	global.getNetDamage = function(rawDmg, toughHp, toughFactor) {

		let appliedDmg = 0;
		let reducedDmg = 0;
		if (toughFactor < 1 && toughHp) {			
			reducedDmg = Math.min(toughHp / toughFactor, rawDmg);
			rawDmg -= reducedDmg
		//	console.log("reducedDmg " + reducedDmg)
			appliedDmg += reducedDmg * toughFactor;
		}

		return rawDmg + appliedDmg;
	}

	RoomPosition.prototype.lookForAlliedAndMyCreepsAround = function(dist) {
		let room = Game.rooms[this.roomName];
		let returnValue = [];
		if (!room) { return returnValue; }

		let top = limit(this.y-dist, 0, 49);
		let left = limit(this.x-dist, 0, 49);
		let bot = limit(this.y+dist, 0, 49);
		let right = limit(this.x+dist, 0, 49);
		
		let creeps = room.lookForAtArea(LOOK_CREEPS, top,left,bot,right, true);
		let i = creeps.length;	
		
		while (i--) {			
			if (
				ALLIES[creeps[i].creep.owner.username] ) {
				returnValue.push(creeps[i].creep);
			}
		}
		return returnValue;
	};

	RoomPosition.prototype.lookForAlliedCreepsAround = function(dist) {
		//	let dist = 3;
		let room = Game.rooms[this.roomName];
		let returnValue = [];
		if (!room) { return returnValue; }

		let top = limit(this.y-dist, 0, 49);
		let left = limit(this.x-dist, 0, 49);
		let bot = limit(this.y+dist, 0, 49);
		let right = limit(this.x+dist, 0, 49);
		
		let creeps = room.lookForAtArea(LOOK_CREEPS, top,left,bot,right, true);
		let i = creeps.length;	
		
		while (i--) {			
			if (!creeps[i].creep.my &&
				ALLIES[creeps[i].creep.owner.username] ) {
				returnValue.push(creeps[i].creep);
			}
		}
		return returnValue;
	};

	RoomPosition.prototype.lookForHealReasons = function(dist) {
		let room = Game.rooms[this.roomName];
		let returnValue = 0;
		if (!room) { return returnValue; }

		/*
		if (Memory.rooms[this.roomName]) {
			if (Memory.rooms[this.roomName].numberOfTowers > 0 ) { return Memory.rooms[this.roomName].numberOfTowers }
			if (Memory.rooms[this.roomName].invaderCore && Memory.rooms[this.roomName].invaderCore.level > 0 && !Memory.rooms[this.roomName].invaderCore.deploy) { return Memory.rooms[this.roomName].invaderCore.level }
		} */

		let towers = getEnemyTowers(this.roomName);
		if (towers.length > 0) { return towers.length; }

		
		let top = limit(this.y-dist, 0, 49);
		let left = limit(this.x-dist, 0, 49);
		let bot = limit(this.y+dist, 0, 49);
		let right = limit(this.x+dist, 0, 49);
	
		let creeps = room.lookForAtArea(LOOK_CREEPS, top,left,bot,right, true);
		let powerCreeps = room.lookForAtArea(LOOK_POWER_CREEPS, top,left,bot,right, true);
		creeps = creeps.concat(powerCreeps);
		let i = creeps.length;
		
		while (i--) {
			let creep = creeps[i].creep || creeps[i].powerCreep;
			if (!ALLIES[creep.owner.username]) {
				returnValue++
			} else if (creep.my && creep.hits < creep.hitsMax) {
				returnValue++
			}
		}
		return returnValue;
	}

	RoomPosition.prototype.lookForEnemyCreepsAround = function(dist) {
	//	let dist = 3;
		let room = Game.rooms[this.roomName];
		let returnValue = [];
		if (!room) { return returnValue; }

		let top = limit(this.y-dist, 0, 49);
		let left = limit(this.x-dist, 0, 49);
		let bot = limit(this.y+dist, 0, 49);
		let right = limit(this.x+dist, 0, 49);
	
		let creeps = room.lookForAtArea(LOOK_CREEPS, top,left,bot,right, true);
		let powerCreeps = room.lookForAtArea(LOOK_POWER_CREEPS, top,left,bot,right, true);
		creeps = creeps.concat(powerCreeps);
		let i = creeps.length;

		let roomOwner;
		if (i && room.controller && room.controller.owner && room.controller.my) {
			roomOwner = room.controller.owner.username
		}
		
		while (i--) {

			let creep = creeps[i].creep || creeps[i].powerCreep;
			if (creep.spawning) { continue; }
			
			if (checkIfHostile(creep.owner.username, this.roomName, roomOwner)) {
				returnValue.push(creep);
			}
		}
		return returnValue;
	};

	RoomPosition.prototype.lookForMyCreepsAround = function(dist) {
		//	let dist = 3;
			let room = Game.rooms[this.roomName];
			let returnValue = [];
			if (!room) { return returnValue; }
	
			let top = limit(this.y-dist, 0, 49);
			let left = limit(this.x-dist, 0, 49);
			let bot = limit(this.y+dist, 0, 49);
			let right = limit(this.x+dist, 0, 49);
		
			let creeps = room.lookForAtArea(LOOK_CREEPS, top,left,bot,right, true);
			let i = creeps.length;
			
			while (i--) {
				let creep = creeps[i].creep
				if (creep.my && !creep.spawning) {
					returnValue.push(creep);
				}
			}
			return returnValue;
		};

	Room.prototype.getSpawningLairs = function(preTicks = 10) {

		if (!global.temp.activeLairs) { global.temp.activeLairs = {} }
		if (!global.temp.activeLairs[this.name]) {
			global.temp.activeLairs[this.name] = {};
			let lairs = this.findByType(STRUCTURE_KEEPER_LAIR);
			let activeLairs = [];
			for (let idx in lairs) {
				let lair = lairs[idx]
				if (lair.ticksToSpawn && lair.ticksToSpawn < preTicks) {
					activeLairs.push(lair);
				}
			}
			global.temp.activeLairs[this.name].lairs = activeLairs;
		}		
		return global.temp.activeLairs[this.name].lairs;
	}

	
	global.calcBodyStrength = function(body, useHp=false){

		let strength = 0;
		let attackDamage = 0;
		let rangedAttackDamage = 0;
		let healPower = 0;
		let tough = 0;
		let toughFactor = 1;
		let toughHp = 0;
		let dismantlePower = 0;
		let repairPower = 0;

		let boostStrength;
		let length_body = body.length;
		for (let bodyPart=0; bodyPart<length_body; bodyPart++) {
			if (useHp && body[bodyPart].hits <= 0) { continue; }

			boostStrength = 1;
			if (body[bodyPart].type === ATTACK || body[bodyPart] === ATTACK){
				if (body[bodyPart].boost !== undefined){
					boostStrength = BOOSTS[ body[bodyPart].type ][ body[bodyPart].boost ].attack;
				}
				strength += (ATTACK_POWER * boostStrength);
				attackDamage += (ATTACK_POWER * boostStrength);
			} else if (body[bodyPart].type === RANGED_ATTACK || body[bodyPart] === RANGED_ATTACK){
				if (body[bodyPart].boost !== undefined){
					boostStrength = BOOSTS[ body[bodyPart].type ][ body[bodyPart].boost ].rangedAttack;
				}
				strength += (RANGED_ATTACK_POWER * boostStrength);
				rangedAttackDamage += (RANGED_ATTACK_POWER * boostStrength);
			} else if (body[bodyPart].type === HEAL || body[bodyPart] === HEAL){
				if (body[bodyPart].boost !== undefined){
					boostStrength = BOOSTS[ body[bodyPart].type ][ body[bodyPart].boost ].heal;
				}
				healPower += (HEAL_POWER * boostStrength);
				strength += (HEAL_POWER * boostStrength);
			} else if (body[bodyPart].type === WORK || body[bodyPart] === WORK){
				// Dismantle
				if (body[bodyPart].boost !== undefined && BOOST_LEVEL[DISMANTLE].includes(body[bodyPart].boost) ){
					boostStrength = BOOSTS[ body[bodyPart].type ][ body[bodyPart].boost ].dismantle;
				}
				dismantlePower += (DISMANTLE_POWER * boostStrength);
				strength += (DISMANTLE_POWER * boostStrength);

				// Repair
				boostStrength = 1;
				if (body[bodyPart].boost !== undefined && BOOST_LEVEL[REPAIR].includes(body[bodyPart].boost) ){
					boostStrength = BOOSTS[ body[bodyPart].type ][ body[bodyPart].boost ].repair;
				}
				repairPower += (REPAIR_POWER * boostStrength);
			} else if (body[bodyPart].type === TOUGH || body[bodyPart] === TOUGH){
				if (body[bodyPart].boost !== undefined){					
					boostStrength = BOOSTS[ body[bodyPart].type ][ body[bodyPart].boost ].damage;
					toughFactor = BOOSTS[ body[bodyPart].type ][ body[bodyPart].boost ].damage;
					tough += 100 / boostStrength;
					toughHp += body[bodyPart].hits
				}
			}
		}

		return {strength: strength, 			
			attackDamage: attackDamage, 
			rangedAttackDamage: rangedAttackDamage, 
			dismantlePower: dismantlePower,
			repairPower: repairPower,
			healPower: healPower, 
			tough: tough,
			toughFactor: toughFactor,
			toughHp: toughHp,
			defensive: attackDamage+rangedAttackDamage+healPower};

	}

	global.calcSingleCreepStrength = function(creep, useHp=false, forceRecalc=false) {
		
		let id = creep.id || creep;
		let hp = creep.hitsMax;
		if (useHp) {
			hp = creep.hits
		}
		let creepId = id + "_" + hp;
		if (!global.creepStrengthCache[creepId] || forceRecalc) {	// Creeps can apply boosts after spotted!
			global.creepStrengthCache[creepId] = {};
			global.creepStrengthCache[creepId] = calcBodyStrength(creep.body, useHp);
		}
		return global.creepStrengthCache[creepId];
	};
		
	global.calcCreepStrength = function(creepsToCalc, useHp=false, forceRecalc=false) {
		let strength = 0;
		let attackDamage = 0;
		let rangedAttackDamage = 0;
		let healPower = 0;
		let tough = 0;
		let toughFactor = 1;
		let toughHp = 0;
		let dismantlePower = 0;
		let repairPower = 0;
		
		let length = creepsToCalc.length;
		for (let creep=0; creep< length; creep++){			
			
			let creepPower = calcSingleCreepStrength(creepsToCalc[creep], useHp, forceRecalc);
			
			strength += creepPower.strength;
			attackDamage += creepPower.attackDamage;
			rangedAttackDamage += creepPower.rangedAttackDamage;
			healPower += creepPower.healPower;
			dismantlePower += creepPower.dismantlePower;
			tough += creepPower.tough;
			repairPower += creepPower.repairPower;

			if (creepPower.toughFactor <= toughFactor) {
				toughFactor = creepPower.toughFactor;
				if (creepPower.toughHp > toughHp) {
					toughHp = creepPower.toughHp
				}
			}						

		}		
		let defensive = attackDamage+rangedAttackDamage+healPower
		return {strength: strength, 			
				attackDamage: attackDamage, 
				rangedAttackDamage: rangedAttackDamage, 
				dismantlePower: dismantlePower,
				repairPower: repairPower,
				healPower: healPower, 
				tough: tough,	
				toughFactor: toughFactor,
				toughHp: toughHp,
				defensive: defensive };
	};
	
	global.createResponseCreep = function(responseRequired, currentCreep, price){
		
		let reqAttack = 0;
		let reqAttackParts = 0;
		let reqRangedAttack = 0;
		let reqRangedAttackParts = 0;
		let reqHeal = 0;
		let reqHealParts = 0;
		let reqTough = 0;
		let reqToughParts = 0;
		
		reqAttack = Math.max(responseRequired.attackDamage - currentCreep.attackDamage, 0);
		reqRangedAttack = Math.max(responseRequired.rangedAttackDamage - currentCreep.rangedAttackDamage, 0);
		reqHeal = Math.max(responseRequired.healPower - currentCreep.healPower, 0);
		reqTough = responseRequired.tough;	
		reqAttackParts = Math.ceil(reqAttack / ATTACK_POWER);
		reqRangedAttackParts = Math.ceil(reqRangedAttack / RANGED_ATTACK_POWER);
		reqHealParts = Math.ceil(reqHeal / HEAL_POWER);		
		reqToughParts = Math.ceil(Math.min(reqTough / 100, (reqAttackParts+reqRangedAttackParts+reqHealParts)/5 ));
		
		// Create 50 part creep
		let reqPartsTotal = reqToughParts + reqAttackParts + reqRangedAttackParts + reqHealParts;
	//	if (reqPartsTotal >
		let maxParts = 25; // REST IS MOVE
		
		let curAttack = Math.floor(Math.min(reqAttackParts, (reqAttackParts/reqPartsTotal) * maxParts));
		let curRangedAttack = Math.floor(Math.min(reqRangedAttackParts, (reqRangedAttackParts/reqPartsTotal) * maxParts));
		let curHeal = Math.floor(Math.min(reqHealParts, (reqHealParts/reqPartsTotal) * maxParts));
		let curTough = Math.floor(Math.min(reqToughParts, (reqToughParts/reqPartsTotal) * maxParts));
		let curMove = Math.min(25, curHeal+curRangedAttack+curAttack+curTough);		
		
		// now scale for price
		let reductionFactor = 1;
		let possibleAdd = 0;
		let curPrice = BODYPART_COST[ATTACK]*curAttack + BODYPART_COST[RANGED_ATTACK]*curRangedAttack + BODYPART_COST[HEAL]*curHeal + BODYPART_COST[TOUGH]*curTough + BODYPART_COST[MOVE]*curMove;
		if (curPrice > price) {

			reductionFactor = price / curPrice;
			curAttack = Math.floor(curAttack * reductionFactor);
			curRangedAttack = Math.floor(curRangedAttack * reductionFactor);
			curHeal = Math.floor(curHeal * reductionFactor);
			curTough = Math.floor(curTough * reductionFactor);
			curMove = Math.min(25, curHeal+curRangedAttack+curAttack+curTough);

			curPrice = BODYPART_COST[ATTACK]*curAttack + BODYPART_COST[RANGED_ATTACK]*curRangedAttack + BODYPART_COST[HEAL]*curHeal + BODYPART_COST[TOUGH]*curTough + BODYPART_COST[MOVE]*curMove;
			if (price - curPrice > 0) {
			//	console.log("reminaing cost " + (price - curPrice));
				if (responseRequired.rangedAttackDamage <= 2) {
					possibleAdd = Math.floor((price - curPrice) / (BODYPART_COST[ATTACK] + BODYPART_COST[MOVE]));
				} else {
					possibleAdd = Math.floor((price - curPrice) / (BODYPART_COST[RANGED_ATTACK] + BODYPART_COST[MOVE]));
				}
				
				if (possibleAdd > 1) {
					if (responseRequired.rangedAttackDamage <= 2) {
						curAttack += possibleAdd;
					//	console.log("adding curAttack " + possibleAdd);
					} else {
						curRangedAttack += possibleAdd;
					//	console.log("adding curRangedAttack " + possibleAdd);
					}
					curMove += possibleAdd;
					
				}
			}	
		}
				
		return {tough : curTough,				
				ranged_attack: curRangedAttack, 
				attack: curAttack, 				
				move: curMove,
				heal: curHeal
		};
	};
	
	global.roomPositionIdentifier = function(roomPosition) {
		return roomPosition.roomName + 'x' + roomPosition.x + 'y' + roomPosition.y;
	};
	
	global.calcResponseForce = function(enemies) {
		
	//	let enemies = calcCreepStrength(creepsToCounter)
		
		let _strength = 0;
		let _attackDamage = 0;
		let _attackParts = 0;
		let _rangedAttackDamage = 0;
		let _rangedAttackParts = 0;
		let _healPower = 0;
		let _healParts = 0;
		let _tough = 0;
		let _toughParts = 0;
		
		_rangedAttackDamage =  enemies.rangedAttackDamage * SAFETY_FACTOR_CREEPSTRENGTH;
		_rangedAttackParts = Math.max(Math.ceil(_rangedAttackDamage / RANGED_ATTACK_POWER), 1); // Use minimum 1 ranged for utility
		
		_attackDamage =  enemies.attackDamage * SAFETY_FACTOR_CREEPSTRENGTH;
		_attackParts = Math.ceil(_attackDamage / ATTACK_POWER);
	
		_healPower = enemies.healPower * SAFETY_FACTOR_CREEPSTRENGTH;
		_healParts = Math.max(1, Math.ceil(_healPower/HEAL_POWER));
		
	//	_tough = enemies.tough;
	//	_toughParts = Math.ceil(_tough/100);
		
		_attackDamage = _attackParts * ATTACK_POWER;
		_rangedAttackDamage = _rangedAttackParts * RANGED_ATTACK_POWER;
		if (_attackDamage + _rangedAttackDamage === 0) {
			_attackParts = 2;
			_attackDamage = _attackParts * ATTACK_POWER;
		}

		_healPower = _healParts * HEAL_POWER;
		_strength = _attackDamage + _rangedAttackDamage + _healPower;
	
		
		return {strength: _strength, 
				attackParts: _attackParts, 
				attackDamage: _attackDamage, 
				rangedAttackParts: _rangedAttackParts,
				rangedAttackDamage: _rangedAttackDamage, 
				healParts: _healParts,
				healPower: _healPower, 
				tough: _tough,
				toughParts: _toughParts};
		
	};
	
	
};