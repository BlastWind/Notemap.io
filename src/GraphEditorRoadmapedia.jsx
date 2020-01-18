import React, { Component } from "react";
import Manual from "./Manual.jsx";
import PageContainer from "./PageContainer.js";
import EditorNavbar from "./subComponents/EditorNavbar.jsx";
import * as d3 from "d3";
import { select, event } from "d3-selection";
import "d3-selection-multi";
import "./GraphEditor.css";

const initialTree = {
  id: 0,
  text: ["bruh"],
  cx: 200,
  cx: 200,

  children: [
    {
      id: 1,
      text: ["bruh2"],
      cx: 300,
      cy: 300,
      children: []
    }
  ]
};

class GraphEditor extends Component {
  constructor(props) {
    super(props);
    this.tree = initialTree;
    this.force = null;
  }

  componentDidMount() {
    var that = this;
    let intialRoot = d3.hierarchy(initialTree);
    let initialLinks = intialRoot.links();
    let initalNodes = intialRoot.descendants();
    const svg = d3
      .select("body")
      .append("svg")
      .style("width", window.innerWidth)
      .attr("height", window.innerHeight);

    const drag = d3
      .drag()
      .on("start", d => {
        if (!d3.event.active) that.force.alphaTarget(0.3).restart();

        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", d => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      })
      .on("end", d => {
        if (!d3.event.active) that.force.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    that.force = d3
      .forceSimulation()
      //    .force("x", d3.forceX(window.innerWidth / 2))
      //    .force("y", d3.forceY(window.innerHeight / 2))
      .on("tick", tick);
    var container = svg.append("svg:g");
    let paths = container.append("svg:g").selectAll("path");
    let nodes = container.append("svg:g").selectAll("circle");

    run();

    function tick() {
      // draw directed edges with proper padding from node centers
      //console.log("textINputCircle", that.textInputCircle);

      paths.attr("d", d => {
        return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
      });

      nodes.attr("cx", d => d.x).attr("cy", d => d.y);
    }
    function run() {
      const newRoot = d3.hierarchy(that.tree);
      const newLinks = newRoot.links();
      let newNodes = newRoot.descendants();

      paths = paths.data(newLinks);
      paths.exit().remove();
      paths = paths
        .enter()
        .append("svg:path")
        .attr("class", "link");

      nodes = nodes.data(newNodes, d => d.id);
      nodes.exit().remove();
      nodes = nodes
        .enter()
        .append("circle")
        .attrs({
          r: 30,
          fill: "red",
          stroke: "blue",
          cx: d => d.cx,
          cy: d => d.cy
        })
        .merge(nodes)
        .call(drag);
      that.force.nodes(newNodes);
    }
  }

  render() {
    return null;
  }
}
export default GraphEditor;
