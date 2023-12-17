
if(!Memory.__segindex) {
  Memory.__segindex = {
    'index': {},
    'savelog': {},
    'buffer': {},
    'ttls': {},
    'clear': [],
    'critical': [],
    'sidx': 0,
    'last': 100
  }
}


let cache = {}

let sos_lib_segments = {


  maxMemory: 100*1024,
  maxActiveSegments: 10,

  // Start at 2- leave some for manual assignment
  min: 2,
  max: 97,

  // *If possible* Leave this many segments available after processing.
  free: 3,

  segmentLoaded: function (label) {
  	let ids = this.getIndexByLabel(label, true)
  	
  	for(let i = 0; i < ids.length; i++) {
     
  		if (RawMemory.segments[ids[i]] === undefined) {
  			return false
  		}
  	}
  	return true
  },

  hasSegment: function (label) {
    return !!Memory.__segindex.index[label]
  },

  saveObject: function (label, data) {
    this.saveString(label, JSON.stringify(data))
  },

  saveString: function (label, string) {
    let needed_segments = Math.ceil(string.length/this.maxMemory)
    let ids = this.getIndexByLabel(label, true)
    let availableSegments = []
    if(!!RawMemory.segments) {
      availableSegments = Object.keys(RawMemory.segments)
    } else {
      availableSegments = []
    }

    if(ids.length > needed_segments) {
      // Mark unused segments for cleaning.
      let unneeded = ids.slice(needed_segments, ids.length)
      Memory.__segindex.clear = Memory.__segindex.clear.concat(unneeded)
      ids = ids.slice(0, needed_segments)
    } else if (ids.length < needed_segments) {
      let diff = needed_segments - ids.length
      for(let i = 0; i<diff; i++) {
        let id = this.getNextId()
        if(!id && id !== 0) {
          return ERR_FULL
        }
        ids.push(id)
      }
    }

    Memory.__segindex.index[label] = {'ids':ids}

    for(let i = 0; i < needed_segments; i++) {
      if (Object.keys(RawMemory.segments).length >= 10) { break; }
      let start = i * this.maxMemory
      let end = start + this.maxMemory // will end *one before* this value
      let chunk = string.slice(start, end)
      let id = ids[i]
      Memory.__segindex.savelog[id] = Game.time
      if(!cache[Game.time]) {
        cache[Game.time] = {}
      }
      cache[Game.time][label] = chunk
      if(availableSegments.indexOf(id) < 0) {
        Memory.__segindex.buffer[id] = chunk
      } else {
        RawMemory.segments[id] = chunk
      }
    }
  },

  getObject: function (label) {
    let stringdata = this.getString(label)
    if(typeof stringdata == 'string') {
      if(stringdata.length <= 0) {
        return {}
      } else {
        let start = Game.cpu.getUsed()

        let data = JSON.parse(stringdata)
        
        let parseTime = Game.cpu.getUsed() - start
        //console.log("parsing segment " + label + " in ms " +parseTime.toFixed(2) )
        /*
        Logger.log('Segment ' + label + ' parse time: ' + parseTime + ' with length ' + stringdata.length, LOG_WARN)
        Stats.addStat('segments.' + label, {
          'label': label,
          'parseTime': parseTime,
          'length': stringdata.length
        }, true)*/
        
        return data
      }
    }
    if(!stringdata || stringdata < 0) {
      return stringdata
    }
    return ERR_NOT_FOUND
  },

  getString: function (label, ttl=3) {
    let ids = this.getIndexByLabel(label, true)
    let datastring = ''
    for(let id of ids) {
      this.requestSegment(id, ttl)
      if(datastring === false || datastring < 0) {
        continue
      }

      if(typeof Memory.__segindex.buffer[id] == 'string') {
        datastring += Memory.__segindex.buffer[id]
        continue
      }

      if(!!RawMemory.segments && typeof RawMemory.segments[id] == 'string') {
        datastring += RawMemory.segments[id]
        continue
      }

      let saveTick = Memory.__segindex.savelog[id]
      if(!!cache[saveTick] && typeof cache[saveTick][id] == 'string') {
        datastring += cache[saveTick][id]
        continue;
      }

      datastring = ERR_BUSY
    }

    return datastring
  },

  clear: function (label) {
    let ids = this.getIndexByLabel(label)
    Memory.__segindex.clear = Memory.__segindex.clear.concat(ids)
    delete Memory.__segindex.index[label]
  },

  reserveSegments: function (label, count=1) {
    let ids = this.getIndexByLabel(label)

    if(!ids) {
      ids = []
    }

    if(ids.length > count) {
      let unneeded = ids.slice(count, ids.length)
      Memory.__segindex.clear = Memory.__segindex.clear.concat(unneeded)
      ids = ids.slice(0, count)
    } else if(ids.length < count) {
      let diff = count - ids.length
      for(let i = 0; i<diff; i++) {
        let id = this.getNextId()
        if(!id && id !== 0) {
          return ERR_FULL
        }
        ids.push(id)
      }
    }

    Memory.__segindex.index[label].ids = ids
    return ids
  },

  requestSegment: function (index, ttl=5) {
    Memory.__segindex.ttls[index] = ttl
  },

  unrequestSegment: function (index) {
    delete Memory.__segindex.ttls[index]
  },

  markCritical: function (label) {
    if(Memory.__segindex.critical.indexOf(label) < 0) {
      Memory.__segindex.critical.push(label)
    }
  },

  unmarkCritical: function (label) {
    let index = Memory.__segindex.critical.indexOf(label)
    if(index >= 0) {
      Memory.__segindex.critical.splice(index, 1)
    }
  },

  getAvailableSegments: function () {
    if(!RawMemory.segments) {
      return []
    }
    let availableSegments = Object.keys(RawMemory.segments).map(Number)
    availableSegments = _.filter(availableSegments, function(a){
      return Number.isInteger(a)
    })
    return availableSegments
  },

  moveToGlobalCache: function () {

    // On a server without memory segments so there is nothing to move.
    if(!RawMemory.setActiveSegments) {
      return
    }

    // Shift segments out of RawSegments so more segments can be saved.
    let availableSegments = this.getAvailableSegments()
    for (let id of availableSegments) {
      // Out of management range.
      if(id < this.min || id > this.max) {
        continue
      }

      // Hasn't been saved yet so don't remove it.
      if(!Memory.__segindex.savelog[id]) {
        continue
      }

      // Something may be trying to clear it- just leave blank.
      if(RawMemory.segments[id] === '') {
        continue
      }

      // Something is trying to clear it- leave for end of tick processing.
      if(Memory.__segindex.clear.includes(id)) {
        continue
      }

      let saveTick = Memory.__segindex.savelog[id]
      if(!cache[saveTick]) {
        cache[saveTick] = {}
      }
      cache[saveTick][id] = RawMemory.segments[id]
      delete RawMemory.segments[id]
    }
  },

  process: function () {
    let availableSegments = this.getAvailableSegments()

    // Build list of critical segments from label.
    let critical = []
    for(let critical_label of Memory.__segindex.critical) {
      let ids = this.getIndexByLabel(critical_label)
      critical = critical.concat(ids)
    }

    // Create list of segments to ask for, starting with the critical ones.
    let segments
    if(critical.length > this.maxActiveSegments - currentlyActiveSegment()) {
      segments = _.shuffle(critical.concat([])).slice(0,this.maxActiveSegments-currentlyActiveSegment())
    } else {
      segments = critical.concat([])
    }

    // clean available segments
    for(let index in Memory.__segindex.clear) {
      let id = Memory.__segindex.clear[index]
      if(Memory.__segindex.buffer[id]) {
        delete Memory.__segindex.buffer[id]
      }
      if(availableSegments.indexOf(id) >= 0) {
        RawMemory.segments[id] = ''
        delete Memory.__segindex.clear[index]
      } else {
        delete Memory.__segindex.clear[index]
      }
    }
    Memory.__segindex.clear = _.filter(Memory.__segindex.clear, function(a){
      return Number.isInteger(a)
    })

    // On a server without memory segments, so just keep things in buffer
    // and don't attempt to request real segments.
    if(!RawMemory.setActiveSegments) {
      return
    }

    // Flush buffer where possible, add to request where not

    // Get number of usable segments remaining.
    let currentsegments = this.getAvailableSegments().length
    let usablesegments = 10 - (currentsegments + this.free)

    // Move data from the buffers to segments.
    for(let index in Memory.__segindex.buffer) {
      let id = Number(index)

      // Is the segment active?
      if(availableSegments.indexOf(id) >= 0) {
        RawMemory.segments[id] = Memory.__segindex.buffer[index]
        delete Memory.__segindex.buffer[index]

      // Are there enough free segments to send data?
      } else if(usablesegments > 0) {
        RawMemory.segments[id] = Memory.__segindex.buffer[index]
        delete Memory.__segindex.buffer[index]
        usablesegments--

      // Are there enough free segments on the next tick to reserve some?
      } else if(segments.length < this.maxActiveSegments-currentlyActiveSegment()) {
        if (id > 0) {
          segments.push(id)
        } else {
          log("invalid segment id " + id)
        }
      }
    }

    for(let index in Memory.__segindex.clear) {
      let id = Number(index)
      if(usablesegments < 1) {
        break
      }
      RawMemory.segments[id] = ''
      delete Memory.__segindex.clear[index]
      usablesegments--
    }

    // Cache all segments in global to make reconstruction easier.
    
    for (let id of availableSegments) {
      let saveTick = Memory.__segindex.savelog[id]
      if(!saveTick) {
        saveTick = Game.time
        Memory.__segindex.savelog[id] = Game.time
      }
      if(!cache[saveTick]) {
        cache[saveTick] = {};
      }
      cache[saveTick][id] = RawMemory.segments[id]
    }

    // Add requested segments
    if(segments.length < this.maxActiveSegments-currentlyActiveSegment()) {
      let diff = this.maxActiveSegments - segments.length - currentlyActiveSegment()
      let reqs = Object.keys(Memory.__segindex.ttls)
      if(reqs.length > diff) {
        reqs.sort(function(a,b){
          return this.ttl[a] - this.ttl[b]
        }.bind({'ttl':Memory.__segindex.ttls}))
      }
      for(let index of reqs) {
        
        Memory.__segindex.ttls[index]--
        if(Memory.__segindex.ttls[index] <= 0) {          
          delete Memory.__segindex.ttls[index]          
          continue
        }
       
        segments.push(index);

        let comp = index.split(",");        
        for (let idx in comp) {
          segments.push(comp[idx]);
        }
        
        diff--
        if(diff <= 0) {
          break
        }
      }
    }

    // Clean old Cache entries
    if (Game.time % 337 === 0) {
      let maxAge = 777;
      let deletedEntries = 0;

      let temp = [];
      for (let timestamp in cache) {
        let age = Game.time - timestamp;
        if (age > maxAge) { 
        //  temp.push(age)
          delete cache[timestamp];
          deletedEntries++;
        }
      }
      log("cleaned cahce from sos_lib_segments! " + deletedEntries, "green")
    }
    

    // Add segments which needs to be cleared
    // Replace this by just injecting blind, as that works now
    if(segments.length < this.maxActiveSegments-currentlyActiveSegment()) {
      let diff = this.maxActiveSegments - segments.length -currentlyActiveSegment()
      let clear = Memory.__segindex.clear.concat({})
      if(clear.length > diff) {
        clear = clear.slice(0,diff)
      }
      segments = segments.concat(clear)
    }

    segments = _.filter(_.uniq(segments.map(Number)),function(a){return Number.isInteger(a) && a > 0})
    if(segments.length > 0) {
    
      segments = segments.slice(0, 9);
    //  console.log("requesting segments " + JSON.stringify(segments))
      RawMemory.setActiveSegments(segments)
    }
  },

  getNextId: function() {
    let current = Memory.__segindex.last
    if(!current || current > this.max) {
      current = this.min
    }
    let start = current

    let inUse = []
    for(let label in Memory.__segindex.index) {
      inUse = inUse.concat(Memory.__segindex.index[label].ids)
    }
    inUse = inUse.concat(_.values(Memory.__segindex.clear))

    while(true) {
      if(inUse.indexOf(current) < 0) {
        Memory.__segindex.last = +current + +1
        return current
      }
      current++
      if(current > this.max) {
        current = this.min
      }
      if(current == start) {
        return ERR_FULL
      }
    }
  },

  getIndexByLabel: function(label, autoassign=true) {
    if(!!Memory.__segindex.index[label] && !!Memory.__segindex.index[label].ids) {
      return Memory.__segindex.index[label].ids
    }

    if(autoassign) {
      let id = this.getNextId();            
      Memory.__segindex.index[label] = {'ids':[id]}
      console.log("assigning new segment " + label + " at segment " + id)
      if (Object.keys(RawMemory.segments).length < 10) {
        RawMemory.segments[id] = ''
      }
      
      return Memory.__segindex.index[label].ids.map(Number)
    } else {
      return ERR_NOT_FOUND
    }
  },

}


module.exports = sos_lib_segments