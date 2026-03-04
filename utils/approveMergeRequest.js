const api = require('./gitlabInstance');

module.exports = async function approveMergeRequest({ mergerequestIId, projectId, options = {}, customApi }) {
    const API = customApi ?? api;
    return API.MergeRequestApprovals.approve(projectId, mergerequestIId, options);
};
