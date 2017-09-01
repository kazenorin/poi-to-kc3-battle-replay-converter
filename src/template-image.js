import moment from "moment";

const titleText = "POI to KC3-Replayer";
const toWatchCaption = "To watch, upload to: ";
const replayerUrl = "https://bit.ly/kc3-replayer";

const fixedUsedSpace = 120; // 120px constant

export default function createTemplateImage(w, h, replayData, poiData, owner) {
    const mapId = `${replayData.world}-${replayData.mapnum}`,
        timestamp = replayData.time * 1000;

    const canvas = document.createElement("canvas");
    canvas.style.display = "none";
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");

    const dateTime = moment(timestamp).format("MMMM Do YYYY, h:mm:ss a");
    const availableSpace = h - fixedUsedSpace;

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

    return canvas;
};