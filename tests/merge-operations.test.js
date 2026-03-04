const test = require('node:test');
const assert = require('node:assert/strict');

const {
    approveMergeRequest,
    mergeMergeRequest,
    approveThenMergeRequest,
    getMergeRequests,
} = require('../utils');

test('approveMergeRequest should call MergeRequestApprovals.approve', async () => {
    const calls = [];
    const mockApi = {
        MergeRequestApprovals: {
            approve: async (projectId, mergerequestIId, options) => {
                calls.push({ projectId, mergerequestIId, options });
                return { approved: true };
            }
        }
    };

    const res = await approveMergeRequest({
        projectId: 1001,
        mergerequestIId: 9,
        options: { sha: 'abc123' },
        customApi: mockApi
    });

    assert.deepEqual(calls, [{
        projectId: 1001,
        mergerequestIId: 9,
        options: { sha: 'abc123' }
    }]);
    assert.equal(res.approved, true);
});

test('mergeMergeRequest should call MergeRequests.merge only when approved', async () => {
    const calls = [];
    const mockApi = {
        MergeRequestApprovals: {
            showConfiguration: async () => ({ approvals_left: 0 }),
        },
        MergeRequests: {
            merge: async (projectId, mergerequestIId, options) => {
                calls.push({ projectId, mergerequestIId, options });
                return { state: 'merged' };
            }
        }
    };

    const res = await mergeMergeRequest({
        projectId: 1001,
        mergerequestIId: 9,
        options: { shouldRemoveSourceBranch: true },
        customApi: mockApi
    });

    assert.deepEqual(calls, [{
        projectId: 1001,
        mergerequestIId: 9,
        options: { shouldRemoveSourceBranch: true }
    }]);
    assert.equal(res.state, 'merged');
});

test('mergeMergeRequest should block merge when MR is not approved', async () => {
    const calls = [];
    const mockApi = {
        MergeRequestApprovals: {
            showConfiguration: async () => ({ approvals_left: 1 }),
        },
        MergeRequests: {
            merge: async () => {
                calls.push('merge');
                return { state: 'merged' };
            }
        }
    };

    await assert.rejects(
        mergeMergeRequest({
            projectId: 1001,
            mergerequestIId: 9,
            customApi: mockApi
        }),
        /尚未审批通过/
    );
    assert.equal(calls.length, 0);
});

test('approveThenMergeRequest should approve first and then merge', async () => {
    const callOrder = [];
    const mockApi = {
        MergeRequestApprovals: {
            approve: async () => {
                callOrder.push('approve');
                return { approved: true };
            },
        },
        MergeRequests: {
            merge: async () => {
                callOrder.push('merge');
                return { state: 'merged' };
            }
        }
    };

    const res = await approveThenMergeRequest({
        projectId: 1001,
        mergerequestIId: 9,
        customApi: mockApi
    });

    assert.deepEqual(callOrder, ['approve', 'merge']);
    assert.equal(res.state, 'merged');
});

test('mergeMergeRequest should allow fallback by MR snapshot when approval APIs are not available', async () => {
    const calls = [];
    const mockApi = {
        MergeRequests: {
            merge: async (projectId, mergerequestIId, options) => {
                calls.push({ projectId, mergerequestIId, options });
                return { state: 'merged' };
            }
        }
    };
    const res = await mergeMergeRequest({
        projectId: 1001,
        mergerequestIId: 10,
        customApi: mockApi,
        mergeRequestSnapshot: {
            merge_status: 'can_be_merged'
        }
    });
    assert.equal(res.state, 'merged');
    assert.equal(calls.length, 1);
});

test('getMergeRequests should return MRs where I am reviewer or merger with role labels', async () => {
    const me = 'alice';
    const mrAsReviewer = {
        iid: 1,
        project_id: 101,
        reviewers: [{ username: 'alice' }],
        assignees: [{ username: 'bob' }],
        author: { name: '张三', username: 'zhangsan' },
    };
    const mrAsMerger = {
        iid: 2,
        project_id: 101,
        reviewers: [{ username: 'carol' }],
        assignees: [{ username: 'alice' }],
        author: { name: '李四', username: 'lisi' },
    };
    const mrAsBoth = {
        iid: 3,
        project_id: 101,
        reviewers: [{ username: 'alice' }],
        assignees: [{ username: 'alice' }],
        author: { name: '王五', username: 'wangwu' },
    };

    const mockApi = {
        MergeRequests: {
            all: async (options) => {
                if (options.reviewerUsername === me) return [mrAsReviewer, mrAsBoth];
                if (options.assigneeUsername === me) return [mrAsMerger, mrAsBoth];
                return [];
            }
        }
    };

    const result = await getMergeRequests({ operatorName: me, customApi: mockApi });
    const byIid = new Map(result.map((mr) => [mr.iid, mr]));

    assert.equal(result.length, 3);
    assert.deepEqual(byIid.get(1).myRoles, ['reviewer']);
    assert.equal(byIid.get(1).myRoleLabel, '审核人');
    assert.deepEqual(byIid.get(2).myRoles, ['merger']);
    assert.equal(byIid.get(2).myRoleLabel, '合并人');
    assert.deepEqual(byIid.get(3).myRoles, ['reviewer', 'merger']);
    assert.equal(byIid.get(3).myRoleLabel, '审核人+合并人');
    assert.equal(byIid.get(1).submitter, '张三');
});
