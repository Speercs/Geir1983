'use strict'
let setup = false;

module.exports = function(options) {
  if (!setup) {
    options = options || {};

        
    if (options.speedUpArrayFunctions || options.speedUpArrayFunctions === undefined) {
      Array.prototype.filter = function(callback, thisArg) {
        let results = [];
        let arr = this;
		    let length = arr.length
        for (let iterator = 0; iterator < length; iterator++) {
          if (callback.call(thisArg, arr[iterator], iterator, arr)) {
            results.push(arr[iterator]);
          }
        }
        return results;
      };

      Array.prototype.forEach = function(callback, thisArg) {
        let arr = this;
        for (let iterator = 0; iterator < arr.length; iterator++) {
          callback.call(thisArg, arr[iterator], iterator, arr);
        }
      };

      
      Array.prototype.map = function(callback, thisArg) {
        let arr = this;
        let returnVal = [];
        for (let iterator = 0; iterator < arr.length; iterator++) {
          returnVal.push(callback.call(thisArg, arr[iterator], iterator, arr));
        }
        return returnVal;
      };
    }
    
    setup = true;
  }

};


/**
 * Alternative RoomPosition methods that offer slightly better performance and
 * less overhead by eliminating the side-effects and overhead created by 
 * utils.fetchXYArguments, which is made by most RoomPosition method calls. 
 *
 * The original versions of all overloaded methods are already very cheap CPU
 * wise.  While these make those calls even cheaper, you may not notice a
 * different depending on how frequently you use them. The primary benefit is
 * the elimination of Array creation resulting from calls to fetchXYArguments
 *
 * Each method was tested 100K+ times in order to verify the original
 * method's return value matched the overloaded method's exactly.
 * If you are still concerned about overloading API defined names, you can
 * provide custom names without loss of functionality.  If you are looking for a
 * quick replacement, here are the original names:
 *
 *     isEqualTo -------> isSameAs
 *     isNearTo --------> isCloseTo
 *     inRangeTo -------> isWithin
 *     getRangeTo ------> getDistanceTo
 *     getDirectionTo --> getHeadingTo;
 *
 * Require this file anywhere in your project and the replacements should 
 * take effect on reset.
 */

/**
 * Used to decompress room names that have been converted to an x, y position
 *
 * @constant
 * @type       {number}
 */
const HEADING_OFFSET = 122;

/**
 * Slightly faster version of Math.abs(). Any value larger than a 32 bit signed
 * integer will return incorrect results; use only for RoomPositions
 * calculations where number range is restricted
 *
 * @param      {number}  n       target value
 * @return     {number}  absolute value of n if n does not evaluate to NaN
 */
function abs(n) {
    // NaN === NaN is always false
    if (!(typeof n === 'number' && n === n)) {
        return NaN;
    }
    return (n ^ (n >> 31)) - (n >> 31);
}

/**
 * Helper function; returns roomName as a compressed x,y value
 *
 * @param      {string}  roomName  Any valid roomName
 * @return     {number}  RoomName converted to a compressed x,y coordinate
 */
function roomNameToXY(roomName) {
    const vertical = roomName.search(/[NS]/);

    let x = +roomName.substring(1, vertical) + 61;
    if (roomName[0] === 'W') {
        x = 60 - (x - 61);
    }
    let y = +roomName.substring(vertical + 1) + 61;
    if (roomName[vertical] === 'N') {
        y = 60 - (y - 61);
    }
    return x * HEADING_OFFSET + y;
}

/**
 * Helper function; gets direction based on the change in x and y positions
 *
 * @param      {number}  dx      Change in x position
 * @param      {number}  dy      Change in y position
 * @return     {number}  A MOVE constant representing the change in direction
 */
function getDirection(dx, dy) {
    const adx = abs(dx);
    const ady = abs(dy);
    if (adx > ady * 2) {
        return dx > 0 ? RIGHT : LEFT;
    }
    if (ady > adx * 2) {
        return dy > 0 ? BOTTOM : TOP;
    }
    if (dx < 0) {
        return LEFT + Math.sign(dy) * -1;
    }
    if (dx > 0) {
        return RIGHT + Math.sign(dy);
    }
}

/**
 * @override
 *
 * @param      {number|RoomPosition|RoomObject}  arg1    target obj, position,
 *                                                       or x value
 * @param      {number}                          [arg2]  y value
 * @return     {boolean}                         true if pos is equal to target,
 *                                               else false
 */
RoomPosition.prototype.isEqualTo = function(arg1, arg2) {
    const type = typeof arg1;
    if (type === 'number') {
        arg2 = typeof arg2 === 'number' ? arg2 : undefined;
        return this.x === arg1 && this.y === arg2;
    }
    if (type !== 'object' || arg1 === null) {
        return false;
    }
    const p = arg1.pos || arg1;
    return this.roomName === p.roomName && this.x === p.x && this.y === p.y;
};

/**
 * @override
 *
 * @param      {number|RoomPosition|RoomObject}  arg1    target obj, position,
 *                                                       or x value
 * @param      {number}                          [arg2]  y value
 *
 * @return     {boolean}  true if pos is <= 1 tile away from target, else false
 */
RoomPosition.prototype.isNearTo = function(arg1, arg2) {
    const type = typeof arg1;
    if (type === 'number') {
        arg2 = typeof arg2 === 'number' ? arg2 : undefined;
        return abs(this.x - arg1) <= 1 && abs(this.y - arg2) <= 1;
    }
    if (type !== 'object' || arg1 === null) {
        return false;
    }
    const pos = arg1.pos || arg1;
    return (
        this.roomName === pos.roomName &&
        abs(this.x - pos.x) <= 1 &&
        abs(this.y - pos.y) <= 1
    );
};

/**
 * @override
 *
 * @param      {number|RoomPosition|RoomObject}  arg1    target obj, position,
 *                                                       or x value
 * @param      {number|RoomPosition|RoomObject}  arg2    target obj, position, y
 *                                                       y value, or rangeTo
 *                                                       value if arg1 === obj
 * @param      {number|undefined}                [arg3]  range to target if arg1
 *                                                       and arg2 are provided
 *
 * @return     {boolean}  true if pos is within range of target, else false
 */
RoomPosition.prototype.inRangeTo = function(arg1, arg2, arg3) {
    const type = typeof arg1;
    if (type === 'number') {
        arg2 = typeof arg2 === 'number' ? arg2 : undefined;
        return abs(this.x - arg1) <= arg3 && abs(this.y - arg2) <= arg3;
    }
    if (type !== 'object') {
        return false;
    }
    const p = arg1.pos || arg1;
    return (
        this.roomName === p.roomName &&
        Math.max(abs(this.x - p.x), abs(this.y - p.y)) <= arg2
    );
};

/**
 * @override
 *
 * @param      {number|RoomPosition|RoomObject}  arg1    target obj, position,
 *                                                       or x value
 * @param      {number}                          [arg2]  y value
 *
 * @return     {number}  linear distance to target
 */
RoomPosition.prototype.getRangeTo = function(arg1, arg2) {
    const type = typeof arg1;
    if (type === 'number') {
        arg2 = typeof arg2 === 'number' ? arg2 : undefined;
        return Math.max(abs(this.x - arg1), abs(this.y - arg2));
    }
    if (type !== 'object' || arg1 === null) {
        return NaN;
    }

    const p = arg1.pos || arg1;
    if (p.roomName === this.roomName) {
        return Math.max(abs(this.x - p.x), abs(this.y - p.y));
    }
    return p.roomName in Game.rooms ? Infinity : NaN;
};

/**
 * @override
 *
 * @param      {RoomPosition|RoomObject|number}  arg1    target obj, position,
 *                                                       or x value 
 * @param      {number}                          [arg2]  y position if arg1 is a
 *                                                       number
 * @return     {number|undefined}                The direction to the target
 */
RoomPosition.prototype.getDirectionTo = function(arg1, arg2) {
    const type = typeof arg1;
    if (type === 'number') {
        return getDirection(arg1 - this.x, arg2 - this.y);
    }
    if (type !== 'object' || arg1 === null) {
        return;
    }

    const goal = arg1.pos || arg1;
    if (this.roomName === goal.roomName) {
        return getDirection(goal.x - this.x, goal.y - this.y);
    }
    const thisRoom = roomNameToXY(this.roomName);
    const thatRoom = roomNameToXY(goal.roomName);

    const thatRX = Math.floor(thatRoom / HEADING_OFFSET);
    const thisRX = Math.floor(thisRoom / HEADING_OFFSET);
    const thatRY = thatRoom - thatRX * HEADING_OFFSET;
    const thisRY = thisRoom - thisRX * HEADING_OFFSET;

    return getDirection(
        thatRX * 50 + goal.x - thisRX * 50 - this.x,
        thatRY * 50 + goal.y - thisRY * 50 - this.y
    );
};


global.getDirectionFromTo = function(fromPos, toPos) {    

    const goal = toPos;
    if (fromPos.roomName === goal.roomName) {
        return getDirection(goal.x - fromPos.x, goal.y - fromPos.y);
    }
    const thisRoom = roomNameToXY(fromPos.roomName);
    const thatRoom = roomNameToXY(goal.roomName);

    const thatRX = Math.floor(thatRoom / HEADING_OFFSET);
    const thisRX = Math.floor(thisRoom / HEADING_OFFSET);
    const thatRY = thatRoom - thatRX * HEADING_OFFSET;
    const thisRY = thisRoom - thisRX * HEADING_OFFSET;

    return getDirection(
        thatRX * 50 + goal.x - thisRX * 50 - fromPos.x,
        thatRY * 50 + goal.y - thisRY * 50 - fromPos.y
    );
}