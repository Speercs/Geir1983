'use strict'
let rolePowerBankRaider = {

    /** @param {Creep} creep **/
    run: function(creep) {

        if (creep._memory.boost) {
            if( creep.applyBoost(T3_ATTACK, true) ) { return; }
            if( creep.applyBoost(T3_TOUGH, true) ) { return; }
            delete creep._memory.boost;
        }

        // PREVENT STARTING CREEP BEFORE HEALER ASSIGNED
        let remoteHealer = Game.creeps[creep._memory.healer];
		if (!creep._memory[C.STARTED] && !remoteHealer) { 
            creep.yieldRoad(creep.pos)
            return
         }
		creep._memory[C.STARTED] = 1;
        
		creep.PowerBankRaider(creep._memory.bankId);
	}
};
module.exports = rolePowerBankRaider;

Creep.prototype.PowerBankRaider = function (id) {
    this._memory.ttl = this.ticksToLive;	// for checking of creep died early
    let powerBank = Game.getObjectById(id);

    if (!powerBank) {
        if (this._memory.recycle) {
            if (this.room.name !== this._memory[C.ROOM_ORIGIN] || this.pos.isNearExit(1)) {
                const labPos = Game.rooms[this._memory[C.ROOM_ORIGIN]].labIdlePos();
                this.moveAsOne(labPos, this._memory.healer, {range: 1, ignoreRoads: true, preferHighway: true, moveAsOne: Game.creeps[this._memory.healer]});
            } else {
                this.unBoost();
            }
        } else if (Game.rooms[this._memory[C.ROOM_TARGET]] && 
            Game.rooms[this._memory[C.ROOM_TARGET]].memory &&
            this.room.name === this._memory[C.ROOM_TARGET]
            ) {
         //   delete Memory.rooms[this._memory[C.ROOM_TARGET]].powerBank;
            if (!this.room.memory.hostiles) {
                this._memory.suicide = 1;
                if (this._memory[C.BOOSTED] && this._memory[C.TICKS_TO_TARGET] < this.ticksToLive) {
                    this._memory.recycle = 1;
                } else {
                    this.recycleOrSuicide();
                }
                if (Game.creeps[this._memory.healer]) { Game.creeps[this._memory.healer].recycleOrSuicide(); }
                return;
            } else {
                this.meleeAttackInRange();
                let dest = posLoad(this._memory.bankPos);
                let targetHostile = dest.getBestNearbyCreepTarget(6);
                if (targetHostile) {
                    this.moveAsOne(targetHostile, this._memory.healer, {range: 0, ignoreRoads: true, preferHighway: true, moveAsOne: Game.creeps[this._memory.healer]});
                } else {                    
                    this.moveAsOne(dest, this._memory.healer, {range: 2, ignoreRoads: true, preferHighway: true, moveAsOne: Game.creeps[this._memory.healer]});
                }
            }
        } else {
            if (this._memory.bankPos) {
                let dest = this._memory.bankPos;
                this.moveAsOne(dest, this._memory.healer, {range: 1, ignoreRoads: true, preferHighway: true, moveAsOne: Game.creeps[this._memory.healer]});               
            } else {
                let dest = pullIdlePosForRoom(this._memory[C.ROOM_TARGET])
                this.moveAsOne(dest, this._memory.healer, {range: 1, ignoreRoads: true, preferHighway: true, moveAsOne: Game.creeps[this._memory.healer]});
            //	this.travelTo(dest, { range: 1 });
            }
            this._memory[C.TICKS_TO_TARGET] += 1;
            if (Game.creeps[this._memory.healer]) { Game.creeps[this._memory.healer].memory[C.TICKS_TO_TARGET] = this._memory[C.TICKS_TO_TARGET]; }
        }
    } else {
        if (!this._memory.bankPos) { this._memory.bankPos = posSave(powerBank.pos); }

        let hpModifier = 1.0;
        /*
        let hpModifier = 0.9;
        if (this._memory[C.BOOSTED]) {
            hpModifier = 1.0;
        }*/

        if (this._cache.chasing === undefined ) { this._cache.chasing = 0;}

        let healer = Game.creeps[this._memory.healer]
        if (this.room.memory && 
            this.room.name === this._memory[C.ROOM_TARGET] &&
            this.room.memory.hostiles && 
            (healer && 
            healer.hits < healer.hitsMax) ||
            (!this.room._cache.pbWar || 
            Game.time >= this.room._cache.pbWar) || 
            !powerBank.pos.myCombatStrengthLarger(5)
        ){



            if (
                (this.room._cache.pbWarActive &&
                this.room._cache.pbWarActive > Game.time) || 
                (healer && 
                healer.hits < healer.hitsMax) || 
                this.pos.myCombatStrengthLarger(3)
                ) {
                    
                if (this.room._cache.pbWarActive < Game.time) {
                    delete this._cache.lastTarget;
                    this.room._cache.pbWarActive = Game.time + 9;
                }
                
                let chaseRange = Math.max(2, 7 - Math.floor(this._cache.chasing/10));  
                this.say(chaseRange)
                let targetHostile;
                if (chaseRange <= 3) {

                    if (Memory.attackTarget[this.room.name] === undefined && Memory.powerBanks[this.room.name]) {
                        orderRangedAttackers(this.room.name, 1000, 'powerBank');
                    }

                    if (Memory.powerBanks[this.room.name].hostilePower === undefined) { Memory.powerBanks[this.room.name].hostilePower = 0;}
                    Memory.powerBanks[this.room.name].hostilePower = Math.max(Memory.powerBanks[this.room.name].hostilePower, this.room.memory.hostiles.power.defensive)


                    targetHostile = powerBank.pos.getBestNearbyCreepTarget(chaseRange);
                } else {
                    targetHostile = this.pos.getBestNearbyCreepTarget(chaseRange);
                }

              //  targetHostile = this.getBestNearbyCreepTarget(chaseRange);
                if (!targetHostile && this._cache.lastTarget) {
                    targetHostile = Game.getObjectById(this._cache.lastTarget);
                }
                
                healer = Game.creeps[this._memory.healer]
                if (this.room.memory.hostiles && 
                    ((this.hits < 3500 || healer && healer.hits < healer.hitsMax * 0.9) ||
                    !this.pos.myCombatStrengthLarger(3))
                ){
                    if (healer) {
                        let pbRaiderName = this.name;
                        Game.creeps[this._memory.healer].defensiveRetreatPath( { fleeAsOne: pbRaiderName });
                    //    let dest = new RoomPosition(25, 25, this.room.name);                        
                    //    healer.moveAsOne(dest, this.name, {range: 12, ignoreCreeps: false, moveAsOne: me});
                    } else {
                    //    this.defensiveRetreatPath();
                    }
                    this.meleeAttackInRange();
                    this.say("flee!");
                    return;
                } else if (targetHostile) {
                 //   let targetHostile = this.pos.findClosestByRange(targets);
                  //  let targetHostile = this.getBestNearbyCreepTarget(chaseRange);
                   
                    this._cache.chasing += 2;
                    this._cache.lastTarget = targetHostile.id;
                //    console.log(this.room.name + " pb hostiles " + this.room.memory.hostiles.power.defensive + " attacking " + targetHostile.owner.username);
                    this.meleeAttackInRange(targetHostile);
                //    let dest = targetHostile.pos.pullSiegeFormation(this.pos);
                    this.moveAsOne(targetHostile, this._memory.healer, {range: 0, maxOps: 2000, moveAsOne: Game.creeps[this._memory.healer]});
                    return;	
                   
                } else {
                    delete this.room._cache.pbWarActive;
                }
            } else {
                this.room._cache.pbWar = Game.time + 5;    // WAIT UNTIL NEXT CHECK
            }
        }
        /*
        let init = Game.cpu.getUsed();	
       
		let test = target.pos.pullSiegeFormationV2(this.pos);
	
        let used = Game.cpu.getUsed()-init;
        console.log("new pull " + used)
        init = Game.cpu.getUsed();	
        */
        let targetPos = powerBank.pos.pullSiegeFormation(this.pos, false);
        let wantedRange = 0;
        if (targetPos.isThisPos(powerBank.pos)) {
            wantedRange = 1;
        }
   //     let used = Game.cpu.getUsed()-init;
     //   console.log("old pull " + used)
        let rangeToTarget = this.pos.getRangeTo(targetPos);
    //    this.room.visual.circle(targetPos.x, targetPos.y , {fill: 'transparent', radius: 0.50, stroke: 'blue'});
    
        if (rangeToTarget > 3){
            this._memory[C.TICKS_TO_TARGET] += 1;
            if (healer) { healer.memory[C.TICKS_TO_TARGET] = this._memory[C.TICKS_TO_TARGET]; }   
        }
        
        if (rangeToTarget > wantedRange) {
            this.moveAsOne(targetPos, this._memory.healer, {range: wantedRange, preferHighway: true, roomCallback: pbMatrix, ignoreRoads: true, moveAsOne: healer});
        }


        if (this.pos.getRangeTo(powerBank) <= 1) {            
            if (this.hits >= (this.hitsMax * hpModifier) && 
                !this.delayForPBHaulers(powerBank)
            ){
                this.attack(powerBank);
                if (this._memory[C.STARTED] === undefined) {
                    this._memory[C.STARTED] = 1;
                }

                if (healer && healer.pos.isNearTo(this)) {
                    healer._healInRange = 1;
                    healer.heal(this);
                }
            }
            if (healer && healer.pos.isNearExit(0) || this.pos.getRangeTo(healer) > 1 ) {				
                this.moveAsOne(targetPos, this._memory.healer, {range: 0, roomCallback: pbMatrix, preferHighway: true, ignoreRoads: true, moveAsOne: Game.creeps[this._memory.healer]});
            }

            if (this._cache.chasing > 0) {
                if (Game.time % 10 === 1) {
                    this._cache.chasing = Math.max(0, this._cache.chasing - 2);
                }
            }
        }
    }
};