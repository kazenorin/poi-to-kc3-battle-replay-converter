import converter from "./converter";
import createTemplateImage from "./template-image"
import $ from "jquery";

import steganography from "../lib/steganography";

import 'pure-css';
import './resources/css/main.css';
import './resources/css/w3-loader.css';

import Dropzone from 'dropzone';
import 'dropzone/dist/dropzone.css';
import './resources/css/dropzone-custom.css';

import pako from "pako";
import Promise from "bluebird";

import isGZip from "./isGZip"
import Utf8ArrayToStr from "../lib/Utf8ArrayToStr";

const MSG_INVALID_BATTLE_DETAIL_DATA = "Invalid POI Battle Detail data.";

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

        // Timeout to Allow "Convert Button" to be clicked
        setTimeout(()=>{
            pasteDataContainer.append(pasteDataRowTemplate.clone(true));
            updateRowCounter();
        }, 200);

    } catch (e) {
        if ('SyntaxError' === e.name) {
            reportError(errorElm, MSG_INVALID_BATTLE_DETAIL_DATA);
        } else {
            reportError(errorElm, "Unexpected error: " + e.message);
        }
    }
});
const pasteDataRowTemplate = firstPasteDataRow.clone(true);

const outputContainer = $("#output-container");
const conversionProgressors = $(".conversion-progress-loader");

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
        results.sort((a, b)=> (a && a.time ? a.time : 0) - (b && b.time ? b.time : 0));
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

    // Timeout to Allow onChange to process
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
        inputData.map && Array.isArray(inputData.map) &&
        inputData.fleet && inputData.fleet.main && inputData.fleet.main.length &&
        inputData.packet && inputData.packet.length;
}

function performConversion(inputData) {

    conversionProgressors.prop('disabled', true).removeClass("inactive");
    const imageOutput = $("#image-output").addClass("loading").empty("img");

    const outputData = converter(inputData);
    const stringData = JSON.stringify(outputData);
    const dataSize = stringData.length;

    let dim = 300;
    while(steganography.getHidingCapacity({width: dim, height: dim}) < dataSize + 2500){
        dim += 50;
    }

    return createTemplateImage(dim, dim, outputData, inputData, $("#ownerCaption").val())
        .then(canvas => {

            const encodedUrl = steganography.encode(stringData, canvas);
            const outputImage = new Image();
            outputImage.src = encodedUrl;

            imageOutput.removeClass("loading").append($(outputImage).css("max-width", "400px"));
            outputContainer.find(".error-message").hide();

            outputContainer.slideDown(250);
            scrollTo("#output-container");

            $("#output-text").val(stringData);

        })
        .finally(() => {
            imageOutput.removeClass("loading");
            conversionProgressors.prop('disabled', false).addClass("inactive");
        });
}

function scrollTo(hash, speed) {
    $('html, body').animate({scrollTop: $(hash).offset().top || 0}, speed);
}

setTimeout(()=> {
    outputContainer.slideUp();
    conversionProgressors.addClass("inactive").prepend("<i class='w3-loader w3-loader-tiny'></i>");

    $(".cloaked").removeClass("cloaked");
});