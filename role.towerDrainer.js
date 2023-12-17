'use strict'
let roleTowerDrainer = {

    /** @param {Creep} creep **/
    run: function(creep) {
        
        
        
		creep.healInRange();        
		creep.defensiveRetreatPath({kite: true});
		
        //console.log("im in: " +creep.room.name + " target is: "+ creep._memory[C.ROOM_TARGET])
        if (creep.room.name == creep._memory[C.ROOM_TARGET]){
			
			if (creep.hits <= (creep.hitsMax * 0.75) ){
				creep.travelTo(new RoomPosition(25,25, creep._memory[C.ROOM_ORIGIN]), {allowHostile:true});	
			//	console.log("retreat!")
			}			
				
        }
        else {		
			if (creep.hits == creep.hitsMax){
				if (creep._memory.enemySpawnId === undefined){
					creep.travelTo(new RoomPosition(25,25, creep._memory[C.ROOM_TARGET]), {allowHostile:true});	
				} else {
					let enemySpawn = Game.getObjectById(creep._memory.enemySpawnId)
					if (enemySpawn == undefined){
						creep.travelTo(new RoomPosition(25,25, creep._memory[C.ROOM_TARGET]), {allowHostile:true});
					} else {
						creep.travelTo(enemySpawn, {allowHostile:true, maxOps:20000});		
						
					}		
				}				
			} else {
				creep.travelTo(new RoomPosition(25,25, creep._memory[C.ROOM_ORIGIN]), {allowHostile:true});
			}
						
        }
	}
};

module.exports = roleTowerDrainer;