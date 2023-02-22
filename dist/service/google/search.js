"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customSearchAPI = void 0;
const service_1 = require("../service");
exports.customSearchAPI = {
    searchQueryResultsLimit: 100,
    totalSearchResults: 0,
    urlStartIndex: 1,
    async search(query) {
        const searchQueryResults = [];
        while (this.totalSearchResults < this.searchQueryResultsLimit) {
            const searchResults = await (0, service_1.getData)(`${process.env.CUSTOM_SEARCH_SITE_JSON_API}${query}&start=${this.urlStartIndex}`, {});
            // update searchResultsRe
            this.totalSearchResults += searchResults.queries.request[0].count;
            this.urlStartIndex = searchResults.queries.nextPage[0].startIndex;
            searchQueryResults.push(searchResults);
        }
        this.resetCustomSearchState();
        return searchQueryResults;
    },
    resetCustomSearchState() {
        this.totalSearchResults = 0;
        this.urlStartIndex = 1;
    },
};
//# sourceMappingURL=search.js.map