let wsUrl = location.hostname
if (location.port) {
    wsUrl += ':' + location.port
}
let protocol = 'ws'
if (location.protocol == 'https:') {
    protocol = 'wss'
}
travisListener.connect({
    url: protocol + '://' + wsUrl
})

let statWsUrl = location.hostname + ':5525'
if (location.hostname != 'localhost') {
    statWsUrl = location.hostname + '/ws/'
}
const statWS = new WebSocket(protocol + '://' + statWsUrl)


var tv = 1000;
var maxPoints = 30
var previousTime = null;

var graph = new Rickshaw.Graph( {
	element: document.getElementById("travisChart"),
	height: 200,
    renderer: 'bar',
    gapSize: 0,
	stroke: true,
	preserve: true,
	series: new Rickshaw.Series.FixedDuration([{ name: 'job' }], undefined, {
		timeInterval: tv,
		maxDataPoints: maxPoints,
		timeBase: new Date().getTime() / 1000
	}) 
} );
var cpu = new Rickshaw.Graph( {
	element: document.getElementById("cpuChart"),
	height: 200,
    renderer: 'line',
    gapSize: 0,
	stroke: true,
	preserve: true,
	series: new Rickshaw.Series.FixedDuration([{ name: 'front' }], undefined, {
		timeInterval: 500,
		maxDataPoints: 20,
		timeBase: new Date().getTime() / 1000
	}) 
} );
var memory = new Rickshaw.Graph( {
	element: document.getElementById("memoryChart"),
	height: 200,
    renderer: 'line',
    gapSize: 0,
	stroke: true,
	preserve: true,
	series: new Rickshaw.Series.FixedDuration([{ name: 'front' }], undefined, {
		timeInterval: 500,
		maxDataPoints: 20,
		timeBase: new Date().getTime() / 1000
	}) 
} );

var state = new Rickshaw.Graph( {
	element: document.getElementById("stateChart"),
	height: 200,
    renderer: 'bar',
    stroke: true,
	preserve: true,
	series: [
		{
            color: '#c05020',
            data: []
        }
	]
});

var resize = function() {
	state.configure({
		width: state.element.parentElement.offsetWidth - 40,
		height: 200
    });
    cpu.configure({
		width: cpu.element.parentElement.offsetWidth - 40,
		height: 200
    });
    memory.configure({
		width: memory.element.parentElement.offsetWidth - 40,
		height: 200
    });
    graph.configure({
		width: graph.element.parentElement.offsetWidth,
		height: 200
    });
	state.render();
}
window.addEventListener('resize', resize); 
resize();

var stateMap = {
    0: 'Passed',
    1: 'Failed',
    2: 'Errored',
    3: 'Canceled',
    4: 'Started',
    5: 'Created',
    6: 'Queued',
    7: 'Received',
};

var format = function(n) {
	return stateMap[n];
}
var x_ticks = new Rickshaw.Graph.Axis.X( {
	graph: state,
	orientation: 'bottom',
	element: document.getElementById('stateChart_x_axis'),
	// pixelsPerTick: 200,
	tickFormat: format
} );


new Rickshaw.Graph.Axis.Time({
    graph: graph,
    timeUnit: {
        name: 'fixed',
        seconds: 1,
		formatter: function(d) { return Math.floor((new Date() - d)/1000) + 's' }
    }
});
new Rickshaw.Graph.Axis.Time({
    graph: memory,
    timeUnit: {
        name: 'fixed',
        seconds: 1,
		formatter: function(d) { return Math.floor((new Date() - d)/1000) + 's' }
    }
});
new Rickshaw.Graph.Axis.Time({
    graph: cpu,
    timeUnit: {
        name: 'fixed',
        seconds: 1,
		formatter: function(d) { return Math.floor((new Date() - d)/1000) + 's' }
    }
});

new Rickshaw.Graph.HoverDetail({
    graph: graph
});
new Rickshaw.Graph.HoverDetail({
    graph: cpu
});
new Rickshaw.Graph.HoverDetail({
    graph: memory
});
new Rickshaw.Graph.HoverDetail({
    graph: state,
    formatter: function(series, x, y) {
		var date = '<span class="state">' + stateMap[x] + '</span>';
		var content = date + ": " + parseInt(y);
		return content;
	}
});
  
graph.render();
cpu.render();
memory.render();
state.render();

const times = {
    job: {},
    build: {},
    job_updated: {},
    job_finished: {},
    build_updated: {},
    build_finished: {},
}

var iv = setInterval( function() {
    const d = new Date()
    if (previousTime == null) {
        previousTime = Math.floor(d.getTime()/1000) - 1
    }
    const key = previousTime++

    var data = {};
    for (let i in times) {
        data[i] = (times[i][key] || []).length
        for (let k in times[i]) {
            if (parseInt(k) < key - (maxPoints * tv / 1000)) {
                delete times[i][k];
            }
        }
    }
	graph.series.addData(data);
    graph.render();
    
    const currentSate = {}
    for (let i in times) {
        for (let k in times[i]) {
            for (let job of times[i][k]) {
                if (currentSate[job.state] == null) {
                    currentSate[job.state] = 0
                }
                currentSate[job.state]++
            }
        }
    }
    const value = []
    index = 0
    for (let k in stateMap) {
        k = parseInt(k)
        value.push({
            x: k,
            y: currentSate[stateMap[k].toLowerCase()] || 0
        })
    }
    state.series[0].data = value;
    state.render();
}, tv );


travisListener.on((data, event) => {
    const d = new Date()
    const key = Math.floor(d.getTime()/1000)
    if (times[event][key] == null) {
        times[event][key] = []
    }
    times[event][key].push(data)
});

statWS.onmessage = m => {
    const data = JSON.parse(m.data);
    if (data.event == 'os') {
        document.getElementById('clients').innerText = data.data.connectedClient

        const cpuData = {}
        const memoryData = {}

        for (let service in data.data.services) {
            cpuData[service] = data.data.services[service].cpu_percent
            memoryData[service] = data.data.services[service].mem_percent
        }
        cpu.series.addData(cpuData);
        cpu.render();
        memory.series.addData(memoryData);
        memory.render();
    }
}