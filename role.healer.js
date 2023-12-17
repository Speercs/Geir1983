'use strict'
let roleHealer = {

	/** @param {Creep} creep **/
	run: function (creep) {

		if (creep._memory.attId) {
			registerAttacker(creep, creep._memory[C.ROOM_TARGET], creep._memory.attId);
		}
		
		
		// find master
		if (Game.creeps[creep._memory.follow] === undefined && 
			(!creep._cache.searchTs || Game.time > creep._cache.searchTs)) {

			if(creep._memory.sqaudId && creep._memory.squadPaired && creep._memory.noValidTargets)	{	// done my job here!
				creep._memory[C.ROLE] = "rangedAttacker";
				return;
			}

			creep._cache.searchTs = Game.time + 7;
			let follow = creep.room.find(FIND_MY_CREEPS, {
				filter: function (object) {
					return (object.memory[C.ROLE] === creep._memory.followRole);
				}
			});

			if (follow.length > 0) {
				let creepToFollow;
				if (creep._memory.sqaudId && !creep._memory.squadPaired) {
					creepToFollow = healerFindSquadMate(follow, creep._memory.sqaudId);
				} else {
					creepToFollow = healerFindDefender(follow);
					if (!creepToFollow)	{
						
					}
				}
				
				if (creepToFollow) {
					creep._memory.follow = creepToFollow;					
				}
			} else {
				if (creep._memory.sqaudId && creep._memory.squadPaired) {
					creep._memory.noValidTargets = 1;
				}
			}
		}

		for (let idx in creep._memory.appBoosts) {
			let boost = creep._memory.appBoosts[idx]
			if (creep.applyBoost(boost, true)) { return; }
		}
		delete creep._memory.appBoosts


		if (creep._memory.boost && creep._memory.follow) {			
			if (creep.applyBoost(T3_MOVE, true)) { return; }
			if (creep.applyBoost(T3_TOUGH, true)) { return; }
			if (creep.applyBoost(T3_HEAL, true)) { return; }
			if (creep.applyBoost(T3_RANGED_ATTACK)) { return; }
			delete creep._memory.boost;
		}

		if (!creep._memory[C.BOOSTED] && !Game.creeps[creep._memory.follow] && creep.room.name === creep._memory[C.ROOM_ORIGIN]) {
			
			if (!creep._memory.birth) { creep._memory.birth = Game.time; }
			if (Game.time > CREEP_LIFE_TIME + creep._memory.birth) {
				creep.recycleOrSuicide();
				return;
			}
			creep.refreshTTL();
		}

		// Set memory status
		if (Game.creeps[creep._memory.follow]) {
			Game.creeps[creep._memory.follow].memory.healer = creep.name;
			creep._memory.followRole = Game.creeps[creep._memory.follow].memory[C.ROLE];
		} else {
			delete creep._memory.RC;
		}

		if (Game.creeps[creep._memory.follow] && creep._memory.RC) {
			// IS REMOTE CONTROLLED 

		} else {
			creep.followLeader(creep._memory.follow);
			if (!Game.creeps[creep._memory.follow]) {
				creep.defensiveRetreatPath();
			}
		}

		if (!creep._cache.echoHeal && creep._memory.follow) {
			let followingCreep = Game.creeps[creep._memory.follow];
			if (followingCreep) {
				creep._cache.echoHeal = followingCreep.id;
			}
		}


		if (creep.room.memory.hostileRoom || 
			creep.pos.lookForHealReasons(4) > 0
		) {
			creep.healInRange();
		//	creep.say("heal!")
		}

		if (creep.hasBodyparts(RANGED_ATTACK)) {
			creep.rangedAttackInRange();
		}

	}
};
module.exports = roleHealer;