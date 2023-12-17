'use strict'
let interShardExport = {

    run: function(){



        // Analyze other shards memories
        this.scanInterShardMemory();

        this.storeDepartingCreepMemories();

        this.publishInterShardMemory();

        // Clean memory
        if (Game.time % 333 === 0) {
            this.cleanArrivals(); 
            this.cleanDepartures();


        }
       

    },

    registerArrivals: function(creepName) {
        let localShardMemory = getLocalInterShardMemory();
        if (localShardMemory.arrivals === undefined) { localShardMemory.arrivals = {}; }

        if (localShardMemory.arrivals[creepName] === undefined) {
            localShardMemory.arrivals[creepName] = {
                ts: Game.time
            };
        }        
    }, 

    cleanArrivals: function() {
        let localShardMemory = getLocalInterShardMemory();

        if (!localShardMemory.arrivals) { return; }

        let oldTs = Game.time - 2500
        for (let creep in localShardMemory.arrivals) {
            if (localShardMemory.arrivals[creep].ts < oldTs ) {
                delete localShardMemory.arrivals[creep];
            }
        }
    },

    cleanDepartures: function() {
        let localShardMemory = getLocalInterShardMemory();

        if (!localShardMemory.departures) { return; }

        for (let creep in localShardMemory.departures) {
            if (Game.time > localShardMemory.departures[creep].ts + 1000) {
                // TODO: IF CREEP DID NOT ARRIVE, HALT INTERSHARDERS!
                delete localShardMemory.departures[creep]
            }
        }
    },

    registerDepartingResource: function(res, amount, shardDest) {
        let localShardMemory = getLocalInterShardMemory();
        if (localShardMemory.exportingRes === undefined) { localShardMemory.exportingRes = {}; }
        if (localShardMemory.exportingRes[shardDest] === undefined) { localShardMemory.exportingRes[shardDest] = {}; }

        if (localShardMemory.exportingRes[shardDest][res] === undefined) { 
            localShardMemory.exportingRes[shardDest][res] = {
                amount: 0
            };
        }
        localShardMemory.exportingRes[shardDest][res].amount += amount
        localShardMemory.exportingRes[shardDest][res].ts = Game.time;
    },

    registerArrivingResource: function(res, amount, shardOrigin) {
        let localShardMemory = getLocalInterShardMemory();
        if (localShardMemory.importingRes === undefined) { localShardMemory.importingRes = {}; }
        if (localShardMemory.importingRes[shardOrigin] === undefined) { localShardMemory.importingRes[shardOrigin] = {} }

        if (localShardMemory.importingRes[shardOrigin][res] === undefined) { 
            localShardMemory.importingRes[shardOrigin][res] = {
                amount: 0
            }; 
        }

        localShardMemory.importingRes[shardOrigin][res].amount += amount
        localShardMemory.importingRes[shardOrigin][res].ts = Game.time;
    },

    registerDepartingCreep: function(creepName, shardDest, spawnTicks = 150) {

        let localShardMemory = getLocalInterShardMemory();
        if (localShardMemory.departures === undefined) { localShardMemory.departures = {}; }

        localShardMemory.departures[creepName] = {
            ts: Game.time + CREEP_LIFE_TIME + spawnTicks + 25,
            shardDest: shardDest,
        };
    },

    storeDepartingCreepMemories: function() {
        
        let localShardMemory = getLocalInterShardMemory();
        if (!localShardMemory.departures) { return; }

        global._interShardCreepCache = {};

        for (let name in localShardMemory.departures) {
            if (Memory.creeps[name]) {
                localShardMemory.departures[name].memory = _.cloneDeep(Memory.creeps[name]);
                delete localShardMemory.departures[name].memory._trav;
            }

            if (!Game.creeps[name] && localShardMemory.departures[name].memory && Game.time < localShardMemory.departures[name].ts) {
                this.addCreepToInterShardCache(localShardMemory.departures[name].shardDest, name, localShardMemory.departures[name].memory )
            }
        }
    },

    addCreepToInterShardCache: function(shard, name, memory) {

        if (global._interShardCreepCache[shard] === undefined) { global._interShardCreepCache[shard] = {}; }
        if (global._interShardCreepCache[shard][memory[C.ROLE]] === undefined) { global._interShardCreepCache[shard][memory[C.ROLE]] = {}; }
        if (global._interShardCreepCache[shard][memory[C.ROLE]][memory[C.ROOM_TARGET]] === undefined) { global._interShardCreepCache[shard][memory[C.ROLE]][memory[C.ROOM_TARGET]] = {}; }
    
        global._interShardCreepCache[shard][memory[C.ROLE]][memory[C.ROOM_TARGET]][name] = {};
    },
    
    scanInterShardMemory: function(){
        let shardToCheck = global.myShards[Game.time % global.myShards.length];
        if (shardToCheck === Game.shard.name) { return; }
        let shardMemory = getInterShardMemory(shardToCheck);
        let localShardMemory = getLocalInterShardMemory();

        // Check if creeps are arriving here
        if (shardMemory.departures) {
            for (let name in shardMemory.departures) {
                if (Game.creeps[name]) {
                    this.registerArrivals(name);
                    if (Memory.creeps[name]) { continue; }
                }
                    
                Memory.creeps[name] = shardMemory.departures[name].memory
            }
        }

        // Check if my departures have arrived
        if (shardMemory.arrivals) {
            
            for (let name in shardMemory.arrivals) {
                
                if (localShardMemory.departures && localShardMemory.departures[name] && Game.time > localShardMemory.departures[name].ts) {
                    delete localShardMemory.departures[name];
                }
            }
        }

        // Check if other shard are in need of help
        if (shardMemory.helpNeeded) {

            for (let roomName in shardMemory.helpNeeded) {

                if (Memory.helpNeeded[roomName] === undefined) {
                    Memory.helpNeeded[roomName] = {};
                    Memory.helpNeeded[roomName].shard = shardToCheck;
                    Memory.helpNeeded[roomName].shardTs = Game.time + 350;                    
                    Memory.helpNeeded[roomName].assignedSpawn = getMyClosestRooms(roomName, 4, undefined, undefined, undefined, Memory.helpNeeded[roomName].shard);
                }
            }
        }

        // Get market prices
        if (shardMemory.sellAvg) {
            if (localShardMemory.markets === undefined) { localShardMemory.markets = {} }
            localShardMemory.markets[shardToCheck] = {
                sellAvg: shardMemory.sellAvg,
                buyAvg: shardMemory.buyAvg,
            }
        }

        // Publish my stock of incomming resources
        if (shardMemory.export) {

            Memory.import = {};
            if (shardMemory.export[Game.shard.name]) {  // Exporting to me
                 
                if (localShardMemory.import === undefined) { localShardMemory.import = {}; }
                localShardMemory.import[shardToCheck] = {};
                for (let res in shardMemory.export[Game.shard.name]) {
                    localShardMemory.import[shardToCheck][res] = {
                        amount: Memory.Minerals[res] || 0
                    }
                }
                Memory.import = localShardMemory.import;
            }       
        }

        // Importing from me
        if (shardMemory.import && shardMemory.import[Game.shard.name] && Memory.export[shardToCheck]) {    

            for (let res in shardMemory.import[Game.shard.name]) {
                if (Memory.export[shardToCheck][res] === undefined || shardMemory.import[Game.shard.name][res].amount === undefined) { continue; }
                Memory.export[shardToCheck][res].amount = Math.max(0, (maxStoreInRoom(res) * 2) - shardMemory.import[Game.shard.name][res].amount);
            }
        }

        // Importing from me, keep track of in transit resources
        if (localShardMemory.exportingRes && localShardMemory.exportingRes[shardToCheck]) {
            
            let oldTs = Game.time - 12500
            for (let res in localShardMemory.exportingRes[shardToCheck]) {
                if (!Memory.export[shardToCheck] || !Memory.export[shardToCheck][res]) { continue; }

                Memory.export[shardToCheck][res].inTransit = localShardMemory.exportingRes[shardToCheck][res].amount;

                let recieved = 0
                if (shardMemory.importingRes && shardMemory.importingRes[Game.shard.name] && shardMemory.importingRes[Game.shard.name][res]) {
                    recieved = shardMemory.importingRes[Game.shard.name][res].amount;
                    Memory.export[shardToCheck][res].inTransit -= recieved;

                    log(shardToCheck + " confimred total recived res " + recieved + " " + res)
                }

                log(shardToCheck + " exportingRes in transit  " + Memory.export[shardToCheck][res].inTransit + " " + res)

                if ( Memory.export[shardToCheck][res].inTransit > 0 && oldTs > localShardMemory.exportingRes[shardToCheck][res].ts) {
                    localShardMemory.exportingRes[shardToCheck][res].amount = recieved;
                    log(shardToCheck + " clearing exportingRes in transit  " + Memory.export[shardToCheck][res].inTransit + " " + res)
                }
            }
        }
        
    }, 

    publishInterShardMemory: function(){

        let localShardMemory = getLocalInterShardMemory();

        if (Game.time % 19 == 0){
            delete localShardMemory.helpNeeded;
            for (let roomName in Memory.helpNeeded) {
                if (!Memory.helpNeeded[roomName].assignedSpawn || Object.keys(Memory.helpNeeded[roomName].assignedSpawn).length <= 0) {
                    if (localShardMemory.helpNeeded === undefined) { localShardMemory.helpNeeded = {}; } 
                    localShardMemory.helpNeeded[roomName] = {};
                }
            }
        }

        if (Game.time % 333 === 0 && Memory.market) {
            localShardMemory.sellAvg = Memory.market.sell;
            localShardMemory.buyAvg = Memory.market.buy;

            localShardMemory.export = Memory.export;


        }
    }, 


}
module.exports = interShardExport;



global.countInterShardCreeps = function(shard, role, destRoom = undefined){
    if (global._interShardCreepCache === undefined) { return 0; }
    if (global._interShardCreepCache[shard] === undefined) { return 0; }
    if (global._interShardCreepCache[shard][role] === undefined) { return 0; }
    if (!role) { return Object.keys(global._interShardCreepCache[shard][role]).length }

    if (global._interShardCreepCache[shard][role][destRoom] === undefined) { return 0; }
    return Object.keys(global._interShardCreepCache[shard][role][destRoom]).length;
}


global._intershardMemory = {};
global.getInterShardMemory = function(shard) {
    if (global._intershardMemory[shard] === undefined || global._intershardMemory[shard].ts !== Game.time ) {
        global._intershardMemory[shard] = {};
        global._intershardMemory[shard].ts = Game.time;
        global._intershardMemory[shard].data = JSON.parse(InterShardMemory.getRemote(shard) || "{}");
    }
    return global._intershardMemory[shard].data;
}

global.getLocalInterShardMemory = function() {
    let shard = Game.shard.name;
    if (global._intershardMemory[shard] === undefined || global._intershardMemory[shard].ts !== Game.time ) {
        global._intershardMemory[shard] = {};
        global._intershardMemory[shard].ts = Game.time;
        global._intershardMemory[shard].data = JSON.parse(InterShardMemory.getLocal() || "{}");
    }
    return global._intershardMemory[shard].data;
}

// Call at end of tick
global.saveLocalInterShardMemory = function() {
    let shard = Game.shard.name;
    if (global._intershardMemory[shard] !== undefined && global._intershardMemory[shard].ts === Game.time ) {
        InterShardMemory.setLocal(JSON.stringify(global._intershardMemory[shard].data));
    }
}
