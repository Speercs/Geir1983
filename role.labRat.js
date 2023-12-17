'use strict'
let roleLabRat = {

    /** @param {Creep} creep **/
    run: function(creep) {
			
        if (creep.sleep() ) { 
			return; 
		}
		creep.manageState();
		
		creep.room._cache.labrat = Game.time + 10

		
		
		
		if(creep._memory.micro) {
			creep.room.memory.labMicro = Game.time + 75;

			if(creep._memory[C.WORK]) {
				if (!creep.roleLabRatDeliver()	) {

				}
			} else {
				if (!creep.roleLabMicroToPos() ) {
					
					if (!creep.roleLabMicroResetToOriginal() ) {
						creep.roleLabMicroBalance();
					}
				}
			}
		} else {	// NORMAL LABRAT
			if(creep._memory[C.WORK] || (creep._memory.jobId && creep.sumCarry > 0 && !creep._memory._targets)) { 
				if (!creep.roleLabRatDeliver()	) {
					creep.roleLabRatEmpty();
				}
			}
			else { 
				if (!creep.roleLabRatTakeOutProduct() ) {
					if (!creep.roleEmptyMicroManager() ) {
						if (!creep.roleLabRat() ) {
							if (!creep.roleLabRatRefillEnergy() ) {
								if (!creep.roleRefillNukerGhodium() ) {
									if (!creep.roleRefillNukerEnergy() ) {
									//	if (!creep.roleLabRatEmpty() ) {
											if (!creep.scavengeForDroppedMinerals() ) {
												if (!creep.roleLabRatToIdle() ) {
													
													if (creep._memory.lastIdle && Game.time === creep._memory.lastIdle) {	// TODO WHY DOES IT NEED TWO TICKS??
														creep.sleep(10);
													}
													creep._memory.lastIdle = Game.time + 1;
												}
											}
									//	}									
									}
								}
							}
						}
					}
				}
			}
		}
	}
};

module.exports = roleLabRat;


Creep.prototype.doLabRat = function (){

	if (this.room._cache.labrat && Game.time < this.room._cache.labrat && this._memory.labrat === undefined) {		
		return 0;
	} else {
		this.room._cache.labrat = Game.time + 10
	}
	
	this._memory.labrat = 1;

	if (this.room.hasLabs() < 3 || this.room._cache.unboosted) {
		
		if (this.room.storage && !this.scavengeForDroppedMinerals() ) {
			delete this.room._cache.unboosted
			delete this._memory.labrat;
			this.clearTarget();
			return 0;
		} else {
			delete this._memory.labrat;
			return 1;
		}
	}

	if (this.performAssignedRole() ) { return 1;}
	
	if (this.roleGenerateSafemode() ) {
		return 1;
	}

	

	if(this._memory[C.WORK] || 
		(this._memory.jobId && this.sumCarry > 0 && !this._memory._targets)
		
		) { 
		if (!this.roleLabRatDeliver() ) {
			if (!this.roleLabRatEmpty() ) {
				delete this._memory.labrat;
				this.clearTarget();
				return 0;
			}
		}
	}
	else { 
		if (!this.roleLabRatTakeOutProduct() ) {
			if (!this.roleEmptyMicroManager() ) {
				if (!this.roleLabRat() ) {
					if (!this.roleLabRatRefillEnergy() ) {
						if (!this.roleRefillNukerGhodium() ) {
							if (!this.roleRefillNukerEnergy() ) {
								if (!this.scavengeForDroppedMinerals() ) {
									delete this._memory.labrat;
									this.clearTarget();
									return 0;
								}
							}
						}
					}
				}
			}
		}
	}
	//	this.say("LABRAT")
	return 1;

}



// ROLE LABRAT
Creep.prototype.roleLabRat = function () {
	let role = "roleLabRat";
	// CHECK IF OTHER ROLE ACTIVE	
	if (!this.checkRole(role)) { return 0; }
	// ASSIGN  		
	if (!this._memory[C.CLOSEST_TARGET]) {
		if (this.ticksToLive < 35) {
			this.recycleOrSuicide();
			return;
		}
		let requiredAmount = 3000;
		let wantedAmount = 3000;
		let labMicro = [];
		let labsToRefill = [];
		let lab;
		let boosting;
		if (this.room.memory.labMicro) {
			if (this.room.memory.labMicro < Game.time) {
				delete this.room.memory.labMicro;					
			} else {
				labMicro = _.filter(this.room.find(FIND_MY_CREEPS),
				function (c) {
					return (c.memory[C.ROLE] === "labRat" && c.memory.micro);
				});				
				requiredAmount = 150;
				wantedAmount = 200;
			}
			
			let boosterLabs = _.filter(this.room.findByType(STRUCTURE_LAB),
				function (structure) {
					return (structure.memory[S.BOOSTER_LAB]);
				});
			
			if (boosterLabs.length > 0) {
				boosting = true;
				for (let idx in boosterLabs) {
					lab = boosterLabs[idx];
					if (lab.mineralAmount < lab.memory[S.BATCH_LAB]) {
						/*
						labsToRefill.push(lab);
						wantedAmount = lab.memory[S.BATCH_LAB];
						*/
					//	Game.rooms[this.room.name].visual.text(lab.memory[S.INPUT_LAB], lab.pos , {size : 0.5});
						labsToRefill.push({ lab: lab, amount : lab.memory[S.BATCH_LAB]-lab.mineralAmount });
					} 
				}
			}



			let mixerLab // = Game.getObjectById(Object.keys(this.room.memory.mixerLab)[0]);
			let inputLabs = this.room.getInputLabs();
			
			if (!boosting) {
				for (let idx in inputLabs) {
					lab = inputLabs[idx];
					let resourceType = lab.memory[S.INPUT_LAB];

					let currentAmountInSystem = 0;
					if (lab.mineralAmount && lab.mineralType === resourceType) { currentAmountInSystem += lab.mineralAmount; }
					if (mixerLab && mixerLab.mineralAmount && mixerLab.mineralType === resourceType) { currentAmountInSystem += mixerLab.mineralAmount; }
					if (labMicro.length > 0 && labMicro[0].carry[resourceType] ) { currentAmountInSystem += labMicro[0].carry[resourceType]; }
				//	console.log(this.room.name +" currentAmountInSystem " + currentAmountInSystem + " of " + resourceType);
					if (currentAmountInSystem < requiredAmount) {
					//	labsToRefill.push(lab);
					//	wantedAmount = wantedAmount - currentAmountInSystem; 
						labsToRefill.push({ lab: lab, amount : wantedAmount - currentAmountInSystem });
					//	break;
					}
				}
			}

			


			
		} else {// Not micro labrat

			let labs = _.filter(this.room.findByType(STRUCTURE_LAB),
			function (structure) {
				return ((structure.memory[S.INPUT_LAB] || structure.memory[S.BOOSTER_LAB]) &&
					(structure.memory[S.BATCH_LAB] - structure.mineralAmount) > 0 &&
					structure.mineralAmount < requiredAmount
					);
			});

			if (labs.length > 0) {
				let sortable = [];
				let maxMissingEnergy = 0;
				let maxMissingMineral = 0;
				for (let idx in labs) {
					lab = labs[idx]
					let missingRes = lab.memory[S.BATCH_LAB] - lab.mineralAmount;
					if (!lab.memory[S.BOOSTER_LAB] && missingRes < 200) {
						if (lab.mineralAmount == 0) {
							lab.memory[S.BATCH_LAB] = 0;
						}
						continue; 
					}
					maxMissingMineral = Math.max(maxMissingMineral, missingRes);
					maxMissingEnergy = Math.max(maxMissingEnergy, lab.energyCapacity - lab.energy, lab.memory.needEnergy || 0);
					sortable.push([lab, missingRes]);
				}

				if (maxMissingEnergy > this.carryCapacity && maxMissingEnergy > maxMissingMineral) { return 0; }

				sortable.sort(function(a, b) {
					return b[1] - a[1];});

				for (let i=0; i<sortable.length; i++) {
					lab = sortable[i][0];					
					labsToRefill.push({lab: lab, amount: sortable[i][1] });
				}



					/*
			//
				for (let idx in labs) {
					let lab = labs[idx]
				//	Game.rooms[this.room.name].visual.text(lab.memory[S.INPUT_LAB], lab.pos , {size : 0.5});
					labsToRefill.push({lab: lab, amount: (lab.memory[S.BATCH_LAB] - lab.mineralAmount) });
				}*/
			}
		}
		

		if (labsToRefill.length > 0) {
		
				let availableCarry = this.carryCapacity - this.sumCarry;
				
				for (let idx in labsToRefill) {

					let resType = labsToRefill[idx].lab.memory[S.BOOSTER_LAB] || labsToRefill[idx].lab.memory[S.INPUT_LAB]
					let source = _.filter(this.room.findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
						function (structure) {
							return (structure.store[resType]);
						});
					
						/*
					for (let idx in source) {

					}	*/
					
					if (source.length === 0) { continue; }
				//	let mineralToRefill = Math.min(wantedAmount, this.carryCapacity, source[0].store[labsToRefill[idx].memory[S.INPUT_LAB]]);


					let mineralToRefill = Math.min(labsToRefill[idx].amount, this.carryCapacity, source[0].store[resType], labsToRefill[idx].lab.store.getFreeCapacity(resType));
				//	console.log("refill amount " + mineralToRefill + " target " + labsToRefill[idx].lab + " wanted amount " + labsToRefill[idx].amount)
					if (mineralToRefill <= availableCarry) {
						let jobId = labsToRefill[idx].lab.id
						if (!boosting && labMicro && labMicro.length > 0 ) {
							jobId = labMicro[0].id;
						}
						this.assignMultiTarget(source[0], role, resType, mineralToRefill, jobId);						
						availableCarry -= mineralToRefill;
						break; //NEED TO HANDLE MULTIPLE DELIVER OF DIFFERNET MINERAL TO DIFFERENT JOB ID, MULI WITHDRAW TO SAME JOB ID OK
					}
				}

				if (this._memory._targets) {
			//		this.say("rfl " + this._memory._targets.length + "-" +availableCarry);
				//	console.log("assigned " + JSON.stringify(this._memory._targets))
				}

				this.checkCurrentTarget();

		//	}
		}
	}
	if (this._memory[C.CLOSEST_TARGET]) {
	//	let target = Game.getObjectById(this._memory.jobId);
	//	let store = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
	//	let missingAmount = Math.min(target.amount, this.carryCapacity, store.store[target.memory[S.INPUT_LAB]]);		
		
		return this.withdrawAction(this._memory.amount);
	}
};

// ROLE roleLabRatTakeOutProduct
let roleLabRatTakeOutProduct = "roleLabRatTakeOutProduct";
Creep.prototype.roleLabRatTakeOutProduct = function () {
	// CHECK IF OTHER ROLE ACTIVE	
	if (!this.checkRole(roleLabRatTakeOutProduct)) { return 0; }
	// ASSIGN
	if (!this._memory[C.CLOSEST_TARGET]) {
		if (this.ticksToLive < 35) {
			this.recycleOrSuicide();
			return;
		}
		let carryCapacity = this.carryCapacity;

		let labsToEmpty = [];
		let maxAmount = 200;

		let labs = this.room.hasLabs()
		if (labs <= 0) { return }
		maxAmount = this.carryCapacity / (Math.max(1, labs-2));
		
		
		if (this.room.memory.labMicro) {
			if (Game.time > this.room.memory.labMicro) {
				delete this.room.memory.labMicro;
				return 1;
			}
			maxAmount = 200;

			let boosterLabs = _.filter(this.room.findByType(STRUCTURE_LAB),
			function (structure) {
				return (structure.memory[S.BOOSTER_LAB]);
			});
			let boosting;
			if (boosterLabs.length > 0) {
				boosting = true;
				for (let idx in boosterLabs) {
					let lab = boosterLabs[idx];
					if (lab.mineralAmount > 0 &&
						lab.mineralType !== lab.memory[S.BOOSTER_LAB]
					) {
						labsToEmpty.push(lab);
					//	let wantedAmount = lab.memory[S.BATCH_LAB];
					}
				}
			}
		//	console.log("booster labs clean " + labsToEmpty.length)


			if (!boosting) {

				let validRes = getValidResources(this.room.name);

				labsToEmpty = _.filter(this.room.findByType(STRUCTURE_LAB),
					function (structure) {
						return (structure.mineralAmount >= 60 ||
								(structure.mineralAmount >= 0 &&
								(validRes[structure.mineralType] === undefined &&
								structure.memory[S.BOOSTER_LAB] === undefined) ||
								(structure.mineralAmount > 0 &&
								validRes[structure.mineralType] === undefined))
								
								);	
							
					});
			}

			

		} else {
			let producing = this.room._memory[R.LABS_PRODUCING]
			labsToEmpty = _.filter(this.room.findByType(STRUCTURE_LAB),
			function (structure) {
				return (structure.mineralAmount > 0 &&
						(((structure.memory[S.INPUT_LAB] === undefined && structure.memory[S.BOOSTER_LAB] === undefined) && (structure.mineralAmount >= maxAmount)) ||
						(structure.memory[S.BOOSTER_LAB] && structure.memory[S.BOOSTER_LAB] !== structure.mineralType) ||	
						(structure.memory[S.INPUT_LAB] !== undefined && structure.memory[S.BOOSTER_LAB] === undefined && structure.memory[S.INPUT_LAB] !== structure.mineralType) ||							
						(!producing && !structure.memory[S.BOOSTER_LAB] && !structure.memory[S.INPUT_LAB])	||							
						(structure.memory[S.INPUT_LAB] === undefined && structure.memory[S.BOOSTER_LAB] === undefined && structure.mineralType !== producing)
						));
				});
		}
		if (labsToEmpty.length > 0) {
			//	let carryCapacity = this.carryCapacity;
		//	let mineralType = labsToEmpty[0].mineralType;
			let stores = _.filter(this.room.findByType([STRUCTURE_TERMINAL, STRUCTURE_STORAGE]),
				function (structure) {
					return (structure.freeSpace > carryCapacity);
				});
			let closestByRange = this.pos.findClosestByRange(stores);
			if (closestByRange) {
				let availableCarry = this.store.getFreeCapacity();
				for (let idx in labsToEmpty) {
					let mineralToEmpty = Math.min(labsToEmpty[idx].mineralAmount, this.carryCapacity);
					if (mineralToEmpty <= availableCarry && labsToEmpty[idx].mineralType) {
						this.assignMultiTarget(labsToEmpty[idx], roleLabRatTakeOutProduct, labsToEmpty[idx].mineralType, undefined, closestByRange.id);
						availableCarry -= mineralToEmpty;
					//	log("empty lab " + labsToEmpty[idx].mineralType)
					}
				}
				if (this._memory._targets) {
					this.say("labs" + this._memory._targets.length + "-" +availableCarry);
				}
				
				this.checkCurrentTarget();
			}
		}
	}
	
	if (this._memory[C.CLOSEST_TARGET]) {
		
		let value = this.withdrawAction();
/*
		if (this._withdrawOk === Game.time) {
			this.clearMultiTarget();
		} else */
		if (!this._withdrawOk || this._withdrawOk !== Game.time) {
			let nearbyLabs = this.pos.lookForStructuresAround(STRUCTURE_LAB, 1);
			for (let idx in nearbyLabs) {
				let labId = nearbyLabs[idx].id
				for (let idx2 in this._memory._targets) {
					if (labId === this._memory._targets[idx2].id) {
						this.say("joink!");
						this.withdraw(nearbyLabs[idx], this._memory._targets[idx2].res);
						this._memory._targets.splice(idx2, 1);
						return 1;
					}
				}
			}
		}

	//	this.checkCurrentTarget();
		return value;
	}
};


Creep.prototype.scavengeForDroppedMinerals = function () {
	let role = "scavengeForDroppedMinerals";
	// CHECK IF OTHER ROLE ACTIVE	
	
	if (!this.checkRole(role)) { return 0; }
	// ASSIGN  		
	if (!this._memory[C.CLOSEST_TARGET]) {
	//	if (this.room.memory.sieged) { return 0}

		if (!this.room.storage && !this.room.terminal) { return 0;}
		let targets = [];
		let droppedMinAmount = 10;
		let score;
		let resourcesAtPos =  {};

		// CHECK TOMBSTONES				
		let tombstones = this.room.find(FIND_TOMBSTONES);					
		for (let i=0; i < tombstones.length; i++ ) {
			let tombstone = tombstones[i];
			if (this.room.memory.isAttacked && isOutsideWalls(tombstone.pos) ) { continue; }
			let posIdx = posId(tombstone.pos);
			if (!resourcesAtPos[posIdx]) {
				resourcesAtPos[posIdx] = {};
				resourcesAtPos[posIdx].store = {};
			}
			for (let res in tombstone.store) {
				if (res === RESOURCE_ENERGY) { continue; }
				if (tombstone.store[res] < droppedMinAmount) { continue; }
				score = this.pos.getRangeTo(tombstones[i]);
				if (T3_BOOSTS_OBJECT[res]) { score -= 100; }
				targets.push({obj: tombstones[i], score: score, res: res });
				resourcesAtPos[posIdx].store[res] = {};
			//	resourcesAtPos[posIdx].store[res] = tombstone.store[res];
				resourcesAtPos[posIdx].store[res].id = tombstones[i].id;
			}
		}

		// CHECK DROPPED
		let dropped = this.room.find(FIND_DROPPED_RESOURCES, {
			filter: (resource) => {
				return (resource.amount  >= droppedMinAmount &&
					resource.resourceType !== RESOURCE_ENERGY);
			}
		});
		for (let i=0; i < dropped.length; i++ ) {
			if (this.room.memory.isAttacked && isOutsideWalls(dropped[i].pos) ) { continue; }
			score = this.pos.getRangeTo(dropped[i]);
			if (T3_BOOSTS_OBJECT[dropped[i].resourceType]) { score -= 100; }
			targets.push({obj: dropped[i], score: score, res: dropped[i].resourceType  });
			let posIdx = posId(dropped[i].pos);
			if (!resourcesAtPos[posIdx]) {
				resourcesAtPos[posIdx] = {};
				resourcesAtPos[posIdx].store = {};
			}
			resourcesAtPos[posIdx].store[dropped[i].resourceType] = {};
			resourcesAtPos[posIdx].store[dropped[i].resourceType].id = dropped[i].id;
		}

		// CHECK CONTAINERS				
		let containers = this.room.findByType(STRUCTURE_CONTAINER);
		for (let i=0; i < containers.length; i++ ) {
			let container = containers[i];
			if (this.room.memory.isAttacked && isOutsideWalls(container.pos) ) { continue; }
			let posIdx = posId(container.pos);
			if (!resourcesAtPos[posIdx]) {
				resourcesAtPos[posIdx] = {};
				resourcesAtPos[posIdx].store = {};
			}
			for (let res in container.store) {
				if (res === RESOURCE_ENERGY) { continue; }
				if (container.store[res] < droppedMinAmount) { continue; }
				score = this.pos.getRangeTo(container);
				if (T3_BOOSTS_OBJECT[res]) { score -= 100; }
				targets.push({obj: container, score: score, res: res });
				resourcesAtPos[posIdx].store[res] = {};
				resourcesAtPos[posIdx].store[res].id = container.id;
			}
		}

		// CHECK SCORE CONTAINERS (SEASONAL)
		if (SEASONAL_SCORE) {
			score = this.room.find(FIND_SCORE_CONTAINERS);
			for (let i=0; i < score.length; i++ ) {
				let container = score[i];
				if (this.room.memory.isAttacked && isOutsideWalls(container.pos) ) { continue; }
				let posIdx = posId(container.pos);
				if (!resourcesAtPos[posIdx]) {
					resourcesAtPos[posIdx] = {};
					resourcesAtPos[posIdx].store = {};
				}
				for (let res in container.store) {
					if (container.store[res] < droppedMinAmount) { continue; }
					score = this.pos.getRangeTo(container);
					if (T3_BOOSTS_OBJECT[res]) { score -= 100; }
					targets.push({obj: container, score: score, res: res });
					resourcesAtPos[posIdx].store[res] = {};
					resourcesAtPos[posIdx].store[res].id = container.id;
				}
			}
		}

		
		// CHECK SCORE CONTAINERS (SEASONAL)
		if (SEASONAL_SYMBOLS) {
			score = this.room.find(FIND_SYMBOL_CONTAINERS);
			for (let i=0; i < score.length; i++ ) {
				let container = score[i];
				if (this.room.memory.isAttacked && isOutsideWalls(container.pos) ) { continue; }
				let posIdx = posId(container.pos);
				if (!resourcesAtPos[posIdx]) {
					resourcesAtPos[posIdx] = {};
					resourcesAtPos[posIdx].store = {};
				}
				
				let maxStored = maxSymbolsStored();
				for (let res in container.store) {
					if (container.store[res] < droppedMinAmount) { continue; }
					if (Memory.Minerals[res] && Memory.Minerals[res] > maxStored) { continue; }
					score = this.pos.getRangeTo(container);
					targets.push({obj: container, score: score, res: res });
					resourcesAtPos[posIdx].store[res] = {};
					resourcesAtPos[posIdx].store[res].id = container.id;
				}
			}
		}
	
		if (targets.length > 0) {
			let preferedTarget;
			let preferedRes;
			let bestScore = Infinity;
			
			for (let i=0; i < targets.length; i++ ) {
				if (targets[i].score < bestScore) {
					bestScore = targets[i].score;
					preferedTarget = targets[i].obj;
					preferedRes = targets[i].res;
				}
			}
			
			if (preferedTarget) {
				
				let storeId;
				if (this.room.storage) {
					storeId = this.room.storage.id
				} else if (this.room.terminal) {
					storeId = this.room.terminal.id
				}
				

				this.assignMultiTarget(preferedTarget, role, preferedRes, undefined, storeId);
				let posIdx = posId(preferedTarget.pos);
				for (let res in resourcesAtPos[posIdx].store) {
					if (res !== preferedRes) {
						this.assignMultiTarget(resourcesAtPos[posIdx].store[res], role, res, undefined, storeId);
					}
				}
				this._memory.jobId = storeId;			
			}
			this.checkCurrentTarget();
		}
	}
	
	if (this._memory[C.CLOSEST_TARGET]) {
		return this.withdrawAction();
	} 
};

function getValidResources(room) {
	let validRes = {};
	let inputLabs = Game.rooms[room].getInputLabs()
	for (let idx in inputLabs) {
		validRes[inputLabs[idx].memory[S.INPUT_LAB]] = {};
	}
//	let mixerLab = Game.getObjectById(Object.keys(Memory.rooms[room].mixerLab)[0]);	

	validRes[Memory.rooms[room][R.LABS_PRODUCING]] = {};
	return validRes
}


Creep.prototype.roleEmptyMicroManager = function () {
	let role = "roleEmptyMicroManager";
	// CHECK IF OTHER ROLE ACTIVE	
	
	if (!this.checkRole(role)) { return 0; }
	// ASSIGN  		
	if (!this._memory[C.CLOSEST_TARGET] && this.room.memory.labMicro) {
		let labMicro = _.filter(this.room.find(FIND_MY_CREEPS),
		function (c) {
			return (c.memory[C.ROLE] === "labRat" && c.memory.micro);
		});	
		if (labMicro.length === 0) { return 0;}
		
		let validRes = getValidResources(this.room.name);

		if (labMicro[0] ) {
			for (let res in labMicro[0].carry) {
				if (res === RESOURCE_ENERGY) { continue; }
				if (!validRes[res]) {
				//	if (labMicro[0].carry[res] > 200 && validRes[res]) { this._memory.amount = labMicro[0].carry[res] > 200}
				//	this.assignTarget(labMicro[0].id, role, res);

					// dont assignTarget to creeps, overwrites .withdraw method!
					this._memory[C.CLOSEST_TARGET] = labMicro[0].id;
					this._memory[C.ASSIGNED_ROLE] = role;
					this._memory[C.RESOURCE_TYPE] = res;

					this._memory.transferAmount = labMicro[0].carry[res];

					this._memory.jobId = this.room.terminal.id;
					break;
				} else if (labMicro[0].carry[res] > 200) {
				//	this.assignTarget(labMicro[0].id, role, res);

					this._memory[C.CLOSEST_TARGET] = labMicro[0].id;
					this._memory[C.ASSIGNED_ROLE] = role;
					this._memory[C.RESOURCE_TYPE] = res;


					this._memory.jobId = this.room.terminal.id;
					
					let producing = this.room._memory[R.LABS_PRODUCING]
					validRes[producing] = {};
					if (res === producing) {
						this._memory.transferAmount = labMicro[0].carry[res]
					}else {
						this._memory.transferAmount = labMicro[0].carry[res] - 200;
					}
					break;
				}
			}
		}
	}

	if (this._memory[C.CLOSEST_TARGET]) {
		let targetObj = Game.getObjectById(this._memory[C.CLOSEST_TARGET]);
		if (!targetObj) {
			return 0;
		}

		let distance = this.pos.getRangeTo(targetObj);
		if (distance > 1) {
			this.travelTo(targetObj, { maxRooms: 1, range: 1 });
			return 1;
		} else if (distance <= 1) {
			targetObj.transfer(this, this._memory[C.RESOURCE_TYPE] || RESOURCE_ENERGY, this._memory.transferAmount);
			this.clearTarget();
			this._memory[C.WORK] = 1;
			this.say("emtMic")
			return 1;
		}
	}
};

Creep.prototype.roleLabMicroResetToOriginal = function () {
	let role = "roleLabMicroResetToOriginal";
	// CHECK IF OTHER ROLE ACTIVE	
	if (!this.checkRole(role)) { return 0; }
	// ASSIGN  		
	let mixerLab = Game.getObjectById(Object.keys(this.room.memory.mixerLab)[0]);
	if (!this._memory[C.CLOSEST_TARGET]) {

		
		if (mixerLab) {
			if (mixerLab.cooldown && mixerLab.cooldown > 12) { return 0; }
			
		}
			
		

		let labsToCheck = this.getInputLabs()
	//	labsToCheck = labsToCheck.concat(Object.keys(this.room.memory.mixerLab));
		let labs = this.getOutputLabs().length;

		Game.rooms[this.room.name].visual.text("R", this.pos, {color: 'red'});
		let neededAmount = labs * LAB_REACTION_AMOUNT;
		if (this.ticksToLive < 15) { 
			neededAmount = this.carryCapacity;
		}



		for (let idx in labsToCheck) {
			
			let lab = labsToCheck[idx];
			
			let wantedRes = lab.memory[S.INPUT_LAB];

			Game.rooms[this.room.name].visual.text(wantedRes +neededAmount , lab.pos , {size : 0.5});
		//	if (!wantedRes) {continue}
			
			if (this.carry[wantedRes] && 
				lab.mineralAmount < neededAmount && 
				(lab.mineralType === wantedRes || lab.mineralType == undefined)
				){
				let result = this.transfer(lab, wantedRes, limit(neededAmount, 0 , this.carry[wantedRes]));

				console.log(this.room.name + " transfering to  " + lab + " wants " + wantedRes + " transfer result " + result)
				this.room.visual.line(this.pos, lab.pos, { color: "green", lineStyle: "solid" });
				return 1;
			} else if (lab.mineralType && 
						(!wantedRes ||
						lab.mineralType !== wantedRes)
			) {
				let value = this.withdraw(lab, lab.mineralType);
				this.room.visual.line(this.pos, lab.pos, { color: "red", lineStyle: "solid" });
				return 1;
			}

			mixerLab = Game.getObjectById(Object.keys(this.room.memory.mixerLab)[0]);
			let reactionResult = mixerLab.runReaction(labsToCheck[0], labsToCheck[1]);
			if (reactionResult === OK) {
				return 1;
			}			
		}
	}

	if (mixerLab && !mixerLab.cooldown || mixerLab.cooldown < 4) { return 1;}
		
};


Creep.prototype.roleLabMicroBalance = function () {

	let value
	let mixerLab = Game.getObjectById(Object.keys(this.room.memory.mixerLab)[0]);
	if (mixerLab.memory[S.BOOSTER_LAB]) { return 0; }
	if (this.ticksToLive < 15) { return 0; }

	let compundToProduce = this.room._memory[R.LABS_PRODUCING]
	 
	if (compundToProduce) {

		let cd = REACTION_TIME[compundToProduce];
		if (!cd) { cd = 1; }
		if (cd < 12) { return 0; }

		Game.rooms[this.room.name].visual.text("B", this.pos);
		let cycles = 0;
		const cycleTime = 4;
		let maxCycles = Math.floor(cd/cycleTime) - 1;
	//	console.log(this.room.name + "max cycles " +maxCycles + " current cd " + cd );	
		
		let inputLabs = this.room.getInputLabs()
		if (inputLabs.length < 2) { return 0; }
		let inputLab1 = inputLabs[0];
		if (inputLab1.memory[S.BOOSTER_LAB]) { return 0; }
		let inputLab2 = inputLabs[1];
		if (inputLab2.memory[S.BOOSTER_LAB]) { return 0; }

	//	this.say("blance")

		let res1 = inputLab1.memory[S.INPUT_LAB];
		let res2 = inputLab2.memory[S.INPUT_LAB];
		let validRes = {};
		validRes[res1] = {};
		validRes[res2] = {};

		

		for (let idx in inputLabs) {
			cycles++;
			if (cycles > maxCycles) {
			//	console.log(this.room.name + " max cycles exceeded " +cycles+"/"+maxCycles + " current cd " + cd );
				return 0;
			}
			let lab = inputLabs[idx];
			if (lab.cooldown > 3 ) { continue; }

			let otherLab;
			for (let labId in inputLabs) {
				if (labId !== idx) {
					otherLab = Game.getObjectById(labId);
				}
			}

			Game.rooms[this.room.name].visual.text("_", lab.pos);
			
			this._memory.amount = limit(lab.mineralAmount, 0, this.carryCapacity);					
			this._memory.jobId = mixerLab.id;
			this._memory.jobIdAmount = LAB_REACTION_AMOUNT;

			if (lab.mineralAmount > 0) {
			
				this.withdraw(lab, lab.mineralType);
			//	this.assignTarget(lab.id, role, lab.mineralType);
			//	console.log(" micro clean lab " +value );
			//	Game.rooms[this.room.name].visual.text(value, lab.pos);
				return 1;
			} 

			
			if (otherLab.mineralAmount > 0 && 
				otherLab.mineralType !== res1
				) {
				value = this.withdraw(otherLab, otherLab.mineralType);
			//	this.assignTarget(lab.id, role, lab.mineralType);
			//	console.log(" micro clean other lab " +value );
				Game.rooms[this.room.name].visual.text(value, otherLab.pos);
				return 1;
			} else {
				if (this.carry[res1] && (!otherLab.mineralAmount || otherLab.mineralAmount < LAB_REACTION_AMOUNT)) {
					value = this.transfer(otherLab, res1, LAB_REACTION_AMOUNT);
				//	console.log(" micro setting other lab " +res1 + " result " + value);
					Game.rooms[this.room.name].visual.text(value, otherLab.pos);
					return 1;
				}
			}

			if (mixerLab.mineralAmount > 0 &&
				mixerLab.mineralType !== res2
				) {
				value = this.withdraw(mixerLab, mixerLab.mineralType);
			//	console.log(" micro clean mixerLab " + value );
				Game.rooms[this.room.name].visual.text(value, mixerLab.pos);
				return 1;
			} else 	if (this.carry[res2] && (!mixerLab.mineralAmount || mixerLab.mineralAmount < LAB_REACTION_AMOUNT)) {
				value = this.transfer(mixerLab, res2, LAB_REACTION_AMOUNT);
			//	console.log(" micro setting mixerLab " +res2 + " result " + value);
				Game.rooms[this.room.name].visual.text(value, mixerLab.pos);
				return 1;										
			}

		//	console.log("lab " + lab.mineralType  )	
		//	console.log("other lab " + otherLab.mineralType + "/" +res1 )
		//	console.log("mixer lab " + mixerLab.mineralType + "/" +res2 )
			let returnValue = lab.runReaction(mixerLab, otherLab);
			if (returnValue === OK) {
				return 1;
			}
			
		//	break;
			
		}
	}
};

Creep.prototype.roleLabMicroToPos = function () {
	if (this._memory.workPos === undefined) {
		let roomName = this.room.name;

		let inputLabs = this.room.getInputLabs()
		if (!this.room.memory.mixerLab || inputLabs.length < 2 ) { return 0; }


		let bestRange = 99;
		let bestPos;
		let range;
		let mixerLab = Game.getObjectById(Object.keys(this.room.memory.mixerLab)[0]);

		let theFirstLab = inputLabs[0];
		let theSecondLab = inputLabs[1];

		for (let i = 1; i <= 8; i++) {							
			let position = mixerLab.pos.getPositionAtDirection(i);
			if (!position.isPassible(true)) { continue; }

			range = position.getRangeTo(theFirstLab);
			range += position.getRangeTo(theSecondLab);
			Game.rooms[roomName].visual.text(range, position);
			if (range < bestRange){
				bestRange = range;
				bestPos = position;
			}
		}
		if (bestPos){
			this._memory.workPos = posCompress(bestPos);
		}
	}

	let destPos = posDecompress(this._memory.workPos, this._memory[C.ROOM_ORIGIN]);
	let rangeToPos = this.pos.getRangeTo(destPos);
	if (destPos && rangeToPos > 0 ) {
		this.travelTo(destPos, { maxRooms: 1, range: 0 });		
	} else if (destPos && rangeToPos === 0) {
		return 0;
	}
	return 1;
};

