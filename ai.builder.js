'use strict'
let builderExport = {	

    /** @param {builder} builder **/
    run: function(builder, segmentId) {
		
    	let evalMode;		
		if (builder !== segmentId) {
			evalMode = true;
		}

		if (Memory.rooms[builder].explodeRoom === 1) {
			performExplode(builder);

			Memory.rooms[builder] = {};
			Memory.rooms[builder].resetSafeModeCd = 1;

			return;
		} else if (Memory.rooms[builder].resetSafeModeCd === 1) {
			unclaimController(Game.rooms[builder].controller);
			return;
		}

		let init = Game.cpu.getUsed();
		if (!accessMemorySegment(segmentId) ) {
			console.log(builder+ " aiBuilder no access to id " +segmentId +" raw " +lib_segments.getIndexByLabel(segmentId));
			return 0;
		}
		
		// LOAD BUILDER SEGMENT
		let segment = getMemorySegment(segmentId);

		if (segment.segmentId !== "BaseEval" && 
			((segment.roomName !== undefined && segment.roomName !== builder) || 
			(segment.buildPosCenter !== undefined && segment.buildPosCenter.roomName !== builder))
			
		) {
			log(builder + " missing blueprint segment?" + segment.roomName)
		}

		global.stats['cpu.aiBuilder.getMemorySegment'] = Game.cpu.getUsed()-init;


		init = Game.cpu.getUsed();
		if (Game.cpu.bucket >= 500 && (!Memory.rooms[builder].blueprintComplete || evalMode)) {

			
			global.aiRoomPlanner = require('ai.roomPlanner');
			aiRoomPlanner.createRoomLayout(builder, segmentId);
			if (!isCpuLimited() && Game.rooms[builder]) {
				displayRoomLayout(segment, builder);
			}
		} else if (Memory.rooms[builder].rebuild && Game.cpu.bucket >= 500) {
			rebuildRoom(builder, segmentId);
		}
		global.stats['cpu.aiBuilder.createRoomLayout'] = Game.cpu.getUsed()-init;
		
		init = Game.cpu.getUsed();
		if (BOT_MODE && Game.cpu.bucket >= 1500 && Game.rooms[builder]) {
		//	displayRoomLayout(segment, builder);
			// DISPLAY LABS INFO
			if (Game.cpu.bucket > 9000) {
				let labs = Game.rooms[builder].findByType(STRUCTURE_LAB);
				for (let i=0; i < labs.length; i++) {
					Game.rooms[builder].visual.resource(labs[i].mineralType, labs[i].pos.x, labs[i].pos.y, 0.35);
				}
			}
		}
		global.stats['cpu.aiBuilder.displayRoomLayout'] = Game.cpu.getUsed()-init;

		if (evalMode) { return; }


		if (!segment.blueprintComplete || !Memory.rooms[builder].blueprintComplete) { 
			if (BOT_MODE && Memory.myRoomHighPRCL < 5 && 
				countCurrentBuildingType(segment, STRUCTURE_SPAWN) > 0 && 
				Game.rooms[builder] && Game.rooms[builder].controller.my && 
				canBuildStructure(builder, STRUCTURE_SPAWN, Game.rooms[builder].controller.level)
			) {
				// Allow spawn to be placed while creating room layout!
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_SPAWN, 1, false); 
				log(builder + " allow early spawn!" )

				if (!Game.rooms[builder]._cache.sourcesSorted) {
					let spawns = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);
					sortSources(builder, spawns[0]);
					Game.rooms[builder]._cache.sourcesSorted = true;
				}

			} else {
				return 0;
			}
		} else {
			Memory.rooms[builder].blueprintComplete = 1;

			if (Memory.rooms[builder].romPlnV === undefined ) {
				Memory.rooms[builder].romPlnV = "0.0.0";
				Memory.rooms[builder].baseLayoutRating = segment.roomScore;
			}

			Memory.rooms[builder][R.CONTROLLER_CONT_POS] = segment.controllerContainerPos;			

			if (ENABLE_SPAWN_EXTENSIONS) {
				Memory.rooms[builder].spawnFillerPos = segment.fillerPos;				
				Memory.rooms[builder].spawnContPos = segment.spawnContPos;				
				Memory.rooms[builder].spawnLinkPos = segment.spawnLinkPos;
				Memory.rooms[builder].craneExtPos = segment.craneExtPos;
			}
		}

		// FIND CONTROLLERS, EXIT IF NO CONTROLLER	
		if (!Game.rooms[builder] || !Game.rooms[builder].controller.my) {	
            return 0;
		}

		init = Game.cpu.getUsed();
		if (global.roadsCache[builder] === undefined) {			
			registerRoadsInCache(builder, segmentId);			
		}
		global.stats['cpu.aiBuilder.registerRoadsInCache'] = Game.cpu.getUsed()-init;
		
		if (global.containerCache[builder] === undefined || global.containerCache[builder].created === undefined) {
			registerContainerInCache(builder, segmentId);
		}

		if (!segment.rommClear && segment.blueprintComplete) { 
			clearRoom(builder);
			segment.rommClear = 1;
			saveMemorySegment(segmentId, segment);
		}

		if (Memory.roomIdBase === undefined) { Memory.roomIdBase = 0; }
		if (Memory.rooms[builder].roomId === undefined) {
			Memory.rooms[builder].roomId = Memory.roomIdBase;			
			Memory.roomIdBase++;
		}

		// EXECUTE BUILDER IN SERIES
		if (Memory.rooms[builder].bt === undefined) { Memory.rooms[builder].bt = 0; }
		Memory.rooms[builder].bt += 1;

		
		
		
		let RCL = Game.rooms[builder].controller.level;
		init = Game.cpu.getUsed();
		if (getRoomPRCL(builder) >= 3 || Memory.nukeRampart[builder]) {
			protectFromNukes(builder);
		}
		global.stats['cpu.aiBuilder.protectFromNukes'] = Game.cpu.getUsed()-init;

		init = Game.cpu.getUsed();
		updateWallInfo(builder);
		global.stats['cpu.aiBuilder.updateWallInfo'] = Game.cpu.getUsed()-init;

		if (!global.cranePos[builder] && accessMemorySegment(segmentId)) {			
			setCranePos(builder, segment);
		}

		if (!global.rampartCache[builder] || Memory.rooms[builder].bt % 200 == 1) {
			regRampartsInCache(builder, segment);
		}

		let mineMinimalResOnly = false;
		if (SEASONAL_THORIUM && Memory.rooms[builder].mineOnly && Memory.getMoreThorium) {
			mineMinimalResOnly = true;
		}
		
		init = Game.cpu.getUsed();
		if (Game.time >= Game.rooms[builder]._cache.buildNext || Game.rooms[builder]._cache.buildNext === undefined){		
			
			let requiredSpawnContainers = 1
			if (RCL >= 3) {
				requiredSpawnContainers = 2;
			}
			
			let needRampartForKeyStructure = false;
			if (getRoomPRCL(builder) < 3 || 
				BOT_MODE ||
				Memory.rooms[builder].roomBreached ||
				Memory.rooms[builder].reinforce
			){ 
				if (roomIsSafeModed(builder) < 3000 && (!Memory.rooms[builder].newRCL || getRoomPRCL(builder) < 3)) {
					needRampartForKeyStructure = true;
				}
			}
			
			let currentTowers = currentStructures(builder, STRUCTURE_TOWER)
			// RAMPARTS ON KEY STRUCTURES
			if (needRampartForKeyStructure && buildRampartOnKeyStructures(builder, segment, RCL, currentTowers, currentStructures(builder, STRUCTURE_SPAWN)) && unStuck() ) {
				console.log(builder + " creating key rampart " )
			}
			// BUILD INITIAL TOWERS
			else if (canBuildStructure(builder, STRUCTURE_TOWER, Math.min(5, RCL)) && roomIsSafeModed(builder) < 5000 && unStuck()){
				console.log(builder + " building " + STRUCTURE_TOWER);
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_TOWER, 3, needRampartForKeyStructure);
			}
			// BUILD SPAWN		
			else if (canBuildStructure(builder, STRUCTURE_SPAWN, RCL) && unStuck() ){
				console.log(builder + " building " + STRUCTURE_SPAWN);
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_SPAWN, 3, needRampartForKeyStructure);                       
			} 
			// BUILD REST OF TOWERS
			else if (canBuildStructure(builder, STRUCTURE_TOWER, RCL) && roomIsSafeModed(builder) < 5000 && unStuck()){  
				console.log(builder + " building " + STRUCTURE_TOWER);
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_TOWER, 3, needRampartForKeyStructure);
			}
			// BUILD FIRST SPAWN CONTAINER
			else if (ENABLE_SPAWN_EXTENSIONS && RCL >= 2 && Game.rooms[builder].getSpawnContainers().length < 1 && unStuck() ) {
				console.log(builder + " building FIRST SPAWN " + STRUCTURE_CONTAINER);
				let pos = Game.rooms[builder].getSpawnContainerPos();
				if (pos && pos.length) {
					Game.rooms[builder].createConstructionSite(pos[0], STRUCTURE_CONTAINER);
				}	
			// BUILD ALL SPAWN CONTAINERS
			} else if (ENABLE_SPAWN_EXTENSIONS && RCL >= 3 && Game.rooms[builder].getSpawnContainers().length < 2 && !constructingStructures(builder, STRUCTURE_CONTAINER) && unStuck() ) {
				console.log(builder + " building SECOND SPAWN" + STRUCTURE_CONTAINER);
				let pos = Game.rooms[builder].getSpawnContainerPos();
				if (pos && pos.length) {
					for (let idx in pos) {
						Game.rooms[builder].createConstructionSite(pos[idx], STRUCTURE_CONTAINER);
					}
				}		
			// BUILD EXTENSIONS		
			} else if (canBuildStructure(builder, STRUCTURE_EXTENSION, RCL) && 
					constructingStructures(builder, STRUCTURE_EXTENSION) < 5 && 
					(!ENABLE_SPAWN_EXTENSIONS || Game.rooms[builder].getSpawnContainers().length >= requiredSpawnContainers) &&
					(currentStructures(builder, STRUCTURE_EXTENSION) + constructingStructures(builder, STRUCTURE_EXTENSION) < countCurrentBuildingType(segment, STRUCTURE_EXTENSION)) && // CHECK IN CASE LAYOUT IS MISSING, DUE TO TOWER REPLACEMENTS
					unStuck()
				){
				let requiredExtensions = (limit(canBuildStructure(builder, STRUCTURE_EXTENSION, RCL), 0, 10));
				console.log(builder + " building " + requiredExtensions + " "+ STRUCTURE_EXTENSION + " blueprints " + countCurrentBuildingType(segment, STRUCTURE_EXTENSION) + "/"+ canBuildStructure(builder, STRUCTURE_EXTENSION, RCL));
			//	buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_EXTENSION, requiredExtensions);
				buildExtensions(builder, segment, requiredExtensions)

			// BUILD TERMINAL
			} else if (Memory.buildTerminal && canBuildStructure(builder, STRUCTURE_TERMINAL, RCL) && unStuck() ){
				console.log(builder + " building " + STRUCTURE_TERMINAL);
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_TERMINAL, 1, needRampartForKeyStructure);
			
			// BUILD STORAGE
			} else if (canBuildStructure(builder, STRUCTURE_STORAGE, RCL) && unStuck() ){
				console.log(builder + " building " + STRUCTURE_STORAGE);
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_STORAGE, 1, needRampartForKeyStructure);
			}		
			// BUILD EXTRACTOR
			else if (canBuildStructure(builder, STRUCTURE_EXTRACTOR, RCL) && unStuck() && !Game.rooms[builder].mineralOnCd() && wantToMineMineral(Game.rooms[builder].getMinerals()[0].mineralType, mineMinimalResOnly) ){   
				console.log(builder + " building " + STRUCTURE_EXTRACTOR);
				let minerals = Game.rooms[builder].getMinerals();
				Game.rooms[builder].createConstructionSite(minerals[0].pos, STRUCTURE_EXTRACTOR);
			} else if (SEASONAL_THORIUM && HARVEST_THORIUM && canBuildStructure(builder, STRUCTURE_EXTRACTOR, RCL) && unStuck() && Game.rooms[builder].getThorium() && Game.rooms[builder].getThorium().mineralAmount > THORIUM_MIN_EXTRACTOR){
				console.log(builder + " building " + STRUCTURE_EXTRACTOR);
				let thorium = Game.rooms[builder].getThorium();
				Game.rooms[builder].createConstructionSite(thorium.pos, STRUCTURE_EXTRACTOR);
			
			// CONTROLLER CONTAINER
			} else if (RCL >= 2 && RCL < 8 && Game.rooms[builder].getControllerContainer().length <= 0 && Game.rooms[builder].getSpawnContainers().length >= 1 && !constructingStructures(builder, STRUCTURE_CONTAINER) && countCurrentBuildingType(segment, STRUCTURE_EXTENSION) >= 5 && unStuck() ) {
				console.log(builder + " building CONTROLLER " + STRUCTURE_CONTAINER);
				buildControllerContainerFromBlueprint(builder, segment);
			}
			// BUILD LABS
			else if (Memory.buildLabs && !Memory.rooms[builder].mineOnly && canBuildStructure(builder, STRUCTURE_LAB, RCL) && Game.rooms[builder].energyStatus() >= ECONOMY_LOW && unStuck() ){
				console.log(builder + " building " + STRUCTURE_LAB);
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_LAB, 10, needRampartForKeyStructure);
			}			
			// BUILD POWER SPAWN
			else if (RCL >= 8 /*&& !BOT_MODE*/ && Memory.Minerals[RESOURCE_POWER] && canBuildStructure(builder, STRUCTURE_POWER_SPAWN, RCL) && unStuck()){
				console.log(builder + " ######  building " + STRUCTURE_POWER_SPAWN + " needRampart " + needRampartForKeyStructure);
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_POWER_SPAWN, 1);
			}
			// BUILD OBSERVER
			else if (RCL >= 8 && canBuildStructure(builder, STRUCTURE_OBSERVER, RCL) && countCurrentBuildingType(segment, STRUCTURE_OBSERVER) && unStuck() ){
				console.log(builder + " ######  building " + STRUCTURE_OBSERVER);
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_OBSERVER, 1);
			}
			// BUILD LINKS
			else if (canBuildStructure(builder, STRUCTURE_LINK, RCL)  &&
				(currentStructures(builder, STRUCTURE_LINK) + constructingStructures(builder, STRUCTURE_LINK)) < countCurrentBuildingType(segment, STRUCTURE_LINK) && 
				unStuck()
			){ 	
				console.log(builder + " building " + STRUCTURE_LINK + currentStructures(builder, STRUCTURE_LINK) + "/"+ countCurrentBuildingType(segment, STRUCTURE_LINK));	
				buildLinks(builder, segment, segmentId);
			} // BUILD FACTORY			
			else if (Memory.buildFactory && canBuildStructure(builder, STRUCTURE_FACTORY, RCL) && Game.rooms[builder].energyStatus() >= ECONOMY_LOW && unStuck() ){
				console.log(builder + " ######  building " + STRUCTURE_FACTORY + " needRampart " + needRampartForKeyStructure);
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_FACTORY, 1, needRampartForKeyStructure);
			} // BUILD NUKER
			else if (!ECO_MODE && canBuildStructure(builder, STRUCTURE_NUKER, RCL) && Game.rooms[builder].energyStatus() > ECONOMY_LOW && countCurrentBuildingType(segment, STRUCTURE_NUKER) && 
				Game.rooms[builder].energyStatus() >= ECONOMY_DEVELOPING 
			){
				console.log(builder + " ######  building " + STRUCTURE_NUKER);
				buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_NUKER, 1);
			}
			else {
				if (Memory.rooms[builder].newRCL || getRoomPRCL(builder) < 4) {
					Game.rooms[builder]._cache.buildNext = Game.time + 7;
				} else {
					Game.rooms[builder]._cache.buildNext = Game.time + 147;
				}
			}
		}
		global.stats['cpu.aiBuilder.placeStructures'] = Game.cpu.getUsed()-init;
		
		// BT BASED		
		global.stats['cpu.aiBuilder.buildWalls'] = 0;
		global.stats['cpu.aiBuilder.buildWallLayer2'] = 0;
		global.stats['cpu.aiBuilder.buildRoads'] = 0;
		

		let rclToBuildWalls = 5;
        if (BOT_MODE || SWC_MODE) {
			if (Memory.myRoomHighPRCL < 5 && roomIsSafeModed(builder) > 4000) {
				// stick with 5 as target rcl 
			} else {
				rclToBuildWalls = 3;
			}
		}

		// DECIDE WHEN TO DESTROY EXTRACTOR
		if (SEASONAL_THORIUM && HARVEST_THORIUM && getRoomRCL(builder) >= 6) {
			moveExtractor(builder, mineMinimalResOnly)
		}

		if (Memory.rooms[builder].buildLayer2 && Game.time > Memory.rooms[builder].buildLayer2) { delete Memory.rooms[builder].buildLayer2}
		
		if (getRoomPRCL(builder) >= rclToBuildWalls && (Memory.rooms[builder].bt % 10 == 1 || Memory.rooms[builder].sieged) && constructingStructures(builder, STRUCTURE_RAMPART) < 5 ){	
			// BUILD WALLS
			init = Game.cpu.getUsed();
			let wallsToBuild = 7 - constructingStructures(builder, STRUCTURE_RAMPART);
			buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_RAMPART, wallsToBuild);
			global.stats['cpu.aiBuilder.buildWalls'] += Game.cpu.getUsed()-init;
		} else if (((!Memory.rooms[builder].rebuild && AUTO_BUILD_WALL_LAYER2 && getRoomPRCL(builder) >= 7) ||
			(Memory.rooms[builder].roomBreached && getRoomPRCL(builder) >= 5 ) ||
			(Memory.rooms[builder].buildLayer2 && getRoomPRCL(builder) >= 5 && Memory.myRoomHighPRCL >= 7)) &&
			Memory.rooms[builder].bt % 10 == 5
		){
			init = Game.cpu.getUsed();

			let lowWallHp = getLowWallHp(builder)
			if ((lowWallHp >= getAvgWallHp(builder) * 0.5) || 
				lowWallHp >= 500000
			) {
				buildWallLayer2(segmentId, builder, 10);
				
			}
			global.stats['cpu.aiBuilder.buildWallLayer2'] += Game.cpu.getUsed()-init;
		}

		// BUILD ROADS
		let buildTick = 5;
		if (BOT_MODE){
			buildTick = 1;
		}

		let allowBuildRoads = false;
		if (getRoomPRCL(builder) >= 3 || (getRoomPRCL(builder) >= 2 && Game.rooms[builder].getControllerContainer().length > 0)) {
			allowBuildRoads = true
		}

		if (allowBuildRoads && Memory.rooms[builder].bt % buildTick === 0 ){	
			init = Game.cpu.getUsed();

			buildRoads(builder, segmentId);

			global.stats['cpu.aiBuilder.buildRoads'] += Game.cpu.getUsed()-init;
		}
		

		if (Memory.rooms[builder].extCnt === undefined) {
			Memory.rooms[builder].extCnt = 0;
		}

		if (currentStructures(builder, STRUCTURE_EXTENSION) !== Memory.rooms[builder].extCnt) {

			delete Memory.rooms[builder].spawnQ;
			delete Memory.rooms[builder].fillOrder;
			Memory.rooms[builder].extCnt = currentStructures(builder, STRUCTURE_EXTENSION);
			Game.rooms[builder].getSpawnExtensions(true);
			let sources = Game.rooms[builder].find(FIND_SOURCES); 	
			for (let i = 0; i < sources.length; i++) {
				sources[i].getSourceExtensions(true)
			}			
		}

		if ((Game.cpu.bucket >= 500 &&
			Memory.rooms[builder].extCnt > 0) && 
			(Memory.rooms[builder].fillOrder === undefined || 
			Memory.rooms[builder].extClst)		
		){
			createExtensionCluster(builder);
		}

		if (currentAnyStructures(builder, STRUCTURE_CONTAINER) !== Game.rooms[builder]._cache.contCnt) {
			Game.rooms[builder].getControllerContainer(true);
			Game.rooms[builder].getSpawnContainers(true);
			Game.rooms[builder]._cache.contCnt = currentAnyStructures(builder, STRUCTURE_CONTAINER);
		}

		if (Memory.rooms[builder].bt % 1000 === 0){			
			let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);
			if (!segmentOOB || !segmentOOB.oob || !segmentOOB.oob[builder] ||
				segment.wallLayer2Complete && segment.wallLayer2.length === 0
				) {

				if (global.setOusidePixelsObject) {
					delete global.setOusidePixelsObject[segmentId]
				}
				delete segmentOOB.oob[segmentId];
				delete global.oob[segmentId];
				setOutisdePixels(builder, segmentOOB, undefined, segmentId);	
				
				if (segment.wallLayer2Complete && segment.wallLayer2.length === 0) {
					delete segment.wallLayer2Complete;
					saveMemorySegment(segmentId, segment);
				}
			}
		}
    }
};
module.exports = builderExport;

global.unStuck = function(chance = 0.05){
	if (Math.random() > chance) {
		return true;
	}

	return false;
}

function moveExtractor(roomName, mineMinimalResOnly) {

	let extractor = Game.rooms[roomName].findByType(STRUCTURE_EXTRACTOR)[0];
	if (!extractor) { return; }

	let mineral = Game.rooms[roomName].getMinerals()[0];
	let mineralExtractor = mineral.pos.lookForStructure(STRUCTURE_EXTRACTOR);

	if (mineral && (mineral.mineralAmount || mineral.ticksToRegeneration < 500) && wantToMineMineral(mineral.mineralType, mineMinimalResOnly)) {
		if (!mineralExtractor) {
			extractor.destroy();
			Game.rooms[roomName]._cache.buildNext = Game.time;
		}
		return;
	}

	let thorium = Game.rooms[roomName].getThorium();
	let thoriumExtractor;
	if (thorium) {
		thoriumExtractor = thorium.pos.lookForStructure(STRUCTURE_EXTRACTOR);
	} else {
		if (!mineralExtractor) {
			extractor.destroy();
		}
	}

	if (thorium && !thoriumExtractor && thorium.mineralAmount >= THORIUM_MIN_EXTRACTOR) {

		if (mineralExtractor && mineral && mineral.ticksToRegeneration < 2000 && wantToMineMineral(mineral.mineralType, mineMinimalResOnly)) {		
			return;
		}
		extractor.destroy();
		Game.rooms[roomName]._cache.buildNext = Game.time;
	}
}

global.isNearGCLmilestone = function() {
//	let gclOffset = getGclOffset(Game.gcl.level);
//	let levelProgress = gclOffset - Game.gcl.progress;
//	let levelTotal = Game.gcl.progressTotal - gclOffset;

	let remainder =  Game.gcl.progressTotal  - Game.gcl.progress;
	return remainder
}

function delayBuildToReachMilestone(roomName) {
	if (!Game.rooms[roomName]._cache.currentCsCost) {
		let constructions = Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES)
		let cost = 0;
		for (let idx in constructions) {
			let cSite = constructions[idx]
			cost += cSite.progressTotal - cSite.progress;
		}
	}
}


global.getAllAsCompressedPosFromBlueprint = function(segment, builder, type, ignoreFixed = false){
	let all = {};
	if (segment.structures && segment.structures[type]) {
		let structures = segment.structures[type];
		for (let idx = 0; idx < structures.pos.length; idx++) {
			if (ignoreFixed && structures.pos[idx].fixed) { continue }
			all[posCompressXY(structures.pos[idx].x, structures.pos[idx].y)] = {};		
		}
	}
	return all;
}

function removeInvalidStructures(builder, segmentId, structureType, maxDestroy=1){
	if (!accessMemorySegment(segmentId) ) {
		console.log(" buildFromBlueprintTemplate no access to id " +segmentId);
		return -1;
	}
	// LOAD BUILDER SEGMENT
	let segment = getMemorySegment(segmentId);

	let foundStructures = Game.rooms[builder].findByType(structureType, true);
	if (foundStructures.length === 0) { return 0; }
	let validPlacements = getAllAsCompressedPosFromBlueprint(segment, builder, structureType, true);
	if (Object.keys(validPlacements).length === 0) { return 0; }

	let removed = 0;
	for (let idx in foundStructures) {
		let currentPos = posCompress(foundStructures[idx].pos);
		if (!validPlacements[currentPos]) {
			removed++;
			foundStructures[idx].destroy();
		}
		if (removed >= maxDestroy) { break; }
	}
	if (removed > 0) {
		Memory.rooms[builder].removedStructure = removed;
	}
	return removed;
}

function makeRoomForStructures(builder, segmentId, structureType, newStrucutres=1){
	if (!accessMemorySegment(segmentId) ) {
		console.log(" makeRoomForStructures no access to id " +segmentId);
		return -1;
	}
	// LOAD BUILDER SEGMENT
	let segment = getMemorySegment(segmentId);

	let validPlacements = getAllAsPosFromBlueprint(segment, builder, structureType);

	log("making room for " + structureType + " needs " + newStrucutres + " checking positions " + validPlacements.length)
	let freeSpaces = 0;
	let blockingStructures = [];
	
	for (let idx in validPlacements) {
		let blocked = false;
		let results = validPlacements[idx].lookFor(LOOK_STRUCTURES);
		for (let res of results) {
			if ((OBSTACLE_OBJECT_TYPES.includes(res.structureType) || res.structureType === STRUCTURE_CONTAINER)) {
				blocked = true;
				if (res.structureType !== structureType) {
					blockingStructures.push(res);
				}
				break;
			} 
		}

		if (validPlacements[idx].lookFor(LOOK_CONSTRUCTION_SITES).length > 0) { blocked = true; }
		
		if(!blocked) {
			freeSpaces++;
		}
		
	}

	log("found free spaces " + freeSpaces + " blocking structues " + blockingStructures.length)
	
	if (freeSpaces >= newStrucutres) {
		return;
	}

	for (let idx in blockingStructures) {
		log("destroying " + blockingStructures[idx] )
		blockingStructures[idx].destroy();
		
		freeSpaces++;
		if (freeSpaces >= newStrucutres) {
			break;
		}
	}
}


global.countCurrentBuildingType = function(segment, buildingType){
	let count = 0;
	if (segment.structures && segment.structures[buildingType]) {
		count = segment.structures[buildingType].pos.length;
	}
	return count;
}


function removeOldRamparts(builder, segmentId) {
	

	// LOAD BUILDER SEGMENT
	let segment = getMemorySegment(segmentId);

	let currentRamparts = Game.rooms[builder].findByType(STRUCTURE_RAMPART);
	if (currentRamparts.length === 0) { return 0; }
	let validPlacements = getAllAsCompressedPosFromBlueprint(segment, builder, STRUCTURE_RAMPART);

	if (segment.wallLayer2) {
		let ramparts = segment.wallLayer2;
		for (let idx = 0; idx < ramparts.length; idx++) {			
			let validPos = posCompressXY(ramparts[idx].x, ramparts[idx].y);
			validPlacements[validPos] = {};
		}
	}

	let validProtectStructures = [
		"spawn", "storage", "tower", "observer", "powerSpawn", "powerBank", "lab", "terminal","nuker"
	];

	let removed = 0;
	for (let idx in currentRamparts) {
		let currentPos = posCompress(currentRamparts[idx].pos);
		if (!validPlacements[currentPos]) {

			let results = currentRamparts[idx].pos.lookFor(LOOK_STRUCTURES);
			let canProtect = false;
			for (let res of results) {
				if (validProtectStructures.includes(res.structureType) ){
					canProtect = true;
					break;
				}
			}

			if (canProtect) { continue; }

			removed++;
			currentRamparts[idx].destroy();
		}
	}
	return removed;

}

function rebuildRoom(builder, segmentId){

	if (Memory.rooms[builder].rebuildSteps === undefined) { Memory.rooms[builder].rebuildSteps = {}; }

	Game.rooms[builder]._cache.buildNext = Game.time;
	let RCL = Game.rooms[builder].controller.level;
	log("rebuilding room! " + builder)

	let removed;
	let needsRoom;
	let segment;

	if (Memory.rooms[builder].removedStructure) {
		log("rebuilding room has removed structures, waiting " + builder)
		delete Memory.rooms[builder].removedStructure;
		return;
	}

	// create new ramparts
	if (Memory.rooms[builder].rebuildSteps.createRamparts === undefined) {
		let builtRamparts = buildFromBlueprintTemplate(builder, segmentId, STRUCTURE_RAMPART, 10);
		if (builtRamparts === 0) {
			Memory.rooms[builder].rebuildSteps.createRamparts = 1;
			updateWallInfo(builder, true)
		}
		log(builder + " rebuilding room, building ramparts " + builtRamparts)
	} else if (Memory.rooms[builder].rebuildSteps.upgradeRamparts === undefined) {
		updateWallInfo(builder, true)

		let missingHp = Math.min((getAvgWallHp(builder) * 0.75), 5000000) - getLowWallHp(builder);
		log(builder + " rebuilding room, reinforcing ramparts missing hp " + missingHp )
		if (missingHp <= 0) {
			Memory.rooms[builder].rebuildSteps.upgradeRamparts = 1;
		} else {			
			if (missingHp > 500000 && Game.rooms[builder].energyStatus() < ECONOMY_SURPLUS) {
				if (Memory.energyShare && !Memory.energyShare[builder]) {
					if (Memory.energyShare.recieve === undefined) { Memory.energyShare.recieve = {}; }
					Memory.energyShare.recieve[builder] = {};
					console.log("asking for energy, missing hp " + missingHp)
				}
			}
		}
		
	} else if (Memory.rooms[builder].rebuildSteps.evacuateRes === undefined) {
		ABANDON_SHIP[builder] = {};
		Memory.rooms[builder].abandonResources = 1;
		if (Memory.rooms[builder].evacuatedResources) {
		//	delete Memory.rooms[builder].evacuatedResources;
		//	delete ABANDON_SHIP[builder];
			Memory.rooms[builder].rebuildSteps.evacuateRes = 1;
		}
		log(builder + " rebuilding room, evacuating resources ")
	} else if (Memory.rooms[builder].rebuildSteps.spawnsMoved === undefined) {
		// move STRUCTURE_SPAWN
		log(builder + " rebuilding room, rebuilding spawns ")
		delete Memory.rooms[builder].hasCrane;
		delete global.cranePos[builder];
		Memory.rooms[builder].delayCrane = 1;
		if (constructingStructures(builder, STRUCTURE_SPAWN) > 0) { return; }
		removed = removeInvalidStructures(builder, builder, STRUCTURE_SPAWN, 1);
		needsRoom = Math.max(removed, canBuildStructure(builder, STRUCTURE_SPAWN, RCL));
		log("needs room " + needsRoom)
		if (removed === 0 && currentStructures(builder, STRUCTURE_SPAWN) >= 3) {
			Memory.rooms[builder].rebuildSteps.spawnsMoved = 1;
		} else if (needsRoom > 0) {
			makeRoomForStructures(builder, segmentId, STRUCTURE_SPAWN, needsRoom)
		}
		
	} else if (Memory.rooms[builder].rebuildSteps.terminalMoved === undefined) {
		// move STRUCTURE_TERMINAL
		log(builder + " rebuilding room, rebuilding terminal ")
		if (constructingStructures(builder, STRUCTURE_TERMINAL) > 0) { return; }
		removed = removeInvalidStructures(builder, segmentId, STRUCTURE_TERMINAL, 1);
		needsRoom = Math.max(removed, canBuildStructure(builder, STRUCTURE_TERMINAL, RCL));
		if (removed === 0 && currentStructures(builder, STRUCTURE_TERMINAL) >= 1) {
			Memory.rooms[builder].rebuildSteps.terminalMoved = 1;	
			delete ABANDON_SHIP[builder];
		} else if (needsRoom > 0 ) {
			makeRoomForStructures(builder, segmentId, STRUCTURE_TERMINAL, needsRoom)
		}
		
	} else if (Memory.rooms[builder].rebuildSteps.storageMoved === undefined) {
		// move STRUCTURE_STORAGE
		if (constructingStructures(builder, STRUCTURE_STORAGE) > 0) { return; }
		log(builder + " rebuilding room, rebuilding storage ")
		removed = removeInvalidStructures(builder, segmentId, STRUCTURE_STORAGE, 1);
		needsRoom = Math.max(removed, canBuildStructure(builder, STRUCTURE_STORAGE, RCL));
		if (removed === 0 && currentStructures(builder, STRUCTURE_STORAGE) >= 1) {
			Memory.rooms[builder].rebuildSteps.storageMoved = 1;
			delete Memory.rooms[builder].delayCrane;
			delete Memory.rooms[builder].evacuatedResources;
			delete Memory.rooms[builder].abandonResources;
		} else if (needsRoom > 0 ) {
			makeRoomForStructures(builder, segmentId, STRUCTURE_STORAGE, needsRoom)
		}		
	} else if (Memory.rooms[builder].rebuildSteps.factoryMoved === undefined) {
		// move STRUCTURE_STORAGE
		if (constructingStructures(builder, STRUCTURE_FACTORY) > 0) { return; }
		log(builder + " rebuilding room, rebuilding factory ")
		removed = removeInvalidStructures(builder, segmentId, STRUCTURE_FACTORY, 1);
		needsRoom = Math.max(removed, canBuildStructure(builder, STRUCTURE_FACTORY, RCL));
		if (removed === 0 && currentStructures(builder, STRUCTURE_FACTORY) >= 1) {
			Memory.rooms[builder].rebuildSteps.factoryMoved = 1;
		} else if (needsRoom > 0 ) {
			makeRoomForStructures(builder, segmentId, STRUCTURE_FACTORY, needsRoom)
		}	
	} else if (Memory.rooms[builder].rebuildSteps.linksMoved === undefined) {
		// move STRUCTURE_LINK
		log(builder + " rebuilding room, destroying links ")
		let links = _.filter(Game.rooms[builder].findByType([STRUCTURE_LINK]), 
			function(c) {return (c.isController() || c.isStorage() || c.isProvider() )
			});	
			
		for (let idx in links ){
			links[idx].destroy();
		}

		let container = _.filter(Game.rooms[builder].findByType([STRUCTURE_CONTAINER]), 
			function(c) {return (c.isController() )
			});	
			
		for (let idx in container ){
			container[idx].destroy();
		}
		
		Memory.rooms[builder].rebuildSteps.linksMoved = 1;

	} else if (Memory.rooms[builder].rebuildSteps.psMoved === undefined) {
		// move STRUCTURE_POWER_SPAWN
		log(builder + " rebuilding room, rebuilding power spawn ")
		if (constructingStructures(builder, STRUCTURE_POWER_SPAWN) > 0) { return; }
		removed = removeInvalidStructures(builder, segmentId, STRUCTURE_POWER_SPAWN, 1);
		needsRoom = Math.max(removed, canBuildStructure(builder, STRUCTURE_POWER_SPAWN, RCL));
		if (removed === 0) {
			Memory.rooms[builder].rebuildSteps.psMoved = 1;
		} else if (needsRoom > 0 ) {
			makeRoomForStructures(builder, segmentId, STRUCTURE_POWER_SPAWN, needsRoom)
		}		
	} else if (Memory.rooms[builder].rebuildSteps.towersMoved === undefined) {
		// move STRUCTURE_TOWER
		log(builder + " rebuilding room, rebuilding towers")
		if (constructingStructures(builder, STRUCTURE_TOWER) > 0) { return; }
		removed = removeInvalidStructures(builder, segmentId, STRUCTURE_TOWER, 2);
		needsRoom = Math.max(removed, canBuildStructure(builder, STRUCTURE_TOWER, RCL));
		if (removed === 0  && currentStructures(builder, STRUCTURE_TOWER) >= 6) {
			Memory.rooms[builder].rebuildSteps.towersMoved = 1;
		} else if (needsRoom > 0 ) {
			makeRoomForStructures(builder, segmentId, STRUCTURE_TOWER, needsRoom)
		}
		
	} else if (Memory.rooms[builder].rebuildSteps.labsMoved === undefined) {
		// move STRUCTURE_LAB
		log(builder + " rebuilding room, rebuilding labs")
		if (constructingStructures(builder, STRUCTURE_LAB) > 0) { return; }
		removed = removeInvalidStructures(builder, segmentId, STRUCTURE_LAB, 2);
		needsRoom = Math.max(removed, canBuildStructure(builder, STRUCTURE_LAB, RCL));
		if (removed === 0  && currentStructures(builder, STRUCTURE_LAB) >= 10) {
			Memory.rooms[builder].rebuildSteps.labsMoved = 1;
		} else if (needsRoom > 0 ) {
			makeRoomForStructures(builder, segmentId, STRUCTURE_LAB, needsRoom)
		}
		
	} else if (Memory.rooms[builder].rebuildSteps.extensionsMoved === undefined) {
		// move STRUCTURE_EXTENSION
		log(builder + " rebuilding room, rebuilding extensions")		
		if (constructingStructures(builder, STRUCTURE_EXTENSION) > 0) { return; }
		removed = removeInvalidStructures(builder, segmentId, STRUCTURE_EXTENSION, 10);
		needsRoom = Math.max(removed, canBuildStructure(builder, STRUCTURE_EXTENSION, RCL));
		if (removed === 0) {
			Memory.rooms[builder].rebuildSteps.extensionsMoved = 1;
		} else if (needsRoom > 0 ) {
			makeRoomForStructures(builder, segmentId, STRUCTURE_EXTENSION, needsRoom)
		}
		
	} else if (Memory.rooms[builder].rebuildSteps.observerMoved === undefined) {
		// move STRUCTURE_OBSERVER
		log(builder + " rebuilding room, rebuilding observer")
		if (constructingStructures(builder, STRUCTURE_OBSERVER) > 0) { return; }
		removed = removeInvalidStructures(builder, segmentId, STRUCTURE_OBSERVER, 1);
		needsRoom = Math.max(removed, canBuildStructure(builder, STRUCTURE_OBSERVER, RCL));
		if (removed === 0) {
			Memory.rooms[builder].rebuildSteps.observerMoved = 1;
		} else if (needsRoom > 0 ) {
			makeRoomForStructures(builder, segmentId, STRUCTURE_OBSERVER, needsRoom)
		}
		
	} else if (Memory.rooms[builder].rebuildSteps.nukerMoved === undefined) {
		// move STRUCTURE_NUKER
		log(builder + " rebuilding room, rebuilding nuker")
		if (constructingStructures(builder, STRUCTURE_NUKER) > 0) { return; }
		removed = removeInvalidStructures(builder, segmentId, STRUCTURE_NUKER, 1);
		needsRoom = Math.max(removed, canBuildStructure(builder, STRUCTURE_NUKER, RCL));
		if (removed === 0) {
			Memory.rooms[builder].rebuildSteps.nukerMoved = 1;
		} else if (needsRoom > 0 ) {
			makeRoomForStructures(builder, segmentId, STRUCTURE_NUKER, needsRoom)
		}		
	} else if (Memory.rooms[builder].rebuildSteps.oldRampartsRemoved === undefined) {

		segment = getMemorySegment(segmentId);
		if (!segment.wallLayer2Complete) {
			global.aiRoomPlanner = require('ai.roomPlanner');
			aiRoomPlanner.createWallLayer2Layout(segment, builder);
			saveMemorySegment(segmentId, segment);
		}

		removeOldRamparts(builder, segmentId);	
		Memory.rooms[builder].rebuildSteps.oldRampartsRemoved = 1;
		log(builder + " rebuilding room, removing old ramparts")
	} else if (Memory.rooms[builder].rebuildSteps.oobReplaced === undefined) {
		let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);

		if (global.setOusidePixelsObject) {
			delete global.setOusidePixelsObject[segmentId]
		}
		delete segmentOOB.oob[segmentId];
		delete global.oob[segmentId];
		segment = getMemorySegment(segmentId);
		setOutisdePixels(builder, segmentOOB, segment, segmentId);
		Memory.rooms[builder].rebuildSteps.oobReplaced = 1;
		log(builder + " rebuilding room, setting oob")
	} else if (Memory.rooms[builder].rebuildSteps.fixRoads === undefined) {

		segment = getMemorySegment(segmentId);	
		if (removeBlockedRoads(builder) ) {
			Memory.rooms[builder].clearRoads = 1;				
		}

		delete segment.roads;
		createRoadTemplate(builder, segment, segmentId, true);
		removeOldRoads(builder, segment);	
		saveMemorySegment(segmentId, segment);
		Memory.rooms[builder].rebuildSteps.fixRoads = 1;
		log(builder + " rebuilding room, cleaning roads")
	} else {
		delete Memory.rooms[builder].rebuildSteps;
		delete Memory.rooms[builder].rebuild;
		delete Memory.curActivePlanner;
		log(builder + " rebuilding room, finished!")
	}
}

function cloneRoomPos(pos) {
	return new RoomPosition(pos.x, pos.y, pos.roomName)
}

	


function createExtensionCluster(roomName){
	if (Game.cpu.bucket < 500) { return; }
	if (Memory.rooms[roomName].extClst && Memory.rooms[roomName].extClst.failed ) { return; }

	let energyToUse = Game.rooms[roomName].energyCapacityAvailable;
	if (ENABLE_SPAWN_EXTENSIONS) {
		energyToUse = getSpawnerBlockEnergy(roomName) / 2
	} 
	let parts = createMaxBody(Game.rooms[roomName].energyCapacityAvailable , {carry: 2, move: 1} );
	
	let maxMoverEnergy = (parts.length/3)*2 * CARRY_CAPACITY;

	let origin;
	if (Game.rooms[roomName].storage) { 
		origin = Game.rooms[roomName].storage.pos;
	} else { 
		let spawn = Game.rooms[roomName].findByType(STRUCTURE_SPAWN);
		if (spawn.lenght === 0) { return; } 
		origin = spawn[0].pos
	}
	let startPos = cloneRoomPos(origin);
	delete Memory.rooms[roomName].fillOrder;
	
	if (Memory.rooms[roomName].extClst === undefined) { 
		Memory.rooms[roomName].extClst = {};
		Memory.rooms[roomName].extClst.routes = [];
		Memory.rooms[roomName].extClst.currentRouteIdx = 0;

		Memory.rooms[roomName].extClst.extensions = [];
		let extensionsObj = Game.rooms[roomName].findByType(STRUCTURE_EXTENSION);

		let craneExtensions = {};
		if (ENABLE_SOURCE_EXTENSIONS) {
			let sources = Game.rooms[roomName].find(FIND_SOURCES); 	
			for (let i = 0; i < sources.length; i++) {
				let sourceExt = sources[i].getSourceExtensions(true)
				for (let idx in sourceExt) {
					craneExtensions[sourceExt[idx]] = {};
				}		
			}

			let storeCraneExt = Game.rooms[roomName].getStoreCraneExtensions()
			for (let idx in storeCraneExt) {
				craneExtensions[storeCraneExt[idx].id] = {};
			}

			let spawnExt = Game.rooms[roomName].getSpawnExtensions(true);
			for (let idx in spawnExt) {
				craneExtensions[spawnExt[idx].id] = {};
			}			
		}




		for (let idx in extensionsObj) {

			if (!extensionsObj[idx].isActive() ) { continue; }

			if (ENABLE_SOURCE_EXTENSIONS && craneExtensions[extensionsObj[idx].id]) {
				// skip
			} else {
				Memory.rooms[roomName].extClst.extensions.push(extensionsObj[idx].id);
			}
			
		}
	}

	let routes = Memory.rooms[roomName].extClst.routes;
	let currentMoverEnergy = maxMoverEnergy;
	

	let colors = ["green", "red", "blue", "orange", "purple"]
	let maxExtensions = 0;

	let extensions = []
	for (let idx in Memory.rooms[roomName].extClst.extensions) {
		extensions.push(Game.getObjectById(Memory.rooms[roomName].extClst.extensions[idx]));
	}

	log(roomName + " createExtensionCluster ")

	while (extensions.length > 0) {

		if (Game.cpu.getUsed() > 420) {
			log("aborting extensions! remaining extensions" + extensions.length)
			return;
		}

		let currentRouteIdx = Memory.rooms[roomName].extClst.currentRouteIdx

		if (routes[currentRouteIdx] === undefined) {
			routes[currentRouteIdx] = {}
			routes[currentRouteIdx].ext = [];
			routes[currentRouteIdx].score = 0;	// low is better
		}

		let bestRange = Infinity;
		let bestIdx = null;
		let nextPos;		
		let route;
		
		const extension = startPos.findClosestByPath(extensions, {range: 1, maxOps: 10000, ignoreCreeps: true});
		if (!extension) {
			Memory.rooms[roomName].extClst.failed = 1;
			log("createExtensionCluster cant find closest extension " + extensions.length)
			return;
		}

		let range = startPos.getRangeTo(extension)

		for (let idx in extensions) {
			if (extensions[idx].id === extension.id) {
				bestIdx = idx;
				break;
			}
		}

		
		route = findTravelPath(startPos, extension, {range: 1, maxRooms: 1, maxOps: 10000, ignoreCreeps: true});
		if (!route.incomplete) {
			range = route.path.length;
		} else {
			range = Infinity;
			Memory.rooms[roomName].extClst.failed = 1;
			log("createExtensionCluster cant path to extension at " + extension.pos)
			return;			
		}

		bestRange = range;

		if (range <= 1) {
			nextPos = cloneRoomPos(startPos);			
		} else if (route && route.path && !route.incomplete) {
			nextPos = cloneRoomPos(route.path[route.path.length-1]);
		}else {
			nextPos = cloneRoomPos(extension.pos);
		}


		if (routes[currentRouteIdx].firstRange === undefined) {
			routes[currentRouteIdx].firstRange = bestRange;
			routes[currentRouteIdx].routeLength = 0;
		}

		routes[currentRouteIdx].routeLength += bestRange;

		let createNewRoute;
		if (bestRange > 4 && routes[currentRouteIdx].ext.length > 0) {
			createNewRoute = true;

		}

		if (bestIdx !== null && !createNewRoute) {			
			let nextExtension = extension;
			currentMoverEnergy -= nextExtension.energyCapacity;
			drawText(roomName, currentRouteIdx, nextExtension.pos.x, nextExtension.pos.y, {color: colors[currentRouteIdx], font: 0.8});
			routes[currentRouteIdx].ext.push(nextExtension.id);
			routes[currentRouteIdx].score += bestRange;

			startPos = cloneRoomPos(nextPos);
			extensions.splice(bestIdx, 1);
			Memory.rooms[roomName].extClst.extensions.splice(bestIdx, 1);
		}

		if (currentMoverEnergy <= 0 || createNewRoute || extensions.length === 0) {

			

			let firstRangeScore = routes[currentRouteIdx].firstRange * 10;
			routes[currentRouteIdx].score += firstRangeScore;
		//	let numberExtScore = routes[currentRouteIdx].ext.length * 5;
		//	routes[currentRouteIdx].score -= numberExtScore;
			let routeLength = (routes[currentRouteIdx].routeLength/routes[currentRouteIdx].ext.length) * 5;
			routes[currentRouteIdx].score -= routeLength

			console.log(currentRouteIdx + " new route, moverEnergy " + currentMoverEnergy + " new route " + createNewRoute + " scored " + routes[currentRouteIdx].score + " first " + firstRangeScore + " routeLength " + routeLength)
			
		//	console.log(roomName + " created route " +currentRouteIdx+" with " +routes[currentRouteIdx].ext.length + " score " +routes[currentRouteIdx].score + " first range " +routes[currentRouteIdx].firstRange )
			
			if (maxExtensions < routes[currentRouteIdx].ext.length) {
				maxExtensions = routes[currentRouteIdx].ext.length;
			}

			Memory.rooms[roomName].extClst.currentRouteIdx++;
			currentMoverEnergy = maxMoverEnergy;
			createNewRoute = false;
			nextPos = cloneRoomPos(origin);
			startPos = cloneRoomPos(origin);
		}
	}	
	log(roomName + " createExtensionCluster rating routes " + routes.length)

	if (Memory.rooms[roomName].fillOrder === undefined) {
		Memory.rooms[roomName].fillOrder = [];
	}

	let i = routes.length;

	while (i--) {
		let bestScore = Infinity;
		let bestIdx;
		for (let route in routes) {
			if (routes[route].score < bestScore) {
				bestScore = routes[route].score;
				bestIdx = route;
			}
		}
		

		Memory.rooms[roomName].fillOrder.push(routes[bestIdx].ext)
		routes.splice(bestIdx, 1);
	}
	delete Memory.rooms[roomName].extClst;
}

function buildRampartOnKeyStructures(builder, segment, currentRCL, currentTowers, currentSpawns){

	if (!Game.rooms[builder]._cache.keyRampart || 
		Game.time > Game.rooms[builder]._cache.keyRampart
	){
		Game.rooms[builder]._cache.keyRampart = Game.time + 147;
	
		let locationsTowers = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_TOWER);
		let maxTowers = Math.min(locationsTowers.length, maxStructures(STRUCTURE_TOWER, currentRCL));
		let initialTowers = Math.min(2, maxTowers);
		for (let idx = 0; idx < initialTowers; idx++) {
			locationsTowers[idx].createConstructionSite(STRUCTURE_RAMPART);
		}

		if (initialTowers > 0 && currentTowers < initialTowers) { return true; }

		let locations = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_SPAWN);
		let maxSpawns = Math.min(locations.length, maxStructures(STRUCTURE_SPAWN, currentRCL));
		for (let idx = 0; idx < maxSpawns; idx++) {
			locations[idx].createConstructionSite(STRUCTURE_RAMPART);
		}

		if (maxSpawns > 0 && currentSpawns < maxSpawns) { return true; }
		
		for (let idx = initialTowers; idx < maxTowers; idx++) {					
			locationsTowers[idx].createConstructionSite(STRUCTURE_RAMPART);
		}
		
		if (maxTowers > 0 && currentTowers < maxTowers) { return true; }


		if (Memory.buildTerminal) {
			locations = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_TERMINAL);
			let maxTerminals = Math.min(locations.length, maxStructures(STRUCTURE_TERMINAL, currentRCL));
			for (let idx = 0; idx < maxTerminals; idx++) {			
				locations[idx].createConstructionSite(STRUCTURE_RAMPART);
			}
		}

		locations = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE);
		let maxStorages = Math.min(locations.length, maxStructures(STRUCTURE_STORAGE, currentRCL));
		for (let idx = 0; idx < maxStorages; idx++) {			
		//	console.log(returnValue +" rampart on storage " + locations[idx]);
			locations[idx].createConstructionSite(STRUCTURE_RAMPART);
		}
		
		// SKIP REST IF PRCL IS NOT HIGH ENOUGH; REBUILDING?
		if (getRoomPRCL(builder) < 5 || Memory.rooms[builder].mineOnly) { return; }

		if (Memory.buildLabs) {
			locations = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_LAB);
			let maxLabs = Math.min(locations.length, maxStructures(STRUCTURE_LAB, currentRCL));
			for (let idx = 0; idx < maxLabs; idx++) {
				locations[idx].createConstructionSite(STRUCTURE_RAMPART);
			}
		}

		locations = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_NUKER);
		let maxNuker = Math.min(locations.length, maxStructures(STRUCTURE_NUKER, currentRCL));
		for (let idx = 0; idx < maxNuker; idx++) {
			locations[idx].createConstructionSite(STRUCTURE_RAMPART);
		}
		
		if (Memory.Minerals[RESOURCE_POWER]) {
			locations = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_POWER_SPAWN);
			let maxPs = Math.min(locations.length, maxStructures(STRUCTURE_POWER_SPAWN, currentRCL));
			for (let idx = 0; idx < maxPs; idx++) {
				locations[idx].createConstructionSite(STRUCTURE_RAMPART);
			}
		}

		// Factory
		if (Memory.buildFactory){
			locations = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_FACTORY);
			let maxFactory = Math.min(locations.length, maxStructures(STRUCTURE_FACTORY, currentRCL));
			for (let idx = 0; idx < maxFactory; idx++) {
				if (locations[idx]) {
					locations[idx].createConstructionSite(STRUCTURE_RAMPART);
				}
			}
		}

		// Links outside walls 
		if (Memory.rooms[builder].linkTimer && !Memory.rooms[builder].sieged) {
			for (let linkPosPacked in Memory.rooms[builder].linkTimer) {
				if (!Memory.rooms[builder].linkTimer[linkPosPacked].rampart) { continue; }
				
				let pos = posDecompress(linkPosPacked, builder);				
				pos.createConstructionSite(STRUCTURE_RAMPART);

				let containers = pos.lookForStructuresAround(STRUCTURE_CONTAINER, 1)
				for (let idx in containers) {
					let containerPos = containers[idx].pos;
					containerPos.createConstructionSite(STRUCTURE_RAMPART);
				}
			}			
		}


	}
}

global.getAvgWallHp = function(roomCaller) {
	let roomCache = getRoomCache(roomCaller)
	if (roomCache.avgWallHp === undefined) {
		updateWallInfo(roomCaller)
	}
	return roomCache.avgWallHp
}

global.getLowWallHp = function(roomCaller) {
	let roomCache = getRoomCache(roomCaller)
	if (roomCache.lowWallHp === undefined) {
		updateWallInfo(roomCaller)
	}
	return roomCache.lowWallHp
}

global.getWallCount = function(roomCaller, forceUpdate=false) {
	let roomCache = getRoomCache(roomCaller)
	if (roomCache.wallCount === undefined || forceUpdate) {
		updateWallInfo(roomCaller, forceUpdate)
	}
	return roomCache.wallCount
}



global.updateWallInfo = function(roomCaller, foceUpdate = false) {
	// SET WALL AVERAGE HP	
	let roomCache = getRoomCache(roomCaller)

	if (!roomCache.avgWallHp || 
		!roomCache.wallTs || 
		Game.time > roomCache.wallTs || 
		foceUpdate
	) {	// FIND LOWEST WALL

		let avgWallHp = 0;
		let lowWallHp = 300000000;
		let wallsCount = 0
		let walls = Game.rooms[roomCaller].findByType(STRUCTURE_RAMPART);
		
		for (let wall of walls) {
			let wallType = rampartIsValid(wall.pos);
			if (wallType !== RAMPART_PRIMARY && wallType !== RAMPART_SECONDARY) { continue; }
			wallsCount++;
			let effectiveHp = wall.hits * RAMPART_HP[wallType];			
			avgWallHp += effectiveHp;
			
			if (wallType === RAMPART_PRIMARY && effectiveHp < lowWallHp) {
				lowWallHp = effectiveHp;
			}
		}

		roomCache.wallsCount = wallsCount;
		if (wallsCount === 0 ) { return; }

		avgWallHp = avgWallHp / wallsCount;
		roomCache.avgWallHp = Number(avgWallHp.toFixed(0));
		roomCache.lowWallHp = lowWallHp;
		roomCache.wallTs = Game.time + 101;

		if (roomCache.avgWallHp < WALL_HP_SETPOINT[Game.rooms[roomCaller].controller.level] * 0.25) {
			Memory.rooms[roomCaller].reinforce = Math.max(Game.time + 1500, Memory.rooms[roomCaller].reinforce || 0);
		}
	}
};

function setCranePos(roomName, segment){

	
	let storage = getAllAsPosFromBlueprint(segment, roomName, STRUCTURE_STORAGE)[0];
	let terminal = getAllAsPosFromBlueprint(segment, roomName, STRUCTURE_TERMINAL)[0];

	if (!terminal || !storage) { return; }
	let x = Math.floor((terminal.x + storage.x)/ 2);
	let y = Math.floor((terminal.y + storage.y)/ 2);
	if (!x || !y) { return; }
	let target = new RoomPosition(x, y, roomName);
	global.cranePos[roomName] = {};
	global.cranePos[roomName].pos = posSave(target);
	Memory.rooms[roomName].cranePos = posCompress(target)
}

function protectFromNukes(roomName) {
	
	if (Game.rooms[roomName]._cache.nukeTs === undefined || Game.time > Memory.rooms[roomName].nukeTs) {
		Game.rooms[roomName]._cache.nukeTs = Game.time + 333;
		getRoomCache(roomName).nuke
		let nukes = Game.rooms[roomName].find(FIND_NUKES);
		if (nukes.length === 0) {
			delete Memory.nukeRampart[roomName];
			return;
		}
		if (Memory.rooms[roomName].nukes === undefined ) { Memory.rooms[roomName].nukes = {}; }
		for (let idx in nukes) {
			let nuke = nukes[idx];
			console.log(roomName + " INCOMMING NUKE, TAKE COVER! " + nuke.pos);
			if (Memory.rooms[roomName].nukes[nuke.id]) { continue; }

			Memory.rooms[roomName].nukes[nuke.id] = {}; 
			Memory.rooms[roomName].nukes[nuke.id].ts = nuke.timeToLand + Game.time;
		//	console.log("nuke ts " + Memory.rooms[roomName].nukes[nuke.id].ts)
			let dist = 2;
			let top = limit(nuke.pos.y-dist, 0, 49);
			let left = limit(nuke.pos.x-dist, 0, 49);
			let bot = limit(nuke.pos.y+dist, 0, 49);
			let right = limit(nuke.pos.x+dist, 0, 49);
			
			let structures = _.filter(Game.rooms[roomName].lookForAtArea(LOOK_STRUCTURES, top,left,bot,right, true), 
				function(c) {return (c.structure.structureType == STRUCTURE_SPAWN ||
								c.structure.structureType == STRUCTURE_TERMINAL ||
								c.structure.structureType == STRUCTURE_POWER_SPAWN ||
								c.structure.structureType == STRUCTURE_STORAGE ||
								c.structure.structureType == STRUCTURE_FACTORY ||
								c.structure.structureType == STRUCTURE_LAB ||
								c.structure.structureType == STRUCTURE_NUKER ||
								c.structure.structureType == STRUCTURE_TOWER ||
								c.structure.structureType == STRUCTURE_RAMPART );	
							});	
					
			if (structures.length === 0) { continue; }
		//	console.log("structures found " + structures.length )		
			Memory.rooms[roomName].nukes[nuke.id].pos = {};
			for (let idxStructure in structures) {
				let structure = structures[idxStructure].structure;	
				if (structure.structureType === STRUCTURE_RAMPART && !structure.pos.isPassible(true) ) { continue; }
				let rangeToNuke = structure.pos.getRangeTo(nuke.pos);
				let dmg = NUKE_DAMAGE[2];
				if (rangeToNuke === 0) {
					dmg = NUKE_DAMAGE[0];
				}
				let posCompressed = posCompress(structure.pos);
				Memory.rooms[roomName].nukes[nuke.id].pos[posCompressed] = {};
				Memory.rooms[roomName].nukes[nuke.id].pos[posCompressed].dmg = dmg;
				// RESET BUILDER JOB TO START RAMPARTS BUILDING				
				getRoomCache(roomName).builderJobTs = Game.time;
			}
		}

		delete Memory.nukeRampart[roomName];
		let maxRampartHits = RAMPART_HITS_MAX[Game.rooms[roomName].controller.level] || 0

		for (let id in Memory.rooms[roomName].nukes) {
			let nukeData = Memory.rooms[roomName].nukes[id];
			if (nukeData.ts < Game.time) {
				delete Memory.rooms[roomName].nukes[id];
				continue;
			}
			if (Memory.nukeRampart[roomName] === undefined) {
				Memory.nukeRampart[roomName] = {};
				Memory.nukeRampart[roomName].pos = {};
			}
			for (let posCompressed in nukeData.pos) {

				if (maxRampartHits < nukeData.pos[posCompressed].dmg) { continue; }

				let pos = posDecompress(posCompressed, roomName);
				if (!pos.lookForStructure(STRUCTURE_RAMPART) ) {
					pos.createConstructionSite(STRUCTURE_RAMPART);
				}
				if (Memory.nukeRampart[roomName].pos[posCompressed] === undefined) {
					Memory.nukeRampart[roomName].pos[posCompressed] = {};
					Memory.nukeRampart[roomName].pos[posCompressed].dmg = 0;
				}
			//	console.log("adding dmg " + nukeData.dmg)
				Memory.nukeRampart[roomName].pos[posCompressed].dmg += nukeData.pos[posCompressed].dmg;
			//	console.log(" nukeRampart dmg " + Memory.nukeRampart[roomName].pos[posCompressed].dmg)
			}
		}		
	}	
	return 0;
}


function buildFromBlueprintTemplate(builder, segmentId, type, number, requireRampart=false){
	if (!accessMemorySegment(segmentId) ) {
		console.log(" buildFromBlueprintTemplate no access to id " +segmentId);
		return -1;
	}
	// LOAD BUILDER SEGMENT
	let segment = getMemorySegment(segmentId);

	let pos;
	let result;
	let built = 0;
	let currentConstSites = Object.keys(Game.constructionSites).length;
	if (segment.structures && segment.structures[type]) {
		let buildings = segment.structures[type];
		for (let idx = 0; idx < buildings.pos.length; idx++) {
			if (built >= number || currentConstSites >= 90){
				return -1;
			}
			pos = new RoomPosition(buildings.pos[idx].x, buildings.pos[idx].y, builder);
			if (requireRampart === true && !pos.lookForStructure(STRUCTURE_RAMPART) ) { 
				console.log(type+ " requires rampart, skipping " + pos);
				continue; 
			}

			if (type === STRUCTURE_STORAGE || type === STRUCTURE_TERMINAL || !pos.lookForStructure(type)) {
				result = Game.rooms[builder].createConstructionSite(pos, type);	
				if (result === OK) {
					built += 1;
					currentConstSites += 1;	
					continue;
				} else if (type === STRUCTURE_STORAGE || type === STRUCTURE_TERMINAL){
					let existingStore = Game.rooms[builder].find(FIND_HOSTILE_STRUCTURES, {
						filter: (structure) => (structure.structureType === type)
						});
					if (existingStore.length > 0) {
						existingStore[0].destroy();
						log(builder + " error " + result + " placing construction site " + type + " at pos " + pos + " DESTROYING HOSILE STORAGE");
					}
				}

				if (result !== OK && (type !== STRUCTURE_ROAD && type !== STRUCTURE_RAMPART)) {
					let blockingCreep = pos.lookForAnyCreep();
					if (blockingCreep  ) {
						if (blockingCreep.my) {
							blockingCreep.move(Math.floor(Math.random()*8))
						}						
						built += 1;	// prevent building in the wrong spot
						continue;
					}

					if (pos.lookForConstructionSite(STRUCTURE_RAMPART)) {
						built += 1; // prevent building in the wrong spot
						continue;
					} else {
						console.log(builder + " error " + result + " placing construction site " + type + " at pos " + pos);
					}


				}
			}
		}
	}

	if (built === 0) {
		Game.rooms[builder].checkFindCache();
	}
	return built;
}
global.getAllAsPosFromBlueprint = function(segment, builder, type, ignoreFixed=false){
	let all = [];
	if (segment.structures && segment.structures[type]) {
		let structures = segment.structures[type];
		for (let idx = 0; idx < structures.pos.length; idx++) {
			if (ignoreFixed && structures.pos[idx].fixed) { continue; }
			all.push(new RoomPosition(structures.pos[idx].x, structures.pos[idx].y, builder) );		
		}
	}
	return all;
}


function buildWallLayer2(segmentId, builder, number){

	if (!accessMemorySegment(segmentId) ) {
		console.log(" buildFromBlueprintTemplate no access to id " +segmentId);
		return 0;
	}	

	Memory.rooms[builder].layer2Valid = Game.time + 2500;

	let segment = getMemorySegment(segmentId);
	if (!segment.wallLayer2Complete) {
		global.aiRoomPlanner = require('ai.roomPlanner');
		aiRoomPlanner.createWallLayer2Layout(segment, builder);
		saveMemorySegment(segmentId, segment);
		regRampartsInCache(builder, segment);
	}

	let ramparts = segment.wallLayer2;
	let built = 0;	
	for (let idx = 0; idx < ramparts.length; idx++) {	
		if (built >= number ){		
			return 0;
		}
		let pos = new RoomPosition(ramparts[idx].x, ramparts[idx].y, builder);
	//	drawCircle(builder, pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'})
		if (!pos.lookForStructure(STRUCTURE_RAMPART)) {
			let result = Game.rooms[builder].createConstructionSite(pos, STRUCTURE_RAMPART);	
			if (result === OK) {
				built += 1;
			}
		}
	}

}

global.isOutsideWallsXY = function(x, y, roomName, segmentOOB, segmentId){
	if (!segmentOOB) {
		if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
			console.log(" isOutsideWalls no access to id " +SEGMENT_ALL_ROOM_OOB);
			return 0;
		}
		segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);
	}

	let roomId = segmentId || roomName;
//	let roomName = pos.roomName;
	if (!segmentOOB.oob || !segmentOOB.oob[roomId]) { 
		console.log(" isOutsideWallsXY segment not complete? " +roomId);
		return false;
	}

	let OOB_PosData = unSerializeOOBPos(segmentOOB.oob[roomId].posSerialized, roomId);
	if (OOB_PosData) {
		if (OOB_PosData[posCompressXY(x, y)]) { return true; }
	}
	return false;
}

global.isOutsideWalls = function(pos, segmentOOB, segmentId){

	if (!segmentOOB) {
		if (!accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
			console.log(" isOutsideWalls no access to id " +SEGMENT_ALL_ROOM_OOB);
			return 0;
		}
		segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);
	}

	let roomId = segmentId || pos.roomName;
//	let roomName = pos.roomName;
	if (!segmentOOB.oob || !segmentOOB.oob[roomId]) { 
		console.log(" isOutsideWalls segment not complete? " +roomId);
		return false;
	}

	let OOB_PosData = unSerializeOOBPos(segmentOOB.oob[roomId].posSerialized, roomId);
	if (OOB_PosData) {
		if (OOB_PosData[posCompress(pos)]) { return true; }
	}
	return false;
}


global.setOutisdePixels = function(roomName, segmentOOB, segment, segmentId) {

	if (segmentOOB.oob === undefined) { segmentOOB.oob = {}; }
	
	segmentOOB.oob[segmentId] = {};
	delete global.oob[segmentId];

//	segmentOOB.oob[roomName].pos = {};

	let cm = new PathFinder.CostMatrix(); 	
	let wallsOutside;
	if (segment && segment.structures && segment.structures[STRUCTURE_RAMPART]) {	// ADD BLUEPRINT AS WALLS ( FOR ROOM PLANNING ONLY!)
		
		wallsOutside = segment.structures[STRUCTURE_RAMPART];
		for (let idx = 0; idx < wallsOutside.pos.length; idx++) {
			cm.set(wallsOutside.pos[idx].x,wallsOutside.pos[idx].y,255);
		}
	} else {	// ADD ONLY EXISTING WALLS
		wallsOutside = this.findByType(STRUCTURE_RAMPART);
		for (let idx = 0; idx < wallsOutside.length; idx++) {
			cm.set(wallsOutside[idx].pos.x, wallsOutside[idx].pos.y,255);
		}
	}
	let roomId = segmentId || roomName;
	//console.log("id " + roomId + " seg " + segmentId)
	global.setOusidePixelsObject = {};
	global.setOusidePixelsObject[roomId] = {};
	global.setOusidePixelsObject[roomId].pos = {};
	segmentOOB.oob[roomId].posSerialized = '';

	let exits = findReducedExits(roomName)
	for (let exit in exits) {
		setConnectedPixels(segmentOOB, exits[exit], cm, roomId);	
	}
	
	saveMemorySegment(SEGMENT_ALL_ROOM_OOB, segmentOOB);

}

global.unSerializeOOBPos = function(pos, roomName) {
	if (global.oob[roomName] === undefined) {
		console.log("unSerializeOOBPos " + roomName)
		let comp = pos.split("-");
		let posData = {};
		for (let idx in comp) {
			let posComp = comp[idx];
			if (!posComp) { continue; }
			posData[posComp] = {};
		}
		global.oob[roomName] = {};
		global.oob[roomName].posData = posData;
	}
	return global.oob[roomName].posData;
	
}

function setConnectedPixels(segmentOOB, pos, cm, segmentId) {
//	let roomName = this.name;
	let roomId = segmentId || pos.roomName;
	let id = posId(pos)
	if (!global.setOusidePixelsObject[roomId].pos[id]) {
//	if (!this._testedPixels.pos[pos]) {
	//	this._testedPixels.pos[pos] = {};
		global.setOusidePixelsObject[roomId].pos[id] = {};
		if (getRoomTerrainAt(pos) !== TERRAIN_MASK_WALL) {
			let value = cm.get(pos.x, pos.y);
			if (value !== 255) { // ALL TESTS PASSED, THIS IS CONNECTED
			//	segmentOOB.oob[roomName].pos[posCompress(pos)] = {};
				segmentOOB.oob[roomId].posSerialized += posCompress(pos) + '-';
			//	drawCircle(pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'}) ;
				// TEST ALL CONNECTED PIXELS
				setConnectedPixels(segmentOOB, pos.getPositionAtDirection(TOP), cm, roomId);
				setConnectedPixels(segmentOOB, pos.getPositionAtDirection(RIGHT), cm, roomId);
				setConnectedPixels(segmentOOB, pos.getPositionAtDirection(BOTTOM), cm, roomId);
				setConnectedPixels(segmentOOB, pos.getPositionAtDirection(LEFT), cm, roomId);

				setConnectedPixels(segmentOOB, pos.getPositionAtDirection(TOP_RIGHT), cm, roomId);
				setConnectedPixels(segmentOOB, pos.getPositionAtDirection(TOP_LEFT), cm, roomId);
				setConnectedPixels(segmentOOB, pos.getPositionAtDirection(BOTTOM_RIGHT), cm, roomId);
				setConnectedPixels(segmentOOB, pos.getPositionAtDirection(BOTTOM_LEFT), cm, roomId);
			}
		}
	}
}


function displayRoomLayout(segment, builder){
	let buildings = segment.structures;
	for (let building in buildings){
		let buildingType = building;	
		if (!buildings[building] || !buildings[building].pos) { continue; }
		for (let idx = 0; idx < buildings[building].pos.length; idx++) {
			Game.rooms[builder].visual.structure(buildings[buildingType].pos[idx].x, buildings[building].pos[idx].y, buildingType, {opacity: 0.5});
		//	Game.rooms[builder].visual..circle(buildings[building].pos[idx].x, buildings[building].pos[idx].y , {fill: 'transparent', radius: 0.50, stroke: 'orange'}) 	
		}
	}
}



global.isWithinAttackRangeOfOutside = function(pos, segmentId){
	let oobAvailable;
	if (!segmentId) {
		segmentId = pos.roomName;
	}
	if (accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
		let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);
		let roomName = pos.roomName;
		if (!segmentOOB.oob || !segmentOOB.oob[roomName]) { 		
			return false;
		} else {
			oobAvailable = true;
		}
	} else {
		return false ;
	}

	let posToCheck;
	for (let y = -3; y <= 3; ++y) {
		for (let x = -3; x <= 3; ++x) {
			posToCheck = new RoomPosition(limit(x + pos.x, 0, 49), limit(y + pos.y, 0, 49), pos.roomName);
			if (oobAvailable && isOutsideWalls(posToCheck, undefined, segmentId) ) {
				return 1;
			}
		}
	}
	return;
}


function registerSourceEpos(roomName) {
	if (Memory.rooms[roomName] && Memory.rooms[roomName].sources) {
		for (let id in Memory.rooms[roomName].sources) {

			for (let origin in Memory.rooms[roomName].sources[id].Epos) {
			
				containerCache[roomName][Memory.rooms[roomName].sources[id].Epos[origin]] = {}
			}
		}
	}
}

global.containerIsValid = function(pos) {
	if (!containerCache[pos.roomName]) {
		containerCache[pos.roomName] = {}
		registerSourceEpos(pos.roomName)
	}

	if (global.containerCache[pos.roomName][posCompress(pos)] === undefined) {
		return false;
	} else {
		return true;
	}
}

function registerContainerInCache(builder, segmentId) {
	if (!accessMemorySegment(segmentId) ) {
		console.log(" registerContainerInCache no access to id " +segmentId);
		return 0;
	}
//	let init = Game.cpu.getUsed();
	let segment = getMemorySegment(segmentId);

	if (!containerCache[builder]) {
		containerCache[builder] = {}
	}

	regContainersInCache(segment, builder)
	registerSourceEpos(builder)
	containerCache[builder].created = Game.time;
}

function regContainersInCache(segment, roomName) {

	if (segment.structures && segment.structures.container && segment.structures.container.pos) {

		for (let idx in segment.structures.container.pos) {
			let pos = posCompressXY(segment.structures.container.pos[idx].x, segment.structures.container.pos[idx].y)
			containerCache[roomName][pos] = {};
		}
	}
}



global.rampartCache = {};
global.rampartIsValid = function(pos) {
	if (!global.rampartCache[pos.roomName]) { return RAMPART_PRIMARY; }
	return global.rampartCache[pos.roomName][posCompress(pos)];
}

function regRampartsInCache(roomName, segment) {	
	
	global.rampartCache[roomName] = {};

	// source walls
	for (let linkPosPacked in Memory.rooms[roomName].linkTimer) {
		if (!Memory.rooms[roomName].linkTimer[linkPosPacked].rampart) { continue; }
		global.rampartCache[roomName][linkPosPacked] = RAMPART_STRUCTURE;

		let pos = posDecompress(linkPosPacked, roomName);
		let containers = pos.lookForStructuresAround(STRUCTURE_CONTAINER, 1);
		for (let idx in containers) {
			let containerPos = containers[idx].pos;
			global.rampartCache[roomName][containerPos] = RAMPART_STRUCTURE;
		}
	}

	// structures
	let keyStructures = [
		STRUCTURE_SPAWN, 
		STRUCTURE_TOWER, 
		STRUCTURE_TERMINAL,
		STRUCTURE_LAB,
		STRUCTURE_STORAGE, 
		STRUCTURE_FACTORY,
		STRUCTURE_NUKER
	];

	for (let structureType of keyStructures) {
		let locations = getAllAsCompressedPosFromBlueprint(segment, roomName, structureType);
		for (let posXY in locations) {
			global.rampartCache[roomName][posXY] = RAMPART_STRUCTURE;
		}	
	}


	let layer2Valid = false;
	if (Memory.rooms[roomName].layer2Valid){
		if (Game.time < Memory.rooms[roomName].layer2Valid) {
			layer2Valid = true;
		} else {
			delete Memory.rooms[roomName].layer2Valid;
		}
	}

	// second layer walls
	if (layer2Valid) {
		for (let idx in segment.wallLayer2) {
			global.rampartCache[roomName][posCompressXY(segment.wallLayer2[idx].x, segment.wallLayer2[idx].y)] = RAMPART_SECONDARY;
		}
	
	}
	
	// outer walls
	if (segment.structures && segment.structures.rampart && segment.structures.rampart.pos) {
		let ramparts = segment.structures.rampart.pos
		for (let idx in ramparts) {	
			global.rampartCache[roomName][posCompressXY(ramparts[idx].x, ramparts[idx].y)] = RAMPART_PRIMARY;
		}
	}
}


global._requestMoreRoadCsites = {};
global.requestMoreRoadCsites = function(roomName) {
	global._requestMoreRoadCsites[roomName] = {};
	global._requestMoreRoadCsites[roomName].ts = Game.time + 350;
}


function buildRoads(builder, segmentId){
	if (!accessMemorySegment(segmentId) ) {
		console.log(" buildRoads no access to id " +segmentId);
		return 0;
	}
	let segment = getMemorySegment(segmentId);

	if (Memory.rooms[builder].clearRoads) {
		delete Memory.rooms[builder].clearRoads;
		delete segment.roads;
	}
	
	let currentPRCL = getRoomPRCL(builder)
	if (segment.roads === undefined || segment.roads.ts === undefined || 
		!checkRoadsCreated(builder, segment) || 
		(currentPRCL >= 4 && Memory.rooms[builder][R.ROADS_OLD_PRCL] !== currentPRCL) ||
		(Game.time > segment.roads.ts && Game.cpu.bucket > 850)
	){					
		if (createRoadTemplate(builder, segment, segmentId)) {
			Memory.rooms[builder][R.ROADS_OLD_PRCL] = currentPRCL;
		}
	}
	



	if (!segment.roads.calc) {
		buildFromRoadTemplate(builder, segment);
	}

	for (let roomName in global._requestMoreRoadCsites) {
		if (Game.time > global._requestMoreRoadCsites[roomName].ts) { 
			delete global._requestMoreRoadCsites[roomName]
			continue;
		}

		if (builder === roomName || Memory.rooms[builder].remoteMineOps[roomName]) {
			buildFromRoadTemplate(builder, segment, roomName);
			delete global._requestMoreRoadCsites[roomName];
			log("requested more roads in " + roomName);
		}
	}
}

global.roadIsValid = function(pos){
	if (!global.roadsCache[pos.roomName]) { return false; } // false?
	if (global.roadsCache[pos.roomName][posCompress(pos)] === undefined) {
		return false;
	} else {
		return true;
	}
}

function registerRoadsInCache(builder, segmentId) {
	if (!accessMemorySegment(segmentId) ) {
		console.log(" registerRoadsInCache no access to id " +segmentId);
		return 0;
	}

	let segment = getMemorySegment(segmentId);
	regRoadsInCache(builder, segment)
}

function regRoadsInCache(builder, segment) {

	for (let room in segment.roads) {
		if (global.roadsCache[room] === undefined) { global.roadsCache[room] = {}; }
		global.roadsCache[room] = Object.assign(global.roadsCache[room], segment.roads[room].r)

		if (segment.roads[room].sources){
			for (let source in segment.roads[room].sources) {
				global.roadsCache[room] = Object.assign(global.roadsCache[room], segment.roads[room].sources[source].r);				
			}
		}
	}

	let allUnknown = true;
	if (Memory.rooms[builder].remoteSources) {
		for (let sourceId in Memory.rooms[builder].remoteSources) {
			if (Memory.rooms[builder].remoteSources[sourceId].blt !== undefined) {
				allUnknown = false;
				break;
			}
		}
	}	
	
	if (allUnknown) {
		for (let room in global.roadsCache) {
			if (!Game.rooms[room]) { continue; }
			for (let roadPosComp in global.roadsCache[room]) {
	
				let roadPos = posDecompressXY(roadPosComp, room);
				let road = lookForStructureAt(STRUCTURE_ROAD, roadPos);
	
				regRemoteSourceRoadsStatus(builder, segment, roadPosComp, road);
			}
		}
	}
	
}

global.remoteSourceRoadsStatus = {};
function regRemoteSourceRoadsStatus(builder, segment, roadPos, road){

	if (!global.remoteSourceRoadsStatus[builder]) {
		global.remoteSourceRoadsStatus[builder] = {};
		global.remoteSourceRoadsStatus[builder].sourceRoads = {};

		let roadStatus = global.remoteSourceRoadsStatus[builder];
		for (let roomName in segment.roads) {			
			for (let source in segment.roads[roomName].sources) {				
				if (roadStatus.sourceRoads[source] === undefined) {
					roadStatus.sourceRoads[source] = {};
					roadStatus.sourceRoads[source].r = {};
				}
				roadStatus.sourceRoads[source].r = Object.assign(roadStatus.sourceRoads[source].r, segment.roads[roomName].sources[source].r);				
			}
		}
	}
	
	if (roadPos) {
		for (let source in global.remoteSourceRoadsStatus[builder].sourceRoads) {
			let roads = global.remoteSourceRoadsStatus[builder].sourceRoads[source].r;
			if (roads[roadPos]) {
				roads[roadPos].ts = Game.time;
				if (road) {
					let hpRatio = Math.floor(100 * (road.hits / road.hitsMax))
					roads[roadPos].hp = hpRatio;
				}
			}
		}
	}
}



global.roadRepairStatus = function (builder, sourceId) {
	if (!global.remoteSourceRoadsStatus[builder] || !global.remoteSourceRoadsStatus[builder].sourceRoads[sourceId]) { return Math.random() > 0.66; }	// unknown, better safe

	let sourceRoads = global.remoteSourceRoadsStatus[builder].sourceRoads[sourceId]
	for (let road in sourceRoads.r) {
		if (sourceRoads.r[road].hp < 60) { 
			log("road needs repair from " + builder + " to source " + sourceId + " hp ratio " +sourceRoads.r[road].hpRatio)
			return true;
		}
	}
//	log("road healthy from " + builder + " to source " + sourceId, "green")
	return false;
}

global._roadBuiltStatus = {}
global.roadBuiltStatus = function (builder, sourceId) {

	if (!global.remoteSourceRoadsStatus[builder] || !global.remoteSourceRoadsStatus[builder].sourceRoads[sourceId]) { 
	//	log("no data for roads from " + builder + " to source " + sourceId)

		if (Memory.rooms[builder].remoteSources && Memory.rooms[builder].remoteSources[sourceId] && Memory.rooms[builder].remoteSources[sourceId].blt !== undefined) {
			return Memory.rooms[builder].remoteSources[sourceId].blt;
		}

		let PRCL = getRoomPRCL(builder);
		if (PRCL >= 5) {
			return 1.0
		} else if (PRCL < 3) {
			return 0;
		}
		return Math.random();
	}

	let id = builder+sourceId;

	if (global._roadBuiltStatus[id] === undefined || Game.time > global._roadBuiltStatus[id].ts) {
		global._roadBuiltStatus[id] = {}
		global._roadBuiltStatus[id].ts = Game.time + 100;

		let totalRoads = 0;
		let builtRoads = 0;
		let unverifiedRoads = 0;
		let sourceRoads = global.remoteSourceRoadsStatus[builder].sourceRoads[sourceId];

		for (let idx in sourceRoads.r) {
			totalRoads++;
			let road = sourceRoads.r[idx];
			
			if (road.hp) {
				builtRoads++ 			
			} else if (!road.ts) {
				unverifiedRoads++;
			}
		}		

		let ratio = builtRoads / ((totalRoads-2) || 1)
		if (ratio >= 0.95 ) {
			global._roadBuiltStatus[id].ts = Game.time + 500;
		} else if (ratio === 0)
			global._roadBuiltStatus[id].ts = Game.time + 125;
		else {
			global._roadBuiltStatus[id].ts = Game.time + 50;
		}

		let status = builtRoads / ((totalRoads-2) || 1);
		

		if (unverifiedRoads <= 0) {
			if (Memory.rooms[builder].remoteSources && Memory.rooms[builder].remoteSources[sourceId]) {
				Memory.rooms[builder].remoteSources[sourceId].blt = Number(status.toFixed(2))
			}
			global._roadBuiltStatus[id].complete = 1;
		}

	//	log(sourceId +" built road status " + status.toFixed(2) + " total roads " + totalRoads+ " roads unknown status " + unverifiedRoads + " complete " + global._roadBuiltStatus[id].complete)

		global._roadBuiltStatus[id].builtRatio = status;
	}

	if (!global._roadBuiltStatus[id].complete && 
		Memory.rooms[builder].remoteSources && 
		Memory.rooms[builder].remoteSources[sourceId] && 
		Memory.rooms[builder].remoteSources[sourceId].blt !== undefined
	) {
		return Memory.rooms[builder].remoteSources[sourceId].blt;
	}

	return global._roadBuiltStatus[id].builtRatio;
}



function buildFromRoadTemplate(builder, segment, roomName = undefined){

	let cSites = Object.keys(Game.constructionSites).length
	let possibleCsites = MAX_CONSTRUCTION_SITES - cSites;
	if (possibleCsites < 25) { return; }

	if (Memory.rooms[builder][R.ROAD_IDX] === undefined) { Memory.rooms[builder][R.ROAD_IDX] = 0; }
	if (Memory.rooms[builder][R.ROAD_ROOM_IDX] === undefined) { Memory.rooms[builder][R.ROAD_ROOM_IDX] = 0; }

	let arrRooms = Object.keys(segment.roads); // CREATE ARRAY, TO ACCESS BY IDX

	let room
	let useRoadIdx
	if (!roomName) {
		useRoadIdx = true;
		if (Memory.rooms[builder][R.ROAD_ROOM_IDX] >= arrRooms.length ) {
			Memory.rooms[builder][R.ROAD_ROOM_IDX] = 0;
			Memory.rooms[builder].roadsBuilt = 1;
		}
	
		room = Game.rooms[arrRooms[Memory.rooms[builder][R.ROAD_ROOM_IDX]]];

	
		if (!room) { 
			Memory.rooms[builder][R.ROAD_ROOM_IDX] += 1;
			Memory.rooms[builder][R.ROAD_IDX] = 0;
			return;
		}
		roomName = room.name
	} else {
		useRoadIdx = false
		room = Game.rooms[roomName]
		if (!room) { return; }
	}


	let allowedSources = {}
	let maxBuildingRoads = 5;
	let constructingRoads = 0;

	let lowPrcl = getRoomPRCL(builder) < CONTROLLER_MAX_LEVEL

	for (let source in Memory.rooms[builder].sources) {
		allowedSources[source] = {}
	}

	for (let _room in Memory.rooms[builder].remoteMineOps) {

		for (let source in Memory.rooms[builder].remoteMineOps[_room].sources) {
			allowedSources[source] = {}

			if (lowPrcl && roadBuiltStatus(builder, source) < 0.9) {
				constructingRoads++

				if (constructingRoads >= maxBuildingRoads) {
					break;
				}
			}
			
		}

		if (constructingRoads >= maxBuildingRoads) {
			break;
		}
	}


	let roadsFull = Object.keys(segment.roads[room.name].r); // GET ALL ROADS AS ARRAY AT THE ROOM IDX

	if (segment.roads[room.name].sources){
		let sourceKeys = Object.keys(segment.roads[room.name].sources)
		let keys = sourceKeys.length;
	//	for (let keys in sourceKeys.length) {

		
		while(keys--) {	// uses reverse order since creation happens to furthest roads first
			let source = sourceKeys[keys]
			
	//	for (let source in segment.roads[room.name].sources) {
			if (Memory.activeMines[source] &&
				Memory.activeMines[source].wantRoad &&
				Memory.activeMines[source].ts >= Game.time 
			) {
				if (allowedSources[source] === undefined) { continue }
				roadsFull = roadsFull.concat(Object.keys(segment.roads[room.name].sources[source].r));

								
				if (Memory.rooms[room.name] && !Memory.rooms[room.name][R.MY_MINING_OUTPOST] && !Memory.rooms[room.name].myRoom) {
					Memory.rooms[room.name].buildRoads = Game.time + 1500;
				}
			}
		}
	}
	let totalRoads = roadsFull.length;

	let roads = []
	if (useRoadIdx) {
		let numElements = Math.min(BUILDER_ROADS_BUILDMAX, totalRoads-Memory.rooms[builder][R.ROAD_IDX]);
		roads = roadsFull.splice(Memory.rooms[builder][R.ROAD_IDX], numElements);
	} else {
		roads = roadsFull.splice(0, totalRoads);
	}
	

	let length = roads.length;
	let currentRoadConstSites = _.filter(Game.constructionSites, function(c) {return (c.pos.roomName === roomName);});
	let placedCsites = Object.keys(currentRoadConstSites).length || 0;
	if (placedCsites >= 7 || length === 0) {
		if (useRoadIdx) {
			Memory.rooms[builder][R.ROAD_ROOM_IDX] += 1;
			Memory.rooms[builder][R.ROAD_IDX] = 0;
		}
		return;
	}

	let lowPRCL = getRoomPRCL(builder) < 3

	for (let i = 0; i <length ; i++) {

		if (possibleCsites < 20) { break; }
		if (placedCsites >= BUILDER_ROADS_BUILDMAX) { break; }
		
		let roadPos = posDecompress(roads[i], room.name);
		if (lowPRCL && !Memory.rooms[builder].roadsBuilt) {
			if (room.name !== builder ||
				getRoomTerrainAt(roadPos.x, roadPos.y, roadPos.roomName) === TERRAIN_MASK_PLAIN
			) {
				if (useRoadIdx) {
					Memory.rooms[builder][R.ROAD_IDX] += 1;
				}
				continue;
			}
		}
		
		let road = roadPos.lookForStructure(STRUCTURE_ROAD)
		if (!road) {
			room.createConstructionSite(roadPos, STRUCTURE_ROAD);
			possibleCsites--;
			placedCsites++;
		}
		
		regRemoteSourceRoadsStatus(builder, segment, roads[i], road);

		if (useRoadIdx) {
			Memory.rooms[builder][R.ROAD_IDX] += 1;
		}

		if (i > BUILDER_ROADS_BUILDMAX) { break; }
	}

	if (useRoadIdx && Memory.rooms[builder][R.ROAD_IDX] >= totalRoads) {
		Memory.rooms[builder][R.ROAD_IDX] = 0;
		Memory.rooms[builder][R.ROAD_ROOM_IDX] += 1;
	}
}

function checkRoadsCreated(builder, segment) {

	if (!segment.roads) { return false; }
	if (!Memory.rooms[builder].remoteMineOps) { return true }

//	if (!Game.rooms[builder].storage && !Game.rooms[builder].terminal) { return true; }

	for (let room in Memory.rooms[builder].remoteMineOps) {
		
		if (!checkRoomIsActiveMine(room) ) { continue; }
		if (!Game.rooms[room]) { continue; }

		if (!segment.roads[room] || !segment.roads[room].sources) {
			log(builder + " missing roads! " + room)
			return false;
		}

		for (let sourceId in Memory.rooms[builder].remoteMineOps[room].sources) {
			if (!segment.roads[room].sources[sourceId]) { return false; }
		}
	}
//	console.log(builder + " all roads present! ")
	return true;
}

function createRoadTemplate(builder, segment, segmentId, ignoreRoads = false){
	
	let init = Game.cpu.getUsed();
	delete global.roadCreatorMatrix;
	global.roadCreatorMatrix = {};
	delete global.remoteSourceRoadsStatus;
	global.remoteSourceRoadsStatus = {};
	let firstRoads = false;

	let spawns = Game.rooms[builder].findByType(STRUCTURE_SPAWN);
	let spawns_length = spawns.length;

	// plain cost 2
	// swamp cost 10


	// road cost 1 - traveller
	// road cost 2
	// swamp road cost 4


	// wanted ratio:
	// plain cost 3
	// swamp cost 5	

	// plain 6, swamp 10
	// plain road 5, swamp road 9? 


	// keep current source roads?
	let calcNewSourceRoads = false;
	let activeSources = {}

	if (!segment.roads || segment.roads.calc) {
		calcNewSourceRoads = true;		
	} 

	for (let sourceId in Memory.rooms[builder].sources) {
		activeSources[sourceId] = {}
	}

	let newSources = false;
	for (let room in Memory.rooms[builder].remoteMineOps) {
		for (let sourceId in Memory.rooms[builder].remoteMineOps[room].sources) {
			activeSources[sourceId] = {}
			if (calcNewSourceRoads) { continue; }

			if (!segment.roads || !segment.roads[room] || !segment.roads[room].sources || !segment.roads[room].sources[sourceId]) {
				calcNewSourceRoads = true;
				newSources = true;
			}
		}
	}
	
	
	// INCLUDE PREVIOUS ROADS IN COST MATRIXES

	if (segment.roads) {

		// Check for hostiles and abort
		for (let room in segment.roads) {
			if (Memory.rooms[room] && Memory.rooms[room].avoid) {
				return false;
			}
		}

		for (let room in segment.roads) {
			
			if (!global.roadCreatorMatrix[room]) {
				global.roadCreatorMatrix[room] = {};
				global.roadCreatorMatrix[room].positions = {};
				global.roadCreatorMatrix[room].sources = {};
			}
			
			for (let pos in segment.roads[room].r) {
				if (!global.roadCreatorMatrix[room].positions[pos]) {
					let terrainCost = ROAD_PLAINCOST;
					let posT = posDecompressXY(pos)
					let terrain = getRoomTerrainAt(posT.x, posT.y, room);

					if (terrain === TERRAIN_MASK_WALL) {
						continue; 
					} else if (terrain === TERRAIN_MASK_SWAMP) {
						terrainCost += ROAD_SWAMP_INCREASE;
					}
					global.roadCreatorMatrix[room].positions[pos] = ROAD_ROADPLAN_DECREASE + terrainCost;
				}
			}

			for (let sourceId in segment.roads[room].sources) {

			//	if (!activeSources[sourceId]) { continue; } // keep it to keep stearing other roads in this direction?

				global.roadCreatorMatrix[room].sources[sourceId] = {}
				for (let posSource in segment.roads[room].sources[sourceId].r) {					
					let terrainCost = ROAD_PLAINCOST;
					let posT = posDecompressXY(posSource)
					let terrain = getRoomTerrainAt(posT.x, posT.y, room);
					if (terrain === TERRAIN_MASK_WALL) {
						continue;
					} else if (terrain === TERRAIN_MASK_SWAMP) {
						terrainCost += ROAD_SWAMP_INCREASE;
					}
					global.roadCreatorMatrix[room].sources[sourceId][posSource] = ROAD_ROADPLAN_DECREASE + terrainCost;
					
				}
			}
		}
	} else {
		firstRoads = true;
	}

	

	if (segment.roads === undefined) { segment.roads = {} }
	if (segment.roads[builder] === undefined) { segment.roads[builder] = {} }
	
	segment.roads[builder].r = {};

	if (calcNewSourceRoads) {
		for (let room in segment.roads) {
			for (let sourceId in segment.roads[room].sources) {
				if (!activeSources[sourceId]) { continue; }	// keep road stored for future use
				delete segment.roads[room].sources[sourceId]
			}
			if (segment.roads[room].sources && Object.keys(segment.roads[room].sources).length === 0) {
				delete segment.roads[room].sources
			}			
		}
	}
	
			
	if (segment.structures) {
		if (!global.roadCreatorMatrix[builder]) {
			global.roadCreatorMatrix[builder] = {};
			global.roadCreatorMatrix[builder].positions = {};
		}
		// ADD ROADS FROM ROOM BLUEPRINT
		let _init = Game.cpu.getUsed();
		let structures = Game.rooms[builder].find(FIND_MY_STRUCTURES, {
			filter: (structure) => {
			return (structure.structureType === STRUCTURE_LAB ||
					structure.structureType === STRUCTURE_SPAWN ||
					structure.structureType === STRUCTURE_STORAGE ||
					structure.structureType === STRUCTURE_TERMINAL
				);
			}
		});

		let extensions = Game.rooms[builder].find(FIND_MY_STRUCTURES, {
			filter: (structure) => {
			return (structure.structureType === STRUCTURE_EXTENSION 					
				);
			}
		});

		let cSites =  Game.rooms[builder].find(FIND_MY_CONSTRUCTION_SITES, {
			filter: (structure) => {
			return (structure.structureType === STRUCTURE_EXTENSION 					
				);
			}
		});

		for (let idx = 0; idx < segment.structures[STRUCTURE_ROAD].pos.length; idx++) {
			let posBp = new RoomPosition(segment.structures[STRUCTURE_ROAD].pos[idx].x, segment.structures[STRUCTURE_ROAD].pos[idx].y, builder);

			
			if (posBp.findInRange(structures, 2).length > 0 || 
				posBp.findInRange(extensions, 1).length > 0 || 
				posBp.findInRange(cSites, 1).length > 0 
			) {

				/*
				
			if (posBp.lookForStructuresAround(STRUCTURE_EXTENSION, 1).length > 0 ||
				posBp.lookForStructuresAround(STRUCTURE_LAB, 2).length > 0 ||
				posBp.lookForStructuresAround(STRUCTURE_SPAWN, 2).length > 0 ||
				posBp.lookForStructuresAround(STRUCTURE_STORAGE, 2).length > 0 || 
				posBp.lookForStructuresAround(STRUCTURE_TERMINAL, 2).length > 0
			){		*/	
				let terrainCost = ROAD_PLAINCOST;
				let terrain = getRoomTerrainAt(posBp.x, posBp.y, builder);
				if (terrain === TERRAIN_MASK_WALL) {
					continue;
				} else if (terrain === TERRAIN_MASK_SWAMP) { 
					terrainCost += ROAD_SWAMP_INCREASE;	
				}
				segment.roads[builder].r[posCompress(posBp)] = {};
				global.roadCreatorMatrix[builder].positions[posCompress(posBp)] = ROAD_ROADPLAN_DECREASE + terrainCost;						
			} else {
				let compressed = posCompress(posBp)
				if (global.roadCreatorMatrix[builder].positions[compressed] === undefined) {
					let terrainCost = ROAD_PLAINCOST;
					let terrain = getRoomTerrainAt(posBp.x, posBp.y, builder);
					if (terrain === TERRAIN_MASK_WALL) {
						continue;
					} else if (terrain === TERRAIN_MASK_SWAMP) { 
						terrainCost += ROAD_SWAMP_INCREASE;	
					}

					global.roadCreatorMatrix[builder].positions[compressed] = ROAD_ROADPLAN_DECREASE + terrainCost;
				}
			}
		}

		let used = Game.cpu.getUsed()-init;
		console.log("looking for roads around cpu " +used.toFixed(2))
			
		for (let structureType in segment.structures) {
			let buildings = segment.structures[structureType];			
			if (structureType === STRUCTURE_RAMPART) {
				for (let idx = 0; idx < buildings.pos.length; idx++) {
					let compressed = posCompressXY(buildings.pos[idx].x, buildings.pos[idx].y);
					if (global.roadCreatorMatrix[builder].positions[compressed] === undefined) {
						let terrainCost = ROAD_PLAINCOST;
						let posT = posDecompressXY(compressed)
						let terrain = getRoomTerrainAt(posT.x, posT.y, builder);
						if (terrain === TERRAIN_MASK_WALL) {
							continue;
						} else if (terrain === TERRAIN_MASK_SWAMP) { 
							terrainCost += ROAD_SWAMP_INCREASE;	// makes tile cost 4, less than normal swamps
						}
						global.roadCreatorMatrix[builder].positions[compressed] = ROAD_ROADPLAN_DECREASE + terrainCost;
					}
				}
				
							
			} else if (structureType === STRUCTURE_ROAD) {
				continue;	// already added 
			} else if (structureType === STRUCTURE_CONTAINER) {
				for (let idx = 0; idx < buildings.pos.length; idx++) {					
					global.roadCreatorMatrix[builder].positions[posCompressXY(buildings.pos[idx].x, buildings.pos[idx].y)] = ROAD_SWAMPCOST + 5;		
				}
			} else {
				// INCLUDE STRUCTURES FROM BLUEPRINT IN COSTMATRIX
				for (let idx = 0; idx < buildings.pos.length; idx++) {
					global.roadCreatorMatrix[builder].positions[posCompressXY(buildings.pos[idx].x, buildings.pos[idx].y)] = 255;
				}
			}
		}
	}

	// Block spawn filler pos
	let fillerPos = Game.rooms[builder].getSpawnFillerPos();
	for (let idx in fillerPos){
		global.roadCreatorMatrix[builder].positions[posCompressXY(fillerPos[idx].x, fillerPos[idx].y)] = 255;		
	}

	// Block Spawn containers
	let spawnContainers = Game.rooms[builder].getSpawnContainerPos()
	for (let idx in spawnContainers){
		global.roadCreatorMatrix[builder].positions[posCompress(fillerPos[idx].x, fillerPos[idx].y)] = 255;		
	}

	
	let localOptions = {range: 1, ignoreCreeps: true, roadPlan: true, maxRooms: 1, freshMatrix: 1, roomCallback: addBlueprintRoadsToCostMatrix };
	
	// ADD SOME LOCAL ROADS
	if (getRoomPRCL(builder) < 8 && spawns.length > 0) {
		if (segment.controllerLinkPos) {
			let controllerContainerPos = posDecompress(segment.controllerLinkPos, builder)
			addRoad(spawns[0].pos, controllerContainerPos, segment, localOptions);
			if (Game.rooms[builder].storage) {
				addRoad(Game.rooms[builder].storage.pos, controllerContainerPos, segment, localOptions);
			}
		} else {
			addRoad(spawns[0].pos, Game.rooms[builder].controller.pos, segment, localOptions);
		}
	}

	let extensions = Game.rooms[builder].findByType(STRUCTURE_EXTENSION);
	if (extensions.length > 0) {

		/*
		if (ENABLE_SOURCE_EXTENSIONS) {
			let sources = Game.rooms[builder].find(FIND_SOURCES); 	
			for (let i = 0; i < sources.length; i++) {
				if (!sources[i].pos._cache.craneTs || Game.time > sources[i].pos._cache.craneTs) { continue; } // no active crane here
				let sourceExt = sources[i].getSourceExtensions(true)
				for (let idx in sourceExt) {
					craneExtensions[sourceExt[idx]] = {};
				}
			}

			let spawnExt = Game.rooms[builder].getSpawnExtensions(false, false);
			for (let idx in spawnExt) {
				let ext = spawnExt[idx]
				if (!ext.pos._cache.craneTs || Game.time > ext.pos._cache.craneTs) { continue; } // no active crane here
				craneExtensions[spawnExt[idx].id] = {};
			}

			let storeCraneExt = Game.rooms[builder].getStoreCraneExtensions()
			for (let idx in storeCraneExt) {
				let ext = storeCraneExt[idx];
				if (!ext.pos._cache.craneTs || Game.time > ext.pos._cache.craneTs) { continue; } // no active crane here
				craneExtensions[spawnExt[idx].id] = {};
			}
		}*/

		let lastExtension = extensions[extensions.length-1]
		if (!lastExtension.pos._cache.craneTs) {	// if this is not covered by a crane
			for (let i = 0; i < spawns_length; i++) {					
				addRoad(spawns[i].pos, lastExtension.pos, segment, localOptions);
			}
			if (Game.rooms[builder].storage) {
				addRoad(Game.rooms[builder].storage.pos, lastExtension.pos, segment, localOptions);
			}
			if (Game.rooms[builder].terminal) {
				addRoad(Game.rooms[builder].terminal.pos, lastExtension.pos, segment, localOptions);
			}
		}
	}

	let labs = Game.rooms[builder].findByType(STRUCTURE_LAB);
	if (labs.length > 0) {
		let labPos = Game.rooms[builder].labIdlePos();
		if (!labPos) { labPos = labs[0].pos}
		
		for (let i = 0; i < spawns_length; i++) {					
			addRoad(spawns[i].pos, labPos, segment, localOptions);
		}
		if (Game.rooms[builder].storage) {
			addRoad(Game.rooms[builder].storage.pos, labPos, segment, localOptions);
		}
		if (Game.rooms[builder].terminal) {
			addRoad(Game.rooms[builder].terminal.pos, labPos, segment, localOptions);
		}
	}
	
	// REMOTE SOURCES	
	if (calcNewSourceRoads && Memory.rooms[builder].remoteMineOps){
		let remoteOptions = {range: 1, ignoreCreeps: true, roadPlan: true, allowSK: true, freshMatrix: 1, roomCallback: addBlueprintRoadsToCostMatrix};
		let remoteOpsRooms = Object.keys(Memory.rooms[builder].remoteMineOps);
		let length = remoteOpsRooms.length;
		while (length--) {	//reverse order to reuse paths generated to the furthest sources
			let room = remoteOpsRooms[length]; 	
			if (!room) { continue; }		
			if (Memory.rooms[builder].remoteMineOps[room].sources) {
				let sources = Object.keys(Memory.rooms[builder].remoteMineOps[room].sources);
				let sourcesLength = sources.length;
				while (sourcesLength--) {
					let sourceId = sources[sourcesLength];
					if (!Memory.rooms[room] || !Memory.rooms[room].sources || !Memory.rooms[room].sources[sourceId]) { continue; }

					let source = Game.getObjectById(sourceId);
					let dest = undefined;
					if (!source) { 
						if (Memory.rooms[room].sources[sourceId].EPos && Memory.rooms[room].sources[sourceId].EPos[builder]) {
							dest = posDecompress(Memory.rooms[room].sources[sourceId].EPos[builder], room);
						}						
					} else {
						dest = source.getHarvesterPos(builder);
					}

					if (!dest) { continue; }

					if (Game.rooms[builder].storage) {
						addRoad(Game.rooms[builder].storage.pos, dest, segment, remoteOptions, sourceId);
					} else if (Game.rooms[builder].terminal) {
						addRoad(Game.rooms[builder].terminal.pos, dest, segment, remoteOptions, sourceId);
					} else {
						addRoad(spawns[0].pos, dest, segment, remoteOptions, sourceId);
					}
				}
			}
			for (let sourceId in Memory.rooms[builder].remoteMineOps[room].mineral) {
				let source = Game.getObjectById(sourceId);
				if (!source) { continue; }
				let dest = source.pos;
				if (Game.rooms[builder].terminal) {
					addRoad(Game.rooms[builder].terminal.pos, dest, segment, remoteOptions, sourceId);
				}
			}
		}
	}

	// LOCAL SOURCES
	if (calcNewSourceRoads) {
		for (let id in Memory.rooms[builder].sources) {
			let source = Game.getObjectById(id);		
			let containerPos = source.getHarvesterPos(builder);
	
			if (containerPos){
	
				let maxCostNoRoad = 35;
				if (roomIsPowerSource(builder)) {
					maxCostNoRoad = 7;
				}
				let linked = containerPos.lookForStructuresAround(STRUCTURE_LINK, 1).length;
				if (linked > 0) {
					// skip roads if easy path
					let road = findTravelPath(spawns[0], containerPos, {range: 1, ignoreCreeps: true, maxRooms: 1});					
					if (!road.incomplete && road.cost < maxCostNoRoad) {
						continue;
					}
				}
	
				for (let i = 0; i < spawns_length; i++) {
					addRoad(spawns[i].pos, containerPos, segment, localOptions, id);
				}
			}
		}
	}
	


	let time = Game.cpu.getUsed()-init;
	console.log(builder + " recreating road segment, used cpu: " +time);
	
	// SAVE
	log("new sources ! " + newSources)
	if (firstRoads || segment.roadsCnt || newSources) {		
		segment.roads.ts = Game.time; // Recreate next builder tick, to allow more optimum roads to form (before building them)
		segment.roads.calc = true;

		/*
		if (segment.roadsCnt === undefined) { segment.roadsCnt = 0; }
		segment.roadsCnt++;
		if (segment.roadsCnt > 4) {
			delete segment.roadsCnt;
		}*/



	} else {
		segment.roads.ts = Game.time + ROAD_REBUILD_TIMER;
		delete segment.roads.calc;		
	}
	
	saveMemorySegment(segmentId, segment);

	delete global.roadsCache[builder];
	regRoadsInCache(builder, segment)
	return true;
}



function addRoad(origin, destination, segment, options = {}, sourceId = 0){
//	options.ignoreStructures = true;

	options.sourceId = sourceId
	let road = findTravelPath(origin, destination, options);					
	let length = road.path.length;
	let roomName;

	if (sourceId) { // delete the old road, so other sources dont reuse it
		for (let room in global.roadCreatorMatrix) {
			if (!global.roadCreatorMatrix[room].sources) { continue;}
			for (let _sourceId in global.roadCreatorMatrix[room].sources) {
				if (_sourceId === sourceId) {
					global.roadCreatorMatrix[room].sources[_sourceId] = {}
				}
			}
		}
	}

	for (let i = 0; i < length; i++) {
		roomName = road.path[i].roomName;
		let roadPos = road.path[i]

		delete global.roadsCache[roomName]

		if (segment.roads[roomName] === undefined) {
			segment.roads[roomName] = {};
			segment.roads[roomName].r = {};
		}

		if (segment.roads[roomName].sources === undefined) {
			segment.roads[roomName].sources = {};
		}		
		
		if (Game.rooms[roomName]) {
			drawText(roomName, "R", roadPos.x, roadPos.y, {color: 'red', font: 0.5});
		}
		
		let posComppressed = posCompress(roadPos)

		if (sourceId){
			if (!segment.roads[roomName].sources[sourceId]) {
				segment.roads[roomName].sources[sourceId] = {};
				segment.roads[roomName].sources[sourceId].r = {};
			}
			
			segment.roads[roomName].sources[sourceId].r[posComppressed] = {};
		} else {
			segment.roads[roomName].r[posComppressed] = {};
		}

		// CREATE A MATRIX TO REUSE FOR FUTURE ROADS THE SAME TICK
		if (global.roadCreatorMatrix[roomName] === undefined) {
			console.log("undefined roadCreatorMatrix? " + roomName)
			global.roadCreatorMatrix[roomName] = {};
			global.roadCreatorMatrix[roomName].positions = {};			
		}
		
		if (sourceId) {
			
			if (global.roadCreatorMatrix[roomName].sources === undefined) { global.roadCreatorMatrix[roomName].sources = {} }	
			if (global.roadCreatorMatrix[roomName].sources[sourceId] === undefined) { global.roadCreatorMatrix[roomName].sources[sourceId] = {} }
			
			let terrainCost = ROAD_PLAINCOST;
			let terrain = getRoomTerrainAt(roadPos.x, roadPos.y, roomName);
			if (terrain === TERRAIN_MASK_WALL) {
				continue;
			} else if (terrain === TERRAIN_MASK_SWAMP) { 
				terrainCost += ROAD_SWAMP_INCREASE;	// makes tile cost 4, less than normal swamps
			}
			global.roadCreatorMatrix[roomName].sources[sourceId][posComppressed] = ROAD_ROADPLAN_DECREASE + terrainCost;
		} else if (global.roadCreatorMatrix[roomName].positions[posComppressed] === undefined) {
			let terrainCost = ROAD_PLAINCOST;
			let terrain = getRoomTerrainAt(roadPos.x, roadPos.y, roomName);
			if (terrain === TERRAIN_MASK_WALL) {
				continue;
			} else if (terrain === TERRAIN_MASK_SWAMP) { 
				terrainCost += ROAD_SWAMP_INCREASE;	// makes tile cost 4, less than normal swamps
			}

			global.roadCreatorMatrix[roomName].positions[posComppressed] = ROAD_ROADPLAN_DECREASE + terrainCost;
		}	
	}
	return segment;
}

// COST MATRIX - ADD SEGMENT ROADS
global.addBlueprintRoadsToCostMatrix = (roomName, matrix, options) => {

//	displayCostMatrix(matrix, roomName, "red")

	options.plainCost = ROAD_PLAINCOST;
	options.swampCost = ROAD_SWAMPCOST;
	matrix = avoidSKcreeps(roomName, matrix, options)

	if (global.roadCreatorMatrix &&
		global.roadCreatorMatrix[roomName] &&
		global.roadCreatorMatrix[roomName].positions) {

		let otherRoads = {}
		
	//	if (global.roadCreatorMatrix[roomName].disp === undefined) { global.roadCreatorMatrix[roomName].disp = 0}	
		if (global.roadCreatorMatrix[roomName].positions) {
			for (let posToTest in global.roadCreatorMatrix[roomName].positions) {
				otherRoads[posToTest] = {}
				let value = global.roadCreatorMatrix[roomName].positions[posToTest];				
				let pos = posDecompressXY(posToTest);
				matrix.set(pos.x, pos.y, value);
			}
		}

		if (global.roadCreatorMatrix[roomName].sources) {

			for (let sourceId in global.roadCreatorMatrix[roomName].sources) {
				if (sourceId === options.sourceId) { continue; }
				for (let posToTest in global.roadCreatorMatrix[roomName].sources[sourceId]) {
					otherRoads[posToTest] = {}
					let value = global.roadCreatorMatrix[roomName].sources[sourceId][posToTest];
					let pos = posDecompressXY(posToTest);
					matrix.set(pos.x, pos.y, value);
				}
			}

			if (global.roadCreatorMatrix[roomName].sources[options.sourceId]) {	
				let sourceId = options.sourceId;
				for (let posToTest in global.roadCreatorMatrix[roomName].sources[sourceId]) {
					let value = global.roadCreatorMatrix[roomName].sources[sourceId][posToTest];
					let pos = posDecompressXY(posToTest);
				//	let currentValue = matrix.get(pos.x, pos.y);
				//	if (currentValue > 0) { continue; }
					if (otherRoads[posToTest]) { continue; }
					matrix.set(pos.x, pos.y, value + 1);
					otherRoads[posToTest] = {}
				}
			}
		}
	}

	/*
	if (global.displaymt !== Game.time) {
		global.displaymt = Game.time
		displayCostMatrix(matrix, roomName)
	}
	*/

	return matrix;
};

function buildControllerContainerFromBlueprint(builder, segment){	
	let controllerContainerPos = posDecompress(segment.controllerContainerPos, builder);
	let result = Game.rooms[builder].createConstructionSite(controllerContainerPos, STRUCTURE_CONTAINER);
	return result === OK;
}

function isOnBuildTimeout(roomName, posId) {
	if (!Memory.rooms[roomName].buildTs || !Memory.rooms[roomName].buildTs[posId]) { return false;}

	if (Game.time < Memory.rooms[roomName].buildTs[posId].ts) { 
		return true
	} else {
		delete Memory.rooms[roomName].buildTs[posId];
	}
}

function setBuildTimeOut(roomName, posId, timeout = 5000) {
	if (Memory.rooms[roomName].buildTs === undefined) { Memory.rooms[roomName].buildTs = {} }
	Memory.rooms[roomName].buildTs[posId] = {};
	Memory.rooms[roomName].buildTs[posId].ts = Game.time + timeout;
}

function buildExtensions(builder, segment, number){

	let currentConstSites = Object.keys(Game.constructionSites).length;
	let possibleCsites = MAX_CONSTRUCTION_SITES - currentConstSites;

	let built = 0;
	if (segment.structures && segment.structures[STRUCTURE_EXTENSION]) {
		let buildings = segment.structures[STRUCTURE_EXTENSION];

		for (let idx = 0; idx < buildings.pos.length; idx++) {

			if (built >= number || possibleCsites < 10){
				return -1;
			}
			let pos = new RoomPosition(buildings.pos[idx].x, buildings.pos[idx].y, builder);
			if (pos.lookForStructure(STRUCTURE_EXTENSION)) { continue; }

			let posId = null;
			if (isOutsideWalls(pos)) {
				posId = posCompress(pos)
				if (isOnBuildTimeout(builder, posId)) { continue; }				
			}
				
			let result = Game.rooms[builder].createConstructionSite(pos, STRUCTURE_EXTENSION);	
			if (result === OK) {
				built += 1;
				possibleCsites -= 1;

				if (posId) {
					setBuildTimeOut(builder, posId, 5000);
				}
			}
		}
	}			
}

function sortSources(roomName, anchor) {

	let sortable = [];
	for (let id in Memory.rooms[roomName].sources) {


		let source = Game.getObjectById(id)
		let road = findTravelPath(source, anchor, { ignoreCreeps: true, ignoreStructures: true });

		if (!road || road.incomplete) { 
			log("ABORT SORTING SOURCES!")
			return; 
		}			
		sortable.push({data: JSON.parse(JSON.stringify(Memory.rooms[roomName].sources[id])), pathLength: road.path.length, id: id});	
		log("sortSources source " + id + " path length " + road.path.length)		
	}
	log(JSON.stringify(sortable))
	sortable.sort(function(a, b) {
		return (a.pathLength - b.pathLength);});

	delete Memory.rooms[roomName].sources;
	Memory.rooms[roomName].sources = {}

	log(JSON.stringify(sortable))
	for (let idx in sortable) {
		/*
		Memory.rooms[roomName].sources[sortable[idx].id] = {}
		let source = Game.getObjectById(sortable[idx].id)
		Memory.rooms[roomName].sources[sortable[idx].id].pos = posCompress(source.pos)

		*/
		Memory.rooms[roomName].sources[sortable[idx].id] = sortable[idx].data;
	}


	requestMemSave();
} 

function buildLinks(builder, segment, segmentId){	
	// CONTROLLER
	let controllerLinkPos = posDecompress(segment.controllerLinkPos, builder);
	let result = Game.rooms[builder].createConstructionSite(controllerLinkPos, STRUCTURE_LINK);
	if (result === OK) { return; }
	
	// CALC STORAGE 
	if (segment.storeLinkPos === undefined) {
		let cranePos = Game.rooms[builder].getCranePos();
		let linkPos = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_LINK);
		for (let i = 0; i < linkPos.length; i++) {
			if (linkPos[i].getRangeTo(cranePos) === 1) {
				segment.storeLinkPos = posCompress(linkPos[i]);
				saveMemorySegment(segmentId, segment);
			}
		}
	}

	// STORAGE 
	let storageLinkPos = posDecompress(segment.storeLinkPos, builder);
	result = Game.rooms[builder].createConstructionSite(storageLinkPos, STRUCTURE_LINK);
	if (result === OK) { return; }

	// SPAWNER
	let spawnerLinkPos = posDecompress(segment.spawnLinkPos, builder);
	result = Game.rooms[builder].createConstructionSite(spawnerLinkPos, STRUCTURE_LINK);
	if (result === OK) { return; }

	// CALC SOURCE LINKS 
	/*
	if (segment.sourceLinkPos === undefined) {
		if (segment.sourceLinkPos === undefined) { 
			delete segment.sourceLinkPos
			segment.sourceLinkPos = [];
		}
		
		let sources = Game.rooms[builder].find(FIND_SOURCES); 
		let storagePos = getAllAsPosFromBlueprint(segment, builder, STRUCTURE_STORAGE);		
		let sortable = [];
		for (let i = 0; i < sources.length; i++) {
			let road = findTravelPath(storagePos[0], sources[i].pos , { ignoreCreeps: true, ignoreStructures: true });
			let length = road.path.length;
		//	console.log(" source "+ length)
			if (length > 4) {
				sortable.push([i, length]);
			}
		} 
		sortable.sort(function(a, b) {
			return b[1] - a[1];});

		let length = sortable.length;
		for (let i=0; i<length; i++) {
			let idx = sortable[i][0];
		//	let pathLength = sortable[i][1];

			let containerPos = sources[idx].getHarvesterPos(builder, undefined, true);
			let link = containerPos.findInRange(FIND_STRUCTURES, 1, {
				filter: (structure) => {
				return (structure.structureType == STRUCTURE_LINK);
				}});
			if (link.length > 0) { continue; }
								
			let closestPos;
			let closestPosMoves = 0;
			for (let x=-1; x<=1; x++){
				for (let y=-1; y<=1; y++){
					if (x === 0 && y === 0) { continue; }
					let pos = new RoomPosition(containerPos.x + x, containerPos.y + y, builder);				
					if (pos.isNearExit(1) ) { continue; }
				//	if (getRoomTerrainAt(pos) === TERRAIN_MASK_WALL) {continue;}
					if (!pos.isPassible(true)) { continue; }
				//	let foundStructures = _.filter(Game.rooms[builder].lookForAt(LOOK_STRUCTURES, pos), function(c) {return (c.structureType !== STRUCTURE_ROAD);});
					let foundRoad =  pos.lookForStructure(STRUCTURE_ROAD);
				
					if (!foundRoad) {
						drawCircle(builder, pos.x, pos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'});							

						let path = findTravelPath(storagePos[0], pos, {range: 2, maxRooms: 1, maxOps: 3000, ignoreStructures: true, ignoreCreeps: true});
						let pathLength = 50;
						if (!path.incomplete && path.path.length) {
							pathLength = path.cost;
							
						}

						if (pathLength > closestPosMoves) {
							closestPosMoves = pathLength;
							closestPos = pos;
						}
					}
				}
			}
			if (closestPos) {
				addStructureToRoomLayout(STRUCTURE_LINK, closestPos, segment);		
				segment.sourceLinkPos.push(posCompress(closestPos));
			}
		}
		saveMemorySegment(segmentId, segment);
	}*/

	// SOURCE
	if (segment.sourceLinkPos.length > 0) {
		let linkPosPacked = segment.sourceLinkPos[0];
		let linkPos = posDecompress(segment.sourceLinkPos[0], builder);
		drawCircle(builder, linkPos.x, linkPos.y , {fill: 'transparent', radius: 0.50, stroke: 'orange'}); 
		result = Game.rooms[builder].createConstructionSite(linkPos, STRUCTURE_LINK);

		// Check if we keep rebuilding these
		if (result === OK && isOutsideWalls(linkPos)) {
			triggerLinkRamparts(builder, linkPosPacked);			
		}

		if (result === OK) { return; }
	}


	// SOURCE
	if (segment.sourceLinkPos.length > 1) {
		for (let i = 1; i < segment.sourceLinkPos.length; i++) {
			let linkPosFurthest = posDecompress(segment.sourceLinkPos[i], builder);
			result = Game.rooms[builder].createConstructionSite(linkPosFurthest, STRUCTURE_LINK);
			if (result === OK && isOutsideWalls(linkPosFurthest) ) {
				triggerLinkRamparts(builder, segment.sourceLinkPos[i]);
			}
			if (result === OK) { return; }
		}
	}
}

function triggerLinkRamparts(builder, linkPosPacked) {
	if (Memory.rooms[builder].linkTimer === undefined) { Memory.rooms[builder].linkTimer = {}; }

	if (Memory.rooms[builder].linkTimer[linkPosPacked] && Game.time < Memory.rooms[builder].linkTimer[linkPosPacked].ts) {
		Memory.rooms[builder].linkTimer[linkPosPacked].rampart = true;
	} else {
		delete Memory.rooms[builder].linkTimer[linkPosPacked];
	}

	if (Memory.rooms[builder].linkTimer[linkPosPacked] === undefined) {
		Memory.rooms[builder].linkTimer[linkPosPacked] = {};
	}

	Memory.rooms[builder].linkTimer[linkPosPacked].ts = Game.time + 50000;
}

global.getCreditsValueOfStore = function(object) {
	let totalValue = 0;
	for (let res in object.store) {
			
		if (res === RESOURCE_ENERGY && Memory.rooms[object.room.name] && Memory.rooms[object.room.name][R.MY_MINING_OUTPOST]) { continue; }

		let amount = object.store[res]
		if (amount <= 0) { continue; }
		totalValue += getMarketPrice(res) * amount;
	}
	return totalValue;
}

global.clearSources = function(room) {
	let structures = Game.rooms[room].find(FIND_STRUCTURES);
	for ( let structureIdx in structures) {
		let structure = structures[structureIdx];
		if (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_ROAD) { continue; }

		if (structure.pos.findInRange(FIND_SOURCES, 2).length === 0) { continue; }
		let result = structure.destroy();
		if (result === -4 ) { // Hostile creeps are in the room.
			return result;
		}

	}
}

// EXPLODE ROOM, DESTROY ALL STRUCTURES
global.clearRoom = function(room, soft=false, clearMy=false, leaveStores=false){
	console.log(room + " clearRoom, soft" + soft + " clearMy " +clearMy)
	let structures = Game.rooms[room].find(FIND_STRUCTURES);
	let resourcesFound = false;
	for ( let structureIdx in structures) {
		let structure = structures[structureIdx];
		if (soft && (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_ROAD)) { continue; }
		if (!clearMy && structure.my) { continue; }

		if (structure.structureType === STRUCTURE_STORAGE || structure.structureType === STRUCTURE_TERMINAL || structure.structureType === STRUCTURE_FACTORY) {			
			let salvagableAmount = getMarketPrice(RESOURCE_CATALYST) * 2500;
			if (leaveStores || 
				structure.store[RESOURCE_ENERGY] > 50000 ||
				getCreditsValueOfStore(structure) > salvagableAmount
			) {
				resourcesFound = true;
				continue; 
			}
		}

		let result = structure.destroy();
		if (result === -4 ) { // Hostile creeps are in the room.
			return result;
		}
		console.log("destroyed " + structure + " result " + result )
	}	

	let enemyConstructionSites = Game.rooms[room].find(FIND_HOSTILE_CONSTRUCTION_SITES);
	for ( let idx in enemyConstructionSites) {
		enemyConstructionSites[idx].remove();
	}

	if (resourcesFound){
		checkForLootMission(room, true, true)
	}

	return OK
};


function removeOldRoads(room, segment){
	if (!segment.roads) return;

	let currentRoads = Game.rooms[room].findByType(STRUCTURE_ROAD);

	let blueprintRoads = {};
	for (let pos in segment.roads[room].r) {
		blueprintRoads[pos] = {};
		let posToDraw = posDecompress(pos, room);
		Game.rooms[room].visual.circle(posToDraw.x, posToDraw.y , {fill: 'transparent', radius: 0.45, stroke: 'blue'});
	}
	
	if (segment.roads[room].sources){
		for (let source in segment.roads[room].sources) {		
			for (let road in segment.roads[room].sources[source].r) {
				let posToDraw = posDecompress(road, room);
				Game.rooms[room].visual.circle(posToDraw.x, posToDraw.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
				blueprintRoads[road] = {};
			}
		}
	}	

	let destroyedRoads = 0;
	for (let idx in currentRoads) {
		let roadPos = posCompress(currentRoads[idx].pos);
		if (blueprintRoads[roadPos] === undefined){
		//	console.log(room + " found unwanted road at " +roadPos)
			destroyedRoads++;				
			currentRoads[idx].destroy();
		}
	}
	console.log(room + "blueprint roads " + Object.keys(blueprintRoads).length + " current roads " +currentRoads.length + " destroyed roads " +destroyedRoads);
	return destroyedRoads;
}

// check for roads under buildings
global.removeBlockedRoads = function(room){
	let structures = Game.rooms[room].find(FIND_STRUCTURES);
	let destroyedRoads = 0;
	for (let structureIdx in structures) {
		let structure = structures[structureIdx];
		if (structure.structureType !== STRUCTURE_ROAD) { continue; }
		if (!structure.pos.isPassible(true)) {
			console.log("found blocked road! " + structure.pos);
			destroyedRoads++;
			structure.destroy();
		}
	}

	
};

/**
    @param {PathFinder.CostMatrix} foregroundPixels - object pixels. modified for output
    @param {number} oob - value used for pixels outside image bounds
    @return {PathFinder.CostMatrix}

    the oob parameter is used so that if an object pixel is at the image boundary
    you can avoid having that reduce the pixel's value in the final output. Set
    it to a high value (e.g., 255) for this. Set oob to 0 to treat out of bounds
    as background pixels.
*/

global.tilesToStandOn = function(roomName) {
	let costMatrix = new PathFinder.CostMatrix();
	for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
        	if (x === 0 || y === 0)	{ continue; }
			let posToTest = new RoomPosition(x, y, roomName);
			if (getRoomTerrainAt(posToTest) === TERRAIN_MASK_WALL) { continue; }	
        	if (!posToTest.isPassible(true) ) { continue; }	
        	costMatrix.set(x, y, 1);
   		}
    }
    return costMatrix;
};

global.distanceTransform = function(foregroundPixels, oob = 0) {
    let dist = foregroundPixels; // not a copy. We're modifying the input

    // Variables to represent the 3x3 neighborhood of a pixel.
    let A, B, C;
    let D, E, F;
    let G, H, I;

    let x, y, value;
    
    for (y = 0; y < 50; ++y) {
        for (x = 0; x < 50; ++x) {
            if (foregroundPixels.get(x, y) !== 0) {
                A = dist.get(x - 1, y - 1); B = dist.get(x    , y - 1); C = dist.get(x + 1, y - 1);
                D = dist.get(x - 1, y    );
                if (y ==  0) { A = oob; B = oob; C = oob; }
                if (x ==  0) { A = oob; D = oob; }
                if (x == 49) { C = oob; }

                dist.set(x, y, Math.min(A, B, C, D) + 1);
            }
        }
    }
	
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
    }
	
    return dist;
};

global.getPhalanxMatrix = function(roomName, flee, structuresCost = 255) {
	
	let raidPhalanxId = roomName + flee + structuresCost;	

	if (!getPhalanxMatrixCm[raidPhalanxId] || Game.time > getPhalanxMatrixCm[raidPhalanxId].ts) {

		if (getPhalanxMatrixCm[raidPhalanxId] === undefined) {
			getPhalanxMatrixCm[raidPhalanxId] = {};
		}
	
		getPhalanxMatrixCm[raidPhalanxId].ts = Game.time + 3;
		let rebuildCm;

		if (Game.rooms[roomName]) {			
			let structures = Game.rooms[roomName].find(FIND_STRUCTURES, {
					filter: (structure) => {
					return (structure.structureType !== STRUCTURE_ROAD);
				}});

			if (getPhalanxMatrixCm[raidPhalanxId].cnt !== structures.length) {
				rebuildCm = true;

				if (getPhalanxMatrixCm[raidPhalanxId].cnt !== undefined && Memory.rooms[roomName]) {
					Memory.rooms[roomName].destroyedStructure = 1;
					log(roomName +" rebuilding phalanx cm, different structures count ! " + structures.length + "/" +getPhalanxMatrixCm[raidPhalanxId].cnt + " id " +raidPhalanxId )
				}

				getPhalanxMatrixCm[raidPhalanxId].cnt = structures.length;
				
				if (!getPhalanxMatrixCm[raidPhalanxId].cm) {
					log(roomName +" no cm? ");
				}
			}
		}

		if (rebuildCm || 
			!getPhalanxMatrixCm[raidPhalanxId].cm ||
			Game.time > getPhalanxMatrixCm[raidPhalanxId].cmTs
		) {
			
			getPhalanxMatrixCm[raidPhalanxId].cmTs = Game.time + 347;
			let cm = phalanxTransform(setWalkablePhalanxCosts(roomName, flee, false, 10, false, structuresCost));
			global._isPassibleCache = {};
			getPhalanxMatrixCm[raidPhalanxId].cm = cm.serialize();
			return cm;
		}
	}
	return PathFinder.CostMatrix.deserialize(getPhalanxMatrixCm[raidPhalanxId].cm);
}


global.phalanxTransform = function(dist, oob = 1) {
    let ret = new PathFinder.CostMatrix();

    // Variables to represent the 2x2 neighborhood of a pixel.
    let A, B;
    let D, E;
    let x, y;
    
    for (y = 0; y < 50; ++y) {
        for (x = 0; x < 50; ++x) {            
			A = dist.get(x - 1, y - 1); B = dist.get(x    , y - 1); 
			D = dist.get(x - 1, y    ); E = dist.get(x    , y	 );
			
			if (y ==  0) { A = oob; B = oob; }
			if (x ==  0) { A = oob; D = oob; }
			ret.set(x, y, Math.max(A, B, D, E));
		}        
    }
    return ret;
};

/**
    @param {string} roomName
    @return {PathFinder.CostMatrix}
*/




global.setWalkablePhalanxCosts = function(roomName, flee, ignoreStructures = false, swampCost = 10, ignoreInsidePixel = false, structuresCost = 255) {

	let towers = [];
	if (flee && Game.rooms[roomName]) {
		towers = Game.rooms[roomName].find(FIND_STRUCTURES, {
			filter: (structure) => {
			return (structure.structureType === STRUCTURE_TOWER);
			}});
	}

	let maxTowerDmg = towers.length * 600;

    let costMatrix = new PathFinder.CostMatrix();
    for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
			
			let score = 1;
			if (x < 1 || x > 48 || y < 1 || y > 48) {
				score += 25;					
			}

			let terrain = getRoomTerrainAt(x, y, roomName)
			if (terrain === TERRAIN_MASK_WALL){
				costMatrix.set(x, y, 255);
				continue;			
			}

			if (ignoreInsidePixel && !isOutsidePixelRaidXY(x, y, roomName, true)) { continue; }
			
			if (terrain=== TERRAIN_MASK_SWAMP) {
				score += swampCost;

				// If near rampart make it cost a lot more!
			}
			
			if (maxTowerDmg > 0) {
				let towerDmg = Math.ceil((getTowerDamageXY(x, y, towers) / maxTowerDmg) * 25);
				score += towerDmg;
			}
			costMatrix.set(x, y, score);
		}
	}

	
	ignoreStructures = ignoreStructures || structuresCost === 0
	let ramparts = [];
	if (Game.rooms[roomName] && !ignoreStructures) {
		
		let csites = Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES);
		for (let idx in csites) {
			let csite = csites[idx];
			if (csite.structureType === STRUCTURE_ROAD || csite.structureType === STRUCTURE_CONTAINER || csite.structureType === STRUCTURE_RAMPART) { continue; }
			costMatrix.set(csite.pos.x, csite.pos.y, 255);
		}

		let structures = Game.rooms[roomName].find(FIND_STRUCTURES);
		for (let idx in structures) {
			let struct = structures[idx];

			if (struct.structureType === STRUCTURE_RAMPART && struct.hits > 10000 && !struct.my) {
				ramparts.push(struct)
			} else if (struct.structureType === STRUCTURE_WALL) {
				ramparts.push(struct)
			} else if (struct.structureType !== STRUCTURE_ROAD &&
				struct.structureType !== STRUCTURE_CONTAINER &&
			   (struct.structureType !== STRUCTURE_RAMPART || (struct.structureType === STRUCTURE_RAMPART && !struct.my))
			){
				costMatrix.set(struct.pos.x, struct.pos.y, structuresCost);
			}

			// Dont walk close to ramparts if fleeing
			if (flee && struct.structureType === STRUCTURE_RAMPART && !struct.my) {
				for (let i = 1; i <= 8; i++) {
					let position = struct.pos.getPositionAtDirection(i);
					let currentCost = costMatrix.get(position.x, position.y);
					if (currentCost >= 255) { continue; }
					let newCost = Math.min(254, currentCost + 25);
					costMatrix.set(position.x, position.y, newCost);
				}
			}
		}
	}

	for (let idx in ramparts) {
		let struct = ramparts[idx];
		costMatrix.set(struct.pos.x, struct.pos.y, 255);
	}

    return costMatrix;
}

global.walkablePixelsForRoom = function(roomName) {
    let costMatrix = new PathFinder.CostMatrix();
    for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
			let position = new RoomPosition(x, y, roomName)
			if (position.isPassible(true, true)){
				costMatrix.set(x, y, 1);
			} 
        }
    }
    return costMatrix;
}


global.displayCostMatrix = function(costMatrix, roomName, color = 'green') {
	let visual
	if (Game.rooms[roomName]) 
		visual = Game.rooms[roomName].visual
	else if (!roomName) {
		visual = new RoomVisual();
	} else {
		return;
	}
   

    for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
			let value = costMatrix.get(x, y);

		//	let x = value / 255;
		//	let myColor = new Color(2.0 * x, 2.0 * (1 - x), 0);

			if (value === 255) {
				visual.text("X"  , x, y, {color: 'red', font: 0.8});
            } else if (value > 0) {
				visual.text(value  , x, y, {color: color, font: 0.5});
             //   visual.circle(x, y, {radius:value/255/2, fill:color});
            }
        }
    }
}

global.currentStructures = function(builder, structureType) {
	return Game.rooms[builder].findByTypeMy(structureType).length;
}

function currentAnyStructures(builder, structureType) {
	return Game.rooms[builder].findByType(structureType).length;
}

global.constructingStructures = function(roomName, structureType) {
	 
	if (!Game.rooms[roomName]) { return 0 }
	let constructions = Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES, {
		filter: (structure) => {
		return (structure.my && structure.structureType === structureType);
		}
	});
	return constructions.length || 0;
}

function maxStructures(structureType, currentRCL) {
	return CONTROLLER_STRUCTURES[structureType][currentRCL];
}


global.canBuildStructure = function(builder, structureType, currentRCL) {
	let _maxStructures = maxStructures(structureType, currentRCL);
	let _currentStructures = currentStructures(builder, structureType);
	let _currentStructuresConstructing = constructingStructures(builder, structureType);
	return 	Math.max(0, _maxStructures - (_currentStructures + _currentStructuresConstructing));	
}


