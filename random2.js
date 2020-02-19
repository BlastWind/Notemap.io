else if (iClicked !== 0) {
         if (list.length < 3 && lastClickedId === 0) {
           transitionGDataset.push({
             href:
               "https://cdn1.iconfinder.com/data/icons/social-17/48/photos2-512.png"
           });
           transitionGs = optionG.selectAll("g").data(transitionGDataset);
           selectedNode.storedInfo.picture = "";
           shouldTransitionGsAnimate = false;
           transitionGsEnter = transitionGs.enter().append("g");
           transitionGsEnter.attr("transform", d => {
             return getTranslateString(selectedNode.x, selectedNode.y);
           });

           transitionGsEnter
             .transition()
             .duration(500)
             .attr("transform", translateFromCenterToDefault())
             .on("end", function(d, i, list) {
               var periodSpaceBetween = Math.PI / (list.length + 1);
               var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);
               updateBasePeriod(d, goTo);
             });
           transitionGs
             .transition()
             .duration(500)
             .attrTween("transform", translateToDefault())
             .on("end", function(d, i, list) {
               var periodSpaceBetween = Math.PI / (list.length + 1);
               var goTo = Math.PI / 2 - periodSpaceBetween * (i + 1);
               updateBasePeriod(d, goTo);
               if (iClicked !== lastClickedId && i == 0) {
                 openForm(d, i);
               }
               if (i === list.length - 2) {
                 updateLastClicked(iClicked, clickedNode, dClicked);
               }
             });
           restart();
           transitionGs = transitionGs
             .merge(transitionGsEnter)
             .on("click", onTransitionNodeClick);
           return;
         } else if (
           list.length === 3 ||
           (list.length < 3 && lastClickedId !== 0)
         ) {
           if (iClicked === lastClickedId) {
             transitionGs
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
           } else if (iClicked !== lastClickedId) {
             console.log("clcked base, should be -1.57", base, transitionGs);

             transitionGs
               .transition()
               .duration(500)
               .attrTween("transform", translateBackLastMoved(base))
               .on("end", function(d, i) {
                 updateBasePeriod(d, d.basePeriod - base);
                 openForm(d, i);
                 updateLastClicked(iClicked, clickedNode, dClicked);
               });

             return;
           }
         }
       }
