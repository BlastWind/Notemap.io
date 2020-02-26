import React, { Component } from "react";
import Manual from "./Manual.jsx";
import PageContainer from "./PageContainer.js";
import EditorNavbar from "./subComponents/EditorNavbar.jsx";
import * as d3 from "d3";
import { select, event } from "d3-selection";
import "d3-selection-multi";
import "./GraphEditor.css";
import notFocused from "./svgs/network.svg";
import focused from "./svgs/network_purple.svg";
import manual from "./svgs/manual.svg";
import close from "./svgs/close.svg";
import check from "./svgs/check.svg";
import preview from "./svgs/preview.svg";
import preview_purple from "./svgs/preview_purple.svg";
import open_new_tab from "./svgs/open_new_tab.png";
import theming from "./svgs/painting.svg";
import theming_purple from "./svgs/painting_purple.svg";
import {
  rectOnClickSetUp,
  rectOnClickBlurCurrentText
} from "./RoadmapediaMouseFunctions.js";
import alphabetT from "./svgs/t-alphabet.svg";
import alphabetTPurple from "./svgs/t-alphabet-purple.svg";
import link from "./svgs/link.svg";
import purpleLink from "./svgs/purpleLink.svg";
import { textArrToHTML } from "./helperFunctions/StringHelperFunctions.js";
import {
  getTranslateString,
  pureDecodeTranslate,
  decodeTranslateString,
  translateFromCenterToDefault,
  translateToDefault,
  translateBackLastMoved,
  transformCloseCurrentNode,
  transformOpenCurrentNode,
  updateBasePeriod,
  makeTransitionNodeData
} from "./helperFunctions/TransitionNodesHelperFunctions.js";
import "./styles/RmapCreatorToolBar.scss";
import PreviewCard from "./RoadmapediaSubComponents/PreviewCard.jsx";
import ColorCard from "./RoadmapediaSubComponents/ColorCard.jsx";

import React, { Component } from "react";

class GraphEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showManual: false,
      focus: true,
      errMsg: "",
      preview: false,
      theming: false
    };

    this.nodes = [];
    this.links = [];

    // mouse logic variables
    this.selectedNode = null;
    this.selectedLink = null;
    this.mousedownLink = null;
    this.mousedownNode = null;
    this.mouseupNode = null;

    // DOM selection global variables
    this.container = null;
    this.dragLine = null;
    this.path = null;
    this.rectGroups = null;
    this.circleGroups = null;
    this.texts = null;
    this.textBox = null;
    this.resourceForm = null;
    this.optionGroup = null;

    this.force = null;
    this.drag = null;

    // conditional handling variabels
    this.startText = null;
    this.previousTransform = null;
    this.isDragging = false;
    this.isTyping = false;
    this.shouldTransitionGsAnimate = true;
    this.animationAlreadyCompleted = false;
    this.shouldTransitionGsEnterAnimation = true;
  }

  componentDidMount() {
    // set up one time variables ("could write using JSX?")
    var svgContainer = d3.select("div.GraphEditorContainer");
    const svg = d3
      .select(".GraphEditorContainer")
      .append("svg")

      .style("width", window.innerWidth)
      .attr("height", window.innerHeight)
      .style("float", "left");
    svg
      .append("svg:defs")
      .append("svg:marker")
      .attr("id", "end-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 6)
      .attr("markerWidth", 3)
      .attr("markerHeight", 3)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#000");

    svg
      .append("svg:defs")
      .append("svg:marker")
      .attr("id", "start-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 4)
      .attr("markerWidth", 3)
      .attr("markerHeight", 3)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M10,-5L0,0L10,5")
      .attr("fill", "#000");

    var defs = svg.append("defs");

    var gradient = defs
      .append("linearGradient")
      .attr("id", "svgGradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    gradient
      .append("stop")
      .attr("class", "start")
      .attr("offset", "0%")
      .attr("stop-color", "red")
      .attr("stop-opacity", 1);

    gradient
      .append("stop")
      .attr("class", "end")
      .attr("offset", "100%")
      .attr("stop-color", "blue");
    this.drag = d3
      .drag()
      .on("start", d => {
        if (!d3.event.active) this.force.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        this.isDragging = true;
      })
      .on("drag", d => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      })
      .on("end", d => {
        if (!d3.event.active) this.force.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        this.isDragging = false;
        this.mousedownNode = null;
        this.mousedownLink = null;
      });

    this.force = d3
      .forceSimulation(this.nodes)
      .force(
        "link",
        d3
          .forceLink(this.links)
          .id(d => d.id)
          .distance(function(d) {
            return d.linkDistance;
          })
      )
      .force("charge", d3.forceManyBody().strength(-5))
      .on("tick", () => {
        this.tick();
      });
  }

  tick() {}

  restart() {
    d3.selectAll("rect.node").remove();
    d3.selectAll("g.textContainer").remove();
    d3.select("#firstNodeText").remove();
    if (this.nodes.length === 0) {
      this.container
        .append("svg:text")
        .lower()
        .attrs({
          x: window.innerWidth / 2 - 80,
          y: window.innerHeight / 2 - 20,
          id: "firstNodeText"
        })
        .text("Hey! To get started, press ctrl + click!");
    }

    //JOIN DATA
    this.path = this.path.data(this.links);

    // update existing this.links
    this.path
      .classed("selected", d => d === this.selectedLink)
      .style("marker-end", "url(#end-arrow)");

    // EXIT
    var pathExit = this.path.exit();
    pathExit
      .attr("opacity", 1)
      .transition()
      .duration(500)
      .attr("opacity", 0)
      .on("end", function() {
        d3.select(this).remove();
      });

    // UPDATE
    this.path = this.path
      .enter()
      .append("svg:path")
      .attr("class", "link")
      .classed("selected", d => d === this.selectedLink)
      .style("marker-end", "url(#end-arrow)")
      .on("mousedown", d => {
        if (d3.event.ctrlKey) return;

        // select link
        this.mousedownLink = d;
        this.selectedLink =
          this.mousedownLink === this.selectedLink ? null : this.mousedownLink;
        this.selectedNode = null;
        this.forceUpdate();
        this.restart();
      })
      .merge(this.path);

    let gNodeGroups = this.rectGroups.data(this.nodes, d => d.id);
    var gNodeGroupsExit = gNodeGroups.exit();
    gNodeGroupsExit
      .attr("opacity", 1)
      .transition()
      .duration(500)
      .attr("opacity", 0)
      .on("end", function() {
        d3.select(this).remove();
      });

    gNodeGroups = gNodeGroups
      .enter()
      .append("svg:g")
      .attr("class", "nodeGroup")
      .merge(gNodeGroups)
      .call(drag);

    // a selection of rect
    var rect = gNodeGroups.filter(d => d.type === "text").append("svg:rect");

    this.circleGroups = this.circleGroups.data(
      this.nodes.filter(eachNode => eachNode.type === "circle"),
      d => d.id
    );




    var circleGroupsExit = circleGroups.exit();
    circleGroupsExit
      .attr("opacity", 1)
      .transition()
      .duration(500)
      .attr("opacity", 0)
      .on("end", function() {
        d3.select(this).remove();
      });

    var circleGroupsEnter = circleGroups
      .enter()
      .append("g")
      .attr("class", "circleGroup");

    var clipPaths = circleGroupsEnter
      .append("clipPath")
      .attr("id", function(d, i) {
        //look lke: clipPath0
        return "clipPath" + i;
      })
      .append("circle")
      .attrs({ cx: 75, cy: 20, r: globalRadius });

    var circles = circleGroupsEnter
      .append("svg:circle")
      .attrs({
        r: globalRadius,
        cx: 75,
        cy: 20,
        fill: "white",
        class: "node"
      })
      .style("stroke-width", 3);

    circles
      .merge(d3.selectAll(".node"))
      .attr("stroke", function(d, i) {
        var selectedNode = this.selectedNode;
        if (this.selectedNode && d.id === this.selectedNode.id) {
          return "url(#svgGradient)";
        }
        return d.strokeColor;
      })
      .attr("fill", function(d) {
        if (d.backgroundColor) {
          return d.backgroundColor;
        }
      });

    var images = circleGroupsEnter
      .append("svg:image")
      .attr("class", "nodeImage")
      .attrs({
        width: globalRadius * 2,
        height: globalRadius * 2,
        x: 40,
        y: -15
      })
      .attr("clip-path", function(d, i) {
        return "url(#clipPath" + i + ")";
      });

    images.merge(d3.selectAll(".nodeImage")).each(function(d) {
      var this = this;
      if (!d.storedInfo.url || d.storedInfo.url === "") {
        d3.select(this).attr("href", null);
      } else {
        var img = new Image();
        img.onload = function() {
          d3.select(this).attr("href", img.src);
        };
        img.src =
          "https://hosted-besticon.herokuapp.com/icon?url=" +
          d.storedInfo.url +
          "&size=80..120..200";

        if (!d3.select(this).attr("href")) {
          d3.select(this).attr(
            "href",
            "https://static.thenounproject.com/png/20724-200.png"
          );
        }
      }
    });
    circleGroups = circleGroups.merge(circleGroupsEnter);
    circleGroups
      .on("mousedown", (d, i) => {
        nodeMouseDown(d);
      })
      .on("mouseup", resourceNodeMouseUp)
      .on("click", onCircleClick)

      .call(drag);

    var textContainers = gNodeGroups
      .filter(d => d.type === "text")
      .append("svg:g")
      .attr("class", "textContainer")
      .on("mousedown", d => {
        // select node
        this.mousedownNode = d;
        this.selectedNode =
          this.mousedownNode === this.selectedNode ? null : this.mousedownNode;

        this.selectedLink = null;

        //can't restart, if restart dblclick can't be detected
        //restart();
      })
      .on("mouseup", d => resourceNodeMouseUp(d));

    textContainers
      .attr("opacity", d => d.opacity)
      //.attr("text-anchor", "middle")
      .attr("dy", function(d) {
        var nwords = d.text.length;
        return "-" + (nwords - 1) * 12;
      })
      .each(function(d, ind) {
        //after appending the tspan elements
        //we get access to widthArray
        var nwords = d.text.length;
        for (var i = 0; i < nwords; i++) {
          var tspan = d3
            .select(this)
            .append("text")
            .html(function(d) {
              var a = d.text[i];
              while (a.includes(" ")) {
                a = a.replace(" ", "&nbsp;");
              }
              return a;
            })
            .style("font-size", d => d.textSize);

          tspan.call(eachTspan => {
            //maybe there is a index, select the rect in the parent container
            var bboxWidth = d3
              .select(this)
              .node()
              .getBBox().width;
          });

          tspan.attr("y", d.textSize * i + (d.textSize - 12));
        }

        var eachTextHeight = d3
          .select(this)
          .select("text")
          .node()
          .getBBox().height;
        var textGroup = d3.select(this).selectAll("text");
        var widthArray = [];
        textGroup.each(function() {
          widthArray.push(
            d3
              .select(this)
              .node()
              .getBBox().width
          );
        });
        d.width = Math.max(...widthArray) + 50;
        d.height = d.text.length * eachTextHeight + 25;
      })
      .style("transform", function(d) {
        var bboxWidth = d3
          .select(this)
          .node()
          .getBBox().width;

        var bboxHeight = d3
          .select(this)
          .node()
          .getBBox().height;
        var toShiftX = 25;
        var toShiftY = (d.height - bboxHeight) / 2 + 12.5;
        return "translate(" + toShiftX + "px, " + toShiftY + "px)";
      });

    rect
      .attrs({
        class: "node",
        rx: 6,
        ry: 6,
        width: d => d.width,
        height: d => d.height,
        fill: "white"
      })
      .style("stroke-width", 2)
      .attr("stroke", function(d) {
        if (this.selectedNode && d.id === this.selectedNode.id) {
          return "url(#svgGradient)";
        }
        return d.strokeColor;
      })
      .attr("fill", d => d.backgroundColor)
      .on("dblclick", d => textNodeDblClick(d))
      .on("mousedown", d => nodeMouseDown(d))
      .on("mouseup", resourceNodeMouseUp)
      .on("click", textNodeClick);

    nodes = gNodeGroups.merge(nodes);

    this.force.nodes(this.nodes);

    this.force.alphaTarget(0.3).restart();
  }

  render() {
    return (
      <React.Fragment>
        <div id="editorsContainer" className=""></div>
      </React.Fragment>
    );
  }
}

export default GraphEditor;
