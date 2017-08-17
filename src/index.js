import converter from "./converter";
import $ from "jquery";

import steganography from "../lib/steganography";

import ImageTemplatePath300px from "./resources/template-image-300px.png";
import ImageTemplatePath400px from "./resources/template-image-400px.png";
import ImageTemplatePath500px from "./resources/template-image-500px.png";
import ImageTemplatePath625px from "./resources/template-image-625px.png";

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
const MSG_BATTLE_DATA_EXCEED_CAP = "Data size exceeds capacity, reduce number of battles included!";

const ImageTemplates = Promise.all([
    loadSteganographyImage(ImageTemplatePath300px, 15000),
    loadSteganographyImage(ImageTemplatePath400px, 27500),
    loadSteganographyImage(ImageTemplatePath500px, 45000),
    loadSteganographyImage(ImageTemplatePath625px, 70000)
]);

function loadSteganographyImage(path, capacityThreshold) {
    return new Promise(resolve => {
        const image = new Image();
        $(image).on('load', () => resolve({image, capacityThreshold}));
        image.src = path;
    });
}

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

    const stringData = JSON.stringify(converter(inputData));

    return ImageTemplates.then(function (imageTemplates) {
        const errorElm = outputContainer.find(".error-message");

        const dataSize = stringData.length;
        const imageTemplate = _.find(imageTemplates, ({capacityThreshold})=> capacityThreshold > dataSize);

        if (imageTemplate && imageTemplate.image) {
            const encodedUrl = steganography.encode(stringData, imageTemplate.image);
            const outputImage = new Image();
            outputImage.src = encodedUrl;

            $("#image-output").html("").append($(outputImage).css("max-width", "400px"));
            errorElm.hide();
        } else {
            reportError(errorElm, MSG_BATTLE_DATA_EXCEED_CAP)
        }

        $("#output-text").val(stringData);

        outputContainer.slideDown(250);

        scrollTo("#output-container")
    });
}

function scrollTo(hash, speed) {
    $('html, body').animate({scrollTop: $(hash).offset().top || 0}, speed);
}

setTimeout(()=> {
    outputContainer.slideUp();
    $(".cloaked").removeClass("cloaked");
});