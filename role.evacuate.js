'use strict'
let roleEvacuate = {

    /** @param {Creep} creep **/
    run: function(creep) {

        creep.say("evacuate!")
        let targetDest;
    //    console.log(creep + " evacuate! " + creep._memory[C.ROOM_TARGET]);
        if (!creep._memory.evacuate.fleeDest) {
            targetDest = pullIdlePosForRoom(creep._memory.evacuate.roomFleeTarget);
            creep._memory.evacuate.fleeDest = posCompress(targetDest);
        } else {            
            targetDest = posDecompress(creep._memory.evacuate.fleeDest, creep._memory.evacuate.roomFleeTarget);
        }

        let wantedRange = 5;
        if (creep._memory.peek) {            
            if (creep.room.name === creep._memory[C.ROOM_TARGET]) {
                delete creep._memory.peek;
            } else {
                targetDest = new RoomPosition(25, 25, creep._memory[C.ROOM_TARGET]);
                creep.travelTo(targetDest, {range: 20});
            }
        } else if (creep.room.name !== creep._memory.evacuate.roomFleeTarget || 
        //    creep.pos.getRangeTo(targetDest) > wantedRange ||
            creep.pos.isNearExit(3)
        ) { // MOVE TOWARDS TARGET ROOM
            creep.travelTo(targetDest, {range: wantedRange-3});
            if (creep.fatigue) { creep.drop(RESOURCE_ENERGY); }
        } else {
            if (!creep.defensiveRetreatPath() ) {
                creep.yieldRoad(targetDest);
            }
        }

        



        if (creep._memory.evacuate.release || Game.time > creep._memory.evacuate.nukeTimer) {
            revertEvacuateCreep(creep);
        }
        
        if (creep.isCombatCreep() ) {
            if (creep.hasBodyparts(RANGED_ATTACK)) { creep.rangedAttackInRange() }
            if (creep.hasBodyparts(ATTACK)) { creep.meleeAttackInRange() }
            if (creep.hasBodyparts(HEAL)) { creep.healInRange() }
        }
	}
};

module.exports = roleEvacuate;