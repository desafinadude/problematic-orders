import * as d3 from 'd3';
import Siema from 'siema';
import './app.scss';

const settings = {
    width: 720,
    height: 600,
    padding: [10,10,40,10],
    count: 7,
    circle_radius: [8,10],
    bandwidth: 120
}

let orders = [];
let articles = [];
let cats = [];
let pallete = [];
let svg;
let xScale, xAxis, tooltip;
let showArticles = false;
let showValues = false;
let showLegend = false;
let ordersMinMax = [0,100];
let showingArticles = false;
let carousel;


d3.csv('orders.csv').then((incoming_orders) => {

    orders = incoming_orders;

    ordersMinMax[0] = 0;
    ordersMinMax[1] = Math.max.apply(Math, orders.map(function(o) { return o.order_num; }));

    d3.csv('articles.csv').then((incoming_articles) => {

        articles = incoming_articles;

        // COLORS & CATEGORIES

        let groups = orders.map( d => d.group )
        groups = [...new Set(groups)]

        let color_pallete=["#C05194","#835AF1", "#7C4BA5", "#3A0751", "#50A9FF", "#2E67AB", "#28BF64", "#017E72","#00AEAD", "#95B587", "#B2A55F", "#D19258", "#A16969", "#828282", "#EFB821",  "#FF7629", "#DA4343"]
        for (let index = 0; index < groups.length; index++) {
            pallete.push({
                group: groups[index],
                // color: d3.interpolateRainbow(index * (1/groups.length))
                color: color_pallete[index]
            })
        }

        // LEGEND

        d3.select('.chart_legend')
            .selectAll('div')
            .data(pallete)
            .enter()
            .append('div')
            .html(d => d.group);

        // SVG

        svg = d3.select('svg')
            .attr('width', settings.width)
            .attr('height', settings.height)
            .style('background', '#f9f9f9');

        // AXES

        xScale = d3.scaleBand()
            .domain(orders.map( d => d.problem ))
            .range([settings.padding[3], settings.width - settings.padding[1]])
            .padding(0);

        xAxis = d3.axisBottom(xScale);

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

        svg.append('g')
            .attr('id','chart_content')
            .attr('transform', 'translate(0,' + -(settings.padding[2] + 20) + ')');

        // TOOLTIP

        tooltip = d3.select('#chart').append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden");

        drawChart('first_run');
            
            
        d3.select('#value')
            .on('click', () => {
                showValues = !showValues;
                drawChart();
            })

        d3.select('#toggle_articles')
            .on('change', () => {
                showArticles = !showArticles;
                drawChart();
            })

        d3.select('#toggle_legend')
            .on('change', () => {
                showLegend = !showLegend;
                toggleLegend();
            })
    })
})

let drawChart = (run) => {
    
    // CATEGORIES    

    if(run == 'first_run') {

        cats = d3.group(orders, d => d.problem);
        cats = Array.from(cats);

        for (let index = 0; index < cats.length; ++index) {
            cats[index][1].sort(function(a, b){
                return parseInt(a["value"])-parseInt(b["value"]);
            });
        }
    
    }

    // DATA

    let circles_container = svg.select('#chart_content');
        
    let circles = circles_container.selectAll('circle').data(orders);

    circles.exit().remove();
        
    circles.enter().append('circle')
        .attr('cat', d => d.problem)
        .attr('r',0)
        .attr('cx',(d) => { 
            let scaleWidth = xScale.bandwidth();
            return xScale(d.problem) + ((scaleWidth - settings.bandwidth)/2) + 5 + (scaleWidth/settings.count * findIndex(d)/scaleWidth) % 1 * settings.bandwidth + settings.circle_radius[0]/2;
        })
        .attr('cy', (d,i) => {
            return settings.height - (Math.floor(findIndex(d)/settings.count) * 20); 
        })
        .merge(circles)
        .attr('fill', (d) => {
            if(showValues == true) {
                let num = parseInt(d.pay_num) > parseInt(d.order_num) ? parseInt(d.pay_num) : parseInt(d.order_num);
                if(num < ordersMinMax[1]/2) {
                    return '#ccc';
                } else if(num > ordersMinMax[1]/2 && num < ordersMinMax[1]) {
                    return 'orange';
                } else {
                    return 'red';
                }
            } else {
                return pallete.find(obj => { return obj.group === d.group }).color;
            }
        })

        // INTERACTION

        .on("mouseover", (d) => {
            if(showingArticles == false && showLegend == false) {
                d3.select(d.target)
                    .attr('cursor','pointer')
                    .transition().duration(100)
                    .attr('opacity', 1)
                    .attr('r', settings.circle_radius[1])

                tooltip.html(getTooltipContent(d))
                    .style("width","300px")
                    .style("visibility", "visible");
            }
        })

        .on("mousemove", (d) => {
            if(showingArticles == false && showLegend == false) {
                var coords = d3.pointer( d );
                tooltip.style('top','unset').style('bottom','unset');
                tooltip.style("top", (coords[1]-20)+"px").style("left",(coords[0]+10)+"px");
                tooltip.attr("pos", coords[1] > settings.height/1.5 ? 'bottom' : 'top');
            }

        })

        .on("mouseout", (d) => {
            if(showingArticles == false && showLegend == false) {
                d3.select(d.target)
                    .attr('cursor','pointer')
                    .transition().duration(100)
                    .attr('opacity', 0.5)
                    .attr('r', settings.circle_radius[0])
                
                tooltip.style("visibility", "hidden");
            }
        })

        .on("click", (d) => {

            if(Array.from(d.target.classList).includes('has_article')) {

                showingArticles = true;

                d3.selectAll("circle")
                .transition().duration(100)
                .attr('opacity',0.5)
                .attr('r', settings.circle_radius[0])

                d3.select(d.target)
                    .attr('cursor','pointer')
                    .transition().duration(100)
                    .attr('opacity', 1)
                    .attr('r', settings.circle_radius[1]);


                tooltip.html(getTooltipContent(d,'persist'))
                    .style("visibility", "visible");

                carousel = new Siema({
                    selector: '.item_articles',
                    duration: 200,
                    easing: 'ease-out',
                    perPage: 1,
                    startIndex: 0,
                    draggable: true,
                    multipleDrag: true,
                    threshold: 20,
                    loop: true,
                    rtl: false,
                    onInit: () => {},
                    onChange: () => {},
                });

                if(document.body.contains(document.querySelector('.prev'))) {
                    document.querySelector('.prev').addEventListener('click', () => carousel.prev());
                }
                if(document.body.contains(document.querySelector('.next'))) {
                    document.querySelector('.next').addEventListener('click', () => carousel.next());
                }

                d3.select('.close_popup')
                    .on('click', () => {
                        showingArticles = false;
                        tooltip.style("visibility", "hidden");
                        d3.select(d.target)
                            .transition().duration(100)
                            .attr('opacity',0.5)
                            .attr('r', settings.circle_radius[0])
                    })
            }
        })

        // END INTERACTION

        .transition().duration(100).delay((d,i)=>2*i)
        .attr('r', settings.circle_radius[0])
        .attr('opacity', 0.5)
        
        
        circles.transition().duration(100)
        .attr('stroke', (d) => showArticles === true ? getArticle('stroke', d) : '' )
        .attr('stroke-width', (d) => showArticles === true ? getArticle('stroke-width', d) : 0 )
        .attr('class', (d) => showArticles === true ? getArticle('class', d) : '' )
        

    return svg.node();
}

let findIndex = (d) => {

    let index = -1;

    for (let cat_index = 0; cat_index < cats.length; ++cat_index) {
        let potential_index = cats[cat_index][1].map((e) => { return e.Id}).indexOf(d.Id);
        if(potential_index > -1) {
            index = potential_index;
        }
    }

    return index;

}

let getTooltipContent = (d,type) => {

    let tooltip_content = '';

    if(type == 'persist') {
        tooltip_content += '<div class="close_popup">\
            <svg style="width:15px;height:15px" viewBox="0 0 24 24">\
                <path fill="currentColor" d="M20 6.91L17.09 4L12 9.09L6.91 4L4 6.91L9.09 12L4 17.09L6.91 20L12 14.91L17.09 20L20 17.09L14.91 12L20 6.91Z" />\
            </svg>\
        </div>';        
    }


    tooltip_content += '<table>\
        <tr>\
            <th>Department</th>\
            <td>' + d.target.__data__.Institution_name + '</td>\
        </tr>\
        <tr>\
            <th>Order Value</th>\
            <td>' + d3.format(",.2f")(d.target.__data__.order_num)  + '</td>\
        </tr>\
        <tr>\
            <th>Pay Value</th>\
            <td>' + d3.format(",.2f")(d.target.__data__.pay_num)  + '</td>\
        </tr>\
        <tr>\
            <th>Description</th>\
            <td>' + d.target.__data__.Item + '</td>\
        </tr>\
        <tr>\
            <th>Supplier</th>\
            <td>' + d.target.__data__.Supplier_name + '</td>\
        </tr>\
    </table>';

    if(type == 'persist') {
        tooltip_content += '<div class="carousel_container"><div class="item_articles">';

        let item_articles = articles.filter(element => element.Id === d.target.__data__.Id);

        for (let index = 0; index < item_articles.length; index++) {

            tooltip_content += '<div class="slide" style="background-image: url(' + item_articles[index].image_url + ')">\
                <div class="article_details">\
                    <a href="' + item_articles[index].article_link + '">Title</a><br/>\
                    <span>' + item_articles[index].authors + '</span><br/>\
                    <span>' + item_articles[index].publish_date + '</span>\
                </div>\
            </div>';
            
        }

        tooltip_content += '</div>';

        if(item_articles.length > 1) {
            tooltip_content += '<div class="prev carousel_navs">\
                    <svg style="width:48px;height:48px" viewBox="0 0 24 24">\
                        <path fill="#fff" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />\
                    </svg>\
                </div>\
                <div class="next carousel_navs">\
                    <svg style="width:48px;height:48px" viewBox="0 0 24 24">\
                        <path fill="#fff" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />\
                    </svg>\
                </div>';
        }

        tooltip_content += '</div>';
    }

    return tooltip_content;
}

let toggleLegend = () => {

    let chart_legend = '<table>';

    for (let index = 0; index < pallete.length; ++index) {
        chart_legend += '<tr>\
            <th><div style="background: ' + pallete[index].color + '"></div></th>\
            <td class="legend_name">' + pallete[index].group + '</td>\
        </tr>';
    }

    chart_legend += '</table>';

    if(showLegend == true) {
        tooltip.html(chart_legend)
            .style("visibility", "visible")
            .style('top','unset').style('bottom','unset')
            .style("top", "10px")
            .style("left","10px")
            .style("width","450px")
            .attr("pos","top");
    } else {
        tooltip.style("visibility", "hidden");
    }
}

let getArticle = (attr, d) => {
    if(attr == 'stroke') {
        return articles.find(element => element.Id === d.Id) ? 'black' : '';
    } else if(attr == 'stroke-width') {
        return articles.find(element => element.Id === d.Id) ? 2 : 0;
    } else {
        return articles.find(element => element.Id === d.Id) ? 'has_article' : '';
    }
}

let wrap = (text, width) => {
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