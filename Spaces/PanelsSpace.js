﻿/*

The Panel Space y the place wehre all panels live, no matter who create them. 

*/

function newPanelsSpace() {

    var thisObject = {
        container: undefined,
        createNewPanel: createNewPanel,
        destroyPanel: destroyPanel,
        getPanel: getPanel,
        draw: draw,
        panels: [],
        getContainer: getContainer,     // returns the inner most container that holds the point received by parameter.
        initialize: initialize
    };

    var container = newContainer();
    container.initialize();
    thisObject.container = container;
    thisObject.container.isDraggeable = false;

    container.displacement.containerName = "Panels Space";
    container.frame.containerName = "Panels Space";

    return thisObject;

    function initialize() {

        /* The space does not create any Panels for itself, it just sits and waits others need panels. */

    }

    function createNewPanel(pType, pParameters) {

        let panel;

        switch (pType) {

            case "Time Control Panel":
                {
                    panel = newTimeControlPanel();
                    panel.initialize();
                    break;
                }

            case "Products Panel":
                {
                    panel = newProductsPanel();
                    panel.initialize();
                    break;
                }
            case "Plotter Panel":
                {
                    panel = getNewPlotterPanel(pParameters.devTeam, pParameters.plotterCodeName, pParameters.moduleCodeName, pParameters.panelCodeName);
                    panel.initialize();
                    break;
                }
        }

        thisObject.panels.push(panel);

        panel.handle = Math.floor((Math.random() * 10000000) + 1);

        return panel.handle;
    }

    function destroyPanel(pPanelHandle) {

        for (let i = 0; i < thisObject.panels.length; i++) {

            let panel = thisObject.panels[i];

            if (panel.handle === pPanelHandle) {
                thisObject.panels.splice(i, 1);  // Delete item from array.
                return;
            }
        }
    }

    function getPanel(pPanelHandle) {

        for (let i = 0; i < thisObject.panels.length; i++) {

            let panel = thisObject.panels[i];

            if (panel.handle === pPanelHandle) {
                return panel;
            }
        }
    }

    function draw() {

        thisObject.container.frame.draw(false, false);

        /* When we draw a time machine, that means also to draw all the charts in it. */

        for (var i = 0; i < thisObject.panels.length; i++) {

            let panel = thisObject.panels[i];
            panel.draw();

        }
    }

    function getContainer(point) {

        let container;

        /*

        We search for the container of panels in the oposite direction than we do it for drawing them,
        so panels overlapping others are picked firt although they are drawn last.

        */

        for (var i = thisObject.panels.length - 1; i >= 0; i--) {

            container = thisObject.panels[i].getContainer(point);

            if (container !== undefined) {

                /* We found an inner container which has the point. We return it. */

                return container;
            }
        }

        /* The point does not belong to any inner container, so we return the current container. */

        return thisObject.container;

    }
}