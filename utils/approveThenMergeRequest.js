const api = require('./gitlabInstance');
const approveMergeRequest = require('./approveMergeRequest');
const mergeMergeRequest = require('./mergeMergeRequest');

module.exports = async function approveThenMergeRequest({
    mergerequestIId,
    projectId,
    approveOptions = {},
    mergeOptions = {},
    mergeRequestSnapshot,
    customApi
}) {
    const API = customApi ?? api;
    await approveMergeRequest({
        mergerequestIId,
        projectId,
        options: approveOptions,
        customApi: API
    });
    return mergeMergeRequest({
        mergerequestIId,
        projectId,
        options: mergeOptions,
        checkApproval: false,
        mergeRequestSnapshot,
        customApi: API
    });
};
