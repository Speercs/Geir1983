
/* TODO LIST

reduce turteling when active safemode cd, walls level and last time enemy seen?
source extensions can block/be placed on outer ramparts
new rooms need healer, not just rampart defender
mover/filler paths cheaper around empty extensions?
deconstructor not healing up befre reentering room
make spawner create smaller creeps if stuck too long? (on recovery)
movers should switch to work mode if partial filled instead of traversing room to get 100% filled.

// season 5 rooms
	E25S17 storage near room exits, ramparts could be better?
	E26S27 controller tunnel
	E17S12 edge walls better here
	

make sure to share energy 
no 2 layer ramparts unless needed
scale rampart hits more gradualy, global scale done, also needs individual room scale (fPRCL)?

upgrader fills extensions, upgrader block for rcl 8 if near other extensions?

remove focused player if attacked by other player?
nearby wars trigger roads on ramparts
	and double layers?

quads need proper flee
quads need better move into formation


trackEnergyHarvestedAndInvaders obsolete?

ra does not flee while low when defending own room? 

E3N14 room plan fails BA210
E8N2 fails BA210

room plan, place tower near worst defended spot, then repeat (or place all center)?
room plan, more plans - rotate where starting stamps are placed?
room plan, place store block near exits (dont tuck deep inside a cave)

traffic manager?
		each creep stores its intended move location (even if fatigued)
		if the intended move is already defined, store it as conflict
		after all creeps have moved (registered), resolve conflicts
		
			let phalanx and move as one before others
			let energy carrying creeps move before empty
			if one creep has fatigue (fat) others should path around it, trying to stay near original path 

first start

	- make room claimer prefer rooms that can be supported by rcl 7, or the amount of supporting rooms? avoid claiming if despawned in area?

	- healInRange should consider what creeps can take what damage, only for hostile rooms..?

	- create labs only if current minerals can be combined to boost, not just two mineral types	
	- idle hauler/movers should find a spot not next to store to idle

	- early drainer quads, minimal dmg but can outheal inside the room (6 heal - 2 ra)
		- if towers out of energy and base breached, send in anything

	- record tower strength at ramparts in addition to max tower strength - getWallPerimiterDamage(roomName) allow attacks at this heal rate
	- v3 attack coordinatoor, mark an enemy player as focused target, only spawn for this (and easy/stomping targets)
		- if all rooms in range 
		- focus remotes (low roi), scale attackers to avg defnders, add deconstructors
	- v3 defend remotes and owned rooms
	- v3 needs to keep taken out rooms down, make this higher priority, else it other can rebuilds - wipes - rebuilds 
	
	allow withdrawing energy from controller and spawnerblock under certain conditions?

	

	deposit miners
		suicde on arrival (spawned far away, but could make the trip to nearby room)
		miners keep swapping places

	traveller 
		- ignore creeps far away

	deconstructer
		- no hunter
		- no stomp cstie?

	invaderKiller
		Does not need to match the heal of invaders, needs to out dps that heal - dont copy and one up invader parts!

	invader cores		
		4 - RA+HealQuad (no repairer) snipes core if possible, 6 quads ~ 3 at a time
			2x 5 tough, 23 ra, 12 heal
			2x 5 tough, 3 ra, 32 heal

	controller link can be placed on source extension
	yield road, only if nearby creep moving to my pos (check path and if other creep already moved or not)

	- ranged attacker idles up in own rooms outside base, sometimes in swamps etc, make them go inside base if no targets

	- rate expansion target ignore dead players in remotes and allow settling near weak players

	- emergency harvester and movers stuck trying to get energy outside base while enemies present (tigga source campers)

	- ikS flees from source keeper if alone

	- deconstructor pairs are sent to stomp new rooms, but should evaluate the amount defenders (not just if no tower)

	- createMaxBody should fill out the max 50 body parts, count move ratio and add partial parts to fill (add first non move + additional move?), 48 part creeps => 50 part creeps

	- deconstructor should not reatreat past enemy creeps

	- NEW REMOTE DEFENCE
		- spawn melee deconstructor pairs
		- count energy spent, give it a budget it can spend, then have to restore over time
		- remotes are currently not considered attacked if no remoters spawned *checkRoomIsActiveMine
		- RA in pairs/quads
		- group up, make sure to count nearby creeps and not spawning for every room individually

	- movers refill extensions, choose pos for next extension based on number of extensions in range of fill pos, create cached list

	- isOutsideWalls returns false for source pos etc
	- lookForEnemyCreepsAround does not take care for special comabt room or naughty list

	- phalanx can get stuck outside the actual rooms, make them break formation if no enemies in room?

	- claiming rooms need 1 helper with higer priority to get spawn built (boosted?)

	- mineral mover can spawn with only move parts (48?), target was sk room with invader core

	- Turtle mode for botarena/startup/siged?
		- use extensions around sources to transfer energy by spawn/recycle creep
		- limited mover sizes
		- shut down remotes if attacked
		- dont rebuild extensions around sources if attacked?
			
	- close rooms should share remotes, to prevent new room "choking" old ones because they are nearer to sources
	- hero names for pc Ezekiel, the , great, King
	- make some boosts allow lower tier if missing when spawned
	- rush a player if safemoded? all remotes?

	Phalanx
		- check for operated towers
		- heal in range rework
	
	defensiveRetreatPath
		- allow normal movement if next path pos is out of range of dangers

	RangedAttacker 
		- pair up / quad up?

	Deconstructor
		find new target if room safemoded
		needs to avoid hostiles, to avoid retreat then path right back into hostiles

	Enemies
		- record creep deaths and ttl in rooms to subtract score, decaying 
		- siege player by placing creeps at all exits
		
	RoomBuilder
		- better initial placement of spawn+labs, rotate around controller and find "best" enclosure?

	healInRange
		- create a scoring and heal based on missing hp, .my isBoosted etc, right now can heal unbosted ally instead of my boosted creep
		
	shard 
		movement / capture room on next shard


	PhalanxHeal
	- rewrite of heal in range, calc for all creeps at once, take into account previous tick incomming damage and nearby creeps?	
	- healInRange make it consider boosted heal and boosted though and already applied heals
	
	- spawn 
		- by parts : mover

	- safemode not triggering from broken walls


	Tigga Build order (not first base, possibly different?)
		RCL 1
		2w1m remote 
		2c2m haulers

		haulers wait with energy if spawn full? 
		1w1c2m upgraders pulling energy from spawn

		RCL 2
		~ around 6 work parts working on building

		Spawn container
		extensions (around 2 fillers that share first container)
		Spawn container2
		controller container
		RCL 3
		roads to remotes
		tower
		ramparts
		extensions (around 2 fillers, now time for 4 stationary fillers?)
		source container (built by miner)
		road to source container
		source container
		road to source container
		(haulers still spawned for offroad)
		roads to remotes continues built, haulers now for road (300 energy creeps (150carry), energy cap 800)
		remote builders will backtrack to get energy in previous room if closer
		RCL 4
		extensions in spawn block
		storage (haulers still also deliver to spawn/controller containers, 300 carry cap) (100k energy setpoint)
		extension around storage block
		extensions on sources
		remote containers (better to build staggered?)
		spawn drains energy first from source extensions, then spawn block
		RCL 5 
		(150k energy setpoint)
		Tower
		Spawn/Storage Link
		RCL 5 
		terminal
		destroyed controller container - replaced with link - filler creep still filling link
		extensions

		// Ba210 tigga gcl 2 in 34300 ticks from E7N7 		
	
*/

/*
const SITE_MAX = 6;
let sites = room.find(FIND_CONSTRUCTION_SITES);
if(!Memory.cache.csites[room.name])
    Memory.cache.csites[room.name] = [];
if(sites.length > SITE_MAX) {
    let cachesites = _.slice(sites,SITE_MAX);
    for(s of cachesites) {
        if(s.progress == 0) {
            let citem = {type: s.structureType, x: s.pos.x, y: s.pos.y};
            Memory.cache.csites[room.name].push(citem);
            s.remove();
        }
    }
}
else if(Memory.cache.csites[room.name].length > 0){
    for(i=0; i < Math.min(Memory.cache.csites[room.name].length, SITE_MAX-sites.length); i++) {
        let citem = Memory.cache.csites[room.name].shift();
        room.createConstructionSite(citem.x, citem.y, citem.type);
    }
}
*/


global.requestMemorySave = true;
global.lastMemSave = 0;
global.requestMemSave = function(){
	global.requestMemorySave = true;
//	log("requesting mem save from " +new Error().stack )
}

function wrapLoop(fn) {

    let memory;
	let tick;
	
	return () => {
		if (tick && tick + 1 === Game.time && memory) {
			// this line is required to disable the default Memory deserialization
			delete global.Memory;
			Memory = memory;
		} else {
			memory = Memory;
		}

		tick = Game.time;

		if (global.stats['cpu.saveMemory'] === undefined) { global.stats['cpu.saveMemory'] = 0; }
		
		fn();	// Main loop

		let init = Game.cpu.getUsed();
		if (!BOT_MODE && global.runCounter > 25 && !global.requestMemorySave && Game.time - global.lastMemSave < 10) {	// Stable global?
			// Skip saving
			let sinceLast = Game.time - global.lastMemSave;
		} else {
			RawMemory.set(JSON.stringify(Memory));
			global.requestMemorySave = false;
			global.lastMemSave = Game.time;
		//	log("saving mem!");
		}
		
		global.stats['cpu.saveMemory'] = Game.cpu.getUsed()-init;

		global.expectedNextTickBucket = Math.floor(limit(Game.cpu.bucket + (Game.cpu.limit - Game.cpu.getUsed() ), 0, 10000));

		
		     
    };
}

require('timsort')
require('perf')();
require('rawVisual');
require('init');
require('gc')();



let roleBootStrapper = require('role.bootStrapper');
let roleUpgrader = require('role.upgrader');
let roleBuilder = require('role.builder');
let roleDefender = require('role.defender');
let roleExtractorAdd = require('role.extractorAdd');
let roleExtractor = require('role.extractor');
let roleHelper = require('role.helper');
let roleMover = require('role.mover');
let roleCrane = require('role.crane');
let roleCraneGCL = require('role.craneGCL');
let roleClaimer = require('role.claimer');
let roleScoutAttacker = require('role.scoutAttacker');
let roleScout = require('role.scout');
let roleHauler = require('role.hauler');
let roleResourceTransport = require('role.resourceTransport');
let roleRangedAttacker = require('role.rangedAttacker');
let roleKeeperKiller = require('role.keeperKiller');
let roleKeeperKillerMineral = require('role.keeperKillerMineral');
let roleInvaderKiller = require('role.invaderKiller');
let roleInvaderKillerSk = require('role.invaderKillerSk');
let roleLabRat = require('role.labRat');
let roleStartupMiner = require('role.startupMiner');
let roleHealer = require('role.healer');
let rolePowerBankRaider = require('role.powerBankRaider');
let rolePowerBankHauler = require('role.powerBankHauler');
let roleMineralMover = require('role.mineralMover');
let roleMineralExtractor = require('role.mineralExtractor');
let roleDeconstructor = require('role.deconstructor');
let roleRangedBoostedAttacker = require('role.rangedBoostedAttacker');
let roleEvacuate  = require('role.evacuate');

require('energyProfiling')();
global.aiBuilder = require('ai.builder');

let aiSpawner = require('ai.spawner');
let aiStructure = require('ai.structure');
let aiCrossRoomHandler = require('ai.crossRoomHandler');
let aiRaidHandler = require('ai.raidHandler');
let aiRoomData = require('ai.roomData');

global.traveler = require('traveler.js');

if (USE_SHARDS) {
	global.interShard = require('ai.interShardHandler');
}

if (SEASONAL_THORIUM) { // Season 5
	require('seasonal.thorium');
}


global.simpleAllies = require('simpleAllies')
// global.TSP = require('travelling-salesman')
    
let grafana = require('grafana');

require('prototype.creeps')();
require('prototype.powerCreep')();
require('prototype.room')();
require('prototype.structure')();
require('prototype.market')();
require('global.functions')();
require('global.creepCache')();
// require('room.wallBuilder');

global.packrat = require('packrat');

// This line monkey patches the global prototypes.
// const profiler = require('screeps-profiler');
// profiler.enable();

// screepsTracer
//let screepsTracer = require('screepsTracer');
// wrapEngine();

const energyProfiling = require('./energyProfiling');

initBlacklist();
createMyTerritory();

console.log("New global started! cpu used: " + Game.cpu.getUsed());


for(let name in Game.creeps) {
	let creep = Game.creeps[name];

//	delete creep._memory.oldTarget;	

	/*
	if (creep._memory.started !== undefined) {
		creep._memory[C.STARTED] = _.cloneDeep(creep._memory.started);
		delete creep._memory.started
	}*/

	
}


for(let name in Game.powerCreeps) {
	let creep = Game.powerCreeps[name];

}



for (let roomName in Memory.rooms) {

	delete Memory.rooms[roomName].avgWallHp	


	delete Memory.rooms[roomName].mixerLab
	delete Memory.rooms[roomName].inputLabs
	delete Memory.rooms[roomName].outputLabs
	delete Memory.rooms[roomName].oldHasLabs
	delete Memory.rooms[roomName].factoryId;
	delete Memory.rooms[roomName].hasCrane;
	
	delete Memory.rooms[roomName].observIdx;
	

	
	if (Memory.rooms[roomName].labsProducing) {
		Memory.rooms[roomName][R.LABS_PRODUCING] = Memory.rooms[roomName].labsProducing
		delete Memory.rooms[roomName].labsProducing;	
	}	
	
}


for (let id in Memory.structures) {

	if (Memory.structures[id].input !== undefined) {
		Memory.structures[id][S.INPUT_LAB] = _.cloneDeep(Memory.structures[id].input);
		delete Memory.structures[id].input
	}

	if (Memory.structures[id].batch !== undefined) {
		Memory.structures[id][S.BATCH_LAB] = _.cloneDeep(Memory.structures[id].batch);
		delete Memory.structures[id].batch
	}
	
	if (Memory.structures[id].boost !== undefined) {
		Memory.structures[id][S.BOOSTER_LAB] = Memory.structures[id][S.INPUT_LAB]
		delete Memory.structures[id].boost
	}

	if (Memory.structures[id].errCycle !== undefined) {
		Memory.structures[id][S.LAB_ERROR_CYCLES] = _.cloneDeep(Memory.structures[id].errCycle);
		delete Memory.structures[id].errCycle
	}
	
	

	
}




module.exports.loop = wrapLoop(function() {
//	profiler.wrap(function() {	// screeps-profiler
	
		let notifyInterval = 60;
		let init = Game.cpu.getUsed();
	//	global.stats = {};
		global.stats['cpu.init'] = init;

		global.lastTick = Game.time - 2;

		if (global.expectedNextTickBucket !== undefined) {
			global.stats['cpu.afterTick'] = Math.max(0, global.expectedNextTickBucket - Game.cpu.bucket);
		//	let test = global.expectedNextTickBucket - Game.cpu.bucket;
		//	console.log("cpu between tick " + test + " expected " + global.expectedNextTickBucket + " actual " + Game.cpu.bucket)
		}

		/*
		if (hasRespawned() ){
			deleteAllMemory(); // RESPAWN
			console.log("respawn!")
		//	Game.cpu.halt();
			return;
		} */
		
		
		// FIRST MEMORY ACCESS		

		global.stats['cpu.loadMemory'] = 0;
		global.stats['cpu.loadMemory'] = Game.cpu.getUsed()-init;

		
			

		// INTER SHARD HANDLER
		if (USE_SHARDS) {
			try {	
				interShard.run();
			} catch (err){
				let msg = 'Error running interShard handler, error: ' +err.name + err.stack;
				Game.notify(msg, notifyInterval)
				log(msg);
			}
		}
		
				
		// RUN CREEPS
		init = Game.cpu.getUsed();	
		delete Memory.cpu;
		delete Memory.heap;
		let heap;
		
		for(let name in Game.creeps) {
			let creep = Game.creeps[name];
			
			addCreepToCache(creep.name, creep._memory[C.ROLE], creep._memory[C.ROOM_ORIGIN]);
			
			if (creep.spawning) { 
				continue; // skip normal execution of creep
			}
		

			try {
				switch(creep._memory[C.ROLE]){
					case 'bootStrapper':	// Emergency 
						roleBootStrapper.run(creep);
						break;
					case 'spawnFillers':
						creep.fillerCrane();	
						break;
					case 'upgrader':
						roleUpgrader.run(creep);
						break;
					case 'builderUpgrader':
						roleBuilder.run(creep, true);
						break;
					case 'builder':
						roleBuilder.run(creep);
						break;
					case 'defender': 
						roleDefender.run(creep);
						break;
					case 'extractorAdd':	
						roleExtractorAdd.run(creep);
						break;	
					case 'extractor':
						roleExtractor.run(creep);		
						creep.notifyWhenAttacked(false);
						break;
					case 'mover':
						roleMover.run(creep);
						break;
					case 'crane':
						roleCrane.run(creep);
						break;						
					case 'craneGCL':
						roleCraneGCL.run(creep);
						break;						
					case 'claimer':
						roleClaimer.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'keeperKillerMineral':
						roleKeeperKillerMineral.run(creep);	
						break;
					case 'coreSniper':
						creep.roleCoreSniper();
						creep.notifyWhenAttacked(false);
						break;
					case 'startupMiner':
						creep.runStartupMiner()
						creep.notifyWhenAttacked(false);
						break;
					case 'scoutAttacker':
						roleScoutAttacker.run(creep);
						break;
					case 'scout':
						roleScout.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'hauler':
						creep.runHauler()
						creep.notifyWhenAttacked(false);
						break;
					case 'helper':
						roleHelper.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'energyTransport':
						roleResourceTransport.run(creep);
						break;	
					case 'looter':						
						creep.doLooter();
						break;	
					case 'rangedAttacker':
						roleRangedAttacker.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'antiScouts':
						roleRangedAttacker.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'keeperKiller':
						roleKeeperKiller.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'labRat':
						roleLabRat.run(creep);
						break;
					case 'healer':
						roleHealer.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'recycle':
						creep.roleSuicideBooth()
						creep.notifyWhenAttacked(false);
						break;
					case 'engine':
						creep.doEngine()
						creep.notifyWhenAttacked(false);
						break;
					case 'powerBankRaider':
						rolePowerBankRaider.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'powerBankHauler':
						rolePowerBankHauler.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'scoreHauler':
						creep.runScoreHauler();
						creep.notifyWhenAttacked(false);
						break;					
					case 'symbolHauler':
						creep.runSymbolHauler();
						creep.notifyWhenAttacked(false);
						break;
					case 'commScorer':
						creep.commScorer();
						creep.notifyWhenAttacked(false);
						break;			
					case 'thoriumHauler':
						creep.runThoriumHauler();
						break;			
					case 'mineralMover':
						roleMineralMover.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'mineralExtractor':
						roleMineralExtractor.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'invaderKiller':
						roleInvaderKiller.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'invaderKillerSK':
						roleInvaderKillerSk.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'deconstructor':
						roleDeconstructor.run(creep);
						creep.notifyWhenAttacked(false);
						break;	
					case 'rangedBoostAttacker':
						roleRangedBoostedAttacker.run(creep);
						creep.notifyWhenAttacked(false);
						break;
					case 'roleEvacuate':
						addCreepToCache(creep.name, creep._memory.evacuate.prevRole, creep._memory[C.ROOM_ORIGIN]);
						roleEvacuate.run(creep);
						break;
				//	default


					
				}
				
    		} catch (err){
				let msg = 'Error running creep '+ creep + " in room " + creep.room.name + " error: " +err.name+ " role " + creep._memory[C.ROLE] + err.stack;
				Game.notify(msg, notifyInterval)
				console.log(msg);
				if (err.name === "RangeError"){
					Game.cpu.halt();
				}
			}
			
		//	createCpuStatCreep(creep._memory[C.ROLE], Game.cpu.getUsed()-initPerCreep);
		//	if (DEBUG) { displayCreepStat(creep, Game.cpu.getUsed()-initPerCreep); }
		}
		global.stats['cpu.creeps'] = Game.cpu.getUsed()-init;

		
		
			
		// Run PowerCreeps		
		init = Game.cpu.getUsed();	
		
		for(let name in Game.powerCreeps) {			
			let powerCreep = Game.powerCreeps[name];	

			
			try {
				if (!powerCreep.spawnCooldownTime && !powerCreep.ticksToLive) {
					if (powerCreep.memory.spawned) { powerCreep.memory = {}; }
					if (!powerCreep.memory[C.ROLE]) { powerCreep.setCreepRole() }
					if (powerCreep.spawnCooldownTime) { continue; }
					if (powerCreep.memory[C.ROOM_TARGET] && Game.rooms[powerCreep.memory[C.ROOM_TARGET]]) {
						let localPowerSpawn = Game.rooms[powerCreep.memory[C.ROOM_TARGET]].findByType(STRUCTURE_POWER_SPAWN)
						if (localPowerSpawn.length < 1) { continue; }
						let res = powerCreep.spawn(localPowerSpawn[0]);
						powerCreep.memory.spawned = Game.time;
						console.log("spawning " + name + " level " + powerCreep.level +" result " + res)
					}
					continue;
				}
			} catch (err){console.log('Error spawning powerCreep '+ name + " error: " +err.name +  err.stack);}
						
			let initPerCreep = Game.cpu.getUsed();
			if (!powerCreep.ticksToLive || !powerCreep.room) { continue; }

			try {
				// Calling power creep role
				powerCreep[powerCreep.memory[C.ROLE]]();
								
				// Register needed heals
				addPCToHealCache(powerCreep);
				
			} catch (err){

				let room 
				if (powerCreep.room && powerCreep.room.name) {
					room = powerCreep.room.name
				}
				let msg = 'Error running powerCreep '+ name + " in room " +room+ " error: " +err.name+  err.stack;
				Game.notify(msg, notifyInterval)
				console.log(msg);
			}
			
			createCpuStatCreep(powerCreep.memory[C.ROLE], Game.cpu.getUsed()-initPerCreep);
			if (DEBUG) { displayCreepStat(powerCreep, Game.cpu.getUsed()-initPerCreep); }
		}
		global.stats['cpu.powerCreeps'] = Game.cpu.getUsed()-init;
		
		

		global.stats['cpu.aiRaidHandler.overhead'] = 0;
		global.stats['cpu.aiRaidHandler.raidStateInit'] = 0;
		global.stats['cpu.aiRaidHandler.raidStateSpawning'] = 0;
		global.stats['cpu.aiRaidHandler.raidStateRefreshTTL'] = 0;
		global.stats['cpu.aiRaidHandler.raidStateBoost'] = 0;
		global.stats['cpu.aiRaidHandler.raidStateRally'] = 0;
		global.stats['cpu.aiRaidHandler.raidStateTravel'] = 0;
		global.stats['cpu.aiRaidHandler.raidPerformTypeClassic'] = 0;				
		global.stats['cpu.aiRaidHandler.raidPerformTypePhalanx'] = 0;
			global.stats['cpu.aiRaidHandler.raidCheckRetreat'] = 0;
			global.stats['cpu.aiRaidHandler.raidRetreat'] = 0;
			global.stats['cpu.aiRaidHandler.raidNotRetreat'] = 0;
			global.stats['cpu.aiRaidHandler.raidphalanxMove'] = 0;
			global.stats['cpu.aiRaidHandler.raidActions'] = 0;
			global.stats['cpu.aiRaidHandler.getPhalanxMatrix'] = 0;
			global.stats['cpu.aiRaidHandler.raidphalanxMatrix'] = 0;
			


		
		// RUN RAID HANDLER
		try {
			init = Game.cpu.getUsed();	
			aiRaidHandler.run();
			global.stats['cpu.aiRaidHandler'] = Game.cpu.getUsed()-init;
		} catch (err){
			let msg = 'Error running aiRaidHandler error: ' +err.name + err.stack;
			Game.notify(msg, notifyInterval)
			console.log(msg);
		}
		
		/* for OS
		maxCPU = Game.cpu.limit
		maxCPU *= (((Game.cpu.bucket - 1000) * (1.1 - 0.4)) / 9000) + 0.4
		*/		
		
		// RUN ROOMS	
		global.stats['cpu.aiBuilder'] = 0;
		global.stats['cpu.aiSpawner'] = 0;
			global.stats['cpu.aiSpawner.spawnExtractors'] = 0;
			global.stats['cpu.aiSpawner.spawnMovers'] = 0;
			global.stats['cpu.aiSpawner.spawnCrane'] = 0;
			global.stats['cpu.aiSpawner.spawnLabRats'] = 0;
			global.stats['cpu.aiSpawner.defendMyRoomsAgainstPlayer'] = 0;
			global.stats['cpu.aiSpawner.spawnUpgraders'] = 0;
			global.stats['cpu.aiSpawner.spawnHelpers'] = 0;
			global.stats['cpu.aiSpawner.spawnEnergyCarts'] = 0;
			global.stats['cpu.aiSpawner.spawnRaids'] = 0;
			global.stats['cpu.aiSpawner.spawnAttackers'] = 0;
			global.stats['cpu.aiSpawner.spawnCombatAttackers'] = 0;
			global.stats['cpu.aiSpawner.spawnCombatDeconsturctor'] = 0;
			global.stats['cpu.aiSpawner.defendRemotes'] = 0;
			global.stats['cpu.aiSpawner.spawnClaimers'] = 0;
			global.stats['cpu.aiSpawner.spawnBuilders'] = 0;
			global.stats['cpu.aiSpawner.spawnPowerBankRaiders'] = 0;
			global.stats['cpu.aiSpawner.spawnScouts'] = 0;
			global.stats['cpu.aiSpawner.spawnMineralExtractors'] = 0;
			global.stats['cpu.aiSpawner.spawnSkMineralMiners'] = 0;
			global.stats['cpu.aiSpawner.spawnRemoteSources'] = 0;

		global.stats['cpu.aiStructure'] = 0;
			global.stats['cpu.aiStructure.observers'] = 0;
			global.stats['cpu.aiStructure.towers'] = 0;
			global.stats['cpu.aiStructure.terminals'] = 0;
			global.stats['cpu.aiStructure.labs'] = 0;
			global.stats['cpu.aiStructure.links'] = 0;
			global.stats['cpu.aiStructure.powerSpawn'] = 0;
			global.stats['cpu.aiStructure.factory'] = 0;
			global.stats['cpu.aiStructure.grafanaStats'] = 0;
			

		global.stats['cpu.aiRoomData'] = 0;
			global.stats['cpu.aiRoomData.trackEnergyHarvestedAndInvaders'] = 0;
			global.stats['cpu.aiRoomData.hostiles'] = 0;
			global.stats['cpu.aiRoomData.controller'] = 0;
			
			global.stats['cpu.aiRoomData.highway'] = 0;
			global.stats['cpu.aiRoomData.notHighway'] = 0;
			global.stats['cpu.aiRoomData.structures'] = 0;
			global.stats['cpu.aiRoomData.avoidSKcreeps'] = 0;
		
		global.stats.labsTotal = 0;	
		global.stats.labsProducing = {};

		let currentBuilderRoom = getCurrentCallAndRequestSegment();
		let roomOrder = Game.time;
        for(let i in Game.rooms) {  
			let roomName = Game.rooms[i].name;	
			try {
				init = Game.cpu.getUsed();
				aiRoomData.run(roomName);
				global.stats['cpu.aiRoomData'] += Game.cpu.getUsed()-init;
			} catch (err){
				let msg = 'Error running aiRoomData '+ roomName +" error: " +err.name + err.stack;
				Game.notify(msg, notifyInterval)
				console.log(msg);
			}

/*
			if (Memory.rooms[roomName].roleRequestedMovers !== undefined) {
				Memory.rooms[roomName][R.REQUESTED_MOVERS] = Memory.rooms[roomName].roleRequestedMovers
				delete Memory.rooms[roomName].roleRequestedMovers
			}

			if (Memory.rooms[roomName].spawnCountTimer !== undefined) {
				Memory.rooms[roomName][R.SPAWN_COUNT_TIMER] = Memory.rooms[roomName].spawnCountTimer
				delete Memory.rooms[roomName].spawnCountTimer
			}

			if (Memory.rooms[roomName].roadIdx !== undefined) {
				Memory.rooms[roomName][R.ROAD_IDX] = Memory.rooms[roomName].roadIdx
				delete Memory.rooms[roomName].roadIdx
			}

			if (Memory.rooms[roomName].roadRoomIdx !== undefined) {
				Memory.rooms[roomName][R.ROAD_ROOM_IDX] = Memory.rooms[roomName].roadRoomIdx
				delete Memory.rooms[roomName].roadRoomIdx
			}

			if (Memory.rooms[roomName].controllerContPos !== undefined) {
				Memory.rooms[roomName][R.CONTROLLER_CONT_POS] = Memory.rooms[roomName].controllerContPos
				delete Memory.rooms[roomName].controllerContPos
			}

			if (Memory.rooms[roomName].roadsOldPrcl !== undefined) {
				Memory.rooms[roomName][R.ROADS_OLD_PRCL] = Memory.rooms[roomName].roadsOldPrcl
				delete Memory.rooms[roomName].roadsOldPrcl
			}
*/

			if (Memory.rooms[roomName] && Memory.rooms[roomName].myRoom == 1 ) {

				createCallOrderList(i);
				try {	// aiBuilder
					init = Game.cpu.getUsed();
					if (i === currentBuilderRoom) { aiBuilder.run(roomName, roomName); }						
					global.stats['cpu.aiBuilder'] += Game.cpu.getUsed()-init;
				} catch (err){
					let msg = 'Error running aiBuilder '+ roomName +" error: " +err.name + err.stack;
					Game.notify(msg, notifyInterval)
					console.log(msg);
				}
				try {	// aiSpawner
					init = Game.cpu.getUsed();	
					let newSpawn = aiSpawner.run(roomName);
					if (newSpawn > 0) { registerBusySpawn(roomName) }
					global.stats['cpu.aiSpawner'] += Game.cpu.getUsed()-init;
				} catch (err){
					let msg = 'Error running aiSpawner '+ roomName +" error: " +err.name + err.stack;
					Game.notify(msg, notifyInterval)
					console.log(msg);
				}
				try {	// aiStructure
					init = Game.cpu.getUsed();						
					aiStructure.run(roomName, roomOrder);
					roomOrder++
					global.stats['cpu.aiStructure'] += Game.cpu.getUsed()-init;
				} catch (err){
					let msg = 'Error running aiStructure '+ roomName +" error: " +err.name + err.stack;
					Game.notify(msg, notifyInterval)
					console.log(msg);
				}
			}
		}

		
		// RUN CROSSROOM HANDLER
		try {
			init = Game.cpu.getUsed();	
			aiCrossRoomHandler.run();
			global.stats['cpu.aiCrossRoomHandler'] = Game.cpu.getUsed()-init;
		} catch (err){
			let msg = 'Error running aiCrossRoomHandler error: ' +err.name + err.stack;
			Game.notify(msg, notifyInterval)
			console.log(msg);
		}
	
		
		if (SEASONAL_THORIUM) {
			
			
			
			/*
			if (!Memory.rooms["E4S4"]) { Memory.rooms["E4S4"] = {}; }
			Memory.rooms["E4S4"].avoid = Game.time + 100;
			*/
		
			/*
			if (Game.rooms["E4S7"]) {
				Game.rooms["E4S7"].setBoostMode(true, {
					XZHO2: 1500, //move
					XUH2O: 1500, //attack
				//	XLH2O: 900, // build
				//	XKH2O: 300, //carry
					XGHO2: 1500, //tough

				//	XKHO2: 3000, //ranged
				//	XZH2O: 3000, //dismantle
					XLHO2: 1500 //heal
					
				});	
			}*/
			
			/*
			if (Game.rooms["E8S5"]) {
				Game.rooms["E8S5"].setBoostMode(true, {
					XZHO2: 1500, //move
					XUH2O: 1500, //attack
				//	XLH2O: 900, // build
				//	XKH2O: 300, //carry
					XGHO2: 1500, //tough

				//	XKHO2: 3000, //ranged
				//	XZH2O: 3000, //dismantle
					XLHO2: 1500 //heal
					
				});	
			}*/

   		}
				
		// CLEAN 

		if (Game.time % 101 === 1) {
			Memory.withdraw = {};
			Memory.deliver = {};
		}

		if (Game.time % 237 == 0){
			for (let id in Game.constructionSites) {
				let site = Game.getObjectById(id);
				
				let siteRoom = site.pos.roomName;

				if (!Memory.rooms[siteRoom] || 
					(Memory.rooms[siteRoom].myRoom === undefined && Memory.rooms[siteRoom][R.MY_MINING_OUTPOST] === undefined && Memory.rooms[siteRoom].buildRoads === undefined && !Game.rooms[siteRoom])) {
					site.remove();
					console.log("deleting construction site " + site.pos);
				}
			}
			
			if (BOT_MODE || true) {				

				if (!global.nextMemClean || Game.time > global.nextMemClean) {

					let usedMem = RawMemory.get().length / (2*1024*1024);
					log("used memory: " + usedMem.toFixed(2))
					let allowedTime = 2500 - (2500 * usedMem);
					let timeout = Game.time - allowedTime;
					global.nextMemClean = Game.time + allowedTime;

					if (usedMem > 0.5) {
						for (let room in Memory.rooms){

							
							if (!Memory.rooms[room].myRoom && 								
								!Memory.rooms[room][R.MY_MINING_OUTPOST] && 
								!Memory.rooms[room].buildRoads &&
								!Memory.rooms[room].powerBank &&
								!Memory.rooms[room].invaderCore &&
								!Memory.rooms[room].reactor &&
								!Game.rooms[room] && 
								!Memory.miningTarget[room] && 
								(!BOT_MODE || !Memory.rooms[room].hostileRoom) &&
								(!BOT_MODE || !Memory.rooms[room].enemyRemote) &&
								!Memory.controllerAttack[room] &&
								!Memory.lootMission[room] && 
								Memory.curActivePlanner !== room && 
								!blackList[Memory.rooms[room].player]
								
							){
								if (Memory.rooms[room].player === 'liaohuo') { continue; }
								delete Memory.rooms[room];
								continue;
							}
	
							/*
							if (Memory.rooms[room].targetCache && (!Memory.rooms[room].targetCache._deleteTs || Game.time > Memory.rooms[room].targetCache._deleteTs)) {
								delete Memory.rooms[room].targetCache;
							}*/
	
							if (!Memory.rooms[room].hostileRoom) {
								delete Memory.rooms[room].uniqWallTargets;
								delete Memory.rooms[room].hunterId;
								delete Memory.rooms[room].huntAny;								
							}

							if (Memory.rooms[room].invaderCore && Game.time > Memory.rooms[room].invaderCore.ts) {
								delete Memory.rooms[room].invaderCore;
							}
	
							if (Memory.rooms[room].breachHpTs && Game.time > Memory.rooms[room].breachHpTs) {
								delete Memory.rooms[room].breachHpPhalanx;
								delete Memory.rooms[room].breachWallHp;
								delete Memory.rooms[room].breachRampartHp;
								delete Memory.rooms[room].breachRampartToWallRatio;
								delete Memory.rooms[room].breachRampartToWallRatioPhalanx;
								delete Memory.rooms[room].breachWallHpPhalanx;
								delete Memory.rooms[room].breachRampartHpPhalanx;							
								delete Memory.rooms[room].breachHp;
								delete Memory.rooms[room].breachHpTs;
							}

							if (!Memory.rooms[room][R.MY_MINING_OUTPOST]) {
								Memory.rooms[room][R.ENERGY_HARVESTED] = undefined
								Memory.rooms[room][R.INVADER_PROBABLE] = undefined
								Memory.rooms[room][R.INVADER_LAST_SEEN] = undefined		
							}

							if (Memory.rooms[room].buildRoads && Game.time > Memory.rooms[room].buildRoads){
								delete Memory.rooms[room].buildRoads;
							}
	
							if (Memory.rooms[room]._breachPosTs && Game.time > Memory.rooms[room]._breachPosTs) {
								delete Memory.rooms[room]._breachPosTs;
								delete Memory.rooms[room]._breachPos;
							}

							if (Object.keys(Memory.rooms[room]).length <= 0) {
								delete Memory.rooms[room]
							}


						}
	
					}
					
					for (let id in Memory.structures) {		

						if (!Memory.structures[id]) { 
							Memory.structures[id] = undefined;
							continue;
						}

						
						if (Object.keys(Memory.structures[id]).length <= 0 ) {
							delete Memory.structures[id];
						}
					}
				}
				
			} else {
				for (let room in Memory.rooms){
					if (!Memory.rooms[room].myRoom && 
						!Memory.rooms[room][R.MY_MINING_OUTPOST] && 
						!Memory.rooms[room].buildRoads && 
						!Memory.rooms[room].powerBank &&
						!Memory.rooms[room].invaderCore &&
						!Game.rooms[room] &&
						!Memory.miningTarget[room] && 
						!Memory.controllerAttack[room] &&
						!Memory.lootMission[room] &&
						!blackList[Memory.rooms[room].player]
					){
						delete Memory.rooms[room];
					}
					if (Memory.rooms[room] && Memory.rooms[room].evacuated && Memory.rooms[room].evacuated < Game.time - 1500) {
						delete Memory.rooms[room].evacuated;
					}
					
				}

				let structureKeys = Object.keys(Memory.structures)
				let idx = structureKeys.length
				while (idx--) {
					let id = structureKeys[idx];
					if (!Memory.structures[id]) { continue; }
					if (Object.keys(Memory.structures[id]).length === 0 ) {
						delete Memory.structures[id]
					}
				}
			}
		}
		
		
		// Clean memory from old creeps
		init = Game.cpu.getUsed();
		if (Game.time % 51 === 1){
			for(let creepName in Memory.creeps) {
				try {
					if(!Game.creeps[creepName]) {

						const creepMemory = _.cloneDeep(Memory.creeps[creepName]);	

						
						delete Memory.creeps[creepName];  
						delete creepsCache[creepName];
						delete global.creepsCacheMem[creepName]


						if (BOT_MODE) {	
							// ABORT IF CREEPS DIE TO SOON
							if (creepMemory[C.ROLE] === 'rangedAttacker' || creepMemory[C.ROLE] === 'invaderKiller') {
								if (creepMemory.pita) { continue; }
								let targetRoom = creepMemory[C.ROOM_TARGET];
								if (!Memory.evalAttackTarget[targetRoom]) {
									Memory.evalAttackTarget[targetRoom] = {};
									Memory.evalAttackTarget[targetRoom].totalAttackTicks = 0;
									Memory.evalAttackTarget[targetRoom].avgAttackTicks = 0;									
									Memory.evalAttackTarget[targetRoom].samples = 0;
								}
								let ticksInCombat = creepMemory.fightTicks || 0;
								Memory.evalAttackTarget[targetRoom].samples++;
								Memory.evalAttackTarget[targetRoom].totalAttackTicks += ticksInCombat;
								Memory.evalAttackTarget[targetRoom].avgAttackTicks = Memory.evalAttackTarget[targetRoom].totalAttackTicks/Memory.evalAttackTarget[targetRoom].samples;
								if (Memory.evalAttackTarget[targetRoom].samples > 5) {
									if (Memory.evalAttackTarget[targetRoom].avgAttackTicks < 200
									//	Memory.myRoomHighPRCL < 7 
										){
										Memory.evalAttackTarget[targetRoom].avoid = Game.time + 7500; // swc 15000
									}
									Memory.evalAttackTarget[targetRoom].totalAttackTicks = 0;
									Memory.evalAttackTarget[targetRoom].avgAttackTicks = 0;
									Memory.evalAttackTarget[targetRoom].samples = 0;
								}
							}
						}

						if (SEASONAL_SCORE) {
							if (creepMemory[C.ROLE] === 'scoreHauler') {
								if (!creepMemory.scorer || 
									!creepMemory.isScoring ||
									creepMemory.lastRoom !== creepMemory.scorer 
								) { continue; } 

								if (creepMemory.hasScored) { continue; }

								if (!Memory.scoreCollector[creepMemory.scorer]) { continue; }

								if (!Memory.scoreCollector[creepMemory.scorer].lastDeath) { 
									Memory.scoreCollector[creepMemory.scorer].lastDeath = Game.time;
								} else {
									if (Game.time - Memory.scoreCollector[creepMemory.scorer].lastDeath > CREEP_LIFE_TIME) {
										Memory.scoreCollector[creepMemory.scorer].avoid = Game.time + 1500;
									} else {
										delete Memory.scoreCollector[creepMemory.scorer].lastDeath;

									}
								}
							}
						} 

						if (SEASONAL_SYMBOLS) {
							if (creepMemory[C.ROLE] === 'symbolHauler') {
								if (!creepMemory.scorer || 
									!creepMemory.isScoring ||
									creepMemory.lastRoom !== creepMemory.scorer 
								) { continue; } 

								if (creepMemory.hasScored) { continue; }

								if (!Memory.scoreCollector[creepMemory.scorer]) { continue; }

								if (!Memory.scoreCollector[creepMemory.scorer].lastDeath) { 
									Memory.scoreCollector[creepMemory.scorer].lastDeath = Game.time;
								} else {
									if (Game.time - Memory.scoreCollector[creepMemory.scorer].lastDeath > CREEP_LIFE_TIME) {
										Memory.scoreCollector[creepMemory.scorer].avoid = Game.time + 7500;
									} else {
										delete Memory.scoreCollector[creepMemory.scorer].lastDeath;

									}
								}
							}
						}


						// CHECK IF SK MINERAL MINING IS FAILING 
						if (creepMemory[C.ROLE] === 'keeperKillerMineral' || 
							creepMemory[C.ROLE] === 'mineralMover' ||
							creepMemory[C.ROLE] === 'mineralExtractor') {

							let destRoom = creepMemory[C.ROOM_TARGET];
							if (!destRoom) { continue; }
							if (!roomIsSk(destRoom) && !roomIsCenter(destRoom) ) { continue; }
							let sourceId = creepMemory[C.SOURCE_ID];

							if (!Memory.evalSkMining[sourceId]) {
								Memory.evalSkMining[sourceId] = {};
								Memory.evalSkMining[sourceId].spawnedCreeps = 0;
								Memory.evalSkMining[sourceId].mineralsGathered = 0;
							}
							Memory.evalSkMining[sourceId].spawnedCreeps++;
						//	log("red", sourceId + " creep, gathered " + creepMemory.gathered);
							if (creepMemory.gathered){
								Memory.evalSkMining[sourceId].mineralsGathered += creepMemory.gathered;
							}
							if (Memory.evalSkMining[sourceId].spawnedCreeps > 8){
								if (Memory.evalSkMining[sourceId].mineralsGathered < 2500) {
									Memory.evalSkMining[sourceId].avoid = Game.time + 50000;
								} else {
									Memory.evalSkMining[sourceId].spawnedCreeps = 0;
									Memory.evalSkMining[sourceId].mineralsGathered = 0;
								}
							}
						}

						// CHECK IF POWER BANK RAIDERS ARE KILLED
						if (creepMemory[C.ROLE] === 'powerBankRaider') {
							if (creepMemory.ttl < 10 || creepMemory.suicide) { continue; }	
							let destRoomTarget = creepMemory[C.ROOM_TARGET];
							if (Memory.powerBanks[destRoomTarget]) {
								console.log("AVOIDING POWERBANK ROOM " + destRoomTarget);

								if (Memory.rooms[destRoomTarget] &&
									Memory.rooms[destRoomTarget].powerBank ) {  
										Memory.powerBanks[destRoomTarget].avoid = Memory.rooms[destRoomTarget].powerBank.timeOut;
								} else {
									Memory.powerBanks[destRoomTarget].avoid = Game.time + 4000;
								}
							}
						}

					}
				} catch (err){
					console.log('Error deleting memory creep ' +err.name + err.stack);
				//	Game.notify(err, notifyInterval)
				}
			}

			for(let sturctureId in Memory.structures) {
				let structure = Game.getObjectById(sturctureId);
				if (!structure) {
					delete Memory.structures[sturctureId];
					continue;
				}

				if (Object.keys(Memory.structures[sturctureId]).length <= 0) {
					delete Memory.structures[sturctureId];
				}
			}

			for (let id in global.hostileTracker) {
				if (Game.time > global.hostileTracker[id]) {
					delete global.hostileTracker[id]
				}
			}
		}

		if (Game.time % 1499 === 3){
			for (let creepId in Memory.enemyCreepsAttacked){
				/*
				if (!Game.getObjectById(creepId)) {
					delete Memory.enemyCreepsAttacked[creepId];
				}	*/				
				let timeExpired = Memory.enemyCreepsAttacked[creepId].ts || 0;

				if (Game.time > timeExpired) {
					delete Memory.enemyCreepsAttacked[creepId];
				}
			}
		}

		global.stats['cpu.deletingCreeps'] = Game.cpu.getUsed()-init;	
	

		// REQUEST INNER WALL SEGMENT
		requestMemorySegment(SEGMENT_ALL_ROOM_OOB);
		setSemgentAsCritical(SEGMENT_ALL_ROOM_OOB);

		if (Memory.curActivePlanner) {
			requestMemorySegment("BaseEval");
		}

		// STORE INTERSHARD MEMORY
		if (USE_SHARDS) {
			saveLocalInterShardMemory();
		}
		
        

		
		
		// HEAP
		init = Game.cpu.getUsed();
		if(Game.cpu.getHeapStatistics){				
			heap = Game.cpu.getHeapStatistics();
			
			// GC
			let heapPercent = ((heap.total_heap_size + heap.externally_allocated_size) / heap.heap_size_limit);
			init = Game.cpu.getUsed();	
			if (global.runCounter === undefined) {
				global.runCounter = 0;
			//	global.garbageCounter = 0;
			} else {
				global.runCounter++;
			//	global.garbageCounter++;
			}

			if (heapPercent > 0.95 && global.runCounter > 2500 && (!global.gcCompleteDone || global.runCounter > global.gcCompleteDone)) {
				myGc();
				global.gcCompleteDone = global.runCounter + 1499;

			} else if (heapPercent > 0.90 || global.runCounter % 10000 === 0) {			
			//	global.garbageCounter = 0;
				if (global.runCounter > 501 && (!global.gcDone || global.runCounter > global.gcDone)) {
					global.gcDone = global.runCounter + 501;
					cleanGlobal();
					console.log("cleaning global, heap at " + heapPercent.toFixed(2));
				}
			}

			
			if (!BOT_MODE && globalFlatLine(heapPercent) && global.runCounter > 500) {
				Game.cpu.halt();
			}

			if (global.runCounter > 179 && (!global.cleanPaths || global.runCounter > global.cleanPaths)) {
				
				let delay = 349;
				if (!isCpuLimited() ) {
					delay = 39;
				}				

				global.cleanPaths = global.runCounter + delay;
				cleanGlobalPaths();
			}

			global.stats['cpu.gc'] = Game.cpu.getUsed()-init;

		//	console.log("heap usage " + heapPercent.toFixed(2) + "%, global counter " + global.runCounter)
			/*
			let totalPhys = Math.round(heap.total_physical_size/1048576);
			let totalAvail = Math.round(heap.total_available_size/1048576);
			let used = Math.round(heap.total_heap_size/1048576);
			console.log("heap " +used.toFixed(1) + "/" + totalAvail.toFixed(1))
			*/

			global.stats['heap.total_heap_size'] = heap.total_heap_size;
			global.stats['heap.total_heap_size_executable'] = heap.total_heap_size_executable;
			global.stats['heap.total_physical_size'] = heap.total_physical_size;
			global.stats['heap.total_available_size'] = heap.total_available_size;
			global.stats['heap.used_heap_size'] = heap.used_heap_size;
			global.stats['heap.heap_size_limit'] = heap.heap_size_limit;
			global.stats['heap.runCounter'] = global.runCounter;
			global.stats['heap.heapPercent'] = heapPercent.toFixed(2);
			global.stats['heap.totalSize'] = heap.total_heap_size + heap.externally_allocated_size;
			global.stats['heap.externally_allocated_size'] = heap.externally_allocated_size;	
		}
		global.stats['cpu.heapCleaning'] = Game.cpu.getUsed()-init;


		grafana.run();
		delete Memory.cpu;

		try {
			lib_segments.process();
		} catch (err){
			console.log('lib_segments.process ' +err.name + err.stack);				
		}		

		cleanAtEndOfTick();

		/*
		global.reportJson = 1;		
		diagnoseGlobal();
		delete global.reportJson;
		*/
	
	//	diagnoseMemory();
				
	//	global.Tracing.postTick();	// screepsTracer
//	}); // end profiler wrap
});


global.diagnoseGlobal = function() {
   
	if (Memory.globalKeyToCheck === undefined) { Memory.globalKeyToCheck = 1; }
	let check = global;
	//let check = Memory;
	let checkedKeys = 0;
	let init = Game.cpu.getUsed();
	let maxKeys = Object.keys(check).length;	
	if (Memory.globalKeyToCheck >= maxKeys) { Memory.globalKeyToCheck = 1; }

	let mostCpu = 0;
	let biggestKeyLength = 0;
	let mostCpuKey;
	let biggestKey;
	let rapport = [];
    for (let property in check) {
	//	if (currentIdx != Memory.globalKeyToCheck ) { continue; }
	//	Memory.globalKeyToCheck++;

		if (property === "Game") { continue; }	// Here be monsters!
		if (property === "global") { continue; }
		if (property === "gc") { continue; }
		if (property === "RawMemory") { continue; }
		if (property === "PathFinder") { continue; }
		if (property === "Constants") { continue; }
		if (property === "Memory") { continue; }

		// ignore known custom big keys
	//	if (property === "roomsFindCache") { continue; }	
	//	if (property === "observe_rooms") { continue; }
	//	if (property === "__segbuffer") { continue; }
		 
		let keyUsedCpu =  Game.cpu.getUsed();
		
		checkedKeys++;
		global.keyToCheck = property;
		let stringified;
		
		try {	// try not needed anymore?
			stringified = JSON.stringify(check[property]);	// call stringify on it to trigger the check for types
		} catch (err){console.log(Memory.globalKeyToCheck +' Error running stringify on '+ property +" error: " +err.name + err.stack);}
			

		keyUsedCpu = Game.cpu.getUsed()-keyUsedCpu;
		if (keyUsedCpu > mostCpu) {
			mostCpu = keyUsedCpu;
			mostCpuKey = property;
		}
		let usedSize = _.size(stringified);
		if (usedSize > biggestKeyLength) {
			biggestKeyLength = usedSize;
			biggestKey = property;
		}

		if (usedSize <= 500) { continue; }

		let data = {
			key: property,
			size: usedSize,
			cpu: keyUsedCpu.toFixed(1),
		} 

		rapport.push(data);


	}

	rapport.sort(function(a, b) {
		return (b.size - a.size);});


	let used = Game.cpu.getUsed()-init;
	let keySizeKb = biggestKeyLength/1024;
	console.log("diagnoseGlobal checked "+ checkedKeys + "/" +maxKeys+ ", used total cpu  " + used.toFixed(1) + " most cpu on key " + mostCpuKey + " - " + mostCpu.toFixed(1)+ " biggest key " + biggestKey+ " with size " +keySizeKb.toFixed(1) + " kb");

	log(JSON.stringify(rapport));


};

/*
RoomVisual.prototype._toJSON = RoomVisual.prototype.toJSON;
RoomVisual.prototype.toJSON = function(arg){
	if (global.reportJson) {
		try {
			undefined.undefind = 13;
		} catch (err){
			log("calling toJSON on RoomVisual while stringify on key " +global.keyToCheck + " argument " + JSON.stringify(arg) + " error " +err.name + err.stack);				
		}
	}
	return this._toJSON(arg);
}

PathFinder.CostMatrix.prototype.toJSON = function(arg){
	if (global.reportJson) {			
		try {
			undefined.undefind = 13;
		} catch (err){
			let errorString = "calling toJSON! on CostMatrix " +global.keyToCheck +  " argument " + JSON.stringify(arg) + " error " +err.name + err.stack;
			log(errorString);
			Game.notify(errorString);	
					
		}
	}
};

Room.prototype.toJSON = function(arg){
	if (global.reportJson) {			
		try {
			undefined.undefind = 13;
		} catch (err){
			let errorString = "calling toJSON on Room! " + this.name  + " while stringify on key " +global.keyToCheck+ " argument " + JSON.stringify(arg) + " error " +err.name + err.stack
			log(errorString);
			Game.notify(errorString);							
		}
	}
	
};

ConstructionSite.prototype.toJSON = function(arg){
	if (global.reportJson) {			
		try {
			undefined.undefind = 13;
		} catch (err){
			let errorString = "calling toJSON! ConstructionSite " + this.structureType + this.id  + " while stringify on key " +global.keyToCheck+" argument " + JSON.stringify(arg) + " error " +err.name + err.stack;
			log(errorString);
			Game.notify(errorString);				
		}
	}		
};

OwnedStructure.prototype.toJSON = function(arg){
	if (global.reportJson) {			
		try {
			undefined.undefind = 13;
		} catch (err){
			let errorString = "calling toJSON! OwnedStructure " + this.structureType + this.id  + " while stringify on key " +global.keyToCheck+" argument " + JSON.stringify(arg) + " error " +err.name + err.stack;
			log(errorString);
			Game.notify(errorString);						
		}
	}
};

Creep.prototype.toJSON = function(arg){
	if (global.reportJson) {			
		try {
			undefined.undefind = 13;
		} catch (err){
			let errorString = "calling toJSON! Creep " + this.name + " while stringify on key " +global.keyToCheck + " argument " + JSON.stringify(arg) + " error " +err.name + err.stack;
			log(errorString);
			Game.notify(errorString);
		}
	}				
};

PowerCreep.prototype.toJSON = function(arg){
	if (global.reportJson) {			
		try {
			undefined.undefind = 13;
		} catch (err){
			let errorString = "calling toJSON! PowerCreep " + this.name + " while stringify on key " +global.keyToCheck + " argument " + JSON.stringify(arg) + " error " +err.name + err.stack;
			log(errorString);
			Game.notify(errorString);
		}
	}				
};

RoomPosition.prototype.toJSON = function(arg){
	if (global.reportJson) {			
		try {
			undefined.undefind = 13;
		} catch (err){
			let errorString = "calling toJSON! RoomPosition " + this.roomName + " " + this.x+ ":" +this.y + " while stringify on key " +global.keyToCheck + " argument " + JSON.stringify(arg) + " error " +err.name + err.stack;
			log(errorString);
			Game.notify(errorString);
		}
	}
};
*/
/*
function recursiveIteration(object) {
	if (Game.cpu.getUsed() > 400 ) { return; }
    let objectCount = 0;
    for (let property in object) {
		console.log(property)
        if (object.hasOwnProperty(property)) {
            if (typeof object[property] == "object") {
                objectCount++;
                if (Array.isArray(object[property])) {
                    objectCount += object[property].length;
                } else {
                    objectCount += recursiveIteration(object[property]);
                }
            } else if (object[property].isRoomPosition) {
				console.log("RoomPosition on global! " + property)
			}
        }
    }
    return objectCount;
}
*/
/*
global.diagnoseMemory = function() {
    let stringified = JSON.stringify(Memory);
    let startCpu = Game.cpu.getUsed();
    JSON.parse(stringified);
    let endCpu = Game.cpu.getUsed();
    console.log('============================================================');
    console.log('CPU spent on Memory parsing: ' + (endCpu - startCpu));
    let toLog = {};
    let cpuSpend = {};
    let length = 20;
    for (let property in Memory) {
        let amount = recursiveIteration(Memory[property]);
        if (amount == 0)
            continue;
        if (property.length > length) {
            length = property.length;
        }
        stringified = JSON.stringify(Memory[property]);
        startCpu = Game.cpu.getUsed();
        JSON.parse(stringified);
        endCpu = Game.cpu.getUsed();
        toLog[property] = amount;
        cpuSpend[property] = (endCpu - startCpu);
    }
    for (let prop in toLog) {
        console.log('Amount of objects stored in Memory.' + prop.padRight(length, ' ') + '  : ' + toLog[prop] + '     -   ' + cpuSpend[prop].toFixed(2));
    }
    log('============================================================');

}

function recursiveIteration(object) {
    let objectCount = 0;
    for (let property in object) {
        if (object.hasOwnProperty(property)) {
            if (typeof object[property] == "object") {
                objectCount++;
                if (Array.isArray(object[property])) {
                    objectCount += object[property].length;
                } else {
                    objectCount += recursiveIteration(object[property]);
                }
            } else {
                objectCount++;
            }
        }
    }
    return objectCount;
}*/

function globalStats() { 
    const meta_key = "__globalStats__";
    const stats = _.reduce(global, (acc,obj,key) => {
        if(key !== meta_key) {
            try {
                acc[key] = JSON.stringify(obj).length;
            } catch(e) {
                acc[key] = 0;
            }
        }
        return acc;
    }, {});
    
    return { meta_key, stats };
}

function createCallOrderList(room) {

	if (Memory.callOrderList === undefined||  Memory.callOrderList.ts < Game.time) {
		Memory.callOrderList = {};
		Memory.callOrderList.myRoomsInOrder = [];
		Memory.callOrderList.ts = Game.time + 100;
		Memory.callOrderList.thisTick = Game.time;
	}

	if (!Memory.callOrderList.complete) {
		if (Memory.callOrderList.thisTick === Game.time) {
			Memory.callOrderList.myRoomsInOrder.push(room);
		} else if (Memory.callOrderList.thisTick + 1 === Game.time ){
			Memory.callOrderList.complete = true;
		} else {
			delete Memory.callOrderList;
		}
	}
}

function getCurrentCallAndRequestSegment() {
	if (Memory.callOrderList && Memory.callOrderList.complete) {
		let idxCurrent = (Game.time % Memory.callOrderList.myRoomsInOrder.length);
		let thisCall = Memory.callOrderList.myRoomsInOrder[idxCurrent];
		let idxNext = idxCurrent + 1;
		if (idxNext >=  Memory.callOrderList.myRoomsInOrder.length) { idxNext = 0; }		
		requestMemorySegment(Memory.callOrderList.myRoomsInOrder[idxNext], 1);
		return thisCall;
	}
}

function logHardResets(){
	if (!Memory.logs) { 
		Memory.logs = {};
		Memory.logs.prevTick = Game.time;
		Memory.logs.prevBucket = Game.cpu.bucket;
		Memory.logs.resetCounter = 0;
	}

	if (Game.time > Memory.logs.prevTick+1) {
		Memory.logs[Memory.logs.resetCounter] = {};
		Memory.logs[Memory.logs.resetCounter].bucketLoss = Memory.logs.prevBucket-Game.cpu.bucket;
		Memory.logs[Memory.logs.resetCounter].ticksLost = Game.time - (Memory.logs.prevTick + 1);
		Memory.logs[Memory.logs.resetCounter].tick = Game.time;

		if (Memory.logs[Memory.logs.resetCounter-1]){
			Memory.logs[Memory.logs.resetCounter].timeBetween =  Memory.logs[Memory.logs.resetCounter].tick - Memory.logs[Memory.logs.resetCounter-1].tick;
		}
		Memory.logs.resetCounter++;
	}
	Memory.logs.prevTick = Game.time;
	Memory.logs.prevBucket = Game.cpu.bucket;
}

function displayCreepStat(creep, cpuUsed) {
	Game.rooms[creep.room.name].visual.text(cpuUsed.toFixed(2), creep.pos, {align:"left"});
}

function createHeapStatCreep(role, heapUsed) {
	if (Memory.heap === undefined) { Memory.heap = {}; }
	if (Memory.heap[role] === undefined) {
		Memory.heap[role] = {};
		Memory.heap[role].numberOfCreeps = 0;
		Memory.heap[role].totalheap = 0;
	}
	Memory.heap[role].numberOfCreeps += 1;
	Memory.heap[role].totalheap += heapUsed;		
}

function createCpuStatCreep(role, cpuUsed) {
	if (Memory.cpu === undefined) { Memory.cpu = {}; }
	if (Memory.cpu[role] === undefined) {
		Memory.cpu[role] = {};
		Memory.cpu[role].numberOfCreeps = 0;
		Memory.cpu[role].totalCpu = 0;
	}
	Memory.cpu[role].numberOfCreeps += 1;
	Memory.cpu[role].totalCpu += cpuUsed;		
}


function count_mem_keys(mem) {
	if (!mem) {
		mem = Memory;
	}
	let total = 0;
	for (let key in mem) {
		total += 1;
		let submem = mem[key];
		if (_.isObject(submem)) {
			total += count_mem_keys(submem);
		}
	}
	return total;
}
/*
global.injectCurrentlySelected = function(){
    if(!global.currentlySelectedInjected)
    {
        global.currentlySelectedInjected = true;
        let output = `<SPAN>Trying to inject 'Currently Selected' code!</SPAN>
<SCRIPT>
if(!window.currentlySelectedInstalled) {
    let Connection = angular.element($('body')).injector().get('Connection');
    let roomScope = angular.element(document.getElementsByClassName("room ng-scope")).scope();
    Connection.onRoomUpdate(roomScope, function()
    {
        let selectedObject = roomScope.Room.selectedObject;
        if(selectedObject && selectedObject._id)
        {
            if(window.injectedSelectedObjectId != selectedObject._id)
            {
                window.injectedSelectedObjectId = selectedObject._id;
                angular.element($('body')).injector().get('Connection').sendConsoleCommand("Memory.selectedObjectId = '" + selectedObject._id + "'");
            }
        }
        else if(window.injectedSelectedObjectId)
        {
            delete window.injectedSelectedObjectId;
            angular.element($('body')).injector().get('Connection').sendConsoleCommand("delete Memory.selectedObjectId");
        }

    });

    window.currentlySelectedInstalled = true;
}
</SCRIPT>`
	    console.log(output.replace(/(\r\n|\n|\r)\t+|(\r\n|\n|\r) +|(\r\n|\n|\r)/gm, ''));
    }
//*/

/*

}

global.forceInjectCurrentlySelected = ()=>{global.currentlySelectedInjected = false; injectCurrentlySelected();}
injectCurrentlySelected();
*/
		




/**
 * Simple benchmark test with sanity check
 *
 * Usage: benchmark([
 *		() => doThing(),
 *		() => doThingAnotherWay(),
 * ]);
 *
 * Output:
 *
 * Benchmark results, 1 loop(s):
 * Time: 1.345, Avg: 1.345, Function: () => doThing()
 * Time: 1.118, Avg: 1.118, Function: () => doThingAnotherWay()
 */
function benchmark(arr, iter=10) {
	let i,j,len = arr.length;
	let start,used;
	let results = _.map(arr, (fn) => ({fn: fn.toString(), time: 0, avg: 0}));
	for( j=0; j<iter; j++) {
		for(i=0; i<len; i++) {
			start = Game.cpu.getUsed();
			results[i].rtn = arr[i]();
			used = Game.cpu.getUsed() - start;
			if(i>0 && results[i].rtn != results[0].rtn)
				throw new Error('Results are not the same!');
			results[i].time += used;
		}
	}
	console.log(`Benchmark results, ${iter} loop(s): `);
	_.each(results, (res) => {
		res.avg = _.round(res.time / iter,3);
		res.time = _.round(res.time,3);
		console.log(`Time: ${res.time}, Avg: ${res.avg}, Function: ${res.fn}`);
	});
}	
	
global.deleteAllMemory = function(){
	let memoryKeys =Object.keys(Memory);


	for(let i=memoryKeys.length; i>=0; --i) {
		delete Memory[memoryKeys[i]];
	}
}

//////  profile.ts 
function wrappedCall(name, originalFunction, that, args) {
	let result;
	global.Tracing.traceCall(name, () => {
		result = originalFunction.apply(that, args);
		// wrap iterators
		if (!!result && typeof (result.next) === 'function' &&
			result.__wrapped === undefined) {
			result.__wrapped = true;
			let orgNext = result.next;
			Reflect.set(result, 'next', function (...args2) {
				return wrappedCall(name, orgNext, this, args2);
			});
		}
	}, () => {
		// wrap arguments/returns
		/*
		let r = {};
		for (let i = 0; i < args.length; i++) {
			r[`arg${i}`] = String(args[i]);
		}
		r[`ret`] = String(result);
		return r;
		*/
		// end wrap
	});
	return result;
}

function wrapFunction(obj, _key, className) {
	let descriptor = Reflect.getOwnPropertyDescriptor(obj, _key);
	let key = String(_key);
	if (!descriptor || descriptor.get || descriptor.set) {
		return;
	}
	if (key === 'constructor') {
		return;
	}
	let originalFunction = descriptor.value;
	if (!originalFunction || typeof originalFunction !== 'function') {
		return;
	}
	// set a key for the object in memory
	if (!className) {
		className = obj.constructor ? `${obj.constructor.name}` : '';
	}
	let memKey = className + `:${key}`;
	// set a tag so we don't wrap a function twice
	let savedName = `__${key}__`;
	if (Reflect.has(obj, savedName)) {
		return;
	}
	Reflect.set(obj, savedName, originalFunction);
	Reflect.set(obj, _key, function (...args) {
		return wrappedCall(memKey, originalFunction, this, args);
	});
}

function wrapEngine() {
	for (let m in Creep.prototype) {
		wrapFunction(Creep.prototype, m, 'Creep');
	}
	for (let m in Room.prototype) {
		wrapFunction(Room.prototype, m, 'Room');
	}

	for (let m in PowerCreep.prototype) {
		wrapFunction(PowerCreep.prototype, m, 'PowerCreep');
	}

	for (let m in Structure.prototype) {
		wrapFunction(Structure.prototype, m, 'Structure');
	}

	for (let m in StructureContainer.prototype) {
		wrapFunction(StructureContainer.prototype, m, 'StructureContainer');
	}

	for (let m in StructureTerminal.prototype) {
		wrapFunction(StructureTerminal.prototype, m, 'StructureTerminal');
	}

	for (let m in Source.prototype) {
		wrapFunction(Source.prototype, m, 'Source');
	}

	for (let m in Tombstone.prototype) {
		wrapFunction(Tombstone.prototype, m, 'Tombstone');
	}

	for (let m in StructureLab.prototype) {
		wrapFunction(StructureLab.prototype, m, 'StructureLab');
	}

	for (let m in StructureRampart.prototype) {
		wrapFunction(StructureRampart.prototype, m, 'StructureRampart');
	}

	for (let m in StructureRoad.prototype) {
		wrapFunction(StructureRoad.prototype, m, 'StructureRoad');
	}

	for (let m in StructurePortal.prototype) {		
		wrapFunction(StructurePortal.prototype, m, 'StructurePortal');
	}

	for (let m in StructureExtractor.prototype) {
		wrapFunction(StructureExtractor.prototype, m, 'StructureExtractor');
	}

	for (let m in ConstructionSite.prototype) {
		wrapFunction(ConstructionSite.prototype, m, 'ConstructionSite');
	}

	for (let m in Resource.prototype) {
		wrapFunction(Resource.prototype, m, 'Resource');
	}

	for (let m in Ruin.prototype) {
		wrapFunction(Ruin.prototype, m, 'Ruin');
	}
	
	for (let m in RoomPosition.prototype) {
		wrapFunction(RoomPosition.prototype, m, 'RoomPosition');
	}

	for (let m in Game.prototype) {
		wrapFunction(Game.prototype, m, 'Game');
	}

	for (let m in PathFinder.prototype) {
		wrapFunction(PathFinder.prototype, m, 'PathFinder');
	}

	for (let m in Game.market.prototype) {
		wrapFunction(Game.market.prototype, m, 'Game.market');
	}

}

function trace(target, key, _descriptor) {
	if (key) {
		// case of method decorator
		wrapFunction(target, key);
		return;
	}
	// case of class decorator
	let ctor = target;
	if (!ctor.prototype) {
		return;
	}
	let className = ctor.name;
	Reflect.ownKeys(ctor.prototype).forEach((k) => {
		wrapFunction(ctor.prototype, k, className);
	});
}