const api = require('./gitlabInstance');
const checkMergeRequestApproved = require('./checkMergeRequestApproved');

module.exports = async function mergeMergeRequest({ mergerequestIId, projectId, options = {}, customApi }) {
    const API = customApi ?? api;
    const approvalInfo = await checkMergeRequestApproved({
        projectId,
        mergerequestIId,
        customApi: API
    });
    if (!approvalInfo.approved) {
        const hint = checkMergeRequestApproved.formatApprovalHint(approvalInfo);
        throw new Error(`MR尚未审批通过，禁止合并。${hint}`);
    }
    return API.MergeRequests.merge(projectId, mergerequestIId, options);
};
