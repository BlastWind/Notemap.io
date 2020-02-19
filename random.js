function getTranslateString(x, y) {
  return "translate(" + x + " " + y + ")";
}

var isTransitioning = false;
var distanceFromCircle = 100;
var radius = 30;
var isOptionGroupOpen = false;
var svg = d3
  .select("body")
  .append("svg")
  .attr("width", 1500)
  .attr("height", 1200);

var nodes = [
  {
    id: 0,
    r: 30,
    cx: 400,
    cy: 200
  },
  {
    id: 1,
    r: 30,
    cx: 300,
    cy: 300
  },
  {
    id: 2,
    r: 30,
    cx: 400,
    cy: 400
  },
  {
    id: 3,
    r: 30,
    cx: 500,
    cy: 500
  }
];

var circleSelection = svg.selectAll("circle");
var dur = 300;
restart();

function restart() {
  circleSelection = circleSelection.data(nodes, d => d.id);
  var circleExit = circleSelection.exit();
  circleExit
    .attr("opacity", 1)
    .transition()
    .duration(dur)
    .attr("opacity", 0)
    .on("end", function() {
      d3.select(this).remove();
    });

  circleSelection = circleSelection
    .enter()
    .append("circle")
    .attrs({
      r: d => d.r,
      cx: d => d.cx,
      cy: d => d.cy,
      fill: "white",
      stroke: "black"
    })
    .merge(circleSelection);

  circleSelection.on("click", onCircleClick).on("dblclick", deleteNode);

  let optionGroup = svg
    .append("g")
    .attr("transform", getTranslateString(200, 200));

  var optionGroupConnector = optionGroup.append("rect").attrs({
    height: 3,
    width: 0,
    x: radius,
    y: 0
  });

  var optionGroupRect = optionGroup
    .append("g")
    .append("rect")
    .attrs({
      x: radius,
      y: -25,
      width: 0,
      height: 50,
      stroke: "black",
      fill: "white",
      rx: 6
    })
    .style("stroke-width", 2);

  function onCircleClick(d) {
    // as time increases, transition gets slower, x up y down faster
    if (isTransitioning) return;
    if (isOptionGroupOpen) {
      isOptionGroupOpen = !isOptionGroupOpen;
      closeOptionGroupForm();
    } else {
      isOptionGroupOpen = !isOptionGroupOpen;
      optionGroup
        .attr("transform", getTranslateString(d.cx, d.cy))
        .attr("opacity", 1);
      optionGroupConnector
        .transition()
        .ease(d3.easeBounce)
        .duration(600)
        .attr("width", 100);

      optionGroupRect
        .transition()
        .duration(600)
        .ease(d3.easeBounce)
        .attr("x", distanceFromCircle + radius)
        .attr("width", 135)

        .on("start", function() {
          isTransitioning = true;
        })
        .on("end", function() {
          isTransitioning = false;
        });
    }
  }

  function deleteNode(d) {
    nodes = nodes.filter(eachNode => d.id !== eachNode.id);
    closeOptionGroupForm();
    restart();
  }

  function closeOptionGroupForm() {
    optionGroup
      .transition()
      .duration(dur)
      .attr("opacity", 0)
      .on("start", function() {
        isTransitioning = true;
      })
      .on("end", function() {
        isTransitioning = false;
        optionGroupConnector.attrs({
          height: 3,
          width: 0,
          x: radius,
          y: 0
        });
        optionGroupRect.attrs({
          x: radius,
          y: -25,
          width: 0,
          height: 50,
          stroke: "black",
          fill: "white",
          rx: 6
        });
      });
  }
}
