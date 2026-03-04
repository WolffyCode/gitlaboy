const api = require('./gitlabInstance');
const checkMergeRequestApproved = require('./checkMergeRequestApproved');

module.exports = async function mergeMergeRequest({
    mergerequestIId,
    projectId,
    options = {},
    checkApproval = true,
    mergeRequestSnapshot,
    customApi
}) {
    const API = customApi ?? api;
    if (checkApproval) {
        const approvalInfo = await checkMergeRequestApproved({
            projectId,
            mergerequestIId,
            mergeRequestSnapshot,
            customApi: API
        });
        if (!approvalInfo.approved) {
            const hint = checkMergeRequestApproved.formatApprovalHint(approvalInfo);
            throw new Error(`MR尚未审批通过，禁止合并。${hint}`);
        }
    }
    return API.MergeRequests.merge(projectId, mergerequestIId, options);
};
