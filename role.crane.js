'use strict'
let roleCrane = {

    /** @param {Creep} creep **/
    run: function(creep) {

        creep.roleCrane();
          
	}
};
module.exports = roleCrane;

Creep.prototype.roleCrane = function() {
    if (this.sleep() ) { return; }        

    let cranePos = this.room.getCranePos();
    if (cranePos && !this.pos.isThisPos(cranePos)){

        if (!this.hasBodyparts(MOVE) ) {
            this.suicide()
            return;
        }

        if (!BOT_MODE && this.room.controller && this.room.controller.level >= 8 && Memory.buildFactory) {
            this.suicide();
            let blockingCreep = cranePos.lookForCreep();
            if (blockingCreep && blockingCreep.memory[C.ROLE] !== "crane") {
                blockingCreep.suicide();
            }
        } else {
            this.room.visual.line(this.pos, cranePos, { color: "green", lineStyle: "solid" });
            this.craneMoveToPos(cranePos);
        }
        
    } else {

        if (PRAISE_GCL_ROOMS[this.room.name]){           
            this.GCLrefreshTTL(true);
            if (this.checkFillerPosEnergy() ) {return true; }          
        }
        
        
        this.manageState();
        if (this.performAssignedRole() ) { return 1;}


        if(this.memory[C.WORK] || this.memory.jobId || this.sumCarry > 0 ) { //this.sumCarry/this.carryCapacity > 0.5)) {
            
            if (!this.roleDeliver()  ) {
                this.roleLabRatEmpty();
            }
        } else {
            if (!this.roleMoverHasTicksLeft(3) ) {
                if (!this.handleStorageLink() ) {
                    if (!this.refillSpawns() ) {
                        if (!this.roleRefillPowerSpawnPower() ) {
                            if (!this.roleHandleFactory() ) {
                                if (!this.roleCraneBalancer() ) {
                                    if (!this.roleRefillNukerEnergy(this)) {
                                        if (!this.roleRefillNukerGhodium(this)) {
                                            if (!PUSH_RCL_TARGETS[this.room.name]) {
                                                this.sleep(3);
                                            }  
                                        }
                                    }                                                                                                         
                                }
                            }
                        }
                    }
                }
            }
        }    		
    }      
}

Creep.prototype.roleHandleFactory = function() {
    
    // CHECK IF OTHER ROLE ACTIVE   
    let role = "roleHandleFactory";
    if (!this.checkRole(role)) {return 0;}        
    // ASSIGN BUILD 
   
    if (!this._memory[C.CLOSEST_TARGET]) {

        if (this._cache.factorySleep > Game.time) { return; }
     //   this.say("fac")
     
        // wait until checking this again
        this._cache.factorySleep = Game.time + 25;

        if (!this.room.terminal && !this.room.storage) { return; }
        let factory = this.room.findByType(STRUCTURE_FACTORY)[0];
        if (!factory) { return; }

        let storage = this.room.storage;
        let terminal = this.room.terminal;

        
        
        let minimumFreeSpaceStorage = 10000;

        let factoryLevel = factory.level
        if (factoryLevel > 0 && !Memory.rooms[this.room.name].factoryOperator) {
            factoryLevel = 0;
        }

        let myRecepie = getCachedComoditiesForResAtLevel(Memory.comodityToProcude, factoryLevel);        
     //   let validMinerals = getCachedBaseMaterialsInComodity(Memory.comodityToProcude);

        let wantedEnergy = 1200;
        let wantedBattery = 150;
        let validComponent = {           
            [RESOURCE_ENERGY]: {
                amount: wantedEnergy
            }
        };

        if (factoryWantToProduceEnergy(factory.room.name)) {
            validComponent[RESOURCE_BATTERY] = {
                amount: wantedBattery
            }
        }

        let making = {} ;
        for (let ingredient in myRecepie) {
            making[ingredient] = {};
            for (let component in myRecepie[ingredient].res) {
                if (validComponent[component] === undefined) {
                    validComponent[component] = {};
                    validComponent[component].amount = 0;
                }

                if (component === RESOURCE_ENERGY) {
                    validComponent[RESOURCE_ENERGY].amount = Math.max(myRecepie[ingredient].res[component], validComponent[RESOURCE_ENERGY].amount);
                } else {
                    validComponent[component].amount += myRecepie[ingredient].res[component];
                }

                if (COMPRESSED_RESOURCE[component] && this.room.store(component) < validComponent[component].amount) {
                    let parts = getCachedComoditiesForResAtLevel(component, factoryLevel);
                    for (let part in parts) {

                        for (let minicomponent in parts[part].res) {

                            if (validComponent[minicomponent] === undefined) {
                                validComponent[minicomponent] = {};
                                validComponent[minicomponent].amount = 0;
                            }

                            validComponent[minicomponent].amount += parts[part].res[minicomponent]
                        }
                    }
                }

            }
        }

        let roomName = this.room.name
        let compressingResource = {};
        if (Memory.Minerals.mineralCompress && Memory.Minerals.mineralCompress[roomName]) {
            compressingResource[RESOURCE_ENERGY] = {};
            if (validComponent[RESOURCE_ENERGY] === undefined) {
                validComponent[RESOURCE_ENERGY] = {};
                validComponent[RESOURCE_ENERGY].amount = 0;
            }
            validComponent[RESOURCE_ENERGY].amount = Math.max(1000, validComponent[RESOURCE_ENERGY].amount);

            
            for (let bars in Memory.Minerals.mineralCompress[roomName]) {

                if (this.room.store(bars) >= maxStoreInRoom(bars)) { continue; }

                if (!COMMODITIES[bars]) { continue; }
                compressingResource[bars] = {};
                for (let res in COMMODITIES[bars].components) {
                    if (res === RESOURCE_ENERGY && validComponent[res] !== undefined) { 
                        continue;
                    }

                    if (validComponent[res] === undefined) {
                        validComponent[res] = {};
                        validComponent[res].amount = 0;
                    }

                    validComponent[res].amount += 600;                    
                }
            }
        }

        if (Memory.Minerals.mineralShare && Memory.Minerals.mineralShare[roomName]) {
            for (let raw in Memory.Minerals.mineralShare[roomName]) {
                if (!COMPRESSED_RESOURCE_FROM_RAW[raw]) { continue; }
                let bars = COMPRESSED_RESOURCE_FROM_RAW[raw].raw; 
    
                if (this.room.store(bars) >= maxStoreInRoom(bars) * 0.15) { continue; }
                if (!COMMODITIES[bars]) { continue; }
                
                compressingResource[bars] = {};
                for (let res in COMMODITIES[bars].components) {
                    if (res === RESOURCE_ENERGY && validComponent[res] !== undefined) { 
                        continue;
                    }
    
                    if (validComponent[res] === undefined) {
                        validComponent[res] = {};
                        validComponent[res].amount = 0;
                    }
    
                    validComponent[res].amount += 600;                    
                }
            }
        }

        for (let res in BASE_MINERALS_OBJECT) {
			if (res === RESOURCE_POWER) { continue; }
			if (factory.room.store(res) >= maxStoreInRoom(res) ) { continue; }
			let bars = COMPRESSED_RESOURCE_FROM_RAW[res].raw;

            if (validComponent[bars] === undefined) {
                validComponent[bars] = {};
                validComponent[bars].amount = this.carryCapacity;
            }
		}

        // EMPTY FACTORY      
        for (let res in factory.store) {
            
            let wantedAmount = 0;
            let threshold = 0;
            if (validComponent[res]) {
                if (res === RESOURCE_ENERGY) {
                    wantedAmount = wantedEnergy;
                    threshold = this.carryCapacity;
                } else if (res === RESOURCE_BATTERY) {
                    wantedAmount = wantedBattery;
                    threshold = this.carryCapacity;
                } else {
                    wantedAmount = Math.min(validComponent[res].amount * 10, 9000);
                }                
            } else if (res === Memory.comodityToProcude || (making[res] && !validComponent[res] && !BASE_MINERALS_FACTORY[res])) {
                wantedAmount = 0;
            } else if(compressingResource[res]) {
                wantedAmount = 0;
                if (factory.level > 0) {
                    threshold = 600;
                }
            } else if(res === RESOURCE_BATTERY) {    
                wantedAmount = 0;
            } else {
                if (this.room._cache.factoryProduced) {
                    wantedAmount = maxStoreInRoom(res) * 0.4;
                    if (COMPRESSED_RESOURCE[res]){
                        wantedAmount = Math.min(1000, wantedAmount)
                    }
                }
            }

            let excess = factory.store[res] - wantedAmount;
            if (excess > threshold) {
                let store;

                if (terminal && terminal.freeSpace > minimumFreeSpaceStorage) {
                    store = terminal.id
                } else if (storage && storage.freeSpace > minimumFreeSpaceStorage) {
                    store = storage.id
                }
                
                this.assignTarget(factory.id, role, res);
                this.memory.jobId = store;
                this._cache.factorySleep = Game.time;

                this.memory.amount = Math.min(this.carryCapacity, excess);                
                break;
            }
        }

        // FILL FACTORY
        if (!this.memory[C.CLOSEST_TARGET]) {
            

            if (!this.memory[C.CLOSEST_TARGET]) {             
                for (let component in validComponent) {
                    if (!factory.store[component] || factory.store[component] < validComponent[component].amount) { 
                        let missingComponents = validComponent[component].amount - (factory.store[component] || 0);
                                                
                        if (missingComponents > 0){// && this.room.store(component) >= missingComponents) {
                            let store;
                            let storedAmount = 0;
                            if (Memory.Minerals && Memory.Minerals.Buy && Memory.Minerals.Buy[component]) {
                                storedAmount = 3000 + this.carryCapacity;
                            }

                            if (terminal && terminal.store[component] && terminal.store[component] > storedAmount) {
                                store = terminal.id
                                storedAmount = terminal.store[component];
                            } else if (storage && storage.store[component] && storage.store[component] > storedAmount) {
                                store = storage.id
                                storedAmount = storage.store[component];
                            }

                            if (!store) { continue; }
                            this.assignTarget(store, role, component);
                            this.memory.jobId = factory.id;
                            this.memory.amount = Math.min(this.carryCapacity, missingComponents * 3, storedAmount);
                            this._cache.factorySleep = Game.time;
                            //   log(this.room.name + " crane suppplying factory " + component)
                            break;
                            
                        }
                    }
                    if (this.memory[C.CLOSEST_TARGET]) { break; }
                }
            }
        } 
    }

    if (this.memory[C.CLOSEST_TARGET]) {
        let targetObj = Game.getObjectById(this.memory[C.CLOSEST_TARGET]);
        let value = ERR_NOT_IN_RANGE;
    //    this.say("balance")
        if (this.pos.inRangeTo(targetObj, 1)) {
            value = this.withdraw(targetObj, this.memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY, this.memory.amount);
        }
        if (value == ERR_NOT_IN_RANGE){
            this.travelTo(targetObj, {maxRooms:1, range: 1});
        }
        else if (value == OK) {
            this.clearTarget();
            delete this.memory.amount;
        }
        else {
            console.log(this.room.name +" error roleHandleFactory " + value + " " + this.memory.amount + " " + this.memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY + " on " +targetObj.structureType);
            this.clearTarget();
            delete this.memory.amount;
        }
        return 1;
    } else {   // wait until checking this again
        this._cache.factorySleep = Game.time + 25;
    }
    return 0;

}


Creep.prototype.roleCraneBalancer = function() {

    // CHECK IF OTHER ROLE ACTIVE   
//    if (!this.checkRole(role)) {return 0;}        
    // ASSIGN BUILD 
   
    if (!this._memory[C.CLOSEST_TARGET]) {
        
        let role = "roleCraneBalancer";

        if (this._cache.balancerSleep === undefined) { this._cache.balancerSleep = Game.time + Math.floor(Math.random() * 25)}
        if (this._cache.balancerSleep > Game.time) { return; }
        delete this.room.memory.balancerSleep
        if (!this.room.terminal || !this.room.storage) { return; }
        let terminalActive = this.room.findByType(STRUCTURE_TERMINAL).length;    
        let thisCarryCap = this.carryCapacity;
        let terminalStore = this.room.terminal.store;
        let storageStore = this.room.storage.store;
        let mineral = Object.keys(this.room.memory.mineral);
        let localRes = this.room.memory.mineral[mineral[0]].type;
        let roomName = this.room.name;

        let roomStore = Object.assign({}, terminalStore, storageStore);
        let terminalFreeSpace = this.room.terminal.freeSpace;
        let minTermFreeSpace = thisCarryCap * 2;
        let minimumFreeSpaceStorage = 10000;
        let storageFreeSpace = this.room.storage.freeSpace;

        let abandonRoom = isAbandonedRoom(roomName) || (Memory.rooms[roomName].mineOnly && Game.rooms[roomName].terminal)



        let wantedT3Terminal = 3000;
        if (abandonRoom){
            wantedT3Terminal = 25000;
            minTermFreeSpace = 5000
        } else if (this.room.controller.isPowerEnabled) {
            wantedT3Terminal = 1000;
        }
        
        let bestBoosts = getMyBestBoosts();

        let combatBoosts = {}        
        for (let room in Memory.combatBoost) {
            combatBoosts = Object.assign(combatBoosts, Memory.combatBoost[room].boosts);
        }
        
        for (let res in roomStore){
            if (bestBoosts[res] !== undefined || 
                combatBoosts[res] !== undefined || 
                res === RESOURCE_OPS || 
                HIGHWAY_MINERAL[res] || 
                (SEASONAL_SCORE && res === RESOURCE_SCORE) ||
                (SEASONAL_THORIUM && res === RESOURCE_THORIUM) ||
                (SEASONAL_SYMBOLS && SYMBOLS.includes(res))
            ) {                
                if (terminalStore[res] && 
                    (terminalStore[res] - thisCarryCap) > wantedT3Terminal && 
                    !abandonRoom
                ){   // Overflow
                    if (storageFreeSpace > this.carryCapacity) {

                        this.assignTarget(this.room.terminal.id, role, res);
                        this.amount = Math.min(thisCarryCap, terminalStore[res])
                        this.memory.jobId = this.room.storage.id;
                        break;
                    }
                }
                if ((!terminalStore[res] || terminalStore[res] < wantedT3Terminal || abandonRoom ) && 
                    storageStore[res] &&
                    terminalActive ){   // Underflow
                    if (terminalFreeSpace > minTermFreeSpace) {
                        this.assignTarget(this.room.storage.id, role, res);
                        this.amount = Math.min(thisCarryCap, storageStore[res])
                        this.memory.jobId = this.room.terminal.id;
                        break;
                    }
                }
            } else if (BASE_MINERALS_OBJECT_CRANE[res] ) {
                let baseMineralTarget = BUY_MINERAL_BELOW;
                if (res === localRes) { 
                    baseMineralTarget = 30000; 
                } else if (res === RESOURCE_GHODIUM) {
                    baseMineralTarget = 1000;
                }
                
                if (terminalStore[res] && (terminalStore[res] - thisCarryCap) > baseMineralTarget && !abandonRoom) {   // Overflow                    
                    if (storageFreeSpace > this.carryCapacity) { 
                        this.assignTarget(this.room.terminal.id, role, res);
                        this.memory.jobId = this.room.storage.id;
                        break;
                    }
                }
                if ((!terminalStore[res] || terminalStore[res] < baseMineralTarget || abandonRoom) && storageStore[res] && terminalActive){   // Underflow
                    if (terminalFreeSpace > minTermFreeSpace) { 
                        this.assignTarget(this.room.storage.id, role, res);
                        this.memory.jobId = this.room.terminal.id;
                        break;
                    }
                }
                
            } else if (res === RESOURCE_ENERGY ) {
                continue;             
                /*
                let targetEnergyTerminal = TERMINAL_TARGET_ENERGY_LOW * 2;
                if (abandonRoom) {
                    targetEnergyTerminal = targetEnergyTerminal * 2;
                }
                if (Memory.energyShare && Memory.energyShare[this.room.name]) { targetEnergyTerminal = TERMINAL_TARGET_ENERGY_SHARE; }
                if ((terminalStore[res] && 
                    (terminalStore[res] - thisCarryCap) > targetEnergyTerminal && 
                    storageFreeSpace - thisCarryCap > minimumFreeSpaceStorage * 2 && 
                    !abandonRoom)
                    ){   // Overflow       
                   if (storageFreeSpace > this.carryCapacity) {
                        this.assignTarget(this.room.terminal.id, role, res);
                        this.memory.jobId = this.room.storage.id;
                        this.say("overflow")
                        break;
                    }
                }
                if ((!terminalStore[res] || 
                    terminalStore[res] < targetEnergyTerminal || 
                    storageFreeSpace < minimumFreeSpaceStorage) &&
                    storageStore[res] && 
                    terminalActive ){   // Underflow
                    if (terminalFreeSpace > this.carryCapacity) { 
                        this.assignTarget(this.room.storage.id, role, res);
                        this.memory.jobId = this.room.terminal.id;
                        break;
                    }   
                } */

            } else if (ENABLE_FACTORIES && res !== RESOURCE_GHODIUM && COMMODITIES[res]) {
                if (terminalFreeSpace > this.carryCapacity && storageStore[res]) { 

                    if (COMPRESSED_RESOURCE[res] && this.room.terminal.store[res] > 2500) { continue; } 
                    this.assignTarget(this.room.storage.id, role, res);
                    this.memory.jobId = this.room.terminal.id;
               //     this.say("com")
                    break;
                }
            } else { // THIS IS INTERMEDIATE PRODUCT   
                if (terminalStore[res] && !abandonRoom) {            // Overflow
                    if (storageFreeSpace > this.carryCapacity) { 
                        this.assignTarget(this.room.terminal.id, role, res);
                        this.memory.jobId = this.room.storage.id;
                        break;
                    }
                }
                if (terminalActive && abandonRoom && storageStore[res]) {  // Underflow
                    if (terminalFreeSpace > minTermFreeSpace) { 
                        this.assignTarget(this.room.storage.id, role, res);
                        this.memory.jobId = this.room.terminal.id;
                        break;
                    }
                }
            }            
        }
        if (!this.memory[C.CLOSEST_TARGET]) {  
            // Energy last?
            let res = RESOURCE_ENERGY;
            let targetEnergyTerminal = TERMINAL_TARGET_ENERGY_LOW * 2;
            if (abandonRoom) {
                targetEnergyTerminal = targetEnergyTerminal * 2;
            }
            if (Memory.energyShare && Memory.energyShare[this.room.name]) { targetEnergyTerminal = TERMINAL_TARGET_ENERGY_SHARE; }
            if ((terminalStore[res] && 
                (terminalStore[res] - thisCarryCap) > targetEnergyTerminal && 
                storageFreeSpace - thisCarryCap > minimumFreeSpaceStorage * 2 && 
                !abandonRoom)
                ){   // Overflow       
                if (storageFreeSpace > this.carryCapacity) {
                    this.assignTarget(this.room.terminal.id, role, res);
                    this.memory.jobId = this.room.storage.id;
                    this.say("overflow")
                    
                }
            }
            if ((!terminalStore[res] || 
                terminalStore[res] < targetEnergyTerminal || 
                storageFreeSpace < minimumFreeSpaceStorage) &&
                storageStore[res] && 
                terminalActive 
            ){   // Underflow
                if (terminalFreeSpace > this.carryCapacity) { 
                    this.assignTarget(this.room.storage.id, role, res);
                    this.memory.jobId = this.room.terminal.id;                    
                }
            }
        }
            
        if (!this.memory[C.CLOSEST_TARGET]) {   // wait until checking this again
            this._cache.balancerSleep = Game.time + 25;
        }
    }

    if (this.memory[C.CLOSEST_TARGET]) {
        let targetObj = Game.getObjectById(this.memory[C.CLOSEST_TARGET]);
        let value = ERR_NOT_IN_RANGE;
     //   this.say("balance")
        if (this.pos.inRangeTo(targetObj, 1)) {
            value = this.withdraw(targetObj, this.memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY, this.amount);
        }
        
        if (value == ERR_NOT_IN_RANGE){
            this.travelTo(targetObj, {maxRooms:1, range: 1});
        }
        else if (value == OK) {
            this.clearTarget();
            delete this.amount;
        }
        else {
            console.log(this.room.name +" error roleCraneBalancer " + value + " " + this.amount + " " + this.memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY + " on " +targetObj.structureType);
            this.clearTarget();
            delete this.amount;
            this.memory[C.RESOURCE_TYPE] = this.resourceType;
        }
        return 1;
    }
    return 0;


};

Creep.prototype.refillSpawns = function(){
    

   
    // ASSIGN   
    if (!this._memory[C.CLOSEST_TARGET]) {

        let requiredMissing = 0;
        if (this.room.memory.spawnQ === undefined && this.room._cache._spawnRefresh > Game.time) {
            requiredMissing = 200;
        }

        let spawns = [];
        let spawnToCheck = [];

        if (this.room.energyAvailable < this.room.energyCapacityAvailable) { 
            spawnToCheck =  this.room.findByType([STRUCTURE_SPAWN, STRUCTURE_POWER_SPAWN])
            spawnToCheck = spawnToCheck.concat( this.room.getStoreCraneExtensions(false, false, true) )
        } else {
            spawnToCheck =  this.room.findByType(STRUCTURE_POWER_SPAWN)
        }
        
        for (let idx in spawnToCheck){
            let spawn = spawnToCheck[idx];
            spawn.pos._cache.craneTs = Game.time + 73;

            let minEnergy = requiredMissing;
            if (spawn.structureType === STRUCTURE_POWER_SPAWN) {
                minEnergy = this.carryCapacity;
            } 
            if (spawn.energy < spawn.energyCapacity - minEnergy && this.pos.isNearTo(spawn)) {
                spawns.push(spawn);
            }
            
        }    

        if (spawns.length > 0) {                    
            let withdrawLocation = this.craneGetResFromTargetId(RESOURCE_ENERGY);
            if (withdrawLocation) {
                
                let carryCapacityAvailable = this.carryCapacity;
                this.memory.jobId = [];
            //    let jobs = []
                this.memory.amount = 0;
                for (let idx in spawns){
                    let energyMissing = Math.min(spawns[idx].energyCapacity - spawns[idx].energy, this.carryCapacity);
                    if (energyMissing > carryCapacityAvailable) { continue; }

                    
                    this.memory.jobId.push(spawns[idx].id);
                 //   this.memory.jobId = spawns[0].id;
                    this.memory.amount += energyMissing;
                    carryCapacityAvailable -= energyMissing;
                    if (carryCapacityAvailable <= 0) { break; }
                }

                this.memory.amount = Math.min(this.memory.amount, this.carryCapacity)

                let role = "refillSpawns";
                this.assignTarget(withdrawLocation, role, RESOURCE_ENERGY);
             //   this.say("spawns " + this.memory.jobId.length);
                  
                /*
                // REMOVE FROM REFILL JOB
                if (PRAISE_GCL_ROOMS[this.room.name]) {
                    this.memory.amount = this.carryCapacity;
                } else { 
                    this.memory.amount = limit(spawns[0].energyCapacity - spawns[0].energy, 0, this.carryCapacity);
                }

                this.memory.jobId = spawns[0].id;
                this.assignTarget(withdrawLocation, role, RESOURCE_ENERGY);
                this.say("spawns")
                */
            }
        }    
    }
    if (this.memory[C.CLOSEST_TARGET]) { 
        return this.withdrawAction(this.memory.amount); 
    }
};

Creep.prototype.handleStorageLink = function(){
    
    // CHECK IF OTHER ROLE ACTIVE
//    if (!this.checkRole(role)) {return 0;}
    // ASSIGN
    if (!this._memory[C.CLOSEST_TARGET]) {
        let storageLink = _.filter(this.room.findByType(STRUCTURE_LINK), 
                function(structure) {return (structure.isStorage()
                                            );
                });
        if (storageLink.length === 0) { return; }

        let controllerLink = [];
        if (this.room.energyStatus() > ECONOMY_CRASHED) {
            controllerLink = getControllerLink(this.room.name);
        }

        let spawnLink = Game.getObjectById(getSpawnLink(this.room.name));

        let controllerLinkLow = 100;
        let sourceLinkFull = 700;
        if (PUSH_RCL_TARGETS[this.room.name] || this.room.controller.level < 8) {
            controllerLinkLow = 800;
            sourceLinkFull = 750;
        }

        if (storageLink[0].energy < 700 && 
            !sourceLinksFilled(this.room.name, sourceLinkFull)
        ) { // REFILL STORAGE LINK
            let withdrawLocation = this.craneGetResFromTargetId(RESOURCE_ENERGY);
            if (withdrawLocation) { 
                this.memory.jobId = storageLink[0].id;
                this.memory.amount = Math.min(storageLink[0].energyCapacity - storageLink[0].energy, this.carryCapacity);
                let role = "handleStorageLink";
                this.assignTarget(withdrawLocation, role, RESOURCE_ENERGY);
            }
        } else if (storageLink[0].energy > 0 && 
            sourceLinksFilled(this.room.name, sourceLinkFull) ) {
             let storeLocation = this.craneGetStore(RESOURCE_ENERGY);
            this.memory.jobId = storeLocation;
            this.memory.amount = undefined;
            let role = "handleStorageLink";
            this.assignTarget(storageLink[0].id, role, RESOURCE_ENERGY);
        }
    }

    if (this.memory[C.CLOSEST_TARGET]) {         
        return this.withdrawAction(this.memory.amount); 
    }    
};

Creep.prototype.craneGetResFromTargetId = function(res) {
    let terminal = this.room.terminal;
    let storage = this.room.storage;
    if (storage && storage.store[res] > 800) {
        return storage.id;
    } else if (terminal && terminal.store[res] > 800) {
        return terminal.id;
    }
};

Creep.prototype.craneGetStore = function(res) {
    let terminal = this.room.terminal;
    
    let targetEnergyTerminal = TERMINAL_TARGET_ENERGY_LOW;
    if (terminal && Memory.energyShare && Memory.energyShare[terminal.room.name]) {
        targetEnergyTerminal = TERMINAL_TARGET_ENERGY_SHARE;
    }
    
    if (res === RESOURCE_ENERGY) {
        if (terminal && terminal.store[RESOURCE_ENERGY] < targetEnergyTerminal){
            return terminal.id;
        } 
    }

    let storage = this.room.storage;
    if (storage) {
        return storage.id;
    }  
};


Creep.prototype.roleDeliver = function() {
    let role = "roleDeliver";
    // CHECK IF OTHER ROLE ACTIVE   
    if (!this.checkRole(role)) {return 0;}   
    // ASSIGN

    if (Array.isArray(this.memory.jobId)) {
        this.assignTarget(this.memory.jobId[0], role, this.memory[C.RESOURCE_TYPE]);   
    } else if (this.memory.jobId !== 0 ) {
        this.assignTarget(this.memory.jobId, role, this.memory[C.RESOURCE_TYPE]);
    }
    
    if (this.memory[C.CLOSEST_TARGET]) {   
        let targetObj = Game.getObjectById(this.memory[C.CLOSEST_TARGET]);
        if (!targetObj) {this.clearTarget(); }
        
        let value = this.transferAny(targetObj);
        //console.log( this +  value)
        if (value === OK )  {
            this.deleteJobId();    
            this.clearTarget();
        }   
        else if(value == ERR_NOT_IN_RANGE) {                
            this.travelTo(targetObj, {maxRooms:1, range: 1, ignoreCreeps: false});                                
        }
        else {  
            log(this + " error "+value+ " delivering! " + this.memory[C.CLOSEST_TARGET] + " has energy " + this.store[RESOURCE_ENERGY])
            log(JSON.stringify(this.memory.jobId))
            this.deleteJobId();    
            this.clearTarget();
            delete this.memory.deliver;
            return 0;
        }
        return 1;
    }
    else { return 0; }       
};

Creep.prototype.deleteJobId = function(){
    if (Array.isArray(this.memory.jobId)) {
        this.memory.jobId.splice(0, 1);
        if (this.memory.jobId.length === 0) {
            delete this.memory.jobId;
        }
    } else {
        delete this.memory.jobId;
    }
}

Creep.prototype.craneMoveToPos = function(dest) {
    
 //   let dest = this.room.getCranePos();
    if (dest && this.pos.getRangeTo(dest) > 0) {
        this.travelTo(dest, {range: 0, ignoreCreeps: true, ignoreContainer: true, ensurePath: true});        
    } else {
        return 1;
    }
};

Room.prototype.getCranePos = function(){
    
    let roomName = this.name;

    if (global.cranePos[roomName]) {
        return posLoad(global.cranePos[roomName].pos);    
    }

    if (Memory.rooms[roomName].cranePos) {
        global.cranePos[roomName] = {};
        global.cranePos[roomName].pos = posSave(posDecompress(Memory.rooms[roomName].cranePos, roomName))
    } else if (!global.cranePos[roomName] || Memory.rooms[roomName].rebuild) {
        let terminal = Game.rooms[roomName].terminal;
        let storage = Game.rooms[roomName].storage;
        if (terminal && storage) {
           
            let x = Math.floor((terminal.pos.x + storage.pos.x) / 2);
            let y = Math.floor((terminal.pos.y + storage.pos.y) / 2);
            let target = new RoomPosition(x, y, roomName);
            global.cranePos[roomName] = {};
            global.cranePos[roomName].pos = posSave(target);
            Memory.rooms[roomName].cranePos = posCompress(target)
        }
    }
    if (global.cranePos[roomName]) {
        return posLoad(global.cranePos[roomName].pos);    
    }
};