'use strict'

let grafana = {
	run: function() {
		
	
		if (global.stats['gcl.progress'] === undefined || Game.time % 33 === 0) {
		
			// GCL
			let gclOffset = getGclOffset(Game.gcl.level)
			global.stats['gcl.progress'] = gclOffset + Game.gcl.progress;
			global.stats['gcl.progressTotal'] = gclOffset + Game.gcl.progressTotal;
			global.stats['gcl.level'] = Game.gcl.level;

			// GPL
			global.stats['gpl.level'] = Game.gpl.level;
			global.stats['gpl.progress'] = Game.gpl.progress;
			global.stats['gpl.progressTotal'] = Game.gpl.progressTotal;

			// Reduced Remotes
			global.stats['reducedRemotes'] = Memory.reducedRemotes || 0;
		}
		

		if (global.stats['market.credits'] === undefined || Game.time % 33 === 0) {
			
			// Markets and stores
			global.stats['market.credits'] = Game.market.credits;

			for (let boostType in BOOST_LEVEL) {
				for (let boostLevel in BOOST_LEVEL[boostType]){
					let res = BOOST_LEVEL[boostType][boostLevel]
					global.stats['minerals.'+res] = Memory.Minerals[res] || 0;
				}
			}
			
			global.stats['minerals.'+RESOURCE_ENERGY] = Memory.Minerals[RESOURCE_ENERGY] || 0;

			global.stats['minerals.'+RESOURCE_HYDROGEN] = Memory.Minerals[RESOURCE_HYDROGEN] || 0;
			global.stats['minerals.'+RESOURCE_OXYGEN] = Memory.Minerals[RESOURCE_OXYGEN] || 0;
			global.stats['minerals.'+RESOURCE_UTRIUM] = Memory.Minerals[RESOURCE_UTRIUM] || 0;
			global.stats['minerals.'+RESOURCE_LEMERGIUM] = Memory.Minerals[RESOURCE_LEMERGIUM] || 0;
			global.stats['minerals.'+RESOURCE_KEANIUM] = Memory.Minerals[RESOURCE_KEANIUM] || 0;
			global.stats['minerals.'+RESOURCE_ZYNTHIUM] = Memory.Minerals[RESOURCE_ZYNTHIUM] || 0;
			global.stats['minerals.'+RESOURCE_CATALYST] = Memory.Minerals[RESOURCE_CATALYST] || 0;

			global.stats['minerals.'+RESOURCE_POWER] = Memory.Minerals[RESOURCE_POWER] || 0;
			global.stats['minerals.'+RESOURCE_OPS] = Memory.Minerals[RESOURCE_OPS] || 0;

			global.stats['minerals.'+T3_CARRY] = Memory.Minerals[T3_CARRY] || 0;
			global.stats['minerals.'+T3_UPGRADE_CONTROLLER] = Memory.Minerals[T3_UPGRADE_CONTROLLER] || 0;
			global.stats['minerals.'+T3_HARVEST] = Memory.Minerals[T3_HARVEST] || 0;
			
			global.stats['minerals.'+RESOURCE_METAL] = Memory.Minerals[RESOURCE_METAL] || 0;
			global.stats['minerals.'+RESOURCE_MIST] = Memory.Minerals[RESOURCE_MIST] || 0;
			global.stats['minerals.'+RESOURCE_BIOMASS] = Memory.Minerals[RESOURCE_BIOMASS] || 0;
			global.stats['minerals.'+RESOURCE_SILICON] = Memory.Minerals[RESOURCE_SILICON] || 0;

			for (let res in COMMODITIES) {
				global.stats['minerals.'+res] = Memory.Minerals[res] || 0;
			}

			// MARKET
			global.stats.market = Memory.market;
		}
	
		
		global.stats['time'] = Game.time;
		
		global.stats['cpu.bucket'] = Game.cpu.bucket;
		global.stats['cpu.limit'] = Game.cpu.limit;
		

		// Energy Profiling		
		if (global.ENABLE_ENERGY_PROFILING) {


			let time = 1500;
			let newStats = false;
			for (let roomName in Memory.EP) {
				if (Game.time < Memory.EP[roomName].ts) { continue; }
				newStats = true

				Memory.EP[roomName].ts = Game.time + time;

				for (let key in Memory.EP[roomName]) {
					if (key === 'ts') {
						continue;
					} else if (key === 'creeps') {
						for (let role in Memory.EP[roomName].creeps) {
							Memory.EP[roomName].creeps[role].ept = Number((Memory.EP[roomName].creeps[role].raw / time).toFixed(1));
							Memory.EP[roomName].creeps[role].raw = 0;							
						}
					} else {
						Memory.EP[roomName][key].ept = Number((Memory.EP[roomName][key].raw / time).toFixed(1));
						Memory.EP[roomName][key].raw = 0;
					}
				}	
			}

			if (newStats) {

				let prevEpCreeps = _.clone(Memory.EP.creeps)
				Memory.EP.creeps = {};

				for (let roomName in Memory.EP) {
					if (!Memory.EP[roomName].creeps) { continue; }

					for (let role in Memory.EP[roomName].creeps) {
						if (!Memory.EP[roomName].creeps[role].ept) { continue; }
						if (Memory.EP.creeps[role] === undefined) {
							Memory.EP.creeps[role] = {};
							Memory.EP.creeps[role].ept = 0;
						}

						Memory.EP.creeps[role].ept += Memory.EP[roomName].creeps[role].ept;
					}
				}

				for (let role in prevEpCreeps) {
					if (!prevEpCreeps[role].ept) { continue; }

					if (Memory.EP.creeps[role] === undefined) {
						Memory.EP.creeps[role] = {};
						Memory.EP.creeps[role].ept = 0;
					}
				} 
			}

			global.stats.EP = Memory.EP;
		}

		if (SEASONAL_COMMS && COMMODITY_SCORE) {
			if (global.stats['market.commsScore'] === undefined || Game.time % 33 === 0) {
				let score = 0;
				for (let res in COMMODITY_SCORE) {
					let value = (Memory.Minerals[res] || 0) * COMMODITY_SCORE[res]				
	
					global.stats['commsScore.' + res] = value;
				}
			}			
		}

		if (SEASONAL_SCORE) { 
			global.stats['score'] = Memory.scoreDelivered || 0;
			global.stats['minerals.'+RESOURCE_SCORE] = Memory.Minerals[RESOURCE_SCORE] || 0; 
		}

		if (SEASONAL_SYMBOLS) {
			global.stats['symbolsScored'] = Game.symbols;
			for (let idx in SYMBOLS) {
				let symbol = SYMBOLS[idx]
				global.stats['symbolsStored2.' + symbol] = Memory.Minerals[symbol] || 0;
			}

			if (global._playerInfo && global._playerInfo.data) {

				if (global._playerInfo.ts !== global._playerInfo.tsGrafana) {
					log("grafana storing new Python data!")
					let playerInfo = {};
					try {
						playerInfo = JSON.parse(global._playerInfo.data);		
						global._playerInfo.parsedData = playerInfo		
					} catch (e) {
						log("invlaid grafana playerData + ")
					}
					global._playerInfo.tsGrafana = global._playerInfo.ts;
				}


				if (global._playerInfo.parsedData) {
					global.stats['playerData'] = global._playerInfo.parsedData;
				}				
			}			
		}


		global.stats['cpu.getUsed'] = Game.cpu.getUsed();

		if (Object.keys(RawMemory.segments).length < 10) {
			RawMemory.segments[1] = JSON.stringify(global.stats);
			registerActiveSegment()
		}

	}
}
module.exports = grafana;

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
/*
		

	Memory.cpugraphdata = Memory.cpugraphdata || [];
    let size = {w: 30, h: 5, t: 1, l: 2, };
    let rv = new RoomVisual();
    
    rv.line(size.l, size.t, size.l + size.w, size.t, { color: '#8a8a8a', opacity: 0.3, });
    rv.line(size.l, size.t + size.h, size.l + size.w, size.t + size.h, { color: '#8a8a8a', opacity: 0.3, });
    rv.line(size.l, size.t, size.l, size.t + size.h, { color: '#8a8a8a', opacity: 0.3, });
    rv.line(size.l + size.w, size.t, size.l + size.w, size.t + size.h, { color: '#8a8a8a', opacity: 0.3, });
    rv.line(size.l, size.t + (size.h * 0.25), size.l + size.w, size.t + (size.h * 0.25), { color: '#8a8a8a', opacity: 0.3, });
    rv.line(size.l, size.t + (size.h * 0.50), size.l + size.w, size.t + (size.h * 0.50), { color: '#8a8a8a', opacity: 0.3, });
    rv.line(size.l, size.t + (size.h * 0.75), size.l + size.w, size.t + (size.h * 0.75), { color: '#8a8a8a', opacity: 0.3, });
    rv.text("CPU Used Graph", size.l, size.t - 0.5, {color: "#dddddd", align: "left", size: 0.55, stroke : '#222222', strokeWidth : 0.15, background: "222222" });
    rv.text(Game.cpu.limit, size.l - 0.3, size.t + 0.2, {color: "#ff0000", align: "right", size: 0.55, stroke : '#222222', strokeWidth : 0.15, background: "222222" });
    rv.text(Game.cpu.limit * 0.75, size.l - 0.3, size.t + (size.h - (size.h * 0.75)) + 0.2, {color: "#ff7f00", align: "right", size: 0.55, stroke : '#222222', strokeWidth : 0.15, background: "222222" });
    rv.text(Game.cpu.limit * 0.5  , size.l - 0.3,  size.t + (size.h - (size.h * 0.5)) + 0.2, {color: "#ffff00", align: "right", size: 0.55, stroke : '#222222', strokeWidth : 0.15, background: "222222" });
    rv.text(Game.cpu.limit * 0.25, size.l - 0.3,  size.t + (size.h - (size.h * 0.25)) + 0.2, {color: "#7fff00", align: "right", size: 0.55, stroke : '#222222', strokeWidth : 0.15, background: "222222" });
    rv.text(0, size.l - 0.3,  size.t + size.h + 0.2, {color: "#00ff00", align: "right", size: 0.55, stroke : '#222222', strokeWidth : 0.15, background: "222222" });
	
    for ( let i = 0; i < Memory.cpugraphdata.length; i ++ ) {
        let cpuamount = Memory.cpugraphdata[i];
        let lastcpuamount = Memory.cpugraphdata[i-1];

        let col = "#7fff00"
        col = cpuamount > (Game.cpu.limit * 0.25) ? '#ffff00' : col;
        col = cpuamount > (Game.cpu.limit * 0.5) ? '#ff7f00' : col;
        col = cpuamount > (Game.cpu.limit * 0.75) ? '#ff0000' : col;
        

        if ( i > 0 ) {
            rv.line( size.l + ((size.w / 100) * i),
                size.t + ((size.h / Game.cpu.limit) * (Game.cpu.limit - cpuamount)), 
                size.l + ((size.w / 100) * (i - 1)), 
                size.t + ((size.h / Game.cpu.limit) * (Game.cpu.limit - lastcpuamount)),
                { color: '#9c9c9c' });
        }
        rv.circle( size.l + ((size.w / 100) * i),
            size.t + ((size.h / Game.cpu.limit) * (Game.cpu.limit - cpuamount)),
            { radius: 0.1, fill: col, opacity : 0.5 });

    }
    
    Memory.cpugraphdata.push(Game.cpu.getUsed());
    if ( Memory.cpugraphdata.length > 100 ) Memory.cpugraphdata.shift();
*/