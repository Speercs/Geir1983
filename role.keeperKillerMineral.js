'use strict'
let roleKeeperKillerMineral = {

    /** @param {Creep} creep **/
    run: function(creep) {
				
		creep.roleKeeperKillerMineral();
					
	}
};
module.exports = roleKeeperKillerMineral;

Creep.prototype.roleKeeperKillerMineral = function() {	

	if (this._memory[C.TARGET_POS] === undefined) {
        if (Memory.rooms[this._memory[C.ROOM_TARGET]] && Memory.rooms[this._memory[C.ROOM_TARGET]].minerals) {
            this._memory[C.TARGET_POS] = Memory.rooms[this._memory[C.ROOM_TARGET]].minerals.pos;
        } else {
			this._memory[C.TARGET_POS] =  posCompress(pullIdlePosForRoom(this._memory[C.ROOM_TARGET]));
		}
	}
	let rangedAttacking;
	let attacking;
	let target;
	let enemy;

	let range = 3; 
	if (this.hasBodyparts(ATTACK)) {
		range = 1;
	}

	if (this.room.name === this._memory[C.ROOM_TARGET]){
		if (!this._memory[C.TICKS_TO_TARGET]) { this._memory[C.TICKS_TO_TARGET] = CREEP_LIFE_TIME - this.ticksToLive}
		target = Game.getObjectById(this._memory[C.SOURCE_ID]);		

		if (target && this._cache.lairId === undefined) {
			let lair = _.filter(this.room.findByType(STRUCTURE_KEEPER_LAIR),
				function (structure) {
					return (structure.pos.getRangeTo(target) <= 6)
				});
			if (lair.length > 0) {
				this._cache.lairId = lair[0].id;
			}
		}

		let lair =  Game.getObjectById(this._cache.lairId);	

        let enemies = target.pos.lookForEnemyCreepsAround(6);
        if (enemies.length > 0){
            enemy = enemies[0];
            if (this.pos.getRangeTo(enemies[0]) > range){
				this.travelTo(enemies[0].pos, {allowSK:true, range:range});
				this._memory[C.TARGET_POS] = posCompress(enemies[0].pos);
            }
		} else if (lair && this.pos.getRangeTo(lair) > range){
			this.travelTo(lair.pos, {allowSK:true, range: range});
			this._memory[C.TARGET_POS] = posCompress(lair.pos);		
        } else if (!lair && this.pos.getRangeTo(target) > 3) {
			this.travelTo(target.pos, {allowSK:true, range:3});
			this._memory[C.TARGET_POS] = posCompress(target.pos);
        } if (this.pos.isNearExit(0)  ) { 
			this.travelTo(target.pos, {allowSK:true, range:1});
		}

        if (range === 1 && this.meleeAttackInRange(enemy) === OK) {
            attacking = true;
        }

	} else {
		let pos = posDecompress(this._memory[C.TARGET_POS], this._memory[C.ROOM_TARGET]);
		this.travelTo(pos, {range:1, allowSK:true, roomCallback: avoidSKcreeps});
	}

	if (range === 3){
		let kite = true;
		if (this.hits < this.hitsMax*0.8) {
			kite = false;
		}
		
		this.defensiveRetreatPath({ kite: kite });
	
		// if (this.getActiveBodyparts(RANGED_ATTACK) > 0) {
		rangedAttacking = this.rangedAttackInRange(enemy);
	} 
	
	//}
	if (this.pos.lookForHealReasons(4) > 0 && !attacking) {
		this.healInRange(rangedAttacking);
	}
	
};