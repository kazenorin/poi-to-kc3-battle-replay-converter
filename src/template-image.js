import moment from "moment";
import Promise from "bluebird";
import _ from "lodash";
import {
    url as shipImageUrl,
    imageFilename as shipImageFilename,
    imageDimensions as shipImageDimensions
} from "./constants/ship-images"

const titleText = "POI to KC3-Replayer";
const toWatchCaption = "To watch, upload to: ";
const replayerUrl = "https://bit.ly/kc3-replayer";

const fixedUsedHeight = 150; // 150px constant
const fixedUsedWidth = 13 + 8; // 13px left-margin, 8px right margin
const initialX = 12, initialY = 96;
const shipImageSpacingX = 3; // 3px spacing
const shipImageSpacingY = 3; // 3px spacing
const fleetSpacingX = 18; // For combined fleets

import loadImage from "./promise-load-image";
const loadShipImage = function (ship) {
    // Images provided by: Daiblohu https://github.com/Diablohu/WhoCallsTheFleet-Pics
    // which is a project of: "WhoCallsTheFleet" http://fleet.diablohu.com/
    const id = ship.mst_id;
    return loadImage(`${shipImageUrl}/${id}/${shipImageFilename}`)
        .then(image => ({id, image}))
        .catch(() => undefined);
};

export default function createTemplateImage(w, h, replayData, poiData, owner) {
    const mapId = `${replayData.world}-${replayData.mapnum}`,
        timestamp = replayData.time * 1000;

    const canvas = document.createElement("canvas");
    canvas.style.display = "none";
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");

    const dateTime = moment(timestamp).format("MMMM Do YYYY, h:mm:ss a");
    const availableHeight = h - fixedUsedHeight;
    const availableWidth = w - fixedUsedWidth;

    // << Background start /
    const grd = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, Math.max(w, h));
    grd.addColorStop(0, "white");
    grd.addColorStop(0.2, "hsl(218, 52%, 95.8%)");
    grd.addColorStop(1, "hsl(218, 52%, 72%)");

    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    // / Background end >>

    // << Title start /
    ctx.fillStyle = "hsl(222, 45%, 42%)";
    ctx.font = "bold 24pt Calibri, sans-serif";
    ctx.shadowColor = "hsl(0, 0%, 50%)";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 4;
    ctx.fillText(titleText, 10, 38);
    // / Title end >>

    // << Line start /
    ctx.beginPath();
    ctx.moveTo(8, 47);
    ctx.lineTo(w - 8, 47);
    ctx.strokeStyle = "hsl(222, 45%, 42%)";
    ctx.stroke();
    // / Line end >>

    // << Date start /
    ctx.fillStyle = "hsl(222, 45%, 53%)";
    ctx.font = "bold 14pt Calibri, sans-serif";
    ctx.shadowColor = "hsl(0, 0%, 66%)";
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 2;
    ctx.fillText(dateTime, 10, 65);
    // / Date end >>

    // << MapID start /
    ctx.fillStyle = "hsl(222, 45%, 53%)";
    ctx.font = "bold 20pt Calibri, sans-serif";
    ctx.shadowColor = "hsl(0, 0%, 66%)";
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 2;
    ctx.fillText(`${mapId}: ${owner}`, 10, 90);
    // / MapID end >>

    // << Footer start /
    ctx.fillStyle = "white";
    ctx.shadowColor = "hsl(0, 0%, 33%)";
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 2;
    ctx.font = "bold 14pt Calibri, sans-serif";
    ctx.fillText(toWatchCaption, 8, h - 16 - 5 - 10);
    ctx.font = "bold 18pt Calibri, sans-serif";
    ctx.fillText(replayerUrl, 12, h - 10);
    // / Footer end >>

    // << ----- Asynchronous Start /-----

    const attachFleetImagesFn = replayData.combined == 0 || !replayData.fleet2 || !replayData.fleet2.length
        ? attachSingleFleetImages
        : attachCombinedFleetImages;

    return attachFleetImagesFn(replayData, availableWidth, availableHeight, ctx, canvas);

    // -----/ Asynchronous End ----- >>
};

const isValidShip = ship => ship != null && _.isInteger(parseInt(ship.mst_id));

const attachSingleFleetImages = function (replayData, availableWidth, availableHeight, ctx, canvas) {

    const involvedShips = _.filter(replayData.fleet1, isValidShip);

    return Promise.map(involvedShips, loadShipImage)
        .then(shipImages => {

            // << Ship Images start /

            const preferredDimensions = calculateSingleFleetPreferredDimensions(availableWidth, availableHeight, involvedShips.length);

            ctx.shadowColor = "hsl(0, 0%, 33%)";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 2;

            _.forEach(involvedShips, (ship, i) => {
                const imgDef = _.find(shipImages, {id: ship.mst_id});
                let x = initialX + (i % 2 * (shipImageSpacingX + preferredDimensions.width));
                let y = initialY + Math.floor(i / 2) * (shipImageSpacingY + preferredDimensions.height);

                if (imgDef) {
                    ctx.drawImage(imgDef.image, x, y, preferredDimensions.width, preferredDimensions.height);
                } else {

                    ctx.fillStyle = "coral";

                    const ratioY = preferredDimensions.height / shipImageDimensions.height;
                    const desiredFontSize = (Math.round(160 * ratioY) / 10);
                    ctx.font = `bold ${desiredFontSize}pt Calibri, sans-serif`;

                    const text = `ID=${ship.mst_id}`;

                    const x2 = x + (preferredDimensions.width - ctx.measureText(text).width) / 2;

                    const estimatedEffectiveHeight = desiredFontSize / 0.75; // Convert pt to px
                    const y2 = y + (preferredDimensions.height - estimatedEffectiveHeight) / 2 + estimatedEffectiveHeight/2 + 2;

                    ctx.fillText(text, x2, y2);
                }
            });

            // / Ship Images end >>

            return canvas;
        });
};

const calculateSingleFleetPreferredDimensions = function (availableX, availableY, involvedShips) {
    // ShipImgDimensions = 160x40
    let preferredDimensions = {width: shipImageDimensions.width, height: shipImageDimensions.height};

    if (availableX < preferredDimensions.width * (involvedShips > 1 ? 2 : 1) + shipImageSpacingX) {
        // Shrink dimensions
        let newPreferredWidth = Math.round((availableX - shipImageSpacingX) / (involvedShips > 1 ? 2 : 1));
        preferredDimensions.height = Math.round(preferredDimensions.height * (newPreferredWidth / preferredDimensions.width));
        preferredDimensions.width = newPreferredWidth;
    }

    if (availableY < (preferredDimensions.height + shipImageSpacingY) * Math.floor(involvedShips / 2) - shipImageSpacingY) {
        // Shrink dimensions
        let newPreferredHeight = Math.round(((availableY + shipImageSpacingY) / involvedShips) - shipImageSpacingY);
        preferredDimensions.width = Math.round(preferredDimensions.width * (newPreferredHeight / preferredDimensions.height));
        preferredDimensions.height = newPreferredHeight;
    }

    return preferredDimensions;
};

const attachCombinedFleetImages = function (replayData, availableWidth, availableHeight, ctx, canvas) {

    const fleet1 = _.filter(replayData.fleet1, isValidShip);
    const fleet2 = _.filter(replayData.fleet2, isValidShip);

    return Promise.map(fleet1.concat(fleet2), loadShipImage)
        .then(shipImages => {

            // << Ship Images start /

            const preferredDimensions = calculateCombinedFleetPreferredDimensions(availableWidth, availableHeight, fleet1.length, fleet2.length);

            ctx.shadowColor = "hsl(0, 0%, 33%)";
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 2;

            _.forEach(fleet1, (ship, i) => {
                const imgDef = _.find(shipImages, {id: ship.mst_id});
                if (imgDef) {
                    let x = initialX;
                    let y = initialY + i * (shipImageSpacingY + preferredDimensions.height);

                    ctx.drawImage(imgDef.image, x, y, preferredDimensions.width, preferredDimensions.height);
                }
            });

            _.forEach(fleet2, (ship, i) => {
                const imgDef = _.find(shipImages, {id: ship.mst_id});
                if (imgDef) {
                    let x = initialX + preferredDimensions.width + fleetSpacingX;
                    let y = initialY + i * (shipImageSpacingY + preferredDimensions.height);

                    ctx.drawImage(imgDef.image, x, y, preferredDimensions.width, preferredDimensions.height);
                }
            });

            // / Ship Images end >>

            return canvas;
        });
};

const calculateCombinedFleetPreferredDimensions = function (availableX, availableY, fleet1, fleet2) {

    let fleetMaxSize = Math.max(fleet1, fleet2);

    // ShipImgDimensions = 160x40
    let preferredDimensions = {width: shipImageDimensions.width, height: shipImageDimensions.height};

    if (availableX < preferredDimensions.width * 2 + fleetSpacingX) {
        // Shrink dimensions
        let newPreferredWidth = Math.round((availableX - fleetSpacingX) / 2);
        preferredDimensions.height = Math.round(preferredDimensions.height * (newPreferredWidth / preferredDimensions.width));
        preferredDimensions.width = newPreferredWidth;
    }

    if (availableY < (preferredDimensions.height + shipImageSpacingY) * fleetMaxSize - shipImageSpacingY) {
        // Shrink dimensions
        let newPreferredHeight = Math.round(((availableY + shipImageSpacingY) / fleetMaxSize) - shipImageSpacingY);
        preferredDimensions.width = Math.round(preferredDimensions.width * (newPreferredHeight / preferredDimensions.height));
        preferredDimensions.height = newPreferredHeight;
    }

    return preferredDimensions;
};