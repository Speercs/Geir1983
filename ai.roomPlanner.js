'use strict'
let plannerExport = {

    createRoomLayout: function(builder, segmentId){
        
        if (!accessMemorySegment(segmentId) ) {
            console.log(" createRoomLayout no access to id " +segmentId);
            return 0;
        }

        let segment = getMemorySegment(segmentId);

        // segment.structures = {}
        if (segment.segmentId === undefined) { segment.segmentId  = segmentId; }
        if (segment.structures === undefined) { segment.structures = {}; }
        if (segment.createTicks === undefined) { segment.createTicks = 0; }
        segment.createTicks++;

        let dt;	
        
        let buildPos;
        let buildPosCenter;
        let pos, space, freeSpacePos;

    //	if (!Memory.rooms[builder]) 


        let posCo = posDecompress(Memory.rooms[builder].controller.pos, builder);

        if (!segment.buildPosCenter) {
            // START POSITION
            buildPosCenter = posCo;
            segment.buildPosCenter = posSave(buildPosCenter);
        } else {
            buildPosCenter = posLoad(segment.buildPosCenter);
        }

        let vision = false;
        if (Game.rooms[builder]) {
            vision = true;
            drawCircle(builder, buildPosCenter.x, buildPosCenter.y , {fill: 'transparent', radius: 1.50, stroke: 'orange'});	
        }
        
        let init = Game.cpu.getUsed();
        let remainderCpu = 500 - init - 50
        let usedCpu = 0;
        let allowedCpu = Math.min(50, remainderCpu);
        if (Game.cpu.bucket > 8000) {
            allowedCpu = Math.min(300, remainderCpu);
        } else if (Game.cpu.bucket > 3000) {
            allowedCpu = Math.min(100, remainderCpu);
        }

        while (usedCpu < allowedCpu) {
        
            if (!segment.firstCheck) {	
                // IF FIRST ROOM, USE SPAWN AS ANCHOR IF IT EXISTS
                console.log("createRoomLayout checking for existing spawn, myHighRcl " + Memory.myRoomHighPRCL)
                if (vision && (!Memory.myRoomHighPRCL || Memory.myRoomHighPRCL <= 3)) {
                    let spawn = Game.rooms[builder].findByType(STRUCTURE_SPAWN);
                    console.log("found spawns " + spawn.length)
                    if (spawn.length > 0) {
                        log("createRoomLayout first room has spawns! ")
                        if (ENABLE_SPAWN_EXTENSIONS) {
                            // Existing Spawn is bottom spawn in spawn block
                            freeSpacePos = new RoomPosition(spawn[0].pos.x-2, spawn[0].pos.y-4, spawn[0].pos.roomName);	
                            addBlueprintToRoomLayout(BLUEPRINT_SPAWNER_BLOCK, freeSpacePos, segment);
                            setSpawnerBlockSettings(segment, builder, buildPosCenter);
                        } else {
                            // Existing Spawn is top left spawn in storage block
                            space = requiredSpaceForBlueprint(BLUEPRINT_STORAGE);
                            freeSpacePos = new RoomPosition(spawn[0].pos.x+1, spawn[0].pos.y+1, spawn[0].pos.roomName);
                            pos = shiftPositionToCenter(freeSpacePos, space);
                            addBlueprintToRoomLayout(BLUEPRINT_STORAGE, pos, segment);
                            segment.buildPosCenter = posSave(pos);
                            buildPosCenter = pos;
            
                            if (segment.structures[STRUCTURE_FACTORY] === undefined) {
                                setFactoryPos(builder, segment, segmentId);
                            }
                        }
                    }
                }

                // Place this early to avoid blocking it in later
                placeMineralExtractor(segment, builder);

                segment.firstCheck = 1;	

            } else if (ENABLE_SPAWN_EXTENSIONS && !segment.structures[STRUCTURE_SPAWN]) {
                
                log("placing spawn block")
                dt = distanceTransform(addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId)));
            
                findBestPlacement(buildPosCenter, segment, builder, dt, BLUEPRINT_SPAWNER_BLOCK, true);

                // Set crane pos etc
                setSpawnerBlockSettings(segment, builder, buildPosCenter);

            } else if (!ENABLE_DYNAMIC_LABS && !segment.structures[STRUCTURE_LAB]) {
                log("placing labs")
                dt = distanceTransformCorner(addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId)));	


                let store = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE);
                let baseCenterPos = buildPosCenter;
                if (store.length > 0) {
                    baseCenterPos = store[0];
                }
                
                log("base pos " + baseCenterPos)
                findBestPlacement(baseCenterPos, segment, builder, dt, BLUEPRINT_LABS, true);

                storeLabCenter(segment, builder)
                

            } else if (segment.structures[STRUCTURE_SPAWN] === undefined || (ENABLE_SPAWN_EXTENSIONS && segment.structures[STRUCTURE_STORAGE] === undefined)) {
                log("placing storage block")
                dt = distanceTransform(addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId)));

                let bp = BLUEPRINT_STORAGE_BLOCK
                if (ENABLE_SPAWN_EXTENSIONS) {
                    bp = BLUEPRINT_STORAGE_BLOCKV2
                }

                let result = findBestPlacement(buildPosCenter, segment, builder, dt, bp, true);
                
                if (result === OK) {
                    
                    let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);
                    segment.cranePos = posCompress(spawns[2].getPositionAtDirection(BOTTOM_LEFT));

                    // Free the extension to be placed later
                    let extPos = posDecompress(segment.cranePos, builder).getPositionAtDirection(TOP);
                    segment.craneExtPos = []
                    segment.craneExtPos.push(posCompress(extPos))

                    segment.storeLinkPos = posCompress((posDecompress(segment.cranePos, builder)).getPositionAtDirection(RIGHT));

                    // Surround with roads		
                    let stuctures = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_TERMINAL);	
                    stuctures = stuctures.concat(getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE));	
                    stuctures = stuctures.concat(getAllAsPosFromBlueprint(segment, builder, STRUCTURE_POWER_SPAWN));	
                    stuctures = stuctures.concat([extPos]);
                    let directions = [BOTTOM_RIGHT, TOP_LEFT, BOTTOM_LEFT, TOP_RIGHT];
                    for (let idx in stuctures) {
                        let startPos = stuctures[idx].getPositionAtDirection(directions[idx]);	
                        for (let idx2 in stuctures) {
                            if (idx === idx2) { continue; }
                            addRoadToBluePrint(startPos, stuctures[idx2], segment, true, false);
                        }
                    }					  
                } else if (result === ERR_BUSY) {
					break;
				} else {
				//	segment.requestSpace = 1
				}

            } else if (ENABLE_STORAGE_BLOCK && segment.structures[STRUCTURE_STORAGE] === undefined) {
                log("placing storage")
                dt = distanceTransform(addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId)));	
                let useCenter = true;

            //	dt = distanceTransformCorner(addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId)));

                findBestPlacement(buildPosCenter, segment, builder, dt, BLUEPRINT_STORAGE_NOSPAWNS, useCenter);
                        
            } else if (segment.controllerLink === undefined) {
                // CONTROLLER LINK		
                console.log(builder + " ai.builder placing controller link/container");
                // UPDATE DT WITH NEW STRUCTURES
                let wdt = buildableControllerPixelsForRoom(builder);
                wdt = addBlueprintsToDtMatrix(segment, wdt);
                wdt = distanceTransform(wdt, 255);
                
                placeControllerStructures(segment, builder, wdt);

                // Find best placement for Storage Link		
                if (ENABLE_SPAWN_EXTENSIONS) {
                    setOptimalStorageLinkPos(segment, builder);
                }

                segment.controllerLink = 1;

            } else if (segment.sourceLinksPlaced === undefined ) {

                if (segment.controllerContainerPos) {
                    addRoadToBluePrint(buildPosCenter, posDecompress(segment.controllerContainerPos, builder), segment);
                } else {
                    addRoadToBluePrint(buildPosCenter, posCo, segment);
                }

                placeSourceLinks(segment, builder);

                // Move the segment.craneExtPos to last fixed pos
                if (ENABLE_SPAWN_EXTENSIONS) {
                    if (segment.craneExtPos && segment.craneExtPos.length > 0) {
                        let craneExtPos = posDecompress(segment.craneExtPos[0], builder);
                        for (let idx in segment.structures[STRUCTURE_EXTENSION].pos) {
                            if (segment.structures[STRUCTURE_EXTENSION].pos[idx].x === craneExtPos.x && segment.structures[STRUCTURE_EXTENSION].pos[idx].y === craneExtPos.y) {
                                segment.structures[STRUCTURE_EXTENSION].pos.splice(idx, 1);
                                break;
                            }
                        }
                        segment.structures[STRUCTURE_EXTENSION].pos.push({x: craneExtPos.x, y: craneExtPos.y, fixed: 1});
                    }
                }

                // Everything above this stays where it is!
                markStructuresPermanent(segment, true);

                
                segment.sourceLinksPlaced = 1;
            } else if (segment.requestSpace) {
                if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
                    console.log(" OOB_complete no access to id " +SEGMENT_ALL_ROOM_OOB);
                    return 0;
                }
                if (segment.spaceIncreasedCounter === undefined) { segment.spaceIncreasedCounter = 0; }
                segment.spaceIncreasedCounter++;
                if (global.extensionPlan !== undefined) {
                    delete global.extensionPlan[builder];
                }
                

                if (segment.curRampartIdx === undefined) {
                    
                    segment.curRampartIdx = 0;
                    segment.bestScore = -100000;

                    if (segment.structures["dummy"] === undefined) {
                        segment.structures["dummy"] = {};
                        segment.structures["dummy"].pos = [];
                    }

                    // Add sources inside walls
                    let sources = getFakeSources(builder)
                    segment.sourcesToProtect = [];
                    for (let idx in sources){
                        let positionsToProtect = [];
                        for (let i = 1; i <= 8; i++) {
                            let position = sources[idx].pos.getPositionAtDirection(i);
                            if (!position.isPassible(true)) { continue; }					

                            if (isOutsideWalls(position, undefined, segmentId)) {					
                                positionsToProtect.push(posCompress(position))						
                            }					
                        }
                        if (positionsToProtect.length > 0) {
                            segment.sourcesToProtect.push(positionsToProtect)
                        }
                    }


                    let idx = segment.structures[STRUCTURE_EXTENSION].pos.length;
                    while(idx--) {
                        if (segment.structures[STRUCTURE_EXTENSION].pos[idx].fixed) { continue; }
                        segment.structures[STRUCTURE_EXTENSION].pos.splice(idx, 1);
                    }

                    delete segment.curRamparts;
                    delete segment.curDummy;

                    segment.curRamparts = _.cloneDeep(segment.structures[STRUCTURE_RAMPART]);			
                    segment.curDummy = _.cloneDeep(segment.structures["dummy"]);

                    segment.curDummy.pos = _.uniq(segment.curDummy.pos);

                    delete segment.bestRamparts;
                    delete segment.bestDummy;

                    if (global.floodFillReachableCm) { delete global.floodFillReachableCm[builder]; }
                    let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);	
                //	dt = buildablePixelsForRoom(builder, segmentId, true);
                    dt = addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId, true));
                    let buildable = countCostMatrix(dt, 1);
                    

                    dt = createCmOfFloodFillResult(dt, spawns[0]);
                    segment.curInnerPos = global.floodFillReachableCm[builder].numberOfConfirmedPos;

                    segment.deadPixels = buildable - segment.curInnerPos;
                    segment.curNumberRamparts = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_RAMPART).length;

                    log("new increase space request! " + segment.curNumberRamparts + " confirmed inner " + segment.curInnerPos + "/" + buildable)
                } 

                getWallSegmentToRemove(segment, builder);

                let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);
                
                if (segmentOOB && segmentOOB.oob) {
                    delete segmentOOB.oob[segmentId];
                }
                saveMemorySegment(SEGMENT_ALL_ROOM_OOB, segmentOOB);
                delete segment.OOB_complete;		
                
                delete segment.structures[STRUCTURE_RAMPART];
                delete segment.requestSpace;
                delete global.blueprintCache;		
                delete segment.wallsPlaced;
                delete segment.limit;

                // WALL DUDS
                delete segment.confirmedWallDuds;
                delete segment.removeWallIdx;
                delete segment.lastRemovedWall;
                delete segment.wallDudsRemoved;

                if (global.setOusidePixelsObject) {
                    delete global.setOusidePixelsObject[builder];
                    delete global.setOusidePixelsObject[segmentId];
                }
                if (global.floodFillReachableCm) {
                    delete global.floodFillReachableCm[builder];
                    delete global.floodFillReachableCm[segmentId];
                }

            } else if (segment.wallsPlaced === undefined) {
                console.log(builder + " ai.builder creating minimal wall");
                // UPDATE DT WITH NEW STRUCTURES
            //	dt = distanceTransform(addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId), 0, true));
                // CREATE AREA THAT NEEDS TO BE BLOCKED OF BY RAMPARTS
				
				
                let ip = innerPixelsForRoom(segment, builder);

				let sourceStructures = getSourceStructures(segment, builder);
                // ADD RAMPARTS AT CHOCKE POINTS
                util_mincut.createMinCutWall(builder, ip, segment, buildPosCenter, sourceStructures);	
				
            
                /*
                let ip = innerPixelsObjectForRoom(segment, builder);
                require('mincut')
                let cm = getRoomCosts(builder, buildPosCenter, ip);
                let walls = minCutToExit(ip, cm)

                if (segment.structures[STRUCTURE_RAMPART] === undefined) {
                    segment.structures[STRUCTURE_RAMPART] = {};
                    segment.structures[STRUCTURE_RAMPART].pos = [];
                }

                for (let idx in walls) {
                    let _pos = walls[idx];
                    segment.structures[STRUCTURE_RAMPART].pos.push({ x:_pos.x, y:_pos.y});
                }
                segment.wallsPlaced = 1;
                */
            
                
            } else if (segment.wallDudsRemoved === undefined) {
                let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);	

                console.log(builder + " ai.builder removing dud walls from " + spawns[0]);
                segment.structures[STRUCTURE_RAMPART].pos = _.uniq(segment.structures[STRUCTURE_RAMPART].pos);
                removeDudWalls(segment, spawns[0]);
            } else if (segment.OOB_complete === undefined) {
                console.log(builder + " ai.builder setting oob pixels");
                if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
                    console.log(" OOB_complete no access to id " +SEGMENT_ALL_ROOM_OOB);
                    return 0;
                }
                let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);

                if (global.setOusidePixelsObject) {
                    delete global.setOusidePixelsObject[segmentId]
                }

                if (segmentOOB && segmentOOB.oob) {
                    delete segmentOOB.oob[segmentId];
                    delete global.oob[segmentId];
                }
                
                setOutisdePixels(builder, segmentOOB, segment, segmentId);
                segment.OOB_complete = 1;
            //	log(segment.OOB_complete)

            } else if (segment.allRampartIdx !== undefined) {		
                // SCORE CURRENT WALLS
                console.log(builder + " ai.builder scoring wall expansion ");
                // UPDATE DT WITH NEW STRUCTURES
                if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
                    console.log(" OOB_complete no access to id " +SEGMENT_ALL_ROOM_OOB);
                    return 0;
                }
                if (global.floodFillReachableCm) { delete global.floodFillReachableCm[builder]; }
                
                let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);	
            //	dt = buildablePixelsForRoom(builder, segmentId, true);	
                dt = addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId, true));
                displayCostMatrix(dt, builder, "orange");

                let newBuildable = countCostMatrix(dt, 1);
                
                dt = createCmOfFloodFillResult(dt, spawns[0]);
            //	displayCostMatrix(dt, builder);

                let increasedInnerPos = Math.min(200, global.floodFillReachableCm[builder].numberOfConfirmedPos - segment.curInnerPos);
                increasedInnerPos = increasedInnerPos || 0;
                
                let increasedRamparts = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_RAMPART).length - segment.curNumberRamparts;	

                increasedInnerPos = increasedInnerPos || 0;
                increasedRamparts = increasedRamparts || 1;

                let increasedDeadEnds = (newBuildable - global.floodFillReachableCm[builder].numberOfConfirmedPos) - segment.deadPixels;
                
                let currentScore = (increasedInnerPos - increasedDeadEnds) * (increasedInnerPos / increasedRamparts);
                delete global.floodFillReachableCm[builder];

                log(segment.curRampartIdx + "/" + segment.allRampartIdx + " scoring rampart removal " + currentScore.toFixed(2) + " increased space " + increasedInnerPos + " increased ramparts " + increasedRamparts + " new dead ends " + increasedDeadEnds)

                if (currentScore > segment.bestScore) {	
                    log("new best score! " + currentScore);
                    segment.bestScore = currentScore;

                    delete segment.bestRamparts;
                    delete segment.bestDummy;

                    segment.bestRamparts = _.cloneDeep(segment.structures[STRUCTURE_RAMPART]);
                    segment.bestDummy = _.cloneDeep(segment.structures["dummy"]);
                }
                
                // CHECK MORE WALL SEGMENTS?
                if (segment.curRampartIdx >= segment.allRampartIdx) {
                    log("foudn best ramparts " + segment.bestScore)
                    // Clean up
                    delete segment.curRampartIdx;
                    delete segment.allRampartIdx;
                    delete segment.sourcesToProtect;
                    delete segment.curSourceIdx;
                    
                    delete segment.bestScore;
                    delete segment.curNumberRamparts;
                    delete segment.curDummy;

                    delete segment.structures[STRUCTURE_RAMPART];
                    delete segment.structures["dummy"];
                    segment.structures[STRUCTURE_RAMPART] = _.cloneDeep(segment.bestRamparts);
                    segment.structures["dummy"] = _.cloneDeep(segment.bestDummy);

                    delete segment.bestRamparts;
                    delete segment.bestDummy;

                    let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);
                    delete segmentOOB.oob[segmentId];
                    saveMemorySegment(SEGMENT_ALL_ROOM_OOB, segmentOOB);
                    delete segment.OOB_complete;
                    delete segmentOOB.oob[segmentId];	
                    delete global.oob[segmentId];

                } else {
                    // check next rampart 
                    segment.requestSpace = 1;
                    segment.curRampartIdx++;
                    // use cycle starting ramparts
                    segment.structures[STRUCTURE_RAMPART] = _.cloneDeep(segment.curRamparts);
                    segment.structures["dummy"]  = _.cloneDeep(segment.curDummy);
                }

            } else if (segment.extensionsPlaced === undefined) {
                console.log(builder + " ai.builder placing extensions");
                // UPDATE DT WITH NEW STRUCTURES
                if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
                    console.log(" OOB_complete no access to id " +SEGMENT_ALL_ROOM_OOB);
                    return 0;
                }
            
                if (global.floodFillReachableCm) { delete global.floodFillReachableCm[builder]; }

            //	
                let result;
                if (ENABLE_STORAGE_BLOCK) {

                    let store = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE);		
                    let baseCenterPos = store[0];

                    dt = distanceTransform(addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId)));	
                    let useCenter = true
                    result = findBestPlacement(baseCenterPos, segment, builder, dt, BLUEPRINT_DISSI_EXT_FLOWER, useCenter);
                } else {

                    let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);		
                    let baseCenterPos = spawns[0].getPositionAtDirection(BOTTOM_RIGHT);
                    if (ENABLE_SPAWN_EXTENSIONS) {
                        let store = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE);		
                        baseCenterPos = store[0].getPositionAtDirection(TOP);
                    }					

                    dt = addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId, true));
                    let limit = {}
                    dt = createCmOfFloodFillResult(dt, spawns[0], limit);
                    log("createCmOfFloodFillResult " + JSON.stringify(limit))
                    if (segment.limit === undefined) { segment.limit = limit }
                    result = addExtensionsSpiral(baseCenterPos, segmentId, segment, dt, BLUEPRINT_EXTENSIONS, segment.limit);
                }
                
                if (result === ERR_BUSY) {
					break;
                } else if (result !== OK) {
                    segment.requestSpace = 1;
                    
                } else {
                    segment.extensionsPlaced = 1;
                    delete segment.extGrouped;
                    
                }

            } else if (segment.extGrouped === undefined) {
            //	return;
                let extensions = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_EXTENSION, true);
                let removed = removeUngroupedExtensions(segment, builder, extensions);

                if (removed > 0 && extensions.length - removed < getWantedExtensions(segment, builder, ENABLE_DYNAMIC_LABS)) {
                    delete segment.extensionsPlaced;
                }
                segment.extGrouped = 1;
            } else if (ENABLE_DYNAMIC_LABS && !segment.structures[STRUCTURE_LAB]) {
                console.log(builder + " ai.builder placing dynamic labs");
        
                let terminal = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_TERMINAL);
                sortAllByDistanceFrom(segment, builder, STRUCTURE_EXTENSION, terminal[0]);
        
                placeDynamicLabs(segment, builder);
        
                storeLabCenterDynamic(segment, builder);

				// Add roads to lab from all spawns
				let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);
				let labs = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_LAB);	
				if (labs.length > 3) {
					for (let idx in spawns) {
						addRoadToBluePrint(spawns[idx], labs[0], segment, true, false);
						addRoadToBluePrint(spawns[idx], labs[labs.length-1], segment, true, false);
					}
				}
				

            } else if (segment.extensionsSorted === undefined) {
                let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);
                let storage = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE);
                let extensions = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_EXTENSION, true);
                checkPathToExtensions(segment, builder, spawns, extensions);
                // SORT BY DISTANCE TO Storage
                sortAllByDistanceFrom(segment, builder, STRUCTURE_EXTENSION, storage[0]);
                if (segment.controllerContainerPos) {
                    let controllerContainer = posDecompress(segment.controllerContainerPos, builder);
                    moveStructuresNear(segment, builder, STRUCTURE_EXTENSION, controllerContainer, 2)
                }
                extensions = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_EXTENSION, true);
                sortAllByDistanceFrom(segment, builder, STRUCTURE_EXTENSION, extensions[0]);
                if (segment.controllerContainerPos) {
                    let controllerContainer = posDecompress(segment.controllerContainerPos, builder);
                    moveStructuresNear(segment, builder, STRUCTURE_EXTENSION, controllerContainer, 2)
                }

                segment.extensionsSorted = 1;

                delete segment.structures["dummy"];
                delete segment.structures["dummyExt"];
                
                if (global.extensionPlan) {
                    delete global.extensionPlan[builder];
                    delete global.extensionPlanCache[builder];
                }	
            
            } else if (segment.towersPlaced === undefined){
                console.log(builder + " ai.builder placing towers");
                if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
                    console.log(" towersPlaced no access to id " +SEGMENT_ALL_ROOM_OOB);
                    return 0;
                }
                placeTowersAlongRamparts(segment, builder, segmentId);
                let tempSpawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);
                sortAllByDistanceFrom(segment, builder, STRUCTURE_TOWER, tempSpawns[0]);
            } else if (segment.spreadTower === undefined){
                spreadTowers(segment, builder);
                segment.spreadTower = 1;
            } else if (segment.wallTunnels === undefined) {
                console.log(builder + " ai.builder adding access tunnels (ramparts)");			
                addWallAccessTunnels(segment, dt, builder, buildPosCenter);           
            } else if (segment.structures[STRUCTURE_OBSERVER] === undefined) {		
                dt = distanceTransform(addBlueprintsToDtMatrix(segment, buildablePixelsForRoom(builder, segmentId)));
                if (segment.structures[STRUCTURE_NUKER] === undefined) {
                    console.log(builder + " ai.builder placing nuker");
                    // ADD NUKER
                    space = requiredSpaceForBlueprint(BLUEPRINT_NUKER, false);
                    //pos = buildPosCenter;	// ideal position
                    while (true) {
                        buildPos = findClosestFreeSpace(dt, space, buildPosCenter, segmentId, {cornerFit: true, segment: segment, checkOutsideRange: 1})
                        if (!buildPos) { break; }

                        let origin = findCloseOriginForBp(BLUEPRINT_NUKER, buildPos, segment)
                    //	buildPos = shiftPositionToCenter(pos, space);
                        if (willBlock(buildPos, origin, segment) ) {
                            console.log("position will block! " + buildPos )
                            dt.set(buildPos.x, buildPos.y, 0);
                        //	dt = distanceTransform(dt, 0);
                            buildPos = null;
                            continue;
                        }
                        break;
                    }			
                    if (buildPos) {
                        segment = addBlueprintToRoomLayout(BLUEPRINT_NUKER, buildPos, segment);
                        console.log(builder + " ai.builder nuker placed");
                    }			
                }

                if (segment.structures[STRUCTURE_OBSERVER] === undefined) {
                    console.log(builder + " ai.builder placing observer");
                    // UPDATE DT WITH NEW STRUCTURES
                    dt = addBlueprintsToDtMatrix(segment, dt);
                    dt = distanceTransform(dt, 0);
                    // ADD OBSERVER
                    space = requiredSpaceForBlueprint(BLUEPRINT_OBSERVER, false);		

                    while (1) {
                        buildPos = findClosestFreeSpace(dt, space, buildPosCenter, segmentId, {cornerFit: true, segment: segment, checkOutsideRange: 1});
                        if (!buildPos) { break; }

                        let origin = findCloseOriginForBp(BLUEPRINT_OBSERVER, buildPos, segment)

                        if (willBlock(buildPos, origin, segment) ) {
                            console.log("position will block! " + buildPos )
                            dt.set(buildPos.x, buildPos.y, 0);
                        //	dt = distanceTransform(dt, 0);
                            buildPos = null;
                            continue;
                        }
                        break;
                    }
                    if (buildPos) {
                        segment = addBlueprintToRoomLayout(BLUEPRINT_OBSERVER, buildPos, segment);
                        console.log(builder + " ai.builder observer placed");
                    }
                }
			} else if (segment.cleanRoads === undefined) {	
                cleanOverlappingRoads(segment, builder);
                segment.cleanRoads = 1;
            } else if (!segment.blueprintComplete) {
                    
                segment.roomScore = 0;
                if (validateBase(segment, builder, segmentId)) {

                    rateBase(segment, builder, segmentId);

                    // Clean temp variables "fixed" 
                    markStructuresPermanent(segment, false);
                    delete segment.curRamparts;
                    delete segment.buildPosCenter;
                    delete segment.lastRemovedWall;
                    delete segment.towerPlacements;
                    delete segment.extensionsSorted;
                    delete segment.controllerLink;
                    delete segment.sourceLinksPlaced;
                    delete segment.wallsPlaced;
                    delete segment.extGrouped;
                    delete segment.rampartRange;
                    delete segment.towersIdx;
                    delete segment.towersPlaced;
                    delete segment.spreadTower;
                    delete segment.wallTunnels;
                    delete segment.cleanRoads;
                    delete segment.firstCheck;
                    delete segment.extensionsPlaced;
                    delete segment.towerAvoids;
                    delete segment.labCenter;
                    delete segment.limit;
        
                    if (global.extensionPlan) { delete global.extensionPlan[builder]; }	
        
                    delete global._validateBaseCahce[builder]
        
                    Memory.rooms[builder].romPlnV = CURRENT_ROOMPLANNER_VERSION;			
                    segment.blueprintComplete = 1;
                    Memory.rooms[builder].blueprintComplete = 1;
        
                    log(builder + " ai.builder completed layout!");
                    console.log(builder + " createRoomLayout total ticks " +segment.createTicks);
                    break;
                }
                
            }
            usedCpu = Game.cpu.getUsed()-init;
        }

        let time = Game.cpu.getUsed()-init;
        if (segment.totalTime === undefined ) { segment.totalTime = 0 ;}
        segment.totalTime += time;
        segment.totalTime = Number(segment.totalTime.toFixed(1))
        console.log(builder + " createRoomLayout total cpu time " +segment.totalTime);	
        saveMemorySegment(segmentId, segment);
    },
    
    createWallLayer2Layout:  function createWallLayer2Layout(segment, builder){
        let outerRamparts = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_RAMPART);
    
        let matrixdt = createWallLimitMatrixFromSegment(builder, segment);
    
        if (segment.wallLayer2 === undefined) {
            segment.wallLayer2 = [];
        }
        
    //	displayCostMatrix(matrixdt, builder);
        let verifiedPos = {};
        for (let idx = 0; idx < outerRamparts.length; idx++) {
            let outerRampartPos = outerRamparts[idx];
            let touchedOutside = false;
            let tempPos = [];
            for (let i = 1; i <= 8; i++) {
                let position = outerRampartPos.getPositionAtDirection(i);
                let value = matrixdt.get(position.x, position.y);
                if (value >= 10 && value <= 20 && !verifiedPos[position]) {								
                    tempPos.push(position);
                } else if (value === 255) {
                    touchedOutside = true;
                }
            }
    
            if (touchedOutside){
                for (let idx2 in tempPos) {
                    let pos = tempPos[idx2];
                    drawCircle(builder, pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'});
                    verifiedPos[pos] = {};
                    segment.wallLayer2.push({ x: pos.x, y: pos.y});				
                }
            }
        }
    
        segment.wallLayer2Complete = 1;
        return segment;
    }
};
module.exports = plannerExport;





function addBlueprintToRoomLayout(bp, pos, segment, checkValid = false, dt = false, ignoreBlock = false, dryRun = false){

	let skippedStructures = 0;
	if (dryRun) {
		segment = JSON.parse(JSON.stringify(segment));
	}

	let buildings = bp.buildings;
	let x, y = 0;
	let curPos;
	let roomName = pos.roomName;
	drawCircle(roomName, pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'});
	let origin;
	let segmentId = segment.segmentId || pos.roomName;
	if (checkValid){
		origin = findCloseOriginForBp(bp, pos, segment);
	}

	let maxX = 0;
	let minX = 50;
	let maxY = 0;
	let minY = 50;

	let bpPositions = {};
	if (!ignoreBlock && bp !== BLUEPRINT_EXTENSIONS) {
		for (let building in buildings){
			for (let idx = 0; idx < buildings[building].pos.length; idx++) {
				maxX = Math.max(maxX, buildings[building].pos[idx].x);
				maxY = Math.max(maxY, buildings[building].pos[idx].y);
				minX = Math.min(minX, buildings[building].pos[idx].x);
				minY = Math.min(minY, buildings[building].pos[idx].y);
				bpPositions[posCompressXY(buildings[building].pos[idx].x + pos.x, buildings[building].pos[idx].y + pos.y)] = {};
			}
		}
	}
	
	for (let building in buildings){
		if (skippedStructures && dryRun) { break; }

		let buildingType = building;
		

		if (segment.structures[buildingType] === undefined) {
			segment.structures[buildingType] = {};
			segment.structures[buildingType].pos = [];
		}

		let useCheckValid = checkValid;
		if (buildingType === "dummy") { 			
			useCheckValid = false;
		}


		for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			if (skippedStructures && dryRun) { break; }			
			x = buildings[building].pos[idx].x + pos.x;
			y = buildings[building].pos[idx].y + pos.y;

			let useIgnoreBlock = ignoreBlock
			if (buildings[building].pos[idx].x < maxX && buildings[building].pos[idx].x > minX &&
				buildings[building].pos[idx].y < maxY && buildings[building].pos[idx].y > minY
			) {
				useIgnoreBlock = true;
			//	log("can skip blocking check! " + buildingType + " at " +  buildings[building].pos[idx].x +":" +  buildings[building].pos[idx].y)
			} else { 
			//	log("must check blocking! " + buildingType + " at " +  buildings[building].pos[idx].x +":" +  buildings[building].pos[idx].y, "green")
			}

			

			if (x < 1 || x > 48 || y < 1 || y  > 48) { 
				skippedStructures++
				continue; 
			}


			if (checkValid){
				curPos = new RoomPosition(x, y, roomName);

				if (dt && dt.get(x, y) === 0 ) { 
					drawText(roomName, "L", x, y, {color: 'red', font: 0.8});
					skippedStructures++
					continue;
				}
				if (posIsInBlueprint(segment, curPos, buildingType) ) {
					drawText(roomName, "-", x, y, {color: 'red', font: 0.8});
					skippedStructures++
					continue;
				}
				if (buildingType !== STRUCTURE_ROAD && adjacentBuildingInBlueprint(segment, curPos, true) ) {
					drawText(roomName, "A", x, y, {color: 'red', font: 0.8});
					skippedStructures++
					continue; 
				}

				if (buildingType !== STRUCTURE_ROAD && !useIgnoreBlock && willBlock(curPos, origin, segment, undefined, bpPositions)) {
					
					if (!posIsInBlueprint(segment, curPos, STRUCTURE_ROAD)) {

						if (segment.structures[STRUCTURE_ROAD] === undefined) {
							segment.structures[STRUCTURE_ROAD] = {};
							segment.structures[STRUCTURE_ROAD].pos = [];
						}
						segment.structures[STRUCTURE_ROAD].pos.push({ x:x, y:y});
					}
					console.log("found blocking " + buildingType + " at " + curPos)

					

					drawText(roomName, "B", x, y, {color: 'red', font: 0.8});
					skippedStructures++
					continue; 
				}
				if (isWithinAttackRangeOfOutside(curPos, segmentId)) { 
					drawText(roomName, "O", x, y, {color: 'red', font: 0.8});
					skippedStructures++
					continue; 
				}
			}
			segment.structures[buildingType].pos.push({ x:x, y:y});
		}
	}

	if (dryRun) {
		return skippedStructures;
	}
	return segment;
}

function getWallLimitAsObstacles(segment, roomName) {
	let obstacles = [];
	let pushedPos = {}


	if (!segment.structures || !segment.structures[STRUCTURE_RAMPART]) { return {nearWall : obstacles, nearWallObj: pushedPos}; }

	let ramparts = segment.structures[STRUCTURE_RAMPART].pos
	
	for (let rampartIdx in ramparts){
		let rampPos = new RoomPosition(ramparts[rampartIdx].x, ramparts[rampartIdx].y, roomName);
		let range = 2;
		let n = 0;
		let x, y = 0;
		let ret = ulamSpiral(n);

		while (ret.sq <= range) {
			ret = ulamSpiral(n);
			n += 1;
			if (ret.sq <= range) {
				x = limit(rampPos.x + ret.x, 1, 48);
				y = limit(rampPos.y + ret.y, 1, 48);  
				let nearWallPos = new RoomPosition(x, y, roomName);
				let posId = posCompress(nearWallPos)
				if (pushedPos[posId]) { continue; }
				let terrain = getRoomTerrainAt(x, y, roomName);
				if (terrain === TERRAIN_MASK_WALL ) { continue; }
			//	costMatrix.set(x, y, 1);
				pushedPos[posId] = {};
				obstacles.push(nearWallPos)
			}
		}
	}
	return {nearWall : obstacles, nearWallObj: pushedPos};
}

function getSourceStructures(segment, builder) {


	let posObject = {}
	for (let idx in segment.sourceExtensionPos) {

		let pos = posDecompressXY(segment.sourceExtensionPos[idx])
		if (posObject[pos.x] === undefined) { posObject[pos.x] = {} }
		if (posObject[pos.x][pos.y] === undefined) { posObject[pos.x][pos.y] = {} }
	}

	for (let idx in segment.sourceLinkPos) {
		let pos = posDecompressXY(segment.sourceLinkPos[idx])
		if (posObject[pos.x] === undefined) { posObject[pos.x] = {} }
		if (posObject[pos.x][pos.y] === undefined) { posObject[pos.x][pos.y] = {} }
	}

	let sources = getFakeSources(builder)
	for (let idx in sources) {
		let pos = sources[idx].pos.getHarvesterPos(builder);
		if (posObject[pos.x] === undefined) { posObject[pos.x] = {} }
		if (posObject[pos.x][pos.y] === undefined) { posObject[pos.x][pos.y] = {} }
	}

	return posObject;
}

function willBlock(pos, origin, segment, useWallLimit=true, bpPositions = {}, maxIncrease = 6) {
	let cm = new PathFinder.CostMatrix();
	cm = addBlueprintsToDtMatrix(segment, cm, 255);
	
	let segmentForLimit = {};
	if (useWallLimit) {
		segmentForLimit = segment;
	}

	let {nearWall, nearWallObj} = getWallLimitAsObstacles(segmentForLimit, origin.roomName)

	cm.set(pos.x, pos.y, 0);
	let road = findTravelPath(origin, pos, {range: 0, costMatrix: cm, ignoreStructures: true, maxOps:5000, maxRooms: 1, ignoreCreeps: true, offRoad: true, obstacles: nearWall, retry: false});
	
	if (road.incomplete) { 
		log("willBlock startpos cant be reached " + origin + " cant be reached  " + pos)
		return true;
	}

	let allowedLength = road.path.length + maxIncrease;
	cm.set(pos.x, pos.y, 255); // BLOCK POS TO TEST


	// CHECK ALL ADJACENT
	for (let i = 1; i <= 8; i++) {
		let position = pos.getPositionAtDirection(i);


		if (getRoomTerrainAt(position) === TERRAIN_MASK_WALL) { continue; }	
		
		let value = cm.get(position.x, position.y);
		let range = 0;

		let compressedPos = posCompress(position)
		if (nearWallObj[compressedPos] !== undefined) { 
		//	range = 1;
			continue;
		}

	//	log("checking compressed pos " + compressedPos)
		if (bpPositions[compressedPos] !== undefined) { 
		//	log("can skip " + position + " in BP ")
			continue; 
		}


		if (value === 255) { range = 1; }

		road = findTravelPath(origin, position, {range: range, ignoreStructures: true, costMatrix: cm, maxOps:5000, maxRooms: 1, ignoreCreeps: true, offRoad: true, obstacles: nearWall});
		if (road.incomplete) {
			log("willBlock " + position + " cant be reached  " + pos + " origin " +origin)
			return true; 
		}
		if (road.path.length > allowedLength) {
			let toMuch = road.path.length - allowedLength;
			log("willBlock " + position + " gives to long path " + pos + " length exceeded by " +toMuch)
			return true; 
		}
	}
}


function setSpawnerBlockSettings(segment, builder, buildPosCenter) {
	// Set spawner container pos
	let containers = [];
	let container = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_CONTAINER);	
	for (let idx in container) {
		containers.push(container[idx])
	}
	segment.spawnContPos = packrat.packPosList(containers);

	// Set spawner link pos
	let links = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_LINK);	
	if (links.length > 0) {
		segment.spawnLinkPos = posCompress(links[0])

		// new builpos center around spawner block - controller
		let target;

		let pathLink = findTravelPath(buildPosCenter, links[0], {range: 1, offRoad: true, maxRooms: 1, ignoreStructures: true});	
		if (!pathLink || pathLink.incomplete || pathLink.path.length <= 1) { 
			let x = Math.floor((links[0].x + buildPosCenter.x)/ 2);
			let y = Math.floor((links[0].y + buildPosCenter.y)/ 2);
			target = new RoomPosition(x, y, builder);
		} else {
			let idx = Math.floor(pathLink.path.length/2)			
			target = pathLink.path[idx]
		}

		if (target) {
			segment.buildPosCenter = posSave(target);
		}
		
	}

	// Set crane positions
	let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);	
	let fillerPos = [];
	for (let idx in spawns) {
		if (idx == 0) {				
			fillerPos.push(spawns[idx].getPositionAtDirection(TOP_LEFT));	
			fillerPos.push(spawns[idx].getPositionAtDirection(TOP_RIGHT));
		} else if (idx == 1) {
			fillerPos.push(spawns[idx].getPositionAtDirection(BOTTOM_LEFT));
			fillerPos.push(spawns[idx].getPositionAtDirection(BOTTOM_RIGHT));
		}
	}
	segment.fillerPos = packrat.packPosList(fillerPos);


	// Surround with roads
	spawns = spawns.concat(getAllAsPosFromBlueprint(segment, builder, STRUCTURE_CONTAINER));	
	let directions = [BOTTOM, TOP, LEFT, RIGHT]
	for (let idx in spawns) {
		let startPos = spawns[idx].getPositionAtDirection(directions[idx]);	
		for (let idx2 in spawns) {
			if (idx === idx2) { continue; }
			addRoadToBluePrint(startPos, spawns[idx2], segment, true, false);
		}
	}
}


function requiredSpaceForBp(bp){

	let buildings = bp.buildings;
	let max_x = 0;
	let max_y= 0;
	for (let building in buildings){		
		if (building === STRUCTURE_ROAD) { continue; }
		for (let idx = 0; idx < buildings[building].pos.length; idx++) {			
			if (buildings[building].pos[idx].x > max_x) { max_x = buildings[building].pos[idx].x; }
			if (buildings[building].pos[idx].y > max_y) { max_y = buildings[building].pos[idx].y; }		
		//	console.log(JSON.stringify(buildings[building].pos))
		}
	}
	let spaceReq = Math.max(max_x, max_y);

	log("space required " + spaceReq)
	
	return spaceReq;
}

function requiredSpaceForBlueprint(bp, addFreeBorderSpace = true){

	let buildings = bp.buildings;
	let max_x = 0;
	let max_y= 0;
	for (let building in buildings){		
		for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			if (buildings[building].pos[idx].x > max_x) { max_x = buildings[building].pos[idx].x; }
			if (buildings[building].pos[idx].y > max_y) { max_y = buildings[building].pos[idx].y; }		
		//	console.log(JSON.stringify(buildings[building].pos))
		}
	}
	let add = 0;
	if (addFreeBorderSpace) { add = 2; }
	let spaceReq = Math.max(max_x+1, max_y+1) + add;	
	
	if (spaceReq % 2 == 0) {
		spaceReq += 1;
	}
	return spaceReq;
}

function requiredSpaceForBlueprintCenter(bp){

	let buildings = bp.buildings;
	let max_x = 0;
	let max_y= 0;
	for (let building in buildings){		
		for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			if (buildings[building].pos[idx].x > max_x) { max_x = buildings[building].pos[idx].x; }
			if (buildings[building].pos[idx].y > max_y) { max_y = buildings[building].pos[idx].y; }		
		//	console.log(JSON.stringify(buildings[building].pos))
		}
	}
	let add = 0;

	let spaceReq = Math.max(Math.ceil((max_x+1)/2), Math.ceil((max_y+1)/2));	
	
	return spaceReq;
}

function getLargestFreeSpace(dt){
	let max = 1;
    for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
            max = Math.max(max, dt.get(x, y));
        }
    }
    return max;
}


function addBlueprintsToDtMatrix(segment, dt, value = 0, ignoreDummy = true){
	let buildings = segment.structures;
	for (let building in buildings){
	//	let buildingType = building;
		if (building === STRUCTURE_ROAD) { continue; }
		if (ignoreDummy && (building === "dummy")) { continue; }
		

		if (value === 255) { 
			if (building === STRUCTURE_RAMPART) { continue; }	
			if (building === STRUCTURE_CONTAINER) { continue; }
		}


		for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			dt.set(buildings[building].pos[idx].x, buildings[building].pos[idx].y, value);
		}
	}
	return dt;
}

function shiftPositionToCenter(pos, space){	
	let new_x = Math.ceil(pos.x - (space/2)) +1;
	let new_y = Math.ceil(pos.y - (space/2)) +1;
//	console.log(pos.y);
	if (new_x < 0 || new_x > 49 || new_y < 0 || new_y > 49) { return pos; }
	return new RoomPosition(new_x, new_y, pos.roomName);
}

function shiftPositionFromCenter(pos, space){	
	let new_x = Math.ceil(pos.x - (space/2));
	let new_y = Math.ceil(pos.y - (space/2));
//	console.log(pos.y);

	if (new_x < 0 || new_x > 49 || new_y < 0 || new_y > 49) { return pos; }
	
	return new RoomPosition(new_x, new_y, pos.roomName);
}


function setFactoryPos(roomName, segment, segmentId){

	
	let spawn = getAllAsPosFromBlueprint(segment, roomName, STRUCTURE_SPAWN)[0];
	let powerSpawn = getAllAsPosFromBlueprint(segment, roomName, STRUCTURE_POWER_SPAWN)[0];

	let x = Math.floor((spawn.x + powerSpawn.x)/ 2);
	let y = Math.floor((spawn.y + powerSpawn.y)/ 2);
	if (!x || !y) { return; }
	let target = new RoomPosition(x, y, roomName);

	segment.structures[STRUCTURE_FACTORY] = {};
	segment.structures[STRUCTURE_FACTORY].pos = [];
	segment.structures[STRUCTURE_FACTORY].pos.push({ x:target.x, y:target.y});
	saveMemorySegment(segmentId, segment);

}


function placeMineralExtractor(segment, builder) {

	let minerals = Memory.rooms[builder].mineral;
	for (let id in minerals) {
		addStructureToRoomLayout(STRUCTURE_EXTRACTOR, posDecompress(minerals[id].pos, builder), segment);		
	}	
}


function wallOrAdjacentToExit(x, y, roomName) {
    if (1 < x && x < 48 && 1 < y && y < 48) return getRoomTerrainAt(x, y, roomName) === TERRAIN_MASK_WALL;
    if (0 == x || 0 == y || 49 == x || 49 == y) return true;

    if (getRoomTerrainAt(x, y, roomName) === TERRAIN_MASK_WALL) return true;

    let A, B, C;
    if (x == 1) {
        A = getRoomTerrainAt(0, y-1, roomName); B = getRoomTerrainAt(0, y, roomName); C = getRoomTerrainAt(0, y+1, roomName);
    }
    if (x == 48) {
        A = getRoomTerrainAt(49, y-1, roomName); B = getRoomTerrainAt(49, y, roomName); C = getRoomTerrainAt(49, y+1, roomName);
    }
    if (y == 1) {
        A = getRoomTerrainAt(x-1, 0, roomName); B = getRoomTerrainAt(x, 0, roomName); C = getRoomTerrainAt(x+1, 0, roomName);
    }
    if (y == 48) {
        A = getRoomTerrainAt(x-1, 49, roomName); B = getRoomTerrainAt(x, 49, roomName); C = getRoomTerrainAt(x+1, 49, roomName);
    }
    return !(A == TERRAIN_MASK_WALL && B == TERRAIN_MASK_WALL && C == TERRAIN_MASK_WALL);
}


function buildablePixelsForRoom(roomName, segmentId, ignoreSource = false, ignoreOOB = false) {
    let costMatrix = new PathFinder.CostMatrix();
   	if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
		console.log(" buildablePixelsForRoom no access to id " + SEGMENT_ALL_ROOM_OOB);
		return;
	}

	let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);
	let oobAvailable;
	if (!ignoreOOB && segmentOOB.oob && segmentOOB.oob[segmentId]) {
		oobAvailable = true;
	}
	
    for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
            if (wallOrAdjacentToExit(x, y, roomName)) { continue; }
            if (oobAvailable && isOutsideWallsXY(x, y, roomName, segmentOOB, segmentId)) { continue; } 
			costMatrix.set(x, y, 1);
        }
	}
	
	// ADD EXCLUSION AROUND SOURCE, MINERAL AND CONTROLLER
	let segment = getMemorySegment(segmentId);
	if (!ignoreSource) {
		let exclusion = [];
		if (segment.sourceLinksPlaced === undefined) {
			let sources = getFakeSources(roomName)
			exclusion = exclusion.concat(sources)
		}
		
		let minerals = getFakeMinerals(roomName)
		exclusion = exclusion.concat(minerals);
		
		let range = 1;
		for (let idx=0; idx<exclusion.length; idx++) {
			let n = 0;	
			let ret = ulamSpiral(n);
			let startPos = exclusion[idx].pos;
			while (ret.sq <= range) {
				ret = ulamSpiral(n);
				n += 1;
				if (ret.sq <= range) {
					let xSet = limit(startPos.x + ret.x, 1, 48);
					let ySet = limit(startPos.y + ret.y, 1, 48);  
					costMatrix.set(xSet, ySet, 0);
				}	
			}
		}

		let controllerExclusion = [];
	//	controllerExclusion.push(Game.rooms[roomName].controller.pos);
		let controller = getFakeController(roomName)
		controllerExclusion.push(controller.pos)
		range = 2;
		if (segment.controllerContainerPos || segment.controllerLinkPos) {
			if (segment.controllerContainerPos) { controllerExclusion.push(posDecompress(segment.controllerContainerPos, roomName)); }
			if (segment.controllerLinkPos) { controllerExclusion.push(posDecompress(segment.controllerLinkPos, roomName)); }
			range = 1;
		}

		let controllerPos = controller.pos;
		for (let idx=0; idx<controllerExclusion.length; idx++) {
			let n = 0;	
			let ret = ulamSpiral(n);
			let startPos = controllerExclusion[idx];
			while (ret.sq <= range) {
				ret = ulamSpiral(n);
				n += 1;
				let xSet = limit(startPos.x + ret.x, 1, 48);
				let ySet = limit(startPos.y + ret.y, 1, 48);  				
				if (ret.sq <= range && getRangeXY(controllerPos.x, controllerPos.y, xSet, ySet) <= 3) {					
					costMatrix.set(xSet, ySet, 0);
				}	
			}
		}
	}

	let exits = getFakeExits(roomName);
	let exitRange = 5;
	if (segment && segment.structures && segment.structures[STRUCTURE_RAMPART]) {
		exitRange = 2;
	}

	for (let idxExit= 0 ; idxExit<exits.length; idxExit++) {
		let n = 0;
		let x, y = 0;
		let range = 2;
		if (ignoreOOB) {
			range = 1;
		}
		
		let ret = ulamSpiral(n);
		let startPos = exits[idxExit];
		while (ret.sq <= exitRange) {
	        ret = ulamSpiral(n);
	        n += 1;
	        if (ret.sq <= exitRange) {
		        x = limit(startPos.x + ret.x, 1, 48);
		        y = limit(startPos.y + ret.y, 1, 48);  
	       		costMatrix.set(x, y, 0);
	       	}	
	    }
	}

	if (segment && segment.structures && segment.structures[STRUCTURE_RAMPART]) {
		let ramparts = getAllAsPosFromBlueprint(segment, roomName, STRUCTURE_RAMPART);
		for (let idxRampart= 0 ; idxRampart<ramparts.length; idxRampart++) {
			let n = 0;
			let x, y = 0;
			let range = 2;
			
			let ret = ulamSpiral(n);
			let startPos = ramparts[idxRampart];
			while (ret.sq <= range) {
		        ret = ulamSpiral(n);
		        n += 1;
		        if (ret.sq <= range) {
			        x = limit(startPos.x + ret.x, 1, 48);
			        y = limit(startPos.y + ret.y, 1, 48);  
					costMatrix.set(x, y, 0);
		       	}
		    }
		}
	}
	return costMatrix;
}

function buildableControllerPixelsForRoom(roomName) {
	let costMatrix = new PathFinder.CostMatrix();
	 for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
            if (wallOrAdjacentToExit(x, y, roomName)) { continue; }
            costMatrix.set(x, y, 1);
        }
    }
    return costMatrix;
}


function findBestPlacement(startPos, segment, builder, dt, bp, useCenter=false){

	let requiredSpace = 255;
	if (useCenter) {
		requiredSpace = requiredSpaceForBlueprintCenter(bp);
	} else {
		// From corner
		requiredSpace = requiredSpaceForBp(bp);
	}
	log("required space " + requiredSpace)
	
//	let optimumSpace = requiredSpace + 2;


	if (global.bestPlan === undefined) { global.bestPlan = {}; }

	if (global.bestPlan[builder] === undefined ||
		global.bestPlan[builder].sorted === undefined
	) {

		if (global.bestPlan[builder] === undefined)	{ 
			console.log("new bestPlan plan! ")
			global.bestPlan[builder] = {}; 
		}

		let n = global.bestPlan[builder].n || 0;
		let sortable = global.bestPlan[builder].sortable || [];
		let testedPos = global.bestPlan[builder].testedPos || {};

		let x, y = 0;
		let range = 24;
		let ret = ulamSpiral(n);
		let pos, bpPos;
		
		
		let maxDistExit = global.bestPlan[builder].maxDistExit || 1;
		let maxPathLength = global.bestPlan[builder].maxPathLength || 1;
		let maxSq = 1;
		let maxDistRes = global.bestPlan[builder].maxDistRes || 1;
		let maxDistController = global.bestPlan[builder].maxDistController || 1;
		let maxAdjacentFreeSpace = global.bestPlan[builder].maxAdjacentFreeSpace || 1;

		let obstructExits = addExitsAsObstacles(builder);
	//	let init = Game.cpu.getUsed();

		while (ret.sq <= range) {

			if (Game.cpu.getUsed() > 450) {
				global.bestPlan[builder].n = n;
				global.bestPlan[builder].sortable = sortable;
				global.bestPlan[builder].testedPos = testedPos;
				global.bestPlan[builder].maxDistExit = maxDistExit;
				global.bestPlan[builder].maxPathLength = maxPathLength;
				global.bestPlan[builder].maxDistRes = maxDistRes;
				global.bestPlan[builder].maxDistController = maxDistController;
				global.bestPlan[builder].maxAdjacentFreeSpace = maxAdjacentFreeSpace;
				log("findBestPlacement out of cpu! " +Game.cpu.getUsed() + " tested pos " + testedPos + " sortable " + sortable)
				
				return ERR_BUSY; 
			}

			x = startPos.x + ret.x;
			y = startPos.y + ret.y;

			if (y >= 48 || y <= 1 || x >= 48 || x <= 1) { 
				// skip, invalid pos 

			} else {
				pos = new RoomPosition(x, y, startPos.roomName);

				if (useCenter) {
					bpPos = shiftPositionFromCenter(pos, requiredSpace);
				} else {
					bpPos = pos;
				}


				let posCompressed = posCompress(pos)
				if (testedPos[posCompressed] === undefined) {
					testedPos[posCompressed] = {};

				//	let pathLengthOrigin = -1;	// use path length instead, same origin
				//	bpPos = pos
				//	bpPos = shiftPositionToCenter(pos, requiredSpace);

					let dtSize = dt.get(pos.x, pos.y);
					
					if (dtSize < requiredSpace) { 
						// Skip
					} else {
						let path = findTravelPath(startPos, pos, {range: 1, offRoad: false, maxRooms: 1, maxOps: 3000, ignoreStructures: true, ignoreCreeps: true, obstacles: obstructExits});
						let pathLength = -1;
						if (!path.incomplete && path.path.length) {
							pathLength = path.cost;
							maxPathLength = Math.max(maxPathLength, pathLength);
						} else {
							drawText(startPos.roomName, "REA", bpPos.x, bpPos.y, {color: 'red', font: 0.5});
						}
	
						maxSq = Math.max(maxSq, ret.sq);
						
					//	let distToController = shortestDistToController(bpPos, builder);
					//	maxDistController = Math.max(maxDistController, distToController);
	
						let adjacentFreeSpace = countFreeSpacesAdjacent(segment, bpPos, bp, dt) || 0
						maxAdjacentFreeSpace = Math.max(maxAdjacentFreeSpace, adjacentFreeSpace);

					//	let sizeOverShoot = Math.min(2, requiredSpace - dtSize);
						let sizeOverShoot = dtSize - requiredSpace;
	
						sortable.push({bpPos: bpPos, pathLength: pathLength, dtSize: dtSize, adjacentFreeSpace: adjacentFreeSpace, sizeOverShoot: sizeOverShoot} );
					}
				}
			}

			ret = ulamSpiral(n);
			n += 1;
		}

		log("sortable pos " + sortable.length + " max path " + maxPathLength + " max adjacent " + maxAdjacentFreeSpace)
		
		// Score positions
		let bestScore = 9999;
		for (let idx in sortable) {
			let score = 0;	// lower is better

			let temp = sortable[idx].pathLength;
			if (temp === -1) {
				temp = maxPathLength;
			}
			score += 5 * (temp / maxPathLength);
			
			/*
			temp = sortable[idx].distToController;
			if (temp === -1) {
				temp = maxDistController;
			}
			score += 5 * (temp / maxDistController);
			*/

			temp = sortable[idx].adjacentFreeSpace
			score -= 10 * (temp / maxAdjacentFreeSpace);
			
		//	score += sortable[idx].sizeOverShoot;	// Penalty, prefer snug fit

			sortable[idx].score = score;
			if (sortable[idx].score < bestScore ) {
				bestScore = sortable[idx].score;
			}
		}

		log("rated pos best score " + bestScore)

		sortable.sort(function(a, b) {
			return (a.score - b.score);});
		
		global.bestPlan[builder].sorted = sortable;
	}

	if (!global.bestPlan[builder] ||
		!global.bestPlan[builder].sorted 
	) {
		return ERR_BUSY;
	}

	if (!global.bestPlan[builder].sorted.length) {
		delete global.bestPlan[builder];
		return -1;
	}

	for (let i= global.bestPlan[builder].i || 0; i< global.bestPlan[builder].sorted.length; i++) {

		let scoredPos = global.bestPlan[builder].sorted[i]
		let pos = scoredPos.bpPos;
	
		let score = scoredPos.score.toFixed(1);


		let bpPos2 = pos
		drawText(builder, score, pos.x, pos.y, {color: 'green', font: 0.5});

		/*
		if (useCenter) {
			bpPos2 = shiftPositionFromCenter(pos, requiredSpace);
		//	drawText(builder, score, bpPos2.x, bpPos2.y, {color: 'green', font: 0.5});			
		} */

		

		if (Game.cpu.getUsed() > 450) { 
			console.log("abort best placement due to high cpu " + Game.cpu.getUsed().toFixed(2) + ", cycles done " + i)
			global.bestPlan[builder].i = i;
			return ERR_BUSY;
		}

		let dryRun = true;
		if (addBlueprintToRoomLayout(bp, bpPos2, segment, true, undefined, undefined, dryRun) > 0) { 
			drawText(builder, i, pos.x, pos.y, {color: 'red', font: 0.5});
			continue; 
		}

		drawText(builder, i, pos.x, pos.y, {color: 'green', font: 0.5});

	//	drawText(builder, i, pos.x, pos.y, {color: 'red', font: 0.5});
		addBlueprintToRoomLayout(bp, bpPos2, segment, true);
		log("found best placement! " + bpPos2 + " score was " +score + " path lenght " + scoredPos.pathLength + " adjacent free " + scoredPos.adjacentFreeSpace + " overshoot " + scoredPos.sizeOverShoot)
		
		break;
	}

	delete global.bestPlan[builder];
	return OK;
}


function countFreeSpacesAdjacent(segment, pos, bp, dt){
	let roomName = pos.roomName;
	// BUILD CACHE
	if (!global.blueprintCache) { global.blueprintCache = {}; }
	let id = roomName
	if (!global.blueprintCache[id] || global.blueprintCache[id].ts !== Game.time) {
		global.blueprintCache[id] = {};
		global.blueprintCache[id].ts = Game.time;
		global.blueprintCache[id].pos = {};		
		let buildings = segment.structures;
		for (let building in buildings){	
			if (building === "dummy") { continue; }
			if (building === STRUCTURE_ROAD) { continue; }
			for (let idx = 0; idx < buildings[building].pos.length; idx++) {
				global.blueprintCache[id].pos[posCompressXY(buildings[building].pos[idx].x, buildings[building].pos[idx].y)] = {};				
			}
		}
	}	

	let buildings = bp.buildings
	let bpBlocker = {};

	for (let building in buildings){
		let buildingType = building;	 
		if (buildingType === STRUCTURE_ROAD) { continue; }
				
		for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			let x = buildings[building].pos[idx].x + pos.x;			
			let y = buildings[building].pos[idx].y + pos.y;
			bpBlocker[posCompressXY(x, y)] = {};
		}
	}

	
	let adjacent = {};
	for (let building in buildings){
		let buildingType = building;	 
		if (buildingType === STRUCTURE_ROAD) { continue; }
		if (buildingType === "dummy") { continue; }
				
		for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			let x = buildings[building].pos[idx].x + pos.x;			
			let y = buildings[building].pos[idx].y + pos.y;

			if (x < 1 || x > 48 || y < 1 || y  > 48) { continue; }
		//	let curPos = new RoomPosition(x, y, roomName);

			for (let i = 1; i <= 8; i++) {
			//	let adjacentSpots = curPos.getPositionAtDirection(i);
				let adjacentSpots = getXYPositionAtDirection(x, y, i)

				let size = dt.get(adjacentSpots.x, adjacentSpots.y);
				if (size === 0) {
					continue;
				}
				
			//	let posIdAdjacent = posCompress(adjacentSpots)
				let posIdAdjacent = posCompressXY(adjacentSpots.x, adjacentSpots.y)
				if (global.blueprintCache[id].pos[posIdAdjacent] || bpBlocker[posIdAdjacent]) {	
					continue;
				}

				if (adjacent[posIdAdjacent] === undefined) {
					adjacent[posIdAdjacent] = {
						score: 0
					};
				}
				let score = 0.5;
				if (i % 2 === 1) {	// score diagonals less
					score += 0.5;
				}
				adjacent[posIdAdjacent].score = Math.max(adjacent[posIdAdjacent].score, score) 

			}
		}
	}
//	let freeSpaces = Object.keys(adjacent).length

	let totalScore = 0;
	for (let _id in adjacent) {
		totalScore += adjacent[_id].score
	}
//	log("freespaces "+ totalScore + " for " + pos)

	return totalScore || 0;
}






function storeLabCenter(segment, builder){
	let labs = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_LAB);

	let xAvg = 0;
	let yAvg = 0;
	let length = labs.length;
	for (let i=0; i< length; i++) {
		xAvg += labs[i].x;
		yAvg += labs[i].y;
	}
	xAvg = Math.floor(xAvg / labs.length);
	yAvg = Math.ceil(yAvg / labs.length);

	segment.labCenter = {}
	segment.labCenter[posCompressXY(Math.floor(xAvg), Math.ceil(yAvg))] = {}
	segment.labCenter[posCompressXY(Math.ceil(xAvg), Math.floor(yAvg))] = {}
	segment.labCenter[posCompressXY(Math.ceil(xAvg), Math.ceil(yAvg))] = {}
	segment.labCenter[posCompressXY(Math.floor(xAvg), Math.floor(yAvg))] = {}
}

function storeLabCenterDynamic(segment, builder){
	let labs = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_LAB);

	let labsCompressed = getAllAsCompressedPosFromBlueprint(segment, builder, STRUCTURE_LAB)

	segment.labCenter = {}

	let checkedPos = {};
	for (let idx in labs) {

		let labPos = labs[idx]

		let currentComPos = posCompress(labPos);
		if (checkedPos[currentComPos]) { continue; }


		for (let i = 1; i <= 8; i++) {
			let position = labPos.getPositionAtDirection(i);

			for (let j = 1; j <= 8; j++) {
				let nextPosition = labPos.getPositionAtDirection(j);
				let nextCompressed = posCompress(nextPosition)
				if (nextCompressed === currentComPos) { continue; }
				if (checkedPos[posCompress(nextPosition)]) { continue; }

				if (labsCompressed[nextPosition]) {
					segment.labCenter[currentComPos] = {};
				}
			}
		}

		checkedPos[currentComPos] = {};	

	}
}


function wallPerimiter(x, y) {
	if (x == 2 || x == 47 || y == 2 || y == 47) { return true; }
}

/**
    positions on which you can build blocking structures, such as walls.
    @param {string} roomName
    @return {PathFinder.CostMatrix}
*/
function blockablePixelsForRoom(roomName) {
    let costMatrix = new PathFinder.CostMatrix();
    for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
            if (!wallOrAdjacentToExit(x, y, roomName)) {
                costMatrix.set(x, y, 1);
            }
        }
    }
    return costMatrix;
}

function addRoadToBluePrint(origin, destination, segment, offRoad = false, ignoreDummy = true) {
	if (!origin || !destination ) { return segment; }
	let cm = new PathFinder.CostMatrix(); 
	
	
	cm = addBlueprintsToDtMatrix(segment, cm, 255, ignoreDummy);
	cm = addRoadsToMatrix(segment, cm, origin.roomName);

	let containers = getAllAsPosFromBlueprint(segment, origin.roomName, STRUCTURE_CONTAINER);
	for (let idx in containers) {
		let containerPos = containers[idx];
		cm.set(containerPos.x, containerPos.y, 25);
	}


	if (segment.fillerPos) {
		let cranePos = packrat.unpackPosList(segment.fillerPos)
		for (let idx in cranePos) {
			cm.set(cranePos[idx].x, cranePos[idx].y, 255);
		}
	}
	


	let road = findTravelPath(origin, destination, {range: 1, costMatrix: cm, ignoreStructures: true, freshMatrix: true, offRoad: offRoad});
					//	{range: 1, ignoreCreeps: true, maxOps:20000, allowSK: true})
	let length = road.path.length;
	
	if (segment.structures[STRUCTURE_ROAD] === undefined) {
			segment.structures[STRUCTURE_ROAD] = {};
			segment.structures[STRUCTURE_ROAD].pos = [];
	}

	segment.structures[STRUCTURE_ROAD].pos.push({ x:origin.x, y:origin.y});

	let existingRoads = getAllAsCompressedPosFromBlueprint(segment, origin.roomName, STRUCTURE_ROAD)
	for (let i = 0; i < length; i++) {
		if (existingRoads[posCompress(road.path[i])]) { continue; }
		segment.structures[STRUCTURE_ROAD].pos.push({ x:road.path[i].x, y:road.path[i].y});
	}
	return segment;
}

function createMinimalWall(ip, segment, startPos){
	let cm = new PathFinder.CostMatrix(); 
	if (segment.structures && segment.structures[STRUCTURE_RAMPART]) {
		let walls = segment.structures[STRUCTURE_RAMPART];
		for (let idx = 0; idx < walls.pos.length; idx++) {
			cm.set(walls.pos[idx].x,walls.pos[idx].y,255);
		}
	}
	if (segment.structures[STRUCTURE_RAMPART] === undefined) {
		segment.structures[STRUCTURE_RAMPART] = {};
		segment.structures[STRUCTURE_RAMPART].pos = [];
	}
	let roomName = startPos.roomName;
	let dt = walkablePixelsForRoom(roomName);
	dt = distanceTransform(dt, 255);
	displayCostMatrix(dt, roomName);
	let origin = startPos;
	let exits = Game.rooms[roomName].findReducedExits().map(e => ({pos: e, range: 0}));
	while(true) {
		let {path,incomplete} = PathFinder.search(origin, exits, {swampCost: 1, roomCallback: () => cm, maxRooms: 1});
		if(incomplete){
			segment.wallsPlaced = 1;
			break; 
		}
		if (Game.cpu.getUsed() > 400) { return segment; }
		let ipVal; // inner pixel
		let dtVal; // distance transform
		let minimalDt = 100;
		let pos, x, y;
		for (let idx = 0; idx < path.length; idx++) {
			x = path[idx].x;
			y = path[idx].y;
			ipVal = ip.get(x, y);
		//	drawText(roomName, ipVal  , x, y, {color: 'green', font: 0.8});
			if (ipVal === 0 || wallPerimiter(x, y)) {
				dtVal = dt.get(x, y);
				drawText(roomName, dtVal  , x, y, {color: 'red', font: 0.8});
				if ((dtVal < minimalDt  )&& !wallOrAdjacentToExit(x, y, startPos.roomName)) {
					minimalDt = dtVal;
					pos = path[idx];
				}
			}
		}
		if (pos) {
			cm.set(pos.x, pos.y,255);  // obstruct path for next loop			
			segment.structures[STRUCTURE_RAMPART].pos.push({ x:pos.x, y:pos.y});
		}
	}
	return segment;
}

function room_2d_array(room) {
	let room_2d=new Array(50).fill(0).map( x=>new Array(50).fill(0)); // Array for room tiles
	/*
	let terrain_array=(new Room.Terrain(room.name)).getRawBuffer();
	if (terrain_array.length === 0) {
		console.log('get_room_array in room_layout, look-at-for-Area Fehler');
	}*/

	let terrainData = Game.map.getRoomTerrain(room) 
	let terrain='';
	let x_pos=0;
	let y_pos=0;
	let i=0;
	for(let y = 0; y < 50; y++) {
		for(let x = 0; x < 50; x++) {
		//	terrain=terrain_array[y * 50 + x];
			terrain=terrainData.get(x, y)
			x_pos=x;
			y_pos=y;
			if (terrain & TERRAIN_MASK_WALL === TERRAIN_MASK_WALL) {
				room_2d[x_pos][y_pos]= UNWALKABLE; // mark unwalkable
			} else { 
				if (x_pos===0 || y_pos===0 ||x_pos===49 || y_pos===49)
					room_2d[x_pos][y_pos]=EXIT; // Exit Tiles mark
			}
		}
	}
	// Marks tiles where you cannot build wall/rampart
	let y=1;const max=49;
	for(;y<max;y++) { 
		if (room_2d[0][y-1]===3) room_2d[1][y]=TO_EXIT;
		if (room_2d[0][y]===3) room_2d[1][y]=TO_EXIT;
		if (room_2d[0][y+1]===3) room_2d[1][y]=TO_EXIT;
		if (room_2d[49][y-1]===3) room_2d[48][y]=TO_EXIT;
		if (room_2d[49][y]===3) room_2d[48][y]=TO_EXIT;
		if (room_2d[49][y+1]===3) room_2d[48][y]=TO_EXIT;
	}
	let x=1;
	for(;x<max;x++) { 
		if (room_2d[x-1][0]===3) room_2d[x][1]=TO_EXIT;
		if (room_2d[x][0]===3) room_2d[x][1]=TO_EXIT;
		if (room_2d[x+1][0]===3) room_2d[x][1]=TO_EXIT;
		if (room_2d[x-1][49]===3) room_2d[x][48]=TO_EXIT;
		if (room_2d[x][49]===3) room_2d[x][48]=TO_EXIT;
		if (room_2d[x+1][49]===3) room_2d[x][48]=TO_EXIT;
	}
	// mark Exit Tiles as not usable 
	y=1;
	for(;y<max;y++) { 
		room_2d[0][y]=UNWALKABLE;
		room_2d[49][y]=UNWALKABLE;
	//	room_2d[0][y]==-1;
	//	room_2d[49][y]==-1;
	}
	x=1;
	for(;x<max;x++) {
		room_2d[x][0]=UNWALKABLE;
		room_2d[x][49]=UNWALKABLE;
	//	room_2d[x][0]==-1;
	//	room_2d[x][49]==-1;
	}
	return room_2d;
}

/*
function room_2d_array(room) {
	let room_2d=Array(50).fill(0).map( x=>Array(50).fill(0)); // Array for room tiles
	let terrain_array=room.lookForAtArea(LOOK_TERRAIN,0,0,49,49,true);
	if (terrain_array.length == 0) {
		console.log('get_room_array in room_layout, look-at-for-Area Fehler');
	}
	let terrain='';
	let x_pos=0;
	let y_pos=0;
	let i=0;const imax=terrain_array.length;
	for (;i<imax;i++) { // Filling array with terrain information
		terrain=terrain_array[i];
		x_pos=terrain.x;
		y_pos=terrain.y;
		if (terrain.terrain==='wall') {
			room_2d[x_pos][y_pos]=-1; // mark unwalkable
		} else { 
			if (x_pos===0 || y_pos===0 ||x_pos===49 || y_pos===49)
				room_2d[x_pos][y_pos]=3; // Exit Tiles mark
		}
	}
	// Marks tiles where you cannot build wall/rampart
	let y=1;const max=49;
	for(;y<max;y++) { 
		if (room_2d[0][y-1]===3) room_2d[1][y]=2;
		if (room_2d[0][y]===3) room_2d[1][y]=2;
		if (room_2d[0][y+1]===3) room_2d[1][y]=2;
		if (room_2d[49][y-1]===3) room_2d[48][y]=2;
		if (room_2d[49][y]===3) room_2d[48][y]=2;
		if (room_2d[49][y+1]===3) room_2d[48][y]=2;
	}
	let x=1;
	for(;x<max;x++) { 
		if (room_2d[x-1][0]===3) room_2d[x][1]=2;
		if (room_2d[x][0]===3) room_2d[x][1]=2;
		if (room_2d[x+1][0]===3) room_2d[x][1]=2;
		if (room_2d[x-1][49]===3) room_2d[x][48]=2;
		if (room_2d[x][49]===3) room_2d[x][48]=2;
		if (room_2d[x+1][49]===3) room_2d[x][48]=2;
	}
	// mark Exit Tiles as not usable 
	y=1;
	for(;y<max;y++) { 
		room_2d[0][y]=-1;
		room_2d[49][y]=-1;
	//	room_2d[0][y]==-1;
	//	room_2d[49][y]==-1;
	}
	x=1;
	for(;x<max;x++) {
		room_2d[x][0]=-1;
		room_2d[x][49]=-1;
	//	room_2d[x][0]==-1;
	//	room_2d[x][49]==-1;
	}
	return room_2d;
}*/

const UNWALKABLE = -1;
const NORMAL = 0;
const PROTECTED = 1;
const TO_EXIT = 2;
const EXIT = 3;


function Graph(menge_v) {
	this.v=menge_v; // Vertex count
	this.level=new Array(menge_v);
	this.edges=new Array(menge_v).fill(0).map( x=>[]); // Array: for every vertex an edge Array mit {v,r,c,f} vertex_to,res_edge,capacity,flow
	this.New_edge=function(u,v,c) { // Adds new edge from u to v
		this.edges[u].push({v: v, r: this.edges[v].length, c:c, f:0}); // Normal forward Edge
		this.edges[v].push({v: u, r: this.edges[u].length-1, c:0, f:0}); // reverse Edge for Residal Graph
	};
	this.Bfs=function(s, t) { // calculates Level Graph and if theres a path from s to t
		if (t>=this.v) 
			return false;
		this.level.fill(-1); // reset old levels
		this.level[s]=0;
		let q=[]; // queue with s as starting point
		q.push(s);
		let u=0;
		let edge=null;
		while (q.length) {
			u=q.splice(0,1)[0];
			let i=0;const imax=this.edges[u].length;
			for (;i<imax;i++) {
				edge=this.edges[u][i];
				if (this.level[edge.v] < 0 && edge.f < edge.c) {
					this.level[edge.v] = this.level[u] + 1;
					q.push(edge.v);
				}
			}
		}
		return this.level[t] >= 0; // return if theres a path to t -> no level, no path!
	};
	// DFS like: send flow at along path from s->t recursivly while increasing the level of the visited vertices by one
	// u vertex, f flow on path, t =Sink , c Array, c[i] saves the count of edges explored from vertex i
	this.Dfsflow = function(u,f,t,c) { 
		if (u===t) // Sink reached , aboard recursion
			return f;
		let edge=null;
		let flow_till_here=0;
		let flow_to_t=0;
		while (c[u] < this.edges[u].length) { // Visit all edges of the vertex  one after the other
			edge=this.edges[u][c[u]];
			if (this.level[edge.v] === this.level[u]+1 && edge.f < edge.c) { // Edge leads to Vertex with a level one higher, and has flow left
				flow_till_here=Math.min(f,edge.c-edge.f);
				flow_to_t=this.Dfsflow(edge.v,flow_till_here,t,c);
				if (flow_to_t > 0 ) {
					edge.f+=flow_to_t; // Add Flow to current edge
					this.edges[edge.v][edge.r].f-=flow_to_t; // subtract from reverse Edge -> Residual Graph neg. Flow to use backward direction of BFS/DFS
					return flow_to_t;
				}
			}
			c[u]++;
		}
		return 0;
	};
	this.Bfsthecut=function(s) { // breadth-first-search which uses the level array to mark the vertices reachable from s
		let e_in_cut=[];
		this.level.fill(-1);
		this.level[s]=1;
		let q=[];
		q.push(s);
		let u=0;
		let edge=null;
		while (q.length) {
			u=q.splice(0,1)[0];
			let i=0;
			const _imax=this.edges[u].length;
			for (;i<_imax;i++) {
				edge=this.edges[u][i];
				if ( edge.f < edge.c ) {
					if (this.level[edge.v] < 1) {
						this.level[edge.v] =  1;
						q.push(edge.v);
					}
				} 
				if (edge.f===edge.c && edge.c>0) { // blocking edge -> could be in min cut
					edge.u=u;
					e_in_cut.push(edge);
				}
			}
		}
		let min_cut=[];
		let i=0;
		const imax=e_in_cut.length;
		for (;i<imax;i++) {
			if (this.level[e_in_cut[i].v] === -1) // Only edges which are blocking and lead to from s unreachable vertices are in the min cut
				min_cut.push(e_in_cut[i].u);
		}
		return min_cut;
	};
	this.Calcmincut= function(s,t) { // calculates min-cut graph (Dinic Algorithm)
		if (s==t)
			return -1;
		let returnvalue=0;
		let count=[];
		let flow=0;
		while (this.Bfs(s,t)===true) {
			count=new Array(this.v+1).fill(0);
			flow=0;
			do {
				flow=this.Dfsflow(s,Number.MAX_VALUE,t,count);
				if (flow > 0 )
					returnvalue+=flow;
			} while (flow);
		}
		return returnvalue;
	};
}

let util_mincut={
	// Function to create Source, Sink, Tiles arrays: takes a rectangle-Array as input for Tiles that are to Protect
	// rects have top-left/bot_right Coordinates {x1,y1,x2,y2}
	create_graph: function(room,ip,centerPos, sourceStructures) {
		let room_array=room_2d_array(room); // An Array with Terrain information: -1 not usable, 2 Sink (Leads to Exit)
		// For all Rectangles, set edges as source (to protect area) and area as unused 
		let r=null;
		for (let y = 2; y < 48; ++y) {
			for (let x = 2; x < 48; ++x) {
				let ipVal = ip.get(x, y);
				if (ipVal === 1) {
					room_array[x][y]= 1;
				}
			}
		}

		/*		
		//	if (ipVal == 1)
		let j=0;const jmax=rect.length;
		for (;j<jmax;j++) {
			r=rect[j];
			let x=r.x1;const maxx=r.x2+1;
			let y=r.y1;const maxy=r.y2+1;
			for (;x<maxx;x++) {
				y=r.y1;
				for (;y<maxy;y++) {
					if (x===r.x1 || x===r.x2 || y===r.y1 || y===r.y2) {
						if (room_array[x][y]===0)
							room_array[x][y]=1;
					} else 
						room_array[x][y]=-1;
				}
			}            
		}
		*/
		// ********************** Visualisierung
		if (false) {
			let visual=room.visual;
			let x=0;let y=0;const _max=50;
			for (;x<_max;x++) {
				y=0;
				for (;y<_max;y++) {    
					if ( room_array[x][y] === -1)
						visual.circle(x,y,{radius: 0.5, fill:'#111166',opacity: 0.3});
					else if ( room_array[x][y] === 0)
						visual.circle(x,y,{radius: 0.5, fill:'#e8e863',opacity: 0.3});
					else if ( room_array[x][y] === 1)
						visual.circle(x,y,{radius: 0.5, fill:'#75e863',opacity: 0.3});
					else if ( room_array[x][y] === 2)
						visual.circle(x,y,{radius: 0.5, fill:'#b063e8',opacity: 0.3});
				}
			}
		}
		
		// initialise graph 
		// possible 2*50*50 +2 (st) Vertices (Walls etc set to unused later)
		let g=new Graph(2*50*50+2);
		let infini=Number.MAX_VALUE;
		let surr=[[0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1]];
		// per Tile (0 in Array) top + bot with edge of c=1 from top to bott  (use every tile once!)
		// infini edge from bot to top vertices of adjacent tiles if they not protected (array =1) (no reverse edges in normal graph)
		// per prot. Tile (1 in array) Edge from source to this tile with infini cap.
		// per exit Tile (2in array) Edge to sink with infini cap.
		// source is at  pos 2*50*50, sink at 2*50*50+1 as first tile is 0,0 => pos 0
		// top vertices <-> x,y : v=y*50+x   and x= v % 50  y=v/50 (math.floor?)
		// bot vertices <-> top + 2500 
		let source=2*50*50;
		let sink=2*50*50+1;
		let top=0;
		let bot=0;
		let dx=0;
		let dy=0;
		let x=1;let y=1;
		let dist=0;
		let score=0;
		const max=49;
		for (;x<max;x++) {
			y=1;
			for (;y<max;y++) {
				top=y*50+x;
				bot=top+2500;
				if (room_array[x][y] === 0) { // normal Tile

					dist = Math.max(Math.abs(centerPos.x - x), Math.abs(centerPos.y - y))
					score = Math.pow(dist + 10, 1.5)/100

					if (sourceStructures[x] !== undefined && sourceStructures[x][y] !== undefined) {
						log("setting source structures cost " + score + "  at pos " +x+ ":" +y)
						score += 2;
					}
					
					g.New_edge(top,bot, 1 + score ); 

					for (let i=0;i<8;i++) {
						dx=x+surr[i][0];
						dy=y+surr[i][1];
						if (room_array[dx][dy] === 0 || room_array[dx][dy] === 2) 
							g.New_edge(bot,dy*50+dx,infini); 
					}
				} else if (room_array[x][y] === 1) { // protected Tile
					g.New_edge(source,top, infini ); 
					g.New_edge(top,bot, 1 );
					for (let i=0;i<8;i++) {
						dx=x+surr[i][0];
						dy=y+surr[i][1];
						if (room_array[dx][dy] === 0 || room_array[dx][dy] === 2) 
							g.New_edge(bot,dy*50+dx,infini); 
					}
				} else if (room_array[x][y] === 2) { // near Exit
					g.New_edge(top,sink, infini ); 
				}
			}
		} // graph finished

		return g;
	},
	delete_tiles_to_dead_ends: function(roomname,cut_tiles_array) { // Removes unneccary cut-tiles if bounds are set to include some 	dead ends
        // Get Terrain and set all cut-tiles as unwalkable
        let room_array=room_2d_array(roomname);
        for (let i=cut_tiles_array.length-1;i>=0;i--) {
            room_array[cut_tiles_array[i].x][cut_tiles_array[i].y]=UNWALKABLE;
        }
        // Floodfill from exits: save exit tiles in array and do a bfs-like search
        let unvisited_pos=[];
        let y=0;const max=49;
        for(;y<max;y++) {
            if (room_array[1][y]===TO_EXIT) unvisited_pos.push(50*y+1)
            if (room_array[48][y]===TO_EXIT) unvisited_pos.push(50*y+48)
        }
        let x=0;
        for(;x<max;x++) {
            if (room_array[x][1]===TO_EXIT) unvisited_pos.push(50+x)
            if (room_array[x][48]===TO_EXIT) unvisited_pos.push(2400+x) // 50*48=2400
        }
        // Iterate over all unvisited TO_EXIT- Tiles and mark neigbours as TO_EXIT tiles, if walkable (NORMAL), and add to unvisited
        let surr=[[0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1]];
        let index,dx,dy;
        while (unvisited_pos.length > 0) {
            index=unvisited_pos.pop();
            x=index % 50;
            y=Math.floor(index/50);
            for (let i=0;i<8;i++) {
                dx=x+surr[i][0];
                dy=y+surr[i][1];
                if (room_array[dx][dy] === NORMAL ) {
                    unvisited_pos.push(50*dy+dx);
                    room_array[dx][dy] = TO_EXIT;
                }
            }
        }
        // Remove min-Cut-Tile if there is no TO-EXIT  surrounding it
        let leads_to_exit=false;
		let protects_something=false;
        for (let i=cut_tiles_array.length-1;i>=0;i--) {
            leads_to_exit=false;
			protects_something=false;
            x=cut_tiles_array[i].x;
            y=cut_tiles_array[i].y;
			/*
            for (let i=0;i<8;i++) {
                dx=x+surr[i][0];
                dy=y+surr[i][1];
                if (room_array[dx][dy] === TO_EXIT ) {
                    leads_to_exit=true;
                }
            }*/
			for (let j=0;j<8;j++) {
                dx=x+surr[j][0];
                dy=y+surr[j][1];
                if (room_array[dx][dy] === TO_EXIT ) {
                    leads_to_exit=true;
                } else if (room_array[dx][dy] === NORMAL) {
					protects_something=true;
				}

            }
            if (!leads_to_exit || !protects_something) {
                cut_tiles_array.splice(i,1);
            }
        }
    },
	// Function for user: calculate min cut tiles from room, rect[]
	GetCutTiles: function(room, ip, centerPos, sourceStructures, bounds={x1:0,y1:0,x2:49,y2:49}) {
		let graph=util_mincut.create_graph(room, ip, centerPos, sourceStructures);
		let source=2*50*50; // Position Source / Sink in Room-Graph
		let sink=2*50*50+1;
		let count=graph.Calcmincut(source,sink);
		console.log('Number of Tiles in Cut:',count);
		let positions=[];
		if (count > 0) {
			let cut_edges=graph.Bfsthecut(source);
			// Get Positions from Edge
			let u,x,y;
			let i=0;const imax=cut_edges.length;
			for (;i<imax;i++) {
				u=cut_edges[i];// x= v % 50  y=v/50 (math.floor?)
				x=u % 50;
				y=Math.floor(u/50);
				positions.push({"x":x,"y":y});
			}
		}

		// if bounds are given,
        // try to dectect islands of walkable tiles, which are not conntected to the exits, and delete them from the cut-tiles
    //    let whole_room=(bounds.x1==0 && bounds.y1==0 && bounds.x2==49 && bounds.y2==49);
        if (positions.length > 0) {
			util_mincut.delete_tiles_to_dead_ends(room,positions);
		}
            
		// Visualise Result
		/*
		if (true && positions.length > 0) {
			let visual=room.visual;
			for (let i=positions.length-1;i>=0;i--) {
				visual.circle(positions[i].x,positions[i].y,{radius: 0.5, fill:'#ff7722',opacity: 0.9});    
			}
		}*/
		return positions;
	},
	// Example function: demonstrates how to get a min cut with 2 rectangles, which define a "to protect" area
	test: function(roomname) {
		let room=roomname;
		if (!room)
			return 'O noes, no room';
		let cpu=Game.cpu.getUsed();
		// Rectangle Array, the Rectangles will be protected by the returned tiles
		let rect_array=[];
		rect_array.push({x1: 16, y1: 13, x2:24, y2: 20});
		rect_array.push({x1: 26, y1: 16, x2:37, y2: 26});
		// Get Min cut
		let positions=util_mincut.GetCutTiles(room,rect_array); // Positions is an array where to build walls/ramparts
		// Test output
		console.log('Positions returned',positions.length);
		cpu=Game.cpu.getUsed()-cpu;
		console.log('Needed',cpu,' cpu time');
		return 'Finished';
	},
		
	createMinCutWall: function(roomname, ip, segment, centerPos, sourceStructures){
		let room=roomname;
		let positions=util_mincut.GetCutTiles(room,ip,centerPos, sourceStructures); // Positions is an array where to build walls/ramparts
		if (segment.structures[STRUCTURE_RAMPART] === undefined) {
			segment.structures[STRUCTURE_RAMPART] = {};
			segment.structures[STRUCTURE_RAMPART].pos = [];
		}
		for (let idx in positions) {
			let pos = positions[idx];		
			segment.structures[STRUCTURE_RAMPART].pos.push({ x:pos.x, y:pos.y});
		}
		segment.wallsPlaced = 1;
		return segment;
	},
};

function shortestDistToController(pos, roomName) {
	let controller = Game.rooms[roomName].controller
	let shortestDist = -1;
		
	let pathToSpawn = findTravelPath(pos , controller.pos, 
		{range: 2, offRoad: true, freshMatrix: true, maxRooms: 1, ignoreStructures: true, retry: false}); 
	if (!pathToSpawn.incomplete  && pathToSpawn.path.length) {
		shortestDist += pathToSpawn.cost;		
	}
	
	return shortestDist;	
}



function placeControllerStructures(segment, builder, dt){

	let n = 0;
	let x, y = 0;
	let ret = ulamSpiral(n);
	let validPositions = {}
	let obstructExits = addExitsAsObstacles(builder);
//	let init = Game.cpu.getUsed();
//	let startPos = Game.rooms[builder].controller.pos;
	let startPos = getFakeController(builder).pos
	let spawnPos = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE)[0];
	let maxPathLength = 0;
	let maxSpots = 0;
	
	while (ret.sq <= 3) {

		x = limit(startPos.x + ret.x, 1, 48);
		y = limit(startPos.y + ret.y, 1, 48);

		let dtSize = dt.get(x, y);
		if (dtSize > 0) {
			let pos = new RoomPosition(x, y, builder);			
			let posId = posCompress(pos)
			if (validPositions[posId] === undefined) {
				validPositions[posId] = {};
				
				let freeSpots = openAdjacentSpots(pos, true).length;
				maxSpots = Math.max(maxSpots, freeSpots);
				validPositions[posId].spots = freeSpots;
			//	drawText(builder, freeSpots, pos.x, pos.y, {color: 'red', font: 0.8});
				let path = findTravelPath(pos, spawnPos, {range: 1, offRoad: false, ignoreStructures: true, maxRooms: 1, maxOps: 5000, obstacles: obstructExits});
				let pathLength = 0;
				if (path.incomplete || willBlock(pos, spawnPos, segment) ) {
					delete validPositions[posId];			
				} else {
					pathLength = path.cost;
					maxPathLength = Math.max(maxPathLength, pathLength);
					validPositions[posId].pathToSpawn = pathLength;					
				}
			}
		}
		ret = ulamSpiral(n);
		n += 1;

	}

	let bestScore = 0;
	let bestPos;
	console.log(" pos " + Object.keys(validPositions).length)
	for (let upgraderSpot in validPositions) {		
		let score = 0;
		let posToTest = posDecompress(upgraderSpot, builder);
		for (let i = 1; i <= 8; i++) {
			let adjacentSpots = posToTest.getPositionAtDirection(i);
			let posIdAdjacent = posCompress(adjacentSpots)
			if (!validPositions[posIdAdjacent]) { continue; }
			score += 3 * validPositions[posIdAdjacent].spots / maxSpots;
			score += maxPathLength / validPositions[posIdAdjacent].pathToSpawn;
		}
		validPositions[upgraderSpot].score = score;		
		
		if (score > bestScore) {
			bestScore = score;
			bestPos = posToTest;
		}
	}

	console.log("best pos " + bestPos)
	if (bestPos) {
		addStructureToRoomLayout(STRUCTURE_LINK, bestPos, segment, "allowNear");
		segment.controllerLinkPos = posCompress(bestPos);

		bestScore = 0;
		let nextBestpos;
		for (let i = 1; i <= 8; i++) {
			let adjacentSpots = bestPos.getPositionAtDirection(i);
			let posIdAdjacent = posCompress(adjacentSpots)
			if (!validPositions[posIdAdjacent]) { continue; }
			if (validPositions[posIdAdjacent].score > bestScore && !willBlock(adjacentSpots, spawnPos, segment)){
				bestScore = validPositions[posIdAdjacent].score;
				nextBestpos = adjacentSpots;
			}
		}


		if (nextBestpos){
			addStructureToRoomLayout(STRUCTURE_CONTAINER, nextBestpos, segment, "allowNear");
			segment.controllerContainerPos = posCompress(nextBestpos);
		}
	}
}



function addExtensionsSpiral(startPos, segmentId, segment, dt, bp, limit){

	if (global.extensionPlan === undefined) { global.extensionPlan = {}; }
	if (global.extensionPlanCache === undefined) { global.extensionPlanCache = {}; }

	let requiredSpace = requiredSpaceForBlueprint(bp);
	let roomName = startPos.roomName
	if (global.extensionPlan[roomName] === undefined ||
		global.extensionPlan[roomName].sorted === undefined
		) {

		if (global.extensionPlanCache[roomName] === undefined) { 
			global.extensionPlanCache[roomName] = {
				pathStart: {},
				distExit: {},
				distSource: {}
			}; 
		}
		let cache = global.extensionPlanCache[roomName]

		if (global.extensionPlan[roomName] === undefined)	{ 
			console.log("new extension plan! ")
			global.extensionPlan[roomName] = {}; 
		}

		let maxX = Math.min(49, (limit.maxX || 49) +3);
		let maxY = Math.min(49, (limit.maxY || 49) +3);
		let minX = Math.max(0, (limit.minX || 0) -3);
		let minY = Math.max(0, (limit.minY || 0) -3);

		log(JSON.stringify(limit))

		let n = global.extensionPlan[roomName].n || 0;
		let sortable = global.extensionPlan[roomName].sortable || [];
		let testedPos = global.extensionPlan[roomName].testedPos || {};

		let x, y = 0;
		let range = 32;
		let ret = ulamSpiral(n);
		let pos, bpPos;
				
		
		let maxDistExit = global.extensionPlan[roomName].maxDistExit || 1;
		let maxPathLength = global.extensionPlan[roomName].maxPathLength || 1;
		let maxDtSize = 1;
		let maxSq = 1;
		let maxDistRes = global.extensionPlan[roomName].maxDistRes || 1;
		let obstructExits = addExitsAsObstacles(roomName);
		let init = Game.cpu.getUsed();
		while (ret.sq <= range) {
			
			x = startPos.x + ret.x			
			y = startPos.y + ret.y
			if (x < minX || x > maxX || y < minY || y > maxY) {
				ret = ulamSpiral(n);
				n += 1;
				continue;
			}

		//	x = limit(startPos.x + ret.x, 1, 48);
		//	y = limit(startPos.y + ret.y, 1, 48);

			if (Game.cpu.getUsed() > 450) {
				global.extensionPlan[roomName].n = n;
				global.extensionPlan[roomName].sortable = sortable;
				global.extensionPlan[roomName].testedPos = testedPos;
				global.extensionPlan[roomName].maxDistExit = maxDistExit;
				global.extensionPlan[roomName].maxPathLength = maxPathLength;
				global.extensionPlan[roomName].maxDistRes = maxDistRes;
				return ERR_BUSY;
			}
			if ((x % 4 === 0 && y % 4 === 0) || (x % 4 == 2 && y % 4 == 2)  ) {
			//	log("pos " + x +":" + y)
				bpPos = new RoomPosition(x, y, roomName);
				let posCompressed = posCompress(bpPos)
				if (testedPos[posCompressed] === undefined) {
					testedPos[posCompressed] = {};

					let pathLengthOrigin = -1;	// use path length instead, same origin
					
				//	bpPos = shiftPositionToCenter(pos, requiredSpace);

					if (isOutsideWalls(bpPos, undefined, segmentId) ) { 
						drawText(roomName, "OUT", bpPos.x, bpPos.y, {color: 'red', font: 0.5});
						continue;
					}

					if (cache.pathStart[posCompressed] === undefined) {
						cache.pathStart[posCompressed] = findTravelPath(startPos, bpPos, {range: 2, offRoad: false, maxRooms: 1, maxOps: 3000, ignoreStructures: true, ignoreCreeps: true, obstacles: obstructExits, retry: false});
					}
					let path = cache.pathStart[posCompressed]
					
					let pathLength = -1;
					if ((!path.incomplete && path.path.length) || startPos.getRangeTo(bpPos) <= 2) {
						pathLength = path.cost;
						maxPathLength = Math.max(maxPathLength, pathLength);
					} else {
						drawText(roomName, "REA", bpPos.x, bpPos.y, {color: 'red', font: 0.5});
					}

					maxSq = Math.max(maxSq, ret.sq);

					if (cache.distExit[posCompressed] === undefined) {
						cache.distExit[posCompressed] = distToNearestExit(bpPos, roomName);
					}
					let distToExit = cache.distExit[posCompressed]
					maxDistExit = Math.max(maxDistExit, distToExit);

					let dtSize = dt.get(x, y);
					maxDtSize = Math.max(maxDtSize, dtSize);

					if (cache.distSource[posCompressed] === undefined) {
						cache.distSource[posCompressed] = distToResources(bpPos, roomName);
					}
					
					let pathLengthRes = cache.distSource[posCompressed]
					maxDistRes = Math.max(maxDistRes, pathLengthRes);

					let score = 0;
					
				//	bpPos2 = shiftPositionToCenter(bpPos2, requiredSpace);
					sortable.push([bpPos, score, pathLengthOrigin, pathLength, ret.sq, distToExit, dtSize, pathLengthRes]);
				//	drawText(roomName, score.toFixed(1), bpPos.x, bpPos.y, {color: 'red', font: 0.8});
				}
			}
			ret = ulamSpiral(n);
			n += 1;
		}

		let time = Game.cpu.getUsed()-init;
		console.log(roomName + " evaluated ext pos " +time);

		for (let idx in sortable) {
			let score = 0;	// lower is better

		//	score += sortable[idx][2] / maxPathLengthOrigin;

			let temp = sortable[idx][3]
			if (sortable[idx][3] === -1) {
				temp = maxPathLength;
			}
			score += 7 * (temp / maxPathLength);	// ATLEAST HALF SHOULD GO HERE

			// ret.sq
			//	score -= (temp + 1) / (sortable[idx][4] + 1);

			temp = sortable[idx][5]
			if (sortable[idx][5] === -1) {
				temp = maxDistExit;
			}
			score -= 2 * (temp / maxDistExit);

		//	score -= 1 * sortable[idx][6] / maxDtSize;

			temp = sortable[idx][7]
			if (sortable[idx][7] === -1) {
				temp = maxDistRes;
			}
			score += 3 * (temp / maxDistRes);
			sortable[idx][1] = score;
		}

		sortable.sort(function(a, b) {
			return (a[1] - b[1]);});

		
		global.extensionPlan[roomName].sorted = sortable;
	}

	if (!global.extensionPlan[roomName] ||
		!global.extensionPlan[roomName].sorted ) {
			return ERR_BUSY;
	}

	/*
	let wantedExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][CONTROLLER_MAX_LEVEL]
	if (ENABLE_DYNAMIC_LABS) {
		let currentLabs = getAllAsCompressedPosFromBlueprint(segment, startPos.roomName, STRUCTURE_LAB)
		let missingLabs = CONTROLLER_STRUCTURES[STRUCTURE_LAB][CONTROLLER_MAX_LEVEL] - Object.keys(currentLabs).length;
		wantedExtensions += missingLabs
	}*/

	let wantedExtensions = getWantedExtensions(segment, startPos.roomName, ENABLE_DYNAMIC_LABS)


	for (let i= global.extensionPlan[startPos.roomName].i || 0; i<global.extensionPlan[startPos.roomName].sorted.length; i++) {
		let pos = global.extensionPlan[startPos.roomName].sorted[i][0];
		drawText(startPos.roomName, i, pos.x, pos.y, {color: 'red', font: 0.8});
		if (Game.cpu.getUsed() > 450) { 
			console.log("abort extensions due to high cpu " + Game.cpu.getUsed().toFixed(2) + ", cycles done " + i)
			global.extensionPlan[startPos.roomName].i = i;
			return ERR_BUSY;
		}

		let bpPos = shiftPositionToCenter(pos, requiredSpace);
		addBlueprintToRoomLayout(bp, bpPos, segment, true, dt);
		if (countCurrentBuildingType(segment, STRUCTURE_EXTENSION) >= wantedExtensions + 5) { 
			break;
		}
	}

	let result = OK;
	let placedExtensions = countCurrentBuildingType(segment, STRUCTURE_EXTENSION)
	console.log("addExtensionsSpiral extensions placed " + placedExtensions + "/" +wantedExtensions)
	if (placedExtensions < wantedExtensions) { 		
		result = -1;
	}

    return result;
}

function getWantedExtensions(segment, roomName, enableDynamicLabs) {

	let wantedExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][CONTROLLER_MAX_LEVEL]
	if (enableDynamicLabs) {
		let currentLabs = getAllAsCompressedPosFromBlueprint(segment, roomName, STRUCTURE_LAB)
		let missingLabs = CONTROLLER_STRUCTURES[STRUCTURE_LAB][CONTROLLER_MAX_LEVEL] - Object.keys(currentLabs).length;
		wantedExtensions += missingLabs
	}

	return wantedExtensions
}


function floodFillReachable(cm, pos, first = false){	

	let roomName = pos.roomName;
	let id = posId(pos);
	if (!global.floodFillReachableCm[roomName].pos[id]) {
		global.floodFillReachableCm[roomName].pos[id] = {};
		let value = cm.get(pos.x, pos.y);
		if ((value !== 255 && value !== 0) || first) {

		//	Game.rooms[roomName].visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'}) 

			global.floodFillReachableCm[roomName].posConfirmed[posCompress(pos)] = {};			
			// TEST ALL CONNECTED PIXELS
			floodFillReachable(cm, pos.getPositionAtDirection(TOP));
			floodFillReachable(cm, pos.getPositionAtDirection(RIGHT));
			floodFillReachable(cm, pos.getPositionAtDirection(BOTTOM));
			floodFillReachable(cm, pos.getPositionAtDirection(LEFT));

			floodFillReachable(cm, pos.getPositionAtDirection(TOP_RIGHT));
			floodFillReachable(cm, pos.getPositionAtDirection(TOP_LEFT));
			floodFillReachable(cm, pos.getPositionAtDirection(BOTTOM_RIGHT));
			floodFillReachable(cm, pos.getPositionAtDirection(BOTTOM_LEFT));
		}
	}
}

function countCostMatrix(cm, valueToCheck) {
	let count = 0;

	for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
			let value = cm.get(x, y);
			if (value === valueToCheck) { count++ }
		}
	}
	return count;

}

function createCmOfFloodFillResult(cm, pos, limitObject){

	if (global.floodFillReachableCm === undefined) { global.floodFillReachableCm = {} }
	let roomName = pos.roomName;

	if (!global.floodFillReachableCm[roomName] ||	 
		!global.floodFillReachableCm[roomName].cm
		) {
		global.floodFillReachableCm[roomName] = {};
		global.floodFillReachableCm[roomName].pos = {};
		global.floodFillReachableCm[roomName].posConfirmed = {};
		global.floodFillReachableCm[roomName].numberOfConfirmedPos = 0;

		let newCm = new PathFinder.CostMatrix();
		floodFillReachable(cm, pos, true);

		let fillLimitObject = false;
		if (limitObject !== undefined) {
			log("limit object!")
			fillLimitObject = true

			limitObject.maxX = 0
			limitObject.maxY = 0
			limitObject.minX = 49
			limitObject.minY = 49
				
		}

		
		for (let idx in global.floodFillReachableCm[roomName].posConfirmed) {
			let posToTest = posDecompress(idx, roomName);
			newCm.set(posToTest.x, posToTest.y, 1);
			global.floodFillReachableCm[roomName].numberOfConfirmedPos++;
				
			if (fillLimitObject) {			
				limitObject.maxX = Math.max(limitObject.maxX, posToTest.x)
				limitObject.maxY = Math.max(limitObject.maxY, posToTest.y)
				limitObject.minX = Math.min(limitObject.minX, posToTest.x)
				limitObject.minY = Math.min(limitObject.minY, posToTest.y)			
			}
		}

		delete global.floodFillReachableCm[roomName].pos;
		delete global.floodFillReachableCm[roomName].posConfirmed;
		global.floodFillReachableCm[roomName].cm = newCm.serialize();

		return newCm;
	}
	return PathFinder.CostMatrix.deserialize(global.floodFillReachableCm[roomName].cm);
}


function getWallSegmentToRemove(segment, builder){
	// Group ramparts
	let ungroupedRamparts = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_RAMPART);	
	let groupedRamparts = [];

	let maxSize = 5;
	while (ungroupedRamparts.length > 0) {
		let group = ungroupedRamparts[0].findInRangeOffline(ungroupedRamparts, 1);
		ungroupedRamparts.splice(0,1);

		for (let idx3 = 0; idx3 < group.length; idx3++) {
			let groupAdd = group[idx3].findInRangeOffline(ungroupedRamparts, 1);
			group = group.concat(groupAdd);
			group = _.uniq(group);
			if (group.length >= maxSize) { break; }
		}
		groupedRamparts.push(group);
		ungroupedRamparts = _.difference(ungroupedRamparts, group);
	}

	if (segment.structures["dummy"] === undefined) {
		segment.structures["dummy"] = {};
		segment.structures["dummy"].pos = [];
	}

	if (!segment.allRampartIdx) {
		segment.allRampartIdx = groupedRamparts.length-1 + segment.sourcesToProtect.length;
	}

	let dt = buildablePixelsForRoom(builder, undefined, true, true);	
	console.log("removing wall idx " + segment.curRampartIdx + "/" +segment.allRampartIdx )
	
	if (segment.curRampartIdx < groupedRamparts.length) {
		for (let idx in groupedRamparts[segment.curRampartIdx]) {
			let pos = groupedRamparts[segment.curRampartIdx][idx];
		//	if (pos.isNearExit(2)) { continue; }
			drawText(builder, "_", pos.x, pos.y, {color: 'red', font: 0.8});
		//	if (pos.isNearExit(2)) { continue; }
			if (dt.get(pos.x, pos.y) !== 1) { continue; }
			segment.structures["dummy"].pos.push({x: pos.x, y: pos.y});
		}
	} else {

		if (segment.curSourceIdx === undefined) { 
			segment.curSourceIdx = 0; 
		} else {
			segment.curSourceIdx++;
		}
		 

		

	//	console.log("segment.curRampartIdx invalid! " + segment.curRampartIdx +"/"+ groupedRamparts.length)
	}
	return;
}


function addDummyStructuresToExpand(segment, builder){

	// Group ramparts
	let ungroupedRamparts = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_RAMPART);	
	let groupedRamparts = [];
	while (ungroupedRamparts.length > 0) {
		let group = ungroupedRamparts[0].findInRange(ungroupedRamparts, 1);
		ungroupedRamparts.splice(0,1);
	
		for (let idx3 = 0; idx3 < group.length; idx3++) {
			let groupAdd = group[idx3].findInRange(ungroupedRamparts, 1);
			group = group.concat(groupAdd);
			group = _.uniq(group);
		}
		groupedRamparts.push(group);
		ungroupedRamparts = _.difference(ungroupedRamparts, group);
	}

	let sortable = [];
	let score = 0;

	let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);
	let baseCenterPos = spawns[0].getPositionAtDirection(BOTTOM_RIGHT);
//	let obstructExits = addExitsAsObstacles(builder);
	let maxSize = 1;
	let maxDistExit = 1;
	let maxDistRes = 50;
	let maxPathLength = 1;
	for (let idx = 0; idx < groupedRamparts.length; idx++) {
		let x = 0;
		let y = 0;
		for (let idx2 = 0; idx2 < groupedRamparts[idx].length; idx2++) {	
			x += groupedRamparts[idx][idx2].x;
			y += groupedRamparts[idx][idx2].y;
		}
		x =	Math.ceil(x / groupedRamparts[idx].length);
		y =	Math.ceil(y / groupedRamparts[idx].length);
		
		let rampartGroupPos = new RoomPosition(x, y, builder);

		let distToExit = distToNearestExit(rampartGroupPos, builder);
		
		maxDistExit = Math.max(maxDistExit, distToExit);

		let size = groupedRamparts[idx].length;
		maxSize = Math.max(maxSize, size);

		let pathLengthRes = distToResources(rampartGroupPos, builder);
		
		
		let path = findTravelPath(baseCenterPos, rampartGroupPos, {range: 2, offRoad: true, maxRooms: 1, maxOps: 3000, freshMatrix: true, ignoreStructures: true});
		let pathLength = -1;
		if (!path.incomplete) {
			pathLength = path.cost;
			maxPathLength = Math.max(maxPathLength, pathLength);
		}

		sortable.push([groupedRamparts[idx], score, size, distToExit, pathLengthRes, pathLength ]);
	}


	for (let idx in sortable) {
		score = 0;	// lower is better

		
		// size, prefer small
		let temp = sortable[idx][2]
		score += 9 * (temp / maxSize);	
		
		// dist to exit, prefer to move to dead ends
		temp = sortable[idx][3]
		if (sortable[idx][3] <= 2) {
			score += 100;	// cant move further towards exit
		}
		score -= 3 * (temp / maxDistExit);		
		
		// prefer to move towards sources
		temp = sortable[idx][4];		
		score += 3 * (temp / maxDistRes);
		
		// distance to spawn
		temp = sortable[idx][5]
		if (sortable[idx][5] === -1) {
			temp = maxPathLength;
		}
		score += 3 * (temp / maxPathLength);
		
		sortable[idx][1] = score;
	}

	sortable.sort(function(a, b) {
		return (a[1] - b[1]);});

	if (segment.structures["dummy"] === undefined) {
		segment.structures["dummy"] = {};
		segment.structures["dummy"].pos = [];
	}

	/*
	for (let idx in sortable) {
		for (let idx2 in sortable[idx][0]) {
			let pos = sortable[idx][0][idx2];
			let pos = sortable[idx][0][idx2];
			drawText(builder, sortable[idx][1].toFixed(1), pos.x, pos.y, {color: 'red', font: 0.8});
		//	drawText(builder, idx, pos.x, pos.y, {color: 'red', font: 0.8});
		}
	}*/

	let removedWalls = 0;
	for (let wallIdx in sortable) {
		for (let idx in sortable[wallIdx][0]) {
			let pos = sortable[wallIdx][0][idx];
			
			drawText(builder, "_", pos.x, pos.y, {color: 'red', font: 0.8});
			if (pos.isNearExit(2)) { continue; }
			removedWalls++;
			segment.structures["dummy"].pos.push({x: pos.x, y: pos.y});
		}
		if (removedWalls > 0) {break;}
	}
	return;
}


function distToResources(pos, roomName) {
	let sources = getFakeSources(roomName)
	let shortestDist = -1;
	for (let idx in sources){	
		
		let range = getRangeTo(pos, sources[idx].pos)
		if (range <= 1) {
			shortestDist += range
		} else {
			let pathToSpawn = findTravelPath(pos , sources[idx].pos, 
				{range: 2, offRoad: true, freshMatrix: true, maxRooms: 1, ignoreStructures: true, retry: false}); 
			if (!pathToSpawn.incomplete  && pathToSpawn.path.length) {
				shortestDist += pathToSpawn.cost;		
			}
		}
		
	}
	return shortestDist;	
}

function distToNearestExit(pos, roomName) {
	let exits = findReducedExits(roomName)
	let shortestDist = -1;
	for (let exit in exits){
		let pathToSpawn = findTravelPath(exits[exit], pos,
			{range: 2, offRoad: true, freshMatrix: true, maxRooms: 1, ignoreStructures: true, retry: false}); 
		if (!pathToSpawn.incomplete && pathToSpawn.path.length) {
			if (pathToSpawn.path.length < shortestDist) {
				shortestDist = pathToSpawn.path.length;
			}
		}
	}
	return shortestDist;	
}

function addExitsAsObstacles(roomName){
	let exits = getFakeExits(roomName)
	let obstacles = [];
	let testedPos = {};
	for (let idxExit= 0 ; idxExit<exits.length; idxExit++) {
		let n = 0;
		let x, y = 0;	
		let range = 2;
		
		let ret = ulamSpiral(n);
		let startPos = new RoomPosition(exits[idxExit].x, exits[idxExit].y, roomName);
		while (ret.sq <= range) {
			ret = ulamSpiral(n);
			n += 1;
			if (ret.sq <= range) {
				x = limit(startPos.x + ret.x, 1, 48);
				y = limit(startPos.y + ret.y, 1, 48);
				let posToTest = new RoomPosition(x, y, roomName);
				if (testedPos[posToTest] === undefined) {
					testedPos[posToTest] = {};
					obstacles.push(posToTest);
				//	drawText(roomName, "x", posToTest.x, posToTest.y, {color: 'red', font: 0.8});
				}
							
			}
		}
	}
	return obstacles;
}




function cleanOverlappingRoads(segment, roomName) {
	let dtMatrix = new PathFinder.CostMatrix();
	dtMatrix = addBlueprintsToDtMatrix(segment, dtMatrix, 255);

	if (ENABLE_SPAWN_EXTENSIONS) {

		if (segment.fillerPos) {
			let fillerPos = packrat.unpackPosList(segment.fillerPos)
			for (let idx in fillerPos) {
				dtMatrix.set(fillerPos[idx].x, fillerPos[idx].y, 255);
			}
		}
		
		
		if (segment.cranePos) {
			let cranePos = posDecompress(segment.cranePos, roomName);
			dtMatrix.set(cranePos.x, cranePos.y, 255);
		}
	}
	

	let roads = segment.structures[STRUCTURE_ROAD].pos;	
	let idx = roads.length
//	let length = roads.length - 1;	
	let roadsFixed = 0;
	let duplicate = {};
	while(idx--) {
//	for (let idx = length-1; idx > 0; idx--) {		
		if (dtMatrix.get(roads[idx].x, roads[idx].y) >= 255) {
		//	log("### found invalid road! " + roads[idx].x + ":" + roads[idx].y)
			roads.splice(idx,1);
			roadsFixed++;
			continue;
		}
		let terrain = getRoomTerrainAt(roads[idx].x, roads[idx].y, roomName);
		if (terrain === TERRAIN_MASK_WALL ) {			
			
			console.log("removing tunnel! " + roads[idx].x + ":" + roads[idx].y);
			roads.splice(idx,1);
			roadsFixed++;
			continue;
		}

		let id = roads[idx].x + ":" + roads[idx].y;
		if (duplicate[id]) {
		//	console.log("### found duplicate road! " + roads[idx].x + ":" + roads[idx].y)
			roads.splice(idx,1);
			roadsFixed++;
			continue;
		} else {
			duplicate[id] = {};
		}
	}
	console.log("### cleanOverlappingRoads " + roomName + " cleaned roads : " + roadsFixed);

}


function addRoadsToMatrix(segment, matrix, builder){
	let buildings = segment.structures;

	let avoid = [];
	if (segment.controllerContainerPos) {
		avoid.push(posDecompress(segment.controllerContainerPos, builder))
	}
	if (segment.controllerLinkPos) {
		avoid.push(posDecompress(segment.controllerLinkPos, builder))
	}

	for (let idxAvoid in avoid) {
		let curPos = avoid[idxAvoid]
		let curValue = matrix.get(curPos.x, curPos.y);
		if (curValue === 1) {
			matrix.set(curPos.x, curPos.y, 10);
		}
		for (let i = 1; i <= 8; i++) {
			let position = curPos.getPositionAtDirection(i);
			curValue = matrix.get(position.x, position.y);
			if (curValue === 1) {
				matrix.set(position.x, position.y, 10);
			}
		}
	}

	if (buildings[STRUCTURE_ROAD]) {		
		for (let idx = 0; idx < buildings[STRUCTURE_ROAD].pos.length; idx++) {
		//	buildings[STRUCTURE_ROAD].pos[idx].x
			matrix.set(buildings[STRUCTURE_ROAD].pos[idx].x, buildings[STRUCTURE_ROAD].pos[idx].y, 1);
		}		
	}

	
	return matrix;
}


function adjacentBuildingInBlueprint(segment, pos, ignoreExtension=true){
	let roomName = pos.roomName;
	// BUILD CACHE
	if (!global.blueprintCache) { global.blueprintCache = {}; }
	let id = roomName+ignoreExtension

	let highTrafficStructure = {
		[STRUCTURE_SPAWN]: {},
		[STRUCTURE_STORAGE]: {},
		[STRUCTURE_TERMINAL]: {},
		[STRUCTURE_EXTRACTOR]: {},
	}

	if (!global.blueprintCache[id] || global.blueprintCache[id].ts !== Game.time) {
		global.blueprintCache[id] = {};
		global.blueprintCache[id].ts = Game.time;
		global.blueprintCache[id].pos = {};		
		global.blueprintCache[id].posTraffic = {};	
		let buildings = segment.structures;
		for (let building in buildings){
						
			if (building === "dummy") { continue; }
			if (building === STRUCTURE_ROAD) { continue; }
			for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			//	posKey = new RoomPosition(buildings[building].pos[idx].x, buildings[building].pos[idx].y, roomName);
			//	Game.rooms[roomName].visual.circle(posKey.x, posKey.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'}) 
			//	global.blueprintCache[roomName].pos[posCompress(posKey)] = {};


				if (buildings[building].pos[idx].info === "allowNear") { continue; }
				
				if (ignoreExtension && (building === STRUCTURE_EXTENSION && !buildings[building].pos[idx].fixed) ) { continue; }
				global.blueprintCache[id].pos[posCompressXY(buildings[building].pos[idx].x, buildings[building].pos[idx].y)] = {};
				if (highTrafficStructure[building]) {
					global.blueprintCache[id].posTraffic[posCompressXY(buildings[building].pos[idx].x, buildings[building].pos[idx].y)] = {};
				}
			}
		}
	}

	let posToCheck;
	let xStart = pos.x - 1;
	let yStart = pos.y - 1;

	for (let i = 1; i <= 8; i++) {
		posToCheck = pos.getPositionAtDirection(i);
		//	Game.rooms[roomName].visual.circle(posToCheck.x, posToCheck.y , {fill: 'transparent', radius: 0.50, stroke: 'green'}) 
		
		if (i % 2 == 1) {
			if (global.blueprintCache[id].pos[posCompress(posToCheck)]) { 			
				return true;
			}
		} else {
			if (global.blueprintCache[id].posTraffic[posCompress(posToCheck)]) { 	
				return true;
			}
		}	
		
	}

	/*
	for (let idx_x = xStart; idx_x < xStart+3; idx_x++) {
		for (let idx_y = yStart; idx_y < yStart+3; idx_y++) {
			posToCheck = new RoomPosition(idx_x, idx_y, roomName);
		//	Game.rooms[roomName].visual.circle(posToCheck.x, posToCheck.y , {fill: 'transparent', radius: 0.50, stroke: 'green'}) 
			if (global.blueprintCache[id].pos[posCompress(posToCheck)]) { 			
				return true;
			}
		}
	}*/
}


function setOptimalStorageLinkPos(segment, builder){

	let targetLinks = [];
	targetLinks.push(posDecompress(segment.controllerLinkPos, builder));

	if (ENABLE_SPAWN_EXTENSIONS) {
		targetLinks.push(posDecompress(segment.spawnLinkPos, builder));
	}	

	let storeLinkPos = posDecompress(segment.storeLinkPos, builder);
	if (!storeLinkPos) {
		log(builder +" setOptimalStorageLinkPos no storelinkPos!")
		return
	}

	let bestScore = 0;
	for (let idx in targetLinks) {
		bestScore += storeLinkPos.getRangeTo(targetLinks[idx])**2
	}
	
	let possibleStoreLinkPos = []

	possibleStoreLinkPos.push({pos: getAllAsPosFromBlueprint(segment, builder, STRUCTURE_NUKER)[0], type: STRUCTURE_NUKER});
	possibleStoreLinkPos.push({pos: getAllAsPosFromBlueprint(segment, builder, STRUCTURE_POWER_SPAWN)[0], type: STRUCTURE_POWER_SPAWN});
	possibleStoreLinkPos.push({pos: getAllAsPosFromBlueprint(segment, builder, STRUCTURE_FACTORY)[0], type: STRUCTURE_FACTORY});
	possibleStoreLinkPos.push({pos: getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN)[2], type: STRUCTURE_SPAWN});
//	possibleStoreLinkPos.push({pos: getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE)[0], type: STRUCTURE_STORAGE});
//	possibleStoreLinkPos.push({pos: getAllAsPosFromBlueprint(segment, builder, STRUCTURE_TERMINAL)[0], type: STRUCTURE_TERMINAL});
	possibleStoreLinkPos.push({pos: posDecompress(segment.craneExtPos[0], builder), type: STRUCTURE_EXTENSION});

	let bestIdx;
	for (let idx in possibleStoreLinkPos) {

		let score = 0;
		for (let idx2 in targetLinks) {
			score += possibleStoreLinkPos[idx].pos.getRangeTo(targetLinks[idx2])**2
		}

		if (score < bestScore) {
			bestScore = score;
			bestIdx = idx;
		}
	}

	if (bestIdx) {
		let targetType = possibleStoreLinkPos[bestIdx].type; 
		let targetPos = possibleStoreLinkPos[bestIdx].pos;
		log("moving store link! swapping structure " + targetType + " at pos " + targetPos + " with current store link pos " +storeLinkPos)

		// remove destination
		let indexToRemove = _.findIndex(segment.structures[targetType].pos, function(c) {
			return c.x == targetPos.x && c.y == targetPos.y ;
		});

		if (targetType === STRUCTURE_STORAGE) {

		}

		if (targetType === STRUCTURE_EXTENSION) {
			segment.craneExtPos[0] = posCompress(storeLinkPos);
		}
		segment.structures[targetType].pos[indexToRemove] = { x:storeLinkPos.x, y:storeLinkPos.y};

		// original link
		let indexToReplace = _.findIndex(segment.structures[STRUCTURE_LINK].pos, function(c) {
			return c.x == storeLinkPos.x && c.y == storeLinkPos.y ;
		});

		segment.structures[STRUCTURE_LINK].pos[indexToReplace] = { x:targetPos.x, y:targetPos.y};
		segment.storeLinkPos = posCompress(targetPos);		
	}


}


function placeSourceLinks(segment, builder) {
	if (segment.sourceLinkPos === undefined) { 
		delete segment.sourceLinkPos
		segment.sourceLinkPos = [];
	}
	
	let sources = getFakeSources(builder)
	let storagePos = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE);		
	let sortable = [];
	for (let i = 0; i < sources.length; i++) {
		let road = findTravelPath(storagePos[0], sources[i].pos, { ignoreCreeps: true, freshMatrix: true, ignoreStructures: true });
		let length = road.path.length;
		sortable.push([i, length]);
		/* Always add link and extensions

	//	console.log(" source "+ length)
		if (length > 5) {
			sortable.push([i, length]);
		} else {
			let containerPos = sources[i].getHarvesterPos(builder, storagePos[0], true);
			addStructureToRoomLayout(STRUCTURE_CONTAINER, containerPos, segment);
		}*/

		
	}
	sortable.sort(function(a, b) {
		return b[1] - a[1];});

	
	let mineral = Memory.rooms[builder].mineral;

	segment.sourceExtensionPos = [];

	// Make sure all sources can be reached and gets a container
	for (let i=0; i<sortable.length; i++) {
		let idx = sortable[i][0];
		let containerPos = sources[idx].pos.getHarvesterPos(builder, storagePos[0], true);
	//	let containerPos = Game.getObjectById(sources[idx].id).getHarvesterPos(builder, storagePos[0], true);
		addStructureToRoomLayout(STRUCTURE_CONTAINER, containerPos, segment);
		addRoadToBluePrint(storagePos[0], containerPos, segment);
	}

	for (let i=0; i<sortable.length; i++) {
		let idx = sortable[i][0];
		let containerPos = sources[idx].pos.getHarvesterPos(builder, storagePos[0], true);
	//	let containerPos = Game.getObjectById(sources[idx].id).getHarvesterPos(builder, storagePos[0], true);
		addStructureToRoomLayout(STRUCTURE_CONTAINER, containerPos, segment);
		addRoadToBluePrint(storagePos[0], containerPos, segment);
		log("dest " + storagePos[0] + " source " + sources[idx])
		

		let existingRoads = getAllAsCompressedPosFromBlueprint(segment, builder, STRUCTURE_ROAD);

		let existingLinks = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_LINK);
		for (let linkIdx in existingLinks) {
			if (containerPos.getRangeTo(existingLinks[linkIdx]) <= 1) { continue; }
		}

		let bestPos;
		let bestScore = Infinity;
		let possiblePositions = [];
		for (let x=-1; x<=1; x++){
			for (let y=-1; y<=1; y++){
				if (x === 0 && y === 0) { continue; }
				let pos = new RoomPosition(containerPos.x + x, containerPos.y + y, builder);				
				if (pos.isNearExit(1) ) { continue; }				
				
				if (existingRoads[posCompress(pos)] === undefined) {
					drawCircle(builder, pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'});	
				
					if (posIsInBlueprint(segment, pos, STRUCTURE_EXTENSION)) { continue; }
					if (posIsInBlueprint(segment, pos, STRUCTURE_CONTAINER)) { continue; }

					let score = storagePos[0].getRangeTo(pos)
					if (pos.getRangeTo(posDecompress(mineral[0], builder)) <= 1) {
						score += 10;
					} else {
						possiblePositions.push(pos)
					}

					if (score < bestScore) {
						if (!willBlock(pos, storagePos[0], segment)) { 
							bestScore = score;
							bestPos = pos;
						}
					}
				}
			}
		}

		if (bestPos) {
			addStructureToRoomLayout(STRUCTURE_LINK, bestPos, segment, "allowNear");		
			segment.sourceLinkPos.push(posCompress(bestPos));

			if (ENABLE_SOURCE_EXTENSIONS) {
				for (let idxExt in possiblePositions) {
					let currentPos = possiblePositions[idxExt];
					if (posIsInBlueprint(segment, currentPos, STRUCTURE_CONTAINER)) { continue; }
					if (posIsInBlueprint(segment, currentPos, STRUCTURE_LINK)) { continue; }
					if (bestPos.x == currentPos.x && bestPos.y === currentPos.y) { continue; }
					if (!willBlock(currentPos, storagePos[0], segment)) { 
						addStructureToRoomLayout(STRUCTURE_EXTENSION, currentPos, segment, "allowNear");
						segment.sourceExtensionPos.push(posCompress(currentPos))
					}
				}
			}
		}
	}

	// Swap link order
	sortAllByDistanceFrom(segment, builder, STRUCTURE_LINK, storagePos[0], false);	

	// Mark as source structures to allow extensions to be placed next to these

	let links = segment.sourceLinkPos;
	links = links.concat(segment.controllerLinkPos);

	for (let idx in links) {
		let pos = posDecompressXY(links[idx], builder)

		for (let _idx in segment.structures[STRUCTURE_LINK].pos) {
			if (segment.structures[STRUCTURE_LINK].pos[_idx].x === pos.x && segment.structures[STRUCTURE_LINK].pos[_idx].y === pos.y) {
				segment.structures[STRUCTURE_LINK].pos[_idx].info = "allowNear"
			}
		}
	}	
}



function createWallLimitMatrixFromSegment(roomName, segment = {}, matrix) {
	if (!matrix) {
		matrix = new PathFinder.CostMatrix();
	}    

	if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
		console.log(" wallsLimitV2 no access to id " +SEGMENT_ALL_ROOM_OOB);
		return 0;
	}
	let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);

	let segmentId = segment.segmentId || roomName;
	let ramparts = getAllAsPosFromBlueprint(segment, roomName, STRUCTURE_RAMPART);
	for (let rampart of ramparts) {				
	//	if (!rampart.isPassible(true)) { continue }

		let startX = rampart.x - 2;
		let startY = rampart.y - 2;
		for (let y = startY; y <= rampart.y + 2; ++y) {
			for (let x = startX; x <= rampart.x+2; ++x) {
				if (x < 0 || x > 49 || y < 0 || y > 49 ) { continue; }

				let terrain = getRoomTerrainAt(x, y, roomName);
				if (terrain === TERRAIN_MASK_WALL) { continue; }

				if (isOutsideWallsXY(x, y, roomName, segmentOOB, segmentId)) {
					matrix.set(x, y, 0xff);	
				} else {
					let matrixValue = 10;
					if (terrain === TERRAIN_MASK_SWAMP ) {
						matrixValue += 5;
					}
					matrix.set(x, y, matrixValue);
				}
			}
		}
	}
			
	for (let rampart of ramparts) {
	//	if (rampart.isPassible(true) ){
			// set rampart costs to same as road
			matrix.set(rampart.x, rampart.y, 1);
	//	}
	}
	return matrix;
}


global._getRoomCosts = {}
function getRoomCosts(roomName, centerPos) {

	let id = roomName + centerPos;

	if (global._getRoomCosts[id] === undefined) {
		
		const cm = new PathFinder.CostMatrix();
	//	cm._bits.fill(255);	
	
	
		for (let x = 0; x <= 49; ++x) {
			for (let y = 0; y <= 49; ++y) {
			

				if (getRoomTerrainAt(x, y, roomName) === TERRAIN_MASK_WALL) {
					cm.set(x, y, 255);
					continue; 
				}
				
				if (wallOrAdjacentToExit(x, y, roomName)) {
					continue;
				}
	
				if (getRoomTerrainAt(x, y, roomName) !== TERRAIN_MASK_WALL) {
					const dist = Math.max(Math.abs(centerPos.x - x), Math.abs(centerPos.y - y))
					const score = 1 + Math.ceil(Math.pow(dist + 10, 1.5)/100)
					cm.set(x, y, score);
				} else {
					
				}
			}
		}


		global._getRoomCosts[id] = {
			cm: cm.serialize()
		}




		displayCostMatrix(cm, roomName);
		return cm
	}
	
	return PathFinder.CostMatrix.deserialize(global._getRoomCosts[id].cm);		
}


function chooseWall(segment, builder){
	let byPathLength = segment.structures[STRUCTURE_RAMPART].pos.length;
	let byExitLength = Object.keys(segment.walls.rampart).length;
	console.log("wall lengths - byPathLength: " +byPathLength + " byExitLength: " +byExitLength);

	if (byPathLength <= byExitLength )  {
		segment.wallChoosen = "byPath";
		segment.walls = {};
	} else {
		segment.wallChoosen = "byExit";
		segment.structures[STRUCTURE_RAMPART] = {};
		segment.structures[STRUCTURE_RAMPART].pos = [];
		for (let posIdx in segment.walls.rampart) {
			let pos = posDecompress(posIdx, builder);
			segment.structures[STRUCTURE_RAMPART].pos.push({x:pos.x, y:pos.y});
		//	this.createConstructionSite(pos, STRUCTURE_RAMPART)		
		}
		segment.walls = {};
	}
	console.log("wallChoosen " + segment.wallChoosen);
	return segment;
}




/*
global.getOOBforRoom = function(roomName) {
	if (!global.OOB[roomName]) {
		if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
			console.log(" OOB_complete no access to id " +SEGMENT_ALL_ROOM_OOB);
			return 0;
		}
		let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);		
		global.OOB[roomName] = {};
		global.OOB[roomName].posData = 
	}
	return global.OOB[roomName].posData;
}*/

function increaseBasePerimiter(segment, builder) {
	
	let ungroupedRamparts = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_RAMPART);
	let rampartRange = 1;
	let groupedRamparts = [];
	let length;
	while (ungroupedRamparts.length > 0) {
		let group = ungroupedRamparts[0].findInRange(ungroupedRamparts, rampartRange);
		ungroupedRamparts.splice(0,1);
		length = group.length;
		for (let idx3 = 0; idx3 < group.length; idx3++) {
			let groupAdd = group[idx3].findInRange(ungroupedRamparts, rampartRange);
			group = group.concat(groupAdd);
			group = _.uniq(group);
		}	
		groupedRamparts.push(group);
		ungroupedRamparts = _.difference(ungroupedRamparts, group);
	}

	let matrixdt = createWallLimitMatrixFromSegment(builder, segment);
	matrixdt = addBlueprintsToDtMatrix(segment, matrixdt, 255);

	for (let idx = 0; idx < groupedRamparts.length; idx++) {
		//
	}
}

function checkPathToExtensions(segment, builder, spawns, extensions){

	let matrixdt = createWallLimitMatrixFromSegment(builder, segment);
	matrixdt = addBlueprintsToDtMatrix(segment, matrixdt, 255);

	// Set extensions as walkable, but expensive
	let extensionsCompressed = getAllAsCompressedPosFromBlueprint(segment, builder, STRUCTURE_EXTENSION, true);
	for (let compressed in extensionsCompressed) {
		let pos = posDecompress(compressed, builder);
		matrixdt.set(pos.x, pos.y, 8);
	}

	for (let destIdx in extensions) {
		let road = findTravelPath(spawns[0], extensions[destIdx], {costMatrix: matrixdt, ignoreCreeps: true, ignoreStructures: true, freshMatrix: true, range: 1, offRoad: true, retry: false });
		if (!road.path || road.incomplete) {
			log(builder + "found invalid extensions! Cannot reach extensions from spawn " + spawns[0]);
		//	Game.rooms[builder].visual.line(spawns[spawnIdx], groupedRamparts[rampIdx][destIdx], { color: "red", lineStyle: "solid" });
			segment.roomScore = -100;
			segment.invalidBase = 'spawns cant reach extensions';
			if (Memory.invalidBase[builder] === undefined) { Memory.invalidBase[builder] = {}; }
			if (Memory.invalidBase[builder].message === undefined) { Memory.invalidBase[builder].message = []; }
			
			Memory.invalidBase[builder].message.push('spawns cant reach extensions ' + extensions[destIdx]);
			return;
		} else {
			for (let idx in road.path) {
				let pos = road.path[idx];
				if (extensionsCompressed[posCompress(pos)]) {					
					let indexToRemove = _.findIndex(segment.structures[STRUCTURE_EXTENSION].pos, function(c) {
						return c.x == pos.x && c.y == pos.y ;
						});
					log("checkPathToExtensions removing extension " + pos + " at index " + indexToRemove);
					if (indexToRemove >= 0) {
						delete extensionsCompressed[posCompress(pos)];
						matrixdt.set(pos.x, pos.y, 1);
						segment.structures[STRUCTURE_EXTENSION].pos.splice(indexToRemove, 1);
						segment.structures[STRUCTURE_ROAD].pos.push({ x:pos.x, y:pos.y});
					}
				}
			}
		}		
	}
}


function placeTowersAlongRamparts(segment, builder, segmentId){
	if (segment.towerPlacements === undefined) {
		let ungroupedRamparts = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_RAMPART);

		if (segment.rampartRange === undefined) { segment.rampartRange = 1; }
		let groupedRamparts = [];
		while (ungroupedRamparts.length > 0) {
			let group = ungroupedRamparts[0].findInRangeOffline(ungroupedRamparts, segment.rampartRange);
			ungroupedRamparts.splice(0,1);
		
			for (let idx3 = 0; idx3 < group.length; idx3++) {
				let groupAdd = group[idx3].findInRangeOffline(ungroupedRamparts, segment.rampartRange);
				group = group.concat(groupAdd);
				group = _.uniq(group);
			}
			groupedRamparts.push(group);
			ungroupedRamparts = _.difference(ungroupedRamparts, group);
		}

		if (groupedRamparts.length > CONTROLLER_STRUCTURES[STRUCTURE_TOWER][CONTROLLER_MAX_LEVEL] ) {
			if (segment.rampartRange < 8) {
				segment.rampartRange += 1;
				console.log("increasing rampart group range to "+ segment.rampartRange +", current groups: " + groupedRamparts.length);
				return segment;
			}
		}
	
		let totalSize = 0;		
		if (segment.towerPlacements === undefined) {
			segment.towerPlacements = {};			
			segment.towerPlacements.pos = [];
		}
		
		for (let idx = 0; idx < groupedRamparts.length; idx++) {
			let x = 0;
			let y = 0;
			totalSize += groupedRamparts[idx].length;
			for (let idx2 = 0; idx2 < groupedRamparts[idx].length; idx2++) {	
				x += groupedRamparts[idx][idx2].x;
				y += groupedRamparts[idx][idx2].y;
			}
			x =	Math.ceil(x / groupedRamparts[idx].length);
			y =	Math.ceil(y / groupedRamparts[idx].length);
			
			segment.towerPlacements.pos.push({x:x, y:y});
			// towerPlacements.push({x:x, y:y})
			drawText(builder, idx  , x, y, {color: 'red', font: 0.8});	
		}
		console.log("total ramparts " + totalSize + " in " + groupedRamparts.length + " groups");	
	}
	
	if (segment.structures[STRUCTURE_TOWER] === undefined) {
		segment.structures[STRUCTURE_TOWER] = {};
		segment.structures[STRUCTURE_TOWER].pos = [];
	}
	console.log("tower placement start used cpu "+ Game.cpu.getUsed() )
	let towerPlacements = segment.towerPlacements.pos;
	
	let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN)

	let dt = buildablePixelsForRoom(builder, segmentId, true);
	dt = addBlueprintsToDtMatrix(segment, dt, 255);
	dt = createCmOfFloodFillResult(dt, spawns[0]);

	let avoidTowerNear = []
	let extensions = getAllAsCompressedPosFromBlueprint(segment, builder, STRUCTURE_EXTENSION, true);

	

	for (let idx in spawns) {
		avoidTowerNear.push(spawns[idx])
		dt.set(spawns[idx].x, spawns[idx].y, 0);		
	}
	let avoidTerminal = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_TERMINAL);
	for (let idx in avoidTerminal) {
		avoidTowerNear.push(avoidTerminal[idx])
		dt.set(avoidTerminal[idx].x, avoidTerminal[idx].y, 0);
	}
	let avoidStorage = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE);
	for (let idx in avoidStorage) {
		avoidTowerNear.push(avoidStorage[idx])
		dt.set(avoidStorage[idx].x, avoidStorage[idx].y, 0);
	}
	let avoidExtractor = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_EXTRACTOR);
	for (let idx in avoidExtractor) {
		avoidTowerNear.push(avoidExtractor[idx]);
		dt.set(avoidExtractor[idx].x, avoidExtractor[idx].y, 0);
	}
	if (segment.controllerLinkPos) {
		let linkPos = posDecompress(segment.controllerLinkPos, builder)
		avoidTowerNear.push(linkPos);
		dt.set(linkPos.x, linkPos.y, 0);
	}
	if (segment.controllerContainerPos) {
		let contPos = posDecompress(segment.controllerLinkPos, builder)
		avoidTowerNear.push(contPos);
		dt.set(contPos.x, contPos.y, 0);
	}
	if (segment.labCenter) {
		for (let posComp in segment.labCenter) {
			let labPos = posDecompress(posComp, builder)
			avoidTowerNear.push(labPos);
			dt.set(labPos.x, labPos.y, 0);
		}
	}

	if (segment.towerAvoids === undefined) { 
		segment.towerAvoids = {}
		for (let idx in avoidTowerNear) {

			for (let i = 1; i <= 8; i++) {							
				let position = avoidTowerNear[idx].getPositionAtDirection(i);
				segment.towerAvoids[posCompress(position)] = {};
			}
		}
	}
	
	for (let compressed in segment.towerAvoids) {
		let pos = posDecompress(compressed, builder)
		dt.set(pos.x, pos.y, 0);
	}

	

	if (segment.towersIdx === undefined) { segment.towersIdx = 0; }
	let idx = 0;
	while (true) {
		
//	for (let idx = segment.towersIdx; idx < CONTROLLER_STRUCTURES[STRUCTURE_TOWER][8]; idx++) {
		
		segment.structures[STRUCTURE_TOWER].pos = _.uniq(segment.structures[STRUCTURE_TOWER].pos);

		console.log("tower idx " + idx + " used cpu "+ Game.cpu.getUsed() )
		if (Game.cpu.getUsed() > 450) { break; }
		if (countCurrentBuildingType(segment, STRUCTURE_TOWER) >= CONTROLLER_STRUCTURES[STRUCTURE_TOWER][CONTROLLER_MAX_LEVEL]) { 
    		segment.towersPlaced = 1;
    		break;
		}

		segment.towersIdx = idx;
		let rampartIdx = idx % towerPlacements.length
    	if (Game.cpu.getUsed() > 400 || idx > 30) {
			console.log("abort tower placements, high cpu " + Game.cpu.getUsed() )
    		break;
		}
	//	console.log(JSON.stringify(towerPlacements))
		let rampartPos = new RoomPosition(towerPlacements[rampartIdx].x, towerPlacements[rampartIdx].y, builder);
		drawText(builder, rampartIdx  , rampartPos.x, rampartPos.y, {color: 'red', font: 0.8});
		
		/*
		for (let idx in segment.structures[STRUCTURE_TOWER].pos) {
			let pos = segment.structures[STRUCTURE_TOWER].pos[idx]
			dt.set(pos.x, pos.y, 0);
		} */

		let towerPos = findClosestFreeSpace(dt, 1, rampartPos, segmentId, {range: 10, checkOutsideRange: 1, replaceStructures: extensions});	
		if (!towerPos) {
			console.log("no towerPos found for rampart group " + rampartIdx)
			idx++;
    		continue;
		}

		let towerNearAvoid = false;
		for (let idx2 in avoidTowerNear) {
			if (towerPos.isNearTo(avoidTowerNear[idx2])) {
				delete extensions[posCompress(towerPos)]
				segment.towerAvoids[posCompress(towerPos)] = {};
				dt.set(towerPos.x, towerPos.y, 0);				
				console.log("tower too close to avoid strucuture at " + towerPos + " avoiding " + avoidTowerNear[idx2])
				towerNearAvoid = true;
				break;
			}
		}
		if (towerNearAvoid) { continue; }
		
		let origin = findCloseOriginForBp(BLUEPRINT_NUKER, towerPos, segment)
	//	if (willBlock(towerPos, origin, segment)) { 
		if (willBlock(towerPos, origin, segment, true, undefined, 3) || willBlock(towerPos, rampartPos, segment, false, undefined, 3)) { 
			dt.set(towerPos.x, towerPos.y, 0);
			delete extensions[posCompress(towerPos)];
			segment.towerAvoids[posCompress(towerPos)] = {};
		//	idx++;	// TRY AGAIN
			console.log("tower block at " + towerPos)
			continue;
		}

		segment.structures[STRUCTURE_TOWER].pos.push({x: towerPos.x, y: towerPos.y});
		dt.set(towerPos.x, towerPos.y, 0);

		log("placed tower "+ idx +" at " + towerPos)
		if (extensions[posCompress(towerPos)]) {
			let indexToRemove = _.findIndex(segment.structures[STRUCTURE_EXTENSION].pos, function(c) {
				return c.x == towerPos.x && c.y == towerPos.y ;
			  });
			console.log("removing extension " + towerPos + " at index " + indexToRemove);
			segment.structures[STRUCTURE_EXTENSION].pos.splice(indexToRemove, 1);
			extensions = getAllAsCompressedPosFromBlueprint(segment, builder, STRUCTURE_EXTENSION, true);
		}
		dt = addBlueprintsToDtMatrix(segment, dt);
		idx++;
	}
	return segment;
}


global._validateBaseCahce = {}
function validateBase(segment, builder, segmentId){

	// Group ramparts
	let ungroupedRamparts = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_RAMPART);
	let rampartRange = 1;
	let groupedRamparts = [];
	let length;
	while (ungroupedRamparts.length > 0) {
		let group = ungroupedRamparts[0].findInRangeOffline(ungroupedRamparts, rampartRange);
		ungroupedRamparts.splice(0,1);
		length = group.length;
		for (let idx3 = 0; idx3 < group.length; idx3++) {
			let groupAdd = group[idx3].findInRangeOffline(ungroupedRamparts, rampartRange);
			group = group.concat(groupAdd);
			group = _.uniq(group);
		}
		groupedRamparts.push(group);
		ungroupedRamparts = _.difference(ungroupedRamparts, group);
	}

	let emptyMatrix = new PathFinder.CostMatrix()
	let matrixStructures = addBlueprintsToDtMatrix(segment, emptyMatrix, 255);
	let matrixdt = createWallLimitMatrixFromSegment(builder, segment, matrixStructures.clone());

	let destinations = [];
	for (let rampIdx in groupedRamparts) {
		let destIdx = Math.floor(groupedRamparts[rampIdx].length/2);		
		destinations.push({pos: groupedRamparts[rampIdx][destIdx], range: 0, matrix: matrixdt});
	}

	// Add controller container
	if (segment.controllerContainerPos) {
		destinations.push({pos: posDecompress(segment.controllerContainerPos, builder), range: 0, matrix: matrixdt});
	}

	// Add labs
	let labs = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_LAB);
	destinations.push({pos: labs[0], range: 1, matrix: matrixdt});

	// Add mineral
	let extractor = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_EXTRACTOR);
	destinations.push({pos: extractor[0], range: 1, matrix: matrixStructures});
	
	// Add sources
	let sources = getFakeSources(builder)
	for (let idx in sources) {
		destinations.push({pos: sources[idx].pos, range: 1, matrix: matrixStructures});
	}

	// Set extensions as walkable, but expensive
	let extensions = getAllAsCompressedPosFromBlueprint(segment, builder, STRUCTURE_EXTENSION, true);
	for (let compressed in extensions) {
		let pos = posDecompress(compressed, builder);		
		matrixdt.set(pos.x, pos.y, 50);
	}

	
	if (ENABLE_SPAWN_EXTENSIONS) {
		// block spawn fillers, no pathing here!
		let fillerPos = packrat.unpackPosList(segment.fillerPos)
		for (let idx in fillerPos) {
			matrixdt.set(fillerPos[idx].x, fillerPos[idx].y, 255);
		}

		let fillerContainers = packrat.unpackPosList(segment.spawnContPos)
		for (let idx in fillerContainers) {
			destinations.push({pos: fillerContainers[idx], range: 1, matrix: matrixdt});
		}
	}

//	displayCostMatrix(matrixdt, builder);

	// CHECK ALL SPAWNS CAN REACH EACH DESTINATION
	let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);
	let needsSave = false;

	if (global._validateBaseCahce[builder] === undefined) {
		global._validateBaseCahce[builder] = {
			reachablePaths: {}
		}
	}
	
	for (let spawnIdx in spawns) {
		for (let destIdx in destinations) {

			if (Game.cpu.getUsed() > 450) { return 0;}

			let id = posCompress(spawns[spawnIdx]) + posCompress(destinations[destIdx].pos)
			if (global._validateBaseCahce[builder].reachablePaths[id] === undefined) {
				global._validateBaseCahce[builder].reachablePaths[id] = findTravelPath(spawns[spawnIdx], destinations[destIdx].pos, {costMatrix: destinations[destIdx].matrix, ignoreCreeps: true, ignoreStructures: true, freshMatrix: true, range: destinations[destIdx].range, retry: false });
			}

			let road = global._validateBaseCahce[builder].reachablePaths[id]
			if (!road.path || road.incomplete) {
				log(builder + "found invalid base! Cannot reach target "+ destinations[destIdx].pos +" from spawn " + spawns[spawnIdx]);
			//	Game.rooms[builder].visual.line(spawns[spawnIdx], groupedRamparts[rampIdx][destIdx], { color: "red", lineStyle: "solid" });
				segment.roomScore += -100;

				let destUnreachable = posCompress(destinations[destIdx].pos);
				segment.invalidBase = 'spawns cant reach ' + destUnreachable;
				if (Memory.invalidBase[builder] === undefined) { Memory.invalidBase[builder] = {}; }
				if (Memory.invalidBase[builder].message === undefined) { Memory.invalidBase[builder].message = []; }
				Memory.invalidBase[builder].message.push('spawns cant reach ' + destUnreachable);				
			} else {
				for (let idx in road.path) {
					let pos = road.path[idx];
					if (extensions[posCompress(pos)]) {
						needsSave = true;
						let indexToRemove = _.findIndex(segment.structures[STRUCTURE_EXTENSION].pos, function(c) {
							return c.x == pos.x && c.y == pos.y ;
						  });

						if (indexToRemove > 0) {
							log("validateBase removing extension " + pos + " at index " + indexToRemove + " on path from " + spawns[spawnIdx] + " to " + destinations[destIdx].pos);
							matrixdt.set(pos.x, pos.y, 1);
							segment.structures[STRUCTURE_EXTENSION].pos.splice(indexToRemove, 1);
							segment.structures[STRUCTURE_ROAD].pos.push({ x:pos.x, y:pos.y});
							delete extensions[posCompress(pos)]
						}						
					}
				}
			}
		}
	}

	// Count Towers
	let towers = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_TOWER);
	if (towers.length < CONTROLLER_STRUCTURES[STRUCTURE_TOWER][CONTROLLER_MAX_LEVEL]) {
		segment.roomScore += -100;
		segment.invalidBase = 'missing towers!';

		if (Memory.invalidBase[builder] === undefined) { Memory.invalidBase[builder] = {}; }
		if (Memory.invalidBase[builder].message === undefined) { Memory.invalidBase[builder].message = []; }
		Memory.invalidBase[builder].message.push('missing towers!');	
	}

	if (needsSave) {
		saveMemorySegment(segmentId, segment);
	}

	return 1;
}

global.distanceTransformCorner = function(foregroundPixels, oob = 0) {
    let dist = foregroundPixels; // not a copy. We're modifying the input

    // Variables to represent the 3x3 neighborhood of a pixel.
    let A, B, C;
    let D, E, F;
    let G, H, I;

    let x, y, value;
    
    for (y = 0; y < 50; ++y) {
        for (x = 0; x < 50; ++x) {
            if (foregroundPixels.get(x, y) !== 0) {
                A = dist.get(x - 1, y - 1); B = dist.get(x    , y - 1); 
                D = dist.get(x - 1, y    );
                if (y ==  0) { A = oob; B = oob; }
                if (x ==  0) { A = oob; D = oob; }
              //  if (x == 49) { C = oob; }

                dist.set(x, y, Math.min(A, B, D) + 1);
            }
        }
    }
	
	/*
    for (y = 49; y >= 0; --y) {
        for (x = 49; x >= 0; --x) {
                                        E = dist.get(x   , y    ); F = dist.get(x + 1, y    );
            G = dist.get(x - 1, y + 1); H = dist.get(x   , y + 1); I = dist.get(x + 1, y + 1);
            if (y == 49) { G = oob; H = oob; I = oob; }
            if (x == 49) { F = oob; I = oob; }
            if (x ==  0) { G = oob; }

            value = Math.min(E, F + 1, G + 1, H + 1, I + 1);
            dist.set(x, y, value);
        }
    }*/
	
    return dist;
};



function adjacentPosIsInBlueprint(dt, pos){
	let xStart = pos.x - 1;
	let yStart = pos.y - 1;
	let value;
	for (let idx_x = 0; idx_x < xStart+3; idx_x++) {
		for (let idx_y = 0; idx_y < yStart+3; idx_y++) {
		//	posToCheck = new RoomPosition(idx_x, idx_y, pos.roomName);
			value = dt.get(idx_x, idx_y);
			if (value === 0) { return true; }
		}
	}
}

function markStructuresPermanent(segment, enable){
	let buildings = segment.structures;

	for (let type in buildings) {
		for (let idx = 0; idx < buildings[type].pos.length; idx++) {
			if (enable) {
				buildings[type].pos[idx].fixed = 1;
			} else {
				delete buildings[type].pos[idx].fixed;
				delete buildings[type].pos[idx].info;
			}
			
		}
	}	
}

function posIsInBlueprint(segment, pos, type){
	let buildings = segment.structures;
	if (!buildings[type]) { return false; }

	for (let idx = 0; idx < buildings[type].pos.length; idx++) {
		if (pos.x === buildings[type].pos[idx].x && pos.y === buildings[type].pos[idx].y ) {
			return true;
		}
	}
}

function removeDudWalls(segment, startPos){
	let cm = new PathFinder.CostMatrix(); 

	if (segment.confirmedWallDuds === undefined) { segment.confirmedWallDuds = 0; }
	if (segment.structures && segment.structures[STRUCTURE_RAMPART]) {
		let wallsOutside = segment.structures[STRUCTURE_RAMPART];
		
		for (let idx = wallsOutside.pos.length-1; idx > 0; idx--) {
			if (!wallsOutside.pos[idx]) {
				segment.structures[STRUCTURE_RAMPART].pos.splice(idx, 1);					
				continue;
			}
			let wall = getRoomTerrainAt(wallsOutside.pos[idx].x, wallsOutside.pos[idx].y, startPos.roomName);
			if (wall === TERRAIN_MASK_WALL) {		
				segment.structures[STRUCTURE_RAMPART].pos.splice(idx, 1);
				segment.confirmedWallDuds++;
				continue;
			}
			cm.set(wallsOutside.pos[idx].x,wallsOutside.pos[idx].y,255);
		}
	}
	
	let walls;
	let roomName = startPos.roomName;
	let origin = startPos;
	let exits = getFakeExits(roomName).map(e => ({pos: e, range: 0}));
	
	while(true) {
		let {path,incomplete} = PathFinder.search(origin, exits, {roomCallback: () => cm, maxRooms: 1});
		if(!incomplete && segment.lastRemovedWall){ 
			// Restore last wall
			segment.confirmedWallDuds--;
			segment.structures[STRUCTURE_RAMPART].pos.push(segment.lastRemovedWall);
		}
	//	if (Game.cpu.getUsed() > 450) { return segment; }		
		walls = segment.structures[STRUCTURE_RAMPART];
		for (let idx = 0; idx < walls.pos.length; idx++) {	
			if (walls.pos[idx]) { cm.set(walls.pos[idx].x, walls.pos[idx].y, 255); }
		}		
		if (segment.lastRemovedWall === undefined) { segment.lastRemovedWall = {}; }
		if (segment.removeWallIdx === undefined) { segment.removeWallIdx = walls.pos.length - 1; }

		if (segment.structures && segment.structures[STRUCTURE_RAMPART]) {
			if (segment.removeWallIdx < 0) { 
				segment.wallDudsRemoved = 1;
				break;
			}
			let idx2 = segment.removeWallIdx;
		//	console.log(idx2)
			segment.lastRemovedWall = segment.structures[STRUCTURE_RAMPART].pos[idx2];
			cm.set(segment.structures[STRUCTURE_RAMPART].pos[idx2].x, segment.structures[STRUCTURE_RAMPART].pos[idx2].y, 0); // Remove wall and check			
			segment.structures[STRUCTURE_RAMPART].pos.splice(idx2, 1);
			segment.confirmedWallDuds++;
			segment.removeWallIdx--;
		}
	}
	console.log("removed dud walls: " + segment.confirmedWallDuds)
	return segment;
}	

Room.prototype.displayOutsidePixels = function(segmentOOB) {
	if (!segmentOOB) {
		if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
			console.log(" OOB_complete no access to id " +SEGMENT_ALL_ROOM_OOB);
			return 0;
		}
		segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);
	}
	let roomName = this.name;
	if (segmentOOB.oob && segmentOOB.oob[roomName]) {
		let posData  = unSerializeOOBPos(segmentOOB.oob[roomName].posSerialized, roomName);
		for (let posCompressed in posData) {
		//	console.log(posCompressed)
			let pos = posDecompress(posCompressed, roomName);
			this.visual.circle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
		}
	}
};


function determineLabFromPos(theLabs, theExcludedLab, allowImperfect = false) {
    // Current lab we're checking
    let determinedLab;
	let length = theLabs.length;
	let bestInRange = 0;

	let requiredInRange = 9;
	if (theExcludedLab) {
		requiredInRange = 8;
	}

    for (let lab = 0; lab < length; lab++) {
        // Always assume we're in range of all other labs

		let inRange = 0;
        let ok = true;
        let currentlyChecking = theLabs[lab];
        if (theExcludedLab && currentlyChecking.isThisPos(theExcludedLab)) // This lab is already a breeder lab
        {
            continue;
        }
        // Loop through all other labs
		
        for (let r = 0; r < length; r++) {
            let toCheckAgainst = theLabs[r];
            if (toCheckAgainst.isThisPos(currentlyChecking) || (theExcludedLab && toCheckAgainst.isThisPos(theExcludedLab)) ) {
                continue;
            }

            let range = currentlyChecking.getRangeTo(toCheckAgainst);
            if (range > 2) // not in range of all other labs, not the breeder!
            {
                ok = false;
				if (!allowImperfect) {
				//	break;
				}
                
            } else {
				inRange++;
			}
        }

		/*
        if (ok) {
            determinedLab = currentlyChecking;
            break;
        } else */

		if (inRange > bestInRange) {
			bestInRange = inRange;
			determinedLab = currentlyChecking;
		}

		if (inRange >= requiredInRange) { 
			break;
		}


    }

	if (!allowImperfect && bestInRange < requiredInRange) {
		return;
	}



    return determinedLab;
}

function placeDynamicLabs(segment, builder){

	let init = Game.cpu.getUsed();
	let extensions = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_EXTENSION, true);

	let bestPos
	let bestNo = 5; 
	let labsConfirmed;
	let theFirstLab
	let theSecondLab
	for (let idx in extensions){
		let pos = extensions[idx];

		let inRange = pos.findInRangeOffline(extensions, 2);

		if (inRange.length > bestNo || inRange.length >= 10) {
			bestNo = inRange.length;
			bestPos = pos;
			
			if (inRange.length >= 10) {
				theFirstLab	= determineLabFromPos(inRange);

			//	theFirstLab	= bestPos
				theSecondLab = determineLabFromPos(inRange, theFirstLab);
				if (theFirstLab && theSecondLab) {
					labsConfirmed = true;
					console.log("confirmed labs! " + bestPos)
					break;
				}
			}
		}
	}

	let labPos = {};
	let inRange = bestPos.findInRangeOffline(extensions, 2);

	if (!labsConfirmed) {
		theFirstLab	= determineLabFromPos(inRange, undefined, true);
		theSecondLab = determineLabFromPos(inRange, theFirstLab, true);
	}

	console.log(builder + " dynamic labs bestPos " +bestPos+ ", first " + theFirstLab + " second " + theSecondLab + " in range " + inRange.length)
	labPos[posCompress(theFirstLab)] = {};
	labPos[posCompress(theSecondLab)] = {};
	let labs = 2;
	for (let idx in inRange){
		let pos = inRange[idx];

		let possibleLabPos = posCompress(pos);
		if (labPos[possibleLabPos] ) { continue; }

		if (pos.getRangeTo(theFirstLab) <= 2 && pos.getRangeTo(theSecondLab) <= 2) {
			// valid output lab
			labPos[possibleLabPos] = {}
			labs++
		}

		if (labs >= CONTROLLER_STRUCTURES[STRUCTURE_LAB][CONTROLLER_MAX_LEVEL]) { break; }
	}

	// replace extensions with labs	
	if (segment.structures[STRUCTURE_LAB] === undefined) {
		segment.structures[STRUCTURE_LAB] = {};
		segment.structures[STRUCTURE_LAB].pos = [];
	}
	for (let posCompressed in labPos) {

		let posLab = posDecompress(posCompressed, builder)

		let indexToRemove = _.findIndex(segment.structures[STRUCTURE_EXTENSION].pos, function(c) {
			return c.x == posLab.x && c.y == posLab.y ;
		  });
		console.log("replacing extension " + posLab + " at index " + indexToRemove + " with lab");
		segment.structures[STRUCTURE_EXTENSION].pos.splice(indexToRemove, 1);


		segment.structures[STRUCTURE_LAB].pos.push({x: posLab.x, y: posLab.y});
	}


	let time = Game.cpu.getUsed()-init;
	log(builder + " found lab positions, used cpu " + time.toFixed(1));
	
}


function findClosestFreeSpace(dt, spaceNeeded, startPos, segmentId, options = {} ){
	let n = 0;
	let x, y = 0;
	let value = 0;
	let range = 35;
	let roomName = startPos.roomName;
	if (options.range) { range = options.range; }
	let ret = ulamSpiral(n);
	let dtValueNeeded = Math.ceil(spaceNeeded / 2);
	dtValueNeeded = limit(dtValueNeeded - 1, 1, 255);
//	let obstructExits = addExitsAsObstacles(roomName);
	let currBiggestPos;
	let pathLength = 0;
	let searchX = startPos.x;
	let searchY = startPos.y;
	if (options.dest) { startPos = options.dest; }		
	let score = 0;
	let bestScore = -Infinity;	
	if (options.cornerFit) {
		bestScore = Infinity;
	} 
	while (ret.sq <= range) {
        ret = ulamSpiral(n);
		if (ret.sq > range) { break; }   
		if (Game.cpu.getUsed() > 490) { break; }
		n += 1;
	//	if (x > 48 || x < 1 || y > 48 || y < 1) { continue; }
        x = limit(searchX + ret.x, 1, 48);
		y = limit(searchY + ret.y, 1, 48);
		let dest = new RoomPosition(x, y, startPos.roomName);
		value = dt.get(x, y);		
		let withinRangeOfOutside = false;
		if (options.replaceStructures && options.replaceStructures[posCompress(dest)]) {	
			
			for (let i = 1; i <= 8; i++) {							
				let nearbyPos = dest.getPositionAtDirection(i);
				let nearbyVal = dt.get(nearbyPos.x, nearbyPos.y)
				if (nearbyVal > 0 && nearbyVal < 255) {
					value = 1;					
				//	console.log("found replaceable strucutre " +dest )
					break;
				}
			}
						
		//	let replacePos = dest;
		}
        if (options.cornerFit) {        	
			let openSpots = openAdjacentSpots(dest, true).length
		
			if (options.checkOutsideRange) {
				withinRangeOfOutside = isWithinAttackRangeOfOutside(dest, segmentId);
			}
			if (value >= dtValueNeeded && openSpots <= 5 && !adjacentBuildingInBlueprint(options.segment, dest, false) && !isWithinAttackRangeOfOutside(dest, segmentId)) {
				return dest;
			} else if (value >= dtValueNeeded && !withinRangeOfOutside && openSpots < bestScore){	 
				bestScore = openSpots;
				currBiggestPos = dest;
			}		
	    } else if (options.ignoreScore) {
	     	if (value === dtValueNeeded) {
	     		dest = new RoomPosition(x, y, startPos.roomName);
		        return dest;
		    } else if (value >= dtValueNeeded ) {
		    	dest = new RoomPosition(x, y, startPos.roomName); 	
		        currBiggestPos = dest;
			}
		} else if (options.blueprint && options.segment) {
			if (value >= dtValueNeeded) {

				if (!blueprintFits(options.blueprint, shiftPositionToCenter(dest, spaceNeeded), options.segment, dt)) { continue; }

				let path = findTravelPath(startPos, dest, {range: 2, offRoad: false, maxRooms: 1, maxOps: 3000, ignoreStructures: true, ignoreCreeps: true, retry: false});
				pathLength = 50;
				if (!path.incomplete && path.path.length) {
					pathLength = path.cost;
				}

				score = -pathLength;
				if (value === dtValueNeeded) {
					score -= 4;
				}

				if (score > -4) {
					return dest
				} else if (score > bestScore) {
					bestScore = score;
					currBiggestPos = dest;
				}
			}
		} else {
	        if (value >= dtValueNeeded) {
	        	dest = new RoomPosition(x, y, startPos.roomName);
				let path = findTravelPath(startPos, dest, {range: 2, offRoad: false, maxRooms: 1, maxOps: 3000, ignoreStructures: true, ignoreCreeps: true, retry: false});
				pathLength = 50;
				if (!path.incomplete && path.path.length) {
					pathLength = path.cost;
					
				}


	        	let bonus = 0;
	        	if (x === startPos.x || y === startPos.y) { bonus = 0.4; }
	        	let sizeScore = (dtValueNeeded/value);
	        	if (options.biggest) { sizeScore = Math.min(value, dtValueNeeded+3); }
				score = sizeScore - (pathLength/6) + bonus;
				score = 5 * sizeScore - 6*(pathLength/ret.sq) + bonus -ret.sq;				
	        //	let score2 = score*10;
			//	drawText(roomName, score.toFixed(1)  , x, y, {color: 'green', font: 0.5});
				withinRangeOfOutside;
	        	if (options.checkOutsideRange) {
					withinRangeOfOutside = isWithinAttackRangeOfOutside(dest, segmentId);
				}
	    	//	if (score >= 0.95 && !options.biggest && !withinRangeOfOutside) {
				if (score >= 2.0 && !options.biggest && !withinRangeOfOutside) {
				//	drawText(roomName, score2.toFixed(2)  , x, y, {color: 'green', font: 0.5});
		        	return dest;
		        } else {
		        	if (score > bestScore && !withinRangeOfOutside) {
		        	//	console.log("score : " + score +" ret.sq " + ret.sq +" dist " + pathLength)
		        		bestScore = score;
		        		currBiggestPos = dest;
		        	}
		      	}
	        } else {
				//
			}
	    }
    }
	if (!currBiggestPos) { 
		drawCircle(roomName, startPos.x, startPos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'});		
		console.log(roomName+ " findClosestFreeSpace failed for space "+ spaceNeeded+ " start pos " + startPos); 
	}
    console.log(" found big val "+ currBiggestPos );
    return currBiggestPos;
}

function addStructureToRoomLayout(buildingType, pos, segment, info){
	if (segment.structures[buildingType] === undefined) {
		segment.structures[buildingType] = {};
		segment.structures[buildingType].pos = [];
	}
	segment.structures[buildingType].pos.push({ x:pos.x, y:pos.y, info:info});
	return segment;
}

function blueprintFits(bp, pos, segment, dt, checkAdjacent= false) {
//	let segmentCopy = _.clone(segment, true);	// clone?
	let segmentCopy=JSON.parse(JSON.stringify(segment));
	let buildings = bp.buildings;
	let x, y = 0;
	let curPos;
	let roomName = pos.roomName;
	
	let origin = findCloseOriginForBp(bp, pos, segment)


	for (let building in buildings){
		let buildingType = building;	
				
		for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			x = buildings[building].pos[idx].x + pos.x;			
			y = buildings[building].pos[idx].y + pos.y;
			if (x < 1 || x > 48 || y < 1 || y  > 48) { return 0; }
			curPos = new RoomPosition(x, y, roomName);
			if (dt && dt.get(x, y) === 0 ) {
				drawText(roomName, "d" , x, y, {color: 'red', font: 0.8});
				return 0; 
			}
			
			
			if (posIsInBlueprint(segmentCopy, curPos, buildingType) ) { continue; }
			if (buildingType !== STRUCTURE_ROAD && buildingType !== "dummy" && willBlock(curPos, origin, segmentCopy)) { 
				drawText(roomName, "b" , x, y, {color: 'red', font: 0.8});
				return 0; 
			}

			if (checkAdjacent && buildingType !== STRUCTURE_ROAD && adjacentBuildingInBlueprint(segmentCopy, curPos, true) ) {
				drawText(roomName, "A", x, y, {color: 'red', font: 0.8});
				return 0; 
			}
		//	segmentCopy.structures[buildingType].pos.push({ x:x, y:y});
		}
	}
	return 1;
}

function findCloseOriginForBp(bp, pos, segment){
	let buildings = segment.structures;
	let positions = {};
	let roomName = pos.roomName;
	let closestRange = Infinity;
	let bestPos;
	for (let building in buildings){		
		if (building === STRUCTURE_RAMPART) { continue; }
		if (building === STRUCTURE_LINK) { continue; }
		if (building === STRUCTURE_CONTAINER) { continue; }
		if (building === STRUCTURE_EXTRACTOR ) { continue;}
		if (building === STRUCTURE_ROAD) { continue;}

		

		if (building === "dummy") { continue; }

		for (let idx = 0; idx < buildings[building].pos.length; idx++) {			
			let x = buildings[building].pos[idx].x // + pos.x;
			let y = buildings[building].pos[idx].y // + pos.y;
			if (x < 1 || x > 48 || y < 1 || y  > 48) { continue; }
		//	let curPos = new RoomPosition(x, y, roomName);
			let curPos = {x: x, y: y, roomName: roomName}
		//	let compressedPos = posCompress(curPos)
		//	positions[compressedPos] = {};
			let range = getRangeTo(pos, curPos)
			if (range < closestRange && range >= 2) {

				if (building === STRUCTURE_EXTENSION) {
					if (segment.sourceExtensionPos && segment.sourceExtensionPos.includes(posCompressXY(curPos.x, curPos.y))) { continue; }
				}
				bestPos = curPos;
				closestRange = range;
			}
			if (range >= 2 && range <= 3) {
				if (building === STRUCTURE_EXTENSION) {
					if (segment.sourceExtensionPos && segment.sourceExtensionPos.includes(posCompressXY(curPos.x, curPos.y))) { continue; }
				}
				return curPos;
			}
		}
	}
	if (bestPos) { return bestPos; }

	// fallback
	return posLoad(segment.buildPosCenter);	
}


function rateBase(segment, builder, segmentId){
	let score = segment.roomScore || 0;	//  +/- 10 points

	// NUMBER OF RAMPARTS -10 .. 5 POINTS
	let rampartCount = countCurrentBuildingType(segment, STRUCTURE_RAMPART) -3; //subtract perfect 
	let neutralRampartCount = 25;
	let rampartWeight = 5;
	let neutralRampartScore = rampartWeight/neutralRampartCount;
	let rampartScore = limit(((-neutralRampartScore*rampartCount)+rampartWeight), -2*rampartWeight, rampartWeight)	
	console.log("scoring room " + builder + " rampart score " + rampartScore.toFixed(2) + " number of ramparts: " + rampartCount);
	score += rampartScore;
	segment.rampartScore = rampartScore.toFixed(2);
	
	// PROTECTED SOURCES 0 .. 2 POINTS
	let sources = getFakeSources(builder)
	let protectedSources = sources.length;
	for (let idx in sources){
		for (let i = 1; i <= 8; i++) {							
			let position = sources[idx].pos.getPositionAtDirection(i);
			if (!position.isPassible(true)) { continue; }
			if (isOutsideWalls(position, undefined, segmentId)) {
				protectedSources--;
				break;
			}
		}
	}
	let sourceScore = protectedSources;
	console.log("scoring room " + builder + " source score " + sourceScore + " protected sources: " + protectedSources);
	score += sourceScore;
	segment.sourceScore = sourceScore;	

	// LABS RANGE FROM SPAWN TO LABS -4 .. 2 POINTS
	let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);
	let labs = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_LAB);

	let missingLabs = CONTROLLER_STRUCTURES[STRUCTURE_LAB][CONTROLLER_MAX_LEVEL] - labs.length;
	let missingLabsScore = missingLabs * 5
	console.log("scoring room " + builder + " missing labs score -" + missingLabsScore);
	score -= missingLabsScore;

	let shortestPath = 999;
	for (let spawnIdx in spawns) {
		for (let labIdx in labs) {
			let pathToSpawn = findTravelPath(spawns[spawnIdx], labs[labIdx],
				{range: 1, freshMatrix: true, maxRooms: 1, ignoreStructures: true, ignoreCreeps: true}); 
			if (!pathToSpawn.incomplete) {
				if (pathToSpawn.cost < shortestPath) {
					shortestPath = pathToSpawn.cost;
				}
			}
		}
	}
	
	let neutralLabDistance = 5;
	let labWeight = 2;
	let neutralLabScore = labWeight/neutralLabDistance;
	//https://docs.google.com/spreadsheets/d/1M1lnHGhEeJ7ME0NClX1gROTCXtr4dD5AYBYBsgesKPw/edit#gid=725457426
	let labScore = limit(((-neutralLabScore*shortestPath)+labWeight), -2*labWeight, labWeight)	
	console.log("scoring room " + builder + " lab score " + labScore + " path cost to labs " + shortestPath);
	score += labScore;
	segment.labScore = labScore.toFixed(2);	

	// RANGE TO EXTENSIONS -4 .. 2 POINTS
	let extensions = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_EXTENSION, true);
	let storage = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE);
	let totalPath = 0;
	for (let extensionIdx in extensions) {
		let pathToSpawn = findTravelPath(storage[0], extensions[extensionIdx],			
			{range: 1, offRoad: true, freshMatrix: true, maxRooms: 1, ignoreStructures: true, ignoreCreeps: true}); 
		if (pathToSpawn && !pathToSpawn.incomplete) {
			totalPath += pathToSpawn.path.length;
		} else {
			totalPath += 255;
			log("unreachable extension at " + extensions[extensionIdx])
		}
	}
	let averagePath = totalPath / extensions.length;
	let neutralExtDistance = 8;
	let extWeight = 2;
	let neutralExtensionScore = extWeight/neutralExtDistance;
	let extScore = limit(((-neutralExtensionScore*averagePath)+extWeight), -2*extWeight, extWeight);
	console.log("scoring room " + builder + " extension score " + extScore + " avg path cost to extensions " + averagePath);
	score += extScore;
	segment.extScore = extScore.toFixed(2);

	console.log(builder + " score complete! " + score.toFixed(2) + "/20");

	segment.roomScore += limit(score.toFixed(2), -20, 20);

	if (segment.invalidBase) {
		segment.roomScore -= 100;
	}
	return score;
}


function removeUngroupedExtensions(segment, builder, extensions, addDummy=true){
	let removedExtensions = 0;

	let groupedExtensions = [];
	while (extensions.length > 0) {
		let group = extensions[0].findInRangeOffline(extensions, 1);
		extensions.splice(0,1);

		for (let idx3 = 0; idx3 < group.length; idx3++) {
			let groupAdd = group[idx3].findInRangeOffline(extensions, 1);
			group = group.concat(groupAdd);
			group = _.uniq(group);
		}

		groupedExtensions.push(group);
		extensions = _.difference(extensions, group);
	}

	console.log("groups " + groupedExtensions.length)

	for (let groupIdx in groupedExtensions) {

		if (segment.structures["dummyExt"] === undefined) {
			segment.structures["dummyExt"] = {};
			segment.structures["dummyExt"].pos = [];
		}

		let extGroup = groupedExtensions[groupIdx];
		if (extGroup.length >= 5) { continue; }
		for (let ext in extGroup) {
			let extensionPos = extGroup[ext];

			drawCircle(builder, extensionPos.x, extensionPos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'}) 

			let indexToRemove = _.findIndex(segment.structures[STRUCTURE_EXTENSION].pos, function(c) {
				return c.x == extensionPos.x && c.y == extensionPos.y ;
			  });
			if (segment.structures[STRUCTURE_EXTENSION].pos[indexToRemove].fixed) { continue; }
			console.log("removing extension " + extensionPos + " at index " + indexToRemove);
			segment.structures[STRUCTURE_EXTENSION].pos.splice(indexToRemove, 1);
			if (addDummy) {
				segment.structures["dummyExt"].pos.push({x: extensionPos.x, y: extensionPos.y});
			}			

			removedExtensions++;
		}
	}

	return removedExtensions;
}


function addWallAccessTunnels(segment, dt, builder, startPos){
	let ungroupedRamparts = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_RAMPART);
	let rampartRange = 1;
	let groupedRamparts = [];
	let length;
	while (ungroupedRamparts.length > 0) {
		let group = ungroupedRamparts[0].findInRangeOffline(ungroupedRamparts, rampartRange);
		ungroupedRamparts.splice(0,1);
		length = group.length;
		for (let idx3 = 0; idx3 < group.length; idx3++) {
			let groupAdd = group[idx3].findInRangeOffline(ungroupedRamparts, rampartRange);
			group = group.concat(groupAdd);
			group = _.uniq(group);
		}	
		groupedRamparts.push(group);
		ungroupedRamparts = _.difference(ungroupedRamparts, group);
	}

	let matrixdt = createWallLimitMatrixFromSegment(builder, segment);
	matrixdt = addBlueprintsToDtMatrix(segment, matrixdt, 255);
		

	let replaceble = {}
	if (segment.sourceExtensionPos) {
		replaceble = segment.sourceExtensionPos
		for (let extIdx in segment.sourceExtensionPos) {
			let pos = posDecompress(segment.sourceExtensionPos[extIdx], builder)
			matrixdt.set(pos.x, pos.y, 25);
		}		
	}
	

	for (let idx = 0; idx < groupedRamparts.length; idx++) {
		let destIdx = Math.floor(groupedRamparts[idx].length/2);
		let road = findTravelPath(startPos, groupedRamparts[idx][destIdx], {costMatrix: matrixdt, ignoreCreeps: true, ignoreStructures: true, freshMatrix: true, range: 0 });
	
		length = road.path.length - 1;
		if (length <= 0) { continue; }
		let roomName;
		let pos;
		let value;
		roomName = road.path[0].roomName;
		for (let i = length; i > 0; i--) {
			pos = road.path[i];
		//	drawCircle(builder, road.path[i].x, road.path[i].y , {fill: 'transparent', radius: 0.50, stroke: 'orange'}) 
			value = matrixdt.get(pos.x, pos.y);
			if (value >= 10 && value <= 25) {
				segment.structures[STRUCTURE_RAMPART].pos.push({ x:pos.x, y:pos.y});

				if (value === 25 && segment.sourceExtensionPos) {
					delete segment.sourceExtensionPos[posCompress(pos)]

					let indexToRemove = _.findIndex(segment.structures[STRUCTURE_EXTENSION].pos, function(c) {
						return c.x == pos.x && c.y == pos.y ;
					  });
					console.log("removing extension " + pos + " at index " + indexToRemove);
					if (indexToRemove >= 0) {
						segment.structures[STRUCTURE_EXTENSION].pos.splice(indexToRemove, 1);
					}					
				}
		//		drawCircle(builder, road.path[i].x, road.path[i].y , {fill: 'transparent', radius: 0.50, stroke: 'red'}) 	
			}
		}
	}
	segment.wallTunnels = 1;
}



function innerPixelsForRoom(segment, roomName){
	let costMatrix = new PathFinder.CostMatrix();
	let buildings = segment.structures;	

	let controllerPos;
	if (Memory.rooms[roomName] && Memory.rooms[roomName].controller) {
		controllerPos = posDecompress(Memory.rooms[roomName].controller.pos, roomName);
	} else if (Game.rooms[roomName]) {
		controllerPos = Game.rooms[roomName].controller.pos;
	}

	let registeredPos = {}
	for (let building in buildings){
		if (building === STRUCTURE_RAMPART) { continue; }
		if (building === STRUCTURE_LINK) { continue; }
		if (building === STRUCTURE_CONTAINER ) { continue; }
		if (building === STRUCTURE_EXTRACTOR ) { continue; }
		if (building === STRUCTURE_ROAD) { continue; }

		let range = 3;
		if (building === STRUCTURE_ROAD) { range = 0 } // why - to connect everyting
		if (building === STRUCTURE_SPAWN) { range = 4 }
		if (building === STRUCTURE_EXTENSION) { range = 3 } // fast filler extensions need range 4 to ensure paths inside the base
		if (building === STRUCTURE_LAB) { range = 4 }
		if (building === STRUCTURE_STORAGE) { range = 4 }
		if (building === STRUCTURE_TERMINAL) { range = 4 }

		let posComp
		for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			let n = 0;
			let x, y = 0;
							
			let ret = ulamSpiral(n);
			let startPosXY = buildings[building].pos[idx];

			let usedRange = range 		

			if (building === STRUCTURE_EXTENSION) {
				if (segment.sourceExtensionPos && segment.sourceExtensionPos.includes(posCompressXY(startPosXY.x, startPosXY.y))) { continue; }
				if (buildings[building].pos[idx].fixed) {
					usedRange = 4;
				}
			}

			if (building === STRUCTURE_LINK) {			
				if (!segment.controllerLinkPos) { continue; }
				let controllerLinkPos = posDecompress(segment.controllerLinkPos, roomName);
				let startPos = new RoomPosition(buildings[building].pos[idx].x, buildings[building].pos[idx].y, roomName);
				if (!startPos.isThisPos(controllerLinkPos)) { continue; }					
			}

			while (ret.sq <= usedRange) {
		        ret = ulamSpiral(n);
		        n += 1;
		        if (ret.sq <= usedRange) {					

					x = startPosXY.x + ret.x
					if (x > 48 || x < 1) { continue; }
					y = startPosXY.y + ret.y					
					if (y > 48 || y < 1) { continue; }

					posComp = posCompressXY(x, y)
					if (registeredPos[posComp]) { continue; }
					registeredPos[posComp] = {}
					
			    //  x = limit(startPosXY.x + ret.x, 1, 48);
				//	y = limit(startPosXY.y + ret.y, 1, 48);
					let terrain = getRoomTerrainAt(x, y, roomName);
					if (terrain === TERRAIN_MASK_WALL ) { continue; }
		       		costMatrix.set(x, y, 1);
		       	}
		    }
		}
	}

	for (let idx in segment.sourceExtensionPos) {
		let pos = posDecompressXY(segment.sourceExtensionPos[idx])
		if (costMatrix.get(pos.x, pos.y) !== 1) { continue; }

		let n = 0;
		let x, y = 0;
		let ret = ulamSpiral(n);
		let startPosXY = pos;

		let usedRange = 1;
		while (ret.sq <= usedRange) {
			ret = ulamSpiral(n);
			n += 1;
			if (ret.sq <= usedRange) {
				x = limit(startPosXY.x + ret.x, 1, 48);
				y = limit(startPosXY.y + ret.y, 1, 48);
				let terrain = getRoomTerrainAt(x, y, roomName);
				if (terrain === TERRAIN_MASK_WALL ) { continue; }
				costMatrix.set(x, y, 1);
			}
		}

	}

	


	let spawns = getAllAsPosFromBlueprint(segment, roomName, STRUCTURE_SPAWN);
	let road = findTravelPath(controllerPos, spawns[0], {ignoreCreeps: true, ignoreStructures: true, freshMatrix: true, range: 1, offRoad: true });
	if (!road.path || road.incomplete) {
	
	} else {
		for (let idx in road.path) {
			let pos = road.path[idx];
			costMatrix.set(pos.x, pos.y, 1);
		}
	}

	if (segment.curSourceIdx !== undefined && segment.sourcesToProtect !== undefined) {
		for (let idx in segment.sourcesToProtect[segment.curSourceIdx]) {

		//	log(JSON.stringify(segment.sourcesToProtect[segment.curSourceIdx][idx]))
			let startPos = posDecompress(segment.sourcesToProtect[segment.curSourceIdx][idx], roomName)
			let range = 3;
			let n = 0;
			let x, y = 0;							
			let ret = ulamSpiral(n);

			while (ret.sq <= range) {
		        ret = ulamSpiral(n);
		        n += 1;
		        if (ret.sq <= range) {
			        x = limit(startPos.x + ret.x, 1, 48);
					y = limit(startPos.y + ret.y, 1, 48);
					let terrain = getRoomTerrainAt(x, y, roomName);
					if (terrain === TERRAIN_MASK_WALL ) { continue; }
		       		costMatrix.set(x, y, 1);
		       	}
		    }

			let roadToSource = findTravelPath(controllerPos, startPos, {ignoreCreeps: true, ignoreStructures: true, freshMatrix: true, range: 1, offRoad: true });
			if (!roadToSource.path || roadToSource.incomplete) {
			
			} else {
				for (let idxRoad in roadToSource.path) {
					let pos = roadToSource.path[idxRoad];
					costMatrix.set(pos.x, pos.y, 1);
				}
			}
		}
	}

	// costMatrix.set(controllerPos.x, controllerPos.y, 1);
	
	for (let i = 1; i <= 8; i++) {
		let position = controllerPos.getPositionAtDirection(i);
		let terrain = getRoomTerrainAt(position.x, position.y, roomName);
		if (terrain === TERRAIN_MASK_WALL) { continue; }
		costMatrix.set(position.x, position.y, 1);
	}

	return costMatrix;
}


function innerPixelsObjectForRoom(segment, roomName){
	let innerPoints = []
	let buildings = segment.structures;	

	let controllerPos;
	if (Memory.rooms[roomName] && Memory.rooms[roomName].controller) {
		controllerPos = posDecompress(Memory.rooms[roomName].controller.pos, roomName);
	} else if (Game.rooms[roomName]) {
		controllerPos = Game.rooms[roomName].controller.pos;
	}

	for (let building in buildings){
		if (building === STRUCTURE_RAMPART) { continue; }
		if (building === STRUCTURE_LINK) { continue; }
		if (building === STRUCTURE_CONTAINER ) { continue; }
		if (building === STRUCTURE_EXTRACTOR ) { continue; }
		if (building === STRUCTURE_ROAD) { continue; }

		let range = 3;
		if (building === STRUCTURE_ROAD) { range = 0 } // why - to connect everyting
		if (building === STRUCTURE_SPAWN) { range = 4 }
		if (building === STRUCTURE_EXTENSION) { range = 3 }
		if (building === STRUCTURE_LAB) { range = 4 }
		if (building === STRUCTURE_STORAGE) { range = 4 }
		if (building === STRUCTURE_TERMINAL) { range = 4 }
		for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			let n = 0;
			let x, y = 0;
							
			let ret = ulamSpiral(n);
			let startPosXY = buildings[building].pos[idx];
			

			if (building === STRUCTURE_EXTENSION && segment.sourceExtensionPos) {
				if (segment.sourceExtensionPos.includes(posCompressXY(startPosXY.x, startPosXY.y))) { continue; }
			}

			if (building === STRUCTURE_LINK) {			
				if (!segment.controllerLinkPos) { continue; }
				let controllerLinkPos = posDecompress(segment.controllerLinkPos, roomName);
				let startPos = new RoomPosition(buildings[building].pos[idx].x, buildings[building].pos[idx].y, roomName);
				if (!startPos.isThisPos(controllerLinkPos)) { continue; }					
			}

			while (ret.sq <= range) {
		        ret = ulamSpiral(n);
		        n += 1;
		        if (ret.sq <= range) {
			        x = limit(startPosXY.x + ret.x, 1, 48);
					y = limit(startPosXY.y + ret.y, 1, 48);
					let terrain = getRoomTerrainAt(x, y, roomName);
					if (terrain === TERRAIN_MASK_WALL ) { continue; }
		       		
					innerPoints.push({x: x, y: y})
		       	}
		    }
		}
	}

	


	let spawns = getAllAsPosFromBlueprint(segment, roomName, STRUCTURE_SPAWN);
	let road = findTravelPath(controllerPos, spawns[0], {ignoreCreeps: true, ignoreStructures: true, freshMatrix: true, range: 1, offRoad: true });
	if (!road.path || road.incomplete) {
	
	} else {
		for (let idx in road.path) {
			let pos = road.path[idx];
			innerPoints.push({x: pos.x, y: pos.y})
		}
	}

	if (segment.curSourceIdx !== undefined && segment.sourcesToProtect !== undefined) {
		for (let idx in segment.sourcesToProtect[segment.curSourceIdx]) {

		//	log(JSON.stringify(segment.sourcesToProtect[segment.curSourceIdx][idx]))
			let startPos = posDecompress(segment.sourcesToProtect[segment.curSourceIdx][idx], roomName)
			let range = 3;
			let n = 0;
			let x, y = 0;							
			let ret = ulamSpiral(n);

			while (ret.sq <= range) {
		        ret = ulamSpiral(n);
		        n += 1;
		        if (ret.sq <= range) {
			        x = limit(startPos.x + ret.x, 1, 48);
					y = limit(startPos.y + ret.y, 1, 48);
					let terrain = getRoomTerrainAt(x, y, roomName);
					if (terrain === TERRAIN_MASK_WALL ) { continue; }
					innerPoints.push({x: x, y: y})
		       	}
		    }

			let roadToSource = findTravelPath(controllerPos, startPos, {ignoreCreeps: true, ignoreStructures: true, freshMatrix: true, range: 1, offRoad: true });
			if (!roadToSource.path || roadToSource.incomplete) {
			
			} else {
				for (let idxRoad in roadToSource.path) {
					let pos = roadToSource.path[idxRoad];
					innerPoints.push({x: pos.x, y: pos.y})
				}
			}
		}
	}

//	innerPoints.push({x: controllerPos.x, y: controllerPos.y})
	
	for (let i = 1; i <= 8; i++) {
		let pos = controllerPos.getPositionAtDirection(i);
		let terrain = getRoomTerrainAt(pos.x, pos.y, roomName);
		if (terrain === TERRAIN_MASK_WALL) { continue; }
		innerPoints.push({x: pos.x, y: pos.y})
	}

	return innerPoints;
}


function spreadTowers(segment, builder){
	let towers = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_TOWER);

	let towerOrder = [];
	towerOrder.push(towers[0]);
	towers.splice(0, 1);

	
	while (towers.length > 0) {
		let bestDistance = 0;
		let bestIdx;
		for (let towerPos in towers) {
			let currentDistance = 0;
			for (let placedTower in towerOrder) {
				currentDistance += towers[towerPos].getRangeTo(towerOrder[placedTower]);
			}
			if (currentDistance > bestDistance) {
				bestDistance = currentDistance;
				bestIdx = towerPos;
			}
		}
		towerOrder.push(towers[bestIdx]);
		towers.splice(bestIdx, 1);
	}
	
	segment.structures[STRUCTURE_TOWER] = {};
	segment.structures[STRUCTURE_TOWER].pos = [];

	for (let towerPos in towerOrder) {		
		drawText(builder, towerPos  , towerOrder[towerPos].x, towerOrder[towerPos].y, {color: 'green', font: 0.8});
		segment.structures[STRUCTURE_TOWER].pos.push({ x:towerOrder[towerPos].x, y:towerOrder[towerPos].y});
	}
	return segment;
}

function moveStructuresNear(segment, builder, buildingType, startPos, maxRange = 3) {
	let unsorted = getAllAsPosFromBlueprint(segment, builder, buildingType);
	let sortable = [];
	let fixed = [];

	let controllerPos = getFakeController(builder).pos;
	for (let i = 0; i < unsorted.length; i++) {		
		if (segment.structures[buildingType].pos[i].fixed) {
			fixed.push(segment.structures[buildingType].pos[i])
		} else {
			let range = unsorted[i].getRangeTo(startPos);

			if (range <= maxRange && unsorted[i].getRangeTo(controllerPos) <= 3) {
				sortable.push([unsorted[i], range]);
			} else {
				fixed.push(segment.structures[buildingType].pos[i])
			}
		}
	}

	sortable.sort(function(a, b) {
		return b[1] - a[1];});
	
	segment.structures[buildingType] = {};
	segment.structures[buildingType].pos = fixed;

	let length = sortable.length;
	for (let i=0; i < length; i++) {
		let pos = sortable[i][0];
		segment.structures[buildingType].pos.push({ x:pos.x, y:pos.y});
	}
	return segment;
}

function sortAllByDistanceFrom(segment, builder, buildingType, startPos, honorFixed = true){
	let unsorted = getAllAsPosFromBlueprint(segment, builder, buildingType);
	let sortable = [];
	let fixed = [];
//	console.log(" sortAllByDistanceFrom ")
	for (let i = 0; i < unsorted.length; i++) {

		if (segment.structures[buildingType].pos[i].fixed && honorFixed) {
			fixed.push(segment.structures[buildingType].pos[i])
		} else {
			let range = unsorted[i].getRangeTo(startPos);
			sortable.push([unsorted[i], range]);
		}
		
	//	drawText(builder, range  , unsorted[i].x, unsorted[i].y, {color: 'green', font: 0.8});
	}
	sortable.sort(function(a, b) {
		return a[1] - b[1];});
	
	segment.structures[buildingType] = {};
	segment.structures[buildingType].pos = fixed;

	let length = sortable.length;
	for (let i=0; i < length; i++) {
		let pos = sortable[i][0];
		segment.structures[buildingType].pos.push({ x:pos.x, y:pos.y});
	}
	return segment;
}


// copy this file into the simulator to see a visualization

// TODO: replace use of CostMatrix with some kind of set
// - we shouldn't need to iterate over entire 50x50 area every time;
//     mostly we only care about operating on a smaller set of room positions


function removeable(x, y, costMatrix) {
    let A, B, C;
    let D, E, F;
    let G, H, I;
    A = costMatrix.get(x-1, y-1); B = costMatrix.get(x  , y-1); C = costMatrix.get(x+1, y-1);
    D = costMatrix.get(x-1, y  ); E = costMatrix.get(x  , y  ); F = costMatrix.get(x+1, y  );
    G = costMatrix.get(x-1, y+1); H = costMatrix.get(x  , y+1); I = costMatrix.get(x+1, y+1);
    if (y == 0) {
        A = 1; B = 1; C = 1;
    }
    if (y == 49) {
        G = 1; H = 1; I = 1;
    }
    if (x == 0) {
        A = 1; D = 1; G = 1;
    }
    if (x == 49) {
        C = 1; F = 1; I = 1;
    }

    if (E == 0) { throw new Error('invalid square to check for removable'); }

    let count = 0;
    if (A > 0 && D == 0           ) { ++count; }
    if (B > 0 && A == 0 && D == 0 ) { ++count; }
    if (C > 0 && B == 0           ) { ++count; }
    if (F > 0 && C == 0 && B == 0 ) { ++count; }
    if (I > 0 && F == 0           ) { ++count; }
    if (H > 0 && I == 0 && F == 0 ) { ++count; }
    if (G > 0 && H == 0           ) { ++count; }
    if (D > 0 && G == 0 && H == 0 ) { ++count; }

    let isBreakPoint = count > 1;
    let isEndPointOrSinglePoint = (A + B + C + D + F + G + H + I) < 2;

    return !isBreakPoint && !isEndPointOrSinglePoint;
}


function removeSide(costMatrix, a, b) {
    let scratch = costMatrix.clone();
    let x, y;
    let adjx, adjy;

    let removedCount = 0;
    for (y = 0; y < 50; ++y) {
        for (x = 0; x < 50; ++x) {
            if (scratch.get(x, y) == 0) {
                continue;
            }
            adjx = x + a;
            adjy = y + b;

            let adjvalue = (0 <= adjx && adjx < 50 && 0 <= adjy && adjy < 50) ? scratch.get(adjx, adjy) : 1;

            if (adjvalue == 0 && removeable(x, y, scratch)) {
                costMatrix.set(x, y, 0);
                ++removedCount;
            }
            else
            {
                costMatrix.set(x, y, 1);
            }
        }
    }
    return removedCount;
}

function skeleton(costMatrix) {
    let north = 1, east = 1, south = 1, west = 1;
    do {
        north = removeSide(costMatrix,  0, -1);
        if (north + east + south + west == 0) break;
        east  = removeSide(costMatrix,  1,  0);
        if (north + east + south + west == 0) break;
        south = removeSide(costMatrix,  0,  1);
        if (north + east + south + west == 0) break;
        west  = removeSide(costMatrix, -1,  0);
    } while (north + east + south + west > 0);

    return costMatrix;
}

function drawCostMatrixSkeleton(costMatrix, color = '#FF0000') {
    let vis = new RoomVisual();
    let x, y, v;
    
    let max = 1;

    for (y = 0; y < 50; ++y) {
        for (x = 0; x < 50; ++x) {
            v = costMatrix.get(x, y);
            if (v) {
                let                                                           F = costMatrix.get(x+1, y);
                let G = costMatrix.get(x-1, y+1), H = costMatrix.get(x, y+1), I = costMatrix.get(x+1, y+1);
				if (F && !I && !H) {
					vis.line(x, y, x+1, y, {color:color, opacity:v/max});
					// HORIZONTAL RIGHT, LEFT
				}
				if (I && !H) {
					vis.line(x, y, x+1, y+1, {color:color, opacity:v/max});
					// DIAGONAL MOVE TOP_LEFT, BOTTOM_RIGHT
				}
				if (H && (!G || (G && I))) {
					vis.line(x, y, x, y+1, {color:color, opacity:v/max});
					// VERTICAL MOVE TOP, BOTTOM
				}
				if (G && (!H || (H && !I))) {
					vis.line(x, y, x-1, y+1, {color:color, opacity:v/max});
					// DIAGONAL MOVE TOP_RIGHT, BOTTOM_LEFT
				}
            }
        }
    }
}



/*
Memory.cpuUsed = 0;
Memory.timeUsed = 0;
Memory.count = 0;

module.exports.loop = function() {
    let startCpu = Game.cpu.getUsed(), startTime = Date.now();

    let skel = skeleton(walkablePixelsForRoom('sim'));

    let endCpu = Game.cpu.getUsed(), endTime = Date.now();

    drawCostMatrixSkeleton(skel);

    Memory.cpuUsed += (endCpu - startCpu);
    Memory.timeUsed += (endTime - startTime);
    Memory.count += 1;

    console.log("Time used:", _.round(Memory.timeUsed/Memory.count, 2) + "ms",
        "cpu used:", _.round(Memory.cpuUsed/Memory.count, 2),
        "averaged over:", Memory.count, "ticks");
};
*/


/*
//// OPTIMIZED DISTANCE TRANSFORM

let ticks = 0;
let totalCpu = 0;
let totalTime = 0;

module.exports.loop = function() {
    let roomName = Game.spawns.Spawn1.room.name;
    let time = (new Date()).getMilliseconds();
    let cpu = Game.cpu.getUsed();
    let dt = distanceTransform(walkablePixelsForRoom(roomName)); // a bare Uint8Array
    const cm = new PathFinder.CostMatrix();
    cm._bits = dt; // now we have a real CostMatrix for future use
    time = (new Date()).getMilliseconds() - time;
    cpu = Game.cpu.getUsed()-cpu;
    ticks++;
    totalCpu += cpu;
    totalTime += time;
    console.log(`dt for ${roomName} took ${time}ms (avg ${totalTime/ticks}) ${cpu}cpu (avg ${totalCpu/ticks})`);
}


function distanceTransform(array, oob = 255) {
    // Variables to represent the 3x3 neighborhood of a pixel.
    let A, B, C;
    let D, E, F;
    let G, H, I;

    let n, value;
    for (n = 0; n < 2500; n++) {
        if (array[n] !== 0) {
            A = array[n-51]; B = array[n- 1];
            D = array[n-50];
            G = array[n-49];
            if (   n%50  ==  0) { A = oob; B = oob; }
            if (   n%50  == 49) { G = oob; }
            if (~~(n/50) ==  0) { A = oob; D = oob; G = oob; }

            array[n]=(Math.min(A, B, D, G, 254) + 1);
        }
    }

    for (n = 2499; n >=0; n--) {
        ;                                 C = array[n+49];
        ;                E = array[n   ]; F = array[n+50];
        ;                H = array[n+ 1]; I = array[n+51];
        if (   n%50  ==  0) { C = oob; }
        if (   n%50  == 49) { H = oob; I = oob; }
        if (~~(n/50) == 49) { C = oob; F = oob; I = oob; }

        value = Math.min(C + 1, E, F + 1, H + 1, I + 1);
        array[n]=(value);
    }

    return array;
}

function walkablePixelsForRoom(roomName) {
    let array = new Uint8Array(2500);
    for (let x = 0; x < 50; ++x) {
        for (let y = 0; y < 50; ++y) {
            if (getRoomTerrainAt(x, y, roomName) !== TERRAIN_MASK_WALL) {
                array[x*50+y] = 1;
            } else {
                array[x*50+y] = 0;
            }
        }
    }
    return array;
}
*/