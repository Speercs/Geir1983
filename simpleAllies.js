'use strict'
// This is completely unencrypted and in the clear. Maybe it shouldn't be :D
const segmentID = 98;



let allyList = [
 //   "Tigga"
];

// Priotity convention:
// 1: I really need this or I'm going to die
// 0: That'd be nice I guess maybe if you really don't mind.
// Everything in between: everything in betweeen


// It's kinda important everybody has the same enums here.
const requestTypes = {
	RESOURCE: 0,
	DEFENSE: 1,
	ATTACK: 2,
	EXECUTE: 3,
    HATE: 4,
    REMOTE_DEF: 5,
}

let requestArray = [];

let simpleAlliesObject = {    
	// This sets foreign segments. Maybe you set them yourself for some other reason
	// Up to you to fix that.
	checkAllies() {
		
        allyList = simpleAlliesList || [];
		if (!allyList.length) return;

		// Only work 10% of the time
		if (Game.time % (10 * allyList.length) >= allyList.length) return

		let currentAllyName = allyList[Game.time % allyList.length];
        
		if (RawMemory.foreignSegment && RawMemory.foreignSegment.username == currentAllyName) {


            let allyRequests = [];
            try {
                allyRequests = JSON.parse(RawMemory.foreignSegment.data);

                if (RawMemory.foreignSegment.username === 'Geir1983') {
                    log(RawMemory.foreignSegment.data)
                }
            } catch (err){
                console.log('allyRequests error parsing public segment for player ' + RawMemory.foreignSegment.username + " " + err.name + err.stack);				
            }

            let hateRequestPri = 0
            let hateRequestPlayer;

			for (let request of allyRequests) {
				let priority = Math.max(0, Math.min(1, request.priority));
				let roomName;
				switch (request.requestType) {

                    case requestTypes.REMOTE_DEF:						
						roomName = request.roomName;
                        console.log("Remote def help requested from " + currentAllyName +" !" + request.roomName + " priority "+  priority)

                        global.allyRemoteDefence[roomName] = {};
                        global.allyRemoteDefence[roomName].priority = priority;
                        global.allyRemoteDefence[roomName].ts = Game.time + 350;

                        if (!Memory.rooms[roomName]) { Memory.rooms[roomName] = {}; }
                        Memory.rooms[roomName].enemyRemote = currentAllyName;
                        Memory.rooms[roomName].enemyRemoteTs = Game.time + 5000;

						break;

					case requestTypes.ATTACK:						
						roomName = request.roomName;
                        console.log("Attack help requested from " + currentAllyName +" !" + request.roomName + " priority "+  priority)

                        global.allyAttackRequest[roomName] = {};
                        global.allyAttackRequest[roomName].priority = priority;
                        global.allyAttackRequest[roomName].ts = Game.time + 350;

						break;
					case requestTypes.DEFENSE:						
						roomName = request.roomName;
                        console.log("Defense help requested from " + currentAllyName + " !" + request.roomName + " priority "+  priority)

                        global.allyDefenceRequest[roomName] = {};
                        global.allyDefenceRequest[roomName].priority = priority;
                        global.allyDefenceRequest[roomName].ts = Game.time + 350;

                        if (Memory.orderWreckers[roomName] === undefined || Memory.combatDeconstruct[roomName] === undefined) { Memory.orderWreckers[roomName] = {} }


						break;
					case requestTypes.RESOURCE:						
						roomName = request.roomName;
						let resource = request.resourceType;
						let maxAmount = request.maxAmount;
						
						console.log(currentAllyName + " requests resource " + resource + " to room " + request.roomName + " priority "+  priority + " amount " + maxAmount)
						
                        
                        if (resource === RESOURCE_ENERGY) {
                            if (priority > 0.95) {
                                if ( Memory.energyShare === undefined) {  Memory.energyShare = {}; } 
                                if ( Memory.energyShare.recieveAllies === undefined) {  Memory.energyShare.recieveAllies = {}; } 
                                Memory.energyShare.recieveAllies[roomName] = {};
                            }
                               
                            
                        } else {
                            if (global.mineralShare[resource] === undefined) { global.mineralShare[resource] = {}; } 
                            if (global.mineralShare[resource][roomName] === undefined) { global.mineralShare[resource][roomName] = {}; }
                        }
                       
												
						break;
					case requestTypes.HATE:
						let playerName = request.playerName;
                        
                        
                        if (priority > hateRequestPri) {
                            hateRequestPri = priority;
                            hateRequestPlayer = playerName;
                        }
                        
                        break;
                        

				}
            }
            
            if (hateRequestPlayer) {
                console.log(currentAllyName + " requested hate towards " + hateRequestPlayer)
                if (Memory.rage[hateRequestPlayer] && Memory.rage[hateRequestPlayer].rage < 1) {
                    Memory.rage[hateRequestPlayer].raw *= 1.02;
                }
            }
		}
		else {
			// console.log("Simple allies either has no segment or has the wrong name?", currentAllyName)
		}
		
		let nextAllyName = allyList[(Game.time + 1) % allyList.length];

		RawMemory.setActiveForeignSegment(nextAllyName);
	},

	// Call before making any requests
	startOfTick() {
		requestArray = [];
	},

	// Call after making all your requests
	endOfTick() {
		if (Object.keys(RawMemory.segments).length < 10) {			
			RawMemory.segments[segmentID] = JSON.stringify(requestArray)
            registerActiveSegment()

			// If you're already setting public segements somewhere this will overwrite that. You should
			// fix that yourself because I can't fix it for you.
            RawMemory.setPublicSegments([segmentID]);
            RawMemory.setDefaultPublicSegment(segmentID)
		}
    },

    createRequest(){
        this.startOfTick();

        // Energy request
        if (Memory.energyShare && Memory.energyShare.recive) {
            
            for (let room in Memory.energyShare.recive) {
                if (Memory.rooms[room].sieged ||
                    Memory.rooms[room].nukeResponse
                ) {
                    let amount = Math.max(10000, Memory.energyShare.recive[room].amount - Game.rooms[room].store(RESOURCE_ENERGY));
                    this.requestResource(room, RESOURCE_ENERGY, amount, 1);
                }
            }
        }

        // Mineral Request
        if (Memory.Minerals && Memory.Minerals.mineralRecieve) {
            for (let res in Memory.Minerals.Buy) {
                if (!Memory.Minerals.mineralRecieve || !Memory.Minerals.mineralRecieve[res]) { continue; }
                let room = Object.keys(Memory.Minerals.mineralRecieve[res])[0];
                let amount = Memory.Minerals.Buy[res];
            //    let priority = (Memory.Minerals[res] || 0) / 

                this.requestResource(room, res, amount, 0.25);
            }
        }
        
        // Defence Request
        for (let room in Memory.roomAttacked) {
            if (roomIsSafeModed(room)) { continue; }
            if (!Memory.rooms[room] || !Memory.rooms[room].hostiles || !Memory.rooms[room].sieged) { continue; }

            let priority = 0.75;
            if (Memory.rooms[room].hostiles && Memory.rooms[room].hostiles.power.strength && Memory.roomAttacked[room].myDefenderDmg) {
                if ((Memory.roomAttacked[room].myDefenderDmg * Math.min(Memory.roomAttacked[room].requiredDefenders, 4)) < Memory.rooms[room].hostiles.power.strength) {
                   
                } else {

                }
                priority += 1 - ((Memory.roomAttacked[room].myDefenderDmg * Math.min(Memory.roomAttacked[room].requiredDefenders || 1, 4)) / Memory.rooms[room].hostiles.power.strength);
            }

            let wantedEnergy = 15000
            if (Game.rooms[room] && Game.rooms[room].storage && Game.rooms[room].store(RESOURCE_ENERGY) < wantedEnergy) {
                priority += 1 - (Game.rooms[room].store(RESOURCE_ENERGY) / wantedEnergy)
            }




            this.requestHelp(room, Math.min(priority, 1));
        }

        // Hate request
        let mostHatedPlayer
        let mostRage = 0
        for (let player in Memory.rage) {
            if (Memory.rage[player].rage > mostRage) {
                mostRage = Memory.rage[player].rage;
                mostHatedPlayer = player;
            }
        }
        if (mostHatedPlayer) {
            this.requestHate(mostHatedPlayer, mostRage);
        }

        // Remote Def request
        for (let room in Memory.remoteAttacked) {

            if (!Memory.rooms[room]) { continue; } 

            if (!Memory.rooms[room].hostiles || !Memory.rooms[room].hostiles.power.defensive) { continue; }

            let myCreeps = getMyCombatCreepsAssignedTo(room)
            let myPower = calcCreepStrength(myCreeps);

            let priority = limit(1 - (myPower.defensive / Memory.rooms[room].hostiles.power.defensive), 0, 1);


            this.requestRemoteDefence(room, priority)
        }


        // Attack Request
        for (let room in Memory.raids.activeTargets) {
            if (global.allyAttackRequest[room]) {
                if (Game.time > global.allyAttackRequest[room].ts) {
                    delete global.allyAttackRequest[room].ts
                } else {
                    continue;
                }
            }
            if (!validateAttackTarget(room) ) { continue; }
            this.requestAttack(room, 0.5)
        }

        for (let room in Memory.combatDeconstruct) {
            if (global.allyAttackRequest[room]) {
                if (Game.time > global.allyAttackRequest[room].ts) {
                    delete global.allyAttackRequest[room].ts
                } else {
                    continue;
                }
            }
            if (!validateAttackTarget(room) ) { continue; }
            this.requestAttack(room, 0.5)
        }

        this.endOfTick();
    },

    requestRemoteDefence(roomName, priority) {
        let request = {requestType: requestTypes.REMOTE_DEF, roomName: roomName, priority: (priority === undefined ? 0 : priority)}
		requestArray.push(request)
	},

	requestAttack(roomName, priority) {
        let request = {requestType: requestTypes.ATTACK, roomName: roomName, priority: (priority === undefined ? 0 : priority)}
		requestArray.push(request)
	},

	requestHelp(roomName, priority) {
		let request = {requestType: requestTypes.DEFENSE, roomName: roomName, priority: (priority === undefined ? 0 : priority)}

		requestArray.push(request)
    },
    
    requestHate(playerName, priority) {
        let request = {requestType: requestTypes.HATE, playerName: playerName, priority: (priority === undefined ? 0 : priority)}
        requestArray.push(request)
    },

	requestResource(roomName, resourceType, maxAmount, priority) {
		if (maxAmount > 0) {
			
			let request = {requestType: requestTypes.RESOURCE, resourceType: resourceType, maxAmount: maxAmount, roomName: roomName, priority: (priority === undefined ? 0 : priority)}

			if (Game.time % 1000 == 0) {
				console.log(roomName, "requesting", resourceType, "max amount", maxAmount, "priority", priority)
			}

			requestArray.push(request)
		}
    },
    
    
};

module.exports = simpleAlliesObject;