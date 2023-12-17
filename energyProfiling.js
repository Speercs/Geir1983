'use strict'
module.exports = function () {

    if (!global.ENABLE_ENERGY_PROFILING) { return; }

    // Monkey Patch all energy spending functions

    if (Memory.EP === undefined) { Memory.EP = {}; }  
    
    
    /*
    Creep.prototype._EPupgradeController = Creep.prototype.upgradeController; // OLD METHOD
	Creep.prototype.upgradeController = function (...myArgumentsArray){
        
        let returnValue = this._EPupgradeController.apply(this, myArgumentsArray);
        if (returnValue === OK) {
            
        }

        return returnValue;
    };*/

    global.checkEP = function(roomName) {
        if (Memory.EP[roomName] === undefined) { 
            Memory.EP[roomName] = {}; 
            Memory.EP[roomName].ts = Game.time + 1500;
        }
    } 

    global.energyProfileCreep = function(spawner, role, cost){
        global.checkEP(spawner);

        if (Memory.EP[spawner].creeps === undefined) { 
            Memory.EP[spawner].creeps = {};
        }

        if (Memory.EP[spawner].creeps[role] === undefined) { 
            Memory.EP[spawner].creeps[role] = {};
            Memory.EP[spawner].creeps[role].raw = 0;
            Memory.EP[spawner].creeps[role].ept = 0;
        }

        Memory.EP[spawner].creeps[role].raw += cost;

    }

    // Replace with controller progress check?
    Creep.prototype._EPupgradeController = Creep.prototype.upgradeController; // OLD METHOD
	Creep.prototype.upgradeController = function (...myArgumentsArray){
        
        let returnValue = this._EPupgradeController.apply(this, myArgumentsArray);
        if (returnValue === OK) {
            global.checkEP(this.room.name);

            if (Memory.EP[this.room.name].upgrade === undefined) { 
                Memory.EP[this.room.name].upgrade = {};
                Memory.EP[this.room.name].upgrade.raw = 0;
                Memory.EP[this.room.name].upgrade.ept = 0;
            }
            Memory.EP[this.room.name].upgrade.raw += this.hasBodyparts(WORK);
        }

        return returnValue;
    };
    
    Creep.prototype._EPharvest = Creep.prototype.harvest; // OLD METHOD
	Creep.prototype.harvest = function (...myArgumentsArray){
        
        let returnValue = this._EPharvest.apply(this, myArgumentsArray);

        
        if (returnValue === OK) {
            let roomName = this.memory[C.ROOM_ORIGIN] || this.room.name;
            global.checkEP(roomName);

            let EP = Memory.EP[roomName];

            if (EP.harvest === undefined) { 
                EP.harvest = {};
                EP.harvest.raw = 0;
                EP.harvest.ept = 0;
            }
            EP.harvest.raw += Math.min(myArgumentsArray[0].energy, this.hasBodyparts(WORK) * HARVEST_POWER) || 0;
        }

        return returnValue;
    };

    Creep.prototype._EPrepair = Creep.prototype.repair; // OLD METHOD
	Creep.prototype.repair = function (...myArgumentsArray){
        
        let returnValue = this._EPrepair.apply(this, myArgumentsArray);

        let roomName = this.memory[C.ROOM_ORIGIN] || this.room.name;
        if (returnValue === OK) {
            global.checkEP(roomName);

            let EP = Memory.EP[roomName];
            let target = myArgumentsArray[0];

            if (target.isContainer) {

                if (EP.repairContainer === undefined) { 
                    EP.repairContainer = {};
                    EP.repairContainer.raw = 0;
                    EP.repairContainer.ept = 0;
                }
                EP.repairContainer.raw += this.hasBodyparts(WORK);
            } else if (target.isRampart) {

                if (EP.repairRampart === undefined) { 
                    EP.repairRampart = {};
                    EP.repairRampart.raw = 0;
                    EP.repairRampart.ept = 0;
                }
                EP.repairRampart.raw += this.hasBodyparts(WORK);

            } else if (target.isRoad) {

                if (EP.repairRoad === undefined) { 
                    EP.repairRoad = {};
                    EP.repairRoad.raw = 0;
                    EP.repairRoad.ept = 0;
                }
                EP.repairRoad.raw += this.hasBodyparts(WORK);
            } else {

                if (EP.repair === undefined) { 
                    EP.repair = {};
                    EP.repair.raw = 0;
                    EP.repair.ept = 0;
                }
                EP.repair.raw += this.hasBodyparts(WORK);
            }

            
        }

        return returnValue;
    };

    Creep.prototype._EPbuild = Creep.prototype.build; // OLD METHOD
	Creep.prototype.build = function (...myArgumentsArray){
        
        let returnValue = this._EPbuild.apply(this, myArgumentsArray);

       
        if (returnValue === OK) {

            let roomName = this.memory[C.ROOM_ORIGIN] || this.room.name;
            global.checkEP(roomName);

            let EP = Memory.EP[roomName];

            if (EP.build === undefined) { 
                EP.build = {};
                EP.build.raw = 0;
                EP.build.ept = 0;
            }

            EP.build.raw += this.hasBodyparts(WORK);
        }

        return returnValue;
    };

    StructureTower.prototype._EPattack = StructureTower.prototype.attack; // OLD METHOD
	StructureTower.prototype.attack = function (...myArgumentsArray){
        let returnValue = this._EPattack.apply(this, myArgumentsArray);

        let roomName = this.memory[C.ROOM_ORIGIN] || this.room.name;
        if (returnValue === OK) {
            global.checkEP(roomName);


            if (Memory.EP[roomName].towerAttack === undefined) { 
                Memory.EP[roomName].towerAttack = {};
                Memory.EP[roomName].towerAttack.raw = 0;
                Memory.EP[roomName].towerAttack.ept = 0;
            }
            Memory.EP[roomName].towerAttack.raw += TOWER_ENERGY_COST;
        }

        return returnValue;
    }

    StructureTower.prototype._EPheal = StructureTower.prototype.heal; // OLD METHOD
	StructureTower.prototype.heal = function (...myArgumentsArray){
        let returnValue = this._EPheal.apply(this, myArgumentsArray);

        let roomName = this.memory[C.ROOM_ORIGIN] || this.room.name;
        if (returnValue === OK) {
            global.checkEP(roomName);


            if (Memory.EP[roomName].towerHeal === undefined) { 
                Memory.EP[roomName].towerHeal = {};
                Memory.EP[roomName].towerHeal.raw = 0;
                Memory.EP[roomName].towerHeal.ept = 0;
            }
            Memory.EP[roomName].towerHeal.raw += TOWER_ENERGY_COST;
        }

        return returnValue;
    }

    StructureTower.prototype._EPrepair = StructureTower.prototype.repair; // OLD METHOD
	StructureTower.prototype.repair = function (...myArgumentsArray){
        let returnValue = this._EPrepair.apply(this, myArgumentsArray);

        let roomName = this.memory[C.ROOM_ORIGIN] || this.room.name;
        if (returnValue === OK) {
            global.checkEP(roomName);


            if (Memory.EP[roomName].towerRepair === undefined) { 
                Memory.EP[roomName].towerRepair = {};
                Memory.EP[roomName].towerRepair.raw = 0;
                Memory.EP[roomName].towerRepair.ept = 0;
            }
            Memory.EP[roomName].towerRepair.raw += TOWER_ENERGY_COST;
        }

        return returnValue;
    }

    StructureTerminal.prototype._EPsend = StructureTerminal.prototype.send; // OLD METHOD
	StructureTerminal.prototype.send = function (...myArgumentsArray){
        
        let returnValue = this._EPsend.apply(this, myArgumentsArray);

        let roomName = this.room.name;
        if (returnValue === OK) {
            global.checkEP(roomName);

            let cost = Game.market.calcTransactionCost(myArgumentsArray[1], roomName, myArgumentsArray[2]);

            if (myArgumentsArray[0] === RESOURCE_ENERGY) {

                if (Memory.EP[roomName].terminalSendEnergy === undefined) { 
                    Memory.EP[roomName].terminalSendEnergy = {};
                    Memory.EP[roomName].terminalSendEnergy.raw = 0;
                    Memory.EP[roomName].terminalSendEnergy.ept = 0;
                }
                Memory.EP[roomName].terminalSendEnergy.raw += cost;

            } else if (BASE_MINERALS_OBJECT[myArgumentsArray[0]]) { 

                if (Memory.EP[roomName].terminalSendMinerals === undefined) { 
                    Memory.EP[roomName].terminalSendMinerals = {};
                    Memory.EP[roomName].terminalSendMinerals.raw = 0;
                    Memory.EP[roomName].terminalSendMinerals.ept = 0;
                }
                Memory.EP[roomName].terminalSendMinerals.raw += cost;

            } else {

                if (Memory.EP[roomName].terminalSend === undefined) { 
                    Memory.EP[roomName].terminalSend = {};
                    Memory.EP[roomName].terminalSend.raw = 0;
                    Memory.EP[roomName].terminalSend.ept = 0;
                }
                
                Memory.EP[roomName].terminalSend.raw += cost;
            } 
        }

        return returnValue;
    };

};
