import React, { Component } from "react";
import * as d3 from "d3";
import { select, event } from "d3-selection";
import "./GraphEditor.css";
import "d3-selection-multi";
import link from "./svgs/network.svg";
import link_purple from "./svgs/network_purple.svg";
import add from "./svgs/thin-add-button.svg";

// set up svg for D3
class GraphEditor extends Component {
  constructor(props) {
    super(props);

    this.nodes = [
      { id: 0, width: 50, height: 40, text: "hisadfffasfasf", opacity: 1 },
      { id: 1, width: 50, height: 40, text: "yoedsfsdasfasfasf", opacity: 1 },
      { id: 2, width: 50, height: 40, text: "yeesdasasfasfasft", opacity: 1 }
    ];
    this.lastNodeId = 2;
    this.links = [
      {
        source: this.nodes[0],
        target: this.nodes[1]
      }
    ];

    this.selectedNode = null;
    this.selectedLink = null;
    this.mousedownLink = null;
    this.mousedownNode = null;
    this.mouseupNode = null;

    this.linkModeActivated = false;
  }

  componentDidMount() {
    var that = this;
    const toolbar = d3
      .select("body")
      .append("div")
      .attr("class", "toolbar")
      .attr("width", 100)
      .attr("height", 100);

    toolbar
      .append("img")
      .attr("class", "picture")
      .attr("height", 50)
      .attr("src", link)
      .on("click", function() {
        var current = d3.select(this);
        if (current.attr("src") === link_purple) {
          that.linkModeActivated = false;
          current.attr("src", link);
        } else {
          current.attr("src", link_purple);
          that.linkModeActivated = true;
        }
      });

    toolbar
      .append("img")
      .attr("class", "picture")
      .attr("height", 50)
      .attr("src", add)
      .on("click", addNewNode);

    const colors = d3.scaleOrdinal(d3.schemeCategory10);

    const force = d3
      .forceSimulation()
      .force(
        "link",
        d3
          .forceLink()
          .id(d => d.id)
          .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-750))
      .force("x", d3.forceX(960 / 2))
      .force("y", d3.forceY(500 / 2))
      .on("tick", tick);

    const svg = d3
      .select("body")
      .append("svg")

      .attr("width", window.innerWidth)
      .attr("height", window.innerHeight);

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
    const dragLine = svg
      .append("svg:path")
      .attr("class", "link dragline hidden")
      .attr("d", "M0,0L0,0")
      .classed("hidden", true);

    const drag = d3
      .drag()
      .on("start", d => {
        if (!d3.event.active) force.alphaTarget(0.3).restart();

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
        /*
        console.log("data", d);
        var mouse = d3.mouse(svg.node());
        var elem = document.elementFromPoint(mouse[0], mouse[1]);
        console.log(elem);
        */
        if (that.linkModeActivated) {
          dragLine.classed("hidden", true);
        }
        if (!d3.event.active) force.alphaTarget(0);

        d.fx = null;
        d.fy = null;
        resetMouseVars();
      });
    // handles to link and node element groups
    let path = svg.append("svg:g").selectAll("path");
    let circle = svg.append("svg:g").selectAll("g");
    let textBox = svg.append("foreignObject");
    // app starts here

    svg
      //.on("mousedown", mousedown)
      .on("mousemove", mousemove)
      .on("mouseup", mouseup);
    d3.select(window)
      .on("keydown", keydown)
      .on("keyup", keyup);
    restart();

    function resetMouseVars() {
      that.mousedownNode = null;
      that.mouseupNode = null;
      that.mousedownLink = null;
    }
    function log(input) {
      console.log(input);
    }

    // update force layout (called automatically each iteration)
    function tick() {
      // draw directed edges with proper padding from node centers
      path.attr("d", d => {
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
        //console.log("attrs", textBox.data(), that.textInputCircle);
        textBox
          .attr("x", that.textInputCircle.x + that.textInputCircle.goodX)
          .attr("y", that.textInputCircle.y);
      } /*textBox.attr(
          "transform",
          d => `translate(${that.textInputCircle.x},${that.textInputCircle.y})`
        ); */
    }

    // update graph (called when needed)
    function restart() {
      // path (link) group

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
        .merge(g)
        .call(drag);

      g.on("mouseup", function() {
        console.log("mouse upped g");
      });

      d3.selectAll("rect").remove();
      d3.selectAll("text").remove();

      var rect = g.append("svg:rect");

      //render text's text so we have bboxWidth,

      var text = g.append("svg:text");

      text
        .text(function(d) {
          //
          return d.text;
        })
        .attr("x", function(d) {
          //(d.width + text node width) / 2
          var bboxWidth = d3
            .select(this)
            .node()
            .getBBox().width;

          d.width = bboxWidth + 50;
          that.textInputCircle = {
            ...that.textInputCircle,
            goodX: (d.width - bboxWidth) / 2
          };
          return (d.width - bboxWidth) / 2;
        })
        .attr("y", function(d) {
          return 22.5;
        })
        .attr("opacity", d => d.opacity)
        .each(function(d) {
          var bboxWidth = d3
            .select(this)
            .node()
            .getBBox().width;

          d.width = bboxWidth + 50;
        });
      /*
        if (that.needRestart === true) {
          that.needRestart = false;
          restart();
        }
  */
      rect
        .attr("class", "node")
        .attr("rx", 6)
        .attr("ry", 6)
        .attrs({
          width: d => d.width,
          height: d => d.height
        })
        .style("fill", d =>
          d === that.selectedNode
            ? d3
                .rgb(colors(d.id))
                .brighter()
                .toString()
            : colors(d.id)
        )
        .style("stroke", "black")
        .on("dblclick", function(d) {
          //bug in DOM, so
          var textInput = "";

          /*text
              .filter(function(da) {
                return da.id === d.id;
              })
              .attr("x", 100);
            restart();
  */
          that.nodes.map(eachNode => {
            if (eachNode.id === d.id) {
              eachNode.opacity = 0;
              restart();
            }
          });
          //restart();

          that.textInputCircle = d;
          // warning: please replac window.innerWidth
          textBox = textBox

            .attr("x", function(d) {
              return 10;
            })
            .attr("y", d.y)
            .attr("width", window.innerWidth)
            .attr("height", 100);
          var paragraph = textBox
            .append("xhtml:p")
            .text(d.text)
            .attr("contentEditable", "true")
            .style("outline", 0)
            .style("font", "12px sans-serif")
            .style("display", "block")
            .call(blurTexts);

          function blurTexts() {
            //select the element that has the same d the
            text.each(eachText => {});
          }

          paragraph
            .on("blur", function(d) {
              d3.selectAll("foreignObject").remove();
              textBox = svg.append("foreignObject");

              that.nodes.map(eachNode => {
                if (eachNode.id === that.textInputCircle.id) {
                  eachNode.opacity = 1;
                  restart();
                }
              });
              that.textInputCircle = null;
            })
            .on("keydown", function() {
              if (d3.event.keyCode === 13) d3.event.preventDefault();
            })
            .on("keyup", function() {
              if (d3.event.keyCode === 13) {
                console.log("this is", this);
                this.blur();
              } else {
                var textContent = this.innerText;

                if (that.textInputCircle)
                  that.nodes.map(eachNode => {
                    if (eachNode.id === that.textInputCircle.id) {
                      eachNode.text = textContent;
                    }
                  });
                restart();
              }
            });
          paragraph.node().focus();
          /*
           *
           * check make text disappear and put into textbox
           *
           *
           *
           *
           */
          //  d3.select(this).text("");
          restart();
          //console.log(that.textBoxProp);
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
          that.mousedownNode = d;
          that.selectedNode =
            that.mousedownNode === that.selectedNode
              ? null
              : that.mousedownNode;
          that.selectedLink = null;
        })
        .on("mouseup", function(d) {
          if (d3.event.defaultPrevented) {
            console.log("???");
          }
          console.log("mouse up-ed in a node!");
          if (!that.mousedownNode) return;

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

          // select new link

          that.selectedNode = null;
          that.mousedownNode = null;
          restart();
        });
      circle = g.merge(circle);

      // set the graph in motion
      force
        .nodes(that.nodes)
        .force("link")
        .links(that.links);

      force.alphaTarget(0.3).restart();
    }

    function addNewNode() {
      // because :active only works in WebKit?
      svg.classed("active", true);

      // insert new node at point
      const point = d3.mouse(this);
      const node = {
        id: ++that.lastNodeId,
        width: 150,
        height: 40,
        x: point[0],
        y: point[1]
      };
      that.nodes.push(node);

      restart();
      console.log(
        d3
          .selectAll("rect")
          .filter(function(d, i, list) {
            return i === list.length - 1;
          })
          .dispatch("dblclick")
      );
    }

    function mousemove() {
      if (!that.mousedownNode) return;
      console.log(that.linkModeActivated);
      // update drag line
      if (d3.event.ctrlKey || that.linkModeActivated) {
        dragLine
          .classed("hidden", false)
          .style("marker-end", "url(#end-arrow)");

        dragLine.attr(
          "d",
          `M${that.mousedownNode.x + that.mousedownNode.width / 2},${that
            .mousedownNode.y +
            that.mousedownNode.height / 2}L${d3.mouse(this)[0]},${
            d3.mouse(this)[1]
          }`
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

    // only respond once per keydown
    let lastKeyDown = -1;

    function keydown() {
      if (lastKeyDown !== -1) return;
      lastKeyDown = d3.event.keyCode;

      if (!that.selectedNode && !that.selectedLink) return;

      switch (d3.event.keyCode) {
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
          break;
        case 66: // Bf
          if (that.selectedLink) {
            // set link direction to both left and right
            that.selectedLink.left = true;
            that.selectedLink.right = true;
          }
          restart();
          break;
        case 76: // L
          if (that.selectedLink) {
            // set link direction to left only
            that.selectedLink.left = true;
            that.selectedLink.right = false;
          }
          restart();
          break;
        case 82: // R
          if (that.selectedNode) {
            // toggle node reflexivity
            that.selectedNode.reflexive = !that.selectedNode.reflexive;
          } else if (that.selectedLink) {
            // set link direction to right only
            that.selectedLink.left = false;
            that.selectedLink.right = true;
          }
          restart();
          break;
      }
    }

    function keyup() {
      lastKeyDown = -1;

      // ctrl
      if (d3.event.keyCode === 17) {
        svg.classed("ctrl", false);
      }
    }
  }

  render() {
    return <div></div>;
  }
}
export default GraphEditor;
