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
    this.originalFill = null;
    this.newFill = null;

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
    let circle = container
      .append("svg:g")
      .selectAll("g")
      .attr("class", "rectTextGroup")
      .on("mousedown", function(d) {});
    let textBox = container.append("foreignObject");
    let optionGroup = container.append("g").attrs({ x: 60, y: 60 });

    optionGroup.append("circle").attrs({ r: 15, fill: "red" });

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

      circle.attr("transform", d => {
        if (that.textInputCircle)
          if (d.id === that.textInputCircle.id) {
            that.textInputCircle.x = d.x;
            that.textInputCircle.y = d.y;
          }

        return `translate(${d.x},${d.y})`;
      });

      if (textBox.attr("x"))
        //if x exists, textBox is visible, change positions
        textBox
          .attr("x", that.textInputCircle.x + 25)
          .attr("y", that.textInputCircle.y);
    }
    // update graph (called when needed)

    function restart() {
      d3.selectAll("rect").remove();
      d3.selectAll("text").remove();
      d3.selectAll("g.textContainer").remove();
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

      // bind data
      // svg => g => g => {circle, text}
      let g = circle.data(that.nodes, d => d.id);
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

          console.log("selectedNode", that.selectedNode);
          that.selectedLink = null;

          rect.style("fill", function(d) {
            if (d === that.selectedNode) {
              return d.fill.brighter().toString();
            } else {
              return d.fill;
            }
          });

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
            if (
              d.style.includes("highlight") &&
              d.text[i].trim().length !== 0
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
                if (d.style.includes("italic")) return "italic";
              })
              .style("font-weight", function(d) {
                if (d.style.includes("bold")) return "bold";
              })
              .html(function(d) {
                var a = d.text[i];
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

              that.textInputCircle = {
                ...that.textInputCircle,
                goodX: (d.width - bboxWidth) / 2
              };
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
          var toShiftY = (d.height - bboxHeight) / 2 + 12.5;
          return "translate(" + toShiftX + "px, " + toShiftY + "px)";
        });

      rect
        .attr("class", "node")
        .attr("rx", 6)
        .attr("ry", 6)
        .attrs({
          class: "node",
          rx: 6,
          ry: 6,
          width: d => d.width,
          height: d => d.height
        })
        .style("fill", function(d) {
          if (that.selectedNode && d.id === that.selectedNode.id) {
            return d.fill.brighter().toString();
          } else return d.fill;
        })
        .style("stroke", "black")
        .on("dblclick", function(rectData) {
          resetMouseVars();
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
          // select node
          that.mousedownNode = d;
          that.selectedNode =
            that.mousedownNode === that.selectedNode
              ? null
              : that.mousedownNode;
          that.selectedLink = null;

          rect.style("fill", function(d) {
            if (d === that.selectedNode) {
              return d.fill.brighter().toString();
            } else {
              return d.fill;
            }
          });

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

      circle = g.merge(circle);

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
      if (d3.event.ctrlKey && !that.mousedownNode) {
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

        restart();

        var toDispatch = d3.selectAll("rect").filter(function(d, i, list) {
          return i === list.length - 1;
        });
        toDispatch.dispatch("dblclick");
      }
    }

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
          if (that.selectedNode) {
            const node = {
              id: that.nodes.length,
              width: 150,
              height: 40,
              text: [""],
              x: that.selectedNode.x + that.selectedNode.width + 100,
              y: that.selectedNode.y,
              fill: d3.rgb(colors(that.nodes.length)),
              style: "bold"
            };

            // instead of pushing node, we make the circle text selection group

            that.nodes.push(node);
            const source = that.selectedNode;
            const target = node;
            restart();

            that.links.push({
              source: source,
              target: target,
              linkDistance: 250,
              index: that.links.length
            });

            var toDispatch = d3.selectAll("rect").filter(function(d, i, list) {
              return i === list.length - 1;
            });

            toDispatch.dispatch("dblclick");
            that.selectedNode = that.nodes[that.nodes.length - 1];
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