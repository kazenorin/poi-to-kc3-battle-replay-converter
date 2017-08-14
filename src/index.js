import converter from "./converter";
import $ from "jquery";

import steganography from "../lib/steganography";
import ImageTemplatePath from "./resources/simpleImage400px.png";

import 'pure-css';
import './resources/css/main.css';

import Dropzone from 'dropzone';
import 'dropzone/dist/dropzone.css';
import './resources/css/dropzone-custom.css';

import pako from "pako";
import Promise from "bluebird";

import isGZip from "./isGZip"
import Utf8ArrayToStr from "../lib/Utf8ArrayToStr";

const MSG_INVALID_BATTLE_DETAIL_DATA = "Invalid POI Battle Detail data.";

const ImageTemplate = new Promise(resolve => {
    const img = new Image();
    $(img).on('load', () => resolve(img));
    img.src = ImageTemplatePath;
});

Dropzone.autoDiscover = false;
const dzPreviewTemplate = $("#dropzone-template").remove().html();
const dz = new Dropzone("div.dropzone", {
    url: "/",
    createImageThumbnails: false,
    autoProcessQueue: false,
    acceptedFiles: ".gz,.json",
    previewTemplate: dzPreviewTemplate
});

const accordionMembers = $(".accordion-members");
const dataSourceMenuButtons = $("#data-source-menu").find(".pure-button");
dataSourceMenuButtons.on("click", event => {
    dataSourceMenuButtons.removeClass("pure-button-active");
    const self = $(event.target);

    self.addClass("pure-button-active");
    accordionMembers.removeClass("accordion-active");

    $(self.attr("data-correspondent")).addClass("accordion-active");

});

const pasteDataContainer = $("#paste-data-container");
const firstPasteDataRow = pasteDataContainer.find(".paste-data-row");
firstPasteDataRow.find("textarea").on("change", function dataPasteHandler(e) {
    const textArea = $(e.target);
    const parentRow = textArea.closest(".paste-data-row");
    const errorElm = parentRow.find(".error-message");
    try {
        const parsedData = JSON.parse(textArea.val());
        if (!isValidPoiData(parsedData)) {
            return reportError(errorElm, MSG_INVALID_BATTLE_DETAIL_DATA);
        }
        parentRow.data("parsed-data", parsedData);

        textArea.prop("readonly", true);
        textArea.off("change", dataPasteHandler);
        if (errorElm.is(":visible")) {
            errorElm.slideUp(250);
        }

        parentRow.find(".remove-button")
            .removeClass("pure-button-disabled")
            .on("click", function () {
                parentRow.remove();
                updateRowCounter();
            });

        const nodeIndex = parsedData.map && parsedData.map.join("-");
        parentRow.find(".node-index").html(nodeIndex);

        pasteDataContainer.append(pasteDataRowTemplate.clone(true));
        updateRowCounter();
    } catch (e) {
        if ('SyntaxError' === e.name) {
            reportError(errorElm, MSG_INVALID_BATTLE_DETAIL_DATA);
        } else {
            reportError(errorElm, "Unexpected error: " + e.message);
        }
    }
});
const pasteDataRowTemplate = firstPasteDataRow.clone(true);

function updateRowCounter() {
    pasteDataContainer.find(".battle-counter").each((i, elm) => {
        elm.innerHTML = (i + 1);
    });
}

function reportError(errorElm, message) {
    errorElm.html(message);
    errorElm.slideDown(250);
}

$("#loadFiles").on("click", () => {
    Promise.map(dz.getAcceptedFiles(), file => {
        return new Promise((resolve, reject) => {
            try {
                const fileReader = new FileReader();
                fileReader.onload = function (e) {
                    resolve(new Uint8Array(e.target.result));
                };
                fileReader.onerror = reject;
                fileReader.readAsArrayBuffer(file);
            } catch (e) {
                reject(e);
            }
        })
    }).map(dataArray => {
        if (!dataArray) return [];
        else if (isGZip(dataArray)) {
            return pako.ungzip(dataArray, {to: 'string'});
        } else {
            return Utf8ArrayToStr(dataArray);
        }

    }).map(dataString => {
        return JSON.parse(dataString);
    }).then(results => {
        return performConversion(results);
    }).catch(error => {
        console.error(error);
    });
});

$("#loadSample").on("click", () => {
    performConversion([
        require("../references/poi-samples/3-5-sequence/3-5-01-1-A.json"),
        require("../references/poi-samples/3-5-sequence/3-5-02-D-B.json"),
        require("../references/poi-samples/3-5-sequence/3-5-03-B-G.json"),
        require("../references/poi-samples/3-5-sequence/3-5-04-G-K.json")
    ]);
});

$("#convertData").on("click", () => {
    setTimeout(()=> {

        const inputData = [];
        pasteDataContainer.find(".paste-data-row").each((i, elm) => {
            const data = $(elm).data("parsed-data");
            if (data !== null && typeof data === 'object') {
                inputData.push(data)
            }
        });

        if (inputData.length) {
            performConversion(inputData);
        }

    })
});

function isValidPoiData(inputData) {
    return inputData &&
        inputData.version >= 2.1 &&
        inputData.map && inputData.map.length &&
        inputData.fleet && inputData.fleet.main && inputData.fleet.main.length &&
        inputData.packet && inputData.packet.length;
}

function performConversion(inputData) {

    const convertedData = converter(inputData);

    const stringData = JSON.stringify(convertedData);
    const stringDataDisplay = JSON.stringify(convertedData, null, "   ");

    return ImageTemplate.then(function (imageTemplate) {

        const encodedUrl = steganography.encode(stringData, imageTemplate);
        const outputImage = new Image();
        outputImage.src = encodedUrl;

        $("#image-output").html("").append(outputImage);
        $("#output-text").val(stringDataDisplay);

        $("#output-text-container").show();
        $("#image-output-container").show();

        scrollTo("#image-output")
    });
}

function scrollTo(hash, speed) {
    $('html, body').animate({scrollTop: $(hash).offset().top || 0}, speed);
}

setTimeout(()=> {
    $(".cloaked").removeClass("cloaked");
});