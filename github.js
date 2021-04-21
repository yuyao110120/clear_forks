const request = require('request-promise-native');

const username = '';

// Personal Access Token
const password = '';

async function listRepos(per_page, page, repos = []) {
    const res = await request({
        url: 'https://api.github.com/user/repos',
        qs: {
            per_page,
            page
        },
        method: 'get',
        proxy: 'http://127.0.0.1:1087',
        headers: {
            accept: 'application/vnd.github.inertia-preview+json',
            'user-agent': 'postman'
        },
        auth: {
            username,
            password,
        },
        encoding: 'utf8',
        json: true
    });
    repos.push(...res);

    if (res.length === per_page) {
        await listRepos(per_page, ++page, repos);
    }

    return repos;
}
async function starredRepo(owner, repo) {
    const accept = 'application/vnd.github.v3+json';
    const result = await request({
        url: `https://api.github.com/user/starred/${owner}/${repo}`,
        proxy: 'http://127.0.0.1:1087',
        method: 'put',
        headers: {
            accept,
            'user-agent': 'postman'
        },
        auth: {
            username,
            password
        },
        resolveWithFullResponse: true
    }).then(res => {
        return res.statusCode;
    });

    return result === 204;
}
async function getRepoParentInfo(url) {
    return await request({
        url,
        method: 'get',
        proxy: 'http://127.0.0.1:1087',
        headers: {
            accept: 'application/vnd.github.inertia-preview+json',
            'user-agent': 'postman'
        },
        auth: {
            username,
            password
        },
        encoding: 'utf8',
        json: true
    }).then(res => {
        return {
            owner: res.parent.owner.login,
            repo: res.parent.name
        }
    }).catch((err) => {
        return {statusCode: err.statusCode, message: err.error.message};
    });
}
async function deleteRepo(owner, repo) {
    const result = await request({
        url: `https://api.github.com/repos/${owner}/${repo}`,
        method: 'delete',
        proxy: 'http://127.0.0.1:1087',
        headers: {
            accept: 'application/vnd.github.inertia-preview+json',
            'user-agent': 'postman'
        },
        auth: {
            username,
            password
        },
        encoding: 'utf8',
        json: true,
        resolveWithFullResponse: true
    }).then(res => {
        return res.statusCode;
    });

    return result === 204;
}

async function main() {
    const per_page = 100;
    let page = 1;

    // 1. 列出所有库
    const repos = await listRepos(per_page, page);
    // 2. 查询是否是 fork 的库
    const forks = [];
    for (let i = 0; i < repos.length; i++) {
        if (repos[i].fork) {
            forks.push(repos[i]);
        }
    }
    // 3. 若为 fork，该库是否以标星
    // 4. 标星则删除，未标则标星删除
    for (let i = 0; i < forks.length; i++) {
        const repoInfo = await getRepoParentInfo(forks[i].url);

        if (repoInfo.statusCode) {
            console.log('----');
            console.log(forks[i].owner.login, forks[i].name);
            console.log(repoInfo.statusCode, repoInfo.message);
            continue;
        }

        const result = await starredRepo(repoInfo.owner, repoInfo.repo);
        if (result) {
            console.log('----');
            console.log('success-starred:' + forks[i].full_name);
            const r = await deleteRepo(forks[i].owner.login, forks[i].name);
            if (r) {
                console.log(`success: delete`);
            } else {
                console.log(`fail-starred: delete`)
            }
        } else {
            console.log('----');
            console.log('fail' + forks[i].full_name);
        }
    }

    console.log('end');
}

main();
