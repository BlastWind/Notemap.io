import React, { Component } from "react";
import Manual from "./Manual.jsx";
import PageContainer from "./PageContainer.js";
import EditorNavbar from "./subComponents/EditorNavbar.jsx";
import * as d3 from "d3";
import { select, event } from "d3-selection";
import "d3-selection-multi";
import "./GraphEditor.css";
import focus from "./svgs/crosshair.svg";

import manual from "./svgs/manual.svg";

const colors = d3.scaleOrdinal(d3.schemeCategory10);
// set up svg for D3
const initialTree = {
  text: ["bruh"],
  nodeWidth: 50,
  nodeHeight: 30,
  children: [
    {
      text: ["bruh2"],
      nodeWidth: 50,
      nodeHeight: 30,
      children: [
        { text: ["bruh4"], nodeWidth: 50, nodeHeight: 30, children: [] },

        { text: ["bruh5"], nodeWidth: 50, nodeHeight: 30, children: [] }
      ]
    },
    { text: ["bruh3"], nodeWidth: 50, nodeHeight: 30, children: [] }
  ]
};

class GraphEditor extends Component {
  constructor(props) {
    super(props);
    this.state = { showManual: false };
    this.tree = initialTree;
  }

  componentDidMount() {
    var that = this;

    var GraphEditor = d3.select("div#editorsContainer");
    var svgContainer = GraphEditor.append("div").attr(
      "class",
      "GraphEditorContainer"
    );

    svgContainer
      .append("img")
      .attr("class", "picture")
      .attr("height", 50)
      .attr("src", focus);

    //TODO: USE HIERARCHIAL FORCE
    let intialRoot = d3.hierarchy(initialTree);
    let initialLinks = intialRoot.links();
    let initalNodes = intialRoot.descendants();

    this.simulation = d3
      .forceSimulation()
      .force(
        "link",
        d3
          .forceLink(initialLinks)
          .id(d => d.id)
          .distance(function(d) {
            if (!d.source.parent || !d.target.parent) {
              return 200;
            }

            console.log("link data", d);
            return 300;
          })
          .strength(1)
      )
      .force("charge", d3.forceManyBody().strength(-50))
      .force("collide", d3.forceCollide(20))
      .force("x", d3.forceX())
      .force("y", d3.forceY())
      .on("tick", tick);

    const drag = d3
      .drag()
      .on("start", d => {
        if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", d => {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      })
      .on("end", d => {
        if (!d3.event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const svg = d3
      .select(".GraphEditorContainer")
      .append("svg")
      .style("width", window.innerWidth * 0.75)
      .attr("height", window.innerHeight)
      .attr("viewBox", [
        -window.innerWidth * 0.375,
        -window.innerHeight / 2,
        window.innerWidth * 0.75,
        window.innerHeight
      ])
      .style("float", "left");

    let lines = svg.append("svg:g").selectAll("path");
    let containers = svg
      .append("svg:g")
      .selectAll("g")
      .attr("class", "rectTextGroup");
    let textBox = svg
      .append("svg:g")
      .attr("class", "foreginObjectContainer")
      .append("foreignObject");

    restart();

    function tick() {
      lines.attr("d", d => {
        return `M${d.source.x + d.source.data.nodeWidth / 2},${d.source.y +
          d.source.data.nodeHeight / 2}L${d.target.x +
          d.target.data.nodeWidth / 2},${d.target.y +
          d.target.data.nodeHeight / 2}`;
      });

      let toShiftX;
      let toShiftY;
      containers.attr("transform", function(d) {
        if (d.index === that.dblclickedNodeID) {
          toShiftX = d.x;
          toShiftY = d.y;
        }

        return `translate(${d.x}, ${d.y})`;
      });

      if (toShiftX && toShiftY) {
        //console.log("we are textBOx x, shift to", that.textInputCircle);
        textBox.attr("x", toShiftX).attr("y", toShiftY);
      }
    }

    function restart() {
      console.log("restarted");
      d3.selectAll("rect.node").remove();
      d3.selectAll("text").remove();
      d3.selectAll("g.textContainer").remove();

      const newRoot = d3.hierarchy(that.tree);
      const newLinks = newRoot.links();
      let newNodes = newRoot.descendants();

      console.log(that.nodeLocation);
      console.log(newNodes);
      if (that.nodeLocation)
        for (var i = 0; i < newNodes.length; i++) {
          newNodes[i].x = that.nodeLocation[i].x;
          newNodes[i].y = that.nodeLocation[i].y;
        }

      that.simulation
        .nodes(newNodes)
        .force("link")
        .links(newLinks);

      lines = lines.data(newLinks);
      lines.exit().remove();

      let gContainers = containers.data(newNodes, d => d.index);
      gContainers.exit().remove();

      lines = lines
        .enter()
        .append("path")
        .attr("stroke-opacity", 0.6)
        .attr("stroke", "black")
        .merge(lines);

      gContainers = gContainers
        .enter()
        .append("g")
        .attr("class", "rectTextGroup")
        .merge(gContainers)
        .call(drag);

      var nodes = gContainers
        .append("rect")
        .attr("fill", "#fff")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .merge(gContainers)
        .attr("fill", function(d) {
          if (d.parent) {
            return "white";
          } else {
            return "black";
          }
          //  d.parent ? null : "#000";
        })
        .attr("stroke", d => (d.index == that.selectedNodeID ? "red" : "black"))
        .attr("width", d => d.data.nodeWidth)
        .attr("height", d => d.data.nodeHeight)

        .each(function(d) {})
        .on("click", nodeClicked)
        .on("dblclick", nodeDblClicked);

      // /var texts = containers.append("text").text(d => d.data.text);

      gContainers.append("text").text(d => "hi");

      containers = gContainers.merge(containers);

      that.simulation.alphaTarget(0.3).restart();

      function nodeClicked(d) {
        console.log(d.index);

        that.selectedNodeID = d.index === that.selectedNodeID ? null : d.index;
        that.nodeLocation = that.simulation.nodes();
        restart();
      }

      function nodeDblClicked(d) {
        that.selectedNode = null;
        that.startText = d.text;
        /*  that.nodes.map(eachNode => {
          if (eachNode.id === d.id) {
            eachNode.opacity = 0;
            restart();
          }
        }); */

        that.dblclickedNodeID = d.index;
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
            console.log("d text", d);
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
            /*
            svg.call(
              d3
                .zoom()
                .scaleExtent([0.1, 4])
                .on("zoom", function() {
                  svg
                    .select("foreginObjectContainer")
                    .attr("transform", d3.event.transform);
                })
            );
            d3.selectAll("foreignObject").remove();
            textBox = svg
              .select("foreginObjectContainer")
              .append("foreignObject");

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
          */
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

              //need to set node location
              that.nodeLocation = that.simulation.nodes();
              //need restart for changing d.width
              restart();
            }
          });

        paragraph.node().focus();
        window.setTimeout(function() {
          var val = paragraph.node().innerHTML;
          paragraph.node().innerHTML = "";
          paragraph.node().innerHTML = val;
        }, 1);
      }
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
              /*
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
              */
            </div>
          </React.Fragment>
        </div>
      </React.Fragment>
    );
  }
}
export default GraphEditor;
