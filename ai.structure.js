'use strict'
let structureObject = {

    /** @param {builder} builder **/
    run: function(structure, roomOrder) {

        // CHECK IF WE HAVE ACCESS TO THE ROOM
        if (Game.rooms[structure] === undefined  || Memory.rooms[structure].myRoom !== 1 ){
            return;
		}


		// TOWERS	
		let init = Game.cpu.getUsed();
		Game.rooms[structure].handleTowers();
		global.stats['cpu.aiStructure.towers'] += Game.cpu.getUsed()-init;
		
		// TERMINALS  
		init = Game.cpu.getUsed();		
		if (Game.rooms[structure].terminal && getRoomRCL(structure) >= 6) {
			
			if (Game.rooms[structure]._cache.terminalTs === undefined) { Game.rooms[structure]._cache.terminalTs = Game.time + Math.floor(Math.random() * TERMINAL_COOLDOWN)}
			if (Game.rooms[structure]._cache.terminalTs <= Game.time && !Game.rooms[structure].terminal.__cooldown) {				
				let traded = Game.rooms[structure].terminal.handleTerminal();

				let sleep = TERMINAL_COOLDOWN;
				if (!traded) {
					sleep += Memory.roomIdBase;
				}

				Game.rooms[structure]._cache.terminalTs = Game.time + sleep;
				
			}
		}
		global.stats['cpu.aiStructure.terminals'] += Game.cpu.getUsed()-init;
		
		// LABS
		init = Game.cpu.getUsed();
		if (Memory.Minerals && Memory.Minerals.Labs && Memory.Minerals.Labs[structure] ) {

			// NEW NUMBER OF LABS
			let hasLabs = Game.rooms[structure].hasLabs()
			if (Game.time % 17 === 0 && hasLabs > 3 && 
				((Game.rooms[structure].getInputLabs() < 2) || hasLabs > Game.rooms[structure]._cache.oldLabs)
			) {
			
				Game.rooms[structure]._cache.oldLabs = hasLabs
				let allLabs = Game.rooms[structure].findByType(STRUCTURE_LAB);
			//	console.log(structure + " new labs! " + allLabs.length)	
				if (allLabs.length >= 3) {

					let theFirstLab	= determineLab(allLabs, undefined, true);
					let theSecondLab = determineLab(allLabs, theFirstLab, true);

					theFirstLab.memory[S.INPUT_LAB] = 0;
					theSecondLab.memory[S.INPUT_LAB] = 0;

					let bestRange = 99;
					let range;
					let mixerLab;

					for (let idx in allLabs) {
						let lab = allLabs[idx];
						if (lab.id === theFirstLab.id || lab.id === theSecondLab.id) { continue; }
						
						if (lab.memory[S.INPUT_LAB]) { delete lab.memory[S.INPUT_LAB] }
						/*
						range = lab.pos.getRangeTo(theFirstLab);
						range += lab.pos.getRangeTo(theSecondLab);
						if (range < bestRange){
							bestRange = range;
							mixerLab = lab;
						}*/
					}

					/*
					if (mixerLab) {
						Memory.rooms[structure].mixerLab = {};
						Memory.rooms[structure].mixerLab[mixerLab.id] = {};
					}*/
					
					Game.rooms[structure].setRecepie();
					requestMemSave();
				}
			}

			if (hasLabs >= 3){
				
				let compundToProduce;				
				if (Memory.rooms[structure][R.LABS_PRODUCING]) {
					compundToProduce = Memory.rooms[structure][R.LABS_PRODUCING];
				} else {
					Game.rooms[structure].setRecepie();					
				}

				// Grafana stats
				let totalLabs = hasLabs - 2;
				if (global.stats.labsTotal === undefined) { global.stats.labsTotal = 0 }
				global.stats.labsTotal += totalLabs;
				if (compundToProduce && Game.rooms[structure]._cache.labsCd && Game.time <= Game.rooms[structure]._cache.labsCd) {
					if (global.stats.labsProducing[compundToProduce] === undefined) { global.stats.labsProducing[compundToProduce] = 0;}
					global.stats.labsProducing[compundToProduce] += totalLabs;
				}
				
				if (compundToProduce &&
					(!Game.rooms[structure]._cache.labsCd ||
					Game.time >= Game.rooms[structure]._cache.labsCd)
					) {
					let labs = Game.rooms[structure].getOutputLabs(false)
					let inputLabs = Game.rooms[structure].getInputLabs()
					let cd = REACTION_TIME[compundToProduce] || 100;

					let r1, r2
					if (inputLabs.length >= 2){
						r1 = inputLabs[0];
						r2 = inputLabs[1];
					}
					if (r1 && r2) {

						let outputLab;
						
						for (let idx in labs) {
							outputLab = labs[idx];
							if (outputLab.cooldown > 0) { 
								cd = Math.min(cd, outputLab.cooldown)
								continue; 
							}
							if (outputLab.memory[S.BOOSTER_LAB]) {
								if (Game.time < outputLab.memory.boostTs) {
									continue;
								} else {
									delete Memory.structures[outputLab.id]
								}
							}

							if (outputLab.memory.unboost) {
								if (Game.time < outputLab.memory.unboost) {
									continue;
								} else {
									delete outputLab.memory.unboost;
								}
							}

							outputLab.runMyReaction(r1, r2);	
						//	let errCycle = (outputLab.memory[S.LAB_ERROR_CYCLES] - Game.time) || 0;
						//	Game.rooms[structure].visual.text(errCycle, outputLab.pos.x, outputLab.pos.y, {color: 'red', font: 0.5});
						}

						if (r1.memory[S.BATCH_LAB] <= 0 && r2.memory[S.BATCH_LAB] <= 0) {
							Game.rooms[structure]._cache._setRecepie = 0;
							Game.rooms[structure].setRecepie();
						}
					}

					Game.rooms[structure]._cache.labsCd = Game.time + cd;


				}
			}
		}
		global.stats['cpu.aiStructure.labs'] += Game.cpu.getUsed()-init;
		

		// FACTORIES
		if (Memory.buildFactory) {
			init = Game.cpu.getUsed();

			

			if (!Game.rooms[structure]._cache.factorySleep || Game.time > Game.rooms[structure]._cache.factorySleep) {
				handleFactory(structure);
			}
			global.stats['cpu.aiStructure.factory'] += Game.cpu.getUsed()-init;
		}
		
		// LINKS
		init = Game.cpu.getUsed();
		if (Game.time % 2 === 0 || Game.rooms[structure].controller.level < 8) {	

			let linksWithEnergy = [];

			let sourceLinks = getSourceLinks(structure);
			for (let idx in sourceLinks) {
				let link = sourceLinks[idx];
				if (link.cooldown || link.store[RESOURCE_ENERGY] < 350) { continue; }
				linksWithEnergy.push(link);
			}

			let storageLink = getStorageLink(structure);
			for (let idx in storageLink) {
				let link = storageLink[idx];
				if (link.cooldown || link.store[RESOURCE_ENERGY] < 700) { continue; }
				linksWithEnergy.push(link);
			}

			/*
			linksWithEnergy = linksWithEnergy.concat(storageLink);
			linksWithEnergy = linksWithEnergy.concat(sourceLinks);	
			linksWithEnergy = _.filter(linksWithEnergy, function(c) {return (c.energy >= 700 && !c.cooldown);});
			*/
					
			if (linksWithEnergy.length > 0 ) {	
				let controllerLink = getControllerLink(structure);
				let spawnLink = Game.getObjectById(getSpawnLink(structure));
					
				let length = linksWithEnergy.length;

				for (let i=0; i< length; i++) { 
					
					if (spawnLink && 
						((spawnLink.store[RESOURCE_ENERGY] <= 100) || 
						(storageLink[0].id !== linksWithEnergy[i].id && spawnLink.store.getFreeCapacity(RESOURCE_ENERGY) >= linksWithEnergy[i].store[RESOURCE_ENERGY]))
					){
						linksWithEnergy[i].transferEnergy(spawnLink);
						resetEnergyStatusCranes(structure)
						Game.rooms[structure].wakeSpawnFillers(true);
						break;
					} else if (storageLink.length > 0 && Game.rooms[structure].energyStatus() <= ECONOMY_CRASHED
					){
						if (storageLink[0].id === linksWithEnergy[i].id) { continue; }	
						linksWithEnergy[i].transferEnergy(storageLink[0]);
						break;
					}
					else if (controllerLink.length > 0 && 
						(controllerLink[0].store[RESOURCE_ENERGY] <= 100 || 
						((storageLink.length === 0 || storageLink[0].id !== linksWithEnergy[i].id) && controllerLink[0].store.getFreeCapacity(RESOURCE_ENERGY) >= linksWithEnergy[i].store[RESOURCE_ENERGY]))
					) {
						linksWithEnergy[i].transferEnergy(controllerLink[0]);
						break;
					}
					else if (storageLink.length > 0 && 
						(linksWithEnergy[i].store[RESOURCE_ENERGY] >= 700 && 
						storageLink[0].store.getFreeCapacity(RESOURCE_ENERGY) > 400)
					) {
						if (storageLink[0].id === linksWithEnergy[i].id) { continue; }
						linksWithEnergy[i].transferEnergy(storageLink[0]);
						break;
					} else if (spawnLink && spawnLink.pos._cache.tsLinkWithdraw && Game.time > spawnLink.pos._cache.tsLinkWithdraw && spawnLink.store[RESOURCE_ENERGY] < 500
					) {
						linksWithEnergy[i].transferEnergy(spawnLink);
						resetEnergyStatusCranes(structure)
						Game.rooms[structure].wakeSpawnFillers(true);
						break;
					}
				}
			}
		}	
		global.stats['cpu.aiStructure.links'] += Game.cpu.getUsed()-init;
		
		// POWER SPAWN;
		init = Game.cpu.getUsed();				
		handlePowerSpawn(structure);
		global.stats['cpu.aiStructure.powerSpawn'] += Game.cpu.getUsed()-init;


		// SPAWN REFRESH
		init = Game.cpu.getUsed();
		spawnsRefresh(structure)
		global.stats['cpu.aiStructure.spawnRfresh'] += Game.cpu.getUsed()-init;

		// OBSERVERS
		init = Game.cpu.getUsed();
		if (Game.rooms[structure].fulfillVisionRequest() ) {

		} else if ((Game.cpu.bucket > 4500 && BOT_MODE) || SEASONAL_SCORE || SEASONAL_SYMBOLS || SEASONAL_COMMS) {
			Game.rooms[structure].handleObserver(false);
		} else if (roomOrder % 7 === 0) {
			Game.rooms[structure].handleObserver(true);
		}		
		global.stats['cpu.aiStructure.observers'] += Game.cpu.getUsed()-init;

		// GRAFANA STATS
		init = Game.cpu.getUsed();
		if (Game.time % 33 === 0 || global.stats['room.' + structure + '.energyAvailable'] === undefined) {
			let room = Game.rooms[structure];
			global.stats['room.' + structure + '.energyAvailable'] = room.energyAvailable;
			global.stats['room.' + structure + '.storageEnergy'] = (room.storage ? room.storage.store.energy : 0);
			global.stats['room.' + structure + '.terminalEnergy'] = (room.terminal ? room.terminal.store.energy : 0);
			
			global.stats['room.' + structure + '.energyCapacityAvailable'] = room.energyCapacityAvailable;
			
			let controller = room.controller;
			global.stats['room.' + structure + '.controllerLevel'] = controller.level;
			if (controller.level < CONTROLLER_MAX_LEVEL) {
				global.stats['room.' + structure + '.controllerProgress'] = controller.progress;
				global.stats['room.' + structure + '.controllerProgressTotal'] = controller.progressTotal;
				let rclOffset = getRclOffset(controller.level);
				global.stats['room.' + structure + '.RCLProgress'] = rclOffset + controller.progress;
				global.stats['room.' + structure + '.RCLTotal'] = rclOffset + controller.progressTotal;
			}
	
			global.stats['room.' + structure + '.ajdHaul'] = Memory.rooms[structure].ajdHaul || 0;
			global.stats['room.' + structure + '.upWorking'] = Memory.rooms[structure].upWorking || 0;
			global.stats['room.' + structure + '.spawnerWork'] = Memory.rooms[structure].spawnerWork || 0;			
		}
		global.stats['cpu.aiStructure.grafanaStats'] += Game.cpu.getUsed()-init;

		if (!isCpuLimited()) {	// display rom stats
			let roomName = structure
			let allSpawns = Game.rooms[roomName].findByType(STRUCTURE_SPAWN);
			if (allSpawns.length >= 1) {

				let text = (Memory.rooms[roomName].spawnerWork || 0 )+'%'
				if (Memory.rooms[roomName].spawnCostTicks) {
					text += ' ' + Memory.rooms[roomName].spawnCostTicks.toFixed(0)+"ept"
				}
				Game.rooms[roomName].visual.text(text, allSpawns[0].pos, { color: 'red', font: 0.5, stroke: 'white', strokeWidth: 0.15  });
			}

			let controllerText=''
			if (Game.rooms[roomName].controller.level < CONTROLLER_MAX_LEVEL) {
				let percentage = Game.rooms[roomName].controller.progress / Game.rooms[roomName].controller.progressTotal;
				controllerText += (Game.rooms[roomName].controller.level + percentage).toFixed(2);
			} else {
				controllerText += Game.rooms[roomName].controller.level;
			}
			
			if (Game.rooms[roomName]._cache.lastProgress) {
				controllerText += " "
				let progressLastTick = Game.rooms[roomName].controller.progress - Game.rooms[roomName]._cache.lastProgress
				controllerText += "+"+progressLastTick

				if (progressLastTick > 0) {
					let ticksToNextLevel = (Game.rooms[roomName].controller.progressTotal - Game.rooms[roomName].controller.progress) / progressLastTick
					controllerText += " ("+Math.ceil(ticksToNextLevel) + ("t)")
				}				
			}

			controllerText += " "+Memory.rooms[roomName].upWorking + "%w"
			
			Game.rooms[roomName].visual.text(controllerText, Game.rooms[roomName].controller.pos, { color: 'red', font: 0.5, stroke: 'white', strokeWidth: 0.15 });

			Game.rooms[roomName]._cache.lastProgress = Game.rooms[roomName].controller.progress

			if (Game.rooms[roomName].storage) {
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
				Game.rooms[roomName].visual.text(text, Game.rooms[roomName].storage.pos, { color: 'red', font: 1 });
			}
		}
    }
};
module.exports = structureObject;

function resetEnergyStatusCranes(roomName) {
	let fillerPos = Game.rooms[roomName].getSpawnFillerPos();
	for (let idx in fillerPos){
		let filler = fillerPos[idx].lookForCreep();
		if (filler && filler._memory[C.ROLE] === 'spawnFillers') {
			delete filler._cache.energyFrom;
		}
	}
}

function spawnsRefresh(roomName) {
	if (isCpuLimited() ) { return; }

	if (Memory.rooms[roomName].em && Game.time < Memory.rooms[roomName].em) {
		return;
	}

	if (Game.rooms[roomName].energyStatus() <= ECONOMY_CRASHED || Game.rooms[roomName].energyAvailable <= 300) { return; }

	if (Memory.rooms[roomName].spawnQ !== undefined && Memory.rooms[roomName].spawnQ.length > 0) {
		return;
	}

	let allSpawns = Game.rooms[roomName].findByType(STRUCTURE_SPAWN);
	for (let idx in allSpawns) {
		let spawn = allSpawns[idx];

		if (spawn.spawning || spawn.spawningTs === Game.time) { continue; }

		let nearbyCreeps = spawn.pos.lookForMyCreepsAround(1);
		for (let idx2 in nearbyCreeps) {
			let creep = nearbyCreeps[idx2]
			if (creep._memory[C.BOOSTED] || creep._memory.refreshed > 35 || creep._memory[C.ROLE] === 'spawnFillers') { continue; }
			
			let requiredTTL = CREEP_LIFE_TIME - Math.floor(600/creep.body.length);

			if (creep.ticksToLive < requiredTTL) {
				spawn.renewCreep(creep);
				registerBusySpawn(roomName);

				if (creep._memory.refreshed === undefined) {
					creep._memory.refreshed = 0;
				}
				creep._memory.refreshed += 1;
				break;
			}
		} 
	}
}

global.factoryWantToProduceEnergy = function(roomName) {
	if  (Game.rooms[roomName].energyStatus() <= ECONOMY_CRASHED || 
		((PUSH_RCL_TARGETS[roomName] || (Memory.energyShare && Memory.energyShare.recieve && Memory.energyShare.recieve[roomName])) )
	){
		return true;
	}

	return false;
}


function factoryProduceEnergyOrBattery(roomName, factory) {

	if  (factoryWantToProduceEnergy(roomName, factory) ) {
		if (factory.store[RESOURCE_BATTERY] >= COMMODITIES[RESOURCE_ENERGY].components[RESOURCE_BATTERY] ) {
			let result = factory.produce(RESOURCE_ENERGY);
			if (result !== OK) {
				log(roomName + " factory producing energy error " + result)
			} else {
				return true;
			}
		}
	} else {
		
		let wantedAmount = maxStoreInRoom(RESOURCE_BATTERY);
		let storedAmount = factory.room.storeWithFactory(RESOURCE_BATTERY);

		let baseEco = ECONOMY_DEVELOPING;
		if (getRoomPRCL(roomName) < CONTROLLER_MAX_LEVEL) {
			baseEco = ECONOMY_STABLE;
		}

		
		if (Memory.energyShare && Memory.energyShare[roomName]) {
			// check nothing
		} else { 
			let requiredEco = Math.min(ECONOMY_SURPLUS, Math.ceil(3 * (1 - (storedAmount / wantedAmount))) + baseEco);
			if (Game.rooms[roomName].energyStatus() < requiredEco) { return false; }
		}

		if (storedAmount < wantedAmount && factory.store[RESOURCE_ENERGY] >= COMMODITIES[RESOURCE_BATTERY].components[RESOURCE_ENERGY]) {
			let result = factory.produce(RESOURCE_BATTERY);
			if (result !== OK) {
				log(roomName + " factory producing battery error " + result)
			} else {
				return true;
			}
		}
	}
}

function handleFactory(roomName) {

	Game.rooms[roomName]._cache.factorySleep = Game.time + 25;

	let factory = Game.getObjectById(Game.rooms[roomName].hasFactory())
	if (!factory) {		
		return;
	}

	if (factory.cooldown) { 
		Game.rooms[roomName]._cache.factorySleep = Game.time + factory.cooldown;
		return; 
	}

	if (factoryProduceEnergyOrBattery(roomName, factory)) {
		Game.rooms[roomName]._cache.factorySleep = Game.time + 10;
		return;
	}

	if ((!Memory.comodityToProcude || !COMMODITIES[Memory.comodityToProcude]) && 
		(!Memory.Minerals.mineralCompress || !Memory.Minerals.mineralCompress[roomName]) && 
		(!Memory.Minerals.mineralShare || !Memory.Minerals.mineralShare[roomName]) 
	) { 
		return; 
	}	

	let factoryLevel = factory.level
	if (factoryLevel > 0 && !Memory.rooms[roomName].factoryOperator && !factory.getEffect(PWR_OPERATE_FACTORY) ) {
		factoryLevel = 0;
	}

	// Initialize factory level
	if (factory.level === undefined && 
		Memory.comodityToProcude &&
		COMMODITIES[Memory.comodityToProcude].level &&		
		Memory.rooms[roomName].factoryLevel !== undefined &&
		Memory.rooms[roomName].factoryLevel > 0 && 
		COMMODITIES[Memory.comodityToProcude].level >= Memory.rooms[roomName].factoryLevel &&
		Memory.factories[Memory.rooms[roomName].factoryLevel] &&
		Memory.factories[Memory.rooms[roomName].factoryLevel][roomName]
	) {
		Memory.rooms[roomName].factoryRequest = Game.time + Math.max(250, COMMODITIES[Memory.comodityToProcude].cooldown * 2);
	}	

	let myRecepie = getCachedComoditiesForResAtLevel(Memory.comodityToProcude, factoryLevel)

	let produce;
	let bestScore = Infinity;
	let compress = {}
	for (let ingredient in myRecepie) {
		let enoughComponents = true;
		let wantedAmount = maxStoreInRoom(ingredient)
		/*
		if (SEASONAL_COMMS && COMMODITIES[ingredient] && COMMODITIES[ingredient].level && COMMODITIES[ingredient].level >= 1) {
			wantedAmount *= 10;
		}*/

		let storedAmount = factory.room.storeWithFactory(ingredient)
	//	if (roomName === "E5N17") { log("factory level " + factoryLevel+ " want to produce " + ingredient + " wanted amount " + wantedAmount +" current stored " + storedAmount )}

		if (ingredient !== Memory.comodityToProcude && storedAmount >= wantedAmount) { continue; }		
				
		for (let component in COMMODITIES[ingredient].components) {
			if (!enoughComponents) { break; }

			if (!factory.store[component] || factory.store[component] < COMMODITIES[ingredient].components[component]) { 				
				enoughComponents = false;

				if (COMPRESSED_RESOURCE[component]) {
					if (Game.rooms[roomName].store(component) < maxStoreInRoom(component)) { 
						compress[component] = {};
					}
				}

				break;
			}

			if (BASE_MINERALS_OBJECT[component] && Game.rooms[roomName].store(component) < 3000) {
				enoughComponents = false;
				break;
			}
		}

		if (enoughComponents) {			
			let score = (Memory.Minerals[ingredient] || 0) / (wantedAmount * (Memory.amountOfFactories || 1));

			score = score / ((COMMODITIES[ingredient].level || 0) + 1);

			if (score < bestScore) {
				bestScore = score;
				produce = ingredient;
			}
		}
	}

	if (produce) {
		let result = factory.produce(produce);
		if (result === OK) {
			Game.rooms[roomName]._cache.factorySleep = Game.time + COMMODITIES[produce].cooldown;
			Game.rooms[roomName]._cache.factoryProduced = 1;
		} else {
			if (result !== -4) {
				log(roomName + " factory producing " + produce + " error " + result)
			}			
		}

		if (COMMODITIES[produce] && COMMODITIES[produce].level) {

			/*
			if (Game.rooms[roomName].store(RESOURCE_OPS) < 5000) {
				let cycles = COMMODITIES[produce].cooldown / POWER_INFO[PWR_OPERATE_FACTORY].duration;
				let storeFactor = 1; 
				for (let component in COMMODITIES[produce].components) {
					let storedAmount = factory.room.storeWithFactory(component)
					let factor = storedAmount  / COMMODITIES[produce].components[component] * cycles
			//		if 
				}
			}*/
			

			Memory.rooms[roomName].factoryRequest = Game.time + Math.max(250, COMMODITIES[produce].cooldown * 2);
		}
		return;

	} else {	// compress minerals

		if (Memory.Minerals.mineralCompress && Memory.Minerals.mineralCompress[roomName]) {			
			
            for (let res in Memory.Minerals.mineralCompress[roomName]) {
				if (Memory.Minerals[res] > 100000) { continue; }
				compress[res] = {};				
			}
        }

		if (Memory.Minerals.mineralShare && Memory.Minerals.mineralShare[roomName]) {
            for (let raw in Memory.Minerals.mineralShare[roomName]) {
				if (!COMPRESSED_RESOURCE_FROM_RAW[raw]) { continue; }
                let bars = COMPRESSED_RESOURCE_FROM_RAW[raw].raw; 
				if (factory.room.store(bars) >= maxStoreInRoom(bars)) { continue; }
				compress[bars] = {};
			}
		}

		// decompress

		for (let res in BASE_MINERALS_OBJECT) {
			if (res === RESOURCE_POWER) { continue; }
			if (factory.room.store(res) >= maxStoreInRoom(res) ) { continue; }
			let bars = COMPRESSED_RESOURCE_FROM_RAW[res].raw;
			if (compress[bars]) { continue; }
			if (!COMMODITIES[res]) { continue; }
			compress[res] = {};
		}

		
		for (let res in compress) {			

			let enoughComponents = true;
			for (let ingredient in COMMODITIES[res].components) {
				if (!factory.store[ingredient] || factory.store[ingredient] < COMMODITIES[res].components[ingredient]) { 				
					enoughComponents = false;
					break;
				}
			}

			if (enoughComponents) {
				let result = factory.produce(res);
				if (result === OK) {
					Game.rooms[roomName]._cache.factorySleep = Game.time + COMMODITIES[res].cooldown;						
					return;
				} else {
					log(roomName + " factory compressing " + res + " error " + result)
				}
			}
		}
	}	
}

global.maxStoreInRoom = function(commodity) {

	let wantedRes = 0;
	if (!COMMODITIES[commodity]) { return 5000; }
	let level = COMMODITIES[commodity].level
	if (!level || level === 0) {
		wantedRes = 5000
		if (SEASONAL_COMMS && COMPRESSED_RESOURCE[commodity] && commodity !== RESOURCE_BATTERY) {
			wantedRes = 15000;
		}

		if (commodity === RESOURCE_BATTERY && Game.gpl.level > 0) {
			wantedRes = 350;
		}

	} else if (level === 1) {
		wantedRes = 2000
		if (SEASONAL_COMMS) {
			wantedRes = 100
		}
	} else if (level === 2) {
		wantedRes = 100
	} else if (level === 3) {
		wantedRes = 20
	} else if (level === 4) {
		wantedRes = 10
	} else if (level === 5) {
		wantedRes = 5
	}
	return wantedRes;

}
/*
function arrPush(arr1, arr2){
	// Pre allocate size
	const arr1Length = arr1.length;
	const arr2Length = arr2.length;
	arr1.length = arr1Length + arr2Length

	// Add arr2 items to arr1
	for(let i = 0; i < arr2Length; i++){
	arr1[arr1Length + i] = arr2[i]
	}

}
*/
function handlePowerSpawn(room){
	if (Game.rooms[room]._cache.psSleep === undefined || 
		Game.time > Game.rooms[room]._cache.psSleep
	){

		let reqEcon = ECONOMY_STABLE
		if (SEASONAL_THORIUM) {
			reqEcon = ECONOMY_DEVELOPING;
		}

		if (SEASONAL_THORIUM && Game.gpl.level >= MAX_GPL) { return; }


		if (Game.rooms[room].energyStatus() >= reqEcon && !isGCLPraiseRoom(room)) {
			let powerSpawn = Game.rooms[room].findByType(STRUCTURE_POWER_SPAWN);
			for (let i=0; i<powerSpawn.length; i++) {
				if (powerSpawn[i].energy > 50 && powerSpawn[i].power >= 1) {
					return powerSpawn[i].processPower();
				}
			}
			Game.rooms[room]._cache.psSleep = Game.time + 13;
		} else {
			Game.rooms[room]._cache.psSleep = Game.time + 13;
		}
	}
}

/*
function  showTowerRange(towers) {
    for(let e in towers) {
        let tower = towers[e];
        let color = '#66CCFF';
    tower.room.visual.circle(tower.pos, {
        fill: 'transparent', radius: 20, stroke: 'white',lineStyle:'dashed',opacity:0.01,fill:color
    })
    tower.room.visual.circle(tower.pos, {
        fill: 'transparent', radius: 15, stroke: 'white',lineStyle:'dashed',opacity:0.01,fill:color
    })
    tower.room.visual.circle(tower.pos, {
        fill: 'transparent', radius: 10, stroke: 'white',lineStyle:'dashed',opacity:0.01,fill:color
    })
    tower.room.visual.circle(tower.pos, {
        fill: 'transparent', radius: 5, stroke: 'white',opacity:0.1,fill:color
    })
    }
}*/


function determineLab(theLabs, theExcludedLab, allowImperfect = false) {
    // Current lab we're checking
    let determinedLab;
	let length = theLabs.length;
	let bestInRange = 0;
    for (let lab = 0; lab < length; lab++) {
        // Always assume we're in range of all other labs
        let ok = true;
		let inRange = 0;
        let currentlyChecking = theLabs[lab];
        if (currentlyChecking == theExcludedLab) // This lab is already a breeder lab
        {
            continue;
        }
        // Loop through all other labs
		
        for (let r = 0; r < length; r++) {
            let toCheckAgainst = theLabs[r];
            if (toCheckAgainst == currentlyChecking || toCheckAgainst == theExcludedLab) {
                continue;
            }
            let range = currentlyChecking.pos.getRangeTo(toCheckAgainst.pos);
            if (range > 2) // not in range of all other labs, not the breeder!
            {
                ok = false;
				if (!allowImperfect) {
					break;
				}
                
            } else {
				inRange++
			}
        }

        if (ok) {
            determinedLab = currentlyChecking;
            break;
        } else if (inRange > bestInRange) {
			bestInRange = inRange;
			determinedLab = currentlyChecking;
		}
    }
    return determinedLab;
}

global.sourceLinksFilled = function(room, fillAmount = 0) {
	let links = getSourceLinks(room);

	for (let idx in links) {
		if (links[idx].energy >= fillAmount && (!links[idx].cooldown || links[idx].cooldown <= 5)) {
			return true;
		}
	}
}

global.getSpawnLinkPos = function(room) {
	return posDecompressXY(Memory.rooms[room].spawnLinkPos, room)
}

global.getSpawnLink = function(room, force=false) {

	if (!Memory.rooms[room].spawnLinkPos) { return 0; }
	if (Game.rooms[room]._cache.spawnLink === undefined || Game.time > Game.rooms[room]._cache.spawnLinkTs) {
		Game.rooms[room]._cache.spawnLinkTs = Game.time + 47;
		let pos = posDecompressXY(Memory.rooms[room].spawnLinkPos, room)
		let link = lookForStructureAt(STRUCTURE_LINK, pos)
		if (link) {
			Game.rooms[room]._cache.spawnLink = link.id
		} else {
			Game.rooms[room]._cache.spawnLink = 0;
		}
	}
	
	return Game.rooms[room]._cache.spawnLink
}

function getSourceLinks(room) {
	if (sourceLinks[room] === undefined || Game.time > sourceLinks[room].ts){

		let Links = _.filter(Game.rooms[room].findByType(STRUCTURE_LINK), 
			function(c) {return (!c.isController() && (c.isProvider() ))
			});	
		sourceLinks[room] = {}
		sourceLinks[room].ts = Game.time + 79;
		sourceLinks[room].links = [];

		let length = Links.length
		for (let i=0; i< length; i++) { 
			sourceLinks[room].links.push(Links[i].id)
		}
	}
	let returnArr = []
	let link 
	for (let i=0; i<sourceLinks[room].links.length; i++) { 
		link = Game.getObjectById(sourceLinks[room].links[i])
		if (link){
			returnArr.push(link);
		}
	}
	return returnArr		
}

global.getControllerLink = function(room) {
	if (controllerLinks[room] === undefined || Game.time > controllerLinks[room].ts){

		let Links = _.filter(Game.rooms[room].findByType(STRUCTURE_LINK), 
			function(c) {return (c.isController() )
			});	
		controllerLinks[room] = {}
		controllerLinks[room].ts = Game.time + 79;
		controllerLinks[room].links = [];

		let length = Links.length
		for (let i=0; i< length; i++) { 
			controllerLinks[room].links.push(Links[i].id)
		}
	}
	let returnArr = []
	let link 
	for (let i=0; i<controllerLinks[room].links.length; i++) { 
		link = Game.getObjectById(controllerLinks[room].links[i])
		if (link){
			returnArr.push(link);
		}
	}
	return returnArr;
}

global.getStorageLink = function(room) {
	if (storageLinks[room] === undefined || Game.time > storageLinks[room].ts){

		let Links = _.filter(Game.rooms[room].findByType(STRUCTURE_LINK), 
			function(c) {return (c.isStorage() )
			});	
		storageLinks[room] = {}
		storageLinks[room].ts = Game.time + 79;
		storageLinks[room].links = [];

		let length = Links.length
		for (let i=0; i< length; i++) { 
			storageLinks[room].links.push(Links[i].id)
		}
	}
	let returnArr = []
	let link 
	for (let i=0; i<storageLinks[room].links.length; i++) { 
		link = Game.getObjectById(storageLinks[room].links[i])
		if (link){
			returnArr.push(link);
		}
	}
	return returnArr
}
/*
function limit(v, min, max) {
    return (Math.min(max, Math.max(min, v)));
}*/

function doTowerVis(tower) {
    let color = '#66CCFF';
    if (tower.room === undefined) return;
    tower.room.visual.rect(tower.pos.x - 20, tower.pos.y - 20, 40, 40, {
        stroke: 'white',
        lineStyle: 'dashed',
        opacity: 0.01,
        fill: color,
        strokeWidth: 0.2
    });

    tower.room.visual.rect(tower.pos.x - 15, tower.pos.y - 15, 30, 30, {
        stroke: 'white',
        lineStyle: 'dashed',
        opacity: 0.01,
        fill: color,
        strokeWidth: 0.2
    });

    tower.room.visual.rect(tower.pos.x - 10, tower.pos.y - 10, 20, 20, {
        stroke: 'white',
        lineStyle: 'dashed',
        opacity: 0.01,
        fill: color,
        strokeWidth: 0.2
    });

    tower.room.visual.rect(tower.pos.x - 5, tower.pos.y - 5, 10, 10, {
        stroke: 'white',
        strokeWidth: 0.2,
        lineStyle: 'dashed',
        opacity: 0.01,
        fill: color
    });
}

global.getCreepDamagePotential = function(targetPos, attackers) {
	let total = 0;

	for (let idx in attackers) {

		let creep = attackers[idx]
		let power = calcSingleCreepStrength(creep, true);

		let range = creep.pos.getRangeTo(targetPos)

		if (range <= 1 || (range <= 2 && !creep.fatigue && targetPos.lookForStructuresAround(STRUCTURE_RAMPART, 1).length > 0)) {
			total += power.attackDamage;
		}

		if (range <= 3 || (range <= 4 && !creep.fatigue)) {
			total += power.rangedAttackDamage;
		}
	}

	return total;
}

global.getCreepDamage = function(targetPos, attackers) {
    let total = 0;
    let damage;
    let e;
    _.forEach(attackers, function(o) {
        if (o.pos.isNearTo(targetPos)) {
            for (e in o.body) {
                if (o.body[e].type === ATTACK) {
                    damage = 30;
                    if (o.body[e].boost !== undefined) {
                        damage *= BOOSTS.attack[o.body[e].boost].attack;
                    }
                    total += damage;
                }
                if (o.body[e].type === RANGED_ATTACK) {
                    damage = 10;
                    if (o.body[e].boost !== undefined) {
                        damage *= BOOSTS.ranged_attack[o.body[e].boost].rangedAttack;
                    }
                    total += damage;
                }

            }
        } else if (o.pos.getRangeTo(targetPos) <= 3) {
            for (e in o.body) {
                if (o.body[e].type === RANGED_ATTACK) {
                    damage = 10;
                    if (o.body[e].boost !== undefined) {
                        damage *= BOOSTS.ranged_attack[o.body[e].boost].rangedAttack;
                    }
                    total += damage;
                }

            }
        }
    });
    return total;
}

global.getCreepHeal = function(targetPos, healers) {
	let total = 0;
    let heal;
    let e;
    _.forEach(healers, function(o) {
        if (o.pos.isNearTo(targetPos)) {
            for (e in o.body) {
                if (o.body[e].type === HEAL && o.body[e].hits > 0) {
                    heal = HEAL_POWER;
                    if (o.body[e].boost !== undefined) {
                        heal *= BOOSTS.heal[o.body[e].boost].heal;
                    }
                    total += heal;
                }
            }
        } else if (o.pos.getRangeTo(targetPos) <= 3) {
            for (e in o.body) {
                if (o.body[e].type === HEAL && o.body[e].hits > 0) {
                    heal = RANGED_HEAL_POWER;
                    if (o.body[e].boost !== undefined) {
                        heal *= BOOSTS.heal[o.body[e].boost].rangedHeal;
                    }
                    total += heal;
                }
            }
        }
    });
    return total;
}

global.repairWihClosestTower = function(structure, towers){
	let closestTower;
	let closestRange = Infinity;
	let idxToRemove;
	let tower;
	for (let e in towers) {
		tower = towers[e];
		if (tower.energy < 500) { continue; }
		let rangeToStructure = tower.pos.getRangeTo(structure);
		if (rangeToStructure < closestRange){
			closestRange = rangeToStructure;
			closestTower = tower;
			idxToRemove = e;
		}
	}

	if (closestTower) {
		if (closestTower._repair === Game.time) {
			return false;
		}
		closestTower.repair(structure);	
		closestTower._repair = Game.time;
		return true;
	}
	return false;
};

global.getTowerRepair = function(targetPos, towers) {
    let totalDamage = 0;
    for (let e in towers) {
        if (towers[e].energy > 10) {
            let range = targetPos.getRangeTo(towers[e]);
            if (range <= 5) {
                totalDamage += 800;
            } else if (range >= 20) {
                totalDamage += 200;
            } else {
                range -= 5;           
           		let damage = 800 - (30 * range)                
                totalDamage += damage;
            }
        }
    }
    return totalDamage;
}

global.getTowerDamageXY = function(targetPosX, targetPosY, towers, ignoreEnergy=false) {
    let totalDamage = 0;
    for (let e in towers) {
        if (ignoreEnergy || towers[e].energy > 10) {
            let range = getRangeXY(targetPosX, targetPosY, towers[e].pos.x, towers[e].pos.y);
            if (range <= 5) {
                totalDamage += 600;
            } else if (range >= 20) {
                totalDamage += 150;
            } else {
                range -= 5;
           		let damage = 600 - (30 * range)
                totalDamage += damage;
            }
        }
    }
    return totalDamage;
}

global.getTowerDamage = function(targetPos, towers, ignoreEnergy=false) {
    let totalDamage = 0;
    for (let e in towers) {
        if (ignoreEnergy || towers[e].energy > 10) {
            let range = targetPos.getRangeTo(towers[e]);
            if (range <= 5) {
                totalDamage += 600;
            } else if (range >= 20) {
                totalDamage += 150;
            } else {
                range -= 5;
           		let damage = 600 - (30 * range)
                totalDamage += damage;
            }
        }
    }
    return totalDamage;
}

function creepIsDrainingTowers(creep) {
	let creepId = creep.id;
	if (Memory.enemyCreepsAttacked[creepId]) {
		let recorded = Memory.enemyCreepsAttacked[creepId]
	//	console.log(JSON.stringify(recorded))
		if (recorded.attackCounter >= 4 ) {
			
			if (creep.hits >= recorded.recordedHits) {
				let avgDmg = recorded.accumulatedDmg / recorded.attackCounter;
				recorded.dmg = Math.max(avgDmg * 1.5, recorded.dmg * 1.2);
			} else {
				let avgDmg = recorded.accumulatedDmg / recorded.attackCounter;
				recorded.dmg = Math.max(avgDmg * 1.0, recorded.dmg * 1.2);
			}

			
			recorded.recordedHits = creep.hits;
			recorded.attackCounter = 0;
			recorded.accumulatedDmg = 0;
			console.log("creep hit 10 times, new required dmg " + recorded.dmg)
		}
		return recorded.dmg;
	}
	return 0;
}

function trackEnemyAttackedByTowers(creep, dmgDealt, firstCaller=true){	

	let creepId = creep.id;
	if (!Memory.enemyCreepsAttacked[creepId]) {
		Memory.enemyCreepsAttacked[creepId] = {};
		Memory.enemyCreepsAttacked[creepId].ts = Game.time + creep.ticksToLive;
		Memory.enemyCreepsAttacked[creepId].recordedHits = creep.hits;
		Memory.enemyCreepsAttacked[creepId].attackCounter = 0;
		Memory.enemyCreepsAttacked[creepId].accumulatedDmg = 0;
		Memory.enemyCreepsAttacked[creepId].dmg = 0;	// DAMAGE MULTIPLIER
	}	
	Memory.enemyCreepsAttacked[creepId].attackCounter++;
	Memory.enemyCreepsAttacked[creepId].accumulatedDmg+= dmgDealt ;

	if (firstCaller) {
		let hostiles = creep.pos.lookForEnemyCreepsAround(2);
		for (let idx in hostiles) {
			if (hostiles[idx].id === creepId) { continue; }
			trackEnemyAttackedByTowers(hostiles[idx], dmgDealt, false);
		}	
	}	
}

global.doScatterShot = function(room, enemies, towers){
	if (enemies.length === 1 || towers.length === 1) { return; }

	let roomCache = Game.rooms[room]._cache
	if (!roomCache.scatterShotCd || 
		Game.time > roomCache.scatterShotCd
		) {

		if (roomCache.scatterShotCount === undefined) {
			roomCache.scatterShotCount = 0; 
		}	

		if (roomCache.scatterShotCount < 4) {
			for (let e in towers) {
				if (towers[e].energy < 650) { continue; }
				if (roomCache.scatter) {
					towers[e].attack(enemies[e % enemies.length]);
				} else {
					towers[e].attack(enemies[Game.time % enemies.length]);
				}
			}
		} else {
			let target = Game.getObjectById(roomCache._target);
			if (target) {
				for (let e in towers) {
					if (towers[e].energy < 650) { continue; }
					towers[e].attack(target);
				}
				roomCache.prevTarget = target.id;
				roomCache.prevTargetHits = target.hits;
				delete roomCache._target;
			}			
		}
		

		

		roomCache.scatterShotCount++;
		if (roomCache.scatterShotCount >= 5) {
			delete roomCache.scatterShotCount;
			roomCache.scatterShotCd = Game.time + 20 + (Math.random() * 40);
			if (roomCache.scatter) {
				delete roomCache.scatter;
			} else {
				roomCache.scatter = 1;
			}
		}
		return 1;		
	}
}



function oneshotIfMove(enemies, towers, myCreeps){

	// Check if enemy is standing still and in range 1 of ramparts/defenders

	// Check if my dmg can oneshot/cripple

	// check if enemy can oneshot/cripple

	// Record Creeps current pos, make sure these are not occupied next tick

	// Move creeps, attacks other creep with towers (to make enemies preheal a different target)
	for (let idx in enemies) {
		let enemy = enemies[idx];
		let nearbyHostiles = enemy.pos.lookForEnemyCreepsAround(3);
		let nearbyPower = calcCreepStrength(nearbyHostiles);
		if (nearbyPower.attackDamage + nearbyPower.rangedAttackDamage >= 4000) { continue; }
		let potentialNextTickDmg = getTowerDamage(enemy.pos, towers);
		for (let myIdx in myCreeps) {
			let defender = myCreeps[myIdx];
			if (defender.pos.getRangeTo(enemy) > 2) { continue; }
			let myDmg = calcCreepStrength(defender);
			potentialNextTickDmg += myDmg.attackDamage + myDmg.rangedAttackDamage;
		}

		if (potentialNextTickDmg >= 3500) {
			enemy.room.visual.text(potentialNextTickDmg.toFixed(0), enemy.pos, { color: 'red', font: 0.5 });
		}
	}
}

global.campers = {};
global.chargeCampingEnemies = function(enemies, towers, allies){
	for (let idx in enemies) {
		let enemy = enemies[idx];
		let curPos = posCompress(enemy.pos)

		if (global.campers[enemy.id] === undefined) {
			global.campers[enemy.id] = {};
			global.campers[enemy.id].lastPos = curPos;
			global.campers[enemy.id].cnt = 0;
		} else {
			 
			if (global.campers[enemy.id].lastPos === curPos) {
				global.campers[enemy.id].cnt++;
			} else {
				global.campers[enemy.id].lastPos = curPos;
				global.campers[enemy.id].cnt = 0;
			}
		}

		if (global.campers[enemy.id].cnt < 17) { continue; }
		global.campers[enemy.id].cnt = 0; // Reset check

		let enemyHealing = getCreepHeal(enemy.pos, enemies);
		let towerDamage = getTowerDamage(enemy.pos, towers);

		// Check if i can kill if move 1 forward
		let alliesToMove = [];
		let myDmg = 0;
		for (let myIdx in allies) {
			let creep = allies[myIdx];
			
			if (!creep.my) { continue; }
			if (creep.pos.getRangeTo(enemy) > 2) { continue; }

			let thisCreepDmg = getCreepDamage(enemy.pos, [creep]);
			if (thisCreepDmg <= 0) { continue; }
			myDmg += thisCreepDmg;
			alliesToMove.push(creep);
		}

		if (myDmg + towerDamage < enemy.hits + enemyHealing) { continue; }

		// Pull positions

		// Shoot at healers

		// Move forward



	}
}

global.findAttackTargetDmgBased = function(enemies, towers, allies, safemode) {
	
	let target;
	let highestDmg = 50 * towers.length;	// ignore creeps i can do less than this dmg to
	let selectedCreepLossHp = 0;

	let _target;
	let _highestDmg = 50 * towers.length;	// ignore creeps i can do less than this dmg to
	let roomName = towers[0].pos.roomName

	let targetPre;
	if (Game.rooms[roomName]._cache.prevTarget) {
		let creep = Game.getObjectById(Game.rooms[roomName]._cache.prevTarget);
		if (creep && creep.hits < Game.rooms[roomName]._cache.prevTargetHits) {
			creep.room.visual.text("P", creep.pos, { color: 'blue', font: 0.8 });		
			target = creep;
			targetPre = true;
		}
		delete Game.rooms[roomName]._cache.prevTarget;
		delete Game.rooms[roomName]._cache.prevTargetHits;
	}
		
		
	if (!target) {
		for (let idx in enemies) {
			let creep = enemies[idx];
			let currentLossHp = creep.hitsMax - creep.hits;
				
			let totalDamage = 0;
			totalDamage += getTowerDamage(creep.pos, towers);
			totalDamage += getCreepDamage(creep.pos, allies);
			let healing = 0;
			if (!safemode) {
				healing = getCreepHeal(creep.pos, enemies);
			}
			let dmgDealt = effectiveDamage(creep.body, creep.hits, totalDamage, healing); 
			
			if (creep.pos.lookForStructuresAround(STRUCTURE_RAMPART, 1).length) {
				delete Game.rooms[roomName]._cache.twrAtckTs;
			}

		//	creep.room.visual.text(dmgDealt.toFixed(0), creep.pos, { color: 'green', font: 0.8 });
			if (dmgDealt >= creep.hits) {
				highestDmg = dmgDealt;
				target = creep;
				creep.room.visual.text("X", creep.pos, { color: 'red', font: 0.8 });
				break;
			}

			let preventDrainDamageThreshold;
			if (!safemode) {
				preventDrainDamageThreshold = creepIsDrainingTowers(creep);
			}

			dmgDealt = dmgDealt * (0.9 + Math.random() * 0.2);	// unpredictable dmg 0.9-1.1

			if (preventDrainDamageThreshold) {

				if (Game.rooms[roomName]._cache.twrAtckTs && Game.time < Game.rooms[roomName]._cache.twrAtckTs) { continue; }

				if (dmgDealt > preventDrainDamageThreshold && 
					(dmgDealt > highestDmg || 
					(dmgDealt >= (highestDmg * 0.9) && Math.random() > 0.15) ||
					(dmgDealt == highestDmg && currentLossHp > selectedCreepLossHp))
					) {
					selectedCreepLossHp = currentLossHp;
					highestDmg = dmgDealt;
					target = creep;

				}
			} else if (dmgDealt > highestDmg) {
				selectedCreepLossHp = currentLossHp;
				highestDmg = dmgDealt;
				target = creep;
			}


			if (dmgDealt > _highestDmg) {
				selectedCreepLossHp = currentLossHp;
				_highestDmg = dmgDealt;
				_target = creep;
			}
		}
	}

	if (_target) {
		Game.rooms[roomName]._cache._target = _target.id;
	}
	
	if (!target) { 
		return 0; 
	}

	if (!targetPre){
		trackEnemyAttackedByTowers(target, highestDmg);
	}	
	
	Game.rooms[roomName]._cache.prevTarget = target.id;
	Game.rooms[roomName]._cache.prevTargetHits = target.hits;
	Game.rooms[roomName]._cache.twrAtckTs = Game.time + 10 + Math.floor((Math.random() * 15));

	let e;
	for (e in towers) {
		towers[e].attack(target);
		
	}

    for (e in allies) {
        if (allies[e].getActiveBodyparts(ATTACK) > 0) {
			allies[e].attack(target);			
        }
        if (allies[e].getActiveBodyparts(RANGED_ATTACK) > 0) {
			if (allies[e].pos.getRangeTo(target) === 1) {
				allies[e].rangedMassAttack();
			} else {
				allies[e].rangedAttack(target);
			}
        }
	}
	
    
    return true;
}

global.effectiveDamage = function(body, currentHp, damage, heal) {
    let _damage = damage
	let _heal = heal
	let newHp = currentHp;

    // SUBTRACT DAMAGE, ACCOUNT FOR THOUGH PARTS
	for (let e in body) {
    	if (body[e].hits > 0){
			let effectiveHp = body[e].hits;
			let dmgModifier = 1;
		//	console.log(body[e].type)
    		if (body[e].type === TOUGH && body[e].boost !== undefined) {
				dmgModifier = BOOSTS.tough[body[e].boost].damage;
				effectiveHp = body[e].hits / dmgModifier;
			}
    		let availableDmg = Math.min(_damage*dmgModifier, effectiveHp);
			newHp -= availableDmg;
        	_damage -= effectiveHp;
		}
		if (_damage <= 0) { break; }
	}

	if (_damage > 0) {	// MORE DMG THAN HITS
		newHp -= _damage;
	}

	newHp += heal


	// HEAL UP
//	for (let a in body) {
	/*
	let a = body.length;
	while (a--){
		if (body[a].hits < 100 && _heal > 0) {
			let missingHp = 100 - body[a].hits
			let availableHeal = limit(_heal, 0, missingHp)
			body[a].hits += availableHeal;
			_heal -= availableHeal;
		}
		newHp += body[a].hits;	
	}
	*/
	let dmgDone = currentHp - newHp
	if (newHp < 0) {
		dmgDone = currentHp + Math.abs(newHp);
	}

    return dmgDone;
}
