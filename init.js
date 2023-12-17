


if (Memory.rooms === undefined) { Memory.rooms = {}; }
if (Memory.remoteAttacked ===  undefined) {Memory.remoteAttacked = {}; }
if (Memory.helpNeeded === undefined) {Memory.helpNeeded = {}; }	
if (Memory.expansionTarget ===  undefined)  {Memory.expansionTarget = {}; }	
if (Memory.expansionTargetTimeout ===  undefined)  {Memory.expansionTargetTimeout = {}; }		
if (Memory.PraiseGCL === undefined) { Memory.PraiseGCL = {}; }
if (Memory.controllerAttack === undefined) {Memory.controllerAttack = {}; }
if (Memory.attackTarget === undefined) { Memory.attackTarget = {}; }
if (Memory.evalAttackTarget === undefined) { Memory.evalAttackTarget = {}; }	
if (Memory.combatDeconstruct === undefined) {Memory.combatDeconstruct = {}; }
if (Memory.orderWreckers === undefined) {Memory.orderWreckers = {}; }
if (Memory.combatBoost === undefined) {Memory.combatBoost = {}; }
if (Memory.T3Setpoints === undefined) {Memory.T3Setpoints = {}; }
if (Memory.evalSkMining === undefined) {Memory.evalSkMining = {}; }
if (Memory.enemyCreepsAttacked === undefined) {Memory.enemyCreepsAttacked = {}; }
if (Memory.portals === undefined) {Memory.portals = {}; }
if (Memory.shardPortals === undefined) {Memory.shardPortals = {}; }
if (Memory.nukeLaunches === undefined) {Memory.nukeLaunches = {}; }
if (Memory.nukeRampart === undefined) {Memory.nukeRampart = {}; }
if (Memory.market === undefined) {Memory.market = {}; }
if (Memory.market.sell === undefined) {Memory.market.sell = {}; }
if (Memory.market.buy === undefined) {Memory.market.buy = {}; }
if (Memory.activeMines === undefined) {Memory.activeMines = {}; }
if (Memory.powerBanks === undefined) {Memory.powerBanks = {}; }
if (Memory.caravans === undefined ) { Memory.caravans = {}; }
if (Memory.nukes === undefined ) { Memory.nukes = {}; }
if (Memory.cleanUpRoom === undefined ) { Memory.cleanUpRoom = {}; }
if (Memory.exploded === undefined ) { Memory.exploded = {}; }
if (Memory.claimExplode === undefined ) { Memory.claimExplode = {}; }
if (Memory.ordersHistory === undefined ) { Memory.ordersHistory = {}; }
if (Memory.antiScout === undefined ) { Memory.antiScout = {}; }
if (Memory.enemies === undefined ) { Memory.enemies = {}; }
if (Memory.rage === undefined ) { Memory.rage = {}; }
if (Memory.lootMission === undefined ) { Memory.lootMission = {}; }
if (Memory.deposits === undefined ) { Memory.deposits = {}; }
if (Memory.factories === undefined ) { Memory.factories = {}; }
if (Memory.players === undefined) { Memory.players = {}; }
if (Memory.energyCartTargets === undefined) { Memory.energyCartTargets = {}; }
if (Memory.pita === undefined) { Memory.pita = {}; }
if (Memory.naughty === undefined) { Memory.naughty = {}; }
if (Memory.invalidBase === undefined) { Memory.invalidBase = {}; }
if (Memory.iCore === undefined) { Memory.iCore = {}; }
if (Memory.caravans === undefined) { Memory.caravans = {}; }
if (Memory.score === undefined) { Memory.score = {}; }
if (Memory.scoreCollector === undefined) { Memory.scoreCollector = {}; }
if (Memory.export === undefined) { Memory.export = {}; }
if (Memory.import === undefined) { Memory.import = {}; }
if (Memory.pcLevels === undefined) { Memory.pcLevels = {}; }
if (Memory.scoutObservers === undefined) { Memory.scoutObservers = {}; }
if (Memory.myCreepNameCounter === undefined) { Memory.myCreepNameCounter = 0; }
if (Memory.coreSniper === undefined) { Memory.coreSniper = {} }
if (Memory.assistedMine === undefined) { Memory.assistedMine = {} }
if (Memory.assistedLeveling === undefined) { Memory.assistedLeveling = {} }
if (Memory.withdraw === undefined) { Memory.withdraw = {} }
if (Memory.deliver === undefined) { Memory.deliver = {} }


if (global.hostileTracker === undefined) { global.hostileTracker = {}; }
if (global.stats === undefined) { global.stats = {}; }
if (global.temp === undefined) { global.temp = {}; }
if (global.stats.cpu === undefined) { global.stats.cpu = {}; }
if (global.cranePos === undefined) { global.cranePos = {}; }
if (global.roomLinearDistance === undefined) {global.roomLinearDistance = {}; }
if (global.mapCloseDistance === undefined) {global.mapCloseDistance = {}; }
if (global.mapClosestRooms === undefined) {global.mapClosestRooms = {}; }
if (global.observe_rooms === undefined) { global.observe_rooms = {}; }
if (global.portalMap === undefined) { global.portalMap = {}; }
if (global.shardMap === undefined) { global.shardMap = {}; }
if (global.labIdlePos === undefined) { global.labIdlePos = {}; }
if (global.isRoom === undefined) {global.isRoom = {}; }
if (global.hwDistances === undefined) {global.hwDistances = {}; }
if (global.map === undefined) {global.map = {}; }
if (global.roomtravel === undefined) { global.roomtravel = {}; }
if (global.pathOptimizer === undefined) {global.pathOptimizer = {}; }
if (global._avoidSKcreeps === undefined) {global._avoidSKcreeps = {}; }
if (global.creepStrengthCache === undefined) { global.creepStrengthCache = {}; }
if (global.roomsFindCache === undefined) { global.roomsFindCache = {}; }	
if (global.exits === undefined) {global.exits = {}; }
if (global.idlePos === undefined) {global.idlePos = {}; }
if (global.reducedExits === undefined) {global.reducedExits = {}; }
if (global.formationValidPos === undefined) {global.formationValidPos = {}; }
if (global.formationValidPosV2 === undefined) {global.formationValidPosV2 = {}; }
if (global.scoreSiegePos === undefined) {global.scoreSiegePos = {}; }
if (global.oob === undefined) {global.oob = {}; }
if (global.roomTerrain === undefined) {global.roomTerrain = {}; }
if (global.towerRepairTargets === undefined) {global.towerRepairTargets = {}; }
if (global.__segbuffer === undefined) {global.__segbuffer = {}; }
if (global.travCreepCache === undefined) {global.travCreepCache = {}; }
if (global.travStructureCache === undefined) {global.travStructureCache = {}; }
if (global.roadsCache === undefined) {global.roadsCache = {}; }
if (global.creepsCache === undefined) {global.creepsCache = {}; }
if (global.creepsCacheMem === undefined) { global.creepsCacheMem = {};}
if (global.pullIdlePos === undefined) {global.pullIdlePos = {}; }
if (global.getUpgraderFormation === undefined) { global.getUpgraderFormation = {}; }
if (global.getRepairFormation === undefined) { global.getRepairFormation = {}; }
if (global.deconstructMission === undefined) { global.deconstructMission = {}; }
if (global.pullSiegeFormationCombat === undefined) { global.pullSiegeFormationCombat = {}; }
if (global.matrixPoints === undefined) { global.matrixPoints = {}; }
if (global.mapDistance === undefined) { global.mapDistance = {}; }
if (global.posInRangeOfOutside === undefined) { global.posInRangeOfOutside = {}; }
if (global.ComoditiesForResAtLevel === undefined) { global.ComoditiesForResAtLevel = {}; }
if (global.BaseMaterialsInComodity === undefined) { global.BaseMaterialsInComodity = {}; }
if (global.eventCache === undefined) { global.eventCache = {}; }
if (global.raidPhalanxCm === undefined) {global.raidPhalanxCm = {}; }
if (global.idlePosTick === undefined) {global.idlePosTick = {}; }
if (global.isRoomAvailableCache === undefined) {global.isRoomAvailableCache = {}; }
if (global.getOutsidePixels === undefined) { global.getOutsidePixels = {}; }
if (global.getPhalanxMatrixCm === undefined) { global.getPhalanxMatrixCm = {}; }
if (global.sector === undefined) { global.sector = {}; }
if (global.blockers === undefined) { global.blockers = {}; }
if (global.requestString === undefined) { global.requestString = {}; }
if (global.allyAttackRequest === undefined) { global.allyAttackRequest = {}; }
if (global.allyDefenceRequest === undefined) { global.allyDefenceRequest = {}; }
if (global.allyRemoteDefence === undefined) { global.allyRemoteDefence = {}; }
if (global.FriendOrFoe === undefined) { global.FriendOrFoe = {}; }
if (global.mineralShare === undefined) { global.mineralShare = {}; }
if (global.StrucutreCount === undefined) { global.StrucutreCount = {}; }
if (global.sourceLinks === undefined) { global.sourceLinks = {}; }
if (global.controllerLinks === undefined) { global.controllerLinks = {}; }
if (global.storageLinks === undefined) { global.storageLinks = {}; }
if (global.getHarvesterContainer === undefined) { global.getHarvesterContainer = {} }
if (global.linkCap === undefined) { global.linkCap = {}; }
if (global.containerCache === undefined) {global.containerCache = {}; }
if (global._depositsForCredits === undefined) {global._depositsForCredits = {}; }


global.TERRAIN_MASK_PLAIN = 0;  // NO OFFICIAL CONSTANT

// DECLARE RAID CONSTANTS


global.STATE_PRE = 'pre';
global.STATE_INIT = 'init';
global.STATE_SPAWNING = "spawning";
global.STATE_REFRESH_TTL = 'refresh_ttl';
global.STATE_BOOST = 'boosting';
global.STATE_RALLY = 'rallying';
global.STATE_TRAVEL = 'traveling';
global.STATE_RAID = 'raiding';
global.STATE_END = 'ending';
global.STATE_COMPLETE = 'completed';

global.FRONT = 'F'; // FRONT CREEPS OF FORMATION
global.BACK = 'B';  // BACK CREEPS OF FORMATION
global.ANY = 'A';

global.R_EMPTY = "dummy";
global.R_HEALER = "R_HEALER";   // HEAL
global.R_RANGED = "R_RANGED";   // RANGED_ATTACK
global.R_ATTACK = "R_ATTACK";   // ATTACK
global.R_DECON = "R_DECON";     // DECONSTRUCTOR, WORK 
global.R_MELEE = "R_MELEE";       // ATTACK 
global.R_COMBO = "R_COMBO";     // RANGED AND HEAL 

global.RAID_TYPE_CLASSIC = 'classic';   // USES DECONSTRUCTORS, RANGED AND HEALERS
global.RAID_TYPE_DECONSTRUCTOR = 'deconstructor';   // USES DECONSTRUCTORS OR MELEE AND GROUP WITH HEALERS
global.RAID_TYPE_PHALANX = 'phalanx';   // USES COMBO'S, MOVE IN FORMATION
global.RAID_TYPE_PHALANX_ATTACKERS = 'phalanxAttacker';   // USES 2x ATTACKERS 2x HEALERS, MOVE IN FORMATION
global.RAID_TYPE_PHALANX_DECONSTRUCT = 'phalanxDeconstruct';   // USES 2x ATTACKERS 2x HEALERS, MOVE IN FORMATION

global.DUO_DISMANTLER = "duoDismantler";
global.CORE_SNIPER = "coreSniper"


function declareUnique(obj) {
    const uniqueValues = new Set();
    for (const key in obj) {
        if (uniqueValues.has(obj[key])) {
           throw new Error(`Duplicate value found in enum: ${obj[key]}`);
        }
        uniqueValues.add(obj[key]);
    }
    return obj;
}

// ROOM MEMORY ACCESS KEYS
global.R = declareUnique({
    REQUESTED_MOVERS: 'r',
    SPAWN_COUNT_TIMER: 'x',
    ROAD_IDX: 'z',
    ROAD_ROOM_IDX: 'y',
    ROADS_OLD_PRCL: 'a',
    CONTROLLER_CONT_POS: 'l',
    MY_MINING_OUTPOST: 'm',
    MY_ROOM: 'My',   // todo
    SOURCES: 'S', // todo
    MINERALS: 'M', // todo
    CONTROLLER: 'C', // todo

    ENERGY_HARVESTED: 'e',
    INVADER_PROBABLE: 'i',
    INVADER_LAST_SEEN: 's',

    LABS_PRODUCING: 'L',
    

})

// CREEPS MEMORY ACCESS KEYS
global.C = declareUnique({
    ROLE: 'r',
    ROOM_ORIGIN: 'o',
    CLOSEST_TARGET: 't',
    ASSIGNED_ROLE: 'a',
    WORK: 'w',
    ROOM_TARGET: 'R',
    SOURCE_ID: 'S',
    TRACK_DISTANCE: 'd',
    TICKS_TO_TARGET: 'c',
    RESOURCE_TYPE: 's',
    REPLACED: 'p',
    TARGET_POS: 'T',
    WAGON_WEIGHT: 'W',
    STARTED: 'v',
    TICKS_FROM_LAB: 'l',
    BOOSTED: 'b',
    LOW_TTL: 'k'

})

// STRUCTURE MEMORY ACCESS KEYS
global.S = declareUnique({
    INPUT_LAB: 'I',
    OUTPUT_LAB: 'O',    // obsolete
    BOOSTER_LAB: 'b',
    MIXER_LAB: 'M',
    BATCH_LAB: 'B',
    LAB_ERROR_CYCLES: 'e'

})

if (global.reactionJob === undefined) {global.reactionJob = {}; }
for (let reagen1 in REACTIONS){
    for (let reagen2 in REACTIONS){       
        let reaction = REACTIONS[reagen1][reagen2] 
        if (reaction) {
            
            if (global.reactionJob[reaction] === undefined) {global.reactionJob[reaction]  = {}; }
            global.reactionJob[reaction].r1 = reagen1;
            global.reactionJob[reaction].r2 = reagen2;
        }        
    }
}

global.errCodes = { 
    [OK]: "OK", 
    [ERR_NOT_OWNER]: "ERR NOT OWNER",
    [ERR_NO_PATH]: "ERR NO PATH",
    [ERR_NAME_EXISTS]: "ERR NAME EXISTS",
    [ERR_BUSY]: "ERR BUSY",
    [ERR_NOT_FOUND]: "ERR NOT FOUND",
    [ERR_NOT_ENOUGH_ENERGY]: "ERR NOT ENOUGH ENERGY",		
    [ERR_NOT_ENOUGH_RESOURCES] : "ERR NOT ENOUGH RESOURCES",
    [ERR_INVALID_TARGET]: "ERR INVALID TARGET",
    [ERR_FULL]: "ERR FULL",
    [ERR_NOT_IN_RANGE]: "ERR NOT IN RANGE",
    [ERR_INVALID_ARGS]: "ERR INVALID ARGS",
    [ERR_TIRED]: "ERR TIRED",
    [ERR_NO_BODYPART]: "ERR NO BODYPART",
   // [ERR_NOT_ENOUGH_EXTENSIONS]: "ERR NOT ENOUGH EXTENSIONS",
    [ERR_RCL_NOT_ENOUGH]: "ERR RCL NOT ENOUGH",
    [ERR_GCL_NOT_ENOUGH]: "ERR GCL NOT ENOUGH",
}

// DECLARE 
global.NEXT_EXPANSION = 'nextExpansion';

global.RANGED_MASS_ATTACK_DAMAGE = [0,10,4,1];

global.knownGlobals = {
    lib_segments: true,        
    global: true,
    getMemorySegment: true,
    accessMemorySegment: true,
    saveMemorySegment: true,
    module: true,
    console: true,
    require: true,
    Game: true,
    Memory: true,
    SEGMENT_ALL_ROOM_OOB: true,
    setGCL: true,
    mineralShare: true,
    runCounter : true,

    PRAISE_GCL_ROOMS: true,
    T3_TOUGH : true,
    T3_ATTACK :  true,
    T3_HEAL :  true,
    T3_MOVE : true,
    T3_CARRY : true,
    T3_RANGED_ATTACK :  true,
    T3_UPGRADE_CONTROLLER : true,
    T3_DISMANTLE :  true,
    T3_BUILD :  true,
    T3_HARVEST : true,
    BOT_MODE : true,
    STRUCTURE_SPAWN : true,
    STRUCTURE_EXTENSION : true,
    STRUCTURE_ROAD : true,
    STRUCTURE_WALL : true,
    STRUCTURE_RAMPART : true,
    STRUCTURE_KEEPER_LAIR : true,
    STRUCTURE_PORTAL : true,
    STRUCTURE_CONTROLLER : true,
    STRUCTURE_LINK : true,
    STRUCTURE_STORAGE : true,
    STRUCTURE_TOWER : true,
    STRUCTURE_OBSERVER : true,
    STRUCTURE_POWER_BANK : true,
    STRUCTURE_POWER_SPAWN : true,
    STRUCTURE_EXTRACTOR : true,
    STRUCTURE_LAB : true,
    STRUCTURE_TERMINAL : true,
    STRUCTURE_CONTAINER : true,
    STRUCTURE_NUKER : true,
    FIND_EXIT_TOP : true,
    FIND_EXIT_RIGHT : true,
    FIND_EXIT_BOTTOM : true,
    FIND_EXIT_LEFT : true,
    FIND_EXIT : true,
    FIND_CREEPS : true,
    FIND_MY_CREEPS : true,
    FIND_HOSTILE_CREEPS : true,
    FIND_SOURCES_ACTIVE : true,
    FIND_SOURCES : true,
    FIND_DROPPED_ENERGY : true,
    FIND_DROPPED_RESOURCES : true,
    FIND_STRUCTURES : true,
    FIND_MY_STRUCTURES : true,
    FIND_HOSTILE_STRUCTURES : true,
    FIND_FLAGS : true,
    FIND_CONSTRUCTION_SITES : true,
    FIND_MY_SPAWNS : true,
    FIND_HOSTILE_SPAWNS : true,
    FIND_MY_CONSTRUCTION_SITES : true,
    FIND_HOSTILE_CONSTRUCTION_SITES : true,
    FIND_MINERALS : true,
    FIND_NUKES : true,
    FIND_TOMBSTONES : true,

    TOP : true,
    TOP_RIGHT : true,
    RIGHT : true,
    BOTTOM_RIGHT : true,
    BOTTOM : true,
    BOTTOM_LEFT : true,
    LEFT : true,
    TOP_LEFT : true,

    COLOR_RED : true,
    COLOR_PURPLE : true,
    COLOR_BLUE : true,
    COLOR_CYAN : true,
    COLOR_GREEN : true,
    COLOR_YELLOW : true,
    COLOR_ORANGE : true,
    COLOR_BROWN : true,
    COLOR_GREY : true,
    COLOR_WHITE : true,

    LOOK_CREEPS : true,
    LOOK_ENERGY : true,
    LOOK_RESOURCES : true,
    LOOK_SOURCES : true,
    LOOK_MINERALS : true,
    LOOK_STRUCTURES : true,
    LOOK_FLAGS : true,
    LOOK_CONSTRUCTION_SITES : true,
    LOOK_NUKES : true,
    LOOK_TERRAIN : true,
    LOOK_TOMBSTONES : true,

    RESOURCE_ENERGY : true,
    RESOURCE_POWER : true,
    RESOURCE_HYDROGEN : true,
    RESOURCE_OXYGEN : true,
    RESOURCE_UTRIUM : true,
    RESOURCE_LEMERGIUM : true,
    RESOURCE_KEANIUM : true,
    RESOURCE_ZYNTHIUM : true,
    RESOURCE_CATALYST : true,
    RESOURCE_GHODIUM : true,

    OK : true,
    ERR_NOT_OWNER : true,
    ERR_NO_PATH : true,
    ERR_NAME_EXISTS : true,
    ERR_BUSY : true,
    ERR_NOT_FOUND : true,
    ERR_NOT_ENOUGH_ENERGY : true,
    ERR_NOT_ENOUGH_RESOURCES : true,
    ERR_INVALID_TARGET : true,
    ERR_FULL : true,
    ERR_NOT_IN_RANGE : true,
    ERR_INVALID_ARGS : true,
    ERR_TIRED : true,
    ERR_NO_BODYPART : true,
    ERR_NOT_ENOUGH_EXTENSIONS : true,
    ERR_RCL_NOT_ENOUGH : true,
    ERR_GCL_NOT_ENOUGH : true,
    CONTROLLER_STRUCTURES: true,

    MOVE : true,
    WORK : true,
    CARRY : true,
    ATTACK : true,
    RANGED_ATTACK : true,
    TOUGH : true,
    HEAL : true,
    CLAIM : true,


    BLUEPRINT_STORAGE: true,
    BLUEPRINT_LABS: true,
    BLUEPRINT_EXTENSIONS: true,
    BLUEPRINT_NUKER: true,
    BLUEPRINT_OBSERVER: true,

    RoomPosition : true,
    PathFinder : true,
    RoomVisual: true,
    Room : true,
    findTravelPath: true,


    
    
    getMyClosestRooms: true,
    releaseFleeRoles: true,
    getRoomLinearDistance: true,
    SWC_MODE: true,
    orderEnergyCart: true,
    BASE_MINERALS: true,
    REACTIONS: true,
    SEND_ONE_TIME: true,
    WALL_HP_WINDOW: true,
    NUKE_RANGE: true,
    T3_BOOSTS: true,
    SELL_MINERAL_ABOVE: true,
    BUY_MINERAL_BELOW: true,
    MIN_CREDITS_BALANCE: true,
    PUSH_RCL_TARGETS: true,
    TERMINAL_CAPACITY: true,
    STORAGE_CAPACITY: true,
    HIGH_ENERGY_MULIPLIER: true,
    LOW_ENERGY_MULIPLIER: true,
    LOW_ENERGY_RCL8_MULIPLIER: true,
    ENERGYSHARE_ALLIES: true,
    NEXT_EXPANSION: true,
    requestRoomVision: true,
    getRouteDistanceOnly: true,
    orderCombatBoost: true,
    sortCombatDeconstructMissions: true,
    posLoad: true,
    posSave: true,
    roomIsCenter: true,
    MIN_SOURCE_INCOME: true,
    SOURCE_ENERGY_CAPACITY: true,
    RawMemory: true,
    empireHasBoosts: true,
    getExits: true,
    calcResponseForce: true,
    calcCreepStrength: true,
    excludeMiningRoomsList: true,
    SOURCE_ENERGY_KEEPER_CAPACITY: true,
    SOURCE_KEEPER_DROP_ENERGY: true,
    expansionTargets: true,
    CONTROLLER_DOWNGRADE: true,
    STATE_COMPLETE: true,
    ENERGY_REGEN_TIME: true,
    HARVEST_POWER: true,
    CARRY_CAPACITY: true,
    CONTAINER_DECAY: true,
    CONTAINER_DECAY_TIME_OWNED: true,
    REPAIR_POWER: true,
    BODYPART_COST: true,
    CREEP_LIFE_TIME: true,
    CREEP_CLAIM_LIFE_TIME: true,
    ROAD_DECAY_AMOUNT: true,
    ROAD_DECAY_TIME: true,
    CONSTRUCTION_COST_ROAD_SWAMP_RATIO: true,
    getMarketSellOrders: true,
    CONSTRUCTION_COST: true,
    getMarketBuyOrders: true,
    ORDER_BUY: true,
    ORDER_SELL: true,
    getEnemyCreeps: true,
    checkFleeNeeded: true,
    assignFleeRoles: true,
    hasBreachedWalls: true,
    getRoomPRCL: true,
    removeBlockedRoads: true,
    roomIsHW: true,
    avoidSKcreeps: true,
    WALL_HP_SETPOINT: true,
    getBodyparts: true,
    healerFindDefender: true,
    createResponseCreep: true,
    STATE_SPAWNING: true,
    STATE_REFRESH_TTL: true,
    calcBodyStrength: true,
    mineralOnCd: true,
    HARVEST_MINERAL_POWER: true,
    EXTRACTOR_COOLDOWN: true,
    roomIsUpgradeBlocked: true,
    getRoomsTraversed: true,
    CONTROLLER_RESERVE_MAX: true,
    CREEP_SPAWN_TIME: true,
    SOURCE_ENERGY_NEUTRAL_CAPACITY: true,
    calcSingleCreepStrength: true,
    ATTACK_POWER: true,
    Source: true,
    RANGED_ATTACK_POWER: true,
    HEAL_POWER: true,
    getMyDamagedCreeps: true,
    TERMINAL_COOLDOWN: true,
    BOOSTS: true,
    RANGED_HEAL_POWER: true,
    findSafeRoomFor: true,
    assignEvacuateCreep: true,
    revertEvacuateCreep: true,
    DISMANTLE_POWER: true,
    requestSegment: true,
    setMemorySegment: true,
    findClosestDistanceFromMyRooms: true,
    requestMemorySegment: true,
    findRoute: true,
    getRouteDistance: true,
    checkForPortalDistance: true,
    SAFE_MODE_COOLDOWN: true,
    SAFE_MODE_DURATION: true,
    OBSTACLE_OBJECT_TYPES: true,
    addCreepToCache: true,
    DEBUG: true,
    setSemgentAsCritical: true,
    Creep: true,
    BODYPART_FROM_BOOST: true,
    LAB_BOOST_MINERAL: true,
    RANGED_MASS_ATTACK_DAMAGE: true,
    Tombstone: true,
    getWallLimitMatrix: true,
    TERMINAL_TARGET_ENERGY_SHARE: true,
    signText: true,
    TERMINAL_TARGET_ENERGY_LOW: true,
    Resource: true,
    raidPhalanx: true,
    clampDirection: true,
    getEnemyStructures: true,
    findWallToAttack: true,
    getBlockingCreep: true,
    clampRoomEdges: true,
    dirIsNotTowards: true,
    avoidSKcreepsIgnoreRoads: true,
    getAllMarketSellOrders: true,
    getAllMarketBuyOrders: true,
    getAllMarketOrders: true,
    T3_BOOSTS_OBJECT: true,
    MIN_T3_COMBAT_BOOSTS: true,
    ABANDON_SHIP: true,
    BASE_MINERALS_OBJECT: true,
    getControllerLink: true,
    raidMatrixCm: true,
    ConstructionSite: true,
    LAB_REACTION_AMOUNT: true,
    REACTION_TIME: true,
    pbMatrix: true,
    Structure: true,
    roomPositionIdentifier: true,
    StructureRampart: true,
    StructureContainer: true,
    StructureRoad: true,
    StructurePortal: true,
    NUKE_DAMAGE: true,
    ROAD_REBUILD_TIMER: true,
    BUILDER_ROADS_BUILDMAX: true,
    addRaid: true,
    RAID_TYPE_CLASSIC: true,
    STATE_PRE: true,
    STATE_INIT: true,
    R_DECON: true,
    R_RANGED: true,
    R_HEALER: true,
    R_COMBO: true,
    STATE_RALLY: true,
    STATE_TRAVEL: true,
    STATE_RAID: true,
    STATE_BOOST: true,
    RAID_TYPE_PHALANX: true,
    STATE_END: true,
    getRallyPoint: true,
    setConnectedPixelsRaid: true,
    setOutsidePixelsRaid: true,
    isOutsidePixelRaid: true,
    getTowerDamage: true,
    tilesToStandOn: true,
    LAB_MINERAL_CAPACITY: true,
    T3_BOOSTS_GLOABL_SETPOINT: true,
    posId: true,
    log: true,
    OwnedStructure: true,
    cumulativeAverage: true,
    getOpenPositions: true,
    OBSERVER_RANGE: true,
    StructurePowerBank: true,
    StructureSpawn: true,
    StructureController: true,
    StructureLab: true,
    StructureLink: true,
    TERMINAL_MIN_SEND: true,
    StructureTerminal: true,
    MINERAL_MIN_AMOUNT_STORED: true,
    ENERGYSHARE_SEND_AMOUNT: true,
    ENERGYSHARE_GCL_MINSTORED: true,
    ENERGYSHARE_ALLIES_TIMER: true,
    marketMineralSensiblePrice: true,
    getRoomPortals: true,
    canBuildStructure: true,   
    getCreepTimestamp : true,
    keyToCheck : true,
    roadCreatorMatrix : true,
    orders : true,
    buyOrders : true,
    sellOrders : true,
    hostiles : true,
    reportJson : true,
    getAllOrdersTimestamp : true,
    BLUEPRINT_TOWERS : true,
    cleanAtEndOfTick : true,
    playerHasSafemodedRoom : true,
    requestNuke: true,
    creepsCache : true,
    requestString : true,
    getWallLimitMatrixCivilian : true,
    cleanGlobal : true,
    getTowerRepair : true,
    excludePbRoomsList : true,
    knownGlobals : true,
    RAID_TYPE_DECONSTRUCTOR : true,
    diagnoseGlobal : true,
    posSaveStripped : true,
    myOrders : true,
    R_EMPTY : true,
    formationValidPosV2 : true,
    formationValidPos : true,
    currentActiveOrders : true,
    getSellOrdersTimestamp : true,
    roomIsOnSafeModeCd : true,
    healerFindSquadMate : true,
    portalMap : true,
    labIdlePos : true,
    isSk : true,
    isCenter : true,
    isHW : true,
    roomtravel : true,
    deconstructMission : true,
    getBuyOrdersTimestamp : true,
    EnemyStructures: true,
    idlePos : true,
    reducedExits : true,
    R_MELEE : true,
    T3_BOOST_BUILD_RATIO : true,
    observe_rooms : true,
    map : true,
    T3_BASICBOOSTS : true,
    SELL_ONLY_TO_NPC : true,
    createCostMatrix : true,
    traveler : true,
    cleanGlobalPaths : true,
    getAllSellOrdersTimestamp : true,
    cranePos : true,
    stats : true,
    getUpgraderFormation : true,
    pullSiegeFormationCombat : true,
    matrixPoints : true,
    SHARE_ABOVE : true,
    mapCloseDistance : true,
    mapClosestRooms : true,
    exits : true,
    mapDistance : true,
    TERMINAL_TICKS : true,
    creepStrengthCache : true,
    TOWER_POWER_REPAIR: true,
    isOutsideWalls: true,
    TERRAIN_MASK_WALL: true,
    TERRAIN_MASK_SWAMP: true,    
    getRoomTerrainAt: true,
    findClosestHostileBase: true,
    roadIsValid: true,
    BACK: true,
    FRONT: true,
    registerConflictingRemote: true,
    energyProfileCreep: true,
    sourceLinks: true,
    controllerLinks: true,
    storageLinks: true,
    ALLIES: true,
    ALLIES: true,
    ALLIES: true,
    ALLIES: true,



    orderRangedAttackers: true,
    getCreeps: true,
    needsCleanUp: true,
    orderCleanUp: true,
    ALLIES: true,
    roomIsSk: true,
    roomIsSafeModed: true,
    posCompress : true,
    posDecompress : true,
    posCompressXY: true,
    ulamSpiral: true,
    addBlueprintRoadsToCostMatrix:true,
    _ : true,
    limit : true,
    clearRoom : true,
    distanceTransform : true,
    updateWallInfo : true
}