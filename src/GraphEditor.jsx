import React, { Component } from "react";
import Manual from "./Manual.jsx";
import PageContainer from "./PageContainer.js";
import EditorNavbar from "./subComponents/EditorNavbar.jsx";
import * as d3 from "d3";
import { select, event } from "d3-selection";
import "d3-selection-multi";
import "./GraphEditor.css";

import manual from "./svgs/manual.svg";

const colors = d3.scaleOrdinal(d3.schemeCategory10);
// set up svg for D3

const initialTree = {
  id: 0,
  text: ["bruh"],
  nodeWidth: 50,
  nodeHeight: 30,
  style: "bold",
  fill: d3.rgb(colors(0)),
  opacity: 1,
  children: [
    {
      id: 1,
      text: ["bruh2"],
      nodeWidth: 50,
      nodeHeight: 30,
      style: "bold",
      fill: d3.rgb(colors(0)),
      opacity: 1,
      children: [
        {
          id: 2,
          text: ["bruh4"],
          nodeWidth: 50,
          nodeHeight: 30,
          style: "bold",
          fill: d3.rgb(colors(0)),
          opacity: 1,
          children: []
        },

        {
          id: 3,
          text: ["bruh5"],
          nodeWidth: 50,
          nodeHeight: 30,
          style: "bold",
          fill: d3.rgb(colors(0)),
          opacity: 1,
          children: []
        }
      ]
    },
    {
      id: 4,
      text: ["bruh3"],
      nodeWidth: 50,
      nodeHeight: 30,
      style: "bold",
      fill: d3.rgb(colors(0)),
      opacity: 1,
      children: []
    }
  ]
};

class GraphEditor extends Component {
  constructor(props) {
    super(props);
    this.tree = initialTree;
    this.state = { showManual: false };

    this.selectedNode = null;
    this.selectedLink = null;
    this.mousedownLink = null;
    this.mousedownNode = null;
    this.mouseupNode = null;

    this.force = null;
    this.startText = null;
    this.originalFill = null;
    this.newFill = null;

    this.history = [initialTree];
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
      },
      fills: {
        undoTo: this.originalFill,
        redoTo: this.newFill ? this.newFill : null
      }
    };
    this.history = this.history.concat([newStep]);

    this.historyStep += 1;
  }

  componentDidMount() {
    var that = this;

    var GraphEditor = d3.select("div#editorsContainer");
    var svgContainer = GraphEditor.append("div").attr(
      "class",
      "GraphEditorContainer"
    );

    let intialRoot = d3.hierarchy(initialTree);
    let initialLinks = intialRoot.links();
    let initalNodes = intialRoot.descendants();

    that.force = d3
      .forceSimulation()
      .force(
        "link",
        d3
          .forceLink(initialLinks)
          .id(d => d.id)
          .distance(function(d) {
            console.log(d);
            return 250;
          })
      )
      .force("charge", d3.forceManyBody().strength(-250))
      .force("x", d3.forceX())
      .force("y", d3.forceY())

      .on("tick", tick);

    const svg = d3
      .select(".GraphEditorContainer")
      .append("svg")

      .style("width", window.innerWidth * 0.75)
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
      .on("keydown", keydown)
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
    let circle = container
      .append("svg:g")
      .selectAll("g")
      .attr("class", "rectTextGroup")
      .on("mousedown", function(d) {});
    let textBox = container.append("foreignObject");
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

    //.attr("transform", that.previousTransform);

    d3.select(window)
      .on("keydown", keydown)
      .on("keyup", keyup)
      .on("resize", resize);
    restartCall();

    function resetMouseVars() {
      that.mousedownNode = null;
      //that.mouseupNode = null;
      that.mousedownLink = null;
    }

    function restartCall() {
      console.log(that.force.nodes());
      that.nodeLocation = that.force.nodes();
      restart();
    }
    // update force layout (called automatically each iteration)
    function tick() {
      // draw directed edges with proper padding from node centers
      //console.log("textINputCircle", that.textInputCircle);

      path.attr("d", d => {
        return `M${d.source.x + d.source.data.nodeWidth / 2},${d.source.y +
          d.source.data.nodeHeight / 2}L${d.target.x +
          d.target.data.nodeWidth / 2},${d.target.y +
          d.target.data.nodeHeight / 2}`;
      });

      circle.attr("transform", d => {
        if (that.textInputCircle) {
          if (d.data.id === that.textInputCircle.data.id) {
            console.log("d", d, "textinputcircle", that.textInputCircle);
            that.textInputCircle.x = d.x;
            that.textInputCircle.y = d.y;
          }
        }
        return `translate(${d.x},${d.y})`;
      });

      if (textBox.attr("x")) {
        console.log("textInputCircle", that.textINputCircle);
        //warning, chance 25 to something else, this is calculated with 50 / 2
        textBox
          .attr("x", that.textInputCircle.x + 25)
          .attr("y", that.textInputCircle.y);
      }
    }
    // update graph (called when needed)

    function restart() {
      console.log(that.tree);
      // path (link) group

      d3.selectAll("rect.node").remove();
      d3.selectAll("text").remove();
      d3.selectAll("g.textContainer").remove();

      const newRoot = d3.hierarchy(that.tree);
      const newLinks = newRoot.links();
      let newNodes = newRoot.descendants();

      console.log(that.nodeLocation, newNodes);
      if (that.nodeLocation.length !== 0)
        for (var i = 0; i < that.nodeLocation.length; i++) {
          newNodes.map(eachNode => {
            if (eachNode.data.id === that.nodeLocation[i].data.id) {
              eachNode.x = that.nodeLocation[i].x;
              eachNode.y = that.nodeLocation[i].y;
            }
          });
        }

      that.force
        .nodes(newNodes)
        .force("link")
        .links(newLinks);
      //

      console.log("new nodes", newNodes);

      //JOIN DATA
      path = path.data(newLinks);

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
          restartCall();
        })
        .merge(path);

      // bind data
      // svg => g => g => {circle, text}
      let g = circle.data(newNodes, d => d.id);
      g.exit().remove();
      g = g
        .enter()
        .append("svg:g")
        .attr("class", "rectTextGroup")
        .merge(g)
        .call(drag);

      g.on("mouseup", function() {});

      var rect = g.append("svg:rect");

      var textContainers = g
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

          rect.style("fill", function(d) {
            if (d === that.selectedNode) {
              return "white";
              return d.data.fill.brighter().toString();
            } else {
              return "white";
              return d.data.fill;
            }
          });

          if (that.selectedNode) {
            const circleDiv = document.getElementById("circleDiv");
            circleDiv.classList.add("colored");
          } else {
            const circleDiv = document.getElementById("circleDiv");
            circleDiv.classList.remove("colored");
            document.getElementById("colorPicker").classList.remove("show");
          }
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

          that.links.push({ source, target });

          that.storeToHistory();

          that.selectedNode = null;
          that.mousedownNode = null;
          console.log("mouseup node in mouseup()", that.mouseupNode);

          restartCall();
        });

      textContainers

        .attr("opacity", d => d.data.opacity)
        //.attr("text-anchor", "middle")

        .attr("dy", function(d) {
          var nwords = d.data.text.length;
          return "-" + (nwords - 1) * 12;
        })
        .each(function(d, ind) {
          //after appending the tspan elements
          //we get access to widthArray
          var nwords = d.data.text.length;
          for (var i = 0; i < nwords; i++) {
            var rectAndTextPair = d3.select(this).append("g");
            if (
              d.data.style.includes("highlight") &&
              d.data.text[i].trim().length !== 0
            ) {
              rectAndTextPair.append("rect").attrs({
                width: 10,
                height: 15.5,
                y: i * 15 - 12,
                fill: "yellow"
              });
            }
            var tspan = rectAndTextPair
              .append("text")
              .style("font-style", function(d) {
                if (d.data.style.includes("italic")) return "italic";
              })
              .style("font-weight", function(d) {
                if (d.data.style.includes("bold")) return "bold";
              })
              .html(function(d) {
                var a = d.data.text[i];
                while (a.includes(" ")) {
                  a = a.replace(" ", "&nbsp;");
                }
                return a;
              });

            tspan.call(eachTspan => {
              //maybe there is a index, select the rect in the parent container
              var highlightRect = d3
                .select(eachTspan.node().parentNode)
                .select("rect");

              var bboxWidth = d3
                .select(this)
                .node()
                .getBBox().width;
              if (highlightRect) {
                highlightRect.attr("width", bboxWidth);
              }
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
          d.data.nodeWidth = Math.max(...widthArray) + 50;

          d.data.nodeHeight = d.data.text.length * eachTextHeight + 25;

          //
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
          var toShiftY = (d.data.nodeHeight - bboxHeight) / 2 + 12.5;
          return "translate(" + toShiftX + "px, " + toShiftY + "px)";
        });

      rect
        .attr("class", "node")
        .attr("rx", 6)
        .attr("ry", 6)
        .attrs({
          width: d => d.data.nodeWidth,
          height: d => d.data.nodeHeight
        })
        .style("fill", function(d) {
          return "white";
          if (d === that.selectedNode) {
            return d.data.fill.brighter().toString();
          } else return d.data.fill;
        })
        .style("stroke", "black")
        .on("dblclick", function(d) {
          const circleDiv = document.getElementById("circleDiv");
          circleDiv.classList.remove("colored");
          document.getElementById("colorPicker").classList.remove("show");
          that.isTyping = true;
          that.selectedNode = null;
          resetMouseVars();

          svg.on(".zoom", null);

          that.startText = d.data.text;
          that.force.nodes().map(eachNode => {
            console.log("eachnode", eachNode, "d", d);
            if (eachNode.data.id === d.data.id) {
              console.log(
                "muted id",
                eachNode.data.id,
                " text: ",
                eachNode.data.text
              );
              eachNode.data.opacity = 0;
              restartCall();
            }
          });
          that.textInputCircle = d;
          // warning: please replac window.innerWidth
          textBox = textBox
            .attr("x", function(d) {
              return 10;
            })
            .attr("y", d.y)
            .attr("width", window.innerWidth / 2)
            .attr("height", window.innerHeight);
          var paragraph = textBox
            .append("xhtml:p")
            .html(function() {
              function textArrToHTML(textArr) {
                //["hi my name is", "andrew chen"] to <p>hi my name is<br>andrew chen</p>
                var initialHTML = "<p>";
                for (var i = 0; i < textArr.length; i++) {
                  if (textArr[i] === "") {
                    initialHTML += "<br>";
                  } else initialHTML += textArr[i];

                  if (i !== textArr.length - 1 && textArr[i] !== "") {
                    initialHTML += "<br>";
                  }
                }
                return initialHTML + "</p>";
              }
              var textArr = d.data.text;
              var html = textArrToHTML(textArr);

              return html;
            })
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

              that.force.nodes().map(eachNode => {
                if (eachNode.data.id === that.textInputCircle.data.id) {
                  eachNode.data.opacity = 1;
                  restartCall();
                }
              });

              /*
              var oldNodes = that.history[that.historyStep].nodes;

              var matchedNode = oldNodes.filter(eachNode => {
                return eachNode.id === d.id;
              });
*/

              //TODO: if text isn't the same or the node is brand new, store to history
              //on add new node, notNewNode is false
              //on dblclick, blur, notNewNode is true
              if (that.startText !== d.data.text) {
                that.nodeToChange = d;
                //console.log("starttext");
                //that.storeToHistory();
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
                // note, d.data.text is referring to the d in dblclick, d in g, d in text, from that.nodes
                var nodeHTML = d3.select(this).node().innerHTML;

                nodeHTML = nodeHTML.slice(3, nodeHTML.length - 4);

                if (
                  nodeHTML.substring(nodeHTML.length - 4, nodeHTML.length) ===
                  "<br>"
                ) {
                  nodeHTML = nodeHTML.slice(0, nodeHTML.length - 4);
                }

                var textArr = nodeHTML.split("<br>");
                d.data.text = textArr;

                restartCall();
              }
            });

          paragraph.node().focus();
          window.setTimeout(function() {
            var val = paragraph.node().innerHTML;
            paragraph.node().innerHTML = "";
            paragraph.node().innerHTML = val;
          }, 1);
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
          // select node
          that.mousedownNode = d;
          that.selectedNode =
            that.mousedownNode === that.selectedNode
              ? null
              : that.mousedownNode;
          that.selectedLink = null;

          rect.style("fill", function(d) {
            if (d === that.selectedNode) {
              return d.data.fill.brighter().toString();
            } else {
              return d.data.fill;
            }
          });

          if (that.selectedNode) {
            const circleDiv = document.getElementById("circleDiv");
            circleDiv.classList.add("colored");
          } else {
            const circleDiv = document.getElementById("circleDiv");
            circleDiv.classList.remove("colored");
            document.getElementById("colorPicker").classList.remove("show");
          }
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

          that.links.push({ source, target });

          that.storeToHistory();

          that.selectedNode = null;
          that.mousedownNode = null;
          console.log("mouseup node in mouseup()", that.mouseupNode);

          restartCall();
        });

      circle = g.merge(circle);

      // set the graph in motion

      that.force.alphaTarget(0.3).restart();
    }

    //sensing svg click
    function click() {
      if (d3.event.ctrlKey && !that.mousedownNode) {
        console.log(that.isDragging);

        svg.classed("active", true);

        var point = d3.mouse(this);

        var transform = d3.zoomTransform(container.node());
        point = transform.invert(point);

        const node = {
          id: that.nodes.length,
          width: 150,
          height: 40,
          x: point[0],
          y: point[1],
          text: [""],
          fill: d3.rgb(colors(that.nodes.length)),
          style: ""
        };
        that.nodes.push(node);

        that.previousTransform = container.attr("transform");
        that.updateEntire();

        d3.selectAll("rect")
          .filter(function(d, i, list) {
            return i === list.length - 1;
          })
          .dispatch("dblclick");
      }
      resetMouseVars();
    }
    function huh() {}
    function mousedown() {}
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

            if (
              that.history[that.historyStep].nodeToChangeID !== -1 &&
              that.history[that.historyStep].fills.redoTo
            ) {
              that.nodes.map(eachNode => {
                if (
                  eachNode.id === that.history[that.historyStep].nodeToChangeID
                ) {
                  eachNode.fill = that.history[that.historyStep].fills.redoTo;
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

            if (
              that.history[that.historyStep + 1].nodeToChangeID !== -1 &&
              that.history[that.historyStep + 1].fills.undoTo
            ) {
              that.nodes.map(eachNode => {
                if (
                  eachNode.id ===
                  that.history[that.historyStep + 1].nodeToChangeID
                ) {
                  eachNode.fill =
                    that.history[that.historyStep + 1].fills.undoTo;
                }
              });
            }

            that.links = [...that.history[that.historyStep].links];

            restart();
          }
        }
      }
      //
      if (!that.selectedNode && !that.selectedLink) return;

      switch (d3.event.keyCode) {
        case 9:
          if (that.selectedNode) {
            //get reference to the node,
            //pappend newNode to thatNode.children
            const newNode = {
              text: ["bruh"],
              nodeWidth: 50,
              nodeHeight: 30,
              style: "bold",
              fill: d3.rgb(colors(0)),
              opacity: 1,
              children: []
            };
            function findAndUpdate(targetObj, id) {
              if (targetObj.id === id) {
                if (targetObj.children) {
                  targetObj.children.push(newNode);
                } else {
                  targetObj.children = [];
                  targetObj.children.push(newNode);
                }
                return;
              } else {
                if (targetObj.children)
                  targetObj.children.forEach(eachNode => {
                    findAndUpdate(eachNode, id);
                  });
              }
            }
            console.log(that.tree);
            findAndUpdate(that.tree, that.selectedNode.data.id);
            restartCall();
          }
          break;
        case 8: // backspace
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
      //lastKeyDown = -1;

      // ctrl
      if (d3.event.keyCode === 17) {
        //d3.select("#linkPic").attr("src", link);
      }
    }

    function resize() {
      svg
        .style("width", 0.75 * window.innerWidth)
        .style("height", window.innerHeight);
    }
  }

  onTxtToNode = (txt, style) => {
    var point = [
      d3
        .select("svg")
        .style("width")
        .replace("px", "") / 2,

      d3
        .select("svg")
        .style("height")
        .replace("px", "") / 2
    ];

    var transform = d3.zoomTransform(d3.select("g.gContainer").node());

    point = transform.invert(point);

    const node = {
      id: this.nodes.length,
      width: 150,
      height: 40,
      text: txt.split("\n"),
      x: point[0],
      y: point[1],
      fill: d3.rgb(colors(this.nodes.length)),
      style: style
    };
    this.nodes.push(node);

    this.storeToHistory();
    this.previousTransform = d3.select("g.gContainer").attr("transform");
    this.updateEntire();
  };

  toggleManual = () => {
    this.setState({ showManual: !this.state.showManual });
  };

  setColor = eachColor => {
    var point = [
      d3
        .select("svg")
        .style("width")
        .replace("px", "") / 2,

      d3
        .select("svg")
        .style("height")
        .replace("px", "") / 2
    ];

    var transform = d3.zoomTransform(d3.select("g.gContainer").node());

    point = transform.invert(point);
    this.nodes.map(eachNode => {
      if (eachNode.id === this.selectedNode.id) {
        this.nodeToChange = eachNode;
        console.log(d3.rgb(colors(0)));
        //console.log(d3.rgb(colors(8)));
        this.originalFill = eachNode.fill;
        eachNode.fill = d3.rgb(colors(eachColor));
        this.newFill = d3.rgb(colors(eachColor));
      }
    });

    if (JSON.stringify(this.originalFill) !== JSON.stringify(this.newFill)) {
      //console.log("starttext");
      this.storeToHistory();
    }
    this.previousTransform = d3.select("g.gContainer").attr("transform");

    //this.storeToHistory();
    this.updateEntire();

    this.nodeToChange = null;
  };

  setStyle = style => {
    var point = [
      d3
        .select("svg")
        .style("width")
        .replace("px", "") / 2,

      d3
        .select("svg")
        .style("height")
        .replace("px", "") / 2
    ];

    var transform = d3.zoomTransform(d3.select("g.gContainer").node());

    point = transform.invert(point);
    this.nodes.map(eachNode => {
      if (eachNode.id === this.selectedNode.id) {
        if (eachNode.style.includes(style)) {
          eachNode.style = eachNode.style.replace(style, "");
        } else {
          eachNode.style += style;
        }
      }
    });
    this.previousTransform = d3.select("g.gContainer").attr("transform");
    this.updateEntire();
  };
  render() {
    const colorOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    return (
      <React.Fragment>
        <EditorNavbar />
        <div id="editorsContainer" className="">
          {this.state.showManual ? (
            <Manual toggleManual={this.toggleManual} />
          ) : null}
          <PageContainer onTxtToNode={this.onTxtToNode} />
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
          <React.Fragment>
            <div
              id="circleDiv"
              className="circleDiv"
              onClick={() => {
                const circleDiv = document.getElementById("circleDiv");
                if (circleDiv.className.includes("colored")) {
                  const colorPicker = document.getElementById("colorPicker");
                  colorPicker.classList.toggle("show");
                }
              }}
            ></div>
            <div id="colorPicker" className="colorPicker">
              {colorOptions.map(eachColor => {
                return (
                  <div
                    style={{
                      width: "30px",
                      height: "15px",
                      background: d3.rgb(colors(eachColor)),
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      this.setColor(eachColor);
                    }}
                  ></div>
                );
              })}
              <a
                onClick={() => {
                  this.setStyle("bold");
                }}
              >
                BOLD
              </a>
              <br />
              <a
                onClick={() => {
                  this.setStyle("highlight");
                }}
              >
                HIGHLIGHT
              </a>
              <br />
              <a
                onClick={() => {
                  this.setStyle("italic");
                }}
              >
                ITALIC
              </a>
            </div>
          </React.Fragment>
        </div>
      </React.Fragment>
    );
  }
}
export default GraphEditor;
