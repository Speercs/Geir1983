'use strict'
let crossRoomHandler = {
	
    run: function() {	
		
		let init		
		let myRooms = getMyRooms();

		init = Game.cpu.getUsed();
		if (Game.time % 327 === 0 || Memory.newEcoOpr) {
			delete Memory.newEcoOpr;

			createPowerCreeps();
			distributeEcoOperators(myRooms);
			stockUpBoostsForPowerRooms(myRooms);
		}
		global.stats['cpu.aiCrossRoomHandler.createPowerCreeps'] = Game.cpu.getUsed()-init;

		init = Game.cpu.getUsed();
		if (Game.time % 497 === 0) {
			checkAndClearSegments();			
		}
		global.stats['cpu.aiCrossRoomHandler.checkAndClearSegments'] = Game.cpu.getUsed()-init;

		init = Game.cpu.getUsed();
		updatePlayerData();
		global.stats['cpu.aiCrossRoomHandler.updatePlayerData'] = Game.cpu.getUsed()-init;

		if (ENABLE_PIXEL_GENERATION) {
			generatePixels();
		}

		// Restrict remotes if low bucket
		init = Game.cpu.getUsed();
		evaluteBucketAndRestrictRemotes(myRooms);
		global.stats['cpu.aiCrossRoomHandler.evaluteBucketAndRestrictRemotes'] = Game.cpu.getUsed()-init;

		if (DISABLED_TERMINAL){
			createCaravanTargets(myRooms);
		}

		
		init = Game.cpu.getUsed();
		if (Game.time % 10 == 0) {
			// Track new GCL 
			trackGclLevelTimes();
			// Check my rooms
			myRoomsCheck(myRooms);
		}

		if (Game.time % 100 == 0) {
			setWallHpSetpoints(myRooms);
		}


		global.stats['cpu.aiCrossRoomHandler.myRoomsStats'] = Game.cpu.getUsed()-init;

		// Needs to generate safemode
		init = Game.cpu.getUsed();
		if (Game.time % 991 == 0) {
			for (let roomName in myRooms){
				let room = Game.rooms[roomName]
				if (!room || !room.controller || room.controller.safeModeAvailable >= 3 || !room.terminal) { continue }
				log("missing safemode! want to restock for room " + roomName)
				restockRes(roomName, myRooms, RESOURCE_GHODIUM, 1000);
			}
		}
		global.stats['cpu.aiCrossRoomHandler.generateSafemode'] = Game.cpu.getUsed()-init;

        // CHECK IF MY ROOMS ARE UNDER ATTACK BY PLAYER
		init = Game.cpu.getUsed();
		defendMyRooms(myRooms);
		global.stats['cpu.aiCrossRoomHandler.defendMyRooms'] = Game.cpu.getUsed()-init;

		// CLEAN
		init = Game.cpu.getUsed();
		if (Game.time % 111 === 0) {
			// CLEAN COMBAT BOOST
			for (let room in Memory.combatBoost){
				let timeOut = Memory.combatBoost[room].ts || 0;
				if (Game.time > timeOut) {
					delete Memory.combatBoost[room];
				}
			}

			// CLEAN ATTACK TARGETS		
			for (let room in Memory.attackTarget){
				let timeOut = Memory.attackTarget[room].ts || 0;
				if (Game.time > timeOut) {
					delete Memory.attackTarget[room];

					let rangedAttackers = getCreeps('rangedAttacker');
					if (rangedAttackers.length > 0) {
						for (let _room in Memory.attackTarget) {
							if (Game.time > timeOut) { continue; }
							rangedAttackers = reassignAttackers(_room, rangedAttackers);
						}
					}
				}
				
				// ORDER CONTROLLER ATTACK IF ROOM DOWN
				if (Memory.rooms[room] && getRoomPRCL(room) < 3 && getRoomRCL(room) > 0){
					if (!Memory.controllerAttack[room]) {
						Memory.controllerAttack[room] = {};
					}
				}
			}
		}
		global.stats['cpu.aiCrossRoomHandler.clean'] = Game.cpu.getUsed()-init;


        // CHECK IF MY REMOTE ROOMS ARE UNDER ATTUNDER ATTACK BY INVADERS OR PLAYERS
		init = Game.cpu.getUsed();
		defendMyRemotes(myRooms);
		global.stats['cpu.aiCrossRoomHandler.defendMyRemotes'] = Game.cpu.getUsed()-init;

		// DECONSTRUCT MISSION IN REMOTES?
		init = Game.cpu.getUsed();
		cleanUpRemotes();
		global.stats['cpu.aiCrossRoomHandler.cleanUpRemotes'] = Game.cpu.getUsed()-init;

		if (SEASONAL_THORIUM) {
			checkDeadInvaderCoresForLoot();
		}
		 	
		// LAUNCH NUKES AT TIMER
		init = Game.cpu.getUsed();
		launchNukes(myRooms);
		global.stats['cpu.aiCrossRoomHandler.launchNukes'] = Game.cpu.getUsed()-init;

		// CHECK WHAT MINERALS ARE IN STOCK GLOBALY
		init = Game.cpu.getUsed();
		handleMinerals(myRooms);
		global.stats['cpu.aiCrossRoomHandler.handleMinerals'] = Game.cpu.getUsed()-init;

		// TRADE ON THE MARKET
		init = Game.cpu.getUsed();
		tradeOnMarket(myRooms);
		global.stats['cpu.aiCrossRoomHandler.tradeOnMarket'] = Game.cpu.getUsed()-init;

		// SEASONAL SYMBOLS TRANSFERS
		if (SEASONAL_SYMBOLS) {
			symbolTransfers(myRooms);
		}

		// SEASONAL COMMODITIES
		if (SEASONAL_COMMS) {
			orderCaravanObservers(myRooms)
		}

		if (SEASONAL_THORIUM) {
			handleThorium(myRooms)
		}

		// TRANSFER COMMODITIES BETWEEN FACTORIES
		init = Game.cpu.getUsed();
		if (ENABLE_FACTORIES) {
			factoryTransfers(myRooms);				
		}
		global.stats['cpu.aiCrossRoomHandler.factoryTransfers'] = Game.cpu.getUsed()-init;

		// SET RECIEVE/SEND ENERGY TARGETS
		init = Game.cpu.getUsed();
		energyShare(myRooms);
		global.stats['cpu.aiCrossRoomHandler.energyShare'] = Game.cpu.getUsed()-init;
		
		// FIND LOW LEVEL ROOMS AND ASK FOR HELP
		init = Game.cpu.getUsed();
		helpNeeded(myRooms);
		global.stats['cpu.aiCrossRoomHandler.helpNeeded'] = Game.cpu.getUsed()-init;

		// ADD FLAG TARGETS
		init = Game.cpu.getUsed();
		if (Game.time % 19 == 0){			
			addFlagTargets(myRooms);			
		}
		global.stats['cpu.aiCrossRoomHandler.addFlagTargets'] = Game.cpu.getUsed()-init;

		// POWER BANK MISSIONS
		init = Game.cpu.getUsed();
		assignPowerBanks(myRooms);
		global.stats['cpu.aiCrossRoomHandler.assignPowerBanks'] = Game.cpu.getUsed()-init;

		// FIND AND ASSIGN REMOTES
		init = Game.cpu.getUsed();
		assignRemotes(myRooms);
		global.stats['cpu.aiCrossRoomHandler.assignRemotes'] = Game.cpu.getUsed()-init;
		
		// FIND POTENTIAL SK MINERAL MINING ROOMS
		init = Game.cpu.getUsed();
		assignSkMinerals(myRooms);
		global.stats['cpu.aiCrossRoomHandler.assignSkMinerals'] = Game.cpu.getUsed()-init;
			
		// FIND POSSIBLE CLAIM EXPANSIONS AND SET SCORE
		init = Game.cpu.getUsed();
		if (BOT_MODE && Game.time % 67 === 3){
			findAndRateExpansions(myRooms);
		}
		global.stats['cpu.aiCrossRoomHandler.findAndRateExpansions'] = Game.cpu.getUsed()-init;
		
		// SET NEXT CLAIM TARGET
		init = Game.cpu.getUsed();
		setNextClaimTarget();
		global.stats['cpu.aiCrossRoomHandler.setNextClaimTarget'] = Game.cpu.getUsed()-init;

		// CREATE ROOM PLANS FOR POTENTIAL NEW CLAIMS
		init = Game.cpu.getUsed();
		createRoomPlansForClaimTargets();
		global.stats['cpu.aiCrossRoomHandler.createRoomPlansForClaimTargets'] = Game.cpu.getUsed()-init;

		// RECLAIM GCL ROOMS
		for (let target in PRAISE_GCL_ROOMS) {
			if (!Game.rooms[target] || !Memory.rooms[target].myRoom) {
				global.expansionTargets[target] = {}
			}
		}

		// ASSIGN NEXT CLAIMER
		init = Game.cpu.getUsed();
		assignNextClaim(myRooms)
		global.stats['cpu.aiCrossRoomHandler.assignNextClaim'] = Game.cpu.getUsed()-init;
		
		// CHECK FOR FAILING ROOMS AND ABANDON
		if (BOT_MODE && Game.time % 883 === 0) {

			let mylowLevelRooms = getMyRoomsBelowPrcl(3);
			for (let roomName in mylowLevelRooms) {

				if (!Game.rooms[roomName] || !Game.rooms[roomName].controller ) { continue; }	

				if (Memory.rooms[roomName] && !Memory.rooms[roomName].hostiles ) { continue; }
				let controller = Game.rooms[roomName].controller;
				if (Game.rooms[roomName].find(FIND_MY_STRUCTURES).length > 0) { continue; }
				 
				let maxTicksToDowngrade = CONTROLLER_DOWNGRADE[controller.level];
				let ticksDowngraded = maxTicksToDowngrade - controller.ticksToDowngrade;
				if (controller.upgradeBlocked || 
					ticksDowngraded > 5000
				) {
					unclaimController(controller);
				}
			}
		}

		// CLEAR EXPANSION TARGET IF CAPTURED
		if (Memory.expansionTarget[NEXT_EXPANSION] && Memory.expansionTarget[NEXT_EXPANSION].assignedClaimer) {
			let targetExp = Memory.expansionTarget[NEXT_EXPANSION].roomName
			if ((Game.rooms[targetExp] && Memory.rooms[targetExp] && Memory.rooms[targetExp].myRoom === 1) ||
				Object.keys(myRooms).length >= Game.gcl.level
				){				
				delete Memory.expansionTarget[targetExp];
				delete Memory.expansionTarget[NEXT_EXPANSION];
				requestMemSave();
			}
		}

		// CLEAR EXPANSION PENALTIES	
		if (BOT_MODE && Game.time % 983 === 0) {	
			for (let room in Memory.expansionTargetTimeout) {
				if (Game.time > Memory.expansionTargetTimeout[room].timeout) {
					delete Memory.expansionTargetTimeout[room];
				}
			}
		}
		
		init = Game.cpu.getUsed();
		if (Game.time % 139 === 0) {
			attackCoordinatorV3(myRooms);
		}
		global.stats['cpu.aiCrossRoomHandler.attackCoordinatorV3'] = Game.cpu.getUsed()-init;

		// AUTO ADD PRAISE ROOM
		if (!BOT_MODE && !SWC_MODE && Game.time % 241 === 0 || !global.setGCL) {
			global.setGCL = 1;
			setGCLPraiseRoom(myRooms);
		}
		
		// ALLIANCE TRADER
		init = Game.cpu.getUsed();
		if (BOT_MODE) {
			simpleAllies.checkAllies();
		}
		global.stats['cpu.aiCrossRoomHandler.checkAllies'] = Game.cpu.getUsed()-init;
		
		init = Game.cpu.getUsed();
		if (BOT_MODE) {
			simpleAllies.createRequest();
			global.stats['cpu.aiCrossRoomHandler.simpleAllies'] = Game.cpu.getUsed()-init;
		} else if (Game.time % 10 === 0) {
			setYPCommunicationSegment([99]);
			analyzeOtherPlayerSegment(myRooms);
		}
		global.stats['cpu.aiCrossRoomHandler.analyzeOtherPlayerSegment'] = Game.cpu.getUsed()-init;

		// TRACK MARKET AND SEGMENT TRADES
		init = Game.cpu.getUsed();
		trackMarketTransactions();
		global.stats['cpu.aiCrossRoomHandler.trackMarketTransactions'] = Game.cpu.getUsed()-init;

		// TRACK MARKET PRICES
		init = Game.cpu.getUsed();
		if (Game.time % (TERMINAL_COOLDOWN * 150) === 0) {
			checkMarketPrices();
		}
		global.stats['cpu.aiCrossRoomHandler.checkMarketPrices'] = Game.cpu.getUsed()-init;

		// CHECK WHAT COMMODITY TO CREATE
		init = Game.cpu.getUsed();
		if ((!Memory.comToProduceTs || Game.time > Memory.comToProduceTs) && Memory.factoryMaxLevel >= 0 && (!DISABLED_MARKET || SEASONAL_COMMS ) && Game.time % (TERMINAL_COOLDOWN * 5) ) {

			if (!Memory.comToProduceTs) {
				Memory.comToProduceTs = Game.time + 4993;
			} else {

				Memory.comToProduceTs = Game.time + 993;
				if (!BOT_MODE || SEASONAL_COMMS ||
					(Game.market.credits < (Memory.wantedCredits || 1000))
				) {
					let minimumReturn = 1.5;
					Memory.comodityToProcude = getBestCommodity(minimumReturn, true);
				} else {
					delete Memory.comodityToProcude;
				}
			}
		}
		global.stats['cpu.aiCrossRoomHandler.getBestCommodity'] = Game.cpu.getUsed()-init;

		// RAGE DECAY
		if (Game.time % 997 === 0) {
			rageDecay();
		}

		// Create roomplans for existing rooms
		if (Game.time % 7 === 0) {
			createNewRoomPlans(myRooms)
		}

		// Clear non existing flags memory
		if (Game.time % 777 === 0) {
			clearFlags();
		}

		// Harvest Deposits for Credits?
		depositsForCreditsEval()		

		// Draw Map visuals
		drawMapVisuals(myRooms);
    }
}
module.exports = crossRoomHandler;

function clearFlags() {

	for (let flag in Memory.flags) {
		if (Game.flags[flag]) { continue; }
		delete Memory.flags[flag]
	}
}



function depositsForCreditsEval() {
	if (global._depositsForCredits.ts !== undefined && Game.time < global._depositsForCredits.ts ) { return; }
	global._depositsForCredits.ts = Game.time + 779;
	global._depositsForCredits.mine = evaluateHarvestDeposits();	
}

function evaluateHarvestDeposits() {

	if (HARVEST_DEPOSITS) { return true; }
	if (DISABLED_MARKET) { return false; }

	// wants more credits
	if (!Memory.wantedCredits || Game.market.credits > Memory.wantedCredits * 5) { return false; }
	
	// check that deposts are worth something
	for (let res in HIGHWAY_MINERAL) {
		if (!getMarketPrice(res, true)) { return false; }
	}
	
	return true;
}

global.checkAndClearSegments = function(){
	let segmentsUsed = 0;
	let worstBaseScore = Infinity;
	let baseToDelete;

	let removedSegments = 0;

	for (let id in Memory.__segindex.index) {
		segmentsUsed += Memory.__segindex.index[id].ids.length;

		if (Memory.expansionTarget.baseCalc && Memory.expansionTarget.baseCalc[id]) {
			if (Memory.expansionTarget.baseCalc[id].roomScore !== undefined &&
				Memory.expansionTarget.baseCalc[id].roomScore < worstBaseScore && 
				(!Memory.rooms[id] || !Memory.rooms[id].myRoom)
			) {
				worstBaseScore = Memory.expansionTarget.baseCalc[id].roomScore;
				baseToDelete = id;
			}
		} else if (Memory.rooms[id] && !Memory.rooms[id].myRoom && !baseToDelete) {
			baseToDelete = id;
		}

		if (removedSegments > 2) { continue; }
		
		if (Memory.__segindex.index[id].ids[0] < 0) {
			removeSegment(id, 0)
			removedSegments++
		} else {

			/*
			// Remove legacy data!
			if (id === "BaseEval" || id === "OOB") {
				 continue;				
			}
			
			if (!Game.rooms[id] || !Game.rooms[id].controller || !Game.rooms[id].controller.my) {
				log("found room semgent no longer in use! " + id);
				removeSegment(id, 0)
				removedSegments++
			}*/
		}
	}
	console.log("used segments " + segmentsUsed);

	if (baseToDelete && segmentsUsed > 90) {
		removeSegment(baseToDelete, worstBaseScore)
		delete Memory.rooms[baseToDelete].blueprintComplete;
	}
}

function factoryTransfers(myRooms) {
	if (Memory.traderFactory === undefined) {	
		Memory.traderFactory = Game.time + 25000;	// we probably just started out		
	}
				
	if (Game.time > Memory.traderFactory){
		Memory.traderFactory = Game.time + 78;
		Memory.factories = {};
		Memory.factoryMaxLevel = -1;
		for (let roomName in myRooms) {
			let factory = Game.rooms[roomName].findByType(STRUCTURE_FACTORY)[0];
			if (factory) {
				let level = factory.level || 0;

				if (level === 0 && Memory.rooms[roomName].factoryLevel) {
					level = Memory.rooms[roomName].factoryLevel;
				}

				if (level > 0) {
					if ( Game.rooms[roomName].store(RESOURCE_OPS) < MIN_OPS_FACTORY_OPERATE) {
						/*
						if (Memory.factories.request === undefined) { Memory.factories.request = {}; }
						if (Memory.factories.request[RESOURCE_OPS] === undefined) { Memory.factories.request[RESOURCE_OPS] = {}; }

						if (Memory.factories.request[RESOURCE_OPS][roomName] === undefined) { 
							Memory.factories.request[RESOURCE_OPS][roomName] = {}; 
							Memory.factories.request[RESOURCE_OPS][roomName].amount = 0;
							Memory.factories.request[RESOURCE_OPS][roomName].level = level;
						}

						Memory.factories.request[RESOURCE_OPS][roomName].amount += MIN_OPS_FACTORY_OPERATE - Game.rooms[roomName].store(RESOURCE_OPS);
							*/
						restockRes(roomName, myRooms, RESOURCE_OPS, MIN_OPS_FACTORY_OPERATE, true);
					}

					if (Memory.rooms[roomName].factoryOperator) {
						if (Game.time > Memory.rooms[roomName].factoryOperator) {
							delete Memory.rooms[roomName].factoryOperator;
							delete Memory.rooms[roomName].factoryLevel;
							level = 0;
						}
					} else {					

						level = 0;
					}
				}

				Memory.factoryMaxLevel = Math.max(Memory.factoryMaxLevel, level);
				if (Memory.factories[level] === undefined) { Memory.factories[level] = {}; }
				Memory.factories[level][roomName] = {};
				
				if (Memory.comodityToProcude) {

					let myRecepie = getCachedComoditiesForResAtLevel(Memory.comodityToProcude, level, 1);
					
					for (let commodity in myRecepie) {

						if (BASE_MINERALS_OBJECT[commodity]) { continue; }
						let wantedAmount
						let currentAmount

						/*

						let wantedAmount = Math.ceil(maxStoreInRoom(commodity) * 0.25);
						let currentAmount = Game.rooms[roomName].storeWithFactory(commodity);

						if (currentAmount < wantedAmount) { // This is what im creating?
							if (Memory.factories.request === undefined) { Memory.factories.request = {}; }
							if (Memory.factories.request[commodity] === undefined) { Memory.factories.request[commodity] = {}; }

							if (Memory.factories.request[commodity][roomName] === undefined) { 
								Memory.factories.request[commodity][roomName] = {}; 
								Memory.factories.request[commodity][roomName].amount = 0;
								Memory.factories.request[commodity][roomName].level = level;
							}

							Memory.factories.request[commodity][roomName].amount += wantedAmount - currentAmount;
						}*/


						for (let ingredient in COMMODITIES[commodity].components) {
							if (BASE_MINERALS_OBJECT[ingredient] || ingredient === RESOURCE_ENERGY) { continue; }
						//	let wantedAmount = Math.max((maxStoreInRoom(ingredient) * 0.2), 4);

							wantedAmount = COMMODITIES[commodity].components[ingredient] * 5;
							currentAmount = Game.rooms[roomName].storeWithFactory(ingredient);
						//	if (currentAmount < wantedAmount) {
								if (Memory.factories.request === undefined) { Memory.factories.request = {}; }
								if (Memory.factories.request[ingredient] === undefined) { Memory.factories.request[ingredient] = {}; }

								if (Memory.factories.request[ingredient][roomName] === undefined) { 
									Memory.factories.request[ingredient][roomName] = {}; 
									Memory.factories.request[ingredient][roomName].amount = 0;
									Memory.factories.request[ingredient][roomName].level = level;
								}

								Memory.factories.request[ingredient][roomName].amount += (wantedAmount * 2) - currentAmount;
								
						//	}
						}
					}
				}
			}
		}

		if (Memory.export && exportRoom) {

			let roomName = Object.keys(exportRoom)[0]
			for (let shards in Memory.export) {
				for (let res in Memory.export[shards]) {

					if (!Memory.export[shards][res].amount) { continue; }

					let currentAmount = Game.rooms[roomName].store(res);

					if (Memory.factories.request === undefined) { Memory.factories.request = {}; }
					if (Memory.factories.request[res] === undefined) { Memory.factories.request[res] = {}; }

					if (Memory.factories.request[res][roomName] === undefined) { 
						Memory.factories.request[res][roomName] = {}; 
						Memory.factories.request[res][roomName].amount = 0;
						Memory.factories.request[res][roomName].level = 1;
					}

					Memory.factories.request[res][roomName].amount = Math.max(Memory.export[shards][res].amount, Memory.factories.request[res][roomName].amount, maxStoreInRoom(res)) - currentAmount;
					Memory.factories.request[res][roomName].level = 1;
				}
			}
		}

		if (SEASONAL_COMMS) {

			for (let caravanId in Memory.caravans) {
				let caravan = Memory.caravans[caravanId]

				if (!caravan.score) { continue; }
				if (Memory.caravans.abortSpawn) { continue; }
				
				for (let res in caravan.score) {

					for (let roomName in caravan.assignedRooms) {
						if (caravan.assignedRooms[roomName].abortSpawn) { continue; }
						let currentAmount = Game.rooms[roomName].store(res);

						if (currentAmount < caravan.score[res].amount) {
							if (Memory.factories.request === undefined) { Memory.factories.request = {}; }
							if (Memory.factories.request[res] === undefined) { Memory.factories.request[res] = {}; }

							if (Memory.factories.request[res][roomName] === undefined) { 
								Memory.factories.request[res][roomName] = {}; 
								Memory.factories.request[res][roomName].amount = 0;
								Memory.factories.request[res][roomName].level = 1;
							}

							Memory.factories.request[res][roomName].amount = Math.max(caravan.score[res].amount, Memory.factories.request[res][roomName].amount, maxStoreInRoom(res)) - currentAmount;
							Memory.factories.request[res][roomName].level = 1;
						}
					}
					
				}
			}
		}
		

		if (Memory.factories.request) {
			console.log(JSON.stringify(Memory.factories.request))
			for (let donorRoom in myRooms) {
				
				let donorTerminal = Game.rooms[donorRoom].terminal;							
				if (!donorTerminal || donorTerminal.__cooldown) { continue; }

				let bestScore = -Infinity;
				let bestRoom = null;
				let bestIngredient = null;
				for (let ingredient in Memory.factories.request) {

					if (!donorTerminal.store[ingredient]) { continue; }
					if (Memory.factories.request[ingredient][donorRoom] && Memory.factories.request[ingredient][donorRoom].amount > -1000) { continue; }	// send if i have more than enough?
							
					let wantedAmount = maxStoreInRoom(ingredient) || 1;
					if (exportRoom[donorRoom] && Game.rooms[donorRoom].store(ingredient) < wantedAmount * 3 ) { continue; }

					for (let reciever in Memory.factories.request[ingredient]) {
						let score = 0;

						if (Memory.factories.request[ingredient][reciever].amount <= 0) { continue; }
						
						let roomRange = getRoomLinearDistance(donorRoom, reciever);

						score += 1 - Math.min(roomRange, 20) / 20;
					//	score += Math.min(Memory.factories.request[ingredient][reciever].amount, wantedAmount) / wantedAmount;
						score += Memory.factories.request[ingredient][reciever].level || 0;
						

					//	console.log(reciever + " wants " + ingredient + " amount " + Memory.factories.request[ingredient][reciever].amount + " factory lvl " + Memory.factories.request[ingredient][reciever].level + " score " + score.toFixed(1))

						if (score > bestScore){
							bestRoom = reciever;
							bestScore = score;
							bestIngredient = ingredient;
						}
					}
				}

				if (bestRoom && bestIngredient && Memory.factories.request[bestIngredient][bestRoom]) {
					let sendAmount = 1000;
					let cost = Game.market.calcTransactionCost(sendAmount, bestRoom, donorRoom);								
					let affordableSend = Math.floor((cost / sendAmount) * donorTerminal.store[RESOURCE_ENERGY]);
					sendAmount = Math.min(Memory.factories.request[bestIngredient][bestRoom].amount, donorTerminal.store[bestIngredient], affordableSend);

					if (!sendAmount || sendAmount <= 0) { continue; }							
					let result = donorTerminal.send(bestIngredient, sendAmount, bestRoom);
					if (result === OK) {
						console.log(donorRoom + " " + bestIngredient + " factories sending " +sendAmount + ' units, completed successfully to ' +bestRoom);  
						if (SEASONAL_COMMS) {
							Memory.traderFactory = Game.time + TERMINAL_COOLDOWN
						}
						delete Memory.factories.request[bestIngredient][bestRoom]
					//	return 1;
					} else {
						console.log(donorRoom + " " + bestIngredient + " factories sending " +sendAmount + ' units, error to ' +bestRoom + ' error code ' + result);  
					}
				}						
			}
		}
	}		
}

function orderCaravanObservers(myRooms) {

	if (Memory.myRoomHighPRCL < 7) { return; }

	if (!Memory.assignCaravanObserversTs || Game.time > Memory.assignCaravanObserversTs) {
		Memory.assignCaravanObserversTs = Game.time + 647;
		for (let cornerRoom in Memory.shardPortals) {

			let roomsInRange = getMyClosestRooms(cornerRoom, 4, 3);
			if (roomsInRange && Object.keys(roomsInRange).length > 0) {
				Memory.scoutObservers[cornerRoom] = {
					assignedSpawns: roomsInRange					
				};
			}		

		}
	}
}

global.isAssistedLevelingSpawn = function(spawn) {
	let count = 0;
	for (let roomName in Memory.assistedLeveling) {
		for (let spawner in Memory.assistedLeveling[roomName].assignedSpawns) {
			if (spawner === spawn) { count++ }
		}
	}

	for (let roomName in Memory.assistedMine) {
		for (let spawner in Memory.assistedMine[roomName].assignedSpawns) {
			if (spawner === spawn) { count++ }
		}
	}



	return count;
}


function assistedLeveling(myRooms) {
	if (!Memory.handleAssistedTs || Game.time > Memory.handleAssistedTs) {
		Memory.handleAssistedTs = Game.time + 47;

		// set new assisted leveling targets
		for (let roomName in myRooms) {
			if (getRoomPRCL(roomName) > 6 || Game.rooms[roomName].terminal) { 
				continue; 
			}
			if (Memory.assistedLeveling[roomName] === undefined) { Memory.assistedLeveling[roomName] = {} }

			let assistedTarget = Memory.assistedLeveling[roomName]
			if (!assistedTarget.assignTs || Game.time > assistedTarget.assignTs) {
				assistedTarget.assignTs = Game.time + 2499;

				let range = 10;
				if (Memory.rooms[roomName].mineOnly) { range = 7; }
				let minPrcl = 7
				assistedTarget.assignedSpawns =  getMyClosestRooms(roomName, minPrcl, 5, range);

				if (roomName === "E25S19") {
					assistedTarget.assignedSpawns["E23S24"] = {
						dist: 7
					}
				}

				// get travel time
				for (let spawner in assistedTarget.assignedSpawns) {

					if (Memory.rooms[spawner].mineOnly) { 
						delete assistedTarget.assignedSpawns[spawner];
						continue; 
					 }

					let startPos = Game.rooms[spawner].storage.pos;
					let endPos;
					if (Game.rooms[roomName]) {
						if (Game.rooms[roomName].storage) {
							endPos = Game.rooms[roomName].storage.pos;
						} else {
							endPos = Game.rooms[roomName].controller.pos;
						}
					}

					if (!endPos) {
						endPos = pullIdlePosForRoom(roomName);
					}

					let pathToSource = findTravelPath(startPos, endPos,
						{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:50000, uncompressed: true, allowSK: true})
					if (!pathToSource.incomplete) {
						assistedTarget.assignedSpawns[spawner].ticksToTarget = pathToSource.cost;
					}
				}
			}
		}

		for (let roomName in Memory.assistedLeveling) {		

			let controller = Game.rooms[roomName].controller;
				
			if (controller.level < 6 || !Game.rooms[roomName].terminal) {
				if(Game.rooms[roomName].terminal){
					PUSH_RCL_TARGETS[roomName] = {};
				}

				let energyStored = Game.rooms[roomName].store(RESOURCE_ENERGY);
				let wantedEnergy = 100000;
				wantedEnergy += energyRequiredForRcl(6, controller);
				if (!Game.rooms[roomName].terminal) {
					wantedEnergy += CONSTRUCTION_COST[STRUCTURE_TERMINAL];
				}
				
				if (energyStored < wantedEnergy) {					
					orderEnergyCart(roomName, 500, 2);
				}

			} else {
				delete PUSH_RCL_TARGETS[roomName];
			}


			if (getRoomPRCL(roomName) > 6 || Game.rooms[roomName].terminal) { 
				// could keep it with better upgraders and such?
				delete Memory.assistedLeveling[roomName]  
				continue;
			}	

		}
	}

}


function handleThorium(myRooms) {
	if (!Memory.handleThoriumTs || Game.time > Memory.handleThoriumTs) {
		Memory.handleThoriumTs = Game.time + 17;

		// Assign and enable Reactors
		let storedThorium = Memory.Minerals[RESOURCE_THORIUM] || 0

		
		let reactorRooms = {}
		let sortable = [];
		let lowThorium = 99999;
		let lowThoriumRoom;

		let activeReactors = 0;

		let flags = _.filter(Object.keys(Game.flags), flag => ((Game.flags[flag].color == COLOR_GREEN && Game.flags[flag].secondaryColor == COLOR_GREEN)));
		for (let idx in flags){
			let targetRoom = Game.flags[flags[idx]].pos.roomName;

			if (!roomIsCenter(targetRoom)) { continue; }
			let reactorData = Memory.reactors[targetRoom];
			if (!reactorData || !reactorData.assignedRooms) { continue; }

			if (!reactorData.active && storedThorium < 100000) { continue; }

			reactorData.active = true;
			activeReactors++

			if (!Game.rooms[targetRoom]) { requestRoomVision(targetRoom); }

			for (let room in reactorData.assignedRooms) {
				reactorRooms[room] = {};
				if (Game.rooms[room].terminal) {
					let storedThoriumRoom = Game.rooms[room].store(RESOURCE_THORIUM)
				//	sortable.push({roomName: room, thorium: storedThoriumRoom})
	
					if (storedThoriumRoom < lowThorium ) {
						lowThorium = storedThoriumRoom;
						lowThoriumRoom = room;
					}
				}				
			}

			if (Memory.rooms[targetRoom] && Memory.rooms[targetRoom].hostiles && !ALLOW_SCORE[Memory.rooms[targetRoom].isPlayer]) {
				
				if (Memory.rooms[targetRoom].hostiles.power.defensive && reactorData.my) {
					addRage(Memory.rooms[targetRoom].isPlayer, 50000)
					addRage(Memory.rooms[targetRoom].isPlayer, Memory.rooms[targetRoom].hostiles.power.defensive)
					return false;
				}

				if (Memory.rooms[targetRoom].isPlayer && !ALLOW_SCORE[Memory.rooms[targetRoom].isPlayer]) {					
					
					let strength = Memory.rooms[targetRoom].hostiles.power.strength;
					log(targetRoom + " reactor under attack by player! force " + strength);

					if (strength < 250) { // ranged attackers
						orderRangedAttackers(targetRoom, 1250, "reactorAttacked" );
					} else if (strength < 1000) { // duos
						if (!Memory.combatDeconstruct[targetRoom]) {
							Memory.orderWreckers[targetRoom] = {};
						}
					} else { // quads
						if (!Memory.raids.activeTargets ||  !Memory.raids.activeTargets[targetRoom]) { 
							addRaid(targetRoom, {raidType: RAID_TYPE_PHALANX});
						}
					}
				}
			}
		}

		let lowAmount = activeReactors * 40000
		let satisfiedAmount =  activeReactors * 70000

		if (!Memory.Minerals[RESOURCE_THORIUM] || Memory.Minerals[RESOURCE_THORIUM] < lowAmount) {
			Memory.getMoreThorium = true;
		} else if (Memory.Minerals[RESOURCE_THORIUM] > satisfiedAmount) {
			Memory.getMoreThorium = false;
		}


		// Send thorium to Reactor rooms
		if (lowThoriumRoom) {
		//	log("LOW THORIUM ROOM "+ lowThoriumRoom + " amount " + lowThorium)
			let donators = {};
			for (let room in myRooms) {		

				if (room === lowThoriumRoom) { continue; }
	
				if (!Game.rooms[room] || !Game.rooms[room].terminal || !Game.rooms[room].terminal.store[RESOURCE_THORIUM] || Game.rooms[room].terminal.cooldown || Game.rooms[room].terminal.__cooldown) { continue; }
				
				if (reactorRooms[room]) {
					
					if (lowThorium > 3000) { continue; }

					// could also share if someone really needs thorium..
					if (Game.rooms[room].store(RESOURCE_THORIUM) < 10000) { continue; }
				}
				
				donators[room] = {}
			}
			restockRes(lowThoriumRoom, donators, RESOURCE_THORIUM, 5000);
		}


		// Handle Thorium claims
		flags = _.filter(Object.keys(Game.flags), flag => ((Game.flags[flag].color == COLOR_GREEN && Game.flags[flag].secondaryColor == COLOR_WHITE)));

		if (flags.length <= 3 && lowThoriumRoom) {	// set next claim target
			let nextClaim = setNextThoriumClaim();
			if (nextClaim) {
				let flagPos;
				if (Game.rooms[nextClaim]) {
					flagPos = new RoomPosition(25, 25, nextClaim);
				} else {
					requestRoomVision(nextClaim);
					flagPos = new RoomPosition(25, 25, lowThoriumRoom);
				}
				
				flagPos.createFlag(nextClaim, COLOR_GREEN, COLOR_WHITE);						
			}
		}

		// Assisted leveling
		assistedLeveling(myRooms);


		for (let idx in flags){
		
			let flag = Game.flags[flags[idx]];
			let roomName = flag.pos.roomName;

			log("THORIUM CLAIM " + roomName)

			if (flag.name !== roomName) {
				log("wrong room name! " + flag.name + " vs " + roomName);
				let flagPos;
				try {
					flagPos = new RoomPosition(25, 25, flag.name);
				} catch (err) {
					//
				}
				
				flag.setPosition(flagPos);
				continue;
			}



			if (!Game.rooms[roomName]) { continue; }

			Memory.rooms[roomName].mineOnly = true;

			let controller = Game.rooms[roomName].controller;
			
			if (controller.level < 6 || !Game.rooms[roomName].terminal) {
				if(Game.rooms[roomName].terminal){
					PUSH_RCL_TARGETS[roomName] = {};
				}
			

				let energyStored = Game.rooms[roomName].store(RESOURCE_ENERGY);
				let wantedEnergy = 100000;
				wantedEnergy += energyRequiredForRcl(6, controller);
				if (!Game.rooms[roomName].terminal) {
					wantedEnergy += CONSTRUCTION_COST[STRUCTURE_TERMINAL];
				}
				
				if (energyStored < wantedEnergy) {
					orderEnergyCart(roomName, 500, 2);
				}

			} else {
				delete PUSH_RCL_TARGETS[roomName];				
			}			

			if (Game.rooms[roomName].terminal && (!Game.rooms[roomName].getThorium() || Game.rooms[roomName].getThorium().mineralAmount < THORIUM_MIN_EXTRACTOR)) {
				Memory.rooms[roomName].evacRes = Game.time + 2500;
				global.ABANDON_SHIP[roomName] = {};

				

				if (Memory.rooms[roomName].evacuatedResources) {

					let thorium = Game.rooms[roomName].getThorium();

					if (Memory.rooms[roomName].readyToUnclaim) {
						unclaimController(controller);
						flag.remove();
						delete Memory.rooms[roomName].mineOnly;
						delete Memory.rooms[roomName].readyToUnclaim;
						delete Memory.assistedMine[roomName];
					//	clearSources(roomName);
						delete Memory.remoteSources;
						Memory.remoteSources = {};
					}

					if (!thorium || thorium.mineralAmount < 200 ) {
						clearRoom(roomName, true, true, true);
						Memory.rooms[roomName].readyToUnclaim = 1;
						
					}

					
				}
			} else if (Game.rooms[roomName].terminal) {


				// assign miner room
				if (!Memory.assistedMine[roomName]) { Memory.assistedMine[roomName] = {} }

				if (!Memory.assistedMine[roomName].assignedSpawn || Game.time > Memory.assistedMine[roomName].asTs) {
					Memory.assistedMine[roomName].asTs = Game.time + 2477;
					Memory.assistedMine[roomName].assignedSpawns = getMyClosestRooms(roomName, 7, 1);
				}
				
				
				if (Game.rooms[roomName].terminal.store[RESOURCE_THORIUM] > 1000 && lowThoriumRoom) {
					let myRoomsToSendFrom = {}
					myRoomsToSendFrom[roomName] = {}
					sendResource(lowThoriumRoom, myRoomsToSendFrom, 2500, RESOURCE_THORIUM)
				} else {
					evacuateTerminalResources(Game.rooms[roomName].terminal, false);
				}
				
			}
		}
	}
}



global.setNextThoriumClaim = function() {
	let init = Game.cpu.getUsed();

	let bestScore = -99999;
	let bestRoom;

	for (let name in Memory.expansionTarget) {
		let expTarget = Memory.expansionTarget[name]
		let roomName = expTarget.roomName
		if (!roomName) { continue; }

		if (AVOID_SECTORS[getSectorV2(roomName)])

		if (!expTarget.thoriumScore) { continue; }
		if (expTarget.routeMin > 7 ) { continue; }
		if (Game.rooms[roomName] && Game.rooms[roomName].controller && Game.rooms[roomName].controller.my) { continue; }
		if (Memory.rooms[roomName] && Memory.rooms[roomName].player) { continue; }
		
		if (!withinMyTerritory(roomName) && !MY_SECTORS[getSectorV2(roomName)]) { continue; }

		let score = expTarget.sourceScore;
		score -= (expTarget.routeMin*15);
		score += expTarget.remotesScoreV3
		score += expTarget.baseLayout * 10;

		score += expTarget.thoriumScore;
		score -= expTarget.penalty || 0;

		let assistScore = -20

		let hasAssitedSpawn;
		for (let spawner in expTarget.assignedSpawns) {
			if (!isAssistedLevelingSpawn(spawner) && getRoomPRCL(spawner) >= 8) {
				hasAssitedSpawn = true;
				break;
			}
		}

		if (hasAssitedSpawn) {
			assistScore += 100;
		} else {
			assistScore -= 100;
		}

		

		score += assistScore;


		if (score > bestScore) {
			bestScore = score;
			bestRoom = roomName;
		}
		
	}

	if (bestRoom) {
		Memory.bestThoriumClaim = bestRoom;
	}

	let used = Game.cpu.getUsed() - init;
	log("next thorium claim " +bestRoom+ " used cpu " + used.toFixed(1))
	return bestRoom;
}

function symbolTransfers(myRooms){
	if (!Memory.symbolTradeTs || Game.time > Memory.symbolTradeTs) {
		Memory.symbolTradeTs = Game.time + 77;
		let request = {};
		let wantedAmount = 40000;
		for (let decoderRoom in Memory.scoreCollector){

			if (!Memory.scoreCollector[decoderRoom].assignedSpawns) { continue; }

			let type = Memory.scoreCollector[decoderRoom].type;
			if (!Memory.Minerals[type]) { continue; }
			
			for (let spawner in Memory.scoreCollector[decoderRoom].assignedSpawns){
				if (!Game.rooms[spawner] || !Game.rooms[spawner].terminal) {
					continue; 
				}
				let currentAmount = Game.rooms[spawner].store(type);
				
				if (request[type] === undefined) { request[type] = {}; }

				request[type][spawner] = {};	
				request[type][spawner].amount = Math.max(0, wantedAmount - currentAmount);	
				
			}
		}
		log(JSON.stringify(request))

		// Find donors
		for (let type in request) {
			let bestAmount = 1000;
			let bestDonor;
			for (let roomName in myRooms) {
				if (!Game.rooms[roomName].terminal || Game.rooms[roomName].terminal.__cooldown || !Game.rooms[roomName].terminal.store[type]) { continue; }
				let stored = Game.rooms[roomName].store(type);
				

				if (request[type][roomName]) { 
					stored -= wantedAmount * 1.5;
				}

				if (stored > bestAmount) {
					bestAmount = stored;
					bestDonor = roomName;
				}
			}

			if (bestDonor) {
				let bestReciever;
				wantedAmount = 0;
				for (let reciever in request[type]) {
					if (request[type][reciever].amount > wantedAmount) {
						wantedAmount = request[type][reciever].amount;
						bestReciever = reciever;
					}
				}
				if (!bestReciever) { continue; }

				let donorTerminal = Game.rooms[bestDonor].terminal;
				let sendAmount = 1000;
				let cost = Game.market.calcTransactionCost(sendAmount, bestReciever, bestDonor);								
				let affordableSend = Math.floor((cost / sendAmount) * donorTerminal.store[RESOURCE_ENERGY]);
				sendAmount = Math.min(5000, wantedAmount, donorTerminal.store[type], affordableSend);

				if (!sendAmount || sendAmount <= 0) { continue; }
				let result = donorTerminal.send(type, sendAmount, bestReciever);
				if (result === OK) {
				}
				log("SYMBOL " + type + " result " + result + " sent "+ sendAmount + " from " + bestDonor + " to " + bestReciever);
			}
		}
	}
}


function allowBuyCatalyst() {

	if (Memory.myRoomHighPRCL >= 8) { return true; }
	if (Game.market.credits > Memory.wantedCredits * 10) { return true; }

	for (let boostType in BOOST_LEVEL) {
		if (boostType === BUILD || boostType === REPAIR || boostType === HARVEST || boostType === CARRY || boostType === UPGRADE) { continue; }
		let boost = BOOST_LEVEL[boostType][1] // T2

		if (Memory.Minerals[boost] > 3000) {
			return true;
		}
	}
	return false;
}

function tradeOnMarket(myRooms) {
	

	if (Game.time % (TERMINAL_COOLDOWN * 5) === 0 && 
		Memory.Minerals &&
		!DISABLED_MARKET &&
		(Memory.Minerals.Sell || 
		Memory.Minerals.Buy)
	){

		let CREDITS_RESERVE_BOT_MODE = 0;
		let wantedAmountStored = 0;
		let creditsForSellOrder;
		if (BOT_MODE) {
			CREDITS_RESERVE_BOT_MODE = getMarketPrice(RESOURCE_CATALYST, true) * 25000;
			Memory.wantedCredits = CREDITS_RESERVE_BOT_MODE;
			creditsForSellOrder = (CREDITS_RESERVE_BOT_MODE/25000) * 10000 * MARKET_FEE;
			let labCount = Object.keys(Memory.Minerals.Labs).length;
			wantedAmountStored = Math.min(labCount * 25000, 100000);
		}

		let checkCreateOrder = true;
		// BUY MINERALS
		if (Game.market.credits >= MIN_CREDITS_BALANCE && Memory.Minerals.Buy) {	

			let MineralBuyBelow = BUY_MINERAL_BELOW * Math.max(Object.keys(Memory.Minerals.Labs).length, 1);

			for (let res in Memory.Minerals.Buy){

				

				if (BOT_MODE) {
					if (res === RESOURCE_CATALYST && !allowBuyCatalyst() ) { continue; }	// delay purchasing X

					checkCreateOrder = (Game.market.credits < CREDITS_RESERVE_BOT_MODE || 
									(Memory.Minerals[res] || 0) > 25000 ||
									!Memory.traderTick || 
									Game.time >= Memory.traderTick)
				}

				if (checkCreateOrder || !BOT_MODE) {
					let missingRatio = Memory.Minerals.Buy[res] / MineralBuyBelow
					if (missingRatio > 0.25) {
						checkCreateOrder = Math.random() < Math.min(0.75, missingRatio)
					} else if (BOT_MODE && Game.market.credits / CREDITS_RESERVE_BOT_MODE >= 5 ) {
						checkCreateOrder = Math.random() < 0.5
					}
				}

				if (Memory.Minerals.Buy[res] < 1000 ) { continue; }
				if (Memory.Minerals.mineralRecieve[res] === undefined) { continue; }
				if (res === RESOURCE_POWER) { continue; }

				log("buying " +Memory.Minerals.Buy[res] + " " + res + ", recieving rooms " + Object.keys(Memory.Minerals.mineralRecieve[res]).length + " check create order " + checkCreateOrder )
				buyFromMarket(res, Memory.Minerals.Buy[res], Memory.Minerals.mineralRecieve[res], checkCreateOrder);
				
			}
		}

		// SELL MINERALS
		for (let res in Memory.Minerals.Sell){
			if (Memory.Minerals.Sell[res] < 10000) { continue; }
			let stockToSell = Memory.Minerals.Sell[res];
			if (Memory.Minerals.mineralSell[res] === undefined) { continue; }
			if (res === RESOURCE_POWER) { 
				log("attempting to sell power !")
				continue; 
			}
			let bestOrder = null;
			let orders = getMarketBuyOrders(res);
			let bestPrice = 0;
			let trade = true;

			for (let i=0; i < orders.length; i++) {

				if (orders[i].amount < 100 ) { continue; }
				if (orders[i].remainingAmount < 100 ) { continue; }
				bestPrice = orders[i].price;

				if (BOT_MODE) {
					if (!roomIsHW(orders[i].roomName)) { continue; }

					stockToSell -= 25000;
					if (Game.market.credits > creditsForSellOrder && //can make sell order
						(marketMineralSensiblePrice(orders[i].price, res, ORDER_BUY) === false && 	// better to make order						
						Math.random() > ((stockToSell / wantedAmountStored) * 0.01) )	// if stock to sell is high, sell to order
					){
						trade = false;
						break;
					}
				} else {
					if (marketMineralSensiblePrice(orders[i].price, res, ORDER_BUY) === false && Game.market.credits > 100) { 
						trade = false;
						break;
					}
				}
		
				bestOrder = orders[i];
				break;
			}
			
			let bestRoom = null;
			let bestRange = Infinity;

			if (bestOrder && trade) {
				
				for (let room in Memory.Minerals.mineralSell[res]){
					let terminal = Game.rooms[room].terminal;
					if (!terminal || terminal.__cooldown) { continue; }
					
					if (BASE_MINERALS_OBJECT[res]) {
						if (!terminal.store[res] || terminal.store[res] < 1000) { continue; }
						let availableToSell = Game.rooms[room].store(res) - MINERAL_MIN_AMOUNT_STORED;						
						if (availableToSell < 1000) { continue; }
					} else {
						if (!terminal.store[res] || terminal.store[res] < 200) { continue; }
					}
					
					let roomRange = getRoomLinearDistance(bestOrder.roomName, room);
					if (roomRange < bestRange){
						bestRoom = room;
						bestRange = roomRange;
					}
				}
			}
			
			if (bestRoom && bestOrder) {
				let availableToSell = 0;
				if (BASE_MINERALS_OBJECT[res]) {
					availableToSell = Game.rooms[bestRoom].store(res) - MINERAL_MIN_AMOUNT_STORED;
				} else {
					availableToSell = Game.rooms[bestRoom].store(res)
				}

				let terminalToTrade = Game.rooms[bestRoom].terminal;
				let amountToSell = 1000;
				let cost = Game.market.calcTransactionCost(amountToSell, bestRoom, bestOrder.roomName);
				let maxAffordableSell = Math.floor(terminalToTrade.store[RESOURCE_ENERGY] / (cost/amountToSell))
				let currentMaxSell = Math.min(bestOrder.amount, availableToSell, maxAffordableSell, terminalToTrade.store[res])

				if (currentMaxSell <= 0) { continue; }
				if (currentMaxSell < TERMINAL_MIN_SEND && BASE_MINERALS_OBJECT[res]) { continue; }
				let result = Game.market.deal(bestOrder.id, currentMaxSell, bestRoom);
				if (result === OK) {
					Memory.Minerals.Sell[res] -= maxAffordableSell;
					terminalToTrade.__cooldown = TERMINAL_COOLDOWN;
					console.log(bestRoom + " " + res + " cross room trader selling " +currentMaxSell + ' units, completed successfully to ' +bestOrder.roomName+ ". order had "+bestOrder.amount + " units for " +bestOrder.price );  
				//	return 1;
				} else {
					console.log(bestRoom + " " + res + " cross room trader selling " +currentMaxSell + ' units, failed to ' +bestOrder.roomName+ ". order had "+bestOrder.amount + " units for " +bestOrder.price+ " code "+result);
				}
			} else if (betterToCreateOwnOrder(bestPrice, res, ORDER_BUY) ) {
			//	log("want to create sell order for " + res)	
				let tradeAmount = Memory.Minerals.Sell[res]
				if (BOT_MODE) {
					tradeAmount = Math.min(10000, Memory.Minerals.Sell[res]);
				}
				checkCreateMarketOrder(res, ORDER_SELL, Memory.Minerals.mineralSell[res], tradeAmount);
			}
		}

		if (global.sellCommoditiesTimer === undefined) { global.sellCommoditiesTimer = 10; }
		if (Game.time % (TERMINAL_COOLDOWN * global.sellCommoditiesTimer) === 0) {
			if (sellCommoditiesWithGoodDeals(myRooms) > 0) {
				global.sellCommoditiesTimer = 5;
			} else {
				global.sellCommoditiesTimer = 100;
			}
		}

		if (Game.time % (TERMINAL_COOLDOWN * 5) === 0) {

			// BUY POWER!
			if (Memory.Minerals && Memory.Minerals.mineralRecieve && Memory.Minerals.mineralRecieve[RESOURCE_POWER] && Game.market.credits > 150000000) {				
				buyFromMarket(RESOURCE_POWER, 10000, Memory.Minerals.mineralRecieve[RESOURCE_POWER]);
			}

			// BUY Energy!			
			if (((Memory.energyShare && Object.keys(Memory.energyShare.recieve).length > 0) || Memory.avgEnergy < 350000) && Game.market.credits > 25000000) {

				log("wants to buy energy!!");
				let roomsToBuy = _.cloneDeep(Memory.energyShare.recieve);

				for (let roomName in roomsToBuy) {
					if (isGCLPraiseRoomStandby(roomName) && getRoomRCL(roomName) < 6) {
						delete roomsToBuy[roomName];
					}
				}				

				let wantedBuyers = 10
				if (Object.keys(Memory.energyShare.recieve).length < wantedBuyers) {
					roomsToBuy = myRooms;
				}				

				let maxOrders = Math.min(wantedBuyers, Object.keys(roomsToBuy).length);

				buyFromMarket(RESOURCE_ENERGY, 50000, roomsToBuy, true, maxOrders);
			}
		}		
	}
}

function defendMyRooms(myRooms) {
	let myRoomsAttacked = {}
	for (let roomName in myRooms){
		let roomData = Memory.rooms[roomName]
		if ((roomData.hostiles && roomData.isPlayer) || 
			roomData.preSpawnDefender || 
			(!SEASONAL_COMMS && roomIsSafeModeCd(roomName) > 1000 && !isGCLPraiseRoomStandby(roomName)) || 
			(!SEASONAL_COMMS && getRoomPRCL(roomName) < 3 && Memory.myRoomHighPRCL >= 5 && !isGCLPraiseRoomStandby(roomName))
		) {
			myRoomsAttacked[roomName] = roomData
		}
	}

	Memory.roomAttacked = {};
	for (let roomName in myRoomsAttacked){
		
		// refill energy?
		if (Game.time % 23 === 0 && Game.rooms[roomName].store(RESOURCE_ENERGY) < 15000 && Game.rooms[roomName].terminal) {
			sendResource(roomName, myRooms, 5000, RESOURCE_ENERGY)
		}

		if (roomIsSafeModed(roomName) > 500) { continue; }

		if (Memory.roomAttacked[roomName] ===  undefined) {

			Memory.roomAttacked[roomName] = {}; 
			Memory.roomAttacked[roomName].startTick = Game.time;
			Memory.roomAttacked[roomName].isPlayer = myRoomsAttacked[roomName].isPlayer || 'no player';
			
			if (myRoomsAttacked[roomName].isPlayer) {
				log(roomName + " under attack by player!" + myRoomsAttacked[roomName].isPlayer + " with force " + myRoomsAttacked[roomName].hostiles.power.strength);
			} else {
			//	log(roomName + " marked as under attack, prespawn!" + myRoomsAttacked[room].preSpawnDefender);
			}

			// Send in quads
			if (myRoomsAttacked[roomName].sieged && 
				getRoomPRCL(roomName) > 4 && 
				Memory.raids && Memory.raids.activeTargets && Memory.raids.activeTargets[roomName] === undefined &&
				((myRoomsAttacked[roomName].hostiles && myRoomsAttacked[roomName].hostiles.powerCreeps) ||
				(Game.time - myRoomsAttacked[roomName].sieged.startTick > 500 ||
				myRoomsAttacked[roomName].hostiles && myRoomsAttacked[roomName].hostiles.power.strength > 15000))
			) {
				addRaid(roomName, {raidType: RAID_TYPE_PHALANX});
			}

			// Send in duos
			if (getRoomPRCL(roomName) < Memory.myRoomHighPRCL || (myRoomsAttacked[roomName].hostiles && myRoomsAttacked[roomName].hostiles.powerCreeps)){
				if (Memory.myRoomHighPRCL >= 7 &&
					getRoomPRCL(roomName) > 1 && 
					Memory.raids && Memory.raids.activeTargets && Memory.raids.activeTargets[roomName] === undefined &&
					myRoomsAttacked[roomName].sieged && 
					Game.time - myRoomsAttacked[roomName].sieged.startTick > 500 && 
					((myRoomsAttacked[roomName].hostiles && myRoomsAttacked[roomName].hostiles.power.strength > 1500) || 
					(myRoomsAttacked[roomName].hostiles && myRoomsAttacked[roomName].hostiles.powerCreeps))
				){
					if (!Memory.combatDeconstruct[roomName]) {
						Memory.orderWreckers[roomName] = {};
					}
				}
				Memory.roomAttacked[roomName].assignedSpawn = getMyClosestRooms(roomName, Math.min(Memory.myRoomHighPRCL, 7, 5));
			}
		}
		
		let minimumTowerDmg = Game.rooms[roomName].findByType(STRUCTURE_TOWER).length * 150;

		if (BOT_MODE && Memory.rooms[roomName].hostiles &&
			((Memory.rooms[roomName].hostiles.power.defensive > 150 &&
			Memory.rooms[roomName].hostiles.power.defensive < 2000 &&
			getRoomPRCL(roomName) < 6) ||
			Memory.rooms[roomName].hostiles.power.healPower <= minimumTowerDmg * 1.3)
			) {
			orderRangedAttackers(roomName, 75, "myRoomsAttacked" );
		}


		if (BOT_MODE && !SEASONAL_SYMBOLS && roomIsSafeModeCd(roomName) > 1000) {
			Memory.orderWreckers[roomName] = {};
			Memory.orderWreckers[roomName].requiredDeconstructors = 1;
		}
			

		Memory.roomAttacked[roomName].timeout = Game.time + 50;
	}		

	// DELETE ATTACKED AFTER TIMEOUT
	if (Memory.roomAttacked) {
		for (let room in Memory.roomAttacked){
			if (Memory.roomAttacked[room].timeout < Game.time && !roomIsSafeModeCd(room)) {
				console.log(room + " no longer under attack " );
				delete Memory.roomAttacked[room];
				delete Memory.attackTarget[room];
				
				let rangedAttackers = _.filter(getCreeps('rangedAttacker'), (creep) => creep._memory[C.ROOM_TARGET] == room);
				
				for (let _room in Memory.attackTarget) {
					let timeOut = Memory.attackTarget[_room].ts || 0;
					if (Game.time > timeOut) { continue; }
					rangedAttackers = reassignAttackers(_room, rangedAttackers);
				}

			}
		}
	}
}



function cleanUpRemotes() {
	if (Game.time % 181 === 0 && Game.cpu.bucket > 5000) {
			
		let maxActiveDeconstructors = 2
		if (BOT_MODE) { maxActiveDeconstructors = 10; }
		let deconstructors = getCreeps('deconstructor');
		if (deconstructors.length < maxActiveDeconstructors) {
			for (let roomName in Memory.rooms) {
				let roomMemory = Memory.rooms[roomName];
				
				if ((roomIsSk(roomName) || roomIsCenter(roomName)) && !roomHasDeadCore(roomName)) { continue; }
				if (roomMemory[R.MY_MINING_OUTPOST] !== 1 && !roomHasDeadCore(roomName)) { continue; }
				if (roomMemory.hostiles || !Game.rooms[roomName]) { continue; }
				if (roomMemory.cdsTs && Game.time < roomMemory.cdsTs) { continue; }

				if (needsCleanUp(roomName) && !Memory.combatDeconstruct[roomName]) {
					orderCleanUp(roomName);
				} else {
					console.log("no cleanup crew needed! " + roomName);
					if (!BOT_MODE){
						roomMemory.cdsTs = Game.time + 50000;
					} else {
						roomMemory.cdsTs = Game.time + 3000;
					}
				}
				break;
			}
		}
	}
}

function addFlagTargets(myRooms){
	// FIND RANGED ATTACK FLAGS
	let temp = {};
	let flags = _.filter(Object.keys(Game.flags), flag => ((Game.flags[flag].color == COLOR_PURPLE)));
	for (let idx in flags){
		let targetRoom = Game.flags[flags[idx]].pos.roomName;
		let flag = Game.flags[flags[idx]]				

		// ORDER ATTACKER
		orderRangedAttackers(targetRoom, 100, "flags");
		if (Memory.attackTarget[targetRoom] && !Memory.attackTarget[targetRoom].idlePos ) {
			Memory.attackTarget[targetRoom].idlePos = posSave(Game.flags[flags[idx]].pos);
		}

		if (flag.secondaryColor === COLOR_WHITE && (Memory.rooms[targetRoom] && !Memory.rooms[targetRoom].hostileRoom && !Memory.rooms[targetRoom].enemyRemote)) {
			flag.remove();
			delete Memory.attackTarget[targetRoom];
			continue;
		}
	}

	// FIND ATTACK CONTROLLER FLAGS
	temp = {};
	flags = _.filter(Object.keys(Game.flags), function(flag) { return(Game.flags[flag].color == COLOR_WHITE)});
	for (let idx in flags){
		let flag = Game.flags[flags[idx]]
		let targetRoom = flag.pos.roomName;
		if (flag.secondaryColor === COLOR_WHITE) {
			
			requestRoomVision(targetRoom);
			// ORDER ATTACK CLAIMER 
			if (Memory.controllerAttack[targetRoom] === undefined) { 
				Memory.controllerAttack[targetRoom] = {};
			}

			if (Game.rooms[targetRoom] && (!Game.rooms[targetRoom].controller || !Game.rooms[targetRoom].controller.owner)) {
				flag.remove();
			}

		} else if (flag.secondaryColor === COLOR_ORANGE) {
			// CLAIM EXPLODE
			if (Memory.claimExplode[targetRoom] === undefined) {						
				let roomsInRange = getMyClosestRooms(targetRoom, 4, 0);
				Memory.claimExplode[targetRoom] = {};
				Memory.claimExplode[targetRoom].assignedSpawn = roomsInRange;
			}
			
			flag.remove();
		} else if (flag.secondaryColor === COLOR_RED) {
			// CLAIM ROOM
			expansionTargets[targetRoom] = {};
			if (Game.rooms[targetRoom] && Game.rooms[targetRoom].controller && Game.rooms[targetRoom].controller.my) {
				flag.remove();
			}
		}
	}

	for (let targetRoom in Memory.controllerAttack){

		temp[targetRoom] = {};

		if (getRoomRCL(targetRoom) <= 0 || Memory.rooms[targetRoom].myRoom) { 
			delete Memory.controllerAttack[targetRoom];
			continue;
		}

		if (Memory.controllerAttack[targetRoom].assignedRooms === undefined || Game.time > Memory.controllerAttack[targetRoom].ts) {

			Memory.controllerAttack[targetRoom].ts = Game.time + 777;

			let roomsInRange = getMyClosestRooms(targetRoom, 4, 2);
			Memory.controllerAttack[targetRoom].assignedRooms = {};
			Memory.controllerAttack[targetRoom].assignedRooms = roomsInRange;

			requestMemSave();

			let targetController;
			if (Memory.rooms[targetRoom] && Memory.rooms[targetRoom].controller) {
				targetController = posDecompress(Memory.rooms[targetRoom].controller.pos, targetRoom);
			}
			
			for (let spawner in Memory.controllerAttack[targetRoom].assignedRooms) {
				if (getRoomStatus(spawner) !== getRoomStatus(targetRoom)) {
					delete Memory.controllerAttack[targetRoom].assignedRooms[spawner];
					continue;
				}
				
				if (Memory.controllerAttack[targetRoom].assignedRooms[spawner].dist > 8) {

					let spawn = Game.rooms[spawner].findByType(STRUCTURE_SPAWN)[0];
					if (!spawn) {
						continue;
					}

					let pathToBank = findTravelPath(spawn, targetController,
						{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:50000});

					if (pathToBank.incomplete) {
						Memory.controllerAttack[targetRoom].assignedRooms[spawner].noPath = true;
						Memory.controllerAttack[targetRoom].assignedRooms[spawner].cost = pathToBank.cost;
						Memory.controllerAttack[targetRoom].assignedRooms[spawner].pathLength = pathToBank.path.length;

						continue;
					}

					Memory.controllerAttack[targetRoom].assignedRooms[spawner].pathCost = pathToBank.cost;

					if (pathToBank.cost >= CREEP_CLAIM_LIFE_TIME) {

						Memory.controllerAttack[targetRoom].assignedRooms[spawner].longPath = true;

						pathToBank = findTravelPath(spawn, targetController,
							{range: 1, ignoreRoads: true, offRoad: true, ignoreCreeps: true, maxOps:50000});

						Memory.controllerAttack[targetRoom].assignedRooms[spawner].swampPathCost = pathToBank.cost;	
						if (Memory.controllerAttack[targetRoom].assignedRooms[spawner].swampPathCost >= CREEP_CLAIM_LIFE_TIME) {
						//	continue;
						}
					}
				}
			}
		}
	}

	// DELETE ATTACK CONTROLLER
	for (let room in Memory.controllerAttack){
		if (!temp[room]) {
			delete Memory.controllerAttack[room];
		}
	}

	// FIND COMBAT FLAGS
	temp = {};
	if (Memory.combat === undefined) { Memory.combat = {}; }
	let combatFlags = _.filter(Object.keys(Game.flags), function(flag) { return(Game.flags[flag].color == COLOR_RED)});
	for (let idx in combatFlags){
		let roomName = Game.flags[combatFlags[idx]].pos.roomName;
		temp[roomName] = {};
		if (Memory.combat[roomName] === undefined) { Memory.combat[roomName] = {}; }
	}


	// ASSIGN COMBAT
	// DELETE COMBAT
	for (let room in Memory.combat){
		if (!temp[room]) {
			delete Memory.combat[room];
			console.log("deleting combat flag ");
			continue;
		}
		let shortestDist = 25;
		let bestRoom = '';
		if (!Memory.combat[room].assignedRoom) {
			for (let roomName in myRooms){

				if (Game.rooms[roomName].controller.level < CONTROLLER_MAX_LEVEL) { continue; }
				if (!Game.rooms[roomName].boostsAvailable( [T3_HEAL, T3_TOUGH, T3_MOVE, T3_RANGED_ATTACK] ) ) { continue; }
				if (getRoomLinearDistance(roomName, room) > 15) { continue; }
				let dist = getRouteDistanceOnly(roomName, room);
				if (dist < shortestDist) {
					shortestDist = dist;
					bestRoom = roomName;
				}
			}					
			if (bestRoom) {
				console.log(" assigning room " + bestRoom +" at distance "+ shortestDist + " for combat mission");
				Memory.combat[room].assignedRoom = bestRoom;
			}
		}
	}

	// FIND DEFENCE FLAGS
	/*
	temp = {};
	let defenceFlags = _.filter(Object.keys(Game.flags), function(flag) { return(Game.flags[flag].color == COLOR_GREEN)});
	for (let idx in defenceFlags){
		temp[Game.flags[defenceFlags[idx]].pos.roomName] = {};

		if (Memory.attacked === undefined) { Memory.attacked = {}; }
		if (Memory.attacked[Game.flags[defenceFlags[idx]].pos.roomName] === undefined) { Memory.attacked[Game.flags[defenceFlags[idx]].pos.roomName] = {}; }
	}*/

	let pitaFlags = _.filter(Object.keys(Game.flags), function(flag) { return(Game.flags[flag].color == COLOR_CYAN)});
	for (let idx in pitaFlags){
		let flag = Game.flags[pitaFlags[idx]];
		let pitaFlagRoom = flag.pos.roomName;
		if (!Memory.rooms[pitaFlagRoom].pitaTs || Game.time > Memory.rooms[pitaFlagRoom].pitaTs) { 
			if (!Memory.pita[pitaFlagRoom]) {
				orderPita(pitaFlagRoom);
			}
		}
	}

	// FIND COMBAT DECONSTRUCT FLAGS
	temp = {};
	let deconstructFlags = _.filter(Object.keys(Game.flags), function(flag) { return(Game.flags[flag].color == COLOR_ORANGE)});
	for (let idx in deconstructFlags){
		let flag = Game.flags[deconstructFlags[idx]];
		let deconstructFlagRoom = Game.flags[deconstructFlags[idx]].pos.roomName;
		temp[deconstructFlagRoom] = {};	

		requestRoomVision(deconstructFlagRoom);

		if (roomIsSafeModed(deconstructFlagRoom) > 300) { continue; }
		
		temp[deconstructFlagRoom] = {};

		if (flag.memory.spotted === undefined) {
			flag.memory.spotted = Game.time;
			if (Memory.combatDeconstruct[deconstructFlagRoom] === undefined) { 
				Memory.combatDeconstruct[deconstructFlagRoom] = {}; 
				
				if (Game.flags[deconstructFlags[idx]].secondaryColor == COLOR_WHITE){
				
					Memory.combatDeconstruct[deconstructFlagRoom].requiredDeconstructors = 1;

					// Destroy seasonal walls
					if (getAverageCreepDmg(deconstructFlagRoom) > 10 && Memory.rooms[deconstructFlagRoom].decRetreat) {
						Memory.combatDeconstruct[deconstructFlagRoom].dismantler = true;
					} else {
						Memory.combatDeconstruct[deconstructFlagRoom].civilian = 1;
					}

				} else if (Game.flags[deconstructFlags[idx]].secondaryColor == COLOR_GREY){
					Memory.combatDeconstruct[deconstructFlagRoom].despawn = 1;
					Memory.combatDeconstruct[deconstructFlagRoom].requiredDeconstructors = 1;
				} else if (Game.flags[deconstructFlags[idx]].secondaryColor == COLOR_ORANGE){						
					Memory.combatDeconstruct[deconstructFlagRoom].dismantler = true;
					Memory.combatDeconstruct[deconstructFlagRoom].requiredDeconstructors = 2;
				}
			}
		} else {

			let timeSinceLastRaid = Game.time - flag.memory.spotted
			if (timeSinceLastRaid > 1500 && !roomIsSafeModed(flag.pos.roomName)) {

				delete flag.memory.spotted;
				if (SEASONAL_SYMBOLS) {
					let avgDmg = getAverageCreepDmg(deconstructFlagRoom);

					if ((avgDmg > 5 && Memory.combatDeconstruct[deconstructFlagRoom].civilian) ||
						(avgDmg < 5 && Memory.combatDeconstruct[deconstructFlagRoom].dismantler)
					){
						delete Memory.combatDeconstruct[deconstructFlagRoom];
					}
				}

				if (!Game.rooms[deconstructFlagRoom] || SEASONAL_SYMBOLS) { continue; }

				// Remove Flag
				let structure = Game.flags[deconstructFlags[idx]].pos.lookFor(LOOK_STRUCTURES)	;			
				if (structure.length == 0) {
					Game.flags[deconstructFlags[idx]].remove();
				}
			}					
		}
	}

	// ADD FROM REQUESTED WRECKERS
	for (let targetRoom in Memory.orderWreckers) {
		temp[targetRoom] = {};	
		if (Memory.combatDeconstruct[targetRoom] === undefined) { 
			Memory.combatDeconstruct[targetRoom] = {}; 
		}

		Memory.combatDeconstruct[targetRoom].civilian = Memory.orderWreckers[targetRoom].civilian;
		Memory.combatDeconstruct[targetRoom].despawn = Memory.orderWreckers[targetRoom].despawn;
		Memory.combatDeconstruct[targetRoom].requiredDeconstructors = Memory.orderWreckers[targetRoom].requiredDeconstructors || 1;			
		Memory.combatDeconstruct[targetRoom].boostTier = Memory.orderWreckers[targetRoom].boostTier;		
		

		if (Memory.orderWreckers[targetRoom].ts === undefined) {
			Memory.orderWreckers[targetRoom].ts = Game.time + 1500;
		}
		
		if (Game.time > Memory.orderWreckers[targetRoom].ts) {
			delete Memory.combatDeconstruct[targetRoom];
			delete Memory.orderWreckers[targetRoom];
		}

	}
	
	// ASSIGN COMBAT DECONSTRUCT
	// DELETE COMBAT DECONSTRUCT
	for (let room in Memory.combatDeconstruct){
		if (!temp[room]) {
			delete Memory.combatDeconstruct[room];
			continue;
		}
		let shortestDist = 25;
	//	let bestRoom;
		let requiredSpawnerPRCL = Math.min(Memory.myRoomHighPRCL, 7);

		let requiredEnergy = ECONOMY_DEVELOPING
		if (Memory.combatDeconstruct[room].civilian) {
			requiredEnergy = ECONOMY_DEVELOPING
		}
		
		if (!Memory.combatDeconstruct[room].assignedRooms) {
			requestRoomVision(room);
			Memory.combatDeconstruct[room].attId = createAttackId();
			console.log("assigned combatDeconstruct in " +room)

			if (Memory.orderWreckers[room] && Memory.orderWreckers[room].assignedRooms) {
				Memory.combatDeconstruct[room].assignedRooms = Memory.orderWreckers[room].assignedRooms;
			} else {
				let roomSpread = 4;
				if (SEASONAL_SYMBOLS && roomIsHW(room)) { roomSpread = 0;}
				Memory.combatDeconstruct[room].assignedRooms = getMyClosestRooms(room, requiredSpawnerPRCL, roomSpread, shortestDist);
				for (let spawner in Memory.combatDeconstruct[room].assignedRooms) {
					if (Game.rooms[spawner].energyStatus() < requiredEnergy) {
					//	delete Memory.combatDeconstruct[room].assignedRooms[spawner];
						console.log("assigned combatDeconstruct spawner too low energy " +spawner)
					}

					if (PUSH_RCL_TARGETS[spawner] && Object.keys(Memory.combatDeconstruct[room].assignedRooms).length > 1) {
						delete Memory.combatDeconstruct[room].assignedRooms[spawner];
					}
				}
			}
			
			let assignedSpawners = Object.keys(Memory.combatDeconstruct[room].assignedRooms).length
			console.log("assigned spawners for " + room + " : " +assignedSpawners)
			if (assignedSpawners === 0) {
				delete Memory.combatDeconstruct[room];

				continue;
			}
				
			sortCombatDeconstructMissions();
		//	console.log("assigned combatDeconstruct in " +deconstructFlagRoom)
			if (!Memory.combatDeconstruct[room].civilian) {
				for (let assignedRoom in Memory.combatDeconstruct[room].assignedRooms) {
					orderCombatBoost(assignedRoom);
				}
			}
			requestMemSave();
		}
	}
}

function assignNextClaim(myRooms) {
	
	for (let target in expansionTargets) {
			
		if (BOT_MODE) {
			if (Game.gcl.level <= Object.keys(myRooms).length) { break; }
			if (Memory.restrictClaims) { break; }
		//	let cpuLevel = (Game.cpu.limit-20) / 10;
		}

		if (SEASONAL_COMMS && Game.gcl.level >= 10) {
			HALT_GCL_PRAISE = true;
		}
		
		let mylowLevelRooms = getMyRoomsBelowPrcl(3)

		for (let idx in mylowLevelRooms) {
			let claimed = mylowLevelRooms[idx].roomName;
			Memory.expansionTargetTimeout[claimed] = {};
			Memory.expansionTargetTimeout[claimed].penalty = 100;
			Memory.expansionTargetTimeout[claimed].timeout = Game.time + 75000 + Math.floor(Math.random() * 15000);
		}
		
		if (BOT_MODE && Object.keys(mylowLevelRooms).length > 2 ) { break; }

		if (Memory.expansionTargetTimeout[target] === undefined ){
			Memory.expansionTargetTimeout[target] = {};
			Memory.expansionTargetTimeout[target].ts = Game.time + 2500  + Math.floor(Math.random() * 500);
			if (checkForInvaderCore(target) ) {
				Memory.expansionTargetTimeout[target].ts += 2500;
			}
			Memory.expansionTargetTimeout[target].timeout = Game.time + 75000 + Math.floor(Math.random() * 15000);
			requestMemSave();
		} else if (Memory.expansionTargetTimeout[target].ts < Game.time) {
			Memory.expansionTargetTimeout[target].penalty = 100;
		}

		if (Memory.rooms[target] && (Memory.rooms[target].hostiles || Memory.rooms[target].hostileRoom || getRoomRCL(target) > 0)) { 
			requestRoomVision(target);
		//	continue;
		}

		

		if (Memory.expansionTarget[NEXT_EXPANSION].assignedClaimer === undefined || 
			Memory.expansionTarget[NEXT_EXPANSION].roomName != target
		) {
			let myClosestRoom;
			let closestDistance = 19;
			Memory.expansionTarget[NEXT_EXPANSION].roomName = target

			let shard =  expansionTargets[target].shard;
			Memory.expansionTarget[NEXT_EXPANSION].shard = shard;
			
			let myRoomsClaimer = getMyRoomsMinPrcl(4);
			for (let myRoomName in myRoomsClaimer) {
				if (myRoomName === target) { continue }				
			//	if (getRoomLinearDistance(myRooms[idx].roomName, target) > 15) { continue; }
				let routeLength = getRouteDistanceOnly(myRoomName, target, {restrictDistance: 19, shard: shard });
				
				if (routeLength < closestDistance){
					closestDistance = routeLength;
					myClosestRoom = myRoomName;
				}
			}
			Memory.expansionTarget[NEXT_EXPANSION].assignedClaimer = myClosestRoom;
			
			if (BOT_MODE && !SEASONAL_COMMS && Memory.myRoomHighPRCL < CONTROLLER_MAX_LEVEL) {
				orderAntiScouts(target, 2500, "newRoom");
			}
		}
	}

}

function setNextClaimTarget(){
	
	if (!BOT_MODE) {	// Manual assignment
		Memory.expansionTarget = {};
		Memory.expansionTarget[NEXT_EXPANSION] = {};
	} else {

		global.expansionTargets = {};

		// Overridden
		let flagged = false;
		let flags = _.filter(Object.keys(Game.flags), function(flag) { return(Game.flags[flag].color == COLOR_WHITE)});
		for (let idx in flags){
			let flag = Game.flags[flags[idx]]
			let targetRoom = flag.pos.roomName;
			if (flag.secondaryColor === COLOR_RED) {
				flagged = true;

				global.expansionTargets = {};
				expansionTargets[targetRoom] = {};
				
				if (Memory.expansionTarget[NEXT_EXPANSION] === undefined) { Memory.expansionTarget[NEXT_EXPANSION] = {}; }

				if (Memory.expansionTarget[NEXT_EXPANSION].roomName !== targetRoom) {
					Memory.expansionTarget[NEXT_EXPANSION] = {};
					Memory.expansionTarget[NEXT_EXPANSION].roomName = targetRoom;
				}
				
				if (Game.rooms[targetRoom] && Game.rooms[targetRoom].controller && Game.rooms[targetRoom].controller.my) {
					flag.remove();
				}
			}
		}

		if (!flagged) {
			flags = _.filter(Object.keys(Game.flags), function(flag) { return(Game.flags[flag].color == COLOR_GREEN)});
			for (let idx in flags){
				let flag = Game.flags[flags[idx]]
				
				if (flag.secondaryColor === COLOR_WHITE) {

					let targetRoom = flag.name;

					if (Game.rooms[targetRoom] && Game.rooms[targetRoom].controller && Game.rooms[targetRoom].controller.my) {
						continue; 
					}

					flagged = true;

					global.expansionTargets = {};
					expansionTargets[targetRoom] = {};

					if (Memory.expansionTarget[NEXT_EXPANSION] === undefined) { Memory.expansionTarget[NEXT_EXPANSION] = {}; }

					if (Memory.expansionTarget[NEXT_EXPANSION].roomName !== targetRoom) {
						Memory.expansionTarget[NEXT_EXPANSION] = {};
						Memory.expansionTarget[NEXT_EXPANSION].roomName = targetRoom;
					}
					
				}
			}
		}




		
		if (!flagged && Memory.expansionTarget && Memory.expansionTarget[NEXT_EXPANSION] && Memory.expansionTarget[NEXT_EXPANSION].roomName) {
			let targetRoom = Memory.expansionTarget[NEXT_EXPANSION].roomName;
			global.expansionTargets[targetRoom] = {};				
		}			
	}
}

function createRoomPlansForClaimTargets() {
	
	if (BOT_MODE && 
		Memory.expansionTarget.baseCalc &&
		Memory.expansionTarget.baseCalc.evalRoom
	){
		let baseToCalc = Memory.expansionTarget.baseCalc.evalRoom;
		requestMemorySegment(baseToCalc);

		// Timed out
		if (Game.time > (Memory.expansionTarget.baseCalc.startTick + 3000)) {	
			baseToCalc = Memory.expansionTarget.baseCalc.evalRoom;
			
			// no vision?
			Memory.expansionTarget.baseCalc[baseToCalc] = {};
			Memory.expansionTarget.baseCalc[baseToCalc].timeOut = Game.time + 20000;
			Memory.expansionTarget.baseCalc[baseToCalc].roomScore = -10;
			
			delete Memory.expansionTarget.baseCalc.evalRoom;
			delete Memory.expansionTarget.baseCalc.startTick;

			if (accessMemorySegment(baseToCalc) ) {
				let clearSegment = {};
				saveMemorySegment(baseToCalc, clearSegment);
			}
		}

	//	requestRoomVision(baseToCalc);
		if (Memory.rooms[baseToCalc] && Game.cpu.bucket > 1000){
			console.log("calcing base for expansion target " + baseToCalc)

			Memory.expansionTarget.baseCalc.calcTicks++;	
			global.aiRoomPlanner = require('ai.roomPlanner');

			let failed 
			try {				
				aiRoomPlanner.createRoomLayout(baseToCalc, baseToCalc);
			} catch (err){
				let msg = 'Error running aiRoomPlanner on '+ baseToCalc+' from aiCrossRoomHandler error: ' +err.name + err.stack;
				Game.notify(msg);
				console.log(msg);
				failed = true;
			}
					
			let segment;
			if (Memory.rooms[baseToCalc].blueprintComplete && accessMemorySegment(baseToCalc)) {
				segment = getMemorySegment(baseToCalc);
				Memory.expansionTarget.baseCalc[baseToCalc] = {};

				Memory.expansionTarget.baseCalc[baseToCalc].roomScore = segment.roomScore;	
				if (segment.invalidBase) {
					Memory.expansionTarget.baseCalc[baseToCalc].roomScore -= 500;
				}
				Memory.expansionTarget.baseCalc[baseToCalc].buildPosCenter = segment.buildPosCenter;

				delete Memory.expansionTarget.baseCalc.evalRoom;
				delete Memory.expansionTarget.baseCalc.startTick;

				checkAndClearSegments();
			} else {
				
				if (accessMemorySegment(baseToCalc) ) {
					segment = getMemorySegment(baseToCalc);
				}
				if (failed || (segment && segment.createTicks > 150 && !Memory.rooms[baseToCalc].blueprintComplete)){ 
					// tried, but could not create base
					Memory.expansionTarget.baseCalc[baseToCalc] = {};
					Memory.expansionTarget.baseCalc[baseToCalc].failed = 1;
					Memory.expansionTarget.baseCalc[baseToCalc].roomScore = -1000;
					console.log("failed to create layout for " + Memory.expansionTarget.baseCalc.evalRoom)

					delete Memory.expansionTarget.baseCalc.evalRoom;
					delete Memory.expansionTarget.baseCalc.startTick;
					checkAndClearSegments();
				}
			}
		}

		
	}
}

function findAndRateExpansions(myRooms){
	
	let targets = {}
	for (let roomName in Memory.rooms) {
		let roomData = Memory.rooms[roomName]
		if (!roomData.sources) { continue; }
		if (roomData.myRoom) { continue; }
		if (!roomData.controller) { continue; }
		targets[roomName] = roomData;
	}

	let loopCounter = "loopCounter"
	if (Memory.expansionTarget === undefined) {Memory.expansionTarget = {} }
	if (Memory.expansionTarget[loopCounter] === undefined) {Memory.expansionTarget[loopCounter] = {} }
	if (Memory.expansionTarget[loopCounter].cnt === undefined) {Memory.expansionTarget[loopCounter].cnt = 0 }
	if (Memory.expansionTarget.baseCalc === undefined) {Memory.expansionTarget.baseCalc = {} }

	let keys = Object.keys(targets);
	if (Memory.expansionTarget[loopCounter].cnt >= keys.length-1) {
		Memory.expansionTarget[loopCounter].cnt = 0;				
	}
	
	let init = Game.cpu.getUsed();
	if (keys.length > 0) {
		
		Memory.expansionTarget[loopCounter].total = keys.length;
		let roomName = keys[Memory.expansionTarget[loopCounter].cnt];

	//	console.log("count: " +Memory.expansionTarget[loopCounter].cnt +"targets: "+targets.length + " room" +roomName)
		let sourceCache = {}
		if (Memory.expansionTarget[roomName] && Memory.expansionTarget[roomName].sourceCache) {
			sourceCache = _.cloneDeep(Memory.expansionTarget[roomName].sourceCache);
		}

		delete Memory.expansionTarget[roomName];

		if (Memory.expansionTarget[roomName] === undefined) {
			Memory.expansionTarget[roomName] = {};
			Memory.expansionTarget[roomName].roomName = roomName;
			Memory.expansionTarget[roomName].sources = targets[roomName].sources
			Memory.expansionTarget[roomName].ts = Game.time + 50000;

						
			let routeMin = 99;
			let linearMinDistance = 99;

			let requiredRcl = Math.min(7, Memory.myRoomHighPRCL)
			
			for (let myRoomName in myRooms) {

				if (Memory.rooms[myRoomName].mineOnly) { continue; }
				if (getRoomPRCL(myRoomName) < requiredRcl) { continue; }

				let linearDist = getRoomLinearDistance(myRoomName, Memory.expansionTarget[roomName].roomName);
				if (linearDist < linearMinDistance) {
					linearMinDistance = linearDist;
				}

				if (linearDist > 15) { continue; }

				let route = getRouteDistanceOnly(myRoomName, Memory.expansionTarget[roomName].roomName)

				if (route < routeMin) {
					routeMin = route;
				}
			}

			Memory.expansionTarget[roomName].routeMin = routeMin;

			if (routeMin < 16) {

				if (!Memory.rooms[roomName] || Game.time > (getRoomCache(roomName).scoutController || 0) - 2500) {
					requestRoomVision(roomName);
				}

				if (targets[roomName].hostileRoom == 1) {					
					Memory.expansionTarget[roomName].hostileRoom = targets[roomName].hostileRoom
					Memory.expansionTarget[roomName].player = targets[roomName].player
				}

				
				Memory.expansionTarget[roomName].linearMinDistance = linearMinDistance;
				Memory.expansionTarget[roomName].score = Math.round(10 * rateExpansionTargetV2(roomName, sourceCache))

				if (SEASONAL_THORIUM) {

					let thoriumAvailable = 0;
					if (Memory.rooms[roomName] && Memory.rooms[roomName].thorium) {
						for (let id in Memory.rooms[roomName].thorium) {
							thoriumAvailable += Memory.rooms[roomName].thorium[id].mineralAmount || 0;
						}
					}
	
					if (thoriumAvailable > THORIUM_MIN_EXTRACTOR) {
						let thoriumScore = (thoriumAvailable / 60000) * 1000;
	
						Memory.expansionTarget[roomName].thoriumScore = thoriumScore;						
						Memory.expansionTarget[roomName].assignedSpawns = getMyClosestRooms(roomName, 7, 2, 5);

					}	
				}

			} else {
				Memory.expansionTarget[roomName].score = 0;
			}

			

		}

		// FIND NEXT EXPANSION
		Memory.expansionTarget[loopCounter].cnt++

		let usedCPU = Game.cpu.getUsed()-init;
		log("expansionTarget evaluated " + roomName + ", used cpu " + usedCPU.toFixed(1))


	}

	// FIND BEST SCORE
	let highScore = -100;
	let expansionRoomName;
	let baseClacHighScore = 1075;
	let baseEvalRoom;
	for (let room in Memory.expansionTarget) {	
		
		if (Memory.expansionTarget[room].ts && Game.time > Memory.expansionTarget[room].ts) {
			delete Memory.expansionTarget[room];
			continue;
		}

		let score = Memory.expansionTarget[room].score
		if (Memory.expansionTargetTimeout[room] && Memory.expansionTargetTimeout[room].penalty){
			score -= Memory.expansionTargetTimeout[room].penalty || 0
		}
		
		if (score > highScore){
			highScore = score;
			expansionRoomName = room;
		}				

		if (Memory.expansionTarget[loopCounter].total > 5 &&
			Memory.expansionTarget.baseCalc.evalRoom === undefined) {

			if (Memory.expansionTarget.baseCalc[room] &&
				Memory.expansionTarget.baseCalc[room].timeOut &&
				Game.time > Memory.expansionTarget.baseCalc[room].timeOut
			) {
				delete Memory.expansionTarget.baseCalc[room];
			}
			
			if (Memory.expansionTarget.baseCalc[room] === undefined) {
				if (score > baseClacHighScore) {
					baseEvalRoom = room;
					baseClacHighScore = score;
				}
			}
		}
	}

	if (baseEvalRoom) {
		Memory.expansionTarget.baseCalc.evalRoom = baseEvalRoom;
		Memory.expansionTarget.baseCalc.startTick = Game.time;
		Memory.expansionTarget.baseCalc.calcTicks = 0;
		requestMemSave();
	}

	if (Memory.expansionTarget[NEXT_EXPANSION] === undefined) {Memory.expansionTarget[NEXT_EXPANSION] = {} }
	if (expansionRoomName)	{
		
		if (Memory.expansionTarget[NEXT_EXPANSION].roomName !== undefined && 
			Memory.expansionTarget[NEXT_EXPANSION].roomName !== expansionRoomName
		){
			Memory.expansionTarget[NEXT_EXPANSION] = {} 
		}
		Memory.expansionTarget[NEXT_EXPANSION].roomName = expansionRoomName
		Memory.expansionTarget[NEXT_EXPANSION].highScore = highScore;

		if (Memory.expansionTarget[expansionRoomName].exitsToDefend === undefined && Game.rooms[expansionRoomName]) {
			Memory.expansionTarget[expansionRoomName].exitsToDefend = getExitsToDefend(expansionRoomName);
		}

		if (Memory.expansionTarget[expansionRoomName].routeMin <= 3) {
			Memory.possiblOwnFaceClaim = 1;
		} else {
			delete Memory.possiblOwnFaceClaim
		}

		if (!Memory.rooms[expansionRoomName] || Game.time > (getRoomCache(expansionRoomName).scoutController || 0) - 2500) {
			requestRoomVision(expansionRoomName);
		}

		// debug sort by score
		/*
		let init = Game.cpu.getUsed();
		sortExpansionTargets(Memory.expansionTarget)
		let used = Game.cpu.getUsed() - init;
		log("used cpu " + used.toFixed(3))
		*/
		
	}
}

function assignSkMinerals(myRooms){
	if ((BOT_MODE && Game.time % 449 == 0) ||
		(!Memory.mineralTarget || !Memory.mineralTarget.complete) && 
	//	Game.cpu.bucket >= 2500 ){
		true){	
		if (Memory.mineralTarget === undefined || Memory.mineralTarget.ts === undefined) {
			Memory.mineralTarget = {} 
			Memory.mineralTarget.ts= Game.time + 2500
		}

		// TRIGGER RECALC
		if (Game.time > Memory.mineralTarget.ts && Game.cpu.bucket > 6000) { 
			delete Memory.mineralTarget
			Memory.mineralTarget = {} 
			Memory.mineralTarget.ts= Game.time + 2500
		//	delete Memory.remoteSkMinerals 
		}
		

		// FIND SK MINES 	
		if (Memory.mineralTarget && !Memory.mineralTarget.roomsAdded) {
			Memory.mineralTarget.roomsAdded = 1;
			for (let roomName in myRooms){
				addByExitMineral(roomName, 5)
			}

		}
		let myRoomsOutpostsAble = getMyRoomsMinPrcl(SK_MINERAL_MIN_PRCL)
		
		let breakFlag = false
		for (let miningTarget in Memory.mineralTarget){				
			if (breakFlag) { break }
			if (!Memory.rooms[miningTarget]) { continue; }

			if (Memory.rooms[miningTarget].enemyRemote) { continue; }
			
			// EVALUATE MINERALS				
			if (excludeMiningRoomsList[miningTarget]) { continue; }
			for (let sourceId in Memory.rooms[miningTarget].mineral){
				if (breakFlag) { break; }
				if (!Memory.mineralTarget[miningTarget].minerals) { Memory.mineralTarget[miningTarget].minerals = {}  }
				if (Memory.mineralTarget[miningTarget].minerals[sourceId] === undefined) {
					Memory.mineralTarget[miningTarget].minerals[sourceId] = {}	
					Memory.mineralTarget[miningTarget].minerals[sourceId].type = Memory.rooms[miningTarget].mineral[sourceId].type;
					let bestPath = 1500;
					for (let myRoomName in myRoomsOutpostsAble){

					//	let myRoomName = myRoomsOutpostsAble[room].roomName
						if (getRoomLinearDistance(myRoomName, miningTarget) > 5) { continue; }
						if (getRouteDistanceOnly(myRoomName, miningTarget) >= 6) { continue } // THIS ROOM IS TOO FAR AWAY
						let shortestPath = 500;
						let pathToSource
						if (Game.rooms[myRoomName].terminal) {
							let sourcePos = posDecompress(Memory.rooms[miningTarget].mineral[sourceId].pos, miningTarget)							
							pathToSource = findTravelPath(Game.rooms[myRoomName].terminal.pos, sourcePos,
								{range: 1, ignoreRoads: true, ignoreCreeps: true, uncompressed: true, allowSK: true})
							shortestPath = pathToSource.cost
						}						
						if (shortestPath < bestPath) {
							Memory.mineralTarget[miningTarget].minerals[sourceId].distance = shortestPath;								
							Memory.mineralTarget[miningTarget].minerals[sourceId].assignedRoom = myRoomName;
							bestPath = shortestPath
						}
					}
					breakFlag = true;
				}
			}
		}

		if (!breakFlag) {	// ALL SK MINERALS CALCULATED
			Memory.mineralTarget.complete = true;
			// DELETE OLD ASSIGNMENTS
			for (let myRoomName in myRoomsOutpostsAble){
			//	let myRoomName = myRoomsOutpostsAble[room].roomName;
				delete Memory.rooms[myRoomName].remoteSkMineralOps;
			}


			for (let room in Memory.mineralTarget) {	
				if (!Memory.rooms[room]) { continue; }

				for (let mineralId in Memory.mineralTarget[room].minerals) {
					let assignedRoom = Memory.mineralTarget[room].minerals[mineralId].assignedRoom;
					if (!assignedRoom) { continue; }
					if (!Memory.rooms[assignedRoom].remoteSkMineralOps) { Memory.rooms[assignedRoom].remoteSkMineralOps = {}; }
					Memory.rooms[assignedRoom].remoteSkMineralOps[room] = {};
					Memory.rooms[assignedRoom].remoteSkMineralOps[room].mineralId = mineralId;
					Memory.rooms[assignedRoom].remoteSkMineralOps[room].type = Memory.mineralTarget[room].minerals[mineralId].type;
					Memory.rooms[assignedRoom].remoteSkMineralOps[room].dist = Memory.mineralTarget[room].minerals[mineralId].distance;
				}
			}
		}
	}
}

function assignRemotes(myRooms){
	if ((Game.time % 53 == 13 ||
		!Memory.remoteSources || !Memory.remoteSources.complete) && Game.cpu.bucket >= 700 ){
		

		if (Memory.remoteSources === undefined || Memory.remoteSources.ts === undefined) {
			Memory.remoteSources = {};
			resetConflictRemotes();
			if (Memory.myRoomHighPRCL <= 3) {
				Memory.remoteSources.ts = Game.time + 50;
			} else if (Memory.myRoomHighPRCL <= 7) {
				Memory.remoteSources.ts = Game.time + 500;
			} else {
				Memory.remoteSources.ts = Game.time + 15000;
			}
			requestMemSave();
		}

		// TRIGGER RECALC
		if (Memory.remoteSources &&
			Game.time > Memory.remoteSources.ts &&
			Game.cpu.bucket > 6000) {
			
			delete Memory.remoteSources;	
			delete Memory.miningTarget;

			Memory.remoteSources = {};
			resetConflictRemotes();
			requestMemSave();

			if (Memory.myRoomHighPRCL <= 3) {
				Memory.remoteSources.ts = Game.time + 50;
			} else if (Memory.myRoomHighPRCL <= 7) {
				Memory.remoteSources.ts = Game.time + 500;
			} else {
				Memory.remoteSources.ts = Game.time + 15000;
			}
		}
		
		if (!Memory.miningTarget || Object.keys(Memory.miningTarget).length <= 0 || Memory.myRoomHighPRCL < 7) {
			for (let roomName in myRooms){
				
				let prevRemotes = 0;
				if (Memory.miningTarget) { prevRemotes = Object.keys(Memory.miningTarget).length; }
				
				addRemotesByExit(roomName, 3);
				if (prevRemotes !== Object.keys(Memory.miningTarget).length) {
					delete Memory.remoteSources;
					Memory.remoteSources = {};
					if (Memory.myRoomHighPRCL <= 3) {
						Memory.remoteSources.ts = Game.time + 50;
					} else if (Memory.myRoomHighPRCL <= 7) {
						Memory.remoteSources.ts = Game.time + 500;
					} else {
						Memory.remoteSources.ts = Game.time + 15000;
					}
				}
			}
		}

		let init = Game.cpu.getUsed();
		// EVALUATE MINING OUTPOSTS

		let roomOutpostRequire = 1;
		if (Memory.myRoomHighPRCL >= CONTROLLER_MAX_LEVEL && !BOT_MODE) {
			roomOutpostRequire = 3;
		}
		let myRoomsOutpostsAble = getMyRoomsMinPrcl(roomOutpostRequire)

		let usedCPU = 0;
		let maxCpuCycle = 5;
		let breakFlag = false;

		let maxVisionRequests = 8;
		let currentVisionRequests = 0;

		let maxSourceDistance = 4;
		if (isCpuLimited() ) {
			maxSourceDistance = 3;
		}

		if (!Memory.remoteSources.complete) {
			requestMemSave();
			for (let miningTarget in Memory.miningTarget){
				if (!Memory.remoteSources) { breakFlag = true;}
				if (breakFlag) { break; }
				
				if (excludeMiningRoomsList[miningTarget]) { continue; }
				if (!Memory.rooms[miningTarget]) { 					
					Memory.remoteSources.ts = Game.time + 10;

					if (currentVisionRequests < maxVisionRequests && Object.keys(Memory.rooms).length >= 5) {
						currentVisionRequests++;
						requestRoomVision(miningTarget);
						log("assignRemotes missing data for room " + miningTarget)
					}
					
					continue; 
				}	

				if (SEASONAL_THORIUM && roomIsCenter(miningTarget) && Memory.reactors[miningTarget] && Memory.reactors[miningTarget].active) { continue; }

				if ((Memory.rooms[miningTarget].hostileRoom || 
					(getRoomRCL(miningTarget) > 0 && !Memory.rooms[miningTarget].myRoom)) ||
					(Memory.rooms[miningTarget].RCLreserved && !Memory.rooms[miningTarget].invaderCore && Memory.rooms[miningTarget].RCLreserved.username !== Memory.username)
				) { 
					if (ALLIES[Memory.rooms[miningTarget].player] || AVOID[Memory.rooms[miningTarget].player]) { continue; }
					if (Memory.rooms[miningTarget].RCLreserved && ALLIES[Memory.rooms[miningTarget].RCLreserved.username]) { continue; }
					
					// Store conflict on Player					
					registerConflictingRemote(miningTarget);
					if (!SEASONAL_PASSIVE_MODE) {
						addRage(Memory.rooms[miningTarget].player, 5000);
					}					

					if (!BOT_MODE) {
						if (Memory.rooms[miningTarget].hostileRoom) {
						//	addToBlackList(Memory.rooms[miningTarget].player)
						}
					} else {	// ASSIGN COMBAT					

						if (Memory.myRoomHighPRCL < 4) { continue; }
						if (roomIsSafeModed(miningTarget)) { continue; }
					
						if (getRoomPRCL(miningTarget) === 0 && getRoomRCL(miningTarget) > 0) {		// ASSUME ITS BEEN WIPED
						//	console.log("CONTROLLER ATTACK " + miningTarget)
							if (Memory.controllerAttack[miningTarget] === undefined) { 
								Memory.controllerAttack[miningTarget] = {};
							}
						}
					}

					continue;
				}

				// EVALUATE MINERALS	
				for (let sourceId in Memory.rooms[miningTarget].mineral){
					if (breakFlag) { break; }					

					if (Memory.remoteSources[sourceId] === undefined) {
						Memory.remoteSources[sourceId] = {};
						if( !roomIsSk(miningTarget) && !roomIsCenter(miningTarget)) { continue; }
						Memory.remoteSources[sourceId].mineral = Memory.rooms[miningTarget].mineral[sourceId].type;
						Memory.remoteSources[sourceId].roomName = miningTarget;
						let bestPath = 1500;
						for (let myRoomName in myRoomsOutpostsAble){

							if (myRoomName === miningTarget ) { continue; } // DONT MINE YOURSELF
							if (Memory.rooms[miningTarget] && Memory.rooms[miningTarget].myRoom) { continue; }
							if (PRAISE_GCL_ROOMS[myRoomName]) { continue; } // THIS ROOM IS NOT AVAILABLE WHILE PRAISING
							if (roomIsSk(miningTarget) && Game.rooms[myRoomName].controller.level < 7 ) { continue; } // THIS ROOM IS TOO LOW LEVEL
							if (getRoomLinearDistance(myRoomName, miningTarget) >= 4) { continue; }	
							if (getRouteDistanceOnly(myRoomName, miningTarget) >= 4) { continue; } // THIS ROOM IS TOO FAR AWAY
							let shortestPath = 1500
							let pathToSource
							if (Game.rooms[myRoomName].terminal) {
								let sourcePos = posDecompress(Memory.rooms[miningTarget].mineral[sourceId].pos, miningTarget)

								pathToSource = findTravelPath(Game.rooms[myRoomName].terminal.pos, sourcePos,
									{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:20000, uncompressed: true, allowSK: true})
								shortestPath = pathToSource.cost
							}
						//	let swamps = Math.round((pathToSource.cost - pathToSource.path.length) / 5)
						//	let score = calcSource(shortestPath, swamps, sourceEnergy)
							if (pathToSource && !pathToSource.incomplete && shortestPath < bestPath) {
								Memory.remoteSources[sourceId].distance = pathToSource.path.length
								Memory.remoteSources[sourceId].score = pathToSource.cost
								Memory.remoteSources[sourceId].assignedRoom = myRoomName
								bestPath = pathToSource.cost
							}
						}	
						
						let time = Game.cpu.getUsed()-init;
						usedCPU += time;
						if (usedCPU > maxCpuCycle) {
							breakFlag = true;
						}						
					}
				}
				

				// EVALUATE SOURCES
				for (let sourceId in Memory.rooms[miningTarget].sources){
					if (breakFlag) {break}
					let bestIncome = MIN_SOURCE_INCOME				
					let sourceEnergy = SOURCE_ENERGY_CAPACITY
					let numberOfSources = Object.keys(Memory.rooms[miningTarget].sources).length
					if (roomIsSk(miningTarget)) {
						sourceEnergy = SOURCE_ENERGY_KEEPER_CAPACITY + SOURCE_KEEPER_DROP_ENERGY
					} else if (Memory.rooms[miningTarget].sources.length === 1 ) {
					//	sourceEnergy = SOURCE_ENERGY_NEUTRAL_CAPACITY
					}
					if (Memory.remoteSources[sourceId] === undefined) {
					//	if (!Memory.rooms[room]) { continue }
						Memory.remoteSources[sourceId] = {}
						Memory.remoteSources[sourceId].roomName = miningTarget

						for (let myRoomName in myRoomsOutpostsAble){
						//	let myRoomName = myRoomsOutpostsAble[room].roomName
						
							if (PRAISE_GCL_ROOMS[myRoomName]) { continue } // THIS ROOM IS NOT AVAILABLE WHILE PRAISING
							if (myRoomName === miningTarget ) { continue } // DONT MINE YOURSELF
							if (Memory.rooms[miningTarget] && Memory.rooms[miningTarget].myRoom) { continue }

							if (roomIsSk(miningTarget) && Game.rooms[myRoomName].controller.level < 7) {continue } // THIS ROOM IS TOO LOW LEVEL
							if (getRoomLinearDistance(myRoomName, miningTarget) >= maxSourceDistance) { continue }						
							if (getRouteDistanceOnly(myRoomName, miningTarget) > maxSourceDistance) { continue } // THIS ROOM IS TOO FAR AWAY
							let shortestPath = 1500
							let pathToSource
							let swamps
							let sourcePos = posDecompress(Memory.rooms[miningTarget].sources[sourceId].pos, miningTarget)

							if (Game.rooms[myRoomName].storage) {
								pathToSource = findTravelPath(Game.rooms[myRoomName].storage.pos, sourcePos,
								{range: 1, ignoreRoads: true, ignoreCreeps: true, uncompressed: true, allowSK: true})
								if (!pathToSource.incomplete && pathToSource.path.length <= shortestPath) {
									shortestPath = pathToSource.path.length
									swamps = Math.round((pathToSource.cost - pathToSource.path.length) / 5)
								//	closestStoreLocation = Game.rooms[myRoomName].storage.pos
								}
							}

							if (shortestPath >= 1500) { // no storage or terminal
								let spawn = Game.rooms[myRoomName].findByType(STRUCTURE_SPAWN)
								if (spawn.length > 0) {
									pathToSource = findTravelPath(spawn[0].pos, sourcePos,
									{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:20000, uncompressed: true, allowSK: true})
									if (!pathToSource.incomplete && pathToSource.path.length <= shortestPath) {
										shortestPath = pathToSource.path.length
										swamps = Math.round((pathToSource.cost - pathToSource.path.length) / 5)
									//	closestStoreLocation = Game.rooms[myRoomName].terminal.pos
									}
								}
							}
							// TODO CALC CLAIMER ROOM
							
							let pathLengthToController = 0;
							if (Memory.rooms[miningTarget].controller) {
								let spawn = Game.rooms[myRoomName].findByType(STRUCTURE_SPAWN);
								let controllerPos = posDecompress(Memory.rooms[miningTarget].controller.pos, miningTarget)
								if (spawn.length > 0 && controllerPos) {
									pathToSource = findTravelPath(spawn[0].pos, controllerPos,
										{range: 1, ignoreRoads: true, ignoreCreeps: true,  uncompressed: true, allowSK: true})
									if (!pathToSource.incomplete) {
										pathLengthToController = pathToSource.path.length									
									} else {
										pathLengthToController = shortestPath;
									}
								} else {
									pathLengthToController = shortestPath;
								}
							}
						//	console.log("dist to controller " + pathLengthToController + " sources " + numberOfSources)

							let score = calcSource(shortestPath, swamps, sourceEnergy, pathLengthToController, numberOfSources)
						//	console.log("remote score " + score + " to source " + sourceId + " from room " + myRoomName);
							if (score.netEnergy > bestIncome) {
								Memory.remoteSources[sourceId].distance = shortestPath;
								Memory.remoteSources[sourceId].score = score;
								Memory.remoteSources[sourceId].assignedRoom = myRoomName;
								bestIncome = score.netEnergy;
							}
						}
						

						let time = Game.cpu.getUsed()-init;
						usedCPU += time;
						if (usedCPU > maxCpuCycle) {
							breakFlag = true;
						}
					}
				}
			}
		}

		if (!breakFlag && !Memory.remoteSources.complete) {	// ALL SOURCES CALCULATED
			Memory.remoteSources.complete = true;
			requestMemSave();
			
			// MARK OLD ASSIGNMENTS
			for (let spawner in myRoomsOutpostsAble){
			//	delete Memory.rooms[spawner].remoteMineOps;
 
				for (let room in Memory.rooms[spawner].remoteMineOps) {
					Memory.rooms[spawner].remoteMineOps[room].old = 1;
				}
			}

			// DELETE OLD REMOTES
			for (let room in Memory.rooms){
				delete Memory.rooms[room][R.MY_MINING_OUTPOST];
			}

			// SORT SOURCES UNDER ASSIGNED ROOM
			for (let sourceId in Memory.remoteSources){
				if (Memory.remoteSources[sourceId].assignedRoom) {
					let assignedRoom = Memory.remoteSources[sourceId].assignedRoom
					let remoteRoom = Memory.remoteSources[sourceId].roomName						
					if (!Memory.rooms[assignedRoom]) {  // MISSING ROOM?
						delete Memory.miningTarget
						Memory.miningTarget = {};
						delete Memory.remoteSources;
						Memory.remoteSources = {};
					}

					Memory.rooms[remoteRoom][R.MY_MINING_OUTPOST] = 1;
					if (Memory.rooms[assignedRoom].remoteMineOps === undefined) {Memory.rooms[assignedRoom].remoteMineOps = {} }
					if (Memory.rooms[assignedRoom].remoteMineOps[remoteRoom] === undefined) {Memory.rooms[assignedRoom].remoteMineOps[remoteRoom] = {} }
					if (Memory.remoteSources[sourceId].mineral) {
						if (Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].mineral === undefined) {Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].mineral = {} }
						if (Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].mineral[sourceId] === undefined) {Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].mineral[sourceId] = {} }
					} else {
						if (Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].sources === undefined) {Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].sources = {} }
						if (Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].sources[sourceId] === undefined) {
							Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].sources[sourceId] = {}
							Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].sources[sourceId].netEnergy = Memory.remoteSources[sourceId].netEnergy;
						} else {
							delete Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].old
						}
					}

					/*
					// Keep suspended status
					if (Memory.rooms[assignedRoom].remoteSources && 
						Memory.rooms[assignedRoom].remoteSources[sourceId] && 
						Memory.rooms[assignedRoom].remoteSources[sourceId].suspended
					) {
						Memory.rooms[assignedRoom].remoteMineOps[remoteRoom].suspended = 1;
					}*/
				}
			}

			// DELETE OLD ASSIGNMENTS
			for (let spawner in myRoomsOutpostsAble){
				for (let room in Memory.rooms[spawner].remoteMineOps) {
					if (Memory.rooms[spawner].remoteMineOps[room].old) {
						delete Memory.rooms[spawner].remoteMineOps[room];
					}
				}
			}
				

			// SORT BASED ON INCOME/SPAWNTIME
			for (let roomName in myRooms){
				sortMineOps(roomName)
			}

			
			
			// REMOVE FROM MEMORY
			for (let sourceId in Memory.remoteSources){
				if (sourceId == "ts" || sourceId == "complete") { continue; }
				delete Memory.remoteSources[sourceId];
			}

			

		}
	}
}

function assignPowerBanks(myRooms){
	if (HARVEST_POWERBANKS && Game.time % 31 == 2 && Game.cpu.bucket > 700) {

		if (Memory.myRoomHighPRCL < POWERBANK_MIN_PRCL) { return; }

		if (SEASONAL_THORIUM && Game.gpl.level >= MAX_GPL) { return; }

		// REMOVE BANKS WHEN DESTROYED
		for (let powerBankRoom in Memory.powerBanks){
		//	console.log("checking " + powerBankRoom);
			if (Memory.rooms[powerBankRoom] === undefined || 
				Memory.rooms[powerBankRoom].powerBank === undefined ||					
				Memory.rooms[powerBankRoom].powerBank.timeOut < Game.time
			) {
				delete Memory.powerBanks[powerBankRoom];
				delete Memory.attackTarget[powerBankRoom];
			}
		}

		// SET POWER BANK MISSION
		if (Memory.powerBanks === undefined) {Memory.powerBanks = {}; }
		let minPower = 5500;
		let myPowerSpawns = Object.keys(myRooms).length;
		let maxMissions = Math.ceil(myPowerSpawns/2);
		let targetPower = 0;
		targetPower = myPowerSpawns * TARGET_POWER;


		if (Memory.Minerals[RESOURCE_POWER] === undefined || Memory.Minerals[RESOURCE_POWER] < targetPower * 0.5) {
			minPower = 2500;
			maxMissions = Math.min(myPowerSpawns, 15);
		} else if (Memory.Minerals[RESOURCE_POWER] && Memory.Minerals[RESOURCE_POWER] > targetPower) {
			maxMissions = 0;
		}

		maxMissions = Math.ceil((1 - ((Memory.Minerals[RESOURCE_POWER] || 0) / targetPower)) * myPowerSpawns)


	//	let reductionMissions = maxMissions * Game.cpu.bucket / 10000;
		/*
		if (maxMissions > 0) {
			maxMissions = Math.max(maxMissions * Game.cpu.bucket / 10000, 2, Math.ceil(myPowerSpawns/4));
		}*/
		
		let missions = _.filter(Memory.powerBanks, (powerBanks) => powerBanks.assignedRoom);	
		let assignedMissions = missions.length;
		console.log("current powerBank missions " + assignedMissions + "/" + maxMissions + " minimum power " + minPower);
		if (assignedMissions < maxMissions || true) {

			// LOOK FOR NEW POWERBANKS
			let roomsWithPowerBank = {}
			for (let roomName in Memory.rooms) {
				let roomData = Memory.rooms[roomName]
				if (!roomData.powerBank) { continue; }
				roomsWithPowerBank[roomName] = roomData;
			}

			let targets = [];
			// SORT AND FILTER POWER BANKS
			for (let powerBankRoomName in roomsWithPowerBank) {
				let timeLeft = Memory.rooms[powerBankRoomName].powerBank.timeOut - Game.time;
				if (timeLeft < -1000) {
					delete Memory.rooms[powerBankRoomName].powerBank
					continue; 
				} else if (timeLeft < 1700) {
					continue; 
				}

				if (Memory.powerBanks[powerBankRoomName] && Memory.powerBanks[powerBankRoomName].assignedRoom) { continue; }
				if (roomsWithPowerBank[powerBankRoomName].powerBank.power < minPower) { continue; }
				
				

				let score = roomsWithPowerBank[powerBankRoomName].powerBank.power;	// higher is better
				targets.push([powerBankRoomName, score]);
			}

			if (targets.length > 0) {
				targets.sort(function(a, b) {
					return (b[1] - a[1]);});
			}

			console.log(JSON.stringify(targets))

			// ASSIGN POWER BANKS
			if (targets.length > 0) {

				let myRoomsMaxLevel = getMyRoomsMinPrcl(POWERBANK_MIN_PRCL)
			//	let myRoomsMaxLevel =_.filter(myRooms, (roomData) => (getRoomPRCL(roomData.roomName) >= 8 ) );
			//	for (let powerBankRoom in roomsWithPowerBank){
				for (let idx in targets){

					if (assignedMissions > maxMissions ) { break; }
				//	let _room = roomsWithPowerBank[powerBankRoom].roomName;
					let _room = targets[idx][0];
					if (Memory.powerBanks[_room] === undefined) {
						Memory.powerBanks[_room] = {};
					}
					if (global.excludePbRoomsList[_room]) {
					//	Memory.powerBanks[_room].excluded = 1;

						let timeLeft = Memory.rooms[_room].powerBank.timeOut - Game.time;
						if (timeLeft > 2000 || Memory.rooms[_room].powerBank.hits < POWER_BANK_HITS) {
							continue;
						}
					}

					if (Memory.rooms[_room].powerBank === undefined || Memory.rooms[_room].powerBank.pos === undefined) { continue; }	
					
					if (Memory.powerBanks[_room].assignedRoom) { continue; }
					
					let shortestDist = 9999;

					let maxDist = 8; // Must be closer than this
					if (Memory.powerBanks[_room].shortestDist === undefined) {
						for (let roomName in myRoomsMaxLevel) {
							let myRoom = roomName;
							if (Memory.powerBanks[_room].unreachable && Memory.powerBanks[_room].unreachable[myRoom]) { continue; }
							if (Memory.rooms[_room].nukeResponse) { continue; }
							if (Game.rooms[myRoom].energyStatus() < ECONOMY_DEVELOPING) { continue; }
							if (getRoomLinearDistance(myRoom, _room) > maxDist) { continue; }
							let routeLength = getRouteDistanceOnly(myRoom, _room);
							if (routeLength < shortestDist) {
								shortestDist = routeLength;
								Memory.powerBanks[_room].shortestDist = routeLength;
								Memory.powerBanks[_room].shortestDistRoom = myRoom;
							}
						}
					}
					if (Memory.powerBanks[_room].shortestDist < maxDist) {
						Memory.powerBanks[_room].assignedRoom = Memory.powerBanks[_room].shortestDistRoom;
					}
					
					if (Memory.powerBanks[_room].assignedRoom) { // Check if reachable
						let bankPos = Memory.rooms[_room].powerBank.pos;
					
						let pathToBank = findTravelPath(Game.rooms[Memory.powerBanks[_room].assignedRoom].controller.pos, bankPos,
						{range: 1, ignoreRoads: true, ignoreCreeps: true,  maxOps:30000});
						if (pathToBank.incomplete) {
							console.log("cant reach powerbank " + _room + " deleting target " );
							Memory.powerBanks[_room].assignedRoom = "unreachable";
						//	if (Memory.powerBanks[_room].unreachable === undefined) { Memory.powerBanks[_room].unreachable = {}; }
						//	Memory.powerBanks[_room].unreachable[Memory.powerBanks[_room].assignedRoom] = {};
						//	delete Memory.powerBanks[_room].assignedRoom;
						} else {
							console.log("assigned powerbank in " + _room + " to " + Memory.powerBanks[_room].assignedRoom + " power: " +Memory.rooms[_room].powerBank.power );
							Memory.rooms[_room].powerBank.ticksToTarget = pathToBank.cost;
							Memory.powerBanks[_room].ticksToTarget = pathToBank.cost;
							orderCombatBoost(Memory.powerBanks[_room].assignedRoom);
							// ASSIGN HAULERS
							let roomsInRange = getMyClosestRooms(_room, 6, 2);
							Memory.powerBanks[_room].haulers = {};
							Memory.powerBanks[_room].haulers = roomsInRange;
							assignedMissions++;
							requestMemSave();
						}
					}
				}
			}
		}
	}	
}

function helpNeeded() {
	if (Game.time % 19 == 0){

		let myRoomsInNeed = {};
		for (let roomName in Memory.rooms) {
			let roomData = Memory.rooms[roomName]
			if ((roomData.myRoom == 1 && getRoomPRCL(roomName) < 3) ||	// FAST LEVEL 3
				(roomData.myRoom && roomData.em && getRoomPRCL(roomName) < getRoomRCL(roomName)) ||
				(roomData.myRoom == 1 && PRAISE_GCL_ROOMS[roomName] && getRoomCache(roomName).builderJob && getRoomCache(roomName).builderJob.length > 0 ) ||
				((roomData[R.MY_MINING_OUTPOST] == 1 || roomData.buildRoads) && (roomData.cSitesCount !== undefined && roomData.cSitesCount > 0))
			) {
				myRoomsInNeed[roomName] = roomData;
			}
		}

		let temp = {};

		// REBUILD ALLIES FLAG
		let rebuild = _.filter(Object.keys(Game.flags), flag => ((Game.flags[flag].color == COLOR_BLUE)));
		for (let idx in rebuild){
			let roomName = Game.flags[rebuild[idx]].pos.roomName;
			temp[roomName] = {};

			let roomsInRange = getMyClosestRooms(roomName, 4);
			Memory.helpNeeded[roomName] = {};
			Memory.helpNeeded[roomName].assignedSpawn = roomsInRange;
		}

		let sortRequired
		for (let roomName in myRoomsInNeed){
			if (!roomName || !Memory.rooms[roomName]) { continue; }

			temp[roomName] = {};

			if (Memory.rooms[roomName].buildRoads && (Game.time > Memory.rooms[roomName].buildRoads || Memory.rooms[roomName].myRoom )) {
				delete Memory.rooms[roomName].buildRoads;
				continue;
			}

			if (BOT_MODE && Memory.rooms[roomName].myRoom && Memory.hasBeenSieged && getRoomPRCL(roomName) < 3) { 
				orderRangedAttackers(roomName, 500, "buildingRoom");
			}
			
			let ts = Memory.helpNeeded[roomName] && Memory.helpNeeded[roomName].ts || 0;
			if (!Memory.helpNeeded[roomName] || 
				!Memory.helpNeeded[roomName].assignedSpawn ||
				Game.time > ts
			){
				sortRequired = true;
				Memory.helpNeeded[roomName] = {};
				Memory.helpNeeded[roomName].assignedSpawn = {};
				Memory.helpNeeded[roomName].ts = Game.time + 450;

				
				let requiredLevel = limit(Memory.myRoomHighPRCL, 1, 4);	
				let roomsInRange = getMyClosestRooms(roomName, requiredLevel);

				Memory.helpNeeded[roomName].assignedSpawn = roomsInRange;	
				if (!Memory.helpNeeded[roomName].shard) {
					reassignHelpers(roomName);
				}

				Memory.helpNeeded[roomName].score = 0;

				if (Memory.rooms[roomName].myRoom) {
					Memory.helpNeeded[roomName].score += 10; 
				} else {
					for (let spawner in Memory.helpNeeded[roomName].assignedSpawn) {
						let spawnData = Memory.rooms[spawner]
						if (!spawnData.remoteMineOps || !spawnData.remoteMineOps[roomName]) { continue; }
						Memory.helpNeeded[roomName].score += spawnData.remoteMineOps[roomName].eps
					}
				}
			}
		}

		// DELETE HELP NEEDED
		let deleted;
		for (let roomName in Memory.helpNeeded){
			
			
			if (!temp[roomName] && (Memory.helpNeeded[roomName].shard === undefined || Game.time > Memory.helpNeeded[roomName].shardTs)) {				
				
				if (Memory.helpNeeded[roomName].shard && Game.time > Memory.helpNeeded[roomName].shardTs) {
                    delete Memory.helpNeeded[roomName];					
                } else {
					delete Memory.helpNeeded[roomName];
					deleted = true;
					log("deleting help needed! " + roomName)
				}
			}			
		}

		if (deleted) {
			reassignHelpers();
		}

		if (sortRequired) {
			let sortable = [];
			for (let room in Memory.helpNeeded) {
				sortable.push({room: room, data: Memory.helpNeeded[room], score: Memory.helpNeeded[room].score })
			}
			sortable.sort(function(a, b) {
				return (b.score - a.score);});

			delete Memory.helpNeeded
			Memory.helpNeeded = {}
			for (let idx in sortable) {
				Memory.helpNeeded[sortable[idx].room] = sortable[idx].data;
			}
		}
	}
}

function defendMyRemotes(myRooms) {
	let myRemotesAttacked = {}
	for (let roomName in myRooms){
		
		let spawnerAttacked = false;
		for (let remote in Memory.rooms[roomName].remoteMineOps) {
			let roomData = Memory.rooms[remote]
			if (!roomData) { continue; }
		
			if ((roomData[R.MY_MINING_OUTPOST] == 1 && checkRoomIsActiveMine(remote) &&
				((roomData.hostiles && roomData.hostiles.player !== "Source Keeper" && !ALLIES[roomData.hostiles.player]) || 
				Memory.rooms[remote].hostilesTimeout || 
			//	Memory.rooms[remote][R.INVADER_PROBABLE] ||
				(Memory.rooms[remote].invaderCore && Memory.rooms[remote].invaderCore.level === 0)))
			) {
				myRemotesAttacked[remote] = roomData
				spawnerAttacked = true;
			}
		}

		if (!spawnerAttacked && Memory.rooms[roomName].remotesAttacked) {
			delete Memory.rooms[roomName].remotesAttacked;
		}
	}

	let temp = {};

	if (Memory.expansionTarget[NEXT_EXPANSION] && (isNearGCLmilestone() < 50000 || SEASONAL_THORIUM)) {
		let roomName = Memory.expansionTarget[NEXT_EXPANSION].roomName;
		if (Memory.rooms[roomName] && Memory.rooms[roomName].invaderCore && Memory.rooms[roomName].invaderCore.level === 0) {
			myRemotesAttacked[roomName] = {};
		}
	}


	if (SEASONAL_THORIUM) {
		// Handle Thorium claims
		let flags = _.filter(Object.keys(Game.flags), flag => ((Game.flags[flag].color == COLOR_GREEN && Game.flags[flag].secondaryColor == COLOR_WHITE)));

		let coreClear = {}
		let nearUnclaim = false;
		for (let idx in flags){
		
			let flag = Game.flags[flags[idx]];
			let roomName = flag.pos.roomName;
			if (flag.name !== roomName) { continue; }

			if (Memory.rooms[roomName] && Memory.rooms[roomName].invaderCore && Memory.rooms[roomName].invaderCore.level === 0) {
				coreClear[roomName] = {}
			}

			if (Game.rooms[roomName] && Game.rooms[roomName].controller.level >= 6) {
				nearUnclaim = true;
			}
		}

		if (nearUnclaim) {
			for (let roomName in coreClear) {
				myRemotesAttacked[roomName] = {}
			}
		}
	}

	
	
	if (Memory.controllerAttack) {
		for (let room in Memory.controllerAttack) {

			if (!Memory.rooms[room] || getRoomPRCL(room) >= 3 || getRoomRCL(room) == 0) { 
				delete Memory.controllerAttack[room];
				continue;
			}

			if (Memory.rooms[room] && Memory.rooms[room].isPlayer === Memory.rooms[room].player){
				orderRangedAttackers(room, 500, "controllerAttack");
			}
			
			temp[room] = {};
			
			if (!Memory.rooms[room].cleanTs || Game.time > Memory.rooms[room].cleanTs) {
				Memory.rooms[room].cleanTs = Game.time + 750;
				if (roomSurpressed(room) &&	needsCleanUp(room) ){
					orderCleanUp(room);
				}
			}
		}
	}
		
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

	for (let roomName in myRemotesAttacked){

		temp[roomName] = {};

		if (Memory.rooms[roomName].isPlayer && 
			!ALLIES[Memory.rooms[roomName].isPlayer] && 
			Memory.rooms[roomName].hostiles && 
			Memory.rooms[roomName].hostiles.power.defensive > 10 &&
			Memory.rooms[roomName].hostiles.power.defensive >= maxPower[Memory.myRoomHighPRCL] * 0.5) {
			orderRangedAttackers(roomName, 250, "defendRemote");
		//	log("ordering remote attackers for " + roomName + " power at " + Memory.rooms[roomName].hostiles.power.defensive + "/" + maxPower[Memory.myRoomHighPRCL])
		}

		if (!Memory.remoteAttacked[roomName] || !Memory.remoteAttacked[roomName].assignedSpawn) {
			Memory.remoteAttacked[roomName] = {};
			Memory.remoteAttacked[roomName].assignedSpawn = {};
		
			let reqSpawn = 2;
			if (Memory.rooms[roomName].isPlayer) {
				reqSpawn = limit(Memory.myRoomHighPRCL, 1, 6);
			}
			
			if (roomIsSk(roomName) ) {
				if (Memory.rooms[roomName].invaderCore) {
					continue; 
				}
				reqSpawn = 7;
			}

			let roomsInRange = getMyClosestRooms(roomName, reqSpawn, undefined, undefined, ECONOMY_LOW);				
			Memory.remoteAttacked[roomName].assignedSpawn = roomsInRange;
			let leftOverIk = reassignInvaderKillers(roomName);
			if (BOT_MODE && leftOverIk.length > 0) {
				sendIksToHarass(leftOverIk);
			}
		}

		if (BOT_MODE && Game.time % 19 === 0) {
			reassignInvaderKillers(roomName);
		}
	}

	if (SWC_MODE && Game.time % 19 === 0) {
		for (let roomName in global.allyRemoteDefence) {
			if (Game.time > global.allyRemoteDefence[roomName].ts) {
				delete global.allyRemoteDefence[roomName];
				continue;
			}

			reassignInvaderKillers(roomName);
		}
	}	
	
	// DELETE ROOM NO LONGER UNDER ATTACK
	for (let room in Memory.remoteAttacked){
		if (!temp[room]) {
			delete Memory.remoteAttacked[room];

			// Release evacuated creeps
			if (Memory.rooms[room].evacuated) {
				releaseFleeRoles(room);
				delete Memory.rooms[room].evacuated;
			}

			let leftOverIk = [];
			for (let _room in Memory.remoteAttacked) {
				if (!Memory.rooms[_room].myRoom && !roomIsSk(_room) ){
					let tempIk = reassignInvaderKillers(_room);
					if (tempIk.length > 0) {
						leftOverIk = leftOverIk.concat(tempIk);
					}
				}
			}
			if (BOT_MODE) { sendIksToHarass(leftOverIk); }			
							

		} else if (	Memory.rooms[room].isPlayer && 
					(!Memory.rooms[room].hostileTs || Memory.rooms[room].hostileTs + 25 < Game.time)
		) {
			requestRoomVision(room);	
			// Assign creep to Peek
			assignFleeToPeek(room);
		}
	}
}

function launchNukes(myRooms) {
	if (Game.time % 13 == 0){
		for (let id in Memory.nukeLaunches){
			let nuke = Memory.nukeLaunches[id];
			if (!nuke || !nuke.startTick) { continue; }

			if (Game.time - nuke.startTick > 1000) { 
				delete Memory.nukeLaunches[id];
				continue;
			}

			if (Game.time >= nuke.startTick && !nuke.launched){		
				let room = nuke.room;	
				let targetPos = posDecompress(nuke.pos, room);					
				let nukesLaunched = 0;
				let requiredNukes = nuke.reqNukes;
				let nukers = [];
				if (Memory.nukeLaunches[id].nuker) {
					let nuker = Game.getObjectById(Memory.nukeLaunches[id].nuker);
					nukers.push(nuker);
				} else {
					for (let roomName in myRooms){
						console.log("checking nuke from " + roomName + " dist " +getRoomLinearDistance(roomName, room) );
						if (getRoomLinearDistance(roomName, room) > NUKE_RANGE ) { continue; }
						let nuker = Game.rooms[roomName].findByType(STRUCTURE_NUKER);
						if (nuker.length > 0) {
							nukers.push(nuker[0]);
						}
					}
				}

				if (nukers.length > 0) {
					for (let idx in nukers) {
						if (nukesLaunched >= requiredNukes) { break; }
						let resultNuke = nukers[idx].launchNuke(targetPos);
						console.log("launching nuke from " + nukers[idx].room.name + " result ");
						if (resultNuke === OK) {
							nukesLaunched++;
						}
						delete nukers[idx].memory.nukeOrder;
					}
				}

				if (nukesLaunched > 0 && global._roomCache[nuke.room]) {
					// Check for actual nuke next tick						
					global._roomCache[nuke.room].nukeCheckedTs = Game.time + 1;
				}

				Memory.nukeLaunches[id].launched = nukesLaunched;
				console.log("nuke launcher launched " + nukesLaunched + " at " + targetPos);
			}
		}
	}
}

global.setPushRcl;
function energyShare(myRooms){
	if (Game.time % 39 == 0 || !global.setPushRcl){

		global.setPushRcl = Game.time;

		// SET PUSH GCL TARGET ROOM	
		let bestEnergyNext = Infinity;
		let roomToPush;
		
		let lowRclPush = Math.min(Memory.myRoomHighPRCL || 1, 6);
		let highRcl = CONTROLLER_MAX_LEVEL;
		if (ECO_MODE) { highRcl = 7 }

		PUSH_RCL_TARGETS = {};

		let levelingRooms = {};
		let maxLevelRooms = 0
		for (let roomName in myRooms){
			let roomLevel = getRoomRCL(roomName)
			if (roomLevel >= lowRclPush && roomLevel < highRcl){
				let energyToNextRcl = Game.rooms[roomName].controller.progressTotal - Game.rooms[roomName].controller.progress;

				if (Memory.rooms[roomName].mineOnly && Game.rooms[roomName].terminal) { continue; }

				levelingRooms[roomName] = []
				if (energyToNextRcl < bestEnergyNext) {
					bestEnergyNext = energyToNextRcl;
					roomToPush = roomName;
				}
			}
			if (roomLevel >= CONTROLLER_MAX_LEVEL) { maxLevelRooms++ }
		}
		
		for (let room in PRAISE_GCL_ROOMS){
			global.PUSH_RCL_TARGETS[room] = {};
		}

		if (roomToPush) {
			console.log("pushing RCLprogress in room " + roomToPush + " energy to next level " + bestEnergyNext);
			global.PUSH_RCL_TARGETS[roomToPush] = {};
		}

		Memory.energyShare = {};

		
		for (let room in PUSH_RCL_TARGETS) {
			if (!Game.rooms[room] || !Game.rooms[room].terminal) { continue; }
			let controller = Game.rooms[room].controller;
			if (controller && controller.level >= CONTROLLER_MAX_LEVEL) { 
				delete PUSH_RCL_TARGETS[room];
				continue; 
			}

			if (Memory.rooms[room].mineOnly && Game.rooms[room].terminal) {
				delete PUSH_RCL_TARGETS[room];
				continue; 
			}

			if (!Memory.Minerals[T3_UPGRADE_CONTROLLER]) { continue; }
			restockRes(room, myRooms, T3_CARRY, 1500);
			restockRes(room, myRooms, T3_UPGRADE_CONTROLLER, 3000);
			restockRes(room, myRooms, T3_BUILD, 3000);
			if (Memory.rooms[room].sieged) { continue; }
			Game.rooms[room].setBoostMode(false, {[T3_UPGRADE_CONTROLLER]: 1500, [T3_BUILD]: 1500, [T3_CARRY]: 1500}, 350);
		}

		Memory.PraiseGCL = {};
		for (let room in PRAISE_GCL_ROOMS) {
			
			if (!Game.rooms[room] || !Game.rooms[room].controller) { continue; }
			let controller = Game.rooms[room].controller;
			if (controller.level < 4 &&
				energyRequiredForRcl(4, Game.rooms[room].controller) > Game.rooms[room].store(RESOURCE_ENERGY)
			){
				if (!Memory.helpNeeded[room]) {
					let roomsInRange = getMyClosestRooms(room, 4);
					Memory.helpNeeded[room] = {};
					Memory.helpNeeded[room].assignedSpawn = roomsInRange;
				}				
			} else if (controller.level >= 4 && controller.level < 6 && 
				Memory.rooms[room] && 
				Memory.rooms[room].myRoom && 
				Game.rooms[room].storage && Game.rooms[room].storage.freeSpace > 30000 && 
				energyRequiredForRcl(6, Game.rooms[room].controller) > Game.rooms[room].store(RESOURCE_ENERGY)
			) {
				orderEnergyCart(room, 500, 3);
				Memory.PraiseGCL[room] = {};
			} else if (controller.level < CONTROLLER_MAX_LEVEL) {
				Memory.PraiseGCL[room] = {};
			} else if (PRAISE_GCL_ROOMS[room] && controller.level === CONTROLLER_MAX_LEVEL) {	
				// PREPARE TO UNCLAIM
				if (!Game.rooms[room].terminal ) { continue; }
				spawnOprGcl(room);
				Memory.PraiseGCL[room] = {};
				let freeSpace = Game.rooms[room].terminal.freeSpace + Game.rooms[room].storage.freeSpace				

				let upgraders = getCreeps('upgrader', room);
				if (
					( ( freeSpace < 25000 && Game.rooms[room].store(RESOURCE_ENERGY) > 800000) ||
					Game.rooms[room].store(RESOURCE_ENERGY) > 1500000) &&	// 1800200
					upgraders.length >= 12
				) {
					PRAISE_GCL_ROOMS[room].unclaim = 1;
					delete getRoomCache(room).builderJobTs
					console.log("UNCLAIMING GCL PRAISING ROOM! " + room);
				}
			}
		}

		for (let room in Memory.energyCartTargets){
			let timeOut = Memory.energyCartTargets[room].ts || 0;
			if (Game.time > timeOut) {
				delete Memory.energyCartTargets[room];
			}
		}

		let energyGCL = 0;
		let gclRooms = 0;	
		for (let roomName in myRooms){
			if (Game.rooms[roomName] && !Game.rooms[roomName].terminal ||
				PUSH_RCL_TARGETS[roomName] || 
				Memory.PraiseGCL[roomName] || 
				getRoomRCL(roomName) > getRoomPRCL(roomName)
			){
				energyGCL += Game.rooms[roomName].store(RESOURCE_ENERGY);
				gclRooms += 1;
			}
		}

		let averageEnergy = (Memory.Minerals[RESOURCE_ENERGY]-energyGCL) / ((Object.keys(myRooms).length - gclRooms) || 1);
		Memory.avgEnergy = Memory.Minerals[RESOURCE_ENERGY] / Object.keys(myRooms).length;
	//	let highEnergy = limit(averageEnergy * HIGH_ENERGY_MULIPLIER, 0, SHARE_ABOVE)
		let highEnergy = Math.min(averageEnergy * HIGH_ENERGY_MULIPLIER);


		let minimumLocalEnergy = ECONOMY_SURPLUS;
		let roomsAttacked = false;
		if (Object.keys(Memory.roomAttacked).length > 0 ||
			Object.keys(Memory.nukeRampart).length > 0				
		) {
			minimumLocalEnergy = ECONOMY_LOW;
			roomsAttacked = true;
		} else if (Object.keys(PUSH_RCL_TARGETS).length > 0) {
			minimumLocalEnergy = ECONOMY_DEVELOPING;
		}
		

		console.log(" average energy : " + averageEnergy + " share above energy " + highEnergy + " low energy ");
		// SHARE 
		for (let roomName in myRooms){

			if (Game.rooms[roomName].energyStatus() >= minimumLocalEnergy ||
				getRoomPRCL(roomName) === CONTROLLER_MAX_LEVEL && Game.rooms[roomName].energyStatus() >= ECONOMY_STABLE
			){
				if (Memory.PraiseGCL[roomName] || PUSH_RCL_TARGETS[roomName])  { continue; }
				if (!Game.rooms[roomName].terminal) { continue; }
			//	if (Game.rooms[roomName].energyStatus() < minimumLocalEnergy) { continue; }
				if (Memory.rooms[roomName].nukeResponse) { continue; }
				if (Memory.rooms[roomName].sieged) { continue; }
				if (getRoomRCL(roomName) > getRoomPRCL(roomName) && !Memory.rooms[roomName].mineOnly ) { continue; }


				if (Memory.energyShare === undefined) {Memory.energyShare = {}; }
				Memory.energyShare[roomName] = {};
			}
		}

		// RECIEVE
		let lowRcl = Math.min(7, Memory.myRoomHighPRCL)
		if (Memory.energyShare !== undefined) {
			if (Memory.energyShare.recieve === undefined) {Memory.energyShare.recieve = {}; }

			let underAttack = false;
			for (let roomName in myRooms){

			//	if (Memory.energyShare[room]) { continue; }
				if (Game.rooms[roomName].terminal === undefined || getRoomRCL(roomName) < 6) { continue; }

				if (Memory.rooms[roomName].mineOnly && Game.rooms[roomName].terminal && Game.rooms[roomName].energyStatus() >= ECONOMY_LOW ) { continue; }

				let lowEnergy = averageEnergy * LOW_ENERGY_MULIPLIER;
				if (Game.rooms[roomName].controller.level === CONTROLLER_MAX_LEVEL) {
					lowEnergy = averageEnergy * LOW_ENERGY_RCL8_MULIPLIER;
				}

				let roomUnderAttack = (
					Memory.rooms[roomName].sieged ||
					Memory.rooms[roomName].nukeResponse ||
					roomIsSafeModeCd(roomName) > 1000 ||
					(Memory.rooms[roomName].reinforce && Game.time < Memory.rooms[roomName].reinforce))
				
				underAttack = underAttack || roomUnderAttack	

				if (roomUnderAttack ||
					(isAssistedLevelingSpawn(roomName) && SEASONAL_THORIUM) ||
					((getRoomPRCL(roomName) < getRoomRCL(roomName) && !Memory.rooms[roomName].newRCL) && 
					Game.rooms[roomName].store(RESOURCE_ENERGY) < highEnergy)
				){
					Memory.energyShare.recieve[roomName] = {};
					Memory.energyShare.recieve[roomName].amount = highEnergy;

				} else if (Game.rooms[roomName].store(RESOURCE_ENERGY) < lowEnergy) {
					Memory.energyShare.recieve[roomName] = {};
					Memory.energyShare.recieve[roomName].amount = lowEnergy;
				}
			}

			for (let room in Memory.PraiseGCL ){					
				if (Game.rooms[room].terminal !== undefined && getRoomRCL(room) >= 6) {
					if (!Memory.energyShare[room]) {
						Memory.energyShare.recieve[room] = {};
						Memory.energyShare.recieve[room].amount =  Math.max(2500000, highEnergy);
					}
				}
			}

			for (let room in PUSH_RCL_TARGETS){
				if (Game.rooms[room] && Game.rooms[room].terminal && getRoomRCL(room) >= 6) {
					if (!Memory.energyShare[room] && !Memory.energyShare.recieve[room]) {
						Memory.energyShare.recieve[room] = {};
						Memory.energyShare.recieve[room].amount = Math.max(2500000, highEnergy);
					}

					Memory.energyShare.recieve[room].pushRCL = 1;

				}
			}

			for (let room in ENERGYSHARE_ALLIES){
				if (Memory.energyShare.recieveAllies === undefined) {Memory.energyShare.recieveAllies = {}; }
				if (Memory.energyShare.recieveAllies[room] === undefined) { Memory.energyShare.recieveAllies[room] = {}; }
			}

			for (let room in Memory.energyShare.recieve){
				delete Memory.energyShare[room];
			}

			if (!underAttack && maxLevelRooms >= 4 && Object.keys(levelingRooms.length > 1) && Object.keys(Memory.energyShare).length > 5) {
				for (let room in levelingRooms){

					if (Game.rooms[room].store(RESOURCE_ENERGY) < highEnergy) {
						Memory.energyShare.recieve[room] = {}
						Memory.energyShare.recieve[room].pushRCL = 1;
						Memory.energyShare.recieve[room].amount =  Math.max(2500000, highEnergy);
					}
					
					delete Memory.energyShare[room];					
				}
			}
		}

		
	}
}

function handleMinerals(myRooms) {
	if (Game.time % 61 === 0 || !Memory.Minerals){

		// CLEAR SEND ONCE ORDERS THAT DONT EXIST ANYMORE
		for (let room in Memory.sendOneTime){
			if (!SEND_ONE_TIME[room]) {
				console.log("deleting old Send Once order "+ room + JSON.stringify(Memory.sendOneTime[room]) );
				delete Memory.sendOneTime[room]; 
			}
		}

		delete Memory.Minerals;
		if (Memory.Minerals === undefined) {
			Memory.Minerals = {}; 
			Memory.Minerals.mineralShare = {};
			Memory.Minerals.mineralRecieve = {};
			Memory.Minerals.mineralSell = {};
		}

		global.requestString = {};
		global.requestString.advancedTrading  = {};

		/*
		requestHelp(roomName, priority) {
			let request = {requestType: requestTypes.DEFENSE, roomName: roomName, priority: (priority === undefined ? 0 : priority)}
			requestArray.push(request)
		},
		*/


		let sortable = [];
		for (let roomName in myRooms){
			if (Game.rooms[roomName].terminal !== undefined ) {
				for (let res in Game.rooms[roomName].terminal.store){
					if (Memory.Minerals[res] === undefined) {Memory.Minerals[res] = 0; }
					Memory.Minerals[res] += Game.rooms[roomName].terminal.store[res];

				}
			}
			if (Game.rooms[roomName].storage !== undefined) {
				for (let res in Game.rooms[roomName].storage.store){
					if (Memory.Minerals[res] === undefined) {Memory.Minerals[res] = 0; }
					Memory.Minerals[res] += Game.rooms[roomName].storage.store[res];						
				}
			}
			sortable.push([roomName, Game.rooms[roomName].store(RESOURCE_ENERGY)]);
		}
		
		sortable.sort(function(a, b) {
			return b[1] - a[1];});

		let length = sortable.length;
		
		if (Memory.Minerals.PS === undefined) {Memory.Minerals.PS = {}; }
		// COUNT MY ROOMS WITH POWERSPAWN
		for (let i=0; i<length; i++) {
			let roomName = sortable[i][0];
			if (Game.rooms[roomName].hasPowerSpawn() > 0) {
				Memory.Minerals.PS[roomName] = {};
				Memory.Minerals.PS[roomName] = Game.rooms[roomName].store(RESOURCE_POWER);
			}
		}


		// COUNT MY ROOMS WITH LABS AND SET ROOM SELL
		if (Memory.Minerals.Labs === undefined) {Memory.Minerals.Labs = {}; }		
		
		let myLabRooms = {}
		for (let roomName in myRooms) {
			let roomData = Memory.rooms[roomName]
			if (Game.rooms[roomName].hasLabs() > 0 ) {
				myLabRooms[roomName] = roomData
			}
		}		

		let amountOfLabRooms = Object.keys(myLabRooms).length

		// BUY AND SELL ORDERS
		let MineralSellAbove = SELL_MINERAL_ABOVE * Math.max(amountOfLabRooms, 1);
		if (!Memory.buildTerminal || DISABLED_MARKET) {
			MineralSellAbove *= 1.5;
		}
		let MineralBuyBelow = BUY_MINERAL_BELOW * Math.max(amountOfLabRooms, 1);
		let MineralShareAbove = MineralSellAbove - 15000;
		let MineralRequestBelow = Math.max(MineralBuyBelow+ 5000 , 0);
	//	let credits = Game.market.credits;

	
		global.requestString.basicTrading = {
			room: 'E3N15',
			energy: false,
			H: false,
			O: false,
			X: false,
			U: false,
			L: false,
			Z: false,
			K: false,
		};

		global.requestString.requestArray = [];

		let ownedBaseMinerals = [];
		for (let idx in BASE_MINERALS){
			
			let res = BASE_MINERALS[idx];

			if (res === RESOURCE_ENERGY) { continue; }			

			let shareAbove = MineralShareAbove;
			/*
			if (res === RESOURCE_POWER) {
			//	shareAbove = 7500;
			}*/

			if (Memory.Minerals[res] === undefined || Memory.Minerals[res] < MineralRequestBelow) {
				global.requestString.basicTrading[res] = true;

				if (Memory.Minerals.mineralRecieve && Memory.Minerals.mineralRecieve[res]) {
					let roomName = Object.keys(Memory.Minerals.mineralRecieve[res])[0];

					let request = {requestType: res, roomName: roomName, priority: 0 }
					global.requestString.requestArray.push(request)

				}
				
			} else if (Memory.Minerals[res] !== undefined && Memory.Minerals[res] > shareAbove) {
				if (Memory.Minerals.Share === undefined) {Memory.Minerals.Share = {}; }
				if (Memory.Minerals.Share[res] === undefined) {Memory.Minerals.Share[res] = {}; }
				Memory.Minerals.Share[res] = Memory.Minerals[res] - MineralShareAbove;
			}

			if (BOT_MODE && res === RESOURCE_POWER) { continue; }

			if (Memory.Minerals[res] === undefined || Memory.Minerals[res] < MineralBuyBelow) {
				// BUY					
				if (Memory.Minerals.Buy === undefined) {Memory.Minerals.Buy = {}; }
				if (Memory.Minerals.Buy[res] === undefined) {Memory.Minerals.Buy[res] = {}; }
				let currentStock = Memory.Minerals[res] || 0;
				Memory.Minerals.Buy[res] = limit(MineralBuyBelow-currentStock, BUY_MINERAL_BELOW, MineralBuyBelow);

			} else if (Memory.Minerals[res] !== undefined ) {

				if (res === RESOURCE_POWER) { continue; }	// never selll power?
				
				if (!Memory.buildLabs && Memory.Minerals[res] > 3000 ) {	// Build labs?
					ownedBaseMinerals.push(res);
				}

				let compressedMinerals = COMPRESSED_RESOURCE_FROM_RAW[res].raw;
				let bars = (Memory.Minerals[compressedMinerals] || 0 ) * 5;

				if ((Memory.Minerals[res] + bars) > MineralSellAbove ) {
					// SELL
					if (Memory.Minerals.Sell === undefined) {Memory.Minerals.Sell = {}; }

					let preferSellBars = false;
					if (ENABLE_FACTORIES && Memory.factories && Object.keys(Memory.factories).length > 0) {
						preferSellBars = (getMarketRatioOfCommodity(compressedMinerals) > 1.1)
					}
																	
					if (preferSellBars) {
						if (Memory.Minerals.Sell[compressedMinerals] === undefined) {Memory.Minerals.Sell[compressedMinerals] = {}; }
						Memory.Minerals.Sell[compressedMinerals] = ((Memory.Minerals[res] + bars) / 5) - (MineralSellAbove / 5)
					} 
					
					let amountToSell = Memory.Minerals[res] - MineralSellAbove;
					if (!preferSellBars || 
						(amountToSell > 100000 && unStuck(0.995) )
					) {
						// RAW
						if (Memory.Minerals.Sell[res] === undefined) {Memory.Minerals.Sell[res] = {}; }
						Memory.Minerals.Sell[res] = amountToSell
					}
				}
			}

			if (!BOT_MODE && checkMineralExtractProfitable(res) === false && (Memory.Minerals[res] !== undefined && Memory.Minerals[res] > MineralBuyBelow * 0.33)) {
				if (Memory.Minerals.Skip === undefined) {Memory.Minerals.Skip = {}; }
				Memory.Minerals.Skip[res] = {};
			} else if (DISABLED_MARKET && Memory.Minerals.Sell && Memory.Minerals.Sell[res]) {
				if (Memory.Minerals.Skip === undefined) {Memory.Minerals.Skip = {}; }
				Memory.Minerals.Skip[res] = {};
			}
		}

		
		
		let highLevelRooms = {};
		for (let roomName in myLabRooms){
			let _room = roomName;
			Memory.Minerals.Labs[_room] = {};
			
			if (!Memory.buildFactory && Memory.buildTerminal && Memory.myRoomHighRCL >= 7) {
				if (getRoomPRCL(roomName) >= 7) {
					highLevelRooms[roomName] = {};
				}
			}

			for (let idx in BASE_MINERALS_SHARE){	
				let res = BASE_MINERALS_SHARE[idx];
				
				let rawMinerals = Game.rooms[_room].store(res);

				let compressedMinerals
				let barsEq = 0;	// bars equivalent
				if (res !== RESOURCE_POWER && COMPRESSED_RESOURCE_FROM_RAW[res]) { 
					compressedMinerals = COMPRESSED_RESOURCE_FROM_RAW[res].raw; 
					barsEq = Game.rooms[_room].store(compressedMinerals) * 5
				}
				let storedInRoom = rawMinerals + barsEq;
				let minWantedAmount = BUY_MINERAL_BELOW - MINERAL_MIN_SEND;
				let shareAboveAmount = MINERAL_MIN_AMOUNT_STORED + MINERAL_MIN_SEND;

				if (res === RESOURCE_POWER) {
					minWantedAmount *= 0.5;
					shareAboveAmount *= 0.5;
				} else if (SEASONAL_SCORE && res === RESOURCE_SCORE) {
					minWantedAmount *= 5;
					shareAboveAmount *= 5;
				}


				if (rawMinerals < minWantedAmount) {
					if (Memory.Minerals.mineralRecieve[res] === undefined) { 
						Memory.Minerals.mineralRecieve[res] = {};
					}
					Memory.Minerals.mineralRecieve[res][_room] = {};

				} else if (storedInRoom > shareAboveAmount) {
					
					if (Memory.Minerals.mineralShare[_room] === undefined) { 
						Memory.Minerals.mineralShare[_room] = {};
					}

					if (res === RESOURCE_POWER ||
						(SEASONAL_SCORE && res === RESOURCE_SCORE)
					) { 
						Memory.Minerals.mineralShare[_room][res] = {};
						continue; 
					}

					if (Memory.Minerals.mineralSell[res] === undefined) {
						Memory.Minerals.mineralSell[res] = {};														
					}						

					if (rawMinerals > MINERAL_MIN_AMOUNT_STORED + MINERAL_MIN_SEND) {
						Memory.Minerals.mineralSell[res][_room] = rawMinerals;
						Memory.Minerals.mineralShare[_room][res] = {};
					}

					if (Memory.Minerals.Sell && Memory.Minerals.Sell[compressedMinerals]) {
						
						let amountToCompress = storedInRoom - (MINERAL_MIN_AMOUNT_STORED + MINERAL_MIN_SEND) - barsEq;
						if (amountToCompress > 0 && (barsEq < maxStoreInRoom(res) * 15)) {

							if (Memory.Minerals.mineralCompress === undefined) {Memory.Minerals.mineralCompress = {} }
							if (Memory.Minerals.mineralCompress[_room] === undefined) {Memory.Minerals.mineralCompress[_room] = {} }

							if (Memory.Minerals.mineralCompress[_room][compressedMinerals] === undefined) {
								Memory.Minerals.mineralCompress[_room][compressedMinerals] = {} 
							}

							Memory.Minerals.mineralCompress[_room][compressedMinerals] = amountToCompress / 5  ;								
						}

						if (Memory.Minerals.mineralSell[compressedMinerals] === undefined) {
							Memory.Minerals.mineralSell[compressedMinerals] = {};														
						}

						
						Memory.Minerals.mineralSell[compressedMinerals][_room] = storedInRoom / 5;
						
					}
					
				}
			}
		}

		// SET GLOBAL LIMITS
		let myLabsCount = Object.keys(Memory.Minerals.Labs).length;
		let minimumAmountRoom = LAB_MINERAL_CAPACITY;
		let requiredMinimumStock = minimumAmountRoom * myLabsCount;
		for (let boost in T3_BOOSTS){
			let compund = T3_BOOSTS[boost];
			let currentStock = Memory.Minerals[compund] || 0;
		//	let requiredByRatio = T3_BOOST_BUILD_RATIO[compund] * requiredMinimumStock;
			if (currentStock < requiredMinimumStock) {
				Memory.T3Setpoints[compund] = requiredMinimumStock;
			}
		}

		if (!Memory.buildTerminal && !DISABLED_TERMINAL && Memory.myRoomHighRCL >= 7 && Memory.Minerals.Sell){	
			Memory.buildTerminal = true;
		}

		if (!Memory.buildFactory && Object.keys(highLevelRooms).length >= 2) {
			for (let room in highLevelRooms) {
				for (let room2 in highLevelRooms) {
					if (room === room2) { continue; }
					if (getRoomLinearDistance(room, room2) > 6) {
						Memory.buildFactory = true;
						break;
					}
				}
			}
		}
		

		if (!Memory.buildLabs && ownedBaseMinerals.length >= 2 && Memory.myRoomHighRCL >= 7){
			Memory.buildLabs = true;
		}
		
	//	let minimumOrderAmount = 20000;
	//	let MineralBuyOrderBelow = 20000;

		// SORT BY MOST TO BUY
		if (Memory.Minerals.Buy) {
			sortable = [];
			for (let res in Memory.Minerals.Buy) {
				sortable.push([res, Memory.Minerals.Buy[res]]);
			}

			sortable.sort(function(a, b) {
				return b[1] - a[1];
			});
			Memory.Minerals.Buy = {};
			for (let idx in sortable){				
				Memory.Minerals.Buy[sortable[idx][0]] = {};
				Memory.Minerals.Buy[sortable[idx][0]] = sortable[idx][1];
			}
		}

		// SORT BY MOST TO SELL
		if (Memory.Minerals.Sell) {
			sortable = [];
			for (let res in Memory.Minerals.Sell) {
				sortable.push([res, Memory.Minerals.Sell[res]]);
			}
			sortable.sort(function(a, b) {
				return b[1] - a[1];
			});
			Memory.Minerals.Sell = {};
			for (let idx in sortable){
				Memory.Minerals.Sell[sortable[idx][0]] = {};
				Memory.Minerals.Sell[sortable[idx][0]] = sortable[idx][1];
			}
		}
	}
}

function generatePixels() {
	if (Game.cpu.bucket < 11000) { return; }
	Game.cpu.generatePixel();
	Memory.lastPixel = Game.time;
}

function removeSegment(id, worstBaseScore) {
	console.log("want to delete " + id + " has score " + worstBaseScore)
	lib_segments.clear(id);
	delete global.__segbuffer[id];
	requestMemSave();
	if (accessMemorySegment(SEGMENT_ALL_ROOM_OOB) ) {
		let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);
		if (segmentOOB && segmentOOB.oob && segmentOOB.oob[id]) {
			delete segmentOOB.oob[id];
			saveMemorySegment(SEGMENT_ALL_ROOM_OOB, segmentOOB);
		}
	}
}

global.THRESHOLD_VALUBALE = 15000;
global.valuableScoreStore = function(structure, ignoreRampart = false) {

	if (structure._value !== undefined) { return structure._value > global.THRESHOLD_VALUBALE}
	structure._value = 0;

	if (!SEASONAL_SCORE && !SEASONAL_SYMBOLS && !SEASONAL_THORIUM) { return false; }
	if (!structure || !structure.store) { return false; }
	if (structure.pos.lookForStructure(STRUCTURE_RAMPART)) {return false; }	

//	let playerName = getPlayerByRoomName(structure.room.name)
//	if (!playerName || !playerIsDead(playerName)) { return false; }

	for (let res in structure.store) {	
		let amount = structure.store[res];
		if (structure.store[res] == 0) { continue; }
		structure._value += getResourceWorth(res) * amount;
	}

	return structure._value > global.THRESHOLD_VALUBALE;
}

global.playerIsDead = function(playerName) {
	if (playerName === "Invader") { return false; }
	if (!Memory.players[playerName]) { return false; }
	if (Memory.players[playerName].highPRCL === 0 && !Memory.players[playerName].revived ) { return true;}
	return false;
}

global.addRage = function(enemy, amount) {
	if (!enemy || enemy === 'Invader') { return; }
	if (Memory.rage[enemy] === undefined) {
		Memory.rage[enemy] = {}
		Memory.rage[enemy].raw = 0;
	}
	Memory.rage[enemy].raw += amount || 0;
}

global.rageDecay = function() {
	let maxRawRage = 1;

	for (let enemy in Memory.rage) {
		Memory.rage[enemy].raw *= 0.97;
		Memory.rage[enemy].raw = Number(Memory.rage[enemy].raw.toFixed(1));
		if (Memory.rage[enemy].raw < 250) { 
			Memory.rage[enemy].raw  = 0; 
			delete Memory.rage[enemy] 
		}
		maxRawRage = Math.max(maxRawRage, Memory.rage[enemy].raw);
	}

	for (let enemy in Memory.rage) {
		Memory.rage[enemy].rage = Math.max(0, Memory.rage[enemy].raw - 2000) / maxRawRage;
		Memory.rage[enemy].rage = Number(Memory.rage[enemy].rage.toFixed(1));

		if (Memory.rage[enemy].raw > 1000000) {
			addToBlackList(enemy);
		}
	}
}

global.playerRageAbove = function(enemy, rageLevel = 0.25) {
	if (!Memory.rage[enemy] || !Memory.rage[enemy].rage || Memory.rage[enemy].rage < rageLevel) { return false; }
	return true;
}

global.getPlayerRage = function(enemy) {
	if (!Memory.rage[enemy] || !Memory.rage[enemy].rage) { return 0; }
	return Memory.rage[enemy].rage
}


function createCaravanTargets(myRooms) {
	if (Game.time % 197 !== 0) {
		return;
	}

	Memory.caravans = {}; 
	let shareAbove = 25000;

	let mineralSources = {};
	for (let roomName in myRooms){
		if (!Game.rooms[roomName]) { continue; }

		for (let res in BASE_MINERALS_OBJECT) {
			let myAmount = Game.rooms[roomName].store(res)
			if (myAmount > shareAbove) {
				if (mineralSources[res] === undefined) { 
					mineralSources[res] = {} 
					mineralSources[res].sources = {}
					mineralSources[res].amount = 0;
				}
				mineralSources[res].amount = Math.max(mineralSources[res].amount, myAmount);
				mineralSources[res].sources[roomName] = {};
			}
		}
	}

	
	for (let res in mineralSources) {

		let requestBelow = limit(mineralSources[res].amount-50000, 10000, 30000);

		for (let roomName in myRooms){
			let dest = roomName;
			if (!Game.rooms[dest] || !Game.rooms[dest].storage) { continue; }

			if (Memory.rooms[dest].mineral) {
				let mineralId = Object.keys(Memory.rooms[dest].mineral)[0];
				let mineralType = Memory.rooms[dest].mineral[mineralId].type;		
				if (mineralType === res) { continue; }		
			}

			let destAmount = Game.rooms[dest].store(res);

			if (destAmount < requestBelow) {

				let bestSourceRoom;
				let bestSourceScore = -100;
				for (let source in mineralSources[res].sources){

					if (getRoomLinearDistance(source, dest) >= 10) { continue; }	
					let routeLength = getRouteDistanceOnly(source, dest)
					if (routeLength > 10) { continue; }

					let sourceAmount = Game.rooms[source].store(res);
					if ((sourceAmount - destAmount) < 20000) { continue; } 

					let score = 0;
					score -= routeLength / 5;
					score += sourceAmount / 100000;

					if (score > bestSourceScore) {
						bestSourceScore = score;
						bestSourceRoom = source;
					}
				}

				if (bestSourceRoom) {
					if (Memory.caravans[bestSourceRoom] === undefined) { Memory.caravans[bestSourceRoom] = {} }
					if (Memory.caravans[bestSourceRoom][res] === undefined) { Memory.caravans[bestSourceRoom][res] = {} }
					Memory.caravans[bestSourceRoom][res][dest] = {};
				}
			}
		}
	}




}

let mapVisuals;

let hRED = '#FF0000';
let hORANGE = "#FFA500"
let hYELLOW = '#FFFF00'
let hGREEN = '#00FF00';
let hBLUE = '#00FFFF';
let hBLACK = '#000000';
let hWHITE = '#FFFFFF';

let iconPos = {};
function getIconPos(roomName) {
	if (iconPos[roomName] === undefined) {
		iconPos[roomName] = [];
		iconPos[roomName].push({pos: new RoomPosition(49,45, roomName), align: 'right'});
		iconPos[roomName].push({pos: new RoomPosition(49,25, roomName), align: 'right'});
		iconPos[roomName].push({pos: new RoomPosition(49,5, roomName), align: 'right'});
		iconPos[roomName].push({pos: new RoomPosition(0,45, roomName), align: 'left'});
		iconPos[roomName].push({pos: new RoomPosition(0,25, roomName), align: 'left'});
		iconPos[roomName].push({pos: new RoomPosition(0,5, roomName), align: 'left'});		
	}

	if (iconPos[roomName].length > 0) {
		return iconPos[roomName].pop();
	}
}

global.nFormatter = function(num, digits=1) {
	let si = [
	  { value: 1, symbol: "" },
	  { value: 1E3, symbol: "k" },
	  { value: 1E6, symbol: "M" },
	  { value: 1E9, symbol: "G" },
	  { value: 1E12, symbol: "T" },
	  { value: 1E15, symbol: "P" },
	  { value: 1E18, symbol: "E" }
	];
	let rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
	let i;
	for (i = si.length - 1; i > 0; i--) {
	  if (num >= si[i].value) {
		break;
	  }
	}
	return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
}

global._enableMapVisuals = 0;
global.enableMapVisuals = function(time = 1500){
	global._enableMapVisuals = Game.time + time;
	mapVisuals = null;
}

global.showClaimTargets = 20;
function drawMapVisuals(myRooms){
	if ((Game.cpu.bucket < 1000 || !BOT_MODE) && Game.time > global._enableMapVisuals) { return 0; }


	if (mapVisuals && Game.time % 97 !== 1) {
		Game.map.visual.import(mapVisuals)
		return;
	}

	iconPos = {};

	// 🌑🌘🌗🌖🌕
	for (let roomName in myRooms){
		let icon = getIconPos(roomName);

		if (!Game.rooms[roomName]) {
			continue;
		}

		let energy = Game.rooms[roomName].energyStatus();

		let text = '🌑';
		if (energy === ECONOMY_LOW) {
			text = '🌘';
		} else if (energy === ECONOMY_DEVELOPING) {
			text = '🌗';
		} else if (energy === ECONOMY_STABLE) {
			text = '🌖';
		} else if (energy === ECONOMY_SURPLUS || energy === ECONOMY_RICH) {
			text = '🌕';
		}


		if (Game.rooms[roomName].controller.level < CONTROLLER_MAX_LEVEL) {
			let percentage = Game.rooms[roomName].controller.progress / Game.rooms[roomName].controller.progressTotal;
			text += (Game.rooms[roomName].controller.level + percentage).toFixed(2);
		} else {
			text += Game.rooms[roomName].controller.level;
		}		

		Game.map.visual.text(text, icon.pos, 
			{color: hBLUE, fontSize: 10, align: icon.align, opacity: 0.5});

		if (Game.rooms[roomName].controller.safeMode) {
			icon = getIconPos(roomName);
			text = '⛨' + nFormatter(Game.rooms[roomName].controller.safeMode, 1);
			Game.map.visual.text(text, icon.pos, 
				{color: hBLUE, fontSize: 10, align: icon.align, opacity: 0.5});
		}

		if (SEASONAL_THORIUM) {			
			let thorium = Game.rooms[roomName].getThorium();
			if (thorium && thorium.mineralAmount > THORIUM_MIN_EXTRACTOR) {
				icon = getIconPos(roomName);
				text = '☣️' + nFormatter(thorium.mineralAmount , 0);
				Game.map.visual.text(text, icon.pos, 
					{color: hGREEN, fontSize: 10, align: icon.align});
			}			
		}


	}

	if (SEASONAL_THORIUM) {
		if (Memory.bestThoriumClaim) {
			let roomName = Memory.bestThoriumClaim
			let icon = getIconPos(roomName);

			let thoriumAvailable = 0;
			if (Memory.rooms[roomName] && Memory.rooms[roomName].thorium) {
				for (let id in Memory.rooms[roomName].thorium) {
					thoriumAvailable += Memory.rooms[roomName].thorium[id].mineralAmount || 0;
				}
			}
			let text = '☣️' + nFormatter(thoriumAvailable , 0);
			Game.map.visual.text(text, icon.pos, 
				{color: hGREEN, fontSize: 10, align: icon.align});
		}

		if (!isCpuLimited() || Game.time < global._enableMapVisuals) {
			for (let room in Memory.expansionTarget) {
				if (!Memory.expansionTarget[room].thoriumScore) { continue; }
				let thoriumAvailable = Memory.expansionTarget[room].thoriumScore * 60 ;
	
				let icon = getIconPos(room);
				let text = '☣️' + nFormatter(thoriumAvailable , 0);
				let color = hRED;
				if (thoriumAvailable > 60000) {
					color = hGREEN;
				} else if (thoriumAvailable > 40000) {
					color = hYELLOW;
				} else if (thoriumAvailable > 20000) {
					color = hORANGE;
				} 
	
				Game.map.visual.text(text, icon.pos, 
					{color: color, fontSize: 10, align: icon.align});
			}
		}
		
	}

	// MY ROOMS UNDER ATTACK
	for (let room in Memory.roomAttacked) {

		let defend = getIconPos(room);
		if (!defend) { continue; }	// no free icon slots?
		
		let text = '🛡️';
		if (Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.strength) {
			text += ' ' + nFormatter(Memory.rooms[room].hostiles.power.strength, 1);
		}

		Game.map.visual.text(text, defend.pos, 
			{color: hRED, fontSize: 10, align: defend.align});

		for (let remoteSpawner in Memory.roomAttacked[room].assignedSpawn) {

			text = '➡️🛡️';
			let spawner = getIconPos(remoteSpawner);
			if (!spawner) { continue; }	// no free icon slots?

			Game.map.visual.text(text, spawner.pos, 
				{color: hRED, fontSize: 10, align: spawner.align});

			Game.map.visual.line(spawner.pos, defend.pos,
				{color: hGREEN, lineStyle: 'dashed'});

		}
	}

	// 💰💸💳💵📈📉⚖️
	// 🛡️⚔️🗡️🏹🔫💣🛠️⚒️⛏️🩹🛐🏗️⚖️
	// 🌡️🗺️⌛🎛️🔢⏪🚻🛑💤☢️
	// 🚄🚃
	

	// PUSH RCL ROOM
	for (let room in PUSH_RCL_TARGETS) {
		let push = getIconPos(room);
		let text = '🛐';

		if (Game.rooms[room] && Game.rooms[room].controller && Game.rooms[room].controller.progressTotal) {
			let percentage = Game.rooms[room].controller.progress / Game.rooms[room].controller.progressTotal;
			text += Math.floor(percentage*100) +'%'
		}
		Game.map.visual.text(text, push.pos, 
			{color: hGREEN, fontSize: 10, align: push.align});
	}

	// NUKES ON ROOMS
	for (let room in Memory.nukes) {
		let nuke = getIconPos(room);
		let text = '☢️';

		if (Memory.nukes[room].nukes) {
			let amount = Object.keys(Memory.nukes[room].nukes).length;
			if (amount === 0) {
				delete Memory.nukes[room];
			}
			text += amount
		}
		Game.map.visual.text(text, nuke.pos, 
			{color: hRED, fontSize: 10, align: nuke.align});

	}

	for (let room in Memory.score) {
		for (let id in Memory.score[room].score) {
			let score = Memory.score[room].score[id]
			let pos = posLoad(score.pos)
			let text = '💰' + nFormatter(score.amount, 1);
			Game.map.visual.text(text, pos, 
				{color: hRED, fontSize: 5});

		}
	}




	/*
	for (let room in Memory.energyShare) {

	} */
	
	// SHOW TOP 10 EXPANSION TARGETS
	// 🚧🏗️ 🪛 🔧 🔨 ⚒ 🛠 ⛏ 🪚 🔩⚙️
	
	if (!isCpuLimited() || Game.time < global._enableMapVisuals) {
		sortExpansionTargets(Memory.expansionTarget)

		let color = hBLUE;
		let idx = 0;
		for (let roomName in Memory.expansionTarget) {
			if (!Memory.expansionTarget[roomName].score) { continue; }
			idx++;
			let text = idx + "🚧" + nFormatter(Memory.expansionTarget[roomName].score, 1);
			let claim = getIconPos(roomName);

			Game.map.visual.text(text , claim.pos, 
				{color: color, fontSize: 10, align: claim.align, opacity: 0.5});
			


			// Base score
			let baseLayoutScore = "-";
			if (Memory.expansionTarget.baseCalc && 
				Memory.expansionTarget.baseCalc[roomName] &&
				Memory.expansionTarget.baseCalc[roomName].roomScore
			){
				baseLayoutScore = nFormatter(Number(Memory.expansionTarget.baseCalc[roomName].roomScore), 1);				
			}
			
			text = baseLayoutScore + "🏗️";
			claim = getIconPos(roomName);
			Game.map.visual.text(text , claim.pos,
				{color: color, fontSize: 10, align: claim.align, opacity: 0.5});

			if (idx >= global.showClaimTargets) { break;}
		}

		/*
		createMyTerritory();
		for (let room in global._myTerritory) {
			let pos = getIconPos(room);
			let text = global._myTerritory[room];

			Game.map.visual.text(text, pos.pos, 
				{color: hGREEN, fontSize: 10, align: pos.align});
		}*/
	}

	// EXPANSION TARGET
	if (Memory.expansionTarget && Memory.expansionTarget[NEXT_EXPANSION] && Memory.expansionTarget[NEXT_EXPANSION].roomName) {

		let claim = getIconPos(Memory.expansionTarget[NEXT_EXPANSION].roomName);
		let color = hBLUE;
		if (Memory.expansionTarget[NEXT_EXPANSION].assignedClaimer) {
			color = hGREEN;

			let claimer = new RoomPosition(25,25, Memory.expansionTarget[NEXT_EXPANSION].assignedClaimer);
			Game.map.visual.line(claim.pos, claimer,
				{color: color, lineStyle: 'dashed'});
		}

		let text = "🏗️" + nFormatter(Memory.expansionTarget[NEXT_EXPANSION].highScore, 1);

		Game.map.visual.text(text , claim.pos, 
			{color: color, fontSize: 10, align: claim.align, opacity: 0.5});
	}

	iconPos = {};	// no need to keep this
	mapVisuals = Game.map.visual.export();
}



global.isAbandonedRoom = function(roomName){
	if (global.setAbandonedRoomsTs === undefined || Game.time > global.setAbandonedRoomsTs) {		
		global.setAbandonedRoomsTs = Game.time + 137;
		setAbandon();
	}
	return ABANDON_SHIP[roomName];
}

global.setAbandon = function(){

	let myRooms = getMyRooms();

	for (let room in ABANDON_SHIP) {		
		if (!Memory.rooms[room].evacRes && 
			!Memory.rooms[room].abandonResources
		){
			delete ABANDON_SHIP[room];
		}
	}


	for (let roomName in myRooms) {
		if (Memory.rooms[roomName].abandonResources) {
			ABANDON_SHIP[roomName] = {};
		}
		if (Memory.rooms[roomName].evacRes && Game.time < Memory.rooms[roomName].evacRes) {
			ABANDON_SHIP[roomName] = {};
		} else {
			delete Memory.rooms[roomName].evacRes;
		}
	}	
}


global.setGCLPraiseRoom = function(myRooms) {

	if (Game.shard.name !== "shard1") { return; }
	
	let gclTarget = 'E3N17';
	
	if (!Memory.rooms[gclTarget]) { return; }

	let totalFreeSpace = 0;
	let storages = 0;
	
	myRooms = myRooms || getMyRooms();

	for (let roomName in myRooms) {
				
		if (roomName === gclTarget) { continue; }
		let storage = Game.rooms[roomName].storage;

		if (!storage) { continue; }
		totalFreeSpace += storage.freeSpace;
		storages++;
	}

	let avarageFreeSpace = totalFreeSpace / storages;

	if (Memory.Minerals[RESOURCE_ENERGY] > (storages * 650000) || avarageFreeSpace < 50000) {
		Memory.rooms[gclTarget].GCLPRAISE = 1;
	} else if (Memory.Minerals[RESOURCE_ENERGY] < (storages * 300000) && 
		Memory.rooms[gclTarget] && getRoomRCL(gclTarget) >= 6
		){
		delete Memory.rooms[gclTarget].GCLPRAISE;		
	}

	
	if (Memory.rooms[gclTarget].GCLPRAISE) {
		global.PRAISE_GCL_ROOMS[gclTarget] = {}; 
		restockRes(gclTarget, myRooms, RESOURCE_OPS, 500);
	} else {
		delete global.PRAISE_GCL_ROOMS[gclTarget];
		delete global.PUSH_RCL_TARGETS[gclTarget];
	}
	return Memory.rooms[gclTarget].GCLPRAISE;
}


global.createNewRoomPlans = function(myRooms){
	if (!Memory.curActivePlanner) {
		let lowestScore = 5;	// only check for rooms with lower score than this
		let lowestRoom;
		for (let roomName in myRooms) {
			if (isGCLPraiseRoomStandby(roomName)) { continue; }
			if (Memory.rooms[roomName].baseLayoutRating === undefined) { continue; }			
			if (Memory.rooms[roomName].romPlnV === CURRENT_ROOMPLANNER_VERSION) { continue; }
			if (Memory.rooms[roomName].testedPlnV === CURRENT_ROOMPLANNER_VERSION) { continue; }

			if (Memory.rooms[roomName].baseLayoutRating < lowestScore){
				lowestScore = Memory.rooms[roomName].baseLayoutRating;
				lowestRoom = roomName;
			}
		}
		if (lowestRoom) {
			log("worst room "+ lowestRoom + " with score " + lowestScore);
			Memory.curActivePlanner = lowestRoom;
		}
	}

	if (Memory.curActivePlanner && 
		!Memory.rooms[Memory.curActivePlanner].rebuild
		) {
		let segmentId = "BaseEval";
		let baseToCalc = Memory.curActivePlanner;
		
		if (!accessMemorySegment(segmentId)) { return; }
		let segment = getMemorySegment(segmentId);
		if (segment.roomName === undefined || segment.roomName !== baseToCalc) {
			segment = {};
			segment.roomName = baseToCalc;
			saveMemorySegment(segmentId, segment);

			let segmentOOB = getMemorySegment(SEGMENT_ALL_ROOM_OOB);
			delete segmentOOB.oob[segmentId];
			delete global.oob[segmentId];
			if (global.setOusidePixelsObject) {
				delete global.setOusidePixelsObject[segmentId]
			}
			saveMemorySegment(SEGMENT_ALL_ROOM_OOB, segmentOOB);
			requestMemSave();
			return;
		}

		if (Memory.rooms[baseToCalc].baseLayoutRating === undefined) {
			Memory.rooms[baseToCalc].baseLayoutRating = -20;
		}

		if (Game.rooms[baseToCalc]){
			log("calcing base for existing room " + baseToCalc + " current version " + Memory.rooms[baseToCalc].testedPlnV +"/"+ CURRENT_ROOMPLANNER_VERSION + " current score " + Memory.rooms[baseToCalc].baseLayoutRating.toFixed(2))
			global.aiRoomPlanner = require('ai.roomPlanner');
			aiRoomPlanner.createRoomLayout(baseToCalc, segmentId);

			if (segment.blueprintComplete && segment.roomName === baseToCalc) {
				Memory.rooms[baseToCalc].newRoomScore = segment.roomScore;
				Memory.rooms[baseToCalc].testedPlnV = CURRENT_ROOMPLANNER_VERSION;

				let newLayoutIncrease = Memory.rooms[baseToCalc].newRoomScore - Memory.rooms[baseToCalc].baseLayoutRating
				if (newLayoutIncrease > 5) {
					Memory.rooms[baseToCalc].rebuild = 1;

					segment.rommClear = 1;	// prevent blow up of roads etc
					segment.segmentId = baseToCalc;
					saveMemorySegment(baseToCalc, segment);	// overwrite old layout	!
					requestMemSave();
				} else {
					delete Memory.curActivePlanner;
				}
				
			} else {
				if (segment && segment.createTicks > 300 && !segment.blueprintComplete){ 
					// tried, but could not create base
					Memory.rooms[baseToCalc].newRoomScore = -1000;
					Memory.rooms[baseToCalc].testedPlnV = CURRENT_ROOMPLANNER_VERSION;
					
					delete Memory.curActivePlanner;
					requestMemSave();
				}
			}
		}
	}
}

function sellSpareCommodities(myRooms) {

	let commoditiesInProduction = {}
	if (Memory.comodityToProcude) {
		for (let lvl=0; lvl < 5; lvl++ ){
			let myRecepie = getCachedComoditiesForResAtLevel(Memory.comodityToProcude, lvl);

		//	let validComponent = {}
			for (let ingredient in myRecepie) {
				commoditiesInProduction[ingredient] = {};
				for (let component in myRecepie[ingredient].res) {
					commoditiesInProduction[component] = {};
				}
			}
		}		
	}

	for (let roomName in myRooms){
		if (!Game.rooms[roomName].terminal || Game.rooms[roomName].terminal.cd ||  Game.rooms[roomName].terminal.store[RESOURCE_ENERGY] < 5000) { continue; }
		
		for (let res in Game.rooms[roomName].terminal.store){
			if (COMMODITIES[res] && !RAW_MINERALS[res] && !commoditiesInProduction[roomName]) {

			}
		}
	}
}

global.restockRes = function(targetRoom, myRooms, res, minimumAmount = 500, onlySurplus=false){
	if (!Game.rooms[targetRoom] || !Game.rooms[targetRoom].terminal || Game.rooms[targetRoom].store(res) >= minimumAmount) { return 0; }
	if (getRoomPRCL(targetRoom) < 6) { return; }
	if (isAbandonedRoom(targetRoom)) { return; }

	
	let bestAmount = 0;
	let bestRoom;

	if (myRooms === undefined) {
		myRooms = getMyRooms();
	}

	for (let roomName in myRooms) {			
		if (roomName === targetRoom || !Game.rooms[roomName].terminal || Game.rooms[roomName].terminal.__cooldown) { continue; }
		if (onlySurplus && Game.rooms[roomName].store(res) < minimumAmount*2) { continue; }
		if (Game.rooms[roomName].store(res) > bestAmount && Game.rooms[roomName].terminal.store[res]) {
			bestAmount = Game.rooms[roomName].store(res);
			bestRoom = roomName;
		}
	}

	log("want to restock " + res + " in room " + targetRoom + " best room " + bestRoom)

	if (bestRoom) {
		let donorTerminal = Game.rooms[bestRoom].terminal;
		let recieverFreeSpace = Game.rooms[targetRoom].terminal.freeSpace;		
		let boostToSend = Math.min(donorTerminal.store[res], minimumAmount, recieverFreeSpace);

		let cost = Game.market.calcTransactionCost(boostToSend, bestRoom, targetRoom);
		let affordableSend = Math.floor((cost / boostToSend)* donorTerminal.store[RESOURCE_ENERGY]);
		boostToSend = Math.min(affordableSend, boostToSend);	

		let result = donorTerminal.send(res, boostToSend, targetRoom);	
		console.log("restockRes " +bestRoom + " sending " +boostToSend + " " +res + " to " + targetRoom + " result " + result);	
	}
}



function evaluateRemotesAttacked(myRooms) {

	if (Memory.budgetTs < Game.time) { return; }

	let sleepTimer = 15;
	let maxCountingRemotes = 5;
	let countedRemotes = 0;
	let maxRemoteBudget = 20000;	// budget to defend with

	
	Memory.budgetTs = Game.time + sleepTimer;

	// Refill budget
	for (let roomName in myRooms){

		if (Memory.rooms[roomName].remoteBudget === undefined) { Memory.rooms[roomName].remoteBudget = 10000; }

		if (Memory.rooms[roomName].remoteBudget < maxRemoteBudget) {
			for (let remote in Memory.rooms[roomName].remoteMineOps) {

				for (let source in Memory.rooms[roomName].remoteMineOps[remote].sources) {
					Memory.rooms[roomName].remoteBudget += Memory.rooms[roomName].remoteMineOps[remote].sources[source].netEnergy * sleepTimer * 0.1;
					countedRemotes++;
				}
			}
		}		
		if (countedRemotes > maxCountingRemotes) { break; }
	}

	// Check remotes under attack if budget allows
	for (let roomName in myRooms){
		if (Memory.rooms[roomName].remoteBudget < maxRemoteBudget || !Memory.rooms[roomName].spendingRemoteBudget) { continue; }
		if (Memory.rooms[roomName].remoteBudget < 0) { delete Memory.rooms[roomName].spendingRemoteBudget} 
		if (Game.time > Memory.rooms[roomName].spendingRemoteBudget) { delete Memory.rooms[roomName].spendingRemoteBudget; }

		for (let remote in Memory.rooms[roomName].remotesAttacked) {

			if (Game.time < Memory.rooms[roomName].remotesAttacked[remote].ts) { continue; }
			if (!Memory.rooms[remote] || !Memory.rooms[remote].hostiles) { continue; }

			// Start spending budget
			if (!Memory.rooms[roomName].spendingRemoteBudget) {
				Memory.rooms[roomName].spendingRemoteBudget = Game.time + 2500;	// allow spawning until this tick (or budget expended)
			}
		}
	}


	

}

function evaluteBucketAndRestrictRemotes(myRooms) {
	if (!Memory.bucketEvalTs) {
		Memory.bucketEvalTs = Game.time + 1499;
		Memory.avgBucket = Game.cpu.bucket;
		Memory.avgBucketCnt = 0;
		Memory.reducedRemotes = 0;
		Memory.cpuSaving = CPU_SAVING_NONE;
		return;
	}

	Memory.avgBucket = cumulativeAverage(Memory.avgBucket, Game.cpu.bucket, Memory.avgBucketCnt);				
	Memory.avgBucketCnt++ 	

	let generatedPixelSinceLastCheck
	if (Memory.lastPixel) {
		generatedPixelSinceLastCheck = true;		
		delete Memory.lastPixel;
	}

	if (Game.time < Memory.bucketEvalTs && !generatedPixelSinceLastCheck) {
		return;
	}

	let totalRemotes = 0;
	let totalRooms = 0;

	// Increase savings
	if (Memory.avgBucket <= 3500 && !generatedPixelSinceLastCheck) {

		if (Memory.cpuSavings === CPU_SAVING_NONE) {
			Memory.cpuSavings = CPU_SAVING_LOW;
		} else if (Memory.cpuSavings === CPU_SAVING_LOW) {
			Memory.cpuSavings = CPU_SAVING_MEDIUM
		} else {
			Memory.cpuSavings = CPU_SAVING_HIGH
		

			// Remove remote		
			let remoteMineOpsToRemove;
			let worstEps = Infinity;
			let spawnerToReduce;
			let remoteRoom;
			for (let roomName in myRooms) {
				let spawner = roomName;
				if (getRoomPRCL(spawner) < 6) { continue; }	// Wait until terminal to reduce remotes
				totalRooms++;
				for (let remotes in Memory.rooms[spawner].remoteMineOps) {

				//	let suspended = false;
					let remoteOp = Memory.rooms[spawner].remoteMineOps[remotes];

					if (!checkRoomIsActiveMine(remotes)) { continue; }
					totalRemotes++;

					if (remoteOp.eps < worstEps) {

						let suspended = false;
						for (let sourceId in Memory.rooms[spawner].remoteSources) {
							if (remoteOp.sources[sourceId] && 							
								Memory.rooms[spawner].remoteSources[sourceId].suspended) {
								suspended = true;
								break;
							}
						}

						if (suspended) {
							remoteOp.suspended = 1;
							continue;
						} else {
							delete remoteOp.suspended;
							requestMemSave();
						}

						worstEps = remoteOp.eps
						remoteMineOpsToRemove = remoteOp;
						spawnerToReduce = spawner;
						remoteRoom = remotes;

					}
				}
			}

			if (remoteMineOpsToRemove) {
				remoteMineOpsToRemove.suspended = 1;

				for (let sourceId in remoteMineOpsToRemove.sources) {
					if (Memory.rooms[spawnerToReduce].remoteSources[sourceId]) {
						Memory.rooms[spawnerToReduce].remoteSources[sourceId].suspended = 1;
					}
				}

				Memory.worstEps = worstEps;	
				Memory.reducedRemotes += 1;
				log("restricintg remotes for spawner " +spawnerToReduce)
				log("removing remote " +remoteRoom + " ! avg bucket was " + Memory.avgBucket.toFixed(1) + " remotes has EPS " + worstEps)
				
			}
		}
		
	} else if (Memory.avgBucket > 7000 || generatedPixelSinceLastCheck) {

		// Check if i can re enable a remote
		let remoteMineOpsToRemove;
		let spawnerToIncrease;
		let remoteToEnable;
		let bestEps = 0;
		for (let roomName in myRooms) {
			let spawner = roomName;
			for (let remoteName in Memory.rooms[spawner].remoteMineOps) {
				let remoteOp = Memory.rooms[spawner].remoteMineOps[remoteName]				
				if (!remoteOp.suspended) { continue; }
				if (remoteOp.eps > bestEps) {
					bestEps = remoteOp.eps
					remoteMineOpsToRemove = remoteOp;
					spawnerToIncrease = spawner;
					remoteToEnable = remoteName;
				}
			}
		}

		if (remoteMineOpsToRemove) {
			delete remoteMineOpsToRemove.suspended;
			Memory.reducedRemotes -= 1;

			if (Memory.rooms[spawnerToIncrease].remoteMineOps && Memory.rooms[spawnerToIncrease].remoteMineOps[remoteToEnable]) {
				for (let sourceId in Memory.rooms[spawnerToIncrease].remoteMineOps[remoteToEnable].sources) {
					if (Memory.rooms[spawnerToIncrease].remoteSources[sourceId]) {
						delete Memory.rooms[spawnerToIncrease].remoteSources[sourceId].suspended;
					}
				}
			}
			log(spawnerToIncrease + " enabling remote " + remoteToEnable + " with eps " +bestEps+ ", avg bucket was " + Memory.avgBucket )
			Memory.worstEps = Math.min(Memory.worstEps, bestEps);
		} else {
			Memory.reducedRemotes = 0;
			delete Memory.worstEps;

			if (Memory.cpuSavings === CPU_SAVING_HIGH) {
				Memory.cpuSavings = CPU_SAVING_MEDIUM
			} else if (Memory.cpuSavings === CPU_SAVING_MEDIUM) {
				Memory.cpuSavings = CPU_SAVING_LOW
			} else if (Memory.cpuSavings === CPU_SAVING_LOW) {
				Memory.cpuSavings = CPU_SAVING_NONE
			} 
		}
	}

	if (BOT_MODE && Memory.reducedRemotes) {
		if (totalRooms) {
			let minimumAllowedRemotes = 2.0;
			let averageRemotes = totalRemotes / totalRooms;
	
			Memory.restrictClaims = averageRemotes < minimumAllowedRemotes;	
		}			
	} else {
		delete Memory.restrictClaims;
	}

	log("evaluteBucketAndRestrictRemotes avg bucket was " + Memory.avgBucket.toFixed(1)  + " suspended remotes " + Memory.reducedRemotes )

	Memory.bucketEvalTs = Game.time + 1499;
	Memory.avgBucket = Game.cpu.bucket;
	Memory.avgBucketCnt = 0;
	requestMemSave();
}


global.isCpuLimited = function() {

	if (global._currentCpuSavings !== undefined) { 
		return global._currentCpuSavings; 
	}

	if (Memory.cpuSavings !== undefined) {
		global._currentCpuSavings = Memory.cpuSavings;
		return global._currentCpuSavings;
	}

	if (Memory.reducedRemotes) {
		global._currentCpuSavings = CPU_SAVING_HIGH;
		return global._currentCpuSavings;
	}

	global._currentCpuSavings = CPU_SAVING_NONE;
	return global._currentCpuSavings;
}

global.isGCLPraiseRoomStandby = function(roomName) {
	if (roomName === "E3N17" && Game.shard.name === "shard1") { return true; }
}

global.isGCLPraiseRoom = function(roomName) {
	if (!global.setGCL) {
		global.setGCL = 1;
		setGCLPraiseRoom();
	}
	return PRAISE_GCL_ROOMS[roomName];
}

function makeRequestString() {
    let rtrn = {
        basicTrading: {
            room: 'E3N15',
            energy: false,
            H: false,
            O: false,
            X: false,
            U: false,
            L: false,
            Z: false,
            K: false,
        },
        advancedTrading: {
            E3N15: {
            //    K: 5000,
             //   XGHO2: 100,
            },
            E1N15: {
            //    L: 5000,
            },
        }
	};
	/*
    for (let e in rtrn.basicTrading) {
        if (e !== 'room' && e !== 'energy') {
            if (Memory.stats.totalMinerals[e] < 200000) {
                rtrn.basicTrading[e] = true;
            }
        }
    }*/
    return JSON.stringify(rtrn);
}

function createSensibleMarketOrderPrice(res, type){
	let underCut = 0.001;
	let price;
	let avgPrice = 0;
	if (Memory.market && Memory.market[type] && Memory.market[type][res]) {
		avgPrice = Memory.market[type][res].avgPrice
	}
	if (type === ORDER_BUY) {
		price = getCurrentPrice(getMarketBuyOrders(res)) + underCut;
		let priceChange = avgPrice*0.05;
		if (priceChange > underCut) {
			price = Math.min(price, avgPrice*1.05);
		}
	} else {
		price = getCurrentPrice(getMarketSellOrders(res)) - underCut;
		let priceChange = avgPrice*0.05;
		if (priceChange > underCut) {			
			price = Math.max(price, avgPrice*0.95);
		}
	}
	return price;
}

function getCreditsMinimuReserve(){
	let wantedMinimumCredits = 10000000;
	if (BOT_MODE) {
		wantedMinimumCredits = Memory.wantedCredits * 0.25;
	} 
	return wantedMinimumCredits;
}

global.buyFromMarket = function(res, amount, myRooms, checkCreateOrder = true, maxOrders = 1, checkShard = false){
	
	let orders = getMarketSellOrders(res);
	let bestOrder = null;
	let bestPlayerOrder;
	let bestPrice = Infinity;
	let deal = true;
	let bestEnergyPrice = Infinity;
	let currentEnergyBuyPrice;

	if (myRooms === undefined) {
		myRooms = getMyRooms();
	}
	let bestRoom;
	let bestEnergyRoom;

	for (let i=0; i< orders.length; i++) {
		if (orders[i].amount < 100 ) { continue; }
		if (orders[i].remainingAmount < 100 ) { continue; }
		bestPrice = orders[i].price;

		if (BOT_MODE) {	
			if (!roomIsHW(orders[i].roomName)) { 
				if (!bestPlayerOrder || bestPlayerOrder.price > orders[i].price)
				bestPlayerOrder = orders[i];
				continue;
			}
		}

		if (res === RESOURCE_ENERGY) {
			
			let tradeAmount = 1000;
			let remainder = 0;

			if (!currentEnergyBuyPrice){
				currentEnergyBuyPrice = getCurrentPrice(getMarketBuyOrders(res));
			}
			
			for (let roomName in myRooms){
				let terminal = Game.rooms[roomName].terminal;
				if (!terminal || terminal.__cooldown) { continue; }

				let energyCost = Game.market.calcTransactionCost(tradeAmount, roomName, orders[i].roomName)
				let remaindingEnergy = tradeAmount - energyCost
				remainder = Math.max(remainder, remaindingEnergy)
				if (remaindingEnergy <= 0) { continue; }
				let actualPrice = orders[i].price / (remaindingEnergy/tradeAmount)
				if (actualPrice < bestEnergyPrice) {
					bestEnergyPrice = actualPrice;
					bestEnergyRoom = roomName;
					bestOrder = orders[i];
				}
			}
			bestPrice = bestEnergyPrice;

			if (orders[i].price >= currentEnergyBuyPrice ||
				(!marketMineralSensiblePrice(orders[i].price, res, ORDER_SELL) && !marketMineralSensiblePrice(orders[i].price, res, ORDER_BUY))) {				
				break;
			}

		} else {

			if (checkShard && USE_SHARDS && !interShardLocalPriceBest(orders[i].price, res, ORDER_SELL, 1)) {				
				deal = false;
				break;
			}

			if (marketMineralSensiblePrice(orders[i].price, res, ORDER_SELL) === false || 
				(checkCreateOrder && betterToCreateOwnOrder(orders[i].price, res, ORDER_BUY) === true)
			) {
				deal = false;
				break;
			}
	
			bestOrder = orders[i];						
			break;
		}		
	}

	if (res === RESOURCE_ENERGY) {
		if (betterToCreateOwnOrder(bestPrice, res, ORDER_BUY) === true || bestPrice > currentEnergyBuyPrice) {
			deal = false;
		}
		log("buying energy best price " + bestPrice + " deal "  + deal + " trade amount " + amount)
	}

	if (BOT_MODE && bestPlayerOrder && bestOrder) {
		let ratio = bestOrder.price / bestPlayerOrder.price;
		if (bestPlayerOrder.price < bestOrder.price && ratio > 2) {
			bestOrder = bestPlayerOrder;
		}
	}
	
	if (bestOrder && deal) {		
		let tradeAmount = Math.min(bestOrder.amount, amount)
		let bestScore = -Infinity;

		if (res === RESOURCE_ENERGY && bestEnergyRoom) {
			bestRoom = bestEnergyRoom;
		} else {
			for (let roomName in myRooms){
				let terminal = Game.rooms[roomName].terminal;
				if (!terminal || terminal.__cooldown) { continue; }					
				if (terminal.freeSpace < 5000 && res !== RESOURCE_ENERGY) { continue; }
				let score = 0;
	
				
				let energyCost = Game.market.calcTransactionCost(tradeAmount, roomName, bestOrder.roomName)
	
				if (res === RESOURCE_ENERGY) {				
					if (tradeAmount/energyCost > 0.25) { continue; }					
				}
	
				score += terminal.freeSpace / TERMINAL_CAPACITY;
				score -= Game.rooms[roomName].store(res) / amount;
	
				score -= (energyCost / (tradeAmount*bestOrder.price)) * 3;
	
				if (terminal.store[RESOURCE_ENERGY] < energyCost) {
					score -= terminal.store[RESOURCE_ENERGY] /  energyCost
				}
				
			//	log(roomName + " want to buy " + res + " score " +score.toFixed(1) + " energy cost " +energyCost)
				if (score > bestScore){
					bestRoom = roomName;
					bestScore = score;
				}
			}
		}
	}

	



	if (bestRoom) {
		let amountToBuy = 1000;
		let cost = Game.market.calcTransactionCost(amountToBuy, bestRoom, bestOrder.roomName);
		
		if (cost <= amountToBuy*2) {
			let terminalToTrade = Game.rooms[bestRoom].terminal;
			let maxAffordable = Math.floor(terminalToTrade.store[RESOURCE_ENERGY] / (cost/amountToBuy));
			let maxAffordableByCredits = Math.floor((Game.market.credits - getCreditsMinimuReserve() ) / bestOrder.price);							
			let currentMaxBuy = Math.min(bestOrder.amount, amount, maxAffordable, terminalToTrade.freeSpace, maxAffordableByCredits);
			if (currentMaxBuy <= 0) { 
			//	console.log(" currentMaxBuy to low " + currentMaxBuy + " for resource " + res)
				return; 
			}
			let result = Game.market.deal(bestOrder.id, currentMaxBuy, bestRoom); 
			if (result == 0) { 
				registerSuccessBuy(res);
				terminalToTrade.__cooldown = TERMINAL_COOLDOWN;
				console.log(bestRoom + " " + res + ' ' + currentMaxBuy + ' cross room trader Buy completed successfully. order had '+bestOrder.amount + " units for " +bestOrder.price ); 
				return 1;
			} else {
				console.log(bestRoom + " " + res + ' cross room trader Buy failed with code ' + result + " amount " + currentMaxBuy + " order has " +bestOrder.amount + " for price " +bestOrder.price  ) 
			}
		} else {
		//	console.log("trade cost to high! " + cost)
		}
	} else 
		registerFailedToBuy(res);

		if (res === RESOURCE_ENERGY || betterToCreateOwnOrder(bestPrice, res, ORDER_BUY) || failedLongTerm(res, 20) ) {
			checkCreateMarketOrder(res, ORDER_BUY, myRooms, amount, maxOrders);
	}
}

if (Memory.failedBuy === undefined) { Memory.failedBuy = {} }

function registerFailedToBuy(res) {
	if (Memory.failedBuy[res] === undefined) { Memory.failedBuy[res] = 0 }
	Memory.failedBuy[res]++;
}

function registerSuccessBuy(res) {
	delete Memory.failedBuy[res];
}

function failedLongTerm(res, times) {
	if (Memory.failedBuy[res] && times > Memory.failedBuy[res]) { return true; }
}


function getDistToOrders(currentOrders, roomName){
	let dist = 50;
	for (let idx in currentOrders) {
		let order = currentOrders[idx];
		dist = Math.min(dist, Game.map.getRoomLinearDistance(order.roomName, roomName, true))
	}
	return dist;
}

function checkCreateMarketOrder(res, type, myRooms, allowedAmoutToTrade, maxOrders = 1){	
	let currentOrders = currentActiveOrders(type, res);
	if (!currentOrders || currentOrders.length < maxOrders) { 
		let bestRoom;
		let bestAmount = 0;
		if (type === ORDER_SELL) {
			if (allowedAmoutToTrade < 10000) { return 0; }
			
			let bestScore = 0;
			for (let roomName in myRooms){
				
				if (!Game.rooms[roomName].terminal) { continue; }

				let storedAmount = Game.rooms[roomName].store(res)
				if (storedAmount <= 0) { continue; }
				
				let score = storedAmount / allowedAmoutToTrade;

				let distToOrders = getDistToOrders(currentOrders, roomName)
				if (distToOrders === 0) { continue; }
				
				score += distToOrders / 50;

				if (score > bestScore){
					bestScore = score;
					bestRoom = roomName;
					bestAmount = storedAmount;
				}
			}
		} else if (type === ORDER_BUY) {

			if (allowedAmoutToTrade < 10000) { return 0; }
			let bestScore = Infinity;
			bestAmount = allowedAmoutToTrade;

			for (let roomName in myRooms){
				if (!Game.rooms[roomName].terminal || Game.rooms[roomName].terminal.freeSpace < 5000) { continue; }

				let storedAmount = Game.rooms[roomName].store(res);
				let score = storedAmount / allowedAmoutToTrade;

				let distToOrders = getDistToOrders(currentOrders, roomName)
				if (distToOrders <= 9) { continue; }

				score -= distToOrders / 50;

				if (score < bestScore){
					bestScore = score;
					bestRoom = roomName;					
				}
			}	
		}


		if (bestRoom) {
			let price = createSensibleMarketOrderPrice(res, type);
			let maxAffordableOrder = Game.market.credits / (price * MARKET_FEE);
			let amountToTrade = Math.min(bestAmount, 50000, maxAffordableOrder, allowedAmoutToTrade)
			if (amountToTrade > 5000) {
				let result = Game.market.createOrder(type, res, price, amountToTrade, bestRoom)
				console.log("checkCreateMarketOrder creating " + type + " order for " + res + " want to " +type + " "  +amountToTrade+ " at " + price+ " from room " + bestRoom + " result " + result);
			}
		}
	}

	// Update existing orders
	for (let idx in currentOrders) {

		let order = currentOrders[idx];
		if (!order.active) {
			console.log("closing order " + order.resourceType);
			Game.market.cancelOrder(order.id);
			delete Memory.ordersHistory[order.id];
			return;
		}
		
		if (!Memory.ordersHistory[order.id]) {
			Memory.ordersHistory[order.id] = {};
			
			Memory.ordersHistory[order.id].ts = Game.time + 999;
			return;	// recently creatd order
		} else if (Game.time < Memory.ordersHistory[order.id].ts) {			
			return; // recently checked order
		}
	
		
		let price = order.price;
		let competingPrice;
		let newPrice;
		if (order.type === ORDER_BUY) {
			competingPrice = getCurrentPrice(getMarketBuyOrders(res));
			if (competingPrice >= price) {
				newPrice = createSensibleMarketOrderPrice(res, type);							
			}			
		} else {
			competingPrice = getCurrentPrice(getMarketSellOrders(res));
			if (competingPrice <= price) {
				newPrice = createSensibleMarketOrderPrice(res, type);
			}
		}
	
		Memory.ordersHistory[order.id].ts = Game.time + 999;
		if (newPrice) {
			Game.market.changeOrderPrice(order.id, newPrice);
			console.log("checkCreateMarketOrder active " +type + " order for " + res + " at price " + price + "/" + competingPrice + " new price " +newPrice );
		} else {			
	
			if (order.remainingAmount < allowedAmoutToTrade && order.remainingAmount < 20000) {
			
				let addAmount = Math.min(2500, allowedAmoutToTrade);
				if (addAmount > 100) {
					Game.market.extendOrder(order.id, addAmount)
					console.log("checkCreateMarketOrder active " +type + " order for " + res + " extending amount by " + addAmount);
				}
			}		
		}
	}	
}


function setYPCommunicationSegment(array) {
    if (!_.isArray(array)) {
        array = [array];
	}

	global.requestString.militaryRequest = {};
	for (let room in Memory.roomAttacked) {
		if (roomIsSafeModed(room)) { continue; }
		if (!Memory.rooms[room] || !Memory.rooms[room].hostiles || !Memory.rooms[room].sieged) { continue; }
		if (room === "E14S17") { continue; }
		global.requestString.militaryRequest[room] = {};
	}

    RawMemory.setPublicSegments(array);
    for (let e in array) {
		if (global.requestString) {
			RawMemory.segments[array[e]] = JSON.stringify(global.requestString);
			registerActiveSegment()
		}
	}
}


function requestPlayerSegment(playerName, seg) {
	RawMemory.setActiveForeignSegment(playerName, seg);
}

function getRawPlayerSegment(playerName, seg) {
	let raw = RawMemory.setActiveForeignSegment;
	if (raw === undefined) {
		RawMemory.setActiveForeignSegment(playerName, seg);
		return raw;
	}
	if (raw.username === playerName) {
		return raw.data;
	}
}

function getObjectPlayerSegment(playerName, seg) {
	let raw = RawMemory.foreignSegment;

	if (raw.data === undefined) {
		RawMemory.setActiveForeignSegment(playerName, seg);
		return raw.data;
	}
	if (raw.username === playerName) {
		try {
			if (raw.data !== undefined) {
				let rtn = JSON.parse(raw.data);
				return rtn;
			}
		} catch (err){
			let msg = 'Error running getObjectPlayerSegment for player ' +playerName+' error: ' +err.name + err.stack;		
			console.log(msg);
		}
	}
}

/*
The setMyPublicSegment function will call makeRequestString - there we have an object that we parse and then set into the segment. BasicTrading is what we are working with, I have left in advancedTrading so you can see how you can add more objects for further communication. This is all it take to setup your segment - when you look at your segment 99 it should have a string that looks like :
{"basicTrading":{"room":"E1S11","energy":false,"H":false,"O":false,"X":false,"U":false,"L":false,"Z":false,"K":false},"advancedTrading":{"E3N15":{"K":5000,"XGHO2":100},"E1N15":{"L":5000}}}

Now we look learn how to look at other people's segments: Due to RawMemory.foreignSegment can be only 1 player, you cannot access all the players at once. So you need to go through an list every X ticks.
Fulfillment of basicTrading is at a rate of 100 minerals every X ticks. We can up this number, but currently with testing it's better to slowly balance our empires instead of vast exchanges of minerals. It's up to the player to turn off his request if he receives too much.
*/
function analyzeOtherPlayerSegment(myRooms) {
	
	if (alliedComList.length === 0) { return; }

    if (Memory.otherPlayerSegmentCount === undefined || Memory.otherPlayerSegmentCount >= alliedComList.length) {
        Memory.otherPlayerSegmentCount = 0;
    }

	// This will get the object of the player segement. 
	let player = alliedComList[Memory.otherPlayerSegmentCount][0];
	let obj
	try {
		obj = getObjectPlayerSegment(player, alliedComList[Memory.otherPlayerSegmentCount][1]);
	} catch (err){
		let msg = 'Error running getObjectPlayerSegment error for player '+ player + ' : ' +err.name + err.stack;		
		console.log(msg);
	}

    
 //  console.log(Memory.otherPlayerSegmentCount, alliedComList[Memory.otherPlayerSegmentCount][0], alliedComList[Memory.otherPlayerSegmentCount][1], 'Commands to segment',obj);

	
	if(obj){

		let militaryRequest = obj.militaryRequest;
		if (militaryRequest !== undefined) {
			for (let roomInNeed in  militaryRequest) {
				log("militaryRequest from " + player + " requesting aid in " + roomInNeed + " test mode "+ militaryRequest[roomInNeed].test)
				if (player !== 'likeafox') { continue; }
				if (militaryRequest[roomInNeed].test) { continue; }
				requestRoomVision(roomInNeed);

				if (Memory.raids && Memory.raids.activeTargets && Memory.raids.activeTargets[roomInNeed]) { continue; }
				addRaid(roomInNeed, {raidType: RAID_TYPE_PHALANX, requestedBy: player});
			}
		}

		global.mineralShare = {};
		let basic = obj.basicTrading;
	//	console.log(basic,'basicTrading');
		if (basic !== undefined) {
			for (let resource in basic) {
			//	console.log('want to send ', resource,basic[resource], '@', basic.room, '#:', 100);
				if (basic[resource]) {
				//	if (Memory.stats.totalMinerals[resource] > acceptNum && _.contains(acceptable, resource)) {
					if (global.mineralShare[resource] === undefined) { global.mineralShare[resource] = {}; } 
					if (global.mineralShare[resource][basic.room] === undefined) { global.mineralShare[resource][basic.room] = {}; } 	
				//	}
				}
			}
		//	console.log(JSON.stringify(obj))
		}

		let advanced = obj.advancedTrading;
		if (advanced !== undefined) {
			for (let roomName in advanced) {
				for (let idx in advanced[roomName]) {
					let request = advanced[roomName][idx];
					let priority = request.priority;
					if (!priority || priority < 0.5) { continue; }
					let resource = request.resource;

					if (resource === RESOURCE_ENERGY) {
						if (priority > 0.95) {
							if ( Memory.energyShare === undefined) {  Memory.energyShare = {}; } 
							if ( Memory.energyShare.recieveAllies === undefined) {  Memory.energyShare.recieveAllies = {}; } 
							Memory.energyShare.recieveAllies[roomName] = {};
						}		
					} else if (T3_BOOSTS_OBJECT[resource]) {

						let minimumStored = (BOOST_STOCK * 0.75);
						if( Memory.Minerals && Memory.Minerals.Labs) {
							minimumStored *= Object.keys(Memory.Minerals.Labs).length; 
						}

						if (!Memory.Minerals[resource] || Memory.Minerals[resource] < minimumStored) { continue; }

						sendResource(roomName, myRooms, 100, resource)

					} else if (BASE_MINERALS_OBJECT[resource] && resource !== RESOURCE_POWER) {
						if (global.mineralShare[resource] === undefined) { global.mineralShare[resource] = {}; } 
						if (global.mineralShare[resource][roomName] === undefined) { global.mineralShare[resource][roomName] = {}; }
					} else {
						log("unhandled resource request recieved in advancedTrading! " + player + " wants " + resource)
					
					}
				}
			}
		}

		/*
		let message = obj.Message;
		if (message !== undefined) {
			console.log(JSON.stringify(message))
		}*/

		let requestArray = obj.requestArray;		
		if (requestArray !== undefined) {
			for (let idx in requestArray) {
				let request = requestArray[idx];


				if (BASE_MINERALS_OBJECT[request.requestType] && request.roomName !== undefined) {
					if (global.mineralShare[request.requestType] === undefined) { global.mineralShare[request.requestType] = {}; } 
					if (global.mineralShare[request.requestType][request.roomName] === undefined) { global.mineralShare[request.requestType][request.roomName] = {}; } 
				}

			}
		}
	}

    Memory.otherPlayerSegmentCount++;
    if (Memory.otherPlayerSegmentCount >= alliedComList.length) {
        Memory.otherPlayerSegmentCount = 0;
	}
	
    RawMemory.setActiveForeignSegment(alliedComList[Memory.otherPlayerSegmentCount][0], alliedComList[Memory.otherPlayerSegmentCount][1]);
}


// This is how you track minerals
// You can use description as a way to track what comes in and fulfilles any order you have

function trackMarketTransactions() {
    if (Game.time % 67 !== 0) return;
    if (Memory.segmentTransactions === undefined) {
        Memory.segmentTransactions = {
            lastIncommingTs: 0,
            lastOutgoingTs: 0,
        };
	}	
	if (Memory.transactions === undefined) {
		Memory.transactions = {};
		Memory.transactions.lastIncommingTs = 0;
		Memory.transactions.lastOutgoingTs = 0;
	}

    let incommingTrans = Game.market.incomingTransactions;
    let latestTransaction;
    let transaction;
    let playerName = Memory.username;
    for (let id in incommingTrans) {
        transaction = incommingTrans[id];
        if (transaction.time > Memory.segmentTransactions.lastIncommingTs) {			
            if (!latestTransaction) { latestTransaction = transaction.time; }
			if (!transaction.sender) { continue; }
//            if (transaction.description !== 'segmentTransactions') {continue; }
            let username = transaction.sender.username;
			if (username !== playerName) {				
				if (transaction.order === undefined) {
					if (Memory.segmentTransactions[username] === undefined) { Memory.segmentTransactions[username] = {}; }
					let segTran = Memory.segmentTransactions[username];
					if (segTran[transaction.resourceType] === undefined) { segTran[transaction.resourceType] = 0; }
					segTran[transaction.resourceType] += transaction.amount;
					console.log("Segment sharing from " + username + " : " + transaction.amount + " " + transaction.resourceType + " at tick " + transaction.time);
				} else {
					if (Memory.transactions[username] === undefined) { Memory.transactions[username] = {}; }
					if (Memory.transactions[username][transaction.resourceType] ===  undefined) { Memory.transactions[username][transaction.resourceType] = 0; }
					Memory.transactions[username][transaction.resourceType] += transaction.amount;
				//	console.log("recieved transaction from " + username + " : " + transaction.amount + " " +transaction.resourceType + " at tick " + transaction.time );
				}
			}
        } else {
            break;
        }
	}
	
    if (latestTransaction) { Memory.segmentTransactions.lastIncommingTs = latestTransaction; }
    let outgoingTrans = Game.market.outgoingTransactions;
    for (let id in outgoingTrans) {
        transaction = outgoingTrans[id];
        if (transaction.time > Memory.segmentTransactions.lastOutgoingTs) {			
            if (!latestTransaction) { latestTransaction = transaction.time; }
			if (!transaction.recipient) { continue; }
//            if (transaction.description !== 'segmentTransactions') {continue; }
            let username = transaction.recipient.username;
            if (username !== playerName) {
				if (transaction.order === undefined) {	
					if (Memory.segmentTransactions[username] === undefined) { Memory.segmentTransactions[username] = {}; }
					let segTran = Memory.segmentTransactions[username];
					if (segTran === undefined) { segTran = {}; }
					if (segTran[transaction.resourceType] === undefined) { segTran[transaction.resourceType] = 0; }
					segTran[transaction.resourceType] -= transaction.amount;
					console.log("Segment sharing to " + username + " : " + transaction.amount + " " + transaction.resourceType + " at tick " + transaction.time);
				} else {
					if (Memory.transactions[username] === undefined) { Memory.transactions[username] = {}; }
					if (Memory.transactions[username][transaction.resourceType] ===  undefined) { Memory.transactions[username][transaction.resourceType] = 0; }
					Memory.transactions[username][transaction.resourceType] -= transaction.amount;
				//	console.log("outgoing transaction to " + username + " : " + transaction.amount + " " +transaction.resourceType + " at tick " + transaction.time );
				}               
            }
        } else {
            break;
        }
    }
    if (latestTransaction) { Memory.segmentTransactions.lastOutgoingTs = latestTransaction; }
}

global.validateAttackTarget = function(target){
	if (!Memory.rooms[target]) { return false; }
	if (roomIsSafeModed(target) > 500) { return false; }
	if ((!Memory.rooms[target].hostileRoom && !Memory.rooms[target].invaderCore) || Memory.rooms[target].myRoom) { return false; }
	if (Memory.rooms[target].player && ALLIES[Memory.rooms[target].player] ) { return false; }
	return true;
}

function sortExpansionTargets(memoryObject) {
	
	let sortable = [];
	for(let room in memoryObject) {
		if (memoryObject[room].score === undefined) { continue; }
		sortable.push([memoryObject[room], memoryObject[room].score]);
		delete memoryObject[room];
	}

	sortable.sort(function(a, b) {
		return (b[1] - a[1]);});

	for (let i=0; i<sortable.length; i++) {
		let remoteRoom = sortable[i][0].roomName;
		memoryObject[remoteRoom] = {};
		memoryObject[remoteRoom] = sortable[i][0]
	}
}

global.playerHasActiveSafemode = function(playerName) {
	if (!Memory.players[playerName]) { return 0; }
	for (let roomName in Memory.players[playerName].ownedRooms) {

		if (roomIsSafeModed(roomName) ) {
			return roomIsSafeModed(roomName);
		}
	}
	return 0;
}

global.getAvailableRaStrength = function(spawner, requestedAttackers=6) {
	let parts = createBodyPartsRangedAttacker(Game.rooms[spawner].energyCapacityAvailable);
	let power = calcBodyStrength(parts);
	return {strength: power.strength * requestedAttackers,
			attackers: requestedAttackers, 
			power: power}

}

function estimateBodyCost(body) {

	let cost = 0
	for (let idx in body) {		
		cost += getMarketPrice(RESOURCE_ENERGY) * BODYPART_COST[body[idx].type];

		if (body[idx].boost) {
			cost += getMarketPrice(body[idx].boost) * LAB_BOOST_MINERAL;
		}
	}
	return cost;


}

function insertBoosts(parts, boosts) {

	let bodypartBoost = {};
	for (let idx in boosts) {
		let type = BODYPART_FROM_BOOST[boosts[idx]];
		bodypartBoost[type] = boosts[idx];
	}
	
	let body = [];
	for (let idx in parts) {
		let type = parts[idx];
	//	
		let boost;
		if (bodypartBoost[type]) {
			boost = bodypartBoost[type];
			body.push({type: type, boost: boost})
		} else {
			body.push([{type: type} ])
		}
		
	}
	return body;
}


// global.getSniperStrength()

function getAvailableDismantlerStrength(targetRoom, spawner, formation = 2, maxBoostLevel = 3) {
	let dismantlerSquad = createDismantlerSquadBodies(targetRoom, spawner, formation, false, maxBoostLevel);

	let bodyAttacker = insertBoosts(dismantlerSquad.attackerParts, dismantlerSquad.attackerBoosts);
	let powerAttacker = calcBodyStrength(bodyAttacker);

	let costAttacker = estimateBodyCost(bodyAttacker);

	let bodyHealer = insertBoosts(dismantlerSquad.healerParts, dismantlerSquad.healerBoosts);
	let powerHealer = calcBodyStrength(bodyHealer);
	let costHealer = estimateBodyCost(bodyAttacker);

	return {strength: (powerHealer.strength + powerAttacker.strength) * formation,
		offensive : powerAttacker.attackDamage + powerAttacker.rangedAttackDamage + powerAttacker.dismantlePower,
		cost: (costHealer * formation/2) + (costAttacker * formation/2),
		attackers: formation, 
		dismantlerSquad: dismantlerSquad,
		boosts: dismantlerSquad.boosts,
	}
}

function getAvailableComboStrength(targetRoom, spawner, RMAbonus = 1, maxBoostLevel = 3, addedDamage = 0) {

	let combo = createComboBody(targetRoom, spawner, maxBoostLevel, addedDamage);
	let parts = createMaxBody(Game.rooms[spawner].energyCapacityAvailable, combo.body);

	let body = insertBoosts(parts, combo.boosts);
	let costAttacker = estimateBodyCost(body);

	let power = {};
	if (body){
		power = calcBodyStrength(body);	
	}
	let requestedAttackers = 4;

	return {strength: power.strength * requestedAttackers,
			offensive : (power.attackDamage + power.rangedAttackDamage*RMAbonus + power.dismantlePower) * requestedAttackers,
			attackers: requestedAttackers, 
			power: power, 
			combo: combo,
			cost: costAttacker * requestedAttackers,
	}
}

/*
function calcWantedSpawnersV2(roomIntel, requiredWaves, spawnersInRange) {
	if (requiredWaves <= 1) { return 1; }

	if (roomIntel.allowedSpawners === undefined) {
		roomIntel.allowedSpawners = 1;
		return 1;
	}



	let wantedSpawners = Math.ceil(launchedAttacks/2);

	let allowedSpawners = Math.min(spawnersInRange, requiredWaves)
}*/

function calcWantedSpawners(roomIntel) {
	if (roomIntel.allowedSpawners === undefined) {
		roomIntel.allowedSpawners = 1;
		return 1;
	}

	
	let launchedAttacks = 1;
	let wantedSpawners = 1;
	if (roomIntel.oldPRCL >= 0) {
		for (let id in roomIntel.attacks) {
			let attack = roomIntel.attacks[id];
			if (!attack.score) { continue; }
			if (attack.attackType === RAID_TYPE_PHALANX || attack.attackType === "healer") {
				launchedAttacks++;
			}
		}
		wantedSpawners = Math.ceil(launchedAttacks/2);
	}

	let maxSpawners = Object.keys(roomIntel.myRoomsInRange).length;

	roomIntel.allowedSpawners = Math.min(maxSpawners, wantedSpawners);
	return roomIntel.allowedSpawners;
}

function checkForFailedAttacks(playerName, attackType, roomName) {
	if (!Memory.players[playerName] || !Memory.players[playerName].ownedRooms) {		
		return 0;
	}

	let cnt = 0;
	for (let room in Memory.players[playerName].ownedRooms) {
		if (roomName && roomName !== room) { continue; }

		for (let attackId in Memory.players[playerName].ownedRooms[room].attacks) {
			let attackDetails = Memory.players[playerName].ownedRooms[room].attacks[attackId];
			if (attackType && attackDetails.attackType !== attackType) { continue; }
			if (attackDetails.score === undefined) { continue; }

			if (attackDetails.score < 0.85) {
				cnt++;
			}
		}
	}
	return cnt;


}

function estimatedPowerNeeded(playerName, attackType, roomName, useAttackPower=false){
	let requiredPower = 0;
	let highNonSuccess = 0;

	if (!Memory.players[playerName] || !Memory.players[playerName].ownedRooms || !Memory.players[playerName].ownedRooms[roomName]) {
		log("estimatedPowerNeeded error! " + " playerName " + playerName + " attackType " + attackType + "roomName" + roomName )
		return 0;
	}

	let cnt = 0;
	let targetPRCL = Memory.players[playerName].ownedRooms[roomName].oldPRCL;

	for (let room in Memory.players[playerName].ownedRooms) {
		for (let attackId in Memory.players[playerName].ownedRooms[room].attacks) {
			let attackDetails = Memory.players[playerName].ownedRooms[room].attacks[attackId];
			
			if (attackDetails.score === undefined) { continue; }
			if (attackDetails.attackType !== attackType && !useAttackPower) { continue; }			

			let power = attackDetails.power;
			if (useAttackPower && attackDetails.attackPower) {
				power = attackDetails.attackPower;
			}
			

			if (room === roomName || Memory.players[playerName].ownedRooms[room].oldPRCL >= targetPRCL) {
				if (attackDetails.score > 0.9) {
					requiredPower = cumulativeAverage(requiredPower, power, cnt)
					cnt++;
				} else if (power > highNonSuccess) {
					highNonSuccess = power * 1.2;
					// increase by 10%?
				}
			}
		//	requiredPower 
		}
	}

	if (requiredPower) { return requiredPower; }
	return highNonSuccess;
}

global.remoteHarassRoI = function(playerName, roomName, attackType) {

	let attacksToEval;
	if (Memory.players[playerName].remotes[roomName].attacks) {
		attacksToEval = Memory.players[playerName].remotes[roomName].attacks;
	} else if (Memory.players[playerName] && Memory.players[playerName].avgRemoteAttacks && Memory.players[playerName].avgRemoteAttacks[attackType]) {
	//	log("no data for remote " + roomName + " returning average pita attacks "  + Memory.players[playerName].avgRemoteAttacks.pita.score)
		return Memory.players[playerName].avgRemoteAttacks[attackType].score;
	}

	let avgScore = 0;
	let cnt = 0;
	for (let attackId in attacksToEval) {

		let attackDetails = attacksToEval[attackId];
		if (attackDetails.type !== attackType) { continue; } 
		if (attackDetails.score === undefined) { continue; }
		
		avgScore = cumulativeAverage(avgScore, attackDetails.score, cnt);		
		cnt++;
	}

	if (cnt > 2) {
		return avgScore;
	} else if (Memory.players[playerName] && Memory.players[playerName].avgRemoteAttacks && Memory.players[playerName].avgRemoteAttacks[attackType]) {
		return Memory.players[playerName].avgRemoteAttacks[attackType].score;
	}
	
	return undefined;
	
}

function pitaROI(playerName, roomName) {

	let attacksToEval;
	if (Memory.players[playerName].remotes[roomName].attacks) {
		attacksToEval = Memory.players[playerName].remotes[roomName].attacks;
	} else if (Memory.players[playerName] && Memory.players[playerName].avgRemoteAttacks && Memory.players[playerName].avgRemoteAttacks.pita) {
	//	log("no data for remote " + roomName + " returning average pita attacks "  + Memory.players[playerName].avgRemoteAttacks.pita.score)
		return Memory.players[playerName].avgRemoteAttacks.pita.score;
	}

	let avgScore = 0;
	let cnt = 0;
	for (let attackId in attacksToEval) {

		let attackDetails = attacksToEval[attackId];
		if (attackDetails.score === undefined) { continue; }
		
		avgScore = cumulativeAverage(avgScore, attackDetails.score, cnt);		
		cnt++;
	}
	
	return avgScore;
}

global.myRelativeSumRcl = function(mySumRcl) {

	let highEnemyRcl = 1;
	for (let playerName in Memory.players) {

		highEnemyRcl = Math.max(highEnemyRcl, Memory.players[playerName].estimatedSumRcl)
	}
	return mySumRcl / highEnemyRcl;
}

global.playerRelativeSumRcl = function(playerName){
	let enemyRcl = 1;
	if (Memory.players[playerName]) {
		enemyRcl = Memory.players[playerName].estimatedSumRcl
	}
	
	return enemyRcl / Memory.mySumRcl;
}


global.attackCoordinatorV3 = function(myRooms) {

	if (Memory.lastAutoRaidTs === undefined) { Memory.lastAutoRaidTs = 0; }	
	let init = Game.cpu.getUsed();	

	let availableAttacks = {};
	let targets = [];
	let targetsTerritory = [];	
	let attackTimer = 750;
	let nukers = [];
	let nukeTargetsArr = [];
	let nukeTargets = {};
	let highNukeScore = 0;
	let highNukeRoom;
	let mySumRcl = 0;
	let myNumberOfRooms = 0;
	for (let roomName in myRooms) {

		mySumRcl += getRoomRCL(roomName);
		myNumberOfRooms += 1;
		
		availableAttacks[roomName] = {};
		availableAttacks[roomName].ra = getAvailableRaStrength(roomName);

		//	NUKERS
		if (getRoomPRCL(roomName) >= CONTROLLER_MAX_LEVEL) {	
			let nuker = Game.rooms[roomName].findByType(STRUCTURE_NUKER);
			if (nuker.length) {

				if (Game.time > (nuker[0].memory.nukeOrder + 1500)) {
					delete nuker[0].memory.nukeOrder
				}

				if (nuker[0].cooldown > 10000) {
					continue; 
				}

				if (nuker[0].memory.nukeOrder === undefined) {
					nukers.push(nuker[0]);
				}
			}
		}


		
		if ((Memory.rooms[roomName].sieged || 
			roomIsSafeModeCd(roomName) > 1000) && 
			getRoomPRCL(roomName) >= 7 && 
			!PRAISE_GCL_ROOMS[roomName]
		){
			log("attackCoordinatorV3 aborting! ")
			attackTimer = 3000;
		}
	}

	Memory.mySumRcl = mySumRcl;


	// Find potential targets
	let conflictRemotesMax = 1;
	let maxScore = 0;

	let myRelativeRcl = myRelativeSumRcl(mySumRcl);

	Memory.myRelativeRcl = myRelativeRcl;

	for (let playerName in Memory.players) {
		conflictRemotesMax = Math.max(conflictRemotesMax, Memory.players[playerName].conflictRemotes || 0);
	}

	let assingedPlayer = getPlayerFocusedTarget();
	
	if (targets.length <= 0) {
		for (let playerName in Memory.players) {

			if (ALLIES[playerName]) { continue; }
			if (playerIsDead(playerName)) { continue; }

			if (unStuck(0.995) ) { continue; }	// Random chance to skip target player 

			if ((Object.keys(blackList).length > 0 && !BOT_MODE) && !blackList[playerName] && playerName !== 'Invader') { continue; }

			let rageMultiplier = 2 * getPlayerRage(playerName);
			let playerSize = Math.min((Memory.players[playerName].estimatedSumRcl / mySumRcl), 2);

			let lostRoomsRatio = 2 * (Memory.players[playerName].lostRoomsRatio || 0)

			if (ECO_MODE && Memory.players[playerName].estimatedSumRcl < (mySumRcl - 4)) { continue; }

		//	conflictRemotesMax = Math.max(conflictRemotesMax, Memory.players[playerName].conflictRemotes || 0);
			let conflicRemotesScore = 2 * ((Memory.players[playerName].conflictRemotes || 0) / conflictRemotesMax)
			log(playerName + " conflict remotes score " + conflicRemotesScore.toFixed(2) + " remotes " + Memory.players[playerName].conflictRemotes+ "/" + conflictRemotesMax )
			
		

			for (let roomName in Memory.players[playerName].ownedRooms) {

				let score = 0;	// Higher is better target
				let roomIntel = Memory.players[playerName].ownedRooms[roomName];

				if (!Memory.rooms[roomName]) { continue; }

				if (roomIntel.isStronghold && 
					(!Memory.rooms[roomName] || !Memory.rooms[roomName].invaderCore || Memory.rooms[roomName].invaderCore.level > 4 ||
					(Memory.rooms[roomName].invaderCore.ts - Game.time) < 2000 ||
					Memory.rooms[roomName].invaderCore.deploy && Game.time < Memory.rooms[roomName].invaderCore.deploy)
				) {
					continue;
				}

				let weakenedTarget = 1.0	// reduce to allow smaller attacks
				
				// Player hate
				score += rageMultiplier;

				// Assigned player
				if (assingedPlayer && assingedPlayer === playerName) {
					score += 3
				}

				// Player has lost rcl's
				score += lostRoomsRatio

				// Simple Allies Semgent request
				if (global.allyAttackRequest[roomName]) {
					if (Game.time > global.allyAttackRequest[roomName].ts) {
						delete global.allyAttackRequest[roomName]
					} else {
						score += 3 * global.allyAttackRequest[roomName].priority;
					}
				}				
			
				// Wipe smaller players if low space 
				if (Memory.possiblOwnFaceClaim) {
					score -= playerSize;
				} else {
					// Sum RCL makes player a threat
					score += playerSize;
				}

				// Conflicting remotes
				if (roomIntel.conflictRemotes) {
					score += roomIntel.conflictRemotes
				}
				score += conflicRemotesScore;				

				if (roomIsSafeModed(roomName) ) { continue; } // not a valid target, or camp its exits?

				// Room down and occupied by someone else
				if (getRoomPRCL(roomName) === 0 && Memory.rooms[roomName].isPlayer && Memory.rooms[roomName].isPlayer !== Memory.rooms[roomName].player) {
					// cancel queued attacks?
					continue;
				}

				// Prevent blacklisted players to establish rooms near me
				if (!BOT_MODE && blackList[playerName]) { 
					if (getRoomPRCL(roomName) >= CONTROLLER_MAX_LEVEL) { continue; } 
				}
				
				// My rooms in range	
				let sumSpawnerScore = 0;			
				if (roomIntel.myRoomsInRange === undefined || 
					getRoomPRCL(roomName) !== roomIntel.oldPRCL ||
					!roomIntel.rangeTs || Game.time > roomIntel.rangeTs
				) {

					delete Memory.players[playerName].hasRoomsOutOfReach;

					roomIntel.rangeTs = Game.time + 2000 + Math.floor((Math.random() * 1000));
					roomIntel.oldPRCL = getRoomPRCL(roomName);

					let requiredPrcl = 1;
					let maxRoomRange = 15;
					if (roomIntel.isStronghold) {
						maxRoomRange = 7;
						requiredPrcl = Math.min(Math.max(Memory.myRoomHighPRCL, Memory.rooms[roomName].invaderCore.level + 3), 7);
					} else {
						requiredPrcl = Math.min(Math.max(Memory.myRoomHighPRCL, getRoomPRCL(roomName)), 7);
					}
					
					let roomsInRange = getMyClosestRooms(roomName, requiredPrcl, 5, maxRoomRange);
					let sortableRooms = [];

					let destRoomStatus = getRoomStatus(roomName);

				//	log(roomName + " destRoomStatus status " + destRoomStatus)
					for (let spawner in roomsInRange) {
						let mySpawnerScore = 0;

						let spawnerRoomStatus = getRoomStatus(spawner);
					//	log(spawner + " spawner status " + spawnerRoomStatus)
						if (spawnerRoomStatus !== destRoomStatus) { continue; }

						mySpawnerScore += (1 - (roomsInRange[spawner].dist / 20));
						
						if (getRoomPRCL(spawner) >= CONTROLLER_MAX_LEVEL) {
							mySpawnerScore += 0.5;	// 10 rooms distance?
						}

						sumSpawnerScore += mySpawnerScore;
						
						if (roomIntel.isStronghold && !roomsInSameSector(spawner, roomName)) {
							continue;
						}

						sortableRooms.push([mySpawnerScore, spawner, roomsInRange[spawner].dist]);
					}

					sortableRooms.sort(function(a, b) {
						return (b[0] - a[0]);});

					roomIntel.myRoomsInRange = {}
					for (let idx in sortableRooms) {
						let _roomName = sortableRooms[idx][1];
					//	let _range = sortableRooms[idx][2];
						roomIntel.myRoomsInRange[_roomName] = {};
						roomIntel.myRoomsInRange[_roomName].dist = sortableRooms[idx][2];
						
					//	roomIntel.myRoomsInRange[_roomName].score = sortableRooms[idx][0];	
					}
				}

			//	score += sumSpawnerScore;

				let roomsInRange = Object.keys(roomIntel.myRoomsInRange).length 
				if (Memory.players[playerName] && roomsInRange === 0) { 
					Memory.players[playerName].hasRoomsOutOfReach = true;
					continue; 
				}

				score += 5 * Math.min(roomsInRange / 5, 1);				

				let minimumDistance = 255;
				let closestRoom;
				for (let roomInRange in roomIntel.myRoomsInRange) {
					if (roomIntel.myRoomsInRange[roomInRange].dist < minimumDistance) {
						minimumDistance = roomIntel.myRoomsInRange[roomInRange].dist
						closestRoom = roomInRange
					}
				//	minimumDistance = Math.min(minimumDistance, roomIntel.myRoomsInRange[roomInRange].dist)
				}

				// Dont allow AVOID marked players to claim too close!

				let skipTarget = true;
				if (blackList[playerName]) {
					skipTarget = false;
				} else if (SEASONAL_PASSIVE_MODE || AVOID[playerName]) {

					let minRage = 0.3;
					if (AVOID[playerName]) { minRage = 0.6; }
					if (getPlayerRage(playerName) > minRage) { skipTarget = false } 

					if (MY_SECTORS[getSectorV2(roomName)]) { skipTarget = false; }

				} else {

					if (withinMyTerritory(roomName) ) { skipTarget = false; }

					if (myRelativeRcl >= 1 && Memory.myRoomHighPRCL >= CONTROLLER_MAX_LEVEL) { skipTarget = false; }

					let minRage = 0.6;
					if (Memory.myRoomHighPRCL >= CONTROLLER_MAX_LEVEL) { minRage = 0.2; }
					if (getPlayerRage(playerName) > minRage) { skipTarget = false }
					
				}

				if (skipTarget) { 
				//	log("skipTarget! " + playerName + " at room name " + roomName)
					continue; 
				} else {

					if (SEASONAL_PASSIVE_MODE) {
						addRage(playerName, 5000)
					}
				}

			//	if (AVOID[playerName] && (minimumDistance > AVOID_CLAIM_DISTANCE || getRoomPRCL(roomName) > 6)) { continue; }
			//	if (SEASONAL_THORIUM && AVOID[playerName] && !MY_SECTORS[getSectorV2(roomName)]) { continue; }

			//	if (SEASONAL_PASSIVE_MODE && !(!MY_SECTORS[getSectorV2(roomName) || getPlayerRage(playerName) < 0.3 || !blackList[roomName]])) { continue; }

				// Portal crossing
				if (closestRoom) {
					let linearDistance = getRoomLinearDistance(roomName, closestRoom);
					if (linearDistance > (minimumDistance * 2)) {
						score -= 5;
					}
				}

				// Faceclaimed!
				if (minimumDistance <= 2){
					score += 15;
				} else if (minimumDistance <= 3){
					score += 7.5;
				}
				
				// No stored energy
				if (!roomIntel.isStronghold && (!roomIntel.storedEnergy || roomIntel.storedEnergy < 5000)) {
					score += 2;
					weakenedTarget -= 0.5;
				}

				// Incoming nuke
				if (getRoomPRCL(roomName) >= 6) {
					score += 3 * Math.min(3, countIncomingNukes(roomName));
				}

				if (getRoomPRCL(roomName) > 0 && nukeThreatImminent(roomName, 1200) ) {
					score += 10;
					weakenedTarget -= 0.25;
				}

				// Amount of towers
				score += 1 - ((Memory.rooms[roomName].numberOfTowers || 0) / CONTROLLER_STRUCTURES[STRUCTURE_TOWER][CONTROLLER_MAX_LEVEL])

				// TowerDmg
				score += 1 - ((roomIntel.towerDmg || 0) / (CONTROLLER_STRUCTURES[STRUCTURE_TOWER][CONTROLLER_MAX_LEVEL] * TOWER_POWER_ATTACK))

				// Rampart hits
				let maxHp = 10000000;
				score += 1 - (2 * (Math.min((roomIntel.breachHp || 0), maxHp) / maxHp));

				// Walls breached
				if (!roomIntel.isStronghold && (Memory.rooms[roomName]._breachPos || Memory.rooms[roomName]._breachPosPhalanx)) {
					score += getRoomRCL(roomName);
					weakenedTarget -= 0.55;
				}

				// Target room is on safe mode cd
				if (roomIsSafeModeCd(roomName) > 1500 ){
					score += 4;
					weakenedTarget -= 0.15;
				}

				if (playerHasActiveSafemode(playerName) ){
					score += 5;
				}

				// Missing PRCL
				if (!roomIntel.isStronghold && 
					getRoomPRCL(roomName) < getRoomRCL(roomName) && 
					Memory.rooms[roomName].numberOfTowers <= 0 &&
					Memory.rooms[roomName]._breachPos
				) {
					score += 2 + (getRoomRCL(roomName) - getRoomPRCL(roomName));	// Get Controller actual level - not downgraded level
				}

				// InvaderCore Level
				if (roomIntel.isStronghold) {
					score += 6 - Memory.rooms[roomName].invaderCore.level;
				}

				// Downgraded controller
				if (Memory.rooms[roomName].RRCL !== undefined) {
					score += Memory.rooms[roomName].RRCL;
					weakenedTarget -= 0.15;
				}

				// Active attacks
				if (Memory.combatDeconstruct[roomName] || 
					Memory.raids.activeTargets[roomName]
				) {
					score += 5;
				}

				// limit weakened target
				weakenedTarget = Math.max(weakenedTarget, 0.1)
				weakenedTarget = allowedWeakened(roomIntel, weakenedTarget);

				if (SEASONAL_SCORE && 
					rageMultiplier === 0 && 
					conflicRemotesScore === 0 && 
					weakenedTarget === 1 &&
					getRoomPRCL(roomName) >= 5
					
				) { continue; }

				maxScore = Math.max(maxScore, score);

				let inMyTerritory = withinMyTerritory(roomName);

				// Push targets
				if (inMyTerritory !== undefined) {
					score += (3 - inMyTerritory) * 3;
					targetsTerritory.push({score: score, roomName: roomName, playerName: playerName, weakenedTarget: weakenedTarget, inMyTerritory: inMyTerritory});
				} else {
					targets.push({score: score, roomName: roomName, playerName: playerName, weakenedTarget: weakenedTarget});
				}

				// NUKERS
				if (!roomIntel.isStronghold &&
					nukers.length &&
					getRoomPRCL(roomName) >= 5 &&
					roomIntel.breachHp >= 1000000 && 
					Memory.rooms[roomName].numberOfTowers > 0 &&
					roomIsSafeModeCd(roomName) < 5000 &&	// dont nuke if can be taken out without nukes?
					(!Memory.nukes[roomName] || Object.keys(Memory.nukes[roomName].nukes).length <= 3)
				) {
					
					let nukeScore = 0;
					let nukesReady = true;
					let nukersInRange = []
					for (let idx in nukers) {
						let nuker = nukers[idx];
						if (roomIntel.nukeTarget === undefined || roomIntel.nukeTarget.score === 0) { continue; }
						if (getRoomLinearDistance(roomName, nuker.room.name) > NUKE_RANGE ) { continue; }
						if (nuker.cooldown && nuker.cooldown < 10000) { 
							nukesReady = false;
							continue;
						}
						nukersInRange.push(nuker);
						nukeScore += roomIntel.nukeTarget.score;
					}
					
					if (nukesReady && nukeScore > 0) {
						nukeTargetsArr.push([nukeScore, roomName, playerName, nukersInRange])
						nukeTargets[roomName] = {};
						nukeTargets[roomName].nukeScore = nukeScore;
						nukeTargets[roomName].nukersInRange = nukersInRange;

						if (nukeScore > highNukeScore) {
							highNukeScore = nukeScore;
							highNukeRoom = roomName;
						}
					}
				}
			}
		}
	}

	if (highNukeRoom) {
		log("best nuke target at " + highNukeRoom + " with score " + highNukeScore + " pointing " + nukeTargets[highNukeRoom].nukersInRange.length + "/"  +nukers.length+ " nukes at the room ")
	}

	targetsTerritory.sort(function(a, b) {
		return (b.score - a.score);});

	targets.sort(function(a, b) {
		return (b.score - a.score);});

	targets = targetsTerritory.concat(targets)

	console.log(JSON.stringify(targets))

	let targetsWithinTerritory = targetsTerritory.length;
	let targetsInTerritoryRatio = targetsWithinTerritory/myNumberOfRooms;
	
	let territoryEco = ECONOMY_DEVELOPING;
	let outsideTerritoryEco = ECONOMY_SURPLUS;
	if (targetsInTerritoryRatio <= 1) {
		outsideTerritoryEco = ECONOMY_DEVELOPING;
	}
	
	// Assign if suitable attack is available
	for (let idx in targets) {
		let score =  targets[idx].score;
		let roomName = targets[idx].roomName;
		let playerName = targets[idx].playerName;
		let weakenedTarget = targets[idx].weakenedTarget;	
		let inMyTerritory = targets[idx].inMyTerritory

		log("checking target at idx " + idx + " score " + score + " roomName " + roomName + " playerName " + playerName + " in my territory " +inMyTerritory)

		if (unStuck(0.99) ) { continue; }	// Random chance to skip to next target room
		
		let roomIntel = Memory.players[playerName].ownedRooms[roomName];
		if (!roomIntel) { continue; }

		let requiredEco = ECONOMY_SURPLUS;
		if (inMyTerritory) {
			requiredEco = territoryEco;
		} else {
			requiredEco = outsideTerritoryEco;
		}

		if (playerName === 'Invader'){
			requiredEco -= 1;			
		}


		// RA?
		if (!roomIntel.isStronghold &&
			(Memory.rooms[roomName].numberOfTowers <= 0 ||
			Memory.rooms[roomName]._breachPos)
		){

			if (Memory.rooms[roomName].isPlayer && Memory.rooms[roomName].isPlayer !== playerName) { continue; }

			let orderAttackers = false;
			if (Memory.rooms[roomName]._breachPos) {
				let reqPower = weakenedTarget * estimatedPowerNeeded(playerName, "rangedAttacker", roomName);
				for (let spawner in roomIntel.myRoomsInRange) {
					if (reqPower > availableAttacks[spawner].ra) {
						orderAttackers = true;
						break;
					}
				}
			}

			if (orderAttackers) {
				orderRangedAttackers(roomName, 1500, "despawn");
			}		
			
			if (!Memory.controllerAttack[roomName]) {
				Memory.controllerAttack[roomName] = {};
			}

			if (Memory.rooms[roomName].numberOfTowers <= 0) {
				orderDespawn(roomName);
			}
		}
			
		if (!validateAttackTarget(roomName) && !blackList[playerName]) { 	
			continue;
		}

		let possibleAttacks = [];

		let enemyPower = 0;
		if (Memory.rooms[roomName] && Memory.rooms[roomName].hostiles && Memory.rooms[roomName].hostiles.power.defensive) {
			enemyPower = Memory.rooms[roomName].hostiles.power.defensive;
		}

		if (Memory.rooms[roomName] && Memory.rooms[roomName].avgHostile && Memory.rooms[roomName].avgHostile.creepDmg) {
			enemyPower = Math.max(enemyPower, Memory.rooms[roomName].avgHostile.creepDmg)
		}
		
		// Dont spawn big attacks for destroyed rooms
		if (roomIntel.isStronghold) {
			// keep spawning
		} else if (roomIntel.towerDmg === 0){

			let raCanHandle = true;

			

			let highRaDmg = 0;
			for (let spawner in roomIntel.myRoomsInRange) {
				highRaDmg = Math.max(highRaDmg, availableAttacks[spawner].ra)
				if (enemyPower > availableAttacks[spawner].ra * 5) {
					raCanHandle = false;
				}
			}
			
			let creepsToClean = 20;
			if (Game.rooms[roomName] && 
				highRaDmg * creepsToClean * CREEP_LIFE_TIME > roomHp(Game.rooms[roomName])
			) {
				raCanHandle = false;
			}



			if (raCanHandle) {
				log("ra can handle this! " + roomName)
				continue; 
			}
		}

		// If players have conflicting remotes with me, attack them first
		/*
		if (conflictRemotesMax) {
			if (!Memory.players[playerName].conflictRemotes) { continue; }
		} else {
			
		}*/
		
		let adjust = 0.33 * (1 / (Math.min(1, myRelativeRcl) || 1))

		if (inMyTerritory === undefined && score < maxScore * adjust) { break; }	// Skip low value targets?
	//	if (playerName !== 'Yoner' && inMyTerritory === undefined && score < maxScore * adjust) { break; }	// Skip low value targets?

		if (Game.time < Memory.lastAutoRaidTs) {
		//	if (assingedPlayer && assingedPlayer === playerName ) { 
				// allow spawning more attacks to the same player				
		//	} else {
				continue; 
		//	}
		}

		if (inMyTerritory === undefined && assingedPlayer && assingedPlayer !== playerName && playerName !== "Invader") { continue; }
		
		// Quad attack?		
		let spawnersInRange = Object.keys(roomIntel.myRoomsInRange).length;
		let allowedWavesToBreach = spawnersInRange * 2 / weakenedTarget;	// some spawners might not attack?

		let breachHpQuad = Memory.rooms[roomName].breachHpPhalanx || Memory.rooms[roomName].breachHp || 0;
		let breachHp = Memory.rooms[roomName].breachHp || 0;

		// Give RA bouns if all ramparts due to RMA
		let RMAbounus = 2.5;	// Front line does more than backline
		let dmdBodytypeMultiplierQuadRA = RMAbounus;
		if (Memory.rooms[roomName].breachHpPhalanx) {
			dmdBodytypeMultiplierQuadRA = Math.max(1, RMAbounus * limit(Memory.rooms[roomName].breachRampartHpPhalanx / Memory.rooms[roomName].breachHpPhalanx, 0, 1));	// Bonus for RMA
		} else if (Memory.rooms[roomName].breachWallHp) {
			dmdBodytypeMultiplierQuadRA = Math.max(1, RMAbounus * limit(Memory.rooms[roomName].breachRampartHp / Memory.rooms[roomName].breachWallHp, 0, 1));	// Bonus for RMA
		}
		roomIntel.RMAbonus = dmdBodytypeMultiplierQuadRA;

		
		log(roomName + " quad rampart ratio " + dmdBodytypeMultiplierQuadRA.toFixed(1) + " ramparts hp " + Memory.rooms[roomName].breachRampartHpPhalanx + " / " + Memory.rooms[roomName].breachHpPhalanx)

		let BOOST_TIERS = [0, 1, 2, 3];
		let lowBreachCost = Infinity;

		// RA COMBO'S 
		for (let spawner in roomIntel.myRoomsInRange) {

			if (Game.rooms[spawner].energyStatus() < requiredEco) { continue; }
			if (Memory.rooms[spawner].sieged) { continue; }
			if (Memory.nukeRampart[spawner]) { continue; }
			if (roomIntel.myRoomsInRange[spawner].spawning && Game.time < roomIntel.myRoomsInRange[spawner].spawning) { continue; }
			if (activeRaidsSpawning(spawner) >= 1) { continue; }
			

			let addedDamage = 0;
			let defenderRepair = 0;
			let preferFrontLoaded;
			if (roomIntel.isStronghold) {

				if (getRoomPRCL(spawner) < 8) { continue; }
				if (Memory.rooms[roomName].invaderCore.level !== 4) { continue; }
				if (!roomIntel.defenderStrength || roomIntel.defenderStrength.repairPower >= 3000) { continue; }	
				if (checkForFailedAttacks(playerName, RAID_TYPE_PHALANX, roomName) >= 1) { continue; }
				if (!roomIntel.allCreepsSpawned) { continue; }
				addedDamage	= roomIntel.defenderStrength.rangedAttackDamage;
				defenderRepair = roomIntel.defenderStrength.repairPower;
				preferFrontLoaded = true;
			}
			
			for (let tier in BOOST_TIERS) {
				let combo = getAvailableComboStrength(roomName, spawner, dmdBodytypeMultiplierQuadRA, tier, addedDamage);
				if (!combo.offensive) { continue; }
				let reqPower = weakenedTarget * estimatedPowerNeeded(playerName, RAID_TYPE_PHALANX, roomName, true);
				if (!combo.offensive || combo.offensive < reqPower) { continue; }
							
				let breachableData = {};
				if (!breachableInWaves(combo.offensive, breachHpQuad, allowedWavesToBreach, weakenedTarget, combo.combo.boosts, breachableData) ) { continue; }			
				// ALL TESTS PASSED!
	
				log("combo cost " + combo.cost)
				// Rate and push Attack	
				score = scorePossibleAttack(breachableData.requiredWaves, roomIntel.myRoomsInRange[spawner].dist, combo.cost);
				score -= tier;

				let breachCost = Math.ceil(breachableData.requiredWaves) * combo.cost;
				lowBreachCost = Math.min(lowBreachCost, breachCost);
			
			//	combo.preferFrontLoaded = preferFrontLoaded;

				let attackData = {	score: score,
									spawner: spawner,
									boostTier: tier,
									breachCost: breachCost,
									wavesRequired: breachableData.requiredWaves,
									raidRequest: combo.combo,
									attackType: RAID_TYPE_PHALANX};
	
				possibleAttacks.push(attackData);

				if (breachableData.requiredWaves <= 0.9 && enemyPower < reqPower) { break; }
			}
		}


		// PHALANX ATTACKERS		
		if (dmdBodytypeMultiplierQuadRA <= 1) {

			for (let spawner in roomIntel.myRoomsInRange) {

				if (roomIntel.isStronghold) { continue; }
	
				if (Game.rooms[spawner].energyStatus() < requiredEco) { continue; }
				if (Memory.rooms[spawner].sieged) { continue; }
				if (Memory.nukeRampart[spawner]) { continue; }
				if (roomIntel.myRoomsInRange[spawner].spawning && Game.time < roomIntel.myRoomsInRange[spawner].spawning) { continue; }

				if (checkForFailedAttacks(playerName, RAID_TYPE_PHALANX_ATTACKERS) >= 1) { continue; }

				for (let tier in BOOST_TIERS) {
	
					let dismantlerPhalanx = getAvailableDismantlerStrength(roomName, spawner, 4, tier);
					if (!dismantlerPhalanx || !dismantlerPhalanx.offensive) { continue; }
					let dismantlerStrength = dismantlerPhalanx.offensive;
		
					let reqPower = weakenedTarget * estimatedPowerNeeded(playerName, RAID_TYPE_PHALANX_ATTACKERS, roomName, true);			
					if (dismantlerStrength < reqPower ) { continue; }
		
					let breachableData = {};
					if (!breachableInWaves(dismantlerStrength, breachHpQuad, allowedWavesToBreach, weakenedTarget, dismantlerPhalanx.boosts, breachableData) ) { continue; }
		
					// ALL TESTS PASSED!
					score = scorePossibleAttack(breachableData.requiredWaves, roomIntel.myRoomsInRange[spawner].dist, dismantlerPhalanx.cost);
					score -= tier

					let breachCost = Math.ceil(breachableData.requiredWaves) * dismantlerPhalanx.cost;
					lowBreachCost = Math.min(lowBreachCost, breachCost);
				
					let attackData = {	score: score,
										spawner: spawner,
										boostTier: tier,
										breachCost: breachCost,
										wavesRequired: breachableData.requiredWaves,
										attackType: RAID_TYPE_PHALANX_ATTACKERS};
		
					possibleAttacks.push(attackData);
					
					if (breachableData.requiredWaves <= 0.9 && enemyPower < reqPower) { break; }
				}
			}
		}

		
		// DISMANTLER DUO
		for (let spawner in roomIntel.myRoomsInRange) {

			if (SEASONAL_COMMS && !roomIntel.isStronghold) { continue; }
		//	if (playerName !== 'Yoner') {
				if (Game.rooms[spawner].energyStatus() <= requiredEco) { continue; }
				if (Memory.rooms[spawner].sieged) { continue; }
				if (Memory.nukeRampart[spawner]) { continue; }
				if (roomIntel.myRoomsInRange[spawner].spawning && Game.time < roomIntel.myRoomsInRange[spawner].spawning) { continue; }
				if (activeRaidsSpawning(spawner) >= 1) { continue; }
		//	}
			
			if (roomIntel.isStronghold && Memory.rooms[roomName].invaderCore.level > 3) { continue; }

			for (let tier in BOOST_TIERS) {
				let dismantlerSquad = getAvailableDismantlerStrength(roomName, spawner, undefined, tier);
				if (!dismantlerSquad || !dismantlerSquad.offensive) { continue; }
				let dismantlerStrength = dismantlerSquad.offensive * 2;	// launches in pairs

				let reqPower = weakenedTarget * estimatedPowerNeeded(playerName, "healer", roomName, true);
				if (dismantlerStrength < reqPower ) { continue; }

				let breachableData = {};
				if (!breachableInWaves(dismantlerStrength, breachHp, allowedWavesToBreach, weakenedTarget, dismantlerSquad.boosts, breachableData) ) { continue; }

				// ALL TESTS PASSED!
				score = scorePossibleAttack(breachableData.requiredWaves, roomIntel.myRoomsInRange[spawner].dist, dismantlerSquad);
				score -= tier
				
				let requiredDuos = 2;
				if (breachableData.requiredWaves < 0.4) {
					requiredDuos = 1;
				}

				let breachCost = Math.ceil(breachableData.requiredWaves) * dismantlerSquad.cost * requiredDuos;
				lowBreachCost = Math.min(lowBreachCost, breachCost);

				let attackData = {	score: score,
									spawner: spawner,
									boostTier: tier,
									breachCost: breachCost,
									wavesRequired: breachableData.requiredWaves,
									requiredDuos: requiredDuos,
									attackType: DUO_DISMANTLER};

				possibleAttacks.push(attackData);

				if (breachableData.requiredWaves <= 0.9 && enemyPower < reqPower) { break; }
			}
		}
		
		// CORE SNIPER		
		if (roomIntel.isStronghold !== undefined && Memory.rooms[roomName].invaderCore.level <= 3) {
			for (let spawner in roomIntel.myRoomsInRange) {

				if (SEASONAL_COMMS && !roomIntel.isStronghold) { continue; }
				if (Game.rooms[spawner].energyStatus() <= requiredEco) { continue; }
				if (Memory.rooms[spawner].sieged) { continue; }
				if (Memory.nukeRampart[spawner]) { continue; }
				if (roomIntel.myRoomsInRange[spawner].spawning && Game.time < roomIntel.myRoomsInRange[spawner].spawning) { continue; }
				if (activeRaidsSpawning(spawner) >= 1) { continue; }
				
				let sniper = createInvaderCoreSniper(roomName, spawner, 0);
				if (!sniper || !sniper.attackerParts) { continue; }

				if (checkForFailedAttacks(playerName, CORE_SNIPER, roomName) >= 1) { continue; }

				let bodySniper = insertBoosts(sniper.attackerParts, sniper.attackerBoosts);
			//	let powerAttacker = calcBodyStrength(bodySniper);
				let costAttacker = estimateBodyCost(bodySniper);

				// ALL TESTS PASSED!
				let requiredWaves = 0.75;
				let sniperBias = 25; //score this higher to prefer snipers when possible
				score = sniperBias + scorePossibleAttack(requiredWaves, roomIntel.myRoomsInRange[spawner].dist, costAttacker);

				let breachCost = Math.ceil(requiredWaves) * costAttacker;
				lowBreachCost = Math.min(lowBreachCost, breachCost);
			
				let attackData = {	score: score,
									spawner: spawner,
									sniper: sniper,
									breachCost: breachCost,
									wavesRequired: requiredWaves,
									attackType: CORE_SNIPER};

				possibleAttacks.push(attackData);
			}
		}

		// add breach cost scores
		for (let attackIdx in possibleAttacks) {
			let attackData = possibleAttacks[attackIdx];
			attackData.score += 3 * (lowBreachCost / attackData.breachCost);
		}

		possibleAttacks.sort(function(a, b) {
			return (b.score - a.score);});
		
		let assignedSpawners = 0;
		let wantedSpawners = 1;
		if (roomIntel.isStronghold) {
			
			if (Memory.rooms[roomName].invaderCore.level === 4) {
				wantedSpawners = 1;
			}

			if (Memory.coreSniper[roomName]) { assignedSpawners += 1; }

		} else {
			wantedSpawners = calcWantedSpawners(roomIntel);					
		}

		if (Memory.combatDeconstruct[roomName]) { assignedSpawners += 1 }
		assignedSpawners += activeRaidsOnTarget(roomName);	

		log("total attacks possible " + possibleAttacks.length + " on player " + playerName + " room " + roomName + " wanted spawners " + wantedSpawners + " active spawners " + assignedSpawners);	
		log(JSON.stringify(possibleAttacks));

	//	if (playerName === 'Yoner') { continue; }


		// LAUNCH ATTACKS
		for (let attackIdx in possibleAttacks) {

			if (assignedSpawners >= wantedSpawners) { break; }	

			let attack = possibleAttacks[attackIdx];			
			log(roomName + " assigning possible attack " + attack.attackType + " score " + attack.score.toFixed(1) + ", spawner " + attack.spawner )		
			addActiveRaidCount(attack.spawner, 1);	

			switch (attack.attackType) {
				case RAID_TYPE_PHALANX: 
					addRaid(roomName, {raidType: RAID_TYPE_PHALANX, spawner: attack.spawner, waves: 1, boostTier: attack.boostTier, raidRequest: attack.raidRequest});				
					log("attackCoordinator requesting Combo Phalanx rangers from " + attack.spawner + " to " + playerName + " room " + roomName );	
					break;

				case RAID_TYPE_PHALANX_ATTACKERS: 
					addRaid(roomName, {raidType: RAID_TYPE_PHALANX_ATTACKERS, spawner: attack.spawner, waves: 1, boostTier: attack.boostTier});				
					log("attackCoordinator requesting RAID_TYPE_PHALANX_ATTACKERS from " + attack.spawner + " to " + playerName + " room " + roomName );	
					break;
					
				case CORE_SNIPER:
					log("attackCoordinator requesting CORE SNIPER from " + attack.spawner + " to " + playerName + " room " + roomName );
					if (Memory.coreSniper[roomName] === undefined) { Memory.coreSniper[roomName] = {} }
					if (Memory.coreSniper[roomName].assignedRooms === undefined) {
						Memory.coreSniper[roomName].assignedRooms = {}
					}
					Memory.coreSniper[roomName].assignedRooms[attack.spawner] = {};
					Memory.coreSniper[roomName].assignedRooms[attack.spawner].sniper = attack.sniper;
				//	Memory.coreSniper[roomName].assignedRooms[attack.spawner].ts = Game.time + 2000;
					break;
					
				case DUO_DISMANTLER: 				
					
					if (Memory.orderWreckers[roomName] === undefined) { Memory.orderWreckers[roomName] = {} }
					if (Memory.orderWreckers[roomName].assignedRooms === undefined) {
						Memory.orderWreckers[roomName].assignedRooms = {}
					}
					Memory.orderWreckers[roomName].assignedRooms[attack.spawner] = {};
		
					Memory.orderWreckers[roomName].requiredDeconstructors = attack.requiredDuos;
					Memory.orderWreckers[roomName].boostTier = attack.boostTier;
					
					if (roomIntel.isStronghold) {
						Memory.orderWreckers[roomName].requiredDeconstructors = 1;
					}

					log("attackCoordinator requesting DECONSTRUCTORS from " + attack.spawner + " to " + playerName + " room " + roomName);
					break;
			}

			// Dont overkill!
			if (attack.wavesRequired < 0.5) {
				break;
			}

			if (roomIntel.myRoomsInRange[attack.spawner]) {
				roomIntel.myRoomsInRange[attack.spawner].spawning = Game.time + 300;
			}
			
			if (!assingedPlayer) {
				assingedPlayer = setPlayerFocusedTarget(playerName, myRelativeRcl)
			}

			if (playerName !== 'Invader') {
				Memory.lastAutoRaidTs = Game.time + attackTimer;
			}
			
			assignedSpawners++;

			registerWeakened(roomIntel, weakenedTarget);
			nukeIfValid(nukeTargets, highNukeScore, roomName, roomIntel, playerName);
						
		}
	}


	if (!assingedPlayer) {
		for (let roomName in Memory.raids.activeTargets) {
			let playerName = getPlayerByRoomName(roomName);
			if (playerName) {
				assingedPlayer = playerName;
				break;
			}
		}

		if (!assingedPlayer) {
			for (let roomName in Memory.combatDeconstruct) {
				let playerName = getPlayerByRoomName(roomName);
				if (playerName) {
					assingedPlayer = playerName;
					break;
				}
			}			
		}
	}

	// Harass remotes?
	targets = [];
	for (let playerName in Memory.players) {
		
		if (SEASONAL_COMMS) { continue; }
		if (playerName === "Invader") { continue; }
		if (ALLIES[playerName] || AVOID[playerName] || ALLOW_SCORE[playerName]) { continue; }
		if (playerIsDead(playerName)) { continue; }

		if (!Memory.players[playerName].conflictRemotes && Memory.myRoomHighPRCL < CONTROLLER_MAX_LEVEL) { continue; }
		if (!playerRageAbove(playerName , 0.25) && assingedPlayer !== playerName && !Memory.players[playerName].conflictRemotes ) { continue; }

		let rageMultiplier = getPlayerRage(playerName);
		let lostRoomsRatio = Memory.players[playerName].lostRoomsRatio || 0
		
		if (assingedPlayer && playerName !== assingedPlayer) { continue; }

		let activeSafemode = playerHasActiveSafemode(playerName)
		if (activeSafemode) {
			rageMultiplier += 3;
		} else if (conflictRemotesMax && !Memory.players[playerName].conflictRemotes && !assingedPlayer) { 
			// If players have conflicting remotes with me, attack them first
			continue; 
		}

		let maxRoomRange = 9;
		if (activeSafemode || playerName === assingedPlayer) {
			maxRoomRange = 16;
		}
		
		for (let roomName in Memory.players[playerName].remotes) {

			let score = 0;	// Higher is better target
			let roomIntel = Memory.players[playerName].remotes[roomName];

			if (!Memory.rooms[roomName] || 
				!Memory.rooms[roomName].enemyRemoteTs ||
				Game.time > Memory.rooms[roomName].enemyRemoteTs ||
				Memory.rooms[roomName].enemyRemote !== playerName
			) { 
				continue; 
			}

			// Player hate
			score += rageMultiplier;

			// Player has lost rooms
			score += lostRoomsRatio;

			// My rooms wants this remote
			if (roomIntel.overlapping) {
				score += 1;
			}

			if (roomIntel.attacks !== undefined) {
				let attackKeys = Object.keys(roomIntel.attacks)
				let lastAttack = roomIntel.attacks[attackKeys[attackKeys.length-1]]
				if (lastAttack && lastAttack.ts > (Game.time - 1000)) {
					continue;
				}
			}			
			
			// My rooms in range
			if (roomIntel.myRoomsInRange === undefined || 
				(getRoomPRCL(roomName) !== roomIntel.oldPRCL) ||
				roomIntel.allowedRange !== maxRoomRange || 
				!roomIntel.rangeTs || Game.time > roomIntel.rangeTs
			) {
				roomIntel.allowedRange = maxRoomRange;
				roomIntel.rangeTs = Game.time + 4000 + (Math.random() * 2000);
				let requiredPrcl = Math.min(Math.max(Memory.myRoomHighPRCL, 5), 7);
				roomIntel.myRoomsInRange = getMyClosestRooms(roomName, requiredPrcl, 3, maxRoomRange);
			}

			if (Object.keys(roomIntel.myRoomsInRange).length === 0) { continue; }

			for (let myRoom in roomIntel.myRoomsInRange) {
				let dist = Math.min(roomIntel.myRoomsInRange[myRoom].dist, maxRoomRange)	
				let add = (maxRoomRange - dist) / 5;
				score += add;
			}

			// Sources
			if (Memory.rooms[roomName] && Memory.rooms[roomName].sources) {
				score += Object.keys(Memory.rooms[roomName].sources).length;
			}

			// Exits to owned player room
			if (roomIntel.adjacentToOwner) {
				score += 1;
			}

			// Active reservation
			if (Memory.rooms[roomName].RCLreserved && Memory.rooms[roomName].RCLreserved.ticksToEnd > 0) {
				score += Memory.rooms[roomName].RCLreserved.ticksToEnd / CONTROLLER_RESERVE_MAX;
			}
			
			// Potential structures to destroy



			targets.push({score: score, roomName: roomName, playerName: playerName});
		}
	}

	targets.sort(function(a, b) {
		return (b.score - a.score);});

	console.log(JSON.stringify(targets))


	for (let idx in targets) {
		let roomName = targets[idx].roomName;
		let playerName = targets[idx].playerName;

		let roomIntel = Memory.players[playerName].remotes[roomName];

		let randomReq = 0.01;
		let reqROI = 2;
		if (playerHasActiveSafemode(playerName) || assingedPlayer === playerName || roomIntel.overlapping ) {
			randomReq += 0.33;
			reqROI = 0.75;
		}

		if (assingedPlayer && playerName === assingedPlayer) { 
			randomReq += 0.33;
			reqROI = 0.5;
		 }

		// Check PITA
		if (!Memory.rooms[roomName].pitaTs || Game.time > Memory.rooms[roomName].pitaTs) { 
			let returnOfInvestement = remoteHarassRoI(playerName, roomName, "pita");		
			
			if (returnOfInvestement === undefined || returnOfInvestement >= reqROI || Math.random() > randomReq) {
				orderPita(roomName, roomIntel.myRoomsInRange);
				log("sending PITA harassers to " + roomName + " harass " + playerName)
				continue;
			}
		}

		// Check Ranged attackers			
		let returnOfInvestement = remoteHarassRoI(playerName, roomName, "rangedAttacker");
		if (returnOfInvestement === undefined || returnOfInvestement >= reqROI || Math.random() > randomReq) {
			for (let spawner in roomIntel.myRoomsInRange) {
				if (Game.rooms[spawner].energyStatus() < ECONOMY_DEVELOPING) { continue; }
				if (Memory.rooms[spawner].sieged) { continue; }
					
				orderRangedAttackers(roomName, 1250, "harass remote! V3");
				log("sending RA harassers to " + roomName + " harass " + playerName)
				break;
			}
		}
	}

	let used = Game.cpu.getUsed()-init;
	console.log("attackCoordinatorV3 cpu used " + used.toFixed(2));
}

global.getPlayerFocusedTarget = function() {

	if (Memory.playerFocusedTarget) {
		if (Game.time > Memory.playerFocusedTargetTs) { 
			delete Memory.playerFocusedTarget
			return;
		}
		let duration = Memory.playerFocusedTargetTs - Game.time
		log("attackCoordinatorV3 focusing player " + Memory.playerFocusedTarget + " for the next " + duration + " ticks" )		
	
		return Memory.playerFocusedTarget;
	}
}

global.setPlayerFocusedTarget = function(playerName, myRelativeRcl) {

	if (getPlayerFocusedTarget() ) {
		return getPlayerFocusedTarget()
	}

	if (Memory.playerFocusedTargetTs && Game.time < Memory.playerFocusedTargetTs) {
		return;
	}

	if (myRelativeRcl < 0.9) {
		delete Memory.playerFocusedTarget;
		return;
	}

	if (playerName === "Invader") { return; }
	if (!Memory.players[playerName] || Memory.players[playerName].hasRoomsOutOfReach) { return; }
	if (getPlayerRage(playerName) < 0.75 && !Memory.players[playerName].conflictRemotes) { return; }

	Memory.playerFocusedTarget = playerName;
	Memory.playerFocusedTargetTs = Game.time + 12500 + (Math.floor(Math.random() * 5000))
	return playerName;
}


/*
global.setPlayerFocusedTarget = function(targets, myRelativeRcl) {

	if (Memory.playerFocusedTargetTs && Game.time < Memory.playerFocusedTargetTs) {
		return;
	}

	if (myRelativeRcl < 0.9) {
		delete Memory.playerFocusedTarget;
		return;
	}

	for (let idx in targets) {
		let roomName = targets[idx].roomName;
		let playerName = targets[idx].playerName;
		let weakenedTarget = targets[idx].weakenedTarget;	

		if (playerName === "Invader") { continue; }

		if (!Memory.players[playerName] || Memory.players[playerName].hasRoomsOutOfReach) { break; }
		if (getPlayerRage(playerName) < 0.75) { continue; }

		Memory.playerFocusedTarget = playerName;
		Memory.playerFocusedTargetTs = Game.time + 12500 + (Math.floor(Math.random() * 5000))
		return playerName;
	}

	delete Memory.playerFocusedTarget;
	return;

}
*/

global.roomHp = function(room) {

	if (!room) { return 0; }

	let structures = room.find(FIND_STRUCTURES);

	let hp = 0;
	for (let idx in structures) {
		let structure = structures[idx];
		if (structure.structureType === STRUCTURE_ROAD || structure.structureType === STRUCTURE_CONTAINER) { continue; }
		if (!structure.hits) { continue; }
		hp += structure.hits;
	}
	return hp;
}

function scorePossibleAttack(requiredWaves, distance, cost = 1) {
	let score = 0

	let effectiveRequiredWaves = effectiveWaves(requiredWaves, distance || 10);
	score += Math.min(15, 5 / effectiveRequiredWaves);	// limit?	

//	score 

//	score += Math.ceil(effectiveRequiredWaves) / cost??

	//	let score = breachableData.requiredWaves * roomIntel.myRoomsInRange[spawner].dist
	//	let score = Range + Required Waves + Affordable Waves / Wave Cost


	return score;
}

function effectiveWaves(requiredWaves, distance) {	
	let minimumWastedTime = 75; // bootsing / waiting for creeps spawning / rallying etc

	let effectiveRequiredWaves = requiredWaves / ((CREEP_LIFE_TIME - minimumWastedTime - (distance * 35)) / CREEP_LIFE_TIME)
	return effectiveRequiredWaves;
}

function addPossibleAttack(possibleAttacks, attackType, spawner, breachableData) {

	if (possibleAttacks[attackType] === undefined) { possibleAttacks[attackType] = []; }
	
	let score = 0;
	score -= breachableData.requiredWaves / 5;
	score += breachableData.affordableWaves;

	possibleAttacks[attackType].push({spawner: spawner, requiredWaves: breachableData.requiredWaves});

}

function allowedWeakened(roomIntel, weakenedTarget) {
	if (roomIntel.weakened === undefined) {
		return weakenedTarget;
	}

	if (Game.time < roomIntel.weakened.alowedTs) {
		return weakenedTarget;
	}

	if (Game.time > roomIntel.weakened.ts) {
		delete roomIntel.weakened
		return weakenedTarget;
	}

	return 1.0;
}

function registerWeakened(roomIntel, weakenedTarget){
	if (weakenedTarget >= 1) { 		
		return; 
	}
	
	if (roomIntel.weakened === undefined) {
		roomIntel.weakened = {}	
		roomIntel.weakened.weakenedTarget = weakenedTarget;
		roomIntel.weakened.ts = Game.time + 75000;
		roomIntel.weakened.alowedTs = Game.time + 3500;
	}
}

function wavesAffordable(boosts) {

	let wavesCanBeSent = Infinity;

	for (let boost in boosts) {
		let requiredAmountPerWave = boosts[boost].amount || 1000;
		let compound = boosts[boost];
		let stockedBoost = Memory.Minerals[compound] || 0;
		let waves = stockedBoost / requiredAmountPerWave;
	//	console.log("checking boost " + compound +" has in stock " + stockedBoost + " required " + requiredAmountPerWave + " waves possible " + waves.toFixed(1))
		wavesCanBeSent = Math.min(wavesCanBeSent, waves);
	}

//	console.log("has enough boosts for " + wavesCanBeSent.toFixed(1) + " for boost request " + JSON.stringify(boosts));
	return wavesCanBeSent;
}


function breachableInWaves(attackStrength, breachHp, wantedWaves, weakenedTarget, boosts, breachableData = {}) {
	
	let requiredWaves = wavesRequiredToBreach(attackStrength, breachHp);
	let reducedWaves = 	(requiredWaves * weakenedTarget);
	breachableData.requiredWaves = reducedWaves;

	if (reducedWaves > wantedWaves) { return false; }

	let affordableWaves = wavesAffordable(boosts);
	if (affordableWaves < reducedWaves) { return false; }

	breachableData.affordableWaves = affordableWaves;
	return true;
}

function wavesRequiredToBreach(attackStrength, breachHp) {

	let hpToBreach = breachHp || 25000;

	let attackTicks = 1000;
	let dmgInLifeTime =  attackTicks * (attackStrength || 50);
	let wavesRequired = hpToBreach / dmgInLifeTime;

	console.log(" requires "+ wavesRequired.toFixed(1) + "waves to breach " + hpToBreach + " with dmg " + dmgInLifeTime)
	return wavesRequired;
}

function nukeIfValid(nukeTargets, highNukeScore, roomName, roomIntel, playerName) {

	if (roomIntel.isStronghold) { return 0;}

	let nukeScore = 0;
	if (nukeTargets[roomName] && 
		nukeTargets[roomName].nukeScore
	) {
		nukeScore = nukeTargets[roomName].nukeScore;
	}
	log("nukeIfValid checking target " + roomName + " nuke score "+ nukeScore + "/" + highNukeScore.toFixed(3) + " - "+ JSON.stringify(nukeTargets[roomName]) )

	let maxNukes = 1;
	let launchedNukes = countIncomingNukes(roomName);
	let launchAtSpawns = false;

	if (Memory.players[playerName].hasNukeResponse === undefined) {
		maxNukes = 1;
	} else if (Memory.players[playerName].hasNukeResponse === true) {
		launchAtSpawns = false;
		maxNukes = 10;
	} else if (!Memory.players[playerName].hasNukeResponse === false) {
		maxNukes = 3;
		launchAtSpawns = true;
	}

	let timeBetween = 300;

	if (launchedNukes >= maxNukes) { return; }

	if (!launchAtSpawns) {
		
		if (nukeTargets[roomName] && 
			nukeTargets[roomName].nukeScore >= highNukeScore * 0.25){
			log("valid nuke target at " + roomName + " with score " + nukeTargets[roomName].nukeScore + " pointing " + nukeTargets[roomName].nukersInRange.length + " nukes at the room ")
			
			
			for (let idx in nukeTargets[roomName].nukersInRange) {	
				
				if (launchedNukes >= maxNukes) { break; }
				let nuker = nukeTargets[roomName].nukersInRange[idx];
				let nukeTime = Game.time + (timeBetween * idx)
				requestNuke(posDecompress(roomIntel.nukeTarget.pos, roomName), nukeTime, 1, nuker);
				log("requesting nuke at " + roomName + " tick " + nukeTime)
				launchedNukes++			
			}
		}
	} else {

		let usedNukers = {}
		for (let idx in nukeTargets[roomName].spawnTargets) {
			for (let idx2 in nukeTargets[roomName].nukersInRange) {

				if (usedNukers[nuker.id]) { continue; }
				
				if (launchedNukes >= maxNukes) {
					break;
				}

				let nuker = nukeTargets[roomName].nukersInRange[idx2];
				let nukeTime = Game.time + (timeBetween * idx)

				requestNuke(posDecompress(roomIntel.nukeTarget.pos, roomName), nukeTime, 1, nuker);
				usedNukers[nuker.id] = {};
				log("requesting nuke at " + roomName + " tick " + nukeTime)
				launchedNukes++	

			}
		}
	}
	
}


global.orderPita = function(roomName, spawners){
	if (!Memory.pita[roomName]) {
		Memory.pita[roomName] = {};
		if (spawners !== undefined) {
			Memory.pita[roomName].assignedSpawn = spawners;
		} else {
			Memory.pita[roomName].assignedSpawn = getMyClosestRooms(roomName, 2, 3, 20);
			return console.log(JSON.stringify(Memory.pita[roomName].assignedSpawn))
			
		}
	}
}

function sortMineOps(spawner) {


	let sortedMineOps = {}
	let sortable = []	// ROOMS
	
//	let rcl = getRoomRCL(spawner)
	for(let room in Memory.rooms[spawner].remoteMineOps) {

		if (Memory.rooms[spawner].remoteMineOps[room].eps) {
			sortable.push({roomName: room, score: Memory.rooms[spawner].remoteMineOps[room].eps, data: Memory.rooms[spawner].remoteMineOps[room]});
		} else {
			let sortableId = []; // Sources
			let netEnergy = 0;
			let spawnCycles = 0;
	
	
			for (let sourceId in Memory.rooms[spawner].remoteMineOps[room].sources) {
				if (Memory.remoteSources[sourceId] && Memory.remoteSources[sourceId].score) {
					netEnergy += Memory.remoteSources[sourceId].score.netEnergy
					spawnCycles += Memory.remoteSources[sourceId].score.spawnTicksPerCycle
					let energyPerSpawnTickSource = Memory.remoteSources[sourceId].score.netEnergy / Memory.remoteSources[sourceId].score.spawnTicksPerCycle;
					sortableId.push([sourceId, energyPerSpawnTickSource, Memory.remoteSources[sourceId].distance, Number(Memory.remoteSources[sourceId].score.netEnergy.toFixed(2))]);
				}
			}
	
			// Sort Sources
			sortableId.sort(function(a, b) {
				return b[1] - a[1];});
	
			let length = sortableId.length
			Memory.rooms[spawner].remoteMineOps[room].sources = {}
			for (let i=0; i<length; i++) {
				Memory.rooms[spawner].remoteMineOps[room].sources[sortableId[i][0]] = {};
				Memory.rooms[spawner].remoteMineOps[room].sources[sortableId[i][0]].range = sortableId[i][2];
				Memory.rooms[spawner].remoteMineOps[room].sources[sortableId[i][0]].netEnergy = sortableId[i][3];
			}
	
			let energyPerSpawnTick = netEnergy / spawnCycles // Energy per effort
			sortable.push({roomName: room, score: energyPerSpawnTick, eps: energyPerSpawnTick});	
		}

				
	}

	sortable.sort(function(a, b) {
		return b.score - a.score;});

	sortedMineOps = {}
	for (let idx in sortable) {
		let remoteRoom = sortable[idx].roomName;

		if (sortable[idx].data) {
			sortedMineOps[remoteRoom] = sortable[idx].data
		} else {
			sortedMineOps[remoteRoom] = {}
			sortedMineOps[remoteRoom] = Memory.rooms[spawner].remoteMineOps[remoteRoom]
			sortedMineOps[remoteRoom].eps = Number(sortable[idx].score.toFixed(3)) // energyPerSpawnTick
		}
	}
	Memory.rooms[spawner].remoteMineOps = {}
	Memory.rooms[spawner].remoteMineOps = sortedMineOps

}

function addRemotesByExit(room, depth) {

	if (Memory.miningTarget === undefined) {Memory.miningTarget = {} }
//	Memory.miningTarget = {}
	if (depth > 0) {
		for (let exit in getExits(room) ){

			if (Memory.rooms[exit]) {
				if (Memory.rooms[exit].myRoom) { continue; }
			}

			if (Memory.miningTarget[exit] === undefined && !roomIsHW(exit)) {Memory.miningTarget[exit] = {} }
			
			addRemotesByExit(exit, depth-1)
		}
	}
}

function addByExitMineral(room, depth) {
	
	if (Memory.mineralTarget === undefined) {Memory.mineralTarget = {} }
	if (depth > 0) {
		for (let exit in getExits(room) ){
			if (roomIsSk(exit) || roomIsCenter(exit)) {
				if (Memory.mineralTarget[exit] === undefined) {Memory.mineralTarget[exit] = {} }
			}
			addByExitMineral(exit, depth-1)
		}
	}
}

function addHostilesByExits(room, depth, object = {} ) {
	if (depth > 0) {
		for (let exit in getExits(room) ){
		//	console.log("addHostilesByExits checking room " + exit)
			if (Memory.rooms[exit] && Memory.rooms[exit].hostileRoom) {
			//	console.log("addHostilesByExits adding room " + exit)
				if (object[exit] === undefined) { object[exit] = {} }
			}
			addHostilesByExits(exit, depth-1, object);
		}
	}
}

function addHostileRemotesByExits(room, depth, object) {
	if (depth > 0) {
		for (let exit in getExits(room) ){
		//	console.log("addHostilesByExits checking room " + exit)
			if (Memory.rooms[exit] && Memory.rooms[exit].RCLreserved && !ALLIES[Memory.rooms[exit].RCLreserved.username] ) {
				if (object[exit] === undefined) { object[exit] = {} }
			}
			addHostileRemotesByExits(exit, depth-1, object)
		}
	}
}


function reassignHelpers(newRoom) {

	let currentHelpers = getCreeps('helper')

	let targetRooms = [];
	if (newRoom) {
		targetRooms.push(newRoom);

	} else {
		for (let room in Memory.helpNeeded) {
			if (Memory.helpNeeded[room].shard) { continue; }
			targetRooms.push(room);
		}
	}

	let roomHelpers = _.groupBy(currentHelpers, c=>c.memory[C.ROOM_TARGET]);

//	log("reassign helpers " + newRoom)

	let newAssignments = {}
	
	for (let i=0; i < currentHelpers.length; i++){
	//	log("reassignHelpers checking helper " + currentHelpers[i] + " in help room " + Memory.helpNeeded[currentHelpers[i].memory[C.ROOM_TARGET]] + " ttl " + currentHelpers[i].ticksToLive);
		let assigned = false;
		if (currentHelpers[i].ticksToLive < 300 || (currentHelpers[i]._memory.shard !== undefined && currentHelpers[i]._memory.shard !== Game.shard.name )) { continue; }
		let creepRoom = currentHelpers[i].memory[C.ROOM_TARGET];
		if (creepRoom === newRoom) { continue; }
		if (Memory.expansionTarget[NEXT_EXPANSION] && Memory.expansionTarget[NEXT_EXPANSION].roomName === creepRoom ) {
			continue; 
		}
	
		if (Memory.helpNeeded[creepRoom] === undefined || roomHelpers[creepRoom].length >= 3 ) {

			for (let idx in targetRooms) {
				let room = targetRooms[idx];

				let currentHelpersInRoom = 0;
				if (newAssignments[room]) {
					currentHelpersInRoom += newAssignments[room].cnt;
				}
				
				if (roomHelpers && roomHelpers[room]) {
					currentHelpersInRoom += roomHelpers[room].length;
				}

				if (currentHelpersInRoom >= 2) { continue; }

			//	log("reassignHelpers potential target " + room);
				if (getRoomLinearDistance(creepRoom, room) > 6) { continue; }
				let routeLength = getRouteDistanceOnly(creepRoom, room);
				if (routeLength <= 3) {

					reassignHelperTo(currentHelpers[i], room);
					if (newAssignments[room] === undefined) { 
						newAssignments[room] = {} 
						newAssignments[room].cnt = 0;
					}
					newAssignments[room].cnt++;

					requestMemSave();			
					assigned = true;
					break;
				}
			}
		} else {
			assigned = true;
			continue;
		}		

		// help out in origin room instead
		if (!assigned) {
			reassignHelperTo(currentHelpers[i], currentHelpers[i].memory[C.ROOM_ORIGIN])
		}
	}
}

global.reassignHelperTo = function(creep, roomName) {
	creep._memory[C.ROOM_TARGET] = roomName;
	creep._memory[C.TARGET_POS] = pullIdlePosForRoom(roomName);
	creep.clearTarget();
}

function sendResource(reciever, myRooms, amountToSend, resourceType){
	let donator 
	let bestScore = 0;
	for (let roomName in myRooms) {
		let score = 0;
		if (roomName === reciever) { continue; }
		if (!Game.rooms[roomName].terminal || Game.rooms[roomName].terminal.__cooldown || Game.rooms[roomName].terminal.store[RESOURCE_ENERGY] < 1000) { continue; }

		score += Game.rooms[roomName].store(resourceType) / 1100000;
		score += Math.min(Game.market.calcTransactionCost(1000, roomName, reciever) / 1000, 1);
		if (score > bestScore) {
			bestScore = score;
			donator = roomName;
		}
	}
	
	if (donator) {
		amountToSend = limit(amountToSend, 0, Game.rooms[donator].terminal.store[resourceType])	
		let cost = Game.market.calcTransactionCost(amountToSend, donator, reciever)

		if (resourceType === RESOURCE_ENERGY && cost + amountToSend >= Game.rooms[donator].terminal.store[resourceType]) {
			amountToSend = amountToSend - cost;
		}

		let result = Game.rooms[donator].terminal.send(resourceType, amountToSend, reciever);		
		log("emergency send of "+amountToSend+resourceType+" from " + donator + " to " +reciever + " result " + result)
	}
}




global.stockUpBoostsForPowerRooms = function(myRooms) {

	if (!myRooms) {
		myRooms = getMyRooms();
	}

	let donator = {};
	let reciever = {};
	for (let roomName in myRooms) {
		if (!Game.rooms[roomName].terminal) { continue; }
		if (isAbandonedRoom(roomName)) { continue; }
		if (Memory.rooms[roomName].mineOnly) { continue; }


		for (let boost in T3_POWERBOOSTS) {
			let desiredAmount = 3000;
			if (Game.rooms[roomName].controller.isPowerEnabled) {
				desiredAmount = T3_POWERBOOSTS[boost];
			} else {
				continue;
			}
			let myAmountDiff = Game.rooms[roomName].store(boost) - desiredAmount;
			let action = reciever;
			if (myAmountDiff > 0) {
				if (Game.rooms[roomName].terminal.__cooldown) { continue; }
				action = donator;
			} else {
				if (Game.rooms[roomName].terminal.freeSpace < 1500 ) { continue; }
			}
			myAmountDiff = Math.abs(myAmountDiff);
			
			if (action[boost] === undefined) { 
				action[boost] = {};
				action[boost].amount = 500;
				action[boost].roomName = roomName;
			}
			if (myAmountDiff > action[boost].amount) {
				action[boost].amount = myAmountDiff;
				action[boost].roomName = roomName;
			}
		}
	}

	for (let boost in T3_POWERBOOSTS) {
		if (!donator[boost] || !donator[boost].roomName || !reciever[boost] || !reciever[boost].roomName) { continue; }

		let donorRoom = donator[boost].roomName;
		let donorTerminal = Game.rooms[donorRoom].terminal;
		if (donorTerminal.__cooldown) { continue; }
		let recieverFreeSpace = Game.rooms[reciever[boost].roomName].terminal.freeSpace;		
		let boostToSend = Math.min(donorTerminal.store[boost], reciever[boost].amount, recieverFreeSpace);

		let cost = Game.market.calcTransactionCost(boostToSend, donorRoom, reciever[boost].roomName);
		let affordableSend = Math.floor((cost / boostToSend)* donorTerminal.store[RESOURCE_ENERGY]);
		boostToSend = Math.min(affordableSend, boostToSend);

		if (!boostToSend || boostToSend < TERMINAL_MIN_SEND) { continue; }		

		let result = donorTerminal.send(boost, boostToSend, reciever[boost].roomName);	
		if (result === OK) {
			donorTerminal.__cooldown = TERMINAL_COOLDOWN;
		}
		console.log("stockUpBoostsForPowerRooms " +donorRoom + " sending " +boostToSend + " " +boost + " to " + reciever[boost].roomName + " result " + result);		
	}
}

function spawnOprGcl(roomName){
	let oprGcl = _.filter(Game.powerCreeps, 
		function(c) {return (c.memory[C.ROLE] === 'oprGCL')
		});

	let operatorsToAssign = [];
	for (let idx in oprGcl) {
		let operator = oprGcl[idx];		
		if (operator.shard === undefined){ 
			if (!operator.spawnCooldownTime) {
				operatorsToAssign.push(operator);	
			}
		} else {
			if (operator.memory[C.ROOM_TARGET] === roomName) {
				return;
			}
		}
	}

	if (operatorsToAssign.length > 0){
		operatorsToAssign[0].memory[C.ROOM_TARGET] = roomName;
	}
}

function myRoomsCheck(myRooms) {
	let highRCL = 0;
	let highPRCL = 0;
	let terminalCapable = 0;
	for (let roomName in myRooms){
		if (!Game.rooms[roomName]) { // ROOM LOST 
			delete Memory.rooms[roomName];
			continue;
		}

		let roomRCL = getRoomRCL(roomName)
		let roomPRCL = getRoomPRCL(roomName)

		if (roomRCL > highRCL ){
			highRCL = roomRCL;			
		}

		if (roomPRCL > highPRCL ){
			highPRCL = roomPRCL;			
		}

		if (!Memory.buildTerminal && !DISABLED_TERMINAL){
			if (roomRCL >= 6){
				terminalCapable++
			}
		}

		if (roomPRCL < 6 && 
			roomPRCL >= 4 && 
			Memory.myRoomHighPRCL >= 7 &&
			Memory.rooms[roomName].roomBreached &&
			Game.rooms[roomName].store(RESOURCE_ENERGY) < 150000	
		){
			orderEnergyCart(roomName, 500);
		}

		if (BOT_MODE && roomIsSafeModed(roomName) ) {
			
			if (roomIsSafeModed(roomName) < 1000) {
				orderRangedAttackers(roomName, 5000, 'safemoded');
			}
		}
	}

	Memory.myRoomHighRCL = highRCL;
	Memory.myRoomHighPRCL = highPRCL;

	if (terminalCapable >= 2 && highRCL >= 7){
		Memory.buildTerminal = true;
	}	
}



global.setWallHpSetpoints = function(myRooms) {

	if (!myRooms) {
		myRooms = getMyRooms()
	}

	let highfPRCL = 0;

	if (Memory.myRoomHighPRCL >= 8) {
		WALL_HP_SETPOINT = WALL_HP_SETPOINT_NORMAL;
	} else if (Memory.myRoomHighPRCL >= 7) {
		
		for (let roomName in myRooms){

			if (!Game.rooms[roomName]) { continue; }
			let roomPRCL = getRoomPRCL(roomName)

			if (roomPRCL < 7) { continue; }

			let fPRCL = 0;	// fraction next prcl
			
			if (Game.rooms[roomName].controller) {
				fPRCL = Game.rooms[roomName].controller.progress / Game.rooms[roomName].controller.progressTotal
			}

			if (fPRCL > highfPRCL) {
				highfPRCL = fPRCL;
			}
		}

		log("factor wall increase " + highfPRCL)

		for (let level in WALL_HP_SETPOINT_NORMAL) {
			let increase = WALL_HP_SETPOINT_NORMAL[level] - WALL_HP_SETPOINT_START[level]
			WALL_HP_SETPOINT[level] = WALL_HP_SETPOINT_START[level] + (increase*highfPRCL)			
		}
	} else {
		WALL_HP_SETPOINT = WALL_HP_SETPOINT_START;
	}	
}


function trackGclLevelTimes() {

	if (Game.time % 33 !== 0) { return}
	// TRACK RCL PROGRESS TIME					
	if (Memory.GclLevels === undefined) { Memory.GclLevels = {} } 
	if (Memory.GclLevels[Game.gcl.level] === undefined) {
		Memory.GclLevels[Game.gcl.level] = {};
		Memory.GclLevels[Game.gcl.level].start = Game.time;
		if (Memory.GclLevels[1]) {
			Memory.GclLevels[Game.gcl.level].time = Game.time - Memory.GclLevels[1].start;	
		}
	}
}


global.attackMultiplier = function() {

	if (Memory.myRoomHighPRCL < CONTROLLER_MAX_LEVEL) {
		return 1;
	}

	if (!Memory._attackMulTs || Game.time > Memory._attackMulTs) {
		Memory._attackMulTs = Game.time + 15000;

		let myRelativeSumRcl = Memory.myRelativeRcl || 1;

		if (myRelativeSumRcl < 1) { // im behind!
			// change up, attack more..?
		}


		Memory.attackMultiplier = limit(myRelativeSumRcl, 0.85, 3);


	}

	return Memory.attackMultiplier || 1
}

function updatePlayerData(){
	
	if (Memory.playersTs && Game.time < Memory.playersTs) {
		return 0;
	}

	Memory.playersTs = Game.time + 137;
	let scoutTs = Game.time - 750;

	let _attackMultiplier = attackMultiplier() || 1;

	for (let playerName in Memory.players) {
		let estimatedSumRcl = 0; 
		let estimatedSumPrcl = 0;
		let playerData = Memory.players[playerName];

		if (playerData.ts && Game.time > playerData.ts) {
			delete Memory.players[playerName]; 
			continue;
		}

		let playerDead = false;
		if (playerData.highPRCL !== undefined && playerData.highPRCL === 0) {
			playerDead = true;
		}
		playerData.highPRCL = 0;
		
		let timeout = Game.time - 100000;

		for (let ownedRoom in playerData.ownedRooms) {

			if (playerName === "Invader") {
				if (!Memory.rooms[ownedRoom] || !Memory.rooms[ownedRoom].invaderCore) {
					delete playerData.ownedRooms[ownedRoom];
					continue;
				}
				playerData.highPRCL = Math.max(playerData.highPRCL, Memory.rooms[ownedRoom].invaderCore.level); 
			} else {
				if (!Memory.rooms[ownedRoom] || !Memory.rooms[ownedRoom].player || Memory.rooms[ownedRoom].player !== playerName) { 
					delete playerData.ownedRooms[ownedRoom];
					continue;
				}
				let scoutController = getRoomCache(ownedRoom).scoutController;
				if (scoutController && scoutController < scoutTs) {
					requestRoomVision(ownedRoom);
				}

				playerData.highPRCL = Math.max(playerData.highPRCL, getRoomPRCL(ownedRoom) ); 
			}
			
			estimatedSumRcl += getRoomRCL(ownedRoom) || 0;
			estimatedSumPrcl += getRoomPRCL(ownedRoom) || 0;


			// Rate attacks
			for (let id in playerData.ownedRooms[ownedRoom].attacks) {

				if (!id){
					delete playerData.ownedRooms[ownedRoom].attacks[id];
					continue;
				}

				let attackData = playerData.ownedRooms[ownedRoom].attacks[id];

				if (Game.time < attackData.ts + 450) { continue; } // dont eval yet

				if (attackData.ts < timeout) {
					delete Memory.players[playerName].ownedRooms[ownedRoom].attacks[id];
					continue;
				}

				if (attackData.score !== undefined) { continue; }

				let creepsAlive = false;
				for (let creepId in attackData.attackers) {
					let creep = Game.getObjectById(creepId);
					if (creep) { 
						creepsAlive = true; 
						break;
					}
				}

				if (creepsAlive) { continue; }	// attack is still going 

				if (attackData.attackType === 'pita' || attackData.attackType === 'invaderKiller' || attackData.attackType === 'rangedAttacker' ) {
					delete Memory.players[playerName].ownedRooms[ownedRoom].attacks[id]
					continue;
				}

				// energy dmg
				attackData.dmgscore = (attackData.energyDmg * _attackMultiplier) / attackData.cost;

				// Accumulated cost
				if (Memory.players[playerName].ownedRooms[ownedRoom].attackCost === undefined) { Memory.players[playerName].ownedRooms[ownedRoom].attackCost = 0;}
				Memory.players[playerName].ownedRooms[ownedRoom].attackCost += attackData.cost;

				// energy depleted
				let energyDepleted = 0;
				if (attackData.storedEnergy) {
					energyDepleted = attackData.storedEnergy - playerData.ownedRooms[ownedRoom].storedEnergy;
				}				
				let energyScore = energyDepleted / attackData.cost;
				attackData.energyScore = energyScore;		

				// triggered safemode?
				let safeModeScore = 0;
				if (roomIsSafeModed(ownedRoom)) {
					safeModeScore = 2;
					attackData.safeModeScore = safeModeScore;
				}

				// breach hp removed?
				let breachHpScore = 0;
				let breachHpEnd = playerData.ownedRooms[ownedRoom].breachHp || 0
				let breachHpStart = attackData.breachHp || 0;
				if (attackData.phalanx) {
					breachHpEnd = playerData.ownedRooms[ownedRoom].breachHpPhalanx || 0;
					breachHpStart = attackData.breachHpPhalanx || 0;
				}

				if (breachHpStart) {
					let breachHpRemoved = breachHpStart - breachHpEnd;
					attackData.breachHpRemoved = breachHpRemoved;
					let idealHpRemoved = CREEP_LIFE_TIME * 0.75 * attackData.attackPower;
					if (breachHpRemoved > 0 && idealHpRemoved) {
						
						breachHpScore = (breachHpRemoved / idealHpRemoved  ) 
					}
				}

				attackData.score = Math.max(attackData.dmgscore, attackData.energyScore, safeModeScore);

				/*
				// Store average attack data for player
				if (playerData.avgAttacks === undefined) { playerData.avgAttacks = {} }
				
				if (playerData.avgAttacks[attackData.attackType] === undefined) {
					playerData.avgAttacks[attackData.attackType] = {};
					playerData.avgAttacks[attackData.attackType].cnt = 0;
					playerData.avgAttacks[attackData.attackType].score = 0;
				}
				playerData.avgAttacks[attackData.attackType].score = cumulativeAverage(playerData.avgAttacks[attackData.attackType].score, attackData.score, playerData.avgRemoteAttacks[attackData.attackType].cnt)
				
				playerData.avgAttacks[attackData.attackType].cnt = Math.max(playerData.avgAttacks[attackData.attackType].cnt++, 15);
				*/
			}
		}

		

		// rate remote harass
		for (let remote in Memory.players[playerName].remotes) {
			
			if (!Memory.rooms[remote] || Memory.rooms[remote].enemyRemote != playerName) {
				delete Memory.players[playerName].remotes[remote];			
				log(" deleting remote "+remote+" , not matching player name? " + playerName);					
				continue;
			}		

			// Rate attacks
			for (let id in playerData.remotes[remote].attacks) {

				if (id == "undefined"){
					log(" deleting remote "+remote+" , no id? " + id)
					delete playerData.remotes[remote].attacks[id];
					continue;
				}

				let attackData = playerData.remotes[remote].attacks[id];
				if (Game.time < attackData.ts + 450) { continue; } // dont eval yet

				if (attackData.ts < timeout) {
					log(" deleting remote attack in "+remote+" , timed out? " + attackData.ts +"/"+ timeout)
					delete Memory.players[playerName].remotes[remote].attacks[id];
					continue;
				}

				if (attackData.score !== undefined) { continue; }

				let creepsAlive = false;
				for (let creepId in attackData.attackers) {
					let creep = Game.getObjectById(creepId);
					if (creep) { creepsAlive = true; }
				}
				if (creepsAlive) { continue; }	// attack is still going 

				attackData.dmgscore = (attackData.energyDmg * _attackMultiplier) / attackData.cost;
				attackData.score = attackData.dmgscore || 0;

				if (playerData.avgRemoteAttacks === undefined) { playerData.avgRemoteAttacks = {} }
				
				if (playerData.avgRemoteAttacks[attackData.attackType] === undefined) {
					playerData.avgRemoteAttacks[attackData.attackType] = {};
					playerData.avgRemoteAttacks[attackData.attackType].cnt = 0;
					playerData.avgRemoteAttacks[attackData.attackType].score = 0;
				}

				playerData.avgRemoteAttacks[attackData.attackType].score = cumulativeAverage(playerData.avgRemoteAttacks[attackData.attackType].score, attackData.score, playerData.avgRemoteAttacks[attackData.attackType].cnt)
				
				playerData.avgRemoteAttacks[attackData.attackType].cnt = Math.max(playerData.avgRemoteAttacks[attackData.attackType].cnt++, 10);

			}			
		}


		if (playerDead && playerData.highPRCL > 0) {
			playerData.revived = Game.time + 50000;
			log(playerName + " revived! probably owned rooms not discovered? high prcl " + playerData.highPRCL)
		}

		if (playerData.revived && Game.time > playerData.revived ) {
			delete playerData.revived;
		}



		if (playerData.estimatedSumRcl === undefined) { playerData.estimatedSumRcl = 0;}
		if (playerData.maxSumRcl === undefined) { playerData.maxSumRcl = 0; }

		if (playerData.estimatedSumPRcl === undefined) { playerData.estimatedSumPRcl = 0;}
		if (playerData.maxSumPRcl === undefined) { playerData.maxSumPRcl = 0; }

		playerData.maxSumRcl = Math.max(playerData.maxSumRcl, estimatedSumRcl)
		playerData.estimatedSumRcl = estimatedSumRcl;

		playerData.maxSumPRcl = Math.max(playerData.maxSumPRcl, estimatedSumPrcl)
		playerData.estimatedSumPRcl = estimatedSumPrcl;
				
		if (playerData.maxSumPRcl) {
			playerData.lostRoomsRatio = (playerData.maxSumPRcl - playerData.estimatedSumPRcl) / playerData.maxSumPRcl ;
		}

	}
}

global.createPowerCreeps = function(test=false){
	 	
	if (!test && Memory.pcUpgrade && Game.time < Memory.pcUpgrade && Memory.GPL === Game.gpl.level)  {
		return 0;
	}

	Memory.pcUpgrade = Game.time + 1337;	
	Memory.GPL = Game.gpl.level;

	let usedGPL = 0;
	let creepToLevel;
	let creepToMaxLevel;

	let maxFactory = 0;
	let pcFactories = {};
	let amountFactoryPowerCreeps = 0;

	for (let pc in Game.powerCreeps) {
		let powerCreep = Game.powerCreeps[pc];
		usedGPL += powerCreep.level + 1;

		if (SEASONAL_THORIUM && pc === 'oprEco_753') { continue; }

		if (SEASONAL_THORIUM) {
			if (!powerCreep.powers[PWR_REGEN_MINERAL] || powerCreep.powers[PWR_REGEN_MINERAL].level < 4) {
				creepToLevel = powerCreep;
			}
		} else if (powerCreep.level < POWER_CREEP_MAX_LEVEL && pc !== 'oprGCL_34') {
			if (Memory.pcLevels[powerCreep.name] && Memory.pcLevels[powerCreep.name].factoryLevel && (!powerCreep.powers[PWR_OPERATE_FACTORY] || powerCreep.powers[PWR_OPERATE_FACTORY].level < Memory.pcLevels[powerCreep.name].factoryLevel)) {
				creepToLevel = powerCreep;
			} else if (!creepToLevel){
				if (!creepToMaxLevel || powerCreep.level < creepToMaxLevel.level) {
					creepToMaxLevel = powerCreep;
				}				
			}
		}
		

		if (powerCreep.powers[PWR_OPERATE_FACTORY]) {
			amountFactoryPowerCreeps++; 	
			let level = powerCreep.powers[PWR_OPERATE_FACTORY].level;
			if (pcFactories[level] === undefined) { pcFactories[level] = 0; }
			pcFactories[level]++;

			maxFactory = Math.max(maxFactory, powerCreep.powers[PWR_OPERATE_FACTORY].level)
		} else {
			let level = 0;
			if (pcFactories[level] === undefined) { pcFactories[level] = 0; }
			pcFactories[level]++;
		}
	}

	Memory.maxFactoryLevel = maxFactory;
	Memory.amountOfFactories = amountFactoryPowerCreeps;

	if (Game.gpl.level <= usedGPL) { return; }

	let priorityUpgradeLevelOperator = [
		{[PWR_REGEN_SOURCE] : 5},
		{[PWR_OPERATE_FACTORY] : 5},
		{[PWR_GENERATE_OPS] : 5},
		{[PWR_OPERATE_EXTENSION] : 4},
		{[PWR_OPERATE_SPAWN] : 5},
		{[PWR_OPERATE_LAB] : 5},
		{[PWR_OPERATE_TOWER] : 5},
	]

	if (SEASONAL_THORIUM) {
		priorityUpgradeLevelOperator = [
			{[PWR_REGEN_MINERAL] : 5},
			{[PWR_REGEN_SOURCE] : 5},
			{[PWR_GENERATE_OPS] : 5},
			{[PWR_OPERATE_SPAWN] : 5},
			{[PWR_OPERATE_TOWER] : 5},
			{[PWR_OPERATE_LAB] : 5},			
			{[PWR_OPERATE_EXTENSION] : 4},
		
		]
	}

	let times = [1503, 1315, 1160, 1014, 801, 601];
	let bestRatio = 1;
	let bestNextLevel = 0;
	let currentOwned = Infinity;


	if (maxFactory < MAX_FACTORY_LEVEL) {
		bestNextLevel = Math.min(maxFactory+1, MAX_FACTORY_LEVEL);
	} else {
		
		for (let level in times) {
	
			if (level == 0) { continue; }
			let wantedFactories = (times[level] / times[0]) * amountFactoryPowerCreeps;
			let diff = wantedFactories - pcFactories[level];

			let ratio = pcFactories[level] / wantedFactories
			log(" next factory level " + level + " owned " + pcFactories[level] + " diff " + diff.toFixed(1) + " wanted factories " + wantedFactories.toFixed(1) + " ratio " + ratio.toFixed(2))
			if (ratio < bestRatio && pcFactories[level] < currentOwned) {
				bestRatio = ratio;
				bestNextLevel = level;
				currentOwned = pcFactories[level]; // dont allow a level 4 to spawn if you have less owned level 3's etc
			}
		}
	}
	
	log("my pc levels " + usedGPL + "/" +Game.gpl.level + " next factory " + bestNextLevel);
	log("my pc levels " + usedGPL + "/" +Game.gpl.level + " max factory " + maxFactory);

	if (!SPAWN_POWER_CREEPS) { return }
	
	let upgraded = false;
	if (Game.gpl.level > usedGPL) {
		delete Memory.pcUpgrade;
		
		if (!creepToLevel && creepToMaxLevel) {
			creepToLevel = creepToMaxLevel
		}

		if (creepToLevel) {		
			
			if (creepToLevel.level === 0) {
				let result = creepToLevel.upgrade(PWR_GENERATE_OPS)
				if (result === OK){
					upgraded = true;
				}
			}

			if (!upgraded) {
				for (let powerIdx in priorityUpgradeLevelOperator) {
					let power = Object.keys(priorityUpgradeLevelOperator[powerIdx])[0]
					let wantedLevel = priorityUpgradeLevelOperator[powerIdx][power];
					if (power == PWR_OPERATE_FACTORY) {	// no tripple equal?					
						wantedLevel = bestNextLevel;

						if (Memory.pcLevels[creepToLevel.name] && Memory.pcLevels[creepToLevel.name].factoryLevel) {
							wantedLevel = Memory.pcLevels[creepToLevel.name].factoryLevel
						}

						if (Memory.pcLevels[creepToLevel.name] && Memory.pcLevels[creepToLevel.name].factoryLevel && 
							creepToLevel.powers[PWR_OPERATE_FACTORY] && creepToLevel.powers[PWR_OPERATE_FACTORY].level >= Memory.pcLevels[creepToLevel.name].factoryLevel
						) {
							continue;
						}
					}

					if (wantedLevel > 0 &&
						(!creepToLevel.powers[power] || creepToLevel.powers[power].level < wantedLevel)
					){
						let result = creepToLevel.upgrade(power);
						console.log("want to upgrade power " + power + " on power creep "+ creepToLevel + " to wanted level " + wantedLevel + " result " + result);
						if (result === OK){
							upgraded = true;
							break;
						}
					}
				}
			}
		} else {
			let randName = 'oprEco_' + Game.time % 999;
			console.log("creating new power creep " + randName)
			let result = PowerCreep.create(randName, POWER_CLASS.OPERATOR)
			if (result === OK) {
				Memory.pcLevels[randName] = {
					factoryLevel: bestNextLevel
				}
			}
			Memory.newEcoOpr = randName;
			upgraded = true;
			requestMemSave();
		}
	}

	if (upgraded) {
		delete Memory.pcUpgrade;
		Memory.newEcoOpr = Game.time;
	}
}

global.getMineralPriceScore = function() {
		 
	let mineralScore = {};
	let highestPrice = 0.001;
	for (let idx in BASE_MINERALS_ROOMS) {

		let type = BASE_MINERALS_ROOMS[idx];
		if (mineralScore[type] === undefined ) { 
			mineralScore[type] = {}; 
			mineralScore[type].price = 0;
		}
		if (!BASE_MINERALS_ROOMS.includes(type) ) { continue; }

		if (Memory.market.sell[type] && Memory.market.buy[type]) {
			mineralScore[type].price = Math.max(Memory.market.sell[type].avgPrice, Memory.market.buy[type].avgPrice )
		} else {
			mineralScore[type].price = 0.001;
		}
		
		highestPrice = Math.max(highestPrice, mineralScore[type].price)
	}

	return {
		mineralScore: mineralScore,
		highestPrice: highestPrice,
	}
}

function distributeEcoOperators(myRooms){
		
	if (Memory.spawnEcoTs && Game.time < Memory.spawnEcoTs) {
		return 0;
	}
	delete Memory.spawnEcoTs;

	let operators = _.filter(Game.powerCreeps, 
		function(c) {return (c.memory[C.ROLE] === 'oprEco')
		});

	let operatorsToAssign = [];

//	let factoryOperators = {};
	for (let idx in operators) {
		let operator = operators[idx];
		if (!operator.spawnCooldownTime &&
			(operator.shard === undefined && 
			operator.level > 0)
			) {
			if (operator.memory.spawning && operator.memory.spawning < Game.time) { continue; }	
			operatorsToAssign.push(operator);
		}

		if (operator.shard){
			let currentRoom = Game.rooms[operator.memory[C.ROOM_TARGET]];
			if(currentRoom){
				currentRoom._cache.assignedEcoOpr = Game.time + 5;

				if (!operator.powers[PWR_OPERATE_FACTORY]) { continue;  }
				if (Memory.pcLevels[operator.name] && Memory.pcLevels[operator.name].factoryLevel && operator.powers[PWR_OPERATE_FACTORY].level < Memory.pcLevels[operator.name].factoryLevel) { continue; }
				let factory = currentRoom.findByType(STRUCTURE_FACTORY)[0];
				if (!factory || !factory.level || operator.powers[PWR_OPERATE_FACTORY].level === factory.level) { continue; }

				log(currentRoom.name + " has wrong operator factory level! " + operator.powers[PWR_OPERATE_FACTORY].level + "/" + factory.level);
				operator.suicide();
			}
		} else {
			delete operator.memory[C.ROOM_TARGET];
		}
	}
	console.log("operators to spawn " + operatorsToAssign.length)
	if (operatorsToAssign.length <= 0) { return; }	

	// gather market prices
	let mineralPrices = getMineralPriceScore();

	let myRoomsScored = [];
	let myRoomsScoredObject = {}

	for (let roomName in myRooms) {
		let score = 0;
		if (isGCLPraiseRoomStandby(roomName)) { continue; }
		if (!Game.rooms[roomName].hasPowerSpawn() ) { continue; }

		// Score mineral by market value
		for (let mineralId in Memory.rooms[roomName].mineral) {
			let mineralType = Memory.rooms[roomName].mineral[mineralId].type;
			if (mineralPrices.mineralScore[mineralType]) {
				score += mineralPrices.mineralScore[mineralType].price / mineralPrices.highestPrice;
			}
		}

		if (SEASONAL_THORIUM) {
			if (!Game.rooms[roomName].getThorium() ) { continue; }
			for (let reactor in Memory.reactors){
				let reactorData =  Memory.reactors[reactor];
				if (!reactor.active) { continue; }
				if (reactorData.assgnedRooms && reactorData.assgnedRooms[roomName]) {
					score += (7 - reactorData.assgnedRooms[roomName].dist) * 10
				}
			}
		}

		// Score by most remotes
		score += Object.keys(Memory.rooms[roomName].remoteSources).length / 18;

		// Score by most highway (powerbank) access
		score -= hwDistances(roomName) / 8;

		myRoomsScored.push([roomName, score]);
		myRoomsScoredObject[roomName] = {
			score : score
		};

	}

	myRoomsScored.sort(function(a, b) {
		return (a[1] - b[1]);});

	let length = myRoomsScored.length;
	for (let i=0; i<length; i++) {
		let roomName = myRoomsScored[i][0];
		let score = myRoomsScored[i][1];
		console.log("best room " + roomName + " score " +score.toFixed(2))
		if (Game.rooms[roomName]._cache.assignedEcoOpr && Game.time < Game.rooms[roomName]._cache.assignedEcoOpr) { continue; }

		let bestIncrease = 0;
		let bestOperator;
		let bestIdx; 

		let factory = Game.rooms[roomName].findByType(STRUCTURE_FACTORY)[0];
		let factoryLevel = 0;
		if (factory) {
			factoryLevel = factory.level;
		}

		for (let idx in operatorsToAssign) {
			let operator = operatorsToAssign[idx];

			let operatorFactoryLevel = 0;
			if (factoryLevel > 0 && operator.powers[PWR_OPERATE_FACTORY]) {
				operatorFactoryLevel = operator.powers[PWR_OPERATE_FACTORY].level;
				if (operatorFactoryLevel !== factoryLevel) { continue; }
			}

			let increase = score+1;
			if (operator.shard ) {
				increase = score - myRoomsScoredObject[operator.room.name].score 
			}
			if (increase > bestIncrease) {
				bestIncrease = increase;
				bestOperator = operator;
				bestIdx = idx;
			}
		}

		if (bestIncrease) {
			bestOperator.memory[C.ROOM_TARGET] = roomName;
			bestOperator.memory.spawning = Game.time + 50;
			operatorsToAssign.splice(bestIdx, 1);
			Game.rooms[roomName]._cache.assignedEcoOpr = Game.time + 50;
			Memory.spawnEcoTs = Game.time + 25;
			console.log("assigned operator " + bestOperator.name + " to room " + roomName)
			requestMemSave();
		}
		if (operatorsToAssign.length <= 0) { break; }
	}

	
}


function getPriorityIK(room){

	let priority = 0 // higher number is higer priority
	if (roomIsSafeModed(room) > 500) { return 0; }

	if (!Memory.rooms[room] ) { return priority; }

	if (Memory.rooms[room].hostiles) {
		priority += 2;
		priority -= Math.min(1, Memory.rooms[room].hostiles.power.defensive / 1500)
	}
	
	if (Memory.rooms[room].myRoom) { 
		priority += 5;
		if (roomIsSafeModeCd(room) > 0 || Memory.rooms[room].sieged || Memory.rooms[room].hostiles) {
			priority += 20;
		}
	}

	if (Memory.expansionTarget[NEXT_EXPANSION] && Memory.expansionTarget[NEXT_EXPANSION].roomName === room ) {
		priority += 10;
		if (Memory.rooms[room].invaderCore) {
			priority += 5;
		}
	}

	if (Memory.rooms[room][R.MY_MINING_OUTPOST] && Memory.rooms[room].invaderCore && Memory.rooms[room].invaderCore.level === 0) {
		priority += 2;
	}
	
	if (allyRemoteDefence[room]) {
		priority += allyRemoteDefence[room].priority;
	}

	if (Memory.rooms[room].player && Memory.rooms[room].numberOfTowers <= 0 && !roomIsSafeModed(room) && (!Memory.rooms[room].hostiles || Memory.rooms[room].hostiles.power.defensive < 100 )) {
		priority += 8;
	}
	
	if (Memory.rooms[room].isPlayer) {
		priority += 10;
	} else if (Memory.rooms[room].hostiles) {
		priority += 5;
	} else if (Memory.rooms[room][R.INVADER_PROBABLE]) {
		priority += 2;
	}

	return priority;
}

function checkIfMorePowerNeeded(roomName){
	let enemies;
	let roomObj = Memory.rooms[roomName];
	if (roomObj.hostiles && roomObj.hostiles.power) {
		enemies = roomObj.hostiles.power;
	} else if (roomObj[R.INVADER_PROBABLE] && Memory.invaderPower) {
		if (roomObj.sources) {
		//	if (!Memory.invaderPower || !Memory.invaderPower[Object.keys(roomObj.sources).length]) 
			enemies = Memory.invaderPower[Object.keys(roomObj.sources).length];
		} else {
			enemies = Memory.invaderPower[2];
		}
	} else if (roomObj.invaderCore && roomObj.invaderCore.level === 0) {
		enemies = {attackDamage: 250, rangedAttackDamage: 0, healPower: 0}
	}

	if (!enemies) { return false; }
	let requiredResponse = calcResponseForce(enemies);
//	console.log(JSON.stringify(requiredResponse))
	let myDefence = [];
	let myIK = _.filter(getCreeps('invaderKiller'), (creep) => creep._memory[C.ROOM_TARGET] == roomName);
	myDefence = myDefence.concat(myIK);
	let myRangers = _.filter(getCreeps('rangedAttacker'), (creep) => creep._memory[C.ROOM_TARGET] == roomName);
	myDefence = myDefence.concat(myRangers);
	if (Memory.rooms[roomName] && Memory.rooms[roomName].myRoom) {
		let myDefenders = _.filter(getCreeps('defender'), (creep) => creep._memory[C.ROOM_TARGET] == roomName);
		myDefence = myDefence.concat(myDefenders);
	}

	myDefence = myDefence.concat(getAlliedCreeps(roomName));	
	let currentResponse = calcCreepStrength(myDefence);	

	if (currentResponse.defensive < (requiredResponse.strength * 1.5)){
	//	log(roomName + " checkIfMorePowerNeeded reassigned " + currentResponse.defensive + "/" + requiredResponse.strength);
		return true;
	} else { 
	//	console.log(roomName + " checkIfMorePowerNeeded nope " + currentResponse.defensive + "/" + requiredResponse.strength);
		return false;
	}
}

global.reassignAttackers = function(newRoom, creeps) {

	if (roomIsAvoided(newRoom) ) { 
		return []; 
	}

	let newRoomPri = getPriorityIK(newRoom);
	creeps.sort(function (a,b) {return (b.body.length - a.body.length)});
	
	let idleCreeps = [];
	for (let i=0; i < creeps.length; i++){
		let creep = creeps[i]
		if (creep._memory.pita) { continue; }
		if (Game.cpu.getUsed() > 400) { break;}
		
		if (creep._memory.reAssignTs && Game.time < creep._memory.reAssignTs) { continue; }

		let creepRoom = creep._memory[C.ROOM_TARGET];
		if (Memory.rooms[creepRoom] && Memory.rooms[creepRoom].hostiles && !creep._memory.groupRoom) { continue; }

		let currentPriority = getPriorityIK(creepRoom);
		if (currentPriority < newRoomPri) {
			if (creep.ticksToLive < 200 && !BOT_MODE) {
				creep.recycleOrSuicide();
				continue;
			}

			if (roomIsSk(newRoom)){ continue; }
			if (getRoomLinearDistance(creepRoom, newRoom) > 5){ continue; }			
			if (checkIfMorePowerNeeded(newRoom) === false){ break; }

			if (Memory.rooms[newRoom].player && (ALLIES[Memory.rooms[newRoom].player] || AVOID[Memory.rooms[newRoom].player])) { continue; }

			let routeLength = getRouteDistanceOnly(creepRoom, newRoom)
			if (routeLength <= 3) {
				console.log("reassigned Attackers from " + creepRoom + " to " + newRoom)
				creep._memory[C.ROOM_TARGET] = newRoom;
				creep._memory[C.TARGET_POS] = posSave(pullIdlePosForRoom(newRoom));
				creep._memory.reAssignTs = Game.time + 15;
				creep._memory.fightTicks = 0;
				delete creep._memory.groupPos;
				delete creep._memory.groupRoom;

				requestMemSave();

				addCreepToCache(creep.name, creep._memory[C.ROLE], creep._memory[C.ROOM_ORIGIN]);
			} else if (currentPriority === 0){
				idleCreeps.push(creep);
			}
		}
	}
	return idleCreeps;
}


global.reassignInvaderKillers = function(newRoom) {
	
	if (roomIsAvoided(newRoom) ) {
		return [];
	}

	let currentInvaderKillers = getCreeps('invaderKiller') // (creep) => creep._memory[C.ROOM_TARGET] == room);
	currentInvaderKillers = currentInvaderKillers.concat(getCreeps('rangedAttacker'));

	let newRoomPri = getPriorityIK(newRoom);
	currentInvaderKillers.sort(function (a,b) {return (b.body.length - a.body.length)});
	let length = currentInvaderKillers.length;
	
	let idleIKs = [];
	for (let i=0; i < length; i++){
		
		if (Game.cpu.getUsed() > 400) { break;}
		let creep = currentInvaderKillers[i];
		if (creep._memory.pita) { continue; }
		if (creep._memory.reAssignTs && Game.time < creep._memory.reAssignTs) { continue; }
		let creepRoom = creep._memory[C.ROOM_TARGET];
		if (creepRoom === newRoom) { continue; }
		let currentPriority = getPriorityIK(creepRoom);
	//	log(newRoom + " checking creep " + currentPriority +"/"+ newRoomPri + " " + creep)
		if (currentPriority < newRoomPri) {
			if (creep.ticksToLive < 200 && !BOT_MODE) {
				creep.recycleOrSuicide();
				continue;
			}
			if (roomIsSk(newRoom)){ continue; }
			if (getRoomLinearDistance(creepRoom, newRoom) > 5){ continue; }			
		//	log(newRoom + " new room more power needed " + checkIfMorePowerNeeded(newRoom) )
			if (checkIfMorePowerNeeded(newRoom) === false){ break; }
			let routeLength = getRouteDistanceOnly(creepRoom, newRoom)
			if (routeLength <= 5) {
				creep._memory[C.ROOM_TARGET] = newRoom;
				creep._memory[C.TARGET_POS] = posSave(pullIdlePosForRoom(newRoom));
				creep._memory.reAssignTs = Game.time + 15;
				creep._memory.fightTicks = 0;
				delete creep._memory.groupPos;
				delete creep._memory.groupRoom;
				delete creep._memory.grouped;

				requestMemSave();
				addCreepToCache(creep.name, creep._memory[C.ROLE], creep._memory[C.ROOM_ORIGIN]);
				console.log("reassigned ik creep from " + creepRoom + " to " + newRoom + " role " + creep._memory[C.ROLE])
			} else if (currentPriority === 0) {
				idleIKs.push(creep);
			}
		}
	}
	return idleIKs;
}

function sendIksToHarass(idleIKs){
	if (!idleIKs || idleIKs.length === 0 ) {return;}

	let hosileRemotes = {}
	for (let roomName in Memory.rooms) {
		let roomData = Memory.rooms[roomName]
		if (!roomData.enemyRemote) { continue; }
		hosileRemotes[roomName] = roomData;
	}

	let maxDistance = 8;
	for (let targetRoom in hosileRemotes){
		if (Game.cpu.getUsed() > 400) { break;}
		if (AVOID[Memory.rooms[targetRoom].enemyRemote] ) { continue; }
		if (!playerRageAbove(getPlayerByRoomName(targetRoom) , 0.25)) { continue; }

		for (let creepIDx in !idleIKs) {
			let creep = idleIKs[creepIDx];
			let creepRoom = creep.room.name;
			if (getRoomLinearDistance(creepRoom, targetRoom) > maxDistance){ continue; }	
			let routeLength = getRouteDistanceOnly(creepRoom, targetRoom);
			if (routeLength <= maxDistance) {
				creep._memory[C.ROOM_TARGET] = targetRoom;
				creep._memory[C.TARGET_POS] = posSave(pullIdlePosForRoom(targetRoom));
				console.log("sendIksToHarass sending creeps to " + targetRoom);
			}
		}
	}
}

function calcSource(distance, swampCount, mineCapacity, controllerDistance, numberOfSourcesInRoom){
    //Get the number of WORK parts needed
    const energy_generated = mineCapacity / ENERGY_REGEN_TIME;
    const work_needed = energy_generated / HARVEST_POWER;

    //Get the travel time for the creeps
    //(will be used more with non-one-to-one creeps)
    const miner_travel_time = distance;
	const carry_travel_time = distance * 2;
	const claimer_travel_time = controllerDistance;

    //Get the number of carry parts needed to move the generated energy in one trip
    //(can in theory be split between multiple creeps)
    const carry_needed = Math.ceil(carry_travel_time * (energy_generated / CARRY_CAPACITY));

    //Get the number of move parts needed to move the work and carry parts at 1:1 on roads
    //(including a single work part for the carry creep)
    const work_move_needed = Math.ceil(work_needed / 2);
    const carry_move_needed = Math.ceil((carry_needed + 1) / 2);

    //Get the cost per tick for a container
    const container_cost = CONTAINER_DECAY / CONTAINER_DECAY_TIME_OWNED / REPAIR_POWER;

    //Get the one-time energy cost to create the needed needed creeps
    const miner_cost = work_needed * BODYPART_COST['work'] + work_move_needed * BODYPART_COST['move'];
	const carry_cost = carry_needed * BODYPART_COST['carry'] + carry_move_needed * BODYPART_COST['move'] + BODYPART_COST['work'];
	let claimer_cost = 0;
	let skGuard_cost = 0;
	if (numberOfSourcesInRoom > 0 && numberOfSourcesInRoom < 3) {
		claimer_cost = (1 * BODYPART_COST['claim'] + 1 * BODYPART_COST['move']) / numberOfSourcesInRoom;
	} else if (numberOfSourcesInRoom === 3) {
		// {move: 23, attack: 18, heal: 5}
		skGuard_cost = (23 * BODYPART_COST['move'] + 18 * BODYPART_COST['attack'] + 5 * BODYPART_COST['heal'] ) / numberOfSourcesInRoom;
	}

	

    //Get the cost per-tick to create the needed creeps
    const carry_cost_per_tick = carry_cost / (CREEP_LIFE_TIME - carry_travel_time);
	const miner_cost_per_tick = miner_cost / (CREEP_LIFE_TIME - miner_travel_time);
	let claimer_cost_per_tick = 0;
	let skGuard_cost_per_tick = 0;
	if (numberOfSourcesInRoom > 0 && numberOfSourcesInRoom < 3) {
		claimer_cost_per_tick = (claimer_cost / (CREEP_CLAIM_LIFE_TIME - claimer_travel_time));
	} else if (numberOfSourcesInRoom === 3) {
		skGuard_cost_per_tick = (skGuard_cost / (CREEP_LIFE_TIME - miner_travel_time));
	}

    //Get the number of ticks required in a normal creep life cycle required to spawn the needed creeps
    //(This accounts for the time when two miners will exist at the same time for a single source)
    const miner_tick_cost_per_cycle = ((work_needed + work_move_needed) * 3) / (CREEP_LIFE_TIME - miner_travel_time) * CREEP_LIFE_TIME;
	const carry_tick_cost_per_cycle = ((carry_needed + carry_move_needed) * 3) / (CREEP_LIFE_TIME - carry_travel_time) * CREEP_LIFE_TIME;
	let claim_tick_cost_per_cycle = 0;
	let skGuard_tick_cost_per_cycle = 0;
	if (numberOfSourcesInRoom > 0 && numberOfSourcesInRoom < 3) {
		claim_tick_cost_per_cycle = (((1+1)*3) / (CREEP_CLAIM_LIFE_TIME - claimer_travel_time) * CREEP_CLAIM_LIFE_TIME) / numberOfSourcesInRoom ;
	} else if (numberOfSourcesInRoom === 3) {
		skGuard_tick_cost_per_cycle = ((23 + 18 + 5) * 3) / (CREEP_LIFE_TIME - miner_travel_time) * CREEP_LIFE_TIME / numberOfSourcesInRoom;
	}

    //Get the repair cost to maintain the roads
    const plain_road_cost = (distance - swampCount) * (ROAD_DECAY_AMOUNT / ROAD_DECAY_TIME) / REPAIR_POWER;
    const swamp_road_cost = swampCount * (ROAD_DECAY_AMOUNT / ROAD_DECAY_TIME) * CONSTRUCTION_COST_ROAD_SWAMP_RATIO / REPAIR_POWER;

	const totalEnergyCostPerTick = Math.round((carry_cost_per_tick + miner_cost_per_tick + claimer_cost_per_tick + skGuard_cost_per_tick + swamp_road_cost + plain_road_cost + container_cost) * 100) / 100
//	console.log(" claim_tick_cost_per_cycle " + claim_tick_cost_per_cycle +" - claimer_cost_per_tick " + claimer_cost_per_tick + " claimer_cost " + claimer_cost)
    return {
        totalEnergyCostPerTick: totalEnergyCostPerTick,
		netEnergy: energy_generated - totalEnergyCostPerTick,
        spawnTicksPerCycle: Math.ceil(miner_tick_cost_per_cycle + carry_tick_cost_per_cycle + claim_tick_cost_per_cycle + skGuard_tick_cost_per_cycle),
    //    spawnEnergyCapacityRequired: Math.max(miner_cost, carry_cost, claimer_cost),
    //   initialStructureCost: (distance - swampCount) * CONSTRUCTION_COST['road'] + swampCount * CONSTRUCTION_COST['road'] * CONSTRUCTION_COST_ROAD_SWAMP_RATIO + CONSTRUCTION_COST['container']
    }
}

function rateExpansionTargetV2(room, sourceCache = {}){
	let expansionRoom = Memory.expansionTarget[room];
	if (!expansionRoom.roomName) { return 0 }
	let roomName = expansionRoom.roomName;

	let score = 100;	//  +/- 10 points

	
	// NEAREST DISTANCE TO MY ROOMS	-9 .. 3
	let actDistance = Memory.expansionTarget[roomName].routeMin;
	let neutralDistance = EXPANSION_WANTED_RANGE; //routes count start and end room
	let distanceWeight = 5;
	let distanceScore = limit(distanceWeight - Math.abs(actDistance - neutralDistance), -3*distanceWeight, distanceWeight);

	score += distanceScore;
	expansionRoom.distanceScore = Number(distanceScore.toFixed(1));

	// CLOSENESS TO EMPIRE
	actDistance = Memory.expansionTarget[roomName].linearMinDistance || 0;
	let linearDistanceScore = limit(distanceWeight - Math.abs(actDistance - neutralDistance), -3*distanceWeight, distanceWeight);
	expansionRoom.linDistScore = Number(linearDistanceScore.toFixed(1));
	score += linearDistanceScore;

	// SOURCES 0 .. 40 POINTS 
	let sources = Object.keys(Memory.expansionTarget[room].sources).length;
	let sourcesWeight = 20;
	let sourceScore = sources * sourcesWeight;
	score += sourceScore;
	expansionRoom.sourceScore = sourceScore;

	// buildableTerrain - skip if to small
	let buildableScore = 0;
	if (Memory.rooms[room].buildableTerrain !== undefined && Memory.rooms[room].buildableTerrain < 150)  {
		buildableScore = -1000; // Skip room
	}
	score += buildableScore;
	expansionRoom.buildableScore = buildableScore;

	// SWAMPS -5 .. 0
	let swampScore = 0;
	if (Memory.rooms[room].swampRatio !== undefined && Memory.rooms[room].swampRatio > 0.35) {
		swampScore = Memory.rooms[room].swampRatio * -5;
	}
	score += swampScore;
	expansionRoom.swampScore = Number(swampScore.toFixed(2));

	// PLAYER OCCUPIED 
	let combatScore = 0;
	if (Memory.rooms[room]) {
		if (getRoomRCL(room)){	// calc player strength and compare with me
			combatScore -= 1000;
		}
		if (Memory.rooms[room].RCLreserved && Memory.rooms[room].RCLreserved.username !== 'Invader'){
			combatScore -= 10;
		}
		if (Memory.rooms[room].player && ALLIES[Memory.rooms[room].player]){
			combatScore -= 1000;
		}
	}
	score += combatScore;
	expansionRoom.combatScore = Number(combatScore.toFixed(2));

	let remoteWeight = 2.5;
	let remoteScored = {};
	remoteScored[room] = {}	// dont score calling room as remote

	// Get base position
	let basePos;
	if (Memory.expansionTarget.baseCalc && 
		Memory.expansionTarget.baseCalc[room] &&
		Memory.expansionTarget.baseCalc[room].buildPosCenter
		){
		basePos = posLoad(Memory.expansionTarget.baseCalc[room].buildPosCenter)
	} else if (Memory.rooms[room] &&
		Memory.rooms[room].controller && 
		Memory.rooms[room].controller.pos
		){
		basePos = posDecompress(Memory.rooms[room].controller.pos, room)
	}			
	
	// Score remotes
	let remoteScore3 = 0;
	let hostileScore = 0;
	let mineralsInRange = [];

	if (Memory.rooms[room] && Memory.rooms[room][R.MY_MINING_OUTPOST]) {
		remoteScore3 -= 5;
	}

	for (let exit in getExits(room) ){
		let currentRemote = exit;
		remoteScored[currentRemote] = {};
		remoteScore3 += scoreRemoteSources(basePos, currentRemote, sourceCache);		
		if (Memory.rooms[currentRemote] && Memory.rooms[currentRemote].hostileRoom && Memory.rooms[currentRemote].player ){
			hostileScore += scoreHostileRoom(1, currentRemote, Memory.rooms[currentRemote].player)
		}

		if ((roomIsSk(currentRemote) || roomIsCenter(currentRemote)) && 
			(Memory.rooms[currentRemote] && Memory.rooms[currentRemote].mineral && !Memory.rooms[currentRemote][R.MY_MINING_OUTPOST])
		) {			
			for (let mineralId in Memory.rooms[currentRemote].mineral) {
				let mineralType = Memory.rooms[currentRemote].mineral[mineralId].type;
				mineralsInRange.push(mineralType);
			}
			
		}

		if (Memory.rooms[currentRemote] && 
			(Memory.rooms[currentRemote].hostileRoom || 
			Memory.rooms[currentRemote].myRoom || 
			(Memory.rooms[currentRemote].RCLreserved && Memory.rooms[currentRemote].RCLreserved.username !== 'Invader' && !ALLIES[Memory.rooms[currentRemote].RCLreserved.username]))
		){
			continue; 
		}
		
		for (let exitDist2 in getExits(exit) ){			
			currentRemote = exitDist2;
			if (remoteScored[currentRemote]) { continue; }
			remoteScored[currentRemote] = {};
			remoteScore3 += scoreRemoteSources(basePos, currentRemote, sourceCache);
			if (Memory.rooms[currentRemote] && Memory.rooms[currentRemote].hostileRoom && Memory.rooms[currentRemote].player ){
				hostileScore += scoreHostileRoom(2, currentRemote, Memory.rooms[currentRemote].player)
			}

			if ((roomIsSk(currentRemote) || roomIsCenter(currentRemote)) && 
				(Memory.rooms[currentRemote] && Memory.rooms[currentRemote].mineral && !Memory.rooms[currentRemote][R.MY_MINING_OUTPOST])
			) {
				for (let mineralId in Memory.rooms[currentRemote].mineral) {
					let mineralType = Memory.rooms[currentRemote].mineral[mineralId].type;
					mineralsInRange.push(mineralType);
				}
			}

			if (Memory.rooms[currentRemote] && 
				(Memory.rooms[currentRemote].hostileRoom || 
				Memory.rooms[currentRemote].myRoom || 				
				(Memory.rooms[currentRemote].RCLreserved && Memory.rooms[currentRemote].RCLreserved.username !== 'Invader' && !ALLIES[Memory.rooms[currentRemote].RCLreserved.username]))
			){
				continue; 
			}

			for (let exitDist3 in getExits(exitDist2) ){
				currentRemote = exitDist3;
				if (remoteScored[currentRemote]) { continue; }

				if (roomIsSk(currentRemote) || roomIsCenter(currentRemote)) { continue; }				
				
				remoteScored[currentRemote] = {};
				remoteScore3 += scoreRemoteSources(basePos, currentRemote, sourceCache);	
				if (Memory.rooms[currentRemote] && Memory.rooms[currentRemote].hostileRoom && Memory.rooms[currentRemote].player ){
					hostileScore += scoreHostileRoom(3, currentRemote, Memory.rooms[currentRemote].player)
				}
			}
		}
	}

	expansionRoom.sourceCache = sourceCache;

	expansionRoom.hostileScore = hostileScore;
	score -= hostileScore;

	remoteScore3 *= remoteWeight;
	expansionRoom.remotesScoreV3 = Number(remoteScore3.toFixed(2));
	score += remoteScore3;

	
	// MINERAL 0..1	
	for (let mineralId in Memory.rooms[roomName].mineral) {
		let mineralType = Memory.rooms[roomName].mineral[mineralId].type;
		mineralsInRange.push(mineralType);
	}

	let mineralScore = 0;	
	let mineralPrices;

	for (let idx in mineralsInRange) {
		let mineralType = mineralsInRange[idx];

		if (DISABLED_MARKET) {
		
			if (Memory.Minerals && Memory.Minerals.Buy && Memory.Minerals.Buy[mineralType]) {
				mineralScore += 3;
			} else if (Memory.Minerals && Memory.Minerals.Sell && Memory.Minerals.Sell[mineralType]) {
				mineralScore -= 1;
			}
	
		} else {

			// gather market prices			
			if (!mineralPrices) {
				mineralPrices = getMineralPriceScore();
			}

			if (mineralPrices.mineralScore[mineralType]) {
				mineralScore = mineralPrices.mineralScore[mineralType].price / mineralPrices.highestPrice;
			}
		}
	}

	expansionRoom.mineralScore = Number(mineralScore.toFixed(2));
	score += mineralScore;	

	// SAFEMODE CD
	if (roomIsSafeModeCd(room) > 500 ) {
		score -= 100;
	}

	// Store temp value before base layout score
	expansionRoom.roomScore = score;

	// BASE LAYOUT -10 .. 10
	let baseLayoutScore = -10;
	if (Memory.expansionTarget.baseCalc && 
		Memory.expansionTarget.baseCalc[room] &&
		Memory.expansionTarget.baseCalc[room].roomScore
		){
		baseLayoutScore = Number(Memory.expansionTarget.baseCalc[room].roomScore);
		
	}

	score += baseLayoutScore;
	expansionRoom.baseLayout = Number(baseLayoutScore.toFixed(2));	

	return score;
}

function scoreHostileRoom(range, roomName, playerName) {

	if (playerName === "Invader") { return 0; }
	if (playerIsDead(playerName)) { return 0; }

	
	let player = getPlayerByRoomName(roomName)
	let playerRelativeStrength = 1;
	if (player) {
		playerRelativeStrength = playerRelativeSumRcl(player)		
	}

	let score = factorForPlayerOccupied(playerRelativeStrength);
	if (score < 0.1) { return 0; }
	
	score += 2 * getPlayerRage(playerName);

	score += (getRoomPRCL(roomName) / CONTROLLER_MAX_LEVEL);
	if (Memory.players[playerName]) {

		score += 1 - ((Memory.rooms[roomName].numberOfTowers || 0) / CONTROLLER_STRUCTURES[STRUCTURE_TOWER][CONTROLLER_MAX_LEVEL])

		// Rampart hits
	//	let maxHp = 10000000;
	//	score += 1 - (2 * (Math.min((roomIntel.breachHp || 0), maxHp) / maxHp));
	}

	score *= (4-range)
	
}

// https://docs.google.com/spreadsheets/d/1M1lnHGhEeJ7ME0NClX1gROTCXtr4dD5AYBYBsgesKPw/edit#gid=0
function factorForPlayerOccupied(relStrength) {
	return limit(-0.06+(1.79*relStrength)-(6.18*relStrength**2)+(2.45*relStrength**3), -3, 0);
}
function factorForRemote(relStrength) {
	return limit(1.12 - (1.04*relStrength) + (0.2*relStrength**2), 0, 1);
}

function scoreRemoteSources(basePos, roomName, sourceCache) {
	let score = 0;
	let remote = Memory.rooms[roomName]
	if (remote === undefined || remote.sources === undefined) { return 0 }
	if (remote.myRoom) { return 0; }

	let player = getPlayerByRoomName(roomName)
	let playerRelativeStrength = 1;
	if (player) {
		playerRelativeStrength = playerRelativeSumRcl(player)
	}

	let factor = 1;
	if (remote[R.MY_MINING_OUTPOST]){
		factor = 0.35;
	} else if (remote.RCLreserved && remote.RCLreserved.username !== 'Invader' && !ALLIES[remote.RCLreserved.username] && !playerIsDead(player)) {	
		factor = factorForRemote(playerRelativeStrength)	
	} else if ((remote.RCLreserved && ALLIES[remote.RCLreserved.username]) || ALLIES[player]) {	
		return 0;
	} else if (remote.hostileRoom && !playerIsDead(player)) {
		factor = factorForRemote(playerRelativeStrength) - 0.25;
	}
	
	

	let sourceEnergy = SOURCE_ENERGY_CAPACITY;
	if (roomIsSk(roomName)) {
		sourceEnergy = SOURCE_ENERGY_KEEPER_CAPACITY; // + SOURCE_KEEPER_DROP_ENERGY
		factor *= 0.70
	}
	
	
	let remoteScores = 0;
	if (sourceCache[roomName] === undefined) {

		let pathLengthToController = 75;
		if (remote.controller) {
			if (basePos && remote.controller) {
				
				let controllerPos = posDecompress(remote.controller.pos, roomName);
		
				let pathToController = findTravelPath(basePos, controllerPos,
					{range: 1, ignoreRoads: true, ignoreCreeps: true, uncompressed: true, allowSK: true})
		
				if (!pathToController.incomplete) {
					pathLengthToController = pathToController.path.length;
				} 
			}
		}		

		let numberOfSources = Object.keys(remote.sources).length
		for (let sourceId in remote.sources) {

			if (sourceCache[sourceId] === undefined) {
				let sourcePos = posDecompress(remote.sources[sourceId].pos, roomName)
				let pathToSource = findTravelPath(basePos, sourcePos,
					{range: 1, ignoreRoads: true, ignoreCreeps: true, uncompressed: true, allowSK: true})
				if (!pathToSource.incomplete) {
					let pathLength = pathToSource.path.length
					let swamps = Math.round((pathToSource.cost - pathToSource.path.length) / 5)
					let sourceScore = calcSource(pathLength, swamps, sourceEnergy, pathLengthToController, numberOfSources)
					
					if (sourceScore.netEnergy < MIN_SOURCE_INCOME ) { continue; }
		
				//	log("scoring remote in " + roomName + " net energy " + sourceScore.netEnergy.toFixed(2))
					remoteScores += (sourceScore.netEnergy)					
				}
			}
		}

		if (basePos && remote.controller) {
			sourceCache[roomName] = Number(remoteScores.toFixed(2));
		}
	}

	score += factor * (((sourceCache[roomName] || remoteScores) - 5) / 5)
	

	

	return score;
}

function scoreNearbyRooms(roomName, distance) {
	let score = 0;
	let remote = Memory.rooms[roomName]
	if (remote === undefined || remote.sources === undefined) { return 0 }
	if (ALLIES[remote.player]) { return 0; }
	if (remote.RCLreserved && ALLIES[remote.RCLreserved.username]) { return 0; }	
	if (!remote[R.MY_MINING_OUTPOST] && !remote.myRoom){
		if (roomIsSk(roomName)) {
			score +=  Object.keys(remote.sources).length * 0.75;	// 2.25
		} else {
			if (remote.hostileRoom){
				score -=  Object.keys(remote.sources).length * 0.2;
			} else if (remote.RCLreserved) {
				score +=  Object.keys(remote.sources).length * 0.5;
			} else {
				score +=  Object.keys(remote.sources).length;
			}
		}
	} else if (remote[R.MY_MINING_OUTPOST]){
		score +=  Object.keys(remote.sources).length * 0.2;
	}

	if (distance) {
		score = score / distance;
	}
	return score;
}

function checkMarketPrices(){

	let MARKET_AVERAGES = 30;

	for (let resIdx in MARKET_RESOURCES) {
		let res = MARKET_RESOURCES[resIdx];
		let minAmount = 1000;
		if (!BASE_MINERALS_OBJECT[res]) {
			minAmount = 1;
		}
		
		let sellOrders = getMarketSellOrders(res, minAmount);				
		if (sellOrders.length > 0) {
			let price = getCurrentPrice(sellOrders, minAmount)
			if (price) {
				if (!Memory.market.sell[res] ) {
					Memory.market.sell[res] = {};
					Memory.market.sell[res].avgPrice = price;
					Memory.market.sell[res].actPrice = price;
					Memory.market.sell[res].samples = 1;
				} else {
					Memory.market.sell[res].samples = limit(Memory.market.sell[res].samples+1, 1, MARKET_AVERAGES);	
					Memory.market.sell[res].avgPrice = rollingExpAvg(Memory.market.sell[res].avgPrice, price, Memory.market.sell[res].samples);
					Memory.market.sell[res].actPrice = price;
				}
			}
		}

		let buyOrders = getMarketBuyOrders(res);		
		if (buyOrders.length > 0) {
			let price = getCurrentPrice(buyOrders, minAmount)			
			if (price) {
				if (!Memory.market.buy[res] ) {
					Memory.market.buy[res] = {};
					Memory.market.buy[res].avgPrice = price;
					Memory.market.buy[res].actPrice = price;
					Memory.market.buy[res].samples = 1;					
				} else {				
					Memory.market.buy[res].samples = limit(Memory.market.buy[res].samples+1, 1, MARKET_AVERAGES);
					Memory.market.buy[res].avgPrice = rollingExpAvg(Memory.market.buy[res].avgPrice, price, Memory.market.buy[res].samples);	
					Memory.market.buy[res].actPrice = price;				
				}
			}
		}
	}
}

function checkMineralExtractProfitable(res) {

	let energyPrice = getAverageMarketPrice(ORDER_BUY, RESOURCE_ENERGY);
	let buyMineralPrice = getAverageMarketPrice(ORDER_BUY, res);

	let mineralPerWorkPart = HARVEST_MINERAL_POWER * CREEP_LIFE_TIME / EXTRACTOR_COOLDOWN;
	let energyCostMiners = energyPrice.actPrice * BODYPART_COST[WORK] / mineralPerWorkPart
	
	console.log(res + " energy costs " + energyCostMiners.toFixed(3) + " can buy for " + buyMineralPrice.actPrice.toFixed(3))
	if (energyCostMiners > buyMineralPrice.actPrice) {
		log(" not profitable to mine " +res+ "! energy costs " + energyCostMiners.toFixed(3) + " can buy for " + buyMineralPrice.actPrice.toFixed(3))
		return false;
	}

	return true;
}

function getAverageMarketPrice(orderType, res){
	if (orderType === ORDER_BUY) {
		if (Memory.market.buy[res] ) { 
			return { avgPrice: Memory.market.buy[res].avgPrice, actPrice: Memory.market.buy[res].actPrice }
		} 
		return { avgPrice: 0, actPrice: 0 }
	} else if  (orderType === ORDER_SELL) {
		if (Memory.market.sell[res] ) {
			return { avgPrice: Memory.market.sell[res].avgPrice, actPrice: Memory.market.sell[res].actPrice }
		}
		return { avgPrice: 10, actPrice: 10 }
	}
}


function getCurrentPrice(orders, minAmount = 1000) {
	for (let idx in orders) {
		let order = orders[idx];
		if (Game.time - order.created < 20) { continue; }
		if (order.amount < minAmount) { continue; }
		if (Game.market.orders[order.id]) { continue; }
		return order.price;
	}
}

global.rollingExpAvg = function(avg, newSample, N){	
	avg -= avg / N;
	avg += newSample / N;
	return avg;	
}