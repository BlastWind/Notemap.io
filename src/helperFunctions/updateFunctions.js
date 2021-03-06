import * as d3 from "d3";
import {
  getTranslateString,
  translateToDefault,
  translateFromCenterToDefault,
  updateBasePeriod
} from "./TransitionNodesHelperFunctions.js";

import {onTransitionNodeClick} from "./mouseFunctions.js"

export function updateStroke(app) {
  console.log("do we have selectedNode?", app.selectedNode);
  var allNodeSelection = d3.selectAll(".node");
  console.log("our selection", allNodeSelection);
  if (!app.selectedNode) {
    // if no selected node,
    allNodeSelection.each(function(d) {
      d3.select(this).attr("stroke",d.strokeColor);
    });
    return;
  }

  allNodeSelection.each(function(eachNodeData) {
    console.log(eachNodeData.id === app.selectedNode.id, eachNodeData);
    if (eachNodeData.id === app.selectedNode.id) {
      var prevStyle = d3.select(this).attr("stroke");
      console.log(prevStyle);
      if (prevStyle === "url(#svgGradient)") {
        d3.select(this).attr("stroke", eachNodeData.strokeColor);
      } else {
        d3.select(this).attr("stroke", "url(#svgGradient)");
      }
    } else {
      d3.select(this).attr("stroke", eachNodeData.strokeColor);
    }
  });
}

export function restartOptionG(app) {
  var selectedNode = app.selectedNode;

  if (app.selectedNode) {
    app.optionG.append("foreignObject");
    app.transitionGs = app.optionG.selectAll("g").data(app.transitionGDataset);

    if (app.shouldTransitionGsAnimate === true) {
      app.transitionGs.attr("transform", function() {
        return getTranslateString(0, 0);
      });

      app.transitionGs
        .transition()
        .duration(app.animationAlreadyCompleted ? 0 : 500)
        .delay(0)
        .attrTween("transform", translateToDefault())
        .on("end", function(d, i, list) {
          app.animationAlreadyCompleted = false;
          app.isTransitioning = false;
          var periodSpaceBetween = Math.PI / (list.length + 1);
          var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);
          updateBasePeriod(d, goTo);
        });
      app.transitionGs.exit().remove();
      app.transitionGsEnter = app.transitionGs
        .enter()
        .append("g")
        .attr("class", "permanent");

      app.transitionGsEnter.attr("transform", d => {
        return getTranslateString(0, 0);
      });

      app.transitionGs = app.transitionGsEnter.merge(app.transitionGs);
      app.transitionGs.on("click", function(d, i, list) {
        onTransitionNodeClick(d, i, list, this, app);
      });
    }

    var transitionCircles = app.transitionGsEnter
      .append("circle")
      .attrs({
        r: 0,
        fill: "white",
        class: "permanent"
      })
      .style("stroke", "black");

    var transitionImages = app.transitionGsEnter.append("svg:image").attrs({
      href: d => d.href,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      class: "permanent"
    });

    app.transitionGsEnter
      .transition()
      .duration(app.shouldTransitionGsEnterAnimation ? 500 : 0)
      .attr("transform", translateFromCenterToDefault())
      .on("end", function() {
        app.isTransitioning = false;
      })
      .on("end", function(d, i, list) {
        var periodSpaceBetween = Math.PI / (list.length + 1);
        var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);
        updateBasePeriod(d, goTo);
      });

    app.transitionGsEnter
      .selectAll("circle")
      .transition()
      .duration(app.shouldTransitionGsEnterAnimation ? 500 : 0)
      .attr("r", 10)
      .on("start", function() {})
      .on("end", function() {
        app.isTransitioning = false;
      });

    transitionImages
      .transition()
      .duration(app.shouldTransitionGsEnterAnimation ? 500 : 0)
      .attrs({
        width: 16,
        height: 16,
        x: -8,
        y: -8
      });
  }
}
