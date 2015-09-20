// Constants
var TOTAL_POSSIBLE_SEATS = 166;
var RADIUS_MAX = 70;
var AREA_MAX = (3.14) * (RADIUS_MAX) * (RADIUS_MAX) * (RADIUS_MAX);
var GOV_CHARGE = -200;
var OPP_CHARGE = -700;
var LINK_DISTANCE = 150;
var GRAVITY = 0.1;
var JSON_FILE = "js/partyList.json";
// Global variables
var width = 900, height = 550;

var svg, link;
var startYear = "2011";
var governmentForce, oppositionForce, allNodesInParliament;

function init()
{
	svg = d3.select("body").select("svg")
		.attr("width",width)
		.attr("height",height);

	link = svg.selectAll(".link");
	node = svg.selectAll(".node");
	
	governmentForce = d3.layout.force()
		.linkDistance(LINK_DISTANCE)
		.charge(GOV_CHARGE)
		.gravity(GRAVITY)
		.size([width * 0.55,height])
		.on("tick",tick);
		
	oppositionForce = d3.layout.force()
		.linkDistance(LINK_DISTANCE)
		.charge(OPP_CHARGE)
		.gravity(GRAVITY)
		.size([width*1.5,height])
		.on("tick",tickCollide);
		
	d3.json(JSON_FILE,function(json)
	{
		run(json, startYear);
		setUpYearSelector(json);
	});
}

function tickCollide(){
  var q = d3.geom.quadtree(allNodesInParliament),
      i = 0,
      n = allNodesInParliament.length;
  while (++i < n) q.visit(collide(allNodesInParliament[i]));
}
function collide(node) {
  var r = node.radius + 50,
      nx1 = node.x - r,
      nx2 = node.x + r,
      ny1 = node.y - r,
      ny2 = node.y + r;
  return function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== node)) {
      var x = node.x - quad.point.x,
          y = node.y - quad.point.y,
          l = Math.sqrt(x * x + y * y),
          r = node.radius + quad.point.radius;
      if (l < r) {
        l = (l - r) / l * .5;
        node.x -= x *= l;
        node.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
    }
    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
  };
}
function tick() {
	link.attr("x1",function(d) {
		return d.source.x;
	})
	.attr("y1",function(d) {
		return d.source.y;
	})
	.attr("x2",function(d) {
		return d.target.x;
	})
	.attr("y2",function(d) {
		return d.target.y;
	});

	node.attr("transform",function(d) {
		return "translate(" + d.x + "," + d.y + ")";
	});
}

function assignRadii(nodes)
{
	for(var i=0; i<nodes.length; i++)
	{
		var toGetCubicRootOf = (AREA_MAX * (nodes[i].seats / TOTAL_POSSIBLE_SEATS)) / 3.14;
		nodes[i].radius = Math.pow(toGetCubicRootOf,(1 / 3));
	}
}

function fetchPartyGroup(electionYear, jsonData, groupType)
{
	var election;
	for(var i=0; i<jsonData.elections.length; i++)
	{
		if(""+jsonData.elections[i].year === electionYear)
		{
			election = jsonData.elections[i];
		}
	}
	var group = (groupType === "government" ? election.governmentParties : election.oppositionParties);
	// set colours & names
	for(var i=0; i<group.length; i++)
	{
		for(var j=0; j<jsonData.parties.length; j++)
		{
			var party = jsonData.parties[j];
			if(party.code === group[i].code)
			{
				group[i].colour = party.colour;
				group[i].name = party.name;
				break;
			}
		}
	}
	return group;
}


function fetchSeats(electionYear, jsonData, groupType)
{
	var election;
	for(var i=0; i<jsonData.elections.length; i++)
	{
		if(""+jsonData.elections[i].year === electionYear)
		{
			election = jsonData.elections[i];
		}
	}
	var group = (groupType === "government" ? election.governmentParties : election.oppositionParties);
	var groupSeats = 0;
	for(var i=0; i<group.length; i++)
	{
		groupSeats += group[i].seats;
	}
	return groupSeats;
}

function run(jsonData, chosenYear)
{	
	var governmentNodes = fetchPartyGroup(chosenYear, jsonData, "government");
	var oppositionNodes = fetchPartyGroup(chosenYear, jsonData, "opposition");
	
	allNodesInParliament = oppositionNodes.concat(governmentNodes);
	assignRadii(allNodesInParliament);
	
	// Restart the both forces layouts.
	governmentForce.nodes(governmentNodes);
	oppositionForce.nodes(oppositionNodes);

	// Update nodes
	node = svg.selectAll(".node");
	node = node.data(allNodesInParliament);
	node.exit().remove();

	//create G elements in SVG
	var nodeEnter = node.enter().append("g")
		.attr("class","node");

	// append circles within G elements & style 'em
	nodeEnter.append("circle")
		.attr("r",function(d) {
			return d.radius;
		})
		.attr("filter","url(#bevel)")
		.style("fill",function(d) {return d.colour;	})
		.on("mouseover", function(d){mouseover(d.name);})
		.on("mouseout", function(){mouseout();});

	// put the seats text into the circles & style it.
	nodeEnter.append("text")
		.attr("dy", function(d) {
			var fontSizeAsInteger = (d.radius/RADIUS_MAX)*90;
			var yOffsetForCentredText = d.radius-(fontSizeAsInteger/2);
			return yOffsetForCentredText+"px";
		})
		.attr("class","seatsText")
		.attr("style", function(d) {
			var fontSizeAsInteger = (d.radius/RADIUS_MAX)*60;
			return "font-size: "+fontSizeAsInteger+"px;";
		})
		.attr("fill","white")
		.text(function(d) {
			return d.seats;
		});

	// do the mouseovers, mouseouts for the circles
	node.select("circle");
	governmentForce.start();
	oppositionForce.start();
	
	clearSeats();
	$('.groupLabel').delay(1000).fadeIn(1000).slideDown(1000);
	loadSeats(jsonData, chosenYear);
}
function mouseover(partyName)
{
	$(".partyName").fadeIn(250);
	$('.partyName').text(''+partyName);
}
function mouseout()
{
	$(".partyName").hide();
}

function changeYear()
{
	$('.groupLabel').fadeOut(0);
	svg.selectAll(".node").remove();
	var updatedYear = $("#yearSelector").val();
	d3.json(JSON_FILE,function(json){	run(json, updatedYear); });
}

function setUpYearSelector(jsonData)
{
	yearSelector = d3.select("#yearSelector");
	for(var i=0; i<jsonData.elections.length; i++)
	{
		var currYear = jsonData.elections[i].year;
		yearSelector.append("option")
			.attr("value", currYear)
			.text(currYear);
	}
}

function clearSeats()
{
	d3.select('#govBar').style("height", "0px");
	d3.select('#oppBar').style("height", "0px");
	d3.select('#govSeats').text("");
	d3.select('#oppSeats').text("");
	
	d3.select('.groupLabel.opp')
		.style("-webkit-transform", "rotate(0deg)")
		.style("transform", "rotate(0deg)")
		.style("margin-top", "70px")
		.style("margin-left", "610px");
		
	d3.select('.groupLabel.gov')
		.style("-webkit-transform", "rotate(0deg)")
		.style("transform", "rotate(0deg)")
		.style("margin-top", "70px")
		.style("margin-left", "170px");
	
	d3.select('#barChartArea')
		.style("width", "150px");
		
	d3.select('#seatsLabel')
		.style("width", "150px");
}
function loadSeats(jsonData, year)
{
	var govSeats = fetchSeats(year, jsonData, "government");
	var oppSeats = fetchSeats(year, jsonData, "opposition");
	
	var govHeight = 700*(govSeats/TOTAL_POSSIBLE_SEATS);
	var oppHeight = 700*(oppSeats/TOTAL_POSSIBLE_SEATS);
	
	d3.select('#govBar').transition().duration(2000).style("height", govHeight+"px");
	d3.select('#oppBar').transition().duration(2000).style("height", oppHeight+"px");
	d3.select('#oppSeats').transition().delay(500).text(oppSeats);
	d3.select('#govSeats').transition().delay(500).text(govSeats);
	
	d3.select('#barChartArea').transition().delay(2000).duration(2000).style("width", "850px");
	d3.select('#seatsLabel').transition().delay(2000).duration(2000).style("width", "850px");
		
	d3.select('.groupLabel.opp')
		.transition()
		.delay(2000)
		.duration(2000)
		.style("-webkit-transform", "rotate(-90deg)")
		.style("transform", "rotate(-90deg)")
		.style("margin-top", "440px")
		.style("margin-left", "760px");
		
	d3.select('.groupLabel.gov')
		.transition()
		.delay(2000)
		.duration(2000)
		.style("-webkit-transform", "rotate(-90deg)")
		.style("transform", "rotate(-90deg)")
		.style("margin-top", "428px")
		.style("margin-left", "-20px");
}