﻿function newTimelineChart() {

    const MODULE_NAME = "Timeline Chart";
    const INFO_LOG = false;
    const INTENSIVE_LOG = false;
    const ERROR_LOG = true;
    const logger = newWebDebugLog();
    logger.fileName = MODULE_NAME;

    let timeLineCoordinateSystem = newTimeLineCoordinateSystem();

    let timePeriod = INITIAL_TIME_PERIOD;
    let datetime = INITIAL_DATE;

    let thisObject = {
        setDatetime: setDatetime,
        container: undefined,
        draw: draw,
        getContainer: getContainer,
        initialize: initialize
    };

    let container = newContainer();
    container.initialize();
    thisObject.container = container;

    container.displacement.containerName = "Timeline Chart";
    container.frame.containerName = "Timeline Chart";

    let chartGrid;
    let breakpointsBar;

    let initializationReady = false;

    let productsPanel;

    /* Background */
    let logoAssetA;
    let logoAssetB;
    let logoExchange;
    let logoAA;
    let canDrawLogoA = false;
    let canDrawLogoB = false;
    let canDrawLogoExchange = false;
    let canDrawLogoAA = false;

    let plotterManager;

    return thisObject;

    function initialize(pProductsPanel, callBackFunction) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] initialize -> Entering function."); }

            /* We load the logow we will need for the background. */

            logoA = new Image();
            logoB = new Image();
            logoExchange = new Image();
            logoAA = new Image();

            logoA.onload = onImageALoaded;

            function onImageALoaded() {
                canDrawLogoA = true;
            }

            logoB.onload = onImageBLoaded;

            function onImageBLoaded() {
                canDrawLogoB = true;
            }

            logoExchange.onload = onImageExchangeLoaded;

            function onImageExchangeLoaded() {
                canDrawLogoExchange = true;
            }

            logoAA.onload = onImageAALoaded;

            function onImageAALoaded() {
                canDrawLogoAA = true;
            }

            logoA.src = window.canvasApp.urlPrefix + "Images/tether-logo-background.png";
            logoB.src = window.canvasApp.urlPrefix + "Images/bitcoin-logo-background.png";
            logoExchange.src = window.canvasApp.urlPrefix + "Images/poloniex-logo-background.png";
            logoAA.src = window.canvasApp.urlPrefix + "Images/aa-logo-background.png";

            /* Remember the Products Panel */

            productsPanel = pProductsPanel;

            chartGrid = newChartGrid();
            chartGrid.initialize();

            breakpointsBar = newBreakpointsBar();
            breakpointsBar.initialize(container, timeLineCoordinateSystem);

            recalculateScale();
            
            //moveViewPortToCurrentDatetime();
            moveToUserPosition(container, timeLineCoordinateSystem);
            timePeriod = INITIAL_TIME_PERIOD;
            datetime = INITIAL_DATE;
            
            /* Event Subscriptions - we need this events to be fired first here and then in active Plotters. */

            viewPort.eventHandler.listenToEvent("Offset Changed", onOffsetChanged);
            viewPort.eventHandler.listenToEvent("Zoom Changed", onZoomChanged);

            /* Initialize the Plotter Manager */

            plotterManager = newPlottersManager();

            plotterManager.container.displacement.parentDisplacement = thisObject.container.displacement;
            plotterManager.container.frame.parentFrame = thisObject.container.frame;

            plotterManager.container.parentContainer = thisObject.container;

            plotterManager.container.frame.width = thisObject.container.frame.width;
            plotterManager.container.frame.height = thisObject.container.frame.height;

            plotterManager.container.frame.position.x = thisObject.container.frame.position.x;
            plotterManager.container.frame.position.y = thisObject.container.frame.position.y;

            plotterManager.initialize(pProductsPanel, onPlotterManagerReady);

            function onPlotterManagerReady(err) {

                if (INFO_LOG === true) { logger.write("[INFO] initialize -> onPlotterManagerReady -> Entering function."); }

                if (err.result !== GLOBAL.DEFAULT_OK_RESPONSE.result) {

                    if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> onPlotterManagerReady -> Plotter Manager Initialization Failed. "); }
                    if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> onPlotterManagerReady -> err.message = " + err.message); }

                    callBackFunction(GLOBAL.DEFAULT_FAIL_RESPONSE);
                    return;
                }

                initializationReady = true;
                callBackFunction(GLOBAL.DEFAULT_OK_RESPONSE);
                return;
            }

            canvas.bottomSpace.chartAspectRatio.container.eventHandler.listenToEvent("Chart Aspect Ratio Changed", onAspectRatioChanged);     
        
            function onAspectRatioChanged(pAspectRatio) {

                thisObject.container.frame.height = CHART_SPACE_HEIGHT * pAspectRatio.y;
                recalculateScale();

            }

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> err = " + err); }
            callBackFunction(GLOBAL.DEFAULT_FAIL_RESPONSE);
        }
    }

    function onZoomChanged(event) {

        if (INFO_LOG === true) { logger.write("[INFO] onZoomChanged -> Entering function."); }

        if (initializationReady === true) {

            let currentTimePeriod = timePeriod;

            timePeriod = recalculatePeriod(event.newLevel);

            /* If the period changes, we need to spread the word in cascade towards all the depending objects. */

            if (timePeriod !== currentTimePeriod) {

                plotterManager.setTimePeriod(timePeriod);

            }

            recalculateCurrentDatetime();

            saveUserPosition(thisObject.container, timeLineCoordinateSystem);

        }
    }

    function setDatetime(pDatetime) {

        if (INFO_LOG === true) { logger.write("[INFO] setDatetime -> Entering function."); }

        /* This function is used when the time is changed through the user interface, but without zooming or panning. */
        /* No matter if the day changed or not, we need to inform all visible Plotters. */

        if (thisObject.container.frame.isInViewPort()) {

            plotterManager.setDatetime(pDatetime);
            plotterManager.positionAtDatetime(pDatetime);
            breakpointsBar.setDatetime(pDatetime);
        }
    }

    function onOffsetChanged() {

        if (INFO_LOG === true) { logger.write("[INFO] onOffsetChanged -> Entering function."); }

        if (initializationReady === true) {

            if (thisObject.container.frame.isInViewPort()) {

                recalculateCurrentDatetime();
                saveUserPosition(thisObject.container, timeLineCoordinateSystem);
            }
        }

    }

    function recalculateCurrentDatetime() {

        if (INFO_LOG === true) { logger.write("[INFO] recalculateCurrentDatetime -> Entering function."); }

        /*

        The view port was moved or the view port zoom level was changed and the center of the screen points to a different datetime that we
        must calculate.

        */

        let center = {
            x: (viewPort.visibleArea.bottomRight.x - viewPort.visibleArea.bottomLeft.x) / 2,
            y: (viewPort.visibleArea.bottomRight.y - viewPort.visibleArea.topRight.y) / 2
        };

        center = unTransformThisPoint(center, thisObject.container);
        center = timeLineCoordinateSystem.unInverseTransform(center, thisObject.container.frame.height);

        let newDate = new Date(0);
        newDate.setUTCSeconds(center.x / 1000);

        datetime = newDate;

        plotterManager.setDatetime(datetime);

        breakpointsBar.setDatetime(datetime);

        thisObject.container.eventHandler.raiseEvent("Datetime Changed", datetime);
  
    }

    function getContainer(point) {

        if (INFO_LOG === true) { logger.write("[INFO] getContainer -> Entering function."); }

        let container;

        container = chartGrid.getContainer(point);

        if (container !== undefined) { return container;}

        container = breakpointsBar.getContainer(point);

        return container;

    }

    function recalculateScale() {

        if (INFO_LOG === true) { logger.write("[INFO] recalculateScale -> Entering function."); }

        let minValue = {
            x: EARLIEST_DATE.valueOf(),
            y: 0
        };

        let maxValue = {
            x: MAX_PLOTABLE_DATE.valueOf(),
            y: nextPorwerOf10(USDT_BTC_HTH) / 4
        };

        timeLineCoordinateSystem.initialize(
            minValue,
            maxValue,
            thisObject.container.frame.width,
            thisObject.container.frame.height
        );

    }

    function tooTiny() {

        if (INTENSIVE_LOG === true) { logger.write("[INFO] tooTiny -> Entering function."); }

        if (viewPort.zoomLevel < Math.trunc(-28.25 * 100) / 100) {
            return true;
        } else {
            return false;
        }

    }

    function tooSmall() {

        if (INFO_LOG === true) { logger.write("[INFO] tooSmall -> Entering function."); }

        if (viewPort.zoomLevel < Math.trunc(-27.25 * 100) / 100) {
            return true;
        } else {
            return false;
        }

    }

    function draw() {

        if (INTENSIVE_LOG === true) { logger.write("[INFO] draw -> Entering function."); }

        if (thisObject.container.frame.isInViewPort()) {

            this.container.frame.draw();

            drawBackground();

            chartGrid.draw(thisObject.container, timeLineCoordinateSystem);

            plotterManager.draw();

            breakpointsBar.draw();
        }
    }

    function drawBackground() {

        if (INTENSIVE_LOG === true) { logger.write("[INFO] drawBackground -> Entering function."); }

        if (canDrawLogoA === false || canDrawLogoB === false || canDrawLogoExchange === false || canDrawLogoAA === false) { return; }

        let backgroundLogoPoint1;
        let backgroundLogoPoint2;

        let imageHeight = 42;
        let imageWidth = 150;

        let MAX_COLUMNS = 16;
        let MAX_ROWS = 7;
        let Y_TOP_MARGIN = 30;

        let point1 = {
            x: viewPort.visibleArea.topLeft.x,
            y: viewPort.visibleArea.topLeft.y
        };

        backgroundLogoPoint1 = {
            x: getDateFromPoint(point1, thisObject.container, timeLineCoordinateSystem).valueOf(),
            y: getRateFromPoint(point1, thisObject.container, timeLineCoordinateSystem)
        };

        let point2 = {
            x: viewPort.visibleArea.topLeft.x + imageWidth * 8,
            y: viewPort.visibleArea.topLeft.y
        };

        backgroundLogoPoint2 = {
            x: getDateFromPoint(point2, thisObject.container, timeLineCoordinateSystem).valueOf(),
            y: getRateFromPoint(point2, thisObject.container, timeLineCoordinateSystem)
        };

        let currentCorner = {
            x: getDateFromPoint(viewPort.visibleArea.topLeft, thisObject.container, timeLineCoordinateSystem).valueOf(),
            y: getRateFromPoint(viewPort.visibleArea.topLeft, thisObject.container, timeLineCoordinateSystem)
        };

        currentCorner.x = Math.trunc(currentCorner.x / (backgroundLogoPoint2.x - backgroundLogoPoint1.x)) * (backgroundLogoPoint2.x - backgroundLogoPoint1.x);

        let rowHight = (viewPort.visibleArea.bottomLeft.y - viewPort.visibleArea.topLeft.y) / 4.5;

        imagePoint = timeLineCoordinateSystem.transformThisPoint(currentCorner);
        imagePoint = transformThisPoint(imagePoint, thisObject.container);

        let offSet = 0;


        for (let j = 0; j < MAX_ROWS; j++) {

            if (offSet === -imageWidth * 8) {

                offSet = -imageWidth * 4 - imageWidth;

            } else {
                offSet = -imageWidth * 8;
            }

            for (let i = 0; i < MAX_COLUMNS; i = i + 4) {

                let logo = logoA;

                browserCanvasContext.drawImage(logo, imagePoint.x + i * imageWidth * 2 + offSet, imagePoint.y + j * rowHight + Y_TOP_MARGIN, imageWidth, imageHeight);

            }
        }

        offSet = 0;

        for (let j = 0; j < MAX_ROWS; j++) {

            if (offSet === -imageWidth * 8) {

                offSet = -imageWidth * 4 - imageWidth;

            } else {
                offSet = -imageWidth * 8;
            }

            for (let i = 1; i < MAX_COLUMNS; i = i + 4) {

                let logo = logoB;

                browserCanvasContext.drawImage(logo, imagePoint.x + i * imageWidth * 2 + offSet, imagePoint.y + j * rowHight + Y_TOP_MARGIN, imageWidth, imageHeight);

            }
        }

        offSet = 0;

        for (let j = 0; j < MAX_ROWS; j++) {

            if (offSet === -imageWidth * 8) {

                offSet = -imageWidth * 4 - imageWidth;

            } else {
                offSet = -imageWidth * 8;
            }

            for (let i = 2; i < MAX_COLUMNS; i = i + 4) {

                let logo = logoExchange;

                browserCanvasContext.drawImage(logo, imagePoint.x + i * imageWidth * 2 + offSet, imagePoint.y + j * rowHight + Y_TOP_MARGIN, imageWidth, imageHeight);

            }
        }

        offSet = 0;

        for (let j = 0; j < MAX_ROWS; j++) {

            if (offSet === -imageWidth * 8) {

                offSet = -imageWidth * 4 - imageWidth;

            } else {
                offSet = -imageWidth * 8;
            }

            for (let i = 3; i < MAX_COLUMNS; i = i + 4) {

                let logo = logoAA;

                browserCanvasContext.drawImage(logo, imagePoint.x + i * imageWidth * 2 + offSet, imagePoint.y + j * rowHight + Y_TOP_MARGIN, imageWidth, imageHeight);

            }
        }

        /* We will paint some transparent background here. */

        let opacity = "0.9";

        let fromPoint = {
            x: 0,
            y: 0
        };

        let toPoint = {
            x: 0,
            y: thisObject.container.frame.height
        };

        fromPoint = transformThisPoint(fromPoint, thisObject.container); 
        toPoint = transformThisPoint(toPoint, thisObject.container); 

        browserCanvasContext.beginPath();

        browserCanvasContext.rect(viewPort.visibleArea.topLeft.x, fromPoint.y, viewPort.visibleArea.topRight.x - viewPort.visibleArea.topLeft.x, toPoint.y - fromPoint.y);
        browserCanvasContext.fillStyle = 'rgba(' + UI_COLOR.WHITE + ', ' + opacity + ')';

        browserCanvasContext.closePath();

        browserCanvasContext.fill();

    }

    function moveViewPortToCurrentDatetime() {

        if (INFO_LOG === true) { logger.write("[INFO] moveViewPortToCurrentDatetime -> Entering function."); }

        let targetPoint = {
            x: datetime.valueOf(),
            y: 0  // we wont touch the y axis here.
        };

        /* Lets put this point in the coordinate system of the viewPort */

        targetPoint = timeLineCoordinateSystem.transformThisPoint(targetPoint);
        targetPoint = transformThisPoint(targetPoint, thisObject.container);

        /* Lets get the point on the viewPort coordinate system of the center of the visible screen */

        let center = {
            x: (viewPort.visibleArea.bottomRight.x - viewPort.visibleArea.bottomLeft.x) / 2,
            y: (viewPort.visibleArea.bottomRight.y - viewPort.visibleArea.topRight.y) / 2
        };

        /* Lets calculate the displace vector, from the point we want at the center, to the current center. */

        let displaceVector = {
            x: center.x - targetPoint.x,
            y: 0
        };

        viewPort.displace(displaceVector);
    }
}

