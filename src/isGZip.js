export default function (uintArray) {
    return uintArray && uintArray[0] === 0x1F && uintArray[1] === 0x8B;
}