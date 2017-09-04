import Promise from "bluebird";
import $ from "jquery";

export default function (path) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const $image = $(image);

        $image.on('load', () => resolve(image));
        $image.on('error', () => reject(new Error("Cannot load image")));

        image.crossOrigin = 'Anonymous';
        image.src = path;
    });
}