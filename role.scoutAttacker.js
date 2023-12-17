'use strict'
let roleScoutAttacker = {

    /** @param {Creep} creep **/
    run: function(creep) {
        
        
    
        
	  
        
        if (creep._memory[C.ROOM_TARGET] == 0 || creep._memory[C.ROOM_TARGET] === undefined) {
            creep._memory[C.ROOM_TARGET] = creep._memory[C.ROOM_ORIGIN];

        }
        //console.log("im in: " +creep.room.name + " target is: "+ creep._memory[C.ROOM_TARGET])
        if (creep.room.name == creep._memory[C.ROOM_TARGET]){

            let targetConstructionSites = creep.pos.findClosestByRange(FIND_HOSTILE_CONSTRUCTION_SITES);
            //  console.log("target structures: " +targetConstructionSites )
            let targetStructures = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {
                filter: (structure) => {
                return (structure.structureType != STRUCTURE_CONTROLLER) }});   
          //  console.log("target structures: " +targetStructures )
            let targetCreeps = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
			
            if(targetCreeps) {
                if(creep.attack(targetCreeps) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetCreeps, {ignoreDestructibleStructures: true, maxRooms:1} );

                }
            }
            else if (targetStructures){
                    if(creep.attack(targetStructures) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetStructures, {ignoreDestructibleStructures: true});
                }
            }
            else if (targetConstructionSites){
                    creep.moveTo(targetConstructionSites);
                    if(creep.attack(targetConstructionSites) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetConstructionSites ,{ignoreDestructibleStructures: true});
                    console.log("move")
                }
            }

            
        }
        else {				
			let flags = _.filter(Object.keys(Game.flags), flag => (Game.flags[flag].pos.roomName == creep._memory[C.ROOM_TARGET]));			
			if (flags.length > 0) {
				//let closestTarget = creep.pos.findClosestByPath(flags);      
				creep.moveTo(Game.flags[flags[0]]);					
            }
			else {			
				// Find the way yourself!
				creep.moveTo(new RoomPosition(25,25, creep._memory[C.ROOM_TARGET]));
				//let exitDir = creep.room.findExitTo(creep._memory[C.ROOM_TARGET]);
				//let exit = creep.pos.findClosestByRange(exitDir);
				//creep.moveTo(exit);
			}
        }
	}
};

module.exports = roleScoutAttacker;