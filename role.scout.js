'use strict'
let roleScout = {

    /** @param {Creep} creep **/
    run: function(creep) {
		
		if (creep._memory[C.ROOM_TARGET] == creep.pos.roomName) {			
			delete creep._memory[C.ROOM_TARGET] 
		}

		let site;

        if (creep._memory[C.ROOM_TARGET] === undefined) {

			// STOMP CONSTRUCTION SITES
			if (!roomIsSafeModed(creep.room.name) && creep.room.controller && creep.room.controller.owner) {
				site = creep.getHostileConstructionSite();
				if (site) {
					creep._memory.stompSite = site.id;
				}
			}
			
			if (creep._memory.initRooms === undefined) {
				creep._memory.initRooms = [];
				let exits = getExits(creep.pos.roomName);

				for (let exit in exits) {
					if (Memory.rooms[exit] === undefined && creep._memory.blacklist[exit] == undefined && !creep._memory.prevRoom !== exit) {
						creep._memory.initRooms.push(exit);
					}
				}
			}

			// Make sure to scout every exit at start
			if (creep._memory.initRooms) {

				for (let idx = creep._memory.initRooms.length-1; idx >= 0; idx--) {
					let roomName = creep._memory.initRooms[idx];
					if (Game.rooms[roomName] || Memory.rooms[roomName] || creep._memory.blacklist[roomName]) { 
						creep._memory.initRooms.splice(idx, 1);	
						continue; 
					}

					requestRoomVision(roomName);
				//	log("scout wants to init explore " + roomName, "green")
				}
			}
		
			
			delete creep._memory.dest;

			if (!site) {
				if (global.requestRoomsVis){
					if (global.requestRoomsVis[creep.room.name]) {
						creep.say("scanning!");
						if (creep.pos.getRangeTo(creep.room.controller) > 2) {
							creep.travelTo(creep.room.controller, {range:2, maxRooms: 1, offRoad: true});
						}
						delete global.requestRoomsVis[creep.room.name];
						return;
					} else {
						for (let destRoom in global.requestRoomsVis) {							
							if (destRoom && !Game.rooms[destRoom]) {
								if (Game.map.getRoomLinearDistance(creep.room.name, destRoom) > 6) { continue; }
								let scout = Game.getObjectById(global.requestRoomsVis[destRoom].scout)
								if (scout) { continue; }
								let routeLength = getRouteDistanceOnly(creep.room.name, destRoom);
								if (routeLength < 6) {	
									creep._memory[C.ROOM_TARGET] = destRoom;
									log(creep + " scout fulfiling request room vision " + destRoom)
									return;
								}
							}
						}
					}
				}				
				
				if (creep._memory[C.ROOM_TARGET] === undefined) {

					let possibleDestinations = [];
					let weightedDestinations = [];
					creep._memory.oldResult = 0;

					let exits = getExits(creep.pos.roomName);

					for (let exit in exits) {
						if (Memory.rooms[exit] === undefined && creep._memory.blacklist[exit] == undefined && !creep._memory.prevRoom !== exit) {
							weightedDestinations.push(exit);							
						}
					}

					if (weightedDestinations.length === 0) {

						if (roomIsCenter(creep.room.name)) {
							let portals = getRoomPortals(creep.room.name);
							possibleDestinations = possibleDestinations.concat(portals);
						}				
						possibleDestinations = possibleDestinations.concat(Object.keys(exits));


						for (let idx in possibleDestinations) {
							let room = possibleDestinations[idx];
							if (creep._memory.blacklist[room]) { continue; }
							
							weightedDestinations.push(room);
							if (!Memory.rooms[room] && creep._memory.prevRoom !== room) { 
								weightedDestinations.push(room); 
								weightedDestinations.push(room);
								weightedDestinations.push(room);
							}
							if (creep.room.memory.numberOfTowers > 0) {	// if entered hostile room, prefer to go back
								if (room == creep._memory.prevRoom) { 
									weightedDestinations.push(room) 
									weightedDestinations.push(room)
								}
							} else {
								if (room !== creep._memory.prevRoom) { 
									weightedDestinations.push(room);
									weightedDestinations.push(room);
								}
								if (!Game.rooms[room]){
									weightedDestinations.push(room);
								}
							}
						}
					}

					let exitsTotal = weightedDestinations.length;				
					let randomExit = Math.floor((Math.random() * exitsTotal));
					creep._memory[C.ROOM_TARGET] = weightedDestinations[randomExit];
				}
				
				if (roomIsHW(creep.room.name) && !isRoomAvailableV2(creep._memory[C.ROOM_TARGET]) ) {
					
					creep._memory.blacklist[creep._memory[C.ROOM_TARGET]] = 1;
					delete creep._memory[C.ROOM_TARGET];
				}
			}
		}

		
		

		if (global.requestRoomsVis && global.requestRoomsVis[creep._memory[C.ROOM_TARGET]]) {
			global.requestRoomsVis[creep._memory[C.ROOM_TARGET]].scout = creep.id;
		}
		
		if (creep._memory.stompSite !== undefined) {				
			site = Game.getObjectById(creep._memory.stompSite);

			if (roomIsSafeModed(creep.room.name)) {
				delete creep._memory.stompSite;
			} else if (!site) {
				delete creep._memory.stompSite; 
				// STOMP CONSTRUCTION SITES
				site = creep.getHostileConstructionSite();
				if (site) {
					creep._memory.stompSite = site.id;
					creep.travelTo(site.pos, {range:0, maxRooms: 1, offRoad: true});
				}
			} else {
				creep.room.visual.circle(site.pos.x, site.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
				creep.travelTo(site.pos, {range:0, maxRooms: 1, offRoad: true});
			}
		} else { 
			// Move to next room
			if (creep._memory.oldResult === undefined) {creep._memory.oldResult = 0 }
			if (!creep._memory[C.ROOM_TARGET]) { return; }
			let dest;
			if (!creep._memory.dest) {				
				dest = pullIdlePosForRoom(creep._memory[C.ROOM_TARGET]);
				creep._memory.dest = posCompress(dest);				
			} else {
				dest = posDecompressXY(creep._memory.dest, creep._memory[C.ROOM_TARGET]);
			}
			creep._memory.prevRoom = creep.room.name;
			let result = creep.travelTo(dest, {range:20, roomCallback: avoidSKcreeps, ensurePath: true, offRoad: true, maxOps: 50000});	
		//	console.log("scout result " + result + " " + creep._memory.oldResult)
			if (result < 0 ) { 
				log("scout result " + result + " " + creep._memory.oldResult + " dest " + dest)
				creep._memory.oldResult++ 
			}
			
			if (creep._memory.oldResult > 2) {
				log("scout blacklisting room " + creep._memory[C.ROOM_TARGET])
				creep._memory.oldResult = 0;
				creep._memory.blacklist[creep._memory[C.ROOM_TARGET]] = 1;
				delete creep._memory[C.ROOM_TARGET];
			}
		}	
        
	}
};



module.exports = roleScout;