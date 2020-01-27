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
import {
  rectOnClickSetUp,
  rectOnClickBlurCurrentText
} from "./RoadmapediaMouseFunctions.js";
import alphabetT from "./svgs/t-alphabet.svg";
import alphabetTPurple from "./svgs/t-alphabet-purple.svg";
import link from "./svgs/link.svg";
import purpleLink from "./svgs/purpleLink.svg";
import { textArrToHTML } from "./RoadmapediaHelperFunctions.js";
const colors = d3.scaleOrdinal(d3.schemeCategory10);
// set up svg for D3
const initialNodes = [];
const initialLinks = [];

class GraphEditor extends Component {
  constructor(props) {
    super(props);

    this.state = { showManual: false, focus: true };

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
        nodes: [...initialNodes],
        links: [...initialLinks]
      }
    ];
    this.txtHistory = [];
    this.historyStep = 0;
    this.previousTransform = null;

    this.isDragging = false;
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

  storeToHistory() {
    this.history = this.history.slice(0, this.historyStep + 1);

    var newStep = {
      nodes: [...this.nodes],
      links: [...this.links],
      nodeToChangeID: this.nodeToChange ? this.nodeToChange.id : -1,
      texts: {
        undoTo: this.startText,
        redoTo: this.nodeToChange ? this.nodeToChange.text : null
      }
    };
    this.history = this.history.concat([newStep]);
    this.historyStep += 1;
  }

  componentDidMount() {
    d3.select("#focusIcon").on("click", toggleFocus);
    var that = this;

    var GraphEditor = d3.select("div#editorsContainer");
    var svgContainer = GraphEditor.append("div").attr(
      "class",
      "GraphEditorContainer"
    );

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
        console.log("Drag Ended");
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

    let circles = container.append("svg:g").selectAll("circle");

    let textBox = container.append("foreignObject");
    let resourceForm = container
      .append("foreignObject")
      .attr("class", "resourceForm");
    let optionGroup = container.append("g").attr("visibility", "hidden");

    var optionGroupConnector = optionGroup
      .append("line")
      .attrs({ x1: -100, y1: 25, x2: 7.5, y2: 25, stroke: "black" })
      .style("stroke-width", 4);

    var optionGroupRect = optionGroup
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

    var optionGroupT = optionGroup
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
        optionGroup.attr("visibility", "hidden");
        optionGroupConnector.attr("visibility", "hidden");
        if (that.selectedNode) {
          const node = {
            type: "text",
            id: that.nodes.length,
            width: 150,
            height: 40,
            text: [""],
            x: that.selectedNode.x + that.selectedNode.width + 100,
            y: that.selectedNode.y
          };
          that.point = null;
          that.nodes.push(node);

          restart();
          const source = that.selectedNode;
          const target = node;

          that.links.push({
            source: source,
            target: target,
            linkDistance:
              node.x - that.selectedNode.x > 250
                ? node.x - that.selectedNode.x
                : 250,
            index: that.links.length
          });
          //not triggering doubleclicking prohibits force from calculating x & y properly?
          var toDispatch = d3
            .selectAll("rect.node")
            .filter(function(d, i, list) {
              return i === list.length - 1;
            });
          toDispatch.dispatch("dblclick");
          that.selectedNode = that.nodes[that.nodes.length - 1];
          restart();
        } else {
          const node = {
            type: "text",
            id: that.nodes.length,
            width: 150,
            height: 40,
            text: [""],
            x: that.point[0],
            y: that.point[1]
          };
          that.point = null;
          that.nodes.push(node);
          restart();
          var toDispatch = d3
            .selectAll("rect.node")
            .filter(function(d, i, list) {
              return i === list.length - 1;
            });
          toDispatch.dispatch("dblclick");
          that.selectedNode = that.nodes[that.nodes.length - 1];
          restart();
        }
      });

    var optionGroupBorder = optionGroup
      .append("line")
      .attrs({ x1: 57.5, y1: 9, x2: 57.5, y2: 42, stroke: "black" })
      .attr("stroke-width", 2);

    var optionGroupLink = optionGroup
      .append("image")
      .on("mouseover", function() {
        d3.select(this).attr("xlink:href", purpleLink);
      })
      .on("mouseout", function() {
        d3.select(this).attr("xlink:href", link);
      })
      .on("click", function(d) {
        optionGroup.attr("visibility", "hidden");
        optionGroupConnector.attr("visibility", "hidden");
        if (that.selectedNode) {
          const node = {
            type: "circle",
            id: that.nodes.length,
            width: 150,
            height: 40,
            text: [""],
            x: that.selectedNode.x + that.selectedNode.width + 100,
            y: that.selectedNode.y
          };
          that.point = null;
          that.nodes.push(node);
          restart();
          const source = that.selectedNode;
          const target = node;

          that.links.push({
            source: source,
            target: target,
            linkDistance:
              node.x - that.selectedNode.x > 250
                ? node.x - that.selectedNode.x
                : 250,
            index: that.links.length
          });
          //not triggering doubleclicking prohibits force from calculating x & y properly?
          var toDispatch = d3.selectAll("circle").filter(function(d, i, list) {
            return i === list.length - 1;
          });

          toDispatch.dispatch("dblclick");
          that.selectedNode = that.nodes[that.nodes.length - 1];
          restart();
        } else {
          const node = {
            type: "circle",
            id: that.nodes.length,
            width: 150,
            height: 40,
            text: [""],
            x: that.point[0],
            y: that.point[1]
          };
          that.point = null;
          that.nodes.push(node);
          restart();
          var toDispatch = d3.selectAll("circle").filter(function(d, i, list) {
            return i === list.length - 1;
          });
          toDispatch.dispatch("dblclick");
          that.selectedNode = that.nodes[that.nodes.length - 1];
          restart();
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

    // app starts here
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

    function resetMouseVars() {
      that.mousedownNode = null;
      //that.mouseupNode = null;
      that.mousedownLink = null;
    }
    // update force layout (called automatically each iteration)
    function tick() {
      // draw directed edges with proper padding from node centers
      if (optionGroupConnector.attr("visibility") === "visible")
        optionGroup.attr("transform", function(d) {
          if (that.selectedNode.type === "circle")
            return `translate(${that.selectedNode.x + 205},${that.selectedNode
              .y +
              that.selectedNode.height / 2 -
              25})`;
          return `translate(${that.selectedNode.x +
            that.selectedNode.width +
            100},${that.selectedNode.y + that.selectedNode.height / 2 - 25})`;
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

        return `M${d.source.x + d.source.width / 2},${d.source.y +
          d.source.height / 2}L${d.target.x + d.target.width / 2},${d.target.y +
          d.target.height / 2}`;
      });

      nodes.attr("transform", d => {
        //if (d.type === "circle") return;

        if (that.textInputCircle)
          if (d.id === that.textInputCircle.id) {
            that.textInputCircle.x = d.x;
            that.textInputCircle.y = d.y;
          }
        return `translate(${d.x},${d.y})`;
      });

      circles.attrs({ cx: d => d.x + 75, cy: d => d.y + 20 });

      if (textBox.attr("x"))
        //if x exists, textBox is visible, change positions
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
    // update graph (called when needed)

    function restart() {
      //TODO: selectAll as temporary solution, upgrade to difference update pattern

      d3.selectAll("rect.node").remove();
      d3.selectAll("text").remove();
      d3.selectAll("g.textContainer").remove();
      //d3.selectAll("circle").remove();
      //
      //JOIN DATA
      path = path.data(that.links);

      // update existing that.links
      path
        .classed("selected", d => d === that.selectedLink)
        .style("marker-end", "url(#end-arrow)");

      // EXIT
      path.exit().remove();

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
          restart();
        })
        .merge(path);

      let gNodeGroups = nodes.data(that.nodes, d => d.id);
      gNodeGroups.exit().remove();
      gNodeGroups = gNodeGroups
        .enter()
        .append("svg:g")
        .attr("class", "nodeGroup")
        .merge(gNodeGroups)
        .call(drag);

      // a selection of rect
      var rect = gNodeGroups.filter(d => d.type === "text").append("svg:rect");

      var imgs = gNodeGroups.filter(d => d.type === "circle").append("image");

      circles = circles.data(
        that.nodes.filter(eachNode => eachNode.type === "circle")
      );
      circles.exit().remove();
      circles = circles
        .enter()
        .append("svg:circle")
        .merge(circles);

      circles
        .attrs({ r: 30, cx: 75, cy: 20, fill: "white" })
        .style("stroke-width", 2)
        .attr("stroke", function(d) {
          if (that.selectedNode && d.id === that.selectedNode.id) {
            return "url(#svgGradient)";
          }
          return "black";
        });
      circles
        .on("mousedown", d => {
          console.log("Mouse Downed on A Node");
          optionGroup.attr("visibility", "hidden");
          rect.attr("stroke", "black");
          circles.each(function(d2) {
            var isNewSelection = false;
            if (d.id === d2.id) {
              var currentStroke = d3.select(this).attr("stroke");
              if (currentStroke === "url(#svgGradient)") {
                d3.select(this).attr("stroke", "black");
              } else {
                d3.select(this).attr("stroke", "url(#svgGradient)");
                isNewSelection = true;
              }
            }

            if (isNewSelection) {
              circles.each(function(d2) {
                if (d.id !== d2.id) {
                  d3.select(this).attr("stroke", "black");
                }
              });
            }
          });

          that.mousedownNode = d;
          that.selectedNode =
            that.mousedownNode === that.selectedNode
              ? null
              : that.mousedownNode;
          that.selectedLink = null;
          console.log("mouse down node after mousedown", that.mousedownNode);
        })
        .on("mouseup", function(d) {
          console.log("Mouse Upped on A Node");
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
            return;
          }

          d3.select(this).attr("transform", "");

          const source = that.mousedownNode;
          const target = that.mouseupNode;

          that.links.push({
            source: source,
            target: target,
            linkDistance: 250
          });

          that.storeToHistory();

          that.selectedNode = null;
          //that.mousedownNode = null;
          //console.log("mouseup node in mouseup()", that.mouseupNode);

          restart();

          //console.log("mousedown node at mouseupNode", that.mousedownNode);
        })
        .on("dblclick", function(circleData) {
          //not changing circle opacity to 0 right now because form should be larger than circle
          console.log("Double Clicked On A Node");
          that.mousedownNode = null;
          that.selectedNode = null;
          that.resourceFormCircleData = circleData;
          svg.on(".zoom", null);
          //technically textBox can be reused since it's just a foreginOBject that can be reassigned each time
          resourceForm = resourceForm
            .attr("x", circleData.x)
            .attr("y", circleData.y)
            .attr("width", 150)
            .attr("height", 200);
          resourceForm
            .append("xhtml:div")
            .html(
              "<div class='resourceForm'><form autocomplete='off'><div class='formContainer'><a class='resourceFormA'>Resource URL</a><input id='input1'/><br/><a class='resourceFormA'>Description</a><textarea id='input2'></textarea></div></form><button id='resourceFormSubmitButton'>yes</button><button id='resourceFormCancelButton'>cancel</button></div>"
            );

          d3.select("#resourceFormSubmitButton").on("click", function() {
            svg.call(
              d3
                .zoom()
                .scaleExtent([0.1, 4])
                .on("zoom", function() {
                  container.attr("transform", d3.event.transform);
                })
            );
            var resourceLink = document.getElementById("input1").value;
            circleData.resourceLink = resourceLink;
            d3.selectAll("foreignObject").remove();
            textBox = container.append("foreignObject");
            resourceForm = container
              .append("foreignObject")
              .attr("class", "resourceForm");
          });

          d3.select("#resourceFormCancelButton").on("click", function() {
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
              .attr("class", "resourceForm");
          });
        });
      circles.call(drag);
      /*
        imgs
          .attrs({ height: 60, width: 60, x: 75, y: -10 })
          .attr("xlink:href", "http://f1.allesedv.com/16/google.com");
*/
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

          console.log("selectedNode", that.selectedNode);
          that.selectedLink = null;

          //can't restart, if restart dblclick can't be detected
          //restart();
        })
        .on("mouseup", function(d) {
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
            return;
          }

          d3.select(this).attr("transform", "");

          const source = that.mousedownNode;
          const target = that.mouseupNode;

          that.links.push({
            source: source,
            target: target,
            linkDistance: 250
          });

          that.storeToHistory();

          that.selectedNode = null;
          that.mousedownNode = null;
          console.log("mouseup node in mouseup()", that.mouseupNode);

          restart();
        });

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
            var rectAndTextPair = d3.select(this).append("g");

            var tspan = rectAndTextPair.append("text").html(function(d) {
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
          console.log("previous height", d.height);
          d.height = d.text.length * eachTextHeight + 25;
          console.log("new height", d.text.length * eachTextHeight + 25);
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
          return "black";
        })
        .on("dblclick", function(rectData) {
          console.log("Double Clicked On A Node");
          that.mousedownNode = null;
          that.selectedNode = null;
          rectOnClickSetUp(
            that.isTyping,
            that.selectedNode,
            svg,
            that.startText,
            rectData
          );
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

              var oldNodes = that.history[that.historyStep].nodes;

              var matchedNode = oldNodes.filter(eachNode => {
                return eachNode.id === rectData.id;
              });

              //TODO: if text isn't the same or the node is brand new, store to history
              //on add new node, notNewNode is false
              //on dblclick, blur, notNewNode is true
              if (that.startText !== rectData.text) {
                that.nodeToChange = rectData;
                //console.log("starttext");
                that.storeToHistory();
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
        })
        .on("mouseover", function(d) {
          if (!d3.event.ctrlKey) return;
          if (!that.mousedownNode || d === that.mousedownNode) return;
          // enlarge target node
          //d3.select(this).attr("transform", "scale(1.1) translate(-50, 0)");
        })
        .on("mouseout", function(d) {
          if (!that.mousedownNode || d === that.mousedownNode) return;
          // unenlarge target node
          d3.select(this).attr("transform", "");
        })
        .on("mousedown", d => {
          console.log("Mouse Downed on A Node");
          console.log("rects", rect);
          optionGroup.attr("visibility", "hidden");
          circles.attr("stroke", "black");
          rect.each(function(d2) {
            var isNewSelection = false;
            if (d.id === d2.id) {
              var currentStroke = d3.select(this).attr("stroke");
              if (currentStroke === "url(#svgGradient)") {
                d3.select(this).attr("stroke", "black");
              } else {
                d3.select(this).attr("stroke", "url(#svgGradient)");
                isNewSelection = true;
              }
            }

            if (isNewSelection) {
              rect.each(function(d2) {
                if (d.id !== d2.id) {
                  d3.select(this).attr("stroke", "black");
                }
              });
            }
          });

          circles.each(function(d2) {
            var isNewSelection = false;
            if (d.id === d2.id) {
              var currentStroke = d3.select(this).attr("stroke");
              if (currentStroke === "url(#svgGradient)") {
                d3.select(this).attr("stroke", "black");
              } else {
                d3.select(this).attr("stroke", "url(#svgGradient)");
                isNewSelection = true;
              }
            }

            if (isNewSelection) {
              circles.each(function(d2) {
                if (d.id !== d2.id) {
                  d3.select(this).attr("stroke", "black");
                }
              });
            }
          });

          that.mousedownNode = d;
          that.selectedNode =
            that.mousedownNode === that.selectedNode
              ? null
              : that.mousedownNode;
          that.selectedLink = null;
        })
        .on("mouseup", function(d) {
          console.log("Mouse Upped on A Node");
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
            return;
          }

          d3.select(this).attr("transform", "");

          const source = that.mousedownNode;
          const target = that.mouseupNode;

          that.links.push({
            source: source,
            target: target,
            linkDistance: 250
          });

          that.storeToHistory();

          that.selectedNode = null;
          that.mousedownNode = null;
          console.log("mouseup node in mouseup()", that.mouseupNode);

          restart();
        });

      nodes = gNodeGroups.merge(nodes);

      that.force.nodes(that.nodes);

      that.force.alphaTarget(0.3).restart();
    }

    function toggleFocus() {
      that.setState({ focus: !that.state.focus });
      if (that.state.focus) {
        console.log("focused, force is applied");
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
        console.log("unfocused, dragging will change length");
        that.force.force("link", null).force("charge", null);
      }

      that.previousTransform = d3.select("g.gContainer").attr("transform");
      restart();
    }

    //sensing svg click
    function click() {
      console.log("Mouse Click in window");
      optionGroup.attr("visibility", "hidden");

      if (d3.event.ctrlKey && !that.mousedownNode) {
        console.log("mouse down node at ctrl click", that.mousedownNode);
        that.selectedNode = null;
        //TODO: run a function that updates circles & rectangles to their appropriate colors

        var point = d3.mouse(this);
        var transform = d3.zoomTransform(container.node());
        that.point = transform.invert(point);
        console.log(that.point);
        console.log("points when window got clicked", point);
        optionGroupConnector.attr("visibility", "hidden");
        optionGroup
          .attr("visibility", "visible")
          .attr("transform", `translate(${that.point[0]}, ${that.point[1]})`);
      }

      that.mousedownNode = null;
    }
    function mousedown() {
      console.log("Mouse Down in window");
    }
    //sensing svg mousemove (move dragLine)
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

    //sensing svg mouseup (undraws link)
    function mouseup() {
      console.log("Mouse Up in window");
      //console.log("svg mouseup", "mousedown node", that.mousedownNode);

      if (that.mousedownNode) {
        // hide drag line
        dragLine.classed("hidden", true).style("marker-end", "");
      }

      // because :active only works in WebKit?
      svg.classed("active", false);
    }

    function splicelinksForNode(node) {
      const toSplice = that.links.filter(
        l => l.source === node || l.target === node
      );
      for (const l of toSplice) {
        that.links.splice(that.links.indexOf(l), 1);
      }
    }

    function keydown() {
      if (d3.event.ctrlKey && !that.isTyping) {
        if (
          (d3.event.keyCode === 17 && d3.event.shiftKey) ||
          d3.event.keyCode === 89
        ) {
          //REDO
          if (that.historyStep !== that.history.length - 1) {
            that.historyStep += 1;

            that.nodes = [...that.history[that.historyStep].nodes];

            //apply the text
            if (
              that.history[that.historyStep].nodeToChangeID !== -1 &&
              that.history[that.historyStep].texts.redoTo
            ) {
              that.nodes.map(eachNode => {
                if (
                  eachNode.id === that.history[that.historyStep].nodeToChangeID
                ) {
                  eachNode.text = JSON.parse(
                    JSON.stringify(that.history[that.historyStep].texts.redoTo)
                  );
                }
              });
            }

            that.links = [...that.history[that.historyStep].links];

            restart();
          }
        } else if (d3.event.keyCode === 90) {
          //UNDO
          if (that.historyStep !== 0) {
            that.historyStep -= 1;

            that.nodes = [...that.history[that.historyStep].nodes];

            //apply the text
            if (
              that.history[that.historyStep + 1].nodeToChangeID !== -1 &&
              that.history[that.historyStep + 1].texts.undoTo
            ) {
              that.nodes.map(eachNode => {
                if (
                  eachNode.id ===
                  that.history[that.historyStep + 1].nodeToChangeID
                ) {
                  eachNode.text = JSON.parse(
                    JSON.stringify(
                      that.history[that.historyStep + 1].texts.undoTo
                    )
                  );
                }
              });
            }

            that.links = [...that.history[that.historyStep].links];

            restart();
          }
        }
      }

      if (!that.selectedNode && !that.selectedLink) return;

      switch (d3.event.keyCode) {
        case 9: //tab
          break;

        case 46: // delete
          if (that.selectedNode) {
            that.nodes.splice(that.nodes.indexOf(that.selectedNode), 1);
            splicelinksForNode(that.selectedNode);
          } else if (that.selectedLink) {
            that.links.splice(that.links.indexOf(that.selectedLink), 1);
          }
          that.selectedLink = null;
          that.selectedNode = null;

          restart();
          that.storeToHistory();
          break;
      }
    }

    function keyup() {
      switch (d3.event.keyCode) {
        case 9: //tab
          toggleFocus();
          break;
        case 192: // ` ~ key
          console.log(that.selectedNode);
          if (that.selectedNode) {
            console.log("~ pressed, making optionGroup pop up");
            optionGroupConnector.attr("visibility", "visible");
            // instead of pushing node, we make the circle text selection group visible
            optionGroup
              .attr("visibility", "visible")
              .attr("transform", function(d) {
                //console.log(that.selectedNode);
                return `translate(${that.selectedNode.x +
                  that.selectedNode.width +
                  100},${that.selectedNode.y})`;
              });

            /*
            optionGroupRect.attrs({
              x: that.selectedNode.x,
              y: that.selectedNode.y
            });
            optionGroupT.attrs({
              x: that.selectedNode.x + that.selectedNode.width + 100 + 75,
              y: that.selectedNode.y + that.selectedNode.height / 2 - 25
            });

            optionGroupBorder.attrs({
              x1: that.selectedNode.x + that.selectedNode.width + 100 + 57.5,
              x2: that.selectedNode.x + that.selectedNode.width + 100 + 57.5,
              y1: that.selectedNode.y + 9 + that.selectedNode.height / 2 - 25,
              y2: that.selectedNode.y + 42 + that.selectedNode.height / 2 - 25
            });

            optionGroupLink.attrs({
              x: that.selectedNode.x + that.selectedNode.width + 100,
              y: that.selectedNode.y + 9 + that.selectedNode.height / 2 - 25
            });



*/
          }
      }
    }

    function keypress() {}

    function resize() {
      svg.style("width", window.innerWidth).style("height", window.innerHeight);
    }
  }

  render() {
    const colorOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    return (
      <React.Fragment>
        <EditorNavbar />
        <div id="editorsContainer" className="">
          {this.state.showManual ? (
            <Manual toggleManual={this.toggleManual} />
          ) : null}

          <img
            style={{
              position: "absolute",
              top: "60px",
              right: "15px",
              width: "50px",
              cursor: "pointer"
            }}
            onClick={this.toggleManual}
            src={manual}
          />
          <div>
            <img
              style={{
                position: "absolute",
                top: "120px",
                right: "15px",
                width: "50px",
                cursor: "pointer"
              }}
              id="focusIcon"
              src={this.state.focus ? focused : notFocused}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
}
export default GraphEditor;
