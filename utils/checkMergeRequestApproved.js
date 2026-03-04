const api = require('./gitlabInstance');

function formatApprovalHint(approvalInfo) {
    if (typeof approvalInfo.approvalsLeft === 'number') {
        return `剩余审批数: ${approvalInfo.approvalsLeft}`;
    }
    if (typeof approvalInfo.approvalsRequired === 'number' && typeof approvalInfo.approvedCount === 'number') {
        return `已审批 ${approvalInfo.approvedCount}/${approvalInfo.approvalsRequired}`;
    }
    if (typeof approvalInfo.approvalRules === 'number' && typeof approvalInfo.approvedRules === 'number') {
        return `审批规则通过 ${approvalInfo.approvedRules}/${approvalInfo.approvalRules}`;
    }
    if (approvalInfo.detailedMergeStatus) {
        return `详细状态: ${approvalInfo.detailedMergeStatus}`;
    }
    return '审批状态未知';
}

async function readApprovalByConfiguration(API, projectId, mergerequestIId) {
    const config = await API.MergeRequestApprovals.showConfiguration(projectId, { mergerequestIId });
    const approvalsLeft = config?.approvals_left ?? config?.approvalsLeft;
    if (typeof approvalsLeft === 'number') {
        return {
            approved: approvalsLeft <= 0,
            method: 'showConfiguration',
            approvalsLeft,
        };
    }
    const approvalsRequired = config?.approvals_required ?? config?.approvalsRequired;
    const approvedBy = config?.approved_by ?? config?.approvedBy;
    if (typeof approvalsRequired === 'number') {
        const approvedCount = Array.isArray(approvedBy) ? approvedBy.length : 0;
        return {
            approved: approvedCount >= approvalsRequired,
            method: 'showConfiguration',
            approvalsRequired,
            approvedCount,
        };
    }
    return null;
}

async function readApprovalByRuleState(API, projectId, mergerequestIId) {
    const state = await API.MergeRequestApprovals.showApprovalState(projectId, mergerequestIId);
    const rules = Array.isArray(state?.rules) ? state.rules : [];
    if (!rules.length) {
        return {
            approved: true,
            method: 'showApprovalState',
            approvalRules: 0,
            approvedRules: 0,
        };
    }
    const approvedRules = rules.filter(rule => Boolean(rule?.approved)).length;
    return {
        approved: approvedRules === rules.length,
        method: 'showApprovalState',
        approvalRules: rules.length,
        approvedRules,
    };
}

async function readApprovalByMergeStatus(API, projectId, mergerequestIId) {
    const mr = await API.MergeRequests.show(projectId, mergerequestIId);
    const detailedMergeStatus = mr?.detailed_merge_status ?? mr?.detailedMergeStatus;
    if (detailedMergeStatus) {
        return {
            approved: detailedMergeStatus !== 'not_approved',
            method: 'mergeRequestStatus',
            detailedMergeStatus,
        };
    }
    return null;
}

async function checkMergeRequestApproved({ projectId, mergerequestIId, customApi }) {
    const API = customApi ?? api;
    let lastError;

    try {
        const byConfig = await readApprovalByConfiguration(API, projectId, mergerequestIId);
        if (byConfig) return byConfig;
    } catch (error) {
        lastError = error;
    }

    try {
        const byState = await readApprovalByRuleState(API, projectId, mergerequestIId);
        if (byState) return byState;
    } catch (error) {
        lastError = error;
    }

    try {
        const byStatus = await readApprovalByMergeStatus(API, projectId, mergerequestIId);
        if (byStatus) return byStatus;
    } catch (error) {
        lastError = error;
    }

    const reason = lastError?.cause?.description || lastError?.message || '未知错误';
    throw new Error(`无法校验MR审批状态，请确认GitLab审批API权限: ${reason}`);
}

checkMergeRequestApproved.formatApprovalHint = formatApprovalHint;

module.exports = checkMergeRequestApproved;
