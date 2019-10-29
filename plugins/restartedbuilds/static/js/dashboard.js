const days = ['Sunday', 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

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
    initChart('.langs_chart', 'Bar', [...Object.keys(data.languages)].splice(0, 15), getSeries(data.languages, 15));
    initChart('.events_chart', 'Bar', [...Object.keys(data.events)], getSeries(data.events));
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
                appendToBody: false
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
            const index = data[type].data.index 
            const total = data[type].data.total

            const isFinished = (data[type].lockedAt == null && data[type].lastRunAt != null) || data[type].failedAt

            if (!isFinished) {
                $("#" + type + "-fetch").hide()
                $("#" + type + "-progress").parent().show()
                $("#" + type + "-progress").css({'width': index*100/total + '%'})
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