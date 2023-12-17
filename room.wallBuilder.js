'use strict'

Room.prototype.createWallTemplate = function(segment = {}, originExt) {
	
//	if (segment.walls === undefined) {segment.walls = {} }
	if (segment.walls === undefined) {
		segment.walls = {}
		segment.walls.wall = {}
		segment.walls.rampart = {}
		let cm = new PathFinder.CostMatrix(); 

		let origin = this.controller //this.findByType(STRUCTURE_SPAWN)		
		let originPos = origin.pos
		if (originExt) { originPos = originExt}
		let exits = this.find(FIND_EXIT).map(e => ({pos: e, range: 0})); 
		while(true) {
			let {path,incomplete} = PathFinder.search(originPos, exits, {roomCallback: () => cm, maxRooms: 1});
			if(incomplete){					
				break; }   
			let pos = path[path.length-3];   
			cm.set(pos.x,pos.y,255);  // obstruct path for next loop
		//	let wallOrRampart = (pos.x + pos.y) % 2;
			let wallOrRampart
			// console.log("wallOrRampart" + wallOrRampart)
			let structureExisting = pos.findInRange(FIND_STRUCTURES, 0, {
                        filter: (structure) => {
                        return (structure.structureType !== STRUCTURE_WALL &&
								structure.structureType !== STRUCTURE_RAMPART)
                        }});                 
			if (!wallOrRampart || structureExisting.length > 0  ) {
				segment.walls.rampart[this.posCompress(pos)] = {}
			} else {
				segment.walls.wall[this.posCompress(pos)] = {}
			}
			
		}
		
	//	segment = this.refineWallTemplate(segment)
		
	}		
	return segment
}

Room.prototype.refineWallTemplate = function(segment = {}) {
	// Make sure no corners are left unreachable from a rampart
	let dist = 1
	for (let posIdx in segment.walls.wall) {
		
		let pos = this.posDecompress(posIdx)		
		let top = limit(pos.y-dist, 0, 49)
		let left = limit(pos.x-dist, 0, 49)
		let bot = limit(pos.y+dist, 0, 49)
		let right = limit(pos.x+dist, 0, 49)
		
		let structures = this.lookForAtArea(LOOK_STRUCTURES, top,left,bot,right, true)
		let ramparts = _.filter(structures,  
					function(structure) {return (structure.structure.structureType === STRUCTURE_RAMPART)	
					});
		let walls = _.filter(structures,  
					function(structure) {return (structure.structure.structureType === STRUCTURE_WALL)	
					});
		console.log("ramparts " + ramparts.length  + " walls "+ walls.length + " pos " + pos) 			
		if (ramparts.length == 0 || (walls.length <= 1 && ramparts.length <= 1 )) {
			// become rampart
		//	let visual = new RoomVisual(this.name).circle(pos.x, pos.y ,
		//	{fill: 'transparent', radius: 0.50, stroke: 'red'})
			delete segment.walls.wall[this.posCompress(pos)] 
			segment.walls.rampart[this.posCompress(pos)] = {}
		}
	}
	return segment
}


Room.prototype.buildWallFromTemplate = function(segmentId) {
	
	if (!accessMemorySegment(segmentId) ) {
		console.log(" buildWallFromTemplate no access to id " +segmentId)
		return 0
	}
	let segment = getMemorySegment(segmentId)
	if (segment.walls === undefined) { 
		segment = this.createWallTemplate(segment)
		saveMemorySegment(segmentId, segment)
	//	this.displayWalls(segment)
		this.removeUnwantedWalls(segment);
	}

	let currentConstSites = Object.keys(Game.constructionSites).length;
	let possibleCsites = MAX_CONSTRUCTION_SITES - currentConstSites;
	
	for (let posIdx in segment.walls.wall) {
		if (possibleCsites < 20 ) { return 0 }
		let pos = this.posDecompress(posIdx)
		this.createConstructionSite(pos, STRUCTURE_WALL)
		possibleCsites--;
	}
	
	for (let posIdx in segment.walls.rampart) {
		if (possibleCsites < 20 ) { return 0 }
		let pos = this.posDecompress(posIdx)
		this.createConstructionSite(pos, STRUCTURE_RAMPART)
		possibleCsites--;
	}
	
}

Room.prototype.removeUnwantedWalls = function(segment) {
	if (segment.walls === undefined) { this.createWallTemplate() }
	
	let existingWalls = this.find(FIND_STRUCTURES, {
				filter: (structure) => {
					return (structure.structureType == STRUCTURE_WALL )					
				}});
				
	for (let i=0; i<existingWalls.length; i++) { 
		if (segment.walls.wall[this.posCompress(existingWalls[i].pos)] === undefined) {
			existingWalls[i].destroy()
			//let visual = new RoomVisual(this.name).circle(existingWalls[i].pos.x, existingWalls[i].pos.y ,
			//	{fill: 'transparent', radius: 0.50, stroke: 'red'})
		}
	}	
}

Room.prototype.displayWalls = function(segment) {
	if (segment.walls === undefined) { return }
	 
	for (let posIdx in segment.walls.rampart) {
		let pos = this.posDecompress(posIdx)
	//	let visual = new RoomVisual(this.name).circle(pos.x, pos.y ,
	//		{fill: 'transparent', radius: 0.50, stroke: 'red'})
		
	}
	
	for (let posIdx in segment.walls.wall) {
		let pos = this.posDecompress(posIdx)
	//	let visual = new RoomVisual(this.name).circle(pos.x, pos.y ,
	//		{fill: 'transparent', radius: 0.45, stroke: 'white'})
		
	}
	
}

