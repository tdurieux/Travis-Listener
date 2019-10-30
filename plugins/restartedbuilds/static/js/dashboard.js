const days = ['Sunday', 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

$.get('api/stat', function (data, res) {
    console.log(data)
    $('#restarted_builds_nb').text(data.nb_restarted_builds)
    $('#restarted_jobs_nb').text(data.nb_restarted_jobs)
    $('#restarted_project_nb').text(Object.keys(data.repositories).length)

    const states = ['passed', 'failed', 'errored', 'canceled']

    const errorLabels = [...Object.keys(data.errorTypes)].sort((o1, o2) => {
        let counto1 = 0;
        let counto2 = 0;
        for (let count of [...Object.values(data.errorTypes[o1])]) {
            counto1+=count
        }
        for (let count of [...Object.values(data.errorTypes[o2])]) {
            counto2+=count
        }
        return counto2 - counto1
    })
    const errorSeries = []
    for (let restartedState of states) {
        const line = []
        for (let label of errorLabels) {
            const value = data.errorTypes[label][restartedState];
            line.push({meta: 'Error ' + label + ' changed to ' + restartedState, value: value, className: restartedState})
        }
        errorSeries.push(line)
    }

    initChart('.errors_chart', 'Bar', errorLabels, errorSeries);

    const labels = ['failed', 'errored', 'passed', 'canceled']
    const allLabels = [...Object.keys(data.states)]
    const series = []
    for (let oldState in data.states) {
        for (let newState in data.states[oldState]) {
            if (allLabels.indexOf(newState) == -1) {
                allLabels.push(newState)
            }
        }
    }
    for (let stateX of states) {
        const line = []
        for (let stateY in data.states) {
            const value = data.states[stateY][stateX];
            line.push({meta: 'From ' + stateY + ' to ' + stateX, value: value, className: stateX})
        }
        series.push(line)
    }
    initChart('.states_chart', 'Bar', labels, series);
    initChart('.langs_chart', 'Bar', [...Object.keys(data.languages)].splice(0, 15), getSeries(data.languages, 15));
    initChart('.events_chart', 'Bar', [...Object.keys(data.events)], getSeries(data.events));
    initChart('.date_chart', 'Bar', [...Object.keys(data.restartedPerDay)], getSeries(data.restartedPerDay));
    initChart('.days_chart', 'Bar', [...Object.keys(data.dayOfWeek)].map(v => days[v - 1]), getSeries(data.dayOfWeek));
    initChart('.hours_chart', 'Line', [...Object.keys(data.hours)].map(v => v + 'h'), getSeries(data.hours));
})

function getSeries(obj, max) {
    const output = [];
    for (let key in obj) {
        output.push({meta: key, value: obj[key]})
        if (max != null) {
            max--;
            if (max == 0) {
                break;
            }
        }
    }
    return [output];
}
function initChart(query, type, labels, series) {
    let total = 0;
    for (let values of series) {
        for (let value of values) {
            total += value.value || 0;
        }
    }
    new Chartist[type](query, {
        labels,
        series
    }, {
        height: 300,
        stackBars: true,
        fullWidth: true,
        axisX: {
            showGrid: false,
            labelInterpolationFnc: function(value) {
              return value[0];
            }
        },
        plugins: [
            Chartist.plugins.tooltip({
                appendToBody: false,
                labelTooltipValue: (label) => {
                    let value = 0;
                    let index = labels.indexOf(label);
                    for (let values of series) {
                        console.log(values[index].value || 0)
                        value += values[index].value || 0;
                    }
                    return value + " (" + Math.round(value * 100 /total) + "%)";
                },
            })
        ]
    }, [
        // Over 300px, we change the bar distance and show the first three letters of the weekdays
        ['screen and (min-width: 300px)', {
          seriesBarDistance: 15,
          axisX: {
            labelInterpolationFnc: function(value) {
              return value.slice(0, 3);
            }
          }
        }],
        // Over 600px, we increase the bar distance one more time and show the full weekdays
        ['screen and (min-width: 600px)', {
          seriesBarDistance: 30,
          axisX: {
            labelInterpolationFnc: function(value) { return value; }
          }
        }]
      ]).on('draw', function(data) {
        if(data.type === 'bar') {
            data.element.attr({
                style: 'stroke-width: calc(' + (100 / series[0].length) + '% - 5px)',
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

function getCurrentTask() {
    $.get('api/tasks', data => {
        for (let type in data) {
            const index = (data[type].progression || {}).index || 0
            const total = (data[type].progression || {}).total || 0

            const isFinished = (data[type].lockedAt == null && data[type].lastRunAt != null) || data[type].failedAt

            if (!isFinished) {
                const percent = Math.max(10, index*100/total)

                $("#" + type + "-fetch").hide()
                $("#" + type + "-progress").parent().show()
                $("#" + type + "-progress").css({'width': percent + '%'})
                $("#" + type + "-progress").text(index + '/' + total)
            } else {
                $("#" + type + "-fetch").show()
                $("#" + type + "-progress").parent().hide();
            }
        }
        console.log()
    })
}
getCurrentTask();
setInterval(getCurrentTask, 1000)

$('.fetch').on('click', e => {
    $.get('api/' + e.target.id.replace('-', 's/'), d => {
        getCurrentTask();
    })
})
$('.analyze').on('click', e => {
    $.get('api/jobs/analyze', d => {
        getCurrentTask();
    })
})

