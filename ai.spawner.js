// jshint -W021
'use strict'
let spawnerExport = {

	
    run: function(spawner) {
        // CHECK IF WE HAVE ACCESS TO THE ROOM
        if (Game.rooms[spawner] === undefined){
            return 0;
        }
	
		let init = Game.cpu.getUsed();

		let bootStrappers = getCreeps('bootStrapper', spawner);
		let movers = getCreeps('mover', spawner);
		let haulers = getCreeps('hauler', spawner);
	//	let extractors = getCreeps('extractor', spawner);

	//	let energyCap = Game.rooms[spawner].energyCapacityAvailable;
		
		let energyCap = getRoomEnergyCap(spawner);
	//	if (Memory.rooms[spawner].) // if under attack, dont use source extensions for energy cap if outside base

		let energyCurrent = Game.rooms[spawner].energyAvailable;
		
		let EM = false;
		if ((movers.length === 0 && haulers.length === 0) && bootStrappers.length === 0 ) {
			
			if (Game.rooms[spawner].store(RESOURCE_ENERGY) < 10000 || energyCurrent < 500) {
				EM = true;
				delete Memory.rooms[spawner].spawnQ
				Memory.rooms[spawner].em = Game.time + 150;
				Game.rooms[spawner].visual.text("EM ", Game.rooms[spawner].controller.pos, {align:"right"});
			} else {
				Game.rooms[spawner].visual.text("Soft EM ", Game.rooms[spawner].controller.pos, {align:"right"});								
			}
			energyCap = energyCurrent;
			delete Memory.rooms[spawner].spawnQ;
		}

		
		if (!EM) {

			if (Game.time > Memory.rooms[spawner].em && (movers.length > 0 || haulers.length > 0)) {
				delete Memory.rooms[spawner].em;
			}
			
			if (checkDelayTimer(spawner) ){
				registerIdleSpawn(spawner)
				return 0;
			}
		}
		
		if (Memory.rooms[spawner].spawnQ !== undefined) {
			Game.rooms[spawner].visual.text(Memory.rooms[spawner].spawnQ.length + " Next spawn " + Memory.rooms[spawner].spawnQ[0].name + "  " +energyCurrent + "/" + Memory.rooms[spawner].spawnQ[0].cost, 
			Game.rooms[spawner].controller.pos, {align:"right"});
		}

		
		// FIND FREE SPAWNS, EXIT IF NO SPAWNS
		let myspawns = [];
		let GCL_EM = false;	// allow spawn 0 to spawn, not only refresh

		if (PRAISE_GCL_ROOMS[spawner]) {
			let allCreeps = [];
			let GCLcranes = getCreeps('craneGCL', spawner); 
			allCreeps = allCreeps.concat(GCLcranes);
			let cranes = getCreeps('crane', spawner); 
			allCreeps = allCreeps.concat(cranes);
		
			let upgraders = getCreeps('upgrader', spawner);
			allCreeps = allCreeps.concat(upgraders);
			
			
			if (cranes.length <= 0 || GCLcranes.length <= 0) {
				GCL_EM = true;
			} else if (!needsRefresh(allCreeps, 1250) && upgraders.length < 8) {
				GCL_EM = true;
			} else if (upgraders.length >= 8 && 
				(!Memory.rooms[spawner].checkGCLUpgraders || 
				Game.time > Memory.rooms[spawner].checkGCLUpgraders	
			)) {
				Memory.rooms[spawner].checkGCLUpgraders = Game.time + 159;
				let parts = createMaxBody(energyCap, {move: 1, carry: 1, work: 8} );
				let unwantedCreeps = checkCreepsForMaxSize(parts, upgraders);
			//	console.log("GCL check upgraders "+unwantedCreeps.length);
				if (unwantedCreeps.length > 0 ) {
					GCL_EM = true;
					console.log(spawner + "GCL ROOM NEEDS BIGGER UPGRADERS");
				} else {
					if (Game.rooms[spawner].controller.level < 7 && upgraders.length > 9) {
						if (upgraders[0].ticksToLive < 500) {
							upgraders[0].recycleOrSuicide();
						}
					}
				}
			}
		}
		
		let allSpawns = Game.rooms[spawner].findByType(STRUCTURE_SPAWN);

	//	if (global.stats.spawnsTotal === undefined) { global.stats.spawnsTotal = 0 }
	//	global.stats.spawnsTotal += allSpawns.length;

		if (!GCL_EM && PRAISE_GCL_ROOMS[spawner]) {			
			for (let idx in allSpawns) {
				let spawn = allSpawns[idx]
				if (spawn.spawning == undefined && spawn.id !== "5a48de782f1ea82d332a312c" ) {
					myspawns.push(spawn)
				} else if (spawn.spawning && spawn.memory.posArray !== undefined) {
					spawn.spawning.setDirections(spawn.memory.posArray)
					delete spawn.memory.posArray;
				}
			}
		} else {
			for (let idx in allSpawns) {
				let spawn = allSpawns[idx]

				if (spawn.spawning == undefined) {
					myspawns.push(spawn)
				} /*else if (spawn.memory.currencCreep !== spawn.spawning.name) {
					spawn.memory.currencCreep = spawn.spawning.name;
					if (spawn.memory.posArray) { // done in options already!
						spawn.spawning.setDirections(spawn.memory.posArray)
						delete spawn.memory.posArray;
					}
				} */
				else if (spawn.spawning) {

					if (spawn.spawning.remainingTime === 0) {

						registerIdleSpawn(spawner) 

						if (spawn.spawning.directions && spawn.spawning.directions.length === 1 && !spawn.spawningHasDefaultDirections( )) {
							// spawn points to crane pos
							let blockingCreep = spawn.pos.getPositionAtDirection(spawn.spawning.directions[0]).lookForCreep();
							if (blockingCreep) {
								blockingCreep.clearTarget();
								blockingCreep.recycleOrSuicide();
							}
						} else {
							
							log(spawner+ " blocked spawn! " )

							let path = findTravelPath(spawn.pos, Game.rooms[spawner].controller.pos,
								{range: 1, ignoreRoads: true, ignoreCreeps: true, maxOps:3000, uncompressed: true, retry: false})

							if (!path || path.path.length <= 0) {
								
							} else {
								let blockingCreep = path.path[0].lookForCreep();
								if (blockingCreep) {
									log("spawn moving creep " + blockingCreep)
									Game.rooms[spawner].visual.circle(blockingCreep.pos.x, blockingCreep.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'});
									blockingCreep.moveAllCreepsOnPath(path.path, { allowCombatCreeps: true, recursive: true });
								} else {
									setDefaultSpawningDirections(spawn, true)
								}
							}
						}
					} else {
						registerBusySpawn(spawner)
					}
				}
			}
		}

		

		if (myspawns.length == 0){
			return 0;
		}

		if (!EM) {
			if (Memory.rooms[spawner].spawnQ === undefined || Memory.rooms[spawner].spawnQ[0].cost === undefined){

				let requiredEnergy = 300;
				if (getRoomPRCL(spawner) < 2) { requiredEnergy = 50;}
				if (energyCurrent < requiredEnergy ) {
					registerIdleSpawn(spawner) 
					return 0; 
				}
			}
		}
		

		
		// SPAWN FROM Q
		if (Memory.rooms[spawner].spawnQ !== undefined &&
			Memory.rooms[spawner].spawnQ.length > 0 &&
			!EM
		) {
			if (myspawns[0].spawnFromQ() ) {
				return 0;
			} else {
				registerIdleSpawn(spawner)
				return 0;
			}
		}

		let RCL = getRoomPRCL(spawner);
			

		

		creepSpawnCount(spawner); // Calc new requested creeps

		let defenderRCLlevel = limit(Memory.myRoomHighPRCL, 1, 4);	
		
		let spawncomplete = false;

		let minimumRemotes = 0;
		
		if (!minimumRemotes && !Memory.rooms[spawner].rebuild) {
			minimumRemotes = Math.floor(2.5 * allSpawns.length);

			if (Game.rooms[spawner].energyStatus() >= ECONOMY_RICH) {
				minimumRemotes = Math.floor(minimumRemotes * 0.7);
			}

			if (SEASONAL_THORIUM && isAssistedLevelingSpawn(spawner) && Game.rooms[spawner].energyStatus() >= ECONOMY_DEVELOPING) {
				minimumRemotes = Math.floor(1 * allSpawns.length);
			}
		}

		let maxRemotes = 5.0 * allSpawns.length;
		if (BOT_MODE){
			maxRemotes = Infinity
		}


	//	global.stats['cpu.aiSpawner.init'] += Game.cpu.getUsed()-init;

        if (!myspawns[0].spawning) {

			if(EM) { // Emergency, spawn what can be afforded

				spawncomplete = 1;
                if (energyCurrent >= 300){

					let parts = createMaxBody(limit(energyCurrent, 300, 1000), {move: 2, carry: 2, work: 1} );               
					let newName = myspawns[0].createCreep(parts, 'hvM'+makeid(), {[C.ROLE]: 'bootStrapper', [C.ROOM_ORIGIN]: spawner});
					delete Memory.rooms[spawner].spawnQ;
					console.log(spawner +' Spawning new bootStrapper (emergency): ' + newName + " body " +JSON.stringify(parts) );					
                }
			}
			if (spawncomplete) { return 1; }

			let pushingRCL = PUSH_RCL_TARGETS[spawner];

		//	init = Game.cpu.getUsed();
			if(spawnFillerCranes(spawner, myspawns, energyCap) ){				
				spawncomplete = 1;	
			}			
		//	global.stats['cpu.aiSpawner.spawnFillerCranes'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }	
			
			//	init = Game.cpu.getUsed();
			if (spawnCrane(spawner, myspawns, energyCap)) {	
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnCrane'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();
			if(spawnExtractors(spawner, energyCap, myspawns)) {
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnExtractors'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }				

		//	init = Game.cpu.getUsed();
			if(spawnMovers(spawner, energyCap, myspawns, movers) ){				
				spawncomplete = 1;	
			}			
		//	global.stats['cpu.aiSpawner.spawnMovers'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }
				
		//	init = Game.cpu.getUsed();	
			if (defendMyRoomsAgainstPlayer(spawner, myspawns, energyCap)) {	// IF ROOM IS UNDER SIEGE, SPAWN QUEUE STOPS HERE!
				spawncomplete = 1;	
			}			
		//	global.stats['cpu.aiSpawner.defendMyRoomsAgainstPlayer'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

			if (SEASONAL_COMMS && spawnComScorer(spawner, myspawns, energyCap, allSpawns)) {
				spawncomplete = 1;	
			}			
		//	global.stats['cpu.aiSpawner.spawnComScorer'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }
			
			/*
			init = Game.cpu.getUsed();	
			if (BOT_MODE && spawnLabRats(spawner, myspawns)) {
				spawncomplete = 1;
			}
			global.stats['cpu.aiSpawner.spawnLabRats'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return; }		
			*/

			if (SEASONAL_THORIUM && spawnThoriumScorers(spawner, myspawns, energyCap)){
				spawncomplete = 1;
			}
			if (spawncomplete) { return 1; }

			if (SEASONAL_THORIUM && HARVEST_THORIUM && spawnThoriumMiners(spawner, myspawns, energyCap)){
				spawncomplete = 1;
			}
			if (spawncomplete) { return 1; }


			if (SEASONAL_THORIUM && Memory.rooms[spawner].mineOnly && spawnLocalMineralExtractors(spawner, myspawns, energyCap)) {
				spawncomplete = 1;
			}
			if (spawncomplete) { return 1; }

			if (SEASONAL_THORIUM && HARVEST_THORIUM && spawnAssistedMiners(spawner, myspawns, energyCap)){
				spawncomplete = 1;
			}
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();	
			if(pushingRCL && spawnUpgraders(spawner, myspawns, energyCap)){
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnUpgraders'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();	
			if((Memory.rooms[spawner].newRCL || Memory.rooms[spawner].mineOnly) && spawnBuilders(spawner, myspawns, energyCap)){
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnBuilders'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }
			

		//	init = Game.cpu.getUsed();	
			if (spawnRaids(spawner, myspawns, energyCap) ) { 	
				spawncomplete = 1;					
			}			
		//	global.stats['cpu.aiSpawner.spawnRaids'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }			

		//	init = Game.cpu.getUsed();
			if (spawnPowerBankHaulers(spawner, myspawns, energyCap)){
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnPowerBankHaulers'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

			//	init = Game.cpu.getUsed();
			if (spawnDepositMiners(spawner, energyCap, myspawns, true)) {	// Spawn haulers for deposits!
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnDepositMiners'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();
			if(spawnClaimers(spawner, myspawns, energyCap)){
				spawncomplete = 1;		
			}
		//	global.stats['cpu.aiSpawner.spawnClaimers'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();	
			if (RCL <= 4 && spawnHelpers(spawner, myspawns, energyCap, false, 5 )) {	// spawn a few small helpers early
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnHelpers'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

            if (RCL >= 4 && (spawnHelpers(spawner, myspawns, energyCap, true))) {
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnHelpers'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();
			if (RCL >= defenderRCLlevel && (defendRemotes(spawner, myspawns, energyCap))) {
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.defendRemotes'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }					
			
			if (spawnCoreSnipers(spawner, myspawns, energyCap, allSpawns)) {
				spawncomplete = 1;
			}
			if (spawncomplete) { return 1; }			

		//	init = Game.cpu.getUsed();
			if (spawnPowerBankRaiders(spawner, myspawns, energyCap)) {
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnPowerBankRaiders'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

			

		//	init = Game.cpu.getUsed();						
            if (spawnScouts(spawner, myspawns) ) {
				spawncomplete = 1;
			}			
		//	global.stats['cpu.aiSpawner.spawnScouts'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();
			if (spawnRemoteSources(spawner, energyCap, myspawns, minimumRemotes)){
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnRemoteSourcesPre'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }			

			//	init = Game.cpu.getUsed();
			if (spawnDepositMiners(spawner, energyCap, myspawns)) {
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnDepositMiners'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();
			if (SEASONAL_SCORE && spawnScore(spawner, myspawns, energyCap, allSpawns)) {
				spawncomplete = 1;	
			}			
		//	global.stats['cpu.aiSpawner.spawnScore'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();
			if (SEASONAL_SYMBOLS && spawnSymbol(spawner, myspawns, energyCap, allSpawns)) {
				spawncomplete = 1;	
			}			
		//	global.stats['cpu.aiSpawner.spawnSymbols'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }							

		//	init = Game.cpu.getUsed();
			if (BOT_MODE && spawnPITA(spawner, energyCap, myspawns)){
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnPITA'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();
			if(spawnCombatDeconsturctor(spawner, myspawns, energyCap) ) {		
				spawncomplete = 1;
			}			
		//	global.stats['cpu.aiSpawner.spawnCombatDeconsturctor'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();	
			if(!pushingRCL && spawnUpgraders(spawner, myspawns, energyCap)){
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnUpgraders'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }
			
		//	init = Game.cpu.getUsed();	
            if (RCL >= 3 && (spawnHelpers(spawner, myspawns, energyCap))) {
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnHelpers'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }			

		//	init = Game.cpu.getUsed();
			if(spawnCombatAttackers(spawner, myspawns, energyCap)) {
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnCombatAttackers'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }
			
		//	init = Game.cpu.getUsed();	
			if(spawnEnergyCarts(spawner, myspawns, energyCap)){		
				spawncomplete = 1;		
			}			
		//	global.stats['cpu.aiSpawner.spawnEnergyCarts'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }

			if (spawnAssistedLeveling(spawner, myspawns, energyCap) ) {
				spawncomplete = 1;
			}
			if (spawncomplete) { return 1; }

		//	init = Game.cpu.getUsed();
			if (spawnAttackers(spawner, myspawns, energyCap)) {
				spawncomplete = 1;		
			}			
		//	global.stats['cpu.aiSpawner.spawnAttackers'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }			
			
		//	init = Game.cpu.getUsed();
			if(spawnBuilders(spawner, myspawns, energyCap)){
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnBuilders'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }	

		//	init = Game.cpu.getUsed();	
			if (spawnLocalMineralExtractors(spawner, myspawns, energyCap)) {
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnLocalMineralExtractors'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }
			
		//	init = Game.cpu.getUsed();
			if (spawnSkMineralMiners(spawner, energyCap, myspawns) ){
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnSkMineralMiners'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }
									
		//	init = Game.cpu.getUsed();
			if (spawnRemoteSources(spawner, energyCap, myspawns, maxRemotes)){
				spawncomplete = 1;
			}
		//	global.stats['cpu.aiSpawner.spawnRemoteSources'] += Game.cpu.getUsed()-init;
			if (spawncomplete) { return 1; }
            
			// Nothing to spawn!

		//	log(spawner +" NOTHING TO SPAWN?")
			let delay = 0;
			if (isCpuLimited() >= CPU_SAVING_MEDIUM) {
				delay = 10;
			} else if (isCpuLimited() >= CPU_SAVING_LOW) {
				delay = 5;
			}

			setDelayTimeUntilNextSpawnCheck(spawner, delay);
			registerIdleSpawn(spawner);

        }
    }
};
module.exports = spawnerExport;

function registerIdleSpawn(roomCaller) {
	if (getRoomCache(roomCaller).spwnIdle === undefined) { getRoomCache(roomCaller).spwnIdle = 0; }
	getRoomCache(roomCaller).spwnIdle++;
}

global.registerBusySpawn = function(roomCaller) {
	
	if (getRoomCache(roomCaller).spwnBusy === undefined) { getRoomCache(roomCaller).spwnBusy = 0; }
	getRoomCache(roomCaller).spwnBusy++;
}

function spawnPITA(spawner, energyCap, myspawns){

	if (globalEnergyCrysis() ) { return 0; }
//	if (ECO_MODE) { return; }
	for (let targetRoom in Memory.pita) {
		if (Object.keys(Memory.pita[targetRoom].assignedSpawn).length === 0) { 
			delete Memory.pita[targetRoom];
			continue;
		}
		if (!Memory.pita[targetRoom].assignedSpawn[spawner]) { continue; }
		if (Memory.rooms[targetRoom]) { Memory.rooms[targetRoom].pitaTs = Game.time + 1500; }

		let parts;
		if (Math.random() > 0.5) {
			parts = createBody(energyCap, { move: 1, attack: 1 });
			myspawns[0].createCreep(parts, 'pita'+makeid(), {[C.ROLE]: 'invaderKiller', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom, pita: 1});
			delete Memory.pita[targetRoom];
			return 1;
		} else {
			parts = createBody(energyCap, { move: 1, ranged_attack: 1 });
			myspawns[0].createCreep(parts, 'pita'+makeid(), {[C.ROLE]: 'rangedAttacker', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom, pita: 1});
			delete Memory.pita[targetRoom];
			return 1;
		}
	}
}

function spawnScouts(spawner, myspawns) {

	if (Game.cpu.bucket < 900) { return }

	let scoutInterval = 150;
	

	let requestedScouts = 4;
	if (ECO_MODE) {
		requestedScouts = 2;
	}

	let scouts = [];
	let globalScouts;
	let spawnScout = false;
	if (BOT_MODE || getRoomPRCL(spawner) <= 4){

		if (Memory.rooms[spawner].scoutNext === undefined) { 
			Memory.rooms[spawner].scoutNext = 0;
			scoutInterval = 1;
		}

		if (Game.time < Memory.rooms[spawner].scoutNext) { return; }
		let wantedLocalScouts = 1;
		if (getRoomPRCL(spawner) < CONTROLLER_MAX_LEVEL) {
			wantedLocalScouts = Game.rooms[spawner].findByType(STRUCTURE_SPAWN).length;
		}

		scouts = _.filter(getCreeps('scout', spawner), (creep) => !creep._memory.observe);

		if (scouts.length < wantedLocalScouts) {
			spawnScout = true;
		} else {
			globalScouts = getCreeps('scout');
			if (globalScouts.length < requestedScouts){
				spawnScout = true;
			}
		}
	} else {
		delete Memory.rooms[spawner].scoutNext;
	}
		
		

	if (spawnScout){
		Memory.rooms[spawner].scoutNext = Game.time + scoutInterval;
		myspawns[0].createCreep([MOVE], 'sct'+makeid(), {[C.ROLE]: 'scout', [C.ROOM_ORIGIN]: spawner, blacklist: {} });
		return 1;
	}

	for (let dest in Memory.scoutObservers) {
		if (!Memory.scoutObservers[dest].assignedSpawns || !Memory.scoutObservers[dest].assignedSpawns[spawner]) { continue; }
		if (!globalScouts) { globalScouts = getCreeps('scout'); }
		let observer = _.filter(globalScouts, (creep) => creep._memory.observe === dest);
		if (preSpawnCreepsCheck(observer, 50, 1) ) {
			myspawns[0].createCreep([MOVE], 'sct'+makeid(), {[C.ROLE]: 'scout', [C.ROOM_ORIGIN]: spawner, blacklist: {}, observe: dest });
			return 1;
		}
	}
}

function setDelayTimeUntilNextSpawnCheck(spawner, numberOfDelayTicks) {
	// console.log(spawner + " nothing to spawn, idling for " + numberOfDelayTicks + " ticks")
	if (getRoomCache(spawner).spawnDelay === undefined) { getRoomCache(spawner).spawnDelay = Game.time + numberOfDelayTicks; }
}

function checkDelayTimer(spawner) {
	if (getRoomCache(spawner).spawnDelay === undefined) { return 0; }
	if (getRoomCache(spawner).spawnDelay <= Game.time) {
		delete getRoomCache(spawner).spawnDelay;
		return 0;
	} else {
		return 1;
	}
}

function spawnBuilders(spawner, myspawns, energyCap){

	let constructionSites = Game.rooms[spawner].getConstuctionSites();
	let csiteCnt = constructionSites.length;

	/*
	let progressMissing = 0;
	for (let idx in constructionSites) {
		let csite = constructionSites[idx];
		progressMissing += csite.progressTotal - csite.progress;
	} */
	let requiredBuildersSites = limit(Math.ceil(csiteCnt / 5), 0, 5);

	if (globalEnergyCrysis() && csiteCnt === 0 ) { return 0; }

	let maxBuilders = 8;
	if (Memory.PraiseGCL[spawner] ) { maxBuilders = 4; }
	let moaaaarBuilders;
	let requiredBuildersEco = 0;
	let controllerLevel = getRoomPRCL(spawner);

	let wallMultiplier = Memory.rooms[spawner].wallMp || 1;
	if (Memory.rooms[spawner].mineOnly) {
		wallMultiplier = 0.25;
	}

	let totalDropped = 0;
	if (controllerLevel < 4){	// RCL 0 - 3
		let droppedEnergy =  Game.rooms[spawner].find(FIND_DROPPED_RESOURCES, {
                        filter: (resource) => {
                        return  ( //(resource.amount - resource.withdraw) >= 100 && 
							resource.resourceType == RESOURCE_ENERGY);
								 }});
		
		for (let idx = 0; idx < droppedEnergy.length; idx++) {
			totalDropped += droppedEnergy[idx].amount;
		}
	
		if ((totalDropped >= 750 || (getLowWallHp(spawner) < 10000 && getLowWallHp(spawner) > 100)) && Math.random() > 0.5  ) {
			moaaaarBuilders = true;
		}
	} else if (controllerLevel < CONTROLLER_MAX_LEVEL) { // RCL 4 - 7
		if (Memory.rooms[spawner].roomBreached) {
			if (Game.rooms[spawner].energyStatus() >= ECONOMY_LOW ) {
				requiredBuildersEco = Math.max(Game.rooms[spawner].energyStatus() - ECONOMY_LOW, 1);
			}
		} else if (getLowWallHp(spawner) < WALL_HP_SETPOINT[controllerLevel] * 0.5 * wallMultiplier){
			requiredBuildersEco = Math.max(Game.rooms[spawner].energyStatus() - ECONOMY_LOW, 1)
		} else if (getLowWallHp(spawner) < WALL_HP_SETPOINT[controllerLevel] * wallMultiplier){
			if (Game.rooms[spawner].energyStatus() >= ECONOMY_STABLE ) {
				requiredBuildersEco = Math.max(Game.rooms[spawner].energyStatus() - ECONOMY_DEVELOPING, 1)
			}
		} 
	} else if ((getLowWallHp(spawner) < WALL_HP_SETPOINT[controllerLevel] * wallMultiplier && // RCL 8
		Game.rooms[spawner].energyStatus() >= ECONOMY_RICH) ||
		(getLowWallHp(spawner) < getAvgWallHp(spawner)*0.75 &&
		Game.rooms[spawner].energyStatus() >= ECONOMY_LOW )
	){
		requiredBuildersEco = limit(Game.rooms[spawner].store(RESOURCE_ENERGY) /Game.rooms[spawner].wantedEnergyfPRCL() , 1, maxBuilders);	
		if (Game.cpu.bucket < 1500) {
			requiredBuildersEco = 0;
		} else if (getCreeps('builder').length > 20) {
			requiredBuildersEco = Math.min(1, requiredBuildersEco);
		}
	}

	if (BOT_MODE && Game.rooms[spawner].energyStatus() >= ECONOMY_SURPLUS && !PUSH_RCL_TARGETS[spawner]) {
		requiredBuildersEco = Math.max(1, requiredBuildersEco);
	}

	let requiredBuilders = Math.max(requiredBuildersEco, requiredBuildersSites);
	if (getRoomPRCL(spawner) >= 4 && Game.rooms[spawner].energyStatus() <= ECONOMY_LOW ){
		requiredBuilders = limit(requiredBuilders, 0, 1);
	}
	let builders = getCreeps('builder', spawner);

	if (Game.rooms[spawner].warEffortActive() ){
		requiredBuilders = limit(requiredBuilders, 0, 3);
	}

	if (Memory.rooms[spawner].rebuild || 
		roomIsSafeModeCd(spawner) ||
		(Memory.rooms[spawner].reinforce && Game.time < Memory.rooms[spawner].reinforce)) {
		
		if (Game.rooms[spawner].energyStatus() >= ECONOMY_DEVELOPING) {
			requiredBuilders = Math.max(4, requiredBuilders);
		} else if (Game.rooms[spawner].energyStatus() >= ECONOMY_LOW) {
			requiredBuilders = Math.max(1, requiredBuilders);
		}

		if (!BOT_MODE) {
			Game.rooms[spawner].setBoostMode(false, {[T3_BUILD]: 3000, [T3_CARRY]: 3000});
		}
	}
	

	if (Memory.rooms[spawner].nukeResponse && Game.rooms[spawner].energyStatus() > ECONOMY_LOW){
		Game.rooms[spawner].setBoostMode(false, {[T3_BUILD]: 3000, [T3_CARRY]: 3000});
		requiredBuilders = 6;
	}

	if (builders.length < requiredBuilders) {
		let parts;

		if (builders.length >= 2) {
			let lowRcl = (controllerLevel < 4 || (!Game.rooms[spawner].storage && !Game.rooms[spawner].terminal));
			let balanceWorkParts = Game.rooms[spawner].netEnergyIncome(lowRcl);
			balanceWorkParts -= Memory.rooms[spawner].spawnCostTicks || 0
	
			let supportedWorkParts = (((Game.rooms[spawner].store(RESOURCE_ENERGY) + totalDropped) / BUILD_POWER)/CREEP_LIFE_TIME * 0.8)  + balanceWorkParts
			let currentWorkParts = getBodyparts(builders, WORK) * BUILD_POWER * 0.8;
	
			let workers = getCreeps('upgrader', spawner);
			currentWorkParts += getBodyparts(workers, WORK);

			workers = getCreeps('builderUpgrader', spawner);
			currentWorkParts += getBodyparts(workers, WORK);
	
			if ((currentWorkParts + 5) > supportedWorkParts) { 
				log("want more builders, but cant support!")
				return 0; 
			}
		}
		

		
		if (controllerLevel >= 7) {
			if (Game.rooms[spawner].energyStatus() >= ECONOMY_SURPLUS || requiredBuilders > 2 || Memory.rooms[spawner].burnEnergy) { // Burn some energy
				parts = createMaxBody(energyCap, {work: 1, carry: 1, move: 1} );
			} else {
				parts = createMaxBody(limit(energyCap, 300, 2000), {work: 1, carry: 1, move: 1} );
			}
		} else if (controllerLevel >= 4) {
			let moveParts = 1;
			let energyToSpend = limit(energyCap, 300, 1500)
			parts = createMaxBody(energyToSpend, {work: 1, carry: 1, move: moveParts} );
		} else {
			let moveParts = 1;
			let energyToSpend = limit(energyCap, 300, 1500)
			if (energyCap < 400) {
				parts = createBodyUpgrader(energyCap, 50)
			} else {
				parts = createMaxBody(energyToSpend, {work: 1, carry: 1, move: moveParts} );
			}				
		}
		let creepMemory = {[C.ROLE]: 'builder', [C.ROOM_ORIGIN]: spawner};
		myspawns[0].createCreep(parts, 'bl'+makeid(), creepMemory);
		return 1;
	}

	
	if (moaaaarBuilders && csiteCnt > 0 && (myspawns[0]._cache.spawnedMoar === undefined || Game.time > myspawns[0]._cache.spawnedMoar)) {
		

		if (builders.length >= 2) {
			let lowRcl = (controllerLevel < 4 || (!Game.rooms[spawner].storage && !Game.rooms[spawner].terminal));
			let balanceWorkParts = Game.rooms[spawner].netEnergyIncome(lowRcl);
			balanceWorkParts -= Memory.rooms[spawner].spawnCostTicks || 0
	
			let supportedWorkParts = (((Game.rooms[spawner].store(RESOURCE_ENERGY) + totalDropped) / BUILD_POWER)/CREEP_LIFE_TIME * 0.8)  + balanceWorkParts
			let currentWorkParts = getBodyparts(builders, WORK) * BUILD_POWER * 0.8;
	
			let workers = getCreeps('upgrader', spawner);
			currentWorkParts += getBodyparts(workers, WORK);

			workers = getCreeps('builderUpgrader', spawner);
			currentWorkParts += getBodyparts(workers, WORK);
	
			if ((currentWorkParts + 5) > supportedWorkParts) { 
				log("want moaar builders, but cant support!")
				return 0;
			}
		}

	//	let helpers = getCreeps('builder', spawner);
	//	if (helpers.length < 7) {
			myspawns[0]._cache.spawnedMoar = Game.time + 27;

			let parts
			if (getRoomRCL(spawner) < 3) {
				parts = createBodyUpgrader(energyCap, 50)
			} else {
				parts = createMaxBody(energyCap, {carry: 1, move: 1, work: 1} );
			}
			
			let creepMemory = {[C.ROLE]: 'builder', [C.ROOM_ORIGIN]: spawner};
			myspawns[0].createCreep(parts, 'blM'+makeid(), creepMemory);
			/*
			myspawns[0].createCreep(parts, 'hlp'+makeid(), {[C.ROLE]: 'helper', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: spawner });
			*/
			return 1;
	//	}
	}

	return 0;
}

function checkCreepsForMaxSize(body, creeps){
	let creepsNotPassed = [];
	for (let idx in creeps) {
		let creep = creeps[idx];

		if (creep.body.length < body.length){
			creepsNotPassed.push(creep);
		}
	}
	return creepsNotPassed;
}

function checkAndRemoveUnfit(body, creeps) {	
	let unwantedCreeps = checkCreepsForMaxSize(body, creeps);
//	console.log("checking for unwanted creeps, found " + unwantedCreeps.length);
	if (unwantedCreeps.length > 0) {
		unwantedCreeps[0].recycleOrSuicide();
		console.log("replacing unfit creeps! "+unwantedCreeps[0] );
		return 1;
	}
	return 0;
}

function spawnUpgraders(spawner, myspawns, energyCap) {

	let requiredUpgraders = 1;
	let parts = [];
	let upgraders = getCreeps('upgrader', spawner);

	let confirmedUpgraders = upgraders.length;
//	log("spawn upgraders! " +spawner)
//	if (earlyCheck && confirmedUpgraders > 0 && !PUSH_RCL_TARGETS[spawner]) { return 0; }

	let controller = Game.rooms[spawner].controller;
	if (getRoomRCL(spawner) < 8 && !PRAISE_GCL_ROOMS[spawner]) {
		if(!controller._maxUpgraders) {
			let anchor = Game.rooms[spawner].findByType(STRUCTURE_SPAWN);
			controller._maxUpgraders = Math.max(5, controller.pos.countUpgraderFormation(anchor[0].pos ));
		}
		if (confirmedUpgraders >= controller._maxUpgraders) { return 0; }
	}
	
	
	/*
	let confirmedUpgraders = 0;
	for (let idx in upgraders) {
		let creep = upgraders[idx];
		if (creep.ticksToLive > creep.body.length * CREEP_SPAWN_TIME) {
			confirmedUpgraders++;
		}
	}*/

	if (PRAISE_GCL_ROOMS[spawner]) {
		let cranes = getCreeps('craneGCL', spawner); 	
		let partsCraneGCL = createMaxBody(energyCap, {carry: 20, move: 1} );
		if (cranes.length === 0 || checkAndRemoveUnfit(partsCraneGCL, cranes)) {
			myspawns[0].createCreep(partsCraneGCL, 'cG'+makeid(), {[C.ROLE]: 'craneGCL', [C.ROOM_ORIGIN]: spawner});
			return 1;
		}

		let crane = getCreeps('crane', spawner);
		let partsCrane = createMaxBody(energyCap, {carry: 10});
		if (cranes.length === 0 || checkAndRemoveUnfit(partsCrane, crane)) {
			let dirToCrane = myspawns[0].pos.getDirectionTo(Game.rooms[spawner].getCranePos() )
			let allowedDir = [];
			allowedDir.push(dirToCrane);
			myspawns[0].createCreep(partsCrane, 'c'+makeid(), {[C.ROLE]: 'crane', [C.ROOM_ORIGIN]: spawner}, allowedDir);			
			return 1;
		}

		requiredUpgraders = 8;
		if (getRoomPRCL(spawner) >= 6) { requiredUpgraders = 12; }
		
		if (confirmedUpgraders < requiredUpgraders) {
			parts = createMaxBody(energyCap, {move: 1, carry: 1, work: 8} );
			myspawns[0].createCreep(parts, 'upG'+makeid(), {[C.ROLE]: 'upgrader', [C.ROOM_ORIGIN]: spawner});
			return 1;
		}
		else if (confirmedUpgraders === requiredUpgraders) {
			parts = createMaxBody(energyCap, {move: 1, carry: 1, work: 8} );
			if (checkAndRemoveUnfit(parts, upgraders)) {
				myspawns[0].createCreep(parts, 'upG'+makeid(), {[C.ROLE]: 'upgrader', [C.ROOM_ORIGIN]: spawner});
				return 1;
			}
		}
		return 0;
	}


	let randomRatio = 0.0;
	let totalDropped = 0;
	let preSpawn
	let controllerLevel = Game.rooms[spawner].controller.level;

	if (Game.rooms[spawner].energyStatus() <= ECONOMY_LOW ||	
		Memory.rooms[spawner].nukeResponse||
		(getRoomPRCL(spawner) < 2 && Game.rooms[spawner].getControllerContainer().length <= 0) ||
		globalEnergyCrysis() ||
		(controllerLevel === 7 && Object.keys(PUSH_RCL_TARGETS).length > 0 && !PUSH_RCL_TARGETS[spawner] && Game.rooms[spawner].energyStatus() < ECONOMY_RICH)  ||
		(controllerLevel >= 6 && Memory.rooms[spawner].mineOnly) ||
		(Memory.rooms[spawner].newRCL && Game.rooms[spawner].energyStatus() < ECONOMY_SURPLUS) ||
		(Memory.rooms[spawner].reinforce && getLowWallHp(spawner) < WALL_HP_SETPOINT[controllerLevel] && controllerLevel < 8 && controllerLevel > 5) || 
		(Game.rooms[spawner].warEffortActive() && Game.rooms[spawner].energyStatus() < ECONOMY_SURPLUS) ||
		Memory.rooms[spawner].isAttacked
	) {
		if (confirmedUpgraders < 1 && controllerNeedsUpgrade(Game.rooms[spawner].controller)) {
			parts = createMaxBody(300, {move: 1, carry: 1, work: 1} );
		}
	} else if (Game.rooms[spawner].controller.level >= CONTROLLER_MAX_LEVEL) {		

		if (Game.rooms[spawner].energyStatus() < ECONOMY_SURPLUS && (Memory.restrictClaims || HALT_GCL_PRAISE)) {
			if (confirmedUpgraders < 1 && controllerNeedsUpgrade(Game.rooms[spawner].controller)) {
				parts = createMaxBody(300, {move: 1, carry: 1, work: 1} );
			}
		} else 	if (preSpawnCreepsCheck(upgraders, 50, 1) ) {
			
			if (BOT_MODE) {
				parts = createBody(energyCap, {move: 4, carry: 2, work: CONTROLLER_MAX_UPGRADE_PER_TICK} );
			} else {
				// Save some withdraw intents for mmo
				if (Game.rooms[spawner].energyStatus() >= ECONOMY_RICH) {
					parts = createBody(energyCap, {move: 4, carry: 15, work: CONTROLLER_MAX_UPGRADE_PER_TICK} );
				}
			}
		}
	} else if (Memory.rooms[spawner].upWorking >= 95){

		let lowRcl = (controllerLevel < 4 || (!Game.rooms[spawner].storage && !Game.rooms[spawner].terminal));

		let balanceWorkParts = Game.rooms[spawner].netEnergyIncome(lowRcl) / UPGRADE_CONTROLLER_POWER;	
		if (PUSH_RCL_TARGETS[spawner] &&  Game.rooms[spawner].terminal) {
			balanceWorkParts = Math.max(balanceWorkParts * 1.5, 100);
			log(spawner +" increasing upgrade parts, pushing rcl! wanted parts " + balanceWorkParts )
		} else if ((!PUSH_RCL_TARGETS[spawner] && Object.keys(PUSH_RCL_TARGETS).length > 0 && Game.rooms[spawner].terminal) || Memory.rooms[spawner].newRCL){
			balanceWorkParts *= 0.75;
		}

		balanceWorkParts -= Memory.rooms[spawner].spawnCostTicks || 0

	//	balanceWorkParts = Math.ceil(balanceWorkParts / UPGRADE_CONTROLLER_POWER);

		let energyToSpend
		if (ENABLE_SPAWN_EXTENSIONS) {
			energyToSpend = getSpawnerBlockEnergy(spawner, false);
		} else {
			energyToSpend = limit(energyCap, 300, 2000);
			energyToSpend = energyCap;
		}

		const priceIncrement = 600;	// cost for base body
		const workPartsInBaseBody = 4;
		let fullSizePartCount = Math.min(Math.floor(energyToSpend / priceIncrement) + workPartsInBaseBody, 20);
		
		let wantedUpgradeParts = 0;
		let currentWorkParts = 0;
		let storedEnergy = 0
		

		if (lowRcl || Memory.rooms[spawner].reinforce || Memory.rooms[spawner].newRCL) {

			let workers = getCreeps('builder', spawner);
			currentWorkParts += getBodyparts(workers, WORK) * BUILD_POWER * 0.6;

			workers = getCreeps('helper', spawner);
			currentWorkParts += getBodyparts(workers, WORK) * BUILD_POWER * 0.4;

			workers = getCreeps('builderUpgrader', spawner);
			currentWorkParts += getBodyparts(workers, WORK) * BUILD_POWER * 0.5;

			workers = getCreeps('startupMiner', spawner);
			currentWorkParts += getBodyparts(workers, WORK) * 0.5;

			let droppedEnergy =  Game.rooms[spawner].find(FIND_DROPPED_RESOURCES, {
				filter: (resource) => {
				return  (
					resource.resourceType == RESOURCE_ENERGY);
						 }});
			
			for (let idx = 0; idx < droppedEnergy.length; idx++) {
				totalDropped += droppedEnergy[idx].amount;
			}

			let controllerContainer = Game.rooms[spawner].getControllerContainer()
			if (controllerContainer.length > 0) {
				storedEnergy = controllerContainer[0].store[RESOURCE_ENERGY]
			}		

			let adjustedParts = Math.floor(totalDropped / 125);

			wantedUpgradeParts = balanceWorkParts + adjustedParts;

			if (storedEnergy <= 0 && totalDropped <= 0) {
				wantedUpgradeParts = 0;
			}

			log(spawner + " wantedUpgradeParts upgrader parts" + wantedUpgradeParts.toFixed(0) + " adjustedParts for dropped energy " + adjustedParts + " current other work parts " + currentWorkParts)
		} else {
			let balanceEnergy = Game.rooms[spawner].wantedEnergyfPRCL();

			let minimumEnergy = 35000;
			if (controllerLevel < 5) {
				minimumEnergy = 10000;
			}

			if (Game.rooms[spawner].storage) {
				storedEnergy = Game.rooms[spawner].storage.store[RESOURCE_ENERGY];
			}
			
			wantedUpgradeParts = limit(((Game.rooms[spawner].store(RESOURCE_ENERGY) - minimumEnergy) / balanceEnergy) * balanceWorkParts, 1, 200);
		}

		currentWorkParts += getBodyparts(upgraders, WORK);
		let wantToSpawnParts = wantedUpgradeParts - currentWorkParts;

		log(spawner + " wanted upgrade parts " + wantedUpgradeParts.toFixed(0) + " out of balance parts " + currentWorkParts +"/ " + balanceWorkParts)
		
		
	//	log(spawner + " wanted upgrader parts is " + wantToSpawnParts + "/" + fullSizePartCount + " has energy " + Game.rooms[spawner].store(RESOURCE_ENERGY))
		
		if (wantToSpawnParts > fullSizePartCount) {
			randomRatio = currentWorkParts / wantedUpgradeParts;
			randomRatio = 0

			parts = createBodyUpgrader(energyToSpend, 50)
		//	parts = createMaxBody(energyToSpend, {move: 1, carry: 1, work: 4} );
		} else if (currentWorkParts < fullSizePartCount && Game.rooms[spawner].controller.level >= 5 && wantToSpawnParts >= fullSizePartCount * 0.5) {
		//	energyToSpend = Math.min((wantToSpawnParts / 4) * priceIncrement, energyToSpend);
		//	parts = createMaxBody(energyToSpend, {move: 1, carry: 1, work: 4} );
			parts = createBodyUpgrader(energyToSpend, wantToSpawnParts)
		} 
		
		if (storedEnergy && (currentWorkParts - wantedUpgradeParts < fullSizePartCount*0.5) && preSpawnCreepsCheck(upgraders, fullSizePartCount*3, upgraders.length) ) {
			preSpawn = true;
			parts = createBodyUpgrader(energyToSpend, 50);
		}
		
		
	//	log(spawner + " currentWorkParts " + currentWorkParts +"/" +wantedUpgradeParts + " randm " + randomRatio)
	}

	if (confirmedUpgraders === 0 && parts.length === 0 && controllerNeedsUpgrade(Game.rooms[spawner].controller, true)) {
		parts = createMaxBody(300, {move: 1, carry: 1, work: 1} );
	}


	// || wantedUpgradeParts >= currentWorkParts && preSpawnCreepsCheck(upgraders, 15, )
	
//	if ((parts.length > 0 && Math.random() > randomRatio) || preSpawn){
	if (parts.length > 0 || preSpawn){		

		let bestSpawn = bestSpawnForDest(myspawns, Game.rooms[spawner].controller.pos) // What if boosting is first action?

		bestSpawn.createCreep(parts, 'up'+makeid(), {[C.ROLE]: 'upgrader', [C.ROOM_ORIGIN]: spawner});
		return 1;
	} else {
		return 0; 
	}
}

function setDefaultSpawningDirections(spawn, forceRefresh=false){
	let spawner = spawn.room.name
	if (ENABLE_SPAWN_EXTENSIONS) {
		let directions = spawn.getDefaultDirections(forceRefresh)
		if (directions) {

			if(directions.length !== spawn.spawning.directions.length) {
				spawn.spawning.setDirections(directions)
			}

			
		} else {
			let allDirections = [1, 2, 3, 4, 5, 6, 7, 8]
			spawn.spawning.setDirections(allDirections)
		}
		
	} else {
		// old logic 
		if (Memory.rooms[spawner].delayCrane) { return 0; }
		if (!Game.rooms[spawner].terminal && !Game.rooms[spawner].hasStoreLink()) { return 0; }
	
		let allDirections = [1, 2, 3, 4, 5, 6, 7, 8]
		let dirToCrane = spawn.pos.getDirectionTo(spawn.room.getCranePos() )
		
		if (dirToCrane) { 
			let crane = spawn.pos.getPositionAtDirection(dirToCrane).lookForCreep()
			if (!crane || crane.ticksToLive < spawn.spawning.remainingTime) {
				allDirections.splice(dirToCrane-1, 1);
				spawn.spawning.setDirections(allDirections)
			}
		}
	}	
}

function spawnFillerCranes(spawner, myspawns, energyCap) {
	if (ENABLE_SPAWN_EXTENSIONS) {
		let fillerPos = Game.rooms[spawner].getSpawnFillerPos();
		let fillers = getCreeps('spawnFillers', spawner);

		let spawnAll = false;
		let neededFillers = 4;
		if (getRoomPRCL(spawner) >= 4) {
			spawnAll = true;
		} else if (Game.rooms[spawner].controller.level < 3) {
			neededFillers = 2;
		} else if (Game.rooms[spawner].controller.level < 4) {
			neededFillers = 3;
		}
			

		let countedExt = {};
		for (let idx in fillerPos) {
			if (idx >= neededFillers) { break; }
			let currentFillerPos = fillerPos[idx];

			if (!spawnAll) {
				let ext = currentFillerPos.getSpawnFillerExtensions()
				let newExtensions = 0;
				for (let idxExt in ext){
					if (!countedExt[ext[idxExt].id]) {
						countedExt[ext[idxExt].id] = {};
						newExtensions++
					}
				}
				if (newExtensions === 0 && idx > 0) { continue; }

				let containerInRange = false;
				let containers = Game.rooms[spawner].getSpawnContainers()
				for (let idx2 in containers) {
					if (currentFillerPos.isNearTo(containers[idx2])) {
						containerInRange = true; 
						break;
					}
				}
				if (!containerInRange) { continue; }

			}

			let fillPosC = posCompress(currentFillerPos);
			let currentFiller = _.filter(fillers, (creep) => creep._memory.fillPos === fillPosC);
			
			if (refreshSpawnCrane(spawner, myspawns, energyCap, currentFiller[0], currentFillerPos) ) {
				return 1;
			}

			if (preSpawnCreepsCheck(currentFiller, 10, 1) ){
				let {spawn, directions} = selectSpawnForCrane(myspawns, currentFillerPos)
			
				let parts = createBody(energyCap-BODYPART_COST[MOVE], { carry: EXTENSION_ENERGY_CAPACITY[Game.rooms[spawner].controller.level] / CARRY_CAPACITY});

				if (!directions) {
					parts.push(MOVE);
				}
				spawn.createCreep(parts, 'c'+makeid(), {[C.ROLE]: 'spawnFillers', [C.ROOM_ORIGIN]: spawner, fillPos: fillPosC }, directions);
			
				return 1;
			}
		}
	}
}

function craneHasOptimalBody(currentFiller, spawner, energyCap) {
	let parts = createBody(energyCap, { carry: EXTENSION_ENERGY_CAPACITY[Game.rooms[spawner].controller.level] / CARRY_CAPACITY});
	if (currentFiller.body.length !== parts.length) { 
		currentFiller._memory.unfit = true;
		return false; 
	}

	for (let idx in parts) {
		if (parts[idx] !== currentFiller.body[idx].type) { 
			currentFiller._memory.unfit = true;
			return false; 
		}
	}
	return true;
}

function storeCraneHasOptimalBody(currentFiller, spawner, energyCap) {
	let parts = createStoreCraneParts(spawner, energyCap)
	if (currentFiller.body.length !== parts.length) { 
		currentFiller._memory.unfit = 1;
		return false; 
	}

	for (let idx in parts) {
		if (parts[idx] !== currentFiller.body[idx].type) { 
			currentFiller._memory.unfit = 1;
			return false; 
		}
	}
	return true;
}

function refreshSpawnCrane(spawner, myspawns, energyCap, currentFiller, currentFillerPos) {
	if (!currentFiller || currentFiller._memory[C.REPLACED] || currentFiller._memory.unfit || (currentFiller.ticksToLive > 350 && !currentFiller._cache.renewing)) { return 0; }

	if (currentFiller._cache.renewing && currentFiller.ticksToLive > 1250) {
		delete currentFiller._cache.renewing
		return false;		
	}

	let {spawn, directions} = selectSpawnForCrane(myspawns, currentFillerPos)
	if (directions && (currentFiller._cache.renewing || craneHasOptimalBody(currentFiller, spawner, energyCap))) {
		spawn.renewCreep(currentFiller);		
		currentFiller._cache.renewing = true;
		spawn.spawningTs = Game.time;
		return true;
	}
}

function refreshStoreCrane(spawner, myspawns, energyCap, currentFiller) {
	
	if (!currentFiller || currentFiller._memory[C.REPLACED] || currentFiller.ticksToLive > 350) { return 0; }
	let cranePos = Game.rooms[spawner].getCranePos();
			
	let {spawn, directions} = selectSpawnForCrane(myspawns, cranePos)
	if (directions && storeCraneHasOptimalBody(currentFiller, spawner, energyCap)) {
		spawn.renewCreep(currentFiller);
		spawn.spawningTs = Game.time;
		return true;
	}
}

function createStoreCraneParts(spawner, energyCap) {
	let parts = []
	if (PRAISE_GCL_ROOMS[spawner] || (Memory.rooms[spawner].mineOnly && Game.rooms[spawner].terminal)) {
		parts = createMaxBody(energyCap, {carry: 10});
	} else {
		if (BOT_MODE) {
			if (PUSH_RCL_TARGETS[spawner] || isCpuLimited() >= CPU_SAVING_MEDIUM){
				if (Game.rooms[spawner].terminal) {
					parts = createBody(energyCap, {carry: 16});
				} else {
					parts = createBody(energyCap, {carry: 4});
				}
			} else {
				parts = createBody(energyCap, {carry: 6});
			}
		} else {
			parts = createBody(energyCap, {carry: 16});
		}
	}
	return parts;
}

function spawnCrane(spawner, myspawns, energyCap) {

	if (Game.rooms[spawner].terminal || Game.rooms[spawner].hasStoreLink()) {
		if (Memory.rooms[spawner].delayCrane) { return 0; }
		let crane = getCreeps('crane', spawner);
		
		if (isCpuLimited() < CPU_SAVING_HIGH && refreshStoreCrane(spawner, myspawns, energyCap, crane[0]) ) {
			return 1;
		}

		let preSpawn = preSpawnCreepsCheck(crane, 5, 1)
		if (preSpawn){
			let parts = createStoreCraneParts(spawner, energyCap-BODYPART_COST[MOVE]);
			let cranePos = Game.rooms[spawner].getCranePos();
			
			let {spawn, directions} = selectSpawnForCrane(myspawns, cranePos)
			if (!directions) {
				if (Game.rooms[spawner].controller.level === CONTROLLER_MAX_LEVEL) {

					if (preSpawn.isCreep) {
						delete preSpawn._memory[C.REPLACED];
					}
					return 0;
				}
				parts.push(MOVE);
			}

			spawn.createCreep(parts, 'c'+makeid(), {[C.ROLE]: 'crane', [C.ROOM_ORIGIN]: spawner }, directions);			
			return 1;
		}
	}
}

function bestSpawnForDest(myspawns, dest = undefined) {

	if (!dest) { return myspawns[0] }
	let bestSpawn = myspawns[0];
	let bestScore = -999;

	for (let idx in myspawns) {

		let score = 0;
		let spawn = myspawns[idx]

		if (dest) {
			let range = spawn.pos.getRangeTo(dest);
			score += 50 - range;
		}

		if (spawn.effects) {
			let opSpawn = spawn.getEffect(PWR_OPERATE_SPAWN)
			if (opSpawn) {
				score += opSpawn.level * 100;
			}
		}

		if (score > bestScore) {
			bestSpawn = spawn;
			bestScore = score;
		}
	}
	return bestSpawn;

}

function selectSpawnForCrane(myspawns, cranePos) {
	if (cranePos._cache.spawn && Game.time === cranePos._cache.spawnTs ) {
		return { spawn: Game.getObjectById(cranePos._cache.spawn), directions: cranePos._cache.spawnDir }
	}

	let bestSpawn;
	let bestRange = 99;
	let directions;

	for (let idx in myspawns) {

		let range = myspawns[idx].pos.getRangeTo(cranePos)
		if (range < bestRange) {
			bestSpawn = myspawns[idx];
			bestRange = range;
			if (range === 1) {
				directions = [];
				directions.push(bestSpawn.pos.getDirectionTo(cranePos))
				break; 
			}
		}
	}

	cranePos._cache.spawn = bestSpawn.id;
	cranePos._cache.spawnDir = directions;
	cranePos._cache.spawnTs = Game.time;

	return { spawn: bestSpawn, directions: directions }
}


let spawnLabRats = function(spawner, myspawns) {

	if (Game.rooms[spawner].hasLabs() >= 3){

		if (!BOT_MODE || globalEnergyCrysis() || Game.rooms[spawner].energyStatus() <= ECONOMY_LOW) {
			// skip labrats
			return 0;
		}

		if (!Memory.rooms[spawner][R.LABS_PRODUCING] || REACTION_TIME[Memory.rooms[spawner][R.LABS_PRODUCING]] < 12) {
			return 0;
		}

		if (Memory.combatBoost[spawner] && Memory.combatBoost[spawner].boosts) {
			let boosterLabs = Object.keys(Memory.combatBoost[spawner].boosts).length;
			let remainderLabs = Game.rooms[spawner].hasLabs() - boosterLabs;
			if (remainderLabs < 3) { 
				return 0; 
			}
		}
		
		let labRats = getCreeps('labRat', spawner);
		
		
		if (BOT_MODE) {
			labRats = _.filter(labRats, (creep) => !creep._memory.micro);		
		} 
		
		let parts;
		if (preSpawnCreepsCheck(labRats, 30, 1) ){
			parts = [CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE];
			myspawns[0].createCreep(parts, 'lR'+makeid(), {[C.ROLE]: 'labRat', [C.ROOM_ORIGIN]: spawner });
			return 1;
		}
		
		
		let labRatsMicro = _.filter(getCreeps('labRat', spawner), (creep) => creep._memory.micro == 1);			
		if (preSpawnCreepsCheck(labRatsMicro, 30, 1) ){	
			parts = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE];
			myspawns[0].createCreep(parts, 'labRat'+makeid(), {[C.ROLE]: 'labRat', micro: 1, [C.ROOM_ORIGIN]: spawner });
			return 1;
		}

	}	
};


function getRampartAttackStrength(hostiles) {
	let dmg = 0;
	if (!hostiles) { return dmg; }
	dmg += hostiles.attackDamage;
	dmg += hostiles.dismantlePower;
	dmg += hostiles.rangedAttackDamage * 3; // RMA

	return dmg;
}

global.getAttackerStrength = function(energyLimit, attackBoostLevel, moveBoostLevel){
	let boostEffect = 1 + attackBoostLevel;
	let wantedAttacks = 1 + moveBoostLevel;
	let baseBody = {[ATTACK]: wantedAttacks,  [MOVE]: 1}
	let costBase = (baseBody[ATTACK] * BODYPART_COST[ATTACK]) + BODYPART_COST[MOVE];
//	console.log("costBase " + baseBody[ATTACK])
	let affordableRatios = Math.floor(energyLimit / costBase);
	let maxRatiosParts = 50/(baseBody[ATTACK] + baseBody[MOVE])
	let usableRatio = Math.min(affordableRatios, maxRatiosParts)
	let attackParts = usableRatio * baseBody[ATTACK]
	return attackParts * ATTACK_POWER * boostEffect;
}


global.getRepairStrengthLevel = function(energyLimit, workBoostLevel, moveBoostLevel){
	let boostEffect = 1 + workBoostLevel;
	let wantedWorks = 2 + (moveBoostLevel*2) - 1;
	let baseBody = {[WORK]: wantedWorks, [CARRY]: 1, [MOVE]: 2}
	let costBase = (baseBody[WORK] * BODYPART_COST[WORK]) + BODYPART_COST[CARRY] + (baseBody[MOVE] * BODYPART_COST[MOVE]);
//	console.log("costBase " + baseBody[ATTACK])
	let affordableRatios = Math.floor(energyLimit / costBase);
	let maxRatiosParts = 50/(baseBody[WORK] + baseBody[CARRY] + baseBody[MOVE])
	let usableRatio = Math.min(affordableRatios, maxRatiosParts);
	let WorkParts = usableRatio * baseBody[WORK]
//	console.log("wortk parts " + WorkParts + " with level " +workBoostLevel)
	return WorkParts * REPAIR_POWER * boostEffect;
}


function getRepairStrength(energyLimit, boostsAvailable){
	let boostEffect = 1;
	let workParts = limit(energyLimit / 200, 1, 25);
	if (boostsAvailable) {
		workParts = limit(energyLimit / 200, 1, 40);
		boostEffect = 3;
	}
	return workParts * REPAIR_POWER * boostEffect;
}
    
function defendMyRoomsAgainstPlayer(spawner, myspawns, price) {


	if (Memory.roomAttacked !== undefined) {
		for (let room in Memory.roomAttacked) {
			if (roomIsSafeModed(room) > 850) { continue; }
			let parts = [];
			let roomObj = Memory.rooms[room];
			if (room === spawner) {
				if (Memory.rooms[room] && getWallCount(room) === 0) { continue; }
				orderCombatBoost(room);
				let enemySquads = Game.rooms[spawner].getEnemySquads();
				let requiredDefenders = 0;
				let requiredDefendersSqaudBased = 0;
				let requiredDefendersPowerBased = 0;
				let addDefender = 0;
				let requiredRepairers = 0;

				let requiredRA = 0;
				

				let moveBoost = Game.rooms[spawner].boostsAvailable( [T3_MOVE] );
				let defenderBoost = Game.rooms[spawner].boostsAvailable( [T3_ATTACK] );
			//	let defenderRangerBoost = Game.rooms[spawner].boostsAvailable( [T3_RANGED_ATTACK] );
				let repairerBoost = Game.rooms[spawner].boostsAvailable( [T3_BUILD] );

				let attackBoostLevel = 0;
				let moveBoostLevel = 0;
				let repairBoostLevel = 0;
				if (Game.rooms[spawner].hasLabs() >= 3) {
					attackBoostLevel = empireHasBoostsLevel({[ATTACK]: 5000})
					moveBoostLevel = empireHasBoostsLevel({[MOVE]: 5000})
					repairBoostLevel = empireHasBoostsLevel({[REPAIR]: 5000})
				}
				
			
				delete Memory.roomAttacked[room].myDefenderDmg;
				delete Memory.roomAttacked[room].requiredRA;

				let wantBoost;
				if (roomObj.hostiles) {
					// REQUIRED RAMPART DEFENDERS
					if (roomObj.hostiles && roomObj.hostiles.power) {
						let enemyStrength = roomObj.hostiles.power.strength;

						let towers = Game.rooms[spawner].findByType(STRUCTURE_TOWER).length

						let minimumTowerDmg = towers * 150;
					//	let minimumTowerHeal = towers * 100;
						let neededRa;
						
						if (roomObj.hostiles.power.healPower <= minimumTowerDmg * 1.3 ) {
							log("small attackers detected! healpower " +roomObj.hostiles.power.healPower + " / " + minimumTowerDmg )
							// Use RA to chase
							let raStrength = getAvailableRaStrength(spawner, 1);
							if (raStrength && raStrength.power) {
								let neededHeal = Math.max(1, Math.ceil((roomObj.hostiles.power.rangedAttackDamage + roomObj.hostiles.power.attackDamage) / raStrength.power.healPower))
								neededRa = Math.max(neededHeal, 1, Math.ceil((roomObj.hostiles.power.healPower) / raStrength.power.rangedAttackDamage))
								if (neededRa <= 10) {
									requiredRA = neededRa;
									Memory.roomAttacked[room].requiredRA = neededRa;
								}
								log("small attackers detected! healpower " +roomObj.hostiles.power.healPower + " / " + minimumTowerDmg + " requesting ra's " + requiredRA + " / " + neededRa)
							}
						}

						if (!neededRa) {
							// Standard rampart defenders
					
							let unbostedDefenderDmg = getAttackerStrength(price, 0, 0);

							if (enemyStrength > unbostedDefenderDmg*5) {
								wantBoost = true;
								requiredDefendersSqaudBased = Math.max(enemySquads.length, 1);
								addDefender += 1;
							} else if (enemyStrength > unbostedDefenderDmg*3) {
								wantBoost = true;
								requiredDefendersSqaudBased = Math.max(enemySquads.length, 1);
								if (defenderBoost) {
									addDefender += 1;
								} else {
									addDefender += 2;
								}
								moveBoost = false;
							} else if (enemyStrength > unbostedDefenderDmg) {
								requiredDefendersSqaudBased = Math.max(enemySquads.length, 1);
								addDefender += 2;
								defenderBoost = false;
								repairerBoost = false;
							}

							let tempDefenders = requiredDefendersSqaudBased + addDefender;
							// ADD BASED ON DMG
							// UNBOOSTED 25 PART DEFENDER = 750 damage
							// BOOSTED 25 PART DEFENDER = 3000
							// BOOSTED 40 PART DEFENDER = 4800

							let myDefenderDmg = unbostedDefenderDmg;
							if (wantBoost && (defenderBoost || moveBoost)) {
								myDefenderDmg = getAttackerStrength(price, attackBoostLevel, moveBoostLevel)
							}

							Memory.roomAttacked[room].myDefenderDmg = myDefenderDmg;

							let tempMyDmg = tempDefenders * myDefenderDmg;
							if (tempMyDmg < roomObj.hostiles.power.defensive) {
								requiredDefendersPowerBased = Math.ceil((roomObj.hostiles.power.defensive - tempMyDmg) / myDefenderDmg);
							}
						}

						
						// REQUIRED REPAIRERES
						let repairPower = getRepairStrength(price, repairerBoost);
						let repairPowerLevel = getRepairStrengthLevel(price, repairBoostLevel, moveBoostLevel);

						let enemyRampartDmg = getRampartAttackStrength(roomObj.hostiles.power) 
						console.log("rampart dmg " + enemyRampartDmg + " repair " + repairPower + " boosted repair "+repairPowerLevel)
						
						let controllerLevel = getRoomPRCL(spawner);
						let lowWallHp = getLowWallHp(spawner) || 1;
						let ticksToBreach = lowWallHp / (enemyRampartDmg || 1)

						if (lowWallHp < WALL_HP_SETPOINT[controllerLevel] * 2 || ticksToBreach < 5000 ) {
							requiredRepairers = Math.ceil(enemyRampartDmg / repairPower) + 2;
						}
						
					}
				} else {	// PRESPAWN 
					if (Game.rooms[spawner].energyStatus() >= ECONOMY_LOW ) {
						requiredRepairers = 1;
						addDefender = 1;

						if (getRoomPRCL(spawner) >= 7 && Game.rooms[spawner].energyStatus() >= ECONOMY_DEVELOPING ) {
							requiredRepairers = 3;
							addDefender = 2;
						}
					}
				}

				

				requiredDefenders = requiredDefendersSqaudBased + requiredDefendersPowerBased + addDefender;
				Memory.roomAttacked[room].requiredDefenders = requiredDefenders;
				
				let applyBoostsDefender = {};
				let applyBoostsRepairer = {};
				let boostRequest = {};

			//	log("want to spawn defenders " + requiredDefenders + " and reparis " + requiredRepairers)
				if (wantBoost && requiredDefenders > 0 || requiredRepairers > 0 ) {

					let boost = getBoostAtLevel(MOVE, moveBoostLevel);
					if (boost) {
						boostRequest[boost] = Math.min(600 * requiredDefenders, 3000);
						applyBoostsDefender[boost] = {};
						applyBoostsRepairer[boost] = {};
						restockRes(spawner, undefined, boost, boostRequest[boost]);
					}

					boost = getBoostAtLevel(ATTACK, attackBoostLevel);
					if (boost) {
						boostRequest[boost] = Math.min(1200 * requiredDefenders, 3000);
						applyBoostsDefender[boost] = {};
						restockRes(spawner, undefined, boost, boostRequest[boost]);
					}

					boost = getBoostAtLevel(REPAIR, repairBoostLevel);
					if (boost) {
						boostRequest[boost] = 900;
						applyBoostsRepairer[boost] = {};
						restockRes(spawner, undefined, boost, boostRequest[boost]);
					}				

					Game.rooms[spawner].setBoostMode(true, boostRequest);
						
				}

				log(spawner + " required defenders " + requiredDefenders + " reuired repairers " + requiredRepairers + " under attack by " +roomObj.isPlayer );
				let defenders = [];
				if (getRoomPRCL(spawner) < 7) {
					defenders = _.filter(getCreeps('defender'), (creep) => creep.room.name == spawner);
				} else {
					defenders = getCreeps('defender', spawner);
				}
				
			//	let healers = _.filter(getCreeps('healer'), (creep) => creep._memory[C.ROOM_TARGET] == room);
			//	let requiredHealers = 0;				
				let repairers = _.filter(getCreeps('builder', spawner), (creep) => creep._memory.repairGuy == true);

				let missingRepairerRatio = repairers.length / requiredRepairers || 0;
				let missingDefenderRatio = defenders.length / requiredDefenders || 0;

				log("missingRepairerRatio " + missingRepairerRatio + " missingDefenderRatio " + requiredDefenders)
				// SPAWN REPAIRERS
				if (repairers.length < requiredRepairers && 
					(!requiredDefenders || missingRepairerRatio < missingDefenderRatio) &&
					(repairers.length === 0 && Game.rooms[spawner].store(RESOURCE_ENERGY) > 2500 || (!globalEnergyCrysis() && Game.rooms[spawner].terminal)) 
				) {										
					parts = createMaxBody(price, {work: 1, carry: 1, move: 1 });
					myspawns[0].createCreep(parts, 'rG'+makeid(),
						{[C.ROLE]: 'builder', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, repairGuy: true, appBoosts: applyBoostsRepairer  });				
					return 1;
				}

				// SPAWN DEFENDERS
				if (defenders.length < requiredDefenders) {

					
					if (moveBoostLevel & wantBoost) {
						let wantedAttacks = 1 + moveBoostLevel;
						parts = createMaxBody(price, {attack: wantedAttacks, move: 1})					
					} else {
						parts = createMaxBody(price, {attack: 1, move: 1});
					}
					let squadIndex = getDefenceSquadIndex(defenders);
					let result = myspawns[0].createCreep(parts, 'd'+makeid(), {[C.ROLE]: 'defender', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room,
							squadIndex : squadIndex, boost: attackBoostLevel & wantBoost, appBoosts: applyBoostsDefender });
					
					if (result === OK) {
						console.log(spawner + ' Spawning new room defender: target room: ' +room +' under attack by '); // +Memory.rooms[room].hostiles.player);
					} else {
						log(spawner + " error " + result + " spawning new room defender with parts " + JSON.stringify(parts))		
					}
					return 1;
				}

				// SPAWN RANGED ATTACKERS
				let rangedAttackers = _.filter(getCreeps('rangedAttacker'), (creep) => creep.room.name == spawner);
				if (rangedAttackers.length < requiredRA) {
					log(spawner + " defend my rooms spawning RA ")
					parts = createBodyPartsRangedAttacker(price);	
					myspawns[0].createCreep(parts, 'ra'+makeid(), {[C.ROLE]: 'rangedAttacker', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room });
					return 1;
				}
				

				if (requiredDefenders > 0 && roomObj.hostiles)	{ // PREVENTS ALL OTHER SPAWN FUNCTIONS AFTER THIS

					// SPAWN UPGRADERS
					let upgraders = getCreeps('upgrader', spawner)
					if (upgraders.length < 1 && controllerNeedsUpgrade(Game.rooms[spawner].controller)) {
						parts = createMaxBody(300, {move: 1, carry: 1, work: 1} );
						myspawns[0].createCreep(parts, 'u'+makeid(), {[C.ROLE]: 'upgrader', [C.ROOM_ORIGIN]: spawner});
						return 1;
					}

					if (Game.rooms[spawner].store(RESOURCE_ENERGY) <= 1000 && !Memory.rooms[spawner].allowSpawnTs) {
						Memory.rooms[spawner].allowSpawnTs = Game.time + 10000;
					}

					if (Memory.rooms[spawner].allowSpawnTs) {
						if (Game.time > Memory.rooms[spawner].allowSpawnTs) {
							delete Memory.rooms[spawner].allowSpawnTs;
						} else if (Game.time < Memory.rooms[spawner].allowSpawnTs - 5000) {
							return 0;
						}
						return 1;
					}
					return 1;
				}

			} else { // SPAWN FROM NEARBY ROOMS?

				if (Memory.roomAttacked[room].assignedSpawn && Memory.roomAttacked[room].assignedSpawn[spawner]) {

					if (globalEnergyCrysis() ) { continue; }

					if ((getRoomPRCL(room) <= 0 && 
						roomIsSafeModeCd(room) > 500) || 
						Game.rooms[spawner].energyStatus() < ECONOMY_LOW || 
						Memory.roomAttacked[room].requiredRA
					){
						// Allow RA ccheck for spawn
					} else {
						
						let defenders = _.filter(getCreeps('defender'), (creep) => creep._memory.PRCL === Memory.myRoomHighPRCL);

						let requiredDefenders = Memory.roomAttacked[room].requiredDefenders || 1;
					
						if (Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.strength > 100 && getRoomPRCL(room) <= 0) { continue; }

						let enemyStrength = 0;
						if (Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.strength) {
							enemyStrength = roomObj.hostiles.power.strength;
						}

						if (preSpawnCreepsCheck(defenders, 150, requiredDefenders) ){
							console.log(spawner + " spawning remote defender for " + room);

							let boostRequest = {};
							let applyBoostsDefender = {};
							let attackBoostLevel = 0;
							let rangedBoostLevel = 0;
							let moveBoostLevel = 0;
							let wantBoost = false;
							
						//	let unbostedLocalDefenderDmg = getAttackerStrength(Game.rooms[room].energyCapacityAvailable, 0, 0);
														
							let unbostedRemoteDefenderDmg = getAttackerStrength(price, 0, 0);
							if (roomIsSafeModeCd(room) > 500 || (Game.rooms[room].hasLabs() < 3 && (enemyStrength > unbostedRemoteDefenderDmg * 3 ))) {								
								wantBoost = true;
								attackBoostLevel = empireHasBoostsLevel({[ATTACK]: 15000})
								rangedBoostLevel = empireHasBoostsLevel({[RANGED_ATTACK]: 15000})
								moveBoostLevel = empireHasBoostsLevel({[MOVE]: 15000})
							}

							let ranged = false;
							//if (Math.random() > 0.5) {
							//	ranged = true;
							//}

							if (wantBoost && !DISABLED_MARKET) {

								let boost = getBoostAtLevel(MOVE, moveBoostLevel);
								if (boost) {
									boostRequest[boost] = Math.min(600 * requiredDefenders, 3000);
									applyBoostsDefender[boost] = {};
									restockRes(spawner, undefined, boost, boostRequest[boost]);
								}

								if (ranged) {
									boost = getBoostAtLevel(RANGED_ATTACK, attackBoostLevel);
									if (boost) {
										boostRequest[boost] = Math.min(1200 * requiredDefenders, 3000);
										applyBoostsDefender[boost] = {};
										restockRes(spawner, undefined, boost, boostRequest[boost]);
									}
								} else {
									boost = getBoostAtLevel(ATTACK, attackBoostLevel);
									if (boost) {
										boostRequest[boost] = Math.min(1200 * requiredDefenders, 3000);
										applyBoostsDefender[boost] = {};
										restockRes(spawner, undefined, boost, boostRequest[boost]);
									}
								}

								Game.rooms[spawner].setBoostMode(true, boostRequest);
							}
								
							

							if (moveBoostLevel) {
								let wantedAttacks = 1 + moveBoostLevel;
								if (ranged) {
									parts = createMaxBody(price, {rangedAttack: wantedAttacks, move: 1})	
								} else {
									parts = createMaxBody(price, {attack: wantedAttacks, move: 1})	
								}
								
							} else {
								if (ranged) {
									parts = createMaxBody(price, {rangedAttack: 1, move: 1})	
								} else {
									parts = createMaxBody(price, {attack: 1, move: 1})	
								}
							}
							
							myspawns[0].createCreep(parts, 'r-d'+makeid(), {[C.ROLE]: 'defender', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, PRCL: Memory.myRoomHighPRCL,
																			boost: attackBoostLevel & wantBoost, appBoosts: applyBoostsDefender, ranged: ranged});
							return 1;
						}

						/*
						let repairers = _.filter(getCreeps('builder', spawner), (creep) => creep._memory.repairGuy == true && creep._memory.PRCL === Memory.myRoomHighPRCL);					
						let requiredRepariers = 2;
						if (preSpawnCreepsCheck(defenders, 50, requiredRepariers) ){
							console.log(spawner + " spawning remote defender for " + room);	
							parts = createMaxBody(price, {work: 1, carry: 1, move: 2 });
							myspawns[0].createCreep(parts, 'rG'+makeid(),
								{[C.ROLE]: 'builder', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, repairGuy: true, PRCL: Memory.myRoomHighPRCL });
							return 1;					
						}*/

					}
				}

				if (Memory.attackTarget[room] && Memory.attackTarget[room].assignedSpawn[spawner]) {
					if (roomIsSafeModed(room) > 750) { continue; }
					
					if (Game.rooms[spawner].energyStatus() <= ECONOMY_LOW) { continue; }

					let requiredAttackers = 0;
					if (getRoomPRCL(room) < 3 && Memory.rooms[room].hostiles) {						
						let myRA = getAvailableRaStrength(spawner).strength;
						if (Memory.rooms[room].hostiles.power.strength > 3 * myRA) { continue; }
						requiredAttackers = Math.min(4 * Object.keys(Memory.attackTarget[room].assignedSpawn).length, 6);
					} else if (getRoomPRCL(room) < 6 && getLowWallHp(room) < WALL_HP_SETPOINT[getRoomRCL(room)] * 0.5 ) {
						requiredAttackers = Math.min(4 * Object.keys(Memory.attackTarget[room].assignedSpawn).length, 6);
					}
					
					let allRangedAttackers = getCreeps('rangedAttacker');
					if (allRangedAttackers >= requiredAttackers) { continue; }
					let attackers = _.filter(allRangedAttackers, (creep) => creep._memory[C.ROOM_TARGET] == room);
				//	console.log(spawner + " checking remote defender for " + room);	
					if (preSpawnCreepsCheck(attackers, 150, requiredAttackers) ){	
						console.log(spawner + " spawning remote defender for " + room);							
						parts = createBodyPartsRangedAttacker(price);	
						myspawns[0].createCreep(parts, 'ra'+makeid(), {[C.ROLE]: 'rangedAttacker', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room });
						return 1;
					}
				}
			}
		}
	}
	return 0;
}


function defendRemotes(spawner, myspawns, price) {
	
	if (Memory.remoteAttacked !== undefined) {
		let parts;
		let spawnerPRCL;
		for (let room in Memory.remoteAttacked) {
			let roomObj = Memory.rooms[room];

			if (!Memory.remoteAttacked[room].assignedSpawn || !Memory.remoteAttacked[room].assignedSpawn[spawner]) { continue; }

			if (roomIsAvoided(room) ) { continue; }			
			if (Memory.rooms[room].player && ALLIES[Memory.rooms[room].player])	{ continue; }
			if (getRoomRCL(room) > 0 && roomObj.hostileRoom) { continue; }
			if (BOT_MODE && checkTraversedRoomsForHostiles(spawner, room) )  { continue; }
	
			let enemies;
			if (roomObj.invaderCore) {
				if(roomObj.invaderCore.level === 0) {
					enemies = {attackDamage: 250, rangedAttackDamage: 0, healPower: 0}
				}
			} else if (roomObj.hostiles && roomObj.hostiles.power) {
				enemies = roomObj.hostiles.power;
			} else if (roomObj[R.INVADER_PROBABLE]) {
				if (roomIsSk(room)) { continue; }

				if (roomObj.sources) {
					if (!Memory.invaderPower || !Memory.invaderPower[Object.keys(roomObj.sources).length]) { continue; }
					enemies = Memory.invaderPower[Object.keys(roomObj.sources).length];
				} else {
					if (!Memory.invaderPower || !Memory.invaderPower[Object.keys(roomObj.sources).length]) { continue; }
					enemies = Memory.invaderPower[2];
				}
			}



			if (!enemies) { continue; }

			let maxPower = [
				0,
				75,
				125,
				200,
				300,
				400,
				600,
				1000,
				1500
				// scale for spawner level	
			]

		//	log(room + " under attack, power " + enemies.defensive +"/"+ maxPower[spawnerPRCL]) 

			if (!spawnerPRCL) {
				spawnerPRCL = getRoomPRCL(spawner);
			}

			if (roomObj.isPlayer) {
				// let Ranged Attackers spawn?
				if (enemies.defensive >= maxPower[spawnerPRCL] && (Math.random() > 0.33 || globalEnergyCrysis() ))  { continue; } 
			}

			if (roomIsSk(room)) {
				let invaderKillersSk = _.filter(getCreeps('invaderKillerSK'), (creep) => creep._memory[C.ROOM_TARGET] == room);					
				if (invaderKillersSk.length <= 0 || (invaderKillersSk[0].ticksToLive < 200 && !invaderKillersSk[0]._memory[C.REPLACED] )) {				
					parts = createMaxBody(price, {move: 25, ranged_attack: 22, heal: 3});
					myspawns[0].createCreep(parts, 'ikS'+makeid(), 
						{[C.ROLE]: 'invaderKillerSK', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, followRole: "keeperKiller" });
					if (invaderKillersSk.length > 0) { invaderKillersSk[0]._memory[C.REPLACED] = 1; }
					return 1;
				}
			} else {
				let requiredResponse = calcResponseForce(enemies);
				let myDefence = _.filter(getCreeps('invaderKiller'), (creep) => creep._memory[C.ROOM_TARGET] == room);
				let myRa = _.filter(getCreeps('rangedAttacker'), (creep) => creep._memory[C.ROOM_TARGET] == room);
				myDefence.concat(myRa)

				let currentResponse = calcCreepStrength(myDefence);
				let requiredResponseStrength = limit(requiredResponse.strength, 0, maxPower[spawnerPRCL]);

				let currentResponseValue = currentResponse.strength;
				if (myDefence.length > 0) {	// Prevent spawning small creeps
					currentResponseValue = currentResponseValue + 250;
				}

			//	log("want to spawn for " + room + " power " + requiredResponseStrength +"/"+ currentResponseValue)
				
				if (requiredResponseStrength > currentResponseValue ) {

					if (roomObj.isPlayer && Math.random() > 0.35) {
						parts = createBodyPartsRangedAttacker(price);
						myspawns[0].createCreep(parts, 'ra'+makeid(), {[C.ROLE]: 'rangedAttacker', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room });
						console.log(spawner + " Spawning new ra: target room: " +room +" under attack by " +Memory.rooms[room].isPlayer+ " current required invader strength "+requiredResponse.strength );
						return 1;
					} else {
						if (roomObj.invaderCore && roomObj.invaderCore.level === 0) {
							let reducedPrice = Math.min(price, 1300)
							parts = createMaxBody(reducedPrice, {attack: 1, move: 1});
						} else {
							let create = createResponseCreep(requiredResponse, currentResponse, price);
							parts = createBody(price, create);
						}
						
						if (parts.length < 3 && currentResponseValue > 0) { continue; }
						myspawns[0].createCreep(parts, 'ik'+makeid(), {[C.ROLE]: 'invaderKiller', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room });
						
						if (roomObj.hostiles) {
							console.log(spawner + " Spawning new invaderKiller: target room: " +room +" under attack by " +Memory.rooms[room].isPlayer+ " current required invader strength "+requiredResponse.strength );
						} else {
							console.log(spawner + " Spawning new invaderKiller:  target room: " +room +" invader probable! Current required invader strength"+ requiredResponse.strength );
						}
						return 1;
					}					
				}				
			}
		}
	}
	return 0;
}



function getDefenceSquadIndex(defenders){	
	let length = defenders.length;

	for (let possibleSquadIdx = 0; possibleSquadIdx < length; possibleSquadIdx++) {
		let idxActive = false;
		for (let defendersIdx = 0; defendersIdx < length; defendersIdx++) {
			if (defenders[defendersIdx]._memory.squadIndex === possibleSquadIdx) {
				idxActive = true;
				break;
			}
		}
		if (!idxActive) { return possibleSquadIdx; }
	}
	return 0;
}

global.createMaxBody = function(price, parts){
	let body = createBody(price, parts);
	let cost = 0;
	let length = body.length;
	for (let i=0; i< length; i++){
		cost += BODYPART_COST[body[i]];
	}
	let multiplier = Math.floor(price / cost);
	let max = Math.floor(50 / length);

	return createBody(price, parts, Math.min(multiplier, max));
}

let COMBAT_TYPE_TO_IGNORE = {
	[TOUGH]: {},
	[ATTACK]: {},
	[RANGED_ATTACK]: {},
}

global.createBody = function(price, parts, multiplier = 1){
	// Check price
	let arr = [];
	let endArr = [];
	let totalParts = 0;
	let _price = 0;
	for (let part in parts) {

		let usedEndParts = 0;
		if (!COMBAT_TYPE_TO_IGNORE[part]) {			
			_price += BODYPART_COST[part];
			if (_price > price) { break; }
			totalParts++;
			usedEndParts = 1;
			endArr.push(part)
		}

		let wantedNormalParts = (parts[part]*multiplier) - usedEndParts

		for (let i=0; i<wantedNormalParts; i++) {
			if (totalParts >= 50 ) {
				console.log("createBody error max bodyparts > 50");
				break;
			}
			_price += BODYPART_COST[part];
			if (_price > price) { break; }
			arr.push(part);
			totalParts++
		}
	}

	return arr.concat(endArr);
}

function sortSkMineTargets(mines) {
	let returnRooms = {};
	let sortable = [];

	// gather market prices
	let mineralPrices = getMineralPriceScore();

	for(let room in mines) {
	//	console.log("srting room " + mines[room].dist );
		let mineralId = mines[room].mineralId		

		let mineralType = mines[room].type;
		if (!mineralType && mineralId && Memory.rooms[room] && Memory.rooms[room].mineral) {
			mineralType = Memory.rooms[room].mineral[mineralId].type;
		}

		if (mineralType && !wantToMineMineral(mineralType)) { 
		//	log("skipping remote SK mineral since its cheaper to buy of market " + mineralType)
			continue; 
		}

		if (Game.cpu.bucket < 5000 && (!Memory.Minerals.Buy || !Memory.Minerals.Buy[mineralType])) { 
		//	log("skipping remote SK mineral due to no active Buy and low bucket " + mineralType)
			continue; 
		}

	 	let score = 0;
		score += 100 / mines[room].dist;	// Steps away

		score += mineralPrices.mineralScore[mineralType].price / mineralPrices.highestPrice;
	//	log(mineralType + " got score " + score)
		sortable.push([room, score]);
	}

	sortable.sort(function(a, b) {
		return (b[1] - a[1]);});	
	let length = sortable.length;
	for (let i=0; i<length; i++) {
	//	console.log("score " + sortable[i][1])
		let remoteRoom = sortable[i][0];
		returnRooms[remoteRoom] = {};
	}
	return returnRooms;
}

function spawnRaids(spawner, myspawns, price){
	if (Memory.raids) {
		let parts;
		for (let id in Memory.raids) {
			if (!id || !Memory.raids[id].state) { continue; }
			if (Memory.raids[id].assignedRoom === spawner && 
				(Memory.raids[id].state === STATE_SPAWNING || 
				Memory.raids[id].state === STATE_REFRESH_TTL) &&
				!Memory.raids[id].spawnComplete) {
				for (let types in Memory.raids[id].requiredCreeps) {
					let creepToSpawn = Memory.raids[id].requiredCreeps[types];
					let currentCreeps = _.filter(getCreeps(types, spawner), (creep) => creep._memory.raidId == id);
					if (currentCreeps.length < creepToSpawn.reqNumber) {

						if (Array.isArray(creepToSpawn.body) ) {
							parts = creepToSpawn.body;
						} else {
							parts = createMaxBody(price, creepToSpawn.body);
						}
						
				//	parts = createBody(price, creepToSpawn.body);	// TESTING
						myspawns[0].createCreep(parts, types+makeid(), {
							[C.ROLE]: types, 
							[C.ROOM_ORIGIN]: spawner, 
							raidId: id, 
							[C.ROOM_TARGET]: Memory.raids[id].targetRoom, 
							attId: Memory.raids[id].attId,
							rotation: creepToSpawn.rotation,
						});
						console.log(spawner + " spawning " + types + " for raid " + id + " target " + Memory.raids[id].targetRoom);
						return 1;
					}
				}
				return 1; // keep spawn idle for refresh TTL				
			}
		}
	}
	return 0;
}

function spawnCombatAttackers(spawner, myspawns, price){

	if (Memory.combat) {
		let parts;
		for (let room in Memory.combat) {
			if (roomIsSafeModed(room) > 500 ) { continue; }
		//	if (Memory.rooms[room].player && ALLIES[Memory.rooms[room].player])	{ continue; }
			if (Memory.combat[room].assignedRoom === spawner) {
				let requiredRangedBoostAttacker = 1;
				let rangedBoostAttacker = _.filter(getCreeps('rangedBoostAttacker'), (creep) => creep._memory[C.ROOM_TARGET] == room);
				Game.rooms[spawner].setBoostMode(true, {XGHO2: 600, XZHO2: 600, XLHO2: 900, XKHO2: 900});

				if (rangedBoostAttacker.length < requiredRangedBoostAttacker){				
					parts = createMaxBody(price, {tough: 1, ranged_attack: 3, move: 1});
					myspawns[0].createCreep(parts, 'rbA'+makeid(), {[C.ROLE]: 'rangedBoostAttacker', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, boost: true });
					console.log(spawner + ' Spawning new combat rangedBoostAttacker, target room: ' +room );
					return 1;
				}
				let healers = _.filter(getCreeps('healer'), (creep) => creep._memory[C.ROOM_TARGET] == room);
				if (healers.length == 0) {
					parts = createMaxBody(price, {tough: 1, heal: 3, move: 1 });
					let newName = 'hl'+makeid()
					myspawns[0].createCreep(parts, newName,
						{[C.ROLE]: 'healer', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, follow: rangedBoostAttacker[0].name, boost: true  });
					console.log(spawner + ' Spawning new combat rangedBoostAttacker healer: ' + newName + " target room: " +room );

					rangedBoostAttacker[0]._memory.healer = newName;
					return 1;
				}
			}
		}
	}
	return 0;
}

function getSquadID(room) {
	if (!Memory.squadIndex) { Memory.squadIndex = 0; }
	Memory.squadIndex++
	return Memory.squadIndex + "-" + room;
}

function cancelSquad(spawner, id){
	delete Memory.rooms[spawner].squadToSpawn[id];
	if (Object.keys(Memory.rooms[spawner].squadToSpawn).length === 0) {
		delete Memory.rooms[spawner].squadToSpawn;
	}
}

function addNewSquadToQueue(spawner, room){
	if (!Memory.rooms[spawner].squadToSpawn) { Memory.rooms[spawner].squadToSpawn = {}; }
	let id = getSquadID(room);
	Memory.rooms[spawner].squadToSpawn[id] = {};
	Memory.rooms[spawner].squadToSpawn[id].room = room;
	Memory.rooms[spawner].squadToSpawn[id].ts = Game.time + CREEP_LIFE_TIME * 2;
}

function squadNeedsSpawn (spawner, currentCreeps, room) {
	if (!Memory.rooms[spawner].squadToSpawn) { return; }
	for (let id in Memory.rooms[spawner].squadToSpawn) {
		if (Game.time > Memory.rooms[spawner].squadToSpawn[id].ts) {
			cancelSquad(spawner, id)
			continue;
		}
		if (room !== Memory.rooms[spawner].squadToSpawn[id].room) { continue; }
		let idFound = false;
		for (let idx in currentCreeps) {
			let creep = currentCreeps[idx];
			if (creep._memory.sqaudId && creep._memory.sqaudId === id) {
				if (!Memory.rooms[spawner].squadToSpawn[id].spawned) { Memory.rooms[spawner].squadToSpawn[id].spawned = {}; } 

				Memory.rooms[spawner].squadToSpawn[id].spawned[creep.name] = {};
				
				if (Object.keys(Memory.rooms[spawner].squadToSpawn[id].spawned).length >= 2) {
					cancelSquad(spawner, id)
				}

				idFound = true;				
			}
		}
		if (!idFound) {
			return id; 
		}
	}
}

global.getRoomTowerDmg = function(targetRoom) {
	let allyBase = false;
	if (Memory.rooms[targetRoom] && Memory.rooms[targetRoom].player && ALLIES[Memory.rooms[targetRoom].player])	{ 
		allyBase = true;
	}
	
	let towerDmg = 400;	// use 3600 instead?
	if (allyBase) {
		towerDmg = 1500;
	} else if (Game.rooms[targetRoom] && 
		((Game.rooms[targetRoom].controller && !Game.rooms[targetRoom].controller.my) || 
		(Memory.rooms[targetRoom] && Memory.rooms[targetRoom].invaderCore))
	){
		towerDmg = getHighTowerDamage(targetRoom);
	} else {
		let targetPlayer = getPlayerByRoomName(targetRoom);
		if (targetPlayer && Memory.players[targetPlayer] && Memory.players[targetPlayer].ownedRooms[targetRoom]){
			towerDmg = Memory.players[targetPlayer].ownedRooms[targetRoom].towerDmg;
		}
	}

	towerDmg = towerDmg || 150;
	return towerDmg
}

global.createInvaderCoreSniper = function(targetRoom, spawner, allowedBoostLevel = 0) {
	let towerDmg = getRoomTowerDmg(targetRoom);

	
	let attackerBoosts = [];

	let dmgCoverage = 1.1	// times the tower damage
	let requiredTough = 0;
	let wantedHeal = 0;

	let ikDmg = 100;	// 100?
	let strongholdRaCreep = 0
	let totalDmg = towerDmg + ikDmg + strongholdRaCreep;


	let wantedBoostAmount = 5000;
	let moveBoostLevel = empireHasBoostsLevel({[MOVE]: wantedBoostAmount}, allowedBoostLevel);
	if (moveBoostLevel > 0) {
		let compund = BOOST_LEVEL[MOVE][moveBoostLevel-1];		
		attackerBoosts.push(compund);
	}

	let healBoostLevel = empireHasBoostsLevel({[HEAL]: wantedBoostAmount}, allowedBoostLevel);
	let healFactor = 1;
	if (healBoostLevel > 0) {
		let compund = BOOST_LEVEL[HEAL][healBoostLevel-1];
		healFactor = BOOSTS.heal[compund].heal;
		attackerBoosts.push(compund);
	}

	let toughBoostLevel = empireHasBoostsLevel({[TOUGH]: wantedBoostAmount}, allowedBoostLevel);
	let toughDmgReduction = 1;
	if (toughBoostLevel > 0) {
		let compund = BOOST_LEVEL[TOUGH][toughBoostLevel-1];
		attackerBoosts.push(compund);
		toughDmgReduction = BOOSTS.tough[compund].damage;
		requiredTough = Math.min(Math.ceil((dmgCoverage * totalDmg * toughDmgReduction) / 100), 15);
	
		wantedHeal = Math.ceil((requiredTough * 100 / (healFactor * HEAL_POWER)));
	} else {
		wantedHeal = Math.ceil((dmgCoverage * totalDmg / (healFactor * HEAL_POWER)));
	}

	let boostLevel = empireHasBoostsLevel({[RANGED_ATTACK]: wantedBoostAmount}, allowedBoostLevel);
	let rangedboostFactor = 1;
	if (boostLevel > 0) {
		let compund = BOOST_LEVEL[RANGED_ATTACK][boostLevel-1]
		attackerBoosts.push(compund);
		rangedboostFactor = BOOSTS.ranged_attack[compund].rangedAttack;
	}

	// aim to snipe the core in 1k ticks
	let level = 3;
	if (Memory.rooms[targetRoom] && Memory.rooms[targetRoom].invaderCore) {
		level = Memory.rooms[targetRoom].invaderCore.level || 3;
	}

	let rampartHits = STRONGHOLD_RAMPART_HITS[level] || 500000;

	let targetDps = (rampartHits + INVADER_CORE_HITS) / 1000
	let dmgPart = RANGED_ATTACK_POWER * rangedboostFactor;
	let requiredRaParts = Math.ceil(targetDps / dmgPart);

	let requiredMove = Math.ceil((requiredTough + requiredRaParts + wantedHeal) / (1 + moveBoostLevel));
	let totalParts = requiredTough + requiredRaParts + wantedHeal + requiredMove;

	let actualHealCover = (wantedHeal * HEAL_POWER * healFactor / toughDmgReduction) / (totalDmg || 1)

	let energyAvailable = Game.rooms[spawner].energyCapacityAvailable;
	let cost = (requiredTough * BODYPART_COST[TOUGH]) + (requiredRaParts * BODYPART_COST[RANGED_ATTACK]) + (wantedHeal * BODYPART_COST[HEAL]) + (requiredMove * BODYPART_COST[MOVE]) ;

	if (cost > energyAvailable || actualHealCover < 1 || totalParts > 50) { 
		if (allowedBoostLevel < 3) {
		//	log("failed to create creep with boost level " + allowedBoostLevel+ " cost " + cost + "/" + energyAvailable + " heal cover " + actualHealCover.toFixed(2) + " total parts " + totalParts)
		//	log("requiredTough "+ requiredTough + " requiredRaParts "+ requiredRaParts + " wantedHeal " + wantedHeal + " requiredMove " +requiredMove)

			allowedBoostLevel++;
			return createInvaderCoreSniper(targetRoom, spawner, allowedBoostLevel);
		} else {
			return {}
		}
	}


//	log("created creep with boost level " + allowedBoostLevel+ " cost " + cost + "/" + energyAvailable + " heal cover " + actualHealCover.toFixed(2) + " total parts " + totalParts)
//	log("requiredTough "+ requiredTough + " requiredRaParts "+ requiredRaParts + " wantedHeal " + wantedHeal + " requiredMove " +requiredMove)
//	log(toughBoostLevel+ " toughDmgReduction " + toughDmgReduction + " healFactor " + healFactor + " healBoostLevel " +healBoostLevel)

	let attackerParts = createBody(energyAvailable, {tough: requiredTough, ranged_attack: requiredRaParts, heal: wantedHeal, move: requiredMove });

	return {
		attackerParts: attackerParts,
		attackerBoosts: attackerBoosts,
	}

}

//   JSON.stringify(createDismantlerSquadBodies("W0N7", "E6N7", 2, true, 0, true))
global.createDismantlerSquadBodies = function(targetRoom, spawner, formation = 2, useWork = false, allowedHealLevel = 3) {

	let energyAvailable = Game.rooms[spawner].energyCapacityAvailable;

	let towerDmg = 0;
	if (!roomIsHW(targetRoom)) {
		towerDmg = getRoomTowerDmg(targetRoom);
	}
	
	let avgCreepDmg = getAverageCreepDmg(targetRoom);

	let totalDmg = limit(avgCreepDmg + towerDmg, 1, 4000);

	let healerParts = [];
	let healerBoosts = [];

	let attackerParts = {};
	let attackerBoosts = [];

	let sumBoosts = [];

	let dmgCoverage = 2.1	// times the tower damage
	let requiredTough = 0;
	let wantedHeal = 0;

//	let wantedBoostAmount = limit(Object.keys(Memory.Minerals.Labs).length * 3000, 4000, 10000);
	let wantedBoostAmount = 3000;

	let moveBoostLevel = empireHasBoostsLevel({[MOVE]: wantedBoostAmount}, allowedHealLevel);
	if (moveBoostLevel > 0) {
		let compund = BOOST_LEVEL[MOVE][moveBoostLevel-1];
		healerBoosts.push(compund);
		attackerBoosts.push(compund);
		sumBoosts.push(compund);
	}	
	
	let healBoostLevel = empireHasBoostsLevel({[HEAL]: wantedBoostAmount}, allowedHealLevel);
	let healFactor = 1;
	if (healBoostLevel > 0 && totalDmg > 250) {
		let compund = BOOST_LEVEL[HEAL][healBoostLevel-1];
		healFactor = BOOSTS.heal[compund].heal;
		healerBoosts.push(compund);
		sumBoosts.push(compund);
	}
	
	let toughBoostLevel = empireHasBoostsLevel({[TOUGH]: wantedBoostAmount}, allowedHealLevel);
	let toughDmgReduction = 1;
	let healers = Math.ceil(formation / 2);
	if (toughBoostLevel > 0 && healers <= 1 && totalDmg > 250) {
		let compund = BOOST_LEVEL[TOUGH][toughBoostLevel-1];
		
		healerBoosts.push(compund);
		attackerBoosts.push(compund);
		sumBoosts.push(compund);

		toughDmgReduction = BOOSTS.tough[compund].damage;
		requiredTough = Math.min(Math.ceil((dmgCoverage * totalDmg * BOOSTS.tough[compund].damage) / 100), 15);
	
		wantedHeal = Math.ceil((requiredTough * 100 / (healFactor * HEAL_POWER)));
	//	console.log("tower dmg " + towerDmg + " requires heals " + wantedHeal + " heal level " + healBoostLevel);
	} else {
		wantedHeal = Math.ceil((dmgCoverage * totalDmg / (healFactor * HEAL_POWER)));
	}
	
	let requiredMove = Math.ceil(requiredTough / (1 + moveBoostLevel));
	let costBase = requiredMove * BODYPART_COST[MOVE] + requiredTough * BODYPART_COST[TOUGH];

	let addRatio = 1 + moveBoostLevel
	let pricePerRatio = Math.floor(addRatio * BODYPART_COST[HEAL] + BODYPART_COST[MOVE]);
	let affordableRatio = Math.floor((energyAvailable - costBase ) / pricePerRatio); 
	let maxSpaceRatios = Math.floor((50 - requiredMove - requiredTough) / (addRatio + 1))

//	console.log("max add ratio " + maxSpaceRatios)
	let appliedRA = Math.min(maxSpaceRatios, affordableRatio)
	let heals = Math.min(appliedRA * addRatio, 40);	
	let additionalMove = Math.ceil(heals / (1 + moveBoostLevel));

	
	let actualHealCover = (healers * heals * HEAL_POWER * healFactor / toughDmgReduction) / (totalDmg || 1)
	let reqParts = requiredMove + additionalMove + heals + requiredTough
	log("heals " + heals + " vs total dmg " + totalDmg + ", heal coverage " + actualHealCover.toFixed(1) + " heal boost level " + healBoostLevel + "/" + allowedHealLevel)
	let totalMove = requiredMove + additionalMove
	let totalPrice = requiredTough * BODYPART_COST[TOUGH] + totalMove * BODYPART_COST[MOVE] + heals * BODYPART_COST[HEAL]
	
	if (actualHealCover < 1 || reqParts > 50 || totalPrice > energyAvailable) {
		log("actualHealCover " + actualHealCover.toFixed(1) + " reqParts " + reqParts + " at max heal level " + allowedHealLevel)

		/*
		if (allowedHealLevel < 3) {
			allowedHealLevel++
			return createDismantlerSquadBodies(targetRoom, spawner, formation, useWork, allowedHealLevel, true)
		} */

		return {};
	}

	healerParts = createMaxBody(energyAvailable, {tough: requiredTough, heal: heals, move: totalMove });	

	requiredMove = Math.ceil(requiredTough / (1 + moveBoostLevel));
	costBase = requiredMove * BODYPART_COST[MOVE] + requiredTough * BODYPART_COST[TOUGH];

	addRatio = 1 + moveBoostLevel

	let offensivePart = ATTACK;
	let boostType = ATTACK;
	let boostAmountStocked = 6000;
	if (useWork) {
		offensivePart = WORK;
		boostType = DISMANTLE;
		boostAmountStocked = 3000;
	}

	pricePerRatio = Math.floor(addRatio * BODYPART_COST[offensivePart] + BODYPART_COST[MOVE]);
	affordableRatio = Math.floor((energyAvailable - costBase ) / pricePerRatio); 

	maxSpaceRatios = Math.floor((50 - requiredMove - requiredTough) / (addRatio + 1));

	appliedRA = Math.min(maxSpaceRatios, affordableRatio);


	
	let attacks = Math.min(appliedRA * addRatio, 40);
	additionalMove = Math.ceil(attacks / (1 + moveBoostLevel));

	totalMove = requiredMove + additionalMove
	totalPrice = requiredTough * BODYPART_COST[TOUGH] + totalMove * BODYPART_COST[MOVE] + attacks * BODYPART_COST[offensivePart]
	
	if (useWork) {

		let attackBoostLevel = empireHasBoostsLevel({[RANGED_ATTACK]: 4500}, allowedHealLevel);
		let workParts = attacks - 5
		let addingRa = 0
		if (attackBoostLevel > 0 || SEASONAL_SYMBOLS) {

			let raParts = 0;
			totalPrice = requiredTough * BODYPART_COST[TOUGH] + totalMove * BODYPART_COST[MOVE] + workParts * BODYPART_COST[WORK] + raParts * BODYPART_COST[RANGED_ATTACK]
			let remainingEnergy = energyAvailable - totalPrice;
			let possibleRa = Math.floor(remainingEnergy / BODYPART_COST[RANGED_ATTACK]);
			addingRa = Math.min(5, possibleRa)

			if (addingRa > 0) {
				let compund = BOOST_LEVEL[RANGED_ATTACK][attackBoostLevel-1]
				attackerBoosts.push(compund);
				sumBoosts.push(compund);
			} 

		}

		if (addingRa > 0) {
			attackerParts = createMaxBody(energyAvailable, {tough: requiredTough, work: workParts, ranged_attack: addingRa, move: totalMove });
		} else {
			attackerParts = createMaxBody(energyAvailable, {tough: requiredTough, work: attacks, move: totalMove });
		}
		
	} else {
		attackerParts = createMaxBody(energyAvailable, {tough: requiredTough, attack: attacks, move: totalMove });
	}

	let attackBoostLevel = empireHasBoostsLevel({[boostType]: boostAmountStocked}, allowedHealLevel);
	if (attackBoostLevel > 0) {
		let compund = BOOST_LEVEL[boostType][attackBoostLevel-1]
		attackerBoosts.push(compund);
		sumBoosts.push(compund);
	}

	return {
		healerParts: healerParts,
		healerBoosts: healerBoosts,
		attackerParts: attackerParts,
		attackerBoosts: attackerBoosts,
		boosts: sumBoosts,
	}
}

global.roomSurpressed = function(roomName) {
	if (!Memory.rooms[roomName]) { return false;}

	if (!Game.rooms[roomName]) { return false;}	// no presence?

	if (Memory.rooms[roomName].numberOfTowers <= 0 && !Memory.rooms[roomName].hostiles) { return true;}

	let player = Memory.rooms[roomName].player
	if (Memory.players[player] && Memory.players[player].ownedRooms && Memory.players[player].ownedRooms[roomName]) {
		let roomIntel = Memory.players[player].ownedRooms[roomName];
		if (roomIntel.storedEnergy < 1000 && !Memory.rooms[roomName].hostiles) { return true;}
	}

	return false;
}

function spawnCombatDeconsturctor(spawner, myspawns, price){
	if (Memory.combatDeconstruct) {
		let parts;

		if (Game.rooms[spawner].energyStatus() < ECONOMY_LOW) { return; }

		for (let room in Memory.combatDeconstruct) {
			if (!Memory.combatDeconstruct[room].assignedRooms || !Memory.combatDeconstruct[room].assignedRooms[spawner]) { continue; }
			
			if (roomIsSafeModed(room) > 300 ) { continue; }

			let spawnerMem = Memory.combatDeconstruct[room].assignedRooms[spawner];
			
			if (Memory.combatDeconstruct[room].civilian || 
				(roomIsSk(room) && sectorHasDeadInvaderCore(room) ) ||
				(Memory.rooms[room] && Memory.rooms[room].player && 
				roomSurpressed(room) && Game.rooms[room] && roomHp(Game.rooms[room]) > 50000)
			) { // IF CIVILIAN
				
				let requiredEco = ECONOMY_DEVELOPING;
				let addEngine = false;

				let applyBoostsDeconstructor = [];
				let moveBoostLevel = 0;

				
				if ((SEASONAL_SCORE && roomIsCorner(room)) ||
					(SEASONAL_SYMBOLS && roomIsHW(room))
				) {
					if (Game.rooms[spawner].energyStatus() < ECONOMY_LOW) { continue; }
					
					if (Game.rooms[spawner].energyStatus() >= ECONOMY_DEVELOPING) { 
						addEngine = true;
					}
					
					
					let dismantleBoostLevel = 0;
					let boostRequest = {};
					if (Game.rooms[spawner].hasLabs() >= 3) {
						moveBoostLevel = empireHasBoostsLevel({[MOVE]: 10000})
						dismantleBoostLevel = empireHasBoostsLevel({[DISMANTLE]: 10000})
					}

					if (!addEngine) {
						let boost = getBoostAtLevel(MOVE, moveBoostLevel);
						if (boost) {
							boostRequest[boost] = Math.min(600 * 1, 3000);
							applyBoostsDeconstructor.push(boost)
							restockRes(spawner, undefined, boost, boostRequest[boost]);
						}
					}

					let boost = getBoostAtLevel(DISMANTLE, dismantleBoostLevel);
					if (boost) {
						boostRequest[boost] = Math.min(1500 * 1, 3000);
						applyBoostsDeconstructor.push(boost)
						restockRes(spawner, undefined, boost, boostRequest[boost]);
					}

					if (Object.keys(boostRequest).length) {
						Game.rooms[spawner].setBoostMode(true, boostRequest);
					}
					
					
				} else {
					if (Game.rooms[spawner].energyStatus() < requiredEco) { continue; }
				}
				
				if (Game.rooms[room] && roomHp(Game.rooms[room]) <= 0) { continue; }

				let requiredDeconstructors = Memory.combatDeconstruct[room].requiredDeconstructors || 4;
				if (requiredDeconstructors <= 1 && Game.rooms[spawner].energyStatus() >= ECONOMY_RICH) {
					requiredDeconstructors = 3;
				}

				let deconstructors = _.filter(getCreeps('deconstructor'), (creep) => creep._memory[C.ROOM_TARGET] == room);
				if (preSpawnCreepsCheck(deconstructors, 50, requiredDeconstructors) ){
					let weight;

					if (addEngine) {
						parts = createMaxBody(price, {work: 1});
						weight = parts.length;
					} else {
						parts = createMaxBody(price, {work: 1 + moveBoostLevel, move: 1});
					}
					myspawns[0].createCreep(parts, 'd'+makeid(), {[C.ROLE]: 'deconstructor', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, [C.WAGON_WEIGHT]: weight, appBoosts: applyBoostsDeconstructor, civ: 1});	
					
					if (addEngine) {
						let engineParts = createBody(price, {move: weight});
						let engineMemory = {
							[C.ROLE]: 'engine', [C.ROOM_ORIGIN]: spawner
						}
						myspawns[0].addToQ(engineParts, 'e'+makeid(), engineMemory, 160);
					}
					return 1;
				}

				if (deconstructors.length >= requiredDeconstructors && Memory.orderWreckers[room] && Game.time > Memory.orderWreckers[room].ts) {
					delete Memory.orderWreckers[room];
				}

			} else { // Combat deconstructors

				if (playerIsDead(getPlayerByRoomName(room))) { continue; }
				let requiredDeconstructors = Memory.combatDeconstruct[room].requiredDeconstructors || 2;

				let boostTier = Memory.combatDeconstruct[room].boostTier || 3
								
			//	Game.rooms[spawner].setBoostMode(true, {[T3_ATTACK]: 1800, [T3_MOVE]: 1200, [T3_TOUGH]: 1800, [T3_HEAL]: 1800, [T3_RANGED_ATTACK]: 600, [T3_DISMANTLE]: 1800 });
												
		//	return;	// PREVENT SPAWNING			

				let healers = _.filter(getCreeps('healer', spawner), (creep) => creep._memory[C.ROOM_TARGET] == room);
				let deconstructors = _.filter(getCreeps('deconstructor'), (creep) => creep._memory[C.ROOM_TARGET] == room);

				let healerId = squadNeedsSpawn(spawner, healers, room);
				let deconstructorId = squadNeedsSpawn(spawner, deconstructors, room);
			//	console.log(spawner +" #### checking for deconstructors! requested " + deconstructors.length +"/"+ requiredDeconstructors + " idheal " + healerId + " deconstructorId " + deconstructorId)
				let spawning = false;

				if (preSpawnCreepsCheck(deconstructors, 250, requiredDeconstructors) || healerId || deconstructorId) {
					spawning = true;
					let energySpend = price;
					if (!healerId && !deconstructorId){

						if (Memory.combatDeconstruct[room].despawn && (!Memory.rooms[room] || !Memory.rooms[room].player || Memory.rooms[room].numberOfTowers <= 0)) {

						//	log(room + " checking for smaller deconstructors, def strength " + getCurrentDefensiveStrength(room) + ", room hp "+ roomHp(Game.rooms[room]) + ", avg def " + getAverageStrength(room))
							
							if (getCurrentDefensiveStrength(room) === 0 && Game.rooms[room] && roomHp(Game.rooms[room]) < 15000) {

							//	log("minie")
								// spawn smaller creeps for cleared undefended room
								let avgStrength = getAverageStrength(room);

								let attackerParts = createMaxBody(price, {attack: 1, move: 1});
								let healerParts = createMaxBody(price, {heal: 1, move: 1});

								let attackerPower = calcBodyStrength(attackerParts);
								let healerPower = calcBodyStrength(healerParts);
								let myPower = attackerPower.defensive + healerPower.defensive;

								let myCost = getBodyCostArray(attackerParts) + getBodyCostArray(healerParts)
								if (avgStrength < myPower) {
									
									let safety = 1.2;
									energySpend = limit(Math.floor((avgStrength*safety / myPower) * myCost), 600, price)
								}

								log(room + " spawning small dec! cost " + energySpend +"/" + price + " avg " + avgStrength + "/" + myPower + " body cost " + myCost)
							}

							let attackerParts = createMaxBody(energySpend, {attack: 1, move: 1});
							let healerParts = createMaxBody(energySpend, {heal: 1, move: 1});
							spawnerMem.squad = {
								healerParts: healerParts,
								healerBoosts: [],
								attackerParts: attackerParts,
								attackerBoosts: [],
							}
						} else {

							let useWorkParts = Memory.combatDeconstruct[room].dismantler || false;

							let myRoom = Game.rooms[room] && Game.rooms[room].controller && Game.rooms[room].controller.my
							let allowBoosts = true;
							if (!useWorkParts && !myRoom && (!Memory.rooms[room] || Memory.rooms[room].numberOfTowers <= 0)) {
								let avgStrength = getAverageStrength(room);

								let attackerParts = createMaxBody(price, {attack: 1, move: 1});
								let healerParts = createMaxBody(price, {heal: 1, move: 1});

								let attackerPower = calcBodyStrength(attackerParts);
								let healerPower = calcBodyStrength(healerParts);
								let myPower = (attackerPower.defensive + healerPower.defensive) * 2;
								if (myPower > avgStrength) {
									allowBoosts = false;
								}
							}							

							if(allowBoosts && !myRoom) {
								spawnerMem.squad = createDismantlerSquadBodies(room, spawner, 2, useWorkParts, boostTier);
							} else {

								let attackerParts = createMaxBody(energySpend, {attack: 1, move: 1});
								let healerParts = createMaxBody(energySpend, {heal: 1, move: 1});
								spawnerMem.squad = {
									healerParts: healerParts,
									healerBoosts: [],
									attackerParts: attackerParts,
									attackerBoosts: [], 
								}
							}
						}
						

						if (!spawnerMem.squad.attackerParts || !spawnerMem.squad.healerParts ||spawnerMem.squad.healerParts.length === 0 ) {
							log(spawner +" aborted combat deconstruct, no body returned for target " + room + JSON.stringify(spawnerMem.squad));
							delete Memory.orderWreckers[room];
							delete Memory.combatDeconstruct[room];
							return;
						} else {
							addNewSquadToQueue(spawner, room);
							healerId = squadNeedsSpawn(spawner, healers, room);
							deconstructorId = squadNeedsSpawn(spawner, deconstructors, room);	
							console.log(spawner +" #### created new sqaud id " + healerId);

							spawnerMem.boostRequest = {};
							for (let idx in spawnerMem.squad.healerBoosts) {
								let compund = spawnerMem.squad.healerBoosts[idx];
								spawnerMem.boostRequest[compund] = 3000;	// count body parts?
							}
							for (let idx in spawnerMem.squad.attackerBoosts) {
								let compund = spawnerMem.squad.attackerBoosts[idx];
								spawnerMem.boostRequest[compund] = 3000;	// count body parts?
							}
						}
					}
				}

				if (!spawnerMem.squad) {

					log(room + " no .squad")
					let energySpend = price;
					if (Memory.combatDeconstruct[room].despawn && (!Memory.rooms[room] || Memory.rooms[room].numberOfTowers <= 0)) {

						
						
						if (getCurrentDefensiveStrength(room) === 0 && Game.rooms[room] && roomHp(Game.rooms[room]) === 0) {
							// spawn smaller creeps for cleared undefended room
							log("mini")
							let avgStrength = getAverageStrength(room);

							let attackerParts = createMaxBody(price, {attack: 1, move: 1});
							let healerParts = createMaxBody(price, {heal: 1, move: 1});

							let attackerPower = calcBodyStrength(attackerParts);
							let healerPower = calcBodyStrength(healerParts);
							let myPower = attackerPower.defensive + healerPower.defensive;

							if (avgStrength < myPower) {
								energySpend = limit(Math.floor((avgStrength / myPower) * price), 600, price)
							}
						}

						let attackerParts = createMaxBody(energySpend, {attack: 1, move: 1});
						let healerParts = createMaxBody(energySpend, {heal: 1, move: 1});
						spawnerMem.squad = {
							healerParts: healerParts,
							healerBoosts: [],
							attackerParts: attackerParts,
							attackerBoosts: [],
						}
					} else {
						let useWorkParts = Memory.combatDeconstruct[room].dismantler || false;

						let myRoom = Game.rooms[room] && Game.rooms[room].controller && Game.rooms[room].controller.my
						let allowBoosts = true;
						if (!useWorkParts && !myRoom && (!Memory.rooms[room] || Memory.rooms[room].numberOfTowers <= 0)) {
							let avgStrength = getAverageStrength(room);

							let attackerParts = createMaxBody(price, {attack: 1, move: 1});
							let healerParts = createMaxBody(price, {heal: 1, move: 1});

							let attackerPower = calcBodyStrength(attackerParts);
							let healerPower = calcBodyStrength(healerParts);
							let myPower = (attackerPower.defensive + healerPower.defensive) * 2;
							if (myPower > avgStrength) {
								allowBoosts = false;
							}
						}							

						if(allowBoosts && !myRoom) {
							spawnerMem.squad = createDismantlerSquadBodies(room, spawner, 2, useWorkParts, boostTier);
						} else {

							let attackerParts = createMaxBody(energySpend, {attack: 1, move: 1});
							let healerParts = createMaxBody(energySpend, {heal: 1, move: 1});
							spawnerMem.squad = {
								healerParts: healerParts,
								healerBoosts: [],
								attackerParts: attackerParts,
								attackerBoosts: [], 
							}
						}
					}

				}

				if (!spawnerMem.squad || 
					(!spawnerMem.squad.healerParts || spawnerMem.squad.healerParts.length === 0) || 
					!spawnerMem.squad.attackerParts || spawnerMem.squad.attackerParts.length === 0 ) 
				{
					delete Memory.orderWreckers[room];
					delete Memory.combatDeconstruct[room];
					log(spawner + " deleting invalid wrecker crew to " + room)
					return 0;
				}


				Game.rooms[spawner].setBoostMode(true, spawnerMem.boostRequest);
				
			
				let spawnBusy;
				if (spawning && healerId) {						
					let returnValue = myspawns[0].createCreep(spawnerMem.squad.healerParts, 'hl'+makeid(),
						{[C.ROLE]: 'healer', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, sqaudId: healerId, followRole: 'deconstructor', 
						appBoosts: spawnerMem.squad.healerBoosts,
						attId: Memory.combatDeconstruct[room].attId  
					});
					console.log(spawner + ' Spawning new combat deconstructor healer: target room: ' +room  + " return code " + returnValue);
					if (returnValue === OK) {
						// ALLOW QUEUING OF DECONSTRUCTOR
						spawnBusy = true;
					} else {
						return 1;
					}
				}
					
				if (spawning && deconstructorId){	
											
					let creepMemory = {[C.ROLE]: 'deconstructor', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, sqaudId: deconstructorId, 
						appBoosts: spawnerMem.squad.attackerBoosts,
						attId: Memory.combatDeconstruct[room].attId 
					}
					console.log(spawner + ' Spawning new combat deconstructor: ' +  " target room: " +room );
					if (spawnBusy) {
						let creepName = 'dQ'+makeid();
						myspawns[0].addToQ(spawnerMem.squad.attackerParts, creepName, creepMemory, 160);
					} else {
						let creepName = 'd'+makeid();
						let returnValue = myspawns[0].createCreep(spawnerMem.squad.attackerParts, creepName, creepMemory);
						if (returnValue === OK) {
							if (healers.length > 0 && healers[deconstructors.length-1] && !healers[deconstructors.length-1]._memory.follow) {
								healers[deconstructors.length-1]._memory.follow = creepName;
							}
						}
					}
					return 1;
				}
					
				if (deconstructors.length >= requiredDeconstructors && Memory.orderWreckers[room] && Game.time > Memory.orderWreckers[room].ts) {
					delete Memory.orderWreckers[room];
				}

				if (spawnBusy) {
					return 1;
				}
			}
		}
	}
}

function spawnLoadByCreeps(spawner, creeps){
	let numberOfSpawns = Game.rooms[spawner].findByType(STRUCTURE_SPAWN).length;
	
	let parts = 0;
	for (let idx in creeps) {
		parts += creeps[idx].body.length;
	}
	return (parts*3) / (CREEP_LIFE_TIME*numberOfSpawns);
}

function canSpawnAgain(spawner){
	if (!Memory.rooms[spawner].attTime || Game.time > Memory.rooms[spawner].attTime + 15000) {
		return true;
	}
}

function setRangedAttackersSpawnTime(spawner, time){
	Memory.rooms[spawner].attTime = Game.time + time;
}

function isSpawningAttackers(spawner){
	if (!Memory.rooms[spawner].attTime) { return 0; }
	if (Memory.rooms[spawner].attTime > Game.time) { return 1; }
}



function spawnAttackers(spawner, myspawns, price){	

	if (Game.rooms[spawner].energyStatus() >= ECONOMY_DEVELOPING)  {

		if (Memory.antiScout) {
			for (let room in Memory.antiScout) {
				if (Game.time > Memory.antiScout[room].ts) {
					delete Memory.antiScout[room]
					continue;
				}
				if (!Memory.antiScout[room].assignedSpawn[spawner]) { continue; }
				
				if (roomIsSafeModed(room) > 500 ) { continue; }
				let antiScouts = getCreeps('antiScouts');
				for (let defendIdx in Memory.antiScout[room].exits) {
					if (Memory.antiScout[room].exits[defendIdx].ts && Game.time < Memory.antiScout[room].exits[defendIdx].ts) { continue; }
					let exitPos = Memory.antiScout[room].exits[defendIdx];
					let antiScout = _.filter(antiScouts, (creep) => creep._memory.exitPos === exitPos);
				
					if (preSpawnCreepsCheck(antiScout, 50, 1) ){
						Memory.antiScout[room].exits[defendIdx].ts = Game.time + 750;
						let parts = createBody(price, { ranged_attack: 1, move: 1});
						let destRoom = exitPos.roomName;
						myspawns[0].createCreep(parts, 'as'+makeid(), {[C.ROLE]: 'antiScouts', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: destRoom, exitPos: exitPos  });
						return 1;
					}
				}
			}
		}

		if (Memory.attackTarget) {
			
		
			let rangedAttackers = getCreeps('rangedAttacker', spawner);

			let increaseParts = 1.0;
			if (getRoomPRCL(spawner) >= 7) {
				increaseParts = 1.0;
			} else if (getRoomPRCL(spawner) >= 6) {
				increaseParts = 1.5;
			} else if (getRoomPRCL(spawner) >= 5) {
				increaseParts = 2.0;
			} else {
				increaseParts = 2.5;
			}


			let maxSupportedAttackers = 5 * increaseParts;
			if (Game.rooms[spawner].energyStatus() > ECONOMY_DEVELOPING || canSpawnAgain(spawner)
			) {
				setRangedAttackersSpawnTime(spawner, 450);
			} else {
				maxSupportedAttackers = Math.max(Math.ceil(Game.rooms[spawner].store(RESOURCE_ENERGY) / Game.rooms[spawner].wantedEnergyfPRCL() ), 1);
			//	console.log("calced max RA " + maxSupportedAttackers + " current energy " + Game.rooms[spawner].store(RESOURCE_ENERGY) + "/" + Game.rooms[spawner].wantedEnergyfPRCL() )
			}

			

		//	console.log(spawner + " cehcking RA,  " + rangedAttackers.length + "/"+ maxSupportedAttackers + " spawning " + isSpawningAttackers(spawner) + " energy " +Game.rooms[spawner].energyStatus() )
			let spawnLoad = spawnLoadByCreeps(spawner, rangedAttackers);
			if (rangedAttackers.length < maxSupportedAttackers && 
				(spawnLoad < 0.4 || 
				isSpawningAttackers(spawner))
				){
			//	log(spawner + " spawning RA! " +rangedAttackers.length + "/"+ maxSupportedAttackers )
				let parts;
				let allRangedAttackers = getCreeps('rangedAttacker');
			//	let requiredSpawnerLevel = Math.min(Memory.myRoomHighPRCL, 7);
				for (let room in Memory.attackTarget) {
					
					if (!Memory.attackTarget[room].assignedSpawn[spawner]) { continue; }
					if (roomIsAvoided(room)) { continue; }
					if (roomIsSafeModed(room) > 500) { continue; }
					if (Memory.rooms[room] && Memory.rooms[room].player && ALLIES[Memory.rooms[room].player])	{ continue; }
					if (playerIsDead(getPlayerByRoomName(room))) { continue; }				
							
					let requiredAttackers = 2 * increaseParts;

					if (SEASONAL_PASSIVE_MODE && Memory.rooms[room].mineOnly && !Memory.rooms[room].hostiles) {
						requiredAttackers = Math.min(requiredAttackers, 1);
					}


					if (Memory.rooms[room]) {
						if (Memory.rooms[room].hostileRoom && getRoomRCL(room) >= 3 && Memory.rooms[room]._breachPos) {	// ROOM IS BREACHED, CLEAR IT	
				
							requiredAttackers = 5 * increaseParts;			
						} else if (getRoomPRCL(room) > 1 && !Memory.rooms[room].myRoom) {	// ATTACK ENEMY BASE
							requiredAttackers = 6 * increaseParts; // 6
						} else if (Memory.rooms[room].myRoom) { // DEFEND MY ROOM
							if(Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.defensive > 100) {
								parts = createBodyPartsRangedAttacker(price);
								let myPower = calcBodyStrength(parts)
								requiredAttackers = Math.min(6, Math.ceil(Memory.rooms[room].hostiles.power.defensive/myPower.defensive) );
							} else {
								requiredAttackers = 4 * increaseParts;
							}
						} else if (Memory.rooms[room][R.MY_MINING_OUTPOST] || 
								Memory.rooms[room].needsGrouping ||
								(Memory.rooms[room].hostiles && Memory.rooms[room].player)
							){
							parts = createBodyPartsRangedAttacker(price);
							let myPower = calcBodyStrength(parts)
	
							if (Memory.rooms[room].hostiles) {
								if( Memory.rooms[room].hostiles.power.defensive > myPower.defensive*5) { continue; }	// SKIP DEFENDED REMOTE

								requiredAttackers = Math.ceil((Memory.rooms[room].hostiles.power.defensive * 1.1) / myPower.defensive);
								log(room+ " estimated required RA defenders in room " + requiredAttackers + " power " + myPower.defensive +"/" +  Memory.rooms[room].hostiles.power.defensive)
							}						
						} else if (Memory.rooms[room].player && getRoomPRCL(room) === 0 && getCurrentDefensiveStrength(room) === 0 && Game.rooms[room] && roomHp(Game.rooms[room]) === 0) {
							// spawn smaller creeps for cleared undefended room
							let avgStrength = getAverageStrength(room);
	
							parts = createBodyPartsRangedAttacker(price);
							let attackerPower = calcBodyStrength(parts);
	
							if (avgStrength < attackerPower) {
								let myCost = getBodyCostArray(parts)
								let safety = 1.2;
								energySpend = limit(Math.ceil(((avgStrength*safety) / attackerPower) * myCost), 600, price)
					
							}
						} else {
							if (getCurrentDefensiveStrength(room) === 0 && Game.rooms[room] && roomHp(Game.rooms[room]) < 15000) {
								// spawn smaller creeps for cleared undefended room
								let avgStrength = getAverageStrength(room);

								parts = createBodyPartsRangedAttacker(price);

								let attackerPower = calcBodyStrength(parts);
								let myPower = attackerPower.defensive

								if (avgStrength < myPower) {
									let myCost = getBodyCostArray(parts)
									let safety = 1.2;
									price = limit(Math.floor(((avgStrength*safety) / myPower) * myCost), 600, price)
								}

								log(room + " spawning small ra! cost " + price +"/" + price + " avg " + avgStrength + "/" + myPower)
							}

							requiredAttackers = 1;
						}
					}

					let energySpend = price;
					
					if (energySpend < 250) {
						log("rangedAttacker energySpend to low! "+ energySpend+ "  want to attack room " +room)
					}

					
					let attackers = _.filter(allRangedAttackers, (creep) => creep._memory[C.ROOM_TARGET] == room);
					let result;
				
				//	Game.rooms[spawner].setBoostMode(true, {XGHO2: 300, XKHO2: 150, XLHO2: 600, XZHO2: 300});
				//	console.log("required " + requiredAttackers + "/" + attackers.length)
					if (preSpawnCreepsCheck(attackers, 50, requiredAttackers) ){
					//	if (requiredAttackers === 1 ) { price = limit(price, 0, 2000); }
						let usedEnergy = Math.min(price, energySpend)
						parts = createBodyPartsRangedAttacker(usedEnergy);	
					//	parts = createMaxBody(price, {tough: 15, ranged_attack: 5, heal: 20, move: 10} );					
						result = myspawns[0].createCreep(parts, 'ra'+makeid(), {[C.ROLE]: 'rangedAttacker', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, attId: Memory.attackTarget[room].attId });
						if (result === OK) {
							console.log(spawner + " Spawning new rangedAttacker, target room: " +room + " requiredAttackers " + attackers.length + "/" + requiredAttackers );
						} else {
							console.log(spawner + " ERROR "+result+ " Spawning new rangedAttacker, target room: " +room + " body " + JSON.stringify(parts)  );

							if (result === ERR_NOT_ENOUGH_ENERGY) {
								log("used energy " + usedEnergy + " / " + myspawns[0].room.energyCapacity + " body cost " + getBodyCostArray(parts))
							}

						}
						return 1;
					}
				}
			}
		}
	}
	return 0;
}

global.roomIsAvoided = function(roomName){
	if (Memory.evalAttackTarget[roomName] && Memory.evalAttackTarget[roomName].avoid) {
		if (Memory.evalAttackTarget[roomName].avoid > Game.time) {		
			return 1;
		}
		delete Memory.evalAttackTarget[roomName];
		requestRoomVision(roomName);
	}
	return 0;
}

function spawnHelpers(spawner, myspawns, energyCap, myRoomsOnly = false, maxHelperParts = 0 ){	
	
	if (Memory.helpNeeded != undefined) {

		if (maxHelperParts > 0) {
			let allHelpers = getCreeps('helper', spawner);
			let currentHelperParts = getBodyparts(allHelpers, WORK);
			if (currentHelperParts >= maxHelperParts) { return 0; }
		}

		for (let room in Memory.helpNeeded) {

			if (!Memory.helpNeeded[room].assignedSpawn[spawner]) { continue; }

			let interShardCreeps = 0;
			let shard = Memory.helpNeeded[room].shard
			if (!shard) {				
				if (Memory.rooms[spawner].sieged) { continue; }				
				if (Game.rooms[spawner].energyStatus() < ECONOMY_LOW && !Memory.rooms[room].myRoom ) { continue; }
				if (myRoomsOnly && !Memory.rooms[room].myRoom ) { continue; }
				if (Memory.rooms[room] && Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.defensive > 50 && !roomIsSafeModed(room)) { continue; }
				if (checkForInvaderCore(room) ) { continue; }
				if (Memory.rooms[room] && !Memory.rooms[room].myRoom && checkTraversedRoomsForHostiles(spawner, room) )  { continue; }
			} else {
				interShardCreeps = countInterShardCreeps(shard, 'helper', room);
			}

			let requiredHelpers = 1;
			let lowRcl = (!Game.rooms[spawner].storage && !Game.rooms[spawner].terminal)			
			if (lowRcl && !myRoomsOnly) {

				if (!Game.rooms[spawner]._cache.helperTimeout) { 
					Game.rooms[spawner]._cache.helperTimeout = Game.time + 300;
				} else if (Game.time < Game.rooms[spawner]._cache.helperTimeout) {
					return 0;
				}
				requiredHelpers = 2;
				Game.rooms[spawner]._cache.helperTimeout = Game.time + 300;
			}
			

			let helpers = _.filter(getCreeps('helper'), (creep) => creep._memory[C.ROOM_TARGET] == room);
			
			let cost = 0;
			if (Memory.rooms[room] && Memory.rooms[room].myRoom == 1){

				let currentWorkParts = getBodyparts(helpers, WORK);
				if (myRoomsOnly && getRoomPRCL(room) < 1 && currentWorkParts < 15) {
					requiredHelpers = helpers.length + 1;
				} else {
					requiredHelpers = 2;
				}

				cost = limit(energyCap, 300, 2000);
				
			} else {

			//	if (helpers.length > 3) { continue; }

				if (ENABLE_SPAWN_EXTENSIONS) {
					cost = limit(getSpawnerBlockEnergy(spawner, true), 300, 1200);
				} else {
					cost = limit(energyCap, 300, 1200);
				}
			}

			
			



			
			
			if (preSpawnCreepsCheck(helpers, 50, requiredHelpers, interShardCreeps) ){
				let parts = createMaxBody(cost, {carry: 1, move: 2, work: 1} );
				myspawns[0].createCreep(parts, 'hlp'+makeid(), {[C.ROLE]: 'helper', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, shard: shard });
				return 1;
			}
		}
	}	
	return 0;
}

function spawnEnergyCarts(spawner, myspawns, energyCap){	
	

	for (let room in Memory.energyCartTargets) {
		if (room === spawner) { continue; }

		let spawnerEcoRequired = ECONOMY_SURPLUS		
		if (Memory.rooms[room].mineOnly) {
			spawnerEcoRequired = ECONOMY_STABLE
		}
		if (Game.rooms[spawner].energyStatus() < spawnerEcoRequired) { continue; }

		let energyTarget = 200000;
		let requiredTransports = 4;
		if (PRAISE_GCL_ROOMS[room]) {
			energyTarget = 500000;
			requiredTransports = 16;
		}
		if (Game.rooms[room] && Game.rooms[room].store(RESOURCE_ENERGY) > energyTarget) { continue; }
		// if (Game.rooms[room] && !Game.rooms[room].storage && !Game.rooms[room].terminal) { continue; }
		
		if (!Memory.energyCartTargets[room].assignedSpawn || !Memory.energyCartTargets[room].assignedSpawn[spawner]) { continue; }
			
		let transports = _.filter(getCreeps('energyTransport', spawner), (creep) => creep._memory[C.ROOM_TARGET] == room);
		if (transports.length < requiredTransports){
			let parts = [];
			
			if (Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.defensive > 50) { continue; }
			if (checkTraversedRoomsForHostiles(spawner, room) )  { continue; }
			parts = createBodyPartCarrier(energyCap, 25);
			
			let bestSpawn = bestSpawnForDest(myspawns, Game.rooms[spawner].storage);
			bestSpawn.createCreep(parts, 'enTr'+makeid(), {[C.ROLE]: 'energyTransport', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, targetRes: RESOURCE_ENERGY });
			return 1;
		}
	}

	for (let room in Memory.lootMission) {
		if (!Memory.lootMission[room].assignedSpawns || !Memory.lootMission[room].assignedSpawns[spawner]) { continue; }
		let requiredTransports = Math.min(Memory.lootMission[room].requiredHaulers || 3, 3);
		let transports = _.filter(getCreeps('looter'), (creep) => creep._memory[C.ROOM_TARGET] == room);
		if (transports.length < requiredTransports){
		
			if (checkTraversedRoomsForHostiles(spawner, room) )  { continue; }
			let parts = createBodyPartCarrier(energyCap, 25);

			myspawns[0].createCreep(parts, 'ltr'+makeid(), {[C.ROLE]: 'looter', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room });
			return 1;
		}
	}

	let requiredTransports = 1;
	for (let source in Memory.caravans) {
		if (source !== spawner) { continue; }

		for (let res in Memory.caravans[source]) {
		//	if (Game.rooms[spawner].store(res) < 20000) { continue; }
			for (let room in Memory.caravans[source][res]) {
				let transports = _.filter(getCreeps('energyTransport', spawner), (creep) => creep._memory[C.ROOM_TARGET] == room && creep._memory.targetRes == res);

				if (transports.length < requiredTransports){
					let parts = [];
				
					if (Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.defensive > 50) { continue; }
					if (checkTraversedRoomsForHostiles(spawner, room) )  { continue; }
				//	parts = createMaxBody(energyCap, {carry: 1, move: 1} );

					parts = createBodyPartCarrier(energyCap, 25);

					let bestSpawn = bestSpawnForDest(myspawns, Game.rooms[spawner].storage);
					
					bestSpawn.createCreep(parts, 'enTr'+makeid(), {[C.ROLE]: 'energyTransport', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, targetRes: res });
					return 1;
				}
			}
		}
	}

	let requiredShardTransports = 1;
	if (Memory.export && exportRoom) {
		for (let room in exportRoom) {
			if (room !== spawner) { continue; }
			
			for (let shard in Memory.export) {
				let transports = _.filter(getCreeps('energyTransport', spawner), (creep) => creep._memory.shard === shard);
				if (transports.length >= requiredShardTransports){ break; }
	
				for (let res in Memory.export[shard]) {
					if (!Memory.export[shard][res].amount) { continue; }
					if (Memory.export[shard][res].inTransit > 0 ) { continue; }

					log("want to export " + res + " to " + shard)
					if (!Memory.export[shard][res].active) { continue; }
					if (Game.rooms[spawner].store[res] < Memory.export[shard][res].amount) { continue; }

					let destRoom = Object.keys(exportRoom[spawner][shard])[0]
					let amount = Math.min(Memory.export[shard][res].amount, maxStoreInRoom(res))
										
					let parts = createBodyPartCarrier(energyCap, 25);

					let bestSpawn = bestSpawnForDest(myspawns, Game.rooms[spawner].storage);

					bestSpawn.createCreep(parts, 'exprt'+makeid(), {[C.ROLE]: 'energyTransport', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: destRoom, targetRes: res, exportAmount: amount, shard: shard, shardOrigin: Game.shard.name });
					return 1;
				}
			}
		}		
	}




	return 0;
}

global.getDepositMinedAmount = function(currentCD){
	return Math.pow(currentCD/DEPOSIT_EXHAUST_MULTIPLY, 1/DEPOSIT_EXHAUST_POW);	
}

global.getCdByMinedAmount = function(harvested) {
	return Math.ceil(DEPOSIT_EXHAUST_MULTIPLY*Math.pow(harvested,DEPOSIT_EXHAUST_POW));
}

global.minedInTicksForDeposit = function(currentCd, harvestPerTick, time) {	
	let initialMinedAmount = getDepositMinedAmount(currentCd);
	let minedAmount = initialMinedAmount;
	while (time > 0) {
		minedAmount += harvestPerTick;
		time -= currentCd;
		currentCd = getCdByMinedAmount(minedAmount);
	}
//	console.log("new cd " + currentCd)
//	console.log("new mined amount " + minedAmount)
	return minedAmount - initialMinedAmount;
}

function getTravelTimeToDeposit(spawner, destRoom, id) {

	if (!Memory.deposits[destRoom] || !Memory.deposits[destRoom].deposit[id]) { 
		log("Missing deposti data! " + destRoom + " id " + id)
		Memory.deposits[destRoom].deposit[id].noTravel = true;
		return 50;
	}

	if (Memory.deposits[destRoom].deposit[id].travelTime === undefined) {
		let dest = Memory.deposits[destRoom].deposit[id].pos

		let pathToDeposit = findTravelPath(Game.rooms[spawner].storage.pos, dest,
			{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:50000});

		if (!pathToDeposit || !pathToDeposit.path) { 
			Memory.deposits[destRoom].deposit[id].travelTime = Infinity; 
			Memory.deposits[destRoom].deposit[id].noTravel = true;
			log("No Path to deposit! " + destRoom + " id " + id)
			return 50;
		}
		Memory.deposits[destRoom].deposit[id].travelTime = pathToDeposit.path.length;		
	}

	return Memory.deposits[destRoom].deposit[id].travelTime 


}

function getRequiredCarryPartsDeposit(currentCd, harvestPower, time) {
	let minedAmount = minedInTicksForDeposit(currentCd, harvestPower, time);
	return Math.ceil(minedAmount / CARRY_CAPACITY);
}

global.wantToMineMineral = function(res, minimal=false){
	if (minimal) {
	//	if(Memory.Minerals && Memory.Minerals.Buy && Memory.Minerals.Buy[res]) { return true; }
		return false;
	} else {
		if (!Memory.Minerals || !Memory.Minerals.Skip || !Memory.Minerals.Skip[res]) { return true; }
	}
	
	return false;
}




function spawnLocalMineralExtractors(spawner, myspawns, energyCap) {
	if (getRoomRCL(spawner) < 6 || Game.rooms[spawner].energyStatus() <= ECONOMY_CRASHED) { return 0; }

	let minerals = Game.rooms[spawner].getMinerals();
	for (let idx in minerals) {
		let mineral = minerals[idx];
		let mineralId = mineral.id;

	
		let wantedMiners = 1;	
		let useEngine = false;
		if (Memory.rooms[spawner].mineOnly || (Memory.Minerals.Buy && Memory.Minerals.Buy[mineral.mineralType])) {
			wantedMiners = 5;
			useEngine = true;
		} else if (getRoomPRCL(spawner) >= 7 && (Game.rooms[spawner].energyStatus() >= ECONOMY_STABLE)) {
			wantedMiners = 3;
		}
	
		let haulersOnly = false;
		if (Memory.assistedMine && Memory.assistedMine[spawner] && Memory.assistedMine[spawner].assignedSpawns && Object.keys(Memory.assistedMine[spawner].assignedSpawns).length > 0) {
			haulersOnly = true;
		}
	
		let result = spawnMineralExtractors(spawner, myspawns, energyCap, spawner, mineralId, wantedMiners, haulersOnly, useEngine)
		if (result) { return result }
	}
}

function getBodyArrayWeight(parts) {
	let weight = 0;
	for (let idx in parts){
		if (parts[idx] === MOVE || parts[idx] === CARRY) { continue;}
		weight++
	}
	return weight;
}

function getBodyWeight(body) {
	let weight = 0;
	for (let idx in body){
		if (body[idx].type === MOVE || body[idx].type === CARRY) { continue;}
		weight++
	}
	return weight;
}

function getQueuedDepositCreeps(destRoom, mineralId) {
	
	if (!Memory.deposits[destRoom] || !Memory.deposits[destRoom].deposit[mineralId] || !Memory.deposits[destRoom].assignedRooms) { return 0; }

	let numberQueued = 0

	for (let spawner in Memory.deposits[destRoom].assignedRooms) {

		if (!Memory.rooms[spawner].spawnQ || Memory.rooms[spawner].spawnQ.length === 0) { continue; }
		for (let idx in Memory.rooms[spawner].spawnQ) {
			if (Memory.rooms[spawner].spawnQ[idx].role !== 'mineralExtractor') { continue; }
			numberQueued++
		}
	}
	return numberQueued;
}

function spawnMineralExtractors(spawner, myspawns, energyCap, destRoom, mineralId, wantedMiners = 1, haulersOnly = false, forceEngine = false) {
	

	if (globalEnergyCrysis() ) { return 0; }
	if (!Memory.rooms[destRoom]) { return 0; }
	if (checkForInvaderCore(destRoom) ) { return 0; }
	if (Memory.rooms[destRoom].hostiles && Memory.rooms[destRoom].hostiles.power.defensive > 50) { return 0; }
	if (checkTraversedRoomsForHostiles(spawner, destRoom) )  { return 0; }	

	let mineralType
	if (!mineralId) {
		if (Memory.rooms[destRoom].mineral) {
			mineralId = Object.keys(Memory.rooms[destRoom].mineral)[0];
			mineralType = Memory.rooms[destRoom].mineral[mineralId].type;
		} else if (Memory.deposits[destRoom]) {
			mineralId = Memory.deposits[destRoom].id;
		}
	}

	if (!mineralId) {return 0;}
	
	if (!mineralType && mineralId && Memory.rooms[destRoom].mineral && Memory.rooms[destRoom].mineral[mineralId]) {
		mineralType = Memory.rooms[destRoom].mineral[mineralId].type;
	}

	
	if (mineralType && !wantToMineMineral(mineralType)) { 
	//	log(spawner + " skipping mineral " + mineralType + " in room " + destRoom)
		let mineral = Game.getObjectById(mineralId)

		if (mineral && mineral.mineralAmount < 15000) {
			// empty it
		} else {
			return; 
		}
	}

	if (mineralType && DISABLED_TERMINAL && Game.rooms[spawner].store(mineralType) > 250000 && !SEASONAL_THORIUM && mineralType !== RESOURCE_THORIUM) { 
		return;
	}

	if (Memory.rooms[destRoom].mineral && Memory.rooms[destRoom].mineral[mineralId] && Memory.rooms[destRoom].mineral[mineralId].minePos === undefined) {
		let mineral = Game.getObjectById(mineralId);
		if (mineral)  {
			Memory.rooms[destRoom].mineral[mineralId].minePos = mineral.getNumberOfMiningPos();	
		}
	}

	let possibleMiners = 1
	let isMineral, isDeposit;
	let lastCd = 0;
	if (Memory.rooms[destRoom].mineral && Memory.rooms[destRoom].mineral[mineralId]) {
		possibleMiners = Memory.rooms[destRoom].mineral[mineralId].minePos || 1;
		isMineral = true;
	} else if (Memory.deposits[destRoom] && Memory.deposits[destRoom].deposit[mineralId]) {
		possibleMiners = Memory.deposits[destRoom].deposit[mineralId].minePos || 1;
		lastCd = Memory.deposits[destRoom].deposit[mineralId].lastCooldown || 0;
		isDeposit = true;
	}

	wantedMiners = Math.min(wantedMiners, possibleMiners);		

	if (mineralOnCd(destRoom, mineralId) < 100 ){
		if (Memory.rooms[destRoom].myRoom ) {
			let mineral = Game.getObjectById(mineralId);
			if (!mineral || !mineral.pos.lookForStructure(STRUCTURE_EXTRACTOR)) {
				return 0;
			}
		}

		if (isMineral) { updateActiveMines(destRoom, mineralId); }

		let parts;

		let mineralExtractors = _.filter(getCreeps('mineralExtractor'), (creep) => creep._memory[C.SOURCE_ID] == mineralId);

		if (isDeposit) {
			let queuedCreeps = getQueuedDepositCreeps(destRoom, mineralId)
			wantedMiners -= queuedCreeps;
		}

		
		let mineralHaulers = _.filter(getCreeps('mineralMover'), (creep) => creep._memory[C.SOURCE_ID] == mineralId);
		if (destRoom === spawner && haulersOnly) {
			mineralHaulers = _.filter(mineralHaulers, (creep) => creep.room.name === destRoom)
		}

		

		let skipMiners = false;
		if (SEASONAL_THORIUM && mineralType === RESOURCE_THORIUM) {

			let thorium = Game.getObjectById(mineralId);

			let minThorium = THORIUM_MIN_EXTRACTOR
			if (Memory.rooms[destRoom].mineOnly) { minThorium = THORIUM_MIN_EXTRACTOR / 3} 

			if (!thorium || thorium.mineralAmount < minThorium) { skipMiners = true; }
		}

		if (mineralExtractors.length >= 1 && mineralHaulers.length < 2) {
			skipMiners = true;
		}

		
		if (!isDeposit) {
			let mine = Game.getObjectById(mineralId);
			if (mine) {
				let minePotential = lifeTimeMine(mineralExtractors);
				if (mine.mineralAmount + 250 < minePotential) {
					skipMiners = true;
				}
			}
		}	



		

		if (haulersOnly) {
			// Check if engines are needed!
			let mineralExtractorsWagons = _.filter(mineralExtractors, (creep) => creep._memory[C.WAGON_WEIGHT] !== undefined && creep.room.name === spawner && !creep._memory.engine && !creep._memory[C.TICKS_TO_TARGET]);
			if (mineralExtractorsWagons.length > 0) {
				
				let engines = _.filter(getCreeps('engine'), (creep) => creep.room.name === spawner && !creep._memory.wagonId);

				if (engines.length < mineralExtractorsWagons.length) {
					let engineMemory = {
						[C.ROLE]: 'engine', [C.ROOM_ORIGIN]: spawner
					}

					let weight = getBodyWeight(mineralExtractorsWagons[0].body)
					let engineParts = createBody(energyCap, {move: weight});

					myspawns[0].createCreep(engineParts, 'eL'+makeid(), engineMemory);
					return 1
				}
			}

		} else if (!skipMiners && preSpawnCreepsCheck(mineralExtractors, 85, wantedMiners) ) {
			
			parts = createBodyPartsMineralExtractor(spawner, energyCap, forceEngine);			
			let weight, engineId;
			
			let addEngine;
			let engineParts;
			if (isDeposit && getRoomPRCL(spawner) >= CONTROLLER_MAX_LEVEL) {	
				addEngine = true;
				if (isDeposit && lastCd <= 5) {
					parts = createMaxBody(energyCap, {work: 8, carry: 2});
				} else {

					parts = createMaxBody(energyCap, {work: 9, carry: 1});
				}				
			} else if (forceEngine) {
				addEngine = true;
			}

			let spawnEngine = false;
			if (addEngine) {
				weight = getBodyArrayWeight(parts);
				engineParts = createBody(energyCap, {move: weight});
				
				let engines = _.filter(getCreeps('engine'), (creep) => (creep.room.name === spawner && (!creep._memory.wagonId || creep._memory.wagonDestRoom === spawner)) );

				if (engines.length <= 0 || engines[0].body.length < weight) {
					spawnEngine = true;
				} else {
				//	engineId = engines[0].id;
				}
			}

			let bestSpawn = myspawns[0];
			if (destRoom === spawner) {
				bestSpawn = bestSpawnForDest(myspawns, Game.getObjectById(mineralId));
			}
			
			
			let mnExMemory = {[C.ROLE]: 'mineralExtractor', [C.ROOM_ORIGIN]: spawner, [C.SOURCE_ID]: mineralId, [C.WAGON_WEIGHT]: weight, [C.ROOM_TARGET]: destRoom, engineId: engineId }
			if (spawnEngine) {

				let engineMemory = {
					[C.ROLE]: 'engine', [C.ROOM_ORIGIN]: spawner
				}
				bestSpawn.createCreep(engineParts, 'e'+makeid(), engineMemory);
				myspawns[0].addToQ(parts, 'mnEx'+makeid(), mnExMemory, 200);

			} else {
				bestSpawn.createCreep(parts, 'mnEx'+makeid(), mnExMemory);
			}
						

			let workParts = countBodyparts(parts, WORK);

			let requiredCarryParts = 5;

			let haluerOrigin = spawner;
			if (isDeposit && Memory.deposits[destRoom]) {
				haluerOrigin = Object.keys(Memory.deposits[destRoom].assignedRooms)[0]
			} else if (Game.rooms[destRoom] && Game.rooms[destRoom].terminal) {
				haluerOrigin = destRoom
			}
			
			if (isMineral) {
				requiredCarryParts = getRequiredCarryPartsMineral(haluerOrigin, mineralId, workParts * wantedMiners );
			} else {				
				let travelTime = getTravelTimeToDeposit(haluerOrigin, destRoom, mineralId)
				requiredCarryParts = getRequiredCarryPartsDeposit(lastCd, workParts * wantedMiners, travelTime)
			}

			if (skipMiners && mineralExtractors.length === 0) {
				requiredCarryParts = 0;
			}

			let currentHaulParts = getBodyparts(mineralHaulers, CARRY);
			let prespawnTicks = 35
			let energyCarrier = energyCap;
			if (SEASONAL_THORIUM && mineralType && mineralType === RESOURCE_THORIUM) {
				prespawnTicks = 350;
				energyCarrier = Math.min(energyCap, 1600)
			}
			
			if (requiredCarryParts > 0 && (mineralHaulers.length <= 0 || currentHaulParts < requiredCarryParts || preSpawnCreepsCheck(mineralHaulers, prespawnTicks, mineralHaulers.length))) {

				// ADD mineralHaulers TO Q
				
				parts = createBodyPartCarrier(energyCarrier, requiredCarryParts);

				let pbMemory = {[C.ROLE]: 'mineralMover', [C.ROOM_ORIGIN]: haluerOrigin, [C.ROOM_TARGET]: destRoom, [C.SOURCE_ID]: mineralId};
				myspawns[0].addToQ(parts, 'mnMvQ'+makeid(), pbMemory, 200);
			}
			return 1;
		} else if (forceEngine) {
			// Check if engines are needed!

			let mineralExtractorsWagons = _.filter(mineralExtractors, (creep) => (creep._memory[C.WAGON_WEIGHT] !== undefined && creep.room.name === spawner && !creep._memory.engine && !creep._memory[C.TICKS_TO_TARGET]));

			if (mineralExtractorsWagons.length > 0) {
				
				let engines = _.filter(getCreeps('engine'), (creep) => (creep.room.name === spawner && (!creep._memory.wagonId || creep._memory.wagonDestRoom === spawner)));

				if (engines.length <= 0 || engines[0].body.length < getBodyWeight(mineralExtractorsWagons[0].body)) {
					let engineMemory = {
						[C.ROLE]: 'engine', [C.ROOM_ORIGIN]: spawner
					}

					let weight = getBodyWeight(mineralExtractorsWagons[0].body)
					let engineParts = createBody(energyCap, {move: weight});

					myspawns[0].createCreep(engineParts, 'eL'+makeid(), engineMemory);
					return 1
				}
			}
		}

		if (mineralExtractors.length <= 0) { return; }

		let currentHaulParts = getBodyparts(mineralHaulers, CARRY);

		let workParts = mineralExtractors[0].getActiveBodyparts(WORK);

		let requiredCarryParts;

		let haluerOrigin = spawner;
		if (isDeposit && Memory.deposits[destRoom]) {
			haluerOrigin = Object.keys(Memory.deposits[destRoom].assignedRooms)[0]
		} else if (Game.rooms[destRoom] && Game.rooms[destRoom].terminal) {
			haluerOrigin = destRoom
		}

		if (isMineral) {
			requiredCarryParts = getRequiredCarryPartsMineral(haluerOrigin, mineralId, workParts * wantedMiners );
		} else {
			let travelTime = getTravelTimeToDeposit(haluerOrigin, destRoom, mineralId)
			requiredCarryParts = getRequiredCarryPartsDeposit(lastCd, workParts * wantedMiners, travelTime)
		}

		let prespawnTicks = 35
		let energyCarrier = energyCap;
		if (SEASONAL_THORIUM && ((mineralType && mineralType === RESOURCE_THORIUM) || haulersOnly)) {
			prespawnTicks = 350;
			energyCarrier = Math.min(energyCap, 1600);
		}

	//	log(destRoom + " mineral hauler  parts " + currentHaulParts + "/" + requiredCarryParts )
		if (requiredCarryParts > 0 && (preSpawnCreepsCheck(mineralHaulers, prespawnTicks, 2) || currentHaulParts < requiredCarryParts )) {

			parts = createBodyPartCarrier(energyCarrier, requiredCarryParts);

			let bestSpawn = myspawns[0]
			if (destRoom === spawner) {
				bestSpawn = bestSpawnForDest(myspawns, Game.getObjectById(mineralId));	
			}

			bestSpawn.createCreep(parts, 'mnMv'+makeid(),
				{[C.ROLE]: 'mineralMover', [C.ROOM_ORIGIN]: haluerOrigin, [C.ROOM_TARGET]: destRoom, [C.SOURCE_ID]: mineralId});
			return 1;
		}
	}
	return 0;
}

function lifeTimeMine(miners) {
	let harvest = 0;
	for (let idx in miners) {
		let creep = miners[idx];
		let ttl = creep.ticksToLive || CREEP_LIFE_TIME;

		let harvestPower = creep.getHarvestPower() || (creep.hasBodyparts(WORK) * HARVEST_MINERAL_POWER)

		harvest = harvestPower * ttl / EXTRACTOR_COOLDOWN
	}

	return harvest
}

global.getPathTime = function(path, plainCost=1, swampCost=5) {
	let cost = 0;
	for (let idx in path) {
		let pos = path[idx];
		let terrain = getRoomTerrainAt(pos.x, pos.y, pos.roomName);
		let tileCost = plainCost
		if (terrain === TERRAIN_MASK_SWAMP && (!Game.rooms[pos.roomName] || !pos.lookForStructure(STRUCTURE_ROAD))) {
			tileCost = swampCost;
		}
		cost += tileCost;
	}
	// log("path cost " + cost + " of length " + path.length)
	return cost
}

function getRequiredCarryPartsMineral(spawner, mineralId, workParts) {
	if (Memory.rooms[spawner].remoteMine === undefined) { Memory.rooms[spawner].remoteMine = {}; }
	if (Memory.rooms[spawner].remoteMine[mineralId] === undefined) {
		let obj = Game.getObjectById(mineralId);
		if(!obj) { return; }
		let pathToSource;
		if (Game.rooms[spawner].terminal) {
			pathToSource = findTravelPath(Game.rooms[spawner].terminal.pos, obj.pos,
				{range: 1, ignoreCreeps: true, maxOps:50000, uncompressed: true});
		//	pathToSource = PathFinder.search(Game.rooms[spawner].terminal.pos, {pos: obj.pos, range: 1});
		} else if (Game.rooms[spawner].storage) {
			pathToSource = findTravelPath(Game.rooms[spawner].storage.pos, obj.pos,
				{range: 1, ignoreCreeps: true, maxOps:50000, uncompressed: true});
			//pathToSource = PathFinder.search(Game.rooms[spawner].storage.pos, {pos: obj.pos, range: 1});
		}
		if (!pathToSource || !pathToSource.path) { return; }
		Memory.rooms[spawner].remoteMine[mineralId] = {};
		Memory.rooms[spawner].remoteMine[mineralId].dist = getPathTime(pathToSource.path);
	}	

	let requiredCarry = Math.ceil((Memory.rooms[spawner].remoteMine[mineralId].dist * (workParts*HARVEST_MINERAL_POWER/EXTRACTOR_COOLDOWN))/CARRY_CAPACITY)+1;
	return requiredCarry || 1;
}


function createBodyPartsRemoteUpgrader(energyCap) {
	let arr = [];
    let currentCost = 0;
    let tempCost = 0;



	arr.push(CARRY);
	currentCost = currentCost + BODYPART_COST[CARRY];
	arr.push(CARRY);
	currentCost = currentCost + BODYPART_COST[CARRY];	

    while (currentCost <= energyCap ){
        tempCost = currentCost;

        if (arr.length <= 48 && (currentCost + BODYPART_COST[WORK] + BODYPART_COST[MOVE]) <= energyCap){
            currentCost +=  BODYPART_COST[WORK];
            arr.push(WORK);
			currentCost +=  BODYPART_COST[MOVE];
			arr.push(MOVE);
        }
			
        if (tempCost == currentCost || arr.length > 48) {
            break;
        }
    }
    return arr.reverse();
}


function createBodyPartsMineralExtractor(spawner, energyCap, useEngine = false) {
	let arr = [];
    let currentCost = 0;
    let tempCost = 0;

	if (!useEngine) {	// move yourself
		arr.push(MOVE);
		currentCost = currentCost + BODYPART_COST[MOVE];
		
		arr.push(CARRY);
		currentCost = currentCost + BODYPART_COST[CARRY];
		arr.push(CARRY);
		currentCost = currentCost + BODYPART_COST[CARRY];		
	}

	arr.push(CARRY);
	currentCost = currentCost + BODYPART_COST[CARRY];
	arr.push(CARRY);
	currentCost = currentCost + BODYPART_COST[CARRY];
	

    while (currentCost <= energyCap ){
        tempCost = currentCost;

		if (!useEngine) {
			if (arr.length <= 49 && (currentCost + BODYPART_COST[MOVE]) <= energyCap){
				currentCost +=  BODYPART_COST[MOVE];
				arr.push(MOVE);
			}
		}
		
        if (arr.length <= 49 && (currentCost + BODYPART_COST[WORK]) <= energyCap){
            currentCost +=  BODYPART_COST[WORK];
            arr.push(WORK);
        }		
		if (arr.length <= 49 && (currentCost + BODYPART_COST[WORK]) <= energyCap){
            currentCost +=  BODYPART_COST[WORK];
            arr.push(WORK);
		}
		if (arr.length <= 49 && (currentCost + BODYPART_COST[WORK]) <= energyCap){
            currentCost +=  BODYPART_COST[WORK];
            arr.push(WORK);
		}
		if (arr.length <= 49 && (currentCost + BODYPART_COST[WORK]) <= energyCap){
            currentCost +=  BODYPART_COST[WORK];
            arr.push(WORK);
        }
		
        if (tempCost == currentCost || arr.length > 48) {
            break;
        }
    }

	



    return arr.reverse();
}

function spawnClaimers(spawner, myspawns, energyCap){
	let claimers = [];
	if (Memory.expansionTarget[NEXT_EXPANSION] && 
		Memory.expansionTarget[NEXT_EXPANSION].assignedClaimer === spawner && 
		!globalEnergyCrysis()
	) { // &&  Memory.rooms[Memory.rooms[spawner].expansionNext.roomName].myRoom != 1) {
		let targetRoom = Memory.expansionTarget[NEXT_EXPANSION].roomName;
		if (!Memory.rooms[targetRoom] || !Memory.rooms[targetRoom].myRoom) {

			console.log(spawner + " want to claim! " + targetRoom)
			if (BOT_MODE) {

								
				let attackers = _.filter(getCreeps('invaderKiller'), (creep) => creep._memory[C.ROOM_TARGET] == targetRoom);
				if (checkForInvaderCore(targetRoom) && preSpawnCreepsCheck(attackers, 50, 2)) {
					let parts = createMaxBody(energyCap, {attack: 1, move: 1});
					myspawns[0].createCreep(parts, 'ik'+makeid(), {[C.ROLE]: 'invaderKiller', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom });
					console.log("claim! spawning invaderKiller ");
					return 1;
				}
				
				if (!SEASONAL_SYMBOLS){	
					let requiredAttackers = 1;			
					attackers = _.filter(getCreeps('rangedAttacker'), (creep) => creep._memory[C.ROOM_TARGET] == targetRoom);			
					if (!Memory.expansionTarget[NEXT_EXPANSION].spawnedAttacker && preSpawnCreepsCheck(attackers, 50, requiredAttackers) ){
						let parts = createBodyPartsRangedAttacker(energyCap);
						myspawns[0].createCreep(parts, 'ra'+makeid(), {[C.ROLE]: 'rangedAttacker', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom });
						console.log("claim! spawning attacker ");
						Memory.expansionTarget[NEXT_EXPANSION].spawnedAttacker = 1;
						return 1;
					}
				}

				let requiredHelpers = 1;
				let helpers = _.filter(getCreeps('helper'), (creep) => creep._memory[C.ROOM_TARGET] == targetRoom);
				if (!Memory.expansionTarget[NEXT_EXPANSION].spawnedHelper && preSpawnCreepsCheck(helpers, 50, requiredHelpers) ){
					let parts = createMaxBody(energyCap, {carry: 1, move: 2, work: 1} );
					myspawns[0].createCreep(parts, 'hlp'+makeid(), {[C.ROLE]: 'helper', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom });
					console.log("claim! spawning helpers ");
					Memory.expansionTarget[NEXT_EXPANSION].spawnedHelper = 1;
					return 1;
				}
			}

			claimers = _.filter(getCreeps('claimer', spawner), (creep) => creep._memory[C.ROOM_TARGET] == targetRoom);
					
			if (claimers.length <= 0)   {	//spawn
				if (energyCap < 850) { return 0; }
				
				let parts = [MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM]
				if (checkForInvaderCore(targetRoom) || (Memory.rooms[targetRoom].RCLreserved &&  Memory.rooms[targetRoom].RCLreserved.username !== Memory.username)) {
					parts = createReserverBody(energyCap, 5);
				} 
				myspawns[0].createCreep(parts, 'clR'+makeid(), {[C.ROLE]: 'claimer', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom, claim:1, shard: Memory.expansionTarget[NEXT_EXPANSION].shard });			
				console.log(spawner +' Spawning new Claimer, target room (claim): ' +targetRoom );				
				return 1;
			}

			let requiredHelpers = 2;
			let helpers = _.filter(getCreeps('helper'), (creep) => creep._memory[C.ROOM_TARGET] == targetRoom);
			if (preSpawnCreepsCheck(helpers, 50, requiredHelpers) ){
				let parts = createMaxBody(energyCap, {carry: 1, move: 2, work: 1} );
				myspawns[0].createCreep(parts, 'hlp'+makeid(), {[C.ROLE]: 'helper', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom });
				console.log("claim! spawning helpers ");
				Memory.expansionTarget[NEXT_EXPANSION].spawnedHelper = 1;
				return 1;
			}



			return // suspend other claimers!
		}
    }

	
	
    if (Memory.controllerAttack && Game.rooms[spawner].energyStatus() >= ECONOMY_DEVELOPING){
		claimers = getCreeps('claimer');
    	for (let room in Memory.controllerAttack){

    		if (Memory.controllerAttack[room].assignedRooms && Memory.controllerAttack[room].assignedRooms[spawner]) {

				if (roomIsSafeModed(room) > 100) { continue; }
				if (Memory.rooms[room].player && ALLIES[Memory.rooms[room].player])	{ continue; }
				if (Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.defensive > 50) { continue; }
				if (Memory.rooms[room].numberOfTowers > 0) { continue; }
				if (checkTraversedRoomsForHostiles(spawner, room) )  { continue; }

				let controllerBlocker = roomIsControllerBlocked(room)
				if (controllerBlocker > CREEP_CLAIM_LIFE_TIME) { continue; }
				if (playerIsDead(getPlayerByRoomName(room))) { continue; }
				
				let ReqClaimers = limit(getControllerAttackPositionsCount(room), 0, 2);
				if (ReqClaimers === 0) { continue; }

				let maxClaimParts = 1;
				if (controllerBlocker <= 0) {
					ReqClaimers = 1;
				} else if (Game.rooms[spawner].energyStatus() >= ECONOMY_SURPLUS || blackList[getPlayerByRoomName(room)]) {
					maxClaimParts = 19;
					ReqClaimers = 1;
				} else if (Game.rooms[spawner].energyStatus() >= ECONOMY_RICH) {
					maxClaimParts = 10;
				} else if (Game.rooms[spawner].energyStatus() >= ECONOMY_STABLE) {
					maxClaimParts = 5;
				}
				
				let attackClaimers = _.filter(claimers, (creep) => creep._memory[C.ROOM_TARGET] === room);
    			if (attackClaimers.length < ReqClaimers) {

					let parts = createReserverBody(energyCap, maxClaimParts);
					myspawns[0].createCreep(parts, 'clm'+makeid(), {[C.ROLE]: 'claimer', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, claimerId: attackClaimers.length, claimerTotal: ReqClaimers });
					if (Memory.controllerAttack[room].assignedRooms[spawner].spawnCount === undefined) { Memory.controllerAttack[room].assignedRooms[spawner].spawnCount = 0;}
					
					return 1;
	    		}
    		}
    	}
	}

	if (Object.keys(Memory.claimExplode).length > 0) {
		claimers = getCreeps('claimer');
		for (let room in Memory.claimExplode){
			if (!Memory.claimExplode[room].assignedSpawn[spawner]) { continue; }
			let explodeClaimers = _.filter(claimers, (creep) => creep._memory[C.ROOM_TARGET] == room);
			if (explodeClaimers.length <= 0) {
			//	let parts = createReserverBody(energyCap, 12);				
			//	myspawns[0].createCreep(parts, 'claimer'+makeid(), {[C.ROLE]: 'claimer', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room});				
				myspawns[0].createCreep([MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM], 'clm'+makeid(), {[C.ROLE]: 'claimer', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room});	
				delete Memory.claimExplode[room];
				return 1;
			}
		}
	}

	if (PRAISE_GCL_ROOMS[spawner] && PRAISE_GCL_ROOMS[spawner].unclaim) {
		let gclClaimers = _.filter(claimers, (creep) => creep._memory[C.ROOM_TARGET] == spawner);
		if (gclClaimers.length <= 0) {
			myspawns[0].createCreep([MOVE, CLAIM], 'clm'+makeid(), {claim: 1, [C.ROLE]: 'claimer', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: spawner});
			return 1;
		}
	}
	return 0;
}

global.checkForInvaderCore = function(roomName) {
	
	let safeCoreTs = Game.time + 1250;
	if (Memory.rooms[roomName] && Memory.rooms[roomName].invaderCore && 
		((Memory.rooms[roomName].invaderCore.deploy && Memory.rooms[roomName].invaderCore.deploy < safeCoreTs) ||
		(!Memory.rooms[roomName].invaderCore.deploy && Memory.rooms[roomName].invaderCore.ts > Game.time ))
	) {
		return true;
	}
	return false;
}

global.checkTraversedRoomsForHostiles = function(fromRoom, toRoom) {
	let roomsTraversed = getRoomsTraversed(fromRoom, toRoom);
	if (roomsTraversed === undefined) { return 1; }
	for(let room in roomsTraversed) {
		if (room === toRoom || room === fromRoom) { continue; }
		let roomObj = Memory.rooms[room];
		if (roomObj && roomObj.hostiles && roomObj.hostiles.power && roomObj.hostiles.power.defensive > 0 && roomObj.isPlayer){ return 1; }	
		if (roomObj && roomObj.invaderCore && roomObj.invaderCore.level > 0) { return 1; }
	}
	return 0;
}

function getRoomEnergyCap(roomName) {
	
	if (!Memory.rooms[roomName].isAttacked) {
		return Game.rooms[roomName].energyCapacityAvailable;
	}

	let energy = Game.rooms[roomName].energyCapacityAvailable;
	
	let sources = Game.rooms[roomName].find(FIND_SOURCES)
	for (let idx in sources){	
		let sourceExtensions = sources[idx].getSourceExtensions();
		for (let idx2 in sourceExtensions){	
			let ext = Game.getObjectById(sourceExtensions[idx2]);
			if (!ext) { continue; }
			energy -= ext.store.getFreeCapacity(RESOURCE_ENERGY);
		}
	}

	return energy;
}


function spawnStartupMiners(spawner, energyCap, myspawns, room, minimumRemotes){
	let allStartupMiners = getCreeps('startupMiner', spawner);
	
	let numberOfSources = 0;
	for (let sourceId in Memory.rooms[spawner].remoteMineOps[room].sources) {


		if (minimumRemotes && numberOfSources >= minimumRemotes) { return; }

		
		
		
		updateActiveMines(spawner, sourceId);
		let startupMiners = _.filter(allStartupMiners, (creep) => creep._memory[C.SOURCE_ID] == sourceId);
		let maxExtracors = 3;
		let source = Game.getObjectById(sourceId);
		if (source) {
			maxExtracors = source.getNumberOfHarvestPos();
		}

		let wantedExtractors = (Memory.rooms[spawner].adjStmn || 1) * maxExtracors * 2;
		if (startupMiners.length > wantedExtractors) { continue; } 

		let currentCarryParts = getBodyparts(startupMiners, CARRY);
		let requiredCarryParts = calcRequiredCarryParts(spawner, sourceId, room);
	//	console.log(room + " startupminers " + currentCarryParts + "/" + requiredCarryParts);
		
					
		if 	(currentCarryParts < requiredCarryParts) {				
			
			let parts;
			if (energyCap <= 350) {
				parts = createMaxBody(energyCap, {move: 2, carry: 1, work: 1} );
			} else {
				parts = createMaxBody(Math.min(energyCap, 700), {move: 3, carry: 2, work: 1} );
			}
			
			myspawns[0].createCreep(parts, 'stMn'+makeid(), {[C.ROLE]: 'startupMiner', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, [C.SOURCE_ID]: sourceId});				
			return 1;
		}
		numberOfSources++;
	}
}


global.addToBlackList = function(player) {
	if (Memory.blackList === undefined) {
		Memory.blackList = {}		
	}

	Memory.blackList[player] = {}
	Memory.blackList[player].ts = Game.time + 250000;

	global.blackList[player] = {}
}

global.initBlacklist = function() {
	for (let player in Memory.blackList) {
		if (Game.time > Memory.blackList[player]) {
			delete Memory.blackList[player]
			continue;
		}
		global.blackList[player] = {}
	}
}




global.safeToSpawnRemote = function(spawner, roomName) {

	let roomObj = Memory.rooms[roomName];	

	if (checkForInvaderCore(roomName) ) {
	//	log(roomName + " Skipping remote, has invader core! ticks remaining " + (Memory.rooms[roomName].invaderCore.ts - Game.time))
		requestActiveMine(roomName);
		return false;
	}

	// owned room, spawned in my remote?
	if (roomObj && getRoomRCL(roomName) > 0 && roomObj.player) { 
		addToBlackList(roomObj.player)
		addRage(roomObj.player, 5000)
		return false;
	}
	
	if (roomObj && roomObj.hostiles && roomObj.hostiles.power && roomObj.hostiles.power.defensive > 0){ // && roomObj.isPlayer ){ 

		let attacker
		if (roomObj.isPlayer) {
			attacker = roomObj.isPlayer
		} else if (roomObj.hostiles.invaders) {
			attacker = 'Invader'
		}

		console.log(spawner +" remote " +roomName + " is under attack by " + attacker + " skipping remote");

		if (Game.time > roomObj.hostileTs + 1500) { 
			delete roomObj.hostiles
		} else if (Game.time > roomObj.hostileTs + 750) { 
			requestRoomVision(roomName);
		} 
		return false;
	}

	if (checkTraversedRoomsForHostiles(spawner, roomName) )  {	
		return false;
	}

	return true;
} 

function wantStartupMiners(spawner, targetRoom) {
	if (roomIsAvoided(targetRoom) ) { return true; }
	/*
	if (getRoomPRCL(spawner) >= 3 ) { return false; }

	if (Game.rooms[spawner].getSpawnContainers().length >= 2 && Game.rooms[spawner].getControllerContainer().length >= 1) {
		return false;
	}
	return true;
	*/
}

function spawnRemoteSources(spawner, energyCap, myspawns, minimumRemotes){

	let assignedOutposts = 0;
	let parts;

	if (minimumRemotes === undefined) {
		let allSpawns = Game.rooms[spawner].findByType(STRUCTURE_SPAWN);
		minimumRemotes = 2.0 * allSpawns.length;
	}

	let epsCutOff = 0;
	if (Memory.worstEps !== undefined) {
		epsCutOff = Memory.worstEps;
	}

	let costClaimer, claimerBudget;

	for(let room in Memory.rooms[spawner].remoteMineOps) {
		
		if (Memory.remoteAttacked && Memory.remoteAttacked[room] && minimumRemotes) { 
			assignedOutposts += 1;	// ALLOW DEFENDERS TO SPAWN
		}

		if (assignedOutposts >= minimumRemotes){ return 0; }

		if (Memory.rooms[spawner].remoteMineOps[room].suspended) { 
			// Everything after this room is also suspended
			return 0;
		}

		if (Memory.rooms[spawner].remoteMineOps.eps < epsCutOff) { return 0; }
				
		if (!safeToSpawnRemote(spawner, room) ) {
			if (Memory.rooms[spawner].remotesAttacked === undefined) { Memory.rooms[spawner].remotesAttacked = {}; }
			if (Memory.rooms[spawner].remotesAttacked[room] === undefined) {
				Memory.rooms[spawner].remotesAttacked[room] = {};
				Memory.rooms[spawner].remotesAttacked[room].ts = Game.time + 300;	// when to start bigger defences
			}
			continue;
		}

		if (Memory.rooms[spawner].remotesAttacked) {
			delete Memory.rooms[spawner].remotesAttacked[room];
		}

		let roomObj = Memory.rooms[room];
		if (!roomObj || roomObj.ts === Game.time) {	// already spawned this tick
			continue; 
		}

		if (roomObj.RCLreserved && roomObj.RCLreserved.username !== Memory.username) { 
		//	if (roomObj.RCLreserved.username === 'Invader' && )
			continue; 
		}

		if (SEASONAL_THORIUM && roomIsCenter(room) && Memory.reactors[room] && Memory.reactors[room].active) { continue; }

		if (wantStartupMiners(spawner, room)) {

			if (Memory.rooms[room].RCLreserved && Memory.rooms[room].RCLreserved.username !== Memory.username) { continue; }

			if (spawnStartupMiners(spawner, energyCap, myspawns, room, minimumRemotes) ){
				return 1;
			} else {
				roomObj.ts = Game.time;
			}
		} else {					
						
			if (roomIsSk(room)) {
				let keeperKiller = _.filter(getCreeps('keeperKiller'), (creep) => creep._memory[C.ROOM_TARGET] == room);	
				if (preSpawnCreepsCheck(keeperKiller, 100)){
				//	parts = createMaxBody(energyCap, {move: 25, attack: 15, ranged_attack: 5, heal: 5} );		
					parts = createMaxBody(energyCap, {move: 23, attack: 18, heal: 5} );
					myspawns[0].createCreep(parts, 'kpK'+makeid(), {[C.ROLE]: 'keeperKiller', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room});					
					return 1;
				}
			}
			
			for (let mineralId in Memory.rooms[spawner].remoteMineOps[room].mineral) {
				updateActiveMines(spawner, mineralId);
				Memory.rooms[spawner].remoteMineOps[room].mineral[mineralId].ts = Game.time + 3000;	

				let wantedMiners = 1;				
				if (getRoomPRCL(spawner) >= CONTROLLER_MAX_LEVEL) {
					wantedMiners = 3;
				}

				if (spawnMineralExtractors(spawner, myspawns, energyCap, room, mineralId, wantedMiners) ) {
					return 1;
				}
			}

			for (let sourceId in Memory.rooms[spawner].remoteMineOps[room].sources) {

				updateActiveMines(spawner, sourceId, true);
				let extractors = _.filter(getCreeps('extractor', spawner), (creep) => creep._memory[C.SOURCE_ID] == sourceId);
				

				if (preSpawnCreepsCheck(extractors, 15)){

					let addBodyParts = 0;
					if (getRoomPRCL(spawner) >= 5) {
						let cpuLimit = isCpuLimited()
						if (cpuLimit >= CPU_SAVING_HIGH) {
							addBodyParts = 8; 
						} else if (cpuLimit >= CPU_SAVING_MEDIUM) {
							addBodyParts = 6; 
						} else if (cpuLimit >= CPU_SAVING_LOW) { 
							addBodyParts = 4; 
						}
					}
					
					if (energyCap < 500) {
						parts = createBodyExtractorAdd(energyCap, 6);
					} else {
						parts = createBodyPartsExtractor(energyCap, sourceId, addBodyParts);
					}

					myspawns[0].createCreep(parts, 'ext'+makeid(), {[C.ROLE]: 'extractor', [C.ROOM_ORIGIN]: spawner, [C.SOURCE_ID]: sourceId, [C.ROOM_TARGET]: room});				
					return 1;
				} else {	
					if (energyCap < 700 || (extractors[0].body.length < 10 && extractors[0].ticksToLive < 250)) {
						
						let wantedharvestParts = 6;
						let maxExtracors = 1;
						let extractorAdd = [];

						let source = Game.getObjectById(sourceId);
						if (source) {
							maxExtracors = source.getNumberOfHarvestPos();
							wantedharvestParts = (source.energyCapacity / ENERGY_REGEN_TIME) / HARVEST_POWER;							
						}

						let harvestParts = getBodyparts(extractors, WORK);
						extractorAdd = _.filter(getCreeps('extractorAdd', spawner), (creep) => creep._memory[C.SOURCE_ID] == sourceId);
						harvestParts += getBodyparts(extractorAdd, WORK);
						let missingHarvestParts = wantedharvestParts - harvestParts;

						if (missingHarvestParts > 0 && (extractors.length + extractorAdd.length) < maxExtracors ||
							preSpawnCreepsCheck(extractorAdd, 35, extractorAdd.length)
						){
							parts = createBodyExtractorAdd(energyCap, missingHarvestParts);
							myspawns[0].createCreep(parts, 'exA'+makeid(), {[C.ROLE]: 'extractorAdd', [C.ROOM_ORIGIN]: spawner, [C.SOURCE_ID]: sourceId});				
							return 1;
						}
					}
				}


				if (spawnHaulers(spawner, myspawns, sourceId, energyCap, room) ) {					
					return 1;
				}
				assignedOutposts += 1;
			}

			if (Object.keys(Memory.rooms[room].sources).length <= 2 && !globalEnergyCrysis() ) {		
				if (Memory.rooms[room].RCLreserved === undefined || 
					(Memory.rooms[room].RCLreserved.ticksToEnd === undefined || 
					Memory.rooms[room].RCLreserved.ticksToEnd < 1000)
				) {				

					if (costClaimer === undefined) {
						costClaimer = BODYPART_COST[CLAIM] + BODYPART_COST[MOVE];
					}

					if (myspawns[0]._cache.ClaimTs > Game.time) { continue; }

					if (energyCap < costClaimer) { continue; }

					if (Memory.rooms[room] && Memory.rooms[room].controller && Memory.rooms[room].controller.unreachableTs)	{
						if (Game.time < Memory.rooms[room].controller.unreachableTs) {
							continue;
						} else {
							let pathToController = findTravelPath(Game.rooms[spawner].controller.pos, posDecompressXY(Memory.rooms[room].controller.pos, room),
								{range: 1, ignoreCreeps: true,  maxOps:50000});
							if (pathToController.incomplete) {
								Memory.rooms[room].controller.unreachableTs = Game.time + 1500;
								continue;
							} else {
								delete Memory.rooms[room].controller.unreachableTs;
								log(room +" remote path is clear to controller ! " + room )
							}
						}
					}

					let mineClaimers = _.filter(getCreeps('claimer'), (creep) => creep._memory[C.ROOM_TARGET] == room);													
					
					let price = energyCap
					if (claimerBudget === undefined) {
						claimerBudget = energyCap
						if (ENABLE_SPAWN_EXTENSIONS) {
							let spawnerEnergy = getMaxCraneSupportedSpend(spawner)
							claimerBudget = limit(energyCap, costClaimer, spawnerEnergy);
						}
					}

					let ReqClaim = 1
					if (claimerBudget < costClaimer * 2){
						let maxClaimers = getControllerAttackPositionsCount(room);
						if (maxClaimers <= 1) { continue; }
						ReqClaim = limit(getControllerAttackPositionsCount(room), 0, 3);
					}

					if (mineClaimers.length < ReqClaim) {						

						if (!Memory.rooms[room].RCLreserved || Memory.rooms[room].RCLreserved.username !== Memory.username){

							if ((ReqClaim > 1 || getRoomPRCL(spawner) < 7) && !requestStartReserve(spawner, room) ) { continue; }

							price = limit(price, costClaimer, costClaimer*3);
						} else {
							price = claimerBudget;
						}

					//	log(spawner + " want claimer " +price + "/"+energyCap)
						let curMisRsrvTcks;
						if (Memory.rooms[room].RCLreserved && Memory.rooms[room].RCLreserved.ticksToEnd) {
							curMisRsrvTcks = CONTROLLER_RESERVE_MAX - Memory.rooms[room].RCLreserved.ticksToEnd;
						} else {
							curMisRsrvTcks = CONTROLLER_RESERVE_MAX;
						}
						
						let maxClaimParts = 12;
						if (BOT_MODE) {
							maxClaimParts = 6;
						}

						let addReserver = undefined;
						if (ReqClaim > 1) {
							addReserver = 1;
						}

						let requiredClaimParts = Math.min(Math.ceil((curMisRsrvTcks / CREEP_CLAIM_LIFE_TIME) + 1), maxClaimParts);
						let priceToUse = limit(Math.floor((BODYPART_COST[CLAIM] + BODYPART_COST[MOVE]) * requiredClaimParts), 0, price);

						parts = createMaxBody(priceToUse, {move: 1, claim: 1} );		
						
						myspawns[0].createCreep(parts, 'clm'+makeid(), {[C.ROLE]: 'claimer', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, addReserver: addReserver });

						if (!Game.rooms[spawner].storage) {
							myspawns[0]._cache.ClaimTs = Game.time + 37;
						}
						
						return 1;
					}
				}
			}
			roomObj.ts = Game.time;
		}
	}
	return 0;
}

global._startReserve = {}
function requestStartReserve(spawner, roomName){

	/*
	let upgraders = getCreeps('upgrader', spawner);
	if (upgraders.length < 5) { return true} 
	*/

	if (global._startReserve[spawner] === undefined) {
		global._startReserve[spawner] = {};
	}

	if (global._startReserve[spawner].currentReserve === undefined || Game.time > global._startReserve[spawner].currentReserveTs) {

		delete global._startReserve[spawner].currentReserve;
		delete global._startReserve[spawner].currentReserveTs;


		let allowNewReserve = true
		
		if (Game.rooms[spawner].storage || Game.rooms[spawner].terminal) {
			allowNewReserve = true;
		}		
		

		if (!allowNewReserve) {
			let minFillLevel = 0.5;
			let containers = Game.rooms[spawner].getSpawnContainers();

			containers = containers.concat(Game.rooms[spawner].getControllerContainer())
			
			let store = 0;
			for (let idx in containers) {
				let cont = containers[idx]
				store += cont.store[RESOURCE_ENERGY]				
			}

			if ((store / containers.length) >= (2000*containers.length*minFillLevel) ) {
				allowNewReserve = true;
			}
		}

		/*
		if (allowNewReserve && Object.keys(Memory.rooms[spawner].remoteMineOps[roomName].sources).length < 2) {

			let ops = Memory.rooms[spawner].remoteMineOps
			let myIncrease = 0;

			for (let sourceId in ops[roomName].sources) {
				myIncrease += ops[roomName].sources[sourceId].netEnergy / 2;
			}

			let bestIncrease = 0;
			let remotesReserved = 0;
			for (let room in ops) {
				if (room === roomName) { continue; }
				if (!checkRoomIsActiveMine(room) ) { continue; }
				if (Memory.rooms[room] && Memory.rooms[room].RCLreserved && Memory.rooms[room].RCLreserved.username === Memory.username){ 
					remotesReserved++
					continue; 
				}
				
				let increase = 0;
				for (let sourceId in ops[room].sources) {
					increase += ops[room].sources[sourceId].netEnergy / 2;
				}

				if (increase > bestIncrease) {
					bestIncrease = increase;
				}
			}

			if (myIncrease < bestIncrease && remotesReserved < 3) {
				allowNewReserve = false;
			}
		}*/




		if (allowNewReserve) {
			global._startReserve[spawner].currentReserve = roomName;
			global._startReserve[spawner].currentReserveTs = Game.time + 300;
		}

		
	}

	if (global._startReserve[spawner].currentReserve === roomName) {
		return true;
	}



	return false;
}

global.requestActiveMine = function(spawner){
	if (!Memory.rooms[spawner] || !Memory.rooms[spawner].sources) { return; }

	for (let sourceId in Memory.rooms[spawner].sources) {
		if (!Memory.activeMines[sourceId]){
			Memory.activeMines[sourceId] = {};
		}
		Memory.activeMines[sourceId].ts = Game.time + 1500
	}
}

global.updateActiveMines = function(spawner, sourceId, wantRoad){
	if (!Memory.activeMines[sourceId]){
		Memory.activeMines[sourceId] = {};
	}
	Memory.activeMines[sourceId].ts = Game.time + 1500;
	Memory.activeMines[sourceId].wantRoad = wantRoad
}

global.checkRoomIsActiveMine = function(room){
	for (let sourceId in Memory.rooms[room].sources) {		
		if (Memory.activeMines[sourceId] &&
			Memory.activeMines[sourceId].ts > Game.time
		) {
			return 1;
		}
	}
	return 0;
}

global.checkSourceIsActiveMine = function(sourceId){
	if (Memory.activeMines[sourceId] &&
		Memory.activeMines[sourceId].ts > Game.time
	) {
		return 1;
	} else {
		delete Memory.activeMines[sourceId];
	}
	return 0;
}

function spawnAssistedLeveling(spawner, myspawns, energyCap) {
	for (let targetRoom in Memory.assistedLeveling) {
		let levelData = Memory.assistedLeveling[targetRoom];
		if (!levelData.assignedSpawns || !levelData.assignedSpawns[spawner]) { continue; }

		let spawnerEnergyStatus = Game.rooms[spawner].energyStatus()
		if (spawnerEnergyStatus < ECONOMY_DEVELOPING || globalEnergyCrysis() ) { return 0; }

		if (Memory.rooms[targetRoom].hostiles && Memory.rooms[targetRoom].hostiles.power.defensive > 50) { continue; }
		if (checkTraversedRoomsForHostiles(spawner, targetRoom) )  { continue; }

		let targetEnergy = 45;
		if (spawnerEnergyStatus >= ECONOMY_SURPLUS ) {
			targetEnergy = 100;
		} else if (spawnerEnergyStatus >= ECONOMY_RICH) {
			targetEnergy = 75;
		}

		// EnergyCarts
		let transports = _.filter(getCreeps('energyTransport', spawner), (creep) => creep._memory[C.ROOM_TARGET] == targetRoom);
		let energyTick = 0;
		let haulTicks = levelData.assignedSpawns[spawner].ticksToTarget || levelData.assignedSpawns[spawner].dist * 35;
		for (let idx in transports){
			let carry = transports[idx].store.getCapacity(RESOURCE_ENERGY);
			energyTick += carry / (haulTicks * 2);
		}

		// Upgraders
		let upgraders = _.filter(getCreeps('upgrader'), (creep) => creep._memory[C.ROOM_TARGET] == targetRoom);
		let upWorkParts = getBodyparts(upgraders, WORK);

		log(spawner + " assisted leveling for " + targetRoom + " energy/tick " + energyTick + "  with " + transports.length + " transports, consuming "+ upWorkParts + " with " + upgraders.length + " upgraders. ")

		// surplus energy, spawn upgraders
		if (energyTick > upWorkParts || preSpawnCreepsCheck(upgraders, 35, upgraders.length)) {

			// Check room capable of recieving upgraders
			if (Game.rooms[targetRoom] && Game.rooms[targetRoom].findByType(STRUCTURE_SPAWN)) { 
				let parts = createBodyPartsRemoteUpgrader(energyCap) 
				myspawns[0].createCreep(parts, 'up'+makeid(), {[C.ROLE]: 'upgrader', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom});
				return 1;
			}
		}

		// meeds more energy, spawn energy carts
		let missingEnergy = targetEnergy - energyTick;
		if (missingEnergy > 0 || preSpawnCreepsCheck(transports, 35, transports.length)) {
			
			let parts = createBodyPartCarrier(energyCap, 25);
			
			let bestSpawn = bestSpawnForDest(myspawns, Game.rooms[spawner].storage);
			bestSpawn.createCreep(parts, 'enTr'+makeid(), {[C.ROLE]: 'energyTransport', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom, targetRes: RESOURCE_ENERGY });
			return 1;
		}
	}
}


function spawnThoriumScorers(spawner, myspawns, energyCap) {

	for (let targetRoom in Memory.reactors) {
		let reactorData = Memory.reactors[targetRoom];

		if (!reactorData.assignedRooms || !reactorData.assignedRooms[spawner]) { continue; }
		if (!reactorData.active){ continue; }

		if (Game.rooms[spawner].store(RESOURCE_THORIUM) < 1000) { continue; }

		if (!reactorData.my ) {

			let spawnClaimer = false;
			if (!ALLOW_SCORE[reactorData.playerName] || reactorData.storedThorium < 500 || reactorData.spawnClaimer) {
				let claimers = _.filter(getCreeps('claimer'), (creep) => creep._memory[C.ROOM_TARGET] == targetRoom);			
				spawnClaimer = true;		
				if (claimers.length <= 0)   {

					if (energyCap < 850) { return 0; }
					let parts = [MOVE, MOVE, MOVE, MOVE, MOVE, CLAIM];
					let targetPos = posSave(posDecompressXY(reactorData.pos, targetRoom))
					myspawns[0].createCreep(parts, 'clR'+makeid(), {[C.ROLE]: 'claimer', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom, claimController:1, targetId: reactorData.id, [C.TARGET_POS]: targetPos });	
										
					return 1;
				}
			}

			if (!spawnClaimer) { continue; }
		} else {
			delete reactorData.spawnClaimer;
		}
		
		
		let reactorHaulers = _.filter(getCreeps('thoriumHauler'), (creep) => creep._memory[C.ROOM_TARGET] == targetRoom);
		if (reactorData.storedThorium < 500) {
			reactorHaulers = _.filter(getCreeps('thoriumHauler', spawner), (creep) => creep._memory[C.ROOM_TARGET] == targetRoom);
		} 
		
		let haulTicks = reactorData.assignedRooms[spawner].ticksToTarget || reactorData.assignedRooms[spawner].dist * 35;
		let carryCap = 250;

		let missingThorium = (1000 - reactorData.storedThorium) + haulTicks - (reactorHaulers.length * carryCap);
		let requiredCarriers = Math.ceil(Math.max(2, missingThorium / 250));
	//	log("Reactor in " + targetRoom + " has "+reactorData.storedThorium+" thorium, missing " + missingThorium + " with carriers " + reactorHaulers.length + " / " +requiredCarriers)

		if (preSpawnCreepsCheck(reactorHaulers, 350, requiredCarriers) || missingThorium > 200){	
			let id = 'tc'+makeid();

			let carryParts = 5;
			if (missingThorium > 1000 && reactorHaulers.length === 0) {
				carryParts = 10;
			}

			log(spawner+" spawning thorium hauler with carry parts " + carryParts)
			let parts = createBodyPartCarrier(energyCap, carryParts);
			let bestSpawn = bestSpawnForDest(myspawns, Game.rooms[spawner].storage);
			bestSpawn.createCreep(parts, id,
				{[C.ROLE]: 'thoriumHauler', 
				[C.ROOM_ORIGIN]: spawner, 
				reactorId: reactorData.id, 				
				[C.ROOM_TARGET]: targetRoom, 
				reactorPos: posSave(posDecompressXY(reactorData.pos, targetRoom))}
			);

			return 1;
		}
	}
}


function spawnAssistedMiners(spawner, myspawns, energyCap) {

	for (let roomName in Memory.assistedMine) {		

		if (!Memory.assistedMine[roomName].assignedSpawns || !Memory.assistedMine[roomName].assignedSpawns[spawner]) { continue; }
		if (!Game.rooms[roomName] || Game.rooms[roomName].controller.level < 6) { continue; }	

		for (let mineralId in Memory.rooms[roomName].mineral) {
			let mineral = Game.getObjectById(mineralId)
			if (!mineral) { continue; }

			let useEngine = true;
			let wantedMiners = 5;
	
			if (mineral.mineralAmount < 3000) {
				wantedMiners = 2;
			}
			
			let result = spawnMineralExtractors(spawner, myspawns, energyCap, roomName, mineralId, wantedMiners, false, useEngine)
			if (result) { return result; }

		}
	}
}

function spawnThoriumMiners(spawner, myspawns, energyCap) {

	if (Game.rooms[spawner].controller.level < 6) { return false;}

	let thorium = Game.rooms[spawner].getThorium()
	if (!thorium) { return; }
	let wantedMiners = 3;

	let useEngine = false;

	if (Memory.rooms[spawner].mineOnly) {
		wantedMiners = 5;
		useEngine = true
	} else if (getRoomRCL(spawner) < 7) {
		wantedMiners = 2;
	}	

	if (thorium.mineralAmount < 3000 || Game.rooms[spawner].controller.level === 8) {
		wantedMiners = 1;
	}

	let haulersOnly = false;
	if (Memory.assistedMine && Memory.assistedMine[spawner] && Memory.assistedMine[spawner].assignedSpawns && Object.keys(Memory.assistedMine[spawner].assignedSpawns).length > 0) {
		haulersOnly = true;
	}

	if (Game.rooms[spawner].controller.level === 8 && thorium.mineralAmount < 7500) { 
		haulersOnly = true 
	}
	
	let mineralId = thorium.id
	return spawnMineralExtractors(spawner, myspawns, energyCap, spawner, mineralId, wantedMiners, haulersOnly, useEngine)
}


function spawnSymbol(spawner, myspawns, energyCap, allSpawns){

	if (getRoomPRCL(spawner) < 6) { return 0; }
	if (globalEnergyCrysis() ) { return 0; }	
	if (roomIsSafeModeCd(spawner)) { return 0; }
	if (Game.rooms[spawner].energyStatus() < ECONOMY_LOW) { return 0; }


	let carriers = getCreeps('symbolHauler', spawner);
	let maxCarriers = 1; 
	if (getRoomPRCL(spawner) >= 8) { 
		maxCarriers = 8; 
	} else if (getRoomPRCL(spawner) >= 7) { 
		maxCarriers = 2; 
	}

	if (carriers.length >= maxCarriers) { return 0; }

	let symbol = findNextSymbol(spawner);
	// {room: bestRoom, target: bestTarget, type: bestScoreType, decoder: bestDecoder};
	if (!symbol) { return; }

	let id = 'smh'+makeid();
	let parts = createBodyPartCarrier(energyCap, 25);
	myspawns[0].createCreep(parts, id,
		{[C.ROLE]: 'symbolHauler', 
		[C.ROOM_ORIGIN]: spawner, 
		scoreId: symbol.target, 
		scoreType: symbol.type,
		[C.ROOM_TARGET]: symbol.room, 
		scorerDest:  symbol.dest, 
		scorer: symbol.decoder  });
	return 1;
}

function spawnCoreSnipers(spawner, myspawns, energyCap, allSpawns) {
	if (getRoomPRCL(spawner) < 6) { return 0; }
	if (globalEnergyCrysis() ) { return 0; }	
	if (roomIsSafeModeCd(spawner)) { return 0; }

	for (let targetRoom in Memory.coreSniper) {

		let target = Memory.coreSniper[targetRoom]
		if (!target.assignedRooms[spawner]) { continue; }

		if (target.spawnTimeout) {

			if (target.assignedRooms[spawner].boostRequest ) {
				Game.rooms[spawner].setBoostMode(true, target.assignedRooms[spawner].boostRequest);
			}

			if (Game.time > target.spawnTimeout) {
				delete Memory.coreSniper[targetRoom];
			}
			continue;
		}

		if (!Memory.rooms[targetRoom] || !Memory.rooms[targetRoom].invaderCore){ 
			delete Memory.coreSniper[targetRoom];
			continue; 
		}

		let coreData
		if (Memory.rooms[targetRoom] && Memory.rooms[targetRoom].invaderCore) {
			coreData = Memory.rooms[targetRoom].invaderCore;
		} else {
			delete Memory.coreSniper[targetRoom];
			continue;
		}

		let sniper = target.assignedRooms[spawner].sniper;
		if ((!sniper || !sniper.attackerParts) && !target.assignedRooms[spawner].created) { 
			target.assignedRooms[spawner].created = Game.time;
			target.assignedRooms[spawner].sniper = createInvaderCoreSniper(targetRoom, spawner, 0);
			sniper = target.assignedRooms[spawner].sniper;
		}

		if (!sniper || !sniper.attackerParts) { continue; }


		if (coreData.deploy && Game.time < coreData.deploy) { continue; }

		let snipers = _.filter(getCreeps('coreSniper'), (creep) => creep._memory.coreId == coreData.id);

		if (snipers.length < 1 && target.spawned === undefined) {
			// && lifetimeDmg(snipers) < coreData.hits

			

			let boostRequest = {}
			if (sniper.attackerBoosts) {
				for (let idx in sniper.attackerBoosts) {
					let boost = sniper.attackerBoosts[idx]
					let bodyPart = BODYPART_FROM_BOOST[boost]
					boostRequest[boost] = 0;
					for (let idxPart in sniper.attackerParts) {
						if (sniper.attackerParts[idxPart] === bodyPart) {
							boostRequest[boost] += LAB_BOOST_MINERAL;
						}
					}
				}

				target.assignedRooms[spawner].boostRequest = boostRequest;
				Game.rooms[spawner].setBoostMode(true, boostRequest);
			}

			let id = 'cs'+makeid();
			myspawns[0].createCreep(sniper.attackerParts, id,
				{[C.ROLE]: 'coreSniper', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: targetRoom, appBoosts: boostRequest, coreId: coreData.id });

				
			target.spawned = 1;	
				
			return 1;
		} else if (target.spawnTimeout === undefined) {
			target.spawnTimeout = Game.time + 250;
		}
	}
}

function spawnComScorer(spawner, myspawns, energyCap, allSpawns){

	if (getRoomPRCL(spawner) < 6) { return 0; }
	if (globalEnergyCrysis() ) { return 0; }	
	if (roomIsSafeModeCd(spawner)) { return 0; }
	
	for (let caravanId in Memory.caravans) {
		let caravan = Memory.caravans[caravanId]
		if (!caravan.assignedRooms[spawner]) { continue; }
		if (caravan.abortSpawn || caravan.assignedRooms[spawner].abortSpawn) { continue; }
		if (!caravan.score) { continue; }

		let timeLeft = caravan.eta - Game.time;
		let travelTime = caravan.assignedRooms[spawner].travelTime
		if (!travelTime) {
			travelTime = caravan.assignedRooms[spawner].dist * 45;
		}

		let spawnTime = 150;
		log(spawner+ " spawner for caravan, time left " + timeLeft + " time to target " +  (spawnTime + travelTime) + " target room " + caravan.target )
		if (timeLeft < (spawnTime + travelTime)) {
			caravan.assignedRooms[spawner].abortSpawn = true;	
			continue; 	
		}

		if (checkTraversedRoomsForHostiles(spawner, caravan.target) )  { continue; }

		let carriers;
		for (let res in caravan.score) {
			
			if (caravan.score[res].amount <= 0 || !caravan.commodities || !caravan.commodities[res] || caravan.commodities[res].store <= 0) { continue; }
			if (caravan.score[res].spawned) { continue; }

		//	if (Game.rooms[spawner].store(res) < caravan.score[res].amount) { continue; }

			if (!carriers){
				carriers = getCreeps('commScorer');
			}
			let assignedScoreres = _.filter(carriers, (creep) => creep._memory.caravanId === caravanId && creep._memory.scoreRes === res);


			if (assignedScoreres.length === 0) {
				let id = 'cs'+makeid();
				let carryParts = Math.ceil(Math.min(caravan.score[res].amount, caravan.commodities[res].store) / CARRY_CAPACITY)
				if (carryParts < 1) { continue; }

				let caravanCreep = caravan.commodities[res].creeps

				carryParts = Math.max(5, carryParts);

				let parts = createBodyPartCarrier(energyCap, Math.min(25, carryParts));
				myspawns[0].createCreep(parts, id,
					{[C.ROLE]: 'commScorer', [C.ROOM_ORIGIN]: spawner, caravanId: caravanId, [C.ROOM_TARGET]: caravan.target, scoreRes: res, caravanCreep: caravanCreep  });

				caravan.score[res].spawned = true;	

				return 1;
			}

		}
	}
}

function spawnScore(spawner, myspawns, energyCap, allSpawns){
	
	if (getRoomPRCL(spawner) < 6) { return 0; }
	if (globalEnergyCrysis() ) { return 0; }	
	if (roomIsSafeModeCd(spawner)) { return 0; }

	let parts;
	for (let room in Memory.scoreCollector){

		if (Memory.scoreCollector[room].destoyer === spawner && !Memory.scoreCollector[room].clearPath) {

			if (Memory.rooms[room] && Memory.rooms[room].hostiles && (Memory.rooms[room].hostiles.power.attackDamage || Memory.rooms[room].hostiles.power.dismantlePower)) { continue; }
			if (checkTraversedRoomsForHostiles(spawner, room) )  { continue; }
			
			Memory.orderWreckers[room] = {};
			Memory.orderWreckers[room].requiredDeconstructors = 1;
			Memory.orderWreckers[room].civilian = 1;
			Memory.orderWreckers[room].assignedRooms = {};
			Memory.orderWreckers[room].assignedRooms[spawner] = {};
			break;
		}
	}

	// COLLECT SCORE (SCORE SCORE?)
	let scoreHaulers;
	let carriers;
	if (Game.rooms[spawner].store(RESOURCE_SCORE) > 15000 && Game.rooms[spawner].energyStatus() >= ECONOMY_LOW) {
		
		let bestCollector;
		let shortestDist = 999;

		if (!carriers){
			carriers = getCreeps('scoreHauler', spawner);
		}
		if (carriers.length < 8) {

			for (let room in Memory.scoreCollector){
				if (Memory.scoreCollector[room].clearPath) {

					if (!Memory.scoreCollector[room].assignedSpawns || !Memory.scoreCollector[room].assignedSpawns[spawner]) { continue; }
					if (checkTraversedRoomsForHostiles(spawner, room) )  { continue; }

					if (Memory.rooms[room] && Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.defensive) { continue; }
					if (Memory.scoreCollector[room].avoid) { 
						if (Game.time < Memory.scoreCollector[room].avoid) {
							continue; 
						} else {
							delete Memory.scoreCollector[room].avoid;
						}						
					}
					
					let dist = Memory.scoreCollector[room].assignedSpawns[spawner].dist;

					let estimatedRegenSink = SCORE_COLLECTOR_SINK * dist * 35;
					if (!scoreHaulers) {
						scoreHaulers = getCreeps('scoreHauler');
					}
					let scoreHaulersAssigned = _.filter(scoreHaulers, (creep) => creep._memory.scorer === room);

					let scoreOnItsWay = 0;
					if (scoreHaulersAssigned.length > 0) {
						scoreOnItsWay = (scoreHaulersAssigned[0].body.length / 2) * CARRY_CAPACITY;
					}

					if (Memory.scoreCollector[room].capacity + estimatedRegenSink < 1250 ){ continue;  }
					
					if (dist < shortestDist) {
						shortestDist = dist;
						bestCollector = room;
					}
				}
			}
		}

		if (bestCollector) {
			let id = 'scd'+makeid();
			parts = createBodyPartCarrier(energyCap, 25);
			myspawns[0].createCreep(parts, id,
				{[C.ROLE]: 'scoreHauler', [C.ROOM_ORIGIN]: spawner, collectorId: Memory.scoreCollector[bestCollector].id, [C.ROOM_TARGET]: bestCollector, scorerDest:  Memory.scoreCollector[bestCollector].pos, scorer: bestCollector  });
			return 1;
			
		}
	}
	
	// HARVEST SCORE
	if (Game.rooms[spawner].store(RESOURCE_SCORE) < 500000 && Game.rooms[spawner].energyStatus() >= ECONOMY_LOW) { 
		let maxParts = 250 * allSpawns.length;
		let maxCarryAffordable;

		let energyStatus = Game.rooms[spawner].energyStatus()
		maxParts += 70 * (energyStatus - ECONOMY_DEVELOPING)

		// Max parts
		if (!carriers){
			carriers = getCreeps('scoreHauler', spawner);
		}
		let partsCount = 0;
		if (carriers.length > 0) {
			partsCount = carriers[0].body.length;
		}

		let myRoomType = getRoomStatus(spawner)
		if (partsCount < maxParts) { 
			for(let room in Memory.score) {

				if (room === spawner) { continue; }
				if (myRoomType !== getRoomStatus(room)) { continue; }
			//	if (roomIsHW(room) && (getSector(room) === "W3S1" || getSector(room) === "W3S2")) { continue; }
				
				if (!Memory.score[room].haulers || !Memory.score[room].haulers[spawner]) { continue; }

				let spawnOrigin = Object.keys(Memory.score[room].assignedRooms)[0];
				if (!spawnOrigin) { spawnOrigin = spawner}

				if (checkTraversedRoomsForHostiles(spawner, room) )  { continue; }
				

				let estimatedTime = Memory.score[room].haulers[spawner].dist * 50;

				for (let scoreId in Memory.score[room].score) {
					let scoreData = Memory.score[room].score[scoreId];
					
					if ((scoreData.timeOut - Game.time) < estimatedTime ) { continue; }

					if (!parts || !maxCarryAffordable) {
					//	parts = createMaxBody(energyCap, {move: 1, carry: 1} );
						parts = createBodyPartCarrier(energyCap, 25);
						maxCarryAffordable = countBodyparts(parts, CARRY);
					}

					if (scoreData.amount < (maxCarryAffordable * 50)) { continue; }

					let haulers = _.filter(getCreeps('scoreHauler'), (creep) => creep._memory.scoreId == scoreId);

					let curHaulPower = 0;
					for (let idx in haulers) {
						let scooper = haulers[idx];
						let roundTripsCapable = Math.floor(scooper.ticksToLive / estimatedTime)
						curHaulPower += roundTripsCapable * ((scooper.body.length/2) * CARRY_CAPACITY)
					}

					if (curHaulPower < scoreData.amount) {			
					//	console.log(room + " PB haulers spawning, timeNeeded " + actTimeNeeded+ " for hits " + Memory.rooms[room].powerBank.hits +", traveltime " + Memory.rooms[room].powerBank.ticksToTarget + " required haulers "+requiredHaulers );
						
						let id = 'scc'+makeid();
						
						myspawns[0].createCreep(parts, id,
							{[C.ROLE]: 'scoreHauler', [C.ROOM_ORIGIN]: spawnOrigin, scoreId: scoreId, [C.ROOM_TARGET]: room, dest: scoreData.pos  });
						return 1;
					}
				}
			}
		}
	}	
}


function spawnDepositMiners(spawner, energyCap, myspawns, haulersOnly){

	if (getRoomPRCL(spawner) < DEPOSIT_MIN_PRCL) { return 0; }
	if (Game.rooms[spawner].energyStatus() <= REQ_ECON_DEPOSITS || globalEnergyCrysis() ) { return 0; }	

	for( let room in Memory.deposits) {

		if (!Memory.deposits[room].assignedRooms || !Memory.deposits[room].assignedRooms[spawner]) { continue; }

		if (checkTraversedRoomsForHostiles(spawner, room) )  { continue; }

		for (let id in Memory.deposits[room].deposit) {
			let depositData = Memory.deposits[room].deposit[id];

			if (depositData.noTravel) { continue; }
			let ticksToDespawn = depositData.timeOut - Game.time
			if (ticksToDespawn < 750 ) { continue; }

			let maxCd = DEPOSIT_MAX_CD_SPAWN;
			if (depositData.mySector) {
				maxCd = DEPOSIT_MAX_CD_SPAWN_MY_SECTOR;
			}
			if (getRoomPRCL(spawner) < 7) { maxCd = 20 }
			if (depositData.lastCooldown > maxCd && !haulersOnly) { continue; }

		
			if (depositData.lastCooldown > 15 && ticksToDespawn < 45000) { continue; } // dont restart deposits

			let wantedMiners = Math.min(depositData.minePos, 4);

			if (spawnMineralExtractors(spawner, myspawns, energyCap, room, id, wantedMiners, haulersOnly) ) {
				log(spawner + " spawning for deposit of type " + depositData.type + ", current cd " + depositData.lastCooldown)
				return 1;
			}
		}
	}
}

function spawnSkMineralMiners(spawner, energyCap, myspawns){
	
	let PRCL = getRoomPRCL(spawner);
	if (PRCL < 7) { return 0; }
	let requiredEco = ECONOMY_STABLE
	if (DISABLED_MARKET) { requiredEco = ECONOMY_DEVELOPING; }
	if (Game.rooms[spawner].energyStatus() < requiredEco || globalEnergyCrysis() ) { return 0; }	
	let targets = sortSkMineTargets(Memory.rooms[spawner].remoteSkMineralOps);
	let activeMine = false;

	for (let room in targets) {
	//	console.log(spawner +  " spawnSkMineralMiners checking " + room)
		if (activeMine) { break; }
		if (!Memory.rooms[room] || Memory.rooms[room].enemyRemote) { continue; }
		let keeperKillers = _.filter(getCreeps('keeperKiller'), (creep) => creep._memory[C.ROOM_TARGET] == room);
		if (keeperKillers.length > 0 ) { continue; }

		let mineralId = Memory.rooms[spawner].remoteSkMineralOps[room].mineralId;

		let mineralType
		if (!mineralType && mineralId && Memory.rooms[room].mineral) {
			mineralType = Memory.rooms[room].mineral[mineralId].type;
		}
	
		if (mineralType && !wantToMineMineral(mineralType)) { 
			continue;
		}

		if (mineralOnCd(room, mineralId) > 100 ) { continue; }
		
		if (Memory.evalSkMining[mineralId] && Memory.evalSkMining[mineralId].avoid) {
			if (Memory.evalSkMining[mineralId].avoid > Game.time) {
				continue;
			} else {
				delete Memory.evalSkMining[mineralId];
			}
		}		

		if (checkForInvaderCore(room) ) { continue; }
		if (Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.defensive > 50) { continue; }
		if (checkTraversedRoomsForHostiles(spawner, room) )  { continue; }

		activeMine = true;
		
		let requiredKeeperillers = 2;		
		if (roomIsCenter(room)) {
			requiredKeeperillers = 0;
		} else if (PRCL >= 7) {
			requiredKeeperillers = 1;			
		}
		
		if (requiredKeeperillers > 0) {
			let keeperKillerMineral = _.filter(getCreeps('keeperKillerMineral'), (creep) => creep._memory[C.ROOM_TARGET] == room);	
		
			if (preSpawnCreepsCheck(keeperKillerMineral, 100, requiredKeeperillers)){
				let killerBody;
				if (PRCL >= 7) {
					killerBody = createMaxBody(energyCap, {move: 21, attack: 18, heal: 3} );
				} else {
					killerBody = createMaxBody(energyCap, {ranged_attack: 1, move: 2, heal: 1} );
				}

				myspawns[0].createCreep(killerBody, 'kpKMn'+makeid(), {[C.ROLE]: 'keeperKillerMineral', [C.ROOM_ORIGIN]: spawner, [C.ROOM_TARGET]: room, [C.SOURCE_ID]: mineralId});					
				return 1;
			}
		}

		let wantedMiners = 1;
	//	let mineralId
		if (getRoomPRCL(spawner) >= 8) {
			wantedMiners = 3;
		}

		if (spawnMineralExtractors(spawner, myspawns, energyCap, room, undefined, wantedMiners) ) {							
			return 1;
		}
	}
}


global.preSpawnCreepsCheck = function(creeps, bufferTicks=50, numberOfCreeps=1, creepsOk=0) {
	if (creeps.length < numberOfCreeps+creepsOk) {	
		return 1;	
	}

	let creepsLow;
	let creepLowTTL = CREEP_LIFE_TIME;

	for (let idx in creeps) {
		let creep = creeps[idx];
		let recordedTraveldist = creep._memory[C.TICKS_TO_TARGET] || 0;
		if ((creep.ticksToLive < (recordedTraveldist + bufferTicks + (CREEP_SPAWN_TIME * creep.body.length))) && 			
			!creep.spawning
		){	
			if (creep.ticksToLive < creepLowTTL && !creep._memory[C.REPLACED]) {
				creepsLow = creeps[idx];
				creepLowTTL = creep.ticksToLive;
			}
		} else {
			creepsOk++;
			if (creepsOk >= numberOfCreeps) { return 0; }
		}
	}

	if (creepsLow) {
		creepsLow._memory[C.REPLACED] = 1;
		return creepsLow;
	}	
}

global.maxHaulerSize = function(energyCap) {
	let carryPerEnergy = 2 / (2 * BODYPART_COST[CARRY] + BODYPART_COST[MOVE]);
	let maxCarryAffordable = Math.ceil(energyCap * carryPerEnergy);
	return limit(maxCarryAffordable, 1, 32);
}


global.getMaxCraneSupportedSpend = function(spawner) {
	if (Game.rooms[spawner]._cache.getMaxCraneSupportedSpend && Game.time <= Game.rooms[spawner]._cache.getMaxCraneSupportedSpendTs) {
		return Game.rooms[spawner]._cache.getMaxCraneSupportedSpend;
	}
	let allExtensions = 0;
	allExtensions += Game.rooms[spawner].getStoreCraneExtensions().length
	allExtensions += Game.rooms[spawner].getSpawnExtensions().length;

	/*
	let sources = Game.rooms[spawner].find(FIND_SOURCES); 	// might be slow to refill?
	for (let i = 0; i < sources.length; i++) {
		allExtensions += sources[i].getSourceExtensions().length;
	}*/

	let controllerLevel = Game.rooms[spawner].controller.level
	let extEnergyAllowed = allExtensions * EXTENSION_ENERGY_CAPACITY[controllerLevel]
	let spawnEnergy = SPAWN_ENERGY_CAPACITY * CONTROLLER_STRUCTURES[STRUCTURE_SPAWN][controllerLevel]
	let allowedEnergy = spawnEnergy + extEnergyAllowed;

	Game.rooms[spawner]._cache.getMaxCraneSupportedSpend = allowedEnergy;
	Game.rooms[spawner]._cache.getMaxCraneSupportedSpendTs = Game.time + 10;
	return allowedEnergy
}

global.getSpawnerBlockEnergy = function(spawner, half=false) {
	
	if (!Game.rooms[spawner]._cache.getSpawnerBlockEnergy || Game.time > Game.rooms[spawner]._cache.getSpawnerBlockEnergyTs) {
		Game.rooms[spawner]._cache.getSpawnerBlockEnergyTs = Game.time + 10;
			
		let spawnEnergy = SPAWN_ENERGY_CAPACITY
		let spawnExtensions = Game.rooms[spawner].getSpawnExtensions().length

		let extEnergyAllowed = spawnExtensions * EXTENSION_ENERGY_CAPACITY[Game.rooms[spawner].controller.level]	
		let allowedEnergy = spawnEnergy + extEnergyAllowed
		Game.rooms[spawner]._cache.getSpawnerBlockEnergy = allowedEnergy;

		// half budget
		extEnergyAllowed = Math.floor(spawnExtensions/2) * EXTENSION_ENERGY_CAPACITY[Game.rooms[spawner].controller.level]
		allowedEnergy = spawnEnergy + extEnergyAllowed
		Game.rooms[spawner]._cache.getSpawnerBlockEnergyHalf = allowedEnergy	
		
	}

	if (half) {
		return Game.rooms[spawner]._cache.getSpawnerBlockEnergyHalf
	}
	return Game.rooms[spawner]._cache.getSpawnerBlockEnergy;
	
}


function spawnHaulersV2(spawner, myspawns, _sourceId, energyCap, requiredCarryParts){

	// Check hauler coverage 
	let needsHauler = false;
	let forRoads = false;

	let allHaulers;
	let carryCreep = 8;
	if (myspawns[0].currentCarryParts === undefined) {
		allHaulers = getCreeps('hauler', spawner);
		let carryParts = getBodyparts(allHaulers, CARRY);
		myspawns[0].currentCarryParts = carryParts;
		if (carryParts > 0) {
			carryCreep = Math.min(4, Math.floor(carryParts / allHaulers.length));
		}
	}

	
	if (myspawns[0].haulersChecked === undefined) {
		myspawns[0].haulersChecked = true;


		if (Memory.rooms[spawner].idleHaul > 0) {
			

			if (myspawns[0]._cache.idleHaul !== undefined && Memory.rooms[spawner].idleHaul > myspawns[0]._cache.idleHaul) {				
				myspawns[0]._cache.delayHaulers = Game.time + 1;
				myspawns[0]._cache.idleHaul = Memory.rooms[spawner].idleHaul;
			//	log(spawner + " dealy spawning haulers! idle " + Memory.rooms[spawner].idleHaul )	
				delete myspawns[0]._cache.idleHaul
				return false;
			}

			myspawns[0]._cache.idleHaul = Memory.rooms[spawner].idleHaul;
		} else {
			delete myspawns[0]._cache.idleHaul
		}
	} 

	if (myspawns[0]._cache.delayHaulers !== undefined && Game.time < myspawns[0]._cache.delayHaulers) {
	//	log("dealy spawning haulers! idle " + Memory.rooms[spawner].idleHaul )	
		return false;
	}
	
	if (myspawns[0].requiredCarryParts === undefined) {		
		myspawns[0].requiredCarryParts = 0;
	}

	myspawns[0].requiredCarryParts += requiredCarryParts;
	
	let missingCarryParts = myspawns[0].requiredCarryParts - myspawns[0].currentCarryParts
	if (missingCarryParts >= carryCreep || (myspawns[0].currentCarryParts < 8 && myspawns[0].requiredCarryParts > 0)) {
		needsHauler = true;
	} else {
		return false;
	}

	if (myspawns[0].forRoads === undefined) {
		let allExtractors = getCreeps('extractor', spawner);

		if (!allHaulers) {
			allHaulers = getCreeps('hauler', spawner);
		}
		let totalRequiredCarryParts = 0;

		let carryParts = myspawns[0].currentCarryParts
		
		let carryForRoads = 0;

		for (let idx in allExtractors) {
			let extractor = allExtractors[idx];

			if (extractor._memory[C.REPLACED]) { continue; }

			let sourceId = extractor._memory[C.SOURCE_ID]
			let requiredCarryPartsSource = calcRequiredCarryParts(spawner, extractor._memory[C.SOURCE_ID], extractor._memory[C.ROOM_TARGET]);

			if (energyCap < 700) {
				let source = Game.getObjectById(sourceId);
				if (source) {
					let maxExtracors = source.getNumberOfHarvestPos();					
					let wantedharvestPower = (source.energyCapacity / ENERGY_REGEN_TIME);
					
					let maxHarvestRatio = Math.min(1, (extractor.getHarvestEnergyPower() * maxExtracors) / wantedharvestPower)
					requiredCarryPartsSource *= maxHarvestRatio
				}
			}

			totalRequiredCarryParts += requiredCarryPartsSource || 5;
			let _roadBuiltStatus = roadBuiltStatus(spawner, sourceId);
			if (_roadBuiltStatus > 0.9) {
				carryForRoads += requiredCarryPartsSource * _roadBuiltStatus;
			}
		}

		if (carryForRoads < carryCreep) {
			carryForRoads = 0;
		}

	//	log(spawner + " carryForRoads " + carryForRoads + " totalRequiredCarryParts " + totalRequiredCarryParts + " current carry " + carryParts)
		let roadRatio = carryForRoads / (totalRequiredCarryParts || 1)

	//	log("road ratio " + roadRatio)

		if (roadRatio > 0.9) {
			forRoads = true;
		} else if (roadRatio <= 0.9 && carryParts > 0) { // needs haulers for non road access

			let moveParts = getBodyparts(allHaulers, MOVE);
			let currentRatio = (carryParts / moveParts)	// 2 -> all for road, 1 all for non road
			let normalizedValue = currentRatio - 1 // 1 all for road, 0 all for non road

		//	log("currentRatio " + currentRatio + " normalized " + normalizedValue + " road ratio " + roadRatio)

			if (normalizedValue < roadRatio) {
				forRoads = true;
			}
			
		}
	//	log("forRoads " + forRoads)
		myspawns[0].forRoads = forRoads;
	}
	

	if (myspawns[0].allowedEnergy === undefined) {
	
		if (ENABLE_SPAWN_EXTENSIONS) {
			let cpuLimited = isCpuLimited();
			
			if (cpuLimited >= CPU_SAVING_MEDIUM) {
				myspawns[0].allowedEnergy = getMaxCraneSupportedSpend(spawner)
			} else if (cpuLimited >= CPU_SAVING_LOW) {
				myspawns[0].allowedEnergy = getSpawnerBlockEnergy(spawner, false)			
		//	} else if (Game.cpu.bucket > 9000) {
		//		myspawns[0].allowedEnergy = 200
			} else {
				myspawns[0].allowedEnergy = getSpawnerBlockEnergy(spawner, true)
			}

		} else if (getRoomPRCL(spawner) < 7) {
			let maxSize = 27;
			myspawns[0].allowedEnergy = Math.min(energyCap, maxSize * BODYPART_COST[MOVE], energyCap / 2)
		} else {
			myspawns[0].allowedEnergy = energyCap;
		}
	}

	let allowedEnergy = myspawns[0].allowedEnergy;
	let totalCarryParts = myspawns[0].requiredCarryParts;
	

	let maxCarryAffordable = maxHaulerSize(allowedEnergy);
	let maxCreeps = Math.ceil(totalCarryParts / maxCarryAffordable);
	let parts = [];

	if (!allHaulers) {
		allHaulers = getCreeps('hauler', spawner);
	}

	if 	(needsHauler || (missingCarryParts > -20 && preSpawnCreepsCheck(allHaulers, 100, maxCreeps))) {		
		let workParts = 0;
		let _forRoads = myspawns[0].forRoads
		if (_forRoads && roadRepairStatus(spawner, _sourceId) && allowedEnergy > 450) {
			workParts = 1;
		}
		
		parts = createBodyHaulerV2(maxCarryAffordable, allowedEnergy, workParts, _forRoads);
		myspawns[0].createCreep(parts, 'hal'+makeid(), {[C.ROLE]: 'hauler', [C.ROOM_ORIGIN]: spawner});		
		return 1;
		
	} 
	
}

function spawnHaulers(spawner, myspawns, _sourceId, energyCap, room, ratio = 1){
	let requiredCarryParts = calcRequiredCarryParts(spawner, _sourceId, room) * ratio;
	return spawnHaulersV2(spawner, myspawns, _sourceId, energyCap, requiredCarryParts)

}

global.createBodyPartCarrier = function(price, requiredCarry) {
	let arr = [];
	let tempCost = 0;
	let currentCost = 0;
	let i = 0;
	let _requiredCarry = requiredCarry || 1;

    while (currentCost <= (price) ){
        tempCost = currentCost;
        if ( (currentCost + BODYPART_COST[CARRY]) <= (price-BODYPART_COST[MOVE]) && (i < _requiredCarry)){
            currentCost += BODYPART_COST[CARRY];
            arr.push(CARRY);
			i++;
        }
        if ( (currentCost + BODYPART_COST[MOVE]) <= (price)){
			currentCost += BODYPART_COST[MOVE];
            arr.push(MOVE);
        }
        if ( (tempCost >= currentCost) || (i >= _requiredCarry) || arr.length > 48 ) {
            break;
        }
    }
	return arr;
}

function createBodyHaulerV2(requiredCarryParts, energyCap, wantedWorkParts=1, forRoads = true){

//	log("max hauler size " + requiredCarryParts + " energy " + energyCap + " forRoads " + forRoads, "green" )
	let arr = [];
	let nonMoveParts = 0;
	let price = 0;

	let _workParts = 0;
	let _moveParts = 0;
	let _carryParts = 0;

	if (wantedWorkParts) {
		while (_workParts < wantedWorkParts ){

			if ( (price + BODYPART_COST[MOVE] + BODYPART_COST[WORK]) <= (energyCap)){
				arr.push(WORK);
				_workParts++;
				nonMoveParts++;
				if (forRoads) {
					arr.push(CARRY);
					nonMoveParts++;
					_carryParts++;
				}
				arr.push(MOVE);
				_moveParts++;
			

			} else {
				break;
			}
			price = (BODYPART_COST[CARRY] * _carryParts) + (BODYPART_COST[MOVE] * _moveParts) + (BODYPART_COST[WORK] * _workParts); 

		}
	}

	let addCarryCost = BODYPART_COST[MOVE] + BODYPART_COST[CARRY]
	if (forRoads) {
		addCarryCost += BODYPART_COST[CARRY]
	}

	while ((price <= energyCap || _carryParts < requiredCarryParts) && arr.length <= 47 ){

		
		if ( (price + addCarryCost) <= energyCap){

			arr.push(CARRY);
			nonMoveParts++;
			_carryParts++;
		
			if (forRoads) {
				arr.push(CARRY);
				nonMoveParts++;
				_carryParts++;

				if (_moveParts*2 < nonMoveParts) {
					arr.push(MOVE);
					_moveParts++
				}
			} else {
				if (nonMoveParts > _moveParts) {
					arr.push(MOVE);
					_moveParts++
				}
			}

		} else {
			break;
		}

		price = (BODYPART_COST[CARRY] * _carryParts) + (BODYPART_COST[MOVE] * _moveParts) + (BODYPART_COST[WORK] * _workParts); 

	}

	if (arr.length === 48 && (price + BODYPART_COST[MOVE] + BODYPART_COST[CARRY]) <= energyCap ) {
		arr.push(CARRY);
		arr.push(MOVE);
	}

//	log("createBodyHaulerV2 body; carry " +_carryParts + " move " + _moveParts + " work " + _workParts, "green")

	return arr

}


function createBodyHauler(requiredCarryParts, energyCap, _workParts=1, forRoads = true){
	
//	let _workParts = 1;
	let _moveParts;
	let _carryParts;
	if (forRoads) {
		let maxMove = 18;
		let maxCarry = 33-_workParts;	
		_carryParts = Math.min(maxCarry, requiredCarryParts);
		_moveParts = Math.min(Math.ceil((_carryParts+_workParts)/2), maxMove);
	} else {		
		let maxMove = 25;
		let maxCarry = 25-_workParts;	
		_carryParts = Math.min(maxCarry, requiredCarryParts);
		_moveParts = Math.min(Math.ceil((_carryParts+_workParts)), maxMove);
	}	

	
	// SCALE FOR PRICE
	let price = (BODYPART_COST[CARRY] * _carryParts) + (BODYPART_COST[MOVE] * _moveParts) + (BODYPART_COST[WORK] * _workParts);
	let reductionFactor = energyCap / price;
	//console.log(" current price = " + price + " of avialable " + energyCap+ " makes red factor " + reductionFactor)
	if (reductionFactor < 1.0) {
		console.log("createBodyHauler reduction " + reductionFactor + " price " + price + " cap " + energyCap);
		_carryParts = Math.floor(_carryParts * reductionFactor);
		_moveParts = Math.ceil(_moveParts * reductionFactor);
		price = (BODYPART_COST[CARRY] * _carryParts) + (BODYPART_COST[MOVE] * _moveParts) + (BODYPART_COST[WORK] * _workParts); 
		if (price > energyCap) {
			
			while (price > energyCap) {
				log("createBodyHauler too expensive body! " + price + "/"+ energyCap)
				if (_workParts > 0 && Math.random() > 0.3) {
					_workParts = 0;
				} else {
					_carryParts--;
					_moveParts--;
					if (forRoads) {
						_moveParts--;
					}
				}
				price = (BODYPART_COST[CARRY] * _carryParts) + (BODYPART_COST[MOVE] * _moveParts) + (BODYPART_COST[WORK] * _workParts); 
				if (_carryParts <= 0 || _moveParts <= 0) {
					log("createBodyHauler error reducing body! " + price + "/"+ energyCap + " new carry parts " + _carryParts + " and move " + _moveParts + " work parts " + _workParts)
					break;
				}
			}			
		}		
	}
	let arrBody = [];
	for (let i=0; i<_carryParts; i++) {
		arrBody.push(CARRY);
	}
	for (let i=0; i<_moveParts; i++) {
		arrBody.push(MOVE);
	}
	for (let i=0; i<_workParts; i++) {
		arrBody.push(WORK);
	}
	return arrBody;
}


global.calcRequiredCarryParts = function(roomName, sourceId, targetRoom){

    let requiredCarry = 32;
	let source;

	if (Memory.rooms[roomName].remoteSources === undefined) {Memory.rooms[roomName].remoteSources = {}; }
	if (Memory.rooms[roomName].remoteSources[sourceId] === undefined || Memory.rooms[roomName].remoteSources[sourceId].c === undefined) {

		let sourcePos
		source = Game.getObjectById(sourceId);
		let remoteRoom = targetRoom
		if (source) {
			sourcePos = source.pos;
			remoteRoom = source.room.name;
		} else if (targetRoom) {
			if (Memory.rooms[targetRoom] && Memory.rooms[targetRoom].sources && Memory.rooms[targetRoom].sources[sourceId]) {
				sourcePos = posDecompressXY(Memory.rooms[targetRoom].sources[sourceId].pos, targetRoom)
			}
		} 

		if (sourcePos) {
			if (Memory.rooms[roomName].remoteSources[sourceId] === undefined) { Memory.rooms[roomName].remoteSources[sourceId] = {}; }
			
			let shortestPath = 1500;
			let pathToSource;
			if (Game.rooms[roomName].storage) {
				pathToSource = findTravelPath(Game.rooms[roomName].storage.pos, sourcePos,
						{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:50000, uncompressed: true});
				if (pathToSource.path.length <= shortestPath) {
					shortestPath = pathToSource.path.length;
				}
			} else {
				let spawns = Game.rooms[roomName].findByType(STRUCTURE_SPAWN);
				pathToSource = findTravelPath(spawns[0].pos, sourcePos,
						{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:50000, uncompressed: true});
				if (pathToSource.path.length <= shortestPath) {
					shortestPath = pathToSource.path.length;
				}
			}

			if (remoteRoom === roomName) {
				// local source
				Memory.rooms[roomName].remoteSources[sourceId].range = shortestPath;
			} else {
				// remote sources
				if (roomIsSk(remoteRoom) ) {
				//	let additionalSkEnergy = 650 // SK GUARDS DROP ENERGY WHEN KILLED;
					Memory.rooms[roomName].remoteSources[sourceId].c = calcCarryForEnergyAtDistance(SOURCE_ENERGY_KEEPER_CAPACITY+SOURCE_KEEPER_DROP_ENERGY, shortestPath);
				//	Memory.rooms[roomName].remoteSources[sourceId].energyCap[SOURCE_ENERGY_KEEPER_CAPACITY] = calcCarryForEnergyAtDistance(SOURCE_ENERGY_KEEPER_CAPACITY+SOURCE_KEEPER_DROP_ENERGY, shortestPath);
				} else if (roomIsCenter(remoteRoom) ) {
					Memory.rooms[roomName].remoteSources[sourceId].c = calcCarryForEnergyAtDistance(SOURCE_ENERGY_KEEPER_CAPACITY, shortestPath);
				//	Memory.rooms[roomName].remoteSources[sourceId].energyCap[SOURCE_ENERGY_KEEPER_CAPACITY] = calcCarryForEnergyAtDistance(SOURCE_ENERGY_KEEPER_CAPACITY, shortestPath);
				} else {
					Memory.rooms[roomName].remoteSources[sourceId].c = calcCarryForEnergyAtDistance(SOURCE_ENERGY_CAPACITY, shortestPath);
				//	Memory.rooms[roomName].remoteSources[sourceId].energyCap[SOURCE_ENERGY_NEUTRAL_CAPACITY] = calcCarryForEnergyAtDistance(SOURCE_ENERGY_NEUTRAL_CAPACITY, shortestPath);
				//	Memory.rooms[roomName].remoteSources[sourceId].energyCap[SOURCE_ENERGY_CAPACITY] = calcCarryForEnergyAtDistance(SOURCE_ENERGY_CAPACITY, shortestPath);
				}
				console.log(roomName + " template required hauler parts "+Memory.rooms[roomName].remoteSources[sourceId].c+ "  for "+ sourceId + " at distance " +shortestPath);
				
			}
		}
	}

	if (Memory.rooms[roomName].remoteSources[sourceId]) {
		source = Game.getObjectById(sourceId);
	//	console.log(" source id " + sourceId)
		if (source) {
			
			// Local source, check for link and power operated
			if (source.room.name === roomName) {

				let energyPerTick = SOURCE_ENERGY_CAPACITY/ENERGY_REGEN_TIME;
				let distance = Memory.rooms[roomName].remoteSources[sourceId].range;

				// Link
				let linkCapAvailable = 0;
				if (Memory.rooms[roomName].sources[sourceId].link) {
					let link = Game.getObjectById(Memory.rooms[roomName].sources[sourceId].link)
					if (link) {
						linkCapAvailable = link.getCapacity();
					}
				}
				energyPerTick -= linkCapAvailable;

				// Power operated source
				let powerAdd = 0;
				if (roomIsPowerSource(roomName) ) {	
					let power = POWER_INFO[PWR_REGEN_SOURCE];
					let level = source.room.getPowerLevel(PWR_REGEN_SOURCE) || 0
					powerAdd += Math.ceil((power.effect[limit(level-1, 0, 4)] / power.period) / CARRY_CAPACITY);
				}
				energyPerTick += powerAdd;

				// Container Constructing				
				if (source._cache.containerConstructing) {
					let csite = Game.getObjectById(source._cache.containerConstructing)
					if (!csite){
						delete source._cache.containerConstructing;
					} else {
						energyPerTick -= SOURCE_ENERGY_CAPACITY/ENERGY_REGEN_TIME; // Full source cap
					}
				}

				
				let sateftyFactor = 1.0;
				requiredCarry = Math.max(0, Math.ceil((sateftyFactor*distance*2*energyPerTick)/CARRY_CAPACITY));

			//	log(roomName +" local source " + source + " requires " + requiredCarry + " carry parts, link cap " + linkCap + ", power add " + powerAdd, "green")

			} else {
				// Remote Room

				// Container Constructing				
				let containerConstructing 
				if (source._cache.containerConstructing) {
					let csite = Game.getObjectById(source._cache.containerConstructing)
					if (!csite){
						delete source._cache.containerConstructing;
					} else {
						containerConstructing = true;
					}
				}

				if (containerConstructing) {
					requiredCarry = 0;
				} else {					
					if (source.energyCapacity === SOURCE_ENERGY_NEUTRAL_CAPACITY) { 
						requiredCarry = Math.ceil(Memory.rooms[roomName].remoteSources[sourceId].c/2) 
					} else {
						requiredCarry = Memory.rooms[roomName].remoteSources[sourceId].c
					}
				}
			}
		} else {			
			if (roomIsController(roomName)) {
				requiredCarry = Math.ceil(Memory.rooms[roomName].remoteSources[sourceId].c / 2);
			} else {
				requiredCarry = Memory.rooms[roomName].remoteSources[sourceId].c
			}			
		}
	} else {
		console.log(roomName +" calcRequiredCarryParts no match found for source " + sourceId);
	}
    return requiredCarry * (Memory.rooms[roomName].ajdHaul || 1);
}

function calcCarryForEnergyAtDistance(energy, distance){
	let energyPerTick = energy/ENERGY_REGEN_TIME;
	let sateftyFactor = 1.0;
	return Math.ceil((sateftyFactor*distance*2*energyPerTick)/CARRY_CAPACITY);
}

function createReserverBody(priceMax, reqClaim=6){
	let i = 0;
	let currentCost = 0;
	let arr = [];
	let tempCost = 0;
	while (currentCost < (priceMax) ){
        tempCost = currentCost;
        if ((currentCost + BODYPART_COST[CLAIM]) <= (priceMax-BODYPART_COST[MOVE])){
            currentCost += BODYPART_COST[CLAIM];
            arr.push(CLAIM);
			i++;
        }
        if (( currentCost + BODYPART_COST[MOVE]) <= priceMax){
            currentCost += BODYPART_COST[MOVE];
            arr.push(MOVE);
        }
        if ( tempCost === currentCost || i === reqClaim ) {
            break;
        }
    }
    return arr.reverse();
}



global.lifetimeDmg = function (raiders){
	let dmg = 0;
	for (let idx in raiders) {
		let creep = raiders[idx];
		let ttl = creep.ticksToLive || CREEP_LIFE_TIME;

		let healer = Game.creeps[creep._memory.healer];
		if (healer) {
			ttl = Math.min(ttl, healer.ticksToLive)
		}

		let creepPower = calcSingleCreepStrength(creep);
		dmg += (creepPower.attackDamage + creepPower.rangedAttackDamage) * ttl;
	}

	return dmg;
}

function lifetimeDmgByRoom(raiders, targetRoom){
	let dmg = 0;
	for (let idx in raiders) {
		let creep = raiders[idx];
		let ttl;
		if (creep.room.name !== targetRoom || !creep._memory[C.STARTED]) { 
			ttl = CREEP_LIFE_TIME - (Memory.powerBanks[targetRoom].ticksToTarget + 25);
			if (ttl > CREEP_LIFE_TIME || ttl < 0) { continue; }
		}
		let healer = Game.creeps[creep._memory.healer];
		if (healer) {
			ttl = Math.min(creep.ticksToLive, healer.ticksToLive)
		}
		let creepPower = calcSingleCreepStrength(creep);
		dmg += (creepPower.attackDamage + creepPower.rangedAttackDamage) * ttl;
	}
	return dmg;
}

function timeNeededForBank(raiders, powerBank) {
	let dps = 0;

	let maxAttackers = 3;
	if (powerBank.attackPos) {
		maxAttackers = limit(powerBank.attackPos, 1, 4);
	}

	for (let idx in raiders) {
		let creep = raiders[idx];
		let creepPower = calcSingleCreepStrength(creep);
		dps += (creepPower.attackDamage + creepPower.rangedAttackDamage);
		if (idx >= maxAttackers) { break; }	
	}

	let actTimeNeeded = powerBank.hits / dps;
	return actTimeNeeded;
}

function spawnPowerBankRaiders(spawner, myspawns, energyCap) {
	let parts;
	for (let room in Memory.powerBanks) {
		if (!Memory.powerBanks[room]) { continue; }
		if (!Memory.rooms[room] || !Memory.rooms[room].powerBank) { continue; }		
		if (Memory.powerBanks[room].assignedRoom !== spawner) {	continue; }
		if (Memory.powerBanks[room].avoid) { continue; }
		let partsAttacker, bodyHealer;
		let bankId = Memory.rooms[room].powerBank.id;

		let raiders = _.filter(getCreeps('powerBankRaider', spawner), (creep) => creep._memory.bankId == bankId);
		let healers = _.filter(getCreeps('healer', spawner), (creep) => creep._memory.bankId == bankId);
		let healerId = squadNeedsSpawn(spawner, healers, room);
		let raidersId = squadNeedsSpawn(spawner, raiders, room);
		
		let spawning = false;
		let boosted = false;

		/*
		if (Memory.powerBanks[this.room.name].hostilePower && Memory.powerBanks[this.room.name].hostilePower > 2000 &&
			!Memory.powerBanks[this.room.name].spawnedRA
		//	false
		) {
			let boostedRangedAttackers = _.filter(getCreeps('rangedAttacker', spawner), (creep) => creep._memory.bankId == bankId);
			if (boostedRangedAttackers.length <= 0 && empireHasBoosts({[T3_TOUGH]: 200000, [T3_RANGED_ATTACK]: 400000, [T3_HEAL]: 200000, [T3_MOVE]: 200000})) {
				
				Memory.powerBanks[this.room.name].spawnedRA = 1;
				let bodyAttacker = createMaxBody(energyCap, {tough: 5, rangedAttack: 25, heal: 10, move: 10,} );

			}

		}*/

		if (lifetimeDmg(raiders) < Memory.rooms[room].powerBank.hits || healerId || raidersId) {

			let requiredAttackers = 1;
			let timeNeeded = Infinity;
			let timeLeft = 0;

			bodyHealer = createMaxBody(energyCap, {heal: 1, move: 1} );
			let healParts = countBodyparts(bodyHealer, HEAL);
			let maxAttackParts = Math.floor((healParts * HEAL_POWER) / (ATTACK_POWER * POWER_BANK_HIT_BACK))
			
			if (empireHasBoosts({[T3_TOUGH]: 200000, [T3_ATTACK]: 200000}) &&
				healParts >= 25 &&
				Memory.rooms[room].powerBank.hits > 1000000
			) {
				boosted = true;
				timeNeeded = Memory.rooms[room].powerBank.hits / (16*ATTACK_POWER*4);
				timeLeft = Memory.rooms[room].powerBank.timeOut - Game.time;
				partsAttacker = {tough: 3, attack: 16, move: 19}	// 16 attack max for 25 heal parts
				
			} else {				
				if (Memory.rooms[room].powerBank.attackPos) {
					requiredAttackers = limit(Memory.rooms[room].powerBank.attackPos, 1, 4);
				}

				timeNeeded = Memory.rooms[room].powerBank.hits / (maxAttackParts*ATTACK_POWER*requiredAttackers);	
				timeLeft = Memory.rooms[room].powerBank.timeOut - Game.time;
				partsAttacker = {attack: maxAttackParts, move: maxAttackParts}
			}

			if (timeNeeded > timeLeft) {
				if (healerId || raidersId) { cancelSquad(spawner, healerId)}
				continue;
			}

			spawning = true;
			if (preSpawnCreepsCheck(raiders, 150, requiredAttackers) || healerId || raidersId) {			
				spawning = true;
				if (!healerId && !raidersId){
					addNewSquadToQueue(spawner, room);
					healerId = squadNeedsSpawn(spawner, healers, room);
					raidersId = squadNeedsSpawn(spawner, raiders, room);
					console.log(spawner +" #### created new powerbank sqaud id " + healerId);
				}
			}
		}

		if (spawning) {
			if (boosted) {				
				Game.rooms[spawner].setBoostMode(true, {[T3_TOUGH]: partsAttacker.tough*LAB_BOOST_MINERAL, [T3_ATTACK]: partsAttacker.attack*LAB_BOOST_MINERAL});
			}

			let bankPos;
			if (Memory.rooms[room] && Memory.rooms[room].powerBank && Memory.rooms[room].powerBank.pos) {
				bankPos = Memory.rooms[room].powerBank.pos;
			}
			let pbMemory = {[C.ROLE]: 'powerBankRaider', [C.ROOM_ORIGIN]: spawner, bankId: bankId, [C.ROOM_TARGET]: room , sqaudId: raidersId, ticksToTarget: 0, boost: boosted, bankPos: bankPos  }

			if (healerId && raidersId) {
				let cost = myspawns[0].creepCost(bodyHealer);
			//	log(spawner + " creating new power bank healer, stored energy " + Game.rooms[spawner].energyCapacityAvailable +"/"+ cost)
				if (Game.rooms[spawner].energyCapacityAvailable < cost) {
					console.log("delaying spawn, waiting for energy " + Game.rooms[spawner].energyCapacityAvailable + "/" + cost)
					setDelayTimeUntilNextSpawnCheck(spawner, 8);
					return 1;
				} // store some more energy first
				myspawns[0].createCreep(bodyHealer, 'hl'+makeid(),
					{[C.ROLE]: 'healer', [C.ROOM_ORIGIN]: spawner, bankId: bankId, [C.ROOM_TARGET]: room, sqaudId: healerId, followRole: 'powerBankRaider' });
				
				// ADD RAIDER TO Q
				parts =  createBody(energyCap, partsAttacker );
				myspawns[0].addToQ(parts, 'pbRQ'+makeid(), pbMemory, 160);
			//	log(spawner + " ADDED RAIDER TO Q ")
				return 1;
			} else if (healerId) {				
				myspawns[0].createCreep(bodyHealer, 'hl'+makeid(),
					{[C.ROLE]: 'healer', [C.ROOM_ORIGIN]: spawner, bankId: bankId, [C.ROOM_TARGET]: room, sqaudId: healerId, followRole: 'powerBankRaider' });
				return 1;
			} else if (raidersId) {				
				parts =  createBody(energyCap, partsAttacker);	
				myspawns[0].createCreep(parts, 'pbR'+makeid(), pbMemory);
				return 1;
			}

		}		
	}
}


function spawnPowerBankHaulers(spawner, myspawns, energyCap) {
	for (let room in Memory.powerBanks) {
		if (!Memory.powerBanks[room]) { continue; }
		if (!Memory.rooms[room] || !Memory.rooms[room].powerBank || Memory.rooms[room].powerBank.hits === POWER_BANK_HITS) { continue; }

		if ((Memory.powerBanks[room].haulers && Memory.powerBanks[room].haulers[spawner]) || Memory.powerBanks[room].assignedRoom === spawner) {
			let bankId = Memory.rooms[room].powerBank.id;		
			let raiders = _.filter(getCreeps('powerBankRaider'), (creep) => creep._memory.bankId == bankId);
			
			if (raiders.length === 0) { continue; }			
			let actTimeNeeded = timeNeededForBank(raiders, Memory.rooms[room].powerBank);

		//	let lifeTimeDmg = lifetimeDmgAroundPos(pos);
		//	console.log(room + " checking PB haulers, timeNeeded " + actTimeNeeded+ ", traveltime " + Memory.rooms[room].powerBank.ticksToTarget + " current hits "+Memory.rooms[room].powerBank.hits + " with raiders " + raiders.length + " id " +bankId);
			if (((actTimeNeeded < (CREEP_LIFE_TIME/2) + Memory.rooms[room].powerBank.ticksToTarget) &&
				lifetimeDmgByRoom(raiders, room) >= Memory.rooms[room].powerBank.hits)				
				){
				let haulers = _.filter(getCreeps('powerBankHauler'), (creep) => creep._memory.bankId == bankId);
				let curHaulPower = haulers.length * 25 * CARRY_CAPACITY;
				if (curHaulPower < Memory.rooms[room].powerBank.power) {
					let requiredHaulers = Math.ceil(Memory.rooms[room].powerBank.power / (25 * CARRY_CAPACITY));
					Memory.powerBanks[room].requiredHaulers = requiredHaulers;					
				//	console.log(room + " PB haulers spawning, timeNeeded " + actTimeNeeded+ " for hits " + Memory.rooms[room].powerBank.hits +", traveltime " + Memory.rooms[room].powerBank.ticksToTarget + " required haulers "+requiredHaulers );
				//	let parts = createBody(energyCap, {move: 25, carry: 25} );
					let parts = createBodyPartCarrier(energyCap, 25);
					let id = 'pbh'+makeid()
					myspawns[0].createCreep(parts, id,
						{[C.ROLE]: 'powerBankHauler', [C.ROOM_ORIGIN]: Memory.powerBanks[room].assignedRoom, bankId: bankId, [C.ROOM_TARGET]: room  });
					if (Memory.powerBanks[room].spawnedHaulers === undefined) { Memory.powerBanks[room].spawnedHaulers = []; }
					Memory.powerBanks[room].spawnedHaulers.push(id);
					return 1;
				}
			}
		}
	}
}

function spawnMovers(spawner, energyCap, myspawns, movers){

	let parts;
	let requiredMovers = Memory.rooms[spawner][R.REQUESTED_MOVERS];	

	if (!Game.rooms[spawner].storage && !Game.rooms[spawner].terminal) {
		requiredMovers = Math.min(1, requiredMovers);		
	}

	if (Memory.rooms[spawner].sieged && Game.time < Memory.rooms[spawner].sieged ) {
		requiredMovers = Math.max(2, requiredMovers);
	}

	if (Memory.combatBoost[spawner] && Memory.combatBoost[spawner].boosts) {
		requiredMovers = Math.max(2, requiredMovers);
	}

	let energyToUse = energyCap;	
	
	if(movers.length < requiredMovers) {


		let spawnMoversForRoads = true;
		if (getRoomPRCL(spawner) < 4 && !Memory.rooms[spawner].roadsBuilt) {

			for (let id in Memory.rooms[spawner].sources) {
				let _roadBuiltStatus = roadBuiltStatus(spawner, id);
				if (_roadBuiltStatus < 1) {
					spawnMoversForRoads = false;
				}
			}
		}

		if (ENABLE_SPAWN_EXTENSIONS) {

			if (isCpuLimited() && requiredMovers > 1 ){		
				energyToUse = getSpawnerBlockEnergy(spawner, false);
			} else {
				energyToUse = getSpawnerBlockEnergy(spawner, true);
			}
			
		} else if (movers.length === 0 && !ENABLE_SPAWN_EXTENSIONS) {
			energyToUse = Math.min(energyToUse, Game.rooms[spawner].energyAvailable);
	
		} else if (globalEnergyCrysis() || getRoomPRCL(spawner) < 7){
			let maxSize = 27;
			energyToUse = Math.min(energyCap, maxSize * BODYPART_COST[MOVE]);		
		}	
		parts = createBodyHaulerV2(50, energyToUse, 0, spawnMoversForRoads)

		let bestSpawn = bestSpawnForDest(myspawns,  Game.rooms[spawner].storage);	
			
		bestSpawn.createCreep(parts, 'mv'+makeid(), {[C.ROLE]: 'mover', [C.ROOM_ORIGIN]: spawner});	
		return 1;

	} 
}

function spawnExtractors(spawner, energyCap, myspawns){	

	let localSources = Memory.rooms[spawner].sources;	
	let parts;
	let sourceCnt = 0;
	let allHaulers;
	for (let sourceId in localSources) {		
		
		if (Memory.rooms[spawner].sieged) {
			let source = Game.getObjectById(sourceId);
			if (source && isOutsideWalls(source.getHarvesterPos(spawner))) {
				Game.rooms[spawner].visual.circle(source.pos.x, source.pos.y , {fill: 'transparent', radius: 0.50, stroke: 'red'})
				continue;
			}
		}

		let extractors = _.filter(getCreeps('extractor', spawner), (creep) => creep._memory[C.SOURCE_ID] == sourceId);		
		
		let ratio = 1;
		if (preSpawnCreepsCheck(extractors, 50)){
			let addBodyParts = 0;

			if (getRoomPRCL(spawner) >= 5) {
				let cpuLimit = isCpuLimited()
				if (cpuLimit >= CPU_SAVING_HIGH) {
					addBodyParts = 8; 
				} else if (cpuLimit >= CPU_SAVING_MEDIUM) {
					addBodyParts = 6; 
				} else if (cpuLimit >= CPU_SAVING_LOW) { 
					addBodyParts = 4; 
				}
			}
			
			if (energyCap < 500) {
				parts = createBodyExtractorAdd(energyCap, 6);
			} else {
				parts = createBodyPartsExtractor(energyCap, sourceId, addBodyParts);
			}
			updateActiveMines(spawner, sourceId, true);
			let bestSpawn = bestSpawnForDest(myspawns, Game.getObjectById(sourceId));
			bestSpawn.createCreep(parts, 'ex'+makeid(), {[C.ROLE]: 'extractor', [C.ROOM_ORIGIN]: spawner, [C.SOURCE_ID]: sourceId });				
			return 1;
		} else if (extractors.length === 1 && energyCap < 800) {

			let harvestParts = 6;
			let maxExtracors = 1;
			let extractorAdd = [];
			
			maxExtracors = Game.getObjectById(sourceId).getNumberOfHarvestPos();
			harvestParts = getBodyparts(extractors, WORK);
			extractorAdd = _.filter(getCreeps('extractorAdd', spawner), (creep) => creep._memory[C.SOURCE_ID] == sourceId);
			harvestParts += getBodyparts(extractorAdd, WORK);
			
			ratio = Math.min(1, harvestParts/5)

			if (maxExtracors <= 1) {
				parts = createBodyPartsExtractor(energyCap, sourceId, 0);
				let workParts = countBodyparts(parts, WORK);
				if (workParts - harvestParts >= 2) {
					if (workParts && countBodyparts(parts, CARRY) <= 0) { continue; } // wait for full body
					let bestSpawn = bestSpawnForDest(myspawns, Game.getObjectById(sourceId));
					bestSpawn.createCreep(parts, 'ex'+makeid(), {[C.ROLE]: 'extractor', [C.ROOM_ORIGIN]: spawner, [C.SOURCE_ID]: sourceId });				
					return 1;
				}
			}

			if (harvestParts < 5 && (extractors.length + extractorAdd.length) < maxExtracors && (getCreeps('mover', spawner).length > 0 || getCreeps('hauler', spawner).length > 0)) {
				
				let missingWorkParts = 6 - harvestParts;				
				parts = createBodyExtractorAdd(energyCap, missingWorkParts);

			//	parts = createBodyPartsExtractor(energyCap);
				myspawns[0].createCreep(parts, 'exA'+makeid(), {[C.ROLE]: 'extractorAdd', [C.ROOM_ORIGIN]: spawner, [C.SOURCE_ID]: sourceId});				
				return 1;
			} 
		}
		
		// Use haulers!
		sourceCnt++		
		if (!allHaulers) {
			allHaulers = getCreeps('hauler', spawner);
		}

		if (allHaulers.length < sourceCnt) {
			if (spawnHaulers(spawner, myspawns, sourceId, energyCap, spawner, ratio) ) {
				return 1;
			}
		}

	}
	return 0;
}

global.roomIsPowerSource = function(roomName){
	if (Memory.rooms[roomName].powerSources) { 
		if (Memory.rooms[roomName].powerSources > Game.time) {
			return true;
		} else {
			delete Memory.rooms[roomName].powerSources
		}
	}
	return false;
}

function createBodyUpgrader(price, maxWorkParts = 6) {
	let arr = [];
    let currentCost = 0;
    let tempCost = 0;
    let i = 0;
	let j = 0; 
	let k = 0;

	currentCost += BODYPART_COST[MOVE];
    arr.push(MOVE);
	k++;

	currentCost += BODYPART_COST[CARRY];
    arr.push(CARRY);
	j++;

	currentCost += BODYPART_COST[WORK];
    arr.push(WORK);
	i++;

	while (currentCost < price ){
        tempCost = currentCost;

        if (i < maxWorkParts && (currentCost + BODYPART_COST[WORK]) <= price){
            currentCost += BODYPART_COST[WORK];
            arr.push(WORK);
			i++;
        }
        if (i < maxWorkParts && (currentCost + BODYPART_COST[WORK]) <= price){
            currentCost += BODYPART_COST[WORK];
            arr.push(WORK);
			i++;
        }
		if (i < maxWorkParts && (currentCost + BODYPART_COST[WORK]) <= price){
            currentCost += BODYPART_COST[WORK];
            arr.push(WORK);
			i++;
        }
		if (i < maxWorkParts && (currentCost + BODYPART_COST[WORK]) <= price){
            currentCost += BODYPART_COST[WORK];
            arr.push(WORK);
			i++;
        }
        if ( (currentCost + BODYPART_COST[MOVE]) <= price && i/k > 4){
            currentCost += BODYPART_COST[MOVE];
            arr.push(MOVE);
			k++;
        }
		if ( (currentCost + BODYPART_COST[CARRY]) <= price && i/j > 8){
            currentCost += BODYPART_COST[CARRY];
            arr.push(CARRY);
			j++;
        }

        if ( (tempCost == currentCost) || (i >= maxWorkParts) || arr.length >= 47 || currentCost + BODYPART_COST[WORK] + 50 > price ) {
            break;
        }
    }
	return arr.reverse();
}

function createBodyExtractorAdd(price, maxWorkParts = 6) {
	let arr = [];
    let currentCost = 0;
    let tempCost = 0;
    let i = 0;

	while (currentCost < (price) ){
        tempCost = currentCost;
        if ( (currentCost + BODYPART_COST[WORK]) <= (price-50)){
            currentCost += BODYPART_COST[WORK];
            arr.push(WORK);
			i++;
        }
        if (i < maxWorkParts && (currentCost + BODYPART_COST[WORK]) <= (price-50)){
            currentCost += BODYPART_COST[WORK];
            arr.push(WORK);
			i++;
        }
        if ( (currentCost + BODYPART_COST[MOVE]) <= (price)){
            currentCost += BODYPART_COST[MOVE];
            arr.push(MOVE);
        }
        if ( (tempCost == currentCost) || (i >= maxWorkParts) || arr.length >= 47 || currentCost + BODYPART_COST[WORK] + 50 > price ) {
            break;
        }
    }
	return arr;
}

function createBodyPartsExtractor(price, sourceId=0, addWorkParts = 0){

    let arr = [];
    let currentCost = 0;
    let tempCost = 0;
    let i = 0;
	let requiredWork = 6;
	let addCarry = 0;
	
    if (sourceId != 0){
        let source = Game.getObjectById(sourceId);
        if (source && source.isSource) {
            requiredWork = Math.ceil((source.energyCapacity/ENERGY_REGEN_TIME) / HARVEST_POWER)+addWorkParts+1;
			if (roomIsPowerSource(source.room.name) ) {	
				let power = POWER_INFO[PWR_REGEN_SOURCE];
				let level = source.room.getPowerLevel(PWR_REGEN_SOURCE) || 4
				requiredWork += Math.ceil((power.effect[limit(level-1, 0, 4)] / power.period) / HARVEST_POWER);
				addCarry = 2;
			}
        }
    } else {
		requiredWork = 6 + addWorkParts;		
	}

    while (currentCost < (price) ){
        tempCost = currentCost;
        if ( (currentCost + BODYPART_COST[WORK]) <= (price-50)){
            currentCost += BODYPART_COST[WORK];
            arr.push(WORK);
			i++;
        }
        if ( (currentCost + BODYPART_COST[WORK]) <= (price-50)){
            currentCost += BODYPART_COST[WORK];
            arr.push(WORK);
			i++;
        }
        if ( (currentCost + BODYPART_COST[MOVE]) <= (price)){
            currentCost += BODYPART_COST[MOVE];
            arr.push(MOVE);
        }
        if ( (tempCost == currentCost) || (i >= requiredWork) || arr.length >= 47 || currentCost + BODYPART_COST[WORK] > price) {
            break;
        }
    }
	if ( (currentCost + BODYPART_COST[CARRY]) <= (price)) {
		arr.push(CARRY);

		if (addCarry) {
			currentCost += BODYPART_COST[CARRY];
			if ( (currentCost + BODYPART_COST[CARRY]) <= (price)) {
				arr.push(CARRY);
				currentCost += BODYPART_COST[CARRY];
			}
			if ( (currentCost + BODYPART_COST[CARRY]) <= (price)) {
				arr.push(CARRY);
				currentCost += BODYPART_COST[CARRY];
			}
		}
	}
	

    return arr;
}



global.createBodyPartsRangedAttacker = function(price){
    let arr = [];
    let currentCost = 0;
    let tempCost;

	let healParts = limit(Math.floor(price/750), 0, 10);
	currentCost += BODYPART_COST[MOVE];
	arr.push(MOVE);

	for (let i=0; i<healParts; i++){
		currentCost += BODYPART_COST[HEAL];
		arr.push(HEAL);
	}
	for (let i=0; i<healParts-1; i++){
		currentCost += BODYPART_COST[MOVE];
		arr.push(MOVE);
	}
	currentCost += BODYPART_COST[MOVE];
    arr.push(MOVE);
	/*
	currentCost = currentCost + BODYPART_COST[MOVE];
    arr.push(MOVE);
	*/

	let raParts = 0;
	let prevRaParts = 0;
    while (currentCost < price && arr.length < 48 ){
		tempCost = currentCost;
		prevRaParts = raParts

		if ( (currentCost + BODYPART_COST[RANGED_ATTACK]) <= price){
            currentCost += BODYPART_COST[RANGED_ATTACK];
            arr.push(RANGED_ATTACK);
			raParts++
		}
		
		if ( (currentCost + BODYPART_COST[MOVE]) <= price){
            currentCost += BODYPART_COST[MOVE];
            arr.push(MOVE);
        }
		
        if (tempCost == currentCost) {
            break;
        }
	}

	if (arr.length < 50 && (currentCost + BODYPART_COST[MOVE]) <= price){
		currentCost += BODYPART_COST[MOVE];
		arr.push(MOVE);
	}
	

    return arr.reverse();
}

function createBodyPartsTowerDrainer(price){
    let arr = [];
    let currentCost = 0;
    let tempCost;

    while (currentCost < (price) ){
        tempCost = currentCost;
		if ( (currentCost + BODYPART_COST[TOUGH]) <= price){
            currentCost = currentCost + BODYPART_COST[TOUGH];
            arr.push(TOUGH);
        }
		if ( (currentCost + BODYPART_COST[MOVE]) <= price){
            currentCost = currentCost + BODYPART_COST[MOVE];
            arr.push(MOVE);
        }
		if ( (currentCost + BODYPART_COST[HEAL]) <= price){
            currentCost = currentCost + BODYPART_COST[HEAL];
            arr.push(HEAL);
        }
        if (tempCost == currentCost) {
            break;
        }
    }
    return arr;
}

function createBodyPartsRangedAttackerEx(price, enemyHealPower=0, enemyAttackPower=0){
    let arr = [];
    let currentCost = 0;
    let tempCost;
	let safetyFactor = 1.2;
	let requiredRangedAttack = 3;
	let requiredHeal = 1;

	if (enemyHealPower > 0) {
		requiredRangedAttack = Math.ceil((enemyHealPower / RANGED_ATTACK_POWER)*safetyFactor);
	}
	if (enemyAttackPower > 0) {
	 	requiredHeal = Math.ceil((enemyAttackPower / HEAL_POWER)*safetyFactor);
	}


	currentCost = currentCost + BODYPART_COST[TOUGH];
    arr.push(TOUGH);
	currentCost = currentCost + BODYPART_COST[MOVE];
    arr.push(MOVE);
	currentCost = currentCost + BODYPART_COST[MOVE];
    arr.push(MOVE);

    while (currentCost <= (price-BODYPART_COST[HEAL]) ){
        tempCost = currentCost;
		if ( (currentCost + BODYPART_COST[MOVE]) <= (price-BODYPART_COST[MOVE])){
            currentCost = currentCost + BODYPART_COST[MOVE];
            arr.push(MOVE);
        }
        if ( (currentCost + BODYPART_COST[RANGED_ATTACK]) <= (price-BODYPART_COST[RANGED_ATTACK])){
            currentCost = currentCost + BODYPART_COST[RANGED_ATTACK];
            arr.push(RANGED_ATTACK);
        }
        if (tempCost == currentCost) {
            break;
        }
    }
	arr.push(HEAL);
    return arr;
}


function createBodyPartsUpgrader(price){
    let arr = [];
    let currentCost = 0;
    let tempCost;

	arr.push(CARRY);
	currentCost = currentCost + BODYPART_COST[CARRY];
	arr.push(CARRY);
	currentCost = currentCost + BODYPART_COST[CARRY];
	arr.push(MOVE);
	currentCost = currentCost + BODYPART_COST[MOVE];

    while (currentCost <= price ){
        tempCost = currentCost;
        if ( (currentCost + BODYPART_COST[WORK]) <= price){
            currentCost = currentCost + BODYPART_COST[WORK];
            arr.push(WORK);
        }
		if ( (currentCost + BODYPART_COST[WORK]) <= price){
            currentCost = currentCost + BODYPART_COST[WORK];
            arr.push(WORK);
        }
        if ( (currentCost + BODYPART_COST[MOVE]) <= price){
            currentCost = currentCost + BODYPART_COST[MOVE];
            arr.push(MOVE);
        }
        if (tempCost == currentCost || arr.length >= 47) {
            break;
        }
    }
    return arr;
}

function creepSpawnCount(spawner) {

	if (!Memory.rooms[spawner][R.SPAWN_COUNT_TIMER]) {
		Memory.rooms[spawner][R.SPAWN_COUNT_TIMER] = Game.time + 200;
		if (Memory.rooms[spawner].ajdHaul === undefined) { Memory.rooms[spawner].ajdHaul = 1.0; }	// Factor to increas haul carry parts with

		if ( Memory.rooms[spawner][R.REQUESTED_MOVERS] === undefined){  
			
			if (ENABLE_SPAWN_EXTENSIONS) {
				if (!Game.rooms[spawner].storage && !Game.rooms[spawner].terminal && Game.rooms[spawner].getControllerContainer().length <= 0) {
					Memory.rooms[spawner][R.REQUESTED_MOVERS] = 0;
				} else {
					Memory.rooms[spawner][R.REQUESTED_MOVERS] = 1;
				}				
			} else {
				Memory.rooms[spawner][R.REQUESTED_MOVERS] = 4;
			}
		} 
	}

    if (Game.time >= Memory.rooms[spawner][R.SPAWN_COUNT_TIMER]){

		requestMemSave();

		Memory.rooms[spawner][R.SPAWN_COUNT_TIMER] = Game.time + 200;

		// Haulers
		if (Memory.rooms[spawner].wrkHaul !== undefined) {
	
			let working = 1;
			if (Memory.rooms[spawner].wrkHaul !== undefined) { working = Memory.rooms[spawner].wrkHaul || 1 }
			let idle = 0;
			if (Memory.rooms[spawner].idleHaul !== undefined) { idle = Memory.rooms[spawner].idleHaul || 1 }

			let workDone = idle+working
			let percentWork = Math.round((working / (workDone)) * 100) 
		//	log("workDone " +workDone)

			if (workDone > 100) {

				let addPartsRatio=0;
				if (percentWork >= 98)  {
					addPartsRatio = 0.02;
				}
				else if (percentWork < 90)  {
					addPartsRatio = -0.02;
				}

			//	log("addPartsRatio " +addPartsRatio)
	
				let avoidingPlayers = Memory.rooms[spawner].roleHaulerAvoidPlayers || 0;
				let avoidRatio = Math.round((avoidingPlayers / (working+idle) )*100);
				if (avoidRatio > 5) {
					// dont change requests					
				} else {
					Memory.rooms[spawner].ajdHaul = limit((Memory.rooms[spawner].ajdHaul + addPartsRatio) , 1.0, 1.2);
				}
			}

		//	log("ajdHaul " +Memory.rooms[spawner].ajdHaul)
			
			Memory.rooms[spawner].wrkHaulP = percentWork;
			Memory.rooms[spawner].wrkHaul = 0;
			Memory.rooms[spawner].idleHaul = 0;
			delete Memory.rooms[spawner].roleHaulerAvoidPlayers;
		}

		// Movers
		if (Memory.rooms[spawner].wrkMvP === undefined){ Memory.rooms[spawner].wrkMvP = 0; }
		if (Memory.rooms[spawner].idleMv === undefined){ Memory.rooms[spawner].idleMv = 0; }
		if (Memory.rooms[spawner].wrkMv === undefined){ Memory.rooms[spawner].wrkMv = 0; }

        if (Memory.rooms[spawner].wrkMv > 0) {
			let idle = Memory.rooms[spawner].idleMv || 0;
			let working = Memory.rooms[spawner].wrkMv || 1;
			Memory.rooms[spawner].wrkMvP = Math.round((working / (idle+working)) * 100) 
        }
		let RequestMovers=0;

		if (Memory.rooms[spawner][R.REQUESTED_MOVERS] > 0) {
			if (Memory.rooms[spawner].wrkMvP >= 95)  {
				RequestMovers++;
			}
			else if (Memory.rooms[spawner].wrkMvP < (100-(100/Memory.rooms[spawner][R.REQUESTED_MOVERS])))  {
			   RequestMovers--;
			}
		}		

		Memory.rooms[spawner].idleMv = 0;
		Memory.rooms[spawner].wrkMv = 0;

		let minMovers = 2;
		if (Memory.PraiseGCL[spawner] ) { minMovers = 2; }
		if (ENABLE_SPAWN_EXTENSIONS) { minMovers = 0 ; }
	
		
		if (Memory.rooms[spawner][R.REQUESTED_MOVERS] === 0) {
			if (Game.rooms[spawner].storage || Game.rooms[spawner].terminal || Game.rooms[spawner].getControllerContainer().length > 0) {
				Memory.rooms[spawner][R.REQUESTED_MOVERS] = 1;
			}
		}

		Memory.rooms[spawner][R.REQUESTED_MOVERS] = limit(Memory.rooms[spawner][R.REQUESTED_MOVERS] + RequestMovers , minMovers, 8);		
     //   console.log("Average mover usage: " +Memory.rooms[spawner].wrkMvP +"% requesting " +RequestMovers +" new movers in room "+ spawner + " new total: "+ Memory.rooms[spawner][R.REQUESTED_MOVERS]);
		
	}

	// Startup miners
	let minerTimer = 275;
	if (Memory.rooms[spawner].stmnAdjTs === undefined) { 
		Memory.rooms[spawner].stmnAdjTs = Game.time + minerTimer;
	//	Memory.rooms[spawner].adjStmn = 1;
	}

	if (Game.time > Memory.rooms[spawner].stmnAdjTs) {
		requestMemSave();

		Memory.rooms[spawner].stmnAdjTs = Game.time + minerTimer;
		let spawnerMemory = Memory.rooms[spawner];

		let idleTicks = spawnerMemory.idleStartMiner || 0;
		let workTicks = spawnerMemory.wrkStartMiner || 1;

		let workDone = idleTicks+workTicks;
		let percentWork = workTicks / workDone;

		if (workDone >= minerTimer / 2) {
			spawnerMemory.adjStmn = percentWork;
		} else {
			spawnerMemory.adjStmn = 1;
			delete spawnerMemory.adjStmn
		}

		delete spawnerMemory.idleStartMiner;
		delete spawnerMemory.wrkStartMiner;
	}


	// Timer
	let upgraderTimer = 75;
	if (Memory.rooms[spawner].upAdj === undefined) { 
		Memory.rooms[spawner].upAdj = Game.time + upgraderTimer;
		Memory.rooms[spawner].upWorking = 100;
	}

	if (Game.time > Memory.rooms[spawner].upAdj) {
		requestMemSave();
		let ticksSinceLast = Game.time - Memory.rooms[spawner].upAdj + upgraderTimer
		Memory.rooms[spawner].upAdj = Game.time + upgraderTimer;

	 	let spawnerMemory = Memory.rooms[spawner];

		// Upgraders
		let idleTicks = spawnerMemory.idleUp || 0;
		let workTicks = spawnerMemory.wrkUp || 1;
		
		let percentWork = Math.round((workTicks / (workTicks+idleTicks) )*100);
		spawnerMemory.upWorking = percentWork;

		delete spawnerMemory.idleUp;
		delete spawnerMemory.wrkUp;
		
		// Spawn idle count
		let spawnerCache = getRoomCache(spawner);
		idleTicks = spawnerCache.spwnIdle || 1;
		let busyTicks = spawnerCache.spwnBusy || 0;
		
		let spawnPercentWork = Math.round((busyTicks / ticksSinceLast )*100);

		delete spawnerCache.spwnIdle;
		delete spawnerCache.spwnBusy;

		spawnerMemory.spawnerWork = spawnPercentWork;



		if (Memory.rooms[spawner].spawnCost !== undefined) {
			Memory.rooms[spawner].spawnCostTicks = Memory.rooms[spawner].spawnCost / ticksSinceLast;
			delete Memory.rooms[spawner].spawnCost
		} else  {
			delete Memory.rooms[spawner].spawnCostTicks
		}

    }
}

function needsRefresh(creeps, minimumTicks) {
	for (let idx in creeps) {
		let creep = creeps[idx];
		if (creep.ticksToLive < minimumTicks) {
			return true;
		}
	}
	return false;

}

function makeid() {
	// Generate a unique id
	if (Memory.myCreepNameCounter >= 100000) {
		Memory.myCreepNameCounter = 1;
	}
	Memory.myCreepNameCounter++
	
	return Memory.myCreepNameCounter.toString(36);
}
