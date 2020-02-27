import * as d3 from "d3";
import {
  getTranslateString,
  decodeTranslateString,
  pureDecodeTranslate,
  makeTransitionNodeData,
  translateBackLastMoved,
  translateFromCenterToDefault,
  translateToDefault,
  transformOpenCurrentNode,
  updateBasePeriod,
  updateLastClicked
} from "./TransitionNodesHelperFunctions.js";
import { closeForm, closeNode } from "./transitionFormFunctions.js";
import { restartOptionG, updateStroke } from "./updateFunctions.js";
import { textArrToHTML } from "./StringHelperFunctions.js";

export function nodeMouseDown(d, i, DOMEle, app) {
  console.log("node mouse downed");
  if (app.optionGroup)
    app.optionGroup
      .transition()
      .duration(300)
      .attr("opacity", 0)
      .on("end", function() {
        app.optionGroup.attr("visibility", "hidden");
      });
  app.mousedownNode = d;
}

export function nodeMouseUp(d, i, DOMEle, app) {
  console.log("mouse down node in mouseup", app.mousedownNode, app);
  console.log("node mouse up");
  if (app.state.preview) {
    //setError("Can't edit during Preview Mode", 2000);
    return;
  }
  var mousedownNode = app.mousedownNode,
    selectedNode = app.selectedNode;

  app.forceUpdate();

  if (!app.mousedownNode) return;

  // needed by FF
  app.dragLine.classed("hidden", true).style("marker-end", "");

  app.mouseupNode = d;
  if (app.mouseupNode === app.mousedownNode) {
    app.mousedownNode = null;
    app.selectedNode = null;
    app.forceUpdate();
    return;
  }

  const source = app.mousedownNode;
  const target = app.mouseupNode;
  var link = {
    source: source,
    target: target,
    linkDistance: 250,
    index: app.links.length
  };
  app.links.push(link);

  var command = {
    action: { type: "addLink", link: link },
    inverse: { type: "delLink", link: link }
  };

  //app.storeToHistory(command);

  //app.mousedownNode = null;

  app.restart();
}

export function circleNodeClick(d, iClicked, DOMEle, app) {
  if (app.isTransitioning) {
    return;
  }

  if (app.state.preview) {
    if (app.selectedNode && d.id === app.selectedNode.id) {
      app.selectedNode = null;
      app.restart();
      app.forceUpdate();
    } else {
      app.selectedNode = d;
      app.restart();
      app.forceUpdate();
    }
    return;
  }
  var prevLocation = app.optionG.attr("transform");
  app.selectedNode = d;
  app.restart();
  app.selectedLink = null;
  var selectedNode = app.selectedNode;
  app.forceUpdate();

  if (sameCircleClicked() && isTransitionCircleShowing()) {
    if (app.lastClickedNode) {
      console.log({ app });
      closeForm(app);
      closeNode(app);
    }
    app.optionG
      .selectAll("g")
      .transition()
      .duration(500)
      .delay(app.isFormShowing ? 500 : 0)
      .attr(
        "transform",
        getTranslateString(
          -(app.selectedNode.x - app.lastClickedCircleD.x),
          -(app.selectedNode.y - app.lastClickedCircleD.y)
        )
      )
      .on("end", function() {
        app.optionG.selectAll("g").remove();
        app.lastClickedCircle = iClicked;
        app.lastClickedCircleD = d;
        app.isFormShowing = false;
        app.selectedNode = null;
        app.forceUpdate();
        app.restart();
      });

    app.optionG
      .selectAll("circle.permanent")
      .transition()
      .duration(500)
      .delay(app.isFormShowing ? 500 : 0)
      .attr("r", 0);
    app.optionG
      .selectAll("image.permanent")
      .transition()
      .duration(500)
      .delay(app.isFormShowing ? 500 : 0)
      .attr("width", 0)
      .attr("height", 0)
      .attr("x", 0)
      .attr("y", 0);

    return;
  }

  var duration = 500;

  // if not same circle click, but the transition circles were showing: hide old and show new
  if (isTransitionCircleShowing()) {
    if (app.lastClickedNode && app.isFormShowing) {
      app.optionG.select("foreignObject").attr("transform", function() {
        var decoded = decodeTranslateString(
          prevLocation,
          getTranslateString(0, 0),
          app.selectedNode
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
          app.optionG
            .select("foreignObject")
            .attr("transform", getTranslateString(0, 0));
          app.isFormShowing = false;
        });

      var prevTransitionCircles = app.optionG.selectAll("g");
      prevTransitionCircles.each(function() {
        var bruh = decodeTranslateString(
          prevLocation,
          d3.select(this).attr("transform"),
          app.selectedNode
        );

        d3.select(this).attr("transform", getTranslateString(bruh.x, bruh.y));

        app.alreadyDid = true;
      });
      app.lastClickedNode
        .transition()
        .duration(duration)
        .attr("transform", d => {
          var current = app.lastClickedNode.attr("transform");
          var decoded = pureDecodeTranslate(current);
          return getTranslateString(decoded.x - 175, decoded.y);
        })
        .on("end", function() {
          //d3.select(this).attr("transform", getTranslateString(0, 0));
        });
    }

    var prevTransitionCircles = app.optionG.selectAll("g");
    prevTransitionCircles
      .transition()
      .duration(duration)
      .delay(app.isFormShowing ? duration : 0)
      .on("start", function(d2, i) {
        if (!app.alreadyDid) {
          var bruh = decodeTranslateString(
            prevLocation,
            d3.select(this).attr("transform"),
            app.selectedNode
          );

          d3.select(this).attr("transform", getTranslateString(bruh.x, bruh.y));
        }

        if (i === 0) {
          app.isTransitioning = true;

          var fakeNodesData = makeTransitionNodeData(2);
          if (selectedNode.storedInfo.picture !== null) {
            fakeNodesData = makeTransitionNodeData(4);
          }

          var newGs = app.optionG
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
              app.isTransitioning = true;
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
        app.alreadyDid = false;
        if (i == 0) {
          app.lastClickedCircle = iClicked;
          app.lastClickedCircleD = d;
          // after old nodes closed to center and fake nodes came out:
          // 1) remove fake nodes
          // restart accordingly
          app.isTransitioning = false;
          app.optionG.selectAll("g.temp").remove();
          app.shouldTransitionGsAnimate = true;
          app.animationAlreadyCompleted = true;
          app.shouldTransitionGsEnterAnimation = false;

          if (app.transitionGDataset.length === 2) {
            if (selectedNode.storedInfo.picture === null) {
            } else {
              app.transitionGDataset.push({
                href:
                  "https://cdn1.iconfinder.com/data/icons/social-17/48/photos2-512.png"
              });
              app.transitionGDataset.push({
                href:
                 "https://www.svgimages.com/svg-image/s6/t-alphabet-256x256.png"
              });
            }
          } else if (app.transitionGDataset.length === 4) {
            if (selectedNode.storedInfo.picture === null) {
              app.transitionGDataset.pop();
              app.transitionGDataset.pop();
            }
          }

          restartOptionG(app);
          app.shouldTransitionGsEnterAnimation = true;
          app.shouldTransitionGsAnimate = false;
          app.animationAlreadyCompleted = false;
        }
      });

    prevTransitionCircles
      .selectAll("circle.permanent")
      .transition()
      .duration(duration)
      .delay(app.isFormShowing ? duration : 0)
      .attr("r", 0)
      .on("end", function() {
        d3.select(this).attr("r", 10);
      });

    prevTransitionCircles
      .selectAll("image.permanent")
      .transition()
      .duration(duration)
      .delay(app.isFormShowing ? duration : 0)
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

    app.isFormShowing = false;
  } else {
    app.shouldTransitionGsAnimate = true;
    app.shouldTransitionGsEnterAnimation = true;

    if (d.storedInfo.picture === null) {
      app.transitionGDataset = makeTransitionNodeData(2);
    } else {
      app.transitionGDataset = makeTransitionNodeData(4);
    }
    app.lastClickedCircle = iClicked;
    app.lastClickedCircleD = d;
    restartOptionG(app);
  }

  function sameCircleClicked() {
    return app.lastClickedCircle === iClicked;
  }

  function isTransitionCircleShowing() {
    return !app.optionG.select("circle").empty();
  }
}

export function onTransitionNodeClick(dClicked, iClicked, list, DOMEle, app) {
  var globalRadius = 35;
  var clickedNode = d3.select(DOMEle);
  console.log({ clickedNode });
  var selectedNode = app.selectedNode;
  var base = dClicked.basePeriod;
  app.forceUpdate();

  if (app.isFormShowing === true) {
    closeForm(app);

    app.lastClickedNode
      .transition()
      .duration(500)
      .attr("transform", d => getTranslateString(globalRadius, 0))

      .on("end", function(d, i) {
        // if clicked on URL node again when no picture node
        if (list.length < 4 && app.lastClickedId === 0) {
          if (iClicked === 0) {
            selectedNode.storedInfo.picture = "";
            app.transitionGDataset.push({
              href:
                "https://cdn1.iconfinder.com/data/icons/social-17/48/photos2-512.png"
            });
            app.transitionGDataset.push({
              href:
               "https://www.svgimages.com/svg-image/s6/t-alphabet-256x256.png"
            });
            app.shouldTransitionGsAnimate = true;
            app.shouldTransitionGsEnterAnimation = true;
            restartOptionG(app);
            return;
          } else if (iClicked !== 0) {
            app.transitionGDataset.push({
              href:
                "https://cdn1.iconfinder.com/data/icons/social-17/48/photos2-512.png"
            });
            app.transitionGDataset.push({
              href:
               "https://www.svgimages.com/svg-image/s6/t-alphabet-256x256.png"
            });

            app.transitionGs = app.optionG
              .selectAll("g")
              .data(app.transitionGDataset);
            selectedNode.storedInfo.picture = "";
            app.shouldTransitionGsAnimate = false;
            app.transitionGsEnter = app.transitionGs
              .enter()
              .append("g")
              .attr("class", "permanent");
            app.transitionGsEnter.attr("transform", d => {
              return getTranslateString(
                selectedNode.x + 75,
                selectedNode.y + 20
              );
            });

            app.transitionGsEnter
              .transition()
              .duration(500)
              .attr("transform", translateFromCenterToDefault())
              .on("end", function(d, i, list) {
                var periodSpaceBetween = Math.PI / (list.length + 1);
                var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);
                updateBasePeriod(d, goTo);
              });
            app.transitionGs
              .transition()
              .duration(500)
              .attrTween("transform", translateToDefault())
              .on("end", function(d, i, list) {
                var periodSpaceBetween = Math.PI / (list.length + 1);
                var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);
                updateBasePeriod(d, goTo);
                if (iClicked !== app.lastClickedId && i == 0) {
                  openForm(d, iClicked);
                }
                if (i === list.length - 2) {
                  updateLastClicked(app, iClicked, clickedNode, dClicked);
                }
              });
            restartOptionG(app);
            app.transitionGs = app.transitionGs
              .merge(app.transitionGsEnter)
              .on("click", function(d, i, list) {
                onTransitionNodeClick(d, i, list, this, app);
              });

            return;
          }
        }
        // clicked on URL node with picture node
        else if (
          list.length === 4 ||
          (list.length < 4 && app.lastClickedId !== 0)
        ) {
          if (iClicked === app.lastClickedId) {
            app.transitionGs
              .transition()
              .duration(500)
              .attrTween("transform", translateToDefault())
              .on("end", function(d, i) {
                var periodSpaceBetween = Math.PI / (list.length + 1);
                updateBasePeriod(d, Math.PI / 2 - periodSpaceBetween * (i + 1));
                updateLastClicked(app, iClicked, clickedNode, dClicked);
              });
            return;

            //  not the same clicked, and,
          } else if (iClicked !== app.lastClickedId) {
            app.transitionGs
              .transition()
              .duration(500)
              .attrTween("transform", translateBackLastMoved(base))
              .on("end", function(d, i) {
                updateBasePeriod(d, d.basePeriod - base);
                if (i === iClicked) {
                  openForm(d, iClicked);
                }
                updateLastClicked(app, iClicked, clickedNode, dClicked);
              });

            return;
          }
        }
        // clicking on URL node with other node's form open
      });
    return;
  }
  app.isFormShowing = true;
  app.optionG
    .select("foreignObject")
    .lower()
    .attrs({
      width: 300,
      height: 100,
      x: globalRadius
    });

  app.transitionGs
    .merge(app.transitionGsEnter)
    .transition()
    .duration(shouldAnimate() ? 500 : 0)
    .attrTween("transform", translateBackLastMoved(base))
    .on("end", function(d, i) {
      updateBasePeriod(d, d.basePeriod - base);
      if (i === iClicked) {
        openForm(d, iClicked);
      }
      updateLastClicked(app, iClicked, clickedNode, dClicked);
    });

  function shouldAnimate() {
    if (iClicked === 1 && list.length === 4) {
      return false;
    }
    return true;
  }

  function openForm(d, i) {
    if (i == 1) {
      app.transitionForm = app.optionG
        .select("foreignObject")
        .attrs({
          y: i === 1 ? -17.5 : -12.5
        })
        .append("xhtml:textarea");
    } else {
      app.transitionForm = app.optionG
        .select("foreignObject")
        .attrs({
          y: i === 1 ? -17.5 : -12.5
        })
        .append("xhtml:input");
    }
    app.transitionForm
      .style("width", "0px")
      .attr("id", "currentInput")
      .attr("maxlength", i == 1 ? 100 : 50)
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
              selectedNode.storedInfo.picture === selectedNode.storedInfo.url
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
            var newURL = d3.select("#currentInput")._groups[0][0].value;

            if (newURL === selectedNode.storedInfo.url) return;

            selectedNode.storedInfo.url = newURL;
            selectedNode.storedInfo.picture = newURL;
            console.log("oh,", { app });

            console.log("circle groups", app.circleGroups);
            app.circleGroups.selectAll(".nodeImage").each(function(d) {
              if (d !== selectedNode) return;

              var pictureRef = this;
              if (
                !selectedNode.storedInfo.picture ||
                selectedNode.storedInfo.picture === ""
              ) {
                // if there's nothing appended, href null
                d3.select(this).attr("href", null);
              } else {
                // set src

                var img = new Image();
                img.onload = function() {
                  d3.select(pictureRef).attr("href", img.src);
                };

                img.onerror = function() {};
                img.src =
                  "https://forked-besticon.herokuapp.com/icon?url=" +
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
            var newValue = d3.select("#currentInput")._groups[0][0].value;

            if (newValue === selectedNode.storedInfo.picture) {
              break;
            }

            selectedNode.storedInfo.picture = newValue;
            app.circleGroups.selectAll(".nodeImage").each(function(d) {
              if (d !== selectedNode) return;

              var pictureRef = this;
              if (
                !selectedNode.storedInfo.picture ||
                selectedNode.storedInfo.picture === ""
              ) {
                // if there's nothing appended, href null
                d3.select(this).attr("href", null);
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

    app.transitionForm
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

    app.isFormShowing = true;
  }
}

export function textNodeClick(d, i, DOMEle, app) {
  var prevLocation = app.optionG.attr("transform");
  var duration = 500;
  if (app.selectedNode && app.selectedNode.type === "circle") {
    app.lastClickedCircle = null;
    // if we were selecting circles, close them
    console.log({ app });
    closeForm(app);
    closeNode(app);
    app.optionG
      .selectAll("circle.permanent")
      .transition()
      .duration(500)
      .delay(app.isFormShowing ? 500 : 0)
      .attr("r", 0);
    app.optionG
      .selectAll("image.permanent")
      .transition()
      .duration(500)
      .delay(app.isFormShowing ? 500 : 0)
      .attr("width", 0)
      .attr("height", 0)
      .attr("x", 0)
      .attr("y", 0);
  }
  if (d === app.selectedNode) {
    app.selectedNode = null;
    app.forceUpdate();
    app.restart();
  } else {
    app.selectedNode = d;
    app.forceUpdate();
    app.restart();
  }
}

export function textNodeDblClick(rectData, i, DOMEle, app) {
  updateStroke(app);
  app.selectedNode = rectData;
  app.forceUpdate();
  app.mousedownNode = null;

  if (app.state.preview) {
    app.setError("Can't edit during preview mode", 2000);
    return;
  }
  app.isTyping = true;
  app.svg.on(".zoom", null);
  app.startText = rectData.text;

  app.nodes.map(eachNode => {
    if (eachNode.id === rectData.id) {
      eachNode.opacity = 0;
      app.restart();
    }
  });

  app.textInputCircle = rectData;

  app.textBox = app.textBox
    .attr("x", rectData.x)
    .attr("y", rectData.y)
    .attr("width", window.innerWidth / 2)
    .attr("height", window.innerHeight);
  var paragraph = app.textBox
    .append("xhtml:p")
    .html(() => textArrToHTML(rectData.text))
    .attr("contentEditable", "true")
    .attr("spellcheck", false)
    .attr("width", window.innerWidth / 2)
    .style("width", window.innerWidth / 2)
    .style("outline", 0)
    .style("font", rectData.textSize + "px " + rectData.textFont)
    .style("line-height", rectData.textSize + "px")
    .style("display", "block");

  paragraph
    .on("click", () => {
      console.log("cliekd");
    })
    .on("blur", function() {
      var zoom = d3.zoom().on("zoom", function() {
        app.container.attr("transform", d3.event.transform);
      });

      app.svg.call(zoom).on("dblclick.zoom", null);

      d3.selectAll("foreignObject").remove();
      app.textBox = app.container.append("foreignObject");
      app.resourceForm = app.container
        .append("foreignObject")
        .attr("id", "resourceForm");
      app.nodes.map(eachNode => {
        if (eachNode.id === app.textInputCircle.id) {
          eachNode.opacity = 1;
          app.restart();
        }
      });

      //TODO: if text isn't the same or the node is brand new, store to history
      //on add new node, notNewNode is false
      //on dblclick, blur, notNewNode is true
      if (app.startText !== rectData.text) {
        app.nodeToChange = rectData;
        var command = {
          action: {
            type: "modifyText",
            node: app.nodeToChange,
            text: rectData.text
          },
          inverse: {
            type: "modifyText",
            node: app.nodeToChange,
            text: app.startText
          }
        };

        app.storeToHistory(command);
      }

      app.startText = null;
      app.nodeToChange = null;
      app.isTyping = false;
      app.textInputCircle = null;
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
        // note, d.text is referring to the d in dblclick, d in g, d in text, from app.nodes
        var nodeHTML = d3.select(this).node().innerHTML;

        nodeHTML = nodeHTML.slice(3, nodeHTML.length - 4);

        if (
          nodeHTML.substring(nodeHTML.length - 4, nodeHTML.length) === "<br>"
        ) {
          nodeHTML = nodeHTML.slice(0, nodeHTML.length - 4);
        }

        var textArr = nodeHTML.split("<br>");
        rectData.text = textArr;

        app.restart();
      }
    });

  paragraph.node().focus();
}
