﻿
function newCompetitionStorage(pName) {

    const MODULE_NAME = "Competition Storage";
    const INFO_LOG = false;
    const ERROR_LOG = true;
    const logger = newWebDebugLog();
    logger.fileName = MODULE_NAME;

    let thisObject = {

        competitorsSequences: [],
        eventHandler: undefined,
        initialize: initialize

    }

    thisObject.eventHandler = newEventHandler();

    /* We name the event Handler to easy debugging. */

    thisObject.eventHandler.name = "Storage-" + pName;

    let fileSequences = [];

    return thisObject;

    function initialize(pHost, pCompetition, pExchange, pMarket, callBackFunction) {

        try {

            if (INFO_LOG === true) { logger.write("[INFO] initialize -> Entering function."); }
            if (INFO_LOG === true) { logger.write("[INFO] initialize -> key = " + pHost.codeName + "-" + pCompetition.codeName); }

            let dataSetsToLoad = 0;
            let dataSetsLoaded = 0;

            fileSequences = [];

            for (let j = 0; j < pCompetition.participants.length; j++) {

                let devTeam = ecosystem.getTeam(pCompetition.participants[j].devTeam);
                let bot = ecosystem.getBot(devTeam, pCompetition.participants[j].bot)
                let product = ecosystem.getProduct(bot, "Competition Trading History");

                if (INFO_LOG === true) { logger.write("[INFO] initialize -> key = " + devTeam.codeName + "-" + bot.codeName + "-" + product.codeName); }

                for (let i = 0; i < product.dataSets.length; i++) {

                    let thisSet = product.dataSets[i];

                    switch (thisSet.type) {
                        case 'File Sequence': {

                            if (INFO_LOG === true) { logger.write("[INFO] initialize -> File Sequence -> key = " + pHost.codeName + "-" + pCompetition.codeName + "-" + devTeam.codeName + "-" + bot.codeName + "-" + product.codeName); }

                            let fileSequence = newFileSequence();
                            fileSequence.initialize(devTeam, bot, product, thisSet, pExchange, pMarket, onFileSequenceReady);
                            fileSequences.push(fileSequence);
                            dataSetsToLoad++;
                        }
                            break;
                    }

                    function onFileSequenceReady(err, pCaller) {

                        try {

                            if (INFO_LOG === true) { logger.write("[INFO] initialize -> onFileSequenceReady -> Entering function."); }
                            if (INFO_LOG === true) { logger.write("[INFO] initialize -> onFileSequenceReady -> key = " + pHost.codeName + "-" + pCompetition.codeName + "-" + devTeam.codeName + "-" + bot.codeName + "-" + product.codeName); }

                            switch (err.result) {
                                case GLOBAL.DEFAULT_OK_RESPONSE.result: {

                                    if (INFO_LOG === true) { logger.write("[INFO] initialize -> onFileSequenceReady -> Received OK Response."); }
                                    break;
                                }

                                case GLOBAL.DEFAULT_FAIL_RESPONSE.result: {

                                    if (INFO_LOG === true) { logger.write("[INFO] initialize -> onFileSequenceReady -> Received FAIL Response."); }
                                    callBackFunction(GLOBAL.DEFAULT_FAIL_RESPONSE);
                                    return;
                                }

                                case GLOBAL.CUSTOM_FAIL_RESPONSE.result: {

                                    if (INFO_LOG === true) { logger.write("[INFO] initialize -> onFileSequenceReady -> Received CUSTOM FAIL Response."); }
                                    if (INFO_LOG === true) { logger.write("[INFO] initialize -> onFileSequenceReady -> err.message = " + err.message); }
                                    if (INFO_LOG === true) { logger.write("[INFO] initialize -> onFileSequenceReady -> This bot has not starting competing yet."); }

                                    break;
                                }

                                default: {

                                    if (INFO_LOG === true) { logger.write("[INFO] initialize -> onFileSequenceReady -> Received Unexpected Response."); }
                                    callBackFunction(err);
                                    return;
                                }
                            }

                            let event = {
                                totalValue: pCaller.getExpectedFiles(),
                                currentValue: pCaller.getFilesLoaded()
                            }

                            thisObject.eventHandler.raiseEvent('File Sequence Loaded', event);

                            if (event.currentValue === event.totalValue) {

                                dataSetsLoaded++;

                                checkInitializeComplete();
                            }

                        } catch (err) {

                            if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> onFileSequenceReady -> err = " + err); }
                            callBackFunction(GLOBAL.DEFAULT_FAIL_RESPONSE);
                        }
                    }

                    function checkInitializeComplete() {

                        try {

                            if (INFO_LOG === true) { logger.write("[INFO] checkInitializeComplete -> Entering function."); }
                            if (INFO_LOG === true) { logger.write("[INFO] checkInitializeComplete -> key = " + pHost.codeName + "-" + pCompetition.codeName + "-" + devTeam.codeName + "-" + bot.codeName + "-" + product.codeName); }

                            if (dataSetsLoaded === dataSetsToLoad) {

                                callBackFunction(GLOBAL.DEFAULT_OK_RESPONSE);

                            }

                        } catch (err) {

                            if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> checkInitializeComplete -> err = " + err); }
                            callBackFunction(GLOBAL.DEFAULT_FAIL_RESPONSE);
                        }
                    }
                }
            }

            thisObject.competitorsSequences.push(fileSequences);

        } catch (err) {

            if (ERROR_LOG === true) { logger.write("[ERROR] initialize -> err = " + err); }
            callBackFunction(GLOBAL.DEFAULT_FAIL_RESPONSE);
        }
    }

}

