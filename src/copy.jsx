import React, { Component } from "react";
import * as d3 from "d3";
import { select, event } from "d3-selection";
import "./GraphEditor.css";

class GraphEditor extends Component {
  constructor(props) {
    super(props);
    this.createCanvas = this.createCanvas.bind(this);
    this.selectedNode = null;
    this.selectedLink = null;
    this.circles = [
      { radius: 10, x: 20, y: 30, id: 0 },
      { radius: 10, x: 60, y: 120, id: 1 },
      { radius: 20, x: 180, y: 150, id: 2 },
      { radius: 10, x: 190, y: 120, id: 3 }
    ];
    this.links = [];
    this.texts = [{ circleId: 1, textContent: "hi", id: 0 }];
    this.textBoxProp = {
      x: 0,
      y: 0,
      visibility: "hidden",
      width: 50,
      height: 50,
      currentText: ""
    };
    this.hiddenText = null;
    this.history = [];
    this.historyStep = 0;
  }

  componentDidMount() {
    this.createCanvas();
  }

  componentDidUpdate() {
    this.removeCanvas();
    this.createCanvas();
  }

  updateCanvas() {
    this.removeCanvas();
    this.createCanvas();
  }

  manipulateHistory() {
    // manually implement when events can alter state
    /* event list:
        - circle:
          - on delete
          - on append
          - on drag end
        - text:
          - on append
          - on delete
        - textboxes:
          - on blur
        - paths:
          - on deleted
          -
*/
  }

  removeCanvas() {
    // same as selectAll("*").remove() really
    select(this.canvas)
      .selectAll("circle")
      .remove();
    select(this.canvas)
      .selectAll("text")
      .remove();
    select(this.canvas)
      .selectAll("path.link")
      .remove();
    select(this.canvas)
      .selectAll("g")
      .remove();
    select(this.canvas)
      .selectAll("defs")
      .remove();
    select(this.canvas)
      .selectAll("foreignObject")
      .remove();
  }

  createCanvas() {
    var force = d3.layout
      .force()
      .nodes(this.circles)
      .links(this.links)
      .size([250, 250])
      .linkStrength(0.1)

      .charge(-300)
      .on("tick", tick)
      .start();

    console.log("force", force);
    this.historyStep += 1;
    //console.log(this.historyStep);
    //  console.log("circles: ", this.circles, "links: ", this.links);

    const canvas = this.canvas;
    const editorMode = this.props.editorMode;
    var GraphEditor = this;

    var defs = select(canvas).append("svg:defs");

    defs
      .append("svg:marker")
      .attr("id", "end-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", "32")
      .attr("markerWidth", 3.5)
      .attr("markerHeight", 3.5)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");

    // define arrow markers for leading arrow
    defs
      .append("svg:marker")
      .attr("id", "mark-end-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 7)
      .attr("markerWidth", 3.5)
      .attr("markerHeight", 3.5)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");

    var svgG = select(canvas)
      .append("g")
      .classed("graphClass", true);

    // dragLine
    var dragLine = svgG
      .append("svg:path")

      .attr("d", "M0,0L0,0")
      .style("marker-end", "url(#mark-end-arrow)")
      .style("stroke", "black")
      .style("stroke-width", 0);

    // path  // circles attributes
    var circles = select(canvas)
      .selectAll("circle")
      .data(this.circles)
      .enter()

      .append("circle")

      .attr("r", function(d) {
        return d.radius;
      })
      .attr("cx", function(d) {
        return d.x;
      })
      .attr("cy", function(d) {
        return d.y;
      })
      .attr("fill", "pink")
      .attr("stroke", function(d) {
        if (GraphEditor.selectedNode && d.id === GraphEditor.selectedNode.id) {
          return "blue";
        } else {
          return "pink";
        }
      })
      .attr("strokeWidth", 10);

    var paths = svgG
      .selectAll("path.link")
      .data(this.links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", function(d) {
        //console.log("should be rendering somethin'");
        var sourceNodeID = d.source.id;
        var targetNodeID = d.target.id;

        var sourceNode = getCircleById(sourceNodeID);
        var targetNode = getCircleById(targetNodeID);

        var dy = targetNode.y - sourceNode.y;
        var dx = targetNode.x - sourceNode.x;
        var theta = Math.atan2(-dy, dx);
        theta += Math.PI;

        // normal : 0 to 90 degress, here: 0 to - 90

        // normal: 90 to 180: here: 90 to 0

        // normal: 180 to 270; here: 0 to -90

        // shift y by (radius / 2) * sin theta
        // shift x by (radius / 2) * cos theta

        return (
          "M" +
          sourceNode.x +
          "," +
          sourceNode.y +
          "L" +
          (targetNode.x + 30 * Math.cos(theta)) +
          "," +
          (targetNode.y - 30 * Math.sin(theta))
        );
      })
      .style("marker-end", "url(#mark-end-arrow)")
      .style("stroke", function(d) {
        if (GraphEditor.selectedLink && GraphEditor.selectedLink === d) {
          return "blue";
        } else return "black";
      })
      .style("stroke-width", 2.5);

    var texts = select(canvas)
      .selectAll("text")
      .data(this.texts)
      .enter()
      .append("text")
      .attr("x", function(d) {
        console.log("d", d);
        return getCircleById(d.circleId).x;
      })
      .attr("y", function(d) {
        return getCircleById(d.circleId).y;
      })
      .text(function(d) {
        return d.textContent;
      })
      .attr("visibility", function(d) {
        //easy way: give text visibility option and render depending on that
        if (d === GraphEditor.hiddenText) return "hidden";
        return "visible";
        //
      })
      .attr("font-family", "sans-serif")
      .attr("font-size", "10px")
      .attr("fill", "black");

    var textBox = d3
      .select(canvas)
      .append("foreignObject")
      .attr("x", this.textBoxProp.x)
      .attr("y", this.textBoxProp.y)
      .attr("height", this.textBoxProp.height)
      .attr("width", this.textBoxProp.width)
      .attr("visibility", this.textBoxProp.visibility)
      .append("xhtml:p")
      .text(this.textBoxProp.currentText)
      .attr("contentEditable", "true");

    textBox.node().focus();

    paths.on("click", function(d) {
      GraphEditor.selectedLink = d;
      GraphEditor.selectedNode = null;
      GraphEditor.updateCanvas();
    });

    //circles events
    circles

      .on("click", function(d) {
        GraphEditor.selectedNode = d;
        GraphEditor.updateCanvas();
      })
      .on("dblclick", function(d) {
        GraphEditor.selectedNode = d;
        GraphEditor.textBoxProp = {
          ...GraphEditor.textBoxProp,
          visibility: "visible",
          x: d.x - d.radius,
          y: d.y - d.radius,
          circleId: d.id,
          currentText: getTextByCircleId(d.id)
            ? getTextByCircleId(d.id).textContent
            : ""
        };

        GraphEditor.hiddenText = getTextByCircleId(d.id);
        console.log(GraphEditor.hiddenText);

        GraphEditor.updateCanvas();
      })
      .on("mouseup", function(d) {
        mouseup(select(this), d);
      })
      .on("mousedown", function(d) {
        GraphEditor.selectedNode = d;
        GraphEditor.selectedLink = null;
        //
      });

    /*      .on("drag", dragmove)
      .on("dragend", dragend);

*/
    texts
      .on("mouseover", function(d) {})
      .on("click", function(d) {
        var containerCircle = getCircleById(d.circleId);
        GraphEditor.textBoxProp = {
          ...GraphEditor.textBoxProp,
          visibility: "visible",
          x: containerCircle.x - containerCircle.radius,
          y: containerCircle.y - containerCircle.radius,
          currentText: getTextByCircleId(d.circleId)
            ? getTextByCircleId(d.circleId).textContent
            : ""
        };

        GraphEditor.hiddenText = getTextByCircleId(d.circleId);
        console.log(GraphEditor.hiddenText);

        GraphEditor.updateCanvas();
      });
    textBox
      .on("keydown", function() {
        const enterKey = 13;
        if (d3.event.keyCode === enterKey) {
          this.blur();
        }
      })
      .on("blur", function(d) {
        // go through circles to find circle with ID, if not found,
        var text = getTextByCircleId(GraphEditor.textBoxProp.circleId);
        console.log(text);
        if (text === undefined) {
          GraphEditor.texts.push({
            circleId: GraphEditor.textBoxProp.circleId,
            textContent: this.textContent,
            id: GraphEditor.texts.length
          });
        } else {
          //wonder if this is grabbing refeernce
          var text = getTextByCircleId(GraphEditor.textBoxProp.circleId);
          console.log(text, GraphEditor.textBoxProp.circleId);
          if (text) text.textContent = this.textContent;
        }

        GraphEditor.hiddenText = null;
        GraphEditor.textBoxProp.visibility = "hidden";
        GraphEditor.updateCanvas();
      });

    function tick() {}
    //circle dragging

    //global svg events

    d3.select(window).on("keydown", function() {
      const deleteKey1 = 46,
        deleteKey2 = 8;

      if (d3.event.keyCode === deleteKey1 || d3.event.keyCode === deleteKey2) {
        console.log(GraphEditor.hiddenText);
        if (GraphEditor.selectedNode && GraphEditor.hiddenText === null) {
          GraphEditor.circles = GraphEditor.circles.filter(eachCircle => {
            return eachCircle.id !== GraphEditor.selectedNode.id;
          });
          // if a link is connected to the deleted circle, delete the link
          GraphEditor.links = GraphEditor.links.filter(eachLink => {
            return (
              eachLink.source.id !== GraphEditor.selectedNode.id &&
              eachLink.target.id !== GraphEditor.selectedNode.id
            );
          });

          GraphEditor.texts = GraphEditor.texts.filter(eachText => {
            //return texts that do not have the
            return eachText.circleId !== GraphEditor.selectedNode.id;
          });
          GraphEditor.updateCanvas();
        }
        if (GraphEditor.selectedLink) {
          // if a link has the same target and source as the selected, delete
          GraphEditor.links = GraphEditor.links.filter(eachLink => {
            console.log(eachLink.source, GraphEditor.selectedLink);
            return (
              eachLink.source.id !== GraphEditor.selectedLink.source.id ||
              eachLink.target.id !== GraphEditor.selectedLink.target.id
            );
          });
          GraphEditor.updateCanvas();
        }
      }
    });

    function getCircleById(id) {
      var circles = GraphEditor.circles.filter(eachCircle => {
        return eachCircle.id === id;
      });
      // not found

      return circles[0];
    }

    function getTextByCircleId(id) {
      var texts = GraphEditor.texts.filter(eachText => {
        return eachText.circleId === id;
      });

      return texts[0];
    }

    function mouseup(d3Node, d) {
      dragLine.style("stroke-width", 0);
      if (
        editorMode === "link" &&
        GraphEditor.selectedNode &&
        GraphEditor.selectedNode !== d
      ) {
        console.log("different", GraphEditor.selectedNode, d);

        var newEdge = { source: GraphEditor.selectedNode, target: d };
        GraphEditor.links.push(newEdge);
        console.log(GraphEditor.links);
        GraphEditor.updateCanvas();
      }

      // this.props.addLinks with target and source to d and mosueDown
      // render link with d3 like d3.data().enter() and shit
    }
    function dragend(d) {
      dragLine.style("stroke-width", 0);
    }

    function dragmove(d) {
      GraphEditor.selectedNode = d;
      if (editorMode === "normal") {
        //  console.log(this, select(this));

        select(this)
          .attr("cx", d3.mouse(svgG.node())[0])
          .attr("cy", d3.mouse(svgG.node())[1]);

        // move the original x by delta x (which is w.r.t to the origin)
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        GraphEditor.updateCanvas();
      }
      if (editorMode === "link") {
        //  console.log("dragging circle", d, select(this), this);
        dragLine
          .attr(
            "d",
            "M" +
              d.x +
              "," +
              d.y +
              "L" +
              d3.mouse(svgG.node())[0] +
              "," +
              d3.mouse(svgG.node())[1]
          )
          .style("stroke-width", 2.5);
      }
    }
  }

  render() {
    return (
      <svg ref={canvas => (this.canvas = canvas)} width={500} height={500} />
    );
  }
}

export default GraphEditor;
