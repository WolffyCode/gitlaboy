const api = require('./gitlabInstance');

const toArray = (value) => Array.isArray(value) ? value : [];
const getMrUniqueKey = (mr) => `${mr.project_id}-${mr.iid}`;
const getSubmitterName = (mr) => mr?.author?.name || mr?.author?.username || '未知';

const containsUserName = (users, username) => {
    if (!username) return false;
    return toArray(users).some(user => user?.username === username);
};

const getMyRolesFromMr = (mr, userName) => {
    const roles = [];
    if (containsUserName(mr.reviewers, userName)) {
        roles.push('reviewer');
    }
    const assignees = toArray(mr.assignees).length ? toArray(mr.assignees) : (mr.assignee ? [mr.assignee] : []);
    if (containsUserName(assignees, userName)) {
        roles.push('merger');
    }
    return roles;
};

const getRoleLabel = (roles) => {
    if (roles.length === 2) return '审核人+合并人';
    if (roles[0] === 'reviewer') return '审核人';
    if (roles[0] === 'merger') return '合并人';
    return '未知';
};

const attachMyRole = (mrs, userName) => {
    return mrs.map(mr => {
        const myRoles = getMyRolesFromMr(mr, userName);
        return {
            ...mr,
            submitter: getSubmitterName(mr),
            myRoles,
            myRoleLabel: getRoleLabel(myRoles),
        };
    }).filter(mr => mr.myRoles.length > 0);
};

const attachSubmitterOnly = (mrs) => {
    return mrs.map(mr => ({
        ...mr,
        submitter: getSubmitterName(mr),
    }));
};

module.exports = async function getMergeRequests({
    assigneeName,
    getMy,
    operatorName,
    customApi
} = {}) {
    const API = customApi ?? api;
    if (operatorName) {
        const [reviewerMrs, mergerMrs] = await Promise.all([
            API.MergeRequests.all({
                state: 'opened',
                scope: 'all',
                reviewerUsername: operatorName,
            }),
            API.MergeRequests.all({
                state: 'opened',
                scope: 'all',
                assigneeUsername: operatorName,
            })
        ]);
        const uniqueMrs = new Map();
        [...reviewerMrs, ...mergerMrs].forEach((mr) => {
            uniqueMrs.set(getMrUniqueKey(mr), mr);
        });
        return attachMyRole([...uniqueMrs.values()], operatorName);
    }
    if (getMy) {
        const mrs = await API.MergeRequests.all({
            state: 'opened',
            scope: 'assigned_to_me'
        });
        return attachSubmitterOnly(mrs);
    }
    if (assigneeName) {
        const mrs = await API.MergeRequests.all({
            state: 'opened',
            scope: 'all',
            assigneeUsername: assigneeName
        });
        return attachSubmitterOnly(mrs);
    }
    const mrs = await API.MergeRequests.all({
        state: 'opened',
        scope: 'all'
    });
    return attachSubmitterOnly(mrs);
};
