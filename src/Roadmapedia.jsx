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

const colors = d3.scaleOrdinal(d3.schemeCategory10);
// set up svg for D3
const initialNodes = [];
const initialLinks = [];
var globalRadius = 35;

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

    this.nodes = initialNodes;
    this.links = initialLinks;

    this.selectedNode = null;
    this.selectedLink = null;
    this.mousedownLink = null;
    this.mousedownNode = null;
    this.mouseupNode = null;

    this.force = null;
    this.startText = null;

    this.history = [
      {
        nodes: JSON.stringify([...initialNodes]),
        links: JSON.stringify([...initialLinks])
      }
    ];
    this.historyStep = 0;
    this.previousTransform = null;

    this.isDragging = false;
    this.isTyping = false;

    this.shouldTransitionGsAnimate = true;
    this.animationAlreadyCompleted = false;
    this.shouldTransitionGsEnterAnimation = true;
  }

  storeToHistory(command) {
    this.history = this.history.slice(0, this.historyStep + 1);
    this.history = this.history.concat([command]);
    this.historyStep += 1;
    console.log(this.history);
  }

  updateEntire() {
    d3.selectAll("svg").remove("*");
    d3.selectAll(".GraphEditorContainer")

      .selectAll("svg")
      .remove("*");

    this.force.stop();
    this.componentDidMount();
    this.force.restart();
  }

  componentDidMount() {
    var that = this;
    d3.select("#focusIcon").on("click", toggleFocus);
    d3.select("#previewIcon").on("click", togglePreview);
    d3.select("#themeIcon").on("click", toggleTheme);

    console.log("color card methods binded");
    d3.selectAll(".backgroundColorBlock").on("click", function() {
      var selectedColor = d3.select(this).style("background-color");
      that.selectedNode.backgroundColor = selectedColor;
      d3.selectAll(".backgroundColorBlock").attr(
        "class",
        "backgroundColorBlock"
      );
      d3.select(this).attr("class", "backgroundColorBlock selected");
      console.log("does that.node share referecne?", that.nodes);
      restart();
    });

    d3.selectAll(".strokeColorBlock").on("click", function() {
      var selectedColor = d3.select(this).style("background-color");
      that.selectedNode.strokeColor = selectedColor;
      d3.selectAll(".strokeColorBlock").attr("class", "strokeColorBlock");
      d3.select(this).attr("class", "strokeColorBlock selected");
      restart();
    });

    d3.selectAll(".numberBlock").on("click", function() {
      var selectedID = d3.select(this).node().innerText;
      that.selectedNode.groupID = selectedID;
      d3.selectAll(".numberBlock").attr("class", "numberBlock");
      d3.select(this).attr("class", "numberBlock selectedNumber");
      restart();
    });

    var svgContainer = d3.select("div.GraphEditorContainer");

    that.force = d3
      .forceSimulation(that.nodes)
      .force(
        "link",
        d3
          .forceLink(that.links)
          .id(d => d.id)
          .distance(function(d) {
            return d.linkDistance;
          })
      )
      .force("charge", d3.forceManyBody().strength(-5))
      //.force("x", d3.forceX())
      //.force("y", d3.forceY())

      .on("tick", tick);

    const svg = d3
      .select(".GraphEditorContainer")
      .append("svg")

      .style("width", window.innerWidth)
      .attr("height", window.innerHeight)
      .style("float", "left");
    // define arrow markers for graph that.link
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

    // line displayed when dragging new nodes

    const drag = d3
      .drag()

      .on("start", d => {
        if (!d3.event.active) that.force.alphaTarget(0.3).restart();

        d.fx = d.x;
        d.fy = d.y;
        that.isDragging = true;
      })
      .on("drag", d => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      })
      .on("end", d => {
        if (!d3.event.active) that.force.alphaTarget(0);

        d.fx = null;
        d.fy = null;
        that.isDragging = false;
        resetMouseVars();
      });
    var container = svg
      .on("mousedown", mousedown)
      .on("mousemove", mousemove)
      .on("mouseup", mouseup)
      .on("click", click)

      .append("svg:g")
      .attr("class", "gContainer")
      .attrs({
        //TODO
        //transform: previous transform
        transform: that.previousTransform ? that.previousTransform : null
      });

    const dragLine = container
      .append("svg:path")
      .attr("class", "link dragline hidden")
      .attr("d", "M0,0L0,0")
      .classed("hidden", true);

    // handles to link and node element groups
    let path = container.append("svg:g").selectAll("path");
    let nodes = container.append("svg:g").selectAll("g.nodeGroup");
    let texts = container.append("svg:g").selectAll("g");
    let circleGroups = container.append("svg:g").selectAll("g");

    /* change1:
    let circles = container.append("svg:g").selectAll("circle");
    let images = container.append("svg:g").selectAll("images");
    let clipPaths = container.append("svg:defs").selectAll("clipPath");

*/

    let textBox = container.append("foreignObject");
    let resourceForm = container
      .append("foreignObject")
      .attr("class", "resourceForm");
    let optionGroup = container
      .append("g")
      .attr("opacity", 0)
      .attr("visibility", "hidden");

    let optionGroupG = optionGroup
      .append("g")
      .attr("transform", getTranslateString(0, 0));

    let optionG = container.append("g").attr("class", "optionG");

    var optionGroupConnector = optionGroup
      .append("rect")
      .attrs({ height: 3, width: 0, x: -10, y: 25, stroke: "black" });

    var optionGroupRect = optionGroupG
      .append("g")
      .append("rect")
      .attrs({
        x: -10,
        y: 0,
        width: 135,
        height: 50,
        stroke: "black",
        fill: "white",
        rx: 6
      })
      .style("stroke-width", 2);

    var optionGroupT = optionGroupG
      .append("image")
      .attr("xlink:href", alphabetT)
      .attrs({ width: 50, height: 50, x: 75 })
      .on("mouseover", function() {
        d3.select(this).attr("xlink:href", alphabetTPurple);
      })
      .on("mouseout", function() {
        d3.select(this).attr("xlink:href", alphabetT);
      })
      .on("click", function(d) {
        optionGroup
          .transition()
          .duration(300)
          .attr("opacity", 0);
        if (that.inConnectMode) {
          console.log("in connect mode!");
          optionGroup.attr("opacity", 0);
          optionGroupConnector.attr("width", 0);
          optionGroupG.attr("transform", getTranslateString(0, 0));
          const node = {
            type: "text",
            id: that.nodes.length,
            width: 150,
            height: 40,
            text: [""],
            x: that.selectedNode.x + that.selectedNode.width + 100,
            y: that.selectedNode.y,
            backgroundColor: "white",
            strokeColor: "black",
            groupID: null
          };
          that.point = null;
          that.nodes.push(node);

          restart();
          const source = that.selectedNode;
          const target = node;
          var link = {
            source: source,
            target: target,
            linkDistance:
              node.x - that.selectedNode.x > 250
                ? node.x - that.selectedNode.x
                : 250,
            index: that.links.length
          };
          that.links.push(link);

          var command = {
            action: { type: "addNodeLink", node: node, links: [link] },
            inverse: { type: "delNodeLink", node: node, links: [link] }
          };

          that.storeToHistory(command);

          //not triggering doubleclicking prohibits force from calculating x & y properly?
          var toDispatch = d3
            .selectAll("rect.node")
            .filter(function(d, i, list) {
              return i === list.length - 1;
            });
          toDispatch.dispatch("click");
          toDispatch.dispatch("dblclick");

          restart();
          // update stroke after restart because
          // update stroke will be selecting new elems
        } else {
          const node = {
            type: "text",
            id: that.nodes.length,
            width: 150,
            height: 40,
            text: [""],
            x: that.point[0],
            y: that.point[1],
            backgroundColor: "white",
            strokeColor: "black",
            groupID: null
          };
          that.point = null;
          that.nodes.push(node);
          var command = {
            action: { type: "addNode", node: node },
            inverse: { type: "delNode", node: node }
          };
          that.storeToHistory(command);

          restart();
          var toDispatch = d3
            .selectAll("rect.node")
            .filter(function(d, i, list) {
              return i === list.length - 1;
            });
          toDispatch.dispatch("click");
          toDispatch.dispatch("dblclick");

          restart();
        }
      });

    var optionGroupBorder = optionGroupG
      .append("line")
      .attrs({ x1: 57.5, y1: 9, x2: 57.5, y2: 42, stroke: "black" })
      .attr("stroke-width", 2);

    var optionGroupLink = optionGroupG
      .append("image")
      .on("mouseover", function() {
        d3.select(this).attr("xlink:href", purpleLink);
      })
      .on("mouseout", function() {
        d3.select(this).attr("xlink:href", link);
      })
      .on("click", function(d) {
        optionGroup
          .transition()
          .duration(300)
          .attr("opacity", 0);

        if (that.inConnectMode) {
          console.log("in connect mode!");
          optionGroup.attr("opacity", 0);
          optionGroupConnector.attr("width", 0);
          optionGroupG.attr("transform", getTranslateString(0, 0));
          const node = {
            type: "circle",
            id: that.nodes.length,
            width: 150,
            height: 40,
            text: [""],
            x: that.selectedNode.x + that.selectedNode.width + 100,
            y: that.selectedNode.y,
            storedInfo: {
              url: null,
              info: null,
              picture: null,
              title: null
            },
            backgroundColor: "white",
            strokeColor: "black",
            groupID: null
          };
          that.point = null;
          that.nodes.push(node);
          restart();
          const source = that.selectedNode;
          const target = node;

          var link = {
            source: source,
            target: target,
            linkDistance:
              node.x - that.selectedNode.x > 250
                ? node.x - that.selectedNode.x
                : 250,
            index: that.links.length
          };
          that.links.push(link);

          var command = {
            action: { type: "addNodeLink", node: node, links: [link] },
            inverse: { type: "delNodeLink", node: node, links: [link] }
          };

          that.storeToHistory(command);
          //not triggering doubleclicking prohibits force from calculating x & y properly?
          var toDispatch = d3
            .selectAll(".circleGroup")
            .filter(function(d, i, list) {
              return i === list.length - 1;
            });

          that.selectedNode = that.nodes[that.nodes.length - 1];
          restart();
          that.forceUpdate();
          toDispatch.dispatch("click");
        } else {
          const node = {
            type: "circle",
            id: that.nodes.length,
            width: 150,
            height: 40,
            text: [""],
            x: that.point[0],
            y: that.point[1],
            storedInfo: {
              url: null,
              info: null,
              picture: null,
              title: null
            },
            backgroundColor: "white",
            strokeColor: "black",
            groupID: null
          };
          that.point = null;
          that.nodes.push(node);

          var command = {
            action: { type: "addNode", node: node },
            inverse: { type: "delNode", node: node }
          };

          that.storeToHistory(command);

          that.mousedownNode = that.nodes[that.nodes.length - 1];
          restart();
          var toDispatch = d3
            .selectAll(".circleGroup")
            .filter(function(d, i, list) {
              return i === list.length - 1;
            });

          toDispatch.dispatch("click");
        }
      })
      .attr("xlink:href", link)
      .attrs({
        width: 30,
        height: 30,
        y: 10,
        color: "purple",
        stroke: "purple"
      });

    var zoom = d3.zoom().on("zoom", function() {
      container.attr("transform", d3.event.transform);
    });

    svg.call(zoom).on("dblclick.zoom", null);

    if (that.previousTransform) {
      var arr = that.previousTransform.split("(");

      var translate = arr[1].split(")")[0],
        scale = arr[2].split(")")[0];

      svg.call(
        zoom.transform,
        d3.zoomIdentity
          .translate(
            translate.substring(0, translate.indexOf(",")),
            translate.substring(translate.indexOf(",") + 1)
          )
          .scale(scale)
      );
    }

    d3.select(window)
      .on("keydown", keydown)
      .on("keyup", keyup)
      .on("keypress", keypress)
      .on("resize", resize);
    restart();
    console.clear();
    function restart() {
      //TODO: selectAll as temporary solution, upgrade to difference update pattern

      d3.selectAll("rect.node").remove();
      d3.selectAll("g.textContainer").remove();
      d3.select("#firstNodeText").remove();
      if (that.nodes.length === 0) {
        container
          .append("svg:text")
          .attrs({
            x: window.innerWidth / 2 - 80,
            y: window.innerHeight / 2 - 20,
            id: "firstNodeText"
          })
          .text("Hey! To get started, press ctrl + click!");
      }

      //JOIN DATA
      path = path.data(that.links);

      // update existing that.links
      path
        .classed("selected", d => d === that.selectedLink)
        .style("marker-end", "url(#end-arrow)");

      // EXIT
      var pathExit = path.exit();
      pathExit
        .attr("opacity", 1)
        .transition()
        .duration(500)
        .attr("opacity", 0)
        .on("end", function() {
          d3.select(this).remove();
        });

      // UPDATE
      path = path
        .enter()
        .append("svg:path")
        .attr("class", "link")
        .classed("selected", d => d === that.selectedLink)
        .style("marker-end", "url(#end-arrow)")
        .on("mousedown", d => {
          if (d3.event.ctrlKey) return;

          // select link
          that.mousedownLink = d;
          that.selectedLink =
            that.mousedownLink === that.selectedLink
              ? null
              : that.mousedownLink;
          that.selectedNode = null;
          that.forceUpdate();
          restart();
        })
        .merge(path);

      let gNodeGroups = nodes.data(that.nodes, d => d.id);
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

      circleGroups = circleGroups.data(
        that.nodes.filter(eachNode => eachNode.type === "circle"),
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
          var selectedNode = that.selectedNode;
          if (that.selectedNode && d.id === that.selectedNode.id) {
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
        var that = this;
        if (!d.storedInfo.url || d.storedInfo.url === "") {
          d3.select(that).attr("href", null);
        } else {
          var img = new Image();
          img.onload = function() {
            d3.select(that).attr("href", img.src);
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
          that.mousedownNode = d;
          that.selectedNode =
            that.mousedownNode === that.selectedNode
              ? null
              : that.mousedownNode;

          that.selectedLink = null;

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
              });

            tspan.call(eachTspan => {
              //maybe there is a index, select the rect in the parent container
              var bboxWidth = d3
                .select(this)
                .node()
                .getBBox().width;
            });

            if (i > 0) tspan.attr("y", 15 * i);
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
          if (that.selectedNode && d.id === that.selectedNode.id) {
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

      that.force.nodes(that.nodes);

      that.force.alphaTarget(0.3).restart();
    }

    function tick() {
      // draw directed edges with proper padding from node centers

      if (
        that.selectedNode &&
        optionGroupConnector.attr("visibility") === "visible"
      )
        optionGroup.attr("transform", function(d) {
          if (that.selectedNode.type === "circle")
            return getTranslateString(
              that.selectedNode.x + 115,
              that.selectedNode.y - 5
            );

          return `translate(${that.selectedNode.x +
            that.selectedNode.width +
            10},${that.selectedNode.y + that.selectedNode.height / 2 - 25})`;
        });

      path.attr("d", d => {
        if (!that.state.focus) {
          that.links.map(eachLink => {
            if (eachLink.index === d.index) {
              eachLink.linkDistance = Math.sqrt(
                Math.pow(d.source.x - d.target.x, 2) +
                  Math.pow(d.source.y - d.target.y, 2)
              );
            }
          });
        }
        //WARNING: TURNS OUT, AFTER WE PUT IN FORCE.NODES AND ALL THAT, D.X & D.Y STOP CHANGING
        return `M${d.source.x + d.source.width / 2},${d.source.y +
          d.source.height / 2}L${d.target.x + d.target.width / 2},${d.target.y +
          d.target.height / 2}`;
      });
      texts.attr("transform", d => {
        return `translate(${d.x},${d.y})`;
      });
      nodes.attr("transform", d => {
        if (that.textInputCircle)
          if (d.id === that.textInputCircle.id) {
            that.textInputCircle.x = d.x;
            that.textInputCircle.y = d.y;
          }
        return `translate(${d.x},${d.y})`;
      });

      if (that.selectedNode && that.selectedNode.type === "circle") {
        optionG.attr(
          "transform",
          getTranslateString(that.selectedNode.x + 75, that.selectedNode.y + 20)
        );
      }

      circleGroups.attr("transform", d => getTranslateString(d.x, d.y));

      if (textBox.attr("x"))
        textBox
          .attr("x", that.textInputCircle.x + 25)
          .attr("y", that.textInputCircle.y);

      if (resourceForm.attr("x")) {
        resourceForm.attrs({
          x: that.resourceFormCircleData.x,
          y: that.resourceFormCircleData.y - 90
        });
      }
    }

    function resetMouseVars() {
      that.mousedownNode = null;
      //that.mouseupNode = null;
      that.mousedownLink = null;
    }
    function restartOptionG() {
      var selectedNode = that.selectedNode;

      if (that.selectedNode) {
        optionG.append("foreignObject");
        that.transitionGs = optionG
          .selectAll("g")
          .data(that.transitionGDataset);

        if (that.shouldTransitionGsAnimate === true) {
          that.transitionGs.attr("transform", function() {
            return getTranslateString(0, 0);
          });

          that.transitionGs
            .transition()
            .duration(that.animationAlreadyCompleted ? 0 : 500)
            .delay(0)
            .attrTween("transform", translateToDefault())
            .on("end", function(d, i, list) {
              that.animationAlreadyCompleted = false;
              that.isTransitioning = false;
              var periodSpaceBetween = Math.PI / (list.length + 1);
              var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);
              updateBasePeriod(d, goTo);
            });
          that.transitionGs.exit().remove();
          that.transitionGsEnter = that.transitionGs
            .enter()
            .append("g")
            .attr("class", "permanent");

          that.transitionGsEnter.attr("transform", d => {
            return getTranslateString(0, 0);
          });

          that.transitionGs = that.transitionGsEnter.merge(that.transitionGs);
          that.transitionGs.on("click", onTransitionNodeClick);
        }

        var transitionCircles = that.transitionGsEnter
          .append("circle")
          .attrs({
            r: 0,
            fill: "white",
            class: "permanent"
          })
          .style("stroke", "black");

        var transitionImages = that.transitionGsEnter
          .append("svg:image")
          .attrs({
            href: d => d.href,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            class: "permanent"
          });

        that.transitionGsEnter
          .transition()
          .duration(that.shouldTransitionGsEnterAnimation ? 500 : 0)
          .attr("transform", translateFromCenterToDefault())
          .on("end", function() {
            that.isTransitioning = false;
          })
          .on("end", function(d, i, list) {
            var periodSpaceBetween = Math.PI / (list.length + 1);
            var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);
            updateBasePeriod(d, goTo);
          });

        that.transitionGsEnter
          .selectAll("circle")
          .transition()
          .duration(that.shouldTransitionGsEnterAnimation ? 500 : 0)
          .attr("r", 10)
          .on("start", function() {})
          .on("end", function() {
            that.isTransitioning = false;
          });

        transitionImages
          .transition()
          .duration(that.shouldTransitionGsEnterAnimation ? 500 : 0)
          .attrs({
            width: 16,
            height: 16,
            x: -8,
            y: -8
          });
      }
    }

    function onCircleClick(d, iClicked) {
      if (that.isTransitioning) {
        return;
      }

      if (that.state.preview) {
        //console.log({ d }, that.selectedNode);
        if (that.selectedNode && d.id === that.selectedNode.id) {
          that.selectedNode = null;
          that.forceUpdate();
        } else {
          that.selectedNode = d;
          that.forceUpdate();
        }
        return;
      }
      var prevLocation = optionG.attr("transform");
      that.selectedNode = d;
      restart();
      that.selectedLink = null;
      var selectedNode = that.selectedNode;
      that.forceUpdate();
      if (sameCircleClicked() && isTransitionCircleShowing()) {
        if (that.lastClickedNode) {
          closeForm();
          closeNode();
        }
        optionG
          .selectAll("g")
          .transition()
          .duration(500)
          .delay(that.isFormShowing ? 500 : 0)
          .attr(
            "transform",
            getTranslateString(
              -(that.selectedNode.x - that.lastClickedCircleD.x),
              -(that.selectedNode.y - that.lastClickedCircleD.y)
            )
          )
          .on("end", function() {
            optionG.selectAll("g").remove();
            that.lastClickedCircle = iClicked;
            that.lastClickedCircleD = d;
            that.isFormShowing = false;
            that.selectedNode = null;
            that.forceUpdate();
            restart();
          });

        optionG
          .selectAll("circle.permanent")
          .transition()
          .duration(500)
          .delay(that.isFormShowing ? 500 : 0)
          .attr("r", 0);
        optionG
          .selectAll("image.permanent")
          .transition()
          .duration(500)
          .delay(that.isFormShowing ? 500 : 0)
          .attr("width", 0)
          .attr("height", 0)
          .attr("x", 0)
          .attr("y", 0);

        return;
      }

      var duration = 500;

      // if not same circle click, but the transition circles were showing: hide old and show new
      if (isTransitionCircleShowing()) {
        if (that.lastClickedNode && that.isFormShowing) {
          optionG.select("foreignObject").attr("transform", function() {
            var decoded = decodeTranslateString(
              prevLocation,
              getTranslateString(0, 0),
              that.selectedNode
            );
            return getTranslateString(decoded.x, decoded.y);
          });
          d3.select("#currentInput")
            .transition()
            .duration(duration)
            .style("width", "0px")
            .style("padding-left", "0px")
            .style("padding-right", "0px")
            .on("end", function() {
              d3.select(this).remove();
              optionG
                .select("foreignObject")
                .attr("transform", getTranslateString(0, 0));
              that.isFormShowing = false;
            });

          var prevTransitionCircles = optionG.selectAll("g");
          prevTransitionCircles.each(function() {
            var bruh = decodeTranslateString(
              prevLocation,
              d3.select(this).attr("transform"),
              that.selectedNode
            );

            d3.select(this).attr(
              "transform",
              getTranslateString(bruh.x, bruh.y)
            );

            that.alreadyDid = true;
          });
          that.lastClickedNode
            .transition()
            .duration(duration)
            .attr("transform", d => {
              var current = that.lastClickedNode.attr("transform");
              var decoded = pureDecodeTranslate(current);
              return getTranslateString(decoded.x - 175, decoded.y);
            })
            .on("end", function() {
              //d3.select(this).attr("transform", getTranslateString(0, 0));
            });
        }

        var prevTransitionCircles = optionG.selectAll("g");
        prevTransitionCircles
          .transition()
          .duration(duration)
          .delay(that.isFormShowing ? duration : 0)
          .on("start", function(d2, i) {
            if (!that.alreadyDid) {
              var bruh = decodeTranslateString(
                prevLocation,
                d3.select(this).attr("transform"),
                that.selectedNode
              );

              d3.select(this).attr(
                "transform",
                getTranslateString(bruh.x, bruh.y)
              );
            }

            if (i === 0) {
              that.isTransitioning = true;

              var fakeNodesData = makeTransitionNodeData(2);
              if (selectedNode.storedInfo.picture !== null) {
                fakeNodesData = makeTransitionNodeData(4);
              }

              var newGs = optionG
                .selectAll("g.temp")
                .data(fakeNodesData)
                .enter()
                .append("g")
                .attr("class", "temp");

              // set original transformation so don't start from (0, 0)
              newGs.attr("transform", getTranslateString(0, 0));

              var transitionCircles = newGs
                .append("circle")
                .attr("class", "temp")
                .attr("r", 0)
                .attr("fill", "white")
                .style("stroke", "black");

              var transitionImages = newGs
                .append("svg:image")
                .attr("href", d => d.href)
                .attr("width", 0)
                .attr("height", 0)
                .attr("x", 0)
                .attr("y", 0)
                .attr("class", "temp");

              // move fake nodes out
              newGs
                .transition()
                .duration(duration)
                .attr("transform", translateFromCenterToDefault());

              newGs
                .selectAll("circle.temp")
                .transition()
                .duration(duration)
                .attr("r", 10)
                .on("start", function() {
                  that.isTransitioning = true;
                });

              transitionImages
                .transition()
                .duration(duration)
                .attr("width", 16)
                .attr("height", 16)
                .attr("x", -8)
                .attr("y", -8);
            }
          })
          .on("end", function(d2, i) {
            that.alreadyDid = false;
            if (i == 0) {
              that.lastClickedCircle = iClicked;
              that.lastClickedCircleD = d;
              // after old nodes closed to center and fake nodes came out:
              // 1) remove fake nodes
              // restart accordingly
              that.isTransitioning = false;
              optionG.selectAll("g.temp").remove();
              that.shouldTransitionGsAnimate = true;
              that.animationAlreadyCompleted = true;
              that.shouldTransitionGsEnterAnimation = false;

              if (that.transitionGDataset.length === 2) {
                if (selectedNode.storedInfo.picture === null) {
                } else {
                  that.transitionGDataset.push({
                    href:
                      "https://cdn1.iconfinder.com/data/icons/social-17/48/photos2-512.png"
                  });
                  that.transitionGDataset.push({
                    href:
                      "https://lh3.googleusercontent.com/proxy/i8kuoBF49SDAkOyq_WILZaSblnbe727c_2NCoH7M59AoedUgyIHBz5HiYGVaWFzNWKmLDegSIFBY_Ok8gfp2cEeEJ4i3dE7h6pyVXEPg4tuKJklqdCz6oGjsg78uf87zvX1eI1iP"
                  });
                }
              } else if (that.transitionGDataset.length === 4) {
                if (selectedNode.storedInfo.picture === null) {
                  that.transitionGDataset.pop();
                  that.transitionGDataset.pop();
                }
              }

              restartOptionG();
              that.shouldTransitionGsEnterAnimation = true;
              that.shouldTransitionGsAnimate = false;
              that.animationAlreadyCompleted = false;
            }
          });

        prevTransitionCircles
          .selectAll("circle.permanent")
          .transition()
          .duration(duration)
          .delay(that.isFormShowing ? duration : 0)
          .attr("r", 0)
          .on("end", function() {
            d3.select(this).attr("r", 10);
          });

        prevTransitionCircles
          .selectAll("image.permanent")
          .transition()
          .duration(duration)
          .delay(that.isFormShowing ? duration : 0)
          .attr("width", 0)
          .attr("height", 0)
          .attr("x", 0)
          .attr("y", 0)
          .on("end", function() {
            d3.select(this)
              .attr("width", 16)
              .attr("height", 16)
              .attr("x", -8)
              .attr("y", -8);
          });

        that.isFormShowing = false;
      } else {
        that.shouldTransitionGsAnimate = true;
        that.shouldTransitionGsEnterAnimation = true;

        if (d.storedInfo.picture === null) {
          that.transitionGDataset = makeTransitionNodeData(2);
        } else {
          that.transitionGDataset = makeTransitionNodeData(4);
        }
        that.lastClickedCircle = iClicked;
        that.lastClickedCircleD = d;
        restartOptionG();
      }

      function sameCircleClicked() {
        return that.lastClickedCircle === iClicked;
      }

      function isTransitionCircleShowing() {
        return !optionG.select("circle").empty();
      }
    }

    function onTransitionNodeClick(dClicked, iClicked, list) {
      var clickedNode = d3.select(this);
      var selectedNode = that.selectedNode;
      var base = dClicked.basePeriod;
      that.forceUpdate();

      if (that.isFormShowing === true) {
        closeForm();

        that.lastClickedNode
          .transition()
          .duration(500)
          .attr("transform", d => getTranslateString(globalRadius, 0))

          .on("end", function(d, i) {
            // if clicked on URL node again when no picture node
            if (list.length < 4 && that.lastClickedId === 0) {
              if (iClicked === 0) {
                selectedNode.storedInfo.picture = "";
                that.transitionGDataset.push({
                  href:
                    "https://cdn1.iconfinder.com/data/icons/social-17/48/photos2-512.png"
                });
                that.transitionGDataset.push({
                  href:
                    "https://lh3.googleusercontent.com/proxy/i8kuoBF49SDAkOyq_WILZaSblnbe727c_2NCoH7M59AoedUgyIHBz5HiYGVaWFzNWKmLDegSIFBY_Ok8gfp2cEeEJ4i3dE7h6pyVXEPg4tuKJklqdCz6oGjsg78uf87zvX1eI1iP"
                });
                that.shouldTransitionGsAnimate = true;
                that.shouldTransitionGsEnterAnimation = true;
                restartOptionG();
                return;
              } else if (iClicked !== 0) {
                that.transitionGDataset.push({
                  href:
                    "https://cdn1.iconfinder.com/data/icons/social-17/48/photos2-512.png"
                });
                that.transitionGDataset.push({
                  href:
                    "https://lh3.googleusercontent.com/proxy/i8kuoBF49SDAkOyq_WILZaSblnbe727c_2NCoH7M59AoedUgyIHBz5HiYGVaWFzNWKmLDegSIFBY_Ok8gfp2cEeEJ4i3dE7h6pyVXEPg4tuKJklqdCz6oGjsg78uf87zvX1eI1iP"
                });

                that.transitionGs = optionG
                  .selectAll("g")
                  .data(that.transitionGDataset);
                selectedNode.storedInfo.picture = "";
                that.shouldTransitionGsAnimate = false;
                that.transitionGsEnter = that.transitionGs
                  .enter()
                  .append("g")
                  .attr("class", "permanent");
                that.transitionGsEnter.attr("transform", d => {
                  return getTranslateString(
                    selectedNode.x + 75,
                    selectedNode.y + 20
                  );
                });

                that.transitionGsEnter
                  .transition()
                  .duration(500)
                  .attr("transform", translateFromCenterToDefault())
                  .on("end", function(d, i, list) {
                    var periodSpaceBetween = Math.PI / (list.length + 1);
                    var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);
                    updateBasePeriod(d, goTo);
                  });
                that.transitionGs
                  .transition()
                  .duration(500)
                  .attrTween("transform", translateToDefault())
                  .on("end", function(d, i, list) {
                    var periodSpaceBetween = Math.PI / (list.length + 1);
                    var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);
                    updateBasePeriod(d, goTo);
                    if (iClicked !== that.lastClickedId && i == 0) {
                      openForm(d, iClicked);
                    }
                    if (i === list.length - 2) {
                      updateLastClicked(iClicked, clickedNode, dClicked);
                    }
                  });
                restartOptionG();
                that.transitionGs = that.transitionGs
                  .merge(that.transitionGsEnter)
                  .on("click", onTransitionNodeClick);
                return;
              }
            }
            // clicked on URL node with picture node
            else if (
              list.length === 4 ||
              (list.length < 4 && that.lastClickedId !== 0)
            ) {
              if (iClicked === that.lastClickedId) {
                that.transitionGs
                  .transition()
                  .duration(500)
                  .attrTween("transform", translateToDefault())
                  .on("end", function(d, i) {
                    var periodSpaceBetween = Math.PI / (list.length + 1);
                    updateBasePeriod(
                      d,
                      Math.PI / 2 - periodSpaceBetween * (i + 1)
                    );
                    updateLastClicked(iClicked, clickedNode, dClicked);
                  });
                return;

                //  not the same clicked, and,
              } else if (iClicked !== that.lastClickedId) {
                that.transitionGs
                  .transition()
                  .duration(500)
                  .attrTween("transform", translateBackLastMoved(base))
                  .on("end", function(d, i) {
                    updateBasePeriod(d, d.basePeriod - base);
                    if (i === iClicked) {
                      openForm(d, iClicked);
                    }
                    updateLastClicked(iClicked, clickedNode, dClicked);
                  });

                return;
              }
            }
            // clicking on URL node with other node's form open
          });
        return;
      }
      that.isFormShowing = true;

      optionG
        .select("foreignObject")
        .lower()
        .attrs({
          width: 300,
          height: 100,
          x: globalRadius
        });

      that.transitionGs
        .merge(that.transitionGsEnter)
        .transition()
        .duration(shouldAnimate() ? 500 : 0)
        .attrTween("transform", translateBackLastMoved(base))
        .on("end", function(d, i) {
          updateBasePeriod(d, d.basePeriod - base);
          if (i === iClicked) {
            openForm(d, iClicked);
          }
          updateLastClicked(iClicked, clickedNode, dClicked);
        });

      function shouldAnimate() {
        if (iClicked === 1 && list.length === 4) {
          return false;
        }
        return true;
      }

      function openForm(d, i) {
        if (i == 1) {
          that.transitionForm = optionG
            .select("foreignObject")
            .attrs({
              y: i === 1 ? -17.5 : -12.5
            })
            .append("xhtml:textarea");
        } else {
          that.transitionForm = optionG
            .select("foreignObject")
            .attrs({
              y: i === 1 ? -17.5 : -12.5
            })
            .append("xhtml:input");
        }
        that.transitionForm
          .style("width", "0px")
          .attr("id", "currentInput")
          .attr("spellcheck", false)
          .attr("placeholder", function() {
            switch (i) {
              case 0:
                return "Link Resource URL here!";
              case 1:
                return "Talk about this resource!";
              case 2:
                return "Custom Node image URL";
              case 3:
                return "Custom title";
              default:
            }
          })
          .attr("value", function() {
            switch (i) {
              case 0:
                return selectedNode.storedInfo.url;
              case 1:
                d3.select(this).node().innerText = selectedNode.storedInfo.info;
                break;
              case 2:
                if (
                  selectedNode.storedInfo.picture ===
                  selectedNode.storedInfo.url
                ) {
                  return null;
                }
                return selectedNode.storedInfo.picture;
              case 3:
                return selectedNode.storedInfo.title;
              default:
            }
          })
          .style("padding-right", "0px")
          .on("blur", function() {
            switch (i) {
              case 0:
                var that = this;
                var newURL = d3.select("#currentInput")._groups[0][0].value;

                if (newURL === selectedNode.storedInfo.url) return;

                selectedNode.storedInfo.url = newURL;
                selectedNode.storedInfo.picture = newURL;

                circleGroups.selectAll(".nodeImage").each(function(d) {
                  if (d !== selectedNode) return;

                  var pictureRef = this;
                  if (
                    !selectedNode.storedInfo.picture ||
                    selectedNode.storedInfo.picture === ""
                  ) {
                    // if there's nothing appended, href null
                    d3.select(that).attr("href", null);
                  } else {
                    // set src

                    var img = new Image();
                    img.onload = function() {
                      d3.select(pictureRef).attr("href", img.src);
                    };

                    img.onerror = function() {};
                    img.src =
                      "https://hosted-besticon.herokuapp.com/icon?url=" +
                      selectedNode.storedInfo.picture +
                      "&size=80..120..200";

                    d3.select(this).attr(
                      "href",
                      "https://media0.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif"
                    );
                  }
                });

                break;
              case 1:
                selectedNode.storedInfo.info = d3.select(
                  "#currentInput"
                )._groups[0][0].value;
                break;
              case 2:
                var that = this;
                var newValue = d3.select("#currentInput")._groups[0][0].value;

                if (newValue === selectedNode.storedInfo.picture) {
                  break;
                }

                selectedNode.storedInfo.picture = newValue;
                circleGroups.selectAll(".nodeImage").each(function(d) {
                  if (d !== selectedNode) return;

                  var pictureRef = this;
                  if (
                    !selectedNode.storedInfo.picture ||
                    selectedNode.storedInfo.picture === ""
                  ) {
                    // if there's nothing appended, href null
                    d3.select(that).attr("href", null);
                  } else {
                    // set src
                    var img = new Image();
                    img.onload = function() {
                      d3.select(pictureRef).attr("href", img.src);
                    };
                    img.onerror = function() {
                      // alert("choose diff photo! Make sure to insert an image address as opposed to the link of a website")
                      d3.select(pictureRef).attr("href", null);
                    };
                    img.src = selectedNode.storedInfo.picture;

                    d3.select(this).attr(
                      "href",
                      "https://media0.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif"
                    );
                  }
                });
                break;
              case 3:
                selectedNode.storedInfo.title = d3.select(
                  "#currentInput"
                )._groups[0][0].value;
              default:
            }
          });

        that.transitionForm
          .transition()
          .duration(500)
          .style("width", "175px")
          .style("padding-right", "15px")
          .style("padding-left", "5px")
          .on("end", function() {
            d3.select(this)
              .node()
              .focus();
          });

        clickedNode
          .transition()
          .duration(500)
          .attr("transform", d => transformOpenCurrentNode(d));

        that.isFormShowing = true;
      }
    }

    function updateLastClicked(newClickedId, newClickedNode, newClickedData) {
      that.lastClickedId = newClickedId;
      that.lastClickedNode = newClickedNode;
      that.lastClickedD = newClickedData;
    }
    function closeForm() {
      d3.select("#currentInput")
        .transition()
        .duration(500)
        .style("width", "0px")
        .style("padding-left", "0px")
        .style("padding-right", "0px")
        .on("end", function() {
          d3.select(this).remove();
          that.isFormShowing = false;
        });
    }
    function closeNode() {
      if (that.lastClickedNode)
        that.lastClickedNode
          .transition()
          .duration(500)
          .attr("transform", d => transformCloseCurrentNode(d));
    }
    function toggleFocus() {
      that.setState({ focus: !that.state.focus });
      if (that.state.focus) {
        that.force = d3
          .forceSimulation(that.nodes)
          .force(
            "link",
            d3
              .forceLink(that.links)
              .id(d => d.id)
              .distance(function(d) {
                return d.linkDistance;
              })
          )
          .force("charge", d3.forceManyBody().strength(-100))
          .on("tick", tick);

        that.force.alphaTarget(0.3).restart();
      } else {
        that.setState(
          {
            errMsg:
              "Force disabled. Dragging connected nodes changes link distance"
          },
          function() {
            setTimeout(function() {
              that.setState({ errMsg: "" });
            }, 3000);
          }
        );

        that.force.force("link", null).force("charge", null);
      }

      that.previousTransform = d3.select("g.gContainer").attr("transform");
      restart();
    }
    function togglePreview() {
      var previousPreview = that.state.preview;

      if (previousPreview === false) {
        that.setState({ preview: !that.state.preview });

        if (isTransitionCircleShowing()) {
          if (that.isFormShowing) {
            closeForm();
            closeNode();
          }
          optionG
            .selectAll("circle.permanent")
            .transition()
            .duration(500)
            .delay(that.isFormShowing ? 500 : 0)
            .attr("r", 0);
          optionG
            .selectAll("image.permanent")
            .transition()
            .duration(500)
            .delay(that.isFormShowing ? 500 : 0)
            .attr("width", 0)
            .attr("height", 0)
            .attr("x", 0)
            .attr("y", 0)
            .on("end", function() {
              optionG.selectAll("g").remove();
            });
        }
      } else {
        that.setState({ preview: !that.state.preview });

        //.on("end", restart());
        if (that.selectedNode && that.selectedNode.type === "circle") {
          var toDispatch = d3
            .selectAll(".circleGroup")
            .filter(function(d, i, list) {
              return d.id === that.selectedNode.id;
            });

          restart();

          toDispatch.dispatch("click");
          updateStroke();
        }
      }
    }
    function toggleTheme() {
      var prevTheme = that.state.theming;

      if (prevTheme === true) {
        // we are turning off
        // if toggling without selectedNode, render takes care of correct logic
        d3.select(".colorCardContainer")
          .style("opacity", 0)
          .attr("visibility", "visible")
          .transition()
          .duration(500)
          .style("opacity", 1);

        that.setState({ theming: false });
      } else {
        that.setState({ theming: true });
        //turn on
        d3.select(".colorCardContainer")
          .style("opacity", 1)
          .transition()
          .duration(500)
          .style("opacity", 0)
          .on("end", function() {
            d3.select(this).attr("visibility", "hidden");
          });
      }
    }
    function isTransitionCircleShowing() {
      return !optionG.select("circle").empty();
    }
    function textNodeClick(rectData) {
      var prevLocation = optionG.attr("transform");
      var duration = 500;
      if (that.selectedNode && that.selectedNode.type === "circle") {
        that.lastClickedCircle = null;
        // if we were selecting circles, close them
        closeForm();
        closeNode();
        optionG
          .selectAll("circle.permanent")
          .transition()
          .duration(500)
          .delay(that.isFormShowing ? 500 : 0)
          .attr("r", 0);
        optionG
          .selectAll("image.permanent")
          .transition()
          .duration(500)
          .delay(that.isFormShowing ? 500 : 0)
          .attr("width", 0)
          .attr("height", 0)
          .attr("x", 0)
          .attr("y", 0);
      }
      if (rectData === that.selectedNode) {
        that.selectedNode = null;
        that.forceUpdate();
        restart();
      } else {
        that.selectedNode = rectData;
        that.forceUpdate();
        restart();
      }
    }

    function textNodeDblClick(rectData) {
      updateStroke();
      that.mousedownNode = null;

      that.isTyping = true;
      rectOnClickSetUp(that.isTyping, that.selectedNode, svg, rectData);
      that.startText = rectData.text;

      rectOnClickBlurCurrentText(that.nodes, restart, rectData);
      that.textInputCircle = rectData;

      textBox = textBox
        .attr("x", rectData.x)
        .attr("y", rectData.y)
        .attr("width", window.innerWidth / 2)
        .attr("height", window.innerHeight);
      var paragraph = textBox
        .append("xhtml:p")
        .html(() => textArrToHTML(rectData.text))
        .attr("contentEditable", "true")

        .attr("spellcheck", false)
        .attr("width", window.innerWidth / 2)
        .style("width", window.innerWidth / 2)
        .style("outline", 0)
        .style("font", "12px sans-serif")
        .style("display", "block");

      paragraph
        .on("blur", function() {
          svg.call(
            d3
              .zoom()
              .scaleExtent([0.1, 4])
              .on("zoom", function() {
                container.attr("transform", d3.event.transform);
              })
          );
          d3.selectAll("foreignObject").remove();
          textBox = container.append("foreignObject");
          resourceForm = container
            .append("foreignObject")
            .attr("id", "resourceForm");
          that.nodes.map(eachNode => {
            if (eachNode.id === that.textInputCircle.id) {
              eachNode.opacity = 1;
              restart();
            }
          });

          //TODO: if text isn't the same or the node is brand new, store to history
          //on add new node, notNewNode is false
          //on dblclick, blur, notNewNode is true
          if (that.startText !== rectData.text) {
            that.nodeToChange = rectData;
            var command = {
              action: {
                type: "modifyText",
                node: that.nodeToChange,
                text: rectData.text
              },
              inverse: {
                type: "modifyText",
                node: that.nodeToChange,
                text: that.startText
              }
            };

            that.storeToHistory(command);
          }

          that.startText = null;
          that.nodeToChange = null;
          that.isTyping = false;
          that.textInputCircle = null;
        })
        .on("keydown", function() {
          if (d3.event.keyCode === 13 && !d3.event.shiftKey) {
            d3.event.preventDefault();
          }
        })
        .on("keyup", function() {
          if (d3.event.keyCode === 13 && !d3.event.shiftKey) {
            this.blur();
          } else {
            var node = d3.select(this).node();
            // note, d.text is referring to the d in dblclick, d in g, d in text, from that.nodes
            var nodeHTML = d3.select(this).node().innerHTML;

            nodeHTML = nodeHTML.slice(3, nodeHTML.length - 4);

            if (
              nodeHTML.substring(nodeHTML.length - 4, nodeHTML.length) ===
              "<br>"
            ) {
              nodeHTML = nodeHTML.slice(0, nodeHTML.length - 4);
            }

            var textArr = nodeHTML.split("<br>");
            rectData.text = textArr;

            restart();
          }
        });

      paragraph.node().focus();
    }

    function resourceNodeMouseUp(d) {
      var mousedownNode = that.mousedownNode,
        selectedNode = that.selectedNode;

      that.forceUpdate();

      if (!that.mousedownNode) return;

      svg.call(
        d3
          .zoom()
          .scaleExtent([0.1, 4])
          .on("zoom", function() {
            container.attr("transform", d3.event.transform);
          })
      );
      // needed by FF
      dragLine.classed("hidden", true).style("marker-end", "");

      that.mouseupNode = d;
      if (that.mouseupNode === that.mousedownNode) {
        that.mousedownNode = null;
        that.selectedNode = null;
        that.forceUpdate();
        return;
      }

      const source = that.mousedownNode;
      const target = that.mouseupNode;
      var link = {
        source: source,
        target: target,
        linkDistance: 250,
        index: that.links.length
      };
      that.links.push(link);

      var command = {
        action: { type: "addLink", link: link },
        inverse: { type: "delLink", link: link }
      };

      that.storeToHistory(command);

      //that.mousedownNode = null;

      restart();
    }
    function updateStroke() {
      console.log("do we have selectedNode?", that.selectedNode);
      var allNodeSelection = d3.selectAll(".node");
      console.log("our selection", allNodeSelection);
      if (!that.selectedNode) {
        allNodeSelection.each(function() {
          d3.select(this).attr("stroke", that.selectedNode.strokeColor);
        });
        return;
      }

      allNodeSelection.each(function(eachNodeData) {
        console.log(eachNodeData.id === that.selectedNode.id, eachNodeData);
        if (eachNodeData.id === that.selectedNode.id) {
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
    function nodeMouseDown(d) {
      optionGroup
        .transition()
        .duration(300)
        .attr("opacity", 0)
        .on("end", function() {
          optionGroup.attr("visibility", "hidden");
        });
      that.mousedownNode = d;
      /*
      if (d.type === "text") {
        that.selectedNode =
          that.mousedownNode === that.selectedNode ? null : that.mousedownNode;
        that.selectedLink = null;

        updateStroke();
      }
*/
    }

    function splicelinksForNode(node) {
      const toSplice = that.links.filter(
        l => l.source === node || l.target === node
      );
      for (const l of toSplice) {
        that.links.splice(that.links.indexOf(l), 1);
      }

      return toSplice;
    }

    function stretchOutOptionGroupForm() {
      optionGroupG
        .transition()
        .duration(600)
        .ease(d3.easeBounce)
        .attr("transform", getTranslateString(100, 0));
      optionGroupConnector
        .transition()
        .duration(600)
        .ease(d3.easeBounce)
        .attr("width", 100);
    }

    function stretchCloseOptionGroupForm(endFunction = null) {
      optionGroupG
        .transition()
        .duration(600)
        .attr("transform", getTranslateString(0, 0));
      optionGroupConnector
        .transition()
        .duration(600)
        .attr("width", 0)
        .on("end", function() {
          if (endFunction) {
            endFunction();
          }
        });
    }

    function isOptionGroupFormVisible() {
      return optionGroup.attr("visibility") === "visible";
    }

    function invertOptionGroupVisibility() {
      optionGroupConnector.attr(
        "visibility",
        isOptionGroupFormVisible() ? "hidden" : "visible"
      );

      optionGroup
        .attr("visibility", isOptionGroupFormVisible() ? "hidden" : "visible")
        .attr("transform", function(d) {
          if (that.selectedNode.type === "circle") {
            return getTranslateString(
              that.selectedNode.x + 115,
              that.selectedNode.y - 5
            );
          } else if (that.selectedNode.type === "text") {
            return getTranslateString(
              that.selectedNode.x + that.selectedNode.width + 10,
              that.selectedNode.y - 5 + that.selectedNode.height / 2 - 25
            );
          }
        });
    }

    function click() {
      //WHY IS CLICK() TRIGGERING FOR ONLY FOR CIRCULAR NODES, DEBUG?
      var mousedownNode = that.mousedownNode,
        selectedNode = that.selectedNode;

      that.forceUpdate();

      if (that.inConnectMode) {
        optionGroup
          .transition()
          .duration(300)
          .attr("opacity", 0)
          .on("end", function() {
            optionGroup.attr("visibility", "hidden");
            optionGroupConnector.attr("visibility", "hidden");
            optionGroupG.attr("transform", getTranslateString(0, 0));
            optionGroupConnector.attr("width", 0);
          });
      } else {
        optionGroup
          .transition()
          .duration(300)
          .attr("opacity", 0)
          .on("end", function() {
            optionGroup.attr("visibility", "hidden");
            optionGroupConnector.attr("visibility", "hidden");
          });
      }

      that.inConnectMode = false;

      //    optionGroupConnector.attr("visibility", "hidden");

      //triggers if there is no mouse down node
      if (d3.event.ctrlKey && !that.mousedownNode) {
        //TODO: run a function that updates circles & rectangles to their appropriate colors

        var point = d3.mouse(this);
        var transform = d3.zoomTransform(container.node());
        that.point = transform.invert(point);
        optionGroupConnector.attr("visibility", "hidden");
        optionGroup
          .attr("transform", `translate(${that.point[0]}, ${that.point[1]})`)
          .transition()
          .duration(300)
          .attr("opacity", 1)
          .on("start", function() {
            optionGroup.attr("visibility", "visible");
          });
      }

      that.mousedownNode = null;
    }
    function mousedown() {}
    function mousemove() {
      that.mouseupNode = null;
      if (!that.mousedownNode) return;

      // update drag line
      if (d3.event.ctrlKey) {
        dragLine
          .classed("hidden", false)
          .style("marker-end", "url(#end-arrow)");

        var transform = d3.zoomTransform(container.node());
        var xy1 = transform.invert(d3.mouse(svg.node()));
        dragLine.attr(
          "d",
          `M${that.mousedownNode.x + that.mousedownNode.width / 2},${that
            .mousedownNode.y +
            that.mousedownNode.height / 2}L${xy1[0]},${xy1[1]}`
        );
      }
    }
    function mouseup() {
      //console.log("svg mouseup", "mousedown node", that.mousedownNode);

      // hide drag line
      if (that.mousedownNode)
        dragLine.classed("hidden", true).style("marker-end", "");
      if (that.mousedownNode && that.mouseupNode) {
        if (
          that.mousedownNode.type === "text" ||
          that.mouseupNode.type === "text"
        ) {
          click();
        }
      }
    }
    function keydown() {
      if (d3.event.ctrlKey && !that.isTyping) {
        if (
          (d3.event.keyCode === 17 && d3.event.shiftKey) ||
          d3.event.keyCode === 89
        ) {
          redo();
        } else if (d3.event.keyCode === 90) {
          undo();
        }
      }

      if (!that.selectedNode && !that.selectedLink) return;

      switch (d3.event.keyCode) {
        case 9: //tab
          break;

        case 46: // delete
          if (that.selectedNode && !that.isTyping) {
            console.log("TOOD: Close transition Gs");

            var node = that.selectedNode;
            var links = splicelinksForNode(that.selectedNode);
            that.nodes = that.nodes.filter(n => n.id !== that.selectedNode.id);

            var command = {
              action: { type: "delNodeLink", node: node, links: links },
              inverse: { type: "addNodeLink", node: node, links: links }
            };
            that.storeToHistory(command);
            restart();
          } else if (that.selectedLink) {
            that.links.splice(that.links.indexOf(that.selectedLink), 1);
            var command = {
              action: { type: "delLink", link: that.selectedLink },
              inverse: {
                type: "addLink",
                link: that.selectedLink
              }
            };
            that.storeToHistory(command);
            restart();
          }
          that.selectedLink = null;
          //that.selectedNode = null;

          break;
      }
    }
    function keyup() {
      switch (d3.event.keyCode) {
        case 9: //tab
          toggleFocus();
          break;
        case 192: // ` ~ key
          if (that.selectedNode && !that.isTyping) {
            that.inConnectMode = true;

            if (isOptionGroupFormVisible()) {
              stretchCloseOptionGroupForm(invertOptionGroupVisibility);
            } else {
              // not visible
              optionGroupConnector.attr("visibility", "visible");
              optionGroupConnector.attr("opacity", 1);
              optionGroup.attr("opacity", 1);
              optionGroup.attr("visibility", "visible");
              stretchOutOptionGroupForm();
            }

            // now, move each element by 150 to the right, do this
          }
      }
    }
    function keypress() {}
    function resize() {
      svg.style("width", window.innerWidth).style("height", window.innerHeight);
    }

    function undo() {
      if (that.historyStep !== 0) {
        console.log(that.history[that.historyStep]);
        var inverseCommand = that.history[that.historyStep].inverse;
        switch (inverseCommand.type) {
          case "delNode":
            that.nodes = that.nodes.filter(
              n => n.id !== inverseCommand.node.id
            );
            break;

          case "delLink":
            that.links = that.links.filter(
              l => l.index !== inverseCommand.link.index
            );

            break;

          case "addLink":
            that.links.push({
              source: inverseCommand.link.source,
              target: inverseCommand.link.target,
              linkDistance: inverseCommand.link.linkDistance,
              index: inverseCommand.link.index
            });

            break;

          case "delNodeLink":
            that.nodes = that.nodes.filter(
              n => n.id !== inverseCommand.node.id
            );
            that.links = that.links.filter(l => {
              return inverseCommand.links.indexOf(l) < 0;
            });

            break;

          case "addNodeLink":
            that.nodes.push(inverseCommand.node);

            inverseCommand.links.map(eachLink => {
              that.links.push({
                source: eachLink.source,
                target: eachLink.target,
                linkDistance: eachLink.linkDistance,
                index: eachLink.index
              });
            });

            break;

          case "modifyText":
            that.nodes.map(n => {
              if (n.id === inverseCommand.node.id) {
                n.text = inverseCommand.text;
              }
            });

            break;

          case "modifyResourceNode":
            that.nodes.map(n => {
              if (n.id === inverseCommand.node.id) {
                n.description = inverseCommand.description;
                n.storedInfo.url = inverseCommand.storedInfo.url;
              }
            });

            break;
        }
        that.historyStep -= 1;
      }
      restart();
    }
    function redo() {
      if (that.historyStep !== that.history.length - 1) {
        that.historyStep += 1;
        var actionCommand = that.history[that.historyStep].action;
        switch (actionCommand.type) {
          case "addNode":
            that.nodes.push(actionCommand.node);
            break;
          case "addLink":
            that.links.push({
              source: actionCommand.link.source,
              target: actionCommand.link.target,
              linkDistance: actionCommand.link.linkDistance,
              index: actionCommand.link.index
            });
            break;
          case "delLink":
            that.links = that.links.filter(
              l => l.index !== actionCommand.link.index
            );
            break;

          case "addNodeLink":
            that.nodes.push(actionCommand.node);

            actionCommand.links.map(eachLink => {
              that.links.push({
                source: eachLink.source,
                target: eachLink.target,
                linkDistance: eachLink.linkDistance,
                index: eachLink.index
              });
            });
            break;
          case "delNodeLink":
            that.nodes = that.nodes.filter(n => n.id !== actionCommand.node.id);
            that.nodes = that.links.filter(l => {
              return actionCommand.links.indexOf(l) < 0;
            });

            break;

          case "modifyText":
            that.nodes.map(n => {
              if (n.id === actionCommand.node.id) {
                n.text = actionCommand.text;
              }
            });

            break;

          case "modifyResourceNode":
            that.nodes.map(n => {
              if (n.id === actionCommand.node.id) {
                n.description = actionCommand.description;
                n.storedInfo.url = actionCommand.storedInfo.url;
              }
            });

            break;
        }

        restart();
      }
    }
  }

  componentDidUpdate() {
    if (this.selectedNode && this.selectedNode.type === "circle") {
      var selectedNodeDOM = d3
        .selectAll("image.nodeImage")
        .filter(n => n.id === this.selectedNode.id);
      if (selectedNodeDOM) {
        var selectedNodeHref = selectedNodeDOM.attr("href");
        var defaultHref =
          "https://media0.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif";
        if (selectedNodeHref === defaultHref) {
          d3.select("img.cardImg").attr(
            "src",
            "https://hosted-besticon.herokuapp.com/icon?url=" +
              selectedNodeDOM.data()[0].storedInfo.url +
              "&size=80..120..200"
          );
        } else {
          d3.select("img.cardImg").attr("src", selectedNodeDOM.attr("href"));
        }
      }
    }
  }

  render() {
    const errDisplay = (
      <div className="errMsginner">
        <span style={{ color: "white" }} id="errMsg">
          {this.state.errMsg}
        </span>
      </div>
    );
    var colorArray = d3.schemeCategory10.slice(0, 8);
    return (
      <React.Fragment>
        <div id="editorsContainer" className="">
          {this.state.showManual ? (
            <Manual toggleManual={this.toggleManual} />
          ) : null}
          <div className="GraphEditorContainer" />
          <div className="errMsg">{errDisplay}</div>

          <ColorCard
            opacity={!this.state.preview && this.selectedNode ? 1 : 0}
          />

          {this.state.preview &&
          this.selectedNode &&
          this.selectedNode.type === "circle" ? (
            <PreviewCard node={this.selectedNode.storedInfo} />
          ) : null}
          <div className="toolbar">
            <img className="icon" onClick={this.toggleManual} src={manual} />
            <img
              className="icon"
              id="focusIcon"
              src={this.state.focus ? focused : notFocused}
            />
            <img
              className="icon"
              id="previewIcon"
              src={this.state.preview ? preview_purple : preview}
            />
            <img
              className="icon"
              id="themeIcon"
              src={this.state.theming ? theming_purple : theming}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
}
export default GraphEditor;
