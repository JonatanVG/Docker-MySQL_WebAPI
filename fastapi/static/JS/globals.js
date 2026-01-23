let currentPos = 1514;

export function setCurrentPos(newPos) {
    if (Number.isInteger(newPos)) {
        currentPos = newPos;
    }
}
export function getCurrentPos() {
    return currentPos;
}