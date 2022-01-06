import * as d3 from 'd3';
import './app.scss';

const settings = {
    width: 720,
    height: 1300,
    padding: [10,10,40,10],
    count: 12,
    circle_radius: [4,8],
    bandwidth: 100
}

d3.csv('data.csv').then((data) => {

    const svg = d3.select('svg')
        .attr('width', settings.width)
        .attr('height', settings.height)
        .style('background', '#f9f9f9');
  

    // COLORS

    let groups = data.map( d => d.group )
    groups = [...new Set(groups)]

    let pallete = [];

    for (let index = 0; index < groups.length; index++) {
        pallete.push({
            group: groups[index],
            color: d3.interpolateRainbow(index * (1/groups.length))
        })
        
    }


    // AXES

    let xScale = d3.scaleBand()
        .domain(data.map( d => d.problem ))
        .range([settings.padding[3], settings.width - settings.padding[1]])
        .padding(0);

    let xAxis = d3.axisBottom(xScale);

    svg.append('g')
        .attr('id','xAxis')
        .attr('transform', 'translate(0,' + (settings.height - settings.padding[2]) + ')')
        .call(xAxis)
        .selectAll(".tick text")
            .call(wrap, xScale.bandwidth());

    let xAxis_node = svg.select('#xAxis');

    xAxis_node.append('line')
        .attr('x1', 0)
        .attr('x2', settings.width)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke','#eee')
        .attr('stroke-width', 1);

    // CATEGORIES    

    let cats = d3.group(data, d => d.problem);
    cats = Array.from(cats);

    for (let index = 0; index < cats.length; ++index) {
        cats[index][1].sort(function(a, b){
            return parseInt(a["value"])-parseInt(b["value"]);
        });
    }

    // TOOLTIP

    const tooltip = d3.select('body').append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden");

    // DATA

    for (let index = 0; index < cats.length; ++index) {

        setTimeout(() => {

            svg.append('g')
                .attr('transform', 'translate(0,' + -(settings.padding[2] + 20) + ')')
                .selectAll('circle')
                .data(cats[index][1])
                .enter()
                .append('circle')

                .on("mouseover", (d) => {
                    d3.select(d.target)
                        .attr('cursor','pointer')
                        .transition().duration(100)
                        .attr('r', settings.circle_radius[1]);

                    // group, article link, author, title, image_url, Institution_name, Supplier_name, Item, unit_price, pay_num, order_num  (we can delete some if it's too much)

                    let tooltip_content = '<div><div class="field">Department</div><br/><div class="field_value">' + d.target.__data__.Institution_name + '</div><hr/><div class="field">Value of Purchase</div><br/><div class="field_value">' + d.target.__data__.order_num + '</div><hr/><div class="field">Description</div><br/><div class="field_value">' + d.target.__data__.Item + '</div><hr/><div class="field">Supplier</div><br/><div class="field_value">' + d.target.__data__.Supplier_name + '</div>';
                        
                    if(d.target.__data__.article_no != '') {
                        tooltip_content += '<div class="article"><a href="' + d.target.__data__.article_link + '"><img src="'+ d.target.__data__.image_url +'"/><h4>' + d.target.__data__.title + '</h4></a></div>'
                    }

                    tooltip_content += '</div>';


                    tooltip.html(tooltip_content).style("visibility", "visible");
                })
                .on("mousemove", (d) => {
                    var coords = d3.pointer( d );
                    tooltip.style('top','unset').style('bottom','unset');
                    tooltip.style("top", (coords[1]-20)+"px").style("left",(coords[0]+10)+"px");
                    tooltip.attr("pos", coords[1] > settings.height/2 ? 'bottom' : 'top');

                })
                .on("mouseout", (d) => {
                    d3.select(d.target)
                        .attr('cursor','pointer')
                        .transition().duration(100)
                        .attr('r', settings.circle_radius[0]);
                    
                    tooltip.style("visibility", "hidden");
                })
            
                .attr('cat', d => d.problem)
                .attr('r',0)
                .attr('cx',(d,i) => { 
                    let scaleWidth = xScale.bandwidth();
                    return (xScale(d.problem) + ((scaleWidth/settings.count * i/scaleWidth) % 1 * settings.bandwidth)) 
                })
                .attr('cy', (d,i) => {
                    return settings.height - (Math.floor(i/settings.count) * 10); 
                })
                .attr('opacity',0)
            
                .transition().duration(100).delay((d,i)=>2*i)
                .attr('r', settings.circle_radius[0])
                .attr('fill', d => {
                    return pallete.find(obj => { return obj.group === d.group }).color;    

                })
                .attr('opacity',1)
                .attr('stroke', d => d.article_no != '' ? 'black' : '')
                .attr('stroke-width', d => d.article_no != '' ? 1 : 0)
                

        }, 100 * index)

    }

    return svg.node();

})

function wrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em")
        while (word = words.pop()) {
            line.push(word)
            tspan.text(line.join(" "))
            if (tspan.node().getComputedTextLength() > width) {
                line.pop()
                tspan.text(line.join(" "))
                line = [word]
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", `${++lineNumber * lineHeight + dy}em`).text(word)
            }
        }
    })
  }



