"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQueryParams = void 0;
const parseQueryParams = (config = {}) => {
    if (Object.keys(config).length === 0)
        return "";
    const queryParams = new URLSearchParams(config);
    return `?${queryParams.toString()}`;
};
exports.parseQueryParams = parseQueryParams;
//# sourceMappingURL=util.js.map