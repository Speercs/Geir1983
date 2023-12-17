/* exported EXPORTED_LIB */

module.exports = function() {
	
	// DEBUG FLAG
	global.DEBUG = false;

	global.SEGMENT_ALL_ROOM_OOB = "OOB"; //CONTAINS INFORMATION ON WHICH TILES ARE OUTSIDE THE ROOM RAMPARTS

	if (!Memory.username) {
		const struc = _.find(Game.structures);
		const creep = _.find(Game.creeps);
		Memory.username = (struc ? struc.owner.username : false) || (creep ? creep.owner.username : false);
	}

	

	global.ECONOMY_CRASHED = 0;
	global.ECONOMY_LOW = 1;
	global.ECONOMY_DEVELOPING = 2;
	global.ECONOMY_STABLE = 3;
	global.ECONOMY_RICH = 4;
	global.ECONOMY_SURPLUS = 5;

	global.CPU_SAVING_NONE = 0;
	global.CPU_SAVING_LOW = 1;
	global.CPU_SAVING_MEDIUM = 2;
	global.CPU_SAVING_HIGH = 3;
	if (Memory.cpuSaving === undefined) {Memory.cpuSaving = CPU_SAVING_NONE; }
	
	global.ECO_MODE = 0;
	global.WALL_HP_SETPOINT_START = {2: 15000, 3: 30000, 4: 50000, 5: 75000, 6: 150000, 7: 500000, 8: 1000000};
	global.WALL_HP_SETPOINT_NORMAL = {2: 25000, 3: 75000, 4: 125000, 5: 500000, 6: 750000, 7: 2000000, 8: 12500000};
	
	
	if (Memory.myRoomHighPRCL !== undefined && Memory.myRoomHighPRCL < 8) {
		WALL_HP_SETPOINT = WALL_HP_SETPOINT_START;
	} else {
		WALL_HP_SETPOINT = WALL_HP_SETPOINT_NORMAL;
	}

	global.RAMPART_PRIMARY = 0;
	global.RAMPART_SECONDARY = 1;
	global.RAMPART_STRUCTURE = 2;

	global.RAMPART_HP = {
		[RAMPART_PRIMARY]: 1,
		[RAMPART_SECONDARY]: 6,
		[RAMPART_STRUCTURE]: 1,
	}

	global.RAMPART_SECOND_LAYER_HP_RATIO = 1/6;
	global.RAMPART_STRUCTURE_HP_RATIO = 1;

	global.CURRENT_ROOMPLANNER_VERSION = "3.0.79"

	global.CONTROLLER_MAX_LEVEL = 8;

	global.ENABLE_FACTORIES = typeof STRUCTURE_FACTORY !== 'undefined';
	global.ENABLE_PIXEL_GENERATION = false;

	global.ENABLE_ENERGY_PROFILING = false;

	global.T3_TOUGH = "XGHO2";
	global.T3_ATTACK = "XUH2O";
	global.T2_ATTACK = "UH2O";
	global.T1_ATTACK = "UH";
	global.T3_HEAL = "XLHO2";
	global.T3_MOVE = "XZHO2";
	global.T3_CARRY = "XKH2O";	
	global.T3_RANGED_ATTACK = "XKHO2";
	global.T3_UPGRADE_CONTROLLER = "XGH2O";
	global.T3_DISMANTLE = "XZH2O";
	global.T3_BUILD = "XLH2O";
	global.T3_HARVEST = "XUHO2";

	
	global.simpleAlliesList = [];
	global.specialWhitelist = {};

	global.BOOST_STOCK = 16666;
	global.DISABLED_TERMINAL = false;
	global.DISABLED_MARKET = false;
	global.SEASONAL_SCORE = false; 		// Season 1
	global.SEASONAL_SYMBOLS = false;	// Season 2
	global.SEASONAL_COMMS = false;		// Season 4
	global.SAFE_COMMS_HW = {}			// Season 4
	global.SEASONAL_THORIUM = false;		// Season 5
	global.HARVEST_THORIUM = false;


	global.ALLOW_SCORE = {};
	global.HIGHWAY_WALLS = false;	// EACH SECTOR SEPARATED BY HUGE WALLS IN HIGHWAYS (SESASON 2)
	global.HW_TUNNELS = {};
	global.MINERAL_SHARERERS = {};

	global.BUY_MINERAL_BELOW = 7500; // KEEP STOCK AT THIS MINIMUM IN EACH ROOM WITH LABS
	global.SELL_MINERAL_ABOVE = 25000; // START SELLING IF GLOBAL STOCK IS MORE THAN THIS (MULTIPLIED WITH NUMBER OF ROOMS WITH LABS)
	global.MINERAL_MIN_AMOUNT_STORED = 7500; // DONT SELL IF THE ROOM HAS LESS THAN THIS
	global.MINERAL_MIN_SEND = 500;
	global.ENERGYSHARE_GCL_MINSTORED = 150000; // MINIMUM STORED ENERGY BEFORE SENDING TO GCL PRAISER

	global.TARGET_POWER = 30000;

	global.EXPANSION_WANTED_RANGE = 5; // inclues start/end room


	global.ENABLE_STORAGE_BLOCK = false;
	global.ENABLE_SOURCE_EXTENSIONS = false;
	global.ENABLE_SPAWN_EXTENSIONS = false;
	global.ENABLE_DYNAMIC_LABS = false;

	global.myShards = [];
	global.expansionTargets =  {};
	global.PUSH_RCL_TARGETS = {};
	global.PRAISE_GCL_ROOMS = {}; // CONTINOUSLY UNCLAIMED/CLAIMED ONCE FULL ENERGY AND RCL 8 
	global.ABANDON_SHIP = {};
	global.excludeMiningRoomsList = {};
	global.excludePbRoomsList = {};
	global.blackList = {};
	global.ENERGYSHARE_ALLIES = {};
	global.SEND_ONE_TIME = { // WILL SEND THIS AMOUNT OF RESOURCE TO AN ALLY
		//	E18S32	: { XKHO2 : 150000, XLHO2: 150000 }	// likeafox
	}; 

	global.AVOID = {	// Dont attack
		[Memory.username]: {},
	};
	
	global.ALLIES = {	// Friendlies
		[Memory.username]: {},
	};

	global.exportRoom = {};

	global.BOT_MODE = 1; // AUTO EXPAND ETC	
	global.SWC_MODE = 0;
	global.HALT_GCL_PRAISE = false;
	global.SEASONAL_PASSIVE_MODE = false; // reduce auto attacks

	global.HARVEST_DEPOSITS = true;
	global.MY_SECTORS = {};
	global.AVOID_SECTORS = {};
	global.DEPOSIT_MIN_PRCL = 8;
	global.DEPOSIT_MAX_CD_SPAWN = 30;
	global.DEPOSIT_MAX_CD_SPAWN_MY_SECTOR = 50;
	global.REQ_ECON_DEPOSITS = ECONOMY_DEVELOPING;
	global.HARVEST_POWERBANKS = true;
	global.POWERBANK_MIN_PRCL = 8;
	global.SPAWN_POWER_CREEPS = true;
	global.MAX_GPL = Infinity; // Max global power level

	global.MAX_FACTORY_LEVEL = 5;
	global.MIN_OPS_FACTORY_OPERATE = 2500;
	global.MIN_OPS_REFILL_EXTENSIONS = 4000;

	global.SK_MINERAL_MIN_PRCL = 6;	// Harvest minerals in sk's i dont mine

	global.AUTO_BUILD_WALL_LAYER2 = false;


	
	global.alliedComList = []; // YP Comms

	global.signText = "Claimed by " + Memory.username;
	global.AVOID_CLAIM_DISTANCE = 7;	

	if (Game.shard.name === "shard1") {	

		global.ENABLE_PIXEL_GENERATION = typeof Game.cpu.generatePixel === 'function';

		/*
		expansionTargets["E9N11"] = {
			shard: "shard2"
		};
		*/

		global.BOT_MODE = 0; 
		global.MIN_CREDITS_BALANCE = 200000000;
		global.signText = "[Ypsilon Pact] Claimed by " + Memory.username + ", beware of creeps";
		global.MIN_SOURCE_INCOME = 4.9; // DO NOT ASSIGN SOURCES WITH LESS THAN THIS [ENERGY / TICK]

		global.myShards = ["shard2"]
		global.exportRoom = {
			E9N9: {
				shard2:{
					E9N11: {}
				}
				
			},
		}

		global.SEND_ONE_TIME =  { // WILL SEND THIS AMOUNT OF RESOURCE TO AN ALLY
		//	E13S16  : { XKHO2 : 150000 }	// admon
		//	E11S23  : { XKHO2 : 150000 }	// solace
		//	E18S32	: { XKHO2 : 150000, XLHO2: 150000 }	// likeafox
		};

		global.excludeMiningRoomsList = { 	
			E1N6: {}, // Total base
			E4S2: {}, // 								 
			E8N9: {}, 
			E8N1: {}, 		 
			E3N9: {},
			E11N3: {}, 
			E5S4: {}, // E5S3 remote
			E5S5: {}, // E5S3 remote
			E6S4: {}, // E5S3 remote							
			E13N13: {}, // E13N14 remote
			E16N15: {},  // E18N15 remote
			E21N18: {},  // E19N18 remote		
						   
			E13S17: {}, // Battleroom
			E14S16: {}, 

			W3N15 : {}, // Total request	
		};

		global.ENERGYSHARE_ALLIES = {	// WHO TO SEND TO 
		//	E18S6: {} // DoctorPC
		};	
		
		global.AVOID_CLAIM_DISTANCE = 6;
		global.AVOID = {
			[Memory.username]: {},
			['DKPlugins']: {},
			['o4kapuk']: {},
			['Jumpp']: {},			
			['6g3y']: {},	
			['RavenX8']: {},	
			['slyly']: {},				
			['Jode']: {},
			['curzonj']: {},
			['slyly']: {},
			
		}

		
		

		global.ALLIES = {
			[Memory.username]: {},
			['Issacar']: {},
			['W4rl0ck']: {},
			['Totalschaden']: {}, 
			['NobodysNightmare']: {}, 
			['Yilmas']: {}, 
			['DoctorPC']: {}, 
			['cazantyl']: {}, 
			['TuN9aN0']: {}, 
			['Komir']: {},
			['Baj']: {},
			['likeafox']: {}, 
			['Plemenit']: {},
			['adammada']: {},
			['Orlet']: {},
			['admon']: {},
			['Zolcsika']: {},
			['Solace']: {},
			['tron']: {},
			['Tijnoz']: {}
		};

		global.excludePbRoomsList =  {	
			
			E10N36 : {},
			E10N37: {},
			E10N38: {},
			E10N39: {},
			E10N40: {},
	
			// JUMPP
			E15N30: {},
			E16N30: {},
			E17N30: {},
			E18N30: {},
			E19N30: {},
			E20N30: {},
	
			E20N25: {},
			E20N26: {},
			E20N27: {},
			E20N28: {},
			E20N29: {},
		};	

		// Allows whitelisting in specific rooms only
		global.specialWhitelist = {
			['W2N1'] : {
				['o4kapuk'] : {},
			},
			['E20N10'] : {
				['6g3y'] : {},
			},
			['E20N9'] : {
				['6g3y'] : {},
			},
			['E10N10'] : {
				['6g3y'] : {},
			},
			['E10N9'] : {
				['6g3y'] : {},
			},
			['E11N10'] : {
				['6g3y'] : {},
			},


		};

		global.alliedComList = [
			['Issacar', 99],
			['likeafox', 99],
		//	['Lolzor', 99],
			['W4rl0ck', 99],
		//	['TuN9aN0',99],
			['admon',99],
			['NobodysNightmare',98],
		];

		global.blackList = {
			['0xDEADFEED']: {},
			['Tigga']: {},
			['RayAidas']: {},
			['_GrimReaper']: {},
			['JohnShadow']: {},
			['jacobplaysgames']: {},
			['slowmotionghost']: {},
		}

		global.T3_BOOSTS_GLOABL_SETPOINT = {	// DO NOT PRODUCE MORE THAN THIS GLOBALY
			XKH2O : 100000, 	// CARRY
			XUHO2 : 25000,		// HARVEST
		};

	
	} else if (Game.shard.name === "shard2") {

		// SHARD 2	
		global.BOT_MODE = 0; 
		global.MIN_CREDITS_BALANCE = 200000000;

		global.HARVEST_DEPOSITS = false;
		global.HARVEST_POWERBANKS = false;

		global.myShards = ["shard1"];
		global.exportRoom = {
			E9N11: {
				shard1:{
					E9N9: {}
				}				
			},
		}

		global.AVOID = {	
			[Memory.username]: {},
			['6g3y']: {},
		}

		global.signText = "Claimed by " + Memory.username;

		global.MIN_SOURCE_INCOME = 5.0; // DO NOT ASSIGN SOURCES WITH LESS THAN THIS [ENERGY / TICK]

		global.ENABLE_SOURCE_EXTENSIONS = true;
		global.ENABLE_SPAWN_EXTENSIONS = true;

		global.T3_BOOSTS_GLOABL_SETPOINT = {	// DO NOT PRODUCE MORE THAN THIS GLOBALY
			XKH2O : 0, 		// CARRY
			XUHO2 : 0,		// HARVEST
		};

		global.excludeMiningRoomsList = { 	
			E8N11 : {},
			E8N12 : {},
		},


		global.excludePbRoomsList =  {	

		}

		
	
	} else if (Game.shard.name === "shardSeason" || Game.shard.name === "screepsplus-hosting-geir1983") {	

		// SEASONAL SERVERS
		global.ENABLE_SOURCE_EXTENSIONS = true;
		global.ENABLE_SPAWN_EXTENSIONS = true;
		
		global.AUTO_BUILD_WALL_LAYER2 = false;

		global.DISABLED_MARKET = true;

		global.SEASONAL_SCORE = typeof RESOURCE_SCORE !== 'undefined';			// season 1
		global.SEASONAL_SYMBOLS = typeof FIND_SYMBOL_DECODERS !== 'undefined';	// season 2
																				// season 3
		global.SEASONAL_COMMS = false;											// season 4
		global.SEASONAL_THORIUM = typeof RESOURCE_THORIUM !== 'undefined';		// season 5

		global.HARVEST_THORIUM = true;

		global.ENABLE_ENERGY_PROFILING = true;

		global.SEASONAL_PASSIVE_MODE = true;

		// Power Banks
		global.HARVEST_POWERBANKS = true;
		global.POWERBANK_MIN_PRCL = 8;
		global.TARGET_POWER = 5000;
		global.MAX_GPL = 32;

		// Factories
		global.MIN_OPS_FACTORY_OPERATE = 5000;
		global.MAX_FACTORY_LEVEL = 5;
		

		// Deposits
		global.HARVEST_DEPOSITS = false;
		global.DEPOSIT_MIN_PRCL = 7;
		global.DEPOSIT_MAX_CD_SPAWN = 40;
		global.DEPOSIT_MAX_CD_SPAWN_MY_SECTOR = 60;

		global.MY_SECTORS = {
			E15S15: {},
			E15S25: {},
			E25S25: {}
		}

		global.AVOID_SECTORS = {
			E15S5: {},	// ganyu
			E25S5: {}, // ganyu
			E5S5: {}, // ganyu

			E5S5: {},	//ankleton
			E5S25: {}, // earwig

			E15S35: {},
			E35S15: {},

		}

		global.excludeMiningRoomsList = { 
			E25S15: {}
		}

		
		global.HALT_GCL_PRAISE = true;	// halt praise at rcl 8

		global.SK_MINERAL_MIN_PRCL = 7;

	//	global.EXPANSION_WANTED_RANGE = 8

	//	global.DISABLED_TERMINAL = true;
		
		global.HIGHWAY_WALLS = false;
		global.SELL_MINERAL_ABOVE = 50000;



		global.SAFE_COMMS_HW = {
			/*
			W0S30: {},
			W0S20: {},
			*/
		}

		global.HW_TUNNELS = {
			/*
			E20N0: { // To w4rl0ck
				E25N5: {
					pos : "34:11"
				}, 
				E15N5: {
					pos : "18:11"
				},
			},*/
			
		}

		global.WALL_HP_SETPOINT_NORMAL = {2: 25000, 3: 75000, 4: 150000, 5: 250000, 6: 350000, 7: 550000, 8: 6000000};

		global.MIN_CREDITS_BALANCE = 1;		
		global.MIN_SOURCE_INCOME = 3.5; // DO NOT ASSIGN SOURCES WITH LESS THAN THIS [ENERGY / TICK]

		global.SEND_ONE_TIME =  {

		};
		
		global.MINERAL_SHARERERS = {
		}
		
		global.ALLIES = {
			[Memory.username]: {},
		};

		global.AVOID = {
		}

		global.ALLOW_SCORE = {
			['Yoner'] : {
				allowedRooms : {
					E25S15 : {},
				}
			},
		}

		global.specialWhitelist = {
			['E25S15'] : {
				['Yoner'] : {},
			},
			
		}
		
		global.blackList = {
			['Tigga']: {},
		}

		global.T3_BOOSTS_GLOABL_SETPOINT = {	// DO NOT PRODUCE MORE THAN THIS GLOBALY
			XKH2O : 0, 		// CARRY
			XUHO2 : 0,		// HARVEST
			XGH2O : 0, 		// T3_UPGRADE_CONTROLLER
			
		}; 

	} else if (Game.shard.name === "swc") {		

		global.ENABLE_ENERGY_PROFILING = true;

		global.SWC_MODE = 1;
		global.MIN_CREDITS_BALANCE = 1;
		global.MIN_SOURCE_INCOME = 5.0; // DO NOT ASSIGN SOURCES WITH LESS THAN THIS [ENERGY / TICK]

		global.HARVEST_POWERBANKS = false;		

		global.SEND_ONE_TIME =  {
		//	E2S2 : {energy: 30000}
		//	E9S7 : { XUH2O: 15000, XKHO2: 15000, XLH2O: 10000, XLHO2: 10000, XZH2O: 15000, XZHO2: 10000, XGHO2: 15000 }	// swc o4p
		//	E4S19 : { O: 40000}	// swc Tigga
		};
				
		global.ALLIES = {
			[Memory.username]: {},
		};

		// SWC Comms
		global.simpleAlliesList = [
		//	"Tigga",
		];

		global.T3_BOOSTS_GLOABL_SETPOINT = {	// DO NOT PRODUCE MORE THAN THIS GLOBALY
			XKH2O : 0, 		// CARRY
			XUHO2 : 0,		// HARVEST
			XGH2O : 0, 		// T3_UPGRADE_CONTROLLER
			XZH2O : 0,		// DISMANTLE
		};

		
	} else if (Game.shard.name === "ecoscreeps") {	
		
		global.ECO_MODE = 1;

		global.WALL_HP_SETPOINT_START = {2: 15000, 3: 40000, 4: 75000, 5: 150000, 6: 200000, 7: 250000, 8: 300000};
		global.WALL_HP_SETPOINT = {2: 15000, 3: 40000, 4: 75000, 5: 150000, 6: 200000, 7: 250000, 8: 300000};

		global.MIN_CREDITS_BALANCE = 1;
		global.MIN_SOURCE_INCOME = 2.5; // DO NOT ASSIGN SOURCES WITH LESS THAN THIS [ENERGY / TICK]

		global.T3_BOOSTS_GLOABL_SETPOINT = {	// DO NOT PRODUCE MORE THAN THIS GLOBALY
			XKH2O : 0, 		// CARRY
			XUHO2 : 0,		// HARVEST
			XGH2O : 0, 		// T3_UPGRADE_CONTROLLER
			XLH2O : 0, 		// BUILD
			XZH2O : 0,		// DISMANTLE
		};
	
	} else {			// BOT ARENA OR PS ?

		global.SEASONAL_THORIUM = typeof RESOURCE_THORIUM !== 'undefined';		// season 5

		global.ENABLE_ENERGY_PROFILING = true;

		global.ENABLE_SOURCE_EXTENSIONS = true;
		global.ENABLE_SPAWN_EXTENSIONS = true;
		global.ENABLE_DYNAMIC_LABS = true;

		global.HARVEST_POWERBANKS = false;
		global.POWERBANK_MIN_PRCL = 7;
		global.TARGET_POWER = 15000;
		global.SPAWN_POWER_CREEPS = true;
		
		global.POWER_CREEP_MAX_LEVEL = 25;

		global.HARVEST_THORIUM = true;

		global.HARVEST_DEPOSITS = false;
		global.DEPOSIT_MIN_PRCL = 7;

		global.SK_MINERAL_MIN_PRCL = 7;

		global.MIN_CREDITS_BALANCE = 1;	
		global.MIN_SOURCE_INCOME = 2.5; // DO NOT ASSIGN SOURCES WITH LESS THAN THIS [ENERGY / TICK]
		
		global.T3_BOOSTS_GLOABL_SETPOINT = {	// DO NOT PRODUCE MORE THAN THIS GLOBALY
			XKH2O : 0, 		// CARRY
			XUHO2 : 0,		// HARVEST
			XGH2O : 0, 		// T3_UPGRADE_CONTROLLER
		//	XLH2O : 0, 		// BUILD
			XZH2O : 0,		// DISMANTLE
		};
	}

	
	global.THORIUM_MIN_EXTRACTOR = 1000; // minimum amount in thorium mine to create an extractor on it
	if (SEASONAL_THORIUM) {
		if (Memory.reactors === undefined) { Memory.reactors = {} }
	}
	
	global.USE_SHARDS = (global.myShards.length >= 1);
		
	global.SAFETY_FACTOR_CREEPSTRENGTH = 1.3;	

	global.T3_BOOST_BUILD_RATIO = {
		[T3_ATTACK] : 1,
		[T3_HEAL] : 1,
		[T3_TOUGH] : 1,
		[T3_MOVE] : 1,
		[T3_RANGED_ATTACK] : 1,
		[T3_DISMANTLE] : 1,
		[T3_BUILD] : 0.5,
		[T3_UPGRADE_CONTROLLER] : 0.5,
		[T3_CARRY] : 0.0,
		[T3_HARVEST] : 0.0,
	}

	global.BOOST_TIERS = [0, 1, 2, 3];
	
	
	global.T3_BASICBOOSTS = {
		UH: 3000, // T1 ATTACK
		XUH2O : 3000, // ATTACK
		XLHO2 : 3000, // HEAL
		
		XZHO2 : 3000,  // MOVE
		XGHO2 : 3000, // TOUGH
	};

	global.T3_POWERBOOSTS = {		
		[T3_ATTACK] : 10000,
		[T3_HEAL] : 10000,
		[T3_TOUGH] : 10000,
		[T3_MOVE] : 10000,  
		[T3_RANGED_ATTACK] : 10000,
		[T3_BUILD] : 10000,
		[RESOURCE_OPS] : 15000,
		[T3_UPGRADE_CONTROLLER] : 3000, // temp?
	};
	
	// AI.BUILDER
	global.BUILDER_ROADS_BUILDMAX = 8; //CHECK THIS MANY ROADS EACH CYCLE
	global.ROAD_REBUILD_TIMER = 15000; //RECALCULATE ALL ROADS AFTER THIS TIME
	
	global.STRONGHOLD_POPULATION = {
		["0"]: 0,
		["1"]: 0,
		["2"]: 1,
		["3"]: 2,
		["4"]: 4,
		["5"]: 8,
	}
	
	// ENERGYSHARE
	global.HIGH_ENERGY_MULIPLIER = 1.0; // IF ROOM HAS MORE THAN THIS*AVERAGE ENERGY, IT IS MARKED FOR SHARING ENERGY
	global.SHARE_ABOVE = 250000; // IF ROOM ENERGY HIGHER THAN THIS ITS MARKED FOR SHARING ENERGY
	global.LOW_ENERGY_MULIPLIER = 0.6; // IF ROOM HAS LESS THAN THIS*AVERAGE ENERGY, IT IS MARKED FOR RECIEVING ENERGY
	global.LOW_ENERGY_RCL8_MULIPLIER = 0.6; // IF ROOM HAS LESS THAN THIS*AVERAGE ENERGY AND IS RCL8, IT IS MARKED FOR RECIEVING ENERGY
	global.ENERGYSHARE_SEND_AMOUNT = 4000; // SEND MAX THIS MUCH EACH CYCLE
	global.TERMINAL_TARGET_ENERGY_SHARE = 15000; // KEEP RESOURCES AT THIS LEVEL IF SHARING
	global.TERMINAL_TARGET_ENERGY_LOW = 5000; // KEEP RESOURCES AT THIS LEVEL IF NOT SHARING
	global.TERMINAL_TICKS = 10; // HOW OFTEN TO CALL TERMINALS 
	

//	global.ENERGYSHARE_ALLIES_AMOUNT = 2500 // HOW MUCH TO SEND
	global.ENERGYSHARE_ALLIES_TIMER = 100; // SEND EVERY N TICK
	// WALL HP
	global.WALL_HP_WINDOW = 2500000; // IF ROOM HAS AVG WALL HP LESS THAN THE ROOM WITH LOWEST WALL + THIS VALUE IT WILL UPGRADE THE WALLS
	// SOURCE KEEPER
	global.SOURCE_KEEPER_DROP_ENERGY = 650;	// AMOUNT OF ENERGY DROPPED BY A KILLED SK	
	
//	Memory.friendSupply = {room: 'E83S75', amount: 10000, resourceType: 'XZHO2'};

	// ROAD CREATION
	global.ROAD_SWAMPCOST = 11;
	global.ROAD_PLAINCOST = 7;
	global.ROAD_SWAMP_INCREASE = ROAD_SWAMPCOST - ROAD_PLAINCOST;
	global.ROAD_ROADPLAN_DECREASE = -2;
	global.ROAD_ROAD_DECREASE = -1;

	// MINERALS	
	global.SELL_ONLY_TO_NPC = false; // MAKE SURE TO ONLY SELL TO NPC's	
	
	// BOOSTS
	global.MIN_T3_COMBAT_BOOSTS = 3500; // MAKE SURE A ROOM WITH COMBAT BOOSTING ACTIVE HAVE ATLEAST THIS MUCH BOOSTS

	global.BODYPART_FROM_BOOST = { 
		XGHO2: TOUGH, GHO2: TOUGH, GO:TOUGH, 
		XZHO2: MOVE, ZHO2: MOVE, ZO: MOVE, 
		XKH2O: CARRY, KH2O: CARRY, KH: CARRY, 
		XLHO2: HEAL, LHO2: HEAL, LO: HEAL,
		XKHO2: RANGED_ATTACK, KHO2: RANGED_ATTACK, KO: RANGED_ATTACK, 
		XUH2O: ATTACK, UH2O: ATTACK, UH: ATTACK, 
		XGH2O: WORK, GH2O: WORK, GH: WORK, // UPGRADE CONTROLLER
		XZH2O: WORK, ZH2O: WORK, ZH: WORK, // DISMANTLE
		XLH2O: WORK, LH2O: WORK, LH: WORK, // BUILD + REPAIR
		XUHO2: WORK, UHO2: WORK, UO: WORK, // HARVEST	
	};

	global.DISMANTLE = "dismantle";
	global.BUILD = "build";
	global.REPAIR = "build";	// same as build
	global.HARVEST = "harvest";
	global.CARRY = "carry";
	global.UPGRADE = "upgrade";

	global.BOOST_LEVEL = { 
		[ATTACK]: [RESOURCE_UTRIUM_HYDRIDE, RESOURCE_UTRIUM_ACID, RESOURCE_CATALYZED_UTRIUM_ACID],
		[MOVE]: [RESOURCE_ZYNTHIUM_OXIDE, RESOURCE_ZYNTHIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE],
		[HEAL]: [RESOURCE_LEMERGIUM_OXIDE, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE],
		[RANGED_ATTACK]: [RESOURCE_KEANIUM_OXIDE, RESOURCE_KEANIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ALKALIDE],		
		[TOUGH]: [RESOURCE_GHODIUM_OXIDE, RESOURCE_GHODIUM_ALKALIDE, RESOURCE_CATALYZED_GHODIUM_ALKALIDE],
		[BUILD]: [RESOURCE_LEMERGIUM_HYDRIDE, RESOURCE_LEMERGIUM_ACID, RESOURCE_CATALYZED_LEMERGIUM_ACID],
		[REPAIR]: [RESOURCE_LEMERGIUM_HYDRIDE, RESOURCE_LEMERGIUM_ACID, RESOURCE_CATALYZED_LEMERGIUM_ACID],
		[DISMANTLE]: [RESOURCE_ZYNTHIUM_HYDRIDE, RESOURCE_ZYNTHIUM_ACID, RESOURCE_CATALYZED_ZYNTHIUM_ACID],
		[HARVEST]: [RESOURCE_UTRIUM_OXIDE, RESOURCE_UTRIUM_ALKALIDE, RESOURCE_CATALYZED_UTRIUM_ALKALIDE],
		[CARRY]: [RESOURCE_KEANIUM_HYDRIDE, RESOURCE_KEANIUM_ACID, RESOURCE_CATALYZED_KEANIUM_ACID],
		[UPGRADE]: [RESOURCE_GHODIUM_HYDRIDE, RESOURCE_GHODIUM_ACID, RESOURCE_CATALYZED_GHODIUM_ACID],		
	}

	global.T3_BOOSTS = [T3_ATTACK, T3_TOUGH, T3_HEAL, T3_MOVE, T3_DISMANTLE, T3_RANGED_ATTACK, T3_UPGRADE_CONTROLLER, T3_BUILD, T3_CARRY, T3_HARVEST];
	global.T2_BOOSTS = ["UH2O", "UHO2", "ZH2O", "ZHO2", "KH2O", "KHO2", "LH2O", "LHO2", "GH2O", "GHO2"];
	global.T3_COMBAT_BOOSTS = [T3_ATTACK, T3_TOUGH, T3_HEAL, T3_MOVE, T3_DISMANTLE, T3_RANGED_ATTACK, T3_BUILD];
	global.T3_WANTED_BOOSTS_OBJECT = {[T3_ATTACK]: {}, [T3_TOUGH]: {}, [T3_HEAL]: {}, [T3_MOVE]: {}, [T3_DISMANTLE]: {}, [T3_RANGED_ATTACK]: {}, [T3_BUILD]: {}, [T3_UPGRADE_CONTROLLER]: {} };
	global.T3_BOOSTS_OBJECT = {XGHO2: {}, XZHO2: {}, XKH2O: {}, XLHO2: {}, XKHO2: {}, XUH2O: {}, XGH2O: {}, XZH2O: {}, XLH2O: {}, XUHO2: {} }; 
	global.BASE_MINERALS_OBJECT = {H: {}, O: {}, X: {}, U: {}, L: {}, K: {}, Z: {}, power: {} };
	global.BASE_MINERALS_OBJECT_CRANE = {H: {}, O: {}, X: {}, U: {}, L: {}, K: {}, Z: {}, power: {}, [RESOURCE_GHODIUM]: {} };
	global.HIGHWAY_MINERAL = { [RESOURCE_SILICON]: { T0: [RESOURCE_WIRE] }, [RESOURCE_METAL]: {T0: [RESOURCE_ALLOY]}, [RESOURCE_BIOMASS]: {T0: [RESOURCE_CELL]}, [RESOURCE_MIST]: {T0: [RESOURCE_CONDENSATE]}, }	
	
	global.COMPRESSED_RESOURCE = {
		[RESOURCE_UTRIUM_BAR]: {raw: RESOURCE_UTRIUM}, 
		[RESOURCE_LEMERGIUM_BAR] : {raw: RESOURCE_LEMERGIUM},
		[RESOURCE_ZYNTHIUM_BAR] : {raw: RESOURCE_ZYNTHIUM},
		[RESOURCE_KEANIUM_BAR] : {raw: RESOURCE_KEANIUM},
		[RESOURCE_GHODIUM_MELT] : {raw: RESOURCE_GHODIUM},
		[RESOURCE_OXIDANT] : {raw: RESOURCE_OXYGEN},
		[RESOURCE_REDUCTANT] : {raw: RESOURCE_HYDROGEN},
		[RESOURCE_PURIFIER] : {raw: RESOURCE_CATALYST},
		[RESOURCE_BATTERY] : {raw: RESOURCE_ENERGY},
	}

	global.COMPRESSED_RESOURCE_FROM_RAW = {
		[RESOURCE_UTRIUM]: {raw: RESOURCE_UTRIUM_BAR}, 
		[RESOURCE_LEMERGIUM] : {raw: RESOURCE_LEMERGIUM_BAR},
		[RESOURCE_ZYNTHIUM] : {raw: RESOURCE_ZYNTHIUM_BAR},
		[RESOURCE_KEANIUM] : {raw: RESOURCE_KEANIUM_BAR},
		[RESOURCE_GHODIUM] : {raw: RESOURCE_GHODIUM_MELT},
		[RESOURCE_OXYGEN] : {raw: RESOURCE_OXIDANT},
		[RESOURCE_HYDROGEN] : {raw: RESOURCE_REDUCTANT},
		[RESOURCE_CATALYST] : {raw: RESOURCE_PURIFIER},
		[RESOURCE_ENERGY] : {raw: RESOURCE_BATTERY},
	}

	global.RAW_MINERALS = {H: {}, O: {}, X: {}, U: {}, L: {}, K: {}, Z: {}, power: {}, [RESOURCE_ENERGY]: {}, [RESOURCE_SILICON]: {}, [RESOURCE_METAL]: {}, [RESOURCE_BIOMASS]: {}, [RESOURCE_MIST]: {} };
	
	global.BASE_MINERALS = [RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_CATALYST, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM, RESOURCE_POWER, RESOURCE_ENERGY];
	global.BASE_MINERALS_ROOMS = [RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_CATALYST, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM];
	global.BASE_MINERALS_SHARE = [RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_CATALYST, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM, RESOURCE_POWER];
	if (SEASONAL_SCORE) { BASE_MINERALS_SHARE.push(RESOURCE_SCORE); }
	global.BASE_MINERALS_FACTORY = {[RESOURCE_HYDROGEN]: {}, [RESOURCE_OXYGEN]: {}, [RESOURCE_CATALYST]: {}, [RESOURCE_UTRIUM]: {}, 
									[RESOURCE_LEMERGIUM]: {}, [RESOURCE_KEANIUM]: {}, [RESOURCE_ENERGY]: {},
									[RESOURCE_ZYNTHIUM]: {}, [RESOURCE_SILICON]: {}, [RESOURCE_METAL]: {}, [RESOURCE_BIOMASS]: {}, [RESOURCE_MIST]: {}, 
									[RESOURCE_UTRIUM_BAR]: {}, [RESOURCE_LEMERGIUM_BAR]: {}, [RESOURCE_ZYNTHIUM_BAR]: {}, [RESOURCE_KEANIUM_BAR]: {}, 
									[RESOURCE_GHODIUM_MELT]: {}, [RESOURCE_OXIDANT]: {}, [RESOURCE_REDUCTANT]: {}, [RESOURCE_PURIFIER]: {} 
	};



	// BASE BLUEPRINTS
	global.BLUEPRINT_OBSERVER = {"name":"observer","rcl":"8","buildings":{"observer":{"pos":[{"x":0,"y":0}]}}};
	global.BLUEPRINT_NUKER = {"name":"nuker","rcl":"8","buildings":{"nuker":{"pos":[{"x":0,"y":0}]}}};
	global.BLUEPRINT_TOWERS = {"name":"towers","rcl":"8","buildings":{"tower":{"pos":[{"x":0,"y":0},{"x":1,"y":0},{"x":0,"y":1},{"x":2,"y":1},{"x":0,"y":2},{"x":1,"y":2}]},"road":{"pos":[{"x":2,"y":0},{"x":1,"y":1},{"x":2,"y":2}]}}};
	global.BLUEPRINT_EXTENSIONS = {"name":"extensions","shard":"shard0","rcl":"8","buildings":{"road":{"pos":[{"x":2,"y":0},{"x":1,"y":1},{"x":3,"y":1},{"x":0,"y":2},{"x":4,"y":2},{"x":1,"y":3},{"x":3,"y":3},{"x":2,"y":4}]},"extension":{"pos":[{"x":2,"y":1},{"x":1,"y":2},{"x":2,"y":2},{"x":3,"y":2},{"x":2,"y":3}]}}};
	global.BLUEPRINT_LABS = {"name":"labs","rcl":"8","buildings":{"road":{"pos":[{"x":0,"y":3},{"x":1,"y":2},{"x":2,"y":1},{"x":3,"y":0}]},"lab":{"pos":[{"x":2,"y":2},{"x":1,"y":1},{"x":1,"y":0},{"x":2,"y":0},{"x":0,"y":1},{"x":3,"y":1},{"x":0,"y":2},{"x":3,"y":2},{"x":1,"y":3},{"x":2,"y":3}]}}};
	global.BLUEPRINT_STORAGE = {"name":"storage","rcl":"8","buildings":{"spawn":{"pos":[{"x":0,"y":0},{"x":2,"y":0},{"x":2,"y":2}]},"storage":{"pos":[{"x":1,"y":0}]},"link":{"pos":[{"x":2,"y":1}]},"powerSpawn":{"pos":[{"x":0,"y":2}]},"terminal":{"pos":[{"x":1,"y":2}]}}}
//	global.BLUEPRINT_STORAGE = {"name":"storage","rcl":"8","buildings":{"spawn":{"pos":[{"x":0,"y":0},{"x":2,"y":0},{"x":2,"y":2}]},"storage":{"pos":[{"x":1,"y":0}]},"link":{"pos":[{"x":2,"y":1}]},"powerSpawn":{"pos":[{"x":0,"y":2}]},"dummy":{"pos":[{"x":1,"y":1}]},"nuker":{"pos":[{"x":0,"y":1}]},"terminal":{"pos":[{"x":1,"y":2}]}}}
	global.BLUEPRINT_STORAGE_BLOCK = {"name":"","rcl":8,"buildings":{"dummy":{"pos":[{"x":1,"y":1}]},"spawn":{"pos":[{"x":0,"y":0},{"x":2,"y":0},{"x":2,"y":2}]},"factory":{"pos":[{"x":1,"y":0}]},"link":{"pos":[{"x":2,"y":1}]},"terminal":{"pos":[{"x":2,"y":2}]},"powerSpawn":{"pos":[{"x":2,"y":0}]},"storage":{"pos":[{"x":1,"y":0}]}}}
	global.BLUEPRINT_STORAGE_EXTENSIONS = {"name":"storageExtension","rcl":8,"buildings":{"spawn":{"pos":[{"x":2,"y":0},{"x":0,"y":2},{"x":2,"y":4}]},"extension":{"pos":[{"x":3,"y":0},{"x":1,"y":0},{"x":0,"y":3},{"x":0,"y":1},{"x":1,"y":2},{"x":2,"y":1},{"x":2,"y":3},{"x":1,"y":4},{"x":3,"y":4},{"x":3,"y":2},{"x":4,"y":2},{"x":4,"y":3},{"x":4,"y":1},{"x":0,"y":4},{"x":0,"y":0},{"x":4,"y":0},{"x":4,"y":4}]},"link":{"pos":[{"x":2,"y":2}]},"container":{"pos":[{"x":1,"y":3},{"x":1,"y":1}]}}}
	global.BLUEPRINT_STORAGE_NOSPAWNS = {"name":"storageNoSpawns","rcl":8,"buildings":{"link":{"pos":[{"x":2,"y":1}]},"storage":{"pos":[{"x":1,"y":0}]},"terminal":{"pos":[{"x":1,"y":2}]},"factory":{"pos":[{"x":0,"y":1}]},"powerSpawn":{"pos":[{"x":0,"y":2}]},"nuker":{"pos":[{"x":2,"y":2}]},"tower":{"pos":[]},"observer":{"pos":[{"x":2,"y":0}]}}}

	global.BLUEPRINT_DISSI_EXT_FLOWER = {"name":"","rcl":8,"buildings":{"spawn":{"pos":[{"x":3,"y":1}]},"extension":{"pos":[{"x":0,"y":1},{"x":1,"y":0},{"x":2,"y":0},{"x":2,"y":1},{"x":0,"y":2},{"x":1,"y":2},{"x":2,"y":3},{"x":1,"y":3},{"x":1,"y":4},{"x":4,"y":1},{"x":4,"y":0},{"x":6,"y":1},{"x":6,"y":2},{"x":5,"y":2},{"x":4,"y":3},{"x":5,"y":3},{"x":0,"y":4},{"x":0,"y":5},{"x":2,"y":5},{"x":3,"y":4},{"x":3,"y":5},{"x":4,"y":5},{"x":4,"y":6},{"x":5,"y":6},{"x":6,"y":5},{"x":2,"y":6},{"x":1,"y":6},{"x":6,"y":4},{"x":5,"y":4},{"x":0,"y":0},{"x":5,"y":0},{"x":6,"y":0},{"x":6,"y":6}]},"link":{"pos":[{"x":3,"y":2}]},"container":{"pos":[{"x":3,"y":3}]},"road":{"pos":[{"x":5,"y":5},{"x":4,"y":4},{"x":3,"y":3},{"x":2,"y":4},{"x":1,"y":5},{"x":2,"y":2},{"x":1,"y":1},{"x":4,"y":2},{"x":5,"y":1},{"x":3,"y":0}]}}}
	global.BLUEPRINT_DISSI_STORE_FLOWER = {"name":"","rcl":8,"buildings":{"spawn":{"pos":[{"x":3,"y":1},{"x":3,"y":5}]},"extension":{"pos":[{"x":1,"y":0},{"x":2,"y":0},{"x":2,"y":1},{"x":5,"y":3},{"x":1,"y":2},{"x":1,"y":3},{"x":2,"y":5},{"x":2,"y":3},{"x":3,"y":4},{"x":4,"y":3},{"x":0,"y":2},{"x":0,"y":1},{"x":1,"y":4},{"x":0,"y":4},{"x":0,"y":5},{"x":2,"y":6},{"x":1,"y":6},{"x":4,"y":1},{"x":4,"y":0},{"x":5,"y":0},{"x":6,"y":2},{"x":6,"y":1},{"x":5,"y":2},{"x":6,"y":0},{"x":0,"y":0},{"x":6,"y":5}]},"link":{"pos":[{"x":3,"y":2},{"x":5,"y":4}]},"storage":{"pos":[{"x":6,"y":4}]},"terminal":{"pos":[{"x":4,"y":6}]},"factory":{"pos":[{"x":4,"y":5}]},"powerSpawn":{"pos":[{"x":5,"y":6}]},"nuker":{"pos":[{"x":6,"y":6}]},"container":{"pos":[{"x":3,"y":3}]},"road":{"pos":[{"x":2,"y":2},{"x":3,"y":3},{"x":4,"y":2},{"x":5,"y":1},{"x":2,"y":4},{"x":1,"y":5},{"x":1,"y":1},{"x":3,"y":0},{"x":4,"y":4},{"x":5,"y":5},{"x":3,"y":6}]}}}
	
//	global.BLUEPRINT_SPAWNER_BLOCK = {"buildings":{"dummy":{"pos":[{"x":1,"y":1},{"x":1,"y":3},{"x":3,"y":1},{"x":3,"y":3}]},"spawn":{"pos":[{"x":2,"y":4},{"x":2,"y":0}]},"container":{"pos":[{"x":0,"y":2},{"x":4,"y":2}]},"extension":{"pos":[{"x":1,"y":2},{"x":2,"y":3},{"x":1,"y":4},{"x":3,"y":2},{"x":3,"y":4},{"x":0,"y":3},{"x":0,"y":4},{"x":4,"y":4},{"x":4,"y":3},{"x":0,"y":1},{"x":4,"y":1},{"x":1,"y":0},{"x":3,"y":0},{"x":4,"y":0},{"x":0,"y":0},{"x":2,"y":1}]},"link":{"pos":[{"x":2,"y":2}]}}}

	global.BLUEPRINT_SPAWNER_BLOCK = {"buildings":{"dummy":{"pos":[{"x":1,"y":1},{"x":1,"y":3},{"x":3,"y":1},{"x":3,"y":3}]},"spawn":{"pos":[{"x":2,"y":4},{"x":2,"y":0}]},"container":{"pos":[{"x":0,"y":2},{"x":4,"y":2}]},"extension":{"pos":[{"x":1,"y":2},{"x":2,"y":3},{"x":1,"y":4},{"x":0,"y":3},{"x":0,"y":4},{"x":3,"y":2},{"x":3,"y":4},{"x":4,"y":4},{"x":4,"y":3},{"x":0,"y":1},{"x":4,"y":1},{"x":1,"y":0},{"x":3,"y":0},{"x":4,"y":0},{"x":0,"y":0},{"x":2,"y":1}]},"link":{"pos":[{"x":2,"y":2}]}}}

	global.BLUEPRINT_STORAGE_BLOCKV2 = {"buildings":{"dummy":{"pos":[{"x":1,"y":1}]},"spawn":{"pos":[{"x":2,"y":0}]},"extension":{"pos":[{"x":1,"y":0}]},"link":{"pos":[{"x":2,"y":1}]},"storage":{"pos":[{"x":0,"y":0}]},"terminal":{"pos":[{"x":2,"y":2}]},"factory":{"pos":[{"x":0,"y":1}]},"powerSpawn":{"pos":[{"x":0,"y":2}]},"nuker":{"pos":[{"x":1,"y":2}]}}}

	global.BAR_PACK_RATIO = 5;
	if (!ENABLE_FACTORIES) {
		global.MARKET_RESOURCES = [
			RESOURCE_ENERGY,
			RESOURCE_POWER,

			RESOURCE_HYDROGEN,
			RESOURCE_OXYGEN,
			RESOURCE_UTRIUM,
			RESOURCE_KEANIUM,
			RESOURCE_LEMERGIUM,
			RESOURCE_ZYNTHIUM,
			RESOURCE_CATALYST,
			RESOURCE_GHODIUM,
			
			RESOURCE_CATALYZED_UTRIUM_ACID,
			RESOURCE_CATALYZED_UTRIUM_ALKALIDE,
			RESOURCE_CATALYZED_KEANIUM_ACID,
			RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
			RESOURCE_CATALYZED_LEMERGIUM_ACID,
			RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
			RESOURCE_CATALYZED_ZYNTHIUM_ACID,
			RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
			RESOURCE_CATALYZED_GHODIUM_ACID,
			RESOURCE_CATALYZED_GHODIUM_ALKALIDE,

			RESOURCE_OPS,
		]
	} else {
		global.MARKET_RESOURCES = [
			RESOURCE_ENERGY,
			RESOURCE_POWER,

			RESOURCE_HYDROGEN,
			RESOURCE_OXYGEN,
			RESOURCE_UTRIUM,
			RESOURCE_KEANIUM,
			RESOURCE_LEMERGIUM,
			RESOURCE_ZYNTHIUM,
			RESOURCE_CATALYST,
			RESOURCE_GHODIUM,
			
			RESOURCE_CATALYZED_UTRIUM_ACID,
			RESOURCE_CATALYZED_UTRIUM_ALKALIDE,
			RESOURCE_CATALYZED_KEANIUM_ACID,
			RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
			RESOURCE_CATALYZED_LEMERGIUM_ACID,
			RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
			RESOURCE_CATALYZED_ZYNTHIUM_ACID,
			RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
			RESOURCE_CATALYZED_GHODIUM_ACID,
			RESOURCE_CATALYZED_GHODIUM_ALKALIDE,

			RESOURCE_OPS,
	
			RESOURCE_SILICON,
			RESOURCE_METAL,
			RESOURCE_BIOMASS,
			RESOURCE_MIST,

			RESOURCE_UTRIUM_BAR,
			RESOURCE_LEMERGIUM_BAR,
			RESOURCE_ZYNTHIUM_BAR,
			RESOURCE_KEANIUM_BAR,
			RESOURCE_GHODIUM_MELT,
			RESOURCE_OXIDANT,
			RESOURCE_REDUCTANT,
			RESOURCE_PURIFIER,
			RESOURCE_BATTERY,
			RESOURCE_COMPOSITE,
			RESOURCE_CRYSTAL,
			RESOURCE_LIQUID,

			RESOURCE_WIRE,
			RESOURCE_SWITCH,
			RESOURCE_TRANSISTOR,
			RESOURCE_MICROCHIP,
			RESOURCE_CIRCUIT,
			RESOURCE_DEVICE,

			RESOURCE_CELL,
			RESOURCE_PHLEGM,
			RESOURCE_TISSUE,
			RESOURCE_MUSCLE,
			RESOURCE_ORGANOID,
			RESOURCE_ORGANISM,

			RESOURCE_ALLOY,
			RESOURCE_TUBE,
			RESOURCE_FIXTURES,
			RESOURCE_FRAME,
			RESOURCE_HYDRAULICS,
			RESOURCE_MACHINE,

			RESOURCE_CONDENSATE,
			RESOURCE_CONCENTRATE,
			RESOURCE_EXTRACT,
			RESOURCE_SPIRIT,
			RESOURCE_EMANATION,
			RESOURCE_ESSENCE,
		
		]
	}

};

/*
	// Give me credits order:
	Game.market.createOrder(ORDER_SELL, 'energy', 6300000, 1, "E9N3");

	// PRIVATE SERVER COMMANDS
	https://wiki.screepspl.us/index.php/Private_Server_Common_Tasks
	storage.setResource(RESOURCE_HYDROGEN, 15000)
	
	coalition.ags131.ovh

	// performance "fix"
	storage.db.rooms.update({ active: true }, { $set: { active: false }} )

	storage.db['users'].find()
	 	my steam id 76561198055224693
	storage.db['users'].update({_id:"<userid>"}, {$set: { steam :{id:'76561197960283374'} }});
	storage.db['users'].update({_id:"613daf13dfadfd2c4c570ac0"}, {$set: { steam :{id:'76561197960283374'} }});
	storage.db['users'].update({_id:"613daf13dfadfd2c4c570ac0"}, {$set: { steam :{id:'1'} }});
	storage.db['users'].update({ username: 'Geir1983' },{ $set: { gcl: 1000000 }})
	storage.db['users'].update({username: 'Geir1983'}, {$set: {power: 100000000}});
	system.resetAllData() 
	setTickRate(50)
	bots.spawn('screeps-bot-tooangel', 'W2N8')
	bots.spawn('screeps-bot-hivemind', 'W5N8')
	bots.spawn('screeps-bot-kasamibot', 'W7N7')
	bots.spawn("GeirBot", "E4N7", { auto: true, username: "GeirBot" })
	storage.db['rooms.objects'].update({ _id: 'idOfController' },{ $set: { level: 8 }})	
	storage.db['rooms.objects'].update({ room: "E4S19", type: 'controller' }, { $set: { level: 8 } })
	storage.db['rooms.objects'].update({ _id: '646e835ab53e047fe1b91eba' },{ $set: { amount: 35000 }})	
	storage.db['rooms.objects'].update({type: "terminal"}, {$set:{ XGHO2: 15000, XZHO2: 15000,XUH2O: 15000, XLHO2: 15000,XKHO2: 15000,XZH2O: 15000,XLH2O: 15000,XGH2O: 15000,}} );
	storage.db['rooms.objects'].update({type: "storage"}, {$set:{ H: 35000, O: 35000, U: 35000, K: 35000, L: 35000, Z: 35000, X: 35000, energy: 500000}} );  
	storage.db['rooms.objects'].update({type: "storage"}, {$set:{ energy: 500000}} );  
	storage.db['rooms.objects'].update({type: "constructionSite"}, {$set:{ progress: 15000}} );  
	storage.db['rooms.objects'].update({type: "container"}, {$set:{ energy: 2000}} ); 
	storage.db['rooms.objects'].update({type: "lab"}, {$set:{ mineralAmount: 0}} );
	storage.db['rooms.objects'].insert({ type: 'terminal', room: 'W0N0', x: 0, y:0 })
	storage.db['rooms.objects'].insert({ type: 'mineral', room: 'E3N9', x: 10, y:12, mineralType: 'H', mineralAmount: '35000' density: 2 })
	storage.db['rooms.objects'].update({type: "source"}, {$set:{effects: {}}});	// remove old effects on imported map

	strongholds.spawn("E6N15", {deployTime: 10, templateName:'bunker4'})

	npx screeps-steamless-client
	http://localhost:8080/(http://localhost:21025)/#!/room/shard0/E7N7
	
	// Setting history slider beyond visible range (always shard 0 for pserver)
	#<script> angular.element("section.console").scope().Console.clear(); window.location.hash = "#!/history/shard0/E3N3?t=4054620"</script>

	<script>angular.element("section.console").scope().Console.clear();window.location.href = "chrome-extension://cknihipnnkgolgdlfodbibfmdmhhbmlb/index.html#!/history/shard0/E2N4?t=750000"</script>
*/


global.getUsed = function() {
	return Game.cpu.getUsed()
}