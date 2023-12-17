'use strict'
let roleInvaderKiller = {

  /** @param {Creep} creep **/
  run: function (creep) {

	registerAttacker(creep, creep._memory[C.ROOM_TARGET]);

    if (BOT_MODE && !creep._memory.pita && creep.ticksToLive < 50 && !Memory.rooms[creep.room.name].hostiles && !creep._memory.kamikaze) {
		creep._memory.kamikaze = 1;
		let roomToTarget = [];
		findClosestHostileBase(creep._memory[C.ROOM_TARGET], roomToTarget);
		if (roomToTarget.length > 0) {
			console.log(creep + " in " + creep._memory[C.ROOM_TARGET] + " found kamikaze target " + roomToTarget[0]);
			creep._memory[C.ROOM_TARGET] = roomToTarget[0];
		}
	} else if (creep._memory.pita) {
		creep.pitaSwitchTarget()
	}
	
	if (BOT_MODE && !creep._memory.pita && creep.groupBeforeAttack() ) {
		
		creep.say("g-" + creep._memory[C.ROOM_TARGET] )
		let rangedAttacking;
		if (creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
			rangedAttacking = creep.rangedAttackInRange();
		}

		creep.meleeAttackInRange();

		if (creep.getActiveBodyparts(HEAL) > 0 && creep.pos.lookForHealReasons(4) > 0 )  {
			creep.healInRange(rangedAttacking);
		}

		if (creep._memory.grouped && creep.room.memory.hostiles) {
			creep.roleInvaderKiller(creep._memory.groupRoom || creep.room.name);
		}
		return;
	}
    
    creep.roleInvaderKiller(creep._memory[C.ROOM_TARGET])

  }

};
module.exports = roleInvaderKiller;



