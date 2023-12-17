'use strict'
let roleInvaderKillerSk = {

    /** @param {Creep} creep **/
    run: function(creep) {		

		// find master
	    if (Game.creeps[creep._memory.follow] === undefined && Game.time % 11 === 0) {

	    	let roomTarget = creep._memory[C.ROOM_TARGET]
	    	let roleTarget = creep._memory.followRole
	    	let follow = _.filter(Game.creeps, (c) => c.memory[C.ROOM_TARGET] == roomTarget && c.memory[C.ROLE] === roleTarget);	

			if (follow.length > 0 ) {
				let creepToFollow = invaderSkFindGuard(follow)
				if (creepToFollow) {
					creep._memory.follow = creepToFollow
				}
			} else {			
				creep.roleInvaderKiller(creep._memory[C.ROOM_TARGET])
			}
		}

		// Set memory status
		if (Game.creeps[creep._memory.follow]) { 
			Game.creeps[creep._memory.follow].memory.guard = creep.name 
		//	creep._memory.followRole = Game.creeps[creep._memory.follow].memory[C.ROLE]
		} else {
			delete creep._memory.RC
		}
		
		
		if (Game.creeps[creep._memory.follow] && creep._memory.RC) { 
			// IS REMOTE CONTROLLED 
		} else {
			
			if (Game.creeps[creep._memory.follow]) {
				creep.followLeader(creep._memory.follow);
			} else {
				creep.roleInvaderKiller(creep._memory[C.ROOM_TARGET])
				/*
				let attacking = creep.rangedAttackInRange();
				if (creep.pos.lookForHealReasons(3) > 0 ){
					creep.healInRange(attacking);
				}*/
			}
			
	  		
		}
	}

};
module.exports = roleInvaderKillerSk;


function invaderSkFindGuard(defenders){
	let length = defenders.length
	for (let idx = 0; idx < length; idx++) {
		if (!defenders[idx].memory.guard || !Game.creeps[defenders[idx].memory.guard]) {
			return defenders[idx].name
		}
	}
}