const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

$.get('api/stat', function (data, res) {
    console.log(data)
    $('#restarted_builds_nb').text(data.nb_restarted_builds)
    $('#restarted_jobs_nb').text(data.nb_restarted_jobs)
    $('#restarted_project_nb').text(Object.keys(data.repositories).length)
    const labels = [...Object.keys(data.states)]
    const allLabels = [...Object.keys(data.states)]
    const series = []
    for (let oldState in data.states) {
        for (let newState in data.states[oldState]) {
            if (allLabels.indexOf(newState) == -1) {
                allLabels.push(newState)
            }
        }
    }
    for (let stateX of allLabels) {
        const line = []
        for (let stateY of labels) {
            const value = data.states[stateY][stateX];
            line.push({meta: 'From ' + stateY + ' to ' + stateX, value: value, className: stateX})
        }
        series.push(line)
    }
    initChart('.states_chart', 'Bar', labels, series);
    initChart('.langs_chart', 'Bar', [...Object.keys(data.languages)], [[...Object.values(data.languages)]]);
    initChart('.events_chart', 'Bar', [...Object.keys(data.events)], [[...Object.values(data.events)]]);
    initChart('.days_chart', 'Bar', [...Object.keys(data.dayOfWeek)].map(v => days[v]), [[...Object.values(data.dayOfWeek)]]);
    initChart('.hours_chart', 'Bar', [...Object.keys(data.hours)].map(v => v + 'h'), [[...Object.values(data.hours)]]);
})

function initChart(query, type, labels, series) {
    new Chartist[type](query, {
        labels,
        series
    }, {
        height: 300,
        stackBars: true,
        // fullWidth: true,
        plugins: [
            Chartist.plugins.tooltip({
                appendToBody: true
            })
        ]
    }).on('draw', function(data) {
        if(data.type === 'bar') {
            data.element.attr({
                style: 'stroke-width: ' + 100 / series[0].length + '%',
                class: data.series[data.index].className + ' ' + data.element.attr('class')
            });

            data.element.animate({
                y1: {
                    dur: 1000,
                    from: data.axisY.chartRect.y1,
                    to: data.y1,
                    easing: Chartist.Svg.Easing.easeOutQuint
                },
                y2: {
                    dur: 1000,
                    from: data.axisY.chartRect.y1,
                    to: data.y2,
                    easing: Chartist.Svg.Easing.easeOutQuint
                },
                opacity: {
                    dur: 1000,
                    from: 0,
                    to: 1,
                    easing: Chartist.Svg.Easing.easeOutQuint
                }
              });
        }
    });
}