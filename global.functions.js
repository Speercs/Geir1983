'use strict'
// const gc = require('./gc');
const globalConstants = require('./gc');

global.lib_segments = require('segments');

module.exports = function() {


	global.setSemgentAsCritical = function(_id){	
		lib_segments.markCritical(_id);
	};

	global.requestMemorySegment = function(_id) {
		lib_segments.requestSegment(lib_segments.getIndexByLabel(_id), 2);
	};

	global.requestRawMemorySegment = function(_id) {
		lib_segments.requestSegment(_id, 2);
	};

	global.getRangeXY = function(x1, y1, x2, y2){
		return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
	}

	global.getRangeTo = function(pos1, pos2){		
		if (!pos1.roomName || !pos2.roomName) { throw new Error('invalid room pos! ' + JSON.stringify(pos1) + " and " + JSON.stringify(pos2) );}
		if (pos1.roomName != pos2.roomName) { return Infinity}
		return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y));
	}

	global.setMemorySegment = function() {
		if (global.nextSegments) {
			RawMemory.setActiveSegments(global.nextSegments);		
		}
	};
	
	global.accessMemorySegment = function(_id){
	//	getAvailableSegments
		return lib_segments.segmentLoaded(_id);
	};

	global.activeSegmentsOutsideLib = 0;
	global.registerActiveSegment = function(n=1) {
		global.activeSegmentsOutsideLib++
	}

	global.currentlyActiveSegment = function() {
		return global.activeSegmentsOutsideLib || 0;
	}

	global._playerInfo = {};
	global.recievePlayerInfo = function(stats){

		if (!global._playerInfo.ts || global._playerInfo.ts !== Game.time) {
			global._playerInfo.ts = Game.time;
			global._playerInfo.data = '';
		}
		global._playerInfo.data += stats;
		log("Player stats recieved from Python!")
	}
	
	global.globalFlatLine = function(currentHeapPercent) {
		let diffPercent = currentHeapPercent - global.prevHeapPercent;
		global.prevHeapPercent = currentHeapPercent;
	//	console.log("FlatLineCounter " + global.FlatLineCounter + " diff " + diffPercent);
		if (Math.abs(diffPercent) < 0.04 ) {
			if (global.FlatLineCounter === undefined) { global.FlatLineCounter = 0; }
			global.FlatLineCounter++;
			if (global.FlatLineCounter > 50) {
				return true;
			}
		} else {
			global.FlatLineCounter = 0;
		}
		return false;
	}

	global.myGc = function(){
		if (typeof gc !== 'undefined'){
			log("gc()!")
			gc();
		} else {			
			Game.cpu.halt();
		}
	}

	global.reset = function() {
		while (true) {
		//	; lolwtf
		}
	}

	

	global._interShardPortalMap = {};
	global.findInterShardPortal = function(shardDest, originRoomName, destRoomName) {

		let id = shardDest+originRoomName+destRoomName;
		if (global._interShardPortalMap[id] === undefined || Game.time > global._interShardPortalMap[id].ts) {
			global._interShardPortalMap[id] = {};
			global._interShardPortalMap[id].ts = 1500;

			let bestPortalDist = 20;
			let bestPortal;
			for (let portalOrigin in Memory.shardPortals) {
				if (Memory.shardPortals[portalOrigin][shardDest] === undefined) { continue; }

				let linDist = Game.map.getRoomLinearDistance(portalOrigin, originRoomName);
				if (linDist > 10) { continue; }

				for (let portalDest in Memory.shardPortals[portalOrigin][shardDest]) {
					let linDistShard = Game.map.getRoomLinearDistance(portalDest, destRoomName);
					if (linDistShard > 4) { continue; }

					let localRoute = getRouteDistance(originRoomName, portalOrigin, 0, { restrictDistance: 11 })
					let localRouteLength = Object.keys(localRoute).length;

					if ((linDistShard + localRouteLength) < bestPortalDist) {
						bestPortalDist = linDistShard + localRouteLength;
						bestPortal = {
							originRoom: portalOrigin,
							originPos: Memory.shardPortals[portalOrigin][shardDest][portalDest].pos,
							range: bestPortalDist,
							route: localRoute,
						};
					}
				}
			}
			global._interShardPortalMap[id].portal = bestPortal;	
		}
		return global._interShardPortalMap[id].portal;
	}


	// JSON.stringify(findInterShardPortal("shard2", "E2N17", "E2N22"));

	global.getMemorySegment = function(_id){ 
		
		if (!global.__segbuffer || !global.__segbuffer[_id]	|| global.__segbuffer[_id].sidx !== Memory.__segindex.savelog[lib_segments.getIndexByLabel(_id)]) {
			global.__segbuffer[_id] = {};
			let init = Game.cpu.getUsed();
			global.__segbuffer[_id].data = lib_segments.getObject(_id);
			global.__segbuffer[_id].cpu = Game.cpu.getUsed()-init;
			global.__segbuffer[_id].sidx = Memory.__segindex.savelog[lib_segments.getIndexByLabel(_id)];
		} else {
		//	console.log("returning cached segment "+_id + " save id " + Memory.__segindex.savelog[lib_segments.getIndexByLabel(_id)] + " saved cpu " +global.__segbuffer[_id].cpu )
		}
		return global.__segbuffer[_id].data;
	};
	
	global.saveMemorySegment = function(_id, data){
		lib_segments.saveObject(_id, data);
		delete global.__segbuffer[_id];	
	};	

	global.getRoomTerrainAt = function(x, y, roomName){
		if(_.isObject(x)) {
			
			y = x.y;
			roomName = x.roomName;
			x = x.x;
		}

		if (!global.roomTerrain[roomName]) {
			global.roomTerrain[roomName] = {};
			global.roomTerrain[roomName].terrain = Game.map.getRoomTerrain(roomName) 
		}
		
		return global.roomTerrain[roomName].terrain.get(x, y);
	} 

	global.energyRequiredForRcl = function(level, controller){

		if (controller.level >= level){ return 0; }
		if (level > CONTROLLER_MAX_LEVEL) { return Infinity; }

		let requiredEnergy = controller.progressTotal - controller.progress;
		for (let iterator = controller.level+1; iterator < level; iterator++) {
			requiredEnergy += CONTROLLER_LEVELS[iterator];
		}
		return requiredEnergy;
	}

	global.drawCircle = function(roomName, x, y, opts = {}) {
		if (Game.rooms[roomName]) {
			Game.rooms[roomName].visual.circle(x,y, opts)
		} else {
			new RoomVisual(roomName).circle(x,y, opts)
		}
	}
	
	global.drawText = function(roomName, text, x, y, opts = {}) {
		if (Game.rooms[roomName]) {
			Game.rooms[roomName].visual.text(text, x,y, opts)
		} else {
			new RoomVisual(roomName).text(text,x,y, opts)
		}
	}

	global.getSector = function(roomName){
		if (global.sector[roomName] === undefined) {
			let parsed = /([A-Z]+)(\d+)([A-Z]+)(\d+)/.exec(roomName);
			let sector = parsed[1] + Math.floor(parsed[2] / 10) + parsed[3] + Math.floor(parsed[4] / 10)
			global.sector[roomName] = {};
			global.sector[roomName].sector = sector;
		}
		return global.sector[roomName].sector;
	}

	global.sectorV2 = {};
	global.getSectorV2 = function(roomName){
		if (global.sectorV2[roomName] === undefined) {
			let parsed = /([A-Z]+)(\d+)([A-Z]+)(\d+)/.exec(roomName);
			let sector = parsed[1] + ((Math.floor(parsed[2] / 10)*10)+5) + parsed[3] + ((Math.floor(parsed[4] / 10)*10)+5)
			global.sectorV2[roomName] = {};
			global.sectorV2[roomName].sector = sector;
		}
		return global.sectorV2[roomName].sector;
	}

	global.roomNameFromXY = function(x,y) {
		if(x < 0) {
			x = 'W'+(-x-1);
		}
		else {
			x = 'E'+(x);
		}
		if(y < 0) {
			y = 'N'+(-y-1);
		}
		else {
			y = 'S'+(y);
		}
		return ""+x+y;
	}

	global.roomNameToXY = function(name) {
		let xx = parseInt(name.substr(1), 10);
		let verticalPos = 2;
		if (xx >= 100) {
			verticalPos = 4;
		} else if (xx >= 10) {
			verticalPos = 3;
		}
		let yy = parseInt(name.substr(verticalPos + 1), 10);
		let horizontalDir = name.charAt(0);
		let verticalDir = name.charAt(verticalPos);
		if (horizontalDir === 'W' || horizontalDir === 'w') {
			xx = -xx - 1;
		}
		if (verticalDir === 'N' || verticalDir === 'n') {
			yy = -yy - 1;
		}
		return [xx, yy];
	};

	global.reachablePosHWWall = function(pos, fromPos) {
		let destRoom = pos.roomName;
		let fromRoom = fromPos.roomName;

		const [destRoomX, destRoomY] = roomNameToXY(destRoom);
		const [originRoomX, originRoomY] = roomNameToXY(fromRoom);


		let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(destRoom);
		let fMod = parsed[1] % 10;
		let sMod = parsed[2] % 10;

		let wallNS = roomIsCorner(destRoom) || fMod === 0;
		let wallWE = roomIsCorner(destRoom) || sMod === 0;

		let destPosN = pos.y < 25;
		let destPosW = pos.x < 25;

		let reachable = true;
		if (wallNS) {
			
			if (originRoomX > destRoomX) {
			//	log("from east" + originRoomY  + " - " + destRoomY)
				// from east
				if (destPosW) { reachable = false; }
			} else{
			//	log("from west")
				if (!destPosW) { reachable = false; }
			}
		} 

		if (wallWE) {
			if (originRoomY > destRoomY) {
				// from south
				if (destPosN) { reachable = false; }
			} else{
				if (!destPosN) { reachable = false; }
			}
		}

		return reachable;
	}

	global.getSectorFromPos = function(pos){

		let roomName = pos.roomName
		if (!roomIsHW(roomName) ) { return getSectorV2(roomName) }

		let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
		let fMod = parsed[1] % 10;
		let sMod = parsed[2] % 10;

		let wallNS = roomIsCorner(roomName) || fMod === 0;
		let wallWE = roomIsCorner(roomName) || sMod === 0;

		let curPosN = pos.y < 25;
		let curPosW = pos.x < 25;

		let [roomX, roomY] = roomNameToXY(roomName);

		if (wallNS) {
			if(curPosW) {
				roomX--;
			} else {
				roomX++;
			}
		}

		if(wallWE) {
			if(curPosN) {
				roomY--;
			} else {
				roomY++;
			}
		}

		return getSectorV2(roomNameFromXY(roomX, roomY));
	}

	global.posInSameSector = function(pos1, pos2){
		log("posInSameSector sector called???")
		return roomsInSameSectorV2(getSectorFromPos(pos1), getSectorFromPos(pos2));
	}

	global.sameSectorV2 = {};
	global.roomsInSameSectorV2 = function(room1, room2){
		log("roomsInSameSectorV2 sector called???")
		let id = room1 + room2;
		if(!sameSectorV2[id]) {

			sameSectorV2[id] = {};
			let centerRoom = getSectorV2(room1);
			let [destRoomX, destRoomY] = roomNameToXY(centerRoom);
			let [originRoomX, originRoomY] = roomNameToXY(room2);

			let distX = Math.max(Math.abs(destRoomX - originRoomX), Math.abs(destRoomY - originRoomY))
			if (distX <= 5) { 
				sameSectorV2[id].same = true;
				return true; 
			}
			
			// Check other dir 
			centerRoom = getSectorV2(room2);
			[destRoomX, destRoomY] = roomNameToXY(centerRoom);
			[originRoomX, originRoomY] = roomNameToXY(room1);

			distX = Math.max(Math.abs(destRoomX - originRoomX), Math.abs(destRoomY - originRoomY))
			if (distX <= 5) { 
				sameSectorV2[id].same = true;
				return true; 
			}
			
			sameSectorV2[id].same = false;
			return false;
		}
		return sameSectorV2[id].same;
	}


	global.roomsInSameSector = function(room1, room2){

		let parsed1 = /([A-Z]+)(\d+)([A-Z]+)(\d+)/.exec(room1);
		let parsed2 = /([A-Z]+)(\d+)([A-Z]+)(\d+)/.exec(room2);
		
	//	console.log(parsed1[0] + " " +parsed1[1] + " " + parsed1[2] + " " +parsed1[3] +" " +parsed1[4] )
		if (parsed1[1] !== parsed2[1] || parsed1[3] !== parsed2[3]) { return false;}

		if (Math.floor(parsed1[2] / 10) !== Math.floor(parsed2[2] / 10) || Math.floor(parsed1[4] / 10) !== Math.floor(parsed2[4] / 10)) { return false;}

		return true;
	}
	


	global.isRoomAvailable = function(roomName) {
		if (global.isRoomAvailableCache[roomName] === undefined) {
			global.isRoomAvailableCache[roomName] = Game.map.isRoomAvailable(roomName);
		}
		return global.isRoomAvailableCache[roomName];
	}

	global.isRoomAvailableV2 = function(roomName) {
		if (global.isRoomAvailableCache[roomName] === undefined ||
			Game.time > global.isRoomAvailableCache[roomName].ts			
		) {
			global.isRoomAvailableCache[roomName] = {};
			global.isRoomAvailableCache[roomName].ts = Game.time + 750;
			let roomStatus = Game.map.getRoomStatus(roomName);
			if (roomStatus) {	// why can it fail? 
				global.isRoomAvailableCache[roomName].status = roomStatus.status;
				global.isRoomAvailableCache[roomName].available = global.isRoomAvailableCache[roomName].status == "normal";	
			}					
		}
		return global.isRoomAvailableCache[roomName].available;
	}

	global.getRoomStatus = function(roomName) {
		if (global.isRoomAvailableCache[roomName] === undefined ||
			Game.time > global.isRoomAvailableCache[roomName].ts			
		) {
			global.isRoomAvailableCache[roomName] = {};
			global.isRoomAvailableCache[roomName].ts = Game.time + 750;			
			global.isRoomAvailableCache[roomName].status = Game.map.getRoomStatus(roomName).status;
			global.isRoomAvailableCache[roomName].available = global.isRoomAvailableCache[roomName].status == "normal";			
		}
		return global.isRoomAvailableCache[roomName].status;
	}


	// IS SOURCE KEEPER ROOM
	global.roomIsSk = function(room) {		
		if (global.isRoom[room] === undefined) {
			global.parseRoomName(room);
		}
		return global.isRoom[room].sk;
	};

	// IS CENTER
	global.roomIsCenter = function(room) {		
		if (global.isRoom[room] === undefined) {
			global.parseRoomName(room);
		}
		return global.isRoom[room].ce;
	};

	// IS CORNER ROOM
	global.roomIsCorner = function(room) {			
		if (global.isRoom[room]  === undefined) {
			global.parseRoomName(room);
		}
		return global.isRoom[room].cr ;
	};

	// IS CONTROLLER ROOM
	global.roomIsController = function(room) {			
		if (global.isRoom[room] === undefined) {
			global.parseRoomName(room);
		}
		return global.isRoom[room].ct;
	};	
	
	// IS HIGHWAY ROOM
	global.roomIsHW = function(room) {			
		if (global.isRoom[room] === undefined) {
			global.parseRoomName(room);
		}
		return global.isRoom[room].hw;
	};

	global.hwDistances = function(roomName) {
		if (global.hwDistances[roomName] === undefined) {
			let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
			let fMod = parsed[1] % 10;
			let sMod = parsed[2] % 10;

			let fDist = Math.min(fMod, 10-fMod);
			let sDist = Math.min(sMod, 10-sMod);			
			global.hwDistances[roomName] = fDist+sDist;
		}		
		return global.hwDistances[roomName];
	}





	global.parseRoomName = function(room) {	
		let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(room);
		let fMod = parsed[1] % 10;
		let sMod = parsed[2] % 10;

		global.isRoom[room] = {};

		let isCorner = (fMod === 0 && sMod === 0);
		global.isRoom[room].cr = isCorner;

		let isHW = (fMod === 0 || sMod === 0);
		global.isRoom[room].hw = isHW;

		let isCenter = (fMod === 5 && sMod === 5);
		global.isRoom[room].ce = isCenter;

		let isSK = !(fMod === 5 && sMod === 5) &&
					   ((fMod >= 4) && (fMod <= 6)) &&
					   ((sMod >= 4) && (sMod <= 6));
		global.isRoom[room].sk = isSK;

		global.isRoom[room].ct = !isSK && !isCenter && !isHW;

	}

	global.orderCombatBoost = function(room, boosts) {
		if (Memory.combatBoost[room] === undefined) { Memory.combatBoost[room] = {}; }

		Memory.combatBoost[room].boosts = boosts;
		Memory.combatBoost[room].ts = Game.time + 2000;
	};

	global.findClosestHostileBase = function(fromRoom, object = [], depth = 2){
		if (object.length <= 0 && depth > 0) {	
			for (let exit in getExits(fromRoom) ){
				if (Memory.rooms[exit] && Memory.rooms[exit].hostileRoom) {
					if (roomIsSafeModed(exit) > 0) { continue; }					
					object.push(exit);					
				}
				findClosestHostileBase(exit, depth-1, object)
			}
		}
	}

	global.getTowerRepairTargets = function(roomName){

		if (!towerRepairTargets[roomName] || Game.time !== towerRepairTargets[roomName].ts ) {
			towerRepairTargets[roomName] = {}
			towerRepairTargets[roomName].ts = Game.time+1;
			let damagedStructures =  Game.rooms[roomName].find(FIND_STRUCTURES, {
				filter: (structure) => (structure.hits < structure.hitsMax && 
						((structure.structureType !== STRUCTURE_RAMPART &&							
						structure.structureType !== STRUCTURE_WALL && 
						structure.structureType !== STRUCTURE_ROAD) || 
						structure.structureType === STRUCTURE_ROAD && roadIsValid(structure.pos))
						)
					});

			towerRepairTargets[roomName].targets = [];		
			for (let idx in damagedStructures) {
				towerRepairTargets[roomName].targets.push(damagedStructures[idx].id);
			}
			return damagedStructures;					
		}

		let returnValue = [];
		let idx = towerRepairTargets[roomName].targets.length;		
		while (idx--) {
			let target = Game.getObjectById(towerRepairTargets[roomName].targets[idx])
			if (!target) { continue; }
			let missingHits = target.hitsMax - target.hits;
			if ((target.structureType === STRUCTURE_ROAD && missingHits < TOWER_POWER_REPAIR) ||
				(target.structureType === STRUCTURE_CONTAINER && containerIsValid(target.pos) && missingHits < target.hitsMax/2)
				) {
				towerRepairTargets[roomName].targets.splice(idx, 1);	
				continue;
			}


			if (target && target.hits < target.hitsMax) {
				returnValue.push(target);
			} else {
				towerRepairTargets[roomName].targets.splice(idx, 1);
			}
		}
		towerRepairTargets[roomName].ts = Game.time+1;
		return returnValue;
	}

	global.orderAntiScouts = function(room, duration = 3000, description = '') {
		if (!room) { console.log("orderAntiScouts invalid room " + room); return;}
		if (!Game.rooms[room] && 
			(!Memory.expansionTarget[room] || 
			!Memory.expansionTarget[room].exitsToDefend)
			) { return; 
		}
		if (!Memory.antiScout[room] || 
			!Memory.antiScout[room].assignedSpawn || 
			!Memory.antiScout[room].exits ||
			Memory.antiScout[room].exits.length == 0
			) {
			Memory.antiScout[room] = {};		
			console.log("orderAntiScouts assigning room " + room);	
			Memory.antiScout[room].assignedSpawn = {};
			let reqSpawn = 3;
			let roomsInRange = getMyClosestRooms(room, reqSpawn, 3);
			Memory.antiScout[room].assignedSpawn = roomsInRange;
			Memory.antiScout[room].description = description;
			if (Memory.expansionTarget[room] && Memory.expansionTarget[room].exitsToDefend) {
				Memory.antiScout[room].exits = Memory.expansionTarget[room].exitsToDefend
			} else if (Game.rooms[room]) {
				Memory.antiScout[room].exits = getExitsToDefend(room);		
			} else {
				delete Memory.antiScout[room];
				return;
			}
				
		}
		Memory.antiScout[room].ts = Game.time + duration;
	}


	global.getExitsToDefend = function(roomName) {
		if (!Game.rooms[roomName]) { return []; }
		let exits = Game.rooms[roomName].findReducedExits();
		let dest = [];
		for (let idx in exits){
			let pos = exits[idx];
			if (!pos) { continue; }
			let posToDefend;
			if (pos.x === 0) {
				posToDefend = pos.getPositionAtDirectionWrapToNextRoom(LEFT);
			} else if (pos.x === 49) {
				posToDefend = pos.getPositionAtDirectionWrapToNextRoom(RIGHT);
			} else if (pos.y === 0) {
				posToDefend = pos.getPositionAtDirectionWrapToNextRoom(TOP);
			} else if (pos.y === 49) {
				posToDefend = pos.getPositionAtDirectionWrapToNextRoom(BOTTOM);
			}

			if (!posToDefend) {
				console.log("not found posToDefend")
				continue;
			}

			// Check for hostile room, dont place combat creeps there
			if (Memory.rooms[posToDefend.roomName] &&
				(Memory.rooms[posToDefend.roomName].hostileRoom || 
				Memory.rooms[posToDefend.roomName].enemyRemote)
			){
				console.log("hostile room " + posToDefend.roomName)
				continue;
			}

			// Check for dead end
			let exitsForRemote = Game.map.describeExits(posToDefend.roomName);
			if (!exitsForRemote || Object.keys(exitsForRemote).length <= 1) { 
				console.log("dead end room " +posToDefend.roomName)
				continue; 
			}

			dest.push(posSave(posToDefend));
		}
		return dest;
	}

	global.createAttackId = function() {
		// Generate a unique id
		if (Memory.attackId === undefined) {
			Memory.attackId = 1;
		}
		return Memory.attackId++;
	}
	
	global.orderRangedAttackers = function(room, duration = 3000, description = '') {
		if (!room) { console.log("orderRangedAttackers invalid room " + room); return;}
		
		if (!Memory.attackTarget[room] || 
			Game.time > Memory.attackTarget[room].ts ||
			!Memory.attackTarget[room].assignedSpawn || 
			Object.keys(Memory.attackTarget[room].assignedSpawn).length <= 0
		) {
			Memory.attackTarget[room] = {};
			Memory.attackTarget[room].ts = Game.time + 2497;
			Memory.attackTarget[room].assignedSpawn = {};

			Memory.attackTarget[room].attId = createAttackId();

			let reqSpawn = Math.min(Memory.myRoomHighPRCL, 7);

			let roomsInRange = getMyClosestRooms(room, reqSpawn, 3);
			if (Object.keys(roomsInRange).length === 0 ) {
				roomsInRange = getMyClosestRooms(room, 4, 3);
			}
			Memory.attackTarget[room].assignedSpawn = roomsInRange;
			Memory.attackTarget[room].description = description;
			Memory.attackTarget = sortAttackTargets(Memory.attackTarget);
		//	console.log("sortAttackTargets " + room);
		}
		if (Memory.sortAttacks === undefined || Game.time > Memory.sortAttacks) {
			Memory.sortAttacks = Game.time + 100;
			Memory.attackTarget = sortAttackTargets(Memory.attackTarget);
		}
		let attackers = getCreeps('rangedAttacker');
		reassignAttackers(room, attackers);
		Memory.attackTarget[room].ts = Game.time + duration;
	};

	global.sortCombatDeconstructMissions = function(){		
		let sortedAttackOps = {};
		let sortable = [];
		for(let room in Memory.combatDeconstruct) {
			
			let priority = 1;

			if (Memory.combatDeconstruct[room].civilian) {
				priority -= 1;
			}

			if (getRoomPRCL(room) < getRoomRCL(room) ) {
				priority += getRoomRCL(room) - getRoomPRCL(room)
			}
			
			if (Memory.rooms[room].RRCL !== undefined) {
				priority += Memory.rooms[room].RRCL;
			}

		//	console.log("sorting " + room + " score " +priority)
			sortable.push([room, priority]);	// SORT FROM HIGHEST TO LOWEST 
		}

		sortable.sort(function(a, b) {
			return (b[1] - a[1]);});	
		let length = sortable.length;
		for (let i=0; i<length; i++) {
			let remoteRoom = sortable[i][0];
			sortedAttackOps[remoteRoom] = {};
			
			sortedAttackOps[remoteRoom] = Memory.combatDeconstruct[remoteRoom];
			sortedAttackOps[remoteRoom].score = sortable[i][1];
		}
		Memory.combatDeconstruct = sortedAttackOps;		
	};

	function sortAttackTargets(attacks) {
		//	console.log(" unsorted "+ JSON.stringify(attacks))	
		let sortedAttackOps = {};
		let sortable = [];
		for(let room in attacks) {

			let priority = 0;
			if (Memory.rooms[room] && Memory.rooms[room].myRoom) { 
				priority = -20;
			} else if (attacks[room].description == "flags") {	// manual flag
				priority = -10;
			} else if (Memory.rooms[room] && (Memory.rooms[room]._breachPos || Memory.rooms[room].numberOfTowers == 0) && getRoomRCL(room) > 0){
				priority = 10 - getRoomRCL(room);
			} else if (Memory.rooms[room] && Memory.rooms[room][R.MY_MINING_OUTPOST]) { 
				priority = 20;
				if (Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power) {
					priority += Math.min((Memory.rooms[room].hostiles.power.defensive / 1000) , 9.99);
				}
			} else if (getRoomPRCL(room) > 0 || (getRoomRCL(room) > 0)) {	// ENEMY BASES					
				priority = getRoomPRCL(room) + getRoomRCL(room) + 30;	
			} else {	// Harass REMOTE?
				priority = 50;
			}

			
			sortable.push([room, priority]);	// SORT FROM LOWEST TO HIGHEST
		}
		
		sortable.sort(function(a, b) {
			return (a[1] - b[1]);});	
		let length = sortable.length;
		for (let i=0; i<length; i++) {
			let remoteRoom = sortable[i][0];
			sortedAttackOps[remoteRoom] = {};
			
			sortedAttackOps[remoteRoom] = attacks[remoteRoom];
			sortedAttackOps[remoteRoom].score = sortable[i][1];
		}
		return sortedAttackOps;
	}

	global.orderEnergyCart = function(roomName, duration = 3000, range = 5) {		
		if (Memory.energyCartTargets === undefined ) {  Memory.energyCartTargets = {}; }
		
		if (!Memory.energyCartTargets[roomName] || !Memory.energyCartTargets[roomName].assignedSpawn) {
			Memory.energyCartTargets[roomName] = {};
			Memory.energyCartTargets[roomName].assignedSpawn = {};
			Memory.energyCartTargets[roomName].assignedSpawn = getMyClosestRooms(roomName, 6, range, 8);	
		}
		Memory.energyCartTargets[roomName].ts = Game.time + duration;
	};

	global.cacheGclOffset = {};
	global.getGclOffset = function(level) {

		if (global.cacheGclOffset[level] === undefined) {
			let offset = 0;
			let _level = level
			while (_level > 1) {
				_level--;
				offset += (Math.pow(_level, 2.4) - Math.pow(_level-1, 2.4)) * 1000000
			}
			global.cacheGclOffset[level] = {};
			global.cacheGclOffset[level].offset = offset;
		}
		return global.cacheGclOffset[level].offset
	}

	global.cacheRclOffset = {};
	global.getRclOffset = function(level) {

		if (global.cacheRclOffset[level] === undefined) {
			let offset = 0;
			while (level > 1) {
				level--;
				offset += CONTROLLER_LEVELS[level]
			}
			global.cacheRclOffset[level] = {};
			global.cacheRclOffset[level].offset = offset;	
		}
		return global.cacheRclOffset[level].offset
	}

	global._getMyRooms = {};
	global._getMyRoomsTs
	global.getMyRooms = function() {
		if (Game.time !== global._getMyRoomsTs) {		
			global._getMyRooms = {}
			global._getMyRoomsTs = Game.time;
			for (let room in Memory.rooms) {				
				if (Memory.rooms[room].myRoom === 1) {
					global._getMyRooms[room] = Memory.rooms[room]
				}
			}
		}
		return global._getMyRooms;
	}

	global.getMyRoomsMinPrcl = function(minPrcl = 0) {
		let allMyRooms = getMyRooms()
		let myRooms = {};
		for (let room in allMyRooms) {
			if (Memory.rooms[room].myRoom === 1 && getRoomPRCL(room) >= minPrcl) {
				myRooms[room] = Memory.rooms[room]
			}
		}
		return myRooms;
	}

	global.getMyRoomsBelowPrcl = function(maxPrcl = 8) {
		let allMyRooms = getMyRooms();
		let myRooms = {}
		for (let room in allMyRooms) {
			if (Memory.rooms[room].myRoom === 1 && getRoomPRCL(room) < maxPrcl) {
				myRooms[room] = Memory.rooms[room]
			}
		}
		return myRooms;
	}
//JSON.stringify(getMyClosestRooms("W2N21", 4, 2, 20, undefined, "shard2"))
	global.getMyClosestRooms = function(destination, myRoomLevel=4, range=2, maxDist = 20, energyLevel = undefined, shard){
		let identifier = destination + ":" + myRoomLevel+":"+range + " max "+ maxDist + "el"+energyLevel+shard;
		if (global.mapClosestRooms[identifier] === undefined || Game.time > global.mapClosestRooms[identifier].ts || energyLevel || true) {

			let allowSK = false;
			if (roomIsSk(destination)) {
				allowSK = true;
			}
			let rooms = {};

			global.mapClosestRooms[identifier] = {};
			global.mapClosestRooms[identifier].rooms = {};
			global.mapClosestRooms[identifier].ts = Game.time + 750;
 
			let myRooms = getMyRoomsMinPrcl(myRoomLevel)

			let closestDistance = maxDist;
			for (let roomName in myRooms){
				if (roomName === destination) { continue; }
				if (energyLevel && Game.rooms[roomName].energyStatus() <= energyLevel) { continue; } 
			//	let init = Game.cpu.getUsed()
				let distance = getRouteDistanceOnly(roomName, destination, { restrictDistance: closestDistance, allowSK: allowSK, shard: shard });
			//	let time = Game.cpu.getUsed()-init;
			//	console.log("checking room" + roomName + " dist " + distance +" cpu " + time)
				rooms[roomName] = {};
				rooms[roomName].dist = distance;
				if (distance < closestDistance) {
					closestDistance = distance;
				}
			}
		
			let reqDistance = closestDistance + range;
			
			for (let room in rooms){
				if (rooms[room].dist <= reqDistance) {
					global.mapClosestRooms[identifier].rooms[room] = {};
					global.mapClosestRooms[identifier].rooms[room].dist = rooms[room].dist;
				}
			}
		}
		return global.mapClosestRooms[identifier].rooms;
	};

	global.findClosestDistanceFromMyRooms = function(destination, myRoomLevel=4){		
		let identifier = destination + ":" + myRoomLevel;
		if (global.mapCloseDistance[identifier] === undefined) {
			global.mapCloseDistance[identifier] = {};  
			let myRooms = getMyRoomsMinPrcl(myRoomLevel)
			let closestDistance = 20;
		//	global.mapCloseDistance[identifier].distance = closestDistance;
			for (let roomName in myRooms){

				if (roomName === destination) { continue; }
			//	let init = Game.cpu.getUsed()
				let distance = getRouteDistanceOnly(roomName, destination, { restrictDistance: closestDistance });
			//	let time = Game.cpu.getUsed()-init;
			//	console.log("checking room" + roomName + " dist " + distance +" time " + time)
				if (distance < closestDistance) {
					closestDistance = distance;
					global.mapCloseDistance[identifier].distance = distance;
				}
			}
		}
		return global.mapCloseDistance[identifier].distance;
	};
	
	global.getBlockingCreep = function(pos) {
		if (!pos) { return; }
		if (!Game.rooms[pos.roomName]) { return; }	
		return pos.lookForCreep();
	};

	global.myRoomsUnderSiege = function() {
		let myRooms = getMyRooms();
		let sieged = 0;
		for (let roomName in myRooms) {
			if (myRooms[roomName].sieged) { continue; }
			sieged++
		}
		console.log("sieged rooms " + sieged);
		return sieged;
	}

	global.globalEnergyCrysis = function() {
		if (Memory.myRoomHighPRCL >= 4 && 
			Memory.avgEnergy < 7500
		) {
			return true;
		}
		
	}

	global.cleanAtEndOfTick = function(){
		delete global.temp;
		global.temp = {};
		delete global.sellOrders;
		global.sellOrders = {};
		delete global.buyOrders;
		global.buyOrders = {};
		delete global.orders;
		global.orders = {};
		delete global.allBuyOrders;
		global.allBuyOrders = {};
		delete global.allSellOrders;
		global.allSellOrders = {};

		delete global.roadCreatorMatrix;
		global.roadCreatorMatrix = {};

		delete global.hostiles;
		global.hostiles = {};

		delete global.FriendOrFoe;
		global.FriendOrFoe = {};

		delete global.scoreSiegePos;
		global.scoreSiegePos = {};

		/*
		delete global.prevCreepCache;
		global.prevCreepCache = _.cloneDeep(global.creepsCache)
		*/

		delete global.creepsCache;
		global.creepsCache = {};

		delete global.myCombatCreepsAssignedTo;

		delete global.myOrders;
	//	global.myOrders = {};	dont create!

	/*
		for (let key in global.travCreepCache) {
			delete global.travCreepCache[key];
		}
		*/
		delete global.travCreepCache;

		global.travCreepCache = {};
	
		delete global.blueprintCache;

		delete global.pcHealTargets;

		delete global.blockers;
		global.blockers = {};

		delete global._occupiedSiegePositions;
		global._occupiedSiegePositions = {}
		
		delete global._tempActiveRaidsSpawning;
		global._tempActiveRaidsSpawning = {}

	//	delete global.pullSiegeFormationCombat;
	//	global.pullSiegeFormationCombat = {};

	//	delete global.formationValidPos;
	//	global.formationValidPos = {};

		delete global.idlePosTick;
		global.idlePosTick = {};

		delete global._getMyRooms;
		global._getMyRooms = {};
		global._getMyRoomsTs = 0;

		delete global._currentCpuSavings

		delete global._moveIntents;
		global._moveIntents = {};

		delete global._getEnemyTowers;
		global._getEnemyTowers = {};
		
		global.activeSegmentsOutsideLib = 0;
	}

	global.cleanGlobal = function(){
		delete global.roomTerrain;
		global.roomTerrain = {};
		delete global.oob;
		global.oob = {};
		delete global.creepStrengthCache;
		global.creepStrengthCache = {};
		delete global.formationValidPos;
		global.formationValidPos = {};
		delete global.map
		global.map = {};
		delete global.roomsFindCache;
		global.roomsFindCache = {};
		delete global.mapDistance; 
		global.mapDistance = {};

		delete global.mapClosestRooms;
		global.mapClosestRooms = {};
		delete global.mapCloseDistance;
		global.mapCloseDistance = {};

		delete global.towerRepairTargets;
		global.towerRepairTargets = {};

		delete global.__segbuffer;
		global.__segbuffer = {};

		delete global.travStructureCache
		global.travStructureCache = {};

		delete global.creepsCache;
		global.creepsCache = {};

		delete global.creepsCacheMem;
		global.creepsCacheMem = {};

		delete global._hasBodypartsCache;
		global._hasBodypartsCache = {};

		delete global.roadsCache;
		global.roadsCache = {};

		delete global.eventCache;
		global.eventCache = {};

		delete global.raidPhalanxCm;
		global.raidPhalanxCm = {};

		delete global.pullIdlePos;
		global.pullIdlePos = {};

		delete global.isRoomAvailableCache;
		global.isRoomAvailableCache = {};

		delete global.getPhalanxMatrixCm;
		global.getPhalanxMatrixCm = {};

		delete global.hostileTracker;
		global.hostileTracker = {};

		delete global.getOutsidePixels;
		global.getOutsidePixels = {};

		delete global.sameSectorV2;
		global.sameSectorV2 = {};

		delete global.HwTunnel;
		global.HwTunnel = {};

		delete global._getDangerExits;
		global._getDangerExits = {};

		delete global._openAdjacentSpotsCache;
		global._openAdjacentSpotsCache = {};

		delete global._openAdjacentSpotsCacheGlobal
		global._openAdjacentSpotsCacheGlobal = {};

		delete global._isPassibleCache;
		global._isPassibleCache = {};

		delete global.rampartCache
		global.rampartCache = {}

		delete global._phalanxFormationCache
		global._phalanxFormationCache = {}

		delete global._toWpCache
		global._toWpCache = {}

		log("Cleaned global!")
	//	gc();
	}

	global.cleanGlobalPaths = function(){

		let oldTimeStamp = Game.time - (CREEP_LIFE_TIME * 2);
		if (!isCpuLimited() ) {
			oldTimeStamp = Game.time - 250;
		}
		let deletedPaths = 0;
		let totalPaths = 0;
		for (let id in global.pathOptimizer) {	
			totalPaths++;					
			if (
				global.pathOptimizer[id].ts < oldTimeStamp
			){
				delete global.pathOptimizer[id];
				deletedPaths++;
			}
			if (Game.cpu.getUsed() > 480) { break; }
		}
		console.log("GC deleted paths " + deletedPaths + " of " +totalPaths );
	}

	global.getRoomLinearDistance = function(room1, room2) {
		return Game.map.getRoomLinearDistance(room1, room2);
		/*
		let	destId = room1 + room2;
	//	console.log("destId " + destId)
		if (!global.roomLinearDistance[destId]) {
			global.roomLinearDistance[destId] = {};
			global.roomLinearDistance[destId].dist = Game.map.getRoomLinearDistance(room1, room2);
		}
		return global.roomLinearDistance[destId].dist;
		*/
	};

	global.getEstimatedTravelTime = function(room1, room2) {
		let [x1,y1] = exports.roomNameToXY(room1);
		let [x2,y2] = exports.roomNameToXY(room2);

		let dx = Math.abs(x2-x1);
		let dy = Math.abs(y2-y1);
		
		let sumRooms = dx + dy;
	}

	function roomNameToXY(name) {
		let xx = parseInt(name.substr(1), 10);
		let verticalPos = 2;
		if (xx >= 100) {
			verticalPos = 4;
		} else if (xx >= 10) {
			verticalPos = 3;
		}
		let yy = parseInt(name.substr(verticalPos + 1), 10);
		let horizontalDir = name.charAt(0);
		let verticalDir = name.charAt(verticalPos);
		if (horizontalDir === 'W' || horizontalDir === 'w') {
			xx = -xx - 1;
		}
		if (verticalDir === 'N' || verticalDir === 'n') {
			yy = -yy - 1;
		}
		return [xx, yy];
	}

	/*
	//	c = √(a² + b²)
	exports.calcRoomsDistance = function(room1, room2, continuous) {
		let [x1,y1] = exports.roomNameToXY(room1);
		let [x2,y2] = exports.roomNameToXY(room2);
		let dx = Math.abs(x2-x1);
		let dy = Math.abs(y2-y1);
		if(continuous) {
			let worldSize = driver.getWorldSize();
			dx = Math.min(worldSize - dx, dx);
			dy = Math.min(worldSize - dy, dy);
		}
		return Math.max(dx, dy);
	};


	exports.roomNameToXY = (name) {
		let xx = parseInt(name.substr(1), 10);
		let verticalPos = 2;
		if (xx >= 100) {
			verticalPos = 4;
		} else if (xx >= 10) {
			verticalPos = 3;
		}
		let yy = parseInt(name.substr(verticalPos + 1), 10);
		let horizontalDir = name.charAt(0);
		let verticalDir = name.charAt(verticalPos);
		if (horizontalDir === 'W' || horizontalDir === 'w') {
			xx = -xx - 1;
		}
		if (verticalDir === 'N' || verticalDir === 'n') {
			yy = -yy - 1;
		}
		return [xx, yy];
	};
	*/

	function addTerritoryByExit(room, depth = 0, maxDepth = 3, _myTerritory) {

		if (depth <= maxDepth) {
			for (let exit in getExits(room) ){
				
				if (_myTerritory[exit] === undefined || depth < _myTerritory[exit]) {
					_myTerritory[exit] = depth;
				} else {
					continue;					
				}

				if (Memory.rooms[exit] && Memory.rooms[exit].player && getRoomPRCL(exit) >= 5) {
					continue;
				}

				addTerritoryByExit(exit, depth+1, maxDepth, _myTerritory)
			}
		}
	}
	
	global._myTerritory = {}
	global._myTerritoryTs = 0;
	global.createMyTerritory = function() {
		let init = Game.cpu.getUsed();
		let myRooms = getMyRooms();

		global._myTerritory = {};

		global._myTerritoryTs = Game.time + 3337;

		for (let myRoom in myRooms) {
			global._myTerritory[myRoom] = 0;

			let maxDepth = 2;
			let myRoomPrcl = getRoomPRCL(myRoom);

			if (SEASONAL_THORIUM && Memory.rooms[myRoom].mineOnly) { continue; }

			if (myRoomPrcl >= CONTROLLER_MAX_LEVEL) {
				maxDepth = 4;
			} else if (myRoomPrcl >= 7) {
				maxDepth = 3;
			}

			addTerritoryByExit(myRoom, 1, maxDepth, global._myTerritory);
		}

		let usedCpu = Game.cpu.getUsed()-init
		log("createMyTerritory used cpu " + usedCpu.toFixed(1))
	}

	global.withinMyTerritory = function(roomName) {

		if (!global._myTerritoryTs || Game.time > global._myTerritoryTs) {
			createMyTerritory();
		}
		
		if (global._myTerritory[roomName] === undefined) return undefined
		return global._myTerritory[roomName]
	}

	global.log = function(message, color = "red" ) {
		console.log(`<font color="${color}">${message}</font>`);
	};

	global.getRouteDistanceOnly = function(room1, room2, options = {} ) {	
		let	dest = room1 + room2 + options.shard;
		options.allowShortcuts = false;
		
		if (global.mapDistance[dest] === undefined ) { 
			global.mapDistance[dest] = {};
			let route = findRoute(room1, room2, options );
			if (route) {
				global.mapDistance[dest].routeLength = Object.keys(route).length;			
			} else {
				global.mapDistance[dest].routeLength = Infinity; 
			}
		}
		return global.mapDistance[dest].routeLength;
	};
	

	global.getRouteDistance = function(room1, room2, destOnly = 1, options = {} ) {						
		let	dest = room1 +":"+ room2 + options.shard;	
		options.allowShortcuts = false;
		
		if (global.map[dest] === undefined ) { 
			global.map[dest] = {};
		//	let init = Game.cpu.getUsed();
			let route = findRoute(room1, room2, options );
			if (route) {
				global.map[dest].routeLength = Object.keys(route).length;
				global.map[dest].route = route;
			//	console.log("route " + JSON.stringify(route));
			} else {
				global.map[dest].routeLength = 50; // FAR ENOUGH AWAY?
			}
		}
		if (destOnly) {
			return global.map[dest].routeLength;
		}
		return global.map[dest].route;
	};


	global.getRoomPortals = function(roomName){
		let returnArray = [];
		if (Memory.portals[roomName]) {
			for (let portal in Memory.portals[roomName]) {
				returnArray.push(portal);
			}
		}
		return returnArray;
	};

	global.HwTunnel = {};
	global.checkForHwTunnelDistance = function(origin, dest){
		let id = origin + dest;
		if (!global.HwTunnel[id]) {
			global.HwTunnel[id] = {};
			global.HwTunnel[id].range = 1000;

			for (let tunnelRoom in HW_TUNNELS) {

				if (!roomsInSameSectorV2(tunnelRoom, origin)) { continue; }

				for (let tunnelExitRoom in HW_TUNNELS[tunnelRoom]) {
					if (!roomsInSameSectorV2(tunnelExitRoom, dest)) { continue; }

					let startRoute = getRouteDistance(origin, tunnelRoom, 0, { restrictDistance: 11 });
					if (!startRoute) { continue }

					let endRoute = getRouteDistance(tunnelRoom, dest, 0, { restrictDistance: 11 });
					if (!endRoute) { continue }

					let range = Object.keys(startRoute).length + Object.keys(endRoute).length 

					if (range < global.HwTunnel[id].range) {
						global.HwTunnel[id].range = range;
						global.HwTunnel[id].tunnelRoom = tunnelRoom;
						global.HwTunnel[id].tunnelDest = HW_TUNNELS[tunnelRoom][tunnelExitRoom].pos;

						global.HwTunnel[id].route = {};
						global.HwTunnel[id].routeToTunnel = {};
							
						for (let room in startRoute) {
							global.HwTunnel[id].route[room] = {};
							global.HwTunnel[id].routeToTunnel[room] = {};
						}
						for (let room in endRoute) {
							global.HwTunnel[id].route[room] = {};
						}
					}
				}
			}
		}

		return global.HwTunnel[id];
	}

	global.checkForPortalDistance = function(origin, dest){
		let id = origin + dest;
		if (!global.portalMap[id]) {
			global.portalMap[id] = {};
			global.portalMap[id].range = 1000;
			for (let portal in Memory.portals) {
				let roomLinearDistancePortal = Game.map.getRoomLinearDistance(origin, portal);
				if (roomLinearDistancePortal > 5) { continue; }
				for (let portalDest in Memory.portals[portal]) {

					//CHECK DEST -> PORTAL
					let routeFromPortalExit
					let idPortalSide = portalDest + dest
					if (!global.portalMap[idPortalSide]) {
						global.portalMap[idPortalSide] = {};

						let roomLinearDistance = Game.map.getRoomLinearDistance(portalDest, dest);						
						if (roomLinearDistance > 7) { continue; }

						routeFromPortalExit = getRouteDistance(portalDest, dest, 0, { restrictDistance: 11 });
						if (!routeFromPortalExit) { continue }
						global.portalMap[idPortalSide].route = routeFromPortalExit;
					} else {
						if (!global.portalMap[idPortalSide].route) { continue; }
						routeFromPortalExit = global.portalMap[idPortalSide].route;
					}
					let rangeFromPortalExit = Object.keys(routeFromPortalExit).length;
					/*
				
					let roomLinearDistance = Game.map.getRoomLinearDistance(portalDest, dest);
					if (roomLinearDistance > 7) { continue; }
					let routeFromPortalExit = getRouteDistance(portalDest, dest, 0, { restrictDistance: 11 });
					if (!routeFromPortalExit) { continue }
					let rangeFromPortalExit = Object.keys(routeFromPortalExit).length;
					*/
					if (routeFromPortalExit && rangeFromPortalExit <= 15) {
						
						// CHECK ORIGIN -> PORTAL	
						let startRoute = getRouteDistance(origin, portal, 0, { restrictDistance: 11 });
						if (!startRoute) { continue }
						let startDist = Object.keys(startRoute).length;
						if (startRoute && startDist <= 10) {					
						//	global.portalMap[id].portal = Memory.portals[portal];

							global.portalMap[id].range = startDist + rangeFromPortalExit;
							global.portalMap[id].originRoom = portal; 
							global.portalMap[id].destRoom = portalDest; 
							
							global.portalMap[id].originPos = Memory.portals[portal][portalDest].pos;
							global.portalMap[id].destPos = Memory.portals[portal][portalDest].destPos;
							global.portalMap[id].route = {};
							
							for (let room in startRoute) {
								global.portalMap[id].route[room] = {};
							}
							for (let room in routeFromPortalExit) {
								global.portalMap[id].route[room] = {};
							}
						//	console.log(JSON.stringify(global.portalMap[id]))
							break;
						}
					}
				}
			}
		}	
		return global.portalMap[id];
	};

	global.requestNuke = function(pos, tick=0, reqNukes=99, nuker=undefined ){
		if (!Memory.nukeLaunches.nukeCounter) { Memory.nukeLaunches.nukeCounter = 0;}

		Memory.nukeLaunches.nukeCounter ++;
		let id = Memory.nukeLaunches.nukeCounter;
		if (!Memory.nukeLaunches[id]) {Memory.nukeLaunches[id] = {}; }
		Memory.nukeLaunches[id] = {};
		Memory.nukeLaunches[id].room = pos.roomName;
		Memory.nukeLaunches[id].pos = posCompress(pos);
		Memory.nukeLaunches[id].startTick = tick || Game.time;
		Memory.nukeLaunches[id].reqNukes = reqNukes;
		if (nuker) {
			Memory.nukeLaunches[id].nuker = nuker.id
			nuker.memory.nukeOrder = tick;
		}
		
	};

	global.roomIsSafeModeCd = function(room){
		if (Memory.rooms[room] && Memory.rooms[room].safeModeCooldown && Memory.rooms[room].safeModeCooldown > Game.time) {
			return Memory.rooms[room].safeModeCooldown - Game.time;
		}
		return 0;
	};

	global.roomIsSafeModed = function(room){
		if (Memory.rooms[room] && Memory.rooms[room].safeModeEnd && Memory.rooms[room].safeModeEnd > Game.time) { 
			let nukeLand = Infinity;
			if (Memory.nukes && Memory.nukes[room] ) {
				for (let id in Memory.nukes[room]) {
					if (Memory.nukes[room].nukes[id] && Memory.nukes[room].nukes[id].ts < nukeLand) {
						nukeLand = Memory.nukes[room].nukes[id].ts;
					}
				}
			}
			let safeModeEnd = Math.min(nukeLand, Memory.rooms[room].safeModeEnd);
			
			return safeModeEnd - Game.time;
		}
		return 0;
	};

	global.roomIsControllerBlocked = function(room){
		
		if (Memory.rooms[room] && 
			Memory.rooms[room].upgradeBlocked &&
			Game.time < Memory.rooms[room].upgradeBlocked
			) {
			return Memory.rooms[room].upgradeBlocked - Game.time;
		}
		return 0;
	}	

	global.registerControllerBlocked = function(room) {
		if (!Memory.rooms[room]) { return }
		Memory.rooms[room].upgradeBlocked = CONTROLLER_ATTACK_BLOCKED_UPGRADE + Game.time;
	}
	

	global.roomIsOnSafeModeCd = function(room){
		if (Memory.rooms[room] && 
			Memory.rooms[room].safeModeEnd && 
			Memory.rooms[room].safeModeEnd + (SAFE_MODE_COOLDOWN-SAFE_MODE_DURATION) > Game.time ) { 
			return Memory.rooms[room].safeModeEnd + (SAFE_MODE_COOLDOWN-SAFE_MODE_DURATION) - Game.time;
		}
		return 0;
	};

	/*
	global.roomIsUpgradeBlocked = function(room){
		if (Memory.rooms[room] && 
			Memory.rooms[room].upgradeBlocked
		){
			return Memory.rooms[room].upgradeBlocked - Game.time;
		} 
		return 0;			

	}*/

	global.playerHasSafemodedRoom = function(playerName){

		if (!Memory.players[playerName] || !Memory.players[playerName].ownedRooms) { return 0}

		for (let roomName in Memory.players[playerName].ownedRooms) {
			if (roomIsSafeModed(roomName)) { return roomIsSafeModed(roomName) }
		}
		return 0;
	}

	global.timeToDepositDespawn = function(room){		
		if (Memory.rooms[room] && Memory.rooms[room].deposit && Memory.rooms[room].deposit &&
			Memory.rooms[room].deposit.timeOut > Game.time) { 
			return Memory.rooms[room].deposit.timeOut - Game.time;
		}
		return 0;
	};

	global.mineralOnCd = function(room, mineralId){		
		if (Memory.rooms[room] && Memory.rooms[room].mineral && Memory.rooms[room].mineral[mineralId] && Memory.rooms[room].mineral[mineralId].cd &&
			Memory.rooms[room].mineral[mineralId].cd > Game.time) { 
			return Memory.rooms[room].mineral[mineralId].cd - Game.time;
		}
		return 0;
	};


	global.getRoomsTraversed = function(fromRoom, toRoom){
		
		if (global.roomtravel[fromRoom] === undefined) {
			global.roomtravel[fromRoom] = {};
			global.roomtravel[fromRoom].destination = {};
		}
		if (global.roomtravel[fromRoom].destination[toRoom] === undefined) {
			global.roomtravel[fromRoom].destination[toRoom] = {};
			global.roomtravel[fromRoom].destination[toRoom].rooms = {};

		//	let route = findRoute(fromRoom, toRoom);
			let route = getRouteDistance(fromRoom, toRoom, 0);
			for (let room in route) {
			//	if (room === fromRoom || room === toRoom) { continue; }
				global.roomtravel[fromRoom].destination[toRoom].rooms[room] = {};			
			}
		}
		return global.roomtravel[fromRoom].destination[toRoom].rooms;
	};
	
	global.clampDirection = function(direction){
        while (direction < 1) direction += 8;
        while (direction > 8) direction -= 8;
        return direction;
	};
	
	// POS COMPRESS
	/*
	global.pad = function(n, width, z) {
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
	};*/

	global.posCompressXY = function(x, y) {
		return x +":"+ y;
	}

	global.posCompress = function(pos) {
		return pos.x +":"+ pos.y;	
	};

	global.posDecompress = function(pos, room) {
		if (!pos) { return; }
		let comp = pos.split(":"); 
		return new RoomPosition(comp[0], comp[1], room);
	};

	global.posDecompressXY = function(pos, roomName) {
		if (!pos) { return; }
		let comp = pos.split(":"); 
		return {x: Number(comp[0]), y: Number(comp[1]), roomName: roomName};
	};

	global.posId = function(pos){
		return pos.x+"-"+pos.y+"-"+pos.roomName;
	}

	global.posSave = function(pos){
		return {x: pos.x, y: pos.y, roomName: pos.roomName }
	}

	global.posSaveStripped = function(pos){
		return {x: pos.x, y: pos.y }
	}

	global.posLoad = function(pos){
		return new RoomPosition(pos.x, pos.y, pos.roomName)	
	}


	// GET EXITS
	global.getExits = function(room) {		
		if (global.exits[room] === undefined) {
			let roomExits = Game.map.describeExits(room);
			global.exits[room] = {};
			global.exits[room].exits = {};
			for(let idx in roomExits) {
				global.exits[room].exits[roomExits[idx]] = {};
            //    if (Memory.rooms[roomCaller].exits[roomExits[name]] === undefined) { Memory.rooms[roomCaller].exits[roomExits[name]] = {} } 
            }
		}
		return global.exits[room].exits;
	};

	global.getClosestSafeExit = function(fromPos) {
		let room = fromPos.roomName;
		let exits = getExits(room);
		let exitTiles = [];
		for (let exit in exits) {
			if (!Memory.rooms[exit] || !Memory.rooms[exit].hostileRoom) {
				let findExit = Game.map.findExit(room, exit)
				let currentExits = Game.rooms[room].find(findExit);
				exitTiles = exitTiles.concat(currentExits);
			}
		}

		let closestExit = fromPos.findClosestByRange(exitTiles, { ignoreCreeps: true });
		if (closestExit) {
			return closestExit;
		} 
	}

	global.getSafePosInExit = function(pos) {
		
		let destRoom;

		let exits = Game.map.describeExits(pos.roomName)
		if (pos.x === 0) {
			destRoom = exits[LEFT]
		} else if (pos.x === 49) {
			destRoom = exits[RIGHT]
		} else if (pos.y === 0) {
			destRoom = exits[TOP]
		} else if (pos.y === 49) {
			destRoom = exits[BOTTOM]
		}

		let dest = pullIdlePosForRoom(destRoom);		
		return dest;
	}

	global.getClosestExitTile = function(fromPos){
		let closestExit = fromPos.findClosestByRange(Game.rooms[fromPos.roomName].find(FIND_EXIT), { ignoreCreeps: true });
		if (closestExit) {
			return closestExit;
		}
	}

		
	global.cumulativeAverage = function(currValue, nextSample, n) {
		if (n === 0) { return nextSample }
		return ((nextSample + (currValue*n)) / (n+1));
	}

	global.performExplode = function(roomName, soft=false, my=false){
		if (Memory.rooms[roomName].explodeRoom) {
			log(roomName + " EXPLODE ROOM! ");
			delete Memory.rooms[roomName].explodeRoom;
			delete Memory.rooms[roomName];			
			requestMemSave();
			return clearRoom(roomName, soft, my);			
		}
		return OK;
	}
	

	global.canClaimForExplode = function(roomName){
		if (Game.rooms[roomName] && (!Game.rooms[roomName].controller || Game.rooms[roomName].controller.owner)) { return false; }
		if (!Memory.explodeTimer || Game.time > Memory.explodeTimer) {
			let myRooms = getMyRooms()
			let availableRooms = Game.gcl.level - Object.keys(myRooms).length
			if (availableRooms >= 3) {
				return true;
			}
		}
		return false;
	}
		
	global.setExplodeTimer = function(){
		Memory.explodeTimer = Game.time + 1;
	}
	

	global.needsCleanUp = function(room) {
		
		if (!global.deconstructMission[room] || global.deconstructMission[room].ts < Game.time) {
			if (!Game.rooms[room]) { return false; }
			global.deconstructMission[room] = {};
			global.deconstructMission[room].ts = Game.time + 200;

			let structures = Game.rooms[room].find(FIND_STRUCTURES, {
				filter: (structure) => {
					return (structure.structureType !== STRUCTURE_ROAD &&
						structure.structureType !== STRUCTURE_CONTROLLER &&
						structure.structureType !== STRUCTURE_PORTAL &&
						structure.structureType !== STRUCTURE_KEEPER_LAIR && 
						structure.structureType !== STRUCTURE_CONTAINER &&
						structure.structureType !== STRUCTURE_EXTRACTOR &&
						structure.structureType !== STRUCTURE_INVADER_CORE &&
						!structure.pos.isNearExit(0) &&
						(!structure.owner || !ALLIES[structure.owner.username])
					);
				}});

			if (structures.length > 0) {
				if (Memory.portals[room] && structures.length <= 1) {
					global.deconstructMission[room].needsClean = false;
				} else {
					global.deconstructMission[room].needsClean = true;
				}
				
			} else {
				global.deconstructMission[room].needsClean = false;
			}
		}
		return global.deconstructMission[room].needsClean;
	};


	global.dirIsNotTowards = function(dir, nextDir){		
		let opposite = Math.abs(dir-nextDir);	
		if (opposite > 1 && opposite < 7) {			
			return true;
		} else {
			return false;
		}
	}

	global.orderCleanUp = function(room){		

		let playerName = getPlayerByRoomName(room)
		if (playerName && playerIsDead(playerName)) { return; }

		Memory.orderWreckers[room] = {};
		Memory.orderWreckers[room].civilian = 1;
		Memory.orderWreckers[room].ts = Game.time + 2000;

		if (!BOT_MODE) {
			Memory.cleanUpRoom[room] = {};
		}
	}

	global.orderDespawn = function(room){		

		let playerName = getPlayerByRoomName(room)
		if (playerName && playerIsDead(playerName)) { return; }
		
		Memory.orderWreckers[room] = {};
		Memory.orderWreckers[room].despawn = 1;		 
		Memory.orderWreckers[room].ts = Game.time + 1250;
	}

	

	global.clampRoomEdges = function(roomPosition) {
		let x, y;
		if (roomPosition.x === 0) { 
			x = 1;
		} else if (roomPosition.x === 49) { 
			x = 48;
		} else {
			x = roomPosition.x;
		}
	
		if (roomPosition.y === 0) { 
			y = 1;
		} else if (roomPosition.y === 49) { 
			y = 48;
		} else {
			y = roomPosition.y;
		}
		return new RoomPosition(x, y, roomPosition.roomName);	
	}



	// COST MATRIX - AVOID SOURCE KEEPERS
	global.avoidSKcreeps = (roomName, matrix, options = {}) => {
	//	let roomName = this.name
	
		if (!matrix) { 
			matrix = getStructureMatrix(roomName, false, options); 			
		}

		if (!roomIsSk(roomName) ) {

			
			if (options.useFutureRoads) {
				matrix = addFutureRoads(roomName, matrix)
			}

			if (roomIsHW(roomName) ) {
				return depositMatrix(roomName, matrix); 
			} else {				
				return avoidSources(roomName, matrix);
			}
		}

	//	if (!matrix) { matrix = new PathFinder.CostMatrix(); }

		let plainCost = options.plainCost || 2;
		let swampCost = options.swampCost || 10;
		let id = roomName + plainCost + ":" + swampCost

		if (global._avoidSKcreeps[id] === undefined) {

			

			let avoids = [];			

			if (Game.rooms[roomName]) {
				let skSpawn = Game.rooms[roomName].find(FIND_HOSTILE_STRUCTURES, {
					filter: (structure) => {
					return (structure.structureType === STRUCTURE_KEEPER_LAIR);
				}}); 
				let sources = Game.rooms[roomName].find(FIND_SOURCES);
				let minerals = Game.rooms[roomName].getMinerals();
				avoids = skSpawn.concat(sources, minerals);
								
				
			} else if (Memory.rooms[roomName] && Memory.rooms[roomName].lairs) {

				avoids = []; 
				for (let idx in Memory.rooms[roomName].lairs) {
					avoids.push(posDecompressXY(Memory.rooms[roomName].lairs[idx], roomName));	// Less likely to run into danger here?
				}

				for (let idx in Memory.rooms[roomName].sources) {
					avoids.push(posDecompressXY(Memory.rooms[roomName].sources[idx].pos, roomName));
				}

				for (let idx in Memory.rooms[roomName].mineral) {
					avoids.push(posDecompressXY(Memory.rooms[roomName].mineral[idx].pos, roomName));
				}
			}

			if (avoids.length > 0) {

				let avoidDist = 5;
				let terrain;
				global._avoidSKcreeps[id] = {};
				global._avoidSKcreeps[id].positions = {};

				for (let avoid of avoids) {

					let avoidPos = normalizePos(avoid);

					let xStart = limit((avoidPos.x) - avoidDist, 0, 49);
					let yStart = limit((avoidPos.y) - avoidDist, 0, 49);
					let xEnd = limit((avoidPos.x) + avoidDist, 0, 49);
					let yEnd = limit((avoidPos.y) + avoidDist, 0, 49);			
					
					for (let x=xStart; x<=xEnd; x++) {
						for (let y=yStart; y<=yEnd; y++) {
							let pos = posCompressXY(x, y);
							terrain = getRoomTerrainAt(x, y, roomName);

							if (terrain === TERRAIN_MASK_WALL) {
								continue;
							}

							let terrainAdd = plainCost;
							if (global._avoidSKcreeps[id].positions[pos] === undefined) {
								global._avoidSKcreeps[id].positions[pos] = 0;
							}

							let currentValue = matrix.get(x, y);
							let subtractRoad = 0;
							if (currentValue === 1) {
								subtractRoad = -2;
							}

							if (terrain === TERRAIN_MASK_SWAMP) {
								if (currentValue !== 1) {
									terrainAdd = swampCost;
								}
							}
						
							if (subtractRoad) {
								global._avoidSKcreeps[id].positions[pos] = 1;
							} else {
								let dist = Math.max(Math.abs(avoidPos.x - x), Math.abs(avoidPos.y - y));
								let distToDangerScore = subtractRoad + terrainAdd + 3 + Math.ceil(Math.pow( (avoidDist - dist), 3.5));
	
								global._avoidSKcreeps[id].positions[pos] = Math.max(global._avoidSKcreeps[id].positions[pos], distToDangerScore);
								global._avoidSKcreeps[id].positions[pos] = Math.min(254, global._avoidSKcreeps[id].positions[pos] )
							}					
							


						}
					}
				}
			}
		} 

		if (global._avoidSKcreeps[id]) {
			for (let pos in global._avoidSKcreeps[id].positions) {
				let position = posDecompress(pos, roomName);
				let currentCost = matrix.get(position.x, position.y);
				if (currentCost === 255) { continue; }
				let newValue = Math.max(currentCost, Math.min(254, global._avoidSKcreeps[id].positions[pos]))

				matrix.update(position.x, position.y, newValue);
				
			}
		}
	//	displayCostMatrix(matrix, roomName)
        return matrix;
	};

	global.normalizePos = function(destination) {
        if ((destination.x === undefined)) {
            return destination.pos;
        }
        return destination;
    }

	// COST MATRIX - AVOID SOURCE KEEPERS
	global.stayCloseToController = (roomName, matrix) => {
		if (!matrix) { matrix = new PathFinder.CostMatrix(); }
		
		if (Game.rooms[roomName] && Game.rooms[roomName].controller) {
			let controller = Game.rooms[roomName].controller
			let loopRange = 3;
			let n = 0; 
			let ret = ulamSpiral(n);			
			while (ret.sq <= loopRange) {
				ret = ulamSpiral(n);
			//	console.log("looping " + n + " range " + ret.sq + "/" + loopRange)
		        n += 1;
		        if (ret.sq <= loopRange) {
			        let x = limit(controller.pos.x + ret.x, 0, 49);
					let y = limit(controller.pos.y + ret.y, 0, 49);
					let position = new RoomPosition(x, y, roomName);
					if (!position.isPassible(true) ) { continue; }

					if (getRoomTerrainAt(position.x, position.y, roomName) === TERRAIN_MASK_SWAMP) {					
						matrix.set(position.x, position.y, 2);
					} else {
						matrix.set(position.x, position.y, 1);
					}
				}
			}
		}
		return matrix;
	}

	// COST MATRIX - AVOID POWER BANKS
	global.depositMatrix = (roomName, matrix) => {
		if (!roomIsHW(roomName) ) { return matrix; }	// nothing to do
		if (!matrix) { matrix = new PathFinder.CostMatrix(); }	
		if (Game.rooms[roomName]) {
			let deposit = Game.rooms[roomName].find(FIND_DEPOSITS);
			for (let pb of deposit) {
				for (let i = 1; i <= 8; i++) {
					let position = pb.pos.getPositionAtDirection(i);
					if (!position.isPassible(true) ) { continue; }
					
					if (getRoomTerrainAt(position.x, position.y, roomName) === TERRAIN_MASK_SWAMP) {					
						matrix.set(position.x, position.y, 15);
					} else {
						matrix.set(position.x, position.y, 10);
					}
				}
			}
		}	
		return matrix;
	}

	global._futureRoads = {}
	global.storeFutureRoads = function(path, sourceId) {

		let pos
		 
		global._futureRoads[sourceId] = {
			ts: Game.time + 400
		}		
		
		let cache = global._futureRoads[sourceId]
		for (let idx in path) {
			pos = path[idx]
			if (cache[pos.roomName] === undefined) { cache[pos.roomName] = {} }
			cache[pos.roomName][posCompress(pos)] = {}
		}
	}

	global.addFutureRoads = (roomName, matrix) => {
		if (!matrix) { matrix = new PathFinder.CostMatrix(); }		

		for (let sourceId in global._futureRoads) {
			if (!global._futureRoads[sourceId][roomName]) { continue; } 

			if (Game.time > global._futureRoads[sourceId].ts) { 
				delete global._futureRoads[sourceId]
				continue;
			}

			log("using future roads " +sourceId)

			for (let posCompressed in global._futureRoads[sourceId][roomName]) {
				let pos = posDecompressXY(posCompressed);
				drawCircle(roomName, pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'});	
				matrix.set(pos.x, pos.y, 1);
			}
			return matrix;
		}
		
	}


	global.avoidSources = (roomName, matrix) => {
		if (!matrix) { matrix = new PathFinder.CostMatrix(); }	

		if (Game.rooms[roomName]) {
			let exclusion = []
			let sources = Game.rooms[roomName].find(FIND_SOURCES);
			exclusion = exclusion.concat(sources);

			if (roomIsSk(roomName) || (Game.rooms[roomName].controller && Game.rooms[roomName].controller.my)) {
				let mineral = Game.rooms[roomName].getMinerals();				
				exclusion = exclusion.concat(mineral)
			}			

			if (SEASONAL_THORIUM) {
				let thorium = Game.rooms[roomName].getThorium();
				if (thorium) {
					exclusion = exclusion.concat([thorium])
				}
			}

			for (let i = 0; i < exclusion.length; i++) {
				
				for (let j = 1; j <= 8; j++) {
					let position = exclusion[i].pos.getPositionAtDirection(j);
					if (!position.isPassible(true) ) { continue; }
					
					let terrain = getRoomTerrainAt(position.x, position.y, roomName)
					if (terrain === TERRAIN_MASK_WALL) {
						continue;
					} else if (terrain === TERRAIN_MASK_SWAMP && !position.lookForStructure(STRUCTURE_ROAD)) {
						matrix.set(position.x, position.y, 15);
					} else {
						matrix.set(position.x, position.y, 10);
					}
				}
			}
		}
		return matrix;
	}
	
	// COST MATRIX - AVOID POWER BANKS
	global.pbMatrix = (roomName, matrix) => {
		if (!roomIsHW(roomName) ) { return matrix; }	// nothing to do
		if (!matrix) { matrix = new PathFinder.CostMatrix(); }	
		if (Game.rooms[roomName]) {
			let powerBanks = Game.rooms[roomName].find(FIND_STRUCTURES, {
				filter: (structure) => {
				return (structure.structureType === STRUCTURE_POWER_BANK);
			}});

			for (let pb of powerBanks) {
				for (let i = 1; i <= 8; i++) {
					let position = pb.pos.getPositionAtDirection(i);
					if (!position.isPassible(true) ) { continue; }
					let currentValue = matrix.get(position.x, position.y)
					if (getRoomTerrainAt(position.x, position.y, roomName) === TERRAIN_MASK_SWAMP) {					
						matrix.set(position.x, position.y, Math.min(255, currentValue+ 15));
					} else {
						matrix.set(position.x, position.y, Math.min(255, currentValue+ 10));
					}
				}
			}
		}	
		return matrix;
	}

	// COST MATRIX - AVOID SOURCE KEEPERS
	global.avoidSKcreepsIgnoreRoads = (roomName, matrix) => {
		//	let roomName = this.name
			
	//	if (!roomIsSk(roomName) ) { return matrix; }	// nothing to do
		if (!matrix) { matrix = new PathFinder.CostMatrix(); }		

	//	let init = Game.cpu.getUsed();
	
		if (Game.rooms[roomName]) {
		//	let avoids = [];
			let avoids = getEnemyCreeps(roomName);
		//	let avoids = hostiles.concat(hostiles);
			
			let avoidDist = 6;
			let matrixCost = 20;
			let terrain;

			let roads = Game.rooms[roomName].find(FIND_STRUCTURES, {
				filter: (structure) => {
				return (structure.structureType === STRUCTURE_ROAD);
			}}); 

			for (let road of roads) {
				matrix.set(road.pos.x, road.pos.y, 0x1);
			}

			for (let avoid of avoids) {
				let xStart = limit(avoid.pos.x - avoidDist, 0, 49);
				let yStart = limit(avoid.pos.y - avoidDist, 0, 49);
				let xEnd = limit(avoid.pos.x + avoidDist, 0, 49);
				let yEnd = limit(avoid.pos.y + avoidDist, 0, 49);			
				
				for (let x=xStart; x<=xEnd; x++) {
					for (let y=yStart; y<=yEnd; y++) {				
						terrain = getRoomTerrainAt(x,y, roomName);					
						if (terrain === TERRAIN_MASK_WALL) {							
							matrix.set(x,y,0xff);
						} else if (terrain === TERRAIN_MASK_SWAMP) {	
							matrix.set(x, y, matrixCost + 5);
						} else {
							matrix.set(x, y, matrixCost);
						}
					}
				}
			}
		}
		return matrix;
	};
	
	// Returns the n-th step along an ulam spiral
	global.ulamSpiral = function(n) {
		// Note - The spiral paths counter-clockwise: (0,0) (0,1) (-1,1) (-1,0) ...
		let p = Math.floor(Math.sqrt(4*n+1));
		let q = n - Math.floor(p*p/4);
		let sq = Math.floor((p+2)/4);
		let x = 0;
		let y = 0;
		if (p % 4 === 0) {
			// Bottom Segment
			x = -sq + q;
			y = -sq;
		} else if (p % 4 === 1) {
			// Right Segment
			x = sq;
			y = -sq + q;
		} else if (p % 4 === 2) {
			// Top Segment
			x = sq - q - 1;
			y = sq;
		} else if (p % 4 === 3) {
			// Left Segment
			x = -sq;
			y = sq - q;
		}

		return {x:x,y:y,sq:sq};
	};

	// Returns an array of 'open' room positions within range of the origin position
	global.getOpenPositions = function(origin_pos, range, opts = {}) {
	    _.defaults(opts,{
	        offset: 0,
	        ignoreIds: [],
	        maxPositions: 9999,
	        avoidEdges: 0,
	        avoidStructures: [STRUCTURE_ROAD],
		//	avoidTerrain: ['wall'],
			avoidTerrain: [TERRAIN_MASK_WALL],
	        avoidCreeps: false,
	        avoidConstructionSites: false,
	    });
	    let open_positions = [];

	    let room_name = origin_pos.roomName;

	    let low_edge  = 0 + opts.avoidEdges;
	    let high_edge = 49 - opts.avoidEdges;

	    let n = opts.offset;
	    let ret = null;
	    let results = [];
	    let res = null;
	    let ch_x = 0;
	    let ch_y = 0;
	    let room = null;
	    let room_pos = null;
	    let has_blocker = false;

	    while (true) {
	        ret = ulamSpiral(n);
	        n += 1;

	        if (ret.sq > range) {
	            break;
	        }

	        ch_x = origin_pos.x + ret.x;
	        ch_y = origin_pos.y + ret.y;

	        if (ch_x < low_edge || ch_x > high_edge) {
	            continue;
	        } else if (ch_y < low_edge || ch_y > high_edge) {
	            continue;
	        }

	        if (opts.avoidTerrain.length > 0) {
				
				if (opts.avoidTerrain.includes(getRoomTerrainAt(ch_x,ch_y,room_name))) {
	                continue;
	            }
	        }

	        room = Game.rooms[room_name];
	        if (room) {// Only make these checks if we have vision!
	            if (opts.avoidStructures.length > 0) {
	                has_blocker = false;
	                results = room.lookForAt(LOOK_STRUCTURES,ch_x,ch_y);
	                for (res of results) {
	                    if (opts.ignoreIds.includes(res.id)) {
	                        continue;
	                    }

	                    if (OBSTACLE_OBJECT_TYPES.includes(res.structureType)) {
	                        has_blocker = true;
	                        break;
	                    } else if (opts.avoidStructures.includes(res.structureType)) {
	                        has_blocker = true;
	                        break;
	                    }
	                }
	                if (has_blocker) {
	                    continue;
	                }
	            }

	            if (opts.avoidCreeps) {
	                has_blocker = false;
	                results = room.lookForAt(LOOK_CREEPS,ch_x,ch_y);
	                for (res of results) {
	                    if (opts.ignoreIds.includes(res.id)) {
	                        continue;
	                    }

	                    has_blocker = true;
	                    break;
	                }
	                if (has_blocker) {
	                    continue;
	                }
	            }

	            if (opts.avoidConstructionSites) {
	                has_blocker = false;
	                results = room.lookForAt(LOOK_CONSTRUCTION_SITES,ch_x,ch_y);
	                for (res of results) {
	                    if (opts.ignoreIds.includes(res.id)) {
	                        continue;
	                    }

	                    has_blocker = true;
	                    break;
	                }
	                if (has_blocker) {
	                    continue;
	                }
	            }
	        }
	        room_pos = new RoomPosition(ch_x,ch_y,room_name);
	        open_positions.push(room_pos);

	        if (open_positions.length >= opts.maxPositions) {
	            break;
	        }
	    }
		    return open_positions;
	};	

	global.getWallLimitMatrixCivilian = (roomName, matrix) => {
	//	console.log(" getWallLimitMatrixV2 " +  roomName);
		if (!Game.rooms[roomName]) { return matrix; }
		matrix = Game.rooms[roomName].wallsLimitV2(matrix, {civilian: 1});
		return matrix;
	};
	
	global.getWallLimitMatrix = (roomName, matrix, options) => {
	//	console.log(" getWallLimitMatrix " +  roomName);
		if (!Game.rooms[roomName]) { return matrix; }

		matrix = Game.rooms[roomName].wallsLimitV2(matrix, options);
		// showMatrix
		if (!Game.rooms[roomName]._displayWallsLimit) {
			Game.rooms[roomName]._displayWallsLimit = 1;
			for (let y = 0; y < 50; y++) {
				for (let x = 0; x < 50; x++) {
					let value = matrix.get(x, y);
					if (value === 0xff) {
						Game.rooms[roomName].visual.circle(x, y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
					} else if (value > 0)  {
						Game.rooms[roomName].visual.text(value  , x, y, {color: 'green', font: 0.8});									
					}
				}							
			}
		}
		return matrix;
	};

	global.getBodyparts = function(creeps, type){
		let count = 0;
		let length = creeps.length;
		for (let i=0; i < length; i++) { 
			let length_body = creeps[i].body.length;
			for (let n=0; n < length_body; n++) { 
				if (creeps[i].body[n].type === type) {
					count++;
				}
			}
		}
		return count;
	};
	
	global.countBodyparts = function(body, type){
		let count = 0;
		for (let n=0; n < body.length; n++) { 
			if (body[n] === type) {
				count++;
			}
		}
		return count;
	};
	global.healerFindDefender = function(defenders){
		let length = defenders.length;
		for (let idx = 0; idx < length; idx++) {
			console.log("checking " + defenders)

			if (!defenders[idx].memory.healer || !Game.creeps[defenders[idx].memory.healer]) {
			//	console.log("returning " + defenders[idx].name + " in room " + defenders[idx].room.name)
				return defenders[idx].name;
			}
		}
	};

	global.healerFindSquadMate = function(defenders, id){
		let length = defenders.length;
		for (let idx = 0; idx < length; idx++) {
			if (defenders[idx].memory.sqaudId === id) {				
				return defenders[idx].name;
			}
		}
	};

	/**
	 * global.hasRespawned()
	 * 
	 * @author:  SemperRabbit
	 * @version: 1.0
	 * @date:    180331
	 * @return:  boolean whether this is the first tick after a respawn or not
	 * 
	 * The checks are set as early returns in case of failure, and are ordered
	 * from the least CPU intensive checks to the most. The checks are as follows:
	 * 
	 *      If it has returned true previously during this tick, return true again
	 *      Check Game.time === 0 (returns true for sim room "respawns")
	 *      There are no creeps
	 *      There is only 1 room in Game.rooms
	 *      The 1 room has a controller
	 *      The controller is RCL 1 with no progress
	 *      The controller is in safemode with the initial value
	 *      There is only 1 StructureSpawn
	 *
	 * The only time that all of these cases are true, is the first tick of a respawn.
	 * If all of these are true, you have respawned.
	 */
	global.hasRespawned = function hasRespawned(){
		// check for multiple calls on same tick    
		if(Memory.respawnTick && Memory.respawnTick === Game.time)
		return true;

		// server reset or sim
		if(Game.time === 0){
		Memory.respawnTick = Game.time;
		return true;
		}

		// check for 0 creeps
		if(Object.keys(Game.creeps).length)
		return false;

		// check for only 1 room
		let rNames = Object.keys(Game.rooms);
		if(rNames.length !== 1)
		return false;

		// check for controller, progress and safe mode
		let room = Game.rooms[rNames[0]];
		if(!room.controller || !room.controller.my || room.controller.level !== 1 || room.controller.progress ||
		!room.controller.safeMode || room.controller.safeMode !== SAFE_MODE_DURATION-1)
		return false;

		// check for 1 spawn
		if(Object.keys(Game.spawns).length !== 0)
		return false;

		// if all cases point to a respawn, you've respawned
		Memory.respawnTick = Game.time;
		return true;
	}

		
};