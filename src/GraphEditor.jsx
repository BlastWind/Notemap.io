import React, { Component } from "react";
import * as d3 from "d3";
import { select, event } from "d3-selection";
import "./GraphEditor.css";
import "d3-selection-multi";
import link from "./svgs/network.svg";
import link_purple from "./svgs/network_purple.svg";
import add from "./svgs/thin-add-button.svg";
import focus from "./svgs/crosshair.svg";
import manual from "./svgs/manual.svg";

import Manual from "./Manual.jsx";
import PageContainer from "./PageContainer.js";

import EditorNavbar from "./subComponents/EditorNavbar.jsx";

const colors = d3.scaleOrdinal(d3.schemeCategory10);
// set up svg for D3
const initialNodes = [
  {
    id: 0,
    width: 50,
    height: 40,
    text: ["here"],
    opacity: 1,
    x: 750,
    y: 200,
    fill: d3.rgb(colors(0))
  },
  {
    id: 1,
    width: 50,
    height: 40,
    text: ["start"],
    opacity: 1,
    x: 600,
    y: 200,
    fill: d3.rgb(colors(1))
  },
  {
    id: 2,
    width: 50,
    height: 40,
    text: ["hi"],
    x: 300,
    y: 200,
    fill: d3.rgb(colors(2))
  }
];
const initialLinks = [
  {
    source: initialNodes[1],
    target: initialNodes[2]
  },

  {
    source: initialNodes[2],
    target: initialNodes[0]
  }
];

class GraphEditor extends Component {
  constructor(props) {
    super(props);

    this.state = { showManual: false };

    this.nodes = initialNodes;
    this.links = initialLinks;
    this.lastNodeId = 2;

    this.selectedNode = null;
    this.selectedLink = null;
    this.mousedownLink = null;
    this.mousedownNode = null;
    this.mouseupNode = null;

    this.linkModeActivated = false;
    this.isCentering = false;

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
    console.log("stored");
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
    console.log(this.history);
  }

  componentDidMount() {
    var that = this;

    var GraphEditor = d3.select("div#editorsContainer");
    var svgContainer = GraphEditor.append("div").attr(
      "class",
      "GraphEditorContainer"
    );

    //d3.select("#addPic").on("click", addNewNode);
    d3.select("#focusPic").on("click", huh);
    d3.select("#linkPic").on("click", function() {
      var current = d3.select(this);
      if (current.attr("src") === link_purple) {
        that.linkModeActivated = false;
        current.attr("src", link);
      } else {
        current.attr("src", link_purple);
        that.linkModeActivated = true;
      }
    });

    that.force = d3
      .forceSimulation()
      .force("link", d3.forceLink().id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-5))
      //.force("x", d3.forceX())
      //.force("y", d3.forceY())

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
      .filter(function() {
        if (that.linkModeActivated) {
          svg
            .on(".zoom", null)
            .on("mousedown.zoom", null)
            .on("touchstart.zoom", null)
            .on("touchmove.zoom", null)
            .on("touchend.zoom", null);
        }

        return !that.linkModeActivated && !d3.event.ctrlKey;
      })
      .on("start", d => {
        if (!d3.event.active) that.force.alphaTarget(0.3).restart();

        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", d => {
        if (!that.linkModeActivated) {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
        } else {
          dragLine
            .classed("hidden", false)
            .style("marker-end", "url(#end-arrow)");
          dragLine.attr(
            "d",
            `M${that.mousedownNode.x + that.mousedownNode.width / 2},${that
              .mousedownNode.y +
              that.mousedownNode.height / 2}L${d3.mouse(svg.node())[0]},${
              d3.mouse(svg.node())[1]
            }`
          );
        }
      })
      .on("end", d => {
        if (that.linkModeActivated) {
          dragLine.classed("hidden", true);
        }
        if (!d3.event.active) that.force.alphaTarget(0);

        d.fx = null;
        d.fy = null;
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
      .attr("class", "rectTextGroup");
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
    restart();

    function resetMouseVars() {
      that.mousedownNode = null;
      that.mouseupNode = null;
      that.mousedownLink = null;
    }
    // update force layout (called automatically each iteration)
    function tick() {
      // draw directed edges with proper padding from node centers

      path.attr("d", d => {
        //
        var dy = d.target.y - d.source.y;
        var dx = d.target.x - d.source.x;
        var theta = Math.atan2(-dy, dx);
        theta += Math.PI;
        let angle = (theta * Math.PI) / 180;
        const shiftXBy = 0;
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

      if (textBox.attr("x")) {
        //warning, chance 25 to something else, this is calculated with 50 / 2
        textBox
          .attr("x", that.textInputCircle.x + 25)
          .attr("y", that.textInputCircle.y);
      }
    }
    // update graph (called when needed)

    function restart() {
      // path (link) group

      d3.selectAll("rect.node").remove();
      d3.selectAll("text").remove();
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
          if (d3.event.ctrlKey || that.linkModeActivated) return;

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

      var textContainers = g.append("svg:g").attr("class", "textContainer");

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
              .style("font-weight", "bold")
              .html(function(d) {
                var a = d.text[i];
                while (a.includes(" ")) {
                  a = a.replace(" ", "&nbsp;");
                }
                return a;
              });

            tspan.call(() => {
              var bboxWidth = d3
                .select(this)
                .node()
                .getBBox().width;

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
          width: d => d.width,
          height: d => d.height
        })
        .style("fill", function(d) {
          if (d === that.selectedNode) {
            return d.fill.brighter().toString();
          } else return d.fill;
        })
        .style("stroke", "black")

        .on("dblclick", function(d) {
          that.isTyping = true;
          that.selectedNode = null;
          resetMouseVars();

          svg.on(".zoom", null);

          that.startText = d.text;
          that.nodes.map(eachNode => {
            if (eachNode.id === d.id) {
              eachNode.opacity = 0;
              restart();
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
              var textArr = d.text;
              var html = textArrToHTML(textArr);

              return html;
            })
            .attr("contentEditable", "true")
            //warning: changing to window.innerWidth to prevent some dude spamming shift enter or extra long node?
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
                return eachNode.id === d.id;
              });

              //TODO: if text isn't the same or the node is brand new, store to history
              //on add new node, notNewNode is false
              //on dblclick, blur, notNewNode is true
              if (that.startText !== d.text) {
                that.nodeToChange = d;
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
                d.text = textArr;

                restart();
              }
            });

          paragraph.node().focus();
          window.setTimeout(function() {
            var val = paragraph.node().innerHTML;
            paragraph.node().innerHTML = "";
            paragraph.node().innerHTML = val;
          }, 1);

          //    restart();

          console.log(
            paragraph.node().selectionStart,
            paragraph.node().selectionEnd
          );

          //restart();
        })
        .on("mouseover", function(d) {
          if (!d3.event.ctrlKey || !that.linkModeActivated) return;
          if (!that.mousedownNode || d === that.mousedownNode) return;
          // enlarge target node
          d3.select(this).attr("transform", "scale(1.1)");
        })
        .on("mouseout", function(d) {
          if (!that.mousedownNode || d === that.mousedownNode) return;
          // unenlarge target node
          d3.select(this).attr("transform", "");
        })
        .on("mousedown", d => {
          // select node
          console.log("mouse downed");
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

          if (that.selectedNode) {
            console.log("add");
            //if there is a mousedownNode, maintain colored
            const circleDiv = document.getElementById("circleDiv");
            circleDiv.classList.add("colored");
          } else {
            console.log("remove?");
            //if there isn't, set to nothin
            //also remove colorPicker
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

          // check for drag-to-self
          that.mouseupNode = d;
          if (that.mouseupNode === that.mousedownNode) {
            resetMouseVars();
            return;
          }

          // unenlarge target node
          d3.select(this).attr("transform", "");

          // add link to graph (update if exists)
          // NB: that.links are strictly source < target; arrows separately specified by booleans
          const isRight = that.mousedownNode.id < that.mouseupNode.id;
          const source = that.mousedownNode;
          const target = that.mouseupNode;

          that.links.push({ source, target });

          that.storeToHistory();
          // select new link

          that.selectedNode = null;
          that.mousedownNode = null;

          restart();
        });

      circle = g.merge(circle);

      // set the graph in motion
      that.force
        .nodes(that.nodes)
        .force("link")
        .links(that.links)
        .distance(250);

      that.force.alphaTarget(0.3).restart();
    }

    function click() {
      //console.log(dragLine.classed("hidden"));
      if (d3.event.ctrlKey) {
        // because :active only works in WebKit?
        svg.classed("active", true);

        // insert new node at point
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
          fill: d3.rgb(colors(that.nodes.length))
        };
        that.nodes.push(node);
        //storeToHistory();
        //
        //looks like: translate(100,50) scale(0.5)

        that.previousTransform = container.attr("transform");
        that.updateEntire();

        d3.selectAll("rect")
          .filter(function(d, i, list) {
            return i === list.length - 1;
          })
          .dispatch("dblclick");
      }
    }
    function huh() {}
    function mousedown() {}
    function mousemove() {
      if (!that.mousedownNode) return;

      // update drag line
      if (d3.event.ctrlKey || that.linkModeActivated) {
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
      if (that.mousedownNode) {
        // hide drag line
        dragLine.classed("hidden", true).style("marker-end", "");
      }

      // because :active only works in WebKit?
      svg.classed("active", false);

      resetMouseVars();
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
              console.log("redoing color");

              that.nodes.map(eachNode => {
                if (
                  eachNode.id === that.history[that.historyStep].nodeToChangeID
                ) {
                  console.log(that.history[that.historyStep].fills.undoTo);

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
                  console.log(that.history[that.historyStep + 1].fills.undoTo);

                  eachNode.fill =
                    that.history[that.historyStep + 1].fills.undoTo;
                }
              });
            }

            that.links = [...that.history[that.historyStep].links];

            restart();
          }
        }

        d3.select("#linkPic").attr("src", link_purple);
      }
      //
      if (!that.selectedNode && !that.selectedLink) return;

      switch (d3.event.keyCode) {
        case 8: // backspace
        case 46: // delete
          console.log(that.selectedNode);
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
      if (d3.event.keyCode === 17 && !that.linkModeActivated) {
        d3.select("#linkPic").attr("src", link);
      }
    }

    function resize() {
      svg
        .style("width", 0.75 * window.innerWidth)
        .style("height", window.innerHeight);
    }
  }

  onTxtToNode = txt => {
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
      fill: d3.rgb(colors(this.nodes.length))
    };
    this.nodes.push(node);

    console.log(this.nodes);

    this.storeToHistory();
    this.previousTransform = d3.select("g.gContainer").attr("transform");
    this.updateEntire();
  };

  toggleManual = () => {
    console.log("toggle manual");
    this.setState({ showManual: !this.state.showManual });
  };

  setColor = () => {
    this.nodes.map(eachNode => {
      if (eachNode.id === this.selectedNode.id) {
        this.nodeToChange = eachNode;
        //console.log(d3.rgb(colors(8)));
        this.originalFill = eachNode.fill;
        eachNode.fill = d3.rgb(colors(8));
        this.newFill = d3.rgb(colors(8));
      }
    });

    if (JSON.stringify(this.originalFill) !== JSON.stringify(this.newFill)) {
      //console.log("starttext");
      console.log(this.originalFill, this.newFill);
      this.storeToHistory();
    }

    //this.storeToHistory();
    this.updateEntire();
    this.nodeToChange = null;
  };
  render() {
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
                  console.log("show little color picker tool ");

                  const colorPicker = document.getElementById("colorPicker");
                  colorPicker.classList.toggle("show");
                }
              }}
            ></div>
            <div id="colorPicker" className="colorPicker">
              <a onClick={this.setColor}>set to red</a>
              <a onClick={this.setTextStyle}>set to red</a>
            </div>
          </React.Fragment>
        </div>
      </React.Fragment>
    );
  }
}
export default GraphEditor;
