"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getData = void 0;
const getData = async (url, options) => {
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            console.log("res.status: ", res.status);
            throw new Error("Failed to fetch data");
        }
        return res.json();
    }
    catch (err) {
        throw err;
    }
};
exports.getData = getData;
//# sourceMappingURL=service.js.map