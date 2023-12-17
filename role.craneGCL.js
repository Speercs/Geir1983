'use strict'
let roleCraneGCL = {
    
    /** @param {Creep} creep **/
    run: function(creep) {
        
     //   if (creep.sleep() ) { return; }        

        let cranePos;
        if (isGCLPraiseRoomStandby(creep.room.name)) {
            cranePos = new RoomPosition(17,21, "E3N17")
        } else {
            cranePos = new RoomPosition(41,33, "E3N7")
        }

        if (!creep.pos.isThisPos(cranePos)){
            creep.travelTo(cranePos, {range: 0, maxOps: 1000});
        } else {
            creep.GCLrefreshTTL(true);
            creep.manageState();
            if((creep._memory[C.WORK] || creep._memory.jobId) && creep.sumCarry > 0 ) {//creep.sumCarry/creep.carryCapacity > 0.5)) {
                if (!creep.roleDeliver()  ) {
                    creep.roleGCLcraneEmpty();
                }
            } else {
                if (!creep.refillContainerGCL() ) {                                                                 
                    if (!creep.refillSpawnGCL() ) { 
                        creep.roleGCLcheckTombstones()
                    //    creep.sleep(1);
                    }
                }
            }
        }
        

    }
};
module.exports = roleCraneGCL;

Creep.prototype.roleGCLcheckTombstones  = function(){
    if (!Memory.energyCartTargets || !Memory.energyCartTargets[this.room.name]) { return; }
    let dist = 1;
    let top = limit(this.pos.y - dist, 0, 49);
    let left = limit(this.pos.x - dist, 0, 49);
    let bot = limit(this.pos.y + dist, 0, 49);
    let right = limit(this.pos.x + dist, 0, 49);
    let dropped = _.filter(this.room.lookForAtArea(LOOK_TOMBSTONES, top, left, bot, right, true),
        function (c) {
            return (c.tombstone.store[RESOURCE_ENERGY] >= 10);
        });
    if (dropped[0] != undefined) {
        this.withdraw(dropped[0].tombstone, RESOURCE_ENERGY);
        return;
    }
    /*
    let dropped = _.filter(this.room.lookForAtArea(LOOK_RESOURCES, top, left, bot, right, true),
        function (c) {
            return (c.resource.energy >= 10);
        });
    if (dropped[0] != undefined) {
        this.pickup(dropped[0].resource);
    }*/
}

Creep.prototype.roleGCLcraneEmpty  = function(){
    delete this.memory.jobId;
    
    let containers = this.pos.lookForStructuresAround(STRUCTURE_CONTAINER, 1)
    for (let idx in containers) {
        let container = containers[idx]
        if (!container.store[RESOURCE_ENERGY] || container.store[RESOURCE_ENERGY] < 1750 ) {
            let value = this.transferAny(container);
            if (value === OK) { 
                delete this.memory.jobId;
                this.clearTarget();
                return; 
            }
        }        
    }

    /*
    targetObj = Game.getObjectById("5abe0c4e0eae081f28f11651")   // CONTAINER 
    if (targetObj && (!targetObj.store[RESOURCE_ENERGY] || targetObj.store[RESOURCE_ENERGY] < 1750 )) {
        let value = this.transferAny(targetObj);
        if (value === OK) { 
            delete this.memory.jobId;
            this.clearTarget();
            return; 
        }
    }

    targetObj = Game.getObjectById("5abcea008d9e7b4aab30b4bd")   // CONTAINER 2
    if (targetObj && (!targetObj.store[RESOURCE_ENERGY] || targetObj.store[RESOURCE_ENERGY] < 1750 )) {
        let value = this.transferAny(targetObj);
        if (value === OK) {
            delete this.memory.jobId;
            this.clearTarget();
            return; 
        }
    }*/

    let spawns = this.pos.lookForStructuresAround(STRUCTURE_SPAWN, 1)
    for (let idx in spawns) {
        let spawn = spawns[idx];
        let value = this.transferAny(spawn);
        if (value === OK) { 
            delete this.memory.jobId;
            this.clearTarget();
            return; 
        }                
    }

    let storages = this.pos.lookForStructuresAround(STRUCTURE_STORAGE, 1)
    for (let idx in storages) {
        let store = storages[idx];
        let value = this.transferAny(store);
        if (value === OK) { 
            delete this.memory.jobId;
            this.clearTarget();
            return; 
        }                
    }

}

Creep.prototype.refillSpawnGCL = function(){
    let role = "refillSpawns";
    // CHECK IF OTHER ROLE ACTIVE   
    if (!this.checkRole(role)) {return 0;}        
    // ASSIGN   
    if (!this._memory[C.CLOSEST_TARGET]) {
        let spawns = this.pos.lookForStructuresAround(STRUCTURE_SPAWN, 1)[0]
    //    let spawns = Game.getObjectById("5a48de782f1ea82d332a312c");
        if (spawns && spawns.energy < 50 ) {
         //   if (this.carry[RESOURCE_ENERGY] > 200) {
            let storages = this.pos.lookForStructuresAround(STRUCTURE_STORAGE, 1)        
            let withdrawLocation = storages[0];

        //    let withdrawLocation = Game.getObjectById("5a48ff544f9f850ba05b6421");   
            if (withdrawLocation) { 
                // REMOVE FROM REFILL JOB
                this.memory.amount = this.carryCapacity;
                this.memory.jobId = spawns.id;
                this.assignTarget(withdrawLocation.id, role, RESOURCE_ENERGY);
            //    this.say("spawn")
            }
        }
    }
    if (this.memory[C.CLOSEST_TARGET]) { 
        return this.withdrawAction(); 
    }
};

Creep.prototype.refillContainerGCL = function(){
    let role = "refillContainerGCL";
    // CHECK IF OTHER ROLE ACTIVE   
    if (!this.checkRole(role)) {return 0;}
    // ASSIGN
    if (!this._memory[C.CLOSEST_TARGET]) {

        let containers = this.pos.lookForStructuresAround(STRUCTURE_CONTAINER, 1)
        
        if (containers.length < 2 && this.room.name === 'E3N17') {
            let pos = new RoomPosition(18, 20, 'E3N17')
            pos.createConstructionSite(STRUCTURE_CONTAINER)
            pos = new RoomPosition(18, 22, 'E3N17')
            pos.createConstructionSite(STRUCTURE_CONTAINER)
        }
        
        for (let idx in containers) {
            let container = containers[idx]
            if (!container.store[RESOURCE_ENERGY] || container.store[RESOURCE_ENERGY] < 1000 ) {
                let storages = this.pos.lookForStructuresAround(STRUCTURE_STORAGE, 1)
                let withdrawLocation = storages[0];
                if (withdrawLocation.store[RESOURCE_ENERGY] < 5000) { return 0; }
                this.memory.amount = Math.min(this.carryCapacity - this.carry[RESOURCE_ENERGY], withdrawLocation.store[RESOURCE_ENERGY]);
                this.memory.jobId = container.id;
                this.assignTarget(withdrawLocation.id, role, RESOURCE_ENERGY);
                break;
            }
        }

        


        /*
        if (containers.lenght < 2) {

        }*/
    }
    if (this.memory[C.CLOSEST_TARGET]) { 
     //   console.log("withdrawing from " + this.memory[C.CLOSEST_TARGET] + " amount " + this.memory.amount)
        return this.withdrawAction(this.memory.amount); 
    }
};