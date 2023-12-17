'use strict'
module.exports = function () {

    /*
    class LivingEntity extends RoomObject {

    }

    Creep.prototype.__proto__ = LivingEntity.prototype;
    PowerCreep.prototype.__proto__ = LivingEntity.prototype;
    global.LivingEntity = LivingEntity;
    */

    PowerCreep.prototype.isPowerCreep = true; 

    Object.defineProperty(PowerCreep.prototype, '_memory', {
        get: function() {            
            return Memory.powerCreeps [this.name] = Memory.powerCreeps [this.name] || {};
        },
        set: function(value) {            
            Memory.powerCreeps [this.name] = value;
        },
        enumerable: false,
		configurable: true
    });    

    Object.defineProperty(PowerCreep.prototype, '_cache', {
        get: function() {            
            return global.creepsCacheMem[this.name] = global.creepsCacheMem[this.name] || {};
        },
        set: function(value) {            
            global.creepsCacheMem[this.name] = value;
        },
		enumerable: false,
		configurable: true
    });

    PowerCreep.prototype.oprEco = function () {
        
        if (this.staySafe() ) { 
            this.generateOps();
            return ;
        }
        
        if (this.sleep() ) {
            this.idleOffRoad(this.pos);
            this.generateOps();
			return 0;
        }

        
        if (this.enablePower() ) { return; }

        if ((!this.memory[C.ASSIGNED_ROLE] || this.memory[C.ASSIGNED_ROLE] === 'refreshTTL') && this.room.name !== this.memory[C.ROOM_TARGET]) {

            this.generateOps();
            if (this.refreshTTL(3500)) { return; }
            this.returnHome();            
            return;
        }        

        
        if (!this.refreshTTL() ) {
            if (!this.regenMineral() ) {
               if (!this.regenSource() ) {
                    if (!this.refillExtensions() ) {
                        if (!this.restockNearbyEnergy() ) {
                            if (!this.powerLabs() ) {
                                if (!this.powerSpawns(!this.room.memory.sieged) ) {
                                    if (!this.powerFactory() ){
                                        if (!this.storeOps() ) {     
                                            if ((this.powers[PWR_OPERATE_FACTORY] || this.powers[PWR_OPERATE_SPAWN]) && !this.restockOps(250) ){
                                                this.sleep(5);
                                                this.idleOffRoad(this.pos);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        this.refillExtensionsIfNear();
        this.fillWhileMoving();
        this.generateOps();
    }


    PowerCreep.prototype.oprAtk = function () {

      
        // go to target room
        // refill ops
        // refresh ttl


        if (!this.disruptSpawn() ) {
            
        }

        this.createShield();


        if (this.canUsePower(PWR_GENERATE_OPS)) {
            this.generateOps();
        }

        
        
    }
    
    PowerCreep.prototype.oprGCL = function () {
        
        if (this.sleep() ) {
            this.idleOffRoad(this.pos);
            this.generateOps();
			return 0;
        }

        if (this.enablePower() ) { return; }

        if (!this.refreshTTL() ) {
            if (!this.powerStorage() ) {
                if (!this.restockOps() ) {                
                    this.sleep(5);
                    this.idleOffRoad(this.pos);
                }
            }
        }
        
        this.generateOps();

    }

    PowerCreep.prototype.oprDef = function () {

        if (this.staySafe() ) { 
            this.generateOps();
            return ;
        }

        if (this.sleep() ) {            
            this.idleOffRoad(this.pos);
            this.generateOps();
			return 0;
        }

        if (this.enablePower() ) { return; }

        if (!this.memory[C.ASSIGNED_ROLE] && this.room.name !== this.memory[C.ROOM_TARGET]) { 
            this.returnHome();
            return;
        }

        if (!this.refreshTTL() ) {
            if (!this.restockNearbyEnergy() ) {
                if (!this.powerTowers() ) {
                    if (!this.powerSpawns() ) {
                        if (!this.refillExtensions() ) {
                            if (!this.restockOps(500) ) {
                                this.sleep(5);
                                this.idleOffRoad(this.pos);
                            }
                        }
                    }
                }
            }
        }
        
        this.refillExtensionsIfNear();
        this.generateOps();
    }
  
    
    /*
    Object.defineProperty(PowerCreep.prototype, 'body', {
        get: function() {            
            return [];
        },
        enumerable: false,
		configurable: true
    });

    Object.defineProperty(PowerCreep.prototype, 'fatigue', {
        get: function() {            
            return 0;
        },
        enumerable: false,
		configurable: true
    });*/

    PowerCreep.prototype.setCreepRole = function () {
        let type = this.name.split("_");
        
     //   console.log(type[0])
        switch(type[0]){
            case 'oprEco':
                this.memory[C.ROLE] = type[0];
                break;
        }
        switch(type[0]){
            case 'oprGCL':
                this.memory[C.ROLE] = type[0];
                break;
        }
        switch(type[0]){
            case 'oprDef':
                this.memory[C.ROLE] = type[0];
                break;
        }
        switch(type[0]){
            case 'oprAtk':
                this.memory[C.ROLE] = type[0];
                break;
        }


    }

    Object.defineProperty(PowerCreep.prototype, 'sumCarry', {
		get: function () {
			if (this === PowerCreep.prototype || this == undefined)
				return 0;

			if (!this._sumCarry) {
				this._sumCarry = _.sum(this.carry);
			}
			return this._sumCarry;
		},
		enumerable: false,
		configurable: true
	});

    RoomObject.prototype.getEffect = function (type) {
        if (this._effectsObj !== undefined) {
            return this._effectsObj[type];
        }
        else {
            this._effectsObj = {};
            for (let idx in this.effects) {
                let effect = this.effects[idx]
                this._effectsObj[effect.power] = {};
                this._effectsObj[effect.power].level = effect.level;
                this._effectsObj[effect.power].ticksRemaining = effect.ticksRemaining;             
            }
            return this._effectsObj[type];
        }
    }

    	// FILL WHILE MOVING
    PowerCreep.prototype.fillWhileMoving = function (dist) {
		
		if (typeof dist === 'undefined') { dist = 1; }
		if (this.carry.energy == 0) { return 0; }

		let top = limit(this.pos.y - dist, 1, 48);
		let left = limit(this.pos.x - dist, 1, 48);
		let bot = limit(this.pos.y + dist, 1, 48);
		let right = limit(this.pos.x + dist, 1, 48);
	//	let rp = this.memory.rp;
		let refillTargets = _.filter(this.room.lookForAtArea(LOOK_STRUCTURES, top, left, bot, right, true),
			function (c) {
				return (//c.structure.hits < c.structure.hitsMax
					(c.structure.structureType === STRUCTURE_EXTENSION ||
					c.structure.structureType === STRUCTURE_SPAWN ||	
					c.structure.structureType === STRUCTURE_LAB ||	
					(c.structure.structureType === STRUCTURE_CONTAINER && c.structure.isController() ) ||	
					c.structure.structureType === STRUCTURE_TOWER) &&
					(c.structure.energy < c.structure.energyCapacity));
			});
			
		if (refillTargets.length > 0){
		//	console.log("found targets " + refillTargets[0].structure )
			this.transfer(refillTargets[0].structure, RESOURCE_ENERGY);
		//	this.say("fill "+returnValue)
			return 1;
		}
    }

    PowerCreep.prototype.moveAsOne = Creep.prototype.moveAsOne
    
    PowerCreep.prototype.hasBodyparts = function (part) {
        return 0;
    }
    
    PowerCreep.prototype.returnHome = function () {    
        
        if (this.memory[C.ROOM_TARGET] === undefined) {
            if (this.room.controller && this.room.controller.my && this.room.controller.isPowerEnabled) {
                this.memory[C.ROOM_TARGET] = this.room.name;
                this.setCreepRole();
            }
        }
		this.travelTo(pullIdlePosForRoom(this.memory[C.ROOM_TARGET]), {offRoad: 1, maxOps: 50000} );
    }

    PowerCreep.prototype.createShield = function () {


        if (this.canUsePower(PWR_SHIELD)) {
            let shieldCurrent = this.pos.lookForStructure(STRUCTURE_RAMPART)
            if (!shieldCurrent || (shieldCurrent.getEffect(PWR_SHIELD) && shieldCurrent.getEffect(PWR_SHIELD).ticksRemaining <= 1)) {  // Need shield here!
                return this.usePower(PWR_SHIELD);
            } else {

                let healer = Game.getObjectById(this._memory.healer)
                if (healer) {
                    shieldCurrent = healer.pos.lookForStructure(STRUCTURE_RAMPART)
                    if (!shieldCurrent || (shieldCurrent.getEffect(PWR_SHIELD) && shieldCurrent.getEffect(PWR_SHIELD).ticksRemaining <= 1)) {  // Need shield on healer pos
                        this.moveAsOne(healer, this._memory.healer)
                        return;
                    }
                }

                /*
                // Step to any place without a shield
                let directions = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT]
                for (let idx in directions) {
                    let pos = this.pos.getPositionAtDirection(directions[idx])
                    let shield = pos.lookForStructure(STRUCTURE_RAMPART)
                    if (shield) { continue; }
                    let creep = pos.lookForAnyCreep();
                    if (creep) { continue; }
                    this.moveAsOne(pos, this._memory.healer)
                    return;
                }*/
            }
        }
    }

    PowerCreep.prototype.disruptSpawn = function () {

        let role = "disruptSpawn";
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {

            if (this.canUsePower(PWR_DISRUPT_SPAWN)) {
                let spawns = _.filter(getEnemyStructures(this.room.name),
                    function (structure) {
                        return (structure.structureType === STRUCTURE_SPAWN)
                    })
                
                let bestSpawnToDisrupt;
                let bestScore = -99999;
                for (let idx in spawns) {
                    let spawn = spawns[idx];
                    if (!spawn.Spawning) { continue; }
                    if (spawn._disruptedSpawn === Game.time) { continue; }
                    
                    if (spawn.getEffect(PWR_DISRUPT_SPAWN) && spawn.getEffect(PWR_DISRUPT_SPAWN).ticksRemaining > 1) { continue; }

                    // if other pc has this as target, continue;


                    let score = -this.getRangeTo(spawn)
                    if (score > bestScore) {
                        bestSpawnToDisrupt = spawn;
                        bestScore = score;
                    }
                }
            }
        }

        if (this.memory[C.CLOSEST_TARGET]) {
            return this.applyPowerToTarget(PWR_DISRUPT_SPAWN, this.memory[C.CLOSEST_TARGET]);
        }


    }

 

    PowerCreep.prototype.staySafe = function () {
        if (!this.room.memory.hostiles) { return 0;}
        if (isOutsideWalls(this.pos)) {
            this.clearTarget();
            this.say("safe")
            this.travelTo(this.room.storage.pos, { maxRooms: 1, range: 1, roomCallback: getWallLimitMatrix, offRoad: 1})
            return 1;
        }
    }


    //CLEAR TARGET
	PowerCreep.prototype.clearTarget = function () {
		if (this.memory[C.CLOSEST_TARGET]) {
			let object = Game.getObjectById(this.memory[C.CLOSEST_TARGET]);
			if (this.memory[C.WORK]) {
				if (object) { object.deliver = -this.carryCapacity; }
			} else {
				if (object) { object.withdraw = -this.carryCapacity; }
			}
		}
		delete this.memory[C.CLOSEST_TARGET];
		delete this.memory[C.ASSIGNED_ROLE];
	};

    PowerCreep.prototype.sleep = Creep.prototype.sleep;
    /*
    PowerCreep.prototype.sleep = function (delay) {
		if (delay > 0) {
			if (this.memory.sleep === undefined) { this.memory.sleep = 0; }
			this.memory.sleep = Game.time + delay;
		}
		if (this.memory.sleep >= Game.time) {
			return 1;
		} else {
			delete this.memory.sleep;
			return 0;
		}
    };*/

    PowerCreep.prototype.idleOffRoad = function (anchor, maintainDistance = false) {
        if (this._swapped === Game.time) { return; }
		let offRoad = this.pos.lookForStructure(STRUCTURE_ROAD) === undefined;
		if (offRoad) return OK;

		let positions = _.sortBy(this.pos.openAdjacentSpots(false), (p) => p.getRangeTo(anchor));
		if (maintainDistance) {
			let currentRange = this.pos.getRangeTo(anchor);
			positions = _.filter(positions, (p) => p.getRangeTo(anchor) <= currentRange);
		}

		let swampPosition;
		for (let position of positions) {
			if (position.lookForStructure(STRUCTURE_ROAD)) continue;
			if (getRoomTerrainAt(position) === TERRAIN_MASK_SWAMP) {
				swampPosition = position;
			} else {
				return this.move(this.pos.getDirectionTo(position));
			}
		}

		if (swampPosition) {
			return this.move(this.pos.getDirectionTo(swampPosition));
		}
		return this.travelTo(anchor, {offRoad: 1});
	};
    
   

    // CHECK ROLE
    PowerCreep.prototype.checkRole = function (role) {
		if (!this.memory[C.ASSIGNED_ROLE] || this.memory[C.ASSIGNED_ROLE] === role) {
			return 1;
		}
		else {
			return 0;
		}
    };
    
    // ASSIGN TARGET
	PowerCreep.prototype.assignTarget = function (id, role, resource) {
		if (resource === undefined) { resource = RESOURCE_ENERGY; }
		let object = Game.getObjectById(id);
        if (object) {
            if (this.memory[C.WORK]) {
                object.deliver = this.carry[resource || RESOURCE_ENERGY];
            } else {
                object.withdraw = this.carryCapacity - this.sumCarry;                
            }
        }
		
		this.memory[C.CLOSEST_TARGET] = id;
		this.memory[C.ASSIGNED_ROLE] = role;
		this.memory[C.RESOURCE_TYPE] = resource;
    };

    
    
    PowerCreep.prototype.enablePower = function () {
        let controller = this.room.controller;
        if (!controller || controller.isPowerEnabled || !controller.my) { return 0; }
        if (this.pos.getRangeTo(controller) > 1) {
            this.travelTo(controller, { range: 1, offRoad: 1 });
            return 1;
        } else {
            this.enableRoom(controller);
        }
    }

    PowerCreep.prototype.generateOps = function () {     
        if (this.usedPower && this.usedPower === Game.time) { return false; }   
        if (this.powers[PWR_GENERATE_OPS] && !this.powers[PWR_GENERATE_OPS].cooldown){          

            if (this.memory.noOps && Game.time < this.memory.noOps) {
                return 0;
            }

            if (this.room.store(RESOURCE_OPS) > 100000) {
                this.memory.noOps = Game.time + 99;
                return 0;
            }

            return this.usePower(PWR_GENERATE_OPS);
        }
    }

    PowerCreep.prototype.isCombatCreep = function () {
        return true;
    }

    PowerCreep.prototype.isScout = function () {
		return false;
	}

    
    PowerCreep.prototype._usePower = PowerCreep.prototype.usePower; // OLD METHOD

	PowerCreep.prototype.usePower = function (power, target){
		this.usedPower = Game.time;        
		return this._usePower(power, target);
	}

    function targetHasAppliedPowerThisTick(power, target) {
        return target._power === power
    }



    PowerCreep.prototype.canUsePower = function (power, preTicks=0) {
        if (this.usedPower && this.usedPower === Game.time) { return false; }
        if (!this.powers[power] || this.powers[power].cooldown > preTicks){ return false}
        if (POWER_INFO[power] && POWER_INFO[power].ops && POWER_INFO[power].ops > this.carry[RESOURCE_OPS] ) { return false }
        return true;
    }

    PowerCreep.prototype.applyPowerToTarget = function (power, target) {
       
        let targetObj = Game.getObjectById(target);
        if (!targetObj) { 
            this.clearTarget();
            console.log(this.room.name + " using power " + power + " on missing object ");
            return 1; 
        }
        
        let rangeToTarget = this.pos.getRangeTo(targetObj);      
        if (rangeToTarget > POWER_INFO[power].range) {
            this.travelTo(targetObj, { range: POWER_INFO[power].range, offRoad: 1 });
            return 1;
        }

        if (!this.canUsePower(power)) {
            console.log(this + "cant use power " + power + " on " + targetObj + " in room " + this.room.name)
            this.clearTarget();
            return 1;
        }

        let result = this.usePower(power, targetObj);
        if (result === OK) {
            this.clearTarget();
            
            if (power === PWR_OPERATE_FACTORY && !targetObj.cooldown) {
                this.room._cache.factorySleep = Game.time + 1;
            } else if (power === PWR_DISRUPT_SPAWN) {
                targetObj._disruptedSpawn = Game.time;
            }


            return 1;
        } else {            
            console.log(this.room.name + " using power " + power + " error " + result +" on " + targetObj + " current role " + this.memory[C.ASSIGNED_ROLE]);
            this.clearTarget();
            return 1;
        }
    }

    PowerCreep.prototype.refillExtensions = function () {
        let role = "refillExtensions";
        if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            if (!this.canUsePower(PWR_OPERATE_EXTENSION) ) { return 0; } 
            if (this.room.store(RESOURCE_OPS) < MIN_OPS_REFILL_EXTENSIONS) { return 0;}
            let missingEnergy = this.room.energyCapacityAvailable - this.room.energyAvailable;
            if (missingEnergy < 6000 ) { return; }
            if (this.room.storage && this.room.storage.store[RESOURCE_ENERGY] > missingEnergy){
                this.assignTarget(this.room.storage.id, role, RESOURCE_ENERGY);
            } 
        }

        if (this.memory[C.CLOSEST_TARGET]) {
            return this.applyPowerToTarget(PWR_OPERATE_EXTENSION, this.memory[C.CLOSEST_TARGET]);
        }       
    }

    PowerCreep.prototype.refillExtensionsIfNear = function () {

        if (!this.canUsePower(PWR_OPERATE_EXTENSION) ) { return 0; } 
        if (this.room.store(RESOURCE_OPS) < MIN_OPS_REFILL_EXTENSIONS) { return 0;}
        let missingEnergy = this.room.energyCapacityAvailable - this.room.energyAvailable;
        if (missingEnergy < 1500 ) { return; }

        let energySource = this.room.storage;
        if (this.pos.getRangeTo(energySource) < POWER_INFO[PWR_OPERATE_EXTENSION].range) {
            if (energySource.store[RESOURCE_ENERGY] > this.room.energyCapacityAvailable - this.room.energyAvailable) {
                let result = this.usePower(PWR_OPERATE_EXTENSION, energySource);
                if (result === OK) {
                    console.log(this + " applied EXTENSIONS (nearby) from " + energySource.structureType + " in room " + this.room.name + " energy " + missingEnergy )
                    return 1;
                }
            }
        }

        energySource = this.room.terminal;
        if (this.pos.getRangeTo(energySource) < POWER_INFO[PWR_OPERATE_EXTENSION].range) {
            if (energySource.store[RESOURCE_ENERGY] > this.room.energyCapacityAvailable - this.room.energyAvailable) {
                let result = this.usePower(PWR_OPERATE_EXTENSION, energySource);
                if (result === OK) {
                    console.log(this + " applied EXTENSIONS (nearby) from " + energySource.structureType + " in room " + this.room.name + " energy " + missingEnergy )
                    return 1;
                }   
            }
        }
    }

    PowerCreep.prototype.nudgeOutOfMyWay = function(fromPos) {

		let possiblePositions = [];
		for (let i = 1; i <= 8; i++) {
			let pos = this.pos.getPositionAtDirection(i);

			if (pos.isThisPos(fromPos)) { continue; }
			if (!pos.isPassible(false, false)) { continue; }
			possiblePositions.push(i);

		}

		if (possiblePositions.length > 0) {
			let dir = possiblePositions[Math.floor(Math.random()*possiblePositions.length)]
			this.move(dir)
			return true;
		}

		return false;

	}

    PowerCreep.prototype.nudgeTowardsTarget = function(fromPos) {

        if (Math.random() < 0.1) { return false; }
        let swampDir;
		if (this._cache._trav && this._cache._trav.path && this._cache._trav.path.length > 1) {

			let nextDirection = parseInt(this._cache._trav.path[0], 10);
			let nextPos = this.pos.getPositionAtDirection(nextDirection);

            if (nextPos.isThisPos(fromPos) || nextPos.isPassible(false, true)) {
				this.move(nextDirection);
				this.say("nudgedNext")
				delete this._cache._trav.path;
				return true;
			}
            
			for (let i = 1; i <= 8; i++) {

				let pos = nextPos.getPositionAtDirection(i);
				let range = nextPos.getRangeTo(pos)
				if (range > 1) { continue; }
				if (pos.isPassible(false, true)){

                    delete this._cache._trav.path;

                    if (swampDir !== undefined && getRoomTerrainAt(pos) === TERRAIN_MASK_SWAMP) {
                        swampDir = i;
                        continue; 
                    }
					this.move(i);
					this.say("nudgedPath")
					return true;
				}
			}
		} else if (this._memory[C.CLOSEST_TARGET]) {
			let target = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
			if (!target) { return false;}

			let currentDest = this.pos.getRangeTo(target)
			for (let i = 1; i <= 8; i++) {

				let pos = this.pos.getPositionAtDirection(i);
				let range = pos.getRangeTo(target)
				if (range > currentDest) { continue; }
				if (pos.isPassible(false, true)){
                    if (swampDir !== undefined && getRoomTerrainAt(pos) === TERRAIN_MASK_SWAMP) {
                        swampDir = i;
                        continue; 
                    }
					this.move(i);
					this.say("nudgedTar")
					return true;
				}
			}
		}

        if (swampDir !== undefined) {
            this.move(swampDir);
            this.say("nudgedSwmp")
            return true;
        }
    }
 
    PowerCreep.prototype.restockOps = function (lowAmount = 100, bufferAmount = 100) {
    
        let role = "restockOps";
        if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {

            let usedLowAmount = Math.min(lowAmount, this.store.getCapacity(RESOURCE_OPS))
            
            if (this.store[RESOURCE_OPS] > usedLowAmount) {
                if (this.memory[C.ASSIGNED_ROLE] === role) {
                    this.clearTarget();
                }
                return 0;
            }
            
            let missingAmount = usedLowAmount - this.store[RESOURCE_OPS];
            if (missingAmount <= 0) { return 0; }

            let currentFreeSpace = this.store.getFreeCapacity(RESOURCE_OPS)
            if (currentFreeSpace < missingAmount) { return 0; }

            let targets = _.filter(this.room.findByType([STRUCTURE_STORAGE, STRUCTURE_TERMINAL]),
            function (structure) {
                return (
                    structure.store[RESOURCE_OPS] >= usedLowAmount)
            });
            let closestByRange = this.pos.findClosestByRange(targets);
            if (closestByRange) {
                this.assignTarget(closestByRange.id, role);
            }
        }

        if (this.memory[C.CLOSEST_TARGET]) {
            let targetObj = Game.getObjectById(this.memory[C.CLOSEST_TARGET]);
            if (!targetObj) {
                this.clearTarget();
                return 1;
            }
			let value = ERR_NOT_IN_RANGE;

            let usedLowAmount = Math.min(lowAmount, this.store.getFreeCapacity(RESOURCE_OPS))
            let missingAmount = bufferAmount + lowAmount - this.store[RESOURCE_OPS];

            let withdrawAmount = Math.min(targetObj.store[RESOURCE_OPS], missingAmount, usedLowAmount)

            if (withdrawAmount <= 0){
                this.clearTarget();
                return 0;
            }           

			if (this.pos.inRangeTo(targetObj.pos, 1)) {
                value = this.withdraw(targetObj, RESOURCE_OPS, withdrawAmount);
            } 

            if (value == ERR_NOT_IN_RANGE) {
                this.travelTo(targetObj, {range: 1, offRoad: 1});                
			} else if (value === OK) {
                this.clearTarget();               			
			} else if (value <= 0) {
                console.log("error withdraw ops " + value)
				this.clearTarget();				
			}
            return 1;
        }
    }

    PowerCreep.prototype.restockNearbyEnergy = function () {

        if (this.carry[RESOURCE_ENERGY] > this.carryCapacity/2) { return 0; }
        let role = "restockNearbyEnergy";
        if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            let currentFreeSpace = this.carryCapacity - this.sumCarry
            if (currentFreeSpace < 500) { return 0; }
            let containers = _.filter(this.room.findByType(STRUCTURE_CONTAINER),
					function (structure) {
						return ( structure.isController() == 0 && 
                                !structure.isSpawner() &&
							    ((structure.store[RESOURCE_ENERGY] - structure.withdraw) >= 500));
                    });
            let closestByRange = this.pos.findClosestByRange(containers);
            if (closestByRange) {
                this.assignTarget(closestByRange.id, role);
            }        
        }
        if (this.memory[C.CLOSEST_TARGET]) {
            let targetObj = Game.getObjectById(this.memory[C.CLOSEST_TARGET]);
            if (!targetObj) {
                this.clearTarget();
                return 1;
            }
			let value = ERR_NOT_IN_RANGE;
			if (this.pos.inRangeTo(targetObj.pos, 1)) {
                let minFreeSpace = this.carryCapacity - this.sumCarry - 200
                let withdrawAmount = Math.min(targetObj.store[RESOURCE_ENERGY], minFreeSpace)
                value = this.withdraw(targetObj, RESOURCE_ENERGY, withdrawAmount)
            } 
            if (value == ERR_NOT_IN_RANGE) {
                this.travelTo(targetObj, {range: 1, offRoad: 1 });                
			} else if (value === OK) {
                this.clearTarget();               			
			} else if (value <= 0) {
                console.log("error withdraw energy " + value)
				this.clearTarget();				
			}
            return 1;
        }

    }

    PowerCreep.prototype.refreshTTL = function (minimumTicks = 750) {
        if (this.ticksToLive > minimumTicks) { return 0;}

        let role = "refreshTTL";
        if (!this.checkRole(role) && this.ticksToLive > 75) { return 0; }
                
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            let closestByRange;
            if (this.room.controller && this.room.controller.my && this.room.controller.level >= 8) {
                let powerSpawns = this.room.findByType(STRUCTURE_POWER_SPAWN);
                closestByRange = this.pos.findClosestByRange(powerSpawns);
            }
            
           
            if (closestByRange) {
                this.assignTarget(closestByRange.id, role);
            }
        }

        if (this.memory[C.CLOSEST_TARGET]) {
            let targetObj = Game.getObjectById(this.memory[C.CLOSEST_TARGET]);
            if (!targetObj) {
                this.clearTarget();
                return 1;
            }
			let value = ERR_NOT_IN_RANGE;
			if (this.pos.inRangeTo(targetObj.pos, 1)) {
                value = this.renew(targetObj)
            } 

            if (value == ERR_NOT_IN_RANGE) {
                this.travelTo(targetObj, {range: 1, offRoad: 1 });                
			} else if (value === OK) {
                this.clearTarget();               			
			} else if (value <= 0) {
                console.log(this + " error refreshing ttl " + value)
				this.clearTarget();				
			}
            return 1;
        }
    }

    PowerCreep.prototype.storeOps = function () {
        let role = "storeOps";
        if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            if (this.sumCarry > this.carryCapacity * 0.85 &&
                this.carry[RESOURCE_OPS] > 200){
                let carryCapacity = this.carryCapacity;
                let store = _.filter(this.room.findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
                    function (structure) {
                        return (structure.freeSpace > carryCapacity);
                    });
                let closestByRange = this.pos.findClosestByRange(store);
                if (closestByRange) {
                    this.assignTarget(closestByRange.id, role);
                }
            }
        }

        if (this.memory[C.CLOSEST_TARGET]) {
            let targetObj = Game.getObjectById(this.memory[C.CLOSEST_TARGET]);
            if (!targetObj) {
                this.clearTarget();
                return 1;
            }

			let value = ERR_NOT_IN_RANGE;
			if (this.pos.inRangeTo(targetObj.pos, 1)) {
                let amountToTransfer = this.carry[RESOURCE_OPS] - 100;
                value = this.transfer(targetObj, RESOURCE_OPS, amountToTransfer);               
			}

			if (value == ERR_NOT_IN_RANGE) {
                this.travelTo(targetObj, {range: 1, roomCallback: avoidSKcreeps, offRoad: 1 });                
			} else if (value === OK) {
                this.clearTarget();
			} else if (value <= 0) {
                console.log("error depositing OPS " + value)
				this.clearTarget();				
			}
			return 1;
		}
    }

    PowerCreep.prototype.regenSource = function () {
        let role = "regenSource";
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            
            if (!this.canUsePower(PWR_REGEN_SOURCE, 15) ) { return 0; }
            if (!this.room.checkMyPowerLevelOk(PWR_REGEN_SOURCE, this.powers[PWR_REGEN_SOURCE].level)) { return 0;}
            let targets = this.room.find(FIND_SOURCES, {
                filter: (source) => {
                    return (!source.effects || 
                            !source.getEffect(PWR_REGEN_SOURCE) ||
                            source.getEffect(PWR_REGEN_SOURCE).ticksRemaining < 25);
                    }
            });

            
            
            if (targets.length > 0) {

                if (this.room.memory.hostiles || this.room.memory.sieged) {
                    let idx = targets.length;		
                    while (idx--) {
                        let source = targets[idx];

                        let minePos = source.getHarvesterPos(this.room.name);
                    //    let minePos = posDecompress(this.room.memory.sources[source.id].EPos, this.room.name)
                        if (isOutsideWalls(minePos) ) {
                            targets.splice(idx, 1);
                        }
                    }
                }

                let closestTarget = this.pos.findClosestByRange(targets, {});
				if (closestTarget != undefined) {
					this.assignTarget(closestTarget.id, role);
				}
            }
        }

        if (this.memory[C.CLOSEST_TARGET]) {           
            this.room.memory.powerSources = Game.time + 600;
            this.room.registerPower(PWR_REGEN_SOURCE, this.powers[PWR_REGEN_SOURCE].level, 300)
            return this.applyPowerToTarget(PWR_REGEN_SOURCE, this.memory[C.CLOSEST_TARGET]);
        }
    }

    Room.prototype.checkMyPowerLevelOk = function(type, level=1) {
        if (!this.memory.powers || !this.memory.powers[type]) { return true; }
        if (level >= this.memory.powers[type].level) { return true; }
        if (Game.time > this.memory.powers[type].duration) { 
            delete this.memory.powers[type];
            return true;
        }
        return false;   
    }

    Room.prototype.getPowerLevel = function(type) {
        if (!this.memory.powers || !this.memory.powers[type]) { return 0; }
        return this.memory.powers[type].level
    }

    Room.prototype.registerPower = function(type, level=1, ticks=1) {
        if (this.memory.powers === undefined) {
            this.memory.powers = {};
        }

        this.memory.powers[type] = {};
        this.memory.powers[type].level = level;
        this.memory.powers[type].duration = Game.time + ticks;
    }

    PowerCreep.prototype.getActiveBodyparts = function (type) {
        return 0;
    }

    PowerCreep.prototype.powerStorage = function () {
        let role = "powerStorage";
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            if (!this.canUsePower(PWR_OPERATE_STORAGE) ) { return 0; }
            if (!this.room.storage || this.room.storage.freeSpace > 100000) { return 0;}
            let targets = _.filter(this.room.findByType(STRUCTURE_STORAGE),
				function (structure) {
                    return (!structure.effects || 
                            !structure.getEffect(PWR_OPERATE_STORAGE) ||
                            structure.getEffect(PWR_OPERATE_STORAGE).ticksRemaining < 15
                        );
                });
            if (targets.length > 0) {                
                this.assignTarget(targets[0].id, role);
                
            }
        }
        if (this.memory[C.CLOSEST_TARGET]) {
            return this.applyPowerToTarget(PWR_OPERATE_STORAGE, this.memory[C.CLOSEST_TARGET]);
        }
    }

    PowerCreep.prototype.powerTowers = function () {
        let role = "powerTowers";
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            let preTicks = 10;
            if (!this.canUsePower(PWR_OPERATE_TOWER) ) { return 0; }
            let targets = _.filter(this.room.findByType(STRUCTURE_TOWER),
				function (structure) {
                    return (!structure.effects || 
                            !structure.getEffect(PWR_OPERATE_TOWER) ||
                            structure.getEffect(PWR_OPERATE_TOWER).ticksRemaining < preTicks
                        );
                });
            if (targets.length > 0) {

                this.assignTarget(targets[0].id, role);                
            }
        }
        if (this.memory[C.CLOSEST_TARGET]) {
            return this.applyPowerToTarget(PWR_OPERATE_TOWER, this.memory[C.CLOSEST_TARGET]);
        }
    }

    PowerCreep.prototype.powerFactory = function () {
        let role = "powerFactory";
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            
            if (!this.canUsePower(PWR_OPERATE_FACTORY) ) { return 0; }            
            
            if (Memory.pcLevels[this.name] && Memory.pcLevels[this.name].factoryLevel) {
                if (this.powers[PWR_OPERATE_FACTORY].level < Memory.pcLevels[this.name].factoryLevel) { return 0; }
                this.room.memory.factoryLevel = this.powers[PWR_OPERATE_FACTORY].level
            } else {
                if (this.level < POWER_CREEP_MAX_LEVEL) { return 0; }
            }
            
            this.room.memory.factoryOperator = Game.time + 2500;

            if (this.room.store(RESOURCE_OPS) < MIN_OPS_FACTORY_OPERATE) { return 0;}
             

            if (!Memory.comodityToProcude) { return 0;}

            if (!this.room.memory.factoryRequest || Game.time > this.room.memory.factoryRequest ||
                Memory.factories[this.powers[PWR_OPERATE_FACTORY].level] === undefined ||
                Memory.factories[this.powers[PWR_OPERATE_FACTORY].level][this.room.name] === undefined
            ) {
                return 0;
            }

           
            let requiredLevel = COMMODITIES[Memory.comodityToProcude].level || 0;            
            if (this.powers[PWR_OPERATE_FACTORY].level > requiredLevel) { return 0; }

            let targets = _.filter(this.room.findByType(STRUCTURE_FACTORY),
				function (structure) {
                    return ((!structure.cooldown || structure.cooldown < 15) &&
                            (!structure.effects || 
                            !structure.getEffect(PWR_OPERATE_FACTORY) ||
                            structure.getEffect(PWR_OPERATE_FACTORY).ticksRemaining < 15)
                        );
                });
            if (targets.length > 0) {
                this.assignTarget(targets[0].id, role);
            }
        }
        if (this.memory[C.CLOSEST_TARGET]) {
            return this.applyPowerToTarget(PWR_OPERATE_FACTORY, this.memory[C.CLOSEST_TARGET]);
        }
    }

    PowerCreep.prototype.powerSpawns = function (peaceTime) {
        let role = "powerSpawns";
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            if (!this.canUsePower(PWR_OPERATE_SPAWN) ) { return 0; }
            if (SEASONAL_THORIUM) {
                if (peaceTime && 
                    ((!isAssistedLevelingSpawn(this.room.name) && !Memory.combatBoost[this.room.name] ) || 
                    this.room.store(RESOURCE_OPS) < 1000 || 
                    Memory.rooms[this.room.name].spawnerWork < 90)
                ) { return 0;}

                
                let operatedSpawns = _.filter(this.room.findByType(STRUCTURE_SPAWN),
                    function (structure) {
                        return (structure.getEffect(PWR_OPERATE_SPAWN) && structure.getEffect(PWR_OPERATE_SPAWN).ticksRemaining > 15);                    
                    });
                if (operatedSpawns.length > 0) { { return 0;}}
                
            } else {
                if (peaceTime && (this.room.store(RESOURCE_OPS) < 15000 || !Memory.combatBoost[this.room.name])) { return 0;}
            }

            let targets = _.filter(this.room.findByType(STRUCTURE_SPAWN),
				function (structure) {
                    return (!structure.effects || 
                            !structure.getEffect(PWR_OPERATE_SPAWN) ||
                            structure.getEffect(PWR_OPERATE_SPAWN).ticksRemaining < 15
                        );
                });
            if (targets.length > 0) {
                this.assignTarget(targets[0].id, role);                
            }
        }
        if (this.memory[C.CLOSEST_TARGET]) {
            return this.applyPowerToTarget(PWR_OPERATE_SPAWN, this.memory[C.CLOSEST_TARGET]);
        }
    }

    PowerCreep.prototype.powerLabs = function () {
        let role = "powerLabs";
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            if (!this.canUsePower(PWR_OPERATE_LAB) ) { return 0; }
            if (this.room.store(RESOURCE_OPS) < 5000) { return 0; }
            if (!this.room._memory[R.LABS_PRODUCING]) { return 0; }
            let targets = _.filter(this.room.findByType(STRUCTURE_LAB),
				function (structure) {
                    return (structure.memory.output &&
                            !structure.memory[S.LAB_ERROR_CYCLES] &&
                            structure.cooldown < 150 &&
                            (!structure.getEffect(PWR_OPERATE_LAB) ||
                            structure.getEffect(PWR_OPERATE_LAB).ticksRemaining < 15)
                        );
                });
            if (targets.length > 0) {
                let closestTarget = this.pos.findClosestByRange(targets);
                if (closestTarget != undefined) {
                    this.assignTarget(closestTarget.id, role);
                }
            }
        }

        if (this.memory[C.CLOSEST_TARGET]) {
            return this.applyPowerToTarget(PWR_OPERATE_LAB, this.memory[C.CLOSEST_TARGET]);
        }
    }

    PowerCreep.prototype.regenMineral = function () {
        let role = "regenMineral";
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            if (this.room.memory.hostiles || this.room.memory.sieged) { return 0; }

            let preTicks = 20;
            if (!this.canUsePower(PWR_REGEN_MINERAL, preTicks) ) { return 0; }
            
            let targets = this.room.find((FIND_MINERALS), {
                filter: (source) => {
                    return (!source.ticksToRegeneration &&
                            (!source.effects || !source.getEffect(PWR_REGEN_MINERAL) ||
                            source.getEffect(PWR_REGEN_MINERAL).ticksRemaining < preTicks));
                    }
                });
            
            if (targets.length > 0) {
                if (SEASONAL_THORIUM) {
                    for (let idx in targets) {
                        if (targets[idx].mineralType === RESOURCE_THORIUM) {
                            this.assignTarget(targets[idx].id, role);
                        }
                    }
                } else {
                    this.assignTarget(targets[0].id, role);	
                }
            }
        }
        if (this.memory[C.CLOSEST_TARGET]) {            
            this.room.memory.powerMineral = Game.time + 600;
            return this.applyPowerToTarget(PWR_REGEN_MINERAL, this.memory[C.CLOSEST_TARGET]);
        }
    }

    PowerCreep.prototype.operateSpawns = function () {
        let role = "operateSpawns";
		if (!this.checkRole(role)) { return 0; }
		// ASSIGN
		if (!this._memory[C.CLOSEST_TARGET]) {
            if (!this.canUsePower(PWR_OPERATE_SPAWN) ) { return 0; }


        }
        if (this.memory[C.CLOSEST_TARGET]) {
            return this.applyPowerToTarget(PWR_OPERATE_SPAWN, this.memory[C.CLOSEST_TARGET]);
        }
    }

    global.mineralPowerResources = function(room){
        if (!Memory.rooms[room] || !Memory.rooms[room].powerMineral) { return false; }
        if (Memory.rooms[room].mineral) {
            let mineral = Game.getObjectById(Object.keys(Memory.rooms[room].mineral)[0]);
            if (!mineral) {
           //     console.log("mineral " + mineral)
                return false; 
            }
            // CREEP_LIFE_TIME/EXTRACOR_COOLDOWN * WORK PARTS
            // 1500 / 5 * 36 = 10800 minerals exctracted by 1 creep
            if (mineral.mineralAmount > 10000) {
                return true;
            }
        }
    }

    /*
    PowerCreep.prototype.operatorDefender = function () {



    }*/






};