'use strict'
/**
 * To start using Traveler, require it in main.js:
 * Example: let Traveler = require('Traveler.js');
 */

class Traveler {
    /**
     * move creep to destination
     * @param creep
     * @param destination
     * @param options
     * @returns {number}
     */
    static travelTo(creep, destination, options = {}) {
                
        if (creep._is_pushed) { // ADDED GG MOVED BY moveAllCreepsOnPath            
            return ERR_BUSY; 
        } 
        if (creep._swapped === Game.time) { 
            creep.say("swp")
            return ERR_BUSY 
        }
    //    this.updateRoomStatus(creep.room);       // moved to ai.roomData 
       
        if (!destination) {
            return ERR_INVALID_ARGS;
        }
       
        if (creep.fatigue > 0) {
            Traveler.circle(creep.pos, "aqua", 0.3);
            creep._cache.travTick = Game.time;
            creep._cache.fatigue = Game.time
            return ERR_BUSY;
        }
        destination = this.normalizePos(destination);

        // manage case where creep is nearby destination
        let rangeToDestination = creep.pos.getRangeTo(destination);

        if (options.range && rangeToDestination <= options.range) {
            return OK;
        } else if (rangeToDestination <= 1 && ( options.range === undefined || options.range === 1 )) {   
        //    console.log("rangeToDestination /"+)         
            if (rangeToDestination === 1 && !options.range) {
                let direction = creep.pos.getDirectionTo(destination);
                if (options.returnData) {
                    options.returnData.nextPos = destination;
                    options.returnData.nextDir = direction;
                    options.returnData.path = direction.toString();
                }
                return creep.move(direction);
            }
            return OK;
        }

        // initialize data object
        if (!creep._cache._trav) {
            creep._cache._trav = {};
        }

        let travelData = creep._cache._trav;
        let state = this.deserializeState(travelData, destination);

        /*
        if (creep._memory[C.WAGON_WEIGHT]) {
            this.serializeState(creep, destination, state, travelData);
            return OK; 
        } */
        
            // do nothing)
        // uncomment to visualize destination
        // this.circle(destination.pos, "orange");
        // check if creep is stuck
        if (!options.stuckValue) {
            options.stuckValue = DEFAULT_STUCK_VALUE;
        }
        let movedBlockingCreep;
        let repath; 

        creep._cache.travTick = Game.time;

        let fatigue = creep.fatigue;
        if (options.phalanxCreeps) {
            for (let idx in options.phalanxCreeps) {
                let other = options.phalanxCreeps[idx]
                fatigue = fatigue || other.fatigue;
            }
        }



        if (this.isStuck(creep, state) && !fatigue && travelData.path) {

            
            Traveler.circle(creep.pos, "orange", state.stuckCount * 0.2);
            state.stuckCount++;


            if (options.phalanx) {
             

                if (state.stuckCount >= options.stuckValue) {

                
                    let nextDirection = creep.getNextDirFromPath();                
                    log("phalnx stuck " + nextDirection)

                    if (nextDirection !== undefined) {
                        let nextPos = creep.pos.getPositionAtDirectionWrapToNextRoom(nextDirection);
                        creep.room.visual.circle(nextPos.x, nextPos.y, { fill: 'transparent', radius: 0.50, stroke: 'black' });
                        let formations = getPhalanxFormation(nextPos);
                        
                        let blockers = getBlockersforPhalanxFormation(options.phalanx, formations)
                        if (formations.length < 4 || blockers.length > 0) {
                            console.log("stuck no phalanx formation next pos " + nextPos)
                        
                            let wantedRange = options.range || 1;
                    //     if (options.phalanx && creep.pos.phalanxGetRangeTo(destination) <= options.range + 1) {                           
                                // find nearby valid phalanx formation

                                let randomDir = Math.ceil(Math.random() * 8)
                                log("random dir " + randomDir)
                                nextPos = creep.pos.getPositionAtDirectionWrapToNextRoom(randomDir);

                                formations = getPhalanxFormation(nextPos);                    
                                blockers = getBlockersforPhalanxFormation(options.phalanx, formations)
                                if (formations.length >= 4 && blockers.length === 0) {
                                    travelData.path = randomDir.toString()
                                    log("phalanx moving in random dir " + randomDir)
                                }


                    //     } else {
                        //        delete travelData.path;
                        //    }
                        //   return ERR_NO_PATH;
                        }
                    }
                }


            } else {

                state.stuckCount++;

                let trySwap = 0;
                let nextDirection = parseInt(travelData.path[0], 10);
                let nextPosition = creep.pos.getPositionAtDirection(nextDirection)
                let blockingCreep = nextPosition.lookForAnyCreep();

                if (!blockingCreep && !nextPosition.isPassible(true, true)) {
                //    delete travelData.path;
                    log(creep + " moving to blocked pos! " + nextPosition)
                    creep.say("lost pth!");
                    repath = true;
                } else {
                    let blockingIsIdle;
                    let blockingIsFatCreep;
                    if (blockingCreep && blockingCreep.my) {
                        if (!blockingCreep._cache.travTick || blockingCreep._cache.travTick < global.lastTick) {
                            blockingIsIdle = true;
                        }

                        if (!creep._cache.fatigue && blockingCreep._cache.fatigue >= Game.time - 10) {
                            blockingIsFatCreep = true;                         
                        }
                    }
        
                    if (state.stuckCount >= options.stuckValue || blockingIsIdle || blockingIsFatCreep || creep.isCombatCreep() ) {
                        if (blockingCreep && blockingCreep.my) {
                            if (creep._memory.labrat && Math.random() > 0.1 ) {
                                trySwap = 1;
                                creep.say("labrat!");
                            } else if (creep.isCombatCreep()) {
                                if (!blockingCreep.isCombatCreep() && Math.random() > 0.5 ) {
                                    trySwap = 1;
                                    creep.say("combat!");
                                } else if (state.stuckCount > (options.stuckValue-2) && Math.random() > 0.5) {
                                    trySwap = 1;
                                    creep.say("Me First!");
                                }
                            } else if ((blockingIsIdle || blockingIsFatCreep) && Math.random() > 0.25) {
                                trySwap = 1;
                                creep.say("idle block!");
                                
                            } else {
                                if (state.stuckCount > options.stuckValue &&
                                    !blockingCreep.isCombatCreep() &&
                                    Math.random() > 0.5) {
                                    trySwap = 1;
                                    creep.say("Move!");
                                }
                            }
        
                            if (trySwap) {
                                
                                if (!blockingCreep.fatigue)  {
                                    state.stuckCount = 0;
                                    if (Math.random() > 0.95 || blockingCreep._memory[C.WAGON_WEIGHT]) {
                                        repath = true;
                                    } else if (Math.random() > 0.85 || creep.memory[C.ROLE] === "engine") {
                                        blockingCreep.nudgeOutOfMyWay(creep.pos);
                                        blockingCreep._swapped = Game.time;
                                    } else if (blockingCreep._memory[C.BOOSTED] && !creep._memory[C.BOOSTED] && !creep._memory.labrat && Math.random() > 0.1) {  // do not attempt to force move creeps with boosts
                                        creep.say("Pardon sir!");
                                        repath = true;
                                    } else if (blockingCreep.nudgeTowardsTarget(creep.pos) ) {
                                        blockingCreep._swapped = Game.time;
                                        movedBlockingCreep = OK;
                                    } else {
                                        let blockDirection = blockingCreep.pos.getDirectionTo(creep.pos)
                                        movedBlockingCreep = blockingCreep.move(blockDirection);                             
                                        blockingCreep._swapped = Game.time;
                                    }
                                    
                                    creep.room.visual.line(creep.pos, blockingCreep.pos, { color: "red", lineStyle: "solid" });
                                    
                                    if (movedBlockingCreep === OK) {

                                        
                                        if (blockingCreep._cache._trav && blockingCreep._cache._trav.path) {
                                            delete blockingCreep._cache._trav.path;
                                            //   let reverse = (blockDirection + 4) % 8;  
                                            //   log("adding to reverserd path " + reverse)
                                            //  log("old path " + JSON.stringify(blockingCreep._cache._trav.path))
                                            //  blockingCreep._cache._trav.path = reverse + blockingCreep._cache._trav.path;

                                            //  log("new path " + JSON.stringify(blockingCreep._cache._trav.path))
                                        }

                                        creep.move(nextDirection);
    
                                        if (options.returnData) {
                                            options.returnData.nextPos = Traveler.positionAtDirection(creep.pos, nextDirection);
                                            options.returnData.nextDir = nextDirection;
                                            
                                        }
                                        
                                        return OK;
                                    }                                    
                                } 
                            }
                        }   
                    }
                }                
            }                     
        }
        else {
            state.stuckCount = 0;
        }

        // handle case where creep is stuck        
        if (movedBlockingCreep !== OK &&
            (state.stuckCount >= options.stuckValue && Math.random() > 0.5) || repath) {
            if (!creep.fatigue) {
                options.ignoreCreeps = false;
                options.freshMatrix = true;
                creep.say("new Path")
                delete travelData.path;
                state.stuckCount = 0;
                options.showPath = true;
            } else {
                state.stuckCount = 0;
                creep.say("tired!")
            }
        }
        // TODO:handle case where creep moved by some other function, but destination is still the same
        // delete path cache if destination is different
        if (!this.samePos(state.destination, destination)) {

            if (options.movingTarget && getRangeXY(state.destination.x, state.destination.y, destination.x, destination.y) <= 1) {
                travelData.path += getDirectionFromTo(state.destination, destination);
                state.destination = destination;
            }
            else {
                delete travelData.path;
            }
        }

        /*
        if (options.repath && Math.random() < options.repath) {
            // add some chance that you will find a new path randomly
            delete travelData.path;
        }*/

        // pathfinding
        let newPath = false;
        if (!travelData.path) {
            newPath = true;
            if (creep.spawning) {
                return ERR_BUSY;
            }
            state.destination = destination;
            let cpu = Game.cpu.getUsed();

            if (state.cpu > REPORT_CPU_THRESHOLD && !creep.powers && !options.phalanx && !creep._memory[C.BOOSTED] && creep._memory[C.ROLE] !== 'defender') {                
                // see note at end of file for more info on this
                console.log(`TRAVELER: heavy cpu use: ${creep.name}, cpu: ${state.cpu} origin: ${creep.pos}, dest: ${destination}`);
                if(!creep._memory.timeOutTravel || Game.time > creep._memory.timeOutTravel){

                    creep._memory.timeOutTravel = Game.time + 10;
                    console.log(`TRAVELER: suspending pathfinding for : ${creep.name} `);
                    return;
                } else if (Game.time < creep._memory.timeOutTravel) {
                    console.log(`TRAVELER: creep on timeout : ${creep.name} `);
                    return;
                }
            }

            let offRoadId = "0";
            if (options.offRoad) { offRoadId = "1"; }
            let ignoreRoadId = "0";
            if (options.ignoreRoads) { ignoreRoadId = "1"; }
           
            
            // ADD PATH CAHCING ON GLOBAL 
            let pathIdentifier = roomPositionIdentifier(creep.pos) + roomPositionIdentifier(destination)+":"+options.range  + ":" + offRoadId + ignoreRoadId;// + ":" +options.roomCallback.;
            
            let ret;
            let color = "orange";
            let path;
            if (options.ignoreCreeps == false || 
                options.ensurePath || 
                options.freshMatrix || 
                global.pathOptimizer[pathIdentifier] === undefined
            ) {
            //    (global.pathOptimizer[pathIdentifier].ts && global.pathOptimizer[pathIdentifier].ts < Game.time)) {           
                ret = this.findTravelPath(creep.pos, destination, options);
                let serializedPath = Traveler.serializePath(creep.pos, ret.path, color, options.showPath);
                travelData.path = serializedPath;
                Traveler.circle(creep.pos, "orange", 0.3);
                if (options.ignoreCreeps &&
                    (Game.cpu.getUsed() - cpu) > 0.05
                ){
                    global.pathOptimizer[pathIdentifier] = {}
                    global.pathOptimizer[pathIdentifier].incomplete = ret.incomplete;
                    global.pathOptimizer[pathIdentifier].path = serializedPath;
                    global.pathOptimizer[pathIdentifier].ts = Game.time;
                    global.pathOptimizer[pathIdentifier].cnt = 1;
                    global.pathOptimizer[pathIdentifier].cpuUsed = Game.cpu.getUsed() - cpu;
                    Traveler.circle(creep.pos, "blue", 0.5);
               //     console.log(creep + " "+  creep.room.name + " storing path! "+ global.pathOptimizer[pathIdentifier].path.length + " cpu used " + global.pathOptimizer[pathIdentifier].cpuUsed )  
                }
            } else {
                global.pathOptimizer[pathIdentifier].cnt++;
                Traveler.circle(creep.pos, "green", 0.3);
                
                travelData.path = global.pathOptimizer[pathIdentifier].path;
            //    let cpuUsed = Game.cpu.getUsed() - cpu;
            //    console.log(creep + " "+  creep.room.name + " reused path! " + global.pathOptimizer[pathIdentifier].cnt + " times, cpu used " + cpuUsed.toFixed(2) + " / " + global.pathOptimizer[pathIdentifier].cpuUsed.toFixed(2) + " id " + pathIdentifier );
            }
            

            let cpuUsed = Game.cpu.getUsed() - cpu;
            state.cpu = _.round(cpuUsed + state.cpu);
            
            if (options.returnData) {                
                options.returnData.pathfinderReturn = ret;                
            }
        //    travelData.path = Traveler.serializePath(creep.pos, ret.path, color);
            state.stuckCount = 0;
            
        }

        this.serializeState(creep, destination, state, travelData);
        if (!travelData.path || travelData.path.length === 0) {
            return ERR_NO_PATH;
        }

        if (options.phalanx) {
        //    let nextDirection = creep.getNextDirFromPath()

            let nextDirection
            if (state.stuckCount === 0 && !newPath && travelData.path.length > 1) {
                nextDirection = parseInt(travelData.path[1], 10);   // path not yet consumed!
            } else {
                nextDirection = parseInt(travelData.path[0], 10);
            }

            if (nextDirection !== undefined) {
                let nextPos = creep.pos.getPositionAtDirectionWrapToNextRoom(nextDirection);
                creep.room.visual.text("N" , nextPos, {color: "blue", font: 0.8});

                let formations = getPhalanxFormation(nextPos);
                let blockers = getBlockersforPhalanxFormation(options.phalanx, formations)
                if (formations.length < 4 || blockers.length > 0) {
                    console.log("no phalanx formation next pos " + nextPos + " blockers " +blockers.length + " formations " + formations.length)
                    return ERR_BUSY;                        
                } else if (nextPos.phalanxChecCriticalDmgNextStep(options.phalanxCreeps, nextDirection) ) {
                    log("phalanx formation next pos critical damage " + nextPos)
                    return ERR_BUSY;
                }

            }
        } else if (options.snake) {
            let nextDirection
            if (state.stuckCount === 0 && !newPath && travelData.path.length > 1) {
                nextDirection = parseInt(travelData.path[1], 10);   // path not yet consumed!
            } else {
                nextDirection = parseInt(travelData.path[0], 10);
            }

            if (nextDirection !== undefined) {
                let nextPos = creep.pos.getPositionAtDirectionWrapToNextRoom(nextDirection);

                if (nextPos.phalanxChecCriticalDmgNextStep(options.snakeCreeps, nextDirection) ) {
                    log("snake formation next pos critical damage " + nextPos)
                    state.stuckCount = 0;
                    return ERR_BUSY;
                }
            }
        }

        
        if (creep._memory[C.WAGON_WEIGHT]) {
            return;
        }

        // consume path
        if (state.stuckCount === 0 && !newPath) {  
            travelData.path = travelData.path.substring(1);
        }

        let nextDirection = parseInt(travelData.path[0], 10);




        
        if (options.returnData) {
            if (nextDirection) {
                let nextPos = creep.pos.getPositionAtDirectionWrapToNextRoom(nextDirection);
                if (nextPos) {
                    options.returnData.nextPos = nextPos;
                    options.returnData.nextDir = nextDirection;
                }
            }
            options.returnData.state = state;
            options.returnData.path = travelData.path;
        }

        if (creep._memory[C.WAGON_WEIGHT]) { 
        } else {
            return creep.move(nextDirection);
        }
        
    }

    /**
     * make position objects consistent so that either can be used as an argument
     * @param destination
     * @returns {any}
     */
    static normalizePos(destination) {
        if ((destination.x === undefined)) {
            return destination.pos;
        }
        return destination;
    }
    /**
     * check if room should be avoided by findRoute algorithm
     * @param roomName
     * @returns {RoomMemory|number}
     */
    static checkAvoid(roomName) {
        if (Memory.rooms[roomName] && Memory.rooms[roomName].avoid) {
            if (Game.time > Memory.rooms[roomName].avoid) {
                delete Memory.rooms[roomName].avoid;
                return false;
            }
            return true;
        }
        return false;
    }
    /**
     * check if a position is an exit
     * @param pos
     * @returns {boolean}
     */
    static isExit(pos) {
        return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
    }
    /**
     * check two coordinates match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static sameCoord(pos1, pos2) {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }
    /**
     * check if two positions match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static samePos(pos1, pos2) {
        return this.sameCoord(pos1, pos2) && pos1.roomName === pos2.roomName;
    }
    /**
     * draw a circle at position
     * @param pos
     * @param color
     * @param opacity
     */
    static circle(pos, color, opacity) {
       Game.rooms[pos.roomName].visual.circle(pos, {
            radius: 0.45, fill: "transparent", stroke: color, strokeWidth: 0.15, opacity: opacity
        });
    }
    /**
     * update memory on whether a room should be avoided based on controller owner
     * @param room
     */
    static updateRoomStatus(room) {
        if (!room) {
            return;
        }
        if (room.controller) {			         
            if (room.controller.owner && !room.controller.my) { 
                let towers = room.findByType(STRUCTURE_TOWER);
                if (towers.length > 0 || roomIsSafeModed(room.name) > 1000) {
				    room.memory.avoid = Game.time + 5000;
                } else {
                    delete room.memory.avoid;
                }
            }
            return;
        } 

    }
    /**
     * find a path from origin to destination
     * @param origin
     * @param destination
     * @param options
     * @returns {PathfinderReturn}
     */
	
		
    static findTravelPath(origin, destination, options = {}) {
        _.defaults(options, {
            ignoreCreeps: true,
            maxOps: DEFAULT_MAXOPS,
            range: 1,
        });
        if (options.movingTarget) {
            options.range = 0;
        }
        origin = this.normalizePos(origin);
        destination = this.normalizePos(destination);
    
        let originRoomName = origin.roomName;
        let destRoomName = destination.roomName;
		
		
        
        if (options.shard !== undefined && Game.shard.name !== options.shard) {
            let shardPortal = findInterShardPortal(options.shard, originRoomName, destRoomName);
            if (shardPortal && shardPortal.originPos) {
                destination = posDecompress(shardPortal.originPos, shardPortal.originRoom);
                destRoomName = shardPortal.originRoom;
                options.range = 0;
                options.allowPortal = 1;
            } else {
                console.log("traveler found no valid intershard portals to " + options.shard + " " + destination)
            }
        }

        // check to see whether findRoute should be used
        let roomDistance = getRoomLinearDistance(originRoomName, destRoomName);
        let allowedRooms = options.route;
        let usedFindRoute = false;
        if (!allowedRooms && (options.useFindRoute || (options.useFindRoute === undefined && 
                (roomDistance > 2 || (HIGHWAY_WALLS && !posInSameSector(origin, destination)) )))
        ){
           
            usedFindRoute = true;
            let foundPortal = false;
            if (roomDistance > 5) {    // ADDED GG, USE PORTALS
                let portal = checkForPortalDistance(originRoomName, destRoomName);
                //   console.log(" findTravelPath checking portals " + portal)
                if (portal && portal.range < roomDistance) {

                //    console.log("Traveler using portal! " + portal.originRoom + " to " + portal.destRoom + " dest " + destination+ " portal range "+ portal.range + " linear range " + roomDistance);

                    destination = posDecompress(portal.originPos, portal.originRoom);
                    destRoomName = portal.originRoom;
                    options.range = 0;
                    options.allowPortal = 1;
                    options.freshMatrix = true;
                    foundPortal = true; 
                }
            }

            if (HIGHWAY_WALLS && !foundPortal && !roomIsHW(destRoomName) && !posInSameSector(origin, destination) && !options.denyTunnel) {
            
                let tunnel = checkForHwTunnelDistance(originRoomName, destRoomName)
                if (tunnel && tunnel.range < 25) {    
                    usedFindRoute = true;
                    console.log("traveler using tunnel! origin " + origin + " dest " + destination + " via tunnel in " + tunnel.tunnelRoom)
                    destination = posDecompress(tunnel.tunnelDest, tunnel.tunnelRoom);
                    destRoomName = tunnel.tunnelRoom;
                    options.range = 0;
                    options.freshMatrix = true;
                    allowedRooms = tunnel.routeToTunnel;
                }
            }

            if (!allowedRooms) {
                let route = this.findRoute(originRoomName, destination.roomName, options);
                if (route) {
                    allowedRooms = route;
                }
            }
        } 
        
        options.plainCost = options.offRoad ? 1 : options.ignoreRoads ? 1: options.roadPlan ? ROAD_PLAINCOST : 2;
        options.swampCost = options.offRoad ? 1 : options.ignoreRoads ? 5: options.roadPlan ? ROAD_SWAMPCOST : 10;



        let roomsSearched = 0;
        let callback = (roomName) => {
            if (allowedRooms) {
                if (!allowedRooms[roomName]) {
                    return false;
                }
            }
            else if (!options.allowHostile && Traveler.checkAvoid(roomName) &&
                    roomName !== destRoomName && roomName !== originRoomName) {
                return false;
            }
            roomsSearched++;
            let matrix;
            let room = Game.rooms[roomName];
            if (room) {
                if (options.ignoreStructures) {
                    matrix = new PathFinder.CostMatrix();
                    if (!options.ignoreCreeps) {
                        Traveler.addCreepsToMatrix(room, matrix);
                    }
                }
                else if (options.ignoreCreeps || roomName !== originRoomName) {
                    matrix = this.getStructureMatrix(room, options.freshMatrix, options);
                }
                else {
                    matrix = this.getCreepMatrix(room, options);
                }
            } else {
                matrix = this.getOfflineStructureMatrix(roomName, options);
            }

            // ADDED GG
            if (options.moveAsOne) {
                if (!matrix) {
                    matrix = new PathFinder.CostMatrix();
                }
                if (options.moveAsOne.pos) {
                    matrix.update(options.moveAsOne.pos.x, options.moveAsOne.pos.y, 0);	
                }
            }
            
            if (options.obstacles) {
             //   matrix = matrix.clone();
                for (let obstacle of options.obstacles) {
                    destination = this.normalizePos(obstacle);
                    if (destination.roomName !== roomName) {
                        continue;
                    }
                    matrix.update(destination.x, destination.y, 0xff);
                }
            }
            
            // ADDED GG
            if (options.costMatrix) {

                if (!matrix) {
                    matrix = new PathFinder.CostMatrix();
                }
                    
                for (let y = 0; y < 50; y++) {   
                    for (let x = 0; x < 50; x++) {
                        let value = options.costMatrix.get(x, y);
                        if (value > 0) {
                            matrix.update(x, y, value);
                        }
                    }
                }
            }

            // avoid unpathable room exits if outside this room            
            if (options.phalanx && roomName !== originRoomName) {
                if (Memory.rooms[roomName] && Memory.rooms[roomName].avoidExit) {
                    for (let exit in Memory.rooms[roomName].avoidExit) {
                        
                        if (!Memory.rooms[roomName].avoidExit[exit].pos) { continue; }
                        let blocked = packrat.unpackPosList(Memory.rooms[roomName].avoidExit[exit].pos)
                        for (let idx in blocked) {
                            matrix.update(blocked[idx].x, blocked[idx].y, 255);
                        }
                    }
                }
            }


            if (options.roomCallback) {	
                
            //    let outcome = options.roomCallback(roomName, matrix.clone(), options);      
                let outcome = options.roomCallback(roomName, matrix.clone(), options);
                if (outcome !== undefined) {
                    return outcome;
                }
            }
            return matrix;
        };


        let ret = PathFinder.search(origin, { pos: destination, range: options.range }, {
            maxOps: options.maxOps,
            maxRooms: options.maxRooms,
            plainCost: options.plainCost,
            swampCost: options.swampCost,
            roomCallback: callback,
        //    heuristicWeight: 1.2,
        });
        
        if (ret.incomplete) {
            if (options.retry === undefined) {
                
                // handle case where pathfinder failed at a short distance due to not using findRoute
                // can happen for situations where the creep would have to take an uncommonly indirect path
                // options.allowedRooms and options.routeCallback can also be used to handle this situation                
                console.log(`TRAVELER: path failed with findroute ${usedFindRoute} , trying with options.useFindRoute = ${!usedFindRoute}`);
                console.log(`from: ${origin}, destination: ${destination} range:  ${options.range}`);                
                options.useFindRoute = !usedFindRoute;
            //    if (!options.maxOps || options.maxOps < 60000) { options.maxOps = 60000 }
                options.retry = true;
                ret = this.findTravelPath(origin, destination, options);
                console.log(`TRAVELER: second attempt was ${ret.incomplete ? "not " : ""}successful`);               
            }
        }

        /*
        if (ret.incomplete && options.ensurePath) {
            if (options.useFindRoute === undefined) {
                // handle case where pathfinder failed at a short distance due to not using findRoute
                // can happen for situations where the creep would have to take an uncommonly indirect path
                // options.allowedRooms and options.routeCallback can also be used to handle this situation
                if (roomDistance <= 2) {
                    console.log(`TRAVELER: path failed without findroute, trying with options.useFindRoute = true`);
                    console.log(`from: ${origin}, destination: ${destination} range:  ${options.range}`);
                    options.useFindRoute = true;
                    ret = this.findTravelPath(origin, destination, options);
                    console.log(`TRAVELER: second attempt was ${ret.incomplete ? "not " : ""}successful`);
                //    return ret;
                }
            }
        }*/

		return ret;
    }

    /**
     * find a viable sequence of rooms that can be used to narrow down pathfinder's search algorithm
     * @param origin
     * @param destination
     * @param options
     * @returns {{}}
    */
    static findRoute(origin, destination, options = {}) {
    //    let roomLinearDistance = Game.map.getRoomLinearDistance(origin, destination);
        let roomLinearDistance = getRoomLinearDistance(origin, destination);
        let restrictDistance = options.restrictDistance || roomLinearDistance + 10;
      
        if (options.shard && options.shard !== Game.shard.name) {
            let portal = findInterShardPortal(options.shard, origin, destination)
            if (portal && portal.range < 20) {
                return portal.route;
            }
            return;
        }

        if (roomLinearDistance > 5) { // USE PORTALS?
        //    let init = Game.cpu.getUsed()
            let portal = checkForPortalDistance(origin, destination);
        //    let time = Game.cpu.getUsed()-init;
        //    console.log(" findRoute checking portals, restrict distance " +restrictDistance + "/"+roomLinearDistance + " cpu "+ time + " found portal range " +portal.range)
            if (portal.range < roomLinearDistance) {
                return portal.route;
            }
        }

        // checkForHwTunnelDistance("E12N8", "E10N12")
        if (HIGHWAY_WALLS && !roomIsHW(destination) && !roomsInSameSectorV2(origin, destination)) {
            let tunnel = checkForHwTunnelDistance(origin, destination);
            if (tunnel.range < 20) {
                return tunnel.route;
            }
        }


        if (roomLinearDistance > restrictDistance) {
            return;
        }
        
        let allowedRooms = { [origin]: true, [destination]: true };
        let highwayBias = 1.1;  // make highways always a little bit cheaper
        if (options.preferHighway) {
            highwayBias = 2.5;
            if (options.highwayBias) {
                highwayBias = options.highwayBias;
            }
        }
        let ret = Game.map.findRoute(origin, destination, {
            routeCallback: (roomName) => {
                if (options.routeCallback) {
                    let outcome = options.routeCallback(roomName);
                    if (outcome !== undefined) {
                        return outcome;
                    }
                }
            //    let rangeToRoom = Game.map.getRoomLinearDistance(origin, roomName);
                let rangeToRoom = getRoomLinearDistance(origin, roomName);
                if (rangeToRoom > restrictDistance) {
                    // room is too far out of the way
                    return Number.POSITIVE_INFINITY;
                }

                if (options.phalanx && roomName !== destination && Memory.rooms[destination]) {
                    if (Memory.rooms[destination].avoidRoomExit && Memory.rooms[destination].avoidRoomExit[roomName]) {
                        return Number.POSITIVE_INFINITY;
                    }
                }

                if (!options.allowHostile) { 
                    if (Traveler.checkAvoid(roomName) &&
                    roomName !== destination && roomName !== origin) {
                    // room is marked as "avoid" in room memory
                        return Number.POSITIVE_INFINITY;
                    }
                    if (Memory.rooms[roomName] && Memory.rooms[roomName].hostiles && Memory.rooms[roomName].hostiles.power.defensive > 0) {
                        return highwayBias * 5;
                    }
                }

                if (roomIsHW(roomName)) {
                    return 1;
                }

                // SK rooms are avoided when there is no vision in the room, harvested-from SK rooms are allowed
                if (roomIsSk(roomName)) {
                    if (!options.allowSK && !Game.rooms[roomName]) {
                        return highwayBias * 5;
                    } else {    // allowed
                        return highwayBias * 1.6;
                    }
                }

                

                return highwayBias;
            },
        });
        if (!_.isArray(ret)) {
        //    console.log(`couldn't findRoute to ${destination}`);
            return;
        }
        for (let value of ret) {
            allowedRooms[value.room] = true;
        }

        if (options.allowShortcuts !== false) {
            let shortcuts = {}
            for (let roomName in allowedRooms) {
                let exits = getExits(roomName);
                
                
                for (let exit in exits){
                    if (allowedRooms[exit]) {continue; }
                    let exitsInAdjacentRoom = getExits(exit);

                    if (Traveler.checkAvoid(exit) || (Memory.rooms[exit] && Memory.rooms[exit].player)) { continue; }

                    let exitsAdjacentToPath = 0;
                    for (let adjacentExit in exitsInAdjacentRoom){
                        if (!allowedRooms[adjacentExit]) {continue; }
                        exitsAdjacentToPath++;
                    }
                    if (exitsAdjacentToPath >= 2) {
                        shortcuts[exit] = true  // Path turns
                    }
                }
            }
            allowedRooms = Object.assign(allowedRooms, shortcuts)
        }

        return allowedRooms;
    }
    /**
     * check how many rooms were included in a route returned by findRoute
     * @param origin
     * @param destination
     * @returns {number}
     */
    static routeDistance(origin, destination) {
     //   let linearDistance = Game.map.getRoomLinearDistance(origin, destination);
        let linearDistance = getRoomLinearDistance(origin, destination);
        if (linearDistance >= 32) {
            return linearDistance;
        }
        let allowedRooms = this.findRoute(origin, destination);
        if (allowedRooms) {
            return Object.keys(allowedRooms).length;
        }
    }
    /**
     * build a cost matrix based on structures in the room. Will be cached for more than one tick. Requires vision.
     * @param room
     * @param freshMatrix
     * @returns {any}
     */
    static getOfflineStructureMatrix(roomName, options) {
        let identifier = this.createID(roomName, options);
        if (travStructureCache[identifier]) {  
            return PathFinder.CostMatrix.unpack(travStructureCache[identifier].m);
        } else { 

            let portalCost = 255;
            if (options.allowPortal) {
                portalCost = 25;
            }
            
            let matrix = new PathFinder.CostMatrix();					
            if (Memory.portals[roomName]) {
                for (let dest in Memory.portals[roomName]) {
                    let originsPos = posDecompressXY(Memory.portals[roomName][dest].pos)
                    matrix.update(originsPos.x, originsPos.y, portalCost);
                //    log("traveler marking portal as avoid in offline room " + originsPos )
                }
            }

            if (Memory.shardPortals[roomName]) {
                for (let destShard in Memory.shardPortals[roomName]) {
                    for (let destRoom in Memory.shardPortals[roomName][destShard]) {
                        let originsPos = posDecompressXY(Memory.shardPortals[roomName][destShard][destRoom].pos)
                        matrix.update(originsPos.x, originsPos.y, portalCost);
                    //   log("traveler marking portal as avoid in offline room " + originsPos);
                    }
                }
            }
            return matrix;
        }
    }
    
    static createID(room, options){
        let identifier = room + ":" +options.offRoad + ":" +options.ignoreRoads + ":" +options.allowPortal + ":" + options.roadPlan + ":" + options.ignoreCreeps + ":" + options.ignoreContainer;
        return identifier;
    }

    static getStructureMatrix(room, freshMatrix, options) {
        
        let identifier = this.createID(room.name, options); //destroyed structure?
        if (!travStructureCache[identifier] || 
            (freshMatrix && Game.time !== travStructureCache[identifier].ts) ||
            (Game.time > travStructureCache[identifier].force)
        ){

            
            
            let matrix = new PathFinder.CostMatrix();
            
        //    let roadCost = options.roadPlan ? 2 : options.offRoad ? 3 : options.ignoreRoads ? 2 : 1;
            let roadCost = options.offRoad ? 1 : options.ignoreRoads ? 2 : 1;
            matrix = Traveler.addStructuresToMatrix(room, matrix, roadCost, options.allowPortal, options.roadPlan, options.ignoreContainer);

            travStructureCache[identifier] = {};
            travStructureCache[identifier].ts = Game.time;

            if (!options.ignoreCreeps) {
                travStructureCache[identifier].force = Game.time;
            } else if (Memory.rooms[room.name] && (Memory.rooms[room.name].hostileRoom || Memory.rooms[room.name].player)) {
                travStructureCache[identifier].force = Game.time + 3;
            } else {
                travStructureCache[identifier].force = Game.time + 137;
            }

            travStructureCache[identifier].m = matrix.pack();
            return matrix;
        }

        return PathFinder.CostMatrix.unpack(travStructureCache[identifier].m);
    }
    /**
     * build a cost matrix based on creeps and structures in the room. Will be cached for one tick. Requires vision.
     * @param room
     * @returns {any}
     */
    static getCreepMatrix(room, options) {
        let identifier = this.createID(room.name, options);
        if (!travCreepCache[identifier] || Game.time !== travCreepCache[identifier].ts) {
            travCreepCache[identifier] = {};
            travCreepCache[identifier].ts = Game.time;
            let matrix = Traveler.addCreepsToMatrix(room, this.getStructureMatrix(room, true, options).clone());
            travCreepCache[identifier].m = matrix;
            return matrix;
        }
        return travCreepCache[identifier].m;
    }
    
    /**
     * add structures to matrix so that impassible structures can be avoided and roads given a lower cost
     * @param room
     * @param matrix
     * @param roadCost
     * @returns {CostMatrix}
     */
    static addStructuresToMatrix(room, matrix, roadCost, allowPortal = false, roadPlan = false, ignoreContainer = false) {

        let impassibleStructures = [];
        let allStructures = room.find(FIND_STRUCTURES)
        let length = allStructures.length;
        for(let i = 0; i<length; i++){
            let structure = allStructures[i];
    //    for (let structure of room.find(FIND_STRUCTURES)) {
            if (structure.isRampart) {
                if (!structure.my && !structure.isPublic){
                    impassibleStructures.push(structure);
                }
            }
            else if (structure.isRoad) {
                                
                if (roadPlan) {
                    continue;
                    /*
                    let terrainCost = ROAD_PLAINCOST;
                    let terrain = getRoomTerrainAt(structure.pos)
                    if (terrain === TERRAIN_MASK_WALL) {
                        continue;
                    } else if (terrain === TERRAIN_MASK_SWAMP) {
                        terrainCost = ROAD_SWAMPCOST;
                    }
                    matrix.update(structure.pos.x, structure.pos.y, ROAD_ROAD_DECREASE+terrainCost);
                    */
                } else {
                    matrix.update(structure.pos.x, structure.pos.y, roadCost);
                }
            }
            else if (structure.isContainer) {
                if (!ignoreContainer) {
                    if (isGCLPraiseRoomStandby(room.name) || structure.isController() ){
                        let posToBlock = openAdjacentSpots(structure.pos, true);
                        for (let idx in posToBlock) {
                                        
                            let terrainCost = 0;
                            if (getRoomTerrainAt(posToBlock[idx]) === TERRAIN_MASK_SWAMP) {
                                terrainCost = 5;
                            }
                            matrix.update(posToBlock[idx].x, posToBlock[idx].y, 10 + terrainCost);
                        }

                        let activeUpgraderPos = getRegisteredUpgraderPos(room.name)
                        for (let idx in activeUpgraderPos) {
                                        
                            let terrainCost = 0;
                            if (getRoomTerrainAt(activeUpgraderPos[idx]) === TERRAIN_MASK_SWAMP) {
                                terrainCost = 5;
                            }
                            matrix.update(activeUpgraderPos[idx].x, activeUpgraderPos[idx].y, 10 + terrainCost);
                        }
                    }
                    let terrainCost = 0;
                    if (getRoomTerrainAt(structure.pos) === TERRAIN_MASK_SWAMP) {
                        terrainCost = 5;
                    }
                    matrix.update(structure.pos.x, structure.pos.y, 10 + terrainCost);
                }
                
            } 
            else if (structure.isExtractor && !room.mineralOnCd() ) {
                let posToBlock = openAdjacentSpots(structure.pos, true);
                for (let idx in posToBlock) {
                    
                    let terrainCost = 0;
                    if (getRoomTerrainAt(posToBlock[idx]) === TERRAIN_MASK_SWAMP) {
                        terrainCost = 5;
                    }
                    matrix.update(posToBlock[idx].x, posToBlock[idx].y, 10 + terrainCost);
                }
                impassibleStructures.push(structure);
            } 
            else if (structure.isPortal && allowPortal) {
                matrix.update(structure.pos.x, structure.pos.y, 25);                
            } else {
                impassibleStructures.push(structure);                
            }
        }
      
        
        if (Memory.rooms[room.name] && Memory.rooms[room.name].myRoom) {
            let crane = room.getCranePos(room.name);
            if (crane) { matrix.update(crane.x, crane.y, 25); }

            if (ENABLE_SPAWN_EXTENSIONS) {
                let fillers = room.getSpawnFillerPos();
                for (let idx in fillers) {
                    matrix.update(fillers[idx].x, fillers[idx].y, 20);
                }
            }

            if (getRoomPRCL(room.name) < 4) {
                let sources = room.find(FIND_SOURCES); 	
			    for (let i = 0; i < sources.length; i++) {

                    let openSpots = openAdjacentSpots(sources[i].pos, true);
                    for (let j in openSpots) {
                        matrix.update(openSpots[j].x, openSpots[j].y, 10);
                    }
                }
            }

        }

        for (let site of room.find(FIND_CONSTRUCTION_SITES)) {
            if (site.my){
                if (site.structureType === STRUCTURE_CONTAINER || 
                    site.structureType === STRUCTURE_ROAD ||
                    site.structureType === STRUCTURE_RAMPART) {
                    continue;
                }
                matrix.update(site.pos.x, site.pos.y, 0xff);
            } else if (ALLIES[site.owner.username]) {
                matrix.update(site.pos.x, site.pos.y, 0xff);
            }
        }

        for (let structure of impassibleStructures) {
            matrix.update(structure.pos.x, structure.pos.y, 0xff);       
        }
        return matrix;
    }
    /**
     * add creeps to matrix so that they will be avoided by other creeps
     * @param room
     * @param matrix
     * @returns {CostMatrix}
     */
    static addCreepsToMatrix(room, matrix) {
        room.find(FIND_CREEPS).forEach((creep) => matrix.update(creep.pos.x, creep.pos.y, 25));
        room.find(FIND_POWER_CREEPS).forEach((creep) => matrix.update(creep.pos.x, creep.pos.y, 25));
        return matrix;
    }

    /**
     * serialize a path, traveler style. Returns a string of directions.
     * @param startPos
     * @param path
     * @param color
     * @returns {string}
     */
    static serializePath(startPos, path, color = "orange", showPath = false) {
        let serializedPath = "";
        let lastPosition = startPos;
    //    this.circle(startPos, color);
        for (let position of path) {
            if (position.roomName === lastPosition.roomName) {               
                serializedPath += lastPosition.getDirectionTo(position);
                if (DEBUG || showPath) {
                   if (!Game.rooms[position.roomName]) { continue; }
                   Game.rooms[position.roomName].visual.line(position, lastPosition, { color: color, lineStyle: "dashed" });
                }
            }
            lastPosition = position;
        }
        return serializedPath;
    }
    /**
     * returns a position at a direction relative to origin
     * @param origin
     * @param direction
     * @returns {RoomPosition}
     */
    static positionAtDirection(origin, direction) {
        let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
        let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
        let x = origin.x + offsetX[direction];
        let y = origin.y + offsetY[direction];
        if (x > 49 || x < 0 || y > 49 || y < 0) {
            return;
        }
        return new RoomPosition(x, y, origin.roomName);
    }
    /**
     * convert room avoidance memory from the old pattern to the one currently used
     * @param cleanup
     */
    static patchMemory(cleanup = false) {
        if (!Memory.empire) {
            return;
        }
        if (!Memory.empire.hostileRooms) {
            return;
        }
        let count = 0;
        for (let roomName in Memory.empire.hostileRooms) {
            if (Memory.empire.hostileRooms[roomName]) {
                if (!Memory.rooms[roomName]) {
                    Memory.rooms[roomName] = {};
                }
                Memory.rooms[roomName].avoid = Game.time + 1;
                count++;
            }
            if (cleanup) {
                delete Memory.empire.hostileRooms[roomName];
            }
        }
        if (cleanup) {
            delete Memory.empire.hostileRooms;
        }
        console.log(`TRAVELER: room avoidance data patched for ${count} rooms`);
    }
    static deserializeState(travelData, destination) {
        let state = {};
        if (travelData.state) {
            state.lastCoord = { x: travelData.state[STATE_PREV_X], y: travelData.state[STATE_PREV_Y] };
            state.cpu = travelData.state[STATE_CPU];
            state.stuckCount = travelData.state[STATE_STUCK];
            state.destination = {x: travelData.state[STATE_DEST_X], y: travelData.state[STATE_DEST_Y], roomName: travelData.state[STATE_DEST_ROOMNAME]};           
        }
        else {
            state.cpu = 0;
            state.destination = destination;
        }
        return state;
    }
    static serializeState(creep, destination, state, travelData) {
        travelData.state = [creep.pos.x, creep.pos.y, state.stuckCount, state.cpu, destination.x, destination.y,
            destination.roomName];
    }
    static isStuck(creep, state) {
        let stuck = false;
        if (state.lastCoord !== undefined) {
            if (this.sameCoord(creep.pos, state.lastCoord)) {
                // didn't move
                stuck = true;
            }
            else if (this.isExit(creep.pos) && this.isExit(state.lastCoord)) {
                // moved against exit
                stuck = true;
            }
        }
        return stuck;
    }
}
exports.Traveler = Traveler;
// this might be higher than you wish, setting it lower is a great way to diagnose creep behavior issues. When creeps
// need to repath to often or they aren't finding valid paths, it can sometimes point to problems elsewhere in your code
const REPORT_CPU_THRESHOLD = 500;
const DEFAULT_MAXOPS = 20000;
const DEFAULT_STUCK_VALUE = 5;
const STATE_PREV_X = 0;
const STATE_PREV_Y = 1;
const STATE_STUCK = 2;
const STATE_CPU = 3;
const STATE_DEST_X = 4;
const STATE_DEST_Y = 5;
const STATE_DEST_ROOMNAME = 6;
// assigns a function to Creep.prototype: creep.travelTo(destination)
Creep.prototype.travelTo = function (destination, options) {

    
    return Traveler.travelTo(this, destination, options);
};
PowerCreep.prototype.travelTo = function (destination, options = {}) {
    options.offRoad = true;
    return Traveler.travelTo(this, destination, options);
};

global.isStuck = function (creep) {
    return Traveler.isStuck(creep, Traveler.deserializeState(creep._cache._trav));
};

global.findRoute = function (origin, destination, options = {}) {
    return Traveler.findRoute(origin, destination, options);
};
global.findTravelPath = function (origin, destination, options = {}) {
	return Traveler.findTravelPath(origin, destination, options);
};
global.serializePath = function (startPos, path, color = "orange", showPath = false) {
    return Traveler.serializePath(startPos, path, color, showPath);
};

global.getStructureMatrix = function(roomName, freshMatrix, options) {

    let room = Game.rooms[roomName]
    if (room) {
        return Traveler.getStructureMatrix(room, freshMatrix, options)
    } else {
        return Traveler.getOfflineStructureMatrix(roomName, options)
    }    
}





/* cub findroute


//

if (!global.cache) {
	global.cache = {};
}
if (!global.cache.routes) {
	global.cache.routes = {};
}

function roomNameToXY(roomName) {
	const parsed = /^([WE])([0-9]+)([NS])([0-9]+)$/.exec(roomName);
	const [_, ew, x, ns, y] = parsed;
	return { x: (ew === 'E' ? (parseInt(x)+1) : -1 * parseInt(x)), y: (ns === 'N' ? (parseInt(y)+1) : -1 * parseInt(y)), roomName6: (roomName + '      ').substring(0, 6) };
};

const MAX_NUMBER_OF_ROOMS_IN_PATH = 64; // Pathfinder.search maximum
const ROOMNAME_LENGTH = 6;
const MAX_FINDROUTE_CPU = 20.0;

module.exports.findRoute = function(from, to, avoid = { }, ALLOW_ADDITIONAL_ROOMS_IN_PATH_BEYOND_OPTIMAL = 0) {
	const avoidKey = JSON.stringify(Object.keys(avoid));
	const cacheKey1 = from + '|' + to + '|' + avoidKey + '|' + ALLOW_ADDITIONAL_ROOMS_IN_PATH_BEYOND_OPTIMAL;
	if (cacheKey1 in global.cache.routes) {
		return global.cache.routes[cacheKey1];
	}
	const cacheKey2 = to + '|' + from + '|' + avoidKey + '|' + ALLOW_ADDITIONAL_ROOMS_IN_PATH_BEYOND_OPTIMAL;
	if (cacheKey2 in global.cache.routes) {
		return global.cache.routes[cacheKey2];
	}
  
	const obj = {
    	from: roomNameToXY(from),
    	to: roomNameToXY(to),
    	bestPathRange: Infinity,
    	paths: [],
    	startCPU: Game.cpu.getUsed(),
    	f: function(examineRoom, potentialPath) {
    		if ((Game.cpu.getUsed() - this.startCPU) > MAX_FINDROUTE_CPU) return;
    		const examineRoomXY = roomNameToXY(examineRoom);      
    		if (examineRoom in avoid && (examineRoomXY.roomName6 !== this.to.roomName6)
    			&& (examineRoomXY.roomName6 !== this.from.roomName6)) return;
    		const newPotentialPath = potentialPath + examineRoomXY.roomName6;
    		if (newPotentialPath.length > (this.bestPathRange + (ALLOW_ADDITIONAL_ROOMS_IN_PATH_BEYOND_OPTIMAL * ROOMNAME_LENGTH))) return;
    		if (examineRoomXY.roomName6 === this.to.roomName6) {
    			this.paths.push(newPotentialPath);
    			if (newPotentialPath.length < this.bestPathRange) {
    				this.bestPathRange = newPotentialPath.length;
    			}
    		} else {
    			const delta = { x: (this.to.x - examineRoomXY.x), y: (this.to.y - examineRoomXY.y) };
    			if ((newPotentialPath.length + (ROOMNAME_LENGTH * (Math.abs(delta.x) + Math.abs(delta.y)))) > (this.bestPathRange + (ALLOW_ADDITIONAL_ROOMS_IN_PATH_BEYOND_OPTIMAL * ROOMNAME_LENGTH))) return;
    			if (newPotentialPath.length >= (ROOMNAME_LENGTH * MAX_NUMBER_OF_ROOMS_IN_PATH)) return;
    			const exits = Game.map.describeExits(examineRoom);
    			if (delta.x > 0) {
    				if (delta.y > 0) {
    					if (delta.y >= delta.x) {
							if (exits[TOP] && (!(newPotentialPath.includes(exits[TOP])))) this.f(exits[TOP], newPotentialPath);
							if (exits[RIGHT] && (!(newPotentialPath.includes(exits[RIGHT])))) this.f(exits[RIGHT], newPotentialPath);
							if (exits[LEFT] && (!(newPotentialPath.includes(exits[LEFT])))) this.f(exits[LEFT], newPotentialPath);
							if (exits[BOTTOM] && (!(newPotentialPath.includes(exits[BOTTOM])))) this.f(exits[BOTTOM], newPotentialPath);
						} else {
							if (exits[RIGHT] && (!(newPotentialPath.includes(exits[RIGHT])))) this.f(exits[RIGHT], newPotentialPath);
							if (exits[TOP] && (!(newPotentialPath.includes(exits[TOP])))) this.f(exits[TOP], newPotentialPath);
							if (exits[BOTTOM] && (!(newPotentialPath.includes(exits[BOTTOM])))) this.f(exits[BOTTOM], newPotentialPath);
							if (exits[LEFT] && (!(newPotentialPath.includes(exits[LEFT])))) this.f(exits[LEFT], newPotentialPath);
						}
					} else {
						if (Math.abs(delta.y) >= delta.x) {
							if (exits[BOTTOM] && (!(newPotentialPath.includes(exits[BOTTOM])))) this.f(exits[BOTTOM], newPotentialPath);
							if (exits[RIGHT] && (!(newPotentialPath.includes(exits[RIGHT])))) this.f(exits[RIGHT], newPotentialPath);
							if (exits[LEFT] && (!(newPotentialPath.includes(exits[LEFT])))) this.f(exits[LEFT], newPotentialPath);
							if (exits[TOP] && (!(newPotentialPath.includes(exits[TOP])))) this.f(exits[TOP], newPotentialPath);
						} else {
							if (exits[RIGHT] && (!(newPotentialPath.includes(exits[RIGHT])))) this.f(exits[RIGHT], newPotentialPath);
							if (exits[BOTTOM] && (!(newPotentialPath.includes(exits[BOTTOM])))) this.f(exits[BOTTOM], newPotentialPath);
							if (exits[TOP] && (!(newPotentialPath.includes(exits[TOP])))) this.f(exits[TOP], newPotentialPath);
							if (exits[LEFT] && (!(newPotentialPath.includes(exits[LEFT])))) this.f(exits[LEFT], newPotentialPath);
						}
					}
				} else {
					if (delta.y > 0) {
						if (delta.y >= Math.abs(delta.x)) {
							if (exits[TOP] && (!(newPotentialPath.includes(exits[TOP])))) this.f(exits[TOP], newPotentialPath);
							if (exits[LEFT] && (!(newPotentialPath.includes(exits[LEFT])))) this.f(exits[LEFT], newPotentialPath);
							if (exits[RIGHT] && (!(newPotentialPath.includes(exits[RIGHT])))) this.f(exits[RIGHT], newPotentialPath);
							if (exits[BOTTOM] && (!(newPotentialPath.includes(exits[BOTTOM])))) this.f(exits[BOTTOM], newPotentialPath);
						} else {
							if (exits[LEFT] && (!(newPotentialPath.includes(exits[LEFT])))) this.f(exits[LEFT], newPotentialPath);
							if (exits[TOP] && (!(newPotentialPath.includes(exits[TOP])))) this.f(exits[TOP], newPotentialPath);
							if (exits[BOTTOM] && (!(newPotentialPath.includes(exits[BOTTOM])))) this.f(exits[BOTTOM], newPotentialPath);
							if (exits[RIGHT] && (!(newPotentialPath.includes(exits[RIGHT])))) this.f(exits[RIGHT], newPotentialPath);
						}
					} else {
						if (Math.abs(delta.y) >= Math.abs(delta.x)) {
							if (exits[BOTTOM] && (!(newPotentialPath.includes(exits[BOTTOM])))) this.f(exits[BOTTOM], newPotentialPath);
							if (exits[LEFT] && (!(newPotentialPath.includes(exits[LEFT])))) this.f(exits[LEFT], newPotentialPath);
							if (exits[RIGHT] && (!(newPotentialPath.includes(exits[RIGHT])))) this.f(exits[RIGHT], newPotentialPath);
							if (exits[TOP] && (!(newPotentialPath.includes(exits[TOP])))) this.f(exits[TOP], newPotentialPath);
						} else {
							if (exits[LEFT] && (!(newPotentialPath.includes(exits[LEFT])))) this.f(exits[LEFT], newPotentialPath);
							if (exits[BOTTOM] && (!(newPotentialPath.includes(exits[BOTTOM])))) this.f(exits[BOTTOM], newPotentialPath);
							if (exits[TOP] && (!(newPotentialPath.includes(exits[TOP])))) this.f(exits[TOP], newPotentialPath);
							if (exits[RIGHT] && (!(newPotentialPath.includes(exits[RIGHT])))) this.f(exits[RIGHT], newPotentialPath);
						}
					}
				}
			}
		}
	}
	obj.f(from, '');
	let allowedRooms = {};
	for (let i = 0; i < obj.paths.length; i++) {
		if (obj.paths[i].length <= (obj.bestPathRange + (ALLOW_ADDITIONAL_ROOMS_IN_PATH_BEYOND_OPTIMAL * ROOMNAME_LENGTH))) {
			for (let j = 0; j < obj.paths[i].length; j = j + 6) {
				allowedRooms[obj.paths[i].substring(j, j + 6).trim()] = true;
			}
		}
	}
	if (Object.keys(allowedRooms) == 0) {
	    console.log('no allowed rooms: ' + JSON.stringify(obj));
	}
	global.cache.routes[cacheKey1] = allowedRooms;
	return allowedRooms;
}

*/