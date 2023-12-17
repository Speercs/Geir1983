/// https://gist.github.com/Szpadel/fcd47a8e8dd846a2e84801a658e06928

////// main.ts
/*
global.trace = (ticks) => {
    global.Tracing.enableTracing(ticks);
    console.log(`Enabled tracing for ${ticks} ticks`);
};
global.Tracing = new Tracing();
wrapEngine();
export function loop() {
    yourCodeLoop();
    global.Tracing.postTick();
}*/




    ///// tracing.ts 


let EventPhase;
(function (EventPhase) {
    EventPhase["Start"] = "B";
    EventPhase["End"] = "E";
})(EventPhase || (EventPhase = {}));

class Tracing {
    constructor() {
        this.serializedEvents = "";
        this.events = [];
        this.isEnabled = false;
        this.ticksLeft = 0;
    }
    enableTracing(ticks) {
        this.events = [];
        this.isEnabled = true;
        this.ticksLeft = ticks;
        this.serializedEvents = '';
    }
    traceCall(name, fn, argsFn) {
        if (this.isEnabled) {
            const start = {
                name,
                ph: EventPhase.Start,
                pid: 0,
                tid: Game.time,
                ts: Game.cpu.getUsed() * 1000,
            };
            fn();
            this.events.push(start, {
                name,
                ph: EventPhase.End,
                pid: 0,
                tid: Game.time,
                ts: Game.cpu.getUsed() * 1000,
                args: argsFn ? argsFn() : undefined,
            });
        }
        else {
            fn();
        }
    }
    startCall(name) {
        if (this.isEnabled) {
            const start = {
                name,
                ph: EventPhase.Start,
                pid: 0,
                tid: Game.time,
                ts: Game.cpu.getUsed() * 1000
            };
            return {
                endCall: () => {
                    this.events.push(start, {
                        name,
                        ph: EventPhase.End,
                        pid: 0,
                        tid: Game.time,
                        ts: Game.cpu.getUsed() * 1000
                    });
                }
            };
        }
        else {
            return {
                endCall: () => { },
            };
        }
    }
    downloadTrace() {
        const code = 'Download trace hook <script>' +
            `(() => {` +
            `angular.element("section.console").scope().Console.clear();` +
            `let filename = 'trace.json';` +
            `let text = JSON.stringify({ traceEvents: [${this.serializedEvents}], displayTimeUnit: 'ms'});` +
            `const element = document.createElement('input');` +
            `element.nwsaveas = 'trace.json';` +
            `element.type='file';` +
            `document.body.appendChild(element);` +
            `element.click();` +
            `document.body.removeChild(element);` +
            `element.addEventListener('change', () => {` +
            `    const fs = nw.require('fs');` +
            `    fs.writeFileSync(element.value, text);` +
            `});` +
            `})();` +
            `</script>`;
        console.log(code.replace("\n", ""));
    }
    serializeEvents() {
        const serial = JSON.stringify(this.events);
        this.events = [];
        if (this.serializedEvents.length > 0) {
            this.serializedEvents += ',';
        }
        this.serializedEvents += serial.substring(1, serial.length - 1);
    }
    postTick() {
        if (this.isEnabled) {
            this.ticksLeft--;
            this.serializeEvents();
            if (this.ticksLeft <= 0) {
                this.isEnabled = false;
                this.downloadTrace();
                this.events = [];
                this.serializedEvents = '';
            }
            else {
                console.log(`Tracing ${this.ticksLeft}...`);
            }
        }
    }
}

global.trace = (ticks) => {
    global.Tracing.enableTracing(ticks);
    console.log(`Enabled tracing for ${ticks} ticks`);
};
global.Tracing = new Tracing();

    
