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
import purpleLink from "./svgs/purpleLink.svg";
import link from "./svgs/link.svg";
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
import {
  getInitialSVG,
  setSVGDefs,
  setSVGEvents,
  getInitialDrag,
  getInitialForce,
  setDefsGradient
} from "./helperFunctions/setUp.js";

import {
  nodeMouseDown,
  nodeMouseUp,
  textNodeClick,
  textNodeDblClick,
  circleNodeClick
} from "./helperFunctions/mouseFunctions.js";

import {
  windowClick,
  windowMouseUp,
  windowMouseDown,
  windowMouseMove,
  keyup,
  keydown,
  keypress,
  resize
} from "./helperFunctions/windowMouseFunctions.js";
import {
  invertOptionGroupVisibility,
  isOptionGroupFormVisible,
  stretchCloseOptionGroupForm,
  stretchOutOptionGroupForm,
  isTransitionCircleShowing,
  closeForm,
  closeNode
} from "./helperFunctions/transitionFormFunctions.js";
import { updateStroke } from "./helperFunctions/updateFunctions.js";

import {
  setOptionGroupLinkMouseEvents,
  setOptionGroupTextMouseEvents
} from "./helperFunctions/optionGroupClicks.js";
import "./styles/RmapCreatorToolBar.scss";
import PreviewCard from "./RoadmapediaSubComponents/PreviewCard.jsx";
import ColorCard from "./RoadmapediaSubComponents/ColorCard.jsx";

const initialNodes = [
  {
    type: "text",
    id: 0,
    width: 150,
    height: 60,
    text: [""],
    x: 100,
    y: 300,
    backgroundColor: "white",
    strokeColor: "black",
    groupID: null,
    textSize: 12,
    textFont: "sans-serif"
  },
  {
    type: "circle",
    id: 1,
    width: 150,
    height: 40,
    text: [""],
    x: 300,
    y: 200,
    storedInfo: {
      url: null,
      info: null,
      picture: null,
      title: null
    },
    backgroundColor: "white",
    strokeColor: "black",
    groupID: null
  },
  {
    type: "circle",
    id: 2,
    width: 150,
    height: 40,
    text: [""],
    x: 300,
    y: 200,
    storedInfo: {
      url: null,
      info: null,
      picture: null,
      title: null
    },
    backgroundColor: "white",
    strokeColor: "black",
    groupID: null
  }
];

const initialLinks = [
  { source: initialNodes[0], target: initialNodes[1], linkDistance: 250 }
];

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

    // mouse logic variables
    this.selectedNode = null;
    this.selectedLink = null;
    this.mousedownLink = null;
    this.mousedownNode = null;
    this.mouseupNode = null;

    // DOM selection global variables
    this.svg = null;
    this.container = null;
    this.dragLine = null;
    this.path = null;
    this.rectGroups = null;
    this.circleGroups = null;
    this.texts = null;
    this.textBox = null;
    this.resourceForm = null;
    this.optionGroup = null;
    this.optionGroupG = null;
    this.optionGroupConnector = null;
    this.force = null;
    this.drag = null;

    // DOM Transition Nodes
    this.transitionGs = null;
    this.transitionGsEnter = null;

    // conditional handling variabels
    this.startText = null;
    this.previousTransform = null;
    this.isDragging = false;
    this.isTyping = false;
    this.shouldTransitionGsAnimate = true;
    this.animationAlreadyCompleted = false;
    this.shouldTransitionGsEnterAnimation = true;

    //history
    this.history = [
      {
        nodes: JSON.stringify([...initialNodes]),
        links: JSON.stringify([...initialLinks])
      }
    ];
    this.historyStep = 0;
  }

  storeToHistory(command) {
    this.history = this.history.slice(0, this.historyStep + 1);
    this.history = this.history.concat([command]);
    this.historyStep += 1;
    console.log(this.history);
  }

  undo() {
    if (this.historyStep !== 0) {
      console.log(this.history[this.historyStep]);
      var inverseCommand = this.history[this.historyStep].inverse;
      switch (inverseCommand.type) {
        case "delNode":
          if (this.selectedNode.id === inverseCommand.node.id) {
            this.selectedNode = null;
            this.forceUpdate();
          }
          this.nodes = this.nodes.filter(n => n.id !== inverseCommand.node.id);
          break;

        case "delLink":
          this.links = this.links.filter(
            l => l.index !== inverseCommand.link.index
          );

          break;

        case "addLink":
          this.links.push({
            source: inverseCommand.link.source,
            target: inverseCommand.link.target,
            linkDistance: inverseCommand.link.linkDistance,
            index: inverseCommand.link.index
          });

          break;

        case "delNodeLink":
          this.nodes = this.nodes.filter(n => n.id !== inverseCommand.node.id);
          this.links = this.links.filter(l => {
            return inverseCommand.links.indexOf(l) < 0;
          });

          break;

        case "addNodeLink":
          this.nodes.push(inverseCommand.node);

          inverseCommand.links.map(eachLink => {
            this.links.push({
              source: eachLink.source,
              target: eachLink.target,
              linkDistance: eachLink.linkDistance,
              index: eachLink.index
            });
          });

          break;

        case "modifyText":
          this.nodes.map(n => {
            if (n.id === inverseCommand.node.id) {
              n.text = inverseCommand.text;
            }
          });

          break;

        case "modifyResourceNode":
          this.nodes.map(n => {
            if (n.id === inverseCommand.node.id) {
              n.description = inverseCommand.description;
              n.storedInfo.url = inverseCommand.storedInfo.url;
            }
          });

          break;
      }
      this.historyStep -= 1;
    }
    this.restart();
  }

  redo() {
    if (this.historyStep !== this.history.length - 1) {
      this.historyStep += 1;
      var actionCommand = this.history[this.historyStep].action;
      switch (actionCommand.type) {
        case "addNode":
          this.nodes.push(actionCommand.node);
          break;
        case "addLink":
          this.links.push({
            source: actionCommand.link.source,
            target: actionCommand.link.target,
            linkDistance: actionCommand.link.linkDistance,
            index: actionCommand.link.index
          });
          break;
        case "delLink":
          this.links = this.links.filter(
            l => l.index !== actionCommand.link.index
          );
          break;

        case "addNodeLink":
          this.nodes.push(actionCommand.node);

          actionCommand.links.map(eachLink => {
            this.links.push({
              source: eachLink.source,
              target: eachLink.target,
              linkDistance: eachLink.linkDistance,
              index: eachLink.index
            });
          });
          break;
        case "delNodeLink":
          this.nodes = this.nodes.filter(n => n.id !== actionCommand.node.id);
          this.nodes = this.links.filter(l => {
            return actionCommand.links.indexOf(l) < 0;
          });

          break;

        case "modifyText":
          this.nodes.map(n => {
            if (n.id === actionCommand.node.id) {
              n.text = actionCommand.text;
            }
          });

          break;

        case "modifyResourceNode":
          this.nodes.map(n => {
            if (n.id === actionCommand.node.id) {
              n.description = actionCommand.description;
              n.storedInfo.url = actionCommand.storedInfo.url;
            }
          });

          break;
      }

      this.restart();
    }
  }

  setError(error, waitTime) {
    var app = this;
    this.setState(
      {
        errMsg: error
      },
      function() {
        if (app.isErroring) {
          d3.select(".errMsginner").interrupt();
          d3.select(".errMsginner").style("opacity", 1);
        }
        setTimeout(function() {
          d3.select(".errMsginner")
            .style("opacity", 1)
            .transition()
            .duration(1000)
            .style("opacity", 0)
            .on("start", () => {
              app.isErroring = true;
            })
            .on("end", function() {
              app.setState({ errMsg: "" });
              app.isErroring = false;
            });
          //  app.setState({ errMsg: "" });
        }, waitTime);
      }
    );
  }

  componentDidMount() {
    var app = this;

    // set up SVG & Defs
    this.svg = getInitialSVG();
    setSVGDefs(this.svg);
    setSVGEvents(this.svg, app);
    var defs = this.svg.append("defs");
    setDefsGradient(defs);

    // set up container, DOM groups empty selection,
    this.container = this.svg
      .append("svg:g")
      .attr("class", "gContainer")
      .attrs({
        transform: this.previousTransform ? this.previousTransform : null
      });
    // set up dragLine
    this.dragLine = this.container
      .append("svg:path")
      .attr("class", "link dragline hidden")
      .attr("d", "M0,0L0,0")
      .classed("hidden", true);

    this.path = this.container.append("svg:g").selectAll("path");
    this.rectGroups = this.container.append("svg:g").selectAll("g.nodeGroup");
    this.texts = this.container.append("svg:g").selectAll("g");
    this.circleGroups = this.container.append("svg:g").selectAll("g");

    this.textBox = this.container.append("foreignObject");
    this.resourceForm = this.container
      .append("foreignObject")
      .attr("class", "resourceForm");
    this.optionGroup = this.container
      .append("g")
      .attr("opacity", 0)
      .attr("visibility", "hidden");

    this.optionGroupG = this.optionGroup
      .append("g")
      .attr("transform", getTranslateString(0, 0));

    this.optionG = this.container.append("g").attr("class", "optionG");

    this.optionGroupConnector = this.optionGroup
      .append("rect")
      .attrs({ height: 3, width: 0, x: -10, y: 25, stroke: "black" });

    // don't need to select optionGroupRect again, so use var
    this.optionGroupG
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

    // Border
    this.optionGroupG
      .append("line")
      .attrs({ x1: 57.5, y1: 9, x2: 57.5, y2: 42, stroke: "black" })
      .attr("stroke-width", 2);

    // The T Symbol
    var optionGroupText = this.optionGroupG
      .append("image")
      .attr("xlink:href", alphabetT)
      .attrs({ width: 50, height: 50, x: 75 });

    //  The Link Symbol
    var optionGroupLink = this.optionGroupG
      .append("image")
      .attr("xlink:href", link)
      .attrs({
        width: 30,
        height: 30,
        y: 10,
        color: "purple",
        stroke: "purple"
      });

    setOptionGroupTextMouseEvents(app, optionGroupText);
    setOptionGroupLinkMouseEvents(app, optionGroupLink);

    // initialize drag, force, zoom
    this.drag = getInitialDrag(app);
    this.force = getInitialForce(app);
    var zoom = d3.zoom().on("zoom", function() {
      app.container.attr("transform", d3.event.transform);
    });

    this.svg.call(zoom).on("dblclick.zoom", null);

    d3.select(window)
      .on("keydown", function() {
        keydown(app);
      })
      .on("keyup", function() {
        keyup(app);
      })
      .on("keypress", function() {
        keypress(app);
      })
      .on("resize", function() {
        resize(app);
      });

    // start rendering
    this.restart();
  }

  tick() {
    var app = this;
    if (
      this.selectedNode &&
      this.optionGroupConnector.attr("visibility") === "visible"
    )
      this.optionGroup.attr("transform", function(d) {
        if (app.selectedNode.type === "circle")
          return getTranslateString(
            app.selectedNode.x + 115,
            app.selectedNode.y - 5
          );

        return `translate(${app.selectedNode.x +
          app.selectedNode.width +
          10},${app.selectedNode.y + app.selectedNode.height / 2 - 25})`;
      });

    this.path.attr("d", d => {
      if (!this.state.focus) {
        this.links.map(eachLink => {
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

    this.rectGroups.attr("transform", d => {
      if (this.textInputCircle)
        if (d.id === this.textInputCircle.id) {
          this.textInputCircle.x = d.x;
          this.textInputCircle.y = d.y;
        }
      return `translate(${d.x},${d.y})`;
    });

    this.circleGroups.attr("transform", d => getTranslateString(d.x, d.y));

    if (this.textBox.attr("x"))
      this.textBox
        .attr("x", this.textInputCircle.x + 25)
        .attr("y", this.textInputCircle.y);

    if (this.selectedNode && this.selectedNode.type === "circle") {
      this.optionG.attr(
        "transform",
        getTranslateString(this.selectedNode.x + 75, this.selectedNode.y + 20)
      );
    }
  }

  restart() {
    var app = this;
    var globalRadius = 35;
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

    this.rectGroups = this.rectGroups.data(
      this.nodes.filter(eachNode => eachNode.type === "text"),
      d => d.id
    );

    var rectGroupsExit = this.rectGroups.exit();

    rectGroupsExit
      .attr("background", "red")
      .attr("opacity", 1)
      .transition()
      .duration(500)
      .attr("opacity", 0)
      .on("end", function() {
        d3.select(this).remove();
      });

    var rectGroupsEnter = this.rectGroups
      .enter()
      .append("svg:g")
      .attr("class", "nodeGroup");

    // a selection of rect
    var rect = rectGroupsEnter.append("svg:rect");

    this.circleGroups = this.circleGroups.data(
      this.nodes.filter(eachNode => eachNode.type === "circle"),
      d => d.id
    );

    var circleGroupsExit = this.circleGroups.exit();
    circleGroupsExit
      .attr("opacity", 1)
      .transition()
      .duration(500)
      .attr("opacity", 0)
      .on("end", function() {
        d3.select(this).remove();
      });
    circleGroupsExit
      .attr("opacity", 1)
      .transition()
      .duration(500)
      .attr("opacity", 0)
      .on("end", function() {
        d3.select(this).remove();
      });

    var circleGroupsEnter = this.circleGroups
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
        if (app.selectedNode && d.id === app.selectedNode.id) {
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
    this.circleGroups = this.circleGroups.merge(circleGroupsEnter);
    this.circleGroups
      .on("mousedown", function(d, i) {
        nodeMouseDown(d, i, this, app);
      })
      .on("mouseup", function(d, i) {
        // nodeMouseUp's this is GraphEditor instead of this.circleGroupsNow
        nodeMouseUp(d, i, this, app);
      })
      .on("click", function(d, i) {
        circleNodeClick(d, i, this, app);
      })
      .call(this.drag);

    var textContainers = rectGroupsEnter
      .append("svg:g")
      .attr("class", "textContainer");

    textContainers = textContainers
      .merge(d3.selectAll("g.textContainer"))
      .on("mousedown", d => {
        // select node
        this.mousedownNode = d;
        this.selectedNode =
          this.mousedownNode === this.selectedNode ? null : this.mousedownNode;

        this.selectedLink = null;

        //can't restart, if restart dblclick can't be detected
        //restart();
      })
      .on("mouseup", function(d, i) {
        nodeMouseUp(d, i, this, app);
      })
      .attr("opacity", d => d.opacity)
      //.attr("text-anchor", "middle")
      .attr("dy", function(d) {
        var nwords = d.text.length;
        return "-" + (nwords - 1) * 12;
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

    var texts = textContainers.selectAll("text").data(d => d.text);
    texts.exit().remove();
    texts = texts.enter().append("text").merge(texts)
    texts
      .html(function(d, i) {
        if (!d) {
          return;
        }
        var a = d;
        while (a.includes(" ")) {
          a = a.replace(" ", "&nbsp;");
        }
        return a;
      })

    textContainers.each(function(d, i) {
console.log(d.textSize, d3.select(this).selectAll("text"))
      d3.select(this)
        .selectAll("text")
        .style("font-size",d.textSize)
        .attr("y", (_, i) => d.textSize * i + (d.textSize - 12))

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

    });

    rect.merge(d3.selectAll("rect.node"))
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
        if (app.selectedNode && d.id === app.selectedNode.id) {
          return "url(#svgGradient)";
        }
        return d.strokeColor;
      })
      .attr("fill", d => d.backgroundColor)

      .on("click", function(d, i) {
        textNodeClick(d, i, this, app);
      })
      .on("dblclick", function(d, i) {
        updateStroke(app);
        textNodeDblClick(d, i, this, app);
        //updateStroke(app);
      })
      .on("mousedown", function(d, i) {
        nodeMouseDown(d, i, this, app);
      })
      .on("mouseup", function(d, i) {
        nodeMouseUp(d, i, this, app);
      })
      .on("click", function(d, i) {
        textNodeClick(d, i, this, app);
      });

    this.rectGroups = this.rectGroups.merge(rectGroupsEnter);
    this.rectGroups.call(this.drag);

    this.force.nodes(this.nodes);

    this.force.alphaTarget(0.3).restart();
  }

  toggleFocus = () => {
    var app = this;
    var prevFocus = this.state.focus;
    this.setState({ focus: !this.state.focus });
    if (prevFocus === false) {
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
        .force("charge", d3.forceManyBody().strength(-100))
        .on("tick", () => {
          app.tick();
        });

      this.force.alphaTarget(0.3).restart();
      this.setError("Force Enabled", 1000);
    } else {
      this.setError(
        "Force disabled. Dragging connected nodes changes link distance",
        3000
      );

      this.force.force("link", null).force("charge", null);
    }

    this.previousTransform = d3.select("g.gContainer").attr("transform");
    this.restart();
  };

  togglePreview = () => {
    var app = this;
    var previousPreview = this.state.preview;

    if (previousPreview === false) {
      this.setError("Preview Mode Enabled", 1000);
      if (isOptionGroupFormVisible(app)) {
        stretchCloseOptionGroupForm(app, invertOptionGroupVisibility);
      }
      this.setState({ preview: !this.state.preview });

      if (isTransitionCircleShowing(app)) {
        if (this.isFormShowing) {
          closeForm(app);
          closeNode(app);
        }
        this.optionG
          .selectAll("circle.permanent")
          .transition()
          .duration(500)
          .delay(this.isFormShowing ? 500 : 0)
          .attr("r", 0);
        this.optionG
          .selectAll("image.permanent")
          .transition()
          .duration(500)
          .delay(this.isFormShowing ? 500 : 0)
          .attr("width", 0)
          .attr("height", 0)
          .attr("x", 0)
          .attr("y", 0)
          .on("end", function() {
            app.optionG.selectAll("g").remove();
          });
      }
    } else {
      this.setError("Preview Mode Disabled", 1000);
      this.setState({ preview: !this.state.preview }, () => {
        //.on("end", restart());
        if (app.selectedNode && app.selectedNode.type === "circle") {
          var toDispatch = d3
            .selectAll(".circleGroup")
            .filter(function(d, i, list) {
              return d.id === app.selectedNode.id;
            });

          app.restart();

          toDispatch.dispatch("click");
        }
      });
    }
  };

  changeTextSize = newTextSize => {
    if (this.selectedNode) {
      if (this.selectedNode.textSize !== newTextSize) {
        this.selectedNode.textSize = newTextSize;
        this.restart();
      }
      this.selectedNode.textSize = newTextSize;

      this.restart();
    }
    this.forceUpdate();
  };

  changeBackgroundColor = color => {
    this.selectedNode.backgroundColor = color;
    this.restart();
    this.forceUpdate();
  };

  changeStrokeColor = color => {
    this.selectedNode.strokeColor = color;
    this.restart();
    this.forceUpdate();
  };

  render() {
    let errDisplay = (
      <div className="errMsginner">
        <span style={{ color: "white" }} id="errMsg">
          {this.state.errMsg}
        </span>
      </div>
    );

    if (this.state.errMsg === "") {
      errDisplay = null;
    }
    var colorArray = d3.schemeCategory10.slice(0, 8);
    return (
      <React.Fragment>
        <div id="editorsContainer" className="">
          {this.state.showManual ? (
            <Manual toggleManual={this.toggleManual} />
          ) : null}
          <div className="GraphEditorContainer" />
          <div className="errMsg">{errDisplay}</div>
          {!this.state.preview && this.selectedNode ? (
            <ColorCard
              selectedNode={this.selectedNode}
              type={this.selectedNode.type}
              textSize={
                this.selectedNode.type === "text"
                  ? this.selectedNode.textSize
                  : null
              }
              changeTextSize={this.changeTextSize}
              changeBackgroundColor={this.changeBackgroundColor}
              changeStrokeColor={this.changeStrokeColor}
            />
          ) : null}

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
              onClick={this.toggleFocus}
            />
            <img
              className="icon"
              id="previewIcon"
              src={this.state.preview ? preview_purple : preview}
              onClick={this.togglePreview}
            />
            {/*<img
              className="icon"
              id="themeIcon"
              src={this.state.theming ? theming_purple : theming}
            /> */}
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default GraphEditor;
