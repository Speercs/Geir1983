'use strict'

module.exports = function() {
	
	if(global.getSellOrdersTimestamp == undefined) {global.getSellOrdersTimestamp = {} }	
	if(global.sellOrders == undefined) {global.sellOrders = {} }
	
	
	global.currentActiveOrders = function(orderType, res){
		if(global.myOrders == undefined) {
			global.myOrders = {};
			let myOrders = Game.market.orders;
			for (let id in myOrders) {
				let order = myOrders[id];				
				if (!order.active) {
					Game.market.cancelOrder(order.id);
					delete Memory.ordersHistory[order.id];
					continue;
				}
				if (global.myOrders[order.type] === undefined ) { global.myOrders[order.type] = {}; }
				if (global.myOrders[order.type][order.resourceType] === undefined ) { global.myOrders[order.type][order.resourceType] = [] }
				global.myOrders[order.type][order.resourceType].push(order);
			}
		}
		if (global.myOrders[orderType] && global.myOrders[orderType][res] ) {
			return global.myOrders[orderType][res];
		} else {
			return [];
		}

	}
	
	global.getMarketSellOrders = function(res) {		
		
		if(global.getSellOrdersTimestamp[res] == undefined || global.getSellOrdersTimestamp[res] != Game.time) {
			global.getSellOrdersTimestamp[res] = Game.time;			
			let orders = _.filter(getAllMarketSellOrders(), 
				function(c) {return (c.resourceType === res)
				});	

			if(global.sellOrders == undefined) {global.sellOrders = {} }	
			global.sellOrders[res] = [];	
			if (orders && orders.length) {	
				orders.sort(function(a,b){return a.price - b.price;});
				global.sellOrders[res] = orders;
				
			} 
		}
		return global.sellOrders[res];
	}
	
	if(global.getBuyOrdersTimestamp == undefined) {global.getBuyOrdersTimestamp = {} }	
	if(global.buyOrders == undefined) {global.buyOrders = {} }	

	global.getMarketBuyOrders = function(res) {
		if(global.getBuyOrdersTimestamp[res] == undefined || global.getBuyOrdersTimestamp[res] != Game.time) {
			global.getBuyOrdersTimestamp[res] = Game.time;
			let orders = _.filter(getAllMarketBuyOrders(), 
				function(c) {return (c.resourceType === res)
				});	
			if(global.buyOrders == undefined) {global.buyOrders = {} }	
			global.buyOrders[res] = [];
			if (orders && orders.length > 1) {
				orders.sort(function(a,b){return b.price - a.price;}); 
				global.buyOrders[res] = orders;
			}			
		}

	
		return global.buyOrders[res] || []
	}
	
	global.getAllMarketBuyOrders = function() {
		if(global.getAllBuyOrdersTimestamp == undefined || global.getAllBuyOrdersTimestamp != Game.time) {
			global.getAllBuyOrdersTimestamp = Game.time;
		//	delete global.buyOrders;
			global.allBuyOrders = {}
			global.allBuyOrders = _.filter(getAllMarketOrders(), 
				function(c) {return (c.type === ORDER_BUY)
				});
		}
		return global.allBuyOrders;
	};
	
	global.getAllMarketSellOrders = function() {
		if(global.getAllSellOrdersTimestamp == undefined || global.getAllSellOrdersTimestamp != Game.time) {
			global.getAllSellOrdersTimestamp = Game.time;
		//	delete global.sellOrders;
			global.allSellOrders = {}
			global.allSellOrders = _.filter(getAllMarketOrders(), 
				function(c) {return (c.type === ORDER_SELL)
				});	
		}
		return global.allSellOrders;
	};
	
	global.getAllMarketOrders = function() {
		
		if(global.getAllOrdersTimestamp == undefined || global.getAllOrdersTimestamp != Game.time) {
			global.getAllOrdersTimestamp = Game.time
			global.orders = [];
			// filter out Game.market.orders
			global.orders = Game.market.getAllOrders();
		}
		return global.orders;
	}

	global._resourceWorth = {};
	global.getResourceWorth = function(res) {

		if (!global._resourceWorth[res] || Game.time > global._resourceWorth[res].ts) {
			
			global._resourceWorth[res] = {}
			global._resourceWorth[res].ts = Game.time + 1500;
		
			let value = 0;
			if (!DISABLED_MARKET) {
				value = getMarketPrice(res)
			} else {
				if (SEASONAL_THORIUM && res === RESOURCE_THORIUM) {
					value = 5000;
				} else if (SEASONAL_SCORE && res === RESOURCE_SCORE) {
					value = 5;
				} else if (SEASONAL_SYMBOLS && SYMBOLS.includes(res)) {
					value = 5;
				} else if (SEASONAL_COMMS && COMMODITY_SCORE[res]) {
					value = COMMODITY_SCORE[res] * 10;
				} else if (res === RESOURCE_ENERGY) {
					value = 0.1;
				} else {
					let minerals = getBaseMineralsInCompund(res);

					let higestBaseMineralStock = 0;
					for (let idx in BASE_MINERALS_ROOMS) {
						let mineral = BASE_MINERALS_ROOMS[idx]
						higestBaseMineralStock = Math.max(higestBaseMineralStock, Memory.Minerals[mineral] || 0)
					}

					if (T3_WANTED_BOOSTS_OBJECT[res]) { // T3 takes a lot of effort
						value += 3;
					}

					for (let mineral in minerals) {
						value += (1 - ((Memory.Minerals[mineral] || 0) / higestBaseMineralStock)) * minerals[mineral] 

						if (mineral === RESOURCE_CATALYST) {	
							
						}
					}
				}
			}
			global._resourceWorth[res].value = value;
		}

		return global._resourceWorth[res].value;
	}



	
	global.estimateCompundPrice = function(res, buyOnly){
		let price = 0;
		let minerals = getBaseMineralsInCompund(res);
		for (let mineral in minerals) {
			price += getMarketPrice(mineral, buyOnly) * minerals[mineral]
		}
		return price;
	}

	global.getMarketPrice = function(res, buyOnly=false) {

		let sellPrice = 0;
		if (!buyOnly && Memory.market.sell[res] && Memory.market.sell[res].avgPrice) {
			sellPrice = Memory.market.sell[res].avgPrice;
		} 
	
		let buyPrice = 0.1;
		if (Memory.market.buy[res] && Memory.market.buy[res].avgPrice) {
			buyPrice = Memory.market.buy[res].avgPrice;
		} 

		if (!Memory.market.buy[res] && !Memory.market.sell[res] && reactionJob[res]) {
			let estimatedPrice = estimateCompundPrice(res, buyOnly);
			return estimatedPrice;
		}
	
		// if not found, estimate based on base minerals?
	
		return Math.max(sellPrice, buyPrice)
	}

	global.getCachedComoditiesForResAtLevel = function(res, factoryLevel, myLevelOnly=false){
		let comId = res+factoryLevel+myLevelOnly
		if (!ComoditiesForResAtLevel[comId]) {
			ComoditiesForResAtLevel[comId] = getComoditiesForResAtLevel(res, factoryLevel, myLevelOnly)
		}
		return ComoditiesForResAtLevel[comId];
	}

	global.getComoditiesForResAtLevel = function(res, factoryLevel, myLevelOnly, comodities){

		if (comodities === undefined) { comodities = {} }
		if (!COMMODITIES[res]) { return comodities }

		let wantedLevel = (factoryLevel == COMMODITIES[res].level) || (!COMMODITIES[res].level && (!myLevelOnly || factoryLevel === 0));

		for (let com in COMMODITIES[res].components) {
			
			if (wantedLevel) {
				if (comodities[res] === undefined) { comodities[res] = {}; }
				if (comodities[res].res === undefined) { comodities[res].res = {}; }

				if (comodities[res].res[com] === undefined) { comodities[res].res[com] = 0; }
				comodities[res].res[com] += COMMODITIES[res].components[com];
			}
			
			if (COMMODITIES[com] && !BASE_MINERALS_OBJECT_CRANE[com] && com !== RESOURCE_ENERGY && !comodities[com]) {
				getComoditiesForResAtLevel(com, factoryLevel, myLevelOnly, comodities)
			}
		}
		return comodities;
	}

	global.getAllBaseMinerals = function(){
		let recepies = {};
		for (let res in COMMODITIES) {
			recepies[res] = {};
			recepies[res] = getCachedBaseMaterialsInComodity(res);
		}
		console.log(JSON.stringify(recepies))
	}

	global.getCachedBaseMaterialsInComodity = function(res){
		
		if (!BaseMaterialsInComodity[res]) {
			BaseMaterialsInComodity[res] = getBaseMaterialsInComodity(res)
		}
		return BaseMaterialsInComodity[res];
	}

	global.getBaseMaterialsInComodity = function(res, comodities, numberRequired = 1){
		if (comodities === undefined) { comodities = {} }

		if (!COMMODITIES[res]) { return comodities }

		let factor = numberRequired * (1 / COMMODITIES[res].amount);
		
		for (let com in COMMODITIES[res].components) {
			let requiredComponents = COMMODITIES[res].components[com] * factor
			if (com === RESOURCE_GHODIUM) {
				let ghodium = getBaseMineralsInCompund(RESOURCE_GHODIUM);
				for (let resource in ghodium){
					if (comodities[resource] === undefined) { comodities[resource] = 0; }
					comodities[resource] += ghodium[resource] * requiredComponents;
				}
			} else if (RAW_MINERALS[com] === undefined) {
				getBaseMaterialsInComodity(com, comodities, requiredComponents)
			} 
			else {
				if (comodities[com] === undefined) { comodities[com] = 0; }
				comodities[com] += requiredComponents;
			}
		}
		return comodities;
	}

	/*
		Stats for required factory time and resources for producing LVL 5 commodities from basic resources:
		Machine
		Factorytime: {"0":1400,"1":1287.5,"2":1150,"3":1000,"4":800,"5":600}
		Resources: {"O":8800,"energy":13453,"H":4050,"G":750,"U":1000,"Z":8260,"metal":5550,"X":1040}
		Organism
		Factorytime: {"0":1402.4,"1":1277.5,"2":1148,"3":1000,"4":800,"5":600}
		Resources: {"L":8470,"energy":13445,"biomass":5550,"O":8600,"H":4850,"Z":250,"X":1040,"G":750}
		Device
		Factorytime: {"0":1397.8,"1":1284,"2":1152,"3":1000,"4":800,"5":600}
		Resources: {"U":8515,"energy":13269,"silicon":5555,"O":5895,"H":5525,"Z":1000,"X":1050,"L":550,"K":550,"G":750}
		Essence
		Factorytime: {"0":1394.2,"1":1271,"2":1153,"3":1000,"4":800,"5":600}
		Resources: {"K":8985,"energy":13191,"mist":5550,"H":10620,"O":1800,"X":1050,"L":550,"G":750}
	*/

	global.getMarketRatioOfCommodity = function (commodity){
		let estimatedBaseCost = estimateCostOfComodity(commodity);
		let marketPrice = getMarketPrice(commodity, true);
		return marketPrice / estimatedBaseCost;
	}

	/*
	function getFactoryUtilization(level) {
		let allFactories = 0;
		let activeFactories = 0;
		
		for (let levelIdx in Memory.factories) {
			let factories = Object.keys( Memory.factories[levelIdx]).length
			allFactories += factories;
			if (levelIdx > level) { continue;}
			activeFactories += factories;
		}

		let ratio = activeFactories / (allFactories || 1);
	//	log(ratio + " getFactoryUtilization using " + activeFactories + " / " + allFactories + " ratio of "+ ratio)
		return ratio;
	}*/

	function factoriesAtLevel(level) {
		if(Memory.factories === undefined || Memory.factories[level] === undefined) { return 0; }

		return Object.keys(Memory.factories[level]).length;		
	}

	function sustainedFactoriesAt(level) {
		
		let times = [1503, 1315, 1160, 1014, 801, 601];

		if(Memory.factories === undefined || Memory.factories[level] === undefined) { return 0; }

		let wantedLevelFactory = Object.keys(Memory.factories[level]).length;		
		let worstFactor = 1;
		for (let i = level; i >= 0; i--) {
			if (i > level) { continue;}

			let factories = 0;
			if (Memory.factories[i]) { // sometimes a level might be missing due to no ops or no power creep
				factories = Object.keys( Memory.factories[i]).length;
			}
			
			let neededFactories = Math.ceil(wantedLevelFactory * (times[i] / times[level]))
			let factoryFactor = Math.min(1, factories/neededFactories);
			worstFactor = Math.min(worstFactor, factoryFactor);
		//	console.log(i +" adding possible factories" + possibleFactory + "/" + factories + " new total active " + activeFactories)
		}

		let susainableFactories = wantedLevelFactory * worstFactor;
	//	log(level + " sustainedFactoriesAt can sustan  " + susainableFactories + " / " + wantedLevelFactory)
		return susainableFactories;
	}

	function getFactoryUtilizationV2(level) {
		let allFactories = 0;
		let activeFactories = 0;

		let times = [1503, 1315, 1160, 1014, 801, 601];

		let highLevelFactory = Object.keys(Memory.factories[level]).length;

		for (let i = 5; i >= 0; i--) {
			let factories = Object.keys( Memory.factories[i]).length
			allFactories += factories;
			if (i > level) { continue;}
			let possibleFactory = Math.ceil(highLevelFactory * (times[i] / times[level]))
			activeFactories += Math.min(factories, possibleFactory) ;
		//	console.log(i +" adding possible factories" + possibleFactory + "/" + factories + " new total active " + activeFactories)
		}

		let ratio = activeFactories / (allFactories || 1);
	//	log(level + " getFactoryUtilization using " + activeFactories + " / " + allFactories + " ratio of "+ ratio)
		return ratio;
	}

	function producingAmountPerTick(res) {
		let amount = 0;
		if (COMMODITIES[res]) {
			amount = COMMODITIES[res].amount / COMMODITIES[res].cooldown;
		}
		return amount;
	}

	global.sellCommoditiesWithGoodDeals = function(myRooms) {
		let init = Game.cpu.getUsed()

		let sellAll = false;
		let currentCommoditiy = Memory.comodityToProcude;
		if (!HARVEST_DEPOSITS && BOT_MODE) {
			sellAll = true;
		}

		let usedInRecepie = {}
		if (sellAll && currentCommoditiy) {
			usedInRecepie = getCachedComoditiesForResAtLevel(currentCommoditiy, 5)
		}
		
		if (!sellAll && !currentCommoditiy && Object.keys(Memory.import).length <= 0) { return false; }

		let estimatedBaseCost;
		let currentRatio = 2.0;
		let sellAtRatio = 1.5;
		if (currentCommoditiy) {
			estimatedBaseCost = estimateCostOfComodity(currentCommoditiy);
			let marketPrice = getMarketPrice(currentCommoditiy, true);
			currentRatio = marketPrice / estimatedBaseCost;

			sellAtRatio = Math.max(1.25, currentRatio*0.75)
			log("currently producing " + currentCommoditiy + " with ratio " + currentRatio.toFixed(2) + " sell at ratio " + sellAtRatio.toFixed(2))
		}

		let sold = 0;

		let stuffToSell = COMMODITIES;
		if (sellAll) {
			stuffToSell = Object.assign(COMMODITIES, HIGHWAY_MINERAL)
		}
		
		for (let res in stuffToSell) {
			if (!Memory.Minerals[res]) { continue; }
			if (res === RESOURCE_GHODIUM || res === RESOURCE_GHODIUM_MELT || res === RESOURCE_BATTERY || res === RESOURCE_ENERGY) { continue; }
			if (BASE_MINERALS_OBJECT[res]) { continue; }
			if (!sellAll && HIGHWAY_MINERAL[res]) { continue; }

			
			let minAmountStored = maxStoreInRoom(res);
			let importing = false;
			for (var shard in Memory.import) {
				if (Memory.import[shard][res]) {
					minAmountStored *= 0.5;
					importing = true;
				}
			}

			if (sellAll) {
				if (usedInRecepie[res]) {
					minAmountStored *= 0.5;
				} else {
					minAmountStored = 0;
				}
			}
			
			if ((Memory.Minerals[res] || 0) < minAmountStored) { continue; }

			let orders = getMarketBuyOrders(res);
			let bestOrder = null;
			let price = 0;
			for (let i=0; i < orders.length; i++) {
				if (orders[i].amount <= 0) { continue; }
				price = orders[i].price;
				bestOrder = orders[i];
				break;
			}

			let marketPriceRatio = 1.1;
			if (importing || sellAll) {
				marketPriceRatio = 0.9;
				// Dont check cost based on prices on this shard when importing
			} else {
				estimatedBaseCost = estimateCostOfComodity(res);
				let ratio = price / estimatedBaseCost;
				if (ratio < sellAtRatio) { continue; }
			}

			if (!marketMineralSensiblePrice(price, res, ORDER_BUY, marketPriceRatio)) { continue; }

			if (USE_SHARDS && !interShardLocalPriceBest(price, res, ORDER_BUY, 1)) {
				log("skipping sell of "+ res + " better prices on other shard!")
				continue;
			}

			log("found res " +res+ " with good deal! ")

			if (bestOrder) {

				if (!myRooms) {
					myRooms = getMyRooms()
				}

				let bestSeller = null;
				let bestStock = 0;
				for (let roomName in myRooms) {
					if (!Game.rooms[roomName].terminal || Game.rooms[roomName].terminal.cooldown || Game.rooms[roomName].terminal.__cooldown) { continue; }
					if (Game.rooms[roomName].terminal.store[res] > bestStock) {
						bestStock = Game.rooms[roomName].terminal.store[res]
						bestSeller = roomName;
					}
				}

				if (bestSeller) {
					let amountToSell = Math.min(Game.rooms[bestSeller].terminal.store[res], bestOrder.amount, maxStoreInRoom(res) )
					
					let result = Game.market.deal(bestOrder.id, amountToSell, bestSeller);
					Game.rooms[bestSeller].terminal.__cooldown = TERMINAL_COOLDOWN;
					if (result === OK) { sold++ }
					log("Good deals want to sell " + amountToSell + " " + res + " from " + bestSeller + " current price " + price + " result " + result )
				}
			}
		}

		log("sellCommoditiesWithGoodDeals used cpu " + (Game.cpu.getUsed()-init).toFixed(2) )
		return sold;
	}

	function amountOfFactories(){
		if(Memory.factories === undefined) { return 0; }

		let cnt = 0;

		for (let level in Memory.factories) {
			cnt += Object.keys(Memory.factories[level]).length
		}

		return cnt;


	}

	/*
	global.scoreForHwMaterial = function(){
		
		for (let res in COMMODITY_SCORE) {
			let requiredMats = getCachedBaseMaterialsInComodity(res);
			let score = 0;
			for (let ingredient in requiredMats) {
				if (HIGHWAY_MINERAL[ingredient]) {
					score = COMMODITY_SCORE[res] / requiredMats[ingredient]
				}
			}
			console.log(res + " score / hw mat " + score.toFixed(3))
		}
	}*/

	global.setExports = function() {

		let localShard = Game.shard.name;
		for (let res in COMMODITIES) {

			let localMarketPrice = getMarketPrice(res, true);
			let {price, shard} = getBestShardBuyPrice(res);
			if (shard === localShard) { continue; }
			let priceRatio = price/localMarketPrice;
			if (priceRatio < 1.0) { continue; }
			log(res + " better to sell on shard " + shard + " price here " + localMarketPrice + " vs " + price + " ratio " + priceRatio.toFixed(2))

		}
	}

	global.getBestCommodity = function(minRatio = 2, buyMissing = false){
		let bestCom;
		let bestShard = Game.shard.name;
		let bestScore = 0;
		let bestRatio = 0;

		let factories = amountOfFactories() || 0;
		let resToBuy = { [RESOURCE_SILICON]: {}, [RESOURCE_METAL]: {}, [RESOURCE_BIOMASS]: {}, [RESOURCE_MIST]: {}, }

	//	let factories = 30;
		for (let res in COMMODITIES) {
			if (res === RESOURCE_GHODIUM || RAW_MINERALS[res]) { continue; }

			if (Memory.Minerals[res] && Memory.Minerals[res] > (maxStoreInRoom(res) * factories) ) { continue; }

			if (SEASONAL_COMMS && COMMODITY_SCORE[res] < 10) { continue; }

			let tier = COMMODITIES[res].level || 0;
			if (Memory.maxFactoryLevel !== undefined && tier > Memory.maxFactoryLevel) { continue; }

			let estimatedBaseCost = estimateCostOfComodity(res);
			let marketPrice = getMarketPrice(res, true);
			let shard = Game.shard.name;

		//	let {price, shard} = getBestShardBuyPrice(res);
		//	let marketPrice = price;

			let ratio = marketPrice / estimatedBaseCost

		//	console.log(res + " markup " + ratio.toFixed(2))
			
			if (ratio < minRatio && !SEASONAL_COMMS) { 
				console.log(res + " (level " +tier +") ratio not profitable! " + ratio.toFixed(2) ) 
				continue;
			}
			
			let producingFactories = factories;

			if (tier > 0) {
				producingFactories = sustainedFactoriesAt(tier)				
			}			

			// credits earned per tick
		//	let score = (marketPrice - estimatedBaseCost) * producingFactories * producingAmountPerTick(res);
			
			let score = 0;
			if (SEASONAL_COMMS && COMMODITY_SCORE) {
				ratio = COMMODITY_SCORE[res]*10 / estimatedBaseCost

				score += 1 - (Memory.Minerals[res] || 0) / maxStoreInRoom(res) 
				
			}
			score += ratio

			

			

			console.log(res + " (level " +tier +") earns per tick " + score.toFixed(1) + " producing factories " + producingFactories.toFixed(1) + " producing per tick " + producingAmountPerTick(res).toFixed(4) + " best price on shard " +shard + " ratio " + ratio.toFixed(2))
			
			if (producingFactories <= 0.01) { continue; }

			let maxRes = maxStoreInRoom(res) * producingFactories
			let stocked = (Memory.Minerals[res] || 0)
			let storeAmounts = stocked / maxRes

			if (storeAmounts >= 0.95) {
				score -= storeAmounts 
			}
			
			console.log("stocked " +storeAmounts.toFixed(2) + " " + stocked + " of max " + maxRes)

			let hasRequiredMats = true;

			let stockFactor = 1;
			let usesDepositMineral = false;

		//	let components = Object.keys(COMMODITIES[res].components)
			for (let component in COMMODITIES[res].components) {

			//	let component = components[idx]
				let requiredAmount = COMMODITIES[res].components[component] * (maxStoreInRoom(res) * 0.2) * (producingFactories * 0.5); // times factories at this level?
				let stock = Memory.Minerals[component] || 0;

				if (HIGHWAY_MINERAL[component] && tier >= 1) {
					
					let t0 = HIGHWAY_MINERAL[component].T0
					stock += ((Memory.Minerals[t0] || 0) * 5);
				} else if (COMPRESSED_RESOURCE[component] && tier >= 1) {
					stock += (Memory.Minerals[res] || 0) + ((Memory.Minerals[COMPRESSED_RESOURCE[component].raw] || 0) * 5)
				}

				// If not enough components in stock, check if we can make these components!
				if (stock < requiredAmount) {

					log("not enough " + component +" to make " + res)

					if (HIGHWAY_MINERAL[component] || BASE_MINERALS_OBJECT[component]) {
						hasRequiredMats = false;
						break;
					} else {
						// Check if we can make the ingredients

						let requiredMats = getCachedBaseMaterialsInComodity(component);
						for (let mineral in requiredMats) {

							let factoriesLvl0 = 1
							if (!DISABLED_MARKET && buyMissing && resToBuy[mineral] && ratio > minRatio && Memory.factories && Memory.factories[0]) {
								factoriesLvl0 = Object.keys(Memory.factories[0]).length;
							//	log("check buy of " + mineral + " want amount " + requiredMats[mineral] + " factories " + factories)
								if (!Memory.Minerals[mineral] || Memory.Minerals[mineral] < requiredMats[mineral] * factories * 10) {
									buyFromMarket(mineral, 10000, Memory.factories[0], undefined, undefined, true);
									delete resToBuy[mineral];
									log("buying " + mineral)
								}
							}
			
							let requiredAmountComponent = requiredMats[mineral] * 0.25 * maxStoreInRoom(component) * factoriesAtLevel(tier) ;
							/*
							if (HIGHWAY_MINERAL[mineral] && !SEASONAL_COMMS) {
								requiredAmountComponent = Math.max(requiredMats[mineral], 7500);
							} */
							
							if (SEASONAL_COMMS && HIGHWAY_MINERAL[mineral]) {
								score += 5; 
								usesDepositMineral = true;
							}
			
							let stockComponent = Memory.Minerals[mineral] || 0;
							if (HIGHWAY_MINERAL[mineral] && tier >= 1) {
								let t0 = HIGHWAY_MINERAL[mineral].T0
								stockComponent += ((Memory.Minerals[t0] || 0) * 5);
							} else if (COMPRESSED_RESOURCE[mineral] && tier >= 1) {
								stockComponent += (Memory.Minerals[res] || 0) + ((Memory.Minerals[COMPRESSED_RESOURCE[mineral].raw] || 0) * 5)
							}

							console.log("checking for creating component " + component + " has " + stockComponent + "/" + requiredAmountComponent + " of " + mineral)
			
							if (stockComponent < requiredAmountComponent) {
								hasRequiredMats = false;
								break;
							}
							
							let stockFactorIngredient = stockComponent / (requiredMats[mineral] * factoriesAtLevel(tier) * COMMODITIES[res].amount * maxStoreInRoom(component))
						//	log(res + " stock factor for " + mineral + " factor " + stockFactor.toFixed(2) )
							stockFactor = Math.min(stockFactor, stockFactorIngredient);
							
						}
					}
				} else {
					let stockFactorIngredient = stock / (requiredAmount * factories * 50 * COMMODITIES[res].amount)
					stockFactor = Math.min(stockFactor, stockFactorIngredient);
				}

				if (hasRequiredMats === false) {
					break;
				}
			}
			
			log("stockFactor " + stockFactor +" to make " + res + "  hasRequiredMats " +hasRequiredMats)
			
			score += Math.min(5, stockFactor * factories); // only factories at this tier?

			

			// Add time per 1 unit as score

			if (!hasRequiredMats) { continue; }

			console.log(res + " (level " +tier +") with score " + score.toFixed(2) + " ratio " + ratio.toFixed(2))
			
			if (score > bestScore) {
				bestScore = score;
				bestCom = res;
				bestShard = shard;
				bestRatio = ratio;

			}
		}
		console.log("best commodity to create " + bestCom + " with score " + bestScore + " want to sell in shard " +bestShard);

		if (bestShard !== Game.shard.name) {

			if (Memory.export[bestShard] === undefined) { Memory.export[bestShard] = {}; }
			if (Memory.export[bestShard][bestCom] === undefined) { Memory.export[bestShard][bestCom] = {} }

			Memory.export[bestShard][bestCom].producing = true;
			Memory.export[bestShard][bestCom].produceTs = Game.time;
			Memory.export[bestShard][bestCom].ratio = bestRatio;
		}

		return bestCom;
	}

	global.estimateCostOfComodity = function(res){
		let price = 0;
		let resources = getCachedBaseMaterialsInComodity(res);
		let buyOnly = BOT_MODE;
		for (let mineral in resources) {
			price += getMarketPrice(mineral, buyOnly) * resources[mineral]
		}
		return price;
	}	
	
	global.getBaseMineralsInCompund = function(compund, minerals) {
		if (minerals === undefined) { minerals = {} }

		if (reactionJob[compund]) {
			getBaseMineralsInCompund(reactionJob[compund].r1, minerals)
			getBaseMineralsInCompund(reactionJob[compund].r2, minerals)
		} else {
			if (minerals[compund] === undefined) { minerals[compund] = 0 }
			minerals[compund]++
		}
		return minerals;
	}
	
	global.estimateCompundPrice = function(res){
		let price = 0;
		let minerals = getBaseMineralsInCompund(res);
		for (let mineral in minerals) {
			price += getMarketPrice(mineral) * minerals[mineral]
		}
		return price;
	}

	global.betterToCreateOwnOrder = function (price, res, type) {
		let sellAvg = Memory.market.sell[res];
		let buyAvg = Memory.market.buy[res];

		if (COMMODITIES[res] && !BASE_MINERALS_OBJECT[res] && !HIGHWAY_MINERAL[res] && res !== RESOURCE_ENERGY) {
			return false;
			/*
			if (!buyAvg || buyAvg.samples < 10
				) {
				console.log("betterToCreateOwnOrder returning false, not enough market data for " + res + " " +type );	
				return false;
			}*/
		} else {
			if (!sellAvg || sellAvg.samples < 10 || 
				!buyAvg || buyAvg.samples < 10
				) {
				console.log("betterToCreateOwnOrder returning false, not enough market data for " + res + " " +type );	
				return false;
			}
		}

		let ratio
		if (type === ORDER_SELL) {

			// BETTER TO CREATE ORDER?
			ratio = sellAvg.avgPrice / price;
			if (ratio > 1.1) {
			//	console.log("betterToCreateOwnOrder returning true for "+res+", better to create own sell order " + ratio.toFixed(2) + " average buy price " + buyAvg.avgPrice.toFixed(3) + " average sell price " + sellAvg.avgPrice.toFixed(3));
				return true;
			}

		} else if (type === ORDER_BUY) {
			
			// BETTER TO CREATE ORDER?
			ratio = price / buyAvg.avgPrice ;
			if (ratio > 1.1) {
				return true;
			}
		}

		return false;
	} 



	// Where to sell
	global.getBestShardBuyPrice = function(res) {

		let localShardMemory = getLocalInterShardMemory();
		
		let localPrice = getMarketPrice(res, true);

		let bestPrice = localPrice;
		let bestShard = Game.shard.name;

		if (!localShardMemory || !localShardMemory.markets) { 
			return {price: bestPrice, shard: bestShard} 
		}

		for (let shard in localShardMemory.markets) {
			if (!localShardMemory.markets[shard].buyAvg || !localShardMemory.markets[shard].buyAvg[res]) { continue; }

			let buyAvg = localShardMemory.markets[shard].buyAvg[res];
			
			if (buyAvg.avgPrice > bestPrice) {
				bestShard = shard;
				bestPrice = buyAvg.avgPrice
			}
		}

		return {price: bestPrice, shard: bestShard}
	}

	//	interShardLocalPriceBest(409200, RESOURCE_ORGANOID, ORDER_BUY )
	global.interShardLocalPriceBest = function(price, res, type, wantedRatio){

		if (!USE_SHARDS){ return true }

		return true;

		let localShardMemory = getLocalInterShardMemory();
		if (!localShardMemory || !localShardMemory.markets) { return true }

		if (type === ORDER_SELL) {	// i want to buy

			if (!wantedRatio) { wantedRatio = 1.0 }

			for (let shard in localShardMemory.markets) {
				if (!localShardMemory.markets[shard].sellAvg || !localShardMemory.markets[shard].sellAvg[res]) { continue; }

				let sellAvg = localShardMemory.markets[shard].sellAvg[res];
				let ratio = price / sellAvg.avgPrice;
				if (ratio >= wantedRatio) { 
					return false;
				}
			}

		} else if  (type === ORDER_BUY) {	// i want to sell

			if (!wantedRatio) { wantedRatio = 1.0 }

			for (let shard in localShardMemory.markets) {
				if (!localShardMemory.markets[shard].buyAvg || !localShardMemory.markets[shard].buyAvg[res]) { continue; }

				let buyAvg = localShardMemory.markets[shard].buyAvg[res];
				let ratio = price / buyAvg.avgPrice;
				if (ratio < wantedRatio) {
					return false;
				}
			}

		}

		return true;
	}
	
	global.marketMineralSensiblePrice = function(price, res, type, wantedRatio) {
		let sellAvg = Memory.market.sell[res];
		let buyAvg = Memory.market.buy[res];
	//	console.log("marketMineralSensiblePrice " + res + " type " + type + " price " + price)
		// NOT ENOUGH DATA

		if (COMMODITIES[res] && !BASE_MINERALS_OBJECT[res]) {
			if (!buyAvg || buyAvg.samples < 10
				) {
				console.log("marketMineralSensiblePrice returning false, not enough market data for " + res + " " +type );	
				return false;
			}
		} else {
			if (!sellAvg || sellAvg.samples < 10 || 
				!buyAvg || buyAvg.samples < 10
				) {
				console.log("marketMineralSensiblePrice returning false, not enough market data for " + res + " " +type );	
				return false;
			}
		}
		
		let ratio
		if (type === ORDER_SELL) {
			// CURRENT PRICE FAIR?
			
			if (!wantedRatio) { wantedRatio = 1.1 }

			ratio = price / sellAvg.avgPrice;
		//	console.log("marketMineralSensiblePrice fair price " +  
			if (ratio > wantedRatio) { 
			//	console.log("marketMineralSensiblePrice returning false for "+res+", price above average. ratio " + ratio.toFixed(2) + " current price " + price.toFixed(3) + " average price " + sellAvg.avgPrice.toFixed(3));	
				return false;
			}

		} else if (type === ORDER_BUY) {
			// CURRENT PRICE FAIR?
			
			if (!wantedRatio) { wantedRatio = 0.9 }

			ratio = price / buyAvg.avgPrice;
			if (ratio < wantedRatio) {
			//	console.log("marketMineralSensiblePrice returning false for "+res+", price below average. ratio " + ratio.toFixed(2) + " current price " + price.toFixed(3) + " average price " + buyAvg.avgPrice.toFixed(3));	
				return false; 
			}
		}
		return true;
	};	
}
